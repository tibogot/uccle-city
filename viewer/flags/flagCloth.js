// FLAG CLOTH: a small Verlet (position-based) cloth, the flag on its pole, in metres and seconds.
//   - particles on an nx x ny grid (x = along the fly, from the hoist; y = down the hoist), the hoist column pinned
//     to the pole (any pole direction: vertical masts or the angled poles of a balcony);
//   - constraints: structural (grid edges), shear (diagonals), bending (two apart, softer), solved a few times per
//     step (Jakobsen-style relaxation);
//   - forces: gravity and an aerodynamic pressure per triangle (relative wind along the normal, times area, the
//     drag law F = 0.5 rho Cd A (n.v)|v| n), plus a small tangential skin drag; a fixed step (default 1/120 s) with an
//     accumulator, so the motion is the same at any frame rate;
//   - long-range tethers keep the cloth from stretching in strong wind at only 4 iterations (~0.08 ms per flag and
//     60 fps frame on the owner's machine, Node, 13 x 9 particles);
//   - wind: speed and direction + gusts (a sum of a few sines, PERIODIC over `period` s when asked, so a recorded
//     loop closes) + a travelling ripple across the cloth.
// Same idea as the three.js cloth example and game-engine-v1's flagFactory.js (read only), written for this project.
// Used live for near flags (flagField.js) and offline-at-boot to record the looping vertex animation of far flags
// (bakeLoop below).

const G = 9.81, RHO = 1.2;

export const FABRIC = {
  // kg/m2 (knitted polyester flag ~0.11), damping per step, constraint stiffness, bending share, drag coefficient
  polyester: { density: 0.11, damping: 0.995, stiffness: 1.0, bending: 0.25, cd: 1.2 },
  nylon:     { density: 0.09, damping: 0.996, stiffness: 1.0, bending: 0.15, cd: 1.15 },
  heavy:     { density: 0.25, damping: 0.993, stiffness: 1.0, bending: 0.45, cd: 1.25 },
};

