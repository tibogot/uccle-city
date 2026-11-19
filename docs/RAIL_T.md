# Class T: the rail corridor (branch `claude/rail`, 2026-11-19)

Owner playtests 2026-11-18 / 19 (docs/TODO.md CLASS T, ROUND 3, ROUND 3b): at Verrewinkel the car sinks into the
ballast and a bench + a bin stand on the rails; the Stalle railway bridge: totally blocked on it and on top of it (wall
boxes along the deck / tracks in the G view); an invisible collider under the Rue de Stalle bridge; the rail fences look
blocky, panels stepping and misaligned on the cutting's slopes. Rule 39 (provisional) in docs/QUALITY_RULES.md.
Everything new is the default; `?rail=old` (viewer/features.js "rail corridor: as before") is the city as it was.

Where: Verrewinkel = the hero road bridge `bridge-verrewinkel` (F7, -269, 1308; the cutting -283, 1317). The Stalle
railway bridge = the hero viaduct `bridge-ruestalle` (UrbIS RAB 686, L124 over Rue de Stalle, -1489, 276: tile D5, its
west end in C5; Rue du Roetaert meets Rue de Stalle 45 m west of it). There is no other rail bridge in x -1000..-1200,
z 300..500: the line runs at x ~ -1400..-1480 there.

## 1. Causes

