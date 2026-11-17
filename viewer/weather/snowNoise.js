// SNOW NOISE, BAKED (claude/snow2, docs/SNOW2.md; ?snowfast=old = the procedural noise2D as before). The snow cover's
// noises (the cover mask, the thin-snow drift, the micro bump) were value noise computed per pixel (4 sin hashes a
// lookup, 2-4 lookups in the colour AND again in the normal of every lit material while it snows). Here they are baked
// once at boot into two small tiling textures (periodic value noise, the same smoothstep interpolation) and read with
// ONE filtered fetch each. Mipmapped: far away a lookup averages to its mean instead of aliasing.
//
//   T1 (512^2 RGBA8, 32 coarse cells across, 53.3 m at 0.6 / m):
//     R  cover mask   0.4 x N(32 cells) + 0.6 x N(128 cells)      = the old noise2D(0.6) x 0.4 + noise2D(2.7) x 0.6
//     G  drift        0.7 x N(24 cells) + 0.3 x N(96 cells)       = the old noise2D(0.45) x 0.7 + noise2D(1.9) x 0.3
//     B  coarse only  N(32 cells)                                  = the old lite path's noise2D(0.6)
//     A  streaks      N(32 cells), another seed                   (steep roofs: stretched down the fall line)
//   the micro bump reads B at its own scale (bump()); ONE texture: a second one put the facade kit's material over
//   WebGPU's 16 samplers per fragment stage (its pipeline failed: found in the city)
//
// Samplers take an explicit mip level from the pixel footprint (fw, metres): they are safe inside per-pixel branches
// (WGSL forbids implicit-derivative sampling there).
import * as THREE from "three/webgpu";
import { texture, vec2, float, log2, max } from "three/tsl";

export const SNOW_FAST = !/[?&]snowfast=old(&|$)/.test(location.search);

const N1 = 512;
export const T1_PERIOD = 32 / 0.6;           // m: 53.33 (the coarse cover octave at 0.6 / m)

function rng(seed) {                          // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** periodic value noise: `cells` lattice cells across a size x size texture -> Float32Array (and its gradient per cell) */
function valueNoise(size, cells, seed, grad = false) {
  const r = rng(seed), L = new Float32Array(cells * cells);
  for (let i = 0; i < L.length; i++) L[i] = r();
  const out = new Float32Array(size * size), gx = grad ? new Float32Array(size * size) : null, gz = grad ? new Float32Array(size * size) : null;
  const k = cells / size;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) * k, j = Math.floor(v), fy = v - j, j0 = j % cells, j1 = (j + 1) % cells;
    const sy = fy * fy * (3 - 2 * fy), dsy = 6 * fy * (1 - fy);
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) * k, i = Math.floor(u), fx = u - i, i0 = i % cells, i1 = (i + 1) % cells;
      const sx = fx * fx * (3 - 2 * fx), dsx = 6 * fx * (1 - fx);
      const a = L[j0 * cells + i0], b = L[j0 * cells + i1], c = L[j1 * cells + i0], d = L[j1 * cells + i1];
      const o = y * size + x;
      out[o] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
      if (grad) { gx[o] = dsx * ((b - a) * (1 - sy) + (d - c) * sy); gz[o] = dsy * ((c - a) * (1 - sx) + (d - b) * sx); }
    }
  }
  return grad ? { v: out, gx, gz } : out;
}
const u8 = (x) => Math.max(0, Math.min(255, Math.round(x * 255)));

function makeTex(data, n) {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

let T1 = null;
function build() {
  if (T1) return;
  const t0 = performance.now();
  const c32 = valueNoise(N1, 32, 11), c128 = valueNoise(N1, 128, 12), d24 = valueNoise(N1, 24, 13), d96 = valueNoise(N1, 96, 14), s32 = valueNoise(N1, 32, 15);
  const a = new Uint8Array(N1 * N1 * 4);
  for (let o = 0; o < N1 * N1; o++) {
    a[o * 4] = u8(c32[o] * 0.4 + c128[o] * 0.6);
    a[o * 4 + 1] = u8(d24[o] * 0.7 + d96[o] * 0.3);
    a[o * 4 + 2] = u8(c32[o]);
    a[o * 4 + 3] = u8(s32[o]);
  }
  T1 = makeTex(a, N1);
  snowNoise.buildMs = +(performance.now() - t0).toFixed(1);
}

/** mip level for a texture of `texelM` metres per texel at a footprint fw (m per pixel) */
const lodFor = (fw, texelM) => log2(max(float(fw).div(texelM), 1));

export const snowNoise = {
  buildMs: 0,
  /** T1 at world xz (m) -> vec4 (R mask, G drift, B coarse, A streak noise), all 0..1. scale: lookups per metre multiplier */
  t1(xz, fw, scale = 1) {
    build();
    const k = scale / T1_PERIOD;
    return texture(T1, vec2(xz).mul(k)).level(lodFor(fw, T1_PERIOD / N1 / scale));
  },
  /** the micro bump at `freq` cells per metre: { v: value 0..1, g: vec2 d/dx, d/dz per metre } from the coarse
   *  channel (B) at that scale, the gradient by two more taps a third of a cell away (no screen derivatives; ONE
   *  texture / sampler for everything: the facade kit's material sits at WebGPU's 16-samplers-per-stage limit) */
  bump(xz, fw, freq, grad = true) {
    build();
    const sc = freq / 0.6, lod = lodFor(fw, T1_PERIOD / N1 / sc), k = sc / T1_PERIOD;
    const at = (p) => texture(T1, vec2(p).mul(k)).level(lod).z;
    const v = at(xz);
    if (!grad) return { v, g: vec2(0) };
    const e = 0.33 / freq;
    return { v, g: vec2(at(vec2(xz).add(vec2(e, 0))).sub(v), at(vec2(xz).add(vec2(0, e))).sub(v)).div(e) };
  },
};
