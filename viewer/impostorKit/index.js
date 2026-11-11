// impostorKit: a generic octahedral impostor system for the web (three.js r187 WebGPU + TSL).
// docs/IMPOSTOR_KIT.md: how to use it for a new object type, the measurements. Research: docs/IMPOSTORS_RESEARCH.md.
//   const atlas = await bakeAtlas(renderer, source, TYPES.tree);              // bake.js (GPU + worker, async)
//   const fade = makeFade(TYPES.tree.fade), view = makeView();               // fade.js, material.js
//   const mats = impostorMaterials(atlas, { ...TYPES.tree.material, fade, view, shade: treeShade(U) });
//   const field = impostorField(mats, placements);  scene.add(field.group);  // field.js: one draw per pass
//   per frame: updateView(view, camera, renderer)
export { bakeAtlas, bakeMaterial, BAKE } from "./bake.js";
export { impostorMaterials, makeView } from "./material.js";
export { impostorField, updateView } from "./field.js";
export { makeFade, setCellFromCamera, objectNoise, fadeNoise, anchorOf, footSeed, meshKeep, impostorKeep, handoverT, farT } from "./fade.js";
export { TYPES, FAR, treeShade } from "./types.js";
export { stylizedTreeSource } from "./sources/stylizedTrees.js";
export * as octa from "./octa.js";
