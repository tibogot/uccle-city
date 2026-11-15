// Boot warm-up: compile every render pipeline under the loading cover instead of on the frames
// after it lifts (measured before: a ~3 s compile burst plus two ~500 ms freezes after boot).
//
// openBootPipelines() right after the scene exists: while the window is open, the scene's new
// pipelines are created ASYNC and three skips a draw until its pipeline is ready (in parallel on the
// GPU process instead of one after another). warmBoot() once the first tile is in and the render loop
// runs: two frames with every drawable forced visible, one instance, never culled (tree LODs, empty
// pools, off-screen objects, their shadow passes), then wait until no new pipeline is asked for and
// every async compile is done. Streamed tiles reuse these pipelines (same WGSL; see RENDER_PLAN.md).
// Machinery: vendor/engine (game-engine-v1, unchanged).
import * as THREE from "three/webgpu";
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";
import { warmGamePipelines, awaitPipelinesQuiet } from "../vendor/engine/pipelineWarmup.js";
import { neededAtReveal } from "./bootGate.js";

export function openBootPipelines(renderer, scene) {
  const win = openParallelPipelines(renderer, scene);
  // the loading scene's readout: how many of the async pipelines started in the window are done (device-level count)
  const dev = renderer.backend?.device, f = dev?.createRenderPipelineAsync;
  const prog = { started: 0, done: 0 };
  if (f) {
    // boot2 ?pipepace=N (docs/BOOT.md): at most N async pipelines handed to the GPU process at a time, each from its own
    // task (its own command flush), so the GPU process' main thread, which also draws the page's compositor frames
    // (the loading screen), gets a turn between them. 0 / absent: all at once, as before.
    const PACE = Math.max(0, +(new URLSearchParams(location.search).get("pipepace") || 0));
    const queue = []; let inFlight = 0;
    const pump = () => {
      while (inFlight < PACE && queue.length) {
        const [d, res, rej] = queue.shift();
        inFlight++;
        let p;
        try { p = f.call(dev, d); } catch (e) { inFlight--; rej(e); continue; }
        p.then(res, rej).finally(() => { inFlight--; setTimeout(pump, 0); });
        if (queue.length) { setTimeout(pump, 0); break; }      // the next one from a new task
      }
    };
    const create = PACE > 0 ? (d) => new Promise((res, rej) => { queue.push([d, res, rej]); setTimeout(pump, 0); }) : (d) => f.call(dev, d);
    dev.createRenderPipelineAsync = function (d) { prog.started++; const p = create(d); p.then(() => prog.done++, () => prog.done++); return p; };   // (kept: two counters)
  }
  win.progress = prog;
  // boot3: the pipelines the FRAMES ask for (three's render path: no promise list), apart from the ones the precompile
  // queue's compileAsync jobs create (they pass one): warmBoot's quiet test counts only these (bootQuiet below)
  const be = renderer.backend, crp = be.createRenderPipeline;
  win.framePipes = { n: 0 };
  // (a landmark's own shadow-pass warm group, "<name>-warm" far under the city: counted only if the first view needs it)
  const warmOf = (o) => { for (let k = 0; o && k < 5; k++, o = o.parent) if (o.name?.endsWith("-warm")) return o.name.slice(0, -5); return null; };
  be.createRenderPipeline = function (ro, promises) {
    if (!promises) { const w = win.needed ? warmOf(ro.object) : null; if (!w || win.needed([w])) win.framePipes.n++; }
    return crp.call(this, ro, promises);
  };
  return win;
}

