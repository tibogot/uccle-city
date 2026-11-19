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
const HOLD = 1.6;                  // m
const STEP = 0.35;                 // m: the wall's top climbs in steps of this
const PIER = 0.45, PIER_UP = 0.12;  // m: the pier at a run's end, and how far it stands over the wall
const STONE_SHARE = 0.3;           // share of runs in coursed stone (the rest brick)
const GAP_MAX = 3, GATE_R = 2;     // m: a gap between two runs carried across; a garden gate this near keeps it open
const STACK_R = 4;                 // m: no second wall line within this behind another
const RISER = 0.17, TREAD = 0.3;   // m: a gate's steps (round 5), from the sidewalk up to the garden
const STEPS_MIN = 0.12;            // m: a gate opening with a jump over this gets steps (one step from 12 cm; the census flags > 0.3 on the drawn
                                   // ground; the DTM read here runs a little lower: margin)
const fr = (x) => x - Math.floor(x);
// (a grid of segments, each in every 4 m cell its box touches: near(x, z, r) holds every segment within r of the point,
// and a few more; the wall tests below ran over every edge of the tile: cost)
function segGrid(C = 4) {
  const g = new Map(), K = (i, j) => (i + 50000) * 100000 + (j + 50000);
  return {
    add(e) { for (let i = Math.floor(Math.min(e[0], e[3]) / C); i <= Math.floor(Math.max(e[0], e[3]) / C); i++) for (let j = Math.floor(Math.min(e[2], e[5]) / C); j <= Math.floor(Math.max(e[2], e[5]) / C); j++) { const k = K(i, j); if (!g.has(k)) g.set(k, []); g.get(k).push(e); } },
    near(x, z, r, out = []) {
      out.length = 0;
      for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++) { const c = g.get(K(i, j)); if (c) for (let q = 0; q < c.length; q++) out.push(c[q]); }
      return out;
    },
  };
}
const segD = (x, z, e) => { const ex = e[3] - e[0], ez = e[5] - e[2], L2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((x - e[0]) * ex + (z - e[2]) * ez) / L2)); return Math.hypot(x - e[0] - t * ex, z - e[2] - t * ez); };
const FOOT = 0.06;                 // m: the face starts this far under the sidewalk's edge (no crack)

/**
 * @param edges   outer edges of the sidewalk mesh: [ax, ay, az, bx, by, bz, nx, nz, u, v] (heightmap.js edgeField collect)
 * @param ground  (x, z) -> the bare ground (the DTM, decks)
 * @param gardenNear (x, z, r) -> true when a garden piece is within r
 * @param slope   the bank slope (roadBuild.js BANK_SLOPE)
 * @param inTile  (x, z) -> true inside the tile
 */
