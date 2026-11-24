// gate row `enterable` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "enterable",
  script: "tools/audit/enterableCheck.mjs",
  args: ["--quiet"],
  timeout: 120,
  guards: "the places you can walk into are findable and reachable (rule enterable-places-findable, claude/villamark): every place in data/places/enterable.json (the villa on Av. du Prince d'Orange, the Stalle chapel) has a viewer/places.js entry (enter: id) at its entry spot, a map marker (the 'enter' door glyph, minimap + full map, every zoom; the full map's search goes inside), an entry spot outside every building footprint (>= 0.75 m) on walkable ground (a street surface or <= 6 m off one, slope < 25 %), facing its door (<= 20 deg, 2-15 m); ?place=<id> resolves to it and boots its tile; the boot tile is the tile under ?at (?attile=old: I6) and ?at=..&view=third starts the character AT ?at (?atthird=old: the boot tile's road start: the bug that spawned the owner's villa link at Saint-Job); the Walk in prompt (E / Enter, never in third person; ?enterprompt=0 none)",
  deps: ["data/places/", "viewer/places.js", "viewer/placeLink.js", "viewer/enterPrompt.js", "viewer/main.js", "viewer/map/", "data/map/map.json", "data/tiles/manifest.json", "data/tiles/H9/", "data/tiles/D5/"],
  meta: {
    features: [{ key: "attile", type: "old" }, { key: "atthird", type: "old" }, { key: "enterprompt", type: "on" }, { key: "place" }, { key: "heading" }],
    clean: ["viewer/placeLink.js", "viewer/enterPrompt.js"],
    text: [
      { file: "viewer/main.js", what: "?place resolved before the boot tile; the boot tile from bootTile (the tile under ?at)", test: (s) => /const PLACE = await placeLink\(params\)/.test(s) && /let TILE = BOOT_TILE\.name/.test(s) },
      { file: "viewer/main.js", what: "?at=..&view=third: the character AT ?at (thirdPerson(at)), the Walk in prompt started", test: (s) => /thirdPerson\(AT0 && params\.get\("atthird"\) !== "old"/.test(s) && /startEnterPrompt\(\{/.test(s) },
    ],
  },
};
