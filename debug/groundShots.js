// Ground before / after shots and lawn finding (docs/materials/GROUND.md). In the city page:
//   const g = await import("/debug/groundShots.js"); await g.ready();
//   await g.set({ x, z, h: 1.7, tx, tz, th: 0 }, on)   on = textured (default) / false = procedural (viewer.groundAB)
//   await g.grab()                                      -> JPEG data URL of the canvas
//   g.open(x, z, r)                                      -> share of rays in radius r that hit bare terrain (no road / building / tree)
import * as THREE from "three/webgpu";

const surf = (x, z) => viewer.world.surface(x, z);
export async function ready() {
  for (let i = 0; i < 120 && !window.viewer; i++) await new Promise((r) => setTimeout(r, 1000));
  document.querySelectorAll("body > div").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = "hidden"; });
}
export function view({ x, z, h = 1.7, tx, tz, th = 0, fov = 60 }) {
  return { pos: [x, surf(x, z) + h, z], target: [tx, surf(tx, tz) + th, tz], fov };
}
export async function set(v, on = true, frames = 20) {
  viewer.groundAB(on);
  const V = view(v), c = viewer.controls, cam = viewer.camera;
  viewer.pause(true);
  c.target.set(...V.target); cam.position.set(...V.pos); cam.fov = V.fov; cam.updateProjectionMatrix(); c.update(); cam.lookAt(...V.target);
  for (let i = 0; i < frames; i++) { viewer.renderFrame(); await new Promise((r) => setTimeout(r, 20)); }
}
export async function grab(q = 0.88) {
  viewer.renderFrame();
  const cv = viewer.renderer.domElement, c2 = new OffscreenCanvas(cv.width, cv.height);
  c2.getContext("2d").drawImage(cv, 0, 0);
  const b = await c2.convertToBlob({ type: "image/jpeg", quality: q });
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
}
const ray = new THREE.Raycaster();
export function open(x, z, r = 15) {
  let ok = 0, n = 0;
  for (let a = -r; a <= r; a += r / 3) for (let b = -r; b <= r; b += r / 3) {
    ray.set(new THREE.Vector3(x + a, 400, z + b), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects([viewer.scene], true).find((h) => h.object.visible !== false);
    n++; if (hit?.object.name === "terrain") ok++;
  }
  return ok / n;
}
