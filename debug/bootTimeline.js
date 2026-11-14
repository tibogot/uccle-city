// BOOT TIMELINE PROBE (perf audit step 10): an INIT SCRIPT (runs before the page's own scripts), not a module.
// Pass this file's text as chrome-devtools `navigate_page({ initScript })`, then after the boot:
//   __boot.report()          milestones (ms from navigation start) + per-stage breakdown
// Milestones: first GPU submit (the first drawn frame), the first full tile built, the cover lifted, all 9 full tiles
// in (?ring=1), the heroes' shaders done (their "shaders N ms (in the background)" lines), the last SYNCHRONOUS
// render pipeline. Breakdown: pipelines (sync / async, how long each blocked or took, by label), shader modules,
// downloads (resource timing: bytes, the last byte), long tasks / long animation frames, frame gaps after the reveal.
(() => {
  if (window.__boot) return;
  const now = () => performance.now();
  try { performance.setResourceTimingBufferSize(20000); } catch (e) {}
  const B = (window.__boot = { logs: [], pipes: [], shaders: [], long: [], loaf: [], gaps: [], submit0: null, cover: null, compute: [] });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) B.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) B.loaf.push([Math.round(e.startTime), Math.round(e.duration), [...(e.scripts || [])].sort((a, b) => b.duration - a.duration).slice(0, 2).map((s) => `${(s.sourceFunctionName || s.invoker || "").slice(0, 40)}@${(s.sourceURL || "").split("/").pop()}:${Math.round(s.duration)}`).join(" | ")]); }).observe({ type: "long-animation-frame", buffered: true }); } catch (e) {}
  let last = 0;
  const tick = (t) => { if (last && t - last > 50) B.gaps.push([Math.round(t), Math.round(t - last)]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const watch = () => { const c = document.getElementById("cover"); if (!c) return setTimeout(watch, 20); new MutationObserver(() => { if (c.classList.contains("gone") && B.cover == null) B.cover = Math.round(now()); }).observe(c, { attributes: true }); };
  watch();
  const ol = console.log.bind(console);
  console.log = (...a) => { B.logs.push([Math.round(now()), String(a[0]).slice(0, 220)]); ol(...a); };
  if (window.GPUDevice) {
    const D = GPUDevice.prototype;
    const lab = (d) => (d && d.label) || (d && d.vertex && d.vertex.module && d.vertex.module.label) || "";
    const cs = D.createRenderPipeline, ca = D.createRenderPipelineAsync;
    D.createRenderPipeline = function (d) { const t = now(); const r = cs.call(this, d); B.pipes.push({ t: Math.round(t), sync: true, ms: +(now() - t).toFixed(1), label: lab(d).slice(0, 80) }); return r; };
    D.createRenderPipelineAsync = function (d) {
      const t = now(), rec = { t: Math.round(t), sync: false, ms: null, label: lab(d).slice(0, 80) };
      B.pipes.push(rec);
      const p = ca.call(this, d);
      p.then(() => { rec.ms = Math.round(now() - t); rec.done = Math.round(now()); }, () => { rec.ms = -1; });
      return p;
    };
    for (const k of ["createComputePipeline", "createComputePipelineAsync"]) { const f = D[k]; D[k] = function (d) { B.compute.push([Math.round(now()), k]); return f.call(this, d); }; }
    const sm = D.createShaderModule;
    D.createShaderModule = function (d) { const t = now(); const r = sm.call(this, d); B.shaders.push([Math.round(t), +(now() - t).toFixed(1), (d && d.code ? d.code.length : 0)]); return r; };
    const Q = GPUQueue.prototype, sub = Q.submit;
    Q.submit = function (c) { if (B.submit0 == null) B.submit0 = Math.round(now()); return sub.call(this, c); };
  }
  // main.js calls window.__bootHook(renderer, THREE) once the renderer exists: time every NODE BUILD (three builds a
  // material's TSL graph into WGSL on the main thread the first time a (material, geometry, lights...) key is drawn)
  B.builds = [];
  window.__bootHook = (renderer) => {
    const N = renderer._nodes, g = N.getForRender;
    N.getForRender = function (ro, yieldFn = null) {
      if (yieldFn !== null || this.get(ro).nodeBuilderState !== undefined) return g.call(this, ro, yieldFn);
      const n0 = this.nodeBuilderCache.size, t = now();
      const r = g.call(this, ro, yieldFn);
      const ms = now() - t;
      if (ms > 0.3 || this.nodeBuilderCache.size !== n0) { const m = ro.material.isShadowPassMaterial && renderer._currentSourceMaterial ? { type: "SH", name: renderer._currentSourceMaterial.name || renderer._currentSourceMaterial.type } : ro.material; B.builds.push([Math.round(t), +ms.toFixed(1), `${m.type}${m.name ? ":" + m.name : ""}`.slice(0, 70), ro.object?.name?.slice(0, 30) || "", ro.context?.isShadow ? 1 : 0]); }
      return r;
    };
  };
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  B.report = () => {
    const cover = B.cover ?? Infinity;
    const L = B.logs;
    const at = (rx) => { const e = L.find((x) => rx.test(x[1])); return e ? e[0] : null; };
    // full tiles: the start tile ("tile XX: main-thread work") + every "+ tile", minus "- tile"
    let full = 0, all9 = null; const tileT = [];
    for (const [t, s] of L) {
      if (/^tile \w+: main-thread work/.test(s) && full === 0) { full = 1; tileT.push(t); }
      else if (/^\+ tile /.test(s)) { full++; tileT.push(t); if (full >= 9 && all9 == null) all9 = t; }
      else if (/^- tile /.test(s)) full--;
    }
    const heroes = L.filter((x) => /shaders \d+ ms/.test(x[1])).map((x) => [x[0], x[1].split(":")[0].slice(0, 30), +x[1].match(/shaders (\d+) ms/)[1]]);
    const sync = B.pipes.filter((p) => p.sync), asyn = B.pipes.filter((p) => !p.sync);
    const res = performance.getEntriesByType("resource");
    const bytes = (f) => Math.round(sum(res.filter(f).map((r) => r.transferSize || 0)) / 1024);
    const dec = (f) => Math.round(sum(res.filter(f).map((r) => r.decodedBodySize || r.encodedBodySize || 0)) / 1024);
    const before = (r) => r.responseEnd <= cover;
    const kinds = {};
    for (const r of res.filter(before)) { const k = (r.name.match(/\.(\w+)(\?|$)/) || [, "?"])[1]; (kinds[k] ||= [0, 0, 0]); kinds[k][0]++; kinds[k][1] += Math.round((r.transferSize || 0) / 1024); kinds[k][2] += Math.round((r.decodedBodySize || 0) / 1024); }
    const byLabel = {};
    for (const p of B.pipes) { const k = p.label.replace(/_\d+$/, "").replace(/\d+/g, "#"); (byLabel[k] ||= 0); byLabel[k]++; }
    const lb = B.long.filter((x) => x[0] < cover), la = B.long.filter((x) => x[0] >= cover);
    return {
      milestones: {
        firstSubmit: B.submit0, firstTile: tileT[0] ?? null, warmupLine: at(/^warm-up:/), cover: B.cover, all9Full: all9, fullTiles: full,
        farLodDone: at(/^far LOD:/), heroesDone: heroes.length ? Math.max(...heroes.map((h) => h[0])) : null,
        lastSyncPipeline: sync.length ? sync[sync.length - 1].t : null, lastPipeline: B.pipes.length ? B.pipes[B.pipes.length - 1].t : null,
      },
      tiles: tileT,
      heroes,
      pipelines: {
        sync: sync.length, syncBlockMs: Math.round(sum(sync.map((p) => p.ms))), syncAfterCover: sync.filter((p) => p.t >= cover).length,
        syncAfterCoverMs: Math.round(sum(sync.filter((p) => p.t >= cover).map((p) => p.ms))), syncTop: [...sync].sort((a, b) => b.ms - a.ms).slice(0, 6).map((p) => [p.t, p.ms, p.label]),
        async: asyn.length, asyncBeforeCover: asyn.filter((p) => p.t < cover).length, asyncAfterCover: asyn.filter((p) => p.t >= cover).length,
        asyncMedianMs: (() => { const m = asyn.map((p) => p.ms).filter((x) => x > 0).sort((a, b) => a - b); return m[m.length >> 1] ?? null; })(),
        asyncLastDone: Math.max(0, ...asyn.map((p) => p.done || 0)),
        byLabel: Object.entries(byLabel).sort((a, b) => b[1] - a[1]).slice(0, 25),
        compute: B.compute.length,
      },
      shaders: { n: B.shaders.length, beforeCover: B.shaders.filter((s) => s[0] < cover).length, ms: Math.round(sum(B.shaders.map((s) => s[1]))), kB: Math.round(sum(B.shaders.map((s) => s[2])) / 1024) },
      downloads: {
        n: res.length, kB: bytes(() => true), decodedKB: dec(() => true), beforeCoverKB: bytes(before), cachedBeforeCover: res.filter((r) => before(r) && r.transferSize === 0).length,
        lastByteBeforeCover: Math.round(Math.max(0, ...res.filter(before).map((r) => r.responseEnd))), kinds,
      },
      longTasks: { beforeN: lb.length, beforeMs: sum(lb.map((x) => x[1])), beforeTop: [...lb].sort((a, b) => b[1] - a[1]).slice(0, 6), afterN: la.length, afterMs: sum(la.map((x) => x[1])), afterTop: [...la].sort((a, b) => b[1] - a[1]).slice(0, 8) },
      loafTop: [...B.loaf].sort((a, b) => b[1] - a[1]).slice(0, 8),
      gapsAfterCover: { over50: B.gaps.filter((g) => g[0] >= cover).length, top: B.gaps.filter((g) => g[0] >= cover).sort((a, b) => b[1] - a[1]).slice(0, 8) },
      nodeBuilds: (() => {
        const b = B.builds, by = {};
        for (const [t, ms, k] of b) { const key = k.replace(/\d+/g, "#"); (by[key] ||= [0, 0]); by[key][0]++; by[key][1] += ms; }
        return { n: b.length, ms: Math.round(sum(b.map((x) => x[1]))), beforeCover: b.filter((x) => x[0] < cover).length, beforeCoverMs: Math.round(sum(b.filter((x) => x[0] < cover).map((x) => x[1]))),
          afterCoverMs: Math.round(sum(b.filter((x) => x[0] >= cover).map((x) => x[1]))), top: Object.entries(by).sort((a, b) => b[1][1] - a[1][1]).slice(0, 30).map(([k, v]) => [k, v[0], Math.round(v[1])]) };
      })(),
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    };
  };
})();
