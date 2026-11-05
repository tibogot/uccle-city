# vendor/stylized-trees: local changes (all in stylizedTrees.js, marked `[uccle-city CHANGES.md #n]`)

1. **Import path**: `../render/materials/alphaCutout.js` -> `./alphaCutout.js` (copied alongside).
2. **Leaf mask**: `params.leafMask` (a texture) is used when given, instead of loading
   `/textures/leaves/Leaf-Billboard-Texture-1.png` (not copied: licence unknown).
3. **Shared across tiles**: `createStylizedTrees({ ..., shared })`. The first call fills `shared` with
   the uniforms, both materials and the built trees (per variant × LOD); later calls (one per
   streamed tile) reuse them and wrap the built geometries in their own BufferGeometry (same
   attribute buffers) for their own per-instance `treeXf`. One shader for all tiles, no rebuild per
   tile. With `shared`, `dispose()` leaves the materials and the wrappers alone: three r187 frees every
   attribute a disposed geometry references, the shared ones included.
4. **Instance capacity >= 1025**: below 1024 instances three r187 writes the count into the WGSL, so
   tiles with different tree counts compiled different shaders (see docs/RENDER_PLAN.md).
5. **r187 instancing order** (a bug, also in the engine's fog lab under r187): three r187 applies the
   instance transform BEFORE `positionNode` (`NodeMaterial.setupPosition`), but the code assumed after.
   The card corners were turned back by the tree's rotation a second time (trees turned near ±90°
   showed their cards edge-on: vertical streaks), cards were not scaled with the tree, and the trunk's
   `crownLift` test (`positionLocal.y > 0`, world heights) lifted the whole trunk. Now: leaf corner,
   crown lift and sway turned to the world and scaled by the tree (`toWorld(...) * xf.z`); the trunk
   tests the raw vertex (`positionGeometry.y`). Found 2026-11-04 by setting every rotation to 0 (no
   streaks) and then only treeXf to identity (no streaks either).
6. **Card outline from the shape**: `shape()` may return `cardCorners` (unit corners of a convex outline,
   fan-triangulated); default the quad. Uccle tried an octagon fitted to its leaf mask and kept quads
   (the octagon cost more in vertex work than it saved in fragments; viewer/treesStylized.js).
7. **Stable per-tree tint**: `treeTint(treeXf, tintVar)` (exported) instead of `hash(instanceIndex)`, so a
   tree keeps its tint when it moves between LOD meshes and to Uccle's impostors (viewer/impostors.js).
   Computed in the vertex stage (`vertexStage`): first written in the fragment stage, where the hash
   amplified the interpolated inputs' last-bit differences into stripes across the leaves (owner's
   "jittering foliage", 2026-11-04).
8. **Nested LODs + LOD morph** (Uccle smooth LOD, `docs/SMOOTH_LOD.md`, 2026-11-05): every LOD takes its cards
   from LOD 0's set (the same random stream whatever the LOD; LOD 1 keeps the first `cards[1]` of each clump,
   LOD 2 the first `cards[2]`); each card carries a `rank` in `cardSpin.w`. `lodMorph(U)` gives the tree's
   distance to `U.eye` (the VIEW camera, so the shadow pass morphs the same) from a new per-instance `treePos`
   (the instance's translation), and ramps t1 / t2 toward `lodDist` / `farDist` over `morph1` / `morph2` metres.
   Cards the next LOD drops shrink to nothing over the ramp, kept cards grow to the old LOD sizes (1.35x, 1.7x),
   so at the switch both meshes draw the same pixels; `lodSlack` (m) delays the CPU re-bucketing past the ramp.
   New params `lodEye, morph1, morph2, lodSlack`; new uniforms `eye, lod1, lod2, morph1, morph2, lodScale`
   (0 = no morph: the impostor bake). `treeXf` and `treePos` are set on the bark too (same instance order).
9. **Bark morph** (`branchTree.js` + the trunk material, with `params.barkMorph`): `barkMesh` stores per vertex
   `bark` = (ring centre, branch level); the level-2 sub-branches (which LOD 1 drops) shrink onto their axis over
   the LOD 0 -> 1 ramp. LOD 1's bark keeps 9 sides (6 changed the outline at 40 m), LOD 2 has 6 (was 4).
10. **Far LOD fade materials** (`params.farMask(distance) -> bool node`): LOD 2 draws with its own copies of the
   leaf and bark materials whose `maskNode` (and the leaves' shadow mask) is the caller's dither; Uccle
   cross-fades LOD 2 into its impostors (or fades it out at 900 m). The nearer LODs keep shaders without discard.
11. **Partial re-bucket uploads** (2026-11-05, `relod`): after a re-bucket only the instances in use are uploaded
   (`addUpdateRange(0, count * itemSize)` on the matrices, `treeXf`, `treePos`), and a mesh drawing none uploads
   nothing. Before, every re-bucket (each 5 m of camera motion) uploaded every buffer of every loaded tile whole
   (capacity >= 1025, #4): ~30 MB and 15-25 ms of `writeBuffer` in one frame while walking (measured with
   `debug/moveTest.js`). Same draws, same data.
12. **Leaf tone channel** (Uccle tree lab, 2026-11-06): `params.leafTone` (uniform `U.leafTone`, default 0 = off): the
   leaf albedo is multiplied by `1 + (mask.g - 0.5) x 2 x leafTone`, so a species' leaf mask can carry each leaf's
   own tone and its veins in .g (a RedFormat mask reads 0 there; with leafTone 0 nothing changes). The impostor
   bake (viewer/impostors.js) applies the same term.
13. **Variant per tree, seed** (tree lab): `params.variantOf(i)` picks tree i's variant (default: the hash of its index,
   as before); `params.seed` replaces the built trees' base seed 1000.
14. **Wind direction** (tree lab): `params.windDir` [x, z] (uniform `U.windDir`): the slow sway leans along it with a
   smaller sideways swing (before: a fixed x / z sway). The sway is added in the world (since #5). Only with
   `windAmp` > 0 (0 in the city: no change there).
