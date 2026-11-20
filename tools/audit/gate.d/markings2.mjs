// gate row `markings2` (docs/WORKFLOW.md): the drawn along-road strokes vs the measured kerb (rule street-invariants)
export default {
  name: "markings2",
  script: "tools/audit/census/markings2.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--worst","0","--fixtures"],
  guards: "REPORT ONLY (docs/STREET_MODEL_PLAN.md job 1; job 3 brings it to 0 + register): every along-road stroke traced from the DRAWN asphalt lines and paint decal, judged against the measured kerb with no exclusion zones and nothing skipped as unmeasured: noKerb (no kerb within 12 m), junction (inside a node-degree >= 3 disc, radius from its two widest arms), angle (> 3 deg off the kerb tangent), margin (off the carriageway or within half its width + 0.10 m of the kerb), edge (within 1 m of the kerb and not at kerb - 0.30 +- 0.10 m); findings by stable id (rule gap-register); fails only if it misses the fixtures built as ?streetinv=old: the owner's Ch. de Saint-Job / Rue Engeland diagonal (E7) and the D7 seam-cut dashed line (claude/street1, rule street-invariants provisional)",
  deps: ["data/gaps.json"],
  meta: {
    features: [{ key: "streetinv", type: "old" }],
    text: [
      { file: "viewer/main.js", what: "hands ?streetinv to the tile worker", test: (s) => /streetInv:\s*params\.get\("streetinv"\) !== "old"/.test(s) },
      { file: "viewer/tileData.js", what: "passes entry.streetInv to buildRoadData", test: (s) => /streetInv:\s*entry\.streetInv !== false/.test(s) },
    ],
  },
};
