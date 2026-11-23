// gate row `streetlanes` (docs/WORKFLOW.md): the traffic lanes and turns from the street model (rule street-lanes)
export default {
  name: "streetlanes",
  script: "tools/audit/census/streetLanes.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--all", "--quiet", "--worst", "0", "--jobs", "4", "--register", "--maxc", "building=1.5,carriage=104,kerb=362.5,turn=160.5"],
  guards: "the traffic lanes and junction turns built from the street model (viewer/street/lanes.js, docs/STREET_MODEL_PLAN.md job 4, invariant 3), all tiles, on the graph the worker drives (viewer/traffic/tileTraffic.js): every model lane point (0.5 m) on the measured carriageway (else off the drawn street) and >= 1.0 m from a measured kerb / street-edge line (a carriageway narrower than 2.3 m: one centred lane), every G2 junction turn inside its junction polygon / floor disc (+ 0.3 m), no lane or turn body (+- 0.9 m) in a building footprint; every finding by its stable id in the gap register data/gaps.json (rule gap-register: a new one fails, a fixed one left registered fails) (claude/street4, rule street-lanes provisional); claude/lanes5 (job 4b): each finding classified from its evidence (tools/audit/census/laneCause.mjs: a source data, b the measure, c our builder), its register cause from that, and our builder's metres per check ceilinged (--maxc: building 1.5 m (one 1.5 m place below the 2 m roof grid), carriage 104, kerb 362.5, turn 160.5 (after merging claude/parking1 and leaving parked-car needs uncapped: kerb c +64 m where a lane holds its clearance from a parked car toward the far kerb, trafmix parkClamped 2,796 -> 415); before job 4b: 5.5 / 345.5 / 715.5 / 330)",
  deps: ["data/gaps.json"],
  meta: {
    features: [{ key: "streetlanes", type: "old" }],
    text: [
      { file: "viewer/main.js", what: "hands ?streetlanes to the tile worker", test: (s) => /streetLanes:\s*params\.get\("streetlanes"\) !== "old"/.test(s) },
      { file: "viewer/traffic/tileTraffic.js", what: "the one builder takes the model's lanes (entry.streetLanes)", test: (s) => /entry\.streetLanes !== false/.test(s) && /net\.streetModel/.test(s) },
      { file: "viewer/roadBuild.js", what: "hands the street model to the traffic graph", test: (s) => /net\.streetModel = streetModel/.test(s) },
    ],
    clean: ["viewer/street/"],
  },
};
