// Read any GLB (EXT_meshopt_compression + KHR_mesh_quantization included) into audit parts: one part per primitive, in
// world space (node transforms applied), with the node name, the material (slot) name and the shading normals.
// meshoptimizer's decoder comes from tools/worker/node_modules (cd tools/worker && npm ci).
import fs from "fs";
import { MeshoptDecoder } from "../worker/node_modules/meshoptimizer/meshopt_decoder.mjs";

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPED = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5122: Int16Array, 5121: Uint8Array, 5120: Int8Array };
const NORM = { 5126: 1, 5125: 1, 5123: 65535, 5122: 32767, 5121: 255, 5120: 127 };

export async function readGlb(file) {
  const glb = fs.readFileSync(file);
  if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jl = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jl).toString());
  const binOff = 20 + jl + 8;
  const bin = glb.length > binOff ? glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl)) : Buffer.alloc(0);
  await MeshoptDecoder.ready;
  const views = new Map();
  let quantum = 0;
  const viewBytes = (vi) => {
    if (views.has(vi)) return views.get(vi);
    const v = json.bufferViews[vi];
    let out;
    const mo = v.extensions?.EXT_meshopt_compression;
    if (mo) {
      const src = new Uint8Array(bin.buffer, bin.byteOffset + (mo.byteOffset || 0), mo.byteLength);
      out = new Uint8Array(mo.count * mo.byteStride);
      MeshoptDecoder.decodeGltfBuffer(out, mo.count, mo.byteStride, src, mo.mode, mo.filter || "NONE");
      if (mo.filter === "EXPONENTIAL") quantum = Math.max(quantum, 1);   // flagged; the step is measured below
    } else {
      if (v.buffer !== 0) throw new Error(`buffer view ${vi} reads buffer ${v.buffer} without meshopt`);
      out = new Uint8Array(bin.buffer, bin.byteOffset + (v.byteOffset || 0), v.byteLength);
    }
    views.set(vi, out);
    return out;
  };
  const readAccessor = (ai) => {
    const a = json.accessors[ai], n = SIZE[a.type], T = TYPED[a.componentType];
    const v = json.bufferViews[a.bufferView];
    const raw = viewBytes(a.bufferView);
    const stride = v.extensions?.EXT_meshopt_compression?.byteStride ?? v.byteStride ?? n * T.BYTES_PER_ELEMENT;
    const out = new Float64Array(a.count * n);
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const get = { 5126: "getFloat32", 5125: "getUint32", 5123: "getUint16", 5122: "getInt16", 5121: "getUint8", 5120: "getInt8" }[a.componentType];
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
      let x = dv[get]((a.byteOffset || 0) + i * stride + k * T.BYTES_PER_ELEMENT, true);
      if (a.normalized) x = Math.max(-1, x / NORM[a.componentType]);
      out[i * n + k] = x;
    }
    return out;
  };
  // world matrices
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
  const local = (nd) => {
    if (nd.matrix) return nd.matrix.slice();
    const [tx, ty, tz] = nd.translation || [0, 0, 0], [qx, qy, qz, qw] = nd.rotation || [0, 0, 0, 1], [sx, sy, sz] = nd.scale || [1, 1, 1];
    return [(1 - 2 * (qy * qy + qz * qz)) * sx, 2 * (qx * qy + qz * qw) * sx, 2 * (qx * qz - qy * qw) * sx, 0,
      2 * (qx * qy - qz * qw) * sy, (1 - 2 * (qx * qx + qz * qz)) * sy, 2 * (qy * qz + qx * qw) * sy, 0,
      2 * (qx * qz + qy * qw) * sz, 2 * (qy * qz - qx * qw) * sz, (1 - 2 * (qx * qx + qy * qy)) * sz, 0, tx, ty, tz, 1];
  };
  const parts = [];
  const visit = (ni, parentM, rootName) => {
    const nd = json.nodes[ni], M = mul(parentM, local(nd)), name = rootName ?? nd.name ?? `node${ni}`;
    if (nd.mesh != null) {
      const mesh = json.meshes[nd.mesh];
      mesh.primitives.forEach((p, pi) => {
        if ((p.mode ?? 4) !== 4) return;
        const P = readAccessor(p.attributes.POSITION), Nn = p.attributes.NORMAL != null ? readAccessor(p.attributes.NORMAL) : null;
        const I = p.indices != null ? Uint32Array.from(readAccessor(p.indices)) : null;
        const n = P.length / 3, Pw = new Float32Array(n * 3), Nw = Nn ? new Float32Array(n * 3) : null;
        for (let i = 0; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          Pw[i * 3] = M[0] * x + M[4] * y + M[8] * z + M[12]; Pw[i * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; Pw[i * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
          if (Nw) {
            const a = Nn[i * 3], b = Nn[i * 3 + 1], c = Nn[i * 3 + 2];
            const X = M[0] * a + M[4] * b + M[8] * c, Y = M[1] * a + M[5] * b + M[9] * c, Z = M[2] * a + M[6] * b + M[10] * c, l = Math.hypot(X, Y, Z) || 1;
            Nw[i * 3] = X / l; Nw[i * 3 + 1] = Y / l; Nw[i * 3 + 2] = Z / l;
          }
        }
        const mat = p.material != null ? json.materials[p.material]?.name ?? `material${p.material}` : "";
        parts.push({ name, node: nd.name, slot: mat, positions: Pw, normals: Nw, index: I, prim: pi });
      });
    }
    for (const c of nd.children || []) visit(c, M, rootName ?? nd.name);
  };
  const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const ni of json.scenes[json.scene || 0].nodes) visit(ni, I4, null);
  // the position quantization step (meshopt's exponential filter keeps 16 mantissa bits in our packs): half a step at
  // the largest coordinate, a floor added to the depth check's required separation
  if (quantum) {
    let m = 0;
    for (const p of parts) for (const v of p.positions) m = Math.max(m, Math.abs(v));
    quantum = m * 2 ** -17;
  }
  return { json, parts, quantum };
}
