// MARKINGS2: the painted lines along the roads judged on the DRAWN output against the MEASURED kerb, with no exclusion
// zones and nothing skipped as unmeasured (claude/street1, docs/STREET_MODEL_PLAN.md 4 invariants 1-2 / migration job 1,
// rule street-invariants). Report only for now: the plan's job 3 (markings from the street model) brings it to 0, with
// the exceptions in the gap register (data/gaps.json, rule gap-register).
//
// Strokes, traced from what the city draws:
//   asphalt  every line code of the asphalt part (viewer/roadPaint.js aEdges: the iso-line uv.y = line t inside each
//            triangle, a double line as its two strokes), sampled every 0.25 m, one sample per 0.5 m cell;
//   decal    the measured paint decal's solid marks (viewer/streets/measuredPaint.js paintMeshV2), grouped by their frame
//            (one surveyed polygon), a group that is a long thin mark (>= 2 m, <= 0.35 m wide) sampled along its axis;
//            only those within 45 deg of the kerb are along-road strokes (stop lines, zebras, glyphs are not).
// The measured kerb = the nearest UrbIS kerb or street-edge line (the carriageway's boundary). Each stroke sample is
// judged on (a sample may fail several):
//   noKerb    no measured kerb within REACH m: paint where nothing is measured (plan: no stroke on O / G / X)
//   junction  inside a junction area (every OSM node of degree >= 3: a disc of radius hypot(w1 / 2, w2 / 2) of its
//             two widest arms' carriage widths; a rough polygon until the model has junction polygons)
//   angle     more than ANGLE deg off the kerb tangent (an along-road stroke runs WITH the kerb; nothing excluded:
//             not near junctions, not on curved kerbs: a parallel offset of a curve has the curve's tangent)
//   margin    off the carriageway (class raster) or its paint within MARGIN of the kerb (half its width + 0.10 m)
//   edge      a stroke within EDGE_ZONE m of the kerb (an edge line) not at kerb - 0.30 +- 0.10 m
// Findings (stable ids, rule gap-register): `markings2.<check>:<roadId>:<s0-s1>` runs along the nearest OSM road.
// Fixtures (the row fails if the detector misses them, built as ?streetinv=old): the owner's Ch. de Saint-Job /
// Rue Engeland diagonal (E7, x -883..-856, z 1039..1043) and the D7 seam-cut dashed line at (-1004.5, 1098.6).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/markings2.mjs [--all | T ...] [--old] [--out FILE]
//        [--fixtures] [--register] [--write-register] [--quiet] [--worst N]
//   --old = ?streetinv=old + ?streetmodel=old (the lines before "no line rather than a wrong line"); --modelold =
//   ?streetmodel=old (the step-1 lines, claude/street1); --streets: metres per street (for the A/B of the fix)
// claude/street2: the street model's lines (decal, aPaint2.w = 1) are traced exactly like the asphalt's (the iso-line
// at their mid-width in every triangle); the other decal marks as before.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, at, ROOT, SC, lineIndex } from "./lib_street.mjs";
import { findCtx, roadRuns, ownKerb } from "./lib_find.mjs";
import { judge, report, rewrite } from "../gaps.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, flag } = cli();
const OLD = flag("--old"), MODEL_OLD = flag("--modelold"), QUIET = flag("--quiet"), FIX = flag("--fixtures"), REG = flag("--register"), WREG = flag("--write-register");
const CHECKS = ["noKerb", "junction", "angle", "margin", "edge"];
const GATED = CHECKS.map((c) => `markings2.${c}`);
const REACH = 12, ANGLE = 3, MARGIN = 0.10, EDGE_ZONE = 1.0, EDGE_AT = 0.30, EDGE_TOL = 0.10, ALONG = 45;
const CARR = new Set([SC.roadway, SC.tramRoad, SC.parking, SC.tramSite]);
const FIXTURES = [
  { name: "Saint-Job / Engeland diagonal (owner)", tile: "E7", hit: (f) => f.x >= -884 && f.x <= -855 && f.z >= 1038 && f.z <= 1044 },
  { name: "D7 seam-cut dashed line", tile: "D7", hit: (f) => Math.hypot(f.x + 1004.5, f.z - 1098.6) <= 3 },
];

