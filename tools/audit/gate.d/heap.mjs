// gate row `heap` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "heap",
  script: "tools/audit/heapGate.mjs",
  args: [],
  guards: "CPU copies dropped after the GPU upload have no unlisted reader; loadTile keeps no build result; heapDrop logic; the compile queue / flush never draw a disposed geometry (claude/heap, docs/HEAP.md)",
};
