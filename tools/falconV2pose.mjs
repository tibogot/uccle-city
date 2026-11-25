// tools/falconV2pose.mjs: the falcon v2's POSE checks on the shipped glb (gate row `falcongym`, rule falcon-gym "the v2
// model" / "the v2 base"): the meshopt glb decoded, its skin evaluated in Node (linear blend skinning, clips sampled in
// time, every primitive), no three.js. Base B (tools/blender/falconV2b.py, Hector Bonada's model on our rig names):
//   - it stands like a perched peregrine: upright, the hips low, the TOE PADS on the ground (not a claw tip), the toes
//     spread; the folded wings' tips by the tail; the tail closed
//   - it walks and hops crouched, a foot's pads on the ground through the cycle
//   - the toes closed (a grip) only in flight; spread on the ground and in Talons
//   - the tail closed when folded, fanned in the glide and the flare
//   - NO HOLES: the silhouette from six directions has no see-through hole (ground and folded clips)
//   - the far LOD (v2FarChecks), the juvenile plumage (KTX2 beside the glb, one per painted material)
//   import { v2PoseChecks, v2FarChecks } from "./falconV2pose.mjs";  node tools/falconV2pose.mjs [glb] [far.glb] [--measure]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decodeKTX2 } from "./ktx2Decode.mjs";
import { GYM, V2_WALK_MPS } from "../viewer/falconGym/gymFlight.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(here, "worker/package.json"));
const { MeshoptDecoder } = await import(pathToFileURL(req.resolve("meshoptimizer/decoder")).href);
await MeshoptDecoder.ready;

// ------------------------------------------------------------------------------------------------ the glb
function readGlb(file) {
  const b = fs.readFileSync(file), jl = b.readUInt32LE(12), J = JSON.parse(b.subarray(20, 20 + jl).toString());
  const off = 20 + jl + 8, BIN = b.subarray(off, off + b.readUInt32LE(20 + jl));
  const views = J.bufferViews.map((v) => {
    const e = v.extensions?.EXT_meshopt_compression;
    if (e) {
      const out = new Uint8Array(e.count * e.byteStride);
      MeshoptDecoder.decodeGltfBuffer(out, e.count, e.byteStride, new Uint8Array(BIN.subarray(e.byteOffset || 0, (e.byteOffset || 0) + e.byteLength)), e.mode, e.filter || "NONE");
      return { data: out, stride: v.byteStride || 0 };
    }
    return { data: new Uint8Array(BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)), stride: v.byteStride || 0 };
  });
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const acc = (i) => {
    const a = J.accessors[i], v = views[a.bufferView], n = NC[a.type];
    const T = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType];
    const cs = T.BYTES_PER_ELEMENT, stride = v.stride || cs * n, dv = new DataView(v.data.buffer, v.data.byteOffset, v.data.byteLength);
    const out = new Float64Array(a.count * n), nrm = a.normalized ? { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType] : 1;
    const get = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" }[a.componentType];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[get]((a.byteOffset || 0) + k * stride + c * cs, true) / nrm;
    return out;
  };
  return { J, acc, BIN };
}

