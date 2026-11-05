// KTX2 (Basis UASTC + Zstandard, mipmaps) for the material library's scans: reads the raw RGBA that
// process_textures.py wrote to data/raw/textures/_work/, writes viewer/materials/textures/<mat>_{albedo,nra}.ktx2 and
// records the sizes in scans.json. UASTC (not ETC1S): it holds the close-up brick / sett detail and the packed
// normal + roughness + AO without block noise; GPU side it transcodes to BC7 (desktop) / ASTC (mobile), 1 byte/texel.
//   cd tools/textures && npm install && node encode_ktx2.mjs [material ...]
import { encodeToKTX2 } from "ktx2-encoder";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
const WORK = path.join(ROOT, "data", "raw", "textures", "_work");
const OUT = path.join(ROOT, "viewer", "materials", "textures");
const manifestPath = path.join(OUT, "scans.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const only = process.argv.slice(2);

for (const mat of Object.keys(manifest)) {
  if (only.length && !only.includes(mat)) continue;
  for (const role of ["albedo", "nra"]) {
    const raw = path.join(WORK, `${mat}_${role}.rgba`);
    const { width, height } = JSON.parse(fs.readFileSync(raw + ".json", "utf8"));
    const data = new Uint8Array(fs.readFileSync(raw));
    const t0 = Date.now();
    const ktx = await encodeToKTX2(data, {
      isUASTC: true, uastcLDRQualityLevel: 2, needSupercompression: true, enableRDO: true, rdoQualityLevel: role === "albedo" ? 1.0 : 0.5,
      generateMipmap: true, isKTX2File: true,
      isPerceptual: role === "albedo", isSetKTX2SRGBTransferFunc: role === "albedo",
      imageDecoder: async () => ({ width, height, data }),
    });
    const dst = path.join(OUT, `${mat}_${role}.ktx2`);
    fs.writeFileSync(dst, ktx);
    manifest[mat][`${role}_ktx2_bytes`] = ktx.length;
    console.log(`${mat}_${role}.ktx2  ${(ktx.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
