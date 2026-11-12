// Road Checker round 2: the defects the owner and the Road Lab showed (docs/roads/ROUND2.md), each counted, on the
// meshes the road stage really draws (rd.parts) and on its paint inventory. Plain JS, Node. Used by road_audit.mjs
// (checks C14-C22); every finding has a world position (x, z) so the lab can show it and a junction can count it.
//
//   C14 crossings      duplicate / overlapping crossings (two drawn where one is), a drawn crossing the 2024
//                      orthophoto contradicts (no bars on open asphalt), a crossing clipped by a kerb (drawn outline
//                      much smaller than its measured outline)
//   C15 paint          lane paint inside a drawn crossing, a stop line on a crossing, decal paint over decal paint
//   C16 stop lines     a stop line spanning < 80 % of its approach (road centre to kerb), off square > 10°, or
//                      shorter than 2 m (a stray dash)
//   C17 slivers        triangles longer than 40 x their height and > 25 cm (asphalt, concrete, square, grass, paint)
//   C18 cracks         T-junctions (a vertex inside another triangle's open edge, the two not welded) and open edges
//                      with a height step beside them and no face closing it: the black slivers / spikes
//   C19 kerbs          kerb notches (a kerb turning > 45° between two short pieces) and kerb gaps (a raised surface
//                      meeting the carriageway with no kerb line along it: the raised square with no kerb)
//   C20 uv             paving uv sheared across a seam (one position, two uv frames that differ, no cross-fade)
//   C21 shading        normal jumps (one position, normals > 2° apart) and asphalt pieces whose shade differs where
//                      they meet or overlap (per-piece tone): the facets / the darker wedge
//   C22 lane graph     max heading change per metre, distance to the lane centre, kerb clearance, lanes crossing
//                      where they do not merge
const r2 = (v) => Math.round(v * 100) / 100;
const deg = (r) => (r * 180) / Math.PI;
const area2 = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1]; return a / 2; };
function clipConvex(subject, clip) {
  let out = subject.map((p) => [p[0], p[1]]);
  const s = area2(clip) > 0 ? 1 : -1;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const side = (p) => s * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const inp = out; out = [];
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out;
}
function hull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const pip = (x, z, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const CARRIAGE = new Set([0, 1, 2, 3]);
const MARKABLE = new Set([0, 1, 3]);

/** findings are clustered: one per check + kind per 2 m cell (a crack 10 m long is 5 findings, not 400) */
function clusterAdd(add) {
  const seen = new Map();
  return (check, level, x, z, msg, extra = {}) => {
    const k = `${check}|${extra.kind ?? ""}|${Math.floor(x / 2)}|${Math.floor(z / 2)}`;
    const c = seen.get(k);
    if (c) { c.n++; return; }
    const f = add(check, level, x, z, msg, { ...extra, n: 1 });
    if (f) seen.set(k, f);
  };
}

// ------------------------------------------------------------------------------------------------ meshes
/** per part: triangles in tile, welded vertex ids (1 mm), open edges */
function meshOf(part, inTile) {
  const P = part.position, I = part.index, N = part.normal, U = part.uv;
  const tris = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, cz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    if (inTile(cx, cz)) tris.push(t);
  }
  return { P, I, N, U, tris, A: part.attributes || {} };
}
const V3 = (P, i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];

