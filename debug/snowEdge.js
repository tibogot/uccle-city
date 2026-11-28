// THE SNOW EDGE AUDIT, page side (claude/snowfix; gate row `snowedge` + browser row SNOWEDGE). In a city tab with snow
// (?quick=1&place=...&with=weather&wx=snow_cover), sound off:
//   const S = await import("/debug/snowEdge.js"); await S.audit()
// re-bakes the overhead window round the camera, capturing the bake's passes, and counts the 2026-11-27 defect classes:
//   flooded      "road" cells with no road texel within 2 cells (the in-place hole fill: Saint-Job's bare patch)
//   shelterFlood sheltered cells with no crown texel within 3 cells (the same flood in the canopy pass)
//   undrawn      meshes in the bake that the city camera does not draw (the pond's reflection trees: domes + rings)
//   props        solid meshes that are furniture / props / lamp extras / poles (holes + dark patches under them)
//   narrow       raised kept patches <= ~0.6 m wide left in the layer (thin strips on copings / fascias)
// Each one is 0 after the fix (`?wxfill=old`, `?wxdrawn=old`, `?wxprops=old`, `?snowsdf=old` bring them back).
export async function audit() {
  const { cityWeather: cw } = await import("/viewer/weather/cityWeather.js");
  const map = cw.map, cam = window.viewer.camera;
  if (!map?.ready) return { error: "no overhead map (weather off or no snow)" };
  const orig = Worker.prototype.postMessage;
  let job = null;
  Worker.prototype.postMessage = function (m, t) { if (m && m.solidPx) job = { roadPx: m.roadPx.slice(), canopyPx: m.canopyPx.slice() }; return orig.call(this, m, t); };
  try { await cw.bake(cam.position, cam); } finally { Worker.prototype.postMessage = orig; }
  const N = map.res, cell = map.cell, O = map.uOrigin.value;
  const present = (px) => {
    const g = new Uint8Array(N * N);
    if (!px) return g;
    for (let k = 0; k < N * N; k++) {
      if (px[k * 4 + 3] < 0.5) continue;
      const i = Math.floor((px[k * 4 + 1] - 1) / cell), j = Math.floor((px[k * 4 + 2] - 1) / cell);
      if (i >= 0 && j >= 0 && i < N && j < N) g[j * N + i] = 1;
    }
    return g;
  };
  const near = (g, o, r) => { const i = o % N, j = (o / N) | 0; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && g[jj * N + ii]) return true; } return false; };
  const R = present(job?.roadPx), Cn = present(job?.canopyPx);
  let flooded = 0, shelterFlood = 0;
  for (let k = 0; k < N * N; k++) {
    if (map.road[k] && !near(R, k, 2)) flooded++;
    if (map.shelter[k] > 0.99 && !near(Cn, k, 3)) shelterFlood++;
  }
  // meshes in the bake: undrawn by the camera, or furniture-like solids
  const W = (1 << 20) | (1 << 21) | (1 << 22) | (1 << 23);
  const PROP = /^(props-|lamp-extras|bollard|tlights|billboards|tram-pole|rail-masts|embassy-poles|furniture2|streetkit|stops)/;
  const undrawn = [], props = new Set();
  window.viewer.scene.traverseVisible((o) => {
    if (!o.isMesh || o.userData.wxSkip) return;
    if (!(o.layers.mask & ((1 << 20) | (1 << 21)))) return;
    if (!(o.layers.mask & ~W & cam.layers.mask)) undrawn.push(`${o.parent?.name}/${o.name}`);
    if (o.layers.isEnabled(20)) for (let p = o, k = 0; p && k < 4; p = p.parent, k++) if (PROP.test(p.name)) { props.add(o.name); break; }
  });
  // narrow raised kept patches (the layer's cut A = cut + 2 road): flood the kept cells, width by the cut distance
  const cut = map.cut ?? map.cliff, sd = map.sdA;
  let narrow = 0;
  if (sd) {
    const seen = new Uint8Array(N * N);
    for (let o0 = 0; o0 < N * N; o0++) {
      if (cut[o0] || seen[o0] || map.H[o0] < -1e3) continue;
      const st = [o0], cells = []; seen[o0] = 1; let maxD = 0, big = false, raised = 0, rim = 0;
      while (st.length) {
        const o = st.pop(), i = o % N, j = (o / N) | 0; cells.push(o);
        maxD = Math.max(maxD, sd[o]); if (maxD > 0.32 || cells.length > 4000) big = true;
        for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
          const p = jj * N + ii;
          if (cut[p]) { if (!big) { rim++; let lo = Infinity; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const x = i + a, z = j + b; if (x >= 0 && z >= 0 && x < N && z < N && map.H[z * N + x] > -1e3) lo = Math.min(lo, map.H[z * N + x]); } if (lo < map.H[o] - 0.3) raised++; } continue; }
          if (!seen[p]) { seen[p] = 1; st.push(p); }
        }
      }
      if (!big && rim && raised > 0.5 * rim) narrow += cells.length;
    }
  }
  return { at: [Math.round(cam.position.x), Math.round(cam.position.z)], window: map.size, flooded, shelterFlood, undrawn: undrawn.length, undrawnNames: [...new Set(undrawn)].slice(0, 6), props: props.size, propNames: [...props].slice(0, 8), narrow, narrowCut: map.narrowCells ?? null, shapeMs: cw.stats.shapeMs };
}
