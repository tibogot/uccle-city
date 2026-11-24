# Everything still to do

> Continuing in Cursor / another Claude session? Read **`HANDOFF.md`** first (setup, rules, how to run). Look + performance plan: **`docs/RENDER_PLAN.md`**.

One list of all open work, roughly in priority order. `HANDOFF.md` says how to run things;
`docs/PLAN.md` has the history and details of what is done. Rule of thumb for every item:
**look better without costing frame time** (instancing, shared materials, LOD, compressed assets).
Older sections (per-branch notes from 2026-11-04 .. 11-13, labs, master list) moved UNCHANGED to **docs/TODO_ARCHIVE.md**
on 2026-11-17; their open items are carried into NOW below. Every merge: docs/QUALITY_RULES.md + merge gate + city tour.

## OWNER PLAYTEST 2026-11-18 (car, live site) — TOP PRIORITY
Owner's point: don't fix these one by one; find the CLASS of each defect, fix it at the generator, and add a city-wide detector so it can't come back unseen.

**Census merged 2026-11-18 (docs/CENSUS.md):** A open meshes 1,524 tile buildings + 11/16 heroes (Saint-Pierre 53.5 m²); B balconies open 20,061 slabs; C ground: 4,052 tilted sidewalk patches, 1,462 road cross-fall bumps, 1,273 lumps, 3,038 holes (noisy), 675 spikes; D1 plates off post 237, D2 signs wrong 78, D3 furniture in road 389; E rails off the tram road 573 m; F markings off street 6.0 km; G z-fight 32,001 pairs. Drive check (claude/drivecheck): 274 blocked places. Jobs: streetprops (D), balcony (B) running; next: heroshell (A), sidewalk level-with-kerb (C), tramfit (E), markings (F), z-fight dedup (G).

**Leftovers from the fix jobs (2026-11-18/19):** poles inside some Villo rows + Churchill Villo row end at the kerb (dock base check); Av. Churchill traffic lanes / paint over the tram reservation (split the OSM road into two carriageways); 211 drivecheck places (153 lanes through blocks / alleys, 20 garden pieces, 34 bollards, 4 surface defects incl. E8 Bigarreaux cliff); unmeasured engine roads flat across a cross-slope (E6 Saint-Job 253, G6 Carsoel 126B, K10) and sunken lanes E10/D10; town hall LOD1/LOD2 z-fight (Blender re-export + AO); hero LOD2 holes (police, Papenkasteel, Wolvendael, Rosaire, observatory clusters, Russian church turret); bush flowers / seasons; 6 no-entry signs unplaced; hedge snow caps under the domed top.

