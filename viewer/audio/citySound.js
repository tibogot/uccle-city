// THE CITY'S SOUND (docs/SOUND_CITY.md): the sound engine (engine.js, the Sound Lab's) wired to the live city. Every emitter
// comes from what the city simulates, nothing is a recording:
//   traffic   the nearest N cars of the moving traffic (viewer/traffic, sim arrays): tyre / road noise by speed, setts /
//             asphalt / wet road, brake squeal (no engine tone: the owner brings that model; drive mode's engineVoice slot)
//   transit   the trams 92 (tramline soundFeed: rumble, curve squeal, traction whine, bell leaving a stop and when someone
//             is on the track ahead, doors + chime at the stops) and the SNCB trains (trains soundFeed: rolling per car,
//             traction whine, bogie clacks at the switches)
//   nature    wind (open / in the trees, by the weather's wind), rain (the weather's rain: ground / roofs / trees by where
//             the listener stands), birds singing from the nearest trees by species, hour and month (parks: more), calls
//             from the sky flocks (birds2: starlings, jackdaws, gulls, parakeets, pigeons) when one is near
//   people    a murmur on the busy squares and shopping streets by day (Place de Saint-Job with its market, the Parvis
//             Saint-Pierre, every cluster of OSM shops)
//   bells     Saint-Job and Saint-Pierre strike the hours (the city clock, 7-22 h), Saint-Pierre a few seconds later
//   crash     the player's car contact: an impact by closing speed (+ glass on a hard hit), walls / posts / trees, and a
//             metal scrape while it slides along something
// The environment (canyon / park / open) comes from the street-canyon probes over the tiles' roof grid; muffling behind
// buildings from rays marched over the same grid. 10 Hz control rate, the engine's voice limit and priorities, HRTF for
// the nearest voices. Nothing is made while the sound is off: the context and the banks only on the first unmute.
// Host (main.js hookCitySound, or the headless test tools/sound/citySoundTest.mjs) gives the providers below.
import "./soundGate.js";                  // (the gate wraps AudioContext before this module can make one: the speaker button)
import { SoundEngine, IRBank, ENVIRONMENTS } from "./engine.js";
import { VehicleBank, createTyreVoice } from "./vehicles.js";
import { TransitBank, createTramVoice, createTrainVoice, playTramBell, playTramChime, playTramDoors, playBogieClack } from "./transit.js";
import { AmbienceBank, BirdBank, BellBank, createWindBed, createHumBed, createRainBed, createPlaygroundVoice, birdActivity, playHourStrikes } from "./ambience.js";
import { CrashBank, playImpact, createScrapeVoice } from "./crash.js";
import { playBuffer, clamp } from "./util.js";

export const CITY_SOUND_OLD = typeof location !== "undefined" && /[?&]citysound=old(&|$)/.test(location.search);

const SQUEAL_HZ = [1250, 3240];                  // the tram's curve-squeal wheel modes (transit.js; the Sound Lab's panel defaults)
const N_CARS = 14, N_TRAMS = 4, N_TRAINS = 2, N_PERCH = 10, N_MURMUR = 5;
const CAR_R = 150, CELL = 16;
// towers (city metres, x east / z south): the belfries; y = ground + `up`
const TOWERS = [
  { name: "Saint-Job", x: 1197.2, z: 547.6, up: 26, prime: 262, hum60: 14, delay: 0 },
  { name: "Saint-Pierre", x: -709, z: -492, up: 30, prime: 233, hum60: 16, delay: 3.5 },
];
// named busy places (the shop clusters are found from the tiles' OSM shops): x, z, radius, day level, market hours
const PLACES = [
  { name: "Place de Saint-Job", x: 1153, z: 540, level: 1, market: [8, 14] },
  { name: "Parvis Saint-Pierre", x: -690, z: -470, level: 0.8, market: null },
];
const MURMUR_KINDS = 2;
// bird species of a Uccle garden suburb: streets vs parks / woods (weights by repetition)
const STREET_BIRDS = ["blackbird", "robin", "greattit", "woodpigeon", "magpie", "blackbird", "robin", "crow"];
const PARK_BIRDS = ["blackbird", "robin", "greattit", "woodpigeon", "blackbird", "robin", "greattit", "woodpigeon", "magpie", "crow"];
// the sky flocks' calls (approximations from our six songs, pitched: no dedicated starling / parakeet synthesis yet)
const FLOCK_CALL = { murmuration: ["robin", 1.15, 2.5], starlings: ["robin", 1.15, 4], jackdaws: ["crow", 1.55, 6], jackdaws2: ["crow", 1.55, 6], gulls: ["crow", 1.2, 9], parakeets: ["magpie", 1.7, 3], pigeons: ["woodpigeon", 1.1, 10] };
const PAUSE = { blackbird: [3, 7], robin: [2.5, 6], greattit: [5, 12], woodpigeon: [8, 18], magpie: [10, 40], crow: [8, 30] };
const WALL_KINDS = new Set([0, 1, 2, 5]);     // colliders.js KIND: building, island, tree, wall (lamp / post / furniture: metal)

/**
 * host: {
 *   listener(L)            fill L.x, L.y, L.z (m, TAW) and L.fx, L.fy, L.fz (unit forward) - the camera
 *   tiles()                the loaded full tiles [{ name, bounds { x0, x1, z0, z1 }, feats, roads, roofs }]
 *   groundAt(x, z)         the ground height (m TAW)
 *   traffic()              { sim (trafficSim.js arrays), types } or null
 *   tram()                 an object with soundFeed(out, outD) (tramline.js) or null
 *   trains()               an object with soundFeed(out, outR) (rail/trains.js) or null
 *   flocks()               [{ key, on, x, y, z }] the sky flocks (cityBirds), or null
 *   clock()                seconds of the day (the city clock)
 *   month()                1..12
 *   weather(W)             fill W.rain 0..1, W.wind m/s, W.wet 0..1
 *   player(P)              fill P.on, P.car (the car, not a two-wheeler), P.x, P.y, P.z, P.vx, P.vz, P.speed, P.load
 * }
 * opts: { ctx (an OfflineAudioContext: the headless test), offline, bakeHere (no worker), voiceLimit, hrtfVoices }
 */
