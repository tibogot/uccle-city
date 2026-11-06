// RETARGET clips onto our character (models/characters/clips.glb + clips.json), from any rig in tools/characters/rigs.mjs
// (Quaternius modular men, Quaternius UAL, Mixamo; mocap through Mixamo's layout). Scripted, deterministic, no Blender
// for the math (Mixamo FBX files are first converted to GLB by tools/blender/fbx2glb.py).
//
//   node tools/characters/retarget.mjs [--raw <data/raw dir>]      build models/characters/clips.glb + clips.json
//   node tools/characters/retarget.mjs --roundtrip                  Hoodie -> Hoodie must be lossless (prints errors)
//
// METHOD (per frame, world space):
//   1. Both skeletons in a REFERENCE pose (the source's rest / a clip frame, the target's idle frame 0: standing, feet
//      flat). Per canonical bone a SEMANTIC FRAME is built from the pose itself (rigs.mjs CANON: towards its child +
//      a hint axis of the body; the hips, head and feet from the body's up / left / forward), so the rigs' different
//      bone axes and rest poses (A-pose, T-pose, a 100x FBX bind) cancel out: K = frame^-1 * world_ref (per rig).
//   2. At time t: the source bone's semantic orientation S = Ws(t) * Ks^-1, turned by the yaw between the two bodies'
//      forwards, gives the target bone's world rotation Wt = Y * S * Kt; locals follow down the target's hierarchy
//      (bones the map doesn't name keep their reference local rotation).
//   3. Translations scaled by the leg-length ratio: the hips' height ABOVE ITS REFERENCE height, the feet's lift above
//      their reference ankle height (so a planted source foot is a planted target foot, at the target's own ankle
//      height), horizontal positions scaled. Our rig's feet are IK-style bones under the root: they get the source's
//      ankle position (+ rotation), the legs get the source's leg rotations (the knee direction: the runtime IK's pole).
//   4. ROOT MOTION: a clip whose hips travel (> 0.2 leg lengths) is made IN PLACE: its root path (a straight line for
//      a loop, the smoothed hips path for a one-shot) is taken off the hips and the feet and written as a root
//      velocity track (clips.json), so the controller drives the speed and the clip plays at it.
import path from "node:path";
import fs from "node:fs";
import { readGLB, sampleAnim, worldPose, toLocal, writeClipsGLB, q, v } from "./gltfAnim.mjs";
import { CANON, bindRig } from "./rigs.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RAW = path.resolve(arg("--raw", path.join(ROOT, "data/raw")));
const TARGET = path.join(ROOT, "models/characters/hoodie.glb");     // the clips bind by bone name: Casual shares the rig
const FPS = 30;

// the clips our character uses, by role (viewer/character/characterModel.js reads the roles from clips.json)
const UAL2 = "characters/ual2/Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb";
const JOBS = [
  { src: UAL2, rig: "ual", ref: "rest", clips: [
    { from: "NinjaJump_Start", to: "Jump_Start", role: "jumpStart" },
    { from: "NinjaJump_Idle_Loop", to: "Jump_Loop", role: "fall", loop: true },
    { from: "NinjaJump_Land", to: "Jump_Land", role: "land" },
    { from: "Idle_No_Loop", to: "UAL_Idle", role: "idleAlt", loop: true },
  ] },
  // Mixamo (Adobe; licensed for use inside the project, not for redistribution as standalone files): FBX "Without
  // Skin" in data/raw/animations/mixamo/, converted to GLB there by tools/blender/fbx2glb.py. Missing files are skipped.
  ...[
    ["Walking Up The Stairs", "Stairs_Up", "stairsUp", true], ["Walking Down The Stairs", "Stairs_Down", "stairsDown", true],
    ["Running Up Stairs", "Stairs_Up_Run", "stairsUpRun", true], ["Running Down Stairs", "Stairs_Down_Run", "stairsDownRun", true],
    ["Jump", "MX_Jump", "jumpStart", false], ["Falling Idle", "MX_Fall", "fall", true], ["Falling To Landing", "MX_Land", "land", false],
    ["Left Turn", "Turn_L", "turnL", false], ["Right Turn", "Turn_R", "turnR", false],
    ["Start Walking", "Walk_Start", "walkStart", false], ["Stop Walking", "Walk_Stop", "walkStop", false],
  ].map(([file, to, role, loop]) => ({ src: `animations/mixamo/glb/${file}.glb`, rig: "mixamo", ref: "first", optional: true, clips: [{ from: 0, to, role, loop }] })),
];

