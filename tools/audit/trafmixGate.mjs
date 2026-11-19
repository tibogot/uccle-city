// TRAFMIX GATE (rule 45, docs/TRAFMIX.md): the traffic's mix and its service vehicles, node, no browser.
//   1. models   models/cars/heavy.glb (tools/blender/heavies.py): triangles per LOD within budget, the named kinds on
//               every LOD (head / tail lamps; beacons on the emergency vehicles; glass on the near levels), the tyres on
//               the ground, the body clear of it
//   2. mix      the spawn shares by hour (trafMix.js shares) within the targets (SUV share of the cars, vans by day /
//               night, taxis, patrols, bin lorries only on weekday mornings, ambulances rare, fire engines very rare)
//   3. sim      the real TrafficSim on 6 tiles round Ch. d'Alsemberg (D5-D7) and the police station (E4-E6), as the
//               tile worker builds them, with the mix + the bus lines (data/transit/trafmix.json):
//               - the realised shares per hour (8 h / 13 h at the station / 18 h) within the targets; patrols present,
//                 more of them round Rue Rouge
//               - buses: spawned on their lines, >= 85 % of their time on the line, stopping AT their stops (front door
//                 within 3.5 m of the pole, median <= 2 m)
//               - an ambulance on a run: the cars ahead of it slow and pull right, the crossing traffic holds
//               - no service vehicle stuck: the longest standstill (not a planned stop) <= 90 s, none removed as stuck
//               - the step's cost with the mix <= 1.10 x without it (same tiles, same seed, interleaved runs)
//   node --import ./tools/road_audit/register.mjs tools/audit/trafmixGate.mjs [--old] [--quiet] [--secs 240]
//   --old: ?trafmix=old (the mix as before): must FAIL (no patrols, no buses, no emergency yield).
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const OLD = argv.includes("--old"), QUIET = argv.includes("--quiet");
globalThis.location = { search: (OLD ? "?trafmix=old&" : "?") + "weekday=1" };
const SECS = +opt("--secs", 240);
const { loadTile, ROOT } = await import("../road_audit/tile.mjs");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");
const { TrafficWorld } = await imp("viewer/traffic/trafficWorld.js");
const { TrafficSim, STEP } = await imp("viewer/traffic/trafficSim.js");
const { parseCarGlb } = await imp("viewer/drive/carLod.js");
// the signal clock runs on SIM time here (it reads the wall clock: a sim stepped faster than real time would sit at red
// lights for simulated minutes)
const { signalClock } = await imp("viewer/traffic/signals.js");
let simClock = 0;
signalClock.now = () => simClock;
const _step = TrafficSim.prototype.step;
TrafficSim.prototype.step = function (ctx) { simClock += STEP; return _step.call(this, ctx); };
const M = await imp("viewer/traffic/trafMix.js");
const { HEAVY, HEAVY_TYPES, TrafMix, ROLE, shares, TRAFMIX_OLD } = M;

let fails = 0;
const log = (...a) => { if (!QUIET) console.log(...a); };
const check = (name, ok, msg) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };

