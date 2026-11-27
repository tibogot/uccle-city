// STREET SLIVERS (claude/reality2, 2026-11-27; rule garage-has-drive, review of shot c5_garage_drive_new).
// A thin light line ran along the sidewalk's back edge at the garden join (F3 Avenue ..., -303, -501): the street-surface
// mesh carries long needle triangles there (2-4 m long, 1-5 cm wide, flat): slivers of the land-cover polygons where the
// sidewalk's back edge, a ramp or a path meet (viewer/surfaces.js triangulates them as given). They were there before
// the garage drives (?garagedrive=old shows them); the drives add none. This counts them on every built tile from the
// worker build (the gate tile cache) so they cannot grow, and lists the worst for the job that removes them:
//
//   node --import ./tools/road_audit/register.mjs tools/audit/streetSliverCheck.mjs [--quiet] [--max N] [T ...]
//
// N  flat asphalt triangles (the light line) longer than 1.5 m and thinner than 6 cm (2 x area / longest edge) within
//    0.6 m of a sidewalk's back edge (surfaces.json edges, raised: the garden join) <= --max (the count at claude/reality2: the class is pre-existing)
import { readFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2), QUIET = argv.includes("--quiet"), CHILD = argv.includes("--child");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const MAXI = argv.indexOf("--max"), MAX = MAXI >= 0 ? +argv[MAXI + 1] : Infinity;

if (CHILD) {
  const T = argv[argv.indexOf("--child") + 1];
  globalThis.location ??= { search: "" };
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => { const url = new URL(String(u)); if (url.protocol !== "file:") return nodeFetch(u, o); try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); } };
  if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
  const { tileData } = await imp("tools/gate/tileBuild.mjs");
  const man = json("data/tiles/manifest.json"), entries = json("tools/boot3/entries.json");
  const entry = { ...entries.find((e) => !e.lite).entry, ...man.tiles.find((t) => t.name === T), cache: false };
  const log = console.log; console.log = () => {};
  const d = await tileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
  console.log = log;
  // the sidewalks' back edges (surfaces.json edges, raised): the garden join
  const sj = existsSync(join(ROOT, "data/tiles", T, "surfaces.json")) ? json(`data/tiles/${T}/surfaces.json`) : { edges: [] };
  const back = (sj.edges || []).filter((e) => e.raised).map((e) => e.line);
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const nearBack = (x, z) => back.some((l) => l.some((q, i) => i && segD(x, z, l[i - 1], q) < 0.6));
  let n = 0; const worst = [];
  for (const name of ["asphalt"]) {
    const p = d.road?.parts?.[name]; if (!p?.position || !p.index) continue;
    const P = p.position, I = p.index;
    for (let t = 0; t + 3 <= I.length; t += 3) {
      const v = [I[t], I[t + 1], I[t + 2]].map((k) => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]);
      const e = [0, 1, 2].map((i) => Math.hypot(v[(i + 1) % 3][0] - v[i][0], v[(i + 1) % 3][1] - v[i][1], v[(i + 1) % 3][2] - v[i][2]));
      const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2], bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
      const area = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2, L = Math.max(...e), h = (2 * area) / (L || 1);
      const ny = Math.abs((az * bx - ax * bz) / (2 * area || 1)), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][2] + v[1][2] + v[2][2]) / 3;
      if (L > 1.5 && h < 0.06 && ny > 0.95 && nearBack(cx, cz)) { n++; worst.push([+L.toFixed(1), +((v[0][0] + v[1][0] + v[2][0]) / 3).toFixed(1), +((v[0][2] + v[1][2] + v[2][2]) / 3).toFixed(1), name]); }
    }
  }
  worst.sort((a, b) => b[0] - a[0]);
  log(JSON.stringify({ tile: T, n, worst: worst.slice(0, 3) }));
  process.exit(0);
}

const named = argv.filter((a) => /^[A-O]\d+$/.test(a));
const TILES = named.length ? named : json("data/tiles/manifest.json").tiles.filter((t) => t.status === "built").map((t) => t.name);
let total = 0, fails = 0; const all = [];
for (const T of TILES) {
  const r = spawnSync(process.execPath, ["--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
  const line = (r.stdout || "").trim().split(/\r?\n/).filter((l) => l.startsWith("{")).pop();
  if (!line) { fails++; console.log(`FAIL ${T}: the tile did not build`); continue; }
  const o = JSON.parse(line); total += o.n; for (const w of o.worst) all.push([T, ...w]);
  if (!QUIET && o.n) console.log(`${T}: ${o.n} needle triangles`);
}
all.sort((a, b) => b[1] - a[1]);
console.log(`N ${total} flat asphalt needles (> 1.5 m long, < 6 cm wide) on a sidewalk's back edge of ${TILES.length} tiles; worst: ${all.slice(0, 6).map((w) => `${w[0]} ${w[1]} m at (${w[2]}, ${w[3]}) ${w[4]}`).join("; ")}`);
if (total > MAX) { fails++; console.log(`FAIL N ${total} > ${MAX}`); }
console.log(fails ? `STREETSLIVERS: FAIL (${fails})` : "STREETSLIVERS: PASS");
process.exit(fails ? 1 : 0);