// ------------------------------------------------------------------------------------------------ reference frames
const UP = [0, 1, 0];
function bodyAxes(B, W) {
  const L = W[B.bone.LeftUpLeg].p, R = W[B.bone.RightUpLeg].p;
  const left = v.norm([L[0] - R[0], 0, L[2] - R[2]]), fwd = v.cross(left, UP);
  return { left, fwd, up: UP };
}
function frames(B, W) {
  const ax = bodyAxes(B, W), F = {};
  for (const [c, d] of Object.entries(CANON)) {
    let x, y, z;
    if (d.frame === "up" || d.frame === "fwd") { x = ax.left; y = UP; z = ax.fwd; }
    else {
      y = v.norm(v.sub(W[B.bone[d.child]].p, W[B.bone[c]].p));
      let h = ax[d.hint];
      if (Math.abs(v.dot(h, y)) > 0.95) h = d.hint === "up" ? ax.fwd : UP;
      z = v.norm(v.sub(h, v.mul(y, v.dot(h, y))));      // the hint, made perpendicular to the bone
      x = v.cross(y, z);
    }
    F[c] = q.fromBasis(x, y, z);
  }
  return { F, ax };
}
const legLen = (B, W, s) => v.len(v.sub(W[B.bone[s + "UpLeg"]].p, W[B.bone[s + "Leg"]].p)) + v.len(v.sub(W[B.bone[s + "Leg"]].p, W[B.bone[s + "Ankle"]].p));

function prepare(g, rigName, refAnim, refTime = 0) {
  const B = bindRig(g, rigName);
  const L = sampleAnim(g, refAnim, refTime), W = worldPose(g, L);
  const { F, ax } = frames(B, W);
  const K = {};
  for (const c of Object.keys(CANON)) K[c] = q.mul(q.inv(F[c]), W[B.bone[c]].q);
  const leg = (legLen(B, W, "Left") + legLen(B, W, "Right")) / 2;
  const an = B.rig.feetIK ? "Foot" : "Ankle";
  return { g, B, L, W, K, ax, leg, hipY: W[B.bone.Hips].p[1], ankleY: (W[B.bone["Left" + an]].p[1] + W[B.bone["Right" + an]].p[1]) / 2 };
}

// target hierarchy order (parents first)
function topo(g) {
  const out = [], seen = new Set();
  const visit = (i) => { if (seen.has(i)) return; const p = g.nodes[i].parent; if (p >= 0) visit(p); seen.add(i); out.push(i); };
  g.nodes.forEach((n) => visit(n.i));
  return out;
}

