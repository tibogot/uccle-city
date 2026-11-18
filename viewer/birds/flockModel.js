// THE SKY FLOCKS' BEHAVIOUR MODEL (claude/birds2; ?birds2=old = the flocks before). Plain JS (no three.js), shared by
//   viewer/birds/skyFlocks.js   the GPU steering reads its gains (DAY, MUR) and the slot rows it documents
//   viewer/birds/cityBirds.js   the director drives every flock with a LeaderPath (a virtual leader flying a path) and
//                               the murmuration's shape with a MurmurShape (manoeuvres)
//   tools/audit/birdGate.mjs    a CPU mirror of the GPU step (cpuStep*) + shape metrics: the gate row "birds"
//
// WHY THE FLOCKS READ AS A BALL (owner playtest 2026-11-18, "boids of birds in the sky look like a ball"): the day flocks
// were pulled to ONE POINT (the director's target), which then STOOD STILL for 20-60 s (a park's waypoint reached, the
// jackdaws' tower), with all-to-all metric cohesion (every bird within 12 m pulled to the local centroid) and a 1 m
// personal space: 110-190 starlings at 9-17 m/s orbiting a fixed point = a gnat swarm, a ~20 m ball of overlapping birds.
// Real small flocks never hover round a point: they FLY A PATH (a few birds know where to, the rest follow: Couzin et al.
// 2005, Nature 433: 513), each bird keeping to its 6-7 nearest neighbours (TOPOLOGICAL: Ballerini et al. 2008, PNAS 105:
// 1232) at a distance of a few body lengths, so the group stretches on a turn, spreads, splits and regroups.
//
// THE NEW RULES
//  day flocks (starlings 25-60, feral pigeons 15-45, jackdaws 12-40, parakeets 10-30, gulls): a LEADER (a CPU point flying
//    a smooth wandering path at the species' cruise speed: turn rate as an Ornstein-Uhlenbeck process, homing to its area
//    or heading for a goal) + per bird: its 7 nearest neighbours (exact: a sorted insertion over the slot each frame, its
//    7th distance kept for the next frame), a dead band (no force between 1 and 1.4 x the species' spacing), alignment to
//    them; INFORMED birds (a fraction) steer for the leader's heading aimed 3 s ahead (each to its own place across the
//    front), the others only when they stray. Splits: half the informed birds follow a second, offset leader now and
//    then (the group parts and rejoins).
//  the murmuration (3072 / 900 starlings at dusk): fixed lattice neighbours (6, topological) + a FORMATION the director
//    deforms through manoeuvres (sheet, ribbon, fold, hourglass / two lobes, S curve, tilt), a density wave along the
//    flock (compression bands travel through it) and an orientation wave (the banking runs across the sheet: the dark
//    bands of real murmurations, Procaccini et al. 2011, Anim. Behav. 82: 759; Hemelrijk et al. 2015), its leader on a
//    swooping path round the roost.

/** three.js r187 TSL hash (pcg, shadertoy XlGcRh) on the CPU: bit-identical to the GPU's per-bird randoms */
export function hashU(seed) {
  const state = (Math.imul(seed >>> 0, 747796405) + 2891336453) >>> 0;
  const word = Math.imul(((state >>> (((state >>> 28) + 4) >>> 0)) ^ state) >>> 0, 277803737) >>> 0;
  return (((word >>> 22) ^ word) >>> 0) / 4294967296;
}
export const birdSeed = (i) => Math.imul(i >>> 0, 2654435761) >>> 0;

