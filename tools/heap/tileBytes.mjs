// HEAP (docs/HEAP.md): what a built tile's data weighs, by path, as the tile worker posts it (node, no browser).
// Every typed array: its own bytes, and its BUFFER's bytes (a view on a bigger buffer transfers + keeps the whole buffer).
//   node --import ./tools/road_audit/register.mjs tools/heap/tileBytes.mjs [I6] [--lite] [--depth 3]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(String(u));
  if (url.protocol !== "file:") return nodeFetch(u, o);
  try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
};
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
const { buildTileData, buildLiteData, transferables } = await import(pathToFileURL(join(ROOT, "viewer/tileData.js")).href);
const BASE = pathToFileURL(join(ROOT, "data/tiles") + "/").href;
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const args = process.argv.slice(2);
const lite = args.includes("--lite");
const di = args.indexOf("--depth"), DEPTH = di >= 0 ? +args[di + 1] : 3;
const names = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--depth");
const template = entries.find((e) => !!e.lite === lite)?.entry ?? entries[0].entry;
const MB = (b) => (b / 1048576).toFixed(2);
for (const T of names.length ? names : ["I6"]) {
  const m = manifest.tiles.find((t) => t.name === T);
  const entry = { ...template, ...m, cache: false };
  const d = await (lite ? buildLiteData : buildTileData)(entry, BASE);
  const byPath = new Map(), seenBuf = new Set(), seen = new Set();
  let views = 0, viewBytes = 0;
  const add = (p, own, buf) => { const e = byPath.get(p) || [0, 0, 0]; e[0] += own; e[1] += buf; e[2]++; byPath.set(p, e); };
  const walk = (v, path, depth) => {
    if (!v || typeof v !== "object") return;
    const key = path.split("/").slice(0, DEPTH + 1).join("/");
    if (ArrayBuffer.isView(v)) {
      views++; viewBytes += v.byteLength;
      const first = !seenBuf.has(v.buffer); seenBuf.add(v.buffer);
      add(key, v.byteLength, first ? v.buffer.byteLength : 0); return;
    }
    if (v instanceof ArrayBuffer) { const first = !seenBuf.has(v); seenBuf.add(v); add(key, v.byteLength, first ? v.byteLength : 0); return; }
    if (seen.has(v)) return; seen.add(v);
    if (v instanceof Map) { for (const [k, x] of v) walk(x, path + "/<map>", depth + 1); return; }
    if (v instanceof Set) { for (const x of v) walk(x, path + "/<set>", depth + 1); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, path + "/[]", depth + 1); return; }
    for (const k of Object.keys(v)) walk(v[k], path + "/" + k, depth + 1);
  };
  walk(d, "", 0);
  const tr = transferables(d); let trBytes = 0; for (const b of tr) trBytes += b.byteLength;
  const rows = [...byPath].sort((a, b) => b[1][1] - a[1][1]);
  console.log(`${T}${lite ? " (far)" : ""}: ${views} views, ${MB(viewBytes)} MB in views, ${MB([...seenBuf].reduce((s, b) => s + b.byteLength, 0))} MB of buffers, transfer list ${tr.size} buffers ${MB(trBytes)} MB`);
  for (const [p, [own, buf, n]] of rows.slice(0, 50)) if (buf > 20000 || own > 20000) console.log(`  ${MB(buf).padStart(7)} MB buf ${MB(own).padStart(7)} MB view  x${String(n).padEnd(5)} ${p}${buf > own * 1.2 + 4096 ? "   <- views on bigger buffers" : ""}`);
}