// ------------------------------------------------------------------------------------------------ small maths (column-major 4x4)
const mul = (a, b) => { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
function trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q, o = new Float64Array(16);
  o[0] = (1 - 2 * (y * y + z * z)) * s[0]; o[1] = 2 * (x * y + z * w) * s[0]; o[2] = 2 * (x * z - y * w) * s[0];
  o[4] = 2 * (x * y - z * w) * s[1]; o[5] = (1 - 2 * (x * x + z * z)) * s[1]; o[6] = 2 * (y * z + x * w) * s[1];
  o[8] = 2 * (x * z + y * w) * s[2]; o[9] = 2 * (y * z - x * w) * s[2]; o[10] = (1 - 2 * (x * x + y * y)) * s[2];
  o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1; return o;
}
const xf = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (a) => Math.hypot(a[0], a[1], a[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = len(a) || 1; return a.map((x) => x / l); };

// ------------------------------------------------------------------------------------------------ the skinned bird
/** every primitive of the skinned mesh, concatenated: P, JN, WT, IDX (offset), UV, PRIM (each vertex's primitive) */
export function loadV2(file) {
  const { J, acc, BIN } = readGlb(file);
  const mi = J.nodes.findIndex((n) => n.skin != null && n.mesh != null), mn = J.nodes[mi], skin = J.skins[mn.skin];
  const prims = J.meshes[mn.mesh].primitives;
  const parts = prims.map((p) => ({ P: acc(p.attributes.POSITION), JN: acc(p.attributes.JOINTS_0), WT: acc(p.attributes.WEIGHTS_0), IDX: acc(p.indices), UV: p.attributes.TEXCOORD_0 != null ? acc(p.attributes.TEXCOORD_0) : null, mat: p.material }));
  const NV = parts.reduce((s, p) => s + p.P.length / 3, 0), NI = parts.reduce((s, p) => s + p.IDX.length, 0);
  const P = new Float64Array(NV * 3), JN = new Float64Array(NV * 4), WT = new Float64Array(NV * 4), UV = new Float64Array(NV * 2), IDX = new Uint32Array(NI), PRIM = new Uint8Array(NV);
  let vo = 0, io = 0;
  parts.forEach((p, k) => {
    const n = p.P.length / 3; P.set(p.P, vo * 3); JN.set(p.JN, vo * 4); WT.set(p.WT, vo * 4); if (p.UV) UV.set(p.UV, vo * 2); PRIM.fill(k, vo, vo + n);
    for (let i = 0; i < p.IDX.length; i++) IDX[io + i] = p.IDX[i] + vo;
    vo += n; io += p.IDX.length;
  });
  const IBM = acc(skin.inverseBindMatrices), joints = skin.joints;
  const parent = new Int32Array(J.nodes.length).fill(-1);
  J.nodes.forEach((n, i) => (n.children || []).forEach((c) => { parent[c] = i; }));
  const byName = Object.fromEntries(J.nodes.map((n, i) => [n.name, i]));
  const clips = Object.fromEntries((J.animations || []).map((a) => [a.name, a]));
  const dur = (c) => Math.max(0, ...clips[c].samplers.map((sm) => J.accessors[sm.input].max?.[0] ?? 0));
  /** the node world matrices with `clip` at time t (s; null: its first key), linear keys (nlerp); clip null: the rest
   *  (a bone without a track in the clip keeps its rest: what three's mixer does too) */
  function world(clip, t = null) {
    const T = J.nodes.map((n) => ({ t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] }));
    if (clip) for (const ch of clips[clip].channels) {
      const sm = clips[clip].samplers[ch.sampler], out = acc(sm.output), p = ch.target.path;
      if (p !== "rotation" && p !== "translation") continue;
      const n = p === "rotation" ? 4 : 3, inp = t == null ? null : acc(sm.input);
      let v = [...out.subarray(0, n)];
      if (inp && inp.length > 1) {
        let k = 0; while (k < inp.length - 2 && inp[k + 1] <= t) k++;
        const u = Math.max(0, Math.min(1, (t - inp[k]) / Math.max(inp[k + 1] - inp[k], 1e-9)));
        const a = out.subarray(k * n, k * n + n), b = out.subarray((k + 1) * n, (k + 1) * n + n);
        const sg = n === 4 && a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1;
        v = [...a].map((x, i) => x + (sg * b[i] - x) * u);
        if (n === 4) { const l = Math.hypot(...v); v = v.map((x) => x / l); }
      }
      if (p === "rotation") T[ch.target.node].r = v; else T[ch.target.node].t = v;
    }
    const W = new Array(J.nodes.length);
    const get = (i) => W[i] ??= parent[i] < 0 ? trs(T[i].t, T[i].r, T[i].s) : mul(get(parent[i]), trs(T[i].t, T[i].r, T[i].s));
    J.nodes.forEach((_, i) => get(i));
    return W;
  }
  /** the posed vertices (Float64Array xyz) and the joints' world positions by name */
  function pose(clip, t = null) {
    const W = world(clip, t), S = joints.map((j, k) => mul(W[j], IBM.subarray(k * 16, k * 16 + 16)));
    const X = new Float64Array(NV * 3);
    for (let v = 0; v < NV; v++) {
      let x = 0, y = 0, z = 0;
      for (let c = 0; c < 4; c++) {
        const w = WT[v * 4 + c]; if (!w) continue;
        const r = xf(S[JN[v * 4 + c]], P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); x += w * r[0]; y += w * r[1]; z += w * r[2];
      }
      X[v * 3] = x; X[v * 3 + 1] = y; X[v * 3 + 2] = z;
    }
    const at = (name) => { const m = W[byName[name]]; return [m[12], m[13], m[14]]; };
    return { X, at };
  }
  const main = new Array(NV), mainW = new Float64Array(NV);
  for (let v = 0; v < NV; v++) { let b = 0; for (let c = 1; c < 4; c++) if (WT[v * 4 + c] > WT[v * 4 + b]) b = c; main[v] = J.nodes[joints[JN[v * 4 + b]]].name; mainW[v] = WT[v * 4 + b]; }
  const matName = parts.map((p) => J.materials?.[p.mat]?.name || "");
  return { J, BIN, NV, IDX, P, UV, PRIM, prims, matName, main, mainW, clips, dur, pose, byName, acc, parent };
}

// ------------------------------------------------------------------------------------------------ measures
const isToe = (n) => /^(Toes_|Toes_tip_|b_[lr]_Digit)/.test(n);
const side = (n) => (/_L$|^b_l_/.test(n) ? "L" : /_R$|^b_r_/.test(n) ? "R" : null);
const isTail = (n) => /^(tail_|b_[lr]_TF|b_Tail|b_TF)/.test(n);
/** per foot: the lowest toe-PAD point (y: the toes' vertices) and the lowest point of the whole foot */
function feet(B, X) {
  const o = { L: { pad: Infinity, all: Infinity }, R: { pad: Infinity, all: Infinity } };
  for (let v = 0; v < B.NV; v++) {
    const m = B.main[v], s = side(m); if (!s) continue; const y = X[v * 3 + 1];
    if (isToe(m)) { o[s].pad = Math.min(o[s].pad, y); o[s].all = Math.min(o[s].all, y); } else if (/^(Foot_|AnkleLeg_)/.test(m)) o[s].all = Math.min(o[s].all, y);
  }
  return o;
}
/** per foot: the toes' spread, the widest distance between two toe-tip joints (the last joints of the digit chains) */
function toeSpread(B, p) {
  const ends = { L: [], R: [] };
  for (const [n, i] of Object.entries(B.byName)) {
    if (!isToe(n) || /nub/.test(n)) continue;
    const kids = (B.J.nodes[i].children || []).map((c) => B.J.nodes[c].name).filter((c) => isToe(c) && !/nub/.test(c));
    if (!kids.length) { const s = side(n); if (s) ends[s].push(p.at(n)); }
  }
  const sp = (a) => { let m = 0; for (const x of a) for (const y of a) m = Math.max(m, len(sub(x, y))); return m; };
  return { L: sp(ends.L), R: sp(ends.R) };
}
/** the tail's width (m) across its outer 40 % (along tail_1 -> tail_tip): the lateral (x) extent of its vertices */
export function tailTipWidth(B, p) {
  const a = p.at("tail_1"), u = unit(sub(p.at("tail_tip"), a)), X = p.X; let smax = 0;
  for (let v = 0; v < B.NV; v++) if (isTail(B.main[v])) smax = Math.max(smax, dot(sub([X[v * 3], X[v * 3 + 1], X[v * 3 + 2]], a), u));
  let mn = Infinity, mx = -Infinity;
  for (let v = 0; v < B.NV; v++) if (isTail(B.main[v]) && dot(sub([X[v * 3], X[v * 3 + 1], X[v * 3 + 2]], a), u) > 0.6 * smax) { mn = Math.min(mn, X[v * 3]); mx = Math.max(mx, X[v * 3]); }
  return mx - mn;
}
/** SEE-THROUGH HOLES: the posed mesh rasterised orthographically (2 mm cells; the cut-out alpha of its textures
 *  honoured) from a direction; the uncovered cells the outside cannot reach (flood fill from the border) are holes
 *  (openings of more than 8 cells, 0.3 cm2: smaller ones are the raster's seams and the cut-out alpha's pinholes). Returns cm2: holes, silhouette */
