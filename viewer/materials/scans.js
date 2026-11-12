// The scan maps of the material library: <files>_albedo (sRGB) and <files>_nra (normal x,y + roughness + AO, linear),
// 1024 px, repeat wrapping, mipmapped. KTX2 (Basis UASTC + zstd; three's KTX2Loader transcodes to BC7 / ASTC / ETC2 on
// the GPU: 1 byte per texel) by default; ?scans=webp loads the WebP fallback (RGBA8 on the GPU, 4 bytes per texel).
// Built by tools/textures/{fetch_textures.py, process_textures.py, candidates.py, encode_ktx2.mjs}.
//
//   loadScans(renderer)                 the library's shipped scans (textures/scans.json), one per material: SCANS[mat]
//   loadManifest()                      candidates.json: every candidate per material (CC0 + the owner's Megascans)
//   loadCandidate(renderer, id)         one candidate's maps (lazily, once): CANDS[id] = { albedo, nra, meta, ... }
// A loaded scan is passed to createMaterial(name, { variant: "scan", scan: CANDS[id] }); without `scan` the material
// uses SCANS[name] (the shipped one).
import * as THREE from "three/webgpu";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const BASE = new URL("./textures/", import.meta.url).href;
const ROOT = new URL("./", import.meta.url).href;
const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";

export const SCANS = {};               // mat -> { albedo, nra, meta, bytesGPU, bytesFile, format }
export const CANDS = {};               // candidate id -> the same shape
let manifest = null, ktx = null, ready = null, candMan = null;
const pending = {};
const fmt = () => new URLSearchParams(location.search).get("scans") || "ktx2";

function ktxLoader(renderer) {
  if (!ktx) { ktx = new KTX2Loader().setTranscoderPath(TRANSCODER); ktx.detectSupport(renderer); }
  return ktx;
}

/** load `<url>_albedo` + `<url>_nra` as KTX2 (or WebP) -> { albedo, nra, format, bytesGPU, bytesFile } */
async function loadPair(renderer, url, meta, format = fmt()) {
  const load = async (role) => {
    let t;
    if (format === "ktx2") {
      try { t = await ktxLoader(renderer).loadAsync(`${url}_${role}.ktx2`); }
      catch (e) { console.warn(`[materials] ${url}_${role}.ktx2 failed (${e.message}); WebP instead`); }
    }
    if (!t) {
      t = await new THREE.TextureLoader().loadAsync(`${url}_${role}.webp`);
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
  return { albedo, nra, meta, format: albedo.userData.format, bytesGPU: gpuBytes(albedo) + gpuBytes(nra), bytesFile: fileBytes("albedo") + fileBytes("nra") };
}

/** Load every shipped scan once. format: "ktx2" | "webp". Returns the SCANS map. */
export function loadScans(renderer, format = fmt()) {
  return (ready ??= (async () => {
    manifest = await fetch(BASE + "scans.json").then((r) => r.json());
    await Promise.all(Object.entries(manifest).map(async ([mat, meta]) => {
      SCANS[mat] = await loadPair(renderer, `${BASE}${mat}`, meta, format);
    }));
    return SCANS;
  })());
}

/** The candidates manifest (viewer/materials/candidates.json): { materials: { mat: [candidate, ...] } }. */
export async function loadManifest() {
  return (candMan ??= await fetch(ROOT + "candidates.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { materials: {} })).catch(() => ({ materials: {} })));
}

/** Load one candidate's maps (once). Rejects when its files aren't there (not built / Megascans not dropped in). */
export async function loadCandidate(renderer, id) {
  if (CANDS[id]) return CANDS[id];
  const man = await loadManifest();
  let meta = null;
  for (const list of Object.values(man.materials)) for (const c of list) if (c.id === id) meta = c;
  if (!meta) throw new Error(`[materials] no candidate ${id}`);
  return (pending[id] ??= loadPair(renderer, ROOT + meta.files, meta).then((s) => (CANDS[id] = s)));
}
