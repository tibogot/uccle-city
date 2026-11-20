// gate row `hedgewall` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "hedgewall",
  script: "tools/collide/hedgeWallTest.mjs",
  node: ["--preserve-symlinks", "--import", "./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "HEDGES SOLID (rule hedge-wall, docs/CARHIT.md, owner 2026-11-20): the car at 30 km/h into a 1.8 m hedge stops (coasting and on full throttle, <= 0.2 m inside), rebounds less than off brick, the hit reaches the shake pool; into a 0.8 m hedge it passes, slowed; moto / scooter / Villo stopped by the 1.8 m hedge; 1.1 m soft / 1.2 m a wall; the shake decays to zero by 0.6 s; no NaN; --old (?hedgewall=old) fails it",
  deps: ["viewer/gardens/hedgeShake.js"],
  meta: {
    features: [{ key: "hedgewall", type: "old" }],
    clean: ["viewer/gardens/hedgeShake.js"],
    text: [
      { file: "viewer/drive/driveMode.js", what: "gives a garden hedge stand-in its kind by its drawn height", test: (s) => /isHedge \? hedgeKind\(drawnH\)/.test(s) },
      { file: "viewer/gardens/gardenHedge.js", what: "adds the hit shake to the hedge's lean", test: (s) => /shakeAt\(p, f\)/.test(s) },
      { file: "viewer/gardens/cityGardens.js", what: "steps the shake pool each frame", test: (s) => /updateShake\(\)/.test(s) },
      { file: "viewer/character/cityHook.js", what: "the walker is blocked by the hedge stand-ins", test: (s) => /gardenwall\|gate\|hedge/.test(s) },
    ],
  },
};
