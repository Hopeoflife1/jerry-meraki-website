import { printCatalog } from "./printCatalog";
import { sizeMm, type ArtworkReport, type CheckResult } from "./artworkReport";

// Browser-only automatic artwork check (owner request 2026-10-09). Reads the customer's file before upload:
// - PDF (and PDF-compatible .ai): colour spaces and page boxes via pdf-lib; image resolution and text
//   (size, distance from the cut) via pdf.js. If pdf.js can't run on an old phone, those three fall back to manual.
// - JPG / PNG / TIFF / PSD: pixel size and colour mode straight from the file header.
// - Anything else (CDR, EPS, ZIP...): not readable, every item stays a manual tick.
// Thresholds: 300 DPI target (warn under 295, fail under 200), 3mm bleed, 5mm safe zone, 8pt minimum text.

type Id = (typeof printCatalog.artworkChecklist)[number]["id"];
type Results = Record<Id, CheckResult>;

const PT_TO_MM = 25.4 / 72;
const MM_TO_PT = 72 / 25.4;
const BLEED = 3;
const SAFE = 5;
const MIN_PT = 8;
const MAX_PAGES = 12;

const pass = (detail: string): CheckResult => ({ status: "pass", detail });
const warn = (detail: string): CheckResult => ({ status: "warn", detail });
const fail = (detail: string): CheckResult => ({ status: "fail", detail });
const manual = (detail: string): CheckResult => ({ status: "manual", detail });
const r1 = (n: number) => Math.round(n * 10) / 10;
const quote = (s: string) => `"${s.length > 40 ? `${s.slice(0, 40)}…` : s}"`;

const allManual = (detail: string): Results => ({
  cmyk: manual(detail),
  bleed: manual(detail),
  safe: manual(detail),
  spacing: manual(detail),
  resolution: manual(detail),
});

type Kind = "pdf" | "jpeg" | "png" | "tiff" | "psd" | "other";

const sniff = (b: Uint8Array): Kind => {
  const head = String.fromCharCode(...b.subarray(0, Math.min(1024, b.length)));
  if (head.includes("%PDF-")) return "pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 42) || (b[0] === 0x4d && b[1] === 0x4d && b[3] === 42)) return "tiff";
  if (head.startsWith("8BPS")) return "psd";
  return "other";
};

// ---------- Raster files ----------
type Colour = "rgb" | "cmyk" | "gray" | "unknown";
type RasterInfo = { width: number; height: number; colour: Colour };

const jpegInfo = (b: Uint8Array): RasterInfo | null => {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const comps = b[i + 9];
      return {
        height: (b[i + 5] << 8) | b[i + 6],
        width: (b[i + 7] << 8) | b[i + 8],
        colour: comps === 4 ? "cmyk" : comps === 1 ? "gray" : "rgb",
      };
    }
    i += 2 + len;
  }
  return null;
};

const pngInfo = (b: Uint8Array): RasterInfo => {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const type = b[25];
  return { width: dv.getUint32(16), height: dv.getUint32(20), colour: type === 0 || type === 4 ? "gray" : "rgb" };
};

const tiffInfo = (b: Uint8Array): RasterInfo => {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const le = b[0] === 0x49;
  const u16 = (o: number) => dv.getUint16(o, le);
  const u32 = (o: number) => dv.getUint32(o, le);
  const ifd = u32(4);
  const n = u16(ifd);
  let width = 0;
  let height = 0;
  let photo = -1;
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + k * 12;
    const tag = u16(e);
    const val = u16(e + 2) === 3 ? u16(e + 8) : u32(e + 8);
    if (tag === 256) width = val;
    else if (tag === 257) height = val;
    else if (tag === 262) photo = val;
  }
  const colour: Colour = photo === 5 ? "cmyk" : photo === 0 || photo === 1 ? "gray" : photo === 2 || photo === 3 || photo === 6 ? "rgb" : "unknown";
  return { width, height, colour };
};

const psdInfo = (b: Uint8Array): RasterInfo => {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const mode = dv.getUint16(24);
  const colour: Colour = mode === 4 ? "cmyk" : mode === 1 || mode === 8 ? "gray" : mode === 2 || mode === 3 || mode === 9 ? "rgb" : "unknown";
  return { width: dv.getUint32(18), height: dv.getUint32(14), colour };
};

