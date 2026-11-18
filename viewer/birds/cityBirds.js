// THE CITY'S BIRDS (?birds=0 = none; docs/BIRDS.md). Two systems:
//   SKY      viewer/birds/skyFlocks.js: every flying flock in one GPU compute simulation, two indirect draws. This file is
//            its DIRECTOR: which flocks fly where and when (species by place and time of day), where their targets go,
//            what threatens them, the floor texture they keep above.
//   PERCHED  the falcon flight's pigeons (viewer/falconFlight/pigeons.js, run by cityFlyer.js round the squares in every
//            mode): this file hands them the ground threats (the walker, the third-person character, the player's car,
//            the traffic near the square), so they flush when you walk in and land again elsewhere.
//
// Species by place and time (what one sees in Uccle; Natagora / Brussels Environment bird pages, field guides):
//   starlings  a MURMURATION over a roost (Parc de Wolvendael, the Kauwberg, Fond'Roy, La Sauvagère, Brugmann, the rail
//              line at Calevoet: the nearest within 3 km) from just before sunset to ~40 min after (sun +6 deg .. -8 deg),
//              thousands from October to March, a few hundred in summer (the young of the year), then the drop into the
//              roost; by day a feeding party of 100-200 crossing between lawns.
//   jackdaws   groups of 30-60 wheeling round the church towers (Saint-Job, Saint-Pierre, the Observatory, ...) by day,
//              off to roost at dusk.
//   gulls      a few high up (black-headed gulls in winter, lesser black-backed in summer), loose, gliding.
//   parakeets  ring-necked parakeets (8,000-10,000 in Brussels, Brussels Times 2023 from Natagora counts): a small, fast,
//              green flock round the nearest park by day, to its roost at dusk.
//   pigeons    the feral pigeons of the squares (pigeons.js: perched, feeding, circling, flushing).
//   night      none (the perched pigeons sit on their ridges).
import * as THREE from "three/webgpu";
import { SkyFlocks, SLOTS, FLOOR } from "./skyFlocks.js";
// birds2 (?birds2=old = before): every flock flies after a LEADER on a path (no point to hover round: the old flocks
// collapsed into balls), the murmuration does manoeuvres (flockModel.js says why and what)
import { LeaderPath, MurmurShape, DAY_PROFILES } from "./flockModel.js";
import { env } from "../lighting.js";

const params = new URLSearchParams(location.search);
const DEG = Math.PI / 180;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const slotIdx = Object.fromEntries(SLOTS.map((s, k) => [s.key, k]));

// real places (city metres, x east / z south: data/map/map.json areas, viewer/places.js, the landmarks' placements)
const ROOSTS = [
  { name: "Parc de Wolvendael", x: -402, z: -91 }, { name: "Kauwberg", x: 417, z: 1285 }, { name: "Parc Fond'Roy", x: 1107, z: 1240 },
  { name: "Parc de la Sauvagère", x: -45, z: 1186 }, { name: "Parc Brugmann", x: 92, z: -1156 }, { name: "rail line at Calevoet", x: -1160, z: 700 },
];
const TOWERS = [
  { name: "Saint-Job church", x: 1216, z: 561 }, { name: "Saint-Pierre", x: -709, z: -492 }, { name: "Observatory", x: 654, z: 80 },
  { name: "town hall", x: -1148, z: -506 }, { name: "Notre-Dame du Rosaire", x: 1279, z: -1254 }, { name: "Saint-Augustin", x: -896, z: -1961 },
  { name: "Russian church", x: -354, z: -468 }, { name: "Stalle chapel", x: -1150, z: 56 },
];
// the feral pigeons' squares (viewer/falconFlight/cityFlyer.js SQUARES + the Place de Saint-Job): by day a party flies
// loops over the square and the roofs round it (birds2)
const SQUARES = [
  { name: "Place de Saint-Job", x: 1153, z: 540 }, { name: "Place Jean Vander Elst", x: -1125, z: -505 }, { name: "Parvis Saint-Pierre", x: -701, z: -498 },
  { name: "Square des Héros", x: -533, z: -487 }, { name: "Vanderkindere", x: -123, z: -1632 },
];
const PARKS = [
  { name: "Parc de Wolvendael", x: -402, z: -91, r: 160 }, { name: "Parc Brugmann", x: 92, z: -1156, r: 110 }, { name: "Parc Montjoie", x: 697, z: -1253, r: 80 },
  { name: "Parc Fond'Roy", x: 1107, z: 1240, r: 110 }, { name: "Parc de la Sauvagère", x: -45, z: 1186, r: 100 }, { name: "Kauwberg", x: 417, z: 1285, r: 250 },
  { name: "Square des Héros", x: -533, z: -487, r: 40 }, { name: "Parc Raspail", x: -1080, z: -117, r: 40 },
];

