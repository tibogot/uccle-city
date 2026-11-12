// The city's library switch, consumer by consumer (docs/TEXTURE_FACTORY.md "City switch"): load the city twice,
// ?libmat=0 (every consumer on its temporary materials) and ?libmat=<consumer> (only that one on the library), and in
// each page:
//   const ab = await import("/debug/libAB.js");
//   await ab.ready();                       // boot + warm-up done
//   ab.hideUI(true);                        // canvas only, for screenshots
//   await ab.cam(tx, tz, dist, angle, h);   // camera dist m from the target at `angle` (rad), h m above the ground
//   await ab.gpu(4)                         // GPU ms (r187 timestamps, p50 over 4 s)
//   await ab.flicker()                      // the flicker test (labs/flickerTest.js) from the current camera
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function ready(maxS = 150) {
  for (let i = 0; i < maxS; i++) {
    const log = document.getElementById("log")?.innerText ?? "";
    if (window.viewer && window.viewer.frames() > 30 && /warm-up/.test(log)) break;
    await sleep(1000);
  }
  await sleep(4000);
  return { frames: window.viewer?.frames?.() };
}

export function hideUI(on = true) {
  let st = document.getElementById("__hide");
  if (on && !st) { st = document.createElement("style"); st.id = "__hide"; st.textContent = "body > *:not(canvas) { display: none !important; }"; document.head.append(st); }
  if (!on && st) st.remove();
}

export async function cam(tx, tz, dist, ang, h, th = 6, settle = 3000) {
  const v = window.viewer;
  const gy = v.world.surface(tx, tz);
  const cx = tx + Math.cos(ang) * dist, cz = tz + Math.sin(ang) * dist;
  v.camera.position.set(cx, v.world.surface(cx, cz) + h, cz);
  v.controls.target.set(tx, gy + th, tz);
  v.controls.update();
  v.lighting.snapNext = true;
  await sleep(settle);
  return v.camera.position.toArray().map((x) => +x.toFixed(1));
}

export async function gpu(seconds = 4) {
  const g = await import("/debug/gpuAB.js");
  const r = await g.measure({ settle: 1.5, seconds });
  return { p50: r.p50, avg: r.avg, n: r.n, draws: r.draws };
}

export async function flicker({ frames = 24, move = "strafe", step = 0.0006 } = {}) {
  const v = window.viewer;
  const { flickerTest } = await import("/labs/flickerTest.js");
  v.pause(true);
  v.freeze(true);                                   // no updaters between frames (trains, cars, wind): a still scene
  try {
    const r = await flickerTest({ renderFrame: v.renderFrame, canvas: v.renderer.domElement, camera: v.camera, controls: v.controls, frames, move, step });
    return { blink: r.blink, ppm: r.ppm, worst: (r.clusters ?? []).slice(0, 3) };
  } finally { v.freeze(false); v.pause(false); }
}

/** camera at p looking at t (world, m) */
export async function camP(p, t, settle = 3000) {
  const v = window.viewer;
  v.camera.position.set(...p); v.controls.target.set(...t); v.controls.update();
  v.lighting.snapNext = true;
  await sleep(settle);
}

/** GPU ms of the current view without the animation loop (a background / occluded tab runs rAF at 1 fps): the main
 *  loop paused, `n` frames rendered back to back, each frame's timestamp total read before the next (median) */
export async function gpuManual(n = 40) {
  const v = window.viewer, R = v.renderer;
  v.pause(true);
  const out = [];
  try {
    for (let i = 0; i < n + 5; i++) {
      v.renderFrame();
      const ms = await R.resolveTimestampsAsync("render");
      if (i >= 5 && typeof ms === "number" && ms > 0) out.push(ms);
    }
  } finally { v.pause(false); }
  out.sort((a, b) => a - b);
  return { p50: +out[Math.floor(out.length / 2)].toFixed(2), p10: +out[Math.floor(out.length * 0.1)].toFixed(2), n: out.length };
}

/** in-page A/B: alternate apply(false) / apply(true) `rounds` times, gpuManual each; returns per round and b - a */
export async function alternate(apply, { rounds = 5, n = 40 } = {}) {
  const A = [], B = [];
  for (let i = 0; i < rounds; i++) {
    for (const [on, arr] of [[false, A], [true, B]]) { apply(on); window.viewer.renderFrame(); await sleep(300); arr.push((await gpuManual(n)).p50); }
  }
  const mean = (x) => x.reduce((s, y) => s + y, 0) / x.length;
  const d = B.map((b, i) => b - A[i]);
  return { a: A, b: B, diff: +mean(d).toFixed(2), spread: [+Math.min(...d).toFixed(2), +Math.max(...d).toFixed(2)] };
}

/** a swapper for the façade kit: on = the page's (library) kit opaque materials, off = the stand-ins */
export async function kitSwap() {
  const K = await import("/viewer/facadeKit/kitMaterials.js");
  const meshes = [];
  window.viewer.scene.traverse((o) => { if (o.isMesh && /^kit opaque lod/.test(o.material?.name ?? "")) meshes.push(o); });
  const temp = {};
  for (const m of meshes) { m.userData.__libMat = m.material; const lod = m.material.userData.lod; temp[lod] ??= K.kitOpaqueMaterial(lod, { lib: false }); m.userData.__tmpMat = temp[lod]; }
  return { count: meshes.length, apply: (on) => { for (const m of meshes) m.material = on ? m.userData.__libMat : m.userData.__tmpMat; } };
}

/** a swapper for a landmark (module = "/viewer/stalleModel.js" ...): on = the library materials, off = its temporary */
export async function landmarkSwap(modulePath, loadName) {
  const M = await import(modulePath);
  const load = M[loadName] ?? Object.entries(M).find(([k, f]) => /^load/.test(k) && k !== "loadAO" && typeof f === "function")?.[1];
  const model = await load();
  const meshes = [];
  // the meshes whose material came from the library (createMaterial sets userData.libName; the models rename them)
  window.viewer.scene.traverse((o) => { if (o.isMesh && o.userData.slot && o.material?.userData?.libName) meshes.push(o); });
  for (const m of meshes) { m.userData.__libMat = m.material; m.userData.__tmpMat = model.tempMaterial ? model.tempMaterial(m.userData.slot) : m.material; }
  return { count: meshes.length, apply: (on) => { for (const m of meshes) m.material = on ? m.userData.__libMat : m.userData.__tmpMat; } };
}
