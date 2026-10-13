import type { IncomingMessage, ServerResponse } from "node:http";
import { routes } from "./routes.gen";
import { migrateHandler } from "./migrate";

// Vercel Node function (Build Output API) serving every /_api/* endpoint. Converts the Node request to a
// Web Request, calls the Floot-style handle(request) for "METHOD path", and writes the Web Response back.
async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
    const proto = req.headers["x-forwarded-proto"] ?? "https";
    const url = new URL(req.url ?? "/", `${proto}://${host}`);
    // config.json rewrites /_api/<path> to this function as ?__path=<path>; fall back to the pathname.
    const path = (url.searchParams.get("__path") ?? url.pathname.replace(/^\/_api\/?/, "")).replace(/\/+$/, "");
    url.searchParams.delete("__path");
    url.pathname = `/_api/${path}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
      else if (v != null) headers.set(k, v);
    }
    const body = await readBody(req);
    const request = new Request(url, { method: req.method, headers, body });

    const fn = path === "__migrate" ? migrateHandler : routes[`${req.method} ${path}`];
    const response = fn
      ? await fn(request)
      : new Response(JSON.stringify({ json: { error: `No endpoint for ${req.method} /_api/${path}` } }), { status: 404 });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
    });
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) res.setHeader("set-cookie", cookies);
    if (!response.headers.has("content-type")) res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error("API handler crashed:", e);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ json: { error: "Server error" } }));
  }
}
