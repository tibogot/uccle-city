// perf5 (docs/perf/QUIET_2026-11-26.md): GPU at the villa, standing in the garden and inside (villaStream.js's frame).
//   const P = await import('/debug/perf5Villa.js'); await P.views()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const o = [909.874, 2037.15], rr = -2.624849841366921, c = Math.cos(rr), s = Math.sin(rr);
const uw = (u, w) => [o[0] + u * c + w * s, o[1] - u * s + w * c];
function put(u, w, h, tu, tw, th) {
  const v = window.viewer, [x, z] = uw(u, w), [tx, tz] = uw(tu, tw);
  v.camera.position.set(x, h, z); v.controls.target.set(tx, th, tz); v.controls.update?.(); v.camera.lookAt(tx, th, tz);
}
export const VIEWS = {
  // the garden: 30 m in front of the house at eye height, looking at it
  garden: () => { const [x, z] = uw(-30, 5); const g = window.viewer.world.surface(x, z); put(-30, 5, g + 1.7, 0, 0, g + 3); },
  // inside: where villaStream.js ends (the interior shown), looking along the house
  inside: () => put(4, 5, 125, 25, 0, 119),
};
export async function views({ order = ["garden", "inside"], seconds = 5 } = {}) {
  const G = await import("/debug/gpuAB.js"), out = {};
  for (const k of order) {
    const hold = setInterval(VIEWS[k], 100); VIEWS[k]();
    if (k === "inside") for (let i = 0; i < 40 && !window.villa?.inner?.state?.shown; i++) await sleep(500);
    const r = await G.measure({ settle: 4, seconds });
    clearInterval(hold);
    out[k] = { p50: r.p50, avg: r.avg, p95: r.p95, draws: r.draws, tris: r.tris, shown: !!window.villa?.inner?.state?.shown, passes: r.passes.slice(0, 4) };
  }
  return out;
}
