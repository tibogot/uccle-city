// PACK A PARK KIT (rocks or playground): Blender's raw GLB -> LODs with meshoptimizer (JavaScript, at build time;
// never Blender decimate) -> models/parkkit/<kit>.glb + the LOD table in <kit>.json, then the shared mesh checker
// (tools/mesh_audit, copied as-is from claude/stalle) on every piece and every LOD (each LOD is drawn alone: the
// dithered cross-fade shows complementary pixels, so LODs are separate audit groups).
//
//   node tools/park_kit_pack.mjs rock        (models/parkkit/rockkit.raw.glb -> rockkit.glb)
//   node tools/park_kit_pack.mjs playground  (models/parkkit/playgroundkit.raw.glb -> playgroundkit.glb)
//   [--force-audit] [--no-audit]
//
// Per piece (node "<piece>", optional "<piece>__detail" = LOD0-only parts such as chains / nets / wires, optional
// "<piece>__far" = their LOD1+ stand-ins):
//   ROCKS      LOD0 = the raw mesh simplified to 2 mm (seam-aware: the UV / lightmap islands stay intact);
//              LOD1 / LOD2 = POSITION-WELDED and simplified to 1.5 cm / 6 cm with the AO sampled from the lightmap into
//              COLOR_0.a (per vertex: no lightmap seams to respect, so far fewer triangles). Their material reads the
//              vertex AO and no UVs.
//   PLAYGROUND LOD0 = main + detail as made; LOD1 = main simplified to 1 cm + far; LOD2 = main to 3.5 cm with small
//              disconnected bits pruned (bolts, caps) + far. Seam-aware, lightmap kept.
// Output nodes "<piece>_lod<k>", one primitive per slot (main + detail + far merged per slot: one draw per slot).
// Compressed with EXT_meshopt_compression (see the writer).
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { MeshoptSimplifier } from "./worker/node_modules/meshoptimizer/meshopt_simplifier.js";
import { MeshoptEncoder } from "./worker/node_modules/meshoptimizer/meshopt_encoder.js";
import { auditGroups } from "./mesh_audit/hook.mjs";
import { auditParts } from "./mesh_audit/audit.js";

const KIT = process.argv[2] || "rock";
const DIR = "models/parkkit";
const NAME = KIT === "rock" ? "rockkit" : "playgroundkit";
const SRC = path.join(DIR, `${NAME}.raw.glb`), DST = path.join(DIR, `${NAME}.glb`);
const NO_AUDIT = process.argv.includes("--no-audit");
const CREASE_PG = 50;        // playground: 10-16 sided tubes stay smooth, box edges and panel faces stay sharp / flat
const CREASE = +(process.argv.find((a) => a.startsWith("--crease="))?.slice(8) ?? 60);
/** per piece / LOD simplification error overrides, where the checker found a fold (meshopt left two faces overlapping) */
const ERR_OVERRIDE = {};
const CFG = KIT === "rock"
  ? { lod: [{ err: 0.004 }, { err: 0.015, weld: true }, { err: 0.05, weld: true, prune: true }], range: [14, 45, 200] }
  : { lod: [{ err: 0 }, { err: 0.01, weld: true }, { err: 0.035, weld: true, prune: true }], range: [20, 55, 160] };