| # | what the owner saw | cause | fix (default) |
|---|---|---|---|
| T1 | the car sinks into the ballast under the Verrewinkel bridge | `railDriveSurface` (viewer/rail/railData.js) raises the drive grid to the rail top along every track on the ground, but skipped every cell inside `bridgeRings()`, which holds EVERY hero bridge's footprint, the road bridges' too. Under a road bridge the cutting's floor IS the track bed: the drive grid stayed at the carved terrain, 0.6 m under the rails (rails through the wheels) | `railBridgeRings()`: only the RAIL bridges' footprints (a track on a structure) are left out; under a deck the bed goes into the drive grid's LOW layer when a street is drawn > 1.5 m over it |
| T2 | should cars reach the track bed at all? (and how they did) | the line's fences (`railFences`) broke wherever ANY road centre line came within max(3, lanes) + 2 m of a fence post: the roads passing over the line (Verrewinkel), under it (Rue de Stalle under the viaduct) and every street running beside it. Through those gaps the car drove down the Verrewinkel bank, and up the Stalle embankment beside Rue de Stalle onto the tracks and the viaduct, where the viaduct's own masonry (drawn, its band measured from the embankment) walled it in ("blocked on top of it"). Also: the fence ended at every hero footprint (a gap to the abutments), between a flyover's track and the line under it (no level test), and along OSM "bridge" ways that are short spans on the embankment | Decision with the data: real cuttings and embankments are fenced (Infrabel), level crossings are open. `railFences2`: the fence breaks only at a LEVEL crossing (`railCrossings`, the classification of tools/audit/bridgeAudit.mjs: the road's ground 12-30 m either side vs the rail top: 3 level crossings in the built city), a platform, where the track stands on a structure (a rail bridge footprint AND the drawn ground > 2.5 m under the rail), a covered box, a second track at the same level, or a street's carriageway it would stand in (not a road crossing over / under the line) |
| T3 | Stalle: "totally blocked on it and on top of it", wall boxes along the deck / tracks | the car was on the track bed (T2). On a rail viaduct there is no road: the car must not get there. The viaduct's colliders themselves are its drawn masonry | the rule: a rail bridge is walled (never a car's deck), a road bridge is drivable (its deck layers, as before); with T2 no street reaches the bed (census `openReach` 0) |
| T4 | an invisible collider under the Rue de Stalle bridge | **found in the browser turn**: a catenary mast of L124 stands ON the viaduct's deck (y 48.98, `rail-masts`, x -1492.1, z 279.5: railTileData's "no mast in a hero bridge" loop gives up after 8 tries on a 68 m deck and places it anyway; a real viaduct has masts, so it stays). `featureColliders` (viewer/drive/driveMode.js) turned every pole (masts, tram poles, signals, stop poles, signs, plate posts) into a CIRCLE at its foot's x / z, and circles have no height: the mast was an invisible post in the westbound lane of Rue de Stalle 17 m under it. Browser A/B: `?rail=old` the westbound drive stops dead at (-1490.5, 277.7) under the bridge (G view: a lone pink post in the lane); new: it drives through both ways. Second cause on the way: `heroColliders.js` built a hero's blockers as soon as ONE tile under it was in and kept them, while main.js hides the bridge until its HOME tile (D5) loads; browser log `?rail=old` from C5: "4.5 s hidden, colliders ON; 7.0 s shown" | a pole is a square post of its DRAWN height (base / top from the instance: heightClear passes a car under or over it; `?rail=old` circles); `HERO_SHOWN`: a hero's set leaves the driver while its root is hidden / detached and the same set comes back when it shows (browser log new: "18.0 s hidden, colliders OFF ... 23.0 s shown, colliders ON") |
| T5 | a bench and a bin on the rails | OSM benches n10574619052 / 053 are on the 2022 footbridge of the Verrewinkel bridge (layer 1). The furniture builder seated them, and a generated bin beside them, on the DTM = the cutting's floor, 1.7 m / 0.05 m from the track centre. The hero model already draws those two benches on its deck (tools/blender/roadBridge.py `BENCHES`). The load-time snap kept props off lanes and tram tracks but knew no track bed, and lifted points onto OSM decks only | `railBed()` (railData.js): a track bed = within 3.6 m of a track on the ground at the rail's level, not on a road deck; `offLane` treats it like a tram track (moved off). Inside a hero ROAD bridge's footprint the furniture is dropped (its model draws the deck's furniture); signs / stop poles there go up onto its deck (main.js deckDoc + the hero decks) |
| T6 | rail fences blocky, panels step / misalign on slopes | `fenceMesh` drew a vertical strip with a vertex every 2 m of track whose top followed the ground at each vertex, while the shader draws a post every 2.5 m: the rails kinked mid-panel and stepped with every bump of the 1 m grid; the bays never lined up with the posts | `fenceBays` / `fenceMesh2`: posts every ~2.5 m along the fence line (the run's bays equal), each post seated on the drawn ground, each bay ONE straight panel (rails parallel to the slope between its two posts, the same post height for both bays at a post), the foot following the ground 0.1 m into it, the mesh from 5 cm over the ground |
| T7 | (found) fence colliders | one car wall per fence run, from -10 km to the run's HIGHEST post + 1.8 m: over a bore, under a deck, on a climbing run, a wall far over / under the drawn fence (rule 25) | `fenceWalls`: one wall per bay (per point pair on a bay steeper than 0.4 m), from its drawn foot to its drawn top |
| T8 | (found, open) E9 Avenue des Tilleuls (-962, 2175) | OSM way r185310974_0 is bridge=yes from (-1060, 2091) to (-943, 2189): over L26 (drawn deck) AND over the L26/5 chord, where the city draws neither a deck nor the road (the drive surface is the terrain at the rail's level). The old fence broke there (any road within 5-9 m); closed now, the drive check walks the OSM centre line into the fence: +1 place (drivecheck ceiling 157 -> 158, documented in the gate row) | not this class: the deck over the chord (bridgeDecks / bridgeAudit: the crossing is not in bridgeAudit's list) is the next bridges job; the crossing classifier now takes the road AS BUILT first (tileData.js roadGround) and the sides 4-12 m |

## 2. The rule (39, provisional)

See docs/QUALITY_RULES.md. In short: the corridor is drawn and driven as one place; the bed is in the drive surface,
under road bridges too; the fence closes the line except at level crossings, platforms, rail structures, covered boxes,
a second track, a street's carriageway; per-bay straight panels, posts seated, walls = drawn panels; no prop on a bed;
a hero's colliders exist exactly while it is drawn.

## 3. The checks

- `railt` (tools/audit/railTCheck.mjs, ~2 s, unit): a pole collides over its drawn height only (a mast 17 m up passes a car under it), bed under a road bridge, straight bays / seated posts / walls =
  panels on a bumpy synthetic slope, fence open at a level crossing and closed under an overbridge and beside a street,
  props off a bed (kept on a deck, dropped in a hero road bridge), hero colliders out while hidden and back. `--old`:
  7 of 8 FAIL.
- `railcorridor` (tools/audit/census/railCorridor.mjs --all, the 32 rail tiles, ~2.5 min): the census below, ceilings
  at the after-counts. `--old` fails every row.
- `streetprops` + `onRail=0,inHero=0` (tools/audit/census/streetProps.mjs: every drawn prop on a track bed / inside a
  hero road bridge under its deck). `--railold`: inHero 3 (the Verrewinkel benches + bin) FAILS.

## 4. Census (city-wide, the 32 rail tiles)

| check | `--old` (?rail=old) | after |
|---|---|---|
| bedSink: track metres where the drive surface at the rail's level is > 0.25 m under the rail top | 51 | **5** (over the Brasserie and Kleindal road tunnels: the drive surface there is the tunnels' own lid) |
| openReach: track-bed metres a car reaches from a drawn street (flood fill over the drive grid, car-wide, every collider incl. the hero models) | 8,108 | **0** |
| fenceGap: fence metres whose panel floats > 0.15 m over the ground | 185 | **72** (D9 / E9 rough cutting crests between 1 m points; D9 the Brasserie tunnel lid) |
| postFloat: posts with their foot over the ground | 57 | **7** (the Brasserie tunnel lid) |
| fenceStep: bays whose top rail is > 3 cm off the line between its posts, or a step at a post | 1,173 | **0** |
| fenceGhost: fence-wall metres > 0.5 m over the drawn top or > 2 m under the drawn foot over a car surface | 12,002 | **58** (steep bank runs at the line's ends) |
| streetprops onRail / inHero | 0 / 3 | **0 / 0** |
| fence | 16.8 km, 6,779 posts | 17.9 km, 7,548 posts (gaps closed) |

The invisible-collider census ("a collider with no drawn twin"): building colliders vs drawn walls stay gated by
`colliders` (rule 25); fence walls by `fenceGhost` above (12,002 -> 58 m); hero blockers are their LOD0 at the layer
they were measured on (drivecheck), the remaining case (built while the model is hidden) is fixed by T4 and unit-tested
by `railt`; the kits' stand-ins (furniture, stops, street kit, street life, fuel, gardens) and the lamps / trees / posts
are checked against what the city draws only in the browser (`window.viewer.auditColliders()`, viewer/drive/
colliderAudit.js; debug/drawnAudit.js): browser turn below.

## 5. Files

viewer/rail/railData.js (railBridgeRings, railDriveSurface old/new, railBed, railCrossings, railFences2, fenceBays,
fenceMesh2, fenceWalls), viewer/tileData.js (the fences / walls / drive surface, entry.railT), viewer/main.js (RAIL_T,
railBedP, the furniture / stops / signs snap + hero deck lift), viewer/streets/carriageway.js (offLane `rail`,
docOffLanes `drop`), viewer/heroColliders.js (HERO_SHOWN), viewer/drive/driveMode.js (pole posts with height), viewer/features.js (row `rail`), tools/audit/railTCheck.mjs,
tools/audit/census/railCorridor.mjs, tools/audit/census/streetProps.mjs (onRail / inHero, --railold),
tools/audit/mergeGate.mjs (rows railt, railcorridor, streetprops +onRail / inHero, browser row RAIL T).
**Worker code changed** (railData.js, carriageway.js, tileData.js): rebuild viewer/tileWorker.bundle.js in the MAIN repo
after the merge (rule 12); for the browser turn in the worktree run `node tools/build_worker.mjs` and revert it after.

## 6. Browser turn (2026-11-19, own Chrome tab, worktree served on :8851, test bundle rebuilt then reverted)

| check | `?rail=old` | default |
|---|---|---|
| car on the bed under the Verrewinkel deck (state.y, rail top 70.59) | 70.08 (0.5 m in the ballast) | 70.59 (on the rails) |
| furniture-bench / bin instances within 8 m of (-272, 1311) | 2 benches + 1 bin at y 70.3 (on the tracks) | none (the hero's own two benches on the footbridge) |
| fence by the Verrewinkel cutting (same view) | the fence ends ~12 m short of the bridge (the gap), kinked panels | runs on to the abutment, straight panels parallel to the slope, posts seated |
| Rue de Stalle westbound under the viaduct (scripted drive, inner lane) | STUCK at (-1490.5, 277.7) under the deck: the mast's post | passes (128 / 130 m); eastbound passes in both |
| ruestalle colliders while the bridge is hidden (arriving from C5) | ON for 2.5 s with nothing drawn | OFF until shown |

G view: the "no visible object" counter 0 in both spots; 55-61 fps, GPU 4-5.6 ms (quick mode). Not done here:
`window.viewer.auditColliders()` (not exposed in this build), a fence shimmer A/B while moving (the fence material is
unchanged: its alpha-to-coverage box filter).

## 7. Browser checks for the next turn

- Verrewinkel (`?view=drive&at=-283,1317`, G on): no way down the banks to the bed; put the car on the bed from a
  level crossing or the debug teleport: it rides ON the rails under the bridge (no sink); no bench / bin on the
  tracks, the two benches on the footbridge (the hero's own); the fences along the cutting's slopes at 3 / 10 / 30 m
  while moving: straight panels, rails parallel to the slope, seated posts, no step, no shimmer (alpha-to-coverage
  mesh as before). A/B `&rail=old`.
- Stalle viaduct (`&at=-1489,276`): drive Rue de Stalle under it both ways and along both sidewalks: nothing invisible
  stops the car (G: only the piers); arrive from C5 (Stalle, `&at=-1700,300`) while D5 streams in: no collider before
  the bridge is drawn; the embankments beside Rue de Stalle: fenced, no way onto the tracks; A/B `&rail=old`.
- `window.viewer.auditColliders()` on C5 / D5 / F7: invisible 0 near the corridor.
- Perf: the fence walls are one per bay now (~7.5 k city-wide, ~230 per rail tile, 0.12 m rings in the 48 m cells);
  the fence mesh +~10 % vertices; the hero poll's visibility pass walks each built root's parents every 2 s: check
  stutter / drive frame times unchanged (debug/falconStutter.js, the drive HUD).
