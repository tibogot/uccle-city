// The weather in the city: views, presets, pipeline counts, long tasks, GPU A/B (docs/WEATHER.md "City hookup").
//   const w = await import("/debug/weatherCity.js");
//   w.go("stjob"); await w.set("rain"); w.hud(false); ... w.hud(true)
//   await w.switchTest()      -> pipelines compiled + long tasks while cycling every preset
//   await w.ab(["clear", "rain"], 4)  -> mean GPU ms per preset, interleaved rounds (needs a non-RED preflight)
const V = () => window.viewer;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const VIEWS = {
  // Place de Saint-Job, looking west along the Chaussee de Saint-Job past the church
  stjob: { pos: [1185, 538, 1.7], target: [1130, 553, 1.4] },
  stjobHigh: { pos: [1200, 600, 22], target: [1150, 545, 4] },
};
export function go(v, fov = null) {
  const view = typeof v === "string" ? VIEWS[v] : v, w = V().world, c = V().controls, cam = V().camera;
  const [x, z, h] = view.pos, [tx, tz, th] = view.target;
  cam.position.set(x, w.surface(x, z) + h, z);
  c.target.set(tx, w.surface(tx, tz) + th, tz);
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  c.update();
}
export async function weather() { return (await import("/viewer/weather/cityWeather.js")).cityWeather; }
/** a preset at once (seconds = 0), optional solar hour (lighting.hourOverride) */
export async function set(name, { hour = null, seconds = 0, settle = 2500 } = {}) {
  const W = await weather();
  if (hour != null) V().lighting.hourOverride = hour;
  W.setPreset(name, seconds);
  await wait(settle);
  return { preset: W.preset, on: W.weather && (await import("/viewer/weather/weatherState.js")).wx.uOn.value, bakes: W.stats.bakes };
}
export function hud(show) {
  document.querySelectorAll("body > div, .upanel").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = show ? "" : "hidden"; });
}
export const pipelines = () => { const p = V().renderer._pipelines; return { caches: p.caches.size, vertex: p.programs.vertex.size, fragment: p.programs.fragment.size, compute: p.programs.compute.size }; };
/** cycle every preset (crossfades as the panel does), counting new pipelines and long tasks */
export async function switchTest(list = ["clear", "overcast", "drizzle", "rain", "storm", "snowfall", "snow cover", "fog", "clear"], dwell = 4000) {
  const long = [];
  const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push(Math.round(e.duration)); });
  po.observe({ type: "longtask", buffered: false });
  const out = [];
  for (const p of list) {
    const a = pipelines(); long.length = 0;
    await set(p, { seconds: 3, settle: dwell });
    const b = pipelines();
    out.push({ preset: p, newPipelines: b.caches - a.caches, newPrograms: b.fragment - a.fragment + b.vertex - a.vertex + b.compute - a.compute, longTasks: [...long] });
  }
  po.disconnect();
  return out;
}
/** interleaved A/B rounds of GPU ms (the median of each round, viewer.gpuStats().p50) between presets */
export async function ab(presets, rounds = 4, settle = 1500, sample = 2500) {
  const acc = Object.fromEntries(presets.map((p) => [p, []]));
  for (let r = 0; r < rounds; r++) for (const p of presets) {
    await set(p, { settle });
    V().resetGpu();
    await wait(sample);
    const g = V().gpuStats(); if (g.n) acc[p].push(g.p50);
  }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, { mean: +mean(a).toFixed(3), median: +med(a).toFixed(3), n: a.length }]));
}
/** the canvas as a jpg data URL (one rendered frame, read back in the same task) */
export async function jpg(q = 0.86) {
  V().renderFrame();
  const cv = V().renderer.domElement, c2 = new OffscreenCanvas(cv.width, cv.height);
  c2.getContext("2d").drawImage(cv, 0, 0);
  const blob = await c2.convertToBlob({ type: "image/jpeg", quality: q });
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
}
/** post the canvas to a local receiver (a tiny POST-to-file server on `url`) as docs/weather/city/<name> */
export async function save(name, url = "http://127.0.0.1:8891/") {
  const data = await jpg();
  await fetch(url, { method: "POST", body: JSON.stringify({ name, data }) });
  return name;
}
/** time of day as the panel's preset does it (lighting + the grade) */
export function time(id) { V().lighting.apply(id); V().lighting.hourOverride = null; window.__devPanel?.pipe?.look(id); }
/** the cost split (GPU p50 per state, interleaved rounds) in the background: window.__wxAB = { done, out } */
export function costSplit(view = "stjob", rounds = 4) {
  const st = (window.__wxAB = { done: false, out: null });
  (async () => {
    const W = await weather(), v = V();
    const custom = (inp, s) => { W.weather.fade = null; W.preset = "custom"; Object.assign(W.weather.input, inp); Object.assign(W.weather.state, { slush: 0, frost: 0, icicle: 0, ...s }); };
    const S = {
      clear: async () => { W.weather.timeScale = 20; await set("clear", { settle: 1500 }); W.weather.timeScale = 0.0001; },
      overcastDry: async () => { custom({ rain: 0, snow: 0, cloud: 1, temp: 10, vis: 15000 }, { wet: 0, puddle: 0, depth: 0 }); await wait(1500); },
      wetNoRain: async () => { custom({ rain: 0, snow: 0, cloud: 1, temp: 10, vis: 15000 }, { wet: 0.9, puddle: 0.4, depth: 0 }); await wait(1500); },
      rain: async () => { custom({ rain: 4, snow: 0, cloud: 1, temp: 10, vis: 15000 }, { wet: 0.9, puddle: 0.4, depth: 0 }); await wait(1500); },
      snowCoverNoFall: async () => { custom({ rain: 0, snow: 0, cloud: 1, temp: -3, vis: 15000 }, { wet: 0, puddle: 0, depth: 0.15 }); await wait(1500); },
      snowfall: async () => { custom({ rain: 0, snow: 1.5, cloud: 1, temp: -3, vis: 15000 }, { wet: 0, puddle: 0, depth: 0.15 }); await wait(1500); },
    };
    const acc = {};
    for (let r = 0; r < rounds; r++) for (const [k, f] of Object.entries(S)) { await f(); go(view); await wait(800); v.resetGpu(); await wait(2500); const g = v.gpuStats(); (acc[k] ??= []).push(g.p50); }
    W.weather.timeScale = 20; await set("clear", { settle: 500 });
    const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    st.out = Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, { rounds: a, median: med(a), delta: +(med(a) - med(acc.clear)).toFixed(2) }]));
    st.done = true;
  })().catch((e) => { st.done = true; st.out = String(e); });
  return "started";
}
