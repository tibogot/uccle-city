// MIXAMO CLIPS for the Y Bot (no retargeting: one skeleton). Reads the pack tools/blender/mixamoPack.py made
// (the clips as authored, root motion in the hips) and writes, for the viewer:
//   models/characters/ybot_clips.glb   the clips IN PLACE: the root's travel (and turn) taken off the hips, only the
//                                      tracks that move (hips translation + every bone's rotation), git-ignored
//   models/characters/ybot.json        per clip: role, loop, duration, foot contacts per frame, step times, authored
//                                      ground speed, the root motion taken out (a curve the controller can follow),
//                                      stair riser / tread, turn angle, take-off / touch-down
//
//   node tools/characters/mixamoClips.mjs [--pack <pack.glb>] [--report]
//
// ROOT MOTION. The root = the hips projected on the clip's floor, heading = the body's (the line between the thighs).
//   loops (walk, run, stairs): a straight line from the first frame to the last (the cycle's own drift) incl. the rise
//     of a stair clip: the clip then repeats in place and the controller / the ground carry the body.
//   one-shots (start / stop): the hips' path smoothed (0.3 s window): the hips' sway stays in the pose, the travel is
//     taken out and kept as a distance curve (distance matching: the body plays the clip at the distance it covered).
//   turns: the heading's turn (smoothed) taken out of the hips' rotation; the angle curve is kept (the body turns the
//     character by it, so the planted feet stay put in the world).
//   jump / fall / land: the vertical travel above the standing hips height while airborne (the controller flies).
import path from "node:path";
import fs from "node:fs";
import { readGLB, sampleAnim, worldPose, writeClipsGLB, q, v } from "./gltfAnim.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PACK = path.resolve(arg("--pack", path.join(ROOT, "data/raw/animations/mixamo/glb/pack.glb")));
const FPS = 30;

// file name -> our clip name, role, loop, root-motion kind
const CLIPS = {
  "Idle (1)": { name: "Idle", role: "idle", loop: true, root: "none" },
  "Walking": { name: "Walk", role: "walk", loop: true, root: "line" },
  "Running": { name: "Run", role: "run", loop: true, root: "line" },
  "Start Walking": { name: "WalkStart", role: "walkStart", loop: false, root: "path" },
  "Stop Walking": { name: "WalkStop", role: "walkStop", loop: false, root: "path" },
  "Left Turn": { name: "TurnL", role: "turnL", loop: false, root: "turn" },
  "Right Turn": { name: "TurnR", role: "turnR", loop: false, root: "turn" },
  "Walking Up The Stairs": { name: "StairsUp", role: "stairsUp", loop: true, root: "line" },
  "Running Up Stairs": { name: "StairsUpRun", role: "stairsUpRun", loop: true, root: "line" },
  // (Mixamo's descent keeps both feet on ONE flat floor while the hips go down a riser per step: repaired, see below)
  "Descending Stairs": { name: "StairsDown", role: "stairsDown", loop: true, root: "line", repairDown: true },
  "Walking Down The Stairs": { name: "StairsDown", role: "stairsDown", loop: true, root: "line" },
  "Running Down Stairs": { name: "StairsDownRun", role: "stairsDownRun", loop: true, root: "line" },
  "Jumping": { name: "Jump", role: "jump", loop: false, root: "air" },
  "Falling Idle": { name: "Fall", role: "fall", loop: true, root: "air" },
  "Falling To Landing": { name: "Land", role: "land", loop: false, root: "air" },
};

const g = readGLB(PACK);
const B = (n) => { const i = g.nodes.findIndex((x) => x.name === "mixamorig:" + n); if (i < 0) throw new Error("no bone " + n); return i; };
const HIPS = B("Hips"), LUL = B("LeftUpLeg"), RUL = B("RightUpLeg");
const FOOT = [B("LeftFoot"), B("RightFoot")], BALL = [B("LeftToeBase"), B("RightToeBase")], TIP = [B("LeftToe_End"), B("RightToe_End")];
const KNEE = [B("LeftLeg"), B("RightLeg")];

