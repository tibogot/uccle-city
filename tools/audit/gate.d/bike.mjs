// gate row `bike` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bike",
  script: "tools/bike/bikeTest.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "the kid's BMX (viewer/bike/, docs/BIKE.md): deterministic fixed step, kid speeds (flat 22-28 / sprint 28-35 km/h, 12 % descent), never tunnels (ramps / kerb / rollers at 58 km/h, the wall), a hop clears the 15 cm kerb (no hop: stopped / over the bars), 12 % pedalled seated / 20 % pushed, sand slows, landing rules (level / rear first ridden, nose down / sideways / 4 m flat / trick held = crash), brakes + skid, manual, pumping beats coasting, the log hop, 10 min random input finite and never under the ground, every constant a panel slider, the lab's model + camera, arrows = WASD and no key clash (claude/bike, rule kid-bike-meets-numbers, provisional)",
};
