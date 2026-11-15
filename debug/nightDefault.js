// Night-default A/B jobs (2026-11-15, docs/NIGHT_HOOKUP.md "Round 4: the flip"; docs/perf/AUDIT.md step 14), run per
// page load by debug/loadAB.js in the city's iframe:
//   job ["/debug/nightDefault.js", "views"], args [["stjob-street", "ivy", ...], { live: "master" }]
// views: named places (viewer/places.js) or the bench views below; live "master": at the first view, the night pool's
// master 0 / 1 alternated in the page (debug/featureAB.js live) when the page has the night system (window.__night);
// live "snow": the weather clear / snowfall alternated.
import * as A from "/debug/featureAB.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const VIEWS = {                       // [x, h over ground, z] (debug/groupBench.js VIEWS)
  garden: { id: "garden", p: [1452, 1.7, 716], t: [1470, 0.8, 716] },
  gstreet: { id: "gstreet", p: [1452, 1.7, 716], t: [1440, 0.8, 716] },
  ivy: { id: "ivy", p: [1382, 1.7, 606], t: [1372, 4.5, 588] },
  lawn: { id: "lawn", p: [-385, 1.7, -60], t: [-402, 1, -90] },
};

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

export async function views(ids, { seconds = 5, settle = 5, live = null, rounds = 6 } = {}) {
  const out = {};
  for (const id of ids) {
    await A.at(VIEWS[id] ?? id, { settle });
    const wait = await drawsStable();
    out[id] = { ...(await A.measure({ seconds })), wait };
    if (live === "master" && id === ids[0] && window.__night) {
      const N = window.__night;
      out.master = await A.live(() => { N.master = 0; }, () => { N.master = 1; }, { rounds, settle: 1.5, seconds: 2.5 });
    }
    if (live === "snow" && id === ids[0]) {
      const W = (await import("/viewer/weather/cityWeather.js")).cityWeather;
      out.snow = await A.live(() => W.setPreset("clear", 0), () => W.setPreset("snowfall", 0), { rounds, settle: 2.5, seconds: 2.5 });
      W.setPreset("clear", 0);
    }
  }
  A.release();
  return out;
}

/** the runtime switch: the dev panel's time select golden -> night -> golden at the current view (debug/nightSwitch.js) */
export async function switchJob(place = "stjob-street") {
  await A.at(place, { settle: 5 });
  await drawsStable();
  const N = await import("/debug/nightSwitch.js");
  const sel = [...document.querySelectorAll("select")].find((s) => [...s.options].some((o) => o.value === "night"));
  const day = [...sel.options].find((o) => /golden/i.test(o.text))?.value ?? "";
  const brief = (r) => ({ value: r.value, frames: r.frames, long: r.long, pipes: r.pipes.length, syncPipes: r.pipes.filter((p) => !/Async$/.test(String(p[1]))).length, pipeKinds: r.pipes.slice(0, 6), renderObjects: r.renderObjects, slow: r.slowFrames.map((f) => [f.at, f.ms]) });
  const a = brief(await N.switchTo("night", { seconds: 8 }));
  const b = brief(await N.switchTo(day, { seconds: 8 }));
  const c = brief(await N.switchTo("night", { seconds: 6 }));
  const d = brief(await N.switchTo(day, { seconds: 6 }));
  A.release();
  return { toNight: a, toDay: b, toNight2: c, toDay2: d };
}
