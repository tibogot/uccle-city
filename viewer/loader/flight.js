// THE OLD LOADING SCENE, ?loader=flight (perf audit step 10, 2026-11-14; replaced as the default by the stills on
// 2026-11-15: it JUMPED, sharing the GPU with the boot's shader builds and uploads). A slow aerial flight over the real
// Uccle (the horizon ring's 20 m terrain + the city orthophoto, 2.7 MB, data/horizon/) drawn by
// viewer/loader/loaderWorker.js on an OffscreenCanvas in a worker with its own small WebGPU device.
// Hand-over: main.js asks land(pose) with the city's first camera; the flight eases onto it; the page then cross-fades
// the cover (this view) into the city's first frames from the same camera, then finish() stops the worker.
// No WebGPU in workers / no OffscreenCanvas: startFlight() returns null (the stills stay).

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

/** starts the flight behind the loader's readout in `ui`; returns { land(pose), finish(), active } or null */
export function startFlight(ui, params) {
  if (!("gpu" in navigator) || typeof Worker === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.id = "loaderCanvas";
  if (!canvas.transferControlToOffscreen) return null;
  ui.prepend(canvas);
  let worker = null, ready = false, landed = null, landedResolve = null;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    return [Math.max(1, Math.round(innerWidth * dpr)), Math.max(1, Math.round(innerHeight * dpr))];
  };
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
  } catch (e) { console.warn("[loader]", e.message); worker = null; canvas.remove(); return null; }
  return {
    /** fly the loading camera onto the city's first camera: resolves when it is there */
    land(pose) {
      if (!worker || !ready) return Promise.resolve(false);
      landed ??= new Promise((r) => { landedResolve = r; });
      worker.postMessage({ type: "land", pose });
      return landed;
    },
    finish() { worker?.postMessage({ type: "stop" }); worker = null; },
    get active() { return !!worker && ready; },
  };
}
