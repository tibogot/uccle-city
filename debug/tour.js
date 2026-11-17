// VISUAL REGRESSION TOUR, page side (docs/TOUR.md). Opened as /debug/tour.html?run=<name> on the tour server
// (node tools/tour/serve.mjs: it saves the images to .tour/<run>/, outside git). ONE page load for the whole tour:
// each view of tools/tour/views.json is a fresh quick boot (docs/QUICKTEST.md) in an iframe of a fixed CSS size; when
// it is built (window.__quickReady) and settled (TSL time held, the eye adaptation converged, N frames), the city
// canvas is read back (renderFrame + drawImage in one task, as debug/quick.js shot()) into views.json "size" and POSTed
// to the server; the iframe is removed (its GPU device and memory go with it) and the next view starts.
//
//   /debug/tour.html?run=foundation-1                 the whole tour
//   ...&only=stjob-shops,far-300m                     some views;  &skip=a,b  leave some out
//   ...&views=/tools/tour/views.json                  another views file
// Progress: window.__tour = { run, state: "running" | "done" | "failed", i, n, current, results: [...], ms } (poll it
// every 5-10 s from chrome-devtools evaluate_script, memory "poll, don't wait blind"); the server prints each view too.
const P = new URLSearchParams(location.search);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// EVERYTHING read from a view's iframe is copied through JSON: an object of the iframe's realm (even an array) kept by
// this page keeps the whole removed iframe alive (its city, ~0.7 GB each: measured 14 GB after 22 views)
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const statusEl = document.getElementById("status");
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const run = (P.get("run") || `run-${stamp()}`).replace(/[^A-Za-z0-9_.-]/g, "_");
const T = (window.__tour = { run, state: "starting", i: 0, n: 0, current: null, results: [], ms: 0, errors: [] });
const t0 = performance.now();
addEventListener("unload", () => {});   // never in the back-forward cache (a finished tour would keep its memory)
const lines = [];
function say(msg) {
  lines.push(msg); if (lines.length > 40) lines.shift();
  statusEl.textContent = `tour ${run}  ${T.i}/${T.n}  ${((performance.now() - t0) / 1000).toFixed(0)} s\n` + lines.join("\n");
  console.log(`[tour] ${msg}`);
}

async function post(name, body, type) {
  const r = await fetch(`/__tour/save?run=${encodeURIComponent(run)}&name=${encodeURIComponent(name)}`, { method: "POST", body, headers: { "content-type": type } });
  if (!r.ok) throw new Error(`save ${name}: HTTP ${r.status} (is this page served by node tools/tour/serve.mjs?)`);
}

function fit(frame, W, H) {
  const k = Math.min(1, innerWidth / W, innerHeight / H);
  frame.style.transform = `scale(${k})`;
}

/** frames of the iframe's own loop (its rAF), with a wall-clock limit */
async function frames(w, n, limitMs = 20000) {
  const t = performance.now();
  for (let i = 0; i < n && performance.now() - t < limitMs; i++) await new Promise((r) => w.requestAnimationFrame(() => r()));
}

/** wait for the quick boot's ready signal, polling every second; stops on a frozen page or the limit */
async function waitReady(frame, limitMs) {
  const t = performance.now();
  let lastFrames = -1, still = 0;
  while (performance.now() - t < limitMs) {
    await sleep(1000);
    const w = frame.contentWindow;
    if (!w) continue;
    if (w.__quickReady) return { why: "ready", ready: clone(w.__quickReady) };
    const f = w.viewer?.frames?.() ?? null;
    if (f != null) { still = f === lastFrames ? still + 1 : 0; lastFrames = f; }
    if (still >= 30) return { why: "frozen" };
  }
  return { why: "limit" };
}

/** hold the shaders' clock (three's TSL `time`: tree wind, water, flags) at one value, so the frame does not depend on
 *  how long the boot took */
function holdTime(w, value) {
  const nf = w.viewer?.renderer?._nodes?.nodeFrame;
  if (!nf || nf.__tourHeld) return !!nf;
  try { Object.defineProperty(nf, "time", { get: () => value, set: () => {}, configurable: true }); nf.__tourHeld = true; return true; }
  catch { return false; }
}

async function settle(w, S) {
  const v = w.viewer, ts = performance.now();
  for (const d of w.document.querySelectorAll("body > div")) if (!d.querySelector("canvas")) d.style.visibility = "hidden";
  const held = holdTime(w, S.tslTime ?? 12.5);
  if (v.lighting) v.lighting.snapNext = true;
  await frames(w, S.minFrames ?? 90);
  // the eye adaptation (Firmament's exposure): converged = value within tol of target for 10 frames in a row
  const st = v.lighting?.sky?.exposureState;
  let calm = 0;
  while (st && performance.now() - ts < (S.maxMs ?? 15000)) {
    const ok = st.target > 0 && Math.abs(st.value / st.target - 1) < (S.exposureTol ?? 0.004);
    calm = ok ? calm + 1 : 0;
    if (calm >= 10 && performance.now() - ts >= (S.minMs ?? 3000)) break;
    await frames(w, 1);
  }
  while (performance.now() - ts < (S.minMs ?? 3000)) await frames(w, 1);
  return { held, settleMs: Math.round(performance.now() - ts), exposure: st ? { value: +st.value.toFixed(4), target: +st.target.toFixed(4) } : null };
}