/** Retarget one source anim -> { times, frames: [per target node local {t, r}], hips/feet world xz, ... } */
function retargetClip(S, T, anim, opts = {}) {
  const dur = anim.duration, n = Math.max(2, Math.round(dur * FPS) + 1), times = new Float32Array(n);
  const yaw = q.mul(q.fromBasis(T.ax.left, UP, T.ax.fwd), q.inv(q.fromBasis(S.ax.left, UP, S.ax.fwd)));   // source body -> target body
  const scale = T.leg / S.leg, order = topo(T.g), byNode = new Map();
  for (const [c, i] of Object.entries(T.B.bone)) if (CANON[c]) byNode.set(i, c);
  const ikFeet = !!T.B.rig.feetIK, footIdx = new Set([T.B.bone.LeftFoot, T.B.bone.RightFoot]);
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = times[k] = Math.min(dur, k / FPS);
    const Ws = worldPose(S.g, sampleAnim(S.g, anim, t));
    // the target's world rotations of the mapped bones, and the positions that come from the source
    const Q = {}, P = {};
    for (const c of Object.keys(CANON)) {
      const Ss = q.mul(Ws[S.B.bone[c]].q, q.inv(S.K[c]));               // the source bone's semantic orientation
      Q[c] = q.norm(q.mul(q.mul(yaw, Ss), T.K[c]));
    }
    const hs = q.rot(yaw, Ws[S.B.bone.Hips].p);
    P.Hips = [hs[0] * scale, (Ws[S.B.bone.Hips].p[1] - S.hipY) * scale + T.hipY, hs[2] * scale];
    for (const s of ["Left", "Right"]) {
      // (an IK-feet rig's foot bone is where its clip puts the foot: the FK ankle only follows it within a few mm)
      const ai = S.B.bone[s + (S.B.rig.feetIK ? "Foot" : "Ankle")], a = q.rot(yaw, Ws[ai].p);
      P[s + "Foot"] = [a[0] * scale, (Ws[ai].p[1] - S.ankleY) * scale + T.ankleY, a[2] * scale];
    }
    // down the target's hierarchy
    const L = T.L.map((l) => ({ t: l.t.slice(), r: l.r.slice(), s: l.s.slice() }));
    const W = new Array(T.g.nodes.length);
    for (const i of order) {
      const nd = T.g.nodes[i], c = byNode.get(i);
      if (c) {
        let pos;
        if (c === "Hips") pos = P.Hips;
        else if (ikFeet && footIdx.has(i)) pos = P[c];
        if (pos) { const lo = toLocal(T.g, W, i, pos, Q[c]); L[i].t = lo.t; L[i].r = lo.r; }
        else L[i].r = toLocal(T.g, W, i, [0, 0, 0], Q[c]).r;
      }
      const l = L[i];
      if (nd.parent < 0) W[i] = { p: l.t.slice(), q: l.r.slice(), s: l.s[0] };
      else { const Pw = W[nd.parent]; W[i] = { p: v.add(Pw.p, q.rot(Pw.q, v.mul(l.t, Pw.s))), q: q.norm(q.mul(Pw.q, l.r)), s: Pw.s * l.s[0] }; }
    }
    out.push({ L, W, hips: P.Hips, feet: [P.LeftFoot, P.RightFoot] });
  }
  return { times, frames: out, scale };
}

/** Root motion: the hips' horizontal travel taken out (loop: a straight line; one-shot: the smoothed path). */
function extractRoot(T, clip, loop) {
  const F = clip.frames, n = F.length, dur = clip.times[n - 1];
  const h0 = F[0].hips, h1 = F[n - 1].hips, travel = Math.hypot(h1[0] - h0[0], h1[2] - h0[2]);
  if (travel < 0.2 * T.leg) return null;
  const path = F.map((f, k) => {
    if (loop) { const u = k / (n - 1); return [h0[0] + (h1[0] - h0[0]) * u, h0[2] + (h1[2] - h0[2]) * u]; }
    let sx = 0, sz = 0, m = 0;                      // moving average over 0.3 s
    for (let j = Math.max(0, k - 4); j <= Math.min(n - 1, k + 4); j++) { sx += F[j].hips[0]; sz += F[j].hips[2]; m++; }
    return [sx / m, sz / m];
  });
  const vel = path.map((p, k) => { const a = path[Math.max(0, k - 1)], b = path[Math.min(n - 1, k + 1)], dt = clip.times[Math.min(n - 1, k + 1)] - clip.times[Math.max(0, k - 1)] || 1; return [+(((b[0] - a[0]) / dt)).toFixed(4), +(((b[1] - a[1]) / dt)).toFixed(4)]; });
  return { path, vel, speed: travel / dur };
}

