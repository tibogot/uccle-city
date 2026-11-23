// gate row `indirectpool` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "indirectpool",
  script: "tools/audit/indirectPoolCheck.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "one indirect-args buffer for the CPU-written indirect draws (rule indirect-pool, claude/indpool, perf job C): slot allocator (random alloc / free: no overlap, aligned 20-byte records, holes merged), growth keeps bases + values and re-points bound geometries, multi-draw views on the pool (records at base + old place, range uploads, culled offsets inside the own slot), new IndirectStorageBufferAttribute only in indirectPool.js + the GPU-written exceptions + ?indpool=old branches",
  meta: {
    features: [{ key: "indpool", type: "old", group: "ab", sub: "Perf" }],
    clean: ["viewer/indirectPool.js", "viewer/cellCull.js", "viewer/multiDraw.js"],
  },
};
