#!/usr/bin/env node
// PACK THE BMX (docs/BMX.md): models/bike/bmx.raw.glb (tools/blender/bmx.py: the rig of pivots + <Node>_LOD0..2 meshes,
// one primitive per named slot, the vertex AO in COLOR_0) -> models/bike/bmx.glb, what the game loads:
//   - the same nodes, hierarchy, transforms and materials (the rig is NOT flattened: the game spins / steers the pivots)
//   - every buffer EXT_meshopt_compression: positions exponential-filtered float (16-bit mantissa), normals octahedral
//     int8 (KHR_mesh_quantization), UVs exponential float, AO as normalized uint8 RGBA, indices TRIANGLES
//   - bmx_chain: the chain strip atlas (bmx_chain.ktx2, alpha MASK 0.5, u repeats); bmx_spokes: the spoke set
//     (bmx_spokes.ktx2, alpha BLEND, double sided: a pre-filtered card, QUALITY_RULES 23), KHR_texture_basisu, the
//     .ktx2 files next to the .glb
//   - the mesh audit (tools/mesh_audit) of each LOD as drawn at rest -> models/bike/audit/bmx_lod<k>.audit.{md,json};
//     the pack stops on blocking items (--force-audit overrides)
//     node tools/bike/bmx_pack.mjs [--force-audit]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const imp = (p) => import(pathToFileURL(path.resolve(root, p)).href);
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const { auditParts, toMarkdown } = await imp("tools/mesh_audit/audit.js");
const { MeshoptEncoder } = await imp("tools/worker/node_modules/meshoptimizer/meshopt_encoder.js");
await MeshoptEncoder.ready;

const DIR = path.join(root, "models", "bike");
const SRC = path.join(DIR, "bmx.raw.glb"), DST = path.join(DIR, "bmx.glb");
export const LOD_RANGE = [12, 40, 150];        // farthest view distance per LOD (m): the depth check's range

// ------------------------------------------------------------------------------------------------ read the raw GLB
const glb = fs.readFileSync(SRC);
const jl = glb.readUInt32LE(12);
const J = JSON.parse(glb.subarray(20, 20 + jl).toString());
const bin = glb.subarray(20 + jl + 8, 20 + jl + 8 + glb.readUInt32LE(20 + jl));
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const NORM = { 5126: 1, 5125: 1, 5123: 65535, 5122: 32767, 5121: 255, 5120: 127 };
const GET = { 5126: "getFloat32", 5125: "getUint32", 5123: "getUint16", 5122: "getInt16", 5121: "getUint8", 5120: "getInt8" };
const BYTES = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 };
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

