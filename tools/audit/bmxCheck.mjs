#!/usr/bin/env node
// GATE ROW "bmx" (docs/BMX.md): the kid's BMX asset (models/bike/bmx.glb from tools/blender/bmx.py + tools/bike/bmx_pack.mjs)
// is what the game's rig expects, offline, in seconds:
//   - the moving nodes (Body, Steer, Wheel_F, Wheel_R, Cog, Crank, Pedal_L, Pedal_R) and the rider / contact empties
//     exist, under the right parents, with no scale (rotation only where the rig needs it: Steer's axis)
//   - the pivots are sane: the wheels' axles on the lab's wheelbase (0.95 m) and radius (0.254 m: the tyre's farthest
//     point), the steering axis 74 deg (16 from vertical) passing 28 mm behind the front axle, the crank at the BB with
//     both pedals 175 mm out and opposite, the cog on the rear axle, grips / pegs / feet mirror images, the contacts on
//     the ground under the axles, the seat over the post
//   - every node has its three LOD meshes; triangle budgets per LOD (owner 2026-11-18: LOD0 ~12-15k)
//   - materials are the named slots only; the spoke cards BLENDED + double sided with a KTX2 (QUALITY_RULES 23: no
//     sub-pixel spoke geometry on the player's bike), the chain alpha-tested with a KTX2, both files present
//   - the mesh audit (tools/mesh_audit) of each LOD as drawn: 0 blocking
//     node tools/audit/bmxCheck.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imp = (p) => import(pathToFileURL(path.resolve(root, p)).href);
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const { auditParts } = await imp("tools/mesh_audit/audit.js");
const QUIET = process.argv.includes("--quiet");
const DIR = path.join(root, "models", "bike");
const BUDGET = [16000, 8500, 2000];
const SLOTS = ["bmx_paint", "bmx_chrome", "bmx_metal", "bmx_black", "bmx_rubber", "bmx_grip", "bmx_saddle", "bmx_pad", "bmx_cable", "bmx_chain", "bmx_spokes"];
const PARENT = { Body: "BMX", Steer: "Body", Wheel_F: "Steer", Wheel_R: "Body", Cog: "Body", Crank: "Body", Pedal_L: "Crank", Pedal_R: "Crank",
  Grip_L: "Steer", Grip_R: "Steer", Peg_FL: "Steer", Peg_FR: "Steer", Peg_RL: "Body", Peg_RR: "Body", Seat: "Body", Foot_L: "Pedal_L", Foot_R: "Pedal_R",
  Contact_F: "Body", Contact_R: "Body" };
const MOVING = ["Body", "Steer", "Wheel_F", "Wheel_R", "Cog", "Crank", "Pedal_L", "Pedal_R"];

