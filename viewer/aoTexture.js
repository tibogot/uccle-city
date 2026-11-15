// AO MAPS AS KTX2 BC4 (fix3, docs/FIX3.md): the baked ambient-occlusion maps over 300 KB (landmarks, bridges, kits) have a
// <name>_ao.ktx2 beside their PNG (tools/textures/ao_ktx2.py): BC4 blocks (4 bits / texel: half the R8 texture made from
// the PNG), every mip level baked (no GPU mip generation at upload), Zstandard supercompressed. A small module worker
// fetches it and inflates the levels (three's zstddec, the KTX2Loader's own decoder); the main thread only wraps them in
// a CompressedTexture (RED_RGTC1 = WebGPU bc4-r-unorm, sampled as (r, 0, 0, 1) like the R8 map: the shaders unchanged).
// Without the WebGPU feature texture-compression-bc, for a map not in the list, on any error, or with ?aoktx2=0: the
// caller's PNG path, as before.
//   withAOKtx2(url, pngLoader) -> Promise<texture>  (url: the _ao.png URL)
import * as THREE from "three/webgpu";
import { AO_KTX2 } from "./aoKtx2List.js";

export const AO_KTX2_ON = new URLSearchParams(location.search).get("aoktx2") !== "0";
const ZSTD = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/zstddec.module.js";
let bcSupported = null;
/** main.js, once the renderer is initialised: whether BC4 can be sampled (desktop WebGPU: yes) */
export function setAORenderer(renderer) {
  try { bcSupported = renderer?.backend?.isWebGPUBackend === true && renderer.hasFeature("texture-compression-bc") === true; } catch { bcSupported = false; }
}
export const aoKtx2Stats = { maps: 0, fileBytes: 0, gpuBytes: 0, fallbacks: 0, ms: 0, log: [] };   // log: [map, format, ms from navigation when ready]

let worker = null, seq = 0;
const waiting = new Map();
function getWorker() {
  if (worker) return worker;
  const src = `import { ZSTDDecoder } from "${ZSTD}";
  const zstd = new ZSTDDecoder(), ready = zstd.init();
  self.onmessage = async (e) => {
    const { id, url } = e.data;
    try {
      const buf = await (await fetch(url)).arrayBuffer(), dv = new DataView(buf);
      const id12 = new Uint8Array(buf, 0, 12);
      if (id12[1] !== 0x4B || id12[5] !== 0x32) throw new Error("not a KTX2 file");
      const vk = dv.getUint32(12, true), w = dv.getUint32(20, true), h = dv.getUint32(24, true);
      const levels = Math.max(1, dv.getUint32(40, true)), scheme = dv.getUint32(44, true);
      if (vk !== 139) throw new Error("not BC4 (vkFormat " + vk + ")");
      if (scheme === 2) await ready;
      const out = [];
      for (let i = 0; i < levels; i++) {
        const o = 80 + i * 24, off = Number(dv.getBigUint64(o, true)), len = Number(dv.getBigUint64(o + 8, true)), raw = Number(dv.getBigUint64(o + 16, true));
        const src = new Uint8Array(buf, off, len);
        const data = scheme === 2 ? zstd.decode(src, raw) : scheme === 0 ? src.slice() : null;
        if (!data) throw new Error("supercompression " + scheme);
        const copy = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength ? data : data.slice();
        out.push({ data: copy, width: Math.max(1, w >> i), height: Math.max(1, h >> i) });
      }
      postMessage({ id, w, h, levels: out, bytes: buf.byteLength }, out.map((l) => l.data.buffer));
    } catch (err) { postMessage({ id, error: String(err && err.message || err) }); }
  };`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })), { type: "module" });
  worker.onmessage = ({ data }) => { const p = waiting.get(data.id); waiting.delete(data.id); if (!p) return; if (data.error) p.rej(new Error(data.error)); else p.res(data); };
  worker.onerror = (e) => { for (const p of waiting.values()) p.rej(new Error(e.message || "AO KTX2 worker failed")); waiting.clear(); worker = null; };
  return worker;
}

/** the KTX2 URL for an _ao.png URL when one was built (null otherwise) */
export function aoKtx2Url(pngUrl) {
  if (!AO_KTX2_ON || bcSupported !== true) return null;
  const u = new URL(pngUrl, location.href), m = u.pathname.match(/\/(models\/.+_ao)\.png$/);
  if (!m) return null;
  const v = AO_KTX2[m[1] + ".png"];
  if (!v) return null;
  u.pathname = u.pathname.replace(/\.png$/, ".ktx2"); u.search = `?v=${v}`;
  return u.href;
}

/** the map's BC4 CompressedTexture (same sampler settings as the loaders' R8 DataTexture) */
export function loadAOKtx2(url) {
  const t0 = performance.now();
  return new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); getWorker().postMessage({ id, url }); }).then((d) => {
    const t = new THREE.CompressedTexture(d.levels, d.w, d.h, THREE.RED_RGTC1_Format, THREE.UnsignedByteType);
    t.flipY = false; t.generateMipmaps = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    const gpu = d.levels.reduce((s, l) => s + l.data.byteLength, 0);
    t.userData.bytes = gpu; t.userData.format = "ktx2-bc4";
    aoKtx2Stats.maps++; aoKtx2Stats.fileBytes += d.bytes; aoKtx2Stats.gpuBytes += gpu; aoKtx2Stats.ms += performance.now() - t0;
    return t;
  });
}

/** the KTX2 when there is one (and BC4 is supported), else / on failure pngLoader(url) */
export async function withAOKtx2(url, pngLoader) {
  const k = aoKtx2Url(url), name = String(url).replace(/^.*\/models\//, "");
  if (k) {
    try { const t = await loadAOKtx2(k); aoKtx2Stats.log.push([name, "ktx2", Math.round(performance.now())]); return t; }
    catch (e) { aoKtx2Stats.fallbacks++; console.warn(`[ao] ${k}: ${e.message}; the PNG instead`); }
  }
  const t = await pngLoader(url);
  aoKtx2Stats.log.push([name, "png", Math.round(performance.now())]);
  return t;
}
if (typeof window !== "undefined") window.aoKtx2Stats = aoKtx2Stats;
