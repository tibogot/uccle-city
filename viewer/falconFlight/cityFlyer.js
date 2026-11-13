// THE CITY'S FLY MODE with the new falcon flight (docs/FALCON_FLIGHT.md "In the city"): the same face to viewer/main.js
// as the old viewer/flight.js Flyer (on, x, z, pos, yaw, start, startFromNest, stop, update, onExit), so the city keeps
// its streaming, map, traffic focus and mode switching; inside, the lab's flight in the REAL streaming city:
//   world     cityStream.js CityFalconWorld (floor / lift grid / thermals / roosts from the city's loaded tiles)
//   flight    falconGame.js FalconGame (flightModel.js + air.js: real lift / drag, thermals, façade updrafts; perch, land,
//             strike, carry to the eyrie, score), falconBird.js (the family's rig, juvenile plumage), falconCamera.js,
//             falconInput.js (keyboard, mouse aim, gamepad, touch), falconAudio.js
//   life      pigeons.js round the Place de Saint-Job (ridges, the church, the setts; drawn and flying whenever the camera
//             is within 700 m of the Place, fleeing only the falcon), hints.js (gulls in the thermals, rising dust)
//   intro     the nest start of the old fly mode (in the scrape, the hop onto the arch's ledge, the look out, the launch),
//             replayed with the new bird; at the end of the launch the flight model takes over at the launch's speed
//   HUD       our own style (viewer/panelUI.js colours): airspeed / height / air / stamina / target / score, the aim, target
//             and perch rings, messages; a "Falcon flight" panel (viewer/panelUI.js) while flying
// Nothing here adds a light. Every material is compiled before it shows (warm(): the page's precompile + one parked draw
// of the bird for its shadow pass inside a parallel-pipeline window).
import * as THREE from "three/webgpu";
import { Panel } from "../panelUI.js";
import { CityFalconWorld } from "./cityStream.js";
import { PLACE } from "./church.js";
import { AirField } from "./air.js";
import { Pigeons } from "./pigeons.js";
import { ThermalHints } from "./hints.js";
import { FalconBird } from "./falconBird.js";
import { FalconInput } from "./falconInput.js";
import { FalconCamera } from "./falconCamera.js";
import { FalconAudio } from "./falconAudio.js";
import { FalconGame } from "./falconGame.js";
import { G } from "./flightModel.js";
import { STREET } from "../treesStylized.js";
import { wx } from "../weather/weatherState.js";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const PIGEON_RANGE = 700;              // pigeons drawn / simulated while the camera is this close to the Place
const LIFE = 1.0;                      // the juvenile's span at life size (m): viewer/falcons.js FALCON_SIZES.juvenile

const CSS = `
.fhud { position: fixed; right: 340px; bottom: 10px; z-index: 3; padding: 9px 12px; border-radius: 8px; min-width: 290px;
  background: rgba(20, 24, 30, .78); color: #e6e9ee; font: 12px/1.4 ui-monospace, monospace; white-space: pre;
  box-shadow: 0 4px 18px rgba(0,0,0,.3); pointer-events: none; display: none; }
.fhud b { color: #9cc4ff; font-weight: 600; }
.fhud .bar { display: inline-block; height: 7px; width: 110px; background: rgba(255,255,255,.15); border-radius: 4px; vertical-align: middle; overflow: hidden; }
.fhud .bar i { display: block; height: 100%; background: #7fd18b; }
.fhud .k { color: #b8c2cc; }
.fmsg { position: fixed; left: 50%; top: 16%; transform: translateX(-50%); color: #fff; font: 600 15px/1.4 system-ui, sans-serif;
  text-shadow: 0 1px 4px rgba(0,0,0,.7); z-index: 3; text-align: center; pointer-events: none; }
.fring { position: fixed; border: 2px solid rgba(255,255,255,.85); border-radius: 50%; pointer-events: none; z-index: 3; transform: translate(-50%, -50%); display: none; }
.fring.aim { width: 24px; height: 24px; border-color: rgba(255,255,255,.55); }
.fring.tgt { width: 32px; height: 32px; } .fring.tgt.ok { border-color: #6fe08a; } .fring.tgt.near { border-width: 3px; }
.fring.perch { width: 28px; height: 28px; border-style: dashed; border-color: #ffd36a; border-radius: 4px; }
@media (max-width: 700px) { .fhud { font-size: 10px; min-width: 0; left: 10px; right: auto; bottom: 120px; } }
`;

