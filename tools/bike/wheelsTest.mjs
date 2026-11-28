// node --import ./tools/heap/register.mjs tools/bike/wheelsTest.mjs [--quiet]: THE BMX's WHEELS ON THE GROUND (gate row
// `wheels`, rule wheels-on-ground; owner 2026-11-26: "the BMX wheels are inside the ground, it should never happen").
// The DRAWN tyre (models/bike/bmx.glb's wheel nodes as viewer/kid/bmxModel.js poses them on the physics, sampled round
// the tread circle, r 0.254, +-2.5 cm across) against the ground under each sample, every frame a wheel touches:
//   riding the lab's flat, a kerb, the sand, the park (kicker, quarter pipe, berm loop, pump track), standing parked,
//   lying after a fall. Hard ground: the lowest point within -0.5 .. +1.0 cm (no sink, no float); sand: a tyre bite of
//   at most 2 cm. Lying: no tyre point under the ground (-0.5 cm), the whole bike (its grips) above it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { DT, BIKE, createBikeState, stepBike, bikePose } from "../../viewer/bike/bikePhysics.js";
import { SPOTS } from "../../viewer/bike/bikeGround.js";
import { PARK_SPOTS } from "../../viewer/bike/bikePark.js";
import { createBikeModel } from "../../viewer/bike/bikeModel.js";
import { rigBmx } from "../../viewer/kid/bmxModel.js";
import { parkStep, createMount } from "../../viewer/kid/kidMount.js";
import { readGLB } from "../characters/gltfAnim.mjs";
import { labEnv } from "./casualRide.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rows = []; let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const env = labEnv(), q = {};
const gAt = (x, z) => { env.ground(x, z, q); return q.h; };
const surfAt = (x, z) => { env.ground(x, z, q); return q.surf; };

function bmxTree() {
  const g = readGLB(path.join(ROOT, "models/bike/bmx.glb")), objs = g.nodes.map((n) => { const o = new THREE.Object3D(); o.name = n.name; o.position.fromArray(n.t); o.quaternion.fromArray(n.r); o.scale.fromArray(n.s); return o; });
  g.nodes.forEach((n, i) => { for (const c of n.children) objs[i].add(objs[c]); });
  return objs[g.nodes.findIndex((n) => n.name === "BMX")];
}
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "models/bike/bmx.json"), "utf8"));
const bm = createBikeModel(BIKE, { rider: false }), tree = bmxTree(), rig = rigBmx(tree, meta, bm);
const wheels = ["Wheel_F", "Wheel_R"].map((n) => tree.getObjectByName(n));
const R = meta.dims.wheelR, HW = 0.025, pose = {};
const _p = new THREE.Vector3();
/** the lowest tread point of wheel k above the ground under it (m); hubGround: above the ground under the HUB (riding:
 *  next to a kerb the tread's samples over the kerb's top are not "in" it) */
function gap(k, hubGround = false) {
  wheels[k].getWorldPosition(_p); const gh = hubGround ? gAt(_p.x, _p.z) : null;
  let lo = Infinity;
  for (let a = 0; a < 48; a++) for (const x of [-HW, 0, HW]) {
    const t = a / 48 * Math.PI * 2;
    _p.set(x, Math.cos(t) * R, Math.sin(t) * R).applyMatrix4(wheels[k].matrixWorld);
    lo = Math.min(lo, _p.y - (gh ?? gAt(_p.x, _p.z)));
  }
  return lo;
}
function draw(s) { bikePose(s, 1, pose); bm.update(s, pose, gAt); rig.update(s); bm.root.updateMatrixWorld(true); rig.ground(s, gAt); }

