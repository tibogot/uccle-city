// GROUND FIT (docs/GROUND_FIT.md; owner: "houses inside the ground"). Pure JS, runs in the tile worker.
//
// The UrbIS solids come with walls that run ~1 m into the ground; pipeline/build_buildings.py set each building's
// `base` (its ground-floor line: the doors, the plinth, the window storeys of viewer/facades.js and the façade kit)
// to the LOWEST DTM point around the footprint. In hilly Uccle the ground varies by 1.4 m across a footprint (median,
// p90 3 m): every house whose street is on its uphill side had the pavement across its door and ground-floor windows.
// Real houses take their floor from the street: the front door is at the pavement (a sill / steps up), the slope is
// taken by a taller plinth or a semi-basement on the downhill sides.
//
// drawnGround(hm, parts): the ground AS DRAWN at (x, z): the tile's terrain after carve / weld and the measured street
// surfaces on top (sidewalks, kerbs, squares), the highest of them.
// fitBase(...): the ground-floor line of one building from the drawn ground in front of its front door.

/** (x, z) -> the highest near-flat road-surface triangle there, -Infinity off the streets. 2 m bucket grid. */
export function surfaceTop(parts) {
  const B = 2, cells = new Map(), T = [];
  for (const [name, p] of Object.entries(parts || {})) {
    if (!p?.index || !p.position || name === "paint") continue;
    const P = p.position, I = p.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;            // kerb faces, skirts
      const k = T.length / 9;
      T.push(P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], P[c], P[c + 1], P[c + 2]);
      const i0 = Math.floor(Math.min(P[a], P[b], P[c]) / B), i1 = Math.floor(Math.max(P[a], P[b], P[c]) / B);
      const j0 = Math.floor(Math.min(P[a + 2], P[b + 2], P[c + 2]) / B), j1 = Math.floor(Math.max(P[a + 2], P[b + 2], P[c + 2]) / B);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = i * 100003 + j; let l = cells.get(key); if (!l) cells.set(key, (l = [])); l.push(k); }
    }
  }
  return (x, z) => {
    const l = cells.get(Math.floor(x / B) * 100003 + Math.floor(z / B));
    let best = -Infinity;
    if (l) for (const k of l) {
      const o = k * 9, ax = T[o], az = T[o + 2], bx = T[o + 3], bz = T[o + 5], cx = T[o + 6], cz = T[o + 8];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * T[o + 1] + l2 * T[o + 4] + l3 * T[o + 7];
      if (y > best) best = y;
    }
    return best;
  };
}

/** the ground as drawn: max(terrain grid as carved / welded, street surfaces) */
export function drawnGround(hm, parts) {
  const top = surfaceTop(parts);
  return (x, z) => Math.max(hm.surface(x, z), top(x, z));
}

export const FIT = {
  OUT: 0.35,          // m in front of the wall where the ground is read
  SILL: 0.03,         // the door's threshold over the pavement
  MIN_OPEN: 3.0,      // the line stays this far under the eaves (a storey with its openings)
};

/**
 * The ground-floor line of one building. faces: its wall faces (facadeGeom's first pass: nx, nz, pre = { tx, tz, u0,
 * width, street, partyH }, tris), doorFace: the widest street face (or null), door(f) -> u of the door's centre on
 * the face. ground(x, z): drawnGround. Returns { base, how } (how: "door" | "ring" | "keep").
 *   door: the highest drawn ground across the front door's width, + the sill
 *   ring: no street face: the median ground around the outside of the free walls (a villa in its garden sits level with
 *         its garden, not in a hole cut to the lowest corner)
 * blocked(x, z): another building stands there (its ground is not seen). Clamped: never above eaves - MIN_OPEN, never under the walls' own foot (+ 5 cm).
 */
