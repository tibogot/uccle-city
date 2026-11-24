// RENDERS PER FRAME (perf job D, docs/rules/renders-per-frame.md): counts every scene render (three's Renderer._renderScene:
// renderer.render, QuadMesh.render, the post chain's passes, the shadow passes, the output pass) and every compute
// dispatch, per frame, by CALLER, and times each one (self = without the renders nested inside it: the shadow pass runs
// inside the main scene render, the post passes inside the pipeline's quad). Also counts the objects each render draws
// (Renderer._renderObjectDirect) and the backend draws.
//   const R = await import("/debug/renderCount.js"); R.install(); await R.sample({ seconds: 10 }); R.table()
// The tag of a render: three's innermost named step that asked for it (ShadowNode.renderShadow, PassNode.updateBefore,
// BloomNode.updateBefore ...), our nearest frame (file:line), what was drawn (scene name / the quad's material) and into
// what (the render target's texture name). Probe cost: one stack capture per render (~20-40 us), outside the timed span.
const S = (window.__renderCount ||= { on: false, installed: false, frames: 0, tags: new Map(), stack: [], perFrame: [], cur: null });

const OUR = /\/(viewer|labs|vendor)\/[^)]*/;
const THREE_FN = /at (?:[\w$]+\.)?([\w$]+\.[\w$]+|[\w$]+) \([^)]*three\.(?:webgpu|core|tsl)[^)]*\)/;
function tagOf(scene, renderer) {
  const st = (new Error().stack || "").split("\n").slice(3);
  let threeFn = "", ours = "";
  for (const l of st) {
    if (/renderCount\.js/.test(l)) continue;
    if (!ours && /three\.(webgpu|core|tsl)/.test(l)) {
      if (!threeFn) { const m = l.match(/at ([^ ]+) \(/); const f = m ? m[1] : ""; if (!/_renderScene|render$|^Renderer\.render|^QuadMesh\.render/.test(f)) threeFn = f; }
      continue;
    }
    const m = l.match(OUR);
    if (m && !ours) { const fn = (l.match(/at ([^ ]+) \(/) || [])[1] || ""; ours = `${fn}@${m[0].replace(/^\//, "").replace(/\?[^:]*/, "").replace(/:(\d+):\d+$/, ":$1")}`; break; }
  }
  const what = scene?.isQuadMesh ? `quad:${scene.material?.name || scene.material?.type || ""}` : `scene:${scene?.name || scene?.type || ""}`;
  const rt = renderer.getRenderTarget();
  const into = rt ? (rt.texture?.name || rt.depthTexture?.name || `rt${rt.width}x${rt.height}`) : "canvas";
  return `${threeFn || "-"} | ${ours || "-"} | ${what} -> ${into}`;
}
const row = (tag) => { let r = S.tags.get(tag); if (!r) S.tags.set(tag, (r = { tag, n: 0, self: 0, total: 0, objs: 0, draws: 0, top: 0 })); return r; };

export function install(renderer = window.viewer?.renderer) {
  if (S.installed) return S;
  S.installed = true; S.renderer = renderer;
  const rs = renderer._renderScene;
  renderer._renderScene = function (scene, camera, ...a) {
    if (!S.on) return rs.call(this, scene, camera, ...a);
    const t0 = performance.now();
    const tag = tagOf(scene, this);
    const fr = { tag, child: 0, objs: 0, draws: 0 };
    S.stack.push(fr);
    const t1 = performance.now();
    try { return rs.call(this, scene, camera, ...a); } finally {
      const t2 = performance.now();
      S.stack.pop();
      const r = row(tag);
      r.n++; r.total += t2 - t1; r.self += t2 - t1 - fr.child; r.objs += fr.objs; r.draws += fr.draws;
      if (!S.stack.length) r.top++;
      const up = S.stack[S.stack.length - 1]; if (up) up.child += t2 - t0;
      if (S.cur) { S.cur.renders++; if (!S.stack.length) S.cur.top++; }
    }
  };
  const ro = renderer._renderObjectDirect;
  renderer._renderObjectDirect = function (...a) {
    if (S.on) {
      const f = S.stack[S.stack.length - 1]; if (f) f.objs++; if (S.cur) S.cur.objs++;
      // R.objects(true): which objects each pass draws (top name chain, counts over the sample)
      if (S.objNames && f) { const o = a[0]; let top = o; while (top.parent && top.parent.parent) top = top.parent; const k = `${f.tag.split(" | ").slice(1).join(" | ")} :: ${top.name || top.type} > ${o.name || o.type}${o.frustumCulled === false ? " [nocull]" : ""}`; S.objNames.set(k, (S.objNames.get(k) || 0) + 1); }
    }
    return ro.apply(this, a);
  };
  const be = renderer.backend, dr = be.draw;
  be.draw = function (...a) { if (S.on) { const f = S.stack[S.stack.length - 1]; if (f) f.draws++; if (S.cur) S.cur.draws++; } return dr.apply(this, a); };
  const cp = renderer.compute;
  renderer.compute = function (nodes, ...a) {
    if (!S.on) return cp.call(this, nodes, ...a);
    const st = (new Error().stack || "").split("\n").slice(2).find((l) => OUR.test(l) && !/renderCount\.js/.test(l)) || "";
    const m = st.match(OUR); const tag = `compute | ${m ? m[0].replace(/\?[^:]*/, "").replace(/:(\d+):\d+$/, ":$1") : "-"} | ${Array.isArray(nodes) ? nodes.map((n) => n.name || "?").join("+") : nodes?.name || "?"}`;
    const t = performance.now();
    try { return cp.call(this, nodes, ...a); } finally {
      const dt = performance.now() - t, r = row(tag); r.n++; r.self += dt; r.total += dt; if (!S.stack.length) r.top++;
      const up = S.stack[S.stack.length - 1]; if (up) up.child += dt;
      if (S.cur) S.cur.computes++;
    }
  };
  const tick = () => { if (S.on) { S.frames++; S.cur = { renders: 0, top: 0, objs: 0, draws: 0, computes: 0 }; S.perFrame.push(S.cur); } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return S;
}

/** on: collect the objects each pass draws; off: the list, per frame, most first (filter: a substring of the pass) */
export function objects(on, filter = "") {
  if (on) { S.objNames = new Map(); return; }
  const F = Math.max(1, S.perFrame.length - 1);
  return [...(S.objNames || new Map())].filter(([k]) => k.includes(filter)).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${(n / F).toFixed(2)}  ${k}`);
}
export function reset() { S.tags.clear(); S.frames = 0; S.perFrame.length = 0; S.cur = null; }
/** counts for `seconds` of whatever the page does (run a game drive meanwhile) */
export async function sample({ seconds = 10 } = {}) {
  install(); reset(); S.on = true;
  await new Promise((r) => setTimeout(r, seconds * 1000));
  S.on = false;
  return summary();
}
/** start / stop around another harness's run (debug/gamePerf.js police) */
export function start() { install(); reset(); S.on = true; }
export function stop() { S.on = false; return summary(); }

export function summary() {
  const F = Math.max(1, S.perFrame.length - 1), pf = S.perFrame.slice(0, -1);
  const avg = (k) => +(pf.reduce((s, f) => s + f[k], 0) / Math.max(1, pf.length)).toFixed(2);
  const rows = [...S.tags.values()].sort((a, b) => b.self - a.self).map((r) => ({
    pass: r.tag, perFrame: +(r.n / F).toFixed(2), selfMs: +(r.self / F).toFixed(3), totalMs: +(r.total / F).toFixed(3),
    objsPerCall: r.n ? +(r.objs / r.n).toFixed(1) : 0, drawsPerCall: r.n ? +(r.draws / r.n).toFixed(1) : 0,
  }));
  const res = { frames: pf.length, rendersPerFrame: avg("renders"), topLevelPerFrame: avg("top"), objsPerFrame: avg("objs"), drawsPerFrame: avg("draws"), computesPerFrame: avg("computes"),
    renderSelfMsPerFrame: +rows.filter((r) => !r.pass.startsWith("compute")).reduce((s, r) => s + r.selfMs, 0).toFixed(2), rows };
  window.__renderCountLast = res;
  return res;
}
/** the rows as a markdown table */
export function table(res = window.__renderCountLast) {
  const L = [`frames ${res.frames}, renders/frame ${res.rendersPerFrame} (top-level ${res.topLevelPerFrame}), objects ${res.objsPerFrame}, draws ${res.drawsPerFrame}, computes ${res.computesPerFrame}, render self ms ${res.renderSelfMsPerFrame}`,
    "| pass | per frame | self ms | objects / call | draws / call |", "|---|---|---|---|---|"];
  for (const r of res.rows) L.push(`| ${r.pass} | ${r.perFrame} | ${r.selfMs} | ${r.objsPerCall} | ${r.drawsPerCall} |`);
  return L.join("\n");
}
