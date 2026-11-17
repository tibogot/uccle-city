// THE CHASE CAMERA for the car (Car Lab and drive mode). (The car's views since police feel round 2: CAR_CAM below,
// chase / far / bonnet / bumper; the list here is the round-1 camera, ?carfeel=old, and the two-wheelers'.) C cycles:
//   chase   behind and above, swings round after the direction of travel (not the nose: a slide shows the car's flank)
//   far     the same, further back and higher
//   bumper  low on the front bumper, looking ahead
//   orbit   free: drag to look round the car (any view: drag to look, it eases back when released)
// The boom is spring-smoothed (critically damped) so impacts and kerbs don't shake the picture, it never goes
// under the ground, and (with insideWall) it pulls in toward the car rather than ending up inside a building.
// Idea after game-engine-v1 games/modular-road-v3/chaseCamera.js (read-only reference): aim AT the car and keep the
// horizon level, place the boom separately.
import * as THREE from "three/webgpu";
import { createCtlCam, stepCtlCam } from "./carCtlCam.js";

/** ?carfeel=old: the camera before the police-feel round; now (FEEL_CAM) the view widens with speed (fov), the boom
 *  stretches on the throttle / shortens under braking, and the horizon leans a little with the cornering */
const FEEL_OLD = typeof location !== "undefined" && /[?&]carfeel=old(&|$)/.test(location.search);
/** ?carctl=old: the police-feel camera (updateCar) instead of the calm one (carCtlCam.js, docs/CARCTL.md) */
const CTL_OLD = typeof location !== "undefined" && /[?&]carctl=old(&|$)/.test(location.search);
export const FEEL_CAM = { fovPerMs: 0.32, fovFrom: 8, fovMax: 11, stretch: 0.07, stretchMax: 0.6, lean: 0.0032, leanMax: 0.055, ease: 3 };
/**
 * THE CAR CAMERA, round 2 (owner 2026-11-17: "the car goes too far from the camera, almost in the centre of the screen,
 * hard to drive, not like a real car game"). Measured on round 1: the boom was a critically damped spring on the WORLD
 * position (stiffness 7): it trails a moving car by 2 v / w (4.3 m extra at 54 km/h), plus v * 0.04 of pull-back, and it
 * aimed AT the car's centre (the car mid-screen). Forza Horizon / GTA V / NFS framing: the camera rides rigidly with the
 * car at a fixed boom (~6 m, ~2 m up), only its swing (azimuth) and height are eased, it aims at a point AHEAD of the car
 * so the car sits in the lower third, and speed shows by a small pull-back (< 1 m) and a few degrees of fov.
 * Views (C cycles): chase (close), far, bonnet, bumper. ?carfeel=old = the round-1 camera.
 */
export const CAR_CAM = {
  chase: { dist: 6.0, height: 2.0, aimAhead: 5.5, aimHeight: 1.15 },
  far: { dist: 8.6, height: 2.9, aimAhead: 6.5, aimHeight: 1.3 },
  swing: 7,           // 1/s: the boom's azimuth toward the travel direction (stiff: little lag)
  heightEase: 9,      // 1/s: the boom's height (slopes, kerbs: no bounce)
  pullBack: 0.025, pullBackMax: 0.8,   // m per m/s of speed, at most
  brakeIn: 0.03, brakeInMax: 0.3,      // the boom shortens a little under braking / lengthens on the throttle
  fovPerMs: 0.22, fovFrom: 8, fovMax: 7,
  turnLead: 0.35,     // s of yaw rate the aim point leads by in a turn (look into the bend)
  lean: 0.0025, leanMax: 0.04,
};
const FEEL_MODES = ["chase", "far", "bonnet", "bumper"];
export const CAMERA = { mode: "chase", distance: 6.4, height: 2.1, lookHeight: 1.0, fov: 60, stiffness: 7, lookAhead: 0.25 };
const MODES = ["chase", "far", "bumper", "orbit"];

