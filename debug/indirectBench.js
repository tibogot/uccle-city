// PERF JOB C A/B (docs/PERF_RESEARCH_2026-11.md "Job C result"): GPU cost of the whole scene at a fixed view, by two
// clocks, for page-load A/B (?indpool=old vs default):
//   - `ts`: three's timestamp queries (debug/groupBench.js bench, full scene + sun shadow): render + compute passes only.
//     Dawn's indirect-args VALIDATION runs in its own compute work before each render pass, outside three's timestamps,
//     so this clock does not see it.
//   - `wall`: `reps` renders submitted back to back, then queue.onSubmittedWorkDone(): ms a render while the GPU is the
//     bottleneck, validation included (the main thread's encode cost is in it too: compare `cpu`; when wall ~ cpu the
//     CPU is the bottleneck: raise `scale` (the target's size x scale) until wall > cpu, so the GPU limits it).
//   const B = await import("/debug/indirectBench.js");
//   await B.run({ view: "street" | "45m", rounds: 6, reps: 24 })   -> { ts, wall, cpu, distinct }
import * as THREE from "three/webgpu";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (x) => { const s = [...x].sort((p, q) => p - q); return +s[Math.floor(s.length / 2)].toFixed(3); };
/** stjob-street (featureAB place) and a 45 m view over the same spot */
export const VIEWS = { street: "stjob-street", "45m": "stjob" };

export async function put(view) {
  const A = await import("/debug/featureAB.js");
  return A.at(VIEWS[view] || view, { settle: 6 });
}

export async function run({ view = "street", rounds = 6, reps = 24, scale = 1 } = {}) {
  await put(view);
  const V = window.viewer, R = V.renderer, cam = V.camera, dev = R.backend.device;
  const G = await import("/debug/groupBench.js");
  const C = await import("/debug/indirectCount.js");
  C.start(); await sleep(1500); C.stop();
  const rep = C.report(), main = Object.values(rep.byPass).filter((b) => b.indAvg > 100);
  const ts = await G.bench({ cur: () => {} }, { rounds, reps: 16, full: true });
  // wall clock: back-to-back renders of the scene into an off-screen target, the render loop paused
  const anim = R._animation, loop = anim._animationLoop, dpr = R.getPixelRatio();
  const rt = new THREE.RenderTarget(Math.round(innerWidth * dpr * scale), Math.round(innerHeight * dpr * scale), { samples: 4, type: THREE.HalfFloatType, depthBuffer: true });
  const wall = [], cpu = [];
  R.setAnimationLoop(null);
  try {
    const one = () => { R.setRenderTarget(rt); R.render(V.scene, cam); R.setRenderTarget(null); };
    for (let i = 0; i < 4; i++) one();
    await dev.queue.onSubmittedWorkDone();
    for (let r = 0; r < rounds; r++) {
      await sleep(40);
      await dev.queue.onSubmittedWorkDone();
      const t0 = performance.now();
      for (let i = 0; i < reps; i++) one();
      const t1 = performance.now();
      await dev.queue.onSubmittedWorkDone();
      const t2 = performance.now();
      wall.push((t2 - t0) / reps); cpu.push((t1 - t0) / reps);
      await R.resolveTimestampsAsync(THREE.TimestampQuery.RENDER); await R.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE);
    }
  } finally { rt.dispose(); R.setAnimationLoop(loop); }
  return {
    view, scale, indpool: new URLSearchParams(location.search).get("indpool") || "default",
    distinct: main.map((b) => b.bufsAvg), indDraws: main.map((b) => b.indAvg),
    ts: ts.cur.med, tsAll: ts.cur.all, wall: med(wall), wallAll: wall.map((x) => +x.toFixed(3)), cpu: med(cpu),
    pool: window.__indirectPool?.stats?.() || null,
  };
}
