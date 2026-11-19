# Front gates and fences (claude/gates, 2026-11-19)

Owner, 2026-11-19: "most people around their house are supposed to have gates; I feel you miss many". Also: regular
Google Maps / Street View reality checks (look only: never store, trace or ship imagery).

`?gates=old` = the garden data before this job (data/gardens/old/<T>.json, a frozen copy: same blobs in git). Rule 43
(docs/QUALITY_RULES.md), gate row `gates`. Census class G: `tools/audit/census/gates.mjs`; reports
`docs/census/gates_old.json` (before) and `docs/census/gates_after.json` (after).

## 1. Census (class G)

`node --import ./tools/road_audit/register.mjs tools/audit/census/gates.mjs --all [--old] [--out FILE] [--list]`

Independent of the generator: every HOUSE FRONTAGE of the city (a building's main street face: the door face, else its
widest street face; the façade code's own faces and door bays, `tools/gardens/faces.mjs`), what stands on its property
line as the city DRAWS it (the garden doc after main.js's clearing: restyles, pieces on a carriageway 0.3 m in, cleared
rings; `viewer/gardens/gardenClear.js`):

- **rays** every 0.5 m along the face's middle 80 %, out along its normal: the first measured street surface (every
  UrbIS class but paths and tree pits) or carriageway is the property line; another building first = blocked.
  < 50 % of the rays reach a street: the building does not front one. Median gap < 1 m (or the build found the drawn
  paving carried to the façade): the façade IS the line (a row on the sidewalk, no front garden).
- **type**: shop (a shopfront on a face, an OSM shop point in / within 3 m of the footprint), apartment (>= 12 m high,
  >= 200 m2), terraced (a whole party wall: rows and semis), villa (detached); annexes (< 30 m2 or < 3.5 m) are not
  frontages.
- **line**: each ray, face to 0.4 m past the line, against the drawn pieces (wall, railing, hedge, gate leaf, pier); a
  ray through a UrbIS driveway (CR42L within 0.8 m, a ramp) is access by data. A frontage is CLOSED when >= 50 % of its
  rays meet a piece or a driveway, else OPEN.
- **open by mistake**: an open garden frontage of a villa / terraced house that no forecourt / car park explains (OSM
  amenity=parking / landuse retail / commercial / shop areas over its strip).
- **paths**: the door projected along the normal onto the line; gated = a leaf within 2.5 m of it along the line, or the
  path walks through a driveway with a driveway gate. **drives**: a CR42L / ramp in front of the face; gated = a driveway
  gate leaf within 1.2 m of its span.
- **gate across a driven way**: a CLOSED driveway gate whose leaf line crosses the drawn carriageway or any OSM way a car
  uses (service, track, residential ...).
- **causes**: every open-by-mistake frontage and every ungated house path traced to where it went (below).
- **budget**: the most gate leaves (a driveway pair = two) and piers one tile draws.

## 2. Reference sample (Street View, browser turn)

