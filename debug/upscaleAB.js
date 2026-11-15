// Temporal upscaling A/B jobs (2026-11-15, docs/UPSCALE.md, docs/perf/AUDIT.md step 15), run per page load by
// debug/loadAB.js in the city's iframe:
//   L.start({ variants: { N: "/viewer/index.html?ring=1&far=1&traffic=0&upscale=0", U: "/viewer/index.html?ring=1&far=1&traffic=0" },
//             rounds: 3, job: ["/debug/upscaleAB.js", "views"], args: [["stjob", "stjob-street", "gstreet", "ivy", "lawn"]] });
// views: named places (viewer/places.js) or the bench views of debug/nightDefault.js. On an upscaled page each view is
// measured at the fixed scales `scales` (live, cityQuality's upscaler) and then with the dynamic resolution ("auto");
// on a native page (?upscale=0) once.
// Also: shots(place, scales) -> PNG data URLs of the canvas per scale (image checks), dr(seconds) -> the DR trace.
import * as A from "/debug/featureAB.js";
import { VIEWS } from "/debug/nightDefault.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function drawsStable(maxS = 60) {
  const r = window.viewer.renderer.info.render, t0 = performance.now();
  let last = -1, ok = 0;
  while (ok < 4 && performance.now() - t0 < maxS * 1000) {
    await sleep(1000);
    const d = r.drawCalls ?? r.calls;
    ok = last > 0 && Math.abs(d - last) <= Math.max(3, last * 0.02) ? ok + 1 : 0;
    last = d;
  }
  return Math.round((performance.now() - t0) / 1000);
}

const brief = (m) => ({ p50: m.gpuP50, p95: m.gpuP95, cpu: m.cpuP50, draws: m.draws });

export async function views(ids, { seconds = 4, settle = 5, scales = [1, 0.75], auto = true } = {}) {
  const out = {}, Q = window.cityQuality, U = Q?._pipe?.upscale;
  for (const id of ids) {
    await A.at(VIEWS[id] ?? id, { settle });
    const wait = await drawsStable();
    if (!U) { out[id] = { native: brief(await A.measure({ seconds })), wait }; continue; }
    const r = { wait };
    for (const s of scales) { U.setScale(s); await sleep(2000); r[s] = brief(await A.measure({ seconds })); }
    if (auto) {
      Q.set("auto"); U.dynres = true;
      await sleep(7000);
      r.auto = { ...brief(await A.measure({ seconds })), scale: U.scale };
    }
    out[id] = r;
  }
  A.release();
  return out;
}

/** the DR at work: hold a view, report the scale changes over `seconds` */
export async function dr(place = "lawn", { seconds = 20, quality = "auto" } = {}) {
  await A.at(VIEWS[place] ?? place, { settle: 3 });
  const Q = window.cityQuality; Q.set(quality); Q._pipe.upscale.dynres = true;
  const t0 = performance.now(), trace = [];
  while (performance.now() - t0 < seconds * 1000) { await sleep(1000); trace.push(Q._pipe.upscale.scale); }
  A.release();
  return { trace, stats: Q.stats() };
}

// ---- LIVE A/B in one page (tighter than page loads while another agent shares the GPU): a native twin pipeline
// (post.js createPipeline, no upscaler, 4x MSAA scene target as ?upscale=0) is built next to the page's upscaled one,
// and the page's pipe.render is pointed at one or the other. Not identical to ?upscale=0 in one detail: the canvas
// itself has no MSAA here (the final full-screen quad only).
let twin = null;
export async function twinNative() {
  if (twin) return twin;
  const V = window.viewer, P = window.cityQuality._pipe;
  const { createPipeline } = await import("/viewer/post.js");
  const N = createPipeline(V.renderer, V.scene, V.camera, { upscale: null, samples: 4 });
  N.setExposureScale(P.exposureScale ?? 1); N.look(P.lookId || "golden");
  const render = P.render, setF = P.setExposureFactor.bind(P);
  P.setExposureFactor = (f) => { setF(f); N.setExposureFactor(f); };
  twin = { N, mode: "U", render };
  P.render = (hook) => (twin.mode === "N" ? N.render(hook) : render(hook));
  twin.mode = "N"; await sleep(8000); twin.mode = "U";       // (its pipelines: the 4x scene variants compile now)
  return twin;
}
/** variants: "N" (native twin), a number (upscaled at that fixed scale) or "auto" (the DR, after 6 s) */
async function setVariant(v) {
  const U = window.cityQuality._pipe.upscale;
  if (v === "N") { twin.mode = "N"; return; }
  twin.mode = "U";
  if (v === "auto") { window.cityQuality.set("auto"); U.dynres = true; await sleep(6000); } else U.setScale(v);
}
export async function liveViews(ids, { variants = ["N", 1, 0.75, "auto"], rounds = 3, settle = 2, seconds = 3 } = {}) {
  await twinNative();
  const out = {};
  for (const id of ids) {
    await A.at(VIEWS[id] ?? id, { settle: 4 });
    out[id] = { wait: await drawsStable() };
    const acc = Object.fromEntries(variants.map((v) => [v, []]));
    for (let r = 0; r < rounds; r++) {
      for (const v of r % 2 ? [...variants].reverse() : variants) {
        await setVariant(v); await sleep(settle * 1000);
        acc[v].push({ ...brief(await A.measure({ seconds })), scale: window.cityQuality._pipe.upscale.scale });
      }
    }
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    for (const v of variants) {
      const a = acc[v].filter((x) => x.p50 != null);
      out[id][v] = { p50: med(a.map((x) => x.p50)), p95: med(a.map((x) => x.p95)), cpu: med(a.map((x) => x.cpu)), draws: med(a.map((x) => x.draws)), n: a.length,
        rounds: a.map((x) => x.p50), ...(v === "auto" ? { scale: a.map((x) => x.scale) } : {}) };
    }
  }
  twin.mode = "U";
  A.release();
  return out;
}
export function mode(m) { if (twin) twin.mode = m; return twin?.mode; }

/** a tram passing a still camera (ghosting / disocclusion check): the camera 14 m beside the track, `lead` s ahead of
 *  the tram nearest to (x, z); resolves when it is placed (the tram arrives ~lead s later) */
export async function tramPass({ x = 1150, z = 548, side = 14, lead = 5 } = {}) {
  const t = window.viewer.tram();
  const near = () => t.positions().sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  let a = near(), b = a;
  for (let i = 0; i < 60; i++) { await sleep(1000); b = near(); if (b.trip === a.trip && Math.hypot(b.x - a.x, b.z - a.z) > 3) break; a = b; }
  const d = Math.hypot(b.x - a.x, b.z - a.z), fx = (b.x - a.x) / d, fz = (b.z - a.z) / d;
  const px = b.x + fx * d * lead, pz = b.z + fz * d * lead;
  await A.at({ p: [px - fz * side, 1.7, pz + fx * side], t: [px, 2, pz] }, { settle: 0.3 });
  return { speed: +d.toFixed(1), at: [Math.round(px), Math.round(pz)] };
}
