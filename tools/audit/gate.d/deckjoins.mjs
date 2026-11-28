// gate row `deckjoins` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "deckjoins",
  script: "tools/audit/deckJoins.mjs",
  args: [],
  guards: "measured (plan) bridge decks meet the streets / ground on every edge: joined, skirted or railed, no street over the deck at a joint (docs/VIVIER.md); H: no measured street hanging > 0.6 m over the ground within 6 m of a plan deck (claude/footbridge, rule deck-covers-street: the Carsoel deck's bank sidewalks, 40 m2 with ?footbridge=old / --old)",
};
