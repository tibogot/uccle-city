# Everything still to do

> Continuing in Cursor / another Claude session? Read **`HANDOFF.md`** first (setup, rules, how to run). Look + performance plan: **`docs/RENDER_PLAN.md`**.

One list of all open work, roughly in priority order. `HANDOFF.md` says how to run things;
`docs/PLAN.md` has the history and details of what is done. Rule of thumb for every item:
**look better without costing frame time** (instancing, shared materials, LOD, compressed assets).

## OWNER'S MASTER LIST (2026-11-06, newest decisions first; keep this up to date)

**In progress (agents, own branches, lab first):**
- [x] Façade kit ROUND 2 DONE (rooms behind the kit glass, 65 → 37 meshes, 4 materials, 30 m fade, steps on slopes, one door per house, French windows + balconnets, window B far LOD, 741 kit faces on I6; +0.5-0.6 ms street, +1.1 ms close-up), waiting for the owner. Left: two-house UrbIS buildings can lose a door; doors partly below ground on slopes; per-slot multi-draw to halve the draws; re-check cost with library materials.
- [x] Façade kit pilot DONE (`claude/facade-kit`, `?kit=1`, Kit Lab). Round-1 list was: windows with rooms + net curtains (kit glass reads hollow at 30-60 m), fewer draws (65 → BatchedMesh / multi-draw), cleaner 95-115 m fade, steps on slopes, one door per corner house, French window behind balconies; then sets: dormers + gutters, bay windows, Art Deco / Nouveau, shopfronts, garage doors, corner pieces.
- [x] Beech DONE (`claude/tree-lab`, lab only): forest form costs the same as the street trees on the 4,552-tree patch; open-grown form for gardens/avenues. Weak: forest floor flat (no ferns, brambles, young beeches), trunks too regular and cool-toned, canopy too dense and uniform, open crown lumpy (looks like blobs next to the photo), copper beech preset missing (534 Uccle street beeches).
- [x] Tree texture A/B DONE (`claude/tree-textures`, labs/tree-textures-lab.html): textures cost no more GPU (slightly less), +5-8 MB GPU memory per species. Coordinator review: the CC0 plane barks (Bark009, bark_platanus) read as generic dark bark with small pale flecks, NOT the large pale plane plates: wait for Megascans or improve; beech leaf sprays (Blender) show real leaves, better than the mask. Forest benchmark re-run on a free GPU (2026-11-06): textured is CHEAPER in the forest too: plane −0.84 ms, beech −1.21 ms (A-vs-A control ±0.1-0.2). Megascans slots empty until the owner downloads (Beech Bark, European Beech leaves, Norway Maple, Maple Leaves). Found: beech impostor 2 % jump at hand-over; diagonal stripes on open beech impostors at 400 m midday.
- [ ] (was) texture A/B in the Tree Lab: bark (procedural vs CC0 scan vs Megascans) and leaves (today's mask vs a Blender-baked spray atlas vs a Megascans atlas), each with its cost; pick before more species.
- [x] Tree Lab + London plane DONE (`claude/tree-lab`, lab only), waiting for the owner. Plane costs +1 ms per 50 trees (fine for avenues, NOT for forests). Next: beech (Sonian Forest, most common Uccle street tree), then lime and horse chestnut; real species per tree from the Bruxelles Mobilité CC0 tree inventory (regional roads only); plane bark relief, crown radius fitted to LiDAR, seasons, wind.

**Done 2026-11-07, waiting for the owner's eye (own branches, not merged):**
- [ ] Moving traffic (`claude/traffic`, `?traffic=1`, labs/traffic-lab.html, docs/TRAFFIC.md). Coordinator check in the city: 0 pops / 0 appear / 0 vanish, ~0.24 ms CPU, +0.3 ms GPU. Weak: a few lanes hug kerbs, trams don't stop for cars, too much priorité de droite, no lane changes, no headlight beams.
- [ ] Chapelle de Stalle hero + walkable interior (`claude/stalle`, `?stalle=1&tile=D5&at=-1162,58`, labs/stalle-lab.html). Round 2 polish done. Weak: piers slightly faceted, rubble relief by shading only, stylised statues, south side estimated (owner photos wanted), interior +1.2 ms full-screen; 4 new slot names to add to the library.
- [ ] Tram v2 (`claude/tram2`, default in the city, `?tram=v1` = old). Same cost as v1. Nose still boxier than the photos (display reads as a box above the glass).
- [ ] Trains + railway (`claude/trains`, `?trains=1`, labs/train-lab.html, docs/TRAINS.md): L124 / L26 / L26-5, AM08, SNCB GTFS (334 trains / weekday), Saint-Job bridge + Calevoet viaduct heroes, track build in the worker. +~0.3 ms. Weak: AM08 nose still boxy; IC double-decks (M6/M7 + HLE18) missing; sand mound at a Saint-Job side arch; other bridges, road-over-rail structures, station canopies. SNCB GTFS re-use agreement (gtfs@sncb.be) before public ship.
- [ ] Saint-Pierre church hero (`claude/saint-pierre`, bb30b74 after polish round 2; `?stpierre=1&tile=E3&at=-735,-480`, labs/saint-pierre-lab.html, models/stpierre/NOTES.md). Geometry matches the photo overlays; dark red brick per brick, cream stone, leaded glass, dome to the DSM height. +0.04 ms on the parvis, +0.65 ms full-screen close-up, 0 pops. Weak: lit brick leans orange in low sun; east end / annexes / 4th nave north wall estimated (no photos); no interior (1 interior photo only); 1 new slot name `copper_brown`. Also: its lodFade fix (fade copies only inside the hand-over band, keeps early-z) and SSR exclusion on small metal should be applied to the other heroes.
- [ ] Next for both noses: trace the front outline from the photos and fit the nose to it (small tweaks didn't get there).

Stairs paused until the owner's Mixamo clips are in `data/raw/animations/mixamo/` (and the owner decides: Mixamo clips committed for the live site, or local only).

**OWNER REVIEW LIST, added 2026-11-10 (on top of the 11 earlier pages):**
- [ ] Chapelle de Stalle rounds 3-5 (`claude/stalle`, port 8802: http://localhost:8802/labs/stalle-lab.html, city ?tile=D5&stalle=1): checker 0, front matches c00, interior moulded; open: north-aisle blotches, statue (decision), slates +0.3 ms (decision). Merge behind ?stalle=1 when OK (brings tools/mesh_audit to main).
- [ ] Villa van Buuren (`claude/vanbuuren`, port 8818: http://localhost:8818/labs/vanbuuren-lab.html, city ?vanbuuren=1&tile=G2&at=302.6,-1229.6): shape matches the photos; look round (brick orange, white concrete, frames, glass, NW roof) next.
- [ ] Roads v2 phases 0+1 (`claude/roads2`, port 8815: http://localhost:8815/labs/road-lab.html?j=1&view=plan, &paint=v1 = before); send docs/roads/brussels_mobility_request.md.
- [ ] Flag Lab (`claude/flags`, port 8817: http://localhost:8817/labs/flag-lab.html).
- [ ] Small fixes (`claude/smallfixes`): lamps + ?sunlight=1.
- [ ] Hero prep notes (`claude/hero-prep`, docs/heroes/): Van Buuren + Wolvendael.
- Decisions: statues / carved ornament (scripted vs museum scans); chapel close-up slates +0.3 ms.

**Done 2026-11-10 while the owner was away (own branches, not merged; waiting for the owner's eye):**
- [ ] `claude/smallfixes` (d61221e): night lamps pick the 6 nearest without a per-frame allocation or full sort (same lamps, 2000 random checks); `?sunlight=1` uses Mr.doob's newer shadow settings (2048 px, 220 m). GPU A/B still to measure on a quiet machine.
- [ ] `claude/flags` (d22d6da, labs/flag-lab.html, docs/FLAGS.md): flag system v1, lab only. Verlet cloth near, baked loop far (GPU, zero CPU), no pops at the hand-overs (measured), wind changes re-recorded in a worker and cross-faded, town hall balcony poles with wall collision, Belgium / EU / Uccle designs. Live cloth ~0.08 ms per flag (Node), more in the busy browser: budget 4 live flags. Next: GPU A/B, the city (town hall), the city wind.
- [ ] `claude/hero-prep` (de4ddf8, docs/heroes/): preparation only for Villa van Buuren (solid 550409) and Wolvendael (chateau 537523 + Louis XV pavilion 537211): measurements, photo sources + licences, facade read, parts / slots, risks; owner decision needed on how to do carved ornament (pavilion) and statues (Stalle).

**City test bugs the owner saw (2026-11-10, flying with the birds; re-test on a combined build, some may be fixed by unmerged branches):**
- [ ] distant trees flickering / shimmering, even with a still or slow camera (owner, 2026-11-10: this IS the "tree jitter" seen flying with the birds; seen again in the town hall city view). Check far-tree LOD, alpha-cutout aliasing (alpha-to-coverage / mip alpha), impostors.
- [ ] z-fighting (flicker) on shader buildings (facades / roof edges?)
- [ ] some curved roads completely broken (road geometry at sharp curves?)
- [ ] some trees standing in the middle of the road (LiDAR tree points not filtered against the road surface?)

**Plan agreed 2026-11-10 (owner), in order:**
1. [ ] Combined preview build of everything waiting for review; the owner tests the city and lists problems; I reproduce each with frame sequences before fixing.
2. [x] Gap audit vs mrdoob/slop-newyork DONE 2026-11-10 (his HEAD 536a907): docs/SLOP_NEWYORK_AUDIT.md. Top to take: minimap + full map (his js/nyc-map.js, MIT), real lights at night on cars/lamps/shops (clustered light pools), procedural sound (none today), pedestrians (instanced crowd), wet roads/puddles (uWetness unused), shadow stand-ins + his new shadow/bloom numbers, street-sign HUD + text atlas with REAL names (his are fake), parallax shop interiors, pond water, matrixWorldAutoUpdate off per tile. Small fixes found: viewer/lamps.js:187 allocates + sorts every frame at night; ?sunlight=1 uses his old shadow settings (viewer/lighting.js:152-155).
3. [ ] Minimap (round, turns with heading, current + upcoming street names, landmarks, tram/rail) + full map on a key with click-to-teleport. Pre-rendered from our own data, a 2D canvas updated a few times per second. OSM credit on the map.
   **Map (claude/minimap), built 2026-11-11, waiting for the owner's eye** (docs/MAP.md; Map Lab; city `?map=1`, off by default): baked map (tools/build_map.py -> data/map, 1.2 MB), heading-up round minimap drawn by a worker (main thread avg 0.03-0.07 ms per frame, cache rebuilds 0 ms on the main thread), current + next street from the road graph, full map with FR/NL search and teleport (2.6-5.9 s to ready, mostly the tile's own build). Left:
   - [ ] few street names on the minimap at walking zoom (curvy streets have short straight runs; long names do not fit): curved text along the polyline, or abbreviations (Av., Ch., R.)
   - [ ] Avenue Brugmann gets no name on the full map at some zooms (its dual carriageways break the same-name chains): merge parallel same-name roads before chaining
   - [ ] live trams (2-6 dots from tramline.js) on both maps; other STIB lines (4, 51, 97, buses) and SNCB stations' names on the minimap
   - [ ] route to a searched place (A* on the road graph, drawn on both maps) and a waypoint
   - [ ] neighbourhood names (Uccle-Centre, Saint-Job, Fort-Jaco, Calevoet, Stalle, Vivier d'Oie…) from OSM place=* (not in our raw fetch yet)
   - [ ] UrbIS street axes as the authoritative bilingual names (OSM today)
   - [ ] orthophoto "satellite" toggle on the full map (data/tiles/*/ortho.jpg) and hill shading from the DTM
   - [ ] teleport: the target tile's own build dominates (I6 5.8 s); a lighter first pass (ground + roads first) would cut the wait
   - [ ] the city's drive start ignores the current position (uses ?at or Saint-Job): unrelated to the map, seen while testing
   - [ ] one 14.5 ms outlier frame in the minimap's own timing once in ~2,000 frames (not reproduced): watch with a trace
4. [ ] Wayfinding / realism layer: bilingual FR/NL street name plates at corners (UrbIS street names); OSM POIs in their real places (shops with their names on the fronts, fuel stations with canopies + pumps, pharmacies with green crosses, cafés with terraces, supermarkets, schools); STIB tram/bus stop names (GTFS). Real brand names as text only, no trademark logos. Perf: one text atlas, instanced signs, built per tile in the worker, text only within ~80 m, lit at night.
5. [ ] Street character from real data so streets differ: hedges/fences, front gardens, real tree species, parking, bins, lamp types (avenues vs villa streets vs centre).
6. [ ] Planting system (owner, 2026-11-10; later, with item 5): flower beds, shrubs, hedges, window boxes, grass tufts, ivy. Scripted Blender plants (premium) + meshopt LODs, instanced per tile in the worker, alpha-to-coverage cards only near (< ~60 m), fade to a coloured ground decal / nothing beyond, dithered fades, no shadow casting for small plants, seasonal colour. Placement from real data (UrbIS/OSM green areas, garden zones, the town hall beds on the photos). Budget ~0.2-0.5 ms in a dense street; benchmark in a Planting Lab before the city.
- Flag system (below) slots in right after the town hall round 2.

**Owner review 2026-11-10: Chapelle de Stalle (`claude/stalle`), NOT approved yet; round 3 "AAA, it's ~1000 years old":**
- [ ] z-fighting at the gable corner (coping / roof / wall meet), and the door flickers (thin bright line between leaf and frame).
- [ ] black dashes in the stone joints; a diagonal stretched streak between the oculus and the lancet (bad topology / normals); stones read like bevelled bathroom tiles, check against the photos.
- [ ] roof slates read flat (relief, overlap, edge shadows; reusable for every roof, so it belongs in the materials library too); yellow-green lichen blobs look fake.
- [ ] statue over the door looks cheap.
- [ ] interior: flicker at the door while it opens (shadow and/or z-fight); with the door closed the exterior shows at the edges (light leaks).
- [ ] interior: vault ribs landing on a column capital intersect jaggedly, leave a black hole and flicker; the capital is faceted.
- [ ] later, once all is clean: fake god rays through the windows.
- [ ] RULE GAP: we have no automatic check against z-fighting / bad topology for heroes (scripted or procedural). Build a shared hero mesh audit (coplanar overlaps, near-coincident faces < few mm, light-leak gaps, slivers / stretched triangles, flipped or inconsistent normals, non-manifold) + a flicker test (consecutive frames at several distances), run before every pack; no hero merges without a clean audit. Then run it on all heroes (Saint-Job, Observatory, town hall, Saint-Pierre, trains/bridges, facade kit, furniture). ALSO the non-hero procedural city (facades, roofs, roads, kerbs, plazas, furniture, tile worker output): same checker on generated geometry, all 120 tiles, as a build check (owner asked 2026-11-10). Round 3 started 2026-11-10 (checker + chapel fixes).

**ROAD SYSTEM v2, taken seriously (owner, 2026-11-10, Traffic Lab review; step 1 research DONE: docs/ROADS_V2_RESEARCH.md, phases 0-5, 10 lab junctions; owner decisions pending: no centre line unless measured, roads outside UrbIS, write to Brussels Mobility, OpenDRIVE export):** markings are wrong at junctions (zebra in the junction mouth instead of across an arm, stop lines and dashes in the wrong places, see the owner's Traffic Lab screenshot); probably more is wrong. Needs: (1) refresh docs/ROADS_RESEARCH.md (2026-11-04) with the best systems out there (Unreal CitySample / ZoneGraph / Mass traffic, Houdini road tools, RoadRunner, CityEngine, Unity EasyRoads3D / Road Architect / CiDy, Godot road plugins, osm2streets / Streets GL / A/B Street, articles, GDC talks); (2) one lane-level road model as the single source of truth for geometry, markings, traffic, signals, minimap, street signs, levels (bridges, tunnels, metro/subway, ramps); (3) a ROAD CHECKER (zebras across an arm and perpendicular, stop lines before the junction, no paint outside the carriageway or across kerbs, lanes vs paint vs traffic paths agree, no overlaps / z-fight, curves continuous); (4) truth from measured data: UrbIS Topo markings + Land cover surfaces + the UrbIS orthophoto (CC0, shows the paint) + Brussels Mobility marking inventory; (5) a Road Lab with real Uccle junctions, then the city. Includes the owner's "broken curved roads".
- Reference images: the owner OK'd LOOKING at Google Maps / Street View to check colours, materials, markings (a human visual check only: never trace, extract, store or ship their imagery or geometry). Prefer CC0 UrbIS orthophoto, Mapillary (CC BY-SA), Wikimedia Commons, own photos for anything measured.

**Later (owner, 2026-11-10): seasons as well as weather** (leaves colour and fall, bare winter trees, snow, flowers in spring, low winter sun).

**HIGH PRIORITY after the town hall round 2 (owner, 2026-11-10): the flag system** (the town hall flies flags; more flags across the city later). Verlet cloth (same idea as game-engine-v1/v3/props/flagFactory.js, read only, write our own). Near flags (< ~60-80 m, on screen): live sim, ~12x8 grid, fixed step, city wind, < 0.05 ms each. All others: the same sim baked offline into a small looping vertex-animation texture played by the GPU (3 wind strengths, random phase per flag), zero CPU, hundreds for the price of one; smooth fade loop -> live when approaching (no popping). Procedural flag designs: Belgium, EU, Brussels region, Uccle. Flag Lab page (wind, fabric, size, live vs baked side by side, cost). Then attach to the town hall poles (positions in models/townhall/NOTES.md after round 2).

**Queue (owner, 2026-11-07), in order:**
1. Trains: SNCB lines and stations of Uccle (verify the list: Uccle-Stalle, Uccle-Calevoet, …), tracks with embankments and cuttings, stations with platforms and shelters, SNCB trains (double-deck + suburban types) in Blender at a HIGHER quality than our tram, on the real timetable (SNCB GTFS open data). The RAILWAY BRIDGES are important: the bridge over Chaussée de Saint-Job ("nice shape"), the bridge near Uccle-Calevoet / rue des Roses next to the station, and the others: model them as heroes. References: UrbIS (bridge solids / Land cover levels +1), OSM bridge=yes ways, Wikimedia Commons, heritage inventory, Mapillary; NOT Google Street View/Maps imagery (terms forbid deriving models; the owner suggested Google: explain).
2. A better tram: the T3000 "still looks somehow": a quality pass to the trains' level, same performance budget.
3. Next hero: Saint-Pierre church (Uccle-Centre), then Van Buuren museum, Wolvendael.
4. Later: real-time APIs to make the city realistic (live weather: Open-Meteo / RMI; live STIB and SNCB positions and delays; time of day already real); and the MONETIZATION ideas (docs/MARKET.md: sun and shadow studies for architects, participation tools for communes, freelance showcase; revisit with what the city can do now).

**Waiting for the owner's eye:**
- [ ] STAIRS BROKEN in the feet audit (owner saw it live 2026-11-06: trailing leg overstretched, swing foot kicked ~45 cm up behind the body); fix in progress on `claude/character-audit` with pose-plausibility checks; must be clip-agnostic (more animations coming later). Coordinator must check moving frame sequences before showing.
- [ ] Character feet audit (`claude/character-audit`, Capsule Lab "Foot audit" cameras, 40/40 tests): foot locking (running slide 0.9 → 0.02 m/s), heel+toe rays (toes through kerbs 14 → 3 cm), swing feet clear steps, landing absorb, no jump onto 1 m blocks, frame-rate independent. Left: walking UP steep stairs (heel/toe across the riser, 15-20 cm worst frames), no jump/fall pose, turn in place = pivot + step, pelvis drops 21-25 cm going down steep stairs; coordinator review: the pelvis also dips ~10 cm before a 15 cm kerb (deep).
- [ ] Material Lab (`claude/materials`): pick per material; commit `viewer/materials/choices.json`; then switch heroes, ground and façades to the library.
- [ ] Royal Observatory (`claude/observatory`, `?observatory=1`): window counts FIXED from photos (main front: triplets, pedimented portal, attic with pediment + oculus; wings, galleries, pavilions, residences; floors follow the sloping ground; two-leaf SE shutter; per-vertex AO on thin parts). Coordinator review: main front now close to the photo; still: the glass reads as black voids (photo: white frames, pale glass; give it the kit's rooms-behind-glass), the entrance steps are missing, residences' windows too small, SE tower too slim, many unphotographed façades still rule-based.
- [x] Uccle town hall MERGED 2026-11-10 (owner OK, e255cdf; round 2 + sparkle fix merged 4791c35; city flight re-run on a quiet GPU: 0 coverage errors, 0 long tasks, 2nd run 20/1420 frames at one missed vsync, none at the hand-overs, still behind `?townhall=1`, not pushed). Fine-tune later: (1) west façade invented (no photo), south from one photo, north mirrored; (2) plinth too dark, missing flags + carved panel over the door, front steps end on grass instead of the square's paving; (3) apply the Saint-Pierre lodFade fix (fade copies only inside the hand-over band, keeps early-z; close-up +0.92 ms today) to all heroes at once; (4) switch `SOURCE` in viewer/townhallModel.js to the materials library once `claude/materials` is approved.
- [ ] Town hall polish round 2 (`claude/townhall2`, not merged; models/townhall/NOTES.md "Polish round 2"): Saint-Pierre's lodFade fix + noSSR on iron/zinc + Fn/toVar temp materials (close-up L0 +1.53 -> +1.40 ms, L1 +1.34 -> +1.13, SE corner L0 +1.25 -> +1.00, with +5k tris of new detail; city flight 0 frames > 25 ms, coverage 1.000), plinth pale (cause: the temp stone_blue, not the AO), portico re-measured on 3557 (soffit +0.48 m), carved panel over the door (motif estimated), three flag POLES only with their ends in townhall.json `flag_poles` (for the cloth flag system), forecourt paving apron in its own `cobbles` slot. Left: (a) the flag cloth system (owner: dedicated cheap cloth sim; poles ready); (b) the rest of the close-up cost is geometry + post chain, not shading (a plain grey material costs the same): shadow casting from LOD1 geometry while LOD0 shows (layer trick) could save ~0.1-0.2 ms, to try on all heroes; (c) [round 2b: FIXED, see below] LOD1's sparkle; (d) the lab's ground (1 m orthophoto) reads washed-out white under the lab's exposure; (e) the forecourt beds beside the perron (P01: low hedges, a small tree) and the square's real paving pattern are not modelled; (f) the carved panel's motif needs a closer photo; (g) once SOURCE points at the library, check the library's stone_blue is the pale bush-hammered kind (or point the slot at another name in SLOT_TABLE).
- [ ] Town hall round 2b, the far SPARKLE (owner's review; NOTES "Polish round 2b"): causes were LOD1's attributes (side normals on front faces, AO UVs across lightmap islands, uncovered faces baked dark) and sub-pixel parts (quoin tops, bands, glazing bars). Fixed: LOD1 corners get their triangle's normal when theirs face away, LOD1's AO baked on LOD1 itself (tools/blender/townhall_lod1_ao.py), COLOR_0.b = region width + a footprint-based shader filter (normal toward the view, albedo x covered share) on every slot. Strips: docs/townhall/city_sparkle_moving_before_after.jpg, city_sparkle_pan150_before_after.jpg. GPU same within noise; GLB 1.77 -> 2.57 MB. Left: (a) re-run the city flight on a quiet GPU (this session's frame times were disturbed by another Chrome session); (b) a fine grain remains inside the 92-128 m dither band where LOD0 and LOD1 still differ; (c) LOD1's own bake reads darker (weight 0.55 to match): the simplification's overlapping leftovers, a cleaner LOD1 (prune hidden parts) would allow 1.0; (d) the same region-width filter would help the other heroes (Saint-Job, Saint-Pierre, Observatory) and the facade kit; (e) a few faint glass glints at 250 m; the windows read darker far away (frames' covered share).
- [ ] Push to Vercel: falcons + interior fixes are merged but not live.

**Megascans (free on Fab from 2026-11-05; Fab Standard License, NOT CC0):**
- [ ] The owner claims on fab.com: decals (Leakage, Moss, Wall/Concrete/Road/Asphalt Crack, Chewing Gums, Fallen/Dead Leaves, Manhole Cover, Worn Road Marking, Mud Stain) and surfaces (Brick Facade, Brick Wall Worn, Cobblestone Road, Slate Roof, Red Roof Tiles, Plaster Wall, Stone/Concrete Pavement, Asphalt Road, Oxidized Copper Sheet). Some still priced until ~2026-11-12: claim them later.
- [ ] Megascans surfaces as a 4th option in the Material Lab; decals on the façade kit and the ground.
- [ ] Licence question before shipping on the public site (files are downloadable by visitors): read the Fab EULA / ask Epic. CC0 stays the default on the live site until then.

**Nature labs (after the Tree Lab):** ground and gardens (lawns, verges, flowerbeds, hedges, shrubs, ivy); weather and seasons (rain, wet streets, puddles, snow, fog; one season for trees, grass, ground); water (Wolvendael and Kinsendael ponds, streams, reeds).
**Live weather:** drive the sky and weather from a real-time API (e.g. Open-Meteo, free and no key, or the Belgian RMI/KMI open data): clouds, rain, wind, fog, temperature for snow. Needs the weather lab's rain / wet / snow rendering first.

**City realism, next:** shopfronts on OSM shops (Chaussée d'Alsemberg, Saint-Job); garden walls, hedges, railings on plot edges; moving traffic on the lane graph with the traffic lights; pedestrians; sound (street, tram, birds, car); road details from Brussels Mobility (lanes, crossings, signs); forest drives (paved or not?); more heroes (Saint-Pierre, Van Buuren, Wolvendael); church interior (needs owner photos); more interiors.

**Fine-tuning:** cars (fronts per type, the van is the reference; police, ambulance); street furniture 2nd pass (quality, lab z-fighting, UrbIS positions of bins / bollards / signs); character jump clip; interior reflections with real textures, taller trumeau mirror, brick-red strip at the stairwell; falcons (better chicks: round down, a proper peregrine model); street-level GPU cost (~1 ms from the smoothness work).

**Bigger steps:** phones and tablets; all of Brussels (pipeline at scale, GPU culling); the first game (suggested: the Saint-Job falcons; also driving, tram 92, exploration).

## NEXT SESSION (agreed order, 2026-11-04)

1. [x] **Roof collision for fly mode**: a 2 m roof-height grid per tile (tile worker), `world.heightAt` = max(ground, roofs).
   Driving will need real wall collision (BVH) later.
2. **Parked cars**: the owner rejected the scripted car's look; **owner to pick** in the Car Lab comparison
   (`labs/car-lab.html?mode=compare`, `?mode=street`, branch claude/cars): scripted vs Kenney Car Kit vs Quaternius Cars
   Pack (CC0, `models/cars/`, one material per pack, meshoptimizer LODs at load), and (branch claude/car-faceted) our own
   faceted family `faceted:<id>` (tools/blender/carFaceted.py: 7 types + taxi, ~7.4k tris, baked AO, see-through glass;
   previews docs/cars/faceted_*.png). Then the pick replaces the boxes in
   `viewer/cars.js` (instancing per model / LOD, as the street benchmark does; also a GPU saving: cars are ~784k
   triangles per view).
3. **All of Uccle**: re-fetch raw data on this machine, set up the Python pipeline, extend the grid (section 1).
Then: road fixes (z-fighting, breaks in curves, grooved tram rails), rain / wet roads,
winter (7b), dev panel teleports to named places.

**Roads, surface first (`?roads=surface`, branch claude/roads-surface, 2026-11-05):** UrbIS Land cover street surfaces
cut per tile (`pipeline/build_surfaces.py` -> `surfaces.json`, built for I6 + its 8 neighbours), drawn by
`viewer/surfaces.js` in the tile worker: measured roadway / sidewalks (+13 cm) / kerbs / medians / squares, the engine's
markings clipped to the measured roadway. Audit (`tools/audit_surfaces.py`): buildings >= 1 m into the road on the
9 tiles 148 -> 3. Left: (a) lane fitting into the measured width (engine edge lines sit at the engine's kerbs, so on
streets the engine made too narrow they float inside the asphalt; too wide: clipped away), (b) dropped kerbs at
crossings / driveways (Topo `CR42L`), (c) lamps, parked cars and the walker still follow the engine's kerbs / ground,
(d) levels +1 / -1 (bridges, tunnels) skipped, (e) all 120 tiles: `python pipeline/run_tile.py --all` now runs
build_surfaces.py when the Land cover GPKG is in data/raw (or loop build_surfaces.py --tile), then build_manifest.py;
then make it the default after an owner look.
Fix pass 2026-11-05 (same branch): Place de Saint-Job square raised + setts, roads round it asphalt; UrbIS bollards;
merged + smoothed surfaces, kerb-aligned paving; width fit (lane stacks into the measured kerb-to-kerb width);
lamps / parked cars / walker on the measured street; smooth shared tram track, sticky snapping, trapezoid speed.
Still open: paving seams where a wide sidewalk meets two kerbs (pattern turns along a jagged triangle line, e.g. the
church forecourt), dropped kerbs (CR42L, 303 lines in I6 are fetchable from bm_urbis_topo:street_furniture_line),
one-sided roads skipped by the width fit, the tram path's small kink where two tiles' tracks meet, level +1 / -1.
All tiles: `python pipeline/build_surfaces.py --all` (4 WFS queries per tile, cached) then `python pipeline/build_manifest.py`.
Finishing pass 2026-11-05: DONE for all 120 tiles and made the DEFAULT (`?roads=engine` = the old roads). Old setts on the
squares (viewer/cobbles.js), filtered paving (no far band), darker sidewalks, kerb/straight frame cross-fade, dropped
kerbs at driveways and crossings, tram path continuous across tile seams. All Uccle: buildings >= 1 m into the drawn
road 1121 -> 45 (all on engine roads UrbIS does not map). Left: UrbIS forest drives (Sonian forest) drawn as asphalt,
road meshes ~2.4x the engine's triangles (ramps, kerbs), the blend zone of the two paving frames reads slightly soft.

**Rules agreed with the owner (keep):** every new asset gets a lab in `labs/` first and goes into the city only after
the owner approves it there; panels and labs use our own `viewer/panelUI.js` (never lil-gui); game-engine-v1 is
read-only (copy into `vendor/` with ORIGIN.md); measure GPU ms before / after (stats line, `viewer.gpuStats()`).

**Open owner decisions / inputs:**
- The fly-mode bird: the current model (repainted peregrine, original clips only) is weak; the owner is looking for a
  better rigged, animated peregrine falcon (CC0 / CC-BY) to drop into `models/bird/` (+ `bird.json`). Then:
  takeoff / landing clips. Procedural flight layers are off (`?birdlayers=1`).
  [x] The falcon family at Saint-Job (branch claude/falcons, `docs/FALCONS.md`): eyrie, eyases, the adults' behaviours,
  fly mode from the nest; on by default. **Owner to look** in `labs/falcon-lab.html`. Left: a better rig would lift the
  perched / eyas shapes most (they are poses baked on the old rig), spatter round the eyrie, a pigeon flock to stoop at,
  calls, preening / brooding idles.
- Setts: procedural is the default; the Poly Haven scan stays as `?setts=tex` for a later texture pass (KTX2).
- Volumetric fog is opt-in only (`?vfog=1`, dev panel) until it is tuned.
- Tree impostors off (`?impostors=1`) until 16x16 views + depth atlas.

## Third-person character (Capsule Lab, branch claude/capsule; waiting for the owner)
- [x] `viewer/character/`: kinematic capsule controller (120 Hz fixed step + interpolation, collide-and-slide, step-up
      by rolling over walkable edges + an explicit up-forward-down step, ground snap, slope limit, coyote / jump buffer),
      spring-arm camera with collision (shoulder ray + 5 probe rays, snap in / ease out, capsule fade), the character
      slot (`body.setModel(gltf, { clips, walkSpeed, runSpeed })`), collision world: own triangle BVH + footprint prisms
      (48 m cells, after claude/drive's colliders.js) + heightfield. Zero allocations per step (checked: 0 GCs in 200k steps).
- [x] `labs/capsule-lab.html`: test course + 30 scripted tests (T), benchmark, tunables, debug draw. Screens: `docs/capsule/`.
- [x] City test hook `?view=third` (I6, Place de Saint-Job): roads BVH from the tile's road meshes, UrbIS footprints,
      trunks, lamp posts, terrain. `?chardebug=1` = debug draw.
- [x] A real character in the slot: Quaternius "Hoodie" (Ultimate Modular Men, CC0; also "Casual"), `models/characters/`
      (`tools/characters/convertCharacters.mjs`), merged at load to one skinned mesh + one vertex-colour material (6.2k
      triangles); idle / walk / run with playback matched to the stride speed measured from the foot bones (walk 1.29,
      run 2.93 m/s); the pack has no jump clip: a held run stride stands in for jump / fall.
- [x] Foot IK (`viewer/character/footIK.js`): per-foot ray, two-bone leg IK with the animated knee as pole, foot tilt to
      the ground normal (<= 28°), pelvis drop to the lower planted foot (<= 16 cm), all eased; off in the air, softer at
      a run. ~0.03 ms per frame (whole character with animation ~0.16-0.19 ms). Screens `docs/capsule/ik-*.png`.
- [x] City: tram platforms (in the roads BVH), parked cars + bus / tram shelters (oriented boxes, also stop the camera),
      benches, stop poles, signals, bike racks, tram poles, trunks, lamp posts (body only, the camera ignores them),
      bollards (any InstancedMesh named *bollard*, ready for the roads branch). "Third person" button + dev panel entry.
      Roads BVH + buildings.json + prism hashing in `viewer/character/colliderWorker.js`; the main thread gathers in
      slices of <= 4 ms.
- [x] Cadence: with a character in the slot the controller walks at 1.59 and runs at 4.0 m/s (clip speeds calibrated in
      the lab: 1.38 / 3.15 m/s), gaits blended between those two speeds, playback 1.15x / 1.27x (capped 0.5-1.35x);
      the stance foot slides 0.17 m/s walking, 0.33 m/s running (was 0.5).
- [ ] A jump / fall clip: none on this rig in a CC0 pack. Universal Animation Library 1 / 2 are CC0 (UAL2 License.txt
      checked) but on a UE-style rig (pelvis / thigh_l ...) and UAL2 has only NinjaJump: retargeting needs per-bone
      rest-pose correction. The held run stride stays for now.
- [x] Shelters are their own triangles in the roads BVH (open front, roof at 2.41 m: you walk in); lab test passes.
- [x] Interiors: pilot house (branch claude/interior, `docs/INTERIOR.md`): footprint prism excluded, the cell's collider
      BVH added, own baked lighting (no city shadow map inside: no seam leaks), the character lit by baked ambient cubes.
- [ ] Interior pilot, open: stair / landing too dark, a mirror without reflection, the stringer slit, ~50 ms material
      builds at load, the sun lightmap for one sun direction; then Saint-Job's nave with the same method.
- [ ] City: tram platforms, shelters, benches, bollards and parked cars are not colliders yet; build the roads BVH in
      the tile worker (25-60 ms on the main thread per tile today); a Third-person button in the UI.

## STIB tram model (approved by the owner 2026-11-04, merged)
- [x] T3000 (line 92's stock) scripted in Blender (`tools/blender/tram.py`), loader / LODs / placement `viewer/tramModel.js`,
      Tram Lab (`labs/tram-lab.html`), in the city by default (tramline.js; `?tram=box` = the old boxes). Per tram: LOD0 15.9k, LOD1 5.7k, LOD2 1.35k triangles.
- [x] Owner approved; the model is the default in tramline.js (boxes kept behind `?tram=box` and as the load-failure fallback).
- [ ] Interior (seats, poles) behind the glass; door opening at stops; pantograph height following the wire; the
      window AO / dirt pass; fleet numbers on the nose; T4000 (7 sections) if other lines come.
## Saint-Job hero church (approved 2026-11-04; in the city by default, `?stjob=0` = the UrbIS solid; +0.3 ms GPU, +9 draws at Saint-Job)
Done as planned below (hidden in façades + far LOD via `entry.hide`, kept in the roof grid; one THREE.LOD placed in main.js, shown while I6 is loaded).
Still open: the falcons do not use the `nest` node yet.
Scripted model `tools/blender/stjob.py` -> `models/stjob/` (notes: `models/stjob/NOTES.md`), loader + LODs + materials
`viewer/stjobModel.js`, lab `labs/church-lab.html`. LOD0 38.6k / LOD1 15.0k / LOD2 3.0k triangles, 4 draw calls per LOD,
AO lightmap 5.3 MB (R8 2048² + mips), GLB 4.0 MB (uncompressed).
**How it replaces the UrbIS solid in the city** (after approval):
1. `main.js`: `const stjob = params.get("stjob") !== "0" ? await loadStJob() : null` next to `loadLampModel()`; pass
   `STJOB_BU_ID` ("https://databrussels.be/id/building/1587133", solid buildingsolid/509924) to the tile builder.
2. Hide that building: in `tileData.js` skip every `bDoc.buildings` entry whose `attrs.BU_ID === STJOB_BU_ID` in the
   façade build (facadeGeom.js) and in the far-LOD solids (`buildLiteData`), i.e. filter before both loops; KEEP it in
   `roofGrid` (fly-mode roof collision: the UrbIS envelope is close to the model's). Rebuild the worker bundle
   (`node tools/build_worker.mjs`).
3. Place the model once (it is not per tile, but only while its tile is loaded): `root.position.set(1216.19, 75.40, 561.44)`,
   `root.rotation.y = 0.09225` (values in `models/stjob/stjob.json` "placement"); add `model.make(0..2)` groups and switch by
   camera distance to the octagon (`STJOB_LODS`: LOD0 < 170 m, LOD1 < 520 m, LOD2 beyond); beyond the full-tile ring the
   far tiles' flat solid still contains the church (fine at that distance) — or skip it there too and keep LOD2.
4. The falcons: the glTF node `nest` (church frame (-16.98, 20.95, -14.86), world = rotate by rotation.y + position) is on
   the belfry floor behind the right-hand louvred arch of the tower's outer (NW) face; `spire_tip` = fly-mode start.
5. Materials already read `env` (night glow); check shadows (the shadow box) and the city's fog on them; GTAO is off on glass.
Open: GLB compression (gltfpack -cc / meshopt), interior for the open lantern is just sky-through, the clock dials have
no numerals, the sacristy annex is simplified (3 gabled blocks), windows have no tracery apart from the roses.

## Done 2026-11-04 (details: docs/RENDER_PLAN.md, docs/RESEARCH.md)
Streaming freezes fixed (per-tile shader constants), boot warm-up, Vercel deploy, GPU timer, terrain simplified,
stylized branch trees + depth pre-pass, Firmament sky + haze + night look, every lamp lights the street, foliage /
window bugs (hash of interpolated values), Place de Saint-Job setts, the Blender lamp with LODs, fly mode with the
falcon, labs (Bird, Lamp), the dev panel.

## 0. Check first (needs a real browser with WebGPU)
- [ ] Frame rate on a mid-range GPU with `?ring=1` (default) and `?ring=2`; draw calls, GPU memory.
- [ ] Stutter while tiles stream in (worker is on; remaining main-thread slice: tree field ~350 ms
      on the first tile in software rendering; should be much less after the shared-assets fix).
- [ ] Night-window speckle seen in the software renderer; SSR / GTAO quality; shadow acne.
- [ ] Tram 92 timing against the real STIB app at a known stop (Place Saint-Job).

## 1. Coverage: more city
- [x] **All of Uccle (2026-11-04):** the study area is the commune boundary (OSM rel. 58253) + the
      first box; 120 tiles on a 15 × 12 grid (A1..O12, old G4 = I6, see CONTRACT §3), 25,458
      buildings, 148 MB of tiles. Built in 11 min with 6 parallel `run_tile.py` groups, then
      `build_trees.py` for all (trees need the neighbours' buildings). Road network: 4,531 roads,
      135 refine errors left (was 17 on the small grid) to look at.
- [ ] **The Brussels region** (~650 tiles, ~1.2 GB): a one-command parallel build
      (`run_tile.py --jobs N`), cheaper far tiles, road quality at scale. Do it once Uccle holds 60 fps.
- [ ] Road network: ~12 bad spots left (Alsemberg / Brugmann sharp Y, crowded rings in C4 / F2;
      `node tools/check_roads.mjs --all`).

## 2. Streaming and performance
- [x] Far LOD (`?far=`, default 3): orthophoto-draped 4 m terrain + flat-coloured solids, 2 draw calls
      per tile (`buildLiteData` in tileData.js, `loadLiteTile` in main.js). Next: impostors for far trees.
- [x] Tree assets shared between tiles: streamed tiles now cost 20–115 ms main-thread work each
      (first tile ~265 ms, it builds the shared assets).
- [x] Road marking atlas R8 at half resolution (8x less GPU memory, e.g. 20 MB -> 2.5 MB).
- [ ] Unload by distance with hysteresis; cap GPU memory; a loading indicator.
- [ ] One shared terrain / ground material for all tiles (bounds as uniforms), fewer shader variants.
- [ ] Profile and cap point lights / shadow casters at night.

## 3. Assets from Blender (see `docs/BLENDER.md`)
- [ ] Kit: window frames with real depth (3–4 Uccle types), doors, cornices, balconies, dormers,
      chimneys, shopfronts, gutters / downpipes; trim-sheet textures; LOD0–2 each.
- [ ] Vehicles: STIB T3000/T4000 tram, 4–6 car body types, a STIB bus; LODs.
- [ ] Street furniture: Brussels lamp post types, bins, bollards ("potelets"), benches, bike hoops,
      STIB shelter and pole, signs.
- [~] Hero landmarks: Saint-Job church done in the Church Lab (see "Saint-Job hero church" above), waiting for approval; then other recognisable buildings.
- [ ] Export glTF + meshopt + KTX2; load once; place with InstancedMesh / BatchedMesh.

## 4. Buildings
- [ ] Shop names on fascias (text atlas from OSM `name`).
- [ ] Gable attic windows, dormers, balconies, bay windows (common in Uccle).
- [ ] Garage doors on street faces of detached houses; garden walls and gates.
- [~] Church: superseded by the scripted Saint-Job model (drum oculi, lantern, materials from the photos) once approved.
- [ ] Optional interiors: hand-made for a few buildings (church, a café, a shop); procedural
      rooms for others, generated only near the player.

## 5a. Place de Saint-Job and other squares (owner photos 2026-11-04)
- [x] Place de Saint-Job: setts plaza instead of grass, its streets setts (data/overrides.json, viewer/plazas.js).
- [ ] Fold data/overrides.json into the pipeline on the next full rebuild (raw data not on this machine).
- [ ] Other squares and pedestrian areas: fetch OSM `amenity=parking`, `area:highway`, `highway=pedestrian` areas,
      `place=square` (Overpass was overloaded on 2026-11-04) so no square falls back to grass.
- [ ] Setts look pass 2: rounder, less regular stones, slightly less blue; parking on the plaza itself.
- [x] Brussels swan-neck street lamp (dark green, white globe): Blender, in the city with LODs (Lamp Lab).

## 5. Ground, vegetation, water
- [ ] UrbIS Land cover (CC0) for gardens vs paving vs lawns; driveways, terraces.
- [ ] Hedges along garden edges; flower beds; low walls.
- [ ] Trees: real species from the Brussels street-tree inventory if published; seasonal colours,
      bare trees in winter; tree LOD / impostors.
- [ ] Real water surfaces (ponds in parks) with reflections.

## 6. Traffic, transit, life
- [ ] Live STIB positions (VehiclePositions feed, Belgian Mobility platform; key + small CORS proxy).
- [ ] More lines: trams 4, 51, 97, buses (`pipeline/build_transit.py --line N`); the viewer is
      wired to line 92 only.
- [ ] Waiting-time display at stops (WaitingTimes feed).
- [ ] AI traffic on the road engine's lane graph; traffic lights in sync; pedestrians on sidewalks.
- [ ] Tram vehicle sound, bells; ambient city sound; church bells on the hour.

## 7. Atmosphere
- [ ] Real sun position for date and time (Brussels lat/lon); the clock shared with the trams.
- [ ] Weather: rain (wet roads, puddles, drops), fog, snow; clouds moving.
- [ ] Seasons for trees and grass.

## 7b. Winter (owner, 2026-11-04: "it's going to snow in a month")
- [ ] A winter version: snow on roofs, ground and kerbs (slope- and exposure-aware), bare deciduous
      trees (branch skeletons already exist), winter sun path (Firmament `?day=` ~350), low sun, frost /
      wet roads, falling snow. Switchable by date or a preset.

## 8. Game / app
- [x] Driving (branch claude/drive): Car Lab + drive mode, arcade car on the drivable-surface grid, footprint / island /
      trunk / lamp colliders per tile (viewer/drive/, `?view=drive`). Next: parked cars and trams as colliders (oriented
      boxes), car-vs-car (slop vehicle-physics.js SAT), per-wheel ground (one wheel on a kerb), engine / tyre sound,
      headlight beams at night without adding scene lights (light count change = shader recompiles), the Blender car
      replacing the parked boxes (instanced LOD1/2, colour per instance).
- [ ] Modes: walk, bike, drive, drone / photo mode; minimap with real street names.
- [ ] Missions or uses: deliveries, taxi, "find this place", time slider (historic maps).
- [ ] Multiplayer (later).

## 8b. Dev panel (owner, 2026-11-04: "a better dev panel, well organized")
Replace the left HUD with a collapsible, tabbed panel (lil-gui folders, state in the URL so a view can be shared):
- [ ] **Time & sun**: time of day slider (Firmament's real sun, Brussels), date / day of year, time speed, freeze;
      presets (golden, midday, misty, twilight, night).
- [ ] **Sky & clouds** (Firmament params): coverage, cloud type (stratus..cumulus..storm), base / thickness, wind,
      cirrus, haze, aerosols, sun size; exposure (auto, EV bias, night EV).
- [ ] **Weather**: volumetric fog (on, density, layer top, falloff), rain / wet roads (later), snow (winter, later).
- [ ] **Lighting & post**: lamp pools on/power, near lamp lights, AO / SSR / bloom / haze toggles and strengths,
      shadows (on, resolution, distance), colour grade.
- [ ] **World**: tiles ring / far LOD, layers (terrain, buildings, roads, trees, props, tram, cars), tree mode
      (stylized / slop), impostors, LOD distances.
- [ ] **Camera & modes**: orbit / walk / fly, teleport (Saint-Job, Wolvendael, ...), fly speed / camera distance,
      field of view, photo mode (hide UI, screenshot).
- [ ] **Performance**: fps, GPU ms (avg, p95), per-pass GPU times, draw calls, triangles, GPU memory, shader count,
      a 10-second benchmark that logs the three standard views.
- [ ] **Debug**: wireframe, normals, LOD colours, light map / land cover overlays, the dev log.

## 9. Housekeeping
- [ ] README: update for the worker build (`node tools/build_worker.mjs`) and new URL params.
- [ ] CONTRACT: document `data/transit/*.json`, features `shop` points and `platform` lines.
- [ ] Tests: road check in CI, a headless screenshot smoke test.
