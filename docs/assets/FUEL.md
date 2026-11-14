# Petrol stations: the station kit and the 17 real stations (branch claude/fuel, 2026-11-14)

The owner's playtest: "the gas station looks way too cheap; since there are different gas stations in the city maybe a
kit might be good". Until now the street-life layer drew one generic box canopy, two box pumps and a price pylon with
the real brand name at each OSM fuel point. **On by default**; `?fuel=old` gives the street-life version back.

## 1. The stations found

Source: every `amenity=fuel` of the Uccle box (the street-life Overpass POI pull) that lies on a city tile, and the OSM
data round each (`tools/fuel/fetch_fuel.py`: the OSM API "map" call, +-90 m; the Overpass mirrors timed out that day).
**17 stations on the tiles**: 12 inside the Uccle boundary, 5 just outside it on tiles the city draws (Forest, Ixelles
side of the Cambre, Drogenbos / Ruisbroek, Linkebeek, Sint-Genesius-Rode). Brands from OSM `brand=` / `name=`:
Q8 x5 (one "Q8 easy"), Esso x4 (two "Esso Express"), Texaco x2, Lukoil x2, Shell (Express), TotalEnergies,
DATS 24, Avia, one independent (Kink United).

Each one was looked at on Google Maps (aerial) and, for the ones below marked SV, on Street View (look only: nothing
traced, stored or shipped). What was seen is in `tools/fuel/survey.json` ("seen"). The geometry comes from the data:

