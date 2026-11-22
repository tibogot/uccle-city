// TRAFMIX GATE (rule traffic-mix, docs/TRAFMIX.md): the traffic's mix and its service vehicles, node, no browser.
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
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { measure } from "../gate/timing.mjs";
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
const { laneHits } = await imp("viewer/traffic/borderPark.js");
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
const parked = [], tileB = [], tileG = [], kept = [], graphs = new Map();
for (const T of TILES) {
  const { roads, feats, bounds, rd, roofs } = loadTile(T);
  tileB.push([T, bounds]);
  const wp = widthParking(roads, feats, bounds, streetFit(rd.surfaceData));
  const g = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites, roofs, entry: process.env.LANES_OLD ? { streetLanes: false } : {} });
  // (a shallow copy for laneHits: it caches its lane hash ON the graph (_tpHash); the sim's own graph objects keep their
  // shape)
  kept.push([T, g.parkedKept ?? wp.sites]); graphs.set(T, { ...g });
  W.add(T, g);
  tileG.push({ T, g, roads, feats, bounds });
}
// (claude/parking1: as main.js draws them: a tile's parked cars under a LOADED neighbour's core lane are not drawn
// (viewer/traffic/borderPark.js laneHits, all six tiles loaded). Before, the gate kept them and the sim made them
// obstacles in the neighbour's lane: queues behind cars the city never shows (D6 (-1150, 930), D7 Rue Engeland))
let borderDropped = 0;
for (const [T, sites] of kept) {
  const drop = laneHits(sites, graphs, T); borderDropped += drop.size;
  sites.forEach((c, i) => { if (!drop.has(i)) parked.push({ x: c.x, z: c.z, y: 0, heading: c.yaw + Math.PI / 2, type: "estate", hidden: false, col: { setRGB() {} }, room: 6 }); });
}
log(`tiles ${TILES.join(" ")} loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${parked.length} parked cars (${borderDropped} under a neighbour's lane, not drawn)`);
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
// (--seed N: the main run's seed, the same table judged on another day of traffic; rule junction-entry-room asks 3)
const CYCLE_MAX = 3;
const SEED = +(process.argv.find((a, k) => process.argv[k - 1] === "--seed") ?? 7);
// THE STUCK RATCHET (claude/street4, rule junction-entry-room): the row runs seeds 7 (here), 11 and 23 (two child
// processes, --child: the sim part only, its stuck list on one line) and counts the stuck service vehicles of all three
// against STUCK_MAX. 4 at the street4 merge (model lanes: 2 at the close D7 Ch. d'Alsemberg signal pair, 1 ambulance at
// D6 on a street parked on both sides; the old lanes 3). It goes to 0 through two jobs (docs/TODO.md): the SIGNALS job
// (the D7 pair: one phase along the road for the close pairs, the 3 phase mismatches below, a yield inside the first
// junction's turn) and the PARKING job (an emergency vehicle on a street parked on both sides: its route avoids it or the
// parking leaves a gap). Each stuck place is also a gap-register entry (trafmix.stuck / trafmix.stuckOld for the old
// lanes, --register): a new place fails, a fixed one is stale. Lower STUCK_MAX as those jobs land; never raise it.
// claude/signals1: 1 (seeds 7 / 11 / 23: 0 / 0 / 1, the E6 ambulance behind a parked car, the PARKING job; the D7 pair
// and the E4 priority junction not seen on seeds 7 / 11 / 23 / 31 / 41)
// claude/parking1 (rule service-vehicle-passage: parked cars leave 3 m, none within 5 m of a junction mouth, the gate's
// parked cars as main.js draws them, service vehicles routed off lanes they cannot pass, a run's way through a narrow
// stretch): STUCK_MAX = MEASURED_AFTER_MERGE
const STUCK_MAX = 1, MORE_SEEDS = [11, 23];
const CHILD = argv.includes("--child"), ONE_SEED = process.argv.includes("--seed"), REG = argv.includes("--register");
const kids = CHILD || ONE_SEED ? [] : MORE_SEEDS.map((sd) => new Promise((res) => {
  // (started now: they load their tiles and run their sims while this one runs; awaited before the timed part)
  const p = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--seed", String(sd), "--child", "--quiet"], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  p.stdout.on("data", (b) => (out += b)); p.stderr.on("data", (b) => (err += b));
  p.on("close", (code) => { const m = /^SEEDRESULT (.*)$/m.exec(out); res(m ? JSON.parse(m[1]) : { seed: sd, error: `exit ${code}: ${(err || out).trim().split(String.fromCharCode(10)).slice(-3).join(" / ")}` }); });
}));
const sim = makeSim(true, SEED);
// what every car is, counted when it appears (gen changes) and how long each service vehicle has stood
const seenGen = new Uint32Array(sim.cap), stand = new Float32Array(sim.cap), lastHold = new Float32Array(sim.cap);
const tally = () => ({ n: 0, by: {}, role: {} });
// STUCK (claude/street4, rule junction-entry-room): a service vehicle whose own position AND the queue ahead of it (its
// wait-for chain, trafficSim.js wf / lastBlk: the stopped car it follows, else the car its hold names (kept through a red
// phase), up to the stop line or the blocker) have not moved STUCK_MOVE m for STUCK_T s, outside a planned stop. The sim's own removal timer (a car held a
// minute in total, even while its queue creeps on) is reported apart, as info: it removed vehicles from long MOVING
// queues, and the foundation itself failed the old check at the default seed (3 removals with the old lanes)
const STUCK_T = 60, STUCK_MOVE = 1;
const anchor = new Map(), stuckTrue = [];
function stuckStep(i, nm) {
  const now = sim.t ?? 0, gen = sim.gen[i];
  let A = anchor.get(i);
  if (sim.rst[i] === 2 || !A || A.gen !== gen) { anchor.set(i, A = { gen, t: now, pos: new Map(), hit: false }); }
  const chain = []; for (let j = i, n = 0; j >= 0 && n < 16 && !chain.includes(j); j = (sim.wf?.[j] ?? -1) >= 0 ? sim.wf[j] : sim.lastBlk?.[j] ?? -1, n++) chain.push(j);
  let moved = sim.rst[i] === 2;
  for (const [j, [x, z, g]] of A.pos) if (!sim.alive[j] || sim.gen[j] !== g || Math.hypot(sim.x[j] - x, sim.z[j] - z) >= STUCK_MOVE) { moved = true; break; }
  if (moved || !A.pos.size) { A.t = now; A.pos = new Map(chain.map((j) => [j, [sim.x[j], sim.z[j], sim.gen[j]]])); return; }
  if (!A.hit && now - A.t >= STUCK_T) { A.hit = true; stuckTrue.push({ nm, x: sim.x[i], z: sim.z[i], at: `${sim.x[i].toFixed(1)}, ${sim.z[i].toFixed(1)}`, hold: sim.hold[i], chain: chain.length }); }
}
let cur = tally(), standMax = {}, stuckRemoved = {}, busT = 0, busOnT = 0, doors = [], scrape = {}, stuckDel = 0, stuckCars = 0, nDel = 0, nCars = 0;
const busNs = new Int16Array(sim.cap).fill(-1), busRst = new Uint8Array(sim.cap);
const lastPath = new Int32Array(sim.cap).fill(-1), lastLane = new Int32Array(sim.cap).fill(-1), lastGen = new Uint32Array(sim.cap), svc = { entries: 0, narrow: 0, tight: 0, forced: 0, where: [] };
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
      if ((sim.steps + i) % 10 === 0) stuckStep(i, nm);
      if (process.env.TMV && stand[i] > 60 && Math.abs(stand[i] % 20 - 0) < STEP / 2) { const j = sim.nxt[i]; console.log(`  [stand] ${key} ${stand[i].toFixed(0)} s at ${sim.x[i].toFixed(1)},${sim.z[i].toFixed(1)} hold ${sim.hold[i]} lead ${sim.lead[i]} gap ${sim.gap[i].toFixed(1)} ctl ${sim.ctl[i]} rst ${sim.rst[i]} room ${sim.room[i].toFixed(2)} pw ${sim.pw[i].toFixed(2)}/${sim.pwT[i].toFixed(1)} next ${j >= 0 ? types[sim.type[j]].name + " v " + sim.v[j].toFixed(1) + " rst " + sim.rst[j] + " role " + sim.role[j] + " hold " + sim.hold[j] : "-"} path ${sim.path[i] & 0xffff} d ${sim.d[i].toFixed(1)}`); }
    }
    // (rule service-vehicle-passage: every lane a service vehicle enters, against its clear width: narrower than the
    // vehicle = it cannot physically pass (must be 0); narrower than it + 2 x 0.2 m = the router should have kept it off)
    // (the lane it spawned on is not a choice; a lane that was the only way on from the last one is 'forced': reported)
    if (HEAVY[nm] && nm !== "police_t" && (lastGen[i] !== sim.gen[i] || sim.path[i] !== lastPath[i])) {
      const fresh = lastGen[i] !== sim.gen[i];
      lastGen[i] = sim.gen[i]; lastPath[i] = sim.path[i];
      const g = sim.W.slots[sim.path[i] >>> 16], j = sim.path[i] & 0xffff, cw = g?.clearW?.[j] ?? Infinity, w = types[sim.type[i]].w;
      if (g && !g.kind[j]) {
        const from = lastLane[i]; lastLane[i] = sim.path[i];
        if (!fresh) {
          svc.entries++;
          let alt = false;
          const gf = from >= 0 ? sim.W.slots[from >>> 16] : null, f = from & 0xffff;
          if (gf && gf === g) for (let q = gf.nextOff[f]; q < gf.nextOff[f + 1]; q++) { const c = gf.nextIdx[q], L = gf.kind[c] && gf.nextOff[c] < gf.nextOff[c + 1] ? gf.nextIdx[gf.nextOff[c]] : c; if (L !== j && !(gf.clearW[L] < w + 0.4)) alt = true; }
          if (cw < w) { if (alt || !gf) { svc.narrow++; svc.where.push(`${nm} ${cw.toFixed(2)} m at ${sim.x[i].toFixed(0)}, ${sim.z[i].toFixed(0)}`); } else svc.forced++; }
          else if (cw < w + 0.4) svc.tight++;
        }
      }
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
// (claude/street4: the shares of what the MIX draws: the buses are not drawn from it (trafMix.js: every line on its
// route, its own timetable), so they are left out of the count. Counted in, a run where the buses got through faster
// (and so spawned more often) "lowered" the car share: 75 % vs 86 %, a measurement artefact)
const mixN = (T) => Math.max(1, T.n - (T.by.bus || 0));
const share = (T, k) => (T.by[k] || 0) / mixN(T);
const pct = (v) => (v * 100).toFixed(1) + " %";
const res = {};
for (const [label, where, hour, secs] of [["8 h Alsemberg", "alsemberg", 8, SECS], ["13 h Rue Rouge", "station", 13, SECS], ["18 h Alsemberg", "alsemberg", 18, Math.round(SECS / 2)]]) {
  const T = run(where, hour, secs), s = shares(hour, true);
  res[label] = T;
  const tCar = s.hatch_s + s.hatch_c + s.estate + s.saloon + s.suv, tVan = s.van_c + s.van_p;
  const tol = (p) => 3 * Math.sqrt((p * (1 - p)) / mixN(T)) + 0.02;
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
  const rem = Object.entries(stuckRemoved).map(([k, v]) => `${k} ${v}`);
  // (rule junction-entry-room: the cycle breaker is a safety net; the entry-room rule must keep gridlocks from forming)
  // (rule signal-demand: every signal approach of the run's tiles at most DEMAND_MAX of its green-time capacity at the
  // peak, as configured; every pair of signal junctions under 150 m apart on one road: one shared cycle (signals.js CYCLE,
  // city-wide) and the through movement on the same phase at both: a green wave of offset 0, its link run in under a
  // green)
  {
    const { laneDensity, SAT_FLOW, DEMAND_MAX } = await import(pathToFileURL(join(ROOT, "viewer/traffic/trafficSim.js")).href);
    const { CYCLE, CYCLE_T } = await import(pathToFileURL(join(ROOT, "viewer/traffic/signals.js")).href);
    let over = 0, appr = 0, pairs = 0, off = [];
    for (const g of W.slots) { if (!g) continue;
      for (let L = 0; L < g.paths; L++) {
        if (g.kind[L] || g.ctrl[L] !== 1) continue;
        appr++;
        const kmh = Math.max(10, g.speed[L] * 3.6), flow = laneDensity(g, L) * kmh;
        if (flow > DEMAND_MAX * SAT_FLOW * (CYCLE.green / CYCLE_T) + 1e-6) over++;
        for (let q = g.prevOff[L]; q < g.prevOff[L + 1]; q++) {
          const C = g.prevIdx[q]; if (!g.kind[C] || g.turn[C] !== 0 || g.nodeOf[C] < 0 || g.jnode[L] < 0) continue;
          const A = g.jnodes[g.nodeOf[C]], B = g.jnodes[g.jnode[L]]; if (!A.signal || A === B || Math.hypot(A.x - B.x, A.z - B.z) > 150) continue;
          const La = g.prevIdx[g.prevOff[C]]; if (La == null || g.ctrl[La] !== 1) continue;
          pairs++; if (g.phase[La] !== g.phase[L]) off.push(`${A.id}->${B.id}`);
        }
      }
    }
    check("signal approaches under capacity", appr > 0 && over === 0, `${appr} signal approaches, ${over} over ${DEMAND_MAX} x ${SAT_FLOW} veh/h x green share at the peak`);
    // (the baseline at the street4 merge: 3 (n140271967 <-> n2448080511 both ways at D7, n30151287 -> n254921174);
    // claude/signals1 took it to 0: the phase from the road, rule signal-phase-road (signals.js signalPhases); never raise)
    const PHASE_MAX = 0;
    // (rule signal-phase-road: the drawn posts and the sim read ONE table: every post of the tiles' cores shows the
    // phase of the sim's signal approach it faces: the lane into the signal node its traffic meets (signals.js ahead)
    // running along that node's arm road (the least mean distance of its last 20 m to the road), heading its way)
    {
      const { signalSites } = await import(pathToFileURL(join(ROOT, "viewer/streets/signalPlace.js")).href);
      const { signalPhases, nearestRoad } = await import(pathToFileURL(join(ROOT, "viewer/traffic/signals.js")).href);
      let posts = 0, met = 0; const bad = [];
      for (const { T, g, roads, feats, bounds: B } of tileG) {
        const PT = signalPhases(roads), N = new Map(roads.nodes.map((n) => [n.id, n])), byId = new Map(roads.roads.map((r) => [r.id, r]));
        for (const st of signalSites(feats.points, roads, {})) {
          if (!(st.x >= B.x0 && st.x < B.x1 && st.z >= B.z0 && st.z < B.z1)) continue;
          posts++;
          const nr = nearestRoad(roads, N, st.stop[0], st.stop[1]); if (!nr) continue;
          const h = PT.ahead(nr.road.id, st.tx * nr.ux + st.tz * nr.uz >= 0 ? nr.road.b : nr.road.a), R = h && byId.get(h.road);
          if (!R) continue;
          const poly = [N.get(R.a), ...R.pts, N.get(R.b)].filter(Boolean);
          const dRoad = (x, z) => { let m = Infinity; for (let k = 1; k < poly.length; k++) { const ax = poly[k - 1].x, az = poly[k - 1].z, dx = poly[k].x - ax, dz = poly[k].z - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(ax + dx * t - x, az + dz * t - z)); } return m; };
          let best = -1, bd = 8;
          for (let L = 0; L < g.paths; L++) {
            if (g.kind[L] || g.ctrl[L] !== 1 || g.jnode[L] < 0 || g.jnodes[g.jnode[L]].id !== h.node) continue;
            const e = g.off[L + 1] - 1, dx = g.xy[2 * e] - g.xy[2 * e - 2], dz = g.xy[2 * e + 1] - g.xy[2 * e - 1];
            if ((dx * st.tx + dz * st.tz) / (Math.hypot(dx, dz) || 1) < 0.3) continue;
            let sum = 0, n = 0;
            for (let k = e; k >= g.off[L] && g.cum[e] - g.cum[k] <= 20; k--) { sum += dRoad(g.xy[2 * k], g.xy[2 * k + 1]); n++; }
            if (n && sum / n < bd) { bd = sum / n; best = L; }
          }
          if (best < 0) continue;
          met++; if (g.phase[best] !== st.phase) bad.push(`${T} (${st.x.toFixed(0)}, ${st.z.toFixed(0)})`);
        }
      }
      check("posts and lanes on one phase", met > posts * 0.5 && !bad.length, `${posts} posts in the tile cores, ${met} facing a signal approach lane, ${bad.length} showing another phase than it${bad.length ? ": " + bad.slice(0, 6).join(", ") : ""}`);
    }
    check("close signal pairs coordinated", off.length <= PHASE_MAX, `${pairs} through movements between signal junctions < 150 m apart, one cycle (${CYCLE_T} s); on different phases: ${off.length ? off.slice(0, 4).join(", ") : "none"} (${off.length}, ceiling ${PHASE_MAX}: one phase along the road, rule signal-phase-road)`);
  }
  check("junction entry room", (sim.stats.cycleBreaks || 0) <= CYCLE_MAX, `wait-for loops broken: ${sim.stats.cycleBreaks || 0} (<= ${CYCLE_MAX}: cars start a junction turn only with room past it, reserved against the cars already turning there)`);
  // (a child: its stuck list, then done: the parent judges the three seeds)
  if (CHILD) { console.log(`SEEDRESULT ${JSON.stringify({ seed: SEED, stuck: stuckTrue, cycles: sim.stats.cycleBreaks || 0, svc })}`); process.exit(0); }
  const runs = [{ seed: SEED, stuck: stuckTrue, cycles: sim.stats.cycleBreaks || 0, svc }, ...(await Promise.all(kids))];
  {
    // (rule service-vehicle-passage: the lanes' clear widths exist, and no service vehicle entered a lane narrower than itself)
    let lanes = 0, measured = 0; for (const g of W.slots) if (g?.clearW) for (let j = 0; j < g.paths; j++) if (!g.kind[j]) { lanes++; if (Number.isFinite(g.clearW[j])) measured++; }
    const S = runs.filter((r) => r.svc).map((r) => r.svc), ent = S.reduce((a, o) => a + o.entries, 0), nar = S.reduce((a, o) => a + o.narrow, 0), ti = S.reduce((a, o) => a + o.tight, 0), fo = S.reduce((a, o) => a + o.forced, 0);
    check("service vehicles fit their lanes", measured > 0.25 * lanes && ent > 0 && nar === 0, `${measured} of ${lanes} lanes with a measured clear width; service vehicles (runs, buses, bin lorries) entered ${ent} lanes over seeds ${runs.map((r) => r.seed).join(" / ")}: ${nar} narrower than the vehicle with a wider way on${nar ? " (" + S.flatMap((o) => o.where).slice(0, 4).join("; ") + ")" : ""}, ${fo} narrower as the only way on (info), ${ti} within 0.4 m of it`);
  }
  const bad = runs.filter((r) => r.error), all = runs.flatMap((r) => (r.stuck || []).map((q) => ({ ...q, seed: r.seed })));
  for (const r of runs.slice(1)) if (!r.error) check(`junction entry room (seed ${r.seed})`, r.cycles <= CYCLE_MAX, `wait-for loops broken: ${r.cycles}`);
  check(`service vehicles stuck (seeds ${runs.map((r) => r.seed).join(" / ")})`, !bad.length && all.length <= STUCK_MAX && Object.keys(standMax).length > 0, `${bad.length ? bad.map((r) => `seed ${r.seed} ${r.error}`).join("; ") + "; " : ""}stuck (it and the queue ahead of it still ${STUCK_T} s, not a planned stop): ${runs.map((r) => `seed ${r.seed} ${r.stuck ? r.stuck.length : "?"}`).join(", ")} = ${all.length} (ceiling ${STUCK_MAX}: the remaining causes take it to 0)${all.length ? " -- " + all.map((q) => `${q.nm} at ${q.at} (seed ${q.seed}, hold ${q.hold}, chain ${q.chain})`).join("; ") : ""}`);
  // (the register: one entry per stuck PLACE, a 50 m cell, whatever vehicle stands there; three seeds only)
  if (REG && !ONE_SEED) {
    const { judge, report } = await import("./gaps.mjs");
    const inv = process.env.LANES_OLD ? "trafmix.stuckOld" : "trafmix.stuck", c50 = (v) => Math.round(v / 50) * 50;
    const tileOf = (x, z) => (tileB.find(([, B]) => x >= B.x0 && x < B.x1 && z >= B.z0 && z < B.z1) || ["?"])[0];
    const findings = all.map((q) => ({ id: `${inv}:cell@${c50(q.x)},${c50(q.z)}:0-0`, tile: tileOf(q.x, q.z), at: q.at, info: `${q.nm} seed ${q.seed} hold ${q.hold}` }));
    if (report("trafmix", judge(findings, { invariants: [inv], tiles: TILES }))) fails++;
  }
  console.log(`(info) the sim's removal timer (held 60 s in total, also in a moving queue): ${rem.length ? rem.join(", ") : "none"}; longest standstill: ${Object.entries(standMax).map(([k, v]) => `${k} ${v.toFixed(0)} s`).join(", ") || "none seen"}`);
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
// (claude/street4: TWO sims of each, built A B B A, every round times all four; the ratio is the mix pair's time over
// the plain pair's. One sim of each measured a sim's place in memory as much as the mix: two IDENTICAL plain sims
// (same seed, same traffic) timed this way came out 0.87-1.07 x apart, and the one-pair ratio flapped 1.03-1.13 round
// the 1.10 limit while the mix's own work, timed in sequence, was ~1 %. The twin pair's ratio is printed as the floor)
{
  const ctx = { visible: () => false, ...FOCUS.alsemberg };
  const A = makeSim(true, 11), B = makeSim(false, 11), B2 = makeSim(false, 11), A2 = makeSim(true, 11);
  const ALL = [A, B, B2, A2];
  for (const S of ALL) { S.params.hour = 8; for (let s = 0; s < Math.round(40 / STEP); s++) { S.clearObstacles(); S.step(ctx); } }
  const tt = ALL.map(() => []);
  // (30 rounds of 150 steps per sim, the order rotated each round; the median of the rounds' own ratios: each round
  // times all four back to back, so they see the machine in the same state)
  // (between two calibrations, again while the machine changed speed: tools/gate/timing.mjs; a ratio, so no k)
  const MT = await measure(() => {
    for (const t of tt) t.length = 0;
    for (let r = 0; r < 30; r++) for (let q = 0; q < 4; q++) {
      const k = (q + r) % 4, S = ALL[k], t = performance.now();
      let cars = 0;
      for (let s = 0; s < 150; s++) { S.clearObstacles(); S.step(ctx); cars += S.count; }
      tt[k].push(((performance.now() - t) / cars) * 1000);            // (us per car per step)
    }
  }, { tries: 3 });
  const med = (f) => { const v = tt[0].map((_, i) => f(i)).sort((x, y) => x - y); return v[v.length >> 1]; };
  const ratio = med((i) => (tt[0][i] + tt[3][i]) / (tt[1][i] + tt[2][i])), twin = med((i) => tt[1][i] / tt[2][i]);
  const ra = Math.min(...tt[0], ...tt[3]), rb = Math.min(...tt[1], ...tt[2]);
  check("sim cost", TRAFMIX_OLD || ratio <= 1.10, `${ra.toFixed(2)} us per car per step with the mix vs ${rb.toFixed(2)} without (x${ratio.toFixed(3)}, the median of 30 rounds, two sims of each; two identical plain sims x${twin.toFixed(3)}), ${A.count} + ${A2.count} / ${B.count} + ${B2.count} cars (${MT.note})`);
}
console.log(fails ? `${fails} trafmix check(s) FAILED${OLD ? " (?trafmix=old: expected)" : ""}` : "all trafmix checks pass");
process.exitCode = fails ? 1 : 0;
