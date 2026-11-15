// BOOT3 (docs/BOOT.md section 5): the tile worker's build of a tile in node, step by step, with the EXACT entry the city
// posts to its worker (tools/boot3/entries.json: captured from a default boot with a Worker.postMessage hook).
//   node --import ./tools/road_audit/register.mjs tools/boot3/profile.mjs [I6 H5 ...] [--runs 3] [--cpu-prof]
// Land cover / grass types paint on an OffscreenCanvas the browser has and node has not: a no-op stand-in here (their
// browser times are in the worker's log line "tile XX built in the worker: ...").
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
const { buildTileData } = await import(pathToFileURL(join(ROOT, "viewer/tileData.js")).href);
const BASE = pathToFileURL(join(ROOT, "data/tiles") + "/").href;
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const args = process.argv.slice(2);
const ri = args.indexOf("--runs"), runs = ri >= 0 ? +args[ri + 1] : 1;
// --set key=value (repeatable): an entry override, e.g. --set colBand=false (values JSON-parsed)
const sets = {};
args.forEach((a, i) => { if (a === "--set") { const [k, v] = args[i + 1].split("="); sets[k] = JSON.parse(v); } });
const names = args.filter((a, i) => !a.startsWith("--") && (ri < 0 || i !== ri + 1) && args[i - 1] !== "--set");
const template = entries.find((e) => !e.lite).entry;
const HASH = args.includes("--hash");
const { createHash } = await import("node:crypto");
/** a content hash of a built tile (every typed array's bytes, every plain value), to prove a faster build equal */
function hashOf(d) {
  const h = createHash("sha1"), seen = new Set();
  const walk = (v, path) => {
    if (v == null || typeof v === "function") { h.update(path + ":" + String(v)); return; }
    if (ArrayBuffer.isView(v)) { h.update(path + ":" + v.constructor.name + v.length); h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); return; }
    if (v instanceof ArrayBuffer) { h.update(new Uint8Array(v)); return; }
    if (typeof v !== "object") { h.update(path + ":" + (typeof v === "number" ? v.toPrecision(12) : String(v))); return; }
    if (seen.has(v)) return; seen.add(v);
    if (v instanceof Map) { for (const [k, x] of v) walk(x, path + "/" + k); return; }
    for (const k of Object.keys(v)) if (!/^(times|ms|.*Ms|.*_ms|elapsed)$/.test(k)) walk(v[k], path + "/" + k);
  };
  walk(d, "");
  return h.digest("hex").slice(0, 16);
}
for (const T of names.length ? names : ["I6"]) {
  const m = manifest.tiles.find((t) => t.name === T);
  const entry = { ...template, ...m, cache: false, ...sets };
  const all = [];
  for (let r = 0; r < runs; r++) {
    const t0 = performance.now();
    const d = await buildTileData(entry, BASE);
    all.push({ total: Math.round(performance.now() - t0), ...d.times });
    if (HASH && r === 0) { const parts = {}; for (const k of Object.keys(d)) parts[k] = hashOf(d[k]); console.log(`${T} hash ${hashOf(d)} ${JSON.stringify(parts)}`); }
  }
  const keys = Object.keys(all[0]);
  const med = (k) => { const v = all.map((a) => a[k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  console.log(`${T} (median of ${runs}): ` + keys.map((k) => `${k} ${med(k)}`).join(", "));
}
