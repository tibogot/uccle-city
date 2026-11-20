// gate row `stutter` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "stutter",
  script: "tools/audit/stutterCheck.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "falcon-flight hitches: compile slices <= 4 ms while playing (asyncPipes.js fineCompile), the heap-drop check <= 3 ms a task, the Square des Heros ground in slices, a tile landing's stops-to-plants placements a frame apart, the grass field baked only when blades can show, shadow-warm groups drawn by the sun cache, staged landmarks' shadow pass warmed; each behind its ?x=old (claude/falconstutter, docs/perf/FALCON_STUTTER.md)",
  timing: true,
  meta: {
    features: ["slicesplit", "dropslice", "herosslice", "compileslice", "compileslicems", "warmmover", "stagedshadow", "grassbake"],
    clean: ["viewer/asyncPipes.js", "viewer/heapDrop.js", "viewer/heros/herosGround.js", "viewer/heros/herosCity.js", "viewer/grass/grass.js", "viewer/stagedCompile.js", "debug/falconStutter.js"],
    text: [
      { file: "viewer/main.js", what: "fineCompile on unless ?compileslice=old, off under the play loader", test: (s) => /params\.get\("compileslice"\) !== "old"\) window\.__fineCompile = fineCompile\(renderer, \(\) => playLoader\.active/.test(s) },
      { file: "viewer/main.js", what: "loadTile: frames between tram / lanes / stops+furniture+street kit / gardens / plants (?slicesplit=old)", test: (main) => { const at = main.indexOf("async function loadTile("), end = main.slice(at).search(/\r?\n\}\r?\n/), lt = main.slice(at, end < 0 ? undefined : at + end); return ["tram", "lanes", "stops, furniture, street kit", "gardens"].every((l) => lt.includes(`await split("${l}");`)) && lt.includes("const split = (label) => (SPLIT_SLICES ? frame(label) : null);") && /SPLIT_SLICES = params\.get\("slicesplit"\) !== "old"/.test(main); } },
      { file: "viewer/main.js", what: "a released landmark's shadow pass warmed through stagedCompile, one mesh a frame", test: (main) => main.includes("setStagedShadowWarm((roots) => warmShadows(renderer, scene, roots, { perFrame: 1 })") },
    ],
  },
};
