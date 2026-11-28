---
status: provisional
added: 2026-11-23
check: `deckprofile` (tools/audit/deckProfileCheck.mjs, part O) + `drivecheck`
---
**Rule.** A node check of one tile sees what the city has there when that tile is loaded: the OSM decks a NEIGHBOUR
draws over it (the tile holding a deck's middle draws it, viewer/tileData.js ownDeck) are in the tile's node build
(`neighbourDecks`, keepNet only: never posted to the page) and the offline drive walk stands on them as the car does on
world.decks. A "missing deck" found by a one-tile check is first checked against the neighbours' decks.

**Why.** drivecheck place 158 and docs/RAIL_T.md T8 said Avenue des Tilleuls had "no deck and no road" over the L26/5
chord at E9 (-962, 2175). The deck was there: D9 draws it (its middle is 1.5 m west of the E9 border) and the city's
world.decks holds it; the car drives over at 82.7 m. driveCheck built E9 alone with only E9's own decks, so the car's
body was walked on the terrain 12 m down in the cutting and hit the rail fence there (2 "drive surface" places, + 1 at
the chord's other crossing by the border).