export class ChaseCamera {
  /** cfg: the view's numbers (default CAMERA: the car's; the motorbike passes its own, viewer/moto/motoCamera.js) */
  constructor(camera, dom, cfg = CAMERA) {
    Object.assign(this, { camera, dom, cfg });
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.look = new THREE.Vector3();
    this._t = new THREE.Vector3(); this._w = new THREE.Vector3(); this._a = new THREE.Vector3();   // (no per-frame allocations)
    this.yaw = 0;                 // boom azimuth (follows the travel direction)
    this.drag = { yaw: 0, pitch: 0, held: false };
    this.first = true;
    this.ctl = !CTL_OLD && !FEEL_OLD;   // (the car only: the calm camera; tests flip it)
    this.ctlCam = createCtlCam();
    let last = null;
    dom.addEventListener("pointerdown", (e) => { if (!this.active) return; last = [e.clientX, e.clientY]; this.drag.held = true; });
    addEventListener("pointerup", () => { last = null; this.drag.held = false; });
    addEventListener("pointermove", (e) => {
      if (!last) return;
      this.drag.yaw -= (e.clientX - last[0]) * 0.006;
      this.drag.pitch = Math.max(-0.35, Math.min(1.1, this.drag.pitch + (e.clientY - last[1]) * 0.004));
      last = [e.clientX, e.clientY];
    });
    dom.addEventListener("wheel", (e) => {
      if (!this.active) return;
      if (!FEEL_OLD && this.cfg === CAMERA) { this.zoom = Math.max(0.75, Math.min(3, (this.zoom ?? 1) * (1 + Math.sign(e.deltaY) * 0.08))); return; }
      this.cfg.distance = Math.max(3.5, Math.min(25, this.cfg.distance * (1 + Math.sign(e.deltaY) * 0.08)));
    }, { passive: true });
  }
  get mode() { return this.cfg.mode; }
  next() {
    const L = !FEEL_OLD && this.cfg === CAMERA ? FEEL_MODES : MODES;
    this.cfg.mode = L[(L.indexOf(this.cfg.mode) + 1) % L.length]; this.first = true; return this.cfg.mode;
  }
  reset() { this.first = true; this.ctlCam.first = true; this.drag.yaw = 0; this.drag.pitch = 0; }

