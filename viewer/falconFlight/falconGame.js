// THE FALCON GAME (Falcon Flight Lab): the flight model + the bird + the city, and what the player does with them:
//   fly       flightModel.js against air.js, colliding with the city (a bounce or a touch-down, never a push)
//   perch     on the church's perches (the spire cross, the gable cross, the louvre ledge, the eyrie's ledge: the
//             stjob.glb perch nodes of viewer/falcons.js) or a roof ridge / any level spot the bird touched down on;
//             E takes off (a drop forward and three hard wingbeats)
//   land      E with a perch in reach (ahead, < 28 m, slow enough): the final glide + the landing FLARE (wings forward and
//             up, tail fanned down, talons forward) over ~1-2 s onto the perch, facing the way the perch faces
//   strike    a target pigeon ahead (the ring); the catch window: within reach of the talons (F, or talons out) with a
//             closing speed > 8 m/s and an approach within 35 deg of the path. Slow attacks miss (the pigeon jinks at
//             7 m: it out-turns a slow falcon); fast ones do not. A catch: a 0.35 s hit-stop, the prey in the talons
//             (+0.33 kg: heavier, more tiring), the score = the strike speed
//   carry     bring it to the eyrie: land on the eyrie's ledge -> delivered (score x2 in the first minute), and the
//             female takes it in to feed the young (fam.force("feed"))
// FALCON FUN (claude/falconfun, falconFun.js, docs/rules/falcon-catch-fun.md; ?falconfun=old = the above): the lock-on
// (the pigeon nearest the view centre), the AUTO-DIVE while the strike button is held, an automatic grab within 5.5 m
// with speed / angle as bonus points, a slow motion just before contact, the arcade stoop and the flap sprint, combos,
// the run goal (5 in 2:00), hunting on with prey in the talons (the eyrie a bonus), the tame first pigeon.
// ?falconctl=gym (gymCity.js, rule falcon-gym "the gym in the city"): the Falcon Gym's controller flies instead
// (CityGymFlight against cityGymWorld.js), the lock-on, the auto-dive's aim, the catch and the rest stay as above.
// Traces: every 0.1 s, time / airspeed / height above the floor / altitude / stamina / specific energy (h + V^2/2g) /
// the air's vertical speed / mode, for the lab's graph and the verification records.
import * as THREE from "three/webgpu";
import { FalconFlight, FlightControls, G } from "./flightModel.js";
import { FlightAssist, ASSIST } from "./flightAssist.js";
import { FUN, FUN_OLD, FunState, flockOf, localOf } from "./falconFun.js";
import { CTL_OLD } from "./falconInput.js";
import { GymControls, fillGymControls } from "../falconGym/gymFlight.js";
import { CityGymFlight, FALCON_CTL } from "./gymCity.js";
import { CityGymWorld } from "./cityGymWorld.js";
/** ?falconcol=old also keeps round 1's take-off (a drop forward from the perch's own height: from the ground or a flat
 *  roof it touched down again at once) */