// the rest (bind) pose: standing heights
const W0 = worldPose(g, sampleAnim(g, null, 0));
const PW0 = W0[g.nodes[B("Hips")].parent];
const REST = { hipY: W0[HIPS].p[1], ankleY: (W0[FOOT[0]].p[1] + W0[FOOT[1]].p[1]) / 2, ballY: (W0[BALL[0]].p[1] + W0[BALL[1]].p[1]) / 2,
  leg: v.len(v.sub(W0[LUL].p, W0[KNEE[0]].p)) + v.len(v.sub(W0[KNEE[0]].p, W0[FOOT[0]].p)) };

function sample(anim) {
  const n = Math.round(anim.duration * FPS) + 1, F = [];
  for (let k = 0; k < n; k++) {
    const t = Math.min(anim.duration, k / FPS), L = sampleAnim(g, anim, t), W = worldPose(g, L);
    const left = v.sub(W[LUL].p, W[RUL].p);
    F.push({ t, L, W, hips: W[HIPS].p, yaw: Math.atan2(-left[2], left[0]),     // heading: 0 = facing +z (left = +x)
      ankle: FOOT.map((i) => W[i].p), ball: BALL.map((i) => W[i].p), tip: TIP.map((i) => W[i].p) });
  }
  return F;
}
const unwrap = (a) => { for (let k = 1; k < a.length; k++) { while (a[k] - a[k - 1] > Math.PI) a[k] -= 2 * Math.PI; while (a[k] - a[k - 1] < -Math.PI) a[k] += 2 * Math.PI; } return a; };
const smoothArr = (a, r) => a.map((_, k) => { let s = 0, m = 0; for (let j = Math.max(0, k - r); j <= Math.min(a.length - 1, k + r); j++) { s += a[j]; m++; } return s / m; });

/**
 * Foot contacts from the clip itself, per frame, in the WORLD the clip was authored in: an in-place clip is first given
 * back its ground speed (the speed that makes the lowest foot stand still: the median backward speed of each foot's
 * lowest third), then a foot is planted when its ankle or its ball is nearly still (< 0.3 m/s, 3D: also on stairs,
 * where the floor is a step per tread) and that point is low for this foot (in the lower 40 % of its own range, or a
 * stair clip's: any height). Returns { con: [L, R] arrays of 0/1, groundSpeed }.
 */
function contacts(F, inPlace, stairs, air = false) {
  const n = F.length, dt = 1 / FPS;
  let gs = 0;
  if (inPlace) {
    // (the ball of a planted foot sits within 1.5 cm of its standing height: its backward speed there is the ground speed)
    const vs = [];
    for (let s = 0; s < 2; s++) for (let k = 1; k < n - 1; k++)
      if (F[k].ball[s][1] - REST.ballY < 0.015 && F[k - 1].ball[s][1] - REST.ballY < 0.015 && F[k + 1].ball[s][1] - REST.ballY < 0.015) vs.push(-(F[k + 1].ball[s][2] - F[k - 1].ball[s][2]) / (2 * dt));
    vs.sort((a, b) => a - b); gs = vs.length ? vs[vs.length >> 1] : 0;
    if (gs < 0.1) gs = 0;
  }
  const P = (f, s, pt, k) => [f[pt][s][0], f[pt][s][1], f[pt][s][2] + gs * k * dt];
  const con = [0, 1].map((s) => {
    const ys = F.map((f) => Math.min(f.ankle[s][1] - REST.ankleY, f.ball[s][1] - REST.ballY)), lo = Math.min(...ys), hi = Math.max(...ys);
    return F.map((f, k) => {
      const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1), span = (b - a) * dt || 1;
      const sp = (pt) => v.len(v.sub(P(F[b], s, pt, b), P(F[a], s, pt, a))) / span;
      if (air) return ys[k] < 0.03 ? 1 : 0;
      // (still: < 0.3 m/s; or a foot on the floor rolling over its heel / ball (< 0.6 m/s, within 2 cm of its floor
      // height): the heel strike and the toe-off are contact too, a walk has double support)
      const spd = Math.min(sp("ankle"), sp("ball")), onFloor = ys[k] < lo + 0.02;
      const still = spd < 0.3 || (onFloor && spd < 0.6), low = stairs || ys[k] < lo + (hi - lo) * 0.4 + 0.01;
      return still && low ? 1 : 0;
    });
  });
  return { con, groundSpeed: gs };
}

