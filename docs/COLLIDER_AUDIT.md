# Collider audit, offline (branch `claude/collisions`, 2026-11-17)

Rule 24 (provisional) in docs/QUALITY_RULES.md. Earlier rounds: docs/collisions/README.md (round 1, browser
collision test), docs/COLLISIONS.md (round 2, debug/drawnAudit.js).

## How collision works (short)
- **Player car / motorbike** (viewer/drive/): per tile one collider set (viewer/drive/colliders.js, 48 m cells).
  Tile worker (tileData.js `buildDriveData`): building blocks traced from the UrbIS solids' walls at car height
  (0.30-1.30 m over the drive surface, `buildingBlocks`), raised kerb islands / medians, rail platforms, OSM deck
  parapets and rail fences as `wall` rings with top / base, tree trunks (circles). Main thread (driveMode.js
  `tileDrive`): lamps + bollards (circles), then `featureColliders` from the features group's instanced stand-ins:
  parked cars (boxes, off while hidden), furniture / stops / street kit / street life / fuel / garden walls, pillars,
  closed gates (`furniture`, with base / top) and hedges (`hedge`: soft, the car is slowed). Landmarks, hero bridges,
  tunnels, public art and the Lycee Francais front collide by their LOD0 (heroColliders.js, `driver.addStatic`).
  Kerb islands are ridden up, hedges slow, walls / furniture with a height band pass over or under (`heightClear`).
  The ground is the two-layer drive grid (`driveGround`); steps > 0.5 m are walls (carEnv.js).
- **Walker / third person**: the capsule controller in one city collision world (character/cityHook.js): road BVH,
  footprints, the same stand-ins, hero BVHs.
- **Falcon**: roof surface grid + church / landmark proxies + tree crowns (falconFlight/), no street furniture.

## The audit
`node --import ./tools/road_audit/register.mjs tools/audit/colliderAudit.mjs --all [--old] [--out F]` (~6 min,
4 processes). Per tile the worker's own build in node (`buildTileData`, the city's entry), + lamps, bollards, parked
cars and the garden stand-ins as the main thread makes them. Truth for buildings = the FINAL drawn walls mesh
(`walls` + the facade kit's `walls.kit`), traced by the same raster as the colliders. Categories: `missing` (drawn
wall at car height near paved surface, no collider within 0.3 m), `invisible`, `offset` (0.3-1.5 m off), `lane`
(a hard collider reaching >= 0.3 m into the carriageway where a traffic path runs, the car's half width 0.9 m),
`tram` (tram half width 1.3 m), `gate` (the police station's south gate mouth). Info only: parked cars by lanes
(trafpark's), hedges, paths off the carriageway (traffic geometry), solids beside a narrow lane, the police yard ring.
Gate row `colliders`: 3 tiles (F1 E4 B6), ~15 s, `--old` fails it (27 garden pieces in lanes).

## Before / after (120 tiles)
| category | before (`?gardenlane=old`) | after |
|---|---|---|
| lane (hard collider in a driven lane) | 284 | 222 |
| ... of which garden walls / pillars / car gates | 62 | **0** |
| tram (on a tram track) | 38 | 34 (garden walls 7 -> 3) |
| gate (police south gate) | 0 | 0 |
| missing building (m2) | 116 (863) | 116 (863) |
| invisible building + islands (m2) | 198 (1243) | 198 (1243) |
| offset building (m2) | 373 (4208) | 373 (4208) |
| garden pieces dropped off the road | 3,689 | 6,063 |

Raw: docs/collisions3/audit_before.json, audit_after.json (per tile counts + every item with coordinates).

## Fix: garden pieces by their whole footprint (`?gardenlane=old`)
Cause: viewer/gardens clearRoads tested a segment at its two ends and middle and a pillar at its centre against the
carriageway (0.3 m margin); a wall bending into the road between those points, or a pillar / wall face just inside
the margin, stayed drawn and solid in the lane. Now (viewer/gardens/gardenClear.js, three-free, also used by the
audit) every 0.2 m along the axis and both faces of the 0.30 m stand-in, the pillar's corners and side middles, the
closed car gate's leaf. Visible change: 2,374 more pieces leave the road edge (a face > 0.3 m into roadway / tram
road / parking) -> the browser tour must look at street fronts with gardens.

## Left for the browser turn (uncertain, not changed)
- lane buildings 97: UrbIS footprints reaching >= 0.3 m into the measured roadway where a lane runs (Avenue Albert F1
  (-170, -1636): one long row; Carre Cassimans F1 (-476, -1550); Kauwberg G6 (219, 807); Ch. de Saint-Job E6
  (-524, 926)): street surface vs building data, or the lane too close to the kerb.
- lane bollards 76 (UrbIS bollards inside the roadway: likely real modal filters the traffic graph drives through).
- lane trees 30, tram trees 10 (Av. Churchill H2 tram median), lamps on tram tracks 6.
- lane / tram `wall` 23: rail fences or deck parapet rings across Kasteelstraat E10 (-760, 2780) and Avenue
  Laterale / Carsoel deck H6 (881, 521); Rue du Bourdon D9 (-1201, 2228).
- tram building 11: B5 Chaussee de Ruisbroek (-2402, 33): the tram line through buildings (the Stalle depot?).
- tram garden walls 3: B5 Rue de Stalle (-2185, 380): gardens do not know a tram track off the carriageway.
- building missing / invisible / offset: biggest D4 (-1382, -337), D8 Rue de Calevoet (-1294, 1753), E4 Rue Victor
  Allard (-922, -446), D6 Venelle du Boson (-1415, 659), K8 Ch. de Waterloo (2118, 1765). Hypothesis: the
  colliders are traced from the UrbIS solids BEFORE `sinkFeet` and the facade rebuild, so they differ from the drawn
  walls; candidate next fix: `buildingBlocks` over the final walls mesh in the worker (needs the bundle rebuilt in main).
- police yard ring: 5 building cells, 2 trees (-506, -343: the tree in the north passage), 28 hedge pieces.
- trunk radius vs the drawn trunks, hero / kit colliders: not offline.
