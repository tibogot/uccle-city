// gate row `markings` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "markings",
  script: "tools/audit/census/markings.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--register","--max","laneP95=0.10"],
  guards: "census class F, all tiles: the painted lane / edge / centre lines on the measured carriageway (lane strips fitted to the measured kerbs station by station, viewer/streets/lineFit.js; clipped off sidewalks / medians / squares / tram sites, viewer/surfaces.js): every offStreet / atKerb / skew / zebraShort finding by its stable id in the gap register data/gaps.json (rule gap-register: a new one fails, a fixed one left in the register fails; no city-wide metre sums, claude/street1); the traffic lanes moved with the painted strips (viewer/streets/laneGraph.js laneShift): lane centre vs painted lane centre p95 <= 0.10 m (0.06-0.08 measured; counted apart: painted lanes off the carriageway, narrower than 2.5 m) (?roadlines=old = --old); the bicycle glyph's geometry test: round wheels (painted edges a true circle within 1 mm; ?bikemark=old decagons 33 mm of facets), the survey's 1.50 x 0.92 m footprint, round from a cyclist's eye, the chevron shape, the shader drawing the same shapes (claude/markings, rule 33 provisional)",
  deps: ["data/gaps.json"],
};
