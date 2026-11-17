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
// Traces: every 0.1 s, time / airspeed / height above the floor / altitude / stamina / specific energy (h + V^2/2g) /
// the air's vertical speed / mode, for the lab's graph and the verification records.
import * as THREE from "three/webgpu";
import { FalconFlight, FlightControls, G } from "./flightModel.js";
import { FlightAssist } from "./flightAssist.js";
import { CTL_OLD } from "./falconInput.js";
/** ?falconcol=old also keeps round 1's take-off (a drop forward from the perch's own height: from the ground or a flat
 *  roof it touched down again at once) */
const COL_OLD = typeof location !== "undefined" && /[?&]falcon(col|hit)=old(&|$)/.test(location.search);

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class FalconGame {
  constructor({ world, air, bird, pigeons, fam, audio = null, input }) {
    Object.assign(this, { world, air, bird, pigeons, fam, audio, input });
    this.f = new FalconFlight();
    // the flight assist (falconfix: the player says where, the assist flies; ?falconctl=old = the raw controls)
    this.assist = CTL_OLD ? null : new FlightAssist();
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

  /** free flight from a point (heading rad, speed m/s, path angle rad) */
  start(x, y, z, heading, speed = 14, gamma = 0) {
    this.f.launch(x, y, z, heading, speed, gamma, this.air);
    this.mode = "fly"; this.perch = null; this.landing = null;
    this.input.syncAim(heading, gamma);
    this.assist?.reset();
  }
  perchOn(p) {
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

  update(dtReal, cam) {
    const t0 = performance.now();
    // the hit-stop after a catch (the game-feel pause), slow motion option
    let dt = dtReal * this.timeScale;
    if (this.hitStop > 0) { this.hitStop -= dtReal; dt *= 0.15; }
    this.t += dt;
    const f = this.f, inp = this.input;
    const C = inp.update(dt, f);
    if (inp.take("reset")) { this.reset?.(); }
    // ---- modes
    if (this.mode === "perch") {
      f.stamina = Math.min(1, f.stamina + f.P.stamina.perchRegen * dt);
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
        const ov = this.t - this.steerT < 0.1 ? this._ov : null;
        if (ov) { ov.psi = f.heading; ov.gamma = f.gamma; }
        this.assist.override = ov;
        const W = this.window; this.assist.chase = !!(W && W.i >= 0 && W.d < 90 && W.angle < 0.6 && !this.bird.prey);
        this.assist.apply(dt, f, inp.intent, C, this.world);
      }
      if (this.takeoffT > 0) { this.takeoffT -= dt; C.flap = 1; C.pitch = Math.max(C.pitch, 0.3); C.fold = 0; }
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
      this.strike(dt, inp);
    }
    inp.take("strike");
    // ---- the bird (size: the readable size in the air, life size near the perches and the ground)
    const fl = this.world.floorAt ? this.world.floorAt(f.pos.x, f.pos.z, f.pos.y) : this.world.floor(f.pos.x, f.pos.z), agl = f.pos.y - fl;
    const wantSpan = this.mode === "fly" ? this.size.life + (this.size.readable - this.size.life) * smooth(agl, 6, 30) : this.size.life;
    this.span += (wantSpan - this.span) * (1 - Math.exp(-2.5 * dtReal));
    this.bird.setSpan(this.span);
    this.pos.set(f.pos.x, f.pos.y, f.pos.z);
    this.bird.pose(dt, this.pos, f, { mode: this.mode === "perch" ? "perch" : this.mode === "land" ? "land" : "fly", talons: this.talonsOut ? 1 : 0, perchYaw: this.perch?.yaw ?? 0 });
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