function buildTracks(T, clip, root) {
  const bodyI = T.B.bone.Hips, feetI = [T.B.bone.LeftFoot, T.B.bone.RightFoot];
  const mapped = new Set(Object.entries(T.B.bone).filter(([c]) => CANON[c]).map(([, i]) => i));
  const tracks = [];
  for (const i of mapped) {
    const R = new Float32Array(clip.frames.length * 4);
    clip.frames.forEach((f, k) => R.set(f.L[i].r, k * 4));
    tracks.push({ node: i, path: "rotation", values: R });
    if (i === bodyI || (T.B.rig.feetIK && feetI.includes(i))) {
      const P = new Float32Array(clip.frames.length * 3);
      clip.frames.forEach((f, k) => {
        let w = i === bodyI ? f.hips : f.feet[feetI.indexOf(i)];
        if (root) w = [w[0] - (root.path[k][0] - root.path[0][0]), w[1], w[2] - (root.path[k][1] - root.path[0][1])];
        // (the local translation that puts the bone at w under its parent's world this frame)
        const par = T.g.nodes[i].parent, Pw = f.W[par];
        P.set(v.mul(q.rot(q.inv(Pw.q), v.sub(w, Pw.p)), 1 / Pw.s), k * 3);
      });
      tracks.push({ node: i, path: "translation", values: P });
    }
  }
  return tracks;
}

// ------------------------------------------------------------------------------------------------ main
const target = readGLB(TARGET);
const T = prepare(target, "quaternius", target.anims.find((a) => a.name === "Idle_Neutral"), 0);
console.log(`target ${path.basename(TARGET)}: leg ${T.leg.toFixed(3)} m, hips ${T.hipY.toFixed(3)} m, ankle ${T.ankleY.toFixed(3)} m`);

if (process.argv.includes("--roundtrip")) {
  // Hoodie -> Hoodie: every mapped bone's world rotation and the hips / feet positions must come back unchanged
  const S = prepare(target, "quaternius", target.anims.find((a) => a.name === "Idle_Neutral"), 0);
  for (const name of ["Walk", "Run", "Idle_Neutral"]) {
    const anim = target.anims.find((a) => a.name === name), clip = retargetClip(S, T, anim);
    let maxA = 0, maxP = 0;
    clip.frames.forEach((f, k) => {
      const Wsrc = worldPose(target, sampleAnim(target, anim, clip.times[k]));
      for (const [c, i] of Object.entries(T.B.bone)) {
        if (!CANON[c]) continue;
        maxA = Math.max(maxA, q.angle(Wsrc[i].q, f.W[i].q) * 180 / Math.PI);
        if (c === "Hips" || c.endsWith("Foot")) maxP = Math.max(maxP, v.len(v.sub(Wsrc[i].p, f.W[i].p)));
      }
    });
    console.log(`roundtrip ${name}: max bone rotation error ${maxA.toFixed(4)} deg, max hips / feet position error ${(maxP * 1000).toFixed(3)} mm`);
  }
  process.exit(0);
}