if (!CHILD) {
  if (!TILES.length && !FIX) { console.error("usage: markings2.mjs [--all | T ...] [--old] [--fixtures]"); process.exit(2); }
  let bad = 0;
  if (TILES.length) {
    const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: OLD ? ["--old"] : MODEL_OLD ? ["--modelold"] : [], log: !QUIET });
    const sum = { tiles: 0, strokeM: 0, decalM: 0, decalUnjudged: 0, engineM: 0 }, byCheck = Object.fromEntries(CHECKS.map((c) => [c, 0])), streets = {};
    for (const r of res) {
      if (r.error) { bad++; continue; }
      sum.tiles++; sum.strokeM += r.strokeM; sum.decalM += r.decalM; sum.decalUnjudged += r.decalUnjudged; sum.engineM += r.engineM || 0;
      for (const c of CHECKS) byCheck[c] += r.byCheck[c];
      for (const [k, v] of Object.entries(r.streets)) streets[k] = (streets[k] || 0) + v;
    }
    for (const c of CHECKS) byCheck[c] = Math.round(byCheck[c]);
    sum.strokeM = Math.round(sum.strokeM); sum.decalM = Math.round(sum.decalM); sum.engineM = Math.round(sum.engineM);
    const findings = res.flatMap((r) => r.findings || []);
    const byInv = {}; for (const f of findings) byInv[f.inv] = (byInv[f.inv] || 0) + 1;
    const byCause = {}; for (const f of findings) byCause[f.cause] = (byCause[f.cause] || 0) + 1;
    console.log(`markings2${OLD ? " (?streetinv=old)" : MODEL_OLD ? " (?streetmodel=old)" : ""}: ${JSON.stringify(sum)}\n  flagged metres by check: ${JSON.stringify(byCheck)}\n  findings by check: ${JSON.stringify(byInv)}\n  findings by cause: ${JSON.stringify(byCause)}`);
    findings.sort((a, b) => b.m - a.m);
    for (const f of findings.slice(0, WORST)) console.log(`  ${f.id} ${f.m} m ${f.at} ${f.street} (${f.cause})`);
    if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, byCheck, byInv, byCause, streets, findings }, null, 1));
    const done = res.filter((r) => !r.error).map((r) => r.tile);
    if (WREG) { const w = rewrite(findings, { invariants: GATED, tiles: done, date: new Date().toISOString().slice(0, 10), decision: (f) => `open (${f.cause})` }); console.log(`  register rewritten: ${w.written}`); }
    else if (REG) bad += report("markings2", judge(findings, { invariants: GATED, tiles: done }));
  }
  if (FIX) {
    // the detector must flag the owner's spots on the lines as they were (?streetinv=old)
    const res = await runTiles(new URL(import.meta.url), [...new Set(FIXTURES.map((f) => f.tile))], { jobs: JOBS, extra: ["--old", "--points"], log: false });
    for (const fx of FIXTURES) {
      const r = res.find((q) => q.tile === fx.tile);
      const hits = (r?.points || []).filter(fx.hit), why = [...new Set(hits.flatMap((p) => p.why))];
      const ok = hits.length >= 2; if (!ok) bad++;
      console.log(`  ${ok ? "ok  " : "FAIL"} fixture ${fx.name}: ${hits.length} flagged samples (${why.join(", ") || "none"})`);
    }
  }
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ child: one tile
const T = TILES[0], POINTS = flag("--points");
// (--old: before street1 AND street2; --modelold: ?streetmodel=old, the step-1 lines from the fitted engine strips)
const S = await streetTile(T, { build: OLD ? { streetInv: false, streetModel: false } : MODEL_OLD ? { streetModel: false } : {} });
const { rd, classAt, inB, nameAt } = S;
const out = { tile: T, strokeM: 0, decalM: 0, decalUnjudged: 0, byCheck: Object.fromEntries(CHECKS.map((c) => [c, 0])), streets: {}, findings: [] };
const kerbs = [...(rd.surfaceData?.kerbs || []), ...(S.tile.surf?.edges || []).map((e) => e.line).filter(Boolean)];
const kIdx = lineIndex(kerbs, 8);
const ctx = findCtx(S);
const samples = [];      // { x, z, ux, uz, hw, m, src }
const seen = new Set();
const push = (x, z, ux, uz, hw, m, src) => { const key = `${Math.round(x * 2)},${Math.round(z * 2)}`; if (!inB(x, z) || seen.has(key)) return; seen.add(key); samples.push({ x, z, ux, uz, hw, m, src }); };
const lineOf = (v) => { const code = Math.floor(v + 1e-4); if (code <= 0) return null; let c = code >= 1000 ? code - 1000 : code; const dbl = code >= 1000; if (c >= 500) c -= 500; const dash = Math.floor((c + 0.5) / 50), w = (c - dash * 50) / 100; return w >= 0.005 ? { w, dbl } : null; };

