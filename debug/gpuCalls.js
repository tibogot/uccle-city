// GPU CALL LOG (docs/BOOT.md): an INIT SCRIPT (pass its text as chrome-devtools navigate_page({ initScript }), or load it
// with a sync XHR as debug/bootTimeline.js) recording every WebGPU call that can make the GPU PROCESS' main thread
// busy: sync render pipelines, shader modules (WGSL size), buffers / textures created (bytes), queue writes (bytes),
// copies, submits. The GPU process' main thread also draws the page's compositor frames (the loading screen), so a
// long GPU task there is a stalled loading screen; match these calls (performance.now() = ms since the navigation)
// with the trace's CrGpuMain "GPUTask" events (tools/perf/trace_frames.py --gpu).
//   __gpuCalls.around(t, ms = 300)   the calls in [t - ms, t]: what the page asked for just before a GPU task at t
//   __gpuCalls.sum(t0, t1)           totals by kind in a window
(() => {
  if (window.__gpuCalls || !window.GPUDevice) return;
  const L = [];
  const now = () => performance.now();
  const rec = (k, n) => L.push([+now().toFixed(1), k, n | 0]);
  const D = GPUDevice.prototype, Q = GPUQueue.prototype;
  const wrap = (P, name, size) => { const f = P[name]; if (!f) return; P[name] = function (...a) { rec(name, size ? size(...a) : 0); return f.apply(this, a); }; };
  wrap(D, "createRenderPipeline");
  wrap(D, "createRenderPipelineAsync");
  wrap(D, "createComputePipeline");
  wrap(D, "createShaderModule", (d) => (d && d.code ? d.code.length : 0));
  wrap(D, "createBuffer", (d) => d && d.size);
  wrap(D, "createTexture", (d) => { if (!d || !d.size) return 0; const s = d.size; const w = s.width ?? s[0] ?? 1, h = s.height ?? s[1] ?? 1, l = s.depthOrArrayLayers ?? s[2] ?? 1; return w * h * l * 4; });
  wrap(D, "createBindGroup");
  wrap(Q, "writeBuffer", (b, o, data, dOff, size) => size ?? (data && data.byteLength) ?? 0);
  wrap(Q, "writeTexture", (dst, data) => (data && data.byteLength) || 0);
  wrap(Q, "copyExternalImageToTexture", (src, dst, size) => { const w = size.width ?? size[0] ?? 0, h = size.height ?? size[1] ?? 0; return w * h * 4; });
  wrap(Q, "submit");
  // clock marks for the trace (user timing): the trace's ts of "sync@<ms>" = performance.now() <ms>
  setInterval(() => { try { performance.mark(`sync@${Math.round(now())}`); } catch (e) {} }, 1000);
  window.__gpuCalls = {
    log: L,
    around(t, ms = 300) { return this.sum(t - ms, t); },
    sum(t0, t1) {
      const o = {};
      for (const [t, k, n] of L) if (t >= t0 && t <= t1) { const e = (o[k] ||= [0, 0]); e[0]++; e[1] += n; }
      for (const k in o) if (/Buffer|Texture|Shader|Image/.test(k)) o[k][1] = `${(o[k][1] / 1048576).toFixed(2)} MB` + (k === "createShaderModule" ? " of WGSL" : "");
      return o;
    },
  };
})();
