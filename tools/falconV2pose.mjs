// tools/falconV2pose.mjs: the falcon v2's POSE checks on the shipped glb (gate row `falcongym`, rule falcon-gym "the v2
// model"): the meshopt glb decoded, its skin evaluated in Node (linear blend skinning, the clips sampled at their
// first key), no three.js. What the V2 POLISH fixed stays fixed:
//   - Perch stands like a perched peregrine: the body upright (35-65 deg), the feet on the ground under the hips, the
//     hips low (the tarsi under the belly), the folded wings' tips by the tail, the toes closed
//   - the feather cards are rigid (one bone each), so a fold turns them whole: no card edge stretches in Perch / Stoop
//   - the toes: closed in flight (Glide) and in Perch, open in Talons
//   - the juvenile plumage beside it (KTX2, named in the glb, the base colour's size)
//   import { v2PoseChecks } from "./falconV2pose.mjs"; v2PoseChecks(glbPath) -> [[ok, what, value], ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

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
    const out = new Float64Array(a.count * n), norm = a.normalized ? { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType] : 1;
    const get = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" }[a.componentType];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[get]((a.byteOffset || 0) + k * stride + c * cs, true) / norm;
    return out;
  };
  return { J, acc };
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
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b) || 1)))) * 180 / Math.PI;

// ------------------------------------------------------------------------------------------------ the skinned bird
export function loadV2(file) {
  const { J, acc } = readGlb(file);
  const mi = J.nodes.findIndex((n) => n.skin != null && n.mesh != null), mn = J.nodes[mi], skin = J.skins[mn.skin];
  const prim = J.meshes[mn.mesh].primitives[0];
  const P = acc(prim.attributes.POSITION), JN = acc(prim.attributes.JOINTS_0), WT = acc(prim.attributes.WEIGHTS_0), IDX = acc(prim.indices);
  const IBM = acc(skin.inverseBindMatrices), joints = skin.joints, NV = P.length / 3;
  const parent = new Int32Array(J.nodes.length).fill(-1);
  J.nodes.forEach((n, i) => (n.children || []).forEach((c) => { parent[c] = i; }));
  const byName = Object.fromEntries(J.nodes.map((n, i) => [n.name, i]));
  const clips = Object.fromEntries((J.animations || []).map((a) => [a.name, a]));
  /** the node world matrices with `clip` at its first key (null: the rest) */
  function world(clip) {
    const T = J.nodes.map((n) => ({ t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] }));
    if (clip) for (const ch of clips[clip].channels) {
      const sm = clips[clip].samplers[ch.sampler], out = acc(sm.output), p = ch.target.path;
      if (p === "rotation") T[ch.target.node].r = [...out.subarray(0, 4)];
      else if (p === "translation") T[ch.target.node].t = [...out.subarray(0, 3)];
    }
    const W = new Array(J.nodes.length);
    const get = (i) => W[i] ??= parent[i] < 0 ? trs(T[i].t, T[i].r, T[i].s) : mul(get(parent[i]), trs(T[i].t, T[i].r, T[i].s));
    J.nodes.forEach((_, i) => get(i));
    return W;
  }
  /** the posed vertices (Float64Array xyz) and the joints' world positions by name */
  function pose(clip) {
    const W = world(clip), S = joints.map((j, k) => mul(W[j], IBM.subarray(k * 16, k * 16 + 16)));
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
  // per vertex: its main joint's name and weight
  const main = new Array(NV), mainW = new Float64Array(NV);
  for (let v = 0; v < NV; v++) { let b = 0; for (let c = 1; c < 4; c++) if (WT[v * 4 + c] > WT[v * 4 + b]) b = c; main[v] = J.nodes[joints[JN[v * 4 + b]]].name; mainW[v] = WT[v * 4 + b]; }
  return { J, NV, IDX, P, main, mainW, clips, pose };
}