/** day-flock gains (m/s^2 per m, per m/s): the GPU reads these as constants */
export const DAY = {
  TOPO: 7,            // topological neighbours (Ballerini et al. 2008: 6-7)
  sep: 7,             // per neighbour inside the spacing: (spacing - d) x sep
  sepY: 0.5,          // its vertical part (parties spread sideways more than up and down: flat, as filmed flocks are)
  coh: 0.9,           // the neighbours' mean of (d - 1.4 spacing)+
  band: 1.4,          // the dead band's outer edge (x spacing)
  align: 1.4,         // (the neighbours' mean velocity - v) x align
  lead: 0.75,         // informed birds: (the leader heading x cruise - v) x lead
  stray: 0.5,         // uninformed: up to this, from 1 to 2.5 x the flock radius off the leader
  ahead: 3,           // s: informed birds aim at the leader's point 3 s ahead
  level: 0.6,         // (the leader's climb rate - v.y) x level: flat parties, not 3D clouds
};
/** the day flocks (new): group sizes (field guides / what one sees over Brussels: small parties, not swarms), spacing
 *  (the nearest neighbour a few body lengths off in transit), speeds (m/s), the informed fraction, the leader's path
 *  (area radius R round home m, altitude band over the ground m, turn rate limit rad/s and its noise) */
export const DAY_PROFILES = {
  starlings: { n: [25, 60], spacing: 2.2, vmin: 10, vmax: 17, informed: 0.35, radius: 28, floorClear: 9, leader: { R: 260, yLo: 22, yHi: 45, turnMax: 0.5, turnSigma: 0.45 } },
  pigeons: { n: [15, 45], spacing: 3.0, vmin: 9, vmax: 15, informed: 0.35, radius: 26, floorClear: 8, leader: { R: 140, yLo: 14, yHi: 32, turnMax: 0.55, turnSigma: 0.4 } },
  jackdaws: { n: [12, 40], spacing: 4.0, vmin: 8, vmax: 14, informed: 0.3, radius: 34, floorClear: 9, leader: { R: 130, yLo: 10, yHi: 40, turnMax: 0.5, turnSigma: 0.45 } },
  parakeets: { n: [10, 30], spacing: 2.5, vmin: 13, vmax: 19, informed: 0.4, radius: 24, floorClear: 10, leader: { R: 220, yLo: 18, yHi: 34, turnMax: 0.45, turnSigma: 0.35 } },
  gulls: { n: [6, 34], spacing: 10, vmin: 7, vmax: 12, informed: 0.5, radius: 60, floorClear: 40, leader: { R: 300, yLo: 90, yHi: 150, turnMax: 0.2, turnSigma: 0.12 } },
};
/** the falcon game's prey density (falcon flight on): the group sizes before birds2, flown with the new rules (the
 *  hunt's prey counts unchanged; the gate checks these sizes are loose flocks too) */
export const PREY_SIZES = { starlings: [110, 190], jackdaws: [28, 60], parakeets: [24, 52] };
/** murmuration gains */
export const MUR = {
  form: 0.32,         // the pull to the bird's place in the formation (x min(dist, 40))
};
/** the slot rows (vec4) the GPU reads, SB per slot */
export const SB = 10;
// 0 target / leader (xyz, radius)  1 (floorClear, vmin, vmax, on)  2 (spawn xyz, epoch)  3 (species, count, start, mode)
// 4 (nx, ny, rest, circle)  5 (fade, cohesion, align, sep)
// day (new): 6 (leader velocity xyz, informed fraction)  7 (split offset xyz, spacing)
// murmuration: 6 (heading xyz, bend)  7 (sx, sy, sz, ripple phase)  8 (sideBend, sBend, pinch, tilt)  9 (densAmp, densPhase, bankWave, fold)

