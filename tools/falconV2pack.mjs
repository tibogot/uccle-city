// PACK THE FALCON V2 (tools/blender/falconV2.py -> <src>/build/falcon_v2.raw.glb + falcon_v2.raw.glb.tex/) into the
// shipped models/bird/v2/falcon_v2.glb (docs/FALCON_GYM.md), the project's way (tools/christmas_pack.mjs, moto/pack.mjs):
//   textures  KTX2 (Basis UASTC + zstd, mipmaps; KHR_texture_basisu), the base colour / sRGB ones perceptual, the
//             normal / ORM maps linear; at most --tex px (the Blender step already capped them)
//   geometry  every vertex / index / animation buffer view EXT_meshopt_compression (lossless: ATTRIBUTES / TRIANGLES,
//             no filters), the meshopt decoder in the loader (viewer/falconGym/gymBird.js)
//   materials the feathers' alpha BLEND -> MASK (cut-out at 0.5: no sorting, shadows that match); emission and the
//             specular extensions dropped (a falcon does not glow: the far model's eyes / body had emissive maps)
// The Sketchfab files stay untouched SOURCE files (C:\Users\tibog\Downloads\uccle-falcon-src\); everything here is
// repeatable from them. No LODs inside: the near bird is one player falcon (25k triangles); the far LOD is its own file
// (tools/falconV2far.mjs -> falcon_v2_far.glb: the same rig and clips, ~6k triangles, no textures of its own).
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
const binOff = 20 + jl + 8;
let BIN = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
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
// the textures no material uses any more (the emission maps just dropped) go, with their images: they were shipped as
// raw PNG bytes (base B: two 1024 px emission maps, 1.5 MB)
{
  const used = new Set(); const refs = [];
  for (const m of J.materials || []) { const pb = m.pbrMetallicRoughness || {}; for (const t of [pb.baseColorTexture, pb.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture]) if (t) { used.add(t.index); refs.push(t); } }
  const tmap = new Map(), tex = []; (J.textures || []).forEach((t, i) => { if (used.has(i)) { tmap.set(i, tex.length); tex.push(t); } });
  for (const r of refs) r.index = tmap.get(r.index);
  const iused = new Set(tex.map((t) => t.source)), imap = new Map(), imgs = []; (J.images || []).forEach((im, i) => { if (iused.has(i)) { imap.set(i, imgs.length); imgs.push(im); } });
  for (const t of tex) t.source = imap.get(t.source);
  const nr = new Map(); for (const [k, v] of roles) if (imap.has(k)) nr.set(imap.get(k), v); roles.clear(); for (const [k, v] of nr) roles.set(k, v);
  if ((J.images || []).length !== imgs.length) console.log(`  textures: ${(J.textures || []).length} -> ${tex.length}, images ${(J.images || []).length} -> ${imgs.length} (unused ones dropped)`);
  if (J.textures) J.textures = tex; if (J.images) J.images = imgs;
}

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
if (!Object.values(texMeta).some((T) => T.variant_of)) delete J.asset.extras.variants;
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
  J.asset.extras.variants[name] = { file, replaces: "baseColorTexture", width: T.width, height: T.height, ...(T.material ? { material: T.material, image: T.variant_of } : {}) };   // (base B: one a material)
  console.log(`  variant ${name}: ${T.width}x${T.height} -> ${file} ${(ktx.length / 1024).toFixed(0)} KB KTX2`);
}
for (const t of J.textures || []) { const s = t.source; t.extensions = { KHR_texture_basisu: { source: s } }; delete t.source; }
if ((J.textures || []).length) { J.extensionsUsed.push("KHR_texture_basisu"); J.extensionsRequired = [...new Set([...(J.extensionsRequired || []), "KHR_texture_basisu"])]; }   // (the far LOD has none)

