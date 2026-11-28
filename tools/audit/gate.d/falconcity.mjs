// gate row `falconcity` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "falconcity",
  script: "tools/falconCityTest.mjs",
  node: ["--preserve-symlinks", "--import", "./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "the falcon switches in the city game (rule falcon-gym 'the gym in the city' / 'the v2 in the city', claude/falconfun): ?falconctl=gym|current and ?falconmodel=v2|current parse, both default gym / v2 since the owner's OK 2026-11-27 (=current: the old ones; the v2 loads at boot only on a falcon page, elsewhere swapped in at the first flight, a source check); headless over a test street as the city's falcon world answers it (cityStream.js's face, the façade kit's sills / railings, a lamp, a crown) through the game's own FalconGame: the gym controller takes off from the street, nearly vertical out of a 4 m alley (<= 2.5 m/s below the roofs), lands with E on a window sill and stands there (the pads; self-test: the raw height grid drops it), launches off it along the street, stoops >= 300 km/h from 300 m over the town with no contact, catches the fun way (the first <= 30 s, >= 3 in 90 s); the current controller's stoop and catch as before (self-test: its street take-off touches down again); the gym's ledge pool rebuilt in slices (<= 520 samples a frame) in two fixed pools; the real v2 rig holds the caught pigeon IN its talons (belly <= 4 cm from the grip, no body vertex inside it), its Talons clip is the strike pose, its far LOD rides the same skeleton; round 4: the caught-pigeon model (models/bird/prey/pigeon_held.glb) at LIFE size in v2's talons (0.7-0.9 of its length), its head below its body; the gym's climb-out to >= 15 m over the roofs after a catch (self-test: without it the falcon stays low)",
  meta: {
    features: [{ key: "falconctl", type: "select" }, { key: "falconmodel", type: "select" }],
    clean: ["viewer/falconFlight/cityGymWorld.js", "viewer/falconFlight/gymCity.js", "viewer/falconFlight/falconGame.js", "viewer/falconFlight/cityFlyer.js", "viewer/falconGym/gymBird.js", "viewer/falconGym/gymFlight.js"],
  },
};
