---
status: provisional
added: 2026-11-23
check: `deckprofile` (tools/audit/deckProfileCheck.mjs, section W)
---
**Rule.** An OSM road deck (a band deck, no measured plan) is as wide as the street the road engine draws on it, plus
its parapet: its lanes' widths, or, for a road with no lane widths, its road type's own stack
(vendor/roads/roadCrossSection.js ROAD_TYPES), never wider than the old 6 m half. A deck never stands out past its street
with its parapets in the air. ?deckwidth=old: every lane-less deck 12 m wide as before.

**Why.** Owner 2026-11-23: "the street that goes up from Le Pigeon Noir toward the Kauwberg has a bridge at its end,
where the train passes under the road". Avenue de la Chênaie crosses line 26 on a narrow cobbled bridge (~5 m between
red-brick parapets with a stone coping, UrbIS bridge 899). OSM gives the way no lanes, so the road engine draws it as an
alley (7.6 m with its edge strips) but the deck builder took a flat 6 m half: a 12 m slab with concrete parapets 2.2 m
out past the street on each side. Height and wire clearance were right (measured profile, 6.8 m over the rails, the
contact wire 5.3 m).
