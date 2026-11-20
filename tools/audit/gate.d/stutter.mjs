// gate row `stutter` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "stutter",
  script: "tools/audit/stutterCheck.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "falcon-flight hitches: compile slices <= 4 ms while playing (asyncPipes.js fineCompile), the heap-drop check <= 3 ms a task, the Square des Heros ground in slices, a tile landing's stops-to-plants placements a frame apart, the grass field baked only when blades can show, shadow-warm groups drawn by the sun cache, staged landmarks' shadow pass warmed; each behind its ?x=old (claude/falconstutter, docs/perf/FALCON_STUTTER.md)",
  timing: true,
};
