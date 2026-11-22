// gate row `parkfence` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "parkfence",
  script: "tools/audit/parkFenceCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the park fences (rule park-fence, claude/parkfence, docs/PARKFENCE.md): data/parkfence/parkfence.json fresh from OSM + the Street View obs files; per park (Wolvendael, Sauvagère) the line covers the OSM boundary but the entrances and listed gaps (building / lane carriageway metres under ceilings); no panel, plinth, pier, post or closed leaf on a public carriageway, in a building or across an OSM path; every open entrance has its OSM path; on the tiles as built, every bare panel's foot 0 floating > 0.15 m and 0 buried > 0.10 m, plinths inside their skirt, piers and leaves on the ground; a collider box for every drawn piece, none across an open entrance; <= 18 instanced meshes for both parks, the worst view's and each piece's triangles under ceilings",
  deps: ["viewer/parkFence.js", "viewer/parkFenceLayout.js", "tools/parkfence/build.mjs", "data/parkfence/", "models/parkfence/"],
  meta: {
    features: [{ key: "parkfence", type: "on" }],
    clean: ["viewer/parkFence.js", "viewer/parkFenceLayout.js"],
    text: [
      { file: "viewer/main.js", what: "builds each tile's share of the park fences on its drawn ground", test: (s) => /parkFence\.tile\(entry\.name, gardenGround\)/.test(s) },
      { file: "viewer/main.js", what: "starts the park fences' meshes with the hero compiler", test: (s) => /parkFence\.start\(\{ scene, updaters, world, compiler: heroCompiler/.test(s) },
      { file: "viewer/main.js", what: "adds the park fences' collider roots to the hero colliders", test: (s) => /parkFence\.rootNames\(\)/.test(s) },
      { file: "viewer/main.js", what: "keeps garden pieces and plants off the fence line", test: (s) => /pfClear\?\.\(x, z\)/.test(s) },
    ],
  },
};
