# Collider audit (branch `claude/collisions`, 2026-11-17)

Rule 25 (provisional) in docs/QUALITY_RULES.md. Earlier rounds: docs/collisions/README.md (round 1, browser
collision test), docs/COLLISIONS.md (round 2, debug/drawnAudit.js).

## How collision works (short)
- **Player car / motorbike** (viewer/drive/): per tile one collider set (viewer/drive/colliders.js, 48 m cells).
  Tile worker (tileData.js `buildDriveData`): building blocks traced from the buildings' walls at car height
  (0.30-1.30 m over the drive surface, `buildingBlocks`), raised kerb islands / medians, rail platforms, OSM deck
  parapets and rail fences as `wall` rings with top / base, tree trunks (circles). Main thread (driveMode.js
  `tileDrive`): lamps + bollards, then `featureColliders` from the features group's instanced stand-ins: parked cars,
  furniture / stops / street kit / street life / fuel / garden walls, pillars, closed gates (`furniture`, base / top)
  and hedges (`hedge`: soft). Landmarks, hero bridges, tunnels, public art and the Lycee Francais front collide by
  their LOD0 (heroColliders.js). Kerb islands are ridden up, hedges slow, height-banded pieces pass over / under
  (`heightClear`), a step > 0.5 m is a wall (carEnv.js). Plants and ivy have no collider (drawnAudit "missing").
- **Walker / third person**: the capsule in one city world (character/cityHook.js). **Falcon**: roofs, landmark
  proxies, tree crowns.

## The audit (offline)
`node --import ./tools/road_audit/register.mjs tools/audit/colliderAudit.mjs --all [--set colFeet=false]
[--gardennew] [--out F]` (~6 min, 4 processes); `COLDUMP=x,z[,half]` with `--child T` prints an ASCII map of drawn vs
collider round a spot. Per tile the worker's own build in node + lamps, bollards, parked cars, garden stand-ins as
the main thread makes them. Truth for buildings = the FINAL drawn walls mesh (`walls` + `walls.kit`). Categories:
`missing` / `invisible` / `offset` (drawn wall vs building collider near paved surface), `lane` (a hard collider
>= 0.3 m into the carriageway where a traffic path runs, half width 0.9 m), `tram` (1.3 m), `gate` (the police
station's south gate mouth). Gate row `colliders`: 4 tiles (F1 E4 B6 D4), ~13 s; `?colfeet=old` fails it.

## Fix 1 (kept): building colliders from the sunk walls (`?colfeet=old`, tile worker)
Cause: the colliders were traced from the UrbIS solids BEFORE `sinkFeet` (groundFit.js) moves the walls' feet down
onto the drawn ground (up to 2.8 m on slopes). A solid floating over a slope had no wall in the car band where its
drawn wall stands: drawn, driven through. Fix: viewer/tileData.js runs the ground fit + wall feet before the drive
colliders (the drawn tile is byte-identical: tools/boot3/profile.mjs --hash, only `drive` changes). Browser, D4
(-1382, -337), a 34 m apartment block: old, the car drove 13.7 m / 11.2 m INTO the block (camera inside its floors);
new, it stops at the wall (z -332.7 / -330.1, wall -335.6).

## Fix 2 (withdrawn to opt-in): garden pieces by their whole footprint (`?gardenlane=new`)
Offline: garden walls / pillars / car gates were kept off the carriageway by their ends + middle (a pillar by its
centre); 62 pieces stood in traffic lanes. The browser turn showed those "lanes" are mostly paved footpaths / courts
the street data calls roadway: Carre Cassimans (F1) is a 1.5 m cobbled alley, its garden wall is real, and the strict
test removed it and left a lone gate standing. The fix belongs to the lane / carriageway data (below), not to the
gardens; the stricter test stays available behind `?gardenlane=new` (2,374 more pieces dropped city-wide).

## Results (120 tiles)
Raw: docs/collisions3/audit_before.json (`--set colFeet=false`), audit_after.json. Table in the merge message.

## Places checked in the browser (what is really there; collider right / wrong)
| place | what is there | verdict |
|---|---|---|
| Avenue Albert F1 (-162, -1636) | the interior of a city block (back yards, roofs): the traffic lane runs through it | colliders right; the lane (OSM band, no measured surface there) is wrong |
| Carre Cassimans F1 (-476, -1550) | a 1.5-3 m cobbled pedestrian alley between houses, garden strip and wall | colliders right; the alley must not be a driven lane |
| Kauwberg G6 (230, 793) | a cobbled footpath beside a half-timbered house; the junction connector clips the house | colliders right; the connector / lane is wrong |
| Ch. de Saint-Job E6 (-524, 926) | no measured surface; the OSM band's lane runs 0.3 m inside a building | collider right; lane geometry (offline profile, not driven) |
| B5 Ch. de Ruisbroek (-2402, 33) | the Stalle tram depot: depot tracks (refs 1-9, Z) run into the depot hall | colliders right (the hall is drawn); depot tracks are not a tram route |
| Kasteelstraat E10 (-760, 2780) | two OSM road decks meet at a junction; their concrete parapets are DRAWN across the junction | drawn AND collider wrong: deck parapets on joined edges (bridgeDecks.js); the car stops at a drawn wall in the junction. FIXED claude/deckrail (docs/DECKRAIL.md, `?deckrail=old`) |
| Avenue Laterale / Carsoel deck H6 (881, 521) | a railing + concrete upstand DRAWN across the tram road at the deck's east edge, the rails pass under it | drawn AND collider wrong: the plan deck's railing rule measures the drop against the bare DTM 0.5 m out, not the drawn street that continues (bridgeDecks.js planDeckMesh / planParapetRings). FIXED claude/deckrail (docs/DECKRAIL.md) |
| Rue du Bourdon D9 (-1201, 2228) | the line's fence ring under the Bourdon road deck; the deck road's lane is ~5 m over it | audit artefact: the offline audit has no OSM deck heights (main thread); not an in-game hit |
| D4 (-1382, -337) | 34 m block on a slope | WRONG, fixed (fix 1) |
| D8 Rue de Calevoet, E4 Victor Allard, D6 Venelle du Boson, K8, F9 | building collider vs drawn wall | about half fixed by fix 1 (these 6 tiles: missing 509 -> 239 m2, invisible 342 -> 110, offset 1016 -> 462); the rest (D6): a collider region left OPEN (a gap in the raw walls at car height lets the flood fill reach in) where the drawn walls are closed; cause not certain (not wall repair: wallFix=false changes nothing) |
| police station gates (E4) | south vehicle gate and north gate | both driven out onto Rue Rouge: south 0 blocking hits (then stopped by the bank across the street), north 2 grazing frames on the gate post |
| lane bollards (76), trees (30 + 10 on tram), lamps on tram (6) | not driven one by one | left |

drawnAudit (F1, B6, G6): ghost 0 on all three; "missing" = plants (box balls, laurels, roses...) and ivy stems only
(+1 open garden gate, +1 street-life box F1): plants have no collider by design so far (owner question).
