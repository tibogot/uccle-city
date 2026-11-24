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
import { streetTile, runTiles, cli, json, at, ROOT, imp, lineIndex } from "./lib_street.mjs";
import { judge, report, rewrite } from "../gaps.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, flag, opt } = cli();
// (claude/streetprops, rule 30) --old: the city as ?streetprops=old draws it (the data's `was` / signsOld, the load-time
// move without the tram tracks and the OSM width, the plate posts moved at load); --max k=v,...: count ceilings (exit 1
// over); --register (claude/street1, rule gap-register): every finding judged against data/gaps.json by its stable id
// (`streetprops.<check>:<kind>@<x>,<z>:0-0`, tools/audit/gaps.mjs), no counts; --write-register rewrites those entries
const PLATOLD = flag("--platold"), FAROLD = flag("--farold");   // --farold: ?propreach=old (offLane without its 16 m pass)   // (claude/defects1) ?platpole=old: every `platform` STIB pole kept, the platforms as OSM put them
const OLD = flag("--old"), MAX = opt("--max", null), QUIET = flag("--quiet"), RAILOLD = flag("--railold"), REG = flag("--register"), WREG = flag("--write-register");
const GATED = ["plateGap", "signFacing", "signConflict", "inRoad", "villo", "onRail", "inHero"].map((k) => `streetprops.${k}`);   // --railold: ?rail=old (no track-bed keep-clear, rule 39)
const TRAM_HW = 1.3, GAP = 0.15, FACE_TOL = 45, NEAR_ROAD = 12;