export function fitBase(b, faces, doorFace, door, ground, wallFoot, blocked = () => false) {
  const at = (f, u, d) => [f.pre.tx * (f.pre.u0 + u) + f.nx * d, f.pre.tz * (f.pre.u0 + u) + f.nz * d];
  const plane = (f) => { let s = 0, k = 0; for (const { p } of f.tris) for (const q of p) { s += q[0] * f.nx + q[2] * f.nz; k++; } return s / k; };
  let y = NaN, how = "keep";
  if (doorFace) {
    const d = plane(doorFace) + FIT.OUT, uc = door(doorFace);
    let g = -Infinity;
    for (const du of [-0.45, 0, 0.45]) {
      const [x, z] = at(doorFace, Math.min(Math.max(uc + du, 0.1), doorFace.pre.width - 0.1), d);
      if (blocked(x, z)) { g = -Infinity; break; }                    // the door bay opens into another building
      g = Math.max(g, ground(x, z));
    }
    if (Number.isFinite(g)) { y = g + FIT.SILL; how = "door"; }
  }
  if (Number.isNaN(y)) {
    const s = [];
    for (const f of faces) {
      if (f.pre.partyH >= 999 || f.pre.width < 1) continue;
      const d = plane(f) + FIT.OUT;
      for (let u = 0.5; u < f.pre.width; u += 1) { const [x, z] = at(f, u, d); if (blocked(x, z)) continue; const g = ground(x, z); if (Number.isFinite(g)) s.push(g); }
    }
    if (s.length) { s.sort((p, q) => p - q); y = s[Math.floor(s.length / 2)] + FIT.SILL; how = "ring"; }
  }
  if (Number.isNaN(y)) return { base: b.base, how: "keep" };
  const eaves = b.eaves ?? b.top;
  y = Math.min(y, Math.max(b.base, eaves - FIT.MIN_OPEN));
  y = Math.max(y, wallFoot + 0.05);
  return { base: y, how };
}

/**
 * WALL FEET down to the drawn ground (JOINS: no open edge over the ground). The UrbIS solids' walls mostly run ~1 m
 * under the lowest DTM point, but on small sheds / garages on banks and where the drawn ground is lower than the DTM
 * (street surfaces, carves) a wall's bottom edge can stand OVER the ground: a visible gap under the wall. Here every
 * bottom edge of a wall (both ends the lowest wall vertex at their x, z; less steep than 31 deg) is checked along its length against the drawn
 * ground 0.35 m outside it (every 0.5 m, not inside another building); where the ground there comes closer than SINK
 * under the edge, the edge moves down (parallel) until it is SINK under the ground all along (vertices at the same spot move together: no crack at a
 * corner). An edge more than MAX_GAP over the ground is left (a passage, a wall standing on something else).
 * P / I: buildings.bin (modified in place: the worker's own copy, after the colliders and the roof grid read it).
 * blocked(x, z, b): inside another building. Returns { moved, buildings, maxDrop }.
 */
export const FEET = { SINK: 0.3, MAX_GAP: 2.5 };
/** opts.lowerOnly (default true; false = ?feet=old): a FOOT is only an edge on the wall mesh's LOWER BOUNDARY (claude/walls2,
 *  rule walls-closed-from-street, docs/MISSING_WALLS_CENSUS.md E1). The old test looked at vertices only ("both corners the
 *  lowest wall vertex at their x|z") and moved every vertex at that x|z|y in every wall triangle, so it also pulled down
 *    - the top of a plinth under a recessed porch (I3 536783: a triangle on the edge has its third corner UNDER its line),
 *    - a step in the solid's bottom outline (I3 540548: a sliver's corner over a big wall triangle running on lower),
 *    - a porch lintel 2.4 m up (I3 539754: the front's fan apex at the same x|z|y, its fan running down past it),
 *  and the wall over them tore (996 buildings, 4,755 m2 city-wide). Now an edge is no foot when a triangle on it reaches
 *  below its line, or when either corner is PINNED (a wall triangle of the building holds the point 5 cm under it), and the
 *  corners of such an edge are never moved by another edge (frozen). (A looser test, "the building's wall goes on 0.5 m
 *  lower within 1.5 m", tore no fewer walls on the 7 worst tiles and reopened ~300 gap samples under walls on slopes city-wide: not used.) */
