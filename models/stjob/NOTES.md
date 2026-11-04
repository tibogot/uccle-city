# Église Saint-Job (Uccle): the scripted hero asset

Built by `tools/blender/stjob.py` (Blender 5.0 headless, `--factory-startup`), loaded by `viewer/stjobModel.js`,
looked at in `labs/church-lab.html`. Nothing is hand-modelled: re-run the script to change it.

```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stjob.py -- models/stjob [--previews] [--no-bake]
```
~25 s (AO bake ~20 s on CPU); `--previews` adds Cycles renders from the photos' viewpoints into `docs/stjob/` (~2 min).

## Files
| file | what | size |
|---|---|---|
| `stjob.glb` | node `StJob` (LOD0, 38.6k tris) + node `StJob_far` (far variant, 5.2k tris), 4 primitives each (Masonry, Roof, Glass, Metal); empties `nest`, `spire_tip`. Attributes: POSITION, NORMAL, TEXCOORD_0 (world metres), TEXCOORD_1 (lightmap), COLOR_0 (codes) | 4.0 MB (uncompressed; gltfpack/meshopt compression would cut it ~4x) |
| `stjob_ao.png` | Cycles AO (5 m, 96 samples) in TEXCOORD_1; LOD0 in v 0..0.875, far variant in v 0.88..1 | 2048², loaded as R8 + mips = 5.3 MB GPU |
| `stjob.json` | measurements, codes, placement in the city, counts | |
| `site_dtm.bin/.json` | UrbIS DTM 2021 (CC0) 140 x 140 m around the church at 0.5 m, for the lab ground and the AO bake | 158 KB |

## Measured (UrbIS 3D solid buildingsolid/509924 + UrbIS DSM/DTM 2021 0.5 m, all CC0)
- Plan: an octagonal crossing (face 8.56 m, centre city-local 1216.19, 561.44) with EIGHT gabled wings, one per face,
  axes turned 5.29° from the grid. Wing ends from the centre: N 25.53 (front, portal + steps, onto Place de Saint-Job),
  NE 19.0, E 18.45 + three-sided apse to 22.35, SE 19.1, S 25.2, SW 15.6, W 15.3; NW = the tower.
- Heights (m TAW, DSM cross sections): wing eaves 86.5, ridges 90.1 (all eight); corner chapels eaves 82.0, apex ~85;
  drum walls 98.3; dome profile 10.05/98.6 … 2.2/109.0 (flat radius / height); lantern 109.0 / 110.6 / 115.8 / cupola
  118.5 (UrbIS); tower 9.07 m square centred 19.03 m out on the NW diagonal, walls to 104.8, slate spire tip 130.25
  (UrbIS), weathercock 135.45 (DSM maximum).
- Corner chapels: their outer walls through the footprint points (circle fit, 5 facets); stair turret r 2.4 on the
  tower's outer face (footprint points 0-11); sacristy annex at the SE (footprint 34-51, DSM ridge 82.8).
- The east end is a hipped three-sided apse at full wing height (DSM 87-88.7 m across r = 20-21.5 m), no gable.

## Estimated (from the photos, not measured)
Floor 75.40 m TAW (13 steps of ~17 cm above the street at 73.2 m); plinth top +0.9 m; the sizes and heights of
windows, roses, portal, belfry arches, clock gables, dormers, lantern piers, railing; band spacing (15 cm stone
every 1.10 m); which gables carry roses (N, S, W) and which triple lancets (NE, SE, SW) — confirmed by the lab's
photo overlays (c is taken from the SOUTH-WEST despite its file name).

## Materials (procedural TSL, `viewer/stjobModel.js`; no texture files apart from the AO)
COLOR_0.r = subtype / 8 + 1/16, .g = band pattern / 4 + 1/8 (constant per face, quantised with floor in the shader).
Masonry: Belgian red-brown brick (running bond, per-brick tone from a hash of the floored cell), white stone bands
by model height, grey sandstone plinth below +0.9 m, white stone, dark oak, dark belfry interior. Roof: slate rows
(wings/spire blue-grey, dome grey-green), moss on north faces, red paint, lead. Glass: leaded quarries, stained tints
that glow at night, AO weight 0 in the MRT (post.js). Metal: iron, gilt, clock dials. Live look uniforms: `stjobLook`.

## Sources / licences
UrbIS (Brussels Regional Informatics Centre / paradigm.brussels), CC0. Reference photos (`data/raw/refs/stjob/`, git-ignored,
never shipped): a.jpg Jean-Pol GRANDMONT CC BY-SA 3.0, b.jpg User:Tram Bruxelles CC BY-SA 4.0 (Wikimedia Commons),
c-f the owner's photos (reference only).
