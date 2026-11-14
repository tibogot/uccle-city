// Perf audit 2026-11-14 (docs/perf/AUDIT.md step 11): the street-furniture car colliders a tile landing builds
// (viewer/drive/driveMode.js featureColliders), per loaded tile: ms (first call, second call), polygons, counts,
// blocked area (m2). Compare a load with ?colcache=0 (per instance, world grid) against the default (per piece).
//   const C = await import("/debug/colliderCost.js"); C.run()
export async function run() {
  const D = await import("/viewer/drive/driveMode.js");
  const out = [];
  for (const t of window.viewer.world.tiles) {
    const f = t.groups?.find((g) => /-features$/.test(g.name));
    if (!f) continue;
    const B = t.bounds;
    const t0 = performance.now(); const r = D.featureColliders(f, B); const ms = performance.now() - t0;
    const t1 = performance.now(); D.featureColliders(f, B); const ms2 = performance.now() - t1;
    let area = 0, n = 0;
    for (const p of r.polys) {
      if (p.ref || p.kind === undefined || p.rings[0].length < 3) continue;
      const R = p.rings[0]; let a = 0;
      for (let i = 0; i < R.length; i++) { const [x1, z1] = R[i], [x2, z2] = R[(i + 1) % R.length]; a += x1 * z2 - x2 * z1; }
      area += Math.abs(a) / 2; n++;
    }
    out.push({ tile: t.name, ms: +ms.toFixed(1), ms2: +ms2.toFixed(1), polys: r.polys.length, furniturePolys: n, counts: r.counts, areaM2: +area.toFixed(1) });
  }
  return out;
}
