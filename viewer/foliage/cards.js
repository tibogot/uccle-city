// LEAF CARD TEXTURES, drawn in code (canvas) per species, with COVERAGE-PRESERVING MIPS (Castaño, The Witness;
// game-engine-v1 v3/render/foliage/alphaCoverageMips.js; our impostor kit's lesson: the crawling dots on far foliage
// came from alpha that thins down the mip chain and flips MSAA samples as the camera moves).
// Each card is a small spray of leaves: RGB = a grey shade per leaf (darker toward the spray's heart, a lighter midrib)
// that the material multiplies into the species colour; A = the leaf mask. Each mip level's alpha is scaled so the
// share of texels passing 0.5 equals level 0's: the leaves get fatter as they get blurrier, the spray keeps its weight.
import * as THREE from "three/webgpu";

const SPECIES = {
  privet: { n: 22, len: [0.16, 0.22], wid: 0.42, tip: 0.5 },
  beech: { n: 13, len: [0.22, 0.3], wid: 0.55, tip: 0.65, serr: true },
  hornbeam: { n: 13, len: [0.2, 0.28], wid: 0.5, tip: 0.75, serr: true },
  laurel: { n: 7, len: [0.34, 0.44], wid: 0.36, tip: 0.6 },
  box: { n: 34, len: [0.09, 0.13], wid: 0.6, tip: 0.35 },
  ivy: { n: 6, len: [0.3, 0.38], wid: 0.95, tip: 0.6, lobed: true },
  generic: { n: 16, len: [0.18, 0.26], wid: 0.45, tip: 0.55 },
};

function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; }; }

function drawSpray(sp, size, seed) {
  const c = new OffscreenCanvas(size, size), g = c.getContext("2d");
  const R = rng(seed), cx = size / 2;
  g.clearRect(0, 0, size, size);
  for (let k = 0; k < sp.n; k++) {
    // leaves fanned round the centre, the outer ones pointing out
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * size * 0.26;
    const x = cx + Math.cos(a) * rr, y = cx + Math.sin(a) * rr;
    const L = size * (sp.len[0] + (sp.len[1] - sp.len[0]) * R()), W = L * sp.wid * 0.5;
    const rot = a + (R() - 0.5) * 0.9;
    const shade = 0.62 + 0.38 * Math.min(1, rr / (size * 0.26)) * (0.7 + 0.3 * R());
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath();
    if (sp.lobed) {                         // ivy: 3-5 lobed
      for (let i = 0; i <= 10; i++) { const t = (i / 10) * Math.PI * 2, lob = 0.75 + 0.25 * Math.cos(t * 5 / 2) ** 2; g.lineTo(Math.cos(t) * L * 0.5 * lob, Math.sin(t) * L * 0.5 * lob); }
    } else {
      const N = 18;
      for (let i = 0; i <= N; i++) {
        const t = i / N, s = Math.sin(Math.PI * Math.pow(t, sp.tip)) * W * (sp.serr && i % 2 ? 0.88 : 1);
        g.lineTo(t * L, -s);
      }
      for (let i = N; i >= 0; i--) { const t = i / N, s = Math.sin(Math.PI * Math.pow(t, sp.tip)) * W * (sp.serr && i % 2 ? 0.88 : 1); g.lineTo(t * L, s); }
    }
    g.closePath();
    const v = Math.round(shade * 255);
    g.fillStyle = `rgb(${v},${v},${v})`; g.fill();
    // midrib
    g.strokeStyle = `rgba(255,255,255,0.35)`; g.lineWidth = Math.max(1, size / 160);
    g.beginPath(); g.moveTo(sp.lobed ? -L * 0.4 : 0, 0); g.lineTo(sp.lobed ? L * 0.4 : L * 0.9, 0); g.stroke();
    g.restore();
  }
  return c;
}

/** a DataTexture with hand-built coverage-preserving mips; cut = the alpha the shader tests / ramps around */
function coverageMipped(canvas, cut = 0.5) {
  const W = canvas.width, src = canvas.getContext("2d").getImageData(0, 0, W, W).data;
  const levels = [];
  let w = W, rgba = new Float32Array(W * W * 4);
  for (let i = 0; i < W * W * 4; i++) rgba[i] = src[i] / 255;
  // empty texels take the mean shade, so filtering never drags a dark halo in
  let ms = 0, mn = 0; for (let i = 0; i < W * W; i++) if (rgba[i * 4 + 3] > 0.5) { ms += rgba[i * 4]; mn++; }
  const meanShade = mn ? ms / mn : 0.8;
  for (let i = 0; i < W * W; i++) if (rgba[i * 4 + 3] < 0.02) rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = meanShade;
  const cov = (a) => { let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i] >= cut) n++; return n / (a.length / 4); };
  const target = cov(rgba);
  const pack = (a, w) => { const d = new Uint8Array(w * w * 4); for (let i = 0; i < d.length; i++) d[i] = Math.round(Math.min(1, Math.max(0, a[i])) * 255); return { data: d, width: w, height: w }; };
  levels.push(pack(rgba, w));
  while (w > 1) {
    const h = w >> 1, next = new Float32Array(h * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
      let r = 0, a = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y * 2 + dy) * w + x * 2 + dx) * 4; r += rgba[i] * Math.max(rgba[i + 3], 0.02); a += rgba[i + 3]; }
      const o = (y * h + x) * 4, wsum = a + 1e-6;
      const sh = r / Math.max(wsum, 0.08);
      next[o] = next[o + 1] = next[o + 2] = a > 0.02 ? Math.min(1, sh) : meanShade; next[o + 3] = a / 4;
    }
    // scale alpha so the coverage at `cut` matches level 0
    let lo = 0, hi = 8;
    for (let it = 0; it < 14; it++) { const s = (lo + hi) / 2; let n = 0; for (let i = 3; i < next.length; i += 4) if (next[i] * s >= cut) n++; if (n / (h * h) < target) lo = s; else hi = s; }
    const s = (lo + hi) / 2;
    for (let i = 3; i < next.length; i += 4) next[i] = Math.min(1, next[i] * s);
    rgba = next; w = h;
    levels.push(pack(rgba, w));
  }
  const tex = new THREE.DataTexture(levels[0].data, W, W, THREE.RGBAFormat);
  tex.mipmaps = levels;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const cache = {};
/** the leaf-spray card texture of a species (privet, beech, hornbeam, laurel, box, ivy, generic) */
export function leafCard(species = "generic", size = 128) {
  const k = species + size;
  if (!cache[k]) cache[k] = coverageMipped(drawSpray(SPECIES[species] ?? SPECIES.generic, size, species.length * 7919 + size));
  return cache[k];
}
