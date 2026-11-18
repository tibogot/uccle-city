// THE UAL CHARACTER: Quaternius' Universal Animation Library 1 + 2 (free "Standard" tier, CC0; CREDITS.md), one
// universal humanoid rig (Unreal-mannequin layout: pelvis / spine_01..03 / thigh / calf / foot / ball). Reads the two
// packs' GLBs (root motion OFF: the in-place files) and writes, for the viewer (viewer/character/characterModel.js "ual"):
//
//   models/characters/ual.glb    the mannequin (the placeholder body: its two primitives merged into ONE with vertex
//                                colours, one material) + its skeleton + the clips we use, in place (pelvis translation
//                                + the rotations that move; rotations as normalised int16)
//   models/characters/ual.json   per clip: role, loop, duration, foot contacts per frame (30 fps), touch-down times,
//                                where each touch-down puts the foot, authored ground speed, take-off / touch-down,
//                                stair riser / tread (the synthesised stair clips)
//
//   node tools/characters/ualBuild.mjs [--ual1 <UAL1_Standard.glb>] [--ual2 <UAL2_Standard.glb>] [--report]
//   node tools/characters/ualBuild.mjs --kid        THE KID (docs/KID.md): the same clips on the kid's skeleton
//
// --kid: reads models/characters/kid_src.glb + kid_rig.json (tools/characters/kid.py: the UAL rig re-proportioned,
// bone ORIENTATIONS unchanged, only the joints' offsets moved) and writes models/characters/kid.glb + kid.json: the
// UAL nodes with the kid's joint offsets (rest translations), the clips' pelvis translation x pelvisScale (the other
// bones' translation channels dropped: they only held the adult rest), the inverse bind matrices of the kid's rest,
// and the kid's three LOD meshes, each merged into ONE primitive with a _SLOT attribute (the named material slot of
// every vertex: the viewer's palette colours it; one draw per LOD) + its AO (COLOR_0). Everything else (contacts,
// touch-downs, speeds, the synthesised stairs) is measured on the kid's own legs by the code below, unchanged.
//
// The metadata is the one tools/characters/mixamoClips.mjs (claude/character2) made for the Y Bot, so the locomotion
// graph (viewer/character/locomotion.js) runs unchanged on this rig. The free UAL has no stair clips: they are
// SYNTHESISED from the walk (stairs(), below): the stride shortened to one tread per step, each stance put on its own
// tread, the swing lifted from tread to tread over the nosing, the legs re-solved (two-bone, the clip's knee plane, the
// foot's world rotation kept): a grid of risers x treads per direction, blended at runtime by the scanned stairs.
import path from "node:path";
import fs from "node:fs";
import { readGLB, sampleAnim, worldPose, q, v } from "./gltfAnim.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RAW = [path.join(ROOT, "data/raw/characters"), path.join(ROOT, "../uccle-city/data/raw/characters")].find((d) => fs.existsSync(d)) || path.join(ROOT, "data/raw/characters");
const UAL1 = path.resolve(arg("--ual1", path.join(RAW, "ual1/x/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb")));
const UAL2 = path.resolve(arg("--ual2", path.join(RAW, "ual2/x/Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb")));
const FPS = 30;
const report = process.argv.includes("--report");
const KID = process.argv.includes("--kid");
const NAME = KID ? "kid" : "ual";

// source clip -> our name, role, loop, root-motion kind ("line": an in-place cycle, "air": jump / fall / land, "none")
const CLIPS = [
  { src: 1, anim: "Idle_Loop", name: "Idle", role: "idle", loop: true, root: "none" },
  { src: 1, anim: "Walk_Loop", name: "Walk", role: "walk", loop: true, root: "line" },
  { src: 1, anim: "Jog_Fwd_Loop", name: "Jog", role: "run", loop: true, root: "line" },
  { src: 1, anim: "Sprint_Loop", name: "Sprint", role: "sprint", loop: true, root: "line" },
  { src: 1, anim: "Crouch_Idle_Loop", name: "CrouchIdle", role: "crouchIdle", loop: true, root: "none" },
  { src: 1, anim: "Crouch_Fwd_Loop", name: "CrouchWalk", role: "crouchWalk", loop: true, root: "line" },
  { src: 1, anim: "Jump_Start", name: "JumpStart", role: "jump", loop: false, root: "air" },
  { src: 1, anim: "Jump_Loop", name: "Fall", role: "fall", loop: true, root: "air" },
  { src: 1, anim: "Jump_Land", name: "Land", role: "land", loop: false, root: "air" },
  { src: 1, anim: "Roll", name: "Roll", role: "roll", loop: false, root: "air" },
  // idle variants (a fidget after standing a while)
  { src: 2, anim: "Idle_FoldArms_Loop", name: "IdleFoldArms", role: "idleAlt1", loop: true, root: "none" },
  { src: 2, anim: "Idle_TalkingPhone_Loop", name: "IdlePhone", role: "idleAlt2", loop: true, root: "none" },
  { src: 1, anim: "Idle_Talking_Loop", name: "IdleTalk", role: "idleAlt3", loop: true, root: "none" },
  // (the kid only: sitting, pushing the bike, picking it up, a fall for the crash)
  ...(KID ? [
    { src: 1, anim: "Sitting_Idle_Loop", name: "Sit", role: "sit", loop: true, root: "none" },
    { src: 1, anim: "Sitting_Enter", name: "SitDown", role: "sitDown", loop: false, root: "none" },
    { src: 1, anim: "Sitting_Exit", name: "StandUp", role: "standUp", loop: false, root: "none" },
    { src: 1, anim: "Push_Loop", name: "Push", role: "push", loop: true, root: "none" },
    { src: 1, anim: "PickUp_Table", name: "PickUp", role: "pickUp", loop: false, root: "none" },
    { src: 1, anim: "Death01", name: "FallDown", role: "fallDown", loop: false, root: "none" },
  ] : []),
];

