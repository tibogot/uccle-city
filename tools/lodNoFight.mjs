// LOD1 WITHOUT COLLAPSED FACES (census class G, rule 34 provisional; claude/zfight). The landmark packers simplify LOD0
// per primitive (one slot each) with meshoptimizer: within its error (5-12 cm) a slot's face 2-5 cm proud of another
// (a stone plinth on brick, a frame's face, a brick panel in its stone surround) or a slot's hole round another is
// collapsed INTO the other slot's plane: two slots in one plane = z-fighting at LOD1 distance (Saint-Pierre LOD1:
// 1,042 new coplanar pairs, the observatory 2,684 / 1,529 m2, measured by tools/audit/census/zfight.mjs --heroes).
// Fix: simplify, find the LOD1 coplanar pairs that LOD0 does not have there; (1) a triangle wholly covered by another
// slot's that LOD0 shows in front there is dropped (no triangle added); (2) for the rest, LOCK every LOD0 vertex of both
// primitives round the pair (meshopt vertex_lock: they survive, so neither the proud face nor the hole's rim can
// collapse) and simplify those primitives again; repeat until no new pair (or the round limit). Same target per primitive.
//   simplifyWeldedLocked(P, Nn, I, want, err, flags, vlock) -> [indices, error]   (vlock: Uint8Array per vertex or null)
//   noFightLod1(prims, simplify, { log }) -> { rounds, before, after, locked }
//     prims: [{ P (positions, one frame for all), Nn, I (LOD0 indices), lod (LOD1 indices: replaced) }]
//     dropOnly: step 1 only (the LOD1 triangles stay the packer's: the town hall's corners carry a Blender AO bake)
//     simplify(k, vlock) -> new LOD1 indices of prim k with those vertices locked
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";
import { coplanarPairs, Bvh } from "./audit/census/lib_mesh.mjs";
await MeshoptSimplifier.ready;

/** the packers' simplifyWelded (position-welded at 1 mm, each new corner given back the original vertex whose normal
 *  best matches the new triangle) with a per-vertex lock: a welded vertex is locked when any of its members is */
export function simplifyWeldedLocked(P, Nn, I, want, err, flags, vlock = null) {
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const C = new Float32Array(cpos);
  let out, e;
  if (vlock) {
    const cl = new Uint8Array(C.length / 3);
    for (let i = 0; i < n; i++) if (vlock[i]) cl[canon[i]] = 1;
    [out, e] = MeshoptSimplifier.simplifyWithAttributes(ci, C, 3, new Float32Array(0), 0, [], cl, want, err, flags);
  } else [out, e] = MeshoptSimplifier.simplify(ci, C, 3, want, err, flags);
  const res = new Uint32Array(out.length);
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = -1, bd = -Infinity;
      for (const v of members[out[t + k]]) {
        const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz;
        if (d > bd) { bd = d; best = v; }
      }
      res[t + k] = best;
    }
  }
  return [res, e];
}

