// gate row `villorows` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "villorows",
  script: "tools/streetkit/villoCheck.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--jobs","4"],
  guards: "every Villo station's row clear and on its paving (rule villo-row-clear, claude/fixes4): no lamp (as the city places them, cityStreetKit.keepLampsClear = viewer/streetkit/villoFootprint.js lampKeepClear), sign / plate / stop / tram pole, tree trunk, bollard, bench, bin, bike hoop or shelter inside the docks + bikes + terminal footprint, every dock base corner and both tyres on paving (measured sidewalk / square / parking); mutation tests: a lamp 1.5 m in front of a dock (the old 1.2 m dock-point rule let it stand) and a row reaching past the paving's edge must be findings; ?villorow=old = the lamps' old rule",
  deps: ["data/streetkit/", "data/furniture/", "data/stops/"],
  meta: {
    features: [{ key: "villorow", type: "old" }],
    text: [{ file: "viewer/streetkit/cityStreetKit.js", what: "the lamps keep out of the Villo rows by the shared footprint", test: (s) => /lampKeepClear\(place, doc/.test(s) && /from "\.\/villoFootprint\.js"/.test(s) }],
  },
};
