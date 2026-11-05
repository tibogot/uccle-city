// PACK THE FAÇADE KIT for the browser: models/facadekit/src/kit_raw.{json,bin} (tools/blender/facadeKit.py) ->
// models/facadekit/kit.json + kit.bin.
//   node tools/facadekit/packKit.mjs [src dir] [out dir]
// Per piece and per NAMED slot: the Blender triangles welded into an indexed mesh, and its levels of detail made HERE
// with meshoptimizer (never Blender's decimate; nothing is simplified in the browser): LOD0 = the model, LOD1 = LOD0
// simplified on a position-welded index (shares LOD0's vertices; each corner gets back the original vertex at that
// position whose normal best fits the new triangle: the method of tools/townhall_pack.mjs, branch claude/townhall).
// Vertices: planar blocks per (piece, slot) at vOff: position f32x3 | normal f32x3 | uv f32x2 (m) | kit unorm8x4 =
// (slice x, slice y, AO, uv flags), 36 bytes a vertex; indices u16 (u32 past 65535 vertices) per LOD.
//   slice x / y: -1 rigid with the left jamb / sill, 0 the middle (scales), +1 rigid with the right jamb / head
//   (stored (c + 1) / 2); uv flags: bit 0 = u comes from x, bit 1 = v comes from y (the shader moves the uv with a
//   stretched vertex, so 1 m stays 1 m on a 6 m cornice run); AO = Cycles-baked per-vertex AO (lighting only).
import fs from "fs";
import path from "path";
import { MeshoptSimplifier } from "../worker/node_modules/meshoptimizer/meshopt_simplifier.js";

const SRC = process.argv[2] || "models/facadekit/src", OUT = process.argv[3] || "models/facadekit";
const raw = JSON.parse(fs.readFileSync(path.join(SRC, "kit_raw.json")));
const bin = fs.readFileSync(path.join(SRC, "kit_raw.bin"));
const f32 = (off, n) => new Float32Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * 4));
const SL = raw.slice;
// LOD1: target share of LOD0's triangles and the absolute error cap (m): seen from 35 m and more, 6 mm is < 0.2 px
const LOD = [{ ratio: 1 }, { ratio: 0.22, error: 0.006 }];
await MeshoptSimplifier.ready;

/** the 9-slice class of a vertex for a piece (kind / ref / slice) */
function sliceOf(meta, x, y) {
  const mode = meta.slice || meta.kind;
  if (mode === "window" || mode === "door") {
    const [W, H] = raw.ref[mode];
    const cx = x < -(W / 2 - SL.x) ? -1 : x > W / 2 - SL.x ? 1 : 0;
    const cy = y < SL.bottom ? -1 : y > H - SL.top ? 1 : 0;
    return [cx, cy];
  }
  if (mode === "run") return [0, -1];          // x scales (the run's length), y rigid
  return [-1, -1];                             // rigid (corner, bracket, soupirail)
}

function simplifyWelded(P, Nn, I, want, err) {
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const C = new Float32Array(cpos), ci = new Uint32Array(I.length);
  for (let k = 0; k < I.length; k++) ci[k] = canon[I[k]];
  const [out, e] = MeshoptSimplifier.simplify(ci, C, 3, want, err, ["ErrorAbsolute"]);
  const res = new Uint32Array(out.length);
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    for (let q = 0; q < 3; q++) {
      const w = out[t + q];
      let best = members[w][0], bd = -2;
      for (const i of members[w]) { const d = Nn[i * 3] * nx + Nn[i * 3 + 1] * ny + Nn[i * 3 + 2] * nz; if (d > bd) { bd = d; best = i; } }
      res[t + q] = best;
    }
  }
  return [res, e];
}

