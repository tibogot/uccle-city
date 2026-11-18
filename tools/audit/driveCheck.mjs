// DRIVE CHECK, OFFLINE (claude/drivecheck 2026-11-18; QUALITY_RULES rule 27 provisional; docs/DRIVECHECK.md). The owner,
// driving the car on the live site: "the car is blocked here behind lycee francais ... where the bridge is, its like
// everywhere its blocked" (wall colliders standing across Rue de Verrewinkel at the hero bridge). This drives every
// street of every tile headless and lists every place where a collider blocks the carriageway.
//
// Per tile, the tile worker's own build in node (viewer/tileData.js, the entry the city posts: tools/boot3/entries.json),
// then the car's colliders as the city completes them:
//   worker    buildings, kerb islands, rail fences, deck parapets, trunks (d.drive.col)
//   street    lamps + bollards (driveMode.js tileDrive), the front-garden pieces the city keeps (cityGardens.js), the
//             parked cars (soft: counted as info)
//   hero      every landmark / bridge / tunnel the city builds colliders from (viewer/heroColliders.js HERO_ROOTS with a
//             models/**/<name>.json placement): its LOD0 (the GLB's nodes without _far / _xfar / _lodN, no soft parts)
//             placed as the city places it, blocked by the city's own code (heroColliders.js layeredBlockers over
//             viewer/drive/surfaceLayers.js: the place's layers, world.decks = the tile's OSM decks + the hero road decks)
// Not here: the kits' stand-ins (furniture2 / stops / street kit / street life / fuel: made from the drawn instances,
// debug/drawnAudit.js) and the public-art / Lycee front roots (browser turn).
//
// The walk: every driven path of the tile's traffic graph (d.traffic: the lanes and junction turns the traffic sim drives,
// both directions = the whole carriageway) and every driven street's OSM centre line (viewer/streets/carriageway.js
// NOT_DRIVEN left out: footways, paths, service roads, steps), the car's body (half width 0.9 m) every 0.5 m where the path is on the
// carriageway (viewer/streets/carriageway.js lanesOnly), at the surface layer the path is on (followed along it: under a
// deck the street, on the deck the deck). A hit = a hard collider (building, wall, tree, lamp, bollard, furniture, garden
// piece) the body meets that the car does not pass over / under (colliders.js heightClear) and that reaches >= 0.3 m
// INTO the carriageway (a wall beside a narrow street the body grazes is a narrow street, counted as info). Hits are
// grouped into PLACES (one source, within 6 m). Parked cars, hedges, kerb islands: info.
//
//   node --import ./tools/road_audit/register.mjs --import ./tools/heap/register.mjs tools/audit/driveCheck.mjs
//        [--all | T ...] [--jobs N] [--old [--near Y]] [--out FILE] [--quiet] [--worst N] [--max N] [--maxhero N]
//   --set k=v  a tile entry override (--set roadTrees=false = ?roadtrees=old: LiDAR trunks on the unmeasured carriageway)
//   --old    ?heroground=old: the hero band from driveMode.ground, the layer nearest the CAR; the car's height at build
//            time is --near (default -1000: a car lower than the place, the case the owner met)
//   --maxsrc k=N,...  the gate per source kind (tree=0: no LiDAR trunk in a carriageway, viewer/streets/roadTrees.js)
//   --max N  the gate: exit 1 when the places (all sources) are above N; --maxhero N: hero places above N
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import { causeOf, CAUSES } from "./driveCause.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const SETS = []; for (let i = argv.indexOf("--set"); i >= 0; i = argv.indexOf("--set")) SETS.push(argv.splice(i, 2)[1]);
const CHILD = flag("--child"), ALL = flag("--all"), QUIET = flag("--quiet"), OLD = flag("--old");
const NEAR = +opt("--near", "-1000");
const OUT = opt("--out", null), JOBS = +opt("--jobs", Math.max(1, Math.min(4, Math.floor(os.totalmem() / 2 ** 30 / 4), os.cpus().length - 1))), WORST = +opt("--worst", 40);
const MAXP = opt("--max", null), MAXH = opt("--maxhero", null);
const MAXS = Object.fromEntries((opt("--maxsrc", "") || "").split(",").filter(Boolean).map((q) => { const [k, v] = q.split("="); return [k, +v]; }));   // per source kind: tree=0
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const TILES = ALL ? manifest.tiles.filter((t) => t.status === "built" || t.status === undefined).map((t) => t.name) : argv.map((t) => t.toUpperCase());
const CAR_HW = 0.9, STEP = 0.5, PLACE = 6;

