// THE THIRD-PERSON CAMERA: a spring arm from a pivot over the character's shoulder, orbited by the mouse, zoomed
// by the wheel, smoothed with frame-rate independent exponentials, and kept OUT OF WALLS:
//   1. head point H (on the capsule axis, inside the capsule so always free) -> shoulder pivot P: one ray; the
//      shoulder offset shrinks when a wall is beside the head (corridors, door frames)
//   2. P -> the wanted camera point: five rays, to the centre and to the four corners of a probe square (the size of
//      the near plane + a margin) round it, so neither the eye nor the near plane's corners end up behind a wall
//   3. the arm takes the shortest free length AT ONCE (no frame inside a wall) and grows back slowly (releaseRate)
//   4. very close (arm < fadeFar from the capsule surface) the capsule fades out (opacity, for the body)
// The rays go through the same CollisionWorld as the body (meshes, footprints, terrain). No allocations per frame.
import * as THREE from "three/webgpu";

export const CAMERA_DEFAULTS = {
  distance: 3.6, minDistance: 0.9, maxDistance: 9,
  pivotHeight: 1.55, shoulder: 0.4,
  pitchMin: -1.3, pitchMax: 0.85,
  followRate: 40, heightRate: 14,     // pivot smoothing (1/s): horizontal, vertical
  zoomRate: 10, releaseRate: 4,        // arm length: toward the zoom, growing back after a pull-in
  probe: 0.16, pad: 0.06, minArm: 0.25, collide: true,
  fadeNear: 0.12, fadeFar: 0.7,        // capsule-surface distance where it is gone / still fully there
  fov: 60,
};

const EUL = new THREE.Euler(0, 0, 0, "YXZ");

export class ThirdPersonCamera {
  constructor(camera, params = {}) {
    this.camera = camera;
    this.p = { ...CAMERA_DEFAULTS, ...params };
    this.yaw = 0; this.pitch = -0.22;
    this.zoom = this.p.distance; this.dist = this.p.distance; this.arm = this.p.distance;
    this.piv = new Float64Array(3); this.tgt = new Float64Array(3); this.first = true;
    this.opacity = 1;
    this.rays = new Float32Array(6 * 6); this.rayHit = new Uint8Array(6);   // debug: segments, hit flags
    this.hitTag = -1;
  }
  addYaw(d) { this.yaw = Math.atan2(Math.sin(this.yaw + d), Math.cos(this.yaw + d)); }
  addPitch(d) { this.pitch = Math.min(this.p.pitchMax, Math.max(this.p.pitchMin, this.pitch + d)); }
  zoomBy(f) { this.zoom = Math.min(this.p.maxDistance, Math.max(this.p.minDistance, this.zoom * f)); }
  reset(yaw) { this.yaw = yaw; this.pitch = -0.22; this.first = true; }
  /** Horizontal camera axes for camera-relative movement: forward (-sin, -cos), right (cos, -sin). */
  get fwdX() { return -Math.sin(this.yaw); } get fwdZ() { return -Math.cos(this.yaw); }

