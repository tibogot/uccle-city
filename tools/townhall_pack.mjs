// PACK THE TOWN HALL GLB: Blender writes float everywhere. Here:
//   COLOR_0     float vec4 -> uint8 vec4 normalized (the per-face code in .r)
//   TEXCOORD_1  float vec2 -> uint16 vec2 normalized (the AO lightmap UV, 0..1; KHR_mesh_quantization)
// then every buffer view is meshopt-encoded (EXT_meshopt_compression; three's MeshoptDecoder decodes it in workers).
// POSITION, NORMAL and TEXCOORD_0 (world metres) stay float.
// LEVELS OF DETAIL (meshoptimizer, JavaScript, here at build time so the browser does no simplification at load):
//   TownHall_lod1 = LOD0 simplified on a position-welded index (see simplifyWelded), sharing LOD0's vertex buffers
//                      (a new index buffer per primitive, + a few vertices appended for the triangles that cross
//                      lightmap islands: their AO moves to the vertex, see islandCorners);
//   TownHall_lod2 = the scripted far variant (TownHall_far) trimmed the same way.
//   node tools/townhall_pack.mjs models/townhall/townhall.raw.glb models/townhall/townhall.glb [lod1 tris] [lod2 tris]
// meshoptimizer from tools/worker/node_modules (npm ci there).
import fs from "fs";
import path from "path";
import zlib from "zlib";
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
// (reads go through viewData: the LOD step appends vertices to some views)
function floatsOf(acc) {
  const d = viewData[acc.bufferView], o = d.byteOffset + (acc.byteOffset || 0);
  return new Float32Array(d.buffer.slice(o, o + acc.count * SIZE[acc.type] * 4));
}
// ------------------------------------------------------------------------------------------- LODs
await MeshoptSimplifier.ready;
function readAcc(ai) {
  const acc = json.accessors[ai], d = viewData[acc.bufferView], o = d.byteOffset + (acc.byteOffset || 0);
  const n = acc.count * SIZE[acc.type];
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[acc.componentType];
  return new T(d.buffer.slice(o, o + n * T.BYTES_PER_ELEMENT));
}
/** the baked AO map (townhall_ao.png next to the raw GLB: 8-bit RGB, no interlace), red channel, bilinear in glTF UVs */
function loadAO(file) {
  const b = fs.readFileSync(file);
  const W = b.readUInt32BE(16), H = b.readUInt32BE(20), ct = b[25], bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  const idat = [];
  for (let o = 8; o < b.length;) { const L = b.readUInt32BE(o), t = b.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(b.subarray(o + 8, o + 8 + L)); o += 12 + L; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = W * bpp, out = new Uint8Array(W * H), row = new Uint8Array(stride), prev = new Uint8Array(stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      row[i] = v & 255;
    }
    for (let x = 0; x < W; x++) out[y * W + x] = row[x * bpp];
    prev.set(row);
  }
  return (u, v) => {
    const x = Math.min(W - 1.001, Math.max(0, u * W - 0.5)), y = Math.min(H - 1.001, Math.max(0, v * H - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, P = (i, j) => out[j * W + i] / 255;
    return (P(x0, y0) * (1 - fx) + P(x0 + 1, y0) * fx) * (1 - fy) + (P(x0, y0 + 1) * (1 - fx) + P(x0 + 1, y0 + 1) * fx) * fy;
  };
}
const aoAt = loadAO(path.join(path.dirname(src), "townhall_ao.png"));
const AO_PARK = [0.997, 0.25];      // (v 0.25: not the thin faces' park (LOD0 v 0.56, far 0.06): the viewer tells thin faces by it)
/** meshoptimizer on a flat-shaded architectural mesh (hard edges and UV seams split the vertices): simplify a
 *  position-WELDED index buffer (1 mm), then give each corner of each new triangle back the ORIGINAL vertex at that
 *  position whose normal best matches the new triangle (its UVs, lightmap UV, code and normal stay right). */
function simplifyWelded(P, Nn, I, want, err, prune, UV1) {
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
  // (polish 2) the corners' original vertices are picked so that the triangle's lightmap UVs stay inside ONE lightmap
  // island (islands = the original vertices connected by triangles; the export splits vertices at UV seams): picking each
  // corner by its normal alone gave triangles whose AO UVs spanned the atlas or reached the parked AO-1.0 column of the
  // thin faces = bright / dark patches and sparkle on LOD1's quoins, surrounds and frames from ~90 m (owner's review).
  // When no island holds all three corners, the corner gets a NEW vertex (a copy of its best-normal original) with its
  // lightmap UV parked (AO 1.0) and the AO sampled from the map at its original UV moved into COLOR_0.g (vertex AO).
  const isl = islands(I, n);
  // the AO a corner takes along: sampled a quarter of the way from its lightmap UV toward the centroid of its original
  // triangles (inside its island: at the very corner the bilinear sample reached the unbaked background = too dark)
  const cen = UV1 ? new Float32Array(n * 3) : null;
  if (UV1) for (let t = 0; t < I.length; t += 3) {
    const cu = (UV1[I[t] * 2] + UV1[I[t + 1] * 2] + UV1[I[t + 2] * 2]) / 3, cv = (UV1[I[t] * 2 + 1] + UV1[I[t + 1] * 2 + 1] + UV1[I[t + 2] * 2 + 1]) / 3;
    for (let k = 0; k < 3; k++) { const v = I[t + k]; cen[v * 3] += cu; cen[v * 3 + 1] += cv; cen[v * 3 + 2] += 1; }
  }
  const aoInside = (v) => { const c = cen[v * 3 + 2] || 1, u = UV1[v * 2] * 0.75 + (cen[v * 3] / c) * 0.25, w = UV1[v * 2 + 1] * 0.75 + (cen[v * 3 + 1] / c) * 0.25; return aoAt(u, w); };
  const res = new Uint32Array(out.length), extra = [], dedupe = new Map();
  let cross = 0;
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const score = (v) => Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz;
    const fl = Math.hypot(fx, fy, fz) || 1, fn = [fx / fl, fy / fl, fz / fl];
    // a corner whose original vertices all face away from the new triangle (> 45 deg: e.g. the back edge of a
    // pilaster's side face, where the simplified wall now runs) gets a copy with the triangle's own normal: LOD1 showed
    // side normals smeared over front faces = sunlit strips on the quoins and surrounds (owner's review, polish 2)
    const place = (k, v, ao) => {
      const cos = score(v) / fl / (Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1);
      const nrm = cos < 0.7 ? fn : null;
      if (ao == null && !nrm) { res[t + k] = v; return; }
      const key = `${v}|${ao == null ? "" : ao.toFixed(3)}|${nrm ? nrm.map((x) => x.toFixed(2)).join(",") : ""}`;   // (shared by the triangles that agree)
      let idx = dedupe.get(key);
      if (idx === undefined) { idx = n + extra.length; extra.push([v, ao, nrm]); dedupe.set(key, idx); }
      res[t + k] = idx;
    };
    // per corner: the best vertex of each island present there
    const per = [0, 1, 2].map((k) => { const m = new Map(); for (const v of members[out[t + k]]) { const s = score(v), i = isl[v]; if (!m.has(i) || s > m.get(i)[1]) m.set(i, [v, s]); } return m; });
    let bestIsl = -1, bestS = -Infinity;
    for (const [i, [, s0]] of per[0]) {
      const p1 = per[1].get(i), p2 = per[2].get(i);
      if (p1 && p2 && s0 + p1[1] + p2[1] > bestS) { bestS = s0 + p1[1] + p2[1]; bestIsl = i; }
    }
    // the best island must also face the triangle (not a back face that happens to share the corners)
    const bestFree = per.reduce((s, m) => s + Math.max(...[...m.values()].map((x) => x[1])), 0);
    // ... and the triangle must stay on baked texels: an island can be concave (a window surround is a ring), and a
    // simplified triangle across its hole sampled the empty atlas (AO 0) = black reveals and glazing on LOD1
    const onBaked = (vs) => {
      if (!UV1) return true;
      const U = vs.map((v) => [UV1[v * 2], UV1[v * 2 + 1]]);
      if (U.every(([u]) => u > 0.99)) return true;
      const pts = [[1 / 3, 1 / 3], [0.5, 0.5], [0, 0.5], [0.5, 0], [0.7, 0.15], [0.15, 0.7], [0.15, 0.15]];
      return pts.every(([a, b]) => aoAt(U[0][0] * (1 - a - b) + U[1][0] * a + U[2][0] * b, U[0][1] * (1 - a - b) + U[1][1] * a + U[2][1] * b) > 0.008);
    };
    if (bestIsl >= 0 && bestS >= bestFree * 0.98 - 1e-12 && onBaked([0, 1, 2].map((k) => per[k].get(bestIsl)[0]))) {
      for (let k = 0; k < 3; k++) place(k, per[k].get(bestIsl)[0], null);
      continue;
    }
    cross++;
    for (let k = 0; k < 3; k++) {
      // the best-facing original; a lightmapped one (not a thin face's) when one faces the triangle well enough: a thin
      // face's own vertex AO (a crevice) spread over a big LOD1 triangle darkened whole pilasters
      let best = -1, bd = -Infinity, lit = -1, ld = -Infinity;
      for (const v of members[out[t + k]]) {
        const sc = score(v);
        if (sc > bd) { bd = sc; best = v; }
        const cos = sc / fl / (Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1);
        if (UV1 && UV1[v * 2] <= 0.996 && cos > 0.5 && sc > ld) { ld = sc; lit = v; }
      }
      const v = lit >= 0 ? lit : best;
      // every corner of a cross-island triangle is parked at v 0.25 (the shader must not take it for a thin face), with
      // the map's AO inside its island, or a thin face's own vertex AO (x 1)
      place(k, v, !UV1 ? null : UV1[v * 2] > 0.996 ? 1 : aoInside(v));
    }
  }
  return [res, e, extra, cross];
}
/** lightmap islands: union-find over the original triangles (vertices are split at UV seams by the export) */
function islands(I, n) {
  const par = new Int32Array(n).map((_, i) => i);
  const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let t = 0; t < I.length; t += 3) {
    const a = find(I[t]), b = find(I[t + 1]), c = find(I[t + 2]);
    par[b] = a; par[find(c)] = a;
  }
  const out = new Int32Array(n);
  for (let i = 0; i < n; i++) out[i] = find(i);
  return out;
}
/** append vertices (copies of `extra[i][0]`; with an AO extra[i][1]: TEXCOORD_1 parked and COLOR_0.g *= it; with a normal
 *  extra[i][2]: that normal) to a primitive's
 *  attribute accessors (shared with LOD0: its indices never reach them) */
