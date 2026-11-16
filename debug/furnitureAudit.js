// FURNITURE IN THE ROAD, in the city page (citydefects 2026-11-16): every DRAWN pole-like instance of the loaded tiles
// tested against the tile's carriageway (window.__carriage, viewer/streets/carriageway.js, filled by main.js loadTile).
// The node twin without a browser: tools/audit/streetAudit.mjs (the same placement code, before / after).
//   const A = await import("/debug/furnitureAudit.js"); A.run()   -> { byKind: { name: { n, inLane } }, worst: [...] }
// A post counts as "in a lane" when its base centre is inside a carriageway with a 0.2 m margin (half a post's foot).
const KINDS = /^(furniture-signal|tram-poles|street-lamps|furniture-stopPole|furniture-sign|furniture-platepost|furniture2-|streetkit-|stops-standin|furniture-gardenpillar)/;

export function run({ margin = 0.2, re = KINDS } = {}) {
  const C = window.__carriage;
  if (!C?.size) return { error: "no window.__carriage (viewer older than citydefects, or no tile loaded)" };
  const tiles = [...C.values()];
  const testAt = (x, z) => {
    const t = tiles.find(({ bounds: b }) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1);
    return t ? t.test.inside(x, z, margin) : null;
  };
  const byKind = {}, worst = [], m = new (window.viewer.camera.matrixWorld.constructor)();
  window.viewer.scene.traverse((o) => {
    if (!o.isInstancedMesh || !re.test(o.name || "")) return;
    o.updateWorldMatrix(true, false);
    const k = (byKind[o.name] ??= { n: 0, inLane: 0, offTile: 0 });
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      m.premultiply(o.matrixWorld);
      const x = m.elements[12], z = m.elements[14], r = testAt(x, z);
      k.n++;
      if (r === null) { k.offTile++; continue; }
      if (r) { k.inLane++; if (worst.length < 50) worst.push({ kind: o.name, x: +x.toFixed(1), z: +z.toFixed(1) }); }
    }
  });
  return { byKind, worst };
}
