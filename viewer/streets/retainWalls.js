// RETAINING WALLS behind sidewalks (claude/sidewalk round 2, rule 31; ?sidewalk=old = none). Plain JS, worker side.
//
// WHY: with the sidewalk level with its kerb (viewer/surfaces.js groundAt) the ground behind it is cut back as a bank
// (viewer/heightmap.js clampUnder bank). In a park or on a verge that is right. In front of a GARDEN it is not: a front
// garden above the sidewalk sits behind a retaining wall (blue stone, brick, concrete) with its hedge / railing on top.
// The bank left the hedge and the gate posts floating over a 1.5 m bare earth cut (H6 Rue Baron Perelman 4, browser
// turn 2026-11-18).
//
// WHAT: every outer edge of the measured sidewalk mesh (concrete part) whose ground 1.2 m behind it stands more than
// MIN_CUT over the edge, with a garden piece (segment, pillar, gate, hedge: data/gardens) within GARDEN_R of the land
// behind it, gets a wall:
//   - a front face from just under the sidewalk's back edge up to the garden level (blue-stone, aKind 1, as the kerbs:
//     ~1 m stones along it), and end faces where a run of wall stops;
//   - a 0.3 m stone coping on top, then a lawn strip (grass part) at the garden level out to w = cut / BANK_SLOPE.
// The coping + lawn are near-flat street surfaces, so the terrain treats them as the street's outer edge: it is held
// under them, and the signed-distance bank of clampUnder (slope BANK_SLOPE from their back edge, mirrored under them)
// crosses the sidewalk's height exactly at the wall's foot: w = cut / slope is what makes that line land on the front
// face. Behind the strip the garden ground meets it at its level (bank or weld), and the garden pieces settle on it.
// Returns the triangles to add to the concrete / grass parts.

export const MIN_CUT = 0.4;        // m: a lower step stays a bank
const RUN_MIN = 0.1;               // m: a run of wall goes on over lower ground down to this
const MAX_CUT = 3.5;               // m: taller is a structure (a cutting wall the data does not show): no wall over it
const BEHIND = 1.2;                // m: where the garden level is read
const GARDEN_R = 10;             // m: a garden piece (its front line: wall, hedge, gate) this close to the land behind the edge
const HOUSE_R = 25;               // m
const COPING = 0.3;
const HOLD = 1.6;                  // m                // m
const FOOT = 0.06;                 // m: the face starts this far under the sidewalk's edge (no crack)

/**
 * @param edges   outer edges of the sidewalk mesh: [ax, ay, az, bx, by, bz, nx, nz, u, v] (heightmap.js edgeField collect)
 * @param ground  (x, z) -> the bare ground (the DTM, decks)
 * @param gardenNear (x, z, r) -> true when a garden piece is within r
 * @param slope   the bank slope (roadBuild.js BANK_SLOPE)
 * @param inTile  (x, z) -> true inside the tile
 */