export function createCitySound(host, opts = {}) {
  const cs = {
    timing: !!opts.timing,                 // per-step ms in stats (?soundstats=1 / the test): performance.now boxes a number per call
    ready: false, starting: null, engine: null, ctx: opts.ctx || null, banks: null,
    stats: { feedMs: 0, controlMs: 0, frameMs: 0, steps: 0, cars: 0, trams: 0, trains: 0, perches: 0, murmurs: 0, bells: 0, impacts: 0, env: "", enclosure: 0 },
  };
  const L = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, inPark: false };
  const W = { rain: 0, wind: 2, wet: 0 };
  const P = { on: false, car: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, speed: 0, load: 0 };
  let B = null, E = null, wind = null, rain = null, hum = null;

  // ---------------------------------------------------------------------------------------------- the tiles' sound map
  // per tile (once, the first time the sound needs it): 16 m cells with the tree count, green (park / wood / grass /
  // playground / pitch), setts on the road, OSM shops; the roof grid (m TAW) is the tile's own (fly mode's)
  const grids = new Map();
  let gridQueue = 0;
  const buildGrid = (t) => {
    const b = t.bounds, nx = Math.max(1, Math.ceil((b.x1 - b.x0) / CELL)), nz = Math.max(1, Math.ceil((b.z1 - b.z0) / CELL)), N = nx * nz;
    const g = { name: t.name, x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1, nx, nz, trees: new Uint8Array(N), green: new Uint8Array(N), setts: new Uint8Array(N), shops: new Uint8Array(N), rf: t.roofs || null, treeXYZ: null, nTrees: 0, hotspots: [] };
    const ci = (x, z) => { const i = Math.floor((x - g.x0) / CELL), j = Math.floor((z - g.z0) / CELL); return i >= 0 && j >= 0 && i < nx && j < nz ? j * nx + i : -1; };
    const F = t.feats || {};
    const trees = F.trees || [];
    g.treeXYZ = new Float32Array(trees.length * 4);
    for (const tr of trees) {
      const k = ci(tr.x, tr.z); if (k < 0) continue;
      if (g.trees[k] < 255) g.trees[k]++;
      const o = g.nTrees++ * 4; g.treeXYZ[o] = tr.x; g.treeXYZ[o + 1] = (tr.y ?? 0) + Math.max(4, (tr.height ?? 10) * 0.7); g.treeXYZ[o + 2] = tr.z; g.treeXYZ[o + 3] = (Math.abs(tr.x * 7.13 + tr.z * 3.71) % 1);
    }
    for (const a of F.areas || []) {
      if (!/^(park|wood|grass|garden|playground|pitch|forest|meadow|nature_reserve|cemetery)$/.test(a.kind || "")) continue;
      const ring = a.rings?.[0]; if (!ring || ring.length < 3) continue;
      let ax0 = Infinity, ax1 = -Infinity, az0 = Infinity, az1 = -Infinity;
      for (const [x, z] of ring) { ax0 = Math.min(ax0, x); ax1 = Math.max(ax1, x); az0 = Math.min(az0, z); az1 = Math.max(az1, z); }
      for (let z = Math.floor((az0 - g.z0) / CELL) * CELL + g.z0 + CELL / 2; z < az1; z += CELL) for (let x = Math.floor((ax0 - g.x0) / CELL) * CELL + g.x0 + CELL / 2; x < ax1; x += CELL) {
        const k = ci(x, z); if (k < 0) continue;
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside; }
        if (inside) g.green[k] = 1;
      }
    }
    const R = t.roads;
    if (R?.roads && R.nodes) {
      const nodes = new Map(R.nodes.map((n) => [n.id, n]));
      for (const r of R.roads) {
        if (!/^(sett|cobblestone|unhewn_cobblestone|paving_stones)$/.test(r.meta?.surface || "")) continue;
        const pts = [nodes.get(r.a), ...(r.pts || []), nodes.get(r.b)].filter(Boolean);
        for (let k = 0; k + 1 < pts.length; k++) {
          const a = pts[k], c = pts[k + 1], len = Math.hypot(c.x - a.x, c.z - a.z), n = Math.max(1, Math.ceil(len / 4));
          for (let s = 0; s <= n; s++) { const q = ci(a.x + (c.x - a.x) * s / n, a.z + (c.z - a.z) * s / n); if (q >= 0) g.setts[q] = 1; }
        }
      }
    }
    for (const p of F.points || []) if (p.kind === "shop" || p.kind === "marketplace") { const k = ci(p.x, p.z); if (k >= 0 && g.shops[k] < 255) g.shops[k]++; }
    // hotspots: cells with 2+ shops in their 3 x 3 block (one per block)
    for (let j = 1; j < nz - 1; j += 3) for (let i = 1; i < nx - 1; i += 3) {
      let n = 0, sx = 0, sz = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const k = (j + dj) * nx + i + di, m = g.shops[k]; n += m; sx += m * (g.x0 + (i + di + 0.5) * CELL); sz += m * (g.z0 + (j + dj + 0.5) * CELL); }
      if (n >= 2) g.hotspots.push({ name: "shops", x: sx / n, z: sz / n, level: Math.min(1, 0.35 + n * 0.1), market: null });
    }
    return g;
  };
  const gridFor = (x, z) => {
    for (const g of grids.values()) if (x >= g.x0 && x < g.x1 && z >= g.z0 && z < g.z1) return g;
    return null;
  };
  // at most one tile's map a control step (a few ms each; never on a frame with the others)
  const syncGrids = () => {
    const tiles = host.tiles() || [];
    if (++gridQueue % 20 === 0) for (const name of grids.keys()) if (!tiles.some((t) => t.name === name)) grids.delete(name);
    for (const t of tiles) if (!grids.has(t.name)) { grids.set(t.name, buildGrid(t)); return; }
  };
  const cellVal = (g, arr, x, z) => { const i = Math.floor((x - g.x0) / CELL), j = Math.floor((z - g.z0) / CELL); return i >= 0 && j >= 0 && i < g.nx && j < g.nz ? arr[j * g.nx + i] : 0; };
  // trees within ~24 m (0..1) and green underfoot
  const treeCover = (x, z) => {
    let n = 0;
    const g = gridFor(x, z); if (!g) return 0;
    for (let dz = -CELL; dz <= CELL; dz += CELL) for (let dx = -CELL; dx <= CELL; dx += CELL) n += cellVal(g, g.trees, x + dx, z + dz);
    return clamp(n / 14);
  };

  // ---------------------------------------------------------------------------------------------- roofs: muffling + canyon
  // the length (m) of the segment a -> b that runs under a roof (the tile's 2 m roof grid, m TAW, 0 = none), marched in
  // `step` m, into SC[0] (a Float64Array: no number returned per call, no heap number per sample)
  const SC = new Float64Array(1);
  let rg = null;
  const blockedLen = (ax, ay, az, bx, by, bz, step) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dz * dz);
    SC[0] = 0;
    if (len < step) return;
    const n = Math.min(80, Math.ceil(len / step)), sl = len / n;
    let depth = 0;
    for (let k = 1; k < n; k++) {
      const f = k / n, x = ax + dx * f, z = az + dz * f;
      if (!rg || x < rg.x0 || x >= rg.x1 || z < rg.z0 || z >= rg.z1) { rg = gridFor(x, z); if (!rg) continue; }
      const rf = rg.rf; if (!rf) continue;
      const i = Math.floor((x - rf.x0) / rf.step), j = Math.floor((z - rf.z0) / rf.step);
      if (i < 0 || j < 0 || i >= rf.nx || j >= rf.nz) continue;
      const r = rf.data[j * rf.nx + i];
      if (r > 0 && r > ay + dy * f) depth += sl;
    }
    SC[0] = depth;
  };
  // two parallel rays 0.9 m either side (corners blend), as the engine's box trace; far sources marched coarser: s._occl
  const obstruction = (s, l) => {
    const dx = s.x - l.x, dz = s.z - l.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d < 3) { s._occl = 0; return; }
    const ox = -dz / d * 0.9, oz = dx / d * 0.9, step = d > 120 ? 6 : 3;
    blockedLen(l.x + ox, l.y, l.z + oz, s.x + ox, s.y, s.z + oz, step); const a = SC[0];
    blockedLen(l.x - ox, l.y, l.z - oz, s.x - ox, s.y, s.z - oz, step); const b = SC[0];
    s._occl = ((1 - Math.exp(-a * 0.45)) + (1 - Math.exp(-b * 0.45))) / 2;
  };
  // the street canyon: 8 probes 60 m out, rising 30 m (slop-newyork's enclosure): the share blocked by roofs (2 Hz)
  const enclosure = (l) => {
    let covered = 0;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, bx = l.x + Math.cos(a) * 60, bz = l.z + Math.sin(a) * 60;
      blockedLen(l.x, l.y, l.z, bx, l.y + 30, bz, 3);
      covered += 1 - Math.exp(-SC[0] * 0.1);
    }
    return covered / 8;
  };

  // ---------------------------------------------------------------------------------------------- sources (fixed pools)
  const cars = [], carOf = [], tramSlots = [], trainSlots = [], perches = [], murmurs = [];
  const near = { n: 0, i: new Int32Array(N_CARS), d2: new Float64Array(N_CARS) };
  let mark = new Uint8Array(0);
  const tramBuf = new Float32Array(N_TRAMS * 8), tramD = new Float64Array(N_TRAMS), trainBuf = new Float32Array(N_TRAINS * 4), trainR = new Array(N_TRAINS).fill(null), q4 = [0, 0, 0, 0];
  let tyre = null, scrape = null;
  // the feeds' clocks and levels in one Float64Array (closure lets holding doubles make a heap number per write)
  const ST = new Float64Array(10), SCRAPE = 0, SLIDE = 1, HOUR = 2, BEDS = 3, PERCH = 4, PX = 5, PZ = 6, MURMUR = 7, FLOCK = 8;
  ST[HOUR] = -1; ST[PX] = 1e9; ST[PZ] = 1e9;
  let flockNext = null;
  // every pool source has ONE shape (the same fields in the same order): the engine reads them all in one loop, and a
  // field load over 5+ shapes goes megamorphic, which boxes a fresh number per double field read
  const poolSource = (o) => Object.assign({
    category: "traffic", priority: 1, ref: 3, range: 200, doppler: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: 0, speed: 0, load: 0, accel: 0, curvature: 0,
    surface: "asphalt", roadWet: 0, tyreGain: 1, part: "", motored: false, squealHz: SQUEAL_HZ, level: 0, scrape: 0, slide: 0, place: null,
    seed: 0, gain: 1, wet: 1, noOcclusion: false, cone: null, active: false, create: null,
    _d: 0, score: 0, _rank: 0, _want: false, _occl: 0, _voice: null, _emitter: null, _retiring: false, _tick: 0,
  }, o);
  const tramLevel = (x, z, y) => host.groundAt ? host.groundAt(x, z) + y : y;

  function makeSources() {
    const ctxV = (fn) => (ctx, input, now) => fn(ctx, input, now);
    for (let k = 0; k < N_CARS; k++) {
      const src = poolSource({ category: "traffic", priority: 1, ref: 3, range: CAR_R + 20, doppler: true, surface: "asphalt", tyreGain: 1, seed: (k * 0.618) % 1 });
      src.create = ctxV((ctx, input, now) => createTyreVoice(ctx, B.veh, input, src, now));
      cars.push(src); carOf.push(-1); E.add(src);
    }
    for (let k = 0; k < N_TRAMS; k++) {
      const slot = { trip: -1, d: 0, t: 0, v: 0, a: 0, doors: 0, stopped: false, bellT: -99, parts: [] };
      for (const part of ["front", "rear"]) {
        const src = poolSource({ category: "transit", priority: 1.6, ref: 5, range: 320, doppler: true, part, seed: Math.random() });
        src.create = ctxV((ctx, input, now) => createTramVoice(ctx, B.tr, input, src, now));
        slot.parts.push(src); E.add(src);
      }
      tramSlots.push(slot);
    }
    for (let k = 0; k < N_TRAINS; k++) {
      const slot = { trip: -1, joints: new Float64Array(12).fill(NaN), cars: [] };
      for (let c = 0; c < 3; c++) {
        const src = poolSource({ category: "transit", priority: 1.8, ref: 8, range: 700, doppler: true, motored: c !== 1, seed: Math.random() });
        src.create = ctxV((ctx, input, now) => createTrainVoice(ctx, B.tr, input, src, now));
        slot.cars.push(src); E.add(src);
      }
      trainSlots.push(slot);
    }
    for (let k = 0; k < N_PERCH; k++) perches.push({ x: 0, y: 0, z: 0, species: "blackbird", next: 0, on: false });
    for (let k = 0; k < N_MURMUR; k++) {
      const src = poolSource({ category: "people", priority: 0.9, ref: 9, range: 170, seed: k * 0.37, wet: 1.2 });
      const buf = B.amb.murmur(1 + (k % MURMUR_KINDS));
      src.create = ctxV((ctx, input, now) => createPlaygroundVoice(ctx, buf, input, src, now));
      murmurs.push(src); E.add(src);
    }
    tyre = poolSource({ category: "traffic", priority: 2.2, ref: 2.5, range: 80, surface: "asphalt", tyreGain: 0.8, seed: 0.42, noOcclusion: true });
    tyre.create = ctxV((ctx, input, now) => createTyreVoice(ctx, B.veh, input, tyre, now));
    E.add(tyre);
    scrape = poolSource({ category: "traffic", priority: 3, ref: 2, range: 80, noOcclusion: true });
    scrape.create = ctxV((ctx, input, now) => createScrapeVoice(ctx, B.crash, input, scrape, now));
    E.add(scrape);
    flockNext = new Float64Array(16);
  }

  // ---------------------------------------------------------------------------------------------- the feeds (control rate)
  const hourNow = () => ((host.clock?.() ?? 43200) % 86400) / 3600;
  const dayLevel = (h) => clamp((h - 6.5) / 1.5) * clamp((21.5 - h) / 1.5);    // people about: 8-20 h, ramps

  function feedTraffic() {
    const T = host.traffic?.(), sim = T?.sim;
    let used = 0;
    near.n = 0;
    if (sim && sim.alive) {
      if (mark.length !== sim.cap) mark = new Uint8Array(sim.cap);
      const R2 = CAR_R * CAR_R;
      // the nearest N_CARS (an insertion list: no sort, no allocation)
      for (let i = 0; i < sim.cap; i++) {
        if (!sim.alive[i]) continue;
        const dx = sim.x[i] - L.x, dz = sim.z[i] - L.z, d2 = dx * dx + dz * dz;
        if (d2 > R2 || (near.n === N_CARS && d2 >= near.d2[N_CARS - 1])) continue;
        let j = near.n < N_CARS ? near.n++ : N_CARS - 1;
        while (j > 0 && near.d2[j - 1] > d2) { near.d2[j] = near.d2[j - 1]; near.i[j] = near.i[j - 1]; j--; }
        near.d2[j] = d2; near.i[j] = i;
      }
      for (let k = 0; k < near.n; k++) mark[near.i[k]] = 1;
    }
    // slots: keep a car while it stays among the nearest; a released slot is free once its voice is gone
    for (let k = 0; k < N_CARS; k++) {
      const i = carOf[k], s = cars[k];
      if (i >= 0 && sim && mark[i] && sim.alive[i]) { mark[i] = 2; placeCar(s, sim, T, i); used++; }
      else if (i >= 0) { s.active = false; if (!s._voice) carOf[k] = -1; }
    }
    for (let k = 0; k < near.n; k++) {
      const i = near.i[k];
      if (mark[i] === 1) for (let q = 0; q < N_CARS; q++) if (carOf[q] < 0) { carOf[q] = i; cars[q].active = true; placeCar(cars[q], sim, T, i); used++; break; }
      mark[i] = 0;
    }
    cs.stats.cars = used;
  }
  function placeCar(s, sim, T, i) {
    const v = sim.v[i], yaw = sim.yaw[i], sn = Math.sin(yaw), c = Math.cos(yaw);
    s.x = sim.x[i]; s.z = sim.z[i]; s.y = sim.y[i] + 0.35; s.vx = sn * v; s.vz = c * v; s.speed = v; s.heading = yaw;
    const a = sim.acc ? sim.acc[i] : 0;
    s.load = a < -0.8 ? -0.6 : a > 0.4 ? 0.6 : 0.2;
    const g = gridFor(s.x, s.z);
    s.surface = g && cellVal(g, g.setts, s.x, s.z) ? "setts" : "asphalt";
    s.roadWet = W.wet;
    const ty = T.types?.[sim.type[i]];
    s.tyreGain = ty && ty.len < 2.6 ? 0.45 : ty && ty.len > 4.9 ? 1.25 : 1;     // two-wheelers quieter, vans louder
    s.active = true;
  }

  function feedTrams(t) {
    const tl = host.tram?.();
    const n = tl?.soundFeed ? tl.soundFeed(tramBuf, tramD) : 0;
    let used = 0;
    for (const slot of tramSlots) slot.seen = false;
    for (let k = 0; k < n; k++) {
      const o = k * 8, trip = tramBuf[o + 7];
      const fx = tramBuf[o], fz = tramBuf[o + 1];
      if ((fx - L.x) ** 2 + (fz - L.z) ** 2 > 400 * 400) continue;
      let slot = null;
      for (const s of tramSlots) if (s.trip === trip) { slot = s; break; }
      if (!slot) for (const s of tramSlots) if (s.trip < 0 && !s.parts[0]._voice && !s.parts[1]._voice) { slot = s; s.trip = trip; s.d = tramD[k]; s.t = t; s.v = 0; s.a = 0; s.doors = tramBuf[o + 6]; s.stopped = s.doors > 0; break; }
      if (!slot) continue;
      slot.seen = true; used++;
      const dt = t - slot.t;
      if (dt > 0.02) {
        const v = clamp((tramD[k] - slot.d) / dt, -20, 20);
        const a = (v - slot.v) / dt;
        slot.a += (clamp(a, -1.6, 1.6) - slot.a) * 0.5; slot.v += (v - slot.v) * 0.6; slot.d = tramD[k]; slot.t = t;
      }
      const h = tramBuf[o + 2], tx = Math.cos(h), tz = -Math.sin(h), v = Math.max(0, slot.v);
      for (let p = 0; p < 2; p++) {
        const s = slot.parts[p], x = tramBuf[o + p * 3], z = tramBuf[o + 1 + p * 3];
        s.x = x; s.z = z; s.y = tramLevel(x, z, 0.6); s.vx = tx * v; s.vz = tz * v; s.speed = v; s.accel = slot.a; s.curvature = tramBuf[o + 5]; s.active = true;
      }
      // the stop: chime as the doors open, the door cycle (beeps, motor, thump) as they close, the bell pulling away
      const doors = tramBuf[o + 6], f = slot.parts[0];
      if (doors > 0.05 && slot.doors <= 0.05) tramEvent(f, 2, 50, 0.5, (ctx, out, when) => playTramChime(ctx, B.tr, out, when));
      if (doors < 0.95 && slot.doors >= 0.95) tramEvent(f, 2.5, 70, 1, (ctx, out, when) => playTramDoors(ctx, B.tr, out, when));
      if (doors > 0) slot.stopped = true;
      if (slot.stopped && doors === 0 && v > 0.6) { slot.stopped = false; bell(slot, t); }
      slot.doors = doors;
      // the crossing / someone on the track ahead: the player, the listener on foot, the nearest traffic cars
      if (v > 3 && t - slot.bellT > 8 && (onTrackAhead(f, tx, tz, P.on ? P.x : L.x, P.on ? P.z : L.z) || carsOnTrack(f, tx, tz))) bell(slot, t);
    }
    for (const slot of tramSlots) if (!slot.seen && slot.trip >= 0) { slot.parts[0].active = slot.parts[1].active = false; if (!slot.parts[0]._voice && !slot.parts[1]._voice) slot.trip = -1; }
    cs.stats.trams = used;
  }
  const onTrackAhead = (f, tx, tz, x, z) => { const dx = x - f.x, dz = z - f.z, along = dx * tx + dz * tz, side = Math.abs(dx * tz - dz * tx); return along > 3 && along < 22 && side < 2.6; };
  const carsOnTrack = (f, tx, tz) => { for (let k = 0; k < N_CARS; k++) { const s = cars[k]; if (s.active && onTrackAhead(f, tx, tz, s.x, s.z)) return true; } return false; };
  function tramEvent(f, ref, range, wet, play) {
    E.event({ category: "transit", priority: 2.5, ref, range, wet, x: f.x, y: f.y + 1.9, z: f.z, vx: f.vx, vz: f.vz, doppler: true, follow: f, dy: 1.9 }, play);
  }
  function bell(slot, t) { slot.bellT = t; cs.stats.bells++; tramEvent(slot.parts[0], 6, 260, 1, (ctx, out, when) => playTramBell(ctx, B.tr, out, when)); }

  function feedTrains(t) {
    const tr = host.trains?.();
    const n = tr?.soundFeed ? tr.soundFeed(trainBuf, trainR) : 0;
    let used = 0;
    for (const slot of trainSlots) slot.seen = false;
    for (let k = 0; k < n; k++) {
      const o = k * 4, trip = trainBuf[o], v = trainBuf[o + 1], len = trainBuf[o + 2], d = trainBuf[o + 3], R = trainR[k];
      if (!R?.atInto) continue;
      R.atInto(d - len / 2, q4);
      if ((q4[0] - L.x) ** 2 + (q4[2] - L.z) ** 2 > 800 * 800) continue;
      let slot = null;
      for (const s of trainSlots) if (s.trip === trip) { slot = s; break; }
      if (!slot) for (const s of trainSlots) if (s.trip < 0 && !s.cars[0]._voice && !s.cars[1]._voice && !s.cars[2]._voice) { slot = s; s.trip = trip; s.joints.fill(NaN); break; }
      if (!slot) continue;
      slot.seen = true; used++;
      for (let c = 0; c < 3; c++) {
        const s = slot.cars[c];
        R.atInto(d - (c + 0.5) * len / 3, q4);
        const tx = Math.cos(q4[3]), tz = -Math.sin(q4[3]);
        s.x = q4[0]; s.y = q4[1] + 1; s.z = q4[2]; s.vx = tx * v; s.vz = tz * v; s.speed = Math.abs(v); s.active = true;
      }
      // bogie clacks at the switches / insulated joints (every ~140 m of track here: SNCB lines are welded between them)
      const units = Math.max(1, Math.round(len / 81)), nb = Math.min(12, units * 6);
      for (let b = 0; b < nb; b++) {
        const off = Math.floor(b / 2) * 27 + (b % 2 ? 23 : 4), jd = Math.floor((d - off) / 140), prev = slot.joints[b];
        slot.joints[b] = jd;
        if (prev === prev && jd !== prev && Math.abs(v) > 2) {
          R.atInto(jd * 140 + (v > 0 ? 0 : 140), q4);
          const x = q4[0], y = q4[1] + 0.3, z = q4[2], gap = 2.6 / Math.max(2, Math.abs(v)), seed = b;
          E.event({ category: "transit", priority: 1.4, ref: 3, range: 400, x, y, z }, (ctx, out, when) => playBogieClack(ctx, B.tr, out, when, gap, seed));
        }
      }
    }
    for (const slot of trainSlots) if (!slot.seen && slot.trip >= 0) { for (const s of slot.cars) s.active = false; if (!slot.cars[0]._voice && !slot.cars[1]._voice && !slot.cars[2]._voice) slot.trip = -1; }
    cs.stats.trains = used;
  }

  // birds on the nearest trees (refreshed when the listener has moved 25 m), each singing by its species' activity
  function feedBirds(t) {
    const h = hourNow(), m = host.month?.() ?? 5;
    if (t >= ST[PERCH] && (Math.abs(L.x - ST[PX]) + Math.abs(L.z - ST[PZ]) > 25)) {
      ST[PERCH] = t + 3; ST[PX] = L.x; ST[PZ] = L.z;
      const g = gridFor(L.x, L.z);
      for (const p of perches) p.on = false;
      if (g && g.nTrees) {
        // the N_PERCH nearest trees at least 8 m apart (one pass, insertion by distance)
        let n = 0;
        const D = g.treeXYZ;
        for (let k = 0; k < g.nTrees; k++) {
          const x = D[k * 4], z = D[k * 4 + 2], d2 = (x - L.x) ** 2 + (z - L.z) ** 2;
          if (d2 > 90 * 90) continue;
          let clash = false;
          for (let q = 0; q < n; q++) if ((perches[q].x - x) ** 2 + (perches[q].z - z) ** 2 < 64) { clash = true; break; }
          if (clash) continue;
          if (n < N_PERCH) { const p = perches[n++]; p.x = x; p.y = D[k * 4 + 1]; p.z = z; p.h = D[k * 4 + 3]; p.d2 = d2; p.on = true; }
          else { let w = 0; for (let q = 1; q < n; q++) if (perches[q].d2 > perches[w].d2) w = q; if (d2 < perches[w].d2) { const p = perches[w]; p.x = x; p.y = D[k * 4 + 1]; p.z = z; p.h = D[k * 4 + 3]; p.d2 = d2; } }
        }
        for (const p of perches) if (p.on) { const park = cellVal(g, g.green, p.x, p.z), list = park ? PARK_BIRDS : STREET_BIRDS; p.species = list[Math.floor(p.h * list.length) % list.length]; p.park = park; if (p.next < t) p.next = t + p.h * 4; }
      }
      let np = 0; for (const p of perches) if (p.on) np++;
      cs.stats.perches = np;
    }
    const wet = 1 - clamp(W.rain * 1.6) * 0.85;
    for (const p of perches) {
      if (!p.on || t < p.next) continue;
      const act = birdActivity(p.species, h, m) * (p.park ? 1 : 0.6) * wet;
      if (Math.random() < act) {
        const buf = B.birds.song(p.species, Math.floor(Math.random() * 4)), sp = p.species;
        E.event({ category: "nature", priority: 0.7 + act * 0.5, ref: sp === "woodpigeon" ? 2 : 3, range: sp === "crow" || sp === "magpie" ? 260 : 160, x: p.x, y: p.y, z: p.z, wet: 0.8 },
          (ctx, out, when) => playBuffer(ctx, buf, out, when, { gain: 0.6, rate: 0.98 + Math.random() * 0.04 }));
        const pz = PAUSE[sp]; p.next = t + buf.duration + pz[0] + Math.random() * (pz[1] - pz[0]);
      } else p.next = t + 2 + Math.random() * 4;
    }
    // the sky flocks: a call from the flock now and then when one is within 250 m (and it is day)
    const F = host.flocks?.();
    if (F && t >= ST[FLOCK]) {
      ST[FLOCK] = t + 0.5;
      for (let k = 0; k < F.length && k < 16; k++) {
        const f = F[k], call = FLOCK_CALL[f.key];
        if (!f.on || !call || t < flockNext[k]) continue;
        const d2 = (f.x - L.x) ** 2 + (f.z - L.z) ** 2;
        if (d2 > 250 * 250) continue;
        const sp = call[0], rate = call[1], every = call[2], buf = B.birds.song(sp, Math.floor(Math.random() * 4));
        E.event({ category: "nature", priority: 0.9, ref: 4, range: 300, x: f.x, y: f.y, z: f.z, wet: 0.9, noOcclusion: true },
          (ctx, out, when) => playBuffer(ctx, buf, out, when, { gain: 0.5, rate: rate * (0.97 + Math.random() * 0.06) }));
        flockNext[k] = t + every * (0.6 + Math.random() * 0.8);
      }
    }
  }

  // the murmur: the N_MURMUR nearest busy places within 170 m (every 2 s), by hour, rain and the market
  const cand = [];
  function feedPeople(t) {
    if (t < ST[MURMUR]) { for (const s of murmurs) if (s.place) s.level = placeLevel(s.place); return; }
    ST[MURMUR] = t + 2;
    let nc = 0;
    for (const p of PLACES) cand[nc++] = p;
    for (const g of grids.values()) for (const p of g.hotspots) cand[nc++] = p;
    for (const s of murmurs) { s.active = false; s.place = null; }
    for (let k = 0; k < N_MURMUR; k++) {
      let best = null, bd = 170 * 170;
      for (let q = 0; q < nc; q++) { const p = cand[q]; if (p._t === t) continue; const d2 = (p.x - L.x) ** 2 + (p.z - L.z) ** 2; if (d2 < bd) { bd = d2; best = p; } }
      if (!best) break;
      best._t = t;
      const s = murmurs[k];
      s.place = best; s.x = best.x; s.z = best.z; s.y = (host.groundAt ? host.groundAt(best.x, best.z) : 0) + 1.6; s.level = placeLevel(best); s.active = s.level > 0.02;
    }
    let nm = 0; for (const s of murmurs) if (s.active) nm++;
    cs.stats.murmurs = nm;
  }
  function placeLevel(p) {
    const h = hourNow(), market = p.market && h >= p.market[0] && h < p.market[1] ? 1.6 : 1;
    return dayLevel(h) * p.level * market * (1 - clamp(W.rain * 1.5) * 0.6);
  }

  // church bells on the hour (the city clock), 7-22 h
  function feedBells(t) {
    const h = Math.floor(hourNow());
    if (ST[HOUR] >= 0 && h !== ST[HOUR] && h >= 7 && h <= 22) {
      for (const tw of TOWERS) {
        const y = (host.groundAt ? host.groundAt(tw.x, tw.z) : 0) + tw.up, when = t + tw.delay;
        E.event({ category: "bells", priority: 3, ref: 25, range: 3000, x: tw.x, y, z: tw.z, wet: 1.2 }, (ctx, out) => playHourStrikes(ctx, B.bells, out, when, h, tw), when);
      }
      cs.stats.bells++;
    }
    ST[HOUR] = h;
  }

  // beds (2 Hz): wind by the weather's wind, in the trees; rain by intensity and where the listener stands; the city hum
  function feedBeds(t) {
    if (t < ST[BEDS]) return;
    ST[BEDS] = t + 0.5;
    const trees = treeCover(L.x, L.z), enc = E.enclosure, h = hourNow(), g = gridFor(L.x, L.z);
    L.inPark = !!(g && cellVal(g, g.green, L.x, L.z)) && enc < 0.25;
    const ws = clamp(0.12 + W.wind / 12);
    const wp = wind.params, rp = rain.params, hp = hum.params;
    wp.speed = ws; wp.trees = trees; wp.shelter = clamp(enc * 1.2);
    rp.intensity = W.rain; rp.ground = 1; rp.roof = clamp(enc * 0.8); rp.trees = trees;
    const night = h < 6 || h > 22 ? 1 : h < 7 ? 7 - h : h > 21 ? h - 21 : 0;
    hp.level = 0.35 + clamp(cs.stats.cars / N_CARS) * 0.25; hp.night = clamp(night);
    cs.stats.env = E.envName; cs.stats.enclosure = enc;
  }

  // the player's car: tyres (the car only: the two-wheelers' own sound has its tyres) and the scrape (any vehicle)
  function feedPlayer() {
    host.player?.(P);
    tyre.active = P.on && P.car;
    if (tyre.active) { tyre.x = P.x; tyre.y = P.y + 0.3; tyre.z = P.z; tyre.speed = P.speed; tyre.load = P.load; tyre.roadWet = W.wet; const g = gridFor(P.x, P.z); tyre.surface = g && cellVal(g, g.setts, P.x, P.z) ? "setts" : "asphalt"; }
    scrape.x = P.x; scrape.y = P.y + 0.4; scrape.z = P.z;
    scrape.scrape = P.on ? ST[SCRAPE] : 0; scrape.slide = ST[SLIDE];
    scrape.active = P.on && (ST[SCRAPE] > 0.02 || !!scrape._voice);
    ST[SCRAPE] *= 0.55;                          // (decays unless the contact goes on: cs.contact() each frame)
  }

  function feed(t) {
    const t0 = cs.timing ? performance.now() : 0;
    host.listener(L);
    const l = E.listener; l.x = L.x; l.y = L.y; l.z = L.z; l.fx = L.fx; l.fy = L.fy; l.fz = L.fz; l.inPark = L.inPark;
    host.weather?.(W);
    syncGrids();
    feedTraffic(); feedTrams(t); feedTrains(t); feedPlayer(); feedBirds(t); feedPeople(t); feedBells(t); feedBeds(t);
    if (cs.timing) cs.stats.feedMs = cs.stats.feedMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  // ---------------------------------------------------------------------------------------------- start / frame / events
  /** create the context (the first unmute), bake the banks (a worker; the test: here), build the engine and beds */
  cs.start = async () => {
    if (cs.ready || cs.starting) return cs.starting;
    cs.starting = (async () => {
      const ctx = cs.ctx ??= new AudioContext({ latencyHint: "interactive" });
      B = cs.banks = { veh: new VehicleBank(ctx), tr: new TransitBank(ctx), amb: new AmbienceBank(ctx), birds: new BirdBank(ctx), bells: new BellBank(ctx), crash: new CrashBank(ctx), irs: new IRBank(ctx) };
      const jobs = [...Object.keys(ENVIRONMENTS).map((n) => ["irs", "ir", n]), ["veh", "pink"], ["veh", "setts", 4], ["veh", "setts", 12], ["tr", "pink"], ["tr", "gong", 1046], ["tr", "gong", 784], ["tr", "doors", 5], ["tr", "chime", 1318, 1046],
        ["amb", "pink"], ["amb", "white"], ["amb", "gusts"], ["amb", "flutter"], ["amb", "cubeCurve"], ["crash", "scrape"], ["crash", "glass", 0], ["crash", "glass", 1]];
      for (let k = 0; k < 3; k++) jobs.push(["veh", "squeal", k]);
      for (let k = 0; k < 4; k++) jobs.push(["tr", "clack", k]);
      for (const sp of ["blackbird", "robin", "greattit", "woodpigeon", "magpie", "crow"]) for (let v = 0; v < 4; v++) jobs.push(["birds", "song", sp, v]);
      for (const tw of TOWERS) for (const s of [1, 2]) jobs.push(["bells", "strike", tw.prime, tw.hum60, s]);
      for (let k = 1; k <= MURMUR_KINDS; k++) jobs.push(["amb", "murmur", k]);
      for (const sf of ["ground", "roof", "trees"]) for (const hv of [0, 1]) jobs.push(["amb", "rain", sf, hv]);   // (a rain bed's layer bakes nothing on a frame)
      for (let l = 0; l < 3; l++) for (let v = 0; v < 3; v++) jobs.push(["crash", "impact", l, v], ["crash", "wall", l, v]);
      const t0 = performance.now();
      if (opts.bakeHere) for (const [b, m, ...a] of jobs) B[b][m](...a);
      else { const { bakeInWorker } = await import("./bake.js"); cs.bake = await bakeInWorker(ctx, B, jobs); }
      cs.stats.bakeMs = performance.now() - t0;
      // (the engine after the banks: its impulse responses come baked, none is made on a frame)
      E = cs.engine = new SoundEngine(ctx, { voiceLimit: opts.voiceLimit ?? 32, hrtfVoices: opts.hrtfVoices ?? 6, controlRate: 10, offline: !!opts.offline, environment: "open", irs: B.irs.c });
      E.obstructionFn = obstruction; E.enclosureFn = enclosure; E.timing = cs.timing;
      wind = E.addBed("nature", createWindBed(B.amb)); rain = E.addBed("nature", createRainBed(B.amb)); hum = E.addBed("traffic", createHumBed(B.amb));
      E.setCategory("traffic", 0.9); E.setCategory("people", 0.8);
      makeSources();
      E.beforeControl = feed;
      cs.ready = true;
    })();
    return cs.starting;
  };
  /** live, every frame: the engine's control step at 10 Hz (the feeds just before it), its voice slices between */
  cs.frame = (dt) => {
    if (!cs.ready) return 0;
    const ms = E.frame(dt);
    if (cs.timing) cs.stats.frameMs = cs.stats.frameMs * 0.95 + ms * 0.05;
    return ms;
  };
  /** offline (the headless test): feeds + one control step at time t */
  cs.step = (t) => { if (!cs.ready) return 0; const t0 = performance.now(); feed(t); E.control(t); cs.stats.steps++; return performance.now() - t0; };
  /** a hit: { x, z, y, speed (closing m/s), impulse scale k, wall (a building / kerb / tree), kind } */
  cs.impact = (h) => {
    if (!cs.ready) return null;
    cs.stats.impacts++;
    const seed = Math.random(), y = (h.y ?? (host.groundAt ? host.groundAt(h.x, h.z) : 0)) + 0.5;
    return E.event({ category: "traffic", priority: 3.5, ref: 4, range: 220, x: h.x, y, z: h.z, wet: 1, noOcclusion: false, seed },
      (ctx, out, when) => playImpact(ctx, B.crash, out, when, { speed: h.speed, wall: !!h.wall, k: h.k ?? 1, seed }));
  };
  /** the player's vehicle in contact this frame (sliding speed m/s): the scrape follows it */
  cs.contact = (slide) => { if (slide > 0.8) { ST[SCRAPE] = Math.max(ST[SCRAPE], clamp((slide - 0.8) / 8, 0.15, 1)); ST[SLIDE] = slide; } };
  cs.WALL_KINDS = WALL_KINDS;
  return cs;
}

