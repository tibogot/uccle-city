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
  - CLASS T: **claude/rail (offline turn done, docs/RAIL_T.md, rule 39 provisional, gate rows railt + railcorridor, streetprops onRail / inHero, ?rail=old):** bed under road bridges in the drive surface (sink 51 -> 5 m, tunnel lids), fences closed but at level crossings (bed reachable from a street 8,108 -> 0 m), straight per-bay panels (stepped bays 1,173 -> 0), fence walls = drawn panels (ghost 12,002 -> 58 m), Verrewinkel bench + bin dropped (the hero draws them), hero colliders only while the hero is drawn (the Stalle viaduct from C5). WORKER BUNDLE REBUILD needed; browser turn pending (docs/RAIL_T.md 6).
  - CLASS T (rail corridor): at Verrewinkel the car sinks into the rail ballast (ground under the tracks vs drive ground); a bench and a bin stand ON the rails (street furniture / OSM points placed on the track bed: snap / reject on the rail corridor, like the Villo fix); should cars reach the track bed at all?
  - CLASS F (facades): some house fronts have issues (Rue Papenkasteel red house: a window skewed / sheared in its frame); a missing house between Petit Bateau and L'Atelier du Sourcil (Ch. de Waterloo: gap with lawn; check UrbIS solids vs Street View).
  - CLASS S (signs): some signs still face the wrong way (one-way sign shot 103); recheck the streetprops orientation rule on more sign types.
  - CLASS P (physics props): more things to hit with the car: parked motorbikes / scooters, bins, bollards, cones, sign posts, bikes, barriers (breakable or pushable, sleeping physics near the player; builds on carhit).
  - MOTORBIKE: nearly unusable: the rider falls all the time. It must go fast, climb steep places, ride almost anywhere, not fall easily (arcade-forgiving like the bike's landing bands; docs/MOTO.md + docs/bike/FEEL_RESEARCH.md).
  - REALITY CHECKS each round (owner): Google Maps / Street View, look only: colours, missing things. First class: FRONT GATES: most Uccle houses have a garden gate / front fence; we miss many. Census gates per house frontage vs a Street View sample of streets, cause, rule, gate row (gardenKit placement).
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
    - Car damage leaves HOLLOW mesh: the crumple pushes faces inside out and you see through the body (rear corner, shots 109 / 110). Clamp the crumple so the shell stays closed, or render both sides. Add a check: the dented shell stays watertight from outside views.
    - Weird white lines near the Papenkasteel / Ch. de Saint-Job junction (shot 110: diagonal dashes, a cut zebra crossing). Re-check after claude/roads merges.
    - The white shop on Place de Saint-Job is placed right, but it stands on grass where the real place has a small car park (Street View).
  - PLACES (Street View look-only): Chaussée de Saint-Job night shop and Brico Job opposite it; Le Pigeon Noir (entrance on the wrong side, building colours wrong) and the children's garden / kindergarten in front of it; Papenkasteel castle: gates all round and very big fences.
- [ ] SOUND hookup (owner 2026-11-18, "I don't hear any sound"): the city sound engine (viewer/audio/engine.js, docs/SOUND.md: traffic, trams, nature, people, bells, canyon reverb, occlusion) is only in labs/sound-lab.html, never wired into the city; the two-wheelers need N on top of the speaker button, the falcon its own menu tick. Job: wire the engine into the city, ONE speaker button for every sound (no second switches), crash / scrape sounds for the car push, perf check. Still OFF by default. NOT the car engine sound: the owner will show another repo with a better engine-sound approach first.
- [ ] LATER (owner 2026-11-18): full church interiors: Saint-Job (nave + the belfry chamber with the eyrie, the falcon can hop in from the ledge), then Saint-Pierre. Method: docs/INTERIOR.md + the Chapelle de Stalle interior (models/stalle/interior.glb, on by default). The kid's room on the same method.
- [x] Gate / fence / grille jitter: MERGED 2026-11-19 (claude/jitter, rule 35): thin bars hand over to coverage cards (depth where coverage >= 4 %); ?jitter=old. Left: the Lycée railing card writes no depth (likely vanishes while moving under TAAU: apply the 4 % depth cut), the gate at 3 m at 8 m/s slightly worse (card fade-in).
- [x] Car contact (owner 2026-11-18): MERGED 2026-11-19 (claude/carhit, rule 37): two-way push / spin / dents, knocked / wreck / rejoin, parked cars pushable; ?carpush=old. Left: no roll / pitch kick, 4 dent zones, traffic two-wheelers still one-way, the walker cannot push cars, owner tuning.
- [x] Traffic lights in Blender (owner 2026-11-18): MERGED 2026-11-19 (claude/tlights, rule 36): Brussels-style posts, heads face the approach, seated, never in a lane, lit hues kept through ACES + eye adaptation; ?tlights=old. Far LOD hand-overs (120 / 80 m) not seen in the browser yet.
- [ ] RESUME (paused 2026-11-19, owner closing the laptop):
  - claude/roads (C:/Users/tibog/Downloads/uccle-roads, 02e85fe1, foundation d19f7adb merged in): browser turn mostly done (J6 off-carriageway 11.7 -> 1.5 %, slalom flips 36 -> 15; bushes gone; Papenkasteel fronts back). Left:
    - the full gate after the merge;
    - the tour vs a foundation baseline;
    - the Papenkasteel drive test (car stops at the hedges / walls);
    - the Waterloo slalom watch (1729, 607);
    - J6 (1730, 610-620), a lane still off its carriageway;
    - Av. du Prince de Ligne (1592, 360) still UNFIXED (junction funnel), the owner's complaint;
    - at merge, rebuild the worker bundle.
  - claude/sidewalk (C:/Users/tibog/Downloads/uccle-sidewalk, round 5 1aea8662 + gate-steps WIP 707414c2, notes in docs/SIDEWALK.md "Round 5b"). Left:
    - 12 gates still without steps on the 4 test tiles (G3 Roberts Jones 55, H6 Perelman 1): trace them to 0;
    - bareBank rose 64 -> 76 round the flights;
    - full census + ceilings (gateNoSteps=0), full gate;
    - quiet-machine wall ms;
    - Chrome turn: H6, G3, a stone wall, retaining vs garden brick, the steps (Perelman 4's flight: 19 risers, 5.7 m deep, check it);
    - merge + rebuild the bundle.
  - claude/kid (bike rounds 1-4, 07754f3c): browser turn not started (D6 city spot, ledge, stairs, sound, weight, camera); then the owner tries the bike lab.
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
- [ ] Shadows: research a better / cheaper method, especially for static objects (cached static shadows).
- [ ] Loading screen images: redo with the current city.

**Reality check rounds (recurring, owner 2026-11-18):** one district at a time on Google Maps / Street View (look only, never stored or traced): what is missing, what is wrong, what looks nice and worth copying in spirit. Output: a short list per district into this TODO, then small jobs.

**Step 3: places (compare with photos, look only)**
- [ ] Wolvendael: big metal fences all round + several big gates (one at the Dieweg tram terminus).
- [ ] Place Saint-Pierre: the restaurant Le Petit Pont.
- [ ] Restaurant De Hoef: far better.
- [ ] Notre-Dame des Champs school: better, with its fences.
- [ ] Collège Saint-Pierre: better.
- [ ] The building at the top of Rue Engeland: gates and fences.
- [ ] Saint-Pierre church: missing walls (step 1).

## NOW (2026-11-17, one current list; newest owner notes win)

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
- [ ] Wire clearance too low under Av. des Tilleuls / Hospices / Carsoel bridges.
- [ ] Vivier d'Oie station footbridges (UrbIS 751 / 752); Saint-Job deck sidewalks over the bank.
- [ ] Sharp leftovers: pedestrians / flags / grass motion vectors, window-mosaic repro, car streaking at 0.6 res.
- [ ] Cobble junction pads.

**Christmas (on 1 Dec - 6 Jan)**
- [x] Fir round 2 MERGED 2026-11-17 (needle cards, round bulbs; docs/CHRISTMAS.md "NEEDLE CARDS").
- [ ] Before 1 Dec: fir cards cost +0.26 ms at 8 m (budget 0.1; try the shadow from the middle level, fewer / smaller
  cards near the trunk); the middle level (45-150 m) still reads as flat tiers next to the needle crown (cards there
  too, or an impostor); re-measure the whole layer on GREEN (+0.33-0.59 ms on YELLOW vs +0.00 on GREEN before).
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
- [ ] Autumn leaves (8j). Character + car shapes round. Police car round 2 (branch claude/police-car: beam, siren WAVs).
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
8. **Night shop on Place Saint-Job** missing (the white "night shop"). (citydefects)
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

