// PARTIAL WALLS OF THE UrbIS 3D SOLIDS (citydefects 2026-11-16, owner image 55: a bright diagonal band across the door of
// Av. J. et P. Carsoel 13). Some solids' wall meshes cover a footprint edge only in part: buildingsolid/538119 has a front
// stepped 33 cm proud of the rest, and its wall there is a 48 cm strip under the flat roof plus ONE diagonal triangle down
// to the ground: the house's real façade (behind it) shows through the hole, the lone triangle cuts across the door.
// Here, per footprint edge of the outer ring: the wall triangles lying on it (all three corners within PLANE m of the
// edge's line, inside its span), their coverage of the edge's wall (samples every 0.25 m along x 0.25 m up, from the
// building's base to the edge's own top, the highest wall point above each sample). Coverage under MIN_COVER with at least
// MIN_HOLE m2 uncovered: the edge's wall is rebuilt as one quad strip following that top line (ground to top), its own
// triangles dropped. Pure (no three.js): viewer/facadeGeom.js uses it (?wallfix=old: off), tools/audit/wallAudit.mjs counts.
const RECESS_MIN = 0.45;   // (a recess under this deep: a step, rebuilt)
const PLANE = 0.2, MIN_COVER = 0.85, MIN_HOLE = 1.0, STEP = 0.25, MIN_EDGE = 0.25, SHORT = 1.0, SHORT_HOLE = 0.3;   // (short edges: the returns of a stepped front, Carsoel 13's 33 cm sides)

/** tris: [{ p: [[x, y, z] x3], n, area }] (the building's wall triangles); ring: [[x, z], ...] its outer footprint;
 *  base: the building's base height; roofs: its roof triangles (optional: the recess test sees its soffits).
 *  Returns { tris (the repaired list), edges: [{ a, b, cover, hole, rebuilt }] } */
