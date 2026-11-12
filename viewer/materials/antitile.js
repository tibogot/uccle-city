// ANTI-TILING for the library's scans: hex-tile sampling (Mikkelsen 2022, "Practical Real-Time Hex-Tiling", JCGT 11(2);
// after Heitz & Neyret 2018 "High-Performance By-Example Noise using a Histogram-Preserving Blending Operator").
// The plane is covered by a triangle grid; each grid vertex owns a hexagonal tile of the texture with its own random
// offset (and, for isotropic scans, rotation); a pixel blends the 3 tiles of its triangle with weights sharpened by
// the texture's own luminance, so the blend zones follow the content instead of showing soft ghosted seams.
// 3 taps per map (explicit gradients: no mip seams at the tile borders), no lookup table, no precompute.
//
// STRUCTURED scans (bricks, ashlar, slates, setts, tiles: the candidate's `lattice` = [units across, courses up] per
// repeat, measured by tools/textures/candidates.py) get NO rotation and vertical offsets SNAPPED to pairs of courses
// (horizontal: whole units when measured, else free): every tile's bed joints land on the same lines, so the blend
// mixes brick faces, not joints, and the repeat is gone. ISOTROPIC scans (asphalt, render, metal, rock, concrete) get free offsets + rotation.
// Per tile also a small tone shift (+-`tone`): the per-unit variation layer of a real wall, at no extra cost.
import { Fn, float, vec2, vec3, vec4, floor, fract, dot, mix, abs, sin, cos, pow, max, clamp, texture } from "three/tsl";

/** sin-free hash (Dave Hoskins' hash22) of an integer cell, wrapped mod 1024 so big ids keep float precision */
export const hash22 = (p) => {
  const q = fract(p.div(1024)).mul(1024);
  const p3 = fract(vec3(q.x, q.y, q.x).mul(vec3(0.1031, 0.103, 0.0973)));
  const p4 = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(vec2(p4.x.add(p4.y).mul(p4.z), p4.x.add(p4.z).mul(p4.y)));
};

const SQ3x2 = 2 * Math.sqrt(3);

/**
 * Hex-tiled sample of an albedo map and an nra map (normal x,y + roughness + AO) at `st` (texture repeats).
 * opts: { lattice: [nx, ny] | null, rotate 0..1, rate (hex tiles per repeat, ~1), contrast 0..1, exp, tone }
 * Returns { A: vec4 albedo, R: vec4 nra with the normal x,y rotated back into the surface frame }.
 */
export function hexSample(albedoTex, nraTex, st, opts = {}) {
  const { lattice = null, rotate = lattice ? 0 : 1, rate = 1, contrast = 0.6, exp = 7, tone = 0.06 } = opts;
  const dx = st.dFdx(), dy = st.dFdy();
  // the triangle grid (Mikkelsen's TriangleGrid)
  const g = st.mul(SQ3x2 * rate);
  const sk = vec2(g.x.sub(g.y.mul(0.57735027)), g.y.mul(1.15470054));
  const base = floor(sk), f = fract(sk);
  const tz = float(1).sub(f.x).sub(f.y);
  const s = max(float(0), tz.negate()).ceil().min(1);          // step(0, -tz) without the knife edge at 0
  const s2 = s.mul(2).sub(1);
  const w = [tz.negate().mul(s2), s.sub(f.y.mul(s2)), s.sub(f.x.mul(s2))];
  const verts = [base.add(vec2(s, s)), base.add(vec2(s, float(1).sub(s))), base.add(vec2(float(1).sub(s), s))];
  const taps = verts.map((v) => {
    // hex centre in st
    const cen = vec2(v.x.add(v.y.mul(0.5)), v.y.mul(1 / 1.15470054)).div(SQ3x2 * rate);
    const h = hash22(v), h2 = hash22(v.add(vec2(71, 113)));
    let off;
    if (lattice) {
      // offsets in pairs of courses up (the bed joints stay on the same lines) and in whole units across when the
      // unit count was measured (else free: a doubled head joint in a narrow blend zone reads as a short brick)
      const nx = lattice[0], ny2 = Math.max(1, Math.round(lattice[1] / 2));
      off = vec2(nx > 1 ? floor(h.x.mul(nx)).div(nx) : h.x, floor(h.y.mul(ny2)).div(ny2));
    } else off = h;
    let uvT, gx = dx, gy = dy, cs = float(1), sn = float(0);
    if (rotate) {
      const a = h2.x.sub(0.5).mul(2 * Math.PI * rotate);
      cs = cos(a); sn = sin(a);
      const rot = (u) => vec2(u.x.mul(cs).sub(u.y.mul(sn)), u.x.mul(sn).add(u.y.mul(cs)));
      uvT = rot(st.sub(cen)).add(cen).add(off);
      gx = rot(dx); gy = rot(dy);
    } else uvT = st.add(off);
    const A = texture(albedoTex, uvT).grad(gx, gy);
    const R = texture(nraTex, uvT).grad(gx, gy);
    // the normal was sampled in the rotated frame: rotate its x,y back (transpose)
    let nx2 = R.r.mul(2).sub(1), ny2 = R.g.mul(2).sub(1);
    if (rotate) { const rx = nx2.mul(cs).add(ny2.mul(sn)), ry = ny2.mul(cs).sub(nx2.mul(sn)); nx2 = rx; ny2 = ry; }
    const t = h2.y.sub(0.5).mul(2 * tone).add(1);                 // per-tile tone
    return { A, R, n: vec2(nx2, ny2), t };
  });
  // luminance-sharpened weights (Mikkelsen: Dw = mix(1, lum, contrast); W = Dw * w^exp)
  const lw = vec3(0.299, 0.587, 0.114);
  const W = taps.map((tp, i) => mix(float(1), dot(tp.A.rgb, lw), contrast).mul(pow(clamp(w[i], 0, 1), float(exp))));
  const sum = W[0].add(W[1]).add(W[2]).max(1e-6);
  const k = W.map((x) => x.div(sum));
  const blend = (fn) => fn(taps[0]).mul(k[0]).add(fn(taps[1]).mul(k[1])).add(fn(taps[2]).mul(k[2]));
  const A = blend((tp) => vec4(tp.A.rgb.mul(tp.t), tp.A.a));
  const nrm = blend((tp) => tp.n);
  const rest = blend((tp) => vec2(tp.R.b, tp.R.a));
  return { A, R: vec4(nrm.mul(0.5).add(0.5), rest.x, rest.y), n: nrm };
}