// ---------------------------------------------------------------- 1. the models
const BUDGET = { police_t: [16000, 2800, 400], ambulance: [11000, 2200, 700], fire: [12000, 2200, 650], bus: [14000, 2600, 600], bin: [11000, 2200, 650] };
const BEACON = new Set(["police_t", "ambulance", "fire"]);
{
  let cars = [];
  try { const b = readFileSync(join(ROOT, "models/cars/heavy.glb")); cars = parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); } catch (e) { check("models", false, `models/cars/heavy.glb: ${e.message}`); }
  const rows = [];
  for (const id of Object.keys(HEAVY)) {
    const car = cars.find((c) => c.id === id);
    if (!car) { check(`model ${id}`, false, "missing in heavy.glb"); continue; }
    const lv = [0, 1, 2].map((k) => car.parts.filter((p) => (k ? p.name.endsWith(`_L${k}`) : !/_L\d$/.test(p.name))));
    const tris = lv.map((ps) => ps.reduce((a, p) => a + p.mesh.I.length / 3, 0));
    const bad = [];
    tris.forEach((t, k) => { if (t > BUDGET[id][k]) bad.push(`LOD${k} ${t} > ${BUDGET[id][k]}`); });
    lv.forEach((ps, k) => {
      const body = ps.find((p) => p.name.startsWith("Body"));
      if (!body) { bad.push(`LOD${k} no body`); return; }
      const K = new Set(Array.from(body.mesh.K, (v) => Math.round(v)));
      for (const [kind, nm] of [[2, "head"], [3, "tail"]]) if (!K.has(kind)) bad.push(`LOD${k} no ${nm} kind`);
      if (BEACON.has(id) && !K.has(9)) bad.push(`LOD${k} no beacon (kind 9)`);
      if (k < 2 && !K.has(4)) bad.push(`LOD${k} no glass`);
      let ylo = Infinity; for (let q = 1; q < body.mesh.P.length; q += 3) ylo = Math.min(ylo, body.mesh.P[q] + body.pos[1]);
      if (ylo < 0.10) bad.push(`LOD${k} body ${ylo.toFixed(2)} m over the ground`);
      for (const w of ps.filter((p) => p.name.startsWith("Wheel_"))) {
        let lo = Infinity; for (let q = 1; q < w.mesh.P.length; q += 3) lo = Math.min(lo, w.mesh.P[q] + w.pos[1]);
        if (Math.abs(lo) > 0.012) { bad.push(`LOD${k} ${w.name} lowest ${lo.toFixed(3)}`); break; }
      }
    });
    rows.push(`${id} ${tris.join(" / ")}`);
    check(`model ${id}`, !bad.length, bad.length ? bad.slice(0, 4).join("; ") : `tris ${tris.join(" / ")} (budget ${BUDGET[id].join(" / ")}), kinds + wheels ok`);
  }
}

// ---- the liveries on screen: the palette colours lit (0.5 / 1 / 1.8 x), through the engine's grade (viewer/post.js
// midday: contrast 1.1, saturation 1.06 + vibrance) and three's ACESFilmic, then sRGB (as tools/audit/tlightsCheck.mjs).
// The Belgian ambulance's fluorescent yellow-green must read saturated, not pale / muddy: hue 60-75, saturation >= 0.6 and
// value >= 0.8 at 1 x (the first cut, (0.80, 0.78, 0.02) on the clear-coated paint: hue 58, saturation 0.57 at 0.89 value
// before the coat's sky reflection)
{
  const src = readFileSync(join(ROOT, "tools/blender/heavies.py"), "utf8");
  const pal = (n) => { const m = new RegExp(String.raw`\("${n}", (\d), \(([^)]*)\)\)`).exec(src); return m ? { kind: +m[1], rgb: m[2].split(",").map(Number) } : null; };
  const IN = [[0.59719, 0.076, 0.0284], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]];
  const OUT = [[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]];
  const mul = (Mx, v) => [0, 1, 2].map((i) => Mx[0][i] * v[0] + Mx[1][i] * v[1] + Mx[2][i] * v[2]);
  const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const aces = (c) => mul(OUT, mul(IN, c.map((x) => x / 0.6)).map(fit)).map((x) => Math.min(1, Math.max(0, x)));
  const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const grade = (c) => { c = c.map((x) => x * Math.pow(Math.max(lum(c), 1e-4) / 0.18, 0.1)); const g = lum(c), hi = Math.max(...c), ch = hi - Math.min(...c); const k = 1.06 + 0.1 * (1 - ch / Math.max(hi, 1e-4)); return c.map((x) => Math.max(0, g + (x - g) * k)); };
  const hsv = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d > 0) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx]; };
  const P = pal("amb_yellow"), G = pal("amb_green");
  const at = (p, E) => hsv(aces(grade(p.rgb.map((x) => x * (p.kind === 1 ? 0.75 : 1) * E))).map(srgb));
  const y1 = P && at(P, 1), g1 = G && at(G, 1);
  const ok = P && P.kind === 0 && y1[0] >= 60 && y1[0] <= 75 && y1[1] >= 0.6 && y1[2] >= 0.8 && G && g1[0] > 110 && g1[0] < 160 && g1[1] > 0.8;
  check("ambulance colours on screen", !!ok, P ? `yellow (kind ${P.kind}) ${[0.5, 1, 1.8].map((E) => at(P, E).map((v, k) => (k ? v.toFixed(2) : v.toFixed(0))).join("/")).join("  ")} (hue / sat / value at 0.5 / 1 / 1.8 x); green ${g1.map((v, k) => (k ? v.toFixed(2) : v.toFixed(0))).join("/")}` : "amb_yellow not in heavies.py");
}

