import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { RadioGroup, RadioGroupItem } from "../components/RadioGroup";
import { Spinner } from "../components/Spinner";
import { ArtworkPicker } from "../components/ArtworkPicker";
import { printCatalog, allArtworkChecksTicked } from "../helpers/printCatalog";
import { paperGuide } from "../helpers/paperGuide";
import { useProducts } from "../helpers/useProducts";
import { useJobs } from "../helpers/useJobs";
import { reportHasFailures, type ArtworkReport } from "../helpers/artworkReport";
import styles from "./quote.new.module.css";

export default function NewQuotePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useJobs.useCreate();
  const uploadArtwork = useJobs.useUploadArtwork();
  const productsQ = useProducts.useList();
  const products = productsQ.data?.products ?? [];

  const [product, setProduct] = useState(params.get("product") ?? "");
  const [size, setSize] = useState("A5");
  const [quantity, setQuantity] = useState("1000");
  const [paper, setPaper] = useState("150gsm gloss/matte art");
  const [printSides, setPrintSides] = useState("Double sided");
  const [colourMode, setColourMode] = useState("Full colour (CMYK)");
  const [finishing, setFinishing] = useState<string[]>([]);
  const [neededBy, setNeededBy] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<ArtworkReport | null>(null);

  // Product-specific option lists fall back to the standard catalog when the owner leaves them empty.
  const selected = products.find((p) => p.name === product);
  const sizes = selected?.sizes.length ? selected.sizes : printCatalog.sizes;
  const papers = selected?.stocks.length ? selected.stocks : printCatalog.papers.map((p) => p.id);
  const finishOptions = selected?.finishes.length ? selected.finishes : printCatalog.finishing;
  const paperNote = printCatalog.papers.find((p) => p.id === paper)?.note ?? paperGuide.tipFor(paper);

  const chooseProduct = (name: string) => {
    setProduct(name);
    const next = products.find((p) => p.name === name);
    if (next?.sizes.length && !next.sizes.includes(size)) setSize(next.sizes[0]);
    if (next?.stocks.length && !next.stocks.includes(paper)) setPaper(next.stocks[0]);
    if (next?.finishes.length) setFinishing((prev) => prev.filter((f) => next.finishes.includes(f)));
  };
  const busy = create.isPending || uploadArtwork.isPending;
  const checklistDone = allArtworkChecksTicked(checks);
  const remaining = printCatalog.artworkChecklist.filter((c) => !checks[c.id]).length;
  const blockedByProblems = reportHasFailures(report) && !report?.override;
  const checkingFile = !!file && !report;

  const submit = async () => {
    if (!checklistDone) {
      toast.error("Please tick every item on the artwork checklist before sending your request");
      return;
    }
    try {
      const job = await create.mutateAsync({
        product,
        size,
        quantity: Number(quantity),
        paper,
        printSides,
        colourMode,
        finishing,
        notes: notes || undefined,
        neededBy: neededBy || undefined,
        deliveryMethod,
        deliveryAddress: deliveryAddress || undefined,
        phone,
        artworkChecks: checks,
      });
      if (file) {
        try {
          await uploadArtwork.mutateAsync({ jobId: job.id, file, checks, report });
        } catch (e) {
          toast.error(`Quote sent, but artwork upload failed: ${(e as Error).message}. You can retry from the job page.`);
        }
      }
      toast.success(`Quote request ${job.jobCode} sent. We'll reply shortly.`);
      navigate(`/jobs/${job.id}`);
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg.startsWith("[") ? "Please complete the required fields" : msg);
    }
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Get a quote · Jerry Meraki</title>
      </Helmet>
      <header className={styles.head}>
        <span className={styles.eyebrow}>New job ticket</span>
        <h1>Request a quote</h1>
        <p>Describe your job and we'll send you one clear price for everything, from printing to finishing.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>1. The job</h2>
          <div className={styles.field}>
            <label>What are we printing?</label>
            <Select value={selected ? product : undefined} onValueChange={chooseProduct} disabled={!products.length}>
              <SelectTrigger>
                <SelectValue placeholder={productsQ.isFetching && !productsQ.data ? "Loading products…" : "Choose a product"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Size</label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.field}>
              <label>Quantity</label>
              <Input type="number" inputMode="numeric" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label>Paper</label>
            <Select value={paper} onValueChange={setPaper}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {papers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paperNote && (
              <p className={styles.hint}>
                <Info size={14} /> {paperNote}
              </p>
            )}
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Print sides</label>
              <Select value={printSides} onValueChange={setPrintSides}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {printCatalog.sides.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.field}>
              <label>Colour</label>
              <Select value={colourMode} onValueChange={setColourMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {printCatalog.colourModes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Finishing</label>
            <div className={styles.chips}>
              {finishOptions.map((f) => {
                const on = finishing.includes(f);
                return (
                  <label key={f} className={`${styles.chip} ${on ? styles.chipOn : ""}`}>
                    <Checkbox
                      checked={on}
                      onChange={(e) => setFinishing((prev) => (e.target.checked ? [...prev, f] : prev.filter((x) => x !== f)))}
                    />
                    {f}
                  </label>
                );
              })}
            </div>
          </div>
          <div className={styles.field}>
            <label>Anything else we should know?</label>
            <Textarea rows={3} placeholder="e.g. need a sample first, matching an old job, colour reference…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        <div className={styles.side}>
          <section className={styles.card}>
            <h2>2. Artwork</h2>
            <ArtworkPicker
              file={file}
              onFileChange={setFile}
              checks={checks}
              onChecksChange={setChecks}
              onReportChange={setReport}
              size={size}
            />
            <p className={styles.hint}>
              Upload a PDF and we'll check it for you. No file yet? Tick the checklist and upload it later, or ask us to design it in the notes.
            </p>
          </section>

          <section className={styles.card}>
            <h2>3. Delivery & contact</h2>
            <div className={styles.field}>
              <label>Needed by</label>
              <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
            <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as "pickup" | "delivery")} className={styles.radios}>
              <label className={styles.radio}>
                <RadioGroupItem value="pickup" /> Pick up at 14/15 Ayoola Lawal, Bariga
              </label>
              <label className={styles.radio}>
                <RadioGroupItem value="delivery" /> Deliver to me
              </label>
            </RadioGroup>
            {deliveryMethod === "delivery" && (
              <div className={styles.field}>
                <label>Delivery address</label>
                <Textarea rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </div>
            )}
            <div className={styles.field}>
              <label>WhatsApp number</label>
              <Input type="tel" placeholder="0803 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {checkingFile ? (
              <p className={styles.blocker} role="status">
                Checking your artwork…
              </p>
            ) : blockedByProblems ? (
              <p className={styles.blocker} role="status">
                Your artwork has problems to fix. Upload a corrected file, or tick "Send it anyway".
              </p>
            ) : (
              !checklistDone && (
              <p className={styles.blocker} role="status">
                Tick the {remaining} remaining artwork checklist item{remaining === 1 ? "" : "s"} to send your request.
              </p>
              )
            )}
            <Button size="lg" className={styles.submit} disabled={busy || !selected || !checklistDone || checkingFile} onClick={submit}>
              {busy ? (
                <>
                  <Spinner size="sm" /> {uploadArtwork.isPending ? "Uploading artwork…" : "Sending…"}
                </>
              ) : (
                "Send quote request"
              )}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}