// ------------------------------------------------------------------------------------------------ the leader
/** a virtual leader flying a smooth path: wanders within R of home (or heads for a goal), turn rate an OU process */
export class LeaderPath {
  constructor({ x, y, z, heading = 0, speed = 12, home, R = 150, yLo = 25, yHi = 45, turnMax = 0.45, turnSigma = 0.35, rnd = Math.random }) {
    Object.assign(this, { x, y, z, h: heading, speed, home: home ?? { x, z }, R, yLo, yHi, turnMax, turnSigma, rnd });
    this.w = 0; this.goal = null; this.yT = (yLo + yHi) / 2; this.yTt = 0; this.vx = Math.sin(heading) * speed; this.vy = 0; this.vz = Math.cos(heading) * speed;
  }
  gauss() { const r = this.rnd; return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(6.2832 * r()); }
  /** dt s; ground(x, z) m: the leader's altitude band is over it */
  step(dt, ground = () => 0) {
    const g = this.goal ?? this.home;
    const dx = g.x - this.x, dz = g.z - this.z, d = Math.hypot(dx, dz);
    // homing: toward the goal always, toward home only once out of the area (the harder the farther)
    const want = Math.atan2(dx, dz);
    let diff = want - this.h; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const homing = this.goal ? 0.9 : Math.max(0, d / this.R - 0.7) * 1.2;
    this.w += (-this.w * 0.5 + diff * homing * 0.6) * dt + this.gauss() * this.turnSigma * Math.sqrt(dt);
    this.w = Math.max(-this.turnMax, Math.min(this.turnMax, this.w));
    this.h += this.w * dt;
    // altitude: a new band height every 8-20 s, climbs / dives toward it
    this.yTt -= dt;
    if (this.yTt <= 0) { this.yTt = 8 + this.rnd() * 12; this.yT = this.yLo + this.rnd() * (this.yHi - this.yLo); }
    const gy = ground(this.x, this.z) + this.yT;
    this.vy += (Math.max(-3.5, Math.min(2.5, (gy - this.y) * 0.25)) - this.vy) * Math.min(1, dt * 1.5);
    this.vx = Math.sin(this.h) * this.speed; this.vz = Math.cos(this.h) * this.speed;
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    return d;
  }
}

// ------------------------------------------------------------------------------------------------ murmuration shapes
/** manoeuvres of a murmuration (looked at in many dusk videos, nothing traced): the target poses of the shape rows */
export const POSES = {
  sheet:     { sx: 1.25, sy: 0.75, sz: 1.0, side: 0.1, sb: 0, pinch: 0, tilt: 0.15, fold: 0, bend: 0.2 },
  ribbon:    { sx: 0.5, sy: 0.7, sz: 2.1, side: 0.55, sb: 0, pinch: 0, tilt: 0.55, fold: 0.2, bend: 0.1 },
  fold:      { sx: 1.15, sy: 0.6, sz: 1.4, side: 0.1, sb: 0.1, pinch: 0, tilt: 0.45, fold: 0.8, bend: 0.3 },
  hourglass: { sx: 1.15, sy: 0.9, sz: 1.7, side: 0.15, sb: 0, pinch: 0.8, tilt: 0.2, fold: 0.3, bend: 0.15 },
  scurve:    { sx: 0.65, sy: 0.75, sz: 1.9, side: 0.1, sb: 0.6, pinch: 0.2, tilt: 0.35, fold: 0.5, bend: 0.1 },
  bank:      { sx: 1.0, sy: 1.1, sz: 0.85, side: 0.25, sb: 0, pinch: 0, tilt: 1.1, fold: 0, bend: 0.45 },
};
const POSE_KEYS = Object.keys(POSES);
export class MurmurShape {
  constructor(rnd = Math.random) {
    this.rnd = rnd; this.cur = { ...POSES.sheet }; this.goal = POSES.sheet; this.t = 0; this.next = 4; this.ph = rnd() * 100;
    this.dens = 0; this.densPh = 0; this.wave = 0.18; this.name = "sheet";
  }
  /** dt s, alarm 0..1 (a hawk pass): bigger waves; returns the row values */
  step(dt, alarm = 0) {
    this.t += dt; this.next -= dt;
    if (this.next <= 0) {
      let k; do k = POSE_KEYS[(this.rnd() * POSE_KEYS.length) | 0]; while (k === this.name);
      this.name = k; this.goal = POSES[k]; this.next = 5 + this.rnd() * 8;
    }
    const e = 1 - Math.exp(-dt / 2.4);
    for (const q in this.cur) this.cur[q] += (this.goal[q] - this.cur[q]) * e;
    const T = this.t + this.ph, c = this.cur;
    // slow wobble on top of the pose (never quite still)
    this.out ??= {};
    const o = this.out;
    o.sx = c.sx * (1 + 0.15 * Math.sin(T * 0.23)); o.sz = c.sz * (1 + 0.15 * Math.sin(T * 0.17 + 1.3)); o.sy = c.sy * (1 + 0.25 * Math.sin(T * 0.11 + 0.4));
    o.bend = c.bend * Math.sin(T * 0.13 + 2.1) + 0.1; o.side = c.side * Math.sin(T * 0.09 + 0.7); o.sb = c.sb * Math.sin(T * 0.07);
    o.pinch = c.pinch; o.tilt = c.tilt * Math.sin(T * 0.12 + 1.1); o.fold = c.fold * Math.sin(T * 0.1 + 2.6);
    // the density wave (compression bands running back through the flock, ~0.25 Hz) and the banking wave, bigger in alarm
    this.dens += ((0.18 + 0.15 * alarm) - this.dens) * e;
    this.densPh += dt * (1.6 + alarm * 2);
    this.wave += ((0.22 + 0.6 * alarm) - this.wave) * Math.min(1, dt * 2);
    o.dens = this.dens; o.densPh = this.densPh; o.waveAmp = this.wave; o.ripple = T * 0.9;
    return o;
  }
}

