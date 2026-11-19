# Two-wheeler feel round (2026-11-19, branch claude/moto, rule 40)

Owner playtest 2026-11-18: *"I tried the motorbike, it's barely usable, the guy always falls. The motorbike should be able
to go fast, go on steep places and anywhere, and it shouldn't be so easy to fall."* The scooter and the Villo share the
code (viewer/moto/motoPhysics.js `stepMoto`); each keeps its character (the scooter slower, the Villo a pedal bike pushed
up the steep streets), none of them falls easily now. `?moto=old` (a features.js row) = the handling before this round.

## 1. Why the rider fell (tools/moto/feelTest.mjs, the old tuning)

The test rides scripted routes headless with the real physics and the real collision env (carEnv.js) and logs every
crash with its trigger. Riders: **keys** (steer / gas / brake only 0 or 1, the lean tapped at 10 Hz, as the owner
plays), **analog**, and **late** (keys, 30 % faster, braking only once in the bend: the owner's way).

| trigger | falls on rides that should have none (old) | what it was |
|---|---|---|
| lean | 15 | over the grip at lean = a low-side 0.35 s later. A key is all or nothing: full lean + full brake at ANY speed, or full lean + the gas under ~72 km/h (the motorbike's pull eats the grip), asked more than the tyres had. Flat slalom / brake-in-a-lean / gas-out-of-a-lean at 50-90 km/h, cobbles, grass, Av. De Fré, Ch. de Saint-Job, Kauwberg |
| step | 12 | the car's OLD step rule (anything 0.5 m over the bike's centre = a wall) on a 30 % street at speed, a kicker, a bank, stairs: a "wall" hit above 8.5 m/s = a crash (and the stairs never climbed) |
| tree | 2 | a trunk on the line hit off-centre |
| car (first city runs, parked cars on the line) | most of the first run's 114 failures | ANY impact over 8.5 m/s INTO anything was a crash: a glancing touch of a parked car at 35 deg and 60 km/h already has ~9 m/s into it |
| landing | (none: there was no air) | the bike was glued to the ground: off a ramp it rode down the face, a 12 m cliff was ridden down as a slope (no crash: the real-crash case failed) |

Totals, old tuning, the final table (365 rides: 167 synthetic + 198 city): **29 falls** on rides that should have none
(lean 15, step 12, tree 2), 26 rides failing, and 3 of 8 real-crash cases NOT crashing (the cliff).

## 2. What changed (the `feel` block on each handling set)

| | before | now |
|---|---|---|
| grip at lean | the lean followed the key to 46 deg whatever the brake / gas asked; over the grip 0.35 s = crash | the lean TARGET is capped to what the surface's grip holds, leaving room for the brake / gas asked (`longShare` 0.55: the bike stands up a little under hard braking, as a rider does); traction control and cornering ABS give the drive / brakes only what the lean leaves; a grip loss anyway (a tram rail 0.35 x grip, grass 0.75, a landing wobble) is a **slip**: the lean falls back to what the tyres hold (7 /s), the tail slides, the yaw drops, it recovers. Never a crash |
| high speed | the same 46 deg at 250 km/h | the lean cap 20 % lower from 108 to 216 km/h (calm, no weave on a lane change at 125 km/h) |
| steps | car rule: > 0.5 m over the centre = wall | the bike's own (carEnv `step`): a face rising more than 0.55 m (scooter 0.42, Villo 0.35) over 0.7 m, or 1.6 m over the bike, is a wall; kerbs, garden edges, stairs (57 %), banks ridden; kerb islands ridden up, hedges soft, thin posts slid round (the car's feel options) |
| air | none | a vertical state: the body follows the ground through a suspension (vertical speed low-passed, 0.08 s; 10 cm droop) and leaves it where the ground falls away faster than gravity (a ballistic ghost): ramps, banks, crests (12 % into 14 % at 80 km/h = 0.6 s of air), kerbs down; in the air no drive / brakes after a **coyote** window of 0.12 s, 30 % of the yaw, the lean free, the pitch drifting toward the flight path (gas noses up, the brake noses down) |
| landings | - | **three bands** from the impact speed into the ground, the nose / tail to it and the lean (motorbike: impact sketchy 6.5 / bail 13 m/s, nose 0.35 / 1.0 rad, tail 0.55 / 1.25, lean 0.7 / 1.3): clean (a compression), sketchy (0.5-1 s wobble: grip x 0.85, a 3 Hz weave, up to 12 % speed lost: the rider saves it), bail (a crash). A 2.5 m drop = sketchy, a 12 m cliff = bail |
| impacts | any > 8.5 m/s into anything = crash | a crash only HEAD-ON (|cos| > 0.6) above `crashSpeed` (motorbike 11 m/s = 40 km/h, scooter 10, Villo 7) into a wall / building / tree / lamp / car / furniture; a step / bank face under 0.9 m, a kerb island, a hedge and every glancing contact slide (carPhysics hitSlide) |
| respawn | 2.6 s | 1.6 s (Villo 1.5) |
| rider | | follows the physics: folds forward and sinks (sprung mass) on a landing's compression, rises off the seat in the air, weaves with a sketchy wobble, counters a slide (motoModel.js, both rigs) |

