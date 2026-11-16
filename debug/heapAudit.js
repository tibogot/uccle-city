// HEAP AUDIT (docs/PERF_GAME.md round 3): what holds the JS heap, without a heap snapshot (2 GB snapshots stall the
// laptop). Walks the object graph from named roots, counts every UNIQUE ArrayBuffer (typed arrays: geometry attributes,
// indices, texture data, colliders, tile data) once, attributed to the first root that reaches it, and lists the
// biggest holders by path. Plain JS objects / strings are not counted (performance.memory gives the total).
//   const H = await import("/debug/heapAudit.js"); await H.run()          -> { totalMB, heapMB, roots: [[name, MB]], top }
//   H.run({ depth: 8 })                                                  deeper walk (slower)
const MB = (b) => +(b / 1048576).toFixed(1);

function walker(seen, budget) {
  const visited = new WeakSet();
  return function walk(o, depth, path, acc, hits) {
    if (!o || typeof o !== "object" || depth < 0 || budget.n-- <= 0) return;
    if (ArrayBuffer.isView(o)) { const b = o.buffer; if (b && !seen.has(b)) { seen.add(b); acc.bytes += b.byteLength; hits.push([path, b.byteLength]); } return; }
    if (o instanceof ArrayBuffer) { if (!seen.has(o)) { seen.add(o); acc.bytes += o.byteLength; hits.push([path, o.byteLength]); } return; }
    if (visited.has(o)) return;
    visited.add(o);
    if (o instanceof Node || o instanceof Window || typeof o.then === "function") return;     // (DOM, promises)
    if (o instanceof Map) { let i = 0; for (const [k, v] of o) { if (i++ > 5000) break; walk(v, depth - 1, `${path}<${String(k).slice(0, 20)}>`, acc, hits); } return; }
    if (o instanceof Set || Array.isArray(o)) { let i = 0; for (const v of o) { if (i++ > 20000) break; walk(v, depth - 1, `${path}[]`, acc, hits); } return; }
    for (const k of Object.keys(o)) {
      if (k === "parent" || k === "_listeners") continue;
      let v; try { v = o[k]; } catch { continue; }
      if (v && typeof v === "object") walk(v, depth - 1, `${path}.${k}`, acc, hits);
    }
  };
}

export async function run({ depth = 7, budget = 4e6 } = {}) {
  const V = window.viewer, seen = new Set(), B = { n: budget };
  const walk = walker(seen, B);
  const roots = [];
  // the scene first, split by its top-level children (tiles' groups, landmarks, pools, far tiles)
  for (const c of V.scene.children) roots.push([`scene:${c.name || c.type}`, c]);
  roots.push(["world.tiles", V.world.tiles], ["viewer.lite", V.lite], ["hm", V.hm]);
  for (const k of Object.keys(window)) if (k.startsWith("__") && window[k] && typeof window[k] === "object") roots.push([`window.${k}`, window[k]]);
  roots.push(["viewer", V], ["renderer", V.renderer]);
  const out = [], hitsAll = [];
  for (const [name, r] of roots) {
    const acc = { bytes: 0 }, hits = [];
    try { walk(r, depth, name, acc, hits); } catch (e) { /* a getter threw */ }
    if (acc.bytes) out.push([name, MB(acc.bytes)]);
    for (const h of hits) hitsAll.push(h);
  }
  out.sort((a, b) => b[1] - a[1]);
  // the biggest holders by path prefix (3 segments)
  const pre = new Map();
  for (const [p, b] of hitsAll) { const k = p.split(/[.[<]/).slice(0, 4).join("."); pre.set(k, (pre.get(k) || 0) + b); }
  const top = [...pre.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, b]) => [k, MB(b)]);
  const total = [...seen].reduce((s, b) => s + b.byteLength, 0);
  return { totalMB: MB(total), heapMB: MB(performance.memory?.usedJSHeapSize ?? 0), walkedLeft: B.n, roots: out.slice(0, 40), top };
}