// ---------------------------------------------------------------- 2. the mix tables
const GROUP = (n) => (["hatch_s", "hatch_c", "estate", "saloon", "suv"].includes(n) ? "car" : n === "van_c" || n === "van_p" ? "van" : n);
{
  const bad = [];
  for (const h of [3, 8, 13, 18, 22]) {
    const s = shares(h, true), car = s.hatch_s + s.hatch_c + s.estate + s.saloon + s.suv, van = s.van_c + s.van_p;
    if (Math.abs(s.suv / car - 0.30) > 0.05) bad.push(`${h} h SUV ${(s.suv / car * 100).toFixed(0)} % of cars`);
    if (h >= 7 && h < 19 ? van < 0.08 || van > 0.15 : van > 0.08) bad.push(`${h} h vans ${(van * 100).toFixed(1)} %`);
    if (!(s.police_t > 0.003 && s.police_t < 0.012)) bad.push(`${h} h patrols ${(s.police_t * 100).toFixed(2)} %`);
    if (!(s.ambulance > 0.001 && s.ambulance < 0.005)) bad.push(`${h} h ambulances`);
    if (!(s.fire > 0 && s.fire < 0.001)) bad.push(`${h} h fire engines`);
    if ((s.bin > 0) !== (h >= 6.5 && h < 11) && !(h >= 13 && h < 15)) bad.push(`${h} h bin lorries ${s.bin}`);
    if (!(s.taxi >= 0.01 && s.taxi <= 0.05)) bad.push(`${h} h taxis`);
  }
  if (shares(8, false).bin) bad.push("bin lorries on a weekend");
  check("mix tables", !bad.length, bad.length ? bad.join("; ") : "SUV 30 % of the cars, vans 12 % by day / 4 % at night, taxis 1.2-4 %, patrols 0.5-0.8 %, ambulances 0.25 %, fire 0.06 %, bin lorries weekday mornings");
}

