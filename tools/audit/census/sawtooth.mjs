// CENSUS saw-tooth (claude/sawtooth 2026-11-26, rule no-sawtooth-surfaces). Owner: "the street that goes up with the
// tram around the Saint-Job church: the sidewalk has bumps like a SAW TOOTH ... that never happens in real life".
//
// Every tile is built by the tile worker's own code in node (viewer/tileData.js buildTileData, lib_mesh.mjs buildTile),
// then the DRAWN ground (the top of the street parts asphalt / concrete / square / pits, else the drawn terrain grid as
// tileData.js terrainArrays splits it: whatever shows) is walked along every walkable line at STEP = 0.25 m:
//   kerb      every measured kerb (surfaces.json kerbs) at 0.5 / 1.0 / 1.75 / 2.5 m on its raised side (the sidewalk,
//             island, square) and 0.5 / 1.5 m on its low side (the gutter / carriageway the movers drive)
//   path      every OSM footway / path / cycleway / platform centre line (steps never)
//   road      every OSM road centre line (the engine strips and the squares where UrbIS measures no kerb)
// A walk is cut into RUNS where the profile is not one smooth surface by DATA: no drawn street there, the class raster
// changes (sidewalk -> ramp / pit / road), within 1 m of a dropped kerb (ramp) or a tree pit (a real dip), a sample-to-
// sample jump > JUMP (a real step: kerb, threshold, stair), a turn > 35 degrees within 1 m (a corner), the tile's edge.
// On a run (>= MIN_RUN) the profile is detrended by a local least-squares line over +-DETREND m; the residual's turning
// points are found with a hysteresis of AMP (a swing counts when the residual reverses by >= AMP peak to valley).
// SAW-TOOTH = a chain of >= MIN_SWINGS consecutive swings, each spacing 0.75..12 m, the spacing regular (coefficient of
// variation <= CV): a periodic up-down on a surface whose real profile is a smooth grade. Each chain: its metres, its
// period (2 x the mean spacing), its median swing (cm). Chains of all walks within 6 m of each other are one PLACE.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/sawtooth.mjs [--all | T ...] [--out FILE] [--jobs N]
//        [--old] (?sawtooth=old) [--quiet] [--worst N] [--max places=n,metres=m] [--fixture] (the synthetic profiles)
//        [--map FILE.svg] (a small city map of the places)
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runTiles, cli, ROOT, SC, imp } from "./lib_street.mjs";
import { buildTile, streetAt, allBuiltTiles } from "./lib_mesh.mjs";

export const STEP = 0.25, JUMP = 0.06, MIN_RUN = 8, DETREND = 3, AMP = 0.025, MIN_SWINGS = 5, CV = 0.4, PMIN = 0.75, PMAX = 12;

