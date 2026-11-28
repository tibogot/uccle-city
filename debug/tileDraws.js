// DRAWS PER TILE (claude/perf7, docs/perf/QUIET_2026-11-27.md): wraps the backend's draw() for `frames` frames and counts,
// per pass, the draws of every FULL tile's own groups ("E4-buildings", "E4-roads" ...) by tile and by mesh kind (the
// object's name, digits folded), plus the draws outside tiles. Static census: run it standing still (the spawn view).
//   const T = await import("/debug/tileDraws.js"); await T.run({ frames: 20 })
const raf = () => new Promise((r) => requestAnimationFrame(r));
const TILE = /^([A-Z]\d+)-(terrain|buildings|roads|features)$/;
export async function run({ frames = 20 } = {}) {
  const V = window.viewer, b = V.renderer.backend, scene = V.scene, cam = V.camera;
  const per = {}, kinds = {}, other = { scene: 0, shadow: 0 };
  const orig = b.draw;
  let n = 0;
  b.draw = function (ro, info) {
    const pass = ro.camera === cam ? "scene" : ro.camera?.isOrthographicCamera ? "shadow" : "other";
    let tile = null, layer = null, sub = null;
    for (let p = ro.object; p && p !== scene; p = p.parent) {
      const m = TILE.exec(p.name || "");
      if (m) { tile = m[1]; layer = m[2]; break; }
      sub = p;
    }
    if (tile) {
      const t = (per[tile] ||= { scene: 0, shadow: 0, other: 0 }); t[pass]++;
      const k = `${layer}/${String(sub?.name || ro.object.name || "?").replace(/\d+/g, "#")}:${String(ro.material?.name || ro.material?.type || "").replace(/\d+/g, "#").slice(0, 30)}`;
      const e = (kinds[k] ||= { scene: 0, shadow: 0, other: 0 }); e[pass]++;
    } else other[pass] = (other[pass] || 0) + 1;
    return orig.call(this, ro, info);
  };
  try { for (; n < frames; n++) await raf(); } finally { b.draw = orig; }
  const f = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / frames).toFixed(1)]));
  const tiles = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, f(v)]));
  const tk = Object.keys(per).length || 1;
  const sum = (pass) => +(Object.values(per).reduce((a, v) => a + v[pass], 0) / frames).toFixed(1);
  return {
    frames, tiles: Object.keys(per).length, tileScene: sum("scene"), tileShadow: sum("shadow"), perTileScene: +(sum("scene") / tk).toFixed(1), perTileShadow: +(sum("shadow") / tk).toFixed(1),
    outside: f(other), byTile: tiles,
    kinds: Object.entries(kinds).map(([k, v]) => [k, +(v.scene / frames).toFixed(1), +(v.shadow / frames).toFixed(1), +(v.other / frames).toFixed(1)]).sort((a, b) => b[1] - a[1]),
  };
}
