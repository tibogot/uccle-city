---
status: provisional
added: 2026-11-23
check: `deckprofile` (tools/audit/deckProfileCheck.mjs)
---
**Rule.** An OSM road deck's top follows the bridge's MEASURED profile, not a guess between its ends: every OSM bridge
way is either measured (data/overrides.json bridgeProfiles: the UrbIS DSM along its centre line, the carriageway's
median every 2 m, outliers off the running median dropped; tools/bridges/deckProfiles.py) or listed with the reason the
DSM gives no clean deck surface (the straight line is kept). The drawn top stays within 0.15 m of the measured line over
the span, blends over 8 m at each end into the street it meets (no step at the joint), never dips under the ground on its
centre line, and a measured profile whose ends no longer match its way is stale and fails.

**Why.** The decks were the straight line between the bare-earth DTM a few metres past each end. A long bridge over two
lines rises in a curve: Avenue des Tilleuls (D9 / E9, 164 m over L26 and the L26/5 chord) was drawn up to 0.95 m under
its real top in the middle (81.16 m over the chord, DSM 82.12), so railData.js pulled the contact wire down to 3.6 m
over the chord's rails to pass under the soffit (owner playtest: "wire clearance too low under Av. des Tilleuls"); the
DTM's hump between the two spans also stood 0.35 m over the straight deck: a bump for the car.
