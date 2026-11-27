// gate row `bikespot` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bikespot",
  script: "tools/bike/spotTest.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "bike lab 2, the BMX spot (viewer/bike/bikeSpot.js + bikeSpotMeshes.js, debug/bikeSpot.js; debug/bikeLab.html, ?lab=old the old lab): every mesh of the lab builds in node; every obstacle / furniture mesh closed (each edge shared by two faces: no hollow mesh); every piece on the ground or on its support (nothing floats > 2 cm); the solids' drawn tops = the ridden height (within the 12 mm bevels); the ground pieces never coplanar (far grid cut out under the fine grid, solid tops >= 1 cm over the ground, the fine border level); a scripted rider clears every obstacle: funbox + rail grind, quarter pipe up and back, ledge grind, manual pad, stair block + handrail grind, both wooden kickers over their gaps, a pump-track lap, the table jump, the whoops, the hill, the drift pad; every spot level and clear (claude/bikelab2)",
};
