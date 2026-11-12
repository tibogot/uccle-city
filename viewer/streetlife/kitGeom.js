// PROCEDURAL KIT GEOMETRY (pure JS, no three.js: the tile worker, the lab and Node's mesh audit all build the same
// arrays). Every primitive writes positions, normals and a SLOT per vertex (a named material slot, viewer/streetlife/
// kits.js SLOTS); no colour is baked. The owner's topology rules: flat faces keep flat normals (no vertex shared across
// a hard edge), chamfers instead of razor edges (bevel > 0), round parts with enough segments and smooth normals,
// caps triangulated as concentric rings (no long fan slivers), no coplanar overlaps (parts touch, never coincide).

export class Geo {
  constructor() { this.p = []; this.n = []; this.s = []; this.i = []; this.m = null; }
  /** a 3x4 transform for the next parts: rotation Y (rad) then translation; null = identity */
  at(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Ry * Rx * Rz
    const a = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]], b = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]], c = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
    const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
    const R = mul(c, mul(b, a));
    this.m = { R, t: [x, y, z] };
    return this;
  }
  reset() { this.m = null; return this; }
  _v(x, y, z, nx, ny, nz, slot) {
    let P = [x, y, z], N = [nx, ny, nz];
    if (this.m) {
      const { R, t } = this.m;
      P = [0, 1, 2].map((k) => R[k][0] * x + R[k][1] * y + R[k][2] * z + t[k]);
      N = [0, 1, 2].map((k) => R[k][0] * nx + R[k][1] * ny + R[k][2] * nz);
    }
    this.p.push(P[0], P[1], P[2]); this.n.push(N[0], N[1], N[2]); this.s.push(slot);
    return this.p.length / 3 - 1;
  }
  /** a flat polygon (convex, CCW seen from the normal's side), triangulated as a fan from its first corner */
  poly(pts, slot) {
    const [a, b, c] = pts;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n) || 1; n = n.map((q) => q / l);
    const ids = pts.map((q) => this._v(q[0], q[1], q[2], n[0], n[1], n[2], slot));
    for (let k = 1; k + 1 < ids.length; k++) this.i.push(ids[0], ids[k], ids[k + 1]);
    return this;
  }
  /** an axis-aligned box centred at (x, y, z) (in the current transform), size sx sy sz, chamfered by bevel */
  box(x, y, z, sx, sy, sz, slot, bevel = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, b = Math.min(bevel, hx * 0.45, hy * 0.45, hz * 0.45);
    if (b <= 1e-4) {
      const P = (i, j, k) => [x + i * hx, y + j * hy, z + k * hz];
      this.poly([P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1)], slot);
      this.poly([P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), P(-1, -1, -1)], slot);
      this.poly([P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1)], slot);
      this.poly([P(-1, -1, 1), P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1)], slot);
      this.poly([P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], slot);
      this.poly([P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)], slot);
      return this;
    }
    // chamfered box: 6 faces, 12 edge strips, 8 corner triangles (each its own flat normal)
    const ix = hx - b, iy = hy - b, iz = hz - b;
    const V = (sxg, syg, szg, ax) => {       // a corner vertex pushed out along axis ax ('x', 'y' or 'z')
      return [x + sxg * (ax === "x" ? hx : ix), y + syg * (ax === "y" ? hy : iy), z + szg * (ax === "z" ? hz : iz)];
    };
    const S = [-1, 1];
    // faces
    for (const s of S) {
      this.poly(s > 0 ? [V(1, -1, -1, "x"), V(1, 1, -1, "x"), V(1, 1, 1, "x"), V(1, -1, 1, "x")] : [V(-1, -1, 1, "x"), V(-1, 1, 1, "x"), V(-1, 1, -1, "x"), V(-1, -1, -1, "x")], slot);
      this.poly(s > 0 ? [V(-1, 1, -1, "y"), V(-1, 1, 1, "y"), V(1, 1, 1, "y"), V(1, 1, -1, "y")] : [V(-1, -1, 1, "y"), V(-1, -1, -1, "y"), V(1, -1, -1, "y"), V(1, -1, 1, "y")], slot);
      this.poly(s > 0 ? [V(-1, -1, 1, "z"), V(1, -1, 1, "z"), V(1, 1, 1, "z"), V(-1, 1, 1, "z")] : [V(1, -1, -1, "z"), V(-1, -1, -1, "z"), V(-1, 1, -1, "z"), V(1, 1, -1, "z")], slot);
    }
    // edge strips: between the faces of axes a and c along axis e
    const quadOut = (q) => {      // orient so the normal points away from the centre
      const cx = (q[0][0] + q[2][0]) / 2 - x, cy = (q[0][1] + q[2][1]) / 2 - y, cz = (q[0][2] + q[2][2]) / 2 - z;
      const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], v = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      return n[0] * cx + n[1] * cy + n[2] * cz < 0 ? q.slice().reverse() : q;
    };
    for (const a of S) for (const c of S) {
      // along z: x-face and y-face
      this.poly(quadOut([V(a, c, -1, "x"), V(a, c, 1, "x"), V(a, c, 1, "y"), V(a, c, -1, "y")]), slot);
      // along x: y-face and z-face
      this.poly(quadOut([V(-1, a, c, "y"), V(1, a, c, "y"), V(1, a, c, "z"), V(-1, a, c, "z")]), slot);
      // along y: x-face and z-face
      this.poly(quadOut([V(a, -1, c, "x"), V(a, 1, c, "x"), V(a, 1, c, "z"), V(a, -1, c, "z")]), slot);
    }
    for (const a of S) for (const c of S) for (const d of S) this.poly(quadOut([V(a, c, d, "x"), V(a, c, d, "y"), V(a, c, d, "z")]), slot);
    return this;
  }
  /** a solid of revolution around +y at (x, y0, z): profile [[r, y], ...] bottom to top; `hard` = indices of profile
   *  points where the surface creases (their rings are doubled so both sides keep their own normal) */
  lathe(x, y0, z, profile, slot, seg = 24, hard = []) {
    const H = new Set(hard);
    // split the profile into smooth runs at the hard points
    const runs = [];
    let run = [profile[0]];
    for (let k = 1; k < profile.length; k++) { run.push(profile[k]); if (H.has(k) && k < profile.length - 1) { runs.push(run); run = [profile[k]]; } }
    runs.push(run);
    for (const R of runs) {
      // profile normals: average of the adjacent segments' (area weighted by segment length)
      const N = R.map((q, k) => {
        let nx = 0, ny = 0;
        for (const [a, b] of [[R[k - 1], q], [q, R[k + 1]]]) {
          if (!a || !b) continue;
          const dr = b[0] - a[0], dy = b[1] - a[1];
          nx += dy; ny += -dr;                                   // outward for a bottom-to-top profile
        }
        const l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l];
      });
      const base = this.p.length / 3;
      for (let k = 0; k < R.length; k++) for (let j = 0; j <= seg; j++) {
        const t = (j / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        this._v(x + R[k][0] * c, y0 + R[k][1], z + R[k][0] * s, N[k][0] * c, N[k][1], N[k][0] * s, slot);
      }
      for (let k = 0; k + 1 < R.length; k++) for (let j = 0; j < seg; j++) {
        const a = base + k * (seg + 1) + j, b = a + seg + 1;
        const z0 = R[k][0] < 1e-5, z1 = R[k + 1][0] < 1e-5;
        if (z0 && z1) continue;
        if (z0) this.i.push(a, b, b + 1);              // a cone tip at the bottom: one triangle per sector, no degenerate half
        else if (z1) this.i.push(a, b, a + 1);         // ... at the top
        else this.i.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return this;
  }
  /** a flat disc cap (normal +y or -y) as concentric rings: no long fan slivers */
  disc(x, y, z, r, slot, seg = 24, up = true, r0 = 0) {
    const rings = r0 > 0 ? [r, (r + r0) / 2, r0] : [r, r * 0.66, r * 0.33];
    const ny = up ? 1 : -1, base = this.p.length / 3;
    for (const rr of rings) for (let j = 0; j < seg; j++) { const t = (j / seg) * Math.PI * 2; this._v(x + rr * Math.cos(t), y, z + rr * Math.sin(t), 0, ny, 0, slot); }
    const c = r0 > 0 ? -1 : this._v(x, y, z, 0, ny, 0, slot);
    for (let k = 0; k + 1 < rings.length; k++) for (let j = 0; j < seg; j++) {
      const a = base + k * seg + j, b = base + k * seg + (j + 1) % seg, a2 = a + seg, b2 = b + seg;
      if (up) this.i.push(a, a2, b, b, a2, b2); else this.i.push(a, b, a2, b, b2, a2);
    }
    if (c >= 0) { const L = base + (rings.length - 1) * seg; for (let j = 0; j < seg; j++) { const a = L + j, b = L + (j + 1) % seg; if (up) this.i.push(a, c, b); else this.i.push(a, b, c); } }
    return this;
  }
  /** a closed cylinder along +y: smooth side, small chamfer rings, flat ring-triangulated caps */
  cyl(x, y0, z, r, h, slot, seg = 20, bevel = 0, capSlot = slot) {
    const b = Math.min(bevel, r * 0.3, h * 0.3);
    if (b > 0) this.lathe(x, y0, z, [[r - b, 0], [r, b], [r, h - b], [r - b, h]], slot, seg, [1, 2]);
    else this.lathe(x, y0, z, [[r, 0], [r, h]], slot, seg);
    this.disc(x, y0 + h, z, r - b, capSlot, seg, true);
    this.disc(x, y0, z, r - b, capSlot, seg, false);
    return this;
  }
  /** a round tube along a polyline [[x, y, z], ...]: corners rounded (Chaikin), rotation-minimising frames (no twist),
   *  a closed loop when the last point is the first; open ends capped flat */
  tube(pts0, r, slot, seg = 14, caps = true) {
    const closed = pts0.length > 3 && Math.hypot(pts0[0][0] - pts0.at(-1)[0], pts0[0][1] - pts0.at(-1)[1], pts0[0][2] - pts0.at(-1)[2]) < 1e-6;
    let pts = closed ? pts0.slice(0, -1) : pts0.slice();
    for (let it = 0; it < 2 && pts.length > 2; it++) {          // round the corners
      const q = closed ? [] : [pts[0]];
      const n = pts.length;
      for (let k = 0; k < (closed ? n : n - 1); k++) {
        const a = pts[k], b = pts[(k + 1) % n];
        q.push(a.map((v, j) => v * 0.75 + b[j] * 0.25), a.map((v, j) => v * 0.25 + b[j] * 0.75));
      }
      if (!closed) q.push(pts[n - 1]);
      pts = q;
    }
    const n = pts.length, norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
    const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const tan = pts.map((q, k) => {
      const a = closed ? pts[(k - 1 + n) % n] : pts[Math.max(0, k - 1)], b = closed ? pts[(k + 1) % n] : pts[Math.min(n - 1, k + 1)];
      return norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    });
    let u = norm(crs(tan[0], Math.abs(tan[0][1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const frames = [];
    for (let k = 0; k < n; k++) {
      const t = tan[k];
      const d = u[0] * t[0] + u[1] * t[1] + u[2] * t[2];
      u = norm([u[0] - t[0] * d, u[1] - t[1] * d, u[2] - t[2] * d]);          // parallel transport
      frames.push({ q: pts[k], u, v: crs(t, u), t });
    }
    if (closed) frames.push({ ...frames[0] });                               // the loop closes on the first ring (same frame)
    const base = this.p.length / 3;
    for (const f of frames) for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const nn = [f.u[0] * c + f.v[0] * s, f.u[1] * c + f.v[1] * s, f.u[2] * c + f.v[2] * s];
      this._v(f.q[0] + nn[0] * r, f.q[1] + nn[1] * r, f.q[2] + nn[2] * r, nn[0], nn[1], nn[2], slot);
    }
    for (let k = 0; k + 1 < frames.length; k++) for (let j = 0; j < seg; j++) {
      const a = base + k * (seg + 1) + j, b = a + seg + 1;
      this.i.push(a, a + 1, b, a + 1, b + 1, b);
    }
    if (caps && !closed) for (const [f, sgn] of [[frames[0], -1], [frames[frames.length - 1], 1]]) {
      const nn = f.t.map((v) => v * sgn), c0 = this._v(f.q[0], f.q[1], f.q[2], nn[0], nn[1], nn[2], slot), b0 = this.p.length / 3;
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        this._v(f.q[0] + (f.u[0] * c + f.v[0] * s) * r, f.q[1] + (f.u[1] * c + f.v[1] * s) * r, f.q[2] + (f.u[2] * c + f.v[2] * s) * r, nn[0], nn[1], nn[2], slot);
      }
      for (let j = 0; j < seg; j++) { const a = b0 + j, b = b0 + (j + 1) % seg; if (sgn > 0) this.i.push(c0, a, b); else this.i.push(c0, b, a); }
    }
    return this;
  }
  /** merge another Geo (already built in its own frame) through the current transform */
  add(g) {
    const base = this.p.length / 3;
    for (let k = 0; k < g.s.length; k++) this._v(g.p[3 * k], g.p[3 * k + 1], g.p[3 * k + 2], g.n[3 * k], g.n[3 * k + 1], g.n[3 * k + 2], g.s[k]);
    for (const q of g.i) this.i.push(q + base);
    return this;
  }
  arrays() {
    return { position: new Float32Array(this.p), normal: new Float32Array(this.n), slot: new Float32Array(this.s), index: new Uint32Array(this.i) };
  }
}
