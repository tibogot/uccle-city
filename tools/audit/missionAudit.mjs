// MISSION AUDIT (claude/missions, rule mission-premise, docs/POLICE_GAME.md "Missions"): every police job the dispatch
// generates has its premise TRUE in the world where it plays, at the call and for the first N seconds. Node, no browser:
// the same code the city runs (viewer/police/missionPremise.js, viewer/tramSched.js, the real TrafficSim).
//   1. tram      the real tram 92 timetable (data/transit/stib-92.json, viewer/tramSched.js: the same trips, delays and
//                blocked track as viewer/tramline.js) over SEEDS seeds: day type, clock (0-24 h), the player anywhere in
//                the built city; every spot pickTramSpot gives: no tram over the car at the call, the premise
//                (tramPremise) true every second for HOLD_S s, a tram held by the promised time (eta + 4 s, never later
//                than the quickest arrival), its front within gap + 4 m of the car, it stays put through 7 s frame gaps;
//                no spot with the trams off or outside service hours; a job on >= AVAIL_MIN of the day-time seeds
//   2. accident  every junction spot (data/game/police_spots.json) in the built city, the crash placed with a road snap
//                on the OSM network (data/roads/network.json, as the map worker snaps): both damaged cars within 12 m of
//                the scene and on the carriageway (<= 4.5 m off a road line), apart from each other, the cones on the
//                road; the premise true for HOLD_S s; no road = no job (not two cars at the raw point)
//   3. stolen    the real TrafficSim on F2 F3 G3: the stolen car taken at the call (90-320 m), held, fleeing; alive for
//                HOLD_S s in every try
//   4. speed     the same sim, every speed-limit sign spot on those tiles: the radar's speeder (pickSpeeder) is a car on
//                its way past the sign: it comes within 22 m (or is dropped by speederMissed and another picked) on
//                >= SPEED_MIN of the picks, and every spot with traffic gets a speeder past within 150 s
//   node --import ./tools/road_audit/register.mjs tools/audit/missionAudit.mjs [--quiet] [--old] [--seeds N]
//   --old: ?missions=old (the jobs as before): must FAIL (the tram stop by distance alone, cars at raw junction points).
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const argv = process.argv.slice(2);
const OLD = argv.includes("--old"), QUIET = argv.includes("--quiet");
const SEEDS = +(argv[argv.indexOf("--seeds") + 1] || 0) || 400;
globalThis.location = { search: OLD ? "?missions=old" : "" };
const { loadTile, ROOT } = await import("../road_audit/tile.mjs");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { densifyShapes, createTramSched } = await imp("viewer/tramSched.js");
const P = await imp("viewer/police/missionPremise.js");
const { X4_TRAFFIC } = await imp("viewer/traffic/trafMix.js");   // (claude/cars1: the 4x4 parked only while 0)
const { pickTramSpot, tramBlock, tramPremise, TRAM_BLOCK, arriveMin, placeAccident, accidentPremise, stolenPremise, pickSpeeder, speederMissed } = P;
const HOLD_S = 180, AVAIL_MIN = 0.8, SPEED_MIN = 0.6;

let fails = 0;
const log = (...a) => { if (!QUIET) console.log(...a); };
const check = (name, ok, msg) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const manifest = rd("data/tiles/manifest.json");
const built = manifest.tiles.filter((t) => t.status !== "missing").map((t) => t.bounds);
const inBuilt = (x, z) => built.some((b) => x >= b.x[0] && x < b.x[1] && z >= b.z[0] && z < b.z[1]);

