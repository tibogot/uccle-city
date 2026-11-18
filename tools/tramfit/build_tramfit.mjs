// THE TRAM TRACKS FITTED TO THE MEASURED STREET (claude/tramfit, CENSUS class E, quality rule 32 provisional).
//
//   node --import ./tools/road_audit/register.mjs tools/tramfit/build_tramfit.mjs [--jobs N]
//     -> data/tramfit/<T>.json (the fitted tram lines of tile T) + data/tramfit/summary.json
//
// Why: the rails were drawn along the OSM tram ways as they are (viewer/track.js smoothPolyline only rounds them), and
// nothing held them to the measured street: OSM puts a track up to ~1 m off (Av. Churchill: the two tracks 3.7 m apart
// on a 4.7 m UrbIS tram site; Ch. d'Alsemberg: a track 0.3 m from the kerb of the tram road), so a rail ran under the
// kerb and climbed onto the sidewalk / median (main.js featureObjects: rail top = max(drawn surface, profile)):
// 48 runs, 421 m of rail on raised paving + 152 m in the kerb line (owner playtest 2026-11-18, image 92).
// What: the OSM tram ways of every tile chained into strands (as tools/build_tram_profile.mjs: through degree-2 nodes,
// across tile seams), smoothed ONCE for the whole way (no kink at a tile seam), sampled every 0.5 m. At each sample,
// along its normal, the offsets where both rails (+-RAIL_C) are clear of the DRAWN street's raised classes (the runtime
// class raster: sidewalk, median, square, path, ramp, tree pit) and at least KERB_CLEAR from every drawn kerb line:
// the admissible interval (the one holding the OSM line, else the nearest within REACH; none within REACH, or a kerb
// running > CROSS_DEG to the track: it really crosses the paving there, a site entrance / a terminus loop, and is left
// alone). The OSM tram platforms are NOT a constraint (tram.js draws a 2.6 m band centred on an OSM line that is often
// the platform's edge: 713 m of rail already lie under one, see the summary; the platforms should follow the tracks). A lateral offset o(s) per sample is then found by projection sweeps (the convex
// constraints, from o = 0: the smallest smooth move):
//   - o inside the admissible interval;
//   - two parallel tracks never closer than min(their OSM spacing, SPACING) centre to centre;
//   - |o'| <= SLOPE and |o''| <= 1 / R_ADD (an S-shift of 1 m takes ~2 sqrt(R_ADD) = 35 m; the track's own bends stay
//     within ~1 / R_ADD of the OSM curvature: the 18-25 m radii of the Brussels network survive, see the summary);
//   - a strand end at a switch moves with the track it branches off (tied); a bridge span (OSM bridge=yes: the raster
//     there is the ground under it) only follows its approaches (tram.js builds its deck from these tracks).
// Everything that reads the tram ways reads the fitted ones (viewer/tileData.js: rails, wire + poles, platforms' sides,
// the bridge deck, the trams' GTFS snap, the parking / street-prop keep-clear). ?tramfit=old = the OSM ways as before.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const TMP = join(os.tmpdir(), "uccle-tramfit");

export const RAIL_C = 1.435 / 2 + 0.036;   // rail centre line from the track centre (tools/audit/census/tramRails.mjs)
export const KERB_CLEAR = 0.2;             // m: a rail centre this far from a drawn kerb at least (the census flags < 0.15)
export const SPACING = 2.75;               // m: two tracks' centres at least this far apart (or their OSM spacing if less)
export const R_ADD = 300, SLOPE = 0.05;    // the fit's own curvature / slope limits
const STEP = 0.5, SCAN = 4, DS = 0.05, REACH = 2.5, TIE = 0.6, CROSS_R = 3, CROSS_DEG = 20;
const RAISED = new Set([4, 5, 6, 7, 8, 9]);   // viewer/surfaces.js SURF_CLASS: square, sidewalk, median, path, ramp, pit

