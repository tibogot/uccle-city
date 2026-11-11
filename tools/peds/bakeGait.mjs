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

// ------------------------------------------------------------------------------------------- arm / torso overlays
// Families: the same gait with scripted overrides after every solve (world space, scale 1): arms re-solved with his
// two-bone IK toward targets in the body's frame (pram handle, umbrella shaft, phone at the ear, a cane), and a stoop
// for older people (chest pitched forward about its joint, the head lifted back to look ahead). Mr.doob's rig methods
// (jointFrom, limb, writeBone) do the work; nothing is keyframed by hand.
const B = { PELVIS: 0, CHEST: 1, HEAD: 2, UA: [3, 5], FA: [4, 6], TH: [7, 11], SH: [8, 12], FT: [9, 13], TO: [10, 14] };
const SIDE = [1, -1];
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const AXX = new THREE.Vector3(1, 0, 0), AXY = new THREE.Vector3(0, 1, 0);
function boneQ(rig, b, out) { const o = b * 8, p = rig.pose; return out.set(p[o], p[o + 1], p[o + 2], p[o + 3]); }
function jointPos(rig, b, out) { const o = b * 8, p = rig.pose, s = p[o + 7]; return out.copy(rig.bind[b]).multiplyScalar(s).applyQuaternion(boneQ(rig, b, _q2)).add(_v3.set(p[o + 4], p[o + 5], p[o + 6])); }
/** rotate bones about a pivot by dq (world) */
function rotateAbout(rig, bones, dq, pivot) {
  for (const b of bones) {
    const q = boneQ(rig, b, new THREE.Quaternion()), p = jointPos(rig, b, new THREE.Vector3());
    p.sub(pivot).applyQuaternion(dq).add(pivot);
    rig.writeBone(b, q.premultiply(dq), p);
  }
}
function armTo(rig, i, local, poleLocal) {
  const yaw = rig.yaw, side = SIDE[i];
  const qC = boneQ(rig, B.CHEST, new THREE.Quaternion()), chest = jointPos(rig, B.CHEST, new THREE.Vector3());
  const shoulder = rig.jointFrom(B.CHEST, B.UA[i], qC, chest, new THREE.Vector3());
  const qy = new THREE.Quaternion().setFromAxisAngle(AXY, yaw);
  const bob = rig.pelvisY - rig.standingHeight(0);
  const target = new THREE.Vector3(local[0] * side, local[1], local[2]).applyQuaternion(qy).add(new THREE.Vector3(rig.x, bob * 0.7, rig.z));
  const pole = new THREE.Vector3(poleLocal[0] * side, poleLocal[1], poleLocal[2]).applyQuaternion(qy);
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(qy);
  rig.limb(B.UA[i], B.FA[i], shoulder, target, 0.3, 0.255 + 0.07, pole, front, side * 0.14);
}
function stoop(rig, a = 0.26) {
  const qy = new THREE.Quaternion().setFromAxisAngle(AXY, rig.yaw);
  const dq = qy.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AXX, a)).multiply(qy.clone().invert());
  rotateAbout(rig, [B.CHEST, B.HEAD, 3, 4, 5, 6], dq, jointPos(rig, B.CHEST, new THREE.Vector3()));
  const up = qy.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AXX, -a * 0.7)).multiply(qy.clone().invert());
  rotateAbout(rig, [B.HEAD], up, jointPos(rig, B.HEAD, new THREE.Vector3()));
}
const POST = {
  // both hands on a pram handle 0.5 m ahead at 0.95 m, elbows down
  pram: (rig) => { for (const i of [0, 1]) armTo(rig, i, [0.21, 0.93, 0.5], [0.3, -1, -0.2]); },
  // right hand holds an umbrella shaft at chest height, a little forward (the left arm keeps its swing)
  umbrella: (rig) => armTo(rig, 1, [0.1, 1.2, 0.24], [0.6, -1, -0.3]),
  // right hand at the ear (a phone call)
  phone: (rig) => armTo(rig, 1, [0.09, 1.55, 0.06], [0.5, -1, -0.1]),
  // older: a stoop
  old: (rig) => stoop(rig),
  // older with a cane in the right hand (hand forward-low; the cane is drawn from the hand to the ground)
  cane: (rig) => { stoop(rig); armTo(rig, 1, [0.24, 0.82, 0.22 + 0.05 * Math.sin(rig.phase * Math.PI * 2)], [0.4, -0.6, -1]); },
};
const FAM_WALKS = [0.7, 1.0, 1.35, 1.7];
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
for (const fam of Object.keys(POST)) {
  CLIPS.push({ name: `${fam}:idle`, family: fam, kind: "idle", seconds: 8, blend: 1.2, fps: 15, post: POST[fam] });
  for (const v of fam === "old" || fam === "cane" ? [0.7, 1.0, 1.35] : FAM_WALKS)
    CLIPS.push({ name: `${fam}:walk${String(Math.round(v * 100)).padStart(3, "0")}`, family: fam, kind: "walk", speed: v, post: POST[fam] });
}

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
    clip.post?.(rig);
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
    clip.post?.(rig);
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

