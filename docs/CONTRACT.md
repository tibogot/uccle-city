# uccle-city data contract — v0.7

### Changes

- **0.7 (2026-11-03)**: buildings get `roofColor` (real roof albedo from the 2024
  orthophoto, `build_roofcolors.py`) and, for churches / chapels / synagogues,
  `attrs._landmark` (from OSM, `tag_landmarks.py`). `buildings.json` gains
  `roofColorSource`. See 5.2.
- **0.6 (2026-11-03)**: `features.json` trees now come mostly from LiDAR (canopy
  height model = UrbIS DSM − DTM, `pipeline/build_trees.py`), with `height`,
  `crown`, `source` (`urbis-chm` | `osm`) and `osm` (matched OSM tree id);
  new top-level `treesSource`. See 5.4.
- **0.5 (2026-11-02)**, Session 2 part 3. Hand overrides (`pipeline/overrides.json`,
  5.1 "Overrides"); new refine actions `join-ring` (node `meta.joined`),
  `unsplit`, `drop-slip`; `dual.py` skips short island tips. `network.json`
  `meta.refine.overrides` lists the applied overrides. File layout unchanged.
- **0.4 (2026-11-02)**, Session 2 part 2. Dual carriageways are collapsed into one
  two-way road with a median (5.1 "Dual carriageways"): new road ids
  `r<wayA>d<wayB>_<k>`, carriageway remainders `r<wayId>r<q>_<k>`, `split`
  nodes, `meta.dual`. New refine actions for crowded roundabouts (node
  `radius`, parking removed from short arms, `ring.radius` grown up to 3 m with
  `meta.ringGrownM`). `roads.json` `meta.dual` lists the collapsed pairs.
- **0.3 (2026-11-02)**, Session 2 part 1. Roads are now built once for the whole area,
  cleaned with the road engine (`refine`), then cut into tiles (5.1 "Pipeline" and
  "Tiling"). New node fields from the clean-up: `radius`, `kind: "junction"`,
  `meta.merged`. `roads.json` `meta` gains `from` and `refineActions`. Some OSM
  pieces are dropped or merged, so a road id can be missing from the output.
  File layout and encodings are unchanged.
- **0.2 (2026-11-02)**, after building tile G4 from real data. No layout or encoding
  changed, so 0.1 readers still work. Clarified from what the real files are:
  source table (2.1); building ids, solids and the meaning of `base` (5.2); extra
  header keys `inputs` / `skipped` / `nodataCount` (5.2, 5.3); what the manifest
  `sources` hold (5.5); UrbIS licence is CC0 (6).
- **0.1 (2026-11-02)**, first version, written before any real data was downloaded.

This is the spec every session must follow. If code and this file disagree, fix
the code, or change this file on purpose and bump the version. Constants that
are fixed here are mirrored in `pipeline/common.py`. If you change one, change
both.

## 1. Study area

- WGS84 box: **lon 4.327 – 4.372, lat 50.7905 – 50.8075**. That runs from
  Uccle centre (Place Saint-Pierre / Globe area) south-east to Saint-Job.
- In Belgian Lambert 72 (EPSG:31370) the box is about E 147056–150229,
  N 164448–166340, so roughly 3.17 km × 1.89 km.

## 2. Coordinates

### 2.1 Source CRS

| Source | CRS |
|---|---|
| UrbIS 3D Constructions (SHP, MultiPolygon Z per building solid) | EPSG:31370 (`.prj` present). Heights in m TAW. |
| Digital terrain model, 2021 LiDAR, 0.5 m GeoTIFF per 1 km sheet | EPSG:31370 by its sheet grid and `.tfw`; the GeoTIFFs carry **no CRS tag**, so the pipeline assumes 31370. The metadata does not name the height datum; values agree with the UrbIS 3D heights to about 1 m, so it is taken as TAW. |
| UrbIS Transport networks (GPKG: `StreetAxes`, `StreetNodes`, `Railways`) | EPSG:31370. 2D. |
| OpenStreetMap | WGS84 (EPSG:4326) |

The pipeline's single planar CRS is **EPSG:31370**. OSM is converted with this
proj4 definition, pinned so that Python (pyproj) and the browser (proj4js) agree:

```
+proj=lcc +lat_0=90 +lat_1=51.16666723333333 +lat_2=49.8333339
+lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl
+towgs84=-106.8686,52.2978,-103.7239,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs
```

