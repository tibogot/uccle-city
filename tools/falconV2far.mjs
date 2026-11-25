// THE FALCON V2 FAR LOD (docs/FALCON_GYM.md "the far LOD"): the raw v2 (tools/blender/falconV2b.py ->
// <src>/build/falcon_v2.raw.glb) simplified by meshoptimizer to --tris triangles (base B: ~2.5k of 7.3k), on the SAME
// skeleton and clips, with the SAME UVs and materials and NO textures of its own: it wears falcon_v2.glb's materials (the
// gym binds each far primitive to the near bird's skeleton and material by the material's name:
// viewer/falconGym/gymBird.js), so the LOD costs no texture download and the plumage switch changes both.
//   node tools/falconV2far.mjs <raw.glb> <far.raw.glb> [--tris 2500]
//   node tools/falconV2pack.mjs <far.raw.glb> models/bird/v2/falcon_v2_far.glb       (meshopt; no KTX2: no textures)
// How: every loose part of every primitive (the body, the eyes, each feather sheet) is simplified on its own
// (simplifyWithAttributes: the UVs and normals weigh in, so a part keeps its outline and its texture's place) to the same
// share of its triangles, the share searched so the total lands on --tris; a part never collapses into another and a
// vertex keeps its own skin weights (a collapse only drops vertices).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(here, "worker/package.json"));
const { MeshoptSimplifier } = await import(pathToFileURL(req.resolve("meshoptimizer/simplifier")).href);
await MeshoptSimplifier.ready;

const [, , SRC, DST] = process.argv;
const TRIS = +(process.argv[process.argv.indexOf("--tris") + 1] || 2500) || 2500;
const glb = fs.readFileSync(SRC);
const jl = glb.readUInt32LE(12), J = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, BIN = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, CS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const view = (ai) => { const a = J.accessors[ai], v = J.bufferViews[a.bufferView]; const es = CS[a.componentType] * NC[a.type]; return { a, v, es, stride: v.byteStride || es, off: (v.byteOffset || 0) + (a.byteOffset || 0) }; };
const floats = (ai) => { const { a, stride, off } = view(ai), n = NC[a.type], o = new Float32Array(a.count * n); for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) o[i * n + c] = BIN.readFloatLE(off + i * stride + c * 4); return o; };
const ints = (ai) => { const { a, stride, off } = view(ai), o = new Uint32Array(a.count), rd = { 5121: "readUInt8", 5123: "readUInt16LE", 5125: "readUInt32LE" }[a.componentType]; for (let i = 0; i < a.count; i++) o[i] = BIN[rd](off + i * stride); return o; };

