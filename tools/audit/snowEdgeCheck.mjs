// THE SNOW LAYER'S EDGES (claude/snowfix, rules overhead-fill-bounded, snow-edge-sdf, snow-thin-ledge, wx-bake-drawn-only):
// gate row `snowedge`. Node only: the overhead bake's shape pass (viewer/weather/overheadShape.js, the same code the
// worker runs) on synthetic readbacks, and the snow layer's cut evaluated the way its shaders do.
//   node tools/audit/snowEdgeCheck.mjs [--quiet] [--old]
//   --old: the shape pass and the cut as before the fix (fillOld / sdfOld, the vertex-flag cut): the row must FAIL
// Checks (each one the measurable form of a 2026-11-27 snow-day defect, xmascheck):
//   fill      a sparse pass (roads) is never flooded: no "road" cell farther than 2 cells from a road texel
//             (Place Saint-Job: a polygonal patch of bare setts, 16.8 k cells of a 64 m window flooded)
//   stairs    the cut edge round a road patch at 8 angles, sampled along the true edge every 1 cm: its largest
//             deviation from the straight line (the stair-step detector); the old cut: the 25 cm triangles' saw-teeth
//   foot      a wall's foot is not cut (the snow runs on into the wall: no 12.5 cm teeth along facades)
//   ledge     a raised coping 0.3 m wide at 8 angles keeps no layer cell (its cap carries it: no thin zigzag strip);
//             a raised 2 m platform and the ground keep theirs (never over-cut)
//   sources   the bake marks only what the camera draws (cityWeather mark: the pond's reflection trees on layer 9
//             gave the police yard's young trees white domes + bare rings), the props / lamp extras as shelter
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), OLD = process.argv.includes("--old");
globalThis.location ??= { search: "" };
const { computeOverheadShape } = await import(pathToFileURL(path.join(ROOT, "viewer/weather/overheadShape.js")).href);
let fails = 0;
const out = (ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };

const N = 192, CELL = 0.125, O = [0, 0];
/** a readback (y + 1000, x + 1, z + 1, alpha) from height(x, z) (null = nothing), 2 x 2 texels per cell (as the bake's
 *  rounding: each texel at its own world x / z) */
function readback(height) {
  const px = new Float32Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * CELL, z = (j + 0.5) * CELL, h = height(x, z), k = (j * N + i) * 4;
    if (h == null) continue;
    px[k] = h + 1000; px[k + 1] = x + 1; px[k + 2] = z + 1; px[k + 3] = 1;
  }
  return px;
}
const shape = (solid, road = () => null, canopy = () => null, fillOld = OLD) => computeOverheadShape({ solidPx: readback(solid), canopyPx: readback(canopy), roadPx: readback(road), res: N, cell: CELL, origin: O, fillOld, sdfOld: OLD });
const C = N * CELL / 2;
const rot = (x, z, a) => { const c = Math.cos(a), s = Math.sin(a); return [(x - C) * c + (z - C) * s, -(x - C) * s + (z - C) * c]; };

// ---- fill: a road along the top-left edge only, flat ground everywhere
{
  const r = shape(() => 10, (x, z) => (x < 3 && z < 3 ? 10 : null));
  let far = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (r.road[j * N + i] && ((i + 0.5) * CELL > 3 + 2.5 * CELL || (j + 0.5) * CELL > 3 + 2.5 * CELL)) far++;
  out(far === 0, `fill: a 3 x 3 m road in a corner of a flat ${N * CELL} m window: ${far} "road" cells beyond 2 cells of it${OLD ? " (OLD fill)" : ""}`);
}

