// Sharp bends in the road engine's swept ribbons (claude/curvedroads, docs/roads/BENDS.md). Plain JS, runs in the tile
// worker and in node.
//
// WHY. The vendored engine (vendor/roads, read-only) builds every road strip as a sweep: row i of a strip edge at
// lateral offset t is C(s_i) + N(s_i) t, N the left normal of the fitted alignment. Where the alignment's curve radius
// R is smaller than |t| on the inner side (1 + k t < 0), the edge runs BACKWARDS: the strip folds over itself in a
// swallowtail (flipped triangles, the incoming and outgoing strips overlapping, the inner edge lying over the road).
// The engine fits an arc at every OSM vertex but first shrinks the radii until each leg holds both tangents plus a
// straight "lead" at junction mouths (roadAlignment.js fitVertices: avail = max(0.01, leg - lead)). An OSM vertex a
// few metres from a junction therefore gets R ~ 0.01-0.3 m: a sharp corner with no inner join at all. The engine
// only reports it ("tight-bend"); viewer/surfaces.js then dropped the minority-oriented triangles (the lane paint
// layer broke at the bend, a hole where UrbIS maps nothing, and folds that were the majority of a short piece stayed).
//
// FIX (inner-side clamp, the trimmed offset curve). For every road and every lateral value t a strip edge uses, the
// raw offset polyline Q_t over the road's samples is cut at its self-intersection X around each fold run (samples
// with 1 + k t < 0): the vertices whose station lies between the two crossing points move to X (one height per X).
// The polyline runs on straight past both road ends (the junction pad's direction), so a loop cut off by a road end
// (the vertex 0.1-1 m inside a mouth) still finds its corner; its end row then moves onto the corner too.
// That is the exact inner join of the true offset curve (every point of it at distance |t| from the centre line):
// no fold, no overlap, nothing narrower than the street, no spike (X never lies farther than |t| from the line).
// The outer side of such a corner is already a round join (the engine's fan of rows round the corner point).
// Every other vertex keeps its position bit for bit; triangles that collapse to nothing (or a mm sliver still facing
// backwards) are dropped.
// ?roadbend=old: off (viewer/features.js).
import { evalAlignment } from "../../vendor/roads/roadAlignment.js";
import { hashPhase } from "../roadData.js";

const MEMBER_TOL = 0.05;     // m: a vertex is a strip vertex of road rr when it sits within this of C(u) + N(u) v
const SEARCH = 400;          // samples searched each way from a fold run for the crossing
const END_EXT = 3;           // the straight extension past each road end: this many times the offset (>= 2 m)

/** Each vertex's road (index into net.roads) when it is one of that road's swept strip vertices (uv = station,
 *  lateral), else -1. Phases collide (100,000 buckets), so membership is checked on the position too. */
export function roadMembers(net, part) {
  const n = part.position.length / 3, P = part.position, U = part.uv, A = part.attributes?.aPiece?.array;
  const road = new Int32Array(n).fill(-1);
  if (!A || !U) return road;
  const byKey = new Map();
  net.roads.forEach((rr, ri) => {
    if (!rr.smp || !rr.al || rr.smp.s.length < 2) return;
    const k = Math.round(hashPhase(rr.id) * 100);
    (byKey.get(k) || byKey.set(k, []).get(k)).push(ri);
  });
  for (let v = 0; v < n; v++) {
    const c = byKey.get(Math.round(A[v * 2] * 100));
    if (!c) continue;
    const s = U[v * 2], t = U[v * 2 + 1];
    for (const ri of c) {
      const rr = net.roads[ri], S = rr.smp;
      if (s < S.s[0] - 0.01 || s > S.s[S.s.length - 1] + 0.01) continue;
      const e = evalAlignment(rr.al, s);
      const dx = e.x + Math.sin(e.th) * t - P[v * 3], dz = e.z - Math.cos(e.th) * t - P[v * 3 + 2];
      if (dx * dx + dz * dz < MEMBER_TOL * MEMBER_TOL) { road[v] = ri; break; }
    }
  }
  return road;
}

/** Does any sample of road S fold at lateral t (1 + k t < 0)? */
const foldsAt = (S, t) => { for (let i = 0; i < S.k.length; i++) if (1 + S.k[i] * t < 0) return true; return false; };

