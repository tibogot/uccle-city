// gate row `policerear` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "policerear",
  script: "tools/audit/policeRear.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "the player's police car rear in the chase view: the rear plate a pre-filtered texture on every police body, the rear's thin-feature (clamp-miss) budget at the chase camera, the switch a features row, no light / DynamicDrawUsage (claude/policerear, docs/POLICEREAR.md)",
  meta: {
    features: [{ key: "carplate", type: "old" }],
    clean: ["viewer/police/plateDecal.js", "viewer/drive/carPacks.js", "debug/rearCheck.js"],
  },
};