That is the EPSG "BD72 to WGS 84 (3)" 7-parameter Helmert. It is good to about
1 m, which is below OSM's own tracing error (typically 1–5 m). PROJ's own default
4326→31370 gives the same numbers (checked).

Check point: Place de Saint-Job (lon 4.36586, lat 50.79415) maps to
**E 149796.14, N 164853.90**.

### 2.2 Local metres (what every runtime file uses)

Same axis conventions as the road lab (`vendor/roads/roadMath.js`), y up:

```
ORIGIN_E = 148643      ORIGIN_N = 165394      (EPSG:31370, metres; centre of the study box, rounded to 1 m)

x =  E − ORIGIN_E      +x = east
z = −(N − ORIGIN_N)    +z = SOUTH  (top view: +x right, +z down the screen, as in the road lab)
y =  H                 +y = up, absolute height in metres above TAW/DNG (not shifted)
```

- Plan coordinates are `(x, z)`. A heading θ points along `(cos θ, sin θ)`, so θ
  increasing turns right (clockwise seen from above). Right-hand traffic.
- `y` stays absolute (about 40–130 m here), so a road `node.y` or a building base
  can be compared directly with the heightmap. float32 is plenty at this scale.
- Polygon rings are stored without repeating the first point. Footprints are
  ordered so that `polygonArea()` from `roadMath.js` (shoelace on `[x, z]`) is
  **positive for outer rings and negative for holes**.
- Study box in local metres: x ≈ −1587 … +1586, z ≈ −946 … +946.

## 3. Tile grid

- Square **500 m** tiles aligned to the local origin: tile `(i, j)` covers
  `x ∈ [500·i, 500·(i+1))`, `z ∈ [500·j, 500·(j+1))`.
- **From 2026-11-04 (all of Uccle):** `i = −6 … 8` (15 columns), `j = −4 … 7` (12 rows),
  x −3000…4500, z −2000…4000. Only the **120 tiles that touch the study area** exist (listed in
  the manifest). The study area is the commune of Uccle (OSM relation 58253,
  `pipeline/uccle_boundary.geojson`) united with the first study box. Seven forest tiles (Sonian
  Forest) have no roads: their `roads.json` is empty but valid.
- **Name** = column letter + row number, read like a map from the north-west:
  column `A`…`O` for `i = −6…8` (west → east), row `1`…`12` for `j = −4…7`
  (north → south).
- **The first grid** (until 2026-11-04) was `i = −4…3`, `j = −2…1`, named `A1`…`H4`, so old notes
  use old names: old name = letter index + 2 columns, number + 2 rows (old `G4` = new `I6`,
  old `C2` = `E4`, old `H3` = `J5`). `common.OLD_NAMES` has the table.
- **Sample tile: `I6`** (old `G4`; i = 2, j = 1, x 1000–1500, z 500–1000). It contains
  Place de Saint-Job at local (1153.1, 540.1). The square is only about 40 m
  from the tile's north edge, which is why tiles carry a buffer (below).
- Tiles outside the study box hold only what falls inside it. Data is clipped
  to the study box, not just to the grid. One exception: a tile's road buffer
  (5.1) may reach up to 150 m beyond the study box, so edge tiles still have
  complete junctions.

## 4. Repository layout

```
data/raw/            downloads (git-ignored, never committed)
data/tiles/
  manifest.json
  <TILE>/roads.json         road-lab network for the tile + buffer
  <TILE>/buildings.json     building records
  <TILE>/buildings.bin      building triangle geometry
  <TILE>/terrain.u16        heightmap
  <TILE>/terrain.json       heightmap header
  <TILE>/features.json      trees, parks, tram lines, points
data/roads/network.json     whole-area road network (follow-up session)
```

The processed files for one tile should stay under about 2 MB in total.

## 5. Formats

All JSON is UTF-8. Coordinates are rounded to **0.01 m**. Every file has a
top-level `"contract": "0.7"`, except `roads.json`, which must stay exactly the
road lab's own format. It carries `meta.contract` instead (see 5.1).

### 5.1 Roads — `roads.json` (the road lab's saved-data JSON)

This is exactly what `buildRoadNetwork(data, opts)` in
`vendor/roads/roadNetwork.js` takes, and what the road lab's Export / Import
writes and reads:

