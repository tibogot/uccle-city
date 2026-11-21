// gate row `model` (docs/WORKFLOW.md): the street model v0 (rule street-model, docs/STREET_MODEL_PLAN.md job 2)
export default {
  name: "model",
  script: "tools/audit/streetModelCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--all", "--quiet"],
  guards: "the street model v0 (viewer/street/model.js), every tile built in its own process: the schema of every element (typed arrays, ids s:<way>:<nodeA>-<nodeB> / j:<node>, an owner tile, a confidence M / D / O / G / X on every station of every kerb, drive end, axis and lane boundary, every M kerb on a measured line, M elements naming their UrbIS sources); coverage (every data/roads/network.json road in exactly one segment, every OSM way in one, ids unique); seam identity (an element held by two or more tiles has byte-identical canonical bytes in each: the owner's element, never a neighbour's recomputation from clipped data); ownership (a segment in its midpoint's tile, a junction in its node's); the Ch. de Saint-Job fixture (E7 r71812634_1: kerbs M >= 80 %, centre line D >= 40 %) (claude/street2, rule street-model provisional)",
  deps: ["data/roads/network.json", "data/overrides.json"],
  meta: {
    features: [{ key: "streetmodel", type: "old" }],
    text: [
      { file: "viewer/main.js", what: "hands ?streetmodel to the tile worker", test: (s) => /streetModel:\s*params\.get\("streetmodel"\) !== "old"/.test(s) },
      { file: "viewer/tileData.js", what: "fetches the model's inputs and passes them to buildRoadData", test: (s) => /entry\.streetModel !== false/.test(s) && /buildRoadData\(\{ streetModel,/.test(s) },
    ],
    clean: ["viewer/street/"],
  },
};