const resolutionResult = (dpi: number, where: string, fix: string): CheckResult => {
  const d = Math.round(dpi);
  if (dpi >= 295) return pass(`About ${d} DPI ${where}. It will print sharp.`);
  if (dpi >= 200) return warn(`About ${d} DPI ${where}, below the 300 DPI we recommend. Photos may look slightly soft. ${fix}`);
  return fail(`Only about ${d} DPI ${where}. It will print blurry. ${fix}`);
};

const rasterChecks = (info: RasterInfo, kind: Kind, size: string | undefined): Results => {
  const label = kind === "jpeg" ? "JPG" : kind.toUpperCase();
  const cmyk: CheckResult =
    info.colour === "cmyk"
      ? pass("Your file is CMYK.")
      : info.colour === "gray"
        ? pass("Your file is greyscale, which prints fine in black.")
        : info.colour === "rgb"
          ? fail(
              kind === "png"
                ? "PNG files are always RGB, so colours can print dull or shifted. Export a CMYK PDF or a CMYK JPG instead."
                : `This ${label} is RGB, so colours can print dull or shifted. Convert it to CMYK (in Photoshop: Image › Mode › CMYK Color) or export a CMYK PDF.`,
            )
          : manual("We couldn't read the colour mode. Make sure the file is CMYK.");

  const mm = sizeMm(size);
  let bleed: CheckResult;
  let resolution: CheckResult;
  if (!mm || !info.width || !info.height) {
    const maxW = Math.floor((info.width / 300) * 25.4);
    const maxH = Math.floor((info.height / 300) * 25.4);
    bleed = manual(`We can't confirm bleed for a custom size. Make sure the background runs ${BLEED}mm past every edge.`);
    resolution = manual(`Your image is ${info.width}×${info.height}px, enough for about ${maxW}×${maxH}mm at 300 DPI. Check that covers your print size.`);
  } else {
    let [W, H] = mm;
    if (W !== H && info.width > info.height !== W > H) [W, H] = [H, W];
    const fit = (w: number, h: number) => {
      const dx = info.width / (w / 25.4);
      const dy = info.height / (h / 25.4);
      return { dpi: Math.min(dx, dy), diff: Math.abs(dx - dy) / Math.max(dx, dy) };
    };
    const withBleed = fit(W + 2 * BLEED, H + 2 * BLEED);
    const trimOnly = fit(W, H);
    const needPx = `${Math.ceil(((W + 2 * BLEED) / 25.4) * 300)}×${Math.ceil(((H + 2 * BLEED) / 25.4) * 300)}px`;
    let dpi = withBleed.dpi;
    if (withBleed.diff <= trimOnly.diff && withBleed.diff <= 0.005) {
      bleed = pass(`Your image includes ${BLEED}mm bleed for ${size}.`);
    } else if (trimOnly.diff <= 0.005) {
      dpi = trimOnly.dpi;
      bleed = fail(
        `Your image is exactly ${size} with no bleed, so you may see thin white edges after cutting. Make the canvas ${W + 2 * BLEED}×${H + 2 * BLEED}mm and stretch the background to the edges.`,
      );
    } else {
      bleed = warn(
        `Your image's shape doesn't match ${size} (${W}×${H}mm). It may be cropped or get white edges. The best canvas is ${W + 2 * BLEED}×${H + 2 * BLEED}mm including bleed.`,
      );
    }
    resolution = resolutionResult(dpi, `at ${size}`, `For ${size} with bleed you need about ${needPx}.`);
  }
  return {
    cmyk,
    bleed,
    resolution,
    safe: manual(`We can't read text inside an image. Check that all text sits at least ${SAFE}mm inside the edge.`),
    spacing: manual(`We can't read text inside an image. Check that text is ${MIN_PT}pt or larger with comfortable line spacing.`),
  };
};

// ---------- PDF ----------
type Box = { x: number; y: number; width: number; height: number };
type Mat = number[];
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

