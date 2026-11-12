// THE TRAM TRACKS' VERTICAL PROFILE (docs/fixes1/README.md, job 1): one smooth rail-top height line per track,
// computed once for all of Uccle from the committed tiles, so the rails, the contact wire, the bridge deck and the trams
// all stand on the SAME heights, continuous across tile seams.
//
//   node tools/build_tram_profile.mjs            -> data/transit/tram_profile.json
//
// Why: the trams and rails used the carved terrain under each point (hm.surface + CARVE). Along line 92 that is
//  - noisy at the 1 m grid scale (rms 2nd difference 0.65 cm/m2, single-metre grade breaks of 2-6 %: kerb edges of the
//    measured surfaces, DTM noise), so each tram section (pitched from its own ground samples) and each bogie jittered;
//  - WRONG on the tram bridge over the L26 cutting next to Saint-Job station (OSM w1411905486 / w1411905488,
//    bridge=yes, layer 1): the DTM is bare earth, the deck is not in it, so the tram dived 8 m into the railway cutting
//    and crossed the railway at rail level (grade breaks of 60 % per metre, vertical radius ~9 m).
// What: the OSM tram ways of every tile, chained into strands (through nodes of degree 2: two tiles' pieces of one way,
// consecutive ways), sampled every 1 m on the UrbIS DTM (the road surfaces are draped on it: rail top = road surface);
// bridge spans (+ 4 m for the abutments in the 1 m DTM) interpolated between their ends; then a light 3 m Gaussian (DTM
// noise) and vertical curves: the 2nd difference clamped to the real tram limits (crest radius >= 500 m, sag >= 300 m)
// by projection sweeps, strand ends pinned (switches: every strand meeting there has the same height there).
// Output: per strand the points every 2 m [x, z, y] (cm) and flags for the bridge spans.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { smoothPolyline } from "../viewer/track.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TILES = path.join(ROOT, "data/tiles");
export const R_CREST = 500, R_SAG = 300, PAD = 4, SIGMA = 3, STEP = 1, OUT_STEP = 4, CLAMP = 0.08;

// ---- the DTM of all tiles (u16 cm, 1 m)
const dtm = new Map();
for (const t of fs.readdirSync(TILES)) {
  const hp = path.join(TILES, t, "terrain.json");
  if (!fs.existsSync(hp)) continue;
  const h = JSON.parse(fs.readFileSync(hp, "utf8"));
  const b = fs.readFileSync(path.join(TILES, t, "terrain.u16"));
  dtm.set(`${Math.round(h.x0)},${Math.round(h.z0)}`, { h, a: new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2) });
}
const SIZE = 500;
function cell(i, j) {           // global grid node (1 m) -> height or NaN
  const tx = Math.floor(i / SIZE) * SIZE, tz = Math.floor(j / SIZE) * SIZE;
  let T = dtm.get(`${tx},${tz}`), c = i - tx, r = j - tz;
  if (!T) return NaN;
  if (c >= T.h.cols || r >= T.h.rows) return NaN;
  const v = T.a[r * T.h.cols + c];
  return v === T.h.nodata ? NaN : v / 100;
}
export function ground(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const a = cell(i, j), b = cell(i + 1, j), c = cell(i, j + 1), d = cell(i + 1, j + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

// ---- the tram ways: pieces per tile -> one polyline per way
const pieces = new Map();       // id -> { tags, parts: [[x, z]...][] }
for (const t of fs.readdirSync(TILES)) {
  const fp = path.join(TILES, t, "features.json");
  if (!fs.existsSync(fp)) continue;
  for (const l of JSON.parse(fs.readFileSync(fp, "utf8")).lines || []) {
    if (l.kind !== "tram") continue;
    if (!pieces.has(l.id)) pieces.set(l.id, { tags: l.tags || {}, parts: [] });
    pieces.get(l.id).parts.push(l.line);
  }
}
const K = (p) => `${Math.round(p[0] * 20)},${Math.round(p[1] * 20)}`;       // 5 cm node key
/** chain polylines that share end points (5 cm) through nodes of degree 2 */
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
      let l = lines[nx].map((p) => p.slice());
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
for (const [id, w] of pieces) {
  for (const c of chain(w.parts)) ways.push({ id, bridge: w.tags.bridge === "yes" || w.tags.tunnel === "yes", pts: smoothPolyline(c.pts) });
}
// ways -> strands (consecutive ways through degree-2 nodes)
const strandsRaw = chain(ways.map((w) => w.pts));

// ---- per strand: uniform samples (<= STEP), raw heights, bridges, smoothing; then the vertical curves on the WHOLE
// network at once (junctions: a strand's end ties to the nearest point of the strand it branches off, the triplets
// through the junction that run straight on are constrained too), so a tram crossing a switch sees no grade break
function dense(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.ceil(L / STEP) + 1), out = [];
  for (let k = 0, j = 0; k < n; k++) {
    const s = L * k / (n - 1);
    while (j < pts.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f, s]);
  }
  return out;
}
/** is (x, z) on a bridge way (within 0.6 m of its centreline)? */
const bridgeSegs = [];
for (const w of ways) if (w.bridge) for (let i = 1; i < w.pts.length; i++) bridgeSegs.push([...w.pts[i - 1], ...w.pts[i]]);
const onBridge = (x, z) => bridgeSegs.some(([ax, az, bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
  return (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 < 0.36;
});

function gauss(y, sigma, ds) {
  const r = Math.ceil(3 * sigma / ds), w = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-0.5 * (k * ds / sigma) ** 2));
  const out = y.slice();
  for (let i = 1; i < y.length - 1; i++) {
    let s = 0, sw = 0;
    for (let k = -r; k <= r; k++) { const j = i + k; if (j < 0 || j >= y.length) continue; s += y[j] * w[k + r]; sw += w[k + r]; }
    out[i] = s / sw;
  }
  return out;
}

