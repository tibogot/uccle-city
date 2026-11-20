// gate row `streetprops` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "streetprops",
  script: "tools/audit/census/streetProps.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--jobs","4","--max","plateGap=0,plateNoPost=0,signConflict=0,postbox=0,villo=0,villoOffPaving=0,villoBent=0,villoCarOverlap=0,signFacing=8,inRoad=47,onTram=11,onRail=0,inHero=0"],
  guards: "street furniture where the city draws it, all tiles (census class D): every post plate on its post (baked together, tools/streetkit/snapProps.mjs), no C1 + F19 to the same traffic, signs facing their street, pieces in a driven lane / on a tram track (post boxes, Villo, signs, plate posts, furniture2, stop poles; poles on an OSM tram platform excepted) under ceilings; ?streetprops=old = --old (claude/streetprops, rule 30 provisional)",
};