async function analyzePdf(bytes: Uint8Array, size: string | undefined): Promise<{ items: Results; note?: string }> {
  const { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream, PDFRawStream, PDFRef, PDFNumber, decodePDFRawStream } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
  const ctx = doc.context;
  const pages = doc.getPages();
  const pageCount = Math.min(pages.length, MAX_PAGES);
  if (!pageCount) throw new Error("No pages");

  // --- Colour: image colour spaces, defined colour spaces, shadings and RGB operators in content streams.
  type CsKind = "rgb" | "cmyk" | "gray" | "spot" | "unknown";
  const classify = (raw: unknown, depth = 0): CsKind => {
    if (!raw || depth > 4) return "unknown";
    const cs = raw instanceof PDFRef ? ctx.lookup(raw) : raw;
    if (cs instanceof PDFName) {
      const n = cs.toString();
      if (n === "/DeviceRGB" || n === "/CalRGB" || n === "/RGB") return "rgb";
      if (n === "/DeviceCMYK" || n === "/CMYK") return "cmyk";
      if (n === "/DeviceGray" || n === "/CalGray" || n === "/G") return "gray";
      return "unknown";
    }
    if (cs instanceof PDFArray && cs.size() > 0) {
      const fam = ctx.lookup(cs.get(0));
      const f = fam instanceof PDFName ? fam.toString() : "";
      if (f === "/ICCBased") {
        const s = ctx.lookup(cs.get(1));
        if (s instanceof PDFStream) {
          const nObj = s.dict.lookup(PDFName.of("N"));
          const N = nObj instanceof PDFNumber ? nObj.asNumber() : 0;
          return N === 4 ? "cmyk" : N === 1 ? "gray" : N === 3 ? "rgb" : "unknown";
        }
      }
      if (f === "/Indexed" || f === "/I") return classify(cs.get(1), depth + 1);
      if (f === "/Separation" || f === "/DeviceN") return "spot";
      if (f === "/CalRGB" || f === "/Lab") return "rgb";
      if (f === "/CalGray") return "gray";
      if (f === "/Pattern" && cs.size() > 1) return classify(cs.get(1), depth + 1);
    }
    return "unknown";
  };

  let rgbImages = 0;
  let rgbVector = false;
  let printSafeSeen = false;
  const seen = new Set<string>();
  const note = (k: CsKind) => {
    if (k === "rgb") rgbVector = true;
    else if (k !== "unknown") printSafeSeen = true;
  };
  const scanContent = (stream: unknown) => {
    if (!(stream instanceof PDFRawStream)) return;
    let text: string;
    try {
      const data = decodePDFRawStream(stream).decode();
      if (data.length > 8_000_000) return;
      text = new TextDecoder("latin1").decode(data);
    } catch {
      return;
    }
    // Drop string literals so words inside text can't look like operators.
    text = text.replace(/\((?:\\.|[^\\)])*\)/g, " ").replace(/<[0-9A-Fa-f\s]*>/g, " ");
    if (/(?:^|\s)(?:[-+]?[\d.]+\s+){3}(?:rg|RG)(?=\s|$)/.test(text)) rgbVector = true;
    if (/(?:^|\s)(?:[-+]?[\d.]+\s+){4}(?:k|K)(?=\s|$)/.test(text)) printSafeSeen = true;
    if (/(?:^|\s)[-+]?[\d.]+\s+(?:g|G)(?=\s|$)/.test(text)) printSafeSeen = true;
  };
  const visit = (res: unknown, depth = 0) => {
    if (!(res instanceof PDFDict) || depth > 8) return;
    res.lookupMaybe(PDFName.of("ColorSpace"), PDFDict)?.entries().forEach(([, v]) => note(classify(v)));
    res.lookupMaybe(PDFName.of("Shading"), PDFDict)?.entries().forEach(([, v]) => {
      const s = ctx.lookup(v);
      const d = s instanceof PDFStream ? s.dict : s instanceof PDFDict ? s : undefined;
      if (d) note(classify(d.get(PDFName.of("ColorSpace"))));
    });
    res.lookupMaybe(PDFName.of("XObject"), PDFDict)?.entries().forEach(([, ref]) => {
      const key = ref instanceof PDFRef ? ref.toString() : "";
      if (key) {
        if (seen.has(key)) return;
        seen.add(key);
      }
      const s = ctx.lookup(ref);
      if (!(s instanceof PDFStream)) return;
      const sub = s.dict.lookup(PDFName.of("Subtype"));
      if (sub === PDFName.of("Image")) {
        if (s.dict.lookup(PDFName.of("ImageMask"))?.toString() === "true") return;
        const k = classify(s.dict.get(PDFName.of("ColorSpace")));
        if (k === "rgb") rgbImages++;
        else if (k !== "unknown") printSafeSeen = true;
      } else if (sub === PDFName.of("Form")) {
        visit(s.dict.lookup(PDFName.of("Resources")), depth + 1);
        scanContent(s);
      }
    });
  };
  for (let i = 0; i < pageCount; i++) {
    const node = pages[i].node;
    visit(node.Resources());
    const contents = node.Contents();
    if (contents instanceof PDFArray) contents.asArray().forEach((c) => scanContent(ctx.lookup(c)));
    else scanContent(contents);
  }

  let cmyk: CheckResult;
  if (rgbImages || rgbVector) {
    const parts = [rgbImages ? `${rgbImages} image${rgbImages === 1 ? "" : "s"}` : "", rgbVector ? "text or shapes" : ""].filter(Boolean).join(" and ");
    cmyk = fail(
      `We found RGB colour (${parts}). RGB can print dull or shifted. Export your PDF in CMYK, for example "PDF/X-1a" in most design apps, or "PDF Print" with CMYK in Canva.`,
    );
  } else if (printSafeSeen) {
    cmyk = pass("All colours are CMYK, black or spot colours.");
  } else {
    cmyk = manual("We couldn't confirm the colour mode of this PDF. Make sure it was exported in CMYK.");
  }

  // --- Page size, bleed and the trim area of each page.
  const ordered = sizeMm(size);
  const toMm = (pt: number) => pt * PT_TO_MM;
  const near = (a: number, b: number) => Math.abs(a - b) <= 1.2;
  const orient = (pw: number, ph: number): [number, number] | null => {
    if (!ordered) return null;
    const [W, H] = ordered;
    return W !== H && pw > ph !== W > H ? [H, W] : [W, H];
  };
  const getBox = (i: number, name: "TrimBox" | "BleedBox"): Box | null => {
    const p = pages[i];
    if (!p.node.get(PDFName.of(name))) return null;
    return name === "TrimBox" ? p.getTrimBox() : p.getBleedBox();
  };
  // Returns the trim rectangle (PDF points) of a page and a bleed verdict.
  const pageTrim = (i: number): { trim: Box; bleed: CheckResult; trimMm: [number, number] } => {
    const media = pages[i].getMediaBox();
    const pw = toMm(media.width);
    const ph = toMm(media.height);
    const trimBox = getBox(i, "TrimBox");
    const outer = getBox(i, "BleedBox") ?? media;
    if (trimBox && (trimBox.width < outer.width - 1 || trimBox.height < outer.height - 1)) {
      const sides = [
        trimBox.x - outer.x,
        outer.x + outer.width - (trimBox.x + trimBox.width),
        trimBox.y - outer.y,
        outer.y + outer.height - (trimBox.y + trimBox.height),
      ].map(toMm);
      const min = Math.min(...sides);
      const tw = toMm(trimBox.width);
      const th = toMm(trimBox.height);
      let verdict = min >= BLEED - 0.2 ? pass(`${BLEED}mm bleed is set around a ${r1(tw)}×${r1(th)}mm page.`) : fail(`Bleed is only ${r1(min)}mm. Extend backgrounds ${BLEED}mm past every cut edge and export with bleed.`);
      const o = orient(tw, th);
      if (o && !(near(tw, o[0]) && near(th, o[1])) && verdict.status === "pass") {
        verdict = warn(`Bleed is fine, but the page is ${r1(tw)}×${r1(th)}mm and you ordered ${size} (${o[0]}×${o[1]}mm). It will be scaled to fit.`);
      }
      return { trim: trimBox, bleed: verdict, trimMm: [tw, th] };
    }
    const o = orient(pw, ph);
    const inset = BLEED * MM_TO_PT;
    if (!o) {
      return {
        trim: media,
        bleed: manual(`Custom size: your page is ${r1(pw)}×${r1(ph)}mm. Check it includes ${BLEED}mm bleed on every side.`),
        trimMm: [pw, ph],
      };
    }
    const [W, H] = o;
    if (near(pw, W + 2 * BLEED) && near(ph, H + 2 * BLEED)) {
      return {
        trim: { x: media.x + inset, y: media.y + inset, width: media.width - 2 * inset, height: media.height - 2 * inset },
        bleed: pass(`Your page is ${r1(pw)}×${r1(ph)}mm: ${size} plus ${BLEED}mm bleed on every side.`),
        trimMm: [W, H],
      };
    }
    if (near(pw, W) && near(ph, H)) {
      return {
        trim: media,
        bleed: fail(
          `Your page is exactly ${size} (${W}×${H}mm) with no bleed, so you may see thin white edges after cutting. Set the page to ${W + 2 * BLEED}×${H + 2 * BLEED}mm (or export with ${BLEED}mm bleed) and stretch backgrounds to the edge.`,
        ),
        trimMm: [W, H],
      };
    }
    return {
      trim: media,
      bleed: warn(
        `Your page is ${r1(pw)}×${r1(ph)}mm, which doesn't match ${size} (${W}×${H}mm, or ${W + 2 * BLEED}×${H + 2 * BLEED}mm with bleed). It may be scaled or cropped.`,
      ),
      trimMm: [pw, ph],
    };
  };
  const trims = Array.from({ length: pageCount }, (_, i) => pageTrim(i));
  const rank = { fail: 3, warn: 2, manual: 1, pass: 0 } as const;
  const bleed = trims.reduce((worst, t) => (rank[t.bleed.status] > rank[worst.status] ? t.bleed : worst), trims[0].bleed);
  // Printed scale: a page designed at another size gets scaled to the ordered size.
  const scaleFor = (i: number) => {
    const o = orient(trims[i].trimMm[0], trims[i].trimMm[1]);
    if (!o) return 1;
    const s = o[0] / trims[i].trimMm[0];
    return Math.abs(s - o[1] / trims[i].trimMm[1]) < 0.03 ? s : 1;
  };

  // --- Images and text via pdf.js. Optional: older phones fall back to manual ticks for these three.
  let resolution: CheckResult;
  let safe: CheckResult;
  let spacing: CheckResult;
  let pdfjsNote: string | undefined;
  try {
    const P = Promise as unknown as { withResolvers?: unknown };
    if (!P.withResolvers) {
      P.withResolvers = function <T>() {
        let resolve!: (v: T) => void;
        let reject!: (e: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
    }
    // Legacy build: the modern one needs very new JavaScript (e.g. Map.getOrInsertComputed) that most phones lack.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const cdn = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}`;
    pdfjs.GlobalWorkerOptions.workerSrc = `${cdn}/legacy/build/pdf.worker.min.mjs`;
    const loading = pdfjs.getDocument({ data: bytes.slice(), disableFontFace: true, standardFontDataUrl: `${cdn}/standard_fonts/` });
    const pdf = await loading.promise;
    const OPS = pdfjs.OPS as Record<string, number>;
    let minDpi = Infinity;
    let minDpiPage = 0;
    let images = 0;
    let textItems = 0;
    const small: { size: number; str: string; page: number }[] = [];
    const edge: { str: string; page: number }[] = [];
    for (let n = 1; n <= pageCount; n++) {
      const page = await pdf.getPage(n);
      const s = scaleFor(n - 1);
      const ops = await page.getOperatorList();
      let ctm: Mat = [1, 0, 0, 1, 0, 0];
      const stack: Mat[] = [];
      for (let k = 0; k < ops.fnArray.length; k++) {
        const fn = ops.fnArray[k];
        const args = ops.argsArray[k] as unknown[];
        if (fn === OPS.save) stack.push(ctm.slice());
        else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
        else if (fn === OPS.transform) ctm = mul(ctm, args as number[]);
        else if (fn === OPS.paintFormXObjectBegin) {
          stack.push(ctm.slice());
          const m = args?.[0] as number[] | null;
          if (Array.isArray(m) && m.length === 6) ctm = mul(ctm, m);
        } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
        else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
          const img = args?.[0] as { width?: number; height?: number } | string;
          const pxW = fn === OPS.paintInlineImageXObject ? (img as { width?: number }).width : (args?.[1] as number);
          const pxH = fn === OPS.paintInlineImageXObject ? (img as { height?: number }).height : (args?.[2] as number);
          if (!pxW || !pxH) continue;
          const wPt = Math.hypot(ctm[0], ctm[1]) * s;
          const hPt = Math.hypot(ctm[2], ctm[3]) * s;
          if (toMm(wPt) * toMm(hPt) < 100) continue; // ignore tiny marks under 1cm²
          images++;
          const dpi = Math.min(pxW / (wPt / 72), pxH / (hPt / 72));
          if (dpi < minDpi) {
            minDpi = dpi;
            minDpiPage = n;
          }
        }
      }

      const trim = trims[n - 1].trim;
      const margin = (SAFE * MM_TO_PT) / s;
      const tol = 0.3 * MM_TO_PT;
      const tc = await page.getTextContent();
      for (const it of tc.items) {
        if (!("str" in it)) continue;
        const str = it.str.trim();
        if (!str) continue;
        const t = it.transform as number[];
        const fs = Math.hypot(t[2], t[3]);
        if (!fs) continue;
        textItems++;
        if (fs * s < MIN_PT - 0.5 && str.length >= 2) small.push({ size: fs * s, str, page: n });
        if (Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01) continue; // rotated text: skip the edge check
        const x0 = t[4];
        const x1 = t[4] + it.width;
        const y0 = t[5] - 0.2 * fs;
        const y1 = t[5] + 0.75 * fs;
        const right = trim.x + trim.width;
        const top = trim.y + trim.height;
        if (x1 < trim.x || x0 > right || y1 < trim.y || y0 > top) continue; // outside the page: slug or marks
        if (x0 < trim.x + margin - tol || x1 > right - margin + tol || y0 < trim.y + margin - tol || y1 > top - margin + tol) {
          edge.push({ str, page: n });
        }
      }
      page.cleanup();
    }
    await loading.destroy();

    resolution =
      images === 0
        ? pass("No photos found. Vector artwork prints sharp at any size.")
        : resolutionResult(minDpi, `for the lowest-quality image${pageCount > 1 ? ` (page ${minDpiPage})` : ""}`, "Replace it with a larger original, or export at 300 DPI.");
    if (!textItems) {
      const outlined = "We found no live text (it may be converted to outlines), so we can't measure it.";
      safe = manual(`${outlined} Check that all text sits at least ${SAFE}mm inside the edge.`);
      spacing = manual(`${outlined} Check that text is ${MIN_PT}pt or larger with comfortable line spacing.`);
    } else {
      safe = edge.length
        ? warn(
            `${edge.length} piece${edge.length === 1 ? "" : "s"} of text ${edge.length === 1 ? "is" : "are"} within ${SAFE}mm of the cut edge, e.g. ${quote(edge[0].str)}${pageCount > 1 ? ` on page ${edge[0].page}` : ""}. It could get trimmed. Move it inward, or tick to confirm it's intended.`,
          )
        : pass(`All text sits at least ${SAFE}mm inside the cut edge.`);
      if (small.length) {
        const min = small.reduce((a, b) => (b.size < a.size ? b : a));
        spacing = warn(
          `Some text is smaller than ${MIN_PT}pt (smallest about ${r1(min.size)}pt, e.g. ${quote(min.str)}). It may be hard to read. Check line spacing too, then tick to confirm.`,
        );
      } else {
        spacing = manual(`All text is ${MIN_PT}pt or larger. Check that line spacing looks comfortable, then tick.`);
      }
    }
  } catch (e) {
    console.warn("pdf.js artwork check unavailable:", e);
    pdfjsNote = "This phone couldn't run the full check, so please confirm resolution and text yourself.";
    resolution = manual("We couldn't measure image resolution on this device. Make sure photos are 300 DPI at the printed size.");
    safe = manual(`We couldn't measure text on this device. Check that all text sits at least ${SAFE}mm inside the edge.`);
    spacing = manual(`We couldn't measure text on this device. Check that text is ${MIN_PT}pt or larger.`);
  }

  const notes = [pages.length > MAX_PAGES ? `We checked the first ${MAX_PAGES} of ${pages.length} pages.` : "", pdfjsNote ?? ""].filter(Boolean);
  return { items: { cmyk, bleed, resolution, safe, spacing }, note: notes.join(" ") || undefined };
}

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/** Checks a customer's artwork file in the browser. Never throws: unreadable files come back as all-manual. */
export async function analyzeArtwork(file: File, size: string | undefined): Promise<ArtworkReport> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const base = { checkedAt: new Date().toISOString(), override: false };
  let kind: Kind = "other";
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    kind = sniff(bytes);
    if (kind === "pdf") {
      const { items, note } = await withTimeout(analyzePdf(bytes, size), 30_000);
      return { ...base, kind, items, note };
    }
    const info = kind === "jpeg" ? jpegInfo(bytes) : kind === "png" ? pngInfo(bytes) : kind === "tiff" ? tiffInfo(bytes) : kind === "psd" ? psdInfo(bytes) : null;
    if (info) return { ...base, kind, items: rasterChecks(info, kind, size) };
    return {
      ...base,
      kind: ext || "other",
      items: allManual("We can't check this file type automatically. Please confirm it yourself."),
      note: `We can't open .${ext || "this"} files automatically, so Jerry Meraki will check it by hand. A PDF lets us check it for you.`,
    };
  } catch (e) {
    console.warn("Artwork check failed:", e);
    return {
      ...base,
      kind,
      items: allManual("We couldn't read this file automatically. Please confirm it yourself."),
      note: "We couldn't read this file automatically, so Jerry Meraki will check it by hand.",
    };
  }
}
