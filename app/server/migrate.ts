import postgres from "postgres";
import schemaSql from "../db/schema.sql";
import { ensureBucket, putObject } from "../src/helpers/storage";
import { pgUrl } from "../src/helpers/pgUrl";

// ONE-TIME migration endpoint (Floot -> Vercel/Supabase), reached at POST /_api/__migrate.
// Locked by the MIGRATION_TOKEN env var; does nothing when that variable is unset. Remove after the move.
//   {action:"schema"}                         create tables/types (idempotent) + the private storage bucket
//   {action:"data", tables:{users:[...],...}} insert rows with their original ids, then fix id sequences
//   {action:"file", key, url, contentType}    copy one artwork file from a signed Floot URL into storage
//   {action:"status"}                         row counts
const TABLES = ["users", "user_passwords", "product_categories", "products", "jobs", "job_events", "job_messages"] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function migrateHandler(request: Request): Promise<Response> {
  const token = process.env.MIGRATION_TOKEN;
  if (!token || request.method !== "POST" || request.headers.get("x-migrate-token") !== token) {
    return json({ error: "Not found" }, 404);
  }
  const sql = postgres((process.env.POSTGRES_URL_NON_POOLING ?? pgUrl()).split("?")[0], { prepare: false, max: 1, ssl: "require" });
  try {
    const body = (await request.json()) as {
      action: string;
      tables?: Record<string, Record<string, unknown>[]>;
      key?: string;
      url?: string;
      contentType?: string;
    };
    if (body.action === "schema") {
      await sql.unsafe(schemaSql);
      await ensureBucket();
      return json({ ok: true });
    }
    if (body.action === "data") {
      const done: Record<string, number> = {};
      await sql.begin(async (tx) => {
        for (const t of TABLES) {
          const rows = body.tables?.[t] ?? [];
          for (const row of rows) {
            const cols = Object.keys(row);
            await tx`INSERT INTO ${tx(t)} ${tx(row as Record<string, postgres.ParameterOrJSON<never>>, cols)} ON CONFLICT (id) DO NOTHING`;
          }
          done[t] = rows.length;
          await tx.unsafe(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${t}), 1))`);
        }
      });
      return json({ ok: true, inserted: done });
    }
    if (body.action === "file") {
      if (!body.key || !body.url) return json({ error: "key and url required" }, 400);
      const r = await fetch(body.url);
      if (!r.ok) return json({ error: `Download failed: ${r.status}` }, 502);
      const bytes = new Uint8Array(await r.arrayBuffer());
      await putObject(body.key, bytes, body.contentType || r.headers.get("content-type") || "application/octet-stream");
      return json({ ok: true, bytes: bytes.length });
    }
    if (body.action === "status") {
      const counts: Record<string, number> = {};
      for (const t of TABLES) {
        const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`);
        counts[t] = n as number;
      }
      return json({ ok: true, counts });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("migrate failed:", e);
    return json({ error: (e as Error).message }, 500);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
