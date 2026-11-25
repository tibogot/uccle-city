// THE FALCON V2 FAR LOD (docs/FALCON_GYM.md "the far / family bird"): the raw v2 (tools/blender/falconV2.py ->
// <src>/build/falcon_v2.raw.glb) simplified by meshoptimizer to ~6k triangles, on the SAME skeleton and clips, with the
// SAME UVs and NO textures of its own: it wears falcon_v2.glb's material (the gym binds it to the near bird's
// skeleton and material: viewer/falconGym/gymBird.js), so the LOD costs no texture download and the plumage switch
// changes both.
//   node tools/falconV2far.mjs <raw.glb> <far.raw.glb> [--tris 6000]
//   node tools/falconV2pack.mjs <far.raw.glb> models/bird/v2/falcon_v2_far.glb       (meshopt; no KTX2: no textures)
// How: every loose part (the body, each feather card: the download's cards are separate parts) is simplified on its
// own (simplifyWithAttributes: the UVs and normals weigh in, so a card keeps its outline and its texture's place) to
// the same share of its triangles, the share searched so the total lands on --tris. A card never collapses into the
// body (they are separate parts) and a vertex keeps its own skin weights (a collapse only drops vertices).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(here, "worker/package.json"));
const { MeshoptSimplifier } = await import(pathToFileURL(req.resolve("meshoptimizer/simplifier")).href);
await MeshoptSimplifier.ready;

const [, , SRC, DST] = process.argv;
const TRIS = +(process.argv[process.argv.indexOf("--tris") + 1] || 6000) || 6000;
const glb = fs.readFileSync(SRC);
const jl = glb.readUInt32LE(12), J = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, BIN = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, CS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const view = (ai) => { const a = J.accessors[ai], v = J.bufferViews[a.bufferView]; const es = CS[a.componentType] * NC[a.type]; return { a, v, es, stride: v.byteStride || es, off: (v.byteOffset || 0) + (a.byteOffset || 0) }; };
const floats = (ai) => { const { a, stride, off } = view(ai), n = NC[a.type], o = new Float32Array(a.count * n); for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) o[i * n + c] = BIN.readFloatLE(off + i * stride + c * 4); return o; };
const ints = (ai) => { const { a, stride, off } = view(ai), o = new Uint32Array(a.count), rd = { 5121: "readUInt8", 5123: "readUInt16LE", 5125: "readUInt32LE" }[a.componentType]; for (let i = 0; i < a.count; i++) o[i] = BIN[rd](off + i * stride); return o; };

