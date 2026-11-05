// VERTICAL PRISMS for the character: polygons extruded between a base and a top height (UrbIS building footprints,
// courtyards as holes; low walls) and vertical cylinders (tree trunks, lamp posts), hashed into 48 m cells.
// Plain typed arrays, no three.js, zero allocations per query.
//
// The layout and the cell hash follow viewer/drive/colliders.js on branch claude/drive (itself after mrdoob's
// slop-newyork building collision, MIT): flat rings (pts / ringStart / polyRing), a per-item box, 48 m cells with a
// stamp so an item spanning several cells is tested once. The car there is a 2D oriented box; here the body is a
// vertical capsule, so the test is a circle against the outline when the heights overlap, plus the top face (low
// walls you can stand on) and the underside.
//
//   const set = new PrismSet(polys, circles)   polys: [{ rings: [[[x, z], ...], ...holes], base, top, id? }]
//                                              circles: [{ x, z, r, base, top }]
//   set.capsule(q, contacts)      q = [ax, ay, az, bx, by, bz, r]  (a vertical capsule: ax = bx, az = bz)
//   set.raycast(r, hit)           r = [o, d], hit = [t so far, n, tag] (world.js)
//   set.exclude(id, true)                                 e.g. the house you walk into (its interior mesh takes over)
export const CELL = 48;

/** One contact record (small: V8 inlines it, so its double arguments are not boxed). */
function put(contacts, nx, ny, nz, depth, px, py, pz, fny, tag) {
  const o = contacts.slot();
  if (o < 0) return;
  const D = contacts.d;
  D[o] = nx; D[o + 1] = ny; D[o + 2] = nz; D[o + 3] = depth; D[o + 4] = px; D[o + 5] = py; D[o + 6] = pz; D[o + 7] = fny; D[o + 8] = tag;
}

export class PrismSet {
  constructor(polys = [], circles = []) {
    let nv = 0, nr = 0;
    for (const p of polys) for (const r of p.rings) { nv += r.length; nr++; }
    const P = polys.length, C = circles.length;
    this.pts = new Float64Array(nv * 2); this.ringStart = new Uint32Array(nr + 1); this.polyRing = new Uint32Array(P + 1);
    // item boxes (x0, z0, x1, z1) and heights (base, top); items 0..P-1 polygons, P..P+C-1 circles
    this.ibox = new Float64Array((P + C) * 4); this.iy = new Float64Array((P + C) * 2); this.off = new Uint8Array(P + C);
    this.circ = new Float64Array(C * 3);
    this.ids = new Array(P + C);
    let v = 0, r = 0;
    polys.forEach((p, i) => {
      this.polyRing[i] = r;
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (const ring of p.rings) {
        this.ringStart[r++] = v;
        for (const [x, z] of ring) { this.pts[v * 2] = x; this.pts[v * 2 + 1] = z; v++; if (x < a) a = x; if (x > c) c = x; if (z < b) b = z; if (z > d) d = z; }
      }
      this.ibox.set([a, b, c, d], i * 4); this.iy[i * 2] = p.base ?? -1e4; this.iy[i * 2 + 1] = p.top ?? 1e4; this.ids[i] = p.id ?? i;
    });
    this.ringStart[nr] = v; this.polyRing[P] = r;
    circles.forEach((q, i) => {
      const k = P + i;
      this.circ[i * 3] = q.x; this.circ[i * 3 + 1] = q.z; this.circ[i * 3 + 2] = q.r;
      this.ibox.set([q.x - q.r, q.z - q.r, q.x + q.r, q.z + q.r], k * 4); this.iy[k * 2] = q.base ?? -1e4; this.iy[k * 2 + 1] = q.top ?? 1e4; this.ids[k] = q.id ?? k;
    });
    this.P = P; this.C = C;
    this.enabled = true; this.tag = 1;
    this.ray = true;                          // false: blocks the body only (posts, trunks): the camera's rays pass
    this.pd = new Float64Array(3); this.gq = new Float64Array(4);          // _polyDist result: signed distance, nearest outline point x, z
    this.found = new Int32Array(4096); this.nFound = 0;
    this._index();
  }

