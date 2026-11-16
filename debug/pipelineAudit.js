// PIPELINE AUDIT (docs/PERF_GAME.md round 4): how many render pipelines / shader programs the page holds, and which
// materials could share theirs. three r187 caches programs by their WGSL TEXT and pipelines by (programs, render state):
// two materials whose built code is identical already share; materials of the same library slot whose code differs
// are the candidates (a per-model constant baked into the code, a model-only node).
//   const P = await import("/debug/pipelineAudit.js"); P.run()      -> { pipelines, programs, bySlot: [[slot, mats, programs]] }
const h = (s) => { let a = 0x811c9dc5; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193); return (a >>> 0).toString(16); };

export function run({ top = 30 } = {}) {
  const R = window.viewer.renderer, P = R._pipelines;
  let pipelines = 0;
  const vs = new Set(), fs = new Set();
  for (const [, p] of P.caches) { pipelines++; if (p.vertexProgram) vs.add(p.vertexProgram.id); if (p.fragmentProgram) fs.add(p.fragmentProgram.id); }
  // material -> fragment code hash (from the render objects that used it)
  const byMat = new Map();
  for (const ro of R._objects._renderObjects) {
    const m = ro.material; if (!m) continue;
    const st = ro._nodeBuilderState ?? null;          // (never getNodeBuilderState(): it would build a missing one)
    const code = st?.fragmentShader;
    if (!code) continue;
    let e = byMat.get(m); if (!e) byMat.set(m, (e = new Set()));
    e.add(h(code));
  }
  // group by slot: "<model> <slot>[:fade]" -> slot
  const bySlot = new Map();
  for (const [m, codes] of byMat) {
    const name = m.name || m.type;
    const slot = name.replace(/^[a-z0-9_-]+ /i, "");
    let e = bySlot.get(slot); if (!e) bySlot.set(slot, (e = { mats: 0, codes: new Set(), models: new Set() }));
    e.mats++; for (const c of codes) e.codes.add(c); e.models.add(name.split(" ")[0]);
  }
  const rows = [...bySlot.entries()].filter(([, e]) => e.mats > 1).map(([s, e]) => [s, e.mats, e.codes.size, [...e.models].slice(0, 6).join(",")])
    .sort((a, b) => b[2] - a[2]).slice(0, top);
  return { pipelines, vertexPrograms: vs.size, fragmentPrograms: fs.size, materials: byMat.size, bySlot: rows,
    sharable: rows.reduce((n, r) => n + Math.max(0, r[2] - 1), 0) };
}
