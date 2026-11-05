// Pattern helpers for the material library (viewer/materials/library.js). All TSL, all antialiased by the pixel
// footprint `fw` (metres per pixel, from the world-space fwidth): every joint is a BOX-FILTERED coverage (tslkit
// filteredPulse), every per-unit value fades to its mean over a long smoothstep of the footprint, every relief fades
// out before its edges can alias. No hard LOD switch anywhere: the far look is the integral of the near one.
import { float, vec2, vec3, floor, fract, mix, min, max, abs, smoothstep, clamp, sqrt, select, mx_noise_float, sin, dot } from "three/tsl";
import { filteredPulse, hash2D } from "../tslkit.js";

/** -1..1 gradient noise */
export const n3 = (x, y, z) => mx_noise_float(vec3(x, y, z));
/** 0..1 noise */
export const n01 = (x, y, z) => mx_noise_float(vec3(x, y, z)).mul(0.5).add(0.5);
/** per-cell random in [0,1): the inputs are integer cell ids; taken modulo 1024 so far-away cells keep precision */
export const H2 = (a, b) => hash2D(vec2(fract(float(a).div(1024)).mul(1024), fract(float(b).div(1024)).mul(1024)));

/** Fade weight 0 (near) .. 1 (far) for a feature of size `unit` m: starts when a pixel is `lo` x the unit, done at `hi`. */
export const farK = (fw, unit, lo = 0.12, hi = 0.8) => smoothstep(float(unit).mul(lo), float(unit).mul(hi), fw);

/** Fade-out weight of a relief of size `unit` (it goes before its colour does: bump edges alias first). */
export const bumpK = (fw, unit) => float(1).sub(smoothstep(float(unit).mul(0.04), float(unit).mul(0.25), fw));

/**
 * Running-bond courses (bricks, ashlar, setts, slabs). a = along the course (m), b = across (up the wall / slope).
 * H = course height incl. joint, L = unit length incl. joint, J = joint width, stagger = row offset (0.5 = half bond),
 * vary = 0..1 random unit length per row (ashlar), seed = per-surface seed.
 * Returns { joint 0..1 (filtered coverage), tone, tone2 (per unit, fading to 0.5), edge (m from the unit's edge,
 * for arrises / pillows), id (vec2), fu, fv (0..1 inside the unit), far }.
 */
export function bond(a, b, fw, { H, L, J, stagger = 0.5, vary = 0, seed = 0 }) {
  H = float(H); L = float(L); J = float(J);
  const rf = b.div(H), row = floor(rf);
  const Lr = vary ? L.mul(H2(row, float(seed).add(5.0)).mul(vary).add(1.0 - vary * 0.5)) : L;
  const off = vary ? H2(row, float(seed).add(9.0)) : row.mul(stagger);
  const cf = a.div(Lr).add(off), col = floor(cf);
  // joints centred on the unit edges, box-filtered over the footprint
  const jv = filteredPulse(rf.add(J.div(H).mul(0.5)), float(0), J.div(H), fw.div(H));
  const ju = filteredPulse(cf.add(J.div(Lr).mul(0.5)), float(0), J.div(Lr), fw.div(Lr));
  const joint = float(1).sub(float(1).sub(jv).mul(float(1).sub(ju)));
  const fu = fract(cf), fv = fract(rf);
  const ex = min(fu, float(1).sub(fu)).mul(Lr), ey = min(fv, float(1).sub(fv)).mul(H);
  const edge = max(min(ex, ey).sub(J.mul(0.5)), 0.0);
  const far = farK(fw, min(H, Lr), 0.15, 0.9);
  const t0 = H2(col.add(float(seed).mul(17.0)), row), t1 = H2(col, row.add(float(seed).add(71.0)));
  return { joint, tone: mix(t0, float(0.5), far), tone2: mix(t1, float(0.5), far), raw: t0, raw2: t1, edge, id: vec2(col, row), fu, fv, far, Lr };
}