export function holes(B, X, dir, alpha, cell = 0.002, dump = null, skip = null) {
  const d = unit(dir), up0 = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = unit(cross(up0, d)), e2 = cross(d, e1);
  const NV = B.NV, U = new Float64Array(NV), V = new Float64Array(NV);
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (let i = 0; i < NV; i++) { const p = [X[i * 3], X[i * 3 + 1], X[i * 3 + 2]]; U[i] = dot(p, e1); V[i] = dot(p, e2); u0 = Math.min(u0, U[i]); u1 = Math.max(u1, U[i]); v0 = Math.min(v0, V[i]); v1 = Math.max(v1, V[i]); }
  const W = Math.ceil((u1 - u0) / cell) + 3, H = Math.ceil((v1 - v0) / cell) + 3, cov = new Uint8Array(W * H), legc = new Uint8Array(W * H);
  for (let t = 0; t < B.IDX.length; t += 3) {
    const a = B.IDX[t], b = B.IDX[t + 1], c = B.IDX[t + 2], A = alpha?.[B.PRIM[a]];
    const isLeg = skip ? skip(B.main[a]) : false;
    const xa = (U[a] - u0) / cell + 1, ya = (V[a] - v0) / cell + 1, xb = (U[b] - u0) / cell + 1, yb = (V[b] - v0) / cell + 1, xc = (U[c] - u0) / cell + 1, yc = (V[c] - v0) / cell + 1;
    const den = (yb - yc) * (xa - xc) + (xc - xb) * (ya - yc); if (Math.abs(den) < 1e-12) continue;
    const X0 = Math.max(0, Math.floor(Math.min(xa, xb, xc))), X1 = Math.min(W - 1, Math.ceil(Math.max(xa, xb, xc))), Y0 = Math.max(0, Math.floor(Math.min(ya, yb, yc))), Y1 = Math.min(H - 1, Math.ceil(Math.max(ya, yb, yc)));
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const px = x + 0.5, py = y + 0.5, l0 = ((yb - yc) * (px - xc) + (xc - xb) * (py - yc)) / den, l1 = ((yc - ya) * (px - xc) + (xa - xc) * (py - yc)) / den, l2 = 1 - l0 - l1;
      if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
      if (A) { const uu = l0 * B.UV[a * 2] + l1 * B.UV[b * 2] + l2 * B.UV[c * 2], vv = l0 * B.UV[a * 2 + 1] + l1 * B.UV[b * 2 + 1] + l2 * B.UV[c * 2 + 1]; if (A(uu, vv) < 128) continue; }
      cov[y * W + x] = 1; if (isLeg) legc[y * W + x] = 1;
    }
  }
  // (the cells next to a leg: a gap bordered by a leg or a foot is the leg's, not a hole in the body)
  const nearLeg = new Uint8Array(W * H);
  if (skip) for (let i = 0; i < W * H; i++) if (legc[i]) { const x = i % W, y = (i / W) | 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) nearLeg[yy * W + xx] = 1; } }
  const out = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) { const i = st.pop(); if (out[i] || cov[i]) continue; out[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
  let real = 0, sil = 0; const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (cov[i]) { sil++; continue; }
    if (out[i] || seen[i]) continue;
    let n = 0, leg = false; const q = [i]; seen[i] = 1;
    while (q.length) { const j = q.pop(); n++; if (nearLeg[j]) leg = true; const x = j % W, y = (j / W) | 0; for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) if (k >= 0 && !cov[k] && !out[k] && !seen[k]) { seen[k] = 1; q.push(k); } }
    sil += n; if (n > 8 && !leg) real += n;
  }
  // SLITS: what a closing of the silhouette (dilate then erode, 3 cells = 6 mm) fills: the narrow gaps between parts that
  // open to the outside (a fanned-out folded wing's "fingers"), which the enclosed-hole count cannot see
  const R = 3, dil = new Uint8Array(W * H), clo = new Uint8Array(W * H), tmp = new Uint8Array(W * H);
  const pass = (src, dst, isMax) => {            // separable square max / min filter, radius R
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = isMax ? 0 : 1; for (let k = -R; k <= R; k++) { const xx = x + k; const c = xx < 0 || xx >= W ? 0 : src[y * W + xx]; v = isMax ? v | c : v & c; } tmp[y * W + x] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = isMax ? 0 : 1; for (let k = -R; k <= R; k++) { const yy = y + k; const c = yy < 0 || yy >= H ? 0 : tmp[yy * W + x]; v = isMax ? v | c : v & c; } dst[y * W + x] = v; }
  };
  pass(cov, dil, true); pass(dil, clo, false);
  let slit = 0; for (let i = 0; i < W * H; i++) if (clo[i] && !cov[i] && !nearLeg[i]) slit++;
  if (dump) { const img = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) img[i] = cov[i] ? 90 : out[i] ? 255 : 0; fs.writeFileSync(dump, Buffer.concat([Buffer.from(`P5 ${W} ${H} 255
`), img])); }   // (black: a hole)
  return { hole: real * cell * cell * 1e4, sil: sil * cell * cell * 1e4, slit: slit * cell * cell * 1e4 };
}
/** the cut-out alpha of each primitive's base colour, from the shipped KTX2 (three's Basis transcoder) */
export async function alphaSamplers(B) {
  const J = B.J, out = [];
  for (const p of B.prims) {
    const m = J.materials?.[p.material], ti = m?.pbrMetallicRoughness?.baseColorTexture?.index;
    if (m?.alphaMode !== "MASK" || ti == null) { out.push(null); continue; }
    const src = J.textures[ti].extensions?.KHR_texture_basisu?.source ?? J.textures[ti].source, v = J.bufferViews[J.images[src].bufferView];
    const T = await decodeKTX2(B.BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));
    out.push((u, w) => { const x = Math.min(T.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.width))), y = Math.min(T.height - 1, Math.max(0, Math.floor((w - Math.floor(w)) * T.height))); return T.data[(y * T.width + x) * 4 + 3]; });
  }
  return out;
}
/** THE FOLDED TAIL'S SHAPE AND SET (rule falcon-gym "the v2 round C"): its length (the farthest tail vertex from tail_1),
 *  its width / length, how far the folded wing tips lie from its line and how far its tip reaches past them */
