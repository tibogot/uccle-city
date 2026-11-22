// gate row `servicepass` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "servicepass",
  script: "tools/audit/servicePassAudit.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet", "--all", "--jobs", "3"],
  guards: "a service vehicle's way past the parked cars, all tiles (rule service-vehicle-passage): every parked car leaves 3 m of carriageway across from it (the widest service vehicle, a bus 2.55 m, + 2 x 0.2 m), the census of what the clearance / the 5 m junction-mouth rule dropped, the lanes' clear widths measured (claude/parking1)",
  meta: {
    features: [{ key: "parkservice", type: "old" }, { key: "parkmouth", type: "old" }],
    text: [
      { file: "viewer/streets/parkPlace.js", what: "widthParking runs the clearance pass", test: (s) => /serviceClear\(cand, fit, stats\)/.test(s) },
      { file: "viewer/traffic/trafficSim.js", what: "pickNext weighs the lanes' clear widths", test: (s) => /this\.clearWeight\(g, g\.nextIdx\[k\]\)/.test(s) },
    ],
  },
};