if (process.argv.includes("--compare-src")) {
  // the same clip through another file (e.g. the FBX of the same library, converted by tools/blender/fbx2glb.py): the
  // retargeted poses must agree (rotations in degrees, hips / feet in mm)
  const job = JOBS[0], c = job.clips[0], alt = readGLB(arg("--compare-src"));
  const runOn = (g) => { const S = prepare(g, job.rig, null, 0), a = g.anims.find((x) => x.name === c.from || x.name.endsWith("|" + c.from)); return retargetClip(S, T, a); };
  const A = runOn(readGLB(path.join(RAW, job.src))), Bc = runOn(alt);
  let maxA = 0, maxP = 0;
  const n = Math.min(A.frames.length, Bc.frames.length);
  for (let k = 0; k < n; k++) for (const [cn, i] of Object.entries(T.B.bone)) {
    if (!CANON[cn]) continue;
    maxA = Math.max(maxA, q.angle(A.frames[k].W[i].q, Bc.frames[k].W[i].q) * 180 / Math.PI);
    if (cn === "Hips" || cn.endsWith("Foot")) maxP = Math.max(maxP, v.len(v.sub(A.frames[k].W[i].p, Bc.frames[k].W[i].p)));
  }
  console.log(`${c.from}: GLB vs ${path.basename(arg("--compare-src"))}: ${n} frames, max rotation difference ${maxA.toFixed(2)} deg, max hips / feet ${(maxP * 1000).toFixed(1)} mm`);
  process.exit(0);
}
const anims = [], meta = {};
for (const job of JOBS) {
  const file = path.join(RAW, job.src);
  if (!fs.existsSync(file)) { if (!job.optional) console.warn(`missing ${file}`); continue; }
  const src = readGLB(file);
  const refAnim = job.ref === "first" ? src.anims[0] : job.ref === "rest" ? null : src.anims.find((a) => a.name === job.ref);
  const S = prepare(src, job.rig, refAnim, 0);
  for (const c of job.clips) {
    const anim = typeof c.from === "number" ? src.anims[c.from] : src.anims.find((a) => a.name === c.from || a.name.endsWith("|" + c.from));
    if (!anim) { console.warn(`${job.src}: no clip ${c.from}`); continue; }
    const clip = retargetClip(S, T, anim), root = extractRoot(T, clip, !!c.loop);
    anims.push({ name: c.to, times: clip.times, tracks: buildTracks(T, clip, root) });
    // the feet's contacts, read from the clip (sole height above the target's standing ankle height < 3 % of the leg):
    // planted / airborne phases, the take-off and the touch-down (the body starts a jump clip at its take-off, a
    // landing clip at its touch-down)
    const lim = T.ankleY + 0.03 * T.leg, contact = [0, 1].map((s) => clip.frames.map((f) => (f.feet[s][1] < lim ? 1 : 0)));
    const both = contact[0].map((x, k) => x || contact[1][k]);
    const takeoff = both.findIndex((x, k) => k > 0 && !x && both[k - 1]), touchdown = both.findIndex((x, k) => k > 0 && x && !both[k - 1]);
    meta[c.to] = { role: c.role,
      contact: contact.map((a) => a.join("")), takeoff: takeoff > 0 ? +clip.times[takeoff].toFixed(3) : null, touchdown: touchdown > 0 ? +clip.times[touchdown].toFixed(3) : null, loop: !!c.loop, duration: +clip.times[clip.times.length - 1].toFixed(3), source: `${path.basename(job.src)}:${anim.name}`, rig: job.rig, scale: +clip.scale.toFixed(3),
      ...(root ? { rootSpeed: +root.speed.toFixed(3), rootVelocity: root.vel } : {}) };
    console.log(`${c.to} <- ${job.rig}:${anim.name}  ${clip.times.length} frames, scale ${clip.scale.toFixed(3)}${root ? `, root motion ${root.speed.toFixed(2)} m/s taken out` : ""}`);
  }
}
const OUT = path.join(ROOT, "models/characters/clips.glb");
const bytes = writeClipsGLB(OUT, target.nodes.map((n) => ({ name: n.name, parent: n.parent, children: n.children, t: n.t, r: n.r, s: n.s })), anims, { note: "retargeted clips for the Quaternius modular men rig (tools/characters/retarget.mjs)" });
fs.writeFileSync(path.join(ROOT, "models/characters/clips.json"), JSON.stringify({ target: path.basename(TARGET), fps: FPS, clips: meta }, null, 1));
console.log(`wrote ${path.relative(ROOT, OUT)} (${(bytes / 1024).toFixed(0)} KB, ${anims.length} clips) + clips.json`);
