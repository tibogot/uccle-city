(() => {
  const P = (window.__probe = { long: [], frames: [], cover: null, pipes: [], logs: [], loaf: [], shaders: 0 });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.loaf.push([Math.round(e.startTime), Math.round(e.duration), Math.round(e.blockingDuration || 0), [...(e.scripts || [])].sort((a, b) => b.duration - a.duration).slice(0, 3).map((s) => `${(s.sourceFunctionName || s.invoker || "").slice(0, 50)}@${(s.sourceURL || "").split("/").pop()}:${Math.round(s.duration)}`).join(" | ")]); }).observe({ type: "long-animation-frame", buffered: true }); } catch (e) {}
  let last = 0;
  P.allFrames = [];
  const tick = (t) => { if (last) { const d = t - last; P.allFrames.push([Math.round(t), +d.toFixed(1)]); if (P.allFrames.length > 20000) P.allFrames.shift(); if (d > 17.5) P.frames.push([Math.round(t), Math.round(d)]); } last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const watch = () => { const c = document.getElementById("cover"); if (!c) return setTimeout(watch, 20); new MutationObserver(() => { if (c.classList.contains("gone") && P.cover == null) P.cover = Math.round(performance.now()); }).observe(c, { attributes: true }); };
  watch();
  const ol = console.log.bind(console);
  console.log = (...a) => { P.logs.push([Math.round(performance.now()), String(a[0]).slice(0, 140)]); ol(...a); };
  if (window.GPUDevice) {
    const D = GPUDevice.prototype;
    for (const k of ["createRenderPipeline", "createRenderPipelineAsync", "createComputePipeline", "createComputePipelineAsync"]) {
      const f = D[k];
      D[k] = function (desc) { const t = performance.now(); const r = f.call(this, desc); P.pipes.push([Math.round(t), k.replace("create", "").replace("Pipeline", ""), +(performance.now() - t).toFixed(1), (desc && desc.label || "").slice(0, 60)]); return r; };
    }
    const sm = D.createShaderModule;
    D.createShaderModule = function (d) { P.shaders++; return sm.call(this, d); };
  }
  P.report = (from = P.cover ?? 0) => ({
    cover: P.cover,
    longAfter: P.long.filter((x) => x[0] >= from).sort((a, b) => b[1] - a[1]).slice(0, 12),
    longBefore: P.long.filter((x) => x[0] < from).sort((a, b) => b[1] - a[1]).slice(0, 6),
    framesAfter: P.frames.filter((x) => x[0] >= from).sort((a, b) => b[1] - a[1]).slice(0, 12),
    nFramesOver: P.frames.filter((x) => x[0] >= from).length,
    pipesAfter: P.pipes.filter((x) => x[0] >= from).length,
    pipesAfterList: P.pipes.filter((x) => x[0] >= from).slice(0, 40),
    loafAfter: P.loaf.filter((x) => x[0] >= from).sort((a, b) => b[1] - a[1]).slice(0, 8),
  });
})();
