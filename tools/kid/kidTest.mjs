// node --import ./tools/heap/register.mjs tools/kid/kidTest.mjs [--quiet]: THE KID (docs/KID.md) without a browser.
// Gate row "kid". One row per check; exit 1 if any fails:
//   - the skeleton: models/characters/kid.glb's joints = the UAL rig's (same names, same order, same rest ORIENTATIONS:
//     only the joints' offsets changed), its height and LOD budgets (LOD0 <= 15k tris), every slot in the palette;
//   - every UAL clip binds: each channel of every clip of UAL1 + UAL2 (the raw packs when present, else ual.glb's) targets
//     a joint the kid has; every clip in kid.glb plays on it;
//   - the deformation: the kid's LOD0 skinned on the CPU (linear blend, as the GPU) through walk, run, jump, crouch, sit,
//     roll, the stair clips: no NaN, no edge stretched or crushed past the limits (knees, elbows, shoulders);
//   - the RIDER (viewer/kid/riderIK.js) on the lab's bike (viewer/bike/bikeModel.js empties): over a full crank turn x
//     full steer left / centre / right x seated / standing / crouched / manual / leaning: every limb target within the
//     limb's length (no stretching), the hands on the grips and the feet on the pedals within 1 cm, no NaN;
//   - the mount / dismount state machine (viewer/kid/kidMount.js): far, mount, too fast, dismount standing / rolling ->
//     lying, pick up, crash -> get up -> riding; the parked bike stays finite;
//   - the keys: E is free in the bike's table and one-shot once; the foot keys share their meaning with the bike's.
import fs from "node:fs";
import path from "node:path";
import { readGLB, sampleAnim, worldPose, q as Q, v as V } from "../characters/gltfAnim.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const quiet = process.argv.includes("--quiet");
// --model kidA: the same checks on the MPFB kid (docs/KIDCHAR.md: models/characters/kidA.glb, one atlas, 3 LODs ~20k / 8k / 2k)
const MODEL = (() => { const i = process.argv.indexOf("--model"); return i > 0 ? process.argv[i + 1] : "kid"; })();
const IS_A = MODEL !== "kid";
const BUDGET = IS_A ? [22000, 8500, 2200] : [15000, 6000, 2000];
// (the top-of-stroke knee: a 0.705 m leg on the BMX's real 175 mm cranks closes to ~55-60 deg at best: the stroke takes
// 2 x 175 mm out of a reach capped at 96.5 % of the leg (docs/KIDCHAR.md phase 3). A: >= 50 with no slide off the saddle
// (he sat 41 deg, sliding 7 cm forward); the old kid as it rides (39))
const KNEE = process.env.KNEE_RANGE ? process.env.KNEE_RANGE.split(",").map(Number) : (IS_A ? [68, 85] : [35, 85]);
if (IS_A) { const R = await import("../../viewer/kid/riderIK.js"); Object.assign(R.RIDE, R.RIDE_KIDA); }
const { RIDE: RIDE_NOW } = await import("../../viewer/kid/riderIK.js");
const SEAT_DIR_T = new (await import("three")).Vector3(0, Math.sin(71 * Math.PI / 180), -Math.cos(71 * Math.PI / 180));
if (process.env.RIDE_OVERRIDE) { const R = await import("../../viewer/kid/riderIK.js"); Object.assign(R.RIDE, JSON.parse(process.env.RIDE_OVERRIDE)); }   // (tuning)
const rows = [];
let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const t0 = performance.now();

// ------------------------------------------------------------------------------------------------ skeleton + budgets
const kid = readGLB(path.join(ROOT, `models/characters/${MODEL}.glb`));
const ual = readGLB(path.join(ROOT, "models/characters/ual.glb"));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, `models/characters/${MODEL}.json`), "utf8"));
const jn = (g) => g.json.skins[0].joints.map((i) => g.nodes[i].name);
const kj = jn(kid), uj = jn(ual);
check("skeleton = the UAL rig's joints (names, order)", kj.length === uj.length && kj.every((n, i) => n === uj[i]), `${kj.length} joints${kj.every((n, i) => n === uj[i]) ? "" : " (differ)"}`, `${uj.length}, identical`);
let rotErr = 0;
for (const n of kj) rotErr = Math.max(rotErr, Q.angle(kid.nodes[kid.byName.get(n)].r, ual.nodes[ual.byName.get(n)].r));
check("rest orientations kept (only the offsets moved)", rotErr < 2e-3, `max ${(rotErr * 57.3).toFixed(4)} deg (float32 acos noise)`, "< 0.1 deg");
const W0 = worldPose(kid, sampleAnim(kid, null, 0));
check("height 1.40-1.50 m (an 11-12 year old)", meta.kid.height > 1.4 && meta.kid.height < 1.5, `${meta.kid.height} m`, "1.40-1.50");
const tris = kid.json.meshes.map((m) => kid.json.accessors[m.primitives[0].indices].count / 3);
check(`LODs: ${BUDGET.join(" / ")} tris at most; one primitive each (one draw)`, tris.every((t, i) => t <= BUDGET[i]) && kid.json.meshes.every((m) => m.primitives.length === 1), tris.join(" / "), `<= ${BUDGET.join(" / ")}`);
const { KID_PALETTE, KIDA_ROUGH } = await import("../../viewer/kid/kidModel.js").catch(() => ({ KID_PALETTE: null }));
const slots = meta.kid.slots;
if (!IS_A && KID_PALETTE) check("named slots: every slot has a palette colour", slots.every((sl) => sl in KID_PALETTE), slots.join(","), "all in KID_PALETTE");
if (IS_A && KIDA_ROUGH) check("named slots: every slot has a roughness (the atlas carries the colour)", slots.every((sl) => sl in KIDA_ROUGH), slots.join(","), "all in KIDA_ROUGH");
if (IS_A) {
  // the LODs pop-free budget: each LOD at least ~ 1/3 of the one before (no sudden silhouette loss at a switch)
  check("LOD ratios (no popping): LOD1 >= 30 % of LOD0, LOD2 >= 20 % of LOD1", tris[1] >= 0.3 * tris[0] && tris[2] >= 0.2 * tris[1], `${(tris[1] / tris[0] * 100).toFixed(0)} % / ${(tris[2] / tris[1] * 100).toFixed(0)} %`, ">= 30 % / 20 %");
  check("one atlas (KTX2) next to the model", fs.existsSync(path.join(ROOT, "models/characters", meta.kid.atlas)), meta.kid.atlas, "exists");
}

