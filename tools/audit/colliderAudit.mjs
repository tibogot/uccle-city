// COLLIDER AUDIT, OFFLINE (claude/collisions 2026-11-17; QUALITY_RULES rule 25 provisional). Every tile is built by the
// tile worker's own code in node (viewer/tileData.js buildTileData, the entry the city posts: tools/boot3/entries.json),
// the main thread's collider additions that are pure data are added as the city adds them (viewer/drive/driveMode.js
// tileDrive: lamps + bollards; the parked cars; the front-garden pieces as viewer/gardens/cityGardens.js keeps them), then:
//
//   missing     DRAWN, NOT SOLID: a drawn building wall at car height (0.30-1.30 m over the drive surface, the band the
//               colliders use) standing on / within REACH m of paved drive surface (road, sidewalk, deck) with no car
//               collider within OFF_LO m. Truth = the FINAL drawn walls (d.buildings.walls: after wall repair, the
//               feet, the rebuilt walls), traced by the same raster as the colliders (colliders.js buildingBlocks).
//   invisible   SOLID, NOT DRAWN ("invisible walls"): a building collider cell with no drawn wall within OFF_LO m, on /
//               next to paved surface; a kerb-island collider whose drawn surface is not raised (colliderAudit.js).
//   offset      the same, but the nearest drawn wall / collider is OFF_LO..OFF_HI m away: a collider shifted or sized
//               against its mesh (> 0.3 m), not a thing on its own. Reported apart.
//   lane        a hard collider (building, wall, tree, lamp, bollard, garden wall / pillar / gate, furniture) the car's
//               body (CAR_HW either side) meets on a DRIVEN path of the traffic graph (lanes + junction connectors:
//               d.traffic, what the sim drives); parked cars / hedges / kerb islands counted as info (soft for the
//               player car, or gated by trafpark)
//   tram        the same along a tram track (features lines kind tram), the tram's half width TRAM_HW
//   gate        a collider in a gate mouth the game needs (the police station's gates: data/overrides.json plantsClear)
//
// Not offline (the browser turn, debug/drawnAudit.js + viewer.collisionTest): the hero / landmark / bridge LOD0
// colliders (GLBs), the kits' stand-ins (furniture2, stops, street kit, street life, fuel: made from the drawn
// instances, consistent by construction: drawnAudit 0 missing / 0 ghost), tram poles and rail masts, traffic boxes.
// The data layers' points in lanes are tools/audit/streetAudit.mjs's.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/colliderAudit.mjs [--all | T ...] [--jobs N] [--gardennew] [--set k=v]
//        [--out FILE] [--quiet] [--max cat=N,...] [--worst 20]
//   --gardennew  ?gardenlane=new (opt-in: garden pieces cleared by their whole footprint)
//   --set k=v    a tile entry override (--set colFeet=false = ?colfeet=old: building colliders from the floating solids)
//   --max   the gate: exit 1 when a category's count over the tiles run is above N (e.g. lane=0,gate=0)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
// --set key=value (repeatable): a tile entry override, e.g. --set colFeet=false (= ?colfeet=old), JSON values
const SETS = []; for (let i = argv.indexOf("--set"); i >= 0; i = argv.indexOf("--set")) SETS.push(argv.splice(i, 2)[1]);
const CHILD = flag("--child"), ALL = flag("--all"), QUIET = flag("--quiet"), GNEW = flag("--gardennew"), OLD = !GNEW;   // (the city default: the old garden test; --gardennew = ?gardenlane=new)
const OUT = opt("--out", null), JOBS = +opt("--jobs", Math.max(1, Math.min(4, Math.floor(os.totalmem() / 2 ** 30 / 4), os.cpus().length - 1))), WORST = +opt("--worst", 20);
const MAX = Object.fromEntries((opt("--max", "") || "").split(",").filter(Boolean).map((s) => { const [k, v] = s.split("="); return [k, +v]; }));
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const TILES = ALL ? manifest.tiles.filter((t) => t.status === "built" || t.status === undefined).map((t) => t.name) : argv.map((t) => t.toUpperCase());