  /** fx, fy, fz: the character's interpolated feet; radius / height of its capsule; world: CollisionWorld. */
  update(dt, fx, fy, fz, radius, height, world) {
    const p = this.p, cam = this.camera;
    if (cam.fov !== p.fov) { cam.fov = p.fov; cam.updateProjectionMatrix(); }
    // pivot smoothing
    const tx = fx, ty = fy + p.pivotHeight, tz = fz, P = this.piv;
    const T = this.tgt;
    if (this.first) { P[0] = tx; P[1] = ty; P[2] = tz; this.dist = this.arm = this.zoom; }
    else if (dt > 0) {
      // exact first-order lag for a target moving linearly over the frame: e' = v - k e, so the lag behind a
      // steadily moving character is the same at any frame time (a plain exponential lerp jitters with dt)
      const eh = Math.exp(-p.followRate * dt), ev = Math.exp(-p.heightRate * dt);
      for (let k = 0; k < 3; k++) {
        const rate = k === 1 ? p.heightRate : p.followRate, ex = k === 1 ? ev : eh;
        const tk = k === 0 ? tx : k === 1 ? ty : tz, v = (tk - T[k]) / dt, e0 = T[k] - P[k];
        P[k] = tk - (v / rate + (e0 - v / rate) * ex);
      }
    }
    T[0] = tx; T[1] = ty; T[2] = tz;
    // the pivot stays inside the capsule's column (it is the guaranteed-free point the rays start from)
    let ox = P[0] - fx, oz = P[2] - fz;
    const ol = Math.sqrt(ox * ox + oz * oz), lim = radius * 0.6;
    if (ol > lim) { P[0] = fx + ox / ol * lim; P[2] = fz + oz / ol * lim; }
    P[1] = Math.min(Math.max(P[1], fy + radius), fy + height - 0.08);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    // camera axes: forward f, right rt, up u
    const fX = -sy * cp, fY = sp, fZ = -cy * cp, rX = cy, rZ = -sy, uX = sy * sp, uY = cp, uZ = cy * sp;
    this.dist += (this.zoom - this.dist) * (1 - Math.exp(-p.zoomRate * dt));
    // 1. shoulder
    const hx = P[0], hy = P[1], hz = P[2];
    let sh = p.shoulder;
    const WR = world.r, WH = world.hit, RY = this.rays;
    if (p.collide && sh > 0) {
      const len = sh + p.probe;
      WR[0] = hx; WR[1] = hy; WR[2] = hz; WR[3] = rX; WR[4] = 0; WR[5] = rZ; WH[0] = len; WH[4] = -1;
      world.raycast();
      const hit = WH[4] >= 0, t = WH[0];
      RY[0] = hx; RY[1] = hy; RY[2] = hz; RY[3] = hx + rX * t; RY[4] = hy; RY[5] = hz + rZ * t; this.rayHit[0] = hit ? 1 : 0;
      if (hit) sh = Math.max(0, t - p.probe);
    }
    const px = hx + rX * sh, py = hy, pz = hz + rZ * sh;
    // 2. the arm
    let free = this.dist;
    if (p.collide) {
      const L = this.dist, q = p.probe;
      for (let k = 0; k < 5; k++) {
        const a = k === 0 ? 0 : (k & 1 ? q : -q), b = k === 0 ? 0 : (k & 2 ? q : -q);
        const ex = px - fX * L + rX * a + uX * b, ey = py - fY * L + uY * b, ez = pz - fZ * L + rZ * a + uZ * b;
        const dx = ex - px, dy = ey - py, dz = ez - pz;
        WR[0] = px; WR[1] = py; WR[2] = pz; WR[3] = dx; WR[4] = dy; WR[5] = dz; WH[0] = 1; WH[4] = -1;
        world.raycast();
        const hit = WH[4] >= 0, t = WH[0], o = (k + 1) * 6;
        RY[o] = px; RY[o + 1] = py; RY[o + 2] = pz; RY[o + 3] = px + dx * t; RY[o + 4] = py + dy * t; RY[o + 5] = pz + dz * t; this.rayHit[k + 1] = hit ? 1 : 0;
        if (hit) { const f = t * L - p.pad; if (f < free) { free = f; this.hitTag = WH[4]; } }
      }
      free = Math.max(p.minArm, free);
    }
    // 3. snap in, ease out
    if (this.first || free < this.arm) this.arm = free;
    else this.arm += (free - this.arm) * (1 - Math.exp(-p.releaseRate * dt));
    this.first = false;
    const camX = px - fX * this.arm, camY = py - fY * this.arm, camZ = pz - fZ * this.arm;
    cam.position.set(camX, camY, camZ);
    EUL.set(this.pitch, this.yaw, 0, "YXZ");
    cam.quaternion.setFromEuler(EUL);
    // 4. fade: distance from the eye to the capsule surface
    const ay = fy + radius, by = fy + height - radius;
    const yy = Math.min(Math.max(camY, ay), by), d = Math.sqrt((camX - fx) ** 2 + (camY - yy) ** 2 + (camZ - fz) ** 2) - radius;
    const s = Math.min(1, Math.max(0, (d - p.fadeNear) / (p.fadeFar - p.fadeNear)));
    this.opacity = s * s * (3 - 2 * s);
  }
}
