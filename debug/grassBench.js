// FIX3 (docs/FIX3.md): the GRASS's own GPU time, isolated from the frame's noise. The city's render loop is paused; the
// grass (its compute + its 3 LOD draws, + depth twins) and the loaded tiles' terrain (the depth it stands on) are moved
// into a scene of their own and rendered `reps` times into an off-screen target from the current camera; the renderer's
// timestamp queries give the GPU ms of those renders (compute + render). Variants are alternated `rounds` times.
//   const B = await import("/debug/grassBench.js");
//   await B.bench({ on: () => {}, off: () => { grass.enabled = false } }, { rounds: 6, reps: 20 })
import * as THREE from "three/webgpu";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function bench(variants, { rounds = 6, reps = 20, w = innerWidth, h = innerHeight } = {}) {
  const V = window.viewer, R = V.renderer, cam = V.camera, g = window.grass;
  const anim = R._animation, loop = anim._animationLoop;
  const dpr = R.getPixelRatio();
  const rt = new THREE.RenderTarget(Math.round(w * dpr), Math.round(h * dpr), { samples: 4, type: THREE.HalfFloatType, depthBuffer: true });
  const sc = new THREE.Scene();
  for (const k of ["fog", "fogNode", "environment", "environmentNode"]) if (V.scene[k] != null) sc[k] = V.scene[k];   // (the same shaders as in the city)
  const moved = [];
  const move = (o) => { moved.push([o, o.parent]); sc.add(o); };
  for (const c of [...V.scene.children]) if (c.type === "Group" && !c.name) move(c);          // the tiles' terrain groups
  move(g.group);
  for (const c of [...V.scene.children]) if (c.isLight) { moved.push([c, c.parent]); sc.add(c); }
  R.setAnimationLoop(null);
  const out = {};
  try {
    for (const k of Object.keys(variants)) out[k] = [];
    // warm-up: compile every variant
    for (const [k, f] of Object.entries(variants)) { f(); for (let i = 0; i < 3; i++) one(); await R.resolveTimestampsAsync(THREE.TimestampQuery.RENDER); await R.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE); }
    for (let r = 0; r < rounds; r++) {
      const order = Object.entries(variants); if (r % 2) order.reverse();
      for (const [k, f] of order) {
        f();
        await R.resolveTimestampsAsync(THREE.TimestampQuery.RENDER); await R.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE);
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
  function one() {
    g.update(cam, 1 / 60);
    R.setRenderTarget(rt);
    R.render(sc, cam);
    R.setRenderTarget(null);
  }
  const med = (x) => { const s = [...x].sort((p, q) => p - q); return +s[Math.floor(s.length / 2)].toFixed(3); };
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { med: med(v), all: v.map((x) => +x.toFixed(3)) }]));
}