const g = readGLB(UAL1), g2 = readGLB(UAL2);
const KS = KID ? readGLB(path.join(ROOT, "models/characters/kid_src.glb")) : null;
const KIDRIG = KID ? JSON.parse(fs.readFileSync(path.join(ROOT, "models/characters/kid_rig.json"), "utf8")) : null;
// the AUTHORED ground speeds: the root-motion twin of UAL1 (pelvis travel over the cycle)
const RM = readGLB(arg("--ual1rm", UAL1.replace(/\.glb$/, "_RM.glb")));
function rmSpeed(name) {
  const a = RM.anims.find((x) => x.name === name), i = RM.byName.get("pelvis");
  if (!a) return 0;
  const p0 = worldPose(RM, sampleAnim(RM, a, 0))[i].p, p1 = worldPose(RM, sampleAnim(RM, a, a.duration))[i].p;
  return Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / a.duration * (KID ? KIDRIG.pelvisScale : 1);
}
// (both packs: the same skeleton; UAL2's channels re-pointed at UAL1's nodes by name)
for (const a of g2.anims) for (const ch of a.channels) {
  const j = g.byName.get(g2.nodes[ch.node].name);
  if (j === undefined) throw new Error(`UAL2 node ${g2.nodes[ch.node].name} not in UAL1`);
  ch.node = j;
}
if (KID) {
  // the kid's joints: new rest translations (rotations kept), from kid_rig.json's joint positions (glTF world)
  const W = worldPose(g, sampleAnim(g, null, 0));
  const J = KIDRIG.joints;
  let moved = 0;
  for (const n of g.nodes) {
    if (!(n.name in J) || n.parent < 0) continue;
    const par = g.nodes[n.parent], P = W[n.parent];
    const pp = par.name in J ? J[par.name] : P.p;
    n.t = v.mul(q.rot(q.inv(P.q), v.sub(J[n.name], pp)), 1 / P.s); moved++;
  }
  const W2 = worldPose(g, sampleAnim(g, null, 0));
  let err = 0;
  for (const n of g.nodes) if (n.name in J) err = Math.max(err, v.len(v.sub(W2[n.i].p, J[n.name])));
  if (err > 2e-4) throw new Error(`kid rig: joints off by ${err} m`);
  // the clips: the pelvis translation x k, no other translation / scale channel (they held the adult rest)
  const k = KIDRIG.pelvisScale;
  for (const G of [g, g2]) for (const a of G.anims) {
    a.channels = a.channels.filter((ch) => ch.path === "rotation" || (ch.path === "translation" && g.nodes[ch.node].name === "pelvis"));
    for (const ch of a.channels) if (ch.path === "translation") { const V = new Float32Array(ch.values); for (let i = 0; i < V.length; i++) V[i] *= k; ch.values = V; }
  }
  console.log(`kid rig: ${moved} joints moved (max error ${(err * 1000).toFixed(3)} mm), pelvis x ${k}, height ${KIDRIG.height} m`);
}
const B = (n) => { const i = g.byName.get(n); if (i === undefined) throw new Error("no bone " + n); return i; };
const HIPS = B("pelvis"), LUL = B("thigh_l"), RUL = B("thigh_r");
const FOOT = [B("foot_l"), B("foot_r")], BALL = [B("ball_l"), B("ball_r")], TIP = [B("ball_leaf_l"), B("ball_leaf_r")];
const KNEE = [B("calf_l"), B("calf_r")], UPS = [LUL, RUL];

// the rest (bind) pose: standing heights
const W0 = worldPose(g, sampleAnim(g, null, 0));
const PW0 = W0[g.nodes[HIPS].parent];
const REST = { hipY: W0[HIPS].p[1], ankleY: (W0[FOOT[0]].p[1] + W0[FOOT[1]].p[1]) / 2, ballY: (W0[BALL[0]].p[1] + W0[BALL[1]].p[1]) / 2,
  leg: v.len(v.sub(W0[LUL].p, W0[KNEE[0]].p)) + v.len(v.sub(W0[KNEE[0]].p, W0[FOOT[0]].p)) };

function refresh(f) {
  const W = worldPose(g, f.L); f.W = W; f.hips = W[HIPS].p;
  f.ankle = FOOT.map((i) => W[i].p); f.ball = BALL.map((i) => W[i].p); f.tip = TIP.map((i) => W[i].p);
}
function sample(anim, rate = 1) {
  const n = Math.round(anim.duration / rate * FPS) + 1, F = [];
  for (let k = 0; k < n; k++) {
    const t = Math.min(anim.duration / rate, k / FPS), L = sampleAnim(g, anim, Math.min(anim.duration, t * rate)), W = worldPose(g, L);
    const left = v.sub(W[LUL].p, W[RUL].p);
    const f = { t, L, yaw: Math.atan2(-left[2], left[0]) };
    refresh(f); F.push(f);
  }
  return F;
}
const unwrap = (a) => { for (let k = 1; k < a.length; k++) { while (a[k] - a[k - 1] > Math.PI) a[k] -= 2 * Math.PI; while (a[k] - a[k - 1] < -Math.PI) a[k] += 2 * Math.PI; } return a; };
const smoothArr = (a, r) => a.map((_, k) => { let s = 0, m = 0; for (let j = Math.max(0, k - r); j <= Math.min(a.length - 1, k + r); j++) { s += a[j]; m++; } return s / m; });

