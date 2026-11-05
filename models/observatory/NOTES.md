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
| `observatory.glb` | 5.8 MB (EXT_meshopt_compression + KHR_mesh_quantization; 19 MB raw). Nodes `Observatory` (LOD0, 184k tris), `Observatory_lod1` (66k, meshopt of LOD0, shares its vertex buffers), `Observatory_far` (24k, the script's far variant), `Observatory_lod2` (14k, the far variant trimmed). One primitive per named slot: 12 / 12 / 10 draw calls per LOD |
| `observatory_ao.png` | Cycles AO (6 m, 64 samples) in TEXCOORD_1, 2048 px: LOD0 in v 0..0.895, far in v 0.9..1; u > 0.994 a reserved constant column (0.82) for the thin faces. Loaded as R8 + mips = 5.3 MB GPU, decoded in a worker |
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

## Estimated (photos, the 1880s plan; not measured)
Storeys and bays, window sizes, band pitch 0.66 m / height 0.19 m, cornice profiles, consoles, modillions, 20 dome ribs,
slit width 0.38 R, the masonry drums under 1.25 m of metal skirt, door positions, the east towers' cornice (DSM blurred
at r 3.6: from the photo proportions). Domes: great + medium copper (owner's aerial), small + pavilions zinc (ortho),
east towers white; the SE one open (both owner photos, the 2021 DSM dip and the dark slit in the orthophoto).

## Numbers (2026-11-05, this machine, other tabs open)
- Triangles: LOD0 184,384 · LOD1 66,254 · LOD2 14,423. Draw calls 12 / 12 / 10 (+ shadow pass).
- LOD switch by distance to the campus box: LOD0 < 150 m (+-22 m fade), LOD1 < 520 m (+-60 m), dithered cross-fades
  (lodFade.js objectFade; the shadow pass follows).
- GPU (lab benchmark, median frame, + = the campus): street at the great equatorial L0 +0.26 ms; aerial L0 +0.07 ms;
  900 m L2 +0.00 ms.
- Load: GLB + AO 85-110 ms (decode in workers), no long task; shaders 0.3-1.4 s through the precompile queue before it
  shows. City flight 900 m -> 60 m -> orbit (24 s, LOD states 100/110/010/011/001 crossed): worst frame 38.7 ms, 2 frames
  > 34 ms. Live slot swap (precompiled): worst frame 23 ms.

## Sources
data/raw/refs/observatory/SOURCES.md (git-ignored): UrbIS CC0, OSM ODbL, the heritage inventory, "Le quartier de
l'Observatoire d'Uccle" (Bruxelles, Ville d'Art et d'Histoire 16; read only), the owner's photos (reference only).
