// THE PUBLIC ART KIT: the model (tools/blender/publicart.py -> tools/publicart_pack.mjs -> models/publicart/publicart.glb),
// its baked maps and its materials (docs/publicart/PUBLIC_ART_KIT.md). Loaded by viewer/publicart/artCity.js.
//
// The GLB carries geometry only: nodes "<piece>_lod<k>", one primitive per NAMED slot. LOD0: TEXCOORD_0 metres per face
// (lettered faces: 1000 (cell + 1) + s, v = t in metres), TEXCOORD_1 the kit atlas (publicart_nrm.jpg tangent-space normals
// baked from the sculpts, publicart_ao.png ambient occlusion: each piece baked alone on its ground). LOD1 / LOD2: welded,
// vertex AO in COLOR_0.a, no UVs. COLOR_0.r = code / 16 + 1/32 (LOD0 only: CODES).
// Materials are ours, by slot (TSL, no texture in the GLB): the weathered blue stone (split / sawn / lettered / the
// milestone's medallion with its numeral / the Burgundy cross), the Gobert memorial's pale stone (ashlar joints, incised
// letters, gilt dates) and its cream sandstone walls (the library's shipped sandstone scan when loaded), brushed stainless
// steel, black iron, patinated bronze, dolomite gravel, the planted beds, clipped hornbeam (by season). Every one: the
// baked AO (lighting + a share on the colour), the weather layer (wxMat), geometric specular anti-aliasing.
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, vec2, vec3, vec4, float, int, mix, smoothstep, clamp, abs, dot, max, min, floor, fract, select, Fn, length, atan,
  normalView, positionView, positionWorld, positionGeometry, normalGeometry, normalWorld, fwidth, uniform, uniformArray, sin, sqrt,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { loadAO } from "../stpierreModel.js";
import { season } from "../foliage/seasons.js";
import { wxMat } from "../weather/cityWeatherize.js";

export const CODES = ["plain", "split", "kerb", "letters", "medallion", "ashlar", "cross", "gilt", "relief", "coping", "step", "chain", "drill"];
const CD = Object.fromEntries(CODES.map((n, i) => [n, i]));
/** live look controls */
export const artLook = { ao: uniform(1.0), aoDirect: uniform(0.5), normal: uniform(1.0), letters: uniform(1.0) };
/** the milestones' medallion numerals: up to 4 instances (x, z, atlas cell) set by artCity.js; nearest wins */
export const MEDALLIONS = uniformArray([0, 1, 2, 3].map(() => new THREE.Vector4(1e6, 1e6, 0, 0)), "vec4");

const BASE = new URL("../../models/publicart/", import.meta.url).href;
let promise = null;
export function loadArtKit() {
  return (promise ??= (async () => {
    const t0 = performance.now();
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, info, site, aoTex, nrmTex, letters, cells] = await Promise.all([
      loader.loadAsync(BASE + "publicart.glb"),
      fetch(BASE + "publicart.json").then((r) => r.json()),
      fetch(BASE + "site.json").then((r) => r.json()),
      loadAO(BASE + "publicart_ao.png"),
      new THREE.TextureLoader().loadAsync(BASE + "publicart_nrm.jpg").then((t) => {
        t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; t.needsUpdate = true; return t;
      }),
      new THREE.TextureLoader().loadAsync(BASE + "publicart_letters.png").then(toR8),
      fetch(BASE + "publicart_letters.json").then((r) => r.json()),
    ]);
    const pieces = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let m = null;
      for (let q = o; q && !m; q = q.parent) m = /^(.*)_lod(\d)$/.exec(q.name);
      if (!m) return;
      const [, piece, k] = m;
      o.geometry.computeBoundingSphere(); o.geometry.computeBoundingBox();
      o.geometry.userData.shared = true;
      (pieces[piece] ??= { name: piece, lods: [] });
      (pieces[piece].lods[+k] ??= []).push({ slot: o.material.name, geometry: o.geometry });
    });
    for (const p of Object.values(pieces)) {
      p.tris = p.lods.map((l) => l.reduce((s, x) => s + x.geometry.index.count / 3, 0));
      p.draws = p.lods.map((l) => l.length);
      p.range = info.lods?.[p.name]?.range ?? [30, 90, 300];
    }
    const L = { tex: letters, cells: cells.cells, size: cells.size };
    const scanP = waitScan("stone_white", 6000);
    const scan = await scanP;
    const materials = {};
    const slotMaterial = (slot, vertexAo) => (materials[`${slot}|${vertexAo ? "v" : "t"}`] ??= make(slot, vertexAo, { aoTex, nrmTex, L, scan }));
    return { name: "publicart", pieces, info, site, aoTex, nrmTex, letters, ranges: [30, 90, 300], slotMaterial, materials, loadMs: performance.now() - t0,
      bytes: { glb: info.glb_bytes ?? 0, ao: aoTex.userData.bytes ?? 0 } };
  })());
}

