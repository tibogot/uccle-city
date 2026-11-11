# Foliage and planting: what the best systems do, and what we build

Research for the Foliage Lab (2026-11-11, branch `claude/foliage`). Outside claims carry a URL. Claims marked
**(memory)** come from talks / docs I know but did not re-open today; URLs marked **(checked)** were found by a search
today. Engine know-how from `game-engine-v1` (read only) is cited as a path under `game-engine-v1/v3/`.

---

## 0. One page for the owner

**Ground vegetation is three different problems** and every serious engine treats them separately:

1. **Grass** is a *field*, not objects: millions of tiny things whose individual positions do not matter. The best
   systems (Ghost of Tsushima, Horizon, Unreal's Landscape Grass, every good three.js demo) generate blades **on the GPU
   every frame** from a density map, near the camera only, in rings whose density falls with distance, and hand over
   to a **ground colour that matches what the blades average to**. Nobody stores grass instances on disk.
2. **Plants** (shrubs, flowers, hedges, window boxes) are *objects*: a few dozen meshes, instanced thousands of times
   with per-instance variation (scale, yaw, colour, season). Near: real geometry (leaves as small cut-out cards or real
   leaf meshes). Mid: a cheaper LOD. Far: nothing, or a colour on the ground / an impostor. They are placed
   deterministically from data (Horizon's "ecotopes", Unreal PCG).
3. **Surface growth** (ivy on walls, moss, leaf litter) is *growth along a surface*: grown once by a simulation
   (ivy) or scattered as decals, then drawn as one instanced batch.

**What we take** (section 6): GoT's blade shape, view-space widening and wind; Revo / game-engine-v1's GPU compaction
into an indirect draw; Horizon's deterministic, locally stable placement from maps; Unreal's density-scaling per
distance and "cull distance" fades; The Witness / our impostor kit's coverage-preserving mips for every leaf card;
Unity's "one shared wind field + per-vertex wind weights" (The Vegetation Engine, SpeedTree); and the rule from every
shipped game: **small plants never cast shadow-map shadows**.

**Budget numbers people publish:** GoT draws grass at "acres" with blades generated per frame in compute (talk
abstract, (checked) https://gdcvault.com/play/1027214/); Horizon: 500+ asset types, ~250 evaluated per frame while
moving, all placement on the GPU (slides, (checked)
https://www.guerrilla-games.com/media/News/Files/GDC2017_VanMuijden_GPUBasedProceduralPlacementInHorizonZeroDawn.pdf).
Our target: **≤ 0.8 ms GPU for a dense residential street at street level, ~0 from the sky, ~0 CPU per frame.**

---

## 1. Grass

### 1.1 Ghost of Tsushima (Sucker Punch, GDC 2021, Eric Wohllaib)

Talk: "Procedural Grass in 'Ghost of Tsushima'", Advanced Graphics Summit, GDC 2021, (checked)
https://gdcvault.com/play/1027214/ . Points from the talk (memory, partly confirmed by projects that implement it:
(checked) https://github.com/2Retr0/GodotGrass , (checked) https://cainrademan.github.io/Unity-Grass/ ):

- **Blades are generated in compute each frame** from tiles around the camera: a per-tile compute pass reads the
  terrain height, a grass-type map and a density map and writes blade instances into a buffer, which is drawn with
  indirect draws. Nothing is stored.
- **Blade shape:** a curved strip (Bézier curve: root, mid control, tip) with 15 vertices near and 7 far (two LODs).
  Per-blade: height, width, facing, curvature, a clump id. **Clumps** (Voronoi cells in world space) pull blades'
  facing, height and colour toward the clump's own values: grass grows in tufts, not as uniform noise.
- **View-space widening:** a blade seen edge-on is a line; GoT shifts its vertices sideways in view space so it keeps
  a minimum width (GodotGrass: "grass blades which are perpendicular to the camera are stretched horizontally in view
  space as suggested in the GoT GDC talk", (checked) https://github.com/2Retr0/GodotGrass ).
- **Rounded normals:** the normal is tilted across the blade's width so a flat strip shades like a rounded leaf.
- **LOD:** blade density falls in rings; past the last ring the terrain gets a grass texture whose colour matches
  the blades. Blades thin out *before* the hand-over so the change is invisible.
- **Wind:** a 2D scrolling noise sampled per blade at the root; the blade bends along a curve (tip moves most), with a
  per-blade phase so the field ripples. The "guiding wind" was a separate gameplay feature (vorticle wind sim:
  (checked) https://gamedeveloper.com/design/using-vorticles-to-simulate-wind-in-i-ghost-of-tsushima-i- ).
- **Shadows:** grass does not render into the shadow map; it receives the sun shadow and has fake self-shadowing
  (darker at the root, AO by height).

### 1.2 Horizon Zero Dawn / Forbidden West (Guerrilla)

"GPU-Based Run-Time Procedural Placement in Horizon: Zero Dawn", Jaap van Muijden, GDC 2017, (checked)
https://www.gdcvault.com/play/1024120/ , slides (checked)
https://www.guerrilla-games.com/media/News/Files/GDC2017_VanMuijden_GPUBasedProceduralPlacementInHorizonZeroDawn.pdf ,
summary (checked) https://80.lv/articles/real-time-procedural-placement-in-horizon-zero-dawn/ .

- Design goals: **data driven, deterministic, locally stable** (moving a rule only changes things nearby).
- World data = paintable 2D maps streamed in sections; **ecotopes** pick which asset types grow where.
- Density per asset = a graph of map inputs (height, slope, wetness, distance to roads...). Placement = a dithered
  threshold of the density on a stable grid (an ordered dither, so density maps to a count without clumping noise).
- Footprints: bigger assets claim space so small ones do not grow under them.
- Forbidden West added more foliage interaction and a wind simulation (memory).

**For us:** our land cover rasters (front gardens from UrbIS + orthophoto, OSM grass / garden) are exactly Horizon's
"maps"; the GPU grass reads them; plant placement is a deterministic dither on a grid seeded per tile.

### 1.3 Unreal Engine

- **Landscape Grass** (Grass Type nodes in the landscape material): per-component, GPU-sampled density, instances
  generated asynchronously near the camera into HISMs, with `Start/End Cull Distance` per type and **density scaling
  by quality** (memory; docs https://dev.epicgames.com/documentation/en-us/unreal-engine/grass-quick-start-guide-in-unreal-engine ).
- **Procedural Foliage Spawner** (simulated seeding, growth, shade) and the newer **PCG framework**, production-ready
  in 5.7 (checked: https://digitalproduction.com/2025/11/12/unreal-engine-5-7-foliage-pcg-and-in-editor-ai/ ).
- **Nanite Foliage** (5.7, experimental): Nanite Assemblies (instanced parts), Nanite Skinning (wind), **Nanite
  Voxels** for far foliage (a tree becomes a voxel representation at distance) (checked: same article; forum on
  interaction limits https://forums.unrealengine.com/t/ue5-7-nanite-foliage-character-interaction-support-and-future-direction/2698270 ).
  Lesson for the web: the distance representation of foliage should be *volumetric / averaged*, not a thinning set of
  cut-out cards (that is what crawls).
- **Pivot Painter / SimpleGrassWind**: per-vertex wind weights baked into the mesh, one global wind actor.

### 1.4 Unity

- Terrain **detail meshes / grass** (CPU-generated patches, billboard or mesh), HDRP / URP grass via
  VFX graph or GPU instancing; community "GPU grass" following GoT ((checked) https://cainrademan.github.io/Unity-Grass/ ).
- **Nature Renderer** (Visual Design Cafe): instanced, GPU-culled rendering of terrain details and trees with a
  shared wind ("Wind Control") and per-distance density; colour variation maps (memory,
  https://visualdesigncafe.com/nature-renderer/ ).
- **The Vegetation Engine** (BOXOPHOBIC): one global system for wind, seasons, colours and "elements" (volumes that
  push / tint / size / wet / snow vegetation); every plant shader reads the same global textures (memory,
  https://assetstore.unity.com/packages/vfx/shaders/the-vegetation-engine-159647 ). **This is the seasons design we
  copy:** one season / wetness / snow state, read by every vegetation material.
- **GPU Instancer** (GurBu): indirect instanced drawing with compute frustum + occlusion (Hi-Z) culling and
  per-instance LOD selection on the GPU (memory, https://assetstore.unity.com/packages/tools/utilities/gpu-instancer-117566 ).

### 1.5 Godot

- `MultiMeshInstance3D` grass, chunked, with a wind shader; **Simple Grass Textured** add-on (painting, billboard /
  mesh grass, wind, distance fade, (memory) https://github.com/IcterusGames/SimpleGrassTextured ).
- **Spatial Gardener** (painting plants on surfaces, octree-based LOD and culling, (memory)
  https://github.com/dreadpon/godot_spatial_gardener ).
- **GodotGrass** (compute, GoT-style blades, (checked) https://github.com/2Retr0/GodotGrass ).

### 1.6 three.js / WebGPU

- **Al-Ro grass** (WebGL, Bézier blades, instanced, wind, ~ 100k+ blades, (memory)
  https://al-ro.github.io/projects/grass/ ): blade shape = a few segments, normals bent toward the blade's rounded
  profile, specular sheen on the tips.
- **James Smyth grass** (instanced blades, wind by noise, (memory) https://github.com/James-Smyth/three-grass-demo ).
- **"How to Make the Fluffiest Grass with Three.js"** (Codrops, Feb 2025, (checked)
  https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/ ): stylised **billboard**
  cards with alpha textures, player push, the argument "instanced blades look most realistic but cost more".
- **High-performance grass in three.js + WebGPU** forum thread ((checked)
  https://discourse.threejs.org/t/high-performance-grass-rendering-in-three-js-webgpu/94175 ) and Grassworks
  ((checked) https://discourse.threejs.org/t/migrating-my-grass-system-to-webgpu-and-making-a-robust-grass-plugin/92893 ):
  compute-driven blades with indirect draws are now the standard WebGPU approach.
- **Revo Realms** (alezen9, MIT): one camera-following tile, jittered grid, stochastic thinning, packed noise atlas
  for wind. Ported into **game-engine-v1** (`v3/render/grass/revoGrassSystem.js`) with: GPU compaction of visible
  blades into an indirect draw (culled blades cost no vertex work), cylindrical billboarding, a push field
  (`grassPushField.js`), lit by `MeshStandardNodeMaterial`, the far ground colour (`grassFarTsl.js`: "converging the
  ground together with the blades, not after them, is what hides the seam").

### 1.7 Billboards vs geometry vs cards

| | Look | Cost | Where |
|---|---|---|---|
| Geometry blades (strip, 3-7 segments) | best close (parallax, wind per blade, no alpha) | vertices; no overdraw; no alpha crawl | grass < ~40 m |
| Alpha cards (tufts) | fluffy, cheap per m² | overdraw + alpha-test crawl at distance unless coverage-mips | ground cover, flower clusters, hedge surface |
| Billboards (camera-facing) | turn while orbiting, read flat from above | cheapest | none for grass (we saw billboards rotate); OK for tiny far flowers |
| Ground colour | no relief | ~0 | grass > ~40 m, all far plants |

**Alpha-to-coverage pitfalls (from our own impostor work, docs/IMPOSTORS_RESEARCH.md and `claude/impostors`
docs/IMPOSTOR_KIT.md):** dots that crawl come from partial alpha turned into MSAA sample patterns that change with
sub-pixel motion. What fixed it: (1) supersampled / true fractional coverage at bake, (2) **coverage-preserving mips**
per texture (Castaño, The Witness: (memory) http://the-witness.net/news/2010/09/computing-alpha-mipmaps/ ;
game-engine-v1 `v3/render/foliage/alphaCoverageMips.js`), (3) no fwidth noise, (4) one coherent alpha. Ben Golus'
"Anti-aliased Alpha Test" (memory) https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f .
**Rule for the lab:** every leaf card texture is built with coverage-preserving mips, cards stop before they are
smaller than ~2 px per leaf, and beyond that the plant is a solid low-poly shell (no alpha at all).

## 2. Wind

- One **shared wind field** for everything (GoT, The Vegetation Engine, Unreal's WindDirectionalSource): direction,
  speed, gustiness. A scrolling 2D noise (gust fronts travelling with the wind) sampled at the plant's root gives the
  bend; a per-vertex weight (height above root squared) shapes it; a small high-frequency flutter for leaves.
- game-engine-v1's lesson (`revoGrassSystem.js` comments): **one scroll rate for everyone** (a gust is a pattern
  that travels, you watch it arrive), slow scroll (a few m/s), no time-varying blend weights (a second faster wind
  under the first makes the field shiver).
- Our module `viewer/foliage/wind.js` exposes `wind.speed`, `wind.direction`, `wind.gust` uniforms that the weather
  lab can drive later.

## 3. Interaction (trampling)

- GoT / Forbidden West: a small **push / trample texture** around the player (and horses), written each frame by
  the movers, read by blades; it recovers over time (memory).
- game-engine-v1 `v3/render/grass/grassPushField.js`: a camera-centred RT that movers stamp into, with decay.
- For us (lab): a **list of up to 8 pushers** (sphere centre + radius) as uniforms, applied analytically in the
  vertex stage (no RT needed for a handful of feet / wheels); a decaying trample RT is the later upgrade for car
  tracks in snow.

## 4. Seasons

- The Vegetation Engine's model: global `season` value, per-material reactions (colour, leaf amount, flowers, snow).
- Grass: green (spring, fresh yellow-green) → summer (deeper, some dry straw patches in July / August) → autumn
  (olive, leaf litter appears) → winter (dull olive-brown, frost / snow-ready).
- Shrubs: evergreen (box, laurel, privet mostly, holly) keep leaves; deciduous (hydrangea, roses, beech hedge keeps
  brown leaves through winter: **marcescence**, real and typical of Brussels beech hedges) drop or brown.
- Flowers: tulips / daffodils in March-April, roses June-September, lavender July, hydrangeas June-September
  (brown heads in winter), geraniums May-October (window boxes empty / bare in winter).
- Snow: a flag + amount per material: top-facing surfaces whiten (normal.y), grass shortens under snow.

## 5. LOD, culling, cost

- **Density by distance**, not count by distance: keep probability p(d) per blade (hash < p), remaining blades
  **widen** by 1/sqrt(p) so coverage holds (GoT / Unreal density scaling), and a blade whose keep is marginal grows
  from zero height (no popping).
- **GPU culling in compute** (frustum + distance) and compaction into an **indirect draw** (game-engine-v1 does
  this; GPU Instancer, Horizon too).
- **No shadow casting** for grass and small plants (all shipped games; cost of shadow passes for millions of blades
  is prohibitive). Hedges may cast (they are big, simple solids).
- **Depth pre-pass**: useful for alpha cards with expensive lighting (our impostor kit uses one); for opaque blades
  the GPU's early-z already works, so not needed.
- **From the sky:** the grass compute is skipped on the CPU when the camera is higher above the ground than the
  grass's far radius (one comparison per frame).

## 6. Scripted plants in Blender

- **Sapling Tree Gen** (Blender add-on, Weber & Penn parametric trees) and **MTree** (node-based trees,
  https://github.com/MaximeHerpin/modular_tree ) for branching structure; **Botaniq** and **Grass Essentials**
  (commercial asset libraries, references only for looks: https://botaniq.xyz/ , https://blendermarket.com/products/grass-essentials ).
- Our rule: all plants scripted in `bpy` (`tools/blender/plants.py`), Blender 5.0 headless `--factory-startup`,
  named material slots (no baked colour), UV0 in metres, AO in UV1 (vertex AO baked from geometry), LODs by
  meshoptimizer in JS (never Blender decimate).
- Shrub recipe (what reads premium at 2-20 m): a branch skeleton (space colonisation or recursive growth) → leaf
  clusters as real small leaf meshes (4-6 triangle bent leaves, not alpha) near; a "shell" LOD (the crown as a lumpy
  closed surface with a leaf normal map) far. Flowers as small geometry (petal fans) instanced on the shrub.
- Ivy (Thomas Luft's "IvyGenerator" algorithm, memory, http://graphics.uni-konstanz.de/~luft/ivy_generator/ ):
  root, growth vector = primary direction + random + gravity + adhesion to the nearest surface; branching; leaves
  along the stems facing away from the wall. We grow it in JS on the lab wall (deterministic seed).

## 7. Decisions for the lab

| Topic | Decision | Borrowed from |
|---|---|---|
| Grass near | compute-generated world-anchored blades on a stable grid around the camera, compacted into an indirect draw; strips of 4 segments (9 verts) | GoT, Revo / game-engine-v1 |
| Grass far | ground colour = what the blades average to (same colour function), blended in across the blades' thinning band | GoT, game-engine-v1 grassFarTsl |
| Density by distance | stochastic keep p(d), survivors widen 1/sqrt(p), marginal blades grow from zero | GoT, Unreal |
| Edge-on blades | view-space widening | GoT |
| Wind | one wind module (speed, dir, gust) shared by grass, plants, hedges, ivy | TVE, GoT |
| Trample | analytic pushers (≤ 8) | game-engine-v1 push field (simplified) |
| Types | lawn (mowed 6-8 cm), verge (long 25-40 cm), meadow (long + wildflowers) from a type channel | Horizon ecotopes |
| Plants | Blender-scripted, instanced per type, meshopt LODs, no shadow casting below 1 m, dithered distance fade | all |
| Hedges | procedural JS along a polyline: clipped box with rounded edges, leaf-noise shading, leaf cards on the surface near | memory rule "boxy items procedural in JS" |
| Cards | coverage-preserving mips, cut before they turn into dots | The Witness, our impostor kit |
| Seasons | one `season` uniform set (colour, leaf amount, bloom, snow) read by every material | The Vegetation Engine |
| Placement | deterministic per tile from polygons / polylines (hash of position), Horizon-style dithered density | Horizon |
