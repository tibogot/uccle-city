// The 2024 UrbIS orthophoto of a tile (data/raw/ortho/<T>.jpg, 2000 x 2000 px = 25 cm, CC0) as a grey sampler, for
// the checker's C12 (the photo confirms or questions a painted marking; it never creates one) and the centre-line
// sample (tools/road_audit/centreline_sample.mjs). Image row 0 = north = the tile's z0.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const jpeg = require("jpeg-js");
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));

export function orthoSampler(T) {
  const f = join(ROOT, "data/raw/ortho", `${T}.jpg`);
  if (!existsSync(f)) return null;
  const img = jpeg.decode(readFileSync(f), { useTArray: true, formatAsRGBA: false, maxMemoryUsageInMB: 1024 });
  const { width: W, height: H, data } = img;
  const e = manifest.tiles.find((t) => t.name === T);
  const x0 = e.bounds.x[0], z0 = e.bounds.z[0], px = (e.bounds.x[1] - x0) / W;
  const grey = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) grey[i] = (0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]) / 255;
  /** bilinear grey 0..1 at (x, z), null off the image */
  const at = (x, z) => {
    const u = (x - x0) / px - 0.5, v = (z - z0) / px - 0.5;
    if (u < 0 || v < 0 || u >= W - 1 || v >= H - 1) return null;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, k = j * W + i;
    return (grey[k] * (1 - fu) + grey[k + 1] * fu) * (1 - fv) + (grey[k + W] * (1 - fu) + grey[k + W + 1] * fu) * fv;
  };
  /** Stripe score of a crossing: the 1 m-period component of the brightness across the road, through the band,
   *  over its standard deviation (0 = flat or noise, ~1 = clean square-wave stripes). */
  const zebraScore = (c) => {
    const bx = -Math.sin(c.axis), bz = Math.cos(c.axis), ax = Math.cos(c.axis), az = Math.sin(c.axis);
    let lo = Infinity, hi = -Infinity, ulo = Infinity, uhi = -Infinity;
    for (const p of c.poly) {
      const v = (p[0] - c.c[0]) * bx + (p[1] - c.c[1]) * bz, u = (p[0] - c.c[0]) * ax + (p[1] - c.c[1]) * az;
      lo = Math.min(lo, v); hi = Math.max(hi, v); ulo = Math.min(ulo, u); uhi = Math.max(uhi, u);
    }
    const us = [ulo + (uhi - ulo) * 0.3, (ulo + uhi) / 2, ulo + (uhi - ulo) * 0.7];
    const prof = [];
    for (let v = lo + 0.3; v <= hi - 0.3; v += 0.05) {
      let s = 0, n = 0;
      for (const u of us) { const g = at(c.c[0] + bx * v + ax * u, c.c[1] + bz * v + az * u); if (g != null) { s += g; n++; } }
      if (n) prof.push([v, s / n]);
    }
    if (prof.length < 40) return null;
    const mean = prof.reduce((a, p) => a + p[1], 0) / prof.length;
    const sd = Math.sqrt(prof.reduce((a, p) => a + (p[1] - mean) ** 2, 0) / prof.length);
    if (sd < 0.01) return 0;
    let best = 0;
    for (const period of [0.9, 1.0, 1.1, 1.2]) {
      let re = 0, im = 0;
      for (const [v, g] of prof) { const a = (2 * Math.PI * v) / period; re += (g - mean) * Math.cos(a); im += (g - mean) * Math.sin(a); }
      const amp = (2 * Math.hypot(re, im)) / prof.length;            // the sine amplitude of that period
      best = Math.max(best, amp / (sd * Math.SQRT2));                  // 1 for a pure sine; a square wave gives ~0.9
    }
    return Math.round(best * 100) / 100;
  };
  /** green-ness (vegetation over the road: the photo cannot tell) at (x, z): G - max(R, B), 0..1 */
  const greenAt = (x, z) => {
    const i = Math.round((x - x0) / px - 0.5), j = Math.round((z - z0) / px - 0.5);
    if (i < 0 || j < 0 || i >= W || j >= H) return 0;
    const k = (j * W + i) * 3;
    return Math.max(0, data[k + 1] - Math.max(data[k], data[k + 2])) / 255;
  };
  /**
   * Stripe scan of a crossing outline, direction-free (round 2): the zebra's bars may run at any angle to the outline
   * (the long diagonal Brussels Mobility polygons). For every direction (3° steps) the brightness INSIDE the outline is
   * averaged along the bars into a profile across them (5 cm bins); the score is the best 0.9-1.15 m period component (the Belgian zebra: 0.5 m bars, 0.5 m gaps)
   * over the profile's spread (1 ~ clean bars). Returns { score, th (the bars' normal: the direction ACROSS the
   * stripes, radians), period, contrast (p90 - p10 of the grey), veg (share of green samples: trees over the road) }.
   */
  const stripeScan = (poly, thExp = null, only = false) => {
    const pip = (x, z) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
    let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
    for (const [x, z] of poly) { xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z); }
    const S = [];
    let veg = 0;
    for (let x = xa + 0.05; x < xb; x += 0.1) for (let z = za + 0.05; z < zb; z += 0.1) {
      if (!pip(x, z)) continue;
      const g = at(x, z);
      if (g == null) continue;
      S.push(x, z, g);
      if (greenAt(x, z) > 0.04) veg++;
    }
    const n = S.length / 3;
    if (n < 200) return null;
    const gs = []; for (let i = 2; i < S.length; i += 3) gs.push(S[i]);
    gs.sort((a, b) => a - b);
    const contrast = gs[Math.floor(n * 0.9)] - gs[Math.floor(n * 0.1)];
    const cx = (xa + xb) / 2, cz = (za + zb) / 2, BIN = 0.05;
    let best = { score: 0, th: 0, period: 1 }, exp = 0;
    for (let deg = 0; deg < 180; deg += 3) {
      const th = (deg * Math.PI) / 180, dx = Math.cos(th), dz = Math.sin(th);
      if (only && thExp != null) { let d = Math.abs(th - thExp) % Math.PI; d = Math.min(d, Math.PI - d); if (d > 0.21) continue; }
      const sum = new Map(), cnt = new Map();
      for (let i = 0; i < S.length; i += 3) {
        const b = Math.round(((S[i] - cx) * dx + (S[i + 1] - cz) * dz) / BIN);
        sum.set(b, (sum.get(b) || 0) + S[i + 2]); cnt.set(b, (cnt.get(b) || 0) + 1);
      }
      const prof = [];
      for (const [b, s] of sum) if (cnt.get(b) >= 4) prof.push([b * BIN, s / cnt.get(b)]);
      if (prof.length < 40) continue;
      const mean = prof.reduce((a, p) => a + p[1], 0) / prof.length;
      const sd = Math.sqrt(prof.reduce((a, p) => a + (p[1] - mean) ** 2, 0) / prof.length);
      if (sd < 0.01) continue;
      for (let period = 0.9; period <= 1.16; period += 0.025) {
        let re = 0, im = 0;
        for (const [v, g] of prof) { const a = (2 * Math.PI * v) / period; re += (g - mean) * Math.cos(a); im += (g - mean) * Math.sin(a); }
        const sc = (2 * Math.hypot(re, im)) / prof.length / (sd * Math.SQRT2);
        if (sc > best.score) best = { score: sc, th, period };
        if (thExp != null) { let d = Math.abs(th - thExp) % Math.PI; d = Math.min(d, Math.PI - d); if (d < 0.44) exp = Math.max(exp, sc); }
      }
    }
    return { score: Math.round(best.score * 100) / 100, exp: Math.round(exp * 100) / 100, th: best.th, period: Math.round(best.period * 100) / 100, contrast: Math.round(contrast * 100) / 100, veg: Math.round((veg / n) * 100) / 100, n };
  };
  /** Windowed stripe scan: 2.4 x 2.4 m windows on a 1.2 m lattice inside the outline, each scanned on its own (cars, a bus,
   *  a shadow or a tram rail spoil a window, not the crossing). Returns { score: the 75th percentile of the windows'
   *  scores, good: share of windows >= 0.5, windows, th (median direction of the good windows) } or null. */
  const stripeWindows = (poly, skip = null) => {
    const pip = (x, z) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
    let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
    for (const [x, z] of poly) { xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z); }
    const W = [];
    for (let x = xa + 1.2; x <= xb - 1.0; x += 1.2) for (let z = za + 1.2; z <= zb - 1.0; z += 1.2) {
      if (!pip(x, z) || (skip && skip(x, z))) continue;
      const win = [[x - 1.2, z - 1.2], [x + 1.2, z - 1.2], [x + 1.2, z + 1.2], [x - 1.2, z + 1.2]];
      const clip = win.every(([a, b]) => pip(a, b)) ? win : null;       // whole windows only
      if (!clip) continue;
      const r = stripeScan(clip);
      if (r) W.push(r);
    }
    if (!W.length) { const r = stripeScan(poly); return r ? { score: r.score, good: r.score >= 0.5 ? 1 : 0, windows: 1, th: r.th } : null; }
    const sc = W.map((w) => w.score).sort((a, b) => a - b);
    const good = W.filter((w) => w.score >= 0.5);
    const ths = good.map((w) => w.th % Math.PI).sort((a, b) => a - b);
    return { score: sc[Math.floor((sc.length - 1) * 0.75)], good: Math.round((good.length / W.length) * 100) / 100, windows: W.length, th: ths.length ? ths[ths.length >> 1] : null };
  };
  return { at, greenAt, zebraScore, stripeScan, stripeWindows, x0, z0, px, W, H };
}

