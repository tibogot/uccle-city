// gate row `winter` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "winter",
  script: "tools/audit/winterCheck.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "the winter look of the Christmas season (owner 2026-11-26; rules season-from-date, bare-winter-trees, walker-statics): the season resolver (viewer/seasons/seasonMode.js) winter exactly on the Brussels dates 1 Dec - 6 Jan (UTC instants round the midnights), ?xmas=1 / ?season= / ?day= overrides, summer = day 200 as before; a December sun (15 Dec: sunrise ~8:40, sunset ~16:40 Brussels clock; the 'golden' preset a low sun before sunset); lighting.js and the boot's season uniforms on that day; bare trees: the street species' cards draw twigs (the pool's depth + shadow keep the mask's twigs for trees and deciduous shrubs, evergreen shrubs keep their green), the far impostors baked from the twigs, no new view / mesh / pass (draws and triangles = summer's); the firs' planter + crown and the chalets in the walker's collision world (claude/xmasreview)",
};