/**
 * Foot contacts per frame (as mixamoClips.mjs): an in-place clip first gets back its ground speed (the median backward
 * speed of a ball within 1.5 cm of its standing height), then a foot is planted when its ankle or ball is nearly still
 * (< 0.3 m/s; or < 0.6 m/s rolling on its floor) and low for this foot. `air`: down = within 3 cm of the floor.
 */
function contacts(F, gs, loop, air = false) {
  const n = F.length, dt = 1 / FPS, m = loop ? n - 1 : n;           // (a loop's last frame = its first)
  const P = (f, s, pt, k) => [f[pt][s][0], f[pt][s][1], f[pt][s][2] + gs * k * dt];
  const con = [0, 1].map((s) => {
    const ys = F.map((f) => Math.min(f.ankle[s][1] - REST.ankleY, f.ball[s][1] - REST.ballY)), lo = Math.min(...ys), hi = Math.max(...ys);
    return F.map((f, k) => {
      if (air) return ys[k] < 0.03 ? 1 : 0;
      // (velocity over the neighbours; a loop wraps, its travel carried over)
      let a = k - 1, b = k + 1, ka = a, kb = b;
      if (loop) { if (a < 0) { a += m; ka = a - m; } if (b > m) { b -= m; kb = b + m; } }
      else { a = ka = Math.max(0, a); b = kb = Math.min(n - 1, b); }
      const span = (kb - ka) * dt || 1;
      const sp = (pt) => v.len(v.sub(P(F[b], s, pt, kb), P(F[a], s, pt, ka))) / span;
      const spd = Math.min(sp("ankle"), sp("ball")), onFloor = ys[k] < lo + 0.02;
      const still = spd < 0.3 * Math.max(1, gs / 2) || (onFloor && spd < 0.6 * Math.max(1, gs / 2)), low = ys[k] < lo + (hi - lo) * 0.4 + 0.01;
      return still && low ? 1 : 0;
    });
  });
  // (a contact of 1 frame or a gap of 1-2 frames is noise; loops wrap)
  for (const c of con) {
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < m; k++) {
      const at = (j) => c[loop ? ((j % m) + m) % m : Math.max(0, Math.min(n - 1, j))];
      if (at(k) === at(k - 1)) continue;
      // a run starting at k: its length
      let len = 1; while (len < 3 && at(k + len) === at(k)) len++;
      if (len <= (at(k) ? 1 : 2) && at(k + len) === at(k - 1)) for (let j = 0; j < len; j++) { const i = loop ? (k + j) % m : k + j; if (i < n) c[i] = at(k - 1); }
    }
    if (loop) c[n - 1] = c[0];
  }
  return { con, groundSpeed: gs };
}

/** Two-bone IK on frame f's local pose: leg s's ankle to T, the knee in the clip's knee plane, the foot's world rotation kept. */
function solveLeg(f, s, T) {
  const W = worldPose(g, f.L), iA = UPS[s], iB = KNEE[s], iC = FOOT[s];
  const A = W[iA].p, Bp = W[iB].p, C = W[iC].p, footQ = W[iC].q;
  const l1 = v.len(v.sub(Bp, A)), l2 = v.len(v.sub(C, Bp));
  const dv = v.sub(T, A);
  let d = v.len(dv);
  const dir = v.mul(dv, 1 / d);
  d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
  let perp = v.sub(v.sub(Bp, A), v.mul(dir, v.dot(v.sub(Bp, A), dir)));
  const fw = v.sub([0, 0, 1], v.mul(dir, dir[2]));
  perp = v.add(perp, v.mul(v.norm(fw), 0.03));
  if (v.dot(perp, fw) < 0) perp = v.sub(perp, v.mul(v.norm(fw), v.dot(perp, v.norm(fw)) * 1.2));
  if (v.len(perp) < 1e-6) perp = [0, 0, 1];
  perp = v.norm(perp);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const Bn = v.add(v.add(A, v.mul(dir, a)), v.mul(perp, h)), Cn = v.add(A, v.mul(dir, d));
  const turn = (from, to) => { const x = v.norm(from), y = v.norm(to), c = v.dot(x, y), ax = v.cross(x, y), sl = v.len(ax); return sl < 1e-9 ? [0, 0, 0, 1] : q.axisAngle(v.mul(ax, 1 / sl), Math.atan2(sl, c)); };
  const setWorld = (Wc, i, wq) => { const Pq = Wc[g.nodes[i].parent]; f.L[i].r = q.norm(q.mul(q.inv(Pq.q), wq)); };
  setWorld(W, iA, q.norm(q.mul(turn(v.sub(Bp, A), v.sub(Bn, A)), W[iA].q)));
  let W2 = worldPose(g, f.L);
  setWorld(W2, iB, q.norm(q.mul(turn(v.sub(W2[iC].p, W2[iB].p), v.sub(Cn, W2[iB].p)), W2[iB].q)));
  W2 = worldPose(g, f.L);
  f.L[iC].r = q.norm(q.mul(q.inv(W2[iB].q), footQ));
  return v.len(dv) - d;           // (> 0: out of reach by this much)
}