const json = { version: 1, slots: raw.slots, ref: raw.ref, slice: SL, frame: raw.frame, lods: LOD.length, layout: "planar p3f n3f uv2f k4u8n", pieces: {} };
const chunks = [];
let off = 0;
const push = (buf) => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const o = off; chunks.push(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)); off += buf.byteLength; return o; };
const table = [];
for (const [name, e] of Object.entries(raw.pieces)) {
  const out = { kind: e.kind, ref: e.ref, occ: e.occ, rise: e.rise ?? 0, slice: e.slice ?? null, slots: {}, tris: Array(LOD.length).fill(0), bounds: null };
  let bmin = [1e9, 1e9, 1e9], bmax = [-1e9, -1e9, -1e9];
  for (const [slot, sl] of Object.entries(e.slots)) {
    const n = sl.corners;
    const p = f32(sl.offset, 3 * n), nr = f32(sl.offset + 12 * n, 3 * n), uv = f32(sl.offset + 24 * n, 2 * n), ao = f32(sl.offset + 32 * n, n);
    // weld identical corners
    const key = new Map(), I = new Uint32Array(n), P = [], N = [], U = [], K = [];
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], u = uv[i * 2], v = uv[i * 2 + 1];
      const [cx, cy] = sliceOf(e, x, y);
      const flags = (Math.abs(u - x) < 1e-5 ? 1 : 0) | (Math.abs(v - y) < 1e-5 ? 2 : 0);
      const k = [x, y, z, nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2], u, v].map((q) => Math.round(q * 1e4)).join(",") + "," + Math.round(ao[i] * 200) + "," + flags;
      let id = key.get(k);
      if (id === undefined) {
        id = P.length / 3; key.set(k, id);
        P.push(x, y, z); N.push(nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2]); U.push(u, v); K.push(cx, cy, ao[i], flags);
        bmin = bmin.map((m, j) => Math.min(m, p[i * 3 + j])); bmax = bmax.map((m, j) => Math.max(m, p[i * 3 + j]));
      }
      I[i] = id;
    }
    const nv = P.length / 3;
    const Pf = new Float32Array(P), Nf = new Float32Array(N);
    for (let i = 0; i < nv; i++) { const L = Math.hypot(Nf[i * 3], Nf[i * 3 + 1], Nf[i * 3 + 2]) || 1; Nf[i * 3] /= L; Nf[i * 3 + 1] /= L; Nf[i * 3 + 2] /= L; }
    // planar blocks (views straight over the fetched buffer): position f32x3 | normal f32x3 | uv f32x2 | kit unorm8x4
    const Kb = new Uint8Array(nv * 4);
    for (let i = 0; i < nv; i++) {
      Kb[i * 4] = Math.round((K[i * 4] + 1) * 127.5); Kb[i * 4 + 1] = Math.round((K[i * 4 + 1] + 1) * 127.5);
      Kb[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, K[i * 4 + 2])) * 255); Kb[i * 4 + 3] = K[i * 4 + 3] * 85;
    }
    const vOff = push(Pf); push(Nf); push(new Float32Array(U)); push(Kb);
    const lods = [];
    for (let L = 0; L < LOD.length; L++) {
      let idx = I;
      if (LOD[L].ratio < 1) {
        const want = Math.max(3, Math.floor((I.length / 3) * LOD[L].ratio) * 3);
        [idx] = simplifyWelded(Pf, Nf, I, want, LOD[L].error);
        if (!idx.length) idx = new Uint32Array(0);
      }
      const ib = nv < 65536 ? Uint16Array.from(idx) : Uint32Array.from(idx);
      const iOff = push(ib);
      lods.push({ iOff, iCount: ib.length, i32: ib instanceof Uint32Array });
      out.tris[L] += ib.length / 3;
    }
    out.slots[slot] = { vOff, vCount: nv, lods };
  }
  out.bounds = [bmin, bmax];
  json.pieces[name] = out;
  table.push(`${name.padEnd(11)} ${out.tris.map((t) => String(t).padStart(6)).join(" / ")} triangles   slots: ${Object.keys(out.slots).join(", ")}`);
}
fs.mkdirSync(OUT, { recursive: true });
const all = Buffer.concat(chunks);
fs.writeFileSync(path.join(OUT, "kit.bin"), all);
json.bytes = all.length;
fs.writeFileSync(path.join(OUT, "kit.json"), JSON.stringify(json, null, 1));
console.log(table.join("\n"));
console.log(`kit.bin ${(all.length / 1024).toFixed(0)} KB`);
