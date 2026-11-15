#!/usr/bin/env node
// PACK A TWO-WHEELER (motorbike round 2, docs/MOTO.md): the Blender raw GLB (tools/blender/motorbike.py, scooter.py,
// villo_ride.py: one node per rig piece, one primitive per material slot, the AO per vertex in COLOR_0) ->
// models/<kind>/<kind>.glb, what the viewer loads (round 1 loaded the raw GLB and made the LODs at load):
//   <Node>_lod0..2   the player's rig, ONE primitive per node (round 1: one per node x slot = 41 meshes): every slot merged,
//                    the slot + AO in one float attribute "_SLOT" (viewer/moto/twoWheelSlots.js: index + 0.01 + 0.97 AO).
//                    LOD0 = the Blender mesh welded; LOD1 2.5 mm / LOD2 1.1 cm by meshoptimizer (viewer/moto/motoLod.js);
//                    the WHEELS: LOD1 at 1.5 mm, LOD2 = the solid-disc stand-ins Wheel_*_far (round 1's audit: spokes
//                    and disc carriers collapsed onto each other at LOD2)
//   parked_lod1..3   (motorbike, scooter) the whole bike without its rider, standing as parked (the motorbike on its
//                    side stand, leaning, the bar turned; the scooter on its centre stand), wheels at rest: the city's
//                    parked two-wheelers (viewer/moto/cityTwoWheelers.js), one instanced draw per LOD
//   (parked_* / ridden_* go to models/<kind>/<kind>_city.glb: the city loads only those, the ride loads <kind>.glb)
//   ridden_lod1..3   the bike + its rider (the arms posed onto the grips by the viewer's two-bone IK) for the traffic;
//                    "_WHEEL" (VEC4: axle y, axle z, 1 front / 2 rear / 0 body, 0) lets the shader roll the wheels
// No UVs (the materials use none), EXT_meshopt_compression + KHR_mesh_quantization (round 1: 4.9 MB uncompressed).
//     node tools/moto/pack.mjs moto|scooter|villo [--audit]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const imp = (p) => import(pathToFileURL(path.resolve(root, p)).href);
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const { MeshoptSimplifier } = await imp("tools/worker/node_modules/meshoptimizer/meshopt_simplifier.js");
const { MeshoptEncoder } = await imp("tools/worker/node_modules/meshoptimizer/meshopt_encoder.js");
const { weld, lodPart } = await imp("viewer/moto/motoLod.js");
const { SLOT_INDEX, KINDS, packSlot } = await imp("viewer/moto/twoWheelSlots.js");
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;

const KIND = process.argv[2] || "moto";
const K = KINDS[KIND];
if (!K) throw new Error(`kind ${KIND}?`);
const DIR = path.join(root, "models", K.dir);
const SRC = path.join(DIR, `${KIND}.raw.glb`), DST = path.join(DIR, `${KIND}.glb`);
const info = JSON.parse(fs.readFileSync(path.join(DIR, `${KIND}.json`)));
const { parts } = await readGlb(SRC);

// LOD errors (m): the rig (LOD0 = as made), the city's parked / ridden pools (their LOD1..3)
const RIG = [0, 0.0025, 0.011], CITY = [0.004, 0.012, 0.035], WHEEL1 = 0.0015;

