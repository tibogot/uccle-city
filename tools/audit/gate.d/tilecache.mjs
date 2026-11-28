// gate row `tilecache` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tilecache",
  script: "tools/audit/tileCacheCheck.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "the gate's tile cache never serves a stale or a different tile (rule tile-cache, docs/SPEED_PLAN.md job 8): a synthetic build in a scratch cache misses on an edited / deleted / appearing input, a folder listing, other options, an edited builder module, stores no function / class instance, no build whose input changed mid-build, no damaged object, nothing with TILE_CACHE=0, survives 4 processes storing one key at once, evicts LRU, and the tracer still sees a hit's inputs; I6 / H6 / E9 built through the cache == a fresh tile worker build byte for byte (canonical sha256, wall times out), keepNet's kept parts (deckRings, net.streetModel.segments, hm) == the live ones, any other net part a loud error",
  heavy: true,
};