| id | tile | station (OSM brand) | type | islands | canopy (source) | our scheme | shop front |
|---|---|---|---|---|---|---|---|
| n349272406 | F5 | Lukoil, Wolvendael / Dieweg (SV) | canopy | 2 | 19.3 x 8.2 m, top 5.38 m (OSM roof + DSM height) | lumo | yes |
| n410466355 | D7 | Texaco, Rue du Chateau d'Or (SV) | canopy | 6 | 27.1 x 19.1 m, top 5.25 m (DSM) | pivot | yes |
| n495965407 | K9 | Texaco Prince d'Orange, Ch. de Waterloo | canopy | 4 | 17.1 x 14.9 m, top 5.17 m (DSM) | pivot | yes |
| n503139615 | J7 | Q8, Ch. de Waterloo / De Foestraets | canopy | 2 | 19.8 x 8.4 m, top 5.18 m (DSM), solar top | kelvo | yes |
| n576656710 | J3 | TotalEnergies Cambre, Ch. de Waterloo (SV) | canopy | 2 | 21.6 x 10 m, top 6.33 m (DSM, depth from the survey) | tamaris | - |
| n2446274082 | J3 | Esso, Ch. de Waterloo (24/7) | canopy | 1 | 11.8 x 7.5 m, top 5.2 m (DSM; depth from the aerial's scale) | rubra | yes |
| w96066956 | J6 | Esso, Ch. de Waterloo / Globe | canopy | 2 | 20.6 x 8.3 m, top 5.17 m (OSM roof + DSM) | rubra | yes |
| n6763675396 | C5 | Lukoil, Rue du Roetaert | canopy | 2 | 15.1 x 7.1 m, top 5.39 m (DSM) | lumo | yes |
| n410936386 | C5 | DATS 24 Uccle, Rue de Stalle | canopy, unmanned | 2 | 14.5 x 6.4 m, top 4.91 m (DSM) | daxo | pay terminal |
| n1346762169 | A5 | Q8 easy, Ch. de Ruisbroek (Flanders) | canopy, unmanned | 1 | 14 x 10 m (survey: aerial scale bar), 5.3 m | kelvo | pay terminal |
| w174996511 | K11 | Esso Express, Waterloose Steenweg (Rhode) | canopy, unmanned | 1 | 13.6 x 7.6 m (OSM roof), 5.3 m | rubra | pay terminal |
| n3729193961 | D10 | Kink United, Beukenstraat (Linkebeek) | canopy + car wash | 1 | 9 x 6 m (survey), 5.3 m | brook | pay terminal |
| n13148112304 | C3 | Shell Express, Av. Docteur Decroly (SV) | under a building | 1 | (the apartment block's colonnade) | solenn | fascia band |
| n7334366818 | C3 | Esso Express (Maes), Av. du Domaine (SV) | under a building | 1 | (the garage's projecting roof) | rubra | fascia band |
| n576656709 | J4 | Q8, Ch. de Waterloo / Groenejagersveld | under a building | 1 | (UrbIS models station + "Imo" wash as one solid) | kelvo | fascia band |
| n4373358691 | H1 | Q8, Rue Vanderkindere (garage, Mo-Fr 7-18) | kerbside | 1 | - | kelvo | - |
| n1633030331 | D6 | Avia, Ch. d'Alsemberg 962 (SV) | kerbside | - | NOT placed (below) | - | - |

Layouts seen (aerial + Street View): a flat canopy over 1-3 rows of islands is the rule; the shop in a building behind
the canopy or beside it (11 of 17); three are pumps under a building's own overhang (Decroly: under an apartment
block's colonnade with tapered columns; Domaine: a garage's roof; Groenejagersveld: modelled by UrbIS as one solid);
two are kerbside (a garage forecourt, the old Avia in front of a house behind a glass railing); four are unmanned
(DATS 24, Q8 easy, two Esso Express); car washes at Total Cambre ("Wash", OSM), Kink United (OSM), Groenejagersveld
("Imo", inside the UrbIS solid) and a self-service hall at Chateau d'Or (seen, not in OSM / UrbIS: not placed); air /
water where OSM says `compressed_air=yes` (6 stations). Total Cambre has two PITCHED steel canopies (Street View).

## 2. What was built

### Layout from the data (`tools/fuel/build_fuel.py` -> `data/fuel/<T>.json` + `summary.json`, 152 KB, deterministic)

```
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/fuel/fetch_fuel.py --pois <main>/data/raw/streetlife/osm_pois.json
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/fuel/build_fuel.py --raw <main>/data/raw
```

- **Canopy**: the UrbIS DSM - DTM (0.5 m, 2021): the flat (3x3 roughness < 0.35 m) 3.4-7.8 m high blob outside the UrbIS
  footprints nearest the OSM point, its minimum rotated rectangle (+0.8 m: the filter eats the rim) and its median
  height = the canopy's top (4.9-5.4 m, as Street View shows; 6.3 m for Total's pitched roof). An OSM `building=roof`
  over the blob wins on size (OSM outlines include the fascia). Outside Brussels (no DSM): OSM roof, else the survey's
  size read on the aerial's scale bar. Local x along the long side, +z toward the nearest named road.
- **Islands**: rows along x, max(1, round(d / 8)) rows x max(1, round(w / 9.5)) islands; one double-sided dispenser
  each, the canopy column at one end (alternating) in a stainless crash sleeve, yellow crash hoops at both ends.
- **Forecourt**: a slab of concrete pavers (the street texture array's `pavers` layer, `viewer/streets/paving.js`): the
  canopy rectangle grown one side at a time (front first, up to 10 m toward the road, 3 m at the ends, 2.5 m behind),
  shrunk on any side that would enter a building or come within 0.3 m of the carriageway; its heights on a 1 m grid =
  the walking surface (DTM + measured kerb lift) + 3 cm; a 0.25 m skirt all round (JOINS: no floating rim).
- **Totem** by the road (1.2 m behind the kerb) at a canopy end clear of buildings, faces along the road, 2 bollards.
- **Shop front**: on the UrbIS wall facing the canopy within 8 m (the real wall plane from the wall triangles,
  `wall_offset`): 1.5 m glazed bays with a sliding door in the middle, a signage band and the brand sign above,
  bollards at its ends. Unmanned stations get a pay terminal instead.
- **Under / kerbside**: islands 2.6 / 2.4 m outside the building's wall that faces the road (the survey can name the
  street: Decroly), a fascia band on the wall at 3.4 m for "under".
- **Air / water** at a back corner where OSM says `compressed_air=yes`; **car wash** box at an OSM `amenity=car_wash`
  that no UrbIS solid already draws; **bays**: white lane edges 3.2 m each side of every island row; a **drainage
  channel** of 1 m units along the slab's road edge.
- **Canopy "trees"**: the UrbIS canopy-height model reads a 5 m canopy roof as tree crowns: 44 LiDAR "trees" stood on
  the canopies (17 at Chateau d'Or). `summary.json` carries each canopy's rectangle + 1 m; the tile worker drops the
  `urbis-chm` trees inside it (so their colliders go too) and the far impostors do the same (no pop at the swap).

### The kit (`tools/blender/fuelKit.py` -> `models/fuel/fuelkit.glb` 1.8 MB + `fuelkit_ao.png`)

20 pieces, named slots only (no baked colour; the palette is `viewer/fuel/fuelKit.js` SLOTS), bevels as flat facets,
Cycles AO lightmap (2048 px, 48 samples), legs / plinths / columns / kerbs 0.3-0.5 m into the ground:

| piece | LOD0 tris | notes |
|---|---|---|
| canopy_fascia (1 m run, scaled) | 84 | 0.95 m band: alu coping, brand skin, brand stripe, alu lip, LED line under it (emissive); built as a profile prism so a run of 20 m never stretches a bevel |
| canopy_corner | 570 | the same profile swept round R 0.35 |
| canopy_deck (scaled) / canopy_light / solar (scaled) | 32 / 120 / 24 | soffit, roof membrane; flush 1.2 x 0.6 LED panels on a ~3 m grid (emissive); solar panels where seen |
| canopy_column (scaled in height) / column_base | 60 / 152 | 0.30 m clad column; stainless crash sleeve with a brand band |
| fascia_sign | 108 + sign | 3.2 x 0.62 m wordmark box |
| island (with its 2 crash hoops) | 1900 | 5.0 x 1.3 m stadium kerb, galvanised nosing, yellow noses, 76 mm hoops with black bands |
| dispenser | 10820 + sign | 1.1 x 0.5 x 1.95 m: stainless plinth, cabinet with door seams and louvres, screen in a bezel, keypad, card reader, grade tabs, two nozzles in boots per face (E10 green grip, diesel black), hoses from the end outlets hanging in a loop, brand header |
| totem | 648 + sign | 5.6 m: plinth, stainless side posts, brand body, emblem, 4 grade rows (EN 16942 tabs) + LED price windows |
| shopfront / shopdoor | 564 / 996 + glass | 1.5 m glazed bays, kick plate, transom, lit interior panel; sliding door leaves |
| shopsign (scaled) | 64 | signage band with LED line |
| airstand / paypoint / bollard / grate / line | 1264 / 768 / 368 / 336 / 12 | |
| carwash | 2148 + sign | 4.8 x 7.8 x 3.7 m roll-over box, gantry, brushes, wheel rails |

**Brands**: OUR OWN (`tools/fuel/make_brands.py` -> `textures/fuel/fuel_brands.png`, 1536 x 2816, 262 KB): nine invented
wordmarks and abstract emblems (KELVO, RUBRA, SOLENN, TAMARIS, LUMO, PIVOT, DAXO, AVENA, BROOK) whose colours only
resemble the real stations' (blue / orange, red / white, yellow / red, ...); no real name, no real logo. The station's
OSM brand picks the look-alike scheme (survey.json); Chateau d'Or was set from Street View (black Texaco-style fascia,
not the aerial's label). Grade tabs: the EU EN 16942 identifiers (E10 / E5 / B7 / LPG). Price windows: unlit "8.888"
ghost segments: there is no price in the data, so none is shown.

**Mesh audit** (`tools/mesh_audit/cli.mjs`, per piece with its sign / glass; reports in `models/fuel/audit/<piece>/`):
**0 blocking for all 20 pieces** (warnings: slivers on long bevel strips and hose tubes).

### Drawing (`viewer/fuel/fuelKit.js`, `viewer/fuel/cityFuel.js`)

- LODs: LOD0 = the Blender mesh with the AO lightmap; LOD1 / LOD2 welded + meshoptimizer (6 mm / 2.5 cm), crease
  normals, AO per vertex (no Blender decimate); far LODs drop the sub-pixel pieces (grate, paint, bollards, panels...).
- **One station = few draws**: when its tile lands, each station's pieces are merged into its own LOD0 / LOD1 / LOD2,
  sign and glass meshes (`buildStation`, in slices of <= 3 ms). A first version used one city-wide instanced pool per
  piece (as the stops kit): ~22 meshes per station + shadows and ~2 ms CPU a frame on the Chaussee de Waterloo; merged,
  a station near the camera is 3 draws + its shadow. Bands 60 / 180 / 900 m, the per-pixel dither hand-over of
  `viewer/lodFade.js` (same mask in the shadow pass: no shadow snap), the tile fade as a fuelFades slot.
- Brand colours per vertex (scheme) into the brand_* slots; the sign material maps the atlas cell per scheme.
- **Night**: the fascia's LED line, the soffit panels, the screens, the shop interior and the signs glow through their
  emissive slots x `env.uNight`. No light is added (fixed light count).
- Pipelines compiled with `renderer.compileAsync` before a station is first shown (no compile freeze).

### Collisions

Per station one `InstancedMesh` "furniture-fuel" (count 1, never drawn) holding prisms of what is drawn: canopy columns,
dispensers, crash hoops, totem, shop front, air stand, pay terminal, wash box, the canopy deck (4.4-5.4 m up: above the
car, a roof for the walker). The car reads it as "box" (`viewer/drive/driveMode.js`), the walker as "mesh"
(`viewer/character/cityHook.js`), the collision test as furniture. The 16 cm island kerb itself is not a collider (the
test's drawn truth starts above it; the hoops, dispenser and column block the island). The forecourt is drivable (3 cm
slab over the walking surface; the car drives on the engine's ground).

`viewer.collisionTest('F5')` (Lukoil Wolvendael):

| | `?fuel=old` | fuel kit |
|---|---|---|
| static: invisible / missing | 0 / 3 | **0 / 3** (the same 3 far from the station) |
| drive: invisible hits / passed through / fell / stuck | 0 / 0 / 0 / 0 | **0 / 0 / 0 / 0** |
| walk: invisible / passed through | | 0 / 1 (at (-90.5, 55.5), 80 m away: pre-existing) |

The first run had 3 "invisible furniture" (the island kerb prisms) and 2 "invisible tree" (the canopy trees, dropped
from the drawing only): fixed by the hoop colliders and by dropping those trees in the worker.

**Contact check** (`cityFuel.contactAudit(id, viewer.world, viewer.scene)`, tools/mesh_audit/contact.js against the
tile's terrain / roads): Lukoil Wolvendael, Shell Decroly, Esso Domaine: **0 floating, 0 overhang**. Caveat: the
ground parts it finds for these tiles are few triangles (the terrain mesh), so "checked" covers ~10-20 % of the
samples; the slab's skirt and the 0.3-0.5 m buried feet are the design guarantee.

## 3. Comparisons with Street View / photos (look only)

| station | Street View / aerial | ours (`docs/assets/fuel/`) |
|---|---|---|
| Lukoil, Wolvendael (SV Apr 2024, from Av. Wolvendael at the Dieweg crossing) | White flat canopy, ~1 m fascia with a red band and red chevrons at the ends, two white clad columns on the centre line with the dispensers between them, the convenience shop's glazed front behind under a red / white band, a tall white price totem at the corner, paved forecourt open to the street | `city_lukoil_wolvendael_after.jpg` from the same spot: the same composition: white canopy with a red stripe and our LUMO wordmark, two columns, dispensers between, the shop front with its band behind, the totem at the right corner, the pavers running to the sidewalk. Differences: no chevrons (our scheme), the real totem stands at the left corner, planters and the bus-stop furniture of the real square are not there. `_before.jpg`: the old box canopy turned 90 degrees with "Lukoil" on it |
| Texaco, Chateau d'Or (SV Jun 2024 from the street) | Big flat canopy with a black fascia, red stripe, red lettering; tall totem by the road; low kerb wall along the street; the shop (bakery corner, orange band) on the left | `city_chateau_dor_after.jpg`: the big DSM canopy (27 x 19 m) with 6 islands, black PIVOT fascia, shop front on the left. Before the tree fix, 17 LiDAR "trees" stood through the canopy. Missing: the low wall, the self-wash hall (not in the data) |
| Shell Express, Decroly (SV Apr 2024) | Pumps under the colonnade of a 4-storey block, yellow / red fascia along the overhang, price sign at the corner | `city_shell_decroly_after.jpg`: the fascia band on the block's Decroly wall and the island in front of it. The UrbIS solid is drawn to the ground, so the pumps stand outside the colonnade instead of under it; a front-garden hedge from the gardens layer stands in front of the forecourt (both: section 5) |
| TotalEnergies Cambre (SV Jul 2024) | Two PITCHED steel canopies, brick shop with parcel lockers, totem behind a hedge island, car wash | `city_total_cambre_after.jpg`: a FLAT canopy module (pitched not built), the wash box at the OSM point, no shop front (no UrbIS wall within 8 m). The weakest match |
| Esso Express Domaine (SV Apr 2024) | White single-storey garage, pumps on its east side under its roof, Esso-style price totem | island + RUBRA band on the garage wall (type "under") |
| Avia, Alsemberg 962 (SV Apr 2024) | Two pumps behind a glass railing at the pavement in front of a low house, tall price sign, no canopy | not placed: the road engine's carriageway reaches the house there (no room between the façade and the kerb) |

Lab (`labs/fuel-lab.html`): `lab_lukoil_day.jpg`, `lab_lukoil_night.jpg` (the LED line, soffit panels, screens, signs
and LED windows glow), `lab_pump_close.jpg`, `lab_lod_row.jpg` (island sets every 25 m along 600 m).

## 4. Cost

Same camera (Lukoil Wolvendael, eye height, `?traffic=0`, 15 s after the tile is in, median of 24 samples):

| | draws | triangles |
|---|---|---|
| `?fuel=old` | 290 | 3.083 M |
| fuel kit | **291** | **3.150 M** (+67 k) |

- Kit load 150 ms (GLB, AO, atlas, meshopt LODs); a station's merge ~20-60 ms of work in <= 3 ms slices (wall time
  1-2.5 s while the tile builds).
- Memory: per loaded station its merged geometry (LOD0 30-150 k triangles: Chateau d'Or with 6 dispensers is the
  largest); atlas 262 KB, AO 1 MB PNG.
- Drive-stutter harness (`debug/driveStutter.js`, a custom path along the Chaussee de Waterloo past Esso and Total,
  2 out-and-back repeats, the same page order): `?fuel=old` frames > 33 ms 50 / 53 / 50 / 86, CPU p50 9.6-10.2 ms;
  fuel kit 59 / 65 / 83 / 64, CPU p50 9.6-10.3 ms, long tasks 0 / 2 / 0 / 0. Within run-to-run noise on this machine.
  The default `boulenger` path with the kit: 0 frames > 33 ms in the first repeat. (With the per-piece pools the same
  path was clearly worse; hence the merge.)
- **GPU ms: not claimed.** `tools/perf/preflight.ps1` was **RED** throughout (GPU 78 % busy at rest, power cap, 3.5 GB
  free, other city servers 8820 / 8872 listening): another agent (startup / loading scene, its own city tab) was using
  the GPU. The lab reported 0.4-1.1 ms for the whole frame of one station; indicative only.

## 5. Switches, files, left to do

- `?fuel=old`: the street-life layer's box canopy, pumps and pylon (with the real brand name) as before; no kit, no
  canopy-tree filter.
- Lab: `labs/fuel-lab.html` (station picker, scheme override, day / night, LOD row, views, draws / tris / GPU ms;
  `?s=<name prefix>`).

**Shared files touched (for a careful merge):**

| file | change |
|---|---|
| `viewer/main.js` | +1 import (`cityFuel`); `tileData` entry: `fuelClear: cityFuel.on ? cityFuel.clear : null`; lite tiles: `f.trees = cityFuel.treesClear(f.trees)` before the far tree field; `loadTile`: `fuelP = cityFuel.fetchTile(...)` before `stopsP`, `feats.trees = cityFuel.treesClear(feats.trees)` before `featureObjects`, `cityFuel.addTile(entry.name, await fuelP, own.features)` + a `say(...)` after `cityFurniture.addTile`; `cityFuel.removeTile` in dispose; `await cityFuel.start({ scene, updaters, renderer, log })` after `cityStops.start` |
| `viewer/tileData.js` (+ `viewer/tileWorker.bundle.js` rebuilt with `node tools/build_worker.mjs`) | after the tunnel trees: drop `urbis-chm` trees inside `entry.fuelClear` rings |
| `viewer/streetlife/streetlife.js` | constructor option `noFuel`, passed to the worker |
| `viewer/streetlife/streetlifeWorker.js` | `noFuel`: `doc.fuel = []` |
| `viewer/streetlife/cityStreetLife.js` | `noFuel: qs.get("fuel") !== "old"` |
| `viewer/drive/driveMode.js` | `fuel` added to the furniture "box" regex |
| `viewer/character/cityHook.js` | `furniture-fuel` is a "mesh" |
| `labs/index.html` | Fuel Lab card |

New: `viewer/fuel/{fuelKit,cityFuel}.js`, `tools/fuel/{fetch_fuel.py,build_fuel.py,make_brands.py,survey.json}`,
`tools/blender/fuelKit.py`, `models/fuel/` (GLB, AO, json, audit reports, island / totem previews), `textures/fuel/`,
`data/fuel/`, `labs/fuel-lab.*`, `docs/assets/fuel/`. Raw OSM in `data/raw/fuel/` (git-ignored).

**Left to do**

- Total Cambre's two pitched canopies (a pitched canopy module); its brick shop front (no UrbIS wall within 8 m).
- "Under" stations: the pumps should stand under the building's overhang; the UrbIS solid is drawn to the ground, so
  they stand outside it. A colonnade cut in the building layer (or hiding the ground floor) would be needed.
- Avia Alsemberg (not placed: the road engine's carriageway reaches the house) and the Chateau d'Or self-wash hall
  (not in OSM / UrbIS).
- The front-garden layer puts a hedge in front of the Decroly forecourt; a keep-clear hook from data/fuel for
  viewer/gardens.
- Real details not modelled: Lukoil's end chevrons, Chateau d'Or's low kerb wall, planters, EV chargers, flags /
  promo banners, parcel lockers.
- Lamp-light-map entries under the canopies at night (light pools on the forecourt with no added light).
- GPU ms on a GREEN preflight.
- The Blender preview renders show the scaled pieces dark (their AO is not baked); only the island / totem previews
  are kept.