export const CELL = 0.25, REACH = 2.0, OFF_LO = 0.3, OFF_HI = 1.5, CAR_HW = 0.9, TRAM_HW = 1.3, STEP = 0.5, MIN_AREA = 0.5;
export const PAVED = 5;          // cm over the carved terrain: the drive grid has a road / sidewalk / deck there (road deck = 12)

// ---------------------------------------------------------------- the parent: tiles over child processes
if (!CHILD) {
  if (!TILES.length) { console.error("usage: colliderAudit.mjs [--all | T ...] [--jobs N] [--gardennew] [--set k=v] [--out FILE] [--max cat=N]"); process.exit(2); }
  const t0 = Date.now(), results = [];
  const queue = TILES.slice();
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T, ...(GNEW ? ["--gardennew"] : []), ...SETS.flatMap((k) => ["--set", k])], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { err += b; });
    p.on("close", (code) => {
      const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: FAIL child exit ${code}: ${err.trim().split("\n").slice(-3).join(" / ")}`); results.push({ tile: T, error: true }); }
      else results.push(JSON.parse(line));
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  results.sort((a, b) => a.tile.localeCompare(b.tile));
  const CATS = ["missing", "invisible", "offset", "lane", "tram", "gate"];
  const sum = Object.fromEntries(CATS.map((c) => [c, 0])), area = { missing: 0, invisible: 0, offset: 0 }, byKind = {}, info = {};
  const items = [];
  for (const r of results) {
    if (r.error) continue;
    for (const c of CATS) sum[c] += r.counts[c] || 0;
    for (const c of Object.keys(area)) area[c] += r.area?.[c] || 0;
    for (const [k, v] of Object.entries(r.byKind || {})) byKind[k] = (byKind[k] || 0) + v;
    for (const [k, v] of Object.entries(r.info || {})) info[k] = (info[k] || 0) + v;
    for (const it of r.items) items.push({ tile: r.tile, ...it });
  }
  const errors = results.filter((r) => r.error).length;
  if (!QUIET) {
    console.log(`| tile | ${CATS.join(" | ")} | ms |\n|---|${CATS.map(() => "---|").join("")}---|`);
    for (const r of results) if (!r.error && CATS.some((c) => r.counts[c])) console.log(`| ${r.tile} | ${CATS.map((c) => r.counts[c] || 0).join(" | ")} | ${r.ms} |`);
  }
  console.log(`tiles ${results.length - errors}${errors ? ` (+${errors} FAILED)` : ""}: ` + CATS.map((c) => `${c} ${sum[c]}`).join(", ")
    + ` | area m2: missing ${area.missing.toFixed(0)}, invisible ${area.invisible.toFixed(0)}, offset ${area.offset.toFixed(0)} | ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  by kind: ${Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}`);
  console.log(`  info (not failed): ${Object.entries(info).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}`);
  // worst places: by size (m2 for the raster classes, metres of path blocked for lane / tram / gate)
  items.sort((a, b) => b.size - a.size);
  if (!QUIET || WORST) {
    console.log(`worst ${Math.min(WORST, items.length)}:`);
    for (const it of items.slice(0, WORST)) console.log(`  ${it.tile} ${it.cat.padEnd(9)} ${String(it.size).padStart(6)} ${it.cat === "lane" || it.cat === "tram" || it.cat === "gate" ? "m " : "m2"} ?at=${it.x},${it.z}  ${it.what}`);
  }
  if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), old: OLD, tiles: results.length, sum, area, byKind, info, results }, null, 1));
  let fail = errors > 0;
  // --max: a category (lane, gate, ...) or a by-kind key, "*" = any rest ("lane garden*": every garden piece in a lane)
  for (const [c, n] of Object.entries(MAX)) {
    const re = new RegExp("^" + c.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    const v = c in sum ? sum[c] : Object.entries(byKind).filter(([k]) => re.test(k)).reduce((a, [, x]) => a + x, 0);
    if (v > n) { console.log(`FAIL ${c}: ${v} > ${n}`); fail = true; } else console.log(`  ${c}: ${v} <= ${n}`);
  }
  console.log(fail ? "colliderAudit: FAIL" : "colliderAudit: ok");
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------- the child: one tile
globalThis.location ??= { search: GNEW ? "?gardenlane=new" : "" };
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(String(u));
  if (url.protocol !== "file:") return nodeFetch(u, o);
  try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
};
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { buildTileData } = await imp("viewer/tileData.js");
const { Heightmap } = await imp("viewer/heightmap.js");
const C = await imp("viewer/drive/colliders.js");
const { KIND, buildingBlocks, driveHeight, gather, itemContact, heightClear, addCircles, extendColliders, raisedShare, CAR_CLEAR } = C;
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway } = await imp("viewer/streets/carriageway.js");
const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
const { clearRoads, restyleHedges, gardenPieces } = await imp("viewer/gardens/gardenClear.js");
const KN = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k]));

const T = TILES[0];
const t0 = Date.now();
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const m = manifest.tiles.find((t) => t.name === T);
const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false };
for (const kv of SETS) { const [k, v] = kv.split("="); entry[k] = JSON.parse(v); }
const overrides = JSON.parse(readFileSync(join(ROOT, "data/overrides.json"), "utf8"));
const realLog = console.log; console.log = () => {};                 // (the build's own log lines: off)
const d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
console.log = realLog;
const b = d.bounds, hm = Heightmap.from(d.hdr, d.y, d.orig), ground = d.drive.ground;
const H = (x, z) => driveHeight(hm, ground, x, z);
const inTile = (x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;

// ---- the collider set as the city completes it on the main thread (what is pure data)
const col0 = d.drive.col;
const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
const lamps = placedLampSites(d.roads, b, fit?.placeLamp).map((p) => ({ x: p.x, z: p.z, r: 0.2, kind: KIND.lamp }));
const bx = d.road.surfaceData?.bollards || [];
const posts = Array.from({ length: bx.length / 3 }, (_, i) => ({ x: bx[i * 3], z: bx[i * 3 + 2], r: 0.1, kind: KIND.post }));
addCircles(col0, [...lamps, ...posts]);
const extra = [];
for (const c of d.parked?.sites || []) {           // the parked cars (the fleet's box: the widest common type, trafpark's)
  const hw = 0.925, hl = 2.365, s = Math.sin(c.heading ?? c.yaw ?? 0), k = Math.cos(c.heading ?? c.yaw ?? 0);
  extra.push({ rings: [[[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([u, v]) => [c.x + u * k + v * s, c.z - u * s + v * k])], kind: KIND.car });
}
// the front-garden pieces the city keeps (main.js: blocked = on a carriageway 0.3 m in, or in a cleared ring)
const gPath = join(ROOT, "data/gardens", `${T}.json`);
let gardenKept = 0, gardenDropped = 0;
if (existsSync(gPath)) {
  let doc = JSON.parse(readFileSync(gPath, "utf8"));
  const drivenAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null });
  const clearRings = Object.entries(overrides.plantsClear || {}).filter(([k]) => !k.startsWith("_")).map(([, v]) => v.ring);
  const inR = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const blocked = (x, z) => drivenAt.inside(x, z, 0.3) || clearRings.some((r) => inR(r, x, z));
  const rs = restyleHedges(doc, overrides.gardenRestyle, blocked); if (rs) doc = rs.doc;
  const n0 = doc.segs.length + doc.pillars.length + doc.gates.length;
  const cl = clearRoads(doc, blocked, { old: OLD }); if (cl) doc = cl.doc;
  gardenKept = doc.segs.length + doc.pillars.length + doc.gates.length; gardenDropped = n0 - gardenKept;
  for (const p of gardenPieces(doc)) extra.push(p);
}
const P0 = col0.P, col = extendColliders(col0, extra, []);
col.pgarden = new Array(col.P).fill(null); extra.forEach((e, i) => { if (e.what) col.pgarden[P0 + i] = e.what; });

// ---- rasters over the tile (+ margin): paved, drawn walls at car height, building colliders
const MG = 4, gx0 = b.x0 - MG, gz0 = b.z0 - MG, NX = Math.ceil((b.x1 - b.x0 + 2 * MG) / CELL), NZ = Math.ceil((b.z1 - b.z0 + 2 * MG) / CELL);
const cellOf = (x, z) => { const i = Math.floor((x - gx0) / CELL), k = Math.floor((z - gz0) / CELL); return i >= 0 && k >= 0 && i < NX && k < NZ ? k * NX + i : -1; };
/** fill polygons (even-odd over their rings) into a grid */
function fillPolys(polys, grid) {
  for (const p of polys) {
    let z0 = Infinity, z1 = -Infinity;
    for (const r of p.rings) for (const [, z] of r) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const k0 = Math.max(0, Math.floor((z0 - gz0) / CELL)), k1 = Math.min(NZ - 1, Math.floor((z1 - gz0) / CELL));
    for (let k = k0; k <= k1; k++) {
      const zc = gz0 + (k + 0.5) * CELL, xs = [];
      for (const r of p.rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [ax, az] = r[i], [bx2, bz] = r[j];
        if ((az > zc) !== (bz > zc)) xs.push(ax + (bx2 - ax) * (zc - az) / (bz - az));
      }
      xs.sort((a, c) => a - c);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const i0 = Math.max(0, Math.ceil((xs[q] - gx0) / CELL - 0.5)), i1 = Math.min(NX - 1, Math.floor((xs[q + 1] - gx0) / CELL - 0.5));
        for (let i = i0; i <= i1; i++) grid[k * NX + i] = 1;
      }
    }
  }
}
// truth: the drawn walls, as one triangle soup through the colliders' own raster
// (the walls mesh + the façade kit's walls mesh: the faces with kit slots are drawn by walls.kit, not walls)
const Wp = (() => { const a = d.buildings?.walls?.position, k = d.buildings?.walls?.kit?.position; if (!k?.length) return a; const o = new Float32Array((a?.length || 0) + k.length); if (a) o.set(a); o.set(k, a?.length || 0); return o; })();
const truth = new Uint8Array(NX * NZ);
if (Wp?.length) {
  const nV = Wp.length / 3, buf = new ArrayBuffer(8 + nV * 12 + nV * 4), dv = new DataView(buf);
  dv.setUint32(0, nV, true); dv.setUint32(4, nV / 3, true);
  new Float32Array(buf, 8, nV * 3).set(Wp);
  const I = new Uint32Array(buf, 8 + nV * 12, nV); for (let i = 0; i < nV; i++) I[i] = i;
  const tb = buildingBlocks({ buildings: [{ walls: { first: 0, count: nV / 3 } }] }, buf, H, b, { margin: MG + 2 });
  fillPolys(tb.polys, truth);
}
const solid = new Uint8Array(NX * NZ), bpolys = [];
for (let p = 0; p < col.P; p++) if (col.pkind[p] === KIND.building) {
  const rings = [];
  for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) { const ring = []; for (let i = col.ringStart[r]; i < col.ringStart[r + 1]; i++) ring.push([col.pts[i * 2], col.pts[i * 2 + 1]]); rings.push(ring); }
  bpolys.push({ rings });
}
fillPolys(bpolys, solid);
// any other hard collider counts as "solid" for the drawn-wall test (a wall drawn where a garden wall / platform collides)
const otherSolid = new Uint8Array(NX * NZ);
{
  const ps = [];
  for (let p = 0; p < col.P; p++) {
    const k = col.pkind[p]; if (k === KIND.building || k === KIND.island) continue;
    const rings = []; for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) { const ring = []; for (let i = col.ringStart[r]; i < col.ringStart[r + 1]; i++) ring.push([col.pts[i * 2], col.pts[i * 2 + 1]]); rings.push(ring); }
    ps.push({ rings });
  }
  fillPolys(ps, otherSolid);
}
// paved: the drive grid's surface (1 m) dilated by REACH
const paved = new Uint8Array(NX * NZ);
{
  const h = hm.h, D = ground.delta, R = Math.ceil(REACH / CELL);
  const near = new Uint8Array(NX * NZ);
  for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
    const x = gx0 + (i + 0.5) * CELL, z = gz0 + (k + 0.5) * CELL, c = Math.round((x - h.x0) / h.step), r = Math.round((z - h.z0) / h.step);
    if (c >= 0 && r >= 0 && c < h.cols && r < h.rows && D[r * h.cols + c] >= PAVED && D[r * h.cols + c] < 65535) near[k * NX + i] = 1;
  }
  // separable max filter (square REACH): cheap and conservative
  const tmp = new Uint8Array(NX * NZ);
  for (let k = 0; k < NZ; k++) { let last = -1e9; for (let i = 0; i < NX; i++) { if (near[k * NX + i]) last = i; if (i - last <= R) tmp[k * NX + i] = 1; } last = 1e9; for (let i = NX - 1; i >= 0; i--) { if (near[k * NX + i]) last = i; if (last - i <= R) tmp[k * NX + i] = 1; } }
  for (let i = 0; i < NX; i++) { let last = -1e9; for (let k = 0; k < NZ; k++) { if (tmp[k * NX + i]) last = k; if (k - last <= R) paved[k * NX + i] = 1; } last = 1e9; for (let k = NZ - 1; k >= 0; k--) { if (tmp[k * NX + i]) last = k; if (last - k <= R) paved[k * NX + i] = 1; } }
}
/** chamfer distance (m) to the nearest set cell, capped at cap */
function distTo(src, cap) {
  const D = new Float32Array(NX * NZ).fill(cap), a = CELL, dg = CELL * Math.SQRT2;
  for (let q = 0; q < D.length; q++) if (src[q]) D[q] = 0;
  for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) { const q = k * NX + i; let v = D[q];
    if (i > 0) v = Math.min(v, D[q - 1] + a); if (k > 0) { v = Math.min(v, D[q - NX] + a); if (i > 0) v = Math.min(v, D[q - NX - 1] + dg); if (i < NX - 1) v = Math.min(v, D[q - NX + 1] + dg); } D[q] = v; }
  for (let k = NZ - 1; k >= 0; k--) for (let i = NX - 1; i >= 0; i--) { const q = k * NX + i; let v = D[q];
    if (i < NX - 1) v = Math.min(v, D[q + 1] + a); if (k < NZ - 1) { v = Math.min(v, D[q + NX] + a); if (i < NX - 1) v = Math.min(v, D[q + NX + 1] + dg); if (i > 0) v = Math.min(v, D[q + NX - 1] + dg); } D[q] = v; }
  return D;
}
const anySolid = new Uint8Array(NX * NZ); for (let q = 0; q < anySolid.length; q++) anySolid[q] = solid[q] | otherSolid[q];
const dCol = distTo(anySolid, OFF_HI + 1), dTruth = distTo(truth, OFF_HI + 1);
// classes per cell (inside the tile, near paved): 1 missing, 2 invisible, 3 offset-out (drawn past the collider), 4 offset-in
const cls = new Uint8Array(NX * NZ);
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  const q = k * NX + i;
  if (!paved[q] || !inTile(gx0 + (i + 0.5) * CELL, gz0 + (k + 0.5) * CELL)) continue;
  if (truth[q] && !anySolid[q] && dCol[q] > OFF_LO) cls[q] = dCol[q] > OFF_HI ? 1 : 3;
  else if (solid[q] && !truth[q] && dTruth[q] > OFF_LO) cls[q] = dTruth[q] > OFF_HI ? 2 : 4;
}
// COLDUMP=x,z[,half]: an ASCII map round (x, z) on stderr (0.5 m a char): # drawn + collider, D drawn only,
// C collider only, o other hard collider, - paved, . nothing (the browser turn's look at one place)
if (process.env.COLDUMP) {
  const [qx, qz, hh = 15] = process.env.COLDUMP.split(",").map(Number), lines = [];
  for (let z = qz - hh; z <= qz + hh; z += 0.5) {
    let l = "";
    for (let x = qx - hh; x <= qx + hh; x += 0.5) { const q = cellOf(x, z); if (q < 0) { l += " "; continue; } l += truth[q] && solid[q] ? "#" : truth[q] ? "D" : solid[q] ? "C" : otherSolid[q] ? "o" : paved[q] ? "-" : "."; }
    lines.push(l);
  }
  process.stderr.write(`COLDUMP ${T} (${qx}, ${qz}) +-${hh} m, x right, z down\n${lines.join("\n")}\n`);
}
// names: the nearest OSM road
const RN = [];
{ const N = new Map(d.roads.nodes.map((n) => [n.id, n])); for (const r of d.roads.roads) { const nm = r.name || r.meta?.name; if (!nm) continue; const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean); for (const p of pts) RN.push([p.x ?? p[0], p.z ?? p[1], nm]); } }
const near = (x, z) => { let best = null, bd = 60; for (const [px, pz, nm] of RN) { const dd = Math.hypot(px - x, pz - z); if (dd < bd) { bd = dd; best = nm; } } return best ? `${best}` : "(no named road within 60 m)"; };
const items = [], counts = { missing: 0, invisible: 0, offset: 0, lane: 0, tram: 0, gate: 0 }, area = { missing: 0, invisible: 0, offset: 0 }, byKind = {}, info = {};
const NAME = { 1: "missing", 2: "invisible", 3: "offset", 4: "offset" };
{
  const seen = new Uint8Array(NX * NZ), st = [];
  for (let s = 0; s < cls.length; s++) {
    if (!cls[s] || seen[s]) continue;
    const c = cls[s] === 4 ? 3 : cls[s]; let n = 0, sx = 0, sz = 0; seen[s] = 1; st.push(s);
    while (st.length) {
      const q = st.pop(), i = q % NX, k = (q - i) / NX; n++; sx += i; sz += k;
      for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) { const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= NX || kk >= NZ) continue; const r = kk * NX + ii; if (!seen[r] && cls[r] && (cls[r] === 4 ? 3 : cls[r]) === c) { seen[r] = 1; st.push(r); } }
    }
    const a = n * CELL * CELL; if (a < MIN_AREA) continue;
    const cat = NAME[c], x = +(gx0 + (sx / n + 0.5) * CELL).toFixed(1), z = +(gz0 + (sz / n + 0.5) * CELL).toFixed(1);
    counts[cat]++; area[cat] += a;
    const what = c === 1 ? "drawn building wall at car height, no collider" : c === 2 ? "building collider, no wall drawn at car height" : cls[s] === 3 ? "drawn wall 0.3-1.5 m outside its collider" : "collider 0.3-1.5 m past the drawn wall";
    items.push({ cat, kind: "building", x, z, size: +a.toFixed(1), what: `${what} (${near(x, z)})` });
    byKind[`${cat} building`] = (byKind[`${cat} building`] || 0) + 1;
  }
}
// kerb islands not drawn raised
for (let p = 0; p < col.P; p++) if (col.pkind[p] === KIND.island) {
  const rings = []; for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) { const ring = []; for (let i = col.ringStart[r]; i < col.ringStart[r + 1]; i++) ring.push([col.pts[i * 2], col.pts[i * 2 + 1]]); rings.push(ring); }
  const [cx, cz] = rings[0].reduce((s, q) => [s[0] + q[0] / rings[0].length, s[1] + q[1] / rings[0].length], [0, 0]);
  if (!inTile(cx, cz)) continue;
  if (raisedShare(hm, ground.delta, rings) < 0.5) { counts.invisible++; byKind["invisible island"] = (byKind["invisible island"] || 0) + 1; items.push({ cat: "invisible", kind: "island", x: +cx.toFixed(1), z: +cz.toFixed(1), size: 1, what: `kerb-island collider, surface not drawn raised (${near(cx, cz)})` }); }
}

// ---- paths: driven lanes, tram tracks, gate mouths. A body (hw across, STEP long) at every STEP along the line.
const lanesAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null, lanesOnly: true });
const HARD = new Set([KIND.building, KIND.wall, KIND.tree, KIND.lamp, KIND.post, KIND.furniture]);
const kindName = (id) => { const k = id < col.P ? col.pkind[id] : col.ckind[id - col.P]; const g = id < col.P && col.pgarden?.[id]; return g || KN[k]; };
const contact = {}, out = [];
/** line = [[x, z], ...]; returns Map(id -> { n, x, z }) of colliders the body meets */
function sweep(line, hw, keep = () => true) {
  const hits = new Map();
  for (let s = 1; s < line.length; s++) {
    const [ax, az] = line[s - 1], [bx2, bz] = line[s], L = Math.hypot(bx2 - ax, bz - az); if (L < 1e-6) continue;
    const ux = (bx2 - ax) / L, uz = (bz - az) / L, n = Math.max(1, Math.round(L / STEP));
    const body = { hx: hw, hz: L / n / 2, cos: uz, sin: ux };
    for (let j = 0; j < n; j++) {
      const x = ax + ux * (j + 0.5) * L / n, z = az + uz * (j + 0.5) * L / n;
      if (!inTile(x, z) || !keep(x, z)) continue;
      const y = H(x, z);
      out.length = 0; gather(col, x, z, hw + 3, out);
      for (let q = 1; q < out.length; q += 2) {
        const id = out[q];
        if (heightClear(col, id, y)) continue;
        if (id < col.P && col.ptop[id] < 1e3 && col.ptop[id] < y + 0.3) continue;      // under the car band (a kerb-high piece)
        if (!itemContact(col, id, x, z, body, contact)) continue;
        const h = hits.get(id); if (h) h.n++; else hits.set(id, { n: 1, x, z });
      }
    }
  }
  return hits;
}
/** does collider id reach INTO the carriageway (a footprint point >= 0.3 m inside the measured roadway / tram road)?
 *  A solid beside the road whose edge a lane passes within CAR_HW of is a narrow street, not a blocked lane. */
const intrudeMemo = new Map();
function intrudes(id) {
  if (intrudeMemo.has(id)) return intrudeMemo.get(id);
  let r = false;
  if (id >= col.P) { const q = (id - col.P) * 3; r = lanesAt.inside(col.circ[q], col.circ[q + 1], Math.max(0, 0.3 - col.circ[q + 2])); }
  else {
    for (let ri = col.polyRing[id]; ri < col.polyRing[id + 1] && !r; ri++) {
      const s0 = col.ringStart[ri], s1 = col.ringStart[ri + 1];
      for (let i = s0; i < s1 && !r; i++) {
        const j = i + 1 < s1 ? i + 1 : s0, ax = col.pts[i * 2], az = col.pts[i * 2 + 1], bx2 = col.pts[j * 2], bz = col.pts[j * 2 + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, bz - az) / 0.2));
        for (let t = 0; t < n && !r; t++) r = lanesAt.inside(ax + (bx2 - ax) * t / n, az + (bz - az) * t / n, 0.3);
      }
    }
  }
  intrudeMemo.set(id, r);
  return r;
}
function report(cat, hits, what) {
  for (const [id, h] of hits) {
    const k = id < col.P ? col.pkind[id] : col.ckind[id - col.P], name = kindName(id);
    if (!HARD.has(k)) { info[`${cat} ${name}`] = (info[`${cat} ${name}`] || 0) + 1; continue; }
    if (cat === "lane" && !intrudes(id)) { info[`lane edge ${name}`] = (info[`lane edge ${name}`] || 0) + 1; continue; }
    counts[cat]++; byKind[`${cat} ${name}`] = (byKind[`${cat} ${name}`] || 0) + 1;
    items.push({ cat, kind: name, x: +h.x.toFixed(1), z: +h.z.toFixed(1), size: +(h.n * STEP).toFixed(1), what: `${name} ${what ?? h.what} (${near(h.x, h.z)})` });
  }
}
const tr = d.traffic;
// (a hit counts where the path's centre is on the carriageway, viewer/streets/carriageway.js lanesOnly: the measured
// roadway / tram road, else the OSM band; a path piece off it (a connector cutting a corner over the sidewalk) is the
// traffic geometry's defect, counted as info "lane off carriageway")
if (tr?.xy) {
  const all = new Map(), off = new Map();
  for (let p = 0; p + 1 < tr.off.length; p++) {
    const line = []; for (let i = tr.off[p]; i < tr.off[p + 1]; i++) line.push([tr.xy[i * 2], tr.xy[i * 2 + 1]]);
    for (const [id, h] of sweep(line, CAR_HW, (x, z) => lanesAt.inside(x, z, 0))) { const o = all.get(id); if (!o || h.n > o.n) all.set(id, { ...h, conn: tr.kind[p] === 1 }); }
    for (const [id, h] of sweep(line, CAR_HW, (x, z) => !lanesAt.inside(x, z, 0))) if (!all.has(id)) off.set(id, h);
  }
  for (const [id, h] of all) h.what = h.conn ? "in a junction connector" : "in a driven lane";
  report("lane", all, null);
  for (const id of off.keys()) if (!all.has(id)) { const k = kindName(id); info[`lane off carriageway ${k}`] = (info[`lane off carriageway ${k}`] || 0) + 1; }
}
{
  const all = new Map();
  for (const l of d.feats.lines || []) if (l.kind === "tram" && l.line?.length >= 2) for (const [id, h] of sweep(l.line, TRAM_HW)) { const o = all.get(id); if (!o || h.n > o.n) all.set(id, h); }
  report("tram", all, "on a tram track");
}
// the gate mouths the police game drives through (data/overrides.json plantsClear: the station's gates)
for (const [key, v] of Object.entries(overrides.plantsClear || {})) {
  if (!/^police_(south_gate|yard)$/.test(key) || !v.ring?.length) continue;
  const cat = /gate/.test(key) ? "gate" : "yard";          // (the yard ring: the whole north yard + its gate, counted as info)
  const r = v.ring; if (!r.some(([x, z]) => inTile(x, z))) continue;
  // the ring's fill on a 0.5 m lattice: every collider inside it
  const xs = r.map((q) => q[0]), zs = r.map((q) => q[1]);
  const inR = (x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const hits = new Map(), body = { hx: 0.25, hz: 0.25, cos: 1, sin: 0 };
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += STEP) for (let z = Math.min(...zs); z <= Math.max(...zs); z += STEP) {
    if (!inR(x, z)) continue;
    out.length = 0; gather(col, x, z, 3, out);
    for (let q = 1; q < out.length; q += 2) { const id = out[q]; if (heightClear(col, id, H(x, z))) continue; if (!itemContact(col, id, x, z, body, contact)) continue; const h = hits.get(id); if (h) h.n++; else hits.set(id, { n: 1, x, z }); }
  }
  if (cat === "gate") report("gate", hits, `in the ${key.replace(/_/g, " ")} ring`);
  else for (const [id, h] of hits) { const nm = kindName(id); info[`yard ${nm}`] = (info[`yard ${nm}`] || 0) + 1; items.push({ cat: "yard", kind: nm, x: +h.x.toFixed(1), z: +h.z.toFixed(1), size: 0, what: `${nm} in the ${key.replace(/_/g, " ")} ring (info)` }); }
}
info.gardenPiecesKept = gardenKept; info.gardenPiecesDropped = gardenDropped;
console.log(JSON.stringify({ tile: T, ms: Date.now() - t0, counts, area, byKind, info, items, colliders: { polys: col.P, circles: col.C } }));
