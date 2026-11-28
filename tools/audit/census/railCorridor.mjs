// CENSUS class T, THE RAIL CORRIDOR (claude/rail 2026-11-19, rule 39, docs/RAIL_T.md). Owner playtests 2026-11-18 / 19:
// the car sank into the ballast at Verrewinkel, drove onto the Stalle viaduct and was walled in there, the line's fences
// "blocky / low-poly", panels stepping on the cutting's slopes. Every tile the railway crosses, the tile worker's own
// build in node (viewer/tileData.js, the entry the city posts: tools/boot3/entries.json), then:
//
//   bedSink     metres of track on the ground (not on a rail bridge, not in a tunnel) where the drive surface the car
//               finds at the rail's level (driveHeight near the rail top) is more than 0.25 m under the rail top at the
//               centre or under a rail (the car in the ballast, the rails through its wheels)
//   openReach   metres of track bed a car reaches from a street: a flood fill over the 1 m drive grid (45 m round the
//               line) from every drawn street at its own level, as the car moves (no rise > 0.45 m between cells, no
//               hard collider: fence, building, hero model, wall, swept at the car's centre and 0.8 m either side). A level crossing (railData.js railCrossings: the road at the line's level) is open by design:
//               the bed within its road's half width + 2 m is not counted (info: levelOpen)
//   fenceGap    fence metres where the drawn panel's foot (the wire mesh, 5 cm over the panel line) floats > 0.15 m over
//               the drawn ground under it
//   postFloat   fence posts whose foot (the strip's bottom at the post) is over the drawn ground (> 2 cm)
//   fenceStep   fence bays (post to post) whose top rail is not straight: > 3 cm off the line between the bay's two post
//               tops (the panel kinks / steps), or a step in the rail at a post (> 1 cm between the two bays)
//   fenceGhost  fence-wall metres whose car collider reaches > 0.5 m over the drawn fence top, or > 2 m under its foot
//               where a car's surface lies under it (a road / a bore under the embankment)
//   onRail      (tools/audit/census/streetProps.mjs: onRail / inHero) the data layers' props on a track bed
//
//   node --import ./tools/road_audit/register.mjs --import ./tools/heap/register.mjs tools/audit/census/railCorridor.mjs
//        [--all | T ...] [--jobs N] [--old] [--out FILE] [--quiet] [--worst N] [--max k=v,...]
//   --old   ?rail=old (entry.railT false): the corridor as before
//   RAILPATH=1 (env, with --child T): print the way the flood took from a street onto the first bed metre it reached
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const CHILD = flag("--child"), ALL = flag("--all"), QUIET = flag("--quiet"), OLD = flag("--old");
const OUT = opt("--out", null), JOBS = +opt("--jobs", Math.max(1, Math.min(4, Math.floor(os.totalmem() / 2 ** 30 / 4), os.cpus().length - 1))), WORST = +opt("--worst", 12);
const MAX = opt("--max", null);
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const KEYS = ["bedSink", "openReach", "fenceGap", "postFloat", "fenceStep", "fenceGhost"];