/** saw-tooth chains in one profile (ys at STEP, NaN = cut): [{ i0, i1, swings, period, amp }] (indices into ys) */
export function sawChains(ys, { amp = AMP, minSwings = MIN_SWINGS } = {}) {
  const out = [], n = ys.length, W = Math.round(DETREND / STEP);
  let a = 0;
  while (a < n) {
    while (a < n && Number.isNaN(ys[a])) a++;
    let b = a; while (b < n && !Number.isNaN(ys[b])) b++;
    if ((b - a) * STEP >= MIN_RUN) runChains(ys, a, b, W, amp, minSwings, out);
    a = b;
  }
  return out;
}
function runChains(ys, a, b, W, amp, minSwings, out) {
  // residual against the local least-squares line (window clipped to the run)
  const r = new Float64Array(b - a);
  for (let i = a; i < b; i++) {
    const j0 = Math.max(a, i - W), j1 = Math.min(b - 1, i + W);
    let c = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let j = j0; j <= j1; j++) { const x = j - i, y = ys[j]; c++; sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const den = c * sxx - sx * sx, m = den > 1e-9 ? (c * sxy - sx * sy) / den : 0;
    r[i - a] = ys[i] - (sy - m * sx) / c;
  }
  // turning points with hysteresis
  const ext = []; let dir = 0, hi = 0, lo = 0, cand = 0;
  for (let k = 1; k < r.length; k++) {
    const v = r[k];
    if (dir === 0) {
      if (v > r[hi]) hi = k; if (v < r[lo]) lo = k;
      if (r[hi] - v >= amp) { ext.push(hi); dir = -1; cand = k; } else if (v - r[lo] >= amp) { ext.push(lo); dir = 1; cand = k; }
      continue;
    }
    if (dir > 0) { if (v > r[cand]) cand = k; else if (r[cand] - v >= amp) { ext.push(cand); dir = -1; cand = k; } }
    else { if (v < r[cand]) cand = k; else if (v - r[cand] >= amp) { ext.push(cand); dir = 1; cand = k; } }
  }
  // chains of regular CYCLES: the spacing of every other turning point (peak to peak, valley to valley) PMIN..PMAX and
  // regular (CV); a saw-tooth's rise and drop may differ (a long ramp, a short fall), its cycle does not
  let s = 0;
  const close = (e) => {            // ext[s..e] (inclusive) is a candidate chain
    const sw = e - s; if (sw < minSwings) return;
    const cyc = []; for (let k = s + 2; k <= e; k++) cyc.push((ext[k] - ext[k - 2]) * STEP);
    const mean = cyc.reduce((p, q) => p + q, 0) / cyc.length, sd = Math.sqrt(cyc.reduce((p, q) => p + (q - mean) ** 2, 0) / cyc.length);
    if (sd / mean > CV) return;
    const sws = []; for (let k = s + 1; k <= e; k++) sws.push(Math.abs(r[ext[k]] - r[ext[k - 1]]));
    sws.sort((p, q) => p - q);
    out.push({ i0: a + ext[s], i1: a + ext[e], swings: sw, period: mean, amp: sws[sws.length >> 1] });
  };
  for (let k = 2; k <= ext.length; k++) {
    const g = k < ext.length ? (ext[k] - ext[k - 2]) * STEP : -1;
    if (k === ext.length || g < PMIN || g > PMAX) { close(k - 1); s = k - 1; }
  }
}

// ------------------------------------------------------------------------------------------------ the fixture
/** synthetic profiles: a smooth 8 % grade with a vertical curve (0), the same + a 6 m saw-tooth of 3 cm (> 0), a grade
 *  with one real 12 cm step and dropped-kerb dip (0, cut by the jump), noise of 5 mm (0) */
export function fixture() {
  const N = 400, xs = Array.from({ length: N }, (_, i) => i * STEP);
  const grade = xs.map((x) => 70 + 0.08 * x + 0.0008 * (x - 50) ** 2);
  const saw = grade.map((y, i) => { const f = (xs[i] / 6) % 1; return y + 0.03 * (f < 5 / 6 ? f * 6 / 5 : (1 - f) * 6); });   // up 5 m, down 1 m, 3 cm
  const step = grade.map((y, i) => y + (xs[i] > 40 ? 0.12 : 0));
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  const noise = grade.map((y) => y + 0.005 * rnd());
  return { smooth: sawChains(grade).length, saw: sawChains(saw).length, step: sawChains(step).length, noise: sawChains(noise).length };
}

// ------------------------------------------------------------------------------------------------ parent
const c = cli();
const { CHILD, OUT, JOBS, WORST } = c;
const OLD = c.flag("--old"), QUIET = c.flag("--quiet"), MAX = c.opt("--max", null), FIX = c.flag("--fixture"), MAP = c.opt("--map", null);
const TILES = c.ALL ? allBuiltTiles() : c.argv.filter((a) => /^[A-Z]\d+$/i.test(a)).map((t) => t.toUpperCase());
const isMain = /sawtooth.mjs$/.test(process.argv[1] || "");

