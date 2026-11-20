// KTX2 2D ARRAY encoder (Shops v2, docs/assets/SHOPS.md §3b): N raw RGBA8 slices of one size -> one KTX2 file with
// layerCount = N, Basis UASTC + zstd, mipmapped, sRGB. three r187's KTX2Loader turns it into a CompressedArrayTexture
// (BC7 / ASTC on the GPU, 1 byte a texel); the shader samples it with texture(tex, uv).depth(layer).
// ktx2-encoder's own encodeToKTX2() only knows 2D and cube maps, so this drives its Basis module directly
// (setTexType(cBASISTexType2DArray) + one setSliceSourceImage per layer).
//   node tools/shops/encode_array.mjs <dir with slices.json + NN.rgba> <out.ktx2>
//   slices.json: { width, height, files: ["00.rgba", ...] }   (rows top first)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
// (the encoder is tools/textures' dependency: cd tools/textures && npm ci)
const DIST = path.join(ROOT, "tools", "textures", "node_modules", "ktx2-encoder", "dist");
const BASIS = (await import(pathToFileURL(path.join(DIST, "basis", "basis_encoder.js")).href)).default;
const { applyInputOptions } = await import(pathToFileURL(path.join(DIST, "applyInputOptions.js")).href);

/** slices: [{ width, height, data: Uint8Array RGBA }] -> Uint8Array (the KTX2 file) */
export async function encodeArray(slices, opts = {}) {
  const mod = await BASIS(); mod.initializeBasis();
  const enc = new mod.BasisEncoder();
  try {
    applyInputOptions({
      isUASTC: true, uastcLDRQualityLevel: 2, needSupercompression: true, enableRDO: true, rdoQualityLevel: 1.0,
      generateMipmap: true, isKTX2File: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, ...opts,
    }, enc);
    enc.setTexType(slices.length > 1 ? 1 : 0);                     // cBASISTexType2DArray
    slices.forEach((s, i) => { if (enc.setSliceSourceImage(i, s.data, s.width, s.height, 0) === false) throw new Error(`slice ${i}`); });
    let cap = slices.reduce((a, s) => a + s.width * s.height * 6, 0) + 65536;
    for (let k = 0; k < 2; k++, cap *= 2) {
      const out = new Uint8Array(cap), n = enc.encode(out);
      if (n > 0) return out.slice(0, n);
    }
    throw new Error("encode failed");
  } finally { enc.delete(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, out] = process.argv.slice(2);
  const info = JSON.parse(fs.readFileSync(path.join(dir, "slices.json"), "utf8"));
  const slices = info.files.map((f) => ({ width: info.width, height: info.height, data: new Uint8Array(fs.readFileSync(path.join(dir, f))) }));
  const t0 = Date.now();
  const ktx = await encodeArray(slices);
  fs.writeFileSync(out, ktx);
  const gpu = info.width * info.height * slices.length * 4 / 3;
  console.log(`${out}: ${slices.length} layers ${info.width} x ${info.height}, ${(ktx.length / 1048576).toFixed(2)} MB file, ${(gpu / 1048576).toFixed(2)} MB GPU (BC7 + mips), ${Date.now() - t0} ms`);
}