// ---------------------------------------------------------------- child: one tile's drawn street (class raster, kerbs)
if (argv[0] === "--dump") {
  const T = argv[1];
  const { loadTile } = await imp("tools/road_audit/tile.mjs");
  const realLog = console.log; console.log = () => {};
  let t; try { t = loadTile(T); } finally { console.log = realLog; }
  const s = t.rd.surfaceData;
  if (s) {
    writeFileSync(join(TMP, `${T}.bin`), s.grid.data);
    writeFileSync(join(TMP, `${T}.json`), JSON.stringify({ x0: s.grid.x0, z0: s.grid.z0, step: s.grid.step, nx: s.grid.nx, nz: s.grid.nz, kerbs: s.kerbs || [] }));
  }
  console.log(JSON.stringify({ tile: T, surface: !!s }));
  process.exit(0);
}

// ---------------------------------------------------------------- the tram ways of every tile
const TILES = join(ROOT, "data/tiles");
const manifest = JSON.parse(readFileSync(join(TILES, "manifest.json"), "utf8"));
const tileList = manifest.tiles.filter((t) => t.status !== "missing");
const bounds = new Map(tileList.map((t) => [t.name, { x0: t.bounds.x[0], x1: t.bounds.x[1], z0: t.bounds.z[0], z1: t.bounds.z[1] }]));
const { smoothPolyline, trackSig } = await imp("viewer/track.js");
const pieces = new Map(), platforms = [], rawSig = new Map();
for (const { name } of tileList) {
  const fp = join(TILES, name, "features.json");
  if (!existsSync(fp)) continue;
  const f = JSON.parse(readFileSync(fp, "utf8"));
  for (const l of f.lines || []) {
    if (l.kind === "tram") {
      if (!pieces.has(l.id)) pieces.set(l.id, { tags: l.tags || {}, parts: [] });
      pieces.get(l.id).parts.push(l.line);
    } else if (l.kind === "platform" && l.tags?.tram === "yes" && l.line?.length >= 2) platforms.push(l.line);
  }
  const sig = trackSig(f.lines || []);
  if (sig) rawSig.set(name, sig);
}
const K = (p) => `${Math.round(p[0] * 20)},${Math.round(p[1] * 20)}`;       // 5 cm node key
/** chain polylines that share end points through nodes of degree 2 (tools/build_tram_profile.mjs) -> [{ pts, src }] */
function chain(lines) {
  const ends = new Map(), used = new Array(lines.length).fill(false), out = [];
  lines.forEach((l, i) => { for (const e of [K(l[0]), K(l[l.length - 1])]) { if (!ends.has(e)) ends.set(e, []); ends.get(e).push(i); } });
  const deg = (k) => (ends.get(k) || []).length;
  const grow = (seq, atEnd) => {
    for (;;) {
      const tip = atEnd ? seq.pts[seq.pts.length - 1] : seq.pts[0], k = K(tip);
      if (deg(k) !== 2) return;
      const nx = ends.get(k).find((j) => !used[j]);
      if (nx === undefined) return;
      used[nx] = true;
      const l = lines[nx].map((p) => p.slice());
      const fwd = K(l[0]) === k;
      if (atEnd) { if (!fwd) l.reverse(); seq.pts.push(...l.slice(1)); seq.src.push(...l.slice(1).map(() => nx)); }
      else { if (fwd) l.reverse(); seq.pts.unshift(...l.slice(0, -1)); seq.src.unshift(...l.slice(0, -1).map(() => nx)); }
    }
  };
  for (let i = 0; i < lines.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const seq = { pts: lines[i].map((p) => p.slice()), src: lines[i].map(() => i) };
    grow(seq, true); grow(seq, false);
    out.push(seq);
  }
  return out;
}
const ways = [];
for (const [id, w] of pieces) for (const c of chain(w.parts)) {
  ways.push({ id, tags: w.tags, fixed: w.tags.bridge === "yes" || w.tags.tunnel === "yes", pts: smoothPolyline(c.pts) });
}
const strandsRaw = chain(ways.map((w) => w.pts));

