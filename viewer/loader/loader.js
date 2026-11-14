// THE LOADING SCENE (perf audit step 10; owner: "a real warm-up loading scene"). Runs before main.js has even loaded
// three.js: a slow aerial flight over the real Uccle (the horizon ring's 20 m terrain + the city orthophoto, 2.7 MB,
// data/horizon/) drawn by viewer/loader/loaderWorker.js on an OffscreenCanvas in a worker with its own small WebGPU
// device, so the boot's main-thread work (node builds, tiles landing) never freezes it; over it, an honest readout:
// what the boot is doing now (main.js bootStage), the megabytes downloaded so far, a progress bar.
// Hand-over: main.js asks land(pose) with the city's first camera; the flight eases onto it; the page then cross-fades
// the cover (this view) into the city's first frames from the same camera, then finish() stops the worker.
// ?loader=0: the plain cover (A/B: its cost). No WebGPU in workers / no OffscreenCanvas: the plain cover.

const params = new URLSearchParams(location.search);
const cover = document.getElementById("cover");

// the city's lighting presets (viewer/lighting.js PRESETS: the values the loader needs; the loader runs before three.js
// and that module are loaded, so they are repeated here: keep in step)
const dir = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const LOOKS = {
  golden: { sunDir: dir(-0.62, 0.42, 0.66), sunColor: 0xffc890, sunIntensity: 5.6, hemiSky: 0x9abbe6, hemiGround: 0xb27a56, hemiIntensity: 1.4, skyTop: 0x2c568c, skyHorizon: 0xebd1b5, fogDensity: 0.00035 },
  misty: { sunDir: dir(0.6, 0.22, 0.75), sunColor: 0xffd9b0, sunIntensity: 3.0, hemiSky: 0xb8c4d0, hemiGround: 0x8a8070, hemiIntensity: 1.6, skyTop: 0x7f93ab, skyHorizon: 0xd8d4cc, fogDensity: 0.0006 },
  midday: { sunDir: dir(-0.25, 0.85, 0.46), sunColor: 0xfff5e8, sunIntensity: 6.4, hemiSky: 0xaad2ff, hemiGround: 0xa08a72, hemiIntensity: 1.55, skyTop: 0x225ea8, skyHorizon: 0xc8dff5, fogDensity: 0.00025 },
  overcast: { sunDir: dir(-0.3, 0.7, 0.5), sunColor: 0xe6ecf2, sunIntensity: 1.6, hemiSky: 0xc4ccd6, hemiGround: 0x7a746c, hemiIntensity: 2.1, skyTop: 0x8e98a6, skyHorizon: 0xc9cdd2, fogDensity: 0.0007 },
  twilight: { sunDir: dir(-0.7, 0.12, 0.7), sunColor: 0xff9466, sunIntensity: 2.6, hemiSky: 0x4c6ca8, hemiGround: 0x6e5048, hemiIntensity: 0.85, skyTop: 0x102248, skyHorizon: 0xb86b6c, fogDensity: 0.0005 },
  night: { sunDir: dir(0.42, 0.68, -0.6), sunColor: 0x8cb0e8, sunIntensity: 1.2, hemiSky: 0x263a62, hemiGround: 0x382e36, hemiIntensity: 0.6, skyTop: 0x060c1a, skyHorizon: 0x182640, fogDensity: 0.0006 },
};

// what the boot is doing: main.js bootStage(name, detail) -> the line shown, and where the bar is (a share of a
// typical boot, measured; the bar never goes back)
const STAGES = {
  start: ["Starting the renderer", 0.04],
  materials: ["Loading materials and textures", 0.1],
  landmarks: ["Placing the landmarks", 0.2],
  tiles: ["Building the streets", 0.28],
  shaders: ["Compiling shaders", 0.36],
  tile: ["Laying out the first streets", 0.5],
  neighbours: ["Loading the neighbourhood", 0.62],
  warmup: ["Compiling shaders", 0.74],
  ready: ["Ready", 1],
};

