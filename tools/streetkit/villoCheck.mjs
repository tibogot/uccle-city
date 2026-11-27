// VILLO ROWS: nothing standing in a station's row, the row on its paving (claude/fixes4 2026-11-27, rule villo-row-clear)
//
// Why: the rows are laid out at build time (tools/streetkit/build_streetkit.py place_villo, then snapProps.mjs relays the
// ones that are off paving / bent) and the poles of the city come from OTHER layers, several placed only at load
// (lamps: viewer/streets/lampPlace.js, kept off the docks by cityStreetKit.keepLampsClear; sign poles moved out of the
// lanes by main.js docOffLanes; the tram poles: viewer/streets/tramPoles.js). snapProps' relay looked at the ground
// class only (no pole, tree, bench, bollard); keepLampsClear kept a lamp 1.2 m from each dock's POINT while the bike
// in it reaches 1.9 m toward the road, so the lamps at the kerb (0.5 m behind it) stood among the bikes; and a row's
// dock bases / bike tyres were tested at three points on the dock's centre line only, so an end dock's 0.6 m-wide
// base could hang over the kerb edge where the kerb bends away (Rond-Point Churchill).
//
// This check rebuilds every station's footprint (viewer/streetkit/villoFootprint.js: the one shape the builder, the
// lamp keep-out and this check share) and lists, per station, every pole / trunk / furniture piece the city draws
// inside it, and every footprint corner off paving. Exit 1 on any finding.
//   node --import ./tools/road_audit/register.mjs tools/streetkit/villoCheck.mjs [--all | T ...] [--jobs N] [--quiet]
import { join } from "node:path";
import { streetTile, runTiles, cli, json, ROOT, imp, allTiles } from "../audit/census/lib_street.mjs";

const { CHILD, TILES, JOBS } = cli();
const QUIET = process.argv.includes("--quiet");
if (!CHILD) {
  const want = TILES.length ? TILES : allTiles();
  const withVillo = want.filter((t) => (json(join(ROOT, "data/streetkit", `${t}.json`))?.villo || []).some((v) => v.docks?.length));
  const res = await runTiles(new URL(import.meta.url), withVillo, { jobs: JOBS, log: false, extra: process.argv.includes("--lampold") ? ["--lampold"] : [] });
  let n = 0, st = 0;
  for (const r of res) {
    if (r.error) { console.log(`${r.tile}: ERROR ${r.error}`); n++; continue; }
    for (const e of r.self || []) { console.log(`${r.tile} SELF-TEST: ${e}`); n++; }
    for (const s of r.stations) {
      st++;
      const bad = s.hits.length + s.offPaving.length;
      if (bad) n += bad;
      if (bad || !QUIET) console.log(`${r.tile} ${s.id} ${s.name}: ${s.docks} docks, ${s.hits.length} in the row${s.hits.length ? " (" + s.hits.map((h) => `${h.kind} ${h.x},${h.z}`).join("; ") + ")" : ""}, ${s.offPaving.length} corners off paving${s.offPaving.length ? " (" + s.offPaving.join("; ") + ")" : ""}`);
    }
  }
  console.log(`villo rows: ${st} stations, ${n} findings`);
  process.exit(n || res.some((r) => r.error) ? 1 : 0);
}

const T = TILES[0];
const S = await streetTile(T);
const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
const { lampKeepClear, villoCorners, villoObstacleHit } = await imp("viewer/streetkit/villoFootprint.js");
const { villoThings } = await import("./villoThings.mjs");
const { fit, roads, bounds } = S;
const sk = json(join(ROOT, "data/streetkit", `${T}.json`)) || {};
const r1 = (v) => Math.round(v * 10) / 10;
// every upright thing the city draws near the row (tools/streetkit/villoThings.mjs, as snapProps lays the rows out) + the
// lamps, placed at load as the city does (cityStreetKit.keepLampsClear = villoFootprint.js lampKeepClear; --lampold: the
// rule before fixes4)
const things = await villoThings(S, sk);
const lampPlace = lampKeepClear(fit?.placeLamp || null, sk, { old: process.argv.includes("--lampold") });
for (const p of placedLampSites(roads, bounds, lampPlace)) things.push({ x: p.x, z: p.z, r: 0.2, kind: "lamp" });

const PAVE = new Set([3, 4, 5]);
const stations = [];
for (const v of sk.villo || []) {
  if (!v.docks?.length) continue;
  const hits = things.filter((t) => villoObstacleHit(v, t.x, t.z, t.r)).map((t) => ({ kind: t.kind, x: r1(t.x), z: r1(t.z) }));
  const offPaving = fit ? villoCorners(v).filter(([x, z]) => !PAVE.has(fit.classAt(x, z))).map(([x, z]) => `${r1(x)},${r1(z)}${process.env.CLS ? "=" + fit.classAt(x, z) : ""}`) : [];
  stations.push({ id: v.id, name: v.name, docks: v.docks.length, hits, offPaving });
}
// mutation tests (the check must see what slipped through before): a lamp in a bike 1.5 m in front of its dock (1.5 m off
// the dock's point: the old 1.2 m rule let it stand) and a dock base corner 0.25 m past a kerb are findings
const self = [];
for (const v of (sk.villo || []).filter((v) => v.docks?.length).slice(0, 1)) {
  const d = v.docks[Math.floor(v.docks.length / 2)], nx = Math.sin(d.yaw), nz = Math.cos(d.yaw);
  const lx = d.x + nx * 1.5, lz = d.z + nz * 1.5;
  if (!villoObstacleHit(v, lx, lz, 0.2)) self.push("a lamp among the bikes is not seen");
  const old = lampKeepClear(null, { villo: [v] }, { old: true }), now = lampKeepClear(null, { villo: [v] });
  const q0 = old({ x: lx, z: lz, yaw: d.yaw }), q1 = now({ x: lx, z: lz, yaw: d.yaw });
  if (!(q0 && q0.x === lx && q0.z === lz)) self.push("the old lamp rule did not let the lamp stand (mutation test broken)");
  if (q1 && villoObstacleHit(v, q1.x, q1.z, 0.2)) self.push("lampKeepClear left a lamp in the row");
  // (Churchill's class) the dock's centre 0.3 m inside the paving, its bike's tyre past the paving's edge toward the road
  if (fit) {
    let e = 0; while (e < 12 && PAVE.has(fit.classAt(d.x + nx * e, d.z + nz * e))) e += 0.05;
    const m = { ...d, x: d.x + nx * (e - 0.3), z: d.z + nz * (e - 0.3) };
    if (e < 12 && PAVE.has(fit.classAt(m.x, m.z)) && !villoCorners({ docks: [m] }).some(([x, z]) => !PAVE.has(fit.classAt(x, z)))) self.push("a row reaching past the paving's edge is not seen");
  }
}
console.log(JSON.stringify({ tile: T, stations, self }));
