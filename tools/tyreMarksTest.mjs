// TYRE MARKS gate (rule 48, docs/TYREMARKS.md): headless, seconds.
//   node --expose-gc --import ./tools/christmas/hook.mjs tools/tyreMarksTest.mjs [--quiet]
// The car (carCtl.js stepCtl on a flat road) driven straight / drifted on the handbrake / braked hard; synthetic
// states for the front-lock rule (a drift inside the countersteer lock: rears only; a spin: the fronts too), a jump's
// touch-down and the motorbike's rear lock; the ring wrapped 1.5 times with a render after each frame: no NaN, the
// uploads by ranges only (1 or 2, never the whole buffer), no DynamicDrawUsage (attributes + source), the age fade
// (CPU mirror + the material compiles to WGSL with it), zero allocation per update, cost < 0.05 ms per update.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const quiet = process.argv.includes("--quiet");
const THREE = await import("three/webgpu");
const { createTyreMarks, markFade, MAX_SEG, MARKS } = await imp("viewer/drive/tyreMarks.js");
const { createCtlState, stepCtl } = await imp("viewer/drive/carCtl.js");
const { createMotoState } = await imp("viewer/moto/motoPhysics.js");

let fails = 0;
const check = (name, ok, info = "") => { if (!ok) fails++; if (!quiet || !ok) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  " + info : ""}`); };
let clock = 0;
const mk = () => createTyreMarks({ ground: () => 0, maskUrl: null, now: () => clock });
const env = { ground: () => 0, contacts: 0 };
const DT = 1 / 60;
const drive = (m, c, inp, secs) => { for (let i = 0; i < secs / DT; i++) { stepCtl(c, inp, DT, env); m.update(c, "car", null, DT); m.mesh.onBeforeRender(); clock += DT; } };

// ---- 1. the car: straight, handbrake drift, hard brake
{
  const m = mk(), c = createCtlState(0, 0, 0);
  drive(m, c, { throttle: 1, steer: 0 }, 6);
  const straight = m.stats.segs;
  check("straight: no marks", straight === 0, `${straight} segments at ${(c.speed * 3.6).toFixed(0)} km/h`);
  drive(m, c, { throttle: 0.3, steer: 1, handbrake: true }, 1.2);
  const B = m.stats.byWheel, rear = B[2] + B[3], front = B[0] + B[1];
  check("handbrake drift: the rears mark", rear > 10, `rear ${rear}, front ${front}, slip ${(c.slip * 57.3).toFixed(0)} deg`);
  const m2 = mk(), c2 = createCtlState(0, 0, 0);
  drive(m2, c2, { throttle: 1, steer: 0 }, 6);
  const v0 = c2.speed;
  drive(m2, c2, { throttle: -1, steer: 0 }, 2.5);
  const K = [];
  for (let s = 0; s < m2.filled; s++) K.push(m2.geometry.attributes.aMark.array[s * 12 + 4]);
  const kMax = K.length ? Math.max(...K) : 0;
  check("hard brake on dry asphalt: a faint mark (ABS), lighter than a slide", m2.stats.segs > 4 && kMax < 0.4, `${m2.stats.segs} segments from ${(v0 * 3.6).toFixed(0)} km/h, alpha max ${kMax.toFixed(2)}`);
  const m3 = mk(), c3 = createCtlState(0, 0, 0);
  drive(m3, c3, { throttle: 1, steer: 0 }, 3);
  drive(m3, c3, { throttle: -0.5, steer: 0 }, 2);
  check("half brake: no marks", m3.stats.segs === 0, `${m3.stats.segs} segments`);
}

// ---- 2. synthetic: front-lock rule, touch-down, the motorbike
const synth = (beta, u = 15) => {
  const c = createCtlState(0, 0, 0);
  c.speed = u; const lat = u * Math.tan(beta); c.vx = lat; c.vz = 0; c.angularVel = 0;   // heading 0: left = +x
  return c;
};
const run = (m, c, kind = "car", H = null, frames = 30, after = null) => {
  for (let i = 0; i < frames; i++) {
    const s = Math.sin(c.heading), k = Math.cos(c.heading), vx = s * c.speed + c.vx, vz = k * c.speed + c.vz;
    c.x += vx * DT; c.z += vz * DT;
    if (c.tyres) { const T = c.tyres, tr = 0.9 * 0.86, a = 1.31; for (let w = 0; w < 4; w++) { const lx = (w % 2 ? -1 : 1) * tr, lz = w < 2 ? a : -a; T.x[w] = c.x + s * lz + k * lx; T.z[w] = c.z + k * lz - s * lx; T.y[w] = 0; } }
    m.update(c, kind, H, DT); m.mesh.onBeforeRender(); clock += DT; after?.(c, i);
  }
};
{
  let m = mk(); run(m, synth(0.38));
  let B = m.stats.byWheel;
  check("drift inside the countersteer lock (22 deg): rears only", B[2] + B[3] > 10 && B[0] + B[1] === 0, `rear ${B[2] + B[3]}, front ${B[0] + B[1]}`);
  m = mk(); run(m, synth(1.0));
  B = m.stats.byWheel;
  check("spin past the lock (57 deg): the fronts mark too", B[0] + B[1] > 10 && B[2] + B[3] > 10, `rear ${B[2] + B[3]}, front ${B[0] + B[1]}`);
  m = mk(); const c = synth(0, 12);
  run(m, c, "car", null, 30, (cc, i) => { cc.tyres.touch.fill(i === 5 ? 8 : 0); });
  check("touch-down after a jump: a short scuff", m.stats.segs >= 4 && m.stats.segs <= 40, `${m.stats.segs} segments (0.14 s at 12 m/s, 4 wheels)`);
  m = mk(); const h = synth(0, 12); h.tyres.hb = 1; run(m, h);
  B = m.stats.byWheel;
  check("handbrake (no slide yet): rears only", B[2] + B[3] > 10 && B[0] + B[1] === 0, `rear ${B[2] + B[3]}, front ${B[0] + B[1]}`);
  // the motorbike: rear brake locked at 54 km/h; a wheelie; in the air
  m = mk(); const b = createMotoState(0, 0, 0); b.speed = 15; b.rearBrake = 1;
  run(m, b, "moto", { wheelbase: 1.45 });
  B = m.stats.byWheel;
  check("motorbike rear lock: the rear marks, the front not", B[1] > 10 && B[0] === 0, `rear ${B[1]}, front ${B[0]}`);
  m = mk(); const a = createMotoState(0, 0, 0); a.speed = 15; a.rearBrake = 1; a.air = true;
  run(m, a, "moto", { wheelbase: 1.45 });
  check("motorbike in the air: nothing", m.stats.segs === 0, `${m.stats.segs}`);
  m = mk(); const t = createMotoState(0, 0, 0); t.speed = 10;
  run(m, t, "villo", { wheelbase: 1.1 }, 30, (cc, i) => { if (i === 4) { cc.touchN++; cc.touchV = 6; } });
  check("Villo touch-down: a scuff", m.stats.segs > 0 && m.stats.segs <= 20, `${m.stats.segs} segments (2 wheels)`);
}

// ---- 3. the ring: wrap 1.5 x, ranges only, no NaN, no DynamicDrawUsage
{
  const m = mk(), c = synth(1.0, 20);
  const ranges = []; let wrapped = false, maxCount = 0, rangesOk = true;
  const G = m.geometry;
  // (one two-wheeler frame first: 2 segments, so a later frame's 4 straddle the ring's end: the two-range upload)
  { const b = createMotoState(0, 0, 0); b.speed = 15; b.rearBrake = 1; run(m, b, "moto", { wheelbase: 1.45 }, 3); }
  let cur = m.cursor;
  const frames = Math.ceil((MAX_SEG * 1.5) / 4 / ((20 * DT) / MARKS.minSeg | 1));
  for (let i = 0; i < frames + 2000 && m.stats.segs < MAX_SEG * 1.5; i++) {
    run(m, c, "car", null, 1);
    const r = G.attributes.position.updateRanges;
    if (r.length) { ranges[r.length] = (ranges[r.length] || 0) + 1; for (const q of r) maxCount = Math.max(maxCount, q.count); if (r.length > 2) rangesOk = false; }
    if (m.cursor < cur) wrapped = true;
    cur = m.cursor;
    if (c.x * c.x + c.z * c.z > 4e6) { c.x = 0; c.z = 0; }
  }
  // a frame that is not rendered keeps its span: two updates, one render
  run(m, c, "car", null, 1); const before = m.pending;
  for (let i = 0; i < 2; i++) { const s = Math.sin(c.heading), k = Math.cos(c.heading); c.x += (s * c.speed + c.vx) * DT; c.z += (k * c.speed + c.vz) * DT; const T = c.tyres; for (let w = 0; w < 4; w++) { T.x[w] += (s * c.speed + c.vx) * DT; T.z[w] += (k * c.speed + c.vz) * DT; } m.update(c, "car", null, DT); }
  const kept = m.pending; m.mesh.onBeforeRender();
  let nan = 0;
  for (const name of ["position", "uv", "aMark"]) for (const v of G.attributes[name].array) if (!Number.isFinite(v)) nan++;
  check("ring wraps (1.5 x), no NaN", m.stats.segs >= MAX_SEG * 1.5 && wrapped && nan === 0 && m.filled === MAX_SEG, `${m.stats.segs} segments, cursor ${m.cursor}, ${nan} NaN, draw ${G.drawRange.count}`);
  check("uploads by ranges only (1 or 2, never the whole buffer)", rangesOk && ranges[2] > 0 && maxCount < MAX_SEG * 18 / 4 && m.stats.uploads > 0, `ranges per upload ${JSON.stringify(ranges.map((n, i) => n ? `${i}:${n}` : null).filter(Boolean))}, largest ${maxCount} of ${MAX_SEG * 18} floats`);
  check("an unrendered frame keeps its span", before === 0 && kept >= 2, `pending ${before} -> ${kept}`);
  const usages = Object.values(G.attributes).map((a) => a.usage);
  const src = fs.readFileSync(path.join(ROOT, "viewer/drive/tyreMarks.js"), "utf8");
  check("no DynamicDrawUsage", usages.every((u) => u === THREE.StaticDrawUsage) && !/(setUsage\(|usage\s*=)\s*(THREE\.)?DynamicDrawUsage/.test(src), `usages ${[...new Set(usages)]}`);
  // births are the clock; the fade
  const mkA = G.attributes.aMark.array, last = ((m.cursor - 1 + MAX_SEG) % MAX_SEG) * 12;
  check("fade by age: births stamped, gone at life, seconds when wet", Math.abs(mkA[last + 1] - clock) < 0.1 && markFade(0) === 1 && markFade(30) === 1 && markFade(100) > 0 && markFade(100) < 1 && markFade(MARKS.life) === 0 && markFade(MARKS.lifeWet, 1) === 0,
    `birth ${mkA[last + 1].toFixed(2)} vs clock ${clock.toFixed(2)}, fade 100 s ${markFade(100).toFixed(2)}`);
}

// ---- 4. zero allocation + cost
{
  const m = mk(), c = synth(1.0, 20);
  run(m, c, "car", null, 200);
  globalThis.gc?.();
  const h0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const N = 20000;
  for (let i = 0; i < N; i++) {
    c.x += c.vx * DT; const T = c.tyres; for (let w = 0; w < 4; w++) T.x[w] += c.vx * DT;
    if (c.x > 1e5) { c.x = 0; }
    m.update(c, "car", null, DT); if (i % 1 === 0) m.mesh.onBeforeRender(); clock += DT;
  }
  const ms = (performance.now() - t0) / N;
  globalThis.gc?.();
  const grow = process.memoryUsage().heapUsed - h0;
  check("zero allocation per update", !globalThis.gc || grow < 64 * 1024, globalThis.gc ? `heap ${(grow / 1024).toFixed(1)} KB after ${N} updates + renders` : "(run with --expose-gc to measure)");
  check("cost < 0.05 ms per update", ms < 0.05, `${(ms * 1000).toFixed(2)} us per update (4 wheels marking)`);
}

// ---- 5. the material compiles to WGSL (headless) with the fade
try {
  const { context } = await import("three/tsl");
  const R = { backend: { isWebGPUBackend: true, capabilities: { getUniformBufferLimit: () => 65536 }, hasFeature: () => false, utils: { getTextureSampleData: () => ({ primarySamples: 1, isMSAA: false }) } },
    library: new THREE.StandardNodeLibrary(), contextNode: context({}), getMRT: () => null, getOutputRenderTarget: () => null, getRenderTarget: () => null,
    toneMapping: 0, outputColorSpace: "srgb", lighting: { enabled: false }, highPrecision: false, debug: { diagnostics: { keywords: false }, onNodeBuilderCreated: null },
    getColorBufferType: () => THREE.HalfFloatType, hasFeature: () => false, getMaxAnisotropy: () => 1, nodes: { library: null }, domElement: { height: 1080 } };
  const m = mk();
  const warn = console.warn, log = console.log; console.warn = () => {}; console.log = () => {};
  let b;
  try { b = new THREE.WGSLNodeBuilder(m.mesh, R); b.material = m.material; b.scene = new THREE.Scene(); b.camera = new THREE.PerspectiveCamera(); b.build(); }
  finally { console.warn = warn; console.log = log; }
  check("material compiles to WGSL with the age fade", /aMark/.test(b.vertexShader) && /smoothstep/.test(b.fragmentShader), "");
} catch (e) { check("material compiles to WGSL with the age fade", false, e.message.split("\n")[0]); }

console.log(fails ? `tyremarks: ${fails} FAIL` : "tyremarks: all PASS");
process.exit(fails ? 1 : 0);