```jsonc
{
  "version": 1, "style": "eu", "terrain": "flat", "nextId": <int>,
  "nodes": [{ "id": "n12", "x": 1153.1, "z": 540.1, "y"?: 98.2,
              "kind"?: "auto|junction|roundabout|split",
              "radius"?: <corner radius m>, "ring"?: { "radius": <m>, "lanes": 1|2|3 },
              "control"?: "auto|signal|stop|yield|priority|allstop",
              "crosswalks"?: false,
              "meta"?: { ... } }],
  "roads": [{ "id": "r7", "a": "n12", "b": "n40", "type": "<ROAD_TYPES key>",
              "pts": [{ "x": .., "z": .., "r"?: <PI radius m> }],
              "lanes"?: { "center": {width, kind}, "left": [{type,width}], "right": [{type,width}] },
              "sections": [], "profile": { "mode": "terrain" },
              "meta"?: { ... } }],
  "meta": { "contract": "0.7", "tile": "G4", "bufferM": 150, "source": "osm", "osmBase": "<overpass timestamp>",
            "from": "data/roads/network.json", "refineActions": { "<action>": <count> }, "generated": "<iso>" }
}
```

- `style` is always `"eu"`. `terrain` is `"flat"`: it only names the lab's
  built-in test ground. The real ground goes in as `opts.ground = (x, z) => y`,
  sampled from the heightmap (see 5.3).
- Node and road ids are strings, unique within the file. Ids come from OSM, so
  they stay stable when the data is rebuilt:
  - a node is `n<osmNodeId>`;
  - a road is `r<osmWayId>_<k>`, where k is the piece number after splitting
    the way at junctions;
  - a collapsed roundabout is `n<ringWayId>`.
- `pts` are the PIs (points of intersection) between the two end nodes, not a
  dense polyline. The OSM geometry is simplified (Douglas–Peucker, 0.75 m). Each
  PI gets `r` from the circle through it and its neighbours, clamped to
  [6 m, type radius]. The road lab then shrinks radii that don't fit.
- `type` maps from OSM tags as follows. All types are keys of `ROAD_TYPES`.

  | OSM `highway` | type |
  |---|---|
  | primary, primary_link, secondary | `avenue` |
  | secondary_link, tertiary, tertiary_link | `collector` |
  | residential, unclassified | `local` |
  | living_street, service (not parking aisles) | `alley` |
  | any of these with `oneway=yes` or `-1` | `oneWay`, except `avenue` and `collector`, which keep their type with a custom one-way `lanes` stack |

  `oneway=-1` ways are reversed, so traffic always runs a → b on the right lanes.
- `lanes` (custom stack) is written only when OSM says something the type
  default does not: `lanes`, `lanes:forward`/`backward`, `cycleway*`,
  `parking:*`, `sidewalk`. Widths come from the type default.
- Roundabouts (`junction=roundabout` rings) collapse to one node,
  `kind: "roundabout"`, at the ring centroid. The engine reads `ring.radius` as
  the **outer kerb** radius (`Ro` in `roadJunction.js`). The OSM ring is the
  carriageway centreline, so `ring.radius = mean centroid-to-ring distance +
  lanes × laneW / 2`, with laneW 5.2 m for one lane and 4.6 m for more (the
  engine's values). `ring.lanes` comes from the `lanes` tag, default 1.
  `highway=mini_roundabout` nodes stay `auto` with `meta.mini = true`: the
  engine's smallest ring (about 15 m) is bigger than a real mini roundabout.
- `meta` (ignored by the engine; `buildRoadNetwork` keeps unknown keys on
  `node.src` and `road.src`):
  - roads: `{ osm: wayId, name, highway, maxspeed, surface, tram: bool, cut: bool }`
  - nodes: `{ osm: nodeId, crossing: bool, signals: bool, cut: bool, merged?: [nodeId, ...] }`
- **Dual carriageways (from 0.4, `pipeline/dual.py`):** two one-way OSM ways
  with the same `name`, running opposite ways 4–35 m apart (or sharing the node
  where they diverge) over at least 12 m, are replaced on that stretch by one
  two-way road:
  - id `r<wayA>d<wayB>_<k>` (A is the way whose nodes form the centreline);
  - centreline at the midpoint of the two carriageways. Node ids stay OSM node
    ids (positions move). A cross street that met both carriageways meets one
    node;
  - `lanes`: A's travel side on the right, B's on the left, `center` =
    `{ width: median, kind: "raised" | "painted" | "line" }` with median =
    measured gap − half of each side's driving width (raised from 1.5 m,
    painted from 0.5 m);
  - `meta.dual = { ways: [wayA, wayB], gapM, medianM }`.

  The carriageways' parts outside the stretch remain as one-way roads with ids
  `r<wayId>r<q>_<k>`. Where both continue past an end, the end node gets
  `kind: "split"` and `meta.dualSplit`. Where both reach the same roundabout
  within 70 m, they are dropped and the two-way road enters the ring as one arm.
  `roads.json` / `network.json` `meta.dual` lists every collapsed stretch.
