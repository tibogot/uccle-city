// perf5 (docs/perf/QUIET_2026-11-26.md): what each slow frame carried. Wraps the main loop (CPU ms) and, per frame, the
// sun cache's full redraws, a JS heap drop (GC), a tile event and the renders' object count; then the frames over 17.5 /
// 25 ms grouped by cause. Run beside a debug/gamePerf.js police drive:
//   const F = await import('/debug/perf5Frames.js'); F.start(); ...; F.stop()
const S = (window.__p5f ||= { on: false });
export function start() {
  const V = window.viewer, anim = V.renderer._animation, f = anim._animationLoop, sc = window.__sunCache;
  S.rows = []; S.on = true; S.prev = performance.now(); S.heap = performance.memory?.usedJSHeapSize ?? 0;
  S.full = sc?.stats.full ?? 0; S.tiles = V.world.tiles.length;
  anim._animationLoop = function (...a) {
    const t0 = performance.now();
    try { return f.apply(this, a); } finally {
      const t1 = performance.now(), h = performance.memory?.usedJSHeapSize ?? 0, fu = sc?.stats.full ?? 0, tl = V.world.tiles.length;
      S.rows.push({ dt: t0 - S.prev, cpu: t1 - t0, full: fu - S.full, gc: h < S.heap - 1.5e6 ? +((S.heap - h) / 1e6).toFixed(1) : 0, tile: tl !== S.tiles ? 1 : 0, draws: V.renderer.info.render.drawCalls ?? 0 });
      S.prev = t0; S.heap = h; S.full = fu; S.tiles = tl;
    }
  };
  S.undo = () => { anim._animationLoop = f; };
}
export function stop() {
  S.undo?.(); S.on = false;
  const R = S.rows.slice(1), n = R.length;
  // a frame's dt is the gap BEFORE its loop ran: the cost that made it late is in the previous loop (cpu of row i-1)
  const late = [];
  for (let i = 1; i < n; i++) if (R[i].dt > 25) late.push({ dt: +R[i].dt.toFixed(1), prevCpu: +R[i - 1].cpu.toFixed(1), prevFull: R[i - 1].full, prevGc: R[i - 1].gc, prevTile: R[i - 1].tile, cpu: +R[i].cpu.toFixed(1) });
  const cpu = R.map((r) => r.cpu).sort((a, b) => a - b), q = (f) => +cpu[Math.floor(f * (n - 1))].toFixed(2);
  const withFull = R.filter((r) => r.full), noFull = R.filter((r) => !r.full);
  const m = (a) => +(a.reduce((s, r) => s + r.cpu, 0) / Math.max(1, a.length)).toFixed(2);
  const over = (a, x) => a.filter((r) => r.cpu > x).length;
  return { frames: n, cpu: { avg: m(R), p50: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99) }, cpuOver16: over(R, 16), cpuOver20: over(R, 20),
    fullFrames: withFull.length, cpuFull: m(withFull), cpuNoFull: m(noFull), fullOver16: over(withFull, 16), gcFrames: R.filter((r) => r.gc).length, cpuGc: m(R.filter((r) => r.gc)), tileFrames: R.filter((r) => r.tile).length, cpuTile: m(R.filter((r) => r.tile)),
    lateN: late.length, lateWithFull: late.filter((l) => l.prevFull || l.full).length, late: late.slice(0, 40) };
}
