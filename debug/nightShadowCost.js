// The night lamp shadows' cost by construction (docs/NIGHT_HOOKUP.md round 2): over `seconds`, per frame, the lamp
// shadow passes' draws and triangles and how many maps were rendered, for each shadow schedule ("smart" / "full"),
// plus the night update's CPU (ms average) and the per-frame uploads of the night layers.
//   const C = await import("/debug/nightShadowCost.js"); await C.compare()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sample(seconds = 4) {
  const N = window.__night, b = window.viewer.renderer.backend;
  const cams = new Set(N.shadowLights.map((L) => L.shadow.camera));
  let frames = 0, draws = 0, tris = 0, run = true;
  const tick = () => { if (!run) return; frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const orig = b.draw;
  b.draw = function (ro, info) {
    if (cams.has(ro.camera)) { draws++; const g = ro.geometry; tris += ((g.index?.count ?? g.attributes.position.count) / 3) * (ro.object.count ?? 1); }
    return orig.call(this, ro, info);
  };
  const r0 = N.stats.shadowRenders, s0 = N.stats.shadowSkips, ms = [];
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) { await sleep(100); ms.push(N.stats.ms); }
  run = false; b.draw = orig;
  const renders = N.stats.shadowRenders - r0, skips = N.stats.shadowSkips - s0;
  return { frames, mapsPerFrame: +(renders / Math.max(1, frames)).toFixed(2), skipped: +(skips / Math.max(1, renders + skips)).toFixed(2),
    drawsPerFrame: +(draws / frames).toFixed(1), ktrisPerFrame: Math.round(tris / frames / 1000), cpuMs: +(ms.reduce((a, v) => a + v, 0) / ms.length).toFixed(3),
    dynQuads: N.stats.dyn, glareCards: N.glare.mesh.count, uploadKB: +((N.stats.dyn * 27 * 4 + N.glare.mesh.count * 11 * 4) / 1024).toFixed(1) };
}

export async function compare(seconds = 4) {
  const N = window.__night, out = {};
  for (const m of ["full", "smart", "full", "smart"]) { N.shadowMode = m; await sleep(800); (out[m] ??= []).push(await sample(seconds)); }
  N.shadowMode = "smart";
  return out;
}
