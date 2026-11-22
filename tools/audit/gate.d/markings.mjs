// gate row `markings` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "markings",
  script: "tools/audit/census/markings.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--register","--max","laneP95=0.45"],
  guards: "census class F, all tiles: the painted lane / edge / centre lines on the measured carriageway (lane strips fitted to the measured kerbs station by station, viewer/streets/lineFit.js; clipped off sidewalks / medians / squares / tram sites, viewer/surfaces.js): every offStreet / atKerb / skew / zebraShort finding by its stable id in the gap register data/gaps.json (rule gap-register: a new one fails, a fixed one left in the register fails; no city-wide metre sums, claude/street1); claude/street4: the lanes the traffic DRIVES (the model's lanes, viewer/street/lanes.js) vs the lane strokes DRAWN from the model (an edge line standing for its kerb 0.30 m out): lane centre vs the middle between its two strokes p95 <= 0.45 m (0.41 measured, p50 0.01: before, the fitted lanes were compared with the same fit's strips, 0.08; counted apart: a stroke on one side only, two edge lines and no lane line, a painted pair wider than 4.5 m (an unpainted lane line between two lanes), narrower than 2.5 m, beside a parked car; the tail: parked cars in painted bike lanes held 30 m (job 6)) (?roadlines=old = --old); the bicycle glyph's geometry test: round wheels (painted edges a true circle within 1 mm; ?bikemark=old decagons 33 mm of facets), the survey's 1.50 x 0.92 m footprint, round from a cyclist's eye, the chevron shape, the shader drawing the same shapes (claude/markings, rule 33 provisional)",
  deps: ["data/gaps.json"],
};