if (isMain && FIX) {
  const f = fixture(); console.log("fixture", JSON.stringify(f));
  process.exit(f.smooth === 0 && f.saw > 0 && f.step === 0 && f.noise === 0 ? 0 : 1);
}
if (isMain && !CHILD) {
  if (!TILES.length) { console.error("usage: sawtooth.mjs [--all | T ...] [--out FILE] [--old] [--max places=n,metres=m]"); process.exit(2); }
  const fx = fixture();
  if (!(fx.smooth === 0 && fx.saw > 0 && fx.step === 0 && fx.noise === 0)) { console.log(`FAIL fixture ${JSON.stringify(fx)}`); process.exit(1); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS ?? 3, extra: OLD ? ["--old"] : [], log: !QUIET });
  const sum = { places: 0, metres: 0, chains: 0, walkedKm: 0 }, items = [], byKind = {};
  let errors = 0;
  for (const r of res) {
    if (r.error) { errors++; continue; }
    sum.places += r.sum.places; sum.metres += r.sum.metres; sum.chains += r.sum.chains; sum.walkedKm += r.sum.walkedKm;
    for (const it of r.items) { items.push({ tile: r.tile, ...it }); byKind[it.surface] = (byKind[it.surface] || 0) + 1; }
  }
  sum.metres = Math.round(sum.metres); sum.walkedKm = Math.round(sum.walkedKm);
  items.sort((a, b) => b.score - a.score);
  console.log(`saw-tooth${OLD ? " (?sawtooth=old)" : ""}, ${res.length - errors} tiles: ${JSON.stringify(sum)} by surface ${JSON.stringify(byKind)}`);
  if (!QUIET) for (const it of items.slice(0, WORST)) console.log(`  ${JSON.stringify(it)}`);
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, byKind, tiles: res.map((r) => ({ tile: r.tile, sum: r.sum })), items }, null, 1));
  if (MAP) writeFileSync(join(ROOT, MAP), mapSvg(items));
  let fail = errors > 0;
  if (errors) console.log(`FAIL ${errors} tile(s) did not build`);
  if (MAX) for (const kv of MAX.split(",")) {
    const [k, v] = kv.split("="), n = sum[k];
    if (n > +v) { fail = true; console.log(`FAIL ${k}: ${n} > ceiling ${v}`); } else console.log(`ok ${k}: ${n} <= ${v}`);
  }
  process.exit(fail ? 1 : 0);
}

