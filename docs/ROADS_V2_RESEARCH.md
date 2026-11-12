# Road System v2: diagnosis, best-in-class survey, data, architecture (2026-11-10)

Follow-up to `docs/ROADS_RESEARCH.md` (2026-11-04). Written after the owner's Traffic Lab review: zebra crossings sit
in the middle of junction mouths, stop lines and dashes land in odd places, the paint disagrees with the traffic paths,
and some curved roads look completely broken.

How this was checked: by reading the code (file:line below), running the road engine headless in Node on five real
tiles exactly as the tile worker does (I6, H6, E4, F5, I5), downloading the measured marking layers for those tiles
from the Brussels Mobility WFS, overlaying them on our 2024 orthophoto, and a web survey of other road systems.
Numbers marked *measured* come from those scripts. They live in the session scratchpad, not in the repo. No browser was
needed. I have not seen the owner's screenshot itself, so where I say "the owner's case" that is an inference.

---------------------------------------------------------------------------------------------------

## 0. One-page summary

**What is wrong today, in plain words.** We draw the street surface from measured UrbIS polygons, which is good. On top
of that we lay a second, invisible road: the one the road engine imagines from the OSM centreline and guessed widths.
**All the paint lives on that imagined road**, and so do the traffic lanes. Where the imagined road and the real
street disagree, the paint is in the wrong place. Traffic then snaps its lanes back onto the real street, up to 9 m
sideways, but the paint is not moved with them. That gives three versions of each street (measured surface, engine
paint, snapped traffic), and nothing forces them to agree.

The top causes, ranked by how much they explain:

1. **Crossings are invented, not measured.** The engine puts a zebra on every arm of every junction of 3+ roads whose
   road type "has crosswalks" (`vendor/roads/roadNetwork.js:200`), 0.4 m past its own guessed kerb return
   (`vendor/roads/roadJunction.js:434`). The measured crossings are not used anywhere in our code. *Measured* on 5
   tiles:
   - 219 engine crosswalks against 109 measured ones.
   - 149 engine crosswalks (68 %) have no real crossing within 8 m.
   - Only 19 of 109 real crossings (17 %) have an engine crosswalk within 3 m. The median miss is 5-12 m.
2. **Junction position and size come from the engine, not from the survey.**
   - The junction centre is the OSM node. Where `refine_roads.mjs` merged two nodes, it is their midpoint (365
     merges in Uccle). Place de Saint-Job's 5-arm junction is one of them.
   - The kerb-return size comes from road-type default radii (`roadJunction.js:84-100`), not from the measured kerbs.
   - Every zebra and stop line is placed from that guessed mouth, along a straight "arm frame" (`roadJunction.js:29`).
3. **Paint is drawn where no paint exists.**
   - Every `local` street gets a dashed centre line (type default `center.kind: "line"`, `pipeline/build_roads.py:28`).
     Most Uccle streets have none: measured, the UrbIS survey has only 66 dashed and 169 continuous line features in the
     whole Uccle box.
   - Every untagged `collector` gets painted cycle lanes (`build_roads.py:29,165-167`).
   - OSM `shared_lane` (painted bike symbols inside the traffic lane) is turned into a separate bike lane
     (`build_roads.py:150`).
   - Stop lines are guessed from road rank where no sign exists (`roadJunction.js:382-383`): 29 of the 58 engine
     stop/yield lines on the 5 tiles are guesses.
4. **Lane paint follows OSM, not the measured kerbs.**
   - The width fit keeps the OSM centreline. It stretches each side to one median width per road
     (`viewer/surfaces.js:529`) and skips any road it cannot measure over 40 % of its length (`surfaces.js:506,523`).
   - Surfaces are cut to the tile, but roads run 150 m into the buffer, so most roads are skipped. *Measured*: 49 of 74
     roads in I6, 333 of 458 on the 5 tiles.
5. **The traffic lanes and the paint come from the same engine but are then pulled apart.**
   - `claude/traffic`'s `fitToSurface` moves lane points up to 9 m (`viewer/traffic/trafficGraph.js:290-330` on that
     branch) and never moves the paint.
   - Signal hold points sit 4.5 m before the lane end (`trafficGraph.js:153`), not at the painted line.
   - The engine's guessed stop lines are deliberately ignored by traffic (header of `trafficGraph.js`), yet they are
     still painted.
6. **"Broken curves" are mostly the clean-up stage, not the renderer.**
   - `pipeline/refine_roads.mjs` "fixes" tight bends by **deleting the curve's points**: 1,021 `drop-pi` actions in
     Uccle (`refine_roads.mjs:169-210`). Each one replaces part of a curve with a straight chord.
   - The engine also shrinks bend radii to fit between OSM points (`vendor/roads/roadAlignment.js:143-160`) and forces
     a straight "lead" of trim + 5 m at each junction (`roadNetwork.js:211`).
   - Where the radius ends up smaller than half the road width, the strip folds over itself. The engine only reports
     this as `tight-bend` (`roadNetwork.js:565`) and still draws it: 18 errors remain in tiles, 11 in the network.
   - On top of that, the refine ran on guessed widths, while the city runs on fitted widths, so the two disagree.
7. **Z-fighting comes from exact coplanarity.** Every engine asphalt triangle is placed at exactly the same height above
   the measured base (`surfaces.js:56,640`). Wherever two engine pieces overlap, the result is two coplanar triangles
   with the same depth bias (`viewer/roadPaint.js:62`). Overlaps happen with dual carriageways, splits and `overlap`
   warnings. The base itself sits only 1.6 cm below.

**What I recommend.** One **lane-level street model**, built offline for all of Uccle at once and cut per tile, as the
single source of truth. It borrows OpenDRIVE's concepts:
- roads with a reference line and lane widths that vary along the road;
- junctions with a boundary and connecting lanes;
- crossings and stop lines as their own objects tied to one arm;
- road marks per lane edge, each with a source.

Surfaces, kerbs, paint, the traffic lane graph, signals, the minimap, street signs and levels are all *derived* from that
model, so they cannot disagree. Measured data decides where it exists: UrbIS surfaces and Topo lines, then the Brussels
Mobility inventory, then OSM tags. Rules only fill the gaps that must logically be filled, and **no evidence means no
paint**. A Road Checker and a Road Lab with 10 real Uccle junctions come first, so every step is measured.

**Plan.** Each phase can be shown on its own.

| Phase | What | Effort |
|---|---|---|
| 0 | Road Checker v0 run on today's output, plus the Road Lab with 10 junctions and the orthophoto underneath | M |
| 1 | Quick fixes in our own code: measured crossings and stop lines instead of invented ones, no centre lines or bike lanes without evidence | S-M |
| 2 | The street model v2 (pipeline): topology from UrbIS StreetAxes, measured carriageway width along each road, junctions from the I polygons, crossings, stop lines, connectors | L |
| 3 | Everything derived from it: a marking decal mesh, the traffic graph with no snapping, signals, minimap, street names | M |
| 4 | Levels: the ~12 road bridges and 3-4 underpasses in Uccle (no metro in Uccle) | M-L |
| 5 | Orthophoto verification, the Brussels Mobility legend, then rollout to all 120 tiles with the checker in CI | M |

**The 2026-11-04 study** was right about "surface first", the UrbIS data and not adopting osm2streets. Its gaps:
- It said the engine would "still produce crosswalk positions". That is exactly what went wrong.
- It assumed the sparse Topo lane lines meant the engine should paint the rest, when on most streets the truth is "no
  line".
- It planned a width that varies along the road (`w(s)`); what was built is one median per road.
- It did not look at `refine_roads.mjs`, at tile-buffer consistency, or at how traffic would reuse the lanes.

Details are in section 6.

---------------------------------------------------------------------------------------------------

## 1. Diagnosis of the current system

### 1.1 How a street is built today (tile worker, `viewer/tileData.js:104-180`)

```
OSM ways --build_roads.py--> network.json --refine_roads.mjs--> cut_roads.py --> data/tiles/<T>/roads.json
                                       (engine-in-the-loop clean-up: drops PIs, merges nodes, drops stubs)
UrbIS Land cover --build_surfaces.py--> data/tiles/<T>/surfaces.json   (level 0 only, cut to the tile)

tile worker:
  prepareSurfaces(surfaces.json)          measured polygons -> height field H, class raster      (surfaces.js:251)
  fitRoadWidths(roads)                    lane stacks scaled to a median kerb-kerb width per road  (surfaces.js:495)
  buildRoadNetwork(roads)                 vendored engine: arms, junction pads, markings, lanes    (roadNetwork.js:89)
  buildLaneRoadMesh(net, markings)        engine meshes + signed-distance marking atlas            (mesh/laneRoadMesh.js)
  buildSurfaceRoads(prep, built, ...)     measured base + the ENGINE's asphalt (with all paint)
                                          laid LIFT = 6 mm above it, clipped only at the outer
                                          street edges and the tile                                (surfaces.js:573-730)
  [claude/traffic] buildTrafficGraph      engine lanes, then snapped onto the measured roadway     (trafficGraph.js)
```

So the **surface** is measured. The **paint, the lanes, the junction mouths, the stop lines and the crossings** are
all the engine's guesses, drawn on an invisible copy of the guessed road (`surfaces.js:9-16`).

### 1.2 Where markings come from

| Marking | Source today | File:line |
|---|---|---|
| Zebra crossings | Engine. One per arm of every junction of 3+ roads (and roundabout arms) whose road type has `crosswalks: true` | `roadNetwork.js:198-201`; `roadCrossSection.js:52-73,111` (types) |
| Zebra position | Engine. Station `trim + 0.4 m` (roundabout `+1.5`), 3 m deep, stripes from engine kerb to engine kerb ± 0.3 m, on a straight line from the node along the arm heading | `roadJunction.js:434-457`, `armPoint` `roadJunction.js:29` |
| Stop / yield lines | Engine. Control guessed from road ranks (`signal`, `stop`, `yield`); OSM signals override (`node.control`) | `roadJunction.js:367-390` (guess at 382-383); line at `crosswalk + 1.0 m` (`:464`) |
| Lane lines, centre line, edges, bike / parking lines | Engine, from lane adjacency in the lane stack | `vendor/roads/roadMarkings.js:15-41`; drawn in the asphalt shader from `aEdges` (`viewer/roadPaint.js:67-135`) |
| Lane stack itself | `build_roads.py` from OSM tags plus type defaults (bike lanes on collectors, parking on locals, `shared_lane` → bike lane) | `build_roads.py:126-170` |
| Arrows, hatching, ring lines | Engine (`arrowMarkings`, junction atlas) | `roadJunction.js:515+`, `mesh/markingAtlas.js` |
| **UrbIS Topo markings (CR21*/CR22*/CR2301L/CR2302L/CR2303L/CR24*P)** | **Not used.** Not fetched; no code refers to them (repo grep for `CR230`, `CR21`, `CR24`, `marking_line`: no hit) | — |
| **Brussels Mobility marking inventory** | **Not used** | — |
| **OSM crossing nodes** (`highway=crossing`, `crossing:markings=zebra`) | Stored as `meta.crossing` on graph nodes (`build_roads.py:366-367`) and as feature points (`build_features.py:26`), **never read** | `viewer/furniture.js:6` says crossings have "no reliable placement" |
| **Orthophoto** | Only for roof colours and the far LOD (`pipeline/build_roofcolors.py:10,27`, `build_ortho_lod.py`) | — |

