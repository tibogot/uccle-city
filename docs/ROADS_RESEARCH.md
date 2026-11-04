# Roads research: the best road system for a real city in the browser (2026-11-04)

Question: how do we get roads that look exactly like the real Uccle / Brussels streets, run fast in three.js
WebGPU, and also handle tunnels, viaducts and the metro? Today 1,121 UrbIS buildings stand at least 1 m
inside our carriageways (`tools/audit_overlap.py`). The cause: widths are guessed from OSM tags and the
junction pads are too big.

Everything below was checked on 2026-11-04 by reading code, downloading the data and querying the live
services. Numbers marked *measured* come from our own queries (scripts in the session scratchpad, not in the
repo).

---------------------------------------------------------------------------------------------------

## 1. Summary and recommendation

**Recommendation: hybrid, "surface first, semantics second". Keep and extend our own road engine, but stop
guessing the road's shape. Take the shape (kerbs, sidewalks, junctions, medians, tram sites, ramps, bridges,
tunnels) from measured UrbIS polygons and lines. Use OSM, and the engine, only for what the survey does not
have: lane counts and directions, lane graph, turn arrows and missing markings. Do not adopt osm2streets.**

Why:

1. **The measured data exists, it is CC0, and it fixes the overlap problem outright.** UrbIS Land cover
   `StreetSurfaces` separates roadway (`S`), sidewalk (`SW`), intersection (`I`), median (`M`), parking (`K`),
   tram/bus site (`C`), tram-shared roadway (`SC`/`IC`), squares (`P`), ramps (`A`/`AC`) and more (section 4).
   *Measured:* running the same overlap test as `audit_overlap.py` against the UrbIS roadway polygons
   (S, I, SC, IC, C, K, M, A at level 0), only **2 buildings out of 23,356 reach ≥ 1 m into the road (0 at
   ≥ 2 m)**, against 1,121 with our guessed carriageways. UrbIS sidewalks (`SW`) touch 7 buildings by ≥ 1 m.
   UrbIS buildings and street surfaces come from the same Paradigm survey, so they fit together by design.
2. **No OSM library solves the width problem, because OSM has no widths.** *Measured* on our own Uccle OSM
   extract (5,300 car ways): `width` is tagged on 2.5 % of ways, `lanes` on 11.5 %, `parking:*` on about 3 %.
   osm2streets, Streets GL and OSM2World all fill the gap with defaults (lanes × 3 m and the like), the same
   guess we make today. Switching libraries would swap one guess for another.
3. **Our engine is already ahead of the libraries where it matters for a game-quality look.** It has lane
   stacks with tapered sections, real kerb fillets, roundabouts with splitter islands, gores, markings derived
   from lane adjacency, a lane graph for traffic, vertical profiles and bridges (`vendor/roads/roadNetwork.js`
   pipeline steps 1-11). osm2streets is 2D only, its sidewalks are basic, it has no elevation, and it has had
   little work since 2024 (section 2).
4. **What is missing is an input mode, not a new engine:** "here is the measured carriageway, fit the lanes
   inside it". That is an adapter in our own code (`pipeline/`, `viewer/`), because `vendor/roads` stays
   read-only. Parts of it could later move upstream into game-engine-v1, if the owner wants.

What the hybrid looks like:

