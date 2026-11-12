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
// (round 3) every piece has a scripted far variant (facadeKit.py FAR): LOD1 = that variant, simplified gently (an error cap of
// 3 mm, LockBorder): the old 15 mm on LOD0 itself shrank closed parts and opened slits (the checker's leaks)
const LOD = [{ ratio: 1 }, { ratio: 0.3, error: 0.003 }];
// solid mouldings with no parts to come apart (modillions, the runs, hoods, sills) take a larger cap (the railings did not stay clean at 6 mm: 3 mm);
// the checker (tools/facadekit/auditKit.mjs) stays at 0 with these
const LOD_ERR = { modillion: 0.01, cornice: 0.008, band: 0.008, plinth: 0.008, step: 0.008, hood: 0.008, sill: 0.008 };
// small hardware slots are not worth a draw call from 40 m on (letter plates, knobs, zinc flashings over hoods and
// doors): LOD1 leaves them out (the LOD band dithers them away); the cornice keeps its zinc (a long visible strip)
const dropAtLod1 = (piece, slot) => slot === "painted_metal_white" || (slot === "zinc_roof" && piece !== "cornice");
await MeshoptSimplifier.ready;

/** the 9-slice class of a vertex for a piece (kind / ref / slice) */
function sliceOf(meta, x, y) {
  const mode = meta.slice || meta.kind;
  if (mode === "window" || mode === "door" || mode === "french" || mode === "garage") {
    const [W, H] = raw.ref[mode];
    const cx = x < -(W / 2 - SL.x) ? -1 : x > W / 2 - SL.x ? 1 : 0;
    const cy = y < SL.bottom ? -1 : y > H - SL.top ? 1 : 0;
    return [cx, cy];
  }
  if (mode === "frenchX") {                    // balconies: stretch along x with the French window, rigid in y
    const [W] = raw.ref.french;
    return [x < -(W / 2 - SL.x) ? -1 : x > W / 2 - SL.x ? 1 : 0, -1];
  }
  if (mode === "run") return [x < -0.49 ? -1 : x > 0.49 ? 1 : 0, -1];   // x scales (the run's length), y rigid; the END rings
                                               // (cx = -1 / +1) take the instance's mitres (kitMaterials.js sliceDelta)
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
  // LockBorder: open edges (a pane's rim, a reveal's front edge, a leaf against its frame) stay where they are, so the
  // simplification never opens a slit between two parts that met in LOD0 (the checker's leak test, round 3)
  const [out, e] = MeshoptSimplifier.simplify(ci, C, 3, want, err, ["ErrorAbsolute", "LockBorder"]);
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

// ------------------------------------------------------------------------------------------------ normals + region width
// (round 3) THE NORMALS ARE MADE HERE, per LOD, from the triangles themselves (Blender's auto-smooth and the old LOD1
// "best original normal" gave the checker's streaks: corner normals 33 deg apart on long thin triangles, smooth normals
// bled onto flat stone; tools/mesh_audit):
//   - a corner's normal = the area x corner-angle weighted mean of the faces round that POSITION (any slot) within
//     SMOOTH_DEG of its own face, then clamped to CLAMP_DEG off its face (two corners of a triangle never differ by more
//     than 2 x CLAMP_DEG: no streak);
//   - a face in a flat region (coplanar edge-neighbours, >= FLAT_AREA m2) keeps its flat normal exactly (no bentflat);
// and THE REGION WIDTH of every face (the town hall's anti-sparkle, models/townhall/NOTES.md polish 2b): faces joined
// through edges turning < REGION_DEG make a region; its width = the middle of its three principal extents (a glazing
// bar 22 mm, a bevel strip's whole bar, a pane its short side). The shader thins a part out once a pixel is wider.
const SMOOTH_DEG = 32, CLAMP_DEG = 14.5, FLAT_AREA = 0.04, REGION_DEG = 50;
function shade(P, idx) {
  const nt = idx.length / 3;
  const key = (i) => `${Math.round(P[i * 3] * 2000)},${Math.round(P[i * 3 + 1] * 2000)},${Math.round(P[i * 3 + 2] * 2000)}`;
  const canonMap = new Map(), canon = new Int32Array(P.length / 3).fill(-1);
  const C = (i) => { if (canon[i] < 0) { const k = key(i); let c = canonMap.get(k); if (c === undefined) { c = canonMap.size; canonMap.set(k, c); } canon[i] = c; } return canon[i]; };
  const fn = new Float64Array(nt * 3), area = new Float64Array(nt), ang = new Float64Array(nt * 3);
  const v = (i, q) => P[i * 3 + q];
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    const e1 = [v(b, 0) - v(a, 0), v(b, 1) - v(a, 1), v(b, 2) - v(a, 2)], e2 = [v(c, 0) - v(a, 0), v(c, 1) - v(a, 1), v(c, 2) - v(a, 2)];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const L = Math.hypot(...n) || 1e-12;
    fn[t * 3] = n[0] / L; fn[t * 3 + 1] = n[1] / L; fn[t * 3 + 2] = n[2] / L; area[t] = L / 2;
    const pts = [a, b, c];
    for (let q = 0; q < 3; q++) {
      const o = pts[q], p1 = pts[(q + 1) % 3], p2 = pts[(q + 2) % 3];
      const u = [v(p1, 0) - v(o, 0), v(p1, 1) - v(o, 1), v(p1, 2) - v(o, 2)], w = [v(p2, 0) - v(o, 0), v(p2, 1) - v(o, 1), v(p2, 2) - v(o, 2)];
      const d = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / ((Math.hypot(...u) * Math.hypot(...w)) || 1);
      ang[t * 3 + q] = Math.acos(Math.max(-1, Math.min(1, d)));
    }
  }
  const dotT = (t, u) => fn[t * 3] * fn[u * 3] + fn[t * 3 + 1] * fn[u * 3 + 1] + fn[t * 3 + 2] * fn[u * 3 + 2];
  // faces round each position; edges -> faces
  const around = new Map(), edges = new Map();
  for (let t = 0; t < nt; t++) for (let q = 0; q < 3; q++) {
    const c = C(idx[t * 3 + q]);
    if (!around.has(c)) around.set(c, []);
    around.get(c).push(t * 3 + q);
    const c2 = C(idx[t * 3 + ((q + 1) % 3)]);
    const ek = c < c2 ? `${c},${c2}` : `${c2},${c}`;
    if (!edges.has(ek)) edges.set(ek, []);
    edges.get(ek).push(t);
  }
  const nbr = Array.from({ length: nt }, () => []);
  for (const l of edges.values()) for (const t of l) for (const u of l) if (t !== u) nbr[t].push(u);
  const region = (cosLim) => {
    const id = new Int32Array(nt).fill(-1), list = [];
    for (let s0 = 0; s0 < nt; s0++) {
      if (id[s0] >= 0) continue;
      const r = list.length, st = [s0], mem = []; id[s0] = r;
      while (st.length) { const t = st.pop(); mem.push(t); for (const u of nbr[t]) if (id[u] < 0 && dotT(t, u) > cosLim) { id[u] = r; st.push(u); } }
      list.push(mem);
    }
    return { id, list };
  };
  const flat = region(Math.cos((1 * Math.PI) / 180));
  const flatArea = flat.list.map((m) => m.reduce((s, t) => s + area[t], 0));
  const smooth = region(Math.cos((REGION_DEG * Math.PI) / 180));
  const width = smooth.list.map((mem) => {
    const pts = [];
    for (const t of mem) for (let q = 0; q < 3; q++) { const i = idx[t * 3 + q]; pts.push([v(i, 0), v(i, 1), v(i, 2)]); }
    const m = [0, 0, 0]; for (const p of pts) for (let q = 0; q < 3; q++) m[q] += p[q] / pts.length;
    const cv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cv[a][b] += (p[a] - m[a]) * (p[b] - m[b]);
    const axes = jacobiAxes(cv);
    const ext = axes.map((ax) => { let lo = 1e9, hi = -1e9; for (const p of pts) { const d = (p[0] - m[0]) * ax[0] + (p[1] - m[1]) * ax[1] + (p[2] - m[2]) * ax[2]; lo = Math.min(lo, d); hi = Math.max(hi, d); } return hi - lo; }).sort((a, b) => b - a);
    return Math.max(0.002, ext[1]);
  });
  const cosS = Math.cos((SMOOTH_DEG * Math.PI) / 180), clampR = (CLAMP_DEG * Math.PI) / 180;
  const N = new Float32Array(nt * 9), Wd = new Float32Array(nt);
  for (let t = 0; t < nt; t++) {
    Wd[t] = width[smooth.id[t]];
    const f = [fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]];
    const isFlat = flatArea[flat.id[t]] >= FLAT_AREA;
    for (let q = 0; q < 3; q++) {
      let n = f;
      if (!isFlat) {
        const acc = [0, 0, 0];
        for (const cq of around.get(C(idx[t * 3 + q]))) {
          const u = Math.floor(cq / 3);
          if (dotT(t, u) < cosS) continue;
          const w = area[u] * ang[cq];
          acc[0] += fn[u * 3] * w; acc[1] += fn[u * 3 + 1] * w; acc[2] += fn[u * 3 + 2] * w;
        }
        const L = Math.hypot(...acc);
        if (L > 1e-12) {
          n = acc.map((x) => x / L);
          const d = n[0] * f[0] + n[1] * f[1] + n[2] * f[2], a = Math.acos(Math.max(-1, Math.min(1, d)));
          if (a > clampR) {          // slerp from the face normal toward n, by clampR
            const k = Math.sin(clampR) / Math.sin(a), k0 = Math.sin(a - clampR) / Math.sin(a);
            n = [f[0] * k0 + n[0] * k, f[1] * k0 + n[1] * k, f[2] * k0 + n[2] * k];
            const L2 = Math.hypot(...n); n = n.map((x) => x / L2);
          }
        }
      }
      N[t * 9 + q * 3] = n[0]; N[t * 9 + q * 3 + 1] = n[1]; N[t * 9 + q * 3 + 2] = n[2];
    }
  }
  return { N, W: Wd };
}
/** the eigenvectors of a symmetric 3x3 (Jacobi rotations) */
function jacobiAxes(A) {
  const a = A.map((r) => r.slice()), V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 30; it++) {
    let p = 0, q = 1;
    if (Math.abs(a[0][2]) > Math.abs(a[p][q])) { p = 0; q = 2; }
    if (Math.abs(a[1][2]) > Math.abs(a[p][q])) { p = 1; q = 2; }
    if (Math.abs(a[p][q]) < 1e-14) break;
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]), c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < 3; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = c * x - s * y; a[k][q] = s * x + c * y; }
    for (let k = 0; k < 3; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = c * x - s * y; a[q][k] = s * x + c * y; }
    for (let k = 0; k < 3; k++) { const x = V[k][p], y = V[k][q]; V[k][p] = c * x - s * y; V[k][q] = s * x + c * y; }
  }
  return [0, 1, 2].map((j) => [V[0][j], V[1][j], V[2][j]]);
}

