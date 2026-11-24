// THE TRAFFIC MIX (claude/trafmix, docs/TRAFMIX.md; ?trafmix=old = the street mix as before: the 8 parked-car types by
// one fixed weight, no service vehicle, no bus). What drives in Uccle, by hour and place:
//   cars      hatchbacks / estates / saloons / SUVs (SUV ~30 % of the cars: the Belgian fleet after a decade of SUV sales)
//   vans      compact + panel vans, ~12 % of the flow on weekdays 7-19 h, ~4 % at night; a part of the panel / compact vans
//             are DELIVERY rounds: they stop in the lane with the hazards on for 25-60 s where they can pull right
//   taxis     ~1 % by day, more in the evening and at night
//   police    the Uccle zone's (Marlow) patrol cars: a few city-wide (0.5 % of the flow), six times as many within 700 m
//             of the station on Rue Rouge (they leave and come back there); white + Battenburg, a blue light bar
//   ambulance rare (0.25 %); 40 % of them on a run: blue beacons + the two-tone siren, the traffic pulls over
//             (trafficSim.js emergency sources, the police game's yield logic)
//   fire      very rare (0.06 %), only within 3 km of the fire station (PASI Chenaie), 60 % on a run
//   bin lorry weekday mornings 6:30-11 h (and a few 13-15 h): stop-and-go, beacons amber, hazards at each stop
//   buses     NOT drawn from the mix: every STIB / De Lijn line through the built city on its OSM route
//             (data/transit/trafmix.json), at its headway for the hour, stopping at its stops (dwell 12-30 s)
// The shares are the spawned vehicles' (what is on the road); the gate (tools/audit/trafmixGate.mjs) checks them.
import { Siren, dopplerFactor } from "../policeCar/siren.js";

export const TRAFMIX_OLD = typeof location !== "undefined" && /[?&]trafmix=old(&|$)/.test(location.search);
export const ROLE = { car: 0, patrol: 1, ambulance: 2, fire: 3, bus: 4, delivery: 5, bin: 6, taxi: 7 };
export const ROLE_NAMES = Object.keys(ROLE);
/** the service vehicles (models/cars/heavy.glb, tools/blender/heavies.py): size [w, h, l], wheelbase, wheel radius,
 *  zc = the body's centre ahead of the axles' middle (the sim poses the axles), mass (kg, carhit) */
export const HEAVY = {
  police_t: { size: [1.85, 1.58, 4.70], wb: 2.69, wheelR: 0.325, zc: 0, mass: 1650, dent: true },
  ambulance: { size: [2.20, 3.02, 6.94], wb: 3.665, wheelR: 0.36, zc: -0.64, mass: 4500 },
  fire: { size: [2.50, 3.28, 8.30], wb: 4.20, wheelR: 0.50, zc: -0.65, mass: 15000 },
  bus: { size: [2.55, 3.07, 12.0], wb: 5.95, wheelR: 0.50, zc: -0.325, mass: 13000 },
  bin: { size: [2.50, 3.42, 9.34], wb: 4.575, wheelR: 0.50, zc: -0.93, mass: 20000 },
};
export const HEAVY_TYPES = TRAFMIX_OLD ? [] : Object.keys(HEAVY);
export const HEAVY_URL = new URL("../../models/cars/heavy.glb", import.meta.url).href;
export const DATA_URL = new URL("../../data/transit/trafmix.json", import.meta.url).href;

// places (city metres; OSM, data/transit/trafmix.json places): the police station (Rue Rouge 17) and the fire station
export const STATION = { x: -514, z: -340 };
export const FIRE_STATION = { x: 450, z: 1765 };
const sRGB = (h) => { const c = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return [c((h >> 16) & 255), c((h >> 8) & 255), c(h & 255)]; };
/** bus paints (the livery's plain colour, no logo): STIB silver-grey, De Lijn yellow */
export const BUS_PAINT = { STIB: sRGB(0xb4b8bc), "De Lijn": sRGB(0xf2c200) };
/** delivery vans: a red post van, white and dark grey parcel vans (plain colours) */
const DELIVERY_PAINTS = [[sRGB(0xb3201b), 0.40], [sRGB(0xe8e8e4), 0.45], [sRGB(0x34383d), 0.15]];

