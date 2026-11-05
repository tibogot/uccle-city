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
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";
import { warmGamePipelines, awaitPipelinesQuiet } from "../vendor/engine/pipelineWarmup.js";

export function openBootPipelines(renderer, scene) {
  return openParallelPipelines(renderer, scene);
}

export async function warmBoot(renderer, scene, win) {
  const t0 = performance.now();
  // Let the per-frame updaters settle first (tree LOD, lamps, cars): the warm-up restores every
  // visible/count it touched to the value it saw BEFORE its frames, and the tree field only re-checks
  // when the camera moves 4 m, so warming before its first update left the trees hidden.
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
  const warm = await warmGamePipelines({ scene }, new Set(), { frames: 2 });
  const quiet = await awaitPipelinesQuiet({ renderer }, { quietFrames: 12, maxMs: 15000 });
  const par = await win.end();
  try { await renderer.backend.device?.queue.onSubmittedWorkDone(); } catch { /* WebGL2 / lost device */ }
  // a couple of frames with the finished pipelines, so the reveal frame is not the first real draw
  for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
  return { ms: Math.round(performance.now() - t0), warmed: warm.warmed, parallel: par.created, late: quiet.pipelines };
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
let rawCompile = null, tail = Promise.resolve(), passFor = null;
const enqueue = (job) => { const run = tail.then(job); tail = run.catch(() => {}); return run; };
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
export function precompile(renderer, roots, camera, scene, { target = null, mrt = null } = {}) {
  if (!renderer.backend?.isWebGPUBackend) return Promise.resolve();
  installCompileQueue(renderer);
  return enqueue(async () => {
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
  });
}
