// node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/audit/birdGate.mjs [--quiet] [--secs 90]
// THE SKY FLOCKS' SHAPE GATE (claude/birds2, viewer/birds/flockModel.js; ?birds2=old = the flocks before). Root cause it
// guards (owner playtest 2026-11-18: "boids of birds in the sky look like a ball"): the day flocks were pulled to ONE
// point that stood still for 20-60 s, with all-to-all cohesion and a 1 m personal space: 110-190 birds orbiting a point,
// a ball of overlapping birds. Rule: a flock follows a moving leader on a path, each bird keeps to its 7 nearest
// neighbours a few body lengths off; the murmuration a deforming formation, never a sphere. Checks, on the CPU mirror of
// the GPU step (flockModel.js CpuFlock: the same equations, the same per-bird hashes), each species / the murmuration
// simulated --secs s (30 Hz) with the director's own LeaderPath / MurmurShape, sampled every second after 15 s:
//   1. not a ball: the principal axes a >= b >= c: c / a median <= 0.45 and a "ball" sample (c / a > 0.55 and b / a >
//      0.7) <= 10 % of the time; the old rules (--old mirror) shown for the A/B (they fail: the bug reproduced)
//   2. the shape LIVES: b / a over time varies (its spread p90 - p10 >= 0.08), the flock flies a path (its centroid's
//      track reaches >= 150 m and >= 3 x its own extent: not hovering round a point) - day flocks; the murmuration's long axis changes >= 25 %
//   3. spacing: the nearest-neighbour distance median >= 3 spans (visible birds) and 0.6-2 x the species' spacing (day),
//      1.5-12 spans (murmuration), p5 >= 1 span (no two birds in one)
//   4. on screen: from a ground camera 150 m off (1080p, 60 deg fov): extent >= 40 px, birds merging with a neighbour
//      (screen gap < the drawn chevron) <= 35 %, medians of a sample every 5 s (10 s murmuration) (day); the murmuration >= 120 px
//      wide from 300 m, merging <= 60 % from 150 m (a dusk murmuration is dense: a cloud with texture from far)
//   5. the compute's steer / move of both modes compile to WGSL headless (three's WGSLNodeBuilder, a stub renderer)
//   6. cost / rules: pair tests a frame (day, the counts' squares) <= the old budget; the murmuration's 6 reads; no
//      DynamicDrawUsage, no light in viewer/birds; compute nodes built once (constructor), the ?birds2=old switch and its
//      features row
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CpuFlock, LeaderPath, MurmurShape, DAY_PROFILES, PREY_SIZES, principalAxes, nnDistances, screenTerms } from "../../viewer/birds/flockModel.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const ai = process.argv.indexOf("--secs"), SECS = ai > 0 ? +process.argv[ai + 1] : 90;
const rows = [];
let fails = 0;
const check = (name, ok, detail) => { rows.push([name, ok ? "PASS" : "FAIL", detail]); if (!ok) fails++; };
const info = (name, detail) => rows.push([name, "info", detail]);
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
const SPAN = { starlings: 0.4, pigeons: 0.66, jackdaws: 0.7, parakeets: 0.45, gulls: 1.0, murmuration: 0.4 };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const DT = 1 / 30;
/** the median of screen samples (a pose / view snapshot alone is noisy) */
const medScreen = (a) => ({ extentPx: q(a.map((x) => x.extentPx), 0.5), extentPx2: q(a.map((x) => x.extentPx2), 0.5), merged: q(a.map((x) => x.merged), 0.5), n: a.length });

