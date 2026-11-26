// gate row `embassyflags` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "embassyflags",
  script: "tools/audit/embassyFlagsCheck.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "embassy flags only where a real flag flies (rule embassy-flags): every OSM diplomatic place of the commune has a look-only check record; one pole per recorded mount, none on a 'no' / 'unseen' place; every design has a public-domain source; no pole floating (footing buried) or in a wall; live cloth capped (nearest 6 within 45 m, pool built at start), one baked draw for the free poles",
  meta: {
    features: [{ key: "embassyflags", type: "on" }],
    clean: ["viewer/embassyFlags.js", "viewer/flags/flagAtlas.js", "viewer/flags/flagField.js"],
  },
};
