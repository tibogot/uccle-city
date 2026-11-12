# The shared material library (`viewer/materials/`)

One set of named, parameterised TSL node materials for the city, the hero buildings (Royal Observatory on
`claude/observatory`, Saint-Job) and the future façade kit. Lab: `labs/material-lab.html`. Status: **proposal** — the
city does not use it yet; the owner picks a version per material in the review lab (verdicts ->
`viewer/materials/verdicts.json`; the old `choices.json` path still works at `?old=1`).

## Round 3 (2026-11-12 / 13): review lab, scans with anti-tiling, shimmer fix, candidates

**Strategy (owner, 2026-11-12): LAYERING, realistic first.** A scan base (CC0 now; Megascans after the licence check;
the texture factory's generated sets from `claude/texfactory`) with anti-tiling, plus procedural layers where
procedural is strong: weathering (dirt at the wall base, rain streaks under sills, moss on north / up faces, damp,
salt), per-building tone (`varAttr`), per-tile tone, edge wear, and the weather hooks (`weatherOpts(name)` for
claude/weather's `weatherize()`). Fully procedural only where a photo can't work (per-building paint colour) and as the
far / fallback layer. Asphalt: scan base + procedural repair patches, sealed cracks, wet low spots (`wet`).

### The review lab (`labs/material-lab.html`; the first lab stays at `?old=1`)

- LEFT: every material with badges: **P** procedural, **S n** CC0 scans, **G n** generated sets (texfactory,
  `viewer/materials/generated.json` when present), **M n** Megascans dropped in / **M? n** on the shopping list,
  GPU ms (from `viewer/materials/costs.json`), the verdict (✓ choice, needs work). Above the list: the verdict box
  (needs work, note, download verdicts.json; saved in this browser).
- CENTRE: 2-4 versions side by side (pick which in "Tune / versions shown", bottom left), the SAME wall (roof slope /
  floor for roof and ground materials), light and camera; rows = distance stops 1 / 10 / 50 / 200 m (up to 3 rows).
- TOOLBAR: view (test surface / **town hall**: A today's temporary materials vs B the library's picks per slot /
  **street**: A the city's shaders vs B the library), light sun / shade / overcast / night, STRAFE (slow sideways move:
  crawling shows), SHIMMER (the flicker test per tile, ppm), cost (bench this material).
- Under each tile: **choose this**. Choice + parameters go into verdicts.json; commit it as
  `viewer/materials/verdicts.json` (the lab loads it; the building views use the choices).
- Redraws only when something changes (or while strafing): costs nothing while the owner reads.

### Shimmer fix (shared `patterns.js`, all procedural materials)

Cause of the owner's "fine diagonal firing streaks": the value-noise hash `fract(sin(dot(p, k)) * 43758)` of world
coordinates x 60: `sin()` of ~1e5 loses its precision on GPUs and the hash collapses to a function of `dot(p, k)`,
i.e. diagonal stripes that swim. Now: a sin-free hash (Hoskins) of lattice ids wrapped mod 1024; every fine noise
fades by ITS OWN frequency (`fadeF`: gone before a period spans 3 px); joints box-filtered over >= 1.5 px and softened
by the joint's own width; the units' relief is ANALYTIC (`pillow`, `lap`, `seams`, cobble domes: a slope from the
unit's edge distance -> a world surface gradient), not screen-space derivatives of a height (the crawling outlines).
Reference: Mr.doob's slop-newyork tsl-materials.js (filteredPulse, boxCoverage; ">= 2 px ramps, relief fades before
it shrinks to pixels").

Shimmer meter (`labs/flickerTest.js`, copied from claude/stalle with per-tile regions): 24 frames, cameras strafing
~1.4 px per frame, a pixel blinks when its luminance reverses by > 0.04 twice. brick_red_brussels, sun:

| | 1 m | 10 m | 50 m |
|---|---|---|---|
| procedural BEFORE (0dd5655, `?before=1` with a local uncommitted copy) | 19 952 ppm | **69 926 ppm** | 0 |
| procedural AFTER | 22 140 ppm | **64 ppm** | 0 |
| scan (Red Brick, hex-tiled) | 3 060 ppm | 64 ppm | 0 |

At 1 m the meter also counts real thin detail sliding past (rain-streak lines inside bricks): compare at >= 10 m. A
sub-pixel strafe (0.0006 x distance) reads 0 everywhere: too gentle to separate them.

### Anti-tiling for scans (`viewer/materials/antitile.js`), replaces the hybrid

Mikkelsen 2022 hex-tiling (after Heitz & Neyret 2018): a triangle grid, each vertex owns a hex tile of the texture
with its own offset, 3 taps per map with explicit gradients, weights sharpened by the texture's luminance. Structured
scans (bricks, ashlar, slates, setts, tiles) get no rotation and vertical offsets snapped to pairs of courses (the
lattice is measured by `candidates.py` from the AO map's spectrum), so bed joints stay on the same lines; isotropic
scans get free offsets + rotation; a +-4-7 % tone per tile = the per-unit variation layer. The scan fades to its mean
colour only once a whole repeat is < ~8 px (the mips already average it). "hybrid" now means this anti-tiled scan.
Brick scans are rescaled to a 7.5 cm course (Uccle brick + joint); `scanScale` still scales.

### Candidates (CC0), generated sets, Megascans

`tools/textures/candidates.py fetch | process | megascans` + `encode_ktx2.mjs --cand`: 69 CC0 candidates (Poly Haven,
ambientCG) for 23 materials, 1K, KTX2 UASTC (fast, no RDO, for review; re-encode the picks with RDO) + WebP; binaries
in `viewer/materials/textures/cand/` (git-ignored, rebuilt by the tool); the list in `viewer/materials/candidates.json`
(committed; additive: the texture factory's `viewer/materials/generated.json` is merged at load, never written into
it). Sources and licences: CREDITS.md.

**Megascans**: shopping list with Fab links, scan areas and priorities in `docs/materials/MEGASCANS_LIST.md` (40
surfaces for the library + 29 decals / other-lab surfaces / 3D assets; `tools/textures/megascans.json` maps the
download folders to materials). The owner downloads the free texture sets into `data/raw/megascans/<folder>/`
(git-ignored) and runs `candidates.py megascans`.
**Licence question:** Megascans are under the Fab Standard License (Personal / Professional), not CC0. A web build
serves its texture files to every visitor (they can be downloaded): check the Fab terms for that case before anything
Megascans ships publicly. **CC0 stays the default for the public site** until the owner has checked.

### New library materials (the heroes)

`roof_tiles_flat_dark` (slate surface, flat tiles), `concrete_white` (render surface), `rockwork_concrete` (cement
rocaille: strata, crevices), `lead_roof` (rolls, matte). Existing slot names unchanged.

### Cost per version (2026-11-13, `viewer/materials/costs.json`)

GPU ms per full-screen test surface (1280 x 720, DPR 1) over a plain MeshStandardNodeMaterial; download MB (KTX2) in
brackets; every scan is 2.67 MB on the GPU (BC7 / ASTC, 2 maps 1024² + mips). **Noisy**: the owner's Chrome had
another WebGPU lab open; round 2 (bricks, asphalt, re-measured at the end) reads ~2x round 1, and later materials in
round 1 drift up. Compare versions of one material within a round only. What holds in both rounds: the hex-tiled
scans cost the same as or 0.1-0.3 ms less than the procedural version per full screen (6 texture taps vs the
pattern maths).

| Material | ms per version (round 1 / round 2) |
|---|---|
| brick_red_brussels | procedural 0.66 / 1.51 · Red Brick 0.39 / 1.31 (2.37 MB) · Brick Wall 006 0.39 / 1.31 (2.59 MB) · Brick Wall 001 0.46 / 1.25 (2.57 MB) · Bricks 085 0.39 / 1.25 (2.57 MB) |
| brick_yellow | procedural 0.79 / 1.51 · Bricks 105 0.66 / 1.18 (2.47 MB) · Bricks 016 0.66 / 1.18 (2.29 MB) · Yellow Brick 0.46 / 1.51 (2.55 MB) |
| brick_dark | procedural 0.52 / 1.51 · Bricks 055 0.52 / 1.25 (2.37 MB) · Bricks 057 0.72 / 1.25 (2.4 MB) · Dark Brick Wall 0.72 / 1.25 (2.56 MB) · Bricks 056 0.66 / 1.25 (2.37 MB) |
| asphalt | procedural 0.59 / 1.57 · Asphalt 02 0.59 / 1.38 (2.56 MB) · Asphalt 04 0.52 / 1.57 (2.18 MB) · Asphalt 015 0.52 / 1.44 (2.07 MB) · Asphalt 020 S 0.26 / 1.31 (2.57 MB) |
| mortar | procedural 0.33 · Grey Plaster 0.66 (2.5 MB) · Plaster 001 0.79 (2.3 MB) |
| stone_white | procedural 0.85 · Sandstone Blocks 08 0.72 (1.54 MB) · Bricks 008 0.72 (2.32 MB) · Bricks 024 0.72 (2.58 MB) · White Sandstone Bricks 03 0.33 (2.52 MB) |
| stone_blue | procedural 0.79 · Granite Tile 04 0.26 (2.23 MB) · Stone Tile Wall 0.66 (2.12 MB) · Stone Wall 02 0.52 (2.29 MB) |
| render_white | procedural 0.72 · Plaster 002 0.39 (2.41 MB) · Plaster 004 0.46 (2.36 MB) · White Stucco 0.46 (1.93 MB) · Painted Plaster Wall 0.66 (2.08 MB) |
| render_painted | procedural 0.66 · Painted Plaster Wall 0.52 (2.08 MB) · Beige Wall 002 0.52 (2.17 MB) · Plaster 007 0.20 (2.5 MB) |
| concrete_white | procedural 0.79 · Concrete 034 0.59 (2.14 MB) · Concrete 046 0.72 (2.28 MB) · Concrete Wall 008 0.85 (1.48 MB) |
| rockwork_concrete | procedural 0.72 · Rock 030 0.66 (2.58 MB) · Rock 023 0.33 (2.56 MB) |
| slate | procedural 0.66 · Roof Slates 02 0.39 (2.51 MB) · Roof Slates 03 0.39 (2.33 MB) · Roofing Tiles 003 0.39 (2.48 MB) · Grey Roof Tiles 02 0.39 (2.44 MB) |
| roof_tiles_red | procedural 0.20 · Clay Roof Tiles 02 0.26 (2.53 MB) · Clay Roof Tiles 03 0.59 (2.55 MB) · Roofing Tiles 014 B 0.59 (2.37 MB) · Roofing Tiles 007 0.59 (2.42 MB) |
| roof_tiles_flat_dark | procedural 0.72 · Roofing Tiles 013 A 0.59 (1.95 MB) · Roofing Tiles 009 0.20 (2.33 MB) · Grey Roof 01 0.33 (2.51 MB) |
| zinc_roof | procedural 0.72 · Metal 032 0.52 (1.71 MB) · Metal 049 C 0.72 (1.83 MB) |
| lead_roof | procedural 0.52 · Metal 046 B 0.46 (2.21 MB) · Metal 055 A 0.33 (2.18 MB) |
| copper_patina | procedural 0.85 · Metal 058 C 0.59 (2.18 MB) · Metal 058 B 0.52 (2.26 MB) |
| painted_metal_white | procedural 0.72 · Painted Metal 012 0.46 (2.39 MB) · Painted Metal 010 0.33 (2.4 MB) · Metal 016 0.39 (2.43 MB) |
| cast_iron_green | procedural 0.39 · Green Metal Rust 0.46 (1.99 MB) · Painted Metal 006 1.05 (2.6 MB) |
| wood_frame_white | procedural 1.11 · Wood 049 0.98 (2.17 MB) · Plywood 0.79 (2.3 MB) |
| wood_frame_dark | procedural 0.39 · Wood 051 1.05 (2.12 MB) · Wood 060 0.20 (2.54 MB) |
| glass_window | procedural 0.98 |
| cobbles | procedural 1.31 · Cobblestone Floor 08 1.25 (2.52 MB) · Cobblestone Floor 03 0.92 (2.53 MB) · Cobblestone Square 1.05 (2.55 MB) · Paving Stones 070 0.98 (2.62 MB) |
| paving_concrete | procedural 1.51 · Concrete Tiles 1.05 (2.2 MB) · Concrete Pavement 0.98 (2.44 MB) · Concrete Pavement 03 1.11 (2.23 MB) |
| gravel_path | procedural 1.57 |
| lawn_edge | procedural 1.51 |

## Files

| File | What |
|---|---|
| `viewer/materials/library.js` | `createMaterial(name, opts)`, `DEFS`, `MATERIAL_NAMES`, `SCAN_MATERIALS`, `paramSpec`, `setParam`, `applyChoice`, `readParams`, `createLook`, `meanColour`, `splitAt` |
| `viewer/materials/patterns.js` | AA pattern helpers: `bond` (running-bond courses), `cells` (jittered Worley setts / gravel), `seams`, `streakNoise`, `woodGrain`, `isoLine`, `farK` / `bumpK` (footprint fades) |
| `viewer/materials/scans.js` | `loadScans(renderer)` (shipped scans), `loadManifest()` (candidates.json + generated.json), `loadCandidate(renderer, id)`; KTX2 (UASTC, BC7/ASTC on the GPU) or WebP (`?scans=webp`) |
| `viewer/materials/antitile.js` | `hexSample()`: hex-tile anti-tiling of a scan (structured / isotropic) |
| `viewer/materials/candidates.json`, `costs.json` | the candidate scans per material; GPU / texture cost per version |
| `labs/material-review.js`, `labs/flickerTest.js` | the review lab; the shimmer meter (copy of claude/stalle's) |
| `tools/textures/candidates.py`, `megascans.json` | candidates fetch / process / Megascans import; Megascans folder -> material |
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

## Variants and cost (round 2, 2026-11-05: "hybrid" here = scan near + procedural far, replaced by the anti-tiled scan in round 3)

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