// ---------------------------------------------------------------- 3. the sim
const TILES = ["D5", "D6", "D7", "E4", "E5", "E6"];
const t0 = Date.now();
const W = new TrafficWorld();
const parked = [];
for (const T of TILES) {
  const { roads, feats, bounds, rd, roofs } = loadTile(T);
  const wp = widthParking(roads, feats, bounds, streetFit(rd.surfaceData));
  const g = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites, roofs });
  for (const c of g.parkedKept ?? wp.sites) parked.push({ x: c.x, z: c.z, y: 0, heading: c.yaw + Math.PI / 2, type: "estate", hidden: false, col: { setRGB() {} }, room: 6 });
  W.add(T, g);
}
log(`tiles ${TILES.join(" ")} loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${parked.length} parked cars`);
// the street types as the city's traffic.js makes them (sizes / wheels from the cars2 GLB, the mix's weights)
const fleetSrc = readFileSync(join(ROOT, "viewer/carFleet.js"), "utf8");
const TYPE_MIX = JSON.parse(/export const TYPE_MIX = (\[.*?\]);/s.exec(fleetSrc)[1]);
const c2 = (() => { const b = readFileSync(join(ROOT, "models/cars/cars2.glb")); return parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); })();
const types = TYPE_MIX.map(([name, w]) => {
  const c = c2.find((q) => q.id === name), s = c.extras.size, wf = c.parts.find((p) => p.name === "Wheel_FL").pos, wr = c.parts.find((p) => p.name === "Wheel_RL").pos;
  return { name, len: s[2], w: s[0], h: s[1], wb: wf[2] - wr[2], wheelR: wf[1], weight: w };
});
for (const name of HEAVY_TYPES) { const H = HEAVY[name]; types.push({ name, len: H.size[2], w: H.size[0], h: H.size[1], wb: H.wb, wheelR: H.wheelR, zc: H.zc, weight: 0, heavy: true }); }
const tix = Object.fromEntries(types.map((t, k) => [t.name, k]));
const data = JSON.parse(readFileSync(join(ROOT, "data/transit/trafmix.json"), "utf8"));
function makeSim(withMix, seed = 7) {
  const sim = new TrafficSim(W, { cap: 512, types, paints: [[0.5, 0.5, 0.5]], ground: () => 0, seed });
  sim.setParking(() => parked, () => 0);
  sim.params.parkRate = 0; sim.params.runs = 1;
  sim.pk.size = () => [1.85, 1.47, 4.70];
  if (withMix && !TRAFMIX_OLD) { sim.mix = new TrafMix(types); sim.mix.setData(data); }
  return sim;
}
const FOCUS = { alsemberg: { fx: -1200, fz: 900 }, station: { fx: -514, fz: -340 } };
const sim = makeSim(true);
// what every car is, counted when it appears (gen changes) and how long each service vehicle has stood
const seenGen = new Uint32Array(sim.cap), stand = new Float32Array(sim.cap), lastHold = new Float32Array(sim.cap);
const tally = () => ({ n: 0, by: {}, role: {} });
let cur = tally(), standMax = {}, stuckRemoved = {}, busT = 0, busOnT = 0, doors = [], scrape = {}, stuckDel = 0, stuckCars = 0, nDel = 0, nCars = 0;
const busNs = new Int16Array(sim.cap).fill(-1), busRst = new Uint8Array(sim.cap);
function stepOnce(ctx) {
  sim.clearObstacles(); sim.step(ctx);
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i]) {
      if (seenGen[i] && lastHold[i] > 60) {
        const nm = types[sim.type[i]].name;
        if (HEAVY[nm]) { const k = `${nm} (hold ${sim.hold[i]})`; stuckRemoved[k] = (stuckRemoved[k] || 0) + 1; }
        else if (sim.role[i] === ROLE.delivery) stuckDel++; else stuckCars++;
      }
      lastHold[i] = 0;
      stand[i] = 0; continue;
    }
    const nm = types[sim.type[i]].name;
    if (seenGen[i] !== sim.gen[i]) {
      seenGen[i] = sim.gen[i]; stand[i] = 0; busRst[i] = 0;
      if (sim.role[i] === ROLE.delivery) nDel++; else if (!HEAVY[nm]) nCars++;
      cur.n++; const gr = GROUP(nm); cur.by[gr] = (cur.by[gr] || 0) + 1; cur.by[nm] = (cur.by[nm] || 0) + 1;
      cur.role[sim.role[i]] = (cur.role[sim.role[i]] || 0) + 1;
    }
    lastHold[i] = sim.holdT[i];
    if (HEAVY[nm]) {
      if (sim.v[i] < 0.1 && sim.rst[i] !== 2) stand[i] += STEP; else if (sim.v[i] > 0.5) stand[i] = 0;
      const key = nm;
      standMax[key] = Math.max(standMax[key] || 0, stand[i]);
      if (process.env.TMV && stand[i] > 60 && Math.abs(stand[i] % 20 - 0) < STEP / 2) { const j = sim.nxt[i]; console.log(`  [stand] ${key} ${stand[i].toFixed(0)} s at ${sim.x[i].toFixed(1)},${sim.z[i].toFixed(1)} hold ${sim.hold[i]} lead ${sim.lead[i]} gap ${sim.gap[i].toFixed(1)} ctl ${sim.ctl[i]} rst ${sim.rst[i]} room ${sim.room[i].toFixed(2)} pw ${sim.pw[i].toFixed(2)}/${sim.pwT[i].toFixed(1)} next ${j >= 0 ? types[sim.type[j]].name + " v " + sim.v[j].toFixed(1) + " rst " + sim.rst[j] + " role " + sim.role[j] + " hold " + sim.hold[j] : "-"} path ${sim.path[i] & 0xffff} d ${sim.d[i].toFixed(1)}`); }
    }
    if (HEAVY[nm] && (sim.steps + i) % 4 === 0 && sim.pk.grid.size) {
      // the long bodies against the parked cars (a report: the lanes are fitted round the parked cars for a car's width)
      const T = types[sim.type[i]], fx = Math.sin(sim.yaw[i]), fz = Math.cos(sim.yaw[i]);
      const dc = sim.bodyClear(sim.x[i] + fx * (T.zc || 0), sim.z[i] + fz * (T.zc || 0), sim.yaw[i], T.len / 2, T.w / 2);
      const o = (scrape[nm] ||= { n: 0, hit: 0, deep: 0 }); o.n++; if (dc < -0.05) o.hit++; if (dc < -0.3) o.deep++;
    }
    if (sim.role[i] === ROLE.bus) {
      busT += STEP; if (sim.bv[i] >= 0) busOnT += STEP;
      if (sim.rst[i] === 2 && busRst[i] !== 2 && sim.bv[i] >= 0) {
        // the front door (4.7 m ahead of the axles' middle, the right side) against the pole of the stop it serves
        // (along the line: the door's place on the route vs the pole's)
        const r = sim.mix.routes[sim.bv[i]], s = r.stops[sim.ns[i]];
        if (s) doors.push(Math.abs(sim.rp[i] + 4.7 - s.at));
      }
      busRst[i] = sim.rst[i];
    }
  }
}
/** the spawn mix: `rounds` fill-ups from empty (a big sample fast), then `secs` of play (the buses, the stops, the
 *  standstills) -> the tally of the fill-ups */
