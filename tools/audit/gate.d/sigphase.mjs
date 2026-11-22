// gate row `sigphase` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "sigphase",
  script: "tools/audit/sigphaseCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "one signal phase along a road (rule signal-phase-road, viewer/traffic/signals.js signalPhases, claude/signals1): in every tile the through movements between signal nodes under 150 m apart (and a junction whose signals are mapped on its approaches) on one phase, odd rings <= 1 (E1); a link across a tile border agrees as each end's core tile builds it; every drawn post shows its approach's phase from the same table; crossing arms of a <= 4-arm signal junction on different phases; the old phase-by-post-direction rule fails it",
};