// ------------------------------------------------------------------------------------------------ parts per node
const byNode = new Map();
for (const p of parts) {
  const slot = SLOT_INDEX[`${KIND}/${p.slot}`];
  if (slot === undefined) throw new Error(`${KIND}: slot ${p.slot} not in viewer/moto/twoWheelSlots.js`);
  (byNode.get(p.node) || byNode.set(p.node, []).get(p.node)).push({ ...p, slotIdx: slot });
}
/** the node's slots welded (in WORLD = the bike frame; t subtracted for the rig's node-local frame) */
const welded = new Map();
function weldedOf(node) {
  if (welded.has(node)) return welded.get(node);
  const list = (byNode.get(node) || []).map((p) => ({ slot: p.slotIdx, w: weld({ P: p.positions, N: p.normals, A: p.ao, I: p.index ?? Uint32Array.from({ length: p.positions.length / 3 }, (_, i) => i) }) }));
  welded.set(node, list);
  return list;
}
const nodeT = (node) => byNode.get(node)?.[0]?.nodeT ?? [0, 0, 0];
/** one LOD of a node: [{ P, N, A, I, slot }] (world frame) */
function lodOf(node, err) {
  return weldedOf(node).map(({ slot, w }) => ({ ...lodPart(w, err, MeshoptSimplifier), slot }));
}
/** merge pieces into one primitive (positions moved by -t; optional transform f(P, N) per piece; wheel tags) */
function merge(pieces) {
  let nv = 0, ni = 0;
  for (const q of pieces) { nv += q.P.length / 3; ni += q.I.length; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), S = new Float32Array(nv), I = new Uint32Array(ni);
  const W = pieces.some((q) => q.wheel) ? new Float32Array(nv * 4) : null;
  let v = 0, i = 0;
  for (const q of pieces) {
    const n = q.P.length / 3;
    P.set(q.P, v * 3); N.set(q.N, v * 3);
    for (let k = 0; k < n; k++) S[v + k] = packSlot(q.slot, q.A ? q.A[k] : 1);
    if (W && q.wheel) for (let k = 0; k < n; k++) { W[(v + k) * 4] = q.wheel[0]; W[(v + k) * 4 + 1] = q.wheel[1]; W[(v + k) * 4 + 2] = q.wheel[2]; }
    for (let k = 0; k < q.I.length; k++) I[i + k] = q.I[k] + v;
    v += n; i += q.I.length;
  }
  return { P, N, S, I, W };
}
const moved = (q, t) => { const P = new Float32Array(q.P); for (let k = 0; k < P.length; k += 3) { P[k] -= t[0]; P[k + 1] -= t[1]; P[k + 2] -= t[2]; } return { ...q, P }; };

// ------------------------------------------------------------------------------------------------ small rotations
/** rotate points and normals of a piece about an axis (unit) through c by angle a (Rodrigues) */
function rotate(q, axis, c, a) {
  const [ux, uy, uz] = axis, cs = Math.cos(a), sn = Math.sin(a), t = 1 - cs;
  const R = [cs + ux * ux * t, ux * uy * t - uz * sn, ux * uz * t + uy * sn, uy * ux * t + uz * sn, cs + uy * uy * t, uy * uz * t - ux * sn, uz * ux * t - uy * sn, uz * uy * t + ux * sn, cs + uz * uz * t];
  const P = new Float32Array(q.P.length), N = new Float32Array(q.N.length);
  for (let k = 0; k < P.length; k += 3) {
    const x = q.P[k] - c[0], y = q.P[k + 1] - c[1], z = q.P[k + 2] - c[2];
    P[k] = R[0] * x + R[1] * y + R[2] * z + c[0]; P[k + 1] = R[3] * x + R[4] * y + R[5] * z + c[1]; P[k + 2] = R[6] * x + R[7] * y + R[8] * z + c[2];
    const a2 = q.N[k], b = q.N[k + 1], d = q.N[k + 2];
    N[k] = R[0] * a2 + R[1] * b + R[2] * d; N[k + 1] = R[3] * a2 + R[4] * b + R[5] * d; N[k + 2] = R[6] * a2 + R[7] * b + R[8] * d;
  }
  return { ...q, P, N };
}
/** a piece built along +Z from its joint at the origin, placed from S to E (the minimal rotation Z -> E - S) */
function placeSegment(q, S, E) {
  let dx = E[0] - S[0], dy = E[1] - S[1], dz = E[2] - S[2];
  const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  let ax = -dy, ay = dx, az = 0;                  // Z x d
  const s = Math.hypot(ax, ay), a = Math.atan2(s, dz);
  const r = s > 1e-9 ? rotate(q, [ax / s, ay / s, az], [0, 0, 0], a) : dz < 0 ? rotate(q, [1, 0, 0], [0, 0, 0], Math.PI) : q;
  return moved(r, [-S[0], -S[1], -S[2]]);
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return scl(a, 1 / l); };
const rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];