/** the share of the flow per type at hour h (0-24), weekday (1-5) or weekend, and the place's boosts. -> out[name] */
export function shares(h, weekday, out = {}) {
  h = ((h % 24) + 24) % 24;
  const day = h >= 7 && h < 19, eve = h >= 19 && h < 23, night = !day && !eve;
  const vans = weekday ? (day ? 0.12 : (h >= 6 && h < 7) || (h >= 19 && h < 21) ? 0.07 : 0.04) : day ? 0.06 : 0.03;
  out.van_c = vans * 0.6; out.van_p = vans * 0.4;
  out.taxi = night ? 0.04 : eve ? 0.025 : 0.012;
  out.police_t = night ? 0.008 : 0.005;
  out.ambulance = 0.0025;
  out.fire = 0.0006;
  out.bin = weekday && h >= 6.5 && h < 11 ? 0.006 : weekday && h >= 13 && h < 15 ? 0.002 : 0;
  const cars = 1 - out.van_c - out.van_p - out.taxi - out.police_t - out.ambulance - out.fire - out.bin;
  out.hatch_s = cars * 0.21; out.hatch_c = cars * 0.23; out.estate = cars * 0.15; out.saloon = cars * 0.11; out.suv = cars * 0.30;
  // (claude/cars1 round 2) the boxy 4x4 is PARKED only for now (TYPE_MIX 6 %): with it at 8 % (or 5 %) of the traffic's
  // cars, trafmix seed 7 formed 19 (8) junction wait-for loops (ceiling 3) and two new stuck places at D6 / D7 (the
  // known chaotic junctions); 0 % keeps them at 1. A traffic job turns it on (X4_TRAFFIC) once those junctions hold.
  if (!X4_OLD && X4_TRAFFIC) { out.suv = cars * (0.30 - X4_TRAFFIC); out.x4 = cars * X4_TRAFFIC; }
  return out;
}
/** the place: patrols x6 within 700 m of the station; fire engines only within 3 km of the fire station; ambulances and
 *  fire engines on main roads (rank >= 2) x2, elsewhere x0.3; bin lorries never on boulevards (rank >= 4) */
const X4_OLD = typeof location !== "undefined" && /[?&]carlook=old(&|$)/.test(location.search);
/** the 4x4's share of the traffic's cars: 0 (parked only) until the D6 / D7 junctions hold it (see shares) */
export const X4_TRAFFIC = 0;
export function placeBoost(name, x, z, rank) {
  switch (name) {
    case "police_t": return (x - STATION.x) ** 2 + (z - STATION.z) ** 2 < 700 * 700 ? 6 : 1;
    case "fire": return (x - FIRE_STATION.x) ** 2 + (z - FIRE_STATION.z) ** 2 < 3000 * 3000 ? (rank >= 2 ? 2 : 0.3) : 0;
    case "ambulance": return rank >= 2 ? 2 : 0.3;
    case "bin": return rank >= 4 || rank < 1 ? 0 : 1;
    default: return 1;
  }
}
const isWeekday = () => { const d = new Date().getDay(); return d >= 1 && d <= 5; };
const WEEKDAY_Q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("weekday") : null;

/** The mix the sim spawns from (sim.mix). types: the sim's type list ({ name }); ready(name): the fleet can draw it. */
export class TrafMix {
  constructor(types, { ready = () => true, data = null } = {}) {
    this.types = types; this.ready = ready; this.data = data;
    this.idx = Object.fromEntries(types.map((t, k) => [t.name, k]));
    this.sh = {}; this.w = new Float64Array(types.length); this.hour = -1;
    this.weekday = WEEKDAY_Q != null ? WEEKDAY_Q === "1" : isWeekday();
    this.busIdx = this.idx.bus ?? -1;
  }
  setData(d) {
    this.data = d;
    // a route's cumulative length (m) along pts, and its stops' `at`
    for (const r of d?.routes || []) {
      const P = r.pts, cum = new Float32Array(P.length);
      for (let k = 1; k < P.length; k++) cum[k] = cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
      r.cum = cum; r.x = Float32Array.from(P, (p) => p[0]); r.z = Float32Array.from(P, (p) => p[1]);
    }
    this.routes = (d?.routes || []).filter((r) => r.len >= 400);
  }
  busPaint(r) { return BUS_PAINT[r.op] || BUS_PAINT.STIB; }
  /** headway (s) of route r at hour h; 0 = no service */
  headway(r, h) {
    h = ((h % 24) + 24) % 24;
    const B = this.data.bands;
    let k = 0; while (k < B.length - 2 && h >= B[k + 1]) k++;
    const m = r.headway[k];
    if (!m) return 0;
    if (r.nights) { const d = new Date().getDay(); if (!(d === 6 || d === 0) && WEEKDAY_Q == null) return 0; }     // Noctis: Fri / Sat nights (after 0 h: Sat / Sun)
    return m * 60 * (this.weekday ? 1 : 1.5);
  }
  /** -> { type, role, paint } for a car spawned at (x, z) on a lane of rank `rank` at hour h */
  pick(rand, h, x, z, rank) {
    if (this.hour !== h) { shares(h, this.weekday, this.sh); this.hour = h; }
    let tot = 0;
    for (let k = 0; k < this.types.length; k++) {
      const t = this.types[k];
      // (the two-wheelers keep their weight against the cars' 1: the mix's shares sum to 1 too)
      let w = t.two ? t.weight || 0 : this.sh[t.name] || 0;
      if (w && HEAVY[t.name] && !this.ready(t.name)) w = 0;
      if (w) w *= placeBoost(t.name, x, z, rank);
      this.w[k] = w; tot += w;
    }
    let r = rand() * tot, type = 0;
    for (let k = 0; k < this.types.length; k++) { if (r < this.w[k]) { type = k; break; } r -= this.w[k]; }
    const name = this.types[type].name;
    let role = ROLE.car, paint = null;
    if (name === "police_t") role = ROLE.patrol;
    else if (name === "ambulance") role = ROLE.ambulance;
    else if (name === "fire") role = ROLE.fire;
    else if (name === "bin") role = ROLE.bin;
    else if (name === "taxi") role = ROLE.taxi;
    else if ((name === "van_p" || name === "van_c") && this.weekday && h >= 8 && h < 18.5 && rand() < (name === "van_p" ? 0.55 : 0.25)) {
      role = ROLE.delivery;
      let q = rand(); for (const [p, s] of DELIVERY_PAINTS) { if (q < s) { paint = p; break; } q -= s; }
      paint ||= DELIVERY_PAINTS[0][0];
    }
    return { type, role, paint };
  }
}

