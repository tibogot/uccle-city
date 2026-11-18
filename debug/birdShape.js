// THE SKY FLOCKS' SHAPE, ON THE GPU (claude/birds2; the headless twin: tools/audit/birdGate.mjs on the CPU mirror).
// In a city tab (?birds on, the default), once the flocks are up:
//   const B = await import("/debug/birdShape.js"); await B.run({ seconds: 30 })
// Reads the bird buffer back once a second (debug only), per active slot: the principal axes (a >= b >= c: c / a, b / a
// over time), the nearest-neighbour distances in spans, the flock as the gate's synthetic ground camera sees it (150 m,
// the murmuration 300 m) and as THIS camera sees it (extent px, the share of birds merging with a neighbour on screen);
// while it runs, the device's create*Pipeline calls are counted (0 expected: flocks coming and going build nothing).
// Same thresholds as the gate; ?birds2=old alternated for the A/B.
import { principalAxes, nnDistances, screenTerms } from "../viewer/birds/flockModel.js";
import { SLOTS } from "../viewer/birds/skyFlocks.js";
import { SPECIES } from "../viewer/birds/birdMesh.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

function hookPipelines(device) {
  const n = { compute: 0, render: 0 }, orig = {};
  for (const k of ["createComputePipeline", "createComputePipelineAsync", "createRenderPipeline", "createRenderPipelineAsync"]) {
    orig[k] = device[k];
    device[k] = function (...a) { n[k.includes("Compute") ? "compute" : "render"]++; return orig[k].apply(this, a); };
  }
  return { n, undo() { for (const k in orig) device[k] = orig[k]; } };
}

export async function run({ seconds = 30, every = 1000 } = {}) {
  const B = window.__birds, sky = B?.sky;
  if (!sky) return { error: "no sky flocks (?birds=0 or no WebGPU)" };
  const cam = window.viewer?.camera ?? B.hooks?.camera;
  const dev = window.viewer?.renderer?.backend?.device;
  const hook = dev ? hookPipelines(dev) : null;
  const per = {};
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) {
    const f = await sky.readBirds();
    for (let k = 0; k < SLOTS.length; k++) {
      if (!sky.slotOn(k)) continue;
      const S = SLOTS[k], ep = sky.row(k, 2).w, n = Math.min(S.cap, sky.row(k, 3).y | 0);
      const P = new Float32Array(n * 3); let m = 0;
      for (let i = S.start; i < S.start + n; i++) { const o = i * 12; if (f[o + 11] !== ep) continue; P[m * 3] = f[o]; P[m * 3 + 1] = f[o + 1]; P[m * 3 + 2] = f[o + 2]; m++; }
      if (m < 6) continue;
      const span = SPECIES[S.species].span, A = principalAxes(P, m), R = (per[S.key] ??= { n: m, ca: [], ba: [], a: [], nn: [], cam: [] });
      R.n = m; R.ca.push(A.c / A.a); R.ba.push(A.b / A.a); R.a.push(A.a);
      R.nn = nnDistances(P, m).map((d) => d / span);
      R.syn = screenTerms(P, m, span, S.key === "murmuration" ? 300 : 150);
      if (cam) {
        // this camera: project, extent and merging on screen
        const H = window.innerHeight, ps = cam.projectionMatrix.elements[5] * H * 0.5, v = new cam.position.constructor();
        const pts = []; let merged = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, dsum = 0;
        for (let i = 0; i < m; i++) {
          v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); const d = v.distanceTo(cam.position); dsum += d; v.project(cam);
          if (v.z > 1) continue;
          const x = v.x * window.innerWidth / 2, y = v.y * H / 2; pts.push(x, y, Math.max(span * ps / d, 2.2));
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        for (let i = 0; i < pts.length; i += 3) { let b = 1e9; for (let j = 0; j < pts.length; j += 3) if (j !== i) b = Math.min(b, Math.hypot(pts[i] - pts[j], pts[i + 1] - pts[j + 1])); if (b < pts[i + 2]) merged++; }
        R.cam.push({ dist: dsum / m, w: maxX - minX, h: maxY - minY, merged: pts.length ? merged / (pts.length / 3) : 0 });
      }
    }
    await sleep(every);
  }
  hook?.undo();
  const out = { mode: B.old ? "old" : "new", pipelinesCreated: hook ? hook.n : "no device", flocks: {} };
  for (const [key, R] of Object.entries(per)) {
    const ball = R.ca.filter((c, i) => c > 0.55 && R.ba[i] > 0.7).length / R.ca.length;
    const c = R.cam.at(-1);
    out.flocks[key] = {
      birds: R.n, samples: R.ca.length,
      ca: `med ${q(R.ca, 0.5).toFixed(2)} (p90 ${q(R.ca, 0.9).toFixed(2)})`, ballPct: Math.round(ball * 100),
      ba: `${q(R.ba, 0.1).toFixed(2)}-${q(R.ba, 0.9).toFixed(2)}`,
      nnSpans: `med ${q(R.nn, 0.5).toFixed(1)}, p5 ${q(R.nn, 0.05).toFixed(1)}`,
      synthetic: `${R.syn.extentPx.toFixed(0)} x ${R.syn.extentPx2.toFixed(0)} px, merged ${(R.syn.merged * 100).toFixed(0)} %`,
      thisCamera: c ? `${c.dist.toFixed(0)} m: ${c.w.toFixed(0)} x ${c.h.toFixed(0)} px, merged ${(c.merged * 100).toFixed(0)} %` : "-",
      pass: q(R.ca, 0.5) <= 0.45 && ball <= 0.1 && q(R.nn, 0.05) >= 1,
    };
  }
  console.table(out.flocks);
  return out;
}