// ------------------------------------------------------------------------------------------------ read the raw GLB
const glb = fs.readFileSync(SRC);
const jl = glb.readUInt32LE(12);
const J = JSON.parse(glb.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, BIN = glb.subarray(binOff, binOff + glb.readUInt32LE(20 + jl));
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const TYPED = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const NORMF = { 5126: 1, 5123: 65535, 5121: 255 };
function acc(ai, asFloat = true) {
  const a = J.accessors[ai], v = J.bufferViews[a.bufferView], n = SIZE[a.type], T = TYPED[a.componentType];
  const stride = v.byteStride || n * T.BYTES_PER_ELEMENT;
  const out = new (asFloat ? Float32Array : Uint32Array)(a.count * n);
  const base = binOff + (v.byteOffset || 0) + (a.byteOffset || 0);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
    const o = base + i * stride + k * T.BYTES_PER_ELEMENT;
    const raw = T === Float32Array ? glb.readFloatLE(o) : T === Uint32Array ? glb.readUInt32LE(o) : T === Uint16Array ? glb.readUInt16LE(o) : glb.readUInt8(o);
    out[i * n + k] = asFloat && a.normalized ? raw / NORMF[a.componentType] : raw;
  }
  return out;
}
/** node name -> [{ slot, P, N, UV0, UV1, C, I }] (node transforms are identity / translation only: applied) */
const meshes = {};
for (const node of J.nodes) {
  if (node.mesh == null) continue;
  const t = node.translation || [0, 0, 0];
  meshes[node.name] = J.meshes[node.mesh].primitives.map((p) => {
    const A = p.attributes;
    const P = acc(A.POSITION); for (let i = 0; i < P.length; i += 3) { P[i] += t[0]; P[i + 1] += t[1]; P[i + 2] += t[2]; }
    return {
      slot: J.materials[p.material].name, P, N: acc(A.NORMAL),
      UV0: A.TEXCOORD_0 != null ? acc(A.TEXCOORD_0) : null, UV1: A.TEXCOORD_1 != null ? acc(A.TEXCOORD_1) : null,
      C: A.COLOR_0 != null ? acc(A.COLOR_0) : null, I: acc(p.indices, false),
    };
  });
}

