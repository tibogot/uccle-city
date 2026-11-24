// gate row `flags` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "flags",
  script: "tools/audit/flagsCheck.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "every placed flag is a cloth flag (rule flags-are-cloth): a model GLB with a flag-like slot lists it in rigid_flag_slots (its loader leaves it out) with flag_poles; each modelled flag hangs on a listed pole (GLB decoded, every level); every flag_poles site is flown by flyFlags and ?quick=1 keeps its flags (claude/flags2: the police station's still flags)",
  meta: {
    features: [{ key: "policeflag", type: "old" }],
    clean: ["viewer/flagsCity.js", "viewer/policeCity.js", "viewer/policeModel.js"],
  },
};