/** Clip metadata (mixamoClips.mjs format) from sampled frames + their root path. */
function metaOf(def, F, root, con, groundSpeed) {
  const n = F.length, dur = F[n - 1].t, f0 = F[0], f1 = F[n - 1];
  const travel = Math.hypot(f1.hips[0] - f0.hips[0], f1.hips[2] - f0.hips[2]), rise = root[n - 1][1] - root[0][1];
  // touch-downs: a contact starting (a loop: its last frame is its first, wrapped)
  const m1 = def.loop ? n - 1 : n, down = (s, k) => k < m1 && con[s][k] && (def.loop ? !con[s][(k - 1 + m1) % m1] : k > 0 && !con[s][k - 1]);
  const steps = [0, 1].map((s) => con[s].map((c, k) => (down(s, k) ? +(F[k].t / dur).toFixed(3) : null)).filter((x) => x !== null));
  const stepPos = [0, 1].map((s) => con[s].map((c, k) => (down(s, k) ? k : -1)).filter((k) => k >= 0).map((k) => {
    const f = F[k], r = root[k], mx = (f.ankle[s][0] + f.ball[s][0]) / 2, mz = (f.ankle[s][2] + f.ball[s][2]) / 2;
    return [+(f.t / dur).toFixed(3), +(mx - r[0]).toFixed(3), +(mz - r[2]).toFixed(3), +(f.ankle[s][1] - REST.ankleY - r[1]).toFixed(3)];
  }));
  const both = con[0].map((c, k) => c || con[1][k]);
  const takeoff = both.findIndex((x, k) => k > 0 && !x && both[k - 1]), touchdown = both.findIndex((x, k) => k > 0 && x && !both[k - 1]);
  const m = { file: `${NAME}.glb`, role: def.role, loop: def.loop, duration: +dur.toFixed(4), source: def.source, contact: con.map((a) => a.join("")), steps, stepPos };
  if (def.root === "line") m.speed = +(travel < 0.05 ? groundSpeed : travel / dur).toFixed(3);
  if (def.root === "air") { m.takeoff = takeoff > 0 ? +F[takeoff].t.toFixed(3) : null; m.touchdown = touchdown > 0 ? +F[touchdown].t.toFixed(3) : null; }
  return { m, travel, rise };
}

const out = [], meta = {};
for (const def of CLIPS) {
  const anim = (def.src === 2 ? g2 : g).anims.find((a) => a.name === def.anim);
  if (!anim) { console.warn(`(missing ${def.anim} in UAL${def.src})`); continue; }
  def.source = `UAL${def.src}_Standard.glb:${def.anim}`;
  const F = sample(anim), n = F.length, f0 = F[0];
  const root = F.map(() => [f0.hips[0], 0, f0.hips[2], 0]);         // (all in place: the non-RM files)
  const gs0 = def.root === "line" ? rmSpeed(def.anim) : 0;
  const { con, groundSpeed } = contacts(F, gs0, def.loop, def.root === "air");
  const { m } = metaOf(def, F, root, con, groundSpeed);
  // (the jump clip ends in the air: no touch-down of its own; the landing clip touches down when both ankles reach
  // their standing height, its contacts from there)
  // (in the air nothing is planted: a hanging leg's foot near the clip's floor is not a contact)
  if (def.role === "jump") {
    m.touchdown = null;
    const k0 = Math.round((m.takeoff ?? 0) * FPS);
    for (const c of con) for (let j = k0; j < n; j++) c[j] = 0;
    m.contact = con.map((a) => a.join(""));
    m.steps = [[], []]; m.stepPos = [[], []];
  }
  if (def.role === "fall") { for (const c of con) c.fill(0); m.contact = con.map((a) => a.join("")); m.steps = [[], []]; m.stepPos = [[], []]; }
  if (def.role === "land") {
    const k = F.findIndex((f) => Math.max(f.ankle[0][1], f.ankle[1][1]) - REST.ankleY < 0.012);
    m.touchdown = k > 0 ? +F[k].t.toFixed(3) : 0;
    for (const c of con) for (let j = 0; j < Math.max(0, k); j++) c[j] = 0;
    m.contact = con.map((a) => a.join(""));
  }
  meta[def.name] = m;
  console.log(`${def.name.padEnd(13)} <- ${def.anim.padEnd(24)} ${n} fr ${m.duration.toFixed(2)} s  steps L ${m.steps[0].join(",")} R ${m.steps[1].join(",")}${m.speed !== undefined ? `  speed ${m.speed}` : ""}${m.takeoff !== undefined ? `  takeoff ${m.takeoff} touchdown ${m.touchdown}` : ""}`);
  if (report) for (let s = 0; s < 2; s++) console.log(`   ${s ? "R" : "L"} ${con[s].join("")}`);
  out.push({ def, F, root, con, gs: groundSpeed });
}
console.log(`rest: hips ${REST.hipY.toFixed(3)} ankle ${REST.ankleY.toFixed(3)} ball ${REST.ballY.toFixed(3)} leg ${REST.leg.toFixed(3)} m`);