// ---------------------------------------------------------------- the drawn street of every tile near a track
const near = new Set();
for (const w of ways) for (const [x, z] of w.pts) for (const [n, b] of bounds) if (x >= b.x0 - SCAN - 2 && x <= b.x1 + SCAN + 2 && z >= b.z0 - SCAN - 2 && z <= b.z1 + SCAN + 2) near.add(n);
const REUSE = argv.includes("--reuse") && existsSync(TMP);    // (development: the dumps of the last run)
if (!REUSE) { rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true }); }
if (!REUSE) {
  const queue = [...near].sort(), jobs = +opt("--jobs", 0) || Math.max(1, Math.min(6, os.cpus().length - 2)), t0 = Date.now();
  let done = 0;
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--max-old-space-size=3072", "--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--dump", T], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (b) => { err += b; });
    p.on("close", (code) => { if (code) console.error(`${T}: exit ${code} ${err.trim().split("\n").slice(-2).join(" / ")}`); done++; process.stderr.write(`\rstreets ${done}/${near.size} ${((Date.now() - t0) / 1000).toFixed(0)} s  `); ok(); });
  });
  await Promise.all(Array.from({ length: jobs }, async () => { while (queue.length) await run(queue.shift()); }));
  process.stderr.write("\n");
}
const grids = new Map();
for (const T of near) {
  if (!existsSync(join(TMP, `${T}.json`))) continue;
  const g = JSON.parse(readFileSync(join(TMP, `${T}.json`), "utf8"));
  g.data = new Uint8Array(readFileSync(join(TMP, `${T}.bin`)));
  grids.set(T, g);
}
const tileOf = (x, z) => { for (const [n, b] of bounds) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) return n; return null; };
const classAt = (x, z) => {
  const g = grids.get(tileOf(x, z));
  if (!g) return -1;
  const i = Math.floor((x - g.x0) / g.step), j = Math.floor((z - g.z0) / g.step);
  return i >= 0 && j >= 0 && i < g.nx && j < g.nz ? g.data[j * g.nx + i] - 1 : -1;
};
// kerb segments (every tile's drawn kerbs) + the OSM tram platforms (tram.js: an area ring, else a 2.6 m band)
const SEG = new Map(), skey = (i, j) => i * 100003 + j;
const addSeg = (map, s, pad = 0) => {
  for (let i = Math.floor((Math.min(s[0], s[2]) - pad) / 8); i <= Math.floor((Math.max(s[0], s[2]) + pad) / 8); i++)
    for (let j = Math.floor((Math.min(s[1], s[3]) - pad) / 8); j <= Math.floor((Math.max(s[1], s[3]) + pad) / 8); j++) { const q = skey(i, j); if (!map.has(q)) map.set(q, []); map.get(q).push(s); }
};
for (const g of grids.values()) for (const l of g.kerbs) for (let k = 1; k < l.length; k++) addSeg(SEG, [l[k - 1][0], l[k - 1][1], l[k][0], l[k][1]]);
const kerbDist = (x, z, r) => {
  let bd = r * r;
  const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8), n = Math.ceil(r / 8);
  for (let di = -n; di <= n; di++) for (let dj = -n; dj <= n; dj++) for (const [ax, az, bx, bz] of SEG.get(skey(i0 + di, j0 + dj)) || []) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    bd = Math.min(bd, (x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2);
  }
  return Math.sqrt(bd);
};
/** the tangent of the nearest kerb within r: [tx, tz] or null */
const kerbDir = (x, z, r) => {
  let bd = r * r, best = null;
  const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8), n = Math.ceil(r / 8);
  for (let di = -n; di <= n; di++) for (let dj = -n; dj <= n; dj++) for (const [ax, az, bx, bz] of SEG.get(skey(i0 + di, j0 + dj)) || []) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d2 = (x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2;
    if (d2 < bd) { bd = d2; const L = Math.sqrt(l2); best = [dx / L, dz / L]; }
  }
  return best;
};
const PLAT = new Map(), platW = 2.6 / 2;
const platRings = [];
for (const L of platforms) {
  const a = L[0], b = L[L.length - 1];
  if (L.length >= 4 && Math.hypot(a[0] - b[0], a[1] - b[1]) <= 0.01) {
    const ring = L.slice(0, -1), id = platRings.push(ring) - 1;
    for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; addSeg(PLAT, [p[0], p[1], q[0], q[1], id]); }
  } else for (let k = 1; k < L.length; k++) addSeg(PLAT, [L[k - 1][0], L[k - 1][1], L[k][0], L[k][1], -1], platW);
}
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const onPlatform = (x, z) => {
  for (const [ax, az, bx, bz, id] of PLAT.get(skey(Math.floor(x / 8), Math.floor(z / 8))) || []) {
    if (id >= 0) { if (inRing(platRings[id], x, z)) return true; continue; }
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-12, t = ((x - ax) * dx + (z - az) * dz) / l2;
    if (t < 0 || t > 1) continue;
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < platW) return true;
  }
  return false;
};

