// THE UNDERPASS'S STREAM-IN PROBE (claude/underpass1 round 2, rule interior-stream-paced, docs/CALEVOET_UNDERPASS_PLAN.md):
//   open /viewer/index.html?quick=1&at=-1202,700,1.7&look=-1200,850,1.5&radius=250&dynres=0 in a FRONT tab (sound off),
//   wait for window.__quickReady and ~5 s, then: (await import('/debug/underpassStream.js')).run()
//   -> { pass, over34, worst, overAt, longTasks, ... }
// The camera walks north along the Rue Engeland / Dieweg sidewalk from 150 m to 12 m short of the east kiosk in 41 steps
// of 200 ms (the inside fetches < 80 m, compiles paced, shows < 50 m), then steps down the east stair into the corridor
// and looks west; rAF intervals and long tasks are recorded until 6 s after it shows. Pass: 0 frames over 34 ms (two
// 60 Hz vsyncs + jitter) and no long task. Reload between runs (the inside is cached once loaded).
export async function run({ steps = 40, stepMs = 200 } = {}) {
  const v = window.viewer, U = window.__underpass ?? { inside: { state: { t: {} } } };   // (?underpass=0: the same walk, the A/B)
  if (U.inside.state.cell || U.inside.state.loading) return { error: "the inside is loaded already: reload first" };
  const gy = 52.9;                       // the sidewalk's level at the east kiosk (m TAW)
  const cam = (x, y, z, tx, ty, tz) => { v.camera.position.set(x, y, z); v.controls.target.set(tx, ty, tz); v.controls.update?.(); v.camera.lookAt(tx, ty, tz); };
  const dts = []; let last = performance.now(), on = true;
  const tick = (t) => { dts.push([t, t - last]); last = t; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const lt = []; let po = null;
  try { po = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push([e.startTime, e.duration]); }); po.observe({ type: "longtask" }); } catch { /* no API */ }
  cam(-1202, gy + 1.7, 700, -1200, gy + 1.5, 850);
  await new Promise((q) => setTimeout(q, 2500));
  const t0 = performance.now();
  for (let k = 0; k <= steps; k++) { const z = 700 + (838 - 700) * (k / steps); cam(-1202, gy + 1.7, z, -1199, gy + 1.0, z + 30); await new Promise((q) => setTimeout(q, stepMs)); }
  for (let i = 0; i < 60 && window.__underpass && !U.inside.state.shown; i++) await new Promise((q) => setTimeout(q, 500));
  const tShown = performance.now();
  await new Promise((q) => setTimeout(q, 3000));
  // down the stair and into the corridor (the inside fully on screen: its first full draw)
  cam(-1197.2, 51.5, 853, -1195.5, 49.6, 859);
  await new Promise((q) => setTimeout(q, 1500));
  cam(-1196.5, 50.2, 861.2, -1212.5, 50.0, 869.4);
  await new Promise((q) => setTimeout(q, 3000));
  on = false; po?.disconnect();
  const after = dts.filter(([t]) => t > t0), over = after.filter(([, d]) => d > 34);
  const st = U.inside.state;
  return { pass: over.length === 0 && !lt.some(([t]) => t > t0), over34: over.length, worst: +Math.max(...after.map((a) => a[1])).toFixed(1), over25: after.filter(([, d]) => d > 25).length,
    top: [...after].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, d]) => [Math.round(t - t0), +d.toFixed(1)]),
    overAt: over.map(([t, d]) => [Math.round(t - t0), +d.toFixed(1)]), longTasks: lt.filter(([t]) => t > t0).map(([t, d]) => [Math.round(t - t0), Math.round(d)]),
    startMs: Math.round(st.t.start - t0), loadedMs: Math.round(st.t.loaded - t0), compiledMs: Math.round(st.t.compiled - t0), shownMs: Math.round(tShown - t0),
    t0Abs: Math.round(t0), marks: st.marks ?? null, stats: st.stats, frames: after.length, dynres: window.__pipe?.upscale?.dynres ?? null };
}
