// STREET AUDIT (citydefects 2026-11-16, owner playtest: traffic lights and tram poles in the road, lights turned the
// wrong way, parked cars where there is no parking / that block the street). Runs WITHOUT the browser: the tile worker's
// road stage per tile (tools/road_audit/tile.mjs -> viewer/roadBuild.js), then the city's own placement code, which is
// three-free since citydefects (viewer/streets/: signalPlace, tramPoles, lampPlace, parkPlace, fitCore, carriageway).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/streetAudit.mjs [--out docs/citydefects/street_audit.json] T... | --all
//
// Per tile, "before" (the placement before citydefects) and "after" (the default now):
//   (data layers: "after" = moved behind the nearest kerb at load, viewer/streets/carriageway.js docOffLanes)
//   inLane     posts whose centre is inside a driven lane (viewer/streets/carriageway.js lanesOnly: the measured UrbIS
//              classes roadway / tram road where the tile has them, else the OSM carriageway band; a parking bay is
//              not a lane: Brussels bike boxes stand in them), by kind:
//              signal, tramPole, lamp, and the data layers (data/furniture benches / bins / hoops / boxes / banks,
//              data/streetkit signs / posts, data/stops poles / shelters / panels)
//   heading    signal heads not facing their traffic (the head's facing vs the coming cars' direction > 45 deg)
//   parking    parked cars on a side OSM tags parking=no / no_stopping / no_parking; cars leaving less than PASS m
//              of carriageway beside them (to the far kerb, minus a car parked opposite within 6 m)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, allTiles, ROOT } from "../road_audit/tile.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway, offLane } = await imp("viewer/streets/carriageway.js");
const { signalSites } = await imp("viewer/streets/signalPlace.js");
const { tramPoleSites } = await imp("viewer/streets/tramPoles.js");
const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
const { carSites, parkingClear, widthParking } = await imp("viewer/streets/parkPlace.js");
const { buildTrafficGraph } = await imp("viewer/traffic/trafficGraph.js");
const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");   // (one builder with the worker, rule 38)

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const OUT = opt("--out", null), ALL = flag("--all");
const TILES = ALL ? allTiles() : argv.map((t) => t.toUpperCase());
if (!TILES.length) { console.error("usage: streetAudit.mjs [--out FILE] T... | --all"); process.exit(2); }
const PASS = 3.0;              // m: the least free carriageway beside a parked car (one car width + margins)
const CAR_HALF = 0.9;

// OSM parking restrictions per way (data/raw/osm/area.json), by side of the way's own direction
const NOPARK = new Set(["no", "no_parking", "no_stopping", "separate"]);
const osmPark = new Map();
{
  const raw = JSON.parse(readFileSync(join(ROOT, "data/raw/osm/area.json"), "utf8")).elements;
  for (const e of raw) {
    if (e.type !== "way" || !e.tags?.highway) continue;
    const t = e.tags, side = (s) => t[`parking:${s}`] ?? t[`parking:lane:${s}`] ?? t["parking:both"] ?? t["parking:lane:both"] ?? (t[`parking:${s}:restriction`] === "no_stopping" || t["parking:both:restriction"] === "no_stopping" ? "no_stopping" : null);
    const l = side("left"), r = side("right");
    if (l || r) osmPark.set(e.id, { left: l, right: r });
  }
}

