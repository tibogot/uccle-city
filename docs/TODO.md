# Everything still to do

> Continuing in Cursor / another Claude session? Read **`HANDOFF.md`** first (setup, rules, how to run). Look + performance plan: **`docs/RENDER_PLAN.md`**.

One list of all open work, roughly in priority order. `HANDOFF.md` says how to run things;
`docs/PLAN.md` has the history and details of what is done. Rule of thumb for every item:
**look better without costing frame time** (instancing, shared materials, LOD, compressed assets).

## CURRENT STATE (2026-11-13) — read this first

**In the city by default** (claude/foundation, NOT pushed to Vercel; `?x=0` turns one off): measured roads v2
(rounds 1-4, traffic on the lane graph), the facade kit, the material library (best set per material), every landmark (Saint-Job, town hall +
flags, Stalle, Van Buuren, Wolvendael + pond, police, Calevoet, Saint-Pierre, Observatory), trains + 3 hero bridges,
tram 92 v2, falcons, city trees off the roads + the tree impostor kit, colliders from what is drawn, the minimap,
the fixed lamp-light pool (no more long freeze), the FALCON FLIGHT as the fly mode (2026-11-13: streaming world, landmark
 proxies, pigeons on the Place; `?falcon=old` = old flight). **Lab-only, merged:** night lights, sound,
weather + seasons, foliage, pedestrians, street life, car impostors, police car (branch), Material / Tree labs.

**Owner 2026-11-13 (seen in the city):** traffic cars TURN in a blocky way at some corners (not a smooth arc): check the
lane-graph turn connectors + the car's heading interpolation after the perf audit (roads round 4 note: "tight lane
connectors"). FIXED 2026-11-13 (trafficGraph.js roundKinks: the lane network smoothed as one graph around sharp vertices / joins; I6: sharpest vertex 162 -> 40 deg, joins > 30 deg 90 -> 43, of which only 16 at joins that really touch). Owner: look at a daytime turn. FOUND: 48 "next" links on I6 (73 on H5) join a lane end to a path starting 3.6-19 m away (a car following one jumps): roads-engine lane graph, for the roads work. Turn radii down to 1.5-2 m on a few connectors (u-turns / tight corners).

**Merged 2026-11-13: ROADS ROUND 5** (docs/roads/ROUND5.md): lane links all touch (6,595 gaps -> 0, 120 tiles), turns
eased (p10 radius 2.4 -> 4.0 m; 1,756 connectors still < 5 m, E4 roundabout ring ~1.3 m), junctions back on the DTM
(D10 1.27 -> 0.14 m), terrain welded up to road edges (edges > 30 cm over ground 183.5 -> 12.5 km; terrain tris +4-14 %,
worker +60-140 ms/tile), Verrewinkel SE 0.15 -> 0.01 m, Edith Cavell centre line removed (data/overrides.json).
With the turn smoothing: I6 sharp joins 90 -> 10. KERB GAPS re-counted 2026-11-13 evening (tools/road_audit, C19
gap): I6 1, E4 2, H5 / D10 / G10 0 (the 163 of round 4 is stale: later rounds closed them); the 3 spots (I6 1416, 901
bulb-out tip; E4 -632, -254 sidewalk wedge tip) LOOKED AT: the kerb runs round both, checker false alarms at acute
corners (C19 samples 0.75 m). SEEN THERE (E4 -634, -256): the two recycling bins stand on BLACK SQUARES (a missing
texture / decal under them?) - to check. Walker on the ballast: fine (walk Y = carved + 12 cm = 6 cm OVER the crest). BRIDGE DECK PAINT: not needed, the road stage draws its own surface + paint on the OSM
decks (Carsoel seen from above: lane lines, tram rails, parapets). Left: the BRUSSELS REGION BORDER (DONE on
claude/horizon 2026-11-13, docs/HORIZON.md: the Flemish DTM DHMV II fills the 20 border tiles, roads > 5 m over the
terrain 23,136 -> 2,574 vertices; left: the Linkebeek sunken lanes E10 / F10 and two D10 junctions, road engine grade rule); D10 (-1018, 2722) 3 m earth wall needs a retaining wall; G10 (481.5, 2751.3) one ledge;
engine-only roads 5-12 cm over the ground; a few lanes still have one sharp vertex (I5 103 deg, I7 74 deg).

**Merged 2026-11-13: FALCON ROUND 2** (docs/FALCON_FLIGHT.md "In the city", docs/falcons/city2/): tree crowns are
obstacles (hit / brush / perch on crowns), flying under the Saint-Job / Calevoet / Verrewinkel arches, chase camera never
hides the bird, weather wind hook (`window.__weather`), pigeon flocks at Place Jean Vander Elst, Parvis Saint-Pierre,
Parc de Wolvendael (2 nearest drawn), Saint-Pierre tower collision, ridge perches off the chimney ends, fog thickens
120-400 m up; flight CPU median 0.2 ms, 0 pipelines mid-flight. Left: the brown band below the horizon seen 500-650 m
up (needs lighting.js: sky below the horizon in the fog colour, or a wider far ring while high); the street test's
autopilot cuts a corner; a real-time foreground run on a quiet GPU; the city has no running Weather yet.

**Merged 2026-11-13: GROUND TEXTURES** (docs/materials/GROUND.md): 7 CC0 scans (ambientCG / Poly Haven: lawn, rough,
dry, beech litter, gravel, soil, sand) in 2 KTX2 arrays (18 MB), hex anti-tiling, height blend between covers, far blend
to the orthophoto, one shared shader; `?groundtex=0` = procedural. Left: COST at street level +0.3-0.5 ms where two
covers meet (lawn alone +0.14; target <= +0.2: cuts listed in GROUND.md); the road engine's own VERGE strips and park
FOOTWAY meshes are still procedural (roadPaint.js: the flat bright verge seen from a car); grass type by noise, not by
OSM kind (park / garden / pitch); no WebP fallback; grass-blade shimmer in the nearest 2-4 m (the Grass Lab will cover it).

