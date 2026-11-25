// PACK THE FALCON V2 (tools/blender/falconV2.py -> <src>/build/falcon_v2.raw.glb + falcon_v2.raw.glb.tex/) into the
// shipped models/bird/v2/falcon_v2.glb (docs/FALCON_GYM.md), the project's way (tools/christmas_pack.mjs, moto/pack.mjs):
//   textures  KTX2 (Basis UASTC + zstd, mipmaps; KHR_texture_basisu), the base colour / sRGB ones perceptual, the
//             normal / ORM maps linear; at most --tex px (the Blender step already capped them)
//   geometry  every vertex / index / animation buffer view EXT_meshopt_compression (lossless: ATTRIBUTES / TRIANGLES,
//             no filters), the meshopt decoder in the loader (viewer/falconGym/gymBird.js)
//   materials the feathers' alpha BLEND -> MASK (cut-out at 0.5: no sorting, shadows that match); emission and the
//             specular extensions dropped (a falcon does not glow: the far model's eyes / body had emissive maps)
// The Sketchfab files stay untouched SOURCE files (C:\Users\tibog\Downloads\uccle-falcon-src\); everything here is
// repeatable from them. No LODs inside: the near bird is one player falcon (25k triangles); the far / family birds are
// the second, 7k model (--far build).
//   node tools/falconV2pack.mjs <raw.glb> <out.glb> [--fast]
// (+ <out>_juvenile.ktx2: the juvenile plumage, named in the glb's asset.extras.variants)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(here, "worker/package.json"));
const { MeshoptEncoder } = await import(pathToFileURL(req.resolve("meshoptimizer/encoder")).href);
await MeshoptEncoder.ready;
const { encodeToKTX2 } = await import(pathToFileURL(path.join(here, "textures/node_modules/ktx2-encoder/dist/node/index.js")).href);

const [, , SRC, DST] = process.argv;
const FAST = process.argv.includes("--fast");
const glb = fs.readFileSync(SRC);
const jl = glb.readUInt32LE(12), J = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, BIN = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
const texMeta = JSON.parse(fs.readFileSync(SRC + ".tex/textures.json", "utf8"));

// ------------------------------------------------------------------------------------------------ materials
const roles = new Map();      // image index -> "srgb" | "linear"
const texImg = (ti) => J.textures[ti].source;
for (const m of J.materials || []) {
  if (m.alphaMode === "BLEND") { m.alphaMode = "MASK"; m.alphaCutoff = 0.5; }
  delete m.emissiveTexture; delete m.emissiveFactor;
  if (m.extensions) { delete m.extensions.KHR_materials_specular; delete m.extensions.KHR_materials_emissive_strength; if (!Object.keys(m.extensions).length) delete m.extensions; }
  const pb = m.pbrMetallicRoughness || {};
  if (pb.baseColorTexture) roles.set(texImg(pb.baseColorTexture.index), "srgb");
  for (const t of [pb.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture]) if (t) roles.set(texImg(t.index), "linear");
}
J.extensionsUsed = (J.extensionsUsed || []).filter((e) => e !== "KHR_materials_specular" && e !== "KHR_materials_emissive_strength");

// ------------------------------------------------------------------------------------------------ textures -> KTX2
const imgBytes = new Map();   // image index -> KTX2 bytes
for (const [i, im] of (J.images || []).entries()) {
  if (!roles.has(i)) continue;
  const key = Object.keys(texMeta).find((k) => k === im.name || k.replace(/\.[a-z0-9]+$/i, "") === im.name);
  if (!key) throw new Error(`no raw RGBA for image ${im.name}`);
  const T = texMeta[key], data = new Uint8Array(fs.readFileSync(path.join(SRC + ".tex", T.file)));
  const srgb = roles.get(i) === "srgb", t0 = Date.now();
  const ktx = await encodeToKTX2(data, {
    isUASTC: true, uastcLDRQualityLevel: FAST ? 1 : 2, needSupercompression: true, enableRDO: !FAST, rdoQualityLevel: srgb ? 1.0 : 0.5,
    generateMipmap: true, isKTX2File: true, isPerceptual: srgb, isSetKTX2SRGBTransferFunc: srgb, isNormalMap: false,
    imageDecoder: async () => ({ width: T.width, height: T.height, data }),
  });
  imgBytes.set(i, Buffer.from(ktx));
  console.log(`  ${im.name}: ${T.width}x${T.height} ${srgb ? "sRGB" : "linear"} -> ${(ktx.length / 1024).toFixed(0)} KB KTX2 (${Date.now() - t0} ms)`);
}
// the plumage variants (tools/blender/falconV2.py step 8: "juvenile", the player's young of the year) as their own
// KTX2 beside the glb (<out>_juvenile.ktx2), the same encoding as the base colour they replace; the glb names them
J.asset.extras = { ...(J.asset.extras || {}), variants: {} };
for (const [name, T] of Object.entries(texMeta)) {
  if (!T.variant_of) continue;
  const data = new Uint8Array(fs.readFileSync(path.join(SRC + ".tex", T.file)));
  const ktx = await encodeToKTX2(data, {
    isUASTC: true, uastcLDRQualityLevel: FAST ? 1 : 2, needSupercompression: true, enableRDO: !FAST, rdoQualityLevel: 1.0,
    generateMipmap: true, isKTX2File: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, isNormalMap: false,
    imageDecoder: async () => ({ width: T.width, height: T.height, data }),
  });
  const file = path.basename(DST).replace(/\.glb$/, `_${name}.ktx2`);
  fs.mkdirSync(path.dirname(DST), { recursive: true });
  fs.writeFileSync(path.join(path.dirname(DST), file), Buffer.from(ktx));
  J.asset.extras.variants[name] = { file, replaces: "baseColorTexture", width: T.width, height: T.height };
  console.log(`  variant ${name}: ${T.width}x${T.height} -> ${file} ${(ktx.length / 1024).toFixed(0)} KB KTX2`);
}
for (const t of J.textures || []) { const s = t.source; t.extensions = { KHR_texture_basisu: { source: s } }; delete t.source; }
J.extensionsUsed.push("KHR_texture_basisu"); J.extensionsRequired = [...new Set([...(J.extensionsRequired || []), "KHR_texture_basisu"])];

