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
  return { at, zebraScore, x0, z0, px, W, H };
}
