// gate row `moverground` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "moverground",
  script: "tools/audit/census/moverGround.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--jobs","4","--max","traffic=0,parked=0,tram=0"],
  guards: "ONE ground for every mover (claude/ground, rule mover-ground, provisional, docs/MOVERGROUND.md): every 0.5 m of every traffic lane / junction connector, every parked-car slot's four wheels and every 1 m of every tram track city-wide, the mover's ground (viewer/drive/moverGround.js, the player car's) against the DRAWN street (the road parts' / OSM decks' up-facing triangles, the hero decks' notes) within 5 cm; ?movground=old (--old) fails (owner shots 111 / 112: traffic 20-40 cm into the Carsoel deck, Place de Saint-Job, Pasta Commedia)",
};
