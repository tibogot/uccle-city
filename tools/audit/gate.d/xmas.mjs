// gate row `xmas` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "xmas",
  script: "tools/audit/xmasCheck.mjs",
  args: ["--quiet"],
  guards: "the Christmas layer: firs and market chalets on paving, clear of tram tracks, walls, tree trunks and shop doors; street garlands 7-26 m wide, >= 4.4 m over the street, no star over a tram; the kit's mesh audit 0 blocking; the fir's needle cards on the near level + the middle level's shell (none far), its triangle + card-triangle budget per level, the shell clear of the ornaments, the 45 m switch matched (IoU, brightness, colour, see-through from the review renders), the cost model re-run for the kit and <= 0.1 ms at 8 m, the pre-pass / far-level-shadow defaults and the sun's shadow layer, the needle atlas size, ornaments clear of the card cores; no light added, no DynamicDrawUsage under viewer/christmas/ (claude/christmas, claude/xmasfir, claude/xmasfir3, docs/CHRISTMAS.md)",
};
