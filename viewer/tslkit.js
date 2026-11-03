// Small TSL building blocks shared by our materials.
//
// hash2D, noise2D, bumpNormal, filteredPulse and boxCoverage are ported from
// mrdoob/slop-newyork js/tsl-materials.js (MIT License, Copyright (c) 2026 Mr.doob):
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
//   associated documentation files (the "Software"), to deal in the Software without restriction, including
//   without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
//   following conditions: The above copyright notice and this permission notice shall be included in all
//   copies or substantial portions of the Software.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
import { Fn, float, vec2, fract, sin, dot, floor, mix, max, clamp, positionView, normalView } from "three/tsl";

/** Deterministic 2D -> [0,1) hash. */
export const hash2D = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)));

/** Smooth value noise, [0,1]. */
export const noise2D = Fn(([p]) => {
  const pv = vec2(p).toVar();
  const i = floor(pv).toVar();
  const f = fract(pv).toVar();
  const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0))).toVar();
  const a = hash2D(i), b = hash2D(i.add(vec2(1, 0))), c = hash2D(i.add(vec2(0, 1))), d = hash2D(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

/** Surface-gradient bump (Mikkelsen): scalar height in metres -> perturbed view-space normal. No tangents needed. */
export const bumpNormal = Fn(([height]) => {
  const h = float(height).toVar();
  const dpdx = positionView.dFdx(), dpdy = positionView.dFdy();
  const r1 = dpdy.cross(normalView), r2 = normalView.cross(dpdx);
  const det = dpdx.dot(r1);
  const grad = det.sign().mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)));
  return det.abs().mul(normalView).sub(grad).normalize();
});

/** Box-filtered coverage of the repeating band fract(x) in [a, b] over a footprint w (exact AA, no moiré). */
export const filteredPulse = Fn(([x, a, b, w]) => {
  const p = float(x).toVar(), lo = float(a).toVar(), hi = float(b).toVar();
  const hw = max(float(w), 0.0001).mul(0.5).toVar();
  const integral = (t) => floor(t).mul(hi.sub(lo)).add(clamp(fract(t), lo, hi).sub(lo));
  return integral(p.add(hw)).sub(integral(p.sub(hw))).div(hw.mul(2.0));
});

/** Share of [x - s, x + s] inside the single interval [a, b]. */
export const boxCoverage = Fn(([x, a, b, s]) => {
  const xv = float(x).toVar(), sv = max(float(s), 0.001).toVar();
  return clamp(xv.add(sv).min(b).sub(xv.sub(sv).max(a)).div(sv.mul(2.0)), 0.0, 1.0);
});
