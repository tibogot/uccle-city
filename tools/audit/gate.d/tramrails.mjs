// gate row `tramrails` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tramrails",
  script: "tools/audit/census/tramRails.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--jobs","4","--quiet","--worst","0","--requirefit","--max","raised=26,kerb=1,runs=7,platform=0,poles=16"],
  guards: "census class E: every tram track of all 33 tram tiles drawn from its fit to the measured street (data/tramfit, tools/tramfit/build_tramfit.mjs; none fallen back to the raw OSM way), both rails off raised paving and >= 0.15 m from every kerb line beyond today's 7 listed runs (26 m raised + 1 m kerb: the Rue de Stalle terminus crossing B5, the Saint-Job tram bridge's west end H6, F1 1.5 m); no rail under a tram platform as drawn (the platforms beside their tracks, viewer/streets/tramPlatforms.js: --old 705 m), the STIB poles data/stops puts on a platform on one as drawn after they follow it (16 left: no OSM platform within 3 m in their tile, as before; --old 44); ?tramfit=old (`--old`): 41 runs, 310 m raised + 109 m kerb fails (claude/tramfit, rule 32 provisional, docs/CENSUS.md E)",
};
