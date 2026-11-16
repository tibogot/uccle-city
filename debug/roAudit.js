// RENDER-OBJECT AUDIT (perf8, docs/PERF_GAME.md round 8): what three's render-object cache holds.
//   const A = await import("/debug/roAudit.js"); A.run()   -> { total, inScene, out, outGeoMB, outGeos, byTop, sweep }
// "out" = render objects whose object is not under the city's scene (stand-ins, bake proxies, other scenes' quads);
// outGeoMB = the typed arrays of their geometries that no in-scene render object shares (what a sweep can free).
const MB = (b) => +(b / 1048576).toFixed(1);
const geoBytes = (g, seen) => {
  let b = 0;
  const add = (a) => { const arr = a?.array ?? a?.data?.array; const buf = arr?.buffer; if (buf && !seen.has(buf)) { seen.add(buf); b += buf.byteLength; } };
  for (const k in g.attributes) add(g.attributes[k]);
  add(g.index);
  return b;
};
export function run() {
  const V = window.viewer, R = V.renderer, scene = V.scene, RO = R._objects;
  const top = (o) => { while (o.parent) o = o.parent; return o; };
  let total = 0, inScene = 0;
  const outGeos = new Set(), inGeos = new Set(), byTop = new Map();
  for (const r of RO._renderObjects) {
    total++;
    const t = top(r.object);
    if (t === scene) { inScene++; if (r.geometry) inGeos.add(r.geometry); continue; }
    if (r.geometry) outGeos.add(r.geometry);
    const k = (t.name || t.type) + (t === r.object ? " (root)" : "");
    byTop.set(k, (byTop.get(k) || 0) + 1);
  }
  const seenIn = new Set();
  for (const g of inGeos) geoBytes(g, seenIn);
  const seen = new Set(seenIn);
  let outB = 0, n = 0;
  for (const g of outGeos) { if (inGeos.has(g)) continue; const b = geoBytes(g, seen); if (b) { outB += b; n++; } }
  return { total, inScene, out: total - inScene, outGeoMB: MB(outB), outGeos: n, heapMB: MB(performance.memory?.usedJSHeapSize ?? 0),
    byTop: [...byTop].sort((a, b) => b[1] - a[1]).slice(0, 20),
    sweep: window.__roSweep ? { swept: window.__roSweep.swept, pinnedPipes: window.__roSweep.pinnedPipes, pinnedStates: window.__roSweep.pinnedStates, lastMs: window.__roSweep.lastMs } : null };
}