if (J.meshes.length !== 1) throw new Error("falconV2far: expects the v2 raw glb (one skinned mesh)");
const PRIMS = J.meshes[0].primitives.map((prim) => {
  const POS = floats(prim.attributes.POSITION), NRM = floats(prim.attributes.NORMAL), UV = floats(prim.attributes.TEXCOORD_0), IDX = ints(prim.indices), NV = POS.length / 3;
  const ATT = new Float32Array(NV * 5);
  for (let v = 0; v < NV; v++) { ATT[v * 5] = UV[v * 2]; ATT[v * 5 + 1] = UV[v * 2 + 1]; ATT[v * 5 + 2] = NRM[v * 3]; ATT[v * 5 + 3] = NRM[v * 3 + 1]; ATT[v * 5 + 4] = NRM[v * 3 + 2]; }
  // loose parts (union-find over the triangles, by POSITION: a UV seam does not split a part)
  const remap = MeshoptSimplifier.generatePositionRemap(POS, 3);
  const par = new Int32Array(NV).map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let t = 0; t < IDX.length / 3; t++) for (const [a, b] of [[0, 1], [1, 2]]) { const ra = find(remap[IDX[t * 3 + a]]), rb = find(remap[IDX[t * 3 + b]]); if (ra !== rb) par[ra] = rb; }
  const parts = new Map();
  for (let t = 0; t < IDX.length / 3; t++) { const r = find(remap[IDX[t * 3]]); (parts.get(r) || parts.set(r, []).get(r)).push(IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]); }
  return { prim, POS, ATT, IDX, NV, parts: [...parts.values()].map((a) => new Uint32Array(a)) };
});
const NT = PRIMS.reduce((s, p) => s + p.IDX.length / 3, 0);
function simplifyAll(share) {
  let n = 0;
  const out = PRIMS.map((P) => P.parts.map((ix) => {
    const target = Math.max(1, Math.round((ix.length / 3) * share)) * 3;
    const [r] = target >= ix.length ? [ix] : MeshoptSimplifier.simplifyWithAttributes(ix, P.POS, 3, P.ATT, 5, [2, 2, 0.5, 0.5, 0.5], null, target, 1.0, ["Sparse"]);
    n += r.length / 3; return r;
  }));
  return { out, n };
}
let lo = 0.02, hi = 1, best = null;
for (let it = 0; it < 18; it++) {
  const m = (lo + hi) / 2, r = simplifyAll(m);
  if (!best || Math.abs(r.n - TRIS) < Math.abs(best.n - TRIS)) best = { ...r, share: m };
  if (r.n > TRIS) hi = m; else lo = m;
  if (Math.abs(r.n - TRIS) < TRIS * 0.01) break;
}
// the new buffer: per primitive its kept vertices (every attribute copied byte for byte: the skin keeps its types) and
// its indices; then every other buffer view (the skin's matrices, the clips); the images dropped
const chunks = []; let blen = 0;
const add = (buf) => { const o = blen; chunks.push(buf); blen += buf.length; const pad = (4 - (buf.length % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); blen += pad; } return o; };
const newViews = [], newAcc = [];
let keptV = 0, keptT = 0;
const primOut = PRIMS.map((P, pi) => {
  const parts = best.out[pi], NI = parts.reduce((s, a) => s + a.length, 0), idx = new Uint32Array(NI);
  { let o = 0; for (const a of parts) { idx.set(a, o); o += a.length; } }
  const map = new Int32Array(P.NV).fill(-1), keep = [];
  for (let i = 0; i < NI; i++) { const v = idx[i]; if (map[v] < 0) { map[v] = keep.length; keep.push(v); } idx[i] = map[v]; }
  keptV += keep.length; keptT += NI / 3;
  const attrs = {};
  for (const [name, ai] of Object.entries(P.prim.attributes)) {
    const { a, es, stride, off } = view(ai), b = Buffer.alloc(keep.length * es);
    for (let i = 0; i < keep.length; i++) BIN.copy(b, i * es, off + keep[i] * stride, off + keep[i] * stride + es);
    newViews.push({ buffer: 0, byteOffset: add(b), byteLength: b.length, target: 34962 });
    const na = { ...a, bufferView: newViews.length - 1, byteOffset: 0, count: keep.length };
    if (name === "POSITION") { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (const v of keep) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P.POS[v * 3 + c]); mx[c] = Math.max(mx[c], P.POS[v * 3 + c]); } na.min = mn; na.max = mx; }
    else { delete na.min; delete na.max; }
    attrs[name] = newAcc.length; newAcc.push(na);
  }
  const big = keep.length > 65535, ib = Buffer.alloc(NI * (big ? 4 : 2));
  for (let i = 0; i < NI; i++) big ? ib.writeUInt32LE(idx[i], i * 4) : ib.writeUInt16LE(idx[i], i * 2);
  newViews.push({ buffer: 0, byteOffset: add(ib), byteLength: ib.length, target: 34963 });
  const indices = newAcc.length; newAcc.push({ bufferView: newViews.length - 1, componentType: big ? 5125 : 5123, count: NI, type: "SCALAR" });
  return { ...P.prim, attributes: attrs, indices };
});
const meshAcc = new Set(PRIMS.flatMap((P) => [...Object.values(P.prim.attributes), P.prim.indices]));
const imgViews = new Set((J.images || []).map((im) => im.bufferView).filter((v) => v != null));
const vmap = new Map();
J.accessors.forEach((a, i) => {
  if (meshAcc.has(i) || a.bufferView == null || vmap.has(a.bufferView) || imgViews.has(a.bufferView)) return;
  const v = J.bufferViews[a.bufferView], b = BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  vmap.set(a.bufferView, newViews.length); newViews.push({ ...v, buffer: 0, byteOffset: add(Buffer.from(b)) });
});
const accOut = [...newAcc], accMap = new Map();
J.accessors.forEach((a, i) => { if (meshAcc.has(i)) return; accMap.set(i, accOut.length); accOut.push({ ...a, bufferView: vmap.get(a.bufferView) }); });
J.accessors = accOut;
J.meshes[0].primitives = primOut;
for (const s of J.skins || []) s.inverseBindMatrices = accMap.get(s.inverseBindMatrices);
for (const an of J.animations || []) for (const sm of an.samplers) { sm.input = accMap.get(sm.input); sm.output = accMap.get(sm.output); }
J.bufferViews = newViews; J.buffers = [{ byteLength: blen }];
for (const m of J.materials || []) { if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; } delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; }
delete J.images; delete J.textures; delete J.samplers;
J.asset.extras = { ...(J.asset.extras || {}), lod: "far", sharesTexturesWith: "falcon_v2.glb", sourceTriangles: NT, simplifiedShare: +best.share.toFixed(4) };
J.asset.generator = "uccle-city tools/falconV2far.mjs (meshoptimizer simplifyWithAttributes per loose part)";
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const bb = Buffer.concat(chunks);
const h = Buffer.alloc(12); h.write("glTF", 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bb.length, 8);
const c0 = Buffer.alloc(8); c0.writeUInt32LE(js.length, 0); c0.write("JSON", 4);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(bb.length, 0); c1.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(path.dirname(DST), { recursive: true });
fs.writeFileSync(DST, Buffer.concat([h, c0, js, c1, bb]));
fs.mkdirSync(DST + ".tex", { recursive: true }); fs.writeFileSync(DST + ".tex/textures.json", "{}");   // (the pack's input: no textures)
console.log(`falconV2far: ${DST}: ${NT} -> ${keptT} triangles (${PRIMS.length} primitives, ${PRIMS.reduce((s, p) => s + p.parts.length, 0)} loose parts, share ${best.share.toFixed(3)}), ${PRIMS.reduce((s, p) => s + p.NV, 0)} -> ${keptV} vertices, ${(fs.statSync(DST).size / 1024).toFixed(0)} KB raw`);