// ------------------------------------------------------------------------------------------------ the AO atlas (vertex AO for welded LODs)
function loadPNG(file) {
  const b = fs.readFileSync(file);
  const W = b.readUInt32BE(16), H = b.readUInt32BE(20), depth = b[24], ct = b[25];
  if (depth !== 8) throw new Error(`${file}: ${depth}-bit PNG`);
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  const idat = [];
  for (let o = 8; o < b.length;) { const L = b.readUInt32BE(o), t = b.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(b.subarray(o + 8, o + 8 + L)); o += 12 + L; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = W * bpp, out = new Uint8Array(W * H);
  let prev = new Uint8Array(stride), row = new Uint8Array(stride);
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
    [prev, row] = [row, prev];
  }
  // glTF UV (0,0) = the image's top-left (the exporter flips v)
  return (u, v) => {
    const x = Math.min(W - 1.001, Math.max(0, u * W - 0.5)), y = Math.min(H - 1.001, Math.max(0, v * H - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, P = (i, j) => out[j * W + i] / 255;
    return (P(x0, y0) * (1 - fx) + P(x0 + 1, y0) * fx) * (1 - fy) + (P(x0, y0 + 1) * (1 - fx) + P(x0 + 1, y0 + 1) * fx) * fy;
  };
}
const aoPng = path.join(DIR, `${NAME}_ao.png`);
const aoAt = fs.existsSync(aoPng) ? loadPNG(aoPng) : null;

// ------------------------------------------------------------------------------------------------ simplification
await MeshoptSimplifier.ready;
const tris = (m) => m.I.length / 3;
function compact(m, I) {
  const map = new Int32Array(m.P.length / 3).fill(-1); let n = 0;
  for (const i of I) if (map[i] < 0) map[i] = n++;
  const pick = (A, k) => { if (!A) return null; const o = new Float32Array(n * k); for (let i = 0; i < map.length; i++) if (map[i] >= 0) for (let c = 0; c < k; c++) o[map[i] * k + c] = A[i * k + c]; return o; };
  return { slot: m.slot, P: pick(m.P, 3), N: pick(m.N, 3), UV0: pick(m.UV0, 2), UV1: pick(m.UV1, 2), C: pick(m.C, 4), I: Uint32Array.from(I, (i) => map[i]) };
}
/** seam-aware: the raw buffers (vertices split at UV seams / hard edges); meshopt keeps the seams consistent */
function simplifySeams(m, err, prune) {
  if (err <= 0) return m;
  const flags = ["ErrorAbsolute"]; if (prune) flags.push("Prune");
  const [I] = MeshoptSimplifier.simplify(m.I, m.P, 3, 0, err, flags);
  return compact(m, I);
}
/** welded: one vertex per position (normals averaged, AO from the lightmap averaged), simplified with the normal and
 *  the AO as attributes; UVs dropped (the far material needs none) */
function simplifyWelded(m, err, prune) {
  const n = m.P.length / 3, key = new Map(), canon = new Uint32Array(n);
  const P = [], N = [], AO = [], C = [], cnt = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(m.P[i * 3] * 2000)},${Math.round(m.P[i * 3 + 1] * 2000)},${Math.round(m.P[i * 3 + 2] * 2000)}`;
    let c = key.get(k);
    if (c == null) { c = P.length / 3; key.set(k, c); P.push(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]); N.push(0, 0, 0); AO.push(0); C.push(0, 0, 0); cnt.push(0); }
    canon[i] = c;
    N[c * 3] += m.N[i * 3]; N[c * 3 + 1] += m.N[i * 3 + 1]; N[c * 3 + 2] += m.N[i * 3 + 2];
    AO[c] += aoAt && m.UV1 ? aoAt(m.UV1[i * 2], m.UV1[i * 2 + 1]) : 1;
    if (m.C) { C[c * 3] += m.C[i * 4]; C[c * 3 + 1] += m.C[i * 4 + 1]; C[c * 3 + 2] += m.C[i * 4 + 2]; }
    cnt[c]++;
  }
  const nv = P.length / 3, Pf = new Float32Array(P), attr = new Float32Array(nv * 4), Cf = new Float32Array(nv * 4);
  for (let c = 0; c < nv; c++) {
    const l = Math.hypot(N[c * 3], N[c * 3 + 1], N[c * 3 + 2]) || 1;
    attr[c * 4] = N[c * 3] / l; attr[c * 4 + 1] = N[c * 3 + 1] / l; attr[c * 4 + 2] = N[c * 3 + 2] / l; attr[c * 4 + 3] = AO[c] / cnt[c];
    Cf[c * 4] = C[c * 3] / cnt[c]; Cf[c * 4 + 1] = C[c * 3 + 1] / cnt[c]; Cf[c * 4 + 2] = C[c * 3 + 2] / cnt[c]; Cf[c * 4 + 3] = AO[c] / cnt[c];
  }
  const I0 = Uint32Array.from(m.I, (i) => canon[i]);
  const flags = ["ErrorAbsolute"]; if (prune) flags.push("Prune");
  const [I] = MeshoptSimplifier.simplifyWithAttributes(I0, Pf, 3, attr, 4, [0.4, 0.4, 0.4, 0.8], null, 0, err, flags);
  const Nf = new Float32Array(nv * 3); for (let c = 0; c < nv; c++) { Nf[c * 3] = attr[c * 4]; Nf[c * 3 + 1] = attr[c * 4 + 1]; Nf[c * 3 + 2] = attr[c * 4 + 2]; }
  return compact({ slot: m.slot, P: Pf, N: Nf, UV0: null, UV1: null, C: Cf, I }, I);
}
/** normals rebuilt from the FINAL triangles (after simplification) with a crease angle: each corner averages the
 *  area-weighted normals of the faces round its vertex that are within `crease` of its own face; corners with
 *  different normals become separate vertices. (The source's smooth normals on a simplified mesh = the checker's
 *  "streak": a corner normal far from its face, or diverging across a stretched triangle.) */
function renormal(m, creaseDeg) {
  const nf = m.I.length / 3, nv = m.P.length / 3, FN = new Float32Array(nf * 3), FU = new Float32Array(nf * 3);
  // corners are averaged and edges matched by POSITION (0.1 mm), across UV / lightmap seams, like the checker welds
  const canon = new Uint32Array(nv), pk = new Map();
  for (let i = 0; i < nv; i++) {
    const k = `${Math.round(m.P[i * 3] * 1e4)},${Math.round(m.P[i * 3 + 1] * 1e4)},${Math.round(m.P[i * 3 + 2] * 1e4)}`;
    let c = pk.get(k); if (c == null) { c = i; pk.set(k, c); } canon[i] = c;
  }
  const adj = Array.from({ length: nv }, () => []);
  for (let f = 0; f < nf; f++) {
    const a = m.I[f * 3], b = m.I[f * 3 + 1], c = m.I[f * 3 + 2];
    const ux = m.P[b * 3] - m.P[a * 3], uy = m.P[b * 3 + 1] - m.P[a * 3 + 1], uz = m.P[b * 3 + 2] - m.P[a * 3 + 2];
    const vx = m.P[c * 3] - m.P[a * 3], vy = m.P[c * 3 + 1] - m.P[a * 3 + 1], vz = m.P[c * 3 + 2] - m.P[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    FN[f * 3] = nx; FN[f * 3 + 1] = ny; FN[f * 3 + 2] = nz; FU[f * 3] = nx / l; FU[f * 3 + 1] = ny / l; FU[f * 3 + 2] = nz / l;
    adj[canon[a]].push(f); adj[canon[b]].push(f); adj[canon[c]].push(f);
  }
  const cosC = Math.cos(creaseDeg * Math.PI / 180), key = new Map();
  // a face inside a PLANAR REGION keeps its flat normal (the checker's "bentflat": regions flood-filled over edges within
  // 1 deg, larger than 0.3 m2, must shade flat)
  const cos1 = Math.cos(Math.PI / 180), planar = new Uint8Array(nf);
  {
    const par = new Int32Array(nf).map((_, i) => i), fnd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const em = new Map();
    for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
      const a = canon[m.I[f * 3 + k]], b = canon[m.I[f * 3 + (k + 1) % 3]], kk = a < b ? a * 4294967296 + b : b * 4294967296 + a;
      const o = em.get(kk);
      if (o == null) em.set(kk, f);
      else if (FU[o * 3] * FU[f * 3] + FU[o * 3 + 1] * FU[f * 3 + 1] + FU[o * 3 + 2] * FU[f * 3 + 2] > cos1) { const x = fnd(o), y = fnd(f); if (x !== y) par[x] = y; }
    }
    const area = new Map();
    for (let f = 0; f < nf; f++) { const r = fnd(f); area.set(r, (area.get(r) ?? 0) + Math.hypot(FN[f * 3], FN[f * 3 + 1], FN[f * 3 + 2]) / 2); }
    for (let f = 0; f < nf; f++) planar[f] = area.get(fnd(f)) > 0.2 ? 2 : 0;
  }
  const P = [], N = [], U0 = [], U1 = [], C = [], I = new Uint32Array(m.I.length);
  const E = (a, b) => Math.hypot(m.P[a * 3] - m.P[b * 3], m.P[a * 3 + 1] - m.P[b * 3 + 1], m.P[a * 3 + 2] - m.P[b * 3 + 2]);
  const sliverFlat = new Uint8Array(nf);
  for (let f = 0; f < nf; f++) {
    const ids = [m.I[f * 3], m.I[f * 3 + 1], m.I[f * 3 + 2]];
    const L = Math.max(E(ids[0], ids[1]), E(ids[1], ids[2]), E(ids[2], ids[0])), A2 = Math.hypot(FN[f * 3], FN[f * 3 + 1], FN[f * 3 + 2]);
    if (L < 0.12 || L * L < 5 * A2) continue;                     // (aspect = L / h = L^2 / A2 > 5)
    const cn = ids.map((v) => { let x = 0, y = 0, z = 0; for (const g of adj[canon[v]]) if (FU[g * 3] * FU[f * 3] + FU[g * 3 + 1] * FU[f * 3 + 1] + FU[g * 3 + 2] * FU[f * 3 + 2] >= cosC) { x += FN[g * 3]; y += FN[g * 3 + 1]; z += FN[g * 3 + 2]; } const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; });
    const d = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    if (Math.min(d(cn[0], cn[1]), d(cn[1], cn[2]), d(cn[0], cn[2])) < Math.cos(25 * Math.PI / 180)) sliverFlat[f] = 1;
  }
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
    const v = m.I[f * 3 + k];
    let x = 0, y = 0, z = 0;
    const a = m.I[f * 3], b = m.I[f * 3 + 1], c = m.I[f * 3 + 2];
    if (planar[f] === 2) { x = FN[f * 3]; y = FN[f * 3 + 1]; z = FN[f * 3 + 2]; }
    else for (const g of adj[canon[v]]) if (FU[g * 3] * FU[f * 3] + FU[g * 3 + 1] * FU[f * 3 + 1] + FU[g * 3 + 2] * FU[f * 3 + 2] >= cosC) { x += FN[g * 3]; y += FN[g * 3 + 1]; z += FN[g * 3 + 2]; }
    // a SLIVER whose smooth corner normals would streak (the checker's rule: > 6:1, > 15 cm, corners > 30 deg apart)
    // is shaded flat; other slivers stay smooth (flat ones show as facets close up)
    if (sliverFlat[f]) { x = FN[f * 3]; y = FN[f * 3 + 1]; z = FN[f * 3 + 2]; }
    const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    const kk = `${v},${Math.round(x * 200)},${Math.round(y * 200)},${Math.round(z * 200)}`;
    let o = key.get(kk);
    if (o == null) {
      o = P.length / 3; key.set(kk, o);
      P.push(m.P[v * 3], m.P[v * 3 + 1], m.P[v * 3 + 2]); N.push(x, y, z);
      if (m.UV0) U0.push(m.UV0[v * 2], m.UV0[v * 2 + 1]); if (m.UV1) U1.push(m.UV1[v * 2], m.UV1[v * 2 + 1]);
      if (m.C) C.push(m.C[v * 4], m.C[v * 4 + 1], m.C[v * 4 + 2], m.C[v * 4 + 3]);
    }
    I[f * 3 + k] = o;
  }
  return { slot: m.slot, P: new Float32Array(P), N: new Float32Array(N), UV0: m.UV0 ? new Float32Array(U0) : null, UV1: m.UV1 ? new Float32Array(U1) : null, C: m.C ? new Float32Array(C) : null, I };
}
/** merge primitives per slot (main + detail / far): one draw per slot */
function mergeSlots(list) {
  const by = new Map();
  for (const m of list) { if (!by.has(m.slot)) by.set(m.slot, []); by.get(m.slot).push(m); }
  return [...by.values()].map((ms) => {
    if (ms.length === 1) return ms[0];
    const nv = ms.reduce((s, m) => s + m.P.length / 3, 0), ni = ms.reduce((s, m) => s + m.I.length, 0);
    const has = (k) => ms.every((m) => m[k]);
    const o = { slot: ms[0].slot, P: new Float32Array(nv * 3), N: new Float32Array(nv * 3), UV0: has("UV0") ? new Float32Array(nv * 2) : null, UV1: has("UV1") ? new Float32Array(nv * 2) : null, C: has("C") ? new Float32Array(nv * 4) : null, I: new Uint32Array(ni) };
    let v = 0, i = 0;
    for (const m of ms) {
      const n = m.P.length / 3;
      o.P.set(m.P, v * 3); o.N.set(m.N, v * 3);
      if (o.UV0) o.UV0.set(m.UV0, v * 2); if (o.UV1) o.UV1.set(m.UV1, v * 2); if (o.C) o.C.set(m.C, v * 4);
      for (let k = 0; k < m.I.length; k++) o.I[i + k] = m.I[k] + v;
      v += n; i += m.I.length;
    }
    return o;
  });
}

const pieces = Object.keys(meshes).filter((n) => !n.includes("__"));
const out = [];            // { name, prims }
const table = {};
for (const piece of pieces) {
  const main = meshes[piece], detail = meshes[`${piece}__detail`] || [], far = meshes[`${piece}__far`] || [];
  table[piece] = { lods: [], range: CFG.range };
  CFG.lod.forEach((L0, k) => {
   // meshopt can leave a fold (two faces overlapping): the checker runs on the LOD as made, and the LOD is re-made with
   // a slightly different error until it is clean (at most 5 tries; the last one is kept and the final audit reports it)
   for (const mul of (k === 0 && KIT !== "rock") ? [1] : [1, 0.85, 1.15, 0.7, 1.3]) {
    const L = { ...L0, err: (ERR_OVERRIDE[`${piece}:${k}`] ?? L0.err) * mul };
    let prims;
    if (KIT === "rock") prims = main.map((m) => renormal(L.weld ? simplifyWelded(m, L.err, L.prune) : simplifySeams(m, L.err, false), CREASE));
    else if (k === 0) prims = mergeSlots([...main, ...detail]).map((m) => renormal(m, CREASE_PG));
    // LOD1 / LOD2: welded + vertex AO like the rocks (the hard-surface seams would block meshopt), + the far stand-ins
    else prims = mergeSlots([...main.map((m) => simplifyWelded(m, L.err, L.prune)), ...far.map((m) => simplifyWelded(m, k === 2 ? L.err * 0.5 : 0.0005, false))]).map((m) => renormal(m, CREASE_PG));
    prims = prims.filter((m) => m.I.length);
    if (!NO_AUDIT && mul !== 1.3) {
      const r = auditParts(prims.map((m) => ({ name: `${piece}_lod${k}`, slot: m.slot, positions: m.P, normals: m.N, index: m.I, maxDistance: CFG.range[k] })), { ignoreBelow: KIT === "rock" ? 0.07 : -0.02 });
      const c = r.summary.counts, b = ["coplanar", "depth", "crossing", "leak", "flipped", "streak", "bentflat"].reduce((s, x) => s + (c[x] ?? 0), 0);
      if (b) { console.log(`  ${piece} lod${k} err ${L.err.toFixed(4)}: ${b} blocking, re-made`); continue; }
    }
    const t = prims.reduce((s, m) => s + tris(m), 0);
    table[piece].lods.push({ node: `${piece}_lod${k}`, triangles: t, draws: prims.length, slots: prims.map((m) => m.slot), error_m: L.err, vertex_ao: !!L.weld });
    out.push({ name: `${piece}_lod${k}`, prims });
    break;
   }
  });
  const raw = [...main, ...detail].reduce((s, m) => s + tris(m), 0);
  console.log(`${piece.padEnd(14)} raw ${String(raw).padStart(6)}  ` + table[piece].lods.map((l, k) => `lod${k} ${String(l.triangles).padStart(6)} (${l.draws})`).join("  "));
}

// ------------------------------------------------------------------------------------------------ write the GLB
// EXT_meshopt_compression on every buffer view (three's GLTFLoader + MeshoptDecoder decode it): positions and UVs stay
// float through the EXPONENTIAL filter (shared exponent per component: ~0.01 mm on a 4 m piece), normals become int8
// octahedral (KHR_mesh_quantization), colours uint8, indices TRIANGLES-coded.
await MeshoptEncoder.ready;
const chunks = []; let off = 0, rawBytes = 0;
const G = { asset: { version: "2.0", generator: `uccle-city park_kit_pack.mjs (${KIT})` }, extensionsUsed: ["EXT_meshopt_compression", "KHR_mesh_quantization"],
  extensionsRequired: ["EXT_meshopt_compression", "KHR_mesh_quantization"], scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] };
const matIndex = new Map();
const matOf = (s) => { if (!matIndex.has(s)) { matIndex.set(s, G.materials.length); G.materials.push({ name: s, pbrMetallicRoughness: { baseColorFactor: [0.6, 0.6, 0.6, 1], metallicFactor: 0, roughnessFactor: 0.8 } }); } return matIndex.get(s); };
function view(bytes, count, stride, mode, filter, target) {
  const enc = Buffer.from(MeshoptEncoder.encodeGltfBuffer(bytes, count, stride, mode));
  const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const ext = { buffer: 0, byteOffset: off, byteLength: enc.length, byteStride: stride, mode, count, ...(filter ? { filter } : {}) };
  G.bufferViews.push({ buffer: 1, byteOffset: rawBytes, byteLength: count * stride, ...(mode === "ATTRIBUTES" ? { byteStride: stride } : {}), ...(target ? { target } : {}), extensions: { EXT_meshopt_compression: ext } });
  rawBytes += count * stride; rawBytes += (4 - (rawBytes % 4)) % 4;
  chunks.push(enc); off += enc.length;
  return G.bufferViews.length - 1;
}
function accessor(bv, count, type, ct, normalized = false, mm = null) {
  G.accessors.push({ bufferView: bv, componentType: ct, count, type, ...(normalized ? { normalized: true } : {}), ...(mm ? { min: mm[0], max: mm[1] } : {}) });
  return G.accessors.length - 1;
}
const u8 = (t) => new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
for (const { name, prims } of out) {
  const primitives = prims.map((m) => {
    const nv = m.P.length / 3;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const Pq = MeshoptEncoder.encodeFilterExp(m.P, nv, 12, 18, "SharedComponent");
    // the filter rounds: min / max from the decoded values
    const Pd = new Float32Array(Pq.buffer.slice(Pq.byteOffset, Pq.byteOffset + Pq.byteLength));
    const dv = new DataView(Pq.buffer, Pq.byteOffset, Pq.byteLength);
    for (let i = 0; i < nv * 3; i++) { const w = dv.getUint32(i * 4, true), e = (w >> 24) << 24 >> 24, mant = (w << 8) >> 8; Pd[i] = Math.fround(mant * Math.pow(2, e)); }
    for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], Pd[i * 3 + k]); mx[k] = Math.max(mx[k], Pd[i * 3 + k]); }
    const attributes = { POSITION: accessor(view(Pq, nv, 12, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "VEC3", 5126, false, [mn, mx]) };
    const N4 = new Float32Array(nv * 4); for (let i = 0; i < nv; i++) { N4[i * 4] = m.N[i * 3]; N4[i * 4 + 1] = m.N[i * 3 + 1]; N4[i * 4 + 2] = m.N[i * 3 + 2]; N4[i * 4 + 3] = 0; }
    attributes.NORMAL = accessor(view(MeshoptEncoder.encodeFilterOct(N4, nv, 4, 8), nv, 4, "ATTRIBUTES", "OCTAHEDRAL", 34962), nv, "VEC3", 5120, true);
    if (m.UV0) attributes.TEXCOORD_0 = accessor(view(MeshoptEncoder.encodeFilterExp(m.UV0, nv, 8, 16, "SharedComponent"), nv, 8, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "VEC2", 5126);
    if (m.UV1) attributes.TEXCOORD_1 = accessor(view(MeshoptEncoder.encodeFilterExp(m.UV1, nv, 8, 16, "SharedComponent"), nv, 8, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "VEC2", 5126);
    if (m.C) attributes.COLOR_0 = accessor(view(Uint8Array.from(m.C, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255)), nv, 4, "ATTRIBUTES", null, 34962), nv, "VEC4", 5121, true);
    const big = nv >= 65536, I = big ? Uint32Array.from(m.I) : Uint16Array.from(m.I);
    const indices = accessor(view(u8(I), I.length, big ? 4 : 2, "TRIANGLES", null, 34963), I.length, "SCALAR", big ? 5125 : 5123);
    return { attributes, indices, material: matOf(m.slot) };
  });
  G.meshes.push({ name, primitives });
  G.nodes.push({ name, mesh: G.meshes.length - 1 });
  G.scenes[0].nodes.push(G.nodes.length - 1);
}
const binBuf = Buffer.concat(chunks); const binPad = Buffer.alloc((4 - (binBuf.length % 4)) % 4);
G.buffers.push({ byteLength: binBuf.length + binPad.length }, { byteLength: rawBytes, extensions: { EXT_meshopt_compression: { fallback: true } } });
let js = Buffer.from(JSON.stringify(G)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length + binPad.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length + binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(DST, Buffer.concat([head, jh, js, bh, binBuf, binPad]));
console.log(`wrote ${DST} ${(fs.statSync(DST).size / 1024 / 1024).toFixed(2)} MB (uncompressed ${(rawBytes / 1048576).toFixed(2)} MB)`);

// ------------------------------------------------------------------------------------------------ the kit's json: LOD table
const infoFile = path.join(DIR, `${NAME}.json`);
const info = JSON.parse(fs.readFileSync(infoFile));
info.lods = table;
info.glb_bytes = fs.statSync(DST).size;
info.lod_ranges_m = { note: "each LOD's band END (camera distance); dithered cross-fades over the last 15 % of a band", bands: CFG.range };

// ------------------------------------------------------------------------------------------------ mesh checker (0 blocking per piece and LOD)
if (!NO_AUDIT) {
  const groups = out.map((o) => ({ name: o.name, nodes: [o.name] }));
  const range = Object.fromEntries(out.map((o) => [o.name, CFG.range[+o.name.slice(-1)]]));
  // rocks are set 0.08-0.2 m into the ground (their bottom is open: rockkit.json "frame"); playground pieces stand on it
  const res = await auditGroups(DST, { name: NAME, groups, range, ignoreBelow: KIT === "rock" ? 0.07 : -0.02, reportDir: path.join(DIR, "audit"), allowFile: path.join(DIR, "audit", `${NAME}.allow.json`) });
  info.audit = Object.fromEntries(Object.entries(res).map(([k, s]) => [k, { blocking: s.blocking, warnings: s.warnings, counts: Object.fromEntries(Object.entries(s.counts).filter(([, v]) => v)) }]));
  const blk = Object.values(res).reduce((s, x) => s + x.blocking, 0);
  console.log(`[mesh audit] ${NAME}: ${blk} blocking over ${groups.length} groups`);
}
fs.writeFileSync(infoFile, JSON.stringify(info, null, 1));
