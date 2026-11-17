// HEAP FIX (docs/HEAP.md "heapfix"): the precompile queue (viewer/warmup.js) must never draw or compile a mesh whose
// geometry was disposed after its job was queued (a far tile replaced under the boot cover: its arrays were dropped,
// its GPU buffers released; the compile flush drew it again: "index buffer size (0)"). Node, a stand-in renderer:
//   node --import ./tools/heap/register.mjs tools/heap/queueCheck.mjs
import * as THREE from "three/webgpu";
globalThis.window = globalThis; globalThis.location = { search: "" };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 1);
const W = await import("../../viewer/warmup.js");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok  ", m); };

const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const seen = { compile: [], flush: [] };
let release = null;
const scene = new THREE.Scene();
const renderer = {
  backend: { isWebGPUBackend: true, createRenderPipeline() {} }, _pipelines: { isReady: () => true },
  compileAsync: async (root) => { const v = []; root.traverse((o) => { if (o.isMesh && shown(o)) v.push(o.name); }); seen.compile.push(...v); if (!release) await new Promise((r) => (release = r)); },
  _beginPreCompile() {}, _finishPreCompile() {}, getRenderTarget: () => null, getMRT: () => null, setRenderTarget() {}, setMRT() {},
};
const mk = (name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); m.name = name; return m; };
let loader = false;
W.setCompileFlush({ active: () => loader, renderer, scene, render: () => scene.traverse((o) => { if (o.isMesh && shown(o)) seen.flush.push(o.name); }) });

// 1. the plain queue: a job queued behind a running one, its mesh disposed meanwhile
const a = mk("a-busy"), b = mk("b-disposed"), c = mk("c-kept");
const pa = W.precompile(renderer, [a], new THREE.PerspectiveCamera(), scene);
const pb = W.precompile(renderer, [b, c], new THREE.PerspectiveCamera(), scene);
await new Promise((r) => setTimeout(r, 10));               // (a runs, b waits)
b.geometry.dispose();
release(); await pa; await pb;
ok(seen.compile.includes("c-kept") && !seen.compile.includes("b-disposed"), "compile: a mesh disposed after it was queued is not compiled");
ok(W.geometryDisposed(b.geometry) && !W.geometryDisposed(c.geometry), "geometryDisposed()");

// 2. the compile flush (the play loader holds): jobs queued together are drawn in one forced frame; a far tile among
// them disposed after it was queued (replaced by its full tile under the cover), before the flush runs
release = () => {}; loader = true;
await new Promise((r) => setTimeout(r, 10));
const d = mk("d-tile"), far = new THREE.Group(), e = mk("e-far-terrain"), f = mk("f-far-buildings"), g = mk("g-tile");
far.add(e, f);
const ps = [d, far, g].map((r) => W.precompile(renderer, [r], new THREE.PerspectiveCamera(), scene));
e.geometry.dispose(); f.geometry.dispose();
await Promise.all(ps);
ok(seen.flush.includes("g-tile"), "flush: the live job is drawn");
ok(!seen.flush.includes("e-far-terrain") && !seen.flush.includes("f-far-buildings"), "flush: the disposed far tile is not drawn");
ok(e.visible && f.visible && far.visible, "flush: visibility restored after the draw");
console.log(JSON.stringify({ skips: globalThis.__queueSkips }));
console.log(fails ? `${fails} FAILED` : "all ok");
process.exit(fails ? 1 : 0);
