// gate row `kida` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "kida",
  script: "tools/kid/kidTest.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--model", "kidA", "--quiet"],
  guards: "the MPFB kid A (docs/KIDCHAR.md phase 2: models/characters/kidA.glb from tools/blender/kidMakeHuman.py --game + tools/characters/kidABuild.mjs): the kid row's checks on him (UAL joints + rest orientations, the 33 clips, the bind pose, CPU-skinned tears per joint <= 1 % or 3x the mannequin's, the rider on the placeholder and the BMX with RIDE_KIDA, the mount machine, the keys) + his budgets: one draw per LOD (one primitive), LOD0 <= 35k / LOD1 <= 10.5k / LOD2 <= 2.6k (round 2 of the look: the clothes / hair as shapes) with no popping ratios (LOD1 >= 30 % of LOD0, LOD2 >= 20 % of LOD1), every slot with a roughness, the KTX2 atlas present; the kid look (kidA_detail.ktx2 + kid_fabric.ktx2 in budget and layout, all his textures <= 2.5 MB, every slot in KIDLOOK, the cloth shells closed in every LOD; round 2: round 1's mesh kept as kidA_r1.* (21,518 tris) for ?kidlook=r1 / old, 2-D atlas cells for the sleeves / socks / cap / brims + the hair shell's cell, no poke-through of an inner layer > 2 mm out of its cover in the 11 riding modes on the BMX x 4 crank angles) (claude/kidchar, claude/kidlook, claude/kidlook2, rules hide-skin-under-garments, garment-colour-in-cells, kid-not-plastic)",
};
