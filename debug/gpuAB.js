// GPU time of the current view (r187 timestamp queries): settle, then `seconds` of samples; with the passes summed
// over the frames sampled (shadow / scene / post ...). Use from a page loaded with the variant to compare, back to back.
//   const g = await import("/debug/gpuAB.js"); await g.measure({ seconds: 5 })
export async function measure({ settle = 4, seconds = 5 } = {}) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(settle * 1000);
  viewer.resetGpu();
  const passes = {};
  let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) {
    await sleep(250);
    const p = viewer.gpuPasses();
    if (!p) continue;
    n++;
    for (const [k, ms] of p) { const key = k.replace(/_\d+$/, "").replace(/\d+/g, "#"); passes[key] = (passes[key] || 0) + ms; }
  }
  const s = viewer.gpuStats(), r = viewer.renderer.info.render;
  return { avg: s.avg, p50: s.p50, p95: s.p95, n: s.n, draws: r.drawCalls ?? r.calls, tris: +(r.triangles / 1e6).toFixed(2),
    passes: Object.entries(passes).map(([k, v]) => [k, +(v / n).toFixed(2)]).sort((a, b) => b[1] - a[1]).slice(0, 8) };
}

/** Live A/B in one page: alternate a() / b() `rounds` times (settle, then sample), so both see the same background
 *  load (other tabs, other processes on the GPU). Returns the GPU p50 per round and the mean difference b - a. */
export async function alternate(a, b, { rounds = 6, settle = 1.2, seconds = 2.5 } = {}) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = [], B = [];
  for (let i = 0; i < rounds; i++) {
    for (const [f, out] of [[a, A], [b, B]]) {
      f(); await sleep(settle * 1000); viewer.resetGpu(); await sleep(seconds * 1000);
      out.push(viewer.gpuStats().p50);
    }
  }
  a();
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const d = B.map((v, i) => v - A[i]);
  return { A, B, meanA: +mean(A).toFixed(2), meanB: +mean(B).toFixed(2), diff: +mean(d).toFixed(2), diffMin: +Math.min(...d).toFixed(2), diffMax: +Math.max(...d).toFixed(2) };
}
