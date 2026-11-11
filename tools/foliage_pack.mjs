// PACK THE PLANTS GLB (tools/blender/plants.py writes float everywhere): same scheme as tools/townhall_pack.mjs, no LODs
// (the plants' LODs are made at load, viewer/foliage/plants.js):
//   POSITION        float, meshopt EXPONENTIAL filter (16-bit mantissa: < 0.1 mm on a 1.5 m plant)
//   NORMAL          meshopt OCTAHEDRAL filter, int16 x4 normalized (KHR_mesh_quantization)
//   TEXCOORD_0      float (metres), EXPONENTIAL filter
//   TEXCOORD_1      (AO, random) uint16 normalized (both 0..1)
//   TEXCOORD_2 / 3  (the part's base x, y / base z, kind: metres and a small integer) float, EXPONENTIAL filter (18 bits)
// then every buffer view meshopt-encoded (EXT_meshopt_compression; three's MeshoptDecoder decodes it).
//   node tools/foliage_pack.mjs models/foliage/plants.raw.glb models/foliage/plants.glb
import fs from "fs";
import { MeshoptEncoder } from "./worker/node_modules/meshoptimizer/meshopt_encoder.js";

const [src, dst] = process.argv.slice(2);
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
const floatsOf = (acc) => { const d = viewData[acc.bufferView], o = d.byteOffset + (acc.byteOffset || 0); return new Float32Array(d.buffer.slice(o, o + acc.count * SIZE[acc.type] * 4)); };
for (const mesh of json.meshes) for (const prim of mesh.primitives) {
  for (const [name, ai] of Object.entries(prim.attributes)) {
    const acc = json.accessors[ai];
    viewInfo[acc.bufferView].attr = true;
    if (done.has(ai) || acc.componentType !== 5126) continue;
    done.add(ai);
    if (name === "NORMAL") {
      const f = floatsOf(acc), f4 = new Float32Array(acc.count * 4);
      for (let i = 0; i < acc.count; i++) { f4[i * 4] = f[i * 3]; f4[i * 4 + 1] = f[i * 3 + 1]; f4[i * 4 + 2] = f[i * 3 + 2]; }
      viewInfo[acc.bufferView].filter = { name: "OCTAHEDRAL", data: MeshoptEncoder.encodeFilterOct(f4, acc.count, 8, 12), stride: 8 };
      Object.assign(acc, { componentType: 5122, normalized: true, byteOffset: 0 }); delete acc.min; delete acc.max;
    } else if (name === "TEXCOORD_1") {
      const f = floatsOf(acc), out = new Uint16Array(acc.count * 2);
      for (let i = 0; i < f.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, f[i])) * 65535);
      viewData[acc.bufferView] = new Uint8Array(out.buffer); Object.assign(acc, { componentType: 5123, normalized: true, byteOffset: 0 }); delete acc.min; delete acc.max;
    } else {
      viewInfo[acc.bufferView].filter = { name: "EXPONENTIAL", data: MeshoptEncoder.encodeFilterExp(floatsOf(acc), acc.count, SIZE[acc.type] * 4, name === "POSITION" ? 16 : 18, "Separate"), stride: SIZE[acc.type] * 4 };
    }
  }
  if (prim.indices != null) viewInfo[json.accessors[prim.indices].bufferView].tri = (prim.mode ?? 4) === 4;
}
for (const acc of json.accessors) { const vi = viewInfo[acc.bufferView]; vi.count = acc.count; vi.stride = SIZE[acc.type] * CT[acc.componentType]; vi.ct = acc.componentType; }
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
  if (!enc) { parts.push(data); const o = off; off = pad(off + data.length); parts.push(new Uint8Array(off - o - data.length)); return { buffer: 0, byteOffset: o, byteLength: data.length }; }
  parts.push(enc); const o = off; off = pad(off + enc.length); parts.push(new Uint8Array(off - o - enc.length));
  const fo = fOff; fOff = pad(fOff + data.length);
  const out = { buffer: 1, byteOffset: fo, byteLength: data.length, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: enc.length, byteStride: stride, count: vi.count, mode, ...(vi.filter ? { filter: vi.filter.name } : {}) } } };
  if (mode === "ATTRIBUTES") out.byteStride = stride;
  return out;
});
json.buffers = [{ byteLength: off }, { byteLength: fOff, extensions: { EXT_meshopt_compression: { fallback: true } } }];
const ext = ["EXT_meshopt_compression", "KHR_mesh_quantization"];
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
