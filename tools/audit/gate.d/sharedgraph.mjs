// gate row `sharedgraph` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "sharedgraph",
  script: "tools/audit/sharedGraphCheck.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "one node graph per material family (rule shared-node-graph, claude/perf5): the park kit's fading meshes share one fading copy per slot material (one mask node, one program cache key; the fade value is each mesh's own kitFade geometry attribute on a geometry sharing the piece's buffers); every tile's asphalt is a clone of one template graph per atlas kind (one program cache key), reading its own marking atlas texture / scale / range from its material per object; ?kitfadeshare=old / ?asphaltshare=old (a graph per mesh / tile) still work",
  timeout: 180,
  meta: {
    features: ["kitfadeshare", "asphaltshare"].map((key) => ({ key, type: "old", group: "perf", sub: "Stutter" })),
  },
};
