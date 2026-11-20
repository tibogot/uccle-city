// gate row `markings` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "markings",
  script: "tools/audit/census/markings.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--max","offStreet=441,atKerb=321,skew=283,laneP95=0.25,zebraShort=34"],
  guards: "census class F, all tiles: the painted lane / edge / centre lines on the measured carriageway (lane strips fitted to the measured kerbs station by station, viewer/streets/lineFit.js; clipped off sidewalks / medians / squares / tram sites, viewer/surfaces.js) under ceilings: 472 m off the street, 366 m along a kerb, 341 m skewed of 125.8 km; the traffic lanes moved with the painted strips (viewer/streets/laneGraph.js laneShift): lane centre vs painted lane centre p95 <= 0.25 m (328k lane points, 0.08 m; counted apart: painted lanes off the carriageway 23k, narrower than 2.5 m 94k, where the lane keeps 1 m off the kerb) (?roadlines=old = --old: 6,018 / 957 / 411 fails); the bicycle glyph's geometry test: round wheels (painted edges a true circle within 1 mm; ?bikemark=old decagons 33 mm of facets), the survey's 1.50 x 0.92 m footprint, round from a cyclist's eye, the chevron shape, the shader drawing the same shapes (claude/markings, rule 33 provisional)",
};
