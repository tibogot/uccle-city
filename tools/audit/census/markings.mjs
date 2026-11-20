// CENSUS class F (claude/census 2026-11-18, owner playtest: "road white lines going anyhow"). Report only.
//
// The lines ALONG the roads (centre, lane, edge lines) are not a mesh of their own: the asphalt shader paints them
// (viewer/roadPaint.js asphaltMaterial: a stroke where the engine frame's lateral uv.y = aEdges.x / .y, code .z / .w,
// laid out by vendor/roads laneRoadMesh from the OSM centre line + lane stack, fitted by roadBuild.js fitRoadWidths)
// on the engine strips that viewer/surfaces.js overlays on the measured UrbIS street (or keeps where UrbIS maps
// nothing). This census traces every painted stroke (the iso-line uv.y = line t inside each asphalt triangle that
// carries a line code) and checks it against the drawn street (fitCore.js classAt + the measured kerb lines):
//   offStreet  a stroke on a raised class (sidewalk, median, square, path, ramp, pit) or off any measured surface
//              with a measured kerb within 4 m (the engine strip kept outside the street); strokes with neither a
//              measured surface nor a kerb near (Flanders, unmapped private roads) are "unmeasured", not judged
//   atKerb     a stroke within 0.10 m of a measured kerb line or across it
//   skew       a stroke whose direction is > 12 deg off the nearest measured kerb within 4 m, on a stretch (no junction
//              within 15 m, the kerb straight there): a line running diagonally across the carriageway
// The paint decal (paint v2 crossings, stop lines, arrows, measured lines: viewer/streets/measuredPaint.js) is clipped
// to the markable base triangles by construction (road_audit C4 checks it) and is counted as info only.
// Findings = runs of flagged stroke samples (1 m apart, gaps < 3 m merged), sized in metres.
//
// Gate (claude/markings, rule 33 provisional; claude/street1, rule gap-register): --register judges every finding of
// offStreet / atKerb / skew / zebraShort against data/gaps.json by its stable id (tools/audit/gaps.mjs: a finding not
// registered fails, a registered one no longer found is stale and fails; no city-wide sums), --write-register rewrites
// those entries from this run; --max laneP95=N (a quality threshold, not a sum); --old = ?roadlines=old (the lines where the median width fit put them, kept on
// sidewalks); the parent also runs the bicycle glyph's geometry test (viewer/streets/bikeGlyph.js): round wheels (the
// painted edge a true circle in the sign frame, every 0.5 deg, vs the old decagons), the survey's footprint (1.50 x 0.92
// m), round seen from a cyclist's eye, the chevron's inside / outside, the shader using the same shapes.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/markings.mjs [--all | T ...] [--out FILE] [--old]
//        [--register] [--write-register] [--max laneP95=N] [--quiet]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, at, ROOT, SC, CLASS_NAME, lineIndex } from "./lib_street.mjs";
import { findCtx, roadRuns } from "./lib_find.mjs";
import { judge, report, rewrite } from "../gaps.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, opt, flag } = cli();
const OLD = flag("--old"), ROADS_OLD = flag("--roadsold"), QUIET = flag("--quiet"), MAX = opt("--max", null), REG = flag("--register"), WREG = flag("--write-register");
/** the invariants the register holds for this row (the others are reported only) */
const GATED = ["markings.offStreet", "markings.atKerb", "markings.skew", "markings.zebraShort"];
const ceil = MAX ? Object.fromEntries(MAX.split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, +v])) : null;