  _index() {
    const N = this.P + this.C, B = this.ibox;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < N; k++) { x0 = Math.min(x0, B[k * 4]); z0 = Math.min(z0, B[k * 4 + 1]); x1 = Math.max(x1, B[k * 4 + 2]); z1 = Math.max(z1, B[k * 4 + 3]); }
    if (!N) { x0 = z0 = 0; x1 = z1 = 1; }
    const nx = Math.max(1, Math.ceil((x1 - x0) / CELL)), nz = Math.max(1, Math.ceil((z1 - z0) / CELL));
    const ci = (x) => Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / CELL))), cj = (z) => Math.min(nz - 1, Math.max(0, Math.floor((z - z0) / CELL)));
    const count = new Uint32Array(nx * nz + 1);
    for (let k = 0; k < N; k++) for (let j = cj(B[k * 4 + 1]); j <= cj(B[k * 4 + 3]); j++) for (let i = ci(B[k * 4]); i <= ci(B[k * 4 + 2]); i++) count[j * nx + i + 1]++;
    for (let k = 1; k < count.length; k++) count[k] += count[k - 1];
    const items = new Uint32Array(count[count.length - 1]), fill = count.slice(0, -1);
    for (let k = 0; k < N; k++) for (let j = cj(B[k * 4 + 1]); j <= cj(B[k * 4 + 3]); j++) for (let i = ci(B[k * 4]); i <= ci(B[k * 4 + 2]); i++) items[fill[j * nx + i]++] = k;
    Object.assign(this, { gx0: x0, gz0: z0, gnx: nx, gnz: nz, cellStart: count, cellItems: items });
    this.seen = new Uint32Array(N); this.stamp = 0;
  }

  static FIELDS = ["pts", "ringStart", "polyRing", "ibox", "iy", "off", "circ", "cellStart", "cellItems", "seen"];
  /** The arrays, for a postMessage transfer (a worker builds, the main thread uses). */
  toData() {
    const d = { ids: this.ids, P: this.P, C: this.C, gx0: this.gx0, gz0: this.gz0, gnx: this.gnx, gnz: this.gnz };
    for (const k of PrismSet.FIELDS) d[k] = this[k];
    return d;
  }
  static transferList(d) { return PrismSet.FIELDS.map((k) => d[k].buffer); }
  static fromData(d) {
    const s = Object.create(PrismSet.prototype);
    Object.assign(s, d, { stamp: 0, enabled: true, tag: 1, ray: true, hitN: null });
    s.pd = new Float64Array(3); s.gq = new Float64Array(4); s.found = new Int32Array(4096); s.nFound = 0;
    return s;
  }

  /** Switch an item off / on by its id (e.g. the building whose interior you are in). */
  exclude(id, on = true) { for (let k = 0; k < this.ids.length; k++) if (this.ids[k] === id) this.off[k] = on ? 1 : 0; }

  /** Items whose box touches the square this.gq = [x0, z0, x1, z1] -> this.found[0 .. nFound). */
  gather() {
    const G = this.gq, x0 = G[0], z0 = G[1], x1 = G[2], z1 = G[3];
    this.nFound = 0;
    if (x1 < this.gx0 || z1 < this.gz0 || x0 > this.gx0 + this.gnx * CELL || z0 > this.gz0 + this.gnz * CELL) return 0;
    const i0 = Math.max(0, Math.floor((x0 - this.gx0) / CELL)), i1 = Math.min(this.gnx - 1, Math.floor((x1 - this.gx0) / CELL));
    const j0 = Math.max(0, Math.floor((z0 - this.gz0) / CELL)), j1 = Math.min(this.gnz - 1, Math.floor((z1 - this.gz0) / CELL));
    if (++this.stamp > 4e9) { this.seen.fill(0); this.stamp = 1; }
    const st = this.stamp, B = this.ibox, F = this.found;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = j * this.gnx + i;
      for (let q = this.cellStart[c]; q < this.cellStart[c + 1]; q++) {
        const k = this.cellItems[q];
        if (this.seen[k] === st) continue;
        this.seen[k] = st;
        if (this.off[k] || B[k * 4] > x1 || B[k * 4 + 2] < x0 || B[k * 4 + 1] > z1 || B[k * 4 + 3] < z0) continue;
        if (this.nFound < F.length) F[this.nFound++] = k;
      }
    }
    return this.nFound;
  }

  /**
   * Closest point of polygon p's outline to (x, z) -> this._bx/_bz; returns the distance, negative when (x, z) is
   * inside (even-odd over all rings, so courtyards are outside).
   */
  _polyDist(p, x, z) {          // (inlined by V8: small and monomorphic; results in this.pd, not returned)
    const pts = this.pts, rs = this.ringStart;
    let inside = false, best = Infinity, bx = 0, bz = 0;
    for (let r = this.polyRing[p]; r < this.polyRing[p + 1]; r++) {
      const s = rs[r], e = rs[r + 1];
      for (let i = s, j = e - 1; i < e; j = i++) {
        const ax = pts[j * 2], az = pts[j * 2 + 1], cx = pts[i * 2], cz = pts[i * 2 + 1];
        if ((cz > z) !== (az > z) && x < cx + (ax - cx) * (z - cz) / (az - cz)) inside = !inside;
        const ex = cx - ax, ez = cz - az, L2 = ex * ex + ez * ez;
        let t = L2 > 0 ? ((x - ax) * ex + (z - az) * ez) / L2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + ex * t, qz = az + ez * t, d2 = (x - qx) ** 2 + (z - qz) ** 2;
        if (d2 < best) { best = d2; bx = qx; bz = qz; }
      }
    }
    const d = Math.sqrt(best), pd = this.pd;
    pd[0] = inside ? -d : d; pd[1] = bx; pd[2] = bz;
  }

  capsule(q, contacts) {
    if (!this.enabled) return;
    const ax = q[0], ay = q[1], az = q[2], by = q[4], r = q[6], D = contacts.d, tag = this.tag;
    const x = ax, z = az;                         // vertical capsule
    const G = this.gq; G[0] = x - r; G[1] = z - r; G[2] = x + r; G[3] = z + r;
    const n = this.gather();
    for (let q = 0; q < n; q++) {
      const k = this.found[q], y0 = this.iy[k * 2], y1 = this.iy[k * 2 + 1];
      if (ay - r >= y1 || by + r <= y0) continue;
      // signed horizontal distance to the outline and the nearest outline point
      let sd, px, pz;
      if (k < this.P) { this._polyDist(k, x, z); sd = this.pd[0]; px = this.pd[1]; pz = this.pd[2]; }
      else {
        const c = (k - this.P) * 3, cx = this.circ[c], cz = this.circ[c + 1], cr = this.circ[c + 2], dd = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2);
        sd = dd - cr;
        if (dd > 1e-9) { px = cx + (x - cx) / dd * cr; pz = cz + (z - cz) / dd * cr; } else { px = cx + cr; pz = cz; }
      }
      if (sd >= r) continue;
      if (ay > y1) {
        // bottom sphere above the top face: stand on it (inside) or roll over its edge (outside)
        if (sd <= 0) { const d = ay - y1; if (d < r) put(contacts, 0, 1, 0, r - d, x, y1, z, 1, tag); continue; }
        const dy = ay - y1, d = Math.sqrt(sd * sd + dy * dy);
        if (d < r) put(contacts, (x - px) / d, dy / d, (z - pz) / d, r - d, px, y1, pz, 1, tag);       // the top's edge
        continue;
      }
      if (by < y0) {
        // top sphere under the base (an overhang, a bridge deck seen from below)
        if (sd <= 0) { const d = y0 - by; if (d < r) put(contacts, 0, -1, 0, r - d, x, y0, z, -1, tag); continue; }
        const dy = by - y0, d = Math.sqrt(sd * sd + dy * dy);
        if (d < r) put(contacts, (x - px) / d, dy / d, (z - pz) / d, r - d, px, y0, pz, -1, tag);
        continue;
      }
      // the segment's height overlaps the wall: horizontal push (or up, if that is shorter: a low wall)
      const cy = Math.min(Math.max(ay, y0), y1);
      if (sd > 1e-9) { put(contacts, (x - px) / sd, 0, (z - pz) / sd, r - sd, px, cy, pz, 0, tag); continue; }
      const out = r - sd, up = y1 - ay + r;
      const L = Math.sqrt((px - x) ** 2 + (pz - z) ** 2);
      if (up < out || L < 1e-9) put(contacts, 0, 1, 0, up, x, y1, z, 1, tag);
      else put(contacts, (px - x) / L, 0, (pz - z) / L, out, px, cy, pz, 0, tag);
    }
  }

  raycast(R, H) {
    if (!this.enabled || !this.ray) return;
    const ox = R[0], oy = R[1], oz = R[2], dx = R[3], dy = R[4], dz = R[5], tmax = H[0];
    if (!(tmax < Infinity)) return;
    const ex = ox + dx * tmax, ez = oz + dz * tmax;
    const G = this.gq; G[0] = Math.min(ox, ex); G[1] = Math.min(oz, ez); G[2] = Math.max(ox, ex); G[3] = Math.max(oz, ez);
    const n = this.gather();
    let best = tmax, hnx = 0, hny = 0, hnz = 0, any = false;
    const pts = this.pts, rs = this.ringStart;
    for (let q = 0; q < n; q++) {
      const k = this.found[q], y0 = this.iy[k * 2], y1 = this.iy[k * 2 + 1];
      if (Math.max(oy, oy + dy * tmax) < y0 || Math.min(oy, oy + dy * tmax) > y1) continue;
      // the top and bottom faces
      for (let f = 0; f < 2; f++) {
        const yy = f ? y0 : y1;
        if (Math.abs(dy) < 1e-12) break;
        const t = (yy - oy) / dy;
        if (t < 0 || t >= best) continue;
        const hx = ox + dx * t, hz = oz + dz * t;
        if (k < this.P) this._polyDist(k, hx, hz);
        const inside = k < this.P ? this.pd[0] < 0 : Math.sqrt((hx - this.circ[(k - this.P) * 3]) ** 2 + (hz - this.circ[(k - this.P) * 3 + 1]) ** 2) < this.circ[(k - this.P) * 3 + 2];
        if (inside) { best = t; hnx = 0; hny = f ? -1 : 1; hnz = 0; any = true; }
      }
      // the walls
      if (k < this.P) {
        for (let r = this.polyRing[k]; r < this.polyRing[k + 1]; r++) {
          const s = rs[r], e = rs[r + 1];
          for (let i = s, j = e - 1; i < e; j = i++) {
            const ax = pts[j * 2], az = pts[j * 2 + 1], sx = pts[i * 2] - ax, sz = pts[i * 2 + 1] - az;
            const den = dx * sz - dz * sx;
            if (Math.abs(den) < 1e-12) continue;
            const t = ((ax - ox) * sz - (az - oz) * sx) / den, u = ((ax - ox) * dz - (az - oz) * dx) / den;
            if (t < 0 || t >= best || u < 0 || u > 1) continue;
            const y = oy + dy * t;
            if (y < y0 || y > y1) continue;
            const L = Math.sqrt(sx * sx + sz * sz);
            let nx = -sz / L, nz = sx / L;
            if (nx * dx + nz * dz > 0) { nx = -nx; nz = -nz; }
            best = t; hnx = nx; hny = 0; hnz = nz; any = true;
          }
        }
      } else {
        const c = (k - this.P) * 3, cx = this.circ[c], cz = this.circ[c + 1], cr = this.circ[c + 2];
        const fx = ox - cx, fz = oz - cz, a = dx * dx + dz * dz, b = fx * dx + fz * dz, cc = fx * fx + fz * fz - cr * cr;
        const disc = b * b - a * cc;
        if (a < 1e-12 || disc < 0) continue;
        const t = (-b - Math.sqrt(disc)) / a;
        if (t < 0 || t >= best) continue;
        const y = oy + dy * t;
        if (y < y0 || y > y1) continue;
        const hx = fx + dx * t, hz = fz + dz * t;
        best = t; hnx = hx / cr; hny = 0; hnz = hz / cr; any = true;
      }
    }
    if (!any) return;
    H[0] = best; H[1] = hnx; H[2] = hny; H[3] = hnz; H[4] = this.tag;
  }
}