export const cityBirds = {
  on: params.get("birds") !== "0",
  old: params.get("birds2") === "old",    // ?birds2=old: the flocks before birds2 (point targets: the "ball")
  sky: null,
  frame: 0,
  stats: { flocks: "", near: 0, far: 0, cpuMs: 0, floorBuilds: 0 },
  force: { murmuration: false },          // the dev panel's "murmuration now"
  hooks: null,                            // main.js: { walker, driver, getThird, flyer, getTraffic }

  /** before the first tile (the boot warm-up compiles the two draws; the compute is dispatched once here) */
  start({ scene, renderer, updaters, world, lighting, log = () => {} }) {
    if (!this.on) return;
    if (!renderer.backend?.isWebGPUBackend) { this.on = false; log("birds: need WebGPU (compute)"); return; }
    const sky = this.sky = new SkyFlocks(renderer, { lightList: lighting ? [lighting.sun, lighting.hemi].filter(Boolean) : null, old: this.old });
    scene.add(sky.group);
    Object.assign(this, { world, lighting, log, renderer });
    this.flocks = SLOTS.map((s, k) => ({ k, key: s.key, state: "off", t: 0, home: null, wp: null, wpT: 0, fade: 1 }));
    this.floor = { job: null, cx: 1e9, cz: 1e9, sig: "", scratch: new Float32Array(FLOOR.n * FLOOR.n) };
    this.hawk = { t: rand(15, 30), on: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0 };
    // compile the compute pipelines now (no flock on: every thread returns at once)
    try { renderer.compute(sky.nodes); } catch (e) { log(`birds: compute ${e.message}`); }
    let last = performance.now();
    updaters.push((pos, cam) => {
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (!cam || !world.tiles.length) return;
      const t0 = performance.now();
      this.direct(cam, dt);
      this.buildFloor(cam);
      sky.update(cam, dt, this.frame++);
      this.stats.cpuMs = this.stats.cpuMs * 0.95 + (performance.now() - t0) * 0.05;
    });
    window.__birds = this;
    log(`birds: sky flocks on (${SLOTS.length} slots, ${SLOTS.reduce((a, s) => a + s.cap, 0)} birds max, GPU compute; ?birds=0 = none)`);
  },

  // ------------------------------------------------------------------------------------------------ the floor texture
  /** the city's highest solid (ground, roofs, the landmarks' envelopes in the roof grid) on 8 m cells round the camera:
   *  rebuilt when the camera is 250 m off the window's centre or the loaded tiles change, in slices of ~0.5 ms */
  buildFloor(cam) {
    const F = this.floor, W = this.world, n = FLOOR.n, cell = FLOOR.cell;
    if (!F.job) {
      const sig = W.tiles.map((t) => t.name).join(",");
      if (Math.hypot(cam.position.x - F.cx, cam.position.z - F.cz) < 250 && sig === F.sig) return;
      const cx = Math.round(cam.position.x / 64) * 64, cz = Math.round(cam.position.z / 64) * 64;
      F.job = { cx, cz, x0: cx - (n * cell) / 2, z0: cz - (n * cell) / 2, j: 0, sig };
    }
    const J = F.job, t0 = performance.now();
    while (J.j < n && performance.now() - t0 < 0.5) {
      const z = J.z0 + J.j * cell, row = J.j * n;
      for (let i = 0; i < n; i++) {
        const x = J.x0 + i * cell;
        F.scratch[row + i] = Math.max(W.heightAt(x + 2, z + 2), W.heightAt(x + 6, z + 2), W.heightAt(x + 2, z + 6), W.heightAt(x + 6, z + 6));
      }
      J.j++;
    }
    if (J.j < n) return;
    const sky = this.sky;
    sky.floorData.set(F.scratch);
    sky.floorTex.needsUpdate = true;
    sky.u.floorO.value.set(J.x0, J.z0);
    sky.u.floorBase.value = W.ground(cam.position.x, cam.position.z) + 30;
    F.cx = J.cx; F.cz = J.cz; F.sig = J.sig; F.job = null;
    this.stats.floorBuilds++;
  },

  // ------------------------------------------------------------------------------------------------ the director
  sun() {
    // the real sun (lighting.firmSunDir: the solar hour, the day, Brussels): env.uSunDir is the LIGHT's direction, held
    // above the horizon after sunset
    const L = this.lighting, y = L?.firmSunDir ? L.firmSunDir().y : env.uSunDir.value.y, e = Math.asin(clamp(y, -1, 1)) / DEG;
    const hour = this.lighting?.hour ?? 12, day = this.lighting?.day ?? 200;
    return { e, evening: hour >= 12, day, winter: day >= 275 || day <= 80 };
  },
  nearest(list, x, z, maxD = Infinity) {
    let best = null, bd = maxD;
    for (const p of list) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    return best;
  },
  ground(x, z) { return this.world.ground(x, z); },
  top(x, z) { let h = 0; for (let k = 0; k < 9; k++) h = Math.max(h, this.world.heightAt(x + ((k % 3) - 1) * 6, z + (((k / 3) | 0) - 1) * 6)); return h; },

  /** what each slot wants now: { home, ... } or null (off) */
  wants(cam, S) {
    const x = cam.position.x, z = cam.position.z, W = {};
    const day = S.e > 1, dusk = S.evening && S.e < 6.5 && S.e > -8.5;
    const mur = this.force.murmuration || dusk;
    W.murmuration = mur ? this.nearest(ROOSTS, x, z, 3000) : null;
    W.starlings = day && !dusk ? this.nearest(PARKS, x, z, 1500) : null;
    // the two nearest towers within 1.2 km (by day and the start of dusk)
    const tw = TOWERS.map((t) => ({ t, d: Math.hypot(t.x - x, t.z - z) })).filter((q) => q.d < 1200).sort((a, b) => a.d - b.d);
    const jd = S.e > -3;
    W.jackdaws = jd && tw[0] ? tw[0].t : null;
    W.jackdaws2 = jd && tw[1] ? tw[1].t : null;
    W.gulls = S.e > 3 ? { name: "over the city", x, z, drift: true } : null;
    W.parakeets = S.e > -3 ? this.nearest(PARKS.filter((p) => p.r >= 80), x, z, 1500) : null;
    // birds2: a party of feral pigeons flying loops over the nearest square by day
    W.pigeons = !this.old && S.e > 2 ? this.nearest(SQUARES, x, z, 900) : null;
    return W;
  },

  direct(cam, dt) {
    const sky = this.sky;
    this.camFrustum ??= new THREE.Frustum();
    this._m ??= new THREE.Matrix4();
    this._m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); this.camFrustum.setFromProjectionMatrix(this._m);
    // the decisions (which flock where) 4 times a second: they allocate a little; the targets move every frame
    this._dT = (this._dT ?? 0) - dt;
    const decide = this._dT <= 0;
    if (decide) { this._dT = 0.25; this._S = this.sun(); this._W = this.wants(cam, this._S); }
    const S = this._S, W = this._W;
    const names = decide ? [] : null;
    for (const F of this.flocks) {
      const want = W[F.key];
      F.t += dt;
      if (F.state === "off") {
        if (want && decide) this.spawn(F, want, cam, S);
      } else if (F.state === "on") {
        const moved = want && F.home && !F.home.drift && (want.name !== F.home.name);
        if (decide && (!want || moved || F.end)) this.leave(F, cam);
        else this.steer(F, cam, S, dt);
      } else if (F.state === "leaving") {
        // fly off; gone once far and out of view, or faded after 40 s
        const tg = sky.row(F.k, 0), d = Math.hypot(tg.x - cam.position.x, tg.z - cam.position.z);
        if (F.drop || F.lead) this.steer(F, cam, S, dt);
        else this.moveTarget(F, F.away, 20, dt);
        const late = F.t > (F.drop ? 30 : 40);
        if (late) { F.fade = Math.max(0, F.fade - dt / 4); sky.setFade(F.k, F.fade); }
        if ((d > 1100 && !this.camFrustum.containsPoint(this._v.set(tg.x, tg.y, tg.z))) || F.fade <= 0) { sky.setSlot(F.k, { on: false }); F.state = "off"; F.t = 0; F.end = false; F.drop = false; }
      }
      if (names && F.state !== "off") names.push(`${F.key}${F.state === "leaving" ? " (leaving)" : ""} @ ${F.home?.name ?? "?"}`);
    }
    if (names) this.stats.flocks = names.join(", ") || "none";
    this.threats(cam, dt);
  },
  _v: new THREE.Vector3(),

  /** switch a slot on: its birds appear 350-450 m from home, out of view if possible, and fly in */
  spawn(F, home, cam, S) {
    const sky = this.sky, cp = cam.position;
    const base = F.key === "gulls" ? { x: cp.x + 200, z: cp.z - 150 } : home;
    let best = null, bs = -Infinity;
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 + 0.3, R = 380 + (a % 3) * 40;
      const x = base.x + Math.cos(ang) * R, z = base.z + Math.sin(ang) * R, y = this.ground(x, z) + 60;
      const seen = this.camFrustum.containsPoint(this._v.set(x, y, z));
      const sc = (seen ? 0 : 1e4) + Math.hypot(x - cp.x, z - cp.z);
      if (sc > bs) { bs = sc; best = { x, y, z }; }
    }
    const P = this.profile(F.key, S);
    F.home = { ...home }; F.state = "on"; F.t = 0; F.fade = 1; F.wp = null; F.drop = false; F.end = false;
    F.lead = null; F.hx = F.hz = undefined;
    if (!this.old) {
      // birds2: the leader starts at the spawn point, heading for home, and flies its path from there; the target is it
      F.lead = this.leader(F, P, best, cam);
      F.split = { x: 0, y: 0, z: 0, gx: 0, gz: 0, on: 0, t: rand(15, 35) };
      F.shape = F.key === "murmuration" ? new MurmurShape() : null;
      sky.setSlot(F.k, { on: true, spawn: best, target: { x: F.lead.x, y: F.lead.y, z: F.lead.z }, ...P });
      F.spawned = best;
      return;
    }
    const tgt = this.homeTarget(F, cam, 0);
    sky.setSlot(F.k, { on: true, spawn: best, target: tgt, ...P });
    F.spawned = best;
  },
  leave(F, cam) {
    const S = this.sun();
    F.state = "leaving"; F.t = 0;
    // a murmuration at the end of dusk, a jackdaw / parakeet flock in the evening: down into the roost trees
    F.drop = (F.key === "murmuration" && !this.force.murmuration && S.evening && S.e < -6) || ((F.key === "parakeets" || F.key.startsWith("jackdaws")) && S.evening && S.e < 0);
    const cp = cam.position, h = F.home || { x: cp.x, z: cp.z };
    const ax = h.x - cp.x, az = h.z - cp.z, L = Math.hypot(ax, az) || 1;
    F.away = { x: h.x + (ax / L) * 1600, y: this.ground(h.x, h.z) + 120, z: h.z + (az / L) * 1600 };
    if (F.lead && !F.drop) { F.lead.goal = F.away; F.lead.turnMax = Math.max(F.lead.turnMax, 0.3); }
    if (F.lead && F.drop && F.key !== "murmuration") {
      // birds2: down into the roost trees: the leader circles low over home (the flock follows it down, no point to pile on)
      F.lead.goal = null; F.lead.home = { x: F.home.x, z: F.home.z }; F.lead.R = 40; F.lead.yLo = F.lead.yHi = 6; F.lead.yTt = 0;
      this.sky.row(F.k, 1).x = 3;
      return;
    }
    if (F.drop) { const tg = this.sky.row(F.k, 0); this.sky.setTarget(F.k, F.home.x, this.ground(F.home.x, F.home.z) + 9, F.home.z, 15); this.sky.row(F.k, 1).x = 3; void tg; }
  },
  /** per-species flight: speeds (m/s), flock rules, clearance over the city's floor */
  profile(key, S) {
    if (!this.old) {
      // birds2: small parties (flockModel.js DAY_PROFILES), the murmuration as before
      const dk = key.startsWith("jackdaws") ? "jackdaws" : key, D = DAY_PROFILES[dk];
      if (D) {
        const n = dk === "gulls" ? (S.winter ? rand(20, 34) : rand(6, 14)) : rand(D.n[0], D.n[1]);
        return { count: Math.round(n), radius: D.radius, floorClear: D.floorClear, vmin: D.vmin, vmax: D.vmax, spacing: D.spacing, informed: D.informed, cohesion: 1, align: 1, sep: 1, circle: 0 };
      }
    }
    switch (key) {
      case "murmuration": return { count: S.winter ? 3072 : 900, radius: 0, floorClear: 18, vmin: 11, vmax: 19, rest: 2.6, cohesion: 1, align: 1.1, sep: 1, circle: 0 };
      case "starlings": return { count: Math.round(rand(110, 190)), radius: 12, floorClear: 9, vmin: 9, vmax: 17, cohesion: 1, align: 1, sep: 1, circle: 0 };
      case "jackdaws": case "jackdaws2": return { count: Math.round(rand(28, 60)), radius: 26, floorClear: 9, vmin: 8, vmax: 14, cohesion: 0.6, align: 0.6, sep: 1, circle: key === "jackdaws" ? 3.2 : -3.2 };
      case "gulls": return { count: Math.round(S.winter ? rand(20, 34) : rand(6, 14)), radius: 140, floorClear: 40, vmin: 7, vmax: 12, cohesion: 0.15, align: 0.3, sep: 1, circle: 1.6 };
      case "parakeets": return { count: Math.round(rand(24, 52)), radius: 10, floorClear: 10, vmin: 13, vmax: 19, cohesion: 1.1, align: 1.1, sep: 1, circle: 0 };
    }
    return {};
  },
  /** birds2: the flock's virtual leader (flockModel.js LeaderPath) from its spawn point, its area / altitude by species */
  leader(F, P, at, cam) {
    const h = F.home, dk = F.key.startsWith("jackdaws") ? "jackdaws" : F.key;
    const heading = Math.atan2(h.x - at.x, h.z - at.z);
    if (F.key === "murmuration") {
      return new LeaderPath({ x: at.x, y: at.y, z: at.z, heading, speed: 14, home: { x: h.x, z: h.z }, R: 140, yLo: 45, yHi: 110, turnMax: 0.4, turnSigma: 0.3 });
    }
    const D = DAY_PROFILES[dk], L = D.leader;
    // jackdaws over their tower's top, the rest over the ground
    const lift = dk === "jackdaws" ? Math.max(0, this.top(h.x, h.z) - this.ground(h.x, h.z)) : 0;
    const lp = new LeaderPath({ x: at.x, y: at.y, z: at.z, heading, speed: (D.vmin + D.vmax) / 2, home: { x: h.x, z: h.z }, R: L.R, yLo: L.yLo + lift, yHi: L.yHi + lift, turnMax: L.turnMax, turnSigma: L.turnSigma });
    if (dk === "starlings") lp.goal = this.nextLawn(F, cam);
    if (dk === "gulls") lp.home = { x: cam.position.x, z: cam.position.z };
    return lp;
  },
  /** birds2: the starlings' next lawn / park near the camera (they cross between them) */
  nextLawn(F, cam) {
    const P = this.nearest(PARKS.filter((p) => p !== F.last), cam.position.x + rand(-500, 500), cam.position.z + rand(-500, 500), 1e9) || F.home;
    F.last = P;
    const a = rand(0, Math.PI * 2), r = rand(0, P.r ?? 60);
    return { x: P.x + Math.cos(a) * r, z: P.z + Math.sin(a) * r };
  },
  /** birds2: the leader flies on, the slot's rows follow it (target, its velocity, the split offset, the murmuration's shape) */
  steerLeader(F, cam, S, dt) {
    const sky = this.sky, L = F.lead;
    if (F.key === "gulls" && !L.goal) { L.home.x = cam.position.x; L.home.z = cam.position.z; }
    if (F.key === "starlings" && F.state === "on" && L.goal && Math.hypot(L.goal.x - L.x, L.goal.z - L.z) < 60) L.goal = this.nextLawn(F, cam);
    L.step(dt, (x, z) => this.ground(x, z));
    sky.setTarget(F.k, L.x, L.y, L.z);
    if (F.key === "murmuration") {
      // the heading follows the leader's track (eased: the sheet swings round), the manoeuvres; a hawk pass = big waves
      const k = 1 - Math.exp(-0.8 * dt), sp = Math.hypot(L.vx, L.vz) || 1;
      F.hx ??= L.vx / sp; F.hz ??= L.vz / sp;
      F.hx += (L.vx / sp - F.hx) * k; F.hz += (L.vz / sp - F.hz) * k;
      const o = F.shape.step(dt, this.hawk.on ? 1 : 0);
      sky.setShape(F.k, F.hx, 0, F.hz, o.bend, o.sx, o.sy, o.sz, o.ripple);
      sky.setManoeuvre(F.k, o);
      if (!this.force.murmuration && S.evening && S.e < -6.2) F.end = true;      // the drop into the roost
      return;
    }
    // splits now and then: half the informed birds follow a leader 25-45 m to one side for 6-12 s, then rejoin
    const Sp = F.split;
    Sp.t -= dt;
    if (Sp.t < 0) {
      if (Sp.on) { Sp.on = 0; Sp.t = rand(20, 45); }
      else { Sp.on = 1; Sp.t = rand(6, 12); const a = Math.random() < 0.5 ? -1 : 1, m = rand(25, 45); Sp.gx = Math.cos(L.h) * m * a; Sp.gz = -Math.sin(L.h) * m * a; }
    }
    const e = Math.min(1, dt / 2);
    Sp.x += ((Sp.on ? Sp.gx : 0) - Sp.x) * e; Sp.z += ((Sp.on ? Sp.gz : 0) - Sp.z) * e;
    sky.setLeader(F.k, L.vx, L.vy, L.vz, Sp.x, 0, Sp.z);
  },

  /** the target a flock heads for now (t: its age, s) */
  homeTarget(F, cam, t) {
    const h = F.home;
    switch (F.key) {
      case "murmuration": {
        // a wandering point over the roost (waypoints within 160 m, 45-110 m up): the sheet follows, turns, folds
        const wp = F.wp ?? (F.wp = { x: h.x, y: this.ground(h.x, h.z) + 70, z: h.z });
        return { x: wp.x, y: wp.y, z: wp.z };
      }
      case "jackdaws": case "jackdaws2": return { x: h.x, y: this.top(h.x, h.z) + 14, z: h.z };
      case "gulls": { const g = (this._gull ??= {}); g.x = cam.position.x + Math.cos(t * 0.01) * 260; g.y = this.ground(cam.position.x, cam.position.z) + 120; g.z = cam.position.z + Math.sin(t * 0.01) * 260; return g; }
      default: { const wp = F.wp ?? (F.wp = { x: h.x, y: this.ground(h.x, h.z) + 28, z: h.z }); return { x: wp.x, y: wp.y, z: wp.z }; }
    }
  },
  /** the target moves toward p at `speed` m/s (no jumps: the flock turns after it) */
  moveTarget(F, p, speed, dt) {
    const r = this.sky.row(F.k, 0);
    const dx = p.x - r.x, dy = p.y - r.y, dz = p.z - r.z, d = Math.hypot(dx, dy, dz);
    const s = Math.min(1, (speed * dt) / Math.max(d, 1e-3));
    r.x += dx * s; r.y += dy * s; r.z += dz * s;
    return d;
  },
  steer(F, cam, S, dt) {
    const sky = this.sky, h = F.home;
    if (F.lead && !(F.drop && F.key === "murmuration")) { this.steerLeader(F, cam, S, dt); return; }
    if (F.drop) return;          // (the drop's target is set once, the flock pours down to it)
    switch (F.key) {
      case "murmuration": {
        // new waypoint every 5-11 s (or reached): the flock swings round after it at 22 m/s
        F.wpT -= dt;
        if (!F.wp2 || F.wpT < 0) {
          const a = rand(0, Math.PI * 2), r = rand(20, 160);
          F.wp2 = { x: h.x + Math.cos(a) * r, y: this.ground(h.x, h.z) + rand(45, 110), z: h.z + Math.sin(a) * r }; F.wpT = rand(5, 11);
        }
        const r = sky.row(F.k, 0), px = r.x, pz = r.z;
        if (this.moveTarget(F, F.wp2, 14, dt) < 5) F.wpT = 0;
        // the shape: the heading follows the leader's track (eased: the flock swings round), the sheet stretches,
        // thins, bends and ripples (slow sums of sines, a phase set per flock)
        const mx = r.x - px, mz = r.z - pz, ml = Math.hypot(mx, mz);
        F.hx ??= 1; F.hz ??= 0; F.ph ??= rand(0, 100);
        if (ml > 1e-4) { const k = 1 - Math.exp(-0.8 * dt); F.hx += (mx / ml - F.hx) * k; F.hz += (mz / ml - F.hz) * k; }
        const T = F.t + F.ph;
        const sx = 1 + 0.45 * Math.sin(T * 0.13) + 0.2 * Math.sin(T * 0.31);
        const sz = 1 + 0.5 * Math.sin(T * 0.09 + 1.7) + 0.25 * Math.sin(T * 0.27);
        const sy = 1.2 + 0.9 * Math.max(0, Math.sin(T * 0.07 + 0.4));
        const bend = 0.35 * Math.sin(T * 0.11 + 2.1);
        sky.setShape(F.k, F.hx, 0, F.hz, bend, sx, sy, sz, T * 0.9);
        if (!this.force.murmuration && S.evening && S.e < -6.2) F.end = true;      // the drop into the roost
        break;
      }
      case "starlings": case "parakeets": {
        F.wpT -= dt;
        if (!F.wp2 || F.wpT < 0) {
          // the next lawn / tree group: a point of this park (parakeets) or of a park / lawn near the camera (starlings)
          const P = F.key === "starlings" ? (this.nearest(PARKS.filter((p) => p !== F.last), cam.position.x + rand(-500, 500), cam.position.z + rand(-500, 500), 1e9) || h) : h;
          F.last = P;
          const a = rand(0, Math.PI * 2), r = rand(0, P.r ?? 60);
          const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
          F.wp2 = { x, y: this.ground(x, z) + (F.key === "parakeets" ? rand(18, 30) : rand(22, 38)), z }; F.wpT = rand(25, 60);
        }
        this.moveTarget(F, F.wp2, F.key === "parakeets" ? 16 : 13, dt);
        break;
      }
      case "jackdaws": case "jackdaws2": {
        // round the tower; now and then a sally 60-120 m out and back
        F.wpT -= dt;
        if (!F.wp2 || F.wpT < 0) {
          const out = Math.random() < 0.35, a = rand(0, Math.PI * 2), r = out ? rand(60, 120) : 0;
          F.wp2 = { x: h.x + Math.cos(a) * r, y: this.top(h.x, h.z) + rand(8, 22), z: h.z + Math.sin(a) * r }; F.wpT = out ? rand(12, 20) : rand(20, 45);
        }
        this.moveTarget(F, F.wp2, 10, dt);
        break;
      }
      case "gulls": {
        const g = this.homeTarget(F, cam, F.t);
        this.moveTarget(F, g, 8, dt);
        break;
      }
    }
  },

  // ------------------------------------------------------------------------------------------------ threats
  threats(cam, dt) {
    const sky = this.sky, cp = cam.position, H = this.hooks;
    // 0: the camera itself (an orbit / fly camera passing through a flock)
    sky.setThreat(0, cp.x, cp.y, cp.z, 16);
    // 1: the falcon (falcon flight): a stoop scatters a flock from far
    const fl = H?.flyer, f = fl?.on && fl.game?.f;
    if (f && f.pos) sky.setThreat(1, f.pos.x, f.pos.y, f.pos.z, f.fold > 0.6 ? 90 : 50);
    else sky.setThreat(1, 0, -1e5, 0, 0);
    // 2: the Saint-Job peregrines on the wing
    const fam = window.__falcons;
    let set = false;
    if (fam?.enabled) for (const b of [fam.female, fam.male]) {
      if (!b || b.state === "perch" || !b.root) continue;
      b.root.getWorldPosition(this._v);
      sky.setThreat(2, this._v.x, this._v.y, this._v.z, 45); set = true; break;
    }
    if (!set) sky.setThreat(2, 0, -1e5, 0, 0);
    // 3: a phantom sparrowhawk through the murmuration every 20-45 s (the agitation waves of real murmurations)
    const M = this.flocks[slotIdx.murmuration], hk = this.hawk;
    if (M.state === "on") {
      hk.t -= dt;
      if (hk.t < 0 && !hk.on) {
        const tg = sky.row(M.k, 0), a = rand(0, Math.PI * 2);
        hk.on = 3.5; hk.x = tg.x - Math.cos(a) * 60; hk.z = tg.z - Math.sin(a) * 60; hk.y = tg.y + rand(-10, 10); hk.vx = Math.cos(a) * 30; hk.vz = Math.sin(a) * 30;
      }
      if (hk.on) {
        hk.on -= dt; hk.x += hk.vx * dt; hk.z += hk.vz * dt;
        sky.setThreat(3, hk.x, hk.y, hk.z, 24);
        if (hk.on <= 0) { hk.on = 0; hk.t = rand(20, 45); }
      } else sky.setThreat(3, 0, -1e5, 0, 0);
    } else sky.setThreat(3, 0, -1e5, 0, 0);
  },

  // ------------------------------------------------------------------------------------------------ perched pigeons
  /** the ground threats for the perched pigeons (cityFlyer.js ambient): [{ x, y, z, r }] in a shared array */
  groundThreats() {
    const H = this.hooks, out = (this._gt ??= []);
    out.length = 0;
    if (!H) return out;
    const push = (x, y, z, r) => { const o = (this._gp ??= []); const q = o[out.length] ??= {}; q.x = x; q.y = y; q.z = z; q.r = r; out.push(q); };
    // walking: urban feral pigeons flush at ~2-4 m from a person who walks at them (flight initiation distance: Møller
    // et al. 2015 / urban FID studies 1.5-4 m); a car / motorbike at ~4-6 m; the falcon mode passes the falcon itself
    if (H.walker?.on) push(H.walker.x, this.world.walkY?.(H.walker.x, H.walker.z) ?? 0, H.walker.z, 3.8);
    const th = H.getThird?.();
    if (th?.on && th.tp?.ctl?.pos) { const p = th.tp.ctl.pos; push(p[0], p[1], p[2], 3.8); }
    const c = H.driver?.on ? H.driver.state : null;
    if (c) push(c.x, c.y ?? this.ground(c.x, c.z), c.z, 6);
    // the traffic near the squares: cars within 150 m of the camera (a few dozen at most)
    const T = H.getTraffic?.()?.sim, cp = H.camera?.position;
    if (T && cp) for (let i = 0; i < T.cap && out.length < 24; i++) {
      if (!T.alive[i]) continue;
      const dx = T.x[i] - cp.x, dz = T.z[i] - cp.z;
      if (dx * dx + dz * dz < 22500) push(T.x[i], T.y[i], T.z[i], 2.2);   // (city pigeons are used to the traffic)
    }
    return out;
  },

  /** main.js, once the modes exist */
  hook(h) {
    this.hooks = h;
    if (!h.flyer) return;
    h.flyer.groundThreats = () => (this.on ? this.groundThreats() : null);
    h.flyer.birdsQuiet = () => (this.on && this._S ? this._S.e < -6 : false);
    // the lamps' lantern caps as pigeon perches (cityStream.js lampRoosts): the cap's top in the lamp's frame, from the model
    if (this.on && h.flyer.w) import("../lampModel.js").then(({ loadLampModel }) => loadLampModel()).then((m) => {
      if (!m?.lods?.[0]) return;
      const glass = m.lods[0].glass, iron = m.lods[0].iron;
      glass.computeBoundingBox();
      const gb = glass.boundingBox, gx = (gb.min.x + gb.max.x) / 2, gz = (gb.min.z + gb.max.z) / 2;
      const P = iron.attributes.position;
      let top = gb.max.y;
      for (let i = 0; i < P.count; i++) if (Math.hypot(P.getX(i) - gx, P.getZ(i) - gz) < 0.12) top = Math.max(top, P.getY(i));
      h.flyer.w.lampTop = { x: gx, y: top + 0.005, z: gz, n: 1 };
      this.log(`birds: lamp perches at the lantern cap (${gx.toFixed(2)}, ${top.toFixed(2)}, ${gz.toFixed(2)}) m in the lamp's frame`);
    }).catch(() => {});
  },

  /** debug read-back (the dev panel's read-out, at most ~1 Hz) */
  async readCounts() {
    if (!this.sky) return null;
    const c = await this.sky.readCounts();
    this.stats.near = c.near; this.stats.far = c.far;
    return c;
  },
};
