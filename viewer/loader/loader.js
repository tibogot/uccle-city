// THE LOADING SCREEN (owner 2026-11-15: "nothing more annoying than jumps"; docs/BOOT.md). Three stills of the city
// itself (rendered by debug/loaderShots.js at golden hour, tools/loader_stills.py: AVIF + JPG, ~260-300 KB each,
// viewer/loader/stills/) cross-fade with a slow zoom, and ONE progress bar fills through every stage of the boot.
// Everything that moves is a CSS animation / transition of transform or opacity (index.html #loaderUi): the compositor
// runs it, so it keeps moving smoothly while the main thread builds shaders and the GPU compiles pipelines (the old
// aerial flight, ?loader=flight, drew on the GPU the boot was busy with, and jumped).
//
// The bar (Mr.doob's slop-newyork js/main.js:30-75, 751-766): each stage owns a share of the bar sized by its
// MEASURED duration (STAGE_MS: the boot timeline of 2026-11-15, debug/bootTimeline.js); when a stage begins, the fill
// glides to the stage's end as a linear CSS transition lasting the stage's typical time, scaled by how fast the earlier
// stages ran on this machine (pace), so it moves while the main thread is blocked and does not stall on a slow machine.
// Stages that know their progress (the warm-up's pipelines) only ever move it FORWARD (no jump back, ever). The cover
// stays up until the GPU finished the first real frame (main.js: "gpu" then "ready"), then fades (1.1 s).
//
// Switches: ?loader=flight (the old aerial flight in a worker), ?loader=0 (no images: the plain cover, for A/B);
// prefers-reduced-motion: no zoom, the cross-fades only (index.html).
const params = new URLSearchParams(location.search);
const mode = params.get("loader") === "0" ? "plain" : params.get("loader") === "flight" ? "flight" : "stills";
const T0 = 0;                                         // (performance.now() counts from the navigation)
const cover = document.getElementById("cover");
const ui = document.getElementById("loaderUi");
const $stage = ui.querySelector(".lstage"), $bar = ui.querySelector(".lbar i"), $sub = ui.querySelector(".lsub");
ui.dataset.mode = mode;
if (mode !== "stills") ui.querySelector(".lslides")?.remove();     // (the images were asked for by the HTML: tiny cost)

// stage -> [label, typical ms] in boot order: the medians of 9 cold boots on 2026-11-15 (debug/bootSummary.js
// "stages", the RTX 4050 laptop, YELLOW / RED machine, cover 26-32 s); pace() rescales them on a faster / slower machine.
// "data": the page, three.js and main.js's modules, the manifest; "tiles": the tile worker builds the start tile (the
// longest stage: its roads, colliders and facades; a return visit reads it from the tile cache); "gpu": the first
// real frame on the GPU.
const STAGES = {
  data: ["Loading the city", 1500],
  renderer: ["Starting the renderer", 200],
  materials: ["Loading materials and textures", 3000],
  landmarks: ["Placing the landmarks", 120],
  tiles: ["Building the streets", 10000],
  tile: ["Laying out the first streets", 1800],
  neighbours: ["Loading the neighbourhood", 4500],
  warmup: ["Compiling shaders", 5500],
  gpu: ["Drawing the first frame", 100],
};
// label-only stages (they run alongside another one: the bar keeps its course)
const LABELS = { shaders: "Compiling shaders" };
const NAMES = Object.keys(STAGES);
const TOTAL = NAMES.reduce((s, n) => s + STAGES[n][1], 0);
const startOf = (n) => NAMES.slice(0, NAMES.indexOf(n)).reduce((s, k) => s + STAGES[k][1], 0) / TOTAL;
const endOf = (n) => startOf(n) + STAGES[n][1] / TOTAL;

let cur = -1, glide = { p0: 0, p1: 0, t0: 0, ms: 0 }, stageT0 = T0;
const times = [];                                     // [stage, ms since the page started]: STAGE_MS calibration
const at = () => { const g = glide; return g.ms > 0 ? g.p0 + (g.p1 - g.p0) * Math.min(1, (performance.now() - g.t0) / g.ms) : g.p1; };
/** the fill glides from where it is now to p over ms (linear: a compositor transition; interrupting one starts from
 *  its current value, so a retarget never jumps) */
