// gate row `walls` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it). Rule walls-closed-from-street (claude/walls2).
export default {
  name: "walls",
  script: "tools/audit/missingWallsCensus.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  timeout: 1800,
  args: ["--all", "--jobs", "4", "--quiet", "--gate", "tools/audit/missingWalls.ceil.json", "--selftest", "--eyes", "tools/tour/views.json", "tools/tour/views_sunstep.json", "tools/tour/views_xmas.json"],
  guards: "every drawn building closed from the street at every outer footprint edge (edge rays through the tile worker's own build: lost / data / srcIn samples per column shape under the ratchet ceilings of tools/audit/missingWalls.ceil.json), 0 false feet moved by the wall feet (a plinth top, an outline step, a lintel pulled down: viewer/groundFit.js sinkFeet), orphan balconies <= 2, 0 tour eyes inside a building (tools/tour/views*.json); self-test: the same census on I3 + F7 with ?feet=old and ?wallempty=old must FAIL (claude/walls2, rule walls-closed-from-street provisional, docs/MISSING_WALLS_CENSUS.md)",
  meta: {
    features: [{ key: "feet", type: "old", group: "ab" }, { key: "wallempty", type: "old", group: "ab" }],
    text: [
      { file: "viewer/main.js", what: "?feet / ?wallempty wired into the tile entry (feetFix, wallEmpty)", test: (s) => /feetFix:\s*params\.get\("feet"\)\s*!==\s*"old"/.test(s) && /wallEmpty:\s*params\.get\("wallempty"\)\s*!==\s*"old"/.test(s) },
      { file: "viewer/tileData.js", what: "sinkFeet lowerOnly from entry.feetFix, analyseBuildings wallEmpty from entry.wallEmpty", test: (s) => /lowerOnly:\s*entry\.feetFix\s*!==\s*false/.test(s) && /wallEmpty:\s*entry\.wallEmpty\s*!==\s*false/.test(s) },
    ],
  },
};