// ---------------------------------------------------------------- the parent
if (!CHILD) {
  const { prepRail, tracksIn } = await imp("viewer/rail/railData.js");
  const doc = prepRail(JSON.parse(readFileSync(join(ROOT, "data/rail/rail.json"), "utf8")));
  const built = manifest.tiles.filter((t) => t.status === "built" || t.status === undefined);
  const railTiles = built.filter((t) => tracksIn(doc, { x0: t.bounds.x[0], x1: t.bounds.x[1], z0: t.bounds.z[0], z1: t.bounds.z[1] }, 1).length).map((t) => t.name);
  const TILES = ALL ? railTiles : argv.map((t) => t.toUpperCase());
  if (!TILES.length) { console.error("usage: railCorridor.mjs [--all | T ...] [--old] [--max k=v,...]"); process.exit(2); }
  const t0 = Date.now(), results = [], queue = TILES.slice();
  const node = ["--import", "./tools/road_audit/register.mjs", "--import", "./tools/heap/register.mjs"];
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, [...node, fileURLToPath(import.meta.url), "--child", T, ...(OLD ? ["--old"] : [])], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
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
  const sum = Object.fromEntries(KEYS.map((k) => [k, 0])), info = {}, items = [];
  for (const r of results) {
    if (r.error) continue;
    for (const k of KEYS) sum[k] += r.counts[k] || 0;
    for (const [k, v] of Object.entries(r.info || {})) info[k] = +((info[k] || 0) + v).toFixed(1);
    for (const it of r.items) items.push({ tile: r.tile, ...it });
  }
  for (const k of KEYS) sum[k] = Math.round(sum[k]);
  const errors = results.filter((r) => r.error).length;
  if (!QUIET || WORST) {
    console.log("| tile | check | x, z | what | size |\n|---|---|---|---|---|");
    const by = {}; for (const it of items) (by[it.k] ||= []).push(it);
    for (const k of KEYS) for (const it of (by[k] || []).sort((a, b) => b.n - a.n).slice(0, QUIET ? Math.min(WORST, 4) : WORST)) console.log(`| ${it.tile} | ${it.k} | ${it.at} | ${it.what} | ${it.n} |`);
  }
  console.log(`railCorridor${OLD ? " (--old, ?rail=old)" : ""}: tiles ${results.length - errors}${errors ? ` (+${errors} FAILED)` : ""}: ${KEYS.map((k) => `${k} ${sum[k]}`).join(", ")} | ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  info: ${Object.entries(info).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), old: OLD, tiles: results.length, sum, info, items, results: results.map(({ items: _, ...r }) => r) }, null, 1));
  let fail = errors > 0;
  if (MAX) for (const kv of MAX.split(",")) { const [k, v] = kv.split("="), n = sum[k] ?? 0; if (n > +v) { console.log(`FAIL ${k}: ${n} > ${v}`); fail = true; } else console.log(`  ${k}: ${n} <= ${v}`); }
  console.log(fail ? "railCorridor: FAIL" : "railCorridor: ok");
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------- the child: one tile
globalThis.location ??= { search: OLD ? "?rail=old" : "" };
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(String(u));
  if (url.protocol !== "file:") return nodeFetch(u, o);
  try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
};
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
const { tileData: buildTileData } = await imp("tools/gate/tileBuild.mjs");     // (the worker build through the gate tile cache, rule tile-cache)
const { Heightmap } = await imp("viewer/heightmap.js");
const { KIND, driveHeight, gather, heightClear, extendColliders, inRing2 } = await imp("viewer/drive/colliders.js");
const { surfaceLayers } = await imp("viewer/drive/surfaceLayers.js");
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway } = await imp("viewer/streets/carriageway.js");
const { deckHeight } = await imp("viewer/streets/bridgeDecks.js");
const { deckHeightFn } = await imp("viewer/rail/roadDeck.js");
const { prepRail, tracksIn, heroBridgeNames, railBridgeRings, railCrossings, heroFrame, RAIL_C, POST_STEP } = await imp("viewer/rail/railData.js");
const { HERO_ROOTS, layeredBlockersSync, soft } = await imp("viewer/heroColliders.js");
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");

const T = argv[0].toUpperCase();
const t0 = Date.now();
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const m = manifest.tiles.find((t) => t.name === T);
const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false, ...(OLD ? { railT: false } : {}) };
const realLog = console.log; console.log = () => {};
const d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
console.log = realLog;
const b = d.bounds, hm = Heightmap.from(d.hdr, d.y, d.orig), ground = d.drive.ground;
const inTile = (x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
const rail = prepRail(JSON.parse(readFileSync(join(ROOT, "data/rail/rail.json"), "utf8")));
const heroNotes = heroBridgeNames(true).map((n) => { const f = join(ROOT, "models/rail", `${n}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; }).filter(Boolean);

