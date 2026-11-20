// gate row `balconies` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "balconies",
  script: "tools/audit/census/balconies.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["H2","H4","G3","D6","J3","F3","--jobs","3","--quiet","--max","0"],
  guards: "census class B: every apartment-block balcony closed at both sides (a side parapet or a wall meets a ray along the slab at each end), 0 open ends on the 6 tiles with the most balconies (?balcony=old: 8,256 open ends of 4,601 slabs fails); the closed shell's own test (synthetic, with and without shared dividers): watertight except on the wall plane, wound by its normals, 11 quads a balcony as before; city-wide: --all (claude/balcony, rule 27 provisional, docs/CENSUS.md B)",
};