| Layer | Source | What it gives |
|---|---|---|
| **Ground surfaces** (what you walk and drive on) | UrbIS Land cover `StreetSurfaces` (CC0) | Exact roadway, sidewalk, junction, median, parking, tram site and square polygons, with level (−2..+1) and street name |
| **Kerbs, gutters, edges** | UrbIS Topo `BR0101L` carriageway edge (kerb), `BR0102L` gutter (*filet d'eau*), `BR0103L` outer edge of sidewalk / cycle track, `BR0104L` recesses in the sidewalk, `CR42L` driveways (*entrée carrossable*), `BR12L` speed bumps | Measured kerb lines, so kerb geometry is extruded along real lines, with dropped kerbs at driveways |
| **Markings** | UrbIS Topo `CR21*`/`CR22*` lines, `CR2301L` zebra stripes, `CR2302L` stop lines, `CR2303L` give-way lines, `CR24*P` arrows; Brussels Mobility `marking_line` / `marking_polygon` / `marking_point` inventory | Real paint where it was surveyed. Elsewhere the engine derives it from the lane stack |
| **Lane semantics** | OSM (`lanes`, `oneway`, `turn:lanes`, `cycleway`, `parking`, `busway`), plus Brussels Mobility `brr_segments_lanes` (`bm_lanes` such as "1+1") | Lane count, direction, type. Widths come from the measured carriageway, never from defaults |
| **Lane graph, signals, traffic** | Our engine (`roadNetwork.js` steps 5 and 9) fed by the fitted stacks; signals from Topo `CR3106P` / BM `traffic_lights` | Cars and trams follow lanes that sit inside the real kerbs |
| **3D structures** | Land cover `Bridges`/`Tunnels` + level, BM `Tunnels`/`Tunnelsections`, Topo `BR03*`/`BR04L`, DTM | Viaduct decks, tunnel ramps and portals, metro boxes (section 6) |

Honest caveats:
- The UrbIS surfaces are 2D. Height comes from the DTM (ground) or from our engine's profile (decks, ramps).
- The polygons need clean-up: slivers, tiny gaps between neighbours, and polygons that need splitting at tile
  edges. That is standard shapely work in the Python pipeline we already have.
- UrbIS has no lanes, and few markings in Uccle (section 4.3). Lane fitting stays a heuristic. It is now a
  heuristic bounded by real kerbs, not one that pushes kerbs into houses.
- Flanders is outside UrbIS. A few border surfaces are included "for visual continuity". Anything beyond
  needs the Flemish GRB (Wegbaan / Wegverharding), a later problem.

---------------------------------------------------------------------------------------------------

## 2. Open-source libraries that turn OSM into street geometry

| Project | Licence | Language / runs where | Output | Widths | Junctions | Sidewalks | Markings | Tunnels / bridges | Maturity (2026-11) |
|---|---|---|---|---|---|---|---|---|---|
| **osm2streets** (A/B Street, Dustin Carlino) https://github.com/a-b-street/osm2streets | Apache-2.0 | Rust; WASM build with JS API (`osm2streets-js`, npm 0.1.4 from 2023); Python and Java bindings | GeoJSON: lane polygons, intersection polygons, lane markings, intersection markings, blocks; a road/intersection graph with lanes left-to-right (type, direction, width) | From `width`/`width:lanes` when tagged, else per-type defaults (`typical_lane_widths`: lane 3 m-ish, alley, "narrow", "highway") | Its strength: trims roads back and builds intersection polygons where road edges meet; collapses short roads, merges dog-legs, dual carriageways and "sausage links" | Separate footways can be snapped to the road ("zip sidepath"); sidewalks are lanes of the road | Lane lines, schematic turn arrows; crosswalks "planned" | Keeps OSM `layer` as z-order only; no elevation, no deck or tunnel geometry | 160 stars; last commit 2025-10-02, gaps of months; docs say "As of November 2022, probably incomplete". Usable but slow-moving |
| **osm2lanes** https://github.com/a-b-street/osm2lanes | Apache-2.0 | Rust/WASM | Tags → lane list | Defaults | none | as lanes | none | none | **Archived 2023-03.** The lane code now lives inside osm2streets (`osm2streets/osm2lanes/`) |
| **Streets GL** (StrandedKitty) https://github.com/StrandedKitty/streets-gl, https://streets.gl | MIT | TypeScript, own WebGL2 renderer, geometry built on the fly in web workers from vector tiles (modified Planetiler) | Road ribbons as "projected meshes" draped onto the terrain and drawn in z-index order (water < grass < roads ...); `RoadGraph` + `IntersectionPolygonBuilder` fill junctions | `width` tag, else `defaultWidth`, else 4 m for 1 lane, 3 m × lanes; sidewalks and cycleways a fixed 2 m added on the sides | Intersection polygons from the road graph (ribbons trimmed, polygon filled) | Fixed-width strips on the road sides when tagged | Baked into tiling asphalt textures with lanes painted in (UV across the road); "unmarked" variant | Underground features dropped (`isUnderground`: tunnel, level < 0, location=underground); everything is draped on the terrain, so no real bridges | 1.1k stars, last push 2025-08, "early development". Best visual reference for terrain-draped roads in WebGL |
| **OSM2World** https://github.com/tordanik/OSM2World, https://osm2world.org | MIT (repo licence per GitHub) | Java; also a new browser ES module (`osm2world-core-web.mjs`, "recently introduced, may change") | Triangle meshes with materials (glTF/glb, OBJ, 3D Tiles), LOD 0-4 | Tags + defaults | `JunctionNodeWorldObject` (junction area polygons) | From tags | Lane markings as textures / geometry | Has `BridgeModule`, `TunnelModule`, `BridgeTunnelEleCalculator`: bridge decks with piers, tunnel entrances | Active (commit on 2026-11-04), about 15 years old. Good reference for bridge/tunnel geometry; heavy, Java-first |
| **Eclipse SUMO netconvert** https://sumo.dlr.de/docs/Networks/Import/OpenStreetMap.html | EPL-2.0 | C++ command line (offline) | Lane-level network: lane shapes, junction shapes, connections, traffic-light programs; exports OpenDRIVE | Default lane width + typemaps (`osmNetconvert*.typ.xml`), `width` tag; sidewalks via `--osm.sidewalks` / `--sidewalks.guess` | Computes junction polygons from lane boundaries; `--junctions.join` clusters complex junctions | Sidewalks as lanes | none visual | `layer` used to avoid false junctions | Very mature, very active. A traffic tool: geometry is schematic |
| **CARLA osm2odr** (SUMO fork) https://carla.readthedocs.io/en/latest/tuto_G_openstreetmap/ | MIT/EPL | C++ | OSM → OpenDRIVE (.xodr) | as SUMO | as SUMO | optional | as OpenDRIVE road marks | none | Maintained with CARLA |
| **libOpenDRIVE** https://github.com/pageldev/libOpenDRIVE | Apache-2.0 | C++; the WASM build and odrviewer.io viewer were removed upstream (last in v0.3.0, kept in forks) | Lane meshes, road-mark meshes, road objects from an .xodr file | from the file (polynomials) | from the file | lanes of type sidewalk | road marks | elevation + superelevation in the file | Active (2026-10) |
| **Blosm** (Blender add-on) https://github.com/vvoovv/blosm | Free version + paid "premium" version (GitHub detects no licence file) | Python in Blender | Roads as meshes/curves, Google 3D tiles import | defaults | basic | basic | none | none | Active. Useful only as an idea for Blender-side kit work |
| Mapbox Standard "HD Roads" https://www.mapbox.com/blog/hd-roads-bring-lane-level-detail-to-mapbox-standard | Commercial | GL JS ≥ 3.30 | Lanes, arrows, stop lines, crossings, elevated roads, 3D bridges, tunnels, interchanges | from Mapbox's own HD map | yes | yes | yes | yes | Commercial, 71 cities. Shows the target look; not usable for us |

What each one teaches us:
- **osm2streets**: algorithms worth reading are `transform/dual_carriageways.rs`, `transform/collapse_short_road.rs`,
  `operations/zip_sidepath.rs` and `geometry/general_case.rs` (intersection polygon from paired road edges). Our
  `pipeline/refine_roads.mjs` already does its own version of "collapse short roads" and "merge junctions".
  Running StreetExplorer (https://a-b-street.github.io/osm2streets/) on Uccle is a cheap second opinion on
  tricky junctions. That is all it should be.
- **Streets GL**: (a) drape road surfaces onto the terrain as their own pass, ordered by z-index, so they never
  z-fight the ground; (b) painted lanes as part of a tiling road texture are cheap but only work for regular
  roads; (c) do the geometry in workers per tile, as we already do.
- **OSM2World**: separate "modules" per feature kind (road, bridge, tunnel, junction), each producing meshes
  per LOD.
- **SUMO/OpenDRIVE**: the lane-level data model (next section) is the right one for traffic, but their meshes
  are not good enough to look at.

---------------------------------------------------------------------------------------------------

## 3. Game-engine and simulation road tools: design ideas (not to use them)

| Tool | What it is | Idea worth copying |
|---|---|---|
| **ASAM OpenDRIVE 1.8.1** (2024-11) https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/latest/specification/ | The standard road description for driving simulation | **Everything is a function of the station s along a reference line**: plan geometry (line / arc / clothoid / paramPoly3), elevation and superelevation polynomials, `laneOffset(s)` (shifts all lanes off the reference line), and **each lane's width as a cubic a + b·ds + c·ds² + d·ds³ per lane section**. Junctions are separate objects whose **connecting roads** carry `laneLink`s from incoming to outgoing lanes. Road marks are per lane edge (type, weight, colour, width). Crosswalks, parking spaces, tunnels and bridges are `objects` / `<tunnel>` / `<bridge>` placed by s. |
| **CARLA** https://carla.readthedocs.io | Driving simulator (Unreal) | **Two products per map: the .xodr (semantics: lanes, junctions, signals) and the visual mesh (RoadRunner-made).** They are kept aligned but are separate files. Same split we want: UrbIS mesh + engine lane graph. |
| **MathWorks RoadRunner** https://www.mathworks.com/products/roadrunner.html (commercial) | Interactive road scene editor; imports/exports OpenDRIVE, builds scenes from HD maps | **Road styles** (reusable cross-section templates); **junctions are their own surface**, with a corner tool (kerb radius, kerb return, sidewalk wrap) per corner; **markings are separate decal meshes** projected onto the surface, with stop lines and crosswalks auto-placed per junction arm; lane-level editing re-derives the junction. |
| **Unreal landscape splines** https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-splines-in-unreal-engine | Spline + segment meshes deformed along it, flattens the landscape under it | **Deform the terrain to the road, not the road to the terrain** (flatten a corridor with falloff). Our DTM already contains the real road, so the lesson for us is to cut the DTM to the measured kerbs. |
| **Unreal City Sample / The Matrix Awakens** https://dev.epicgames.com/documentation/en-us/unreal-engine/city-sample-project-unreal-engine-demonstration | City and freeway network generated offline in Houdini, lanes exported to ZoneGraph for MassTraffic | Generate everything offline, ship baked meshes + a lane graph; the runtime only streams. Same as our pipeline. |
| **Houdini: SideFX Labs Road Generator + OSM Import** https://www.sidefx.com/tutorials/city-building-with-osm-data/ | Curve with a `width` attribute → road mesh, fills between roads | **Width as an attribute on the curve, per point.** That is our `w(s)`. |
| **CityBLD** (commercial UE plugin) | Spline roads + auto junctions + building lots | Lots/blocks from the road network (we have `roadBlocks.js`). |
| **EasyRoads3D** (AndaSoft, Unity, commercial) https://www.easyroads3d.com | Road types + crossing prefabs + side objects | **"Connection" prefabs**: a junction is a pre-made, well-UV'd piece whose arms adapt to the roads; **side objects** (lamps, barriers, kerbs) spaced along the road. Our `roadProps.js` is the same idea. |
| **Road Architect** (Unity, MIT, archived 2020) https://github.com/MicroGSD/RoadArchitect | Node-based roads with auto 3/4-way intersections | Simple, robust: one intersection type per arm count, generated from lane counts. Too simple for real data. |
| **CiDy 2** (Unity, commercial, editor-only) https://assetstore.unity.com/packages/tools/level-design/cidy-2-55298 | Multi-lane parametric roads, intersections, sidewalks, spawned props | Sidewalks and corner sidewalks generated together with the road, plus prefab spawning along paths. |
| **R.A.M** (NatureManufacture, Unity, commercial) | Spline river/road mesh tool with vertex-colour blending into the terrain | **Blend the road edge into the terrain material** (vertex colour / mask) instead of a hard seam: useful for verges and unkerbed lanes in Uccle's woods. |
| **Godot Road Generator** (TheDuckCow) https://github.com/TheDuckCow/godot-road-generator | MIT, active (v0.9.x, commits in 2026-11) | Each **RoadPoint** carries lane counts/widths for its segment; RoadContainers hold networks; **RoadIntersections** are their own nodes; lanes double as AI paths. Clean scene model: points → segments → intersections → lanes. |

Key ideas, mapped to our engine:

1. **Lane width as a function of s.** Our sections + tapers (`roadCrossSection.js`) are a discrete form of
   OpenDRIVE's lane-width polynomials. For measured data we need a continuous carriageway `w(s)` and a centre
   offset `o(s)` (OpenDRIVE `laneOffset`), sampled every 2-5 m against the measured kerbs, smoothed, and fitted
   to piecewise cubics. Lanes then share `w(s)` by rule (parking first, then driving lanes).
2. **Junction meshing.** Every serious tool treats the junction as its own surface with corner primitives
   (RoadRunner, EasyRoads3D, osm2streets, our `roadJunction.js`). With UrbIS we do not need to compute the
   pad: the `I`/`IC` polygons *are* the measured junction. The engine still owns what the pad does not say:
   stop lines, crosswalk placement, lane connectors.
3. **Kerbs and corners.** Extrude kerbs along measured lines (Topo `BR0101L`) or the shared S|SW edges, with a
   real profile: 12-15 cm face, small chamfer, a gutter strip, dropped kerbs at driveways (`CR42L`) and at
   crossings. Corner radius comes from the data, no longer from a road-type default.
4. **Decals vs geometry for markings.** Tools put markings in a separate thin mesh (decals) projected onto the
   surface, not in the road texture. For us: one merged marking mesh per tile, sampling `markingAtlas.js`,
   lifted a few millimetres with a depth bias (this also fixes the z-fighting in `docs/TODO.md`). Streets GL's
   painted textures are an option for far LOD only.
5. **LOD.** Near (< ~150 m): kerb geometry, gutters, markings, manholes, drains. Mid: flat surfaces + markings.
   Far: surfaces and markings baked into the terrain / ortho texture of the tile, zero extra draws.
6. **Two outputs from one source** (CARLA): a visual mesh and a lane graph, built together and checked against
   each other (lanes must stay inside the measured carriageway: a new audit).

---------------------------------------------------------------------------------------------------

## 4. What the measured Brussels data really contains

### 4.1 UrbIS Land cover (*Occupation du sol*), CC0, Paradigm

- Tech spec: https://urbisdownload.datastore.brussels/UrbIS/TechSpec/LandCover_TechSpec_FR20240401.pdf
  (version 1.0, situation at 1 January 2024, made "from topographic surveys and aerial photographs").
- Dataset: https://datastore.brussels/web/data/dataset/b718705d-f70f-11ee-8282-00090ffe0001; Atom feed
  https://urbisdownload.datastore.brussels/atomfeed/b718705d-f70f-11ee-8282-00090ffe0001-en.xml (monthly
  editions; whole region as GPKG `UrbISLandCover_31370_GPKG_04000_20261002.zip`, 38 MB zip / 81 MB GPKG). Also
  SHP, DWG and WFS. EPSG:31370, UTF-8.
- Four classes, all polygons, each with `LVL` (relative level) and `AREA`:

**StreetSurfaces** (93,049 polygons in the region; fields `TYPE`, `STREET_ID`, `STRNAMEFRE`, `STRNAMEDUT`,
`MUNNISCODE`, `HIERARCHY`, `LVL`, `ADMIN`, `AREA`). **Yes, roadway and sidewalk are separate polygons.**

| TYPE | Meaning (from the spec) | Region count | Uccle count (MUNNISCODE 21016) |
|---|---|---|---|
| S | Street section: roadway for motor vehicles | 23,282 | 1,722 |
| SW | Sidewalk: "generally raised above the roadway, along the building line, for pedestrians, incl. street furniture" | 50,021 | 4,178 |
| I | Intersection surface | 12,899 | 950 |
| IC | Intersection shared with tram tracks | 905 | 120 |
| SC | Roadway shared with tram tracks | 419 | 69 |
| C | Reserved public-transport site (*site propre*) | 695 | 51 |
| M | Median / verge / roundabout island (*terre-plein, berme, rond-point*) | 3,889 | 150 |
| K | On-street parking area | 196 | 14 |
| P | Square (*place*) | 375 | 11 |
| A / AC | Access ramp (road / tram-bus) | 133 / 11 | 0 |
| B | Road bridge / viaduct | 1 | 1 |
| G | Covered gallery | 32 | 0 |
| MS / MT | Metro station / metro tunnel (as street surfaces) | 72 / 92 | 0 |
| RS / RT | Railway station / rail tunnel | 2 / 11 | 0 / 1 |
| IL | Level crossing | 5 | 0 |
| T | Path in a park or cemetery (also a HIERARCHY value) | 6 | 0 |

- `HIERARCHY`: H motorway (A0), MER metropolitan (A1), MAR main (A2), IDR inter-district (A3), DC district
  collector (A4), DR local (A5), T path. A ready-made road class for our lane defaults and materials.
- `LVL`: −2 (2 polygons), −1 (292), 0 (92,235), +1 (520). Level −1 includes the road tunnels **by name**:
  "Tunnel Annie Cordy" (the former Leopold II tunnel, 25 polygons, 55,383 m²), Belliard, Cinquantenaire, Porte de
  Hal, Rogier, Montgomery, Louise, Stéphanie, Loi, Bailli, Trône, Botanique, Tervueren and others. Level +1
  includes Ring 0, "Viaduc Herrmann-Debroux", E411, A12, E40, Boulevard Lambermont, Avenue des Communautés...
  In Uccle, level +1 holds road bridges over the railway (Avenue des Tilleuls, Rue du Bourdon, Rue du Merlo,
  Chaussée de Waterloo...), and the Bois de la Cambre rail tunnel is at −1.
- **Not inside**: lanes, markings, kerb height, surface material, elevation. **Parking is mostly not
  separated**: `K` is rare (14 polygons in Uccle), so parking bays are usually inside `S` and must be inferred
  (OSM `parking:*`, carriageway width, Brussels Mobility parking layers).

**Blocks** (5,639; `TYPE`, names, `LVL` always 0): CB built-up block (housing/industry/services/recreation/
agriculture/wasteland), CE cemetery, FO wood/forest, GB park, RB open-air railway, TB open-air metro, WB water.
In Uccle: CB 382, GB 27, RB 11, FO 5 (4.99 km², the Sonian Forest and woods), CE 3. **Gardens are not a class.**
Front and back gardens are just the non-building part of a CB block. The space between `SW` and the façades is
private land (often front gardens in Uccle).

**Bridges** (234; TYPE ROB road 133, RAB rail 86, PB pedestrian 12, MB metro 3; all `LVL` 1). Uccle box: 13 road,
20 rail, 2 footbridges.

**Tunnels** (202; TYPE MT metro tunnel 77, MS metro station 69, ROT road tunnel 35, RAT rail tunnel 21; `LVL`
−1, two at 0). No names on this class (names are on the StreetSurfaces at level −1).

### 4.2 UrbIS Topo (CC0), the measured lines: kerbs, markings, furniture

- Tech spec: https://urbisdownload.datastore.brussels/UrbIS/TechSpec/Topo_TechSpec_FR20230428.pdf
  ("photogrammetry and topographic surveys"); dataset record
  https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/10ded91e-6a63-11ed-9d77-010101010000;
  region GPKG is 195 MB; served layer by layer through the Brussels Mobility WFS (`bm_urbis_topo:*`, below).
- Codes that matter for roads (from the spec):
  - **Road edges**: `BR0101L` outer edge of carriageway (the kerb line), `BR0102L` gutter (*filet d'eau*),
    `BR0117L` gutter edge, `BR0103L` outer edge of sidewalk / cycle track, `BR0104L` recess / bulge in the
    sidewalk, `BR0105L` New Jersey barrier, `BR02L` edge of unpaved way, `BR12L` speed bump, `BR13L` physical
    lane separator, `BR14L` ventilation grille.
  - **Structures**: `BR03L` bridge / footbridge / abutment, `BR0301L` bridge outline, `BR0302L` abutment,
    `BR04L` tunnel, `BT0101L/0102L/0103L` railway track at level 0 / −1 / +1, retaining walls `BF0205L`
    (foot) / `BF0206L` (crest), embankments `BH*`.
  - **Markings**: `CR21L/CR2101L` continuous line, `CR2102L` continuous edge of a reserved site, `CR22L/CR2201L/
    CR2202L` dashed line, `CR2203L` dashed edge of a reserved site, `CR2204L` cycle track marking, `CR2205L`
    cycle lane / special surfacing, `CR2301L` zebra crossing stripes, `CR2302L` stop line, `CR2303L` give-way
    line, `CR2304L` chequered marking edge, `CR2305L` tram pedestrian crossing, `CR2601L-2603L` parking
    delimitation, `CR24*P` arrows (left, right, straight, U-turn, merge...) and logos (bike, zone 30...).
  - **Furniture**: `CR3101-3106P` traffic lights (pedestrian, bike, public transport, three-colour),
    `CR3201P` lamp post, `CR3202P` in-ground light, `CR39*` benches, `CR41*` bus shelters, `CR42L` driveway,
    `CR5702P` fixed bollard, `CR5801P` retractable bollard, `CR57L` bollard lines, `CR55L` guard rail,
    `CR56L` railing, `CR61*P` manholes, `CR62*P` drains / gullies, `CR63L/P` road surfacing limit, `BG0101P`
    trees.
- *Measured* coverage (WFS hit counts, region / Uccle bounding box): kerb line `BR0101L` 78,278 / 6,189;
  sidewalk outer edge `BR0103L` 43,438 / 6,351; gutter `BR0102L` 9,416 / 971; zebra stripes `CR2301L`
  31,066 / 2,407; continuous lines `CR2101L` 4,033 / 169; dashed `CR2201L` 1,502 / 66; stop lines `CR2302L`
  1,151 / 49; parking delimitation `CR2601L` 0. **Kerbs and crossings are dense. Lane lines are sparse in
  Uccle**, so the engine must keep deriving lane paint from the lane stack.

### 4.3 Brussels Mobility (data-mobility.irisnet.be / data.mobility.brussels)

GeoServer WFS/WMS: https://data-mobility.irisnet.be/geoserver/ows (≈ 270 layers). Licence per layer: the UrbIS
copies say CC0 (e.g. https://data-mobility.irisnet.be/info/urbadm_ssw); Brussels Mobility's own WMS record
says CC-BY. Check each layer before shipping.

| Layer | What it is (checked) | Count region / Uccle box |
|---|---|---|
| `bm_urbis:urbadm_ss` | UrbIS-Adm **street sections**: the whole public street between junctions (ssft S/I/IC/SC/M, level, street name, commune, admin, hierarchy A1-A5) | — |
| `bm_urbis:urbadm_ssr` | **Roadway** part of each street section (same id); *measured*: ss ≈ ssr + ssw | 30,002 / 2,839 |
| `bm_urbis:urbadm_ssw` | **Sidewalk** part: "the common part of the UrbIS-Adm Street Sections and Side Walks layers" | 77,141 / 7,486 |
| `bm_network:brr_segments_lanes` | Regional road segments with **lane counts**: `bm_lanes` ("1+1", "1+0", "(1)+(1)"), `left_lanes`, `right_lanes`, `one_way`, `typology`, `lvl`, `average_width`/`min_width` (0 in the samples seen) | 25,304 / 2,640 |
| `bm_equipment:marking_line` / `marking_polygon` / `marking_point` | Road-marking inventory: `mark_type` (L01..L26 lines, P01..P53 / S01..S10 surfaces), `material` (P paint, R resin), `color`, `angle` | 36,717 / 3,184; 31,132 / 2,383; 5,914 / 857 |
| `bm_pedestrian:pedestrian_crossing_surfaces_2d` | Pedestrian crossing polygons | 17,213 / 1,389 |
| `bm_network:Tunnels` | 38 road tunnel outlines (name FR/NL, SCADA id) | 38 / 0 |
| `bm_network:Tunnelsections` | 191 polygons: "Tunnel Surface Section" vs "Tunnel Surface Access Ramp", entry/exit, direction ("Centre", "Ring", "Midi"...), access name; e.g. Leopold II, Belliard, Trône, Rogier... | 191 / 0 |
| `bm_equipment:Tunnel_Emergency_Exits` | Emergency exits | — |
| `bm_public_transport:Metro` | 156 polygons, type MS (station) / MT (tunnel), `niveau` | 156 / 0 |
| `bm_public_transport:stib_lines`, `stib_stops` | STIB network | — |
| `bm_urbis_topo:*` | UrbIS Topo layers (road_line, marking_line/point, tunnel_line, bridge_line, pt_rail_line, traffic_light_point, street_light_point...) | see 4.2 |
| `bm_equipment:traffic_signs` | Traffic sign inventory | 96,293 / 5,136 |
| Others | `traffic_lights`, `Speedramp`, `Crashbarrier`, `parking_*`, `Zones_30_polygon`, `trees`, `luminaires`, `pedestrian_network` | — |

The marking inventory's `mark_type` codes need a legend (the WMS style or Brussels Mobility). Ask before relying
on them.

### 4.4 UrbIS Transport networks (already in `data/raw/urbis/transport`)

`StreetAxes` (TYPE S/I/IC/SC, HIERARCHY, **LVL**, STARTSN_ID/ENDSN_ID, names, **SLOPE**, LENGTH),
`StreetNodes` (LVL), `Railways` (TYPE e.g. TW tram, **LVL**, SLOPE). These are surveyed centrelines with levels.
Useful to cross-check OSM `layer` and to know which axis belongs to which surface polygon.

---------------------------------------------------------------------------------------------------

## 5. Surface-first vs centreline-first, and how to combine them

Centreline-first (OSM, SUMO, osm2streets, Streets GL, us today): road = line + guessed cross-section. Good
topology and semantics. Wrong shape wherever the guess is wrong, which in an old European city is nearly
everywhere (streets widen, narrow, bulge at crossings, lose parking at corners).

Surface-first (survey polygons, the digital-twin approach: cadastral and topographic agencies, CityGML
"TrafficArea / AuxiliaryTrafficArea"): road = measured polygons. Exact shape and no semantics.

Combine them like this (all offline, in the Python pipeline, per tile):

1. **Load and clean the measured surfaces.** UrbIS `StreetSurfaces` at the tile + buffer. `buffer(0)`, snap
   vertices to a 2 cm grid, close gaps < 10 cm between neighbours, drop slivers < 0.2 m². Keep `TYPE`, `LVL`,
   street name, hierarchy.
2. **Match OSM ways to surfaces.** Per OSM car way, buffer the centreline and intersect with S/SC/I/IC/C at the
   same level; the street name (`STRNAMEFRE` vs OSM `name`) breaks ties. UrbIS `StreetAxes` is the bridge
   when OSM and UrbIS disagree on topology.
3. **Measure the carriageway along s.** Every 2-5 m, cast a perpendicular from the OSM centreline to the
   left and right boundary of the matched roadway (preferably the Topo `BR0101L` kerb line, else the S|SW
   shared edge). This gives the kerb offsets `l(s)` and `r(s)`, hence width `w(s) = l + r` and offset
   `o(s) = (l − r) / 2`. Smooth (median then Savitzky-Golay), clamp spikes at junction mouths, fit
   piecewise cubics (OpenDRIVE-style) or just keep the samples.
4. **Fit the lane stack into `w(s)`.** Lane count/direction from OSM, then `brr_segments_lanes`, then the
   road-type default. Parking: OSM `parking:*` first; else if `w(s)` exceeds the driving lanes by more than
   ~2 m on a side, assume a parking lane there (Brussels has lots of it); `K` polygons where they exist. Lane
   widths come out of the measurement, never out of a constant.
5. **Feed the engine** a road whose lane widths vary along s (our sections, or a new continuous width mode
   in our adapter), with the junction pad replaced by the measured `I`/`IC` polygon. The engine still
   produces lane graph, stop lines, crosswalk positions (or takes them from Topo `CR2301L`/BM crossing
   polygons), turn arrows and derived lane paint.
6. **Build the visible mesh from the measured polygons**, not from the engine's ribbons: triangulate each
   surface (constrained, with the kerb lines as constraints), drape on the DTM, raise sidewalks by the kerb
   height, extrude kerbs along S|SW edges, give medians and islands their own material. One merged ground
   mesh per tile with a material id per vertex (asphalt, setts, concrete, sidewalk pavers, tram site, grass
   median) = one draw call.
7. **Audit**: buildings vs roadway (expect ~0), lanes vs kerbs (every lane polygon inside the carriageway),
   markings vs surfaces.

Our own Python stack (shapely, numpy) is enough. No new dependency is needed in the browser: the worker only
receives triangles.

---------------------------------------------------------------------------------------------------

## 6. Tunnels, viaducts and the metro

### 6.1 Data we have

| What | Source |
|---|---|
| Road tunnel extents, by name | Land cover StreetSurfaces `LVL −1` (e.g. "Tunnel Annie Cordy" = former Leopold II); Land cover `Tunnels` TYPE ROT; BM `Tunnels` (38) and `Tunnelsections` (section vs access ramp, entry/exit, direction) |
| Ramps (where the road dips) | Land cover `A` / `AC` ramp polygons; BM "Tunnel Surface Access Ramp"; Topo retaining walls `BF0205L`/`BF0206L` |
| Viaducts and bridges | Land cover StreetSurfaces `LVL +1` ("Viaduc Herrmann-Debroux", Ring 0, E40...), `Bridges` (ROB/RAB/PB/MB), Topo `BR0301L` outline and `BR0302L` abutments |
| Metro and pre-metro | Land cover `Tunnels` MT/MS (and StreetSurfaces MT/MS), BM `Metro` (MS/MT, `niveau`), Topo rail `BT0102L` (track at level −1), UrbIS `Railways` LVL; STIB GTFS (https://data.belgianmobility.io, CC BY 4.0, already used by `pipeline/build_transit.py`) for shapes, stops and timetables of metro lines 1, 2, 5, 6 and pre-metro tram lines |
| OSM | `tunnel=yes` + `layer=-1/-2`, `bridge=yes` + `layer=1`, `railway=subway`, `railway=tram` + `tunnel=yes` (pre-metro), `station=subway`, platforms with `level`. *Measured* in our Uccle extract: 84 car ways with `tunnel`, 39 with `bridge`, 72 with `layer` |
| Ground height | UrbIS DTM 2021 (50 cm) is the surface; it already contains ramp cuts and viaduct ground below |
| **Missing** | Tunnel depth, deck height, clearances, interior cross-sections. No open data source gives them; assume them (below) |

### 6.2 How others render them

- **Streets GL** drops all underground features and drapes everything else on the terrain, so it shows no
  tunnels and no real bridges.
- **OSM2World** builds bridge decks with piers and tunnel entrance geometry from `bridge`/`tunnel`/`layer` and
  an elevation calculator (`BridgeTunnelEleCalculator`).
- **Mapbox Standard HD Roads** (GL JS ≥ 3.30): elevated roads, 3D bridges, tunnels and multi-level
  interchanges in 71 cities. It shows that the look is achievable in a browser, at map scale.
- **CesiumJS** "underground" features: globe translucency (`globe.translucency`, front/back face alpha by
  distance) and underground fog, so the camera can go below the surface and see tunnels and metro lines.
  This is the standard X-ray trick for subway visualisation.
- Driving games: the tunnel is a separate streaming cell entered through a portal; inside are a modular box
  section, repeated light fixtures, emissive strips and an exposure change.

### 6.3 Plan for us

1. **Viaducts and road bridges (first, visible from the street).** Deck = the measured `LVL +1` surfaces;
   deck height from the DTM at the abutments (`BR0302L`) and a smooth vertical curve (our `roadProfile.js`);
   deck slab ~1.2 m (our `DECK`), parapets/guard rails along the outline, piers every 25-40 m under the deck
   axis (Herrmann-Debroux is a long viaduct), ground below = DTM. The Uccle bridges over the railway are
   short one-span decks.
2. **Road tunnel portals and ramps.** Ramp polygons (`A`, BM access ramps) mark where the road leaves the
   surface. Profile the ramp from the DTM at the top to −(4.5 m clearance + ~1 m slab) at the portal; cut the
   terrain mesh along the ramp; extrude retaining walls along the ramp edges (Topo `BF0205L/BF0206L` where
   present); a portal headwall mesh where the ramp meets the `LVL −1` polygon.
3. **Tunnel interiors.** Build only when the camera enters a portal or the player drives in (separate cell,
   portal culling). Box section from the `LVL −1` polygon width, constant floor depth, ceiling lights every
   ~10-15 m (instanced, emissive, no real lights), emergency exits from BM. Cost when outside: zero.
4. **Metro and pre-metro.** Station boxes = MS polygons at ~−8 to −15 m (assumed); tunnels = MT polygons or
   the GTFS shapes swept with a box section; trains from GTFS (as trams today). Two views: walk into a
   station through its entrance (OSM `railway=subway_entrance`), or an **X-ray / cut-away mode** (ground made
   translucent or clipped around the camera, Cesium-style) that shows the lines and the trains under the city.
   Uccle itself has no metro (the Bois de la Cambre rail tunnel and the Calevoet / Moensberg railway are the
   Uccle cases), so metro comes with the Brussels extension.
5. Everything structural is pipeline output per tile, like buildings: no runtime CSG.

---------------------------------------------------------------------------------------------------

## 7. The "perfectly realistic road" checklist

Shape
- [ ] Carriageway, sidewalk, junction, median, tram site and square outlines from UrbIS Land cover (not guessed).
- [ ] Kerb lines from UrbIS Topo `BR0101L`; sidewalk outer edge `BR0103L`; gutter `BR0102L` as its own strip.
- [ ] Kerb profile: 12-15 cm face with small chamfer; **dropped kerbs** at driveways (`CR42L`), crossings and
      ramps; flush kerbs on living streets and squares.
- [ ] Road crown / camber (~2 % to each gutter); sidewalk cross-slope (~1-2 %) towards the road; draped on the
      50 cm DTM, so Uccle's slopes are real.
- [ ] Corner radii from the data; bulb-outs and recesses (`BR0104L`) kept.
- [ ] Medians, roundabout islands, splitter islands raised with their own kerbs and grass / paving.
- [ ] Speed bumps (`BR12L`, BM `Speedramp`) as real geometry.

Paint
- [ ] Real markings where surveyed (Topo `CR21-CR26`, BM marking inventory); derived from the lane stack elsewhere.
- [ ] Belgian rules: all white, yellow only for special cases (e.g. parking bans, temporary works); exact
      dimensions taken from the Belgian marking regulation (to be checked, not guessed).
- [ ] Zebra crossings from Topo `CR2301L` stripes / BM crossing polygons, at the real places.
- [ ] Wear: paint fades and chips in wheel paths, resin vs paint (`material` P/R in BM) look different.

Surface and materials
- [ ] Surface type per area: asphalt, setts (OSM `surface` is on 57 % of our car ways), concrete, pavers; patch
      boundaries from Topo `CR63L`.
- [ ] Grooved tram rails embedded (Topo `pt_rail_line`, UrbIS `Railways`), with the asphalt seam either side.
- [ ] Manholes (`CR61*P`), gullies (`CR62*P`), drains in the gutter, all as decals or small instanced meshes.
- [ ] Wet roads: puddles in the gutter and at low points (we know the gutter line and the slopes).
- [ ] Specular anti-aliasing on asphalt (already noted in `docs/RESEARCH.md`).

Street furniture (instanced, from data, not random)
- [ ] Lamps (`CR3201P`, BM `luminaires`), traffic lights (`CR3101-3106P`), signs (BM `traffic_signs`), bollards
      (`CR5702P`, `CR57L`), benches, bus shelters, guard rails, New Jersey barriers, trees (`BG0101P`).

Structures
- [ ] Bridges and viaducts with decks, parapets, piers, abutments (section 6).
- [ ] Tunnel ramps with retaining walls, portals, interiors on demand.

Performance (per tile)
- [ ] One merged ground mesh with a material id attribute → one draw (texture array / atlas).
- [ ] One merged kerb mesh, one merged marking mesh (atlas, depth-biased, no z-fighting).
- [ ] Furniture instanced across tiles (as the lamps are now).
- [ ] LOD: near full; mid without kerb detail and small decals; far baked into the tile's terrain texture.
- [ ] All geometry built offline or in the tile worker; nothing heavy on the main thread.

Checks
- [ ] Buildings vs roadway overlap ~0 (*measured* 2 at ≥ 1 m with UrbIS surfaces).
- [ ] Lane polygons inside the measured carriageway; lane graph continuous through junctions.
- [ ] Visual comparison against the 2021+ orthophoto at a list of named places (Place de Saint-Job, Globe,
      Calevoet, Vanderkindere, Churchill, Herrmann-Debroux...).

---------------------------------------------------------------------------------------------------

## 8. Suggested next steps (for the owner to decide)

1. Add UrbIS Land cover (region GPKG) and the UrbIS Topo road layers (via WFS per tile, or the region GPKG)
   to `pipeline/sources.json` and `fetch_urbis.py`.
2. Prototype on one tile (e.g. Saint-Job): measured surfaces as the ground mesh + kerbs, the current engine
   for markings only. Compare GPU ms before/after (`viewer.gpuStats()`), and run the overlap audit.
3. Write the width-fitting adapter (section 5, steps 2-5) and feed fitted stacks to `buildRoadNetwork`.
   Junction pads from `I`/`IC`.
4. Markings from Topo where present; the engine fills the rest.
5. Bridges over the railway in Uccle (level +1), then the Bois de la Cambre tunnel portals; metro with the
   Brussels extension.
6. Optionally ask Brussels Mobility for the `mark_type` legend of the marking inventory, and whether
   `average_width` in `brr_segments_lanes` is filled anywhere.

---------------------------------------------------------------------------------------------------

## Sources

Libraries
- osm2streets: https://github.com/a-b-street/osm2streets, how it works:
  https://github.com/a-b-street/osm2streets/blob/main/docs/how_it_works.md, StreetExplorer:
  https://a-b-street.github.io/osm2streets/, npm: https://www.npmjs.com/package/osm2streets-js
- osm2lanes (archived): https://github.com/a-b-street/osm2lanes
- A/B Street: https://github.com/a-b-street/abstreet
- Streets GL: https://github.com/StrandedKitty/streets-gl (read on branch `dev`: `RoadBuilder.ts`,
  `IntersectionPolygonBuilder.ts`, `OSMPolylineQualifierFactory.ts`, `getPathWidth.ts`, `isUnderground.ts`),
  https://streets.gl
- OSM2World: https://github.com/tordanik/OSM2World, https://osm2world.org/docs/library-web/
- SUMO: https://github.com/eclipse-sumo/sumo, https://sumo.dlr.de/docs/Networks/Import/OpenStreetMap.html,
  https://sumo.dlr.de/docs/SUMO_edge_type_file.html
- CARLA: https://github.com/carla-simulator/carla, https://carla.readthedocs.io/en/latest/tuto_G_openstreetmap/
- libOpenDRIVE: https://github.com/pageldev/libOpenDRIVE
- esmini: https://github.com/esmini/esmini
- Blosm: https://github.com/vvoovv/blosm
- Mapbox HD Roads: https://www.mapbox.com/blog/hd-roads-bring-lane-level-detail-to-mapbox-standard,
  https://docs.mapbox.com/map-styles/standard/guides

Standards and tools
- ASAM OpenDRIVE 1.8.1: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/latest/specification/00_preface/00_introduction.html,
  https://www.asam.net/project-detail/asam-opendrive-v180/
- RoadRunner: https://www.mathworks.com/products/roadrunner.html
- Unreal landscape splines: https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-splines-in-unreal-engine
- Unreal City Sample: https://dev.epicgames.com/documentation/en-us/unreal-engine/city-sample-project-unreal-engine-demonstration
- Houdini OSM / Labs Road Generator: https://www.sidefx.com/tutorials/city-building-with-osm-data/,
  https://www.sidefx.com/tutorials/osm-importer/
- Godot Road Generator: https://github.com/TheDuckCow/godot-road-generator,
  https://80.lv/articles/godot-road-generator-now-features-better-procedural-intersections
- Road Architect: https://github.com/MicroGSD/RoadArchitect
- CiDy 2: https://assetstore.unity.com/packages/tools/level-design/cidy-2-55298
- CityGen3D: https://discussions.unity.com/t/released-citygen3d-procedural-city-generation-from-map-data/689946
- EasyRoads3D: https://www.easyroads3d.com
- CesiumJS globe translucency: https://cesium.com/downloads/cesiumjs/releases/1.133/Build/Documentation/GlobeTranslucency.html,
  https://community.cesium.com/t/help-us-test-the-new-underground-features-in-cesiumjs/9581

Brussels data
- UrbIS Land cover spec: https://urbisdownload.datastore.brussels/UrbIS/TechSpec/LandCover_TechSpec_FR20240401.pdf
- UrbIS Land cover dataset / Atom: https://datastore.brussels/web/data/dataset/b718705d-f70f-11ee-8282-00090ffe0001,
  https://urbisdownload.datastore.brussels/atomfeed/b718705d-f70f-11ee-8282-00090ffe0001-en.xml
- UrbIS Topo spec: https://urbisdownload.datastore.brussels/UrbIS/TechSpec/Topo_TechSpec_FR20230428.pdf,
  record https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/10ded91e-6a63-11ed-9d77-010101010000,
  Atom https://urbisdownload.datastore.brussels/atomfeed/10ded91e-6a63-11ed-9d77-010101010000-en.xml
- UrbIS Transport networks: https://datastore.brussels/web/data/dataset/af847c40-848b-11ee-9a1f-00090ffe0001
- Brussels Mobility GeoServer: https://data-mobility.irisnet.be/geoserver/ows?service=WFS&request=GetCapabilities&version=2.0.0;
  sidewalks layer page https://data-mobility.irisnet.be/info/urbadm_ssw;
  BM WMS record https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/672850fe-c2d4-4b63-a6f4-9df26799a298
- STIB GTFS (Belgian Mobility open data): https://data.belgianmobility.io
- OSM tagging: https://wiki.openstreetmap.org/wiki/Key:layer, https://wiki.openstreetmap.org/wiki/Key:tunnel,
  https://wiki.openstreetmap.org/wiki/Key:width
