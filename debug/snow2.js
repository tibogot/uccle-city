// claude/snow2 (docs/SNOW2.md): the snow's GPU cost split and the landmark snow views.
//   const S = await import("/debug/snow2.js");
//   S.split("stjob", 4)  -> started; poll S.out() until done: GPU p50 per state (interleaved rounds), deltas vs clear
//   S.view("sacrecoeur") / S.view("saintmarc") / S.view("latour") / S.view("stjob")
//   await S.snow(); await S.clear()
// Compare page loads with and without ?snowfast=old (the materials are compiled once at boot: no live switch).
import * as WC from "/debug/weatherCity.js";
const V = () => window.viewer;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const VIEWS = {
  stjob: WC.VIEWS.stjob,                                                     // Place Saint-Job, street level (FIX4's view)
  stjobHigh: WC.VIEWS.stjobHigh,
  sacrecoeur: { pos: [-262, -1662, 2.0], target: [-262, -1625, 14] },        // Rue Vanderkindere, the front and the 54 deg nave slate
  sacrecoeurHigh: { pos: [-300, -1680, 45], target: [-262, -1605, 18] },
  saintmarc: { pos: [449, -585, 1.7], target: [452, -615, 6] },              // Avenue De Fre, the front and its forecourt
  saintmarcHigh: { pos: [430, -560, 30], target: [453, -620, 4] },
  latour: { pos: [135, 2270, 2], target: [135, 2200, 12] },                  // the castle's front drive
  latourHigh: { pos: [150, 2262, 46], target: [135, 2190, 10] },
};
export function view(k, fov = null) { WC.go(VIEWS[k] ?? k, fov); }

/** one weather state now (no fade): the costSplit's custom states */
async function state(k) {
  const W = await WC.weather();
  const custom = (inp, s) => { W.weather.fade = null; W.preset = "custom"; Object.assign(W.weather.input, inp); Object.assign(W.weather.state, { slush: 0, frost: 0, icicle: 0, ...s }); };
  const show = (o, on) => o?.traverse?.((c) => c.layers.set(on ? 0 : 31));
  show(W.layer?.mesh, true); show(W.snow?.mesh, true);
  if (k === "clear") { W.weather.timeScale = 20; await WC.set("clear", { settle: 1200 }); W.weather.timeScale = 0.0001; return; }
  if (k === "overcastDry") custom({ rain: 0, snow: 0, cloud: 1, temp: 10, vis: 15000 }, { wet: 0, puddle: 0, depth: 0 });
  else if (k === "snowCover") custom({ rain: 0, snow: 0, cloud: 1, temp: -3, vis: 15000 }, { wet: 0, puddle: 0, depth: 0.15 });
  else {
    custom({ rain: 0, snow: 1.5, cloud: 1, temp: -3, vis: 15000 }, { wet: 0, puddle: 0, depth: 0.15 });
    if (k === "snowfallNoLayer") show(W.layer?.mesh, false);
    if (k === "snowfallNoFlakes") show(W.snow?.mesh, false);
  }
  await wait(3600);                     // (the sky / fog couple ramps over 3 s)
}
export async function snow() { await state("snowfall"); }
export async function clear() { await state("clear"); }

/** GPU-BOUND measuring (claude/snow2): at the window's size the dynamic resolution (?quality=auto) and the laptop
 *  GPU's clock both settle to "just 60 fps", so the GPU ms hardly moves with the load (every state ~11.5 ms). Load the
 *  page with ?quality=native and call bound(1.6): ~2560 x 1324, the GPU saturated (~1.9 GHz, fps < 60): ms ~ work */
/** close the start menu (the game picker) if it is up */
export function closeMenu() { const b = [...document.querySelectorAll("button, div, a")].find((e) => e.textContent.trim().startsWith("Explore") && e.offsetParent); b?.click(); return !!b; }
/** after a page load: wait for the weather's map, close the menu, go GPU-bound, start split() */
export async function auto(v = "stjob", rounds = 4, states) {
  for (let i = 0; i < 30; i++) { if (V()?.gpuStats && (await WC.weather()).map?.ready) break; await wait(4000); }
  await wait(5000); closeMenu(); await bound(1.6); return split(v, rounds, states);
}
export async function bound(pr = 1.6) { V().renderer.setPixelRatio(pr); window.dispatchEvent(new Event("resize")); await wait(3000); return [V().renderer.domElement.width, V().renderer.domElement.height]; }

let ST = null;
/** GPU p50 per state, `rounds` interleaved rounds at a view (in the background: poll out()) */
export function split(v = "stjob", rounds = 4, states = ["clear", "overcastDry", "snowCover", "snowfall", "snowfallNoLayer", "snowfallNoFlakes"]) {
  ST = { done: false, out: null, url: location.search, passes: {} };
  (async () => {
    const acc = {};
    for (let r = 0; r < rounds; r++) for (const k of states) {
      await state(k); view(v); await wait(800);
      V().resetGpu(); await wait(3000);
      (acc[k] ??= []).push(V().gpuStats().p50);
      const ps = V().gpuPasses?.(); if (ps) for (const [n, ms] of ps.slice(0, 8)) ((ST.passes[k] ??= {})[n] ??= []).push(ms);
    }
    await state("clear");
    (await WC.weather()).weather.timeScale = 20;
    const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    ST.out = Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, { median: +med(a).toFixed(3), delta: +(med(a) - med(acc.clear)).toFixed(3), rounds: a.map((x) => +x.toFixed(2)) }]));
    for (const k of Object.keys(ST.passes)) for (const n of Object.keys(ST.passes[k])) ST.passes[k][n] = +med(ST.passes[k][n]).toFixed(3);
    ST.done = true;
  })().catch((e) => { ST.done = true; ST.out = String(e?.stack ?? e); });
  return "started";
}
export const out = () => ST;

/** pipelines + fragment programs now (the snow must not add any: fixed pipeline count) */
export const pipelines = WC.pipelines;

/** the materials' snow block alone: snow cover vs the same with wx.uSnowCover forced 0 after the weather's update (the
 *  layer, the gate, the sky unchanged), GPU-bound (call bound() first). -> { cover, noMat, delta } medians */
export async function matCost(v = "stjob", rounds = 3) {
  const W = await WC.weather(), { wx } = await import("/viewer/weather/weatherState.js");
  if (!W.__wrapU) { const o = W.update.bind(W); W.update = (a, b) => { o(a, b); window.__post?.(); }; W.__wrapU = 1; }
  const custom = (inp, s) => { W.weather.fade = null; W.preset = "custom"; Object.assign(W.weather.input, inp); Object.assign(W.weather.state, { slush: 0, frost: 0, icicle: 0, ...s }); };
  const cover = () => custom({ rain: 0, snow: 0, cloud: 1, temp: -3, vis: 15000 }, { wet: 0, puddle: 0, depth: 0.15 });
  const acc = { cover: [], noMat: [] };
  for (let r = 0; r < rounds; r++) for (const k of ["cover", "noMat"]) {
    window.__post = k === "noMat" ? () => { wx.uSnowCover.value = 0; } : null;
    cover(); await wait(3000); view(v); await wait(800); V().resetGpu(); await wait(3000); acc[k].push(V().gpuStats().p50);
  }
  window.__post = null;
  const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return { cover: med(acc.cover), noMat: med(acc.noMat), delta: +(med(acc.cover) - med(acc.noMat)).toFixed(2), acc };
}