// ---------------------------------------------------------------- strands -> samples every STEP m
const X = [], Z = [], NX = [], NZ = [], TX = [], TZ = [], WAY = [], LO = [], HI = [], FIX = [], strandOf = [], first = [], count = [];
for (const st of strandsRaw) {
  const pts = st.pts, src = st.src, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.ceil(L / STEP) + 1), s0 = X.length;
  first.push(s0); count.push(n);
  for (let k = 0, j = 0; k < n; k++) {
    const s = L * k / (n - 1);
    while (j < pts.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    X.push(pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f); Z.push(pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f);
    WAY.push(src[j + 1]); strandOf.push(first.length - 1);
  }
  for (let k = 0; k < n; k++) {
    const a = s0 + Math.max(0, k - 1), b = s0 + Math.min(n - 1, k + 1), dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz) || 1;
    TX.push(dx / l); TZ.push(dz / l); NX.push(-dz / l); NZ.push(dx / l);
  }
}
const N = X.length;
console.log(`${ways.length} ways, ${first.length} strands, ${N} samples (${(N * STEP / 1000).toFixed(1)} km), ${grids.size} street tiles, ${platforms.length} platforms`);

// ---------------------------------------------------------------- the admissible offsets of every sample
const NS = Math.round(SCAN / DS), W = Math.round(RAIL_C / DS);
const stats = { samples: N, constrained: 0, off: 0, noFit: 0, crossing: 0, fixed: 0 };
const bad = new Uint8Array(2 * NS + 1), pre = new Int32Array(2 * NS + 2);
for (let i = 0; i < N; i++) {
  LO.push(-Infinity); HI.push(Infinity);
  const w = ways[WAY[i]];
  // a bridge / tunnel span: the street raster there is the ground under it (the L26 cutting), not the deck: no constraint,
  // the span follows its approaches smoothly (tram.js builds the deck from these tracks)
  FIX.push(0);
  if (w.fixed) { stats.fixed++; continue; }
  const x = X[i], z = Z[i], nx = NX[i], nz = NZ[i];
  const kerbNear = kerbDist(x, z, SCAN + KERB_CLEAR + 0.1) <= SCAN + KERB_CLEAR;
  let any = false;
  for (let k = -NS; k <= NS; k++) {
    const o = k * DS, px = x + nx * o, pz = z + nz * o;
    const b = RAISED.has(classAt(px, pz)) || (kerbNear && kerbDist(px, pz, KERB_CLEAR + 0.01) < KERB_CLEAR);
    bad[k + NS] = b ? 1 : 0; any ||= b;
  }
  if (!any) continue;
  pre[0] = 0; for (let k = 0; k <= 2 * NS; k++) pre[k + 1] = pre[k] + bad[k];
  // admissible centre offsets: both rails AND everything between them clear (index c: window [c - W, c + W] in range)
  const adm = (c) => { const a = c - W, b = c + W; if (a < 0 || b > 2 * NS) return null; return pre[b + 1] - pre[a] === 0; };
  const runs = [];
  for (let c = W; c <= 2 * NS - W;) {
    if (!adm(c)) { c++; continue; }
    let e = c; while (e + 1 <= 2 * NS - W && adm(e + 1)) e++;
    runs.push([c, e]); c = e + 1;
  }
  const toO = (c) => (c - NS) * DS;
  // a run touching the scan's end is open there (nothing raised beyond what was scanned)
  const lo = (r) => (r[0] === W && !pre[W] ? -Infinity : toO(r[0])), hi = (r) => (r[1] === 2 * NS - W && pre[2 * NS + 1] - pre[2 * NS - W] === 0 ? Infinity : toO(r[1]));
  let best = null, bd = Infinity;
  for (const r of runs) { const d = toO(r[0]) > 0 ? toO(r[0]) : toO(r[1]) < 0 ? -toO(r[1]) : 0; if (d < bd) { bd = d; best = r; } }
  if (!best || bd > REACH) { stats.noFit++; continue; }
  // a track that has to move across a kerb running at an angle to it is ENTERING / LEAVING the street there (a site
  // entrance, a terminus loop, a junction): the crossing is real, the track is left as OSM draws it
  if (bd > 0) {
    const kd = kerbDir(x, z, CROSS_R);
    if (kd && Math.abs(kd[0] * TX[i] + kd[1] * TZ[i]) < Math.cos(CROSS_DEG * Math.PI / 180)) { stats.crossing++; continue; }
  }
  LO[i] = lo(best); HI[i] = hi(best); stats.constrained++;
  if (bd > 0) stats.off++;
}