export function repairWalls(tris, ring, base, { fix = true, party = null, roofs = null, empty = true } = {}) {
  const used = new Set(), flip = new Set(), out = [], edges = [], pend = [];
  const n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
  // (holes 2026-11-17) the ring's winding: the rebuilt quads must face OUT of the footprint. The wall material is
  // FrontSide (facades.js BLD_SIDE) and facadeGeom.js pushes the triangles as wound: the strips used to be wound
  // along the edge's left normal (-tz, tx), INTO every counter-clockwise ring (all of Uccle's): every rebuilt wall
  // was culled from the street, a hole where the partial UrbIS wall had been (Place de Saint-Job, owner image 60)
  let area2 = 0;
  for (let i = 0; i < n; i++) { const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % n]; area2 += x0 * z1 - x1 * z0; }
  const out1 = area2 > 0 ? -1 : 1;                   // the outward normal = out1 x (-tz, tx)
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n], L = Math.hypot(bx - ax, bz - az);
    if (L < MIN_EDGE) continue;
    const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
    // the triangles on this edge, in (u along, y) coordinates
    const on = [];
    tris.forEach((t, k) => {
      if (used.has(k) || Math.abs(t.n[1]) > 0.3) return;
      // in the edge's plane (all corners within PLANE of its line); overlapping its span. A triangle that also runs past
      // the span's ends (a wall running on along a collinear neighbour edge: Carsoel 13's ground floor, whose diagonal
      // triangle reached from the rebuilt edge to the next corner) is "over": its part outside the span is kept, clipped
      let ok = true, u0 = Infinity, u1 = -Infinity, dSum = 0;
      for (const q of t.p) {
        const dx = q[0] - ax, dz = q[2] - az, d = dx * nx + dz * nz, u = dx * tx + dz * tz;
        if (Math.abs(d) > PLANE) { ok = false; break; }
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); dSum += d;
      }
      if (!ok || u1 < 0.05 || u0 > L - 0.05) return;
      on.push({ k, q: t.p.map((q) => [(q[0] - ax) * tx + (q[2] - az) * tz, q[1]]), over: u0 < -PLANE || u1 > L + PLANE, d: dSum / 3, n: t.n });
    });
    // (claude/walls2, rule walls-closed-from-street, docs/MISSING_WALLS_CENSUS.md E2) an EMPTY edge (no UrbIS triangle on it
    // at all: Rue de Verrewinkel's 95C / 95D blocks, F7 723572 / 723573, both long sides absent in the source) used to be
    // skipped here: the street saw into the solid. Now it is judged like a partial one, its top line the building's own
    // roof just inside it; a party stretch, a recess (the rays in meet a front face or nothing: a carport, a canopy) and a
    // wall-less solid (facadeGeom.js calls this only with walls) stay open. empty false (= ?wallempty=old): skipped.
    if (!on.length && !(empty && roofs)) continue;
    // the edge's top line: the highest wall point over each u (from the triangles' edges); an empty edge: its roof
    const topAt = (u) => {
      if (!on.length) return roofY(ax + tx * Math.min(L - 0.05, Math.max(0.05, u)) - onx * 0.05, az + tz * Math.min(L - 0.05, Math.max(0.05, u)) - onz * 0.05, roofs);
      let hi = -Infinity;
      for (const { q } of on) for (let e = 0; e < 3; e++) {
        const A = q[e], B = q[(e + 1) % 3];
        if ((A[0] - u) * (B[0] - u) > 0) continue;
        const y = Math.abs(B[0] - A[0]) < 1e-6 ? Math.max(A[1], B[1]) : A[1] + (B[1] - A[1]) * (u - A[0]) / (B[0] - A[0]);
        if (y > hi) hi = y;
      }
      return hi;
    };
    const inTri = (u, y, q) => {
      const [A, B, C] = q, d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(d) < 1e-9) return false;
      const l1 = ((B[1] - C[1]) * (u - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (u - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
      return l1 >= -1e-4 && l2 >= -1e-4 && 1 - l1 - l2 >= -1e-4;
    };
    // (a stretch with another building against it, party(x, z) true just outside the edge on either side: a party wall
    // its neighbour's own wall closes: not a hole, and a wall rebuilt there would z-fight with the neighbour's)
    // (the edge's outward side, per edge where the ring's own test is clear: a self-crossing ring sliver turns locally)
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, inL = pipR(mx + nx * 0.1, mz + nz * 0.1, ring), inR = pipR(mx - nx * 0.1, mz - nz * 0.1, ring);
    const o1 = inL !== inR ? (inL ? -1 : 1) : out1, onx = o1 * nx, onz = o1 * nz;
    let tot = 0, cov = 0, partyN = 0;
    const open = [];                                                            // the uncovered samples [u, y]
    for (let u = Math.min(STEP / 2, L / 2); u < L; u += Math.min(STEP, L / 2)) {
      const top = topAt(u);
      if (!(top > base + 0.3)) continue;
      const px = ax + tx * u, pz = az + tz * u;
      if (party && (party(px + nx * 0.4, pz + nz * 0.4) || party(px - nx * 0.4, pz - nz * 0.4))) { partyN++; continue; }
      for (let y = base + STEP / 2; y < top; y += STEP) { tot++; if (on.some(({ q }) => inTri(u, y, q))) cov++; else open.push([u, y]); }
    }
    if (partyN && tot === 0) continue;
    const cover = tot ? cov / tot : 1, hole = (tot - cov) * STEP * STEP;
    // (holes 2026-11-17) A RECESS, NOT A HOLE: loggias along a block's front, an oriel over a recessed ground floor
    // (Place de Saint-Job, buildingsolid/557601: the bay 0.55 m proud from 2.5 m up), a flat roof overhanging its walls
    // (the footprint is the roof's outline), a canopy on posts. Per uncovered sample, what the street sees through it: a
    // ray in from the edge against the building's own walls and roofs; the first triangle it meets must be a FRONT face
    // (wound towards the ray: the recessed wall, a soffit) or nothing (the open air under an overhang / a canopy). A
    // back face is the inside of the solid (its far wall seen from within): a hole. (A ray up as well flagged every
    // canopy without a modelled soffit, whose walls would then be rebuilt into a closed box.) All samples
    // closed: the edge stays as UrbIS drew it (a rebuilt wall there flattened the loggias and, wound inward until today,
    // was culled: the owner's hollow blocks, image 64). Only a shallow step (the recess under RECESS_MIN deep: Carsoel
    // 13's front 33 cm proud with a lone diagonal across the door) is still rebuilt.
    const solid = roofs ? tris.concat(roofs) : tris;
    /** every uncovered sample sees a front face or nothing (extra: walls rebuilt on other edges) -> { recess, depth } */
    const probe = (extra = []) => {
      let depth = Infinity;
      for (const [u, y] of open) {
        const px = ax + tx * u, pz = az + tz * u, d = [-onx, 0, -onz];
        let best = Infinity, face = 0;                                          // the first hit, front (1) / back (-1)
        for (const list of [solid, extra]) for (const t of list) {
          const h = rayTri(px, y, pz, d, t.p);
          if (h > 0.05 && h < best) { best = h; face = t.n[0] * d[0] + t.n[2] * d[2] < 0 ? 1 : -1; }
        }
        if (face < 0) return { recess: false, depth };
        depth = Math.min(depth, best);
      }
      return { recess: true, depth };
    };
    const { recess, depth } = cover < MIN_COVER && open.length ? probe() : { recess: false, depth: Infinity };
    const closed = recess && depth >= RECESS_MIN;
    // (an edge with a party stretch is left as it is: dropping its triangles would open the wall above the neighbour)
    const bad = cover < MIN_COVER && hole >= (L < SHORT ? SHORT_HOLE : MIN_HOLE) && partyN === 0 && !closed;
    edges.push({ a: [ax, az], b: [bx, bz], cover: Math.round(cover * 100) / 100, hole: Math.round(hole * 10) / 10, party: partyN > 0, recess: closed, depth: recess ? Math.round(depth * 100) / 100 : null, out: [onx, onz], rebuilt: bad && fix });
    // (holes) a UrbIS triangle on this outer edge wound INTO the footprint (120 city-wide that tools/orient_buildings.mjs's
    // ray parity left inward: thin returns, notches) is culled from the street: turned to face out (not on party walls)
    // (and the triangle's own centre agrees: in front of it inside the footprint, behind it outside; a ring's notch
    // slivers turn the edge test round locally)
    if (fix && !bad && partyN === 0 && inL !== inR) for (const o of on) {
      if (o.n[0] * onx + o.n[2] * onz >= -0.5) continue;
      const p = tris[o.k].p, cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cz = (p[0][2] + p[1][2] + p[2][2]) / 3, h = Math.hypot(o.n[0], o.n[2]);
      if (pipR(cx + o.n[0] / h * 0.3, cz + o.n[2] / h * 0.3, ring) && !pipR(cx - o.n[0] / h * 0.3, cz - o.n[2] / h * 0.3, ring)) flip.add(o.k);
    }
    const e = edges[edges.length - 1];
    // (the rebuild runs after every edge is classified: a short return beside a rebuilt front follows it, below)
    pend.push({ i, e, probe, bad: bad && fix, closed, ret: fix && !bad && partyN === 0 && L < SHORT && hole >= SHORT_HOLE && cover < MIN_COVER, run: () => {
    // rebuild: a strip of quads every <= 1 m along, from the base to the top line, on the edge's line, facing out
    for (const o of on) {
      used.add(o.k);
      if (!o.over) continue;
      // keep the triangle's parts outside [0, L] (u <= 0 and u >= L), fanned, back in world space on its own plane
      for (const [sg, c] of [[1, 0], [-1, L]]) {          // keep u <= 0: sg = 1 (u - 0 <= 0); keep u >= L: sg = -1
        const poly = clipU(o.q, sg, c);
        if (poly.length < 3) continue;
        const W = poly.map(([u, y]) => [ax + tx * u + nx * o.d, y, az + tz * u + nz * o.d]);
        for (let k2 = 1; k2 + 1 < W.length; k2++) { const A = W[0], B = W[k2], Cc = W[k2 + 1], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
          out.push({ p: [A, B, Cc], n: o.n, area: 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx), clipped: true }); }
      }
    }
    // the top line: the edge's own wall top or, higher, the building's roof just inside the edge (holes, browser
    // check: Place Saint-Job 766098's front was rebuilt up to its partial wall's top only: sky notches under the eaves,
    // and the painted façade read its eaves from that low line: no window over the ground floor)
    const steps = Math.max(1, Math.ceil(L / 0.5)), pts = [];
    for (let s = 0; s <= steps; s++) {
      const u = Math.min(L, (L * s) / steps), uu = Math.min(L - Math.min(0.05, L / 4), Math.max(Math.min(0.05, L / 4), u));   // (5 cm in: the mesh's corner vertices sit mm off the footprint's: at 1 mm in, no triangle and the corner dropped to the base)
      const top = Math.max(topAt(uu), roofs ? roofY(ax + tx * uu - onx * 0.05, az + tz * uu - onz * 0.05, roofs) : -Infinity);
      pts.push([ax + tx * u, az + tz * u, top > base ? top : base]);
    }
    const sideN = [o1 * nx, 0, o1 * nz];          // outward
    for (let s = 0; s < steps; s++) {
      const [x0, z0, y0] = pts[s], [x1, z1, y1] = pts[s + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (party && (party(mx + nx * 0.4, mz + nz * 0.4) || party(mx - nx * 0.4, mz - nz * 0.4))) continue;   // (a party stretch: the neighbour's)
      const a = [x0, base, z0], b = [x1, base, z1], c = [x1, y1, z1], d = [x0, y0, z0];
      // (wound so (B - A) x (C - A) points along sideN: a, b, c has the left normal (-tz, tx); the front faces are drawn)
      const t1 = o1 > 0 ? [a, b, c] : [a, c, b], t2 = o1 > 0 ? [a, c, d] : [a, d, c];
      out.push({ p: t1, n: sideN, area: 0.5 * Math.abs((y1 - base) * Math.hypot(x1 - x0, z1 - z0)), rebuilt: true });
      out.push({ p: t2, n: sideN, area: 0.5 * Math.abs((y0 - base) * Math.hypot(x1 - x0, z1 - z0)), rebuilt: true });
    }
    } });
  }
  // (holes) a short open return (under SHORT) whose neighbour edge is rebuilt goes with it: Carsoel 13's 33 cm sides of
  // its rebuilt front, else open slots into the step behind the new wall (the returns themselves see only open air)
  const byI = new Map(pend.map((q) => [q.i, q]));
  for (const q of pend) if (q.ret && (byI.get((q.i + n - 1) % n)?.bad || byI.get((q.i + 1) % n)?.bad)) { q.bad = true; q.e.rebuilt = true; q.e.recess = false; }
  for (const q of pend) if (q.bad) q.run();
  // (holes) a recess left open that now looks through the back of a wall rebuilt on another edge (its corner, a return)
  // is rebuilt as well (the audit's re-run found 7 such: an open slot into the new wall's culled back)
  for (let pass = 0; pass < 2; pass++) {
    const extra = out.filter((t) => t.rebuilt);
    if (!extra.length) break;
    let more = false;
    for (const q of pend) if (fix && q.closed && !q.bad && !q.probe(extra).recess) { q.bad = more = true; q.e.rebuilt = true; q.e.recess = false; q.run(); }
    if (!more) break;
  }
  tris.forEach((t, k) => {
    if (used.has(k)) return;
    out.push(flip.has(k) ? { ...t, p: [t.p[0], t.p[2], t.p[1]], n: [-t.n[0], -t.n[1], -t.n[2]], flipped: true } : t);
  });
  return { tris: out, edges };
}