const fails = [], notes = [];
const check = (ok, what) => { (ok ? notes : fails).push(what); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const glbPath = path.join(DIR, "bmx.glb");
if (!fs.existsSync(glbPath)) { console.error("bmx: models/bike/bmx.glb missing"); process.exit(1); }
const { json: J, parts } = await readGlb(glbPath);

// ---- hierarchy + world matrices
const byName = new Map(J.nodes.map((n, i) => [n.name, i]));
const parentOf = new Map();
J.nodes.forEach((n, i) => (n.children || []).forEach((c) => parentOf.set(c, i)));
const mul = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const local = (nd) => {
  const [tx, ty, tz] = nd.translation || [0, 0, 0], [qx, qy, qz, qw] = nd.rotation || [0, 0, 0, 1], [sx, sy, sz] = nd.scale || [1, 1, 1];
  return [(1 - 2 * (qy * qy + qz * qz)) * sx, 2 * (qx * qy + qz * qw) * sx, 2 * (qx * qz - qy * qw) * sx, 0,
    2 * (qx * qy - qz * qw) * sy, (1 - 2 * (qx * qx + qz * qz)) * sy, 2 * (qy * qz + qx * qw) * sy, 0,
    2 * (qx * qz + qy * qw) * sz, 2 * (qy * qz - qx * qw) * sz, (1 - 2 * (qx * qx + qy * qy)) * sz, 0, tx, ty, tz, 1];
};
const world = (i) => { const p = parentOf.get(i); return p == null ? local(J.nodes[i]) : mul(world(p), local(J.nodes[i])); };
const W = (name) => world(byName.get(name));
const pos = (name) => W(name).slice(12, 15);
const axisY = (name) => { const m = W(name), l = Math.hypot(m[4], m[5], m[6]); return [m[4] / l, m[5] / l, m[6] / l]; };

for (const [n, p] of Object.entries(PARENT)) {
  if (!byName.has(n)) { check(false, `node ${n} missing`); continue; }
  const pi = parentOf.get(byName.get(n));
  check(pi != null && J.nodes[pi].name === p, `${n} under ${p} (is ${pi != null ? J.nodes[pi].name : "root"})`);
}
for (const nd of J.nodes) {
  if (nd.matrix) check(false, `${nd.name}: a matrix (expected TRS)`);
  if (nd.scale) check(nd.scale.every((s) => near(s, 1, 1e-5)), `${nd.name}: no scale (${nd.scale})`);
  if (nd.rotation && !["Steer", "Wheel_F"].includes(nd.name) && !/^(Grip|Peg_F)/.test(nd.name)) check(nd.rotation.slice(0, 3).every((q) => Math.abs(q) < 1e-5), `${nd.name}: no rotation (only Steer's axis)`);
}
if (!fails.length) {
  const wf = pos("Wheel_F"), wr = pos("Wheel_R");
  check(near(wf[2] - wr[2], 0.95, 0.004) && near(wf[0], 0, 1e-4) && near(wr[0], 0, 1e-4), `wheelbase ${(wf[2] - wr[2]).toFixed(4)} m (0.95)`);
  check(near(wf[1], 0.254, 0.002) && near(wr[1], 0.254, 0.002), `axle heights ${wf[1].toFixed(4)} / ${wr[1].toFixed(4)} (0.254)`);
  const fw = W("Wheel_F"); check(near(Math.hypot(fw[0], fw[1], fw[2]), 1, 1e-4) && near(fw[0], 1, 1e-4), "Wheel_F world-aligned at rest (spins about +X)");
  const ax = axisY("Steer"), tilt = Math.acos(ax[1]) * 180 / Math.PI;
  check(near(tilt, 16, 0.3) && ax[2] < 0 && near(ax[0], 0, 1e-4), `steering axis ${tilt.toFixed(2)} deg from vertical, leaning back (head angle 74)`);
  // the axle's distance from the steering axis line (the fork offset), the axle ahead of it
  const sp = pos("Steer"), d = [wf[0] - sp[0], wf[1] - sp[1], wf[2] - sp[2]], t = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2];
  const perp = [d[0] - ax[0] * t, d[1] - ax[1] * t, d[2] - ax[2] * t], off = Math.hypot(...perp);
  check(near(off, 0.028, 0.002) && perp[2] > 0, `fork offset ${(off * 1000).toFixed(1)} mm ahead of the axis (28)`);
  const cr = pos("Crank"); check(near(cr[1], 0.29, 0.003) && near(cr[0], 0, 1e-4), `bottom bracket ${cr[1].toFixed(3)} m high`);
  const pl = pos("Pedal_L"), pr = pos("Pedal_R");
  const rl = Math.hypot(pl[1] - cr[1], pl[2] - cr[2]), rr = Math.hypot(pr[1] - cr[1], pr[2] - cr[2]);
  check(near(rl, 0.175, 0.002) && near(rr, 0.175, 0.002), `crank length ${rl.toFixed(3)} / ${rr.toFixed(3)} (0.175)`);
  check(near(pl[2] - cr[2], -(pr[2] - cr[2]), 1e-3) && pl[0] > 0.09 && pr[0] < -0.09 && near(pl[0], -pr[0], 1e-3), "pedals opposite, left on +x, right on -x, mirrored");
  const cg = pos("Cog"); check(near(Math.hypot(cg[0] - wr[0], cg[1] - wr[1], cg[2] - wr[2]), 0, 1e-4), "Cog pivot on the rear axle");
  const pair = (a, b, what) => { const A = pos(a), B = pos(b); check(near(A[0], -B[0], 1e-3) && near(A[1], B[1], 1e-3) && near(A[2], B[2], 1e-3) && A[0] > 0, `${what} mirrored (${A.map((v) => v.toFixed(3))})`); };
  pair("Grip_L", "Grip_R", "grips"); pair("Peg_FL", "Peg_FR", "front pegs"); pair("Peg_RL", "Peg_RR", "rear pegs");
  { const A = pos("Foot_L"), B = pos("Foot_R"); check(near(A[0], -B[0], 1e-3) && near(A[1], B[1], 1e-3) && near(A[2] - cr[2], -(B[2] - cr[2]), 1e-3) && near(A[1], cr[1] + 0.0105, 2e-3), `feet on the pedals' tops, opposite (${A.map((v) => v.toFixed(3))})`); }
  const gl = pos("Grip_L"); check(near(gl[0], 0.30, 0.04) && gl[1] > 0.85 && gl[1] < 1.05, `grip height ${gl[1].toFixed(3)} m, half width ${gl[0].toFixed(3)}`);
  const cf = pos("Contact_F"), cR = pos("Contact_R");
  check(near(cf[1], 0, 1e-4) && near(cR[1], 0, 1e-4) && near(cf[2], wf[2], 1e-3) && near(cR[2], wr[2], 1e-3), "contacts on the ground under the axles");
  const st = pos("Seat"); check(st[1] > 0.65 && st[1] < 0.8 && st[2] < cr[2], `seat top ${st[1].toFixed(3)} m, behind the BB`);
  // the tyres reach the wheel radius (their farthest point from the axle)
  for (const [w, c] of [["Wheel_F", wf], ["Wheel_R", wr]]) {
    let m = 0; for (const p of parts.filter((q) => q.node === `${w}_LOD0`)) for (let i = 0; i < p.positions.length; i += 3) m = Math.max(m, Math.hypot(p.positions[i + 1] - c[1], p.positions[i + 2] - c[2]));
    check(near(m, 0.254, 0.0025), `${w} tyre radius ${m.toFixed(4)} (0.254)`);
  }
}