export function falseFeetOf(b, P, I) {
  const key = (v) => `${Math.round(P[v * 3] * 100)}|${Math.round(P[v * 3 + 2] * 100)}`;
  const vkey = (v) => `${key(v)}|${Math.round(P[v * 3 + 1] * 100)}`;
  const ek = (va, vb) => { const a = vkey(va), c = vkey(vb); return a < c ? a + "#" + c : c + "#" + a; };
  const f = b.walls.first, n = b.walls.count;
  // (1) edges with a triangle under them: its third corner under the edge's line
  const below = new Set();
  for (let t = f; t < f + n; t++) for (let e = 0; e < 3; e++) {
    const va = I[t * 3 + e], vb = I[t * 3 + (e + 1) % 3], vc = I[t * 3 + (e + 2) % 3];
    const ex = P[vb * 3] - P[va * 3], ez = P[vb * 3 + 2] - P[va * 3 + 2], L2 = ex * ex + ez * ez || 1e-9;
    const u = ((P[vc * 3] - P[va * 3]) * ex + (P[vc * 3 + 2] - P[va * 3 + 2]) * ez) / L2;
    if (P[vc * 3 + 1] < P[va * 3 + 1] + (P[vb * 3 + 1] - P[va * 3 + 1]) * u - 0.05) below.add(ek(va, vb));
  }
  // (2) PINNED corners: a vertex with wall UNDER it, inside one of the building's wall triangles (the point 5 cm under it
  // lies in a triangle's plane, within 5 cm, inside it): a corner in the middle of a stepped wall (I3 540548: the front's
  // 105.67 m step corner and the west wall's fan corner share their x|z|y with a terrace wall's foot), a fan apex over a
  // porch (I3 539754). The triangle under it would fold over and the wall tear. (Any wall triangle, sloped ones too: the
  // point within 5 cm of its plane, inside it in the plane's own axes.)
  const tris = [];
  for (let t = f; t < f + n; t++) {
    const w = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]].map((q) => [P[q * 3], P[q * 3 + 1], P[q * 3 + 2]]);
    const nx = (w[1][1] - w[0][1]) * (w[2][2] - w[0][2]) - (w[1][2] - w[0][2]) * (w[2][1] - w[0][1]);
    const ny = (w[1][2] - w[0][2]) * (w[2][0] - w[0][0]) - (w[1][0] - w[0][0]) * (w[2][2] - w[0][2]);
    const nz = (w[1][0] - w[0][0]) * (w[2][1] - w[0][1]) - (w[1][1] - w[0][1]) * (w[2][0] - w[0][0]);
    const L = Math.hypot(nx, ny, nz); if (L < 1e-9) continue;
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const [i, j] = ax >= ay && ax >= az ? [1, 2] : ay >= az ? [0, 2] : [0, 1];       // the plane's own 2D axes
    const d = (w[1][j] - w[2][j]) * (w[0][i] - w[2][i]) + (w[2][i] - w[1][i]) * (w[0][j] - w[2][j]);
    if (Math.abs(d) < 1e-12) continue;
    tris.push({ w, n: [nx / L, ny / L, nz / L], i, j, d, x0: Math.min(w[0][0], w[1][0], w[2][0]), x1: Math.max(w[0][0], w[1][0], w[2][0]), z0: Math.min(w[0][2], w[1][2], w[2][2]), z1: Math.max(w[0][2], w[1][2], w[2][2]) });
  }
  const pin = new Map();
  const pinned = (v) => {
    const k = vkey(v); let r = pin.get(k);
    if (r !== undefined) return r;
    r = false;
    const p = [P[v * 3], P[v * 3 + 1] - 0.05, P[v * 3 + 2]];
    for (const q of tris) {
      if (p[0] < q.x0 - 0.05 || p[0] > q.x1 + 0.05 || p[2] < q.z0 - 0.05 || p[2] > q.z1 + 0.05) continue;
      const w = q.w;
      if (Math.abs((p[0] - w[0][0]) * q.n[0] + (p[1] - w[0][1]) * q.n[1] + (p[2] - w[0][2]) * q.n[2]) > 0.05) continue;
      const { i, j, d } = q;
      const l1 = ((w[1][j] - w[2][j]) * (p[i] - w[2][i]) + (w[2][i] - w[1][i]) * (p[j] - w[2][j])) / d, l2 = ((w[2][j] - w[0][j]) * (p[i] - w[2][i]) + (w[0][i] - w[2][i]) * (p[j] - w[2][j])) / d;
      if (l1 >= -1e-3 && l2 >= -1e-3 && 1 - l1 - l2 >= -1e-3) { r = true; break; }
    }
    pin.set(k, r);
    return r;
  };
  /** is edge (va, vb) a FALSE foot (wall under it)? */
  return (va, vb) => below.has(ek(va, vb)) || pinned(va) || pinned(vb);
}
export function sinkFeet(bDoc, P, I, ground, blocked = () => false, { lowerOnly = true } = {}) {
  let moved = 0, buildings = 0, maxDrop = 0, falseFeet = 0;
  const key = (v) => `${Math.round(P[v * 3] * 100)}|${Math.round(P[v * 3 + 2] * 100)}`;
  for (const b of bDoc.buildings) {
    if (b.attrs?._landmark || !b.walls?.count) continue;
    const low = new Map();                                  // x|z -> the lowest wall y there
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let k = 0; k < 3; k++) {
      const v = I[t * 3 + k], q = key(v), y = P[v * 3 + 1];
      if (!(low.get(q) <= y)) low.set(q, y);
    }
    let isFalse = null;                                     // (built on the first candidate edge: most buildings have few)
    let cx = 0, cz = 0, n = 0;
    for (const [x, z] of b.footprint[0]) { cx += x; cz += z; n++; }
    cx /= n; cz /= n;
    const want = new Map();                                 // x|z|y -> the y it goes down to
    const frozen = new Set();                               // (E1) x|z|y of a false foot's corners: never moved (a true foot sharing
                                                            // the corner would pull it down alone and fold the false edge's triangles)
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let e = 0; e < 3; e++) {
      const va = I[t * 3 + e], vb = I[t * 3 + (e + 1) % 3];
      const ya = P[va * 3 + 1], yb = P[vb * 3 + 1];
      if (ya > low.get(key(va)) + 0.01 || yb > low.get(key(vb)) + 0.01) continue;
      const ax = P[va * 3], az = P[va * 3 + 2], bx = P[vb * 3], bz = P[vb * 3 + 2], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.05 || Math.abs(yb - ya) > 0.6 * L) continue;  // a vertical / steep edge: not a foot
      const tx = (bx - ax) / L, tz = (bz - az) / L;
      let nx = tz, nz = -tx;                                // outward: away from the footprint's centre
      if (((ax + bx) / 2 - cx) * nx + ((az + bz) / 2 - cz) * nz < 0) { nx = -nx; nz = -nz; }
      // the shift that puts the whole edge SINK under the ground (the edge moves down parallel: its slope stays)
      let g = Infinity, sh = -Infinity;
      for (let u = 0; u <= L + 1e-6; u += Math.max(0.05, Math.min(0.5, L / 2))) {
        const x = ax + tx * u + nx * FIT.OUT, z = az + tz * u + nz * FIT.OUT;
        if (blocked(x, z, b)) continue;
        const y = ground(x, z);
        if (!Number.isFinite(y)) continue;
        g = Math.min(g, y);
        sh = Math.max(sh, ya + (yb - ya) * Math.min(u / L, 1) - (y - FEET.SINK));
      }
      if (lowerOnly && (isFalse ??= falseFeetOf(b, P, I))(va, vb)) { falseFeet++; for (const v of [va, vb]) frozen.add(key(v) + "|" + Math.round(P[v * 3 + 1] * 100)); continue; }   // wall under / beside it lower: not a foot (E1)
      if (!(sh > 0) || sh > FEET.MAX_GAP + FEET.SINK || Math.min(ya, yb) - g >= FEET.MAX_GAP) continue;
      for (const v of [va, vb]) { const q = key(v) + "|" + Math.round(P[v * 3 + 1] * 100); want.set(q, Math.min(want.get(q) ?? Infinity, P[v * 3 + 1] - sh)); }
    }
    for (const q of frozen) want.delete(q);
    if (!want.size) continue;
    buildings++;
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let k = 0; k < 3; k++) {
      const v = I[t * 3 + k], w = want.get(key(v) + "|" + Math.round(P[v * 3 + 1] * 100));
      if (w !== undefined && w < P[v * 3 + 1]) { maxDrop = Math.max(maxDrop, P[v * 3 + 1] - w); P[v * 3 + 1] = w; moved++; }
    }
  }
  return { moved, buildings, maxDrop, falseFeet };
}