const triArea = (q, t) => { const o = t * 9, ux = q[o + 3] - q[o], uy = q[o + 4] - q[o + 1], uz = q[o + 5] - q[o + 2], vx = q[o + 6] - q[o], vy = q[o + 7] - q[o + 1], vz = q[o + 8] - q[o + 2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; };
/** the coplanar pairs of a level: { pairs, owner (triangle -> prim), tri (triangle -> index in its prim) } */
function levelPairs(prims, key) {
  let n = 0; for (const p of prims) n += p[key].length;
  const pos = new Float32Array(n * 3), owner = new Int32Array(n / 3), tri = new Int32Array(n / 3);
  let o = 0, t = 0;
  prims.forEach((p, k) => {
    const I = p[key];
    for (let i = 0; i < I.length; i++) { pos[o++] = p.P[I[i] * 3]; pos[o++] = p.P[I[i] * 3 + 1]; pos[o++] = p.P[I[i] * 3 + 2]; }
    for (let i = 0; i < I.length / 3; i++) { owner[t] = k; tri[t++] = i; }
  });
  return { pairs: coplanarPairs(pos, { eps: 0.002, minArea: 0.01 }), owner, tri, pos };
}

export function noFightLod1(prims, simplify, { log = () => {}, rounds: maxRounds = 10, dropOnly = false } = {}) {
  const L0 = levelPairs(prims, "I");
  const near0 = (p) => L0.pairs.some((q) => Math.abs(q.x - p.x) < 0.5 && Math.abs(q.y - p.y) < 0.5 && Math.abs(q.z - p.z) < 0.5);
  const locks = prims.map((p) => new Uint8Array(p.P.length / 3));
  let before = null, after = null, rounds = 0, dropped = 0, lockRound = 0;
  // which slot LOD0 shows at a pair's spot: a ray from 0.5 m out along the pair's normal onto LOD0
  const bvh0 = new Bvh(L0.pos);
  const frontAt = (p, L1) => {
    const q = L1.pos, o = p.a * 9;
    const ux = q[o + 3] - q[o], uy = q[o + 4] - q[o + 1], uz = q[o + 5] - q[o + 2], vx = q[o + 6] - q[o], vy = q[o + 7] - q[o + 1], vz = q[o + 8] - q[o + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const h = bvh0.hit(p.x + nx * 0.5, p.y + ny * 0.5, p.z + nz * 0.5, -nx, -ny, -nz, 0.6);
    return h && !h.back ? L0.owner[h.tri] : -1;
  };
  for (; rounds <= maxRounds; rounds++) {
    const L1 = levelPairs(prims, "lod");
    // (between two slots only: a slot folded onto itself is left to the packer; re-simplifying it from the decoded,
    // quantized GLB opened Saint-Pierre's west door frame: heroshell 5 m2)
    const fresh = L1.pairs.filter((p) => !near0(p) && L1.owner[p.a] !== L1.owner[p.b]);
    const m2 = fresh.reduce((s, p) => s + p.area, 0);
    if (!before) before = { pairs: fresh.length, m2 };
    after = { pairs: fresh.length, m2 };
    log(`  round ${rounds}: ${fresh.length} coplanar pairs LOD0 does not have (${m2.toFixed(1)} m2)`);
    if (!fresh.length || rounds === maxRounds) break;
    // 1. a LOD1 triangle (nearly) wholly covered by another slot's coplanar triangles, where LOD0 shows that other slot
    //    (a proud plinth collapsed onto its wall: the wall's triangle under it goes): dropped, no triangle added
    const cover = new Map(), behind = new Map();
    for (const p of fresh) {
      const ka = L1.owner[p.a], kb = L1.owner[p.b];
      if (ka === kb) continue;
      const front = frontAt(p, L1);
      if (front === kb) { cover.set(p.a, Math.max(cover.get(p.a) || 0, p.area)); behind.set(p.a, true); }
      else if (front === ka) { cover.set(p.b, Math.max(cover.get(p.b) || 0, p.area)); behind.set(p.b, true); }   // (ONE covering triangle: summed overlaps of several counted their own overlap twice and dropped half-covered triangles: holes)
    }
    const drop = new Map();
    for (const [t, a] of cover) if (behind.get(t) && a >= 0.97 * triArea(L1.pos, t)) { const k = L1.owner[t]; if (!drop.has(k)) drop.set(k, new Set()); drop.get(k).add(L1.tri[t]); }
    if (drop.size) {
      for (const [k, set] of drop) { const I = prims[k].lod, out = []; for (let t = 0; t < I.length / 3; t++) if (!set.has(t)) out.push(I[t * 3], I[t * 3 + 1], I[t * 3 + 2]); prims[k].lod = Uint32Array.from(out); dropped += set.size; }
      continue;
    }
    if (dropOnly) break;
    // 2. else LOCK the LOD0 vertices of both slots round the spot and simplify those slots again
    const dirty = new Set();
    for (const p of fresh) {
      // the overlap box: the two triangles' boxes intersected, + 3 cm
      const bb = (t) => { const q = L1.pos, o = t * 9; return [Math.min(q[o], q[o + 3], q[o + 6]), Math.min(q[o + 1], q[o + 4], q[o + 7]), Math.min(q[o + 2], q[o + 5], q[o + 8]), Math.max(q[o], q[o + 3], q[o + 6]), Math.max(q[o + 1], q[o + 4], q[o + 7]), Math.max(q[o + 2], q[o + 5], q[o + 8])]; };
      const A = bb(p.a), B = bb(p.b), M = lockRound < 2 ? 0.03 : 0.03 + 0.25 * (lockRound - 1);
      // (rounds 0-1: the two triangles' boxes intersected; from round 2 their union, growing 25 cm a round: a far vertex
      // collapsed onto a locked rim re-spans the spot otherwise)
      const box = lockRound < 2 ? [Math.max(A[0], B[0]) - M, Math.max(A[1], B[1]) - M, Math.max(A[2], B[2]) - M, Math.min(A[3], B[3]) + M, Math.min(A[4], B[4]) + M, Math.min(A[5], B[5]) + M]
        : [Math.min(A[0], B[0]) - M, Math.min(A[1], B[1]) - M, Math.min(A[2], B[2]) - M, Math.max(A[3], B[3]) + M, Math.max(A[4], B[4]) + M, Math.max(A[5], B[5]) + M];
      // (lock rounds 0-1: only the vertices OFF the pair's plane, > 5 mm: the proud face that collapsed into it; the wall
      // behind stays free to simplify. Later rounds: every vertex in the box, a hole's rim on the plane too)
      const q = L1.pos, o = p.a * 9;
      const ux = q[o + 3] - q[o], uy = q[o + 4] - q[o + 1], uz = q[o + 5] - q[o + 2], vx = q[o + 6] - q[o], vy = q[o + 7] - q[o + 1], vz = q[o + 8] - q[o + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const pd = nx * q[o] + ny * q[o + 1] + nz * q[o + 2], offOnly = lockRound < 2;
      [nx, ny, nz].forEach((c, i) => { box[i] -= 0.15 * Math.abs(c); box[i + 3] += 0.15 * Math.abs(c); });   // (15 cm off the plane: the collapsed face's own vertices)
      for (const k of new Set([L1.owner[p.a], L1.owner[p.b]])) {
        const P = prims[k].P, I = prims[k].I, lk = locks[k];
        let added = 0;
        for (let i = 0; i < I.length; i++) {
          const v = I[i];
          if (lk[v]) continue;
          const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
          if (offOnly && Math.abs(nx * x + ny * y + nz * z - pd) < 0.005) continue;
          if (x >= box[0] && x <= box[3] && y >= box[1] && y <= box[4] && z >= box[2] && z <= box[5]) { lk[v] = 1; added++; }
        }
        if (added) dirty.add(k);
      }
    }
    if (!dirty.size) break;
    // the borders between slots: a slot simplified again must keep every vertex its neighbours' current LOD1 uses at the
    // same spot (1 mm), or the shared edge no longer meets (slits: Saint-Pierre LOD1 5 m2 of probe holes without this)
    const key = (P, v) => `${Math.round(P[v * 3] * 1000)},${Math.round(P[v * 3 + 1] * 1000)},${Math.round(P[v * 3 + 2] * 1000)}`;
    for (const k of dirty) {
      const used = new Set();
      prims.forEach((q, j) => { if (j !== k) for (const v of q.lod) used.add(key(q.P, v)); });
      const P = prims[k].P, I = prims[k].I, lk = locks[k].slice();
      for (const v of I) if (!lk[v] && used.has(key(P, v))) lk[v] = 1;
      prims[k].lod = simplify(k, lk);
    }
    lockRound++;
  }
  return { rounds, before, after, dropped, locked: locks.reduce((s, l) => s + l.reduce((a, b) => a + b, 0), 0) };
}
