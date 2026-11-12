async () => {
  // background loop: every tile's roads / sidewalks / plazas against its terrain (+ the landmarks there), the JOINS
  // contact check (viewer.contactAudit("roads:<tile>")); results in window.__roadsRun
  const m = await (await fetch('/data/tiles/manifest.json')).json();
  const list = window.__runList || m.tiles.map((t) => t.name);
  const prev = window.__roadsRun;
  const st = window.__roadsRun = { list, i: 0, results: prev?.results || {}, errors: {}, t0: performance.now(), running: true };
  viewer.pause(true);
  (async () => {
    for (; st.i < list.length && st.running; st.i++) {
      const name = list[st.i], e = m.tiles.find((t) => t.name === name);
      if (st.results[name]) continue;
      try {
        viewer.controls.target.set((e.bounds.x[0] + e.bounds.x[1]) / 2, 60, (e.bounds.z[0] + e.bounds.z[1]) / 2);
        for (let k = 0; k < 240 && !viewer.world.tiles.some((t) => t.name === name); k++) await new Promise((r) => setTimeout(r, 500));
        if (!viewer.world.tiles.some((t) => t.name === name)) throw new Error('tile did not load');
        await new Promise((r) => setTimeout(r, 500));
        const r = await viewer.contactAudit(`roads:${name}`);
        st.results[name] = { summary: r.summary, items: r.items.filter((i) => i.sev === 'block').slice(0, 60) };
      } catch (err) { st.errors[name] = String(err.message || err); }
    }
    st.running = false; st.ms = performance.now() - st.t0;
  })();
  return { started: list.length };
}
