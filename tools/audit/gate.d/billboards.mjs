// gate row `billboards` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "billboards",
  script: "tools/billboards/billboards.mjs",
  args: ["--quiet"],
  guards: "the big advertising billboards (claude/billboards, rule billboards): data/billboards/billboards.json = what the CURRENT city data derives (5 cm); every wall board on ONE drawn face of its building (viewer/facadeGeom.js faces), inside its width, >= 0.3 m under its top, over the roof built in front, on its blind part (no window / door / garage faceOpenings draws), clear of the roof kit's chimney stacks down the party wall; every roof board's legs, braces and walkway on the same flat roof, inside its outline, clear of the roof kit's items; every free-standing board's feet on open ground (no building, rail bridge, road cross-section, trunk); sizes in the real range per kind (h >= 1.8 m), poster aspect = board's (12 %); no real brand word in any poster; a source note per board; no board on a solid a scripted model hides; mutation tests (1 m off the wall, pushed to the street, a brand word, a 30 m panel) fail it",
  timeout: 300,
  deps: ["data/billboards/billboards.json", "data/rail/rail.json", "models/"],
  meta: {
    features: [{ key: "billboards", type: "on" }],
    clean: ["viewer/billboards.js", "tools/billboards/"],
    text: [
      { file: "viewer/main.js", what: "starts the billboards behind ?billboards=0 (BILLBOARDS)", test: (s) => /import \{ billboards, BILLBOARDS \} from "\.\/billboards\.js"/.test(s) && /if \(BILLBOARDS\) billboards\.start\(/.test(s) },
      { file: "viewer/billboards.js", what: "draws the file's `at` only, the prisms turn from a time uniform (no buffer rewritten per frame), emissive only", test: (s) => /b\.at\.p/.test(s) && /uTime\.value =/.test(s) && !/needsUpdate\s*=\s*true/.test(s) && /emissiveNode/.test(s) },
    ],
  },
};
