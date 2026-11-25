// THE GYM CONTROLLER'S WORLD IN THE CITY (?falconctl=gym, rule falcon-gym "the gym in the city"): what
// viewer/falconGym/gymFlight.js asks of a world (its greybox gymLayout.js answers it from boxes), answered from the
// city's own falcon world (cityStream.js CityFalconWorld: the DTM, the drawn roof grid, the church / landmark proxies,
// the bridges, the street trees' crowns), read-only:
//   column(x, z, y)        the world's column + the PADS (below): { floor, ceil, brush, tree }
//   sphereHit(x, y, z, r)  the floor under the sphere, the ceiling over it (an arch, a crown's underside) and the WALLS
//                          round it (8 directions at its radius: the solid rising beside it; the contact's depth by
//                          bisection); a centre inside a solid is pushed out sideways to the nearest free side
//   ray(o, d, maxD)        a march (0.6 m near, 1.2 m to 30 m, 2 m beyond) + 5 bisections; a start inside is skipped
//   clearUp(x, y, z, r, h) room for the wings above: no solid rising and no ceiling within h at 5 points
//   ledges                 a FIXED POOL of LEDGE_CAP perches round the falcon: the drawn roofs' edges and ridges (a scan
//                          of the roof grid), the façade kit's window SILLS and balcony / balconnet RAILINGS (the tiles'
//                          own kit placements), the street lamps' lantern tops, the roof-ridge / church roosts, the trees'
//                          crown tops and the church family's perches (the eyrie's ledge). Rebuilt round the falcon in
//                          SLICES of at most `work` samples a frame (no main-thread spike), the nearest first, swapped
//                          in when done; unused entries sit at x = 1e9 (every query rejects them by distance first)
//   pads                   the perches that are no part of the height grid (sills, railings, lamps, church perches,
//                          ridges): small discs (r 0.35 m) the falcon stands on, in a 2 m bucket grid over the pool
// No allocation per frame (one shared result object a query, the pools made once).
const CAP = 512;                 // ledges in the pool
const CAND = 4096;               // candidates a rebuild collects (the nearest CAP kept)
const R_LEDGE = 70;              // m round the falcon: kit / roosts / trees / lamps
const R_EDGE = 40;               // m round the falcon: the roof grid scan (1.5 m steps)
const EDGE_STEP = 1.5;
const PAD_R = 0.35;              // m: a pad's radius
const CELL = 2, GRID = 72;       // the pads' bucket grid: 2 m cells, 72 x 72 (+- 72 m)
const MOVE = 15, EVERY = 3;      // rebuild when the falcon is 15 m from the last centre, or every 3 s
export const LEDGE_KINDS = ["roof edge", "ridge", "sill", "railing", "lamp", "church", "eyrie", "tree"];
const PAD_KIND = [false, true, true, true, true, true, true, false];
// the façade kit's pieces (viewer/facadeKit/placement.js, STRIDE floats: x, y, z = the opening's bottom middle on the
// wall plane, nx, nz = the wall's outward normal; tools/blender/facadeKit.py): where a falcon stands on each
//   sill       the blue-stone sill's top (y = the opening line), 6 cm out (it is 7 cm proud, the reveal 22 cm deep)
//   balcony    the cast-iron railing's handrail: 0.95 m over the slab (6 cm under the sill line), 0.43 m out
//   balconnet  the same railing 0.17 m out (its slab 0.24 m deep)
const KIT = [["sill", 0.06, 0.0, 2], ["balcony", 0.43, 0.89, 3], ["balconyP", 0.43, 0.89, 3], ["balconnet", 0.17, 0.91, 3], ["balconnetP", 0.17, 0.91, 3]];

function pool(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = { x: 1e9, y: -1e9, z: 1e9, yaw: 0, drop: 0, kind: "", k: -1 }; return a; }
function grid() { return { heads: new Int32Array(GRID * GRID).fill(-1), next: new Int32Array(CAP * 4), pad: new Int32Array(CAP * 4), n: 0, x0: 0, z0: 0 }; }

