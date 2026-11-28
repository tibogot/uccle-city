// gate row `garageev` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "garageev",
  script: "tools/audit/garageEvidenceCheck.mjs",
  args: ["--quiet", "--max", "N=3900"],
  guards: "(claude/facades5, rule garage-needs-drive) every garage door the facade paints (tools/gardens/faces.mjs garageAt) stands on a building with a car way in front (data/bldclass/<T>.json drive: an UrbIS Topo CR42L driveway line, an UrbIS ramp, an OSM service road within 35 m of a free footprint edge, nearer that solid than any other; tools/bldclass/build_evidence.py): E 0; garage doors <= 3,900 city-wide (3,793; ?garageev=old: 6,621 = every bel-etage + 45 % of the villas by a coin, 2,828 without evidence: fails); >= 9,000 solids carry the evidence; fixtures Av. Arnold Delvaux 36 keeps its door (a real double garage, Street View 2026-11-28), Rue de l'Equateur 13 none",
  timeout: 600,
  deps: ["data/bldclass/", "viewer/buildingTypes.js", "viewer/tileData.js", "tools/bldclass/build_evidence.py", "tools/gardens/faces.mjs", "viewer/interior/facadeWindows.js", "viewer/facadeGeom.js", "data/tiles/"],
  meta: {
    features: [{ key: "garageev", type: "old" }],
    text: [{ file: "viewer/main.js", what: "the tile entry carries the garageev switch", test: (s) => /garageEv: params\.get\("garageev"\) !== "old"/.test(s) }],
  },
};
