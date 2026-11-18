// CENSUS class D (claude/census 2026-11-18, owner playtest 2026-11-18 images 78 79 85 86): street furniture where the
// city DRAWS it (after main.js's load-time moves), city-wide, report only (no fix, no gate row yet).
//
//   plateGap   a street-name plate (data/streetlife plates, mount = post: drawn by the street-life layer at its baked
//              x, z) whose post (data/streetkit posts: drawn by the street kit) stands elsewhere: main.js moves the kit's
//              posts out of the lanes at load (viewer/streets/carriageway.js docOffLanes, snap(skDoc, [["signs"],
//              ["posts"]])) but the street-life layer still draws the plate where the post was. gap > 0.15 m = flagged.
//              Also: a post-mounted plate with no kit post at all.
//   signFacing a road sign (data/streetkit signs) whose plate faces across every street near it: its face normal more than
//              45 deg off the axis of every driven road centre line within 12 m (a sign must face along its street, to
//              the traffic it addresses). Info: signs the load-time snap moved > 1.5 m (onto another kerb).
//   inRoad     a drawn piece whose centre is in a driven lane (carriageway.js lanesOnly: measured roadway / tram road,
//              else the OSM band) or within TRAM_HW of a tram track centre: the bpost boxes (streetlife postboxes, never
//              snapped), the Villo stations (streetkit villo totem / docks / bikes, never snapped), and the snapped data
//              layers (signs, plate posts, furniture2 benches / bins / hoops / boxes / banks, STIB poles / shelters /
//              ad panels) for completeness (tools/audit/streetAudit.mjs counts those before / after the snap).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/streetProps.mjs [--all | T ...] [--out FILE] [--jobs N]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, json, at, ROOT, imp } from "./lib_street.mjs";

const { CHILD, TILES, OUT, JOBS, WORST } = cli();
const TRAM_HW = 1.3, GAP = 0.15, FACE_TOL = 45, NEAR_ROAD = 12;