export class CityGymWorld {
  /** w: the city's falcon world (CityFalconWorld) or a test world with column / floor / ground (+ treePerches, roosts,
   *  tiles with kit, lampTop); perches: () => [{ pos, yaw, eyrie?, church? }] (the family's: falconGame.js perches) */
  constructor(w, { perches = null } = {}) {
    this.w = w; this.perches = perches;
    this._c = { floor: 0, ceil: Infinity, brush: 0, tree: null };
    this.ledges = pool(CAP); this._back = pool(CAP);
    this.grid = grid(); this._bgrid = grid();
    this.cand = new Float32Array(CAND * 5); this.keys = new Float64Array(CAND); this.nCand = 0;
    this.job = null; this.at = { x: 1e9, z: 1e9, t: -1e9 };
    this.edgeH = new Float32Array(Math.pow(Math.ceil(2 * R_EDGE / EDGE_STEP) + 1, 2));
    this.stats = { builds: 0, ledges: 0, pads: 0, maxWork: 0, slices: 0, byKind: new Int32Array(LEDGE_KINDS.length) };
    this.Y0 = 0;
  }
  floor(x, z) { return this.w.floor(x, z); }
  ground(x, z) { return this.w.ground(x, z); }
  get treeList() { return this.w.treeList; }

  // ---------------------------------------------------------------------------------------------- the solid
  /** the world's column at height y, the pads standing in it; one shared object */
  column(x, z, y) {
    const b = this.w.column(x, z, y), o = this._c;
    o.floor = b.floor; o.ceil = b.ceil ?? Infinity; o.brush = b.brush ?? 0; o.tree = b.tree ?? null; o.pad = -1;
    const G = this.grid, i = Math.floor((x - G.x0) / CELL), j = Math.floor((z - G.z0) / CELL);
    if (i >= 0 && j >= 0 && i < GRID && j < GRID) {
      const L = this.ledges;
      for (let n = G.heads[j * GRID + i]; n >= 0; n = G.next[n]) {
        const q = L[G.pad[n]], dx = x - q.x, dz = z - q.z;
        if (dx * dx + dz * dz < PAD_R * PAD_R && q.y <= y + 0.5 && q.y > o.floor) { o.floor = q.y; o.pad = G.pad[n]; o.tree = null; }
      }
    }
    return o;
  }
  solid(x, y, z) { const c = this.column(x, z, y); return c.floor > y || c.ceil < y; }