export function v2PoseChecks(file) {
  const out = [], ok = (c, what, val) => out.push([!!c, what, val]);
  const B = loadV2(file), { NV, IDX, main, mainW } = B;
  const has = (...cs) => cs.every((c) => B.clips[c]);
  if (!has("Perch", "Stoop", "Glide", "Talons")) { ok(false, "v2 pose checks: clips Perch / Stoop / Glide / Talons", Object.keys(B.clips).join(" ")); return out; }
  // loose parts (union-find over the triangles) -> the feather cards: small parts on ONE joint (weight 1)
  const par = new Int32Array(NV).map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let t = 0; t < IDX.length; t += 3) for (const [a, b] of [[IDX[t], IDX[t + 1]], [IDX[t + 1], IDX[t + 2]]]) { const ra = find(a), rb = find(b); if (ra !== rb) par[ra] = rb; }
  const parts = new Map(); for (let v = 0; v < NV; v++) { const r = find(v); (parts.get(r) || parts.set(r, []).get(r)).push(v); }
  const wingCards = [...parts.values()].filter((vs) => vs.length <= 300 && main[vs[0]].startsWith("wing") && vs.every((v) => mainW[v] > 0.999 && main[v] === main[vs[0]]));
  ok(wingCards.length >= 60, "v2 wing feather cards rigid (one bone each, weight 1)", `${wingCards.length} cards`);
  const cardV = new Uint8Array(NV); for (const vs of wingCards) for (const v of vs) cardV[v] = 1;
  const rest = B.pose(null).X;
  const stretch = (X) => {
    let m = 0;
    for (let t = 0; t < IDX.length; t += 3) for (const [a, b] of [[IDX[t], IDX[t + 1]], [IDX[t + 1], IDX[t + 2]], [IDX[t + 2], IDX[t]]]) {
      if (!cardV[a]) continue;
      const l0 = Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2]);
      const l1 = Math.hypot(X[a * 3] - X[b * 3], X[a * 3 + 1] - X[b * 3 + 1], X[a * 3 + 2] - X[b * 3 + 2]);
      if (l0 > 1e-5) m = Math.max(m, Math.abs(l1 / l0 - 1));
    }
    return m;
  };
  const perch = B.pose("Perch"), stoop = B.pose("Stoop"), glide = B.pose("Glide"), talons = B.pose("Talons");
  for (const [n, p] of [["Perch", perch], ["Stoop", stoop]]) { const s = stretch(p.X); ok(s < 0.02, `v2 ${n}: no feather card stretches (folded wing: cards turn whole)`, `max ${(s * 100).toFixed(2)} %`); }
  // Perch: the body's line (hips -> spine_1) above the horizontal (glTF: +Y up, +Z the nose)
  const { X, at } = perch;
  const body = sub(at("spine_1"), at("hips")), pitch = Math.atan2(body[1], Math.hypot(body[0], body[2])) * 180 / Math.PI;
  ok(pitch >= 35 && pitch <= 65, "v2 Perch: body upright 35-65 deg", `${pitch.toFixed(0)} deg`);
  // the feet on the ground (the root's origin), nothing below it; the hips low over the feet
  let footMin = Infinity, allMin = Infinity;
  for (let v = 0; v < NV; v++) { const y = X[v * 3 + 1]; allMin = Math.min(allMin, y); if (/^(Foot|Toes)/.test(main[v])) footMin = Math.min(footMin, y); }
  ok(Math.abs(footMin) < 0.012 && allMin > -0.015, "v2 Perch: the feet on the ground, nothing under it", `feet ${(footMin * 100).toFixed(1)} cm, lowest ${(allMin * 100).toFixed(1)} cm`);
  // short legs: the hips low, and the bare leg below the belly's feathers short (the belly's lowest body vertex over
  // the foot's joint: the tarsus mostly hidden; the download's attack-pose legs showed 15+ cm)
  const hipY = (at("UpperLeg_L")[1] + at("UpperLeg_R")[1]) / 2, footY = (at("Foot_L")[1] + at("Foot_R")[1]) / 2;
  let belly = Infinity; for (let v = 0; v < NV; v++) if (/^(hips|spine_[01])$/.test(main[v])) belly = Math.min(belly, X[v * 3 + 1]);
  ok(hipY < 0.16 && belly - footY < 0.06, "v2 Perch: short legs under the belly (hip joints < 16 cm up, < 6 cm of leg below the belly)", `hips ${(hipY * 100).toFixed(1)} cm, leg below the belly ${((belly - footY) * 100).toFixed(1)} cm`);
  const feetUnder = ["L", "R"].map((s) => { const f = at(`Foot_${s}`), h = at(`UpperLeg_${s}`); return Math.hypot(f[0] - h[0], f[2] - h[2]); });
  ok(Math.max(...feetUnder) < 0.07, "v2 Perch: the feet under the hips (< 7 cm off)", feetUnder.map((d) => `${(d * 100).toFixed(1)} cm`).join(" / "));
  // the folded wings' tips (the outermost rest vertex a side) on the tail, behind the hips
  const tips = [1, -1].map((sg) => { let b = -1; for (let v = 0; v < NV; v++) if (b < 0 || sg * B.P[v * 3] > sg * B.P[b * 3]) b = v; return [X[b * 3], X[b * 3 + 1], X[b * 3 + 2]]; });
  // (the tail is fanned in the bind: the tips lie on its feathers, off its centre line)
  const tipD = tips.map((p) => { let m = Infinity; for (let v = 0; v < NV; v++) if (main[v].startsWith("tail")) m = Math.min(m, Math.hypot(X[v * 3] - p[0], X[v * 3 + 1] - p[1], X[v * 3 + 2] - p[2])); return m; });
  const behind = tips.every((p) => dot(sub(p, at("hips")), body) < 0);
  ok(Math.max(...tipD) < 0.06 && behind, "v2 Perch: the folded wings' tips on the tail (< 6 cm from its feathers, behind the hips)", tipD.map((d) => `${(d * 100).toFixed(1)} cm`).join(" / "));
  // the toes: the curl = the claw's line (Toes_tip -> its farthest vertex) against the foot's (Foot -> Toes), signed:
  // + toward the sole (the side the tarsus comes from), - bent back
  const curl = (p, s) => {
    let far = null, fd = -1; const th = p.at(`Toes_tip_${s}`);
    for (let v = 0; v < NV; v++) if (main[v] === `Toes_tip_${s}`) { const q = [p.X[v * 3], p.X[v * 3 + 1], p.X[v * 3 + 2]], d = len(sub(q, th)); if (d > fd) { fd = d; far = q; } }
    if (!far) return 0;
    const f = sub(p.at(`Toes_${s}`), p.at(`Foot_${s}`)), a = sub(p.at(`Foot_${s}`), p.at(`AnkleLeg_${s}`)), lf = len(f);
    const u = f.map((x) => x / lf), ad = dot(a, u), n0 = [a[0] - u[0] * ad, a[1] - u[1] * ad, a[2] - u[2] * ad], ln = len(n0), n = n0.map((x) => x / ln);
    const c = sub(far, th); return Math.atan2(dot(c, n), dot(c, u)) * 180 / Math.PI;
  };
  const cg = Math.min(curl(glide, "L"), curl(glide, "R")), cp = Math.min(curl(perch, "L"), curl(perch, "R")), ct = Math.max(curl(talons, "L"), curl(talons, "R")), ct0 = Math.min(curl(talons, "L"), curl(talons, "R"));
  ok(cg >= 45 && cp >= 45, "v2 toes closed in flight (Glide) and on the perch (curl >= 45 deg toward the sole)", `glide ${cg.toFixed(0)}, perch ${cp.toFixed(0)} deg`);
  ok(ct <= 25 && ct0 >= -35, "v2 Talons: toes open (curl <= 25 deg, not bent back past -35)", `${ct0.toFixed(0)} .. ${ct.toFixed(0)} deg`);
  // the juvenile plumage (the player): its KTX2 beside the glb, named in it, the base colour's size
  const v = B.J.asset?.extras?.variants?.juvenile, f = v && path.join(path.dirname(file), v.file);
  const okFile = f && fs.existsSync(f) && fs.readFileSync(f).subarray(0, 12).toString("latin1").includes("KTX 20");
  const baseImg = B.J.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture != null;
  ok(okFile && baseImg && v.width >= 512 && v.height >= 512, "v2 juvenile plumage: KTX2 beside the glb, named in it (asset.extras.variants)", v ? `${v.file} ${v.width}x${v.height}` : "missing");
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = v2PoseChecks(process.argv[2] || path.join(here, "../models/bird/v2/falcon_v2.glb"));
  for (const [c, w, v] of r) console.log(`${c ? "ok  " : "FAIL"} ${w}: ${v}`);
}
