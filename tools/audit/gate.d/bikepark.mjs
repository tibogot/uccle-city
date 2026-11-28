// gate row `bikepark` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bikepark",
  script: "tools/bike/parkTest.mjs",
  args: ["--quiet"],
  guards: "the BMX park in the bike lab (viewer/bike/bikePark.js, docs/BIKE.md 'The BMX park', rule bike-park-rideable): a scripted rider clears every feature on the lab's own ground / colliders / edge layer - the three wooden kickers onto their landings at their speeds, the dirt doubles line at pump speed (4 airs, no bail), the whoops, a lap of the pump track and of the berm loop (leaning past the flat limit), a vert air on the quarter pipe that comes back in turned 180, the mini half-pipe back and forth, the spine transfer, the funbox and its rail, the stair set and its handrail grind, the long rail, the ledge, the wall ride, the drop-in tower; every spot level and clear (claude/kid)",
};
