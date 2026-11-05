# The shared material library (`viewer/materials/`)

One set of named, parameterised TSL node materials for the city, the hero buildings (Royal Observatory on
`claude/observatory`, Saint-Job) and the future façade kit. Lab: `labs/material-lab.html`. Status: **proposal** — the
city does not use it yet; the owner picks variants and parameters in the lab first (`viewer/materials/choices.json`).

## Files

| File | What |
|---|---|
| `viewer/materials/library.js` | `createMaterial(name, opts)`, `DEFS`, `MATERIAL_NAMES`, `SCAN_MATERIALS`, `paramSpec`, `setParam`, `applyChoice`, `readParams`, `createLook`, `meanColour`, `splitAt` |
| `viewer/materials/patterns.js` | AA pattern helpers: `bond` (running-bond courses), `cells` (jittered Worley setts / gravel), `seams`, `streakNoise`, `woodGrain`, `isoLine`, `farK` / `bumpK` (footprint fades) |
| `viewer/materials/scans.js` | `loadScans(renderer)`: the CC0 scans as KTX2 (UASTC, BC7/ASTC on the GPU) or WebP (`?scans=webp`) |
| `viewer/materials/textures/` | `<mat>_albedo.ktx2/.webp`, `<mat>_nra.ktx2/.webp` (normal x,y + roughness + AO), `scans.json` (source, size per repeat, mean colour) |
| `tools/textures/` | `fetch_textures.py` -> `process_textures.py` -> `encode_ktx2.mjs` (`cd tools/textures && npm install`) |

## Use

```js
import { createMaterial, setParam, applyChoice } from "../viewer/materials/library.js";
import { loadScans } from "../viewer/materials/scans.js";
await loadScans(renderer);                               // only for variant "scan" / "hybrid"
const brick = createMaterial("brick_red_brussels", { mapping: "uv", variant: "proc", varAttr: "aMatVar" });
setParam(brick, "dirt", 0.5);                            // live uniform, no recompile
applyChoice(brick, choices.materials.brick_red_brussels);
```

Options (compile time, each combination is one shader): `variant` proc | scan | hybrid | split; `mapping` world |
uv (metres) | triplanar; `varAttr` (vec4 per vertex or instance: seed, brightness, warm/cool, age; 0.5 = neutral);
`heightNode` (m above ground; default `positionWorld.y - baseY`); `drip` node or `dripAttr` (vec4 x0, x1, yTop, on in uv
metres: streaks under a sill); `edgeNode` (lawn_edge); `look` (share live uniforms between several meshes); `side`.

Every material outputs colour, roughness, metalness, a view-space normal (procedural height -> surface-gradient bump,
plus the scan's tangent normal through a per-face frame: world frame, uv cotangent frame or the three triplanar
frames), AO (indirect light only) and, for glass, a night glow. Antialiasing: the pixel footprint `fw` (fwidth of the
world position) box-filters every joint (`filteredPulse`), fades every per-unit tone to its mean, flattens every relief
before its edges alias, and fades the scans to their mean colour + macro variation where their repeat would show. No
hard switch anywhere: the far look is the integral of the near one.

## Common inputs (every material)

| Input | Range | Meaning |
|---|---|---|
| `scale` | 0.25-4 | pattern size multiplier |
| `wear` | 0-1 | chipped arrises, worn paint, polished tops |
| `dirt` | 0-1 | low-frequency soiling, splash zone at the wall base, dirt in joints |
| `moss` | 0-1 | moss / algae on up- and north-facing parts, joints, the damp base |
| `damp` | 0-1 | rising damp band (0.15 + 1.1 x damp m), salt line on brick / white stone / mortar |
| `streaks` | 0-1 | rain streaks below ledges (vertical faces), x `drip` |
| `roughness`, `normal`, `macro`, `variation`, `seed`, `baseY` | | multipliers, metre-scale tone, per-instance strength, seed, ground height |
| `scanTint`, `scanScale`, `hybridNear` | scan materials | scan detail re-centred on `color`; repeat size; hybrid switch distance (m) |

## The materials

