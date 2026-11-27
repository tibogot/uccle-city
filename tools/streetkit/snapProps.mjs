// STREET PROPS OUT OF THE ROAD, baked (class D, claude/streetprops 2026-11-18, rule 30 provisional; docs/CENSUS.md D1 / D3)
//
// The street-name plates (data/streetlife plates, mount = post: drawn by the street-life worker) and their posts
// (data/streetkit posts: drawn by the street kit) are ONE thing at ONE spot: main.js used to move the post out of the
// lane at load while the plate stayed at the baked spot (Papenkasteel: 4 m apart). The bpost boxes (data/streetlife
// postboxes) and the Villo stations (data/streetkit villo) were never moved at all (a box in the middle of the Chaussée
// d'Alsemberg, Villo docks on its tram tracks at Rittweger). This pass moves them all once, at build time, with the very
// test main.js uses (viewer/streets/carriageway.js offLane: the driven lanes, measured or the OSM band, + the tram
// tracks, + the OSM street width where no measured kerb is near), and both layers read the moved spot:
//   plate + post   the same move for both (the post is matched to its plate's original spot)
//   post box       moved behind the kerb (or past the OSM carriageway), turned to face the road it now stands by
//   Villo station  the whole row slid back from the road (<= 2 m, steps of 0.25 m) until no piece is in a lane / on a
//                  track; else the pieces still there are dropped (a dock with its bike), the terminal re-placed 1 m past
//                  the nearest kept dock
// Each moved item keeps its original under `was` (?streetprops=old draws it there). Idempotent: moves are always
// computed from `was` when it is there.
//
// tools/streetkit/build_streetkit.py calls this after it writes the tiles and applies the moves itself (so both files
// keep the Python writer's bytes): node --import ./tools/road_audit/register.mjs tools/streetkit/snapProps.mjs T ...
//   (prints one JSON line per tile: { tile, plates: [[i, x, y, z]], posts: [[i, x, y, z, x0, y0, z0]], postboxes: [[i, x, y, z,
//   nx, nz]], villo: [[i, station]], stuck: {...} })   --all: every tile   --jobs N
import { join } from "node:path";
import { streetTile, runTiles, cli, json, ROOT, imp } from "../audit/census/lib_street.mjs";