function run(where, hour, secs, rounds = 14) {
  sim.params.hour = hour;
  const ctx = { visible: () => false, ...FOCUS[where] };
  cur = tally();
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < sim.cap; i++) if (sim.alive[i]) sim.kill(i);
    for (let s = 0; s < Math.round(14 / STEP); s++) stepOnce(ctx);
  }
  const T = cur;
  for (let s = 0, n = Math.round(secs / STEP); s < n; s++) stepOnce(ctx);
  return T;
}
const share = (T, k) => (T.by[k] || 0) / Math.max(1, T.n);
const pct = (v) => (v * 100).toFixed(1) + " %";
const res = {};
for (const [label, where, hour, secs] of [["8 h Alsemberg", "alsemberg", 8, SECS], ["13 h Rue Rouge", "station", 13, SECS], ["18 h Alsemberg", "alsemberg", 18, Math.round(SECS / 2)]]) {
  const T = run(where, hour, secs), s = shares(hour, true);
  res[label] = T;
  const tCar = s.hatch_s + s.hatch_c + s.estate + s.saloon + s.suv, tVan = s.van_c + s.van_p;
  const tol = (p) => 3 * Math.sqrt((p * (1 - p)) / Math.max(1, T.n)) + 0.02;
  const bad = [];
  if (Math.abs(share(T, "car") - tCar) > tol(tCar)) bad.push(`cars ${pct(share(T, "car"))} (target ${pct(tCar)})`);
  if (Math.abs(share(T, "van") - tVan) > tol(tVan)) bad.push(`vans ${pct(share(T, "van"))} (target ${pct(tVan)})`);
  const suvC = (T.by.suv || 0) / Math.max(1, T.by.car || 0);
  if (Math.abs(suvC - 0.30) > 0.08) bad.push(`SUV ${pct(suvC)} of the cars`);
  if (!(T.by.police_t > 0)) bad.push("no patrol car");
  if (!(T.by.bus > 0)) bad.push("no bus");
  check(`mix ${label}`, !bad.length, `${T.n} vehicles: cars ${pct(share(T, "car"))} (SUV ${pct(suvC)} of them), vans ${pct(share(T, "van"))}, taxis ${T.by.taxi || 0}, patrols ${T.by.police_t || 0}, buses ${T.by.bus || 0}, ambulances ${T.by.ambulance || 0}, fire ${T.by.fire || 0}, bin lorries ${T.by.bin || 0}, deliveries ${T.role[ROLE.delivery] || 0}${bad.length ? " -- " + bad.join("; ") : ""}`);
}
{
  const a = res["8 h Alsemberg"], b = res["13 h Rue Rouge"];
  const pa = share(a, "police_t"), pb = share(b, "police_t");
  check("patrols round Rue Rouge", pb > 2 * pa && pb > 0.01, `patrol share ${pct(pb)} round the station vs ${pct(pa)} on Ch. d'Alsemberg`);
}
{
  const st = sim.stats, on = busOnT / Math.max(1e-6, busT), med = doors.length ? doors.slice().sort((x, y) => x - y)[doors.length >> 1] : Infinity, mx = doors.length ? Math.max(...doors) : Infinity;
  check("buses on their lines", busT > 60 && on >= 0.85 && (st.busOff || 0) <= Math.max(2, 0.25 * (st.busSpawned || 0)), `${st.busSpawned || 0} buses spawned, ${(busT / 60).toFixed(1)} bus-minutes, ${pct(on)} of it on the line, ${st.busOff || 0} lost the line, ${st.busEnd || 0} reached the end of the city's part`);
  check("buses stop at their stops", doors.length >= 4 && med <= 1.5 && mx <= 3, `${doors.length} stops served (${st.busMissed || 0} passed), the front door to the pole along the line: median ${med.toFixed(2)} m, worst ${mx.toFixed(2)} m`);
}
{
  const bad = Object.entries(standMax).filter(([, v]) => v > 90).map(([k, v]) => `${k} ${v.toFixed(0)} s`);
  const rem = Object.entries(stuckRemoved).map(([k, v]) => `${k} ${v}`);
  check("service vehicles never stuck", !bad.length && !rem.length && Object.keys(standMax).length > 0, `longest standstill (not a planned stop): ${Object.entries(standMax).map(([k, v]) => `${k} ${v.toFixed(0)} s`).join(", ") || "none seen"}${rem.length ? "; removed as stuck: " + rem.join(", ") : ""}`);
  // (the delivery vans are the street's vans on a round: held at a junction like any car; their stops never make them
  // stuck more often than the other cars: x2 + 1 for the small sample)
  const rd = stuckDel / Math.max(1, nDel), rc = stuckCars / Math.max(1, nCars);
  check("delivery rounds not stuck", nDel > 0 && stuckDel <= 2 * rc * nDel + 1, `${stuckDel} of ${nDel} delivery vans removed as stuck (${pct(rd)}) vs ${stuckCars} of ${nCars} other cars (${pct(rc)})`);
}
console.log(`(report) long bodies vs parked cars: ${Object.entries(scrape).map(([k, o]) => `${k} ${pct(o.hit / Math.max(1, o.n))} of samples into a parked box > 5 cm (${pct(o.deep / Math.max(1, o.n))} > 30 cm)`).join(", ")}`);
// ---- an ambulance on a run with cars ahead: they slow and pull right; the crossing traffic holds
{
  for (let i = 0; i < sim.cap; i++) if (sim.alive[i]) sim.kill(i);
  sim.params.hour = 17.5; sim.params.density = 1.6;
  const ctx = { visible: () => false, ...FOCUS.alsemberg };
  for (let s = 0; s < Math.round(60 / STEP); s++) { sim.clearObstacles(); sim.step(ctx); }
  // a car with >= 2 cars 15-70 m ahead on its path (or the next): replaced by an ambulance on a run
  let best = -1, bn = 0;
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i] || sim.state[i] !== 0 || sim.role[i]) continue;
    let n = 0;
    for (let j = 0; j < sim.cap; j++) {
      if (!sim.alive[j] || j === i) continue;
      const dx = sim.x[j] - sim.x[i], dz = sim.z[j] - sim.z[i], fx = Math.sin(sim.yaw[i]), fz = Math.cos(sim.yaw[i]), al = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
      if (al > 15 && al < 70 && lat < 3 && Math.sin(sim.yaw[j]) * fx + Math.cos(sim.yaw[j]) * fz > 0.8) n++;
    }
    if (n > bn) { bn = n; best = i; }
  }
  const out = { yielded: 0, slowed: 0, ahead: 0, held: 0, maxRoom: 0 };
  if (best >= 0) {
    const gid = sim.path[best], d = sim.d[best];
    sim.kill(best);
    for (let s = 0; s < 2; s++) { sim.clearObstacles(); sim.step(ctx); }
    const a = sim.spawnAt(gid, d, 8, tix.ambulance ?? 0);
    if (a >= 0) { sim.insertInList(a); if (tix.ambulance != null) { sim.role[a] = ROLE.ambulance; sim.ctl[a] = 4; } }
    const v0 = new Float32Array(sim.cap).fill(-1), mn = new Float32Array(sim.cap).fill(99), room = new Float32Array(sim.cap), was = new Uint8Array(sim.cap);
    for (let s = 0; s < Math.round(15 / STEP); s++) {
      sim.clearObstacles(); sim.step(ctx);
      if (a < 0 || !sim.alive[a]) break;
      for (let j = 0; j < sim.cap; j++) {
        if (!sim.alive[j] || j === a) continue;
        const dx = sim.x[j] - sim.x[a], dz = sim.z[j] - sim.z[a], fx = Math.sin(sim.yaw[a]), fz = Math.cos(sim.yaw[a]), al = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
        const same = Math.sin(sim.yaw[j]) * fx + Math.cos(sim.yaw[j]) * fz > 0.6;
        if (same && al > 3 && al < 45 && lat < 4) { if (!was[j]) { was[j] = 1; v0[j] = sim.v[j]; } mn[j] = Math.min(mn[j], sim.v[j]); room[j] = Math.min(room[j], sim.room[j]); }
        if (sim.hold[j] === 3 && Math.abs(Math.sin(sim.yaw[j]) * fx + Math.cos(sim.yaw[j]) * fz) < 0.6 && Math.hypot(dx, dz) < 80) out.held++;
      }
    }
    for (let j = 0; j < sim.cap; j++) if (was[j]) { out.ahead++; if (mn[j] < Math.max(1, v0[j] * 0.5)) out.slowed++; if (room[j] < -0.25) out.yielded++; out.maxRoom = Math.min(out.maxRoom, room[j]); }
  }
  check("emergency yield", out.ahead >= 1 && out.slowed >= Math.ceil(out.ahead * 0.6) && out.yielded >= 1, `an ambulance on a run behind ${bn} cars: ${out.ahead} cars ahead within 45 m, ${out.slowed} slowed to a crawl / stop, ${out.yielded} pulled right (deepest ${out.maxRoom.toFixed(2)} m), crossing-traffic hold-steps ${out.held}`);
  sim.params.density = 1;
}
// ---- the cost: a step with the mix vs without it (same tiles, seed, focus, hour), interleaved
{
  const ctx = { visible: () => false, ...FOCUS.alsemberg };
  const A = makeSim(true, 11), B = makeSim(false, 11);
  for (const S of [A, B]) { S.params.hour = 8; for (let s = 0; s < Math.round(40 / STEP); s++) { S.clearObstacles(); S.step(ctx); } }
  const ta = [], tb = [];
  // (12 rounds of 150 steps, alternating which goes first; the FASTEST round of each: the timer's noise (GC, the OS) only
  // ever adds time. Two identical sims measured this way differ by <= ~3 %)
  for (let r = 0; r < 20; r++) for (const [S, out] of r % 2 ? [[A, ta], [B, tb]] : [[B, tb], [A, ta]]) {
    const t = performance.now();
    let cars = 0;
    for (let s = 0; s < 150; s++) { S.clearObstacles(); S.step(ctx); cars += S.count; }
    out.push(((performance.now() - t) / cars) * 1000);            // (us per car per step)
  }
  const ra = Math.min(...ta), rb = Math.min(...tb), ratio = ra / rb;
  check("sim cost", TRAFMIX_OLD || ratio <= 1.10, `${ra.toFixed(2)} us per car per step with the mix vs ${rb.toFixed(2)} without (x${ratio.toFixed(3)}), ${A.count} / ${B.count} cars`);
}
console.log(fails ? `${fails} trafmix check(s) FAILED${OLD ? " (?trafmix=old: expected)" : ""}` : "all trafmix checks pass");
process.exitCode = fails ? 1 : 0;
