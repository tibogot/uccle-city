// node tools/falconCameraTest.mjs: the falcon's chase camera on a PERCH must come to rest (falconfix, owner 2026-11-17:
// "when it lands it's like everything is shaking, the camera doesn't stop shaking"). Drives viewer/falconFlight/
// falconCamera.js (three r187 from tools/worker/node_modules: link it from the main checkout if missing) with a perched
// bird for 5 s after a crash landing (the flight's stun and the air's lift left as the flight had them), in both camera
// modes, and prints the camera's position / rotation spread over the last 3 s. PASS: < 0.1 mm and < 0.001 deg.
import { register } from "node:module";

const THREE_DIR = new URL("./worker/node_modules/three/build/", import.meta.url).href;
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === "three/webgpu" || spec === "three") return { url: "${THREE_DIR}three.webgpu.js", shortCircuit: true };
  if (spec === "three/tsl") return { url: "${THREE_DIR}three.tsl.js", shortCircuit: true };
  return next(spec, ctx);
}`));

const el = () => ({ style: { setProperty() {} }, append() {}, classList: { add() {}, remove() {}, toggle() {} } });
globalThis.document = { createElement: el, body: el(), head: el() };
globalThis.location = { search: "" };

const THREE = await import("three/webgpu");
const { FalconCamera } = await import("../viewer/falconFlight/falconCamera.js");

let fails = 0;
for (const steady of [true, false]) for (const stun of [0, 0.6]) {
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.05, 8000);
  const fc = new FalconCamera(cam, new THREE.Scene());
  // flying in, then perched (the game's call: V 0.1, perched, perchYaw)
  const b = { pos: new THREE.Vector3(10, 80, 20), va: { x: 0, y: -2, z: -12 }, V: 12, phi: 0.3, heading: 0, gamma: -0.15, lift: 2.5, liftRate: 2.5, span: 1, stun: 0, fold: 0 };
  const floor = () => 79.6, col = () => ({ floor: 79.6, ceil: Infinity });
  const o = { aim: null, steady, look: { yaw: 0, pitch: 0 }, zoom: 1, perched: false, perchYaw: 0, floor, col, sight: floor };
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) { b.pos.z -= 12 * dt; fc.update(dt, b, o); }
  // the crash landing: the bird stops, perched; the flight state as it was left (stun, lift)
  b.V = 0.1; b.stun = stun; b.va = { x: 0, y: 0, z: -0.1 }; o.perched = true; o.perchYaw = 0.4;
  const P = [], Q = [];
  for (let i = 0; i < 300; i++) {
    fc.update(dt, b, o);
    if (i >= 120) { P.push(cam.position.clone()); Q.push(cam.quaternion.clone()); }
  }
  let dp = 0, dq = 0;
  for (let i = 1; i < P.length; i++) { dp = Math.max(dp, P[i].distanceTo(P[0])); dq = Math.max(dq, Q[i].angleTo(Q[0]) * 57.29578); }
  const ok = dp < 1e-4 && dq < 1e-3;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  perched, ${steady ? "steady (assisted)" : "velocity (old)"} camera, stun left ${stun}: position spread ${(dp * 1000).toFixed(4)} mm, rotation spread ${dq.toFixed(5)} deg over the last 3 s`);
}
console.log(fails ? `${fails} FAIL` : "all pass");
