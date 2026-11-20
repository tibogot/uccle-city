// gate row `gardenzfight` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "gardenzfight",
  script: "tools/audit/gardenZfight.mjs",
  args: ["--all","--max","40"],
  guards: "no two garden pieces draw a face in one plane over the same area, <= 40 small known (claude/holes)",
};
