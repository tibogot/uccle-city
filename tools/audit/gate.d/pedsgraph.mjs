// gate row `pedsgraph` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "pedsgraph",
  script: "tools/audit/pedsAudit.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--graph", "--quiet"],
  guards: "the people's walk graph (claude/peds2, rules peds-walk-graph, peds-crossings-only; viewer/pedestrians/walkGraph.js) on H5 I5 H6 I6 (Saint-Job) + F4 (Wolvendael): W1 <= 1 % of the walked length on a carriageway cell (only crossings / tram platforms may be), W2 no edge through a drawn wall / building / island, W3 >= 85 % of the drawn crossings linked kerb to kerb, W4 every crossing within 25 m of a signal carries its phase, W5 >= 90 % of the drawn sidewalk within 2.5 m of a walking line, W6 the walk graph build <= 800 ms x k a tile, timed in the row on the tile's own inputs (best of 3 between two calibrations, never the time stored with a cached tile; a timing-only failure exits 75 and is re-run alone, rule timing-rows-alone)",
  meta: {
    features: [{ key: "peds", type: "on", group: "world" }],
    text: [
      { file: "viewer/tileData.js", what: "the walk graph built in the worker (entry.peds !== false)", test: (s) => /buildWalkGraph\(/.test(s) && /entry\.peds !== false/.test(s) },
      { file: "viewer/main.js", what: "?peds=0 wired: the tile entry, the tiles' graphs to cityPeds", test: (s) => /params\.get\("peds"\) !== "0"/.test(s) && /cityPeds\?\.addTile\(/.test(s) && /cityPeds\?\.removeTile\(/.test(s) },
    ],
  },
};