export class FlagCloth {
  /**
   * @param {object} o
   * @param {number} o.width  fly length (m)   @param {number} o.height hoist length (m)
   * @param {number} [o.nx=13] particles along the fly   @param {number} [o.ny=9] along the hoist
   * @param {number[]} [o.axis=[0,1,0]] pole direction (unit, pointing UP the pole), in the sim frame (world axes)
   * @param {number[]} [o.out=[1,0,0]] initial fly direction (made perpendicular to the axis)
   * @param {object} [o.fabric=FABRIC.polyester]
   * @param {number} [o.iterations=4] @param {number} [o.dt=1/90]
   * @param {number[][]} [o.planes] collision half-spaces [nx, ny, nz, d] in the sim frame (keep n.p >= d): a wall
   */
  constructor({ width = 1.5, height = 1.0, nx = 13, ny = 9, axis = [0, 1, 0], out = [1, 0, 0], fabric = FABRIC.polyester,
    iterations = 4, dt = 1 / 90, planes = [] } = {}) {
    Object.assign(this, { width, height, nx, ny, fabric: { ...fabric }, iterations, dt, planes });
    const n = nx * ny;
    this.count = n;
    this.pos = new Float64Array(n * 3);
    this.prev = new Float64Array(n * 3);
    this.force = new Float64Array(n * 3);
    this.mass = (fabric.density * width * height) / n;
    this.time = 0; this._acc = 0;
    // the pole frame: a = up the pole, o = out (fly), the hoist from the top (origin) down -a
    const a = norm(axis), o0 = sub(out, scale(a, dot(out, a))), o = norm(len(o0) > 1e-4 ? o0 : [1, 0, 0]);
    this.axis = a; this.outDir = o;
    this._side = norm([a[1] * o[2] - a[2] * o[1], a[2] * o[0] - a[0] * o[2], a[0] * o[1] - a[1] * o[0]]);
    this.pins = new Float32Array(ny * 3);
    for (let j = 0; j < ny; j++) {
      const t = (j / (ny - 1)) * height;
      this.pins.set([-a[0] * t, -a[1] * t, -a[2] * t], j * 3);
    }
    this.reset();
    // constraints [i, j, rest, stiffness]
    const c = [];
    const id = (i, j) => j * nx + i, dx = width / (nx - 1), dy = height / (ny - 1), dd = Math.hypot(dx, dy);
    const k = fabric.stiffness, kb = fabric.bending;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (i + 1 < nx) c.push(id(i, j), id(i + 1, j), dx, k);
      if (j + 1 < ny) c.push(id(i, j), id(i, j + 1), dy, k);
      if (i + 1 < nx && j + 1 < ny) { c.push(id(i, j), id(i + 1, j + 1), dd, k * 0.6); c.push(id(i + 1, j), id(i, j + 1), dd, k * 0.6); }
      if (i + 2 < nx) c.push(id(i, j), id(i + 2, j), 2 * dx, kb);
      if (j + 2 < ny) c.push(id(i, j), id(i, j + 2), 2 * dy, kb);
    }
    // long-range tethers (NvCloth-style long range attachments): each particle may not get further from the hoist
    // than its rest distance to the nearest pins (its own row's pin, and the hoist's top and bottom): one-sided, cheap,
    // and they stop the stretch a few constraint iterations leave in strong wind
    const tA = [], tR = [];
    for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) {
      const x = i * dx;
      for (const jp of [j, 0, ny - 1]) { tA.push(id(i, j) * 3, jp); tR.push(Math.hypot(x, (j - jp) * dy)); }
    }
    this.tA = new Int32Array(tA); this.tR = new Float64Array(tR);
    this.cons = new Float64Array(c);               // [i, j, rest, stiffness] (kept for tools)
    const nc = c.length / 4;
    this.cA = new Int32Array(nc); this.cB = new Int32Array(nc); this.cR = new Float64Array(nc); this.cS = new Float64Array(nc);
    for (let q = 0; q < nc; q++) { this.cA[q] = c[q * 4] * 3; this.cB[q] = c[q * 4 + 1] * 3; this.cR[q] = c[q * 4 + 2]; this.cS[q] = c[q * 4 + 3] * 0.5; }
    // triangles (for the wind pressure and the mesh): two per grid cell
    const tri = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const p = id(i, j), q = id(i + 1, j), r = id(i, j + 1), s = id(i + 1, j + 1);
      tri.push(p, r, q, q, r, s);
    }
    this.index = new Uint16Array(tri);
    this.uv = new Float32Array(n * 2);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { this.uv[(j * nx + i) * 2] = i / (nx - 1); this.uv[(j * nx + i) * 2 + 1] = 1 - j / (ny - 1); }
    this.wind = { speed: 6, dir: [1, 0, 0], gust: 0.35, turbulence: 0.25, period: 0, seed: Math.random() * 100 };
  }

  /** flat rest pose: hanging out along `out`, slightly drooping */
  reset() {
    const { nx, ny, width, height } = this, o = this.outDir, a = this.axis;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3, x = (i / (nx - 1)) * width, y = (j / (ny - 1)) * height;
      const side = Math.sin(i * 1.7 + j * 0.9) * 0.01 * (i / (nx - 1));      // a tiny ripple off the plane, so it can fold
      const b = this._side;
      for (let c = 0; c < 3; c++) this.pos[k + c] = o[c] * x * 0.98 - a[c] * (y + x * 0.05) + b[c] * side;
    }
    this.prev.set(this.pos);
    this.time = 0; this._acc = 0;
  }

  /** copy a recorded state (positions now and one step before) so a live sim continues a baked loop seamlessly */
  setState(posNow, posBefore) { this.pos.set(posNow); this.prev.set(posBefore); }

  windAt(t) {
    const w = this.wind;
    let g;
    if (w.period > 0) {                      // periodic gusts: harmonics of 1/period, so the loop closes
      const f = (2 * Math.PI) / w.period, s = w.seed;
      g = 0.55 * Math.sin(f * t + s) + 0.3 * Math.sin(2 * f * t + 1.7 * s) + 0.15 * Math.sin(5 * f * t + 0.3 * s);
    } else {
      const s = w.seed;
      g = 0.55 * Math.sin(0.37 * t + s) + 0.3 * Math.sin(0.91 * t + 1.7 * s) + 0.15 * Math.sin(2.3 * t + 0.3 * s);
    }
    return w.speed * Math.max(0, 1 + w.gust * g);
  }

  /** advance by `dt` seconds of real time (fixed sub-steps; at most `maxSteps` per call) */
  update(dt, maxSteps = 4) {
    this._acc = Math.min(this._acc + dt, this.dt * maxSteps);
    let n = 0;
    while (this._acc >= this.dt) { this.step(); this._acc -= this.dt; n++; }
    return n;
  }

  step() {
    const { pos, prev, force, nx, ny, index, mass, fabric, dt, cA, cB, cR, cS } = this, n = this.count, nc = cA.length;
    const t = this.time, w = this.wind, speed = this.windAt(t), d = w.dir;
    const turb = w.turbulence, per = w.period > 0 ? (2 * Math.PI) / w.period : 1.3;
    force.fill(0);
    for (let k = 0; k < n; k++) force[k * 3 + 1] -= G * mass;
    // aerodynamic pressure per triangle, wind relative to the cloth's own velocity
    const half = 0.5 * RHO * fabric.cd;
    for (let f = 0; f < index.length; f += 3) {
      const ia = index[f] * 3, ib = index[f + 1] * 3, ic = index[f + 2] * 3;
      const ux = pos[ib] - pos[ia], uy = pos[ib + 1] - pos[ia + 1], uz = pos[ib + 2] - pos[ia + 2];
      const vx = pos[ic] - pos[ia], vy = pos[ic + 1] - pos[ia + 1], vz = pos[ic + 2] - pos[ia + 2];
      let nxv = uy * vz - uz * vy, nyv = uz * vx - ux * vz, nzv = ux * vy - uy * vx;
      const l2 = Math.sqrt(nxv * nxv + nyv * nyv + nzv * nzv); if (l2 < 1e-9) continue;
      const area = 0.5 * l2; nxv /= l2; nyv /= l2; nzv /= l2;
      // a ripple travelling down-wind across the flag: varies the local wind direction a little
      const cx = (pos[ia] + pos[ib] + pos[ic]) / 3, cz = (pos[ia + 2] + pos[ib + 2] + pos[ic + 2]) / 3, cy = (pos[ia + 1] + pos[ib + 1] + pos[ic + 1]) / 3;
      const ph = (cx * d[0] + cz * d[2]) * 2.1 - t * per * 2;
      const wob = turb * Math.sin(ph + cy * 1.7), wob2 = turb * 0.6 * Math.sin(ph * 1.3 + 2.1);
      const wx = speed * (d[0] - d[2] * wob), wy = speed * wob2 * 0.5, wz = speed * (d[2] + d[0] * wob);
      // cloth velocity at the triangle (Verlet: (pos - prev) / dt)
      const cvx = (pos[ia] + pos[ib] + pos[ic] - prev[ia] - prev[ib] - prev[ic]) / (3 * dt);
      const cvy = (pos[ia + 1] + pos[ib + 1] + pos[ic + 1] - prev[ia + 1] - prev[ib + 1] - prev[ic + 1]) / (3 * dt);
      const cvz = (pos[ia + 2] + pos[ib + 2] + pos[ic + 2] - prev[ia + 2] - prev[ib + 2] - prev[ic + 2]) / (3 * dt);
      const rx = wx - cvx, ry = wy - cvy, rz = wz - cvz, rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
      const vn = rx * nxv + ry * nyv + rz * nzv;
      const fn = (half * area * vn * rl) / 3;                       // normal pressure, shared by the three corners
      const ft = (0.02 * RHO * area * rl) / 3;                      // skin drag along the relative wind
      const fx = nxv * fn + rx * ft, fy = nyv * fn + ry * ft, fz = nzv * fn + rz * ft;
      force[ia] += fx; force[ia + 1] += fy; force[ia + 2] += fz;
      force[ib] += fx; force[ib + 1] += fy; force[ib + 2] += fz;
      force[ic] += fx; force[ic + 1] += fy; force[ic + 2] += fz;
    }
    // Verlet integration
    const damp = fabric.damping, dt2 = (dt * dt) / mass;
    for (let k = 0; k < n * 3; k++) {
      const p = pos[k], v = (p - prev[k]) * damp;
      prev[k] = p; pos[k] = p + v + force[k] * dt2;
    }
    // constraints, then the pinned hoist
    for (let it = 0; it < this.iterations; it++) {
      for (let c = 0; c < nc; c++) {
        const a = cA[c], b = cB[c];
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz); if (l < 1e-9) continue;
        const corr = ((l - cR[c]) / l) * cS[c];
        pos[a] += dx * corr; pos[a + 1] += dy * corr; pos[a + 2] += dz * corr;
        pos[b] -= dx * corr; pos[b + 1] -= dy * corr; pos[b + 2] -= dz * corr;
      }
      for (let j = 0; j < ny; j++) { const k = j * nx * 3; pos[k] = this.pins[j * 3]; pos[k + 1] = this.pins[j * 3 + 1]; pos[k + 2] = this.pins[j * 3 + 2]; }
    }
    const { tA, tR, pins } = this;
    for (let q = 0, m = tR.length; q < m; q++) {
      const k = tA[q * 2], pj = tA[q * 2 + 1] * 3;
      const dx = pos[k] - pins[pj], dy = pos[k + 1] - pins[pj + 1], dz = pos[k + 2] - pins[pj + 2];
      const l = Math.sqrt(dx * dx + dy * dy + dz * dz), r = tR[q];
      if (l > r) { const f = r / l; pos[k] = pins[pj] + dx * f; pos[k + 1] = pins[pj + 1] + dy * f; pos[k + 2] = pins[pj + 2] + dz * f; }
    }
    // walls: push particles back in front of each plane; friction by moving `prev` the same way
    for (const pl of this.planes) {
      const [px, py, pz, pd] = pl;
      for (let k = 0; k < n * 3; k += 3) {
        const sd = px * pos[k] + py * pos[k + 1] + pz * pos[k + 2] - pd;
        if (sd < 0) {
          pos[k] -= px * sd; pos[k + 1] -= py * sd; pos[k + 2] -= pz * sd;
          const sp = px * prev[k] + py * prev[k + 1] + pz * prev[k + 2] - pd;
          if (sp < 0) { prev[k] -= px * sp; prev[k + 1] -= py * sp; prev[k + 2] -= pz * sp; }
          prev[k] += (pos[k] - prev[k]) * 0.3; prev[k + 1] += (pos[k + 1] - prev[k + 1]) * 0.3; prev[k + 2] += (pos[k + 2] - prev[k + 2]) * 0.3;
        }
      }
    }
    for (let j = 0; j < ny; j++) { const k = j * nx * 3; prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2]; }
    this.time += dt;
  }

  /** smooth vertex normals into `out` (Float32Array n*3), area-weighted */
  normals(out, pos = this.pos) {
    out.fill(0);
    const idx = this.index;
    for (let f = 0; f < idx.length; f += 3) {
      const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
      out[a] += x; out[a + 1] += y; out[a + 2] += z; out[b] += x; out[b + 1] += y; out[b + 2] += z; out[c] += x; out[c + 1] += y; out[c + 2] += z;
    }
    for (let k = 0; k < out.length; k += 3) { const l = Math.sqrt(out[k] * out[k] + out[k + 1] * out[k + 1] + out[k + 2] * out[k + 2]) || 1; out[k] /= l; out[k + 1] /= l; out[k + 2] /= l; }
    return out;
  }
}

