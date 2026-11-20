// gate row `heroshell` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "heroshell",
  script: "tools/audit/heroShell.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "every hero (landmark GLB, 17) closed from the street at every LOD: 16-direction ray probe (back-face / see-through fails, clusters >= 1 m2), party walls against a neighbour's solid and the listed intended openings (tools/audit/heroShell.allow.json: lanterns, porch colonnade, platform canopy) excluded, open m2 per hero and level <= tools/audit/heroShell.ceil.json; every placed hero probed (claude/heroshell, rule 29 provisional, docs/CENSUS.md class A)",
};