/**
 * STAIR CLIPS synthesised from the walk (no stair clip in the free UAL). For a stair of riser R, tread T, going dir:
 *   - the cycle keeps the walk's timing (x `cad`: a little quicker steps), the root advances 2T per cycle (one tread a
 *     step) and rises 2R dir
 *   - each foot's forward offset from the root is scaled by T / the walk's step length (stance slides back at the
 *     stairs' speed: a planted foot stays on its tread)
 *   - each stance on its own tread: the touch-downs in order, one riser up (down) each; a swing goes from its lift-off
 *     tread to its landing tread, eased early going up (over the nosing first), late going down (forward, then down)
 *   - the hips stay above the root line, lowered just enough that every ankle is within reach; the legs re-solved
 * Written in place (the root's travel and rise taken off) with stairs { riser, tread, dir } in the metadata.
 */
const RISERS = [0.12, 0.16, 0.20], TREADS = [0.26, 0.32];
// (the walk resampled STAIR_RATE x quicker: ~1.9 steps a second, the cadence people climb at)
const STAIR_RATE = 1.25;
const walk = (() => {
  const e = out.find((x) => x.def.role === "walk"), F = sample(g.anims.find((a) => a.name === e.def.anim), STAIR_RATE), gs = rmSpeed(e.def.anim) * STAIR_RATE;
  return { def: e.def, F, gs, con: contacts(F, gs, true).con };
})();
function stairs(dir, R, T, base) {
  const W = walk, n = W.F.length, dur = W.F[n - 1].t, stepLen = W.gs * dur / 2, sT = T / stepLen;
  const con = W.con.map((c) => c.slice());
  // touch-downs of the cycle in order, each one level further
  const tds = [];
  for (let s = 0; s < 2; s++) for (let k = 0; k < n - 1; k++) if (con[s][k] && !con[s][(k - 1 + n - 1) % (n - 1)]) tds.push({ s, k });
  tds.sort((a, b) => a.k - b.k);
  const N = tds.length;                         // (2: one per foot)
  const ev = [];
  for (let c = -1; c <= 1; c++) tds.forEach((t, j) => ev.push({ s: t.s, k: t.k + c * (n - 1), lvl: (j + c * N) * R * dir }));
  const offs = [];
  for (let s = 0; s < 2; s++) for (let k = 0; k < n - 1; k++) if (!con[s][k] && con[s][(k - 1 + n - 1) % (n - 1)]) for (let c = -1; c <= 1; c++) offs.push({ s, k: k + c * (n - 1) });
  const level = (s, k) => {
    const prev = ev.filter((e) => e.s === s && e.k <= k).pop(), next = ev.find((e) => e.s === s && e.k > k);
    if (con[s][k] || !next) return prev.lvl;
    const lo = offs.filter((o) => o.s === s && o.k <= k && o.k > prev.k).pop()?.k ?? prev.k;
    let u = Math.min(1, Math.max(0, (k - lo + 1) / (next.k - lo + 1)));
    u = dir > 0 ? 1 - (1 - u) * (1 - u) : u * u;                 // (up: over the nosing early; down: forward, then down)
    const e = u * u * (3 - 2 * u);
    return prev.lvl + (next.lvl - prev.lvl) * e;
  };
  // the root line: rises N R dir over the cycle, through the mean of the two feet's treads (where the runtime's ground
  // line puts the body: index.js _bodyY)
  const rise = N * R * dir, z0 = W.F[0].hips[2], U = (k) => k / (n - 1);
  let c0 = 0;
  for (let k = 0; k < n; k++) c0 += (level(0, k) + level(1, k)) * 0.5 - rise * U(k);
  c0 /= n;
  const lineAt = (k) => rise * U(k) + c0;
  const F = W.F.map((f) => ({ t: f.t, L: f.L.map((l) => ({ t: l.t.slice(), r: l.r.slice(), s: l.s.slice() })) }));
  F.forEach(refresh);
  const root = F.map((f, k) => [W.F[0].hips[0], lineAt(k), z0 + 2 * T * U(k), 0]);
  // the ankles: the walk's offset from its (in-place) root, forward scaled by sT, on the stance's tread (the walk's own
  // swing lift on top)
  const tgt = W.F.map((f, k) => [0, 1].map((s) => {
    const an = f.ankle[s];
    return [an[0], an[1] + level(s, k), z0 + (an[2] - z0) * sT + 2 * T * U(k)];
  }));
  // the hips: the walk's, above the root line, lowered so every ankle is in reach (and a softer knee on stairs), leaning
  // a little into the climb
  const lean = 0.03 * dir * Math.min(1, R / 0.15);
  let drop = 0;
  for (let k = 0; k < n; k++) for (let s = 0; s < 2; s++) {
    const hp = W.F[k].W[UPS[s]].p, hip = [hp[0], hp[1] + lineAt(k), hp[2] - z0 + z0 + 2 * T * U(k) + lean];
    const d = v.len(v.sub(tgt[k][s], hip)) - REST.leg * 0.985;
    if (d > drop) drop = d;
  }
  drop = Math.min(0.15, drop + 0.01 + 0.08 * R);
  let miss = 0;
  for (let k = 0; k < n; k++) {
    const f = F[k], hw0 = W.F[k].hips;
    const hw = [hw0[0], hw0[1] - drop + lineAt(k), hw0[2] + 2 * T * U(k) + lean];
    f.L[HIPS].t = v.mul(q.rot(q.inv(PW0.q), v.sub(hw, PW0.p)), 1 / PW0.s);
    for (let s = 0; s < 2; s++) miss = Math.max(miss, solveLeg(f, s, tgt[k][s]));
    refresh(f);
  }
  const def = { name: base ? `Stairs${dir > 0 ? "Up" : "Down"}` : `Stairs${dir > 0 ? "Up" : "Down"}_${Math.round(R * 100)}_${Math.round(T * 100)}`, role: dir > 0 ? "stairsUp" : "stairsDown", loop: true, root: "line", source: `synthesised from ${walk.def.source}` };
  const { m } = metaOf(def, F, root, con, 0);
  m.speed = +(2 * T / dur).toFixed(3);
  m.stairs = { riser: R, tread: T, dir, steps: N, ...(base ? {} : { variantOf: def.name.replace(/_.*/, "") }) };
  meta[def.name] = m;
  out.push({ def, F, root, con });
  return { drop, miss };
}
for (const dir of [1, -1]) {
  const r = stairs(dir, 0.17, 0.29, true);
  console.log(`Stairs${dir > 0 ? "Up" : "Down"} (base 17/29): hips -${(r.drop * 100).toFixed(1)} cm, reach miss ${(r.miss * 100).toFixed(1)} cm`);
  for (const R of RISERS) for (const T of TREADS) {
    const r2 = stairs(dir, R, T, false);
    if (r2.miss > 0.01) console.warn(`  ${dir > 0 ? "up" : "down"} ${R}/${T}: a foot ${(r2.miss * 100).toFixed(1)} cm out of reach`);
  }
}
if (report) process.exit(0);

