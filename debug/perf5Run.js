// perf5 (docs/perf/QUIET_2026-11-26.md): one police measurement after a fresh ?game=police load: time to play (+ the
// boot timeline's split when debug/bootTimeline.js ran as the init script), then a `seconds` drive on the gamePerf
// autopilot (default route: the station -> Saint-Job) with debug/perf5Frames.js beside it.
//   const P = await import('/debug/perf5Run.js'); await P.police({ seconds: 45 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function waitPlay(max = 200000) {
  const t0 = performance.now();
  while (!globalThis.__playAt && performance.now() - t0 < max) await sleep(500);
  return Math.round(globalThis.__playAt || 0);
}
export function bootSplit() {
  const b = window.__boot?.report?.();
  if (!b) return null;
  const gt = Object.fromEntries((globalThis.__gameTimes || []).map(([k, v]) => [k, v]));
  return { firstSubmit: b.milestones.firstSubmit, firstTile: b.milestones.firstTile, cover: b.milestones.cover, all9Full: b.milestones.all9Full, heroesDone: b.milestones.heroesDone, farLodDone: b.milestones.farLodDone,
    longBefore: [b.longTasks.beforeN, b.longTasks.beforeMs], longAfter: [b.longTasks.afterN, b.longTasks.afterMs, b.longTasks.afterTop.slice(0, 4)],
    builds: [b.nodeBuilds.n, b.nodeBuilds.beforeCoverMs, b.nodeBuilds.afterCoverMs], pipes: [b.pipelines.sync, b.pipelines.async, b.pipelines.asyncLastDone], dlKB: b.downloads.kB, gameTimes: gt, area: window.__areaTrace };
}
export async function police({ seconds = 45, to } = {}) {
  const play = await waitPlay();
  await sleep(3000);
  const boot = bootSplit();
  const F = await import("/debug/perf5Frames.js?v=1"), G = await import("/debug/gamePerf.js");
  const p = G.police({ seconds, warm: 1, ...(to ? { to } : {}) });
  await sleep(1200); F.start();
  const r = await p; const s = F.stop();
  const out = { play, boot, brief: G.brief(r), frameMs: r.frameMs, cpu: r.cpuLoopMs, gpu: r.gpuMs, endAt: r.autopilot.endAt, tiles: r.tiles.events, spikes: r.spikes,
    gc: [r.gc.n, r.gc.heapMB, r.gc.list.filter((g) => g[1] > 40)], sys: r.systems.slice(0, 14).map((x) => [x.sys.slice(0, 60), x.avg, x.p99, x.max]),
    sysMax: r.systems.filter((x) => x.max > 15).map((x) => [x.sys.slice(0, 70), x.max]), pipes: r.pipelines.n,
    lf: r.longFrames.filter((f) => f.dur > 45).slice(0, 20).map((f) => [f.t - r.t0, f.dur, f.block, f.render, f.scripts.slice(0, 4).map((x) => `${x.d} ${x.fn || x.inv} ${x.src}`).join(" | ")]),
    probe: { cpu: s.cpu, over16: s.cpuOver16, over20: s.cpuOver20, full: s.fullFrames, cpuFull: s.cpuFull, cpuNoFull: s.cpuNoFull, gcFrames: s.gcFrames, cpuGc: s.cpuGc, tileFrames: s.tileFrames, cpuTile: s.cpuTile, late: s.lateN, lateFull: s.lateWithFull } };
  const all = JSON.parse(localStorage.getItem("perf5.runs") || "[]"); all.push({ at: new Date().toISOString(), url: location.search, ...out }); localStorage.setItem("perf5.runs", JSON.stringify(all.slice(-40)));
  return out;
}
/** the node builds after `t0` grouped into clusters (60 ms apart), with their materials | objects */
export function buildClusters(t0 = window.__gamePerfLast?.t0 ?? 0, minMs = 15) {
  const b = (window.__boot?.builds || []).filter((x) => x[0] > t0), cl = [];
  for (const x of b) { const c = cl[cl.length - 1], k = `${x[2]} |${x[3]}`; if (c && x[0] - c.end < 60) { c.end = x[0]; c.n++; c.ms += x[1]; c.k[k] = (c.k[k] || 0) + x[1]; } else cl.push({ t: x[0], end: x[0], n: 1, ms: x[1], k: { [k]: x[1] } }); }
  return cl.filter((c) => c.ms > minMs).map((c) => ({ t: c.t - t0, n: c.n, ms: Math.round(c.ms), top: Object.entries(c.k).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([k, v]) => `${k.slice(0, 70)} ${Math.round(v)}`) }));
}
export async function policeFull(o) {
  const r = await police(o);
  return { play: r.play, cover: r.boot?.cover, url: location.search, brief: r.brief, frameMs: r.frameMs, probe: r.probe, lf: r.lf.map((f) => f.slice(0, 2)), clusters: buildClusters() };
}