/** (x, z, b) -> is (x, z) inside the footprint of a building other than b (a 10 m bucket grid of the footprints) */
export function footprintIndex(bDoc) {
  const B = 10, cells = new Map();
  for (const b of bDoc.buildings) {
    const r = b.footprint?.[0];
    if (!r || r.length < 3) continue;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    for (let i = Math.floor(x0 / B); i <= Math.floor(x1 / B); i++) for (let j = Math.floor(z0 / B); j <= Math.floor(z1 / B); j++) {
      const k = i * 100003 + j; let l = cells.get(k); if (!l) cells.set(k, (l = [])); l.push(b);
    }
  }
  const pip = (x, z, r) => { let k = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) k = !k; } return k; };
  return (x, z, self) => {
    const l = cells.get(Math.floor(x / B) * 100003 + Math.floor(z / B));
    if (l) for (const b of l) if (b !== self && pip(x, z, b.footprint[0])) return true;
    return false;
  };
}

/** THE CHECK for sinkFeet (tools/groundfit/scan.mjs): per building, the largest gap between a wall's bottom edge and the
 *  drawn ground 0.35 m outside it (edges as sinkFeet finds them; gaps up to FEET.MAX_GAP; 0 = closed). Map b -> {gap, at} */
export function footGaps(bDoc, P, I, ground, blocked = () => false, { lowerOnly = true } = {}) {   // (lowerOnly: as sinkFeet, false feet are no feet)
  const out = new Map();
  const key = (v) => `${Math.round(P[v * 3] * 100)}|${Math.round(P[v * 3 + 2] * 100)}`;
  for (const b of bDoc.buildings) {
    if (!b.walls?.count) continue;
    const low = new Map();
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let k = 0; k < 3; k++) {
      const v = I[t * 3 + k], q = key(v), y = P[v * 3 + 1];
      if (!(low.get(q) <= y)) low.set(q, y);
    }
    let cx = 0, cz = 0, n = 0;
    for (const [x, z] of b.footprint[0]) { cx += x; cz += z; n++; }
    cx /= n; cz /= n;
    let gap = 0, at = null, isFalse = null;
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let e = 0; e < 3; e++) {
      const va = I[t * 3 + e], vb = I[t * 3 + (e + 1) % 3], ya = P[va * 3 + 1], yb = P[vb * 3 + 1];
      if (ya > low.get(key(va)) + 0.01 || yb > low.get(key(vb)) + 0.01) continue;
      const ax = P[va * 3], az = P[va * 3 + 2], bx = P[vb * 3], bz = P[vb * 3 + 2], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.05 || Math.abs(yb - ya) > 0.6 * L) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L;
      let nx = tz, nz = -tx;
      if (((ax + bx) / 2 - cx) * nx + ((az + bz) / 2 - cz) * nz < 0) { nx = -nx; nz = -nz; }
      let eg = 0, eat = null, gmin = Infinity;
      for (let u = 0; u <= L + 1e-6; u += Math.max(0.05, Math.min(0.5, L / 2))) {
        const x = ax + tx * u + nx * FIT.OUT, z = az + tz * u + nz * FIT.OUT;
        if (blocked(x, z, b)) continue;
        const g = ground(x, z), y = ya + (yb - ya) * (u / L), d = y - g;
        if (!Number.isFinite(g)) continue;
        gmin = Math.min(gmin, g);
        if (d > eg) { eg = d; eat = [x, z]; }
      }
      if (lowerOnly && (isFalse ??= falseFeetOf(b, P, I))(va, vb)) continue;
      if (Math.min(ya, yb) - gmin >= FEET.MAX_GAP || eg > FEET.MAX_GAP) continue;   // as sinkFeet: a passage / a wall on something
      if (eg > gap) { gap = eg; at = eat; }
    }
    out.set(b, { gap, at });
  }
  return out;
}
