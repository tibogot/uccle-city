// gate row `streetslivers` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "streetslivers",
  script: "tools/audit/streetSliverCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet", "--max", "4685"],
  guards: "(claude/reality2, review of shot c5_garage_drive_new: the thin light line along a sidewalk's back edge) every built tile's worker build (gate tile cache): flat asphalt needle triangles (> 1.5 m long, < 6 cm wide) within 0.6 m of a sidewalk's back edge (surfaces.json raised edges, the garden join) <= 4,685, the count at claude/reality2: slivers of the land-cover polygons triangulated as given (viewer/surfaces.js), there before the garage drives (?garagedrive=old shows them; the drives are grounds, not in these meshes); worst E7 (-902.5, 1054.9) 10.5 m, E6 (-748, 920), D9 (-1101.4, 2064.7); the ceiling stops them growing until a surfaces job drops them",
  timeout: 900,
  deps: ["data/tiles/", "viewer/surfaces.js", "viewer/tileData.js", "viewer/tileWorker.js", "tools/gate/tileBuild.mjs"],
};
