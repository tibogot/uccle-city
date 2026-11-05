// THE COLLISION WORLD the character and its camera query. One interface, several kinds of source:
//
//   TriBVH      (bvh.js)     triangle meshes: the lab course, house interiors (stairs, door frames, ceilings), the
//                            city's road / sidewalk / kerb meshes
//   PrismSet    (prisms.js)  vertical extrusions: UrbIS building footprints between base and top, trunks, posts
//   Heightfield (here)       a height function: the terrain (solid below it)
//
// A source is anything with   capsule(q, contacts)   and   raycast(r, hit)   (and an `enabled` flag):
//   q   = [ax, ay, az, bx, by, bz, radius]       the capsule: bottom and top sphere centres
//   r   = [ox, oy, oz, dx, dy, dz]               the ray (t in units of d)
//   hit = [t, nx, ny, nz, tag]                   in: hit[0] = the nearest t so far (the ray's length); a source that
//                                                finds something nearer overwrites all five
// The queries and results travel in these preallocated typed arrays, not as arguments: V8 boxes double arguments
// and return values at calls it does not inline, and the hot path must not allocate.
//
//   world.q.set(...); world.capsule(contacts)                    -> contacts.n
//   world.r.set(...); world.hit[0] = tmax; world.raycast()       -> world.hit
//   world.ray(ox, oy, oz, dx, dy, dz, tmax) -> t                 convenience (allocates a little; not for hot code)

/**
 * A preallocated list of contacts, STRIDE numbers each: contact normal (from the surface toward the capsule), depth,
 * point on the surface, the y of the touched FACE's normal (oriented toward the capsule: a sphere resting on a stair
 * nosing touches the tread's edge, whose face is level, so it stands), and the source's tag.
 *   const o = contacts.slot(); if (o >= 0) { contacts.d[o] = nx; ... }
 */
export const STRIDE = 9;
export const C_NX = 0, C_NY = 1, C_NZ = 2, C_DEPTH = 3, C_PX = 4, C_PY = 5, C_PZ = 6, C_FNY = 7, C_TAG = 8;
export class Contacts {
  constructor(max = 64) { this.max = max; this.n = 0; this.d = new Float64Array(max * STRIDE); this.dropped = 0; }
  clear() { this.n = 0; }
  /** Offset of a fresh contact record, or -1 when the list is full. */
  slot() { if (this.n >= this.max) { this.dropped++; return -1; } return (this.n++) * STRIDE; }
}

/**
 * Terrain as a solid below height(x, z). The normal comes from central differences (eps m). Only the capsule's
 * bottom sphere can touch it (the capsule is vertical).
 */
export class Heightfield {
  constructor(height, { eps = 0.25, tag = 2 } = {}) { this.height = height; this.eps = eps; this.tag = tag; this.enabled = true; }
  capsule(q, contacts) {
    if (!this.enabled) return;
    const ax = q[0], ay = q[1], az = q[2], r = q[6], H = this.height;
    const h = H(ax, az);
    if (ay - r > h + 0.5) return;
    const e = this.eps, gx = (H(ax + e, az) - H(ax - e, az)) / (2 * e), gz = (H(ax, az + e) - H(ax, az - e)) / (2 * e);
    const L = Math.sqrt(gx * gx + 1 + gz * gz), nx = -gx / L, ny = 1 / L, nz = -gz / L;
    const d = (ay - h) * ny;                      // distance of the sphere centre to the local tangent plane
    if (d >= r) return;
    const o = contacts.slot();
    if (o < 0) return;
    const D = contacts.d;
    D[o] = nx; D[o + 1] = ny; D[o + 2] = nz; D[o + 3] = r - d; D[o + 4] = ax - nx * d; D[o + 5] = ay - ny * d; D[o + 6] = az - nz * d; D[o + 7] = ny; D[o + 8] = this.tag;
  }
  raycast(R, hit) {
    if (!this.enabled) return;
    const ox = R[0], oy = R[1], oz = R[2], dx = R[3], dy = R[4], dz = R[5], tmax = hit[0], H = this.height;
    if (!(tmax < Infinity)) return;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) * tmax, n = Math.max(2, Math.ceil(len / 0.5));
    let tp = 0, fp = oy - H(ox, oz);
    if (fp < 0) return;                           // starts below the ground: ignore
    for (let i = 1; i <= n; i++) {
      const t = tmax * i / n, f = oy + dy * t - H(ox + dx * t, oz + dz * t);
      if (f < 0) {
        let a = tp, b = t;                        // bisection
        for (let k = 0; k < 10; k++) {
          const m = (a + b) * 0.5;
          if (oy + dy * m - H(ox + dx * m, oz + dz * m) < 0) b = m; else a = m;
        }
        const x = ox + dx * a, z = oz + dz * a, e = this.eps;
        const gx = (H(x + e, z) - H(x - e, z)) / (2 * e), gz = (H(x, z + e) - H(x, z - e)) / (2 * e);
        const L = Math.sqrt(gx * gx + 1 + gz * gz);
        hit[0] = a; hit[1] = -gx / L; hit[2] = 1 / L; hit[3] = -gz / L; hit[4] = this.tag;
        return;
      }
      tp = t; fp = f;
    }
  }
}

export class CollisionWorld {
  constructor() {
    this.sources = [];
    this.q = new Float64Array(7); this.r = new Float64Array(6); this.hit = new Float64Array(5);
    this.queries = 0;
  }
  add(src) { this.sources.push(src); return src; }
  remove(src) { const i = this.sources.indexOf(src); if (i >= 0) this.sources.splice(i, 1); }
  /** Contacts of the capsule in this.q with every source. */
  capsule(contacts) {
    contacts.clear();
    this.queries++;
    const S = this.sources, q = this.q;
    for (let i = 0; i < S.length; i++) S[i].capsule(q, contacts);
    return contacts.n;
  }
  /** Nearest hit of the ray in this.r up to this.hit[0] (set it first); this.hit[0] stays as it was if nothing. */
  raycast() {
    const S = this.sources;
    for (let i = 0; i < S.length; i++) S[i].raycast(this.r, this.hit);
  }
  /** Convenience for non-hot code: t of the nearest hit (Infinity if none), normal in this.hit[1..3]. */
  ray(ox, oy, oz, dx, dy, dz, tmax) {
    const R = this.r; R[0] = ox; R[1] = oy; R[2] = oz; R[3] = dx; R[4] = dy; R[5] = dz;
    this.hit[0] = tmax; this.hit[4] = -1;
    this.raycast();
    return this.hit[4] >= 0 ? this.hit[0] : Infinity;
  }
}
