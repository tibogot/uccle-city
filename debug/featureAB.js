// Perf audit 2026-11-14 (docs/perf/AUDIT.md step 11): per-feature cost at fixed views, for A/B between page loads
// (boot flags such as ?shops=old) or live switches in one page.
//   const A = await import("/debug/featureAB.js");
//   await A.at("stjob-street")                  hold the camera at a named place (viewer/places.js) or { p, t }
//   await A.measure({ seconds: 5 })              GPU p50 / p95, CPU per frame (the render loop), draws, tris, passes
//   await A.views(["stjob-street", "stjob"])     both, one after the other (settle, then measure each)
//   await A.live(onA, onB, { rounds: 4 })        A / B alternated in one page (GPU + CPU + draws per round)
// The camera stays where it was put: the orbit controls' update is held off while measuring (as debug/perfRun.js).
import { PLACES } from "/viewer/places.js";
import { namePasses } from "/debug/perfRun.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s, f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : null);
const S = (window.__featAB ||= { cpu: [], held: null });

function hookCpu() {
  const anim = window.viewer?.renderer?._animation;
  if (!anim || anim._animationLoop?.__fab) return;
  const f = anim._animationLoop;
  const w = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { S.cpu.push(performance.now() - t0); if (S.cpu.length > 20000) S.cpu.splice(0, 10000); } };
  w.__fab = true; anim._animationLoop = w;
}

/** Hold the camera at a place: an id of viewer/places.js or { p: [x, h, z], t: [x, h, z] } (h over the ground). */
export async function at(place, { settle = 6 } = {}) {
  const V = window.viewer, w = V.world, P = typeof place === "string" ? PLACES.find((x) => x.id === place) : place;
  if (!P) throw new Error(`no place ${place}`);
  V.setView("overview");
  const c = V.controls, cam = V.camera;
  if (!S.held) { S.held = c.update; c.update = () => false; }
  const g = (x, z) => (w.walkY ? w.walkY(x, z) : w.surface(x, z));
  const put = () => { cam.position.set(P.p[0], g(P.p[0], P.p[2]) + P.p[1], P.p[2]); c.target.set(P.t[0], g(P.t[0], P.t[2]) + P.t[1], P.t[2]); cam.lookAt(c.target); };
  if (P.fov) { cam.fov = P.fov; cam.updateProjectionMatrix(); }
  // settle: the tiles around stable, then `settle` seconds
  let last = -1, stable = 0;
  for (let i = 0; i < 80 && stable < 4; i++) { put(); await sleep(500); const n = w.tiles.length; stable = n === last ? stable + 1 : 0; last = n; }
  const t0 = performance.now();
  while (performance.now() - t0 < settle * 1000) { put(); await sleep(100); }
  return P.id ?? "custom";
}
export function release() { if (S.held) { window.viewer.controls.update = S.held; S.held = null; } }

/** GPU (timestamp queries) + CPU (the render loop's callback) + draws / tris at the current view. */
export async function measure({ seconds = 5 } = {}) {
  const V = window.viewer;
  hookCpu();
  namePasses(V);
  const names = window.__perf?.passName;
  await sleep(300);
  V.resetGpu();
  const c0 = S.cpu.length, passes = {}, draws = [], tris = [];
  let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) {
    await sleep(250);
    const p = V.gpuPasses();
    if (p) { n++; for (const [k, ms] of p) { const key = names?.get(k) || k; passes[key] = (passes[key] || 0) + ms; } }
    const r = V.renderer.info.render; draws.push(r.drawCalls ?? r.calls); tris.push(r.triangles);
  }
  const g = V.gpuStats(), cpu = S.cpu.slice(c0).sort((a, b) => a - b);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  return { gpuP50: g.p50, gpuP95: g.p95, cpuP50: q(cpu, 0.5), cpuP95: q(cpu, 0.95), draws: Math.round(mean(draws)), trisM: +(mean(tris) / 1e6).toFixed(2),
    frames: cpu.length, passes: Object.entries(passes).map(([k, v]) => [k, +(v / Math.max(1, n)).toFixed(2)]).sort((a, b) => b[1] - a[1]).slice(0, 6) };
}

/** Several places in one page: settle + measure each. */
export async function views(ids, { seconds = 5, settle = 6 } = {}) {
  const out = {};
  for (const id of ids) { await at(id, { settle }); out[typeof id === "string" ? id : (id.id ?? "custom")] = await measure({ seconds }); }
  return out;
}

/** Live A/B: a() / b() alternated `rounds` times at the current view; per round GPU p50, CPU p50, draws. */
export async function live(a, b, { rounds = 4, settle = 1.5, seconds = 3 } = {}) {
  const A = [], B = [];
  for (let i = 0; i < rounds; i++) for (const [f, out] of [[a, A], [b, B]]) { await f(); await sleep(settle * 1000); out.push(await measure({ seconds })); }
  await a();
  const m = (x, k) => +(x.reduce((s, v) => s + v[k], 0) / x.length).toFixed(2);
  const d = (k) => +(m(B, k) - m(A, k)).toFixed(2);
  const spread = (k) => { const ds = B.map((v, i) => v[k] - A[i][k]); return [+Math.min(...ds).toFixed(2), +Math.max(...ds).toFixed(2)]; };
  return { A: { gpuP50: m(A, "gpuP50"), gpuP95: m(A, "gpuP95"), cpuP50: m(A, "cpuP50"), draws: m(A, "draws"), trisM: m(A, "trisM") },
    B: { gpuP50: m(B, "gpuP50"), gpuP95: m(B, "gpuP95"), cpuP50: m(B, "cpuP50"), draws: m(B, "draws"), trisM: m(B, "trisM") },
    diff: { gpuP50: d("gpuP50"), gpuP95: d("gpuP95"), cpuP50: d("cpuP50"), draws: d("draws"), trisM: d("trisM") }, spreadGpuP50: spread("gpuP50") };
}

/** Wait for the cover to lift, then `extra` seconds (a page load in a script). */
export async function ready(extra = 15) {
  for (let i = 0; i < 200; i++) { if (window.viewer && document.getElementById("cover")?.classList.contains("gone")) break; await sleep(500); }
  await sleep(extra * 1000);
}
