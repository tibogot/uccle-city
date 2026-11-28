#!/usr/bin/env node
// PACK THE MPFB KID CANDIDATES (docs/KIDCHAR.md, phase 1): models/kid/candidates/kid_<c>.raw.glb (tools/blender/kidMakeHuman.py)
// -> kid_<c>.glb + kid_<c>_<k>.ktx2, what the lab loads:
//   - nodes, skin (game_engine rig, 53 joints), hierarchy kept as exported
//   - every buffer EXT_meshopt_compression (like tools/bike/bmx_pack.mjs): positions exponential float (16-bit mantissa),
//     normals octahedral int8 (KHR_mesh_quantization), UVs exponential float, JOINTS_0 uint8, WEIGHTS_0 normalized uint8
//     (summing to 255), indices TRIANGLES, the inverse bind matrices as plain attributes
//   - base colour textures as KTX2 (KTX-Software `ktx create`, UASTC q2 + zstd 18, mipmaps; KTX_EXE overrides the path),
//     sRGB, next to the .glb; normal maps dropped (candidates: the base colour carries the look)
//   - materials: OPAQUE except the hair (MASK 0.5, double sided) and the brows / lashes (BLEND, double sided)
//     node tools/kid/kidCandPack.mjs [a b c]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const { MeshoptEncoder } = await import(pathToFileURL(path.resolve(root, "tools/worker/node_modules/meshoptimizer/meshopt_encoder.js")).href);
await MeshoptEncoder.ready;
const KTX = process.env.KTX_EXE || "C:/Program Files/KTX-Software/bin/ktx.exe";
const DIR = path.join(root, "models", "kid", "candidates");
const cands = process.argv.slice(2).length ? process.argv.slice(2) : ["a", "b", "c"];

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const NORM = { 5126: 1, 5125: 1, 5123: 65535, 5122: 32767, 5121: 255, 5120: 127 };
const GET = { 5126: "getFloat32", 5125: "getUint32", 5123: "getUint16", 5122: "getInt16", 5121: "getUint8", 5120: "getInt8" };
const BYTES = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 };

function alphaOf(name, hair) {
  if (name.endsWith("." + hair)) return { alphaMode: "MASK", alphaCutoff: 0.5, doubleSided: true };
  if (/eyebrow|eyelash/i.test(name)) return { alphaMode: "BLEND", doubleSided: true };
  return {};
}