// ---- stairs: a road band (salted: cut) crossing flat ground at an angle; the cut edge sampled along the true line
const bil = (A, x, z) => {   // bilinear at a world xz over cell centres (the texture's filtering)
  const u = x / CELL - 0.5, v = z / CELL - 0.5, i = Math.max(0, Math.min(N - 2, Math.floor(u))), j = Math.max(0, Math.min(N - 2, Math.floor(v))), fu = u - i, fv = v - j;
  return (A[j * N + i] * (1 - fu) + A[j * N + i + 1] * fu) * (1 - fv) + (A[(j + 1) * N + i] * (1 - fu) + A[(j + 1) * N + i + 1] * fu) * fv;
};
/** the old cut: a soft hide flag per vertex on a `stride`-cell grid, interpolated over its triangles, cut at 0.42 */
function oldFlag(hidden, stride) {
  const hid = (i, j) => hidden[Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i))];
  return (x, z) => {
    const s = stride * CELL, u = x / s - 0.5 / stride, v = z / s - 0.5 / stride, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const f = (a, b) => { const I = a * stride, J = b * stride, h = hid(I, J); return Math.max(h, (2 * h + hid(I - 1, J) + hid(I + 1, J) + hid(I, J - 1) + hid(I, J + 1)) / 6); };
    // PlaneGeometry's split: (a, c, b) and (b, c, d) with a = (i, j), b = (i + 1, j), c = (i, j + 1), d = (i + 1, j + 1)
    if (fu + fv <= 1) return f(i, j) + (f(i + 1, j) - f(i, j)) * fu + (f(i, j + 1) - f(i, j)) * fv;
    return f(i + 1, j + 1) + (f(i, j + 1) - f(i + 1, j + 1)) * (1 - fu) + (f(i + 1, j) - f(i + 1, j + 1)) * (1 - fv);
  };
}
let worst = 0;
for (const deg of [3, 8, 14, 22, 30, 37, 45, 60]) {
  const a = deg * Math.PI / 180;
  const r = shape(() => 10, (x, z) => (rot(x, z, a)[1] > 0.37 ? 10 : null), () => null, false);   // (the fill: its own check)
  // the kept side: z' < 0.37 (the line z' = 0.37 in the rotated frame); march along it, find the cut across it
  const cutAt = OLD ? ((f) => (x, z) => 0.42 - f(x, z))(oldFlag(r.road, 2)) : (x, z) => bil(r.sdB, x, z);
  const offs = [];
  for (let t = -6; t <= 6; t += 0.01) {
    const c = Math.cos(a), s = Math.sin(a);
    // the point on the line at t, then search across it (dz' in -0.4 .. 0.4) for the sign change
    let prev = null, found = null;
    for (let d = -0.4; d <= 0.4; d += 0.0025) {
      const xr = t, zr = 0.37 + d, x = C + xr * c - zr * s, z = C + xr * s + zr * c;
      const v = cutAt(x, z) >= 0;
      if (prev !== null && v !== prev) { found = d; break; }
      prev = v;
    }
    if (found !== null) offs.push(found);
  }
  // a saw-tooth = the edge off its own 1 m running mean (a long, gentle wave of a raster at 3 deg is no stair-step)
  const mean = offs.reduce((p, q) => p + q, 0) / Math.max(1, offs.length);
  let dev = offs.length > 200 ? 0 : 1;
  for (let k = 50; k < offs.length - 50; k++) { let m = 0; for (let q = k - 50; q <= k + 50; q++) m += offs[q]; dev = Math.max(dev, Math.abs(offs[k] - m / 101)); }
  worst = Math.max(worst, dev);
  if (!QUIET) console.log(`  stairs ${deg} deg: ${offs.length} samples, edge ${(mean * 100).toFixed(1)} cm off the line, largest step off its 1 m mean ${(dev * 100).toFixed(1)} cm`);
}
out(worst < 0.025, `stairs: the cut edge round a salted road patch at 8 angles stays within ${(worst * 100).toFixed(1)} cm of its own 1 m running mean (< 2.5 cm: no stair-steps; the old vertex flag on the outer chunks' 25 cm triangles: ~5 cm)${OLD ? " (OLD cut)" : ""}`);

// ---- kerbs: a 13 cm kerb at 8 angles: its drop edge stays cut all along (the blur never closes a thin cut)
{
  let broken = 0, samples = 0;
  for (const deg of [0, 5, 12, 20, 27, 35, 41, 45]) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const r = shape((x, z) => (rot(x, z, a)[1] > 0 ? 10.13 : 10));
    for (let t = -8; t <= 8; t += 0.05) {
      let m = Infinity;
      for (let d = -0.2; d <= 0.2; d += 0.01) { const x = C + t * c - d * s, z = C + t * s + d * c; m = Math.min(m, bil(r.sdA, x, z)); }
      samples++; if (!(m < 0)) broken++;
    }
  }
  out(broken === 0, `kerbs: a 13 cm kerb at 8 angles: its cut is open at ${broken} / ${samples} points along it (0: the snow layer never bridges a kerb)`);
}

// ---- foot: a 6 m tall block (x > C), ground 10 m
{
  const r = shape((x) => (x > C + 0.3 ? 16 : 10));
  let footCut = 0, foot = 0;
  for (let j = 4; j < N - 4; j++) for (let i = 0; i < N; i++) {
    const o = j * N + i, x = (i + 0.5) * CELL;
    if (x < C + 0.3 && x > C + 0.3 - CELL) { foot++; if (r.cut[o]) footCut++; }
  }
  out(foot > 0 && footCut === 0, `foot: ${footCut} / ${foot} wall-foot cells cut (the snow runs on into the wall)${OLD ? " (OLD)" : ""}`);
}

