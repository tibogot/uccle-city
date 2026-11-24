// gate row `xmaspoles` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "xmaspoles",
  script: "tools/christmas/xmasPoles.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the Christmas garlands on poles at Saint-Job (claude/xmas4, plan job 5, rule xmas-pole-garlands): models/christmas/poles.json = what the CURRENT city data derives; every lamp / tram-pole hook on a pole the city draws there (placedLampSites / tramPoleSites, 5 cm); every Christmas pole on the measured sidewalk, >= 0.45 m off the carriageway and its parking, >= 1.25 m from every traffic lane / junction turn (rule 27 nothing-hard-in-carriageway), clear of zebra crossings, trunks, walls / doors, tram tracks, bollards, the other poles, the market and the fir; widths 7-24 m; a natural sag (0.3 + 0.02 w at most, 1.2-7 % of the width); the lowest LED >= 4.8 m over the road and >= 6.4 m over a tram track, the hanging star's foot >= 4.6 m; hook heights lamp 5.5 / tram pole 6.85 / Christmas pole 5.5-7.2 m; no pole used twice, none on a wall garland's spot; mutation tests (a pole on the kerb line, a hook 1 m off its lamp, a garland 2.5 m lower) fail it",
  timeout: 300,
  deps: ["models/christmas/poles.json", "models/christmas/site.json", "data/tiles/H5/", "data/tiles/I5/", "data/tiles/H6/", "data/tiles/I6/", "data/overrides.json"],
  meta: {
    features: [{ key: "xmaspoles", type: "on" }, { key: "xmaswin", type: "on" }],
    clean: ["viewer/christmas/", "tools/christmas/xmasPoles.mjs"],
    text: [
      { file: "viewer/christmas/xmasCity.js", what: "a pole garland shows only once both hooks are drawn (lamp sites / tram-pole instances within HOOK_TOL), its Christmas poles on the drawn ground", test: (s) => /lampSiteSets\(\)/.test(s) && /"tram-poles"/.test(s) && /HOOK_TOL/.test(s) && /world\.walkY\(h\.x, h\.z\)/.test(s) && /poles\.json/.test(s) && /XMAS_FETCH/.test(s) },
      { file: "viewer/facades.js", what: "the December windows compiled in with the Christmas layer only (XMAS_WIN.on), behind If(xmasWin > 0.5)", test: (s) => /if \(!XMAS_WIN\.on\) return/.test(s) && /If\(xmasWin\.greaterThan\(0\.5\)/.test(s) },
    ],
  },
};
