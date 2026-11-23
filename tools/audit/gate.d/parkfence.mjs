// gate row `parkfence` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "parkfence",
  script: "tools/audit/parkFenceCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the park fences (rule park-fence, claude/parkfence, docs/PARKFENCE.md): data/parkfence/parkfence.json fresh from OSM + the Street View obs files; per park (Wolvendael, Sauvagère) the line covers the OSM boundary but the entrances and listed gaps (building / lane carriageway metres under ceilings); no panel, plinth, pier, post or closed leaf on a public carriageway, in a building or across an OSM path; every open entrance has its OSM path; on the tiles as built, every bare panel's foot 0 floating > 0.15 m and 0 buried > 0.10 m, plinths inside their skirt, piers and leaves on the ground; a collider box for every drawn piece, none across an open entrance; <= 18 instanced meshes for both parks, the worst view's and each piece's triangles under ceilings; round 2: the far card's coverage at 30 / 60 / 120 m = the modelled mesh's (+-30 %) and thickening at grazing angles, 0 tree trunks within 0.3 m of a panel, no tram pole in an open entrance's approach and no trunk in its opening. (claude/places2, rule papen-grounds) the Papenkasteel's grounds from its obs ring: one closed street gate with white-render piers, the mesh on the Kinsendael bank, >= 40 m of >= 2 m brick wall, the Rue Papenkasteel beech hedge (gardenRestyle lines, >= 1.9 m, open at the gate), set places2 (?places2=old: none); obs-listed gaps (reason obs) count as closed",
  deps: ["viewer/parkFence.js", "viewer/parkFenceLayout.js", "viewer/streets/tramPoles.js", "viewer/thinBars.js", "tools/parkfence/build.mjs", "data/parkfence/", "models/parkfence/", "data/overrides.json", "viewer/gardens/gardenClear.js"],
  meta: {
    features: [{ key: "parkfence", type: "on" }, { key: "places2", type: "old" }],
    clean: ["viewer/parkFence.js", "viewer/parkFenceLayout.js"],
    text: [
      { file: "viewer/main.js", what: "builds each tile's share of the park fences on its drawn ground", test: (s) => /parkFence\.tile\(entry\.name, gardenGround\)/.test(s) },
      { file: "viewer/main.js", what: "starts the park fences' meshes with the hero compiler", test: (s) => /parkFence\.start\(\{ scene, updaters, world, compiler: heroCompiler/.test(s) },
      { file: "viewer/main.js", what: "adds the park fences' collider roots to the hero colliders", test: (s) => /parkFence\.rootNames\(\)/.test(s) },
      { file: "viewer/main.js", what: "keeps garden pieces and plants off the fence line", test: (s) => /pfClear\?\.\(x, z\)/.test(s) },
      { file: "viewer/main.js", what: "keeps tram poles out of park entrances", test: (s) => /keepOut: PARKFENCE \? await parkFence\.keepOutTest\(\)/.test(s) },
      { file: "viewer/main.js", what: "moves tree trunks out of park entrance openings", test: (s) => /parkFence\.treesClear\(feats\.trees\)/.test(s) },
      { file: "viewer/parkFence.js", what: "drops the places2 parks with ?places2=old", test: (s) => /p\.set === "places2"/.test(s) },
      { file: "viewer/gardens/gardenClear.js", what: "adds the gardenRestyle hedge lines (the Papenkasteel's hedge)", test: (s) => /v\?\.line\?\.length >= 2/.test(s) },
      { file: "viewer/main.js", what: "passes the places2 hedge restyles by their switch", test: (s) => /v\?\.set === "places2" \? params\.get\("places2"\) !== "old"/.test(s) },
      { file: "debug/quick.js", what: "flags a shot camera inside a building", test: (s) => /insideBuilding/.test(s) },
    ],
  },
};