/** one day flock, new rules: the leader wanders its area (pigeons / jackdaws / parakeets / gulls) or crosses (starlings) */
function simDay(key, count, seed, old = false) {
  const P = DAY_PROFILES[key], rnd = mulberry(seed);
  const L = new LeaderPath({ x: 0, y: 30, z: 0, heading: rnd() * 6.28, speed: (P.vmin + P.vmax) / 2, home: { x: 0, z: 0 }, ...P.leader, rnd });
  if (key === "starlings") L.goal = { x: 1500, z: 300 };
  const F = new CpuFlock(old
    // the old flock (cityBirds profile before birds2): 110-190 starlings / 28-60 jackdaws, a stationary target (a reached waypoint / the tower)
    ? { count, mode: "scan", old: true, vmin: P.vmin - (key === "starlings" ? 1 : 0), vmax: P.vmax, radius: key === "jackdaws" ? 26 : 12, cohesion: key === "jackdaws" ? 0.6 : 1, align: key === "jackdaws" ? 0.6 : 1, circle: key === "jackdaws" ? 3.2 : 0, spawn: [0, 30, 0] }
    : { count, mode: "scan", spacing: P.spacing, vmin: P.vmin, vmax: P.vmax, informed: P.informed, radius: P.radius, spawn: [-40, 30, 0] });
  const split = { x: 0, y: 0, z: 0, t: 20 + rnd() * 20, on: 0 };
  const S = [], scrs = [];
  let pathLen = 0, last = null;
  const cents = [];
  const steps = Math.round(SECS / DT);
  for (let s = 0; s < steps; s++) {
    let Lp;
    if (old) Lp = { x: 0, y: 30, z: 0, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0 };
    else {
      L.step(DT);
      // splits now and then: half the informed birds follow a leader offset 25-45 m sideways for 6-12 s
      split.t -= DT;
      if (split.t < 0) { if (split.on) { split.on = 0; split.t = 20 + rnd() * 25; } else { split.on = 1; split.t = 6 + rnd() * 6; const a = rnd() < 0.5 ? -1 : 1, m = 25 + rnd() * 20; split.gx = Math.cos(L.h) * m * a; split.gz = -Math.sin(L.h) * m * a; } }
      const tx = split.on ? split.gx : 0, tz = split.on ? split.gz : 0, e = Math.min(1, DT / 2);
      split.x += (tx - split.x) * e; split.z += (tz - split.z) * e;
      Lp = { x: L.x, y: L.y, z: L.z, vx: L.vx, vy: L.vy, vz: L.vz, sx: split.x, sy: 0, sz: split.z };
    }
    F.step(DT, s, Lp);
    if (s * DT >= 15 && s % 30 === 0) {
      const A = principalAxes(F.p, count);
      for (const c of cents) pathLen = Math.max(pathLen, Math.hypot(A.cx - c.cx, A.cy - c.cy, A.cz - c.cz));   // the track's reach
      cents.push(A); last = A;
      S.push({ ...A, ca: A.c / A.a, ba: A.b / A.a });
      if (s % 150 === 0) scrs.push(screenTerms(F.p, count, SPAN[key], 150));
    }
  }
  const nn = nnDistances(F.p, count), scr = medScreen(scrs);
  return { S, pathLen, nn, scr, ext: q(S.map((s) => s.a * 4), 0.5) };
}

