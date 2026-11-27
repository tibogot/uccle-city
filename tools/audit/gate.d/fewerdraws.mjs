// gate row `fewerdraws` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "fewerdraws",
  script: "tools/audit/fewerDrawsCheck.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "fewer render objects (claude/perf6, rule settled-props-in-pool): the park fences' iron cards are the parts of ONE multi-draw set (a part filled as its stage was, the view hidden when empty; ?fencecards=old one mesh per card); cityProps hides an empty proxy before render()'s early returns (?propshide=old: 47 empty render objects a frame)",
  timeout: 120,
  meta: { features: ["fencecards", "propshide", "propsettle"].map((key) => ({ key, type: "old", group: "perf", sub: "Stutter" })) },
};