### 1.3 Why zebras and stop lines land wrong at junctions (measured)

*Measured*: the tile worker's sequence (`prepareSurfaces → fitRoadWidths → buildRoadNetwork`) run in Node on 5 tiles,
compared with the Brussels Mobility pedestrian crossing polygons (`bm_pedestrian:pedestrian_crossing_surfaces_2d`,
which agree with the UrbIS Topo `CR2301L` crossing edges, see the overlay below):

| Tile | Engine crosswalks | Measured crossings | Measured with an engine one within 3 m | within 8 m | Median miss (m) | Engine ones with no real one within 8 m | Engine stop/yield lines (guessed / from OSM) | Measured stop lines CR2302L |
|---|---|---|---|---|---|---|---|---|
| I6 Saint-Job | 44 | 16 | 3 | 10 | 5.2 | 34 | 10 (5 / 5) | 4 |
| H6 | 17 | 10 | 2 | 4 | 12.1 | 13 | 5 (5 / 0) | 0 |
| E4 Brugmann | 104 | 49 | 9 | 33 | 6.0 | 70 | 30 (10 / 20) | 7 |
| F5 | 37 | 20 | 4 | 14 | 5.4 | 22 | 11 (7 / 4) | 0 |
| I5 | 17 | 14 | 1 | 7 | 8.7 | 10 | 2 (2 / 0) | 0 |
| **Total** | **219** | **109** | **19 (17 %)** | **68 (62 %)** | 5-12 | **149 (68 %)** | **58 (29 guessed)** | 11 |

Where the engine does hit a real crossing (within 8 m), its orientation is roughly right: median angle error 0.5-9°,
16 of 68 above 10°. **The problem is position and existence, not mainly angle.** Also, 18-24 % of the engine's junction
marking shapes have their centre on a sidewalk, median or square, or off the street (I6 77/354, E4 216/945): hidden
under a raised sidewalk, or cut at the kerb.

The orthophoto at Place de Saint-Job (I6), with the measured crossings (cyan polygons, magenta Topo `CR2301L` edges,
red Topo stop lines) and the engine's crosswalk centres (yellow circles), makes the pattern obvious. The real zebras
sit across each arm, set back from the junction. Several engine crosswalks are on sidewalks or building corners, and
one sits mid-junction. On the residential streets east of it, the engine places crosswalks where the photo shows none.

Mechanisms, in order:

1. **Invention** (`roadNetwork.js:200`): `a.crosswalk = walkable && type.crosswalks`. No data is asked. The real
   Uccle has crossings on some arms only (e.g. the 5-arm Saint-Job junction has 4 marked crossings, not 5, and they are
   not where the engine puts them).
2. **The mouth is the engine's, not the survey's.** `trim` is the tangent length of a fillet with a road-type default
   radius (`roadJunction.js:84-100, 116-117`), measured from the OSM node (or a merged midpoint). Real crossings are set
   back by the real kerb return and by the Belgian rule that a stopped driver must not stand on the crossing (section
   3.6). The UrbIS `I` polygon usually *contains* the crossing (*measured*: 52 of 109 real crossings have their centre
   inside an `I`/`IC` polygon). So "outside the I polygon" is not the right test either: the arm's joint must be found
   in the data.
3. **A straight arm frame.** All mouth markings use `armPoint(arm, σ, t)`, a straight line from the node along the arm
   heading (`roadJunction.js:29`). The engine keeps its own road straight over `trim + 5 m` (`roadNetwork.js:211`), so
   on the engine road it looks fine. On the real street, which curves or splays at the mouth, the zebra lands skewed or
   inside the junction.
4. **Engine kerbs set the stripe span** (`roadJunction.js:438`). With the measured carriageway drawn underneath, the
   zebra either stops short of the real kerb or runs under the raised sidewalk.
5. **Stop lines follow the crosswalk** (`s + 1.0`, `roadJunction.js:464`). Where the crosswalk is wrong, the stop line is
   too. Where control is guessed (`:382-383`), a stop line appears where the street has none.
6. **Merged junctions.** `refine_roads.mjs` merges close nodes into one at their midpoint (365 merges, log in
   `data/roads/network.json` `meta.refine`). A staggered junction then becomes one star-shaped junction centred
   between the real ones, and its mouth markings fall in the middle. Saint-Job's `n140341502` is such a merged node
   (`meta.merged: ["n255351698"]`, `data/tiles/I6/roads.json`).

### 1.4 Why dashes and lines are in "nonsense places"

- **Centre lines everywhere**: `local` and `collector` types default to `center.kind: "line"` (`build_roads.py:28-29`).
  `roadMarkings.js` `centerKind` then paints a centre line between any two opposing driving lanes
  (`roadMarkings.js:32-41`). UrbIS Topo has only 169 continuous + 66 dashed line features in the whole Uccle box
  (study of 2026-11-04 §4.2). In I6 there is one continuous line and no dashed ones (*measured*: `bm_urbis_topo:marking_line`
  I6 = 28 `CR2301L`, 4 `CR2302L`, 1 `CR2101L`). Our orthophoto crops of the Saint-Job streets show no centre lines.
  *Guess, to be measured from the orthophoto (Phase 5)*: most residential streets in Uccle have no centre line at all.