/** the murmuration: a leader swooping round the roost, the shape manoeuvres, a hawk every 20-45 s */
function simMur(count, seed, old = false) {
  const rnd = mulberry(seed);
  const L = new LeaderPath({ x: 0, y: 70, z: 0, heading: 0, speed: 14, home: { x: 0, z: 0 }, R: 140, yLo: 45, yHi: 110, turnMax: 0.4, turnSigma: 0.3, rnd });
  const M = new MurmurShape(rnd);
  const F = new CpuFlock({ count, mode: "lattice", rest: 2.6, vmin: 11, vmax: 19, cohesion: 1, align: 1.1, old, spawn: [-60, 70, 0] });
  const hk = { t: 20 + rnd() * 25, on: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0 };
  let hx = 1, hz = 0, T = rnd() * 100;
  const S = [], scrs = [], scrsN = [];
  const steps = Math.round(SECS / DT);
  for (let s = 0; s < steps; s++) {
    const px = L.x, pz = L.z;
    L.step(DT);
    const mx = L.x - px, mz = L.z - pz, ml = Math.hypot(mx, mz), k = 1 - Math.exp(-0.8 * DT);
    if (ml > 1e-4) { hx += (mx / ml - hx) * k; hz += (mz / ml - hz) * k; }
    hk.t -= DT;
    if (hk.t < 0 && !hk.on) { const a = rnd() * 6.28; hk.on = 3.5; hk.x = L.x - Math.cos(a) * 60; hk.z = L.z - Math.sin(a) * 60; hk.y = L.y; hk.vx = Math.cos(a) * 30; hk.vz = Math.sin(a) * 30; }
    let hawk = null;
    if (hk.on) { hk.on -= DT; hk.x += hk.vx * DT; hk.z += hk.vz * DT; hawk = { x: hk.x, y: hk.y, z: hk.z, r: 24 }; if (hk.on <= 0) { hk.on = 0; hk.t = 20 + rnd() * 25; } }
    let R;
    if (old) {
      T += DT;
      R = { sx: 1 + 0.45 * Math.sin(T * 0.13) + 0.2 * Math.sin(T * 0.31), sz: 1 + 0.5 * Math.sin(T * 0.09 + 1.7) + 0.25 * Math.sin(T * 0.27), sy: 1.2 + 0.9 * Math.max(0, Math.sin(T * 0.07 + 0.4)), bend: 0.35 * Math.sin(T * 0.11 + 2.1), ripple: T * 0.9, side: 0, sb: 0, pinch: 0, tilt: 0, fold: 0, dens: 0, densPh: 0, waveAmp: 0 };
    } else R = M.step(DT, hawk ? 1 : 0);
    R.hx = hx; R.hz = hz;
    F.step(DT, s, { x: L.x, y: L.y, z: L.z }, R, hawk);
    if (s * DT >= 15 && s % 30 === 0) {
      const A = principalAxes(F.p, count); S.push({ ...A, ca: A.c / A.a, ba: A.b / A.a });
      if (s % 300 === 0) { scrs.push(screenTerms(F.p, count, SPAN.murmuration, 300)); scrsN.push(screenTerms(F.p, count, SPAN.murmuration, 150)); }
    }
  }
  const nn = nnDistances(F.p, count), scr = medScreen(scrs), scrN = medScreen(scrsN);
  return { S, nn, scr, scrN };
}

const fmt = (x, d = 2) => x.toFixed(d);
function judgeDay(key, r, old) {
  const ca = r.S.map((s) => s.ca), ba = r.S.map((s) => s.ba), ball = r.S.filter((s) => s.ca > 0.55 && s.ba > 0.7).length / r.S.length;
  const span = SPAN[key], nnMed = q(r.nn, 0.5) / span, nnP5 = q(r.nn, 0.05) / span;
  const res = {
    ball: q(ca, 0.5) <= 0.45 && ball <= 0.1,
    lives: q(ba, 0.9) - q(ba, 0.1) >= 0.08 && r.pathLen >= Math.max(150, 3 * r.ext),
    spacing: nnMed >= 3 && nnMed * span >= 0.6 * DAY_PROFILES[key].spacing && nnMed * span <= 2 * DAY_PROFILES[key].spacing && nnP5 >= 1,
    screen: r.scr.extentPx >= 40 && r.scr.merged <= 0.35,
  };
  const d = `c/a med ${fmt(q(ca, 0.5))}, ball ${fmt(ball * 100, 0)} %; b/a ${fmt(q(ba, 0.1))}-${fmt(q(ba, 0.9))}, reach ${fmt(r.pathLen, 0)} m (extent ${fmt(r.ext, 0)} m); nn med ${fmt(nnMed, 1)} / p5 ${fmt(nnP5, 1)} spans; 150 m: ${fmt(r.scr.extentPx, 0)} x ${fmt(r.scr.extentPx2, 0)} px, merged ${fmt(r.scr.merged * 100, 0)} %`;
  return { res, d, old };
}