// ------------------------------------------------------------------------------------------------ write ual.glb
const J = g.json, acc = (i) => g.accessor(i);
const chunks = [], bufferViews = [], accessors = [];
let off = 0;
function addView(buf, target) {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength), pad = (4 - (b.length % 4)) % 4;
  chunks.push(b, Buffer.alloc(pad));
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) });
  off += b.length + pad;
  return bufferViews.length - 1;
}
function addAcc(arr, type, componentType, extra = {}, target) {
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
  accessors.push({ bufferView: addView(arr, target), componentType, count: arr.length / N, type, ...extra });
  return accessors.length - 1;
}
const minmax = (a, N) => { const mn = Array(N).fill(Infinity), mx = Array(N).fill(-Infinity); for (let i = 0; i < a.length; i++) { const c = i % N; if (a[i] < mn[c]) mn[c] = a[i]; if (a[i] > mx[c]) mx[c] = a[i]; } return { min: mn, max: mx }; };

let meshesOut, aIbm;
const skin = J.skins[0];
if (!KID) {
  // the mesh: both primitives -> one, colour per vertex from its material (the placeholder mannequin: light body, dark joints)
  const COL = { M_Main: [0.56, 0.55, 0.53], M_Joints: [0.10, 0.10, 0.11] };
  const prims = J.meshes[0].primitives;
  let nv = 0, ni = 0;
  for (const p of prims) { nv += J.accessors[p.attributes.POSITION].count; ni += J.accessors[p.indices].count; }
  const POS = new Float32Array(nv * 3), NRM = new Float32Array(nv * 3), JNT = new Uint8Array(nv * 4), WGT = new Float32Array(nv * 4), CLR = new Uint8Array(nv * 4);
  const IDX = new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const p of prims) {
    const P = acc(p.attributes.POSITION), Nn = acc(p.attributes.NORMAL), Jt = acc(p.attributes.JOINTS_0), Wt = acc(p.attributes.WEIGHTS_0), I = acc(p.indices);
    const cnt = P.length / 3, c = COL[J.materials[p.material].name] || [0.5, 0.5, 0.5];
    POS.set(P, vo * 3); NRM.set(Nn, vo * 3);
    for (let i = 0; i < cnt * 4; i++) JNT[vo * 4 + i] = Jt[i];
    for (let i = 0; i < cnt; i++) {
      let s = 0; for (let k = 0; k < 4; k++) s += Wt[i * 4 + k];
      for (let k = 0; k < 4; k++) WGT[(vo + i) * 4 + k] = Wt[i * 4 + k] / (s || 1);
      // (glTF COLOR_0 is linear; sRGB-ish authoring values converted)
      for (let k = 0; k < 3; k++) CLR[(vo + i) * 4 + k] = Math.round(Math.pow(c[k], 2.2) * 255);
      CLR[(vo + i) * 4 + 3] = 255;
    }
    for (let i = 0; i < I.length; i++) IDX[io + i] = I[i] + vo;
    vo += cnt; io += I.length;
  }
  const aPos = addAcc(POS, "VEC3", 5126, minmax(POS, 3), 34962), aNrm = addAcc(NRM, "VEC3", 5126, {}, 34962);
  const aJnt = addAcc(JNT, "VEC4", 5121, {}, 34962), aWgt = addAcc(WGT, "VEC4", 5126, {}, 34962), aClr = addAcc(CLR, "VEC4", 5121, { normalized: true }, 34962);
  const aIdx = addAcc(IDX, "SCALAR", 5123, {}, 34963);
  meshesOut = [{ name: "Mannequin", primitives: [{ attributes: { POSITION: aPos, NORMAL: aNrm, JOINTS_0: aJnt, WEIGHTS_0: aWgt, COLOR_0: aClr }, indices: aIdx, material: 0 }] }];
} else {
  // the kid's LOD meshes (kid_src.glb), each merged into one primitive with a _SLOT attribute; joints remapped by name
  const KJ = KS.json, kjoints = KJ.skins[0].joints.map((ni) => KS.nodes[ni].name);
  const ujoint = new Map(skin.joints.map((ni, k) => [g.nodes[ni].name, k]));
  const jmap = kjoints.map((n) => { if (!ujoint.has(n)) throw new Error("kid joint not in UAL: " + n); return ujoint.get(n); });
  const slots = KJ.materials.map((m) => m.name);
  meshesOut = [];
  const lodNodes = KJ.nodes.filter((n) => n.mesh !== undefined).sort((x, y) => x.name.localeCompare(y.name));
  for (const nd of lodNodes) {
    const prims = KJ.meshes[nd.mesh].primitives;
    let nv = 0, ni = 0;
    for (const p of prims) { nv += KJ.accessors[p.attributes.POSITION].count; ni += KJ.accessors[p.indices].count; }
    const POS = new Float32Array(nv * 3), NRM = new Float32Array(nv * 3), JNT = new Uint8Array(nv * 4), WGT = new Float32Array(nv * 4), AO = new Uint8Array(nv * 4), SLOT = new Float32Array(nv);
    const IDX = nv < 65536 ? new Uint16Array(ni) : new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const p of prims) {
      const P = KS.accessor(p.attributes.POSITION), Nn = KS.accessor(p.attributes.NORMAL), Jt = KS.accessor(p.attributes.JOINTS_0), Wt = KS.accessor(p.attributes.WEIGHTS_0), I = KS.accessor(p.indices);
      const C = p.attributes.COLOR_0 !== undefined ? KS.accessor(p.attributes.COLOR_0) : null, cnt = P.length / 3, cn = C ? C.length / cnt : 0;
      POS.set(P, vo * 3); NRM.set(Nn, vo * 3);
      for (let i = 0; i < cnt; i++) {
        let sw = 0; for (let kk = 0; kk < 4; kk++) sw += Wt[i * 4 + kk];
        for (let kk = 0; kk < 4; kk++) { JNT[(vo + i) * 4 + kk] = jmap[Jt[i * 4 + kk]]; WGT[(vo + i) * 4 + kk] = Wt[i * 4 + kk] / (sw || 1); }
        const ao = C ? C[i * cn] : 1;
        for (let kk = 0; kk < 3; kk++) AO[(vo + i) * 4 + kk] = Math.round(Math.max(0, Math.min(1, ao)) * 255);
        AO[(vo + i) * 4 + 3] = 255; SLOT[vo + i] = p.material;
      }
      for (let i = 0; i < I.length; i++) IDX[io + i] = I[i] + vo;
      vo += cnt; io += I.length;
    }
    const aPos = addAcc(POS, "VEC3", 5126, minmax(POS, 3), 34962), aNrm = addAcc(NRM, "VEC3", 5126, {}, 34962);
    const aJnt = addAcc(JNT, "VEC4", 5121, {}, 34962), aWgt = addAcc(WGT, "VEC4", 5126, {}, 34962), aClr = addAcc(AO, "VEC4", 5121, { normalized: true }, 34962);
    const aSlot = addAcc(SLOT, "SCALAR", 5126, {}, 34962), aIdx = addAcc(IDX, "SCALAR", nv < 65536 ? 5123 : 5125, {}, 34963);
    meshesOut.push({ name: nd.name, extras: { slots, tris: ni / 3 }, primitives: [{ attributes: { POSITION: aPos, NORMAL: aNrm, JOINTS_0: aJnt, WEIGHTS_0: aWgt, COLOR_0: aClr, _SLOT: aSlot }, indices: aIdx, material: 0 }] });
    console.log(`  ${nd.name}: ${nv} verts ${ni / 3} tris, ${prims.length} slots merged`);
  }
}
// the inverse bind matrices: the original (UAL) or the kid's rest
if (!KID) aIbm = addAcc(acc(skin.inverseBindMatrices), "MAT4", 5126);
else {
  const W = worldPose(g, sampleAnim(g, null, 0)), M = new Float32Array(skin.joints.length * 16);
  skin.joints.forEach((ni, k) => {
    const { p, q: r, s: sc } = W[ni], [x, y, z, w] = r;
    // world = T R S (uniform s); inverse = (R^T / s, -R^T p / s). R as rows: R[row * 3 + col]
    const R = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
    const o = k * 16;
    // inverse rotation Ri = R^T: Ri[row][col] = R[col][row]; column-major storage M[col * 4 + row]
    for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) M[o + col * 4 + row] = R[col * 3 + row] / sc;
    for (let row = 0; row < 3; row++) M[o + 12 + row] = -(R[0 * 3 + row] * p[0] + R[1 * 3 + row] * p[1] + R[2 * 3 + row] * p[2]) / sc;
    M[o + 15] = 1;
  });
  aIbm = addAcc(M, "MAT4", 5126);
}

