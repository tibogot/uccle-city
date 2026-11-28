// gate row `kid` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "kid",
  script: "tools/kid/kidTest.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "the kid (docs/KID.md: models/characters/kid.glb from tools/characters/kid.py + ualBuild.mjs --kid): the UAL rig's joints and rest orientations, every UAL1 + UAL2 clip binds, the bind pose, CPU-skinned deformation through 15 clips (tears no worse than the UAL mannequin's x3), LOD budgets 15k / 6k / 2k, named slots in the palette; the rider IK on the placeholder bike AND the BMX (full crank turn x full steer x 7 modes: no limb stretched, hands and feet on their empties, no NaN); the mount / dismount state machine; E free on the bike, foot keys = the bike's meaning (claude/kid, rule kid-keeps-ual-rig, provisional)",
};
