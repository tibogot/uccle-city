// PERF JOB C step 1 (docs/PERF_RESEARCH_2026-11.md "Job C"): how many indirect draws, and how many DISTINCT indirect
// buffers, each render pass encodes. Chrome's Dawn on D3D12 validates the indirect args with a compute dispatch per
// indirect buffer (and per pass), so the distinct-buffer count is what a pooled args buffer would save.
// Wraps GPUCommandEncoder.beginRenderPass, GPURenderPassEncoder.draw* / end and GPURenderBundleEncoder.draw*Indirect
// (prototype wraps: works when imported after the boot, or as an init script). Read-only: vendor/ untouched.
//   const C = await import("/debug/indirectCount.js");
//   C.start(); await C.wait(3000); C.report()      per pass kind: passes, draws, indirect draws, distinct buffers (avg / max)
//   C.stop()
// A pass is named by its colour target size + format + depth-only flag (the sun shadow map is depth-only 4096²).
const S = (window.__indCount ||= { on: false, passes: [], cur: null, hooked: false });

function hook() {
  if (S.hooked || !window.GPUCommandEncoder) return;
  S.hooked = true;
  const CE = GPUCommandEncoder.prototype, RP = GPURenderPassEncoder.prototype;
  const begin = CE.beginRenderPass;
  CE.beginRenderPass = function (d) {
    const p = begin.call(this, d);
    if (S.on) {
      const c = d?.colorAttachments?.find?.((a) => a), z = d?.depthStencilAttachment;
      const t = c?.view?.__tex || null;
      const key = (c ? `color${d.colorAttachments.length}` : "depthonly") + (d?.label ? `:${d.label}` : "") + (t ? `:${t}` : "") + (z ? "+z" : "");
      S.cur = { key, draws: 0, idx: 0, ind: 0, bufs: new Set(), bundles: 0 };
      p.__ic = S.cur;
    }
    return p;
  };
  // remember texture sizes on views, so passes can be told apart
  const TP = GPUTexture.prototype, cv = TP.createView;
  TP.createView = function (d) { const v = cv.call(this, d); try { v.__tex = `${this.width}x${this.height}${this.format ? ":" + this.format : ""}`; } catch (e) {} return v; };
  const wrapCount = (P, name, kind) => {
    const f = P[name]; if (!f) return;
    P[name] = function (...a) {
      const r = this.__ic;
      if (r) {
        if (kind === "ind") { r.ind++; r.bufs.add(a[0]); } else if (kind === "idx") r.idx++; else r.draws++;
      } else if (this.__icb && S.on) { if (kind === "ind") { this.__icb.ind++; this.__icb.bufs.add(a[0]); } }
      return f.apply(this, a);
    };
  };
  wrapCount(RP, "draw", "draw");
  wrapCount(RP, "drawIndexed", "idx");
  wrapCount(RP, "drawIndirect", "ind");
  wrapCount(RP, "drawIndexedIndirect", "ind");
  const ex = RP.executeBundles;
  RP.executeBundles = function (b) {
    const r = this.__ic;
    if (r) for (const x of b || []) { r.bundles++; if (x.__icb) { r.ind += x.__icb.ind; for (const y of x.__icb.bufs) r.bufs.add(y); } }
    return ex.call(this, b);
  };
  const end = RP.end;
  RP.end = function () {
    const r = this.__ic;
    if (r && S.on) { S.passes.push({ key: r.key, draws: r.draws, idx: r.idx, ind: r.ind, bufs: r.bufs.size, bundles: r.bundles, t: performance.now() }); this.__ic = null; if (S.passes.length > 20000) S.passes.splice(0, 10000); }
    return end.call(this);
  };
  if (window.GPURenderBundleEncoder) {
    const BE = GPURenderBundleEncoder.prototype, fin = BE.finish;
    const mk = (e) => (e.__icb ||= { ind: 0, bufs: new Set() });
    for (const n of ["drawIndirect", "drawIndexedIndirect"]) {
      const f = BE[n]; if (!f) continue;
      BE[n] = function (...a) { const r = mk(this); r.ind++; r.bufs.add(a[0]); return f.apply(this, a); };
    }
    BE.finish = function (d) { const b = fin.call(this, d); if (this.__icb) b.__icb = this.__icb; return b; };
  }
}
hook();

export function start() { hook(); S.passes.length = 0; S.on = true; }
export function stop() { S.on = false; }
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** per pass kind: count, draws (all), indirect draws and distinct indirect buffers (avg / max per pass) */
export function report(passes = S.passes) {
  const by = {};
  for (const p of passes) {
    const b = (by[p.key] ||= { n: 0, draws: 0, ind: 0, bufs: 0, maxInd: 0, maxBufs: 0, bundles: 0 });
    b.n++; b.draws += p.draws + p.idx + p.ind; b.ind += p.ind; b.bufs += p.bufs; b.bundles += p.bundles;
    b.maxInd = Math.max(b.maxInd, p.ind); b.maxBufs = Math.max(b.maxBufs, p.bufs);
  }
  const out = {};
  for (const [k, b] of Object.entries(by)) out[k] = { passes: b.n, drawsAvg: +(b.draws / b.n).toFixed(1), indAvg: +(b.ind / b.n).toFixed(1), indMax: b.maxInd, bufsAvg: +(b.bufs / b.n).toFixed(1), bufsMax: b.maxBufs, bundles: b.bundles };
  const all = passes.reduce((m, p) => Math.max(m, p.bufs), 0);
  return { passes: passes.length, maxDistinctBuffersInAPass: all, byPass: out };
}