- **Pipeline (from 0.3):**
  1. `build_roads.py --all` converts OSM for the study box + 150 m into
     `data/roads/network.json` (cut at that boundary, `meta.cut` as below).
  2. `refine_roads.mjs` builds it with `buildRoadNetwork` and fixes what the
     engine reports, repeating until nothing changes. Every action is listed in
     `network.json` `meta.refine.log`:
     - `tight-corner`: sets node `radius` (the kerb return, m) to a tight value
       (alley 2, local / oneWay 3, collector 4, avenue 5) at both ends of a road
       the junctions swallow;
     - `merge`: replaces two or more junctions closer than 45 m with one node at
       their centroid. The kept node keeps its id and lists the others in
       `meta.merged`. Roads between them are dropped. Not done if two roads would
       then join the same two nodes, or if it makes roads cross (rolled back);
     - `drop-stub`: drops a short road to a dead end or buffer cut that a
       junction swallows;
     - `drop-pi`: removes the PI nearest a `tight-bend` error;
     - `corner-node`: sets `kind: "junction"` on a two-road node whose kink is
       too sharp to smooth, so it is built as a corner;
     - `drop-parallel`: of two service/alley roads joining the same two nodes,
       drops one;
     - `rollback`: undoes a round that made roads cross;
     - `join-ring` (from 0.5): a junction swallowed by an adjacent roundabout is
       folded into it. Its other roads now end at the ring (its position stays
       as a PI), and the ring lists it in `meta.joined`;
     - `unsplit` (from 0.5): a `split` node whose short branch can't turn becomes
       a plain junction;
     - `drop-slip` (from 0.5): a one-way slip road of 35 m or less between two
       junctions that still bends too tightly is dropped;
     - for `ring-crowded` (from 0.4), in order: `ring-tight-corners` (ring node
       `radius` = 3), `ring-no-parking` (parking lanes removed from arms
       shorter than 80 m, written as a custom `lanes`), `ring-grow` (`ring.radius`
       + 1 m, at most 3 m in total, recorded in node `meta.ringGrownM`).
  3. `cut_roads.py` cuts the refined network into tiles (below).
- **Overrides (from 0.5):** `pipeline/overrides.json` holds hand fixes for
  places no rule handles. Every entry has a `why` naming the place.
  - `dual.skipWays`: OSM way pairs `dual.py` must not collapse.
  - `roads`: ops applied by `refine_roads.mjs` before its loop, on converter ids:
    `merge-nodes {nodes: [keep, ...], at?}`, `drop-road {road}`,
    `set-node {node, set}`, `set-road {road, set}` (a `null` value removes the
    key).

  Ops that match nothing are reported on stderr and marked `ok: false` in
  `network.json` `meta.refine.overrides`. `tools/plot_area.mjs` draws a
  network around a point with its ids and engine errors, for writing them.
- **Tiling:** a tile's `roads.json` holds every road of `network.json` with any
  part within **150 m** of the tile, cut at that buffer. Ids are the network's,
  so a road or node has the same id in every tile. A piece cut at the buffer ends
  at a new node `c<roadId>_a` / `c<roadId>_b` with `meta.cut = true`, and
  if a road leaves and re-enters the buffer its pieces get `_<k>` suffixes. The
  engine treats a cut node as an ordinary `end` node; viewers should hide
  geometry outside the tile. Clipping uses the PI polyline (end node, PIs, end
  node).
- Not modelled by the road engine, and therefore kept in `features.json`
  instead: tram tracks, pedestrian-only ways, footways, cycleways separated
  from the road, steps.

### 5.2 Buildings — `buildings.json` + `buildings.bin`

A building belongs to the tile that contains its footprint centroid. Buildings
are never split across tiles.

