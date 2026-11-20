// CENSUS: THE MOVERS' GROUND vs THE DRAWN STREET (claude/ground 2026-11-19, rule mover-ground, provisional, docs/MOVERGROUND.md).
// Owner playtest 2026-11-19 (shots 111 / 112): traffic cars 20-40 cm into the road on the Carsoel deck (H6), on Place de
// Saint-Job and at Pasta Commedia. The traffic, tram 92 and the parked cars stood on worldRef.surface + CARVE (+ the
// decks); the player's car on the drawn drive surface (viewer/drive/moverGround.js). Gate row `moverground`.
//
// Every tile is built by the tile worker's own code in node (viewer/tileData.js buildTileData). The TRUTH is the drawn
// street itself: every up-facing triangle of the road stage's parts (d.road.parts: roads, sidewalks, squares, islands)
// and of the OSM bridge decks' meshes (d.bridgeDecks[].mesh), and the hero road decks' surface from their notes (the
// model is built from them: viewer/rail/roadDeck.js deckHeightFn); never the drive grid. Where they stack (a street under
// a deck) the layer nearest the one before it along the path (a car stays on its layer). Then, with the mover's ground
// as the city computes it (NEW: moverGroundY, the layer nearest the mover's previous height; OLD = ?movground=old:
// the decks, else hm.surface + CARVE):
//   traffic    every 0.5 m of every driven path (lane pieces + junction connectors: the graph's xy, as the sim drives it)
//              inside the tile: |mover - drawn| > TOL
//   parked     every parked-car slot (d.parked.sites): one of its four wheels' contact points (as viewer/cars.js wheelFit
//              samples them) |mover - drawn| > TOL
//   tram       every 1 m of every tram track (d.feats lines kind "tram", as the worker fits them): the tram's wheel seat
//              (viewer/tramline.js railY: the track profile's rail top, else the mover ground) |seat - drawn| > TOL
// Points with no drawn surface under them (a lane piece over a gap, a track on its own bed) are counted in info only.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/moverGround.mjs [--all | T ...] [--out FILE]
//        [--old] [--jobs N] [--max traffic=N,parked=N,tram=N] [--quiet] [--worst N]
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { runTiles, cli, at, ROOT, imp } from "./lib_street.mjs";

const c = cli();
const { CHILD, OUT, JOBS, WORST } = c;
const OLD = c.flag("--old"), QUIET = c.flag("--quiet"), MAX = c.opt("--max", null);
const TILES = c.TILES;
const TOL = 0.05, STEP = 0.5, TRAM_STEP = 1, CARVE = 0.12;
const KINDS = ["traffic", "parked", "tram"];