// ---- LOD meshes + budgets
const tris = [0, 0, 0];
for (const n of MOVING) for (let k = 0; k < 3; k++) {
  const i = byName.get(`${n}_LOD${k}`);
  check(i != null && J.nodes[i].mesh != null && J.nodes[J.nodes.indexOf(J.nodes[parentOf.get(i)])]?.name === n, `${n}_LOD${k} mesh under ${n}`);
}
for (const p of parts) { const k = +(p.node.match(/_LOD(\d)$/) || [])[1]; if (k >= 0) tris[k] += p.index.length / 3; }
for (let k = 0; k < 3; k++) check(tris[k] > 0 && tris[k] <= BUDGET[k], `LOD${k} ${tris[k]} triangles (<= ${BUDGET[k]})`);

// ---- materials + textures
for (const m of J.materials) check(SLOTS.includes(m.name), `material ${m.name} is a named slot`);
const mat = (n) => J.materials.find((m) => m.name === n);
const tex = (m) => { const t = J.textures?.[m?.pbrMetallicRoughness?.baseColorTexture?.index]; return t ? J.images[t.extensions?.KHR_texture_basisu?.source]?.uri : null; };
const sp = mat("bmx_spokes"), ch = mat("bmx_chain");
check(sp && sp.alphaMode === "BLEND" && sp.doubleSided && /\.ktx2$/.test(tex(sp) || ""), "spoke cards: BLEND, double sided, KTX2 (pre-filtered, rule 23)");
check(ch && ch.alphaMode === "MASK" && /\.ktx2$/.test(tex(ch) || ""), "chain: alpha MASK, KTX2");
for (const m of [sp, ch]) if (tex(m)) check(fs.existsSync(path.join(DIR, tex(m))), `${tex(m)} present`);
check(!!mat("bmx_paint")?.extensions?.KHR_materials_clearcoat, "frame paint: clear coat");
check(J.extensionsRequired?.includes("EXT_meshopt_compression"), "meshopt compressed");

// ---- mesh audit of each LOD as drawn
for (let k = 0; k < 3; k++) {
  const ps = parts.filter((p) => p.node.endsWith(`_LOD${k}`)).map((p) => ({ name: p.node, slot: p.slot, positions: p.positions, normals: p.normals, index: p.index, maxDistance: [12, 40, 150][k] }));
  const rep = auditParts(ps, { ignoreBelow: 0.002, maxItemsPerCheck: 50 });
  check(rep.summary.blocking === 0, `mesh audit LOD${k}: ${rep.summary.blocking} blocking`);
}

if (!QUIET || fails.length) for (const n of notes) console.log("  ok  ", n);
for (const f of fails) console.log("  FAIL", f);
console.log(`bmx: ${fails.length ? "FAIL" : "PASS"} (${notes.length} checks ok, ${fails.length} failed; tris ${tris.join(" / ")})`);
process.exit(fails.length ? 1 : 0);