// global point arrays
const X = [], Z = [], Y = [], RAW = [], GAP = [], BR = [], strandOf = [], first = [], count = [];
const stats = { strands: 0, km: 0, bridgeM: 0, junctions: 0, devP99: 0, devMax: 0, worstResidual: 0, clamped: 0 };
for (const st of strandsRaw) {
  const P = dense(st.pts);
  const n = P.length, y = new Float64Array(n), br = new Uint8Array(n), gap = new Uint8Array(n);
  for (let i = 0; i < n; i++) { y[i] = ground(P[i][0], P[i][1]); br[i] = onBridge(P[i][0], P[i][1]) ? 1 : 0; }
  // bridges + PAD: linear between the valid neighbours (the deck is not in the DTM); no data: the same
  for (let i = 0; i < n; i++) if (br[i]) for (let j = i; j >= 0 && P[i][2] - P[j][2] <= PAD; j--) gap[j] = 1;
  for (let i = n - 1; i >= 0; i--) if (br[i]) for (let j = i; j < n && P[j][2] - P[i][2] <= PAD; j++) gap[j] = 1;
  for (let i = 0; i < n; i++) if (!Number.isFinite(y[i])) gap[i] = 1;
  for (let i = 0; i < n;) {
    if (!gap[i]) { i++; continue; }
    let j = i; while (j < n && gap[j]) j++;
    const a = i - 1, b = j;
    for (let k = i; k < j; k++) {
      if (a >= 0 && b < n) y[k] = y[a] + (y[b] - y[a]) * (P[k][2] - P[a][2]) / (P[b][2] - P[a][2]);
      else y[k] = a >= 0 ? y[a] : b < n ? y[b] : 0;
    }
    i = j;
  }
  const raw = Array.from(y), sm = n > 2 ? gauss(raw, SIGMA, P[1][2] - P[0][2]) : raw.slice();
  const si = first.length;
  first.push(X.length); count.push(n);
  for (let i = 0; i < n; i++) { X.push(P[i][0]); Z.push(P[i][1]); Y.push(sm[i]); RAW.push(raw[i]); GAP.push(gap[i]); BR.push(br[i]); strandOf.push(si); }
  stats.strands++; stats.km += P[n - 1][2] / 1000; stats.bridgeM += br.reduce((a, b) => a + b, 0) * (P[1][2] - P[0][2]);
}
// constraints: triplets (p, m, n) along every strand, and through junctions
const trip = [];
for (let s = 0; s < first.length; s++) for (let i = first[s] + 1; i < first[s] + count[s] - 1; i++) trip.push([i - 1, i, i + 1]);
const G = new Map(), gk = (x, z) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
for (let i = 0; i < X.length; i++) { const k = gk(X[i], Z[i]); if (!G.has(k)) G.set(k, []); G.get(k).push(i); }
const ties = [];
for (let s = 0; s < first.length; s++) for (const [e, e1] of [[first[s], first[s] + 1], [first[s] + count[s] - 1, first[s] + count[s] - 2]]) {
  if (count[s] < 2) continue;
  let best = 0.36, bj = -1;                                     // nearest point of ANOTHER strand within 0.6 m
  const cx = Math.floor(X[e] / 4), cz = Math.floor(Z[e] / 4);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of G.get(`${cx + a},${cz + b}`) || []) {
    if (strandOf[j] === s) continue;
    const d2 = (X[j] - X[e]) ** 2 + (Z[j] - Z[e]) ** 2;
    if (d2 < best) { best = d2; bj = j; }
  }
  if (bj < 0) continue;
  ties.push([e, bj]); stats.junctions++;
  // straight-on triplets through the junction: e1 -> (e ~ bj) -> bj's neighbours running on (angle > 120 deg)
  const ux = X[e] - X[e1], uz = Z[e] - Z[e1], ul = Math.hypot(ux, uz) || 1;
  const t0 = first[strandOf[bj]], t1 = t0 + count[strandOf[bj]] - 1;
  for (const nb of [bj - 1, bj + 1]) {
    if (nb < t0 || nb > t1) continue;
    const vx = X[nb] - X[bj], vz = Z[nb] - Z[bj], vl = Math.hypot(vx, vz) || 1;
    if ((ux * vx + uz * vz) / (ul * vl) > 0.5) trip.push([e1, bj, nb]);
  }
}
/** the vertical curves: the 2nd derivative (uneven spacing) clamped to [-1/R_CREST, 1/R_SAG] by projection sweeps;
 *  junction ends tied to the point they branch off */
