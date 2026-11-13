// GROUND TEXTURES (docs/materials/GROUND.md): one CC0 scan per land cover (textures/ground/ground.json, built by
// tools/textures/ground_textures.py + encode_ktx2.mjs --ground), packed into TWO texture arrays (albedo sRGB, nra =
// normal x,y + roughness + AO linear), so the one shared ground shader binds 2 textures for all covers (WebGPU allows
// 16 sampled textures per shader stage: mask + ortho + lamp map + shadow maps + these 2).
//
// Each layer is a KTX2 file (UASTC -> BC7 / ASTC on the GPU, 1 byte per texel, mipmapped); the transcoded mip chains
// are concatenated per level into one CompressedArrayTexture. All layers share one size and format.
//   const G = await loadGroundTextures(renderer)   -> { albedo, nra, layers: [{cover, size_m, mean_albedo_linear...}], bytesGPU }
// null when the files or the transcoder fail (the ground then keeps its procedural look).
import * as THREE from "three/webgpu";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const BASE = new URL("./textures/ground/", import.meta.url).href;
const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";
let ready = null;

export const groundTexOn = !/[?&]groundtex=0/.test(location.search);

/** the textures once (null: off or failed) */
export function loadGroundTextures(renderer) {
  if (!groundTexOn) return Promise.resolve(null);
  return (ready ??= build(renderer).catch((e) => { console.warn(`[ground] textures failed (${e.message}): procedural ground`); return null; }));
}

async function build(renderer) {
  const t0 = performance.now();
  const man = await fetch(BASE + "ground.json").then((r) => { if (!r.ok) throw new Error(`ground.json HTTP ${r.status}`); return r.json(); });
  const ktx = new KTX2Loader().setTranscoderPath(TRANSCODER);
  ktx.detectSupport(renderer);
  const layers = man.layers.slice().sort((a, b) => a.layer - b.layer);
  const load = (role) => Promise.all(layers.map((l) => ktx.loadAsync(`${BASE}${l.cover}_${role}.ktx2`)));
  const [alb, nra] = await Promise.all([load("albedo"), load("nra")]);
  ktx.dispose();
  const pack = (list, srgb) => {
    const t0 = list[0], n = list.length;
    for (const t of list) {
      if (t.format !== t0.format || t.image.width !== t0.image.width || t.mipmaps.length !== t0.mipmaps.length)
        throw new Error("ground layers differ in size / format");
    }
    const mipmaps = t0.mipmaps.map((m, i) => {
      const per = m.data.byteLength, data = new m.data.constructor(per * n / m.data.BYTES_PER_ELEMENT);
      list.forEach((t, k) => data.set(t.mipmaps[i].data, k * per / m.data.BYTES_PER_ELEMENT));
      return { data, width: m.width, height: m.height };
    });
    const arr = new THREE.CompressedArrayTexture(mipmaps, t0.image.width, t0.image.height, n, t0.format, t0.type);
    arr.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    arr.wrapS = arr.wrapT = THREE.RepeatWrapping;
    arr.minFilter = THREE.LinearMipmapLinearFilter; arr.magFilter = THREE.LinearFilter;
    arr.anisotropy = 8;
    arr.generateMipmaps = false;
    arr.needsUpdate = true;
    for (const t of list) t.dispose();
    const bytes = mipmaps.reduce((s, m) => s + m.data.byteLength, 0);
    return { arr, bytes };
  };
  const A = pack(alb, true), R = pack(nra, false);
  const out = { albedo: A.arr, nra: R.arr, layers, bytesGPU: A.bytes + R.bytes, ms: Math.round(performance.now() - t0) };
  console.log(`[ground] ${layers.length} cover textures (${layers.map((l) => l.cover).join(", ")}): ${(out.bytesGPU / 1048576).toFixed(1)} MB on the GPU, ${out.ms} ms`);
  return out;
}