| Name | What | Own inputs | Variants |
|---|---|---|---|
| `brick_red_brussels` | Brussels red-brown brick, 21 x 6.5 cm running bond, lime mortar, burnt headers, firing clouds, chipped arrises, pillow relief | color, color2, mortar, course, length, joint, recess, burnt | proc / scan / hybrid |
| `brick_yellow` | Flemish yellow brick | same | proc |
| `brick_dark` | dark purple-brown clinker | same | proc |
| `mortar` | lime mortar alone (joints as their own slot) | color, color2 | proc |
| `stone_white` | white / cream limestone ashlar (bands, dressings): courses of random length, oolite grain, black gypsum crust where sheltered | color, color2, mortar, course, length, joint, crust | proc / scan / hybrid |
| `stone_blue` | Belgian blue stone (petit granit): honed / bush-hammered face, 2 cm chiselled margin, crinoid fossils, calcite veins, pales where rain washes it | color, color2, course, length, joint, fossils, weathered | proc / scan / hybrid |
| `render_white` | lime render, white: sand grain, trowel waves, hairline cracks | color, color2, cracks | proc |
| `render_painted` | painted render, colour per building, peeling to the grey render | color, color2, cracks, peel | proc |
| `slate` | natural slate, lapped courses with the step relief, greenish / rusty slates, lichen, worn edges | color, color2, course, length, joint, lap | proc / scan / hybrid |
| `roof_tiles_red` | Flemish S pantiles: roll + trough profile, laps, lichen | color, color2, course, length, roll | proc |
| `zinc_roof` | pre-weathered zinc standing seam, white carbonate run-off | color, color2, length, seam | proc |
| `copper_patina` | green copper (domes): verdigris mottling at three scales, run-off streaks, brown-black copper where sheltered (metallic) | color, color2, color3, patina, length, seam | proc / scan / hybrid |
| `painted_metal_white` | painted steel (observatory domes, railings): orange peel, panel seams + rivet rows, rust bleeding from seams | color, color2, length, course, rivets, rust | proc |
| `cast_iron_green` | Uccle bollards / railings: casting texture, curvature-driven edge wear to dark iron | color, color2, gloss | proc |
| `wood_frame_white` | painted joinery: grain under the paint, cracks along the grain, flakes to grey wood | color, color2, grainDir | proc |
| `wood_frame_dark` | stained hardwood joinery | color, color2, grainDir | proc |
| `glass_window` | window glass: analytic sky reflection (Fresnel) over a dark room, dirt film, smears, night glow | color, color2, glow | proc |
| `cobbles` | Place de Saint-Job setts (the `cobbles.js` algorithm): jittered rows, domed and tilted stones, sandy joints, polished tops | color, color2, mortar, length, course, dome | proc / scan / hybrid |
| `paving_concrete` | Brussels 30 x 30 grey sidewalk tiles, chipped corners, chewing gum | color, color2, mortar, length, joint, gum | proc / scan / hybrid |
| `asphalt` | asphalt: aggregate chips, repair patches with sealed seams, sealed cracks | color, color2, patches, cracks, aggregate | proc / scan / hybrid |
| `gravel_path` | dolomite park path: stones, fines, trodden lines | color, color2, stone | proc |
| `lawn_edge` | lawn with a trodden, bare edge (`edgeNode` = m from the edge) | color, color2, soil, edge | proc |

## Variants and cost

Measured in the lab ("bench ALL materials"): full-screen 30 x 30 m wall, 1500 x 800 canvas at DPR 1, post chain off,
GPU ms per frame over a plain `MeshStandardNodeMaterial` (WebGPU timestamp queries, median of ~2 s). Shader size =
non-empty lines / KB of the generated WGSL fragment shader. Texture memory: KTX2 transcodes to BC7 / ASTC, 1 byte per
texel, 2 maps x 1024² + mips = 2.7 MB per scan material on the GPU (the WebP fallback would be 11 MB as RGBA8).

### Bench results (2026-11-05, the owner's machine, WebGPU, shared with other tabs)

Whole-frame GPU ms with ONLY the 30 x 30 m wall on screen (1500 x 800 canvas at DPR 1.5 = 2.7 Mpx, post off,
shadow maps frozen), lowest of three 1.5 s medians; "plain" = a `MeshStandardNodeMaterial` with a colour. Timestamps
come in ~0.065 ms steps and the GPU may downclock at this load: read differences of less than ~0.15 ms as equal. The
material's own cost per full screen = column - plain (at 1080p, x 0.75). Shader = non-empty lines / size of the WGSL
fragment shader (lighting included). Textures: GPU MB (BC7 / ASTC) / download MB (KTX2) per scan material.

