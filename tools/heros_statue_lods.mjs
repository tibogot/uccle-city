// SQUARE DES HEROS, THE STATUE SLOT: meshoptimizer simplification for tools/blender/heros_statue_slot.py (the project's
// rule: levels of detail by meshoptimizer in JavaScript, never Blender's decimate). The Blender script writes a binary
// mesh, calls this, reads the result back:
//   node tools/heros_statue_lods.mjs <in.bin> <out.bin> <target triangles> [relative error, default 0.02] [flags, e.g. Permissive]
// .bin = uint32 vertexCount, triangleCount, floatsPerVertex; float32 vertices (x, y, z first, then any attributes, e.g.
// u, v: they travel with their vertex); uint32 indices. The output is compacted (only the vertices still used).
// meshoptimizer detects the attribute seams by position (vertices sharing a position are collapsed together), so a UV'd
// LOD0 simplifies into LOD1 / LOD2 that keep its UVs (the baked normal and AO maps stay valid).
import fs from "fs";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";

const [src, dst, want, errArg, flagArg] = process.argv.slice(2);
// flags: "Permissive" lets the far LOD collapse across UV seams (else they hold it at ~5k triangles; the seams' UVs bend a
// little, invisible at 100 m+)
const flags = flagArg ? flagArg.split(",") : [];
const buf = fs.readFileSync(src);
const nv = buf.readUInt32LE(0), nt = buf.readUInt32LE(4), fpv = buf.readUInt32LE(8);
const V = new Float32Array(buf.buffer.slice(buf.byteOffset + 12, buf.byteOffset + 12 + nv * fpv * 4));
const I = new Uint32Array(buf.buffer.slice(buf.byteOffset + 12 + nv * fpv * 4, buf.byteOffset + 12 + nv * fpv * 4 + nt * 12));
await MeshoptSimplifier.ready;
const target = Math.min(nt, +want) * 3;
const [out, err] = target >= nt * 3 ? [I, 0] : MeshoptSimplifier.simplify(I, V, fpv, target, +(errArg || 0.02), flags);
const map = new Int32Array(nv).fill(-1);
let n = 0;
for (const v of out) if (map[v] < 0) map[v] = n++;
const head = Buffer.alloc(12);
head.writeUInt32LE(n, 0); head.writeUInt32LE(out.length / 3, 4); head.writeUInt32LE(fpv, 8);
const verts = new Float32Array(n * fpv);
for (let v = 0; v < nv; v++) if (map[v] >= 0) verts.set(V.subarray(v * fpv, v * fpv + fpv), map[v] * fpv);
const idx = new Uint32Array(out.length);
for (let i = 0; i < out.length; i++) idx[i] = map[out[i]];
fs.writeFileSync(dst, Buffer.concat([head, Buffer.from(verts.buffer), Buffer.from(idx.buffer)]));
console.log(`[statue lods] ${nt} -> ${out.length / 3} triangles (target ${target / 3}), ${n} vertices, relative error ${err.toFixed(4)}`);