// ------------------------------------------------------------------------------------------------ the city's hookup
/** main.js: providers from the live city; starts on the first unmute (the speaker button), runs only while unmuted */
export function hookCitySound({ soundGate, camera, world, driver, getTram, getTrains, getTraffic, getFlocks, wx, updaters, log = () => {} }) {
  if (CITY_SOUND_OLD) { log("city sound: off (?citysound=old: the city as before, silent)"); return null; }
  const fwd = { x: 0, y: 0, z: -1 }, e = camera.matrixWorld.elements;
  let month = new Date().getMonth() + 1;
  const dayP = typeof location !== "undefined" ? new URLSearchParams(location.search).get("day") : null;
  if (dayP && /^\d{4}-\d{2}/.test(dayP)) month = +dayP.slice(5, 7);
  const flockOut = [];
  const host = {
    listener(L) {
      L.x = camera.position.x; L.y = camera.position.y; L.z = camera.position.z;
      fwd.x = -e[8]; fwd.y = -e[9]; fwd.z = -e[10];             // (the camera looks down its -z: no Vector3 per call)
      const n = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y + fwd.z * fwd.z) || 1;   // (no Math.hypot on a hot path: it allocates) L.fx = fwd.x / n; L.fy = fwd.y / n; L.fz = fwd.z / n;
    },
    tiles: () => world.tiles,
    groundAt: (x, z) => world.surface(x, z),
    traffic: () => { const T = getTraffic(); return T?.sim ? T : null; },
    tram: getTram, trains: getTrains,
    flocks() {
      const B = getFlocks?.();
      if (!B?.flocks || !B.sky) return null;
      if (flockOut.length !== B.flocks.length) { flockOut.length = 0; for (const F of B.flocks) flockOut.push({ key: F.key, on: false, x: 0, y: 0, z: 0 }); }
      for (let k = 0; k < B.flocks.length; k++) { const F = B.flocks[k], o = flockOut[k], r = B.sky.row(F.k, 0); o.on = F.state !== "off"; o.x = r.x; o.y = r.y; o.z = r.z; }
      return flockOut;
    },
    clock: () => getTram()?.clockSecs ?? ((Date.now() / 1000 + 3600) % 86400),
    month: () => month,
    weather(W) { W.rain = wx?.uRain?.value ?? 0; const w = wx?.uWind?.value; W.wind = w ? Math.sqrt(w.x * w.x + w.y * w.y) : 2; W.wet = wx?.uWet?.value ?? 0; },
    player(P) {
      const c = driver?.state;
      P.on = !!(driver?.on && c); if (!P.on) return;
      P.car = driver.vehicle === "car";
      P.x = c.x; P.z = c.z; P.y = Number.isFinite(c.y) ? c.y : world.surface(c.x, c.z);
      P.speed = Math.abs(c.speed) || 0; P.load = c.braking ? -0.6 : 0.3;
    },
  };
  const cs = createCitySound(host, { timing: typeof location !== "undefined" && /[?&]soundstats=1(&|$)/.test(location.search) });
  window.__citySound = cs;
  // the hits: the two-way car contact's event (traffic / parked / bodies) and the walls (carPhysics lastHit, not a car)
  let hooked = null, lastWall = 0;
  const hookHits = () => {
    const ch = driver?.carHit;
    if (!ch || hooked === ch) return;
    hooked = ch;
    ch.on("carHit", (ev) => cs.impact({ x: ev.point.x, z: ev.point.z, speed: ev.speed, k: clamp(0.6 + ev.impulse / 8000, 0.6, 1.4) }));
  };
  const T = new Float64Array(1); T[0] = performance.now();
  updaters.push(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - T[0]) / 1000); T[0] = now;
    if (!cs.ready || soundGate.muted) return;
    hookHits();
    const c = driver?.on ? driver.state : null;
    if (c) {
      const h = c.lastHit;
      if (h && h.t !== lastWall) { lastWall = h.t; if (h.kind !== 6) cs.impact({ x: h.x + (h.nx || 0) * -1.2, z: h.z + (h.nz || 0) * -1.2, speed: h.speed, wall: cs.WALL_KINDS.has(h.kind) }); }
      const env = driver.twoWheel ? driver.motoEnv : driver.env;
      if (env?.contacts > 0) { const vx = Math.sin(c.heading) * c.speed + (c.vx || 0), vz = Math.cos(c.heading) * c.speed + (c.vz || 0); cs.contact(Math.sqrt(vx * vx + vz * vz)); }
    }
    cs.frame(dt);
  });
  const go = () => cs.start().then(() => log(`city sound: on (${cs.bake?.where ?? "here"}, banks ${Math.round(cs.stats.bakeMs)} ms)`)).catch((err) => log(`city sound: ${err.message}`));
  if (!soundGate.muted) go();
  soundGate.onChange((m) => { if (!m && !cs.ready) go(); });
  return cs;
}