/** segment p0p1 x q0q1 -> [u, w] parameters on each, or null */
function cross(p0x, p0z, p1x, p1z, q0x, q0z, q1x, q1z) {
  const rx = p1x - p0x, rz = p1z - p0z, sx = q1x - q0x, sz = q1z - q0z;
  const d = rx * sz - rz * sx;
  if (Math.abs(d) < 1e-12) return null;
  const qx = q0x - p0x, qz = q0z - p0z;
  const u = (qx * sz - qz * sx) / d, w = (qx * rz - qz * rx) / d;
  return u >= 0 && u <= 1 && w >= 0 && w <= 1 ? [u, w] : null;
}

/**
 * The trimmed intervals of the inner edge at lateral t of a road: [{ sA, sB, x, z }] (vertices at stations strictly
 * between sA and sB move to (x, z)), plus the fold runs left unresolved.
 * The polyline searched is the road's raw offset at t, EXTENDED straight past both ends along the end headings (the
 * junction pad carries the road on in its arm's direction): a loop that runs past an end (an OSM vertex just inside a
 * junction mouth, the engine's radius cut to ~0 there) crosses the extension, and its end row moves onto the corner too.
 */
export function trimIntervals(S, t) {
  const N0 = S.s.length, N = N0 + 2, ext = Math.max(2, END_EXT * Math.abs(t));
  const ss = new Float64Array(N), qx = new Float64Array(N), qz = new Float64Array(N), kk = new Float64Array(N);
  for (let i = 0; i < N0; i++) {
    ss[i + 1] = S.s[i]; kk[i + 1] = S.k[i];
    qx[i + 1] = S.x[i] + Math.sin(S.th[i]) * t; qz[i + 1] = S.z[i] - Math.cos(S.th[i]) * t;
  }
  ss[0] = S.s[0] - ext; qx[0] = qx[1] - Math.cos(S.th[0]) * ext; qz[0] = qz[1] - Math.sin(S.th[0]) * ext;
  ss[N - 1] = S.s[N0 - 1] + ext; qx[N - 1] = qx[N - 2] + Math.cos(S.th[N0 - 1]) * ext; qz[N - 1] = qz[N - 2] + Math.sin(S.th[N0 - 1]) * ext;
  const runs = [];
  for (let i = 1; i < N - 1; i++) {
    if (!(1 + kk[i] * t < 0)) continue;
    let j = i;
    while (j + 1 < N - 1 && 1 + kk[j + 1] * t < 0) j++;
    runs.push([i, j]);
    i = j;
  }
  const out = [];
  let unresolved = 0;
  // the first crossing of the branch before a fold run with the branch after it (the smallest station span)
  const solve = (i0, i1) => {
    let best = null;
    for (let a = Math.min(i0, N - 2); a >= Math.max(0, i0 - SEARCH); a--) {
      if (best && ss[i0] - ss[a + 1] > best.span) break;
      for (let b = Math.max(a + 2, i1 - 1); b <= Math.min(N - 2, i1 + SEARCH); b++) {
        if (best && ss[b] - ss[a + 1] > best.span) break;
        const c = cross(qx[a], qz[a], qx[a + 1], qz[a + 1], qx[b], qz[b], qx[b + 1], qz[b + 1]);
        if (!c) continue;
        const sA = ss[a] + c[0] * (ss[a + 1] - ss[a]), sB = ss[b] + c[1] * (ss[b + 1] - ss[b]);
        if (!best || sB - sA < best.span) best = { sA, sB, span: sB - sA, x: qx[a] + c[0] * (qx[a + 1] - qx[a]), z: qz[a] + c[0] * (qz[a + 1] - qz[a]), i0, i1 };
        break;              // larger b only widens the span for this a
      }
    }
    return best;
  };
  for (let r = 0; r < runs.length; r++) {
    let [i0, i1] = runs[r];
    let best = solve(i0, i1);
    // a loop that swallows the next fold run: solve both as one
    while (best && r + 1 < runs.length && ss[runs[r + 1][0]] < best.sB) { i1 = runs[++r][1]; best = solve(i0, i1); }
    if (!best) { unresolved++; continue; }
    // overlapping the previous interval (a run swallowed backwards): merge into one solve
    const prev = out[out.length - 1];
    if (prev && best.sA < prev.sB) {
      const m = solve(prev.i0, i1);
      if (m) { out[out.length - 1] = m; continue; }
    }
    out.push(best);
  }
  return { intervals: out, unresolved };
}