const ui = document.createElement("div");
ui.id = "loaderUi";
ui.innerHTML = `<canvas id="loaderCanvas"></canvas><div class="lbox"><div class="ltitle">Uccle</div><div class="lstage">Loading…</div>
<div class="lbar"><i></i></div><div class="lsub"></div></div>`;
cover.textContent = "";
cover.appendChild(ui);
const $stage = ui.querySelector(".lstage"), $bar = ui.querySelector(".lbar i"), $sub = ui.querySelector(".lsub");
const canvas = ui.querySelector("#loaderCanvas");

let frac = 0, mb = 0, worker = null, landed = null, landedResolve = null, ready = false;
const setBar = (f) => { frac = Math.max(frac, Math.min(1, f)); $bar.style.transform = `scaleX(${frac.toFixed(3)})`; };
const sub = () => { $sub.textContent = mb > 0.05 ? `${mb.toFixed(1)} MB downloaded` : ""; };
// downloads so far (resource timing; transferSize is 0 for a cache hit: then the body size)
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) mb += (e.transferSize || e.encodedBodySize || 0) / 1048576;
    sub();
  }).observe({ type: "resource", buffered: true });
} catch { /* no resource timing */ }

const size = () => {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  return [Math.max(1, Math.round(innerWidth * dpr)), Math.max(1, Math.round(innerHeight * dpr))];
};
if (params.get("loader") !== "0" && "gpu" in navigator && canvas.transferControlToOffscreen && typeof Worker !== "undefined") {
  try {
    const off = canvas.transferControlToOffscreen();
    const [w, h] = size();
    worker = new Worker(new URL("./loaderWorker.js", import.meta.url), { type: "module" });
    const time = LOOKS[params.get("time")] ? params.get("time") : "golden";
    worker.postMessage({ type: "init", canvas: off, w, h, base: new URL("../../data/", import.meta.url).href, tile: (params.get("tile") || "I6").toUpperCase(), look: LOOKS[time], fov: 55 }, [off]);
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "ready") { ready = true; ui.classList.add("live"); window.__loaderStats = { readyMs: Math.round(performance.now()), buildMs: m.ms, tris: m.tris }; }
      else if (m.type === "landed") landedResolve?.();
      else if (m.type === "fps") (window.__loaderStats ||= {}).fps = m.fps;
      else if (m.type === "fail") { console.warn("[loader]", m.error); worker?.terminate(); worker = null; landedResolve?.(); ui.classList.remove("live"); }
    };
    worker.onerror = (e) => { console.warn("[loader]", e.message); worker = null; landedResolve?.(); };
    addEventListener("resize", () => { const [w2, h2] = size(); worker?.postMessage({ type: "resize", w: w2, h: h2 }); });
  } catch (e) { console.warn("[loader]", e.message); worker = null; }
}

window.__loader = {
  /** the boot's stage (main.js bootStage): its line, the bar; detail: { done, total } (warm-up pipelines) or text */
  stage(name, detail) {
    const s = STAGES[name];
    if (!s) return;
    let text = s[0], f = s[1];
    if (detail && typeof detail === "object" && detail.total) {
      const next = Object.values(STAGES).find(([, v]) => v > f)?.[1] ?? 1;
      f += (next - f) * Math.min(1, detail.done / detail.total);
      text += ` (${detail.done} / ${detail.total})`;
    } else if (typeof detail === "string") text += ` ${detail}`;
    $stage.textContent = text;
    setBar(f);
  },
  /** fly the loading camera onto the city's first camera: resolves when it is there (at once without the 3D view) */
  land(pose) {
    if (!worker || !ready) return Promise.resolve(false);
    landed ??= new Promise((r) => { landedResolve = r; });
    worker.postMessage({ type: "land", pose });
    return landed;
  },
  /** the cover has faded out: stop drawing, free the device */
  finish() {
    worker?.postMessage({ type: "stop" });
    worker = null;
    ui.remove();
  },
  get active() { return !!worker && ready; },
};
window.__loader.stage("start");
