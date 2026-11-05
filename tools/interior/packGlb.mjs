// PACK THE INTERIOR GLB (Blender's export is float everywhere; the baked per-corner lighting alone is 36 bytes a corner):
//   _LMSKY / _LMSUN / _LMNIGHT  float vec3 -> uint8 vec4 normalized RGBM, gamma 2 (lin = (rgb * a * 4)^2, as the lightmaps)
//   COLOR_0                     float vec4 -> uint8 vec4 normalized (linear albedo, the pattern code in alpha)
// then every buffer view is meshopt-encoded (EXT_meshopt_compression, decoded by three's MeshoptDecoder in a worker-free
// WASM pass). Uses the meshoptimizer already installed for the tile worker build (tools/worker/node_modules).
//   node tools/interior/packGlb.mjs models/interior/maison1/interior.glb [out.glb]
import fs from "fs";
import { MeshoptEncoder } from "../worker/node_modules/meshoptimizer/meshopt_encoder.js";

const src = process.argv[2], dst = process.argv[3] || src.replace(/\.glb$/, ".pack.glb");
const glb = fs.readFileSync(src);
const jl = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, bin = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
await MeshoptEncoder.ready;

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const CT = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 };
const viewData = json.bufferViews.map((v) => new Uint8Array(bin.buffer, bin.byteOffset + (v.byteOffset || 0), v.byteLength));
const viewInfo = json.bufferViews.map(() => ({}));
const done = new Set();
function floatsOf(acc) {
  const v = json.bufferViews[acc.bufferView];
  return new Float32Array(bin.buffer.slice(bin.byteOffset + (v.byteOffset || 0) + (acc.byteOffset || 0), bin.byteOffset + (v.byteOffset || 0) + (acc.byteOffset || 0) + acc.count * SIZE[acc.type] * 4));
}
for (const mesh of json.meshes) for (const prim of mesh.primitives) {
  for (const [name, ai] of Object.entries(prim.attributes)) {
    const acc = json.accessors[ai];
    viewInfo[acc.bufferView].attr = true;
    if (done.has(ai)) continue;
    done.add(ai);
    if (/^_LM/.test(name) && acc.componentType === 5126) {
      const f = floatsOf(acc), out = new Uint8Array(acc.count * 4);
      for (let i = 0; i < acc.count; i++) {
        const r = Math.sqrt(Math.max(0, f[i * 3])) / 4, g = Math.sqrt(Math.max(0, f[i * 3 + 1])) / 4, b = Math.sqrt(Math.max(0, f[i * 3 + 2])) / 4;
        const m = Math.min(1, Math.max(1 / 255, Math.ceil(Math.max(r, g, b) * 255) / 255));
        out[i * 4] = Math.round(Math.min(1, r / m) * 255); out[i * 4 + 1] = Math.round(Math.min(1, g / m) * 255);
        out[i * 4 + 2] = Math.round(Math.min(1, b / m) * 255); out[i * 4 + 3] = Math.round(m * 255);
      }
      viewData[acc.bufferView] = out; Object.assign(acc, { componentType: 5121, normalized: true, type: "VEC4", byteOffset: 0 }); delete acc.min; delete acc.max;
    } else if (name === "COLOR_0" && acc.componentType === 5126) {
      const n = SIZE[acc.type], f = floatsOf(acc), out = new Uint8Array(acc.count * 4);
      for (let i = 0; i < acc.count; i++) for (let k = 0; k < 4; k++) out[i * 4 + k] = Math.round(Math.min(1, Math.max(0, k < n ? f[i * n + k] : 1)) * 255);
      viewData[acc.bufferView] = out; Object.assign(acc, { componentType: 5121, normalized: true, type: "VEC4", byteOffset: 0 }); delete acc.min; delete acc.max;
    }
  }
  if (prim.indices != null) viewInfo[json.accessors[prim.indices].bufferView].tri = (prim.mode ?? 4) === 4;
}
// strides / counts per view (one accessor per view in Blender's export)
for (const acc of json.accessors) {
  const vi = viewInfo[acc.bufferView];
  vi.count = acc.count; vi.stride = SIZE[acc.type] * CT[acc.componentType]; vi.ct = acc.componentType;
}
const parts = [], fallbackLen = [];
let off = 0, fOff = 0;
const views = json.bufferViews.map((v, i) => {
  const data = viewData[i], vi = viewInfo[i];
  let enc, mode, stride = vi.stride;
  if (vi.tri && vi.count % 3 === 0) { mode = "TRIANGLES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  else if (vi.attr && stride % 4 === 0) { mode = "ATTRIBUTES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  else if (vi.count && (vi.ct === 5125 || vi.ct === 5123)) { mode = "INDICES"; enc = MeshoptEncoder.encodeGltfBuffer(data, vi.count, stride, mode); }
  const pad = (n) => (n + 3) & ~3;
  if (!enc) {        // raw (none in practice)
    parts.push(data); const o = off; off = pad(off + data.length); parts.push(new Uint8Array(off - o - data.length));
    return { buffer: 0, byteOffset: o, byteLength: data.length };
  }
  parts.push(enc); const o = off; off = pad(off + enc.length); parts.push(new Uint8Array(off - o - enc.length));
  const fo = fOff; fOff = pad(fOff + data.length);
  const out = { buffer: 1, byteOffset: fo, byteLength: data.length, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: enc.length, byteStride: stride, count: vi.count, mode } } };
  if (mode === "ATTRIBUTES") out.byteStride = stride;
  return out;
});
json.bufferViews = views;
json.buffers = [{ byteLength: off }, { byteLength: fOff, extensions: { EXT_meshopt_compression: { fallback: true } } }];
json.extensionsUsed = [...new Set([...(json.extensionsUsed || []), "EXT_meshopt_compression"])];
json.extensionsRequired = [...new Set([...(json.extensionsRequired || []), "EXT_meshopt_compression"])];
const binOut = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
let js = Buffer.from(JSON.stringify(json));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const total = 12 + 8 + js.length + 8 + binOut.length;
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
const c2 = Buffer.alloc(8); c2.writeUInt32LE(binOut.length, 0); c2.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(dst, Buffer.concat([head, c1, js, c2, binOut]));
console.log(`${src} ${(glb.length / 1048576).toFixed(2)} MB -> ${dst} ${(total / 1048576).toFixed(2)} MB`);
