# The traffic mix (branch claude/trafmix, 2026-11-19)

Owner playtest 2026-11-19: *"while driving I don't see much police patrol, why? Also we need ambulances and other
things."* Rule 45 (docs/QUALITY_RULES.md), gate row `trafmix` (tools/audit/trafmixGate.mjs). `?trafmix=old` = the mix
as before (a features.js row); `?weekday=1|0` forces a weekday / weekend (default: today).

## 1. Why there were (almost) no patrols

There were **none** in the traffic. The moving traffic's type list is `TYPE_NAMES = TYPE_MIX` (viewer/traffic/
trafficFleet.js), the parked fleet's street mix (viewer/carFleet.js):
`hatch_s 0.20, hatch_c 0.22, estate 0.16, saloon 0.13, suv 0.13, van_c 0.09, van_p 0.035, taxi 0.015` - and
carFleet.js drops every other model of cars2.glb on load (`if (!TYPE_MIX.some(...)) continue; // the police estate is
the yard / game's, not the street mix`). So:
- the police estate (cars2 `police`, built for the yard and the game) never reached the traffic: **0 patrols**;
- the only police cars in the city were the 5 standing in the Rue Rouge yard (viewer/policeCars.js) and the player's
  own car in the police game; the dark-blue "unmarked" estate of the game is not in the traffic either;
- one fixed weight per type at every hour and place (no per-type cap, no time of day: the hour only scales the
  DENSITY, `hourFactor`), no ambulance, no bus, no fire engine, no service vehicle at all;
- the yield-to-emergency logic (`sim.emerg`) only ever had one source: the police game's car.

## 2. The mix (viewer/traffic/trafMix.js)

Shares of the vehicles spawned (= on the road), weekday; `shares(h, weekday)`, `placeBoost(type, x, z, rank)`.

| class | 0-6 h | 7-19 h | 19-23 h | where / notes | basis |
|---|---|---|---|---|---|
| cars | ~91 % | ~85 % | ~89 % | hatch_s 21 / hatch_c 23 / estate 15 / saloon 11 / **SUV 30 %** of the cars | Belgian fleet after a decade of 40-55 % SUV sales (FEBIAC / Statbel order of magnitude, an estimate: no fetched table) |
| vans | 4 % | **12 %** | 7 % (19-21) / 4 % | 60 % compact, 40 % panel; weekend 6 % / 3 % | Brussels counts: light commercial vehicles ~10-15 % of the daytime flow (estimate) |
| delivery rounds | - | 8-18.5 h | - | 55 % of the panel vans, 25 % of the compact vans: red post-van / white / grey parcel vans (plain colours), stop 20-45 s in the lane with the hazards where they can pull 0.7 m right, nobody right behind them; the followers pass them like a parked car where the other side is free | |
| taxis | 4 % | 1.2 % | 2.5 % | | ~1,300 Brussels taxis + ride hailing, evening / night heavy (estimate) |
| **police patrols** | 0.8 % | 0.5 % | 0.5 % | **x6 within 700 m of the station, Rue Rouge 17**; cruise at 0.9 x the limit | Uccle zone (Marlow): a handful of patrol cars on 23 km2, they leave and return to Rue Rouge |
| ambulances | 0.25 % | 0.25 % | 0.25 % | x2 on main roads (rank >= 2), x0.3 elsewhere; **40 % on a run** | ~20 runs a day in Uccle (112 order of magnitude) - shown more often than real so the player sees one every ~10 min of driving |
| fire engines | 0.06 % | 0.06 % | 0.06 % | only within 3 km of the fire station (PASI Chenaie, OSM way 225213592), 60 % on a run | very rare |
| bin lorries | - | 6:30-11 h (0.6 %), 13-15 h (0.2 %) | - | weekdays only, never on boulevards / alleys; crawl at 0.55 x the limit, stop every 20-50 m for 7-16 s with hazards | Bruxelles-Propreté collects in the morning |
| buses | | | | NOT from the shares: every line on its route at its headway (section 3) | OSM route relations |

Motorbikes / scooters keep their weights against the cars' (viewer/moto/cityTwoWheelers.js). The parked fleet is
unchanged (TYPE_MIX).

## 3. Buses (data/transit/trafmix.json, tools/trafmix/build_trafmix.py)

Data pipeline (reproducible; the viewer loads only the trimmed product, never the raw files):

    python tools/trafmix/fetch_osm.py      # Overpass -> data/raw/osm/bus_routes.json (~32 MB) + emergency_pois.json (raw, git-ignored)
    python tools/trafmix/build_trafmix.py  # -> data/transit/trafmix.json (0.7 MB: the lines' parts in the city, stops, places)

The fetch uses a generic user agent ("osm-data-fetch/1.0", no personal details) and tries three Overpass mirrors with a
back-off. viewer/traffic/trafMix.js fetches data/transit/trafmix.json only.