const json = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const results = [];
for (const T of TILES) {
  const t0 = Date.now();
  let tile;
  try { tile = loadTile(T); } catch (e) { console.error(`${T}: ${e.message}`); continue; }
  const { roads, feats, bounds, rd } = tile;
  const inB = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  const fit = rd.surfaceData ? streetFit(rd.surfaceData) : null;
  const driven = carriageway(roads, { classAt: fit?.classAt });
  const lanes = carriageway(roads, { classAt: fit?.classAt, lanesOnly: true });   // the audit's test: the driven lanes
  const R = { tile: T, measured: !!fit, before: {}, after: {}, heading: {}, parking: {}, worst: [] };
  const inLane = (list, kind, which) => {
    const bad = list.filter((p) => inB(p.x, p.z) && lanes.inside(p.x, p.z, 0));
    R[which][kind] = { n: list.filter((p) => inB(p.x, p.z)).length, inLane: bad.length, deep: bad.filter((p) => lanes.inside(p.x, p.z, 0.6)).length };   // deep: >= 0.6 m into the lane (not a kerb-line rounding)
    for (const p of bad.slice(0, 3)) R.worst.push({ which, kind, x: +p.x.toFixed(1), z: +p.z.toFixed(1) });
  };
  // signals
  const sOld = signalSites(feats.points, roads, { old: true }), sNew = signalSites(feats.points, roads, { fit, driven });
  inLane(sOld, "signal", "before"); inLane(sNew, "signal", "after");
  const wrongHead = (list) => list.filter((p) => inB(p.x, p.z)).filter((p) => {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);       // the head's facing (local -z)
    return fx * -p.tx + fz * -p.tz < Math.cos(Math.PI / 4);    // it must face the coming cars: -travel
  }).length;
  R.heading = { before: wrongHead(sOld), after: wrongHead(sNew), of: sNew.filter((p) => inB(p.x, p.z)).length };
  // tram poles
  const tram = (feats.lines || []).filter((l) => l.kind === "tram");
  inLane(tramPoleSites(tram, inB, { old: true }), "tramPole", "before");
  inLane(tramPoleSites(tram, inB, { fit, driven }), "tramPole", "after");
  // lamps (as the city: moved onto the measured sidewalk)
  const lamps = placedLampSites(roads, bounds, fit?.placeLamp);
  inLane(lamps, "lamp", "before"); inLane(lamps, "lamp", "after");
  // data layers (unchanged by citydefects: before = after)
  const furn = json(join(ROOT, "data/furniture", `${T}.json`)), sk = json(join(ROOT, "data/streetkit", `${T}.json`)), stops = json(join(ROOT, "data/stops", `${T}.json`));
  const layers = {
    bench: furn?.benches, bin: furn?.bins, hoop: furn?.hoops, box: furn?.boxes, bank: furn?.banks,
    sign: sk?.signs, post: sk?.posts,
    stopPole: (stops?.stops || []).map((s) => s.pole), shelter: (stops?.stops || []).filter((s) => s.shelter).map((s) => s.shelter), adpanel: stops?.panels,
  };
  // after: main.js moves each point in a driven lane behind the nearest kerb (carriageway.js docOffLanes)
  for (const [k, list] of Object.entries(layers)) if (list?.length) {
    inLane(list, k, "before");
    inLane(list.map((p) => (p && typeof p.x === "number" ? { ...p, ...offLane(p.x, p.z, lanes, fit) } : p)).filter(Boolean), k, "after");
  }
  // parked cars (as main.js: the lanes before the width fit, each against the measured kerb)
  const carRoads = fit ? { ...roads, roads: roads.roads.map((r) => (r.meta?.widthFit ? { ...r, lanes: r.meta.unfitLanes ?? undefined } : r)) } : roads;
  const cars = carSites(carRoads, feats, bounds, fit?.placeCar);
  let noPark = 0, narrow = 0;
  for (const c of cars) {
    const nr = driven.nearest(c.x, c.z);
    if (!nr) continue;
    const way = +(/^r(\d+)_/.exec(nr.road.id)?.[1] ?? NaN), pk = osmPark.get(way);
    // side of the OSM way: roads.json keeps the way's direction (a -> b), nr.side +1 = right
    const v = pk ? (nr.side > 0 ? pk.right : pk.left) : null;
    if (v && NOPARK.has(v)) { noPark++; if (R.worst.length < 40) R.worst.push({ kind: "car on no-parking side", tag: v, way, x: +c.x.toFixed(1), z: +c.z.toFixed(1) }); }
    // free width: from the car's centre toward the road's centre line, across to the far kerb
    if (fit) {
      const dx = nr.px - c.x, dz = nr.pz - c.z, L = Math.hypot(dx, dz);
      if (L < 0.3) continue;
      const ux = dx / L, uz = dz / L;
      let d = 0.2;
      while (d < 30 && driven.inside(c.x + ux * d, c.z + uz * d, 0)) d += 0.2;
      let free = d - CAR_HALF;
      for (const o of cars) {        // a car parked opposite within 6 m along
        if (o === c) continue;
        const ox = o.x - c.x, oz = o.z - c.z, across = ox * ux + oz * uz, along = Math.abs(-ox * uz + oz * ux);
        if (across > 1.5 && across < d + 1 && along < 6) free = Math.min(free, across - 2 * CAR_HALF);
      }
      if (free < PASS) { narrow++; if (R.worst.length < 60) R.worst.push({ kind: "car leaves < 3 m", free: +free.toFixed(2), x: +c.x.toFixed(1), z: +c.z.toFixed(1) }); }
    }
  }
  // after: the city's filter (parkPlace.js parkingClear: off the traffic lanes, >= 3 m left)
  const graph = buildTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid);
  const pc = parkingClear(cars, { graph, inside: (x, z) => driven.inside(x, z), nearest: driven.nearest });
  const onLaneBefore = parkingClear(cars, { graph }).onLane;
  // the width rule (parkPlace.js widthParking, the default since the coordinator's call): its cars vs the traffic lanes
  // and the free width left
  const wp = widthParking(roads, feats, bounds, fit);
  const graphW = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid, { parked: wp.sites, roofs: tile.roofs });   // as the worker builds it
  const wpLane = parkingClear(wp.sites, { graph: graphW }).onLane;
  const narrowStretches = graphW.nOff ? graphW.nOff[graphW.paths] : 0;
  const wpNarrow = parkingClear(wp.sites, { inside: (x, z) => driven.inside(x, z), nearest: driven.nearest }).narrow;
  R.width = { cars: wp.sites.length, onTrafficLane: wpLane, leavesUnder3m: wpNarrow, narrowStretches, parkBlocked: graphW.stats.fit.parkBlocked || 0, ...wp.stats };
  R.parking = { cars: cars.length, onNoParkingSide: noPark, leavesUnder3m: narrow, onTrafficLane: onLaneBefore, after: { cars: pc.kept.length, droppedOnLane: pc.onLane, droppedNarrow: pc.narrow } };
  R.ms = Date.now() - t0;
  results.push(R);
  const f = (o) => Object.entries(o).filter(([, v]) => v.inLane).map(([k, v]) => `${k} ${v.inLane}/${v.n}`).join(", ") || "none";
  console.log(`${T}: in a lane before: ${f(R.before)} | after: ${f(R.after)} | heads wrong ${R.heading.before} -> ${R.heading.after}/${R.heading.of} | cars ${cars.length}: no-parking side ${noPark}, < ${PASS} m left ${narrow}, on a traffic lane ${R.parking.onTrafficLane} -> kept ${pc.kept.length} | width rule: ${R.width.cars} cars, on a lane ${R.width.onTrafficLane}, < 3 m ${R.width.leavesUnder3m}, narrow stretches ${narrowStretches} (${R.ms} ms)`);
}
const sum = { tiles: results.length, before: {}, after: {}, heading: { before: 0, after: 0, of: 0 }, parking: { cars: 0, onNoParkingSide: 0, leavesUnder3m: 0, onTrafficLane: 0, keptAfter: 0 } };
for (const r of results) {
  for (const w of ["before", "after"]) for (const [k, v] of Object.entries(r[w])) { const s = (sum[w][k] ??= { n: 0, inLane: 0, deep: 0 }); s.n += v.n; s.inLane += v.inLane; s.deep += v.deep; }
  for (const k of ["before", "after", "of"]) sum.heading[k] += r.heading[k];
  for (const k of ["cars", "onNoParkingSide", "leavesUnder3m", "onTrafficLane"]) sum.parking[k] += r.parking[k];
  sum.parking.keptAfter += r.parking.after.cars;
  sum.width ??= { cars: 0, onTrafficLane: 0, leavesUnder3m: 0, narrowStretches: 0, parkBlocked: 0, slots: 0, both: 0, one: 0, none: 0, noWidth: 0, dropped: 0, driveway: 0, taggedNo: 0, empty: 0 };
  for (const k of Object.keys(sum.width)) sum.width[k] += r.width[k] ?? 0;
}
console.log(JSON.stringify(sum, null, 1));
if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ summary: sum, tiles: results }, null, 1));
if (flag("--worst") || process.env.WORST) for (const r of results) console.log(r.tile, JSON.stringify(r.worst.filter((w) => w.which === "after")));