// the clips: pelvis translation (root taken off) + the rotations that move or differ from rest (int16 normalised)
const animations = [];
const rest = g.nodes;
let animBytes = 0;
for (const { def, F, root } of out) {
  const n = F.length, times = new Float32Array(n);
  F.forEach((f, k) => { times[k] = f.t; });
  const input = addAcc(times, "SCALAR", 5126, { min: [0], max: [times[n - 1]] });
  const samplers = [], channels = [];
  for (let i = 0; i < g.nodes.length; i++) {
    if (rest[i].name === "root" || rest[i].name === "Armature" || J.nodes[i].mesh !== undefined) continue;
    let moves = false;
    const r0 = F[0].L[i].r;
    for (let k = 0; k < n && !moves; k++) { const r = F[k].L[i].r; if (q.angle(r, rest[i].r) > 2e-4 || q.angle(r, r0) > 2e-4) moves = true; }
    if (!moves) continue;
    const R = new Int16Array(n * 4);
    let prev = null;
    F.forEach((f, k) => {
      let r = f.L[i].r;
      if (prev && r[0] * prev[0] + r[1] * prev[1] + r[2] * prev[2] + r[3] * prev[3] < 0) r = r.map((x) => -x);      // (hemisphere continuity)
      prev = r;
      for (let c = 0; c < 4; c++) R[k * 4 + c] = Math.round(Math.max(-1, Math.min(1, r[c])) * 32767);
    });
    samplers.push({ input, output: addAcc(R, "VEC4", 5122, { normalized: true }), interpolation: "LINEAR" });
    channels.push({ sampler: samplers.length - 1, target: { node: i, path: "rotation" } });
    animBytes += R.byteLength;
  }
  const P = new Float32Array(n * 3);
  F.forEach((f, k) => {
    const r = root[k], d = [r[0] - root[0][0], r[1], r[2] - root[0][2]];
    const w = v.sub(f.hips, d);
    P.set(v.mul(q.rot(q.inv(PW0.q), v.sub(w, PW0.p)), 1 / PW0.s), k * 3);
  });
  samplers.push({ input, output: addAcc(P, "VEC3", 5126), interpolation: "LINEAR" });
  channels.push({ sampler: samplers.length - 1, target: { node: HIPS, path: "translation" } });
  animBytes += P.byteLength + times.byteLength;
  animations.push({ name: def.name, samplers, channels });
}