export function retainingWalls(edges, ground, gardenNear, { slope = 0.6, inTile = () => true, wallRay = null, publicAt = null, covered = null, gateNear = null } = {}) {
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
    const cut = ground(mx + nx * BEHIND, mz + nz * BEHIND) - (ay + by) / 2;
    // (the private test only where a wall could stand: most outer edges have no step behind them)
    const q = { cut, priv: cut >= RUN_MIN && cut <= MAX_CUT ? priv(mx, mz, nx, nz) : 0 };
    return q;
  });
  const on = info.map((q) => !!q && q.priv === 2 && q.cut >= MIN_CUT && q.cut <= MAX_CUT);
  // runs grown along the edge chains: a lower stretch (>= RUN_MIN) between or beside wall edges carries the wall on
  // (a gap of one edge left the bank's grid teeth showing between two walls)
  const byV = new Map(); edges.forEach((e, i) => { for (const id of [e[8], e[9]]) { let L = byV.get(id); if (!L) byV.set(id, (L = [])); L.push(i); } });
  // (only the edges that can grow are visited, with plain loops: the 24 passes over every edge with closures were
  // ~4 ms a tile; the same passes in the same order, the same result)
  const growable = [];
  for (let i = 0; i < edges.length; i++) if (!on[i] && info[i] && info[i].priv && info[i].cut >= RUN_MIN && info[i].cut <= MAX_CUT) growable.push(i);
  for (let it = 0; it < 24 && growable.length; it++) {
    let grown = 0;
    for (const i of growable) {
      if (on[i]) continue;
      const e = edges[i], A = byV.get(e[8]), Bv = byV.get(e[9]);
      let hit = false;
      for (let q = 0; q < A.length && !hit; q++) if (A[q] !== i && on[A[q]]) hit = true;
      for (let q = 0; q < Bv.length && !hit; q++) if (Bv[q] !== i && on[Bv[q]]) hit = true;
      if (hit) { on[i] = true; grown++; }
    }
    if (!grown) break;
  }
  // gaps under GAP_MAX between two runs (along the sidewalk's edge chain) carried across, unless a garden gate stands in
  // the gap (an opening: the runs end in piers either side) or the land behind is public (round 4: H6 Perelman 4, an
  // earth wedge between two runs at the gate)
  const degOn = (id) => byV.get(id).filter((j) => on[j]).length;
  const elen = (e) => Math.hypot(e[3] - e[0], e[5] - e[2]);
  for (let i = 0; i < edges.length; i++) {
    if (!on[i]) continue;
    for (const start of [edges[i][8], edges[i][9]]) {
      if (degOn(start) !== 1) continue;
      // walk the chain away from the run, through edges not on, up to GAP_MAX
      let v = start, from = i, len = 0;
      const path = [];
      for (let step = 0; step < 32; step++) {
        const nxt = byV.get(v).filter((j) => j !== from && !path.includes(j));
        if (nxt.length !== 1) break;
        const j = nxt[0], e = edges[j];
        if (on[j]) { if (path.length) for (const k of path) on[k] = true; break; }
        len += elen(e); if (len > GAP_MAX) break;
        const mx = (e[0] + e[3]) / 2, mz = (e[2] + e[5]) / 2;
        if (!info[j] || (publicAt && publicAt(mx + e[6] * (BEHIND + 0.8), mz + e[7] * (BEHIND + 0.8))) || (gateNear && gateNear(mx + e[6] * 0.5, mz + e[7] * 0.5, GATE_R))) break;
        path.push(j); from = j; v = e[8] === v ? e[9] : e[8];
      }
    }
  }
  // and gaps the edge chain does not walk (the sidewalk's outline turns into a ramp / another polygon there): two run ends
  // under GAP_MAX apart, facing the same way, the land behind not public and no gate there, joined by a wall edge of
  // their own (its foot on the two ends: a straight face across the gap)
  {
    const ends = [];
    edges.forEach((e, i) => { if (!on[i]) return; for (const [id, x, y, z] of [[e[8], e[0], e[1], e[2]], [e[9], e[3], e[4], e[5]]]) if (degOn(id) === 1) ends.push({ id, x, y, z, nx: e[6], nz: e[7], i }); });
    const nearBuf = [], used = new Set(), eg = segGrid(), endG = new Map(), EK = (x, z) => `${Math.floor(x / GAP_MAX)},${Math.floor(z / GAP_MAX)}`;
    edges.forEach((e, j) => { if (on[j]) eg.add(e); });
    ends.forEach((A, a) => { const k = EK(A.x, A.z); if (!endG.has(k)) endG.set(k, []); endG.get(k).push(a); });
    for (let a = 0; a < ends.length; a++) {
      const bs = [], ca = Math.floor(ends[a].x / GAP_MAX), cb = Math.floor(ends[a].z / GAP_MAX);
      for (let i = ca - 1; i <= ca + 1; i++) for (let j = cb - 1; j <= cb + 1; j++) for (const b of endG.get(`${i},${j}`) || []) if (b > a) bs.push(b);
      bs.sort((x, y) => x - y);
      for (const b of bs) {
        const A = ends[a], B = ends[b];
        if (used.has(A.id) || used.has(B.id) || A.id === B.id || A.i === B.i) continue;
        const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz);
        if (L < 0.05 || L > GAP_MAX || A.nx * B.nx + A.nz * B.nz < 0.7) continue;
        let nx = A.nx + B.nx, nz = A.nz + B.nz; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        if (Math.abs((dx * nx + dz * nz) / L) > 0.5) continue;                 // not side by side along the wall
        const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
        if ((publicAt && publicAt(mx + nx * (BEHIND + 0.8), mz + nz * (BEHIND + 0.8))) || (gateNear && gateNear(mx + nx * 0.5, mz + nz * 0.5, GATE_R))) continue;
        if (covered && covered(mx + nx * 0.6, mz + nz * 0.6)) continue;        // a driveway / path into the garden: open
        // (not across a wall that is already there: at a concave corner the two ends' straight face cut across the run)
        const nearE = eg.near(mx, mz, L / 2 + 0.6, nearBuf);   // (the edges the samples can reach: cost)
        if ([0.25, 0.5, 0.75].some((f) => nearE.some((e) => e[8] !== A.id && e[9] !== A.id && e[8] !== B.id && e[9] !== B.id && segD(A.x + dx * f, A.z + dz * f, e) < 0.6))) continue;
        // (nor along one: two ends of the same wall line, the outline doubling back over itself under other vertex ids (I9
        // Myrtilles 62): the face laid over the run's own face, its ends' piers dropped, the earth past the end a lump)
        if ([0.25, 0.5, 0.75].some((f) => nearE.some((e) => segD(A.x + dx * f, A.z + dz * f, e) < 0.25))) continue;
        edges.push([A.x, A.y, A.z, B.x, B.y, B.z, nx, nz, A.id, B.id]); info.push({ cut: MIN_CUT, priv: 2 }); on.push(true); eg.add(edges[edges.length - 1]);
        for (const id of [A.id, B.id]) { used.add(id); byV.get(id).push(edges.length - 1); }
      }
    }
  }
  // one wall line: where a second wall edge of the same facing stands 0.5-4 m behind a wall edge (two sidewalk strips
  // with a strip of land between), only the back one (the farthest from the carriageway, on the private land) keeps its
  // wall; the front edge's step is left to the bank (round 4: G3 / E6 / H6, two wall lines one behind the other)
  {
    const idx = [], B = 4, g = new Map(), NB = 16, K = (i, j) => (i + 50000) * 100000 + (j + 50000);
    const bin = (e) => Math.floor((Math.atan2(e[7], e[6]) + Math.PI) / (2 * Math.PI) * NB) % NB;
    // (the grid keyed by cell AND facing, 16 bins of 22.5 degrees: a same-facing edge (dot >= 0.85, <= 31.8 degrees) is
    // in the edge's own bin or the two either side; the scan had read every edge of the cells, 14 ms a tile: cost;
    // a cell holds its 16 bins: one map read a cell)
    edges.forEach((e, i) => { if (!on[i]) return; const mx = (e[0] + e[3]) / 2, mz = (e[2] + e[5]) / 2, k = K(Math.floor(mx / B), Math.floor(mz / B)); let c = g.get(k); if (!c) g.set(k, (c = Array.from({ length: NB }, () => null))); const b = bin(e); (c[b] ??= []).push(i); idx.push(i); });
    const drop = [], cand = [];
    // (sampled along the edge every 0.5 m, a ray 0.5-4 m into the garden: a long edge with a short one behind part of it
    // was missed by its midpoint)
    for (const i of idx) {
      const e = edges[i], L = Math.hypot(e[3] - e[0], e[5] - e[2]), ns = Math.max(1, Math.ceil(L / 0.5));
      let behind = false;
      // (the candidates, filtered once: same facing, not adjacent, in a cell within reach of a sample; cost)
      const ia = Math.floor(Math.min(e[0], e[3], e[0] + e[6] * STACK_R, e[3] + e[6] * STACK_R) / B) - 1, ib = Math.floor(Math.max(e[0], e[3], e[0] + e[6] * STACK_R, e[3] + e[6] * STACK_R) / B) + 1;
      const ja = Math.floor(Math.min(e[2], e[5], e[2] + e[7] * STACK_R, e[5] + e[7] * STACK_R) / B) - 1, jb = Math.floor(Math.max(e[2], e[5], e[2] + e[7] * STACK_R, e[5] + e[7] * STACK_R) / B) + 1;
      cand.length = 0;
      const eb = bin(e), ux = (e[3] - e[0]) / (L || 1), uz = (e[5] - e[2]) / (L || 1);
      for (let ga = ia; ga <= ib; ga++) for (let gc = ja; gc <= jb; gc++) { const cell = g.get(K(ga, gc)); if (!cell) continue; for (let ab = eb - 2; ab <= eb + 2; ab++) { const L2 = cell[(ab + NB) % NB]; if (L2) for (const j of L2) {
        const f = edges[j]; if (j === i || f[6] * e[6] + f[7] * e[7] < 0.85 || f[8] === e[8] || f[8] === e[9] || f[9] === e[8] || f[9] === e[9]) continue;
        // (none that cannot come within 0.4 m of the samples: wholly in front of t = 0.5 or past STACK_R, or wholly to one
        // side of the edge)
        const o0 = (f[0] - e[0]) * e[6] + (f[2] - e[2]) * e[7], o1 = (f[3] - e[0]) * e[6] + (f[5] - e[2]) * e[7];
        const s0 = (f[0] - e[0]) * ux + (f[2] - e[2]) * uz, s1 = (f[3] - e[0]) * ux + (f[5] - e[2]) * uz;
        if (Math.max(o0, o1) < 0.1 || Math.min(o0, o1) > STACK_R + 0.4 || Math.max(s0, s1) < -0.4 || Math.min(s0, s1) > L + 0.4) continue;
        cand.push(f, ga, gc);
      } } }
      if (!cand.length) continue;
      for (let q = 0; q <= ns && !behind; q++) {
        const sx = e[0] + (e[3] - e[0]) * q / ns, sz = e[2] + (e[5] - e[2]) * q / ns;
        for (let t = 0.5; t <= STACK_R + 1e-6 && !behind; t += 0.5) {
          const px = sx + e[6] * t, pz = sz + e[7] * t;
          const ca = Math.floor(px / B), cc = Math.floor(pz / B);
          for (let c = 0; c < cand.length; c += 3) if (Math.abs(cand[c + 1] - ca) <= 1 && Math.abs(cand[c + 2] - cc) <= 1 && segD(px, pz, cand[c]) < 0.4) { behind = true; break; }
        }
      }
      if (behind) drop.push(i);
    }
    for (const i of drop) on[i] = false;
  }
  // gate openings: no wall across a garden gate standing just behind the sidewalk (up to 3 m back): the run stops
  // either side of it and ends in piers (round 5: H6 Perelman 4, a wall built across the gate of H5's garden)
  // (and the edges already off beside a wall run, within 2 m of one: a gap the data left open (a path, a driveway's
  // edge) with a gate in it gets its steps too: H6 Perelman 1, G3 Roberts Jones 55, census gateNoSteps)
  const gateEdges = [];
  const onG = segGrid(), onBuf = []; edges.forEach((e, j) => { if (on[j]) onG.add(e); });
  if (gateNear) for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!on[i]) {
      if (!info[i]) continue;
      // (its middle or either end within 2 m of a wall edge: a long edge past a run's end pier)
      if (![[e[0], e[2]], [(e[0] + e[3]) / 2, (e[2] + e[5]) / 2], [e[3], e[5]]].some(([px, pz]) => onG.near(px, pz, 2, onBuf).some((f) => segD(px, pz, f) < 2))) continue;
    }
    const L = Math.hypot(e[3] - e[0], e[5] - e[2]), ns = Math.max(1, Math.ceil(L / 0.5));
    // (one query first: no gate within reach of the whole edge, nothing to sample; cost)
    if (!gateNear((e[0] + e[3]) / 2 + e[6] * 1.125, (e[2] + e[5]) / 2 + e[7] * 1.125, L / 2 + 2.6)) continue;
    // (every sample: the gate's place along the edge is the middle of the samples that meet it)
    let gate = false, gq = 0, gn = 0;
    for (let q = 0; q <= ns; q++) {
      const sx = e[0] + (e[3] - e[0]) * q / ns, sz = e[2] + (e[5] - e[2]) * q / ns;
      // (from 0.5 m in front of the edge: a gate seated on the sidewalk's back edge, K10 Paysages 2)
      for (const dd of [-0.5, 0, 0.5, 1.25, 2, 2.75]) if (gateNear(sx + e[6] * dd, sz + e[7] * dd, 0.9)) { gate = true; gq += q / ns; gn++; break; }
    }
    if (gn) gq /= gn;
    if (gate) { on[i] = false; gateEdges.push([i, gq]); }
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
    // the garden level: the ground behind the wall over the lawn strip (1.2, 1.6, 2.0 m behind, the middle one of the
    // three), not its highest point: round 2 took the highest over a +-35 degree fan and the garden was raised to the
    // wall's top behind it (lumps); terrain grass a little over the lawn strip is the garden's own grass
    const gs = [BEHIND, 1.6, 2.0].map((d) => ground(v.x + v.nx * d, v.z + v.nz * d)).sort((a, b) => a - b);
    let cut = gs[1] - v.y;
    cut = Math.min(MAX_CUT, Math.max(MIN_CUT, cut));
    // (the strip as deep as the hold behind the face + 0.4 m: the hold keeps the terrain under it low (all of it: a
    // grid vertex behind the face left at the garden level made a terrain tooth in front of the face), the garden and
    // its hedge / gate start right behind it)
    v.top = v.y + cut; v.w = HOLD + 1.5;    // (1.5: a grid vertex always falls between the hold and the strip's back: no slit under the back edge)
    // (never over another street surface: at a corner of the sidewalk the averaged normal could swing the strip's back
    // over the sidewalk itself, and the terrain was raised to it there)
    if (covered) for (let d = 0.25; d <= v.w + 1e-6; d += 0.25) if (covered(v.x + v.nx * d, v.z + v.nz * d)) { v.w = Math.max(0.05, d - 0.25); v.cut = true; break; }
  }
  // 3. runs (wall edges chained by their vertices): one wall material each, by a stable hash of the run (as the garden
  // walls pick theirs): brick in one of four tones (aKind 4, aUv2.x = the tone), or coursed stone (aKind 5); a blue-stone
  // plinth course and coping (viewer/roadPaint.js concreteMaterial)
  let runs = 0;
  const adj = new Map(); wall.forEach((e, i) => { for (const id of [e[8], e[9]]) { let L = adj.get(id); if (!L) adj.set(id, (L = [])); L.push(i); } });
  const runE = new Int32Array(wall.length).fill(-1);
  for (let i = 0; i < wall.length; i++) {
    if (runE[i] >= 0) continue;
    const st = [i]; runE[i] = runs;
    while (st.length) { const k = st.pop(); for (const id of [wall[k][8], wall[k][9]]) for (const j of adj.get(id)) if (runE[j] < 0) { runE[j] = runs; st.push(j); } }
    runs++;
  }
  const look = [];
  for (let r = 0; r < runs; r++) {
    const e = wall[runE.indexOf(r)], h = fr(Math.sin(e[0] * 12.9898 + e[2] * 78.233) * 43758.5453), h2 = fr(Math.sin(e[0] * 39.346 + e[2] * 11.135) * 24634.6345);
    look.push(h < STONE_SHARE ? { kind: 5, tone: 0 } : { kind: 4, tone: Math.min(3, Math.floor(h2 * 4)) });
  }
  // 4. geometry: { pos, nrm, uv, idx, kind, tone } for the stone (concrete part) and the lawn (grass part)
  const stone = { pos: [], nrm: [], uv: [], idx: [], kind: [], tone: [], step: [] }, lawn = { pos: [], nrm: [], uv: [], idx: [] };
  // hold: not drawn, for viewer/heightmap.js clampUnder only: the terrain behind the face held at the sidewalk's height
  // over HOLD m, so no terrain triangle rises in front of the face (the strip covers it from above)
  const hold = { pos: [], nrm: [], uv: [], idx: [] }, tops = { pos: [], nrm: [], uv: [], idx: [] };
  let cur = { kind: 1, tone: 0 };
  const quad = (G, P, n, uvs, kind = cur.kind) => {
    const i = G.pos.length / 3;
    P.forEach((p, k) => { G.pos.push(p[0], p[1], p[2]); G.nrm.push(n[0], n[1], n[2]); G.uv.push(uvs[k][0], uvs[k][1]); if (G.kind) { G.kind.push(kind); G.tone.push(cur.tone); G.step.push(cur.step || 0); } });
    // wound to face n
    const [a, b, c] = P, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const d = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
    if (d >= 0) G.idx.push(i, i + 1, i + 2, i, i + 2, i + 3); else G.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
  };
  // the top of each edge: flat, the mean of its two ends' garden levels rounded to a STEP (at least MIN_CUT over its
  // foot): along a rising bank the
  // top climbs in vertical steps (round 2: the top ramped from 0 to 2 m along a thin wedge, a "blade")
  const edgeTop = wall.map((e) => Math.max(Math.max(V.get(e[8]).y, V.get(e[9]).y) + MIN_CUT, Math.round(((V.get(e[8]).top + V.get(e[9]).top) / 2) / STEP) * STEP));
  const topAt = new Map();                 // vertex id -> its wall edges
  wall.forEach((e, i) => { for (const id of [e[8], e[9]]) { let L = topAt.get(id); if (!L) topAt.set(id, (L = [])); L.push(i); } });
  let len = 0;
  wall.forEach((e, i) => {
    cur = look[runE[i]];
    const A = V.get(e[8]), B = V.get(e[9]), L = Math.hypot(B.x - A.x, B.z - A.z), T = edgeTop[i];
    const fn = [-e[6], 0, -e[7]];                              // the face looks at the sidewalk
    quad(stone, [[A.x, A.y - FOOT, A.z], [B.x, B.y - FOOT, B.z], [B.x, T, B.z], [A.x, T, A.z]], fn,
      [[len, 0], [len + L, 0], [len + L, T - B.y + FOOT], [len, T - A.y + FOOT]]);
    const cpA = Math.min(COPING, A.w), cpB = Math.min(COPING, B.w);
    const cA = [A.x + A.nx * cpA, A.z + A.nz * cpA], cB = [B.x + B.nx * cpB, B.z + B.nz * cpB];
    quad(stone, [[A.x, T, A.z], [B.x, T, B.z], [cB[0], T, cB[1]], [cA[0], T, cA[1]]], [0, 1, 0],
      [[len, 0], [len + L, 0], [len + L, COPING], [len, COPING]], 1);
    quad(tops, [[A.x, T, A.z], [B.x, T, B.z], [B.x + B.nx * B.w, T, B.z + B.nz * B.w], [A.x + A.nx * A.w, T, A.z + A.nz * A.w]], [0, 1, 0], [[0, 0], [0, 0], [0, 0], [0, 0]]);
    const wA = [A.x + A.nx * A.w, A.z + A.nz * A.w], wB = [B.x + B.nx * B.w, B.z + B.nz * B.w];
    // (as deep as the strip where another street stops it short: past it the hold would leave a pit)
    const hA = Math.min(HOLD, A.w), hB = Math.min(HOLD, B.w);
    quad(hold, [[A.x, A.y, A.z], [B.x, B.y, B.z], [B.x + B.nx * hB, B.y, B.z + B.nz * hB], [A.x + A.nx * hA, A.y, A.z + A.nz * hA]], [0, 1, 0], [[0, 0], [0, 0], [0, 0], [0, 0]]);
    quad(lawn, [[cA[0], T, cA[1]], [cB[0], T, cB[1]], [wB[0], T, wB[1]], [wA[0], T, wA[1]]], [0, 1, 0],
      [[cA[0], cA[1]], [cB[0], cB[1]], [wB[0], wB[1]], [wA[0], wA[1]]]);
    // a step where the next edge's top is lower: a vertical face across the whole wall (face to strip back)
    for (const [id, end] of [[e[8], A], [e[9], B]]) for (const j of topAt.get(id)) {
      if (j === i || edgeTop[j] >= T - 1e-4) continue;
      const lo = edgeTop[j], o = id === e[8] ? B : A, tx = end.x - o.x, tz = end.z - o.z, tl = Math.hypot(tx, tz) || 1;
      const bx = end.x + end.nx * end.w, bz = end.z + end.nz * end.w;
      quad(stone, [[end.x, lo, end.z], [end.x, T, end.z], [bx, T, bz], [bx, lo, bz]], [tx / tl, 0, tz / tl], [[0, 0], [0, T - lo], [end.w, T - lo], [end.w, 0]]);
    }
    len += L;
  });
  // GATE STEPS (round 5): where a gate opening's garden stands over STEPS_MIN above the sidewalk, a flight of blue-stone
  // steps inside the opening (risers ~RISER, treads TREAD) from the sidewalk's edge up to the garden level, between the
  // piers' returns; the returns of the piers either side only as deep as the flight (+ 0.1 m). A real Uccle front: the
  // gate at the top of a few steps, not a 3 m passage with the garden 1.5 m up (H6 Perelman 4)
  const flights = [], flightAt = new Map();
  for (const [i, gq] of gateEdges) {
    // (an opening of several short outline edges: a flight each, inset for a pier only at an end where a wall run stops;
    // on a long edge only the gate's width (+-0.9 m round where it stands), its levels read there: a 5 m edge with the
    // gate at one end read the garden at its middle, level with the sidewalk (G5 Thévenet 8, I8 Blücher 50))
    const e = edges[i], L = Math.hypot(e[3] - e[0], e[5] - e[2]);
    let pa = V.has(e[8]) ? PIER / 2 : 0, pb = V.has(e[9]) ? PIER / 2 : 0;
    if (L > 2.4) { const sc = gq * L; pa = Math.max(pa, sc - 0.9); pb = Math.max(pb, L - sc - 0.9); }
    if (L - pa - pb < 0.3) continue;
    const sm = (pa + L - pb) / 2 / L, mx = e[0] + (e[3] - e[0]) * sm, mz = e[2] + (e[5] - e[2]) * sm, y0 = e[1] + (e[4] - e[1]) * sm;
    // (the garden level: the highest of three reads across the opening (each the middle of 1.2 / 1.6 / 2.0 m behind):
    // the ground can climb a lot along a 2 m opening)
    const ux0 = (e[3] - e[0]) / L, uz0 = (e[5] - e[2]) / L, half = (L - pa - pb) / 2;
    const gs = Math.max(...[-0.6, 0, 0.6].map((f) => { const ox = mx + ux0 * f * half, oz = mz + uz0 * f * half; return [BEHIND, 1.6, 2.0].map((d) => ground(ox + e[6] * d, oz + e[7] * d)).sort((a, b) => a - b)[1]; }));
    const h = Math.min(MAX_CUT, gs - y0); if (!(h > STEPS_MIN)) continue;
    const n = Math.ceil(h / RISER), D = n * TREAD;
    flights.push({ e, L, y0, h, n, D, pa, pb });
    for (const [id, ins] of [[e[8], pa], [e[9], pb]]) if (ins <= PIER / 2) flightAt.set(id, Math.max(flightAt.get(id) || 0, D));
  }
  // run ends: a short pier (PIER x the strip's depth, PIER_UP over the wall, stone cap) closing the wall, never a knife edge
  let piers = 0;
  const wg = segGrid(), wBuf = []; wall.forEach((f, j) => { f.j = j; wg.add(f); });
  wall.forEach((e, i) => {
    cur = look[runE[i]];
    for (const [id, other] of [[e[8], e[9]], [e[9], e[8]]]) {
      if (topAt.get(id).length !== 1) continue;
      const v = V.get(id), o = V.get(other), tl = Math.hypot(v.x - o.x, v.z - o.z) || 1, tx = (v.x - o.x) / tl, tz = (v.z - o.z) / tl;
      const nx = -e[6], nz = -e[7];                            // toward the sidewalk
      // (not where another wall line passes the end: at a corner the next run's face stood a pier 0.6 m behind a wall)
      // (and along its whole depth: at a corner the pier's 3 m side ran 0.5 m behind the next run's face, a second wall
      // line (round 4, E6 Chateau d'Eau): the pier stops short of the other line, or is left out when it starts at it)
      // (an edge of the same facing on the run's own line (under 0.2 m off it) is the same wall, not another line: an
      // outline doubling back over itself (I9 Myrtilles 62) lost both its end piers, and the earth past the end was bared
      // (a lump))
      const own = (f) => f[6] * e[6] + f[7] * e[7] >= 0.85 && Math.abs(((f[0] + f[3]) / 2 - v.x) * e[6] + ((f[2] + f[5]) / 2 - v.z) * e[7]) < 0.2;
      let d1 = Math.max(v.w, PIER);
      if (flightAt.has(id)) d1 = Math.max(PIER, flightAt.get(id) + 0.1);   // (beside a gate's steps: the flight's cheek, as deep as it, deeper than the strip for a tall one)
      const others = wg.near(v.x, v.z, d1 + 0.9, wBuf).filter((f) => f.j !== i && f[8] !== id && f[9] !== id && !own(f) && segD(v.x, v.z, f) < d1 + 0.9);
      const near = (dd) => { const px = v.x + e[6] * dd, pz = v.z + e[7] * dd; return others.some((f) => segD(px, pz, f) < 0.8); };
      if (near(0.3)) continue;
      for (let dd = 0.8; dd <= d1 + 1e-6; dd += 0.5) if (near(dd)) { d1 = Math.max(PIER, dd - 0.5); break; }
      const T = edgeTop[i] + PIER_UP, bot = v.y - FOOT, d0 = -0.06, s0 = -PIER / 2, s1 = PIER / 2;
      const at = (s, d, y) => [v.x + tx * s - nx * d, y, v.z + tz * s - nz * d];
      quad(stone, [at(s0, d0, bot), at(s1, d0, bot), at(s1, d0, T), at(s0, d0, T)], [nx, 0, nz], [[0, 0], [PIER, 0], [PIER, T - bot], [0, T - bot]]);
      quad(stone, [at(s1, d0, bot), at(s1, d1, bot), at(s1, d1, T), at(s1, d0, T)], [tx, 0, tz], [[0, 0], [d1 - d0, 0], [d1 - d0, T - bot], [0, T - bot]]);
      quad(stone, [at(s0, d1, bot), at(s1, d1, bot), at(s1, d1, T), at(s0, d1, T)], [-nx, 0, -nz], [[0, 0], [PIER, 0], [PIER, T - bot], [0, T - bot]]);
      quad(stone, [at(s0, d0, bot), at(s0, d1, bot), at(s0, d1, T), at(s0, d0, T)], [-tx, 0, -tz], [[0, 0], [d1 - d0, 0], [d1 - d0, T - bot], [0, T - bot]]);
      quad(stone, [at(s0, d0, T), at(s1, d0, T), at(s1, d1, T), at(s0, d1, T)], [0, 1, 0], [[0, 0], [PIER, 0], [PIER, d1 - d0], [0, d1 - d0]], 1);
      piers++;
    }
  });
  cur = { kind: 1, tone: 0, step: 1 };   // (aUv2.y = 1: a step, for the census's gateNoSteps)
  for (const F of flights) {
    const { e, L, y0, h, n, pa, pb } = F, r = h / n, ux = (e[3] - e[0]) / L, uz = (e[5] - e[2]) / L, gx = e[6], gz = e[7];
    const s0 = pa, s1 = L - pb, bot = y0 - FOOT;
    const at = (sv, d, y) => [e[0] + ux * sv + gx * d, y, e[2] + uz * sv + gz * d];
    for (let k = 0; k < n; k++) {
      const d0 = k * TREAD, d1 = (k + 1) * TREAD, yl = y0 + k * r, yt = y0 + (k + 1) * r;
      // riser (facing the sidewalk), tread, the two sides (down to the foot: no slit over the bank)
      quad(stone, [at(s0, d0, k ? yl : bot), at(s1, d0, k ? yl : bot), at(s1, d0, yt), at(s0, d0, yt)], [-gx, 0, -gz], [[0, 0], [s1 - s0, 0], [s1 - s0, r], [0, r]], 1);
      quad(stone, [at(s0, d0, yt), at(s1, d0, yt), at(s1, d1, yt), at(s0, d1, yt)], [0, 1, 0], [[0, 0], [s1 - s0, 0], [s1 - s0, TREAD], [0, TREAD]], 1);
      quad(stone, [at(s0, d0, bot), at(s0, d1, bot), at(s0, d1, yt), at(s0, d0, yt)], [-ux, 0, -uz], [[0, 0], [TREAD, 0], [TREAD, yt - bot], [0, yt - bot]], 1);
      quad(stone, [at(s1, d0, bot), at(s1, d1, bot), at(s1, d1, yt), at(s1, d0, yt)], [ux, 0, uz], [[0, 0], [TREAD, 0], [TREAD, yt - bot], [0, yt - bot]], 1);
    }
    // (the terrain under the flight: roadBuild.js lowers every grid vertex within 1 m of it to the line of the treads'
    // inner corners (flightCap), the strips' holds either side included: a 1 m grid triangle from a vertex held at the
    // garden level beside a 1.1 m opening crossed over the lower treads (census 'over' at Perelman 4: 0.86 m))
    // (1 m either side under the lawn strips (to 3 m deep), past them only under the piers' cheeks: a lowered vertex out
    // in the garden showed as a bare cut beside a tall flight, census bareBank)
    F.cap = { ox: e[0], oz: e[2], ux, uz, gx, gz, s0, s1, D: F.D, y0: y0 - 0.03, k: (h - r) / F.D };
  }
  // the flights' terrain caps: (x, z) -> the highest the terrain may stand, or Infinity
  const caps = flights.map((F) => F.cap);
  const flightCap = caps.length ? (x, z) => {
    let c = Infinity;
    for (const q of caps) {
      const dx = x - q.ox, dz = z - q.oz, sv = dx * q.ux + dz * q.uz, d = dx * q.gx + dz * q.gz;
      const side = d <= 3 ? 1.0 : PIER;
      if (sv >= q.s0 - side && sv <= q.s1 + side && d >= -0.5 && d <= q.D + 0.5) c = Math.min(c, q.y0 + q.k * Math.max(0, Math.min(q.D, d)));
    }
    return c;
  } : null;
  const capBox = caps.map((q) => { const xs = [], zs = []; for (const sv of [q.s0 - 1, q.s1 + 1]) for (const d of [-0.5, q.D + 0.5]) { xs.push(q.ox + q.ux * sv + q.gx * d); zs.push(q.oz + q.uz * sv + q.gz * d); } return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]; });
  return { stone, lawn, gateSteps: flights.length, flightCap, capBox, tops: { position: Float32Array.from(tops.pos), index: Uint32Array.from(tops.idx), wall: true }, hold: { position: Float32Array.from(hold.pos), index: Uint32Array.from(hold.idx) }, edges: wall.length, runs, piers, metres: +len.toFixed(1) };
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
    if (typeof v === "function") for (let i = 0; i < n; i++) { const w = v(i); for (let c = 0; c < a.itemSize; c++) add[i * a.itemSize + c] = Array.isArray(w) ? w[c] : w; }
    else if (v !== undefined) for (let i = 0; i < n; i++) for (let c = 0; c < a.itemSize; c++) add[i * a.itemSize + c] = Array.isArray(v) ? v[c] : v;
    a.array = cat(a.array, add);
  }
  if (part.extra) part.extra = cat(part.extra, new Float32Array(n));
  const I = new Uint32Array(G.idx.length); for (let i = 0; i < I.length; i++) I[i] = G.idx[i] + n0;
  part.index = cat(part.index, I);
  if (part.vertexCount !== undefined) part.vertexCount += n;
  return part;
}

