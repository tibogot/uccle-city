// VISUAL REGRESSION TOUR SERVER (docs/TOUR.md): a static server for the city + the one route the tour page needs to
// write its images to disk (outside git).
//   node tools/tour/serve.mjs [--root <checkout>] [--port 8837] [--out <dir>]
//     --root  the checkout whose city is served (default: this repo). The tour's own files (debug/tour.html,
//             debug/tour.js, tools/tour/views.json) always come from THIS repo, so the same tour runs against any
//             checkout (a foundation baseline, a branch, a merge result in a temp worktree)
//     --out   where runs go (default: <this repo>/.tour, git-ignored): <out>/<run>/<view>.png + run.json
//     --committed-bundle  serve the checkout's committed viewer/tileWorker.bundle.js (default: a fresh in-memory build
//             of its own viewer/tileWorker.js, rule tour-fresh-bundle: a branch never rebuilds the committed one)
// Then open http://localhost:8837/debug/tour.html?run=<name> in ONE Chrome tab.
// Caching: every response carries an ETag (size + mtime + file id) and Last-Modified with Cache-Control: no-cache, so
// the browser revalidates (304s, fast) and never shows another checkout's file after a --root switch; the tile cache
// (viewer/tileCache.js) keys on the worker's code and re-checks its dependencies' ETags the same way.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBundle, committedHash } from "./freshBundle.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg("root", HERE));
const PORT = +arg("port", 8837);
// rule local-origins-capped: each localhost PORT is its own browser origin, with its own 800 MB tile cache
// (viewer/tileCache.js CAP_BYTES) and service-worker cache. ~50 ports used by tours / agents filled the DevTools Chrome
// profile to 43 GB (2026-11-24). Only a small fixed pool is allowed, so origins (and their caches) are reused.
export const PORT_POOL = [8837, 8838, 8839, 8840, 8841, 8842];
if (!PORT_POOL.includes(PORT) && !process.argv.includes("--any-port")) {
  console.error(`[tour] port ${PORT} refused: use one of ${PORT_POOL.join(", ")} (rule local-origins-capped: every new port is a new browser origin with its own 800 MB tile cache)`);
  process.exit(2);
}
const KEEP_SW = process.argv.includes("--keep-sw");
// the local checks never need the offline asset cache: /sw.js answers a worker that deletes its asset caches and
// unregisters itself (the live site keeps sw.js; --keep-sw serves the real file for a test that needs it)
export const SW_KILL = `// tools/tour/serve.mjs (rule local-origins-capped): no offline cache on local checks\nself.addEventListener("install", () => self.skipWaiting());\nself.addEventListener("activate", (e) => e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith("uccle-assets")) await caches.delete(k); await self.registration.unregister(); })()));\n`;
const OUT = path.resolve(arg("out", path.join(HERE, ".tour")));
const OVERLAY = new Set(["/debug/tour.html", "/debug/tour.js", "/tools/tour/views.json"]);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".css": "text/css", ".wasm": "application/wasm", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
  ".ktx2": "image/ktx2", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8", ".geojson": "application/geo+json", ".hdr": "application/octet-stream", ".exr": "application/octet-stream",
};
const SAFE = /^[A-Za-z0-9_.-]+$/;
// rule tour-fresh-bundle: build the served checkout's tile worker from its own sources (--committed-bundle: serve the
// committed file as before, e.g. to reproduce what the live site draws)
const BUNDLE = process.argv.includes("--committed-bundle") ? null : await buildBundle(ROOT);
if (BUNDLE) {
  const was = await committedHash(ROOT);
  console.log(`[tour] tile worker built from ${ROOT}'s sources: code hash ${BUNDLE.hash}${was === BUNDLE.hash ? " (= its committed bundle)" : ` (its committed bundle is ${was}: STALE, the tour uses the fresh build)`}`);
}

function save(req, res, u) {
  const run = u.searchParams.get("run") ?? "", name = u.searchParams.get("name") ?? "";
  if (!SAFE.test(run) || !SAFE.test(name) || !/\.(png|json)$/.test(name) || run.startsWith(".")) { res.writeHead(400); return res.end("bad name"); }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const dir = path.join(OUT, run);
    fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(path.join(dir, name), buf);
    if (name === "run.json") {
      try {
        const j = JSON.parse(buf.toString("utf8"));
        console.log(`[tour] ${run}: DONE in ${(j.ms / 1000).toFixed(0)} s, ${j.results.filter((r) => r.ok).length}/${j.results.length} ok -> ${dir}`);
        for (const r of j.results) if (!r.ok) console.log(`[tour]   ${r.id}: ${r.fail ?? "not fully built"}`);
      } catch { /* the page's own business */ }
    } else console.log(`[tour] ${run}/${name} ${(buf.length / 1024).toFixed(0)} kB`);
    res.writeHead(200, { "content-type": "text/plain" }); res.end("ok");
  });
}

function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("not found"); }
    const etag = `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}-${(st.ino || 0).toString(36)}"`;
    // (the tour page itself: no-store, so Chrome never keeps a finished tour in the back-forward cache: with its
    // views' memory that was 14 GB held after navigating away)
    const head = { "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "cache-control": file.endsWith("tour.html") ? "no-store" : "no-cache",
      etag, "last-modified": st.mtime.toUTCString() };
    // a brotli sibling (tools/asset_hashes.mjs --br, rule asset-compression): served as vercel.json does
    if (file.endsWith(".br")) Object.assign(head, { "content-encoding": "br", "content-type": "application/vnd.uccle.br-sibling" });
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, head); return res.end(); }
    res.writeHead(200, { ...head, "content-length": st.size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.method === "POST" && u.pathname === "/__tour/save") return save(req, res, u);
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let p;
  try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end(); }
  if (p === "/") p = "/debug/tour.html";
  if (p === "/sw.js" && !KEEP_SW) {
    res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-store" });
    return res.end(req.method === "HEAD" ? undefined : SW_KILL);
  }
  // rule tour-fresh-bundle: the tile worker built from the SERVED checkout's sources, not its committed (stale) bundle
  if (p === "/viewer/tileWorker.bundle.js" && BUNDLE) {
    res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-cache", etag: `"fresh-${BUNDLE.hash}"`, "content-length": Buffer.byteLength(BUNDLE.code) });
    return res.end(req.method === "HEAD" ? undefined : BUNDLE.code);
  }
  const base = OVERLAY.has(p) ? HERE : ROOT;
  const file = path.join(base, p);
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  serveFile(req, res, file.endsWith(path.sep) ? path.join(file, "index.html") : file);
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[tour] serving ${ROOT} on http://localhost:${PORT}/  (tour files from ${HERE}, runs to ${OUT})`);
  console.log(`[tour] open http://localhost:${PORT}/debug/tour.html?run=<name>`);
});
