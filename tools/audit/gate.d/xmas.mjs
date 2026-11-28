// gate row `xmas` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "xmas",
  script: "tools/audit/xmasCheck.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "the Christmas layer: firs and market chalets on paving, clear of tram tracks, walls, tree trunks and shop doors; street garlands 7-26 m wide, >= 4.4 m over the street, no star over a tram; the kit's mesh audit 0 blocking; the fir's needle cards on the near level + the middle level's shell (none far), its triangle + card-triangle budget per level, the shell clear of the ornaments, the 45 m switch matched (IoU, brightness, colour, see-through from the review renders), the cost model re-run for the kit and <= 0.1 ms at 8 m, the pre-pass / far-level-shadow defaults and the sun's shadow layer, the needle atlas size, ornaments clear of the card cores; the site fits the CURRENT city (rule xmas-fit-current-city: the decorated fronts = the current street life's, on drawn walls; every swag run inside the front the shop kit draws, one frontFace / frontWidth helper, the Carrefour's 18 m and a synthetic 18 m front; wreaths on current address points of drawn house walls >= 3 m from shops; spans on drawn walls at their height, never on a hidden solid or across a park fence; firs and chalets clear of street lamps and park fences); every Christmas fetch / loader at low fetch priority and the layer started only through bootGate.js whenXmasNeeded (rule xmas-low-priority); no light added, no DynamicDrawUsage under viewer/christmas/ (claude/christmas, claude/xmas1, claude/xmas2, claude/xmasfir, claude/xmasfir3, docs/CHRISTMAS.md)",
  meta: {
    clean: ["viewer/christmas/"],
  },
};
