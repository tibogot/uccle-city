// gate row `railcorridor` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
// (claude/places2, rule deck-width-drawn) fenceGhost 58 -> 59: the Avenue de la Chênaie deck narrowed from 12 m to its
// street's 8.2 m moves its edge onto one more 0.5 m sample of the L26 fence under it (G7 (35.6, 1010.8)): the fence's car
// wall takes the deck's height at the deck's edge, the same class as the two 0.5 m ghosts already under this bridge
// (the fence walls under a deck should stop at its soffit: a rail-fence collider job, left in docs/TODO.md)
// (claude/chenaie) fenceGhost 59 -> 47: those 'ghosts' were the road decks' own parapet walls crossing over the fence
// line in plan (their base metres over the fence top: the car under the deck passes under them); the census no longer
// counts a wall standing wholly over the drawn fence (railCorridor.mjs). The rail fences' own walls already stop at the
// drawn fence top: nothing to cut at a soffit
export default {
  name: "railcorridor",
  script: "tools/audit/census/railCorridor.mjs",
  node: ["--import","./tools/road_audit/register.mjs","--import","./tools/heap/register.mjs"],
  args: ["--all","--quiet","--worst","0","--max","bedSink=5,openReach=0,fenceGap=72,postFloat=7,fenceStep=0,fenceGhost=47"],
  guards: "census class T, rule 39, the 32 rail tiles (docs/RAIL_T.md): track metres where the car sinks in the ballast <= 5 (51 before; left: the two road tunnels' lids), track bed reached by car from a street 0 m (8,108 before: a flood fill over the drive grid, car-wide, every collider), fence panels floating <= 72 m (185; +0.8 m at E10 after the roads + sidewalk merge) / posts floating <= 7 (57; both: the tunnel lids' stepped drawn earth), stepped bays 0 (1,173), fence walls over / under the drawn fence <= 47 m (12,002; 59 until claude/chenaie stopped counting deck parapets over the fence line); ?rail=old (--old) fails",
};
