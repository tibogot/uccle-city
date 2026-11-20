---
number: 17
check: `bridges`: tools/audit/bridgeAudit.mjs, `deckjoins`: tools/audit/deckJoins.mjs, `deckrails`: tools/audit/deckRails.mjs (all decks: 0 across, `--old` 45 runs / 87 m)
---
**Rule.** Every road-rail crossing resolves to one built structure: a road over the line stands on a drawn deck covering >= 85 % of its UrbIS outline, railed over every drop, no slab in the cutting, wires under it; everything on a deck (junctions, traffic, trams, furniture, plants) stands on the deck, never on the terrain under it. A deck edge where the traffic goes on (a drawn street, another deck, a lane / junction turn / tram track crossing it, at the level traffic meets there) carries no parapet / railing and no car wall; drawn railing and car wall come from one decision.

**Why.** the OSM strip was taken for the Vivier d'Oie bridge (48 % of it), the terrain was assumed to carry road decks (bare earth): slabs in cuttings, cars falling 7 m, a 0.35 m step; band decks drew parapets on both sides whatever was beside them and plan decks judged "the drop" against the bare DTM: parapets across the Kasteelstraat junction (E10) and a railing across the Carsoel tram road (H6), the car stopped at them (claude/deckrail)
