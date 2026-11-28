// gate row `parkpieces` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "parkpieces",
  script: "tools/audit/parkPiecesCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the real equipment of a named playground (rule park-pieces-real, claude/places3): the Chênaie garden in front of Le Pigeon Noir draws the timber kit made for it (models/parkkit/timberkit, tools/blender/timberPlayKit.py: a log tower with a rope net, a log climbing frame with two nets, balance logs on stumps), ?parkpieces=old the plastic stand-ins; the kit's three scripted LODs per piece, one draw each, under the triangle ceilings, the mesh checker clean, named slots each with its look; every piece's feet on the drawn ground (<= 0.3 m under its origin: the posts' 0.35 m skirt, <= 0.12 m over); colliders for every piece (the car's 0.3-1.3 m band, the tower's deck for the walker); the playground at LOD0 <= 30000 triangles",
  timeout: 180,
  deps: ["viewer/playgroundCity.js", "viewer/playgroundLayout.js", "viewer/parkKit.js", "data/overrides.json", "models/parkkit/", "tools/blender/timberPlayKit.py", "tools/park_kit_pack.mjs", "viewer/heightmap.js"],
  meta: {
    features: [{ key: "parkpieces", type: "old" }],
    clean: ["viewer/playgroundCity.js", "viewer/playgroundLayout.js"],
    text: [
      { file: "viewer/main.js", what: "adds the playgrounds' collider roots to the hero colliders", test: (s) => /playgroundRootNames\(await loadOverrides\(DATA\), params\)/.test(s) },
      { file: "viewer/playgroundCity.js", what: "builds one collider root per playground from its kit's boxes", test: (s) => /root\.name = `playground-\$\{pg\.id\}`/.test(s) && /pieceColliderTris\(boxes/.test(s) },
      { file: "viewer/parkKit.js", what: "loads the timber kit", test: (s) => /KITS = \["rockkit", "playgroundkit", "timberkit"\]/.test(s) },
    ],
  },
};
