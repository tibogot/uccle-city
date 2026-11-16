// THE CHASE CAMERA for the car (Car Lab and drive mode). C cycles the views:
//   chase   behind and above, swings round after the direction of travel (not the nose: a slide shows the car's flank)
//   far     the same, further back and higher
//   bumper  low on the front bumper, looking ahead
//   orbit   free: drag to look round the car (any view: drag to look, it eases back when released)
// The boom is spring-smoothed (critically damped) so impacts and kerbs don't shake the picture, it never goes
// under the ground, and (with insideWall) it pulls in toward the car rather than ending up inside a building.
// Idea after game-engine-v1 games/modular-road-v3/chaseCamera.js (read-only reference): aim AT the car and keep the
// horizon level, place the boom separately.
import * as THREE from "three/webgpu";

/** ?carfeel=old: the camera before the police-feel round; now (FEEL_CAM) the view widens with speed (fov), the boom
 *  stretches on the throttle / shortens under braking, and the horizon leans a little with the cornering */
const FEEL_OLD = typeof location !== "undefined" && /[?&]carfeel=old(&|$)/.test(location.search);
export const FEEL_CAM = { fovPerMs: 0.32, fovFrom: 8, fovMax: 11, stretch: 0.07, stretchMax: 0.6, lean: 0.0032, leanMax: 0.055, ease: 3 };
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
    let last = null;
    dom.addEventListener("pointerdown", (e) => { if (!this.active) return; last = [e.clientX, e.clientY]; this.drag.held = true; });
    addEventListener("pointerup", () => { last = null; this.drag.held = false; });
    addEventListener("pointermove", (e) => {
      if (!last) return;
      this.drag.yaw -= (e.clientX - last[0]) * 0.006;
      this.drag.pitch = Math.max(-0.35, Math.min(1.1, this.drag.pitch + (e.clientY - last[1]) * 0.004));
      last = [e.clientX, e.clientY];
    });
    dom.addEventListener("wheel", (e) => { if (!this.active) return; this.cfg.distance = Math.max(3.5, Math.min(25, this.cfg.distance * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: true });
  }
  get mode() { return this.cfg.mode; }
  next() { this.cfg.mode = MODES[(MODES.indexOf(this.cfg.mode) + 1) % MODES.length]; this.first = true; return this.cfg.mode; }
  reset() { this.first = true; this.drag.yaw = 0; this.drag.pitch = 0; }

  /** c: carPhysics state; ground(x, z); insideWall(x, z) optional */
  update(c, dt, ground, insideWall = null) {
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
}
