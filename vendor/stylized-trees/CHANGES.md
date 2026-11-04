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