// ---------------------------------------------------------------- the parent: tiles over child processes
if (!CHILD) {
  if (!TILES.length) { console.error("usage: driveCheck.mjs [--all | T ...] [--jobs N] [--old [--near Y]] [--out FILE] [--max N] [--maxhero N]"); process.exit(2); }
  const t0 = Date.now(), results = [], queue = TILES.slice();
  const node = ["--import", "./tools/road_audit/register.mjs", "--import", "./tools/heap/register.mjs"];
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, [...node, fileURLToPath(import.meta.url), "--child", T, ...(OLD ? ["--old", "--near", String(NEAR)] : []), ...SETS.flatMap((k) => ["--set", k])], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
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
  const errors = results.filter((r) => r.error).length, places = [], bySrc = {}, info = {};
  let metres = 0, heroes = 0, tMoved = 0, tDropped = 0;
  for (const r of results) {
    if (r.error) continue;
    heroes += r.heroes || 0; tMoved += r.roadTrees?.moved || 0; tDropped += r.roadTrees?.dropped || 0;
    for (const p of r.places) { places.push({ tile: r.tile, ...p }); metres += p.m; const k = p.src.split(" ")[0]; bySrc[k] = (bySrc[k] || 0) + 1; }
    for (const [k, v] of Object.entries(r.info || {})) info[k] = (info[k] || 0) + v;
  }
  const hero = places.filter((p) => p.src.startsWith("hero")).length;
  places.sort((a, b) => b.m - a.m);
  if (!QUIET || WORST) {
    console.log(`| tile | street | x, z | collider (source) | blocked m |\n|---|---|---|---|---|`);
    for (const p of places.slice(0, QUIET ? WORST : places.length)) console.log(`| ${p.tile} | ${p.street} | ${p.x}, ${p.z} | ${p.src} | ${p.m} |`);
  }
  console.log(`driveCheck${OLD ? ` (--old, car at ${NEAR} m when the hero colliders were built)` : ""}: tiles ${results.length - errors}${errors ? ` (+${errors} FAILED)` : ""}, hero models ${heroes}: `
    + `${places.length} places where a collider blocks the carriageway (${metres.toFixed(1)} m of path), hero ${hero}; by source: ${Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "-"} | ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // the census by CAUSE (tools/audit/driveCause.mjs)
  const cause = (p) => causeOf(p, places);
  const byCause = {};
  for (const p of places) (byCause[cause(p)] ||= []).push(p);
  const NAMES = CAUSES;
  for (const c of Object.keys(byCause).sort()) {
    const L = byCause[c], src = {}; for (const p of L) { const k = p.src.split(" ")[0]; src[k] = (src[k] || 0) + 1; }
    console.log(`  ${c} ${NAMES[c] || "?"}: ${L.length} (${Object.entries(src).map(([k, v]) => `${k} ${v}`).join(", ")}); e.g. ${L.slice(0, 3).map((p) => `${p.tile} ${p.street.split(" - ")[0]} ${p.x}, ${p.z} (${p.src})`).join(" | ")}`);
  }
  console.log(`  LiDAR trees off the drawn carriageway (roadTrees.js): moved ${tMoved}, dropped ${tDropped}`);
  console.log(`  info (not counted): ${Object.entries(info).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}`);
  if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), old: OLD, near: OLD ? NEAR : null, tiles: results.length, places: places.length, hero, metres: +metres.toFixed(1), bySrc, info, byCause: Object.fromEntries(Object.entries(byCause).map(([k, v]) => [k, v.length])), list: places.map((p) => ({ cause: cause(p), ...p })), results: results.map(({ places: _, ...r }) => r) }, null, 1));
  let fail = errors > 0;
  if (MAXP != null) { if (places.length > +MAXP) { console.log(`FAIL places: ${places.length} > ${MAXP}`); fail = true; } else console.log(`  places: ${places.length} <= ${MAXP}`); }
  if (MAXH != null) { if (hero > +MAXH) { console.log(`FAIL hero places: ${hero} > ${MAXH}`); fail = true; } else console.log(`  hero places: ${hero} <= ${MAXH}`); }
  for (const [k, n] of Object.entries(MAXS)) { const v = bySrc[k] || 0; if (v > n) { console.log(`FAIL ${k} places: ${v} > ${n}`); fail = true; } else console.log(`  ${k} places: ${v} <= ${n}`); }
  console.log(fail ? "driveCheck: FAIL" : "driveCheck: ok");
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------- the child: one tile
globalThis.location ??= { search: OLD ? "?heroground=old" : "" };
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
const { KIND, driveHeight, gather, itemContact, heightClear, addCircles, extendColliders } = await imp("viewer/drive/colliders.js");
const { surfaceLayers } = await imp("viewer/drive/surfaceLayers.js");
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway, NOT_DRIVEN } = await imp("viewer/streets/carriageway.js");
const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
const { clearRoads, restyleHedges, gardenPieces } = await imp("viewer/gardens/gardenClear.js");
const { deckHeight } = await imp("viewer/streets/bridgeDecks.js");
const { deckHeightFn, roadFrame } = await imp("viewer/rail/roadDeck.js");
const { HERO_ROOTS, carBlockersSync, layeredBlockersSync, soft } = await imp("viewer/heroColliders.js");
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const KN = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k]));

const T = TILES[0];
const t0 = Date.now();
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const m = manifest.tiles.find((t) => t.name === T);
const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false };
for (const kv of SETS) { const [k, v] = kv.split("="); entry[k] = JSON.parse(v); }
const overrides = JSON.parse(readFileSync(join(ROOT, "data/overrides.json"), "utf8"));
const realLog = console.log; console.log = () => {};
const d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
console.log = realLog;
const b = d.bounds, hm = Heightmap.from(d.hdr, d.y, d.orig), ground = d.drive.ground;
const inTile = (x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;

// ---- the hero models: name -> { glb, info } (models/**/<file>.json with a placement; the city's root names)
const HERO_FILES = { "bridge-": "rail", "tunnel-": "rail/tunnel_" };
function heroSource(name) {
  const pre = Object.keys(HERO_FILES).find((p) => name.startsWith(p));
  if (pre) { const base = join(ROOT, "models", `${HERO_FILES[pre]}${name.slice(pre.length)}`); const f = pre === "bridge-" ? join(ROOT, "models/rail", name.slice(pre.length)) : base; return { glb: f + ".glb", json: f + ".json" }; }
  for (const dir of readdirSync(join(ROOT, "models"))) {
    const f = join(ROOT, "models", dir, name);
    if (existsSync(f + ".glb") && existsSync(f + ".json")) return { glb: f + ".glb", json: f + ".json" };
  }
  return null;
}
const heroes = [];
for (const name of HERO_ROOTS) {
  const s = heroSource(name); if (!s) continue;
  const info = JSON.parse(readFileSync(s.json, "utf8")); if (!info.placement?.city_local_position) continue;
  heroes.push({ name, ...s, info });
}
// world.decks: the tile's OSM decks (main.js addBridgeDecks) + the hero road decks (main.js: deckHeightFn per road bridge)
const decks = [];
for (const dk of d.bridgeDecks || []) decks.push(Object.assign(deckHeight(dk, (x, z) => hm.ground(x, z), { drawn: true }), { osm: true }));
for (const h of heroes) if (h.info.kind === "road_over_rail") decks.push(deckHeightFn(h.info));
const layers = (x, z) => surfaceLayers(decks, hm, ground, x, z);
// a hero road deck's carriageway is its drawn roadway between the parapets (the OSM band is wider: Rue de Verrewinkel's
// 7 m band over a 4.2 m deck): a point on the deck's span within 0.5 m of a parapet's inner face is the deck's edge (the
// blockers are 0.25 m world-axis cells: on a diagonal parapet a cell reaches up to 0.35 m in from the face)
const frames = heroes.filter((h) => h.info.kind === "road_over_rail").map((h) => roadFrame(h.info));
const deckEdge = (x, z) => frames.some((F) => { const [X, Y] = F.toLocal(x, z); return X >= F.d.x0 - 0.6 && X <= F.d.x1 + 0.6 && Math.abs(Y) < 12 && Math.abs(Y) > F.faceY(X, F.d.parapet_inner) - 0.5; });
const inCarriage = (x, z, m) => lanesAt.inside(x, z, m) && !deckEdge(x, z);
// driveMode.ground as before (?heroground=old): the layer nearest the car (near = the car's height when they were built)
const carGround = (x, z) => {
  let dk = null, osm = false;
  for (const f of decks) { const y = f(x, z); if (y != null) { dk = y; osm = !!f.osm; break; } }
  const g = driveHeight(hm, ground, x, z, NEAR);
  if (dk == null) return g;
  if (osm && Math.abs(g - dk) < 1.5) return Math.max(g, dk);
  return Math.abs(g - NEAR) + 1 < Math.abs(dk - NEAR) ? g : dk;
};

// ---- the collider set as the city completes it (worker + lamps / bollards + parked cars + gardens + heroes)
const col0 = d.drive.col;
const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
const lamps = placedLampSites(d.roads, b, fit?.placeLamp).map((p) => ({ x: p.x, z: p.z, r: 0.2, kind: KIND.lamp }));
const bx = d.road.surfaceData?.bollards || [];
const posts = Array.from({ length: bx.length / 3 }, (_, i) => ({ x: bx[i * 3], z: bx[i * 3 + 2], r: 0.1, kind: KIND.post }));
const C0 = col0.C ?? col0.circ.length / 3;
addCircles(col0, [...lamps, ...posts]);
const P0 = col0.P, extra = [], src = [];
for (const c of d.parked?.sites || []) {
  const hw = 0.925, hl = 2.365, s = Math.sin(c.heading ?? c.yaw ?? 0), k = Math.cos(c.heading ?? c.yaw ?? 0);
  extra.push({ rings: [[[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([u, v]) => [c.x + u * k + v * s, c.z - u * s + v * k])], kind: KIND.car }); src.push("parked car");
}
const gPath = join(ROOT, "data/gardens", `${T}.json`);
if (existsSync(gPath)) {
  let doc = JSON.parse(readFileSync(gPath, "utf8"));
  const drivenAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null });
  const clearRings = Object.entries(overrides.plantsClear || {}).filter(([k]) => !k.startsWith("_")).map(([, v]) => v.ring);
  const inR = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const blocked = (x, z) => drivenAt.inside(x, z, 0.3) || clearRings.some((r) => inR(r, x, z));
  const rs = restyleHedges(doc, overrides.gardenRestyle, blocked); if (rs) doc = rs.doc;
  const cl = clearRoads(doc, blocked, { old: true }); if (cl) doc = cl.doc;
  for (const p of gardenPieces(doc)) { extra.push(p); src.push(p.what || "garden piece"); }
}
// the heroes within reach of the tile: their LOD0 soup (the triangles within 4 m of the tile), blocked as the city does
let nHero = 0;
const M = 4;
for (const h of heroes) {
  const [px, py, pz] = h.info.placement.city_local_position;
  if (px < b.x0 - 400 || px > b.x1 + 400 || pz < b.z0 - 400 || pz > b.z1 + 400) continue;
  const { parts } = await readGlb(h.glb);
  const ry = h.info.placement.rotation_y_rad, c = Math.cos(ry), s = Math.sin(ry);
  const tri = [];
  for (const p of parts) {
    if (/_(far|xfar|lod\d)$/i.test(p.name) || soft({ name: p.node || p.name, material: { name: p.slot } })) continue;
    const I = p.index, P = p.positions, n = I ? I.length : P.length / 3;
    for (let q = 0; q + 2 < n; q += 3) {
      const w = [];
      for (let e = 0; e < 3; e++) { const v = I ? I[q + e] : q + e, x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; w.push(px + x * c + z * s, py + y, pz - x * s + z * c); }
      const cx = (w[0] + w[3] + w[6]) / 3, cz = (w[2] + w[5] + w[8]) / 3;
      if (cx < b.x0 - M || cx > b.x1 + M || cz < b.z0 - M || cz > b.z1 + M) continue;
      for (const v of w) tri.push(v);
    }
  }
  if (!tri.length) continue;
  nHero++;
  const Tz = Float32Array.from(tri);
  const polys = OLD ? carBlockersSync(Tz, carGround) : layeredBlockersSync(Tz, layers);
  for (const p of polys) { extra.push(p); src.push(`hero ${h.name}`); }
}
const col = extendColliders(col0, extra, []);
const what = (id) => { if (id >= col.P) return `${KN[col.ckind[id - col.P]]} (${id - col.P < C0 ? "worker" : "street"})`; if (id >= P0) return src[id - P0]; return `${KN[col.pkind[id]]} (worker)`; };

// ---- names: the nearest named OSM road
const RN = [];
{ const N = new Map(d.roads.nodes.map((n) => [n.id, n])); for (const r of d.roads.roads) { const nm = r.name || r.meta?.name; if (!nm) continue; const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean); for (const p of pts) RN.push([p.x ?? p[0], p.z ?? p[1], nm]); } }
const near = (x, z) => { let best = null, bd = 60; for (const [px, pz, nm] of RN) { const dd = Math.hypot(px - x, pz - z); if (dd < bd) { bd = dd; best = nm; } } return best || "(no named road within 60 m)"; };

// ---- the walk
const lanesAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null, lanesOnly: true });
const HARD = new Set([KIND.building, KIND.wall, KIND.tree, KIND.lamp, KIND.post, KIND.furniture]);
const contact = {}, out = [], hits = new Map(), info = {};
const intrudeMemo = new Map();
function intrudes(id) {
  if (intrudeMemo.has(id)) return intrudeMemo.get(id);
  let r = false;
  if (id >= col.P) { const q = (id - col.P) * 3; r = inCarriage(col.circ[q], col.circ[q + 1], Math.max(0, 0.3 - col.circ[q + 2])); }
  else for (let ri = col.polyRing[id]; ri < col.polyRing[id + 1] && !r; ri++) {
    const s0 = col.ringStart[ri], s1 = col.ringStart[ri + 1];
    for (let i = s0; i < s1 && !r; i++) {
      const j = i + 1 < s1 ? i + 1 : s0, ax = col.pts[i * 2], az = col.pts[i * 2 + 1], bx2 = col.pts[j * 2], bz = col.pts[j * 2 + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, bz - az) / 0.2));
      for (let t = 0; t < n && !r; t++) r = inCarriage(ax + (bx2 - ax) * t / n, az + (bz - az) * t / n, 0.3);
    }
  }
  intrudeMemo.set(id, r);
  return r;
}
const tr = d.traffic;
// the paths: every driven lane / junction turn of the traffic graph, and every driven street's OSM centre line
const paths = [];
const pkind = [];          // per path: "lane", "turn" (a junction connector), "centre" (an OSM centre line)
if (tr?.xy) for (let p = 0; p + 1 < tr.off.length; p++) { const l = []; for (let i = tr.off[p]; i < tr.off[p + 1]; i++) l.push(tr.xy[i * 2], tr.xy[i * 2 + 1]); paths.push(l); pkind.push(tr.kind[p] ? "turn" : "lane"); }
const nLanes = paths.length;
{ const N = new Map(d.roads.nodes.map((n) => [n.id, n]));
  for (const r of d.roads.roads) { if (NOT_DRIVEN.has(r.meta?.highway)) continue; const l = []; for (const p of [N.get(r.a), ...(r.pts || []), N.get(r.b)]) if (p) l.push(p.x ?? p[0], p.z ?? p[1]); if (l.length >= 4) { paths.push(l); pkind.push("centre"); } } }
let lanes = 0, laneM = 0;
for (const [pi, P] of paths.entries()) {
  lanes++;
  let yPrev = NaN;
  for (let s = 1; s < P.length / 2; s++) {
    const ax = P[(s - 1) * 2], az = P[(s - 1) * 2 + 1], bx2 = P[s * 2], bz = P[s * 2 + 1], L = Math.hypot(bx2 - ax, bz - az);
    if (L < 1e-6) continue;
    const ux = (bx2 - ax) / L, uz = (bz - az) / L, n = Math.max(1, Math.round(L / STEP));
    const body = { hx: CAR_HW, hz: L / n / 2, cos: uz, sin: ux };
    for (let j = 0; j < n; j++) {
      const x = ax + ux * (j + 0.5) * L / n, z = az + uz * (j + 0.5) * L / n;
      // the layer the path is on: followed along it (a street under a deck stays under it)
      const ly = layers(x, z);
      const y = Number.isFinite(ly.low) && Number.isFinite(yPrev) && Math.abs(ly.low - yPrev) < Math.abs(ly.top - yPrev) ? ly.low : ly.top;
      yPrev = y;
      if (!inTile(x, z) || !lanesAt.inside(x, z, 0)) continue;
      laneM += L / n;
      out.length = 0; gather(col, x, z, CAR_HW + 3, out);
      for (let q = 1; q < out.length; q += 2) {
        const id = out[q];
        if (heightClear(col, id, y)) continue;
        if (id < col.P && col.ptop[id] < 1e3 && col.ptop[id] < y + 0.3) continue;      // under the car band (a kerb-high piece)
        if (!itemContact(col, id, x, z, body, contact)) continue;
        const k = id < col.P ? col.pkind[id] : col.ckind[id - col.P];
        if (!HARD.has(k)) { const key = `soft ${what(id)}`; info[key] = (info[key] || 0) + 1; continue; }
        if (!intrudes(id)) { const key = `edge ${what(id)}`; info[key] = (info[key] || 0) + 1; continue; }
        const h = hits.get(id); if (h) { h.n++; h.paths.add(pkind[pi]); } else hits.set(id, { n: 1, x, z, paths: new Set([pkind[pi]]) });
      }
    }
  }
}
// per collider, for the census by cause (docs/DRIVECHECK.md "Census"): where its footprint meets the carriageway
// (`meas`: on a MEASURED roadway / tram road (UrbIS street surfaces) or only inside the OSM band where none is measured),
// how deep (`depth`: the largest of 0.3 / 0.6 / 1 / 1.5 / 2.5 m it reaches in), the measured class under its centre
// (`cls`: viewer/surfaces.js SURF_CLASS, -1 none) and its size (`r`: circle radius, else the bbox's short side)
const DEPTHS = [0.3, 0.6, 1, 1.5, 2.5];
function anatomy(id) {
  const pts = [];
  let cx, cz, r;
  if (id >= col.P) { const q = (id - col.P) * 3; cx = col.circ[q]; cz = col.circ[q + 1]; r = col.circ[q + 2]; for (let a = 0; a < 12; a++) pts.push([cx + Math.cos(a / 12 * 6.283) * r, cz + Math.sin(a / 12 * 6.283) * r]); pts.push([cx, cz]); }
  else {
    const q = id * 4; cx = (col.pbox[q] + col.pbox[q + 2]) / 2; cz = (col.pbox[q + 1] + col.pbox[q + 3]) / 2; r = Math.min(col.pbox[q + 2] - col.pbox[q], col.pbox[q + 3] - col.pbox[q + 1]);
    for (let ri = col.polyRing[id]; ri < col.polyRing[id + 1]; ri++) { const s0 = col.ringStart[ri], s1 = col.ringStart[ri + 1];
      for (let i = s0; i < s1; i++) { const j = i + 1 < s1 ? i + 1 : s0, ax = col.pts[i * 2], az = col.pts[i * 2 + 1], bx2 = col.pts[j * 2], bz = col.pts[j * 2 + 1], n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, bz - az) / 0.2));
        for (let t = 0; t < n; t++) pts.push([ax + (bx2 - ax) * t / n, az + (bz - az) * t / n]); } }
  }
  let depth = 0, meas = false;
  for (const [x, z] of pts) for (const m of DEPTHS) { if (m <= depth || !inCarriage(x, z, m)) continue; depth = m; if (fit?.classAt && fit.classAt(x, z) >= 0) meas = true; }
  return { cls: fit?.classAt ? fit.classAt(cx, cz) : -1, depth, meas, r: +r.toFixed(2) };
}
// places: hits of one source within PLACE m of each other (a hero's 0.25 m rects, a run of garden wall)
const places = [];
for (const [id, h] of hits) {
  const s = what(id);
  let p = places.find((q) => q.src === s && Math.hypot(q.x - h.x, q.z - h.z) < PLACE);
  if (!p) places.push(p = { src: s, x: h.x, z: h.z, n: 0, ids: 0, paths: new Set(), depth: 0, meas: false, cls: new Set(), r: 0 });
  p.n += h.n; p.ids++;
  for (const k of h.paths) p.paths.add(k);
  const a = anatomy(id); p.depth = Math.max(p.depth, a.depth); p.meas ||= a.meas; p.cls.add(a.cls); p.r = Math.max(p.r, a.r);
}
console.log(JSON.stringify({ tile: T, ms: Date.now() - t0, heroes: nHero, roadTrees: d.drive.counts?.roadTrees ?? null, lanes: nLanes, centrelines: lanes - nLanes, pathM: Math.round(laneM),
  places: places.map((p) => ({ street: near(p.x, p.z), x: +p.x.toFixed(1), z: +p.z.toFixed(1), src: p.src, m: +(p.n * STEP).toFixed(1), colliders: p.ids,
    paths: [...p.paths].sort(), depth: p.depth, meas: p.meas, cls: [...p.cls].sort(), r: p.r })), info }));
process.exit(0);