export function tailSet(B, p) {
  const a = p.at("tail_1"), X = p.X; let L = 0, tip = a;
  for (let v = 0; v < B.NV; v++) if (isTail(B.main[v])) { const x = [X[v * 3], X[v * 3 + 1], X[v * 3 + 2]], d = len(sub(x, a)); if (d > L) { L = d; tip = x; } }
  const u = unit(sub(tip, a)), W = tailTipWidth(B, p);
  const wing = ["L", "R"].map((s) => { const w = sub(p.at(`wing_tip_${s}`), a), t = dot(w, u); return { off: len(sub(w, u.map((x) => x * t))), past: L - t }; });
  return { L, W, ratio: W / L, tipOff: Math.max(...wing.map((w) => w.off)), past: Math.min(...wing.map((w) => w.past)), pastMax: Math.max(...wing.map((w) => w.past)) };
}
/** per foot: the front toes' claw tips (digit II and IV's end nubs) apart, m */
function frontClaws(B, p) {
  const o = {};
  for (const s of ["l", "r"]) {
    const tip = (d) => { const n = Object.keys(B.byName).filter((k) => k.startsWith(`b_${s}_Digit${d}_`) && /nub$/.test(k)); return n.length ? p.at(n[0]) : null; };
    const a = tip("II"), b = tip("IV"); o[s.toUpperCase()] = a && b ? len(sub(a, b)) : 0;
  }
  return o;
}
/** THE WALK'S FOOT SLIDE at the gym's walk (rule falcon-gym "the v2 round C"): the Walk played as the gym plays it
 *  (gymBird.js: rate GYM.walk / V2_WALK_MPS, capped 0.4-2.5; the model at the gym's life-size span) while the body moves
 *  forward at GYM.walk; per foot, the ground travel of its joint through each planted phase (the joint within 3 mm of
 *  its lowest: the stance joint rides 1-2 mm up and down), m */
export function walkSlide(B, speed = GYM.walk, planted = V2_WALK_MPS) {
  const g = B.pose("Glide"), k = GYM.span / len(sub(g.at("wing_tip_L"), g.at("wing_tip_R")));
  const rate = Math.min(2.5, Math.max(0.4, speed / planted)), D = B.dur("Walk"), dt = 1 / 480, T = 2 * D / rate;
  const S = []; for (let t = 0; t <= T; t += dt) { const p = B.pose("Walk", (t * rate) % D); S.push({ t, L: p.at("Foot_L"), R: p.at("Foot_R") }); }
  let worst = 0;
  for (const s of ["L", "R"]) {
    const ymin = Math.min(...S.map((q) => q[s][1]));
    let run = null;
    const close = () => { if (run && run.n > 3) worst = Math.max(worst, Math.hypot(run.z1 - run.z0, run.x1 - run.x0)); run = null; };
    for (const q of S) {
      if (q[s][1] - ymin < 0.003) {
        const z = k * q[s][2] + speed * q.t, x = k * q[s][0];          // (the nose is +z: the body moves along it)
        if (!run) run = { z0: z, x0: x, z1: z, x1: x, n: 0 };
        run.z1 = z; run.x1 = x; run.n++;
      } else close();
    }
    close();
  }
  return { slide: worst, rate, speed, planted };
}
export const SLIT_MAX = 0.015;
export const VIEWS = { side: [1, 0.05, 0], back: [0, 0.15, -1], front: [0, 0.1, 1], above: [0.05, 1, -0.1], below: [0.05, -1, 0.1], three: [0.7, 0.4, -0.6] };

