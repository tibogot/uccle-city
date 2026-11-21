// gate row `roads` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "roads",
  script: "tools/audit/census/roads.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--jobs","4","--quiet","--worst","0","--max","slalomM=5207,wobbleM=2800,headP999=5.0,inBuildingPlaces=17,offCarriagePlaces=192,snapCreated=0,plantsOn=0,plantsReach=2,bedsOn=0,bandOnPrivateM=550,gardenDroppedM=1853"],
  guards: "census class R (claude/roads, rule 38, docs/ROADS_R.md), all tiles: the traffic graph's lane pieces judged in their road's frame (deviation from a local quadratic over +-15 m: wobble >= 0.2 m, slalom = opposite >= 0.15 m within 25 m; ?roads=old 58.3 km / 34.9 km), heading change per metre on straight roads p99.9, traffic paths in a building footprint / off the drawn carriageway (places), plants and beds on the drawn carriageway, private land the carriageway test calls carriageway with nothing drawn (the OSM band past a measured street), the garden kit's metres main.js drops as on the carriageway; claude/street4 (rule street-lanes): the lanes / turns from the street model, ceilings at its count (before: slalom 7,908 / wobble 4,272 m, headP999 6.2, in a building 32 places (556 m), off the carriageway 332 places (10.6 km); --lanesold = ?streetlanes=old)",
};
