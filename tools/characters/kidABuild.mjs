#!/usr/bin/env node
// THE MPFB KID ON THE UAL CLIPS (docs/KIDCHAR.md phase 2): models/characters/kidA.glb + kidA.json.
//
// The planned "ualBuild.mjs --mpfb" mode, built from models/characters/kid.glb instead of the raw UAL packs: those
// (data/raw/characters/ual1, ual2) are git-ignored and no longer on this disk, while kid.glb carries the SAME 33 clips
// already on the UAL rig (rotations exactly the packs', the pelvis translation x the kid's k; ualBuild.mjs --kid).
// So the result is what ualBuild.mjs --kid would give with kidA's skeleton:
//   - the UAL nodes put at A's joints (kidA_rig.json: tools/blender/kidGame.py T-posed his MPFB rig onto the UAL bone
//     directions, so the rest ORIENTATIONS stay the UAL's and only the offsets move: ualBuild's own formula);
//   - every clip's rotations unchanged; the pelvis translation x (k_A / k_kid) (k = his pelvis height / the UAL's);
//   - the inverse bind matrices of his rest; his three LODs (kidA_src.glb), each merged into ONE primitive with a _SLOT
//     attribute (the material slots), his UVs (one atlas: kidA_atlas.ktx2, loaded by viewer/kid/kidModel.js) and AO;
//   - kidA.json: kid.json's clip metadata with the distances (speeds, step positions) x the leg-length ratio, the rest
//     heights measured on his skeleton. (The stair clips were synthesised on the old kid's legs: their foot heights
//     follow the stair geometry, kept; re-synthesise with ualBuild when the raw packs are back.)
//     node tools/characters/kidABuild.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGLB, sampleAnim, worldPose, q, v } from "./gltfAnim.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CH = path.join(ROOT, "models/characters");
const g = readGLB(path.join(CH, "kid.glb"));
const meta = JSON.parse(fs.readFileSync(path.join(CH, "kid.json"), "utf8"));
const KR = JSON.parse(fs.readFileSync(path.join(CH, "kid_rig.json"), "utf8"));
const AR = JSON.parse(fs.readFileSync(path.join(CH, "kidA_rig.json"), "utf8"));
const S = readGLB(path.join(CH, "kidA_src.glb"));
const J = AR.joints;

// ---------------------------------------------------------------------------------------------- the joints
const W0 = worldPose(g, sampleAnim(g, null, 0));
const legLen = (W, s) => v.len(v.sub(W[g.byName.get(`thigh_${s}`)].p, W[g.byName.get(`calf_${s}`)].p)) + v.len(v.sub(W[g.byName.get(`calf_${s}`)].p, W[g.byName.get(`foot_${s}`)].p));
const leg0 = legLen(W0, "l");
let moved = 0;
for (const n of g.nodes) {
  if (!(n.name in J) || n.parent < 0) continue;
  const par = g.nodes[n.parent], P = W0[n.parent];
  const pp = par.name in J ? J[par.name] : P.p;
  n.t = v.mul(q.rot(q.inv(P.q), v.sub(J[n.name], pp)), 1 / P.s); moved++;
}
const W = worldPose(g, sampleAnim(g, null, 0));
let err = 0;
for (const n of g.nodes) if (n.name in J) err = Math.max(err, v.len(v.sub(W[n.i].p, J[n.name])));
if (err > 2e-4) throw new Error(`kidA rig: joints off by ${err} m`);
const missing = Object.keys(J).filter((n) => !g.byName.has(n));
if (missing.length) throw new Error("kidA joints not in the UAL rig: " + missing.join(", "));
const r = AR.pelvisScale / KR.pelvisScale, legA = legLen(W, "l"), rl = legA / leg0;
console.log(`kidA rig: ${moved} joints moved (max error ${(err * 1000).toFixed(3)} mm), pelvis x ${r.toFixed(4)} (k ${AR.pelvisScale} vs ${KR.pelvisScale}), leg ${legA.toFixed(4)} vs ${leg0.toFixed(4)} (x ${rl.toFixed(4)})`);

// ---------------------------------------------------------------------------------------------- output buffers
const chunks = [], accessors = [], bufferViews = [];
let off = 0;
function addAcc(arr, type, componentType, extra = {}, target) {
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) });
  chunks.push(buf); off += buf.length;
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
  accessors.push({ bufferView: bufferViews.length - 1, componentType, count: arr.length / n, type, ...extra });
  return accessors.length - 1;
}
const minmax = (a, N) => { const mn = Array(N).fill(Infinity), mx = Array(N).fill(-Infinity); for (let i = 0; i < a.length; i++) { const c = i % N; if (a[i] < mn[c]) mn[c] = a[i]; if (a[i] > mx[c]) mx[c] = a[i]; } return { min: mn, max: mx }; };