export async function v2Measures(file) {
  const B = loadV2(file), M = { clips: Object.keys(B.clips) };
  for (const c of ["Perch", "Walk", "Hop", "Stoop", "Glide", "Talons", "Flare"]) if (!B.clips[c]) { M.missing = c; return { B, M }; }
  const perch = B.pose("Perch");
  const body = sub(perch.at("spine_1"), perch.at("hips")); M.pitch = Math.atan2(body[1], Math.hypot(body[0], body[2])) * 180 / Math.PI;
  M.perchFeet = feet(B, perch.X);
  let lowest = Infinity; for (let v = 0; v < B.NV; v++) lowest = Math.min(lowest, perch.X[v * 3 + 1]); M.perchLowest = lowest;
  M.hip = (perch.at("UpperLeg_L")[1] + perch.at("UpperLeg_R")[1]) / 2;
  let belly = Infinity; for (let v = 0; v < B.NV; v++) if (/^(hips|spine_[01]|b_Spine2)$/.test(B.main[v])) belly = Math.min(belly, perch.X[v * 3 + 1]);
  M.legBelow = belly - Math.min(perch.at("Foot_L")[1], perch.at("Foot_R")[1]);
  M.tips = ["L", "R"].map((s) => { const p = perch.at(`wing_tip_${s}`), a = perch.at("tail_1"), d = sub(perch.at("tail_tip"), a), t = Math.max(0, Math.min(1, dot(sub(p, a), d) / dot(d, d))); return { d: len(sub(p, [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t])), behind: dot(sub(p, perch.at("hips")), body) < 0 }; });
  M.spread = {}; for (const c of ["Perch", "Talons", "Glide", "Stoop"]) M.spread[c] = toeSpread(B, B.pose(c));
  M.tail = {}; for (const c of ["Perch", "Walk", "Hop", "Stoop", "Glide", "Flare"]) M.tail[c] = tailTipWidth(B, B.pose(c));
  M.cycle = {};
  for (const [c, f0, f1] of [["Walk", 0, 1], ["Hop", 0, 0.3]]) {
    const D = B.dur(c); let hip = 0, leg = -Infinity, padMin = Infinity, padMax = -Infinity, allMin = Infinity;
    for (let i = 0; i < 8; i++) {
      const p = B.pose(c, D * (f0 + (f1 - f0) * i / 8)), X = p.X;
      hip = Math.max(hip, (p.at("UpperLeg_L")[1] + p.at("UpperLeg_R")[1]) / 2);
      let bl = Infinity; for (let v = 0; v < B.NV; v++) if (/^(hips|spine_[01]|b_Spine2)$/.test(B.main[v])) bl = Math.min(bl, X[v * 3 + 1]);
      leg = Math.max(leg, bl - Math.min(p.at("Foot_L")[1], p.at("Foot_R")[1]));
      const f = feet(B, X), low = Math.min(f.L.pad, f.R.pad); padMin = Math.min(padMin, low); padMax = Math.max(padMax, low); allMin = Math.min(allMin, f.L.all, f.R.all);
    }
    M.cycle[c] = { hip, leg, padMin, padMax, allMin };
  }
  return { B, M };
}

