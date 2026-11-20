// gate row `bridges` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bridges",
  script: "tools/audit/bridgeAudit.mjs",
  args: ["--quiet"],
  guards: "every road-rail crossing resolves to a built structure: road bridges' decks cover their UrbIS polygon, no slab in a cutting, no open cutting under a road, roads under the line under a rail bridge, catenary under the decks (docs/VIVIER.md)",
};