// ------------------------------------------------------------------------------------------------ the rest-pose channels
// Blender's forced sampling writes a translation, rotation and scale track for every bone in every clip: most of them
// (base B: 2852 of 3300) hold the bone's rest value from the first key to the last. A missing track IS the rest pose to
// three's mixer (its PropertyMixer fills the weight no clip covers with the bound original state, the rest) and to
// tools/falconV2pose.mjs: they go, losslessly; then the accessors nothing uses any more.
{
  const NCc = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const rdF = (ai) => { const a = J.accessors[ai], v = J.bufferViews[a.bufferView], n = NCc[a.type], o = new Float32Array(a.count * n), st = v.byteStride || n * 4, off = (v.byteOffset || 0) + (a.byteOffset || 0); for (let i = 0; i < a.count; i++) for (let j = 0; j < n; j++) o[i * n + j] = BIN.readFloatLE(off + i * st + j * 4); return { o, n, c: a.count }; };
  let drop = 0, total = 0;
  for (const an of J.animations || []) {
    const keep = [];
    for (const ch of an.channels) {
      total++; const sm = an.samplers[ch.sampler], a = J.accessors[sm.output];
      if (a.componentType !== 5126) { keep.push(ch); continue; }
      const { o, n, c } = rdF(sm.output); let constant = true;
      for (let i = 1; i < c && constant; i++) for (let j = 0; j < n; j++) if (Math.abs(o[i * n + j] - o[j]) > 1e-6) { constant = false; break; }
      const nd = J.nodes[ch.target.node], p = ch.target.path;
      const r = p === "rotation" ? nd.rotation || [0, 0, 0, 1] : p === "translation" ? nd.translation || [0, 0, 0] : p === "scale" ? nd.scale || [1, 1, 1] : null;
      let d = Infinity;
      if (constant && r) { d = 0; for (let j = 0; j < n; j++) d = Math.max(d, Math.abs(o[j] - r[j])); if (p === "rotation") { let d2 = 0; for (let j = 0; j < 4; j++) d2 = Math.max(d2, Math.abs(-o[j] - r[j])); d = Math.min(d, d2); } }
      if (d < 1e-5) drop++; else keep.push(ch);
    }
    const smap = new Map(), smp = [];
    for (const ch of keep) { if (!smap.has(ch.sampler)) { smap.set(ch.sampler, smp.length); smp.push(an.samplers[ch.sampler]); } ch.sampler = smap.get(ch.sampler); }
    an.channels = keep; an.samplers = smp;
  }
  // the accessors still used, renumbered
  const refs = [];
  for (const m of J.meshes || []) for (const pr of m.primitives) { for (const k in pr.attributes) refs.push([pr.attributes, k]); if (pr.indices != null) refs.push([pr, "indices"]); for (const t of pr.targets || []) for (const k in t) refs.push([t, k]); }
  for (const sk of J.skins || []) if (sk.inverseBindMatrices != null) refs.push([sk, "inverseBindMatrices"]);
  for (const an of J.animations || []) for (const sm of an.samplers) refs.push([sm, "input"], [sm, "output"]);
  const amap = new Map(), acc = [];
  for (const [o, k] of refs) { const i = o[k]; if (!amap.has(i)) { amap.set(i, acc.length); acc.push(J.accessors[i]); } o[k] = amap.get(i); }
  console.log(`  clips: ${drop} of ${total} channels hold the rest pose throughout: dropped; accessors ${J.accessors.length} -> ${acc.length}`);
  J.accessors = acc;
}

// ------------------------------------------------------------------------------------------------ merge the small views
// Blender writes one buffer view per animation sampler (1700+ for 11 clips x 65 bones): the JSON (~0.7 MB) and the
// per-view meshopt overhead outweighed the key data. The views that are not vertex / index / image data (the clips'
// keys, the skin's matrices) are merged by element size into one view each (accessor byteOffsets into it): lossless,
// plain glTF, and meshopt compresses the long views better.
{
  const ES = (a) => ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType] * { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type]);
  const imgV = new Set((J.images || []).map((im) => im.bufferView)), es = new Map();
  for (const a of J.accessors) { if (a.bufferView == null) continue; const e = ES(a), o = es.get(a.bufferView); es.set(a.bufferView, o == null || o === e ? e : -1); }
  const mergeable = (vi) => !J.bufferViews[vi].target && !J.bufferViews[vi].byteStride && !imgV.has(vi) && es.get(vi) > 0 && es.get(vi) % 4 === 0;
  const parts = [], nViews = [], vmap = new Map(); let off = 0;
  const put = (b) => { const o = off; parts.push(b); off += b.length; const pad = (4 - (b.length % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; } return o; };
  const refd = new Set([...J.accessors.map((a) => a.bufferView), ...(J.images || []).map((im) => im.bufferView)].filter((v) => v != null));
  J.bufferViews.forEach((v, vi) => { if (refd.has(vi) && !mergeable(vi)) { vmap.set(vi, [nViews.length, 0]); nViews.push({ ...v, byteOffset: put(Buffer.from(BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength))) }); } });
  const groups = new Map(); J.bufferViews.forEach((v, vi) => { if (refd.has(vi) && mergeable(vi)) (groups.get(es.get(vi)) || groups.set(es.get(vi), []).get(es.get(vi))).push(vi); });
  for (const [e, list] of groups) {
    const start = off, ni = nViews.length;
    for (const vi of list) { const v = J.bufferViews[vi]; const b = Buffer.from(BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)); const o = off; parts.push(b); off += b.length; vmap.set(vi, [ni, o - start]); }
    nViews.push({ buffer: 0, byteOffset: start, byteLength: off - start }); const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  }
  for (const a of J.accessors) if (a.bufferView != null) { const [nv, o] = vmap.get(a.bufferView); a.bufferView = nv; a.byteOffset = (a.byteOffset || 0) + o; if (!a.byteOffset) delete a.byteOffset; }
  for (const im of J.images || []) if (im.bufferView != null) im.bufferView = vmap.get(im.bufferView)[0];
  console.log(`  views: ${J.bufferViews.length} -> ${nViews.length} (the clips' keys and the skin's matrices merged by element size)`);
  J.bufferViews = nViews; BIN = Buffer.concat(parts);
}

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
  else if (u && u.kind === "attr" && u.stride % 4 === 0 && u.stride <= 256 && raw.length % u.stride === 0) { mode = "ATTRIBUTES"; stride = u.stride; count = raw.length / u.stride; }
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
J.extensionsRequired ??= [];
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