export async function warmBoot(renderer, scene, win, needed = () => true) {
  const t0 = performance.now();
  // Let the per-frame updaters settle first (tree LOD, lamps, cars): the warm-up restores every
  // visible/count it touched to the value it saw BEFORE its frames, and the tree field only re-checks
  // when the camera moves 4 m, so warming before its first update left the trees hidden.
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
  const t1 = performance.now();
  const warm = await warmGamePipelines({ scene }, new Set(), { frames: 2 });
  const t2 = performance.now();
  const quiet = BOOT_QUIET_ALL || !win.framePipes ? await awaitPipelinesQuiet({ renderer }, { quietFrames: 12, maxMs: 15000 }) : await bootQuiet(renderer, win, needed);
  const t3 = performance.now();
  const par = await win.end();
  try { await renderer.backend.device?.queue.onSubmittedWorkDone(); } catch { /* WebGL2 / lost device */ }
  const t4 = performance.now();
  // a couple of frames with the finished pipelines, so the reveal frame is not the first real draw
  for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
  // boot3: where the warm-up's time goes (settle frames, the forced frames, the quiet wait, the window's last pipelines, the 2 frames)
  const R = (a, b) => Math.round(b - a), t5 = performance.now();
  return { ms: Math.round(t5 - t0), warmed: warm.warmed, parallel: par.created, late: quiet.pipelines, skipped: quiet.skipped,
    phases: `settle ${R(t0, t1)}, forced ${R(t1, t2)}, quiet ${R(t2, t3)}, pipelines ${R(t3, t4)}, frames ${R(t4, t5)} ms` };
}

// ------------------------------------------------------------------ streaming: compile before showing
// Every material made per tile (terrain with its land cover, asphalt with its marking atlas, a far tile's
// orthophoto, lamps, tram, furniture) is a new TSL node graph: three builds its shader on the main thread the
// first frame it is drawn (5-17 ms each, measured 2026-11-05), and the smooth-LOD fading copies (lodFade.js
// fadeVariant) are more of them. A streamed tile brought 10-20 such builds into one or two frames (50-290 ms
// frames). precompile() builds them with three's compileAsync instead, BEFORE the tile is shown: r187 yields
// after every shader stage and every 8 ms, uploads the geometry on the way, and creates the pipelines async,
// so it costs a few ms per frame. Hidden, empty and off-screen drawables count (forced on during the
// synchronous part of the call, where three takes its render list). The render target and MRT of the scene
// pass (post.js) are set, so the shaders built are the ones the frame uses.
//
// All compileAsync calls of the page go through ONE queue (installCompileQueue): r187 keeps one precompile
// state, and two calls in flight take each other's state (game-engine-v1 v3/render/serialCompile.js).
// Jobs run one at a time in order, except that a job queued with `first` (a streamed TILE: the player waits for it)
// goes before every queued job without it (a landmark's background compile: measured 2026-11-14, the third tile
// waited 4.4 s behind eleven landmarks and the bridges).
let rawCompile = null, passFor = null, running = false;
// boot3: every precompile job's root names + its promise, for warmBoot (bootQuiet: the jobs the first view needs)
const bootJobs = [];
const jobs = [];
const pump = () => {
  if (running || !jobs.length) return;
  let i = jobs.findIndex((j) => j.first);
  // boot3: until the cover lifts, the jobs the first view needs (bootGate.js neededAtReveal: the models in the boot's
  // ring) go before the others (the far landmarks queued first had the in-ring ones wait 15-17 s). ?bootquiet=all: FIFO
  if (i < 0 && !bootJobsClosed && !BOOT_QUIET_ALL) i = jobs.findIndex((j) => j.names && neededAtReveal(j.names));
  const j = jobs.splice(i >= 0 ? i : 0, 1)[0];
  running = true;
  Promise.resolve().then(j.job).then(j.resolve, j.reject).finally(() => { running = false; pump(); });
};
const enqueue = (job, first = false, names = null) => new Promise((resolve, reject) => { jobs.push({ job, first, names, resolve, reject }); pump(); });
export function installCompileQueue(renderer) {
  if (rawCompile) return;
  rawCompile = renderer.compileAsync.bind(renderer);
  renderer.compileAsync = (...a) => enqueue(() => rawCompile(...a));
  // r187 compileAsync applies its call-time MRT around every work item and restores THAT MRT afterwards, and
  // sets the render target only for the frame-buffer target: compiling for another target + MRT (the scene
  // pass) left the MRT set between frames (the post chain's last pipeline then failed validation) and built
  // the items' shaders without the MRT outputs. A call made by precompile() marks its state: its items run
  // with the pass's target + MRT, and in between the renderer gets back what it had before the call.
  const begin = renderer._beginPreCompile, finish = renderer._finishPreCompile;
  renderer._beginPreCompile = function (st) {
    if (passFor && !st.__pass) st.__pass = passFor;
    begin.call(this, st);
    if (st.__pass) {
      this.setRenderTarget(st.__pass.target); this.setMRT(st.__pass.mrt);
    }
  };
  renderer._finishPreCompile = function () {
    const st = this._precompilationState;
    finish.call(this);
    if (st?.__pass) { this.setRenderTarget(st.__pass.outRT); this.setMRT(st.__pass.outMRT); }
  };
}

