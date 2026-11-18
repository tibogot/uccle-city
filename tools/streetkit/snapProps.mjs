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
const out = { tile: T, plates: [], posts: [], postboxes: [], villo: [], stuck: { plates: 0, postboxes: 0, villoPieces: 0 }, dropped: { docks: 0, bikes: 0, totems: 0 } };
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

// ---- Villo stations: slide the row back, else drop the pieces still in the road (all of them: the station). A station
// whose WFS point had no sidewalk behind it comes with an `alt` (build_streetkit.py place_villo turned to the nearest
// measured sidewalk): the variant with more docks out of the road wins (the main one on a tie)
function fixStation(v) {
  const pieces = [...(v.totem ? [v.totem] : []), ...v.docks, ...v.bikes];
  if (!v.docks.length) return null;
  const tally = { docks: 0, bikes: 0, totems: 0 };
  if (!pieces.some((p) => bad(p.x, p.z))) return { keep: v.docks.length, r: { docks: v.docks, bikes: v.bikes, totem: v.totem || null, area: v.area || null, slid: 0 }, tally, clean: true };
  const d0 = v.docks[0];
  const nx = Math.sin(d0.yaw), nz = Math.cos(d0.yaw);       // the docks' yaw: their normal toward the road
  const mv = (p, s) => ({ ...p, x: r2(p.x - nx * s), z: r2(p.z - nz * s), y: r2(p.y + rise(p.x, p.z, p.x - nx * s, p.z - nz * s)) });
  let st = null;
  for (let s = 0.25; s <= 2.001 && !st; s += 0.25) if (pieces.every((p) => !bad(p.x - nx * s, p.z - nz * s))) st = s;
  if (st) {
    const area = v.area ? { ...v.area, x: r2(v.area.x - nx * st), z: r2(v.area.z - nz * st) } : null;
    return { keep: v.docks.length, r: { docks: v.docks.map((d) => mv(d, st)), bikes: v.bikes.map((b) => mv(b, st)), totem: v.totem ? mv(v.totem, st) : null, area, slid: st }, tally };
  }
  // a dock and its bike (0.42 m toward the road from it) go together
  const bikeOf = (d) => v.bikes.find((b) => Math.hypot(b.x - (d.x + nx * 0.42), b.z - (d.z + nz * 0.42)) < 0.1);
  const docks = v.docks.filter((d) => { const b = bikeOf(d); const ok = !bad(d.x, d.z) && !(b && bad(b.x, b.z)); if (!ok) { tally.docks++; if (b) tally.bikes++; } return ok; });
  const bikes = v.bikes.filter((b) => docks.some((d) => bikeOf(d) === b) || (!bad(b.x, b.z) && !v.docks.some((d) => bikeOf(d) === b)));
  let totem = v.totem || null;
  if (totem && bad(totem.x, totem.z)) {
    totem = null;
    // 1 m past an end of the kept row, along it
    if (docks.length >= 2) {
      const tx = nz, tz = -nx;
      const u = (d) => d.x * tx + d.z * tz, row = [...docks].sort((a, b) => u(a) - u(b));
      for (const [end, sg] of [[row[row.length - 1], 1], [row[0], -1]]) {
        const px = end.x + tx * sg * 1.0, pz = end.z + tz * sg * 1.0;
        if (!bad(px, pz)) { totem = { ...v.totem, x: r2(px), z: r2(pz), y: r2(v.totem.y + rise(v.totem.x, v.totem.z, px, pz)) }; break; }
      }
    }
    if (!totem) tally.totems++;
  }
  // (nothing of the row left out of the road: the station is not drawn; its `was` keeps it for ?streetprops=old)
  return { keep: docks.length, r: docks.length ? { docks, bikes, totem, area: v.area || null, slid: 0, trimmed: true } : { docks: [], bikes: [], totem: null, area: null, slid: 0 }, tally };
}
(sk.villo || []).forEach((v0, i) => {
  const v = v0.was ? { ...v0, ...v0.was } : v0;
  const main = fixStation(v), alt = v0.alt ? fixStation(v0.alt) : null;
  const win = alt && (!main || alt.keep > main.keep) ? { ...alt, r: { ...alt.r, alt: true } } : main;
  if (!win || (win === main && win.clean)) return;           // (a clean alt still replaces the main row)
  for (const k of Object.keys(win.tally)) out.dropped[k] += win.tally[k];
  if (!win.keep) out.dropped.stations = (out.dropped.stations || 0) + 1;
  out.villo.push([i, win.r]);
});
console.log(JSON.stringify(out));
