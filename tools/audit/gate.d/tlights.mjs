// gate row `tlights` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tlights",
  script: "tools/audit/tlightsCheck.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the Blender traffic lights (claude/tlights, docs/TLIGHTS.md): kit triangles per LOD <= 9000 / 1500 / 300, named palette slots + the 5 lens slots on every LOD, vehicle lenses along -z / pedestrian along +x, foot 0.30 m into the ground, mesh audit 0 blocking per LOD; in the 40 signal tiles every post's heads face its approach (lane 15 / 25 m back <= 35 deg), the pedestrian head across the road, the foot seated within 5 cm on one surface, no post in a driven lane; the lit colours keep their hue + saturation through three's ACES (rule 36); no light / DynamicDrawUsage, ?tlights=old wired",
  meta: {
    features: [{ key: "tlights", type: "old" }],
    clean: ["viewer/tlights/"],
    text: [
      { file: "viewer/main.js", what: "sets tlightExposure from the post chain (the lit aspects exposure-compensated)", test: (s) => /tlightExposure\.value = /.test(s) },
      { file: "viewer/main.js", what: "hands the signal sites to cityTLights (add / remove / furniture.js noSignals)", test: (s) => /noSignals: cityTLights\.drawing/.test(s) && /cityTLights\.addTile\(/.test(s) && /cityTLights\.removeTile\(/.test(s) },
    ],
  },
};
