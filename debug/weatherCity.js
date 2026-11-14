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
  document.querySelectorAll("body > div, body > .upanel").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = show ? "" : "hidden"; });
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