const json = { version: 3, slots: raw.slots, ref: raw.ref, slice: SL, frame: raw.frame, lods: LOD.length,
  layout: "per piece x LOD x kind (opaque | glass): planar p3f n3f uv2f k4u8n w4u8n, k.w = uv flags + 4 x slot index, w = (sqrt(region width / 4 m), run end flag, 0, 0)", pieces: {} };
const chunks = [];
let off = 0;
const push = (buf) => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const o = off; chunks.push(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)); off += buf.byteLength; return o; };
const table = [];

/** one slot of a raw piece, welded: { P, N, U, K (cx, cy, ao, flags), I } */
function welded(e, slot) {
  const sl = e.slots[slot], n = sl.corners;
  const p = f32(sl.offset, 3 * n), nr = f32(sl.offset + 12 * n, 3 * n), uv = f32(sl.offset + 24 * n, 2 * n), ao = f32(sl.offset + 32 * n, n);
  const key = new Map(), I = new Uint32Array(n), P = [], N = [], U = [], K = [];
  for (let i = 0; i < n; i++) {
    const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], u = uv[i * 2], v = uv[i * 2 + 1];
    const [cx, cy] = sliceOf(e, x, y);
    const flags = (Math.abs(u - x) < 1e-5 ? 1 : 0) | (Math.abs(v - y) < 1e-5 ? 2 : 0);
    const k = [x, y, z, nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2], u, v].map((q) => Math.round(q * 1e4)).join(",") + "," + Math.round(ao[i] * 200) + "," + flags;
    let id = key.get(k);
    if (id === undefined) {
      id = P.length / 3; key.set(k, id);
      const L = Math.hypot(nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2]) || 1;
      P.push(x, y, z); N.push(nr[i * 3] / L, nr[i * 3 + 1] / L, nr[i * 3 + 2] / L); U.push(u, v); K.push(cx, cy, ao[i], flags);
    }
    I[i] = id;
  }
  return { P: new Float32Array(P), N: new Float32Array(N), U, K, I };
}