export class CityFlyer {
  /**
   * camera, dom (the canvas), scene, world (viewer/main.js world); opts: { manifest, base (data/tiles URL), hide (the
   * hero models' BU_IDs), log, params (URLSearchParams), compiler: () => compileFor | null, renderer, openParallel }
   */
  constructor(camera, dom, scene, world, opts = {}) {
    Object.assign(this, { camera, dom, scene, city: world, opts, on: false });
    this.log = opts.log || (() => {});
    this.params = opts.params || new URLSearchParams();
    this.pos = new THREE.Vector3();
    this.intro = null; this.introHold = false;
    this.cpu = { frames: [], last: {} };            // per-frame CPU (ms) of each part, the last 600 frames
    this.size = +(this.params.get("falconsize") ?? 2.0);
    addEventListener("keydown", (e) => { if (!this.on) return; if (e.code === "Escape") this.onExit?.(); });
    this.ready = this.init().catch((e) => { this.log(`falcon flight: ${e.message}`); console.error(e); throw e; });
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }
  get yaw() { return this.game ? this.game.f.heading : 0; }

  async init() {
    const t0 = performance.now(), P = this.params;
    const w = this.w = new CityFalconWorld({ city: this.city, manifest: this.opts.manifest, base: this.opts.base, hide: this.opts.hide || [], log: this.log });
    w.treeDims = () => (this.treeDims ??= measureTrees(this.params.get("trees")));
    // the air: a fixed pool of thermal slots (cityStream.js fills them round the falcon)
    const slots = Array.from({ length: 12 }, () => ({ x: 1e6, z: 1e6, heat: 0, radius: 18, ground: 0 }));
    this.air = new AirField({ grid: null, floor: (x, z) => w.floor(x, z), sources: slots });
    this.air.setWind(+(P.get("wind") ?? 4), +(P.get("windfrom") ?? 240));
    this.bird = await FalconBird.create(LIFE);
    this.bird.root.visible = false;
    this.scene.add(this.bird.root);
    this.input = new FalconInput(this.dom, { invert: P.get("invert") === "1", enabled: false, skip: ["KeyM", "KeyH"] });
    this.fcam = new FalconCamera(this.camera, this.scene);
    this.fcam.streaks.visible = false;
    this.hints = new ThermalHints(this.air, { scale: 1.4 });
    this.hints.group.visible = false;
    this.scene.add(this.hints.group);
    this.game = new FalconGame({ world: w, air: this.air, bird: this.bird, pigeons: null, fam: null, audio: null, input: this.input });
    this.game.size.readable = this.size;
    this.game.reset = () => { this.input.script = null; this.start(PLACE.x + 120, PLACE.z + 80, Math.atan2(120, 80), w.ground(PLACE.x, PLACE.z) + 60); };
    this.buildHud();
    this.log(`falcon flight: the new flight (viewer/falconFlight/, ?falcon=old: the old one), bird + air + camera in ${(performance.now() - t0).toFixed(0)} ms`);
    // the church, the roosts, the pigeons, the landmarks' proxies: in the background
    this.background();
    await this.warm([this.bird.root, this.hints.group, this.fcam.streaks]);
  }

  /** the shaders of `roots` before they show: the page's precompile (scene pass target + MRT), then the bird drawn once
   *  parked far under the city in a parallel-pipeline window (its shadow pass) */
  async warm(roots) {
    const t0 = performance.now();
    let compile = this.opts.compiler?.();
    for (let i = 0; i < 400 && !compile; i++) { await new Promise((r) => setTimeout(r, 100)); compile = this.opts.compiler?.(); }
    if (compile) await compile(roots);
    for (let i = 0; i < 1200 && !document.getElementById("cover")?.classList.contains("gone") && document.getElementById("cover"); i++) await new Promise((r) => setTimeout(r, 100));
    if (roots.includes(this.bird.root) && this.opts.renderer) {
      const win = this.opts.openParallel ? this.opts.openParallel(this.opts.renderer, this.scene) : null;
      const r = this.bird.root, was = r.visible;
      r.position.set(0, -4000, 0); r.visible = true;
      for (let i = 0; i < 3; i++) await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      if (win) await win.end();
      r.visible = was || this.on;
    }
    this.log(`falcon flight: shaders warmed (${roots.length} groups) in ${(performance.now() - t0).toFixed(0)} ms`);
  }

