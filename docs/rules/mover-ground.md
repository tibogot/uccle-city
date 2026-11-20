---
status: provisional
added: 2026-11-20
check: `moverground`: tools/audit/census/moverGround.mjs (every lane / connector point, parked slot wheel, tram track metre city-wide vs the drawn street, > 5 cm counted; `--old` = ?movground=old fails), `movergroundunit`: tools/audit/moverGroundTest.mjs
---
**Rule.** ONE ground for every mover: the traffic (driving, knocked, wrecks), the parked cars and two-wheelers, the trams and anything else that moves or stands on a street (the props' bodies) stand on the same function the player's car drives on (viewer/drive/moverGround.js moverGroundY: the road decks, then the drawn drive surface, the layer nearest the mover's own height where two stack), never on the terrain + a constant or another derived height; a new mover with no height yet is not placed where two layers stack. The lookup is a raster / deck test (no raycast), no allocation, cheap enough for every wheel of every traffic car every step. Checked against the DRAWN street (its triangles), not against the drive grid.

**Why.** owner playtest 2026-11-19 (shots 111 / 112): traffic cars 20-40 cm into the road on the Av. Carsoel deck (H6), on Place de Saint-Job by Botanea / Pizza Hut and in front of the Pasta Commedia: main.js movingGround = the decks, else worldRef.surface + CARVE, while the player's car drove the drawn drive surface; wherever the street is drawn off the carved terrain + 12 cm (the levelled carriageways and squares of rules 31 / 38, the street drawn on a deck over its fitted top) the traffic, tram 92 and the parked cars sank or floated (claude/ground)
