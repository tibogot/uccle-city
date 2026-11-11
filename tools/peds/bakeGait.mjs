// Bake the crowd's bone table: Mr.doob's procedural gait (vendor/slop-ped/pedestrians.js, PersonRig, MIT) run on a
// treadmill, sampled over one gait cycle per clip. Scripted: no clip licence, no hand animation.
//   node tools/peds/bakeGait.mjs [outDir=models/pedestrians]
// Needs three in tools/worker/node_modules (cd tools/worker && npm ci).
// Output: clips.bin (Float32: [sex 0 male, 1 female][frame][bone 15][q.xyzw, t.xyz, s]) and clips.json (clip list,
// strides, contact flags, cyclic seam error). Poses are in the person's own frame: root (the controller point) at the
// origin, facing +Z, height 1.75 m (scale 1), flat ground at y = 0. The crowd shader turns them by the person's yaw,
// scales by their height and moves them to their position (viewer/pedestrians/boneTable.js).
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadPedestrians } from "./loadRig.mjs";

const { PersonRig, THREE } = await loadPedestrians();
const outDir = resolve(process.argv[2] || "models/pedestrians");
const BONES = 15, FL = BONES * 8;            // floats per frame (pose without the info vec4)
const DT = 1 / 240;                          // simulation step (the rig clamps dt to <= 0.1 s; small steps = clean samples)
const LOCO_FRAMES = 48;                      // samples per gait cycle
const ground = () => 0;

const CLIPS = [
  { name: "idle", kind: "idle", seconds: 16, blend: 1.5, fps: 15 },
  { name: "walk070", kind: "walk", speed: 0.7 },
  { name: "walk100", kind: "walk", speed: 1.0 },
  { name: "walk135", kind: "walk", speed: 1.35 },
  { name: "walk170", kind: "walk", speed: 1.7 },
  { name: "jog240", kind: "walk", speed: 2.4 },
  { name: "run320", kind: "walk", speed: 3.2 },
  { name: "turnL", kind: "turn", omega: 1.3 },
  { name: "turnR", kind: "turn", omega: -1.3 },
];

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qy = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3();

/** The rig's world pose -> person-local pose (minus the body point, turned by -yaw). */
function localPose(rig, yaw) {
  const out = new Float32Array(FL), p = rig.pose;
  qy.setFromAxisAngle(Y, -yaw);
  for (let b = 0; b < BONES; b++) {
    const o = b * 8;
    qa.set(p[o], p[o + 1], p[o + 2], p[o + 3]).premultiply(qy);
    v.set(p[o + 4] - rig.x, p[o + 5], p[o + 6] - rig.z).applyQuaternion(qy);
    out.set([qa.x, qa.y, qa.z, qa.w, v.x, v.y, v.z, p[o + 7]], o);
  }
  return out;
}
function lerpPose(a, b, t) {
  const out = new Float32Array(FL);
  for (let bn = 0; bn < BONES; bn++) {
    const o = bn * 8;
    qa.set(a[o], a[o + 1], a[o + 2], a[o + 3]); qb.set(b[o], b[o + 1], b[o + 2], b[o + 3]);
    qa.slerp(qb, t);
    out.set([qa.x, qa.y, qa.z, qa.w], o);
    for (let k = 4; k < 8; k++) out[o + k] = a[o + k] + (b[o + k] - a[o + k]) * t;
  }
  return out;
}
/** Largest joint gap between two poses (m): ankle / knee / wrist positions = t + q * bindJoint (we use t, close enough
 *  for a seam check: the same bone rotation gives the same t-difference for the same joint). */
function poseDiff(a, b) {
  let m = 0;
  for (let bn = 0; bn < BONES; bn++) {
    const o = bn * 8;
    m = Math.max(m, Math.hypot(a[o + 4] - b[o + 4], a[o + 5] - b[o + 5], a[o + 6] - b[o + 6]));
    const dq = Math.abs(a[o] * b[o] + a[o + 1] * b[o + 1] + a[o + 2] * b[o + 2] + a[o + 3] * b[o + 3]);
    m = Math.max(m, 2 * Math.acos(Math.min(1, dq)) * 0.4);        // angle x a 0.4 m lever
  }
  return m;
}

