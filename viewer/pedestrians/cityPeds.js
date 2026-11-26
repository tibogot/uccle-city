// PEOPLE IN THE CITY (claude/peds2, phase P2 of docs/PEDESTRIANS_RESEARCH.md; ?peds=0: none, as before). The lab's
// banded crowd (viewer/pedestrians/crowd.js: live rigs < 18 m, the bone table on the GPU beyond, LOD0 / LOD1 / LOD2 with
// dithered fades, nothing past 250 m) and its props (prams, dogs, leads) walking the city's walk graph:
//   graph     each full tile's walk graph from the tile worker (walkGraph.js), cleared of the drawn furniture on the
//             main thread in slices (cityGraph.js); benches become seats
//   sim       CitySim (citySim.js): density by place and hour round the focus, spawns / leaves out of view, signals
//             from viewer/traffic/signals.js (the drawn heads' cycle: people cross on their walk phase), zebras with a
//             glance and the traffic's gap
//   traffic   people on a crossing, and people waiting at a zebra, are obstacles the traffic cars brake for
//             (cityTraffic.addObstacleSource); the cars' snapshot (10 Hz) answers "can I go" at a zebra
//   player    the driven car: people step back from a slow car, dive aside from a fast one, are never inside it; the
//             third-person walker: people side-step it, are pushed clear, and are a collider source of its world (it
//             bumps round them)
//   trams     the platform's people board a tram standing with its doors open (tramline.js soundFeed, no allocation)
//             and others step off it
// Costs are timed each frame (cityPeds.stats: sim / crowd / props CPU ms) and shown in the dev HUD line `people`.
import * as THREE from "three/webgpu";
import { BoneTable } from "./boneTable.js";
import { Crowd, BANDS } from "./crowd.js";
import { Props } from "./props.js";
import { personUniforms } from "./personMaterial.js";
import { CityGraph } from "./cityGraph.js";
import { CitySim, R_KEEP } from "./citySim.js";
import { walkState, signalClock } from "../traffic/signals.js";

const qs = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
const MAX = Math.max(32, Math.min(800, +(qs.get("pedmax") ?? 420)));
const CN = { canGo: true, clear: true };

