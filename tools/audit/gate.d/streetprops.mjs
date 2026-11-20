// gate row `streetprops` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "streetprops",
  script: "tools/audit/census/streetProps.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--jobs","4","--register"],
  guards: "street furniture where the city draws it, all tiles (census class D): every post plate on its post (baked together, tools/streetkit/snapProps.mjs), no C1 + F19 to the same traffic, signs facing their street, no piece in a driven lane / on a tram track (post boxes, Villo, signs, plate posts, furniture2, stop poles; poles on an OSM tram platform excepted), none on a track bed / under a hero deck: every finding by its stable id in the gap register data/gaps.json (rule gap-register: a new one fails, a fixed one left in the register fails; no counts, claude/street1); ?streetprops=old = --old (claude/streetprops, rule 30 provisional)",
  deps: ["data/gaps.json"],
};
