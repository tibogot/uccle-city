// textures/shops/interiors.png (tools/blender/shopInteriors.py) -> textures/shops/interiors.ktx2: Basis UASTC + zstd,
// mipmapped, sRGB (GPU: BC7 / ASTC, 1 byte a texel: 4096 x 2048 = 8 MB + mips instead of 32 MB + mips as RGBA8).
// The raw RGBA comes from tools/shops/png_to_rgba.py (top row first).
//   python tools/shops/png_to_rgba.py && node tools/shops/encode_interiors.mjs
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
// (the encoder is tools/textures' dependency: cd tools/textures && npm ci)
const { encodeToKTX2 } = await import(pathToFileURL(path.join(ROOT, "tools", "textures", "node_modules", "ktx2-encoder", "dist", "node", "index.js")).href);
const raw = path.join(ROOT, "textures", "shops", "_work", "interiors.rgba");
const info = JSON.parse(fs.readFileSync(raw + ".json", "utf8"));
const data = new Uint8Array(fs.readFileSync(raw));
const t0 = Date.now();
const ktx = await encodeToKTX2(data, {
  isUASTC: true, uastcLDRQualityLevel: 2, needSupercompression: true, enableRDO: true, rdoQualityLevel: 1.0,
  generateMipmap: true, isKTX2File: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true,
  imageDecoder: async () => ({ width: info.width, height: info.height, data }),
});
const out = path.join(ROOT, "textures", "shops", "interiors.ktx2");
fs.writeFileSync(out, ktx);
console.log(`interiors.ktx2 ${(ktx.length / 1024).toFixed(0)} KB, ${info.width} x ${info.height}, ${Date.now() - t0} ms`);