// ---- the car's world as the city completes it: the worker's colliders + every hero model's LOD0 blockers (as driveCheck)
const decks = [];
for (const dk of d.bridgeDecks || []) decks.push(Object.assign(deckHeight(dk, (x, z) => hm.ground(x, z), { drawn: true }), { osm: true }));
for (const h of heroNotes) if (h.kind === "road_over_rail") decks.push(deckHeightFn(h));
const layers = (x, z) => surfaceLayers(decks, hm, ground, x, z);
const extra = [];
const HERO_FILES = { "bridge-": "rail", "tunnel-": "rail/tunnel_" };
for (const name of HERO_ROOTS) {
  const pre = Object.keys(HERO_FILES).find((p) => name.startsWith(p));
  let glb = null, js = null;
  if (pre) { const f = pre === "bridge-" ? join(ROOT, "models/rail", name.slice(pre.length)) : join(ROOT, "models", `${HERO_FILES[pre]}${name.slice(pre.length)}`); glb = f + ".glb"; js = f + ".json"; }
  else for (const dir of readdirSync(join(ROOT, "models"))) { const f = join(ROOT, "models", dir, name); if (existsSync(f + ".glb") && existsSync(f + ".json")) { glb = f + ".glb"; js = f + ".json"; break; } }
  if (!glb || !existsSync(glb) || !existsSync(js)) continue;
  const info = JSON.parse(readFileSync(js, "utf8")); if (!info.placement?.city_local_position) continue;
  const [px, py, pz] = info.placement.city_local_position;
  if (px < b.x0 - 400 || px > b.x1 + 400 || pz < b.z0 - 400 || pz > b.z1 + 400) continue;
  const { parts } = await readGlb(glb);
  const ry = info.placement.rotation_y_rad, c = Math.cos(ry), s = Math.sin(ry), tri = [];
  for (const p of parts) {
    if (/_(far|xfar|lod\d)$/i.test(p.name) || soft({ name: p.node || p.name, material: { name: p.slot } })) continue;
    const I = p.index, P = p.positions, n = I ? I.length : P.length / 3;
    for (let q = 0; q + 2 < n; q += 3) {
      const w = [];
      for (let e = 0; e < 3; e++) { const v = I ? I[q + e] : q + e; w.push(px + P[v * 3] * c + P[v * 3 + 2] * s, py + P[v * 3 + 1], pz - P[v * 3] * s + P[v * 3 + 2] * c); }
      const cx = (w[0] + w[3] + w[6]) / 3, cz = (w[2] + w[5] + w[8]) / 3;
      if (cx < b.x0 - 20 || cx > b.x1 + 20 || cz < b.z0 - 20 || cz > b.z1 + 20) continue;
      for (const v of w) tri.push(v);
    }
  }
  if (tri.length) for (const p of layeredBlockersSync(Float32Array.from(tri), layers)) extra.push(p);
}
const col = extendColliders(d.drive.col, extra, []);
const HARD = new Set([KIND.building, KIND.wall, KIND.tree, KIND.lamp, KIND.post, KIND.furniture, KIND.hedgeWall]);   // (hedgeWall: rule hedge-wall)
const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
const lanesAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null, lanesOnly: true });

const counts = Object.fromEntries(KEYS.map((k) => [k, 0])), info = {}, items = [];
const addItem = (k, x, z, what, n) => {
  const it = items.find((q) => q.k === k && q.what === what && Math.hypot(q.x - x, q.z - z) < 15);
  if (it) it.n = +(it.n + n).toFixed(1); else items.push({ k, x, z, at: `${x.toFixed(1)}, ${z.toFixed(1)}`, what, n: +n.toFixed(1) });
};
const inf = (k, v) => { info[k] = +((info[k] || 0) + v).toFixed(1); };

