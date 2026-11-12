// FERAL PIGEONS of Place de Saint-Job (Falcon Flight Lab): 50-200 birds roosting on the ridges round the Place, on the
// church's wing ridges and drum cornice, feeding on the setts; taking off in a burst when the falcon comes (the alarm
// spreads to the neighbours: the clatter of a flock leaving a roof), flying as boids (Reynolds 1987: separation,
// alignment, cohesion) round the Place, fleeing the falcon with a strength that grows as it closes and a sudden jink
// when it is about to strike (the HoPE pigeons, Papadopoulou et al. 2022: docs/FALCON_FLIGHT_RESEARCH.md), then
// coming back to free roosts, one by one.
//
// Cost: the CPU step on a 6 m hash grid (only the flying birds look for neighbours), one instanced draw: a scripted
// low-poly pigeon (~110 triangles: lofted body, head, beak, fanned tail, two-segment wings with the two dark bars) whose
// wings flap, glide in a V and fold in the VERTEX SHADER from a per-bird phase / amplitude / fold (the idea of three.js
// r187's examples/webgpu_compute_birds.html, with our own lit mesh).
import * as THREE from "three/webgpu";
import { attribute, vec3, vec4, float, sin, cos, abs, sign, normalize, cross, mix, positionLocal, smoothstep, max } from "three/tsl";

