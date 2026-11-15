// BOOT SUMMARY (docs/BOOT.md "Measure on the live site"): a FUNCTION for chrome-devtools evaluate_script({ sourcePath })
// after a navigation with debug/bootTimeline.js as the init script. Waits for the cover, lets 6 s of the reveal run, and
// returns the numbers the boot docs compare: cover time, the loader's stages, long tasks, node builds, pipelines,
// downloads (network bytes: a service-worker or HTTP-cache hit counts 0 transferred), frame gaps after the cover.
async () => {
  for (let i = 0; i < 360 && !(window.__boot && __boot.cover); i++) await new Promise((r) => setTimeout(r, 500));
  await new Promise((r) => setTimeout(r, 6000));
  const r = __boot.report();
  const res = performance.getEntriesByType("resource");
  const sum = (f) => res.filter(f).reduce((s, e) => s + (e.transferSize || 0), 0) / 1048576;
  const body = (f) => res.filter(f).reduce((s, e) => s + (e.decodedBodySize || e.encodedBodySize || 0), 0) / 1048576;
  const before = (e) => e.responseEnd <= r.milestones.cover;
  const sw = res.filter((e) => e.workerStart > 0).length;
  return {
    url: location.href, cover: r.milestones.cover, firstSubmit: r.milestones.firstSubmit, firstTile: r.milestones.firstTile,
    stages: window.__loader?.times, loader: window.__loader?.mode,
    netMB: +sum(() => true).toFixed(1), netMBbeforeCover: +sum(before).toFixed(1), bodyMB: +body(() => true).toFixed(1), requests: res.length, viaServiceWorker: sw,
    longTasksBeforeCover: { n: r.longTasks.beforeN, ms: r.longTasks.beforeMs, top: r.longTasks.beforeTop.slice(0, 4) },
    longTasksAfter: { n: r.longTasks.afterN, ms: r.longTasks.afterMs },
    nodeBuilds: { n: r.nodeBuilds.n, ms: r.nodeBuilds.ms, beforeCover: r.nodeBuilds.beforeCover, beforeCoverMs: r.nodeBuilds.beforeCoverMs },
    pipelines: { sync: r.pipelines.sync, asyncBeforeCover: r.pipelines.asyncBeforeCover, syncAfterCover: r.pipelines.syncAfterCover },
    gapsAfterCover: r.gapsAfterCover, heapMB: r.heapMB,
  };
}