// ---- 1. bedSink + 4. openReach: along every track on the ground, every metre
const rb = railBridgeRings(rail, heroNotes);
const onRailBridge0 = (x, z) => rb.some((q) => x >= q.x0 - 3 && x <= q.x1 + 3 && z >= q.z0 - 3 && z <= q.z1 + 3 && inRing2(q.ring, x, z));
// (+ 2 m: the bridge's end, where the 1 m drive grid blends the bed into the ground under the deck)
const onRailBridge = (x, z) => [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dz]) => onRailBridge0(x + dx, z + dz));
const crossings = railCrossings(rail, b, d.roads, (x, z) => hm.ground(x, z), 40, heroNotes).filter((c) => c.kind === "level");
const nearLevel = (x, z) => crossings.some((c) => c.segs.some((s) => { const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)); return Math.hypot(x - s[0] - dx * u, z - s[1] - dz * u) < c.half + 2; }));
info.levelCrossings = crossings.length;
const out = [];
/** a hard collider at (x, z) a car at height y meets */
const solidAt = (x, z, y) => {
  out.length = 0; gather(col, x, z, 0.3, out);
  for (let q = 1; q < out.length; q += 2) {
    const id = out[q];
    const k = id < col.P ? col.pkind[id] : col.ckind[id - col.P];
    if (!HARD.has(k) || heightClear(col, id, y)) continue;
    if (id < col.P) { for (let r = col.polyRing[id]; r < col.polyRing[id + 1]; r++) { const ring = []; for (let i = col.ringStart[r]; i < col.ringStart[r + 1]; i++) ring.push([col.pts[i * 2], col.pts[i * 2 + 1]]); if (inRing2(ring, x, z)) return true; } }
    else { const c3 = (id - col.P) * 3; if (Math.hypot(x - col.circ[c3], z - col.circ[c3 + 1]) < col.circ[c3 + 2] + 0.05) return true; }
  }
  return false;
};
/** thin walls (a fence ring is 0.12 m wide): a step crossing any wall's edge also blocks */
const crossesWall = (ax, az, bx, bz, y) => {
  out.length = 0; gather(col, (ax + bx) / 2, (az + bz) / 2, 0.5, out);
  for (let q = 1; q < out.length; q += 2) {
    const id = out[q]; if (id >= col.P) continue;
    const k = col.pkind[id]; if (!HARD.has(k) || heightClear(col, id, y)) continue;
    for (let r = col.polyRing[id]; r < col.polyRing[id + 1]; r++) {
      const s0 = col.ringStart[r], s1 = col.ringStart[r + 1];
      for (let i = s0; i < s1; i++) {
        const j = i + 1 < s1 ? i + 1 : s0, cx = col.pts[i * 2], cz = col.pts[i * 2 + 1], dx = col.pts[j * 2], dz = col.pts[j * 2 + 1];
        const d1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax), d2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax), d3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx), d4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
        if (d1 * d2 < 0 && d3 * d4 < 0) return true;
      }
    }
  }
  return false;
};
// the road over a hero road bridge, anywhere in its footprint (the OSM band is wider than the deck: beside the parapets it
// is the same street, 7 m over the cutting)
const roadHeroes = heroNotes.filter((h) => h.kind === "road_over_rail").map(heroFrame);
const heroRoad = (x, z) => { for (const h of roadHeroes) { if (!inRing2(h.ring, x, z)) continue; const [X] = h.toLocal(x, z), dk = h.deck, xc = Math.max(dk.x0, Math.min(dk.x1, X)); return dk.road_ends[0] + (xc - dk.x0) * (dk.road_ends[1] - dk.road_ends[0]) / (dk.x1 - dk.x0); } return null; };
// (the OSM band of a street over the line overhangs the cutting beside its deck: a "street" point on the ballast is the bed)
const ballast = [];
for (const t of tracksIn(rail, b, 20)) for (let i = 1; i < t.pts.length; i++) ballast.push([t.pts[i - 1][0], t.pts[i - 1][2], t.pts[i][0], t.pts[i][2]]);
const onBallast = (x, z) => ballast.some((q) => { if (Math.min(q[0], q[2]) > x + 3 || Math.max(q[0], q[2]) < x - 3 || Math.min(q[1], q[3]) > z + 3 || Math.max(q[1], q[3]) < z - 3) return false; const dx = q[2] - q[0], dz = q[3] - q[1], L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - q[0]) * dx + (z - q[1]) * dz) / L2)); return Math.hypot(x - q[0] - dx * u, z - q[1] - dz * u) < 2.75; });
// a street DRAWN here at the car's level: the road engine's pieces (viewer/drive/colliders.js driveGround over the road
// parts alone, before the railway's bed joins the drive grid)
const { driveGround } = await imp("viewer/drive/colliders.js");
const roadOnly = driveGround(hm, d.road.parts);
const streetHere = (x, z, y) => {
  const H = hm.h, c = Math.round((x - H.x0) / H.step), r = Math.round((z - H.z0) / H.step);
  if (c < 0 || r < 0 || c >= H.cols || r >= H.rows) return false;
  const k = r * H.cols + c, v = roadOnly.delta[k], v2 = roadOnly.delta2[k];
  return (v > 0 && Math.abs(hm.y[k] + v / 100 - y) < 1) || (v2 !== 65535 && Math.abs(hm.y[k] + v2 / 100 - y) < 1);
};
// 4. THE FLOOD: from every drawn street cell at its own level, over the 1 m drive grid within CORR m of the line, as the
// car moves (carEnv.js stepContact: a rise > 0.3 m over 0.7 m is a wall; here > 0.45 m between 1 m cells, either way:
// a 1:1.5 bank is driven, a retaining wall is not), stopped by every hard collider (a cell inside it, or a move across a
// thin wall's edge: the fences). reached[k] = 1: a car gets here from a street.
const CORR = 45, H = hm.h, NC = H.cols, NR = H.rows;
const corridor = new Uint8Array(NC * NR);
for (const t of tracksIn(rail, b, CORR)) for (let i = 1; i < t.pts.length; i++) {
  const A = t.pts[i - 1], B = t.pts[i];
  const c0 = Math.max(0, Math.floor((Math.min(A[0], B[0]) - CORR - H.x0) / H.step)), c1 = Math.min(NC - 1, Math.ceil((Math.max(A[0], B[0]) + CORR - H.x0) / H.step));
  const r0 = Math.max(0, Math.floor((Math.min(A[2], B[2]) - CORR - H.z0) / H.step)), r1 = Math.min(NR - 1, Math.ceil((Math.max(A[2], B[2]) + CORR - H.z0) / H.step));
  const dx = B[0] - A[0], dz = B[2] - A[2], L2 = dx * dx + dz * dz || 1e-9;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const x = H.x0 + c * H.step, z = H.z0 + r * H.step, u = Math.max(0, Math.min(1, ((x - A[0]) * dx + (z - A[2]) * dz) / L2)); if (Math.hypot(x - A[0] - dx * u, z - A[2] - dz * u) < CORR) corridor[r * NC + c] = 1; }
}
const cellY = new Float32Array(NC * NR).fill(NaN), reached = new Uint8Array(NC * NR), queue = [];
// (inside the tile: a fence line runs 4 m past the tile's edge and the neighbour's carries on; the flood must not go round
// its end through the grid's margin)
for (let k = 0; k < NC * NR; k++) { const c = k % NC, r = (k - c) / NC; if (!inTile(H.x0 + c * H.step, H.z0 + r * H.step)) corridor[k] = 0; }
const parent = new Int32Array(NC * NR).fill(-1);
for (let k = 0; k < NC * NR; k++) {
  if (!corridor[k]) continue;
  const c = k % NC, r = (k - c) / NC, x = H.x0 + c * H.step, z = H.z0 + r * H.step;
  if (onBallast(x, z) || !lanesAt.inside(x, z, 0)) continue;
  const v = roadOnly.delta[k];
  if (!(v > 0)) continue;
  const y = hm.y[k] + v / 100;
  let dk = null; for (const f of decks) { const q = f(x, z); if (q != null) { dk = q; break; } } dk ??= heroRoad(x, z);
  if (dk != null && Math.abs(dk - y) > 1) continue;                 // (the plan band over a cutting, not this level)
  if (solidAt(x, z, y)) continue;
  reached[k] = 1; cellY[k] = y; queue.push(k);
}
info.streetSeeds = queue.length;
for (let qi = 0; qi < queue.length; qi++) {
  const k = queue[qi], c = k % NC, r = (k - c) / NC, x = H.x0 + c * H.step, z = H.z0 + r * H.step, y = cellY[k];
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= NC || rr >= NR) continue;
    const kk = rr * NC + cc; if (reached[kk] || !corridor[kk]) continue;
    const xx = H.x0 + cc * H.step, zz = H.z0 + rr * H.step, yy = driveHeight(hm, ground, xx, zz, y);
    // (the car's body, 1.8 m wide: the move is swept at its centre and at 0.8 m either side; a gap a cell slips through
    // between a platform's end and a fence post is not a way in)
    const ox = -dr * 0.8, oz = dc * 0.8;
    if (Math.abs(yy - y) > 0.45 || solidAt(xx, zz, yy) || solidAt(xx + ox, zz + oz, yy) || solidAt(xx - ox, zz - oz, yy)
      || crossesWall(x, z, xx, zz, Math.min(y, yy)) || crossesWall(x + ox, z + oz, xx + ox, zz + oz, Math.min(y, yy)) || crossesWall(x - ox, z - oz, xx - ox, zz - oz, Math.min(y, yy))) continue;
    reached[kk] = 1; cellY[kk] = yy; parent[kk] = k; queue.push(kk);
  }
}
const reachedAt = (x, z, y) => { const c = Math.round((x - H.x0) / H.step), r = Math.round((z - H.z0) / H.step); if (c < 0 || r < 0 || c >= NC || r >= NR) return false; const k = r * NC + c; return !!reached[k] && Math.abs(cellY[k] - y) < 0.6; };
for (const t of tracksIn(rail, b, 1)) {
  if (t.bridge || t.tunnel) continue;
  for (let i = 1; i < t.pts.length; i++) {
    const A = t.pts[i - 1], B = t.pts[i], L = Math.hypot(B[0] - A[0], B[2] - A[2]);
    if (L < 1e-6) continue;
    const nx = -(B[2] - A[2]) / L, nz = (B[0] - A[0]) / L;
    for (let s = 0.5; s < L; s += 1) {
      const f = s / L, x = A[0] + (B[0] - A[0]) * f, z = A[2] + (B[2] - A[2]) * f, rt = A[1] + (B[1] - A[1]) * f;
      // (on the ground: not on a rail bridge, not in a covered box, not on a structure the footprints miss: the drawn ground
      // > 2.5 m under the rail top, as railData.js railFences2 tells a structure)
      if (!inTile(x, z) || onRailBridge(x, z) || hm.ground(x, z) - rt >= 3 || hm.surface(x, z) < rt - 2.5) continue;
      // 1. the drive surface at the rail's level, at the centre and under both rails
      let sink = 0;
      for (const u of [0, -RAIL_C, RAIL_C]) { const y = driveHeight(hm, ground, x + nx * u, z + nz * u, rt); sink = Math.max(sink, rt - y); }
      if (sink > 0.25) { counts.bedSink += 1; addItem("bedSink", x, z, `drive surface ${sink.toFixed(2)} m under the rail top (${t.ref || t.id})`, 1); }
      // 4. can a car get here from a street?
      if ((Math.round(s) + i) % 2) continue;                        // (every 2 m)
      if (nearLevel(x, z)) { inf("levelOpen m", 2); continue; }
      if (reachedAt(x, z, rt) && process.env.RAILPATH && !globalThis.__pathShown) { globalThis.__pathShown = 1; let k = Math.round((z - H.z0) / H.step) * NC + Math.round((x - H.x0) / H.step); const chain = []; for (let n = 0; k >= 0 && n < 100000; n++, k = parent[k]) chain.push(`${(H.x0 + (k % NC) * H.step).toFixed(0)},${(H.z0 + Math.floor(k / NC) * H.step).toFixed(0)}:${cellY[k].toFixed(1)}`); console.error("path from the street:", chain.reverse().join(" ")); }
      if (reachedAt(x, z, rt)) { counts.openReach += 2; addItem("openReach", x, z, `the track bed reached by car from a street (${t.ref || t.id})`, 2); }
    }
  }
}

