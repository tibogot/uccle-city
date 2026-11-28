// gate row `trafmix` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "trafmix",
  script: "tools/audit/trafmixGate.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet", "--register"],   // (claude/street4: the stuck places are gap-register entries, trafmix.stuck)
  timing: true,       // (its sim-cost check measures wall time)
  deps: ["data/gaps.json", "data/transit/trafmix.json", "models/cars/heavy.glb", "models/cars/cars2.glb", "viewer/carFleet.js", "tools/blender/heavies.py", "viewer/traffic/signals.js", "viewer/streets/signalPlace.js"],
  meta: {
    clean: ["viewer/traffic/trafMix.js"],
    features: [{ key: "trafmix", type: "old" }, { key: "weekday", type: "select" }, { key: "yieldkeep", type: "old" }, { key: "runsqueeze", type: "old" }, { key: "clearroute", type: "old" }, { key: "lapre", type: "old" }],
  },
  guards: "the traffic mix (rule traffic-mix, docs/TRAFMIX.md): the service vehicles' models (models/cars/heavy.glb: triangles per LOD, head / tail / beacon / glass kinds, tyres on the ground), the mix tables per hour, the realised shares at 8 / 13 / 18 h on D5-D7 + E4-E6 (cars, vans, SUVs; patrols present, ~5x round Rue Rouge), STIB / De Lijn buses on their OSM lines (>= 85 % of the time) stopping with the front door at the pole (median <= 1.5 m), an ambulance on a run: the cars ahead slow and pull right, the stuck service vehicles (it and its queue still 60 s) over seeds 7 / 11 / 23 at most STUCK_MAX (4 at claude/street4, 1 at claude/signals1, then claude/parking1: see STUCK_MAX), each stuck place a gap-register entry, no service vehicle into a lane narrower than itself (rule service-vehicle-passage), the close signal pairs off phase at most PHASE_MAX (0 since claude/signals1, rule signal-phase-road), every drawn post on the phase of the sim lane it faces, delivery rounds not stuck more than the other cars, the step <= 1.10 x without the mix; ?trafmix=old fails it (claude/trafmix)",
};