for (const c of cands) {
  const SRC = path.join(DIR, `kid_${c}.raw.glb`), DST = path.join(DIR, `kid_${c}.glb`);
  const hairName = JSON.parse(fs.readFileSync(path.join(DIR, `kid_${c}.json`))).assets.hair;
  const glb = fs.readFileSync(SRC);
  const jl = glb.readUInt32LE(12);
  const J = JSON.parse(glb.subarray(20, 20 + jl).toString());
  const bin = glb.subarray(20 + jl + 8, 20 + jl + 8 + glb.readUInt32LE(20 + jl));
  const viewBytes = (bv) => { const v = J.bufferViews[bv]; return bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };
  function read(ai) {
    const a = J.accessors[ai], v = J.bufferViews[a.bufferView], n = SIZE[a.type];
    const stride = v.byteStride || n * BYTES[a.componentType];
    const dv = new DataView(bin.buffer, bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0));
    const out = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
      let x = dv[GET[a.componentType]](i * stride + k * BYTES[a.componentType], true);
      if (a.normalized) x = Math.max(-1, x / NORM[a.componentType]);
      out[i * n + k] = x;
    }
    return out;
  }

  // ------------------------------------------------------------------ textures -> KTX2 (base colour only)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kidpack-"));
  const usedImg = new Map();       // old image index -> new image index
  const images = [], textures = [];
  const texOf = (ti) => {
    const im = J.textures[ti].source;
    if (!usedImg.has(im)) {
      const I = J.images[im], bytes = viewBytes(I.bufferView);
      const png = path.join(tmp, `${im}.png`); fs.writeFileSync(png, bytes);
      const colorType = bytes[25];                                  // PNG IHDR: 2 RGB, 6 RGBA
      const fmt = colorType === 6 ? "R8G8B8A8_SRGB" : colorType === 2 ? "R8G8B8_SRGB" : null;
      if (!fmt) throw new Error(`image ${I.name}: PNG colour type ${colorType}`);
      const name = `kid_${c}_${images.length}.ktx2`;
      execFileSync(KTX, ["create", "--format", fmt, "--assign-tf", "srgb", "--encode", "uastc", "--uastc-quality", "2", "--zstd", "18",
        "--generate-mipmap", png, path.join(DIR, name)], { stdio: "inherit" });
      images.push({ uri: name, mimeType: "image/ktx2", name: I.name });
      textures.push({ sampler: 0, extensions: { KHR_texture_basisu: { source: images.length - 1 } } });
      usedImg.set(im, textures.length - 1);
    }
    return usedImg.get(im);
  };
  const materials = J.materials.map((m) => {
    const pbr = { ...(m.pbrMetallicRoughness || {}) };
    if (pbr.baseColorTexture) pbr.baseColorTexture = { index: texOf(pbr.baseColorTexture.index) };
    delete pbr.metallicRoughnessTexture;
    return { name: m.name, pbrMetallicRoughness: pbr, ...alphaOf(m.name, hairName) };
  });

  // ------------------------------------------------------------------ buffers
  const G = { asset: { version: "2.0", generator: "uccle-city tools/kid/kidCandPack.mjs" },
    extensionsUsed: ["EXT_meshopt_compression", "KHR_mesh_quantization", "KHR_texture_basisu"],
    extensionsRequired: ["EXT_meshopt_compression", "KHR_mesh_quantization", "KHR_texture_basisu"],
    scene: J.scene || 0, scenes: J.scenes, nodes: J.nodes, meshes: [], skins: [], materials, accessors: [], bufferViews: [], buffers: [],
    images, textures, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] };
  const chunks = []; let off = 0, rawBytes = 0;
  function view(bytes, count, stride, mode, filter, target) {
    const enc = Buffer.from(MeshoptEncoder.encodeGltfBuffer(bytes, count, stride, mode));
    const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
    const ext = { buffer: 0, byteOffset: off, byteLength: enc.length, byteStride: stride, mode, count, ...(filter ? { filter } : {}) };
    G.bufferViews.push({ buffer: 1, byteOffset: rawBytes, byteLength: count * stride, ...(mode === "ATTRIBUTES" && target ? { byteStride: stride } : {}), ...(target ? { target } : {}), extensions: { EXT_meshopt_compression: ext } });
    rawBytes += count * stride; rawBytes += (4 - (rawBytes % 4)) % 4;
    chunks.push(enc); off += enc.length;
    return G.bufferViews.length - 1;
  }
  function accessor(bv, count, type, ct, normalized = false, mm = null) {
    G.accessors.push({ bufferView: bv, componentType: ct, count, type, ...(normalized ? { normalized: true } : {}), ...(mm ? { min: mm[0], max: mm[1] } : {}) });
    return G.accessors.length - 1;
  }
  const u8 = (t) => new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
  function decodedExp(enc, n, comps) {
    const dv = new DataView(enc.buffer, enc.byteOffset, enc.byteLength), out = new Float32Array(n * comps);
    for (let i = 0; i < n * comps; i++) { const w = dv.getUint32(i * 4, true), e = (w >> 24) << 24 >> 24, mant = (w << 8) >> 8; out[i] = Math.fround(mant * Math.pow(2, e)); }
    return out;
  }
  let tris = 0;
  for (const mesh of J.meshes) {
    const prims = [];
    for (const p of mesh.primitives) {
      const P = read(p.attributes.POSITION), nv = P.length / 3;
      const attributes = {};
      const Pq = MeshoptEncoder.encodeFilterExp(P, nv, 12, 16, "SharedComponent"), Pd = decodedExp(Pq, nv, 3);
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < nv * 3; i++) { mn[i % 3] = Math.min(mn[i % 3], Pd[i]); mx[i % 3] = Math.max(mx[i % 3], Pd[i]); }
      attributes.POSITION = accessor(view(Pq, nv, 12, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "VEC3", 5126, false, [mn, mx]);
      const N = read(p.attributes.NORMAL), N4 = new Float32Array(nv * 4);
      for (let i = 0; i < nv; i++) { N4[i * 4] = N[i * 3]; N4[i * 4 + 1] = N[i * 3 + 1]; N4[i * 4 + 2] = N[i * 3 + 2]; }
      attributes.NORMAL = accessor(view(MeshoptEncoder.encodeFilterOct(N4, nv, 4, 8), nv, 4, "ATTRIBUTES", "OCTAHEDRAL", 34962), nv, "VEC3", 5120, true);
      if (p.attributes.TEXCOORD_0 != null) {
        const UV = read(p.attributes.TEXCOORD_0);
        attributes.TEXCOORD_0 = accessor(view(MeshoptEncoder.encodeFilterExp(UV, nv, 8, 14, "Separate"), nv, 8, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "VEC2", 5126);
      }
      if (p.attributes.JOINTS_0 != null) {
        const Jn = read(p.attributes.JOINTS_0), W = read(p.attributes.WEIGHTS_0);
        const J8 = new Uint8Array(nv * 4), W8 = new Uint8Array(nv * 4);
        for (let i = 0; i < nv; i++) {
          let s = 0; for (let k = 0; k < 4; k++) s += W[i * 4 + k];
          const q = [0, 1, 2, 3].map((k) => Math.round(W[i * 4 + k] / (s || 1) * 255));
          const d = 255 - q.reduce((a, b) => a + b, 0);            // the rounding error onto the largest weight
          q[q.indexOf(Math.max(...q))] += d;
          for (let k = 0; k < 4; k++) { J8[i * 4 + k] = q[k] ? Jn[i * 4 + k] : 0; W8[i * 4 + k] = q[k]; }
        }
        attributes.JOINTS_0 = accessor(view(J8, nv, 4, "ATTRIBUTES", null, 34962), nv, "VEC4", 5121);
        attributes.WEIGHTS_0 = accessor(view(W8, nv, 4, "ATTRIBUTES", null, 34962), nv, "VEC4", 5121, true);
      }
      const I0 = read(p.indices), big = nv >= 65536, I = big ? Uint32Array.from(I0) : Uint16Array.from(I0);
      const indices = accessor(view(u8(I), I.length, big ? 4 : 2, "TRIANGLES", null, 34963), I.length, "SCALAR", big ? 5125 : 5123);
      prims.push({ attributes, indices, material: p.material });
      tris += I.length / 3;
    }
    G.meshes.push({ name: mesh.name, primitives: prims });
  }
  for (const s of J.skins || []) {
    const M = read(s.inverseBindMatrices), n = M.length / 16;
    G.skins.push({ ...s, inverseBindMatrices: accessor(view(u8(M), n, 64, "ATTRIBUTES", null, null), n, "MAT4", 5126) });
  }
  const binBuf = Buffer.concat(chunks), binPad = Buffer.alloc((4 - (binBuf.length % 4)) % 4);
  G.buffers.push({ byteLength: binBuf.length + binPad.length }, { byteLength: rawBytes, extensions: { EXT_meshopt_compression: { fallback: true } } });
  let js = Buffer.from(JSON.stringify(G)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length + binPad.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length + binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(DST, Buffer.concat([head, jh, js, bh, binBuf, binPad]));
  fs.rmSync(tmp, { recursive: true, force: true });
  const ktxBytes = images.reduce((a, im) => a + fs.statSync(path.join(DIR, im.uri)).size, 0);
  const infoPath = path.join(DIR, `kid_${c}.json`), info = JSON.parse(fs.readFileSync(infoPath));
  info.pack = { file: `kid_${c}.glb`, glbBytes: fs.statSync(DST).size, ktx2: images.map((i) => i.uri), ktx2Bytes: ktxBytes, tris };
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 1));
  console.log(`kid_${c}.glb ${(fs.statSync(DST).size / 1024).toFixed(0)} KB + ${images.length} KTX2 ${(ktxBytes / 1024).toFixed(0)} KB (raw ${(glb.length / 1024).toFixed(0)} KB), ${tris} tris`);
}
