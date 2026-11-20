// gate row `movergroundunit` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "movergroundunit",
  script: "tools/audit/moverGroundTest.mjs",
  args: [],
  guards: "the mover ground's unit checks (claude/ground, rule mover-ground): gridLayerY = colliders.js driveHeight, moverGroundY = the player car's ground as before (the player drives exactly as before), the hero decks' circle test changes no height, the traffic sim asks with the car's height (a car under a deck stays under it), no allocation per step (the source checks in meta)",
  meta: {
    features: [{ key: "movground", type: "old" }],
    text: [
      { file: "viewer/main.js", what: "movingGround = world.moverY (?movground=old: the old one)", test: (s) => /const movingGround = MOVGROUND \? \(x, z, near\) => worldRef\.moverY\(x, z, near\) : movingGroundOld;/.test(s) },
      { file: "viewer/main.js", what: "world.moverY = moverGroundY", test: (s) => /moverY\(x, z, near = null\) \{ return moverGroundY\(this\.decks, this\.at\(x, z\), x, z, near\); \}/.test(s) },
      { file: "viewer/drive/driveMode.js", what: "Driver.ground = moverGroundY (one function)", test: (s) => /this\.ground = \(x, z\) => moverGroundY\(this\.world\.decks, this\.world\.at\(x, z\), x, z,/.test(s) },
      { file: "viewer/traffic/trafficSim.js", what: "pose() asks the ground with the car's height", test: (s) => /this\.ground\(F\[0\], F\[1\], yn\)/.test(s) && /this\.ground\(R\[0\], R\[1\], yn\)/.test(s) },
      { file: "viewer/traffic/trafficSim.js", what: "spawnAt() clears the height; no spawn where two layers stack", test: (s) => /this\.y\[i\] = NaN;/.test(s) && /this\.ground\(x, z, -1e9\) < y - 1\.5/.test(s) },
    ],
  },
};