// ---------------------------------------------------------------- pairs (two parallel tracks) and switch ties
const G = new Map(), gk = (x, z) => skey(Math.floor(x / 4), Math.floor(z / 4));
for (let i = 0; i < N; i++) { const k = gk(X[i], Z[i]); if (!G.has(k)) G.set(k, []); G.get(k).push(i); }
const pairs = [];          // [i, j, s, c, gap0, m]
for (let i = 0; i < N; i += 1) {
  let bj = -1, bd = 25;
  const cx = Math.floor(X[i] / 4), cz = Math.floor(Z[i] / 4);
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (const j of G.get(skey(cx + a, cz + b)) || []) {
    if (strandOf[j] === strandOf[i]) continue;
    if (Math.abs(TX[i] * TX[j] + TZ[i] * TZ[j]) < 0.96) continue;
    const d2 = (X[j] - X[i]) ** 2 + (Z[j] - Z[i]) ** 2;
    if (d2 < bd) { bd = d2; bj = j; }
  }
  if (bj < 0) continue;
  const gap0 = (X[bj] - X[i]) * NX[i] + (Z[bj] - Z[i]) * NZ[i];
  if (Math.abs(gap0) < 1.5) continue;                     // a switch / crossing: the tracks meet there
  pairs.push([i, bj, Math.sign(gap0), NX[bj] * NX[i] + NZ[bj] * NZ[i], gap0, Math.min(Math.abs(gap0), SPACING)]);
}
const ties = [];           // [e, j, c]: strand end e moves with sample j of the track it branches off
for (let s = 0; s < first.length; s++) for (const e of [first[s], first[s] + count[s] - 1]) {
  let best = TIE * TIE, bj = -1;
  const cx = Math.floor(X[e] / 4), cz = Math.floor(Z[e] / 4);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of G.get(skey(cx + a, cz + b)) || []) {
    if (strandOf[j] === s) continue;
    const d2 = (X[j] - X[e]) ** 2 + (Z[j] - Z[e]) ** 2;
    if (d2 < best) { best = d2; bj = j; }
  }
  if (bj >= 0) ties.push([e, bj, NX[e] * NX[bj] + NZ[e] * NZ[bj]]);
}