| Material | plain | proc | scan | hybrid | proc triplanar | WGSL proc | WGSL scan | WGSL hybrid | textures |
|---|---|---|---|---|---|---|---|---|---|
| brick_red_brussels | 1.31 | 2.69 | 2.42 | 2.69 | 2.62 | 423 / 35 KB | 347 / 25 KB | 441 / 36 KB | 2.67 / 2.37 |
| brick_yellow | 1.31 | 2.69 | — | — | 2.75 | 423 / 35 KB | — | — | 0 |
| brick_dark | 1.31 | 2.56 | — | — | 2.69 | 423 / 35 KB | — | — | 0 |
| mortar | 1.38 | 2.42 | — | — | 2.36 | 343 / 26 KB | — | — | 0 |
| stone_white | 1.31 | 2.69 | 2.49 | 2.75 | 3.08 | 421 / 35 KB | 347 / 25 KB | 439 / 37 KB | 2.67 / 1.54 |
| stone_blue | 1.31 | 2.82 | 2.16 | 2.82 | 3.54 | 579 / 40 KB | 339 / 24 KB | 597 / 42 KB | 2.67 / 2.23 |
| render_white | 1.31 | 2.62 | — | — | 2.95 | 527 / 33 KB | — | — | 0 |
| render_painted | 1.31 | 2.69 | — | — | 3.41 | 549 / 37 KB | — | — | 0 |
| slate | 1.31 | 2.49 | 1.51 | 2.42 | 2.62 | 352 / 26 KB | 307 / 20 KB | 370 / 28 KB | 2.67 / 2.51 |
| roof_tiles_red | 1.31 | 2.42 | — | — | 2.56 | 333 / 23 KB | — | — | 0 |
| zinc_roof | 1.31 | 2.56 | — | — | 2.69 | 364 / 27 KB | — | — | 0 |
| copper_patina | 1.31 | 2.62 | 2.49 | 2.69 | 2.82 | 367 / 29 KB | 344 / 24 KB | 403 / 32 KB | 2.67 / 2.18 |
| painted_metal_white | 1.31 | 2.29 | — | — | 2.69 | 382 / 28 KB | — | — | 0 |
| cast_iron_green | 1.31 | 2.56 | — | — | 2.29 | 315 / 24 KB | — | — | 0 |
| wood_frame_white | 1.44 | 2.69 | — | — | 2.95 | 338 / 26 KB | — | — | 0 |
| wood_frame_dark | 1.44 | 2.69 | — | — | 2.95 | 335 / 26 KB | — | — | 0 |
| glass_window | 1.70 | 2.56 | — | — | 2.29 | 290 / 21 KB | — | — | 0 |
| cobbles | 1.70 | 2.49 | 1.44 | 2.82 | 4.39 | 633 / 40 KB | 307 / 20 KB | 651 / 42 KB | 2.67 / 2.52 |
| paving_concrete | 1.64 | 2.75 | 1.97 | 2.82 | 3.02 | 371 / 28 KB | 307 / 20 KB | 389 / 30 KB | 2.67 / 2.20 |
| asphalt | 1.31 | 2.36 | 2.16 | 2.49 | 2.82 | 514 / 33 KB | 324 / 22 KB | 549 / 36 KB | 2.67 / 2.56 |
| gravel_path | 1.25 | 2.42 | — | — | 3.15 | 492 / 34 KB | — | — | 0 |
| lawn_edge | 1.31 | 2.29 | — | — | 2.88 | 344 / 27 KB | — | — | 0 |

Reading: every procedural material costs about +1.0 to +1.5 ms per FULL screen of 2.7 Mpx over a flat colour (a
city frame has each surface on a fraction of the screen, and the façades today already pay a similar shader); the scans
are cheaper per pixel (2 texture fetches instead of the pattern maths: -0.3 to -1 ms per full screen) but cost
2.7 MB GPU and ~2.3 MB download each; hybrid = proc + scan (both evaluated, blended by distance); triplanar adds
+0.1 to +1.9 ms (three pattern evaluations; cobbles worst). About half of each procedural material's cost is the shared
weathering (`finish()`: macro tone, soiling, streaks, damp, salt, moss): it was 2x before it moved to 2D value noise in
the world frame (the first measurement, 3.65 ms for brick, is why).