export const cityPeds = {
  on: qs.get("peds") !== "0",
  hour: qs.get("pedhour") != null ? +qs.get("pedhour") : null,
  hidden: false,
  graph: new CityGraph(), sim: null, crowd: null, props: null, started: false,
  pending: new Map(),                 // tiles that came in before the start
  stats: { alive: 0, inView: 0, target: 0, drawn: 0, simMs: 0, crowdMs: 0, propsMs: 0, cpuMs: 0, cpuAvg: 0, bands: [0, 0, 0], live: 0 },

  /** a full tile's walk graph (+ its main-thread colliders and drawn benches); kept until the start */
  addTile(name, packed, extra = {}) {
    if (!this.on || !packed) return;
    if (!this.started) { this.pending.set(name, { packed, extra }); return; }
    const live = () => this.graph.tiles.has(name);
    this.graph.addTile(name, packed, { ...extra, live }).catch((e) => console.warn("peds tile", name, e));
  },
  removeTile(name) {
    this.pending.delete(name);
    this.sim?.dropTile(name);
    this.graph.removeTile(name);
  },

  async start({ scene, renderer, camera, ground, focus, driver = null, getThird = () => null, getTram = () => null, getTraffic = () => null, log = console.log }) {
    if (!this.on || this.started) return;
    const t0 = performance.now();
    const table = await BoneTable.load();
    const crowd = await Crowd.create(renderer, table, { max: MAX });
    crowd.ground = ground;
    for (const m of crowd.meshes) scene.add(m);       // (names PeopleLOD*: the sun cache's movers)
    const props = new Props(scene, { max: 48 });
    for (const m of [props.prams.mesh, props.dogs.mesh, props.leashes.mesh]) m.userData.sunMover = true;
    // the world the sim sees
    const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere();
    const cars = { n: 0, x: new Float32Array(160), z: new Float32Array(160), vx: new Float32Array(160), vz: new Float32Array(160) };
    const world = {
      graph: this.graph, ground,
      signal: { walk: (ph) => walkState(ph, signalClock.now()) },
      inView: (x, y, z) => { sph.center.set(x, y, z); sph.radius = 1.0; return fr.intersectsSphere(sph) && camera.position.distanceToSquared(sph.center) < BANDS.end * BANDS.end; },
      camDist: (x, y, z) => Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z),
      carsNear: (e, node) => carsNear(cars, e, node),
      tram: null,
    };
    const sim = new CitySim(world, { max: MAX, seed: 20261126 });
    this.sim = sim; this.crowd = crowd; this.props = props; this.started = true;
    for (const [n, { packed, extra }] of this.pending) this.addTile(n, packed, extra);
    this.pending.clear();

    // the player: a neighbour the people side-step (the walker), pushed clear of
    const sepO = { x: 0, z: 0, oncoming: false };
    let wx = 0, wz = 0, wOn = false, wvx = 0, wvz = 0;
    sim.extraSep = (p) => {
      if (!wOn) return null;
      const ex = p.x - wx, ez = p.z - wz, dd = ex * ex + ez * ez;
      if (dd > 16) return null;
      sepO.x = 0; sepO.z = 0; sepO.oncoming = false;
      if (dd < 0.81 && dd > 1e-6) { const d = Math.sqrt(dd), k = (0.9 - d) / 0.9 * 2.5; sepO.x = (ex / d) * k; sepO.z = (ez / d) * k; }
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), ahead = -ex * fx - ez * fz, across = Math.abs(-ex * fz + ez * fx);
      if (ahead > 0 && ahead < 3.5 && across < 0.9) sepO.oncoming = true;
      return sepO;
    };
    // the walker's collision world: people are circles it bumps round (as the traffic's cars are boxes)
    const source = {
      enabled: true,
      capsule(q, contacts) {
        const ax = q[0], ay = q[1], az = q[2], r = q[6];
        for (const p of sim.people) {
          if (!p.alive || p.fade < 0.5) continue;
          const dx = ax - p.x, dz = az - p.z, rr = r + 0.26 * p.scale;
          if (dx * dx + dz * dz >= rr * rr || ay > p.y + 1.9 * p.scale || ay < p.y - 1.5) continue;
          const d = Math.sqrt(dx * dx + dz * dz) || 1e-6, so = contacts.slot();
          if (so < 0) return;
          const D = contacts.d;
          D[so] = dx / d; D[so + 1] = 0; D[so + 2] = dz / d; D[so + 3] = rr - d; D[so + 4] = p.x + (dx / d) * 0.26; D[so + 5] = ay; D[so + 6] = p.z + (dz / d) * 0.26; D[so + 7] = 0; D[so + 8] = 5;
        }
      },
      raycast() {},
    };
    let hooked = null, trafficHooked = null;

    // traffic: the people on a crossing, the ones waiting at a zebra (the cars stop before it)
    const pedObstacles = (s) => {
      const f = focus(); let n = 0;
      for (const p of sim.people) {
        if (!p.alive || n >= 48) continue;
        if ((p.x - f.x) ** 2 + (p.z - f.z) ** 2 > 200 * 200) continue;
        if (p.onCrossing) { s.addObstacle(p.x, p.z, 0.45, Math.sin(p.yaw) * p.speed, Math.cos(p.yaw) * p.speed); n++; }
        else if (p.kerb && p.kerb.e.kind === "zebra" && p.kerb.glanced) {
          const e = p.kerb.e, into = p.kerb.into, nd = p.kerb.node;
          s.addObstacle(nd.x + e.ux * into * 1.8, nd.z + e.uz * into * 1.8, 0.9, 0, 0); n++;
        }
      }
    };

    const boards = [];
    const feed = new Float32Array(16 * 8), feedD = new Float32Array(16);
    let last = performance.now(), carT = 0, tramT = 0, clockT = -1e9, frame = 0;
    const st = this.stats;
    const refreshCars = () => {
      const T = getTraffic(), f = focus();
      cars.n = 0;
      const S = T?.sim;
      if (S) for (let i = 0; i < S.cap && cars.n < 150; i++) {
        if (!S.alive[i]) continue;
        const dx = S.x[i] - f.x, dz = S.z[i] - f.z;
        if (dx * dx + dz * dz > 260 * 260) continue;
        const k = cars.n++; cars.x[k] = S.x[i]; cars.z[k] = S.z[i]; cars.vx[k] = Math.sin(S.yaw[i]) * S.v[i]; cars.vz[k] = Math.cos(S.yaw[i]) * S.v[i];
      }
      if (driver?.on && driver.state && cars.n < 160) {
        const c = driver.state, k = cars.n++;
        cars.x[k] = c.x; cars.z[k] = c.z; cars.vx[k] = Math.sin(c.heading) * c.speed; cars.vz[k] = Math.cos(c.heading) * c.speed;
      }
    };
    const refreshTrams = () => {
      const tl = getTram();
      boards.length = 0;
      for (const T of this.graph.tiles.values()) if (T.ready) for (const b of T.boards) if (!b.dead) boards.push(b);
      const n = tl ? tl.soundFeed(feed, feedD) : 0;
      for (const b of boards) {
        const S = (b.tram ||= { docked: false, doors: new Float32Array(8), n: 0, was: false });
        S.docked = false; S.n = 0;
        for (let i = 0; i < n; i++) {
          const o = i * 8, x0 = feed[o], z0 = feed[o + 1], x1 = feed[o + 3], z1 = feed[o + 4], doors = feed[o + 6];
          const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
          const t = (b.x - x0) * ux + (b.z - z0) * uz, lat = -(b.x - x0) * uz + (b.z - z0) * ux;
          if (t < -6 || t > L + 6 || Math.abs(lat) > 4.5 || doors < 0.5) continue;
          // four doors along the body, on the platform's side, 0.6 m out from the side of the car body (1.2 m)
          const side = Math.sign(lat) || 1, off = side * Math.max(1.2, Math.abs(lat) - 0.9);
          for (let k = 0; k < 4; k++) { const f = 0.12 + k * 0.25; S.doors[k * 2] = x0 + ux * L * f - uz * off; S.doors[k * 2 + 1] = z0 + uz * L * f + ux * off; }
          S.n = 4; S.docked = true; break;
        }
        // a tram has just opened its doors here: a few people step off
        if (S.docked && !S.was) { const k = Math.floor(sim.r() * 5 * Math.max(0.2, Math.min(1, sim.weighted / 40))); for (let q = 0; q < k; q++) { const d = Math.floor(sim.r() * 4); sim.alightAt(S.doors[d * 2], S.doors[d * 2 + 1], b); } }
        S.was = S.docked;
      }
    };

    // an A/B switch for cost checks (cityPeds.hidden = true: no update, nothing drawn; the dev panel / the bench)
    const hideAll = () => { for (const m of crowd.meshes) m.visible = false; for (const m of [props.prams.mesh, props.dogs.mesh, props.leashes.mesh]) m.visible = false; };
    this.update = (camPos, cam) => {
      if (this.hidden) { hideAll(); last = performance.now(); return; }
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now; frame++;
      const c = cam || camera;
      c.updateMatrixWorld();
      fr.setFromProjectionMatrix(pm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse));
      const f = focus(); sim.focus.x = f.x; sim.focus.z = f.z;
      // the city clock (tram 92's), the weekday, the season and the rain, once a second
      if (now - clockT > 1000) {
        clockT = now;
        const tl = getTram(), d = new Date();
        sim.hour = this.hour ?? (tl ? tl.clockSecs / 3600 : d.getHours() + d.getMinutes() / 60);   // (?pedhour= / cityPeds.hour: a fixed hour for checks)
        sim.weekend = d.getDay() === 0 || d.getDay() === 6;
        const m = d.getMonth(), season = [0.95, 0.9, 0.7, 0.5, 0.3, 0.1, 0.0, 0.05, 0.25, 0.5, 0.75, 0.9][m];
        const rain = Math.min(1, personUniforms.rain.value);
        sim.setWeather({ season, rain }); personUniforms.season.value = season;
      }
      const th = getThird();
      wOn = !!(th?.on && th.tp);
      if (wOn) { const P = th.tp.ctl.pos; wx = P[0]; wz = P[2]; }
      if (th?.world && hooked !== th.world) { th.world.add(source); hooked = th.world; }
      const T = getTraffic();
      if (T && trafficHooked !== T && T.addObstacleSource) { T.addObstacleSource(pedObstacles); trafficHooked = T; }
      if (now - carT > 100) { carT = now; refreshCars(); }
      if (now - tramT > 200) { tramT = now; refreshTrams(); }
      const t0 = performance.now();
      sim.step(dt);
      if (driver?.on && driver.state) playerCar(sim, driver);
      if (wOn) pushClear(sim, wx, wz);
      const t1 = performance.now();
      const cs = crowd.update(sim.people, c, Math.max(dt, 1e-4));
      const t2 = performance.now();
      props.update(sim.people, Math.max(dt, 1e-4), ground, sim.t);
      const t3 = performance.now();
      st.simMs = t1 - t0; st.crowdMs = t2 - t1; st.propsMs = t3 - t2; st.cpuMs = t3 - t0;
      st.cpuAvg += (st.cpuMs - st.cpuAvg) * 0.05;
      if (frame % 15 === 0) {
        let alive = 0, inView = 0;
        for (const p of sim.people) if (p.alive) { alive++; if (p.inView && p.dist <= BANDS.end) inView++; }
        st.alive = alive; st.inView = inView; st.target = sim.target; st.drawn = cs.drawn; st.bands[0] = cs.perBand[0]; st.bands[1] = cs.perBand[1]; st.bands[2] = cs.perBand[2]; st.live = cs.live;
      }
    };
    window.__peds = this;
    log(`people: on (?peds=0 off), pool ${MAX}, crowd LOD tris ${crowd.tris.join(" / ")}, ${Math.round(performance.now() - t0)} ms`);
  },
  update() {},
};

