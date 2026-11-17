// NODE-BUILD AUDIT (perf9, docs/PERF_GAME.md round 9; ?buildaudit=1, off by default): every TSL node build three r187
// makes (NodeManager.getForRender -> NodeBuilder.build / buildAsync), timed, with the material / object it was for and a
// hash of the WGSL it produced. three keys its node-build cache by the node graph's node IDS (Node.customCacheKey = id),
// so two materials whose graphs are made of different node objects build separately even when the WGSL comes out
// identical (programs and pipelines are then shared by text, the main-thread build is not): those repeats are the
// candidates for one shared graph (the same node objects, values through material properties / materialReference).
// Installed right after renderer.init (main.js), so the boot's builds are all seen. Summary: debug/buildAudit.js.
const h = (s) => { let a = 0x811c9dc5; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193); return (a >>> 0).toString(16); };

export function installBuildAudit(renderer) {
  if (renderer.__buildAudit) return renderer.__buildAudit;
  const A = (renderer.__buildAudit = globalThis.__builds = { rec: [], ms: 0 });
  const prev = renderer.debug.onNodeBuilderCreated;
  renderer.debug.onNodeBuilderCreated = (nb, ro) => {
    prev?.(nb, ro);
    if (!ro?.isRenderObject && !ro?.material) return;              // (compute nodes: not counted)
    const own = ro.object?.material, m = ro.material;
    const r = {
      t: Math.round(performance.now()),
      mat: (Array.isArray(own) ? "multi" : own?.name) || m?.name || m?.type || "?", type: m?.type || "?",
      pass: own && m !== own && !Array.isArray(own) ? `override:${m?.type}` : "own",
      obj: ro.object?.name || ro.object?.type || "?", key: ro.initialCacheKey,
      ms: 0, code: null, async: false,
    };
    const done = (t0) => { r.ms = +(performance.now() - t0).toFixed(2); A.ms += r.ms; r.code = nb.fragmentShader || nb.vertexShader ? h((nb.vertexShader || "") + "|" + (nb.fragmentShader || "")) : null; };
    const b = nb.build, ba = nb.buildAsync;
    nb.build = function () { const t0 = performance.now(); try { return b.call(this); } finally { done(t0); } };
    if (ba) nb.buildAsync = async function (y) { r.async = true; const t0 = performance.now(); try { return await ba.call(this, y); } finally { done(t0); } };
    A.rec.push(r);
  };
  return A;
}