Unchanged (character): power and top speeds (motorbike 0-100 3.2 s, 266 km/h; scooter 90 km/h CVT; Villo 21 km/h,
pushes from 8.5 %), brakes, gears, wheelie / stoppie, the lean rate (gyroscope), the camera. The traction control
makes the gas in a lean softer (tools/moto/physicsTest2.mjs: "full lean at 30 km/h + 35 % gas" ends at 43 km/h, was 54).

## 3. After (the new default)

`node tools/moto/feelTest.mjs` (both tunings; `--single [--old]` one; `--nocity`, `--cityonly`, `--detail`, `--only x`):

| | old | new |
|---|---|---|
| falls on rides that should have none (365) | **29** (lean 15, step 12, tree 2) | **0** |
| real-crash cases that crash (8: head-on wall 60 km/h moto / scooter, parked car 50, Villo wall 30, 12 m cliff x 3) | 5 | 8 |
| motorbike 120 km/h | 124 km/h in the run, < 600 m | same |
| 57 % stairs bank (2 m) at 20 km/h | not climbed, 2 crashes | climbed |
| landings (synthetic) | - | clean 16, sketchy 12, bail 3 (the cliffs) |
| slips saved (rails, grass, wobbles) | - | 24 |

Synthetic routes: flat slalom / brake in a lean / gas out of a lean at 50-90 km/h, a U-turn at a crawl, a rear-brake
slide, top speed + lane changes at 120, climbs and descents of 15 / 30 / 45 % (zigzag, braking in lean), a crest,
15 cm kerbs up / down square and at 30 deg at 20 / 50 / 80 km/h, a 30 cm garden edge, tram rails (2 cm groove, 0.35 x
grip) at 15 / 30 / 45 deg leaning at 30 / 60, cobbles (12 mm setts) with slalom + brake, kickers 1.2 m at 40-80, a 2.5 m
bank hump leaning off it, a 2.5 m drop, a table-top, the stairs bank up / down, a grass meadow and a 20 % grass descent,
a wall scrape at 80, a slow head-on, a parked-car side-swipe; the real crashes; the scooter's top speed, the Villo
pushing on 12 %. City (the tile worker's build in node, as driveCheck.mjs: drive surface + worker colliders + lamps +
bollards): Av. De Fré (west, centre), Square De Fré, Rue Rouge, Rue du Doyenné, Ch. de Saint-Job, Kauwberg and its park
paths, Montagne de Saint-Job (16 %), Place de Saint-Job, Av. Winston Churchill (110 km/h), both ways, three riders,
three vehicles. The route is the OSM chain snapped onto the traffic lanes of its own tile, pushed 0.45 m clear of what
stands on it.

The gate row `motofeel` (tools/audit/mergeGate.mjs) runs the same and fails on any fall, a real crash not crashing, a
threshold (120 km/h within 600 m, 30 % climb >= 40 km/h, the 30 cm edge and the stairs climbed, scooter top 85-95,
the Villo pushing), NaN, allocation per step (V8 sampling heap profiler: < 2 KB per 18,000 steps; per-step garbage
would be >= 288 KB), the switch, or if `?moto=old` PASSES the table (it fails 26 rides).

## 4. Limits / follow-ups (honest)

- **Rails and cobbles in the city have no physical effect yet**: the drive surface has no rail grooves or setts and the
  physics has no rail data; the synthetic routes prove the slip recovers (`env.grip(x, z)` is the hook: a tram-rail
  grip from data/tramfit is a small follow-up). Grass / soil grip is wired (carEnv `surface`).
- **City rides leave the parked cars out**: the autopilot follows a line, it does not thread a street of cars parked
  at an angle; parked-car contact is tested on the synthetic side-swipe / head-on. With them in, the old tuning fell at
  nearly every glancing touch; the new one slides.
- **Blocked, not fallen** (info in the report): a collider standing on the lane line stops the autopilot. Worth a look
  on the browser turn: a LiDAR tree (urbis-chm, x -280.3, z -508.3, tile F3) on the westbound lane line of Avenue De Fré
  (driveCheck's census should say whether it is on the carriageway or a median), lamps / trees in the Montagne de
  Saint-Job living street's band, and one spot on the Kauwberg paths (82.9, 1075.7).
- No foot-down / mount animation; the slip has no tyre-scrub sound yet (motoAudio reads `slide`, so the screech plays).
- The air control is arcade (30 % yaw, pitch assist); no tricks.

## 5. Browser turn (to do, Chrome)

`?view=moto` and the same with `&moto=old` alternated, keyboard only:
1. Avenue De Fré up and down, 60-120 km/h, full lean + brake / gas in the bends: no fall, the bike stands up a little
   when braking hard in a lean, no weave.
2. Kerbs up and down, square and at an angle, 20-80 km/h; a sidewalk run; a garden edge.
3. Across the tram rails at an angle (Ch. d'Alsemberg / Av. Churchill).
4. The Kauwberg: the steep street, the park paths, the meadow slopes (grass grip), stairs-like banks.
5. A jump: off a bank / a ramp / a crest; watch the three bands (clean, a sketchy wobble the rider saves) and the rider
   folding on the landing, rising in the air; the camera keeps the bike.
6. 120+ km/h on Av. Winston Churchill with lane changes.
7. Real crashes still happen: head-on into a wall / car above ~40 km/h; respawn 1.6 s.
8. The scooter and the Villo on the same streets (the Villo pushed up the steep ones); console 0 errors; CPU per frame
   (driver.ms) still ~0.15 ms.