- **Invented cycle lanes**: an untagged collector gets a 1.6 m bike lane on both sides (`build_roads.py:29,165-167`).
  OSM `cycleway=shared_lane` (bike symbols in the traffic lane, e.g. Avenue Brugmann, Chaussée d'Alsemberg) becomes
  a separate lane with a solid line (`build_roads.py:149-158`).
- **Invented parking lanes**: locals and avenues default to parking both sides (`build_roads.py:28,30`), with its
  boundary paint (`roadMarkings.js:23`). The width fit then drops 9-44 lanes per tile to make things fit (*measured*:
  I6 36, E4 44).
- **Centre line on the OSM line, not in the middle of the street**: `fitRoadWidths` keeps the OSM centreline and fits
  the left and right widths separately (`surfaces.js:529-552`). Where the OSM way is off-centre, the centre line is
  too.
- **Constant widths**: one median per side per road (`surfaces.js:529`). A street that narrows at a bulb-out or widens
  at a corner keeps its lines straight, so edge lines cut into the kerb or float inside the asphalt.
- **Most roads are not fitted at all**: surfaces are cut to the tile (`build_surfaces.py`, I6 extent = tile ± 0.2 m),
  but the tile's road network reaches 150 m into the neighbours. Roads whose samples fall off the surface fail the
  40 % rule (`surfaces.js:523`). *Measured*: I6 fitted 23 / skipped 49, E4 27 / 89, I5 7 / 79. Those keep the OSM
  guess, and the same road may be fitted in one tile and not in the next, so lines can jump at tile seams. That last
  point is a *guess from the code*; the checker will confirm it.

### 1.5 Where geometry, paint, the lane graph and traffic disagree

| Thing | Built from | Agrees with |
|---|---|---|
| Visible street surface, kerbs, sidewalks | UrbIS polygons (`surfaces.js`) | itself |
| Paint | Engine road (OSM line + fitted or default widths + guessed junctions), placed 6 mm above the surface | the engine lanes |
| Engine lane graph | Same engine road (`roadNetwork.js` step 9) | the paint |
| Traffic lanes (`claude/traffic`) | Engine lanes **moved up to 9 m** onto the measured roadway, smoothed (`trafficGraph.js:290-330`) | the surface, mostly |
| Traffic hold points | OSM control only. Signals: 4.5 m before the lane end (`trafficGraph.js:153`); stop / give-way at OSM points (`:192`); engine stop lines not obeyed (`trafficGraph.js` header) | neither the paint nor the surface |
| Signal heads | OSM `traffic_signals` (`viewer/furniture.js:113`), phase from the road direction (`traffic/signals.js`) | traffic |
| Parked cars, lamps | Moved onto the measured kerb (`viewer/streetFit.js`) | the surface |

*Measured*, before the traffic snap, the engine lane points that lie on a sidewalk, median or square are: I6 10.7 %,
H6 5.9 %, E4 7.5 %, F5 5.7 %, I5 4.0 %. Counting also points with no surface at all (unmapped or buffer): 9-56 %.
`docs/TRAFFIC.md` on `claude/traffic` reports the snap bringing I6 from 6.3 % to 0.9 % (their ±1 m footprint test).
That fixes the cars and leaves the paint behind. Hence the owner's "traffic paths are fine but the paint disagrees".

### 1.6 Broken curves

The chain that produces them:

1. **OSM → PIs.** `build_roads.py:184-195` simplifies each OSM way at 0.75 m and turns every remaining vertex into a
   point of intersection (PI) with a radius from the circumradius of its neighbours, clamped to
   `[6 m, type max]` (alley 12, local 25, collector 60, avenue 80 m).
2. **The engine shrinks radii to fit.** If two neighbouring curves need more tangent length than the leg has, both
   radii shrink by the same factor, up to 10 passes (`roadAlignment.js:143-160`). A densely mapped curve becomes many
   tiny arcs. A curve near a junction must also leave room for the straight lead `trim + 5 m` (`roadNetwork.js:211`),
   so it is squeezed further. A PI that turns back on itself is skipped (`roadAlignment.js:133`).
3. **The strip folds.** When the radius drops below half the road width, the inner edge `1 + κ·t` goes negative and the
   lane strips turn inside out. The engine detects this (`roadNetwork.js:552-567`, `tight-bend`) but still builds the
   mesh.
4. **The clean-up deletes the curve.** `refine_roads.mjs` resolves `tight-bend` by **removing the PI nearest the
   problem** (`:169-210`), repeated up to 80 rounds. Network log (`data/roads/network.json` `meta.refine`):
   - `tight-bend` 788 → 11 and `road-swallowed` 724 → 103;
   - at the cost of **1,021 `drop-pi`**, 589 `tight-corner`, 365 `merge`, 79 `corner-node`, 71 `drop-stub`.

   Each dropped PI straightens part of a curve into a chord, so the engine road (and its paint and lanes) leaves the
   real, curved street by metres. On the measured base you then see the paint cut across the asphalt and vanish under
   the sidewalk.
5. **The refine ran on other widths.** It ran on flat ground with the OSM default widths. The city runs with
   `fitRoadWidths` widths, so bends that were OK in the refine can fold in the city, and the reverse.
   `node tools/check_roads.mjs --all` (also default widths) still lists 66 errors in tiles: 23 `ring-crowded`,
   18 `tight-bend`, 155 `road-swallowed` counted over tiles and buffers, 4 `crossing`. *Measured* with the fitted
   widths: I6 3 `tight-bend`, E4 2 `tight-bend` + 4 `road-swallowed`, F5 1 `tight-bend`.

*Guess, to be confirmed in the Road Lab*: the owner's "completely broken" curves are mainly (4) on mapped streets,
where the paint and lanes visibly leave the measured asphalt, and (3) where a fold is left on screen.

### 1.7 Z-fighting sources

| Source | Where | Why |
|---|---|---|
| Two engine asphalt pieces over the same spot | `surfaces.js:640` (`H + LIFT` for every engine vertex) | Dual carriageways, split gores, `overlap` warnings (I6 1, E4 3), swallowed roads: two triangles at exactly the same height, same depth bias |
| Engine layer vs measured base | `LIFT` 6 mm + `BASE_DROP` 10 mm (`surfaces.js:56-57`) | Fine up close with reversed-z. All road materials share `polygonOffset −2/−2` (`roadPaint.js:62,179,216`, `cobbles.js:22,86`), so the bias does not separate them from each other, only from the terrain. Three flips the bias correctly for reversed-z (`WebGPUPipelineUtils.js:240-241`) |
| Unmapped engine roads | kept "as built" (`surfaces.js:681-690`) next to measured ones | Engine heights vs `H` differ, small overlaps at the boundary |
| Kerb band | `BAND_LIFT` 4 mm (`surfaces.js:60`) | Thin layer on the kerb top |
| Buffer copies | each tile clips to its bounds (`surfaces.js:698-699`) | OK |

The fix is structural: draw paint as its own decal layer from one model (no second asphalt), with one depth bias for
"paint" and a minimum separation chosen for the far distance.

### 1.8 What the 2026-11-04 plan delivered

| Plan item (ROADS_RESEARCH.md §8, §5, §7) | Status |
|---|---|
| Land cover surfaces as the ground mesh, kerbs, sidewalks, medians, squares | Done, default on 120 tiles (`build_surfaces.py`, `surfaces.js`) |
| Overlap audit (buildings in road 1,121 → 45) | Done (`tools/audit_surfaces.py`) |
| Topo kerb line `BR0101L` | Used as a check only (`build_surfaces.py:432-445`); kerbs come from the polygon edges (I6: 97.6 % within 10 cm) |
| Dropped kerbs `CR42L`, bollards `CR5702P`/`CR57L` | Done |
| Width fit, `w(s)` sampled every 2-5 m, smoothed, fitted | **Partly**: one median per side per road, OSM centreline kept, most buffer roads skipped |
| Junction pads from `I`/`IC` | **Surface only**: the measured I polygon is drawn, but the engine's own junction (trim, markings, connectors) is unchanged |
| Markings from Topo, engine fills the rest | **Not done** |
| Lanes inside the carriageway audit | Not done (traffic snaps instead) |
| Bridges (+1) and tunnels (−1) | Not done: levels are skipped (32 polygons at +1, 3 at −1 on our tiles), every road has `profile.mode: "terrain"` (4,531 of 4,531), so the engine's bridge code (`roadNetwork.js:621-636`) never runs |
| Speed bumps, manholes, drains, signs from data | Not done |
| Brussels Mobility `mark_type` legend | Not asked |

---------------------------------------------------------------------------------------------------

## 2. How the best road systems do it

The detailed survey, with every URL, is in the sources section. This section is what matters for us.

### 2.1 The shared lesson: the junction arm is the unit of placement

Every mature system ties crossings and stop lines to **one arm** of the junction (one road meeting one junction), in
that arm's own coordinates measured from its trimmed end. None places them from the junction centre or by filling the
junction polygon. The station order on an arm, from the junction outward, is always:

```
 junction boundary ("joint", square to the arm) | crossing band (zebra) | gap | stop line (incoming lanes only) | lane paint ...
```

- **Esri CityEngine** places crosswalks and stop bars on the *segment end*, not on the node: crosswalk attributes are
  greyed out on nodes. It uses a "distance from the end" UV in metres and a `Crosswalk_To_Stop_Bar` distance
  (≈ 2.4 m by default). The crosswalk width is tied to the sidewalk width.
- **MathWorks RoadRunner**'s Crosswalk and Stop Line tool shows one chevron per junction approach. You click an
  approach to add its stop line and crosswalk. The Corner Tool sets kerb radii per corner.
- **Cities: Skylines** mod Intersection Marking Tool: marking points are the lane-edge end points at each segment end.
  Two points on the same road make a stop line; crosswalks are drawn between border points. In CS2 a crosswalk is a
  pedestrian lane with a `Crosswalk` flag.
- **Lanelet2 / Autoware**: a stop line is a line string that does nothing unless a regulatory element (traffic light,
  right of way) refers to it. A crosswalk is a lanelet plus a polygon, referenced by the regulatory element.
- **OpenDRIVE 1.8** puts a stop line on a signal with lane validity (`validity fromLane/toLane`), linked to its light.
  A crosswalk is an object with an outline and stripe parameters. The junction gets a **boundary** made of lane-edge
  segments and perpendicular "joint" segments at each road end, plus an **elevation grid** for sloped junctions.
- **SUMO**: the lane end *is* the stop line. `endOffset` moves it back and `stopOffset` adds per-vehicle-class setbacks.
  Crossings are generated only between sidewalks across lanes that forbid pedestrians (`crossings.guess`), and above
  50 km/h only at signalled junctions. `rectangular-lane-cut` makes square lane ends.
- **A/B Street / osm2streets** trims each road until its edges clear the neighbours, then cuts it **square**. Their docs
  say angled trims misplace stop positions and let crosswalks "leak" into the junction. That is our symptom exactly.

### 2.2 Per system

| System | Lane model | Junction geometry | Markings | Levels | Runtime | Borrow |
|---|---|---|---|---|---|---|
| **Unreal City Sample / Matrix Awakens** (Houdini + ZoneGraph + Mass Traffic) | ZoneShape splines with lane profiles; polygon shapes for junctions, each polygon point a connector carrying the arm's profile; lanes inside generated between connectors | Polygon per junction; PCGEx helpers: connection radius, "convex fit radius", merge junctions joined by a short road | Decal meshes generated in Houdini, instanced; crosswalk lanes for crowds (partly recalled) | Freeway stage in Houdini, ramps as curves with elevation/banking | All baked offline, World Partition streaming | Junction = polygon whose edges are arm connectors; lanes through it generated; merge short roads first |
| **Houdini** (Labs Road Generator, City Sample layout, Insomniac Spider-Man) | Width attribute on curves | Angle/width-adaptive junctions; merge short segments first | Not documented | Freeway stage | Offline | Staged, cached pipeline (layout → roads → structures → decals) |
| **RoadRunner** + ASAM OpenDRIVE 1.8 | Lane sections, width polynomials, road marks per lane edge | Auto junctions, Corner Tool; OpenDRIVE junction boundary (lane + joint segments), elevation grid, direct junctions for ramps, crossing junctions for rail/ped | Per-approach stop line + crosswalk; stencils; OpenDRIVE object markings (crosswalk outline + stripes); stop line = signal with lane validity | Bridges, tunnels as objects; elevation, superelevation | Authoring tool → .xodr + FBX | **The data model**: boundary, joints, connecting lanes, stop line with validity, road marks with a source |
| **Esri CityEngine** | Segments with sidewalk/roadbed lanes; UVs in metres from each end | Node types (crossing, junction, roundabout, freeway); `minArcRadius`, `cornerStyle` | On the segment end, by distance from the end; crosswalk-to-stop-bar distance | Freeway shapes | Offline | **Arm-local placement by distance from the arm's end** |
| **Unity** (EasyRoads3D, CiDy 2, Road Architect) | Road types with lanes | Crossing prefabs (dynamic or custom mesh) | Stop markings as road-end decals | Side objects / bridges | Editor bake | Road-end decals again; prefabs do not suit real data |
| **Godot Road Generator** | RoadPoints with lane counts; RoadLanes double as AI paths | Procedural intersections since v0.8 | Not documented | No | Runtime-capable | Lane graph and meshes from the same lane data |
| **Cities: Skylines I/II** (+ IMT, TM:PE) | NetInfo lanes (CS1), lane entities (CS2) | Node mesh at segment ends | IMT: points at lane-edge ends; CS2 crosswalk = flagged pedestrian lane | Elevated / tunnel network pieces | Real time, huge networks | Anchor points at lane-edge ends; crosswalk = pedestrian lane |
| **BeamNG** (Road Architect) | Per-arm roads with lanes | Junction presets with per-arm corner radii | Crossings with width, kerbs that dip at crossings, entry-arrow decals, tyre-wear overlays along entry→exit lane paths | Highway slips | Real time | Wear along lane paths, kerb dips at crossings |
| **osm2streets / A/B Street** | Ordered lane list per road | Edge collisions → perpendicular trim → clockwise sort | Lane lines, arrows; crosswalks "planned" | No | WASM | Square trim |
| **SUMO netconvert** | Lanes per edge | Junction shape from edge overlaps + radius, `corner-detail`, `junctions.join` | Stop = lane end; crossings inside the junction shape; walking areas at corners | `layer` only | Simulation | Stop = lane end; crossing-generation rules |
| **Lanelet2** | Lanelets with left/right bounds | Lanelets in the junction | Stop line via regulatory element; crosswalk lanelet + polygon | No | AD stack | Regulatory elements tie lines to rules |
| **Mapbox Standard HD Roads**, **3DStreet** | HD lanes; cross-section JSON | Measured; box intersections | Explicit layers (lanes, arrows, stop lines, crossings) from z16; per-arm crosswalk flags | Mapbox: 3D bridges, tunnels | Web | The look we want on the web; crossings are per-arm data, not rules |
| **Streets GL**, **OSM2World** | Tags + defaults | Polygon from road graph / junction areas | Textured roads; OSM2World stripes the crossing way, reading `crossing:markings` | OSM2World bridges/tunnels | Workers per tile / offline | Use OSM crossing ways and nodes where they exist |

Things that are new since 2026-11-04 or confirmed by this survey:
- There is still no official Epic road builder in UE 5.6/5.7. PCG has only a spline-intersection node; junctions come
  from third-party tools.
- OpenTwinMap (arXiv 2511.21925, Nov 2025) converts OSM to OpenDRIVE but still lists junctions as "future work".
  Converters such as osm-to-xodr wrap SUMO's netconvert.
- DLR SkyScapes (ICCV 2019) has 12 aerial lane-marking classes (crosswalk, stop line, zebra zone, turn sign...). Road
  marking segmentation from aerial images is a solved research problem at about 10 cm per pixel. Our orthophoto is
  25 cm (section 3.4).

### 2.3 Ideas we take (ranked)

1. **The arm is the main object.** Crossings, stop lines, give-way lines and arrows are placed in arm-local (s, t)
   coordinates, measured from the arm's joint.
2. **Fixed station order per arm**: joint → crossing → gap ≥ 1 m → stop line, only across the incoming lanes
   (Belgian dimensions, section 3.6).
3. **Square joints** (A/B Street, SUMO `rectangular-lane-cut`), taken from the measured street where possible.
4. **Junction boundary as in OpenDRIVE 1.8**: lane segments (the kerb arcs) and joint segments. For us, the kerb arcs
   come from the measured polygons.
5. **Measured data decides.** Snap to UrbIS Topo lines, BM crossing polygons and OSM crossing nodes on the same arm;
   rules only as a fallback; report mismatches.
6. **A stop line is its own object** with lane validity and a controller (signal, sign, priority). Traffic and paint
   read the same object.
7. **A crossing is a pedestrian lane plus a polygon**, so the mesh, future pedestrians and the signal phase share one
   record.
8. **Connecting lanes through the junction** between arm connectors (ZoneGraph, OpenDRIVE `laneLink`, SUMO internal
   lanes). Turn arrows come from those connections.
9. **Cluster first, then build** (`junctions.join`, osm2streets consolidation): for us, one junction per measured
   `I`/`IC` polygon.
10. **A junction elevation grid** for Uccle's slopes; bake everything offline; marking geometry as one decal mesh per
    tile.

---------------------------------------------------------------------------------------------------

## 3. Our data, re-checked

### 3.1 What is in `data/raw` today

| Data | In `data/raw` | Used for |
|---|---|---|
| UrbIS Land cover GPKG (region, 2026-10-02) | yes | surfaces (level 0 only) |
| UrbIS Topo `road_line` per tile (`topo_roadline/<T>.geojson`) | yes. *Measured* over 120 tiles: `BR0104L` 12,941, `BR0101L` 6,901, `BR0103L` 4,847, `BR02L` 1,939, `BR0102L` 1,041, `BR13L` 5 | kerb check |
| UrbIS Topo `street_furniture_line`, `pole_point`, `pole_line` | yes: `CR42L` 13,778 driveways, `CR36L` 121, `CR5702P` 405, `CR57L` 502 | dropped kerbs, bollards |
| UrbIS Topo **marking** layers | **no** | — |
| BM marking inventory, crossing polygons | **no** (fetched for 6 tiles in this study, scratchpad only) | — |
| UrbIS Transport networks (`transport/`, 44 sheets) | yes: **StreetAxes** 3,048 unique (S 2,490, I 236, IC 120, SC 114, C 80, A 2, AC 2, B 1, G 1; LVL 0: 3,029, +1: 18, −1: 1), StreetNodes (I 1,724, DE 131, ...), Railways (TW tram, RW rail, LVL −1/0/+1) | not used by the road pipeline |
| Orthophoto 2024 (`ortho/<T>.jpg`, 2000 × 2000 px = 25 cm/px, layer `Ortho2024NS`) | yes, all tiles | roof colours, far LOD |
| OSM extract (`osm/area.json`, 2026-11-04) | yes | roads, features |
| STIB GTFS → `data/transit/stib-92.json` | tram 92 only | trams |

### 3.2 Measured markings: what exists (5 + 1 tiles fetched, plus the 2026-11-04 Uccle-box counts)

| Layer | I6 | H6 | E4 | F5 | I5 | G7 | Uccle box (2026-11-04 counts) |
|---|---|---|---|---|---|---|---|
| Topo `CR2301L` zebra (two edge lines per crossing, observed) | 28 | 24 | 98 | 34 | 24 | 0 | 2,407 |
| Topo `CR2302L` stop line | 4 | 0 | 7 | 0 | 0 | 0 | 49 |
| Topo `CR2303L` give-way | 0 | 0 | 4 | 0 | 0 | 0 | — |
| Topo `CR21L/CR2101L` continuous | 1 | 0 | 52 | 0 | 0 | 0 | 169 (CR2101L) |
| Topo `CR22L/CR2201L` dashed, `CR2204L` cycle track | 0 | 0 | 20 + 2 | 0 | 0 | 0 | 66 (CR2201L) |
| Topo `CR24*P` arrows / logos | 0 | 5 | 28 | 0 | 0 | 0 | — |
| BM `pedestrian_crossing_surfaces_2d` | 16 | 11 | 50 | 20 | 14 | 0 | 1,389 |
| BM `marking_line` / `marking_polygon` (inventory, `L01..`, `P01..`, `S01..`) | 0 / 0 | 0 / 0 | **333 / 171** | 0 / 0 | 0 / 0 | 0 / 0 | 3,184 / 2,383 |

What this tells us:
- **Crossings are densely and consistently surveyed.** Topo `CR2301L` (two edge lines each) and the BM crossing
  polygons agree. The orthophoto overlay at Saint-Job shows them within about a metre of the visible paint, with one
  BM/Topo crossing where the 2024 photo shows none (a change since, or a survey error). OSM adds 3,390
  `highway=crossing` nodes and 2,147 `footway=crossing` ways in the extract, 2,605 of them `crossing:markings=zebra`.
- **Stop lines, give-way lines and arrows are sparse in UrbIS Topo.** Stop lines are surveyed on a few signalled
  approaches only (49 in Uccle).
- **The BM marking inventory covers regional roads only** (E4: Avenue Brugmann, Chaussée d'Alsemberg; empty elsewhere).
  It is rich there: line types L01-L26, surfaces P/S, paint vs resin. We need its `mark_type` legend; it is still
  unanswered.
- **Lane lines are almost absent on communal streets.** That is probably because there are none (*guess, to verify on
  the orthophoto*), not because the survey is incomplete.
- G7 (forest) has none of it, as expected.

### 3.3 OSM in our extract (*measured*, `data/raw/osm/area.json`, 5,303 car ways)

- `lanes` 608 (11 %), `turn:lanes*` 57, `width` 131, `oneway` 1,763.
- Cycleways on car ways: `cycleway*` tags 1,325. Note `shared_lane` (sharrows) on Avenue Brugmann and Chaussée
  d'Alsemberg; `lane` on Avenue Churchill, Avenue Albert, Chaussée de La Hulpe; `track` on Avenue Dolez and Steenweg op
  Ukkel. 388 separate `highway=cycleway`.
- `parking:*` 246; `sidewalk*` 1,129.
- Control nodes: 553 `traffic_signals`, 436 `give_way`, 21 `stop`.
- Crossings: 3,390 `highway=crossing` (`crossing=uncontrolled` 2,156, `traffic_signals` 476, `unmarked` 546) and
  `crossing:markings` on 2,935 of them (2,605 `zebra`, 313 `no`).
- Tram: 356 tram ways, 592 `tram_crossing`, 549 `tram_level_crossing`.
- Structures: 39 `bridge`, 84 `tunnel` (26 of them `building_passage`), 72 `layer`. 9 `subway_entrance` nodes in the
  extract, all outside Uccle (the extract box reaches beyond the commune).

### 3.4 The orthophoto: can paint be detected or verified from it?

- Layer `Ortho2024NS`, UrbIS, CC0, fetched at 25 cm/px (`build_roofcolors.py:10`).
- What you can see at that resolution:

  | Marking | Real size | On the photo |
  |---|---|---|
  | Zebra stripes | 50 cm (2 px) | clearly visible in our crops |
  | Stop lines | 50 cm | visible |
  | Lane and edge lines | 15 cm (sub-pixel) | visible only as faint bright streaks when unworn and not shaded |

- Things that hide paint: parked cars, trees (Uccle has many), shadows, and the ortho's own lean at building edges.
- **Recommendation: verification, not a primary source.**
  - The checker samples the photo along every predicted marking: a zebra stripe-period score across the crossing band,
    a brightness contrast along a predicted line.
  - It flags disagreements for review.
  - It never creates geometry on its own.
- A finer ortho (if the WMS serves one) would allow lane lines. *Guess*: the 2024 product's native ground resolution
  may be finer than 25 cm; check the WMS `GetCapabilities` and the UrbIS ortho spec before relying on it.
- Google imagery stays a human visual check only (TODO rule, `docs/TODO.md:55`).

### 3.5 Trams, metro, tunnels and bridges in Uccle

- **Trams**:
  - OSM has 356 tram ways and UrbIS Railways has `TW` at LVL 0 and +1 (+1 = tram bridges).
  - Several lab junctions carry tram tracks in OSM (`meta.tram`): Saint-Job, Churchill, Brugmann/Wolvendael,
    Alsemberg/Brugmann/Stalle, Alsemberg/Vanderkindere, Waterloo/Churchill.
  - We run tram 92 only (`data/transit/stib-92.json`).
- **Metro**: Uccle has no metro or premetro station. UrbIS Land cover has no MS/MT polygons with Uccle's commune code
  (2026-11-04 study table). *Guess, to check*: the nearest premetro is the Albert station area (Forest / Saint-Gilles),
  just north of our study box. Metro belongs with the Brussels extension, as the earlier study said.
- **Road bridges** (OSM `bridge=yes`, inside our tiles):

  | Bridge | Tile | x, z |
  |---|---|---|
  | Avenue Jean et Pierre Carsoel, next to Saint-Job | H6 | 901, 526 |
  | Chaussée de Waterloo | J5 | 1731, 317 |
  | Avenue des Tilleuls (×2) | D9 | −1142, 2057 / −1002, 2140 |
  | Rue du Bourdon | D9 | −1204, 2222 |
  | Rue du Merlo | C4 | −1666, −90 |
  | Rue de Verrewinkel | F7 | −268, 1308 |
  | Avenue de la Chênaie | G7 | 37, 1022 |
  | Avenue des Hospices | E10 | −751, 2774 |

  Land cover marks them at LVL +1 (32 polygons skipped on our tiles). UrbIS StreetAxes has 18 axes at LVL +1.
- **Road underpasses** (OSM `tunnel=yes`, `layer=−1`):

  | Underpass | Tile | x, z |
  |---|---|---|
  | Rue des Bigarreaux | D8 | −1106, 1638 |
  | Brouwerijstraat | D9 | −1474, 2403 (just over the border) |
  | Kleindalstraat | E10 | −661, 2868 |
  | Avenue des Biches | E9 | −525, 2307 (no layer tag) |

  Plus 10 service-road tunnels and the rail tunnels (OSM `railway=rail` + `tunnel`: 33 ways).
- **Ramps**: UrbIS `A`/`AC` = 0 polygons in Uccle (2026-11-04 study) and 4 axes in the sheets. The bridge approaches
  are the ramps that matter here.

### 3.6 Belgian marking rules (for the derived fallback)

From the arrêté ministériel of 11 October 1976 on road markings, art. 14-19, consolidated on Wallex. *Guess*: the
Brussels text is the same federal text. The 2-4 m crossing setback is *our assumption*, from the CityEngine default,
not a legal value.

| Marking | Rule |
|---|---|
| Stop line | ≈ 0.50 m wide, only across the lanes that must stop, placed so the stopped driver does not stand on the crossing or cycle crossing; ≥ 5 m before overhead lights. With a crossing: 1-3 m upstream of its outer edge (*assumption*) |
| Give-way line | Triangles ≈ 0.70 m tall, 0.50 m base, ≈ 0.70 m apart |
| Zebra | Bands parallel to the road axis, ≈ 0.50 m wide with ≈ 0.50 m gaps, at least 3 m long (that is, the crossing is ≥ 3 m wide); across one arm, square to it unless the survey shows a skew |
| Cycle crossing | Two dashed lines of ≈ 0.50 m squares |
| Longitudinal lines | 0.15 m (0.20 m on motorways); dashes ≈ 2.5 m with ≈ 10 m gaps; approach dashes ≈ 1 m with 1.5 m gaps |
| Cycle lane lines | 0.15 m; 1.25 m dashes with 1.25 m gaps |
| Hatching (islands) | ≈ 0.40 m at 45°, 0.60 m apart |
| Parking bay lines | ≈ 0.10 m |
| Selection arrows | ≈ 5 m long at ≤ 70 km/h; last one ≤ 10 m before the junction |
| Priorité de droite junctions | **No marking at all** (the Belgian default) |

---------------------------------------------------------------------------------------------------

## 4. Recommended architecture: Road System v2

### 4.1 Principles

1. **One street model, everything derived.** Surface, kerbs, paint, traffic lanes, hold points, signals, minimap,
   street-name signs, parked-car slots, lamps and levels are all read from the same model. Nothing downstream may move
   a lane or a line on its own (no more `fitToSurface`).
2. **The survey decides.** For each attribute, take the first available source in this order:
   1. UrbIS Land cover or Topo (measured);
   2. Brussels Mobility inventory (measured, regional roads);
   3. OSM (tagged);
   4. a rule that follows logically from tagged facts (for example, an OSM `cycleway=lane` implies its 0.15 m line);
   5. **nothing**.

   Every element carries its `source` and its `sourceId`, so the checker and the lab can show where it came from.
3. **No evidence, no paint.** The engine's current defaults are removed:
   - centre lines on all streets;
   - bike lanes on collectors;
   - parking on locals;
   - a crosswalk on every arm;
   - stop lines from road rank.
4. **Build once, globally, then cut.** The model is built for all of Uccle in the pipeline (Node + Python), not per tile
   with a 150 m buffer. Tiles receive cut pieces with global ids, so the same road is identical on both sides of a
   seam. The tile worker only meshes.
5. **OpenDRIVE concepts, our own format.** We adopt the OpenDRIVE 1.8 data model:
   - road = reference line + lanes with width(s);
   - junction = boundary + connecting lanes;
   - stop lines as signals with lane validity;
   - crossings as objects;
   - road marks per lane boundary.

   We store it as compact JSON / typed arrays per tile, not XML. A `.xodr` export can come later, for checking it in
   third-party viewers such as esmini or odrviewer.

### 4.2 The model (per Uccle, then cut per tile)

```
Road        id, name, hierarchy (UrbIS A1..A5), level, osm ids, urbis axis ids
            refLine: polyline + heading/curvature samples (every 1-2 m), station s
            carriage: left(s), right(s) kerb offsets (measured, smoothed), surface type(s)
            laneSections: [{ s0, s1, lanes: [{ id (OpenDRIVE sign: +left / -right), type (driving, bike, bus, parking,
                            tram, shoulder), dir, width(s) samples or cubic, source }] }]
            roadMarks: per lane boundary [{ s0, s1, kind (none, solid, dashed, double, bike, parking...), width,
                            colour, source, sourceId }]
            objects: speed bumps (BR12L), parking bays, islands; profile: z(s) from the DTM / H; structures:
                            [{ kind: bridge | tunnel | ramp, s0, s1, level, deck / clearance }]
Junction    id, polygon (measured I/IC union, cleaned), centroid, level, control (signal | stop | yield | priority | ring)
            arms: ordered CCW [{ roadId, end, joint: segment across the carriageway (square to the road),
                            jointS, approachLanes, exitLanes }]
            connectors: [{ fromArm, fromLane, toArm, toLane, turn, polyline, conflicts[] }]   (laneLinks)
            elevationGrid (OpenDRIVE 1.8 §12.11 idea): 2-4 m z grid from the DTM over the polygon
Crossing    id, armRef (junction arm) OR roadRef + s (mid-block), polygon, width, stripe pattern (zebra | cycle |
            unmarked), signalised, source (topo CR2301L | bm crossing | osm node/way | rule), pedestrian lane line
StopLine    id, roadRef + s (on one arm), lane validity [from, to], kind (stop | signal | give-way), controller ref,
            source (topo CR2302L/CR2303L | rule from OSM control)
Controller  signal groups and phases (OSM traffic_signals + Topo CR3106P heads), stop / give-way signs (OSM + BM
            traffic_signs), priority rules (Belgian default)
Structure   bridge decks / tunnel boxes / portals from Land cover Bridges/Tunnels + LVL ±1 surfaces + StreetAxes LVL
```

Topology source: **UrbIS StreetAxes + StreetNodes**. They are already in `data/raw/urbis/transport`. They are surveyed
together with the Land cover surfaces (Paradigm), their TYPE (S/I/IC/SC/C/A/B) matches the surface types, and they carry
`LVL`, `SLOPE` and street names.

OSM supplies the attributes the survey does not have: lanes, oneway, turn lanes, cycleway, maxspeed, signals and
crossings. They are attached to the axes by geometric match plus the street name, as in the 2026-11-04 study §5 step 2.

Roads UrbIS does not map (private lanes, Flemish side) fall back to OSM geometry with the engine's rules and are
flagged `source: osm`.

### 4.3 How a junction is built (pipeline)

1. **Cluster.**
   - Each measured `I`/`IC` polygon (merged where they touch) is one junction.
   - Every OSM node and StreetNode inside it belongs to that junction. This replaces the midpoint merges of
     `refine_roads.mjs`: a staggered junction is either one polygon or two, and the survey decides which.
   - Roundabouts: the ring is built from `M` (the island) plus the S/I ring polygons.
2. **Arms and joints.**
   - Every road entering the polygon is an arm.
   - Its **joint** is where the road's measured S polygon meets the junction polygon. *Assumption to verify*: Land
     cover S and I polygons share edges in a planar partition, so the joint is a shared edge, made square to the road
     axis.
   - Arms are ordered counter-clockwise, as in OpenDRIVE's boundary: kerb arcs come from the measured polygon (lane
     segments) and the joints are the joint segments.
3. **Crossings.**
   - Measured crossings are assigned to the arm whose road they cross: they intersect that road's carriageway, and
     their long axis is within 30° of perpendicular to it. Mid-block crossings get `roadRef + s`.
   - Where OSM has a marked crossing node or way on an arm but no geometry exists, the crossing is derived:
     - at the OSM position, or just outside the joint (≥ 0.5 m);
     - band ≥ 3 m wide (`crossing:width` if tagged);
     - kerb to kerb of the measured carriageway;
     - stripes 0.5 / 0.5 m, parallel to the road axis.
   - Otherwise there is **no crossing**.
4. **Stop and give-way lines.**
   - Measured (`CR2302L` / `CR2303L`) where present.
   - Otherwise derived only where a controller exists: an OSM signal, an OSM stop or give-way on that approach, a BM
     sign, a ring entry.
   - Placement: 1-3 m before the crossing's outer edge (or before the joint when there is no crossing), ≥ 5 m before
     an overhead light, square to the lanes, **across the approach lanes only**.
   - Priorité de droite: no line.
5. **Connectors.**
   - From each approach lane to each allowed exit lane: `turn:lanes` where tagged, rules elsewhere (the vendor
     `junctionConnectors` logic can be reused as a library), oneway and tram-only lanes respected.
   - Geometry: a G1 curve (cubic or clothoid pair) from the stop line to the exit joint. It must stay inside the
     polygon minus 0.5 m from the kerbs; the checker enforces it.
   - The conflict table (from `trafficGraph.js` on `claude/traffic`) moves here.
6. **Surface and height.** The surface stays the measured polygon (today's `surfaces.js`). Height comes from the
   junction elevation grid, so arms, crossings and connectors share one z.

### 4.4 How roads between junctions are built

1. **Reference line.**
   - Start from the UrbIS axis (or OSM where unmapped).
   - Resample at 1 m and re-centre on the measured carriageway: cast perpendiculars to the kerbs at each sample, take
     the midpoint, then smooth with a median filter followed by a Savitzky-Golay filter.
   - Do not turn vertices into PIs with type radii, and **never delete points**. The measured line is already the
     curve. The `roadAlignment.js` clothoid fit can be used only to *smooth*, with a bounded deviation of ≤ 0.3 m from
     the measured line.
2. **Kerb offsets** `left(s)`, `right(s)` from the same perpendiculars (the earlier study §5 step 3), clamped at bulb-outs
   and mouths. Width varies along s; no single median per road.
3. **Lanes inside the carriageway.**
   - Lane count, direction and type come from OSM, then BM `brr_segments_lanes`, then the hierarchy default (1 + 1).
   - Parking only where OSM tags it or a `K` polygon exists, or where there is room for it (`w(s)` − lanes > 2 m on a
     side, flagged `rule`).
   - Lane widths are shares of `w(s)`.
   - The centre divider sits in the measured middle unless a measured centre line exists.
4. **Road marks per boundary.**
   - Measured Topo / BM lines are snapped to the nearest lane boundary (≤ 0.5 m) and keep their s-range and kind.
   - Rule-derived marks are allowed only for tagged facts: a cycle lane line, a bus lane line, the parking edge where
     OSM tags parking lanes.
   - Centre and edge lines: measured, BM, or **none** (residential default). A per-hierarchy option, off by default,
     can be enabled after the orthophoto sampling of Phase 5.
5. **Curvature safety.** Lane strips are generated by offsetting the reference line. Where `1 + κ·t` would fall below
   0.2, the offset uses the measured kerb line instead (the kerb is the truth). A fold is therefore impossible by
   construction, and the checker asserts it.

### 4.5 How paint is drawn

- **One decal mesh per tile** for all markings: lane marks, crossings, stop lines, arrows, hatching.
  - Thin quads following the measured surface height `H` + 3 mm, with a dedicated "paint" depth bias that differs
    from the road materials' −2/−2.
  - One material and one draw.
  - Edges anti-aliased from a lateral UV distance (no texture), with a small dash/wear noise.
  - Belgian white everywhere; yellow only where a source says yellow.
- This replaces the second engine asphalt and the per-tile signed-distance atlas. Today the atlas is
  3,228 × 3,552 RG8 in I6; the worker halves it to R8, about 2.9 MB GPU per tile (`viewer/tileData.js:161`).
  *Guess*: a decal mesh is about 2-10k triangles and < 0.5 MB per tile.
- Far LOD: bake the marks into the far-tile ortho or terrain texture (zero draws), as `docs/ROADS_RESEARCH.md` §3
  idea 5 said.

### 4.6 What else is derived from the model

| Consumer | From the model |
|---|---|
| Traffic (`claude/traffic`) | Lanes and connectors as-is (no snap). Hold points = StopLine objects (or the joint for priority junctions). Signal phases from Controllers. Conflicts precomputed in the pipeline |
| Signals and signs (furniture) | Controller heads at their Topo `CR3106P` / OSM positions, turned to their approach arm; stop and give-way signs at their stop lines |
| Parked cars, parking slots | Parking lanes and bays (`K`, OSM) instead of `streetFit.js` kerb snapping |
| Pedestrians (later) | Sidewalk polygons + crossing lanes + walking areas at corners (SUMO / Lanelet2 idea) |
| Minimap / full map | Road polygons, junction polygons, names, hierarchy (the SLOP_NEWYORK audit's minimap idea) |
| Street-name signs and HUD | Road names at junction arms (real names from UrbIS FR/NL) |
| Drive mode, character colliders | Kerb lines, raised areas (already measured) |
| Levels | Structures (section 4.7) |

### 4.7 Levels: bridges, tunnels, ramps, metro

- **Bridges.**
  - Deck = the LVL +1 surfaces (today skipped) + the UrbIS axis profile (`SLOPE`) + the DTM at the abutments.
  - Parapets along the outline (Topo `BR0301L`), abutments `BR0302L`.
  - The ground or rail below stays the DTM (the trains branch already models rail bridges).
  - Uccle's road bridges are short single spans over the L124 / L26 railways: Carsoel, Waterloo, Tilleuls, Bourdon,
    Merlo, Verrewinkel, Chênaie, Hospices.
- **Underpasses.**
  - Rue des Bigarreaux, Kleindal, Brouwerij, Avenue des Biches: OSM `tunnel` + `layer −1`.
  - The road profile dips to clearance (4.5 m + 1 m deck) under the rail embankment.
  - Retaining walls, a portal headwall and a short box interior, built only near the camera.
- **Ramps** are the bridge approaches: the profile from the model, kerbs and walls along them.
- **Metro**: none in Uccle. It comes with the Brussels extension, using the 2026-11-04 plan (§6.3).

All of this is pipeline output, like the buildings: no runtime CSG.

### 4.8 Streaming and performance budget

| Item | Today (measured in Node, I6 / E4, cold single thread) | v2 target |
|---|---|---|
| Worker road build per tile | `prepareSurfaces` 190 / 137 ms, `fitRoadWidths` 3, `buildRoadNetwork` 197 / 168, `buildLaneRoadMesh` + atlas 221 / 212, `buildSurfaceRoads` 611 / 802 → ~1.2 s | ≤ 400 ms: no network build in the worker; only surface + kerb + decal meshing from the precomputed model |
| Road triangles per tile | 67.7k / 99.3k (surface parts) | same surface; − the duplicated engine asphalt; + ≤ 10k decal triangles |
| Marking memory per tile | atlas ~2.9 MB (R8 half resolution) | decal mesh < 0.5 MB (*guess*) |
| Draws per tile | asphalt, concrete, grass, square, pits | + 1 decal draw, − nothing (paint moves out of the asphalt shader) |
| GPU | — | ≤ +0.1 ms at street level for the decal layer (to measure, `viewer.gpuStats()`) |
| Pipeline (offline, all Uccle) | refine ~minutes | street model build ≤ 10 min for 120 tiles |

---------------------------------------------------------------------------------------------------

## 5. The Road Checker (spec)

A Node tool (`tools/check_streets.mjs`) that runs on the model and on the tile worker's actual output (the meshes, so
it also catches renderer mistakes). It writes a JSON report per tile and an overlay the Road Lab can show. It runs on
all 120 tiles as a build check, and in CI later (`docs/TODO.md:323`). It should also run **today, on v1**, to give
the "before" numbers.

| # | Check | Pass rule |
|---|---|---|
| C1 | **Zebra on one arm** | Every crossing is assigned to exactly one arm or one road station. Its band lies between that arm's joint and joint + 15 m (junction crossings), or wholly on the road (mid-block). Its centre is not inside the junction core (the convex hull of the connector conflict points) |
| C2 | **Zebra square and full** | Stripes parallel to the road axis within 5°; the band perpendicular to the axis within 10° (unless measured); the band reaches each kerb of the measured carriageway within 0.3 m; stripes 0.5 / 0.5 m; band ≥ 3 m; where a measured crossing exists, centre within 1.0 m and angle within 5° |
| C3 | **Stop line before the junction** | Upstream of the crossing's outer edge by 1-3 m (or of the joint); not inside the junction polygon core; perpendicular to its lanes within 10°; spans the approach lanes only (± 0.2 m); ≥ 5 m before an overhead signal head; one per approach; has a controller. A guessed controller is an error |
| C4 | **Paint on the carriageway** | Every marking polygon lies inside the measured carriageway classes (roadway, tram road, parking, junction) shrunk by 0.10 m; no paint on sidewalk, median, square or raised classes; no paint polygon crosses a kerb line |
| C5 | **Paint = lanes** | Every lane-boundary mark lies on a model lane boundary (≤ 0.10 m); every model boundary with `kind ≠ none` has paint; centre and edge marks only with a measured or BM source unless the hierarchy option is on |
| C6 | **Lanes on the street** | 100 % of lane centreline points inside the carriageway (0.5 m tolerance); every lane ≥ its minimum width; connectors inside the junction polygon − 0.5 m |
| C7 | **Traffic = model** | The traffic graph is exactly the model's lanes and connectors (same ids, max point distance 0); hold points = stop lines (≤ 0.3 m); signal heads drawn = controllers used |
| C8 | **Curve continuity** | Reference line and lane edges G1: heading change < 3° per 1 m step except at joints; no fold (`1 + κ·t ≥ 0.2` for every lane edge); reference line ≤ 0.5 m from the measured carriageway mid-line; no straight chord across a measured curve (max deviation of the drawn carriageway edge from the measured kerb ≤ 0.3 m) |
| C9 | **No coplanar overlaps** | No two triangles of the same layer overlap in plan by > 1 cm² within 2 mm in height; layers (base, paint, kerb band) separated by ≥ the separation that holds at 500 m with reversed-z (computed, not guessed); plus the hero-audit flicker test (consecutive frames at 5, 20, 80, 250 m) on the lab junctions |
| C10 | **Tile seams** | A road present in two tiles has identical model data (hash); meshes meet with no gap or overlap > 1 cm |
| C11 | **Levels** | No LVL ±1 surface drawn at ground level; bridge clearance ≥ 4.5 m over roads; tunnels below the DTM; ramp grade ≤ 12 % |
| C12 | **Orthophoto agreement** (soft) | Zebra: stripe-period score across the band above a threshold, else "review"; stop line and lane lines: brightness contrast along the mark; report, never fail the build |
| C13 | **Inventory** | Per tile: counts by source (measured / BM / OSM / rule / none) for crossings, stop lines, lane marks; the rule share must go down, never silently up |

Each failure carries a position, the element id, its source and a one-line reason. The Road Lab lists the failures and
flies to them.

---------------------------------------------------------------------------------------------------

## 6. The 2026-11-04 study: what it got right and wrong

| It said | Verdict |
|---|---|
| Surface first, semantics second; UrbIS Land cover as the shape | **Right**: buildings in road 1,121 → 45 |
| Do not adopt osm2streets; keep our own engine | **Right** for geometry. But "keep our engine" became "keep the engine's junction model and paint", which is the cause of today's bugs. v2 keeps the engine as a *library* (clothoids, profiles, connector rules), not as the model |
| "The engine still produces lane graph, stop lines, crosswalk positions (or takes them from Topo)" (§5 step 5) | **Wrong emphasis**: crossings are the best-surveyed marking we have (UrbIS + BM + OSM). They should have been the truth from day one |
| "Lane lines are sparse in Uccle, so the engine must keep deriving lane paint" (§4.2) | **Probably wrong**: sparse because there are none on most streets (to verify on the ortho). Deriving them by default paints lines that do not exist |
| Measure `w(s)` every 2-5 m, fit piecewise | **Right**, but only a per-road median was built |
| "Two outputs from one source" (CARLA) | **Right idea, not achieved**: we have three disagreeing outputs (measured surface, engine paint, snapped traffic) |
| Junction pads from `I`/`IC` | **Half right**: the I polygon also contains the crossings, so it is not the arm mouth; joints must come from the S/I boundary and the crossings |
| Markings as a decal mesh, depth-biased | **Right**, not done (paint stayed in the asphalt shader on a second asphalt) |
| Bridges first, then tunnel portals; metro with Brussels | **Right**, still to do; the bridge list is now concrete (section 3.5) |
| Not covered | `refine_roads.mjs` (1,021 PI drops = the broken curves), tile-buffer consistency (most roads not fitted), the traffic snap, the default bike/parking/centre-line stacks, OSM crossing nodes |

---------------------------------------------------------------------------------------------------

## 7. Road Lab (spec)

`labs/road-lab.html` (our own `viewer/panelUI.js`, never lil-gui; one Chrome tab). The vendored
`vendor/roads/road-lab.html` is an editor for synthetic networks; this lab is for real junctions.

**Views**
- Plan view: orthophoto underneath (25 cm), with layers toggled per source:
  - measured surfaces by class;
  - Topo marking lines;
  - BM crossings and inventory;
  - OSM ways, nodes, crossings;
  - model lanes, connectors, joints, crossings, stop lines, controllers;
  - live traffic cars.
- 3D street view (walk and drive cameras) and a scripted moving camera for flicker and LOD checks (frame strips, per
  the smooth-LOD rule).
- Side-by-side or A/B toggle: v1 (today) vs v2.

**Panels**
- Checker results for the scene (C1-C13), click to fly there.
- Inspector: click any element to see its id, source, sourceId and parameters.
- GPU ms (`viewer.gpuStats()`), draw calls, triangle counts.

**Scenes: 10 real Uccle junctions** (local coordinates from `data/roads/network.json`):

| # | Junction | Tile, x, z | Why |
|---|---|---|---|
| 1 | **Place de Saint-Job** (Ch. de Saint-Job / Av. J. et P. Carsoel / Av. du Prince de Ligne / Place de Saint-Job) | I6, 1086, 519 | 5 arms, OSM signals, tram 92, the raised square, a node merged by refine; the Traffic Lab's own junction, *probably* the owner's screenshot |
| 2 | **Av. J. et P. Carsoel railway bridge** | H6, 901, 526 | Road bridge (LVL +1) right next to Saint-Job, with tram; deck, parapets, approach ramps |
| 3 | **Rond-point Churchill** (Av. Winston Churchill / Montjoie / Léo Errera / Messidor / Mac Arthur / Marianne / Marie Depage) | G2, 313, −1434 | 8-arm roundabout, tram through the ring, cycle lanes on Churchill |
| 4 | **Square Georges Marlow** (Av. Brugmann / Av. Wolvendael / Rue du Postillon) | E4, −641, −313 | Roundabout with trams and one-way arms; hand overrides already there (`pipeline/overrides.json`); BM inventory present |
| 5 | **Ch. d'Alsemberg / Av. Brugmann / Rue de Stalle** | E4, −919, −142 | The TODO's "sharp Y" bad spot, signals, trams on several arms, shared cycle lanes, BM inventory, measured stop lines |
| 6 | **Ch. d'Alsemberg / Rue Vanderkindere / Av. Coghen / Av. des Sept Bonniers / Av. O. Van Goidtsnoven** | E1, −746, −1616 | 6-arm signalised junction, tram, a one-way arm: the complex multi-arm case |
| 7 | **Ch. de Waterloo / Av. Winston Churchill / Av. de la Lisière** | I2, 1326, −1453 | Wide avenue with a central tram site, painted cycle lanes (OSM `cycleway:right=lane`), signals |
| 8 | **Av. du Fort-Jaco / Av. du Feuillage** | J7, 1941, 1101 | Plain residential priorité-de-droite junction: the right answer is *no paint*. Tests "no evidence, no paint" |
| 9 | **Rue des Bigarreaux underpass** | D8, −1106, 1638 | Road under the railway (OSM tunnel, layer −1): dip, portals, walls |
| 10 | **Ch. de Waterloo railway bridge** | J5, 1731, 317 | Main-road bridge with approach ramps (Rue du Bourdon / Av. des Tilleuls bridges, D9, as alternates) |

Optional extras: Ch. d'Alsemberg / Dieweg (D6, −1181, 822; 5 arms, signals, tram) and Ch. de Saint-Job roundabout
(E6, −673, 995). Each scene needs the orthophoto and a short "what the photo shows" note (crossings per arm, stop
lines, centre line yes/no) written by a human from the CC0 orthophoto (and Street View for a look only, per the TODO
rule).

---------------------------------------------------------------------------------------------------

## 8. Phased plan

| Phase | Work | Effort | Output the owner can judge |
|---|---|---|---|
| **0. Measure** | Fetch Topo `marking_line` / `marking_point`, BM crossing polygons and BM inventory per tile into `data/raw` (`sources.json`, cached WFS like `topo_roadline`). Road Checker v0 (C1-C9, C12-C13) on today's output for all 120 tiles. Road Lab skeleton with the 10 scenes, ortho underneath, source layers | M | Before numbers per tile and per junction; the lab showing v1's errors on real photos |
| **1. Stop inventing** (our code only; vendor untouched) | In `pipeline/build_roads.py`: no default centre line on `local`/`alley`, no default bike lanes, `shared_lane` stays in the traffic lane (symbols only), no default parking unless room is measured. In the tile worker, before `buildLaneRoadMesh`: replace `node.markings` crosswalks and stop lines with measured ones (Topo / BM / OSM crossing nodes) placed in the arm frame from the measured crossing; drop guessed stop / yield lines (keep OSM-controlled ones). *To verify*: the vendor atlas only covers node regions, so mid-block crossings may need their own small decal mesh already here. Stop `refine_roads.mjs` from dropping PIs (fix tight bends by width, or leave them flagged) | S-M | Saint-Job and Brugmann zebras where the photo has them; no centre dashes on residential streets; checker C1-C5 numbers drop |
| **2. Street model v2** (pipeline) | Topology from UrbIS StreetAxes / Nodes + OSM attributes; reference lines re-centred on the measured carriageway; `left(s)`/`right(s)`; lane sections; junctions from I/IC polygons, arms, joints; crossings, stop lines, controllers; connectors + conflicts; global build, cut per tile with global ids; checker C1-C11 on the model | L | Model overlay in the lab for the 10 junctions: lanes, joints, crossings and stop lines on the photo |
| **3. Derive everything** | Marking decal mesh per tile; surfaces unchanged; traffic graph = model (delete `fitToSurface`, hold points = stop lines); signals and signs from controllers; parking slots; minimap layer; street-name data. Retire the second engine asphalt and the atlas | M | Paint, traffic paths and stop positions agree in the Traffic Lab; GPU A/B; moving frame strips with no flicker |
| **4. Levels** | Bridges (Carsoel, Waterloo, Tilleuls, Bourdon, Merlo, Verrewinkel, Chênaie, Hospices), underpasses (Bigarreaux, Kleindal, Brouwerij, Biches), ramps; tram bridges (UrbIS Railways TW LVL +1); coordinate with the trains branch's rail bridges | M-L | Lab scenes 2, 9, 10; then the city |
| **5. Verify and roll out** | Orthophoto checks (C12) on all tiles; sample 50-100 streets for centre lines to set the per-hierarchy default; ask Brussels Mobility for the `mark_type` legend (and whether `brr_segments_lanes.average_width` is filled); speed bumps (`BR12L`), manholes and drains (`CR61*P`, `CR62*P`); wear along lane paths (BeamNG idea); all 120 tiles; checker in CI | M | City flight; checker report for all of Uccle |

**What to keep from today's code**
- Keep:
  - `pipeline/build_surfaces.py` and `viewer/surfaces.js` (prepareSurfaces, the height field, kerbs, sidewalks,
    dropped kerbs, pits, the class raster). This is the strong part.
  - `viewer/cobbles.js`, `viewer/plazas.js`, `viewer/roadPaint.js` materials (minus the paint part, later).
  - `viewer/streetFit.js` until parking comes from the model.
  - `viewer/track.js` (smooth tram lines).
  - The whole traffic sim and fleet from `claude/traffic`.
- Keep as a library:
  - `vendor/roads` math: `roadAlignment.js` clothoids for smoothing, `roadProfile.js`, `roadSurface.js` plane
    fitting, the `junctionConnectors` / `roundaboutConnectors` rules, the `roadMarkings.js` boundary rules for the
    "tagged fact" cases.
  - The `trafficGraph.js` conflict logic (moved to the pipeline).
- Retire:
  - The engine's junction mouths, crossings and stop lines as truth.
  - The second asphalt layer and its atlas.
  - `refine_roads.mjs` geometry edits (PI drops, midpoint merges).
  - Per-tile network builds with a 150 m buffer.
  - The traffic snap.
- `vendor/` stays read-only. Anything new lives in `pipeline/` and `viewer/` (or a new `viewer/streets/`).

---------------------------------------------------------------------------------------------------

## 9. Open questions for the owner

1. Residential centre lines: accept "none unless measured" as the default? (My recommendation: yes, after the
   orthophoto sample.)
2. Roads UrbIS does not map (Flemish side, private lanes): keep today's engine look there, or drop paint entirely?
3. Write to Brussels Mobility for the marking inventory legend (`mark_type`) and the licence per layer (CC0 vs CC-BY)?
4. Optional `.xodr` export of the model (to check it in esmini or another viewer), or not needed?

---------------------------------------------------------------------------------------------------

## Sources

**Our code** (file:line as cited above):
- `vendor/roads/roadNetwork.js`, `roadJunction.js`, `roadAlignment.js`, `roadMarkings.js`, `roadCrossSection.js`,
  `mesh/laneRoadMesh.js`
- `viewer/surfaces.js`, `viewer/tileData.js`, `viewer/roadPaint.js`, `viewer/cobbles.js`
- `pipeline/build_roads.py`, `pipeline/refine_roads.mjs`, `pipeline/build_surfaces.py`, `pipeline/build_roofcolors.py`
- `tools/check_roads.mjs`
- Branch `claude/traffic`: `viewer/traffic/trafficGraph.js`, `docs/TRAFFIC.md`
- `data/roads/network.json` (`meta.refine`)

**Brussels data**:
- UrbIS Topo spec: https://urbisdownload.datastore.brussels/UrbIS/TechSpec/Topo_TechSpec_FR20230428.pdf
- UrbIS Land cover spec: https://urbisdownload.datastore.brussels/UrbIS/TechSpec/LandCover_TechSpec_FR20240401.pdf
- Brussels Mobility WFS: https://data-mobility.irisnet.be/geoserver/ows?service=WFS&request=GetCapabilities&version=2.0.0
  (layers used: `bm_urbis_topo:marking_line`, `bm_urbis_topo:marking_point`, `bm_equipment:marking_line`,
  `bm_equipment:marking_polygon`, `bm_pedestrian:pedestrian_crossing_surfaces_2d`)
- UrbIS orthophoto WMS: https://geoservices-grid.irisnet.be/geoserver/urbisgrid/wms (layer `Ortho2024NS`)
- UrbIS Transport networks: https://datastore.brussels/web/data/dataset/af847c40-848b-11ee-9a1f-00090ffe0001
- Belgian marking regulation (AM 11/10/1976, consolidated): https://wallex.wallonie.be/eli/arrete/1976/10/11/1976101105;
  Code de la route art. 76: https://www.police.be/shape/fr/node/13176
- OSM crossings: https://wiki.openstreetmap.org/wiki/Crossings,
  https://wiki.openstreetmap.org/wiki/Proposal:Deprecate_crossing%3Dzebra_in_favor_of_crossing:markings,
  https://wiki.openstreetmap.org/wiki/Tag:crossing=marked

**Unreal**:
- City Sample: https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration?lang=en-US
- Houdini quick start: https://dev.epicgames.com/documentation/unreal-engine/city-sample-quick-start-for-generating-a-city-and-freeway-using-houdini
- ZoneGraph API: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ZoneGraph/UZoneShapeComponent,
  https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ZoneGraph/FZoneLaneProfile,
  https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ZoneGraph/FZoneShapeConnector?lang=en-US
- ZoneGraph forum example: https://forums.unrealengine.com/t/zonegraph-laneprofile-zoneshape/2679268
- PCGEx ZoneGraph: https://pcgex.gitbook.io/pcgex/zone-graph/working-with-zonegraph
- PCG spline intersection: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/PCG/UPCGSplineIntersectionSettings
- Unreal Drive intersection tool: https://unrealdrive.readthedocs.io/en/latest/create-tools/IntersectionTool.html
- UE 5.7 PCG spline mesh slowdown: https://forums.unrealengine.com/t/spawn-time-using-spawnsplinemesh-node-in-pcg-runs-much-slower-in-5-7-compared-to-5-5/2703378

**Houdini and games**:
- SideFX OSM city building: https://sidefx.com/tutorials/city-building-with-osm-data
- The Matrix Awakens talk: https://www.sidefx.com/learn/talks/the-matrix-awakens-generating-a-world/
- Complex Roads talk: https://www.sidefx.com/learn/talks/complex-roads/
- Spider-Man GDC 2019: https://gdcvault.com/play/1026496; SIGGRAPH abstract: https://history.siggraph.org/?p=82780
- Community junction tool: https://zolord.artstation.com/projects/3qZYPm

**RoadRunner and OpenDRIVE**:
- RoadRunner junctions: https://au.mathworks.com/solutions/automated-driving/roadrunner-tutorial/creating-junctions.html
- RoadRunner simple scene: https://www.mathworks.com/help/roadrunner/ug/create-simple-roadrunner-scene.html,
  https://ch.mathworks.com/help/roadrunner/ug/create-simple-roadrunner-scene.html
- RoadRunner HD map CurveMarking: https://www.mathworks.com/help/driving/ref/roadrunner.hdmap.curvemarking.html
- OpenDRIVE 1.8 junction boundary: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/v1.8.1/specification/12_junctions/12_10_junction_boundary.html
- Elevation grid: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/1.8.0/specification/12_junctions/12_11_junction_elevation_grid.html
- Direct junctions: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/1.8.0/specification/12_junctions/12_06_direct_junctions.html
- Crossings: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/v1.8.1/specification/12_junctions/12_08_crossings.html
- Road markings: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/1.8.0/specification/11_lanes/11_08_road_markings.html
- Object markings: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/1.8.0/specification/13_objects/13_08_object_marking.html
- Signal references and lane validity: https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/1.8.0/specification/14_signals/14_04_signal_reference.html,
  https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/1.8.0/specification/14_signals/14_02_lane_validity_signals.html

**CityEngine**:
- Intersection parameters: https://doc.arcgis.com/en/cityengine/2025.0/help/help-intersection-parameters.htm
- Street and crossing shapes: https://doc.arcgis.com/en/cityengine/latest/help/help-street-and-crossing-shapes.htm
- Shape UVs: https://doc.arcgis.com/en/cityengine/2026.0/help/help-street-intersection-shape-uv.htm
- Complete Streets forum threads: https://community.esri.com/t5/arcgis-cityengine-questions/esri-complete-street-rule-discussion-feedback/m-p/268299,
  https://community.esri.com/t5/arcgis-cityengine-questions/trouble-with-complete-streets-rules-and-nodes/m-p/1694039

**Unity and Godot**:
- EasyRoads3D manual (mirror): https://nlp.fi.muni.cz/aiproject/ui/hutta_peter2019/pa026-project/Assets/EasyRoads3D/html/intersections.html
- EasyRoads3D HD add-on: https://assetstore.unity.com/packages/2d/textures-materials/roads/easyroads3d-pro-add-on-hd-roads-118774
- CiDy 2: https://marketplace.unity.com/packages/tools/level-design/cidy-2-55298
- Gley traffic system: https://gley.gitbook.io/mobile-traffic-system/external-tools/cidy
- Road Architect fork: https://github.com/embeddedt/RoadArchitect
- Godot Road Generator: https://github.com/TheDuckCow/godot-road-generator, https://godotengine.org/asset-library/asset/3379,
  https://80.lv/articles/godot-road-generator-now-features-better-procedural-intersections

**Cities: Skylines**:
- TM:PE wiki: https://github.com/CitiesSkylinesMods/TMPE/wiki/Nodes,-Segments,-Lanes
- Intersection Marking Tool: https://steamcommunity.com/sharedfiles/filedetails/changelog/2140418403?p=10
- CS2 modding guide: https://ps1ke.github.io/Cities-Skylines-2-Modding-Guide/Game/Prefabs/NetCrosswalkData,
  https://ps1ke.github.io/Cities-Skylines-2-Modding-Guide/Game/Net/PedestrianLaneFlags
- CS2 patch notes: https://www.paradoxinteractive.com/games/cities-skylines-ii/news/detailers-patch-2

**BeamNG**:
- Junction editing: https://documentation.beamng.com/world_editor/tools/road_architect/junction_editing
- OpenDRIVE compatibility: https://documentation.beamng.com/beamng_tech/roadarchitecteditor/opendrive_compatibility

**OSM to streets, and the web**:
- A/B Street map geometry: https://a-b-street.github.io/docs/tech/map/geometry/index.html
- osm2streets: https://github.com/a-b-street/osm2streets
- OSM2World: https://osm2world.org/screens
- Streets GL: https://github.com/strandedkitty/streets-gl, https://pasu.github.io/blog/2025/streets_gl
- Mapbox HD Roads: https://www.mapbox.com/blog/hd-roads-bring-lane-level-detail-to-mapbox-standard
- 3DStreet: https://cdn.jsdelivr.net/npm/3dstreet@0.4.15/README.md
- OpenTwinMap: https://arxiv.org/html/2511.21925v1
- osm-to-xodr: https://pypi.org/project/osm-to-xodr/0.2.1/
- TU Delft lane-level OSM thesis: https://3d.bk.tudelft.nl/ken/files/24_chengzhi.pdf

**SUMO, CARLA, Lanelet2**:
- SUMO netconvert: https://sumo.dlr.de/docs/netconvert.html
- Network building process: https://sumo.dlr.de/docs/Developer/Network_Building_Process.html
- PlainXML: https://sumo.dlr.de/docs/Networks/PlainXML.html
- Pedestrians: https://sumo.dlr.de/docs/Simulation/Pedestrians.html
- Junction shapes (mailing list): https://www.eclipse.org/lists/sumo-user/msg05529.html
- CARLA maps: https://carla.readthedocs.io/en/latest/core_map/
- CARLA object parser: https://carla.org/Doxygen/html/d9/df7/ObjectParser_8cpp_source.html
- Lanelet2 regulatory elements: https://fzi-forschungszentrum-informatik.github.io/Lanelet2/lanelet2_core/RegulatoryElementTagging
- Autoware crosswalk and stop line: https://docs.autoware.org/main/design/autoware-architecture-v1/components/map/map-requirements/vector-map-requirements-overview/category_crosswalk/,
  https://docs.autoware.org/main/design/autoware-architecture-v1/components/map/map-requirements/vector-map-requirements-overview/category_stop_line/

**Papers and datasets**:
- DLR SkyScapes: https://www.dlr.de/en/eoc/about-us/remote-sensing-technology-institute/photogrammetry-and-image-analysis/public-datasets/dlr-skyscapes,
  https://openaccess.thecvf.com/content_ICCV_2019/html/Azimi_SkyScapes__Fine-Grained_Semantic_Understanding_of_Aerial_Scenes_ICCV_2019_paper.html
- JunctionArt: https://saemobilus.sae.org/content/12-06-01-0007
- OSM procedural urban roads: https://ieeexplore.ieee.org/document/9887441
- HD road networks: https://arxiv.org/html/2509.02990v1
- Lane topology survey: https://arxiv.org/html/2504.01989v1

The 2026-11-04 study's sources (osm2streets, Streets GL, OSM2World, libOpenDRIVE, Houdini, EasyRoads3D, Road Architect,
CiDy, Godot, CesiumJS) are in `docs/ROADS_RESEARCH.md`.
