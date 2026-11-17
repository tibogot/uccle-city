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

export async function warmBoot(renderer, scene, win, needed = () => true, { lift = false } = {}) {
  // perf8 (?coverlift=old): `lift` = the play loader takes over from the cover (a ?game= start, the free-roam hold): the
  // forced frames build every node graph as before, but the cover does not wait for the pipelines to compile nor for the
  // jobs the first view needs: the play loader waits for them (main.js areaReady: no pipeline in flight, no near job)
  // while the ring's full tiles land beside them (the GPU process compiles while the main thread builds the tiles)
  if (lift) {
    const t0 = performance.now();
    for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
    const t1 = performance.now();
    const warm = await warmGamePipelines({ scene }, new Set(), { frames: 2 });
    const t2 = performance.now();
    bootJobsClosed = true;
    const end = win.end();                                   // (closes the window now; its pipelines finish in the background)
    win.ended = end;
    const R = (a, b) => Math.round(b - a);
    return { ms: Math.round(t2 - t0), warmed: warm.warmed, parallel: win.created ?? 0, late: 0, skipped: [], phases: `settle ${R(t0, t1)}, forced ${R(t1, t2)}, the rest under the play loader` };
  }
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
// perfgame round 3 (?compilepar=1 = one at a time, as before): up to COMPILE_PAR jobs in flight. r187's compileAsync
// keeps its precompile state per item (begin / finish round every synchronous step, restored across its yields), and a
// job's synchronous part (the render list, our pass target / MRT) runs whole: jobs only interleave at their awaits. Most
// of a job's time is the wait for its pipelines (compiled in parallel in the GPU process) and three's frame yields: one
// at a time, ~194 jobs took ~37 s after the cover (measured); several in flight overlap those waits.
const COMPILE_PAR = Math.max(1, +(typeof location !== "undefined" ? new URLSearchParams(location.search).get("compilepar") ?? 1 : 1));   // (round 4: 1 by default again: jobs in flight together sometimes found three's precompile state null (a job lost: "Cannot destructure ... _precompilationState"))
const inFlight = new Set();
const pump = () => {
  while (inFlight.size < COMPILE_PAR && jobs.length) pumpOne();
  running = inFlight.size > 0;
};
const pumpOne = () => {
  if (!jobs.length) return;
  if (FLUSH && flushWith && !inFlight.size && flushWith.active()) {
    const take = jobs.filter((j) => j.roots);
    if (take.length > 1) {
      for (const j of take) jobs.splice(jobs.indexOf(j), 1);
      const fj = { job: () => flushJobs(take), first: false, names: ["perf8-flush"], resolve: () => {}, reject: () => {} };
      inFlight.add(fj); running = true;
      Promise.resolve().then(fj.job).finally(() => { inFlight.delete(fj); running = inFlight.size > 0; pump(); });
      return;
    }
  }
  let i = jobs.findIndex((j) => j.first);
  // boot3: until the cover lifts, the jobs the first view needs (bootGate.js neededAtReveal: the models in the boot's
  // ring) go before the others (the far landmarks queued first had the in-ring ones wait 15-17 s). ?bootquiet=all: FIFO
  if (i < 0 && !bootJobsClosed && !BOOT_QUIET_ALL) i = jobs.findIndex((j) => j.names && neededAtReveal(j.names));
  // perf8 (?fadelast=old): a job queued `last` (the fading copies of a tile landing under the play loader or of the start
  // tile: needed only when that tile fades OUT, minutes later) waits behind every other job: the loader's settle waits for
  // the landmarks' jobs, which were queued behind 8 tiles' fading copies (FIFO)
  if (i < 0 && FADE_LAST) { const k = jobs.findIndex((j) => !j.last); if (k > 0) i = k; }
  const j = jobs.splice(i >= 0 ? i : 0, 1)[0];
  inFlight.add(j); running = true; runningJob = j;
  Promise.resolve().then(j.job).then(j.resolve, j.reject).finally(() => { inFlight.delete(j); running = inFlight.size > 0; pump(); });
};
/** perfgame (the play loader, viewer/loader/playLoader.js): the precompile queue's jobs left (0 = idle) */
export const compileJobsLeft = (near = null) => [...jobs, ...inFlight].filter((j) => !near || j.first || near(j.names || [])).length;
let runningJob = null;
const enqueue = (job, first = false, names = null, last = false, roots = null) => new Promise((resolve, reject) => { jobs.push({ job, first, names, last, roots, resolve, reject }); pump(); });

// perf8 (?compileflush=old = one compileAsync job after the other, as before): WHILE THE PLAY LOADER COVERS THE SCREEN the
// queued precompile jobs are done together, the boot warm-up's way: their roots drawn in ONE forced frame (every node graph
// built synchronously, no frame to keep smooth) with a parallel-pipeline window open (every pipeline handed to the GPU
// process at once), then the jobs resolve when those pipelines are ready. Measured before: the loader's last ~16 s were
// the serial queue (198 jobs, 38 s of job time after the cover: the town hall 9 s, the public art 1.7 s ...), each
// compileAsync job yielding to frames and keeping at most 16 pipelines in flight.
// (round 8: ON by default. On a GREEN machine police 43.0 vs 48.2 s to play, falcon 39.3 vs 52.0 s, free roam 32.1 s, every
// start clean (no frame > 50 ms in the first 15 s). On the RED (owner busy) machine 2 of 6 falcon starts had 1.2-1.4 s GPU
// stalls 4-9 s into play with it, but a police start without it had one too: not attributed to it)
const FLUSH = typeof location !== "undefined" && !/[?&]compileflush=old(&|$)/.test(location.search);
let flushWith = null;
/** main.js: { active() (the play loader holds), render() (one frame of the city's pass), renderer, scene } */
export function setCompileFlush(o) { flushWith = o; }
// perf9 (?flushsplit=old = the whole batch in ONE forced frame, as before: one ~7 s task, the play loader frozen): the batch is
// drawn in chunks of whole jobs, each in its own task a rendered frame apart (the loader animates between them), each with
// its own parallel-pipeline window closed right after its draw (its pipelines keep compiling in the GPU process while the
// next chunk's node builds run). The chunk size adapts: ~FLUSH_TASK_MS of main thread per chunk from the ms per drawable
// measured on the chunks before (first chunk 30 drawables, at most 40). The jobs resolve once every chunk's pipelines are ready.
const FLUSH_SPLIT = typeof location !== "undefined" && !/[?&]flushsplit=old(&|$)/.test(location.search);
const FLUSH_TASK_MS = Math.max(100, +(typeof location !== "undefined" ? new URLSearchParams(location.search).get("flushtask") ?? 900 : 900));
const FLUSH_MAX = 40;
const drawablesOf = (roots) => { let n = 0; for (const r of [].concat(roots)) r?.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) n++; }); return n; };
async function flushJobs(take) {
  const t0 = performance.now();
  const rec = { jobs: take.length, drawables: 0, ms: 0, chunks: [] };
  const wins = [];
  if (!FLUSH_SPLIT) { const r = flushDraw(take); rec.drawables = r.n; if (r.win) wins.push(r.win); }
  else {
    let i = 0, perDrawable = 0, budget = 30;
    while (i < take.length) {
      const chunk = [];
      let n = 0;
      while (i < take.length) {
        const j = take[i];
        j.__n ??= drawablesOf(j.roots);
        if (chunk.length && n + j.__n > budget) break;
        n += j.__n; chunk.push(j); i++;
      }
      const c0 = performance.now();
      const r = flushDraw(chunk);
      const ms = performance.now() - c0;
      if (r.win) wins.push(r.win);
      rec.drawables += r.n; rec.chunks.push([chunk.length, r.n, Math.round(ms)]);
      // (the cost per drawable swings 1-50 ms: a chunk of already-built materials is cheap, new ones are not: the estimate
      // follows a dearer chunk at once and a cheaper one slowly, and a chunk never takes more than FLUSH_MAX drawables)
      if (r.n > 0) { const c = ms / r.n; perDrawable = perDrawable ? Math.max(c, 0.8 * perDrawable + 0.2 * c) : c; budget = Math.max(8, Math.min(FLUSH_MAX, Math.round(FLUSH_TASK_MS / Math.max(0.5, perDrawable)))); }
      // a rendered frame, then a new task (the loader's frame is painted before the next chunk's node builds)
      if (i < take.length) { await new Promise((res) => requestAnimationFrame(() => res())); await new Promise((res) => setTimeout(res, 0)); }
    }
  }
  for (const w of wins) { try { await w; } catch (e) { console.warn("[compile flush]", e); } }
  for (const j of take) j.resolve();                 // (on an error: their pipelines then build async at first draw)
  rec.ms = Math.round(performance.now() - t0);
  (globalThis.__flushes ||= []).push(rec);
}
// one forced draw of `take`'s roots in the city's pass, with a parallel-pipeline window open for it (closed right after:
// returns its end() promise, resolved when the pipelines started in it are ready)
function flushDraw(take) {
  const { renderer, scene, render } = flushWith;
  const holder = new THREE.Group(); holder.name = "perf8-flush";
  const saved = [], tops = [];
  const set = (o, k, v) => { if (o[k] !== v) { saved.push([o, k, o[k]]); o[k] = v; } };
  let n = 0, win = null;
  const restore = () => {
    for (let i = saved.length - 1; i >= 0; i--) { const [o, k, v] = saved[i]; o[k] = v; }
    saved.length = 0;
    for (const t of tops) if (t.parent === holder) holder.remove(t);
    scene.remove(holder);
  };
  try {
    for (const j of take) for (const r of [].concat(j.roots)) {
      if (!r) continue;
      // climb to the detached top, but stop at the holder: a second root of a model already moved under it would
      // otherwise reach the holder itself ("object can't be added as a child of itself")
      let top = r; while (top.parent && top.parent !== holder) top = top.parent;
      if (top.parent !== holder && top !== holder && top !== scene && !top.isScene && !tops.includes(top)) { tops.push(top); holder.add(top); }
      for (let p = r.parent; p; p = p.parent) set(p, "visible", true);
      r.traverse((o) => {
        set(o, "visible", true);
        if (o.isMesh || o.isPoints || o.isLine || o.isSprite) {
          n++;
          set(o, "frustumCulled", false);
          if (o.isInstancedMesh && o.count === 0) set(o, "count", 1);
          if (o.geometry?.isInstancedBufferGeometry && o.geometry.instanceCount === 0) set(o.geometry, "instanceCount", 1);
        }
      });
    }
    scene.add(holder);
    const w = openParallelPipelines(renderer, scene);
    try { render(); } finally { restore(); win = w.end(); }
  } catch (e) {
    restore();
    console.warn("[compile flush]", e);
  }
  return { n, win };
}
// (perf8, OFF by default: ?fadelast=1. Measured: the falcon start then had 1.2-1.4 s GPU stalls in its first 15 s of play,
// the fading copies' compiles moved after the reveal; with the compile flush the queue's order matters little anyway)
const FADE_LAST = typeof location !== "undefined" && /[?&]fadelast=1(&|$)/.test(location.search);
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
export function precompile(renderer, roots, camera, scene, { target = null, mrt = null, first = false, names = null, last = false } = {}) {
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
  }, first, names ?? [].concat(roots).map((r) => r?.name || ""), last && !first, roots);   // (perfgame round 5: a staged landmark job carries its model's name)
  if (!bootJobsClosed) { const j = { names: names ?? [].concat(roots).map((r) => r?.name || ""), first, done: false }; job.finally(() => { j.done = true; }); bootJobs.push(j); }
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
// perf8 (?earlypace=old = the drain after every chunk): the drain was ~1 s a chunk (10.8 of the 14.7 s, measured round 5):
// the GPU process compiling the chunk's async pipelines, which onSubmittedWorkDone waits behind. Now the next chunk's node
// builds (main thread) run WHILE the GPU process compiles the last chunk's pipelines: a task break between chunks (the
// tile landings and the loading screen's messages get their turn), the GPU drained only every `drainEvery` chunks.
export async function warmNowChunked(scene, render, { chunk = 40, drainEvery = 1 } = {}) {
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
    const tc = performance.now();
    try { render(); frames++; }
    finally { for (let k = saved.length - 1; k >= 0; k--) { const [o, key, v] = saved[k]; o[key] = v; } }
    // (perfgame round 5, debug: where the early warm-up's time goes: ms per chunk + its top-level groups)
    const tops = new Map();
    for (const o of list.slice(i, i + chunk)) { let t = o; while (t.parent && !t.parent.isScene) t = t.parent; const k = t.name || t.type; tops.set(k, (tops.get(k) || 0) + 1); }
    (globalThis.__earlyChunks ||= []).push({ ms: Math.round(performance.now() - tc), tops: [...tops].sort((a, b) => b[1] - a[1]).slice(0, 6) });
    // let the GPU process drain this chunk (and draw a compositor frame) before the next one
    if (drainEvery > 0 && frames % drainEvery === 0) { try { await device?.queue.onSubmittedWorkDone(); } catch { /* lost device */ } }
    await new Promise((r) => setTimeout(r, drainEvery > 0 && frames % drainEvery === 0 ? 16 : 0));
  }
  return { drawables: list.length, ms: Math.round(performance.now() - t0), frames };
}

// ------------------------------------------------------------------ boot3: warm after the cover
/** boot3 (docs/BOOT.md section 5): compile `roots` (stand-ins: lodFade.js fadeProxies) AFTER the cover, gently: the main
 *  pass through the precompile queue (compileAsync: async node builds, frame-paced), then their SHADOW pass (not in
 *  compileAsync), `perFrame` meshes a frame far under the city with the pipelines created async (as the landmarks'
 *  warmShadowPass): at most a couple of small shadow builds per frame. Resolves when done. */
export async function warmLater(renderer, scene, roots, compile, { perFrame = 2, last = false } = {}) {
  if (!roots.length) return;
  if (compile) await compile(roots, last && FADE_LAST ? { last: true } : { first: true });   // (perf8: `last` = behind every other job)
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
