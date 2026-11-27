// gate row `falconperch` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "falconperch",
  script: "tools/falconPerchTest.mjs",
  node: ["--preserve-symlinks", "--import", "./tools/road_audit/register.mjs", "--import", "./tools/characters/threeHook.mjs"],
  args: ["--quiet", "--tiles", "I6,H6,I5", "--n", "6"],
  guards: "the falcon lands ON what is drawn (rule falcon-gym 'landing on what is drawn', owner 2026-11-26: 'it's floating'): three real tiles built by the worker's own code (the tile cache), the city's falcon world over them (the drawn ground, the drawn-roof grid from the DRAWN roofs at 0.5 m / 5 mm and 20 m past the tile, the façade kit, the front gardens' stand-ins), the perch pool's every kind (roof edges, ridges, chimneys, sills, railings, garden walls, pillars, lamps, the ground: 18 each), both controllers landing on each, both models (the real rigs) perched there: 600+ poses, the toe pads -5..10 mm over the drawn top measured on its OWN geometry (the drawn roof triangles, the roof kit's boxes, the kit's sill / handrail mesh, the stand-in's top face, the lamp mesh, the drive surface), no body vertex inside a drawn solid (a building in its footprint outside its windows' openings, a roof kit box, a stand-in, the ground), upright within 15 deg; self-test: round 4's world (no furniture, the DTM ground) fails",
  meta: {
    features: [{ key: "falconperch", type: "old" }],
    clean: ["viewer/falconFlight/cityStream.js", "viewer/falconFlight/cityGymWorld.js", "viewer/falconFlight/ridgeScan.js", "viewer/plants/windowBoxRule.js"],
  },
};