if (!CHILD) {
  if (!TILES.length) { console.error("usage: moverGround.mjs [--all | T ...] [--old] [--max traffic=N,parked=N,tram=N] [--out FILE]"); process.exit(2); }
  const t0 = Date.now();
  const results = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: OLD ? ["--old"] : [] });
  const sum = Object.fromEntries(KINDS.map((k) => [k, 0])), info = {}, items = [];
  for (const r of results) {
    if (r.error) continue;
    for (const k of KINDS) sum[k] += r.counts[k] || 0;
    for (const [k, v] of Object.entries(r.info || {})) info[k] = +((info[k] || 0) + v).toFixed(2);
    for (const it of r.items) items.push({ tile: r.tile, ...it });
  }
  const errors = results.filter((r) => r.error).length;
  if (!QUIET || WORST) {
    console.log("| tile | kind | x, z | what | worst dy (m) | points |\n|---|---|---|---|---|---|");
    for (const k of KINDS) for (const it of items.filter((q) => q.k === k).sort((a, b) => Math.abs(b.dy) - Math.abs(a.dy)).slice(0, QUIET ? Math.min(WORST, 4) : WORST))
      console.log(`| ${it.tile} | ${k} | ${it.at} | ${it.what} | ${it.dy} | ${it.n} |`);
  }
  console.log(`moverGround${OLD ? " (--old, ?movground=old)" : ""}: tiles ${results.length - errors}${errors ? ` (+${errors} FAILED)` : ""}: ${KINDS.map((k) => `${k} ${sum[k]}`).join(", ")} | ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  info: ${Object.entries(info).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), old: OLD, tol: TOL, tiles: results.length, sum, info, items, results: results.map(({ items: _, ...r }) => r) }, null, 1));
  let fail = errors > 0;
  if (MAX) for (const kv of MAX.split(",")) { const [k, v] = kv.split("="), n = sum[k] ?? 0; if (n > +v) { console.log(`FAIL ${k}: ${n} > ${v}`); fail = true; } else console.log(`  ${k}: ${n} <= ${v}`); }
  console.log(fail ? "moverGround: FAIL" : "moverGround: ok");
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------- the child: one tile
globalThis.location ??= { search: OLD ? "?movground=old" : "" };
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(String(u));
  if (url.protocol !== "file:") return nodeFetch(u, o);
  try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
};
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
const { buildTileData } = await imp("viewer/tileData.js");
const { Heightmap } = await imp("viewer/heightmap.js");
const { deckHeight } = await imp("viewer/streets/bridgeDecks.js");
const { deckHeightFn } = await imp("viewer/rail/roadDeck.js");
const { heroBridgeNames } = await imp("viewer/rail/railData.js");
const { moverGroundY } = await imp("viewer/drive/moverGround.js");
const { makeTrackProfile } = await imp("viewer/trackProfile.js");

const T = c.argv.find((a) => /^[A-Z]\d+$/i.test(a)).toUpperCase();
const t0 = Date.now();
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const entry = { ...entries.find((e) => !e.lite).entry, ...manifest.tiles.find((t) => t.name === T), cache: false };
const realLog = console.log; console.log = () => {};
let d;
try { d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href); } finally { console.log = realLog; }
const b = d.bounds, hm = Heightmap.from(d.hdr, d.y, d.orig);
const inTile = (x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;

// ---- the movers' world as the city has it (main.js addBridgeDecks + the hero road bridges' deckHeightFn)
const heroNotes = heroBridgeNames(true).map((n) => { const f = join(ROOT, "models/rail", `${n}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; }).filter((h) => h?.kind === "road_over_rail");
const decks = [];
for (const dk of d.bridgeDecks || []) decks.push(Object.assign(deckHeight(dk, (x, z) => hm.ground(x, z), { drawn: true }), { osm: true }));
const heroFns = heroNotes.map((h) => deckHeightFn(h));
decks.push(...heroFns);
const tile = { hm, drive: d.drive };
const moverNew = (x, z, near) => moverGroundY(decks, tile, x, z, near);
const moverOld = (x, z) => { for (const f of decks) { const y = f(x, z); if (y != null) return y; } return hm.surface(x, z) + CARVE; };
const mover = OLD ? moverOld : moverNew;

// ---- the truth: the drawn street's up-facing triangles in a 2 m grid
const CELL = 2, grid = new Map(), key = (i, j) => i * 100003 + j, tris = [];
const addSoup = (P, I) => {
  const n = I ? I.length : P.length / 3;
  for (let q = 0; q + 2 < n; q += 3) {
    const a = (I ? I[q] : q) * 3, bb = (I ? I[q + 1] : q + 1) * 3, cc = (I ? I[q + 2] : q + 2) * 3;
    const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[bb], by = P[bb + 1], bz = P[bb + 2], cx = P[cc], cy = P[cc + 1], cz = P[cc + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz);
    if (L < 1e-9 || Math.abs(ny) / L < 0.5) continue;                   // a kerb face, a wall, a fascia: not a surface
    const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), z0 = Math.min(az, bz, cz), z1 = Math.max(az, bz, cz);
    if (x1 < b.x0 - 4 || x0 > b.x1 + 4 || z1 < b.z0 - 4 || z0 > b.z1 + 4) continue;
    const id = tris.push([ax, ay, az, bx, by, bz, cx, cy, cz]) - 1;
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = key(i, j); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(id);
    }
  }
};
for (const part of Object.values(d.road?.parts || {})) if (part?.position) addSoup(part.position, part.index);
for (const dk of d.bridgeDecks || []) if (dk.mesh?.position) addSoup(dk.mesh.position, dk.mesh.index);
const ys = [];
/** the drawn surface heights at (x, z) -> ys (reused), deduplicated within 2 cm */
function drawnAt(x, z) {
  ys.length = 0;
  for (const id of grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris[id];
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-9) continue;
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    const y = l1 * ay + l2 * by + l3 * cy;
    if (!ys.some((v) => Math.abs(v - y) < 0.02)) ys.push(y);
  }
  for (const f of heroFns) { const y = f(x, z); if (y != null && !ys.some((v) => Math.abs(v - y) < 0.02)) ys.push(y); }
  return ys;
}
// the LAYERS a mover can stand on: surfaces within 1.5 m of each other are one layer seen from above (a street drawn
// through a deck's slab, the slab's soffit under its top, a kerb's top over the gutter): its highest; layers further
// apart (a street under a deck) stay apart
const layers = [];
function layersOf(list) {
  layers.length = 0;
  let low = Infinity;                                   // the lowest member of the current layer (sorted from the top)
  for (const v of list.slice().sort((p, q) => q - p)) { if (low - v > 1.5) layers.push(v); low = v; }
  return layers;
}
const nearestOf = (list, y) => { let best = NaN, bd = Infinity; for (const v of layersOf(list)) { const e = Math.abs(v - y); if (e < bd) { bd = e; best = v; } } return best; };

