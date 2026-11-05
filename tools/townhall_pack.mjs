// PACK THE TOWN HALL GLB: Blender writes float everywhere. Here:
//   COLOR_0     float vec4 -> uint8 vec4 normalized (the per-face code in .r)
//   TEXCOORD_1  float vec2 -> uint16 vec2 normalized (the AO lightmap UV, 0..1; KHR_mesh_quantization)
// then every buffer view is meshopt-encoded (EXT_meshopt_compression; three's MeshoptDecoder decodes it in workers).
// POSITION, NORMAL and TEXCOORD_0 (world metres) stay float.
// LEVELS OF DETAIL (meshoptimizer, JavaScript, here at build time so the browser does no simplification at load):
//   TownHall_lod1 = LOD0 simplified on a position-welded index (see simplifyWelded), sharing LOD0's vertex buffers
//                      (only a new index buffer per primitive);
//   TownHall_lod2 = the scripted far variant (TownHall_far) trimmed the same way.
//   node tools/townhall_pack.mjs models/townhall/townhall.raw.glb models/townhall/townhall.glb [lod1 tris] [lod2 tris]
// meshoptimizer from tools/worker/node_modules (npm ci there).
import fs from "fs";
import { MeshoptEncoder } from "./worker/node_modules/meshoptimizer/meshopt_encoder.js";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";
const LOD1_TRIS = +(process.argv[4] || 20000), LOD2_TRIS = +(process.argv[5] || 3000);
const LOD1_ERR = 0.08, LOD2_ERR = 0.6;          // metres (ErrorAbsolute): the simplifier stops there even short of the target

const src = process.argv[2], dst = process.argv[3];
const glb = fs.readFileSync(src);
const jl = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, bin = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
await MeshoptEncoder.ready;

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const CT = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1 };
const viewData = json.bufferViews.map((v) => new Uint8Array(bin.buffer, bin.byteOffset + (v.byteOffset || 0), v.byteLength));
const viewInfo = json.bufferViews.map(() => ({}));
const done = new Set();
let quantized = false;
function floatsOf(acc) {
  const v = json.bufferViews[acc.bufferView], o = bin.byteOffset + (v.byteOffset || 0) + (acc.byteOffset || 0);
  return new Float32Array(bin.buffer.slice(o, o + acc.count * SIZE[acc.type] * 4));
}
// ------------------------------------------------------------------------------------------- LODs
await MeshoptSimplifier.ready;
function readAcc(ai) {
  const acc = json.accessors[ai], v = json.bufferViews[acc.bufferView], o = bin.byteOffset + (v.byteOffset || 0) + (acc.byteOffset || 0);
  const n = acc.count * SIZE[acc.type];
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[acc.componentType];
  return new T(bin.buffer.slice(o, o + n * T.BYTES_PER_ELEMENT));
}
/** meshoptimizer on a flat-shaded architectural mesh (hard edges and UV seams split the vertices): simplify a
 *  position-WELDED index buffer (1 mm), then give each corner of each new triangle back the ORIGINAL vertex at that
 *  position whose normal best matches the new triangle (its UVs, lightmap UV, code and normal stay right). */
function simplifyWelded(P, Nn, I, want, err, prune) {
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const C = new Float32Array(cpos);
  const [out, e] = MeshoptSimplifier.simplify(ci, C, 3, want, err, prune ? ["ErrorAbsolute", "Prune"] : ["ErrorAbsolute"]);
  const res = new Uint32Array(out.length);
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = -1, bd = -Infinity;
      for (const v of members[out[t + k]]) {
        const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz;
        if (d > bd) { bd = d; best = v; }
      }
      res[t + k] = best;
    }
  }
  return [res, e];
}
const lodReport = {};
function addLod(srcName, dstName, totalTarget, err, prune) {
  const node = json.nodes.find((n) => n.name === srcName);
  const mesh = json.meshes[node.mesh];
  const tris = mesh.primitives.reduce((s, p) => s + json.accessors[p.indices].count / 3, 0);
  const ratio = Math.min(1, totalTarget / tris);
  const prims = [];
  let outTris = 0;
  for (const p of mesh.primitives) {
    const P = readAcc(p.attributes.POSITION), Nn = readAcc(p.attributes.NORMAL), I = readAcc(p.indices);
    const want = Math.min(I.length, Math.max(12, Math.floor((I.length / 3) * ratio)) * 3);
    const [idx, e] = ratio < 1 ? simplifyWelded(P, Nn, Uint32Array.from(I), want, err, prune) : [Uint32Array.from(I), 0];
    outTris += idx.length / 3;
    viewData.push(new Uint8Array(idx.buffer)); viewInfo.push({ tri: true });
    json.bufferViews.push({ buffer: 0, byteLength: idx.byteLength });
    json.accessors.push({ bufferView: json.bufferViews.length - 1, componentType: 5125, count: idx.length, type: "SCALAR" });
    prims.push({ ...p, indices: json.accessors.length - 1 });
  }
  json.meshes.push({ name: dstName, primitives: prims });
  json.nodes.push({ name: dstName, mesh: json.meshes.length - 1, translation: node.translation, rotation: node.rotation, scale: node.scale });
  json.scenes[json.scene || 0].nodes.push(json.nodes.length - 1);
  lodReport[dstName] = { from: srcName, sourceTris: tris, tris: outTris };
  console.log(`${dstName}: ${tris} -> ${outTris} triangles`);
}
addLod("TownHall", "TownHall_lod1", LOD1_TRIS, LOD1_ERR, false);
addLod("TownHall_far", "TownHall_lod2", LOD2_TRIS, LOD2_ERR, true);

