// Packages the app in Vercel's Build Output API v3 format:
//   .vercel/output/static/        <- the Vite build (dist/)
//   .vercel/output/functions/_api.func/  <- one Node function bundling every endpoint (esbuild)
//   .vercel/output/config.json    <- routes: /_api/* -> function, files, then SPA fallback to index.html
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, ".vercel/output");
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "static"), { recursive: true });
cpSync(join(root, "dist"), join(out, "static"), { recursive: true });

const fnDir = join(out, "functions/_api.func");
mkdirSync(fnDir, { recursive: true });
await build({
  entryPoints: [join(root, "server/handler.ts")],
  outfile: join(fnDir, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // Some CJS deps call require(); give the ESM bundle a real require.
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
  loader: { ".sql": "text" },
  logLevel: "warning",
});
writeFileSync(
  join(fnDir, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", maxDuration: 60 }, null, 2),
);

writeFileSync(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/_api/(.*)$", dest: "/_api?__path=$1" },
        { src: "^/assets/(.*)$", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { handle: "filesystem" },
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);
console.log("build-vercel-output: .vercel/output ready");
