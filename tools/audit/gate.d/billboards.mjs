// gate row `billboards` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "billboards",
  script: "tools/billboards/billboards.mjs",
  args: ["--quiet"],
  guards: "the big advertising billboards (claude/billboards, rule billboards): data/billboards/billboards.json = what the CURRENT city data derives (5 cm); every wall board on ONE drawn face of its building (viewer/facadeGeom.js faces), inside its width, >= 0.3 m under its top, over the roof built in front (every tile's buildings: cityRoofOf), on its blind part (no window / door / garage faceOpenings draws), clear of the roof kit's chimney stacks down the party wall; every roof board's legs, braces and walkway on the same flat roof, inside its outline, clear of the roof kit's items; every free-standing board's feet on open ground (no building, rail bridge, road cross-section, trunk); sizes in the real range per kind (h >= 1.8 m), poster aspect = board's (12 %); no real brand word in any poster; a source note per board; no board on a solid a scripted model hides; DRAWN WHERE THE DATA SAYS (the city's own kit, viewer/billboardsKit.js buildBoards, built and its poster / slats / frame checked against `at`); SEEN FROM THE STREET: from at least one eye 15-60 m in front (+-60 deg, open ground within 25 m of a street, 1.7 m up) the rays to its 4 corners clear every building of every tile; mutation tests (1 m off the wall, pushed to the street, a brand word, a 30 m panel, the first waterloo_panel hidden by the J4 building in front, a poster drawn 2 m off its `at`) fail it",
  timeout: 300,
  deps: ["data/billboards/billboards.json", "data/rail/rail.json", "models/", "data/tiles/"],
  meta: {
    features: [{ key: "billboards", type: "on" }],
    clean: ["viewer/billboards.js", "viewer/billboardsKit.js", "tools/billboards/"],
    text: [
      { file: "viewer/main.js", what: "starts the billboards behind ?billboards=0 (BILLBOARDS)", test: (s) => /import \{ billboards, BILLBOARDS \} from "\.\/billboards\.js"/.test(s) && /if \(BILLBOARDS\) billboards\.start\(/.test(s) },
      { file: "viewer/billboards.js", what: "builds its meshes with the pure kit the gate checks (billboardsKit.js buildBoards), the prisms turn from a time uniform (no buffer rewritten per frame), emissive only", test: (s) => /from "\.\/billboardsKit\.js"/.test(s) && /buildBoards\(/.test(s) && /uTime\.value =/.test(s) && !/needsUpdate\s*=\s*true/.test(s) && /emissiveNode/.test(s) },
      { file: "viewer/billboardsKit.js", what: "the kit places every board from its `at` and imports no three.js (so the gate runs it)", test: (s) => /b\.at\.p/.test(s) && !/from "three/.test(s) },
    ],
  },
};
