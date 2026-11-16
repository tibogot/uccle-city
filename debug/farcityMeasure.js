// FAR CITY frame cost at a parked view (docs/FARCITY.md): the page paused, `seconds` of frames rendered here, GPU time of
// each (timestamp queries, all passes), CPU time of renderFrame, draws and triangles. Compare two pages (?farlook=old vs
// default) at the same view:  const m = await import("/debug/farcityMeasure.js"); await m.measure("overview")
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
export async function measure(view, { seconds = 6 } = {}) {
  const s = await import("/debug/farcityShots.js");
  if (view) await s.go(view);
  const r = viewer.renderer, gpu = [], cpu = []; let draws = 0, tris = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) {
    const c0 = performance.now(); viewer.renderFrame(); cpu.push(performance.now() - c0); draws = r.info.render.drawCalls ?? r.info.render.calls; tris = r.info.render.triangles;
    await new Promise((q) => requestAnimationFrame(q));
    const g = await r.resolveTimestampsAsync("render").catch(() => null);
    if (typeof g === "number" && g > 0) gpu.push(g);
  }
  return { view, frames: cpu.length, gpuMed: +median(gpu).toFixed(2), cpuMed: +median(cpu).toFixed(2), draws, tris: +(tris / 1e6).toFixed(2), ...s.state() };
}