function convertAttributes() {
for (const mesh of json.meshes) for (const prim of mesh.primitives) {
    for (const [name, ai] of Object.entries(prim.attributes)) {
      const acc = json.accessors[ai];
      viewInfo[acc.bufferView].attr = true;
      if (done.has(ai)) continue;
      done.add(ai);
      if (name === "COLOR_0" && acc.componentType === 5126) {
        const n = SIZE[acc.type], f = floatsOf(acc), out = new Uint8Array(acc.count * 4);
        for (let i = 0; i < acc.count; i++) for (let k = 0; k < 4; k++) out[i * 4 + k] = Math.round(Math.min(1, Math.max(0, k < n ? f[i * n + k] : 1)) * 255);
        viewData[acc.bufferView] = out; Object.assign(acc, { componentType: 5121, normalized: true, type: "VEC4", byteOffset: 0 }); delete acc.min; delete acc.max;
      } else if (name === "POSITION" || name === "TEXCOORD_0") {
        // meshopt EXPONENTIAL filter: float kept, mantissa trimmed (positions 4 mm at 130 m; world-metre UVs 1 mm at 130 m)
        viewInfo[acc.bufferView].filter = { name: "EXPONENTIAL", data: MeshoptEncoder.encodeFilterExp(floatsOf(acc), acc.count, SIZE[acc.type] * 4, name === "POSITION" ? 16 : 18, "Separate"), stride: SIZE[acc.type] * 4 };
      } else if (name === "NORMAL" && acc.componentType === 5126) {
        // meshopt OCTAHEDRAL filter: int16 x4 (12 bits), KHR_mesh_quantization SHORT normalized
        const f = floatsOf(acc), f4 = new Float32Array(acc.count * 4);
        for (let i = 0; i < acc.count; i++) { f4[i * 4] = f[i * 3]; f4[i * 4 + 1] = f[i * 3 + 1]; f4[i * 4 + 2] = f[i * 3 + 2]; }
        viewInfo[acc.bufferView].filter = { name: "OCTAHEDRAL", data: MeshoptEncoder.encodeFilterOct(f4, acc.count, 8, 12), stride: 8 };
        Object.assign(acc, { componentType: 5122, normalized: true, byteOffset: 0 }); delete acc.min; delete acc.max;
        quantized = true;
      } else if (name === "TEXCOORD_1" && acc.componentType === 5126) {
        const f = floatsOf(acc), out = new Uint16Array(acc.count * 2);
        for (let i = 0; i < f.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, f[i])) * 65535);
        viewData[acc.bufferView] = new Uint8Array(out.buffer); Object.assign(acc, { componentType: 5123, normalized: true, byteOffset: 0 }); delete acc.min; delete acc.max;
        quantized = true;
      }
    }
    if (prim.indices != null) viewInfo[json.accessors[prim.indices].bufferView].tri = (prim.mode ?? 4) === 4;
  }
}
convertAttributes();
for (const acc of json.accessors) {
  const vi = viewInfo[acc.bufferView];
  vi.count = acc.count; vi.stride = SIZE[acc.type] * CT[acc.componentType]; vi.ct = acc.componentType;
}
const parts = [];
let off = 0, fOff = 0;
const pad = (n) => (n + 3) & ~3;
json.bufferViews = json.bufferViews.map((v, i) => {
  const vi = viewInfo[i], data = vi.filter ? vi.filter.data : viewData[i], stride = vi.filter ? vi.filter.stride : vi.stride;
  let enc, mode;
  if (vi.filter) { mode = "ATTRIBUTES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  else if (vi.tri && vi.count % 3 === 0) { mode = "TRIANGLES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  else if (vi.attr && stride % 4 === 0) { mode = "ATTRIBUTES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  else if (vi.count && (vi.ct === 5125 || vi.ct === 5123)) { mode = "INDICES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  if (!enc) {
    parts.push(data); const o = off; off = pad(off + data.length); parts.push(new Uint8Array(off - o - data.length));
    return { buffer: 0, byteOffset: o, byteLength: data.length };
  }
  parts.push(enc); const o = off; off = pad(off + enc.length); parts.push(new Uint8Array(off - o - enc.length));
  const fo = fOff; fOff = pad(fOff + data.length);
  const out = { buffer: 1, byteOffset: fo, byteLength: data.length, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: enc.length, byteStride: stride, count: vi.count, mode, ...(vi.filter ? { filter: vi.filter.name } : {}) } } };
  if (mode === "ATTRIBUTES") out.byteStride = stride;
  return out;
});
json.buffers = [{ byteLength: off }, { byteLength: fOff, extensions: { EXT_meshopt_compression: { fallback: true } } }];
const ext = ["EXT_meshopt_compression", ...(quantized ? ["KHR_mesh_quantization"] : [])];
json.extensionsUsed = [...new Set([...(json.extensionsUsed || []), ...ext])];
json.extensionsRequired = [...new Set([...(json.extensionsRequired || []), ...ext])];
const binOut = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
let js = Buffer.from(JSON.stringify(json));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const total = 12 + 8 + js.length + 8 + binOut.length;
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
const c2 = Buffer.alloc(8); c2.writeUInt32LE(binOut.length, 0); c2.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(dst, Buffer.concat([head, c1, js, c2, binOut]));
console.log(`${src} ${(glb.length / 1048576).toFixed(2)} MB -> ${dst} ${(total / 1048576).toFixed(2)} MB`);
fs.writeFileSync(dst.replace(/\.glb$/, ".lods.json"), JSON.stringify({ ...lodReport, glbBytes: total, rawBytes: glb.length }, null, 1));
