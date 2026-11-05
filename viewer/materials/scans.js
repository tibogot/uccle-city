// The CC0 scan maps of the material library (Poly Haven / ambientCG, see CREDITS.md and textures/scans.json):
// <mat>_albedo (sRGB) and <mat>_nra (normal x,y + roughness + AO, linear), 1024 px, repeat wrapping, mipmapped.
// KTX2 (Basis UASTC + zstd; three's KTX2Loader transcodes to BC7 / ASTC / ETC2 on the GPU: 1 byte per texel) by
// default; ?scans=webp loads the WebP fallback (RGBA8 on the GPU, 4 bytes per texel). Built by
// tools/textures/{fetch_textures.py, process_textures.py, encode_ktx2.mjs}.
import * as THREE from "three/webgpu";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const BASE = new URL("./textures/", import.meta.url).href;
const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";

export const SCANS = {};               // mat -> { albedo, nra, meta, bytesGPU, bytesFile, format }
let manifest = null, ktx = null, ready = null;

/** Load every scan once. format: "ktx2" | "webp". Returns the SCANS map. */
export function loadScans(renderer, format = new URLSearchParams(location.search).get("scans") || "ktx2") {
  return (ready ??= (async () => {
    manifest = await fetch(BASE + "scans.json").then((r) => r.json());
    if (format === "ktx2") {
      ktx = new KTX2Loader().setTranscoderPath(TRANSCODER);
      ktx.detectSupport(renderer);
    }
    await Promise.all(Object.entries(manifest).map(async ([mat, meta]) => {
      const load = async (role) => {
        let t;
        if (format === "ktx2") {
          try { t = await ktx.loadAsync(`${BASE}${mat}_${role}.ktx2`); }
          catch (e) { console.warn(`[materials] ${mat}_${role}.ktx2 failed (${e.message}); WebP instead`); }
        }
        if (!t) {
          t = await new THREE.TextureLoader().loadAsync(`${BASE}${mat}_${role}.webp`);
          t.userData.format = "webp";
          t.colorSpace = role === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          t.generateMipmaps = true;
        } else t.userData.format = "ktx2";
        if (role === "nra") t.colorSpace = THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        return t;
      };
      const [albedo, nra] = await Promise.all([load("albedo"), load("nra")]);
      const gpuBytes = (t) => {
        if (t.userData.format === "ktx2") return (t.mipmaps || []).reduce((s, m) => s + (m.data?.byteLength || 0), 0);
        const w = t.image?.width || meta.px, h = t.image?.height || meta.px;
        return Math.round(w * h * 4 * 4 / 3);
      };
      const fileBytes = (role) => (albedo.userData.format === "ktx2" ? meta[`${role}_ktx2_bytes`] : meta[`${role}_webp_bytes`]) || 0;
      SCANS[mat] = { albedo, nra, meta, format: albedo.userData.format,
        bytesGPU: gpuBytes(albedo) + gpuBytes(nra), bytesFile: fileBytes("albedo") + fileBytes("nra") };
    }));
    return SCANS;
  })());
}