const glideTo = (p, ms) => {
  const from = at();
  if (p <= from + 1e-4) return;
  glide = { p0: from, p1: p, t0: performance.now(), ms: Math.max(0, ms) };
  $bar.style.transition = ms > 0 ? `transform ${(ms / 1000).toFixed(2)}s ${ms > 400 ? "linear" : "ease-out"}` : "none";
  $bar.style.transform = `scaleX(${p.toFixed(4)})`;
};
// how fast this machine runs the stages so far vs the table (Mr.doob's pace, clamped 0.5-4)
const pace = (name) => {
  const ranMs = startOf(name) * TOTAL;
  return ranMs >= 1000 ? Math.min(4, Math.max(0.5, (performance.now() - T0) / ranMs)) : 1;
};
const begin = (name) => {
  const i = NAMES.indexOf(name);
  if (i <= cur) return false;                        // never back (a late call of an earlier stage)
  cur = i; stageT0 = performance.now();
  times.push([name, Math.round(stageT0)]);
  $stage.textContent = STAGES[name][0];
  glideTo(endOf(name), STAGES[name][1] * pace(name));
  return true;
};

// downloads so far (resource timing; transferSize is 0 for a cache hit: then the body size)
let mb = 0;
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) mb += (e.transferSize || e.encodedBodySize || 0) / 1048576;
    $sub.textContent = mb > 0.05 ? `${mb.toFixed(1)} MB loaded` : "";
  }).observe({ type: "resource", buffered: true });
} catch { /* no resource timing */ }

let flight = null;
const flightP = mode === "flight" ? import("./flight.js").then((m) => (flight = m.startFlight(ui, params))).catch(() => null) : null;

window.__loader = {
  /** the boot's stage (main.js bootStage): its line, the bar; detail: { done, total } (warm-up pipelines) or text */
  stage(name, detail) {
    if (name === "ready") return this.done();
    if (LABELS[name]) { if (cur <= NAMES.indexOf("tiles")) $stage.textContent = LABELS[name]; return; }
    if (!STAGES[name]) return;
    begin(name);
    if (NAMES[cur] !== name) return;
    if (detail && typeof detail === "object" && detail.total) {
      const f = Math.min(1, detail.done / detail.total);
      $stage.textContent = `${STAGES[name][0]} (${detail.done} / ${detail.total})`;
      // forward only: when the counted progress is ahead of the glide, catch up over the stage's remaining time
      const p = startOf(name) + (endOf(name) - startOf(name)) * f;
      if (p > at() + 0.002) glideTo(endOf(name), Math.max(400, STAGES[name][1] * pace(name) * (1 - f)));
    } else if (typeof detail === "string") $stage.textContent = `${STAGES[name][0]} ${detail}`;
  },
  /** a boot problem the player must see (a tile that never comes back, a worker error): shown on the cover in red, kept */
  error(text) {
    $stage.textContent = text; $stage.style.color = "#ff8a80";
    times.push(["error", Math.round(performance.now())]);
  },
  /** the city's first frame is on the GPU: the bar completes (the cover's fade, index.html, runs alongside) */
  done() {
    times.push(["ready", Math.round(performance.now())]);
    $stage.textContent = "Ready";
    glideTo(1, 350);
  },
  /** fly the loading camera onto the city's first camera (?loader=flight only; else at once) */
  async land(pose) { await flightP; return flight ? flight.land(pose) : false; },
  /** the cover has faded out: stop the flight, drop the images (their decoded memory) */
  finish() { flight?.finish(); flight = null; ui.remove(); },
  get active() { return !!flight?.active; },
  get mode() { return mode; },
  /** [[stage, ms since navigation]]: where the boot spent its time (calibrates STAGES) */
  get times() { return times.slice(); },
};
begin("data");

// RETURN VISITS: the service worker (/sw.js) keeps the city's data in Cache Storage, keyed by content hash (safe across
// deploys). ?sw=0: unregistered and its cache cleared (the plain network, A/B).
if ("serviceWorker" in navigator) {
  const swURL = new URL("../../sw.js", import.meta.url);
  if (params.get("sw") === "0") {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    caches?.keys().then((ks) => ks.filter((k) => k.startsWith("uccle-")).forEach((k) => caches.delete(k))).catch(() => {});
  } else navigator.serviceWorker.register(swURL, { scope: new URL("../../", import.meta.url).pathname }).catch((e) => console.warn("[sw]", e.message));
}
