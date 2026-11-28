// THE BIKE'S CHASE CAMERA (feel round 4; docs/BIKE.md "Feel round 4", FEEL_RESEARCH.md section 3). Lower and closer than
// the car's: a bike is small and the ground at bike height IS the feel.
//   CameraRig (pure numbers, node-tested)       BikeCamera (three.js: applies the rig to a PerspectiveCamera)
// What it does, and why (the research's "camera that follows intent, not the bike"):
//   - follows a smoothed heading (it swings round a turn a little after the bike, never snapping); the velocity's
//     heading when the bike slides or flies;
//   - LOOKS AHEAD along the velocity (0.25 s of travel + a base) and INTO turns (the look turned by the yaw rate x
//     turnLook): the inside of a corner comes into view before the bike gets there;
//   - SPEED SENSE: the field of view opens and the camera sits a little lower and closer with speed, both eased
//     (time constant speedEase), never a step;
//   - a LANDING DIP: each landing kicks a critically damped vertical spring (no bounce): 3-8 cm with the impact, back in
//     ~0.25 s; nothing on ordinary rolling;
//   - vertical follow slower than horizontal (a jump reads as the kid rising, not the world dropping); stairs and grinds
//     ride through it smoothly;
//   - NEVER INSIDE THINGS: the line from the kid's head to the wanted spot is marched against the colliders (walls,
//     buildings, benches, garden walls: env.solidAt) and the ground (kerbs, slopes): the camera comes in to the last free
//     point at once and eases back out (pullOut); the ground under it (5 samples) keeps it minClear over the highest;
//   - a small roll with the lean (at most roll x lean), a small shake on rough ground.
// Modes (V): chase, far, low (ground-hugging, BMX video), side.
// (no three.js import: the rig is plain numbers, BikeCamera only calls the camera it is given)

export const BIKE_CAMERA = {
  mode: "chase",
  distance: 3.3, height: 1.35, lookHeight: 0.9, lookAhead: 1.2,
  lookTime: 0.25,      // s of travel added to the look-ahead (capped at 3 m)
  turnLook: 0.3,       // s: the look turned into the corner by yaw rate x this
  yawRate: 4.5,        // 1/s: how fast the camera swings round behind the bike
  followXZ: 12,        // 1/s
  followY: 5,          // 1/s (slower: jumps, stairs)
  fov: 64, fovKick: 7, // deg at rest / extra at full speed sense (research: +4..8)
  speedLow: 3, speedHigh: 12, speedEase: 0.6,   // m/s where the speed sense starts / is full; s to ease in / out
  speedDrop: 0.15, speedIn: 0.08,               // m lower / fraction closer at full speed sense
  dip: 0.45, dipMax: 3.4, dipHz: 2.5,           // landing dip: (m/s of kick) per (m/s of impact), its cap; spring frequency
  roll: 0.15,          // fraction of the lean
  shake: 1,            // x the surface buzz
  minClear: 0.35,      // m over the ground under the camera
  wallClear: 0.25,     // m kept from a solid along the line of sight
  pullOut: 3,          // 1/s: easing back out after a wall moved the camera in
  pullAhead: 0.3,      // s: the line of sight is also tested where the bike will be this soon (a wall coming up)...
  pullIn: 8,           // 1/s: ...and the camera eases in toward it ahead of time, so the at-once pull-in is small
};
export const CAMERA_MODES = {
  chase: {},
  far: { distance: 6.5, height: 2.6, lookHeight: 0.8, lookAhead: 2 },
  low: { distance: 2.4, height: 0.45, lookHeight: 0.7, lookAhead: 1.5, roll: 0.05 },
  side: { distance: 4, height: 1.1, lookHeight: 0.8, lookAhead: 0, side: true, turnLook: 0 },
};
const MODE_RESET = { side: false };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const RING = [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]];

/** the camera's maths (no three): update() -> pos, look, fov, roll (plain numbers). ground(x, z) -> y,
 *  solid(x, y, z) -> true inside a collider (bikeEnv solidAt; optional) */
