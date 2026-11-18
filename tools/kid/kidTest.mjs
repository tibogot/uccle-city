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
const rows = [];
let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const t0 = performance.now();

// ------------------------------------------------------------------------------------------------ skeleton + budgets
const kid = readGLB(path.join(ROOT, "models/characters/kid.glb"));
const ual = readGLB(path.join(ROOT, "models/characters/ual.glb"));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "models/characters/kid.json"), "utf8"));
const jn = (g) => g.json.skins[0].joints.map((i) => g.nodes[i].name);
const kj = jn(kid), uj = jn(ual);
check("skeleton = the UAL rig's joints (names, order)", kj.length === uj.length && kj.every((n, i) => n === uj[i]), `${kj.length} joints${kj.every((n, i) => n === uj[i]) ? "" : " (differ)"}`, `${uj.length}, identical`);
let rotErr = 0;
for (const n of kj) rotErr = Math.max(rotErr, Q.angle(kid.nodes[kid.byName.get(n)].r, ual.nodes[ual.byName.get(n)].r));
check("rest orientations kept (only the offsets moved)", rotErr < 2e-3, `max ${(rotErr * 57.3).toFixed(4)} deg (float32 acos noise)`, "< 0.1 deg");
const W0 = worldPose(kid, sampleAnim(kid, null, 0));
check("height 1.40-1.50 m (an 11-12 year old)", meta.kid.height > 1.4 && meta.kid.height < 1.5, `${meta.kid.height} m`, "1.40-1.50");
const tris = kid.json.meshes.map((m) => kid.json.accessors[m.primitives[0].indices].count / 3);
check("LODs: LOD0 <= 15k, LOD1 <= 6k, LOD2 <= 2k tris; one primitive each", tris[0] <= 15000 && tris[1] <= 6000 && tris[2] <= 2000 && kid.json.meshes.every((m) => m.primitives.length === 1), tris.join(" / "), "<= 15000 / 6000 / 2000");
const { KID_PALETTE } = await import("../../viewer/kid/kidModel.js").catch(() => ({ KID_PALETTE: null }));
const slots = meta.kid.slots;
if (KID_PALETTE) check("named slots: every slot has a palette colour", slots.every((sl) => sl in KID_PALETTE), slots.join(","), "all in KID_PALETTE");

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
  const BODY = new Set(["skin", "shirt", "shirt_trim", "shorts", "socks", "sock_stripe", "shoe", "sole", "shoe_accent", "lace"].map((n) => slots.indexOf(n)));
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
check("kid.glb clips: rotations + the pelvis translation only, all on kid joints", kidClipsOk && kid.anims.length >= 30, `${kid.anims.length} clips`, ">= 30, rotations + pelvis");

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
        if (r > 2.5 || r < 0.25) { over++; const j = region[edges[e][0]]; if (j) regionBad[j] = (regionBad[j] || 0) + 1; }
        n++;
      }
    }
    res.push(`${name} ${hi.toFixed(2)}/${lo.toFixed(2)}${over ? ` (${over})` : ""}`);
    if (nan) worst.nan += nan;
    if (hi > worst.hi) worst.hi = hi; if (lo < worst.lo) worst.lo = lo;
    worst.over = (worst.over || 0) + over / n;
  }
  const regionFrac = Object.fromEntries(Object.keys(regionN).filter((k) => k !== "frames").map((k) => [k, (regionBad[k] || 0) / (regionN[k] * regionN.frames)]));
  return { regionFrac, bindErr, nan: worst.nan, hi: worst.hi, lo: worst.lo, frac: worst.over / Math.max(1, res.length), res };
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
  const buf = fs.readFileSync(path.join(ROOT, "models/characters/kid.glb"));
  const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
  let prepErr = "";
  try { const k = prepareKid(gltf); if (k.meshes.length !== 3) prepErr = `${k.meshes.length} LODs`; k.autoLod(30); if (k.lod !== 1) prepErr += " LOD by distance"; k.autoLod(2); }
  catch (e) { prepErr = e.message; }
  check("kidModel: 3 LOD meshes, palette material, LOD switch", !prepErr, prepErr || "ok", "ok");
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
    let legMax = 0, armMax = 0, legErr = 0, armErr = 0, nan = 0, n = 0, fitMax = 0, spineMax = 0, asym = 0;
    for (const [mname, mo] of Object.entries(modes)) for (const steer of [-0.9, -0.45, 0, 0.45, 0.9]) for (let c = 0; c < 24; c++) {
      Object.assign(s, { sprint: 0, legs: 0, preload: 0, manual: 0, pitch: 0, lean: 0, air: false, footDown: 0, wobbleNow: 0, wobbleW: 0, grindSeg: -1, grindBal: 0 }, mo);
      s.crank = c / 24 * Math.PI * 2; s.steerAngle = steer;
      s.prev.lean = s.lean; s.prev.pitch = s.pitch;
      bikePose(s, 1, pose); bm.update(s, pose, () => 0); rig?.update(s); bm.root.updateMatrixWorld(true);
      const M = rider.ride(E, s, holder, 0);
      legMax = Math.max(legMax, ...M.legRatio); armMax = Math.max(armMax, ...M.armRatio);
      legErr = Math.max(legErr, ...M.legErr); armErr = Math.max(armErr, ...M.armErr); fitMax = Math.max(fitMax, M.fitted); spineMax = Math.max(spineMax, M.spine);
      if (mname === "seated" && steer === 0) asym = Math.max(asym, Math.abs(M.armRatio[0] - M.armRatio[1]));
      gltf.scene.traverse((o) => { if (o.isBone && !o.matrixWorld.elements.every(Number.isFinite)) nan++; });
      n++;
    }
    check(`rider (${bike}): legs never stretched (${n} poses: 24 crank x 5 steer x ${Object.keys(modes).length} modes)`, legMax <= 1.0, `max reach ${(legMax * 100).toFixed(1)} % of the leg (hips fitted up to ${(fitMax * 100).toFixed(1)} cm)`, "<= 100 %");
    check(`rider (${bike}): arms reach with the elbows bent`, armMax <= 0.92, `max reach ${(armMax * 100).toFixed(1)} % of the arm (spine bent up to ${(spineMax * 57.3).toFixed(0)} deg)`, "<= 92 %");
    check(`rider (${bike}): feet on the pedals, hands on the grips`, legErr < 0.01 && armErr < 0.01, `feet ${(legErr * 1000).toFixed(1)} mm, hands ${(armErr * 1000).toFixed(1)} mm`, "< 10 mm");
    check(`rider (${bike}): no NaN in any bone`, nan === 0, `${nan}`, "0");
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
