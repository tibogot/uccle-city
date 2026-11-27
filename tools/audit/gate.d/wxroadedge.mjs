// gate row `wxroadedge` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "wxroadedge",
  script: "tools/audit/wxRoadEdgeCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the weather's road edge (claude/xmascheck, rule wx-road-edge; found on the Christmas snow days, Place Saint-Job 2026-11-27): the asphalt shader's snow / slush / puddle edge (viewer/roadPaint.js buildAsphalt) reads the carriageway's drain aPiece.y (the gutter), not each lane's aLateral: on tiles I6, E4, D3 no mid-carriageway lane-line vertex (|aLateral| > 0.85, |drain| < 0.6) is in the band, every gutter vertex (|drain| > 0.95) is; ?wxedge=old = before (the --old mutation fails the row: 7633 lane-line vertices in the band on I6); the features.js row",
  meta: {
    features: [{ key: "wxedge", type: "old", group: "weather" }],
  },
};