function verticalCurves(sweeps = 30000) {
  let worst = 0;
  const kc = 1 / R_CREST, ks = 1 / R_SAG;
  for (let it = 0; it < sweeps; it++) {
    worst = 0;
    for (const [e, j] of ties) { const m = (Y[e] + Y[j]) / 2; worst = Math.max(worst, Math.abs(Y[e] - Y[j])); Y[e] = Y[j] = m; }
    for (let t = 0; t < trip.length; t++) {
      const [p, m, n] = trip[(it & 1) ? trip.length - 1 - t : t];
      const h1 = Math.hypot(X[m] - X[p], Z[m] - Z[p]) || 1e-3, h2 = Math.hypot(X[n] - X[m], Z[n] - Z[m]) || 1e-3;
      const ap = 2 / (h1 * (h1 + h2)), am = -2 / (h1 * h2), an = 2 / (h2 * (h1 + h2));
      const d2 = ap * Y[p] + am * Y[m] + an * Y[n];
      let ex = 0;
      if (d2 > ks) ex = d2 - ks; else if (d2 < -kc) ex = d2 + kc;
      if (!ex) continue;
      worst = Math.max(worst, Math.abs(ex) * h1 * h2);
      const den = ap * ap + am * am + an * an, lam = ex / den;
      Y[p] -= ap * lam; Y[m] -= am * lam; Y[n] -= an * lam;
    }
    if (worst < 1e-6) break;
  }
  return worst;
}
stats.worstResidual = verticalCurves();
// where the vertical curves cannot follow the ground within CLAMP (short strands between switches on a steep depot
// fan, A5 / B5: up to 0.5 m), the ground wins beyond CLAMP: never rails floating or buried by more than that
const devs = [];
for (let i = 0; i < X.length; i++) if (!GAP[i]) {
  const d = Y[i] - RAW[i];
  if (Math.abs(d) > CLAMP) stats.clamped++;
  Y[i] = RAW[i] + Math.max(-CLAMP, Math.min(CLAMP, d));
  if (X[i] > -2300) devs.push(Y[i] - RAW[i]);                 // (the stats leave out the A5 / B5 depot fan, clamped)
}
devs.sort((a, b) => Math.abs(a) - Math.abs(b));
stats.devP50 = +Math.abs(devs[Math.floor(devs.length * 0.5)]).toFixed(3);
stats.devP99 = +Math.abs(devs[Math.floor(devs.length * 0.99)]).toFixed(3);
stats.devMax = +Math.abs(devs[devs.length - 1]).toFixed(3);
stats.km = +stats.km.toFixed(2); stats.bridgeM = Math.round(stats.bridgeM);
// output every ~OUT_STEP m (+ the last point): [x, z, y, bridge]; read back with Catmull-Rom (viewer/trackProfile.js)
const strands = [];
for (let s = 0; s < first.length; s++) {
  const out = [], n = count[s], every = Math.max(1, Math.round(OUT_STEP / STEP));
  for (let k = 0; k < n; k++) if (k % every === 0 || k === n - 1) { const i = first[s] + k; out.push([+X[i].toFixed(2), +Z[i].toFixed(2), +Y[i].toFixed(3), BR[i]]); }
  strands.push(out);
}
const doc = { contract: "tram-profile 1", source: "UrbIS DTM (CC0) + OSM tram ways (ODbL), tools/build_tram_profile.mjs", rCrest: R_CREST, rSag: R_SAG, step: OUT_STEP, stats, strands };
fs.writeFileSync(path.join(ROOT, "data/transit/tram_profile.json"), JSON.stringify(doc));
console.log(stats, "bytes", fs.statSync(path.join(ROOT, "data/transit/tram_profile.json")).size);
if (process.argv.includes("--diag")) {
  const bad = [];
  for (const [p, m, n] of trip) {
    const h1 = Math.hypot(X[m] - X[p], Z[m] - Z[p]) || 1e-3, h2 = Math.hypot(X[n] - X[m], Z[n] - Z[m]) || 1e-3;
    const d2 = 2 * ((Y[n] - Y[m]) / h2 - (Y[m] - Y[p]) / h1) / (h1 + h2);
    if (d2 > 1.05 / R_SAG || d2 < -1.05 / R_CREST) bad.push([Math.round(X[m]), Math.round(Z[m]), Math.round(1 / d2), strandOf[p] !== strandOf[n] ? "junction" : "", +h1.toFixed(2), +h2.toFixed(2)]);
  }
  const far = bad.filter((b) => b[0] > -2300);
  console.log("violations", bad.length, "outside the A5/B5 depot", far.length, far.slice(0, 30));
  console.log("ties off", ties.filter(([e, j]) => Math.abs(Y[e] - Y[j]) > 0.005).length);
}