```jsonc
{
  "contract": "0.7", "tile": "G4", "count": 598,
  "bin": "buildings.bin", "binLayout": "positions:f32x3, indices:u32 (see below)",
  "buildings": [{
    "id": "<source id>", "source": "urbis3d",
    "footprint": [[[x, z], ...] /*outer*/, [[x, z], ...] /*holes*/],
    "base": 97.42,            // m TAW: lowest DTM sample under the footprint (fallback: lowest geometry vertex)
    "eaves": 104.1,           // lowest roof vertex (m TAW), null if no roof faces
    "top": 109.8,             // highest vertex (m TAW)
    "height": 12.38,          // top − base
    "roof":  { "first": <tri index>, "count": <tri count> },
    "walls": { "first": <tri index>, "count": <tri count> },
    "attrs": { ... }          // source attributes passed through (e.g. UrbIS id, type, levels), keys as in source
  }],
  "inputs": [{ "file", "layer", "features", "crs" }],   // file relative to data/raw/urbis/buildings3d/
  "skipped": { "<reason>": <count> }
}
```

- **UrbIS (from 0.2):** one record per UrbIS *BuildingSolid* (layer `*_BuildingSolids`,
  `--id-field INSPIRE_ID --layer BuildingSolids`). `id` is the solid's `INSPIRE_ID`
  URI (`https://databrussels.be/id/buildingsolid/<n>`). Several solids can share a
  building: `attrs.BU_ID` is the building URI (sometimes absent). `attrs.DETAILSLEV`
  is the level of detail (2 = LoD2). Engineering structures (`EngineeringWork*`
  layers) and the separate `BuildingFaces` layer are not used yet.
- **`roofColor` (from 0.7):** `[r, g, b]` linear albedo of the roof: the median of the
  sunlit half of the 2024 orthophoto pixels under the roof triangles (layer
  `Ortho2024NS`, a true ortho, 25 cm/px, via the Brussels raster WMS), vegetation
  pixels excluded, green casts pulled 70 % to grey, ×0.85 exposure.
- **`attrs._landmark` (from 0.7):** `{ kind: church|chapel|synagogue|orthodox|worship,
  name, osm, material?, colour?, roofMaterial? }` on solids at least 30 % inside an OSM
  place-of-worship outline (`data/raw/osm/landmarks.json`), and on every solid with
  the same `BU_ID`.
- **`base` vs geometry (from 0.2):** UrbIS walls often reach *below* the DTM. In G4
  the lowest vertex is a median 1.0 m under `base` (5 %–95 %: 1.5 m below to 0.1 m
  below). `base` stays the DTM value; viewers should let walls sink into the
  ground rather than clip them.

`buildings.bin` is little-endian:

```
u32 vertexCount, u32 triangleCount
f32 positions[vertexCount * 3]      // local x, y, z (y = absolute m TAW)
u32 indices[triangleCount * 3]      // counter-clockwise seen from outside, so normals point out
```

- Triangles are grouped per building, roof first and then walls. The `first`
  and `count` values above index triangles, not vertices.
- Faces are split into roof and walls by their normal: a face is a **wall**
  if |n·up| < 0.17 (within about 10° of vertical); otherwise it is **roof**
  if the normal points up. Ground faces (normal pointing down) are dropped.
- Normals are not stored. Viewers compute them as flat per-face normals.
- If a building has only a 2D footprint and a height, the pipeline extrudes it
  (flat roof) and sets `attrs._extruded = true`.

### 5.3 Terrain — `terrain.u16` + `terrain.json`

- A bare-earth DTM resampled onto a **1.0 m** grid of **501 × 501** samples.
  The samples sit at the tile's corners and every metre between, so sample
  `(c, r)` is at `x = x0 + c`, `z = z0 + r`, with `c, r = 0…500`. Neighbouring
  tiles share their edge row or column exactly.
- Row-major, row `r = 0` is the tile's north edge (smallest z), and samples run
  west → east inside each row.
- **Encoding:** uint16 little-endian, `y = value / 100` (cm). This covers
  0–655.34 m. `65535` = no data.
- Resampling is bilinear from the source DTM, which is reprojected to
  EPSG:31370 first if it isn't already.
- `terrain.json`:
  `{ "contract":"0.7", "tile":"G4", "x0":1000, "z0":500, "size":500, "step":1.0, "cols":501, "rows":501, "encoding":"u16le-cm", "nodata":65535, "min":.., "max":.., "nodataCount":.., "source":"urbis-dtm", "inputs":[{ "file", "res", "crs" }] }`
  (`file` relative to `data/raw/urbis/dtm/`).