/** Compile `roots` (Object3Ds, in the scene or about to be) for `camera` in `scene`, into `target`/`mrt`
 *  (the scene pass), without drawing them. Resolves when their shaders and pipelines are ready. */
export function precompile(renderer, roots, camera, scene, { target = null, mrt = null, first = false } = {}) {
  if (!renderer.backend?.isWebGPUBackend) return Promise.resolve();
  installCompileQueue(renderer);
  const rec = globalThis.__boot ? { q: Math.round(performance.now()), name: [].concat(roots).map((r) => r?.name || r?.type || "?").join(",").slice(0, 60) } : null;
  if (rec) (globalThis.__boot.jobs ||= []).push(rec);
  const job = enqueue(async () => {
    if (rec) { rec.s = Math.round(performance.now()); rec.first = first; }
    try {
    for (const root of [].concat(roots)) {
      if (!root) continue;
      const saved = [];
      const set = (o, k, v) => { saved.push([o, k, o[k]]); o[k] = v; };
      root.traverse((o) => {
        if (!o.visible) set(o, "visible", true);
        if (o.isMesh || o.isPoints || o.isLine || o.isSprite) {
          if (o.frustumCulled) set(o, "frustumCulled", false);
          if (o.isInstancedMesh && o.count === 0) set(o, "count", 1);
          if (o.geometry?.isInstancedBufferGeometry && o.geometry.instanceCount === 0) set(o.geometry, "instanceCount", 1);
        }
      });
      const prevRT = renderer.getRenderTarget(), prevMRT = renderer.getMRT();
      let p;
      try {
        // the call's render context (formats, samples) is the scene pass's: set for the synchronous part
        renderer.setRenderTarget(target); renderer.setMRT(mrt);
        passFor = { target, mrt, outRT: prevRT, outMRT: prevMRT };
        p = rawCompile(root, camera, scene);       // takes its render list synchronously
      } finally {
        passFor = null;
        renderer.setRenderTarget(prevRT); renderer.setMRT(prevMRT);
        for (let i = saved.length - 1; i >= 0; i--) { const [o, k, v] = saved[i]; o[k] = v; }
      }
      try { await p; } catch (e) { console.warn("[precompile]", e); }
    }
    } finally { if (rec) rec.e = Math.round(performance.now()); }   // (a boot probe's queue record: debug/bootTimeline.js)
  }, first, [].concat(roots).map((r) => r?.name || ""));
  if (!bootJobsClosed) { const j = { names: [].concat(roots).map((r) => r?.name || ""), first, done: false }; job.finally(() => { j.done = true; }); bootJobs.push(j); }
  return job;
}
let bootJobsClosed = false;

// boot3 (docs/BOOT.md section 5; ?bootquiet=all = before): the boot warm-up waited for the WHOLE device to stop making
// pipelines for 12 frames (vendor awaitPipelinesQuiet), and the background compiles of every landmark in Uccle kept it
// busy: the cover waited for the Saint-Pierre / Villa van Buuren / town hall queue (8-10 s jobs) although a landmark
// outside the boot's ring cannot be on screen at the reveal (its home tile is not loaded: it shows with its tile, and
// it is added to the scene only once compiled: nothing builds on a frame later). Now: quiet = no new pipeline asked for
// by the FRAMES for 12 frames, and every precompile job the first view needs done: the tiles' (queued `first`) and the
// models in the boot's ring (`needed(names)`, bootGate.js neededAtReveal). Not waited for: models outside the ring, the
// weather's precipitation draws (hidden in clear weather), the falcon mode's bird / pigeons, the bridges' fading copies
// (each model is added to the scene only once its own compile is done). At most 15 s, as before.
const BOOT_QUIET_ALL = typeof location !== "undefined" && /[?&]bootquiet=all(&|$)/.test(location.search);
async function bootQuiet(renderer, win, needed, { quietFrames = 12, maxMs = 15000 } = {}) {
  win.needed = needed;
  const t0 = performance.now(), c = win.framePipes, start = c.n;
  let quiet = 0, frames = 0, last = c.n;
  const jobsLeft = () => bootJobs.some((j) => !j.done && (j.first || needed(j.names)));
  while ((quiet < quietFrames || jobsLeft()) && performance.now() - t0 < maxMs) {
    await new Promise((r) => requestAnimationFrame(() => r()));
    frames++;
    if (c.n === last) quiet++; else { quiet = 0; last = c.n; }
  }
  bootJobsClosed = true;
  try { await renderer.backend.device?.queue.onSubmittedWorkDone(); } catch { /* lost device */ }
  return { frames, pipelines: c.n - start, ms: Math.round(performance.now() - t0), skipped: bootJobs.filter((j) => !j.done).map((j) => j.names[0]).slice(0, 12) };
}

