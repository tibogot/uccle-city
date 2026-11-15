// Perf pass 3 (docs/perf/AUDIT.md step 13): the GPU time of a group of objects (plants, ivy, the façade kit...) or of
// the whole scene, isolated from the frame's noise as debug/grassBench.js does: the city's render loop is paused; the
// scene (or only the given objects + the loaded tiles' terrain + the lights) is rendered `reps` times into an off-screen
// target from the current camera; the renderer's timestamp queries give the GPU ms. Variants alternate `rounds` times
// (order reversed every other round).
//   const B = await import("/debug/groupBench.js");
//   await B.bench({ on: () => {}, off: () => { __ivy.group.visible = false } }, { only: () => [__ivy.group] })
//   await B.bench({ ... }, { full: true })        the whole scene (incl. the sun's shadow map): variant deltas = cost
// `prep(R)` per variant render (optional) runs before each render (e.g. a pool's streamer update).
import * as THREE from "three/webgpu";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function bench(variants, { rounds = 6, reps = 16, only = null, full = false, w = innerWidth, h = innerHeight, prep = null } = {}) {
  const V = window.viewer, R = V.renderer, cam = V.camera;
  const anim = R._animation, loop = anim._animationLoop;
  const dpr = R.getPixelRatio();
  const rt = new THREE.RenderTarget(Math.round(w * dpr), Math.round(h * dpr), { samples: 4, type: THREE.HalfFloatType, depthBuffer: true });
  let sc = V.scene;
  const moved = [];
  if (!full) {
    sc = new THREE.Scene();
    for (const k of ["fog", "fogNode", "environment", "environmentNode", "environmentIntensity"]) if (V.scene[k] != null) sc[k] = V.scene[k];
    const move = (o) => { moved.push([o, o.parent]); sc.add(o); };
    for (const c of [...V.scene.children]) if (c.type === "Group" && !c.name) move(c);          // the tiles' terrain groups
    for (const o of (only ? only() : [])) if (o && o.parent) move(o);
    for (const c of [...V.scene.children]) if (c.isLight) move(c);
  }
  R.setAnimationLoop(null);
  const out = {};
  const one = () => { prep?.(R); R.setRenderTarget(rt); R.render(sc, cam); R.setRenderTarget(null); };
  const flush = async () => { await R.resolveTimestampsAsync(THREE.TimestampQuery.RENDER); await R.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE); };
  try {
    for (const k of Object.keys(variants)) out[k] = [];
    for (const [, f] of Object.entries(variants)) { await f(); for (let i = 0; i < 3; i++) one(); await flush(); }
    for (let r = 0; r < rounds; r++) {
      const order = Object.entries(variants); if (r % 2) order.reverse();
      for (const [k, f] of order) {
        await f();
        one(); await flush();
        for (let i = 0; i < reps; i++) one();
        await sleep(30);
        const a = await R.resolveTimestampsAsync(THREE.TimestampQuery.RENDER), b = await R.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE);
        out[k].push(((a || 0) + (b || 0)) / reps);
      }
    }
  } finally {
    for (const [o, p] of moved.reverse()) p.add(o);
    R.setRenderTarget(null);
    rt.dispose();
    R.setAnimationLoop(loop);
  }
  const med = (x) => { const s = [...x].sort((p, q) => p - q); return +s[Math.floor(s.length / 2)].toFixed(3); };
  const res = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { med: med(v), all: v.map((x) => +x.toFixed(3)) }]));
  const ks = Object.keys(res);
  if (ks.length >= 2) res.delta = +(res[ks[1]].med - res[ks[0]].med).toFixed(3);
  return res;
}

/** hold the camera at p / t (absolute heights over the walk surface), as featureAB.at with a custom place */
export async function put(p, t, settle = 4) {
  const A = await import("/debug/featureAB.js");
  return A.at({ p, t }, { settle });
}

/** perf pass 3's fixed views (I6, Avenue Alphonse XIII / Victor-Emmanuel III): p, t as featureAB places */
export const VIEWS = {
  street: [[1452, 1.7, 716], [1440, 0.8, 716]],          // street level, front gardens both sides
  garden: [[1452, 1.7, 716], [1470, 0.8, 716]],          // a front garden close up
  ivy: [[1382, 1.7, 606], [1372, 4.5, 588]],             // an ivy-covered side wall at 10-25 m
  lawn: [[-385, 1.7, -60], [-402, 1, -90]],              // FIX3's Wolvendael lawn (F4)
};
export async function view(k, settle = 4) { const [p, t] = VIEWS[k]; return put(p, t, settle); }

/** a material's lighting A/B in place: "old" = three's per-fragment model + the scene's lights, "new" = as built */
export function lightToggle(M) {
  const lm = M.setupLightingModel, ln = M.lightsNode, own = Object.prototype.hasOwnProperty.call(M, "setupLightingModel");
  return {
    old: () => { if (M.lightsNode !== null || own && M.setupLightingModel === lm) { delete M.setupLightingModel; M.lightsNode = null; M.needsUpdate = true; } },
    new: () => { if (M.lightsNode !== ln || M.setupLightingModel !== lm) { if (own) M.setupLightingModel = lm; M.lightsNode = ln; M.needsUpdate = true; } },
  };
}

/** perf pass 3: the ivy as before (?ivycrop=old ?vlight=old ?ivyfar=0) or as now, live in one page */
export function ivyState() {
  const I = window.__ivy.group, card = I.children.find((m) => m.name === "plants-ivy"), far = I.children.find((m) => m.name === "plants-ivyfar");
  const T = lightToggle(card.material), g = card.geometry, C0 = g.attributes.corner.array.slice(), U0 = g.attributes.uv.array.slice();
  const full = [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5], fu = [0, 0, 1, 0, 1, 1, 0, 1];
  const crop = (on) => { g.attributes.corner.array.set(on ? C0 : full); g.attributes.uv.array.set(on ? U0 : fu); g.attributes.corner.needsUpdate = g.attributes.uv.needsUpdate = true; };
  return {
    card, far,
    before: () => { T.old(); crop(false); window.__ivy.farU.cardEnd.value = 75 / 22; if (far) far.visible = false; card.visible = true; },
    after: () => { T.new(); crop(true); window.__ivy.farU.cardEnd.value = 1; if (far) far.visible = far.count > 0; card.visible = true; },
    none: () => { card.visible = false; if (far) far.visible = false; },
  };
}

/** perf pass 3: the cell-culled tile meshes (viewer/cellCull.js): triangles held / drawn by the view and the sun's pass
 *  in the last frames, per mesh name (a mesh still waiting / sorting counts whole) */
export function cullStats() {
  const V = window.viewer, f = V.renderer.info.frame, out = {}, states = {};
  V.scene.traverse((o) => {
    const c = o.userData?.cellCull; if (!c) return;
    states[c.state] = (states[c.state] || 0) + 1;
    const b = (out[o.name] ||= { tris: 0, sun: 0, view: 0 });
    b.tris += c.tris;
    const sun = c.culls.find((e) => e.cam.isOrthographicCamera && e.frame >= f - 3), vw = c.culls.find((e) => e.cam === V.camera && e.frame >= f - 3);
    if (sun) b.sun += sun.tris; if (vw) b.view += vw.tris;
  });
  return { states, meshes: out };
}