// ---------------------------------------------------------------------------------------------- the meshes (kidA_src.glb)
const skin = g.json.skins[0];
const ujoint = new Map(skin.joints.map((ni, k) => [g.nodes[ni].name, k]));
const SJ = S.json, sjoints = SJ.skins[0].joints.map((ni) => S.nodes[ni].name);
const jmap = sjoints.map((n) => { if (!ujoint.has(n)) throw new Error("kidA joint not in kid.glb's skin: " + n); return ujoint.get(n); });
const slots = SJ.materials.map((m) => m.name);
const lodNodes = SJ.nodes.filter((n) => n.mesh !== undefined).sort((a, b) => a.name.localeCompare(b.name));
const meshesOut = [];
for (const nd of lodNodes) {
  const prims = SJ.meshes[nd.mesh].primitives;
  let nv = 0, ni = 0;
  for (const p of prims) { nv += SJ.accessors[p.attributes.POSITION].count; ni += SJ.accessors[p.indices].count; }
  const POS = new Float32Array(nv * 3), NRM = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), JNT = new Uint8Array(nv * 4), WGT = new Float32Array(nv * 4), AO = new Uint8Array(nv * 4), SLOT = new Float32Array(nv);
  const IDX = nv < 65536 ? new Uint16Array(ni) : new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const p of prims) {
    const P = S.accessor(p.attributes.POSITION), Nn = S.accessor(p.attributes.NORMAL), T = S.accessor(p.attributes.TEXCOORD_0), Jt = S.accessor(p.attributes.JOINTS_0), Wt = S.accessor(p.attributes.WEIGHTS_0), I = S.accessor(p.indices);
    const Cc = p.attributes.COLOR_0 !== undefined ? S.accessor(p.attributes.COLOR_0) : null, cnt = P.length / 3, cn = Cc ? Cc.length / cnt : 0;
    POS.set(P, vo * 3); NRM.set(Nn, vo * 3); UV.set(T, vo * 2);
    for (let i = 0; i < cnt; i++) {
      let sw = 0; for (let k = 0; k < 4; k++) sw += Wt[i * 4 + k];
      for (let k = 0; k < 4; k++) { JNT[(vo + i) * 4 + k] = jmap[Jt[i * 4 + k]]; WGT[(vo + i) * 4 + k] = Wt[i * 4 + k] / (sw || 1); }
      const ao = Cc ? Cc[i * cn] : 1;
      for (let k = 0; k < 3; k++) AO[(vo + i) * 4 + k] = Math.round(Math.max(0, Math.min(1, ao)) * 255);
      AO[(vo + i) * 4 + 3] = 255; SLOT[vo + i] = p.material;
    }
    for (let i = 0; i < I.length; i++) IDX[io + i] = I[i] + vo;
    vo += cnt; io += I.length;
  }
  const attributes = {
    POSITION: addAcc(POS, "VEC3", 5126, minmax(POS, 3), 34962), NORMAL: addAcc(NRM, "VEC3", 5126, {}, 34962), TEXCOORD_0: addAcc(UV, "VEC2", 5126, {}, 34962),
    JOINTS_0: addAcc(JNT, "VEC4", 5121, {}, 34962), WEIGHTS_0: addAcc(WGT, "VEC4", 5126, {}, 34962), COLOR_0: addAcc(AO, "VEC4", 5121, { normalized: true }, 34962),
    _SLOT: addAcc(SLOT, "SCALAR", 5126, {}, 34962) };
  meshesOut.push({ name: nd.name, extras: { slots, tris: ni / 3 }, primitives: [{ attributes, indices: addAcc(IDX, "SCALAR", nv < 65536 ? 5123 : 5125, {}, 34963), material: 0 }] });
  console.log(`  ${nd.name}: ${nv} verts ${ni / 3} tris, ${prims.length} slots merged`);
}

// ---------------------------------------------------------------------------------------------- the inverse bind matrices (his rest)
const M = new Float32Array(skin.joints.length * 16);
skin.joints.forEach((ni, k) => {
  const { p, q: rq, s: sc } = W[ni], [x, y, z, w] = rq;
  const R = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  const o = k * 16;
  for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) M[o + col * 4 + row] = R[col * 3 + row] / sc;
  for (let row = 0; row < 3; row++) M[o + 12 + row] = -(R[0 * 3 + row] * p[0] + R[1 * 3 + row] * p[1] + R[2 * 3 + row] * p[2]) / sc;
  M[o + 15] = 1;
});
const aIbm = addAcc(M, "MAT4", 5126);