// ---- asphalt strokes
const A = rd.parts.asphalt;
if (A?.attributes?.aEdges) {
  const P = A.position, UV = A.uv, I = A.index, E = A.attributes.aEdges.array;
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    for (const [tk, ck] of [[0, 2], [1, 3]]) {
      const ln = lineOf(E[v[0] * 4 + ck]); if (!ln) continue;
      for (const off of ln.dbl ? [-ln.w, ln.w] : [0]) {
        const pts = [];
        for (let q = 0; q < 3; q++) {
          const a = v[q], b = v[(q + 1) % 3], ta = UV[a * 2 + 1] - E[a * 4 + tk] - off, tb = UV[b * 2 + 1] - E[b * 4 + tk] - off;
          if ((ta <= 0) !== (tb <= 0) && ta !== tb) { const f = ta / (ta - tb); pts.push([P[a * 3] + (P[b * 3] - P[a * 3]) * f, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * f]); }
        }
        if (pts.length < 2) continue;
        const [p, q] = pts, L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue;
        const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
        for (let d = 0; d <= L; d += 0.25) push(p[0] + ux * d, p[1] + uz * d, ux, uz, ln.w / 2, 0.5, "asphalt");
      }
    }
  }
}
// ---- decal strokes: solid marks grouped by their frame (one surveyed polygon / one item)
const D = rd.parts.paint;
if (D?.attributes?.aPaint) {
  const P = D.position, a1 = D.attributes.aPaint.array, a2 = D.attributes.aPaint2.array, nv = P.length / 3, groups = new Map();
  // (claude/street2) the street model's along-road lines (aPaint2.w = 1, viewer/street/markings.js): traced exactly, as
  // the asphalt's: the iso-line v = vLen / 2 inside each of their triangles (their width = vLen)
  const I = D.index;
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    if (!v.every((q) => a2[q * 4 + 3] > 0.5)) continue;
    const half = a2[v[0] * 4 + 1] / 2, pts = [];
    for (let q = 0; q < 3; q++) {
      const a = v[q], b = v[(q + 1) % 3], ta = a1[a * 4 + 1] - half, tb = a1[b * 4 + 1] - half;
      if ((ta <= 0) !== (tb <= 0) && ta !== tb) { const f = ta / (ta - tb); pts.push([P[a * 3] + (P[b * 3] - P[a * 3]) * f, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * f]); }
    }
    if (pts.length < 2) continue;
    const [p, q] = pts, L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.02) continue;
    const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
    for (let d = 0; d <= L; d += 0.25) { const n0 = samples.length; push(p[0] + ux * d, p[1] + uz * d, ux, uz, half, 0.5, "line"); if (samples.length > n0) out.decalM += 0.5; }
  }
  for (let i = 0; i < nv; i++) {
    if (a2[i * 4 + 3] > 0.5) continue;                       // (a model line: traced above)
    if (Math.round(a1[i * 4 + 2]) !== 0) continue;           // kind 0 solid
    const ox = P[i * 3] - a1[i * 4], oz = P[i * 3 + 2] - a1[i * 4 + 1];
    const k = `${a2[i * 4].toFixed(3)},${a2[i * 4 + 1].toFixed(3)},${ox.toFixed(1)},${oz.toFixed(1)}`;
    (groups.get(k) || groups.set(k, []).get(k)).push([P[i * 3], P[i * 3 + 2]]);
  }
  for (const V of groups.values()) {
    if (V.length < 3) continue;
    let cx = 0, cz = 0; for (const [x, z] of V) { cx += x; cz += z; } cx /= V.length; cz /= V.length;
    let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of V) { const dx = x - cx, dz = z - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
    const th = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(th), uz = Math.sin(th);
    let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;
    for (const [x, z] of V) { const u = (x - cx) * ux + (z - cz) * uz, w = -(x - cx) * uz + (z - cz) * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
    if (u1 - u0 < 2) continue;                                  // a glyph part, a short mark
    const k = kIdx.dist(cx, cz, REACH);
    if (k && Math.abs(ux * k.ux + uz * k.uz) < Math.cos((ALONG * Math.PI) / 180)) continue;   // a transverse mark
    if (w1 - w0 > 0.35) { out.decalUnjudged += u1 - u0; continue; }                         // a wide / curved mark: counted, not traced
    const wc = (w0 + w1) / 2;
    for (let u = u0; u <= u1; u += 0.25) { const x = cx + ux * u - uz * wc, z = cz + uz * u + ux * wc; const n0 = samples.length; push(x, z, ux, uz, (w1 - w0) / 2, 0.5, "decal"); if (samples.length > n0) out.decalM += 0.5; }
  }
}
// ---- judge
const flagged = [];
// (claude/street2: D-ENGINE strokes, on roads UrbIS does not measure at all (rd.streetModel.bareRoads: the drawn road is
// the engine's strip from this OSM line): judged against that drawn strip, not against a measured kerb: inside it by
// half the width + MARGIN, within ANGLE of its alignment, an edge line at its edge - 0.30 +- 0.10 m, none in a junction)
const bareIds = new Set(rd.streetModel?.bareRoads || []);
const { roadFrameOf } = await import("../../../viewer/streets/lineFit.js");
const { layoutEdges } = await import("../../../vendor/roads/roadCrossSection.js");
out.engineM = 0;
const engineWhy = (s) => {
  const q = bareIds.size ? ctx.roadAt(s.x, s.z) : null;
  if (!q || !bareIds.has(q.id) || kIdx.dist(s.x, s.z, REACH)) return null;
  const rr = q.r, f = roadFrameOf(rr, s.x, s.z), S0 = rr.smp;
  let i = 0; while (i < S0.s.length - 1 && S0.s[i] < f.s) i++;
  const e = layoutEdges(rr.lays[i]), why = [];
  if (ctx.junctionAt(s.x, s.z)) why.push("junction");
  const tx = -f.nz, tz = f.nx, ang = (Math.acos(Math.min(1, Math.abs(s.ux * tx + s.uz * tz))) * 180) / Math.PI;
  if (ang > ANGLE) why.push("angle");
  if (f.t < e.curbR + s.hw + MARGIN || f.t > e.curbL - s.hw - MARGIN) why.push("margin");
  const dE = Math.min(e.curbL - f.t, f.t - e.curbR);
  if (dE < EDGE_ZONE && Math.abs(dE - EDGE_AT) > EDGE_TOL) why.push("edge");
  return why;
};
for (const s of samples) {
  out.strokeM += s.m;
  const ew = engineWhy(s);
  if (ew) {
    out.engineM += s.m;
    const st = nameAt(s.x, s.z); out.streets[st] = (out.streets[st] || 0) + s.m;
    for (const w of ew) out.byCheck[w] += s.m;
    if (ew.length) flagged.push({ x: s.x, z: s.z, why: ew, m: s.m });
    continue;
  }
  const why = [];
  const k = kIdx.dist(s.x, s.z, REACH);
  if (!k) why.push("noKerb");
  if (ctx.junctionAt(s.x, s.z)) why.push("junction");
  if (k) {
    const ang = (Math.acos(Math.min(1, Math.abs(s.ux * k.ux + s.uz * k.uz))) * 180) / Math.PI;
    // (claude/street2: an angle over ANGLE is judged again against the stroke's OWN kerb, the first one square to it,
    // not the nearest one anywhere: a kerb step, build-out or island ahead is nearer than the kerb across the lane)
    const own = ang > ANGLE && S.fit ? ownKerb(S.fit, s.x, s.z, s.ux, s.uz, REACH) : null;
    const angOwn = own ? (Math.acos(Math.min(1, Math.abs(s.ux * own.tx + s.uz * own.tz))) * 180) / Math.PI : ang;
    if (ang > ANGLE && angOwn > ANGLE) why.push("angle");
    if (k.d < EDGE_ZONE && Math.abs(k.d - EDGE_AT) > EDGE_TOL) why.push("edge");
  }
  // margin: the stroke on the carriageway (within a raster cell of a kerb: on its road side, exact; else the 0.5 m class
  // raster) and its paint MARGIN m clear of the kerb / street edge (exact lines)
  const kk = S.fit?.nearKerb(s.x, s.z, 0.75);
  // (a sample on the tile edge reads the raster 5 cm inside: its last column is empty exactly on the edge)
  const onCarr = kk ? (s.x - kk.x) * kk.lx + (s.z - kk.z) * kk.lz < 0 : CARR.has(classAt(Math.min(S.bounds.x1 - 0.05, Math.max(S.bounds.x0 + 0.05, s.x)), Math.min(S.bounds.z1 - 0.05, Math.max(S.bounds.z0 + 0.05, s.z))));
  if (!onCarr || (k && k.d < s.hw + MARGIN)) why.push("margin");
  const st = nameAt(s.x, s.z); out.streets[st] = (out.streets[st] || 0) + s.m;
  for (const w of why) out.byCheck[w] += s.m;
  if (why.length) flagged.push({ x: s.x, z: s.z, why, m: s.m });
}
out.findings = roadRuns(flagged, ctx, { prefix: "markings2", tile: T, nameAt, at, GAP: 3, MIN: 2 });
if (POINTS) out.points = flagged.map((f) => ({ x: Math.round(f.x * 10) / 10, z: Math.round(f.z * 10) / 10, why: f.why }));
console.log(JSON.stringify(out));