## City sample: today -> library

The lab's "city" view builds a short street twice on the same footprints: once with the library (windows, sills,
plinths, cornices as geometry, what the façade kit will do), once with today's city shaders fed the attributes the tile
builder computes (`facades.js` wallMaterial / roofMaterial, `roadPaint.js` asphalt / concrete / verge, `cobbles.js`).

| Today | Library |
|---|---|
| `facades.js` wallMaterial style 0 / 1 / 2 (red / brown / yellow brick) | `brick_red_brussels` / `brick_dark` / `brick_yellow` |
| wallMaterial style 3 / 4 / 5 (white / cream / grey render) | `render_white` / `render_painted` (colour per building) |
| wallMaterial plinth band, sills | `stone_blue` |
| wallMaterial cornice band, landmark ashlar (style 6) | `stone_white` |
| wallMaterial frames, doors | `wood_frame_white`, `wood_frame_dark` |
| wallMaterial glass + `interiorRoom()` | `glass_window` (the interior mapping stays a façade feature, feeding the glass) |
| roofMaterial clay / slate (orthophoto colour) | `roof_tiles_red` / `slate` (`color` per building through `varAttr`) |
| `roadPaint.js` asphaltMaterial | `asphalt` (markings stay in roadPaint, drawn over the library surface) |
| roadPaint concreteMaterial slab / kerb / apron | `paving_concrete` / `stone_blue` / `cobbles` |
| `cobbles.js` cobbleMaterial, `plazas.js` settsLook | `cobbles` |
| cobbles.js pitMaterial edging | `stone_blue` |
| roadPaint vergeMaterial, ground grass | `lawn_edge` |
| `stjobModel.js` masonry / roof / metal | `brick_red_brussels` + `stone_white` + `stone_blue` / `slate` / `cast_iron_green` (uv mapping) |
| lamps.js, lampModel.js, furniture.js iron | `cast_iron_green`, `painted_metal_white` |

## Integration steps (after the owner's choice)

1. Owner picks in the lab, "download choices.json", commit it as `viewer/materials/choices.json`. Library defaults
   then read it (`applyChoice`).
2. Hero assets first (no risk to the city): the Observatory maps its slots by name with `mapping: "uv"`; Saint-Job's
   four materials become library materials (masonry = brick + stone bands by its vertex codes: a `mix` of two library
   surfaces, or split the mesh by code in Blender).
3. Ground: `cobbles.js` cobbleMaterial and `plazas.js` -> `cobbles`; sidewalks: `concreteMaterial({ framed })` keeps its
   kerb frame uv and calls the library `paving_concrete` / `stone_blue` surfaces with `mapping: "uv"`; asphalt base from
   the library under roadPaint's markings. Keep `addLampLight(m)` after `createMaterial`.
4. Façades: refactor `facades.js` wallMaterial so each wall style's surface is the library surface function (export
   `surfaceNode(name, ctx)` from library.js: col / rough / height for a given coordinate frame) while the façade keeps
   its window grid, interior mapping, shopfronts and masks; per-building variation through `aBld.w` -> `varAttr`-style
   seed, drip = the window grid's sill mask (streaks under every sill). One shader for all styles as today (styles
   mixed by `band(style, k)`): measure the cost on I6 before / after (the lab's bench says a brick wall costs about the
   same as today's).
5. Roofs: `roofMaterial` -> `slate` / `roof_tiles_red` with the orthophoto colour as `color` per building.
6. Façade kit (future): geometry with metre uvs, library materials by name, `mapping: "uv"`.
7. Scans: only where the owner prefers them; load them once (`loadScans`) at boot, 2.7 MB GPU each.

## Rules kept

- Own UI only (`viewer/panelUI.js`), `reversedDepthBuffer: true`, near 0.05 m, no coplanar overlapping faces in the
  lab's geometry (touching faces meet at edges or cross; the road strip is 1 cm above the ground).
- No mocked data; the scans are real CC0 photogrammetry (CREDITS.md), not AI-generated.
