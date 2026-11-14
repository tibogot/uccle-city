// The night lights' runtime day -> night switch probe (docs/NIGHT_HOOKUP.md round 2): switches the dev panel's time
// select and reports, over the next `seconds`: long tasks, render pipelines created (sync / async), new render objects,
// the slowest frames and what ran in them (each updater, each renderer.render call by camera).
//   const N = await import("/debug/nightSwitch.js"); await N.switchTo("night")
import "./perfRun.js";        // (installs the pipeline + long-task hooks)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function switchTo(value = "night", { seconds = 6, slow = 40 } = {}) {
  const V = window.viewer, R = V.renderer, O = R._objects, U = V.updaters, S = window.__perf;
  const sel = [...document.querySelectorAll("select")].find((s) => [...s.options].some((o) => o.value === "night"));
  if (!sel) throw new Error("no time select");
  // per frame: each updater's ms and each render call's ms
  let cur = null;
  const frames = [];
  const origU = U.slice();
  const names = origU.map((f, i) => f.name || `u${i}`);
  for (let i = 0; i < U.length; i++) {
    const f = U[i];
    U[i] = function (...a) {
      if (i === 0) { if (cur) frames.push(cur); cur = { t: performance.now(), u: {}, r: [] }; }
      const t = performance.now(); const r = f.apply(this, a); const d = performance.now() - t;
      if (cur && d > 2) cur.u[`${i}:${names[i]}`] = +d.toFixed(1);
      return r;
    };
  }
  const orr = R.render;
  R.render = function (s, c) {
    const t = performance.now(); const r = orr.call(this, s, c); const d = performance.now() - t;
    if (cur && d > 2) cur.r.push([c?.isOrthographicCamera ? "ortho" : c?.fov > 100 ? "spot" : c?.type, +d.toFixed(1)]);
    return r;
  };
  const ro = {}, byName = {}, names2 = false;
  const oc = O.createRenderObject;
  O.createRenderObject = function (...a) {
    const m = a[4], c = a[6], k = m?.isShadowPassMaterial ? (c?.isOrthographicCamera ? "sunShadow" : "lampShadow") : c?.isOrthographicCamera ? "ortho" : "main";
    ro[k] = (ro[k] || 0) + 1;
    if (k !== "lampShadow" || !names2) { const o = a[3]; const nm = (o?.name || o?.parent?.name || o?.type || "?").replace(/[-_ ]?\d+.*$/, "") + (o?.layers?.isEnabled(7) ? "+warm" : "") + (o?.visible === false ? "(hidden)" : ""); const b = (byName[k] ??= {}); b[nm] = (b[nm] || 0) + 1; }
    return oc.apply(this, a);
  };
  const L0 = S.long.length, P0 = S.pipes.length, t0 = performance.now();
  sel.value = value; sel.dispatchEvent(new Event("change"));
  await sleep(seconds * 1000);
  O.createRenderObject = oc; R.render = orr;
  for (let i = 0; i < origU.length; i++) U[i] = origU[i];
  const gaps = [];
  for (let k = 1; k < frames.length; k++) { const d = frames[k].t - frames[k - 1].t; if (d > slow) gaps.push({ at: Math.round(frames[k - 1].t - t0), ms: Math.round(d), upd: frames[k - 1].u, render: frames[k - 1].r }); }
  return {
    value, frames: frames.length,
    long: S.long.slice(L0).map(([t, d]) => [Math.round(t - t0), Math.round(d)]),
    pipes: S.pipes.slice(P0).map((p) => [Math.round(p[0] - t0), p[1], p[2]]),
    renderObjects: ro, byName, slowFrames: gaps.slice(0, 12),
  };
}