/** the final frame into W x H: renderFrame and drawImage in the same task (a WebGPU canvas is only readable then) */
async function capture(w, W, H) {
  const v = w.viewer, c = v.renderer.domElement;
  const out = new OffscreenCanvas(W, H), g = out.getContext("2d");
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  v.renderFrame();
  g.drawImage(c, 0, 0, W, H);
  const blob = await out.convertToBlob({ type: "image/png" });
  return { blob, canvas: [+c.width, +c.height] };
}

async function main() {
  const cfg = await (await fetch(P.get("views") || "/tools/tour/views.json", { cache: "no-store" })).json();
  const [W, H] = cfg.size ?? [1280, 720];
  const only = P.get("only")?.split(",").filter(Boolean), skip = P.get("skip")?.split(",").filter(Boolean) ?? [];
  const views = cfg.views.filter((v) => (!only || only.includes(v.id)) && !skip.includes(v.id));
  T.n = views.length; T.state = "running";
  say(`${views.length} views, ${W}x${H}, devicePixelRatio ${devicePixelRatio}`);
  for (const view of views) {
    T.i++; T.current = view.id;
    const q = new URLSearchParams({ ...cfg.common, ...view.q });
    const url = `/viewer/index.html?${q}`;
    const r = { id: view.id, url, ok: false };
    const tv = performance.now();
    const frame = document.createElement("iframe");
    frame.id = "frame";
    frame.style.width = `${W}px`; frame.style.height = `${H}px`;
    fit(frame, W, H);
    document.body.prepend(frame);
    frame.src = url;
    say(`${view.id}: booting`);
    try {
      const rd = await waitReady(frame, cfg.readyLimitMs ?? 150000);
      const w = frame.contentWindow;
      r.why = rd.why;
      r.bootMs = Math.round(performance.now() - tv);
      r.quick = rd.ready ? { ok: rd.ready.ok, ms: rd.ready.ms, tiles: rd.ready.tiles, landmarks: rd.ready.landmarks, heapMB: rd.ready.heapMB, stuck: rd.ready.stuck } : null;
      r.errors = clone((w?.__quickErrors ?? []).map((e) => `${e.kind} @${e.t}: ${e.msg}`).slice(0, 20));
      if (rd.why !== "ready" || !w?.viewer) throw new Error(`not ready: ${rd.why}`);
      Object.assign(r, await settle(w, cfg.settle ?? {}));
      const shot = await capture(w, W, H);
      r.canvas = clone(shot.canvas);
      r.cam = clone(w.viewer.camera.position.toArray().map((x) => +x.toFixed(2)));
      await post(`${view.id}.png`, shot.blob, "image/png");
      r.ok = rd.ready.ok !== false;
      r.ms = Math.round(performance.now() - tv);
      say(`${view.id}: ${r.ok ? "ok" : "captured, NOT fully built (time limit)"} ${(r.ms / 1000).toFixed(1)} s (boot ${(r.bootMs / 1000).toFixed(1)}, settle ${(r.settleMs / 1000).toFixed(1)})${r.errors.length ? `, ${r.errors.length} console errors` : ""}`);
    } catch (e) {
      r.fail = e.message;
      r.ms = Math.round(performance.now() - tv);
      say(`${view.id}: FAILED ${e.message}`);
    }
    T.results.push(r);
    frame.src = "about:blank";
    await sleep(300);
    frame.remove();
    await sleep(700);
  }
  T.ms = Math.round(performance.now() - t0);
  const ua = navigator.userAgent, gpu = await navigator.gpu?.requestAdapter?.().then((a) => a?.info ? `${a.info.vendor} ${a.info.architecture} ${a.info.description}` : null).catch(() => null);
  const summary = { run, date: new Date().toISOString(), ms: T.ms, size: [W, H], devicePixelRatio, ua, gpu, common: cfg.common, results: T.results };
  await post("run.json", JSON.stringify(summary, null, 1), "application/json");
  T.state = T.results.every((r) => r.ok) ? "done" : "done-with-failures";
  say(`DONE in ${(T.ms / 1000).toFixed(0)} s: ${T.results.filter((r) => r.ok).length}/${T.n} views ok -> .tour/${run}/ (then node tools/tour/compare.mjs <base> ${run})`);
}

main().catch((e) => { T.state = "failed"; T.errors.push(e.message); say(`tour FAILED: ${e.message}`); });