// ------------------------------------------------------------------------------------------------ write
const G = { asset: { version: "2.0", generator: "uccle-city tools/bike/bmx_pack.mjs" },
  extensionsUsed: ["EXT_meshopt_compression", "KHR_mesh_quantization", "KHR_texture_basisu", ...(J.extensionsUsed || [])],
  extensionsRequired: ["EXT_meshopt_compression", "KHR_mesh_quantization", "KHR_texture_basisu"],
  scene: 0, scenes: J.scenes, nodes: J.nodes, meshes: [], materials: J.materials, accessors: [], bufferViews: [], buffers: [],
  images: [{ uri: "bmx_chain.ktx2", mimeType: "image/ktx2" }, { uri: "bmx_spokes.ktx2", mimeType: "image/ktx2" }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 33071 }, { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  textures: [{ sampler: 0, extensions: { KHR_texture_basisu: { source: 0 } } }, { sampler: 1, extensions: { KHR_texture_basisu: { source: 1 } } }] };
G.extensionsUsed = [...new Set(G.extensionsUsed)];
for (const m of G.materials) {
  const pbr = (m.pbrMetallicRoughness ||= {});
  if (m.name === "bmx_chain") { pbr.baseColorTexture = { index: 0 }; pbr.baseColorFactor = [1, 1, 1, 1]; m.alphaMode = "MASK"; m.alphaCutoff = 0.5; }
  if (m.name === "bmx_spokes") { pbr.baseColorTexture = { index: 1 }; pbr.baseColorFactor = [1, 1, 1, 1]; m.alphaMode = "BLEND"; m.doubleSided = true; }
}
const chunks = []; let off = 0, rawBytes = 0;
function view(bytes, count, stride, mode, filter, target) {
  const enc = Buffer.from(MeshoptEncoder.encodeGltfBuffer(bytes, count, stride, mode));
  const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const ext = { buffer: 0, byteOffset: off, byteLength: enc.length, byteStride: stride, mode, count, ...(filter ? { filter } : {}) };
  G.bufferViews.push({ buffer: 1, byteOffset: rawBytes, byteLength: count * stride, ...(mode === "ATTRIBUTES" ? { byteStride: stride } : {}), ...(target ? { target } : {}), extensions: { EXT_meshopt_compression: ext } });
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
  // the values the decoder will produce (for min / max)
  const dv = new DataView(enc.buffer, enc.byteOffset, enc.byteLength), out = new Float32Array(n * comps);
  for (let i = 0; i < n * comps; i++) { const w = dv.getUint32(i * 4, true), e = (w >> 24) << 24 >> 24, mant = (w << 8) >> 8; out[i] = Math.fround(mant * Math.pow(2, e)); }
  return out;
}
let tris = { LOD0: 0, LOD1: 0, LOD2: 0 };
const meshLod = new Map();
for (const nd of J.nodes) if (nd.mesh != null) meshLod.set(nd.mesh, (nd.name.match(/_LOD(\d)$/) || [])[1]);
J.meshes.forEach((mesh, mi) => {
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
    if (p.attributes.COLOR_0 != null) {
      const C = read(p.attributes.COLOR_0), w = C.length / nv, C8 = new Uint8Array(nv * 4);
      for (let i = 0; i < nv; i++) { const a = Math.round(Math.min(1, Math.max(0, C[i * w])) * 255); C8[i * 4] = C8[i * 4 + 1] = C8[i * 4 + 2] = a; C8[i * 4 + 3] = 255; }
      attributes.COLOR_0 = accessor(view(C8, nv, 4, "ATTRIBUTES", null, 34962), nv, "VEC4", 5121, true);
    }
    const I0 = read(p.indices), big = nv >= 65536, I = big ? Uint32Array.from(I0) : Uint16Array.from(I0);
    const indices = accessor(view(u8(I), I.length, big ? 4 : 2, "TRIANGLES", null, 34963), I.length, "SCALAR", big ? 5125 : 5123);
    prims.push({ attributes, indices, material: p.material });
    const lod = meshLod.get(mi); if (lod != null) tris[`LOD${lod}`] += I.length / 3;
  }
  G.meshes.push({ name: mesh.name, primitives: prims });
});
const binBuf = Buffer.concat(chunks), binPad = Buffer.alloc((4 - (binBuf.length % 4)) % 4);
G.buffers.push({ byteLength: binBuf.length + binPad.length }, { byteLength: rawBytes, extensions: { EXT_meshopt_compression: { fallback: true } } });
let js = Buffer.from(JSON.stringify(G)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length + binPad.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length + binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(DST, Buffer.concat([head, jh, js, bh, binBuf, binPad]));
console.log(`wrote models/bike/bmx.glb ${(fs.statSync(DST).size / 1024).toFixed(0)} KB (raw ${(fs.statSync(SRC).size / 1024).toFixed(0)} KB), tris ${JSON.stringify(tris)}`);

// ------------------------------------------------------------------------------------------------ mesh audit (each LOD as drawn, at rest)
const { parts } = await readGlb(DST);
fs.mkdirSync(path.join(DIR, "audit"), { recursive: true });
const audit = {};
let blocking = 0;
for (let k = 0; k < 3; k++) {
  const ps = parts.filter((p) => p.node.endsWith(`_LOD${k}`)).map((p) => ({ name: p.node, slot: p.slot, positions: p.positions, normals: p.normals, index: p.index, maxDistance: LOD_RANGE[k] }));
  const rep = auditParts(ps, { ignoreBelow: 0.002, maxItemsPerCheck: 4000 });
  rep.file = `models/bike/bmx.glb LOD${k}`;
  fs.writeFileSync(path.join(DIR, "audit", `bmx_lod${k}.audit.json`), JSON.stringify(rep));
  fs.writeFileSync(path.join(DIR, "audit", `bmx_lod${k}.audit.md`), toMarkdown(rep));
  audit[`LOD${k}`] = { blocking: rep.summary.blocking, warnings: rep.summary.warnings, counts: Object.fromEntries(Object.entries(rep.summary.counts).filter(([, v]) => v)) };
  blocking += rep.summary.blocking;
  console.log(`audit LOD${k}: blocking ${rep.summary.blocking} ${Object.entries(rep.summary.counts).filter(([, v]) => v).map(([n, v]) => `${n} ${v}`).join(", ")}`);
}
const infoPath = path.join(DIR, "bmx.json"), info = JSON.parse(fs.readFileSync(infoPath));
info.pack = { file: "bmx.glb", bytes: fs.statSync(DST).size, tris, audit, lodRange: LOD_RANGE };
fs.writeFileSync(infoPath, JSON.stringify(info, null, 1));
if (blocking && !process.argv.includes("--force-audit")) { console.error(`mesh audit: ${blocking} blocking items (models/bike/audit)`); process.exit(1); }
