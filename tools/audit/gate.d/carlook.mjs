// gate row `carlook` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "carlook",
  script: "tools/audit/carLookGate.mjs",
  args: ["--quiet"],
  deps: ["models/cars/cars2.glb", "models/cars/cars2_r0.glb", "tools/blender/cars2.py", "viewer/drive/carPacks.js", "viewer/carProbe.js", "viewer/carFleet.js", "viewer/main.js", "viewer/drive/carLod.js"],
  meta: {
    features: [{ key: "carlook", type: "old" }],
    clean: ["viewer/drive/carPacks.js"],
  },
  guards: "the car family's budgets and named slots (rule car-look, claude/cars1): LOD0 <= 19k tris (police 21.5k), LOD1 / LOD2 not above the r0 family's, body sizes within 1 cm of r0 (the fleet's SIZES), only known _KIND slots, every street type's LOD0 has gloss black (10), alloy rims (11) and panel gaps (12), none of the gaps at LOD1 / LOD2; the paint not metallic (no SSR on paint), the coat on paint + gloss black, every car material on the reflection probe (carEnv.node), the probe one face a step with two cross-faded cubes, made before the traffic; ?carlook=old the r0 GLB",
};
