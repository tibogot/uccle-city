// gate row `footbridge` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "footbridge",
  script: "tools/audit/footbridgeAudit.mjs",
  args: ["--quiet"],
  guards: "every UrbIS foot bridge over the railway is built (data/rail/footbridges.json, viewer/rail/footbridge.js; ?footbridge=old: F1 fails for PB 751 / 752 at Vivier d'Oie): its polygon not left open over the drop, every end welded to the drawn street / path / platform (0.15 m), the bank carved off the treads, the deck >= 5.2 m over the rails, piers off the tracks, its OSM ways no longer painted down the banks, real stair risers / goings (claude/footbridge, rule footbridge-built)",
  meta: {
    features: [{ key: "footbridge", type: "old", group: "ab" }],
    text: [
      { file: "viewer/main.js", what: "?footbridge wired into the tile entry, the footbridges drawn / walked from d.footbridges", test: (s) => /footbridge:\s*params\.get\("footbridge"\)\s*!==\s*"old"/.test(s) && /d\.footbridges/.test(s) && /footTop\(fb\)/.test(s) },
      { file: "viewer/tileData.js", what: "the footbridges off with entry.footbridge === false, their terrain carved, the catenary capped under them", test: (s) => /entry\.footbridge\s*!==\s*false/.test(s) && /carveUnder\(/.test(s) && /footSoffitCap\(/.test(s) && /setBankOld\(entry\.footbridge === false\)/.test(s) },
    ],
  },
};