/** zebra / red-light questions about the cars near crossing e (from its kerb node): canGo = every car coming at it can
 *  still stop short of it (or is stopped); clear = no car coming within 45 m */
function carsNear(C, e, node) {
  const mx = (e.a.x + e.b.x) * 0.5, mz = (e.a.z + e.b.z) * 0.5, half = e.len * 0.5 + 2;
  CN.canGo = true; CN.clear = true;
  for (let i = 0; i < C.n; i++) {
    const dx = mx - C.x[i], dz = mz - C.z[i], d2 = dx * dx + dz * dz;
    if (d2 > 60 * 60) continue;
    const v = Math.hypot(C.vx[i], C.vz[i]);
    // on the crossing now
    const along = (C.x[i] - e.a.x) * e.ux + (C.z[i] - e.a.z) * e.uz, lat = Math.abs(-(C.x[i] - e.a.x) * e.uz + (C.z[i] - e.a.z) * e.ux);
    if (along > -1.5 && along < e.len + 1.5 && lat < 3.2) { CN.canGo = false; CN.clear = false; continue; }
    if (v < 0.4) continue;
    // coming at it: its path passes the crossing within `half` of its middle, ahead of it
    const ux = C.vx[i] / v, uz = C.vz[i] / v, ahead = dx * ux + dz * uz, miss = Math.abs(-dx * uz + dz * ux);
    if (ahead <= 0 || miss > half) continue;
    if (ahead < 45) CN.clear = false;
    if (ahead < (v * v) / (2 * 3.0) + 6 + v * 0.8) CN.canGo = false;
  }
  return CN;
}