const { CHILD, TILES, JOBS } = cli();
if (!CHILD) {
  if (!TILES.length) { console.error("usage: snapProps.mjs [--all | T ...] [--jobs N]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, log: false });
  for (const r of res) console.log(JSON.stringify(r));
  process.exit(res.some((r) => r.error) ? 1 : 0);
}

const T = TILES[0];
const S = await streetTile(T);
const { offLane, trackIndex, TRAM_CLEAR } = await imp("viewer/streets/carriageway.js");
const { fit, lanes, tram, tile } = S;
const hm = tile.hm;
const ground = (x, z) => hm.sample(hm.orig, x, z);
const tracks = trackIndex(tram.map((l) => l.line));
const OPT = { tram: tracks, osm: true };
const sl = json(join(ROOT, "data/streetlife", `${T}.json`)) || {};
const sk = json(join(ROOT, "data/streetkit", `${T}.json`)) || {};
const r2 = (v) => Math.round(v * 100) / 100, r4 = (v) => Math.round(v * 1e4) / 1e4;
const rise = (x0, z0, x1, z1) => (fit ? fit.lift(x1, z1) - fit.lift(x0, z0) : 0) + ground(x1, z1) - ground(x0, z0);
const bad = (x, z) => lanes.inside(x, z, 0) || tracks.dist(x, z) < TRAM_CLEAR;
const out = { tile: T, plates: [], posts: [], postboxes: [], glass: [], villo: [], stuck: { plates: 0, postboxes: 0, villoPieces: 0 }, dropped: { docks: 0, bikes: 0, totems: 0 } };
// the original spot of an item (its `was` when an earlier pass moved it)
const orig = (p) => (p.was ? { x: p.was[0], y: p.was[1], z: p.was[2], ...(p.was.length > 3 ? { nx: p.was[3], nz: p.was[4] } : {}) } : p);

// ---- plates on posts + their posts
const posts = sk.posts || [];
(sl.plates || []).forEach((p0, i) => {
  if (p0.mount === "wall") return;
  const p = orig(p0);
  const r = offLane(p.x, p.z, lanes, fit, OPT);
  if (!r.moved) { if (bad(p.x, p.z)) out.stuck.plates++; return; }
  const dy = rise(p.x, p.z, r.x, r.z);
  out.plates.push([i, r2(r.x), r2(p.y + dy), r2(r.z)]);
  // its post: where the plate was (the kit copies the plate's spot), or where it is now (a kit built after a pass)
  posts.forEach((q, k) => {
    // (build_streetkit.py copies the plate's x, y, z onto its post: the post's original is the plate's)
    if (Math.hypot(q.x - p.x, q.z - p.z) < 0.05 || Math.hypot(q.x - p0.x, q.z - p0.z) < 0.05) out.posts.push([k, r2(r.x), r2(p.y + dy), r2(r.z), p.x, p.y, p.z]);
  });
});

// ---- post boxes: off the road, facing it
(sl.postboxes || []).forEach((b0, i) => {
  const b = orig(b0);
  const r = offLane(b.x, b.z, lanes, fit, OPT);
  if (!r.moved) { if (bad(b.x, b.z)) out.stuck.postboxes++; return; }
  out.postboxes.push([i, r2(r.x), r2(b.y + rise(b.x, b.z, r.x, r.z)), r2(r.z), r4(r.nx), r4(r.nz)]);
});

// ---- (defects3) the street life's underground glass chutes (drawn by the street-life layer, never snapped): as the boxes
(sl.glass || []).forEach((g0, i) => {
  if (!g0.underground) return;                         // (the overground banks: data/furniture banks, snapped at load)
  const g = orig(g0);
  const r = offLane(g.x, g.z, lanes, fit, OPT);
  if (!r.moved) { if (bad(g.x, g.z)) out.stuck.glass = (out.stuck.glass || 0) + 1; return; }
  out.glass.push([i, r2(r.x), r2(g.y + rise(g.x, g.z, r.x, r.z)), r2(r.z), r4(r.nx), r4(r.nz)]);
});

// ---- Villo stations (rule 30, round 2): ONE straight row on paving, never bent round a corner, never on a lawn / verge.
// A station is kept as built (build_streetkit.py place_villo, or its `alt`: turned to the nearest sidewalk) when every
// dock and its bike stand on paving (measured sidewalk / square, or the parking lane for a "lane" station), clear of the
// lanes and the tram tracks, in one straight line; else it is laid out again from its WFS point along the nearest
// measured kerb: the longest straight row that fits within 10 m of the point (shortened from the ends, >= 6 docks + the
// terminal), the station's own mode first; else it is dropped (logged by build_streetkit.py).
const PAVE = new Set([3, 4, 5]), SIDE = new Set([4, 5]), LANE = new Set([3]);
const cls = (x, z) => (fit ? fit.classAt(x, z) : -1);
const h01 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h / 4294967296; };
const floorY = (x, z) => ground(x, z) + (fit ? fit.lift(x, z) : 0);
// (round 3) the parking bays (tools/streetkit/parkBays.mjs: the parked cars' own slots, off the tram road): a "lane"
// station's row may stand there (main.js's parked cars keep off its area: cityStreetKit.keepCarsClear)
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { parkBays, bayAvoid } = await import("./parkBays.mjs");
const BAYS = fit ? parkBays(widthParking(S.roads, S.feats, S.bounds, fit).sites, cls, (x, z) => tracks.dist(x, z), TRAM_CLEAR, bayAvoid(S.feats)) : { bay: () => false };
const okSpot = (x, z) => !bad(x, z) || BAYS.bay(x, z);           // out of the lanes / off the tracks, or in a parking bay
const paved = (x, z) => PAVE.has(cls(x, z)) || BAYS.bay(x, z);
/** the station's row as drawn: { offPaving, bent } (measured tiles only) */
function villoQuality(v) {
  if (!fit || !v.docks.length) return { offPaving: 0, bent: false, bad: 0 };
  const d0 = v.docks[0], nx = Math.sin(d0.yaw), nz = Math.cos(d0.yaw);
  let offPaving = 0, badN = 0;
  for (const d of v.docks) {
    if (!paved(d.x, d.z) || !paved(d.x + nx * 1.5, d.z + nz * 1.5)) offPaving++;
    if (!okSpot(d.x, d.z)) badN++;
  }
  for (const b of v.bikes) if (!okSpot(b.x, b.z)) badN++;
  if (v.totem && !okSpot(v.totem.x, v.totem.z)) badN++;
  // straight: every dock within 0.3 m of the line through the row's two ends
  const tx = nz, tz = -nx, u = (d) => d.x * tx + d.z * tz, row = [...v.docks].sort((a, b) => u(a) - u(b));
  const a = row[0], b = row[row.length - 1], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const bent = row.some((d) => Math.abs(((d.x - a.x) * (b.z - a.z) - (d.z - a.z) * (b.x - a.x)) / L) > 0.3);
  return { offPaving, bent, bad: badN };
}
function layout(v, anchor, totem0, R = 10) {
  // every kerb near the point (probed from it and from rings of 3 / 6 / 9 m round it): the longest row wins, then the
  // one nearest the point
  const kerbs = [];
  for (const r of [0, 3, 6, 9, 12].filter((r) => r < R)) for (let j = 0; j < (r ? 16 : 1); j++) {
    const a = (j * Math.PI) / 8, k = fit.nearKerb(anchor.x + Math.cos(a) * r, anchor.z + Math.sin(a) * r, 4);
    if (k && !kerbs.some((q) => Math.hypot(q.x - k.x, q.z - k.z) < 1 && q.tx * k.tx + q.tz * k.tz > 0.95)) kerbs.push(k);
  }
  let best = null;
  for (const k of kerbs) {
    const r = layoutOn(v, anchor, totem0, k, best ? best.docks.length : 5, R);
    if (r && (!best || r.docks.length > best.docks.length || (r.docks.length === best.docks.length && r.dist < best.dist))) best = r;
  }
  if (best) delete best.dist;
  return best;
}
function layoutOn(v, anchor, totem0, k, atLeast, R) {
  const nx = -k.lx, nz = -k.lz, yawN = Math.atan2(nx, nz);
  // the kerb point nearest the anchor along the kerb's line
  const s0 = (anchor.x - k.x) * k.tx + (anchor.z - k.z) * k.tz, Kx = k.x + k.tx * s0, Kz = k.z + k.tz * s0;
  const stands = Math.min(40, Math.max(6, +v.stands || 10));
  const modes = v.mode === "lane" ? [["lane", -0.3, LANE], ["sidewalk", 1.95, SIDE], ["sidewalk", 1.6, SIDE]] : [["sidewalk", 1.95, SIDE], ["sidewalk", 1.6, SIDE], ["lane", -0.3, LANE]];
  for (let N = stands; N >= Math.max(6, atLeast); N--) for (let ci = 0; ci <= 40; ci++) {
    const c = (ci % 2 ? 1 : -1) * Math.ceil(ci / 2) * 0.5;
    if (Math.hypot(Kx + k.tx * c - anchor.x, Kz + k.tz * c - anchor.z) > R) continue;
    for (const [mode, off, set] of modes) {
      const at = (i) => { const uu = c + (i - (N - 1) / 2) * 0.85; return [Kx + k.tx * uu + k.lx * off, Kz + k.tz * uu + k.lz * off]; };
      let fine = true;
      for (let i = 0; i < N && fine; i++) {
        const [x, z] = at(i);
        fine = mode === "lane"
          ? [0, 0.42, 1.5].every((e) => { const bx = x + nx * e, bz = z + nz * e; return (LANE.has(cls(bx, bz)) && !bad(bx, bz)) || BAYS.bay(bx, bz); })
          : set.has(cls(x, z)) && !bad(x, z) && [0.42, 1.5].every((e) => { const bx = x + nx * e, bz = z + nz * e; return SIDE.has(cls(bx, bz)) && !bad(bx, bz); });
      }
      if (!fine) continue;
      // the terminal 1 m past one end, in line
      let tot = null;
      for (const [i, sg] of [[N - 1, 1], [0, -1]]) {
        const [x, z] = at(i), px = x + k.tx * sg, pz = z + k.tz * sg;
        if (paved(px, pz) && okSpot(px, pz)) { tot = [px, pz]; break; }
      }
      if (!tot) continue;
      const docks = [], bikes = [];
      for (let i = 0; i < N; i++) {
        const [x, z] = at(i);
        docks.push({ x: r2(x), y: r2(floorY(x, z) - 0.01), z: r2(z), yaw: r4(yawN) });
        if (h01(`${v.id}:${i}`) < 0.55) { const bx = x + nx * 0.42, bz = z + nz * 0.42; bikes.push({ x: r2(bx), y: r2(Math.max(floorY(bx, bz), floorY(x + nx * 1.5, z + nz * 1.5)) - 0.035), z: r2(bz), yaw: r4(yawN) }); }
      }
      const totem = { ...(totem0 || {}), x: r2(tot[0]), y: r2(floorY(tot[0], tot[1]) - 0.01), z: r2(tot[1]), yaw: r4(Math.atan2(-nx, -nz)) };
      const [mx, mz] = at((N - 1) / 2);
      const area = { x: r2(mx + nx * 0.95), z: r2(mz + nz * 0.95), yaw: r4(Math.atan2(k.tx, k.tz)), hx: r2(((N - 1) * 0.85) / 2 + 1.6), hz: 1.2 };
      return { docks, bikes, totem, area, mode, relaid: true, slid: 0, dist: Math.hypot(mx - anchor.x, mz - anchor.z) };
    }
  }
  return null;
}
out.villoLog = [];
(sk.villo || []).forEach((v0, i) => {
  const main = v0.was ? { ...v0, ...v0.was } : v0;
  const good = (v) => { const q = villoQuality(v); return v.docks.length >= 6 && !q.offPaving && !q.bent && !q.bad; };
  if (good(main)) { if (v0.was) out.villo.push([i, { docks: main.docks, bikes: main.bikes, totem: main.totem || null, area: main.area || null, mode: main.mode, slid: 0 }]); return; }
  if (v0.alt && good(v0.alt)) { out.villo.push([i, { docks: v0.alt.docks, bikes: v0.alt.bikes, totem: v0.alt.totem || null, area: v0.alt.area || null, mode: v0.alt.mode, alt: true, slid: 0 }]); return; }
  const wfs = (sl.villo || []).find((w) => w.id === v0.id) || { x: main.docks[0]?.x ?? main.totem.x, z: main.docks[0]?.z ?? main.totem.z };
  // within 10 m of the point, else 14 m (round 3: Rittweger's point lies in the tram road)
  let r = null, R = 0;
  for (const rr of [10, 14]) if (!r && fit) { r = layout({ ...main, stands: main.stands ?? wfs.stands }, wfs, main.totem, rr); R = rr; }
  if (r) { out.villo.push([i, r]); out.villoLog.push(`${v0.id} ${v0.name}: laid out again, ${r.docks.length} docks (${r.mode}${R > 10 ? ", within 14 m" : ""})`); return; }
  out.dropped.stations = (out.dropped.stations || 0) + 1;
  out.villo.push([i, { docks: [], bikes: [], totem: null, area: null, slid: 0 }]);
  out.villoLog.push(`${v0.id} ${v0.name}: DROPPED (no straight row of >= 6 docks on paving / in a parking bay within 14 m)`);
});

// ---- one-way pair signs (build_streetkit.py src "pair"): a C1 / F19 that still shows the other order to the same
// approach (within 4 m, facing within 45 deg, no carriageway between them by the viewer's own test) goes, with its pole
// (build_streetkit's own check sees only the OSM bands; this one sees the measured street, as the census does)
out.dropSigns = [];
{
  // (where main.js draws them: after its load-time move of the signs, viewer/streets/carriageway.js docOffLanes)
  const L = (sk.signs || []).map((s) => { const r = offLane(s.x, s.z, lanes, fit, OPT); return { ...s, x: r.x, z: r.z }; });
  const has = (s, c) => s.plates.some((p) => p.code === c);
  // (the pair F19s first: where one of a pair must go, the carriageway exit keeps its C1)
  const order = L.map((a, i) => i).sort((i, j) => (has(L[j], "F19") ? 1 : 0) - (has(L[i], "F19") ? 1 : 0) || i - j);
  order.forEach((i) => {
    const a = L[i];
    if (a.src !== "pair") return;
    const other = has(a, "C1") ? "F19" : has(a, "F19") ? "C1" : null;
    if (!other) return;
    const hit = L.some((b) => b !== a && has(b, other) && !out.dropSigns.includes(L.indexOf(b)) && Math.hypot(a.x - b.x, a.z - b.z) < 4 && Math.cos(a.yaw - b.yaw) > Math.cos(Math.PI / 4)
      && (Math.hypot(a.x - b.x, a.z - b.z) < 1.5 || ![0.2, 0.35, 0.5, 0.65, 0.8].some((t) => S.driven.inside(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0))));
    if (hit) out.dropSigns.push(i);
  });
}
console.log(JSON.stringify(out));