// ------------------------------------------------------------------------------------------------ buffer views -> meshopt
const viewUse = new Map();    // bufferView -> { kind: "index" | "attr", stride, count }
for (const a of J.accessors) {
  if (a.bufferView == null) continue;
  const comp = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const v = J.bufferViews[a.bufferView], stride = v.byteStride || comp * n;
  const isIndex = v.target === 34963;
  viewUse.set(a.bufferView, { kind: isIndex ? "index" : "attr", stride, count: a.count, comp });
}
const main = [], fall = []; let mainLen = 0, fallLen = 0;
const push = (arr, b) => { const pad = (4 - (b.length % 4)) % 4; arr.push(b, Buffer.alloc(pad)); return b.length + pad; };
const views = J.bufferViews.map((v, vi) => {
  const raw = BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const img = (J.images || []).findIndex((im) => im.bufferView === vi);
  if (img >= 0 && imgBytes.has(img)) {          // the KTX2 replaces the PNG / JPEG
    const b = imgBytes.get(img), o = mainLen; mainLen += push(main, b);
    J.images[img].mimeType = "image/ktx2";
    return { buffer: 0, byteOffset: o, byteLength: b.length };
  }
  const u = viewUse.get(vi);
  let mode = null, stride = 0, count = 0;
  if (u && u.kind === "index" && (u.comp === 2 || u.comp === 4) && u.count % 3 === 0) { mode = "TRIANGLES"; stride = u.comp; count = u.count; }
  else if (u && u.kind === "attr" && u.stride % 4 === 0 && u.stride <= 256 && raw.length === u.stride * u.count) { mode = "ATTRIBUTES"; stride = u.stride; count = u.count; }
  if (!mode) { const o = mainLen; mainLen += push(main, Buffer.from(raw)); return { ...v, buffer: 0, byteOffset: o }; }
  const enc = Buffer.from(MeshoptEncoder.encodeGltfBuffer(new Uint8Array(raw), count, stride, mode));
  const o = mainLen; mainLen += push(main, enc);
  const fo = fallLen; fallLen += raw.length + ((4 - (raw.length % 4)) % 4);
  const nv = { buffer: 1, byteOffset: fo, byteLength: raw.length, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: enc.length, byteStride: stride, count, mode } } };
  if (mode === "ATTRIBUTES" && v.byteStride) nv.byteStride = v.byteStride;
  if (v.target) nv.target = v.target;
  return nv;
});
J.bufferViews = views;
J.buffers = [{ byteLength: mainLen }, { byteLength: fallLen, extensions: { EXT_meshopt_compression: { fallback: true } } }];
for (const e of ["EXT_meshopt_compression"]) { if (!J.extensionsUsed.includes(e)) J.extensionsUsed.push(e); if (!J.extensionsRequired.includes(e)) J.extensionsRequired.push(e); }
J.asset.generator = "uccle-city tools/falconV2pack.mjs (from tools/blender/falconV2.py)";

// ------------------------------------------------------------------------------------------------ write
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const bb = Buffer.concat(main);
const h = Buffer.alloc(12); h.write("glTF", 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bb.length, 8);
const c0 = Buffer.alloc(8); c0.writeUInt32LE(js.length, 0); c0.write("JSON", 4);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(bb.length, 0); c1.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(path.dirname(DST), { recursive: true });
fs.writeFileSync(DST, Buffer.concat([h, c0, js, c1, bb]));
const tris = J.meshes.reduce((s, m) => s + m.primitives.reduce((q, p) => q + (p.indices != null ? J.accessors[p.indices].count / 3 : 0), 0), 0);
console.log(`falconV2pack: ${DST} ${(fs.statSync(DST).size / 1024).toFixed(0)} KB (raw ${(glb.length / 1024).toFixed(0)} KB), ${tris} triangles, clips ${(J.animations || []).map((a) => a.name).join(" ")}`);