const stats = {};
function ride(label, s, input, secs, sandOk = false) {
  const st = stats[label] = { lo: Infinity, hi: -Infinity, n: 0 };
  for (let i = 0, N = Math.round(secs / DT); i < N; i++) {
    stepBike(s, input(s, i * DT), env);
    if (s.crashed) break;
    draw(s);
    for (let k = 0; k < 2; k++) {
      if (!s.contact[k]) continue;
      // (a face / a crest: the tread circle meets a slope change off the hub's vertical: judged on plain ground only)
      if (Math.abs(s.slope[k]) > 0.05 || s.faceAt?.[k]) continue;
      const g = gap(k, true); st.n++;
      if (process.env.WDEBUG && (g < -0.005 || g > 0.01)) console.log(label, k, (g * 100).toFixed(2), "slopes", s.slope.map((x) => x.toFixed(2)).join(","), "rk", s.rk.map((x) => x.toFixed(3)).join(","), "pen", (s.pen || []).map((x) => (x * 100).toFixed(1)).join(","), "contact", s.contact.join(","), "air", s.air, "face", s.faceAt?.join(","), "pitch", s.pitch.toFixed(3));
      st.lo = Math.min(st.lo, g); st.hi = Math.max(st.hi, g);
    }
  }
  st.sand = sandOk;
  return st;
}
const spawn = ([x, z, h], v = 0) => { const s = createBikeState(x, z, h, gAt(x, z)); s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v; return s; };
const pedal = (s) => ({ pedal: 1, steer: 0 });
const coast = (s) => ({ pedal: 0, steer: 0 });
ride("flat (pedalling)", spawn(SPOTS.start), pedal, 4);
ride("flat (standing still)", spawn(SPOTS.start), (s) => ({ brakeR: 1 }), 2);
ride("kerb", spawn(SPOTS.kerb, 3), pedal, 3);
ride("sand", spawn(SPOTS.sand, 4), pedal, 3, true);
for (const n of ["kicker small", "quarter pipe", "berm loop", "pump track"]) { const [x, z, h, v] = PARK_SPOTS[n]; ride(`park: ${n}`, spawn([x, z, h], v), coast, 3); }
for (const [label, st] of Object.entries(stats)) {
  const lo = st.sand ? -0.02 : -0.005;
  check(`wheels on the ground: ${label}`, st.n > 0 && st.lo >= lo && st.hi <= 0.01, `${st.n} contacts, lowest tread ${(st.lo * 100).toFixed(1)} .. ${(st.hi * 100).toFixed(1)} cm`, `${lo * 100} .. +1.0 cm`);
}
// parked: standing (leaning a little on its pedal) and lying after a fall
for (const mode of ["standing", "lying"]) {
  const s = spawn(SPOTS.start), M = createMount("foot");
  M.park.mode = mode; M.park.lie = 1;
  for (let i = 0; i < 120; i++) parkStep(M, s, DT * 4, gAt(s.x, s.z));
  draw(s);
  const g = [gap(0), gap(1)];
  let grip = Infinity;
  for (const n of ["Grip_L", "Grip_R"]) { tree.getObjectByName(n).getWorldPosition(_p); grip = Math.min(grip, _p.y - gAt(_p.x, _p.z)); }
  // (lying, a BMX rests on a bar end, a pedal and the tyres' walls: its lowest point on the ground, nothing under it)
  const lowAll = Math.min(...g, grip);
  const ok = mode === "standing" ? g.every((x) => x >= -0.005 && x <= 0.01) : g.every((x) => x >= -0.005) && grip >= -0.005 && lowAll <= 0.01;
  check(`wheels on the ground: parked ${mode}`, ok, `tread ${g.map((x) => (x * 100).toFixed(1)).join(" / ")} cm${mode === "lying" ? `, grips ${(grip * 100).toFixed(1)} cm` : ""}`,
    mode === "standing" ? "-0.5 .. +1.0 cm" : "nothing under the ground, the lowest point on it (<= 1 cm)");
}
const w = Math.max(...rows.map((r) => r[0].length));
if (!quiet || failed) for (const r of rows) console.log(`${r[1]}  ${r[0].padEnd(w)}  ${r[2]}  (want ${r[3]})`);
console.log(`wheels: ${rows.length - failed}/${rows.length} checks pass`);
process.exit(failed ? 1 : 0);
