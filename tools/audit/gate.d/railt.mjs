// gate row `railt` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "railt",
  script: "tools/audit/railTCheck.mjs",
  node: ["--import","./tools/characters/threeHook.mjs","--import","./tools/road_audit/register.mjs","--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "CLASS T, rule 39 (claude/rail, docs/RAIL_T.md), unit: the track bed in the drive surface under a road bridge, fence bays straight post to post with seated posts and walls = the drawn panels, fences open at a level crossing only (closed under an overbridge and beside a street), no prop on a track bed (moved off; dropped inside a hero road bridge), hero colliders only while the hero is drawn, a pole collides over its drawn height only (the Stalle viaduct's mast in Rue de Stalle); --old (?rail=old) fails 7 of 8",
};