const COL_OLD = typeof location !== "undefined" && /[?&]falcon(col|hit)=old(&|$)/.test(location.search);

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class FalconGame {
  constructor({ world, air, bird, pigeons, fam, audio = null, input, ctl = FALCON_CTL, gymWorld = null }) {
    Object.assign(this, { world, air, bird, pigeons, fam, audio, input });
    this.ctl = ctl === "gym" ? "gym" : "current";
    if (this.ctl === "gym") {
      // (the gym controller: its world over the city's, the family's perches among its ledges)
      this.gw = gymWorld || new CityGymWorld(world, { perches: () => this.perches });
      this.f = new CityGymFlight(this.gw); this.f.air = air;
      this.f.prefer = () => this.eyrieAhead();
      this.GC = new GymControls(); this._gp = { name: "ground", pos: new THREE.Vector3(), yaw: 0, roof: false, gym: true };
      this._spaceWas = false; this._gymMode = "fly"; this._pr = { pos: new THREE.Vector3(), yaw: 0, name: "" };
    } else this.f = new FalconFlight();
    // the flight assist (falconfix: the player says where, the assist flies; ?falconctl=old = the raw controls)
    this.fun = FUN_OLD ? null : new FunState();
    this.assist = CTL_OLD || this.gw ? null : new FlightAssist(this.fun ? { ...ASSIST, chase: FUN.chase } : ASSIST);
    if (this.fun && !this.gw) { this.f.arcade = FUN.arcade; this.f.P = { ...this.f.P, nMax: FUN.nMax }; }
    this._cam = new THREE.Vector3();
    if (this.assist && typeof location !== "undefined" && /[?&]falconavoid=0(&|$)/.test(location.search)) this.assist.avoid = false;
    this.steerT = -1; this._ov = { psi: 0, gamma: 0 };
    this.mode = "fly";                         // fly | perch | land
    this.size = { readable: 2.0, life: 1.0 };
    this.span = 2.0;
    this.perch = null; this.landing = null; this.takeoffT = 0;
    this.target = -1; this.window = null; this.talonsT = 0; this.hitStop = 0;
    this.score = { catches: 0, delivered: 0, points: 0, bestStrike: 0, misses: 0, maxSpeed: 0, carriedSince: 0 };
    this.messages = [];
    this.trace = []; this.traceT = 0; this.t = 0;
    this.pos = new THREE.Vector3();
    this.perches = this.buildPerches();
    this.cpu = { flight: 0, game: 0 };
    this._v = { x: 0, y: 0, z: 0 }; this._w = { x: 0, y: 0, z: 0 };
    this.timeScale = 1;
  }

  /** the church's perches (world) + roof ridges (every ~2 m of the pigeons' ridge roosts) */
  buildPerches() {
    const out = [], fam = this.fam;
    if (fam) for (const [name, p] of Object.entries(fam.perch)) {
      const pos = fam.toWorld(p.pos.clone());
      const face = p.facing.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), fam.group.rotation.y);
      out.push({ name, pos, yaw: Math.atan2(-face.x, -face.z), eyrie: name === "ledge", church: true });
    }
    const R = this.world.roosts.filter((r) => r.kind === "ridge");
    for (let i = 0; i < R.length; i += 4) out.push({ name: "ridge", pos: new THREE.Vector3(R[i].x, R[i].y, R[i].z), yaw: R[i].yaw + Math.PI / 2, ridge: true });
    return out;
  }

  say(s) { this.messages.push({ t: this.t, s }); if (this.messages.length > 6) this.messages.shift(); }
  /** (falcon fun round 3 part B) ONE MESSAGE AT A TIME: what the HUD shows now, { banner: caught | missed | dodged | "",
   *  line: the newest said line (< 4 s) | "", hint: starter | gotit | "" }, at most one of the three. The banner first
   *  (FUN.banner real s), then a line said since it, then the hint ("Got it!" only after the first catch's banner faded).
   *  Round 3 stacked every line of the last 4 s of GAME time (the catch's slow motion stretched them) under the banner and
   *  the hint: "CAUGHT!" + "MISSED: it slipped past" + "CAUGHT at 73 km/h" + "Got it!" at once. One shared object. */
  funHud() {
    const F = this.fun, H = (this._hud ??= { banner: "", line: "", hint: "" });
    H.banner = ""; H.line = ""; H.hint = "";
    if (!F) return H;
    const B = F.banner;
    if (B && F.realT - B.t < FUN.banner) { H.banner = B.kind; return H; }
    const m = this.messages[this.messages.length - 1];
    if (m && this.t - m.t < 4 && !(B && m.t < B.gt)) { H.line = m.s; return H; }
    H.hint = F.starter && this.mode === "fly" && !this.score.catches ? "starter"
      : this.score.catches === 1 && B?.kind === "caught" && F.realT - B.t < FUN.banner + FUN.gotIt ? "gotit" : "";
    return H;
  }

  /** free flight from a point (heading rad, speed m/s, path angle rad) */
  start(x, y, z, heading, speed = 14, gamma = 0) {
    this.f.launch(x, y, z, heading, speed, gamma, this.air);
    this.mode = "fly"; this.perch = null; this.landing = null; this._gymMode = "fly";
    this.input.syncAim(heading, gamma);
    this.assist?.reset();
  }
  perchOn(p) {
    // (gym: standing there, its own ground mode)
    if (this.gw) { this.f.placeOnGround(p.pos.x, p.pos.y, p.pos.z, p.yaw); this._gymMode = "ground"; Object.assign(this._gp, { name: p.name || "ground", roof: !!p.roof }); this._gp.pos.copy(p.pos); this._gp.yaw = p.yaw; this._gp.camYaw = p.name === "sill" || p.name === "railing" ? p.yaw + Math.PI : p.yaw; this.mode = "perch"; this.perch = this._gp; this.landing = null; if (p.eyrie && this.bird.prey) this.deliver(); return; }
    this.mode = "perch"; this.perch = p; this.landing = null;
    this.f.vel.x = this.f.vel.y = this.f.vel.z = 0; this.f.V = 0;
    // (falconfix, owner: "when it lands everything is shaking") the flight's live state is frozen on a perch (sub() does
    // not run): a tumble's stun, the air's lift and the load factor would stay at their last values and keep the camera
    // shaking (stun shake, rough-air shake) for as long as the bird sat there
    this.f.stun = 0; this.f.lift = 0; this.f.n = 1; this.f.contact = null;
    Object.assign(this.f.pos, { x: p.pos.x, y: p.pos.y, z: p.pos.z });
    if (p.eyrie && this.bird.prey) this.deliver();
  }
  deliver() {
    this.bird.drop(); this.f.extraMass = 0;
    const fast = this.t - this.score.carriedSince < 60;
    const pts = Math.round((this.score.lastStrike || 20) * (fast ? 2 : 1));
    this.score.delivered++; this.score.points += pts;
    this.say(`delivered to the eyrie: +${pts}${fast ? " (within a minute: x2)" : ""}; the female takes it in to the young`);
    this.fam?.force("feed");
    this.audio?.strike(true);
  }

  /** the perch in reach for a landing: ahead (within 70 deg of the path), < 28 m, the bird slower than 24 m/s */
  perchInReach() {
    if (this.gw) { const q = this.f.mode === "fly" ? this.f.landingTarget() : null, R = this._pr; if (!q) return null; R.pos.set(q.x, q.y, q.z); R.yaw = q.yaw; R.name = q.name; return R; }
    const f = this.f, p = f.pos;
    if (f.V > 24) return null;
    let best = null, bd = 28;
    const hx = -Math.sin(f.heading), hz = -Math.cos(f.heading);
    const test = (q) => {
      const dx = q.pos.x - p.x, dy = q.pos.y - p.y, dz = q.pos.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d > bd || d < 1.5) return;
      const c = (dx * hx + dz * hz) / Math.max(Math.hypot(dx, dz), 0.1);
      if (c < 0.35 || dy > 8 || dy < -18) return;
      bd = d; best = q;
    };
    for (const q of this.perches) test(q);
    // the tops of the trees' crowns (the city: cityStream.js treePerches), facing the way the bird comes in
    if (this.world.treePerches) for (const q of this.world.treePerches(p.x, p.z, 28)) test(q);
    if (best?.tree) best.yaw = f.heading;
    if (!best && this.assist && !COL_OLD) best = this.spotAhead();
    return best;
  }
  /** (falconfix) no perch in reach: E lands on the roof / ground ahead (8-20 m on, level within 0.4 m over 1.6 m, 0.5-25 m
   *  under the bird), one reused spot */
  spotAhead() {
    const f = this.f, w = this.world, d = clamp(f.V * 1.2, 8, 20);
    const x = f.pos.x - Math.sin(f.heading) * d, z = f.pos.z - Math.cos(f.heading) * d;
    const fl = (a, b) => (w.column ? w.column(a, b, f.pos.y).floor : w.floor(a, b));
    const h = fl(x, z), drop = f.pos.y - h;
    if (drop < 0.5 || drop > 25) return null;
    const e = 0.8;
    if (Math.abs(fl(x + e, z) - h) > 0.4 || Math.abs(fl(x - e, z) - h) > 0.4 || Math.abs(fl(x, z + e) - h) > 0.4 || Math.abs(fl(x, z - e) - h) > 0.4) return null;
    const S = (this._spot ??= { name: "spot", pos: new THREE.Vector3(), yaw: 0, spot: true });
    const g = w.ground ? w.ground(x, z) : h;
    S.pos.set(x, h, z); S.yaw = f.heading; S.roof = h > g + 1.5;
    return S;
  }

  beginLanding(q) {
    const f = this.f;
    const p0 = new THREE.Vector3(f.pos.x, f.pos.y, f.pos.z), v0 = new THREE.Vector3(f.vel.x, f.vel.y, f.vel.z);
    const d = p0.distanceTo(q.pos);
    const T = clamp(d / Math.max(f.V * 0.62, 4), 0.9, 2.6);
    // the final: arrive a touch from above and behind the perch with ~1 m/s along its facing
    const face = new THREE.Vector3(-Math.sin(q.yaw), 0, -Math.cos(q.yaw));
    const v1 = face.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, -0.6, 0));
    this.landing = { q, p0, v0, v1, T, t: 0, yaw0: f.heading };
    f.stun = 0; f.lift = 0;                                   // (falconfix: no tumble / rough-air shake in the flare)
    f.sprint = 0;
    this.mode = "land";
    this.say(`landing on ${q.church ? `the ${q.name === "ledge" ? "eyrie's ledge" : q.name}` : q.tree ? "a tree's crown" : q.spot ? (q.roof ? "the roof" : "the ground") : "a roof ridge"}: the flare`);
    if (q.spot) this.landing.q = { name: q.roof ? "roof" : "ground", pos: q.pos.clone(), yaw: q.yaw, roof: q.roof };
  }

  takeoff() {
    const p = this.perch; if (!p) return;
    const h = p.yaw;
    if (COL_OLD) this.f.launch(p.pos.x - Math.sin(h) * 0.4, p.pos.y + 0.3, p.pos.z - Math.cos(h) * 0.4, h, 6, -0.25, this.air);
    else {
      // (falconfix) a jump UP and forward, clear of the surface it stands on (the feet are at p.pos: the body's centre
      // 0.35 m over them), no touch-down for 0.6 s; the assist climbs it 8 m before it holds the height
      this.f.launch(p.pos.x - Math.sin(h) * 0.4, p.pos.y + 0.6, p.pos.z - Math.cos(h) * 0.4, h, 7, 0.3, this.air);
      this.f.noLand = 0.6;
    }
    this.f.stamina = Math.max(this.f.stamina, 0.3);
    this.input.syncAim(h, 0);
    if (this.assist) { this.assist.reset(); this.assist.hT = p.pos.y + 8; }
    this.mode = "fly"; this.perch = null; this.takeoffT = 0.9;
    this.say("take-off: a drop and three wingbeats");
  }

  /** (gym) with prey in the talons, the eyrie's ledge as the landing (as falconGameDef.js's perchInReach for the current
   *  controller): within 40 m, any side but behind, under 26 m/s */
  eyrieAhead() {
    if (!this.bird.prey) return null;
    const f = this.f, q = this.perches.find((x) => x.eyrie);
    if (!q) return null;
    const dx = q.pos.x - f.pos.x, dy = q.pos.y - f.pos.y, dz = q.pos.z - f.pos.z, d = Math.hypot(dx, dy, dz);
    const ahead = (dx * -Math.sin(f.heading) + dz * -Math.cos(f.heading)) / Math.max(Math.hypot(dx, dz), 0.1);
    return d < 40 && d > 1.5 && f.V < 26 && ahead > -0.2 && dy < 12 && dy > -25 ? q : null;
  }

  update(dtReal, cam) {
    const t0 = performance.now();
    // the hit-stop after a catch (the game-feel pause), slow motion option
    let dt = dtReal * this.timeScale;
    if (this.hitStop > 0) { this.hitStop -= dtReal; dt *= 0.15; }
    if (this.fun) { dt *= this.fun.slowK; this.fun.realT += dtReal; }   // (falcon fun) the slow motion just before contact
    this.t += dt;
    if (this.gw) return this.updateGym(dt, dtReal, cam, t0);
    const f = this.f, inp = this.input;
    const C = inp.update(dt, f);
    if (inp.take("reset")) { this.reset?.(); }
    // ---- modes
    if (this.mode === "perch") {
      f.stamina = Math.min(1, f.stamina + f.P.stamina.perchRegen * dt);
      // (falcon fun, round 2: the POUNCE: touched down within reach of the locked bird = caught; browser check: a slow
      // auto-dive onto the tame pigeon's roof perched beside it and the first catch never came)
      if (this.fun && this.target >= 0 && this.pigeons && this.pigeons.state[this.target] !== 3) {
        this.pigeons.pos(this.target, this._v);
        if (Math.hypot(this._v.x - f.pos.x, this._v.y - f.pos.y, this._v.z - f.pos.z) < FUN.reach + 1) this.funCatch(this.target, 0.5, flockOf(this.pigeons, this.target)?.kindName(localOf(this.pigeons, this.target)) ?? "");
      }
      if (inp.take("land") || C.flap > 0.5) this.takeoff();
    } else if (this.mode === "land") {
      const L = this.landing; L.t += dt;
      const s = clamp(L.t / L.T, 0, 1), s2 = s * s, s3 = s2 * s, T = L.T;
      const h = [2 * s3 - 3 * s2 + 1, s3 - 2 * s2 + s, -2 * s3 + 3 * s2, s3 - s2];
      const P0 = L.p0, P1 = L.q.pos;
      f.pos.x = h[0] * P0.x + h[1] * T * L.v0.x + h[2] * P1.x + h[3] * T * L.v1.x;
      f.pos.y = h[0] * P0.y + h[1] * T * L.v0.y + h[2] * P1.y + h[3] * T * L.v1.y;
      f.pos.z = h[0] * P0.z + h[1] * T * L.v0.z + h[2] * P1.z + h[3] * T * L.v1.z;
      const d = [6 * s2 - 6 * s, 3 * s2 - 4 * s + 1, -6 * s2 + 6 * s, 3 * s2 - 2 * s];
      f.vel.x = (d[0] * P0.x + d[2] * P1.x) / T + d[1] * L.v0.x + d[3] * L.v1.x;
      f.vel.y = (d[0] * P0.y + d[2] * P1.y) / T + d[1] * L.v0.y + d[3] * L.v1.y;
      f.vel.z = (d[0] * P0.z + d[2] * P1.z) / T + d[1] * L.v0.z + d[3] * L.v1.z;
      f.V = Math.hypot(f.vel.x, f.vel.y, f.vel.z);
      Object.assign(f.va, f.vel);
      const hv = Math.hypot(f.vel.x, f.vel.z);
      if (hv > 0.5) f.heading += wrap(Math.atan2(-f.vel.x, -f.vel.z) - f.heading) * (1 - Math.exp(-6 * dt));
      if (s > 0.75) f.heading += wrap(L.q.yaw - f.heading) * (1 - Math.exp(-8 * dt));
      // the flare: body pitched up (alpha shown big), banking out
      f.gamma = Math.atan2(f.vel.y, Math.max(hv, 0.3)); f.alpha = 0.25 + 0.75 * smooth(s, 0.45, 0.95); f.phi *= Math.exp(-4 * dt);
      f.brake = smooth(s, 0.3, 0.8); f.flapLevel = s > 0.82 ? 1 : 0;
      if (s >= 1) this.perchOn(L.q);
    } else {
      // ---- free flight
      // the assist (not under a verification script: those fly the raw controls); the hunt's aim assist steering this
      // frame (hunt.js sets steerT): the assist follows the path it gives instead of pulling back to the aim
      f.assisted = !!this.assist && !inp.script;
      if (f.assisted) {
        let ov = null, I = inp.intent;
        if (this.fun) { I = this.funSteer(dt, inp); if (this.fun.diving) ov = this.fun.ov; }
        else { ov = this.t - this.steerT < 0.1 ? this._ov : null; if (ov) { ov.psi = f.heading; ov.gamma = f.gamma; ov.floorY = null; } }
        this.assist.override = ov;
        const W = this.window; this.assist.chase = this.fun ? this.fun.diving : !!(W && W.i >= 0 && W.d < 90 && W.angle < 0.6 && !this.bird.prey);
        this.assist.apply(dt, f, I, C, this.world);
      }
      if (this.takeoffT > 0) { this.takeoffT -= dt; C.flap = 1; C.pitch = Math.max(C.pitch, 0.3); C.fold = 0; }
      // (falcon fun) the flap sprint: a quick tap of Space (gamepad RB, a tap on FLAP): ~1 s of hard beats
      if (this.fun && inp.take("sprint")) {
        if (f.stamina > FUN.sprintMin && f.sprint <= 0) { f.sprint = FUN.sprintT; f.stamina -= FUN.sprintCost; this.say("sprint!"); }
        else if (f.sprint <= 0) this.say("too tired to sprint");
      }
      if (f.sprint > 0) { C.flap = 1; C.fold = Math.min(C.fold, 0.3); }
      if (this.fun && this.fun.diving) this.funHome(dt); else if (this.fun) this.fun.homeW = 0;
      const t1 = performance.now();
      f.step(dt, C, this.air, this.world);
      this.cpu.flight = this.cpu.flight * 0.95 + (performance.now() - t1) * 0.05;
      const c = f.contact;
      if (c) {
        if (c.land || (c.speed < 4 && c.ny > 0.7 && f.noLand <= 0)) {
          const yaw = f.heading, tree = c.tree != null;
          this.perchOn({ name: tree ? "tree" : "roof", pos: new THREE.Vector3(c.x, c.y - 0.35, c.z), yaw, roof: !tree, tree });
          this.say(tree ? "touched down on a tree's crown" : "touched down");
        } else if (c.hard) { this.say(`hit ${c.tree != null ? "a tree" : c.under ? "the underside" : c.wall ? "a wall" : "the ground"} at ${c.vn.toFixed(0)} m/s: ${this.assist ? "tumbling, the wings open" : "stunned"}`); this.audio?.thud(true); }
        else if (c.vn > 1.5 || !this.assist) this.audio?.thud(false);
        if (this.assist && !c.land) this.assist.hT = null;
        f.contact = null;
      }
      if (inp.take("land")) { const q = this.perchInReach(); if (q) this.beginLanding(q); else this.say(this.assist ? "nowhere to land ahead (slower than 24 m/s, over a roof or the ground)" : "no perch in reach (ahead, < 28 m, under 24 m/s)"); }
      // brushing through leaves (the city's trees): said once per crown
      if (f.brush > 0.05 && (!this._brushT || this.t - this._brushT > 1.5)) { this.say("through the leaves"); this.audio?.leaves?.(); }
      if (f.brush > 0.05) this._brushT = this.t;
      this.score.maxSpeed = Math.max(this.score.maxSpeed, f.V);
      if (this.fun) this.strikeFun(dt, dtReal, inp, cam); else this.strike(dt, inp);
    }
    inp.take("strike"); if (this.fun) inp.take("sprint");
    if (this.fun && this.mode !== "fly") { this.fun.slowK = 1; this.fun.release(dt, f); }
    this.after(dt, dtReal, t0, this.mode === "perch" ? "perch" : this.mode === "land" ? "land" : "fly", this.perch?.yaw ?? 0);
  }

  /** the bird, the traces (both controllers): bm the bird's mode, py its yaw on the ground */
  after(dt, dtReal, t0, bm, py) {
    const f = this.f;
    // ---- the bird (size: the readable size in the air, life size near the perches and the ground)
    const fl = this.world.floorAt ? this.world.floorAt(f.pos.x, f.pos.z, f.pos.y) : this.world.floor(f.pos.x, f.pos.z), agl = f.pos.y - fl;
    const wantSpan = this.mode === "fly" ? this.size.life + (this.size.readable - this.size.life) * smooth(agl, 6, 30) : this.size.life;
    this.span += (wantSpan - this.span) * (1 - Math.exp(-2.5 * dtReal));
    this.bird.setSpan(this.span);
    if (this.gw && (f.mode === "ground" || f.mode === "hop")) this.pos.set(f.pos.x, f.feetY, f.pos.z);
    else this.pos.set(f.pos.x, f.pos.y, f.pos.z);
    // (round 3: with prey the feet stay down round it, the grip; falconBird.js holds it at the talons)
    // (the v2's own ground clips: walk / hop / launch; the current bird stands for walk / hop and flares for the launch;
    // strike: v2's Talons clip, the strike pose, in the last metres before contact and through the catch)
    const own = !!this.bird.groundClips, mode = own ? bm : bm === "walk" || bm === "hop" ? "perch" : bm === "launch" ? "land" : bm;
    this.bird.pose(dt, this.pos, f, { mode, talons: this.talonsOut ? 1 : this.fun && this.bird.prey ? 0.45 : 0, strike: this.strikeW(dtReal), perchYaw: py });
    // ---- traces
    this.traceT += dt;
    if (this.traceT >= 0.1) {
      this.traceT = 0;
      this.trace.push({ t: +this.t.toFixed(2), V: +f.V.toFixed(2), agl: +agl.toFixed(1), y: +f.pos.y.toFixed(1), sta: +f.stamina.toFixed(3), E: +(agl + f.V * f.V / (2 * G)).toFixed(1), lift: +f.lift.toFixed(2), vy: +f.vel.y.toFixed(2), n: +f.n.toFixed(2), fold: +f.fold.toFixed(2), mode: this.mode });
      if (this.trace.length > 6000) this.trace.shift();
    }
    this.agl = agl;
    this.cpu.game = this.cpu.game * 0.95 + (performance.now() - t0) * 0.05;
  }

  /** v2's strike pose (its Talons clip, gymBird.js): 0..1, in the last 14 m of a strike with the talons out, and held
   *  0.7 real s through the catch (the slow motion) */
  strikeW() {
    const W = this.window, F = this.fun;
    let k = 0;
    if (W && this.mode === "fly" && this.talonsOut && W.d < 14 && W.closing > 2) k = smooth(14 - W.d, 0, 8);
    if (F && F.banner?.kind === "caught" && F.realT - F.banner.t < 0.7) k = 1;
    return k;
  }

  /**
   * THE GYM CONTROLLER (?falconctl=gym, gymCity.js): the input to the gym's controls (gymFlight.js fillGymControls, as
   * the lab: Space = power and its press the take-off, Shift = the stoop, E = land / take off, the mouse aim a
   * direction), the fun's auto-dive aim as the gym's steering (its eased lead point; within the homing distance the bird
   * itself), the gym flight step, its modes as the game's (ground / hop = perch, land = land, launch / fly = fly), the
   * lock-on / catch as before. No allocation (the controls, the perch and the target objects are kept).
   */
  updateGym(dt, dtReal, cam, t0) {
    const f = this.f, inp = this.input, C = this.GC;
    inp.update(dt, f);
    if (inp.take("reset")) { this.reset?.(); }
    const I = inp.intent, R = inp.C;
    fillGymControls(C, I, R);
    const space = R.flap > 0.5;
    if (space && !this._spaceWas) C.jump = true;
    this._spaceWas = space;
    const ground = f.mode === "ground" || f.mode === "hop";
    if (inp.take("land")) { if (ground) C.jump = true; else if (f.mode === "fly") C.land = true; }
    inp.take("sprint");
    C.talons = inp.talons ? 1 : 0;
    const F = this.fun, P = this.pigeons;
    // ---- the auto-dive: the fun's aim (falconFun.js dive: the eased lead point, over the solids) flown by the gym
    if (F && f.mode === "fly") {
      this.funSteer(dt, inp);
      if (F.diving) {
        const O = F.ov, FI = F.I;
        C.aimYaw = O.psi; C.aimPitch = O.gamma;
        C.stoop = FI.stoop ? 1 : 0; C.half = FI.half ? 1 : 0;
        C.power = FI.climb || (!FI.stoop && f.V < FUN.chase) ? 1 : 0;
        // the homing (the last FUN.homeD m): straight at the bird (2 m over one sitting on a solid), the gym's own turn rates
        const i = this.target;
        if (i >= 0 && P && P.state[i] !== 3) {
          P.pos(i, this._v);
          const dx = this._v.x - f.pos.x, dz = this._v.z - f.pos.z, dy = (P.state[i] === 0 ? this._v.y + 1.2 : this._v.y) - f.pos.y, d = Math.hypot(dx, dy, dz);
          if (d < FUN.homeD) { C.aimYaw = Math.atan2(-dx, -dz); C.aimPitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -1.4, 0.8); }
        }
        // (the mouse aim follows, no jerk when the button is let go)
        if (inp.aim) { inp.aim.yaw = C.aimYaw; inp.aim.pitch = clamp(C.aimPitch, -1.45, 0.6); }
      }
    } else if (F) F.release(dt, f);
    // ---- the flight
    const t1 = performance.now();
    const was = this._gymMode;
    f.step(dt, C);
    this.cpu.flight = this.cpu.flight * 0.95 + (performance.now() - t1) * 0.05;
    // the gym's own messages (one-shots): the ones a player needs
    const E = f.events;
    for (let k = 0; k < E.length; k++) { const e = E[k]; if (e.kind === "tumble" || e.kind === "noland" || e.kind === "boxed" || e.kind === "hop" || e.kind === "land") this.say(e.s); }
    E.length = 0;
    // ---- the modes
    const gm = f.mode;
    this._gymMode = gm;
    if (gm === "ground" || gm === "hop") {
      const p = this._gp;
      p.pos.set(f.pos.x, f.feetY, f.pos.z); p.yaw = f.heading; p.roof = f.feetY > this.world.ground(f.pos.x, f.pos.z) + 1.5;
      if (was !== "ground" && was !== "hop") p.name = was === "land" && f._land ? f._land.q.name : p.roof ? "roof" : "ground";
      // (on a sill / railing the bird faces the street, the wall behind it: the perched camera looks at it from outside)
      p.camYaw = p.name === "sill" || p.name === "railing" ? f.heading + Math.PI : f.heading;
      this.mode = "perch"; this.perch = p; this.landing = null;
      // landed on the eyrie's ledge with prey: delivered
      if (was === "land" && this.bird.prey) { const q = this.perches.find((x) => x.eyrie); if (q && q.pos.distanceTo(p.pos) < 2) this.deliver(); }
      f.stamina = Math.min(1, f.stamina);
      // the POUNCE (as the current controller): standing within reach of the locked bird
      if (F && this.target >= 0 && P && P.state[this.target] !== 3) {
        P.pos(this.target, this._v);
        if (Math.hypot(this._v.x - f.pos.x, this._v.y - f.pos.y, this._v.z - f.pos.z) < FUN.reach + 1) this.funCatch(this.target, 0.5, flockOf(P, this.target)?.kindName(localOf(P, this.target)) ?? "");
      }
    } else {
      this.perch = null;
      this.mode = gm === "land" ? "land" : "fly";
    }
    if (this.mode === "fly") {
      this.score.maxSpeed = Math.max(this.score.maxSpeed, f.V);
      if (F) this.strikeFun(dt, dtReal, inp, cam); else this.strike(dt, inp);
    }
    inp.take("strike");
    if (F && this.mode !== "fly") { F.slowK = 1; F.release(dt, f); }
    const bm = gm === "ground" ? (Math.abs(f.walkV) > 0.08 ? "walk" : "perch") : gm === "hop" ? (f.hopT?.walk ? "walk" : "hop") : gm;
    this.after(dt, dtReal, t0, bm, f.heading);
  }

  /** (falcon fun) the strike button held with a lock = the auto-dive: the intent copy the assist flies (falconFun.js
   *  dive), else the player's own intent */
  funSteer(dt, inp) {
    const F = this.fun, f = this.f, P = this.pigeons, I0 = inp.intent, i = this.target;
    F.held = !!(inp.talons || (I0.stoop && i >= 0));
    if (F.held && i >= 0 && P && P.state[i] !== 3) P.pos(i, this._v);
    // (out of breath: no auto-dive UP at a bird; the wings cannot climb, the chase ended in the walls)
    const tiredUp = F.held && i >= 0 && f.stamina < FUN.tiredUp && this._v.y > f.pos.y - 2;
    if (tiredUp && !F.tiredSaid) { F.tiredSaid = true; this.say("out of breath: dive on one below, or rest a moment"); }
    if (!tiredUp) F.tiredSaid = false;
    if (F.held && i >= 0 && P && P.state[i] !== 3 && !tiredUp) {
      P.vel(i, this._w);
      const w = this.world, v = this._v;
      const fl = (x, z, y) => (w.column ? w.column(x, z, y).floor : w.floor(x, z));
      const floorY = F.floorY = fl(v.x, v.z, v.y + 0.5);
      // the line to the bird: the highest solid under it (10 samples, the last 3 m left out): the dive stays 3 m over
      // it (node checks: a low bird 60 m off behind a row of houses, or one flying in low beside a roof, drew the
      // falcon down into their walls)
      const hx = v.x - f.pos.x, hz = v.z - f.pos.z, hd = Math.hypot(hx, hz);
      let lineMax = -Infinity, lineD = 0;
      if (hd > 5) for (let k = 1; k <= 10; k++) {
        const s = k / 10 * (hd - 3) / hd, h = fl(f.pos.x + hx * s, f.pos.z + hz * s, f.pos.y);
        if (h > lineMax) { lineMax = h; lineD = s * hd; }
      }
      F.dive(dt, f, v, this._w, floorY, I0, P.state[i] === 0, lineMax, lineD, fl(f.pos.x, f.pos.z, f.pos.y));
      if (f.V > 11) f.noLand = Math.max(f.noLand, 0.1);         // (no touch-down in a fast auto-dive; a slow one may land)
      F.diving = true;
      return F.I;
    }
    F.release(dt, f);
    return I0;
  }

  /** (falcon fun) the lock-on, the automatic grab within FUN.reach, the bonus score, the slow motion before contact */
  strikeFun(dt, dtReal, inp, cam) {
    const f = this.f, P = this.pigeons, F = this.fun;
    if (!P) return;
    this.talonsOut = F.diving || !!this.window?.near;
    // (round 3 part B) a miss waiting FUN.miss.hold s: said (the banner) only if no catch came meanwhile
    const MP = F.missPend;
    if (MP && this.t - MP.t >= FUN.miss.hold) {
      F.missPend = null; F.misses++; this.score.misses++;
      F.lastMiss = { t: this.t, dodged: MP.dodged, d: MP.d, i: MP.i, closing: MP.closing, angle: MP.angle };
      F.banner = { kind: MP.dodged ? "dodged" : "missed", t: F.realT, gt: this.t };
    }
    const vd = F.viewDir(cam && cam.getWorldDirection ? cam.getWorldDirection(this._cam) : null, f, inp.intent.aim);
    let i = this.target;
    if (i >= 0 && P.state[i] === 3) i = -1;
    // (after a catch: FUN.cool s with the prey in the talons before the next lock: one bird at a time)
    if (F.cool > 0) { F.cool -= dt; this.target = -1; F.lock = -1; this.window = null; F.slowK = 1; F.arrowTick(dt, P, f); return; }
    // (round 2) the FIRST CATCH is the tame pigeon: while it is uncaught it holds the lock within 150 m, or in range and
    // within 70 deg of the view (the hint says "the pigeon on the roof below": the ring must be on that one)
    const si = F.starter ? (P === F.starter.flock ? F.starter.i : P.index ? P.index(F.starter.flock, F.starter.i) : -1) : -1;
    if (si >= 0 && P.state[si] !== 3) {
      P.pos(si, this._v);
      const dx = this._v.x - f.pos.x, dy = this._v.y - f.pos.y, dz = this._v.z - f.pos.z, d = Math.hypot(dx, dy, dz);
      // (within 150 m: whatever the view; browser check: at the hand-over from the nest intro the view still looked
      // along the ledge and a church pigeon 5 m off took the lock)
      if (d < 150 || (d < FUN.lockRange * 1.3 && (dx * vd.x + dy * vd.y + dz * vd.z) / Math.max(d, 0.1) > Math.cos(1.2))) { i = si; this.lockTarget = true; }
      else if (i === si) this.lockTarget = false;
    } else if (F.starter) { F.starter = null; this.lockTarget = false; }
    if (i >= 0 && !this.lockTarget) {
      P.pos(i, this._v);
      const dx = this._v.x - f.pos.x, dy = this._v.y - f.pos.y, dz = this._v.z - f.pos.z, d = Math.hypot(dx, dy, dz);
      const c = (dx * vd.x + dy * vd.y + dz * vd.z) / Math.max(d, 0.1);
      // kept while it stays near the view centre (a wide cone), and always while the button is held (in range)
      if (d > FUN.lockRange * 1.25 || (!F.held && c < Math.cos(FUN.keepCone))) i = -1;
    }
    if (i < 0) this.lockTarget = false;
    if (i < 0) i = P.target(f.pos.x, f.pos.y, f.pos.z, vd.x, vd.y, vd.z, FUN.lockRange, FUN.lockCone, true);
    // (round 3) nothing near the view centre: a bird CROSSING close by (within 60 m, a wide cone) takes the lock; round
    // 2's 0.5 rad cone let a pigeon fly past the falcon's shoulder unlocked
    if (i < 0) i = P.target(f.pos.x, f.pos.y, f.pos.z, vd.x, vd.y, vd.z, FUN.near.d, FUN.near.cone, true);
    if (F.skipFlock && this.t > F.skipUntil) { F.skipFlock.skipI = -1; F.skipFlock = null; }
    if (i !== this.target) { F.slowUsed = 0; F.bestD = Infinity; F.bestT = this.t; F.passD = Infinity; }
    this.target = i; F.lock = i;
    this.window = null;
    F.arrowTick(dt, P, f);
    const line = F.runTick(this.t, false);
    if (line) this.say(line);
    let slowWant = 1;
    if (i >= 0) {
      P.pos(i, this._v); P.vel(i, this._w);
      const vx = f.vel.x, vy = f.vel.y, vz = f.vel.z;
      const dx = this._v.x - f.pos.x, dy = this._v.y - f.pos.y, dz = this._v.z - f.pos.z, d = Math.max(Math.hypot(dx, dy, dz), 1e-3);
      const rvx = vx - this._w.x, rvy = vy - this._w.y, rvz = vz - this._w.z;
      const closing = (rvx * dx + rvy * dy + rvz * dz) / d;
      const angle = Math.acos(clamp((vx * dx + vy * dy + vz * dz) / (d * Math.max(f.V, 0.1)), -1, 1));
      const reach = FUN.reach, tti = closing > 0 ? d / closing : Infinity;
      const W = (this._win ??= {});
      W.i = i; W.d = d; W.closing = closing; W.angle = angle; W.ok = true; W.near = d < 12; W.reach = reach; W.tti = tti; W.lock = true;
      const Fl = flockOf(P, i), li = localOf(P, i);           // (the mux's pigeons: their flock, their index there)
      W.tele = Fl ? Fl.tele[li] > 0 : false; W.kind = Fl ? Fl.kindName(li) : "";
      this.window = W;
      // held on and not getting closer for FUN.giveUp s (a bird climbing / racing away): let it go, skip it a while
      if (!F.held || d < F.bestD - 0.5) { F.bestD = Math.min(F.bestD, d); F.bestT = this.t; }
      else if (this.t - F.bestT > FUN.giveUp && Fl) {
        Fl.skipI = li; F.skipFlock = Fl; F.skipUntil = this.t + 8;
        this.target = -1; this.window = null; F.lock = -1;
        this.say("it got away: try another one (the arrow)");
        return;
      }
      // the grab: within reach this frame or crossing it (fast birds pass the target between frames)
      const tca = clamp((dx * rvx + dy * rvy + dz * rvz) / Math.max(rvx * rvx + rvy * rvy + rvz * rvz, 1e-3), 0, dt * 1.5);
      // (a bird sitting on a roof / the setts, the falcon passing over it: the talons reach DOWN, the height counts 0.6;
      // browser check: the roof round the tame pigeon kept the swoop ~8 m over it and the falcon circled it)
      const kv = P.state[i] === 0 && dy - rvy * tca < 0 ? 0.6 : 1;
      const mx = dx - rvx * tca, my = (dy - rvy * tca) * kv, mz = dz - rvz * tca, dmin = Math.hypot(mx, my, mz);
      if (dmin < reach) { this.funCatch(i, angle, W.kind); F.slowK = 1; return; }
      // (round 3) a MISS reads: a pass within FUN.miss.pass m, then away without the catch: "DODGED!" / "MISSED"
      // (round 3 part B) a PASS is over only when the falcon went BY the bird: it is behind the falcon (> 90 deg off the
      // path) and the gap opens, and the falcon was not held off it by the avoid at the closest point (browser: the avoid
      // kept the falcon 8-20 m off the tame pigeon in the trees, d dipped under 12 m and out again: "MISSED" while it
      // circled, then "CAUGHT"); the miss waits FUN.miss.hold s and a catch cancels it; the banner says it (no line)
      if (F.diving && d < F.passD) { F.passD = d; F.passAvoid = this.assist?.avoiding ?? 0; }
      if (F.passD < FUN.miss.pass && d > F.passD + FUN.miss.away) {
        if (closing < 0 && angle > Math.PI / 2 && F.passAvoid < FUN.miss.avoid && !F.missPend) {
          const dodged = !!(Fl && (Fl.dodgeCD?.[li] > 0 || Fl.tele[li] > 0));
          F.missPend = { t: this.t, dodged, d: F.passD, i, closing, angle };
        }
        F.passD = Infinity;
      }
      // (the homing: funHome(), before the flight step)
      if (closing > 5 && tti < FUN.slow.tti && d < reach * 4 && F.slowUsed < FUN.slow.max) { slowWant = FUN.slow.scale; F.slowUsed += dtReal; }
    }
    F.slowK += (slowWant - F.slowK) * (1 - Math.exp(-25 * dtReal));
    if (slowWant === 1 && F.slowK > 0.98) F.slowK = 1;
  }
  /** (falcon fun) the last metres of an auto-dive: the HOMING. (round 3) Run just before the flight step (the step then
   *  integrates the turned path the same frame) */
  funHome(dt) {
    const f = this.f, P = this.pigeons, F = this.fun, i = this.target;
    if (!P || i < 0 || P.state[i] === 3) { F.homeW = 0; F.homeR = 0; return; }
    P.pos(i, this._v); P.vel(i, this._w);
    const vx = f.vel.x, vy = f.vel.y, vz = f.vel.z;
    const dx = this._v.x - f.pos.x, dy = this._v.y - f.pos.y, dz = this._v.z - f.pos.z, d = Math.max(Math.hypot(dx, dy, dz), 1e-3);
    const closing = ((vx - this._w.x) * dx + (vy - this._w.y) * dy + (vz - this._w.z) * dz) / d, tti = closing > 0 ? d / closing : Infinity;
    const angle = Math.acos(clamp((vx * dx + vy * dy + vz * dz) / (d * Math.max(f.V, 0.1)), -1, 1));
    // the last metres of an auto-dive: the HOMING (the talons swing onto it): the path turned toward a point 2 m over
    // the bird (2.5 m over the solid under it, its velocity's lead) at up to FUN.home rad/s, the speed kept: no
    // endless orbit round a bird that turns tighter than the falcon
    // (round 3) its weight EASED (0.1 s): the ground guard / the avoid flickering on and off frame by frame switched the
    // homing with them, and the heading's rate jumped every other frame (node check: 0.8 / 0.02 rad/s alternating)
    const homeOK = F.diving && d < FUN.homeD && angle < 1.5 && !(this.assist && (this.assist.avoiding > 0.3 || this.assist.guard));
    F.homeW = (F.homeW ?? 0) + ((homeOK ? 1 : 0) - (F.homeW ?? 0)) * (1 - Math.exp(-dt / 0.1));
    if (F.diving && d < FUN.homeD && angle < 1.5 && F.homeW > 0.02) {
      // (round 3) the path's own speed |vel| (round 2 divided the ground velocity by the AIRSPEED f.V, taken at the start of
      // the last substep: |u| > 1 every other frame, the cosine clamped to 1, the angle read 0 and the homing skipped that
      // frame; the heading's rate alternated 0.8 / 0.02 rad/s in the last metres: the judder at the strike)
      const lt = Math.min(tti, 0.5), V = Math.max(Math.hypot(vx, vy, vz), 0.5);
      let ax = this._v.x + this._w.x * lt - f.pos.x, az = this._v.z + this._w.z * lt - f.pos.z;
      let ay = Math.max(this._v.y + 2, F.floorY + 2.5) - f.pos.y;
      // (low over a solid: the homing never points down)
      const w = this.world, under = w.column ? w.column(f.pos.x, f.pos.z, f.pos.y).floor : w.floor(f.pos.x, f.pos.z);
      if (f.pos.y - under < 5 && ay < 0) ay = 0;
      const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
      // (a solid on the way, 3 / 7 m along it, at the falcon's height: no homing: the avoid flies; node check: the
      // homing turned the falcon into a tower a pigeon flew round)
      let clear = true;
      for (let k = 3; k <= 7 && clear; k += 4) { const px = f.pos.x + ax * k, pz = f.pos.z + az * k, py = f.pos.y + ay * k; if ((w.column ? w.column(px, pz, py).floor : w.floor(px, pz)) > py - 1) clear = false; }
      if (!clear) { ax = NaN; F.homeW = 0; F.homeR = 0; }
      const ux = vx / V, uy = vy / V, uz = vz / V, c = clamp(ux * ax + uy * ay + uz * az, -1, 1), ang = Math.acos(c);
      if (ang > 1e-3 && ang === ang) {
        // (round 3) the turn RATE eased (0.06 s) toward a first-order pull onto the aim (0.08 s), coming in over the first
        // 4 m: round 2 turned at the full 2.4 rad/s until aligned, then stopped dead (the heading's rate fell 2.4 -> 0 in one
        // frame, node check: spikes of 130-160 rad/s^2)
        const want = Math.min(ang * (1 - Math.exp(-dt / 0.08)), FUN.home * dt * smooth(FUN.homeD - d, 0, 4) * F.homeW) / dt;
        F.homeR = (F.homeR ?? 0) + (want - (F.homeR ?? 0)) * (1 - Math.exp(-dt / 0.06));
        const turn = Math.min(ang, F.homeR * dt), sn = Math.sin(ang), a = Math.sin(ang - turn) / sn, b = Math.sin(turn) / sn;
        f.vel.x = (ux * a + ax * b) * V; f.vel.y = (uy * a + ay * b) * V; f.vel.z = (uz * a + az * b) * V;
      }
    } else F.homeR = 0;                                     // (out of the homing: its rate starts from 0 next time)
  }
  funCatch(i, angle, kind) {
    const f = this.f, P = this.pigeons, F = this.fun;
    const li = localOf(P, i), starter = F.starter && F.starter.i === li && flockOf(P, i) === F.starter.flock;
    // the birds round it see it go: they flush (a ground flock is not mown down one by one)
    flockOf(P, i)?.spread(li, 14);
    // (round 3) where the pigeon was: the grip blends it from there into the talons (no snap), the feathers burst there
    P.pos(i, this._v); P.vel(i, this._w);
    const C0 = (this._catchP ??= { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, n: 0 });
    C0.x = this._v.x; C0.y = this._v.y; C0.z = this._v.z; C0.vx = this._w.x; C0.vy = this._w.y; C0.vz = this._w.z; C0.n++;
    // (round 3 part B) how the caught bird is drawn (its species, plumage, size): the held bird is that one (heldPrey.js)
    const look = P.heldLook ? P.heldLook(i, (this._look ??= {})) : null;
    C0.look = look;
    P.take(i);
    F.cool = FUN.cool;
    this.bird.carry(this.fam?.preyMesh, this.fam?.nestMat, C0, look);
    if (!f.extraMass) f.extraMass = FUN.carryMass;
    f.stamina = Math.min(1, f.stamina + FUN.catchStamina);    // (a catch gives breath back: the hunt goes on)
    const v = f.V;
    let pts = F.score(v, f.gamma, angle, kind, this.t);
    const run = F.runTick(this.t, true);
    if (run.startsWith("RUN COMPLETE")) pts += FUN.run.bonus;
    const sc = this.score;
    sc.catches++; sc.bestStrike = Math.max(sc.bestStrike, Math.round(v)); sc.lastStrike = Math.round(v); sc.points += pts; sc.carriedSince = this.t;
    F.last.pts = pts;
    // (round 3 part B) the banner says it (hunt.js caught: CAUGHT!, the kind, km/h, the points, the bonus labels): no
    // duplicate line under it; a miss still waiting is cancelled (never MISSED and CAUGHT for one pass)
    if (F.missPend) { F.missPend = null; F.missCancel++; }
    F.banner = { kind: "caught", t: F.realT, gt: this.t };
    if (run) this.say(run);
    // (round 3: a short punch; the slow motion and the strike camera follow in real time, hunt.js caught())
    this.hitStop = FUN.strike.punch; this.audio?.strike(true); this.audio?.rustle?.();
    this.target = -1; this.window = null; F.lock = -1; F.passD = Infinity; F.strikes++; F.lastCaughtI = i;
    this.lastCatch = { t: this.t, V: v, x: f.pos.x, y: f.pos.y, z: f.pos.z, pts, labels: F.last.labels, prey: C0 };
    if (starter) { F.starter = null; F.hint = ""; F.firstWasTame = true; this.lockTarget = false; }
  }

  /** the strike: target, catch window, catch / miss */
  strike(dt, inp) {
    const f = this.f, P = this.pigeons;
    if (!P) return;
    if (inp.take("strike") || inp.talons) this.talonsT = 0.45;
    this.talonsT -= dt;
    this.talonsOut = this.talonsT > 0 || f.V > 30 && this.window?.near;
    const vx = f.vel.x, vy = f.vel.y, vz = f.vel.z;
    // keep a target while it stays ahead, else pick a new one
    let i = this.target;
    if (i >= 0 && P.state[i] === 3) i = -1;
    if (i >= 0 && !this.lockTarget) { P.pos(i, this._v); const dx = this._v.x - f.pos.x, dy = this._v.y - f.pos.y, dz = this._v.z - f.pos.z, d = Math.hypot(dx, dy, dz); if (d > 200 || (dx * vx + dy * vy + dz * vz) / (d * Math.max(f.V, 1)) < 0.2) i = -1; }
    if (i < 0) this.lockTarget = false;
    if (i < 0) i = P.target(f.pos.x, f.pos.y, f.pos.z, vx, vy, vz, 180, 0.45);
    this.target = i;
    this.window = null;
    if (i < 0) return;
    P.pos(i, this._v); P.vel(i, this._w);
    const dx = this._v.x - f.pos.x, dy = this._v.y - f.pos.y, dz = this._v.z - f.pos.z, d = Math.hypot(dx, dy, dz);
    const rvx = vx - this._w.x, rvy = vy - this._w.y, rvz = vz - this._w.z;
    const closing = (rvx * dx + rvy * dy + rvz * dz) / d;
    const angle = Math.acos(clamp((vx * dx + vy * dy + vz * dz) / (d * Math.max(f.V, 0.1)), -1, 1));
    const reach = 0.8 + 0.6 * this.span;                   // the strike's reach (m): the talons + the drawn size's slack
    const ok = closing > 8 && angle < 0.61;
    this.window = { i, d, closing, angle, ok, near: d < 12, reach, tti: closing > 0 ? d / closing : Infinity };
    // the catch: within reach this frame or crossing it (fast birds pass the target between frames)
    const tca = clamp((dx * rvx + dy * rvy + dz * rvz) / Math.max(rvx * rvx + rvy * rvy + rvz * rvz, 1e-3), 0, dt * 1.5);
    const mx = dx - rvx * tca, my = dy - rvy * tca, mz = dz - rvz * tca, dmin = Math.hypot(mx, my, mz);
    if (dmin < reach) {
      if (ok && this.talonsOut) {
        P.take(i);
        this.bird.carry(this.fam?.preyMesh, this.fam?.nestMat);
        f.extraMass = 0.33;
        const v = Math.round(f.V);
        this.score.catches++; this.score.bestStrike = Math.max(this.score.bestStrike, v); this.score.lastStrike = v; this.score.points += v; this.score.carriedSince = this.t;
        this.say(`CAUGHT at ${v} m/s (${Math.round(v * 3.6)} km/h), approach ${(angle * 57.3).toFixed(0)} deg: take it to the eyrie`);
        this.hitStop = 0.35; this.audio?.strike(true);
        this.target = -1; this.lastCatch = { t: this.t, V: f.V, x: f.pos.x, y: f.pos.y, z: f.pos.z };
      } else if (!this._missT || this.t - this._missT > 1) {
        this._missT = this.t; this.score.misses++;
        this.say(`missed: ${!this.talonsOut ? "talons not out (F)" : closing <= 8 ? `too slow (closing ${closing.toFixed(0)} m/s): it jinked away` : `bad angle (${(angle * 57.3).toFixed(0)} deg)`}`);
      }
    }
  }
}