- **Lines**: OSM route relations (Overpass, `rel[type=route][route=bus]`, `out geom`, ODbL, raw in
  data/raw/osm/bus_routes.json) through the built tiles: **STIB 37, 38, 41, 43, 48, 50, 54, 60, 74, 75 + Noctis N10,
  N11, N12; De Lijn R36, R53, R54, R55** - 38 variants (one direction each), 407 stops on the right-hand kerb (58 on the
  wrong side of a line's direction dropped). The owner's "98" does not run here any more (not in the STIB GTFS lines of
  data/stops nor in OSM); the De Lijn lines are the 2025 R-lines.
- **Stops**: the OSM platform / stop node matched to the DRAWN STIB pole (data/stops, the STIB GTFS lines) within 35 m
  (270 of 407); De Lijn stops at their OSM node. The bus stops with its **front door at the pole** (4.7 m ahead of the
  axles' middle), pulled 0.55 m toward the kerb, **dwell 12-26 s (x1.3 at the peaks)**, then the left indicator for 3 s.
- **Headways** (no STIB timetable in the raw store: estimates by line class): trunk lines (37, 38, 41, 43, 60) every
  8 min at the peaks, 12 off-peak, 15-20 evening; others 12-30 min; De Lijn 15-60 min; none 0-5 h; Noctis Fri / Sat
  nights only every 30 min; weekend headways x1.5. The number of buses on a line's part inside the 470 m radius =
  that length / (4.5 m/s x headway) (Brussels bus commercial speed ~16 km/h).
- **Following the line**: at each junction a bus weights the exits by how close their end lies to its route ahead
  (`busWeight`: exp(-(d/4 m)^2), x0.02 against the route's direction); its progress along the route is tracked (every
  5 steps, every step within 90 m of a stop); 4 s more than 9 m off the line, or past its end in the city, it leaves the
  line and is removed out of sight. Gate: **99.9 % of bus time on the line**, door-to-pole along the line **median
  0.14 m, worst 0.30 m**.
- **Long body**: 12 m, wheelbase 5.95 m: the sim poses both axles on the lane, so the rear cuts in on a bend and the
  overhangs swing out as a real bus; the spawn needs 22 m free on its lane; the cull sphere / out-of-sight tests use its
  far end (no pop at the screen edge); its colliders sit on the body's centre (0.33 m behind the axles' middle). Wider
  than the lanes' design car (2.55 vs 1.85 m): beside a parked car within 5 cm it eases 0.4 m away from it for 1.5 s
  (the side that opens the gap); gate report: bus body into a parked box > 5 cm in 0.0-0.1 % of samples (was 1.9 %
  before the easing).
- **Bus lanes**: none in the data the lane graph is built from (UrbIS / OSM roads.json carry no `lanes:psv` /
  `busway`): the buses use the general lanes. To do with a worker change (the lane graph is built in the tile worker).

## 4. Emergency vehicles

- **On a run** (`ctl 4`): ambulances 40 %, fire engines 60 % of those spawned (none under `?still=1`, the tour):
  desired speed x1.3 (up to 50 km/h on a 30), **<= 7 m/s through junctions**, red lights / stop signs / priorities run
  (still never into a junction a conflicting car is in), the dipped beams on, the **beacons flashing** (kind 9 lenses in
  the car material: a blue double flash, left / right alternating, 1.6 Hz, strength `packLook.beacon` = 9; EMISSIVE
  ONLY, no light: rule 7).
- **The traffic yields** with the police game's own logic (trafficSim.js accel): every car within 95 m - ahead, same
  way: pulls right 0.8 m (as far as the parked cars allow) and stops within 45 m; oncoming: slows to 3.5 m/s, keeps
  right; crossing: holds at its line. The sources are now a list (`emI / emX / emZ / emH`, <= 8: the traffic's runs + the
  police game's `emerg`). Gate: an ambulance behind 8-13 cars: all of them slow to a crawl and pull right (-0.80 m).
- **Siren**: the police car's Belgian two-tone (viewer/policeCar/siren.js `Siren`) for the NEAREST run within 380 m of
  the camera, level 14 / (d + 8), Doppler from both velocities (`TrafficSiren`, cityTraffic.js); its AudioContext is the
  sound gate's (viewer/audio/soundGate.js): silent until the speaker button is on.
- A bus / fire engine / bin lorry / ambulance is not knocked by the player's car (carHit: a 4.5-20 t body is a wall
  that brakes for you); the patrol car is (a car). The trucks and the bus do not take the dent field (NO_DENT).

## 5. The models (tools/blender/heavies.py -> models/cars/heavy.glb, 2.6 MB)

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heavies.py -- models/cars
    ... -P tools/blender/carSheet.py -- models/cars/heavy.glb docs/trafmix/sheet [--lod 1|2] [--night]

cars2.py's definitions are run first (palette, mesh builder, wheels, the police estate, weighted normals, the Cycles AO
bake on **OptiX**, the GLB writer), so the new vehicles are the fleet's contract: COLOR_0 = named palette slots x baked
AO, `_KIND`, one material, authored LODs (Body / Wheel_* LOD0, *_L1, *_L2). Shell parts: boxes cut by planes at every
colour / glass edge (flat panels, flat normals), corners rounded by a 3-segment bevel (1 at LOD1, none at LOD2),
openings with real wall thickness (Solidify inward: reveals in rubber, the inside in the interior colour) and inset
glass, so the see-through glass shows a cab / saloon with seats and a dashboard; wheel arches as notches with a
4-face well (n-gons through the panel cuts: no T-junction); LOD1 / LOD2 merge the coplanar cuts back. Liveries are plain
colour schemes, no logo, no lettering.

