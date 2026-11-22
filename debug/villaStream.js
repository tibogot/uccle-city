// THE VILLA'S STREAM-IN PROBE (browser row `villa`, rule interior-stream-paced, docs/VILLA.md):
//   open ?quick=1&at=990,1960,30&look=890,2050,10&radius=220&dynres=0 in a FRONT tab, wait for window.__quickReady and
//   ~5 s, then: (await import('/debug/villaStream.js')).run()  -> { over33, worst, longTasks, ... }
// The camera flies from frame u -60 to u 4 (w 5, 125 m TAW) in 41 steps of 200 ms: the interior fetches (< 60 m),
// compiles (paced), shows (< 30 m); rAF intervals and long tasks are recorded until 6 s after it shows. Pass: 0 frames
// over 33.4 ms and no long task, in each of 3 runs (a reload between runs: the cell is cached once loaded).
export async function run() {
  const o = [909.874, 2037.15], r = -2.624849841366921, c = Math.cos(r), s = Math.sin(r);
  const uw = (u, w) => [o[0] + u * c + w * s, o[1] - u * s + w * c];
  const cam = (u, w, h, tu, tw, th) => { const [x, z] = uw(u, w), [tx, tz] = uw(tu, tw); const v = window.viewer; v.camera.position.set(x, h, z); v.controls.target.set(tx, th, tz); v.controls.update?.(); v.camera.lookAt(tx, th, tz); };
  if (window.villa?.inner.state.cell) return { error: "the interior is loaded already: reload first" };
  const dts = []; let last = performance.now(), on = true;
  const tick = (t) => { dts.push([t, t - last]); last = t; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const lt = []; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push([e.startTime, e.duration]); }); po.observe({ type: "longtask" });
  await new Promise((q) => setTimeout(q, 2000));
  const t0 = performance.now();
  for (let k = 0; k <= 40; k++) { cam(-60 + k * 1.6, 5, 125, 25, 0, 119); await new Promise((q) => setTimeout(q, 200)); }
  for (let i = 0; i < 60 && !window.villa.inner.state.shown; i++) await new Promise((q) => setTimeout(q, 500));
  await new Promise((q) => setTimeout(q, 6000));
  on = false; po.disconnect();
  const after = dts.filter(([t]) => t > t0), over = after.filter(([, d]) => d > 33.4);
  const st = window.villa.inner.state;
  return { pass: over.length === 0 && !lt.some(([t]) => t > t0), over33: over.length, worst: +Math.max(...after.map((a) => a[1])).toFixed(1),
    overAt: over.map(([t, d]) => [Math.round(t - t0), +d.toFixed(1)]), longTasks: lt.filter(([t]) => t > t0).map(([t, d]) => [Math.round(t - t0), Math.round(d)]),
    loadedMs: Math.round(st.t.loaded - t0), compiledMs: Math.round(st.t.compiled - t0), frames: after.length, dynres: window.__pipe?.upscale?.dynres ?? null };
}