/** the library's shipped scan of `name` (viewer/materials/scans.js, loaded by main.js at boot), waiting up to `ms` */
async function waitScan(name, ms) {
  try {
    const { SCANS } = await import("../materials/scans.js");
    for (let t = 0; t < ms && !SCANS[name]; t += 250) await new Promise((r) => setTimeout(r, 250));
    return SCANS[name] ?? null;
  } catch { return null; }
}

/** the lettering mask as one 8-bit channel (no flip: the image's top row is v = 0) */
function toR8(tex) {
  const img = tex.image, w = img.width, h = img.height;
  const cv = new OffscreenCanvas(w, h), cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const rgba = cx.getImageData(0, 0, w, h).data, r = new Uint8Array(w * h);
  for (let i = 0; i < r.length; i++) r[i] = rgba[i * 4];
  const t = new THREE.DataTexture(r, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  tex.dispose();
  return t;
}

// ------------------------------------------------------------------------------------------------ shared nodes
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };       // (THREE.Color: sRGB hex -> linear)
let NOISE = null;
/** a small tiling value-noise texture (R 1 m, G 25 cm, B 6 cm at a 4 m tile; A vertical streaks): mipmapped, so the detail
 *  averages out with distance by itself (no sparkle) */
function noiseTex() {
  if (NOISE) return NOISE;
  const S = 256, d = new Uint8Array(S * S * 4);
  let seed = 17;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const oct = (cells, sx = 1, sy = 1) => {
    const cx = Math.max(1, Math.round(cells * sx)), cy = Math.max(1, Math.round(cells * sy)), g = Array.from({ length: cx * cy }, rnd);
    const at = (i, j) => g[((j % cy) + cy) % cy * cx + ((i % cx) + cx) % cx], f = (t) => t * t * (3 - 2 * t);
    return (x, y) => { const u = (x / S) * cx, v = (y / S) * cy, i = Math.floor(u), j = Math.floor(v), a = f(u - i), b = f(v - j);
      return (at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b; };
  };
  const o = [oct(4), oct(8), oct(16), oct(32), oct(64), oct(128), oct(64, 1, 0.125), oct(128, 1, 0.0625)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    d[i] = 255 * (0.6 * o[0](x, y) + 0.4 * o[1](x, y)); d[i + 1] = 255 * (0.6 * o[2](x, y) + 0.4 * o[3](x, y));
    d[i + 2] = 255 * (0.6 * o[4](x, y) + 0.4 * o[5](x, y)); d[i + 3] = 255 * (0.5 * o[6](x, y) + 0.5 * o[7](x, y));
  }
  NOISE = new THREE.DataTexture(d, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  NOISE.wrapS = NOISE.wrapT = THREE.RepeatWrapping; NOISE.generateMipmaps = true;
  NOISE.minFilter = THREE.LinearMipmapLinearFilter; NOISE.magFilter = THREE.LinearFilter; NOISE.anisotropy = 4; NOISE.needsUpdate = true;
  return NOISE;
}
/** the world position on the plane the normal faces most (metres) */
const planar = () => { const n = abs(normalWorld), p = positionWorld; return select(n.y.greaterThan(max(n.x, n.z)), p.xz, select(n.x.greaterThan(n.z), p.zy, p.xy)); };
const codeOf = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (c, k) => float(1).sub(clamp(abs(c.sub(k)), 0, 1));

/** a lettering cell's mask at (s, t) metres on its face (0 outside the cell) */
function cellMask(L, cellIdx, s, t) {
  const c = L.cells[cellIdx], [x0, y0, x1, y1] = c.px, [W, H] = c.size_m;
  const inside = step01(s, 0, W).mul(step01(t, 0, H));
  const a = vec2(float(x0).add(s.div(W).clamp(0, 1).mul(x1 - x0)).div(L.size[0]), float(y1).sub(t.div(H).clamp(0, 1).mul(y1 - y0)).div(L.size[1]));
  return texture(L.tex, a).r.mul(inside);
}
const step01 = (x, a, b) => smoothstep(a - 0.002, a + 0.002, x).mul(float(1).sub(smoothstep(b - 0.002, b + 0.002, x)));
/** the lettered faces' mask (codes letters / gilt): TEXCOORD_0.x = 1000 (cell + 1) + s */
function lettersMask(L) {
  const w = uv(0);
  const cell = floor(w.x.div(1000)).sub(1), s = w.x.sub(cell.add(1).mul(1000)), t = w.y;
  let m = float(0);
  for (let k = 0; k < 5; k++) m = m.add(cellMask(L, k, s, t).mul(float(1).sub(clamp(abs(cell.sub(k)), 0, 1))));
  return m.mul(smoothstep(900, 950, w.x));
}

/** the baked tangent-space normal map in the atlas (TEXCOORD_1), frame from screen derivatives (instancing-safe) */
function mappedNormal(nrmTex) {
  return Fn(() => {
    const t = uv(1);
    const n = texture(nrmTex, t).xyz.mul(2).sub(1).toVar();
    n.assign(vec3(n.x.mul(artLook.normal), n.y.mul(artLook.normal).negate(), n.z).normalize());   // (Blender bake + glTF v flip: green inverted)
    const N = normalView.toVar();
    const q0 = positionView.dFdx(), q1 = positionView.dFdy(), s0 = t.dFdx(), s1 = t.dFdy();
    const q1p = q1.cross(N), q0p = N.cross(q0);
    const T = q1p.mul(s0.x).add(q0p.mul(s1.x)), B = q1p.mul(s0.y).add(q0p.mul(s1.y));
    const det = max(dot(T, T), dot(B, B)), k = select(det.equal(0), float(0), det.inverseSqrt());
    return T.mul(k).mul(n.x).add(B.mul(k).mul(n.y)).add(N.mul(n.z)).normalize();
  })();
}

/** a height (m) as a surface-gradient bump on top of a view-space normal node */
function bumpOnto(N, h) {
  const dpx = positionView.dFdx(), dpy = positionView.dFdy();
  const r1 = dpy.cross(N), r2 = N.cross(dpx), det = dot(dpx, r1);
  const g = r1.mul(h.dFdx()).add(r2.mul(h.dFdy())).mul(select(det.lessThan(0), float(-1), float(1)));
  return abs(det).mul(N).sub(g).normalize();
}

// ------------------------------------------------------------------------------------------------ slot materials
function make(slot, vertexAo, R) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, metalness: 0 });
  const N = noiseTex();
  const lod0 = !vertexAo;
  const code = lod0 ? codeOf() : float(-1);
  const q = planar();
  const nA = texture(N, q.div(4.0)), nB = texture(N, q.div(17.0).add(0.37));
  let col, rough, metal = float(0), normal = lod0 ? mappedNormal(R.nrmTex) : null;
  const up = smoothstep(0.3, 0.9, normalWorld.y);
  if (slot === "stone_blue" || slot === "stone_kerb") {
    // petit granit outdoors: dark blue-grey where sawn and sheltered, pale ash grey where the rain washes it (tops, split
    // faces), dark rain streaks under edges, a little green in the deep crevices near the ground (photos)
    const dark = lin("#62676c"), pale = lin("#959899"), green = lin("#4f5a3a");
    const wash = clamp(up.mul(0.5).add(smoothstep(0.35, 0.8, nB.r).mul(0.35)), 0, 1);
    col = mix(dark, pale, wash).mul(float(0.86).add(nA.g.mul(0.18)).add(nA.b.mul(0.1)));
    col = col.mul(float(1).sub(smoothstep(0.55, 0.92, nA.a).mul(0.22).mul(float(1).sub(abs(normalWorld.y)))));
    rough = mix(float(0.78), float(0.9), isC(code, CD.split));
    if (lod0) {
      // sawn kerb: joints every 1.0 m along the ring (u metres), slightly smoother
      const kerb = isC(code, CD.kerb), u = uv(0).x;
      const j = float(1).sub(smoothstep(0.002, 0.006, abs(fract(u.div(1.0)).sub(0.5)).mul(-1).add(0.5)));
      col = mix(col, col.mul(0.5), j.mul(kerb));
      rough = mix(rough, float(0.7), kerb);
      // incised letters (La Victoire's slabs): darker, duller
      const mk = lettersMask(R.L).mul(isC(code, CD.letters)).mul(artLook.letters);
      col = mix(col, col.mul(0.38), mk); rough = mix(rough, float(0.95), mk);
      // the milestone's sunk medallion and its numeral (the nearest MEDALLIONS entry picks the cell), the boundary stone's cross
      const P = positionGeometry, med = isC(code, CD.medallion);
      const s = atan(P.x, P.z).mul(0.17), t = P.y.sub(0.83), r = length(vec2(s, t));
      const inMed = float(1).sub(smoothstep(0.083, 0.087, r)).mul(med).mul(smoothstep(0.1, 0.13, P.z));
      const ring = float(1).sub(smoothstep(0.0, 0.005, abs(r.sub(0.085)))).mul(med).mul(smoothstep(0.1, 0.13, P.z));
      const pw = positionWorld.xz;
      let best = MEDALLIONS.element(0);
      for (let k = 1; k < 4; k++) {
        const e = MEDALLIONS.element(k);
        best = select(length(pw.sub(e.xy)).lessThan(length(pw.sub(best.xy))), e, best);
      }
      let dig = float(0);
      for (let k = 0; k < 3; k++) dig = dig.add(cellMask(R.L, 5 + k, s.add(0.085), t.add(0.085)).mul(float(1).sub(clamp(abs(best.z.sub(5 + k)), 0, 1))));
      dig = dig.mul(inMed);
      col = mix(col, col.mul(0.78), inMed);
      col = mix(col, col.mul(0.4), ring.add(dig.mul(0.9)).min(1));
      const crs = isC(code, CD.cross).mul(smoothstep(0.5, 0.8, normalGeometry.z));
      const cm = cellMask(R.L, 8, P.x.add(0.13), P.y.sub(0.3)).mul(crs);
      col = mix(col, col.mul(0.42), cm);
      // the Monolithes' rows of drill channels (plug-and-feather splits, the photos' "stacked" faces): half-round grooves
      // ~4 cm wide, 1.8 cm deep, every 11.5-15 cm (COLOR_0.b: the stone's pitch), drawn here sharp at any distance and
      // faded out with the pixel footprint (no shimmer); the bake carries the split face between them
      const drill = isC(code, CD.drill);
      const pitch = float(0.1).add(attribute("color", "vec4").b.mul(0.1));
      // (straight rows, a slight wander of the split line; a soft round-bottomed groove, not a sharp-edged cut)
      const fy = positionGeometry.y.div(pitch).add(texture(N, q.div(3.0)).r.sub(0.5).mul(0.18));
      const fr = fract(fy).sub(0.5).div(0.26);
      const chn = smoothstep(1.0, 0.0, fr.mul(fr)).mul(drill).mul(float(1).sub(smoothstep(0.2, 0.5, fwidth(fy))));
      col = col.mul(float(1).sub(chn.mul(0.22)));
      normal = bumpOnto(normal, chn.mul(-0.007));
      // moss in the low crevices (AO) near the ground
      const ao = texture(R.aoTex, uv(1)).r;
      col = mix(col, green.mul(0.55), smoothstep(0.55, 0.2, ao).mul(smoothstep(0.8, 0.0, positionGeometry.y)).mul(0.25));
    }
  } else if (slot === "stone_pale") {
    // the Gobert memorial (OM_2022_061_002): pale weathered grey, heavy dark rain streaks down from the copings, ashlar joints
    const pale = lin("#b3b2ac"), grime = lin("#5f6061");
    col = pale.mul(float(0.9).add(nA.g.mul(0.12)));
    const streak = smoothstep(0.45, 0.9, nA.a).mul(float(1).sub(abs(normalWorld.y))).mul(0.55).add(smoothstep(0.55, 0.85, nB.g).mul(0.25));
    col = mix(col, grime, streak.min(0.7));
    rough = float(0.82);
    if (lod0) {
      const w = uv(0), ash = isC(code, CD.ashlar).add(isC(code, CD.gilt)).min(1);     // (the pier's inscribed face: no joints across the text)
      // courses 0.48 m, joints 4 mm, vertical joints 0.9 m staggered (on the u-v metres of each face)
      const yy = positionGeometry.y, row = floor(yy.div(0.48));
      const xx = select(w.x.greaterThan(900), w.x.mod(1000), w.x).add(row.mul(0.45));
      const jh = float(1).sub(smoothstep(0.0015, 0.004, abs(fract(yy.div(0.48)).sub(0.5)).negate().add(0.5).mul(0.48)));
      const jv = float(1).sub(smoothstep(0.0015, 0.004, abs(fract(xx.div(0.9)).sub(0.5)).negate().add(0.5).mul(0.9)));
      col = mix(col, col.mul(0.55), jh.add(jv).min(1).mul(ash));
      const mk = lettersMask(R.L).mul(artLook.letters);
      const gilt = mk.mul(isC(code, CD.gilt)), cut = mk.mul(isC(code, CD.letters));
      col = mix(col, col.mul(0.35), cut);
      col = mix(col, lin("#b58a3a").mul(float(0.85).add(nA.b.mul(0.3))), gilt);
      metal = gilt.mul(0.9);
      rough = mix(mix(rough, float(0.95), cut), float(0.38), gilt);
    }
  } else if (slot === "stone_cream") {
    // cream sandstone ashlar: the library's shipped scan (sandstone blocks, 3 m tile) on the faces' metres when loaded
    if (R.scan && lod0) {
      const t = uv(0).div(R.scan.meta?.size_m ?? 3);
      col = texture(R.scan.albedo, t).rgb.mul(lin("#f4ead2").mul(1.6));
      rough = texture(R.scan.nra, t).b.mul(1.05);
    } else {
      col = lin("#bfae8a").mul(float(0.85).add(nA.g.mul(0.2)));
      rough = float(0.88);
    }
    col = mix(col, lin("#6a6458"), smoothstep(0.5, 0.9, nA.a).mul(float(1).sub(abs(normalWorld.y))).mul(0.35));
  } else if (slot === "steel_stainless") {
    // brushed stainless: lengthwise brushing (u runs along the bar) in the roughness, faint smudges
    const w = uv(0);
    const br = lod0 ? texture(N, vec2(w.x.mul(0.05), w.y.mul(6.0))).b : float(0.5);
    col = lin("#c9cbcd").mul(float(0.94).add(nB.r.mul(0.08)));
    rough = float(0.2).add(br.mul(0.12)).add(smoothstep(0.6, 0.9, nB.g).mul(0.08));
    metal = float(1);
  } else if (slot === "iron_black") {
    col = lin("#141414").mul(float(0.85).add(nA.b.mul(0.3)));
    col = mix(col, lin("#3a2a1e"), smoothstep(0.7, 0.95, nA.g).mul(0.35));                 // a little rust bloom
    rough = float(0.55); metal = float(0.55);
  } else if (slot === "bronze") {
    // patinated bronze (the Gobert portrait): dark brown, the raised parts rubbed lighter, green-grey in the hollows
    const ao = lod0 ? texture(R.aoTex, uv(1)).r : float(1);
    col = mix(lin("#2c3a33"), lin("#4a3a28"), smoothstep(0.5, 0.95, ao));
    col = mix(col, lin("#7a5f3e"), smoothstep(0.92, 1.0, ao).mul(0.5));
    rough = float(0.5); metal = float(0.8);
  } else if (slot === "gravel") {
    const f = texture(N, q.mul(3.0));
    col = mix(lin("#a99c84"), lin("#d2c6ad"), smoothstep(0.35, 0.7, f.b)).mul(float(0.9).add(nA.r.mul(0.15)));
    rough = float(0.95);
  } else if (slot === "bed_planting") {
    // a planted bed (Street View 2024 at the roundabout: heather, ornamental grasses over dark mulch; Gobert: flowers)
    const f = texture(N, q.div(1.3)), g = texture(N, q.div(0.35));
    const mulch = lin("#2e241b"), heather = lin("#5b4a5a"), leaf = lin("#3d5326"), straw = lin("#8c8150");
    const f2 = texture(N, q.div(0.45));
    col = mix(mulch, leaf, smoothstep(0.25, 0.6, f.g.mul(0.6).add(f2.b.mul(0.4))));
    col = mix(col, heather, smoothstep(0.5, 0.8, f.r.mul(0.6).add(f2.g.mul(0.4))).mul(0.55));
    col = mix(col, straw, smoothstep(0.55, 0.85, g.b).mul(0.4));
    col = col.mul(float(0.7).add(g.g.mul(0.45)));
    rough = float(0.95);
  } else if (slot === "hedge_hornbeam") {
    // clipped hornbeam (Carpinus betulus): leaf clumps, brown leaves kept in winter (the gardens' hedge palette)
    const f = texture(N, q.div(0.6)), g = texture(N, q.div(0.18));
    const summer = lin("#4c6a2a"), winter = lin("#7c5d36");
    const sea = smoothstep(9.5, 11.5, season.month).add(smoothstep(4.0, 2.5, season.month)).min(1);
    col = mix(summer, winter, float(sea).mul(0.85)).mul(float(0.6).add(f.g.mul(0.45)).add(g.b.mul(0.3)));
    rough = float(0.8);
  } else {
    col = vec3(0.5); rough = float(0.8);
  }
  // the baked AO: the atlas (LOD0) or the vertex AO (LOD1 / LOD2)
  // (floored at 0.42: the rubble cairn's 2048-atlas islands are small and its crevices baked near black; a contact
  // shadow is kept, a black hole is not)
  const ao = max(lod0 ? texture(R.aoTex, uv(1)).r : attribute("color", "vec4").a, 0.42);
  const aoK = mix(float(1), ao, artLook.ao);
  m.aoNode = aoK;
  m.colorNode = col.mul(mix(float(1), aoK, artLook.aoDirect));
  // geometric specular anti-aliasing (thin chain links, bar edges, rough stone far away do not glitter)
  const dn = fwidth(normalWorld);
  m.roughnessNode = clamp(rough.mul(rough).add(min(dot(dn, dn).mul(2.0), 0.3)).sqrt(), 0.05, 1);
  m.metalnessNode = metal;
  if (normal) m.normalNode = normal;
  m.name = `publicart ${slot}${vertexAo ? " (far)" : ""}`;
  m.userData.slot = slot; m.userData.shared = true;
  const porosity = { stone_blue: 0.35, stone_kerb: 0.35, stone_pale: 0.45, stone_cream: 0.55, steel_stainless: 0.0, iron_black: 0.05, bronze: 0.05, gravel: 0.7, bed_planting: 0.85, hedge_hornbeam: 0.3 }[slot] ?? 0.4;
  return wxMat(m, { porosity });
}
