// KTX2 (Basis UASTC + Zstandard, mipmaps) for the texture factory's outputs, the same settings as the shipped scans
// (tools/textures/encode_ktx2.mjs): reads the raw RGBA tools/texturefactory/build.py wrote to
// data/raw/texfactory/_work/tf_<mat>_<variant>_<1k|2k>_<albedo|nra>.rgba, writes the .ktx2 next to the WebP in
// viewer/materials/generated/<mat>/<variant>/ and the byte sizes into viewer/materials/generated/generated.json.
//   cd tools/texturefactory && npm install && node encode.mjs [--fast] [filter ...]
// --fast: UASTC level 1 without RDO (~10x quicker, ~20 % bigger; for review rounds). Default: level 2 + RDO like the
// promoted scans. Skips maps whose .ktx2 is newer than their raw RGBA.
import { encodeToKTX2 } from "ktx2-encoder";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
let ROOT = path.resolve(here, "..", "..");
const MAIN = ROOT.includes(`${path.sep}.claude${path.sep}`) ? path.resolve(ROOT, "..", "..", "..") : ROOT;
const WORK = path.join(MAIN, "data", "raw", "texfactory", "_work");
const MAN = path.join(ROOT, "viewer", "materials", "generated", "generated.json");
const args = process.argv.slice(2);
const fast = args.includes("--fast");
const only = args.filter((a) => !a.startsWith("--"));
const man = JSON.parse(fs.readFileSync(MAN, "utf8"));

for (const f of fs.readdirSync(WORK).filter((f) => f.endsWith(".rgba")).sort()) {
  const m = f.match(/^(tf_.+_(1k|2k))_(albedo|nra)\.rgba$/); if (!m) continue;
  const [, id, , role] = m;
  if (only.length && !only.some((o) => id.includes(o))) continue;
  const info = JSON.parse(fs.readFileSync(path.join(WORK, f + ".json"), "utf8"));
  const raw = path.join(WORK, f);
  if (fs.existsSync(info.out) && fs.statSync(info.out).mtimeMs > fs.statSync(raw).mtimeMs) {
    if (man[id]) man[id][`${role}_ktx2_bytes`] = fs.statSync(info.out).size;
    continue;
  }
  const data = new Uint8Array(fs.readFileSync(raw));
  const t0 = Date.now();
  const ktx = await encodeToKTX2(data, {
    isUASTC: true, uastcLDRQualityLevel: fast ? 1 : 2, needSupercompression: true, enableRDO: !fast,
    rdoQualityLevel: role === "albedo" ? 1.0 : 0.5,
    generateMipmap: true, isKTX2File: true, isPerceptual: role === "albedo", isSetKTX2SRGBTransferFunc: role === "albedo",
    imageDecoder: async () => ({ width: info.width, height: info.height, data }),
  });
  fs.mkdirSync(path.dirname(info.out), { recursive: true });
  fs.writeFileSync(info.out, ktx);
  if (man[id]) man[id][`${role}_ktx2_bytes`] = ktx.length;
  console.log(`${id}_${role}.ktx2  ${(ktx.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
  fs.writeFileSync(MAN, JSON.stringify(man, null, 1));
}
fs.writeFileSync(MAN, JSON.stringify(man, null, 1));
