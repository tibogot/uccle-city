// Stable finding ids and their causes for the street detectors (rule gap-register, tools/audit/gaps.mjs): which OSM road
// a drawn point belongs to and at what station, the junctions (a rough junction area until the street model has
// polygons: every node of degree >= 3, radius from its two widest arms), the OSM-vs-UrbIS confidence at a station, and
// the cause a register entry gets from those.
import { lineIndex, SC } from "./lib_street.mjs";
import { layoutEdges } from "../../../vendor/roads/roadCrossSection.js";
import { span } from "../gaps.mjs";

const CARR = new Set([SC.roadway, SC.tramRoad, SC.parking]);
export const X_OFF = 1.5;      // m: OSM this far outside the measured carriageway = confidence X (plan 3)
export const SHORT = 42;       // m: a short piece (viewer/streets/lineFit.js SHORT_ROAD)

export function findCtx(S) {
  const net = S.rd.net, roads = net?.roads || [];
  const lines = roads.map((r) => { const P = []; for (let i = 0; i < (r.smp?.s.length || 0); i++) P.push([r.smp.x[i], r.smp.z[i]]); return P; });
  const idx = lineIndex(lines, 8);
  /** the OSM road a plan point belongs to (the nearest centre line within reach): { r, ri, id, s, d } | null */
  const roadAt = (x, z, reach = 16) => {
    const n = idx.dist(x, z, reach); if (!n) return null;
    const r = roads[n.li], S0 = r.smp, k = n.k, ax = S0.x[k - 1], az = S0.z[k - 1];
    const s = S0.s[k - 1] + (x - ax) * n.ux + (z - az) * n.uz;
    return { r, ri: n.li, id: r.id, s: Math.max(S0.s[0], Math.min(S0.s[S0.s.length - 1], s)), d: n.d };
  };
  // junctions: nodes of degree >= 3 over the (padded) network, radius = hypot of the two widest arms' half widths
  const N = new Map((S.roads.nodes || []).map((n) => [n.id, n]));
  const arms = new Map();
  for (const r of roads) for (const [nd, end] of [[r.src?.a, 0], [r.src?.b, 1]]) {
    if (nd == null || !r.lays?.length) continue;
    const e = layoutEdges(r.lays[end ? r.lays.length - 1 : 0]);
    (arms.get(nd) || arms.set(nd, []).get(nd)).push(Math.max(2, e.curbL - e.curbR));
  }
  const J = [];
  for (const [nd, w] of arms) {
    if (w.length < 3 || !N.has(nd)) continue;
    const s = [...w].sort((a, b) => b - a), n = N.get(nd);
    J.push({ id: nd, x: n.x, z: n.z, r: Math.hypot(s[0] / 2, s[1] / 2) });
  }
  const jg = new Map(), JK = (i, j) => i * 65536 + j;
  J.forEach((j, k) => { for (let a = Math.floor((j.x - j.r) / 16); a <= Math.floor((j.x + j.r) / 16); a++) for (let b = Math.floor((j.z - j.r) / 16); b <= Math.floor((j.z + j.r) / 16); b++) (jg.get(JK(a, b)) || jg.set(JK(a, b), []).get(JK(a, b))).push(k); });
  /** the junction area holding (x, z), grown by `pad` m: the junction | null */
  const junctionAt = (x, z, pad = 0) => {
    let best = null;
    for (const k of jg.get(JK(Math.floor(x / 16), Math.floor(z / 16))) || []) { const j = J[k], d = Math.hypot(j.x - x, j.z - z); if (d < j.r + pad && (!best || d - j.r < best.d)) best = { ...j, d: d - j.r }; }
    if (!best && pad > 0) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const k of jg.get(JK(Math.floor(x / 16) + a, Math.floor(z / 16) + b)) || []) { const j = J[k], d = Math.hypot(j.x - x, j.z - z); if (d < j.r + pad && (!best || d - j.r < best.d)) best = { ...j, d: d - j.r }; }
    return best;
  };
  /** confidence of road r at station s: "M" (its centre line on / within X_OFF of the measured carriageway), "X" (more
   *  than X_OFF outside it), "O" (no measured surface there) */
  const confAt = (r, s) => {
    const S0 = r.smp; let i = 0; while (i < S0.s.length - 1 && S0.s[i] < s) i++;
    const x = S0.x[i], z = S0.z[i], nx = Math.sin(S0.th[i]), nz = -Math.cos(S0.th[i]);
    const c = S.classAt(x, z);
    if (CARR.has(c)) return "M";
    for (let t = 0.1; t <= 6; t += 0.1) if (CARR.has(S.classAt(x + nx * t, z + nz * t)) || CARR.has(S.classAt(x - nx * t, z - nz * t))) return t > X_OFF ? "X" : "M";
    return c >= 0 ? "X" : "O";
  };
  const fitted = (ri) => !!net.lineFit?.fitOf?.has(ri);
  const nearSeam = (x, z, m = 6) => { const b = S.bounds; return x - b.x0 < m || b.x1 - x < m || z - b.z0 < m || b.z1 - z < m; };
  /** the cause of a road-run finding (gaps.mjs CAUSES), from the local evidence, first match wins */
  const causeOf = ({ x, z, r, ri, s0, s1 }) => {
    if (junctionAt(x, z, 3)) return "junction-unmodelled";
    if (r && confAt(r, (s0 + s1) / 2) === "X") return "osm-contradiction";
    if (r && !fitted(ri)) return "fit-lost";
    if (r && r.smp.s[r.smp.s.length - 1] - r.smp.s[0] < SHORT) return "short-piece";
    if (nearSeam(x, z)) return "seam-rebuild";
    return "stack-lag";
  };
  return { roadAt, junctionAt, junctions: J, confAt, fitted, nearSeam, causeOf };
}

/**
 * Samples [{ x, z, why: [inv...], m }] -> findings: per invariant and road, station runs (gaps < GAP m, >= MIN samples),
 * id `<prefix>.<inv>:<roadId>:<s0-s1>`; samples with no road within reach get the element `none@<x>,<z>` (5 m cells).
 */
export function roadRuns(samples, ctx, { prefix, tile, nameAt, at, GAP = 3, MIN = 2 }) {
  const groups = new Map();
  for (const p of samples) {
    const q = ctx.roadAt(p.x, p.z);
    for (const w of p.why) {
      const el = q ? q.id : `none@${Math.round(p.x / 5) * 5},${Math.round(p.z / 5) * 5}`;
      const k = `${w}|${el}`;
      (groups.get(k) || groups.set(k, []).get(k)).push({ ...p, s: q ? q.s : 0, q });
    }
  }
  const out = [];
  for (const [k, L] of groups) {
    const [w, el] = k.split("|");
    L.sort((a, b) => a.s - b.s);
    let run = [L[0]];
    const flush = () => {
      if (run.length >= MIN) {
        const mid = run[run.length >> 1], s0 = run[0].s, s1 = run[run.length - 1].s, m = Math.round(run.reduce((a, p) => a + (p.m ?? 1), 0) * 10) / 10;
        out.push({ id: `${prefix}.${w}:${el}:${span(s0, s1)}`, tile, inv: w, m, at: at(mid.x, mid.z), street: nameAt(mid.x, mid.z), cause: ctx.causeOf({ x: mid.x, z: mid.z, r: mid.q?.r, ri: mid.q?.ri, s0, s1 }) });
      }
    };
    for (let i = 1; i < L.length; i++) { if (L[i].s - L[i - 1].s > GAP) { flush(); run = []; } run.push(L[i]); }
    flush();
  }
  return out;
}