function mapSvg(items) {
  const W = 600, x0 = -3000, x1 = 3000, z0 = -2000, z1 = 4000, s = W / (x1 - x0);
  const dots = items.map((it) => { const [x, z] = it.at.split(",").map(Number); return `<circle cx="${((x - x0) * s).toFixed(1)}" cy="${((z - z0) * s).toFixed(1)}" r="${Math.min(8, 1.5 + it.metres / 15).toFixed(1)}" fill="${it.surface === "sidewalk" ? "#d33" : it.surface === "road" ? "#36c" : "#e90"}" fill-opacity="0.6"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" style="background:#f4f2ee"><text x="8" y="16" font-size="12">saw-tooth places (red sidewalk/raised, blue road, orange path/square/ground)</text>${dots.join("")}</svg>`;
}

// ------------------------------------------------------------------------------------------------ child (one tile)
if (isMain && CHILD) {
  const T = TILES[0];
  const { d } = await buildTile(T, OLD ? { sawtooth: false } : {});
  const { streetFit } = await imp("viewer/streets/fitCore.js");
  const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
  const classAt = fit ? fit.classAt : () => -1;
  const b = d.bounds, H = d.hdr, Y = d.y, NC = H.cols, NR = H.rows, st = H.step;
  const terr = (x, z) => {                     // the drawn terrain grid (as ground.mjs OVER)
    const fc = (x - H.x0) / st, fr = (z - H.z0) / st, c0 = Math.floor(fc), r0 = Math.floor(fr);
    if (c0 < 0 || r0 < 0 || c0 >= NC - 1 || r0 >= NR - 1) return NaN;
    const u = fc - c0, v = fr - r0, a = r0 * NC + c0, bb = a + NC, cc = a + 1, dd = bb + 1;
    if (Math.abs(Y[a] - Y[dd]) < Math.abs(Y[bb] - Y[cc]) - 0.01) return u >= v ? Y[a] + u * (Y[cc] - Y[a]) + v * (Y[dd] - Y[cc]) : Y[a] + v * (Y[bb] - Y[a]) + u * (Y[dd] - Y[bb]);
    return u + v <= 1 ? Y[a] + u * (Y[cc] - Y[a]) + v * (Y[bb] - Y[a]) : Y[dd] + (1 - u) * (Y[bb] - Y[dd]) + (1 - v) * (Y[cc] - Y[dd]);
  };
  // the street parts' up-facing triangles in a 2 m grid
  const CELL = 2, grid = new Map(), key = (i, j) => i * 100003 + j, tris = [];
  for (const nm of ["asphalt", "concrete", "square", "pits"]) {
    const P = d.road.parts?.[nm]; if (!P) continue; const pos = P.position, I = P.index;
    for (let t = 0; t < I.length; t += 3) {
      const A = I[t] * 3, B = I[t + 1] * 3, C = I[t + 2] * 3;
      const ax = pos[A], ay = pos[A + 1], az = pos[A + 2], bx = pos[B], by = pos[B + 1], bz = pos[B + 2], cx = pos[C], cy = pos[C + 1], cz = pos[C + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(det) < 1e-10) continue;
      const id = tris.push([ax, ay, az, bx, by, bz, cx, cy, cz, det]) - 1;
      for (let i = Math.floor(Math.min(ax, bx, cx) / CELL); i <= Math.floor(Math.max(ax, bx, cx) / CELL); i++)
        for (let j = Math.floor(Math.min(az, bz, cz) / CELL); j <= Math.floor(Math.max(az, bz, cz) / CELL); j++) { const q = key(i, j); let l = grid.get(q); if (!l) grid.set(q, (l = [])); l.push(id); }
    }
  }
  /** the drawn ground's top at (x, z): { y, street } (street false = the terrain shows), null outside */
  const top = (x, z) => {
    let m = -Infinity;
    for (const id of grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz, det] = tris[id];
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * ay + l2 * by + l3 * cy; if (y > m) m = y;
    }
    const t = terr(x, z);
    if (m === -Infinity) return Number.isNaN(t) ? null : { y: t, street: false };
    return t > m + 0.005 ? { y: t, street: false } : { y: m, street: true };
  };
  const inB = (x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
  const REAL_DIP = new Set([SC.ramp, SC.pit]);
  const nearDip = (x, z) => { for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (REAL_DIP.has(classAt(x + dx, z + dz))) return true; return false; };
  const SURF = (cls, street) => !street ? "ground" : cls === SC.sidewalk || cls === SC.median ? "sidewalk" : cls === SC.square ? "square" : cls === SC.path ? "path" : cls === SC.roadway || cls === SC.tramRoad || cls === SC.parking ? "road" : cls === SC.tramSite ? "tram" : "other";

  const chains = []; let walked = 0;
  const DUMP = process.env.SAW_DUMP ? process.env.SAW_DUMP.split(",").map(Number) : null, dumps = [];   // (debug: the profiles of the chains near x,z,r)
  /** walk the polyline pts offset by `off` (left normal +), want = "street" (only drawn street) | "any" */
  const walk = (pts, off, kind, want) => {
    const S = []; let acc = 0;          // samples every STEP along the whole polyline
    for (let k = 1; k < pts.length; k++) {
      const [ax, az] = pts[k - 1], [bx, bz] = pts[k], len = Math.hypot(bx - ax, bz - az); if (len < 1e-6) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      let s = acc;
      for (; s < len; s += STEP) S.push({ x: ax + ux * s - uz * off, z: az + uz * s + ux * off, ux, uz });
      acc = s - len;
    }
    if (S.length < MIN_RUN / STEP) return;
    const ys = new Float64Array(S.length), cl = new Int8Array(S.length), sf = [];
    for (let i = 0; i < S.length; i++) {
      const p = S[i], t = inB(p.x, p.z) ? top(p.x, p.z) : null, cls = classAt(p.x, p.z);
      cl[i] = cls; sf.push(t ? SURF(cls, t.street) : null);
      ys[i] = !t || (want === "street" && !t.street) || nearDip(p.x, p.z) ? NaN : t.y;
    }
    for (let i = 1; i < S.length; i++) {
      if (Math.abs(ys[i] - ys[i - 1]) > JUMP || cl[i] !== cl[i - 1] || sf[i] !== sf[i - 1]) ys[i] = NaN;
      if (i >= 4) { const a = S[i - 4], q = S[i]; if (a.ux * q.ux + a.uz * q.uz < Math.cos(35 * Math.PI / 180)) ys[i] = NaN; }
    }
    for (const v of ys) if (!Number.isNaN(v)) walked += STEP;
    for (const ch of sawChains(ys)) {
      const m = S[(ch.i0 + ch.i1) >> 1];
      if (DUMP && Math.hypot(m.x - DUMP[0], m.z - DUMP[1]) < DUMP[2]) dumps.push({ kind, off, rows: S.slice(Math.max(0, ch.i0 - 24), ch.i1 + 24).map((q, k) => [+q.x.toFixed(2), +q.z.toFixed(2), +ys[Math.max(0, ch.i0 - 24) + k].toFixed(3), cl[Math.max(0, ch.i0 - 24) + k]]) });
      chains.push({ kind, surface: sf[(ch.i0 + ch.i1) >> 1], x: m.x, z: m.z, x0: S[ch.i0].x, z0: S[ch.i0].z, x1: S[ch.i1].x, z1: S[ch.i1].z, metres: (ch.i1 - ch.i0) * STEP, period: ch.period, amp: ch.amp, swings: ch.swings });
    }
  };
  // kerbs: raised side = the side where the class raster lifts (fitCore lift > 0 at 0.6 m)
  const { RAISE } = await imp("viewer/surfaces.js");
  for (const l of d.road.surfaceData?.kerbs || []) {
    let up = 0;
    for (let k = 1; k < l.length; k++) {
      const [ax, az] = l[k - 1], [bx, bz] = l[k], len = Math.hypot(bx - ax, bz - az); if (len < 1e-6) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, nx = -(bz - az) / len, nz = (bx - ax) / len;
      up += (RAISE[classAt(mx + nx * 0.6, mz + nz * 0.6)] > 0 ? len : 0) - (RAISE[classAt(mx - nx * 0.6, mz - nz * 0.6)] > 0 ? len : 0);
    }
    const sgn = up >= 0 ? 1 : -1;
    for (const o of [0.5, 1.0, 1.75, 2.5]) walk(l, sgn * o, "kerb+", "street");
    for (const o of [0.5, 1.5]) walk(l, -sgn * o, "kerb-", "street");
  }
  for (const f of d.feats?.lines || []) {
    if (!["footway", "path", "cycleway", "platform", "pedestrian", "track", "bridleway"].includes(f.kind) || !(f.line?.length >= 2)) continue;
    walk(f.line, 0, "path", "any");
  }
  {
    const rj = JSON.parse(readFileSync(join(ROOT, "data/tiles", T, "roads.json"), "utf8"));
    const roads = rj?.roads || [];
    const N = new Map((rj?.nodes || []).map((n) => [n.id, n]));
    for (const r of roads) { const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean).map((p) => [p.x ?? p[0], p.z ?? p[1]]); if (pts.length >= 2) walk(pts, 0, "road", "street"); }
  }
  // chains -> places (6 m)
  const used = new Uint8Array(chains.length), items = [];
  for (let i = 0; i < chains.length; i++) {
    if (used[i]) continue; used[i] = 1; const mem = [chains[i]], stack = [i];
    while (stack.length) { const q = chains[stack.pop()]; for (let j = 0; j < chains.length; j++) if (!used[j] && Math.min(Math.hypot(chains[j].x - q.x, chains[j].z - q.z), Math.hypot(chains[j].x0 - q.x, chains[j].z0 - q.z), Math.hypot(chains[j].x1 - q.x, chains[j].z1 - q.z), Math.hypot(chains[j].x - q.x0, chains[j].z - q.z0), Math.hypot(chains[j].x - q.x1, chains[j].z - q.z1)) < 6) { used[j] = 1; mem.push(chains[j]); stack.push(j); } }
    let w = mem[0]; for (const q of mem) if (q.metres * q.amp > w.metres * w.amp) w = q;
    const metres = Math.max(...mem.map((q) => q.metres));
    items.push({ surface: w.surface, kind: w.kind, metres: +metres.toFixed(1), period: +w.period.toFixed(1), ampCm: +(w.amp * 100).toFixed(1), swings: w.swings, walks: mem.length, score: +(metres * w.amp * 100).toFixed(1), at: `${w.x.toFixed(1)}, ${w.z.toFixed(1)}`, from: `${w.x0.toFixed(1)}, ${w.z0.toFixed(1)}`, to: `${w.x1.toFixed(1)}, ${w.z1.toFixed(1)}`, street: streetAt(T, w.x, w.z) });
  }
  const sum = { places: items.length, metres: items.reduce((s, q) => s + q.metres, 0), chains: chains.length, walkedKm: walked / 1000 };
  if (DUMP) writeFileSync(join(ROOT, ".st", "dump.json"), JSON.stringify(dumps));
  console.log(JSON.stringify({ tile: T, sum, items }));
}
