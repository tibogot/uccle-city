# The underground plan: car parks, tunnels, passages (research, 2026-11-24)

Owner, 2026-11-23 (docs/TODO.md, Step 3, UNDERGROUND): Parking Saint-Pierre as the hero car park, then one car-park
kit for the others, the 4 unbuilt road tunnels, then the roads through buildings. This is the plan only: no code.

## For the owner, in short

- **The numbers in the TODO were too big.** `data/raw/osm/area.json` is a box round Uccle: it also holds Ixelles,
  Forest, Watermael-Boitsfort and Linkebeek. Inside Uccle itself (a fresh Overpass query on the commune's boundary,
  2026-11-24) there are **8 underground car parks** (6 of them small private garages), **22 mapped car-park entrances**
  (8 tagged underground), **1 multi-storey: Parking Saint-Pierre**, and **19 roads through buildings** plus 4 covered
  stretches.
- **Parking Saint-Pierre is real and a good hero**: the commune's covered car park at Rue du Doyenné 63, behind the
  church, 44 places in OSM (the commune's 2025 brochure says 40), fee, 2 hours max, free after 18:00, gates shut at
  night and open at 07:00. The building is about 26 x 47 m and 5-9 m high: **two decks** (the street level and one
  above), not a deep basement. A fictional level -1 is possible for the game; your choice (end of this doc).
- **The 4 "tunnels" are not 4 tunnels to build:**
  - Rue des Bigarreaux runs under the L124. That crossing is **already built** as hero rail bridge 688
    (docs/trains/BRIDGES_ROUND2.md).
  - Avenue des Biches is not a rail tunnel. It is 2.6 m of street under a link between two houses (2.2 m clearance),
    so it belongs with the passages.
  - Rue de l'Élan and Rue du Bien-Faire pass under the L161 in **Watermael-Boitsfort**, outside Uccle, where the city
    has no tiles. They are parked until the map grows.
  - The `tunnels.js` method still gets used: it is how the car-park ramps will be cut into the ground.
- **Three of the four passages you named are in Ixelles** (Galerie de Waterloo, Rue Fernand Gillion, Square du Val de
  la Cambre), outside the built tiles. **Square Coghen** is in Uccle and becomes the hero passage. The Delhaize Place
  Danco porte-cochères on Chaussée d'Alsemberg (TODO line 44) are already a known defect: the UrbIS block closes them
  (docs/collisions/ROAD_FIX2.md item 5).
- **Street View look: not done yet.** The brief said look only and never screenshot, and the browser tool can only
  show me the picture through a screenshot. I got text only: the Google Maps listing for the car park (address, hours,
  "covered"). Job 0 below is that look, done the way you allow.

## 1. Inventory (data)

Sources: Overpass on `area["name"="Uccle - Ukkel"]["admin_level"="8"]` (2026-11-24); `data/raw/osm/area.json` and
`forecourts.json` (2026-11-23); UrbIS solids and the DTM from `data/tiles/<T>/`. City frame x / z (m, docs/CONTRACT.md),
tile. One-off scripts lived in a temp folder, nothing added to the repo. Streets = the nearest OSM street.

### 1a. Car parks inside Uccle

| # | what | OSM | x, z | tile | street | tags (capacity / operator / access) | entrance in OSM |
|---|---|---|---|---|---|---|---|
| P1 | **Parking Saint-Pierre** (multi-storey) | way 438432517 | -736, -575 | E3 | Rue du Doyenné 63 / Place Homère Goossens | capacity 44, fee, maxstay 2 h, access permissive, asphalt; UrbIS solid 526782: 26 x 47 m, base 50.42, eaves 55.56, top 59.37 m TAW; ground 50.5-51.7 m (flat) | none mapped |
| P2 | communal underground car park | node 9627537495 | -1438, 198 | D5 | Rue Gatti de Gamond / Rue de Stalle | public, fee, 2 h, operator Commune d'Uccle | none mapped |
| P3 | CHIREC underground car park | node 9685614114 | 582, -1684 | H1 | Rue Vanderkindere / Rue Général Lotz | customers, fee, operator CHIREC | node 9685614116; ramp way 1053957993 (building_passage, maxheight 1.9, concrete, two-way) + private passage 1053956451 |
| P4-P9 | 6 private residential garages (layer -1) | nodes 9546872244, 9547040988, -991, -993, -998, -999 | 157..316, 317..851 | G5 / G6 | Av. François Folie; Clos du Drossart; Rue de la Pêcherie; Ch. de Saint-Job | private, no capacity | none mapped |
| E1-E4 | customer underground car park, 4 entrances | nodes 3064408474, -489, -768, -772 | 2453..2580, 1539..1619 | K8 / L8 | Avenue Van Bever / Drève de Lorraine | underground; 3 one-way service ramps `tunnel=yes layer=-1 access=customers` (302192080 / -082 / -083) | yes (4) |
| E5-E7 | private underground (residential) | 12036565411, -414, 12036594173 | 460..477, 1934..2011 | G8 / G9 | Avenue Dolez | private, underground | yes |
| E8 | underground entrance | 13750399557 | -1192, 512 | D6 | Av. Guillaume Herinckx | underground | yes |
| E9 | overhead-door entrance (level -1) | 12980106870 | 449, -15 | G4 | off Avenue Circulaire | door=overhead, automatic_door=serviced_on_button_press, kerb 0 | yes |
| E10-E11 | Colruyt Stalle | 7626011236 / -237 + aisle 1144190365 (building_passage, parking_aisle, open Mo-Sa 08:30-20:00) | -1861, 276 | C5 | Rue de Stalle | covered car park under the shop | yes (2) |
| E12-E13 | Moensberg | 8365159455 / -456 | -1283, 2306 | D9 | Moensberg / Rue de Linkebeek | untagged | yes |
| others | untagged entrances (1 each) | 1229196417, 2386838110, 2386838120, 2386855222, 6862694064, 8564168914, 9660093888 | | J4, H3, H3, I1, J6, D5, I5 | Ch. de Waterloo; Av. De Fré; Rue Edith Cavell; Ch. de Waterloo / Rue Émile Claus; Ch. de Waterloo; Rue du Wagon; Av. du Prince de Ligne | customers / private / none | yes |
| R1-R2 | rooftop car parks (not underground) | 1332536148 (Galerie Fort-Jaco, fee), 1025659044 (customers) | 1719, 958; -1413, 635 | J6; D5 | Ch. de Waterloo; Rue du Wagon | rooftop | 8500123128 (rooftop ramp) |

In area.json but **outside Uccle**: 20 of the 36 underground-tagged nodes, and both multi-storey entrance nodes (349330219
and 2580493366 at 3386, -2088, past the grid's north edge). None of them is in a built tile.

### 1b. The four "tunnels" from the TODO

| way | OSM | x, z | tile | length | under what | verdict |
|---|---|---|---|---|---|---|
| Rue des Bigarreaux | 640826547, `tunnel=yes layer=-1` | -1106, 1638 | D8 | 13.5 m | **L124** (Brussels-Charleroi), 7 m from the tracks | already a hero rail bridge (688, round 2; docs/trains/BRIDGES_ROUND2.md, DRIVECHECK.md): nothing to build; job 9 checks it |
| Avenue des Biches | 227100124, `tunnel=yes covered=yes`, maxheight 2.2, one-way, lit | -525, 2307 | E9 | 2.6 m | no railway within 40 m; road at 96.1 m between UrbIS 529777 (eaves 102.6) and 532083 (eaves 101.8) next to Parvis Chantecler | a **link building over the road** (porch / bridge room) that UrbIS does not hold: a passage (§5) |
| Rue de l'Élan | 231063265, `tunnel=yes layer=-1`, maxheight 3.3, setts | 3726, -442 | (N4: no tile) | 23.7 m | **L161 / L161A** (Brussels-Namur), 24 m from the axis; a footway tunnel beside it (1427107247 / -248) | Watermael-Boitsfort, outside the city: parked |
| Rue du Bien-Faire | 627579509, `tunnel=yes layer=-1` | 3617, -850 | (N3: no tile) | 23.6 m | **L161 / L161A**, 11 m; footway tunnel 1422526040 beside it | Watermael-Boitsfort: parked |

Other underground roads inside Uccle that the TODO did not list: the K8 / L8 customer ramps (above) and a short setts
service tunnel at M5 (way 256270726, 3419, 319, off Chaussée de La Hulpe, needs a look). Kleindal and Brasserie are
built (docs/trains/TUNNELS.md). The ~90 other `tunnel=*` ways are stream culverts (Geleytsbeek, Ukkelbeek, ...) and
footways.

### 1c. Roads through buildings

| passage | OSM | x, z | tile | tags | UrbIS round it | in the city today |
|---|---|---|---|---|---|---|
| **Square Coghen**, west arm | 305672624 | -813, -811 | E3 | living street, setts, one-way, lit, covered, 7.0 m | 546604 (eaves 58.4) / 526804 | to check: probably closed by the solid, like D5 |
| **Square Coghen**, east arm | 305672622 | -743, -848 | E3 | the same, 5.1 m | 526734 / 526735 / 526296 (eaves 57-62) | the same |
| Place Danco Delhaize (2 porte-cochères + 1) | 243989844, 1127735605, 243989845 | -1005..-1021, 313..356 | D5 | service | 525568 (base 44.9, top 67.2), 511395 | **closed by the solid** (ROAD_FIX2 item 5: the collision test ends those routes at the façade) |
| Avenue des Biches link | 227100124 | -525, 2307 | E9 | see 1b | 529777 / 532083 | the link over the road is missing |
| Rue du Fossé / Ch. d'Alsemberg | 239939844 | -878, -1156 | E2 | service, setts, maxheight not signed | | to check |
| Colruyt Stalle aisle | 1144190365 | -1902, 285 | C5 | parking aisle, timed access | | to check |
| CHIREC ramp + private | 1053957993, 1053956451 | 566..587, -1683 | H1 | ramp to P3, maxheight 1.9 | | to check |
| others (service / driveway, mostly private) | 239938566 (I4), 253365777 (J4 Cité du Vert Chasseur), 672782707 (H5), 832522801 / 1284829448 (C5 Rue de Stalle), 914843502 (C4 Av. Kersbeek), 243989842 (D5), 1313020760 (E5), 1318769097 / -099 (F1 Rue Vanderkindere) | | | | | |
| covered service ways | 943260141 (H6 Ch. de Saint-Job), 1011930463 / -466 (J6 Ch. de Waterloo) | | | covered=yes | | |
| outside Uccle (no tiles) | Galerie de Waterloo 300483488 (H0, private, covered), Rue Fernand Gillion 1037715788 (C0), Square du Val de la Cambre 523287554 + 4312633 (J0 / K0), Rue du Patinage 1421127522 (C1) | z < -1950 | | Ixelles | | not in the city |

## 2. Street View look (job 0: still to do)

Not done in this job. The brief allows looking only, never a screenshot, and the browser tool shows me pixels only as
screenshots. What I could read as text: the Google Maps listing of **Parking Sint-Pieter** gives the address Rue du
Doyenné 63, opens 07:00, "covered car park", gates found shut before opening, free from 18:00. The look list for job 0
(own Chrome page under browser.lock, sound off, about:blank after), with what to write down each time (ramp direction
and slope, door / barrier, signage, portal, clearance bar, wall finish, lighting):

1. Parking Saint-Pierre: the entrance and exit on Rue du Doyenné (and on Place Homère Goossens if there is one), the
   street front, the deck edge (open sides or a closed façade), the barrier and pay station.
2. Car-park entrances: P2 Gatti de Gamond / Rue de Stalle; P3 CHIREC Rue Général Lotz; E1-E4 Avenue Van Bever; E10
   Colruyt Stalle; E9 the overhead door off Avenue Circulaire.
3. The tunnels: Bigarreaux under the L124 (compare with bridge 688 as built); the Avenue des Biches link (its height,
   arch or flat lintel); Rue de l'Élan and Rue du Bien-Faire (only to note the portal style for a later map growth).
4. Passages: Square Coghen, both arms (porch shape, height, setts, lamps); one Danco porte-cochère.

## 3. Parking Saint-Pierre, the hero

**Real frame (measured):** OSM polygon 1,389 m² (x -759..-714, z -604..-547); UrbIS solid 526782, 26 x 47 m, eaves at
+5.1 m and top at +9.0 m over a 50.4 m base; flat ground (50.45-51.68 m). That is two parking decks: the street deck
and an upper deck under a roof (or an open top deck under a roofed part). That needs ~22 places a deck, which matches
the 40-44 places. The church (viewer/stpierreModel.js) and the Parvis are 60 m away: the car park becomes part of the
Saint-Pierre hero district.

**Design** (Blender, `tools/blender/carpark.py` -> `models/carpark/stpierre.glb / .json / _ao.png`, named slots, the
villa's pipeline):
- **Shell** replaces UrbIS 526782 (hide list as the villa). Concrete frame, deck edges with a steel barrier rail,
  façade as job 0 shows (brick infill or open with mesh). Roof as the solid's top. Weld or skirt to the ground (joins rule).
- **Levels:** L0 at the street (+0.0), L1 at +2.9 m (2.3 m clear under the beams, 2.10 m height bar at the entrance).
  Optional **L-1 at -2.9 m** (fictional, owner's choice: the "underground" feel, a hiding level).
- **Ramps:** one straight two-way ramp along a long wall, 4.2 m wide, 15 % in the middle with 8 % transitions top
  and bottom (~22 m long with the transitions, fits the 47 m). The underside is modelled (a moto can ride under it).
  Kerbs and a painted arrow. The car's drive surface is a deck per level (world.decks, as the villa's drive_plane).
- **Bays:** 2.5 x 5.0 m, two rows on a 6 m aisle, painted lines and white bay numbers (decals in the slot's texture,
  no extra draw).
- **Pillars:** 0.4 x 0.6 m on a 7.5 m grid (3 bays), bevelled corners, a yellow-black base band (painted-metal slot),
  a "P0 / P1" level sign on each.
- **Ceiling:** beams, sprinkler and duct runs (merged, one slot), fire-door green pictograms (emissive).
- **Lighting:** no light objects. Fluorescent batten tubes as one merged mesh with the `lamp_glow` emissive slot. The
  interior is lit by a Cycles bake (per-corner baked light, as villaInterior.js: unlit slots + bake, day and night
  sets). The street side gets the city's lamp pool as now.
- **Parked cars:** 14-20 from the city car pack, one merged mesh per car slot (villaCars.js method), set per seed,
  never in the ramp or the aisle. Their rings go to the car colliders.
- **Exit and entry barrier:** a boom arm on a post (painted metal + a red-white arm), pay station, "P" sign, a
  "2.10 m" bar on chains. The arm turns open when the player is < 10 m and moving slowly, or always in a chase.
  Colliders are the closed arm or the open arm, never a moving one (the villa gate rule). The opening hours (07:00
  to night) are an owner choice.
- **Budget:** shell LOD0 < 40k tris; interior cell < 150k tris and <= 12 draws (one per slot, rule villa-budgets'
  method); parked cars <= 8 draws (merged per slot).

**Game uses** (police game, docs/POLICE_GAME.md):
- **Chase:** a fleeing stolen car may turn into the car park (a path node on the route graph: entry -> ramp -> L1 ->
  ramp -> exit). The player follows through the barrier. The tight turns and pillars make it a skill section.
- **Hide / search:** a job "stolen car reported in Parking Saint-Pierre": the target is parked on a random level and
  bay with its lights off; drive the levels to find it (minimap pin only within 15 m).
- **Lose the police** (a later player-as-runner mode): inside the car park the chaser's line of sight is cut by the
  decks, so the "lost sight" timer runs.
- **Moto stunts** (docs/MOTO.md): the ramp transitions as kickers, the L1 deck edge onto the ramp, wall rides on the
  ramp walls. No new physics, only geometry the moto already handles (decks + colliders).

## 4. The car-park kit (the others)

One kit, two forms:

**A. Closed (most entrances, ~20 places in the built tiles):** a street ramp going down to a closed door.
- Scripted in JS (boxy: procedural, memory rule), per entrance node: the ramp runs from the street edge into the
  building (or the garden) along the entrance's service way or, if none, normal to the façade. 3.0-3.5 m wide,
  5-6 m to the door, dropping 1.2-2.0 m (the door's sill below the street). Retaining walls with a concrete coping,
  a steel railing or hedge on top, a gully at the foot, a sectional overhead door (E9 is tagged `door=overhead`) or a
  roller shutter, a height bar where tagged (`maxheight` 1.9 / 1.95 / 2.0), a "P" or "private" plate.
- **The ground cut is the tunnels.js method** (viewer/rail/tunnels.js `classify` / clip): the ramp corridor is ROAD
  (the ramp's level), the earth the walls hold is KEPT (the wall top under the coping, then the DTM on the 1:1.5 / 2:1
  clamps), and terrain triangles that span a wall are clipped at the wall face and the wall back (no stair-step, no
  floating edge). There is no LID: the door is the end. Behind the door the building's solid stands (or the cut ends
  under the garden at the door plane, with the door's frame and a back face hiding the end). Generalise rather than
  copy: `viewer/underground/rampCut.js` with the tunnel's frame (X along the ramp, Y left) and its own json per
  place, written by a data step.
- Merged into the tile's geometry (one draw per slot per tile), drawn with the tile's LOD: it is on the surface.

**B. Opened (2-3 places, for missions):** the same ramp, a door that opens (animated, villa-gate colliders) and an
underground **cell** behind it, built from kit modules in Blender (`tools/blender/carparkKit.py`): ramp module,
aisle bay (2 x 3 bays between pillars), turn bay, end wall with fire door and lift lobby door, ceiling services,
battens, painted floor. The modules are joined per place from a small layout json (grid of modules fitted inside the
building footprint and its garden). Same budgets and streaming as Saint-Pierre.

**Two ground levels:** the height field holds one level. The cell's floor is a deck in `world.decks` plus its own
colliders, live only while the player is inside, switched at the door plane (the villa's "terrain off in the house"
hook). The street above keeps the height field. The walker inside uses the cell's TriBVH, as in the villa.

**Candidates to open** (owner's choice, §9): P2 the communal car park at Rue Gatti de Gamond (public, near Stalle); E1-E4
Avenue Van Bever (4 entrances and 3 one-way ramps: a proper customer car park, good for chases); P3 CHIREC Vanderkindere
(the ramp is a building passage, 1.9 m: a tight one). Colruyt Stalle (E10) is a covered ground-level car park under the
shop: a passage-kit case, not a basement.

## 5. Tunnels

Nothing to build inside Uccle now:
- **Bigarreaux:** already a hero rail bridge (688). Job 9 checks it against Street View and re-runs `drivecheck` there.
- **Biches:** a passage (§6).
- **Élan, Bien-Faire:** outside the grid. If the map grows east, they are two more `tools/blender/railTunnel.py`
  entries (the TUNNELS table: measured axis, road level, rail top from rail.json, portal faces at the embankment toe;
  estimated portal style from Street View). `tunnels.js` takes them by adding their names to `TUNNELS`: no new method.
- **Cheap guard now:** `tools/tunnels/check.mjs` has no gate row. Add `tunnels` (node row: E10 D9) so the two built
  tunnels stay right while the ramp cut generalises their code.

## 6. Passages (roads through buildings)

**Cause of today's defect:** UrbIS LoD2 solids are closed boxes: the porte-cochère is not in the data, so the drawn
façade and the collider close the street (ROAD_FIX2 item 5: the collision test now just ends the route there).

**Method** (worker, buildings stage; `viewer/underground/passages.js`, switch `?passages=0`):
1. For each `tunnel=building_passage` or `covered=yes` highway in a built tile, intersect the way with the UrbIS
   footprints. That gives the passage segment inside each solid.
2. Cut a void box out of the solid: width = the drawn road width (or 3.0 m for a service way), height = `maxheight` +
   0.3 m, else 3.6 m (Coghen and Biches heights from job 0), along the segment. Walls are split on the box (clean quads,
   support loops: rule no-bad-shading), the façade gets the opening, the collider gets the void.
3. Add the passage's own pieces (JS, boxy): soffit, side walls, the reveal (flat lintel or arch per job 0), a bulkhead
   lamp (emissive only), the ground is the road engine's street (setts for Coghen).
4. **Biches:** the opposite case. Add the missing link storey between the two houses over the road (a bridge room from
   the two solids' heights, 2.2 m clear), on the same kit.
- Hero pass on **Square Coghen** (Art Deco / modernist square, De Koninck houses): the porches in the square's brick and
  render, done to the hero-building method (compare with photos, named slots).

## 7. Perf rules

- **Interiors stream like the villa** (docs/VILLA.md, rule interior-stream-paced): the cell is fetched < 80 m, shown
  < 40 m, hidden > 60 m (larger than the villa's 60 / 30 / 45 because a car enters at 30-50 km/h). Pipelines compile
  one material per frame while hidden. Shown one mesh per frame behind the closed door or the dark mouth.
- **Nothing underground drawn from far:** no LOD1 / LOD2 for any cell. From the street, an open ramp or mouth shows
  a dark "throat" card (unlit, depth gradient) until the cell is shown. Gate check: draw calls and triangles at 200 m
  equal with and without `?underground=0`.
- **No light added at runtime** (rule fixed-light-count): emissive battens, baked interior light, the city's fixed
  lamp pool only. No shadow-casting light inside. The interior meshes do not cast into the sun's shadow map (they are
  under a roof or the ground); the shell does.
- **Colliders:** the shell's LOD0 and each cell's root in viewer/heroColliders.js (HERO_ROOTS), contactAudit.js and
  drive/collisionTest.js, as the tunnels. Parked cars as rings. The barrier and doors are rings for closed or open,
  never a moving collider. Rule colliders-match-drawn.
- **Joins rule:** ramp walls sink 0.3 m under the cut ground. The cut meets them at the face and under the coping
  (the tunnels.js clip). The shell welds or skirts to the ground. `viewer.contactAudit("carpark-stpierre")` and each
  kit place: 0 floating, 0 overhang.
- **Memory:** cells unload when hidden > 60 m for 20 s (GLB and textures disposed, rule no-draw-after-dispose). The
  kit modules' textures are shared by all opened places.
- **City tour** (tools/tour/views.json): add `stpierre-carpark` (the street front and entrance from 25 m), `carpark-ramp`
  (one closed kit ramp and door, e.g. Avenue Dolez or E9), `coghen-passage` (the square through its porch), and a
  `stpierre-carpark-inside` view once the interior exists (`&at=` inside L1, the cell forced shown).

## 8. Jobs in order (1-2 items each)

| # | job | gate checks |
|---|---|---|
| 0 | Street View look round (§2), notes into this doc | none (doc) |
| 1 | Data: `tools/underground/inventory.mjs` -> `data/underground/places.json` (inside the boundary, built tiles only: car parks, entrances, ramps from service ways, passage segments x UrbIS ids). Add the `tunnels` gate row | new row `underground-data` (counts stable, every entrance on a drivable way, nothing outside the grid) + `tunnels` |
| 2 | Passages A: the cut + kit on Square Coghen and the Danco porte-cochères | `drivecheck` (routes now go through), `colliders`, `heroshell`, `shell`, contactAudit 0 floating; tour `coghen-passage` |
| 3 | Passages B: every other passage in §1c + the Biches link | the same rows, city-wide counts |
| 4 | Kit A part 1: `rampCut.js` (tunnels.js method generalised) + ramp / walls / door on 3 places | `ground`, `tunnels` (the built tunnels unchanged), contactAudit, `drivecheck` (no stuck at a ramp), tour `carpark-ramp` |
| 5 | Kit A part 2: all closed entrances in the built tiles | `underground-data`, `colliders`, `ground`, `zfight` |
| 6 | Saint-Pierre shell + L0 + entrance / barrier (no interior yet) | `heroshell`, `colliders`, contactAudit, tour `stpierre-carpark`, mesh audit 0 blocking |
| 7 | Saint-Pierre interior: L1 (and L-1 if chosen), ramps, bake, cars, battens, streaming | new rows `carpark` (budgets) + browser `carpark` (stream-in: 0 frames over 33 ms, ?dynres=0, GREEN preflight); `meta` (no light made) |
| 8 | Game hooks: chase route through the car park, the "hidden stolen car" job, moto lines | `policerear`, `motofeel`, `drivecheck` |
| 9 | Kit B: open 2-3 places (cells from modules) + check Bigarreaux bridge 688 against Street View | `carpark` rows per place, `drivecheck`, tour `stpierre-carpark-inside` |

Each job: switch-guarded (`?passages=0`, `?carparks=0`, `?underground=0`), the merge gate and the city tour before
merging, root cause + rule + check for every defect found.

## 9. Owner choices

1. Parking Saint-Pierre: the **real two decks only**, or add a **fictional level -1** for the underground feel and a
   hiding level?
2. Its hours in the game: barrier shut at night as the real one, or always open?
3. Which **2-3 car parks open fully**: P2 Gatti de Gamond (public), E1-E4 Avenue Van Bever (customer, 4 entrances),
   P3 CHIREC (tight ramp)?
4. Rue de l'Élan and Rue du Bien-Faire (Watermael-Boitsfort): park them until the map grows (my advice), or grow the
   map for them?
5. Treat Avenue des Biches as a passage (my advice)?
6. Street View for job 0: may an agent see the panoramas as an in-chat screenshot (never saved), or should you do
   the look and dictate the notes?

Sources (web, read 2026-11-24): Uccle, Brochure Easy Mobility 2025 (Parking du Doyenné, 40 places);
dhnet.be, "Le projet de parking souterrain dans le centre d'Uccle tombe à l'eau"; Brussels Times, "Hidden Belgium:
Square Coghen"; Uccle council interpellation 2020-09-10, îlot Coghen-Doyenné; Google Maps listing "Parking Sint-Pieter"
(text only); OpenStreetMap via Overpass (ODbL).

## Owner answers (2026-11-24)

- **Parking Saint-Pierre: real only.** Two decks, no fictional level -1.
- **P2 "Gatti de Gamond" is NOT underground** (owner, local knowledge). It is the Carrefour's surface car park at Rue Gatti de Gamond / Rue de Stalle. The OSM node 9627537495 (`parking=underground`, no entrance mapped) is taken as a wrong tag. P2 leaves the candidates to open. Job 0 (the look) confirms it, and the OSM fix is left to the owner.
- That Carrefour has the same design as Carrefour Market Marlow near the police station (claude/carrefour: `shed:true` box, glazed front under a canopy, red sign, car park with painted bays). A small curation job reuses that work.
- Which car parks open fully: still open; candidates are E1-E4 Avenue Van Bever and P3 CHIREC.
