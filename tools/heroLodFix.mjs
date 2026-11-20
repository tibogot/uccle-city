// REPACK A LANDMARK'S LOD1 WITHOUT COLLAPSED FACES, in the packed GLB (census class G, rule 34; tools/lodNoFight.mjs).
// The packers (tools/hero_pack.mjs, tools/observatory_pack.mjs) now do this themselves; their Blender exports
// (*.raw.glb) are git-ignored and not kept, so the shipped GLBs are fixed here: LOD1 shares LOD0's vertex buffers (an
// index buffer per primitive), so only the LOD1 index views of the primitives that fought are simplified again (from
// LOD0, the same budget and error, with the fighting vertices locked) and re-encoded; every other byte is copied.
//   node tools/heroLodFix.mjs models/stpierre/stpierre.glb [--level 1|2] [--err 0.05 | LOD2 0.35] [--dry] [--no-lock-border]
//   (--level 2: the far level from the scripted _far node; the observatory: --err 0.6 --no-lock-border)
// --droponly: only drop the covered-behind triangles (no new triangle: the town hall, whose LOD1 corners carry a Blender
//  AO bake keyed by its exact LOD1 triangles, townhall_lod1_ao.bin; a full fix = re-pack with tools/townhall_pack.mjs
//  after tools/blender/townhall_lod1_ao.py, from the Blender export)
import fs from "fs";
import { MeshoptEncoder } from "./worker/node_modules/meshoptimizer/meshopt_encoder.js";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";
import { readGlb } from "./mesh_audit/glb.mjs";
import { simplifyWeldedLocked, noFightLod1 } from "./lodNoFight.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const DRY = argv.includes("--dry"), DROP_ONLY = argv.includes("--droponly");
const LEVEL = +opt("--level", 1);                 // 1: _lod1 from the LOD0 node; 2: _lod2 from the _far node (Prune + LockBorder as the packers)
const ERR = +opt("--err", LEVEL === 2 ? 0.35 : 0.05);
const FLAGS = LEVEL === 2 ? ["ErrorAbsolute", "Prune", ...(argv.includes("--no-lock-border") ? [] : ["LockBorder"])] : ["ErrorAbsolute"];
const file = argv.filter((a) => !a.startsWith("--"))[0];
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;

const glb = fs.readFileSync(file);
const jl = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, bin = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
const { parts } = await readGlb(file);
const n1 = json.nodes.find((n) => n.name.endsWith(`_lod${LEVEL}`));
if (!n1) { console.log(`${file}: no _lod${LEVEL} node`); process.exit(0); }
const name0 = n1.name.replace(/_lod\d$/, "") + (LEVEL === 2 ? "_far" : "");
const p0 = parts.filter((p) => p.node === name0), p1 = parts.filter((p) => p.node === n1.name);
const mesh1 = json.meshes[n1.mesh];
if (p0.length !== p1.length || p1.length !== mesh1.primitives.length) throw new Error(`${file}: LOD0 / LOD1 primitives do not pair up`);
const prims = p0.map((a, k) => ({ P: a.positions, Nn: a.normals, I: a.index, lod: p1[k].index, want: p1[k].index.length, changed: false }));
const tris0 = prims.reduce((s, p) => s + p.lod.length / 3, 0);
const res = noFightLod1(prims, (k, lock) => { prims[k].changed = true; return simplifyWeldedLocked(prims[k].P, prims[k].Nn, prims[k].I, prims[k].want, ERR, FLAGS, lock)[0]; },
  { log: (s) => console.log(s), dropOnly: DROP_ONLY });
const tris1 = prims.reduce((s, p) => s + p.lod.length / 3, 0);
console.log(`${file}: LOD${LEVEL} new coplanar pairs ${res.before.pairs} (${res.before.m2.toFixed(1)} m2) -> ${res.after.pairs} (${res.after.m2.toFixed(1)} m2), ${res.locked} vertices locked, triangles ${tris0} -> ${tris1}`);
prims.forEach((p, k) => { if (p.lod !== p1[k].index) p.changed = true; });
if (DRY || !prims.some((p) => p.changed)) process.exit(0);

// ---- rewrite: the changed LOD1 index views re-encoded, every other view's bytes copied; buffer 0 compacted
const repl = new Map();                             // bufferView index -> new Uint32Array
mesh1.primitives.forEach((pr, k) => { if (prims[k].changed) { const acc = json.accessors[pr.indices]; repl.set(acc.bufferView, Uint32Array.from(prims[k].lod)); acc.count = prims[k].lod.length; acc.componentType = 5125; delete acc.min; delete acc.max; } });
for (const [vi] of repl) if (json.accessors.filter((a) => a.bufferView === vi).length !== 1) throw new Error(`view ${vi} is shared`);
const out = [], pad = (n) => (n + 3) & ~3;
let off = 0, fOff = 0;
const push = (u8) => { const o = off; out.push(u8); off = pad(off + u8.length); out.push(new Uint8Array(off - o - u8.length)); return o; };
json.bufferViews = json.bufferViews.map((v, i) => {
  const mo = v.extensions?.EXT_meshopt_compression;
  if (repl.has(i)) {
    const idx = repl.get(i), raw = new Uint8Array(idx.buffer);
    const enc = MeshoptEncoder.encodeGltfBuffer(raw, idx.length, 4, "TRIANGLES");
    const o = push(enc), fo = fOff; fOff = pad(fOff + raw.length);
    return { buffer: 1, byteOffset: fo, byteLength: raw.length, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: enc.length, byteStride: 4, count: idx.length, mode: "TRIANGLES" } } };
  }
  if (mo) {
    const o = push(new Uint8Array(bin.buffer, bin.byteOffset + (mo.byteOffset || 0), mo.byteLength)), fo = fOff; fOff = pad(fOff + v.byteLength);
    return { ...v, byteOffset: fo, extensions: { ...v.extensions, EXT_meshopt_compression: { ...mo, byteOffset: o } } };
  }
  if (v.buffer !== 0) throw new Error(`view ${i}: buffer ${v.buffer} without meshopt`);
  return { ...v, byteOffset: push(new Uint8Array(bin.buffer, bin.byteOffset + (v.byteOffset || 0), v.byteLength)) };
});
json.buffers[0].byteLength = off;
if (json.buffers[1]) json.buffers[1].byteLength = fOff;
const binOut = Buffer.concat(out.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
let js = Buffer.from(JSON.stringify(json));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const total = 12 + 8 + js.length + 8 + binOut.length;
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
const c2 = Buffer.alloc(8); c2.writeUInt32LE(binOut.length, 0); c2.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(file, Buffer.concat([head, c1, js, c2, binOut]));
const lods = file.replace(/\.glb$/, ".lods.json");
if (fs.existsSync(lods)) {
  const L = JSON.parse(fs.readFileSync(lods, "utf8"));
  if (L[n1.name]) L[n1.name].tris = tris1;
  L[n1.name] = { ...(L[n1.name] || {}), noFight: { before: res.before, after: res.after, locked: res.locked } };
  L.glbBytes = total;
  fs.writeFileSync(lods, JSON.stringify(L, null, 1));
}
console.log(`${file}: ${(glb.length / 1048576).toFixed(3)} MB -> ${(total / 1048576).toFixed(3)} MB`);