  /** the sphere's deepest contact: out = { hit, nx, ny, nz, depth, kind, soft } */
  sphereHit(px, py, pz, r, out = {}) {
    out.hit = false; out.depth = 0; out.soft = 0; out.nx = 0; out.ny = 1; out.nz = 0; out.kind = "";
    const c = this.column(px, pz, py), fl = c.floor, ce = c.ceil, tree = c.tree, pad = c.pad;
    out.soft = c.brush;
    const pen = fl - (py - r);
    // the floor under it (the bird at most a step into it: from above)
    if (pen > 0 && pen <= r + 0.6) {
      out.hit = true; out.depth = pen; out.nx = 0; out.ny = 1; out.nz = 0;
      out.kind = tree != null ? "crown" : pad >= 0 ? "sill" : fl > this.w.ground(px, pz) + 1 ? "roof" : "ground";
    }
    // a ceiling over it (a bridge's arch, a crown's underside)
    if (ce < py + r && py + r - ce > out.depth) { out.hit = true; out.depth = py + r - ce; out.nx = 0; out.ny = -1; out.nz = 0; out.kind = "under"; }
    // the walls round it: 8 directions at the radius; blocked where the solid there rises past the sphere's lower part
    const lim = py - r * 0.3;
    let sx = 0, sz = 0, best = r, nb = 0, wkind = "building";
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, dx = Math.cos(a), dz = Math.sin(a);
      const q = this.column(px + dx * r, pz + dz * r, py);
      if (!(q.floor > lim && q.floor > fl + 0.3) && !(q.ceil < py + r * 0.3 && q.ceil < ce - 0.3)) continue;
      if (q.tree != null) wkind = "crown"; else if (q.pad >= 0) wkind = "sill";
      // the wall's distance along this direction: bisection between the centre (free) and r (blocked)
      let lo = 0, hi = r;
      for (let s = 0; s < 4; s++) { const m = (lo + hi) / 2, qm = this.column(px + dx * m, pz + dz * m, py); if ((qm.floor > lim && qm.floor > fl + 0.3) || (qm.ceil < py + r * 0.3 && qm.ceil < ce - 0.3)) hi = m; else lo = m; }
      sx -= dx; sz -= dz; nb++;
      if (hi < best) best = hi;
    }
    if (nb && pen <= r + 0.6) {
      const L = Math.hypot(sx, sz), depth = r - best;
      if (L > 1e-3 && depth > out.depth * 0.5) { out.hit = true; out.depth = depth; out.nx = sx / L; out.ny = 0; out.nz = sz / L; out.kind = wkind; }
    }
    // the centre INSIDE a solid (the floor well over it: came in through a wall between two frames): out sideways
    if (pen > r + 0.6) {
      let dBest = Infinity, bx = 0, bz = 0;
      for (let d = 0.5; d <= 4 && dBest === Infinity; d += 0.5) for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, dx = Math.cos(a), dz = Math.sin(a);
        if (this.column(px + dx * d, pz + dz * d, py).floor < lim) { if (d < dBest) { dBest = d; bx = dx; bz = dz; } }
      }
      out.hit = true;
      if (dBest < Infinity) { out.depth = dBest + r; out.nx = bx; out.ny = 0; out.nz = bz; out.kind = tree != null ? "crown" : "building"; }
      else { out.depth = pen; out.nx = 0; out.ny = 1; out.nz = 0; out.kind = "roof"; }
    }
    return out;
  }

  /** the first solid along o + d s (d unit), s <= maxD; Infinity when free (a start inside a solid is skipped) */
  ray(ox, oy, oz, dx, dy, dz, maxD) {
    let inside = this.solid(ox, oy, oz), s0 = 0;
    for (let s = 0; s < maxD;) {
      const st = s < 8 ? 0.6 : s < 30 ? 1.2 : 2, s1 = Math.min(s + st, maxD);
      const hit = this.solid(ox + dx * s1, oy + dy * s1, oz + dz * s1);
      if (inside) { if (!hit) inside = false; }
      else if (hit) {
        let lo = s0, hi = s1;
        for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (this.solid(ox + dx * m, oy + dy * m, oz + dz * m)) hi = m; else lo = m; }
        return hi;
      }
      s0 = s = s1;
    }
    return Infinity;
  }

  /** room for the wings above (x, y = the body's centre, z): 5 points, nothing rising past y and no ceiling within h */
  clearUp(x, y, z, r = 0.7, h = 8) {
    for (let k = 0; k < 5; k++) {
      const a = k === 1 ? r : k === 2 ? -r : 0, b = k === 3 ? r : k === 4 ? -r : 0;
      const c = this.column(x + a, z + b, y);
      if (c.floor > y + 0.05 || c.ceil < y + h) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------------------------- the ledges
  /** once a frame: the falcon at (fx, fz), its airspeed V; work = the samples this frame may take (a slice) */
  update(fx, fz, V = 0, t = 0, work = 400) {
    if (!this.job) {
      const moved = Math.hypot(fx - this.at.x, fz - this.at.z);
      if (moved < MOVE && t - this.at.t < EVERY) return false;
      if (V > 30 && moved < 200 && this.at.t > -1e8) return false;          // (a stoop: no landing over 26 m/s, the pool waits)
      this.job = { cx: fx, cz: fz, t, phase: 0, i: 0, j: 0, tile: 0, kit: 0, at: 0, work: 0 };
      this.nCand = 0;
    }
    const J = this.job;
    let n = 0;
    while (n < work) {
      if (J.phase === 0) { n += this.collectPoints(J); J.phase = 1; }
      else if (J.phase === 1) { const d = this.collectKit(J, work - n); n += d; if (d === 0) { J.phase = 2; J.j = 0; } }
      else if (J.phase === 2) { if (!this.scanRow(J)) { J.phase = 3; J.j = 0; } n += Math.ceil(2 * R_EDGE / EDGE_STEP) + 1; }
      else if (J.phase === 3) { const d = this.edgeRow(J); n += d + 8; if (d < 0) J.phase = 4; }
      else { this.finish(J); n++; break; }
    }
    this.stats.maxWork = Math.max(this.stats.maxWork, n); this.stats.slices++;
    return !this.job;
  }
  add(x, y, z, yaw, kind, cx, cz) {
    if (this.nCand >= CAND) return;
    const d = Math.hypot(x - cx, z - cz), o = this.nCand * 5;
    const C = this.cand; C[o] = x; C[o + 1] = y; C[o + 2] = z; C[o + 3] = yaw; C[o + 4] = kind;
    this.keys[this.nCand] = Math.floor(d * 16) * 8192 + this.nCand;
    this.nCand++;
  }
  /** the points: the family's perches, the roosts (ridges, the church), the trees' crown tops, the street lamps */
  collectPoints(J) {
    const w = this.w, cx = J.cx, cz = J.cz, R2 = R_LEDGE * R_LEDGE;
    let n = 0;
    for (const p of this.perches?.() || []) { n++; if ((p.pos.x - cx) ** 2 + (p.pos.z - cz) ** 2 < R2 * 4) this.add(p.pos.x, p.pos.y, p.pos.z, p.yaw, p.eyrie ? 6 : 5, cx, cz); }
    for (const r of w.roosts || []) {
      n++;
      if (r.kind === "ground" || r.kind === "tree" || (r.x - cx) ** 2 + (r.z - cz) ** 2 > R2) continue;
      this.add(r.x, r.y - 0.02, r.z, r.yaw + Math.PI / 2, r.kind === "church" ? 5 : r.kind === "lamp" ? 4 : 1, cx, cz);
    }
    if (w.treePerches) for (const q of w.treePerches(cx, cz, R_LEDGE)) { n++; this.add(q.pos.x, q.pos.y, q.pos.z, 0, 7, cx, cz); }
    const L = w.lampTop;
    if (L) for (const t of w.tiles || []) {
      const b = t.bounds;
      if (!b || cx < b.x0 - R_LEDGE || cx > b.x1 + R_LEDGE || cz < b.z0 - R_LEDGE || cz > b.z1 + R_LEDGE) continue;
      for (const s of t.drawn?.lamps || []) {
        n++;
        if (s.y == null || (s.x - cx) ** 2 + (s.z - cz) ** 2 > R2) continue;
        const c = Math.cos(s.yaw || 0), sn = Math.sin(s.yaw || 0);
        this.add(s.x + L.x * c + L.z * sn, s.y + L.y, s.z - L.x * sn + L.z * c, (s.yaw || 0) + Math.PI / 2, 4, cx, cz);
      }
    }
    return n;
  }
  /** the façade kit's sills and railings of the tiles round the falcon (t.kit: viewer/main.js keeps the tile's kit) */
  collectKit(J, budget) {
    const tiles = this.w.tiles || [], cx = J.cx, cz = J.cz, R2 = R_LEDGE * R_LEDGE;
    let n = 0;
    while (J.tile < tiles.length && n < budget) {
      const t = tiles[J.tile], b = t.bounds, K = t.kit?.pieces;
      if (!K || !b || cx < b.x0 - R_LEDGE || cx > b.x1 + R_LEDGE || cz < b.z0 - R_LEDGE || cz > b.z1 + R_LEDGE) { J.tile++; J.kit = 0; J.at = 0; continue; }
      const S = t.kit.stride || 14;
      while (J.kit < KIT.length && n < budget) {
        const [name, out, up, kind] = KIT[J.kit], A = K[name];
        if (!A) { J.kit++; J.at = 0; continue; }
        for (; J.at < A.length && n < budget; J.at += S, n++) {
          const x = A[J.at], z = A[J.at + 2];
          if ((x - cx) ** 2 + (z - cz) ** 2 > R2) continue;
          const nx = A[J.at + 3], nz = A[J.at + 4];
          this.add(x + nx * out, A[J.at + 1] + up, z + nz * out, Math.atan2(-nx, -nz), kind, cx, cz);
        }
        if (J.at >= A.length) { J.kit++; J.at = 0; }
      }
      if (J.kit >= KIT.length) { J.tile++; J.kit = 0; J.at = 0; }
    }
    return n;
  }
  /** one row of the roof grid scan (the floor every EDGE_STEP m); false when every row is done */
  scanRow(J) {
    const N = Math.ceil(2 * R_EDGE / EDGE_STEP) + 1;
    if (J.j >= N) return false;
    const z = J.cz - R_EDGE + J.j * EDGE_STEP, x0 = J.cx - R_EDGE, H = this.edgeH;
    for (let i = 0; i < N; i++) H[J.j * N + i] = this.w.floor(x0 + i * EDGE_STEP, z);
    J.j++;
    return true;
  }
  /** one row of the edge / ridge pass over the scanned grid: a roof cell with a free drop (>= 2.5 m) to a neighbour and
   *  level behind (a flat roof's edge, a parapet), the edge found by bisection, the ledge 0.3 m in from it; a cell over
   *  both neighbours along an axis (a ridge); returns the floor calls made, -1 when done */
  edgeRow(J) {
    const N = Math.ceil(2 * R_EDGE / EDGE_STEP) + 1, H = this.edgeH, w = this.w;
    const j = J.j;
    if (j >= N - 1) return -1;
    if (j === 0) { J.j = 1; return 0; }
    let n = 0;
    const z = J.cz - R_EDGE + j * EDGE_STEP;
    for (let i = 1; i < N - 1; i++) {
      const h = H[j * N + i], x = J.cx - R_EDGE + i * EDGE_STEP;
      for (let a = 0; a < 4; a++) {
        const di = a === 0 ? 1 : a === 1 ? -1 : 0, dj = a === 2 ? 1 : a === 3 ? -1 : 0;
        const hn = H[(j + dj) * N + i + di], hb = H[(j - dj) * N + i - di];
        if (h - hn < 2.5 || Math.abs(h - hb) > 0.6) continue;
        // the edge between this cell and the low one
        let lo = 0, hi = EDGE_STEP;
        for (let s = 0; s < 3; s++) { const m = (lo + hi) / 2; if (w.floor(x + di * m, z + dj * m) > h - 1.2) lo = m; else hi = m; }
        n += 4;
        const e = Math.max(0, lo - 0.3), lx = x + di * e, lz = z + dj * e;
        this.add(lx, w.floor(lx, lz), lz, Math.atan2(-di, -dj), 0, J.cx, J.cz);
      }
      // a ridge along x or z: over both neighbours across it by >= 0.4 m, a roof (>= 3 m over the ground)
      const hx1 = H[j * N + i + 1], hx0 = H[j * N + i - 1], hz1 = H[(j + 1) * N + i], hz0 = H[(j - 1) * N + i];
      const rx = h > hx1 + 0.4 && h > hx0 + 0.4 && Math.abs(hz1 - h) < 0.3, rz = h > hz1 + 0.4 && h > hz0 + 0.4 && Math.abs(hx1 - h) < 0.3;
      if ((rx || rz) && (i + j) % 2 === 0) { n++; if (h > w.ground(x, z) + 3) this.add(x, h, z, rx ? Math.PI / 2 : 0, 1, J.cx, J.cz); }
    }
    J.j++;
    return n;
  }
  /** the nearest CAP candidates into the back pool + its pad grid, then swapped in */
  finish(J) {
    const n = this.nCand, keys = this.keys.subarray(0, n);
    keys.sort();
    const B = this._back, G = this._bgrid, C = this.cand, byKind = this.stats.byKind;
    byKind.fill(0);
    G.heads.fill(-1); G.n = 0; G.x0 = Math.floor(J.cx / CELL) * CELL - (GRID / 2) * CELL; G.z0 = Math.floor(J.cz / CELL) * CELL - (GRID / 2) * CELL;
    let m = 0, pads = 0;
    for (let q = 0; q < Math.min(n, CAP); q++) {
      const c = keys[q] % 8192, o = c * 5, L = B[m++];
      L.x = C[o]; L.y = C[o + 1]; L.z = C[o + 2]; L.yaw = C[o + 3]; L.k = C[o + 4]; L.kind = LEDGE_KINDS[L.k]; L.drop = 0;
      byKind[L.k]++;
      if (!PAD_KIND[L.k]) continue;
      pads++;
      // a pad in every cell its disc touches (at most 4)
      const i0 = Math.floor((L.x - PAD_R - G.x0) / CELL), i1 = Math.floor((L.x + PAD_R - G.x0) / CELL);
      const j0 = Math.floor((L.z - PAD_R - G.z0) / CELL), j1 = Math.floor((L.z + PAD_R - G.z0) / CELL);
      for (let jj = j0; jj <= j1; jj++) for (let ii = i0; ii <= i1; ii++) {
        if (ii < 0 || jj < 0 || ii >= GRID || jj >= GRID || G.n >= G.next.length) continue;
        const cell = jj * GRID + ii;
        G.pad[G.n] = m - 1; G.next[G.n] = G.heads[cell]; G.heads[cell] = G.n; G.n++;
      }
    }
    for (let q = m; q < CAP; q++) { const L = B[q]; L.x = 1e9; L.y = -1e9; L.z = 1e9; L.k = -1; L.kind = ""; }
    this._back = this.ledges; this.ledges = B;
    this._bgrid = this.grid; this.grid = G;
    this.at.x = J.cx; this.at.z = J.cz; this.at.t = J.t;
    this.stats.builds++; this.stats.ledges = m; this.stats.pads = pads; this.stats.cands = n;
    this.job = null;
  }
  /** the whole rebuild at once (tests, a teleport) */
  rebuild(fx, fz, t = 0) { this.at.t = -1e9; this.at.x = 1e9; this.job = null; for (let k = 0; k < 10000 && !this.update(fx, fz, 0, t, 1e6); k++); }
}
