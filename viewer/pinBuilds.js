// PIN THE SHARED BUILDS (claude/perf5 round 2, rule docs/rules/shared-node-graph.md; ?pinbuilds=old = off).
// three r187 ref-counts a node build (NodeBuilderState.usedTimes) and a pipeline (+ its two programs) by the render
// objects that use them: when the last one is disposed, the build leaves the cache and the pipeline is destroyed. The
// city's SHARED materials (one material for every tile: the walls, roofs, the asphalt / terrain templates' clones) and
// their FADING copies are used by the tiles that are drawn or fading right now; a fading copy only while a tile fades.
// Driving away, every tile that ever faded in is unloaded, its render objects go, and the shared fading copy's build
// went with them: the next tile landing built it again on the main thread (the walls' fading copy in the sun's shadow
// pass, 29-37 ms, twice in one 45 s police drive: docs/perf/QUIET_2026-11-26.md). Here, the first time a pipeline is set
// for a render object whose (source) material is shared, its node build, pipeline and programs get ONE extra use each
// (never released; the set is bounded: the shared materials x the passes they draw in). The same as roSweep.js's pin
// for the stand-ins, for the city's own shared materials.
const isSharedMat = (m) => {
  const u = m?.userData;
  if (!u) return false;
  if (u.shared || u.sharedGraph || u.kitFadeShared) return true;
  const f = u.fadeOf?.userData;
  return !!(f && (f.shared || f.sharedGraph));
};
export function installPinBuilds(renderer) {
  const P = renderer._pipelines, N = renderer._nodes;
  if (!P || !N || P.__pinBuilds || typeof P._getRenderPipeline !== "function") return null;
  const stats = { pipes: 0, states: 0 };
  const pipes = new WeakSet(), states = new WeakSet();
  const get = P._getRenderPipeline;
  P._getRenderPipeline = function (ro, ...rest) {
    const pipe = get.call(this, ro, ...rest);
    try {
      const src = ro.material?.isShadowPassMaterial || ro.material?.isNodeMaterial === false ? (renderer._currentSourceMaterial ?? ro.material) : ro.material;
      if (isSharedMat(src) || isSharedMat(renderer._currentSourceMaterial)) {
        if (pipe && !pipes.has(pipe)) {
          pipes.add(pipe); stats.pipes++;
          pipe.usedTimes++;
          if (pipe.vertexProgram) pipe.vertexProgram.usedTimes++;
          if (pipe.fragmentProgram) pipe.fragmentProgram.usedTimes++;
        }
        const st = N.get(ro)?.nodeBuilderState;
        // (only a build three caches for reuse: an object-specific one is not found again by anybody)
        if (st && !states.has(st) && N.nodeBuilderCache?.get(N.getForRenderCacheKey(ro)) === st) { states.add(st); stats.states++; st.usedTimes++; }
      }
    } catch (e) { /* a half-built render object: leave it */ }
    return pipe;
  };
  P.__pinBuilds = stats;
  return stats;
}
export const _isSharedMat = isSharedMat;     // (tools/audit/sharedGraphCheck.mjs)