// (--probe x,z[,r]: the layers round a point, to stderr: drawn ys, the grid's two layers, the decks, old / new)
if (process.env.MG_PROBE) {
  const [px, pz, pr = 1] = process.env.MG_PROBE.split(",").map(Number);
  const { gridLayerY } = await imp("viewer/drive/moverGround.js");
  for (let dz = -pr; dz <= pr; dz += 0.5) for (let dx = -pr; dx <= pr; dx += 0.5) {
    const x = px + dx, z = pz + dz, dk = decks.map((f) => f(x, z)).filter((v) => v != null).map((v) => v.toFixed(3));
    console.error(`${x.toFixed(1)},${z.toFixed(1)} drawn [${drawnAt(x, z).map((v) => v.toFixed(3)).join(" ")}] grid ${gridLayerY(hm, d.drive.ground, x, z, null).toFixed(3)}/${gridLayerY(hm, d.drive.ground, x, z, -1e9).toFixed(3)} decks [${dk.join(" ")}] hm+C ${(hm.surface(x, z) + CARVE).toFixed(3)} new ${moverNew(x, z, null).toFixed(3)} old ${moverOld(x, z).toFixed(3)}`);
  }
}
const counts = Object.fromEntries(KINDS.map((k) => [k, 0])), info = {}, items = [];
const inf = (k, v = 1) => { info[k] = +((info[k] || 0) + v).toFixed(2); };
const flag = (k, x, z, what, dy) => {
  const a = Math.abs(dy); inf(`${k}${dy < 0 ? "Sink" : "Float"}${a <= 0.1 ? "10cm" : a <= 0.2 ? "20cm" : "Over20cm"}`);
  const it = items.find((q) => q.k === k && q.what === what && Math.hypot(q.x - x, q.z - z) < 12);
  if (it) { it.n++; if (Math.abs(dy) > Math.abs(it.dy)) { it.dy = +dy.toFixed(3); it.at = at(x, z); } }
  else items.push({ k, x, z, at: at(x, z), what, dy: +dy.toFixed(3), n: 1 });
};

// ---- 1. traffic: every driven path, marched like a car (near = its previous height, the truth = its previous layer)
const g = d.traffic;
if (g?.xy) for (let p = 0; p < g.paths; p++) {
  const a = g.off[p], e = g.off[p + 1], what = g.kind?.[p] ? "connector" : "lane";
  let yPrev = NaN, tPrev = NaN;
  for (let k = a + 1; k < e; k++) {
    const x0 = g.xy[(k - 1) * 2], z0 = g.xy[(k - 1) * 2 + 1], x1 = g.xy[k * 2], z1 = g.xy[k * 2 + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / STEP));
    for (let s = k === a + 1 ? 0 : 1; s <= n; s++) {
      const x = x0 + (x1 - x0) * s / n, z = z0 + (z1 - z0) * s / n;
      const y = mover(x, z, yPrev); yPrev = y;
      const L = drawnAt(x, z);
      if (!L.length) { if (inTile(x, z)) inf("trafficNoDrawn"); tPrev = NaN; continue; }
      const t = nearestOf(L, tPrev === tPrev ? tPrev : y); tPrev = t;
      if (!inTile(x, z)) continue;
      inf("trafficPoints");
      const dy = y - t;
      if (Math.abs(dy) > TOL) { counts.traffic++; flag("traffic", x, z, what, dy); if (dy < 0) inf("trafficSinkM", STEP); else inf("trafficFloatM", STEP); }
      if (!OLD) { const o = moverOld(x, z) - t; if (Math.abs(o) > TOL) inf("trafficOld"); }
    }
  }
}