export async function v2PoseChecks(file) {
  const out = [], ok = (c, what, val) => out.push([!!c, what, val]);
  const { B, M } = await v2Measures(file);
  if (M.missing) { ok(false, "v2 pose checks: the clips Perch / Walk / Hop / Stoop / Glide / Talons / Flare", `missing ${M.missing}`); return out; }
  const cm = (x) => (x * 100).toFixed(1), mm = (x) => (x * 1000).toFixed(1);
  const ours = ["root", "hips", "spine_0", "spine_1", "spine_2", "spine_3", "head", "mouth_upper_tip", "tail_1", "tail_tip", ...["UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes", "Toes_tip", "wing_1", "wing_2", "wing_3", "wing_tip"].flatMap((n) => [`${n}_L`, `${n}_R`])];
  const miss = ours.filter((n) => B.byName[n] == null);
  ok(!miss.length, "v2 rig: our bird rig's bone names (viewer/birdRig.js's layers, the gym)", miss.length ? `missing ${miss.join(" ")}` : `${Object.keys(B.byName).length} nodes`);
  ok(M.pitch >= 35 && M.pitch <= 65, "v2 Perch: body upright 35-65 deg", `${M.pitch.toFixed(0)} deg`);
  // THE FEET ON THE GROUND BY THEIR PADS (rule falcon-gym "the v2 base": the first v2's check took the lowest foot
  // point, a curled claw tip, and passed while the pads floated 1.5-3 cm up)
  const pf = M.perchFeet, padOk = (f) => f.pad > -0.003 && f.pad < 0.005 && f.all > -0.003;
  ok(padOk(pf.L) && padOk(pf.R) && M.perchLowest > -0.005, "v2 Perch: the toe PADS on the ground (lowest pad 0-5 mm, nothing below -3 mm)", `pads L ${mm(pf.L.pad)} R ${mm(pf.R.pad)} mm, lowest foot ${mm(Math.min(pf.L.all, pf.R.all))} mm, lowest ${mm(M.perchLowest)} mm`);
  ok(M.hip < 0.16 && M.legBelow < 0.06, "v2 Perch: short legs under the belly (hip joints < 16 cm up, < 6 cm of leg below the belly)", `hips ${cm(M.hip)} cm, leg below the belly ${cm(M.legBelow)} cm`);
  ok(M.tips.every((t) => t.d < 0.06 && t.behind), "v2 Perch: the folded wings' tips by the tail (< 6 cm from its line, behind the hips)", M.tips.map((t) => `${cm(t.d)} cm`).join(" / "));
  const spr = (c) => Math.min(M.spread[c].L, M.spread[c].R), sprMax = (c) => Math.max(M.spread[c].L, M.spread[c].R);
  ok(spr("Perch") >= 0.035 && spr("Talons") >= 0.035, "v2 toes spread on the ground and in Talons (the toe tips >= 3.5 cm apart)", `Perch ${cm(spr("Perch"))}, Talons ${cm(spr("Talons"))} cm`);
  ok(sprMax("Glide") < 0.7 * spr("Perch") && sprMax("Stoop") < 0.7 * spr("Perch"), "v2 toes closed in flight (Glide, Stoop: the spread < 0.7 x the perched)", `Glide ${cm(sprMax("Glide"))}, Stoop ${cm(sprMax("Stoop"))} cm`);
  for (const [c, hipMax, legMax] of [["Walk", 0.125, 0.045], ["Hop", 0.15, 0.06]]) {
    const y = M.cycle[c];
    ok(y.hip < hipMax && y.leg < legMax, `v2 ${c}: crouched, the legs mostly hidden (hip joints < ${hipMax * 100} cm up, < ${legMax * 100} cm of leg below the belly, through the cycle)`, `hips <= ${cm(y.hip)} cm, leg below the belly <= ${cm(y.leg)} cm`);
    ok(y.padMin > -0.003 && y.padMax < 0.005 && y.allMin > -0.003, `v2 ${c}: a foot's PADS on the ground through ${c === "Hop" ? "the crouch" : "the cycle"} (0-5 mm, nothing below -3 mm)`, `pads ${mm(y.padMin)} .. ${mm(y.padMax)} mm, lowest ${mm(y.allMin)} mm`);
  }
  const folded = ["Perch", "Walk", "Hop", "Stoop"], wmax = Math.max(...folded.map((c) => M.tail[c]));
  ok(wmax < 0.12 && wmax < 0.5 * M.tail.Glide, "v2 tail closed when folded (Perch / Walk / Hop / Stoop: < 12 cm and < half the glide's, across its tip half)", folded.map((c) => `${c} ${cm(M.tail[c])}`).join(", ") + ` cm (glide ${cm(M.tail.Glide)})`);
  ok(M.tail.Glide > wmax + 0.02 && M.tail.Flare > wmax + 0.03, "v2 tail fans in flight (Glide > folded + 2 cm, Flare > folded + 3 cm)", `Glide ${cm(M.tail.Glide)}, Flare ${cm(M.tail.Flare)} cm`);
  // NO HOLES (rule falcon-gym "the v2 base": the owner, "plenty of holes in its body")
  // (the legs and feet left out: the gaps between the toes and the tarsus are a foot's, not a hole in the body)
  const legs = (n) => /^(UpperLeg|LowerLeg|AnkleLeg|Foot|Toes|b_[lr]_Digit)/.test(n);
  const alpha = await alphaSamplers(B), res = [];
  // (the Walk through its cycle, 6 times: its waddle opened a gap only at the roll's peaks; rule "the v2 round C")
  for (const c of ["Perch", "Walk", "Hop", "Stoop", "Idle", "Glide"]) {
    if (!B.clips[c]) continue;
    for (const u of c === "Walk" ? [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6] : [null]) {
      const X = B.pose(c, u == null ? null : B.dur(c) * u).X;
      for (const [vn, d] of Object.entries(VIEWS)) { const h = holes(B, X, d, alpha, 0.002, null, legs); res.push([u == null ? c : `${c}@${u.toFixed(2)}`, vn, h.hole, h.sil, h.slit / h.sil]); }
    }
  }
  const worst = res.reduce((a, b) => (b[2] > a[2] ? b : a));
  ok(worst[2] < 0.5, "v2 no see-through holes in the body (Perch / Walk / Hop / Stoop / Idle / Glide, six views, the cut-out alpha honoured; gaps bordered by a leg are the leg's: < 0.5 cm2)", `worst ${worst[0]} ${worst[1]} ${worst[2].toFixed(2)} cm2 of ${worst[3].toFixed(0)} cm2`);
  // (the slits from above and behind, the legs and feet left out: the toes' own gaps are a foot's, not a hole)
  const fold = [];
  for (const c of ["Perch", "Walk", "Hop", "Stoop", "Idle"]) {
    if (!B.clips[c]) continue;
    const X = B.pose(c, c === "Walk" ? B.dur(c) * 0.3 : null).X;
    // (the stoop from behind is its cross-section: its outline is feather tips)
    for (const vn of c === "Stoop" ? ["above"] : ["above", "back"]) { const h = holes(B, X, VIEWS[vn], alpha, 0.002, null, legs); fold.push([c, vn, h.hole, h.sil, h.slit / h.sil]); }
  }
  const ws = fold.reduce((a, b) => (b[4] > a[4] ? b : a));
  ok(ws[4] < SLIT_MAX, `v2 no slits between the parts when folded (Perch / Walk / Hop / Stoop / Idle, from above and behind, not by a leg: gaps under 12 mm that a 6 mm closing fills < ${SLIT_MAX * 100} % of the silhouette)`, `worst ${ws[0]} ${ws[1]} ${(ws[4] * 100).toFixed(1)} %`);
  // THE v2 ROUND C (rule falcon-gym "the v2 round C"): the folded tail as perched in every folded clip (the Stoop's
  // was swung out from under the wings: a thin dark spike behind), the Talons a real strike, the Walk's feet planted
  // at the gym's walk
  {
    const P = [], F = [];
    for (let i = 0; i < 8; i++) P.push(tailSet(B, B.pose("Perch", B.dur("Perch") * i / 8)));
    for (const c of ["Walk", "Hop"]) for (let i = 0; i < 4; i++) F.push([c, tailSet(B, B.pose(c, B.dur(c) * i / 4))]);
    F.push(["Stoop", tailSet(B, B.pose("Stoop"))]);
    const rng = (k) => [Math.min(...P.map((x) => x[k])), Math.max(...P.map((x) => x[k]))];
    const [r0, r1] = rng("ratio"), [, o1] = rng("tipOff"), [p0] = rng("past"), [, p1] = rng("pastMax");
    const bad = F.filter(([, t]) => t.ratio < r0 - 0.05 || t.ratio > r1 + 0.05 || t.tipOff > o1 + 0.015 || t.past < p0 - 0.02 || t.pastMax > p1 + 0.02);
    const st = F.find(([c]) => c === "Stoop")[1];
    ok(!bad.length, "v2 folded tail as perched (Walk / Hop / Stoop: its width / length within the Perch's +-0.05, the folded wing tips within the Perch's + 1.5 cm of its line, its tip past them within the Perch's +-2 cm)",
      `Perch ratio ${r0.toFixed(2)}-${r1.toFixed(2)}, wing tips <= ${cm(o1)} cm off, tip ${cm(p0)}-${cm(p1)} cm past; Stoop ${st.ratio.toFixed(2)}, ${cm(st.tipOff)} cm off, ${cm(st.past)}-${cm(st.pastMax)} cm past${bad.length ? `; out: ${[...new Set(bad.map(([c]) => c))].join(" ")}` : ""}`);
    const t = B.pose("Talons"), pr = B.pose("Perch"), ch = t.at("spine_1"), fz = Math.min(t.at("Foot_L")[2], t.at("Foot_R")[2]) - ch[2];
    ok(fz >= 0.04 && Math.max(t.at("Foot_L")[1], t.at("Foot_R")[1]) < ch[1], "v2 Talons: the legs thrown forward (both feet >= 4 cm ahead of the chest, below it)", `feet ${cm(fz)} cm ahead of the chest`);
    const ct = frontClaws(B, t), cp = frontClaws(B, pr), spr = Math.min(ct.L / cp.L, ct.R / cp.R);
    ok(spr >= 1.3, "v2 Talons: the toes open and spread wide (the front claws >= 1.3 x the perched apart)", `${cm(Math.min(ct.L, ct.R))} cm (perched ${cm(Math.min(cp.L, cp.R))}), x${spr.toFixed(2)}`);
    const wr = ["L", "R"].map((s) => { const w1 = t.at(`wing_1_${s}`), wt = t.at(`wing_tip_${s}`); return { up: wt[1] - w1[1], back: w1[2] - wt[2] }; });
    ok(wr.every((w) => w.up >= 0.12 && w.back >= 0.05), "v2 Talons: the wings raised and back, braking (the tips >= 12 cm over the shoulders, >= 5 cm behind them)", wr.map((w) => `up ${cm(w.up)} back ${cm(w.back)}`).join(" / "));
    const wT = tailTipWidth(B, t), wG = M.tail.Glide, hd = t.at("head"), bd = unit(sub(t.at("mouth_upper_tip"), hd)), fm = unit(sub([(t.at("Foot_L")[0] + t.at("Foot_R")[0]) / 2, (t.at("Foot_L")[1] + t.at("Foot_R")[1]) / 2, (t.at("Foot_L")[2] + t.at("Foot_R")[2]) / 2], hd));
    const look = Math.acos(Math.max(-1, Math.min(1, dot(bd, fm)))) * 180 / Math.PI;
    ok(wT >= 0.9 * wG && look < 35, "v2 Talons: the tail fanned (>= 0.9 x the glide's) and the head looking at the feet (the beak < 35 deg off them)", `tail ${cm(wT)} cm (glide ${cm(wG)}), beak ${look.toFixed(0)} deg off the feet`);
    const ws = walkSlide(B);
    ok(ws.slide < 0.01, `v2 Walk: the feet planted at the gym's walk (GYM.walk ${ws.speed.toFixed(2)} m/s, the clip planted at V2_WALK_MPS ${ws.planted.toFixed(2)}, played x${ws.rate.toFixed(2)}: foot slide per planted phase < 1 cm)`, `${mm(ws.slide)} mm`);
  }
  // the juvenile plumage: one KTX2 a painted material beside the glb, named in it
  const vars = Object.entries(B.J.asset?.extras?.variants || {}).filter(([k]) => k.startsWith("juvenile"));
  const files = vars.map(([, v]) => path.join(path.dirname(file), v.file)), okFiles = vars.length > 0 && files.every((f) => fs.existsSync(f) && fs.readFileSync(f).subarray(0, 12).toString("latin1").includes("KTX 20"));
  ok(okFiles && vars.every(([, v]) => v.width >= 512 && v.material), "v2 juvenile plumage: a KTX2 per painted material beside the glb, named in it (asset.extras.variants)", vars.map(([k, v]) => `${k}: ${v.file} (${v.material})`).join(", ") || "missing");
  // THE FOLDED WING SHOWS ITS UPPER SIDE (rule falcon-gym "the folded wing shows its upper side"): the wing's faces that
  // face outward in a folded pose (the posed normal against the body's axis), coloured by the shipped juvenile KTX2 of
  // their material: the buff (luminance > 110 / 255; the upper side's brown ~ 65) share of their area
  if (okFiles) {
    const byMat = {}; for (const [, v] of vars) byMat[v.material] = await decodeKTX2(fs.readFileSync(path.join(path.dirname(file), v.file)));
    const lumAt = (t) => {
      const T = byMat[B.matName[B.PRIM[B.IDX[t]]]]; if (!T) return null;
      const u = (B.UV[B.IDX[t] * 2] + B.UV[B.IDX[t + 1] * 2] + B.UV[B.IDX[t + 2] * 2]) / 3, w = (B.UV[B.IDX[t] * 2 + 1] + B.UV[B.IDX[t + 1] * 2 + 1] + B.UV[B.IDX[t + 2] * 2 + 1]) / 3;
      const x = Math.min(T.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.width))), y = Math.min(T.height - 1, Math.max(0, Math.floor((w - Math.floor(w)) * T.height))), o = (y * T.width + x) * 4;
      return 0.3 * T.data[o] + 0.59 * T.data[o + 1] + 0.11 * T.data[o + 2];
    };
    // (the UNDERWING: the faces whose normal points down in the glide, the wings spread: a juvenile's upper side has
    // pale fringes of its own, only the underwing must not show)
    const G = B.pose("Glide").X, under = new Uint8Array(B.IDX.length / 3);
    for (let t = 0; t < B.IDX.length; t += 3) {
      const a = B.IDX[t], b = B.IDX[t + 1], cc = B.IDX[t + 2];
      const n = cross([G[b * 3] - G[a * 3], G[b * 3 + 1] - G[a * 3 + 1], G[b * 3 + 2] - G[a * 3 + 2]], [G[cc * 3] - G[a * 3], G[cc * 3 + 1] - G[a * 3 + 1], G[cc * 3 + 2] - G[a * 3 + 2]]);
      under[t / 3] = n[1] < -0.3 * len(n) ? 1 : 0;
    }
    const rs = [];
    for (const c of ["Perch", "Walk", "Stoop"]) {
      const p = B.pose(c), X = p.X, h = p.at("hips"), u = unit(sub(p.at("spine_1"), h)); let A = 0, buff = 0;
      for (let t = 0; t < B.IDX.length; t += 3) {
        const a = B.IDX[t], b = B.IDX[t + 1], cc = B.IDX[t + 2]; if (!/^wing_/.test(B.main[a]) || !under[t / 3]) continue;
        const e1 = [X[b * 3] - X[a * 3], X[b * 3 + 1] - X[a * 3 + 1], X[b * 3 + 2] - X[a * 3 + 2]], e2 = [X[cc * 3] - X[a * 3], X[cc * 3 + 1] - X[a * 3 + 1], X[cc * 3 + 2] - X[a * 3 + 2]];
        const n = cross(e1, e2), ar = len(n) / 2; if (ar < 1e-12) continue;
        const m = [0, 1, 2].map((k) => (X[a * 3 + k] + X[b * 3 + k] + X[cc * 3 + k]) / 3 - h[k]), md = dot(m, u), o = m.map((x, k) => x - u[k] * md), ol = len(o) || 1;
        if (dot(n, o) / (2 * ar * ol) <= 0.2) continue;
        const L = lumAt(t); if (L == null) continue;
        A += ar; if (L > 110) buff += ar;
      }
      rs.push([c, buff * 1e4, A * 1e4]);
    }
    const worstB = Math.max(...rs.map((r) => r[1]));
    ok(worstB < 1.0, "v2 folded wing shows its upper side (juvenile: the underwing's buff facing outward when folded < 1 cm2, Perch / Walk / Stoop)", rs.map(([c, b, a]) => `${c} ${b.toFixed(2)} of ${a.toFixed(1)} cm2`).join(", "));
  }
  return out;
}