/** the bicycle / chevron glyph geometry test: [{ name, ok, info }] */
async function glyphTest() {
  const G = await import("../../../viewer/streets/bikeGlyph.js");
  const { sharrow } = await import("../../../viewer/streets/measuredPaint.js");
  const res = [], add = (name, ok, info) => res.push({ name, ok, info });
  // 1. round wheels: along rays from each hub every 0.5 deg, the painted ring's outer and inner edges (bisection on the
  // glyph's own signed distance) at R +- w / 2; rays where a frame stroke reaches the ring are skipped
  const nearStroke = (x, y) => G.BIKE.segs.some((sg) => segDist(x, y, sg.a, sg.b) < sg.w / 2 + 0.06);
  let worst = 0, rays = 0;
  for (const g of G.BIKE.rings) for (let k = 0; k < 720; k++) {
    const a = (k / 720) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
    const P = (r) => [g.c[0] + cx * r, g.c[1] + cy * r];
    if (nearStroke(...P(g.r))) continue;
    const edge = (rIn, rOut) => { let lo = rIn, hi = rOut; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (G.bikeSD(...P(m)) < 0) lo = m; else hi = m; } return (lo + hi) / 2; };
    worst = Math.max(worst, Math.abs(edge(g.r, g.r + g.w) - (g.r + g.w / 2)), Math.abs(g.r - g.w / 2 - edge(g.r, g.r - g.w)));
    rays++;
  }
  add("wheels round", worst < 0.001 && rays > 600, `painted edges within ${(worst * 1000).toFixed(2)} mm of a circle on ${rays} rays`);
  // the old symbol for comparison (?bikemark=old): its rear wheel = 10 bars round (-0.9, 0), r 0.32, 0.07 wide; rays
  // toward the frame (+-35 deg of forward) skipped
  const old = sharrow(0, 0, 0, false), inOld = (x, z) => old.some((it) => pipPoly(x, z, it.poly));
  let oMin = Infinity, oMax = 0;
  for (let k = 0; k < 720; k++) {
    const a = (k / 720) * Math.PI * 2; if (Math.cos(a) > Math.cos((35 * Math.PI) / 180)) continue;
    let lo = 0.3, hi = 0.45;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (inOld(-0.9 + Math.cos(a) * m, Math.sin(a) * m)) lo = m; else hi = m; }
    oMin = Math.min(oMin, lo); oMax = Math.max(oMax, lo);
  }
  add("old wheels were faceted", oMax - oMin > 0.005, `?bikemark=old: outer edge radius ${(oMin * 1000).toFixed(0)}-${(oMax * 1000).toFixed(0)} mm (${((oMax - oMin) * 1000).toFixed(0)} mm of facets)`);
  // 2. the survey's footprint (Brussels Mobility P09: 1.50 m along x 0.92 m across)
  add("bicycle footprint", Math.abs(G.BIKE_LEN - 1.5) < 0.03 && Math.abs(G.BIKE_WID - 0.92) < 0.03, `${G.BIKE_LEN.toFixed(2)} x ${G.BIKE_WID.toFixed(2)} m, stretch ${G.STRETCH.toFixed(2)}`);
  // 3. round from the road user's eye: a cyclist's eye 1.5 m up, STRETCH x 1.5 m before the wheel (a pinhole
  // projection): the projected wheel's height / width within 20 % of 1
  {
    const g = G.BIKE.rings[1], h = 1.5, d = G.STRETCH * h;
    const wu = (g.c[1] - G.Y_MID) * G.STRETCH, wv = g.c[0] - G.X_MID;
    const L = Math.hypot(d, h), fu = d / L, fy = -h / L;             // view direction (along u, down)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < 360; k++) {
      const a = (k / 360) * Math.PI * 2, x = g.c[0] + Math.cos(a) * g.r, y = g.c[1] + Math.sin(a) * g.r;
      const pu = (y - G.Y_MID) * G.STRETCH - (wu - d), pv = x - G.X_MID - wv, py = -h;
      const z = pu * fu + py * fy, up = -pu * fy + py * fu;
      x1 = Math.max(x1, pv / z); x0 = Math.min(x0, pv / z); y1 = Math.max(y1, up / z); y0 = Math.min(y0, up / z);
    }
    const asp = (y1 - y0) / (x1 - x0);
    add("round from the saddle", asp > 0.8 && asp < 1.25, `wheel height / width ${asp.toFixed(2)} from 1.5 m up, ${d.toFixed(1)} m before it`);
  }
  // 4. the chevron: inside at its apex and arm ends, outside in the V
  add("chevron shape", G.polySD(0.58, 0, G.CHEVRON) < 0 && G.polySD(0, 0, G.CHEVRON) > 0 && G.polySD(-0.7, 0.4, G.CHEVRON) < 0 && G.polySD(-0.6, 0, G.CHEVRON) > 0, "inside at the apex and the arm ends, outside in the V");
  // 5. the shader draws the same shapes (viewer/roadPaint.js imports them; no copy of the numbers)
  {
    const src = (await import("node:fs")).readFileSync(new URL("../../../viewer/roadPaint.js", import.meta.url), "utf8");
    add("shader uses bikeGlyph.js", src.includes('from "./streets/bikeGlyph.js"') && src.includes("glyphCoverage(u, v, n).mul(band(kind, 3))"), "paintMaterial: glyphCoverage, kind 3");
  }
  return res;
}
function segDist(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
function pipPoly(x, z, r) { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; }
const MARKABLE = new Set([SC.roadway, SC.tramRoad, SC.parking]);
const KERB_D = 0.10, SKEW = 12, NEAR_KERB = 4, JUNCTION_R = 15, LS_NEAR = 1.2, LS_END = 8;

if (!CHILD) {
  if (!TILES.length) { console.error("usage: markings.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const gt = await glyphTest();
  for (const t of gt) console.log(`  glyph ${t.ok ? "ok  " : "FAIL"} ${t.name}: ${t.info}`);
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: [...(OLD ? ["--old"] : []), ...(ROADS_OLD ? ["--roadsold"] : [])], log: !QUIET });
  const sum = { tiles: 0, strokeM: 0, unmeasuredM: 0, offStreetM: 0, atKerbM: 0, skewM: 0, laneSkewM: 0, tickM: 0, tickSkewM: 0, tickLaneM: 0, zebraShort: 0, runs: 0, decalTris: 0, decalOff: 0 }, runs = [];
  for (const r of res) {
    if (r.error) continue;
    sum.tiles++; for (const k of Object.keys(sum)) if (k !== "tiles" && k !== "runs") sum[k] += r[k] || 0;
    sum.runs += r.runs.length;
    for (const x of r.runs) runs.push({ tile: r.tile, ...x });
    for (const x of r.zebraShortAt || []) runs.push({ tile: r.tile, len: 0, why: "zebraShort", ...x });
  }
  const findings = res.flatMap((r) => r.findings || []);
  for (const k of ["strokeM", "unmeasuredM", "offStreetM", "atKerbM", "skewM", "laneSkewM", "tickM", "tickSkewM", "tickLaneM"]) sum[k] = Math.round(sum[k]);
  // traffic lanes vs the painted lanes: |lane centre - painted lane centre| histogram (cm bins) over all tiles -> p95
  const hist = new Array(301).fill(0);
  for (const r of res) if (r.laneHist) r.laneHist.forEach((c, k) => { hist[k] += c; });
  const nLane = hist.reduce((a, b) => a + b, 0);
  let acc = 0, p95 = 0; for (let k = 0; k < hist.length; k++) { acc += hist[k]; if (acc >= 0.95 * nLane) { p95 = k / 100; break; } }
  let acc2 = 0, p50 = 0; for (let k = 0; k < hist.length; k++) { acc2 += hist[k]; if (acc2 >= 0.5 * nLane) { p50 = k / 100; break; } }
  sum.laneP95 = nLane ? p95 : null; sum.laneP50 = nLane ? p50 : null; sum.lanePts = nLane;
  sum.laneOutside = res.reduce((a, r) => a + (r.laneOutside || 0), 0); sum.laneOffPaint = res.reduce((a, r) => a + (r.laneOffPaint || 0), 0); sum.laneNarrow = res.reduce((a, r) => a + (r.laneNarrow || 0), 0);
  runs.sort((a, b) => b.len - a.len);
  const byWhy = {}; for (const x of runs) for (const w of x.why.split("/")) byWhy[w] = (byWhy[w] || 0) + 1;
  console.log(`class F: ${JSON.stringify(sum)}\n  runs by why: ${JSON.stringify(byWhy)}`);
  if (WORST) console.log(`worst ${WORST}:`);
  for (const x of runs.slice(0, WORST)) console.log(`  ${x.tile} ${JSON.stringify(x)}`);
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, byWhy, runs, perTile: res.filter((r) => !r.error).map((r) => ({ tile: r.tile, offStreetM: r.offStreetM, atKerbM: r.atKerbM, skewM: r.skewM })) }, null, 1));
  let bad = gt.filter((t) => !t.ok).length;
  const errs = res.filter((r) => r.error).length;
  if (errs) { console.log(`FAIL ${errs} tile(s) did not build`); bad++; }
  const done = res.filter((r) => !r.error).map((r) => r.tile);
  if (WREG) { const w = rewrite(findings, { invariants: GATED, tiles: done, date: new Date().toISOString().slice(0, 10), decision: (f) => `open (${f.cause}); report-only until the street model job named by the cause` }); console.log(`  register rewritten: ${w.written} entries of ${GATED.join(" / ")}, ${w.kept} others kept`); }
  else if (REG) bad += report("markings", judge(findings, { invariants: GATED, tiles: done }));
  if (ceil) for (const [k, v] of Object.entries(ceil)) {
    const got = sum[`${k}M`] !== undefined ? sum[`${k}M`] : sum[k];
    if (got == null) { console.log(`FAIL unknown ceiling ${k}`); bad++; continue; }
    const ok = got <= v; if (!ok) bad++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${k} ${got} m (ceiling ${v})`);
  }
  process.exit(bad ? 1 : 0);
}

const T = TILES[0];
// (--roadsold: ?roads=old, claude/roads rule 38: the line fit's running median as before)
const S = await streetTile(T, { build: { ...(OLD ? { roadLines: false } : {}), ...(ROADS_OLD ? { roadsR: false } : {}) } });
const { rd, fit, classAt, inB, nameAt, roads } = S;
const out = { tile: T, strokeM: 0, unmeasuredM: 0, offStreetM: 0, atKerbM: 0, skewM: 0, laneSkewM: 0, tickM: 0, tickSkewM: 0, tickLaneM: 0, decalTris: 0, decalOff: 0, runs: [] };
const A = rd.parts.asphalt;
if (fit && A) {
  const P = A.position, UV = A.uv, I = A.index, E = A.attributes.aEdges.array;
  // junction nodes (degree >= 3) for the skew test
  const deg = new Map(); for (const r of roads.roads || []) for (const n of [r.a, r.b]) deg.set(n, (deg.get(n) || 0) + 1);
  const J = (roads.nodes || []).filter((n) => (deg.get(n.id) || 0) >= 3);
  const nearJ = (x, z) => J.some((n) => Math.hypot(n.x - x, n.z - z) < JUNCTION_R);
  const lineOf = (v) => { const code = Math.floor(v + 1e-4); if (code <= 0) return 0; let c = code >= 1000 ? code - 1000 : code; if (c >= 500) c -= 500; const dash = Math.floor((c + 0.5) / 50), w = (c - dash * 50) / 100; return w >= 0.005 ? w : 0; };
  // strokes as samples on a 1 m hash (one sample per metre cell per line: the overlay + base duplicates collapse)
  const seen = new Set(), samples = [];
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]], e = v[0] * 4;
    for (const [tk, ck, kind] of [[0, 2, "inner"], [1, 3, "outer"]]) {
      if (!lineOf(E[e + ck])) continue;
      const lt = E[e + tk], pts = [];
      for (let q = 0; q < 3; q++) {
        const a = v[q], b = v[(q + 1) % 3], ta = UV[a * 2 + 1] - E[a * 4 + tk], tb = UV[b * 2 + 1] - E[b * 4 + tk];   // (the line's t per vertex, as the shader interpolates it)
        if ((ta <= 0) !== (tb <= 0) && ta !== tb) { const f = ta / (ta - tb); pts.push([P[a * 3] + (P[b * 3] - P[a * 3]) * f, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * f]); }
      }
      if (pts.length < 2) continue;
      const [p, q] = pts, L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue;
      const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
      for (let d = 0; d <= L; d += 0.5) {
        const x = p[0] + ux * d, z = p[1] + uz * d, key = `${kind}${Math.round(x)},${Math.round(z)}`;   // (one sample per 1 m cell and side, whatever strip / copy drew it: the lateral uv is planar now, claude/markings)
        if (!inB(x, z) || seen.has(key)) continue; seen.add(key);
        samples.push({ x, z, ux, uz, kind });
      }
    }
  }
  out.strokeM = samples.length;
  // claude/roads (rule 38, census R c): a stroke running across a DRIVEN LANE. The skew test above judges a stroke
  // against the nearest measured kerb, and only on a stretch (no OSM junction node within 15 m, the kerb straight
  // 2 m both ways, a kerb within 4 m): a line laid diagonally across a lane next to a side street, a parking bay notch
  // or a kerb build-out is never judged (Av. du Prince de Ligne: side streets every 40-60 m). Here the stroke is judged
  // against the traffic lane it lies on (net.graph lanes, within LS_NEAR m of its centre line), wherever that lane is
  // straight (its heading 4 m before and after within 4 deg) and >= LS_END m from the lane piece's ends (the junction
  // blends): a painted line along the road runs WITH the lanes, it never crosses one
  const laneSegs = [];
  for (const p of S.rd.net?.graph?.paths || []) {
    if (p.kind !== "lane") continue;
    const P = p.pts.map((q) => [q[0] ?? q.x, q[1] ?? q.z]), c = [0];
    for (let k = 1; k < P.length; k++) c.push(c[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
    laneSegs.push({ P, c, L: c[c.length - 1] });
  }
  const laneIdx = lineIndex(laneSegs.map((l) => l.P), 8);
  const headAt = (l, d) => { let k = 1; while (k < l.P.length - 1 && l.c[k] < d) k++; const a = l.P[k - 1], b = l.P[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  const laneSkew = (s) => {
    const n = laneIdx.dist(s.x, s.z, LS_NEAR); if (!n) return false;
    const l = laneSegs[n.li], a = l.P[n.k - 1], d = l.c[n.k - 1] + ((s.x - a[0]) * n.ux + (s.z - a[1]) * n.uz);
    if (d < LS_END || l.L - d < LS_END) return false;
    const h0 = headAt(l, d - 4), h1 = headAt(l, d + 4);
    if (h0[0] * h1[0] + h0[1] * h1[1] < Math.cos((4 * Math.PI) / 180)) return false;
    return (Math.acos(Math.min(1, Math.abs(s.ux * n.ux + s.uz * n.uz))) * 180) / Math.PI > SKEW;
  };
  // claude/roads (census R c): the PARKING BAY TICKS. The shader paints a tick across every strip whose aMark.w is set
  // (the engine's parking lanes: viewer/roadPaint.js "parking bay ticks every 5.5 m", the iso-lines s = 5.5 k), not a
  // line code: the census above traced only the along-road strokes (aEdges), so a tick never entered it. A tick should
  // stand square to its road (within SKEW deg) and only on a parking strip, never on a driving lane: traced here per
  // triangle (s = 5.5 k), sampled every 0.25 m, judged against the nearest OSM centre line's direction (tickSkew) and
  // the driven lanes (tickLane: within LS_NEAR m of a lane's centre line, >= LS_END m from its ends)
  const MK = A.attributes.aMark?.array;
  const N0 = new Map((roads.nodes || []).map((n) => [n.id, n]));
  const cl = (roads.roads || []).map((r) => [N0.get(r.a), ...(r.pts || []), N0.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]));
  const clIdx = lineIndex(cl, 16);
  const tickSeen = new Set(), ticks = [];
  if (MK) for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    if (!v.every((q) => MK[q * 4 + 3] > 0.5)) continue;
    const sv = v.map((q) => UV[q * 2]);
    for (let kk = Math.ceil(Math.min(...sv) / 5.5); kk * 5.5 <= Math.max(...sv); kk++) {
      const S0 = kk * 5.5, pts = [];
      for (let q = 0; q < 3; q++) {
        const a = v[q], b = v[(q + 1) % 3], ta = UV[a * 2] - S0, tb = UV[b * 2] - S0;
        if ((ta <= 0) !== (tb <= 0) && ta !== tb) { const f = ta / (ta - tb); pts.push([P[a * 3] + (P[b * 3] - P[a * 3]) * f, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * f]); }
      }
      if (pts.length < 2) continue;
      const [p, q] = pts, L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue;
      const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
      for (let d = 0; d <= L; d += 0.25) {
        const x = p[0] + ux * d, z = p[1] + uz * d, key = `${Math.round(x * 4)},${Math.round(z * 4)}`;
        if (!inB(x, z) || tickSeen.has(key)) continue; tickSeen.add(key);
        ticks.push({ x, z, ux, uz });
      }
    }
  }
  out.tickM = ticks.length * 0.25; out.tickSkewM = 0; out.tickLaneM = 0;
  const tickBad = [];
  for (const s of ticks) {
    const c = classAt(s.x, s.z), why = [];
    const r = clIdx.dist(s.x, s.z, 16);
    if (r && Math.abs(s.ux * r.ux + s.uz * r.uz) > Math.sin((SKEW * Math.PI) / 180)) { why.push("tickSkew"); out.tickSkewM += 0.25; }
    const n = laneIdx.dist(s.x, s.z, 0.9);
    if (n) { const l = laneSegs[n.li], a = l.P[n.k - 1], d = l.c[n.k - 1] + ((s.x - a[0]) * n.ux + (s.z - a[1]) * n.uz); if (d >= LS_END && l.L - d >= LS_END) { why.push("tickLane"); out.tickLaneM += 0.25; } }
    if (why.length) tickBad.push({ ...s, why, c });
  }
  // classify
  const flagged = [];
  for (const s of samples) {
    const c = classAt(s.x, s.z), why = [];
    const k = fit.nearKerb(s.x, s.z, NEAR_KERB);
    // (no measured surface and no measured kerb within 4 m: a street UrbIS does not map (Flanders, private roads):
    // nothing to judge the line against, not counted)
    if (c < 0 && !k) { out.unmeasuredM++; continue; }
    if (!MARKABLE.has(c) && c !== SC.tramSite) { why.push(c < 0 ? "offStreet" : `on ${CLASS_NAME[c]}`); out.offStreetM++; }
    if (k && k.d < KERB_D) { why.push("atKerb"); out.atKerbM++; }
    else if (k && !nearJ(s.x, s.z)) {
      // kerb straight there: the tangent 2 m along both ways agrees with it
      const k1 = fit.nearKerb(k.x + k.tx * 2, k.z + k.tz * 2, 0.5), k2 = fit.nearKerb(k.x - k.tx * 2, k.z - k.tz * 2, 0.5);
      const straight = k1 && k2 && Math.abs(k1.tx * k.tx + k1.tz * k.tz) > 0.98 && Math.abs(k2.tx * k.tx + k2.tz * k.tz) > 0.98;
      const ang = (Math.acos(Math.min(1, Math.abs(s.ux * k.tx + s.uz * k.tz))) * 180) / Math.PI;
      if (process.env.CENSUS_DBG) { (globalThis.H ??= {})[`${straight ? "S" : "c"}${Math.min(9, Math.floor(ang / 5))}`] = ((globalThis.H[`${straight ? "S" : "c"}${Math.min(9, Math.floor(ang / 5))}`]) || 0) + 1; }
      if (straight && ang > SKEW) { why.push("skew"); out.skewM++; }
    }
    if (!why.includes("skew") && (c >= 0 || k) && laneSkew(s)) { why.push("laneSkew"); out.laneSkewM++; }
    if (why.length) flagged.push({ ...s, why });
  }
  for (const b of tickBad) flagged.push(b);
  // stable ids (rule gap-register): per invariant and OSM road, runs along its stations
  {
    const ctx = findCtx(S);
    out.findings = roadRuns(flagged.map((f) => ({ x: f.x, z: f.z, why: [...new Set(f.why.map((w) => (w.startsWith("on ") ? "offStreet" : w)))], m: f.why.some((w) => w.startsWith("tick")) ? 0.25 : 1 })), ctx, { prefix: "markings", tile: T, nameAt, at });
  }
  // runs: chain flagged samples within 3 m (greedy over a 3 m grid)
  const grid = new Map(), gk = (x, z) => `${Math.floor(x / 3)},${Math.floor(z / 3)}`;
  flagged.forEach((f, i) => { const k = gk(f.x, f.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const done = new Uint8Array(flagged.length);
  for (let i = 0; i < flagged.length; i++) {
    if (done[i]) continue;
    const stack = [i], mem = []; done[i] = 1;
    while (stack.length) {
      const j = stack.pop(), f = flagged[j]; mem.push(f);
      const gi = Math.floor(f.x / 3), gj = Math.floor(f.z / 3);
      for (let a = gi - 1; a <= gi + 1; a++) for (let b = gj - 1; b <= gj + 1; b++) for (const n of grid.get(`${a},${b}`) || []) {
        if (done[n]) continue; const g = flagged[n];
        if (Math.hypot(g.x - f.x, g.z - f.z) < 3) { done[n] = 1; stack.push(n); }
      }
    }
    if (mem.length < 2) continue;
    const whys = new Set(mem.flatMap((m) => m.why.map((w) => (w.startsWith("on ") ? "offStreet" : w))));
    const mid = mem[Math.floor(mem.length / 2)];
    const classes = [...new Set(mem.flatMap((m) => m.why.filter((w) => w.startsWith("on ") || w === "offStreet")))].join(",");
    out.runs.push({ len: mem.length, why: [...whys].join("/"), at: at(mid.x, mid.z), street: nameAt(mid.x, mid.z), ...(classes ? { on: classes } : {}) });
  }
  // the decal (info): its triangles' centroids on a non-markable class (raster: blurs the kerb by 0.5 m)
  const D = rd.parts.paint;
  if (D) for (let t = 0; t < D.index.length; t += 3) {
    const a = D.index[t] * 3, b = D.index[t + 1] * 3, c = D.index[t + 2] * 3;
    const x = (D.position[a] + D.position[b] + D.position[c]) / 3, z = (D.position[a + 2] + D.position[b + 2] + D.position[c + 2]) / 3;
    out.decalTris++; const k = classAt(x, z); if (!MARKABLE.has(k) && k !== SC.tramSite) out.decalOff++;
  }
}
// claude/roads (rule 38, census R c): a ZEBRA that ends in the open roadway: a drawn crossing (rd.inventory.crossings)
// whose stripes stop with >= 1.5 m of the same carriageway still to go to the kerb on either side (no island between)
out.zebraShort = 0; out.zebraShortAt = [];
for (const r of rd.inventory?.crossings || []) {
  if (!r.vSpan || !inB(r.c[0], r.c[1])) continue;
  const ax = Math.cos(r.axis), az = Math.sin(r.axis), bx = -az, bz = ax;
  // (an end meeting another drawn crossing's outline (Brussels Mobility's pieces across tram tracks) is not open)
  const others = (rd.inventory?.crossings || []).filter((o) => o !== r && o.poly);
  const open = (v, sg) => { let d = 0; for (; d < 3; d += 0.25) { const x = r.c[0] + bx * (v + sg * (d + 0.25)), z = r.c[1] + bz * (v + sg * (d + 0.25)); if (!MARKABLE.has(classAt(x, z)) || others.some((o) => pipPoly(x, z, o.poly))) break; } return d >= 1.5 + 0.15; };
  if (open(r.vSpan[0], -1) || open(r.vSpan[1], 1)) {
    out.zebraShort++; out.zebraShortAt.push({ id: r.id, at: at(r.c[0], r.c[1]), street: nameAt(r.c[0], r.c[1]) });
    (out.findings ??= []).push({ id: `markings.zebraShort:${String(r.id).replace(/[:\s]/g, "_")}:0-0`, tile: T, inv: "zebraShort", at: at(r.c[0], r.c[1]), street: nameAt(r.c[0], r.c[1]), cause: "junction-unmodelled" });
  }
}
if (process.env.CENSUS_DBG) console.error(JSON.stringify(globalThis.H));
// traffic lanes vs paint (markings round 2): every driven lane point of a fitted road, 12 m and more from its path's
// ends (the junction blends), in the tile and on the carriageway, whose painted lane lies on the carriageway: its offset from the centre of the painted lane it
// lies in (viewer/streets/lineFit.js paintedLaneCentre), in cm bins; points in no painted drive lane are counted apart
{
  const net = S.rd.net, fit = net.lineFit;
  out.laneHist = new Array(301).fill(0); out.laneOutside = 0;
  if (fit && net.graph) {
    const { paintedLaneCentre } = await import("../../../viewer/streets/lineFit.js");
    const byId = new Map(net.roads.map((r) => [r.id, r]));
    for (const p of net.graph.paths) {
      if (p.kind !== "lane") continue;
      const rr = byId.get(p.roadId); if (!rr || !fit.fitOf.has(net.roads.indexOf(rr))) continue;
      const P = p.pts.map((q) => [q[0] ?? q.x, q[1] ?? q.z]), c = [0];
      for (let k = 1; k < P.length; k++) c.push(c[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
      const L = c[c.length - 1];
      for (let k = 0; k < P.length; k++) {
        if (c[k] < 12 || L - c[k] < 12) continue;
        const [x, z] = P[k];
        if (!inB(x, z) || !MARKABLE.has(classAt(x, z))) continue;
        const q = paintedLaneCentre(net, fit, rr, x, z);
        if (!q || !["driving", "bus", "turn"].includes(q.type)) { out.laneOutside++; continue; }
        // (where the painted lane itself is not clear carriageway across its width (a junction funnel the fit does not
        // follow, its lines clipped there; a refuge island in it) the lane keeps to the street, not to the paint: apart)
        if (!q.edges.every(([ex, ez]) => MARKABLE.has(classAt(ex, ez)))) { out.laneOffPaint = (out.laneOffPaint || 0) + 1; continue; }
        // (a painted lane narrower than a car + 0.35 m a side (2.5 m): the lane keeps the car 1 m off the kerb instead)
        if (q.width < 2.5) { out.laneNarrow = (out.laneNarrow || 0) + 1; continue; }
        out.laneHist[Math.min(300, Math.round(Math.abs(q.off) * 100))]++;
      }
    }
  }
}
console.log(JSON.stringify(out));
