// THE MOTORBIKE'S CAMERA: the car's chase camera (viewer/drive/chaseCamera.js: spring boom, never inside a wall or under
// the ground) with the bike's own numbers, plus: it ROLLS a little with the lean (a quarter of it, smoothed), the field
// of view widens with speed (+16 deg at 250 km/h), and the "bumper" view is a HELMET view (the rider's eyes, rolling with
// most of the lean). C cycles chase / far / helmet / orbit as in the car.
import { ChaseCamera } from "../drive/chaseCamera.js";

export const MOTO_CAMERA = { mode: "chase", distance: 4.3, height: 1.45, lookHeight: 1.05, fov: 62, stiffness: 9, lookAhead: 0.3,
  baseFov: 62, fovKick: 16, tilt: 0.28, helmetTilt: 0.7 };

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class MotoCamera extends ChaseCamera {
  constructor(camera, dom, cfg = MOTO_CAMERA) {
    super(camera, dom, cfg);
    this.roll = 0; this.kick = 0;
  }
  reset() { super.reset(); this.roll = 0; }
  /** c: motoPhysics state; head: optional () => [x, y, z] of the rider's eyes (helmet view) */
  update(c, dt, ground, insideWall = null, head = null) {
    const cfg = this.cfg, cam = this.camera;
    const v = Math.hypot(Math.sin(c.heading) * c.speed + c.vx, Math.cos(c.heading) * c.speed + c.vz);
    this.kick += (smooth(4, 70, v) - this.kick) * Math.min(1, dt * 3);
    cfg.fov = cfg.baseFov + cfg.fovKick * this.kick;
    const helmet = cfg.mode === "bumper";
    const want = (c.crashed ? 0 : c.lean) * (helmet ? cfg.helmetTilt : cfg.tilt);
    this.roll += (want - this.roll) * Math.min(1, dt * (helmet ? 10 : 4));
    if (helmet && head) {
      if (cam.fov !== cfg.fov) { cam.fov = cfg.fov; cam.updateProjectionMatrix(); }
      const p = head();
      const s = Math.sin(c.heading), k = Math.cos(c.heading);
      cam.position.set(p[0], p[1], p[2]);
      this.look.set(p[0] + s * 25, p[1] - 1.6 + Math.sin(c.slopePitch) * 25, p[2] + k * 25);
      cam.up.set(0, 1, 0);
      cam.lookAt(this.look);
      cam.rotateZ(this.roll);
      this.first = true;
      return;
    }
    // feed-forward: the boom moves with the bike (the spring only smooths the swing / bumps; a world-space spring lags
    // 2 v / stiffness behind: ~9 m at 150 km/h)
    if (!this.first) { this.pos.x += (Math.sin(c.heading) * c.speed + c.vx) * dt; this.pos.z += (Math.cos(c.heading) * c.speed + c.vz) * dt; }
    super.update(c, dt, ground, insideWall);
    if (cfg.mode !== "orbit") cam.rotateZ(this.roll);
  }
}