40 frontages picked deterministically from the census's frontage list (`tools/gardens/gate_sample.py
docs/census/gates_after.json docs/census/gates_old.json`): villas round Fort-Jaco / Prince d'Orange / the Observatoire,
rows round Saint-Job / Vanderkindere / Calevoet, apartment blocks. "line" = what the census reads on the property line
(wall, railing, hedge, gate = gate leaves are the majority piece, pillar, drive = a UrbIS driveway, open); "path" = the
door's path at the line; "drive" = the driveway's gate. The Street View column is filled in the browser turn: LOOK
ONLY (no screenshot stored, nothing traced or shipped), per frontage gate / fence / hedge / wall / open and the style
(wrought iron, brick piers, hedge + small gate, sliding / double driveway gate).

Until Chrome, the expectation from the data and the Brussels residential type: the villa avenues (Fort-Jaco, Prince
d'Orange, Hospices, Pastur) are hedge streets (privet / beech / laurel on the line, often on a low brick wall) with a
pedestrian gate between brick or blue-stone piers and a double or sliding driveway gate on the longer drives; the
1900-1930 rows (Saint-Job, Vanderkindere, Coghen, Boetendael) have a low brick wall with a wrought-iron railing (spear
tops, sometimes gilded) and a small iron gate at the path; the 1930-60 garage rows (Leo Errera, Messidor) are often
paved and open in front of the garage door; apartment blocks have a low hedge / wall with an open or gated path.

| # | group | street | type | at (local x, z) | lat, lon | gap m | ours: line | path | drive | ?gates=old: line / path / drive | Street View |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | villas, Fort-Jaco | Avenue de la Sapinière | villa | K9 2043.4, 2312.4 | 50.778217, 4.378483 | 18.6 | wall | gate | - | wall / no gate / - | (browser turn) |
| 2 | villas, Fort-Jaco | Avenue Jacques Pastur | villa | J7 1521.4, 1303 | 50.787292, 4.371083 | 10.9 | gate | gate | gate | gate / gate / gate | (browser turn) |
| 3 | villas, Fort-Jaco | Avenue de la Sapinière | villa | J9 1867.9, 2426.9 | 50.777188, 4.375995 | 19 | hedge | - | - | hedge / - / - | (browser turn) |
| 4 | villas, Fort-Jaco | Avenue Jacques Pastur | villa | I8 1057.4, 1544.9 | 50.785117, 4.364503 | 6.4 | hedge | gate | - | hedge / gate / - | (browser turn) |
| 5 | villas, Fort-Jaco | Avenue du Fort-Jaco | villa | K7 2192.6, 984 | 50.790159, 4.380602 | 16 | open | no gate | - | open / no gate / - | (browser turn) |
| 6 | villas, Fort-Jaco | Avenue du Fort-Jaco | villa | K6 2167.3, 986 | 50.790141, 4.380243 | 20.2 | gate | gate | gate | drive / no gate / open | (browser turn) |
| 7 | villas, Prince d'Orange | Avenue Hamoir | villa | I5 1397.6, 136 | 50.797783, 4.369327 | 7.3 | drive | gate | open | drive / no gate / open | (browser turn) |
| 8 | villas, Prince d'Orange | Avenue des Hospices | villa | E10 -654.6, 2686.5 | 50.774851, 4.340231 | 7.4 | hedge | no gate | - | open / no gate / - | (browser turn) |
| 9 | villas, Prince d'Orange | Avenue des Hospices | villa | F10 -360, 2531 | 50.776250, 4.344407 | 8.5 | hedge | gate | open | hedge / no gate / open | (browser turn) |
| 10 | villas, Prince d'Orange | Avenue du Prince d'Orange | villa | I9 1293.5, 2254.5 | 50.778738, 4.367851 | 13.2 | hedge | gate | open | hedge / no gate / open | (browser turn) |
| 11 | villas, Prince d'Orange | Avenue du Prince d'Orange | villa | H8 768.4, 1837.1 | 50.782490, 4.360405 | 18.7 | hedge | gate | gate | hedge / gate / gate | (browser turn) |
| 12 | villas, Prince d'Orange | Avenue Hamoir | villa | H4 915, -340.5 | 50.802066, 4.362481 | 5.7 | hedge | gate | - | open / no gate / - | (browser turn) |
| 13 | villas, Observatoire | Avenue Circulaire | terraced | G5 463.5, 49.8 | 50.798557, 4.356077 | 5.7 | gate | gate | gate | gate / gate / gate | (browser turn) |
| 14 | villas, Observatoire | Avenue Houzeau | terraced | H4 664.5, -229 | 50.801064, 4.358928 | 7.2 | hedge | gate | open | open / no gate / open | (browser turn) |
| 15 | villas, Observatoire | Avenue Brugmann | terraced | E3 -493.3, -695.6 | 50.805256, 4.342502 | 8.6 | hedge | no gate | - | hedge / no gate / - | (browser turn) |
| 16 | villas, Observatoire | Avenue Circulaire | terraced | G5 468.8, 38.5 | 50.798659, 4.356153 | 5 | hedge | gate | open | hedge / gate / open | (browser turn) |
| 17 | villas, Observatoire | Avenue Brugmann | terraced | E3 -552.9, -556.8 | 50.804008, 4.341657 | 5.1 | gate | gate | gate | drive / no gate / open | (browser turn) |
| 18 | villas, Observatoire | Avenue de l'Observatoire | villa | I4 1337, -278.8 | 50.801512, 4.368468 | 7 | railing | gate | - | open / no gate / - | (browser turn) |
| 19 | rows, Saint-Job | Chaussée de Saint-Job | terraced | E6 -655, 969.5 | 50.790287, 4.340217 | 5.1 | gate | gate | gate | drive / gate / open | (browser turn) |
| 20 | rows, Saint-Job | Chaussée de Saint-Job | terraced | E7 -975.2, 1077.1 | 50.789318, 4.335676 | 5 | hedge | gate | open | hedge / gate / open | (browser turn) |
| 21 | rows, Saint-Job | Rue Basse | terraced | G5 22.4, 467.7 | 50.794799, 4.349822 | 4.1 | gate | gate | gate | gate / gate / gate | (browser turn) |
| 22 | rows, Saint-Job | Rue Basse | terraced | G6 84.4, 571.8 | 50.793864, 4.350702 | 4.1 | pillar | gate | open | hedge / no gate / open | (browser turn) |
| 23 | rows, Saint-Job | Venelle de Saint-Job | terraced | I6 1075, 599.5 | 50.793616, 4.364752 | 2.5 | wall | gate | - | open / gate / - | (browser turn) |
| 24 | rows, Saint-Job | Rue Jean Benaets | terraced | I6 1033, 624.8 | 50.793388, 4.364156 | 17.1 | gate | gate | open | open / no gate / open | (browser turn) |
| 25 | rows, Vanderkindere | Avenue Coghen | terraced | E3 -643.4, -875.3 | 50.806871, 4.340371 | 7.7 | hedge | gate | - | hedge / no gate / - | (browser turn) |
| 26 | rows, Vanderkindere | Rue Victor Allard | terraced | C4 -1667.3, -220.6 | 50.800981, 4.325850 | 14.3 | hedge | gate | - | hedge / no gate / - | (browser turn) |
| 27 | rows, Vanderkindere | Avenue Molière | terraced | H1 697.4, -1831.6 | 50.815470, 4.359392 | 5 | hedge | gate | - | hedge / gate / - | (browser turn) |
| 28 | rows, Vanderkindere | Rue Victor Allard | terraced | D4 -1213.6, -294.5 | 50.801647, 4.332286 | 9.6 | hedge | - | gate | hedge / - / gate | (browser turn) |
| 29 | rows, Vanderkindere | Avenue Coghen | terraced | E2 -656, -1362.5 | 50.811250, 4.340190 | 5.1 | gate | gate | gate | drive / no gate / open | (browser turn) |
| 30 | rows, Vanderkindere | Rue de Boetendael | terraced | F2 -481.6, -1447 | 50.812011, 4.342664 | 14.1 | hedge | gate | - | hedge / gate / - | (browser turn) |
| 31 | rows, Calevoet | Rue Égide Van Ophem | terraced | C6 -1593.9, 527 | 50.794261, 4.326897 | 5 | gate | gate | gate | drive / no gate / open | (browser turn) |
| 32 | rows, Calevoet | Rue du Bourdon | terraced | D8 -1163.9, 1796.6 | 50.782849, 4.333005 | 4 | hedge | gate | open | hedge / gate / open | (browser turn) |
| 33 | rows, Calevoet | Rue Zandbeek | terraced | C7 -1522.2, 1475.2 | 50.785737, 4.327922 | 4.9 | gate | gate | gate | railing / gate / gate | (browser turn) |
| 34 | rows, Calevoet | Chaussée de Drogenbos | terraced | C7 -1491.9, 1286 | 50.787438, 4.328350 | 16.9 | railing | gate | - | railing / gate / - | (browser turn) |
| 35 | rows, Calevoet | Rue Zandbeek | terraced | C8 -1626, 1625.5 | 50.784385, 4.326451 | 5.5 | hedge | - | open | hedge / - / open | (browser turn) |
| 36 | apartment blocks | Rue Roberts Jones | apartment | G3 187, -766.7 | 50.805897, 4.352153 | 8 | railing | gate | gate | railing / gate / open | (browser turn) |
| 37 | apartment blocks | Avenue des Cytises | apartment | J8 1872.2, 1490.6 | 50.785605, 4.376057 | 18.1 | hedge | no gate | - | hedge / gate / - | (browser turn) |
| 38 | apartment blocks | Avenue des Aubépines | apartment | I10 1434.6, 2849 | 50.773394, 4.369851 | 5.6 | hedge | - | - | hedge / - / - | (browser turn) |
| 39 | apartment blocks | Rue de la Primevère | apartment | H1 785.7, -1810 | 50.815276, 4.360645 | 5.6 | hedge | no gate | - | hedge / no gate / - | (browser turn) |
| 40 | apartment blocks | Avenue Bourgmestre Jean Herinckx | apartment | F2 -25, -1228.1 | 50.810044, 4.349144 | 4.9 | hedge | gate | - | hedge / gate / - | (browser turn) |

## 3. Causes and fixes

Numbers are city-wide frontages / paths (before -> after). The causes were found by tracing frontages back through the
build (`GARDEN_DEBUG_BU=<id> python tools/gardens/build_gardens.py --tile T --out <dir>`: every ray sample's fate).

| cause | where | what it did | fix (`tools/gardens/build_gardens.py`) |
|---|---|---|---|
| a. street-wide "open" style | style rule | each street draws a dominant style that 60 % of its houses follow; "open" (5-6 % of the mix) as the dominant left whole streets open (Rue du Ham I6: 9 fronts) | "open" only as a house's own pick, 1 in 3 of the old picks (the rest re-drawn from the mix without it; every other house keeps its style): ruleOpen 247 -> 40 |
| b. two faces of one wall drop each other | spot conflicts | UrbIS splits a facade into stacked coplanar faces; the "nearer face wins" order compared SAMPLES (ext, gap): where the two gaps cross along the run each face beat the other's next sample and BOTH dropped the spot (Av. Dupuich G2: 12 m of a villa front open) | the order per FACE (ext, the face's median gap, the wider face): runShort 143 -> 52, openings 231 -> 123 |
| c. door inside a driveway | openings merge | the door's opening merged into the driveway's: no pedestrian gate, the path walked through a driveway that was gated 55 % of the time (4,946 doors) | a pedestrian gate BESIDE the driveway sharing its pier, on the door's side where the run has room (4,112), else carved from a drive >= 4.1 m (690); 834 still walk through the drive |
| d. door near a run end | openings | the 0.6 m sliver to the run end joined the opening: wider than 1.6 m, so no leaf, one pier | the pedestrian opening moves to the end (pier on the run end), a gate's width |
| e. door on another face | openings | only the door face's door made a gate: a garden face without the door (a side door, a corner plot) had no way in at all | one access gate on the building's longest run, nearest its door (2,996) |
| f. hedge-front leaf | gate width / swing | hedge fronts counted no pier width: 1.34 m leaves (bars stretched 34 %, 0.2 m into each pier), swung up to 100 deg into the hedge's end | the leaf between the piers' faces (0.98 m); <= 77 deg beside a hedge |
| g. driveway gates 55 % everywhere, never open | car gates | a coin per drive, and a closed gate also where an OSM service road / track runs through it (14 across a used way) | 3 in 4 on drives >= 5 m deep, 1 in 2 shorter, open forecourt > 4.6 m; an OSM gate node always gets a gate (to 5.2 m); a gate across a way a car uses stands OPEN (both leaves swung into the garden, no stand-in; viewer/gardens/gardenKit.js): 0 across |
| h. shop radius | face rules | an OSM shop point within 6 m made a building a shop: the houses either side of a shop in a row lost their gardens | 2.5 m (skip_shop 2,130 -> 1,475) |
| i. OSM gate nodes unused | inputs | barrier=gate / swing / sliding / wicket nodes were loaded and never read | an opening (driveway if motor_vehicle / sliding, else pedestrian) with a leaf (12 on runs) |
| j. viewer drops | main.js clearRoads | pieces on the carriageway (0.3 m in) cleared: 36 -> 29 frontages | unchanged (right: the carriageway is not private land; the roads job's band rule) |
| k. data gaps | faces | no street within 35 m / blocked by another building (nohit 45), the census and the build reading the line differently (faceRules 24) | left: the census lists them (`--worst`) |

Budgets and LODs were checked and are not a cause: the gate pieces stream to 150 m (driveway pairs 160 m) like the
railings, nothing is capped per tile.

Open by design (not counted as mistakes): shops (76 garden fronts open), apartment-block forecourts and OSM car parks /
retail areas, the paved garage fronts the data draws as one long driveway (CR42L wider than 4.6 m), 40 individual open
lawns. Inside a driveway the walk still goes through an ungated drive in 357 cases (no room beside it).

Viewer (`?gates=old` keeps all of it as before): `viewer/gardens/cityGardens.js` reads data/gardens/old with
?gates=old; the tile worker's retaining walls / steps read the same set (`entry.gatesOld`, viewer/tileData.js
gardenDoc: WORKER CODE, the bundle is rebuilt at the merge); `gardenKit.js` draws an open driveway pair (kind 1,
open > 0) with both leaves swung in and no stand-in, `gardenClear.js gardenPieces` gives it no collider.

## 4. Counts (all 120 tiles)

`docs/census/gates_old.json` (?gates=old) -> `docs/census/gates_after.json` (both with the frontage list); the
frontages are the same 15,316 houses (the census's geometry does not depend on the garden data).

| | before | after |
|---|---|---|
| house frontages with a garden (villa + terraced) | 8,035 | 8,004 (31 drawn paved to the facade) |
| of them open by mistake | 879 (10.9 %) | 302 (3.8 %) |
| villas open | 189 / 1,579 | 57 / 1,578 |
| rows open | 705 / 6,456 | 268 / 6,426 |
| apartment blocks open | 86 / 853 | 31 / 849 |
| door paths with a gate at the line (all types) | 4,355 / 8,646 (50.4 %) | 7,426 / 8,618 (86.2 %) |
| villas | 742 / 1,466 | 1,250 / 1,465 |
| rows | 3,125 / 6,309 | 5,485 / 6,284 |
| apartment blocks | 488 / 813 | 675 / 811 |
| driveways with a driveway gate | 2,016 / 5,312 (38.0 %) | 2,494 / 5,299 (47.1 %) |
| gates drawn | 6,153 (3,556 pedestrian, 2,597 closed pairs) | 13,332 (10,140 pedestrian, 3,166 closed + 26 open pairs) |
| closed driveway gates across a used way | 14 | 0 |
| piers | 41,754 | 53,045 |
| house paths still without a gate | 4,291 | 1,192 (inDrive 353, frontOpen 216, gap 205, noOpening 139, leafMissing 94) |

The gate row with `--old` fails on openByMistake 879 > 302, houseOpenPm 109 > 38, pathUngated 4,291 > 1,192,
pathGatedPm 504 < 862, driveGatedPm 380 < 471 and gateAcrossDriven 14 > 0.

Before the census learned driveways (a ray through a UrbIS CR42L line counted open), the old data read 2,777 open:
most of those were driveway mouths and garage forecourts, open by design.

### Fitted to the built tile (`tools/gardens/fitGardens.mjs`, after the build)

Coordinator review: no garden piece in a driven lane, no gate over a step without steps; both at build time.

- `--lanes`: the pieces main.js keeps (as driveCheck.mjs clears them) tested against the car's LANE carriageway
  (carriageway.js lanesOnly, 0.3 m in), which is not the drivenAt test main.js clears by: on kerbless streets the
  property line is the UrbIS roadway's edge and the piers / walls on it hung 0.3-0.5 m over the roadway (B6 Prof. Hustin,
  G10 Dolez, D6 Engeland, J4, G6 Kauwberg: drivecheck cause b). Where the lane is on a measured roadway / tram road, the
  whole RUN (segments, piers and gates joined end to end, and its hedge) moves back into the garden 0.1-0.8 m as one
  (232 runs, 3,015 pieces, mostly 0.1-0.2 m; nothing opens at a joint); with no clear place within 0.8 m the pieces on
  the roadway go (5 piers dropped, 3 walls cut). `--check` (gate row `gardenlanes`): gardenInLane 0.
- `--steps`: the ground census's own gateNoSteps test on the tile built with the new doc. The steps builder now reads
  the garden behind the gates themselves (`retainWalls.js`, `gardenIndex(..., { span })` gate records): that gave F7 Rue
  de Verrewinkel 87 and E6 Dieweg 28M their steps. Two gates the walls read as BELOW the sidewalk (E8 Rue Engeland 340,
  H4 Carre Dewandeleer 4) are not placed: their openings are closed by the run's hedge. gateNoSteps 0.

### Drive check (rule 27)

Foundation 158 places -> 140; garden places 47 -> 31, cause b (a piece in a measured roadway) now 0 (the
foundation had them: B6, G10, D6, J4, G6, K11 ...); the 31 left are all cause a, lane / centre-line data over land the
street data does not measure as roadway: 27 are the OSM centre line (`paths` centre / turn only) of a street whose drawn
carriageway is narrower than its OSM band, walked over the measured sidewalk / ramp in front of the garden (class
sidewalk / ramp under the piece); 2 at I6 Montagne de Saint-Job (lane + centre line on an unmeasured stretch, the lane
band over the gardens), 2 at H6 Av. Carsoel (the tram road beside the Saint-Job deck, centre line). They are the lane
data's to fix (the drive check's own cause a), not the gardens'. Ceiling 140 (below the foundation's 158).

| tile | street | x, z | piece | blocked m | depth m | measured class | paths |
|---|---|---|---|---|---|---|---|
| I6 | Montagne de Saint-Job | 1151, 651.4 | pillar | 4 | 2.5 | roadway | centre+lane |
| C7 | Chaussée de Drogenbos | -1738.7, 1367.4 | pillar | 3 | 2.5 | sidewalk | centre |
| J7 | Drève de Carloo | 1647.4, 1137.9 | pillar | 2.5 | 2.5 | sidewalk | centre |
| B7 | Rue des Trois Rois | -2045.1, 1432.9 | pillar | 2 | 2.5 | ramp | centre |
| E6 | Rue du Château d'Eau | -535.8, 848 | pillar | 2 | 1.5 | sidewalk | centre |
| F3 | Avenue de l'Échevinage | -245.6, -513.2 | pillar | 2 | 2.5 | sidewalk | centre |
| G4 | Chemin de la Source | 270.5, -460 | pillar | 2 | 1.5 | sidewalk/ramp | centre |
| G5 | (no named road within 60 m) | 344.1, 147.8 | pillar | 2 | 2.5 | sidewalk | centre |
| G5 | (no named road within 60 m) | 351.7, 145.4 | pillar | 2 | 2.5 | sidewalk | centre |
| I6 | Montagne de Saint-Job | 1140, 681.9 | pillar | 2 | 1.5 | roadway | centre+lane |
| B6 | Rue Professeur Hustin | -2016.5, 905.7 | wall | 1.5 | 2.5 | roadway | centre |
| E7 | Chaussée de Saint-Job | -825.7, 1033.8 | pillar | 1.5 | 2.5 | sidewalk | turn |
| F3 | Avenue de l'Échevinage | -294.1, -503.7 | pillar | 1.5 | 2.5 | sidewalk | centre |
| F4 | Avenue du Manoir | -367, -445.3 | pillar | 1.5 | 2.5 | sidewalk | centre |
| H6 | Avenue Jean et Pierre Carsoel | 936.6, 530.7 | wall | 1.5 | 2.5 | tram road | centre |
| J4 | Avenue du Vert Chasseur | 1621.4, -317.8 | pillar | 1.5 | 2.5 | sidewalk | centre |
| J7 | Drève de Carloo | 1646.9, 1138.1 | wall | 1.5 | 2.5 | sidewalk | centre |
| C5 | Rue de la Magnanerie | -1750.7, 116.9 | pillar | 1 | 2.5 | sidewalk | centre |
| D5 | Rue Camille Van Exter | -1053.1, 154.3 | pillar | 1 | 0.3 | roadway | centre |
| D9 | Rue de la Cueillette | -1037.2, 2007 | pillar | 1 | 2.5 | sidewalk | centre |
| E6 | Dieweg | -965, 793.5 | pillar | 1 | 1.5 | sidewalk | centre |
| E6 | Rue du Château d'Eau | -600.8, 741.3 | pillar | 1 | 1.5 | sidewalk | centre |
| E7 | Rue Geleytsbeek | -548.9, 1043.2 | car gate (closed) | 1 | 2.5 | sidewalk | turn |
| E8 | (no named road within 60 m) | -950.5, 1946.7 | pillar | 1 | 1.5 | sidewalk | centre |
| E8 | Avenue de la Gazelle | -660.8, 1832 | pillar | 1 | 2.5 | sidewalk | centre |
| F4 | Avenue des Statuaires | -67.9, -409.3 | pillar | 1 | 1.5 | sidewalk | centre |
| H6 | Avenue Jean et Pierre Carsoel | 935.1, 530.8 | pillar | 1 | 2.5 | tram road | centre |
| J4 | Avenue du Vert Chasseur | 1536.8, -278.8 | pillar | 1 | 2.5 | sidewalk | centre |
| E7 | Chaussée de Saint-Job | -923.5, 1064.3 | pillar | 0.5 | 2.5 | sidewalk | centre |
| F9 | Avenue du Furet | -68.5, 2106.8 | wall | 0.5 | 2.5 | sidewalk | centre |
| J4 | Opstalweg | 1660.3, -243.1 | pillar | 0.5 | 2.5 | roadway | centre |

### Ground (rule 31 census, the `ground` row)

The garden rebuild moves the tile worker's retaining walls (they follow the garden fronts and open at gates):
foundation -> gates over 310 -> 305, bareBank 575 -> 553, lump 867 -> 868 (E4 Rue du Doyenne 118: no garden piece
within 10 m, a group boundary), spike 171 -> 174 (small weld spikes beside moved walls: D3 Asselbergs 74, H5 Equateur
20A, G10 Chantemerle 4), gardenVoid 0, gateNoSteps 0. Ceilings set to these.

### The roads census

`roads`: gardenDroppedM (metres of kit pieces main.js clears off the carriageway) 1,787 -> 1,853: more fronts placed,
the same clearing; ceiling 1,853.

## 5. Perf

Everything is instances in the kit's existing pools (gate_*, cargate_*, pillar, pcap: the same 3-LOD / thin-bar card
pieces, viewer/thinBars.js rule 35): **no new piece, no new draw call, no new material**. City-wide +7,163 gates
and +11,291 piers; the per-tile budget is in the gate row (the busiest tile: 449 leaves, 1,428 piers; ceilings 460 /
1,430). The streamer gathers near the camera only (gates end at 150 m, the modelled bars within 6 m, cards of 2
triangles beyond); the tile's garden add stays sliced (rule 22). data/gardens/old is a byte copy of the committed files
(the same git blobs).

## 6. Browser turn (to do)

1. Street View, look only, the 40 frontages of section 2: per frontage gate / fence / hedge / wall / open and the
   style; count where ours differs (line kind, path gate, driveway gate); a class of misses becomes the next rule.
2. Drive a few streets (Av. du Prince d'Orange, Av. Hamoir, Ch. de Saint-Job / Rue Basse, Av. Coghen, Rue Zandbeek,
   Av. Leo Errera's garage row): the gates beside driveways read as one pair with the drive's gate (shared pier), no leaf
   through a pier, hedge-front leaves clear of the hedge, the open driveway pairs on service roads (24 city-wide, e.g.
   Rue Zandbeek C8) swung in and drivable, steps under gates over a bank.
3. A/B `?gates=old` vs default at the same spots; walk past a gate row (cards 2.5-6 m, no popping, rule 35 shimmer).
4. Perf: the preflight + the police drive with and without ?gates=old (instances only: expect noise).
5. The worker bundle (tileData.js gatesOld) rebuilt at the merge: `node tools/build_worker.mjs`.