if (!CHILD) {
  if (!TILES.length) { console.error("usage: streetProps.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS });
  const sum = {}, items = { plateGap: [], signFacing: [], inRoad: [] };
  for (const r of res) {
    if (r.error) continue;
    for (const [k, v] of Object.entries(r.counts)) sum[k] = (sum[k] || 0) + v;
    for (const k of Object.keys(items)) for (const it of r.items[k] || []) items[k].push({ tile: r.tile, ...it });
  }
  items.plateGap.sort((a, b) => b.gap - a.gap); items.signFacing.sort((a, b) => b.off - a.off); items.inRoad.sort((a, b) => b.deep - a.deep);
  console.log(`class D, ${res.length} tiles${res.some((r) => r.error) ? ` (${res.filter((r) => r.error).length} failed)` : ""}`);
  console.log(JSON.stringify(sum));
  const byKind = {}; for (const it of items.inRoad) { const k = `${it.kind}${it.tram ? " (tram)" : ""}`; byKind[k] = (byKind[k] || 0) + 1; }
  console.log("inRoad by kind:", JSON.stringify(byKind));
  for (const k of Object.keys(items)) {
    console.log(`worst ${k}:`);
    for (const it of items[k].slice(0, WORST)) console.log(`  ${it.tile} ${JSON.stringify(it)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), sum, byKind, items }, null, 1));
  process.exit(0);
}

// ------------------------------------------------------------------ child: one tile
const T = TILES[0];
const S = await streetTile(T);
const { docOffLanes } = await imp("viewer/streets/carriageway.js");
const { fit, lanes, tramIdx, nameAt, inB, roads } = S;
const sl = json(join(ROOT, "data/streetlife", `${T}.json`)) || {};
const sk = json(join(ROOT, "data/streetkit", `${T}.json`)) || {};
const furn = json(join(ROOT, "data/furniture", `${T}.json`));
const stops = json(join(ROOT, "data/stops", `${T}.json`));
// as main.js: snap(doc, paths) (no road decks here: the few deck points are left as they are)
const snap = (doc, paths) => (doc && fit ? docOffLanes(doc, paths, lanes, fit).doc : doc);
const skS = snap(sk, [["signs"], ["posts"]]);
const furnS = snap(furn, [["benches"], ["bins"], ["hoops"], ["boxes"], ["banks"]]);
const stopsS = snap(stops, [["stops", "pole"], ["stops", "shelter"], ["panels"]]);
const counts = { plates: 0, plateGap: 0, plateNoPost: 0, signs: 0, signFacing: 0, signMovedFar: 0, pieces: 0, inRoad: 0, inLane: 0, onTram: 0 };
const items = { plateGap: [], signFacing: [], inRoad: [] };

// ---- plates vs their posts
const posts0 = sk.posts || [], posts1 = skS?.posts || [];
for (const p of sl.plates || []) {
  if (p.mount === "wall" || !inB(p.x, p.z)) continue;
  counts.plates++;
  let k = -1, best = 0.3;
  posts0.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < best) { best = d; k = i; } });
  if (k < 0) { counts.plateNoPost++; items.plateGap.push({ what: "plate, no post", gap: 99, at: at(p.x, p.z), street: p.fr }); continue; }
  const q = posts1[k], gap = Math.hypot(q.x - p.x, q.z - p.z);
  if (gap > GAP) { counts.plateGap++; items.plateGap.push({ what: "plate off its post", gap: +gap.toFixed(2), at: at(p.x, p.z), post: at(q.x, q.z), street: p.fr }); }
}

// ---- sign facing vs the streets near it
const N = new Map((roads.nodes || []).map((n) => [n.id, n]));
const NOT_DRIVEN = new Set(["footway", "path", "cycleway", "steps", "pedestrian", "bridleway", "track", "corridor", "platform"]);
const segs = [];
for (const r of roads.roads || []) {
  if (NOT_DRIVEN.has(r.meta?.highway)) continue;
  const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
  for (let i = 1; i < pts.length; i++) segs.push({ ax: pts[i - 1].x, az: pts[i - 1].z, bx: pts[i].x, bz: pts[i].z, name: r.meta?.name || r.id });
}
const axisOff = (fx, fz, ux, uz) => { const c = Math.abs(fx * ux + fz * uz); return (Math.acos(Math.min(1, c)) * 180) / Math.PI; };
(sk.signs || []).forEach((s0, i) => {
  if (!inB(s0.x, s0.z)) return;
  const s = skS.signs[i];
  counts.signs++;
  const moved = Math.hypot(s.x - s0.x, s.z - s0.z);
  if (moved > 1.5) counts.signMovedFar++;
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  let off = 90, near = null, nd = Infinity;
  for (const g of segs) {
    const dx = g.bx - g.ax, dz = g.bz - g.az, L2 = dx * dx + dz * dz; if (L2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((s.x - g.ax) * dx + (s.z - g.az) * dz) / L2)), d = Math.hypot(s.x - g.ax - dx * t, s.z - g.az - dz * t);
    if (d > NEAR_ROAD) continue;
    const L = Math.sqrt(L2), o = axisOff(fx, fz, dx / L, dz / L);
    if (o < off) off = o;
    if (d < nd) { nd = d; near = g.name; }
  }
  if (near != null && off > FACE_TOL) {
    counts.signFacing++;
    items.signFacing.push({ why: "faces across the streets", codes: s.plates.map((p) => p.code).join("+"), off: Math.round(off), moved: +moved.toFixed(1), at: at(s.x, s.z), street: near });
  }
});
// contradictory faces: a no-entry (C1) and a one-way (F19) shown to the SAME traffic (one pole, or poles within 4 m
// facing within 45 deg of each other): the rule pass placed both ends of two one-way pieces meeting at one junction
{
  const L = (skS?.signs || []).filter((s) => inB(s.x, s.z));
  const has = (s, c) => s.plates.some((p) => p.code === c);
  for (const a of L) if (has(a, "C1")) for (const b of L) if (has(b, "F19")) {
    const d = Math.hypot(a.x - b.x, a.z - b.z), facing = Math.cos(a.yaw - b.yaw);
    if (d < 4 && facing > Math.cos(Math.PI / 4)) {
      counts.signFacing++; counts.signConflict = (counts.signConflict || 0) + 1;
      items.signFacing.push({ why: a === b ? "C1 + F19 on one pole" : "C1 and F19 face the same traffic", codes: "C1/F19", off: 180, at: at(a.x, a.z), street: nameAt(a.x, a.z) });
    }
  }
}

// ---- drawn pieces in a driven lane / on a tram track
const test = (kind, x, z, extra = {}) => {
  if (typeof x !== "number" || !inB(x, z)) return;
  counts.pieces++;
  const lane = lanes.inside(x, z, 0), tr = tramIdx.dist(x, z, 3), onTram = !!tr && tr.d < TRAM_HW;
  if (!lane && !onTram) return;
  counts.inRoad++; if (lane) counts.inLane++; if (onTram) counts.onTram++;
  // depth: how far into the lane (the larger margin it still is inside), or into the tram envelope
  let deep = 0; if (lane) for (const m of [0.25, 0.5, 1, 1.5, 2, 3]) if (lanes.inside(x, z, m)) deep = m;
  if (onTram) deep = Math.max(deep, TRAM_HW - tr.d);
  items.inRoad.push({ kind, deep: +deep.toFixed(2), lane, tram: onTram, at: at(x, z), street: nameAt(x, z), ...extra });
};
for (const b of sl.postboxes || []) test("postbox", b.x, b.z, { id: b.id });
for (const v of sk.villo || []) {
  // one row per station: its worst piece
  const pieces = [...(v.totem ? [["totem", v.totem]] : []), ...v.docks.map((d) => ["dock", d]), ...v.bikes.map((b) => ["bike", b])];
  const before = items.inRoad.length, c0 = { ...counts };
  for (const [k, p] of pieces) test(`villo ${k}`, p.x, p.z, { id: v.id });
  const mine = items.inRoad.splice(before);
  if (mine.length) {
    mine.sort((a, b) => b.deep - a.deep);
    Object.assign(counts, c0); counts.pieces += pieces.length; counts.inRoad++; if (mine.some((m) => m.lane)) counts.inLane++; if (mine.some((m) => m.tram)) counts.onTram++;
    items.inRoad.push({ ...mine[0], kind: "villo station", pieces: mine.length, of: pieces.length });
  }
}
for (const s of skS?.signs || []) test("sign", s.x, s.z, { codes: s.plates.map((p) => p.code).join("+") });
for (const p of skS?.posts || []) test("plate post", p.x, p.z);
for (const k of ["benches", "bins", "hoops", "boxes", "banks"]) for (const p of furnS?.[k] || []) test(k, p.x, p.z);
for (const s of stopsS?.stops || []) { if (s.pole) test("stop pole", s.pole.x, s.pole.z, { stop: s.fr }); if (s.shelter) test("shelter", s.shelter.x, s.shelter.z, { stop: s.fr }); }
for (const p of stopsS?.panels || []) test("ad panel", p.x, p.z);

console.log(JSON.stringify({ tile: T, counts, items }));