/**
 * REPAIR a descent clip whose feet never leave the flat floor (Mixamo's "Descending Stairs": the hips drop a riser per
 * step, the stride and timing are a real descent, but every stance is at the starting floor's height). Each stance is
 * put on its own tread: the touch-downs in order, one riser lower each (the stance running at frame 0 = the starting
 * tread); a swing goes from its lift-off tread to its landing tread (smoothstep, the clip's own lift on top). The legs
 * are re-solved to the moved ankles (two-bone, knee in the clip's knee plane, the foot's world rotation kept), so the
 * hips, the upper body and the timing stay as authored.
 */
const KNEES = KNEE, UPS = [LUL, RUL];
function repairDown(F, con, rise) {
  const n = F.length, tds = [];
  for (let s = 0; s < 2; s++) for (let k = 0; k < n; k++) if (con[s][k] && !con[s][(k - 1 + n) % n]) tds.push({ s, k });
  tds.sort((a, b) => a.k - b.k);
  const N = tds.length, r = Math.abs(rise) / N;
  // touch-downs over three cycles (periodic): level of the j-th of the middle cycle = -(j + 1) r; one cycle earlier +N r
  const ev = [];
  for (let c = -1; c <= 1; c++) tds.forEach((t, j) => ev.push({ s: t.s, k: t.k + c * (n - 1), lvl: -(j + 1) * r - c * N * r }));
  // lift-offs: the last stance frame + 1 of each foot (periodic too)
  const offs = [];
  for (let s = 0; s < 2; s++) for (let k = 0; k < n; k++) if (!con[s][k] && con[s][(k - 1 + n) % n]) for (let c = -1; c <= 1; c++) offs.push({ s, k: k + c * (n - 1) });
  const level = (s, k) => {
    const prev = ev.filter((e) => e.s === s && e.k <= k).pop(), next = ev.find((e) => e.s === s && e.k > k);
    if (con[s][k] || !next) return prev.lvl;
    const lo = offs.filter((o) => o.s === s && o.k <= k && o.k > prev.k).pop()?.k ?? prev.k;
    const u = Math.min(1, Math.max(0, (k - lo + 1) / (next.k - lo + 1)));
    return prev.lvl + (next.lvl - prev.lvl) * u * u * (3 - 2 * u);
  };
  let maxFix = 0;
  for (let k = 0; k < n; k++) {
    const f = F[k];
    for (let s = 0; s < 2; s++) {
      const dy = level(s, k);
      if (Math.abs(dy) < 1e-5) continue;
      solveLeg(f, s, v.add(f.W[FOOT[s]].p, [0, dy, 0]));
      maxFix = Math.max(maxFix, Math.abs(dy));
    }
    // refresh the frame's points
    const W = worldPose(g, f.L); f.W = W; f.hips = W[HIPS].p;
    f.ankle = FOOT.map((i) => W[i].p); f.ball = BALL.map((i) => W[i].p); f.tip = TIP.map((i) => W[i].p);
  }
  console.log(`  repaired: ${N} steps of ${(r * 100).toFixed(1)} cm, ankles moved up to ${(maxFix * 100).toFixed(1)} cm, legs re-solved`);
}
/** Two-bone IK on frame f's local pose: leg s's ankle to T, the knee in the clip's knee plane, the foot's world rotation kept. */
function solveLeg(f, s, T) {
  const W = worldPose(g, f.L), iA = UPS[s], iB = KNEES[s], iC = FOOT[s];
  const A = W[iA].p, B = W[iB].p, C = W[iC].p, footQ = W[iC].q;
  const l1 = v.len(v.sub(B, A)), l2 = v.len(v.sub(C, B));
  let dv = v.sub(T, A), d = v.len(dv);
  const dir = v.mul(dv, 1 / d);
  d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
  // (the bend plane: the clip's knee, plus a forward bias so a nearly straight leg never bends backwards; forward =
  // the body's +z, made perpendicular to the leg)
  let perp = v.sub(v.sub(B, A), v.mul(dir, v.dot(v.sub(B, A), dir)));
  const fw = v.sub([0, 0, 1], v.mul(dir, dir[2]));
  perp = v.add(perp, v.mul(v.norm(fw), 0.03));
  if (v.dot(perp, fw) < 0) perp = v.sub(perp, v.mul(v.norm(fw), v.dot(perp, v.norm(fw)) * 1.2));
  if (v.len(perp) < 1e-6) perp = [0, 0, 1];
  perp = v.norm(perp);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const Bn = v.add(v.add(A, v.mul(dir, a)), v.mul(perp, h)), Cn = v.add(A, v.mul(dir, d));
  const turn = (from, to) => { const x = v.norm(from), y = v.norm(to), c = v.dot(x, y), ax = v.cross(x, y), sl = v.len(ax); return sl < 1e-9 ? [0, 0, 0, 1] : q.axisAngle(v.mul(ax, 1 / sl), Math.atan2(sl, c)); };
  const setWorld = (Wc, i, wq) => { const P = Wc[g.nodes[i].parent]; f.L[i].r = q.norm(q.mul(q.inv(P.q), wq)); };
  // upper leg: (B - A) onto (Bn - A)
  setWorld(W, iA, q.norm(q.mul(turn(v.sub(B, A), v.sub(Bn, A)), W[iA].q)));
  let W2 = worldPose(g, f.L);
  // lower leg (under the turned upper leg): its ankle onto Cn
  setWorld(W2, iB, q.norm(q.mul(turn(v.sub(W2[iC].p, W2[iB].p), v.sub(Cn, W2[iB].p)), W2[iB].q)));
  W2 = worldPose(g, f.L);
  const P = W2[iB]; f.L[iC].r = q.norm(q.mul(q.inv(P.q), footQ));
}