/** C17 slivers, C18 cracks / steps, C20 uv shear, C21 normal jumps over one part */
function meshDefects(name, part, inTile, add, opts = {}) {
  const M = meshOf(part, inTile), { P, I, N, U } = M;
  const st = { tris: M.tris.length, sliver: 0, tjunction: 0, step: 0, uvShear: 0, normalJump: 0 };
  // weld at 1 mm (3D) to find shared positions
  const W = new Map(), wid = new Map();
  const wkey = (i) => `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
  for (const t of M.tris) for (let c = 0; c < 3; c++) {
    const v = I[t + c]; if (wid.has(v)) continue;
    const k = wkey(v); let id = W.get(k); if (id === undefined) { id = W.size; W.set(k, id); } wid.set(v, id);
  }
  // slivers (3D)
  for (const t of M.tris) {
    const A = V3(P, I[t]), B = V3(P, I[t + 1]), C = V3(P, I[t + 2]);
    const e = [Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]), Math.hypot(A[0] - C[0], A[1] - C[1], A[2] - C[2])];
    const L = Math.max(...e);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    const ar = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    if (ar < 1e-10) continue;
    const aspect = L / ((2 * ar) / L);
    // only flat (top) faces count for the road surfaces: a kerb face is a long thin quad by nature (13 cm x metres)
    const ny = Math.abs((uz * vx - ux * vz) / (2 * ar));
    if (aspect > 40 && L > 0.25 && ny > 0.7) { st.sliver++; add("C17", "warn", (A[0] + B[0] + C[0]) / 3, (A[2] + B[2] + C[2]) / 3, `${name}: sliver triangle ${Math.round(aspect)}:1, ${L.toFixed(2)} m`, { kind: name }); }
  }
  // open edges (welded ids), vertex normals / uvs per welded id
  const E = new Map();
  for (const t of M.tris) for (let c = 0; c < 3; c++) {
    const a = wid.get(I[t + c]), b = wid.get(I[t + (c + 1) % 3]);
    if (a === b) continue;
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    const e = E.get(k); if (e) e.n++; else E.set(k, { n: 1, va: I[t + c], vb: I[t + (c + 1) % 3], t });
  }
  // T-junctions: a welded vertex strictly inside an open edge (xz within 2 mm), not one of its ends
  const grid = new Map(), G = 1.0;
  const gk = (x, z) => `${Math.floor(x / G)},${Math.floor(z / G)}`;
  const repV = new Map();
  for (const [v, id] of wid) if (!repV.has(id)) repV.set(id, v);
  for (const [id, v] of repV) { const k = gk(P[v * 3], P[v * 3 + 2]); const l = grid.get(k); if (l) l.push(id); else grid.set(k, [id]); }
  const openEdges = [];
  for (const [k, e] of E) if (e.n === 1) openEdges.push(e);
  for (const e of openEdges) {
    const A = V3(P, e.va), B = V3(P, e.vb), L = Math.hypot(B[0] - A[0], B[2] - A[2]);
    if (L < 0.01) continue;
    const ia = wid.get(e.va), ib = wid.get(e.vb);
    const x0 = Math.floor(Math.min(A[0], B[0]) / G), x1 = Math.floor(Math.max(A[0], B[0]) / G), z0 = Math.floor(Math.min(A[2], B[2]) / G), z1 = Math.floor(Math.max(A[2], B[2]) / G);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) for (const id of grid.get(`${i},${j}`) || []) {
      if (id === ia || id === ib) continue;
      const v = repV.get(id), x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      const t = ((x - A[0]) * (B[0] - A[0]) + (z - A[2]) * (B[2] - A[2])) / (L * L);
      if (t < 0.02 || t > 0.98) continue;
      const d = Math.hypot(A[0] + (B[0] - A[0]) * t - x, A[2] + (B[2] - A[2]) * t - z);
      if (d > 0.002) continue;
      const ye = A[1] + (B[1] - A[1]) * t;
      if (Math.abs(y - ye) > 0.05) continue;                  // a kerb top over a road edge: a different surface
      st.tjunction++;
      add("C18", Math.abs(y - ye) > 0.002 ? "error" : "warn", x, z, `${name}: T-junction crack (vertex on an open edge, ${(Math.abs(y - ye) * 1000).toFixed(1)} mm off)`, { kind: `${name}-tj` });
    }
  }
  // uv shear + normal jumps: one welded position, several vertices with different uv / normals
  const byId = new Map();
  for (const [v, id] of wid) { const l = byId.get(id); if (l) l.push(v); else byId.set(id, [v]); }
  const fw = M.A.aFrameW?.array, kindA = M.A.aKind?.array;
  for (const [id, vs] of byId) {
    if (vs.length < 2) continue;
    const v0 = vs[0], x = P[v0 * 3], z = P[v0 * 3 + 2];
    let nj = 0, uj = 0;
    for (let k = 1; k < vs.length; k++) {
      const v = vs[k];
      const dn = N[v0 * 3] * N[v * 3] + N[v0 * 3 + 1] * N[v * 3 + 1] + N[v0 * 3 + 2] * N[v * 3 + 2];
      // only between faces meant to be one smooth surface: both normals near up (a kerb's vertical face is a crease)
      if (N[v0 * 3 + 1] > 0.9 && N[v * 3 + 1] > 0.9) nj = Math.max(nj, deg(Math.acos(Math.min(1, dn))));
      if (opts.uv && kindA && kindA[v0] === 3 && kindA[v] === 3 && U) {
        const du = Math.hypot(U[v0 * 2] - U[v * 2], U[v0 * 2 + 1] - U[v * 2 + 1]);
        const blended = fw && Math.min(fw[v0], fw[v]) > 0.99;      // both fully on the straight frame: same pattern
        if (!blended) uj = Math.max(uj, du);
      }
    }
    if (nj > 2) { st.normalJump++; add("C21", "error", x, z, `${name}: normal jump ${nj.toFixed(1)}° at a shared position (shading seam)`, { kind: `${name}-normal` }); }
    if (uj > 0.02) { st.uvShear++; add("C20", "error", x, z, `${name}: paving uv jumps ${uj.toFixed(2)} m at a seam (pattern sheared)`, { kind: `${name}-uv` }); }
  }
  // steps: an open TOP edge with a different top surface right beside it and no wall face along it
  if (opts.steps) {
    const tops = [], walls = [];
    for (const t of M.tris) {
      const A = V3(P, I[t]), B = V3(P, I[t + 1]), C = V3(P, I[t + 2]);
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
      if (l < 1e-9) continue;
      (Math.abs(ny / l) > 0.8 ? tops : Math.abs(ny / l) < 0.4 ? walls : []).push(t);
    }
    const tg = new Map(), wg = new Map(), GG = 2;
    const put = (g, t) => { const xs = [P[I[t] * 3], P[I[t + 1] * 3], P[I[t + 2] * 3]], zs = [P[I[t] * 3 + 2], P[I[t + 1] * 3 + 2], P[I[t + 2] * 3 + 2]];
      for (let i = Math.floor(Math.min(...xs) / GG); i <= Math.floor(Math.max(...xs) / GG); i++) for (let j = Math.floor(Math.min(...zs) / GG); j <= Math.floor(Math.max(...zs) / GG); j++) { const k = `${i},${j}`; const l = g.get(k); if (l) l.push(t); else g.set(k, [t]); } };
    for (const t of tops) put(tg, t);
    for (const t of walls) put(wg, t);
    const yIn = (t, x, z) => {
      const A = V3(P, I[t]), B = V3(P, I[t + 1]), C = V3(P, I[t + 2]);
      const d = (B[2] - C[2]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[2] - C[2]);
      if (Math.abs(d) < 1e-12) return null;
      const w0 = ((B[2] - C[2]) * (x - C[0]) + (C[0] - B[0]) * (z - C[2])) / d, w1 = ((C[2] - A[2]) * (x - C[0]) + (A[0] - C[0]) * (z - C[2])) / d, w2 = 1 - w0 - w1;
      return w0 >= -1e-4 && w1 >= -1e-4 && w2 >= -1e-4 ? w0 * A[1] + w1 * B[1] + w2 * C[1] : null;
    };
    const isTop = new Set(tops);
    for (const e of openEdges) {
      if (!isTop.has(e.t)) continue;
      const A = V3(P, e.va), B = V3(P, e.vb), L = Math.hypot(B[0] - A[0], B[2] - A[2]);
      if (L < 0.05) continue;
      // outward normal: away from the triangle's third vertex
      const t = e.t, C3 = [0, 1, 2].map((c) => I[t + c]).find((v) => v !== e.va && v !== e.vb);
      const C = V3(P, C3 ?? I[t]);
      let nx = -(B[2] - A[2]) / L, nz = (B[0] - A[0]) / L;
      const mx = (A[0] + B[0]) / 2, mz = (A[2] + B[2]) / 2, my = (A[1] + B[1]) / 2;
      if ((C[0] - mx) * nx + (C[2] - mz) * nz > 0) { nx = -nx; nz = -nz; }
      const qx = mx + nx * 0.03, qz = mz + nz * 0.03;
      const k = `${Math.floor(qx / GG)},${Math.floor(qz / GG)}`;
      let yo = null;
      for (const u of tg.get(k) || []) { if (u === t) continue; const y = yIn(u, qx, qz); if (y != null && (yo == null || Math.abs(y - my) < Math.abs(yo - my))) yo = y; }
      // (the asphalt's engine layer lies LIFT + BASE_DROP = 1.6 cm over the measured base by design: a lip, not a crack)
      if (yo == null || Math.abs(yo - my) < (name === "asphalt" ? 0.025 : 0.006)) continue;
      // a wall face along the edge closes the step (a kerb, a flank, a skirt)
      let closed = false;
      for (const u of wg.get(`${Math.floor(mx / GG)},${Math.floor(mz / GG)}`) || []) {
        const W0 = V3(P, I[u]), W1 = V3(P, I[u + 1]), W2 = V3(P, I[u + 2]);
        const d = Math.min(segD(mx, mz, W0[0], W0[2], W1[0], W1[2]), segD(mx, mz, W1[0], W1[2], W2[0], W2[2]), segD(mx, mz, W2[0], W2[2], W0[0], W0[2]));
        if (d < 0.03) { closed = true; break; }
      }
      if (closed) continue;
      st.step++;
      add("C18", "error", mx, mz, `${name}: open step ${(Math.abs(yo - my) * 100).toFixed(1)} cm with no face (a crack you see into)`, { kind: `${name}-step` });
    }
  }
  return st;
}

// ------------------------------------------------------------------------------------------------ the checks
export function roundTwoChecks({ rd, inv, prep, surf, markings, inTile, add: add0, photo = null }) {
  const add = clusterAdd(add0);
  const S = { crossings: { drawn: 0, overlapPairs: 0, photoDenied: 0, clipped: 0 }, paint: { laneInCrossing: 0, stopOnCrossing: 0, decalOverlap: 0 },
    stops: { short: 0, offSquare: 0, stray: 0 }, mesh: {}, kerbs: { notch: 0, gap: 0 }, piece: { toneSeams: 0 }, lanes: null };
  const cls = (x, z) => (prep ? prep.classAt(x, z) : -1);
  // ---- C14 crossings
  const xs = inv.crossings.filter((c) => c.poly && inTile(c.c[0], c.c[1]));
  S.crossings.drawn = xs.length;
  const H = xs.map((c) => hull(c.poly));
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    if (Math.hypot(xs[i].c[0] - xs[j].c[0], xs[i].c[1] - xs[j].c[1]) > 30) continue;
    const o = clipConvex(H[i], H[j]);
    const a = o.length >= 3 ? Math.abs(area2(o)) : 0;
    const near = Math.hypot(xs[i].c[0] - xs[j].c[0], xs[i].c[1] - xs[j].c[1]) < 3;
    if (a > 0.5 || near) { S.crossings.overlapPairs++; add("C14", "error", xs[i].c[0], xs[i].c[1], `crossings ${xs[i].id} and ${xs[j].id} overlap (${a.toFixed(1)} m²): one crossing drawn twice`, { kind: "overlap" }); }
  }
  const byId = new Map((markings?.crossings || []).map((m) => [m.id, m]));
  for (const c of xs) {
    const m = byId.get(c.id);
    if (m && m.photo === undefined && photo) m.photo = photo(m);     // older markings.json: score it here
    if (m?.photo && m.photo.s < 0.4 && m.photo.veg < 0.15) { S.crossings.photoDenied++; add("C14", "error", c.c[0], c.c[1], `crossing ${c.id} drawn where the 2024 orthophoto shows no bars (score ${m.photo.s})`, { kind: "photo" }); }
    if (c.vSpan && c.across != null && m?.across && c.across < 0.6 * m.across && c.across < m.across - 2.5) { S.crossings.clipped++; add("C14", "warn", c.c[0], c.c[1], `crossing ${c.id} drawn ${c.across.toFixed(1)} m of its measured ${m.across.toFixed(1)} m (clipped by a kerb)`, { kind: "clip" }); }
  }
  // ---- C15 paint across crossings: the asphalt as drawn (its line codes aEdges.zw at the vertices inside a crossing,
  // with the vertex on the line: |t - line t| < 0.25 m)
  const AS = rd.parts.asphalt;
  if (AS?.attributes?.aEdges) {
    const P = AS.position, UV = AS.uv, Ed = AS.attributes.aEdges.array, I = AS.index;
    const used = new Set();
    for (let k = 0; k < I.length; k++) used.add(I[k]);
    const hitBy = new Map();
    for (const v of used) {
      const x = P[v * 3], z = P[v * 3 + 2];
      if (!inTile(x, z)) continue;
      const tt = UV[v * 2 + 1];
      const on = (Ed[v * 4 + 2] >= 1 && Math.abs(tt - Ed[v * 4]) < 0.25) || (Ed[v * 4 + 3] >= 1 && Math.abs(tt - Ed[v * 4 + 1]) < 0.25);
      if (!on) continue;
      for (let i = 0; i < xs.length; i++) {
        if (Math.abs(xs[i].c[0] - x) > 20 || Math.abs(xs[i].c[1] - z) > 20) continue;
        // 0.5 m inside the outline (its edge vertices carry the line up to the zebra)
        const c = xs[i].c, sx = c[0] + (x - c[0]) * 1.0, sz = c[1] + (z - c[1]) * 1.0;
        if (!pip(sx, sz, H[i])) continue;
        let edgeD = Infinity; const R = H[i];
        for (let a = 0, b = R.length - 1; a < R.length; b = a++) edgeD = Math.min(edgeD, segD(x, z, R[b][0], R[b][1], R[a][0], R[a][1]));
        if (edgeD < 0.5) continue;
        if (!hitBy.has(i)) { hitBy.set(i, [x, z]); }
      }
    }
    for (const [i, [x, z]] of hitBy) { S.paint.laneInCrossing++; add("C15", "error", x, z, `a lane line runs through crossing ${xs[i].id}`, { kind: "laneX" }); }
  }
  for (const s of inv.stops) {
    if (s.ring) continue;
    const [p, q] = s.line, mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
    if (!inTile(mx, mz)) continue;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    for (let i = 0; i < xs.length; i++) {
      let hit = false;
      for (let f = 0.1; f <= 0.9; f += 0.2) if (pip(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, H[i])) hit = true;
      if (hit) { S.paint.stopOnCrossing++; add("C15", "error", mx, mz, `${s.kind} line ${s.id} lies on crossing ${xs[i].id}`, { kind: "stopX" }); break; }
    }
    // ---- C16 stop line spans its approach
    if (L < 2.0) { S.stops.stray++; add("C16", s.src === "topo" ? "warn" : "error", mx, mz, `${s.kind} line ${s.id} only ${L.toFixed(1)} m long (a stray dash)`, { kind: "stray" }); continue; }
    if (prep) {
      const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
      // the approach: from the line's ends, how far to the kerb each way along the line
      const ray = (x, z, dx, dz) => { for (let d = 0.05; d < 15; d += 0.05) if (!CARRIAGE.has(cls(x + dx * d, z + dz * d))) return d; return null; };
      const kq = ray(q[0], q[1], ux, uz), kp = ray(p[0], p[1], -ux, -uz);
      // the far side of a two-way road is the other direction's lanes: only the gap to the kerb on ONE side must be small
      const gap = Math.min(kq ?? 99, kp ?? 99);
      if (gap > 0.6) { S.stops.short++; add("C16", "error", mx, mz, `${s.kind} line ${s.id} stops ${gap.toFixed(1)} m short of the kerb (it must span its approach)`, { kind: "short" }); }
    }
    const arm = s.arm;
    if (arm) {
      const th = Math.atan2(q[1] - p[1], q[0] - p[0]);
      let d = Math.abs(th - (arm.th + Math.PI / 2)) % Math.PI; d = Math.min(d, Math.PI - d);
      if (deg(d) > 10) { S.stops.offSquare++; add("C16", s.src === "topo" ? "warn" : "error", mx, mz, `${s.kind} line ${s.id} ${deg(d).toFixed(0)}° off square to its lanes`, { kind: "square" }); }
    }
  }
  // decal over decal (paint items drawn twice: two crossings, a stop line on a zebra)
  const PP = rd.parts.paint;
  if (PP) {
    const g = new Map(), P = PP.position, I = PP.index;
    const tri = (t) => [[P[I[t] * 3], P[I[t] * 3 + 2]], [P[I[t + 1] * 3], P[I[t + 1] * 3 + 2]], [P[I[t + 2] * 3], P[I[t + 2] * 3 + 2]]];
    const it = PP.attributes.aPaint.array;
    for (let t = 0; t < I.length; t += 3) {
      const T = tri(t), cx = (T[0][0] + T[1][0] + T[2][0]) / 3, cz = (T[0][1] + T[1][1] + T[2][1]) / 3;
      if (!inTile(cx, cz)) continue;
      const k = `${Math.floor(cx / 3)},${Math.floor(cz / 3)}`; const l = g.get(k); if (l) l.push(t); else g.set(k, [t]);
    }
    // the decal item a triangle belongs to: its frame (u, v at vertex 0 minus position) is constant per item
    const itemKey = (t) => { const v = I[t]; return `${it[v * 4 + 2]}|${(P[v * 3] - 0).toFixed(0)}`; };
    for (const [k, l] of g) {
      for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
        const A = tri(l[a]), B = tri(l[b]);
        const o = clipConvex(A, B);
        if (o.length < 3 || Math.abs(area2(o)) < 0.05) continue;     // (a glyph's own bars touch: < 5 cm²... 0.05 m² = two marks)
        // pieces of ONE item never overlap (they are cut from it); an overlap is two items
        S.paint.decalOverlap++;
        const [x, z] = o[0];
        add("C15", "error", x, z, `decal paint over decal paint (${Math.abs(area2(o)).toFixed(2)} m²): two marks on one spot`, { kind: "decal2" });
      }
    }
  }
  // ---- C17 / C18 / C20 / C21 meshes
  for (const [name, part] of Object.entries(rd.parts)) {
    if (!part?.index?.length) continue;
    S.mesh[name] = meshDefects(name, part, inTile, add, { uv: name === "concrete", steps: name === "concrete" || name === "square" || name === "asphalt" });
  }
  // asphalt pieces whose shade differs (per-piece tone in roadPaint asphaltMaterial: tone + patches depend on aPiece)
  const A = rd.parts.asphalt;
  if (A && rd.pieceTone !== false) {
    const P = A.position, I = A.index, ph = A.attributes?.aPiece?.array;
    if (ph) {
      const cells = new Map();
      for (let t = 0; t < I.length; t += 3) {
        const v = I[t], x = (P[v * 3] + P[I[t + 1] * 3] + P[I[t + 2] * 3]) / 3, z = (P[v * 3 + 2] + P[I[t + 1] * 3 + 2] + P[I[t + 2] * 3 + 2]) / 3;
        if (!inTile(x, z)) continue;
        const k = `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
        const s = cells.get(k) || { x, z, set: new Set() }; s.set.add(Math.round(ph[v * 2] * 100)); cells.set(k, s);
      }
      for (const c of cells.values()) if (c.set.size > 1) { S.piece.toneSeams++; add("C21", "error", c.x, c.z, `asphalt: ${c.set.size} pieces with different tone meet here (a visible seam / wedge)`, { kind: "tone" }); }
    }
  }
  // ---- C19 kerbs: notches and gaps
  if (surf && prep) {
    const kerbs = surf.kerbs || [];
    // a notch / step: two corners (> 50°) at most 3 m apart along the kerb, with only small turns between them, away
    // from the kerb's ends (a kerb ending into a wall is not a notch)
    const angf = (a, b, c) => { const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1]; return Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz); };
    for (const l of kerbs) {
      const cum = [0];
      for (let k = 1; k < l.length; k++) cum.push(cum[k - 1] + Math.hypot(l[k][0] - l[k - 1][0], l[k][1] - l[k - 1][1]));
      const tr = l.map((p, k) => (k === 0 || k === l.length - 1 ? 0 : angf(l[k - 1], p, l[k + 1])));
      const cs = [];
      for (let k = 1; k + 1 < l.length; k++) if (Math.abs(tr[k]) > 0.87 && cum[k] > 1.0 && cum[l.length - 1] - cum[k] > 1.0) cs.push(k);
      for (let c = 0; c + 1 < cs.length; c++) {
        const kb = cs[c], kc = cs[c + 1], gap = cum[kc] - cum[kb];
        if (gap > 3) continue;
        let small = true;
        for (let k = kb + 1; k < kc; k++) if (Math.abs(tr[k]) > 0.21) small = false;
        if (!small) continue;
        const b = l[kb];
        if (!inTile(b[0], b[1])) continue;
        S.kerbs.notch++;
        add("C19", "error", b[0], b[1], `kerb ${Math.sign(tr[kb]) === Math.sign(tr[kc]) ? "notch" : "step"}: corners of ${deg(Math.abs(tr[kb])).toFixed(0)}° and ${deg(Math.abs(tr[kc])).toFixed(0)}° ${gap.toFixed(2)} m apart`, { kind: "notch" });
      }
    }
    // gaps: raster cells of a raised class next to a carriage cell with no kerb line within 0.6 m
    const segs = new Map();
    for (const l of kerbs) for (let k = 1; k < l.length; k++) {
      const [ax, az] = l[k - 1], [bx, bz] = l[k];
      for (let i = Math.floor(Math.min(ax, bx) / 4); i <= Math.floor(Math.max(ax, bx) / 4); i++) for (let j = Math.floor(Math.min(az, bz) / 4); j <= Math.floor(Math.max(az, bz) / 4); j++) { const key = `${i},${j}`; const s = segs.get(key); if (s) s.push([ax, az, bx, bz]); else segs.set(key, [[ax, az, bx, bz]]); }
    }
    const kerbNear = (x, z, r) => { for (let i = Math.floor((x - r) / 4); i <= Math.floor((x + r) / 4); i++) for (let j = Math.floor((z - r) / 4); j <= Math.floor((z + r) / 4); j++) for (const s of segs.get(`${i},${j}`) || []) if (segD(x, z, ...s) < r) return true; return false; };
    const g = prep.grid, RAISED_K = new Set([4, 5, 6]);
    for (let j = 1; j < g.nz - 1; j++) for (let i = 1; i < g.nx - 1; i++) {
      const c = g.data[j * g.nx + i] - 1;
      if (!RAISED_K.has(c)) continue;
      let low = false;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = g.data[(j + dj) * g.nx + i + di] - 1; if (MARKABLE.has(n) || n === 1) low = true; }
      if (!low) continue;
      const x = g.x0 + (i + 0.5) * g.step, z = g.z0 + (j + 0.5) * g.step;
      if (!kerbNear(x, z, 0.75)) { S.kerbs.gap++; add("C19", "error", x, z, `kerb gap: ${["roadway", "tram road", "tram site", "parking", "square", "sidewalk", "median"][c]} meets the carriageway with no kerb`, { kind: "gap" }); }
    }
  }
  return S;
}