/** data/gardens/<tile>.json -> (x, z, r) => a garden piece within r (5 m buckets of points every <= 1 m) */
export function gardenIndex(doc, { gatesOnly = false } = {}) {
  if (!doc) return () => false;
  // (5 m buckets, numeric keys: a query of r = 10 m reads 5 x 5 buckets; round 3: 2 m string keys cost 40 ms a tile)
  const B = 5, grid = new Map(), K = (i, j) => (i + 50000) * 100000 + (j + 50000), add = (x, z) => { const k = K(Math.floor(x / B), Math.floor(z / B)); let L = grid.get(k); if (!L) grid.set(k, (L = [])); L.push(x, z); };
  if (!gatesOnly) for (const g of doc.segs || []) { const L = Math.hypot(g[3] - g[0], g[5] - g[2]), n = Math.max(1, Math.ceil(L)); for (let k = 0; k <= n; k++) add(g[0] + (g[3] - g[0]) * k / n, g[2] + (g[5] - g[2]) * k / n); }
  if (!gatesOnly) for (const p of doc.pillars || []) add(p[0], p[2]);
  for (const p of doc.gates || []) add(p[0], p[2]);
  if (!gatesOnly) for (const h of doc.hedges || []) for (const [x, z] of h.points || []) add(x, z);
  return (x, z, r) => {
    for (let i = Math.floor((x - r) / B); i <= Math.floor((x + r) / B); i++) for (let j = Math.floor((z - r) / B); j <= Math.floor((z + r) / B); j++) {
      const L = grid.get(K(i, j)); if (!L) continue;
      for (let k = 0; k < L.length; k += 2) if ((L[k] - x) ** 2 + (L[k + 1] - z) ** 2 <= r * r) return true;
    }
    return false;
  };
}