// ------------------------------------------------------------------ shadow pass: one shader for every opaque material
// three r187 draws the sun's shadow map with ONE override material, but for any material with a colorNode or a map
// (_getShadowNodes) it plugs that material's WHOLE colour graph into it, only to read its alpha: a new graph per
// material, so a shadow shader build per material (346 builds, 1.7-1.8 s of the boot's main thread, measured
// 2026-11-14) whose colour is never used: an opaque material (no alphaTest, not transparent, no alphaMap / mask /
// castShadowNode) writes the same depth whatever its alpha. For those the colour is left out; what moves the
// geometry (positionNode / castShadowPositionNode, depthNode) is kept, so the shadow builds are shared by every material
// with the same geometry layout and vertex code. Materials that cut their shadow (maskShadowNode: tree cards; the
// smooth-LOD fades' maskNode) or use alpha keep three's own path, unchanged. ?shadowshare=0: three's path for all (A/B).
// (A material whose colorNode discards and that casts a shadow would lose that cut here: none in the city, the one
// colour discard is the snow layer, which casts none; mark such a material userData.shadowColour = true.)
export function shareShadowNodes(renderer) {
  const orig = renderer._getShadowNodes;
  if (typeof orig !== "function" || renderer.__shadowShared) return false;
  renderer.__shadowShared = true;
  const cache = new WeakMap();
  renderer._getShadowNodes = function (material) {
    const own = orig.call(this, material);
    if (own.colorNode === null || this.shadowMap.transmitted === true || this.shadowMap.type === 3 /* VSMShadowMap */) return own;
    if (material.alphaTest > 0 || material.transparent || material.alphaMap || material.alphaToCoverage ||
      material.castShadowNode?.isNode || material.maskShadowNode?.isNode || material.maskNode?.isNode || material.userData?.shadowColour === true) return own;
    let c = cache.get(material);
    if (c === undefined || c.src !== own) { c = { src: own, out: { colorNode: null, depthNode: own.depthNode, positionNode: own.positionNode } }; cache.set(material, c); }
    return c.out;
  };
  renderer.__shadowNodes = { own: orig, shared: renderer._getShadowNodes };   // live A/B: renderer._getShadowNodes = renderer.__shadowNodes.own
  return true;
}

// ------------------------------------------------------------------ the early warm-up (before the first tile)
/** Draw `render()` `frames` times NOW with every drawable of `scene` forced visible, one instance, never culled (as
 *  warmBoot's frames, game-engine-v1 pipelineWarmup.js), then put everything back. Called while the tile worker builds
 *  the first tiles (the main thread waited idle then): three builds every node material SYNCHRONOUSLY here (one long
 *  task, under the loading scene, which draws in its own worker) and, with the boot's parallel-pipeline window open,
 *  hands every render pipeline to the GPU process at once (compileAsync caps that at 16 in flight: 8.5 s for the same
 *  scene, measured). Returns { drawables, ms }. */
export function warmNow(scene, render, { frames = 1 } = {}) {
  const t0 = performance.now();
  const saved = [];
  const set = (o, k, v) => { if (o[k] !== v) { saved.push([o, k, o[k]]); o[k] = v; } };
  let n = 0;
  scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isSprite)) return;
    n++;
    set(o, "visible", true);
    for (let p = o.parent; p; p = p.parent) set(p, "visible", true);
    set(o, "frustumCulled", false);
    if (o.isInstancedMesh && o.count === 0) set(o, "count", 1);
    if (o.geometry?.isInstancedBufferGeometry && o.geometry.instanceCount === 0) set(o.geometry, "instanceCount", 1);
  });
  try { for (let i = 0; i < frames; i++) render(); }
  finally { for (let i = saved.length - 1; i >= 0; i--) { const [o, k, v] = saved[i]; o[k] = v; } }
  return { drawables: n, ms: Math.round(performance.now() - t0) };
}

