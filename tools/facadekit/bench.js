// In-page benchmark for the façade kit A/B (paste / evaluate in the city page, ?kit=0 vs ?kit=1, same URL otherwise).
// Waits for the streaming to settle, then for each view: camera set, 3 s settle, GPU samples reset, 5 s measured;
// returns GPU ms (avg / p50 / p95), draw calls, triangles, the kit's stats and the long tasks seen while streaming.
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (!window.viewer) await sleep(250);
  const v = window.viewer;
  const long = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch {}
  await v.loading; await sleep(4000);
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  const views = {
    street: [[1214.5, 81.2, 621.0], [1229, 82.5, 648]],
    aerial: [[1120, 230, 820], [1220, 80, 640]],
  };
  const out = { kit: !!window.__kit, long: [] };
  for (const [k, [p, t]] of Object.entries(views)) {
    v.camera.position.set(...p); v.controls.target.set(...t); v.controls.update();
    await sleep(3000); v.resetGpu(); await sleep(5000);
    const r = v.renderer.info.render;
    out[k] = { gpu: v.gpuStats(), draws: r.drawCalls ?? r.calls, tris: r.triangles, kit: window.__kit ? { ...window.__kit.stats } : null };
  }
  out.long = long.filter((x) => x > 50);
  out.tileLog = document.getElementById("log").textContent.split("\n").filter((l) => /main-thread work/.test(l));
  return out;
}
