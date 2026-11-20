// gate row `stutter2` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "stutter2",
  script: "tools/audit/stutter2Check.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "falcon-flight hitches round 2: the street-life boxes' node build shared by every tile (three's own canReferenceInstanceData passes, 0 builds per new tile), a distance-swapped mesh's fading copies (kit walls near + far) made with its first tile and a retire's new copies shadow-warmed, a tile's gardens and the hero collider poll in <= 3 ms slices (same results as at once, yields without the timer clamp), the hero BVH copy transferred; each behind its ?x=old (claude/falcon2, docs/perf/FALCON_STUTTER.md)",
  timing: true,
};
