// gate row `deckrails` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "deckrails",
  script: "tools/audit/deckRails.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "every OSM road deck city-wide (band + plan, the 21 tiles with a bridge road): no parapet / railing (nor its car wall) across a street, another deck, a lane / junction turn or a tram track that goes on at the deck's level (1 m and 2 m out, or a lane crossing it), every drawn railing part on a car wall, no edge over a > 0.8 m drop left unrailed that --old had railed (docs/deckrail/rails_old.json; ?deckrail=old: 45 runs / 87 m across fails) (claude/deckrail, rule 17, docs/DECKRAIL.md)",
};
