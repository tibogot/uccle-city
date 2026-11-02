# uccle-city data contract — v0.2

### Changes

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
- `i = −4 … 3` (8 columns), `j = −2 … 1` (4 rows). That is 32 tiles covering
  x −2000…2000, z −1000…1000, which contains the whole study box.
- **Name** = column letter + row number, read like a map from the north-west:
  column `A`…`H` for `i = −4…3` (west → east), row `1`…`4` for `j = −2…1`
  (north → south). Example: `A1` is the north-west corner, `H4` the south-east.
- **Sample tile: `G4`** (i = 2, j = 1, x 1000–1500, z 500–1000). It contains
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
top-level `"contract": "0.2"`, except `roads.json`, which must stay exactly the
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
  "meta": { "contract": "0.2", "tile": "G4", "bufferM": 150, "source": "osm", "generated": "<iso>" }
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
  - nodes: `{ osm: nodeId, crossing: bool, signals: bool, cut: bool }`
- **Tiling:** a tile's `roads.json` holds every road with any point within
  **150 m** of the tile, cut at that buffer. A road cut at the buffer ends at a
  node with `meta.cut = true`. The engine treats it as an ordinary `end` node;
  viewers should hide geometry outside the tile. The whole-area file
  `data/roads/network.json` is the same format with no cuts.
- Not modelled by the road engine, and therefore kept in `features.json`
  instead: tram tracks, pedestrian-only ways, footways, cycleways separated
  from the road, steps.

### 5.2 Buildings — `buildings.json` + `buildings.bin`

A building belongs to the tile that contains its footprint centroid. Buildings
are never split across tiles.

```jsonc
{
  "contract": "0.2", "tile": "G4", "count": 598,
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
  `{ "contract":"0.2", "tile":"G4", "x0":1000, "z0":500, "size":500, "step":1.0, "cols":501, "rows":501, "encoding":"u16le-cm", "nodata":65535, "min":.., "max":.., "nodataCount":.., "source":"urbis-dtm", "inputs":[{ "file", "res", "crs" }] }`
  (`file` relative to `data/raw/urbis/dtm/`).
- Source sheets are mosaicked before resampling, so sheet seams don't show.
- `ground(x, z)` for the road engine is a bilinear lookup in this grid.

### 5.4 Trees and point features — `features.json`

```jsonc
{
  "contract": "0.2", "tile": "G4",
  "trees":   [{ "x", "z", "y"?, "id": "osm:n123", "species"?, "genus"?, "leafType"?, "height"?, "crown"? }],
  "treeRows":[{ "id": "osm:w1", "line": [[x,z],...] }],
  "areas":   [{ "id": "osm:w2", "kind": "park|grass|wood|garden|playground|water|cemetery",
                "rings": [[[x,z],...], ...], "name"? }],
  "lines":   [{ "id": "osm:w3", "kind": "tram|footway|cycleway|path|steps|pedestrian",
                "line": [[x,z],...], "tags": {..} }],
  "points":  [{ "id": "osm:n4", "kind": "crossing|traffic_signals|tram_stop|bus_stop|street_lamp|bench|...",
                "x", "z", "tags": {..} }]
}
```

Points and trees belong to the tile they fall in. Lines and areas are clipped to
the tile; the clipped pieces keep their source `id`.

### 5.5 Manifest — `data/tiles/manifest.json`

```jsonc
{
  "contract": "0.2",
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

All 32 tiles are listed. Tiles that haven't been built have
`status: "missing"` and no `files`.

## 6. Rules

- Raw downloads go in `data/raw/` and are never committed. Processed files are
  rebuilt by the pipeline. Record the inputs (Overpass timestamp, UrbIS file
  name or version) in the manifest.
- Never mock or invent data. If a source is missing, the tile is `missing`, or
  the layer is omitted and the manifest says so.
- Licence notes in `CREDITS.md` must be kept accurate. OSM-derived files are
  ODbL. UrbIS and the DTM are CC0 (checked 2026-11-02, see CREDITS.md).
