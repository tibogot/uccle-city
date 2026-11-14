// Perf audit 2026-11-14 (docs/perf/AUDIT.md step 11): who draws what, per frame. Wraps the backend's draw() for
// `frames` frames and buckets every draw (and its triangles) by pass (scene / shadow / other) and by LAYER: the
// object's top-level ancestor under the scene, with tile groups merged by kind ("I6-buildings" -> "tile:buildings")
// and the immediate child name kept for the big groups ("tile:features/street-furniture").
//   const B = await import("/debug/drawBreakdown.js"); await B.run({ frames: 30 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function layerOf(o, scene) {
  const chain = [];
  for (let p = o; p && p !== scene; p = p.parent) if (p.name || p === o) chain.push(p);
  chain.reverse();
  const nm = (x) => (x?.name || x?.type || "?").replace(/^[A-Z]\d+-/, "tile:").replace(/-[A-Z]\d+$/, "").replace(/\d+/g, "#");
  const top = nm(chain[0]);
  const sub = chain[1] ? nm(chain[1]) : "";
  return sub && /^tile:|^roofs$|^gardens|^stops|^streetlife|^furniture|^landmarks|^heroes/.test(top) ? `${top}/${sub}` : top;
}

export async function run({ frames = 30, deep = null } = {}) {
  const V = window.viewer, b = V.renderer.backend, scene = V.scene, cam = V.camera;
  const acc = {}, passes = {};
  let n = 0;
  const orig = b.draw;
  b.draw = function (ro, info) {
    const pass = ro.camera === cam ? "scene" : ro.camera?.isOrthographicCamera && ro.scene === scene ? "shadow" : ro.scene === scene ? "other-cam" : "post";
    let L = pass === "post" ? "post" : layerOf(ro.object, scene);
    if (deep && L === deep) L += `/${(ro.object.name || ro.object.parent?.name || ro.material?.name || "?").replace(/\d+/g, "#")}:${(ro.material?.name || "").replace(/\d+/g, "#").slice(0, 30)}`;
    const g = ro.geometry, cnt = (g.index?.count ?? g.attributes.position?.count ?? 0) / 3 * (ro.object.count ?? 1);
    const k = `${pass}|${L}`;
    const a = (acc[k] ||= [0, 0]); a[0]++; a[1] += cnt;
    (passes[pass] ||= [0, 0]); passes[pass][0]++; passes[pass][1] += cnt;
    return orig.call(this, ro, info);
  };
  const f0 = V.renderer.info.render.frame;
  await new Promise((done) => { let i = 0; const t = () => { if (++i >= frames) return done(); requestAnimationFrame(t); }; requestAnimationFrame(t); });
  b.draw = orig;
  n = Math.max(1, V.renderer.info.render.frame - f0);
  const rows = Object.entries(acc).map(([k, [d, t]]) => { const [pass, layer] = k.split("|"); return { pass, layer, draws: +(d / frames).toFixed(1), ktris: Math.round(t / frames / 1000) }; })
    .sort((x, y) => y.draws - x.draws);
  return { frames, passes: Object.fromEntries(Object.entries(passes).map(([k, [d, t]]) => [k, { draws: +(d / frames).toFixed(1), ktris: Math.round(t / frames / 1000) }])), rows: rows.slice(0, 40) };
}