  async background() {
    const w = this.w;
    // the church (its proxy, perches, roosts): viewer/stjobModel.js (cached load)
    if ((this.opts.hide || []).length && this.params.get("stjob") !== "0") {
      try { const { loadStJob } = await import("../stjobModel.js"); const m = await loadStJob(); w.setChurch(m.placement); } catch (e) { this.log(`falcon flight: church ${e.message}`); }
    }
    // the ridges round the Place (worker), then the pigeons once the Place's tile is in
    try {
      await w.loadRoosts();
      for (let i = 0; i < 600 && !w.tileAt(PLACE.x, PLACE.z); i++) await new Promise((r) => setTimeout(r, 200));
      const roosts = w.buildRoosts();
      const n = +(this.params.get("pigeons") ?? 150);
      this.pigeons = new Pigeons({ world: w, roosts, home: PLACE, count: n, scale: 1.4 });
      this.pigeons.mesh.visible = false;
      this.scene.add(this.pigeons.mesh);
      await this.warm([this.pigeons.mesh]);
      this.game.pigeons = this.pigeons;
      this.game.perches = this.game.buildPerches();
      this.log(`falcon flight: ${n} pigeons on ${roosts.length} roosts round the Place de Saint-Job (${w.ridges.length} on roof ridges)`);
    } catch (e) { this.log(`falcon flight: pigeons ${e.message}`); }
    // the falcon family (the eyrie: perches, delivering prey)
    for (let i = 0; i < 300 && !window.__falcons; i++) await new Promise((r) => setTimeout(r, 200));
    if (window.__falcons) this.setFamily(window.__falcons);
    // the landmarks' height proxies, from their own lowest LOD, one at a time as they load
    const heroes = ["townhall", "observatory", "stpierre", "stalle", "vanbuuren", "wolvendael", "police", "calevoet"];
    const done = new Set();
    for (let round = 0; round < 120 && done.size < heroes.length + 3; round++) {
      for (const h of heroes) {
        const L = window[h]; if (done.has(h) || !L?.levels?.length) continue;
        done.add(h);
        await w.addProxy(h, L.levels[L.levels.length - 1]).catch((e) => this.log(`falcon flight: ${h} proxy ${e.message}`));
      }
      for (const [name, b] of Object.entries(window.__bridges || {})) {
        if (done.has(`bridge:${name}`) || !b.pb?.levels?.length) continue;
        done.add(`bridge:${name}`);
        await w.addProxy(`bridge ${name}`, b.pb.levels[b.pb.levels.length - 1], { mask: false, under: true }).catch((e) => this.log(`falcon flight: bridge ${name} proxy ${e.message}`));
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  setFamily(fam) {
    this.fam = fam;
    this.game.fam = fam;
    this.game.perches = this.game.buildPerches();
  }

  // ---------------------------------------------------------------------------------------------- modes
  begin() {
    this.on = true;
    this.input.setEnabled(true);
    this.audio ??= new FalconAudio();
    this.audio.on = this.panelState?.sound ?? true;
    this.game.audio = this.audio;
    this.bird.root.visible = true;
    this.hints.group.visible = true;
    this.hud.style.display = "block";
    this.panel?.domElement.style.setProperty("display", "");
    this.buildPanel();
    this.lastSync = -1;
  }
  /** free flight from (x, z), heading yaw (rad, the old Flyer's convention: forward = -sin, -cos), height y (m TAW;
   *  default 45 m over the floor), airspeed (m/s), path angle (rad) */
  start(x, z, yaw, y = null, speed = 14, gamma = 0) {
    if (!this.game) return this.ready.then(() => this.start(x, z, yaw, y, speed, gamma));
    this.intro = null;
    this.begin();
    const yy = y ?? this.w.floor(x, z) + 45;
    this.game.start(x, yy, z, yaw, speed, gamma);
    this.game.span = this.size;
    this.fcam.inited = false;
    this.pos.set(x, yy, z);
  }
  /** THE NEST START (as viewer/flight.js): nest = { scrape, ledge: Vector3 (world), out: Vector3 (horizontal) } */
  startFromNest(nest) {
    if (!this.game) return this.ready.then(() => this.startFromNest(nest));
    this.begin();
    const out = nest.out.clone().setY(0).normalize();
    this.intro = { t: 0, ...nest, out, s: 0.92, heading: Math.atan2(-out.x, -out.z), w: { perch: 1 } };
    this.pos.copy(nest.scrape);
    this.game.span = LIFE; this.bird.setSpan(LIFE);
    this.introCamPos = this.introCam(0); this.introLook = this.pos.clone().addScaledVector(out, 2).add(new THREE.Vector3(0, 0.25, 0));
    this.nest = nest;
  }
  stop() {
    if (!this.game) return;
    this.on = false; this.intro = null;
    this.input.setEnabled(false); this.input.script = null;
    this.bird.root.visible = false;
    this.hints.group.visible = false;
    this.fcam.streaks.visible = false; this.fcam.vignette.style.opacity = "0";
    this.hud.style.display = "none"; this.msg.innerHTML = "";
    for (const r of this.rings) r.style.display = "none";
    this.panel?.domElement.style.setProperty("display", "none");
    if (this.audio) { const on = this.audio.on; this.audio.on = false; this.audio.update(0.016, { V: 0, phi: 0, fold: 0, lift: 0, downstroke: false, flapLevel: 0 }, this.camera); this.audio.on = on; }
    // the camera's field of view back to the city's
    if (this.fovCity) { this.camera.fov = this.fovCity; this.camera.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------------------------------------- the intro
  introCam(k) {
    const I = this.intro, s = I.s;
    const back = (1.25 - 0.35 * k) * s, up = (0.55 + 0.25 * k) * s;
    return this.pos.clone().addScaledVector(I.out, -back).add(new THREE.Vector3(0, up, 0)).addScaledVector(new THREE.Vector3(-I.out.z, 0, I.out.x), 0.25 * s);
  }
  updateIntro(dt) {
    const I = this.intro;
    I.t += dt;
    if (this.input.keys.has("Space") && I.t < 3.6) I.t = 3.6;                // Space skips to the launch
    const T_HOP = 1.6, T_LEDGE = 2.4, T_GO = 3.8, T_FREE = 5.0;
    let mode = "perch", flap = 0, gamma = 0;
    if (I.t < T_HOP) this.pos.copy(I.scrape);
    else if (I.t < T_LEDGE) {
      const s = (I.t - T_HOP) / (T_LEDGE - T_HOP), e = s * s * (3 - 2 * s);
      this.pos.lerpVectors(I.scrape, I.ledge, e); this.pos.y += Math.sin(Math.PI * s) * 0.3;
      mode = "land"; flap = Math.sin(Math.PI * s);
    } else if (I.t < T_GO) this.pos.copy(I.ledge);
    else {
      // the launch: off the ledge, wings open, a drop (a Hermite path, as the old fly mode)
      const s = Math.min(1, (I.t - T_GO) / (T_FREE - T_GO)), T = T_FREE - T_GO;
      const p0 = I.ledge, v0 = I.out.clone().multiplyScalar(1.5).add(new THREE.Vector3(0, 0.8, 0));
      const p1 = I.ledge.clone().addScaledVector(I.out, 9).add(new THREE.Vector3(0, -3.5, 0)), v1 = I.out.clone().multiplyScalar(13).add(new THREE.Vector3(0, -2.5, 0));
      const s2 = s * s, s3 = s2 * s, h = [2 * s3 - 3 * s2 + 1, s3 - 2 * s2 + s, -2 * s3 + 3 * s2, s3 - s2];
      this.pos.set(0, 0, 0).addScaledVector(p0, h[0]).addScaledVector(v0, h[1] * T).addScaledVector(p1, h[2]).addScaledVector(v1, h[3] * T);
      const dv = [6 * s2 - 6 * s, 3 * s2 - 4 * s + 1, -6 * s2 + 6 * s, 3 * s2 - 2 * s];
      const vel = new THREE.Vector3().addScaledVector(p0, dv[0] / T).addScaledVector(v0, dv[1]).addScaledVector(p1, dv[2] / T).addScaledVector(v1, dv[3]);
      gamma = Math.atan2(vel.y, Math.hypot(vel.x, vel.z));
      mode = s < 0.25 ? "land" : "fly"; flap = 1;
      if (s >= 1) {
        // the hand-over: the flight model from here, at the launch's speed, path angle and heading
        this.intro = null;
        this.game.start(this.pos.x, this.pos.y, this.pos.z, I.heading, Math.max(vel.length(), 12), gamma);
        this.game.span = LIFE;
        this.game.f.flapLevel = 1; this.game.takeoffT = 0.6;                  // the last launch beats
        // the chase camera carries on from the intro's
        this.fcam.pos.copy(this.camera.position); this.fcam.dir.copy(vel).normalize(); this.fcam.inited = true; this.fcam.roll = 0;
        this.handover = { t: performance.now(), V: vel.length(), gamma, x: this.pos.x, y: this.pos.y, z: this.pos.z };
        return;
      }
    }
    this._f ??= { gamma: 0, alpha: 0.1, heading: 0, phi: 0, fold: 0, flapLevel: 0, brake: 0, V: 0 };
    Object.assign(this._f, { gamma, alpha: 0.1, heading: I.heading, phi: 0, fold: 0, flapLevel: flap, brake: 0, V: 0 });
    this.bird.pose(dt, this.pos, this._f, { mode, perchYaw: I.heading });
    // the camera: behind in the chamber; on the ledge it comes up over the shoulder; at the launch it follows out
    const k = THREE.MathUtils.smoothstep(I.t, T_HOP, T_GO);
    const want = this.introCam(k);
    if (I.t > T_GO) want.copy(this.pos).addScaledVector(I.out, -1.6 * I.s).add(new THREE.Vector3(0, 0.5 * I.s, 0));
    this.introCamPos.lerp(want, 1 - Math.exp(-(I.t > T_GO ? 9 : 3) * dt));
    this.introLook.lerp(this.pos.clone().addScaledVector(I.out, 3).add(new THREE.Vector3(0, 0.15 - 0.6 * k, 0)), 1 - Math.exp(-4 * dt));
    this.camera.position.copy(this.introCamPos); this.camera.up.set(0, 1, 0); this.camera.lookAt(this.introLook);
    if (Math.abs(this.camera.fov - 58) > 0.01) { this.fovCity ??= this.camera.fov; this.camera.fov = 58; this.camera.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------------------------------------- per frame
  /** the city's updater (every frame, every mode): the pigeons round the Place go on while the camera is near (in fly
   *  mode update() runs them) */
  tick(camPos) {
    const now = performance.now(), dt = Math.min((now - (this._tickT ?? now)) / 1000, 0.05);
    this._tickT = now;
    // the loaded tiles' tree crowns (a worker job per new tile), ready before a flight
    if (this.w && now - (this._treeT ?? 0) > 2000) { this._treeT = now; this.w.syncTrees(); }
    if (!this.on && this.game) this.ambient(camPos, dt);
  }
  ambient(camPos, dt) {
    const P = this.pigeons;
    if (!P) return;
    const near = Math.hypot(camPos.x - PLACE.x, camPos.z - PLACE.z) < PIGEON_RANGE && !!this.w.tileAt(PLACE.x, PLACE.z);
    P.mesh.visible = near && (this.panelState?.pigeons ?? true);
    if (!near) return;
    const t0 = performance.now();
    const f = this.game.f, flying = this.on && !this.intro;
    // the threat: the falcon (in fly mode), else none (far away)
    this.tAmb = (this.tAmb ?? 0) + dt;
    P.update(dt * this.game.timeScale, this.tAmb, flying ? { x: f.pos.x, y: f.pos.y, z: f.pos.z, speed: f.V, stoop: f.fold > 0.7 } : { x: 1e6, y: 0, z: 1e6, speed: 0, stoop: false });
    for (const e of P.events.splice(0)) if (e.kind === "burst" && this.on && this.audio) this.audio.pigeonBurst(e.x, e.y, e.z, e.n);
    this.cpu.last.pigeons = performance.now() - t0;
  }

  update(dtIn) {
    if (!this.on || !this.game) return;
    const dt = Math.min(dtIn, 0.05), c = this.cpu.last;
    const t0 = performance.now();
    const g = this.game, f = g.f, air = this.air, w = this.w;
    // the air: the sun from the city's lighting, the thermal pool refreshed round the falcon every second
    if (this.opts.lighting?.sunDir) air.params.sunElev = Math.asin(clamp(this.opts.lighting.sunDir.y, -1, 1)) * 57.3;
    const fx = this.intro ? this.pos.x : f.pos.x, fz = this.intro ? this.pos.z : f.pos.z;
    if (g.t - this.lastSync > 1 || this.lastSync < 0) { w.syncThermals(air, fx, fz); this.syncWeather(); this.lastSync = g.t; }
    air.update(g.t);
    const t1 = performance.now();
    w.updateLift(fx, fz, air, 1.5);
    const t2 = performance.now();
    c.air = t1 - t0; c.lift = t2 - t1;
    if (this.intro) {
      g.t += dt;
      this.updateIntro(dt);
      this.ambient(this.camera.position, dt);
      this.hints.update(dt, g.t, this.pos);
      this.hudFrame();
      return;
    }
    g.update(dt, this.camera);
    const t3 = performance.now();
    this.pos.set(f.pos.x, f.pos.y, f.pos.z);
    this.ambient(this.camera.position, dt);
    const t4 = performance.now();
    this.hints.update(dt * g.timeScale, g.t, f.pos);
    const t5 = performance.now();
    // the camera (the chase / head camera of the lab; V: chase / head, wheel: distance)
    if (this.input.take("camera")) this.fcam.mode = this.fcam.mode === "chase" ? "head" : "chase";
    const inp = this.input;
    const aim = inp.mouseAim && inp.mouse.locked && g.mode === "fly" ? (this._aim ??= new THREE.Vector3()).set(-Math.sin(inp.aim.yaw) * Math.cos(inp.aim.pitch), Math.sin(inp.aim.pitch), -Math.cos(inp.aim.yaw) * Math.cos(inp.aim.pitch)) : null;
    this.fovCity ??= this.camera.fov;
    this.fcam.update(dt, { pos: g.pos, va: f.va, V: g.mode === "fly" ? f.V : Math.max(f.V, 0.1), phi: f.phi, heading: f.heading, gamma: f.gamma, span: g.span, stun: f.stun, liftRate: f.lift },
      { aim, look: inp.look, zoom: inp.zoom, perched: g.mode === "perch", perchYaw: g.perch?.yaw ?? 0, floor: (x, z) => w.floor(x, z), col: (this._colFn ??= (x, z) => w.column(x, z, this.game.f.pos.y, true)), sight: (this._sightFn ??= (x, z) => w.column(x, z, this.game.f.pos.y).floor) });
    this.audio?.update(dt, { V: g.mode === "fly" ? f.V : 0, phi: f.phi, fold: f.fold, lift: f.lift, downstroke: this.bird.downstroke, flapLevel: f.flapLevel }, this.camera);
    const t6 = performance.now();
    c.game = t3 - t2; c.hints = t5 - t4; c.camera = t6 - t5;
    this.hudFrame();
    c.total = performance.now() - t0;
    this.cpu.frames.push({ ...c }); if (this.cpu.frames.length > 600) this.cpu.frames.shift();
  }

  /** THE WEATHER (viewer/weather/weatherState.js): when the city runs one (opts.weather or window.__weather, a Weather
   *  whose update() fills the shared `wx` uniforms), the air takes its wind (wx.uWind: the 10 m wind, the way the air
   *  moves; gusts, the height profile and the updrafts stay the air's own) and its cloud (thermals: the sun's heating
   *  under the cloud; rain = overcast); without one, the air's own wind (the panel's sliders). Checked every second. */
  syncWeather() {
    const W = this.opts.weather ?? window.__weather ?? null, air = this.air;
    if (W && this.weather !== W) { air.setWeatherWind(wx.uWind); this.weather = W; this.cloud0 ??= air.params.cloud; this.log("falcon flight: the wind and cloud from the city's weather"); }
    else if (!W && this.weather) { air.setWeatherWind(null); air.setWind(); air.params.cloud = this.cloud0 ?? air.params.cloud; this.weather = null; }
    if (W) {
      const I = W.input || {};
      air.params.cloud = Math.min(1, Math.max(I.cloud ?? air.params.cloud, (I.rain ?? 0) > 0.2 || (I.snow ?? 0) > 0.1 ? 0.95 : 0));
      air.params.wind = Math.hypot(wx.uWind.value.x, wx.uWind.value.y);
      air.params.windFrom = ((Math.atan2(-wx.uWind.value.x, wx.uWind.value.y) * 180 / Math.PI) + 360) % 360;
    }
  }

  // ---------------------------------------------------------------------------------------------- HUD, panel
  buildHud() {
    const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
    this.hud = document.createElement("div"); this.hud.className = "fhud";
    this.msg = document.createElement("div"); this.msg.className = "fmsg";
    this.rings = ["aim", "tgt", "perch"].map((k) => { const d = document.createElement("div"); d.className = `fring ${k}`; return d; });
    document.body.append(this.hud, this.msg, ...this.rings);
    this.hudN = 0;
  }
  ring(el, v, show) {
    if (!show) { el.style.display = "none"; return; }
    const p = (this._p ??= new THREE.Vector3()).copy(v).project(this.camera);
    if (p.z > 1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) { el.style.display = "none"; return; }
    el.style.display = "block"; el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
  }
  hudFrame() {
    if (this.hudN++ % 6) return;
    const g = this.game, f = g.f, win = g.window, sc = g.score, inp = this.input;
    if (this.intro) {
      this.hud.innerHTML = `<b>the young falcon leaves the Saint-Job eyrie</b>\n<span class="k">Space: skip to the launch · Esc: back</span>`;
      return;
    }
    const cfg = f.fold < 0.25 ? "spread" : f.fold < 0.75 ? "half folded" : "TUCKED";
    const bar = (x, col = "#7fd18b") => `<span class="bar"><i style="width:${(clamp(x, 0, 1) * 100).toFixed(0)}%;background:${col}"></i></span>`;
    const head = g.mode === "perch" ? `<b>PERCHED</b> (${g.perch?.name})  E / Space: take off` : g.mode === "land" ? "<b>LANDING</b>: the flare" : `<b>${f.V.toFixed(0).padStart(3)} m/s</b>  ${(f.V * 3.6).toFixed(0).padStart(3)} km/h  ${cfg}`;
    this.hud.innerHTML = `${head}
<span class="k">height </span> ${(g.agl ?? 0).toFixed(0).padStart(4)} m  (${f.pos.y.toFixed(0)} m TAW)
<span class="k">air    </span> ${(f.lift >= 0 ? "+" : "") + f.lift.toFixed(1)} m/s  climb ${(f.vel.y >= 0 ? "+" : "") + f.vel.y.toFixed(1)}  ${f.n.toFixed(1)} g${f.stall > 0.3 ? "  STALL" : ""}${f.stun > 0 ? "  STUNNED" : ""}
<span class="k">stamina</span> ${bar(f.stamina, f.stamina < 0.15 ? "#e0705a" : "#7fd18b")}
<span class="k">target </span> ${win ? `${win.d.toFixed(0)} m, closing ${win.closing.toFixed(0)} m/s${win.ok ? "  <b>WINDOW</b>" : ""}${g.talonsOut ? " · talons" : ""}` : "-"}
<span class="k">score  </span> ${sc.points} · caught ${sc.catches} · delivered ${sc.delivered} · best ${sc.bestStrike} m/s${this.bird.prey ? "\n<b>CARRYING</b>: to the eyrie's ledge (E near it)" : ""}
<span class="k">W/S A/D fly · Space flap · Shift stoop · C half · Q flare
F talons · E land · V camera · click: mouse aim · Esc out</span>`;
    this.msg.innerHTML = g.messages.filter((m) => g.t - m.t < 4).map((m) => m.s).join("<br>");
    const [aimEl, tgtEl, perchEl] = this.rings;
    if (this._aim && inp.mouseAim && inp.mouse.locked && g.mode === "fly") this.ring(aimEl, this.camera.position.clone().addScaledVector(this._aim, 50), true); else aimEl.style.display = "none";
    if (win && g.mode === "fly" && this.pigeons) { const p = this.pigeons.pos(win.i, {}); this.ring(tgtEl, new THREE.Vector3(p.x, p.y, p.z), true); tgtEl.className = `fring tgt${win.ok ? " ok" : ""}${win.near ? " near" : ""}`; } else tgtEl.style.display = "none";
    const q = g.mode === "fly" ? g.perchInReach() : null;
    this.ring(perchEl, q ? q.pos : this.pos, !!q);
  }
  buildPanel() {
    if (this.panel) return;
    const S = this.panelState = { wind: this.air.params.wind, windFrom: this.air.params.windFrom, thermals: 1, ridge: 1, camera: this.fcam.mode, size: this.size, mouseAim: true, invert: this.input.invert, sound: true, volume: 0.8, pigeons: true, cpu: "" };
    const ui = this.panel = new Panel({ title: "Falcon flight" });
    ui.domElement.style.right = "336px"; ui.domElement.style.width = "270px";
    ui.domElement.classList.add("closed"); ui.domElement.querySelector(".uhead span:last-child").textContent = "▸";
    const a = ui.addFolder("Air");
    a.add(S, "wind", 0, 14, 0.1).name("wind at 10 m (m/s)").onChange((v) => this.air.setWind(v, S.windFrom));
    a.add(S, "windFrom", 0, 359, 1).name("wind from (deg)").onChange((v) => this.air.setWind(S.wind, v));
    a.add(S, "thermals", 0, 2, 0.05).name("thermal strength").onChange((v) => { this.air.params.thermals = v; });
    a.add(S, "ridge", 0, 2, 0.05).name("façade updrafts").onChange((v) => { this.air.params.ridge = v; });
    const fe = ui.addFolder("Feel");
    fe.add(S, "camera", ["chase", "head"]).name("camera (V)").onChange((v) => { this.fcam.mode = v; });
    fe.add(S, "size", 1, 3, 0.05).name("draw size in the air (m)").onChange((v) => { this.size = v; this.game.size.readable = v; });
    fe.add(S, "mouseAim").name("mouse aim (click)").onChange((v) => { this.input.mouseAim = v; });
    fe.add(S, "invert").name("invert pitch (stick)").onChange((v) => { this.input.invert = v; });
    const so = ui.addFolder("Sound / life");
    so.add(S, "sound").name("sound").onChange((v) => { if (this.audio) this.audio.on = v; });
    so.add(S, "volume", 0, 1.5, 0.01).name("volume").onChange((v) => { if (this.audio) this.audio.volume = v; });
    so.add(S, "pigeons").name("pigeons");
    const pf = ui.addFolder("Cost");
    pf.add(S, "cpu").name("CPU ms (median)").listen();
    setInterval(() => { if (this.on) S.cpu = this.cpuSummary(); }, 1000);
  }
  /** per-frame CPU of the parts (median / p99 / max over the last 600 frames) */
  cpuStats() {
    const F = this.cpu.frames, out = {};
    for (const k of ["total", "game", "lift", "air", "pigeons", "hints", "camera"]) {
      const s = F.map((f) => f[k] ?? 0).sort((a, b) => a - b);
      if (!s.length) continue;
      const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3);
      out[k] = { p50: q(0.5), p99: q(0.99), max: q(1) };
    }
    out.lift = { ...out.lift, ...this.w.liftStats };
    return out;
  }
  cpuSummary() { const s = this.cpuStats(); return `total ${s.total?.p50 ?? "-"} (p99 ${s.total?.p99 ?? "-"}) · lift ${s.lift?.p50 ?? "-"}`; }
}

/** the drawn street trees' crowns per variant, at scale 1 (viewer/treesStylized.js STREET's built LOD 0): the leaf cards'
 *  centroid (off the trunk), their 95th-percentile radius + half a card, the 5-95 % height band + half a card, the trunk's
 *  radius at 1-2.5 m. null until the species is built (the first tile's trees); ?trees=slop / simple: a generic crown. */
function measureTrees(mode) {
  if (mode === "slop" || mode === "simple") return { V: new Float32Array([0, 0, 8.2, 4.5, 3.0, 0.4]), nVar: 1, H: 12 };
  const geoms = STREET.shared.geoms;
  if (!geoms?.size) return null;
  const V = [];
  for (let v = 0; v < STREET.variants; v++) {
    const g = geoms.get(`${v}:0`);
    if (!g) return null;
    const P = g.leaves.attributes.position, n = P.count;
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += P.getX(i); cz += P.getZ(i); }
    cx /= n; cz /= n;
    const r = new Float32Array(n), y = new Float32Array(n);
    for (let i = 0; i < n; i++) { r[i] = Math.hypot(P.getX(i) - cx, P.getZ(i) - cz); y[i] = P.getY(i); }
    r.sort(); y.sort();
    const T = g.trunk.attributes.position;
    let tr = 0.3;
    for (let i = 0; i < T.count; i++) { const ty = T.getY(i); if (ty > 1 && ty < 2.5) tr = Math.max(tr, Math.hypot(T.getX(i), T.getZ(i))); }
    const y05 = y[Math.floor(n * 0.05)], y95 = y[Math.floor(n * 0.95)];
    V.push(cx, cz, (y05 + y95) / 2, r[Math.floor(n * 0.95)] + 0.5, (y95 - y05) / 2 + 0.6, tr);
  }
  return { V: new Float32Array(V), nVar: STREET.variants, H: STREET.naturalHeight };
}
