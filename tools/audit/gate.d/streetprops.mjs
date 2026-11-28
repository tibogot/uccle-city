// gate row `streetprops` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "streetprops",
  script: "tools/audit/census/streetProps.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--jobs","4","--register"],
  guards: "street furniture where the city draws it, all tiles (census class D): every post plate on its post (baked together, tools/streetkit/snapProps.mjs), no C1 + F19 to the same traffic, signs facing their street, no piece in a driven lane / on a tram track (post boxes, Villo, signs, plate posts, furniture2, stop poles; poles on an OSM tram platform excepted), none on a track bed / under a hero deck: every finding by its stable id in the gap register data/gaps.json (rule gap-register: a new one fails, a fixed one left in the register fails; no counts, claude/street1); ?streetprops=old = --old (claude/streetprops, rule 30 provisional); claude/defects1 (rule 27 round 3): props in a lane 41 -> 2 (the F4 Allée Charles Viane bench + bin, lane-data): the platform poles follow the DRAWN platforms (`--platold` = ?platpole=old), the offLane far pass to 16 m (`--farold` = ?propreach=old); claude/defects3 (rule 30 round 4): the sense of every sign (signBack: no back shown to the traffic it is for; `--signold` = ?signside=old), the fuel stations' kit and the underground glass chutes out of the lanes",
  deps: ["data/gaps.json"],
};
