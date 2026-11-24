---
status: provisional
added: 2026-11-23
check: `deckprofile` (tools/audit/deckProfileCheck.mjs, sections W and L)
---
**Rule.** An OSM road deck (a band deck, no measured plan) is as wide as the street the road engine draws on it, plus
its parapet: its lanes' widths, or, for a road with no lane widths, its road type's own stack
(vendor/roads/roadCrossSection.js ROAD_TYPES), never wider than the old 6 m half. A deck never stands out past its street
with its parapets in the air. ?deckwidth=old: every lane-less deck 12 m wide as before.

**Measured widths first (claude/chenaie, 2026-11-24).** Where the bridge is measured, the measurement wins over the
drawn width, and the drawn width is only the fallback. `tools/bridges/deckWidths.mjs` writes data/overrides.json
`bridgeWidths` for every band bridge way. `deck` is the outer width of the UrbIS road-bridge outline (data/rail/rail.json
bridges, ROB) the way runs along, taken as the median across the line. An outline whose middle lies more than 0.5 m off
the line is not this band's deck. `carr` is the carriageway kerb to kerb from the street model's M / D kerbs, on the
bridge road or, where it has none, within 12 m of its ends (the measured approaches). Where the two contradict each
other, neither is written. The tile worker (viewer/roadBuild.js applyRoadOverrides, viewer/street/model.js stackOf) then
gives the bridge road a lane stack of those widths: its carriage lanes scaled to `carr`, one sidewalk out to the inside
of the parapets. The road engine draws the street on the deck at the measured width, and the deck follows that stack.
A measurement only narrows a deck, never widens it past its drawn width. A one-way stack is left as drawn. Re-run the
tool when the tiles, the street model or rail.json change: the check measures again and fails on a stale entry. A band
deck's parapet style is data too (data/overrides.json `bridgeLooks`, parapet `concrete` (the default) or `brick`: red
brick under a blue-stone coping, same outline and colliders). With a style the deck is drawn in named material slots,
not vertex colours. ?bridgelook=old: vertex colours and concrete, as before.

**Why.** Owner 2026-11-23: "the street that goes up from Le Pigeon Noir toward the Kauwberg has a bridge at its end,
where the train passes under the road". Avenue de la Chênaie crosses line 26 on a narrow cobbled bridge (~5 m between
red-brick parapets with a stone coping, UrbIS bridge 899). OSM gives the way no lanes, so the road engine draws it as an
alley (7.6 m with its edge strips) but the deck builder took a flat 6 m half: a 12 m slab with concrete parapets 2.2 m
out past the street on each side. Height and wire clearance were right (measured profile, 6.8 m over the rails, the
contact wire 5.3 m).

claude/places2 narrowed it to the alley's drawn 8.2 m, but the alley type is still a guess. The bridge stretch has no
UrbIS street surface of its own: the surfaces stop at the abutments, so no measured kerb reached it. UrbIS has measured
the bridge itself (road bridge 899, 5.03 m outside the parapets; the DSM cross-sections give ~5.3 m drop to drop), and
the street model has measured the approaches at 3.3-3.5 m kerb to kerb. Now the deck is 5.04 m wide with a 3.32 m
carriageway and 0.56 m margins inside red-brick parapets. Of the 13 band bridge ways, 7 are measured: Tilleuls (D9/E9) is
11.05 m instead of 19 m, and Merlo is 9.25 m instead of 12 m.