const report = process.argv.includes("--report");
const out = [], meta = {};
for (const anim of g.anims) {
  const def = CLIPS[anim.name];
  if (!def) { console.log(`(skipped ${anim.name}: not in CLIPS)`); continue; }
  if (meta[def.name]) { console.log(`(skipped ${anim.name}: ${def.name} already made)`); continue; }
  const F = sample(anim), n = F.length, f0 = F[0], f1 = F[n - 1];
  const yaw = unwrap(F.map((f) => f.yaw)), dur = f1.t;
  // ---- the root path (x, y, z, heading) per frame
  let root;
  if (def.root === "line") {
    root = F.map((f, k) => { const u = k / (n - 1); return [f0.hips[0] + (f1.hips[0] - f0.hips[0]) * u, (f1.hips[1] - f0.hips[1]) * u, f0.hips[2] + (f1.hips[2] - f0.hips[2]) * u, 0]; });
  } else if (def.root === "path") {
    const xs = smoothArr(F.map((f) => f.hips[0]), 4), zs = smoothArr(F.map((f) => f.hips[2]), 4);
    root = F.map((f, k) => [xs[k], 0, zs[k], 0]);
  } else if (def.root === "turn") {
    const ys = smoothArr(yaw, 3);
    root = F.map((f, k) => [f0.hips[0], 0, f0.hips[2], ys[k] - ys[0]]);
  } else root = F.map(() => [f0.hips[0], 0, f0.hips[2], 0]);
  // the airborne frames' rise (jump / fall / land): the hips above standing height while no foot is down
  const isStairs = def.root === "line" && Math.abs(f1.hips[1] - f0.hips[1]) > 0.05;
  const travel = Math.hypot(f1.hips[0] - f0.hips[0], f1.hips[2] - f0.hips[2]), rise = f1.hips[1] - f0.hips[1];
  const { con, groundSpeed } = contacts(F, def.root === "line" && travel < 0.05, isStairs, def.root === "air");
  // (a contact of one frame, or a one-frame gap in a contact, is noise)
  for (const c of con) for (let k = 1; k < n - 1; k++) if (c[k - 1] === c[k + 1] && c[k] !== c[k - 1]) c[k] = c[k - 1];
  if (def.repairDown) repairDown(F, con, f1.hips[1] - f0.hips[1]);
  if (def.root === "air") {
    const rise = F.map((f, k) => (con[0][k] || con[1][k] ? 0 : Math.max(0, f.hips[1] - REST.hipY)));
    const rs = smoothArr(rise, 1);
    root.forEach((r, k) => { r[1] = rs[k]; });
  }
  // ---- numbers (the authored ground speed: the travel over the time, or for an in-place clip the speed that holds
  // the planted foot still)
  const speedSlide = groundSpeed;
  // touch-downs per foot (step times): a contact starting
  const steps = [0, 1].map((s) => con[s].map((c, k) => (c && !con[s][(k - 1 + n) % n] && (def.loop || k > 0) ? +(F[k].t / dur).toFixed(3) : null)).filter((x) => x !== null));
  // where each touch-down puts the foot, relative to the root then (in place): [u, lateral x, forward z, height above
  // the root line] of the sole's middle (between the ankle and the ball, on the floor): the body predicts a swinging
  // foot's landing point from it (legIK.js)
  const stepPos = [0, 1].map((s) => con[s].map((c, k) => (c && !con[s][(k - 1 + n) % n] && (def.loop || k > 0) ? k : -1)).filter((k) => k >= 0).map((k) => {
    const f = F[k], r = root[k], mx = (f.ankle[s][0] + f.ball[s][0]) / 2, mz = (f.ankle[s][2] + f.ball[s][2]) / 2;
    return [+(f.t / dur).toFixed(3), +(mx - r[0]).toFixed(3), +(mz - r[2]).toFixed(3), +(f.ankle[s][1] - REST.ankleY - r[1]).toFixed(3)];
  }));
  const both = con[0].map((c, k) => c || con[1][k]);
  const takeoff = both.findIndex((x, k) => k > 0 && !x && both[k - 1]), touchdown = both.findIndex((x, k) => k > 0 && x && !both[k - 1]);
  const m = { file: "ybot_clips.glb", role: def.role, loop: def.loop, duration: +dur.toFixed(4), source: anim.name,
    contact: con.map((a) => a.join("")), steps, stepPos };
  if (def.root === "line" || def.root === "path") m.speed = +(def.root === "line" && travel < 0.05 ? speedSlide : travel / dur).toFixed(3);
  if (def.root === "line" && Math.abs(rise) > 0.05) {
    const nSteps = steps[0].length + steps[1].length || 2;
    m.stairs = { riser: +(Math.abs(rise) / nSteps).toFixed(3), tread: +(travel > 0.05 ? travel / nSteps : speedSlide * dur / nSteps).toFixed(3), dir: Math.sign(rise), steps: nSteps };
  }
  if (def.root === "path") {      // distance curve (m along the travel) per frame: distance matching
    let d = 0; m.dist = root.map((r, k) => (k ? (d += Math.hypot(r[0] - root[k - 1][0], r[2] - root[k - 1][2])) : 0)).map((x) => +x.toFixed(4));
  }
  if (def.root === "turn") { m.turn = root.map((r) => +r[3].toFixed(4)); m.angle = +(root[n - 1][3] * 180 / Math.PI).toFixed(1); }
  // (the Mixamo jump / fall / land clips face ~40 deg off the body's forward: their mean heading is taken out)
  if (def.root === "air") { const mh = yaw.reduce((a, b) => a + b, 0) / n; root.forEach((r) => { r[3] = mh; }); }
  if (def.root === "air") { m.takeoff = takeoff > 0 ? +F[takeoff].t.toFixed(3) : null; m.touchdown = touchdown > 0 ? +F[touchdown].t.toFixed(3) : null; m.heading = +(yaw.reduce((a, b) => a + b, 0) / n * 180 / Math.PI).toFixed(1); }
  meta[def.name] = m;
  console.log(`${def.name.padEnd(13)} <- ${anim.name.padEnd(22)} ${n} fr ${dur.toFixed(2)} s  travel ${travel.toFixed(2)} rise ${rise.toFixed(2)}  slide ${speedSlide.toFixed(2)} m/s  heading ${(yaw[0] * 180 / Math.PI).toFixed(0)}..${(yaw[n - 1] * 180 / Math.PI).toFixed(0)}  ` +
    `steps L ${steps[0].join(",")} R ${steps[1].join(",")}${m.speed !== undefined ? `  speed ${m.speed}` : ""}${m.stairs ? `  stairs ${JSON.stringify(m.stairs)}` : ""}${m.angle !== undefined ? `  turn ${m.angle} deg` : ""}${m.takeoff !== undefined ? `  takeoff ${m.takeoff} touchdown ${m.touchdown}` : ""}`);
  if (report) for (let s = 0; s < 2; s++) console.log(`   ${s ? "R" : "L"} ${con[s].join("")}`);
  out.push({ def, anim, F, root });
}
console.log(`rest: hips ${REST.hipY.toFixed(3)} ankle ${REST.ankleY.toFixed(3)} ball ${REST.ballY.toFixed(3)} leg ${REST.leg.toFixed(3)} m`);
if (report) process.exit(0);

