async () => {
  // runs the contact check on every hero whose tiles are all loaded; waits for the streaming
  const T = __T;
  const m = await (await fetch('/data/tiles/manifest.json')).json();
  const names = ['stjob', 'townhall', 'stalle', 'vanbuuren', 'wolvendael', 'police', 'calevoet', 'stpierre', 'observatory', 'bridge-verrewinkel', 'bridge-stjob', 'bridge-calevoet'];
  const need = (n) => {
    const r = viewer.scene.getObjectByName(n); if (!r) return null;
    const l0 = r.children.find((c) => /[-_]lod0$/.test(c.name)) || r; r.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(l0);
    return m.tiles.filter((t) => b.max.x + 3 >= t.bounds.x[0] && b.min.x - 3 < t.bounds.x[1] && b.max.z + 3 >= t.bounds.z[0] && b.min.z - 3 < t.bounds.z[1]).map((t) => t.name);
  };
  const want = (window.__joinWant || names);
  const out = {};
  for (let i = 0; i < 120; i++) {
    const loaded = viewer.world.tiles.map((t) => t.name);
    const ready = want.filter((n) => { const q = need(n); return q && q.length && q.every((t) => loaded.includes(t)); });
    const pend = want.filter((n) => need(n)?.some((t) => loaded.includes(t)) && !ready.includes(n));
    if (!pend.length) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const loaded = viewer.world.tiles.map((t) => t.name);
  for (const n of want) {
    const q = need(n);
    if (!q || !q.every((t) => loaded.includes(t))) continue;
    const r = await viewer.contactAudit(n);
    out[n] = { tiles: q, summary: r.summary, items: r.items };
  }
  window.__joins = out;
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { tiles: v.tiles.join(' '), ...v.summary, top: v.items.filter((i) => i.sev === 'block').slice(0, 6).map((i) => [i.kind, i.at, i.length, i.gapMax, i.part.split('/').pop().replace(/:fade|lib:|:scan:uv:.*/g, '')]) }]));
}
