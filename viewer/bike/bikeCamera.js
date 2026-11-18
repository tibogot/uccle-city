// THE BIKE'S CHASE CAMERA (bike lab; the city later): lower and closer than the car's, because a bike is small and the
// ground at bike height IS the feel. It follows a smoothed heading (it swings round in a turn a little after the bike,
// never snapping), looks a bit ahead of the kid, keeps its height steady through bumps and jumps (the vertical follow is
// slower than the horizontal: a jump reads as the kid rising, not the world dropping), rolls a little with the lean,
// widens the field of view with speed, adds a small shake on rough ground, and never goes under the ground.
// Modes (V): chase, far, low (ground-hugging, BMX video), side.
import * as THREE from "three/webgpu";

export const BIKE_CAMERA = {
  mode: "chase",
  distance: 3.3, height: 1.35, lookHeight: 0.9, lookAhead: 1.2,
  yawRate: 4.5,        // 1/s: how fast the camera swings round behind the bike
  followXZ: 12,        // 1/s
  followY: 5,          // 1/s (slower: jumps)
  fov: 64, fovKick: 10, // deg at 0 / extra at 40 km/h
  roll: 0.15,          // fraction of the lean
  shake: 1,            // x the surface buzz
  minClear: 0.35,      // m over the ground under the camera
};
const MODES = {
  chase: {},
  far: { distance: 6.5, height: 2.6, lookHeight: 0.8, lookAhead: 2 },
  low: { distance: 2.4, height: 0.45, lookHeight: 0.7, lookAhead: 1.5, roll: 0.05 },
  side: { distance: 4, height: 1.1, lookHeight: 0.8, lookAhead: 0, side: true },
};

export class BikeCamera {
  constructor(camera, cfg = BIKE_CAMERA) {
    this.camera = camera; this.cfg = cfg;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.yaw = 0; this.first = true; this.rollNow = 0; this.t = 0;
  }
  reset() { this.first = true; }
  next() { const k = Object.keys(MODES); this.cfg.mode = k[(k.indexOf(this.cfg.mode) + 1) % k.length]; this.first = true; return this.cfg.mode; }
  /** s: bikePhysics state, pose: bikePose(), ground(x, z) -> height */
  update(s, pose, dt, ground) {
    const c = { ...this.cfg, ...MODES[this.cfg.mode] }, cam = this.camera;
    this.t += dt;
    const v = Math.hypot(s.vx, s.vz);
    // the heading followed: the bike's, or its velocity when it slides / spins in the air
    let want = pose.heading;
    if (v > 2 && (s.air || Math.abs(s.slipAngle) > 0.5)) want = Math.atan2(s.vx, s.vz);
    if (this.first) this.yaw = want;
    let d = want - this.yaw; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
    this.yaw += d * (1 - Math.exp(-c.yawRate * dt));
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let ox = -fx * c.distance, oz = -fz * c.distance;
    if (c.side) { ox = Math.cos(this.yaw) * c.distance; oz = -Math.sin(this.yaw) * c.distance; }
    const base = pose.y - 0.95;            // ~ the ground under the kid
    const tx = pose.x + ox, tz = pose.z + oz;
    let ty = base + c.height;
    const gy = ground ? ground(tx, tz) : -Infinity;
    if (this.first) { this.pos.set(tx, Math.max(ty, gy + c.minClear), tz); }
    else {
      const kx = 1 - Math.exp(-c.followXZ * dt), ky = 1 - Math.exp(-c.followY * dt);
      this.pos.x += (tx - this.pos.x) * kx; this.pos.z += (tz - this.pos.z) * kx;
      this.pos.y += (ty - this.pos.y) * ky;
    }
    const gNow = ground ? ground(this.pos.x, this.pos.z) : -Infinity;
    if (this.pos.y < gNow + c.minClear) this.pos.y = gNow + c.minClear;
    const lx = pose.x + fx * c.lookAhead, lz = pose.z + fz * c.lookAhead;
    const ly = base + c.lookHeight;
    if (this.first) this.look.set(lx, ly, lz);
    else { const k = 1 - Math.exp(-14 * dt); this.look.x += (lx - this.look.x) * k; this.look.y += (ly - this.look.y) * k; this.look.z += (lz - this.look.z) * k; }
    this.first = false;
    // shake on rough ground (setts, roots): two incommensurate sines, small
    const sh = (s.buzz || 0) * c.shake;
    cam.position.set(this.pos.x, this.pos.y + sh * Math.sin(this.t * 71) * 0.6, this.pos.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.look.x, this.look.y + sh * Math.sin(this.t * 53 + 1) * 0.4, this.look.z);
    this.rollNow += ((s.crashed ? 0 : pose.lean) * c.roll - this.rollNow) * (1 - Math.exp(-5 * dt));
    cam.rotateZ(this.rollNow);
    const fov = c.fov + c.fovKick * Math.min(1, v / 11);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
}
