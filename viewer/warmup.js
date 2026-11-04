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