// ---------------------------------------------------------------------------------------------- the clips (kid.glb's, pelvis x r)
const PEL = g.byName.get("pelvis");
const animations = [];
for (const a of g.anims) {
  const samplers = [], channels = [];
  for (const ch of a.channels) {
    const input = addAcc(new Float32Array(ch.times), "SCALAR", 5126, { min: [ch.times[0]], max: [ch.times[ch.times.length - 1]] });
    let output;
    if (ch.path === "rotation") {
      const R16 = new Int16Array(ch.values.length);
      for (let i = 0; i < R16.length; i++) R16[i] = Math.round(Math.max(-1, Math.min(1, ch.values[i])) * 32767);
      output = addAcc(R16, "VEC4", 5122, { normalized: true });
    } else if (ch.path === "translation") {
      if (ch.node !== PEL) continue;
      const T = new Float32Array(ch.values); for (let i = 0; i < T.length; i++) T[i] *= r;
      output = addAcc(T, "VEC3", 5126);
    } else continue;
    samplers.push({ input, output, interpolation: ch.interp });
    channels.push({ sampler: samplers.length - 1, target: { node: ch.node, path: ch.path } });
  }
  animations.push({ name: a.name, samplers, channels });
}

// ---------------------------------------------------------------------------------------------- nodes + write
const nodes = g.json.nodes.map((nd, i) => {
  const o = { name: nd.name };
  for (const k of ["children", "translation", "rotation", "scale", "skin", "mesh"]) if (nd[k] !== undefined) o[k] = nd[k];
  if (g.nodes[i].name in J) o.translation = g.nodes[i].t;
  return o;
});
// the LOD nodes: kid.glb's kid_LOD0..2 point at the new meshes (same names, same order)
for (let l = 0; l < meshesOut.length; l++) {
  const ni = nodes.findIndex((n) => n.name === meshesOut[l].name);
  if (ni < 0) throw new Error("kid.glb has no node " + meshesOut[l].name);
  nodes[ni].mesh = l;
}
const json = {
  asset: { version: "2.0", generator: "uccle-city tools/characters/kidABuild.mjs", copyright: "the kid A: MakeHuman MPFB (CC0 assets) by tools/blender/kidMakeHuman.py --game, on the Quaternius Universal Animation Library 1 + 2 rig and clips (Standard, CC0 1.0)" },
  scene: 0, scenes: g.json.scenes, nodes, meshes: meshesOut,
  materials: [{ name: "kidA", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.7 } }],
  skins: [{ joints: skin.joints, inverseBindMatrices: aIbm, ...(skin.skeleton !== undefined ? { skeleton: skin.skeleton } : {}) }],
  animations, accessors, bufferViews, buffers: [{ byteLength: off }],
};
const pad = (b, c) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, c)]);
const jb = pad(Buffer.from(JSON.stringify(json), "utf8"), 0x20), bb = pad(Buffer.concat(chunks), 0);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bb.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jb.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bb.length, 0); bh.writeUInt32LE(0x004e4942, 4);
const OUT = path.join(CH, "kidA.glb");
fs.writeFileSync(OUT, Buffer.concat([head, jh, jb, bh, bb]));

// ---------------------------------------------------------------------------------------------- kidA.json
const B = (n) => W[g.byName.get(n)].p;
const rest = { hipY: B("pelvis")[1], ankleY: (B("foot_l")[1] + B("foot_r")[1]) / 2, ballY: (B("ball_l")[1] + B("ball_r")[1]) / 2, leg: legA };
const sc = (x) => (typeof x === "number" ? +(x * rl).toFixed(4) : x);
const clips = {};
for (const [name, c] of Object.entries(meta.clips)) {
  const o = { ...c, file: "kidA.glb" };
  if (typeof c.speed === "number") o.speed = +(c.speed * rl).toFixed(4);
  // stepPos: [t, x, z, y] per step: the positions scale with the legs, the times stay
  if (c.stepPos) o.stepPos = c.stepPos.map((side) => side.map(([t, ...p]) => [t, ...p.map(sc)]));
  clips[name] = o;
}
fs.writeFileSync(path.join(CH, "kidA.json"), JSON.stringify({ model: "kidA.glb", fps: meta.fps, rest: Object.fromEntries(Object.entries(rest).map(([k, x]) => [k, +x.toFixed(4)])),
  kid: { height: AR.height, pelvisScale: AR.pelvisScale, slots, tris: meshesOut.map((m) => m.extras.tris), atlas: AR.atlas, sole: AR.sole, legScale: +rl.toFixed(4), source: "kidA" }, clips }, null, 1));
console.log(`wrote models/characters/kidA.glb (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB: ${meshesOut.map((m) => `${m.name} ${m.extras.tris}`).join(" / ")}, ${animations.length} clips) + kidA.json (rest ${JSON.stringify(rest)})`);