export function retainingWalls(edges, ground, gardenNear, { slope = 0.6, inTile = () => true, wallRay = null, publicAt = null, covered = null } = {}) {
  // private land behind the edge (a front garden): not a park / wood / green area (OSM areas, publicAt)
  const priv = (mx, mz, nx, nz) => {
    const px = mx + nx * (BEHIND + 0.8), pz = mz + nz * (BEHIND + 0.8);
    if (publicAt && publicAt(px, pz)) return 0;
    // (a garden front or a house behind it: private for sure; with neither, land outside every public green area is
    // still a private parcel in Uccle (the streets are the measured surfaces): a deep villa garden, a driveway's bank)
    // (evidence: a garden front, or a house straight behind; a run of wall then goes on over private-looking land
    // between, below: a deep villa garden's drive)
    return gardenNear(px, pz, GARDEN_R) || (wallRay ? wallRay(mx, mz, nx, nz, HOUSE_R) < HOUSE_R : false) ? 2 : 1;
  };
  // 1. which edges get a wall
  const info = edges.map((e) => {
    const [ax, ay, az, bx, by, bz, nx, nz] = e, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (!inTile(mx, mz) || Math.hypot(bx - ax, bz - az) < 0.05) return null;
    const q = { cut: ground(mx + nx * BEHIND, mz + nz * BEHIND) - (ay + by) / 2, priv: priv(mx, mz, nx, nz) };
    return q;
  });
  const on = info.map((q) => !!q && q.priv === 2 && q.cut >= MIN_CUT && q.cut <= MAX_CUT);
  // runs grown along the edge chains: a lower stretch (>= RUN_MIN) between or beside wall edges carries the wall on
  // (a gap of one edge left the bank's grid teeth showing between two walls)
  const byV = new Map(); edges.forEach((e, i) => { for (const id of [e[8], e[9]]) { let L = byV.get(id); if (!L) byV.set(id, (L = [])); L.push(i); } });
  for (let it = 0; it < 24; it++) {
    let grown = 0;
    edges.forEach((e, i) => {
      if (on[i] || !info[i] || !info[i].priv || info[i].cut < RUN_MIN || info[i].cut > MAX_CUT) return;
      if ([e[8], e[9]].some((id) => byV.get(id).some((j) => j !== i && on[j]))) { on[i] = true; grown++; }
    });
    if (!grown) break;
  }
  const wall = edges.filter((e, i) => on[i]);
  if (!wall.length) return null;
  // 2. per vertex (welded): the mean outward normal of its wall edges, its garden level, its strip width
  const V = new Map();
  for (const e of wall) for (const [id, x, y, z] of [[e[8], e[0], e[1], e[2]], [e[9], e[3], e[4], e[5]]]) {
    let v = V.get(id); if (!v) V.set(id, (v = { x, y, z, nx: 0, nz: 0, n: 0 }));
    v.nx += e[6]; v.nz += e[7]; v.n++;
  }
  for (const v of V.values()) {
    const L = Math.hypot(v.nx, v.nz) || 1; v.nx /= L; v.nz /= L;
    // the garden level: the highest ground over the lawn strip the wall's top carries (out to its back + 0.5 m), in a fan
    // of +-35 degrees round the normal (a garden rising diagonally to the wall); read only 1.2 m behind, a garden still
    // rising past it stood over the strip
    let cut = ground(v.x + v.nx * BEHIND, v.z + v.nz * BEHIND) - v.y;
    for (const [c, sn] of [[1, 0], [0.82, 0.57], [0.82, -0.57]]) {
      const dx = v.nx * c - v.nz * sn, dz = v.nz * c + v.nx * sn;
      for (let d = 0.5; d <= HOLD + 0.9 + 1e-6; d += 0.5) cut = Math.max(cut, ground(v.x + dx * d, v.z + dz * d) - v.y);
    }
    cut = Math.min(MAX_CUT, Math.max(MIN_CUT, cut));
    // (the strip as deep as the hold behind the face + 0.4 m: the hold keeps the terrain under it low (all of it: a
    // grid vertex behind the face left at the garden level made a terrain tooth in front of the face), the garden and
    // its hedge / gate start right behind it)
    v.top = v.y + cut; v.w = HOLD + 0.4;
    // (never over another street surface: at a corner of the sidewalk the averaged normal could swing the strip's back
    // over the sidewalk itself, and the terrain was raised to it there)
    if (covered) for (let d = 0.25; d <= v.w + 1e-6; d += 0.25) if (covered(v.x + v.nx * d, v.z + v.nz * d)) { v.w = Math.max(0.05, d - 0.25); v.cut = true; break; }
  }
  // 3. geometry: { pos, nrm, uv, idx } for the stone (concrete part, aKind 1) and the lawn (grass part)
  const stone = { pos: [], nrm: [], uv: [], idx: [] }, lawn = { pos: [], nrm: [], uv: [], idx: [] };
  // hold: not drawn, for viewer/heightmap.js clampUnder only: the terrain behind the face held at the sidewalk's height
  // over HOLD m, so no terrain triangle rises in front of the face (the strip covers it from above)
  const hold = { pos: [], nrm: [], uv: [], idx: [] };
  const quad = (G, P, n, uvs) => {
    const i = G.pos.length / 3;
    P.forEach((p, k) => { G.pos.push(p[0], p[1], p[2]); G.nrm.push(n[0], n[1], n[2]); G.uv.push(uvs[k][0], uvs[k][1]); });
    // wound to face n
    const [a, b, c] = P, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const d = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
    if (d >= 0) G.idx.push(i, i + 1, i + 2, i, i + 2, i + 3); else G.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
  };
  let len = 0;
  for (const e of wall) {
    const A = V.get(e[8]), B = V.get(e[9]), L = Math.hypot(B.x - A.x, B.z - A.z);
    const fn = [-e[6], 0, -e[7]];                              // the face looks at the sidewalk
    quad(stone, [[A.x, A.y - FOOT, A.z], [B.x, B.y - FOOT, B.z], [B.x, B.top, B.z], [A.x, A.top, A.z]], fn,
      [[len, 0], [len + L, 0], [len + L, B.top - B.y], [len, A.top - A.y]]);
    const cpA = Math.min(COPING, A.w), cpB = Math.min(COPING, B.w);
    const cA = [A.x + A.nx * cpA, A.z + A.nz * cpA], cB = [B.x + B.nx * cpB, B.z + B.nz * cpB];
    quad(stone, [[A.x, A.top, A.z], [B.x, B.top, B.z], [cB[0], B.top, cB[1]], [cA[0], A.top, cA[1]]], [0, 1, 0],
      [[len, 0], [len + L, 0], [len + L, COPING], [len, COPING]]);
    const wA = [A.x + A.nx * A.w, A.z + A.nz * A.w], wB = [B.x + B.nx * B.w, B.z + B.nz * B.w];
    const hA = HOLD, hB = HOLD;                      // (under another street surface where the strip stops short: hidden)
    quad(hold, [[A.x, A.y, A.z], [B.x, B.y, B.z], [B.x + B.nx * hB, B.y, B.z + B.nz * hB], [A.x + A.nx * hA, A.y, A.z + A.nz * hA]], [0, 1, 0], [[0, 0], [0, 0], [0, 0], [0, 0]]);
    quad(lawn, [[cA[0], A.top, cA[1]], [cB[0], B.top, cB[1]], [wB[0], B.top, wB[1]], [wA[0], A.top, wA[1]]], [0, 1, 0],
      [[cA[0], cA[1]], [cB[0], cB[1]], [wB[0], wB[1]], [wA[0], wA[1]]]);
    len += L;
  }
  // end faces: a vertex of one wall edge only, closed toward the bank beside it
  for (const e of wall) for (const [id, other] of [[e[8], e[9]], [e[9], e[8]]]) {
    const v = V.get(id); if (v.n !== 1) continue;
    const o = V.get(other), tx = v.x - o.x, tz = v.z - o.z, tl = Math.hypot(tx, tz) || 1;
    const bx = v.x + v.nx * v.w, bz = v.z + v.nz * v.w;
    quad(stone, [[v.x, v.y - FOOT, v.z], [v.x, v.top, v.z], [bx, v.top, bz], [bx, v.top - 0.15, bz]], [tx / tl, 0, tz / tl],
      [[0, 0], [0, v.top - v.y], [v.w, v.top - v.y], [v.w, 0]]);
  }
  return { stone, lawn, hold: { position: Float32Array.from(hold.pos), index: Uint32Array.from(hold.idx) }, edges: wall.length, metres: +len.toFixed(1) };
}