function bakeCycle(sex, clip) {
  const rig = new PersonRig({ seed: 0.37 + sex * 0.21, female: !!sex, scale: 1, girth: 1, hair: 0.3, armSwing: 1, stride: 1 });
  let x = 0, z = 0, heading = 0, t = 0;
  rig.reset(0, 0, 0, ground);
  const step = () => {
    t += DT;
    if (clip.kind === "walk") z += clip.speed * DT;
    else heading += clip.omega * DT;
    rig.update(DT, x, z, heading, ground, null, 0, true);
  };
  for (let i = 0; i < 15 / DT; i++) step();                       // settle (the rig's smoothing filters)
  // record from one left heel strike (phase wraps to ~0) to the next, plus the one after (seam check)
  const rec = [];
  let cycles = 0, prev = rig.phase, yawU = rig.yaw, yawPrev = rig.yaw;
  while (cycles < 3) {
    step();
    yawU += Math.atan2(Math.sin(rig.yaw - yawPrev), Math.cos(rig.yaw - yawPrev)); yawPrev = rig.yaw;
    if (rig.phase < prev) cycles++;
    prev = rig.phase;
    if (cycles >= 1) rec.push({ u: cycles - 1 + rig.phase, pose: localPose(rig, clip.kind === "turn" ? rig.yaw : 0), z: rig.z, yaw: yawU,
      plant: rig.feet.map((f) => (f.swing ? 0 : 1)), contact: rig.feet.map((f) => f.contact) });
  }
  const at = (u) => {
    let i = 0;
    while (i < rec.length - 2 && rec[i + 1].u <= u) i++;
    const A = rec[i], B = rec[i + 1], k = Math.min(1, Math.max(0, (u - A.u) / (B.u - A.u)));
    return { pose: lerpPose(A.pose, B.pose, k), z: A.z + (B.z - A.z) * k, yaw: A.yaw + (B.yaw - A.yaw) * k, plant: k < 0.5 ? A.plant : B.plant, contact: A.contact.map((c, j) => c + (B.contact[j] - c) * k) };
  };
  const frames = [], plants = [], contacts = [];
  // the second recorded cycle, cross-faded with the first by u (L(0) = L(1) = the pose at the second heel strike):
  // the residual cycle-to-cycle drift of the rig's smoothing filters (< 1 cm) is spread over the cycle, no seam
  for (let k = 0; k < LOCO_FRAMES; k++) {
    const u = k / LOCO_FRAMES, s = at(1 + u), s0 = at(u);
    frames.push(lerpPose(s.pose, s0.pose, u)); plants.push(s.plant); contacts.push(s.contact.map((c) => +c.toFixed(3)));
  }
  const s0 = at(0), s1 = at(1), s2 = at(2);
  const cycleTime = (rec.findIndex((r) => r.u >= 1) - 0) * DT;
  return {
    frames, plants, contacts,
    stride: s2.z - s1.z, strideCheck: s1.z - s0.z,
    turnPerCycle: s2.yaw - s1.yaw,
    cycleSeconds: cycleTime,
    seam: poseDiff(frames[LOCO_FRAMES - 1], frames[0]) / Math.max(1e-6, frames.slice(1).reduce((m, f, i) => Math.max(m, poseDiff(frames[i], f)), 0)), seam2: poseDiff(s1.pose, s2.pose),
  };
}

