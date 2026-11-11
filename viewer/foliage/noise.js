// A small tileable noise texture shared by every foliage system (grass, plants, hedges, ivy, the ground's grass
// colour). Generated in JS at load (deterministic, no file): 256 x 256 RGBA8, each channel a different tileable
// value-noise FBM so one tap gives four uncorrelated fields:
//   R, G: wind gusts (two scales, the wind module scrolls them)     B: colour patches (~ metres)     A: fine variation
// Sampled with `.level(0)` in compute (no derivatives there).
import * as THREE from "three/webgpu";
import { texture } from "three/tsl";

const N = 256;

function hash(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** tileable value noise with period `p` cells over the N-pixel texture */
function valueNoise(x, y, p, seed) {
  const fx = (x / N) * p, fy = (y / N) * p;
  const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const g = (i, j) => hash(((i % p) + p) % p, ((j % p) + p) % p, seed);
  const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

function fbm(x, y, p, oct, seed) {
  let s = 0, w = 0.5, tw = 0;
  for (let o = 0; o < oct; o++) { s += valueNoise(x, y, p << o, seed + o * 17) * w; tw += w; w *= 0.5; }
  return s / tw;
}

let tex = null;
/** the shared THREE.DataTexture (RepeatWrapping, linear, mipmapped) */
export function noiseTexture() {
  if (tex) return tex;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    // stretch the FBM's narrow range (~0.3-0.7) to 0..1
    const st = (v) => Math.max(0, Math.min(255, Math.round(((v - 0.5) * 2.2 + 0.5) * 255)));
    data[i] = st(fbm(x, y, 4, 4, 11));
    data[i + 1] = st(fbm(x, y, 8, 3, 23));
    data[i + 2] = st(fbm(x, y, 4, 4, 37));
    data[i + 3] = st(fbm(x, y, 16, 3, 51));
  }
  tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** TSL: the four noises at a world xz scaled by `scale` (1 texture = 1/scale metres). In compute pass level0 = true. */
export function noiseAt(xz, scale, level0 = false) {
  const t = texture(noiseTexture(), xz.mul(scale));
  return level0 ? t.level(0) : t;
}