// ------------------------------------------------------------------------------------------------ the CPU mirror
// The GPU steer (skyFlocks.js, new path) step for step on the CPU: the gate's simulation. Positions / velocities in
// Float32Array (3 per bird). Floor, threats other than a hawk point, wing flaps: left out (no effect on the shape).

/** formation coordinates of lattice bird `local` -> its goal offset in the leader's frame { ox, oy, oz, wd } (mirror of
 *  the TSL in skyFlocks.js: keep both in step) */
export function formationOffset(local, count, nx, ny, rest, R, seed) {
  const lx = local % nx, ly = Math.floor(local / nx) % ny, lz = Math.floor(local / (nx * ny));
  const nz = Math.floor((count + nx * ny - 1) / (nx * ny));
  const jx = hashU(seed + 11) - 0.5, jy = hashU(seed + 12) - 0.5, jz = hashU(seed + 13) - 0.5;
  const u = ((lx + 0.5 + jx * 0.9) / nx) * 2 - 1, w = ((ly + 0.5 + jy * 0.9) / ny) * 2 - 1;
  const ud = u * Math.sqrt(Math.max(1 - w * w * 0.5, 0)), wd0 = w * Math.sqrt(Math.max(1 - u * u * 0.5, 0));
  // the density wave: wd' = wd + a sin(2 pi wd - phase) / (2 pi) (monotonic for a < 1)
  const wd = wd0 + (R.dens * Math.sin(6.2832 * wd0 - R.densPh)) / 6.2832;
  const halfW = nx * rest * R.sx * 0.5 + 1, halfL = ny * rest * R.sz * 0.5;
  const pinchK = 1 - R.pinch * Math.exp(-(wd * wd) / 0.09);
  let ox = ud * halfW * pinchK + (R.side * wd * wd + R.sb * wd * wd * wd) * halfL;
  const oz = wd * halfL;
  const lens = Math.sqrt(Math.max(1 - (ud * ud + wd * wd) * 0.7, 0.05));
  let oy = (lz + 0.5 + jz - nz * 0.5) * rest * R.sy * lens + (R.bend * ox * ox) / halfW + Math.sin(oz * 0.08 + R.ripple) * halfW * 0.18;
  // the tilt of the sheet about the heading, folding along it (front and back tilt apart)
  const a = R.tilt + R.fold * wd, ca = Math.cos(a), sa = Math.sin(a);
  const rx = ox * ca - oy * sa, ry = ox * sa + oy * ca;
  return { ox: rx, oy: ry, oz, wd };
}

