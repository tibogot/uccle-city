# Interiors: the method (pilot: a terraced house near Place de Saint-Job)

Lab: `labs/interior-lab.html` (`?view=street|salon|kitchen|dining|stair|bedroom|bathroom|study|landing|walk`,
`?time=`, `?char=`, `?probes=0`). City: `viewer/index.html?tile=I6&interior=1` (go near UrbIS building 1786120, at about
x 1081, z 600). Screens: `docs/interior/`.

## 1. Pick the building, read what the city draws
- `node tools/interior/pickHouse.mjs` lists single-solid UrbIS houses with one street face 5-7.2 m wide near a point.
- `node tools/interior/houseSpec.mjs <BU id> <tile> <dir>` writes `house.json`: the footprint, base / eaves / top, the
  roof triangles, the neighbours (bake occluders), a ground grid, and every wall face **as the façade shader sees it**
  (the city's own `analyseBuildings`: street / party flags, width, the float32 building hash) with its openings from
  `viewer/interior/facadeWindows.js`, a line-by-line mirror of `wallMaterial()`'s window grid (pier 0.55, ~2.6 m bays,
  storeys 3.4 / 3.0 m, door bay `floor(rnd_q * bays)`). Keep the two in sync.

## 2. Build it in Blender (headless, scripted)
`blender --factory-startup -b -P tools/blender/interior.py -- models/interior/maison1 [--seed 7] [--samples 1024] [--preview docs/interior]`
then `node tools/interior/packGlb.mjs models/interior/maison1/interior.raw.glb models/interior/maison1/interior.glb`.
- A parametric two-bay plan in a "plan frame" (s across, z deep), sheared onto the real (slightly skewed) party walls.
  Hall + stair (18 risers of 18.2 cm, 24 cm going) on the door side, salon at the front, kitchen-dining at the back;
  upstairs a bedroom (+ alcove over the hall), bathroom, study, landing. Mirrored when the door is on the right.
  Layout and furniture invented and varied by `--seed`.
- Walls with real thickness (façades 30 cm, party walls 15 cm to the property line), openings cut exactly at the
  shader's rectangles, brick outer reveals, plaster inner reveals, blue-stone sills, frames with mullion / transom and
  sashes, glass; partitions with panelled doors (open), linings, architraves; skirting, cornices, ceiling roses.
- The furniture kit `tools/blender/interior_kit.py` (showcase: `interior_kit_preview.py`, `docs/interior/kit_*.png`):
  soft cushions from a rounded-box lattice, bevelled edges, turned legs, swept mouldings, pleated cloth, leaves.
- Six materials for the whole house (one draw call each): Plaster, Wood, Fabric, Hard, Glow, Glass. COLOR_0 =
  albedo (linear) + a pattern code in alpha; UV0 in metres; the patterns (parquet, grain, weave, rugs, paintings,
  marble, cement tiles, wall tiles, brick) are TSL in `viewer/interior/interiorModel.js`.

- **Prop clearance check** (`clearance_report()` in `interior.py`): every `put()` piece is recorded with its placed
  vertices; each vertex must lie inside a room rectangle of its storey (or a partition doorway, a window reveal short
  of the frame, the stairwell void), above the floor, under the ceiling and out of the stair's flight (2 mm tolerance).
  The build **fails** on a clip (`--allow-clip` to override); `--check-only` builds the geometry, prints the report and
  stops (seconds). `put(..., fit=True)` slides a piece so its whole box (foliage included) keeps 3 cm from the walls;
  plants take a `spread` (leaf tips stay inside it), curtain rods a `rod_ext` limited by the nearest wall.
- Stair: treads and risers housed 18 mm into a closed string on the hall side and a wall string (no light slit at the
  joint), an oak capping, the spandrel panelling 12 mm behind the string's face.
- Stairwell: a frosted **laylight** (plafond lumineux) in the void's ceiling under a light well and a roof light (in the
  bake: holes in the attic slab and roof occluders, the well's white walls; in the viewer: opal glass, `Glass` code 3);
  glazed fanlights (impostes) over every panelled door. Lamps: hall 60 W, landing 70 W, a stairwell lantern 80 W.