export class CameraRig {
  constructor(cfg = BIKE_CAMERA) {
    this.cfg = cfg;
    this.pos = { x: 0, y: 0, z: 0 }; this.look = { x: 0, y: 0, z: 0 }; this.fov = cfg.fov; this.roll = 0;
    this.yaw = 0; this.first = true; this.t = 0; this.spd = 0; this.dipY = 0; this.dipV = 0; this.landings = -1;
    this.free = 1; this.blocked = 0; this.want = { x: 0, y: 0, z: 0 }; this._c = {};
  }
  reset() { this.first = true; }
  // (side: false first: a mode-only flag must not stick in the scratch object after leaving that mode; browser check
  // 2026-11-21: chase after cycling through side stayed a side camera)
  cfgNow() { return Object.assign(this._c, this.cfg, MODE_RESET, CAMERA_MODES[this.cfg.mode]); }
  /** the free fraction of the line of sight from (hx, hy, hz) to the wanted spot moved by (dx, dz) */
  sight(hx, hy, hz, dx, dy, dz, c, ground, solid) {
    if (!solid && !ground) return 1;
    const ex = this.want.x + dx - hx, ey = this.want.y + dy - hy, ez = this.want.z + dz - hz, L = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1, N = Math.max(8, Math.ceil(L / 0.2));
    for (let i = 1; i <= N; i++) {
      const f = i / N, x = hx + ex * f, y = hy + ey * f, z = hz + ez * f;
      if ((solid && solid(x, y, z)) || (ground && y < ground(x, z) + 0.12)) return Math.max(0, (i - 1) / N - c.wallClear / L);
    }
    return 1;
  }
  update(s, pose, dt, ground = null, solid = null) {
    const c = this.cfgNow(), v = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
    this.t += dt;
    // ---- speed sense, eased
    this.spd += (sm(c.speedLow, c.speedHigh, v) - this.spd) * (this.first ? 1 : 1 - Math.exp(-dt / c.speedEase));
    // ---- the heading followed
    let want = pose.heading;
    if (v > 2 && (s.air || Math.abs(s.slipAngle || 0) > 0.5)) want = Math.atan2(s.vx, s.vz);
    if (this.first) this.yaw = want;
    let d = want - this.yaw; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
    this.yaw += d * (1 - Math.exp(-c.yawRate * dt));
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const dist = c.distance * (1 - c.speedIn * this.spd);
    let ox = -fx * dist, oz = -fz * dist;
    if (c.side) { ox = Math.cos(this.yaw) * dist; oz = -Math.sin(this.yaw) * dist; }
    // ---- the landing dip: a kick into a critically damped spring
    if (this.first) this.landings = s.landings || 0;
    if ((s.landings || 0) !== this.landings) {
      this.landings = s.landings || 0;
      const vn = s.lastLanding ? s.lastLanding.vn : 0;
      this.dipV -= Math.min(c.dipMax, Math.max(0, vn) * c.dip);
    }
    const w = 2 * Math.PI * c.dipHz;
    { const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n; for (let i = 0; i < n; i++) { this.dipV += (-w * w * this.dipY - 2 * w * this.dipV) * h; this.dipY += this.dipV * h; } }
    // ---- where the camera wants to be
    const base = pose.y - 0.95;            // ~ the ground under the kid
    const tx = pose.x + ox, tz = pose.z + oz, ty = base + c.height - c.speedDrop * this.spd;
    if (this.first) { this.want.x = tx; this.want.y = ty; this.want.z = tz; }
    else {
      const kx = 1 - Math.exp(-c.followXZ * dt), ky = 1 - Math.exp(-c.followY * dt);
      this.want.x += (tx - this.want.x) * kx; this.want.z += (tz - this.want.z) * kx; this.want.y += (ty - this.want.y) * ky;
    }
    // ---- never inside things: march the line of sight from the kid's head to the wanted spot
    const hx = pose.x, hy = base + 1.2, hz = pose.z;
    const freeTo = this.sight(hx, hy, hz, 0, 0, 0, c, ground, solid);
    // (and where the bike will be in pullAhead s: a wall coming up starts the camera in early, eased, instead of a
    // pull-in of metres in one frame; browser check 2026-11-21: 1.8 m in a frame entering the lab's walled stairs)
    // (the head and the camera both moved by the travel, and by the ground's change there: down a flight they drop too)
    let freeAhead = 1;
    if (c.pullAhead > 0 && v > 0.5) {
      const ax = s.vx * c.pullAhead, az = s.vz * c.pullAhead, ay = ground ? ground(hx + ax, hz + az) - ground(hx, hz) : (s.vy || 0) * c.pullAhead;
      freeAhead = this.sight(hx + ax, hy + ay, hz + az, ax, ay, az, c, ground, solid);
    }
    this.blocked = freeTo < 1 ? 1 : 0;
    if (freeTo < this.free || this.first) this.free = freeTo;                       // in at once (never inside)
    else if (freeAhead < this.free) this.free += (freeAhead - this.free) * (1 - Math.exp(-c.pullIn * dt));   // in early, eased
    else this.free += (Math.min(freeTo, freeAhead) - this.free) * (1 - Math.exp(-c.pullOut * dt));      // out eased
    const f = this.free;
    const px = hx + (this.want.x - hx) * f, pz = hz + (this.want.z - hz) * f;
    let py = hy + (this.want.y - hy) * f + this.dipY;
    // the ground under the camera (5 samples: a kerb's top beside it counts; after the dip: it never dips into it)
    if (ground) {
      let g = ground(px, pz);
      for (const [a, b] of RING) g = Math.max(g, ground(px + a, pz + b));
      // (a SMOOTH max with the floor: never under it, no kink where it starts / stops holding the camera up)
      const fl = g + c.minClear, k = 0.15;
      py = (py + fl + Math.sqrt((py - fl) * (py - fl) + k * k)) / 2;
    }
    // shake on rough ground (setts, roots): small, on the position only
    const sh = (s.buzz || 0) * c.shake;
    this.pos.x = px; this.pos.y = py + Math.abs(sh * Math.sin(this.t * 71) * 0.6); this.pos.z = pz;
    // ---- the look: ahead along the velocity, turned into the corner
    const vAng = v > 1 ? Math.atan2(s.vx, s.vz) : this.yaw;
    const la = vAng + Math.max(-0.6, Math.min(0.6, (s.yawVel || 0) * c.turnLook));
    const ahead = c.side ? 0 : c.lookAhead + Math.min(3, v * c.lookTime);
    const lx = pose.x + Math.sin(la) * ahead, lz = pose.z + Math.cos(la) * ahead, ly = base + c.lookHeight + this.dipY * 0.5;
    if (this.first) { this.look.x = lx; this.look.y = ly; this.look.z = lz; }
    else { const k = 1 - Math.exp(-14 * dt); this.look.x += (lx - this.look.x) * k; this.look.y += (ly - this.look.y) * k; this.look.z += (lz - this.look.z) * k; }
    this.roll += ((s.crashed ? 0 : pose.lean) * c.roll - this.roll) * (1 - Math.exp(-5 * dt));
    this.fov = c.fov + c.fovKick * this.spd;
    this.first = false;
    return this;
  }
}

export class BikeCamera {
  constructor(camera, cfg = BIKE_CAMERA) { this.camera = camera; this.cfg = cfg; this.rig = new CameraRig(cfg); }
  reset() { this.rig.reset(); }
  next() { const k = Object.keys(CAMERA_MODES); this.cfg.mode = k[(k.indexOf(this.cfg.mode) + 1) % k.length]; this.rig.reset(); return this.cfg.mode; }
  /** s: bikePhysics state, pose: bikePose(), ground(x, z) -> height, solid(x, y, z) -> inside a collider */
  update(s, pose, dt, ground, solid = null) {
    const r = this.rig.update(s, pose, dt, ground, solid), cam = this.camera;
    cam.position.set(r.pos.x, r.pos.y, r.pos.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(r.look.x, r.look.y, r.look.z);
    cam.rotateZ(r.roll);
    if (Math.abs(cam.fov - r.fov) > 0.05) { cam.fov = r.fov; cam.updateProjectionMatrix(); }
  }
}