| id | what | size L x W x H, WB | tris LOD0 / 1 / 2 (budget) | sheet |
|---|---|---|---|---|
| bus | 12 m low-floor city bus (Citaro / Urbino class), 3 double doors right, roof AC pod, amber destination display (lit at night), seats, grab poles; paint per instance: STIB silver-grey / De Lijn yellow | 12.0 x 2.55 x 3.07, 5.95 | 13,626 / 2,541 / 503 (14,000 / 2,600 / 600) | docs/trafmix/sheet_bus.jpg |
| ambulance | Belgian type C box ambulance on a van chassis: fluorescent yellow-green, two rows of green / yellow Battenburg, green top band, blue beacons (cab bar, 4 box corners, grille) | 6.94 x 2.20 x 3.02, 3.665 | 9,671 / 2,034 / 678 (11,000 / 2,200 / 700) | docs/trafmix/sheet_ambulance.jpg |
| fire | Brussels autopompe (18 t 4x2, crew cab): red, white band, roller-shutter lockers, roof ladder, red / yellow rear blocks, cab light bar + rear beacons | 8.30 x 2.50 x 3.28, 4.20 | 10,752 / 1,986 / 566 (12,000 / 2,200 / 650) | docs/trafmix/sheet_fire.jpg |
| bin | refuse lorry (26 t 6x2 rear loader, low-entry cab): white, orange band, orange / white rear blocks, hopper + lifter, amber beacons | 9.34 x 2.50 x 3.42, 4.575 (front to the tandem's middle) | 10,228 / 2,134 / 620 (11,000 / 2,200 / 650) | docs/trafmix/sheet_bin.jpg |
| police_t | cars2's police estate (white + blue / yellow Battenburg, POLICE) + a blue light bar on the roof | 4.70 x 1.85 x 1.58, 2.69 | 15,182 / 2,636 / 318 (16,000 / 2,800 / 400) | docs/trafmix/sheet_police_t.jpg |
| (delivery) | the panel / compact vans of cars2 (reused) in post-van red, white or grey | | | |

Close-ups (front, rear, side glass, wheel arch): docs/trafmix/close_*.jpg. Night (beacons + lamps lit): docs/trafmix/night_*.jpg; LOD1 / LOD2: docs/trafmix/lod1_*.jpg, lod2_*.jpg. The fleet maps
the authored LODs as cars2 (level 0 to 30 m, 1 to 130 m, 2 beyond). Mesh: tyres on the ground (|lowest| < 1.2 cm), the
body >= 0.10 m up, head / tail / beacon / glass kinds on every level: all in the gate.

### Polish round (coordinator review, 2026-11-19)
- **Wheel arches**: were square black notches. Now ROUNDED: the notch's rectangle minus a semicircle over the wheel
  (straight sides down) closed by one flat n-gon in the side plane through the notch outline's vertices (no
  T-junction), in the body / skirt colour (the bus's white skirt follows the arch), and a half-round lip swept round
  the arc (bus: black rubber; fire engine, bin lorry, ambulance: trim), in its own mesh (not thickened); the dark well
  stays behind. All vehicles (bus 2, fire engine 2, bin lorry 3 incl. the tandem, ambulance 2). 14 / 6 / 5 arc
  segments per level. The cabs' wall thickness (Solidify) is now uniform-offset off ("even offset" threw a vertex
  100 km out at the arch n-gon's concave corners).
- **Ambulance yellow**: was (0.80, 0.78, 0.02) on the clear-coated PAINT kind: pale / muddy (the coat's sky reflection
  and the 0.25 metalness wash it; through the grade + ACES it is hue 58, saturation 0.57 at value 0.89). Now a
  fluorescent yellow-green (0.42, 0.62, 0.0) as a FIXED colour (kind 0: matt, no coat): hue 66 / saturation 0.67 /
  value 0.83 at 1 x light, 70 / 0.92 / 0.66 in shade; the Battenburg green (0.0, 0.32, 0.06). ACES desaturates any
  bright yellow (at 1.8 x light every candidate falls to ~0.45 saturation): the hue shift toward yellow-green and the
  matt surface are the levers. The gate's "ambulance colours on screen" row checks it through the engine's midday
  grade (contrast 1.1, saturation 1.06 + vibrance) and three's ACESFilmic, as tlightsCheck does.

## 6. Cost

- **Draws**: the fleet stays instanced, one InstancedMesh per (type, level, plain / fade) shown only while it has a
  vehicle, as before: a new type adds draws only when one is in view (a bus in view: +1-2 draws, +1 its glass).
  No new material, no new pipeline variant (the beacon is a node of the existing traffic material; the materials are
  built once), no light.
- **Sim**: per car per step with the mix vs without, same tiles / seed / focus, interleaved, fastest of 20 rounds:
  **x0.99-1.05** (identical sims differ by up to ~4 % this way); the bus line tracking, the role pre-pass, the
  emergency source list and the wide-body check (one parkClear every 6 steps per wide vehicle) included.
- **Triangles**: the service vehicles are rare; a bus at 20 m is 12.9k (a car 8-11k), beyond 30 m 2.2k.
- **Memory**: heavy.glb 2.6 MB on the wire, ~1.2 MB of geometry for 5 x 3 levels; data/transit/trafmix.json 0.7 MB.

## 7. Files

New: tools/trafmix/fetch_osm.py, viewer/traffic/trafMix.js (the mix, the bus helpers, the siren), tools/blender/heavies.py, models/cars/heavy.glb,
tools/trafmix/build_trafmix.py, data/transit/trafmix.json, tools/audit/trafmixGate.mjs, debug/trafmix.js,
docs/trafmix/*.jpg, this file. Changed: viewer/traffic/trafficSim.js (roles, the emergency source list, bus lines and
stops, delivery / bin stops, wide bodies; delimited "TRAFMIX"), viewer/traffic/traffic.js (types + the mix + zc
boxes), viewer/traffic/trafficFleet.js (the service types, cull radius, no dent on trucks, 16 dent rows),
viewer/carFleet.js (heavy.glb through the LOD worker as traffic-only types), viewer/drive/carPacks.js (beacon kind 9,
dent rows 48), viewer/traffic/cityTraffic.js (the siren), viewer/drive/carHit.js (masses, trucks not knocked, zc),
viewer/nightLights/cityNight.js (the service vehicles' lamp places), viewer/features.js (trafmix, weekday),
tools/blender/carSheet.py (beacons lit in --night), tools/audit/mergeGate.mjs, docs/QUALITY_RULES.md (rule 45).
No worker code changed (no bundle rebuild).

## 8. Browser check (to do on a Chrome turn: not run in this job)

`?quick=1&with=traffic&weekday=1`, then `const M = await import("/debug/trafmix.js")`:
1. Ch. de Saint-Job (`&place=stjob-street`), Ch. d'Alsemberg (`&place=alsemberg`), Ch. de Waterloo (`&at=1700,815`) at
   `&hour=8`, `13`, `18`: `M.report()` (the mix: vans, SUVs, taxis, a patrol now and then, delivery vans stopping with
   hazards, bin lorries in the morning); screenshots.
2. A bus at a stop: `M.nearest("bus")` on Alsemberg (D6, lines 43 / 60 / R53-55): it stops with the door at the pole,
   pulls in, dwells, left indicator, pulls out; LOD0 -> 1 at 30 m with no pop; the interior through the glass.
3. An ambulance pass: `M.ambulance()` (a car 40-120 m ahead of the camera becomes an ambulance on a run): beacons
   flashing, the cars ahead pull right and stop, crossing cars wait; the siren with the speaker button on (Doppler).
4. A patrol near Rue Rouge: `&at=-514,-340&hour=13`, `M.report().byType.police_t`.
5. A / B with `?trafmix=old` (no patrol, no bus, one mix), `M.report()` stepMs and `__traffic.fleet.stats` draws / tris.
6. Night (`&hour=22`): the bus display and the beacons read in the bloom, no light added (rule 7).

## 9. Limits / next

- Headways and class shares are estimates by line class / order of magnitude (no STIB GTFS timetable, no fetched
  Statbel table in the raw store): replace with the STIB GTFS stop_times when it is in data/raw/gtfs.
- No bus lanes (no data in roads.json); buses wait in the general queue.
- Patrols drive like traffic (no stop-and-check, no parking at the station); an ambulance run has no destination (it
  drives the lanes at speed until it leaves the area): to tie to the hospitals (places in trafmix.json) later.
- The delivery vans stop in the lane (double parking) only where they can pull 0.7 m right; they never park in a slot.
- The siren is one voice (the nearest run); a second run nearby is silent.