// ---- 1-4 day flocks: new (gated) and old (shown)
const DAYN = { starlings: 45, pigeons: 30, jackdaws: 26, parakeets: 20, gulls: 20 };
for (const key of Object.keys(DAYN)) {
  const n = DAYN[key];
  let allOk = true; const ds = [];
  for (const seed of [1, 2, 3]) {
    const J = judgeDay(key, simDay(key, n, seed * 7919 + n), false);
    const ok = Object.values(J.res).every(Boolean);
    allOk &&= ok; ds.push(`${ok ? "" : "[" + Object.entries(J.res).filter(([, v]) => !v).map(([k]) => k).join(",") + "] "}${J.d}`);
  }
  check(`day-${key}`, allOk, `${n} birds, 3 runs x ${SECS} s: ${ds[0]}${quiet ? "" : "\n      " + ds.slice(1).join("\n      ")}`);
}
// the falcon game's prey sizes (PREY_SIZES: the old counts, new rules): loose flocks too, at the largest count
for (const [key, [, n]] of Object.entries(PREY_SIZES)) {
  let allOk = true; const ds = [];
  for (const seed of [1, 2]) {
    const J = judgeDay(key, simDay(key, n, seed * 104729 + n), false);
    const ok = Object.values(J.res).every(Boolean);
    allOk &&= ok; ds.push(`${ok ? "" : "[" + Object.entries(J.res).filter(([, v]) => !v).map(([k]) => k).join(",") + "] "}${J.d}`);
  }
  check(`prey-${key}`, allOk, `falcon game size ${n}, 2 runs: ${ds.join(quiet ? " / " : "\n      ")}`);
}
for (const [key, n] of [["starlings", 150], ["jackdaws", 44]]) {
  const J = judgeDay(key, simDay(key, n, 11, true), true);
  info(`old-${key}`, `?birds2=old mirror, ${n} birds at a reached waypoint / the tower: ${Object.entries(J.res).filter(([, v]) => !v).map(([k]) => k + " FAIL").join(", ") || "passes"}: ${J.d}`);
}

// ---- the murmuration
for (const [n, old] of [[3072, false], [900, false], [3072, true]]) {
  const rr = simMur(n, 4242 + n, old);
  const ca = rr.S.map((s) => s.ca), ba = rr.S.map((s) => s.ba), a = rr.S.map((s) => s.a);
  const ball = rr.S.filter((s) => s.ca > 0.55 && s.ba > 0.7).length / rr.S.length;
  const nnMed = q(rr.nn, 0.5) / SPAN.murmuration, nnP5 = q(rr.nn, 0.05) / SPAN.murmuration;
  const res = {
    ball: q(ca, 0.5) <= 0.45 && ball <= 0.1,
    lives: q(ba, 0.9) - q(ba, 0.1) >= 0.08 && (q(a, 0.9) - q(a, 0.1)) / q(a, 0.5) >= 0.25,
    spacing: nnMed >= 1.5 && nnMed <= 12 && nnP5 >= 1,
    screen: rr.scr.extentPx >= 120 && rr.scrN.merged <= 0.6,
  };
  const d = `c/a med ${fmt(q(ca, 0.5))} (p90 ${fmt(q(ca, 0.9))}), ball ${fmt(ball * 100, 0)} %; b/a ${fmt(q(ba, 0.1))}-${fmt(q(ba, 0.9))}, long axis ${fmt(q(a, 0.1), 0)}-${fmt(q(a, 0.9), 0)} m (sigma); nn med ${fmt(nnMed, 1)} / p5 ${fmt(nnP5, 1)} spans; 300 m: ${fmt(rr.scr.extentPx, 0)} x ${fmt(rr.scr.extentPx2, 0)} px (merged ${fmt(rr.scr.merged * 100, 0)} %), 150 m merged ${fmt(rr.scrN.merged * 100, 0)} %`;
  const bad = Object.entries(res).filter(([, v]) => !v).map(([k]) => k);
  if (old) info(`old-murmuration`, `${n}: ${bad.map((k) => k + " FAIL").join(", ") || "passes"}: ${d}`);
  else check(`murmuration-${n}`, !bad.length, `${bad.length ? "[" + bad.join(",") + "] " : ""}${d}`);
}