// ------------------------------------------------------------------------------------------------ C22 lane graph
/** The engine's lane paths (net.graph.paths, what traffic drives on): heading change per metre (kinks, saw-teeth),
 *  distance from the lane centre (the painted lane), kerb clearance (the measured carriageway), lanes that cross. */
export function laneGraphChecks({ net, prep, inTile, add: add0 }) {
  const add = clusterAdd(add0);
  const st = { paths: 0, points: 0, kinkPaths: 0, maxTurnPerM: 0, offCentre: 0, kerbClose: 0, crossings: 0, p95TurnPerM: 0 };
  const turns = [];
  const cls = (x, z) => (prep ? prep.classAt(x, z) : -1);
  const pathPts = (p) => p.pts.map((q) => [q[0] ?? q.x, q[1] ?? q.z]);
  const roadById = new Map(net.roads.map((r) => [r.id, r]));
  const lanesOf = (p) => {
    const rr = roadById.get(p.roadId); if (!rr?.stack) return null;
    const drive = (side) => (rr.stack.sides[side] || []).filter((l) => l.type === "driving" || l.type === "bus").length;
    const me = drive(p.side), other = drive(p.side === "left" ? "right" : "left");
    if (me !== 1 || other > 1) return null;
    if ((rr.stack.sides[p.side] || []).some((l) => l.type === "parking")) return null;   // parked cars move the lane
    return { oneWay: other === 0 };
  };
  const segs = [];
  for (const p of net.graph.paths) {
    const pts = pathPts(p);
    if (!pts.some(([x, z]) => inTile(x, z))) continue;
    st.paths++;
    // resample every 0.5 m, heading change per metre over 1 m windows
    const R = [pts[0]];
    let acc = 0;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let d = 0.5 - acc;
      while (d <= L) { R.push([a[0] + (b[0] - a[0]) * (d / L), a[1] + (b[1] - a[1]) * (d / L)]); d += 0.5; }
      acc = L - (d - 0.5);
    }
    let worst = 0, at = null;
    for (let k = 2; k < R.length; k++) {
      const [x, z] = R[k - 1];
      if (!inTile(x, z)) continue;
      st.points++;
      const h0 = Math.atan2(R[k - 1][1] - R[k - 2][1], R[k - 1][0] - R[k - 2][0]), h1 = Math.atan2(R[k][1] - R[k - 1][1], R[k][0] - R[k - 1][0]);
      const dt = deg(Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0)))) / 0.5;    // °/m
      turns.push(dt);
      if (dt > worst) { worst = dt; at = [x, z]; }
      // distance to the lane centre, where the stack is simple (one lane per direction, or a one-way lane): the
      // measured carriageway split evenly between the lanes
      const nx0 = -(R[k][1] - R[k - 2][1]), nz0 = R[k][0] - R[k - 2][0], nl0 = Math.hypot(nx0, nz0) || 1;
      if (prep && p.kind === "lane" && CARRIAGE.has(cls(x, z)) && lanesOf(p)) {
        const ray = (sg) => { for (let d = 0.1; d < 15; d += 0.1) if (!CARRIAGE.has(cls(x + (sg * nx0 / nl0) * d, z + (sg * nz0 / nl0) * d))) return d; return null; };
        const dr = ray(1), dl = ray(-1);     // (nx0, nz0) = right of travel (x east, z south)
        if (dl != null && dr != null) {
          const W = dl + dr, n = lanesOf(p);
          // (a two-way street under 5 m is too narrow to split into two lanes: no centre to keep)
          const err = !n.oneWay && W < 5.0 ? 0 : n.oneWay ? Math.abs(dr - W / 2) : Math.abs(dr - W / 4);
          if (err > 1.0) { st.offCentre++; add("C22", "warn", x, z, `lane path ${p.id} ${err.toFixed(1)} m off its lane centre (carriageway ${W.toFixed(1)} m)`, { kind: "centre" }); }
        }
      }
      // kerb clearance: a car (1.8 m wide) on this path needs 0.9 m + 0.3 m to the kerb
      if (prep && cls(x, z) >= 0) {
        const nx = -(R[k][1] - R[k - 2][1]), nz = R[k][0] - R[k - 2][0], nl = Math.hypot(nx, nz) || 1;
        for (const sg of [1, -1]) {
          let free = null;
          for (let d = 0.1; d <= 1.2; d += 0.1) if (!CARRIAGE.has(cls(x + (sg * nx / nl) * d, z + (sg * nz / nl) * d))) { free = d; break; }
          if (free != null && free < 1.0) { st.kerbClose++; add("C22", free < 0.5 ? "error" : "warn", x, z, `lane path ${p.id} ${free.toFixed(1)} m from the kerb`, { kind: "kerb" }); }
        }
      }
    }
    if (p.turn !== "uturn") st.maxTurnPerM = Math.max(st.maxTurnPerM, worst);
    // > 20°/m is a kink (a 3 m radius turn is 19°/m); at junction turns the engine's arcs stay under ~12°/m
    // (a U-turn connector at a dead end turns 180° in a few metres by design)
    if (worst > 20 && at && p.turn !== "uturn") { st.kinkPaths++; add("C22", "error", at[0], at[1], `lane path ${p.id} kinks ${worst.toFixed(0)}°/m`, { kind: "kink" }); }
    for (let k = 1; k < R.length; k++) segs.push({ p, a: R[k - 1], b: R[k], from: p.from, to: p.to });
  }
  // lanes crossing: two paths' segments intersecting where the paths do not share a start or an end node (merges and
  // diverges are allowed: same from or same to)
  const g = new Map();
  for (const s of segs) { const k = `${Math.floor(s.a[0] / 4)},${Math.floor(s.a[1] / 4)}`; const l = g.get(k); if (l) l.push(s); else g.set(k, [s]); }
  const X = (p, q, r, s) => { const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]); if (Math.abs(d) < 1e-12) return null;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d, u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
    return t > 0 && t < 1 && u > 0 && u < 1 ? [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] : null; };
  const seen = new Set();
  for (const [k, l] of g) {
    const [i, j] = k.split(",").map(Number), cand = [];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) cand.push(...(g.get(`${i + di},${j + dj}`) || []));
    for (const s of l) for (const t of cand) {
      if (s.p === t.p) continue;
      const key = s.p.id < t.p.id ? `${s.p.id}|${t.p.id}` : `${t.p.id}|${s.p.id}`;
      if (seen.has(key)) continue;
      // inside a junction, crossing movements are real (a left turn crosses the opposite straight): only lane paths of
      // the SAME road and direction (on a link, not a junction connector) must never cross
      if (s.p.kind !== "lane" || t.p.kind !== "lane") continue;
      if (s.p.roadId !== t.p.roadId || s.p.side !== t.p.side) continue;
      const h = X(s.a, s.b, t.a, t.b);
      if (!h || !inTile(h[0], h[1])) continue;
      seen.add(key); st.crossings++;
      add("C22", "error", h[0], h[1], `lane paths ${s.p.id} and ${t.p.id} cross on their road`, { kind: "cross" });
    }
  }
  turns.sort((a, b) => a - b);
  st.p95TurnPerM = r2(turns[Math.floor(turns.length * 0.95)] || 0);
  st.maxTurnPerM = r2(st.maxTurnPerM);
  return st;
}