// ------------------------------------------------------------------------------------------- UAL1 retarget (CC0)
// Quaternius Universal Animation Library 1 (CC0, data/raw/characters/ual1/ual1.glb, git-ignored; CREDITS.md): sitting
// and talking, retargeted onto the 15-bone crowd skeleton: pelvis / chest / head take the UAL bones' world rotation
// relative to their rest pose; legs and arms are solved with Mr.doob's two-bone IK toward the UAL ankles / wrists
// (scaled by limb length), knees and elbows toward the UAL knees / elbows. Sitting: hips put on a 45 cm seat, feet
// flat on the ground.
import { loadGlb } from "./ual.mjs";
import { existsSync } from "node:fs";
// the raw pack is git-ignored: look in this checkout, then in the main checkout (worktrees share it), or $UAL1
const UAL_CANDIDATES = [process.env.UAL1, resolve(process.cwd(), "data/raw/characters/ual1/ual1.glb"), resolve(process.cwd(), "../../../data/raw/characters/ual1/ual1.glb")];
const UAL_CLIPS = [
  { name: "sit", ual: "Sitting_Idle_Loop", seat: 0.45 },
  { name: "sitTalk", ual: "Sitting_Talking_Loop", seat: 0.45 },
  { name: "talk", ual: "Idle_Talking_Loop" },
];
function bakeUal(G, sex, def) {
  const clip = G.clips[def.ual];
  const rig = new PersonRig({ seed: 0.37 + sex * 0.21, female: !!sex, scale: 1, girth: 1, hair: 0.3 });
  rig.reset(0, 0, 0, ground); rig.yaw = 0;
  const id = (n) => G.byName[n];
  const W0 = G.world(G.pose(null));
  const wq = (W, n) => { const q = new THREE.Quaternion(); W[id(n)].decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
  const wp = (W, n) => new THREE.Vector3().setFromMatrixPosition(W[id(n)]);
  const delta = (W, n) => wq(W, n).multiply(wq(W0, n).invert());
  const legLen = wp(W0, "thigh_l").distanceTo(wp(W0, "calf_l")) + wp(W0, "calf_l").distanceTo(wp(W0, "foot_l"));
  const armLen = wp(W0, "upperarm_l").distanceTo(wp(W0, "lowerarm_l")) + wp(W0, "lowerarm_l").distanceTo(wp(W0, "hand_l"));
  const kLeg = 0.84 / legLen, kArm = 0.555 / armLen;
  // offset: from frame 0, the hips (sitting) or the pelvis (standing) to the person's root
  const F0 = G.world(G.pose(clip, 0));
  const hip0 = wp(F0, "thigh_l").add(wp(F0, "thigh_r")).multiplyScalar(0.5 * kLeg);
  const off = def.seat ? new THREE.Vector3(-hip0.x, def.seat + 0.09 - hip0.y, -hip0.z) : new THREE.Vector3(-hip0.x, 0, -hip0.z);
  const fps = 30, n = Math.max(2, Math.round(clip.duration * fps));
  const frames = [], plants = [], contacts = [];
  for (let k = 0; k < n; k++) {
    const W = G.world(G.pose(clip, (k / n) * clip.duration));
    const qP = delta(W, "pelvis"), qC = delta(W, "spine_03"), qH = delta(W, "Head");
    const pelvis = wp(W, "pelvis").multiplyScalar(kLeg).add(off);
    rig.writeBone(B.PELVIS, qP, pelvis);
    const chest = rig.jointFrom(B.PELVIS, B.CHEST, qP, pelvis, new THREE.Vector3());
    rig.writeBone(B.CHEST, qC, chest);
    rig.writeBone(B.HEAD, qH, rig.jointFrom(B.CHEST, B.HEAD, qC, chest, new THREE.Vector3()));
    for (const i of [0, 1]) {
      const sfx = i === 0 ? "_l" : "_r";
      const hipU = wp(W, "thigh" + sfx), kneeU = wp(W, "calf" + sfx), ankU = wp(W, "foot" + sfx), ballU = wp(W, "ball" + sfx);
      const hip = rig.jointFrom(B.PELVIS, B.TH[i], qP, pelvis, new THREE.Vector3());
      const target = hip.clone().add(ankU.clone().sub(hipU).multiplyScalar(kLeg));
      if (ankU.y < 0.2) target.y = 0.08;                                  // the UAL foot is on its floor: ours on ours
      const pole = kneeU.clone().sub(hipU.clone().add(ankU).multiplyScalar(0.5));
      const front = ballU.clone().sub(ankU).setY(0).normalize();
      const ankle = rig.limb(B.TH[i], B.SH[i], hip, target, 0.42, 0.42, pole, front, 0, 0).clone();
      const qF = new THREE.Quaternion().setFromAxisAngle(AXY, Math.atan2(front.x, front.z));
      rig.writeFoot(i, ankle, qF, 0);
      const shU = wp(W, "upperarm" + sfx), elU = wp(W, "lowerarm" + sfx), wrU = wp(W, "hand" + sfx);
      const sh = rig.jointFrom(B.CHEST, B.UA[i], qC, chest, new THREE.Vector3());
      const wt = sh.clone().add(wrU.clone().sub(shU).multiplyScalar(kArm));
      const ep = elU.clone().sub(shU.clone().add(wrU).multiplyScalar(0.5));
      rig.limb(B.UA[i], B.FA[i], sh, wt, 0.3, 0.255, ep, new THREE.Vector3(0, 0, 1).applyQuaternion(qC), SIDE[i] * 0.14);
    }
    rig.x = 0; rig.z = 0;
    frames.push(localPose(rig, 0)); plants.push([1, 1]); contacts.push([1, 1]);
  }
  return { frames, plants, contacts, stride: 0, turnPerCycle: 0, cycleSeconds: clip.duration, seam: 0, kLeg, kArm };
}
const ualPath = UAL_CANDIDATES.find((f) => f && existsSync(f));
if (ualPath) {
  const G = loadGlb(ualPath, THREE);
  for (const def of UAL_CLIPS) CLIPS.push({ ...def, kind: "act", family: "act", ualDef: def, G });
} else console.warn("UAL1 not found (data/raw/characters/ual1/ual1.glb): sit / talk clips skipped");

const meta = { source: "vendor/slop-ped/pedestrians.js PersonRig (mrdoob/slop-newyork 536a907, MIT), baked by tools/peds/bakeGait.mjs",
  bones: BONES, floatsPerBone: 8, sexes: ["male", "female"], date: new Date().toISOString().slice(0, 10), clips: [] };
const bySex = [[], []];
let start = 0;
for (const clip of CLIPS) {
  const res = [0, 1].map((sex) => (clip.kind === "act" ? bakeUal(clip.G, sex, clip.ualDef) : clip.kind === "idle" ? bakeIdle(sex, clip) : bakeCycle(sex, clip)));
  const frames = res[0].frames.length;
  for (const sex of [0, 1]) bySex[sex].push(...res[sex].frames);
  meta.clips.push({
    name: clip.name, kind: clip.kind, family: clip.family || "base", start, frames, speed: clip.speed ?? 0, omega: clip.omega ?? 0,
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