// ---- 2. the drawn fence (d.rail.fences: quads foot a, foot b, top b / foot a, top b, top a)
const F = d.rail?.fences;
const fenceTops = [];                                               // [x, z, footY, topY] at 0.25 m: the drawn fence (for 3.)
if (F) {
  const P = F.position, S = F.aS, H = F.aH, nq = P.length / 18;
  const V = (q, k) => { const o = (q * 6 + k) * 3, h = H[q * 6 + k]; return { x: P[o], y: P[o + 1], z: P[o + 2], s: S[q * 6 + k], h }; };
  let bay = null;                                                   // the current bay: { s0, y0 (top at s0), tops: [[s, y]] }
  const closeBay = (s1, y1) => {
    if (!bay) return;
    let dev = 0;
    for (const [s, y] of bay.tops) { const f = (s - bay.s0) / ((s1 - bay.s0) || 1); dev = Math.max(dev, Math.abs(y - (bay.y0 + (y1 - bay.y0) * f))); }
    if (dev > 0.03) { counts.fenceStep++; addItem("fenceStep", bay.x, bay.z, "a panel's top rail kinks / steps (> 3 cm off its posts' line)", 1); }
  };
  let prevEnd = null;
  for (let q = 0; q < nq; q++) {
    const a = V(q, 0), bb = V(q, 1), tb = V(q, 2), ta = V(q, 5);
    const cont = prevEnd && Math.hypot(prevEnd.x - a.x, prevEnd.z - a.z) < 1e-3 && Math.abs(prevEnd.s - a.s) < 1e-3;
    if (!cont) { bay = null; }
    else if (Math.abs(prevEnd.top - ta.y) > 0.01) { counts.fenceStep++; addItem("fenceStep", a.x, a.z, "a step in the top rail between two pieces", 1); }
    const L = Math.hypot(bb.x - a.x, bb.z - a.z);
    const n = Math.max(1, Math.ceil(L / 0.25));
    for (let k = 0; k <= n; k++) {
      const f = k / n, x = a.x + (bb.x - a.x) * f, z = a.z + (bb.z - a.z) * f, s = a.s + (bb.s - a.s) * f;
      const foot = a.y + (bb.y - a.y) * f, hf = a.h + (bb.h - a.h) * f, top = ta.y + (tb.y - ta.y) * f;
      const panelFoot = foot + (0.05 - hf), g = hm.surface(x, z);
      if (k < n) { if (panelFoot - g > 0.15) { counts.fenceGap += L / n; addItem("fenceGap", x, z, "the panel floats over the ground", L / n); } fenceTops.push([x, z, foot, top]); }
      // posts: where aS crosses a multiple of POST_STEP
      const post = Math.abs(s / POST_STEP - Math.round(s / POST_STEP)) * POST_STEP < Math.max(1e-3, (bb.s - a.s) / n / 2) && (k < n || !cont);
      if (post && k < n) {
        if (foot - g > 0.02) { counts.postFloat++; addItem("postFloat", x, z, "a post's foot over the ground", 1); }
        inf("posts", 1);
        if (bay && cont) closeBay(s, top);
        bay = { s0: s, y0: top, x, z, tops: [] };
      } else if (bay) bay.tops.push([s, top]);
    }
    prevEnd = { x: bb.x, z: bb.z, s: bb.s, top: tb.y };
    inf("fence m", L);
  }
}

