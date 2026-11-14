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
