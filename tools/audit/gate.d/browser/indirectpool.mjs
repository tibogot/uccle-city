// browser gate row `indirectpool` (run on a browser turn; docs/WORKFLOW.md)
export default {
  name: "indirectpool",
  text: "INDIRECT POOL (docs/rules/indirect-pool.md): at featureAB.at('stjob-street') and in ?game=police (debug/gamePerf.js police, 25 s), (await import('/debug/indirectCount.js')): start(), 4-10 s, report(): the main scene pass's DISTINCT indirect buffers <= 1 + the GPU-written exceptions in view (grass, sky birds, plant fields: <= 4 in practice; with ?indpool=old 55-69), the same indirect draw count as ?indpool=old (+-5 %: the culls), no WebGPU validation error in the console, a screenshot equal to ?indpool=old (TAA noise only), __indirectPool.stats().grows small (0-2 after the boot)",
};