## 3. Light it in Cycles (all baked, no city lights inside)
- Three bakes (OptiX): **sky** (a gradient dome), **sun** (an afternoon sun, scaled in the viewer by the city's sun),
  **night** (the lamps on, a street lamp outside). Surroundings from `house.json` occlude the sky.
- Flat architecture (walls, floors, ceilings, reveals, tiles): a 1024² lightmap on UV1 (smart-project of coplanar
  cells = few large islands), median + edge-aware à-trous denoise, RGBM gamma-2 PNG (`lin = (rgb·a·4)²`).
- Everything else (furniture, frames, stair, mouldings): **per-corner baked light** (`_LMSKY/_LMSUN/_LMNIGHT`), the
  props mesh split to ≤ 32 cm edges for the bake, corners averaged per vertex + normal bin and Laplacian-smoothed
  (otherwise each face gets its own noise). Packed to uint8 RGBM + meshopt (`packGlb.mjs`).
- Why not one lightmap for all: smart-project shattered the furniture into thousands of tiny islands and the walls got
  no texels (tried, `docs/interior` history).
- The interior materials are unlit (`lights = false`): the city's sun shadow map never touches them, so there is
  nothing to leak at wall seams. Eye adaptation: the cell's light is eased up (`interiorLook.adaptInside`) while the
  camera is inside; from outside the rooms read darker than the street, as in daylight.

- **Mirror reflections**: per mirror (`MIRRORS` in `interior.py`), a cube of radiance rendered in Cycles from 4 cm in front
  of the glass (5 faces, 256², per light mode), packed into `refl_sky/sun/night.png` (6 faces across, a row per mirror,
  RGBM gamma 2). The viewer box-projects it: the reflected ray is intersected with the mirror's room box and the cube is
  read toward the hit point from the render point (parallax-correct on a planar mirror, no runtime render); aged
  silvering on top. Face layout and boxes in `interior.json` `mirrors`.

## 4. In the viewer
- `viewer/interior/cut.js`: with `?interior=1` the shared façade material and the terrain get a `maskNode` that
  discards the house's openings / the terrain inside it (a box in the house frame, dithered fade). Compiled in only
  then. (alphaTest broke the shadow pass in r187: an empty fragment output struct; maskNode does not.)
- `interiorModel.js`: GLB (meshopt, decoded in workers) + the PNGs. The materials are module singletons whose textures
  are TextureNodes re-pointed at the cell's maps on load; with `?interior=1` the city's boot warm-up compiles them
  under the loading cover (`interiorWarmup()`: one stand-in mesh per material with the GLB's exact attribute layout, so
  three's node-builder cache key matches), and the cell streaming in builds no shader (it was a 50-115 ms long task).
  Fabric: a bumped weave / slub / rib relief lit by a fixed soft key, a grazing-angle sheen (strong on velvet), a gentle
  top light; gilt (`Wood` code 6): a dark body plus a curvature / reflection highlight. A/B: `interiorLook.sheen`,
  `.weave`, `.mirrors` (lab Debug panel).
- `portal.js`: inside the house with no opening in view → the camera renders only the interior layer and the sun's
  shadow camera an empty layer; otherwise the near interior is drawn first (front-to-back sort) and rejects the city
  by depth. (Do not give the interior a negative renderOrder: it would draw before the Firmament sky, which paints
  without a depth test.)
- `probes.js`: the character's light inside = **ambient cubes baked in Cycles** with the cell (6-face probe cubes in
  every room at two heights, the per-face baked light = irradiance from ±x, ±y, ±z, for sky / sun / night, stored in
  `interior.json`). The CPU blends the nearest probes each frame into six uniforms; the character's unlit variant
  (`body.setVariant`) evaluates them. Zero GPU bake, zero hitch. (A first version baked three.js `LightProbeGrid`s in
  the browser: ~38 ms of main thread per bake call whatever the slice size: 14 s of hitches in the city. Dropped.)
- `cityInterior.js`: streaming (in < 40 m, out > 60 m), the façade fade, the portal, third person (house footprint
  excluded from every `PrismSet`, the cell's colliders as a `TriBVH`, heightfield off inside, door opens near).

## For Saint-Job
Same pipeline with a hand-planned nave instead of the parametric plan: openings from the church model
(`tools/blender/stjob.py`), the stained glass as the light source of the day bake, larger lightmap (2048²) for the
nave's big surfaces, pews / altar / organ as kit pieces with per-corner light.
