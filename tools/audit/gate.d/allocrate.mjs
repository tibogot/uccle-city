// gate row `allocrate` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "allocrate",
  script: "tools/audit/allocRateCheck.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "per-frame allocation diet (rule alloc-rate, claude/allocrate, perf job B): point-in-ring tests without destructuring (= the old loop, a box per ring), the trams' partial rail lift kept until the loaded tiles change (same rail tops, 0 taps again), the instance gather by index loops (back arrays / logs / runs identical to the old gather) and flat multi-draw runs (same chunks), the parked fleet's reused job lists (car by car = the old batches over 400 simulated frames), one blocker sample function, the exposure meter paced; readRenderTargetPixelsAsync only at listed non-per-frame sites; each behind its ?x=old; round 2 (claude/allocrate2): the villa drive deck boxed + index rings (= the old closure at 100k points), the blockers' rect merge without string keys (same rects, same order), surfaceLayers without arrays / with a reused answer, the heap drop's bounds by index (= three bit for bit), the fleet's car loop in placeCars (car by car), the tram snap / yAlong / update without per-point arrays",
  meta: {
    features: ["ringtest", "liftcache", "streamcopy", "fleetflat", "meterpace", "blockflat", "villadeck", "blockkeys", "tramalloc", "surfout", "fleetopt", "fastbounds"].map((key) => ({ key, type: "old", group: "perf", sub: "Garbage (GC)" })),
    clean: ["viewer/ringTest.js", "viewer/trackProfile.js", "viewer/instanceStream.js", "viewer/multiDraw.js", "viewer/carFleet.js", "viewer/heroColliders.js", "viewer/fuel/cityFuel.js", "viewer/villa/villaDeck.js", "viewer/fastBounds.js", "viewer/drive/surfaceLayers.js", "viewer/tramline.js"],   // (not lighting.js: it makes the fixed sun at boot)
  },
};