/**
 * The engine asphalt part with every swallowtail trimmed (see the header). Returns a new part (same layout, the
 * attributes shared, position / index new) and stats. Vertices outside the trimmed intervals keep their values bit
 * for bit; triangles left with no area are dropped.
 */
export function trimBendFolds(net, part) {
  const t0 = (globalThis.performance ?? Date).now();
  const road = roadMembers(net, part);
  const P = part.position, U = part.uv, n = P.length / 3;
  // the roads that fold anywhere at any lateral value they use
  const tOf = new Map();                       // road -> Map(t -> [vertices])
  for (let v = 0; v < n; v++) {
    const ri = road[v];
    if (ri < 0) continue;
    let m = tOf.get(ri);
    if (!m) tOf.set(ri, (m = new Map()));
    const t = U[v * 2 + 1];
    (m.get(t) || m.set(t, []).get(t)).push(v);
  }
  const pos = new Float32Array(P);
  const moved = new Uint8Array(n);
  const stats = { roads: 0, intervals: 0, moved: 0, unresolved: 0, dropped: 0, wallsMoved: 0, ms: 0 };
  // exact old (x, z) of a moved vertex -> new (x, z): its road's skirt wall follows (a wall vertex: same piece, same
  // station; never a junction pad's corner at the same spot)
  const oldKey = new Map();
  const A = part.attributes.aPiece.array;
  for (const [ri, m] of tOf) {
    const S = net.roads[ri].smp;
    let touched = false;
    for (const [t, vs] of m) {
      if (!foldsAt(S, t)) continue;
      const { intervals, unresolved } = trimIntervals(S, t);
      stats.unresolved += unresolved;
      for (const iv of intervals) {
        const group = vs.filter((v) => U[v * 2] > iv.sA && U[v * 2] < iv.sB);
        if (!group.length) continue;
        let y = 0;
        for (const v of group) y += P[v * 3 + 1];
        y /= group.length;
        for (const v of group) {
          oldKey.set(`${P[v * 3]},${P[v * 3 + 2]}`, [iv.x, iv.z, Math.round(A[v * 2] * 100), U[v * 2]]);
          pos[v * 3] = iv.x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = iv.z;
          moved[v] = 1;
        }
        stats.intervals++; stats.moved += group.length; touched = true;
      }
    }
    if (touched) stats.roads++;
  }
  if (!stats.moved) { stats.ms = Math.round((globalThis.performance ?? Date).now() - t0); return { part, stats }; }
  for (let v = 0; v < n; v++) {
    if (road[v] >= 0) continue;
    const to = oldKey.get(`${P[v * 3]},${P[v * 3 + 2]}`);
    if (!to || Math.round(A[v * 2] * 100) !== to[2] || Math.abs(U[v * 2] - to[3]) > 1e-3) continue;
    pos[v * 3] = to[0]; pos[v * 3 + 2] = to[1]; moved[v] = 1; stats.wallsMoved++;
  }
  const I = part.index, keep = [];
  for (let k = 0; k < I.length; k += 3) {
    const a = I[k], b = I[k + 1], c = I[k + 2];
    if (moved[a] || moved[b] || moved[c]) {
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const wx = pos[c * 3] - pos[a * 3], wy = pos[c * 3 + 1] - pos[a * 3 + 1], wz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
      // (the engine's own degenerate rule, laneRoadMesh Part.tri: |cross|^2 < 1e-12; strips also by plan area)
      if (cx * cx + cy * cy + cz * cz < 1e-12) { stats.dropped++; continue; }
      if (road[a] >= 0 && road[a] === road[b] && road[a] === road[c]) {
        // a strip triangle with no plan area, or still facing backwards in its (station, lateral) frame (a mm sliver
        // where the crossing lies on the chord into the fold): (s, t) -> (x, z) has determinant -(1 + k t), so a
        // right-way-round one has plan and uv areas of opposite sign
        const au = (U[b * 2] - U[a * 2]) * (U[c * 2 + 1] - U[a * 2 + 1]) - (U[b * 2 + 1] - U[a * 2 + 1]) * (U[c * 2] - U[a * 2]);
        if (Math.abs(cy) < 1e-6 || cy * au < 0) { stats.dropped++; continue; }
      }
    }
    keep.push(a, b, c);
  }
  const index = I instanceof Uint16Array ? Uint16Array.from(keep) : Uint32Array.from(keep);
  stats.ms = Math.round((globalThis.performance ?? Date).now() - t0);
  return { part: { ...part, position: pos, index, triangleCount: keep.length / 3 }, stats };
}
