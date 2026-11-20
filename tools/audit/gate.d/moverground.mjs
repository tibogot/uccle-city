// gate row `moverground` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "moverground",
  script: "tools/audit/census/moverGround.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--jobs","4","--max","traffic=6199,parked=139,tram=1423"],
  guards: "ONE ground for every mover (claude/ground, rule mover-ground, provisional, docs/MOVERGROUND.md): every 0.5 m of every traffic lane / junction connector, every parked-car slot's four wheels and every 1 m of every tram track city-wide, the mover's ground (viewer/drive/moverGround.js, the player car's) against the DRAWN street (the road parts' / OSM decks' up-facing triangles, the hero decks' notes) within 5 cm: ceilings = the 2026-11-20 after-count (traffic 6,199 of 1,393,501 points, mostly the 1 m grid at kerbs / camber, 5-20 cm; parked 139 of 11,596; tram 1,423 of 35,767: the track profile off the decks), ?movground=old (--old) fails: 87,257 / 5,982 / 1,480 (owner shots 111 / 112: traffic 20-40 cm into the Carsoel deck, Place de Saint-Job, Pasta Commedia)",
};
