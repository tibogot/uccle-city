# Royal Observatory of Belgium (Uccle): the scripted campus

Octave Van Rysselberghe, 1883-1890 (Brussels heritage inventory 27031). Built by scripts only, from measured data:

```
python tools/observatory_measure.py                     # UrbIS solids + DSM/DTM -> site.json, site_dtm.bin (1 s)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/observatory.py -- models/observatory [--no-bake] [--previews]
node tools/observatory_pack.mjs models/observatory/observatory.raw.glb models/observatory/observatory.glb   # LODs + meshopt
```
Blender ~25 s (AO bake 15 s, CPU), ~60 s with `--previews` (docs/observatory/preview_*.png). Pack 3 s.
Viewer: `viewer/observatoryModel.js` (loader, slot materials), `viewer/observatoryCity.js` (city, `?observatory=1`),
`labs/observatory-lab.html` (the lab).

## Files
| file | what |
|---|---|
| `observatory.glb` | 5.8 MB (EXT_meshopt_compression + KHR_mesh_quantization; 19 MB raw). Nodes `Observatory` (LOD0, 175k tris), `Observatory_lod1` (66k, meshopt of LOD0, shares its vertex buffers), `Observatory_far` (24k, the script's far variant), `Observatory_lod2` (14k, the far variant trimmed). One primitive per named slot: 12 / 12 / 10 draw calls per LOD |
| `observatory_ao.png` | Cycles AO (6 m, 64 samples) in TEXCOORD_1, 2048 px: LOD0 in v 0..0.895, far in v 0.9..1; u > 0.994 a reserved column of AO 1 for the thin faces, whose AO is per vertex in COLOR_0.g. Loaded as R8 + mips = 5.3 MB GPU, decoded in a worker |
| `observatory.json` | slots, codes, placement, the measurements used, triangles per slot |
| `observatory.lods.json` | LOD triangle counts, GLB sizes |
| `site.json`, `site_dtm.*` | the measurements (input of the Blender script), the DTM patch for the lab ground and the AO bake |
| `observatory.raw.glb` | Blender's export before the pack (git-ignored) |

## Swappable materials (the Material Lab's library replaces them by name)
- No colour and no texture in the GLB; the only bake is lighting (AO).
- Slots: brick_red_brussels, stone_white, stone_blue, copper_patina, painted_metal_white, zinc_roof, slate, render_white
  (unused for now), wood_frame_white, glass_window, cast_iron_green, gravel_path, lawn_edge.
- COLOR_0.r = per-face code / 16 + 1/32: plain, band, surround, cornice, plinth, pilaster, sill, keystone, dome, rib,
  shutter, interior, seam, parapet_coping, console, door (so a library material can vary per element).
- TEXCOORD_0 = world metres, per face (walls: u along the wall, v up; domes, drums, vaults: arc length, continuous).
- The swap: `viewer/observatoryModel.js` line `const SOURCE = "temp"` -> `"./materials/index.js"` (a module exporting
  `getMaterial(name)` or `materials[name]`). Every slot material is cloned and gets the AO (`aoNode` + a share in the
  colour) and, in the city, the LOD cross-fade. Live: `model.setSlotMaterial(slot, material)` (the lab's "Material slots"
  panel does it, shaders precompiled first: no hitch).

## Measured (UrbIS 3D solids, UrbIS DSM/DTM 2021 0.5 m, CC0)
- 24 UrbIS solids replaced (`placement.hides_solids`; hidden by solid id because some BU_IDs hold other solids and one
  solid has none): footprints, bases.
- 32 parts (footprint pieces with one wall height): wall tops = DSM roof level of each part (p50, or p10 where it holds a
  dome / vault); crowns of the low hips and the residences' slate hips (DSM max).
- 7 domes: centre refined on the DSM, a sphere fitted to the cap (great R 4.15 / springing 111.75 / top 115.9;
  medium 5.2 / 111.23 / 116.43; small 2.8 / 111.99 / 114.79; pavilion W 3.0 / 109.29 / 112.29; pavilion SW 4.1 / 110.05 /
  114.15; the two east towers 2.95 / 109.02 / 111.97, the north one under trees: copied). Tower radii from the UrbIS
  footprint arcs (5.3, 4.3, 3.6, 3.25), cornice tops from the DSM profile (108.2, ~108.5 -> 109.0 to clear its wing).
- Meridian hall vault: crest 111.44 (DSM), span 9.4, the two meridian slits' shutters (DSM bumps at x 683-686 / 692-695).
- The campus axis: avenue Circulaire fitted as a circle (OSM): centre city (654.0, 131.2), r 200 m.

## Façades counted on photos (2026-11-06; `FACADES` / `WALLS` / `PLINTH_H` in tools/blender/observatory.py)
Sources: **inv** = Brussels heritage inventory photos, monument.heritage.brussels/fr/buildings/27031 (reference only,
`data/raw/refs/observatory/inventory/`, git-ignored); **own** = the owner's photos. Items are spread evenly along the face
unless centres are given; heights are above the building's FLOOR level (see below).

| part / face | source | storeys | per storey (left to right) | lights, glazing, piers |
|---|---|---|---|---|
| main building, north front | inv 0003_P01, P10 | 2 (raised ground floor, 6 steps) | ground: triplet · pedimented portal 1.5 m · triplet; upper: 3 triplets | lights 0.82 x 3.4 (ground, sill 1.6, head 5.0) and 0.82 x 2.8 (upper, sill 7.7, head 10.5) between 0.24 m stone mullion-piers; groups 4.8 m apart about the axis (measured at the photo's 35.6 px/m), broad banded brick piers between; stone corner pilasters; attic (brick + coping) to 113.9 m with a central pediment and oculus (clock); plain glazing (2 lights + transom) |
| main building, east / west | inv 0003_P10 (oblique) | 2 | 4 pairs a storey | lights 0.9; same sill / head heights as the front |
| east and west court wings, court side | own photo 1 (end bays) | 2 | ground: blind panel · 7 pairs · blind panel; upper: 9 pairs | upper lights 1.0 wide with DIAMOND glazing bars (lozenge + X), broad banded brick piers; ground floor end bays: recessed brick panels in stone frames; bay 3.9 m from the photo (so 9 bays on 34 m: middle bays inferred from that pitch) |
| court wings, ends | own photo 1 | 2 | ground: blind panels (door on the east wing's south end); upper: diamond pairs | as above |
| low galleries (east, west), north / south | own photo 1 (right), inv 0003_P03 | 1 | pair · triplet · door · triplet · pair (north); 3 triplets (south) | lights 0.75, stone mullion-piers, door with fanlight |
| great equatorial block, E / W / N | inv 0003_P04 | 2 | 2 windows a storey; N: door under one window | two lights + transom, 1.25 wide; the tower's balcony (stone slab, consoles, cast-iron railing) under its upper south window |
| domed pavilions (SW, W) | inv 0003_P08 | 1 on a 1.35 m plinth | door face: wide window · glazed double door · wide window; others: 2-3 wide windows | wide windows 1.6 (2 lights + transom), door 1.15 with steps; COPPER domes (inv 0003_P06, P08: verdigris, rust streaks) |
| residences (W, E), front onto the avenue | inv 0001_P01, 0007_P01 | 3 | arched window · arched door · arched window; 3 tall windows (hoods); 3 small square windows | STONE front (no bands), heavy cornice with modillions; walls to 112.6 m (3 storeys, the DSM's 109-110 edge was a roof foot), the 118 m hip set back behind the cornice over a flat deck (not seen from the street) |
| residences, sides / back | inv 0001_P02, 0007_P02 | 3 | 4 (sides) / 3 (back) bays: arched ground floor, rectangular above | banded brick |
| medium equatorial block (+ its N / S annexes) | inv 0003_P03 | rule | rule | wall finish: white stone with grey (blue-stone) bands |
| north-east round tower | inv 0003_P05 | — | door, small windows | a CONICAL slate roof (not a dome), cone height estimated from the photo |

**Rule-based fallback (no usable photo):** main building rear block, west wing with the small equatorial, the
connecting links, the medium equatorial's north / south annexes (openings), the meridian hall's walls, the east wing
with its two towers (walls), the glazed annex, the low barrel hall, the east block, the low annex south of the medium
equatorial, the east front pavilion, the west front block and wings (outer faces), the tall west block and its wings,
the octagonal pavilion, and the faces of the photographed parts that no photo shows (e.g. the court wings' outer sides).

**Floor level per building:** the footprint's lowest DTM point is its downhill corner (the north court stands 2.4 m above
the main building's south end): the floor sits on the 85th percentile of the DTM along its exposed walls; the blue-stone
plinth grows downhill; openings, string courses (now a stone course at every floor line) and pilasters follow the floor.

**SE dome shutter:** two leaves hinged on the slit's edges, swung open (owner photo 2; the 2021 DSM cap shows highs on
BOTH sides of a central dip, not the one-sided hump of an up-and-over shutter). Owner photo 1 (same dome, other side)
shows the hood at the top.

**AO of thin parts:** faces under 6 cm across (band tops, glazing bars, ribs, seams, railings: 164k corners on LOD0)
get no lightmap texels (they sample a reserved column of AO 1) but a per-vertex Cycles AO in COLOR_0.g, which the
loader multiplies into the lightmap AO.

## Estimated (not measured)
Band pitch 0.66 m / height 0.19 m, cornice profiles, consoles, modillions, 20 dome ribs, slit width 0.38 R, the masonry
drums under 1.25 m of metal skirt, the east towers' cornice (DSM blurred at r 3.6: from the photo proportions), the NE
tower's cone height. Window sizes on the rule-based faces. Domes: great + medium copper (owner's aerial), pavilions
copper (inventory), small equatorial zinc (orthophoto), SE tower white and open.

## Numbers (2026-11-06, this machine, other agents' tabs open)
- Triangles: LOD0 174,668 · LOD1 66,233 · LOD2 14,412 (before: 184,384 / 66,254 / 14,423). Draw calls 12 / 12 / 10.
- GLB 5.85 MB (before 5.78 MB); AO 2048² R8 + mips 5.3 MB GPU; vertex AO in the existing COLOR_0 (no extra bytes).
- LOD switch by distance to the campus box: LOD0 < 150 m (+-22 m fade), LOD1 < 520 m (+-60 m), dithered cross-fades.
- City flight 900 m -> 60 m -> orbit (24 s, LOD states 100/110/010/011/001 all crossed), second pass: p50 16.7 ms,
  p95 21.6 ms, max 51 ms (12 frames > 34 ms, all at the low pass over the campus in LOD0, GPU-bound, no single hitch).
  The same flight WITHOUT the Observatory (?observatory absent): p95 25-30 ms, max 100-130 ms (tile streaming): the
  campus adds no hitch. First pass with cold tiles: one 358 ms frame (tile streaming, also present in the baseline).
- Load: GLB + AO ~90-240 ms (decode in workers), shaders 0.2-3.7 s through the precompile queue before it shows.

## Sources
data/raw/refs/observatory/SOURCES.md (git-ignored): UrbIS CC0, OSM ODbL, the heritage inventory (text + 18 photos,
reference only), "Le quartier de l'Observatoire d'Uccle" (Bruxelles, Ville d'Art et d'Histoire 16; read only), the
owner's photos (reference only). Side-by-sides photo | before | after: docs/observatory/side_*.jpg (git-ignored: they
contain the reference photos).