/** a CPU flock (one slot): the gate's mirror */
export class CpuFlock {
  constructor({ count, mode, spacing = 2.5, rest = 2.6, vmin = 9, vmax = 17, informed = 0.35, radius = 40, cohesion = 1, align = 1, sep = 1, circle = 0, old = false, spawn, rnd }) {
    Object.assign(this, { count, mode, spacing, rest, vmin, vmax, informed, radius, cohesion, align, sep, circle, old, rnd });
    this.p = new Float32Array(count * 3); this.v = new Float32Array(count * 3); this.r = new Float32Array(count); this.v2 = new Float32Array(count * 3);
    const nz = Math.max(1, Math.round(Math.cbrt(count / 48))), ny = Math.max(1, Math.round(Math.sqrt((count / nz) * 0.75))), nx = Math.ceil(count / (ny * nz));
    Object.assign(this, { nx, ny, nz });
    for (let i = 0; i < count; i++) {
      const s = birdSeed(i), j = [hashU(s) - 0.5, hashU(s + 1) - 0.5, hashU(s + 2) - 0.5];
      let o;
      if (mode === "lattice") {
        const lx = i % nx, ly = Math.floor(i / nx) % ny, lz = Math.floor(i / (nx * ny)), nzz = Math.floor((count + nx * ny - 1) / (nx * ny));
        o = [(lx - nx * 0.5 + j[0] * 0.6) * rest, (lz - nzz * 0.5 + j[1] * 0.6) * rest, (ly - ny * 0.5 + j[2] * 0.6) * rest];
      } else if (old) { const b = radius * 0.25 + 8; o = [j[0] * 2 * b, j[1] * 2 * b, j[2] * 2 * b]; }
      else { const b = spacing * Math.cbrt(count) * 2.2; o = [j[0] * b, j[1] * b * 0.35, j[2] * b]; }
      for (let a = 0; a < 3; a++) this.p[i * 3 + a] = spawn[a] + o[a];
      this.v[i * 3 + 2] = (vmin + vmax) / 2;
    }
  }