// ---------------------------------------------------------------- 1. the tram
{
  const doc = rd("data/transit/stib-92.json"), shapes = densifyShapes(doc);
  const stopsIn = Object.values(doc.stops).filter((s) => inBuilt(s.x, s.z));
  const days = ["weekday", "saturday", "sunday"];
  const S = { n: 0, day: 0, dayGot: 0, got: 0, bad: [], overCar: 0, lateHeld: 0, far: 0, creep: 0, night: 0, nightGot: 0, etas: [], offNull: true, byArrive: 0, byBudget: 0 };
  const t0 = Date.now();
  for (let k = 0; k < SEEDS; k++) {
    const rng = mulberry(1000 + k), day = days[k % 3];
    const trips = structuredClone(doc.trips.filter((t) => t.days.includes(day)));
    const sc = createTramSched({ shapes, trips, doc });
    const T0 = rng() * 86400;
    const tl = { clockSecs: T0, timescale: 1, spots: sc.spots, shapePoint: sc.shapePoint, etaTo: sc.etaTo, fronts: sc.fronts, blockState: sc.blockState, setBlock: sc.setBlock, trackNear: sc.trackNear };
    // the player: near a stop of the built city (the line runs through it) or anywhere in it
    let Pp;
    for (let q = 0; q < 50; q++) {
      const s = stopsIn[Math.floor(rng() * stopsIn.length)], b = built[Math.floor(rng() * built.length)];
      Pp = rng() < 0.6 ? { x: s.x + (rng() - 0.5) * 1600, z: s.z + (rng() - 0.5) * 1600 } : { x: b.x[0] + rng() * 500, z: b.z[0] + rng() * 500 };
      if (inBuilt(Pp.x, Pp.z)) break;
    }
    S.n++;
    const h = T0 / 3600, isDay = h >= 7 && h < 20, isNight = h >= 1.5 && h < 4.5;
    if (isDay) S.day++;
    if (isNight) S.night++;
    let spot;
    if (OLD) {
      // as before: a stop 250-2600 m away by distance alone, the car 16 m past it (no timetable)
      const st = stopsIn.filter((s) => Math.hypot(s.x - Pp.x, s.z - Pp.z) > 250 && Math.hypot(s.x - Pp.x, s.z - Pp.z) < 2600);
      if (!st.length) continue;
      const s = st[Math.floor(rng() * st.length)], tk = sc.trackNear(s.x, s.z, 30);
      if (!tk) continue;
      const at = sc.shapePoint(tk.shape, tk.d + 16), hh = at.heading, car = { x: at.x - Math.cos(hh) * 0.7, z: at.z + Math.sin(hh) * 0.7 };
      const D = Math.hypot(car.x - Pp.x, car.z - Pp.z);
      spot = { shape: tk.shape, d: tk.d, name: s.name, at, car, D, eta: 0, lim: arriveMin(D) };
    } else spot = pickTramSpot(tl, Pp, rng, { where: inBuilt });
    if (!spot) continue;
    S.got++; if (isDay) S.dayGot++; if (isNight) S.nightGot++;
    S.etas.push(spot.eta);
    // a tram over the car at the call?
    for (const [shape, d] of sc.fronts(T0)) for (let q = 0; q <= 33; q += 3) { const p = sc.shapePoint(shape, d - q); if (p && Math.hypot(p.x - spot.car.x, p.z - spot.car.z) < 3.2) { S.overCar++; q = 99; } }
    sc.setBlock(tramBlock(spot));
    let why = null, firstHeld = null, firstDt = 0;
    for (let t = 0, tick = 0; t <= HOLD_S; tick++) {
      // frames of 0.25 s, with a 7 s gap now and then (a hidden tab): the held tram must not creep
      const dt = tick % 97 === 96 ? 7 : 0.25;
      t += dt;
      sc.holdTrips(T0 + t);
      const r = tramPremise(tl, spot, t);
      if (!r.ok && !why) why = `${t.toFixed(1)} s: ${r.why}`;
      if (r.held && firstHeld == null) { firstHeld = t; firstDt = dt; }        // (seen at the end of its frame)
      if (r.held) for (const tr of trips) {
        if (!tr._held) continue;
        const tt = sc.tripTime(tr, T0 + t), d = sc.tripD(tr, tt).d, line = sc.blockState().lines.find(([s]) => s === tr.shape)?.[1];
        if (line != null && d > line + 0.6) { S.creep++; why ||= `${t.toFixed(1)} s: held tram ${(d - line).toFixed(1)} m past the line`; }
        if (tr.shape === spot.shape) { const p = sc.shapePoint(tr.shape, d); const g = Math.hypot(p.x - spot.car.x, p.z - spot.car.z); if (g > TRAM_BLOCK.gap + 4) { S.far++; why ||= `held tram front ${g.toFixed(1)} m from the car`; } }
      }
    }
    if (firstHeld != null && firstHeld - firstDt <= spot.lim + 0.5) S.byArrive++;
    if (firstHeld != null && firstHeld - firstDt <= Math.min(HOLD_S, (Math.max(200, spot.D) * 1.45 / 8.5 + 45))) S.byBudget++;
    if (firstHeld == null || firstHeld - firstDt > spot.eta + 4.5) { S.lateHeld++; why ||= `no tram held by ${(spot.eta + 4).toFixed(0)} s (first ${firstHeld?.toFixed(1) ?? "never"})`; }
    if (OLD && firstHeld != null && firstHeld > spot.lim) why ||= `the tram came at ${firstHeld.toFixed(0)} s, after the player (${spot.lim.toFixed(0)} s)`;
    if (why) S.bad.push(`${day} ${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")} ${spot.name}: ${why}`);
  }
  S.offNull = pickTramSpot(null, { x: 0, z: 0 }, Math.random) === null;
  S.etas.sort((a, b) => a - b);
  const med = S.etas.length ? S.etas[S.etas.length >> 1] : NaN, held0 = S.etas.filter((e) => e === 0).length;
  log(`tram: ${S.n} seeds in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${S.got} jobs (${held0} with a tram held at the call), eta median ${med.toFixed(0)} s, max ${(S.etas.at(-1) ?? 0).toFixed(0)} s; a tram held behind the car by the player's quickest arrival in ${S.byArrive} / ${S.got}, by the job's own drive-time budget in ${S.byBudget} / ${S.got}`);
  for (const b of S.bad.slice(0, 12)) log(`  ${b}`);
  check("tram: the premise holds", S.got > 0 && !S.bad.length, `${S.got - S.bad.length} / ${S.got} jobs: a tram held behind the car by the promised time and for ${HOLD_S} s (7 s frame gaps included)${S.bad.length ? `; ${S.bad.length} broken, e.g. ${S.bad[0]}` : ""}`);
  check("tram: never inside a tram", !S.overCar, `${S.overCar} cars put where a tram stood`);
  check("tram: held right behind the car", !S.far && !S.creep, `${S.far} held fronts > ${TRAM_BLOCK.gap + 4} m from the car, ${S.creep} creeping past the line`);
  check("tram: no job without trams", S.offNull && (OLD || S.nightGot === 0), `trams off -> ${S.offNull ? "none" : "a job"}; 01:30-04:30 (no service) ${S.nightGot} jobs of ${S.night} seeds`);
  check("tram: the job still comes", S.day > 0 && S.dayGot / S.day >= AVAIL_MIN, `${S.dayGot} / ${S.day} day-time seeds (07-20 h) give a job (>= ${AVAIL_MIN * 100} %)`);
}