/**
 * STAIR VARIANTS, baked: the Mixamo stair clips are made for ~24 cm risers. Each is re-made for a grid of real stairs
 * (risers 12 / 15 / 18 / 21 cm x treads 26 / 31 cm): in the root's frame every foot's forward position scaled by
 * tread / clip tread and its height above the floor line by riser / clip riser, the hips kept where they are above the
 * root, the legs re-solved (two-bone, the clip's knee plane, the foot's rotation kept). The body then plays the variant
 * nearest the scanned stairs (blending the 4 around it): the clip fits the step, no leg is bent at runtime.
 */
const RISERS = [0.12, 0.15, 0.18, 0.21], TREADS = [0.26, 0.31];
for (const e of out.slice()) {
  const m0 = meta[e.def.name];
  if (!m0.stairs) continue;
  for (const R of RISERS) for (const T of TREADS) {
    const sR = R / m0.stairs.riser, sT = T / m0.stairs.tread, F0 = e.F, n = F0.length, r0 = e.root;
    const z0 = r0[0][2];
    // the variant's root: the rise and the forward travel scaled
    const root = r0.map((r) => [r[0], r[1] * sR, z0 + (r[2] - z0) * sT, r[3]]);
    const F = F0.map((f) => ({ ...f, L: f.L.map((l) => ({ t: l.t.slice(), r: l.r.slice(), s: l.s.slice() })) }));
    for (let k = 0; k < n; k++) {
      const f = F[k], a = r0[k], b = root[k];
      // hips: the same place above the root
      const hw = [f0x(F0[k].hips[0]), F0[k].hips[1] - a[1] + b[1], F0[k].hips[2] - a[2] + b[2]];
      f.L[HIPS].t = v.mul(q.rot(q.inv(PW0.q), v.sub(hw, PW0.p)), 1 / PW0.s);
      for (let s2 = 0; s2 < 2; s2++) {
        const an = F0[k].ankle[s2];
        const T3 = [an[0], (an[1] - REST.ankleY - a[1]) * sR + REST.ankleY + b[1], (an[2] - a[2]) * sT + b[2]];
        solveLeg(f, s2, T3);
      }
      const W = worldPose(g, f.L); f.W = W; f.hips = W[HIPS].p;
      f.ankle = FOOT.map((i) => W[i].p); f.ball = BALL.map((i) => W[i].p); f.tip = TIP.map((i) => W[i].p);
    }
    const name = `${e.def.name}_${Math.round(R * 100)}_${Math.round(T * 100)}`;
    const stepPos = m0.stepPos.map((arr, s2) => arr.map(([u]) => {
      const k = Math.round(u * (n - 1)), f = F[k], r = root[k];
      return [u, +(((f.ankle[s2][0] + f.ball[s2][0]) / 2) - r[0]).toFixed(3), +(((f.ankle[s2][2] + f.ball[s2][2]) / 2) - r[2]).toFixed(3), +(f.ankle[s2][1] - REST.ankleY - r[1]).toFixed(3)];
    }));
    meta[name] = { ...m0, stepPos, stairs: { ...m0.stairs, riser: R, tread: T, variantOf: e.def.name }, speed: m0.speed !== undefined ? +(m0.speed * sT).toFixed(3) : undefined };
    out.push({ def: { ...e.def, name }, anim: e.anim, F, root });
  }
  console.log(`  ${e.def.name}: ${RISERS.length * TREADS.length} stair variants baked`);
}
function f0x(x) { return x; }

