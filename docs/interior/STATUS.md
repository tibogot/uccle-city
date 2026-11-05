# Interior pilot: status (WIP, branch claude/interior)

## Decisions
- **House**: UrbIS `https://databrussels.be/id/building/1786120` (buildingsolid/539248), tile I6, at about (1081.7, 599.8),
  ~140 m west of Place de Saint-Job. Single solid, 4-corner footprint 5.66 m wide x 10.9 m deep, party walls both sides,
  street face north, eaves 8.58 m above base 68.28, ridge 13.4 m. Red brick (style 0), white frames, dark blue door.
  Façade (from the shader): ground floor door (bay 0, left) + window, first floor two windows; back: 2 + 2 windows. No
  second-floor windows (eaves too low for them in the shader), so: ground + first floor + closed attic.
  Candidates list: `node tools/interior/pickHouse.mjs`.
- **Window matching**: `viewer/interior/facadeWindows.js faceOpenings()` reproduces the shader's window grid from
  `viewer/facades.js wallMaterial()` (pier 0.55, bays ~2.6 m, storeys 3.4 / 3.0 m, door in bay floor(rnd_q * bays)).
  `tools/interior/houseSpec.mjs <BU_ID> I6 models/interior/maison1` runs the city's own `analyseBuildings` and
  writes `house.json` (faces, openings, footprint in house-local frame, neighbours, ground grid, roof). Note:
  the per-building hash in the shader is float32: compare with `Math.fround(hash01(BU_ID))`.
- **Façade cut (planned)**: add a uniform-driven discard in the shared wall material (facades.js) for the openings
  of the one building (aBld.w == hash, within a radius of the house), with a dithered fade, so the city façade shows
  the real interior through its windows and the real frames/glass/door of the interior cell replace the painted ones.
- **Portal (planned)**: interior drawn first (renderOrder) for early-Z; when the camera is inside the house and no
  window/door portal is on screen, the camera switches to an interior-only layer and the sun's shadow camera to an
  empty layer (no recompiles); otherwise city stays drawn (fragments rejected by depth).
- **Lighting plan**: Cycles bake (OptiX on the RTX 4050), DIFFUSE direct+indirect, one shared 1024² atlas (UV1) for
  Interior + FrontDoor; DAY = sky only (gradient world + surroundings as occluders), NIGHT = house lamps + street
  lamp; stored as RGBM gamma-2 PNG (lin = (rgb*a*4)^2); blended in TSL by `env.uNight`. Materials: Plaster, Wood,
  Fabric, Hard, Glow, Glass (COLOR_0 rgb = albedo, a = pattern code/8, UV0 = metres). Character indoors: two
  LightProbeGrids baked in-browser from the lightmapped interior (day/night), evaluated with
  `lightProbeGridIrradiance` in an indoor material variant (body.js needs a small variant hook).

## Done
- `tools/interior/pickHouse.mjs`, `tools/interior/houseSpec.mjs`, `models/interior/maison1/house.json`.
- `viewer/interior/facadeWindows.js` (shader mirror).
- `tools/blender/interior_kit.py` (helpers + furniture kit: sofa, armchair, tables, chairs, bed, wardrobe, bookcase
  with books, radiators, marble fireplace, mirror, pictures, rugs, lamps, curtains, plants, kitchen units, fridge,
  hood, bath, basin, toilet, desk...). Written, NOT yet run.
- `tools/blender/interior.py` (plan, shell with openings/reveals/sills/frames, partitions + open doors, floors,
  ceilings, stair 18 x 18.2 cm with balustrade, skirting, cornices, furniture placement, night lights, bake,
  RGBM encode, previews, GLB export, interior.json). Written, NOT yet run (expect a round of Python fixes).

## Update (second WIP)
- `interior.py --no-bake` RUNS: 107k triangles Interior, 0.9k FrontDoor, 1.3k Colliders, GLB 7.5 MB (uncompressed;
  compress with meshopt later), build 5 s. Openings land where expected (front door s 0.99..2.09 etc.).
- Previews (`docs/interior/blender_*.png`, 24 spp, no bake) render but are VERY dark: sky-only day light through one
  window at exposure +1. Next: raise preview exposure (+3..+4) or sky strength, check the window view (red = the
  opposite houses from `context`, expected), then judge furniture quality room by room.

## Next steps
1. Run: `& "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/interior.py -- models/interior/maison1 --no-bake --preview docs/interior --pv-samples 32`
   (use PowerShell `&`; the Bash tool refuses the quoted exe path). Fix errors, look at previews, then bake
   (drop `--no-bake`, `--samples 384`).
2. `viewer/interior/` : loader (GLB + lightmaps, TSL materials decoding the codes, day/night mix), façade cut
   uniforms in facades.js, portal/streaming (`cityInterior.js`, load within 40 m, unload beyond ~60 m).
3. `labs/interior-lab.html/.js`: house + neighbours' façades on real ground, character (PrismSet.exclude(BU_ID),
   interior collider BVH from the GLB's `Colliders` mesh), day/night, debug views, perf readout.
4. City hook `?interior=1` (one guarded import in main.js), screenshots in docs/interior/, perf numbers.
