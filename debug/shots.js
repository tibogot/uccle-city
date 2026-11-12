// fixes1: fixed-view shots + flicker tests for before / after (docs/fixes1/README.md). Hides the HUD, sets the view,
// lets the frame settle (shadows, TAA-free), returns a PNG data URL of the canvas.
//   const s = await import("/debug/shots.js"); await s.shot({ pos, target, fov, clock })
//   await s.flicker({ pos, target, move: "strafe" })  -> { ppm, blink, heat (data URL) }
import { flickerTest } from "/labs/flickerTest.js";

const hud = () => document.querySelectorAll("body > div").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = "hidden"; });
const toURL = async (canvas) => {
  const c2 = new OffscreenCanvas(canvas.width, canvas.height); c2.getContext("2d").drawImage(canvas, 0, 0);
  const blob = await c2.convertToBlob({ type: "image/png" });
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
};
function setView({ pos, target, fov = null }) {
  const c = viewer.controls, cam = viewer.camera;
  c.target.set(...target); cam.position.set(...pos);
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  c.update(); cam.lookAt(...target); cam.updateMatrixWorld(true);
}
export async function shot(v) {
  hud();
  viewer.pause(true);
  setView(v);
  for (let i = 0; i < 30; i++) { viewer.renderFrame(); await new Promise((r) => setTimeout(r, 16)); }
  // render and read back in one task (the WebGPU canvas is readable right after the render)
  viewer.renderFrame();
  const c2 = new OffscreenCanvas(viewer.renderer.domElement.width, viewer.renderer.domElement.height);
  c2.getContext("2d").drawImage(viewer.renderer.domElement, 0, 0);
  viewer.pause(false);
  const blob = await c2.convertToBlob({ type: "image/png" });
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
}
export async function flicker(v, opts = {}) {
  hud();
  viewer.pause(true); viewer.freeze(true);            // a still scene: no updaters between frames (debug/libAB.js)
  setView(v);
  viewer.freeze(false);
  for (let i = 0; i < 20; i++) { viewer.renderFrame(); await new Promise((r) => setTimeout(r, 16)); }   // LODs / shadows settle here
  viewer.freeze(true);
  let r;
  try { r = await flickerTest({ renderFrame: () => viewer.renderFrame(), canvas: viewer.renderer.domElement, camera: viewer.camera, controls: viewer.controls, frames: 24, move: "strafe", step: 0.0006, ...opts }); }
  finally { viewer.freeze(false); viewer.pause(false); }
  const blob = await (await fetch(r.heatURL)).blob();
  const heat = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  return { ppm: r.ppm, blink: r.blink, clusters: r.clusters.slice(0, 5), heat };
}
export { toURL };