// ---------------------------------------------------------------- the offsets: projection sweeps from o = 0
const O = new Float64Array(N);
const lim2 = STEP * STEP / R_ADD, lim1 = SLOPE * STEP;
let worst = 0, it = 0;
const SWEEPS = +opt("--sweeps", 6000);
for (; it < SWEEPS; it++) {
  worst = 0;
  const rev = it & 1;
  for (let q = 0; q < N; q++) {
    const i = rev ? N - 1 - q : q;
    if (O[i] < LO[i]) { worst = Math.max(worst, LO[i] - O[i]); O[i] = LO[i]; } else if (O[i] > HI[i]) { worst = Math.max(worst, O[i] - HI[i]); O[i] = HI[i]; }
  }
  for (const [i, j, s, c, gap0, m] of pairs) {
    const f = s * (gap0 + c * O[j] - O[i]);
    if (f >= m) continue;
    const r = m - f, k = r / (1 + c * c);
    worst = Math.max(worst, r);
    O[i] -= s * k; O[j] += s * c * k;
  }
  for (const [e, j, c] of ties) { const r = O[e] - c * O[j], k = r / (1 + c * c); worst = Math.max(worst, Math.abs(r)); O[e] -= k; O[j] += c * k; }
  for (let s = 0; s < first.length; s++) {
    const a = first[s], b = a + count[s] - 1;
    for (let q = a; q < b; q++) {
      const i = rev ? b - 1 - (q - a) : q, d = O[i + 1] - O[i];
      if (d > lim1) { const e = (d - lim1) / 2; O[i] += e; O[i + 1] -= e; worst = Math.max(worst, e); }
      else if (d < -lim1) { const e = (d + lim1) / 2; O[i] += e; O[i + 1] -= e; worst = Math.max(worst, -e); }
    }
    for (let q = a + 1; q < b; q++) {
      const i = rev ? b - 1 - (q - a - 1) : q, d2 = O[i - 1] - 2 * O[i] + O[i + 1];
      let ex = 0;
      if (d2 > lim2) ex = d2 - lim2; else if (d2 < -lim2) ex = d2 + lim2;
      if (!ex) continue;
      worst = Math.max(worst, Math.abs(ex));
      O[i - 1] -= ex / 6; O[i] += ex / 3; O[i + 1] -= ex / 6;
    }
  }
  for (let i = 0; i < N; i++) if (FIX[i]) O[i] = 0;
  if (worst < 1e-5) break;
}
// ---------------------------------------------------------------- report
const moved = [], residual = [];
for (let i = 0; i < N; i++) {
  if (Math.abs(O[i]) > 0.005) moved.push(Math.abs(O[i]));
  const ex = Math.max(LO[i] - O[i], O[i] - HI[i]);
  if (ex > 0.03) residual.push(i);
}
moved.sort((a, b) => a - b);
const q = (p) => (moved.length ? +moved[Math.min(moved.length - 1, Math.floor(moved.length * p))].toFixed(2) : 0);
Object.assign(stats, { sweeps: it, worst: +worst.toExponential(2), pairs: pairs.length, ties: ties.length, movedM: +(moved.length * STEP).toFixed(0), moveP50: q(0.5), moveP90: q(0.9), moveMax: q(1), residualM: residual.length * STEP });
// curvature: the tightest radius of each strand before / after (3 points 2 m apart)
const radius = (ax, az, bx, bz, cx, cz) => {
  const a = Math.hypot(bx - ax, bz - az), b = Math.hypot(cx - bx, cz - bz), c = Math.hypot(cx - ax, cz - az), A2 = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax));
  return A2 < 1e-9 ? Infinity : (a * b * c) / (2 * A2);
};
const curvBad = [];
let tightBefore = 0, tightAfter = 0, tightNew = 0, worstCurv = 0;
for (let s = 0; s < first.length; s++) {
  const a = first[s], n = count[s], h = 4;
  for (let k = h; k + h < n; k++) {
    const i = a + k, p = i - h, m = i + h;
    const r0 = radius(X[p], Z[p], X[i], Z[i], X[m], Z[m]);
    const r1 = radius(X[p] + NX[p] * O[p], Z[p] + NZ[p] * O[p], X[i] + NX[i] * O[i], Z[i] + NZ[i] * O[i], X[m] + NX[m] * O[m], Z[m] + NZ[m] * O[m]);
    if (r0 < 18) tightBefore++;
    if (r1 < 18) { tightAfter++; if (r0 >= 18) tightNew++; }
    worstCurv = Math.max(worstCurv, Math.abs(1 / r1 - 1 / r0));
    if (Math.abs(1 / r1 - 1 / r0) > 0.02 || (r1 < 18 && r0 >= 18)) curvBad.push([i, r0, r1]);
  }
}
// the OSM tram platforms (tram.js draws them where OSM puts them, a 2.6 m band / an area) over a rail, before / after
let platBefore = 0, platAfter = 0;
for (let i = 0; i < N; i++) for (const sd of [-1, 1]) {
  if (onPlatform(X[i] + NX[i] * sd * RAIL_C, Z[i] + NZ[i] * sd * RAIL_C)) platBefore++;
  if (onPlatform(X[i] + NX[i] * (O[i] + sd * RAIL_C), Z[i] + NZ[i] * (O[i] + sd * RAIL_C))) platAfter++;
}
stats.platformRailBeforeM = platBefore * STEP / 2; stats.platformRailAfterM = platAfter * STEP / 2;
Object.assign(stats, { tight18Before: tightBefore, tight18After: tightAfter, tight18New: tightNew, curvChangeMax: +worstCurv.toFixed(4) });

