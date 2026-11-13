// Perf preflight, page side (docs/perf/PREFLIGHT.md). Run AFTER tools/perf/preflight.ps1 says GREEN / YELLOW, in a city
// tab opened at the reference URL (REF_URL below), in FRONT, once the city has loaded:
//   const F = await import("/debug/preflight.js"); await F.check()          -> verdict vs the baseline
//   await F.check({ record: true })                                           -> the numbers to save as the baseline
// Baseline: docs/perf/preflight_baseline.json (recorded on a FRESH machine: Chrome just restarted, cool, no agent).
// Bracketing: run check() before AND after a measurement block; if the two differ beyond the green band, the block
// in between does not count.

export const REF_URL = "/viewer/index.html?ring=1&far=1&time=golden&traffic=0";
const BANDS = { cpu: [0.05, 0.15], gpu: [0.07, 0.2], boot: [0.1, 0.25], frame: [0.05, 0.15] };   // green / yellow limits

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** a fixed JavaScript workload (math + a typed-array sort): the CPU's speed for the main thread, ms (median of 7) */
function cpuBench() {
  const a = new Float64Array(150000), t = [];
  for (let run = 0; run < 7; run++) {
    const t0 = performance.now();
    let s = 0;
    for (let r = 0; r < 6; r++) {
      for (let i = 0; i < a.length; i++) a[i] = Math.sin(i * 0.001 + r) * Math.sqrt(i + 1);
      a.sort(); s += a[1000];
    }
    t.push(performance.now() - t0);
    if (s === 42) console.log(s);        // (keeps the work from being optimised away)
  }
  return +median(t).toFixed(1);
}

/** the GPU's adapter as Chrome really uses it (this laptop has an NVIDIA and an Intel GPU, and Chrome ignores
 *  powerPreference on Windows) */
async function adapterInfo() {
  const be = window.viewer?.renderer?.backend;
  const info = be?.adapter?.info || (await navigator.gpu?.requestAdapter())?.info;
  return info ? { vendor: info.vendor, architecture: info.architecture, description: info.description || "" } : null;
}

/** a fixed view: high over Saint-Job looking at the Place; GPU ms p50 and frame ms p50 over 4 s after a settle */
async function fixedView() {
  const V = window.viewer, c = V.controls, cam = V.camera, upd = c.update;
  V.setView("overview");
  c.update = () => false;
  const tx = 1153, tz = 540, gy = V.world.surface(tx, tz);
  const place = () => { cam.position.set(tx - 300, gy + 240, tz + 300); c.target.set(tx, gy, tz); cam.lookAt(tx, gy, tz); };
  try {
    // settle: tiles around the view loaded and stable
    let last = -1, stable = 0;
    for (let i = 0; i < 60 && stable < 4; i++) { place(); await sleep(500); const n = V.world.tiles.length; stable = n === last && n >= 9 ? stable + 1 : 0; last = n; }
    await sleep(2000);
    V.resetGpu();
    const frames = []; let prev = performance.now(), on = true;
    const tick = (t) => { frames.push(t - prev); prev = t; place(); if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await sleep(4000);
    on = false;
    const g = V.gpuStats(), r = V.renderer.info.render;
    return { gpuMs: g.p50, gpuP95: g.p95, frameMs: +median(frames.slice(5)).toFixed(2), draws: r.drawCalls ?? r.calls, tiles: V.world.tiles.length };
  } finally { c.update = upd; }
}

const grade = (d, [g, y]) => (Math.abs(d) <= g ? "OK" : Math.abs(d) <= y ? "WARN" : "FAIL");

export async function check({ record = false } = {}) {
  const out = { at: new Date().toISOString(), url: location.pathname + location.search, checks: [] };
  const add = (check, state, value) => out.checks.push({ check, state, value });
  if (!window.viewer) throw new Error("the city has not loaded yet");
  // environment
  add("tab in front", document.visibilityState === "visible" && document.hasFocus() ? "OK" : "FAIL", `${document.visibilityState}${document.hasFocus() ? ", focused" : ", NOT focused"}`);
  const refOk = REF_URL.split("?")[1].split("&").every((kv) => location.search.includes(kv));
  add("reference URL", refOk ? "OK" : "WARN", refOk ? "yes" : `open ${REF_URL}`);
  out.size = [innerWidth, innerHeight, devicePixelRatio];
  out.adapter = await adapterInfo();
  out.bootMs = window.__coverAt ? Math.round(window.__coverAt) : null;
  out.cpuMs = cpuBench();
  Object.assign(out, await fixedView());
  // against the baseline
  let base = null;
  try { base = await fetch("/docs/perf/preflight_baseline.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)); } catch (e) { base = null; }
  if (record || !base) {
    add("baseline", record ? "OK" : "WARN", record ? "these numbers are the new baseline (save them)" : "no baseline yet: record one on a fresh machine");
  } else {
    const sameGpu = base.adapter && out.adapter && base.adapter.vendor === out.adapter.vendor && base.adapter.architecture === out.adapter.architecture;
    add("same GPU as the baseline", sameGpu ? "OK" : "FAIL", `${out.adapter?.vendor} ${out.adapter?.architecture} (baseline ${base.adapter?.vendor} ${base.adapter?.architecture})`);
    const sameSize = base.size && base.size.join("x") === out.size.join("x");
    add("same window size", sameSize ? "OK" : "WARN", `${out.size.join("x")} (baseline ${base.size?.join("x")})`);
    const rel = (k) => (base[k] && out[k] ? (out[k] - base[k]) / base[k] : null);
    for (const [k, band, name] of [["cpuMs", BANDS.cpu, "CPU (fixed JS work)"], ["gpuMs", BANDS.gpu, "GPU (fixed view)"], ["frameMs", BANDS.frame, "frame time (fixed view)"], ["bootMs", BANDS.boot, "boot to the cover"]]) {
      const d = rel(k);
      if (d == null) { add(name, "WARN", "not measured"); continue; }
      add(name, grade(d, band), `${out[k]} vs ${base[k]} (${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} %)`);
    }
  }
  const fail = out.checks.filter((c) => c.state === "FAIL").length, warn = out.checks.filter((c) => c.state === "WARN").length;
  out.verdict = fail ? "RED" : warn ? "YELLOW" : "GREEN";
  console.table(out.checks);
  return out;
}