const PERCH = 0, FLY = 1, LAND = 2, GONE = 3;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const rand = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------------------------------------ the mesh
/** a feral pigeon, metres, nose +z, up +y, right +x; attributes: color, wing (signed span 0..1, 0 = body) */
export function pigeonGeometry() {
  const P = [], C = [], Wg = [];
  const BLUE = [0.42, 0.45, 0.52], NECK = [0.3, 0.4, 0.36], BAR = [0.12, 0.12, 0.14], PALE = [0.62, 0.64, 0.68], DARK = [0.16, 0.16, 0.19], BEAK = [0.2, 0.17, 0.16], FOOT = [0.62, 0.25, 0.24];
  const tri = (a, b, c, col, w = [0, 0, 0]) => { P.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { C.push(...(Array.isArray(col[0]) ? col[i] : col)); Wg.push(w[i]); } };
  const quad = (a, b, c, d, col, w) => { tri(a, b, c, col, w && [w[0], w[1], w[2]]); tri(a, c, d, col, w && [w[0], w[2], w[3]]); };
  // body: rings along z (tail end -0.16 .. breast +0.1), elliptic sections, 6 around
  const rings = [[-0.15, 0.022, 0.02, 0.005], [-0.09, 0.05, 0.045, 0.0], [-0.02, 0.062, 0.058, -0.004], [0.05, 0.058, 0.06, 0.0], [0.1, 0.036, 0.04, 0.02], [0.13, 0.02, 0.022, 0.035]];
  const N = 6;
  const ringPt = (r, k) => { const a = (k / N) * Math.PI * 2; return [Math.cos(a) * r[1], r[3] + Math.sin(a) * r[2], r[0]]; };
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < N; k++) {
    const a = ringPt(rings[i], k), b = ringPt(rings[i], k + 1), c = ringPt(rings[i + 1], k + 1), d = ringPt(rings[i + 1], k);
    const low = Math.sin(((k + 0.5) / N) * Math.PI * 2) < -0.3;
    const col = i >= 3 ? NECK : low ? PALE : BLUE;
    quad(a, d, c, b, col);
  }
  // head: a small octahedron-ish blob ahead of the neck, beak
  const hc = [0, 0.05, 0.155], hr = 0.026;
  const H = [[hr, 0, 0], [-hr, 0, 0], [0, hr, 0], [0, -hr * 0.8, 0], [0, 0, hr * 1.1], [0, 0, -hr]].map((v) => [v[0] + hc[0], v[1] + hc[1], v[2] + hc[2]]);
  const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  for (const [a, b, c] of faces) tri(H[a], H[b], H[c], DARK.map((x) => x * 1.6));
  const bt = [0, 0.045, 0.2], bl = [-0.007, 0.05, 0.178], br = [0.007, 0.05, 0.178], bb = [0, 0.04, 0.178];
  tri(bl, br, bt, BEAK); tri(br, bb, bt, BEAK); tri(bb, bl, bt, BEAK);
  // the neck's sheen ring + rings closed at the tail
  // tail: a fan (pale grey, the dark terminal band)
  const t0 = [-0.035, 0.012, -0.13], t1 = [0.035, 0.012, -0.13], t2 = [0.06, 0.008, -0.25], t3 = [-0.06, 0.008, -0.25];
  const t2b = [0.055, 0.008, -0.225], t3b = [-0.055, 0.008, -0.225];
  quad(t0, t3b, t2b, t1, BLUE); quad(t3b, t3, t2, t2b, DARK);
  quad(t1, t2b, t3b, t0, BLUE); quad(t2b, t2, t3, t3b, DARK);            // underside (two-sided)
  // feet (tiny, tucked) under the body
  tri([-0.015, -0.055, 0.0], [-0.005, -0.055, 0.0], [-0.01, -0.07, 0.02], FOOT); tri([0.005, -0.055, 0.0], [0.015, -0.055, 0.0], [0.01, -0.07, 0.02], FOOT);
  // wings: root at the shoulder (x +-0.03, y 0.035), inner panel to 0.16 (the two dark bars), outer hand to 0.33 (dark tips)
  for (const s of [1, -1]) {
    const X = (x) => s * x, w = (x) => s * (x - 0.03) / 0.30;
    const yW = 0.035;
    const r0 = [X(0.03), yW, 0.05], r1 = [X(0.03), yW, -0.07];
    const m0 = [X(0.16), yW, 0.045], m1 = [X(0.16), yW, -0.09];
    const mb0 = [X(0.16), yW, -0.03], rb0 = [X(0.03), yW, -0.02], mb1 = [X(0.16), yW, -0.05], rb1 = [X(0.03), yW, -0.04];
    const o0 = [X(0.33), yW, -0.02], o1 = [X(0.31), yW, -0.1], om = [X(0.25), yW, -0.1];
    const up = (a, b, c, col) => { tri(a, b, c, col, [w(Math.abs(a[0])), w(Math.abs(b[0])), w(Math.abs(c[0]))]); tri(a, c, b, col, [w(Math.abs(a[0])), w(Math.abs(c[0])), w(Math.abs(b[0]))]); };
    // inner panel in three chord strips: grey, bar, grey + bar, trailing grey
    up(r0, m0, mb0, BLUE); up(r0, mb0, rb0, BLUE);
    up(rb0, mb0, mb1, BAR); up(rb0, mb1, rb1, BAR);
    up(rb1, mb1, m1, PALE); up(rb1, m1, r1, PALE);
    // hand: grey to the dark primaries
    up(m0, o0, om, BLUE); up(m0, om, m1, BLUE); up(om, o0, o1, DARK);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute("wing", new THREE.Float32BufferAttribute(Wg, 1));
  return g;
}

