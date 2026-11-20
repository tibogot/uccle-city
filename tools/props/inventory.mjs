// PROPS INVENTORY (docs/PROPS.md): the hittable classes per tile, from the city's own data, as the city places them.
//   node --import ./tools/road_audit/register.mjs tools/props/inventory.mjs [--all | T ...] [--jobs N] [--out FILE]
// Per tile (a child process each: the tile worker's own build in node, tools/boot3/entries.json as driveCheck does):
//   bins        data/furniture/<T>.json bins by piece (bin_round = class bin, bin_column)
//   signs       data/streetkit/<T>.json signs (posts, tall posts) + their plates; Villo bikes in their docks
//   terraces    the street life's layout of data/streetlife/<T>.json with the shopfront kit (viewer/streetlife/layout.js
//               layoutTile, curated data/shops/terraces.json): tables (table_sq) + chairs
//   bollards    the UrbIS bollards the city draws (d.road.surfaceData.bollards, viewer/streetFit.js buildBollards)
//   two-wheel   the parked motorbikes / scooters: the tile's parking slots (d.parked.sites) through the same picker and
//               group rule as viewer/moto/cityTwoWheelers.js (picker: ~1 slot in 6 within 30 m of a shop / café, 1 in 40
//               elsewhere; 2-3 bikes a slot), before the furniture / border filters main.js adds (a few % fewer)
//   cones       none in the city's data: the police accident job's 8 (viewer/police/props.js)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const CHILD = flag("--child"), ALL = flag("--all");
const OUT = opt("--out", null), JOBS = +opt("--jobs", 3);
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const TILES = ALL ? manifest.tiles.filter((t) => t.status === "built" || t.status === undefined).map((t) => t.name) : argv.map((t) => t.toUpperCase());
const CLS = ["bin", "bin_column", "sign", "plates", "villo", "table", "chair", "bollard", "moto", "scooter"];

if (!CHILD) {
  const t0 = Date.now(), results = [], queue = TILES.slice();
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { err += b; });
    p.on("close", (code) => {
      const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: FAIL ${err.trim().split("\n").slice(-2).join(" / ")}`); results.push({ tile: T, error: true }); }
      else results.push(JSON.parse(line));
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  results.sort((a, b) => a.tile.localeCompare(b.tile));
  const sum = Object.fromEntries(CLS.map((k) => [k, 0]));
  console.log(`| tile | ${CLS.join(" | ")} |\n|---|${CLS.map(() => "---").join("|")}|`);
  for (const r of results) {
    if (r.error) continue;
    for (const k of CLS) sum[k] += r[k] || 0;
    console.log(`| ${r.tile} | ${CLS.map((k) => r[k] || 0).join(" | ")} |`);
  }
  console.log(`| **all ${results.filter((r) => !r.error).length} tiles** | ${CLS.map((k) => `**${sum[k]}**`).join(" | ")} |`);
  console.log(`(cones: 0 in the city data, the police accident job's 8; ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), sum, tiles: results }, null, 1));
  process.exit(results.some((r) => r.error) ? 1 : 0);
}

// ---------------------------------------------------------------- the child: one tile
globalThis.location ??= { search: "" };
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(String(u));
  if (url.protocol !== "file:") return nodeFetch(u, o);
  try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
};
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k === "measureText" ? (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }) : () => {}), set: () => true }); } };
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const json = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), "utf8")) : null);
const T = TILES[0], out = { tile: T };
// bins, signs, Villo bikes
const furn = json(`data/furniture/${T}.json`);
for (const b of furn?.bins || []) { const k = b.piece === "bin_column" ? "bin_column" : "bin"; out[k] = (out[k] || 0) + 1; }
const sk = json(`data/streetkit/${T}.json`);
out.sign = (sk?.signs || []).length; out.plates = (sk?.signs || []).reduce((s, x) => s + x.plates.length, 0);
out.villo = (sk?.villo || []).reduce((s, v) => s + v.bikes.length, 0);
// terraces: the street life's layout with the shopfront kit
const sl = json(`data/streetlife/${T}.json`);
if (sl) {
  try {
    const { layoutTile } = await imp("viewer/streetlife/layout.js");
    const terraces = json("data/shops/terraces.json")?.terraces || {};
    const measure = (lines) => ({ w: 64, h: 16, px: 16 });
    const L = layoutTile(sl, measure, null, { shops: true, terraces });
    out.table = (L.shops?.table_sq?.length || 0) / 12; out.chair = (L.props?.chair?.length || 0) / 8;
  } catch (e) { out.terraceError = e.message; }
}
// bollards + parked two-wheelers: the tile worker's build
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const m = manifest.tiles.find((t) => t.name === T);
const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false };
const { buildTileData } = await imp("viewer/tileData.js");
const realLog = console.log; console.log = () => {};
const d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
console.log = realLog;
out.bollard = (d.road?.surfaceData?.bollards?.length || 0) / 3;
// the two-wheelers' picker + groups (viewer/moto/cityTwoWheelers.js picker / addTile)
const POI_KINDS = new Set(["shop", "restaurant", "fastfood", "supermarket", "cafe", "bar", "pub"]);
const pois = (sl?.pois || []).filter((p) => POI_KINDS.has(p.kind) || POI_KINDS.has(p.cat)).map((p) => [p.face?.x ?? p.x, p.face?.z ?? p.z]);
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
out.moto = 0; out.scooter = 0;
for (const s of d.parked?.sites || []) {
  const near = pois.some(([x, z]) => (x - s.x) ** 2 + (z - s.z) ** 2 < 900);
  if (hash(s.x * 0.37, s.z * 0.53) >= (near ? 0.17 : 0.025)) continue;
  const n = hash(s.z * 0.21, s.x * 0.17) < 0.55 ? 3 : 2;
  for (let j = 0; j < n; j++) { if (hash(s.x + j * 3.1, s.z - j * 1.7) < 0.45) out.moto++; else out.scooter++; }
}
console.log(JSON.stringify(out));
process.exit(0);
