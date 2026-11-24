// browser gate row `xmasperf` (run on a browser turn; docs/WORKFLOW.md)
export default {
  name: "xmasperf",
  text: "XMASPERF (docs/CHRISTMAS.md \"Boot with the layer on\", plan job 3), on GREEN only (tools/perf/preflight.ps1 + debug/preflight.js), one Chrome tab: (1) /viewer/index.html?quick=1&place=stjob-street&xmas=1&time=night, wait for window.__quickReady and window.xmas, then `(await import('/debug/xmasPerf.js')).run()`: GPU A/B (gpuAB alternate, layer meshes' camera layers off / on interleaved) whole layer at street level < 0.30 ms, the fir alone at 8 m < 0.10 ms, each extra in window.xmas.extras (poles, window lights) < 0.05 ms; (2) boot requests (debug/bootTimeline.js as the init script, then debug/xmasBoot.js) with ?xmas=1 vs ?xmas=0 on the default boot: the Christmas files (models/christmas/) all start AFTER the cover unless the spawn's ring reaches a decorated area, requests / MB before the cover equal within +-1 file; numbers into docs/CHRISTMAS.md (claude/xmas2)",
};