// ---------------------------------------------------------------- 2. the accident
{
  const net = rd("data/roads/network.json"), nodes = new Map(net.nodes.map((n) => [n.id, n]));
  const segs = [], grid = new Map(), G = 40, gk = (i, j) => i * 100003 + j;
  for (const r of net.roads) {
    if (!r.type || /path|foot|cycle|steps|track|service_alley/.test(r.type) || /footway|path|cycleway|steps|pedestrian|track/.test(r.meta?.highway || "")) continue;
    const a = nodes.get(r.a), b = nodes.get(r.b); if (!a || !b) continue;
    const pts = [[a.x, a.z], ...(r.pts || []).map((p) => (Array.isArray(p) ? p : [p.x, p.z])), [b.x, b.z]];
    for (let k = 1; k < pts.length; k++) {
      const s = [pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]], id = segs.push(s) - 1;
      for (let i = Math.floor(Math.min(s[0], s[2]) / G); i <= Math.floor(Math.max(s[0], s[2]) / G); i++)
        for (let j = Math.floor(Math.min(s[1], s[3]) / G); j <= Math.floor(Math.max(s[1], s[3]) / G); j++) { const q = gk(i, j); if (!grid.has(q)) grid.set(q, []); grid.get(q).push(id); }
    }
  }
  /** the nearest road line point within maxD: { x, z, yaw (atan2(dz, dx), the map worker's dir), d } | { none } */
  const near = (x, z, maxD = 30) => {
    let best = null, bd = maxD;
    for (let i = Math.floor((x - maxD) / G); i <= Math.floor((x + maxD) / G); i++) for (let j = Math.floor((z - maxD) / G); j <= Math.floor((z + maxD) / G); j++)
      for (const id of grid.get(gk(i, j)) || []) {
        const [ax, az, bx, bz] = segs[id], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        const px = ax + dx * u, pz = az + dz * u, d = Math.hypot(px - x, pz - z);
        if (d < bd) { bd = d; best = { x: px, z: pz, yaw: Math.atan2(dz, dx), d }; }
      }
    return best || { none: true };
  };
  const snap = async (x, z) => near(x, z, 30);
  const J = rd("data/game/police_spots.json").junction.filter((j) => inBuilt(j.x, j.z));
  const bad = [], raw = [];
  let n = 0, none = 0;
  for (const [k, j] of J.entries()) {
    const rng = mulberry(77 + k);
    const r = await placeAccident(j, snap, rng, { old: OLD });
    if (!r) { none++; continue; }
    n++;
    const why = [];
    for (const [nm, c] of [["A", r.A], ["B", r.B]]) {
      const dS = Math.hypot(c.x - r.x, c.z - r.z), dR = near(c.x, c.z, 30);
      if (dS > 12) why.push(`car ${nm} ${dS.toFixed(1)} m from the scene`);
      if (dR.none || dR.d > 4.5) why.push(`car ${nm} ${dR.none ? "> 30" : dR.d.toFixed(1)} m off the road`);
    }
    if (Math.hypot(r.A.x - r.B.x, r.A.z - r.B.z) < 2.2) why.push("the two cars inside each other");
    for (const [x, z] of r.cones) { const dR = near(x, z, 30); if (dR.none || dR.d > 5) { why.push(`a cone ${dR.none ? "> 30" : dR.d.toFixed(1)} m off the road`); break; } }
    if (!r.onRoad) raw.push(j.name);
    // the premise over HOLD_S s (the cars stay in the props' list)
    const scene = { ready: true, x: r.x, z: r.z, a: { ...r.A }, b: { ...r.B } }, cars = [scene.a, scene.b];
    for (let t = 0; t <= HOLD_S; t += 5) { const p = accidentPremise(scene, cars, t); if (!p.ok) { why.push(`${t} s: ${p.why}`); break; } }
    if (why.length) bad.push(`${j.name} (${j.x}, ${j.z}): ${why.join("; ")}`);
  }
  // no road: no scene (new), and a removed car breaks the premise
  const off = await placeAccident({ x: 0, z: 0, name: "nowhere" }, async () => ({ none: true }), mulberry(1), { old: OLD });
  const sc = { ready: true, x: 0, z: 0, a: { x: 0, z: 0 }, b: { x: 3, z: 0 } };
  const gone = accidentPremise(sc, [sc.a], 10), wait = accidentPremise({ ready: false }, [], 2), late = accidentPremise({ ready: false }, [], 9);
  log(`accident: ${J.length} junction spots in the built city, ${n} scenes, ${none} without a road`);
  for (const b of bad.slice(0, 6)) log(`  ${b}`);
  check("accident: two cars on the road at the scene", n > 0 && !bad.length, `${n - bad.length} / ${n} scenes: both damaged cars within 12 m of the scene and <= 4.5 m off a road line, apart, the cones on the road, the premise true for ${HOLD_S} s${bad.length ? `; ${bad.length} wrong, e.g. ${bad[0]}` : ""}`);
  check("accident: no road, no scene", off === null && !raw.length, `no road snap -> ${off === null ? "no job" : "two cars at the raw point"}; ${raw.length} scenes off the snap`);
  check("accident: the premise watch", !gone.ok && wait.ok && !late.ok, `a car gone -> ${gone.ok ? "ok (wrong)" : gone.why}; scene not ready at 2 s -> ${wait.ok ? "waits" : wait.why}, at 9 s -> ${late.ok ? "ok (wrong)" : late.why}`);
}

