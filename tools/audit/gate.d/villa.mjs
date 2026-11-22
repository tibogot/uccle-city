// gate row `villa` (docs/WORKFLOW.md): the villa on Av. du Prince d'Orange (claude/villa1, docs/VILLA.md)
export default {
  name: "villa",
  script: "tools/audit/villaCheck.mjs",
  node: ["--import", "./tools/characters/threeHook.mjs", "--import", "./tools/road_audit/register.mjs", "--import", "./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "the villa (viewer/villa/, models/villa/): its frame = site.json's, hide lists = full UrbIS URIs matching tile H9 (rule hide-ids-full-uri); budgets: <= 5 MB, LOD0 60k / LOD1 20k / LOD2 1.5k tris, <= 9 draws a level, interior cell <= 140k tris / 16 draws, all three bakes on every interior primitive (rule villa-budgets); joins: LOD0 + gate + paved grounds vs the terrain, 0 floating / 0 overhang (rules model-meets-ground, welded-seams); colliders: the gate -> garage lane free, no parked car in it, the closed gate closes its mouth, garage walls stop the car, floors under the interior spawns, walkable stair risers, a pool floor (claude/villa1)",
  deps: ["models/villa/", "data/tiles/H9/"],
  meta: {
    features: [{ key: "villa", type: "on" }],
    clean: ["viewer/villa/"],
    text: [{ file: "viewer/main.js", what: "adds the villa (addVilla, ?villa=0 off) and its plot clearing", test: (s) => /addVilla\(\{/.test(s) && /villaClearRings\(\)/.test(s) && /villaTreesClear\(/.test(s) }],
  },
};
