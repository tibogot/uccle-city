// gate row `deckjoins` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "deckjoins",
  script: "tools/audit/deckJoins.mjs",
  args: [],
  guards: "measured (plan) bridge decks meet the streets / ground on every edge: joined, skirted or railed, no street over the deck at a joint (docs/VIVIER.md)",
};