// ---- 5. cost / rules
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const pairsNew = Object.entries(DAY_PROFILES).reduce((s, [k, p]) => s + p.n[1] ** 2 * (k === "jackdaws" ? 2 : 1), 0);
const pairsPrey = Object.entries(DAY_PROFILES).filter(([k]) => k !== "pigeons").reduce((s, [k, p]) => s + (PREY_SIZES[k] ?? p.n)[1] ** 2 * (k === "jackdaws" ? 2 : 1), 0);   // (no sky pigeons in the falcon flight)
const pairsOld = 190 ** 2 + 2 * 60 ** 2 + 34 ** 2 + 52 ** 2;
check("cost-pairs", pairsNew <= pairsOld && pairsPrey <= pairsOld, `day flocks' pair tests a frame at the largest counts: ${pairsNew}, falcon game sizes ${pairsPrey} (old ${pairsOld}; the 7-neighbour insertion ~7 min/max a pair more); murmuration 6 lattice reads a bird (unchanged)`);
const src = ["viewer/birds/skyFlocks.js", "viewer/birds/cityBirds.js", "viewer/birds/birdMesh.js", "viewer/birds/flockModel.js"].map((p) => [p, rd(p)]);
check("no-dynamic-draw", src.every(([, s]) => !/DynamicDrawUsage/.test(s)), "no DynamicDrawUsage in viewer/birds");
check("no-lights", src.every(([, s]) => !/new THREE\.\w*Light\b/.test(s)), "no light created in viewer/birds (fixed light count)");
const sky = rd("viewer/birds/skyFlocks.js");
const computeCalls = [...sky.matchAll(/\.compute\(/g)].length, buildOnce = /constructor[\s\S]*?this\.buildCompute\(\)/.test(sky) && [...sky.matchAll(/this\.buildCompute\(\)/g)].length === 1;
check("pipelines-once", buildOnce && !/update\([^)]*\)\s*\{[^}]*Fn\(/.test(sky), `compute nodes built once in the constructor (${computeCalls} .compute( sites; the dispatch in update() reuses them): 0 pipelines at runtime (browser: create*Pipeline hooked, see docs/BIRDS.md)`);
// the compute builds: steer + move of both modes compiled to WGSL headless (three's WGSLNodeBuilder on a stub renderer):
// a TSL slip fails here, not in the browser; the new steer's neighbour loop is one loop over the slot (no nested loop)
try {
  globalThis.location ??= { search: "" };
  const THREE = await import("three/webgpu"), { context } = await import("three/tsl");
  const { SkyFlocks } = await import("../../viewer/birds/skyFlocks.js");
  const R = { backend: { isWebGPUBackend: true, capabilities: {}, hasFeature: () => false, utils: { getTextureSampleData: () => ({ primarySamples: 1, isMSAA: false }) } },
    library: new THREE.StandardNodeLibrary(), contextNode: context({}), getMRT: () => null, getOutputRenderTarget: () => null, getRenderTarget: () => null,
    toneMapping: 0, outputColorSpace: "srgb", lighting: null, highPrecision: false, debug: { diagnostics: { keywords: false }, onNodeBuilderCreated: null },
    getColorBufferType: () => THREE.HalfFloatType, hasFeature: () => false, getMaxAnisotropy: () => 1, nodes: { library: null }, domElement: { height: 1080 } };
  const out = [];
  let loops = 0;
  for (const old of [false, true]) {
    const sky = new SkyFlocks(R, { old });
    for (const node of [sky.steer, sky.move, sky.reset, sky.clamp]) {
      const b = new THREE.WGSLNodeBuilder(null, R); b.compute = node; b.build();
      out.push(`${old ? "old" : "new"} ${node.name} ${b.computeShader.length}`);
      if (!old && node === sky.steer) loops = (b.computeShader.match(/for \(/g) || []).length;
    }
  }
  check("wgsl", loops <= 1, `compute nodes compile to WGSL headless (${out.length}: ${out.slice(0, 2).join(", ")} chars ...); the new steer has ${loops} loop (the slot scan; the murmuration reads 6 neighbours unrolled)`);
} catch (e) { check("wgsl", false, `compute WGSL build: ${e.message.split("\n")[0]} (run with node --preserve-symlinks --import ./tools/characters/threeHook.mjs)`); }

const feat = rd("viewer/features.js");
check("switch", /old\("birds2"/.test(feat) && /birds2/.test(rd("viewer/birds/cityBirds.js")) && /birds2/.test(sky), "?birds2=old: the features row + both files honour it");

if (!quiet || fails) {
  console.log("| check | result | detail |\n|---|---|---|");
  for (const r of rows) console.log(`| ${r.join(" | ")} |`);
}
console.log(fails ? `\nbirdGate: ${fails} FAIL` : `\nbirdGate: all pass (${rows.length} rows)`);
process.exitCode = fails ? 1 : 0;