/** a ray from (x, y, z) along d = [dx, dy, dz] against triangle p (either side): the distance, or Infinity */
function rayTri(x, y, z, d, p) {
  const [A, B, C] = p, e1x = B[0] - A[0], e1y = B[1] - A[1], e1z = B[2] - A[2], e2x = C[0] - A[0], e2y = C[1] - A[1], e2z = C[2] - A[2];
  const hx = d[1] * e2z - d[2] * e2y, hy = d[2] * e2x - d[0] * e2z, hz = d[0] * e2y - d[1] * e2x;
  const det = e1x * hx + e1y * hy + e1z * hz;
  if (Math.abs(det) < 1e-10) return Infinity;
  const f = 1 / det, sx = x - A[0], sy = y - A[1], sz = z - A[2], u = f * (sx * hx + sy * hy + sz * hz);
  if (u < -1e-4 || u > 1 + 1e-4) return Infinity;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = f * (d[0] * qx + d[1] * qy + d[2] * qz);
  if (v < -1e-4 || u + v > 1 + 1e-4) return Infinity;
  const t = f * (e2x * qx + e2y * qy + e2z * qz);
  return t > 0 ? t : Infinity;
}

/** the highest upward roof surface over (x, z) (the building's roof triangles), or -Infinity */
function roofY(x, z, roofs) {
  let hi = -Infinity;
  for (const t of roofs) {
    if (t.n[1] < 0.1) continue;
    const [A, B, C] = t.p, d = (B[2] - C[2]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[2] - C[2]);
    if (Math.abs(d) < 1e-9) continue;
    const l1 = ((B[2] - C[2]) * (x - C[0]) + (C[0] - B[0]) * (z - C[2])) / d, l2 = ((C[2] - A[2]) * (x - C[0]) + (A[0] - C[0]) * (z - C[2])) / d, l3 = 1 - l1 - l2;
    if (l1 < -1e-3 || l2 < -1e-3 || l3 < -1e-3) continue;
    hi = Math.max(hi, l1 * A[1] + l2 * B[1] + l3 * C[1]);
  }
  return hi;
}

function pipR(x, z, r) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
  return c;
}

/** a polygon in (u, y) clipped to sg * (u - c) <= 0 */
function clipU(poly, sg, c) {
  const out = [], f = (p) => sg * (p[0] - c);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], fa = f(a), fb = f(b);
    if (fb <= 0) { if (fa > 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } out.push(b); }
    else if (fa <= 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