// ---- 2. parked cars: the four wheel contacts of every slot (viewer/cars.js wheelFit, a 1.8 x 4.4 m car)
const HB = 4.4 * 0.31, HT = Math.max(0.6, 1.8 / 2 - 0.12);
for (const s of d.parked?.sites || []) {
  if (!inTile(s.x, s.z)) continue;
  const h = s.yaw + Math.PI / 2, fx = Math.sin(h), fz = Math.cos(h), rx = fz, rz = -fx;
  let worst = 0, wOld = 0, any = false;
  for (const [u, v] of [[HB, HT], [HB, -HT], [-HB, HT], [-HB, -HT]]) {
    const x = s.x + fx * u + rx * v, z = s.z + fz * u + rz * v;
    const y = OLD ? moverOld(x, z) : moverNew(x, z, null), L = drawnAt(x, z);
    if (!L.length) continue;
    any = true;
    const t = nearestOf(L, y), dy = y - t;
    if (Math.abs(dy) > Math.abs(worst)) worst = dy;
    if (!OLD) { const o = moverOld(x, z) - nearestOf(L, moverOld(x, z)); if (Math.abs(o) > Math.abs(wOld)) wOld = o; }
  }
  if (!any) { inf("parkedNoDrawn"); continue; }
  inf("parkedSlots");
  if (Math.abs(worst) > TOL) { counts.parked++; flag("parked", s.x, s.z, "slot", worst); }
  if (!OLD && Math.abs(wOld) > TOL) inf("parkedOld");
}

// ---- 3. the trams: every tram track, the wheel seat as viewer/tramline.js railY computes it
const profFile = join(ROOT, "data/transit/tram_profile.json");
const prof = existsSync(profFile) ? makeTrackProfile(JSON.parse(readFileSync(profFile, "utf8"))) : null;
const roadOff = (x, z) => { if (!inTile(x, z)) return null; const gr = hm.ground(x, z), t = prof?.y(x, z, 2.5); return { off: hm.surface(x, z) + CARVE - gr, bridge: t != null && t - gr > 0.3 }; };
for (const l of d.feats?.lines || []) {
  if (l.kind !== "tram" || !(l.line?.length >= 2)) continue;
  let tPrev = NaN;
  for (let k = 1; k < l.line.length; k++) {
    const [x0, z0] = l.line[k - 1], [x1, z1] = l.line[k], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / TRAM_STEP));
    for (let s = k === 1 ? 0 : 1; s <= n; s++) {
      const x = x0 + (x1 - x0) * s / n, z = z0 + (z1 - z0) * s / n;
      if (!inTile(x, z)) { tPrev = NaN; continue; }
      const seat = prof?.railTop(x, z, roadOff, 1.5) ?? mover(x, z, null);
      const L = drawnAt(x, z);
      if (!L.length) { inf("tramNoDrawn"); tPrev = NaN; continue; }
      const t = nearestOf(L, tPrev === tPrev ? tPrev : seat); tPrev = t;
      inf("tramPoints");
      const dy = seat - t;
      if (Math.abs(dy) > TOL) { counts.tram++; flag("tram", x, z, "track", dy); }
      // the rails as main.js featureObjects draws them: max(hm.surface + CARVE, the rail top)
      const rail = Math.max(hm.surface(x, z) + CARVE, seat);
      if (Math.abs(rail - t) > TOL) inf("railSeatOff");
    }
  }
}
console.log(JSON.stringify({ tile: T, counts, info, items, ms: Date.now() - t0 }));