/** the far LOD (tools/falconV2far.mjs -> falcon_v2_far.glb): 2-3k triangles, the near bird's joints in the same order
 *  (the gym binds it to the near skeleton), the same clips and materials, no textures of its own, small, and posed like
 *  the near bird (its box in Perch / Glide / Stoop within 1.5 cm a side) */
export function v2FarChecks(nearFile, farFile, [tmin, tmax] = [2000, 3000]) {
  const out = [], ok = (c, what, val) => out.push([!!c, what, val]);
  if (!fs.existsSync(farFile)) { ok(false, "v2 far LOD: models/bird/v2/falcon_v2_far.glb exists (tools/falconV2far.mjs)", "missing"); return out; }
  const N = loadV2(nearFile), F = loadV2(farFile), tris = F.IDX.length / 3;
  ok(tris >= tmin && tris <= tmax, `v2 far LOD: ${tmin / 1000}k-${tmax / 1000}k triangles`, `${tris} (near ${N.IDX.length / 3})`);
  const jn = (B) => { const mi = B.J.nodes.findIndex((n) => n.skin != null && n.mesh != null); return B.J.skins[B.J.nodes[mi].skin].joints.map((j) => B.J.nodes[j].name).join(","); };
  ok(jn(N) === jn(F), "v2 far LOD: the near bird's joints, in the same order (bound to its skeleton)", `${jn(F).split(",").length} joints`);
  const cn = (B) => Object.keys(B.clips).sort().join(" ");
  ok(cn(N) === cn(F), "v2 far LOD: the same clips", cn(F));
  ok(!(F.J.images || []).length && F.J.asset?.extras?.sharesTexturesWith === "falcon_v2.glb" && fs.statSync(farFile).size < 1.0e6 && F.matName.join() === N.matName.join(), "v2 far LOD: no textures of its own (wears falcon_v2.glb's materials), < 1 MB", `${(fs.statSync(farFile).size / 1e6).toFixed(2)} MB, materials ${F.matName.length}`);
  const box = (B, c) => { const X = B.pose(c).X, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let v = 0; v < X.length / 3; v++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], X[v * 3 + k]); mx[k] = Math.max(mx[k], X[v * 3 + k]); } return [...mn, ...mx]; };
  const dev = ["Perch", "Glide", "Stoop"].map((c) => { const a = box(N, c), b = box(F, c); return [c, Math.max(...a.map((x, i) => Math.abs(x - b[i])))]; });
  ok(dev.every(([, d]) => d < 0.015), "v2 far LOD: posed like the near bird (its box within 1.5 cm a side, Perch / Glide / Stoop)", dev.map(([c, d]) => `${c} ${(d * 100).toFixed(1)} cm`).join(", "));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const near = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(here, "../models/bird/v2/falcon_v2.glb");
  if (process.argv.includes("--measure")) { const { M } = await v2Measures(near); console.log(JSON.stringify(M, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v))); process.exit(0); }
  const r = await v2PoseChecks(near);
  const far = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : path.join(path.dirname(near), "falcon_v2_far.glb");
  if (fs.existsSync(far)) r.push(...v2FarChecks(near, far));
  for (const [c, w, v] of r) console.log(`${c ? "ok  " : "FAIL"} ${w}: ${v}`);
}