- Source sheets are mosaicked before resampling, so sheet seams don't show.
- `ground(x, z)` for the road engine is a bilinear lookup in this grid.

### 5.4 Trees and point features — `features.json`

```jsonc
{
  "contract": "0.7", "tile": "G4",
  "trees":   [{ "x", "z", "y"?, "id": "chm:<2E>_<2N>" | "osm:n123", "source": "urbis-chm" | "osm",
                "height"?, "crown"?, "species"?, "genus"?, "leafType"?, "osm"?: "osm:n123" }],
  "treesSource": { "chm": { "dsm": [..], "dtm": [..], "minHeight": 3, "res": 0.5 }, "osmMatched": n, "osmOnly": n },
  "treeRows":[{ "id": "osm:w1", "line": [[x,z],...] }],
  "areas":   [{ "id": "osm:w2", "kind": "park|grass|wood|garden|playground|water|cemetery",
                "rings": [[[x,z],...], ...], "name"? }],
  "lines":   [{ "id": "osm:w3", "kind": "tram|footway|cycleway|path|steps|pedestrian",
                "line": [[x,z],...], "tags": {..} }],
  "points":  [{ "id": "osm:n4", "kind": "crossing|traffic_signals|tram_stop|bus_stop|street_lamp|bench|...",
                "x", "z", "tags": {..} }]
}
```

Trees (from 0.6): local maxima of the canopy height model (UrbIS DSM 2021 − DTM
2021, both 0.5 m, same LiDAR flight), at least 3 m tall, outside building
footprints grown by 1.5 m. `y` = DTM ground (m TAW), `height` = canopy top
above ground (m), `crown` = crown radius (m): clamp(0.18 h + 0.8, 1.2, 7.0),
capped at 0.6 × the distance to the nearest taller tree. An OSM tree within
3 m lends its species tags (`osm` = its id); unmatched OSM trees are kept with
`source: "osm"`. LiDAR from October 2021: trees felled or planted since are
not reflected.

Points and trees belong to the tile they fall in. Lines and areas are clipped to
the tile; the clipped pieces keep their source `id`.

### 5.5 Manifest — `data/tiles/manifest.json`

```jsonc
{
  "contract": "0.7",
  "crs": { "source": "EPSG:31370", "proj4": "<string above>", "origin": [148643, 165394],
           "axes": "x=east, z=south, y=up (m TAW)" },
  "studyBox": { "lon": [4.327, 4.372], "lat": [50.7905, 50.8075], "local": { "x": [..], "z": [..] } },
  "tileSize": 500, "cols": "ABCDEFGH", "rows": [1, 2, 3, 4], "iRange": [-4, 3], "jRange": [-2, 1],
  "tiles": [{ "name": "G4", "i": 2, "j": 1, "bounds": { "x": [1000, 1500], "z": [500, 1000] },
              "status": "built|partial|missing",   // partial = some layers missing, listed in "missingLayers"
              "files": { "roads": "G4/roads.json", "buildings": "G4/buildings.json", "buildingsBin": "G4/buildings.bin",
                         "terrain": "G4/terrain.u16", "terrainHeader": "G4/terrain.json", "features": "G4/features.json" },
              "counts": { "roads": .., "nodes": .., "buildings": .., "trees": .. },
              "sources": { "osm": "<overpass timestamp>", "urbis3d": ["<path>", ...], "dtm": ["<path>", ...] } }]
}
```

`sources.osm` is the Overpass `timestamp_osm_base`. `urbis3d` and `dtm` list the
input files that contributed, relative to `data/raw/urbis/<key>/`. The first path
part is the release folder, which carries the sheet and date, e.g.
`UrbISBuildings3D_31370_SHP_149164_20261003/shp/…`.

Every tile of the grid that touches the study area is listed (120). Tiles that haven't been built have
`status: "missing"` and no `files`.

Optional files (listed in `files` when present, never counted in `status` / `missingLayers`):
`surfaces` (5.6), with `counts.surfaces`, `counts.kerbLength` and `sources.urbisLandCover`.

### 5.6 Measured street surfaces — `surfaces.json` (optional)

