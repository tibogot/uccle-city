// gate row `stutter2` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "stutter2",
  script: "tools/audit/stutter2Check.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "falcon-flight hitches round 2: the street-life boxes' node build shared by every tile (three's own canReferenceInstanceData passes, 0 builds per new tile), a distance-swapped mesh's fading copies (kit walls near + far) made with its first tile and a retire's new copies shadow-warmed, a tile's gardens and the hero collider poll in <= 3 ms slices (same results as at once, yields without the timer clamp), the hero BVH copy transferred; each behind its ?x=old (claude/falcon2, docs/perf/FALCON_STUTTER.md)",
  timing: true,
  meta: {
    features: ["retirewarm", "boxshare", "gardenslice", "heropoll"].map((key) => ({ key, type: "old", group: "perf", sub: "Stutter" })),
    clean: ["viewer/slices.js", "viewer/heroTris.js", "viewer/heroColliders.js", "viewer/heroBVH.js", "viewer/gardens/cityGardens.js", "viewer/gardens/gardenKit.js", "viewer/gardens/gardenHedge.js", "viewer/streetlife/streetlife.js", "viewer/lodFade.js"],
    text: [
      { file: "viewer/main.js", what: "retire: the new copies' shadow pass warmed (warmShadows) before the fade-out starts", test: (main) => { const r = main.slice(main.indexOf("const retire = async (groups, dispose) => {"), main.indexOf("const stream = async")); return r.indexOf("if (px.length && RETIRE_WARM && shadowWarm) await shadowWarm(px);") > r.indexOf("await compileFor(px, { first: true });") && r.indexOf("fader.fade(g, -1") > r.indexOf("await shadowWarm(px)"); } },
      { file: "viewer/main.js", what: "preCompile: a landing tile's stand-ins (both copies) are shadow-warmed", test: (main) => /if \(shadowWarm\) await shadowWarm\(\[\.\.\.\[\]\.concat\(roots\), \.\.\.fp\]\);/.test(main) },
      { file: "viewer/main.js", what: "loadTile: the gardens through addTileSliced (?gardenslice=old)", test: (main) => main.includes("await (GARDEN_SLICE ? cityGardens.addTileSliced : cityGardens.addTile).call(cityGardens, entry.name") && /GARDEN_SLICE = params\.get\("gardenslice"\) !== "old"/.test(main) },
    ],
  },
};