**Brown band under the horizon from 500 m up:** (1) DONE 2026-11-13: the sky's floor beyond the city now has Uccle's mean
orthophoto colour (lighting.js groundAlbedo #686c67, `?skyground=old`): grey-green haze instead of brown; still a flat plane; (2) BUILT on claude/horizon (2026-11-13, `?horizon=1`, off by default, docs/HORIZON.md): a 32 km
"horizon ring" landscape (20 m heights from DHMV II + Copernicus GLO-30, orthophoto colour, one mesh, dithered hand-over to the tiles); GPU cost to re-measure on a quiet GPU. Sky + clouds rework later.

**FIXED 2026-11-13 (afternoon): the car / walker no longer fall at the Saint-Job station bridge.** Cause: the DTM is bare
earth and only the hero bridges had a deck; every OSM road bridge (13 in Uccle: Carsoel, Waterloo, Merlo, Chênaie,
Tilleuls, Hospices...) followed the cutting. Now viewer/streets/bridgeDecks.js: a deck per OSM road bridge (road ground,
world deck for walk / car, a drawn full-width slab with parapets = car walls; the tram-only deck skipped under a road
deck). H6 drive + walk routes: 0 falls. RAILWAY FOR CARS DONE (2026-11-13 evening, `?railcar=0` = before):
viewer/rail/railData.js railDriveSurface: the drive grid on the line = rail top - 2 cm over the crest, the ballast
shoulder down to the bed (never lowers a road; not on bridges): 1,762 / 1,812 track points within 5 cm of the rail top
(was ~25 cm under, rails through the wheels); railFences: car walls 3.2 m out where the line is on the ground / in a
cutting (none on bridges, over a tunnel (DTM > 3 m above the rail), between paired tracks, in platforms, or within a
road's half width + 2 m: level crossings and road bridges stay open), DRAWN as a welded-mesh fence (railway.js fence
material: posts 2.5 m, filtered wires, alpha-to-coverage; one strip per tile). I5 / H6 drive routes identical with
and without (I5 52 routes 1 old fall, H6 47 routes 0 falls). Rails as bumps: not done (1 m grid; the car rides the
rail top instead). The decks are plain concrete (no paint / kerbs on
them yet). The test's "over the drawn surface" reads the deck's underside (constant 0.93 m): a checker blind spot.

**WAS (owner, 2026-11-13, live after the push): in drive mode the CAR FALLS THROUGH THE BRIDGE at the Saint-Job train
station instead of driving on it.** Suspects: the drive surface on a deck (collisions audit: two-layer drive surface;
roads round 5: roadDeckPins / terrain weld; trains: the deck height function `world.deckY`), or the tram-only bridge
deck over the L26 cutting (fixes1) being driven onto. Reproduce there, check `viewer.collisionTest` on that tile.
Owner's screenshot (same day): the car ends up DOWN IN THE RAILWAY CUTTING, sunk into the ballast with the rails through
its wheels. So four things: (1) the drive surface / parapets on the bridge deck (it must not fall); (2) the railway
must be closed to cars (fences / the cutting's banks as walls: real tracks are fenced); (3) on the track bed the car's
ground is the carved terrain under the ballast, not the ballast top (drive surface must include ballast + platforms);
(4) rails are not obstacles / bumps for the car. Test every bridge (Saint-Job, Calevoet, Verrewinkel, the tram deck)
from both directions, not only this one.

**ALIASING part 2 (2026-11-13 evening):** far view (1223, 125, 650 -> 1153, 80, 540) heat map: the blinking pixels
are TREE FOLIAGE and the Saint-Job church's white stone bands (hard step in stjobModel.js), not the façades. Church
bands box-filtered (filteredPulse, `?bandaa=0` = before): church region 131 / 130 -> 40 / 44 ppm, full frame ~415 ->
~240. Geometric specular AA on walls / roofs TRIED and DROPPED: full frame 239 / 242 with vs 237 / 244 without, houses
100 / 95 vs 98 / 102 (no gain, so no cost added). Left: tree foliage shimmer far away (the biggest share now):
measured 2026-11-13: the leaves are 73 % of the far view's blinking (343 / 344 ppm, 92 / 93 with them hidden). TRIED
in treesStylized.js (not kept): the coverage ramp widened with distance (x3 at 200 m) -> 483 / 485 ppm (worse: partial
A2C coverage changes its sample pattern every sub-pixel move); sharpened (x0.4) -> 333 / 329 (-3 %, noise). The cause
is sub-pixel leaves, not the cut. Real options (owner's call): TRAA (r187, ghosting risk + GPU cost), impostors from
nearer than 400 m (they were moved out from 90 m for the look), or a coarser far LOD (fewer, bigger cards; vendor tree
code is read-only, so in our LOD build).
**ALIASING FIXED, part 1 (2026-11-13, 620d31e): relief heights box-filtered over 3 px in facades.js (the bump normal no longer flips per pixel); flicker 199/203 -> 40/41 ppm on the test view; `?relief=1px` = before. Left: the kit walls' hard discard edge (maskNode step(0.5, opening)) if it shows; brick normal-map shimmer far away (specular AA); glazing bars (barX / barY) not footprint-filtered.**
**ALIASING DIAGNOSED (2026-11-13 afternoon, Rue du Ham I6 brick building, oblique 4-6 m view, kit on vs ?kit=0
identical):** the scene pass HAS 4x MSAA (renderer.samples 4, post.js sceneRT); those windows are PAINTED by the facade
shader (facades.js), not kit geometry, so MSAA cannot smooth their frame outlines: stair-steps at grazing angles. The
dashed bright line under the sill shows in both modes (a thin edge at a grazing angle). Brick scan fine up close. FIX
NEXT: box-filtered (filteredPulse / boxCoverage, Mr.doob) frame / mullion / sill lines in facades.js's painted windows,
specular AA on the wall + sill, then the flicker test on this view (cam (1179.1, 81.4, 553.3) -> (1175.9, 82.8, 549.8)).
**ALIASING on facades (owner screenshot 2026-11-13, "do it when I'm back"):** jagged window-frame edges + sparkly
brick mortar / a bright thin line on the sill. Plan: (1) diagnose: painted window (facades.js) or kit geometry? is the
scene pass MSAA (post.js sceneRT samples = renderer.samples) really resolving through the MRT chain? (2) painted frames /
windows: Mr.doob's filteredPulse / boxCoverage (as roads round 4 kerbs: 45 -> 4 px); (3) brick mortar / highlights:
specular AA (Tokuyoshi-Kaplanyan, as on the facade kit), library textures' mips + anisotropy; (4) optional TRAA (three
r187 TRAANode) in a lab only if no ghosting; (5) the flicker test before / after on that wall.

**DOUBLE-SIDED BUILDINGS: DONE (2026-11-13).** Cause: pipeline/build_buildings.py turned walls "away from the
centre" (wrong on every concave house) and every roof up. tools/orient_buildings.mjs (ray parity against the
building's own mesh, ahead vs behind, 3 jittered lines; undecided walls by the footprint) re-wound 85,211 of 788,136
wall and 4,123 of 441,337 roof triangles in all 120 buildings.bin (idempotent: a 2nd run flips 0); manifest re-stamped.
Walls + roofs FrontSide, shadowSide FrontSide (r187 casts a FrontSide material's BACK faces, and the solids have no
floor: holes); `?bldside=double` = before. Checked: L-house I6 (1096, 747) old vs new identical, sunlit brick no acne,
console clean. GPU gain to measure on a GREEN preflight (perf follow-ups). main.js:201 DoubleSide = tram rail strips,
left. Re-run the tool after any build_buildings.py run.
**FRONT GARDENS ROUND 2 (claude/gardens2, 2026-11-14): ON by default (`?gardens=0` off, `?gardenhedges=0` no hedges).** docs/assets/GARDENS.md "Round 2". Lawn strip: `viewer/surfaces.js smoothCurves` bowed long straight OUTER-edge pieces next to short corner pieces up to 0.75-1.3 m into the sidewalk (I6 Alphonse XIII); fixed (+ worker bundle) and the builder now places on the surfaces as drawn (tools/gardens/drawnSurfaces.mjs): segments with > 0.3 m of lawn 286 -> 10 on 9 tiles; all 120 garden tiles rebuilt on the new terrain; JOINS 0 floating (hedges included). Look check (Street View look-only + Commons, cited): villa streets are hedge streets -> hedge-heavier mix, a low wall + hedge front, taller villa walls. Mesh audit 0 blocking (27 ironwork pieces x LODs after Blender fixes; JS pieces). Hedges = instanced modules in the kit's pools (4 draws city-wide; +6 draws / +52k tris / ~0 ms at street level vs ~+75 draws / ~400k before). Cost at street level +36 draws / +0.22 M tris / +0.46 ms GPU (A/B under a RED preflight: another agent on the GPU); reference view: nothing drawn. LOD flight 0 pops. Collisions: walls/hedges solid, D8 21/22 and I6 39/52 open gates walkable. Left: GPU ms on GREEN; gates behind steep gardens (no front steps) and a 10-20 cm lip at the sidewalk's back edge where the garden is higher; a neighbour's pillar in some openings; mesh-panel / wooden fences, rubble-stone walls, ball finials, ivy; driveway paving; 12 MB data to compact. Raw Overpass extracts: data/raw/osm/barriers.json, forecourts.json (ignored, in the main checkout).
**SQUARE BENCHES (2026-11-14):** F5 Dieweg turned out orderly (that square is a UrbIS MEDIAN, class 6: its benches share two directions); the screenshot read was perspective. Rule added anyway (tools/furniture/build_furniture.py square_yaw): a bench on a measured square (class 4), > 3 m from the kerb, without OSM direction sits parallel to the nearest square edge looking in: 25 benches in D3 D4 E4 F4 F9 H1 I4 (total still 215). To look at in the browser. Also from that round: bench LOD1 wood 3-10 % darker than LOD0 (a faint hand-over), 80 hoops without room on narrow sidewalks.
**DONE 2026-11-14 morning:** invisible parked cars (ROAD_FIX3: 0 / 0 city-wide), falcon roof collisions + G view, terrain seams (all 120 rebuilt, exact), car fronts / tail lights / wall dashes / bin squares (VISUAL_FIXES.md), the two rail tunnels (TUNNELS.md). Follow-ups: tunnel brick too pale and clean vs the real sooty brick, bare embankments (ivy, trees), tunnel road too bright inside (no baked shade), the collision test should drive one-way streets one way, the G5 tram-platform edge ramp (car rides it 0.3 m), car bodies still blocky up close (a lofted body like Mr.doob s), the white saloon parked on the sidewalk at (1136, 690).
**FRONT GARDENS round 2 merged (2026-11-14) but OFF by default (`?gardens=1`):** driving test at 14 m/s along Alphonse XIII / Boulenger (I6), return run: frames > 33 ms 31 with gardens vs 2 without, p95 31 vs 23 ms (the pool gather: 1.5-4.7 ms of main-thread CPU every 2 m of camera travel). Fix: spread the gather over frames / do it in a worker / bigger hysteresis, then measure again and switch ON. The look is good (Alphonse XIII: wall meets the sidewalk); the hedge texture looks speckled close up (check its flicker).
**OWNER PLAYTEST on the Vercel deploy (2026-11-14 morning, https://uccle-city-pipeline.vercel.app/, 7 screenshots):**
(1) INVISIBLE PARKED CARS: with G (collider view) many parked-car collider boxes stand where NO car is drawn ("way too
many places with invisible cars"): find why (parked cars dropped or hidden by LOD, the furniture kit's bike boxes in
parking lanes dropping parked cars, keep-clear filters...) while their colliders stay: colliders must come from what is
drawn. TOP PRIORITY with road round 3. (2) Collisions feel off in general; the FALCON should also show its collisions
with G; the falcon gameplay feels weird. (3) Car tail lights: grainy, sparkling red (shader / aliasing on the light
texture). (4) Blank party walls look empty, with aliased dashed black lines on them (facade details or wires?).
(5) Many building TOPS look empty / unfinished (roof furniture, parapets, chimneys, roof details). (6) The petrol
station (Lukoil) looks far too cheap; there are several in the city: a PETROL STATION KIT (canopy, pumps, shop,
signage, our own brand look). (7) SQUARE DES HEROS done far too cheaply: make it a hero plaza. (8) SHOPS far too cheap
(flat fronts with a name): realistic shopfronts, some with an interior; restaurant TERRACES around Place Saint-Job.
(9) Check whether some of these are solved in labs not yet in the city (docs/INVENTORY.md). (11) LAST IN THE QUEUE
(owner): the new ROBOT CHARACTER from the owner's other chat (branch claude/character2, Y Bot / Mixamo locomotion):
make sure it works in the city with all its animations (third person: walk / run / stairs / slopes / foot IK,
collisions), then see whether it can be swapped for another character. The other chat is still working on that branch:
test it in a separate worktree, report what works / breaks, and do NOT modify or merge claude/character2 without the
owner. (12) SNOW (owner: "it will soon snow here"): real procedural VOLUMETRIC snow in the city: smooth, never blocky
(accumulation on roofs, ledges, cars, trees, ground; drifts; falling snow; melting / slush on roads); start from the
existing viewer/weather/ (snowLayer.js, snowExtras.js, precipitation.js) and the weather lab; check Mr.doob / three.js
examples and real snowy Brussels photos. (13) BLOCKY parts in the city (owner): find and smooth them. (14) HOUSES
SUNK INTO THE GROUND (owner): find them, compare with real images / Street View, fix at the source (building bases vs
terrain). (15) While comparing with real images: list important things we forgot to build. (10) CAR FRONTS "all
look wrong" (screenshot: the blue faceted hatchback, faceted:hatch_c): the nose reads flat and squashed: the bonnet
runs straight down into a shallow bumper, tiny headlights at the corners, a low flat grille, hard bright bands across
the bonnet facets (flat shading / normals?); check the front geometry and normals (inverted or wrongly smoothed
faces?), headlight / grille proportions vs real hatchbacks, and compare with Mr.doob's cars (slop-newyork) to see
whether his have the same issue.
**ROAD FIX ROUND 2 (planned 2026-11-14, start after the owner's test drive; inputs: docs/collisions/DRIVE_FIX.md + the owner's notes):** (1) Linkebeek rough junctions still up: level them to the lowest point of their lanes (E10 Rue des Sables / Rue de la Station (-870, 2875): a 2 m sidewalk drop for walkers; F10 Kleindalstraat corner, the OSM tunnel part left as is); (2) D10 Brasserie / Vieux Chemin junction 1.9 m up + the earth wall (-1018, 2722); (3) bridge ends: Bourdon deck end 1.4 m over the next junction, the Waterloo bridge foot against a 3 m bank, J5 slab end 0.41 m over the sidewalk (tapering the deck ends made D9 / E10 worse: find another way); (4) G7 alley drawn 7 m above the railway with open drops; (5) D5 / F3 alleys into closed building passages; (6) G2 OSM tram platform across a lane; (7) Kauwberg underpass cobbles riding up the banks; (8) the tile N-S edge rows 3-9 cm apart (up to ~1 m steep: pipeline/build_terrain.py mosaic resample; needs a rebuild of all 120 terrains + manifest stamp); (9) a city-wide WALK pass (debug/cityAudit.js walk:true) before / after. Then a GREEN perf re-check.
**ROAD FIX ROUND 2 DONE (2026-11-14, docs/collisions/ROAD_FIX2.md):** drive invisible 27 -> 18 (stuck 13 -> 15, explained), first city-wide WALK pass invisible 119 -> 75. Left: scripted TUNNEL models for Kleindalstraat (E10 / F10) and Rue de la Brasserie (D9): OSM tunnel=yes under 11-15 m rail embankments; REBUILD all 120 terrains with `pipeline/build_terrain.py --resample exact` (tile N-S edges up to 0.95 m apart; needs the Flemish DTM re-downloaded, then building bases, track heights, tree filter, horizon mesh rebuilt, manifest re-stamped: steps in the doc); the Churchill roundabout merged into one node (routes cross the island, G2); deck widths narrower than the measured sidewalks (J5 walker); lane offsets at tight alley corners; E10 sidewalks 0.3-0.4 m over drawn banks beside the lowered junctions; road vertices > 1 m over the terrain went UP on H2 / G9 / F9 (junctions raised to their lanes: sidewalk edges over banks); D5 building passages closed in the building data; F3 stray collider; GREEN perf re-check.
**KAUWBERG UNDERPASS COBBLES (seen 2026-11-13 evening, docs/trains/compare/r2_kauwberg_city_after.jpg):** the cobbled street under the new Kauwberg rail bridge rides up the banks in a jagged saw-tooth (the road surface follows the bank instead of stopping at a kerb / wall). Pre-existing (before the bridge too), now very visible: roads round (surface clip at the underpass walls). Also from the horizon round: Linkebeek sunken lanes held 8-9 m up by the 12 % grade limit, two D10 junctions 1.5-1.8 m up, tile N-S edge rows 3-9 cm (up to ~1 m steep) apart.
**SAINT-JOB CHURCH STAIRS (owner, 2026-11-13):** the character walked THROUGH the entrance stairs instead of up them
(last seen before today). Check after the character-physics work (owner's other chat): the stairs as walk steps /
colliders in the hero model's collision.
**(was) DOUBLE-SIDED BUILDINGS (owner question 2026-11-13):** the UrbIS walls + roofs (facades.js:176, :484) are DoubleSide
("some UrbIS faces are wound inward"); details, kit and heroes are front-only. Fix: orient every wall / roof face
outward at build time (footprint winding / normal vs the building's inside), then FrontSide + the mesh checker (no
missing wall). Gains: the sun shadow pass (26-40 % of the GPU) stops drawing back faces; correct lighting on inverted
faces; the checker sees real holes again. Also check main.js:200's DoubleSide overlay.

**GRASS MERGED (2026-11-13, fdab0c0; `?grass=1`, default OFF until the owner says on):** docs/GRASS.md. Compute +
3 indirect LODs, types from OSM / surfaces, field bake, sun-side lighting, seasons, push API. City D8 lawn +0.47-0.81 ms
GPU (YELLOW preflight). Coordinator check: D8 walk 60 fps, lawn + shadows, clean edge at walls, console clean; grass off
= no cost. Left: blade-tip shimmer 1,013-1,114 ppm vs 286 without (single pixels at the tips: needs tip AA / fade);
grass-type painting 38 ms per tile on the main thread -> the worker; landmarks as grass solids; flower meshes; wire
the car / walker / falcon into the push field; re-measure on GREEN. CHECK: Uccle's biggest OSM meadow (G7, osm:w96769197,
5.3 ha, centre ~210, 1179) shows forest floor + trees, no grass (woods polygon over it, or the meadow loses to woods);
G9 meadow (Avenue Dolez, ~352, 2070) does grow grass. Owner wants a "nice fluffy grass field" to try: give the owner one
verified meadow / park link (walk mode lands on the nearest road, so pick a road beside the field).
**(was) PAUSED (agents):** GRASS LAB (`claude/grass`, port 8849, started 2026-11-13 ~07:15; PAUSED ~07:40 at 89e5dde, design
settled + OSM grass kinds + the per-tile grass-type map written, nothing rendered yet; resume from docs/GRASS_RESUME.md
on the branch): our own grass (Revo / engine
Hybrid as references), `labs/grass-lab.html` with a front-garden street, Wolvendael lawn, a roadside verge; types from
land cover, clean edges, shadows, night, seasons, push field, no popping; <= 1 ms at street level (preflight); city hook
`?grass=1` opt-in only if the budget holds.

**Decided 2026-11-13 (owner): OUR OWN GRASS for the city, after the ground textures merge.** Examples to learn from, not
to copy: alezen9/revo-realms (MIT: compute + wrap tile + indirect draws, ~1.28 M blades), game-engine-v1's Revo port
(`v3/render/grass/revoGrassSystem.js`: painted density, push field) and Hybrid grass (`hybridGrassSystem.js`: measured
~3x cheaper than per-vertex grass, 6 draws vs ~400), the off-road game's "fluffy" Revo meadow look. Ours: the Hybrid /
Revo engine room + the fluffy density + Uccle-specific types from land cover (mown lawn, park grass, dry verge, meadow
with flowers, sparse under trees), clean edges at kerbs / paths / walls, tree shadows, night, seasons, push field (car,
walker, falcon), blades thinning into the ground textures with no popping. Budget <= 1 ms on the RTX 4050 at street
level (quiet machine, preflight green). Grass Lab first (front-garden street, park, verge), then the city. Engine files
copied unchanged into vendor/engine if reused (engine stays read-only); MIT credit for Revo.

**Merged 2026-11-13: STREET LIFE IN THE CITY** (`?streetlife=0` off): 524 real shop names, windows, awnings, pharmacy
crosses, fuel stations, STIB stops, Villo, bpost, street plates, house numbers; own worker, city-wide prop pools, +11-16
draws at street level, emissive at night. Left: shopfronts sink on sloping streets (Esso Fort-Jaco), some house numbers
behind shop windows, one wall opening for several shops; perf A/B with `?streetlife=0` on a quiet machine; licences
(Brussels Mobility WFS, UrbIS addresses, OSM: show "© OpenStreetMap contributors", re-fetch from overpass-api.de).
Perf audit paused (machine worn: timings drifted); resume on a fresh machine (docs/perf/AUDIT.md "Next").

**Merged 2026-11-13: collisions + joins audit round 1:** colliders from what is drawn (car pass-throughs 32,041 -> 0 over
120 tiles; drawn things with no collider 21,016 -> 512; invisible walls 1,085 -> 254), landmarks + bridges collide by their
own model, walk mode has collision (one world with third person), cars refuse steps > 0.5 m, no floating under overpasses,
pond slows the car, JOINS check `viewer.contactAudit(...)`, Verrewinkel ends closed (`?colfix=0` = before). Left: JOINS
on Saint-Job + Calevoet bridges, Observatory, Van Buuren, Calevoet station, Stalle, and roads on all 120 tiles
(`docs/collisions/roadsrun.js`); 70 road ledges for the roads work (`docs/collisions/road_ledges.txt`: D10 road floating
1.4 m at (-1265, 2663), G10 sidewalk 0.43 m over the lawn at (148, 2677), Verrewinkel SE still 0.1-0.2 m low); 391 small
detail clusters without a collider; the walker wades onto the pond bed; +0.5-1.2 s worker time per tile.

**Merged 2026-11-13: fixes1:** tram on one smooth track profile + a bridge deck over the L26 cutting (`?trackprofile=0` old),
clean-buildings pass (facade details -96 % blocking, no eaves gutter line, faces wound right), garage door in the kit (not
placed), far forest softer, adaptive shadow filter. Left: buildings audit not at 0, dotted gable-top line, cascaded
shadows, garage placement (UrbIS CR42L), grey veil over the far woods at 1.2-1.5 km, road humps under the rails, GPU cost
unmeasured (quiet-GPU audit).

**Next, in order:**
1. Falcon in the city, left (docs/falcons/CITY_RESUME.md): a real-time foreground run on a quiet GPU, trees as obstacles,
   fly under bridge arches, pigeons beyond the Place, ridge perch facing a chimney, chase camera clipping the wing, the far-ring edge on a 650 m dive, weather wind, Saint-Pierre spire hit untested.
2. PERFORMANCE AUDIT on a quiet GPU (plan: docs/perf/AUDIT_PLAN.md): shadow pipeline re-created every ~20 s, boot long
   tasks, tile-streaming stutter, draw calls (InstancedMesh2 / BatchedMesh / kit batching / one ground material), blocky
   clouds, mid-range GPU run, re-measure everything measured on a shared GPU.
3. City hookups, one at a time, each measured: night lights, sound (owner listens first), foliage, pedestrians, street
   life, weather + seasons, car impostors.
4. Fine-tuning in the labs: landmarks (Stalle statue + aisle, Van Buuren angles, Wolvendael estimated sides,
   Saint-Pierre / tram noses, Calevoet car-park side, town-hall sparkle, Observatory +0.5 ms), materials factory round 2
   + tree barks / leaves + more species, kit texture-limit slots, decals, tram details.
5. Roads phase 4 (bridges / underpasses as levels) and phase 5 (bumps, manholes, wear, photo review of every tile).
6. Games: police car round 2, then the first game (unmarked police car or the falcon); GeoGuessr-Uccle later.
7. Later: Altitude Cent / Saint-Augustin, the Brussels region, live STIB, multiplayer.

**Waiting on the owner:** Sauvagère + Nekkersgat photos; Megascans download + Fab licence check; Brussels Mobility
email (marking legend); SNCB GTFS agreement (FORM SENT by the owner 2026-11-13, waiting for SNCB's answer); listen to
the sound renders. PUBLISHED 2026-11-13: `claude/foundation` pushed aa07f5f -> 54f3816 (Vercel deploys it) after the
checks (largest file 6 MB, 389 MB deployed in all, a fresh load fetches nothing from the folders .vercelignore leaves out,
console clean); the owner checks the live site. Backup branch `backup/foundation-2026-11-13` = the same.

**Rules learned this week:** JOINS (no open edge / gap where a model meets city ground); a FIXED light count (pools,
never add / remove lights at runtime); merges of shared files are checked line by line (keep-both stacked three tile
entry lines once and silently dropped the facade kit + pond beds).

---
Everything below is the running history (decisions, rounds, details). Items there may already be done: the list above
is the current one.

## OWNER'S MASTER LIST (2026-11-06, newest decisions first; keep this up to date)

**In progress (agents, own branches, lab first):**
- [x] TRAM ON RAMPS fixed on `claude/fixes1` (2026-11-13, waiting for the owner; docs/fixes1/README.md job 1): the tram dived 8 m into the L26 cutting at the tram bridge next to Saint-Job station (deck not in the DTM) and every section pitched on its own; now one smooth vertical profile for all tram tracks (vertical curves, bridge interpolated), a bridge deck, sections hinged like the real vehicle.
- [x] Façade kit ROUND 3 DONE (2026-11-12, waiting for the owner; docs/facadekit/README.md "Round 3"): every piece through the shared mesh checker (`node tools/facadekit/auditKit.mjs`: 0 blocking incl. LEAK, LOD0 + LOD1, 3 opening sizes, run corners), joints sealed (surrounds welded to the reveal, meeting stiles closed, glass tucked, no bevel groove against the wall), scripted far variants as LOD1 sources, packer-made normals + region width, cornices / plinths / string courses MITRED in the shader and joined tile-wide (no end caps in the next wall's plane), specular AA (Tokuyoshi-Kaplanyan / Filament kernel) + the town hall's thin-part filter + Mr.doob's box-filtered patterns, lab on the city's shadow box with closed walls, flicker test in the lab; new pieces: doors Art Nouveau / Art Deco / 1960s (letter slot), garage (not placed yet: no garage openings), window with stained transom, shutters, bay window, dormer, string course, number plate (blank, figures from streetlife). Left: garage placement; number figures; balcony LOD1 1.2k tris; the painted French-window glass behind balconies blinks under motion (facades.js paintedGlass, not the kit).
- [x] Trains round 1 DONE (`claude/trains`, Train Lab, city `?trains=1`; `docs/TRAINS.md`, research `docs/trains/RESEARCH.md`), waiting for the owner: L124 + L26 + the L26/5 chord from OSM fitted to the LiDAR DTM (ballast, rails, sleepers, catenary with AA wires, platforms, the terrain carved under the ballast / filled at viaduct ends); the two hero bridges in Blender (Saint-Job: 55 deg skew segmental arch, scrolls, corbel table; Calevoet viaduct: 3 arches) with photo side-by-sides (`docs/trains/compare/`); the AM08 Desiro in Blender (recessed windows / doors, saloon behind see-through glass, bogies, panto, livery as a palette of named slots); 334 trains a weekday on the real SNCB GTFS (S1, S5, S7, S9, S19, non-stopping ICs), 0 in-view pops in 20 simulated minutes; +0.2-0.4 ms GPU (GPU shared during the test), +27-44 draws. Left (in order):
  - [x] Round 2 DONE: carve + rail meshes in the tile worker (trace: <= 0.85 ms railway per task); Calevoet viaduct rebuilt (5 arches, stepped pale rings, imposts, string course); verges green, St-Job side arches open; AM08 front + bogies as photographed, SNCB yellow; side by sides + frame sequences redone in the city. Bridge street view +0.44 ms (medians, +0.55 mean), overview +0.23 / +0.35.
  - [x] Round 3 (2026-11-07): AM08 nose as photographed (raked windscreen ~33 deg, one black glazed field from the windscreen foot over to the roof in a yellow wrap that follows the plan curvature, rounder plan at the top, grey crash front) and LOD0 band 90 -> 60 m: train band A/B -0.20 ms (medians), bridge street view railway on / off +0.29 ms (medians; GPU shared, noisy). Sheets `docs/trains/compare/am08_*`, frames `docs/trains/frames/*_60m.jpg`.
  - [x] Round 4 (2026-11-07): AM08 nose by OUTLINE FITTING (2 photos solved jointly, rms 3.3 px; tools/fit/am08): nose 1.62 -> 2.90 m, windscreen ~48 deg, front features ~0.4 m higher as measured; outline deviation St-Job 12.9 -> 2.0 px, Calevoet 8.6 -> 5.8 px (`docs/trains/compare/am08_fit_*.jpg`); LOD hand-over smooth, GPU unchanged within noise. Left: pillar edge steps, plough/crash boxes not refitted. Tram (claude/tram2) NOT done in this session.
  - [ ] Re-measure the bridge view on an idle GPU (round 3 ran next to another session's browser: 9-13 ms frames).
  - [ ] SNCB licence agreement for the GTFS before the public site ships `data/transit/sncb-uccle.json` (free, a form to gtfs@sncb.be; see RESEARCH).
  - [ ] Swap the bridges' stand-in brick / stone for the Material Lab library when it is merged (`bridgeModel.js materialFor()` picks it up by slot name, no re-export); weathering closer to the photos (darker headers, soot, repairs).
  - [ ] AM08: curved windscreen glass with reflection, cab interior (desk, seat) behind it.
  - [ ] More bridges: Rue de Stalle (17 m, L124), Kauwberg and Rue de Linkebeek (L26), Engeland (L26 + L26/5), the Moensberg crossings; until then the track crosses those gaps on its ballast alone.
  - [ ] Roads over the line (Carsoel, Waterloo, Chenaie, Merlo, Tilleuls, Hospices): real decks with parapets and the road surface on them (UrbIS level +1 surfaces), instead of the concrete slab at the DTM. Verrewinkel DONE as a hero (`claude/verrewinkel`); Chenaie (way 28030785, UrbIS ROB 899) is the same L26 family (brick parapet, bolster coping, setts, ~8 m cutting): next preset of tools/blender/roadBridge.py once a free photo of its faces is found.
  - [ ] Verrewinkel: LOD2 is meshoptimizer (error 0.06) and NOT checker-clean (534 blocking: leaks / coplanar at 420 m+): build a purpose-made far node in roadBridge.py (faces + 16-segment vaults + coping strip, baked separately) like the town hall's far variant.
  - [ ] Verrewinkel: the city street dips 0.3-0.5 m on its SW half within 4 m of the SE end (road engine / measured surfaces; claude/roads2's domain): the deck's SE apron hides the step; fix the street and drop the apron.
  - [ ] Verrewinkel: the NE face is a mirror of the photographed SW face (no photo); the arcade pitch (1.99 m) and spans are within ~10 % of s05 (single photo, scale weak): an owner photo of the NE face / a measured span would settle them. Catenary under the bridge lowered by rule (contact ~0.6 m under the intrados), not measured.
  - [ ] Verrewinkel: LOD1 AO comes from LOD0's bake (fine at 140 m+; town hall bakes LOD1 itself); the ring / console AO stains stay when the rings drop out.
  - [ ] Verrewinkel: walkY / drive height return the deck anywhere in its footprint (also in the cutting under it); the footbridge has no collider on its inner edge.
  - [ ] Stations: Calevoet / Stalle canopies (cast-iron columns), station buildings (Stalle is protected), signs, platform lights, better shelters (Blender), heritage inventory check for the bridges.
  - [ ] M6/M7 double-deck + HLE18 for the ICs on L124 (today two coupled AM08, as photographed at Saint-Job); AM86 seen on L26 in 2025.
  - [ ] Ground at the bridges: a small sandy DTM cone in front of the St-Job north side arch, Calevoet embankment ends coarse; filter the far tiles' tree impostors on the rail too (only the full tiles are filtered).
  - [ ] Live positions / delays: `trains.setSource()` with a GTFS-RT TripUpdates adapter (SNCB on the NAP); level crossings: none on L124 / L26 in Uccle.
  - [ ] Ballast reads as a coarse pixel mosaic up close (seen 2026-11-13 from the Saint-Job bridge deck; the bridge itself checked from the Chaussee de Saint-Job: arch, ring, corbels, masts all in place).
  - [ ] Small: track bumps near the L124 / L26/5 junctions (D9/E9), masts as portals where Infrabel uses them, dither band visible on the white body around 90 m, Calevoet embankment fill coarse.
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

- [ ] **Falcon flight** (`claude/falcon-flight`, LAB ONLY, labs/falcon-flight-lab.html, docs/FALCON_FLIGHT.md): flight model, thermals, façade updrafts, pigeons, strike, perching; ~0.28 ms CPU worst case, pigeons below GPU noise. Left: a proper falcon model with tuck / flare / take-off / landing clips (the reshaped rig reads as a teardrop in the tuck); ridge lift is a slope formula (no rotors, no street canyons, no tower updraft); thermals from land cover only (tie them to the Firmament cumulus, a surface-heat map); pigeon escape manoeuvres (splits, dives) and in-flight wing sound; tune the catch window / difficulty with players; adopt in the city's fly mode (keep the nest intro, hand over with `FalconFlight.launch(..., air)`); feed the weather lab's `uWind` (`air.setWeatherWind`); the lab's far tiles are boxy (full tiles near the falcon); falcon calls; gulls also over the parks only when the wind is light.

Stairs paused until the owner's Mixamo clips are in `data/raw/animations/mixamo/` (and the owner decides: Mixamo clips committed for the live site, or local only).

**QUIET-MACHINE CHECK (coordinator, 2026-11-12, owner's GPU project closed; median frame deltas):** weather: rain +0.07-0.10 ms, wetness full +0.42-0.46 / lite ~0, snow flakes +0.13, layer +0.27, all snow +0.62-0.66 (budget 1.0); foliage front garden +0.20-0.39 ms (4 views; noisy estimate was ~1.5); pedestrians 300 banded GPU +0.33-0.46 ms, CPU 0.39 ms (Mr.doob's crowd CPU 0.89 ms). All within targets except full wetness (use the lite path far).

**OWNER VERDICTS:**
- 2026-11-13 ROADS ROUND 4 MERGED: kerb shimmer fixed (J1 45 -> 4 blinking px, Mr.doob's filteredPulse / boxCoverage on the kerb's own uv footprint), road triangles +6.4 % (was +20.5 %), sidewalk shader one tile pattern per pixel, median kerb 13 cm, TRAFFIC MERGED + ON BY DEFAULT (?traffic=0). Open: ground materials from the library (shader rewrite, needs a quiet GPU to prove <= +0.1 ms), GPU cost of roads v2 unmeasured (shared GPU), kerb gaps 163, asphalt hairline cracks 145, sidewalk / forecourt seams 0.6-0.9 cm, Edith Cavell centre line, tight lane connectors, J1 dark line, cars stopping exactly at the line not verified frame by frame. Seen in the traffic strip: a bright washed glare patch top-right of several frames (audit).
- 2026-11-13 ROADS V2 rounds 1-3 MERGED (eae9ce4, owner: "do what you think is best"): measured paint (one crossing per real crossing, photo-verified), no stacked zebras / floating stop lines / facets / seams, smooth curves by chord error (worst 3.5 cm), blue-stone kerbs with joints, tiles laid along the kerb, dropped kerbs sloped, tapers, lane graph smoothed and centred. Round 4 running (roads2): kerb shimmer (J1 8 -> 45 in round 3), cost back down (tris +20 %, GPU +0.3-0.4 ms), ground materials from the library, traffic on the new lanes, leftovers. Seen in the city: the clouds look blocky at street level (audit).
- 2026-11-13 MATERIALS: best version of each material ON BY DEFAULT (texfactory merged, 3376df3): factory stone_blue / slate / paving_concrete / brick_dark / brick_yellow / asphalt / render_white, scans brick_red_brussels / stone_white / cobbles / roof_tiles_red (RoofingTiles014B) / copper_patina; on the facade kit, every landmark, the bridges and the procedural facades (walls + roofs); ground materials (asphalt, paving, cobbles) wait for roads2. ?libmat=0 = old look. 9 sets, 24 MB GPU, 17 MB download. Left: Observatory +0.5 ms; Stalle flicker 44 -> 86 ppm; the kit's copper / dark brick slots (16-texture limit); quiet-GPU re-run. Lab kept for tuning + Megascans. Dev server fix: the local no-cache server queued only 5 connections and refused module bursts (the library silently failed to load) -> request_queue_size 128 (%TEMP%/uccle_nocache_server.py).
- 2026-11-13 CITY TREES MERGED (a355166): trees off the carriageway (3,800 moved, 1,099 dropped, all 120 tiles), colliders from what is drawn (6,698 invisible lamp posts + 182 ghost islands gone; lamps / bollards / medians now collide), collider audit + debug view (G), the tree IMPOSTOR KIT ON BY DEFAULT (?impkit=0 = old). Fixed at the merge: main.js had THREE competing tile-entry lines from keep-both merges (kit + ponds silently dropped; the kit was empty in the city) -> one line. Watch: the far forest looks grainy on the hills (kit far fade); GPU re-check on a free GPU; bake 7-24 s after boot.
- [ ] TEXTURE FACTORY (claude/texfactory, NOT merged, lab http://localhost:8835/labs/material-lab.html): 11 wall/ground materials x 3 variants + 7 barks + 5 leaf sprays (3 seasons), numpy+OpenCV, KTX2. Agent's read: factory wins stone_blue, slate, paving_concrete, brick_dark; ties asphalt, brick_yellow, render_white; scans win brick_red (close), stone_white, cobbles, roof_tiles_red (reads as corrugated sheet). Owner to choose per material in the lab; images are git-ignored (rebuild with tools/texturefactory build/encode/register).
- 2026-11-13 EVERYTHING USABLE MERGED + ON BY DEFAULT in the city (owner: "that's the point, fine-tune in the labs"): facade kit, all landmarks (Stalle, town hall, Van Buuren, Wolvendael + pond, police, Calevoet, Saint-Pierre, Observatory), trains + 3 bridges, flags, minimap; ?x=0 turns one off (?kit=0, ?police=0...). Also merged: smallfixes (night fix re-applied to the new tree code), nightlights, sound, weather, foliage, pedestrians, streetlife, falcon-flight, tram2 (v2 default), materials. HELD: roads2 + traffic (round 2 running), furniture (old), police-car (round 2), city-trees + texfactory (running), character branches (other chat). Fixed while checking: the Wolvendael pond reflection broke the château's metal/glass shaders (empty MRT output).
- [ ] CITY HOOKUP of the lab-only systems (none is wired into viewer/main.js yet): sound (viewer/audio), night lights (viewer/nightLights), weather, foliage (grass, hedges, ivy, plants), pedestrians, street life (shops, plates, numbers), the falcon flight game. One by one, each with its lab's cost measured in the city.
- [x] THE LONG FREEZE FOUND + FIXED (9083769, 2026-11-13): the 6 lamp point lights belonged to the first tile; when it unloaded the light count went 8 -> 2 and three rebuilt every lit material (~72 sync pipelines, 1.5 s + 0.9 s long tasks). Now one fixed pool for the session (lampLightPool). Same flight: sync pipelines 72 -> 4, long tasks > 200 ms 2 -> 0. RULE: never add / remove a light at runtime (night spots, police beacons, headlights: fixed pools). Left for the audit: (a) ShadowMaterial_730 is re-created synchronously every ~20 s (a cache eviction or a toggling variant: find it); (b) boot long tasks of 3.2 s and 4.1 s; (c) the earlier "shaders 12-40 s in the background" per hero = async, not a freeze, but the warm-up could be shorter with shared materials.
- [ ] PERFORMANCE + OPTIMISATION AUDIT (owner, after the current work; "as soon as it's a game it has to run smoothly, no lag"): (1) THE LONG FREEZE: smooth for a while in drive / fly, then a complete freeze, then smooth again, every time -> trace it (Performance panel, long tasks): suspects = pipeline / shader compiles when a hero or tile first comes into view (heroes report 12-40 s of background shader compiles each, a 3.9 s long task seen while streaming), tile build main-thread slices (trees 147 ms, parked cars 52 ms), GC from per-frame allocation, texture uploads; target: no frame over 33 ms while moving, ever. (2) Draw calls / instancing: agargaro's InstancedMesh2 (per-instance frustum culling, LOD, BVH, shadow LOD), BatchedMesh / multi-draw for the kit's rare pieces and heroes, merge per material. (3) Mr.doob slop-newyork tricks (re-read docs/SLOP_NEWYORK_AUDIT.md + his newest commits) and three.js r187+ features; own WebGPU (compute culling, indirect draws) only where three can't. (4) Shader count: pre-warm all pipelines during loading (one compile per material variant), share materials. Measure with ONE Chrome tab only (other tabs, incl. agents' tabs, skew GPU numbers): run when no agent is running, A/B in alternating rounds.
- [ ] COLLISIONS + JOINS AUDIT round 1 DONE on `claude/audit-collide` (not merged; docs/collisions/README.md): colliders from what is drawn (building walls, landmark / bridge LOD0, parked cars, furniture, poles), walk mode collides (shared capsule world), two-layer drive surface, 0.5 m step limit, pond drag, Verrewinkel skirts + abutment fill, contact check tools/mesh_audit/contact.js; 120-tile test: car passes through drawn solids 32,041 -> 0, missing colliders 21,016 -> 512, invisible edges 1,085 -> 254. Left: joins on the other landmarks + roads run, road join defects for roads2 (docs/collisions/road_ledges.txt), character in the pond.
- [ ] COLLISIONS + PHYSICS AUDIT (owner): every thing that should collide does, in drive, walk and third person: buildings, heroes (all new landmarks + bridges + police yard + pond edge), kerbs, bollards, lamps, trees (the city-trees agent fixes trees on roads + invisible blockers), parked cars, fences, rails / platforms, flags poles; nothing invisible blocks; ramps / bridge decks drivable; the collider debug view (G) on each; a scripted drive + walk over a test route per tile with a report.
- 2026-11-13 LANDMARKS: owner OK "merge all the landmarks, all will need fine-tuning". MERGED: stalle, hero-prep, vanbuuren, wolvendael, police, nekkersgat, saint-pierre, observatory, sauvagere, verrewinkel (+ trains); worker bundle rebuilt; the city loads with every flag on (E4), no errors. Still opt-in flags. Noted while checking: with every hero on, shaders compile 12-25 s each in the background and one 3.9 s long task while streaming -> the optimisation audit.
- 2026-11-13 Road Lab REJECTED ("so many errors, only accept it when perfectly right"): road narrowing with overlapping asphalt + edge line stopping + sidewalk notch; short stop line + crossing clipped by a kerb + seam + no kerb at the raised square; black crack + kerb notch + sheared paving at a curve; plus (mine) faceted asphalt shading, duplicate / stacked crossings (BM + Topo + OSM), floating stop lines, missing islands / plateaus / rails. Traffic Lab: zigzag / kinked lane paths behind stop lines, off-centre lanes, crooked dashes (same road network). -> roads round 2 running on claude/roads2 (docs/roads/ROUND2.md), I check every junction before the owner.
- 2026-11-13 RULE "JOINS" (owner, from the Verrewinkel bridge: the approach's sidewalk slab sticks out over a gap beside the brick abutment): wherever a scripted model meets generated ground (bridges, heroes, plazas, road ends, kerbs, ponds, rails), the two must be welded or closed by a skirt / kerb / wall; NEVER an open floating edge or a gap you can see under. Enforced by a contact check in tools/mesh_audit (open boundary edges not resting on another surface within 2 cm = blocking; overhangs; gaps under slabs) run on every hero against the city's ground meshes of its tile, and on every tile's roads / sidewalks / plazas; no merge without it. First runs: Verrewinkel, Calevoet, Saint-Job bridges, then all heroes, then all 120 tiles.
- 2026-11-13 Façade kit round 3: OK, MERGED (3441121, `?kit=1`); keep fine-tuning in the Kit Lab. Worst piece: the GARAGE DOOR looks way too cheap (redo: real sectional / up-and-over panels, frame, weathering). Optimise everything (merge rare piece types: 62 street-level meshes / +80 draws -> multi-draw / batches); the owner does optimisation audits often. Next: the clean-buildings pass.
- 2026-11-13 Tree Lab + tree textures: OK for now, MERGED (1fd2158; lab-only code, the city loads clean). Procedural bark / leaves "ugly, unusable" -> generate better tree textures with the texture factory (bark per species, leaf atlases) + Megascans bark when downloaded; more species later (lime, horse chestnut, maple, birch, oak...). NEXT: switch the city's trees to the impostor kit (?impkit=1 then default) with the usable textures.
- 2026-11-13 Material Lab redo DONE (claude/materials 0d60407): review UX, 69 CC0 candidates, anti-tiling, procedural shimmer fixed (10 m: 69,926 -> 64 ppm), Megascans list docs/materials/MEGASCANS_LIST.md (40 surfaces + 29 decals / 3D). Owner: review + 'choose this' + download verdicts.json.
- 2026-11-12 Impostors: OK ("no more dots"), MERGED into foundation (lab + kit; keep the lab for fine-tuning). The CITY still uses the old viewer/impostors.js: the trees' switch to the kit (?impkit=1, then default) is the next step; it touches the tree code, also changed by claude/tree-lab / tree-textures (not reviewed yet).
- 2026-11-12 Material lab: brick_yellow and brick_dark have NO scan (only 8 materials got one: brick_red, stone_white, stone_blue, slate, copper, cobbles, paving, asphalt): find CC0 scans for yellow and dark brick (Poly Haven / ambientCG; or tint the red-brick scan's structure with their colours); ALL procedural bricks (red, yellow, dark) have the same shimmer -> shared pattern code (patterns.js bond / filteredPulse / bump) to fix once.
- 2026-11-12 Material lab (in progress): brick_red_brussels: SCAN CLEARLY WINS. Procedural: eye-hurting jitter (fine diagonal 'firing' streaks alias + derivative bump outlines crawl). Hybrid: near scan and far procedural look too different -> need a better far solution for scans (anti-tiling for scans: stochastic / hex-tile texture sampling, macro variation, detail fade; or a procedural far version tuned to the scan's mean colour + variation).
- 2026-11-12 Façade kit: "nice, we'll need more pieces (optimized)"; issues: bright flickering lines along doors (light through gaps), aliased shimmering edges, saw-tooth shadows in the lab. -> round 3 running (seal gaps + checker leak test, specular AA, the city's lighting in the lab, more Uccle pieces); then merge, then the clean-buildings pass.

**OWNER REVIEW LIST, added 2026-11-10 (on top of the 11 earlier pages):**
- [ ] Chapelle de Stalle rounds 3-5 (`claude/stalle`, port 8802: http://localhost:8802/labs/stalle-lab.html, city ?tile=D5&stalle=1): checker 0, front matches c00, interior moulded; open: north-aisle blotches, statue (decision), slates +0.3 ms (decision). Merge behind ?stalle=1 when OK (brings tools/mesh_audit to main).
- [ ] Villa van Buuren (`claude/vanbuuren`, port 8818: http://localhost:8818/labs/vanbuuren-lab.html, city ?vanbuuren=1&tile=G2&at=302.6,-1229.6): shape matches the photos; look round (brick orange, white concrete, frames, glass, NW roof) next.
- [ ] Roads v2 phases 0+1 (`claude/roads2`, port 8815: http://localhost:8815/labs/road-lab.html?j=1&view=plan, &paint=v1 = before); send docs/roads/brussels_mobility_request.md.
- [ ] Flag Lab (`claude/flags`, port 8817: http://localhost:8817/labs/flag-lab.html; city http://localhost:8817/viewer/index.html?townhall=1&flags=1&tile=D3&at=-1134,-506).
- [ ] Minimap + full map (`claude/minimap`, port 8819: http://localhost:8819/labs/map-lab.html, city http://localhost:8819/viewer/index.html?map=1&view=walk&tile=E4&at=-916,-195; M = full map, click to teleport). Weak: few names at walking zoom, Avenue Brugmann unnamed sometimes.
- [ ] Wolvendael chateau + pond (`claude/wolvendael`, port 8821: http://localhost:8821/labs/wolvendael-lab.html, city http://localhost:8821/viewer/index.html?wolvendael=1&tile=F4&at=-470,-430). Chateau matches w04; pond mirrors; weak: water too dark, blob tree reflections, stick reeds, dark frames far, estimated entrance side.
- [ ] Sauvagère PAUSED 2026-11-11 until the owner brings more photos (left side, top edge, rock close-ups, the cascade, the exedra all round). Round 4 = one continuous hero cliff (good step); next: the outline low-left rising to the exedra, bigger angular pillars / slanted slabs, fix white edge fringes + zig-zag ferns + flat moss, the pond with the Wolvendael water, then the exedra. (`claude/sauvagere`, port 8822: http://localhost:8822/labs/park-kit-lab.html, prep docs/heroes/SAUVAGERE_PREP.md): rock + playground kits (0 blocking). Weak: rock too orange / blocky vs the cream rocaille, cliff 1.64 ms at 12 m (over budget), playground generic. Needs the OWNER'S PHOTOS (list in the prep note).
- [ ] Rue de Verrewinkel railway bridge (`claude/verrewinkel`, on top of claude/trains; port 8823: http://localhost:8823/viewer/index.html?tile=F7&trains=1&at=-268,1308): 3 brick arches + console frieze matching s05, the 2022 footbridge; weak: LOD2 not checker-clean, no lab view, SE street dip (roads side), NE face mirrored.
- [ ] Sound Lab (`claude/sound`, port 8826: http://localhost:8826/labs/sound-lab.html, click to start; WAV renders in .claude/worktrees/sound/docs/sound/renders/ with what to listen for in docs/SOUND.md): LISTEN. Unsure: T3000 bell / chime, AM08 horn, church bell pitches, children + dog voices.
- [ ] Impostor Lab (`claude/impostors`, port 8824: http://localhost:8824/labs/impostor-lab.html?scene=forest): dots gone. QUIET-MACHINE GPU (coordinator, 2026-11-12, median frame deltas): far forest 83k trees: kit +0.92/+1.18/+0.98 ms to 1.5 km vs today +1.77/+2.16/+1.90 ms to 1.1 km; forest patch: kit +0.20 vs today +0.33 ms. Target met.
- [ ] Pedestrian Lab P0+P1 (`claude/pedestrians`, port 8825: http://localhost:8825/labs/pedestrian-lab.html, ?scene=sidewalk|crossing|zebra|square|tram|park): 0 pops. QUIET-MACHINE (coordinator, 2026-11-12, street scene): 300 people banded GPU +0.26/+0.33 ms, CPU 0.42 ms (Mr.doob's all-live crowd CPU 0.92-0.97 ms); 150: GPU +0.07-0.26, CPU 0.33. Targets met; weak: baked feet slide on turns, kerb steps, nobody sits (no UAL clips yet), P4 bodies (children, dogs...) not started.
- [ ] Foliage Lab rounds 1-2 (`claude/foliage`, port 8827: http://localhost:8827/labs/foliage-lab.html?scene=front, also scene=street / garden): GPU grass, hedges, 8 Blender plants (checker 0), ivy, window boxes, seasons; flicker 2615 -> ~400 ppm; weak: ivy columns, dotty hedge close up, lawn tips 10-20 m, close-up front garden ~1.5 ms (noisy), no real-photo side-by-side.
- [ ] Weather + Seasons Lab rounds 1-2 (`claude/weather`, port 8828: http://localhost:8828/labs/weather-lab.html): rain + wet + puddles, fog, falling + volumetric snow, branches, ledge caps, icicles, salted roads, seasons, live Open-Meteo; all snow ~0.75 ms, rain ~0.1-0.3 ms; weak: night-rain puddle flicker, 12.5 cm snow edges, full wetness over budget (cheap path exists).
- [ ] Pedestrian Lab round 3 (pram, dogs, child proportions, toddlers, fitted clothes, Brussels bench; CPU 0.40-0.52 ms).
- [ ] Night Lights Lab rounds 1-2 (`claude/nightlights`, on top of smallfixes; port 8829: http://localhost:8829/labs/night-lab.html): ~460 light sources (89-134 real + a baked ground light map + far glare cards), shop rooms behind the glass, upper windows spill; ~0.6-0.85 ms (target 1.0 MET, noisy); no popping. Weak: faint window light on lawns, beyond 60 m walls lit only at their foot, bake on the main thread (needs the tile worker), plain glare blobs.
- [ ] Police station Rue Rouge 17 (`claude/police`, includes Wolvendael; port 8830: http://localhost:8830/labs/police-lab.html, city http://localhost:8830/viewer/index.html?police=1&wolvendael=1&tile=E4&ring=1&at=-507,-345&cam=-472,-368,6): former school, cream render + red-brown brick ground floor, yard with gates, flags, 5 patrol cars in Belgian livery; checker 0; ~+0.1-0.3 ms. Weak: NO free photo (Street View look-only), back faces estimated; owner's own photos welcome; cars ~30 draws, no lettering; flags read as plain colour blocks.
- [ ] Street Life Lab (`claude/streetlife`, port 8831: http://localhost:8831/labs/streetlife-lab.html?site=fortjaco, also site=stjob / alsemberg, &time=night): real shop names (524 named POIs), 17 fuel stations, pharmacies, terraces, 278 STIB stops, Villo, bpost, plates, 19k house numbers; round 2: big contrasting fascias (backlit / spotlit / lightbox), real Uccle plates (type + 'Uccle - Ukkel' + name), terraces only on measured paving, per-tile atlas pages, fronts in the real wall plane, glass. COST UNCLEAR: on an idle GPU any InstancedMesh adds a fixed ~0.8 ms in r187 (investigate before the city merge: affects every instanced layer). Weak: no letters straight on walls, sign styles hashed not real, half the plates fall back to both full names; some data licences to confirm (Brussels Mobility WFS, UrbIS addresses), OSM fetched from a mirror (2026-07).
- [ ] Uccle-Calevoet station building (`claude/nekkersgat` branch name, but the hero is the STATION; port 8832: http://localhost:8832/labs/calevoet-lab.html, city http://localhost:8832/viewer/index.html?calevoet=1&tile=D6&at=-1224,792&cam=-1225,831,2): matches photo c04 (5-bay main block, red-tile pavilion, slate roofs, canopy); checker 0; weak: car-park side estimated, no graffiti / signs / clock / catenary, temp materials, LOD2 not clean, flicker test not run.
- [ ] Moulin du Nekkersgat: NOT modelled (only 1 usable free photo); real location UrbIS solids 518200 + 516481 at ~(-1838, 820) on the Geleytsbeek; OWNER PHOTOS needed (courtyard side, the NE range, the water wheel). Précieux-Sang church: only 1 free photo too.
- [ ] Car impostors (`claude/impostors`, http://localhost:8824/labs/impostor-lab.html?scene=cars): 300 cars 0.20-0.25 ms, cars to 900 m, steadier than meshes; weak: no window glints, +9-18 % bright far, +27 MB.
- [ ] Civilian police car (`claude/police-car`, port 8834: http://localhost:8834/labs/police-car-lab.html, ?scene=studio for close-ups; L lights, K siren, B beacon type): any car type, magnetic blue beacon (rotating mirror or LED), grille flashers, one real spot light, Belgian 495/440 Hz siren (WAVs in .claude/worktrees/police-car/docs/police-car/). Weak: the beam reads as a round blob sweeping across the view (should be a tall narrow fan + a subtle rotating glow on walls), light passes through walls (no shadow), city night very dark; LISTEN to the siren WAVs.
- [ ] Falcon Flight Lab (`claude/falcon-flight`, port 8833: http://localhost:8833/labs/falcon-flight-lab.html, H for help): real lift / drag flight, stoop to 82+ m/s, 80 deg banks, forgiving stall, thermals + building updrafts, 150 pigeons that flee, catch + carry to the eyrie, landing on perches, keyboard / mouse / gamepad / touch; ~0.28 ms CPU. Weak: old low-poly falcon (new model = next step), ridge lift is approximate, catch generous, pigeons crude up close.
- [ ] Night Lights Lab ROUND 2 (`claude/nightlights`, port 8829: http://localhost:8829/labs/night-lab.html, docs/NIGHT_LIGHTS.md): budget MET: 0.59-0.66 ms default, 0.72-0.85 ms with 134 real clustered lights (noisy, p10 / median), lighting ~460-500 sources: cluster culling planes (low-beam wedge, window pyramids), ground light map (all lamps / 287 windows incl. upper floors / shops / signs baked; far cars' pools in a dynamic layer), 12 nearest cars real, far glare cards, shop rooms by interior mapping; depth pre-pass measured: no gain. 0 pops (max weight jump 0.037 / frame), flicker 54-81 ppm (car / tram edges). Next: map bake in the tile worker per tile + into the city (replace lamps.js' 6 lights + lampLight.js), brighter lawn spill, glare streaks.
- [ ] City mesh audit report (docs/CITY_MESH_AUDIT.md): facade details coplanar with walls = likely the building flicker.
- [ ] Small fixes (`claude/smallfixes`, port 8816): lamps + ?sunlight=1 + NIGHT BRIGHTNESS FIX (2026-11-12: Firmament night look +1.6 -> +0.6 EV, total x6 -> x3; trees' moonlight dimmed; leaf fill scaled by daylight). Compare: http://localhost:8820/viewer/index.html?tile=E4&time=night (before) vs http://localhost:8816/viewer/index.html?tile=E4&time=night (after); &nightev= to tune. Trees still a bit too green at night (desaturate at night later).
- [ ] Hero prep notes (`claude/hero-prep`, docs/heroes/): Van Buuren + Wolvendael.
- Decisions: statues / carved ornament (scripted vs museum scans); chapel close-up slates +0.3 ms.

**Done 2026-11-10 while the owner was away (own branches, not merged; waiting for the owner's eye):**
- [ ] `claude/smallfixes` (d61221e): night lamps pick the 6 nearest without a per-frame allocation or full sort (same lamps, 2000 random checks); `?sunlight=1` uses Mr.doob's newer shadow settings (2048 px, 220 m). GPU A/B still to measure on a quiet machine.
- [ ] `claude/flags` (d22d6da, labs/flag-lab.html, docs/FLAGS.md): flag system v1, lab only. Verlet cloth near, baked loop far (GPU, zero CPU), no pops at the hand-overs (measured), wind changes re-recorded in a worker and cross-faded, town hall balcony poles with wall collision, Belgium / EU / Uccle designs. Live cloth ~0.08 ms per flag (Node), more in the busy browser: budget 4 live flags. Next: GPU A/B, the city (town hall), the city wind.
- [ ] `claude/hero-prep` (de4ddf8, docs/heroes/): preparation only for Villa van Buuren (solid 550409) and Wolvendael (chateau 537523 + Louis XV pavilion 537211): measurements, photo sources + licences, facade read, parts / slots, risks; owner decision needed on how to do carved ornament (pavilion) and statues (Stalle).

**City test bugs the owner saw (2026-11-10, flying with the birds; re-test on a combined build, some may be fixed by unmerged branches):**
- [ ] IMPOSTOR SYSTEM (owner, 2026-11-11: confirmed in the Tree Lab that the far-tree jitter is the impostors): research DONE, docs/IMPOSTORS_RESEARCH.md (ranked causes: screen-locked far-fade dither 800-1100 m, alpha-to-coverage on a processed alpha, 8x8 views without depth). OWNER TEST 2026-11-11: fade-out band = 0 does NOT fix it; the jitter is SMALL DOTS on the foliage while the camera moves = cause 2 (alpha-to-coverage on the blurred / union alpha: partial alpha turned into an MSAA dot pattern that crawls). Phase 1 must start with the alpha path (coverage-preserving mips, one coherent alpha, stable coverage). Build a NEW generic module viewer/impostorKit/ + an Impostor Lab with a jitter meter (new files only), phases 0-7; trees migrate after the tree-branch review.
  - [x] Phases 0-2 in the lab (branch `claude/impostors`, `labs/impostor-lab.html`, `docs/IMPOSTOR_KIT.md`): `viewer/impostorKit/` (generic: supersampled GPU bake into texture arrays, per-cell coverage-preserving mips in a worker, 3-view blend, one alpha + alpha-to-coverage, octagon card, one draw per pass). Jitter meter: today's impostors 3-7x the mesh LODs' jitter, the kit 0.4-0.6x (blink share 1-4 % vs 51-72 %). GPU: forest patch kit +0.92 ms vs today +0.98; 83k-tree far forest kit +1.84 vs today +2.88.
  - [x] Phase 3 (`claude/city-trees`, docs/CITY_TREES.md §1, port 8836: http://127.0.0.1:8836/viewer/index.html?tile=I6&impkit=1 vs &impkit=0): one kit field for every far tree of every loaded tile, solo instances on far-LOD tiles, tile fade-in, FAR.ground = running mean of the far orthophotos; city jitter meter d2 3.6-5.3x lower (strafe / orbit), 1.8-2.3x (dolly); hand-over strips no pop; GPU in the city inconclusive (shared GPU), re-run farBench on a free GPU; plane / beech layers and retiring viewer/impostors.js still to do. WAS: trees behind `?impkit=1` in `viewer/treesStylized.js` (AFTER the owner's tree-branch review): bake source = `impostorKit/sources/stylizedTrees.js` (LOD 2 at the hand-over), FAR.ground from the tile's orthophoto mean, one field for all loaded tiles (append / remove tile segments), plane / beech species as more layers; A/B in the city on the SMOOTH_LOD protocol; then retire `viewer/impostors.js`.
  - [x] Phase 4 in the lab (`labs/impostor-lab.html?scene=cars`, `docs/IMPOSTOR_KIT.md` §5): `TYPES.car` (hemi 12x12x48, LOD 3 bake, paint as a per-instance tint through a linear split colour = A.rgb + B.a x paint, depth out + 1 parallax step, hand-over 150 m, far fade into the road 600-900 m, coverage gain 2), `sources/fleetCars.js`, `contact.js` (Mr.doob's contact quad). 300-car street: kit jitter at or under the mesh LODs' on drive / orbit / strafe / fly (one exception: fly 150-250 m +9 %); isolated GPU, all 300 cars: kit 0.07-0.25 ms vs mesh LODs 0.12-0.30 ms; atlas 26.9 MB.
  - [ ] Phase 4 city switch, behind `?impkit=1`, AFTER the owner's review of the car lab: `viewer/carFleet.js` gets a hand-over (cars past `TYPES.car.fade.start - band` leave the mesh batches; the LOD 3 fade batch keeps h < 1 - t with lodFade = 2 - t; distance from the bake sphere centre), one `impostorField` for all loaded tiles (ikTint = the car's paint, keepPaint types their own), FAR_TO 420 m -> the kit's end (900 m); `contactShadows` for every parked car; the atlas baked once from the worker's LOD arrays (2-3 s, no long task). Casting inside the shadow box is not needed (LOD 3 does not cast today). Open: the quad card drew nothing in a quick test (octagon is the default).
  - [ ] Phase 5: props (probably distance-cull only, the lab decides), crowds (static poses).
  - [ ] Phase 6: hero buildings (HLOD proxy vs 12x12 impostor per building).
  - [ ] Phase 7: KTX2 (offline bake in `pipeline/`, BC7 + BC5/BC4; runtime bake stays the fallback); target <= 50 MB.
  - [ ] Open: the far fade target per tile (orthophoto mean under the tile); stylized tree palette is brighter than the orthophoto at 1-1.5 km (a tree-colour question, not the kit's).
- [ ] distant trees flickering / shimmering (owner saw it again 2026-11-11 in an agent's browser: FAR trees, appears when the CAMERA MOVES; owner suspects the octahedral impostors: check view-cell switching / frame blending of the octahedral atlas, mip / alpha-to-coverage of the atlas, depth offset, and the impostor <-> mesh hand-over), even with a still or slow camera (owner, 2026-11-10: this IS the "tree jitter" seen flying with the birds; seen again in the town hall city view). Check far-tree LOD, alpha-cutout aliasing (alpha-to-coverage / mip alpha), impostors.
- [ ] CLEAN BUILDINGS PASS: BUILT on `claude/fixes1` (2026-11-13, waiting for the owner; docs/fixes1/README.md job 2: blue / black line = the hanging gutter + eaves board over street cornices (removed there), mitred / merged strip details, wound quads, beams, chimneys; adaptive shadow kernel; far-forest mip bias; premium garage door; audit + flicker numbers and what is left). WAS (owner screenshot 2026-11-11): a thin BLUE line along the wall top (crack wall / roof edge: sky seen through), a BLACK line under it (cornice underside or coplanar cornice), and STAIR-STEPPED shadow edges (shadow-map aliasing). Fix together with the facade flicker below: roof edge overlapping the wall top, mitred continuous cornice / gutter strips, party walls once, box winding; shadow edge filtering / resolution by distance; prove with the checker on several tiles + close-up before/after + fly-over. AFTER the owner reviews the materials library and the facade kit (next on his list); reproduce the owner's view (ask where).
- [ ] z-fighting (flicker) on shader buildings: mesh checker on tile I6 (docs/CITY_MESH_AUDIT.md) finds ~13.6k coplanar + 410 depth + 482 crossing items between the generated facade DETAILS (sills, cornices, bands, frames) and the walls: very likely the cause. TRIAGED (docs/CITY_MESH_AUDIT.md "Triage"): square end caps of cornice / band / gutter boxes lying in the next wall's plane at corners + overlapping box tops at corners + party walls drawn twice; fix plan = mitred strip chains, shared party walls once, quad winding (then drop DoubleSide on details). Do it after the facade-kit merge.
- [ ] some curved roads completely broken (road geometry at sharp curves?)
- [x] (`claude/city-trees`, docs/CITY_TREES.md §2-3) 4,899 trees on the measured carriageway: 3,800 moved onto the sidewalk, 1,099 dropped (pipeline/filter_road_trees.py); colliders audited (tools/collider-audit.html): 6,698 invisible lamp posts + 182 invisible engine islands before -> 0 after (lamps / bollards from the drawn lists, measured medians as islands); debug view colours by kind + red crosses + legend. WAS: some trees standing in the middle of the road (LiDAR tree points not filtered against the road surface?) + INVISIBLE THINGS BLOCKING THE CAR (owner 2026-11-13, "the most annoying"): the drive colliders include tree circles (KIND.tree) and lamps / posts (viewer/drive/colliders.js, driveMode.js addCircles): trees on the carriageway are both a visual bug and invisible-looking stops; audit every collider against what is drawn (a collider with no visible object = a bug) and filter LiDAR trees / posts against the measured UrbIS carriageway. The collider debug exists: dev panel 'car colliders (G)' / key G / ?drivedebug=1.

**Plan agreed 2026-11-10 (owner), in order:**
1. [ ] Combined preview build of everything waiting for review; the owner tests the city and lists problems; I reproduce each with frame sequences before fixing.
2. [x] Gap audit vs mrdoob/slop-newyork DONE 2026-11-10 (his HEAD 536a907): docs/SLOP_NEWYORK_AUDIT.md. Top to take: minimap + full map (his js/nyc-map.js, MIT), real lights at night on cars/lamps/shops (clustered light pools), procedural sound (none today), pedestrians (instanced crowd), wet roads/puddles (uWetness unused), shadow stand-ins + his new shadow/bloom numbers, street-sign HUD + text atlas with REAL names (his are fake), parallax shop interiors, pond water, matrixWorldAutoUpdate off per tile. Small fixes found: viewer/lamps.js:187 allocates + sorts every frame at night; ?sunlight=1 uses his old shadow settings (viewer/lighting.js:152-155).
3. [ ] Minimap (round, turns with heading, current + upcoming street names, landmarks, tram/rail) + full map on a key with click-to-teleport. Pre-rendered from our own data, a 2D canvas updated a few times per second. OSM credit on the map.
   **Map (claude/minimap), built 2026-11-11, waiting for the owner's eye** (docs/MAP.md; Map Lab; city `?map=1`, off by default): baked map (tools/build_map.py -> data/map, 1.2 MB), heading-up round minimap drawn by a worker (main thread avg 0.03-0.07 ms per frame, cache rebuilds 0 ms on the main thread), current + next street from the road graph, full map with FR/NL search and teleport (2.6-5.9 s to ready, mostly the tile's own build). Left:
   - [x] round 2: curved names + abbreviations (minimap 5 -> 22 names over 7 test views; full map 0/19/10 -> 26/85/21)
   - [ ] minimap names still sparse where streets are shorter than their names at walking zoom (a 110 m radius holds few streets): try a smaller font or 'R.' for Rue
   - [ ] full-map worker frame is slower with curved names (17-145 ms vs 5-15): cache glyph layouts per chain and zoom, or draw names into a separate layer
   - [ ] a tram dot can sit over a street name (live overlay on top); names could avoid the tram line
   - [x] round 2: dual carriageways merged for labels (Brugmann named at every zoom)
   - [x] round 2: live tram 92 dots (city only; the lab has no tram simulation)
   - [ ] other STIB lines (4, 51, 97, buses) and SNCB stations' names on the minimap
   - [ ] route to a searched place (A* on the road graph, drawn on both maps) and a waypoint
   - [ ] neighbourhood names (Uccle-Centre, Saint-Job, Fort-Jaco, Calevoet, Stalle, Vivier d'Oie…) from OSM place=* (not in our raw fetch yet)
   - [ ] UrbIS street axes as the authoritative bilingual names (OSM today)
   - [ ] orthophoto "satellite" toggle on the full map (data/tiles/*/ortho.jpg) and hill shading from the DTM
   - [ ] teleport: the target tile's own build dominates (I6 5.8 s); a lighter first pass (ground + roads first) would cut the wait
   - [x] round 2: the Drive button starts where the player is (walk / third person / fly)
   - [ ] one 14.5 ms outlier frame in the minimap's own timing once in ~2,000 frames (not reproduced): watch with a trace
4. [ ] Wayfinding / realism layer: bilingual FR/NL street name plates at corners (UrbIS street names); OSM POIs in their real places (shops with their names on the fronts, fuel stations with canopies + pumps, pharmacies with green crosses, cafés with terraces, supermarkets, schools); STIB tram/bus stop names (GTFS). Real brand names as text only, no trademark logos. Perf: one text atlas, instanced signs, built per tile in the worker, text only within ~80 m, lit at night.
5. [ ] Street character from real data so streets differ: hedges/fences, front gardens, real tree species, parking, bins, lamp types (avenues vs villa streets vs centre).
6. [ ] FOLIAGE LAB built 2026-11-11 (`claude/foliage`, lab only, waiting for the owner): docs/FOLIAGE_RESEARCH.md, docs/FOLIAGE.md, docs/FOLIAGE_RESUME.md; `labs/foliage-lab.html` (real D8 villa street + `?scene=garden`): GPU grass (lawn / verge / meadow + wildflowers, litter), procedural hedges with leaf cards, 8 scripted Blender plants (tools/blender/plants.py) with GPU LODs, shared wind, seasons hook. LEFT: ivy + window boxes (not started), mesh audit to 0 blocking (petal / leaf overlaps left, see FOLIAGE_RESUME.md), hedge card cost, pack plants.glb (9.8 MB), quiet-machine GPU numbers (the first ones were taken next to two other agents' labs), city integration per tile.
   Polish 2026-11-11 late (`claude/foliage`, docs/FOLIAGE.md §9): IVY regrown like real ivy (3 roots, mound envelope, branching + sideways spread on a density grid, deflects round window frames, patchy density, ragged thin edges, trailing stems; mantle kept off the glass); hedge body holes bigger / softer / fewer with their share held as the footprint grows. Flicker front façade view 241 -> 261 ppm (noise; ivy clean), hedge close-up 5,648 -> 5,563 ppm. Left: mantle blobs at the sparse edge read flat at 1-2 m; hedge tops still sparkle at grazing angles (leaf noise, unchanged).
   Planting system (owner, 2026-11-10; later, with item 5): flower beds, shrubs, hedges, window boxes, grass tufts, ivy. Scripted Blender plants (premium) + meshopt LODs, instanced per tile in the worker, alpha-to-coverage cards only near (< ~60 m), fade to a coloured ground decal / nothing beyond, dithered fades, no shadow casting for small plants, seasonal colour. Placement from real data (UrbIS/OSM green areas, garden zones, the town hall beds on the photos). Budget ~0.2-0.5 ms in a dense street; benchmark in a Planting Lab before the city.
- Flag system (below) slots in right after the town hall round 2.

**Owner review 2026-11-10: Chapelle de Stalle (`claude/stalle`), NOT approved yet; round 3 "AAA, it's ~1000 years old":**
- [ ] **Round 3 built (2026-11-10, waiting for the owner's eye; models/stalle/NOTES.md "Round 3", ROUND3_RESUME.md):** every item below addressed and checked in the lab (flicker heat maps, moving frame strips, grazing light before/after: docs/stalle/round3/); audit clean (exterior 582 -> 0, interior 1,478 -> 0, bentflat 188 -> 0); slates 39.5k tris = +0.26-0.33 ms GPU (owner to decide); statue v2 better than round 2 but not AAA yet; city flight not re-run.
- [ ] **Round 4 built (2026-11-10):** capitals / abacus / voussoirs / grazing tour, rubble vs c00, window ring + door relieving course, door leaves, plinth (NOTES.md "Round 4"); statue still pending the owner.
- [ ] **Round 5 built (2026-11-10):** abaci, returned imposts, arch edge, heads, rubble colour; interior flicker (exterior clerestory z-fought through the aisle ceilings: fixed). Open: north aisle blotches; audit exterior + interior together.
- [ ] z-fighting at the gable corner (coping / roof / wall meet), and the door flickers (thin bright line between leaf and frame).
- [ ] black dashes in the stone joints; a diagonal stretched streak between the oculus and the lancet (bad topology / normals); stones read like bevelled bathroom tiles, check against the photos.
- [ ] roof slates read flat (relief, overlap, edge shadows; reusable for every roof, so it belongs in the materials library too); yellow-green lichen blobs look fake.
- [ ] statue over the door looks cheap.
- [ ] interior: flicker at the door while it opens (shadow and/or z-fight); with the door closed the exterior shows at the edges (light leaks).
- [ ] interior: vault ribs landing on a column capital intersect jaggedly, leave a black hole and flicker; the capital is faceted.
- [ ] later, once all is clean: fake god rays through the windows.
- [ ] RULE GAP (checker BUILT on claude/stalle: tools/mesh_audit + pre-pack hook + flicker test + bentflat; run on the other heroes = tools/mesh_audit/HEROES_REPORT.md, report only: all have hundreds to thousands of blocking items, meshopt LOD1s worst; next: hook it into each pack, the tile worker): we have no automatic check against z-fighting / bad topology for heroes (scripted or procedural). Build a shared hero mesh audit (coplanar overlaps, near-coincident faces < few mm, light-leak gaps, slivers / stretched triangles, flipped or inconsistent normals, non-manifold) + a flicker test (consecutive frames at several distances), run before every pack; no hero merges without a clean audit. Then run it on all heroes (Saint-Job, Observatory, town hall, Saint-Pierre, trains/bridges, facade kit, furniture). ALSO the non-hero procedural city (facades, roofs, roads, kerbs, plazas, furniture, tile worker output): same checker on generated geometry, all 120 tiles, as a build check (owner asked 2026-11-10). Round 3 started 2026-11-10 (checker + chapel fixes).

**ROAD SYSTEM v2, taken seriously (owner, 2026-11-10, Traffic Lab review; step 1 research DONE: docs/ROADS_V2_RESEARCH.md, phases 0-5, 10 lab junctions; owner decisions 2026-11-10: no residential centre line unless measured (sample confirmed), roads outside UrbIS keep the current method, write to Brussels Mobility, no OpenDRIVE):** markings are wrong at junctions (zebra in the junction mouth instead of across an arm, stop lines and dashes in the wrong places, see the owner's Traffic Lab screenshot); probably more is wrong. Needs: (1) refresh docs/ROADS_RESEARCH.md (2026-11-04) with the best systems out there (Unreal CitySample / ZoneGraph / Mass traffic, Houdini road tools, RoadRunner, CityEngine, Unity EasyRoads3D / Road Architect / CiDy, Godot road plugins, osm2streets / Streets GL / A/B Street, articles, GDC talks); (2) one lane-level road model as the single source of truth for geometry, markings, traffic, signals, minimap, street signs, levels (bridges, tunnels, metro/subway, ramps); (3) a ROAD CHECKER (zebras across an arm and perpendicular, stop lines before the junction, no paint outside the carriageway or across kerbs, lanes vs paint vs traffic paths agree, no overlaps / z-fight, curves continuous); (4) truth from measured data: UrbIS Topo markings + Land cover surfaces + the UrbIS orthophoto (CC0, shows the paint) + Brussels Mobility marking inventory; (5) a Road Lab with real Uccle junctions, then the city. Includes the owner's "broken curved roads".
- [x] PHASES 0-1 DONE on `claude/roads2` (not merged), report `docs/roads/PHASE01.md`: measured markings per tile (`markings.json`), Road Checker v0 (`tools/road_audit/`, blocking 17,368 -> 5,184 on 120 tiles), Road Lab (`labs/road-lab.html`, 10 junctions, before/after strips in `docs/roads/img/junctions/`), paint v2 (measured crossings / stop lines, no invented centre / cycle / parking paint, sharrows, decal mesh), lift tiers + fold removal, refine without PI deletion. Email to Brussels Mobility drafted: `docs/roads/brussels_mobility_request.md` (owner sends).
- [ ] Phase 1 leftovers: C8 folds 159 (curve points now kept: engine tight-bend 317 in the network; the folded overlay is dropped but the lane graph still folds) and roads off the measured street 983 (guessed widths on unfitted roads: phase 2 w(s)); C9 3,391 overlap clusters left (mostly self-overlap at kinks); 90 C1 (BM crossings on no arm / on a node: merged nodes), 89 C3 (stop lines over the departing lanes on narrow approaches); lane lines are not interrupted at MID-BLOCK crossings (markRange only trims road ends); Rue Basse (G6) has a dashed centre line in the photo but none in Topo (an override list?); OSM-only crossings use a 3.5 m band; BM inventory (mark_type) not drawn until the legend arrives; worker road stage +25 % (tiers / fold test: optimise).
- [ ] Phase 2 street model v2 (pipeline): topology from UrbIS StreetAxes / Nodes + OSM attributes; reference lines re-centred on the measured carriageway, w(s) left/right; junctions from I/IC polygons with joints; crossings and stop lines as objects per arm (from markings.json); connectors + conflicts; built once for Uccle, cut per tile with global ids (fixes C10 seams 268); checker on the model.
- [ ] Phase 3 derive everything: traffic hold points = `rd.inventory.stops` (today 4-6 m off the paint, checker C7), delete `fitToSurface`, signals / signs from controllers, lane lines into the decal mesh, retire the second engine asphalt and the atlas; merge note: tileData now calls viewer/roadBuild.js (traffic's step must use rd.net).
- [ ] Phase 4 levels: the bridges / underpasses of research §3.5 (checker C11: 21 today).
- [ ] Phase 5: C12 orthophoto review on all tiles (768 review items), the BM legend once answered, speed bumps BR12L, manholes, wear, checker in CI (`node --import ./tools/road_audit/register.mjs tools/road_audit/road_audit.mjs --all`).
- Reference images: the owner OK'd LOOKING at Google Maps / Street View to check colours, materials, markings (a human visual check only: never trace, extract, store or ship their imagery or geometry). Prefer CC0 UrbIS orthophoto, Mapillary (CC BY-SA), Wikimedia Commons, own photos for anything measured.

**Later (owner, 2026-11-10): seasons as well as weather** (leaves colour and fall, bare winter trees, snow, flowers in spring, low winter sun).

**Pedestrians (research DONE 2026-11-12: docs/PEDESTRIANS_RESEARCH.md):** vendor Mr.doob's code-built people (MIT) + extend (children, elderly, coats, umbrellas, prams, dogs, seasons); clips baked into a bone table (walk / run / idle from his gait code run on a treadmill: scripted, no clip licence); LOD: live rig < 18 m, baked 18-60 m, tiny mesh 60-250 m, then nothing (no impostors); walk graph per tile from UrbIS sidewalks + roads v2 crossings + OSM paths + tram stops; one signal clock with traffic; density by hour / place / weather; target 300 people <= 1 ms GPU + <= 0.5 ms CPU. Phases P0-P8 (critical path P0 -> P1 -> P2 needs roads v2 -> P3 needs the traffic merge). OWNER QUESTIONS: Quaternius UAL1 (CC0) clips OK? MPFB2 bodies OK as "scripted"? stylised vs realistic look; dives vs calm step back; busyness; children + dogs; night; zebra behaviour.

**Pedestrian Lab P0 + P1 DONE 2026-11-11 (branch claude/pedestrians, lab only; docs/PEDESTRIANS.md, resume: docs/PEDESTRIANS_RESUME.md):** Mr.doob's people vendored unchanged (vendor/slop-ped, 536a907); gait baked from his rig (tools/peds/bakeGait.mjs -> models/pedestrians/clips.*); banded crowd (live rig < 18 m, bone table on the GPU 18-250 m, LOD0 3.4k / LOD1 954 / LOD2 269 tris, dithered fades, nothing beyond 250 m); meters: 0 coverage / shadow pops, 0 unfaded spawns in view, live slide p95 0.05 m/s, baked mid p95 0.11-0.36 m/s (turns), gap p95 < 1 cm; CPU 300 people 0.46-0.56 ms (his all-live 1.0 ms). Remaining:
- [ ] GPU cost of 300 on a QUIET machine (this run: +0.39 ms at best, +2 ms under the shared GPU; target <= 1 ms)
- [x] Baked foot slide in turns, baked feet on kerbs / slopes: round 2 (plant pin + per-foot ground): mid p95 0.03-0.07 m/s, no sinking in the mid band
- [ ] Far band (> 64 m) still slides / sinks at kerbs for a moment (no pin there, to save CPU); CPU for 300 at ~0.5-0.6 ms: quiet re-run, then trim (SoA arrays, pin at 30 Hz in LOD0 too?)
- [x] P4 bodies v2 (round 2): children, older people (stoop, cane), coats, skirts, scarves, hats, umbrellas (rain hook), bags, backpacks, prams, dogs; season palettes. Left: female-fitted clothes, child limb proportions, a better pram / dog, more hair styles
- [x] UAL1 (CC0) sit / sit-talk / talk retargeted (round 2); phone and pram are scripted overlays (not in the free pack). Left: Sitting_Enter / Exit transitions
- [x] Behaviour round 2: calm step back, dives only at speed (test car), groups of 2, talking pairs, sitting on benches / café chairs. Left: groups of 3, shop windows, companions with their own route
- [x] Polish 2026-11-11 (docs/PEDESTRIANS.md "Polish"): dog leads sag (parabola from the slack of a 1.6 m lead), a baby in the pram's carrycot (head, bonnet, blanket), the pram's front castors swivel into turns, no line where a jacket meets a long coat. Left: lead never wraps round legs / poles; the baby does not move
- [ ] P2 walk graph from data (UrbIS sidewalks, roads v2 crossings, OSM paths, tram stops) -> P3 signals + traffic (claude/traffic) -> P5 overlays -> P6 behaviour in the city -> P7 `?peds=1` streaming, determinism, A/B in the city -> P8 optional (MPFB2 near band, night lights)

**Parks, in order (owner, 2026-11-11):**
1. [ ] Wolvendael château hero + the POND (calm water with sky / tree reflections, reeds, water lilies): the shared park-water system. Starts when the Van Buuren agent finishes. Prep: docs/heroes/WOLVENDAEL_PREP.md (claude/hero-prep). The Louis XV pavilion waits for the owner's decision on carved ornament.
3. [ ] (later) The POLICE STATION near the Château de Wolvendael (owner, 2026-11-11), as a hero building: important if we make a police game. LOCATED 2026-11-12 (docs/heroes/POLICE_PREP.md on claude/hero-prep): Rue Rouge 17, city (-512.7, -348.3), tile E4, UrbIS solid 528055, 45 m west of the chateau; a move to Rue de Stalle 96 (solid 549112, D5) was announced in 2025 but may not happen (police zone merger). OWNER: which one?
2. [ ] Parc de la Sauvagère (next to the Kauwberg; the owner knows it well): the "Temple grec / Griekse tempel" folly (OSM way 1520963969) as a small hero, the rock garden (scripted rocks, a few shapes instanced), the pond (reuses 1), the children's playground (a reusable scripted playground kit for all Uccle playgrounds), ground cover from the planting system, LiDAR trees with real species. Budget <= 0.5-1 ms walking through it, ~0 from the street or the sky. References: only 2 general photos on Wikimedia Commons; the OWNER will send photos (temple, rocks, pond, playground) to data/raw/refs/sauvagere/.
   - [x] Phase 1 (`claude/sauvagere`, 2026-11-11, port 8822: http://localhost:8822/labs/park-kit-lab.html): references + docs/heroes/SAUVAGERE_PREP.md (parts, coordinates, plan, risks, the owner's SHOT LIST); rock kit (9 rocaille + 2 natural pieces) and playground kit (10 pieces), meshoptimizer LODs, instanced with per-instance dithered fades (viewer/parkKit.js), checker 0 blocking on every piece / LOD.
   - [ ] Owner: photos per the shot list (temple all round + the red ring, the cliff from the shore, the cascade's course, the pond edges, the playgrounds), then OK for the temple.
   - [x] Kit round 2 (owner's photos o01 / o02): grey pillar-grammar rock pieces, sculpt baked to normal map + AO on light low-polys, LOD2 as shadow caster, Sauvagère cliff laid out like o01 (0.92 ms at 12 m, 0.26 ms at 30 m), playground batched to one draw per piece.
   - [ ] Rock look vs o01: still reads as a palisade of similar pillars (o01: broader blocks, a lumpy sloping mass, more cantilevers and broken tops, plants); too smooth / "clay" close up; colour slightly blue under the open-sky presets (o01 is under the canopy). 12 m walking still 0.92 ms (target 0.8).
   - [x] Round 3: mound from the DTM, rule-based placement, plants, canopy preset, CC0 detail normal (Poly Haven, adopted), CC0 scanned cliff (tried, not adopted).
   - [ ] Round 3 GPU numbers to re-take on a quiet GPU (another agent's WebGPU tab was open during the last runs: interleaved A/B gave contradictory deltas). Last clean runs: 44 smaller pieces 0.46 ms at 12 m / 0.13-0.26 ms at 30 m; 53 bigger pieces 0.92-1.11 / 0.39.
   - [ ] Mound look: still fewer, smaller and more separate blocks than o01 (its face is all rock); the dense variant (?mscale=1.1&mdensity=1.3) is closer but costs more; the canopy dome is a stand-in (blobby holes); plants are small and sparse.
   - [x] Round 4: the cliff as ONE scripted hero surface (sauvagereCliff.py, 8 LOD chunks, checker 0), plants in clefts, canopy without holes + dappled shadow screen.
   - [ ] Round 4 look vs o01: blocks still too regular / rounded (a stacked "wall"); o01 has bigger, more angular pillars and slanted slabs, broken overhangs; white fuzzy fringes on some edges close up (detail normal / bake margin); ferns are crude zig-zag triangles close up; water is a flat plane.
   - [ ] Round 4 cost with the post chain: 1.11 ms at 12 m in the lab (vs an empty sky): measure in the city context (trees behind) before deciding.
   - [ ] Exedra (the temple, o02): semicircular parapet + bench, 5 fluted columns, stepped curved base, paved floor: phase 2.
   - [ ] Playground kit cost: ~1.05 ms in the sample playground at 10 m after batching (16 draws, was 39): next, shadow proxies like the rocks and lighter swing chains.
   - [ ] Temple hero (phase 2), cliff placement JSON from the photos, cascade from rk_channel + the park-water module (claude/wolvendael), playground placement, near planting; Verrewinkel brick bridge (3 arches, corbel frieze: railBridge.py variant, trains work).

**HIGH PRIORITY after the town hall round 2 (owner, 2026-11-10): the flag system** (the town hall flies flags; more flags across the city later). Verlet cloth (same idea as game-engine-v1/v3/props/flagFactory.js, read only, write our own). Near flags (< ~60-80 m, on screen): live sim, ~12x8 grid, fixed step, city wind, < 0.05 ms each. All others: the same sim baked offline into a small looping vertex-animation texture played by the GPU (3 wind strengths, random phase per flag), zero CPU, hundreds for the price of one; smooth fade loop -> live when approaching (no popping). Procedural flag designs: Belgium, EU, Brussels region, Uccle. Flag Lab page (wind, fabric, size, live vs baked side by side, cost). Then attach to the town hall poles (positions in models/townhall/NOTES.md after round 2).

**Queue (owner, 2026-11-07), in order:**
1. Trains: SNCB lines and stations of Uccle (verify the list: Uccle-Stalle, Uccle-Calevoet, …), tracks with embankments and cuttings, stations with platforms and shelters, SNCB trains (double-deck + suburban types) in Blender at a HIGHER quality than our tram, on the real timetable (SNCB GTFS open data). The RAILWAY BRIDGES are important: the bridge over Chaussée de Saint-Job ("nice shape"), the bridge near Uccle-Calevoet / rue des Roses next to the station, and the others: model them as heroes. References: UrbIS (bridge solids / Land cover levels +1), OSM bridge=yes ways, Wikimedia Commons, heritage inventory, Mapillary; NOT Google Street View/Maps imagery (terms forbid deriving models; the owner suggested Google: explain).
2. A better tram: the T3000 "still looks somehow": a quality pass to the trains' level, same performance budget.
3. [x] Saint-Pierre church DONE (exterior; `claude/saint-pierre`, `?stpierre=1`, Saint-Pierre Lab), waiting for the owner. Then Van Buuren museum, Wolvendael.
2. [x] A better tram: DONE on `claude/tram2` (not merged), waiting for the owner: `tools/blender/tram2.py`, `viewer/tram2Model.js`, the city's default (`?tram=v1` = old, `?tram=box`); research, before/after with photos, perf, frame checks: `docs/tram2/RESEARCH.md`. The old one WAS too low (3.30 m; photos say ~3.6 m). Nose re-shaped 2026-11-07 (taller glass, display in the glass, round silver visor, rounder corners: `docs/tram2/compare/`). Left: gold panel blotchy in strong light, fleet number / STIB logo decals, people inside, line 97's PCC 7900 (+ stib-97 transit data), T4000 if module lengths are found, LOD0 costs ~2.5x v1 per tram (fine in the city, 1-2 trams within 90 m).
3. Next hero: Saint-Pierre church (Uccle-Centre), then Van Buuren museum, Wolvendael.
4. Later: real-time APIs to make the city realistic (live weather: Open-Meteo / RMI; live STIB and SNCB positions and delays; time of day already real); and the MONETIZATION ideas (docs/MARKET.md: sun and shadow studies for architects, participation tools for communes, freelance showcase; revisit with what the city can do now).

**Waiting for the owner's eye:**
- [ ] Police station, Rue Rouge 17 (2026-11-12, branch `claude/police`, not merged, `?police=1`, labs/police-lab.html; models/police_rouge/NOTES.md). The station (two flat-roofed wings, the stepped public entrance, windows with screens, solar rows), its yard (asphalt + markings, rubble wall, mesh fence, hedge, sliding / north gates, flagpoles, POLICE blade sign with plain lettering) and 5 parked patrol cars (faceted family, Battenburg livery). Left: (a) no free photo: Street View look-only; the back faces, wing B south, wing A north and the link ESTIMATED (the owner's photos would settle them); (b) the inner galvanised fence along the pedestrian lane, the bins, the bike rack; (c) the cars as instanced types (now ~30 draws near), livery lettering if wanted; (d) the yard reads navy in the lab's shade; (e) packed LOD2 13 audit items (> 440 m); (f) for a police game: interiors (front desk, offices) only from public material, the gate animated, cars that drive out (drive mode + the livery); (g) the planned move to Rue de Stalle 96 (solid 549112) if it happens.
- [ ] Wolvendael château + its pond (2026-11-11, branch `claude/wolvendael`, not merged, `?wolvendael=1`, labs/wolvendael-lab.html; models/wolvendael_chateau/NOTES.md). Left: (a) entrance side / SW end / annex ESTIMATED: Street View for colours, then the owner's photos; (b) the central band's frieze + consoles, the sign's lettering; (c) reflection tree proxies are blobs (an impostor-card proxy would match better); (d) water too dark seen from above; (e) the shoreline under a frozen clock untested (the flicker test does not stop TSL time); (f) one fading-copy pipeline still built on the first city flight (~60 ms); (g) packed LOD2 audit 86 items (> 440 m); (h) reuse viewer/water/ for the Sauvagere pond.
- [ ] Moving traffic (`claude/traffic`, Traffic Lab, city `?traffic=1`, `docs/TRAFFIC.md`): lane graph on the measured streets, IDM, real OSM lights in step with the drawn heads (furniture.js now cycles them), priorité de droite, parking in / out, obstacles + colliders; 0.18 ms CPU for 135 cars, +0.3 ms GPU. Left: trams do not stop for cars, unmapped priority roads, two-phase lights only, a few lanes still hug kerbs, no headlight beams, no lane changes.
- [ ] STAIRS BROKEN in the feet audit (owner saw it live 2026-11-06: trailing leg overstretched, swing foot kicked ~45 cm up behind the body); fix in progress on `claude/character-audit` with pose-plausibility checks; must be clip-agnostic (more animations coming later). Coordinator must check moving frame sequences before showing.
- [ ] Église Saint-Pierre (`claude/saint-pierre`, `?stpierre=1`, Saint-Pierre Lab; models/stpierre/NOTES.md, docs/saint-pierre/RESEARCH.md): exterior from UrbIS + DSM + 4 posed photos (front, tower, south side, fourth nave); 30.9k / 12.5k / 1.7k tris, 10 draws, GLB 1.0 MB; city +0.24 ms on the parvis, ~0 from 236 m; moving flights 0 pops. Key finding: the inventory photo hid the front's base behind cars (door 6.3 m, not 5 m), rescaled; matches the DSM tower now. Polish 2: dark red-brown cross-bond brick, pale stone, leaded clear glass, subtle dial mouldings, dome raised to the DSM (the P02 overlay showed it hidden), AO 24 px/m; full-screen close-up +1.38 -> +0.65 ms vs the UrbIS solid (fade discard only inside LOD bands, no SSR on small metals, TSL toVar), city parvis +0.04 ms. Left: east end / annexes / fourth nave north wall estimated (no photos); P01/P03 overlays approximate; interior next (1 interior photo only: needs references).- [ ] STAIRS BROKEN in the feet audit (owner saw it live 2026-11-06: trailing leg overstretched, swing foot kicked ~45 cm up behind the body); fix in progress on `claude/character-audit` with pose-plausibility checks; must be clip-agnostic (more animations coming later). Coordinator must check moving frame sequences before showing.
- [ ] Character feet audit (`claude/character-audit`, Capsule Lab "Foot audit" cameras, 40/40 tests): foot locking (running slide 0.9 → 0.02 m/s), heel+toe rays (toes through kerbs 14 → 3 cm), swing feet clear steps, landing absorb, no jump onto 1 m blocks, frame-rate independent. Left: walking UP steep stairs (heel/toe across the riser, 15-20 cm worst frames), no jump/fall pose, turn in place = pivot + step, pelvis drops 21-25 cm going down steep stairs; coordinator review: the pelvis also dips ~10 cm before a 15 cm kerb (deep).
- [ ] Material Lab ROUND 3 (`claude/materials`, port 8809: http://localhost:8809/labs/material-lab.html, old lab ?old=1): NEW REVIEW UX: list with badges (P / S scans / G generated / M Megascans, ms, verdict), 2-4 versions side by side on the same wall / light / camera, distance rows 1-200 m, STRAFE + SHIMMER meter, choose this / needs work / note, download verdicts.json -> commit as viewer/materials/verdicts.json; town hall + street A/B views. Scans hex-tiled (no hybrid), procedural shimmer fixed (brick 10 m: 69 926 -> 64 ppm), 69 CC0 candidates for 23 materials, Megascans shopping list docs/materials/MEGASCANS_LIST.md (download free sets into data/raw/megascans/, licence check before public). Then switch heroes, ground and façades to the picks.
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

**Later (owner, 2026-11-12): extend north to ALTITUDE CENT (Forest) for the Église Saint-Augustin (1930s Art Deco concrete church on the hilltop, OSM way 40614983, ref:UrbIS 5077320; city ~(-899, -1966), outside Uccle and outside our 120 tiles): with the Brussels expansion, after Uccle is clean.**

**Bridges, underpasses, passages (owner, 2026-11-12: the road bridge at Saint-Job station looked missing / broken):** NOT DONE in the city: roads are draped on the bare-earth DTM (bridges removed), so road-over-rail bridges dive into the cutting. Built so far only on branches: Saint-Job rail bridge, Calevoet viaduct, Verrewinkel road bridge. To do as one job (road phase 4, on top of claude/roads2, Verrewinkel method + road checker): road bridges over the railway: Av. Jean et Pierre Carsoel (Saint-Job station), Ch. de Waterloo, Av. Franklin Roosevelt, Av. des Tilleuls (2), Rue du Bourdon, Rue du Merlo, Av. de Haveskercke, Av. de la Chênaie, Broekweg (+ footbridges); underpasses: Rue des Bigarreaux, Rue de la Brasserie, Av. des Biches; ~40 roads through buildings (archways); the checker's 21 "levels" warnings.

**Street life / wayfinding lab (owner, 2026-11-12):** shops with their real names on the fronts, fuel stations (canopy, pumps, price board), pharmacies (green cross), cafés with terraces, supermarkets, bakeries, banks, schools, churches' notice boards, bus / tram stops with names, bilingual street plates at corners, house numbers (UrbIS addresses), Villo bike stations, red post boxes, recycling bubbles. OSM POIs + UrbIS addresses + STIB stops; brand names as text, no logos; one text atlas; built per tile in the worker; lit at night (night lights lab). Lab first; city after the facade kit + roads v2 merges.
  - [x] Lab done on branch claude/streetlife (docs/STREETLIFE.md, labs/streetlife-lab.html: Place de Saint-Job, Fort-Jaco, Alsemberg/E4): real OSM names on fascias / projecting signs / awnings, one SDF atlas, parallax shop windows (vendor/slop-street), fuel (17 stations in the tiles), pharmacy crosses, terraces, STIB stops + shelters, Villo, bpost, glass bubbles, FR/NL plates, UrbIS house numbers; +0.13 ms GPU at street level (noisy), ~0 from the sky; mesh audit 0 blocking; flicker: no shimmering letters.
  - [x] Street life round 2 (2026-11-12): big contrast-aware fascia letters + backlit / spots / lightbox, Uccle plate layout, terraces on measured paving only, per-page atlas uploads (+0.7 ms vs +4.6 ms), fronts in the real wall plane, glass windows, licence list (docs/STREETLIFE.md).
  - [ ] Street life: a fixed ~0.6-1 ms GPU for ANY InstancedMesh (count >= 2) on a near-idle GPU in the lab (control cubes show it too): find out why (clocks? r187 WebGPU instanced pipeline?) before the city merge.
  - [ ] Street life: letters mounted straight on the wall (no board); terraces on paved forecourts the land cover misses.
  - [ ] Street life: shops in galleries / deep plots (53 unplaced shops, 46 schools).
  - [ ] Street life: re-fetch OSM POIs from overpass-api.de (still 502 on 2026-11-12; kumi.systems extract, osm_base 2026-07-24, in use); confirm the Brussels Mobility WFS and UrbIS address licences (links in docs/STREETLIFE.md).
  - [ ] Street life: "where am I" bilingual plate HUD (Mr.doob's location HUD idea); Villo bikes; menu boards (no data: skip unless a source appears).
  - [ ] Street life in the city: replace facadeGeom.js's OSM shopfront boxes, stream per tile with the tile worker, night uniform + nightSources() into the night lights lab (claude/nightlights).

**Bois de la Cambre:** mostly in the City of Brussels; its southern part lies inside our tiles (about 58 % of its outline), drawn today only as generic park + LiDAR trees. Later: a proper park pass (paths, the lake and the Chalet Robinson island if inside, lawns, the forest edge) with the park-water module.

**Foliage placement data (for when the owner approves the foliage lab):** UrbIS land cover (gardens vs paving vs lawns), the orthophoto greenness (the foliage agent already uses it), LiDAR low-vegetation height (0.5-3 m along plot edges = hedges; isolated blobs = shrubs), cadastral parcels + buildings (front vs back gardens), Bruxelles Environnement's biological valuation map and green-space layers (vegetation types per area), the street-tree inventory (regional roads), OSM parks / meadows / hedges (sparse); variety by rules: street type and house era (villa streets: laurel / beech / box; terraces: privet and window boxes), sun / shade, seasons.

**Cheap extras that make the city feel alive (coordinator ideas, 2026-11-12; each lab-checked for cost):** house numbers and letterboxes; Brussels street furniture (Villo stations, red post boxes, glass-recycling bubbles, Bruxelles-Propreté bins, JCDecaux shelters with ads); parked bikes and shared scooters; parking / speed-30 signs; manhole covers, drains, road patches (decals); graffiti on railway walls; chimney smoke in winter; pigeons at Saint-Job, starlings, squirrels in parks; the real moon phase and stars; aircraft overhead on the real Brussels approach routes; lit windows following real evening routines (lights on at dusk, off at bedtime, TV flicker); daily rhythms (school times, the Monday Saint-Job market, weekend traffic); Christmas lights and the Saint-Job market in December; autumn leaves on pavements; real STIB / SNCB delays shown at stops.

**Bigger steps:** phones and tablets; all of Brussels (pipeline at scale, GPU culling); the first game (suggested: the Saint-Job falcons; also driving, tram 92, exploration).

## Villa van Buuren (branch claude/vanbuuren, 2026-11-10; models/vanbuuren/NOTES.md; city `?vanbuuren=1`, lab labs/vanbuuren-lab.html)
- [ ] Owner's review (lab side-by-sides docs/vanbuuren/side_*.jpg, git-ignored; city moving strips docs/vanbuuren/city_*).
- [ ] The v00 (south) pose is the weakest (23 px mean, focal 12 % off the EXIF prior): more off-plane correspondences
      (the oriel's corners, the B roof's south eave, the basin) or the south face from another photo.
- [ ] The NW wing: lean-to + flat roof from the DSM (look round); its SW end's second plane (z = 103.96 + 0.755 c -
      0.671 t, valley at t ~2.05) is not modelled: the two-slab valley left 12-30 mm slits the audit stops (try a filler
      solid under the valley). Windows / veranda still ESTIMATED.
- [ ] Glass: the lower-left east window in the low sun reads brighter than v03; frames 6.5 cm vs ~10 cm in the photos.
- [ ] The lab's porch soffit takes a warm brown bounce in the post chain (white without it): check the SSGI / SSR input.
- [ ] Lab "post effects" off: every material with an mrtNode (glass, zinc, green) fails to build (WGSL "structures must
      have at least one member"): lab-only, the city always renders through the scene pass.
- [ ] The east gable's ground-floor bay (behind the topiary) and the south-east ground floor: not seen, plain brick.
- [ ] The heritage inventory has no record for Avenue Leo Errera 41 (2026-11-10): check again / the museum's plans.
- [ ] Packed-audit leftovers after quantization (raw GLB 0 blocking): a few 4 mm slits at the ridge caps / NW roof
      course ends, one 2 cm2 union sliver at roof C's split (u -2.0); look again with a coarser quantization guard.
- [x] LOD2: 2 levels kept (LOD1 = 0.07 % of the city frame's triangles, 2.8 % of its draws, +0.13 ms at 400 m; NOTES).
- [ ] Materials: brick_orange_amsterdam, roof_tiles_flat_dark, concrete_white (+ brick_pattern, wood_varnished,
      glass_leaded, oak_door, metal_green_veranda, zinc_gutter) proposed for the library (claude/materials); the slot
      adapter table in viewer/vanbuurenModel.js points them at the library with one line.
- [ ] Gardens: the box hedges, topiary, the front path's brick paving, the lawn steps are the city's (not modelled).

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

## STIB tram model v2 (`claude/tram2`, 2026-11-06, waiting for the owner)
- [x] Re-measured (taller: hood 3.58 m), named material slots, baked AO (UV1), interior through see-through glass, plug doors
      opening at the stops on the platform side, bellows bent in the vertex stage, pitch on slopes, pantograph on the wire,
      mid / far LODs from Blender variants trimmed by meshoptimizer (welds keep AO seams), dwell + brake lights in tramline.js.
- [ ] Nose outline fitted on the 3041 / 3001 fronts (taller windscreen, rounder plan corners, thicker hood visor).
- [ ] Gold panel: brownish blotches in strong light (reflection); grime streaks under windows, roof dirt.
- [ ] Decals: fleet number on the nose, "www.stib.be", STIB logo on the sides, door push buttons.
- [ ] Passengers (a few shared low-poly figures by the windows), a better driver's cab.
- [ ] Line 97: PCC 7900 model + `pipeline/build_transit.py --line 97`; T4000 if its module lengths are published.
- [ ] Module lengths are v1's estimates (cab 8.825 / susp 5.6 / centre 3.0): confirm on a side-on photo.
- [ ] Re-measure GPU when no other agent shares the GPU (round 1 only was clean: within noise of v1 and of no trams).
## Material library (branch claude/materials; waiting for the owner's choices)

- [ ] Owner: pick a version per material in the review lab, download verdicts.json, commit it as `viewer/materials/verdicts.json`; Megascans: claim + download the must items of docs/materials/MEGASCANS_LIST.md, check the Fab licence for a public web build.
- [ ] After the picks: promote the chosen candidates (re-encode with RDO into viewer/materials/textures/, commit), drop the rest; decals path (leaks, moss, cracks, gum, manholes) for the façade kit and the ground; other heroes in the building view (Calevoet, Van Buuren, Stalle, police).
- [ ] Then the integration steps of `docs/MATERIALS.md` (hero assets first, then ground, façades, roofs).

## Texture factory (branch claude/texfactory, 2026-11-13; docs/TEXTURE_FACTORY.md)

- [ ] Owner: review the factory sets in the Material Lab (versions "Factory <family> <variant> 1K/2K", badge "CC0 texfactory"; serve the claude/texfactory worktree, its generated files are local) next to the scans. Clear factory wins in my read: stone_blue, slate, paving_concrete, brick_dark; ties: asphalt, brick_yellow, render_white; scans still win: brick_red (near), stone_white (surface), cobbles, roof_tiles_red.
- [ ] Factory round 2: brick_red mortar irregularity + fewer pockmarks; cobbles less regular; pantile course break (reads as corrugated at 10 m); stone_white crust + sharper joints.
- [ ] Trees: plug the factory barks (scan format) and leaf sprays (params.leafAtlas, 3 seasons) into the Tree Textures lab (claude/foundation) and compare live; rework birch / horse chestnut bark, plane flake edges.
- [ ] Re-measure GPU cost (lab cost button) on a quiet GPU: the 2026-11-13 numbers were taken behind other WebGPU tabs.
- [ ] After a merge conflict in viewer/materials/candidates.json: take the other side, run `python -E -P tools/texturefactory/register.py`.

- [x] 2026-11-13 Shipped defaults + city switch DONE (claude/texfactory, not merged): the best version per material is the library default (factory: stone_blue, slate, paving, brick_dark, brick_yellow, asphalt, render_white; CC0: brick_red, stone_white, cobbles, copper, new roof_tiles_red = RoofingTiles014B), committed as 1K KTX2 + WebP; ON in the façade kit, every landmark, the bridges and the procedural façades' walls + roofs (`?libmat=0` = before); 24 MB GPU / 17 MB download; GPU cost within noise except the Observatory close view (+0.5 ms); docs/TEXTURE_FACTORY.md "City switch".
- [ ] ROADS SWITCH after claude/roads2 merges: asphalt / paving_concrete / cobbles from the library (shipped.js GROUND_HOLD, roadPaint.js asphaltMaterial / concreteMaterial, cobbles.js, plazas.js, hero forecourts, the Verrewinkel bridge deck), with A/B images + flicker + cost like the other consumers.
- [ ] Kit: copper_patina + brick_dark slots still on stand-ins (16 sampled textures per stage): per-slot draws, or request maxSampledTexturesPerShaderStage 48 when the adapter has it.
- [ ] Re-run the city A/B on a quiet GPU (the 2026-11-13 run shared the GPU with the roads agent; the kit's numbers are unresolved).

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
- [x] Sound Lab (branch claude/sound, 2026-11-11): all procedural (no audio files), `labs/sound-lab.html`, `viewer/audio/`,
      method / costs / renders in `docs/SOUND.md`. Footsteps x6 surfaces, cars (RPM/load, setts tyres, doors, horn, Doppler),
      tram 92 (rumble, curve squeal, whine, bell, doors, chime), AM08 trains, wind, rain, hum, 6 bird species by hour and season,
      church bells on the hour, dog, playground; HRTF near / equal-power far, muffling, one reverb, voice limit, mixer.
- [ ] Sound, owner review: listen to `docs/sound/renders/*.wav` (list + what to listen for in docs/SOUND.md); compare the
      T3000 bell / door beeps / stop chime, the AM08 horn, the Saint-Job curve squeal pitch and the Saint-Job / Saint-Pierre
      bells with the real ones (all are panel parameters; none is documented online); say which sounds are wrong.
- [ ] Sound into the city: SoundEngine on the camera; occluders from the drive colliders' 48 m cells; sources from carFleet /
      tramline (real curve geometry) / falcons (calls) / Saint-Job tower; footstep surface from surfaces.js; birds on street
      trees by land cover; the city clock + weather drive birds, rain, wind; a "Sound" dev-panel folder (mixer, mute N).
- [ ] Sound polish: better children's voices (formant babble is robotic close up), stronger muffling for sources behind whole
      blocks, night birds (tawny owl), positional rain drips (gutters, car roofs, awnings), tyre squeal in corners, bicycles,
      buses, sirens (Mr.doob's siren voice is in vendor/slop-sound), pedestrian talk, the falcons' calls; audio-thread budget
      on weak laptops (adaptive voice limit / HRTF count from a render-capacity probe).

## 7. Atmosphere
- [ ] Real sun position for date and time (Brussels lat/lon); the clock shared with the trams.
- [ ] Weather: rain (wet roads, puddles, drops), fog, snow; clouds moving.
- [ ] Seasons for trees and grass.

## 7b. Winter (owner, 2026-11-04: "it's going to snow in a month")
- [ ] A winter version: snow on roofs, ground and kerbs (slope- and exposure-aware), bare deciduous
      trees (branch skeletons already exist), winter sun path (Firmament `?day=` ~350), low sun, frost /
      wet roads, falling snow. Switchable by date or a preset.

## 7c. Weather + seasons lab (branch claude/weather, docs/WEATHER.md)
- [x] Research (docs/WEATHER_RESEARCH.md); lab labs/weather-lab.html with rain, wet / puddles / ripples, fog + mist,
      falling snow, volumetric snow (drifts, rounded eaves, footprints, tyre tracks, slush), seasons, live weather.
- [ ] Owner review of the lab (rain at night, snowstorm, deep snow + sun, autumn, live weather).
- [ ] City wiring: one `Weather` + `weatherize()` in the ground / facade / roof / car material factories, the overhead
      map + snow layer as a sliding window round the camera (shape pass in a worker), weather fog as scene.fogNode,
      dev-panel "Weather" folder (presets + live toggle), the date slider driving `season.js`.
- [x] Far-tile variant of weatherize: `lite: true` (round 2, ~0-0.1 ms measured); wire it to the far tiles.
- [ ] Trees: claude/foliage reads `viewer/seasons/season.js` (leaf colour / autumn / density per leaf, fall).
- [x] Side-by-side with real photos (round 2: data/raw/weather_refs/compare_*.jpg, findings in docs/WEATHER.md).
- [ ] Night: the cloud deck's orange city glow in Firmament itself (the lab fakes it with a hemisphere light).
- [x] Puddle ripples + SSR flicker near the camera: ripple normals filtered by their pixel footprint + specular AA
      roughness (polish 2026-11-11, docs/WEATHER.md "Polish"); puddle region 0 ppm over 8 samples (was up to 102).
- [x] Thin-snow holes follow the ground texture (sett joints, grass tufts: `weatherize({ ground })`), the layer gives
      way below ~2 cm (polish 2026-11-11). Lawn mid-distance patches still a little blobby (tuft noise).
- [ ] Trampled sidewalk snow, snow on rails / fences, tracks in thin snow on the materials.
- [x] Snow on branches / evergreens (hooks), sill caps, icicles + drips, salted roads (round 2).
- [ ] Snow sliding off steep roofs; finer layer near the camera (2 cascades: 6 cm near, 25 cm far).
- [ ] Rain: drips from eaves and gutters, wet glass close-up (normal-mapped drops), thunder / lightning (sound lab).
- [ ] GPU numbers on a quiet machine (another lab ran during the 2026-11-11 rounds).

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

## Calevoet station (branch claude/nekkersgat, 2026-11-12)
- [ ] Owner review: Station Lab (labs/calevoet-lab.html) + city ?calevoet=1; side-by-sides docs/calevoet/side_*_lab.jpg (local only).
- [ ] Car-park side: a free photo (or the owner's) to replace the ESTIMATED openings; the north pavilion's gable under the ivy.
- [ ] Canopy columns' positions from a frontal photo; the station clock and signs; overhead line masts (procedural).
- [ ] Packed LOD2 audit items (125, > 385 m) and the packed LOD0 leak.
- [ ] Materials Lab: brick_painted_white, paint_grey_dark, cast_iron_dark proposed for the library.
- [ ] Moulin du Nekkersgat: not modelled (models/nekkersgat/NOTES.md: one usable photo, the wheel and courtyard never seen); needs photos of the courtyard side and the 2013 wheel.