export function pigeonMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, metalness: 0, flatShading: true, side: THREE.DoubleSide });
  const iPos = attribute("iPos", "vec4"), iDir = attribute("iDir", "vec4"), iAnim = attribute("iAnim", "vec4");
  const wing = attribute("wing", "float");
  const p = positionLocal;
  const s = abs(wing), side = sign(p.x);
  const phase = iAnim.x, amp = iAnim.y, fold = iAnim.z, lift = iAnim.w;
  // fold: the wing laid back along the body (span shrinks, the hand slides back over the tail)
  const ax0 = abs(p.x).sub(0.03).max(0);
  const fx = ax0.mul(float(1).sub(fold.mul(0.86)));
  const fz = p.z.sub(fold.mul(s).mul(0.2));
  const fy = p.y.add(fold.mul(s).mul(0.012));
  // flap about the shoulder: the angle grows and lags along the span (a bending wing), plus the V of the glide
  const th = amp.mul(float(0.75).add(s.mul(0.35))).mul(sin(phase.sub(s.mul(0.9)))).add(lift.mul(s.min(1)));
  const isWing = smoothstep(0.0, 0.02, s);
  const wx = float(0.03).add(fx.mul(cos(th))).sub(fy.sub(0.035).mul(sin(th)));
  const wy = float(0.035).add(fx.mul(sin(th))).add(fy.sub(0.035).mul(cos(th)));
  const local = vec3(mix(p.x, side.mul(wx), isWing), mix(p.y, wy, isWing), mix(p.z, fz, isWing));
  // the bird's frame from its forward vector and bank
  const f = normalize(iDir.xyz);
  const r0 = normalize(cross(f, vec3(0, 1, 0)).add(vec3(0.0001, 0, 0)));
  const u0 = cross(r0, f);
  const b = iDir.w;
  const r = r0.mul(cos(b)).add(u0.mul(sin(b))), u = u0.mul(cos(b)).sub(r0.mul(sin(b)));
  m.positionNode = iPos.xyz.add(r.mul(local.x).add(u.mul(local.y)).add(f.mul(local.z)).mul(iPos.w));
  m.colorNode = attribute("color", "vec3").mul(attribute("iTint", "vec3"));
  return m;
}

