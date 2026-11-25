// gate row `kida` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "kida",
  script: "tools/kid/kidTest.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--model", "kidA", "--quiet"],
  guards: "the MPFB kid A (docs/KIDCHAR.md phase 2: models/characters/kidA.glb from tools/blender/kidMakeHuman.py --game + tools/characters/kidABuild.mjs): the kid row's checks on him (UAL joints + rest orientations, the 33 clips, the bind pose, CPU-skinned tears per joint <= 1 % or 3x the mannequin's, the rider on the placeholder and the BMX with RIDE_KIDA, the mount machine, the keys) + his budgets: one draw per LOD (one primitive), LOD0 <= 22k / LOD1 <= 8.5k / LOD2 <= 2.2k with no popping ratios (LOD1 >= 30 % of LOD0, LOD2 >= 20 % of LOD1), every slot with a roughness, the KTX2 atlas present (claude/kidchar, rules hide-skin-under-garments, garment-colour-in-cells)",
};