Built by `pipeline/build_surfaces.py` from UrbIS Land cover `StreetSurfaces` (level 0 only), cut to the tile
(no buffer: neighbours meet exactly at the tile edge). Drawn only with the viewer flag `?roads=surface`
(`viewer/surfaces.js`). Local metres, 0.01 m, rings as everywhere else (outer positive, holes negative,
no closing point).

```jsonc
{
  "contract": "0.7", "tile": "I6",
  "source": { "dataset": "UrbIS Land cover StreetSurfaces (Paradigm, CC0 1.0)", "file": "UrbISLandCover_04000.gpkg", "built": "<ISO time>" },
  "classes": { "roadway": 0, "tramRoad": 1, "tramSite": 2, "parking": 3, "square": 4, "sidewalk": 5, "median": 6, "path": 7, "ramp": 8 },
  "counts": { "surfaces": 152, "byType": { "SW": 98, "S": 27, .. }, "kerbs": 24, "edges": 35, "skippedLevels": {},
              "unknownTypes": {}, "area": { "<class>": m² }, "kerbLength": m },
  "kerbCheck": { "topoKerbLength": m, "derivedKerbLength": m, "topoWithin": { "0.1m": share, .. }, "medianDistance": m } | null,
  "surfaces": [{ "c": <class>, "type": "S|SW|I|IC|SC|C|M|K|P|A|..", "name": "<STRNAMEFRE>", "hier": "DR|DC|IDR|..", "id": "<INSPIRE id tail>",
                 "course"?: <deg, squares: direction of the stone rows>, "rings": [[[x, z], ..]] }],   // simple rings (holes split)
  "kerbs": [[[x, z], ..]],                 // raised (sidewalk / median) | low boundary, raised side on the LEFT:
                                           // for a segment (dx, dz) the raised side is at +(-dz, dx)
  "edges": [{ "raised": 0|1, "line": [[x, z], ..] }],  // outer boundary of all surfaces (minus the tile edge),
                                                        // the surface on the LEFT; the viewer hangs skirts from them
  "bollards": [[x, z], ..] | null,                      // UrbIS Topo fixed bollards CR5702P + CR57L lines every 1.5 m
  "flanks": [[[x, z], ..]]                              // ramp | sidewalk boundaries, the ramp on the LEFT (side walls)
}
```

Processing (build_surfaces.py): level 0 only; adjacent SIDEWALK / MEDIAN / SQUARE pieces merged into one polygon each;
the boundary network of all surfaces smoothed ONCE (shared edges cut at their junction nodes; centripetal Catmull-Rom
through the vertices where they sample a curve: turns of 2-40 deg, about one point per 4 deg and at least every 0.5 m
in bends, corners and straight runs untouched; every original vertex kept), the polygons rebuilt from the smoothed
edges, holes split along a north-south cut. Raised classes (kerb lines between them and the low ones): sidewalk,
median, square, ramp. `counts` also has `inputPolygons`, `smoothing` (`pointsAdded`, `areaChange` m², polygons in/out)
and `droppedKerbs` (`driveways`, `crossings`, `rampPolygons`). Dropped kerbs ("ramp", type SW): cut out of the sidewalk
1.0 m deep behind the kerb, along the driveway's width + 0.3 m each side (UrbIS Topo CR42L, drawn on the property line,
projected onto the nearest kerb within 8 m) and 2 m each side of every OSM crossing point (features.json) on each
kerb within 12 m; the viewer ramps them from 2 cm at the kerb to the full kerb height 1 m behind it.


UrbIS TYPE -> class: S, I, A, B, IL, G roadway; SC, IC tramRoad; C, AC tramSite; K parking; P square; SW sidewalk;
M median; T path. `kerbCheck` compares the derived kerbs with the surveyed UrbIS Topo kerb lines (`BR0101L`):
the share of the surveyed kerb lying within 0.1 / 0.25 / 0.5 / 1 m of a derived one.

## 6. Rules

- Raw downloads go in `data/raw/` and are never committed. Processed files are
  rebuilt by the pipeline. Record the inputs (Overpass timestamp, UrbIS file
  name or version) in the manifest.
- Never mock or invent data. If a source is missing, the tile is `missing`, or
  the layer is omitted and the manifest says so.
- Licence notes in `CREDITS.md` must be kept accurate. OSM-derived files are
  ODbL. UrbIS and the DTM are CC0 (checked 2026-11-02, see CREDITS.md).
