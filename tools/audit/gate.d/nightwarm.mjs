// gate row `nightwarm` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "nightwarm",
  script: "tools/audit/nightWarmCheck.mjs",
  args: ["--quiet"],
  guards: "the lamp shadows are warmed at night too (rule night-warm-at-night, claude/nightload): a game started at night no longer waits for a by-day warm-up that never runs (the play loader at its 70 s limit, ~750 casters); zero-scale stand-ins per material x layout on the lamps' layer, no light moved / added, no DynamicDrawUsage; the loader waits for the spawn ring's keys only; ?nightwarm=old; (rule spawn-hold-parallel) a first teleport into third person boots the character beside the area hold, then a short second hold (?spawnpar=old)",
  timeout: 60,
  meta: {
    features: [{ key: "nightwarm", type: "old", group: "streaming", sub: "Boot & loading" }, { key: "nighthold", type: "old", group: "streaming", sub: "Boot & loading" }, { key: "spawnpar", type: "old", group: "streaming", sub: "Boot & loading" }],
  },
};