if (!CHILD) {
  if (!TILES.length) { console.error("usage: streetProps.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: [...(OLD ? ["--old"] : []), ...(RAILOLD ? ["--railold"] : []), ...(PLATOLD ? ["--platold"] : []), ...(FAROLD ? ["--farold"] : [])], log: !QUIET });
  const sum = {}, items = { plateGap: [], signFacing: [], inRoad: [], villo: [], onRail: [] };
  for (const r of res) {
    if (r.error) continue;
    for (const [k, v] of Object.entries(r.counts)) sum[k] = (sum[k] || 0) + v;
    for (const k of Object.keys(items)) for (const it of r.items[k] || []) items[k].push({ tile: r.tile, ...it });
  }
  items.plateGap.sort((a, b) => b.gap - a.gap); items.signFacing.sort((a, b) => b.off - a.off); items.inRoad.sort((a, b) => b.deep - a.deep);
  // (gate keys) the owner's classes by kind: post boxes and Villo stations in the road
  sum.postbox = items.inRoad.filter((it) => it.kind === "postbox").length;
  sum.villo = items.inRoad.filter((it) => it.kind === "villo station").length;
  console.log(`class D, ${res.length} tiles${res.some((r) => r.error) ? ` (${res.filter((r) => r.error).length} failed)` : ""}`);
  console.log(JSON.stringify(sum));
  const byKind = {}; for (const it of items.inRoad) { const k = `${it.kind}${it.tram ? " (tram)" : ""}`; byKind[k] = (byKind[k] || 0) + 1; }
  console.log("inRoad by kind:", JSON.stringify(byKind));
  for (const k of Object.keys(items)) {
    console.log(`worst ${k}:`);
    for (const it of items[k].slice(0, WORST)) console.log(`  ${it.tile} ${JSON.stringify(it)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, byKind, items }, null, 1));
  // the gate (tools/audit/mergeGate.mjs streetprops): ceilings per count
  let bad = res.some((r) => r.error) ? 1 : 0;
  const findings = res.flatMap((r) => r.findings || []), done = res.filter((r) => !r.error).map((r) => r.tile);
  console.log(`findings by check: ${JSON.stringify(findings.reduce((a, f) => ((a[f.inv] = (a[f.inv] || 0) + 1), a), {}))}`);
  if (WREG) { const w = rewrite(findings, { invariants: GATED, tiles: done, date: new Date().toISOString().slice(0, 10), decision: (f) => `open (${f.cause}): keep-out from the street model (STREET_MODEL_PLAN job 6)` }); console.log(`  register rewritten: ${w.written} entries, ${w.kept} others kept`); }
  else if (REG) bad += report("streetprops", judge(findings, { invariants: GATED, tiles: done }));
  if (MAX) for (const kv of MAX.split(",")) {
    const [k, v] = kv.split("="), n = sum[k] || 0;
    if (n > +v) { console.log(`FAIL ${k} ${n} > ${v}`); bad++; } else console.log(`ok ${k} ${n} <= ${v}`);
  }
  process.exit(bad ? 1 : 0);
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
// (claude/defects1) as main.js loadTile: the platform poles follow their fitted platform (platformFollow), and one with no
// platform DRAWN under it is an ordinary pole (platformUnflag, ?platpole=old: kept as flagged)
const TP = await imp("viewer/streets/tramPlatforms.js");
if (!OLD && stops?.stops) { TP.platformFollow(stops.stops.map((s) => (s.pole?.platform ? s.pole : null)), { lines: S.platforms }); if (!PLATOLD) TP.platformUnflag(stops.stops, { lines: S.platforms }); }
// as main.js: snap(doc, paths) (no road decks here: the few deck points are left as they are)
const { trackIndex } = await imp("viewer/streets/carriageway.js");
const { smoothPolyline } = await imp("viewer/track.js");
let skS, furnS, stopsS;
// (CLASS T, rule 39) the rail doc + the hero bridges' notes, as main.js railBedP (--old: none, ?rail=old)
const RAIL = await (async () => {
  const rd = await imp("viewer/rail/railData.js"), rk = await imp("viewer/rail/roadDeck.js");
  const doc = rd.prepRail(json(join(ROOT, "data/rail/rail.json")));
  const heroes = rd.heroBridgeNames(true).map((n) => json(join(ROOT, "models/rail", `${n}.json`))).filter(Boolean);
  const decks = heroes.filter((h) => h.kind === "road_over_rail").map(rk.deckHeightFn);
  const deckY = (x, z) => { for (const f of decks) { const y = f(x, z); if (y != null) return y; } return null; };
  const bed = rd.railBed(doc, S.bounds, heroes);
  const lift = (d, paths) => { if (!d) return d; for (const path of paths) { let arr = d; for (const k of path) arr = arr?.[k]; if (Array.isArray(arr)) for (const p of arr) { if (typeof p?.x !== "number") continue; const y = deckY(p.x, p.z); if (y != null && y > p.y) p.y = y; } } return d; };
  return { bed, deckY, lift };
})();
const RAIL_ON = !OLD && !RAILOLD;
if (!RAIL_ON) RAIL.off = true;
if (OLD) {
  // ?streetprops=old: the data as built before (viewer/streetkit/cityStreetKit.js streetKitOld, streetlifeWorker.js)
  if (sk.signsOld) sk.signs = sk.signsOld;
  for (const p of sk.posts || []) if (p.was) [p.x, p.y, p.z] = p.was;
  for (const v of sk.villo || []) if (v.was) Object.assign(v, v.was);
  for (const it of [...(sl.plates || []), ...(sl.postboxes || [])]) if (it.was) [it.x, it.y, it.z] = it.was;
  const snap = (doc, paths) => (doc && fit ? docOffLanes(doc, paths, lanes, fit).doc : doc);
  skS = snap(sk, [["signs"], ["posts"]]);
  furnS = snap(furn, [["benches"], ["bins"], ["hoops"], ["boxes"], ["banks"]]);
  stopsS = snap(stops, [["stops", "pole"], ["stops", "shelter"], ["panels"]]);
} else {
  // main.js loadTile since claude/streetprops: lanes also without a measured street, the tram tracks, the OSM width;
  // the plate posts not moved at load (baked with their plates); the stops without the tram test
  const tracks = trackIndex((S.feats.lines || []).filter((l) => l.kind === "tram").map((l) => smoothPolyline(l.line)));
  // (CLASS T, rule 39) + the track beds (railData.js railBed; main.js propOpt.rail), the furniture inside a hero road
  // bridge dropped (its model draws the deck's benches), the rest lifted onto its deck (main.js deckDoc heroDeckY)
  const R = RAIL.off ? null : RAIL;
  const o = { osm: true, far: !FAROLD, tram: tracks, ...(R ? { rail: R.bed } : {}) };
  const snap = (doc, paths, op = o) => (doc ? docOffLanes(doc, paths, lanes, fit, op).doc : doc);
  skS = R ? R.lift(snap(sk, [["signs"]]), [["signs"]]) : snap(sk, [["signs"]]);
  furnS = snap(furn, [["benches"], ["bins"], ["hoops"], ["boxes"], ["banks"]], R ? { ...o, drop: (p) => R.bed.inHero(p.x, p.z) } : o);
  stopsS = snap(stops, [["stops", "pole"], ["stops", "shelter"], ["panels"]], { osm: true, far: !FAROLD, keep: (p) => p.platform, ...(R ? { rail: R.bed } : {}) });
  if (R) R.lift(stopsS, [["stops", "pole"], ["stops", "shelter"], ["panels"]]);
}
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
    // (claude/streetprops) not when a carriageway runs between them: a one-way pair's C1 on the island nose and F19 at the
    // other carriageway's kerb address the two carriageways, as in Belgium
    const between = a !== b && [0.2, 0.35, 0.5, 0.65, 0.8].some((t) => S.driven.inside(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0));
    if (d < 4 && facing > Math.cos(Math.PI / 4) && !between) {
      counts.signFacing++; counts.signConflict = (counts.signConflict || 0) + 1;
      items.signFacing.push({ why: a === b ? "C1 + F19 on one pole" : "C1 and F19 face the same traffic", codes: "C1/F19", off: 180, at: at(a.x, a.z), street: nameAt(a.x, a.z) });
    }
  }
}

// ---- the parking bays + the parked cars main.js keeps (viewer/streets/parkPlace.js widthParking, cityStreetKit.keepCarsClear)
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { parkBays, carsKept, inCar, bayAvoid } = await import("../../streetkit/parkBays.mjs");
const { TRAM_CLEAR } = await imp("viewer/streets/carriageway.js");
const parkSites = fit ? widthParking(S.roads, S.feats, S.bounds, fit).sites : [];
const tracksB = trackIndex((S.feats.lines || []).filter((l) => l.kind === "tram").map((l) => smoothPolyline(l.line)));
const BAYS = parkBays(parkSites, (x, z) => (fit ? fit.classAt(x, z) : -1), (x, z) => tracksB.dist(x, z), TRAM_CLEAR, bayAvoid(S.feats));

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
  // (round 3) a piece in a parking bay (tools/streetkit/parkBays.mjs: the parked cars' slots, off the tram road) is not
  // in the road: real Villo stations stand in the parking lane (the parked cars keep off them: villoCarOverlap below)
  for (const [k, p] of pieces) if (OLD || !BAYS.bay(p.x, p.z)) test(`villo ${k}`, p.x, p.z, { id: v.id });
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
// a tram stop's pole on an OSM tram platform (tools/stops/build_stops.py: on the platform's centre line; tram.js draws the
// slab there, UrbIS calls the spot tram road): not in the road (census false positives, e.g. Globe E4, Churchill G2)
const { isTramPlatform, platformRing, inRing2, TRAM_PLATFORM } = await imp("viewer/drive/colliders.js");
const plats = (S.feats.lines || []).filter(isTramPlatform), platRings = plats.map(platformRing).filter(Boolean);
const platLines = lineIndex(plats.filter((l) => !platformRing(l)).map((l) => l.line));
const onPlatformOsm = (x, z) => platRings.some((r) => inRing2(r, x, z)) || (platLines.dist(x, z, 4)?.d ?? 9) <= TRAM_PLATFORM.W / 2 + 0.2;
// (claude/defects1) the platforms as DRAWN (fitted beside their tracks, S.platforms), not where OSM put them; --old / --platold: OSM
const onPlatform = OLD || PLATOLD ? onPlatformOsm : (x, z) => S.platforms.some((l) => TP.onPlatform(l, x, z));
counts.onPlatform = 0; counts.platInLane = 0;   // (info) poles on a drawn platform that a driven lane covers (the platform slab in the lane: tramfit's class, not a prop)
for (const s of stopsS?.stops || []) {
  if (s.pole?.platform && onPlatform(s.pole.x, s.pole.z)) { counts.onPlatform++; if (lanes.inside(s.pole.x, s.pole.z, 0)) counts.platInLane++; if (s.shelter) test("shelter", s.shelter.x, s.shelter.z, { stop: s.fr }); continue; }
  if (s.pole) test("stop pole", s.pole.x, s.pole.z, { stop: s.fr }); if (s.shelter) test("shelter", s.shelter.x, s.shelter.z, { stop: s.fr }); }
for (const p of stopsS?.panels || []) test("ad panel", p.x, p.z);

// (claude/streetprops, round 2) every Villo station as ONE straight row on paving: docks (or the 1.5 m of bike in front
// of them) off the measured sidewalk / square / parking, and rows bent (a dock > 0.3 m off the line through its ends)
counts.villoOffPaving = 0; counts.villoBent = 0; items.villo = [];
if (fit) for (const v of sk.villo || []) {
  if (!v.docks.length || !inB(v.docks[0].x, v.docks[0].z)) continue;
  const d0 = v.docks[0], nx = Math.sin(d0.yaw), nz = Math.cos(d0.yaw), C = (x, z) => fit.classAt(x, z);
  const PAVE = new Set([3, 4, 5]), paved = (x, z) => PAVE.has(C(x, z)) || BAYS.bay(x, z);
  const off = v.docks.filter((d) => !paved(d.x, d.z) || !paved(d.x + nx * 1.5, d.z + nz * 1.5)).length;
  const tx = nz, tz = -nx, u = (d) => d.x * tx + d.z * tz, row = [...v.docks].sort((a, b) => u(a) - u(b));
  const a = row[0], b = row[row.length - 1], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const bent = row.some((d) => Math.abs(((d.x - a.x) * (b.z - a.z) - (d.z - a.z) * (b.x - a.x)) / L) > 0.3);
  counts.villoOffPaving += off; if (bent) counts.villoBent++;
  if (off || bent) items.villo.push({ id: v.id, name: v.name, off, bent, at: at(d0.x, d0.z) });
}
// no parked car (the ones main.js keeps) over a Villo dock or bike
counts.villoCarOverlap = 0;
{
  const kept = carsKept(parkSites, sk.villo);
  for (const v of sk.villo || []) for (const p of [...v.docks, ...v.bikes]) if (inB(p.x, p.z) && kept.some((c) => inCar(c, p.x, p.z, 0.1))) { counts.villoCarOverlap++; items.villo.push({ id: v.id, name: v.name, car: true, at: at(p.x, p.z) }); }
}
// (CLASS T, rule 39) every drawn piece on a track bed (railData.js railBed: within BED_CLEAR of a track on the ground, at
// the rail's level, not on a road deck), and every piece inside a hero road bridge seated > 1.5 m under its deck (in
// the cutting under it: Verrewinkel's OSM bench + bin stood on the rails)
counts.onRail = 0; counts.inHero = 0; items.onRail = [];
{
  const chk = (kind, p) => {
    if (!p || typeof p.x !== "number" || !inB(p.x, p.z)) return;
    if (RAIL.bed.on(p.x, p.z, p.y)) { counts.onRail++; items.onRail.push({ kind, why: "on a track bed", at: at(p.x, p.z), y: p.y }); }
    const hy = RAIL.deckY(p.x, p.z);
    if (hy != null && typeof p.y === "number" && p.y < hy - 1.5) { counts.inHero++; items.onRail.push({ kind, why: "under a hero road deck (in its cutting)", at: at(p.x, p.z), y: p.y, deck: +hy.toFixed(2) }); }
  };
  for (const k of ["benches", "bins", "hoops", "boxes", "banks"]) for (const p of furnS?.[k] || []) chk(k, p);
  for (const p of skS?.signs || []) chk("sign", p);
  for (const p of skS?.posts || []) chk("plate post", p);
  for (const s of stopsS?.stops || []) { chk("stop pole", s.pole); chk("shelter", s.shelter); }
  for (const p of stopsS?.panels || []) chk("ad panel", p);
  for (const p of sl.postboxes || []) chk("postbox", p);
  for (const v of sk.villo || []) for (const p of [v.totem, ...(v.docks || []), ...(v.bikes || [])]) chk("villo", p);
}
// stable ids (rule gap-register): one finding per drawn piece, its element = its data id or kind@x,z
const findings = [];
{
  const el = (it) => `${String(it.id ?? it.kind ?? "plate").replace(/[:\s]+/g, "_")}@${String(it.at).replace(/\s/g, "")}`;
  const add = (inv, it, cause, info) => findings.push({ id: `streetprops.${inv}:${el(it)}:0-0`, tile: T, inv, at: it.at, street: it.street ?? it.stop ?? it.name, cause, info });
  for (const it of items.plateGap) add("plateGap", it, "source-data", it.what);
  for (const it of items.signFacing) add(it.codes === "C1/F19" ? "signConflict" : "signFacing", { ...it, kind: `sign-${it.codes}` }, "sign-data", it.why);
  for (const it of items.inRoad) add("inRoad", it, it.tram && !it.lane ? "tram-envelope" : "lane-data", `${it.kind}${it.tram ? " (tram)" : ""} ${it.deep} m in`);
  for (const it of items.villo) add("villo", { ...it, kind: `villo${it.car ? "Car" : it.bent ? "Bent" : "Off"}` }, "lane-data", it.name);
  for (const it of items.onRail) add(it.why.startsWith("on a track") ? "onRail" : "inHero", it, "source-data", it.kind);
}
console.log(JSON.stringify({ tile: T, counts, items, findings }));
