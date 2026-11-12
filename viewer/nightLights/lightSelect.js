// WHICH LIGHTS ARE ON: fixed pools filled with the nearest sources each frame, with NO POPPING and NO ALLOCATION.
//
// Each kind of source (lamps, headlights, windows ...) owns a fixed range of LightPool slots (Mr.doob's slop-newyork
// pattern: pools of SpotLights parked at intensity 0, docs/SLOP_NEWYORK_AUDIT.md). Every frame NearestN keeps the N
// nearest candidates (partial insertion into preallocated arrays: no sort, no garbage) and gives each one a weight
//     w = smoothstep(cutoff, 0.62 cutoff, d),   cutoff = min(maxDist, distance of the (N+1)-th nearest)
// so a source leaves the pool exactly when its weight reaches 0, and the one that takes its place enters at 0: the
// sum of light is continuous whatever the camera does (no popping); slot order does not matter (the clustered node
// re-sorts every frame). Pure 3-D distance to the camera (no view-direction bias: turning the head must not change the
// light on the street in front of you).
// StaticSources: a uniform grid over the sources (cells of 32 m, built once), so a query costs the cells it touches,
// not the whole city.
// ShadowLamps: K real THREE.SpotLights with soft shadows that follow the K nearest lamps, cross-faded against the
// lamp's pool light (shadowed share b, clustered share 1 - b): the shadow fades in over ~0.5 s, never switches.

export const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class NearestN {
  constructor(n, maxDist) {
    this.n = n; this.maxDist = maxDist;
    this.d = new Float32Array(n + 1); this.i = new Int32Array(n + 1);
    this.count = 0; this.cutoff = maxDist;
  }
  begin() { this.d.fill(Infinity); this.count = 0; }
  /** a candidate at squared distance d2 */
  offer(id, d2) {
    const D = this.d, I = this.i, m = this.n;           // keeps n + 1 (the (n+1)-th sets the cut-off)
    if (d2 >= D[m] || d2 > this.maxDist * this.maxDist) return;
    let k = m;
    while (k > 0 && D[k - 1] > d2) { D[k] = D[k - 1]; I[k] = I[k - 1]; k--; }
    D[k] = d2; I[k] = id;
  }
  end() {
    let c = 0;
    while (c < this.n && this.d[c] < Infinity) c++;
    this.count = c;
    this.cutoff = Math.min(this.maxDist, Math.sqrt(this.d[this.n]));
    for (let k = 0; k <= this.n; k++) if (this.d[k] < Infinity) this.d[k] = Math.sqrt(this.d[k]);
    return c;
  }
  /** weight of the k-th kept candidate */
  weight(k) { const c = this.cutoff; return smooth01((c - this.d[k]) / (c * 0.38)); }
}

export class StaticSources {
  /** xs, ys, zs: Float32Arrays of positions; cell: grid cell (m) */
  constructor(xs, ys, zs, cell = 32) {
    this.x = xs; this.y = ys; this.z = zs; this.cell = cell;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); z0 = Math.min(z0, zs[i]); z1 = Math.max(z1, zs[i]); }
    if (!xs.length) { x0 = z0 = 0; x1 = z1 = 1; }
    this.x0 = x0; this.z0 = z0;
    this.nx = Math.max(1, Math.ceil((x1 - x0) / cell) + 1); this.nz = Math.max(1, Math.ceil((z1 - z0) / cell) + 1);
    const nc = this.nx * this.nz, cnt = new Int32Array(nc + 1);
    const cellOf = (i) => Math.floor((zs[i] - z0) / cell) * this.nx + Math.floor((xs[i] - x0) / cell);
    for (let i = 0; i < xs.length; i++) cnt[cellOf(i) + 1]++;
    for (let c = 0; c < nc; c++) cnt[c + 1] += cnt[c];
    this.start = cnt; this.items = new Int32Array(xs.length);
    const fill = cnt.slice(0, nc);
    for (let i = 0; i < xs.length; i++) this.items[fill[cellOf(i)]++] = i;
  }
  /** offer every source within r of (cx, cy, cz) to a NearestN */
  query(cx, cy, cz, r, sel, filter = null) {
    const c = this.cell;
    const i0 = Math.max(0, Math.floor((cx - r - this.x0) / c)), i1 = Math.min(this.nx - 1, Math.floor((cx + r - this.x0) / c));
    const j0 = Math.max(0, Math.floor((cz - r - this.z0) / c)), j1 = Math.min(this.nz - 1, Math.floor((cz + r - this.z0) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cc = j * this.nx + i;
      for (let k = this.start[cc], e = this.start[cc + 1]; k < e; k++) {
        const s = this.items[k];
        if (filter && !filter(s)) continue;
        const dx = this.x[s] - cx, dy = this.y[s] - cy, dz = this.z[s] - cz;
        sel.offer(s, dx * dx + dy * dy + dz * dz);
      }
    }
  }
}

/**
 * K shadowed spot lights following the K nearest lamps. lights: K THREE.SpotLights (castShadow = true, in the scene,
 * intensity 0 when idle: constant light count, no recompiles). blend(lampIndex) -> the shadowed share 0..1 of that
 * lamp (the pool writer multiplies the lamp's clustered weight by 1 - blend).
 */
export class ShadowLamps {
  constructor(lights, lampCount, fadeSeconds = 0.5) {
    this.lights = lights; this.K = lights.length; this.tau = fadeSeconds;
    this.lamp = new Int32Array(this.K).fill(-1); this.b = new Float32Array(this.K);
    this.share = new Float32Array(lampCount);        // per lamp, its shadowed share this frame
    this.want = new Int32Array(this.K);
  }
  /** nearest: a NearestN over the lamps (already ended); dt: s */
  update(nearest, dt) {
    const K = this.K, step = dt / this.tau;
    let nw = 0;
    for (let k = 0; k < Math.min(K, nearest.count); k++) this.want[nw++] = nearest.i[k];
    this.nw = nw;
    for (let s = 0; s < K; s++) {
      const l = this.lamp[s];
      if (l >= 0) this.share[l] = 0;
      if (l >= 0 && this.wanted(l)) this.b[s] = Math.min(1, this.b[s] + step);
      else if (l >= 0) { this.b[s] = Math.max(0, this.b[s] - step); if (this.b[s] === 0) this.lamp[s] = -1; }
    }
    for (let s = 0; s < K; s++) if (this.lamp[s] < 0) {
      for (let k = 0; k < nw; k++) if (!this.held(this.want[k])) { this.lamp[s] = this.want[k]; this.b[s] = 0; break; }
    }
    for (let s = 0; s < K; s++) if (this.lamp[s] >= 0) this.share[this.lamp[s]] = smooth01(this.b[s]);
  }
  wanted(l) { for (let k = 0; k < this.nw; k++) if (this.want[k] === l) return true; return false; }
  held(l) { for (let s = 0; s < this.K; s++) if (this.lamp[s] === l) return true; return false; }
  /** the share of lamp l that its shadowed light carries (0..1) */
  blend(l) { return this.share[l]; }
}