/** pipeline/verify_crossings.mjs: the photo record of one crossing (BM / Topo outline, or a band round an OSM node) */
const OSM_BAND = [3.5, 6.0];       // along x across (m): the outline scanned around an OSM node

export function photoOf(o, c, others = []) {
  let poly = c.poly;
  if (!poly) {
    const ax = Math.cos(c.axis), az = Math.sin(c.axis), bx = -az, bz = ax, [x, z] = c.c, [A, B] = OSM_BAND;
    poly = [[-A / 2, -B / 2], [A / 2, -B / 2], [A / 2, B / 2], [-A / 2, B / 2]].map(([u, v]) => [x + ax * u + bx * v, z + az * u + bz * v]);
  }
  // the bars run along the road: the profile's direction across them is the road axis + 90°
  const full = o.stripeScan(poly, ((c.axis + Math.PI / 2) % Math.PI + Math.PI) % Math.PI);
  if (!full) return null;
  const win = o.stripeWindows(poly);
  const useW = win && win.windows >= 4;
  // round 2 calibration (a contact sheet of the 103 records the first rule dropped: most had bars 1-3 m beside the
  // outline or lay in deep shadow): the outline grown by 3 m is scanned too (d = its windows' score), and the mean
  // grey (lum) tells deep shadow, where the photo cannot tell
  let cx = 0, cz = 0; for (const q of poly) { cx += q[0] / poly.length; cz += q[1] / poly.length; }
  const grown = poly.map(([x, z]) => { const dx = x - cx, dz = z - cz, L = Math.hypot(dx, dz) || 1; return [x + (dx / L) * 3, z + (dz / L) * 3]; });
  // (windows on ANOTHER crossing's outline, grown 1.5 m, are skipped: a neighbour's bars are not this one's)
  const pipR = (x, z, r) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
  const near = others.map((q) => { let ax = 0, az = 0; for (const p of q) { ax += p[0] / q.length; az += p[1] / q.length; } return q.map(([x, z]) => { const dx = x - ax, dz = z - az, L = Math.hypot(dx, dz) || 1; return [x + (dx / L) * 1.5, z + (dz / L) * 1.5]; }); });
  const gw = o.stripeWindows(grown, near.length ? (x, z) => near.some((q) => pipR(x, z, q)) : null);
  let lum = 0, n = 0;
  for (let i = 0; i < 40; i++) { const t = i / 40, a = poly[i % poly.length], b = poly[(i + 1) % poly.length]; const g = o.at(cx + (a[0] + (b[0] - a[0]) * t - cx) * 0.5, cz + (a[1] + (b[1] - a[1]) * t - cz) * 0.5); if (g != null) { lum += g; n++; } }
  return { s: useW ? win.score : full.score, e: full.exp, f: full.score, wm: win ? win.score : null, d: gw ? gw.score : null, lum: n ? Math.round((lum / n) * 100) / 100 : null,
    w: useW ? win.windows : 1, th: Math.round(((useW && win.th != null ? win.th : full.th) % Math.PI) * 1000) / 1000, veg: full.veg };
}