// ------------------------------------------------------------------------------------------------ the flock
export class Pigeons {
  /** world: { floor(x, z) }, roosts: [{ x, y, z, yaw, kind }], home: { x, z } (the Place), count, scale (draw size) */
  constructor({ world, roosts, home, count = 150, scale = 1.4 }) {
    this.world = world; this.roosts = roosts; this.home = home; this.scale = scale;
    this.max = 200; this.count = Math.min(count, this.max);
    const n = this.max;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3);
    this.state = new Uint8Array(n); this.roost = new Int32Array(n).fill(-1); this.timer = new Float32Array(n);
    this.phase = new Float32Array(n); this.alarm = new Float32Array(n); this.glide = new Float32Array(n); this.yaw = new Float32Array(n);
    this.fold = new Float32Array(n).fill(1); this.amp = new Float32Array(n); this.liftV = new Float32Array(n); this.bank = new Float32Array(n);
    this.flock = new Uint8Array(n); this.jink = new Float32Array(n);
    this.owner = new Int32Array(roosts.length).fill(-1);
    this.params = { sep: 1.6, align: 1.0, coh: 0.7, home: 0.5, flee: 40, startle: 32, cruise: 14, maxSpeed: 21, neighbour: 6 };
    this.flockHomes = [
      { x: home.x, z: home.z, r: 55, h: 32, w: 0.11 },
      { x: home.x + 60, z: home.z + 22, r: 45, h: 45, w: -0.13 },     // round the church
    ];
    // the mesh
    const base = pigeonGeometry();
    const g = new THREE.InstancedBufferGeometry();
    for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
    g.instanceCount = n;
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); this.aPos.setUsage(THREE.DynamicDrawUsage);
    this.aDir = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); this.aDir.setUsage(THREE.DynamicDrawUsage);
    this.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); this.aAnim.setUsage(THREE.DynamicDrawUsage);
    const tint = new Float32Array(n * 3);
    const MORPH = [[1, 1, 1], [1, 1, 1], [1, 1, 1], [0.78, 0.76, 0.8], [0.55, 0.52, 0.55], [1.25, 1.22, 1.18], [1.05, 0.95, 0.9], [0.9, 0.92, 1.0]];
    for (let i = 0; i < n; i++) { const t = MORPH[(i * 7 + 3) % MORPH.length]; const j = 0.92 + 0.16 * ((i * 0.618) % 1); tint.set([t[0] * j, t[1] * j, t[2] * j], i * 3); }
    g.setAttribute("iPos", this.aPos); g.setAttribute("iDir", this.aDir); g.setAttribute("iAnim", this.aAnim);
    g.setAttribute("iTint", new THREE.InstancedBufferAttribute(tint, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(home.x, 100, home.z), 600);
    this.mesh = new THREE.Mesh(g, pigeonMaterial());
    this.mesh.name = "pigeons"; this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    this.stats = { flying: 0, perched: 0, gone: 0, cpuMs: 0, takeoffs: 0 };
    this.events = [];                     // [{ kind: "burst", x, y, z, n }] for the sound
    // grid for the neighbours (flying birds only): 6 m cells over 600 m round the Place
    this.G = { x0: home.x - 300, z0: home.z - 300, cell: 6, n: 100 };
    this.cellStart = new Int32Array(this.G.n * this.G.n + 1); this.cellOf = new Int32Array(n); this.sorted = new Int32Array(n);
    // everyone on a roost at the start (ground ones too)
    const order = roosts.map((_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      this.phase[i] = Math.random() * 6.28; this.flock[i] = i % 3 === 0 ? 1 : 0;
      if (i < this.count && order.length) this.perch(i, order.pop()); else this.state[i] = GONE;
    }
  }

  setCount(c) {
    c = clamp(Math.round(c), 0, this.max);
    for (let i = 0; i < this.max; i++) {
      if (i >= c && this.state[i] !== GONE) this.vanish(i);
      if (i < c && this.state[i] === GONE && i >= this.count) { const r = this.freeRoost(this.home.x, this.home.z, 400); if (r >= 0) this.perch(i, r); }
    }
    this.count = c;
  }

  perch(i, r) {
    if (this.roost[i] >= 0 && this.owner[this.roost[i]] === i) this.owner[this.roost[i]] = -1;
    const R = this.roosts[r];
    this.state[i] = PERCH; this.roost[i] = r; this.owner[r] = i;
    this.p[i * 3] = R.x; this.p[i * 3 + 1] = R.y; this.p[i * 3 + 2] = R.z;
    this.v.fill(0, i * 3, i * 3 + 3);
    this.yaw[i] = R.yaw + rand(-0.4, 0.4); this.timer[i] = rand(60, 260); this.alarm[i] = 0;
  }
  vanish(i) { if (this.roost[i] >= 0 && this.owner[this.roost[i]] === i) this.owner[this.roost[i]] = -1; this.roost[i] = -1; this.state[i] = GONE; this.timer[i] = rand(25, 45); }

  /** the falcon took bird i: it is gone (a new one comes back to a roost later) */
  take(i) { const x = this.p[i * 3], y = this.p[i * 3 + 1], z = this.p[i * 3 + 2]; this.vanish(i); return { x, y, z }; }

  freeRoost(x, z, R, kind = null) {
    let best = -1, bd = Infinity;
    for (let k = 0; k < this.roosts.length; k++) {
      if (this.owner[k] >= 0) continue;
      const q = this.roosts[k]; if (kind && q.kind !== kind) continue;
      const d = Math.hypot(q.x - x, q.z - z) + Math.random() * 25;
      if (d < bd && d < R) { bd = d; best = k; }
    }
    return best;
  }

  takeoff(i, fx, fy, fz) {
    if (this.state[i] !== PERCH) return;
    if (this.roost[i] >= 0) this.owner[this.roost[i]] = -1;
    this.roost[i] = -1;
    const o = i * 3;
    let ax = this.p[o] - fx, az = this.p[o + 2] - fz; const L = Math.hypot(ax, az) || 1; ax /= L; az /= L;
    const ya = this.yaw[i];
    this.v[o] = ax * 5 + Math.sin(ya) * 2 + rand(-1, 1); this.v[o + 1] = rand(3.5, 5.5); this.v[o + 2] = az * 5 + Math.cos(ya) * 2 + rand(-1, 1);
    this.state[i] = FLY; this.timer[i] = rand(18, 40); this.fold[i] = 0.6;
    this.stats.takeoffs++;
    this._burst = (this._burst || 0) + 1; this._bx = this.p[o]; this._by = this.p[o + 1]; this._bz = this.p[o + 2];
  }

  /** falcon: { x, y, z, vx, vy, vz, speed } (world) */
  update(dt, t, falcon) {
    const t0 = performance.now();
    dt = Math.min(dt, 0.05);
    const P = this.params, n = this.max, p = this.p, v = this.v;
    const fx = falcon?.x ?? 1e9, fy = falcon?.y ?? 1e9, fz = falcon?.z ?? 1e9, fs = falcon?.speed ?? 0;
    const startle = P.startle * (fs > 30 ? 1.8 : 1) * (falcon?.stoop ? 1.3 : 1);
    this._burst = 0;
    // ---- perched: alarm from the falcon, or from neighbours leaving (spreads in ~0.1-0.4 s), the odd spontaneous flight
    let flying = 0;
    for (let i = 0; i < n; i++) {
      const s = this.state[i];
      if (s === GONE) {
        if (i < this.count && (this.timer[i] -= dt) < 0) {      // a new bird arrives at a free roost out of the falcon's way
          const r = this.freeRoost(this.home.x, this.home.z, 400);
          if (r >= 0 && Math.hypot(this.roosts[r].x - fx, this.roosts[r].z - fz) > 80) this.perch(i, r); else this.timer[i] = 5;
        }
        continue;
      }
      if (s !== PERCH) { flying++; continue; }
      const o = i * 3, d = Math.hypot(p[o] - fx, p[o + 1] - fy, p[o + 2] - fz);
      if (d < startle) this.alarm[i] = Math.max(this.alarm[i], 0.05 + Math.random() * 0.25 * (d / startle));
      if (this.alarm[i] > 0) { this.alarm[i] -= dt; if (this.alarm[i] <= 0) { this.takeoff(i, fx, fy, fz); this.spread(i); } }
      else if ((this.timer[i] -= dt) < 0) { this.takeoff(i, p[o] + rand(-5, 5), p[o + 1] - 3, p[o + 2] + rand(-5, 5)); this.timer[i] = rand(60, 260); }
    }
    if (this._burst > 0) this.events.push({ kind: "burst", x: this._bx, y: this._by, z: this._bz, n: this._burst });
    // ---- the hash grid of the flying birds
    const G = this.G, cs = this.cellStart, cellOf = this.cellOf;
    cs.fill(0);
    for (let i = 0; i < n; i++) {
      if (this.state[i] !== FLY && this.state[i] !== LAND) { cellOf[i] = -1; continue; }
      const cx = clamp(((p[i * 3] - G.x0) / G.cell) | 0, 0, G.n - 1), cz = clamp(((p[i * 3 + 2] - G.z0) / G.cell) | 0, 0, G.n - 1);
      cellOf[i] = cz * G.n + cx; cs[cellOf[i] + 1]++;
    }
    for (let k = 1; k < cs.length; k++) cs[k] += cs[k - 1];
    const fill = this._fill ??= new Int32Array(cs.length);
    fill.set(cs);
    for (let i = 0; i < n; i++) if (cellOf[i] >= 0) this.sorted[fill[cellOf[i]]++] = i;
    // ---- the flying birds: boids + home circuit + flee + floor, or the approach to a roost
    const R2 = P.neighbour * P.neighbour, sepR2 = 1.4 * 1.4;
    for (let i = 0; i < n; i++) {
      const s = this.state[i];
      if (s !== FLY && s !== LAND) continue;
      const o = i * 3;
      const x = p[o], y = p[o + 1], z = p[o + 2];
      let ax = 0, ay = 0, az = 0;
      const dfx = x - fx, dfy = y - fy, dfz = z - fz, df = Math.hypot(dfx, dfy, dfz);
      if (s === FLY) {
        // neighbours
        let nb = 0, sx = 0, sy = 0, sz = 0, mx = 0, my = 0, mz = 0, cx = 0, cy = 0, cz = 0;
        const c = cellOf[i], ci = c % G.n, cj = (c / G.n) | 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= G.n || jj >= G.n) continue;
          const k = jj * G.n + ii;
          for (let q = cs[k]; q < cs[k + 1]; q++) {
            const j = this.sorted[q]; if (j === i) continue;
            const oj = j * 3, ex = p[oj] - x, ey = p[oj + 1] - y, ez = p[oj + 2] - z, d2 = ex * ex + ey * ey + ez * ez;
            if (d2 > R2) continue;
            nb++; mx += v[oj]; my += v[oj + 1]; mz += v[oj + 2]; cx += ex; cy += ey; cz += ez;
            if (d2 < sepR2) { const k2 = 1 / Math.max(d2, 0.05); sx -= ex * k2; sy -= ey * k2; sz -= ez * k2; }
            if (this.state[j] === FLY && this.alarm[j] > 0.5 && this.alarm[i] < this.alarm[j]) this.alarm[i] = this.alarm[j] * 0.8;   // the panic spreads
          }
        }
        if (nb) {
          ax += sx * P.sep + (mx / nb - v[o]) * P.align * 0.6 + cx / nb * P.coh * 0.5;
          ay += sy * P.sep + (my / nb - v[o + 1]) * P.align * 0.6 + cy / nb * P.coh * 0.5;
          az += sz * P.sep + (mz / nb - v[o + 2]) * P.align * 0.6 + cz / nb * P.coh * 0.5;
        }
        // the home circuit: a point running round the flock's circle
        const H = this.flockHomes[this.flock[i]], a = t * H.w + (i % 7) * 0.08;
        const tx = H.x + Math.cos(a) * H.r, tz = H.z + Math.sin(a) * H.r, ty = this.world.floor(tx, tz) + H.h;
        const hx = tx - x, hy = ty - y, hz = tz - z, hl = Math.hypot(hx, hy, hz) || 1;
        ax += hx / hl * P.home * 3; ay += hy / hl * P.home * 2; az += hz / hl * P.home * 3;
        // flee: stronger the closer (HoPE: the escape grows with closeness), a jink when it is about to strike
        if (df < P.flee) {
          const k = (1 - df / P.flee) ** 2 * 26;
          ax += dfx / df * k; ay += (dfy / df) * k * 0.6 + k * 0.15; az += dfz / df * k;
          this.alarm[i] = Math.max(this.alarm[i], 1 - df / P.flee);
          if (df < 7 && this.jink[i] <= 0) { this.jink[i] = 0.6; const side = Math.random() < 0.5 ? -1 : 1; v[o] += -v[o + 2] / 3 * side; v[o + 2] += v[o] / 3 * side; v[o + 1] -= 3; }
        }
        this.alarm[i] = Math.max(0, this.alarm[i] - dt * 0.4);
        if (this.jink[i] > 0) this.jink[i] -= dt;
        // back to a roost after a while (and calm)
        if ((this.timer[i] -= dt) < 0 && this.alarm[i] < 0.1 && df > 60) {
          const r = this.freeRoost(x, z, 260, Math.random() < 0.25 ? "ground" : null);
          if (r >= 0) { this.state[i] = LAND; this.roost[i] = r; this.owner[r] = i; } else this.timer[i] = 5;
        }
      } else {
        // approach: arrive at the roost (slowing in the last 15 m), from a little above
        const R = this.roosts[this.roost[i]];
        const hx = R.x - x, hy = R.y + 0.5 - y, hz = R.z - z, hl = Math.hypot(hx, hy, hz);
        const want = clamp(hl * 0.7, 1.2, P.cruise);
        ax += (hx / hl * want - v[o]) * 2.2; ay += (hy / hl * want - v[o + 1]) * 2.2; az += (hz / hl * want - v[o + 2]) * 2.2;
        if (hl < 0.6) { this.perch(i, this.roost[i]); continue; }
        if (df < P.flee * 0.6) { this.owner[this.roost[i]] = -1; this.roost[i] = -1; this.state[i] = FLY; this.timer[i] = rand(15, 30); this.alarm[i] = 1; }
      }
      // the floor: keep 3 m off roofs and the ground (looking ahead 1 s)
      const lx = x + v[o] * 0.8, lz = z + v[o + 2] * 0.8, fl = Math.max(this.world.floor(x, z), this.world.floor(lx, lz));
      if (s === FLY && y < fl + 4) ay += (fl + 4 - y) * 4;
      // speed: cruise, faster in alarm
      v[o] += ax * dt; v[o + 1] += ay * dt; v[o + 2] += az * dt;
      const sp = Math.hypot(v[o], v[o + 1], v[o + 2]);
      const vmax = s === LAND ? P.cruise : P.cruise + (P.maxSpeed - P.cruise) * Math.min(1, this.alarm[i] * 1.5);
      const vmin = s === LAND ? 0 : 7;
      const k = sp > vmax ? vmax / sp : sp < vmin && sp > 0.01 ? vmin / sp : 1;
      v[o] *= k; v[o + 1] *= k; v[o + 2] *= k;
      if (v[o + 1] > 6) v[o + 1] = 6;
      p[o] += v[o] * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt;
      if (p[o + 1] < fl + 0.3 && s === FLY) { p[o + 1] = fl + 0.3; v[o + 1] = Math.abs(v[o + 1]); }
    }
    this.writeInstances(dt, t);
    let perched = 0, gone = 0;
    for (let i = 0; i < n; i++) { if (this.state[i] === PERCH) perched++; else if (this.state[i] === GONE) gone++; }
    this.stats.flying = n - perched - gone; this.stats.perched = perched; this.stats.gone = gone - (n - this.count);
    this.stats.cpuMs = this.stats.cpuMs * 0.95 + (performance.now() - t0) * 0.05;
    void flying;
  }

  writeInstances(dt, t) {
    const n = this.max, p = this.p, v = this.v, A = this.aPos.array, D = this.aDir.array, M = this.aAnim.array, sc = this.scale;
    for (let i = 0; i < n; i++) {
      const o = i * 3, q = i * 4, s = this.state[i];
      if (s === GONE) { A[q + 3] = 0; continue; }
      A[q] = p[o]; A[q + 1] = p[o + 1]; A[q + 2] = p[o + 2]; A[q + 3] = sc;
      let fold = this.fold[i], amp = this.amp[i], lift = this.liftV[i];
      const ease = (c, tg, r) => c + (tg - c) * (1 - Math.exp(-r * dt));
      if (s === PERCH) {
        const ground = this.roost[i] >= 0 && this.roosts[this.roost[i]].kind === "ground";
        // pecking on the ground (the body tips forward), a still perch on a ridge
        const peck = ground ? Math.max(0, Math.sin(t * 2.3 + i * 1.7)) ** 6 * 0.7 : 0;
        D[q] = Math.sin(this.yaw[i]); D[q + 1] = -peck; D[q + 2] = Math.cos(this.yaw[i]); D[q + 3] = 0;
        fold = ease(fold, 1, 6); amp = ease(amp, 0, 8); lift = ease(lift, 0, 6);
        A[q + 1] += 0.065 * sc;                                   // stands on its feet
      } else {
        const sp = Math.hypot(v[o], v[o + 1], v[o + 2]) || 1;
        // bank into the turn: the horizontal turn rate x speed
        const yaw = Math.atan2(v[o], v[o + 2]), dy = Math.atan2(Math.sin(yaw - this.yaw[i]), Math.cos(yaw - this.yaw[i]));
        this.yaw[i] = yaw;
        this.bank[i] = ease(this.bank[i], clamp(-dy / Math.max(dt, 1e-3) * sp / 9.81 * 0.5, -1.1, 1.1), 5);
        D[q] = v[o] / sp; D[q + 1] = v[o + 1] / sp; D[q + 2] = v[o + 2] / sp; D[q + 3] = this.bank[i];
        // flapping when climbing, slow, alarmed or landing; a V-glide now and then when cruising
        const climbing = v[o + 1] > 0.8, landing = s === LAND;
        this.glide[i] -= dt;
        if (this.glide[i] < -2.5 - (i % 5) * 0.3) this.glide[i] = 0.9 + (i % 3) * 0.3;
        const gliding = this.glide[i] > 0 && !climbing && this.alarm[i] < 0.2 && !landing;
        fold = ease(fold, 0, 8);
        amp = ease(amp, gliding ? 0.08 : landing && sp < 4 ? 1.0 : 0.85 + this.alarm[i] * 0.2, 6);
        lift = ease(lift, gliding ? 0.45 : landing ? 0.25 : 0, 4);
        this.phase[i] += dt * Math.PI * 2 * (gliding ? 1 : 7 + (climbing ? 2 : 0) + this.alarm[i] * 2);
        if (landing) { D[q + 1] += 0.5 * Math.max(0, 1 - sp / 6); }   // the flare: nose up
      }
      this.fold[i] = fold; this.amp[i] = amp; this.liftV[i] = lift;
      M[q] = this.phase[i] % 62.83; M[q + 1] = amp; M[q + 2] = fold; M[q + 3] = lift;
    }
    this.aPos.needsUpdate = true; this.aDir.needsUpdate = true; this.aAnim.needsUpdate = true;
  }

  /** the best pigeon to strike: in front of the falcon (within `cone` rad of its velocity), nearest, flying or perched */
  target(fx, fy, fz, dx, dy, dz, maxD = 160, cone = 0.5) {
    let best = -1, bs = Infinity;
    const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const cc = Math.cos(cone);
    for (let i = 0; i < this.max; i++) {
      if (this.state[i] === GONE) continue;
      const o = i * 3, ex = this.p[o] - fx, ey = this.p[o + 1] - fy, ez = this.p[o + 2] - fz, d = Math.hypot(ex, ey, ez);
      if (d > maxD || d < 0.01) continue;
      const c = (ex * dx + ey * dy + ez * dz) / d;
      if (c < cc) continue;
      const score = d * (2 - c);
      if (score < bs) { bs = score; best = i; }
    }
    return best;
  }
  pos(i, out) { out.x = this.p[i * 3]; out.y = this.p[i * 3 + 1]; out.z = this.p[i * 3 + 2]; return out; }
  vel(i, out) { out.x = this.v[i * 3]; out.y = this.v[i * 3 + 1]; out.z = this.v[i * 3 + 2]; return out; }
  flying(i) { return this.state[i] === FLY || this.state[i] === LAND; }
  /** a startle from a point (the falcon passing low): every perched bird within r goes (with the spread delay) */
  spread(i) {
    const o = i * 3;
    for (let j = 0; j < this.max; j++) {
      if (this.state[j] !== PERCH || this.alarm[j] > 0) continue;
      const d = Math.hypot(this.p[j * 3] - this.p[o], this.p[j * 3 + 1] - this.p[o + 1], this.p[j * 3 + 2] - this.p[o + 2]);
      if (d < 7) this.alarm[j] = 0.08 + d * 0.04 + Math.random() * 0.15;
    }
  }
}
export const PIGEON = { PERCH, FLY, LAND, GONE };
