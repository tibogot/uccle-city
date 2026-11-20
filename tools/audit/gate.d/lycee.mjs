// gate row `lycee` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "lycee",
  script: "tools/audit/lyceeCheck.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "the Lycée Français front: its bars pre-filtered (a coverage card on every panel and the gate, the modelled bars only where >= 2 internal px), no two faces within 1 mm over the same area, none in a building wall, no garden piece / plant on the railing; ?quick=1 keeps its flags; the Chemin privé 't Cortenbosch old lane (OSM 1235727248) built every metre, >= 2.5 m, joined at both ends, one-way in the OSM direction, nothing standing on it (claude/lycee, docs/LYCEE.md)",
  meta: {
    features: [{ key: "lyceerail", type: "select", options: ["cover"] }],
    clean: ["viewer/lyceeFront.js", "debug/lyceeCheck.js", "viewer/gardens/gardenClear.js"],
  },
};
