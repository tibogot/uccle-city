async () => {
  // background loop over tiles: stream each tile in (ring=0), run viewer.collisionTest, keep compact results
  const m = await (await fetch('/data/tiles/manifest.json')).json();
  const list = (window.__runList || m.tiles.map((t) => t.name));
  const prev = window.__runAll;
  const st = window.__runAll = { list, i: 0, results: prev?.results || {}, errors: {}, t0: performance.now(), running: true };
  window.__rafOrig ??= window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);   // a background tab throttles rAF: the tile build's frame slices
  viewer.pause(true);
  const compact = (r) => ({
    tile: r.tile, ms: r.ms,
    static: { invisible: r.static.invisible, invisibleM2: r.static.invisibleM2, missing: r.static.missing, missingM2: r.static.missingM2, byKind: r.static.byKind, items: r.static.items.slice(0, 120) },
    drive: r.drive && { ...r.drive, items: r.drive.items.slice(0, 80) },
    walk: r.walk && { ...r.walk, items: r.walk.items.slice(0, 80) },
  });
  (async () => {
    for (; st.i < list.length && st.running; st.i++) {
      const name = list[st.i], e = m.tiles.find((t) => t.name === name);
      try {
        const cx = (e.bounds.x[0] + e.bounds.x[1]) / 2, cz = (e.bounds.z[0] + e.bounds.z[1]) / 2;
        viewer.controls.target.set(cx, 60, cz);
        if (st.results[name]) continue;
        for (let k = 0; k < 240 && !viewer.world.tiles.some((t) => t.name === name); k++) await new Promise((r) => setTimeout(r, 500));
        if (!viewer.world.tiles.some((t) => t.name === name)) throw new Error('tile did not load');
        // the landmarks' colliders (heroColliders.js polls every 2 s); collisionTest waits for the on-foot world itself
        await new Promise((r) => setTimeout(r, 3000));
        const r = await viewer.collisionTest(name, {});
        st.results[name] = compact(r);
      } catch (err) { st.errors[name] = String(err.message || err); }
    }
    st.running = false; st.ms = performance.now() - st.t0;
  })();
  return { started: list.length };
}