  /** c: carPhysics state; ground(x, z); insideWall(x, z) optional */
  update(c, dt, ground, insideWall = null) {
    if (this.ctl && this.cfg === CAMERA) return this.updateCtl(c, dt, ground, insideWall);
    if (!FEEL_OLD && this.cfg === CAMERA) return this.updateCar(c, dt, ground, insideWall);
    const cam = this.camera;
    const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    const vx = sinH * c.speed + c.vx, vz = cosH * c.speed + c.vz, v = Math.hypot(vx, vz);
    // (police feel) speed in the view: fov, boom stretch, lean, all eased
    const F = FEEL_CAM, fe = FEEL_OLD || this.cfg !== CAMERA ? 0 : 1,   // (the car only: the two-wheelers have their own camera numbers)
      ke = 1 - Math.exp(-F.ease * dt);
    if (this.first) { this.fovX = 0; this.stretch = 0; this.lean = 0; }
    this.fovX += (fe * Math.min(F.fovMax, Math.max(0, v - F.fovFrom) * F.fovPerMs) - this.fovX) * ke;
    this.stretch += (fe * Math.max(-F.stretchMax, Math.min(F.stretchMax, (c.accel || 0) * F.stretch)) - this.stretch) * ke;
    this.lean += (fe * Math.max(-F.leanMax, Math.min(F.leanMax, -(c.angularVel || 0) * v * F.lean)) - this.lean) * ke;
    const fov = this.cfg.fov + (this.cfg.mode === "bumper" ? this.fovX * 0.5 : this.fovX);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (!this.drag.held && this.cfg.mode !== "orbit") { this.drag.yaw *= Math.exp(-2.5 * dt); this.drag.pitch *= Math.exp(-2.5 * dt); }
    if (this.cfg.mode === "bumper") {
      const y = c.y + 0.55;
      cam.position.set(c.x + sinH * 2.25, y, c.z + cosH * 2.25);
      this.look.set(c.x + sinH * 20, y - 0.4 + Math.sin(c.slopePitch) * 18, c.z + cosH * 20);
      cam.up.set(0, 1, 0);
      cam.lookAt(this.look);
      this.first = true;
      return;
    }
    // the boom's azimuth: after the velocity when moving forward, else the nose (reversing keeps it behind)
    const travel = v > 3 && c.speed > 0 ? Math.atan2(vx, vz) : c.heading;
    if (this.first) this.yaw = c.heading;
    let d = travel - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-(this.cfg.mode === "orbit" ? 0 : 4.5) * dt));
    const far = this.cfg.mode === "far";
    const dist = this.cfg.distance * (far ? 1.6 : 1) + Math.min(2.5, v * 0.04) + this.stretch, h = this.cfg.height * (far ? 1.8 : 1);
    const az = this.yaw + this.drag.yaw, el = Math.atan2(h, dist) + this.drag.pitch;
    const R = Math.hypot(h, dist);
    const target = this._t.set(c.x, c.y + this.cfg.lookHeight, c.z);
    const want = this._w.set(c.x - Math.sin(az) * Math.cos(el) * R, c.y + this.cfg.lookHeight + Math.sin(el) * R - this.cfg.lookHeight * 0.5, c.z - Math.cos(az) * Math.cos(el) * R);
    // keep out of buildings: pull the boom in until the point is clear
    if (insideWall) {
      for (let k = 0; k < 6 && insideWall(want.x, want.z); k++) want.lerp(target, 0.3);
    }
    want.y = Math.max(want.y, ground(want.x, want.z) + 0.6);
    if (this.first) { this.pos.copy(want); this.vel.set(0, 0, 0); this.first = false; }
    // critically damped spring toward the wanted point
    const w = this.cfg.stiffness, a = this._a.subVectors(want, this.pos).multiplyScalar(w * w).addScaledVector(this.vel, -2 * w);
    this.vel.addScaledVector(a, dt);
    this.pos.addScaledVector(this.vel, dt);
    // never fall behind by more than the boom (a teleport, a big hit)
    if (this.pos.distanceTo(want) > R * 1.5) this.pos.copy(want);
    this.pos.y = Math.max(this.pos.y, ground(this.pos.x, this.pos.z) + 0.5);
    cam.position.copy(this.pos);
    this.look.set(c.x + vx * this.cfg.lookAhead * 0.3, c.y + this.cfg.lookHeight, c.z + vz * this.cfg.lookAhead * 0.3);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.look);
    if (this.lean) cam.rotateZ(this.lean);
  }

  /** the calm car views (carCtlCam.js): the boom on the road (not the body), heading spring, no lean */
  updateCtl(c, dt, ground, insideWall) {
    const cam = this.camera, st = this.ctlCam, mode = this.cfg.mode;
    if (this.first) { st.first = true; this.zoom ??= 1; this.first = false; }
    if (!this.drag.held) { this.drag.yaw *= Math.exp(-2.5 * dt); this.drag.pitch *= Math.exp(-2.5 * dt); }
    stepCtlCam(st, c, dt, mode, ground, insideWall, this.drag, this.zoom ?? 1);
    if (Math.abs(cam.fov - st.fov) > 0.01) { cam.fov = st.fov; cam.updateProjectionMatrix(); }
    cam.up.set(0, 1, 0);
    this.pos.set(st.pos.x, st.pos.y, st.pos.z);
    cam.position.copy(this.pos);
    this.look.set(st.look.x, st.look.y, st.look.z);
    cam.lookAt(this.look);
  }

  /** the car views (CAR_CAM): rigid boom, eased swing / height, aim ahead, small speed cues */
  updateCar(c, dt, ground, insideWall) {
    const cam = this.camera, K = CAR_CAM, mode = this.cfg.mode;
    const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    const vx = sinH * c.speed + c.vx, vz = cosH * c.speed + c.vz, v = Math.hypot(vx, vz);
    const ke = 1 - Math.exp(-3 * dt);
    if (this.first) { this.fovX = 0; this.stretch = 0; this.lean = 0; this.zoom ??= 1; }
    this.fovX += (Math.min(K.fovMax, Math.max(0, v - K.fovFrom) * K.fovPerMs) - this.fovX) * ke;
    const fov = this.cfg.fov + this.fovX;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (!this.drag.held) { this.drag.yaw *= Math.exp(-2.5 * dt); this.drag.pitch *= Math.exp(-2.5 * dt); }
    cam.up.set(0, 1, 0);
    if (mode === "bumper" || mode === "bonnet") {
      // on the car: rigid, with the body's pitch (a kerb nods the view a little)
      const bon = mode === "bonnet", ahead = bon ? 0.9 : 2.3, y = c.y + (bon ? 1.32 : 0.55);
      cam.position.set(c.x + sinH * ahead, y + Math.sin(c.slopePitch) * ahead, c.z + cosH * ahead);
      const L = 25, ay = this.drag.yaw, s2 = Math.sin(c.heading + ay), c2 = Math.cos(c.heading + ay);
      this.look.set(cam.position.x + s2 * L, y - (bon ? 1.1 : 0.4) + Math.sin(c.slopePitch) * L, cam.position.z + c2 * L);
      cam.lookAt(this.look);
      this.first = true;
      return;
    }
    const V = mode === "far" ? K.far : K.chase;
    // the swing: after the velocity when driving forward (a slide shows the flank), the nose otherwise
    const travel = v > 3 && c.speed > 0 ? Math.atan2(vx, vz) : c.heading;
    if (this.first) { this.yaw = c.heading; this.camY = null; }
    let d = travel - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-K.swing * dt));
    // speed pull-back (eased) + a little in / out with the pedals
    const pull = Math.min(K.pullBackMax, v * K.pullBack) + Math.max(-K.brakeInMax, Math.min(K.brakeInMax, (c.accel || 0) * K.brakeIn));
    this.stretch += (pull - this.stretch) * ke;
    this.lean += (Math.max(-K.leanMax, Math.min(K.leanMax, -(c.angularVel || 0) * v * K.lean)) - this.lean) * ke;
    const dist = (V.dist + this.stretch) * this.zoom, az = this.yaw + this.drag.yaw;
    const hgt = V.height * Math.sqrt(this.zoom) + this.drag.pitch * dist * 0.8;
    const want = this._w.set(c.x - Math.sin(az) * dist, 0, c.z - Math.cos(az) * dist);
    // never inside a wall or a trunk: pull the boom in along itself until the point is clear
    if (insideWall) {
      const ox = want.x - c.x, oz = want.z - c.z;
      let f = 1;
      for (let k = 0; k < 8 && insideWall(c.x + ox * f, c.z + oz * f); k++) f *= 0.8;
      want.x = c.x + ox * f; want.z = c.z + oz * f;
    }
    // height: eased toward car + boom height (and never under the ground there)
    const wantY = Math.max(c.y + hgt, ground(want.x, want.z) + 0.7);
    this.camY = this.camY == null ? wantY : this.camY + (wantY - this.camY) * (1 - Math.exp(-K.heightEase * dt));
    want.y = Math.max(this.camY, ground(want.x, want.z) + 0.5);
    this.pos.copy(want);
    cam.position.copy(want);
    // aim ahead of the car (the car in the lower third), led into the turn by the yaw rate
    const lead = Math.max(-0.5, Math.min(0.5, (c.angularVel || 0) * K.turnLead));
    const ah = V.aimAhead * this.zoom, la = az + lead;
    this.look.set(c.x + Math.sin(la) * ah, c.y + V.aimHeight, c.z + Math.cos(la) * ah);
    cam.lookAt(this.look);
    if (this.lean) cam.rotateZ(this.lean);
    this.first = false;
  }
}