// ---- 3. fenceGhost: the fence walls (worker KIND.wall polygons standing on the drawn fence) vs the drawn fence
if (fenceTops.length) {
  const G = new Map(), key = (x, z) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
  for (const p of fenceTops) { const k = key(p[0], p[1]); if (!G.has(k)) G.set(k, []); G.get(k).push(p); }
  const drawnAt = (x, z) => { let best = null, bd = 0.2; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of G.get(`${Math.floor(x / 2) + i},${Math.floor(z / 2) + j}`) || []) { const dd = Math.hypot(p[0] - x, p[1] - z); if (dd < bd) { bd = dd; best = p; } } return best; };
  const P0 = d.drive.col.P;
  for (let id = 0; id < P0; id++) {
    if (col.pkind[id] !== KIND.wall) continue;
    const s0 = col.ringStart[col.polyRing[id]], s1 = col.ringStart[col.polyRing[id] + 1];
    const top = col.ptop[id], base = col.pbase[id];
    let fence = 0, ghost = 0, gx = 0, gz = 0;
    for (let i = s0; i < s1; i++) {
      const j = i + 1 < s1 ? i + 1 : s0, ax = col.pts[i * 2], az = col.pts[i * 2 + 1], bx = col.pts[j * 2], bz = col.pts[j * 2 + 1], L = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(L / 0.5));
      for (let k = 0; k < n; k++) {
        const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n, p = drawnAt(x, z);
        // (claude/chenaie) a wall standing wholly over the drawn fence is not ITS wall: a road deck's parapet crossing over the
        // fence line in plan (the car under the deck passes under it: colliders.js heightClear). Until 2026-11-24 the band
        // decks' parapets over the L26 fences were counted here as fence ghosts (Avenue de la Chênaie: 1-1.5 m, read as
        // "the fence's wall takes the deck's height"; the fence walls themselves stop at the drawn fence top)
        if (!p || base > p[3]) continue;
        fence += L / n / 2;                                          // (a thin ring: both long sides)
        const ly = layers(x, z), under = [ly.top, ly.low].some((v) => Number.isFinite(v) && v + 1.6 < p[2] - 0.5);
        if (top > p[3] + 0.5 || (base < p[2] - 2 && under)) { ghost += L / n / 2; gx = x; gz = z; }
      }
    }
    if (!fence) continue;
    inf("fence wall m", fence);
    if (ghost > 0.25) { counts.fenceGhost += ghost; addItem("fenceGhost", gx, gz, `a fence wall ${top > 1e3 ? "with no top" : `up to ${top.toFixed(1)} m`}${base < -1e3 ? ", no foot" : ""} over / under the drawn fence`, ghost); }
  }
}
for (const k of KEYS) counts[k] = +counts[k].toFixed(1);
console.log(JSON.stringify({ tile: T, ms: Date.now() - t0, counts, info, items: items.map(({ x, z, ...r }) => r) }));
process.exit(0);