  /** one step: L = { x, y, z, vx, vy, vz, sx, sy, sz (split) } the leader; R the murmuration rows; hawk { x, y, z, r } | null */
  step(dt, frame, L, R = null, hawk = null) {
    const n = this.count, P = this.p, V = this.v, NV = this.v2;
    const cruise = (this.vmin + this.vmax) / 2;
    for (let i = 0; i < n; i++) {
      const o = i * 3, px = P[o], py = P[o + 1], pz = P[o + 2], vx = V[o], vy = V[o + 1], vz = V[o + 2];
      const seed = birdSeed(i);
      let ax = 0, ay = 0, az = 0, alx = 0, aly = 0, alz = 0, nb = 0, alarm = 0, bankAdd = 0;
      if (this.mode === "lattice") {
        const nx = this.nx, ny = this.ny, lx = i % nx, ly = Math.floor(i / nx) % ny, rest = this.rest;
        for (const [ox, oy, oz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          if (ox > 0 && !(lx < nx - 1)) continue; if (ox < 0 && !(lx > 0)) continue;
          if (oy > 0 && !(ly < ny - 1)) continue; if (oy < 0 && !(ly > 0)) continue;
          const nl = i + ox + nx * oy + nx * ny * oz; if (nl < 0 || nl >= n) continue;
          const q = nl * 3, dx = P[q] - px, dy = P[q + 1] - py, dz = P[q + 2] - pz, d = Math.max(Math.hypot(dx, dy, dz), 0.01);
          const pull = (Math.max(d - rest * 1.5, 0) * 0.9 - Math.max(rest * 0.65 - d, 0) * 6) * this.cohesion;
          ax += (dx / d) * pull; ay += (dy / d) * pull; az += (dz / d) * pull;
          alx += V[q]; aly += V[q + 1]; alz += V[q + 2]; nb++;
        }
      } else if (this.old) {
        const sr = 0.4 * 2.6, sr2 = sr * sr; let sx = 0, sy = 0, sz = 0, cx = 0, cy = 0, cz = 0, nc = 0;
        for (let k = 0; k < n; k++) {
          if (k === i) continue;
          const q = k * 3, dx = P[q] - px, dy = P[q + 1] - py, dz = P[q + 2] - pz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 144) {
            alx += V[q]; aly += V[q + 1]; alz += V[q + 2]; nb++; cx += dx; cy += dy; cz += dz; nc++;
            if (d2 < sr2) { const f = sr2 / 1.96 / Math.max(d2, 0.04); sx -= dx * f; sy -= dy * f; sz -= dz * f; }
          }
        }
        ax += sx * this.sep * 2.5; ay += sy * this.sep * 2.5; az += sz * this.sep * 2.5;
        if (nc > 0) { const k = (this.cohesion * 0.35) / nc; ax += cx * k; ay += cy * k; az += cz * k; }
      } else {
        // topological: the 7 nearest (by last frame's 7th distance), a dead band, alignment; the new 7th distance
        const r = this.r[i] > 0 ? this.r[i] : 30, r2 = r * r, sp = this.spacing * (0.75 + 0.5 * hashU(seed + 26));   // each bird its own spacing (no crystal)
        const T = [1e8, 1e8, 1e8, 1e8, 1e8, 1e8, 1e8];
        let sx = 0, sy = 0, sz = 0, cx = 0, cy = 0, cz = 0;
        for (let k = 0; k < n; k++) {
          if (k === i) continue;
          const q = k * 3, dx = P[q] - px, dy = P[q + 1] - py, dz = P[q + 2] - pz, d2 = dx * dx + dy * dy + dz * dz;
          let c = d2; for (let t = 0; t < 7; t++) { const lo = Math.min(c, T[t]); c = Math.max(c, T[t]); T[t] = lo; }
          if (d2 < r2) {
            const d = Math.sqrt(Math.max(d2, 1e-4));
            const ps = Math.max(sp - d, 0) * DAY.sep * this.sep, pc = Math.max(d - sp * DAY.band, 0) * DAY.coh * this.cohesion;
            sx -= (dx / d) * ps; sy -= (dy / d) * ps * DAY.sepY; sz -= (dz / d) * ps;
            cx += (dx / d) * pc; cy += (dy / d) * pc; cz += (dz / d) * pc;
            alx += V[q]; aly += V[q + 1]; alz += V[q + 2]; nb++;
          }
        }
        this.r[i] = Math.min(Math.max(Math.sqrt(T[6]) * 1.02 + 0.01, sp * 0.5), 120);
        ax += sx; ay += sy; az += sz;
        if (nb > 0) { ax += cx / nb; ay += cy / nb; az += cz / nb; }
      }
      if (nb > 0) { const k = this.align * (this.old || this.mode === "lattice" ? 1.6 : DAY.align); ax += (alx / nb - vx) * k; ay += (aly / nb - vy) * k; az += (alz / nb - vz) * k; }
      if (this.mode === "lattice") {
        const hl = Math.hypot(R.hx, R.hz) || 1, Hx = R.hx / hl, Hz = R.hz / hl;
        const Rx = -Hz, Rz = Hx;                         // cross(H, up), normalised
        const f = formationOffset(i, n, this.nx, this.ny, this.rest, R, seed);
        const gx = L.x + Rx * f.ox + Hx * f.oz - px, gy = L.y + f.oy - py, gz = L.z + Rz * f.ox + Hz * f.oz - pz, gl = Math.hypot(gx, gy, gz);
        const k = (Math.min(gl, 40) / Math.max(gl, 0.01)) * (this.old ? 0.45 : MUR.form);
        ax += gx * k; ay += gy * k; az += gz * k;
        bankAdd = this.old ? 0 : R.waveAmp * Math.sin(f.wd * 7.5 - R.densPh * 1.3);
      } else if (this.old) {
        const tx = L.x - px, ty = L.y - py, tz = L.z - pz, dh = Math.max(Math.hypot(tx, tz), 0.01), outR = Math.max(dh - this.radius, 0);
        const k = (outR * 0.06 + Math.min(dh, 30) * 0.015) / dh; ax += tx * k; az += tz * k; ay += Math.max(-4, Math.min(4, ty * 0.12));
        ax += (-tz / dh) * this.circle; az += (tx / dh) * this.circle;
      } else {
        // the leader: informed birds steer for its heading (3 s ahead, each to its place across the front); the rest when straying
        const inf = hashU(seed + 21) < this.informed, grpB = hashU(seed + 22) < 0.5;
        const lx = L.x + (grpB ? L.sx : 0) + (hashU(seed + 23) - 0.5) * this.radius * 0.8, ly = L.y + (grpB ? L.sy : 0) + (hashU(seed + 24) - 0.5) * Math.min(this.radius * 0.25, 6), lz = L.z + (grpB ? L.sz : 0) + (hashU(seed + 25) - 0.5) * this.radius * 0.8;
        const tx = lx + L.vx * DAY.ahead - px, ty = ly + L.vy * DAY.ahead - py, tz = lz + L.vz * DAY.ahead - pz, tl = Math.max(Math.hypot(tx, ty, tz), 0.01);
        const dist = Math.hypot(L.x - px, L.y - py, L.z - pz);
        const st = Math.min(Math.max((dist - this.radius) / (this.radius * 1.5), 0), 1);
        const kg = inf ? DAY.lead : DAY.stray * st * st * (3 - 2 * st) + 0.05;
        ax += ((tx / tl) * cruise - vx) * kg; ay += ((ty / tl) * cruise - vy) * kg; az += ((tz / tl) * cruise - vz) * kg;
        ay += (L.vy - vy) * DAY.level;            // fly level with the group (day flocks travel as flat parties)
      }
      if (hawk) {
        const dx = px - hawk.x, dy = py - hawk.y, dz = pz - hawk.z, d = Math.max(Math.hypot(dx, dy, dz), 0.5);
        if (d < hawk.r) { const k = 1 - d / hawk.r, f = k * k * 40; ax += (dx / d) * f; ay += (dy / d) * f + k * 6; az += (dz / d) * f; alarm = Math.max(alarm, k); }
      }
      // the noise (the GPU's per-frame hash)
      const f3 = (frame * 3) >>> 0;
      ax += (hashU(seed + f3) - 0.5) * 3; ay += (hashU(seed + f3 + 1) - 0.5) * 1.2; az += (hashU(seed + f3 + 2) - 0.5) * 3;
      let nvx = vx + ax * dt, nvy = vy + ay * dt, nvz = vz + az * dt;
      const vmax = this.vmax * (alarm * 0.45 + 1), spd = Math.max(Math.hypot(nvx, nvy, nvz), 0.01), s = Math.min(Math.max(spd, this.vmin), vmax) / spd;
      nvx *= s; nvy *= s; nvz *= s; nvy = Math.min(Math.max(nvy, vmax * -0.55), vmax * 0.45);
      NV[o] = nvx; NV[o + 1] = nvy; NV[o + 2] = nvz;
      void bankAdd;
    }
    for (let i = 0; i < n * 3; i++) { V[i] = NV[i]; P[i] += V[i] * dt; }
  }
}