// ------------------------------------------------------------------------------------------------ stray pieces, spikes
// (round 3: a flake of the shirt cut off by a hem plane stood up at the shoulder; a hem vertex took the waist's weights
// and became a blade in the Idle pose) Every connected piece of the LOD0 mesh in a body / clothes slot is big (>= 40
// tris: the collar, a cuff, a shoe, the shirt...), and no long thin sliver triangle in those slots.
{
  const pr = kid.json.meshes[0].primitives[0];
  const I = kid.accessor(pr.indices), P = kid.accessor(pr.attributes.POSITION), SL = kid.accessor(pr.attributes._SLOT);
  const nv = P.length / 3, par = new Int32Array(nv).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  // (vertices at the same place are one: the export splits them at slot borders and hard edges)
  const key = (i) => `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
  const at = new Map(), weld = new Int32Array(nv);
  for (let i = 0; i < nv; i++) { const k = key(i); if (at.has(k)) { par[find(i)] = find(at.get(k)); weld[i] = at.get(k); } else { at.set(k, i); weld[i] = i; } }
  for (let t = 0; t < I.length; t += 3) { par[find(I[t])] = find(I[t + 1]); par[find(I[t + 1])] = find(I[t + 2]); }
  const BODY = new Set((IS_A ? ["skin", "tee", "shorts", "socks", "shoes", "jacket"] : ["skin", "shirt", "shirt_trim", "shorts", "socks", "sock_stripe", "shoe", "sole", "shoe_accent", "lace"]).map((n) => slots.indexOf(n)));
  const comp = new Map();
  // (a SPIKE: a triangle folded against its neighbours - its normal more than 115 deg off the mean normal round its
  // corners (a hem band turns 90 deg: allowed) - and longer than 2 cm: a flake or a blade)
  const fn = [], vn = new Float64Array(nv * 3);
  for (let t = 0; t < I.length; t += 3) {
    const v = (k) => [P[I[t + k] * 3], P[I[t + k] * 3 + 1], P[I[t + k] * 3 + 2]];
    const a = v(0), b = v(1), cc = v(2);
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const L = Math.max(...[[a, b], [b, cc], [cc, a]].map(([x, y]) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])));
    fn.push([n, L]);
    for (let k = 0; k < 3; k++) { const r = weld[I[t + k]]; for (let c = 0; c < 3; c++) vn[r * 3 + c] += n[c]; }
    const r = find(I[t]), c = comp.get(r) || { n: 0, body: 0 }; c.n++; if (BODY.has(SL[I[t]])) c.body++; comp.set(r, c);
  }
  let sliv = 0, slivHigh = 0;
  for (let t = 0, f = 0; t < I.length; t += 3, f++) {
    if (!BODY.has(SL[I[t]])) continue;
    const [n, L] = fn[f]; if (L < 0.02) continue;
    const ln = Math.hypot(...n) || 1;
    let m = [0, 0, 0]; for (let k = 0; k < 3; k++) { const r = weld[I[t + k]]; for (let c = 0; c < 3; c++) m[c] += vn[r * 3 + c]; }
    const lm = Math.hypot(...m) || 1;
    if ((n[0] * m[0] + n[1] * m[1] + n[2] * m[2]) / (ln * lm) < Math.cos(115 * Math.PI / 180)) { sliv++; if (P[I[t] * 3 + 1] > 0.95) slivHigh++; }
  }
  const small = [...comp.values()].filter((c) => c.body > c.n / 2 && c.n < 40);
  // (the hems overlap at the waist and the shoe collars: a few small folds there; none from the chest up, where the
  // round-2 flake stood: 18 folded triangles in that model, 9 now, 0 above the waist)
  check("no stray pieces or spikes (body + clothes slots of LOD0)", small.length === 0 && slivHigh === 0 && sliv <= 12,
    `${small.length} small pieces (${small.map((c) => c.n).join(", ") || "-"} tris), ${sliv} folded triangles > 2 cm (${slivHigh} above the waist)`, "0 pieces, 0 folded above the waist, <= 12 in all");
}

// ------------------------------------------------------------------------------------------------ every UAL clip binds
const RAWS = [path.join(ROOT, "data/raw/characters"), path.join(ROOT, "../uccle-city/data/raw/characters")];
const raw = RAWS.find((d) => fs.existsSync(path.join(d, "ual1")));
const packs = raw ? [path.join(raw, "ual1/x/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb"), path.join(raw, "ual2/x/Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb")].filter((f) => fs.existsSync(f)) : [];
let nClips = 0, nUnbound = 0;
const unbound = new Set();
for (const f of packs.length ? packs : [path.join(ROOT, "models/characters/ual.glb")]) {
  const g = readGLB(f);
  for (const a of g.anims) {
    nClips++;
    let ok = true;
    for (const ch of a.channels) {
      const n = g.nodes[ch.node].name;
      if (n === "Armature" || g.json.nodes[ch.node].mesh !== undefined) continue;
      if (!kid.byName.has(n) || !kj.includes(n) && n !== "root") { ok = false; unbound.add(n); }
    }
    if (!ok) nUnbound++;
  }
}
check(`every UAL clip binds to the kid (${packs.length ? "UAL1 + UAL2 packs" : "ual.glb's clips (no raw packs here)"})`, nUnbound === 0 && nClips > 0, `${nClips - nUnbound}/${nClips}${unbound.size ? " missing " + [...unbound].join(",") : ""}`, "all");
const kidClipsOk = kid.anims.every((a) => a.channels.every((ch) => kid.nodes[ch.node] && (ch.path === "rotation" || kid.nodes[ch.node].name === "pelvis")));
check(`${MODEL}.glb clips: rotations + the pelvis translation only, all on kid joints`, kidClipsOk && kid.anims.length >= 30, `${kid.anims.length} clips`, ">= 30, rotations + pelvis");

// ------------------------------------------------------------------------------------------------ deformation (CPU skinning)
function deformStats(g) {
  const m0 = g.json.meshes[0].primitives[0];
  const P = g.accessor(m0.attributes.POSITION), J = g.accessor(m0.attributes.JOINTS_0), Wt = g.accessor(m0.attributes.WEIGHTS_0), I = g.accessor(m0.indices);
  const ibm = g.accessor(g.json.skins[0].inverseBindMatrices), joints = g.json.skins[0].joints, nv = P.length / 3;
  const mat = (w) => {   // world {p, q, s} -> column-major 4x4
    const [x, y, z, ww] = w.q, s = w.s;
    return [(1 - 2 * (y * y + z * z)) * s, 2 * (x * y + z * ww) * s, 2 * (x * z - y * ww) * s, 0, 2 * (x * y - z * ww) * s, (1 - 2 * (x * x + z * z)) * s, 2 * (y * z + x * ww) * s, 0,
      2 * (x * z + y * ww) * s, 2 * (y * z - x * ww) * s, (1 - 2 * (x * x + y * y)) * s, 0, w.p[0], w.p[1], w.p[2], 1];
  };
  const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let sum = 0; for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = sum; } return o; };
  const skinAt = (L) => {
    const W = worldPose(g, L), Ms = joints.map((ji, k) => mul(mat(W[ji]), Array.from(ibm.subarray(k * 16, k * 16 + 16))));
    const out = new Float64Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      let x = 0, y = 0, z = 0;
      const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
      for (let k = 0; k < 4; k++) {
        const w = Wt[i * 4 + k]; if (!w) continue;
        const m = Ms[J[i * 4 + k]];
        x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]); y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  };
  // the joints the review asked about: an edge belongs to a joint region by its first vertex's two strongest bones
  const REG = { knee: ["thigh", "calf"], elbow: ["upperarm", "lowerarm"], shoulder: ["clavicle", "upperarm"], hip: ["pelvis", "thigh"] };
  const region = new Array(nv).fill(null), regionN = {}, regionBad = {};
  for (let i = 0; i < nv; i++) {
    const js = [0, 1, 2, 3].map((k) => [Wt[i * 4 + k], g.nodes[joints[J[i * 4 + k]]].name.replace(/_[lr]$/, "")]).sort((a, b) => b[0] - a[0]);
    if (js[1][0] < 0.15) continue;
    for (const [rn, pair] of Object.entries(REG)) if (pair.includes(js[0][1]) && pair.includes(js[1][1]) && js[0][1] !== js[1][1]) { region[i] = rn; break; }
  }
  const SLT = m0.attributes._SLOT !== undefined ? g.accessor(m0.attributes._SLOT) : null, slotBad = {};
  const rest = skinAt(sampleAnim(g, null, 0));
  let bindErr = 0;
  for (let i = 0; i < nv * 3; i++) bindErr = Math.max(bindErr, Math.abs(rest[i] - P[i]));

  // edges (unique)
  const E = new Set();
  for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) E.add(a < b ? a * 65536 + b : b * 65536 + a);
  const edges = [...E].map((k) => [Math.floor(k / 65536), k % 65536]);
  const len = (X, a, b) => Math.hypot(X[a * 3] - X[b * 3], X[a * 3 + 1] - X[b * 3 + 1], X[a * 3 + 2] - X[b * 3 + 2]);
  const L0 = edges.map(([a, b]) => len(rest, a, b));
  edges.forEach(([a], e) => { if (L0[e] >= 4e-3 && region[a]) regionN[region[a]] = (regionN[region[a]] || 0) + 1; });
  const res = [];
  let worst = { r: 1, clip: "", hi: 0, lo: 1, nan: 0 };
  for (const name of ["Walk", "Jog", "Sprint", "JumpStart", "Fall", "Land", "CrouchIdle", "CrouchWalk", "Sit", "SitDown", "Roll", "Push", "StairsUp", "StairsDown", "FallDown"]) {
    const a = g.anims.find((x) => x.name === name);
    if (!a) continue;
    let hi = 0, lo = 9, nan = 0, over = 0, n = 0;
    regionN.frames = (regionN.frames || 0) + 9;
    for (let f = 0; f <= 8; f++) {
      const X = skinAt(sampleAnim(g, a, a.duration * f / 8));
      for (let e = 0; e < edges.length; e++) {
        if (L0[e] < 4e-3) continue;
        const r = len(X, edges[e][0], edges[e][1]) / L0[e];
        if (!(r === r)) { nan++; continue; }
        if (r > hi) hi = r; if (r < lo) lo = r;
        if (r > 2.5 || r < 0.25) { over++; const j = region[edges[e][0]]; if (j) { regionBad[j] = (regionBad[j] || 0) + 1; if (SLT) { const k = `${j}:${SLT[edges[e][0]]}`; slotBad[k] = (slotBad[k] || 0) + 1; if (process.env.KID_DEBUG && !slotBad["ex" + k]) { const [a0, b0] = edges[e]; slotBad["ex" + k] = `${name} r ${r.toFixed(1)} a(${[0, 1, 2].map((c) => P[a0 * 3 + c].toFixed(3))}) b(${[0, 1, 2].map((c) => P[b0 * 3 + c].toFixed(3))})`; } } } }
        n++;
      }
    }
    res.push(`${name} ${hi.toFixed(2)}/${lo.toFixed(2)}${over ? ` (${over})` : ""}`);
    if (nan) worst.nan += nan;
    if (hi > worst.hi) worst.hi = hi; if (lo < worst.lo) worst.lo = lo;
    worst.over = (worst.over || 0) + over / n;
  }
  const regionFrac = Object.fromEntries(Object.keys(regionN).filter((k) => k !== "frames").map((k) => [k, (regionBad[k] || 0) / (regionN[k] * regionN.frames)]));
  if (process.env.KID_DEBUG && SLT) console.log("torn edges by region:slot", slotBad);
  return { regionFrac, bindErr, nan: worst.nan, hi: worst.hi, lo: worst.lo, frac: worst.over / Math.max(1, res.length), res };
}

// ------------------------------------------------------------------------------------------------ posture + chest (kid A)
// (owner, 2026-11-26, kid A next to the bike: "his shoulders are far backward, he looks like he has breasts". Root
// cause: MPFB's spine joints sat low and straight, the T-pose bent his trunk onto the UAL's curve (docs/KIDCHAR.md
// phase 4). Measured on the CPU-skinned LOD0 in the Idle (t 0, 1.2 s) and two Walk frames, side view:
//   - the shoulder joints in the middle of the torso's depth at shoulder height (not behind it), +-3 cm;
//   - the head over the shoulders over the hips: the hip -> shoulder and shoulder -> head lines within 12 deg of vertical;
//   - a flat chest: the jacket's front across the chest has no two mounds (the side of the chest no more than 8 mm in
//     front of its middle), the chest depth (jacket front to back) 15-24 cm)
function skinner(g) {
  const m0 = g.json.meshes[0].primitives[0];
  const P = g.accessor(m0.attributes.POSITION), J = g.accessor(m0.attributes.JOINTS_0), Wt = g.accessor(m0.attributes.WEIGHTS_0);
  const SL = m0.attributes._SLOT !== undefined ? g.accessor(m0.attributes._SLOT) : null;
  const ibm = g.accessor(g.json.skins[0].inverseBindMatrices), joints = g.json.skins[0].joints, nv = P.length / 3;
  const mat = (w) => { const [x, y, z, ww] = w.q, s = w.s;
    return [(1 - 2 * (y * y + z * z)) * s, 2 * (x * y + z * ww) * s, 2 * (x * z - y * ww) * s, 0, 2 * (x * y - z * ww) * s, (1 - 2 * (x * x + z * z)) * s, 2 * (y * z + x * ww) * s, 0,
      2 * (x * z + y * ww) * s, 2 * (y * z - x * ww) * s, (1 - 2 * (x * x + y * y)) * s, 0, w.p[0], w.p[1], w.p[2], 1]; };
  const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let sum = 0; for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = sum; } return o; };
  return (L) => {
    const W = worldPose(g, L), Ms = joints.map((ji, k) => mul(mat(W[ji]), Array.from(ibm.subarray(k * 16, k * 16 + 16))));
    const X = new Float64Array(nv * 3);
    for (let i = 0; i < nv; i++) { const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2]; let x = 0, y = 0, z = 0;
      for (let k = 0; k < 4; k++) { const w = Wt[i * 4 + k]; if (!w) continue; const m = Ms[J[i * 4 + k]];
        x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]); y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]); }
      X[i * 3] = x; X[i * 3 + 1] = y; X[i * 3 + 2] = z; }
    return { X, W, SL, nv };
  };
}
function postureOf(g, torsoSlot, hipSlot) {
  const sk = skinner(g), out = [];
  for (const [clip, t] of [["Idle", 0], ["Idle", 1.2], ["Walk", 0.2], ["Walk", 0.85]]) {
    const a = g.anims.find((x) => x.name === clip);
    const { X, W, SL, nv } = sk(sampleAnim(g, a, t));
    const ok = (i, slot) => slot < 0 || !SL || SL[i] === slot;
    const J = (n) => W[g.byName.get(n)].p;
    const sh = [0, 1, 2].map((c) => (J("upperarm_l")[c] + J("upperarm_r")[c]) / 2), hip = [0, 1, 2].map((c) => (J("thigh_l")[c] + J("thigh_r")[c]) / 2), hd = J("Head");
    // the body's facing: from the hips' left -> right, forward = up x left
    const lx = J("thigh_l")[0] - J("thigh_r")[0], lz = J("thigh_l")[2] - J("thigh_r")[2], ll = Math.hypot(lx, lz), fx = -lz / ll, fz = lx / ll;
    const fwd = (p) => p[0] * fx + p[2] * fz, side = (p) => p[0] * (lx / ll) + p[2] * (lz / ll);
    // the torso's depth in a band (vertices within 6 cm of the middle plane; columns across for the chest's shape)
    const band = (y0, y1, slot, c0) => { let fr = -9, bk = 9; const cols = {};
      for (let i = 0; i < nv; i++) { if (!ok(i, slot)) continue; const p = [X[i * 3], X[i * 3 + 1], X[i * 3 + 2]]; if (p[1] < y0 || p[1] > y1) continue;
        const sd = side(p) - c0, f = fwd(p); if (Math.abs(sd) < 0.06) { fr = Math.max(fr, f); bk = Math.min(bk, f); }
        if (Math.abs(sd) < 0.11) { const b = Math.round(sd * 100); cols[b] = Math.max(cols[b] ?? -9, f); } }
      return { fr, bk, cols, mid: (fr + bk) / 2 }; };
    const S = band(sh[1] - 0.05, sh[1] - 0.01, torsoSlot, side(sh)), Hb = band(hip[1] - 0.01, hip[1] + 0.05, hipSlot, side(hip));
    const C = band(sh[1] - 0.16, sh[1] - 0.09, torsoSlot, side(sh));            // the chest (~10-15 cm under the shoulder joints)
    const centre = Math.max(C.cols[2] ?? -9, C.cols[-2] ?? -9, C.cols[3] ?? -9, C.cols[-3] ?? -9);
    const sideMax = Math.max(...[4, 5, 6, 7, 8, -4, -5, -6, -7, -8].map((b) => C.cols[b] ?? -9));
    out.push({ at: `${clip}@${t}`, sh: fwd(sh) - S.mid, lean: Math.atan2(S.mid - Hb.mid, sh[1] - hip[1]) * 57.3, head: fwd(hd) - S.mid,
      depth: C.fr - C.bk, mound: sideMax - centre, ph: J("pelvis")[1] });
  }
  return out;
}
// (owner, 2026-11-26, kid A next to the bike: "his shoulders are far backward, he looks like he has breasts". Root cause:
// MPFB's spine joints sat low and straight; the T-pose bent his trunk onto the UAL's curve (docs/KIDCHAR.md phase 4).
// Measured on the CPU-skinned LOD0, Idle (t 0, 1.2 s) and Walk (two frames), side view, ON THE MESH (joint lines are no
// measure: the UAL mannequin's own shoulder joints sit 6 cm behind its neck):
//   - the shoulder joints in the middle of the torso's depth at shoulder height (not behind it): <= 3 cm;
//   - the torso upright: its middle line from the hips' band to the shoulders' band <= the UAL mannequin's lean + 4 deg;
//   - the head over the shoulders: the head joint in front of the shoulders' middle <= the mannequin's (scaled) + 2 cm;
//   - a flat chest: across the jacket's front no two mounds (the sides <= 8 mm in front of the middle), depth 15-24 cm)
if (IS_A) {
  const A = postureOf(kid, meta.kid.slots.indexOf("jacket"), meta.kid.slots.indexOf("shorts")), R = postureOf(ual, -1, -1);
  const sc = A[0].ph / R[0].ph;
  const worst = (f) => Math.max(...A.map(f)), notes = A.map((x, i) => `${x.at}: sh ${(x.sh * 100).toFixed(1)} cm, torso ${x.lean.toFixed(0)} deg (UAL ${R[i].lean.toFixed(0)}), head ${(x.head * 100).toFixed(1)} cm (UAL ${(R[i].head * sc * 100).toFixed(1)}), chest ${(x.depth * 100).toFixed(1)} cm, mound ${(x.mound * 1000).toFixed(0)} mm`);
  if (!quiet) console.log("  posture: " + notes.join(" | "));
  const wSh = worst((x) => Math.abs(x.sh)), wLean = Math.max(...A.map((x, i) => Math.abs(x.lean) - Math.abs(R[i].lean))), wHead = Math.max(...A.map((x, i) => x.head - R[i].head * sc));
  check("posture (Idle + Walk, side view): shoulders in the torso's middle, torso + head as upright as the UAL mannequin's", wSh <= 0.03 && wLean <= 4 && wHead <= 0.02,
    `shoulder joints ${(wSh * 100).toFixed(1)} cm off the torso's middle, torso ${wLean.toFixed(1)} deg and head ${(wHead * 100).toFixed(1)} cm past the mannequin's`, "<= 3 cm, <= 4 deg, <= 2 cm");
  const wM = worst((x) => x.mound), dLo = Math.min(...A.map((x) => x.depth)), dHi = worst((x) => x.depth);
  check("flat chest: no two mounds across the jacket's front, chest depth 15-24 cm", wM <= 0.008 && dLo >= 0.15 && dHi <= 0.24,
    `sides ${(wM * 1000).toFixed(0)} mm in front of the middle, depth ${(dLo * 100).toFixed(1)}-${(dHi * 100).toFixed(1)} cm`, "<= 8 mm, 15-24 cm");
}

{
  const D = deformStats(kid), U = deformStats(ual);
  check("bind pose: the inverse bind matrices reproduce the mesh", D.bindErr < 1e-4, `${(D.bindErr * 1000).toFixed(3)} mm`, "< 0.1 mm");
  // (the UAL mannequin's own deformation through its clips is the reference: linear blend skinning tears a little at
  // the deepest folds of any mesh; the kid may not be much worse than the mesh the clips were made on)
  const lim = Math.max(0.004, U.frac * 3);
  check("deformation (15 clips x 9 frames, CPU skinning): no NaN, edges >= 4 mm torn x2.5 / crushed x0.25 rare", D.nan === 0 && D.frac <= lim,
    `kid ${(D.frac * 100).toFixed(3)} % (max x${D.hi.toFixed(1)}), UAL mannequin ${(U.frac * 100).toFixed(3)} %`, `finite, <= ${(lim * 100).toFixed(2)} %`);
  if (!quiet) console.log("  per clip (max / min edge ratio):", D.res.join(", "));
  const rf = D.regionFrac, uf = U.regionFrac, lim2 = (k) => Math.max(0.01, 3 * (uf[k] || 0));
  const rl = (k) => `${k} ${((rf[k] || 0) * 100).toFixed(2)} (UAL ${((uf[k] || 0) * 100).toFixed(2)}) %`;
  check("deformation at the knees, elbows, shoulders, hips (edges torn / crushed, all 15 clips)", ["knee", "elbow", "shoulder", "hip"].every((k) => (rf[k] || 0) <= lim2(k)),
    ["knee", "elbow", "shoulder", "hip"].map(rl).join(", "), "each <= 1 % or 3x the mannequin's");
}

// ------------------------------------------------------------------------------------------------ the rider (three in node)
let THREE = null;
try { THREE = await import("three/webgpu"); } catch { /* no three */ }
if (!THREE) check("rider IK (three in node)", true, "skipped (run with --import ./tools/heap/register.mjs)", "-");
else {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { RiderIK } = await import("../../viewer/kid/riderIK.js");
  const { createBikeModel } = await import("../../viewer/bike/bikeModel.js");
  const { BIKE, createBikeState, bikePose } = await import("../../viewer/bike/bikePhysics.js");
  const { findBikeEmpties } = await import("../../viewer/kid/bikeRig.js");
  const { prepareKid } = await import("../../viewer/kid/kidModel.js");
  const buf = fs.readFileSync(path.join(ROOT, `models/characters/${MODEL}.glb`));
  const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
  let prepErr = "";
  try { const k = prepareKid(gltf, IS_A ? { atlas: "none" } : {}); if (k.meshes.length !== 3) prepErr = `${k.meshes.length} LODs`; k.autoLod(30); if (k.lod !== 1) prepErr += " LOD by distance"; k.autoLod(2); }
  catch (e) { prepErr = e.message; }
  check(`kidModel: 3 LOD meshes, ${IS_A ? "atlas" : "palette"} material, LOD switch`, !prepErr, prepErr || "ok", "ok");
  const scene = new THREE.Scene(), holder = new THREE.Group();
  holder.add(gltf.scene); scene.add(holder);
  const rider = new RiderIK(gltf.scene, gltf.animations);
  const { rigBmx } = await import("../../viewer/kid/bmxModel.js");
  const modes = {
    seated: {}, standing: { sprint: 1 }, crouched: { legs: -0.9, preload: 1 }, manual: { manual: 1, pitch: 0.45 }, leanL: { lean: 0.55 }, leanR: { lean: -0.55 }, air: { air: true, legs: 0.3 },
    wobbleL: { wobbleNow: 1, wobbleW: 1 }, wobbleR: { wobbleNow: -1, wobbleW: 1 },
    grindL: { grindSeg: 0, grindBal: 0.95, legs: -0.5, lean: 0.33 }, grindR: { grindSeg: 0, grindBal: -0.95, legs: -0.5, lean: -0.33 },
  };
  const s = createBikeState(0, 0, 0.3, 0), pose = {};
  /** the BMX's node tree from its GLB (no meshes: node checks), as the lab mounts it */
  function bmxTree() {
    const g = readGLB(path.join(ROOT, "models/bike/bmx.glb")), objs = g.nodes.map((n) => { const o = new THREE.Object3D(); o.name = n.name; o.position.fromArray(n.t); o.quaternion.fromArray(n.r); o.scale.fromArray(n.s); return o; });
    g.nodes.forEach((n, i) => { for (const c of n.children) objs[i].add(objs[c]); });
    if (process.env.CRANK_SCALE) for (const nm of ["Pedal_L", "Pedal_R"]) { const o = objs.find((x) => x.name === nm); o.position.y *= +process.env.CRANK_SCALE; o.position.z *= +process.env.CRANK_SCALE; }   // (tuning)
    if (process.env.SEAT_UP) { const o = objs.find((x) => x.name === "Seat"); o.position.y += +process.env.SEAT_UP; }   // (tuning)
    if (RIDE_NOW.seatPost) { const o = objs.find((x) => x.name === "Seat"); o.position.addScaledVector(SEAT_DIR_T, RIDE_NOW.seatPost); }   // (the rider's seat post, as the lab sets it)
    return objs[g.nodes.findIndex((n) => n.name === "BMX")] || objs[g.json.scenes[0].nodes[0]];
  }
  let bm = null, E = null, rig = null;
  for (const bike of ["placeholder", "bmx"]) {
    if (bike === "bmx" && !fs.existsSync(path.join(ROOT, "models/bike/bmx.glb"))) { check("rider on the BMX", true, "skipped (no models/bike/bmx.glb)", "-"); continue; }
    if (bm) scene.remove(bm.root);
    bm = createBikeModel(BIKE, { rider: false }); scene.add(bm.root);
    rig = null;
    if (bike === "bmx") { rig = rigBmx(bmxTree(), JSON.parse(fs.readFileSync(path.join(ROOT, "models/bike/bmx.json"), "utf8")), bm); E = rig.empties; }
    else { E = findBikeEmpties(bm.root, bm.empties.frame); E.cg = BIKE.cgHeight; }
    let legMax = 0, armMax = 0, legErr = 0, armErr = 0, nan = 0, n = 0, fitMax = 0, spineMax = 0, asym = 0, kneeMin = 999, kneeMax = 0, elbowMax = 0, seatLeg = 0, seatFit = 0, seatSlid = 0;
    const wp = (nm) => gltf.scene.getObjectByName(nm).getWorldPosition(new THREE.Vector3());
    const angAt = (a, b, c) => { const A = wp(a), B = wp(b), Cc = wp(c); return A.sub(B).angleTo(Cc.sub(B)) * 57.2958; };
    for (const [mname, mo] of Object.entries(modes)) for (const steer of [-0.9, -0.45, 0, 0.45, 0.9]) for (let c = 0; c < 24; c++) {
      Object.assign(s, { sprint: 0, legs: 0, preload: 0, manual: 0, pitch: 0, lean: 0, air: false, footDown: 0, wobbleNow: 0, wobbleW: 0, grindSeg: -1, grindBal: 0 }, mo);
      s.crank = c / 24 * Math.PI * 2; s.steerAngle = steer;
      s.prev.lean = s.lean; s.prev.pitch = s.pitch;
      bikePose(s, 1, pose); bm.update(s, pose, () => 0); rig?.update(s); bm.root.updateMatrixWorld(true);
      const M = rider.ride(E, s, holder, 0);
      legMax = Math.max(legMax, ...M.legRatio); armMax = Math.max(armMax, ...M.armRatio);
      legErr = Math.max(legErr, ...M.legErr); armErr = Math.max(armErr, ...M.armErr); fitMax = Math.max(fitMax, M.fitted); spineMax = Math.max(spineMax, M.spine);
      if (mname === "seated" && steer === 0) {
        asym = Math.max(asym, Math.abs(M.armRatio[0] - M.armRatio[1]));
        seatLeg = Math.max(seatLeg, ...M.legRatio); seatFit = Math.max(seatFit, M.fitted); seatSlid = Math.max(seatSlid, M.slid || 0);
        // the knee's INTERIOR angle (thigh to shin; 180 = straight) over the crank turn, the elbows'
        for (const sd of ["l", "r"]) {
          const k = angAt(`thigh_${sd}`, `calf_${sd}`, `foot_${sd}`); kneeMin = Math.min(kneeMin, k); kneeMax = Math.max(kneeMax, k);
          elbowMax = Math.max(elbowMax, angAt(`upperarm_${sd}`, `lowerarm_${sd}`, `hand_${sd}`));
        }
      }
      gltf.scene.traverse((o) => { if (o.isBone && !o.matrixWorld.elements.every(Number.isFinite)) nan++; });
      n++;
    }
    // ---- RIDING POSES vs photos of kids on 20" BMXs (kid A round 6: "compare with images online of people riding bikes";
    // the ranges from the photo notes in docs/KIDCHAR.md phase 5): per pose a few key angles in the BIKE's frame
    if (bike === "bmx" && IS_A) {
      const F = E.frame, inv = new THREE.Matrix4();
      const loc = (v) => v.clone().applyMatrix4(inv);
      const P = (n) => loc(wp(n));
      const POSES = {
        cruise: { mo: {}, cranks: [0, 6, 12, 18] }, sprint: { mo: { sprint: 1 }, cranks: [0, 6, 12, 18] },
        descent: { mo: { preload: 1 }, cranks: [6] }, air: { mo: { air: true, legs: 0.3 }, cranks: [6] },
        landing: { mo: { legs: -0.9 }, cranks: [6] }, berm: { mo: { lean: 0.55 }, cranks: [6] }, manual: { mo: { manual: 1, pitch: 0.45 }, cranks: [6] },
      };
      const RES = {};
      for (const [pn, { mo, cranks }] of Object.entries(POSES)) {
        const acc = { torso: [], head: [], elbow: [], knee: [], foot: [], hipX: [], elbowOut: [], kneeOut: [], roll: [] };
        for (const c of cranks) {
          Object.assign(s, { sprint: 0, legs: 0, preload: 0, manual: 0, pitch: 0, lean: 0, air: false, footDown: 0, wobbleNow: 0, wobbleW: 0, grindSeg: -1, grindBal: 0 }, mo);
          s.crank = c / 24 * Math.PI * 2; s.steerAngle = 0; s.prev.lean = s.lean; s.prev.pitch = s.pitch;
          bikePose(s, 1, pose); bm.update(s, pose, () => 0); rig?.update(s); bm.root.updateMatrixWorld(true);
          const MM = rider.ride(E, s, holder, 0); gltf.scene.updateMatrixWorld(true);
          (acc.slid ||= []).push(MM.slid || 0); (acc.fit ||= []).push(MM.fitted || 0);
          inv.copy(F.matrixWorld).invert();
          const pel = P("pelvis"), nk = P("neck_01"), bbp = loc(E.bb.getWorldPosition(new THREE.Vector3())), sea = loc(E.seat.getWorldPosition(new THREE.Vector3()));
          (acc.hipUp ||= []).push(pel.y - sea.y);
          acc.torso.push(Math.atan2(nk.z - pel.z, nk.y - pel.y) * 57.3);                // forward lean from the frame's up
          // the head's facing: the Head bone's world rotation x its bind offset, +z (the model's forward) in the frame
          const hq = gltf.scene.getObjectByName("Head").getWorldQuaternion(new THREE.Quaternion()).multiply(rider.mq.Head.clone().invert());
          const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(hq);                          // (the WORLD: the eyes on the road)
          acc.head.push(Math.atan2(-fw.y, Math.hypot(fw.x, fw.z)) * 57.3);               // + = looking down
          for (const sd of ["l", "r"]) {
            acc.elbow.push(angAt(`upperarm_${sd}`, `lowerarm_${sd}`, `hand_${sd}`));
            acc.knee.push(angAt(`thigh_${sd}`, `calf_${sd}`, `foot_${sd}`));
            const ft = P(`foot_${sd}`), ba = P(`ball_${sd}`);
            acc.foot.push(Math.atan2(ft.y - ba.y, Math.hypot(ba.z - ft.z, ba.x - ft.x)) * 57.3);   // + = toes down
            const sg = sd === "l" ? 1 : -1;
            const sh = P(`upperarm_${sd}`), el = P(`lowerarm_${sd}`), ha = P(`hand_${sd}`), th = P(`thigh_${sd}`), kn = P(`calf_${sd}`), an = P(`foot_${sd}`);
            acc.elbowOut.push(sg * (el.x - (sh.x + ha.x) / 2));                            // m outward of the shoulder-wrist line
            acc.kneeOut.push(sg * (kn.x - (th.x + an.x) / 2));
          }
          acc.hipX.push((pel.z - bbp.z));                                                   // m, + = hips ahead of the BB
          // the body's lean in the world vs the bike's: the spine's roll from the world vertical / the bike's lean
          const pw = wp("pelvis"), nw = wp("neck_01"), lat = new THREE.Vector3(1, 0, 0).transformDirection(F.matrixWorld);
          const d = nw.clone().sub(pw), rollW = Math.atan2(d.dot(new THREE.Vector3(lat.x, 0, lat.z).normalize()), d.y);
          acc.roll.push(mo.lean ? -rollW / mo.lean : 0);
        }
        const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length, mn = (a) => Math.min(...a), mx = (a) => Math.max(...a);
        RES[pn] = { torso: avg(acc.torso), head: avg(acc.head), elbow: avg(acc.elbow), kneeMin: mn(acc.knee), kneeMax: mx(acc.knee), foot: avg(acc.foot), hipX: avg(acc.hipX), elbowOut: avg(acc.elbowOut), kneeOut: avg(acc.kneeOut), roll: avg(acc.roll), hipUp: avg(acc.hipUp), slid: mx(acc.slid), fit: mx(acc.fit) };
      }
      if (process.env.POSE_DEBUG || !quiet) for (const [k, r] of Object.entries(RES)) console.log(`  pose ${k}: torso ${r.torso.toFixed(0)} head ${r.head.toFixed(0)} elbow ${r.elbow.toFixed(0)} knee ${r.kneeMin.toFixed(0)}..${r.kneeMax.toFixed(0)} foot ${r.foot.toFixed(0)} hipX ${(r.hipX * 100).toFixed(0)} cm elbowOut ${(r.elbowOut * 100).toFixed(1)} kneeOut ${(r.kneeOut * 100).toFixed(1)} roll ${r.roll.toFixed(2)} hipUp ${(r.hipUp * 100).toFixed(0)} cm slid ${(r.slid * 100).toFixed(0)} fit ${(r.fit * 100).toFixed(0)}`);
      globalThis.__RIDE_POSES = RES;
      // the photo notes' ranges (docs/KIDCHAR.md phase 5; elbow / knee = interior angles, foot = the foot's pitch, 24 deg
      // = flat on the ground: less = heels down; hipX = the hips ahead of the bottom bracket; lean = body / bike lean)
      const R = RES, bad = [];
      const want = (pn, what, v, lo, hi) => { if (!(v >= lo && v <= hi)) bad.push(`${pn} ${what} ${typeof v === "number" ? v.toFixed(v < 2 && v > -2 ? 2 : 0) : v} (${lo}..${hi})`); };
      for (const pn of Object.keys(R)) want(pn, "head", R[pn].head, -8, 25);
      want("cruise", "torso", R.cruise.torso, 22, 50); want("cruise", "elbow", R.cruise.elbow, 110, 165); want("cruise", "foot", R.cruise.foot, 5, 35);
      want("sprint", "torso", R.sprint.torso, 30, 60); want("sprint", "hipUp", R.sprint.hipUp - R.cruise.hipUp, 0.05, 0.3); want("sprint", "kneeMax", R.sprint.kneeMax, 130, 170); want("sprint", "hipX", R.sprint.hipX, -0.08, 0.1); want("sprint", "elbow", R.sprint.elbow, 85, 150); want("sprint", "elbowOut", R.sprint.elbowOut, 0.05, 0.2); want("sprint", "kneeOut", R.sprint.kneeOut, 0.02, 0.15);
      want("descent", "hipX", R.descent.hipX, -0.35, -0.08); want("descent", "elbow", R.descent.elbow, 90, 150); want("descent", "foot", R.descent.foot, -10, 22);
      want("air", "elbow", R.air.elbow, 90, 150); want("air", "kneeMin", R.air.kneeMin, 60, 125);
      want("landing", "elbow", R.landing.elbow, 80, 130); want("landing", "kneeMin", R.landing.kneeMin, 40, 95); want("landing", "foot", R.landing.foot, -10, 22);
      want("berm", "lean", Math.abs(R.berm.roll), 0.4, 0.95);
      want("manual", "elbow", R.manual.elbow, 125, 175); want("manual", "hipX", R.manual.hipX, -0.4, -0.12);
      check("riding poses vs photos of kids on 20\" BMXs (cruise, sprint, descent, air, landing, berm, manual)", bad.length === 0,
        bad.join("; ") || Object.entries(R).map(([k, r]) => `${k}: torso ${r.torso.toFixed(0)} elbow ${r.elbow.toFixed(0)} knee ${r.kneeMin.toFixed(0)}`).join(" | "), "within the photo notes' ranges");
    }
    check(`rider (${bike}): legs never stretched (${n} poses: 24 crank x 5 steer x ${Object.keys(modes).length} modes)`, legMax <= 1.0, `max reach ${(legMax * 100).toFixed(1)} % of the leg (hips fitted up to ${(fitMax * 100).toFixed(1)} cm)`, "<= 100 %");
    check(`rider (${bike}): arms reach with the elbows bent`, armMax <= 0.92, `max reach ${(armMax * 100).toFixed(1)} % of the arm (spine bent up to ${(spineMax * 57.3).toFixed(0)} deg)`, "<= 92 %");
    check(`rider (${bike}): feet on the pedals, hands on the grips`, legErr < 0.01 && armErr < 0.01, `feet ${(legErr * 1000).toFixed(1)} mm, hands ${(armErr * 1000).toFixed(1)} mm`, "< 10 mm");
    check(`rider (${bike}): no NaN in any bone`, nan === 0, `${nan}`, "0");
    // (kid A polish: "knees too high on the BMX": a seated rider's knee closes to ~70-80 deg at the top of the stroke
    // and opens to ~140-150 at the bottom; the hands reach the bars with the elbows bent)
    if (bike === "bmx") check(`rider (bmx): seated pedalling: knee ${KNEE[0]}-${KNEE[1]} deg at the top, the elbows bent${IS_A ? ", on the saddle" : ""}`, kneeMin >= KNEE[0] && kneeMin <= KNEE[1] && elbowMax <= 172 && (!IS_A || seatSlid <= 0.01),
      `knee ${kneeMin.toFixed(0)} (top) .. ${kneeMax.toFixed(0)} (bottom) deg (legs at most ${(seatLeg * 100).toFixed(0)} %, hips fitted ${(seatFit * 100).toFixed(1)} cm, slid ${(seatSlid * 100).toFixed(1)} cm), elbows at most ${elbowMax.toFixed(0)} deg`, `${KNEE[0]}-${KNEE[1]} at the top, elbows <= 172`);
    // (browser turn: the Idle clip's twisted spine put the arms at 32 / 76 % on a straight road)
    // (feel round 1) a foot down at a stop REACHES the ground: the bike leans toward it (bikePhysics footLean), the
    // hips drop off the saddle (RIDE.footHipDown); before: the target asked 102-104 % of the leg, the foot hung 1.5-2 cm up
    {
      const { RIDE } = await import("../../viewer/kid/riderIK.js");
      let worstR = 0, worstGap = 0;
      for (let c = 0; c < 24; c++) {
        Object.assign(s, { sprint: 0, legs: 0, preload: 0, manual: 0, pitch: 0, lean: BIKE.footLean, air: false, footDown: 1, wobbleNow: 0, wobbleW: 0, grindSeg: -1, grindBal: 0, crank: c / 24 * Math.PI * 2, steerAngle: 0 });
        s.prev.lean = s.lean; s.prev.pitch = 0;
        bikePose(s, 1, pose); bm.update(s, pose, () => 0); rig?.update(s); bm.root.updateMatrixWorld(true);
        const M = rider.ride(E, s, holder, 0);
        worstR = Math.max(worstR, M.legRatio[0]);
        worstGap = Math.max(worstGap, Math.abs(rider.b.foot_l.getWorldPosition(new THREE.Vector3()).y - RIDE.footAnkle));
      }
      check(`rider (${bike}): a foot down at a stop reaches the ground`, worstR <= 0.99 && worstGap < 0.005, `leg asked ${(worstR * 100).toFixed(1)} %, ankle ${(worstGap * 1000).toFixed(1)} mm off its flat-foot height`, "<= 99 %, < 5 mm");
      // the wobble shows: the hips move sideways with it (both ways)
      const hipAt = (w) => { Object.assign(s, { footDown: 0, lean: 0, wobbleNow: w, wobbleW: Math.abs(w), crank: 0 }); s.prev.lean = 0; bikePose(s, 1, pose); bm.update(s, pose, () => 0); rig?.update(s); bm.root.updateMatrixWorld(true); rider.ride(E, s, holder, 0); return rider.b.pelvis.getWorldPosition(new THREE.Vector3()); };
      const swing = hipAt(1).distanceTo(hipAt(-1));
      check(`rider (${bike}): a sketchy landing's wobble moves the body`, swing > 0.05, `hips swing ${(swing * 100).toFixed(1)} cm between the wobble's two sides`, "> 5 cm");
    }
    // (feel round 4) the rider's WEIGHT, driven by the physics step by step (dt 1/120): a 1 m drop, a hard front brake, a
    // turn, pedalling: the limbs move <= ~2 cm a step relative to the pelvis, the hips' spring comes back without a
    // bounce after the landing, hands / feet stay on (IK error)
    if (bike === "bmx") {
      const { stepBike, groundQuery, SURF } = await import("../../viewer/bike/bikePhysics.js");
      const { createBikeEnv } = await import("../../viewer/bike/bikeEnv.js");
      const env = createBikeEnv({ ground: groundQuery(() => 0, () => SURF.asphalt) });
      // (a fresh state starts with a foot down: in the air, feet on the pedals)
      const b = createBikeState(0, 0, 0, 0); b.y += 1; b.vz = 5; b.air = true; b.airT = 0.5; b.contact[0] = b.contact[1] = false; b.sinceContact = 1; b.footDown = 0;
      rider._sm = null; rider._t = undefined; rider._w = null;        // (a fresh rider: not easing out of the static test poses)
      const rel = (bone) => { const p = bone.getWorldPosition(new THREE.Vector3()); return p.sub(rider.b.pelvis.getWorldPosition(new THREE.Vector3())); };
      const limbs = ["hand_l", "hand_r", "foot_l", "foot_r", "Head"];
      let prev = null, maxMove = 0, worstLimb = "", ikErr = 0, minY = 0, overY = 0, landed = -1, maxZ = 0, n = 0;
      const plan = (t) => (t < 1.5 ? {} : t < 2.5 ? { pedal: 1 } : t < 3.2 ? { brakeF: 1 } : t < 5 ? { steer: 1, pedal: 0.6 } : { pedal: 1 });
      for (let i = 0; i < 720; i++) {
        stepBike(b, plan(i / 120), env);
        bikePose(b, 1, pose); bm.update(b, pose, () => 0); rig?.update(b); bm.root.updateMatrixWorld(true);
        const M = rider.ride(E, b, holder, 0);
        ikErr = Math.max(ikErr, ...M.legErr, ...M.armErr);
        const cur = limbs.map((l) => rel(rider.b[l]));
        if (prev && i > 2) cur.forEach((p, k) => { const d = p.distanceTo(prev[k]); if (d > maxMove) { maxMove = d; worstLimb = `${limbs[k]} at ${(i / 120).toFixed(2)} s`; } });
        prev = cur;
        const w = rider._w;
        if (landed < 0 && b.landings > 0) landed = i;
        if (landed >= 0 && i < landed + 120) { minY = Math.min(minY, w.oyU); if (minY < -0.005 && w.oyU > overY) overY = w.oyU; }
        if (i / 120 > 2.5 && i / 120 < 3.2) maxZ = Math.max(maxZ, w.ozU);
        n++;
      }
      check("rider weight: limbs <= 2 cm a step relative to the pelvis, IK on", maxMove <= 0.021 && ikErr < 0.001, `the most a limb moved in one 1/120 s step: ${(maxMove * 100).toFixed(2)} cm (${worstLimb}); IK error ${(ikErr * 1000).toFixed(2)} mm over ${n} steps (a 1 m drop, pedalling, a hard front brake, a turn)`, "<= 2 cm, < 1 mm");
      check("rider weight: the landing sinks the hips, back with no bounce; braking throws them forward", minY < -0.015 && overY < 0.003 && maxZ > 0.015, `landing: the hips ${(minY * 100).toFixed(1)} cm down, overshoot ${(overY * 1000).toFixed(1)} mm; front brake: ${(maxZ * 100).toFixed(1)} cm forward`, "< -1.5 cm, < 3 mm, > 1.5 cm");
    }
    check(`rider (${bike}): seated, bars straight: both arms alike, the back not hunched`, asym < 0.05 && spineMax <= 0.80, `arms differ by ${(asym * 100).toFixed(1)} %, spine at most ${(spineMax * 57.3).toFixed(0)} deg`, "< 5 %, <= 46 deg");
  }
  // pushing + the crash poses + the mount blend: finite
  let bad = 0;
  s.pushing = true; rider.push(E, s, holder, 0, 1.3); s.pushing = false;
  rider.clipPose(holder, "Roll", 0.5, 1, 0, 1, 0.3); rider.clipPose(holder, "FallDown", 2.3, 1, 0, 1, 0.3);
  const snap = rider.snapshot(holder); rider.ride(E, s, holder, 0); rider.blendFrom(snap, holder, 0.5, 0.06);
  gltf.scene.traverse((o) => { if (o.isBone && !o.matrixWorld.elements.every(Number.isFinite)) bad++; });
  check("rider: push / tumble / mount blend poses finite", bad === 0, `${bad} bad bones`, "0");
  // cost
  const tc = performance.now();
  for (let i = 0; i < 200; i++) { s.crank = i * 0.1; bm.update(s, pose, () => 0); rig?.update(s); rider.ride(E, s, holder, 0); }
  const us = (performance.now() - tc) / 200 * 1000;
  check("rider: cost a frame (node)", us < 1500, `${us.toFixed(0)} us`, "< 1.5 ms");
}

// ------------------------------------------------------------------------------------------------ mount / dismount
{
  const { MOUNT, createMount, stepMount, parkStep, mountSpot } = await import("../../viewer/kid/kidMount.js");
  const bike = { x: 0, z: 0, heading: 0, speed: 0, crashed: false, air: false, lean: 0, lying: false };
  const M = createMount("foot"), dt = 1 / 60, log = [];
  const run = (secs, e = false, kidAt = null) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { stepMount(M, { e: e && i === 0 }, kidAt || mountSpot(bike), bike, dt); log.push(...M.events); } };
  run(0.1, true, { x: 5, z: 5 });
  const far = log.includes("far") && M.state === "foot";
  run(0.1, true); const mounting = M.state === "mounting";
  run(MOUNT.mountTime + 0.05); const riding = M.state === "riding";
  bike.speed = 5; log.length = 0; run(0.1, true); const tooFast = log.includes("tooFast") && M.state === "riding";
  bike.speed = 0.1; run(0.1, true); const dis = M.state === "dismounting" && M.park.mode === "standing";
  run(MOUNT.dismountTime + 0.05); const foot = M.state === "foot";
  // the parked bike standing: finite, still
  const sb = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, heading: 0, lean: 0, pitch: 0, legs: 0, prev: {} };
  for (let i = 0; i < 120; i++) parkStep(M, sb, dt, 0);
  const standing = Math.abs(sb.lean - MOUNT.restLean) < 0.01 && sb.x === 0;
  // again, off while rolling: it rolls on and lies down
  run(0.1, true); run(MOUNT.mountTime + 0.05); bike.speed = 1.8; run(0.1, true);
  const rolling = M.park.mode === "rolling";
  run(MOUNT.dismountTime + 0.05);
  Object.assign(sb, { vx: 0, vz: 1.8 });
  for (let i = 0; i < 180; i++) parkStep(M, sb, dt, 0);
  const lying = M.park.mode === "lying" && Math.abs(Math.abs(sb.lean) - 1.45) < 1e-6 && sb.z > 0.3 && Number.isFinite(sb.y);
  // E near the lying bike: picked up, then the mount
  bike.speed = 0; bike.x = sb.x; bike.z = sb.z; log.length = 0; run(0.1, true);
  const pick = M.state === "pickUp"; run(MOUNT.pickUpTime + 0.05); const after = M.state === "mounting";
  run(MOUNT.mountTime + 0.05);
  // the crash: tumble, then the bike physics gets up -> the kid gets back on
  bike.crashed = true; run(0.1); const crashed = M.state === "crashed"; bike.crashed = false; log.length = 0; run(0.1);
  const getUp = log.includes("getUp") && M.state === "mounting"; run(MOUNT.mountTime + 0.05);
  const all = { far, mounting, riding, tooFast, dis, foot, standing, rolling, lying, pick, after, crashed, getUp, back: M.state === "riding" };
  const bad = Object.entries(all).filter(([, v]) => !v).map(([k]) => k);
  check("mount / dismount state machine (13 steps)", !bad.length, bad.length ? `failed: ${bad.join(", ")}` : "far, mount, too fast, off standing, off rolling -> lies, pick up, crash -> get up -> riding", "all");
}

// ------------------------------------------------------------------------------------------------ the keys
{
  const { KEYS, ONE_SHOT } = await import("../../viewer/bike/bikeInput.js");
  const { FOOT_KEYS, KID_KEYS } = await import("../../viewer/kid/kidMount.js");
  const bikeAll = Object.values(KEYS).flat();
  const eFree = !bikeAll.includes("KeyE") && ONE_SHOT.filter((k) => k === "KeyE").length === 1 && KID_KEYS.mount[0] === "KeyE";
  // a key used on foot and on the bike means the same kind of thing (move = pedal / brake / steer, run = sprint,
  // jump = hop, crouch = pump); nothing else on foot collides with the bike's keys
  const same = { move: ["pedal", "brakeR", "left", "right"], run: ["sprint"], jump: ["hop"], crouch: ["pump"] };
  const clash = [];
  for (const [job, keys] of Object.entries(FOOT_KEYS)) for (const k of keys) {
    const bikeJob = Object.entries(KEYS).find(([, ks]) => ks.includes(k))?.[0];
    if (bikeJob && !same[job].includes(bikeJob)) clash.push(`${k}: ${job} / ${bikeJob}`);
    if (ONE_SHOT.includes(k)) clash.push(`${k}: ${job} / one-shot`);
  }
  const src = fs.readFileSync(path.join(ROOT, "viewer/character/input.js"), "utf8");
  const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].every((k) => src.includes(`"${k}"`));
  check("keys: E free on the bike, one-shot once; foot keys = the bike's meaning; arrows walk", eFree && !clash.length && arrows, `${eFree ? "E free" : "E taken"}${clash.length ? "; " + clash.join(", ") : ""}${arrows ? "" : "; no arrows on foot"}`, "no clash");
}

const w = [44, 6, 60];
if (!quiet || failed) for (const r of rows) console.log(`${r[1]}  ${r[0].padEnd(w[0])}  ${String(r[2]).padEnd(w[2])}  (want ${r[3]})`);
console.log(`kid: ${rows.length - failed}/${rows.length} checks pass (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
