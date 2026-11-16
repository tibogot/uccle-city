// ASYNC PIPELINES DURING PLAY (docs/PERF_GAME.md, perfgame 2026-11-16; ?asyncpipes=old = three's synchronous path).
// three r187 creates a render pipeline the first time a (material, geometry, pass) is drawn with the SYNCHRONOUS
// device.createRenderPipeline: Chrome compiles it on the GPU process' main thread and every later GPU call of the frame
// waits behind it. The boot compiles everything the first view needs (warmup.js), the tiles and models precompile what
// they bring (preCompile / compileFor), but variants still slip through while playing (a streamed tile's street-life
// fade copy, a façade-kit far-wall variant, the shadow pass of a new layout, a basic material's new light count...):
// measured in the police drive 2026-11-16, such sync pipelines lined up with frames of 150-800 ms (debug/gamePerf.js).
// Here, after the boot, a new pipeline for an object of the city's scene is created ASYNC (worker threads in the GPU
// process) and three skips that one draw until it is ready (Pipelines.isReady: the object shows one or a few frames
// later, the frame never stalls). Hooked on three's Pipelines._getRenderPipeline (the `promises` list three keeps for
// compileAsync), not on backend.createRenderPipeline: the landmarks' and the boot's pipeline windows
// (vendor/engine/parallelPipelines.js) swap that one in and out and would drop a wrapper installed between them.
// Other scenes (bakes, sky, thumbnails, the post chain's quads) keep the sync path: none of their draws is skipped.
export function keepPipelinesAsync(renderer, scene) {
  const P = renderer._pipelines;
  if (!renderer.backend?.isWebGPUBackend || !P || P.__asyncPipes) return null;
  const get = P._getRenderPipeline;
  const stats = { async: 0, sync: 0, pending: 0, on: true };
  P._getRenderPipeline = function (renderObject, stageVertex, stageFragment, cacheKey, promises) {
    // (a bake into a render target marked .syncPipes, e.g. the weather's overhead map: every draw must land)
    if (promises || !stats.on || renderObject.scene !== scene || renderer.getRenderTarget()?.syncPipes) return get.call(this, renderObject, stageVertex, stageFragment, cacheKey, promises);
    const list = [];
    const r = get.call(this, renderObject, stageVertex, stageFragment, cacheKey, list);
    if (list.length) { stats.async++; for (const p of list) { stats.pending++; p.finally(() => { stats.pending--; }); } }   // (the play loader waits for 0)
    return r;
  };
  P.__asyncPipes = stats;
  return stats;
}