for (const [name, e] of Object.entries(raw.pieces)) {
  if (/far$/.test(name)) continue;                                   // a far variant: the LOD1 source of its base piece
  const far = raw.pieces[name + "far"];
  const out = { kind: e.kind, ref: e.ref, occ: e.occ, rise: e.rise ?? 0, slice: e.slice ?? null, slots: Object.keys(e.slots), lods: [], tris: [], bounds: null };
  let bmin = [1e9, 1e9, 1e9], bmax = [-1e9, -1e9, -1e9];
  for (let L = 0; L < LOD.length; L++) {
    const src = L > 0 && far ? far : e;
    const kinds = { opaque: { P: [], N: [], U: [], K: [], W: [], I: [] }, glass: { P: [], N: [], U: [], K: [], W: [], I: [] } };
    const isRun = (e.slice || e.kind) === "run";
    for (const slot of Object.keys(src.slots)) {
      if (L > 0 && dropAtLod1(name, slot)) continue;
      const m = welded(src, slot);
      let idx = m.I;
      if (L > 0) {
        // the far variant is already simple: a gentle pass; else the full LOD1 reduction
        const ratio = LOD[L].ratio;
        const want = Math.max(3, Math.floor((m.I.length / 3) * ratio) * 3);
        [idx] = simplifyWelded(m.P, m.N, m.I, want, LOD_ERR[name] ?? LOD[L].error);
      }
      if (!idx.length) continue;
      const si = raw.slots.indexOf(slot);
      // the glass of the windows and doors draws with the painted window's room (its own mesh); the soupirail's dark pane
      // is no painted window: it stays in the opaque mesh (a plain dark glass look there)
      const T = kinds[slot === "glass_window" && e.kind !== "soup" && e.kind !== "dormer" ? "glass" : "opaque"];
      // this LOD's own normals and region widths (shade above); a vertex per (source vertex, normal, width)
      const sh = shade(m.P, idx);
      const remap = new Map();
      for (let c = 0; c < idx.length; c++) {
        const i = idx[c], t = Math.floor(c / 3);
        const nx = sh.N[c * 3], ny = sh.N[c * 3 + 1], nz = sh.N[c * 3 + 2], wc = Math.round(Math.sqrt(Math.min(4, sh.W[t]) / 4) * 255);
        const k = `${i},${Math.round(nx * 500)},${Math.round(ny * 500)},${Math.round(nz * 500)},${wc}`;
        let j = remap.get(k);
        if (j === undefined) {
          j = T.P.length / 3; remap.set(k, j);
          T.P.push(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]); T.N.push(nx, ny, nz);
          T.U.push(m.U[i * 2], m.U[i * 2 + 1]);
          T.K.push(m.K[i * 4], m.K[i * 4 + 1], m.K[i * 4 + 2], m.K[i * 4 + 3] + 4 * si);
          // w.z: an ARCHED head (window B): the head ring's vertices carry the rise, the shader bends them onto the true
          // segmental arch of the stretched width (the city cuts that circle; a 9-slice of the reference arch is not one)
          T.W.push(wc, isRun ? 255 : 0, e.rise > 0 && m.K[i * 4 + 1] > 0.5 ? Math.round((e.rise / 0.5) * 255) : 0, 0);
          for (let q = 0; q < 3; q++) { bmin[q] = Math.min(bmin[q], m.P[i * 3 + q]); bmax[q] = Math.max(bmax[q], m.P[i * 3 + q]); }
        }
        T.I.push(j);
      }
    }
    const lod = {};
    let tris = 0;
    for (const [kind, T] of Object.entries(kinds)) {
      const nv = T.P.length / 3;
      if (!nv) continue;
      const Kb = new Uint8Array(nv * 4);
      for (let i = 0; i < nv; i++) {
        Kb[i * 4] = Math.round((T.K[i * 4] + 1) * 127.5); Kb[i * 4 + 1] = Math.round((T.K[i * 4 + 1] + 1) * 127.5);
        Kb[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, T.K[i * 4 + 2])) * 255); Kb[i * 4 + 3] = T.K[i * 4 + 3];
      }
      const vOff = push(new Float32Array(T.P)); push(new Float32Array(T.N)); push(new Float32Array(T.U)); push(Kb); push(Uint8Array.from(T.W));
      const ib = nv < 65536 ? Uint16Array.from(T.I) : Uint32Array.from(T.I);
      const iOff = push(ib);
      lod[kind] = { vOff, vCount: nv, iOff, iCount: ib.length, i32: ib instanceof Uint32Array };
      tris += ib.length / 3;
    }
    out.lods.push(lod);
    out.tris.push(tris);
  }
  out.bounds = [bmin, bmax];
  json.pieces[name] = out;
  table.push(`${name.padEnd(11)} ${out.tris.map((t) => String(t).padStart(6)).join(" / ")} triangles   slots: ${out.slots.join(", ")}${far ? "   (LOD1 from " + name + "far)" : ""}`);
}
fs.mkdirSync(OUT, { recursive: true });
const all = Buffer.concat(chunks);
fs.writeFileSync(path.join(OUT, "kit.bin"), all);
json.bytes = all.length;
fs.writeFileSync(path.join(OUT, "kit.json"), JSON.stringify(json, null, 1));
console.log(table.join("\n"));
console.log(`kit.bin ${(all.length / 1024).toFixed(0)} KB`);
