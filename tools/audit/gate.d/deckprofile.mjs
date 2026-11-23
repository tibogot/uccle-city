// gate row `deckprofile` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "deckprofile",
  script: "tools/audit/deckProfileCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the OSM road decks' measured profiles (rule deck-profile-measured, claude/places1): every OSM bridge way measured (data/overrides.json bridgeProfiles, tools/bridges/deckProfiles.py: the UrbIS DSM along its centre line) or listed as not measurable; fresh (ends on the way's ends); the drawn top within 0.15 m of it over the span, 8 m blends at the ends, no step > 0.35 m; Avenue des Tilleuls over the L26/5 chord >= 82.0 m (81.16 with the straight line: the wire 3.6 m over the rails); and (rule deck-owner-checks) the decks a neighbour draws over a tile are in that tile's node build (neighbourDecks) and the drive walk stands on them (E9 Tilleuls, ex drivecheck place 158). ?bridgeprof=old: the straight line. (claude/places2, rule deck-width-drawn) every band deck no wider than the street the road engine draws for it (its lanes, or its road type's stack when it has none) + its parapet: Avenue de la Chênaie over L26 <= 4.2 m half (12 m wide before); ?deckwidth=old: every lane-less deck 12 m wide",
  timeout: 300,
  deps: ["viewer/streets/bridgeDecks.js", "viewer/tileData.js", "tools/audit/driveCheck.mjs", "data/overrides.json", "data/tiles/", "tools/bridges/deckProfiles.py", "vendor/roads/roadCrossSection.js"],
  meta: {
    features: [{ key: "bridgeprof", type: "old" }, { key: "deckwidth", type: "old" }],
    clean: ["viewer/streets/bridgeDecks.js"],
    text: [
      { file: "viewer/main.js", what: "passes ?bridgeprof=old to the tile worker", test: (s) => /bridgeProf: params\.get\("bridgeprof"\) !== "old"/.test(s) },
      { file: "viewer/tileData.js", what: "passes ?deckwidth=old to the deck builder", test: (s) => /setDeckWidthOld\(entry\.deckWidth === false\)/.test(s) },
      { file: "viewer/main.js", what: "passes ?deckwidth=old to the tile worker", test: (s) => /deckWidth: params\.get\("deckwidth"\) !== "old"/.test(s) },
      { file: "viewer/tileData.js", what: "draws the band decks through their measured profiles", test: (s) => /entry\.bridgeProf === false \? null : ov\.bridgeProfiles/.test(s) },
    ],
  },
};
