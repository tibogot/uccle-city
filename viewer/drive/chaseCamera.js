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

export const CAMERA = { mode: "chase", distance: 6.4, height: 2.1, lookHeight: 1.0, fov: 60, stiffness: 7, lookAhead: 0.25 };
const MODES = ["chase", "far", "bumper", "orbit"];

export class ChaseCamera {
  constructor(camera, dom) {
    Object.assign(this, { camera, dom });
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.look = new THREE.Vector3();
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
    dom.addEventListener("wheel", (e) => { if (!this.active) return; CAMERA.distance = Math.max(3.5, Math.min(25, CAMERA.distance * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: true });
  }
  get mode() { return CAMERA.mode; }
  next() { CAMERA.mode = MODES[(MODES.indexOf(CAMERA.mode) + 1) % MODES.length]; this.first = true; return CAMERA.mode; }
  reset() { this.first = true; this.drag.yaw = 0; this.drag.pitch = 0; }

  /** c: carPhysics state; ground(x, z); insideWall(x, z) optional */
  update(c, dt, ground, insideWall = null) {
    const cam = this.camera;
    if (cam.fov !== CAMERA.fov) { cam.fov = CAMERA.fov; cam.updateProjectionMatrix(); }
    const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    const vx = sinH * c.speed + c.vx, vz = cosH * c.speed + c.vz, v = Math.hypot(vx, vz);
    if (!this.drag.held && CAMERA.mode !== "orbit") { this.drag.yaw *= Math.exp(-2.5 * dt); this.drag.pitch *= Math.exp(-2.5 * dt); }
    if (CAMERA.mode === "bumper") {
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
    this.yaw += d * (1 - Math.exp(-(CAMERA.mode === "orbit" ? 0 : 4.5) * dt));
    const far = CAMERA.mode === "far";
    const dist = CAMERA.distance * (far ? 1.6 : 1) + Math.min(2.5, v * 0.04), h = CAMERA.height * (far ? 1.8 : 1);
    const az = this.yaw + this.drag.yaw, el = Math.atan2(h, dist) + this.drag.pitch;
    const R = Math.hypot(h, dist);
    const target = new THREE.Vector3(c.x, c.y + CAMERA.lookHeight, c.z);
    const want = new THREE.Vector3(c.x - Math.sin(az) * Math.cos(el) * R, c.y + CAMERA.lookHeight + Math.sin(el) * R - CAMERA.lookHeight * 0.5, c.z - Math.cos(az) * Math.cos(el) * R);
    // keep out of buildings: pull the boom in until the point is clear
    if (insideWall) {
      for (let k = 0; k < 6 && insideWall(want.x, want.z); k++) want.lerp(target, 0.3);
    }
    want.y = Math.max(want.y, ground(want.x, want.z) + 0.6);
    if (this.first) { this.pos.copy(want); this.vel.set(0, 0, 0); this.first = false; }
    // critically damped spring toward the wanted point
    const w = CAMERA.stiffness, a = new THREE.Vector3().subVectors(want, this.pos).multiplyScalar(w * w).addScaledVector(this.vel, -2 * w);
    this.vel.addScaledVector(a, dt);
    this.pos.addScaledVector(this.vel, dt);
    // never fall behind by more than the boom (a teleport, a big hit)
    if (this.pos.distanceTo(want) > R * 1.5) this.pos.copy(want);
    this.pos.y = Math.max(this.pos.y, ground(this.pos.x, this.pos.z) + 0.5);
    cam.position.copy(this.pos);
    this.look.set(c.x + vx * CAMERA.lookAhead * 0.3, c.y + CAMERA.lookHeight, c.z + vz * CAMERA.lookAhead * 0.3);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.look);
  }
}
