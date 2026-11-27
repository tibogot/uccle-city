// gate row `kerbfurniture` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "kerbfurniture",
  script: "tools/audit/kerbFurnitureCheck.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "(claude/reality2, rule kerb-furniture, class C8) on the 24 tiles with a school front + 3 green-edge tiles, built headless through the gate tile cache: S every school hairpin barrier on the sidewalk (no leg in a driven lane), 0.3-0.7 m behind the kerb and along it, >= 1 m apart, none in the door gap, >= 2 at every school front whose kerb is in reach, >= 60 in all (78); K every timber bollard within 15 m of a public green of >= 2,500 m2 and >= 40 m from a shopfront, >= 3 on the fixture tiles D7 G5 I2; V no light / DynamicDrawUsage in viewer/kerbBarriers.js, the legs in main.js drawn.bollards, the bollards drawn by kind, features.js row kerbbarriers",
  timeout: 600,
  deps: ["data/streetlife/", "viewer/streets/kerbFurniture.js", "viewer/kerbBarriers.js", "viewer/streetFit.js", "viewer/main.js", "viewer/features.js", "tools/gate/tileBuild.mjs"],
  meta: { features: [{ key: "kerbbarriers", type: "on" }] },
};