/**
 * Record a seamless loop of the flag in a given wind (along opts.windDir, default +x): warm up, record frames + an overlap, cross-fade the overlap
 * into the start. Returns { frames, fps, count, pos: Float32Array(frames*count*3), nrm: same, prevOfFirst }.
 * `prevOfFirst[f]` = the state one sim step before frame f (to hand a baked flag over to a live sim seamlessly).
 */
export function bakeLoop(opts, { speed = 6, gust = 0.35, turbulence = 0.25, frames = 72, fps = 24, warmup = 4, overlap = 12, seed = 1.3 } = {}) {
  const cloth = new FlagCloth(opts);
  const perFrame = Math.max(1, Math.round(1 / fps / cloth.dt));
  fps = 1 / (perFrame * cloth.dt);                     // the recorded rate is a whole number of sim steps per frame
  const period = frames / fps;                         // and the gusts repeat exactly over the recording
  Object.assign(cloth.wind, { speed, gust, turbulence, period, seed, dir: opts.windDir ?? [1, 0, 0] });
  const n = cloth.count, sz = n * 3;
  // warm up a whole number of periods so the recording starts in phase with the gusts
  const warm = Math.max(1, Math.round(warmup / period)) * frames * perFrame;
  for (let s = 0; s < warm; s++) cloth.step();
  const total = frames + overlap, rec = new Float32Array(total * sz), recPrev = new Float32Array(total * sz);
  for (let f = 0; f < total; f++) {
    rec.set(cloth.pos, f * sz); recPrev.set(cloth.prev, f * sz);
    for (let s = 0; s < perFrame; s++) cloth.step();
  }
  const pos = new Float32Array(frames * sz), prevOfFirst = new Float32Array(frames * sz);
  pos.set(rec.subarray(0, frames * sz)); prevOfFirst.set(recPrev.subarray(0, frames * sz));
  // cross-fade: frame f < overlap = mix(rec[frames + f], rec[f], f / overlap): continuous from the last frame
  for (let f = 0; f < overlap; f++) {
    const w = smooth(f / overlap);
    for (let k = 0; k < sz; k++) {
      pos[f * sz + k] = rec[(frames + f) * sz + k] * (1 - w) + rec[f * sz + k] * w;
      prevOfFirst[f * sz + k] = recPrev[(frames + f) * sz + k] * (1 - w) + recPrev[f * sz + k] * w;
    }
  }
  // re-pin the hoist exactly (the blend keeps it, but be exact) and compute the normals
  const nrm = new Float32Array(frames * sz), tmp = new Float32Array(sz);
  for (let f = 0; f < frames; f++) {
    for (let j = 0; j < cloth.ny; j++) pos.set(cloth.pins.subarray(j * 3, j * 3 + 3), f * sz + j * cloth.nx * 3);
    cloth.normals(tmp, pos.subarray(f * sz, (f + 1) * sz)); nrm.set(tmp, f * sz);
  }
  return { frames, fps, perFrame, count: n, pos, nrm, prevOfFirst, cloth };
}

const smooth = (x) => x * x * (3 - 2 * x);
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function len(a) { return Math.hypot(a[0], a[1], a[2]); }
function norm(a) { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