/** the driven car (driver.state x, z, heading, speed): people in its path step back (slow) or dive (fast, > 20 km/h);
 *  nobody stays inside its box */
function playerCar(sim, driver) {
  const c = driver.state, B = driver.body, hx = (B?.hx ?? 0.95), hz = (B?.hz ?? 2.3);
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading), rx = fz, rz = -fx, v = c.speed, av = Math.abs(v);
  for (const p of sim.people) {
    if (!p.alive) continue;
    const dx = p.x - c.x, dz = p.z - c.z;
    if (dx * dx + dz * dz > 16 * 16) continue;
    const along = dx * fx + dz * fz, lat = dx * rx + dz * rz, sg = v >= 0 ? 1 : -1;
    // in the box (+ 0.3 m): out sideways (or along, whichever is shorter)
    const pl = hx + 0.3 - Math.abs(lat), pa = hz + 0.3 - Math.abs(along);
    if (pl > 0 && pa > 0) {
      if (pl < pa) { const s = Math.sign(lat) || 1; p.x += rx * s * pl; p.z += rz * s * pl; }
      else { const s = Math.sign(along) || 1; p.x += fx * s * pa; p.z += fz * s * pa; }
      p.v = 0;
    }
    // in its path within 1.6 s
    const ahead = along * sg;
    if (av > 0.4 && Math.abs(lat) < hx + 0.9 && ahead > -hz && ahead < hz + Math.max(2.5, av * 1.6)) {
      const s = Math.sign(lat) || (p.id & 1 ? 1 : -1);
      if (av > 5.5) { if (!p.dive) { sim.startDive(p, rx * s, rz * s); sim.counters.carDives++; } }
      else sim.stepBack(p, rx * s + fx * sg * 0.3, rz * s + fz * sg * 0.3);
    }
  }
}
/** the walker at (x, z): people within 0.75 m are moved clear (no one walks through the player) */
function pushClear(sim, x, z) {
  for (const p of sim.people) {
    if (!p.alive) continue;
    const dx = p.x - x, dz = p.z - z, d2 = dx * dx + dz * dz;
    if (d2 >= 0.75 * 0.75 || d2 < 1e-8) continue;
    const d = Math.sqrt(d2), k = (0.75 - d) / d; p.x += dx * k; p.z += dz * k;
  }
}
export { R_KEEP };