// ---------------------------------------------------------------- the fitted ways, cut back into tiles
/** Douglas-Peucker (tol m), never more than maxGap m between kept points */
function simplify(P, tol = 0.004, maxGap = 4) {
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const stack = [[0, P.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b <= a + 1) continue;
    const [ax, az] = P[a], [bx, bz] = P[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1e-9;
    let bi = -1, bd = tol;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i][0] - ax) * dz - (P[i][1] - az) * dx) / L; if (d > bd) { bd = d; bi = i; } }
    if (bi < 0 && L > maxGap) bi = (a + b) >> 1;
    if (bi < 0) continue;
    keep[bi] = 1; stack.push([a, bi], [bi, b]);
  }
  return P.filter((_, i) => keep[i]);
}
const wayPts = ways.map(() => []);
for (let s = 0; s < first.length; s++) {
  const a = first[s], n = count[s];
  for (let k = 0; k < n; k++) {
    const i = a + k, p = [X[i] + NX[i] * O[i], Z[i] + NZ[i] * O[i]];
    // a sample on a way boundary belongs to both ways (each way keeps its end point)
    if (k > 0 && WAY[i] !== WAY[i - 1]) wayPts[WAY[i - 1]].push(p);
    wayPts[WAY[i]].push(p);
  }
}
/** the parts of polyline P inside the box b (x0 <= x < x1 style: the seam point goes to both sides) */
function clip(P, b) {
  const out = []; let cur = null;
  const inside = (p) => p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.z0 && p[1] <= b.z1;
  const cross = (p, q) => {           // the part of segment p-q inside b (Liang-Barsky) -> [t0, t1] or null
    let t0 = 0, t1 = 1; const dx = q[0] - p[0], dz = q[1] - p[1];
    for (const [pp, qq] of [[-dx, p[0] - b.x0], [dx, b.x1 - p[0]], [-dz, p[1] - b.z0], [dz, b.z1 - p[1]]]) {
      if (pp === 0) { if (qq < 0) return null; continue; }
      const r = qq / pp; if (pp < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [t0, t1];
  };
  const at = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  for (let k = 1; k < P.length; k++) {
    const p = P[k - 1], qq = P[k], c = cross(p, qq);
    if (!c) { if (cur) { out.push(cur); cur = null; } continue; }
    const a = c[0] > 0 ? at(p, qq, c[0]) : p, e = c[1] < 1 ? at(p, qq, c[1]) : qq;
    if (!cur) cur = [a];
    else if (Math.hypot(a[0] - cur[cur.length - 1][0], a[1] - cur[cur.length - 1][1]) > 1e-6) { out.push(cur); cur = [a]; }
    cur.push(e);
    if (c[1] < 1) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((l) => l.length >= 2 && l.some((p, i) => i && Math.hypot(p[0] - l[0][0], p[1] - l[0][1]) > 0.05));
}
const r2 = (v) => Math.round(v * 100) / 100;
const outDir = join(ROOT, "data/tramfit");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^[A-Z]\d+\.json$/.test(f)) rmSync(join(outDir, f));
const perTile = new Map();
ways.forEach((w, wi) => {
  const P = simplify(wayPts[wi]);
  if (P.length < 2) return;
  for (const [name, b] of bounds) {
    if (!rawSig.has(name)) continue;            // only tiles that have tram ways of their own
    for (const part of clip(P, b)) {
      if (!perTile.has(name)) perTile.set(name, []);
      perTile.get(name).push({ id: w.id, kind: "tram", tags: w.tags, line: part.map(([x, z]) => [r2(x), r2(z)]) });
    }
  }
});
for (const [name, lines] of perTile) {
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ contract: "tramfit 1", tile: name, sig: rawSig.get(name),
    source: "OSM tram ways (ODbL) fitted to the UrbIS street surfaces (CC0) as drawn, tools/tramfit/build_tramfit.mjs", lines }));
}
writeFileSync(join(outDir, "summary.json"), JSON.stringify({ when: new Date().toISOString(), params: { RAIL_C, KERB_CLEAR, SPACING, R_ADD, SLOPE, STEP, REACH }, stats, tiles: [...perTile.keys()].sort() }, null, 1));
console.log(stats);
if (argv.includes("--diag")) {
  const runs = [];
  for (let k = 0; k < residual.length; k++) {
    const i = residual[k];
    if (runs.length && residual[k - 1] === i - 1 && strandOf[i] === strandOf[i - 1]) { runs[runs.length - 1].n++; continue; }
    runs.push({ i, n: 1 });
  }
  runs.sort((a, b) => b.n - a.n);
  for (const r of runs.slice(0, 30)) {
    const i = r.i + (r.n >> 1), pr = pairs.find((p) => p[0] === i);
    console.log(`${(r.n * STEP).toFixed(1)} m at ${X[i].toFixed(1)}, ${Z[i].toFixed(1)} way ${ways[WAY[i]].id} lo ${LO[i].toFixed(2)} hi ${HI[i].toFixed(2)} o ${O[i].toFixed(2)}` + (pr ? ` pair gap0 ${pr[4].toFixed(2)} min ${pr[5].toFixed(2)} o_j ${O[pr[1]].toFixed(2)} lo_j ${LO[pr[1]].toFixed(2)} hi_j ${HI[pr[1]].toFixed(2)}` : ""));
    let line = "";
    for (let o = -6; o <= 6.01; o += 0.25) { const px = X[i] + NX[i] * o, pz = Z[i] + NZ[i] * o, c = classAt(px, pz); line += (Math.abs(o) < 0.01 ? "|" : "") + (kerbDist(px, pz, 0.2) < 0.13 ? "k" : c < 0 ? "." : c); }
    console.log("    " + line);
  }
  if (argv.includes("--plat")) {
    const hits = [];
    for (let i = 0; i < N; i++) for (const sd of [-1, 1]) if (onPlatform(X[i] + NX[i] * (O[i] + sd * RAIL_C), Z[i] + NZ[i] * (O[i] + sd * RAIL_C))) { hits.push(i); break; }
    const cl = [];
    for (const i of hits) { const c = cl.find((q) => Math.hypot(X[q.i] - X[i], Z[q.i] - Z[i]) < 40); if (c) c.n++; else cl.push({ i, n: 1 }); }
    cl.sort((a, b) => b.n - a.n);
    console.log("rails on an OSM platform:");
    for (const c of cl) console.log(`  ${(c.n * STEP).toFixed(1)} m near ${X[c.i].toFixed(1)}, ${Z[c.i].toFixed(1)} ${ways[WAY[c.i]].id}`);
  }
  console.log("curvature changed > 0.02 / new radius < 18 m:");
  let lastC = null;
  for (const [i, r0, r1] of curvBad) { if (lastC !== null && Math.hypot(X[i] - X[lastC], Z[i] - Z[lastC]) < 10) continue; lastC = i; console.log(`  ${X[i].toFixed(1)}, ${Z[i].toFixed(1)} ${ways[WAY[i]].id} R ${r0.toFixed(1)} -> ${r1.toFixed(1)} o ${O[i].toFixed(2)}`); }
  // the big moves (clusters of |o| > BIG m): where the fit trusts UrbIS over OSM the most
  const BIG = +opt("--big", 1);
  console.log(`moves over ${BIG} m:`);
  for (let s = 0; s < first.length; s++) {
    let a = -1;
    for (let k = 0; k <= count[s]; k++) {
      const i = first[s] + k, big = k < count[s] && Math.abs(O[i]) > BIG;
      if (big && a < 0) a = i;
      if (!big && a >= 0) {
        let m = a; for (let j = a; j < i; j++) if (Math.abs(O[j]) > Math.abs(O[m])) m = j;
        let line = "";
        for (let o = -6; o <= 6.01; o += 0.25) { const px = X[m] + NX[m] * o, pz = Z[m] + NZ[m] * o, c = classAt(px, pz); line += (Math.abs(o) < 0.01 ? "|" : "") + (kerbDist(px, pz, 0.2) < 0.13 ? "k" : c < 0 ? "." : c); }
        console.log(`  ${((i - a) * STEP).toFixed(1)} m at ${X[m].toFixed(1)}, ${Z[m].toFixed(1)} ${ways[WAY[m]].id} o ${O[m].toFixed(2)} [${LO[m].toFixed(2)}, ${HI[m].toFixed(2)}]  ${line}`);
        a = -1;
      }
    }
  }
}
