// gate row `wheels` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "wheels",
  script: "tools/bike/wheelsTest.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "the BMX's DRAWN tyres on the ground (rule wheels-on-ground, owner 2026-11-26 'the BMX wheels are inside the ground'): bmx.glb's wheels as bmxModel / bikeModel pose them on the physics, sampled round the tread, vs the ground under the hub, every contact frame of scripted rides (flat, standing still, kerb, sand, park kicker / quarter pipe / berm loop / pump track): -0.5 .. +1.0 cm (sand: a bite of at most 2 cm); parked standing on its tyres; lying on its lowest point (bar end / pedal), nothing under the ground (claude/kid)",
};
