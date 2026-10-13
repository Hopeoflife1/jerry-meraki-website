// Server-only replacement for Floot's @floot/storage, backed by Supabase Storage (private bucket).
// Keeps the same call shapes the endpoints use: upload() -> presigned PUT, getUrl() -> signed read URL,
// getInfo() -> exists check. Object keys are unchanged from Floot (e.g. "artwork/JM-2610-ABCDE/x-file.pdf").
const BUCKET = "uploads";

const base = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is not set");
  return `${url.replace(/\/+$/, "")}/storage/v1`;
};
const auth = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return { Authorization: `Bearer ${key}`, apikey: key };
};
const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");

type Err = { ok: false; error: { code: string; message: string } };
const fail = (code: string, message: string): Err => ({ ok: false, error: { code, message } });

export async function ensureBucket() {
  const r = await fetch(`${base()}/bucket`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 100 * 1024 * 1024 }),
  });
  if (!r.ok && r.status !== 409 && !(await r.text()).includes("already exists")) throw new Error(`Bucket setup failed: ${r.status}`);
}

export async function putObject(key: string, bytes: Uint8Array, contentType: string) {
  const r = await fetch(`${base()}/object/${BUCKET}/${enc(key)}`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!r.ok) throw new Error(`Upload failed: ${r.status} ${await r.text()}`);
}

export async function upload(opts: {
  visibility: "public" | "private";
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<{ ok: true; presignedUrl: string; url: string; headers: Record<string, string> } | Err> {
  if (opts.sizeBytes > 100 * 1024 * 1024) return fail("TooLarge", "File is larger than 100 MB");
  const r = await fetch(`${base()}/object/upload/sign/${BUCKET}/${enc(opts.filename)}`, {
    method: "POST",
    headers: { ...auth(), "x-upsert": "true" },
  });
  if (!r.ok) return fail("SignFailed", `Could not prepare the upload (${r.status})`);
  const { url } = (await r.json()) as { url: string };
  return {
    ok: true,
    presignedUrl: `${base()}${url}`,
    url: "",
    headers: { "Content-Type": opts.contentType, "x-upsert": "true" },
  };
}

export async function getUrl(opts: {
  visibility: "public" | "private";
  filename: string;
  expiresInSeconds?: number;
}): Promise<{ ok: true; url: string } | Err> {
  const r = await fetch(`${base()}/object/sign/${BUCKET}/${enc(opts.filename)}`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: Math.min(opts.expiresInSeconds ?? 300, 86400) }),
  });
  if (!r.ok) return fail("NotFound", `File not available (${r.status})`);
  const { signedURL } = (await r.json()) as { signedURL: string };
  return { ok: true, url: `${base()}${signedURL}` };
}

export async function getInfo(opts: {
  visibility: "public" | "private";
  filename: string;
}): Promise<{ ok: true; exists: false } | { ok: true; exists: true; etag: string; sizeBytes: number; lastModified: string } | Err> {
  const slash = opts.filename.lastIndexOf("/");
  const prefix = slash >= 0 ? opts.filename.slice(0, slash) : "";
  const name = opts.filename.slice(slash + 1);
  const r = await fetch(`${base()}/object/list/${BUCKET}`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, search: name, limit: 100 }),
  });
  if (!r.ok) return fail("ListFailed", `Could not check the file (${r.status})`);
  const items = (await r.json()) as { name: string; updated_at?: string; metadata?: { size?: number; eTag?: string } }[];
  const hit = items.find((i) => i.name === name);
  if (!hit) return { ok: true, exists: false };
  return { ok: true, exists: true, etag: hit.metadata?.eTag ?? "", sizeBytes: hit.metadata?.size ?? 0, lastModified: hit.updated_at ?? "" };
}
