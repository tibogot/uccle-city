// gate row `sawtooth` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "sawtooth",
  script: "tools/audit/census/sawtooth.mjs",
  timeout: 1800,
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--all", "--quiet", "--jobs", "4", "--max", "places=356,metres=8756", "--oldcheck", "I6,H6,F2"],
  guards: "no saw-tooth on walked / driven surfaces (rule no-sawtooth-surfaces, claude/sawtooth, owner 2026-11-26: the sidewalk climbing with the tram by Saint-Job 'has bumps like a SAW TOOTH'): every kerb (0.5-2.5 m on its raised side, 0.5 / 1.5 m on its low side), every OSM path and road line of all 120 tiles walked at 0.25 m on the DRAWN ground (street parts, else the drawn terrain); a chain of >= 5 regular swings (cycle 0.75-12 m, CV <= 0.4) of >= 2.5 cm against the local +-3 m line, real steps / dropped kerbs / tree pits / corners cut out, = one place; the bare UrbIS DTM's own micro-relief reported (dtmPlaces), not counted. Cause: each 6 m corner of the street height field its own plane (viewer/surfaces.js fitCorner); fix: the corners solved together (jointFit), the tram corridors' corners kept (the trams' rails). Ceilings = the 2026-11-26 after-count: 356 places / 8,756 m (sidewalk 80, road 140, built terrain 130: rail-corridor cuts and terrain over park paths, another cause, docs/sawtooth/README.md); ?sawtooth=old = 1,191 places / 34,417 m (sidewalk 523, road 530); --oldcheck: the old builder on I6 H6 F2 must still show >= 2 x the places (the detector sees it); the synthetic fixture (a 6 m 3 cm saw on an 8 % grade found, the smooth grade / a 12 cm step / 5 mm noise not) runs first",
  deps: ["viewer/surfaces.js", "viewer/roadBuild.js", "viewer/tileData.js", "viewer/heightmap.js", "tools/audit/census/sawtooth.mjs", "data/tiles/"],
  meta: {
    features: [{ key: "sawtooth", type: "old" }],
    text: [
      { file: "viewer/main.js", what: "passes ?sawtooth=old to the tile worker", test: (s) => /sawtooth: params\.get\("sawtooth"\) !== "old"/.test(s) },
      { file: "viewer/tileData.js", what: "solves the street height field's corners together unless ?sawtooth=old", test: (s) => /jointFit: entry\.sawtooth !== false/.test(s) },
      { file: "viewer/surfaces.js", what: "prepareSurfaces runs the joint corner fit", test: (s) => /if \(opts\.jointFit && street\.size\) jointFit\(/.test(s) },
    ],
  },
};