/**
 * Jittered cells (F1/F2 Worley on a staggered grid): setts, gravel. Cell size sx x sy (m), jitter 0..1.
 * Returns { F1, edge (half F2-F1, ~ m to the border), id, rx, rz (offset to the centre, m) }.
 */
export function cells(a, b, sx, sy, jitter = 0.8, rowJitter = true) {
  const gy = b.div(sy), row0 = floor(gy);
  let F1 = float(9), F2 = float(9), id = vec2(0, 0), rx = float(0), rz = float(0);
  for (let dj = -1; dj <= 1; dj++) {
    const r = row0.add(dj);
    const len = rowJitter ? H2(r, 3.0).mul(0.55).add(0.75).mul(sx) : float(sx);
    const gx = a.div(len).add(rowJitter ? H2(r, 9.0) : float(0));
    const c0 = floor(gx);
    for (let di = -1; di <= 1; di++) {
      const c = c0.add(di);
      const h1 = H2(c, r), h2 = H2(c.add(57.0), r.add(113.0));
      const px = c.add(0.5).add(h1.sub(0.5).mul(jitter)).sub(gx).mul(len);
      const pz = r.add(0.5).add(h2.sub(0.5).mul(jitter * 0.75)).sub(gy).mul(sy);
      const d = sqrt(px.mul(px).add(pz.mul(pz)));
      const closer = d.lessThan(F1);
      F2 = select(closer, F1, min(F2, d));
      id = select(closer, vec2(c, r), id);
      rx = select(closer, px, rx); rz = select(closer, pz, rz);
      F1 = min(F1, d);
    }
  }
  return { F1, edge: F2.sub(F1).mul(0.5), id, rx, rz };
}

/** Coverage of a thin line where |v| < w (v a smooth field in metres, e.g. a noise iso-line scaled), AA by its own fwidth. */
export function isoLine(v, w, fwv) {
  return float(1).sub(smoothstep(float(w).sub(fwv), float(w).add(fwv), abs(v)));
}

/** Standing-seam / batten roll profile across `a` (period P m, seam width W m): { seam 0..1 coverage, height m }. */
export function seams(a, P, W, h, fw) {
  const x = a.div(P);
  const seam = filteredPulse(x.add(float(W).div(P).mul(0.5)), float(0), float(W).div(P), fw.div(P));
  const d = abs(fract(x.add(0.5)).sub(0.5)).mul(P);                 // m from the seam centre
  const prof = float(1).sub(smoothstep(float(W).mul(0.25), float(W).mul(0.6), d));
  return { seam, height: prof.mul(h), d };
}

/** Vertical rain streaks: thin, long noise (x across, y down), 0..1. */
export function streakNoise(x, y, seed = 0) {
  const s1 = n01(x.mul(9.0), y.mul(0.35), float(seed));
  const s2 = n01(x.mul(23.0), y.mul(0.8), float(seed).add(4.0));
  return smoothstep(0.45, 0.85, s1.mul(0.65).add(s2.mul(0.35)));
}

/** Wood grain: ring field along `along`, figure across. 0..1 lines (fade with fw). */
export function woodGrain(along, across, fw, seed = 0) {
  const w = n3(along.mul(0.6), across.mul(3.0), float(seed)).mul(0.35);
  const ring = fract(across.mul(38.0).add(w.mul(6.0)).add(n3(along.mul(2.0), across.mul(8.0), float(seed).add(3)).mul(0.6)));
  const line = smoothstep(0.0, 0.25, ring).mul(smoothstep(1.0, 0.6, ring));
  const fade = smoothstep(0.0008, 0.006, fw);
  return mix(line, float(0.55), fade);
}

/** sin-hash for a non-integer scalar (only for stable, non-interpolated inputs) */
export const hash1 = (x) => fract(sin(dot(vec2(x, 0.37), vec2(127.1, 311.7))).mul(43758.5453));
export { clamp };