// ---------------------------------------------------------------- 3 + 4. the traffic: the stolen car, the speeder
{
  const t0 = Date.now();
  const { streetFit } = await imp("viewer/streets/fitCore.js");
  const { widthParking } = await imp("viewer/streets/parkPlace.js");
  const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");
  const { TrafficWorld } = await imp("viewer/traffic/trafficWorld.js");
  const { TrafficSim, STEP } = await imp("viewer/traffic/trafficSim.js");
  const { parseCarGlb } = await imp("viewer/drive/carLod.js");
  const { signalClock } = await imp("viewer/traffic/signals.js");
  const { TrafficCarTarget, takeTrafficCar } = await imp("viewer/game/entities.js");
  let simClock = 0;
  signalClock.now = () => simClock;
  const TILES = ["F2", "F3", "G3"], W = new TrafficWorld(), bounds = [];
  for (const T of TILES) {
    const { roads, feats, bounds: b, rd: r, roofs } = loadTile(T);
    bounds.push(b);
    const wp = widthParking(roads, feats, b, streetFit(r.surfaceData));
    W.add(T, tileTrafficGraph(r.net, roads, feats, b, r.surfaceData.grid, { parked: wp.sites, roofs }));
  }
  const fleetSrc = readFileSync(join(ROOT, "viewer/carFleet.js"), "utf8");
  const TYPE_MIX = JSON.parse(/export const TYPE_MIX = (\[.*?\]);/s.exec(fleetSrc)[1]);
  const c2 = (() => { const b = readFileSync(join(ROOT, "models/cars/cars2.glb")); return parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); })();
  const types = TYPE_MIX.map(([name, w]) => {
    const c = c2.find((q) => q.id === name), s = c.extras.size, wf = c.parts.find((p) => p.name === "Wheel_FL").pos, wr = c.parts.find((p) => p.name === "Wheel_RL").pos;
    return { name, len: s[2], w: s[0], h: s[1], wb: wf[2] - wr[2], wheelR: wf[1], weight: name === "x4" && !X4_TRAFFIC ? 0 : w };   // (claude/cars1: as traffic.js, the 4x4 parked only)
  });
  const inT = (x, z) => bounds.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
  const spots = rd("data/game/police_spots.json").speed.filter((s) => inT(s.x, s.z));
  const mkSim = (seed) => { const sim = new TrafficSim(W, { cap: 384, types, paints: [[0.5, 0.5, 0.5]], ground: () => 0, seed }); sim.params.parkRate = 0; sim.params.runs = 1; sim._clk = 0; return sim; };
  const stepN = (sim, ctx, secs) => { for (let i = 0, n = Math.round(secs / STEP); i < n; i++) { simClock = sim._clk = sim._clk + STEP; sim.clearObstacles(); sim.step(ctx); } };
  log(`traffic: tiles ${TILES.join(" ")} in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${spots.length} speed spots on them`);
  // 3. the stolen car: per spot as the player's place, the car taken at the call, then fleeing; alive for HOLD_S s
  const stolenBad = [];
  let stolenN = 0, stolenNone = 0;
  const speed = { picks: 0, passed: 0, dropped: 0, spots: 0, spotOk: 0, noTraffic: 0, bad: [] };
  for (const [k, s] of spots.entries()) {
    const sim = mkSim(31 + k), ctx = { fx: s.x, fz: s.z, visible: () => false }, T = { sim, T: { alpha: 1 } };
    stepN(sim, ctx, 45);
    // 4. the speed check at this spot: 150 s of radar
    {
      const at = { x: s.x, z: s.z }, skip = new Set();
      let sp = -1, rec = null, gen = 0, got = false, any = false;
      for (let t = 0; t < 150; t += 0.5) {
        stepN(sim, ctx, 0.5);
        if (!any) for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && Math.hypot(sim.x[i] - at.x, sim.z[i] - at.z) < 220) { any = true; break; }
        if (sp >= 0 && (!sim.alive[sp] || sim.gen[sp] !== gen)) sp = -1;
        if (sp < 0) { sp = pickSpeeder(sim, at, { old: OLD, skip }); if (sp >= 0) { speed.picks++; rec = {}; gen = sim.gen[sp]; } }
        if (sp < 0) continue;
        const d = Math.hypot(sim.x[sp] - at.x, sim.z[sp] - at.z);
        if (d < 22) { speed.passed++; got = true; skip.add(sp * 4096 + (gen & 4095)); sp = -1; continue; }
        if (OLD ? d > 260 : speederMissed(sim, sp, at, rec)) { speed.dropped++; skip.add(sp * 4096 + (gen & 4095)); sp = -1; }
      }
      if (!any) speed.noTraffic++;
      else { speed.spots++; if (got) speed.spotOk++; else speed.bad.push(`${s.street} (${s.x}, ${s.z})`); }
    }
    // 3. the stolen car, from a player 40 m off the sign
    const Pp = { x: s.x + 40, z: s.z };
    const t = takeTrafficCar(T, { x: Pp.x, z: Pp.z, min: 90, max: 320 });
    if (!t) { stolenNone++; continue; }
    t.release();
    const e = new TrafficCarTarget(T, t.i);
    stolenN++;
    let why = null;
    for (let q = 0; q <= HOLD_S; q += 1) {
      if (q === 20) sim.ctl[e.i] = 1;                                  // (the player came near: it flees)
      sim.chaser.x = Pp.x; sim.chaser.z = Pp.z;
      stepN(sim, ctx, 1); e.update();
      const p = stolenPremise(e, sim);
      if (!p.ok) { why = `${q} s: ${p.why}${e.arrived ? " (parked)" : ""}`; break; }
    }
    e.release();
    if (why) stolenBad.push(`${s.street}: ${why}`);
  }
  log(`stolen: ${stolenN} cars taken, ${stolenNone} spots with none in 90-320 m (no call there)`);
  for (const b of stolenBad.slice(0, 5)) log(`  ${b}`);
  check("stolen: the car stays in the traffic", stolenN > 0 && !stolenBad.length, `${stolenN - stolenBad.length} / ${stolenN} stolen cars alive and ours for ${HOLD_S} s (fleeing from 20 s)${stolenBad.length ? `; e.g. ${stolenBad[0]}` : ""}`);
  const share = speed.picks ? speed.passed / speed.picks : 0;
  log(`speed: ${speed.picks} speeders picked, ${speed.passed} came by the sign, ${speed.dropped} dropped; ${speed.spotOk} / ${speed.spots} spots with traffic got one (${speed.noTraffic} without traffic)`);
  for (const b of speed.bad.slice(0, 5)) log(`  no speeder: ${b}`);
  check("speed: the speeder comes past the sign", speed.picks > 0 && share >= SPEED_MIN && speed.spotOk === speed.spots, `${(share * 100).toFixed(0)} % of the picked speeders came within 22 m (>= ${SPEED_MIN * 100} %), ${speed.spotOk} / ${speed.spots} spots with traffic got one within 150 s`);
}

console.log(fails ? `${fails} mission check(s) FAILED` : "mission audit: every premise holds");
process.exit(fails ? 1 : 0);