const nodes = J.nodes.map((nd, i) => {
  if (KID && g.nodes[i].name in KIDRIG.joints) nd = { ...nd, translation: g.nodes[i].t };
  const o = { name: nd.name };
  for (const k of ["children", "translation", "rotation", "scale", "skin"]) if (nd[k] !== undefined) o[k] = nd[k];
  if (nd.mesh !== undefined) o.mesh = 0;
  return o;
});
if (KID) {
  // the LOD meshes: one node each, skinned to the same skin (the mannequin's node becomes LOD0)
  const mi = nodes.findIndex((n) => n.mesh !== undefined);
  nodes[mi].name = meshesOut[0].name;
  const parent = J.nodes.findIndex((n) => (n.children || []).includes(mi));
  for (let l = 1; l < meshesOut.length; l++) { nodes.push({ name: meshesOut[l].name, mesh: l, skin: nodes[mi].skin }); nodes[parent].children = [...nodes[parent].children, nodes.length - 1]; }
}
const json = {
  asset: { version: "2.0", generator: "uccle-city tools/characters/ualBuild.mjs", copyright: KID ? "the kid: tools/characters/kid.py on the Quaternius Universal Animation Library 1 + 2 rig and clips (Standard, CC0 1.0)" : "Quaternius, Universal Animation Library 1 + 2 (Standard), CC0 1.0" },
  scene: 0, scenes: [{ nodes: J.scenes[J.scene || 0].nodes }],
  nodes,
  meshes: meshesOut,
  materials: [{ name: KID ? "kid" : "mannequin", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
  skins: [{ joints: skin.joints, inverseBindMatrices: aIbm, ...(skin.skeleton !== undefined ? { skeleton: skin.skeleton } : {}) }],
  animations, accessors, bufferViews, buffers: [{ byteLength: off }],
};
const pad = (b, c) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, c)]);
const jb = pad(Buffer.from(JSON.stringify(json), "utf8"), 0x20), bb = pad(Buffer.concat(chunks), 0);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bb.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jb.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bb.length, 0); bh.writeUInt32LE(0x004e4942, 4);
const OUT = path.join(ROOT, `models/characters/${NAME}.glb`);
fs.writeFileSync(OUT, Buffer.concat([head, jh, jb, bh, bb]));
fs.writeFileSync(path.join(ROOT, `models/characters/${NAME}.json`), JSON.stringify({ model: `${NAME}.glb`, fps: FPS, rest: Object.fromEntries(Object.entries(REST).map(([k, x]) => [k, +x.toFixed(4)])),
  ...(KID ? { kid: { height: KIDRIG.height, pelvisScale: KIDRIG.pelvisScale, slots: KIDRIG.slots, tris: meshesOut.map((m) => m.extras.tris), outfit: KIDRIG.outfit, sole: KIDRIG.sole } } : {}), clips: meta }, null, 1));
console.log(`wrote models/characters/${NAME}.glb (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB: ${meshesOut.map((m) => m.name).join(" / ")}, ${animations.length} clips ${(animBytes / 1024).toFixed(0)} KB) + ${NAME}.json`);
