# vendor/slop-trees: local changes

## 2026-11-03: share the leaf atlas, material and tree geometries between fields

`trees.js`, `createTreeField`: the leaf atlas, the tree material and the species geometries (all
LODs) were built on every call. The viewer creates one field per streamed tile, so each tile load
rebuilt identical assets (~350 ms of main-thread work per tile in our tests, the biggest remaining
stall when tiles stream in). They are now built once in `sharedTreeAssets()` and reused; they are
marked `userData.shared = true`, and the viewer's tile unload skips shared geometries and materials.
Behaviour and look are unchanged.