/** append { pos, nrm, uv, idx } to a finished part (viewer/surfaces.js Part.finish layout); extra attributes get `ex` or 0 */
export function appendToPart(part, G, ex = {}) {
  if (!G.idx.length) return part;
  const n0 = part.position.length / 3, n = G.pos.length / 3;
  const cat = (A, B) => { const C = new A.constructor(A.length + B.length); C.set(A); C.set(B, A.length); return C; };
  part.position = cat(part.position, Float32Array.from(G.pos));
  part.normal = cat(part.normal, Float32Array.from(G.nrm));
  part.uv = cat(part.uv, Float32Array.from(G.uv));
  for (const [k, a] of Object.entries(part.attributes || {})) {
    const add = new Float32Array(n * a.itemSize), v = ex[k];
    if (v !== undefined) for (let i = 0; i < n; i++) for (let c = 0; c < a.itemSize; c++) add[i * a.itemSize + c] = Array.isArray(v) ? v[c] : v;
    a.array = cat(a.array, add);
  }
  if (part.extra) part.extra = cat(part.extra, new Float32Array(n));
  const I = new Uint32Array(G.idx.length); for (let i = 0; i < I.length; i++) I[i] = G.idx[i] + n0;
  part.index = cat(part.index, I);
  if (part.vertexCount !== undefined) part.vertexCount += n;
  return part;
}

/** data/gardens/<tile>.json -> (x, z, r) => a garden piece within r (2 m buckets of points every <= 1 m) */
export function gardenIndex(doc) {
  if (!doc) return () => false;
  const B = 2, grid = new Map(), add = (x, z) => { const k = `${Math.floor(x / B)},${Math.floor(z / B)}`; let L = grid.get(k); if (!L) grid.set(k, (L = [])); L.push(x, z); };
  for (const g of doc.segs || []) { const L = Math.hypot(g[3] - g[0], g[5] - g[2]), n = Math.max(1, Math.ceil(L)); for (let k = 0; k <= n; k++) add(g[0] + (g[3] - g[0]) * k / n, g[2] + (g[5] - g[2]) * k / n); }
  for (const p of doc.pillars || []) add(p[0], p[2]);
  for (const p of doc.gates || []) add(p[0], p[2]);
  for (const h of doc.hedges || []) for (const [x, z] of h.points || []) add(x, z);
  return (x, z, r) => {
    for (let i = Math.floor((x - r) / B); i <= Math.floor((x + r) / B); i++) for (let j = Math.floor((z - r) / B); j <= Math.floor((z + r) / B); j++) {
      const L = grid.get(`${i},${j}`); if (!L) continue;
      for (let k = 0; k < L.length; k += 2) if ((L[k] - x) ** 2 + (L[k + 1] - z) ** 2 <= r * r) return true;
    }
    return false;
  };
}