if (J.meshes.length !== 1 || J.meshes[0].primitives.length !== 1) throw new Error("falconV2far: expects the v2 raw glb (one mesh, one primitive)");
const prim = J.meshes[0].primitives[0];
const POS = floats(prim.attributes.POSITION), NRM = floats(prim.attributes.NORMAL), UV = floats(prim.attributes.TEXCOORD_0), IDX = ints(prim.indices);
const NV = POS.length / 3, NT = IDX.length / 3;
// the attributes the simplifier weighs: uv (x2: a texel shift shows), normal (x0.5)
const ATT = new Float32Array(NV * 5);
for (let v = 0; v < NV; v++) { ATT[v * 5] = UV[v * 2]; ATT[v * 5 + 1] = UV[v * 2 + 1]; ATT[v * 5 + 2] = NRM[v * 3]; ATT[v * 5 + 3] = NRM[v * 3 + 1]; ATT[v * 5 + 4] = NRM[v * 3 + 2]; }
// loose parts (union-find over the triangles, by POSITION: a UV seam does not split a part)
const remap = MeshoptSimplifier.generatePositionRemap(POS, 3);
const par = new Int32Array(NV).map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
for (let t = 0; t < NT; t++) for (const [a, b] of [[0, 1], [1, 2]]) { const ra = find(remap[IDX[t * 3 + a]]), rb = find(remap[IDX[t * 3 + b]]); if (ra !== rb) par[ra] = rb; }
const parts = new Map();
for (let t = 0; t < NT; t++) { const r = find(remap[IDX[t * 3]]); (parts.get(r) || parts.set(r, []).get(r)).push(IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]); }
const P = [...parts.values()].map((a) => new Uint32Array(a));
function simplifyAll(share) {
  const out = []; let n = 0;
  for (const ix of P) {
    const t0 = ix.length / 3, target = Math.max(2, Math.round(t0 * share)) * 3;
    const [r] = target >= ix.length ? [ix] : MeshoptSimplifier.simplifyWithAttributes(ix, POS, 3, ATT, 5, [2, 2, 0.5, 0.5, 0.5], null, target, 1.0, ["Sparse"]);
    out.push(r); n += r.length / 3;
  }
  return { out, n };
}
// the share searched (bisection) for the total triangle count
let lo = 0.02, hi = 1, best = null;
for (let it = 0; it < 18; it++) {
  const m = (lo + hi) / 2, r = simplifyAll(m);
  if (!best || Math.abs(r.n - TRIS) < Math.abs(best.n - TRIS)) best = { ...r, share: m };
  if (r.n > TRIS) hi = m; else lo = m;
  if (Math.abs(r.n - TRIS) < TRIS * 0.01) break;
}
const NI = best.out.reduce((s, a) => s + a.length, 0), newIdx = new Uint32Array(NI);
{ let o = 0; for (const a of best.out) { newIdx.set(a, o); o += a.length; } }
// compact the vertices: only the kept ones, in first-use order (every attribute copied byte for byte: the skin's
// JOINTS / WEIGHTS keep their own types)
const map = new Int32Array(NV).fill(-1), keep = [];
for (let i = 0; i < NI; i++) { const v = newIdx[i]; if (map[v] < 0) { map[v] = keep.length; keep.push(v); } newIdx[i] = map[v]; }
const chunks = []; let len = 0;
const add = (buf) => { const o = len; chunks.push(buf); len += buf.length; const pad = (4 - (buf.length % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); len += pad; } return o; };
const newViews = [], newAcc = [];
const attrs = {};
for (const [name, ai] of Object.entries(prim.attributes)) {
  const { a, es, stride, off } = view(ai), b = Buffer.alloc(keep.length * es);
  for (let i = 0; i < keep.length; i++) BIN.copy(b, i * es, off + keep[i] * stride, off + keep[i] * stride + es);
  const o = add(b); newViews.push({ buffer: 0, byteOffset: o, byteLength: b.length, target: 34962 });
  const na = { ...a, bufferView: null, byteOffset: 0, count: keep.length };
  if (name === "POSITION") { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (const v of keep) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], POS[v * 3 + c]); mx[c] = Math.max(mx[c], POS[v * 3 + c]); } na.min = mn; na.max = mx; }
  else { delete na.min; delete na.max; }
  newAcc.push(na); attrs[name] = na;
}
const big = keep.length > 65535, ib = Buffer.alloc(NI * (big ? 4 : 2));
for (let i = 0; i < NI; i++) big ? ib.writeUInt32LE(newIdx[i], i * 4) : ib.writeUInt16LE(newIdx[i], i * 2);
{ const o = add(ib); newViews.push({ buffer: 0, byteOffset: o, byteLength: ib.length, target: 34963 }); newAcc.push({ componentType: big ? 5125 : 5123, count: NI, type: "SCALAR" }); }
// every other buffer view (the skin's matrices, the clips) copied; the images dropped (no textures: the near bird's)
const meshAcc = new Set([...Object.values(prim.attributes), prim.indices]);
const imgViews = new Set((J.images || []).map((im) => im.bufferView).filter((v) => v != null));
const vmap = new Map();
J.accessors.forEach((a, i) => {
  if (meshAcc.has(i) || a.bufferView == null || vmap.has(a.bufferView) || imgViews.has(a.bufferView)) return;
  const v = J.bufferViews[a.bufferView], b = BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const o = add(Buffer.from(b)); vmap.set(a.bufferView, newViews.length); newViews.push({ ...v, buffer: 0, byteOffset: o });
});
const accOut = [], accMap = new Map();
J.accessors.forEach((a, i) => { if (meshAcc.has(i)) return; accMap.set(i, accOut.length); accOut.push({ ...a, bufferView: vmap.get(a.bufferView) }); });
const meshBase = accOut.length;
newAcc.forEach((a, k) => accOut.push({ ...a, bufferView: k }));
// the mesh views are the first newViews entries (0..n): the copied ones follow, already numbered by push order
J.accessors = accOut;
const ak = Object.keys(prim.attributes);
prim.attributes = Object.fromEntries(ak.map((n, k) => [n, meshBase + k])); prim.indices = meshBase + ak.length;
for (const s of J.skins || []) s.inverseBindMatrices = accMap.get(s.inverseBindMatrices);
for (const an of J.animations || []) for (const sm of an.samplers) { sm.input = accMap.get(sm.input); sm.output = accMap.get(sm.output); }
J.bufferViews = newViews; J.buffers = [{ byteLength: len }];
// no textures: the material keeps its name, factors, alpha and sidedness (the near bird's material replaces it)
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
console.log(`falconV2far: ${DST}: ${NT} -> ${NI / 3} triangles (${P.length} loose parts, share ${best.share.toFixed(3)}), ${NV} -> ${keep.length} vertices, ${(fs.statSync(DST).size / 1024).toFixed(0)} KB raw`);