function appendVertices(prim, extra) {
  if (!extra.length) return;
  for (const [name, ai] of Object.entries(prim.attributes)) {
    const acc = json.accessors[ai];
    const T = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array }[acc.componentType];
    const one = acc.componentType === 5126 ? 1 : acc.componentType === 5123 ? 65535 : 255;   // (normalized integers)
    const k = SIZE[acc.type], old = readAcc(ai), out = new T((acc.count + extra.length) * k);
    out.set(old);
    extra.forEach(([v, ao, nrm, abs, wb], j) => {
      const o = (acc.count + j) * k;
      for (let q = 0; q < k; q++) out[o + q] = old[v * k + q];
      if (ao != null && name === "TEXCOORD_1") { out[o] = AO_PARK[0] * one; out[o + 1] = AO_PARK[1] * one; }
      if (ao != null && name === "COLOR_0") out[o + 1] = Math.max(0.15, Math.min(1, (abs ? 1 : old[v * k + 1] / one) * ao)) * one;
      if (nrm && name === "NORMAL") { out[o] = nrm[0]; out[o + 1] = nrm[1]; out[o + 2] = nrm[2]; }
      if (wb != null && name === "COLOR_0") out[o + 2] = Math.max(old[v * k + 2] / one, wb) * one;
    });
    viewData[acc.bufferView] = new Uint8Array(out.buffer);
    json.bufferViews[acc.bufferView].byteLength = out.byteLength;
    acc.byteOffset = 0;
    acc.count += extra.length;
  }
}
const lodReport = {};
// (polish 2b) LOD1's AO BAKED ON LOD1 ITSELF: the simplification uncovers faces that LOD0's lightmap has dark (a pilaster's
// plate behind its 3.5 cm quoin courses, reveals behind frames): sampled through LOD0's UVs they read as dark strips, and
// inside the 92-128 m hand-over band the dither between a light LOD0 and a dark LOD1 speckled. So LOD1 goes in two steps:
//   1. this script writes LOD1's triangle corners (Blender frame) to <dir>/townhall_lod1_bake.bin;
//   2. Blender bakes AO per corner on that soup + the ground: tools/blender/townhall_lod1_ao.py -> townhall_lod1_ao.bin;
//   3. this script again: every LOD1 corner becomes a vertex (shared when equal) with its lightmap UV parked (AO 1.0) and
//      the baked AO in COLOR_0.g. Without a matching townhall_lod1_ao.bin LOD1 keeps the island-aware lightmap UVs.
const BAKE_IN = path.join(path.dirname(dst), "townhall_lod1_bake.bin"), BAKE_OUT = path.join(path.dirname(dst), "townhall_lod1_ao.bin");
function bakeCorners(lodPrims) {
  // corners in order over the primitives; Blender frame = glTF (x, -z, y)
  const pos = [];
  for (const { P, corners } of lodPrims) for (const [v] of corners) pos.push(P[v * 3], -P[v * 3 + 2], P[v * 3 + 1]);
  const N = pos.length / 3, sum = pos.reduce((a, x) => a + Math.abs(x), 0);
  const head = Buffer.alloc(8); head.writeUInt32LE(N, 0); head.writeFloatLE(sum % 100000, 4);
  fs.writeFileSync(BAKE_IN, Buffer.concat([head, Buffer.from(new Float32Array(pos).buffer)]));
  if (!fs.existsSync(BAKE_OUT)) return null;
  const b = fs.readFileSync(BAKE_OUT);
  if (b.readUInt32LE(0) !== N || Math.abs(b.readFloatLE(4) - (sum % 100000)) > 0.5) { console.warn(`  ${path.basename(BAKE_OUT)} is stale: run tools/blender/townhall_lod1_ao.py, then this again`); return null; }
  return new Float32Array(b.buffer.slice(b.byteOffset + 8, b.byteOffset + 8 + N * 4));
}
function addLod(srcName, dstName, totalTarget, err, prune, bake = false) {
  const node = json.nodes.find((n) => n.name === srcName);
  const mesh = json.meshes[node.mesh];
  const tris = mesh.primitives.reduce((s, p) => s + json.accessors[p.indices].count / 3, 0);
  const ratio = Math.min(1, totalTarget / tris);
  const prims = [], pending = [];
  let outTris = 0, addedVerts = 0, crossTris = 0;
  for (const p of mesh.primitives) {
    const P = readAcc(p.attributes.POSITION), Nn = readAcc(p.attributes.NORMAL), I = readAcc(p.indices);
    const UV1 = p.attributes.TEXCOORD_1 != null ? readAcc(p.attributes.TEXCOORD_1) : null;
    const want = Math.min(I.length, Math.max(12, Math.floor((I.length / 3) * ratio)) * 3);
    const [idx, e, extra = [], cross = 0] = ratio < 1 ? simplifyWelded(P, Nn, Uint32Array.from(I), want, err, prune, UV1) : [Uint32Array.from(I), 0];
    if (bake) {          // resolved later (bakeCorners): every corner's source vertex and normal override
      const n = P.length / 3;
      pending.push({ p, P, idx, corners: Array.from(idx, (r) => (r < n ? [r, null] : [extra[r - n][0], extra[r - n][2]])) });
      crossTris += cross;
      outTris += idx.length / 3;
      continue;
    }
    appendVertices(p, extra);
    addedVerts += extra.length; crossTris += cross;
    outTris += idx.length / 3;
    viewData.push(new Uint8Array(idx.buffer)); viewInfo.push({ tri: true });
    json.bufferViews.push({ buffer: 0, byteLength: idx.byteLength });
    json.accessors.push({ bufferView: json.bufferViews.length - 1, componentType: 5125, count: idx.length, type: "SCALAR" });
    prims.push({ ...p, indices: json.accessors.length - 1 });
  }
  if (bake) {
    const ao = bakeCorners(pending);
    let c = 0;
    for (const { p, P, idx, corners } of pending) {
      const n = P.length / 3, extra = [], seen = new Map();
      for (let i = 0; i < idx.length; i++, c++) {
        const [v, nrm] = corners[i];
        if (!ao) { if (nrm) { idx[i] = n + extra.length; extra.push([v, null, nrm]); } else idx[i] = v; continue; }
        const a = Math.round(ao[c] * 64) / 64;
        // the region width (COLOR_0.b, the viewer's anti-sparkle): a merged LOD1 triangle is at least as wide as its own
        // height (2 x area / longest edge), whatever small part its corner vertex came from
        const t0 = i - (i % 3), q = [0, 1, 2].map((m) => corners[t0 + m][0]);
        const E = (x, y) => Math.hypot(P[q[x] * 3] - P[q[y] * 3], P[q[x] * 3 + 1] - P[q[y] * 3 + 1], P[q[x] * 3 + 2] - P[q[y] * 3 + 2]);
        const ux = P[q[1] * 3] - P[q[0] * 3], uy = P[q[1] * 3 + 1] - P[q[0] * 3 + 1], uz = P[q[1] * 3 + 2] - P[q[0] * 3 + 2];
        const vx = P[q[2] * 3] - P[q[0] * 3], vy = P[q[2] * 3 + 1] - P[q[0] * 3 + 1], vz = P[q[2] * 3 + 2] - P[q[0] * 3 + 2];
        const area2 = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        const h = area2 / Math.max(1e-6, E(0, 1), E(1, 2), E(2, 0));
        const wb = Math.round(Math.min(1, Math.sqrt(h / 4)) * 64) / 64;
        const key = `${v}|${a}|${wb}|${nrm ? nrm.map((x) => x.toFixed(2)).join(",") : ""}`;
        let j = seen.get(key);
        if (j === undefined) { j = n + extra.length; extra.push([v, a, nrm, true, wb]); seen.set(key, j); }
        idx[i] = j;
      }
      appendVertices(p, extra);
      addedVerts += extra.length;
      viewData.push(new Uint8Array(idx.buffer)); viewInfo.push({ tri: true });
      json.bufferViews.push({ buffer: 0, byteLength: idx.byteLength });
      json.accessors.push({ bufferView: json.bufferViews.length - 1, componentType: 5125, count: idx.length, type: "SCALAR" });
      prims.push({ ...p, indices: json.accessors.length - 1 });
    }
    if (ao) crossTris = -1;
  }
  json.meshes.push({ name: dstName, primitives: prims });
  json.nodes.push({ name: dstName, mesh: json.meshes.length - 1, translation: node.translation, rotation: node.rotation, scale: node.scale });
  json.scenes[json.scene || 0].nodes.push(json.nodes.length - 1);
  lodReport[dstName] = { from: srcName, sourceTris: tris, tris: outTris, crossIslandTris: crossTris < 0 ? null : crossTris, aoBakedOnLevel: crossTris < 0, addedVertices: addedVerts };
  console.log(`${dstName}: ${tris} -> ${outTris} triangles (${crossTris < 0 ? "AO baked on this level (Blender)" : `${crossTris} across lightmap islands`}: ${addedVerts} vertices added)`);
}
addLod("TownHall", "TownHall_lod1", LOD1_TRIS, LOD1_ERR, false, true);
addLod("TownHall_far", "TownHall_lod2", LOD2_TRIS, LOD2_ERR, true);

function convertAttributes() {
for (const mesh of json.meshes) for (const prim of mesh.primitives) {
    for (const [name, ai] of Object.entries(prim.attributes)) {
      const acc = json.accessors[ai];
      viewInfo[acc.bufferView].attr = true;
      if (done.has(ai)) continue;
      done.add(ai);
      if (name === "COLOR_0" && (acc.componentType === 5126 || acc.componentType === 5123)) {     // (Blender 5 writes it as uint16 normalized)
        const n = SIZE[acc.type], f = acc.componentType === 5126 ? floatsOf(acc) : Float32Array.from(readAcc(ai), (x) => x / 65535), out = new Uint8Array(acc.count * 4);
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
