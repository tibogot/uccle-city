// RENDER-OBJECT SWEEP (perf8, docs/PERF_GAME.md round 8; ?rosweep=old = off).
// three r187 keeps every render object it ever made in RenderObjects._renderObjects (a Set: strong references) until its
// object, material or geometry dispatches 'dispose'. The boot's and the streaming's stand-ins (the warm-up's fading-copy
// proxies, the shadow-pass warm groups far under the city, the far-merge bake meshes, a landmark's precompile copies)
// are drawn or compiled once and dropped from the scene, but their render objects -> objects -> geometries stayed: round 3
// measured 274 MB of typed arrays in 342 geometries no longer in the scene. Dispatching 'dispose' on them was not an
// option: the render object's dispose releases its pipeline and node build when it was their last user, and those are
// exactly what the stand-in was made to leave behind for the real objects (fading tiles, the landmarks' near LODs).
//
// Here: every `every` ms, a render object not drawn / compiled for `idleMs` whose object is NOT in the city's scene (its
// top parent is not `scene`) is disposed, with its pipeline, its two shader programs and its node build PINNED first
// (one extra use each, never released): the real objects that share the material and the geometry layout later find
// the same node build (no shader build on the main thread) and the same GPU pipeline (no compile). What goes: the render
// object, its bind groups (ref-counted by three), its vertex state, and with them the last reference to the stand-in's
// object and geometry (GC). The city's own objects are never touched (in the scene, hidden or not).
// "Drawn" = asked for by three's RenderObjects.get (every draw and every compile goes through it): a stamp per call.
export function sweepRenderObjects(renderer, scene, { every = 5000, idleMs = 12000, budget = 400, log = null } = {}) {
  const RO = renderer._objects, P = renderer._pipelines, N = renderer._nodes;
  if (!RO?._renderObjects || !P || !N || RO.__sweep) return null;
  let clock = performance.now();
  const tickClock = () => { clock = performance.now(); requestAnimationFrame(tickClock); };
  requestAnimationFrame(tickClock);
  const get = RO.get;
  RO.get = function () { const r = get.apply(this, arguments); if (r) r.__seen = clock; return r; };
  // the render objects made before the hook: seen "now" (the boot's stand-ins then go after idleMs like the rest)
  for (const r of RO._renderObjects) r.__seen = clock;
  const pinnedPipes = new WeakSet(), pinnedStates = new WeakSet();
  const stats = { swept: 0, pinnedPipes: 0, pinnedStates: 0, runs: 0, lastMs: 0, on: true };
  const inScene = (o) => { while (o.parent) o = o.parent; return o === scene; };
  const pin = (r) => {
    const pd = P.get(r), pipe = pd?.pipeline;
    if (pipe && !pinnedPipes.has(pipe)) {
      pinnedPipes.add(pipe); stats.pinnedPipes++;
      pipe.usedTimes++;
      if (pipe.isComputePipeline) pipe.computeProgram.usedTimes++;
      else { pipe.vertexProgram.usedTimes++; pipe.fragmentProgram.usedTimes++; }
    }
    const nd = N.get(r), st = nd?.nodeBuilderState;
    // (only a build three caches for reuse: an object-specific one is not in the cache, nobody could find it again)
    if (st && !pinnedStates.has(st) && N.nodeBuilderCache?.get(N.getForRenderCacheKey(r)) === st) { pinnedStates.add(st); stats.pinnedStates++; st.usedTimes++; }
  };
  const sweep = () => {
    if (!stats.on) return;
    const t0 = performance.now();
    let n = 0;
    const list = [];
    for (const r of RO._renderObjects) {
      if (clock - (r.__seen ?? 0) < idleMs) continue;
      if (inScene(r.object)) continue;
      list.push(r);
      if (list.length >= budget) break;
    }
    for (const r of list) {
      try { pin(r); r.dispose(); n++; } catch (e) { /* a half-built render object: leave it */ }
    }
    stats.swept += n; stats.runs++; stats.lastMs = +(performance.now() - t0).toFixed(2);
    if (n && log) log(`render-object sweep: ${n} stand-in render objects released (${stats.swept} in all; ${stats.pinnedPipes} pipelines + ${stats.pinnedStates} node builds kept), ${stats.lastMs} ms`);
  };
  const timer = setInterval(sweep, every);
  stats.sweep = sweep;
  stats.stop = () => { stats.on = false; clearInterval(timer); RO.get = get; };
  RO.__sweep = stats;
  return stats;
}
