// perf5 (the tour's darkening, 2026-11-26): the tour's settle (debug/tour.js: TSL time + wind held, the eye adaptation
// converged) inside the city page itself, then the frame's mean luma (whole frame, the top quarter = the sky) and the
// renderer / exposure state.  const L = await import('/debug/perf5Luma.js'); await L.measure()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
export async function measure({ tslTime = 12.5 } = {}) {
  for (let i = 0; i < 120 && !window.__quickReady; i++) await sleep(1000);
  const v = window.viewer, nf = v.renderer._nodes?.nodeFrame;
  try { Object.defineProperty(nf, "time", { get: () => tslTime, set: () => {}, configurable: true }); } catch { /* held */ }
  try { const { wind } = await import("/viewer/foliage/wind.js"); wind.frozen = true; wind.uTime.value = tslTime; } catch { /* none */ }
  for (const d of document.querySelectorAll("body > div")) if (!d.querySelector("canvas")) d.style.visibility = "hidden";
  if (v.lighting) v.lighting.snapNext = true;
  await frames(60);
  const st = v.lighting?.sky?.exposureState, ts = performance.now();
  let calm = 0;
  while (st && performance.now() - ts < 15000) { calm = st.target > 0 && Math.abs(st.value / st.target - 1) < 0.004 ? calm + 1 : 0; if (calm >= 10 && performance.now() - ts > 2000) break; await frames(1); }
  const c = v.renderer.domElement, W = 320, H = 180, out = new OffscreenCanvas(W, H), g = out.getContext("2d", { willReadFrequently: true });
  v.renderFrame(); g.drawImage(c, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data;
  let all = 0, sky = 0, ns = 0;
  for (let i = 0, p = 0; i < px.length; i += 4, p++) { const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; all += l; if (p < W * (H / 4)) { sky += l; ns++; } }
  const r = v.renderer;
  return { luma: +(all / (W * H)).toFixed(2), skyLuma: +(sky / ns).toFixed(2), exposure: st ? [+st.value.toFixed(4), +st.target.toFixed(4)] : null,
    renderer: { toneMapping: r.toneMapping, exposure: r.toneMappingExposure, outputColorSpace: r.outputColorSpace, target: r.getRenderTarget()?.texture?.name ?? null, mrt: !!r.getMRT() },
    pipe: { exposureValue: window.__pipe?.exposureValue ?? null } };
}