/** the arms posed onto the grips (motoModel.js solveArm at rest: torso tilted by torsoRest about the hip) */
function posedArms(err) {
  const R = info.rider, hip = R.hip, out = [];
  for (const side of ["L", "R"]) {
    const S = add(rotX(sub(R.shoulder[side], hip), K.torsoRest), hip), G = R.grip[side];
    let D = sub(G, S); const dl = Math.hypot(...D);
    const a = R.upper, b = R.fore, d = Math.min(dl, a + b - 1e-3); D = scl(D, 1 / dl);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    let Pv = [side === "L" ? R.elbowOut : -R.elbowOut, -1, -0.2]; Pv = norm(sub(Pv, scl(D, dot(Pv, D))));
    const E = add(add(S, scl(D, x)), scl(Pv, h));
    for (const q of lodOf(`ArmU_${side}`, err)) out.push(placeSegment(q, S, E));
    for (const q of lodOf(`ArmF_${side}`, err)) out.push(placeSegment(q, E, G));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ build
const out = [];      // { name, prim }
const tris = {};
const hasFar = byNode.has("Wheel_F_far");
for (const node of K.nodes) {
  if (!byNode.has(node)) throw new Error(`${KIND}: node ${node} missing in ${SRC}`);
  for (let k = 0; k < 3; k++) {
    const wheel = /^Wheel_[FR]$/.test(node);
    const src = wheel && k === 2 && hasFar ? `${node}_far` : node;
    const err = wheel && k === 1 ? WHEEL1 : wheel && k === 2 ? 0 : RIG[k];
    const prim = merge(lodOf(src, err).map((q) => moved(q, nodeT(node))));
    out.push({ name: `${node}_lod${k}`, prim });
    (tris[node] ||= [0, 0, 0])[k] = prim.I.length / 3;
  }
}
if (KIND !== "villo") {
  const steerAxis = info.steer.axis, pivot = info.steer.pivot;
  const wf = info.wheels.F.pos, wr = info.wheels.R.pos;
  for (let k = 0; k < 3; k++) {
    const err = CITY[k], far = k >= 1 && hasFar;
    const wheelF = lodOf(far ? "Wheel_F_far" : "Wheel_F", far ? 0 : err), wheelR = lodOf(far ? "Wheel_R_far" : "Wheel_R", far ? 0 : err);
    // ---- parked: the bar turned, leaning on the side stand (the motorbike), lowest tyre point 8 mm into the ground
    {
      const front = [...lodOf("Steer", err), ...wheelF].map((q) => rotate(q, steerAxis, pivot, K.parkSteer));
      let all = [...lodOf("Body", err), ...front, ...wheelR];
      if (K.parkLean) all = all.map((q) => rotate(q, [0, 0, 1], [0, 0, 0], -K.parkLean));   // (top to +x = the bike's left)
      // the ground: the lowest point of the tyres (and anything else that would sink)
      let low = Infinity;
      for (const q of all) for (let i = 1; i < q.P.length; i += 3) low = Math.min(low, q.P[i]);
      all = all.map((q) => moved(q, [0, low + 0.008, 0]));
      const prim = merge(all);
      out.push({ name: `parked_lod${k + 1}`, prim });
      tris[`parked`] ||= []; tris.parked[k] = prim.I.length / 3;
    }
    // ---- ridden: upright, bar straight, the rider at rest, arms on the grips; wheels tagged for the roll
    {
      const torso = lodOf("RiderTorso", err).map((q) => rotate(q, [1, 0, 0], info.rider.hip, -K.torsoRest));
      const tag = (list, c, f) => list.map((q) => ({ ...q, wheel: [c[1], c[2], f] }));
      const all = [...lodOf("Body", err), ...lodOf("Steer", err), ...tag(wheelF, wf, 1), ...tag(wheelR, wr, 2), ...lodOf("RiderLegs", err), ...torso, ...posedArms(err)];
      const prim = merge(all);
      out.push({ name: `ridden_lod${k + 1}`, prim });
      tris[`ridden`] ||= []; tris.ridden[k] = prim.I.length / 3;
    }
  }
}
console.log(`${KIND}: tris`, JSON.stringify(tris));

// ------------------------------------------------------------------------------------------------ write the GLBs (park_kit_pack.mjs's writer)
// <kind>.glb: the rig (the ridden vehicle); <kind>_city.glb: parked_* / ridden_* (the city's pools load only these)
function writeGlb(list, dst) {
  const chunks = []; let off = 0, rawBytes = 0;
  const G = { asset: { version: "2.0", generator: `uccle-city tools/moto/pack.mjs (${KIND})` }, extensionsUsed: ["EXT_meshopt_compression", "KHR_mesh_quantization"],
    extensionsRequired: ["EXT_meshopt_compression", "KHR_mesh_quantization"], scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [],
    materials: [{ name: "twowheel", pbrMetallicRoughness: { baseColorFactor: [0.6, 0.6, 0.6, 1], metallicFactor: 0, roughnessFactor: 0.8 } }], accessors: [], bufferViews: [], buffers: [] };
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
  for (const { name, prim: m } of list) {
    const nv = m.P.length / 3;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const Pq = MeshoptEncoder.encodeFilterExp(m.P, nv, 12, 16, "SharedComponent");
    const dv = new DataView(Pq.buffer, Pq.byteOffset, Pq.byteLength);
    for (let i = 0; i < nv * 3; i++) { const w = dv.getUint32(i * 4, true), e = (w >> 24) << 24 >> 24, mant = (w << 8) >> 8, v = Math.fround(mant * Math.pow(2, e)); mn[i % 3] = Math.min(mn[i % 3], v); mx[i % 3] = Math.max(mx[i % 3], v); }
    const attributes = { POSITION: accessor(view(Pq, nv, 12, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "VEC3", 5126, false, [mn, mx]) };
    const N4 = new Float32Array(nv * 4); for (let i = 0; i < nv; i++) { N4[i * 4] = m.N[i * 3]; N4[i * 4 + 1] = m.N[i * 3 + 1]; N4[i * 4 + 2] = m.N[i * 3 + 2]; }
    attributes.NORMAL = accessor(view(MeshoptEncoder.encodeFilterOct(N4, nv, 4, 8), nv, 4, "ATTRIBUTES", "OCTAHEDRAL", 34962), nv, "VEC3", 5120, true);
    attributes._SLOT = accessor(view(MeshoptEncoder.encodeFilterExp(m.S, nv, 4, 12, "Separate"), nv, 4, "ATTRIBUTES", "EXPONENTIAL", 34962), nv, "SCALAR", 5126);
    if (m.W) attributes._WHEEL = accessor(view(u8(m.W), nv, 16, "ATTRIBUTES", null, 34962), nv, "VEC4", 5126);
    const big = nv >= 65536, I = big ? Uint32Array.from(m.I) : Uint16Array.from(m.I);
    const indices = accessor(view(u8(I), I.length, big ? 4 : 2, "TRIANGLES", null, 34963), I.length, "SCALAR", big ? 5125 : 5123);
    G.meshes.push({ name, primitives: [{ attributes, indices, material: 0 }] });
    G.nodes.push({ name, mesh: G.meshes.length - 1 });
    G.scenes[0].nodes.push(G.nodes.length - 1);
  }
  const binBuf = Buffer.concat(chunks), binPad = Buffer.alloc((4 - (binBuf.length % 4)) % 4);
  G.buffers.push({ byteLength: binBuf.length + binPad.length }, { byteLength: rawBytes, extensions: { EXT_meshopt_compression: { fallback: true } } });
  let js = Buffer.from(JSON.stringify(G)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length + binPad.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length + binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(dst, Buffer.concat([head, jh, js, bh, binBuf, binPad]));
  console.log(`wrote ${path.relative(root, dst)} ${(fs.statSync(dst).size / 1048576).toFixed(2)} MB (decoded ${(rawBytes / 1048576).toFixed(2)} MB)`);
  return fs.statSync(dst).size;
}
const CITY_DST = path.join(DIR, `${KIND}_city.glb`);
const isCity = (o) => /^(parked|ridden)_/.test(o.name);
const bytesRig = writeGlb(out.filter((o) => !isCity(o)), DST);
const bytesCity = out.some(isCity) ? writeGlb(out.filter(isCity), CITY_DST) : 0;
console.log(`raw ${(fs.statSync(SRC).size / 1048576).toFixed(2)} MB`);

info.pack = { file: `${KIND}.glb`, bytes: bytesRig, city: bytesCity ? `${KIND}_city.glb` : null, cityBytes: bytesCity, rigLodErrors: RIG, cityLodErrors: CITY, wheelLod1: WHEEL1, tris,
  note: "tools/moto/pack.mjs: <Node>_lod0..2 (rig), parked_lod1..3 / ridden_lod1..3 (city); attribute _SLOT = slot index + 0.01 + 0.97 AO (viewer/moto/twoWheelSlots.js)" };

// ------------------------------------------------------------------------------------------------ mesh audit of what is drawn (optional)
if (process.argv.includes("--audit")) {
  const { auditParts } = await imp("tools/mesh_audit/audit.js");
  const POSE = /^(Arm|Thigh|Shin|Pedal|Cranks)/;
  const groups = [];
  for (let k = 0; k < 3; k++) groups.push([`rig_lod${k}`, out.filter((o) => o.name.endsWith(`_lod${k}`) && !POSE.test(o.name) && !/^(parked|ridden)/.test(o.name)), [22, 70, 250][k]]);
  for (let k = 1; k <= 3; k++) for (const n of ["parked", "ridden"]) { const o = out.find((q) => q.name === `${n}_lod${k}`); if (o) groups.push([o.name, [o], [25, 80, 220][k - 1]]); }
  info.pack.audit = {};
  for (const [g, list, range] of groups) {
    const aps = [];
    for (const o of list) {
      // (the rig's node-local pieces back into the bike frame for the audit)
      const t = nodeT(o.name.replace(/_lod\d$/, ""));
      const byS = new Map();
      for (let t3 = 0; t3 < o.prim.I.length; t3 += 3) { const s = Math.floor(o.prim.S[o.prim.I[t3]] + 0.002); (byS.get(s) || byS.set(s, []).get(s)).push(o.prim.I[t3], o.prim.I[t3 + 1], o.prim.I[t3 + 2]); }
      const P = new Float32Array(o.prim.P); if (!/^(parked|ridden)/.test(o.name)) for (let i = 0; i < P.length; i += 3) { P[i] += t[0]; P[i + 1] += t[1]; P[i + 2] += t[2]; }
      for (const [s, I] of byS) aps.push({ name: `${o.name}/${s}`, slot: String(s), positions: P, normals: o.prim.N, index: Uint32Array.from(I), maxDistance: range });
    }
    const rep = auditParts(aps, { ignoreBelow: 0.002, maxItemsPerCheck: 6000 });
    info.pack.audit[g] = rep.summary.blocking;
    console.log(`audit ${g}: blocking ${rep.summary.blocking} ${Object.entries(rep.summary.counts).filter(([, v]) => v).map(([n, v]) => `${n} ${v}`).join(", ")}`);
  }
}
fs.writeFileSync(path.join(DIR, `${KIND}.json`), JSON.stringify(info, null, 1));