**Step 1: defect census (detectors city-wide, counts per class, before any fix)**
- [ ] Car blocked by colliders near the Lycée Français / bridge on the Verrewinkel side (collider view: bridge parapet / wall colliders stand across the cobbled road; "like everywhere"). Class: colliders on drivable surface. Detector: drive every street centreline headless and list blocks. **claude/drivecheck (offline turn, docs/DRIVECHECK.md, rule 27 provisional, gate row drivecheck, ?heroground=old):** cause = the hero bridge's car band measured from the layer nearest the CAR (driveMode.ground, built once in a poll) and from the railway cutting under the deck's edge; fixed at heroColliders.js (the place's own layers, deck only on a deck). City-wide census 280 places (hero 9, Verrewinkel 6 = 136 m of lanes) -> 274 (hero 3: the E8 Bigarreaux drive-surface cliff, open); the other 271 (buildings / gardens / trees / bollards in lanes, mostly lane data) are the census for next jobs. Round 2: census by cause (tools/audit/driveCause.mjs) a lane/band data 153, b generator 83 -> 20, c measured bollards 34, d drive surface 4; fixed the LiDAR trunks on drawn carriageways with no measured surface (viewer/streets/roadTrees.js, ?roadtrees=old: 63 -> 0, 448 moved / 212 dropped city-wide; browser turn done: bridge passes both ways, collider view fixed, tree look kept (vi), tour 1 flag (intended)) and the Verrewinkel deck lanes (?decklanes=old); 274 -> 211. WORKER BUNDLE REBUILD needed. Next: a (routing / band data), b gardens 20, c bollards. 
- [ ] Buildings with missing walls (Saint-Pierre church: whole wall pieces missing). Class: open meshes. Detector: open-edge / hole scan of every building + landmark.
- [ ] Balconies / terraces open at the sides (apartment blocks, Alsemberg). Class: generator. Detector: balcony side check.
- [ ] Terrain: blocky shapes, saw-tooth slopes, a hole, sidewalk ground with saw edges + trees in the middle (unusable sidewalk). Class: terrain fit. Detector: slope / step / hole scan over every tile.
- [ ] Street-name plate floating away from its pole; signs in the wrong rotation. Detector: sign-to-pole distance + facing vs the street.
- [ ] Props in the carriageway: post box in the middle of the Chaussée d'Alsemberg, a Villo bike station on the tram tracks. Detector: furniture inside road polygons.
- [ ] Tram rails running into the sidewalk. Detector: rails vs sidewalk polygons.
- [x] Road white lines going "anyhow"; a traffic car driving on the sidewalk (Chaussée d'Alsemberg). Detector: markings outside the carriageway; traffic paths vs sidewalks. MERGED 2026-11-18 (360df82f, claude/markings, rule 33): lines off street 6,018 -> 472 m, traffic lanes follow the paint (p95 0.08 m), parking lanes >= 2 m, round-wheel bicycle glyphs; ?roadlines=old / ?bikemark=old. Left: the Saint-Pierre parked van -> car in the tour (unattributed).
- [ ] Rue du Repos (and others): weird sharp bumps in the road. Check against the real street (data vs DTM).
- [x] Z-fighting / shaking windows (Maison Dandoy right window, others). Detector: coplanar faces in building meshes. MERGED 2026-11-18 (8098a930, claude/zfight, rule 34): pairs 32,001 -> 4,825; kit packed codes decoded in the vertex stage (window shimmer 2.9 -> 0.3); ivy off shopfronts; ?zfight=old. Left: town hall LOD1 re-export + AO, hero LOD2s, pale ivy on Dandoy's side corner wall, Juliet railing bars (jitter branch).
- [ ] OWNER PLAYTEST 2026-11-18 ROUND 2 (carhit branch build; screenshots 97-103). Owner: find the CAUSE of each class, make a RULE + an automated CHECK, use the road-system sources; not one-by-one fixes.
  - CLASS R (road graph / traffic paths): cars slalom (paths not smooth); a white traffic car on Ch. de Waterloo leaves the road and drives THROUGH a house (a lane through a block: the 211 drivecheck places / traffic-lane-vs-building check); a white line on Av. du Prince de Ligne drawn diagonally across the lane near the right kerb (markings merged: a residual class); bush clumps standing on the Ch. de Waterloo carriageway; the player car can drive onto lawns in front of houses (Rue Papenkasteel: no kerb / lawn not a collider? decide what is drivable). Research the road sources (OSM lanes, UrbIS, slop-newyork road system, others) for smooth lane centre lines (clothoid / spline fit, curvature limits) + a slalom detector (heading change per metre on straight streets).
  - CLASS T: **claude/rail (offline turn done, docs/RAIL_T.md, rule 39 provisional, gate rows railt + railcorridor, streetprops onRail / inHero, ?rail=old):** bed under road bridges in the drive surface (sink 51 -> 5 m, tunnel lids), fences closed but at level crossings (bed reachable from a street 8,108 -> 0 m), straight per-bay panels (stepped bays 1,173 -> 0), fence walls = drawn panels (ghost 12,002 -> 58 m), Verrewinkel bench + bin dropped (the hero draws them), hero colliders only while the hero is drawn (the Stalle viaduct from C5); the INVISIBLE COLLIDER under the Rue de Stalle bridge = a catenary mast on the viaduct's deck as a heightless post in the street (poles now posts of their drawn height). Browser turn done (docs/RAIL_T.md 6). WORKER BUNDLE REBUILD needed.
  - CLASS T (rail corridor): at Verrewinkel the car sinks into the rail ballast (ground under the tracks vs drive ground); a bench and a bin stand ON the rails (street furniture / OSM points placed on the track bed: snap / reject on the rail corridor, like the Villo fix); should cars reach the track bed at all?
  - CLASS F (facades): some house fronts have issues (Rue Papenkasteel red house: a window skewed / sheared in its frame); a missing house between Petit Bateau and L'Atelier du Sourcil (Ch. de Waterloo: gap with lawn; check UrbIS solids vs Street View).
  - CLASS S (signs): some signs still face the wrong way (one-way sign shot 103); recheck the streetprops orientation rule on more sign types.
  - CLASS P (physics props): **claude/props (offline turn done, docs/PROPS.md, rule physics-props provisional, gate row props, ?props=old):** bins / cones / terrace tables + chairs / Villo bikes fly and tumble, parked motorbikes / scooters tip over and slide, sign posts (+ plates) and bollards bend then snap (lamps, trees, walls, Villo docks solid); 24 awake 3D bodies near the player, proxies by update ranges, traffic brakes for them, walker kicks the light ones, propHit event for the sound job. 7,287 props in the city (docs/props/inventory.md). Browser turn pending (docs/PROPS.md 7). Not in the data yet: roadworks barriers, sandwich boards, wheelie bins (the roadworks kit below).
  - [x] MOTORBIKE MERGED 2026-11-19 (b873989e, rule 40; trees off junction turns too). Left: the chase camera can sit inside a garden pillar (its wall test ignores garden pieces); rails / setts have no grip data yet (hook ready). OLD: nearly unusable: the rider falls all the time. It must go fast, climb steep places, ride almost anywhere, not fall easily (arcade-forgiving like the bike's landing bands; docs/MOTO.md + docs/bike/FEEL_RESEARCH.md).
  - REALITY CHECKS each round (owner): Google Maps / Street View, look only: colours, missing things. First class: FRONT GATES: most Uccle houses have a garden gate / front fence; we miss many. Census gates per house frontage vs a Street View sample of streets, cause, rule, gate row (gardenKit placement). **claude/gates (offline turn done, docs/GATES.md, rule house-front-garden-closed, provisional, gate row gates, ?gates=old):** census class G (tools/audit/census/gates.mjs) per house frontage: open by mistake 879 -> 302, door paths gated 50 % -> 86 %, driveways gated 38 % -> 47 %, closed gates across used ways 14 -> 0; review round: no garden piece in a lane on a measured roadway (tools/gardens/fitGardens.mjs, gate row gardenlanes, drivecheck 158 -> 140), gateNoSteps 0; causes a-k (street-wide open style, coplanar faces dropping each other, doors in driveways, run ends, side doors, hedge leaves, car gate coin, shop radius, OSM gate nodes unused). Browser turn pending: Street View of the 40-frontage sample, drives, A/B. WORKER BUNDLE REBUILD needed (tileData.js gatesOld).
  - ROUND 3 (owner 2026-11-19, live site, shots 104-107):
    - INVISIBLE COLLIDER under the Rue de Stalle bridge stops the car (shot 105 with G colliders). Rule 25 says every collider stands for something drawn: find the source, then run a city-wide "collider with no drawn twin" census.
    - Stalle railway bridge: totally blocked on it and on top of it (shot 107: wall boxes along the deck / tracks); goes with CLASS T.
    - The LUMO fuel price board (Rue de Stalle) stands on the road: the streetprops snap must cover the fuel-station POI signs too.
    - The Rue de Stalle sidewalk verge is still saw-tooth / bumpy (shot 104; live site, before claude/sidewalk merges). Re-check this spot after that merge, and add it to the tour.
    - Few police patrols seen while driving: check the traffic mix. Also add ambulances, fire engines, buses / De Lijn / STIB buses, delivery vans, bin lorries.
    - Place Danco Delhaize: the entrance runs through a passage in the building into a car park (Street View, look only). UNDERGROUND / INNER CAR PARKS would be the first below-ground places; pick a few real ones.
  - ROUND 3b (owner 2026-11-19, shots 108-110):
    - Rail fences look blocky / low-poly: mesh panels step and misalign on slopes (Verrewinkel cutting). They should follow the ground smoothly. Goes with CLASS T.
    - Floating garden pieces: a hedge + white pergola / gate up in the air on Ch. de Saint-Job near Clos Monique Rifflet (shot 109). Find why they are seated wrong; the gardenVoid census should catch it.
    - [x] MERGED 2026-11-19 (claude/dent, rule 41; left: police car + accident props not seen in the browser, dark paint shows the dent mostly by shape). Car damage leaves HOLLOW mesh: the crumple pushes faces inside out and you see through the body (rear corner, shots 109 / 110). Clamp the crumple so the shell stays closed, or render both sides. Add a check: the dented shell stays watertight from outside views.
    - Weird white lines near the Papenkasteel / Ch. de Saint-Job junction (shot 110: diagonal dashes, a cut zebra crossing). Re-check after claude/roads merges.
    - The white shop on Place de Saint-Job is placed right, but it stands on grass where the real place has a small car park (Street View). **claude/places1 (2026-11-23, not merged): White Night's lot drawn as an asphalt ground (data/overrides.json grounds white_night_lot, ?bricolot=old).**
  - PLACES (Street View look-only): Chaussée de Saint-Job night shop and Brico Job opposite it; Le Pigeon Noir (entrance on the wrong side, building colours wrong) and the children's garden / kindergarten in front of it; Papenkasteel castle: gates all round and very big fences. **claude/places1 (2026-11-23, not merged): the night shop is Agam nightshop, Ch. de Saint-Job 701 (white corner house, red NIGHT SHOP board) and Brico Sint-Job is n. 594 opposite (grey shed behind its car park): both extra POIs + curated fronts + looks, Brico's lot with painted bays, garden walls cleared (rule curated-place-placed, gate row curatedplaces).** **claude/places2 (2026-11-23, not merged): Le Pigeon Noir's front moved to Rue Geleytsbeek (its address; OSM point moved with addr:street), navy LE PIGEON NOIR awning, ochre-mustard render tone (rule curated-render-tone); the Chênaie garden opposite: the park kit's playground pieces in the city (data/overrides.json playgrounds, viewer/playgroundCity.js; no colliders yet); Papenkasteel: one closed street gate (white piers), 2.1 m beech hedge on Rue Papenkasteel, mesh bank + old brick wall on Rue Kinsendael (park-fence kit obs ring, rule papen-grounds); the Chênaie bridge over L26 narrowed to its street (12 m -> 8.2 m, rule deck-width-drawn; the real bridge ~5 m with brick parapets: needs measured lanes for the alley + a brick parapet look). Browser shots owed.**
- [x] MERGED 2026-11-19 (claude/sound, rule 42; clips in C:/Users/tibog/Downloads/uccle-sound-clips, outside git). Left: the engine tone (owner repo); flock calls re-pitched, not species-true; murmur robotic close up; bell pitches guessed. SOUND hookup (owner 2026-11-18, "I don't hear any sound"): DONE on claude/sound (2026-11-19, rule 42, docs/SOUND_CITY.md, gate row `citysound`), waiting for its browser turn: the engine on the live city (traffic tyres from cityTraffic, trams 92 + trains from their sound feeds, birds on the nearest trees + the sky flocks, wind / rain from the weather, the murmur on Place de Saint-Job / Parvis Saint-Pierre / shop clusters, Saint-Job + Saint-Pierre striking the hours, crash / glass / scrape on the car contact); ONE speaker button for every sound (N, ?motosound, the falcon tick, the police siren option and the dev panel toggle removed); still OFF by default; `?citysound=old` = the silent city. NOT the car engine sound: drive mode's `engineVoice` slot waits for the owner's other repo.
- [ ] LATER (owner 2026-11-18): full church interiors: Saint-Job (nave + the belfry chamber with the eyrie, the falcon can hop in from the ledge), then Saint-Pierre. Method: docs/INTERIOR.md + the Chapelle de Stalle interior (models/stalle/interior.glb, on by default). The kid's room on the same method.
- [x] Gate / fence / grille jitter: MERGED 2026-11-19 (claude/jitter, rule 35): thin bars hand over to coverage cards (depth where coverage >= 4 %); ?jitter=old. Left: the Lycée railing card writes no depth (likely vanishes while moving under TAAU: apply the 4 % depth cut), the gate at 3 m at 8 m/s slightly worse (card fade-in).
- [x] Car contact (owner 2026-11-18): MERGED 2026-11-19 (claude/carhit, rule 37): two-way push / spin / dents, knocked / wreck / rejoin, parked cars pushable; ?carpush=old. Left: no roll / pitch kick, 4 dent zones, traffic two-wheelers still one-way, the walker cannot push cars, owner tuning.
- [x] Traffic lights in Blender (owner 2026-11-18): MERGED 2026-11-19 (claude/tlights, rule 36): Brussels-style posts, heads face the approach, seated, never in a lane, lit hues kept through ACES + eye adaptation; ?tlights=old. Far LOD hand-overs (120 / 80 m) not seen in the browser yet.
- [ ] RESUME 2026-11-19 EVENING (the owner closed the project and Cursor; every branch below is committed, WIP where noted). Each worktree is at C:/Users/tibog/Downloads/uccle-<name> with data/raw + tools/worker/node_modules junctions. Order of Chrome turns when resuming:
  1. claude/ground (uccle-ground, 2a3f66b1 WIP; 4-tile test: traffic points off the drawn road 2,298 -> 124). Left:
     - parked-car kerb-side wheels float 5-10 cm (the 1 m grid blends the kerb);
     - the Carsoel deck height function is 13 cm above the drawn deck (bridgeDecks.js pavingTop; worker);
     - I6 (1129, 958): the drive grid is up to 1.4 m over the road;
     - the tram on the Carsoel deck: track profile +0.64 / -0.21 m;
     - the walker's walkY still differs;
     - the full census, the ceilings, the gate, the docs, the browser checks.
     ONE ground for every mover (traffic / trams sink into decks and reshaped roads: Carsoel deck, Place de Saint-Job, Pasta Commedia). Code WIP; census + gate after "heavy OK"; then Chrome.
  2. claude/props (uccle-props, b0dcfe48): browser turn 1 done (bins, signs, bollards, motos, Villo OK; 60 fps with 18 knocked). Left:
     - the café-terrace chairs that don't wake when the table is hit;
     - in the browser: lamp stop, night shadows, the walker (no post left), police cones, ?props=old;
     - the full gate.
  3. claude/gates (uccle-gates, d89145cd WIP): Street View notes for 40 frontages done (30/38 match; terraced garage driveways have NO gate, now 1 in 8). Left:
     - apply the two build fixes to the data (a full garden rebuild + fitGardens lanes ×3, steps, check);
     - census + ceilings (drivecheck 142 at cef1f714), the browser checks, the gate.
     - Next round: wrought-iron rows (Brugmann / Coghen / Molière), modern sliding anthracite gates, wooden fences (new kit pieces).
  4. claude/trafmix (uccle-trafmix, ec3e3509): done offline (no patrols in traffic was the cause; patrols, ambulances, fire, STIB / De Lijn buses on real routes, vans, bin lorries, taxis; polish: fluorescent ambulance, rounded arches). Left: the browser turn (docs/TRAFMIX.md §8).
  5. claude/engine (uccle-engine, f870ac76: only the plan, in its docs/ENGINE_SOUND.md; enginesound CLI at C:/Users/tibog/Downloads/tools-dl/enginesound/, a FLAC venv at tools-dl/pyaudio-venv). LIVE BUG to fix: citySound.js hookCitySound listener(): the facing-direction lines are inside a // comment, so the listener never turns with the camera. Engine sound by the Thunderline method (docs/THUNDERLINE_STUDY.md; our own enginesound renders; demo WAVs to C:/Users/tibog/Downloads/uccle-sound-clips/engine_*.wav). WIP.
  6. claude/tyremarks (uccle-marks): tyre marks (the owner's skid_mark01.png OK to use; NO DynamicDrawUsage; fade by age; wet variant). WIP.
  7. claude/kid (uccle-kid, 07754f3c): the bike browser turn, never run yet.
  - The STREET MODEL plan (one canonical street model per segment; checks on the DRAWN output at 0; a data-gap register; a street walker; the Ch. de Saint-Job / Rue Engeland diagonal line): the planning job's output goes to docs/STREET_MODEL_PLAN.md. Show it to the owner BEFORE building.
  - Owner decisions: skid mark + fire-pro smoke licences OK; the people murmur muted by default (?citypeople=1); hedges soft vs hard is still open.
- [ ] OLD RESUME (paused 2026-11-19, owner closing the laptop):
  - claude/roads MERGED 2026-11-19 (03356fe7, rule 38). Left: J5 (1670, 352) 8 m skew in a square; J6 (1730, 610-620) Waterloo lane on the engine strip 10 m off the measured street; a 0.2 m step where a tile-split zebra meets; 31 in-building places (bad OSM, junction corners); short unfitted pieces now paint no lines (3.1 km). OLD NOTE: browser turn mostly done (J6 off-carriageway 11.7 -> 1.5 %, slalom flips 36 -> 15; bushes gone; Papenkasteel fronts back). Left:
    - the full gate after the merge;
    - the tour vs a foundation baseline;
    - the Papenkasteel drive test (car stops at the hedges / walls);
    - the Waterloo slalom watch (1729, 607);
    - J6 (1730, 610-620), a lane still off its carriageway;
    - Av. du Prince de Ligne (1592, 360) still UNFIXED (junction funnel), the owner's complaint;
    - at merge, rebuild the worker bundle.
  - claude/sidewalk MERGED 2026-11-19 (51df6438, rule 31). Left: the floating hedge near Clos Monique Rifflet not reproduced (needs the owner's camera position); the shot-104 spot near Av. Adolphe Wansart to re-check on live; a dark bare earth face left of the H6 stone wall (683, 526); coursed stone a bit regular; quiet-machine wall ms after the steps. OLD NOTES:
    - 12 gates still without steps on the 4 test tiles (G3 Roberts Jones 55, H6 Perelman 1): trace them to 0;
    - bareBank rose 64 -> 76 round the flights;
    - full census + ceilings (gateNoSteps=0), full gate;
    - quiet-machine wall ms;
    - Chrome turn: H6, G3, a stone wall, retaining vs garden brick, the steps (Perelman 4's flight: 19 risers, 5.7 m deep, check it);
    - merge + rebuild the bundle.
  - claude/kid (bike rounds 1-4, 07754f3c): browser turn not started (D6 city spot, ledge, stairs, sound, weight, camera); then the owner tries the bike lab.
- [x] Rail corridor (CLASS T + Stalle invisible post + rail fences): MERGED 2026-11-19 (a4ad7b35, rule 39). Left: T8 Av. des Tilleuls E9 (-962, 2175): OSM bridge=yes over L26/5 but no deck nor road drawn (missing-deck job, drivecheck 158); outer-lane drive runs stuck at Rue de Stalle start points (unexplained); a catenary mast stands on the Stalle viaduct deck (real viaducts carry masts). **claude/places1: T8 was a CHECK artifact, not a missing deck: D9 draws the Tilleuls deck (middle 1.5 m west of E9), the city drives over it at 82.7 m; driveCheck now stands on the neighbours' decks (rule deck-owner-checks).**
- [ ] NEXT (owner 2026-11-19, shot 111): TRAFFIC CARS SINK INTO THE ROAD on the Carsoel deck, at Pasta Commedia and in front of the white shop on Place de Saint-Job.
  - Cause: the traffic (and tram 92) take their height from viewer/main.js movingGround (worldRef.surface + CARVE; deckY only for VIVIER). The player's car drives the drawn drive surface (surfaceLayers / hero decks / the levelled roads), so on hero road decks and where the sidewalk / roads jobs reshaped the street, the traffic sinks or floats.
  - Fix: ONE ground for every mover (player, traffic, knocked / parked cars, trams, props): the drawn drive surface, layered.
  - Census: every lane point vs the drawn road, |dy| > 5 cm counted, city-wide; gate at 0 (or a justified ceiling).
- [x] GATE PARSE (props job finding; DONE claude/speed1: the `meta` row bundles every viewer/ debug/ tools/ module with esbuild): a branch that did not boot (a comment swallowed an export) passed the gate; the gate must parse every viewer/ and tools/ file as an ES module.
- [x] Christmas firs (xmasfir3) MERGED 2026-11-20 (fast lane); the perf saving is not measurable on a busy machine.
- [ ] CLOSED 2026-11-20: claude/carshadow: no mode measurably reduced the rear shimmer (blur noise ±18 %, less sharp); the verdict is in that branch's docs/CARSHADOW.md; branch kept, worktree removed.
- [x] MERGED 2026-11-23/24 (claude/villa1, claude/villa2) a HERO VILLA / mansion around Av. du Prince d'Orange:
  - a real villa there (Street View, look only), modelled in Blender at the hero quality bar;
  - a big driveway gate that OPENS, which the player can drive through with the car into the grounds;
  - an awesome-looking house, maybe with an interior later.
- [ ] GO (owner 2026-11-20): the street model plan (docs/STREET_MODEL_PLAN.md) and shops v2 (docs/SHOPS_V2_PLAN.md, "if confident") are approved.
- [ ] LOOK: Neverness to Everness as the art reference (memory art-direction-nte): reference shots in data/raw/refs/nte/ (outside git); fine-tune, don't change the look.
- [ ] LATER (owner 2026-11-20): shop interiors look flat at street level. Plan: docs/SHOPS_V2_PLAN.md (layered baked interior mapping in the Forza Horizon style + 2-4 hero café cells). Also: shopInteriors.py bakes on the CPU (breaks the OptiX rule).
- [x] GATE FLAKE (fixed in claude/speed2, rule timing-rows: calibrated budgets, each step's best of 5, timing rows alone first): stutter2 fails under load on a different sub-check each run (clearRoads, heroTrianglesGen, hero triangle slices) and passes alone. A flaky gate row hides real regressions: make it load-robust (median of N runs, or measure CPU time not wall time) or isolate it.
- [ ] HEDGES SOLID (decided 2026-11-20; **claude/hedges2 (headless done, browser look pending)**: a hedge drawn over 1.18 m = KIND.hedgeWall, soft bounce + shake, no leaves (no burst system); docs/CARHIT.md "Hedges", gate `hedgewall`): dense clipped garden hedges taller than ~1.2 m stop the car like a wall, with a soft bounce, the hedge shaking and a few leaves falling. Low hedges (< 1 m) and loose shrubs stay soft (push through, slowed). Small job after the current queue.
- [x] OWNER QUESTION (roads 2026-11-19, answered above): front hedges are soft for the car by design (it pushes through, slowed); walls stop it. Should a hedge over ~1 m stop the car?
- [ ] Hero ironwork shimmer (thin bars on La Tour de Frein, police station, Papenkasteel, Wolvendael château): pack-side bake plan in docs/JITTER.md §2 (after claude/jitter merges); one hero per job, police station first.
- [ ] Window grilles, gates, fences jitter when the camera moves (thin geometry aliasing).
- [ ] Some places look hollow.

**Step 2: asset quality (all at no perf cost)**
- [ ] Bushes: redo with the tree foliage technique (foliage without trunk); today they read as green balls that fade out wrongly close up (LOD bug). **claude/bushes (headless done, browser turn pending)**: the trees' leaf-card crowns without trunk, parts of the trees' pool (0 more draws); cause = dithered model hand-overs at 4 / 10 m; docs/FOLIAGE.md §11, gate `bushes`.
- [ ] Bushes follow-up: flower clusters on the new leaf-card crowns (hydrangea heads, rhododendron / laurel blooms, roses, lavender spikes) with their seasons; the move to tree foliage dropped them (a step back, coordinator 2026-11-18).
- [ ] Garden hedges: look cheap; redo.
- [ ] Bicycle road marking: wrong shape; redo the real Belgian pictogram.
- [ ] Traffic lights: Blender, premium.
- [ ] Ivy: a more realistic shape.
- [x] Birds: the boids read as a ball; real murmuration-style movement. MERGED 2026-11-18 (d3d56cd0, claude/birds2): loose flocks, folding dusk murmuration, birds gate row; falcon prey sizes unchanged; ?birds2=old.
- [ ] Bats at night (owner 2026-11-18): many small bats flitting at dusk / night (erratic darting flight round street lamps, trees, parks, water). Build on the birds2 flock model once merged; tiny instanced flapping sprites / low-poly, one draw call, GPU-cheap, only near the camera, none by day. Must not hurt perf (budget-check it like the birds).
- [ ] Cheap houses vs detailed ones: compare with photos, lift the cheap family.
- [x] DONE 2026-11-23 (docs/SHADOWS_RESEARCH_2026-11.md; jobs: renders merged, sun-step + stand-ins next) Shadows: research a better / cheaper method, especially for static objects (cached static shadows).
- [ ] Loading screen images: redo with the current city.

**Reality check rounds (recurring, owner 2026-11-18):** one district at a time on Google Maps / Street View (look only, never stored or traced): what is missing, what is wrong, what looks nice and worth copying in spirit. Output: a short list per district into this TODO, then small jobs.

**Step 3: places (compare with photos, look only)**
- [x] MERGED 2026-11-23 (claude/parkfence) Wolvendael: big metal fences all round + several big gates (one at the Dieweg tram terminus).
- [ ] UNDERGROUND (owner 2026-11-23, "add to the list"): from OSM (data/raw/osm/area.json): 36 parking=underground, 2 multi-storey (Parking Saint-Pierre named), 4 more road tunnels not built (Av. des Biches, Rue des Bigarreaux, Rue de l'Élan, Rue du Bien-Faire: check if rail underpasses), roads through buildings (Galerie de Waterloo, Square Coghen, Rue Fernand Gillion, Square du Val de la Cambre). Order:
  1. Parking Saint-Pierre as the hero car park (street ramp, 1-2 levels, pillars, strip lights, parked cars, level ramps, exit barrier; police chase / hide missions, moto stunts) and from it 2. one underground car-park KIT for the other 36 (most: a closed door + the street ramp; 2-3 open fully for missions).
  3. The 4 remaining road tunnels with the existing method (viewer/rail/tunnels.js, docs/trains/TUNNELS.md).
  4. Through-building passages (arch, drive-through).
  Perf: streamed like the villa (interior only near), ground cut like the tunnels, nothing drawn underground from afar. Check each place on Street View first (look only).
- [x] MERGED 2026-11-24 (claude/carrefour) Carrefour Market near the police station (owner 2026-11-23): does not look like the real one; check photos / Street View (look only) and redo it (building, shopfront, signage, car park). **claude/carrefour (2026-11-23, not merged): Carrefour Market Marlow (Av. Wolvendael 2 / Square Georges Marlow 10). Cause: UrbIS box 529267 classified as a block (two storeys of house windows, yellow brick, red front door), a 6.5 m shop slot with no sign, its car park drawn as lawn. Now: a curated retail-box look (shed: plain clad wall, metal coping), an 18 m glazed front under a 30 m canopy, red line + 'Carrefour market' letters, the asphalt lot with 3 bay rows (?carrefour=old: before; rules curated-shed-look, curated-place-placed; row curatedplaces). Left: the wall reads lighter than the real greige (no wall tint in the look), the middle double row of bays, arrows, barrier, pylon sign, lot lamps.**
- [ ] **PRIORITY (owner 2026-11-24: kind of important)** CARS LOOK (owner 2026-11-24, with NTE shots as the bar, style only, no copying): close to NTE's still-stylised but much better cars without a perf cost: (1) paint: a glossy clear coat reflecting sky AND the environment (owner 2026-11-24: NTE cars reflect the buildings too): a small low-res reflection probe round the player refreshed one face per few frames is the BASE (off-screen buildings / sky; a fraction of a ms), the existing SSR pass on car paint only an extra layer; SMOOTH OR NOTHING (owner: better none than buggy): SSR faded at screen edges and where its hit is unsure (falls back to the probe, never a hole), a moving-camera strip (drive past cars + pans, frame-to-frame flicker, SSR on vs off, like rule smooth-lod-no-popping) decides: any added flicker or popping = no SSR on cars; far cars keep sky + blurred city; perf A/B on GREEN (one shared car material), black trim vs body colour, panel gaps; (2) wheels: real rims + tyres; lights, grille, plates detailed; only LOD0 (cars within ~20 m: the 22 / 55 / 130 m bands stay) gets the detail, so the cost is a few nearby cars. Order: paint + wheels on the existing 8 shapes first, then new shapes one at a time at that quality. Scripted in Blender (rule: no hand modelling) or licensed models after a licence check (fab.com item). Gate: tris / draws per LOD budgets, a perf A/B on GREEN, a city tour.
- [ ] CARS VARIETY (owner 2026-11-24, for Uccle): today 8 traffic shapes (hatch_s, hatch_c, estate, saloon, suv (a low crossover), van_c, van_p, taxi) + police + heavies; no real 4x4. Add, generic (no brands, no logos): a boxy 4x4 (tall, square, spare wheel on the back) FIRST, a big premium SUV, a tiny city car, an MPV, a pickup / small utility (gardeners, builders), a 90s classic hatchback + a rare old-timer (fits the kid game), an electric saloon, a QUAD bike (owner 2026-11-24: a fun drivable four-wheeler, also for the stunt area); cheap variety: wheel designs, roof racks / boxes, tinted rear windows, two-tone paints. TYPE_MIX shares re-weighted for a wealthy commune (more SUVs and 4x4s).
- [ ] Police station flags are RIGID, not our cloth flags (owner 2026-11-24): find why (a rigid flag inside the police hero model, the flags kit not placed there, or quick mode flags=0); fix by cause so every placed flag is a cloth flag; check: no rigid flag mesh where a flag pole is placed.
- [ ] BIG BILLBOARDS on buildings (owner 2026-11-24): large ad billboards on gables / roofs, some ROTATING PRISM (trivision) boards; one near the Engeland / Ch. d'Alsemberg railway bridge. Real ones from Street View (look only) as data in our own words; generic made-up posters (no real brands / logos); prisms turn in steps; instanced, no lights added (emissive if lit at night). Check: each board on a real wall / roof, not floating, readable size.
- [ ] CALEVOET STATION PEDESTRIAN UNDERPASS (owner 2026-11-24): the passage under the rails for people (no cars). Find it (OSM footway tunnel=yes near Calevoet, Street View look only); build walk-only (stairs / ramps, lit, tiled) with the tunnels.js ground cut; interior streamed in only near; check: walkable through, welded joins, colliders, no hole in the platform.
- [ ] Sun shadow past-far dark band (found by claude/renders 2026-11-24): r187's reversed-depth shadow test only checks z <= 1, so every receiver past the sun shadow's far plane reads as shadowed. At a low sun (golden, 9 deg) from 300 m up, the foreground past the far plane (box x 1.42 + 110 m) is a dark band (far-300m tour view). Fix: a far plane or box fade sized by the sun elevation (perf cost at a low sun); do it with the sun-step shadow job (docs/SHADOWS_RESEARCH_2026-11.md). Notes in docs/rules/renders-per-frame.md.
- [ ] Carrefour Rue Gatti de Gamond / Rue de Stalle (owner 2026-11-24): same design as Carrefour Market Marlow (claude/carrefour: shed:true box, glazed front + canopy, red sign, its surface car park with bays). Curate it the same way; its car park is at ground level (the OSM parking=underground node 9627537495 is wrong, docs/UNDERGROUND_PLAN.md). **claude/carrefour2 (2026-11-24, not merged): the store is the Carrefour Market Rue Gatti de Gamond 60 at Avenue Docteur Decroly (UrbIS solid 558122, OSM shop node 13192287981; Street View Apr 2024 + ortho 2024, look only): a pale grey panel box, the front facing south across its car park. Cause: the generator drew a greige block with a row of house windows, a 6.5 m shop slot and a lawn with paths. Now: the shed look (set carrefour), a 19 m glazed run under a 34.6 m canopy along the whole hall (new data-driven canopy.du), the red line (plaque dz) and 'Carrefour' / 'market' letters, the asphalt lot carrefour_gatti_lot with its 12 bay rows, the 4 LiDAR 'trees' under the canopy dropped (grounds chmClear, viewer/main.js groundTreesClear), osmWrong recorded on the lot. Check: curatedplaces S now walks every look with store {front, sign, lot, bays} (bays inside the lot, no LiDAR tree under a canopy). Found: node 9627537495 stands ~830 m south, at Rue Gatti de Gamond 333 by the Centre administratif (Rue de Stalle 77), where Street View shows a P sign and a ramp down under the building: owner to confirm whether that node is really wrong. Left: the glazed barrel vestibule at the entrance, the two red-and-white trolley shelters, the lot's fence + hedge, lamp posts, the brand mark.**
- [ ] Stunt area + invented abandoned underground car park (owner 2026-11-24 chose this: both together on empty land around Stalle, docs/UNDERGROUND_PLAN.md). Stunt area (owner 2026-11-22, for later): a construction site or waste ground with ramps, pipes, sand piles, containers, scaffolding for stunts with the car, the moto and the bike. Place not chosen: candidates to check on Google Maps / Street View (look only): the Calevoet / Stalle industrial and rail-side land, open or vacant plots in the Kauwberg / Engeland area (next to the kid game's sand quarries and the Dieweg bike park, docs/KIDGAME.md), any real building site. Pick one that is real and drivable; scripted props only.
- [x] MERGED 2026-11-23 (claude/parkfence) Parc de la Sauvagère (owner 2026-11-22): fences all round, a few gates and entrances; check the line and the gates on Street View (look only). Same job as Wolvendael (one park-fence kit, both parks).
- [ ] Place Saint-Pierre: the restaurant Le Petit Pont.
- [ ] Restaurant De Hoef: far better.
- [ ] Notre-Dame des Champs school: better, with its fences.
- [ ] Collège Saint-Pierre: better.
- [ ] The building at the top of Rue Engeland: gates and fences.
- [ ] Saint-Pierre church: missing walls (step 1).

## NOW (2026-11-17, one current list; newest owner notes win)

- traffic job: D6/D7 Alsemberg 8 h oversaturation — real demand + signal coordination between the close junctions (claude/street4 round 5: the trafmix row's true-stuck count is 4 / 2 / 1 on seeds 7 / 11 / 23 with the model lanes, 1 / 1 / 1 with ?streetlanes=old; docs/rules/junction-entry-room.md)
  - claude/street4 round 6 (2026-11-22): demand capped at 0.9 of green capacity per signal approach (rule signal-demand), gap acceptance at conflicting turns, entry-room reservation; trafmix true-stuck 0 / 3 / 1 on seeds 7 / 11 / 23. Left: (a) 3 close signal pairs whose through movement is on different phases (n140271967 <-> n2448080511, n30151287 -> n254921174): the phase-by-direction rule (signals.js phaseOfDir, the posts AND the traffic) must give one phase along a road between close pairs; (b) D7 signal pair (-1338, 1244): a car yields inside the first junction's turn at the second's give-way; (c) D6 (-996, 827): an ambulance on a run held by a parked car (hold 6); (d) trafmix sim cost 1.10-1.12 x the no-mix run (limit 1.10)
  - claude/street4 round 7 (2026-11-22): accepted at a ratchet. trafmix stuck over seeds 7 / 11 / 23 <= STUCK_MAX 4 (final: 0 / 0 / 0 with the model lanes, 1 / 0 / 1 with ?streetlanes=old; no trafmix.stuck gap entry open, so any new stuck place fails the row), each place a gap-register entry; off-phase close signal pairs <= PHASE_MAX 3. Sim cost fixed by cause: the sim's objects now have ONE shape (fields and stats counters added lazily, in a traffic-dependent order, and three type-object shapes made every hot method polymorphic: "wrong map" deopts), the step is ~2x cheaper (2.05 -> 0.9 us per car per step); the row times two sims of each (two identical plain sims timed one-to-one were 0.87-1.15 x apart): x1.03-1.08. trafparksim (I6 pull-over into a parked car ahead, from round 6) fixed by cause: makeRoom judges the shifted corridor ahead; that also cleared the E6 ambulance and the old-lanes D7 stuck.
- SIGNALS job (from claude/street4; takes trafmix PHASE_MAX 3 -> 0; the stuck cases below were seen during round 7 and no longer reproduce on seeds 7 / 11 / 23 at the merge, but they are traffic-chaotic): one phase along a road between close signal pairs (signals.js phaseOfDir, the drawn posts AND the traffic): n140271967 <-> n2448080511 (D7, both ways), n30151287 -> n254921174. The D7 pair (-1338, 1244, gap trafmix.stuck:cell@-1350,1250): a car (seed 11: a patrol, a bin lorry behind) yields inside the first junction's turn at the second one's give-way and stands for good; a queue waiting at the second junction's red stands inside the first one's turn. The E4 priority junction (-662, -333, gap trafmix.stuck:cell@-650,-350, cause priority-starved): a patrol on the give-way approach (seed 23, hold busy) waits 60 s+ behind a steady stream on the conflicting turn, every car within 4 s of the conflict point: junction control or demand there. Also watch the D6 five-arm peak queue (old lanes, before the corridor fix: a bus held "exit full" at -1154, 908). Done when trafmix shows 0 off-phase pairs and no stuck at D6 / D7 on seeds 7 / 11 / 23.
  - claude/signals1 (2026-11-22): DONE in code (rule signal-phase-road, row sigphase): the phase comes from the road at the junction, one table (signals.js signalPhases) for the posts and the traffic; trafmix PHASE_MAX 3 -> 0, STUCK_MAX 4 -> 1 (0 / 0 / 1: the E6 ambulance behind a parked car, PARKING job); D7 approach-mapped signals grouped as one junction (no cross-phase yield inside a turn, the exit not held by an approach signal), entry room up to a red exit signal; E4 priority-starved and D7 not seen on seeds 7 / 11 / 23 / 31 / 41 (still watch). Left: 1 odd ring at E1 (Coghen / Vanderkindere / Alsemberg) the two phases cannot colour; no green-wave offset other than 0 with the two city-wide phases.
- [x] PARKING job (from claude/street4): an emergency vehicle on a run on a street parked on both sides has no room to pass the oncoming / pulled-over cars and stands behind a parked car (hold 6): seen at E6 (-996, 827, seed 23) with the model lanes and D7 (-1098, 1079, seed 11, a bus and an ambulance) with ?streetlanes=old. With the model lanes both went away with the makeRoom corridor-ahead fix; with ?streetlanes=old two remain (gap entries trafmix.stuckOld: an ambulance at E6 -962, 798, seed 7; a bus at D7 -1102, 1066, seed 23). Fix: the run's route avoids such streets, or the parking leaves a passing gap every N m (data, not a sim crawl). Done when trafmix shows no hold-6 stuck on seeds 7 / 11 / 23 and STUCK_MAX can drop. (claude/signals1: the E6 ambulance (-996, 827, seed 23, hold 6) is back in the model-lane run once the signals changed the traffic: gap entry trafmix.stuck cell -1000,850, STUCK_MAX 1; a bus at D6 (-1154, 922, hold 6: a parked car 0.40 m into its lane north of D6, the steady oncoming stream refusing the ease-out 60 s) showed in a trial run.) **claude/parking1 (2026-11-22, rule service-vehicle-passage):** neither place was a street parked on both sides. Dieweg E6: one kerb parked, 5.5 m clear; the oncoming cars keeping right for the ambulance pushed into a parked car ahead and stood for good (the yield now keeps its lane). Rue Engeland D7: a parked car 1.9 m from a lane mouth (no parking within 5 m of a junction turn) and under a neighbour's lane (the gate now drops those as main.js does). Plus: every parked car leaves 3 m across (servicepass row, census), the lanes' clear widths route the service vehicles, a run has a narrow stretch and squeezes past standing cars. trafmix model lanes 0 / 0 / 0, STUCK_MAX 4 -> 3; old lanes 0 / 0 / 3 (new old-lanes places, registered). Left: the sim cost row reads 1.12-1.15 x on a loaded machine with these switches off as well (re-measure quiet). **Round 2 (2026-11-22, after merging claude/signals1):** trafparksim's 7 cm hit was a car easing BACK to its lane line unchecked (shown plainly with --shove 60): a move in is now judged ahead like a move out (?easeback=old; row trafparkshove: 60 shoved cars, seed 11). Sim cost: bodyClear keeps each parked box on the car, the look-ahead judges a straight stretch as one body (?lapre=old): x1.03-1.09. trafmix model lanes 0 / 1 / 1 = STUCK_MAX 2 (E4 priority-starved; E6 (-801, 677) narrow-starved: a patrol before a 72 m narrow street while the oncoming cars come through the junction into a stretch starting a few metres into their lane, where the narrow wait does not hold them), old lanes 0 / 0 / 1 (the same E6 place); every parking-both-sides place gone. Follow-up (narrow-starved): judge a narrow stretch on the route's NEXT lane too (a fairness claim alone did not fix it: tried, reverted). The sim cost check now measures CPU time (tools/gate/timing.mjs cpuAB: 30 A B B A rounds of 150 steps, each sim's CPU summed over 4 reps) with one clock PER SIM in the gate (the shared clock gave 'identical' sims different traffic): x1.05-1.08 alone and beside a heavy row (rule timing-rows); bodyClear's per-car box cache and the look-ahead pre-test keep the branch at or under the foundation's cost.

**Running:** bmx (scripted 90s BMX, Blender), kid (stylised kid on the UAL rig + get on / off the bike in the bike lab), carshadow (waits for a quiet machine). Bike lab branch claude/bike (not merged; lab served for the owner). Merged 2026-11-17/18: falconstutter, policerear, curvedroads, collisions, lycee, falcon2, deckrail. Open from deckrail: the Carsoel west street sags 1.2 m into the bank (0.6 m ledge eastbound), a pit in the drive surface on the Carsoel deck (883-884, 521), the Kasteelstraat service deck 0.7-1 m low.

**Police car rear (2026-11-17):** policerear merged: the plate is now a pre-filtered texture (plate shimmer -15..-44 %); spec AA / no SSR / shut-line filter measured nothing (dropped). Next job: the low sun's TREE SHADOWS sliding over the moving player car are the main remaining shimmer (car receiving no shadow: -43 %): a smoother received sun shadow on the player car / nearby movers, measured with debug/rearCheck.js (docs/POLICEREAR.md).

**Performance (owner's #1)**
- [ ] Falcon flight stutter round 2 (claude/falcon2, browser turn 2026-11-18 on a RED machine: boxshare / retirewarm builds now under the cover, gardens 3-7 ms slices, heropoll kept, cullcopy dropped; NEXT: re-measure on GREEN, the GC = ~3.5 GB/min of per-frame JS objects (allocation sampling) + the exposure meter's readback, docs/perf/FALCON_STUTTER.md "Round 2"): round 1 merged 2026-11-17 (worst 300 -> 67-83 ms, > 50 ms frames 15 -> 7, p99 ~50 -> ~33; goal 0 over 50 ms, p99 <= 25 not met). Left, ranked (docs/perf/FALCON_STUTTER.md): kit far walls' fade copy shadow build 31-56 ms (too many attributes to cache), major GC 50-100 ms, tile gardens step 18-40 ms, street-life box fade copy 8-9 ms, hero collider poll 37-66 ms.
- [ ] Clean performance measure of both games with everything merged (preflight GREEN, one tab).
- [ ] Time to play: police ~43 s, falcon ~39 s -> < 35 s.
- [ ] Heap leftovers: GLB held by the loader, meshopt wasm, landmark geometry holds (docs/HEAP.md).

**Owner playtest 2026-11-16 / notes 2026-11-17 (details in the sections below)**
- [ ] Police car rear: lines shimmer while moving; rear looks crude in the chase view (8c, 8e). Chase camera re-check (8d).
- [ ] Road widths too narrow in places; some curved roads broken at sharp bends. (Bends: claude/curvedroads, browser turn
  done, docs/roads/BENDS.md: engine strips + sidewalks trimmed at their crossing, folded 4,203 + 5,519 -> 0, sidewalk slabs
  across unmapped roads gone; rule 24. LEFT: the outer-side fan at R ~ 0 corners draws texture rings / a curled edge line
  (D1 Pénélope, D4 Paola): a next job. Widths elsewhere: a different cause, open.)
- [ ] Falcon controls feel hard: ASK THE OWNER what is hard. Police game: owner to replay car control round 3.
- [x] MERGED 2026-11-24 (claude/missions) Police missions must match the world (owner 2026-11-23, for the police game rework): the "move a car so the tram can pass" mission fires with no tram anywhere near, so it makes no sense. A mission's premise must be true where it plays: a blocked-tram mission only on a tram line with a tram actually held behind the blocking car (the tram sim queues there); same check for every mission type (an accident needs the crashed cars, a traffic jam needs the queue). Add a mission audit: every generated mission's preconditions present in the world at spawn.
- [ ] Lycée Français gate: left fence JITTERS (check close + moving); bare flag poles in that view (quick mode?). **claude/lycee (offline turn done, docs/LYCEE.md):** sub-pixel bars (0.5-2 px from the avenue) -> pre-filtered blended cards + modelled bars within 4-6 m (?lyceerail=old|cover; browser: fence shimmer -43..-54 % at 8-20 m, gate -42..-60 %), gate bar tops out of the rail (120 doubled faces); quick mode now keeps the Lycée flags; rule 26 (provisional), gate row lycee; browser turn done 2026-11-18 (docs/LYCEE.md 4).
- [ ] Chemin du Cortenbosch: the second, paved part down to the Geleytsbeek, parallel to Av. du Lycée Français (missing). **claude/lycee offline:** OSM 1235727248 IS built (UrbIS 149914 / 30121 / 27386 in setts, 3-5 m, joined both ends, driven, nothing on it; round 1 shot oldlane_after.jpg); no sidewalks (UrbIS maps none). Browser 2026-11-18 vs Street View: present but wider (3-5 m vs 2.5-3 m), greener and plainer than reality (no brick parking strip at n. 15, no painted Private Weg / Cortenbosch words, no lantern posts). ASK THE OWNER which stretch / what looked missing (docs/LYCEE.md 4).
- [ ] Flags: where else (owner names places; suggestions police station, Observatory, public buildings).
- [ ] Shops Place Saint-Job: Le Touring; re-check Thai Smile / Botanea / Miska / Cacao Tree; ~630 null UrbIS solids to rebuild.
- [ ] Owner image 68 (Waterloo by Optalweg): not located; ask for a hint.

**Ideas from the three.js expert repos (research 2026-11-17, docs/AGARGARO.md correction)**
- [ ] NodeMaterialInstance (in r187, unused): share node builds for the per-tile fade materials (falcon hitches #1 kit-wall fade shadow 31-56 ms, #4 streetlife-box fade 8-9 ms); A/B ?matinst with ?buildaudit=1. Watch three PR #34693 (shared builds, -80 % build time).
- [ ] Tile eviction like 3DTilesRendererJS's LRU (evict a few % of the excess per pass, min/max bytes) + priority-ordered process queue: against the 450-1170 MB GC drops (?lruslice).
- [ ] Night lamps as quads drawn into one light map (jeantimex/tokyo performance.md: night 32.9 -> 20.1 ms on WebGL); fits the fixed light count (?lamplightmap).
- [ ] Lab only: three-mesh-bvh/webgpu BVHComputeData (GPU raycast / closest point) for baked occlusion / AO probes; InstancedMesh2 1.0 beta for per-instance picking once it supports r187+.
- [ ] r188: GPUTimer (PR #35412) for per-pass timing; PR #35321 compileComputeAsync de-dup.

**Owner idea 2026-11-18: Dieweg cemetery (OSM way 16309623, landuse cemetery)**
- [ ] Hero treatment like St-Job / Observatory (hero-buildings method: real photos, look only): the remarkable funerary chapels and tombs (neoclassical, Art Nouveau, Egyptian-style), the old Jewish section, overgrown paths, ivy, old trees, walls and gates. Closed since 1958, half wild. Also a key place for the kid game (docs/KIDGAME.md).

**Owner idea 2026-11-18: physics props for all games**
- [ ] Roadworks kit (cones, Heras fences, barriers, sandbags, skip, signs, temporary lights), street movables (wheelie bins, bags, boxes, trolley, café chairs/tables, ball), fun extras (box piles, pigeons, skateboard, gnome; ramp planks + bricks for the kid game). Perf: sleeping by default (wake only within ~30 m when touched), instanced per kind, primitive colliders, a light physics engine (Rapier) for at most a few dozen active bodies, reset when out of view; placement from data where possible (works permits, OSM cafés). Blender premium for complex pieces, boxy ones procedural. After the bike works in the city.

**Defects found 2026-11-17**
- [~] Wire clearance too low under Av. des Tilleuls / Hospices / Carsoel bridges. **claude/places1: decks on their DSM-measured profile (rule deck-profile-measured): Tilleuls over the L26/5 chord 81.16 -> 82.09 m, wire 3.64 -> 4.54 m over the rail. Left: Hospices 2.9 m (DSM = deck top, so the L124 rail heights / the 0.9 m slab under that old bridge are the suspects) and Carsoel 4.54 m (hand-measured plan deck).**
- [ ] Vivier d'Oie station footbridges (UrbIS 751 / 752); Saint-Job deck sidewalks over the bank.
- [ ] Sharp leftovers: pedestrians / flags / grass motion vectors, window-mosaic repro, car streaking at 0.6 res.
- [ ] Cobble junction pads.

**Christmas (on 1 Dec - 6 Jan)**
- [x] Fir round 2 MERGED 2026-11-17 (needle cards, round bulbs; docs/CHRISTMAS.md "NEEDLE CARDS").
- [ ] Before 1 Dec: fir round 3 on claude/xmasfir3 (OFFLINE done, docs/CHRISTMAS.md "FIR ROUND 3": cards' depth pre-pass,
  the shadow from the far level's solid fronds, the middle level = a card shell; model 0.26 -> 0.094 ms at 8 m): the
  BROWSER turn on GREEN (A/B ?firprepass=0, ?firshadow=cards at 8 / 21 / 45 m; holes / specks; the 30 -> 70 m walk;
  re-measure the whole layer, +0.33-0.59 ms on YELLOW vs +0.00 on GREEN before), then merge.
- [ ] Owner review of the market + garlands + fir in game (?xmas=1); more decorations if the owner asks.

**City content (open from the archive)**
- [ ] Trains: more bridges (Rue de Stalle, Kauwberg, Linkebeek, Engeland, Moensberg), roads over the line as real decks,
  station canopies / buildings (Calevoet, Stalle), M6/M7 double-decks + HLE18, ballast mosaic up close, SNCB GTFS licence
  (gtfs@sncb.be) before the public site ships the timetable.
- [ ] Landmarks polish: Stalle chapel (statue + slates: owner decisions; north-aisle blotches), Calevoet station details,
  Verrewinkel far LOD + street dip, Wolvendael pond water too dark; Nekkersgat mill needs owner photos.
- [ ] Traffic: trams don't stop for cars, no lane changes, no headlight beams, a few lanes hug kerbs.
- [ ] Pedestrians: feet slide on turns, nobody sits, no children / dogs, walk graph from data.
- [ ] Minimap: more names, neighbourhood names, route to a searched place, satellite toggle.
- [ ] Collisions + physics audit (drive, walk, third person; scripted route per tile). claude/collisions 2026-11-17: collider audit (tools/audit/colliderAudit.mjs, rule 25 provisional, docs/COLLIDER_AUDIT.md): building colliders from the sunk walls (D4: the car drove 13.7 m into a block); deck parapets / railings drawn across streets (Kasteelstraat E10, Carsoel deck H6): claude/deckrail (docs/DECKRAIL.md, rule 17 extended, gate `deckrails`; browser turn done 2026-11-18; OPEN: the Kasteelstraat service road deck sits 0.7-1 m under the junction, the street west of the Carsoel deck sags 1.2 m into the bank (eastbound lane blocked by a 0.6 m ledge), a drive-grid pit on the Carsoel deck at 883, 521). OPEN: traffic lanes through a block / alleys / footpaths (Avenue Albert + Carre Cassimans F1, Kauwberg G6), open collider regions (D6), plants without colliders (owner?).

**Ideas, later**
- [ ] AUTUMN LEAVES WITH PHYSICS (owner 2026-11-17, re-asked 2026-11-24; full plan in 8j below): falling leaves by species, leaves on the ground, and leaf PILES that react to the walker, cars, the bike and the falcon (kicked up, spin, settle; piles dent and scatter); GPU particles, one draw, near the camera only.
- [ ] Character + car shapes round. Police car round 2 (branch claude/police-car: beam, siren WAVs).
- [ ] Street furniture kit (branch claude/furniture, held). Sound renders: owner to listen.
- [ ] fab.com assets to claim + licence question before the public site uses them.

## OWNER PLAYTEST 2026-11-16 (day, default viewer + both games) — TOP PRIORITY, in this order

**Night 2026-11-17 (owner away):** MERGED sharp (docs/UPSCALE.md), tour (docs/TOUR.md: 22-view city tour, baseline in
uccle-tour/.tour/foundation), holes (docs/HOLES.md: no hollow buildings; tour: 5 views fixed, 17 unchanged), heap +
heapfix (docs/HEAP.md: police heap 1.45 GB -> ~975 MB; no draw after dispose), orbitcam2 (game keys with no button, ?
card), trafpark (docs/TRAFPARK.md: 0 parked cars under traffic, tile borders too), vivier (docs/VIVIER.md: the bridge,
all 42 road-rail crossings resolved), skyctl (13 sky sliders, uniforms, ?skyctl=old), christmas (docs/CHRISTMAS.md:
firs Saint-Job + Saint-Pierre, chalet market, garlands; on 1 Dec - 6 Jan, ?xmas=1/0; +0.00 ms), twinlink
(docs/TWINLINK.md: tile-border car jumps 122-214 -> 0 per street, handover is an S lane change), police place fixed,
gate works in worktrees, agargaro evaluated (docs/AGARGARO.md: adopt none, 2 multiDraw jobs). Rules + gates:
**docs/QUALITY_RULES.md** (20 rules; read before every merge). Tour baseline = the twinlink run.
Running: xmasfir (fir needle sprays, Blender), mdraw (AGARGARO jobs 1-2: near-first chunk order ?mdsort=0, 80 m
chunks ?mdchunk=160). Queue: falcon stutter, loader stills, clean perf measure.
**LYCÉE / CORTENBOSCH (owner 2026-11-17 evening, from an agent's screen at the Lycée Français gate):**
(1) the gate fence on the LEFT of the Lycée gate JITTERS (flicker / shimmer, not visible in a still): check close up and
while moving (frame strips), find why (z-fight, thin bars under TAAU, LOD) + rule + gate check. (2) the Chemin du
Cortenbosch has a SECOND part we never built: the paved stretch that runs DOWN to the Geleytsbeek, parallel to the Avenue
du Lycée Français (one-way, probably why it was missed); find it on the map / Street View (look only), check our street
data for it, build it like the first part. The owner knows it well: ask for photos if Street View is thin. (3) same view:
the 3 flag poles on the right showed NO flags (quick mode not building them, or a real miss): check.
**FLAGS: WHERE ELSE (owner 2026-11-17, later):** flags fly today at the town hall (EU / Belgium / Uccle) and the Lycée
Français (Belgium / EU / France), via viewer/flagsCity.js flyFlags (any pole). Check with the owner where else real flags
are: the owner will name places; my suggestions: police station, Observatory, other public buildings (Belgian flags on
national days?). Look-check on Street View first.
Left: owner image 68 (Waterloo by Optalweg) not located; the two Vivier
d'Oie station footbridges (UrbIS 751 / 752); low wire clearance under Av. des Tilleuls / Hospices / Carsoel; Saint-Job
deck sidewalks over the bank; heap leftovers (GLB held by the loader, meshopt wasm, landmark geometry holds).

**SNOW2 (claude/snow2, 2026-11-17, docs/SNOW2.md):** snowfall's GPU cost over an overcast sky (GPU-bound A/B, 3.4 Mpx) +2.49 -> +1.57 ms (~1.0 -> ~0.6 ms at the window's size; ?snowfast=old): baked snow noise, cover only on up-facing faces, colour -> normal share, one filtered exposure fetch, near-only bump / groove, flakes collapsed / stepped on the drawn count. Looks: Sacré-Cœur 54 deg slate streaks instead of blocks (?snowsteep=old), library slate even (moss kept its sheen, ?slatemoss=old), Saint-Marc brick grey-mauve (?marcbrick=old), paved forecourts at Saint-Marc + Sacré-Cœur's east passage (grounds pavers, ?forecourts=old), hard grounds take the weather. Left: ~0.6 ms of the rest is SSR on the salted roads' wet film (content), the layer's own lit fragment (depth-first order tried: bare grey roofs, reverted), the < 0.6 ms target only at window size; GPU ms at window size needs ?quality=native + debug/snow2.js bound() (dynamic res + GPU clock otherwise hold ~11.5 ms).

**Status 2026-11-16 evening:** perfgame MERGED (hitches gone: police worst frame 350-950 -> 67-83 ms, falcon 300-967 -> 50-100 ms; play loader, no fill-in; steady CPU 11-13 ms unchanged -> follow-up job running: police car merge, patrol instancing, shadow casters, tile unload by distance, time-to-play 63-70 s -> < 35 s). citydefects: bridge deck, signals/poles (lights in lanes 122 -> 5, wrong heading 410 -> 0), parking by width (16,545 -> 12,084 cars, give-way on narrow streets), car slope fit, pier caps, done in code; browser check running. Night shop location unknown (not in OSM): ask the owner / Street View.

**Status update (later 2026-11-16):** citydefects rounds 2-3 MERGED (walls 1,796 -> 1 partial, deck look, flat-roof normals, sound off + mute button, per-building looks, police station = whole school complex + open north gate, Relais Saint-Job / Deneubourg / Press Shop (ex-Barat) / La Meute (ex-Bistroquet) curated, barrel piece). perfgame round 3 MERGED (sun shadow cache -2 ms, police drive CPU 9.5 ms, time to play ~50 s). Leftovers: police-game drive through both gates into the courtyard (collision check passed, not driven); Street View for Maison Dandoy, Proxy, White Night; curate Bois Savanes, Alain D., Lefevre; Relais corner house has 1 painted first-floor window (real: 2); image-59 banded roof spot not found; school blocks' look is an assumption (not visible from public Street View).

**Status (evening 2026-11-16):** MERGED: policefeel (car handling + chase camera + rear glass), falconfix (collisions, flight assist, eyrie start, church sill z-fight), perfgame rounds 4-7 (tile cache via Cache API, staged landmark compiles, lamp pool, far-LOD merges for bridges + landmarks, game preload; police ~48 s / falcon ~45 s to play, target 35 s), orbitcam (new inspection camera), farcity (far buildings with windows/roofs, night-matched). Running: cars2 (better car bodies + police estate). Left from farcity: far park ground darker than full (colour jump), no lamp pools in far tiles at night, far shader could skip the window grid when sub-pixel, far buildings ignore weather.

Owner (lives in Uccle): "most important thing is performance ... any technique: merging, sharing textures, anything".
1. **PERFORMANCE / GAME LAG**: the police game was "very laggy" with nothing else open. Profile the game path
   (police car + traffic + chase + HUD + route), CPU and GPU; merge geometry, share textures/atlases, fewer
   materials, fewer passes, cheaper shadows; budget table per feature. (agent perfgame)
2. **FULL LOADER BEFORE PLAY**: starting at the police station the scene was still filling in. A game start must
   wait (loader) until the tiles, kits and shaders around the spawn are ready. No pop-in in front of a player. (perfgame)
3. **Saint-Job station bridge (Montagne de Saint-Job over the railway)**: a railing + brick-pier fence blocks
   the road on the bridge, grass and tram rails run off it, and under the bridge is a mess (z-fighting, a platform
   block across the tracks, shelters in the wrong place). Rebuild from the real layout. (agent citydefects)
4. **Street furniture on the carriageway**: traffic lights in the road and wrongly rotated, tram/catenary poles
   in the road. Real ones stand on the kerb/footway, facing traffic. (citydefects)
5. **Road widths too narrow** vs reality (owner's eye); lane lines that don't follow the curve and run into a
   wall. (citydefects)
6. **Cars**: traffic driving through parked cars, cars sunk into the road, parked cars on streets where
   parking is not allowed / that become blocked. (citydefects)
7. **Defects**: z-fighting on some windows (door-surround / frame flicker), gate brick pier without cap
   (see-through top), bad shading on flat roofs (stripes/bands), odd buildings (hero buildings log "library has no
   X: temporary material" for zinc_roof / glass_window / ... at load: fix the slot mapping). (citydefects)
8. **Night shop on Place Saint-Job** missing (the white "night shop"). (citydefects) **claude/places1: Agam nightshop (n. 701) drawn, see line 51.**
8b. **Recognisable shops on Place Saint-Job (owner 2026-11-16)**: the shopfronts must be recognisable to a local.
   Start with **Le Relais Saint-Job** (famous restaurant, already in the city but generic), then every commerce on the
   Place and Chaussée de Saint-Job: real façade colour, awning, terrace, signage text/colour/font style, window layout,
   checked against recent photos / Street View (look only). White Night (Chée de Saint-Job 662) may have closed:
   owner is finding photos; keep or remove after that.
   **shops2 (2026-11-16, branch claude/shops2, not merged): docs/SHOPS2.md.** White Night is OPEN, in 662's low wing facing
   its lot (moved there); Place de Saint-Job 22 (Maison Dandoy) was a NULL UrbIS solid (631 city-wide!): rebuilt
   (tools/infill); Dandoy, Bois Savanes, Lefevre, Alain Dantine, Canon, Palais de la Truffe, Uccle Flore, P'tit Rêve,
   Proxy, Bioffice, the vet, Sushi Sama, Pasta Commedia, Le Passage curated; Le Relais' corner has its 2 windows +
   awnings; La Branche d'Olivier (8f e) done. Left: the other null solids, Le Touring, Thai Smile / Botanea / refuge /
   Miska / Cacao Tree re-check, a traffic crash on long teleports (SHOPS2.md).
8c. **Police car rear: bad lines while moving (owner 2026-11-16, default chase view)**: looks like aliasing / shimmer
   on the back of the car (TAAU + motion vectors on the player car? thin rear lights / plate edges? kit merge?). Check
   FIRST next session, with ?carmerge=old, ?instmotion=0, ?upscale=0 to isolate.
8d. **Chase camera too far (owner 2026-11-16)**: when driving, the car drifts far from the camera, almost to the screen
   centre: hard to drive, not like a real car game. Target: close chase (~5.5-6.5 m behind, ~1.8-2.2 m up), car in the
   lower third, stiff follow with little lag, speed pull-back max ~+0.8 m and FOV +5-8 deg (not more), look-ahead
   into turns, no clipping into walls; camera views on a key (chase near / chase far / bonnet / bumper). Tune the
   new carFeel camera (claude/policefeel) with the owner.
8e. **Police car model looks crude from behind** (coordinator 2026-11-16, chase view now frames it large): blocky tail
   lights, flat cream band, low-poly body. Premium Blender police estate (Belgian federal/local police livery: white +
   blue/yellow Battenburg, real proportions, bevels, tail-light clusters, plate recess), LODs, same kit slots.
   -> claude/cars2 (2026-11-16): the cars2 police estate (`?policecar=marked`; the game's unmarked estate is on the new
   body by default), docs/CARS2.md. Browser check pending.
8f. **Owner wishes 2026-11-16 (after the current jobs)**: (a) CHARACTER: Quaternius UAL1+UAL2 rig + the robot's
   locomotion code from claude/character2 as default (?char=hoodie old). (b) CAR SHAPES: traffic/parked car bodies,
   the FRONT looks weird; compare with Mr.doob slop-newyork cars, propose better cars (Blender, premium, LODs,
   instanced, shared atlas) at the same or lower cost. -> claude/cars2: DONE offline (docs/CARS2.md: diagnosis, slop comparison, 9 lofted
   cars with authored LODs, same draws, -70 % tris at 22-55 m, ?cars=old); browser comparison pending. (c) LYCEE FRANCAIS / CHEMIN DE CORTENBOSCH area (owner lives
   there): detail pass with references (school, the chemin's cobbles/hedges/walls, local details). (d) GELEYTSBEEK
   CASTLE (Kasteel / Chateau de Geleytsbeek): hero model if not done (references online, look only). (e) LA BRANCHE
   D'OLIVIER restaurant (in streetlife E7): make it recognisable like Le Relais.
8g. **Car glass dither on parked/traffic cars** (coordinator 2026-11-16): under TAAU the see-through glass of
   parked and traffic cars shows a fine dot/hatch pattern up close (same cause as the player car's rear window, fixed
   only for the player car with ?carglass=old). Fix for all cars without losing see-through interiors: stable
   (non-jittered) dither per instance + resolve weighting, or opaque tinted glass beyond ~8 m with a fake interior,
   or sorted blended glass for the nearest N cars.
   **carglass2 (2026-11-16, branch claude/carglass, not merged):** near-LOD (0-60 m) parked + traffic glass is real
   alpha-blended glass (glass-only geometry on the batches' instance buffers, +1-2 parked / +1 per traffic near batch
   render objects, ~+0.1 ms GPU at a 2.5 m close-up); police props / yard solid tinted; ?carglass2=old; docs/CARGLASS.md.
8h. **Cars2 leftovers**: watch the 30 m LOD fade in motion; compress cars2.glb (4.5 MB); more varied hatch fronts;
   shops2 leftovers (White Night lot asphalt, ivy over Uccle Flore window, Pasta Commedia coral render, 630 UrbIS
   buildings without geometry: infill tool tools/infill/infill_buildings.py, Place Saint-Job 38 next).
8i. **Street-surface name vote bug (cortenbosch agent 2026-11-16)**: DONE on claude/surfvote (docs/SURFVOTE.md,
   ?surfvote=old): names repaired + normalised, either side of OSM's bilingual name, roads inside each surface vote by
   length; 58 -> 3,341 matches, 72 streets / 120,573 m2 change (setts / pavers / gravel), 15 of 16 checked on Street
   View agree, Avenue Legrand overridden to asphalt. Left: junction pads tie -> asphalt, `surveyed` name test in
   surfaces.js, rebuild surfaces.json with the pipeline fix_text (together, own switch).
   Cortenbosch leftovers (round 2 on claude/cortenbosch2, docs/CORTENBOSCH2.md, ?cortenbosch2=old: type 6 1990s house,
   type 7 curtain wall, herringbone layer 4, painted words, railing / gate colliders; browser checks pending): Cortenbosch leftovers: 1990s house type for the facade system, glass curtain-wall style (553227), herringbone
   pavers, "Private Weg / Cortenbosch" paint, railing/gate colliders, other school blocks' looks.
8j. **AUTUMN LEAVES (owner idea 2026-11-17, later)**: falling leaves from the real tree species (colour by species +
   date), leaves lying on the ground (more in gutters, kerbs, against walls, under trees; swept off busy roads) and
   leaf PILES that react to the character, cars and the falcon. Plan: GPU compute particles (one buffer, one
   instanced draw, fixed budget ~20-50k near the camera, recycled), wind from wind.js; ground layer = a cheap
   decal/splat in the ground shader far + instanced leaf cards near; interaction via a small GPU "disturbance" field
   (movers write position+velocity: player car, traffic near the camera, character feet, falcon wingbeats/stoop),
   leaves get kicked up, spin, settle; piles = instanced cards with a height field that dents and scatters.
   References: Ghost of Tsushima leaves/grass talks, RDR2 ground debris, Horizon wind, three.js GPGPU examples.
   Budget < 0.5 ms GPU, no CPU per leaf, no extra lights; seasonal switch (Oct-Dec default, ?leaves=0/1).
8k. **Evaluate agargaro's libraries (owner 2026-11-17)**: github.com/agargaro: instanced-mesh (InstancedMesh2: per-
   instance frustum culling, BVH raycasting, sorting, LOD, shadow LOD, skinning; check WebGPU / r187 support),
   batched-mesh-extensions (WebGPU: BatchedMesh culling, per-instance uniforms, LOD), BVH.js (dynamic BVH),
   octahedral-impostor (vs our impostorKit), simplify-geometry. Measure against our own instancing (instanceStream,
   cellCull, multiDraw, lamp pool, far-LOD merge, heroBVH): adopt only where it beats them on CPU/GPU in the city.
9. **Orbit/inspection camera**: the default orbit is bad for a city. Study Godot / Unity / Unreal editor cameras,
   three.js CameraControls (yomotsu), Cesium/Google Earth: pivot on the clicked point, zoom to cursor, no clipping
   into buildings, smooth damping, terrain follow. (later agent)
   **orbitcam (2026-11-16, branch claude/orbitcam, not merged):** the default orbit is now an inspection camera
   (`viewer/orbitCam.js`, docs/ORBITCAM.md): orbit round the point under the cursor, ground pan, zoom to the cursor,
   F / double-click frames, RMB + WASD/QE flies, terrain / roof / landmark collision, touch, smooth fly-to for views and
   loaded-tile teleports. `?orbitcam=old`, `?orbitheroes=0`. Offline checks `node tools/orbitCamTest.mjs` pass; browser check done (docs/orbitcam/README.md); hand tuning of speeds by the owner left.
10. **Falcon game**: collision bugs (falls, then shoots back up), controls hard. Simpler and friendlier
   (assisted flight, auto level, clear feedback), not more complex. (later agent)
   **falconfix (2026-11-16, branch claude/falconfix, not merged):** collisions round 3 (no launch upward, no pops, a
   tumble without pull-up, out of solids / pins), the flight assist (mouse aim or A / D turns, wings level and altitude
   hold hands off, auto-flapping, Shift stoop with a pull-out, ground / obstacle avoid), steady camera, HUD climb rate +
   assist state, free flight starts on the eyrie. docs/falconfix/README.md; `?falconctl=old`, `?falconcol=old`,
   `?falconavoid=0`, `?falconstart=old`. Offline checks pass (tools/falconAssistTest.mjs); browser check done (tuned: hold follows rising ground, avoid under crowns + opens the wings, pursuit speed, E lands on roof / ground ahead); the eyrie sill z-fight fixed in stjob.py. Hand tuning by the owner left.
11. **Police game**: car physics not fun; it must climb slopes, kerbs and go "many places" without feeling
   blocked; poles in the road and narrow roads block it (3-5). Police station wrong: real gate open, building
   too small vs reality. (later agent)
   **policefeel (2026-11-16, branch claude/policefeel, not merged):** new handling in code (`viewer/drive/carFeel.js`,
   docs/POLICE_FEEL.md, `?carfeel=old` / `?hedgecol=old`): suspension, tyres, counter-steer, handbrake, camera; kerbs on
   steep streets / lawn banks / kerb islands ridden (the old 0.5 m-over-centre ledge rule blocked a 15 cm kerb on a 15 %
   street), hedges soft, posts deflect, parked cars shoved. Offline checks done; browser route 

