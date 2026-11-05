// Render-side probe (with debug/bootProbe.js): times three's main-thread steps per frame once the city runs:
// node builds (NodeManager.getForRender cache misses), geometry uploads (backend.createAttribute / updateAttribute),
// texture uploads, pipeline requests. window.__rprobe.top() lists the worst frames with what they did.
// Load in the page: import("/debug/renderProbe.js").then((m) => m.install(viewer.renderer)).
export function install(renderer) {
  const R = (window.__rprobe = { frames: [], cur: null });
  const newFrame = () => { R.cur = { t: Math.round(performance.now()), node: 0, nodeN: 0, attr: 0, attrN: 0, attrBytes: 0, tex: 0, texN: 0, pipe: 0, pipeN: 0, names: [] }; R.frames.push(R.cur); if (R.frames.length > 4000) R.frames.shift(); };
  newFrame();
  const loop = () => { newFrame(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const wrap = (obj, key, slot, name) => {
    const f = obj[key];
    if (!f) return;
    obj[key] = function (...a) {
      if (slot === "attr" && a[0] && !a[0].__owner) tagOwners();
      const t = performance.now();
      const r = f.apply(this, a);
      const dt = performance.now() - t;
      const c = R.cur;
      c[slot] += dt; c[slot + "N"]++;
      if (slot === "attr") { const at = a[0]; c.attrBytes += at?.array?.byteLength ?? 0; }
      const big = slot === "attr" && (a[0]?.array?.byteLength ?? 0) > 1e6;
      if (dt > 2 || big || slot === "tex") c.names.push(`${slot}:${name(a)}${big ? `(${(a[0].array.byteLength / 1e6).toFixed(1)}MB,${key}${a[0].__owner ? "," + a[0].__owner : ""})` : ""}:${dt.toFixed(1)}`);
      return r;
    };
  };
  // which mesh an attribute belongs to (walks the scene once per unknown attribute: debug only)
  const tagOwners = () => { if (R._tagT && performance.now() - R._tagT < 200) return; R._tagT = performance.now(); window.viewer.scene.traverse((o) => { if (!o.geometry) return; const own = `${o.name || o.type}<${o.parent?.name || ""}<${o.parent?.parent?.name || ""}`; for (const [n, at] of Object.entries(o.geometry.attributes)) at.__owner ||= `${n}@${own}`; if (o.geometry.index) o.geometry.index.__owner ||= `index@${own}`; if (o.instanceMatrix) o.instanceMatrix.__owner ||= `instanceMatrix@${own}`; }); };
  const nodes = renderer._nodes;
  const gfr = nodes.getForRender;
  nodes.getForRender = function (ro, y) {
    const had = this.get(ro).nodeBuilderState !== undefined;
    const t = performance.now();
    const r = gfr.call(this, ro, y);
    if (!had) { const dt = performance.now() - t; R.cur.node += dt; R.cur.nodeN++; if (dt > 1) R.cur.names.push(`node:${ro.material.name || ro.material.type}#${ro.material.id}@${ro.object.name || ro.object.type}<${ro.object.parent?.name || ""}<${ro.object.parent?.parent?.name || ""}:${dt.toFixed(1)}`); }
    return r;
  };
  const be = renderer.backend;
  wrap(be, "createAttribute", "attr", (a) => a[0]?.name || a[0]?.constructor?.name);
  wrap(be, "createIndexAttribute", "attr", () => "index");
  wrap(be, "createStorageAttribute", "attr", () => "storage");
  wrap(be, "updateAttribute", "attr", () => "update");
  wrap(be, "createTexture", "tex", (a) => a[0]?.name || "");
  wrap(be, "updateTexture", "tex", (a) => `${a[0]?.name || ""}${a[0]?.image?.width ?? ""}`);
  wrap(be, "generateMipmaps", "tex", () => "mips");
  wrap(be, "createRenderPipeline", "pipe", (a) => a[0]?.material?.name || a[0]?.material?.type);
  R.top = (n = 10, from = 0) => R.frames.filter((f) => f.t >= from).map((f, i, arr) => ({ ...f, dt: (arr[i + 1]?.t ?? f.t) - f.t }))
    .sort((a, b) => b.dt - a.dt).slice(0, n)
    .map((f) => `${f.t} frame ${f.dt} ms: node ${f.node.toFixed(0)} (${f.nodeN}), attr ${f.attr.toFixed(0)} (${f.attrN}, ${(f.attrBytes / 1e6).toFixed(1)} MB), tex ${f.tex.toFixed(0)} (${f.texN}), pipe ${f.pipe.toFixed(0)} (${f.pipeN}) ${f.names.slice(0, 8).join(" ")}`);
  R.sum = (from = 0) => R.frames.filter((f) => f.t >= from).reduce((s, f) => { s.node += f.node; s.attr += f.attr; s.tex += f.tex; s.pipe += f.pipe; s.nodeN += f.nodeN; return s; }, { node: 0, attr: 0, tex: 0, pipe: 0, nodeN: 0 });
  return R;
}