// ------------------------------------------------------------------------------------------------ shape metrics
/** principal axes (sqrt eigenvalues of the covariance, a >= b >= c), centroid, extent (2 x 2 sigma of the long axis) */
export function principalAxes(P, n) {
  let mx = 0, my = 0, mz = 0;
  for (let i = 0; i < n; i++) { mx += P[i * 3]; my += P[i * 3 + 1]; mz += P[i * 3 + 2]; }
  mx /= n; my /= n; mz /= n;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3] - mx, y = P[i * 3 + 1] - my, z = P[i * 3 + 2] - mz;
    xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z;
  }
  const C = [[xx / n, xy / n, xz / n], [xy / n, yy / n, yz / n], [xz / n, yz / n, zz / n]];
  const ev = eigSym3(C).sort((a, b) => b - a).map((e) => Math.sqrt(Math.max(e, 0)));
  return { a: ev[0], b: ev[1], c: ev[2], cx: mx, cy: my, cz: mz };
}
function eigSym3(A) {   // Jacobi rotations
  const a = A.map((r) => r.slice());
  for (let it = 0; it < 30; it++) {
    let p = 0, q = 1, m = Math.abs(a[0][1]);
    if (Math.abs(a[0][2]) > m) { p = 0; q = 2; m = Math.abs(a[0][2]); }
    if (Math.abs(a[1][2]) > m) { p = 1; q = 2; m = Math.abs(a[1][2]); }
    if (m < 1e-12) break;
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]), c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < 3; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = c * x - s * y; a[k][q] = s * x + c * y; }
    for (let k = 0; k < 3; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = c * x - s * y; a[q][k] = s * x + c * y; }
  }
  return [a[0][0], a[1][1], a[2][2]];
}
/** nearest-neighbour distances (grid hash), sorted */
export function nnDistances(P, n) {
  const cell = 4, G = new Map(), key = (x, y, z) => `${x},${y},${z}`;
  for (let i = 0; i < n; i++) { const k = key(Math.floor(P[i * 3] / cell), Math.floor(P[i * 3 + 1] / cell), Math.floor(P[i * 3 + 2] / cell)); (G.get(k) ?? G.set(k, []).get(k)).push(i); }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    let best = Infinity;
    for (let R = 1; R <= 16 && best > (R - 1) * cell; R *= 2) {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (let c = -R; c <= R; c++) {
        const L = G.get(key(cx + a, cy + b, cz + c)); if (!L) continue;
        for (const j of L) if (j !== i) { const d = Math.hypot(P[j * 3] - x, P[j * 3 + 1] - y, P[j * 3 + 2] - z); if (d < best) best = d; }
      }
    }
    out[i] = best;
  }
  return out.sort();
}
/** the flock as seen from a ground camera `dist` m away, looking up 30 deg (pixelScale px per m at 1 m: 1080p, 60 deg
 *  fov ~ 935): extent in px (2 x 2 sigma along the screen's long axis), the fraction of birds whose chevron overlaps a
 *  neighbour's (screen distance < its drawn width: they merge into a blob) */
