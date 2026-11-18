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
//   node --import ./tools/road_audit/register.mjs tools/audit/census/markings.mjs [--all | T ...] [--out FILE]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, at, ROOT, SC, CLASS_NAME } from "./lib_street.mjs";

const { CHILD, TILES, OUT, JOBS, WORST } = cli();
const MARKABLE = new Set([SC.roadway, SC.tramRoad, SC.parking]);
const KERB_D = 0.10, SKEW = 12, NEAR_KERB = 4, JUNCTION_R = 15;

if (!CHILD) {
  if (!TILES.length) { console.error("usage: markings.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS });
  const sum = { tiles: 0, strokeM: 0, unmeasuredM: 0, offStreetM: 0, atKerbM: 0, skewM: 0, runs: 0, decalTris: 0, decalOff: 0 }, runs = [];
  for (const r of res) {
    if (r.error) continue;
    sum.tiles++; for (const k of Object.keys(sum)) if (k !== "tiles" && k !== "runs") sum[k] += r[k] || 0;
    sum.runs += r.runs.length;
    for (const x of r.runs) runs.push({ tile: r.tile, ...x });
  }
  for (const k of ["strokeM", "unmeasuredM", "offStreetM", "atKerbM", "skewM"]) sum[k] = Math.round(sum[k]);
  runs.sort((a, b) => b.len - a.len);
  const byWhy = {}; for (const x of runs) for (const w of x.why.split("/")) byWhy[w] = (byWhy[w] || 0) + 1;
  console.log(`class F: ${JSON.stringify(sum)}\n  runs by why: ${JSON.stringify(byWhy)}`);
  console.log(`worst ${WORST}:`);
  for (const x of runs.slice(0, WORST)) console.log(`  ${x.tile} ${JSON.stringify(x)}`);
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), sum, byWhy, runs }, null, 1));
  process.exit(0);
}

const T = TILES[0];
const S = await streetTile(T);
const { rd, fit, classAt, inB, nameAt, roads } = S;
const out = { tile: T, strokeM: 0, unmeasuredM: 0, offStreetM: 0, atKerbM: 0, skewM: 0, decalTris: 0, decalOff: 0, runs: [] };
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
        const a = v[q], b = v[(q + 1) % 3], ta = UV[a * 2 + 1] - lt, tb = UV[b * 2 + 1] - lt;
        if ((ta <= 0) !== (tb <= 0) && ta !== tb) { const f = ta / (ta - tb); pts.push([P[a * 3] + (P[b * 3] - P[a * 3]) * f, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * f]); }
      }
      if (pts.length < 2) continue;
      const [p, q] = pts, L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue;
      const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
      for (let d = 0; d <= L; d += 0.5) {
        const x = p[0] + ux * d, z = p[1] + uz * d, key = `${kind}${Math.round(x)},${Math.round(z)},${Math.round(lt * 2)}`;
        if (!inB(x, z) || seen.has(key)) continue; seen.add(key);
        samples.push({ x, z, ux, uz, kind });
      }
    }
  }
  out.strokeM = samples.length;
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
    if (why.length) flagged.push({ ...s, why });
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
if (process.env.CENSUS_DBG) console.error(JSON.stringify(globalThis.H));
console.log(JSON.stringify(out));
