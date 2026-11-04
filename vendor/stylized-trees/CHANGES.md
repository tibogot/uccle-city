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