export function screenTerms(P, n, span, dist, pixelScale = 935) {
  const ax = principalAxes(P, n);
  // view direction: from a camera `dist` m away horizontally-ish, 30 deg up; screen axes right (horizontal), up
  const el = (30 * Math.PI) / 180, fx = Math.cos(el), fy = Math.sin(el);  // looking +x and up
  const camx = ax.cx - fx * dist, camy = ax.cy - fy * dist, camz = ax.cz;
  const S = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    const dx = P[i * 3] - camx, dy = P[i * 3 + 1] - camy, dz = P[i * 3 + 2] - camz;
    const depth = dx * fx + dy * fy, right = dz, up = -dx * fy + dy * fx;
    S[i * 2] = (right / depth) * pixelScale; S[i * 2 + 1] = (up / depth) * pixelScale;
  }
  // screen PCA
  let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += S[i * 2]; my += S[i * 2 + 1]; } mx /= n; my /= n;
  let xx = 0, xy = 0, yy = 0; for (let i = 0; i < n; i++) { const x = S[i * 2] - mx, y = S[i * 2 + 1] - my; xx += x * x; xy += x * y; yy += y * y; }
  xx /= n; xy /= n; yy /= n;
  const tr = xx + yy, det = xx * yy - xy * xy, l1 = tr / 2 + Math.sqrt(Math.max(tr * tr / 4 - det, 0)), l2 = tr / 2 - Math.sqrt(Math.max(tr * tr / 4 - det, 0));
  const birdPx = Math.max(span * pixelScale / dist, 2.2);           // the far chevron's drawn width (>= 2.2 px)
  let merged = 0;
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    for (let j = 0; j < n; j++) if (j !== i) { const d = Math.hypot(S[i * 2] - S[j * 2], S[i * 2 + 1] - S[j * 2 + 1]); if (d < best) best = d; }
    if (best < birdPx) merged++;
  }
  return { extentPx: 4 * Math.sqrt(l1), extentPx2: 4 * Math.sqrt(Math.max(l2, 0)), birdPx, merged: merged / n };
}