// ---- ledge: a 1 m garden wall with a 0.3 m coping at 8 angles; a 2 m wide raised platform
for (const [w, label, want] of [[0.3, "coping 0.3 m", 0], [0.42, "coping 0.42 m", 0], [2.0, "platform 2 m", 1]]) {
  let kept = 0, total = 0, groundCut = 0;
  for (const deg of [0, 7, 15, 23, 30, 38, 45, 52]) {
    const a = deg * Math.PI / 180;
    const r = shape((x, z) => (Math.abs(rot(x, z, a)[1]) < w / 2 && Math.abs(rot(x, z, a)[0]) < 8 ? 11 : 10));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = j * N + i, [u, v] = rot((i + 0.5) * CELL, (j + 0.5) * CELL, a);
      if (Math.abs(v) < w / 2 - 0.07 && Math.abs(u) < 7.5) { total++; if (!r.cut[o]) kept++; }
      if (Math.abs(v) > w / 2 + 0.5 && Math.abs(u) < 7) groundCut += r.cut[o];
    }
  }
  const ok = want ? kept > 0.6 * total && groundCut === 0 : kept === 0 && groundCut === 0;
  out(ok, `ledge: ${label} at 8 angles: ${kept} / ${total} top cells keep the layer${want ? " (should: wide)" : " (its cap carries it)"}, ${groundCut} ground cells cut${OLD ? " (OLD)" : ""}`);
}

// ---- sources: the bake's mark() (cityWeather.js) and the overhead pass
const cw = fs.readFileSync(path.join(ROOT, "viewer/weather/cityWeather.js"), "utf8");
const drawnOk = /const drawn = \(o\) => DRAWN_OLD \|\| \(o\.layers\.mask & ~WX_LAYER_BITS & camMask\) !== 0;/.test(cw) && /if \(!drawn\(o\)\)/.test(cw);
out(!OLD && drawnOk, "sources: mark() bakes only meshes the city camera draws (its layers), ?wxdrawn=old = before");
const furn = (cw.match(/const FURN_RE = qp\.get\("wxprops"\) === "old" \? \/.*?\/\s*\n?\s*: (\/.*\/);/) || [])[1] ?? "";
let re = null; try { re = new Function(`return ${furn}`)(); } catch { /* */ }
const names = ["props-furniture2:bin_round-lod0", "props-streetkit:sign_pole-lod0", "props-mesh:bollards:x-lod0", "lamp-extras-flowers", "lamp-extras-iron", "bollards", "tlights-tl_post:merged(2)", "billboards-frames", "tram-pole-arms", "rail-masts", "embassy-poles", "furniture2-bench_street", "stops-shelter"];
const missed = re ? names.filter((n) => !re.test(n)) : names;
const ground = ["roads-asphalt", "terrain", "buildings-walls", "tram-platforms", "rail-platforms", "gardens-wall:merged(4)", "parked-cars:merged(9)"].filter((n) => re && re.test(n));
out(!OLD && missed.length === 0 && ground.length === 0, `sources: the shelter list (FURN_RE) covers the props / lamp extras / poles (${missed.length ? "missed " + missed.join(", ") : "all " + names.length}) and no ground (${ground.join(", ") || "none"})`);
const wk = fs.readFileSync(path.join(ROOT, "viewer/weather/overheadWorker.js"), "utf8");
out(/r\.sdA\.buffer/.test(wk) && /r\.cut\.buffer/.test(wk), "sources: the worker hands back the cut and its signed distances");
const sl = fs.readFileSync(path.join(ROOT, "viewer/weather/snowLayer.js"), "utf8");
out(!OLD && /map\.sampleLin\(P\.xz\)/.test(sl) && /SDF_EDGE/.test(sl), "sources: the layer's fragment cuts at the signed distance (?snowsdf=old = the vertex flag)");
const feats = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
for (const k of ["snowsdf", "wxfill", "wxdrawn", "wxprops"]) out(new RegExp(`old\\("${k}"`).test(feats), `features.js: the ${k} row (the dev panel's A/B)`);

if (fails) { console.log(`snowEdgeCheck: ${fails} FAIL`); process.exit(1); }
console.log("snowEdgeCheck: PASS");