function bakeIdle(sex, clip) {
  const rig = new PersonRig({ seed: 0.37 + sex * 0.21, female: !!sex, scale: 1, girth: 1, hair: 0.3 });
  rig.reset(0, 0, 0, ground);
  for (let i = 0; i < 2 / DT; i++) rig.update(DT, 0, 0, 0, ground, null, 0, true);
  const per = Math.round(1 / (clip.fps * DT)), n = clip.seconds * clip.fps, nb = clip.blend * clip.fps;
  const rec = [];
  for (let k = 0; k < n + nb; k++) {
    for (let i = 0; i < per; i++) rig.update(DT, 0, 0, 0, ground, null, 0, true);
    rec.push({ pose: localPose(rig, 0), plant: rig.feet.map((f) => (f.swing ? 0 : 1)), contact: rig.feet.map((f) => f.contact) });
  }
  // loop: the first `blend` seconds cross-fade from the recording's tail (t + T) into its head, so frame n-1 -> 0 is
  // continuous (the feet stay planted throughout; only the weight shift / breathing / glance are blended)
  const frames = [], plants = [], contacts = [];
  for (let k = 0; k < n; k++) {
    const p = k < nb ? lerpPose(rec[k + n].pose, rec[k].pose, k / nb) : rec[k].pose;
    frames.push(p); plants.push(rec[k].plant); contacts.push(rec[k].contact.map((c) => +c.toFixed(3)));
  }
  return { frames, plants, contacts, stride: 0, turnPerCycle: 0, cycleSeconds: clip.seconds, seam: poseDiff(frames[n - 1], frames[0]) / Math.max(1e-6, frames.slice(1).reduce((m, f, i) => Math.max(m, poseDiff(frames[i], f)), 0)), allPlanted: plants.every((p) => p[0] && p[1]) };
}

const meta = { source: "vendor/slop-ped/pedestrians.js PersonRig (mrdoob/slop-newyork 536a907, MIT), baked by tools/peds/bakeGait.mjs",
  bones: BONES, floatsPerBone: 8, sexes: ["male", "female"], date: new Date().toISOString().slice(0, 10), clips: [] };
const bySex = [[], []];
let start = 0;
for (const clip of CLIPS) {
  const res = [0, 1].map((sex) => (clip.kind === "idle" ? bakeIdle(sex, clip) : bakeCycle(sex, clip)));
  const frames = res[0].frames.length;
  for (const sex of [0, 1]) bySex[sex].push(...res[sex].frames);
  meta.clips.push({
    name: clip.name, kind: clip.kind, start, frames, speed: clip.speed ?? 0, omega: clip.omega ?? 0,
    loop: true,
    stride: res.map((r) => +r.stride.toFixed(4)),                         // m per cycle at scale 1 [male, female]
    turnPerCycle: res.map((r) => +r.turnPerCycle.toFixed(4)),             // rad per cycle (turn clips)
    cycleSeconds: res.map((r) => +r.cycleSeconds.toFixed(4)),
    seam: res.map((r) => +r.seam.toFixed(3)),                              // joint jump frame n-1 -> 0 / largest jump between frames (<= 1: no seam)
    plant: res.map((r) => r.plants.map((p) => p[0] | (p[1] << 1))),       // bit 0 left foot planted, bit 1 right
    contact: res.map((r) => r.contacts),
  });
  start += frames;
  console.log(`${clip.name.padEnd(8)} frames ${frames} stride ${res.map((r) => r.stride.toFixed(3)).join("/")} m` +
    ` (check ${res.map((r) => (r.strideCheck ?? 0).toFixed(3)).join("/")}) cycle ${res.map((r) => r.cycleSeconds.toFixed(3)).join("/")} s` +
    ` turn ${res.map((r) => r.turnPerCycle.toFixed(3)).join("/")} seam ${res.map((r) => r.seam.toFixed(4)).join("/")} (next cycle ${res.map((r) => (r.seam2 ?? 0).toFixed(4)).join("/")})`);
}
meta.totalFrames = start;
const bin = new Float32Array(2 * start * FL);
for (const sex of [0, 1]) bySex[sex].forEach((f, i) => bin.set(f, (sex * start + i) * FL));
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "clips.bin"), Buffer.from(bin.buffer));
writeFileSync(resolve(outDir, "clips.json"), JSON.stringify(meta));
console.log(`wrote ${outDir}/clips.bin (${(bin.byteLength / 1024).toFixed(0)} KB, ${start} frames x 2 sexes) + clips.json`);
