// FAR CITY GPU A/B (docs/FARCITY.md), in ONE page (same tiles, same frames, same background load): the far tiles'
// buildings drawn with the far look (viewer/farLook.js) vs a flat material (the cost of the flat-coloured solids of
// before: a colour and a roughness), alternated `rounds` times at a parked camera. The page is paused; frames are
// rendered here (viewer.renderFrame) and timed with the renderer's timestamp queries (all passes of a frame).
//   const s = await import("/debug/farcityShots.js"); await s.go("overview");
//   const ab = await import("/debug/farcityAB.js"); await ab.run({ rounds: 6 })
import * as THREE from "three/webgpu";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

let flat = null;
/** every far-buildings mesh, its far material and the flat stand-in */
function meshes() {
  const out = [];
  viewer.lite.forEach((l) => l.group.traverse((o) => { if (o.name === "far-buildings") out.push(o); }));
  return out;
}
function use(which) {
  flat ??= Object.assign(new THREE.MeshStandardNodeMaterial({ color: 0x9a8a78, roughness: 0.85 }), { name: "far flat (A/B)" });
  for (const m of meshes()) { m.userData.farMat ??= m.material; m.material = which === "far" ? m.userData.farMat : flat; }
}
/** frames rendered back to back for `ms`, the GPU time of each (ms) */
async function sample(ms) {
  const r = viewer.renderer, out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    viewer.renderFrame();
    await new Promise((q) => requestAnimationFrame(q));
    const g = await r.resolveTimestampsAsync("render").catch(() => null);
    if (typeof g === "number" && g > 0) out.push(g);
  }
  return out;
}
/** isolate: only the far tiles' BUILDINGS drawn (every other top-level object and the far tiles' ground / trees
 *  hidden): the far look's own cost without the rest of the frame's noise */
export async function run({ rounds = 6, settle = 800, seconds = 2.5, isolate = false } = {}) {
  const A = [], B = [];
  const hidden = [];
  if (isolate) {
    for (const o of viewer.scene.children) if (o.name !== "far-lod" && o.visible && !o.isLight) { o.visible = false; hidden.push(o); }
    viewer.lite.forEach((l) => l.group.children.forEach((o) => { if (o.name !== "far-buildings" && o.visible) { o.visible = false; hidden.push(o); } }));
  }
  use("flat"); await sample(1500);            // (the flat material's pipeline compiled before the first round)
  for (let i = 0; i < rounds; i++) {
    for (const [w, out] of [["flat", A], ["far", B]]) {
      use(w); await sample(settle);
      out.push(median(await sample(seconds * 1000)));
    }
  }
  use("far");
  for (const o of hidden) o.visible = true;
  const d = B.map((v, i) => v - A[i]), mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const ri = viewer.renderer.info.render;
  return { meshes: meshes().length, flat: A.map((v) => +v.toFixed(2)), far: B.map((v) => +v.toFixed(2)), meanFlat: +mean(A).toFixed(2), meanFar: +mean(B).toFixed(2),
    diff: +mean(d).toFixed(2), diffMedian: +median(d).toFixed(2), diffMin: +Math.min(...d).toFixed(2), diffMax: +Math.max(...d).toFixed(2), draws: ri.drawCalls ?? ri.calls, tris: +(ri.triangles / 1e6).toFixed(2) };
}
