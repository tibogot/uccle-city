// ASYNC PIPELINES DURING PLAY (docs/PERF_GAME.md, perfgame 2026-11-16; ?asyncpipes=old = three's synchronous path).
// three r187 creates a render pipeline the first time a (material, geometry, pass) is drawn with the SYNCHRONOUS
// device.createRenderPipeline: Chrome compiles it on the GPU process' main thread and every later GPU call of the frame
// waits behind it. The boot compiles everything the first view needs (warmup.js), the tiles and models precompile what
// they bring (preCompile / compileFor), but variants still slip through while playing (a streamed tile's street-life
// fade copy, a façade-kit far-wall variant, a basic material's new light count...): measured in the police drive
// 2026-11-16, every such sync pipeline lined up with a frame of 150-800 ms (debug/gamePerf.js "pipelines").
// Here, after the boot, a new pipeline for an object of the city's scene is created ASYNC (worker threads in the GPU
// process) and three skips that one draw until it is ready (Pipelines.isReady: the object shows one or a few frames
// later, the frame never stalls). The same window the boot opens (vendor/engine/parallelPipelines.js), kept open for
// good, without keeping the promises. Other scenes (bakes, sky, thumbnails, the post chain's quads) keep the sync path:
// none of their draws is ever skipped.
export function keepPipelinesAsync(renderer, scene) {
  const backend = renderer.backend;
  if (!backend?.isWebGPUBackend || backend.__asyncPipes) return null;
  const sync = backend.createRenderPipeline;
  const stats = { async: 0, sync: 0, pending: 0, on: true };
  const wrapped = function (renderObject, promises) {
    if (!stats.on || promises || renderObject.scene !== scene) { if (!promises) stats.sync++; return sync.call(this, renderObject, promises); }
    stats.async++;
    const list = [];
    const r = sync.call(this, renderObject, list);      // three's async branch: the pipeline is set when it resolves
    for (const p of list) { stats.pending++; p.finally(() => { stats.pending--; }); }   // (the play loader waits for 0)
    return r;
  };
  backend.createRenderPipeline = wrapped;
  backend.__asyncPipes = stats;
  return stats;
}
