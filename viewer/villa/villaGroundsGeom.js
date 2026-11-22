// THE VILLA'S PAVED GROUNDS, the geometry alone (pure JS, no three: the viewer's villaGrounds.js and the gate row
// tools/audit/villaCheck.mjs build the SAME triangles): each polygon of villa.json grounds (frame u / w) triangulated
// (ear clipping), split to <= MAX_EDGE, draped LIFT over the ground, a skirt SKIRT down round every edge, facing out.
export const LIFT = 0.035, SKIRT = 0.2, MAX_EDGE = 0.5;
export const ZONES = { drive: 0, forecourt: 0, garage_floor: 1, path_back: 0 };
/** the garage floor's height (without LIFT): a 1.5 m box average of the terrain, never under it (the cars stand on it) */
export const smoothGround = (groundAt) => (x, z) => { let a = 0, n = 0; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { a += groundAt(x + i * 0.75, z + j * 0.75); n++; } return Math.max(a / n, groundAt(x, z)); };

function earClip(ring) {
  const area = ring.reduce((s, p, i) => { const q = ring[(i + 1) % ring.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const idx = ring.map((_, i) => i); if (area < 0) idx.reverse();
  const out = [], cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 1000) {
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const A = ring[ia], Bp = ring[ib], Cp = ring[ic];
      if (cross(A, Bp, Cp) <= 1e-12) continue;
      if (idx.some((k) => k !== ia && k !== ib && k !== ic && inside(ring[k], A, Bp, Cp))) continue;
      out.push([ia, ib, ic]); idx.splice(i, 1); break;
    }
  }
  if (idx.length === 3) out.push(idx.slice());
  return out;
}
function subdivide(tris, maxLen) {
  const out = [], stack = [...tris];
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  while (stack.length) {
    const [a, b, c] = stack.pop();
    const ab = d(a, b), bc = d(b, c), ca = d(c, a), m = Math.max(ab, bc, ca);
    if (m <= maxLen) { out.push([a, b, c]); continue; }
    if (m === ab) { const k = mid(a, b); stack.push([a, k, c], [k, b, c]); }
    else if (m === bc) { const k = mid(b, c); stack.push([a, b, k], [a, k, c]); }
    else { const k = mid(c, a); stack.push([a, b, k], [k, b, c]); }
  }
  return out;
}

/** toWorld(u, w) -> [x, z] (city), groundAt(x, z) -> the terrain's height */
export function groundsGeometry({ notes, toWorld, groundAt }) {
  const P = [], N = [], Z = [], UW = [], I = [], rings = [];
  for (const [name, ring] of Object.entries(notes.grounds)) {
    const zone = ZONES[name] ?? 0;
    // the garage's floor: the DTM there is the old basement ramp, bumpy by 0.2-0.8 m; its drape is SMOOTHED (a 1.5 m
    // box average) and never under the terrain (max), so the slab reads as a floor and nothing of the ground shows
    const surf = zone === 1 ? smoothGround(groundAt) : groundAt;
    const first = I.length;
    const key = new Map();
    const vert = (u, w, drop = 0) => {
      const k = `${u.toFixed(4)},${w.toFixed(4)},${drop}`;
      let i = key.get(k);
      if (i != null) return i;
      const [x, z] = toWorld(u, w);
      P.push(x, surf(x, z) + LIFT - drop, z); N.push(0, 1, 0); Z.push(zone); UW.push(u, w);
      i = P.length / 3 - 1; key.set(k, i);
      return i;
    };
    // a rectilinear grid (the rings are axis-aligned in the frame): lines at every ring coordinate and every <= MAX_EDGE
    // between; the cells whose centre is inside the ring. No T-junction anywhere (the welded rim the skirt follows)
    const lines = (vals) => { const v = [...new Set(vals)].sort((x, y) => x - y), out = [v[0]]; for (let i = 1; i < v.length; i++) { const n = Math.max(1, Math.ceil((v[i] - v[i - 1]) / MAX_EDGE)); for (let k = 1; k <= n; k++) out.push(v[i - 1] + (v[i] - v[i - 1]) * k / n); } return out; };
    const us = lines(ring.map((p) => p[0])), ws = lines(ring.map((p) => p[1]));
    const inRing = (u, w) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [ui, wi] = ring[i], [uj, wj] = ring[j]; if ((wi > w) !== (wj > w) && u < ((uj - ui) * (w - wi)) / (wj - wi) + ui) c = !c; } return c; };
    for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < ws.length - 1; j++) {
      if (!inRing((us[i] + us[i + 1]) / 2, (ws[j] + ws[j + 1]) / 2)) continue;
      const q = [[us[i], ws[j]], [us[i + 1], ws[j]], [us[i + 1], ws[j + 1]], [us[i], ws[j + 1]]].map(([u, w]) => vert(u, w));
      for (const [ia, ib, ic] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
        const ax = P[ia * 3], az = P[ia * 3 + 2], bx = P[ib * 3], bz = P[ib * 3 + 2], cx = P[ic * 3], cz = P[ic * 3 + 2];
        const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);       // y of (b - a) x (c - a): facing up
        if (up >= 0) I.push(ia, ib, ic); else I.push(ia, ic, ib);
      }
    }
    // the skirt: on the surface's OWN boundary edges (the edges one surface triangle uses), so the rim and the skirt
    // share their vertices (welded: no T-junction, mesh_audit contact), down SKIRT, facing out
    const ecount = new Map(), third = new Map();
    for (let k = first; k < I.length; k += 3) for (let c = 0; c < 3; c++) {
      const a = I[k + c], b = I[k + (c + 1) % 3], ek = a < b ? `${a},${b}` : `${b},${a}`;
      ecount.set(ek, (ecount.get(ek) ?? 0) + 1); third.set(ek, I[k + (c + 2) % 3]);
    }
    for (const [ek, n] of ecount) {
      if (n !== 1) continue;
      const [t0, t1] = ek.split(",").map(Number);
      const tv = third.get(ek), cx0 = P[tv * 3], cz0 = P[tv * 3 + 2];       // outward = away from the edge's own triangle
      const b0 = vert(UW[t0 * 2], UW[t0 * 2 + 1], SKIRT), b1 = vert(UW[t1 * 2], UW[t1 * 2 + 1], SKIRT);
      const q = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      const [T0, B0, B1, T1] = [q(t0), q(b0), q(b1), q(t1)];
      const e1 = [B0[0] - T0[0], B0[1] - T0[1], B0[2] - T0[2]], e2 = [B1[0] - T0[0], B1[1] - T0[1], B1[2] - T0[2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const ox = (T0[0] + T1[0]) / 2 - cx0, oz = (T0[2] + T1[2]) / 2 - cz0;
      if (nx * ox + nz * oz >= 0) I.push(t0, b0, b1, t0, b1, t1); else I.push(t0, b1, b0, t0, t1, b1);
    }
    rings.push(ring.map(([u, w]) => toWorld(u, w)));
  }
  return { P, N, Z, UW, I, rings };
}
