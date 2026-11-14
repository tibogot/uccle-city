// Tail-lamp test bench (docs/VISUAL_FIXES.md round 2): ONE traffic car placed by hand with the traffic's own batch
// material (same shader as the moving fleet), light bits set, the rest of the traffic hidden, the camera fixed behind
// it; shots (canvas read back) and the strafe flicker test of labs/flickerTest.js on the lamps' screen box.
//   const t = await import("/debug/tailTest.js");
//   await t.place({ x: 1220, z: 518, yaw: 0.3, bits: 1 });        // bits: 1 brake, 2 head, 16 reversing
//   await t.look({ dist: 10, eye: 1.6, side: 0 });  const png = await t.shot();  const f = await t.flicker();
import * as THREE from "three/webgpu";
import { flickerTest } from "/labs/flickerTest.js";

let car = null, pose = null;
const ray = new THREE.Raycaster();

function groundAt(x, z) {
  ray.set(new THREE.Vector3(x, 400, z), new THREE.Vector3(0, -1, 0));
  ray.far = 800;
  const hits = ray.intersectObjects(viewer.scene.children, true).filter((h) => h.object.isMesh && !h.object.isInstancedMesh && h.object.visible && h.face && h.face.normal.y > 0.5);
  return hits.length ? hits[0].point.y : 0;
}

/** place (or move) the test car. type: a traffic type name; lod: 0..3; fade: use the cross-fade batch (lodFade 0 = whole) */
export function place({ type = "hatch_c", lod = 0, x = 1220, z = 518, y = null, yaw = 0, bits = 1, paint = [0.75, 0.75, 0.74], fade = false, hideTraffic = true } = {}) {
  const F = window.__traffic.fleet;
  const T = F.types.find((t) => t.name === type) ?? F.types[0];
  const b = fade ? T.lods[lod].fade : T.lods[lod].plain;
  if (car) { car.parent?.remove(car); car = null; }
  const g = new THREE.BufferGeometry();
  for (const [n, a] of Object.entries(b.geo.attributes)) if (!(a.isInstancedBufferAttribute)) g.setAttribute(n, a);
  g.setIndex(b.geo.index); g.boundingSphere = b.geo.boundingSphere;
  g.setAttribute("paint", new THREE.InstancedBufferAttribute(new Float32Array(paint), 3));
  g.setAttribute("motion", new THREE.InstancedBufferAttribute(new Float32Array([0, 0, bits, yaw]), 4));
  if (fade) g.setAttribute("lodFade", new THREE.InstancedBufferAttribute(new Float32Array([0]), 1));
  car = new THREE.InstancedMesh(g, b.mat, 1);
  car.frustumCulled = false; car.castShadow = true; car.receiveShadow = true; car.name = "tail-test-car";
  const gy = y ?? groundAt(x, z);
  const m = new THREE.Matrix4().makeRotationY(yaw); m.setPosition(x, gy + 0.005, z);
  car.setMatrixAt(0, m); car.instanceMatrix.needsUpdate = true;
  viewer.scene.add(car);
  if (hideTraffic) F.group.visible = false;
  pose = { x, y: gy, z, yaw, type };
  return { type: T.name, tris: b.geo.index.count / 3, y: gy, material: b.mat.name || b.mat.type };
}
export function setBits(bits) { const a = car.geometry.attributes.motion; a.array[2] = bits; a.needsUpdate = true; }
export function remove() { if (car) car.parent?.remove(car); car = null; window.__traffic.fleet.group.visible = true; }

/** camera behind the car (side: metres to the car's left / right), looking at the tail lamps (~0.85 m up) */
export function look({ dist = 10, eye = 1.6, side = 0, fov = 55, front = false } = {}) {
  const { x, y, z, yaw } = pose;
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw);   // nose (+z local) and left (+x local)
  const s = front ? 1 : -1, tail = front ? 2.1 : -2.1;
  const tx = x + fx * tail, tz = z + fz * tail;
  const v = { pos: [tx + fx * s * dist + lx * side, y + eye, tz + fz * s * dist + lz * side], target: [tx, y + 0.85, tz], fov };
  const c = viewer.controls, cam = viewer.camera;
  c.target.set(...v.target); cam.position.set(...v.pos);
  cam.fov = fov; cam.updateProjectionMatrix();
  c.update(); cam.lookAt(...v.target); cam.updateMatrixWorld(true);
  return v;
}
const hud = (on) => document.querySelectorAll("body > div").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = on ? "" : "hidden"; });

/** render settled frames, read back the canvas -> PNG data URL. crop: [x0, y0, x1, y1] in canvas px */
export async function shot({ settle = 30, crop = null } = {}) {
  hud(false);
  viewer.pause(true);
  for (let i = 0; i < settle; i++) { viewer.renderFrame(); await new Promise((r) => setTimeout(r, 16)); }
  viewer.renderFrame();
  const cv = viewer.renderer.domElement, [x0, y0, x1, y1] = crop ?? [0, 0, cv.width, cv.height];
  const c2 = new OffscreenCanvas(x1 - x0, y1 - y0); c2.getContext("2d").drawImage(cv, -x0, -y0);
  viewer.pause(false);
  const blob = await c2.convertToBlob({ type: "image/png" });
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
}

/** the car's tail (or nose) box on screen, canvas px */
export function lampBox({ front = false, pad = 6 } = {}) {
  const { x, y, z, yaw } = pose, cv = viewer.renderer.domElement, cam = viewer.camera;
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), e = front ? 2.25 : -2.25;
  const pts = [];
  for (const sx of [-0.95, 0.95]) for (const hy of [0.55, 1.15]) {
    const p = new THREE.Vector3(x + fx * e + lx * sx, y + hy, z + fz * e + lz * sx).project(cam);
    pts.push([(p.x * 0.5 + 0.5) * cv.width, (0.5 - p.y * 0.5) * cv.height]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.max(0, Math.floor(Math.min(...xs)) - pad), Math.max(0, Math.floor(Math.min(...ys)) - pad), Math.min(cv.width, Math.ceil(Math.max(...xs)) + pad), Math.min(cv.height, Math.ceil(Math.max(...ys)) + pad)];
}

/** strafe flicker test on the lamp box; returns counts + the heat map PNG */
export async function flicker({ move = "strafe", step = 0.0006, frames = 24, threshold = 0.06, front = false } = {}) {
  hud(false);
  viewer.pause(true);
  for (let i = 0; i < 20; i++) { viewer.renderFrame(); await new Promise((r) => setTimeout(r, 16)); }
  viewer.freeze(true);
  const region = lampBox({ front });
  let r;
  try { r = await flickerTest({ renderFrame: () => viewer.renderFrame(), canvas: viewer.renderer.domElement, camera: viewer.camera, controls: viewer.controls, frames, move, step, threshold, region }); }
  finally { viewer.freeze(false); viewer.pause(false); }
  const blob = await (await fetch(r.heatURL)).blob();
  const heat = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  return { blink: r.blink, region, area: (region[2] - region[0]) * (region[3] - region[1]), heat };
}