/** a route's nearest point to (x, z) between a0 and a1 m along it -> [at, distance] (out) */
export function routeProject(r, x, z, a0, a1, out) {
  const cum = r.cum, X = r.x, Z = r.z, n = cum.length;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < a0) lo = m; else hi = m; }
  let best = Infinity, at = a0;
  for (let k = Math.max(1, lo); k < n && cum[k - 1] <= a1; k++) {
    const ax = X[k - 1], az = Z[k - 1], dx = X[k] - ax, dz = Z[k] - az, L2 = dx * dx + dz * dz;
    if (L2 < 1e-9) continue;
    let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - x, ez = az + dz * t - z, d2 = ex * ex + ez * ez;
    if (d2 < best) { best = d2; at = cum[k - 1] + Math.sqrt(L2) * t; }
  }
  out[0] = at; out[1] = Math.sqrt(best);
  return out;
}
/** the route's point and unit direction at `at` m -> out [x, z, dx, dz] */
export function routePoint(r, at, out) {
  const cum = r.cum, n = cum.length;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < at) lo = m; else hi = m; }
  const k = Math.max(1, hi), s = cum[k] - cum[k - 1] || 1, t = Math.max(0, Math.min(1, (at - cum[k - 1]) / s));
  const dx = r.x[k] - r.x[k - 1], dz = r.z[k] - r.z[k - 1], l = Math.hypot(dx, dz) || 1;
  out[0] = r.x[k - 1] + dx * t; out[1] = r.z[k - 1] + dz * t; out[2] = dx / l; out[3] = dz / l;
  return out;
}

/** THE TRAFFIC'S SIREN (the police car's Belgian two-tone, viewer/policeCar/siren.js): one voice for the nearest
 *  ambulance / fire engine on a run within 380 m of the listener, its level by distance, Doppler from both velocities.
 *  Its AudioContext is the sound gate's (viewer/audio/soundGate.js: muted by default, the speaker button). */
export class TrafficSiren {
  constructor() { this.ctx = null; this.siren = null; this.gain = null; this.src = -1; this.prev = { x: 0, z: 0 }; this.v = { x: 0, z: 0 }; }
  update(sim, lis, lisV, dt) {
    let best = -1, bd = 380 * 380;
    for (let k = 0; k < sim.emN; k++) {
      const i = sim.emI[k];
      if (sim.role[i] !== ROLE.ambulance && sim.role[i] !== ROLE.fire) continue;
      const d2 = (sim.x[i] - lis.x) ** 2 + (sim.z[i] - lis.z) ** 2;
      if (d2 < bd) { bd = d2; best = i; }
    }
    if (best < 0) { if (this.siren?.on) this.siren.stop(); this.src = -1; return; }
    if (!this.ctx) {
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return;
      this.ctx = new AC();
      this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.ctx.destination);
      this.siren = new Siren(this.ctx, this.gain);
    }
    const t = this.ctx.currentTime, d = Math.sqrt(bd);
    if (!this.siren.on) this.siren.start(t + 0.02);
    const vx = Math.sin(sim.yaw[best]) * sim.v[best], vz = Math.cos(sim.yaw[best]) * sim.v[best];
    this.gain.gain.setTargetAtTime(Math.min(1, 14 / (d + 8)) * 0.9, t, 0.1);
    this.siren.update(t, dopplerFactor({ x: sim.x[best], z: sim.z[best] }, lis, { x: vx, z: vz }, lisV));
    this.src = best;
  }
}