// ---- write the in-place clips: hips translation (root taken off) + every bone's rotation (hips: the turn taken off)
const parentHips = g.nodes[HIPS].parent, PW = W0[parentHips];          // (the Armature node: static)
const anims = out.map(({ def, anim, F, root }) => {
  const n = F.length, times = new Float32Array(n);
  F.forEach((f, k) => { times[k] = f.t; });
  const tracks = [];
  for (const ch of anim.channels) {
    if (ch.path !== "rotation") continue;
    const R = new Float32Array(n * 4);
    F.forEach((f, k) => {
      let r = f.L[ch.node].r;
      if (ch.node === HIPS && root[k][3]) {
        // world rotation of the hips turned back by the root's heading, into the parent's frame
        const wq = q.mul(PW.q, r), yq = q.axisAngle([0, 1, 0], -root[k][3]);
        r = q.norm(q.mul(q.inv(PW.q), q.mul(yq, wq)));
      }
      R.set(r, k * 4);
    });
    tracks.push({ node: ch.node, path: "rotation", values: R });
  }
  const P = new Float32Array(n * 3);
  F.forEach((f, k) => {
    const r = root[k], d = [r[0] - root[0][0], r[1], r[2] - root[0][2]];
    // the turn: the hips' position turned back about the root's start too (the pivot stays)
    let w = v.sub(f.hips, d);
    if (r[3]) { const c = [root[0][0], 0, root[0][2]], o = v.sub(w, c); w = v.add(c, q.rot(q.axisAngle([0, 1, 0], -r[3]), o)); w[1] = f.hips[1] - d[1]; }
    P.set(v.mul(q.rot(q.inv(PW.q), v.sub(w, PW.p)), 1 / PW.s), k * 3);
  });
  tracks.push({ node: HIPS, path: "translation", values: P });
  return { name: def.name, times, tracks };
});
// (non-hips translations and all scales must be constant: they are left out, the bones keep their rest values)
for (const { anim } of out) for (const ch of anim.channels) {
  if (ch.path === "rotation" || (ch.path === "translation" && ch.node === HIPS)) continue;
  const N = ch.path === "rotation" ? 4 : 3, V = ch.values, base = ch.path === "scale" ? [1, 1, 1] : g.nodes[ch.node].t;
  let dev = 0;
  for (let k = 0; k < V.length; k += N) for (let c = 0; c < 3; c++) dev = Math.max(dev, Math.abs(V[k + c] - (ch.path === "scale" ? base[c] * 1 : base[c])));
  if (dev > (ch.path === "scale" ? 1e-3 : 0.05)) console.warn(`  ${anim.name}: ${g.nodes[ch.node].name} ${ch.path} moves (${dev.toFixed(4)}): dropped anyway`);
}
const OUT = path.join(ROOT, "models/characters/ybot_clips.glb");
const bytes = writeClipsGLB(OUT, g.nodes.map((nd) => ({ name: nd.name, parent: nd.parent, children: nd.children, t: nd.t, r: nd.r, s: nd.s })), anims,
  { note: "Mixamo clips for the Y Bot, in place (tools/characters/mixamoClips.mjs); for this project only, not for redistribution" });
fs.writeFileSync(path.join(ROOT, "models/characters/ybot.json"), JSON.stringify({ model: "ybot.glb", fps: FPS, rest: Object.fromEntries(Object.entries(REST).map(([k, x]) => [k, +x.toFixed(4)])), clips: meta }, null, 1));
console.log(`wrote models/characters/ybot_clips.glb (${(bytes / 1024).toFixed(0)} KB, ${anims.length} clips) + ybot.json`);