// boot2 (docs/BOOT.md): warmNow in CHUNKS of drawables, one frame each, waiting for the GPU between them. The page's
// compositor frames (the loading screen) are drawn on the GPU process' main thread, which one big forced frame kept
// busy for ~2 s with its texture / buffer uploads and shader modules (measured in a trace: the loading screen froze);
// with the work split, the GPU process gets a turn between chunks. Same total work, same pipelines. ?warmchunk=0: one
// frame as before; ?warmchunk=N: N drawables per chunk (default 40).
export async function warmNowChunked(scene, render, { chunk = 40 } = {}) {
  const t0 = performance.now();
  const list = [];
  scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) list.push(o); });
  const device = render.device ?? null;
  let frames = 0;
  for (let i = 0; i < list.length; i += chunk) {
    const saved = [];
    const set = (o, k, v) => { if (o[k] !== v) { saved.push([o, k, o[k]]); o[k] = v; } };
    for (const o of list.slice(i, i + chunk)) {
      set(o, "visible", true);
      for (let p = o.parent; p; p = p.parent) set(p, "visible", true);
      set(o, "frustumCulled", false);
      if (o.isInstancedMesh && o.count === 0) set(o, "count", 1);
      if (o.geometry?.isInstancedBufferGeometry && o.geometry.instanceCount === 0) set(o.geometry, "instanceCount", 1);
    }
    try { render(); frames++; }
    finally { for (let k = saved.length - 1; k >= 0; k--) { const [o, key, v] = saved[k]; o[key] = v; } }
    // let the GPU process drain this chunk (and draw a compositor frame) before the next one
    try { await device?.queue.onSubmittedWorkDone(); } catch { /* lost device */ }
    await new Promise((r) => setTimeout(r, 16));
  }
  return { drawables: list.length, ms: Math.round(performance.now() - t0), frames };
}

// ------------------------------------------------------------------ boot3: warm after the cover
/** boot3 (docs/BOOT.md section 5): compile `roots` (stand-ins: lodFade.js fadeProxies) AFTER the cover, gently: the main
 *  pass through the precompile queue (compileAsync: async node builds, frame-paced), then their SHADOW pass (not in
 *  compileAsync), `perFrame` meshes a frame far under the city with the pipelines created async (as the landmarks'
 *  warmShadowPass): at most a couple of small shadow builds per frame. Resolves when done. */
export async function warmLater(renderer, scene, roots, compile, { perFrame = 2 } = {}) {
  if (!roots.length) return;
  if (compile) await compile(roots, { first: true });
  await warmShadows(renderer, scene, roots, { perFrame });
}
/** the shadow-pass half of warmLater: `perFrame` shadow-casting meshes of `roots` a frame, far under the city */
export async function warmShadows(renderer, scene, roots, { perFrame = 2 } = {}) {
  const meshes = [];
  for (const r of roots) r.traverse((o) => { if (o.isMesh && o.castShadow && !Array.isArray(o.material)) meshes.push(o); });
  if (!meshes.length || !renderer.backend?.isWebGPUBackend) return;
  const g = new THREE.Group(); g.name = "boot3-late-warm"; g.position.set(0, -4000, 0);
  scene.add(g);
  const win = openParallelPipelines(renderer, scene);
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    for (let i = 0; i < meshes.length; i += perFrame) {
      g.clear();
      for (const o of meshes.slice(i, i + perFrame)) {
        const p = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, o.material, 1) : new THREE.Mesh(o.geometry, o.material);
        if (o.isInstancedMesh && o.instanceColor) p.instanceColor = o.instanceColor;
        p.castShadow = true; p.receiveShadow = o.receiveShadow; p.frustumCulled = false; p.userData = { ...o.userData, fade: 0.5 };
        g.add(p);
      }
      await frame();
    }
    await win.end();
  } finally { g.clear(); scene.remove(g); }
}
