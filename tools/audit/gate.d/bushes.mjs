// gate row `bushes` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bushes",
  script: "tools/audit/bushGate.mjs",
  node: ["--import","./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "bushes as the trees' leaf-card crowns (viewer/plants/bushes.js): no LOD dither / fade inside 30 m (the far end's fade >= 40 m, the one LOD switch the trees' card morph from 26 m; ?bushes=old: dithered hand-overs at 3.6 m / 8.1 m fails), each shape's triangles per LOD (<= 220 / 80: LOD 1 <= the old 80-triangle shell), foliage reaching the foot (no floating ball), the worst 25 m-grid view's bush triangles <= old x 1.1 on all tiles, 0 views of their own (parts of the trees' pool), no DynamicDrawUsage / light (claude/bushes)",
};
