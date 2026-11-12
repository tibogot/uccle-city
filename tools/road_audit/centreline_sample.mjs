// Do Uccle's residential streets have a painted centre line? (owner decision 1, 2026-11-10: "no centre line unless
// measured", after an orthophoto sample.) Picks residential two-way streets at random (OSM residential / unclassified,
// mapped by UrbIS, away from junctions), and for each 40 m stretch:
//   - an automatic score: the brightness profile across the street (70th percentile along it, so 3 m dashes with 5 m
//     gaps still count) must show a narrow bright ridge near the measured middle of the carriageway;
//   - a crop of the 2024 UrbIS orthophoto (CC0, 25 cm) turned along the street, into contact sheets for a human look.
// Calibration: the same on streets where UrbIS Topo HAS surveyed a centre line (CR21*/CR22*), which must score high.
//
//   node --import ./tools/road_audit/register.mjs tools/road_audit/centreline_sample.mjs [N=80] [seed=7]
// Writes docs/roads/centreline_sample/{sample.json, sheet_*.jpg, calib_*.jpg}.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { loadTile, allTiles, ROOT } from "./tile.mjs";
import { orthoSampler } from "./ortho.mjs";

const require = createRequire(import.meta.url);
const jpeg = require("jpeg-js");
const N = +(process.argv[2] || 80), SEED = +(process.argv[3] || 7);
const OUT = join(ROOT, "docs/roads/centreline_sample");
mkdirSync(OUT, { recursive: true });
let rs = SEED;
const rnd = () => ((rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648);
const CARRIAGE = new Set([0, 1, 3]);
const LEN = 40, PX = 0.1;

/** The street's reference point at station s (continuous, from the engine alignment samples). */
function refAt(rr, s) {
  let i = 1; while (i < rr.smp.s.length - 1 && rr.smp.s[i] < s) i++;
  const f = Math.min(1, Math.max(0, (s - rr.smp.s[i - 1]) / Math.max(1e-6, rr.smp.s[i] - rr.smp.s[i - 1])));
  const x = rr.smp.x[i - 1] + (rr.smp.x[i] - rr.smp.x[i - 1]) * f, z = rr.smp.z[i - 1] + (rr.smp.z[i] - rr.smp.z[i - 1]) * f;
  const th = rr.smp.th[i - 1] + Math.atan2(Math.sin(rr.smp.th[i] - rr.smp.th[i - 1]), Math.cos(rr.smp.th[i] - rr.smp.th[i - 1])) * f;
  return { x, z, th, nx: Math.sin(th), nz: -Math.cos(th) };
}

function stretch(tile, rr, s0) {
  // reference line samples every 0.5 m over LEN; the measured carriageway's middle offset, then ONE (median) offset
  // for the whole stretch so the crop and the profile follow the street smoothly
  const prep = tile.rd.prep;
  const S = [];
  for (let d = 0; d <= LEN; d += 0.5) {
    const p = refAt(rr, s0 + d);
    if (!CARRIAGE.has(prep.classAt(p.x, p.z))) { S.push(null); continue; }
    const ray = (sg) => { for (let t = 0.1; t < 15; t += 0.1) if (!CARRIAGE.has(prep.classAt(p.x + sg * p.nx * t, p.z + sg * p.nz * t))) return t; return null; };
    const l = ray(1), r = ray(-1);
    if (l == null || r == null) { S.push(null); continue; }
    S.push({ ...p, mid: (l - r) / 2, w: l + r });
  }
  const ok = S.filter(Boolean);
  if (ok.length) {
    const m = ok.map((p) => p.mid).sort((a, b) => a - b)[ok.length >> 1];
    for (const p of ok) p.mid = m;
    S.rr = rr; S.s0 = s0; S.mid = m;
  }
  return S;
}

function profile(ortho, S, half) {
  const vs = [], cols = [];
  for (let v = -half; v <= half + 1e-9; v += 0.05) {
    vs.push(v);
    const g = [];
    for (const p of S) { if (!p) continue; const y = ortho.at(p.x + p.nx * (p.mid + v), p.z + p.nz * (p.mid + v)); if (y != null) g.push(y); }
    g.sort((a, b) => a - b);
    cols.push(g.length ? g[Math.floor(g.length * 0.7)] : null);
  }
  return { vs, cols };
}

/** ridge score: brightest 0.25 m wide bump within 0.9 m of the middle, over its shoulders 0.5-1.4 m away */
function ridge(pr) {
  let best = { d: -1, v: 0 };
  const at = (v) => { const i = Math.round((v - pr.vs[0]) / 0.05); return pr.cols[i] ?? null; };
  for (let v = -0.9; v <= 0.9; v += 0.05) {
    const c = [at(v - 0.05), at(v), at(v + 0.05)].filter((x) => x != null);
    const sh = [];
    for (let k = 0.5; k <= 1.4; k += 0.05) { const a = at(v - k), b = at(v + k); if (a != null) sh.push(a); if (b != null) sh.push(b); }
    if (c.length < 2 || sh.length < 6) continue;
    sh.sort((a, b) => a - b);
    const d = Math.max(...c) - sh[sh.length >> 1];
    if (d > best.d) best = { d, v };
  }
  return { d: Math.round(best.d * 1000) / 1000, v: Math.round(best.v * 100) / 100 };
}

function crop(ortho, S, half) {
  const W = Math.round(LEN / PX), H = Math.round((2 * half) / PX);
  const img = new Uint8Array(W * H * 4);
  for (let i = 0; i < W; i++) {
    const q = refAt(S.rr, S.s0 + i * PX);
    for (let j = 0; j < H; j++) {
      const v = half - j * PX;
      const y = ortho.at(q.x + q.nx * (S.mid + v), q.z + q.nz * (S.mid + v));
      const g = y == null ? 0 : Math.min(255, Math.round(y * 255 * 1.1));
      const k = (j * W + i) * 4;
      img[k] = img[k + 1] = img[k + 2] = g; img[k + 3] = 255;
      if ((j === 0 || j === H - 1) && i % 20 < 10) { img[k] = 255; img[k + 1] = 60; img[k + 2] = 60; }   // the measured middle is the crop's middle row
    }
  }
  return { img, W, H };
}

function sheet(items, name) {
  const W = Math.round(LEN / PX), pad = 6;
  const H = items.reduce((s, it) => s + it.crop.H + pad, 0);
  const img = new Uint8Array(W * H * 4).fill(40);
  let y0 = 0;
  for (const it of items) {
    img.set(it.crop.img, y0 * W * 4);
    y0 += it.crop.H + pad;
  }
  writeFileSync(join(OUT, name), jpeg.encode({ data: img, width: W, height: H }, 88).data);
}

// candidate streets
const tiles = allTiles();
const order = tiles.map((t) => [t, rnd()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
const picks = [], calib = [], names = new Set();
for (const T of order) {
  if (picks.length >= N && calib.length >= 12) break;
  if (!existsSync(join(ROOT, "data/raw/ortho", `${T}.jpg`)) || !existsSync(join(ROOT, "data/tiles", T, "surfaces.json"))) continue;
  const tile = loadTile(T, { paint: "v1" });
  const ortho = orthoSampler(T);
  const { bounds } = tile;
  const inTile = (x, z) => x >= bounds.x0 + 25 && x < bounds.x1 - 25 && z >= bounds.z0 + 25 && z < bounds.z1 - 25;
  const lines = (tile.markings?.lines || []).filter((l) => l.kind === "solid" || l.kind === "dashed");
  const roadsSrc = new Map(tile.roads.roads.map((r) => [r.id, r]));
  const cand = tile.rd.net.roads.filter((rr) => rr.smp && rr.L > LEN + 30).sort(() => rnd() - 0.5);
  let perTile = 0;
  for (const rr of cand) {
    const r = roadsSrc.get(rr.id), hw = r?.meta?.highway, nm = r?.meta?.name || rr.id;
    const s0 = rr.L / 2 - LEN / 2;
    const S = stretch(tile, rr, s0);
    const ok = S.filter(Boolean);
    if (ok.length < 0.8 * S.length) continue;
    const mid = ok[ok.length >> 1];
    if (!inTile(mid.x, mid.z)) continue;
    const w = ok.map((p) => p.w).sort((a, b) => a - b)[ok.length >> 1];
    const hasTopo = lines.some((l) => l.line.some(([x, z]) => Math.hypot(x - mid.x, z - mid.z) < LEN / 2 + 5));
    const half = Math.min(7, w / 2 + 1.5);
    const rec = () => ({ tile: T, road: rr.id, name: nm, highway: hw, x: Math.round(mid.x), z: Math.round(mid.z), width: Math.round(w * 10) / 10,
      ridge: ridge(profile(ortho, S, half)), crop: crop(ortho, S, half) });
    if (hasTopo && calib.length < 12 && (hw === "secondary" || hw === "tertiary" || hw === "primary")) { calib.push(rec()); continue; }
    if (picks.length >= N || perTile >= 3) continue;
    if (!(hw === "residential" || hw === "unclassified") || r?.meta?.oneway === "yes" || names.has(nm)) continue;
    if (w < 4.5 || w > 12) continue;
    names.add(nm); perTile++;
    picks.push(rec());
  }
  console.error(`${T}: ${picks.length} picks, ${calib.length} calibration`);
}
for (let k = 0; k < picks.length; k += 10) sheet(picks.slice(k, k + 10), `sheet_${String(k / 10 + 1).padStart(2, "0")}.jpg`);
for (let k = 0; k < calib.length; k += 6) sheet(calib.slice(k, k + 6), `calib_${k / 6 + 1}.jpg`);
const strip = (l) => l.map(({ crop: _c, ...r }, i) => ({ i, sheet: Math.floor(i / 10) + 1, row: (i % 10) + 1, ...r }));
writeFileSync(join(OUT, "sample.json"), JSON.stringify({ N: picks.length, seed: SEED, len: LEN, picks: strip(picks), calibration: strip(calib).map((c) => ({ ...c, sheet: Math.floor(c.i / 6) + 1, row: (c.i % 6) + 1 })) }, null, 1));
const sc = (l) => l.map((p) => p.ridge.d).sort((a, b) => a - b);
console.log("residential ridge d:", sc(picks).join(" "));
console.log("calibration ridge d:", sc(calib).join(" "));
