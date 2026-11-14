// THE TRAFFIC, put together (the Traffic Lab and the city's ?traffic=1 both use this):
//   world  (trafficWorld.js)   the loaded tiles' lane graphs, stitched at the borders
//   sim    (trafficSim.js)     fixed 20 Hz steps, IDM, junction rules, parking, population
//   fleet  (trafficFleet.js)   the faceted cars drawn like the parked ones, wheels / lights in the shader
//   debug  (trafficDebug.js)   lanes, hold points with their signal state, each car's target
// update(dt, camera, focus) runs whole steps (at most 3 per frame), then interpolates the draw.
// Obstacles: setObstacleSource(fn) — fn(sim) calls sim.addObstacle(...) once per step (player car, walker, trams).
// Colliders: boxesNear(x, z, r, out) for drive mode / the walker (oriented boxes of the cars).
import * as THREE from "three/webgpu";
import { TrafficWorld } from "./trafficWorld.js";
import { TrafficSim, STEP } from "./trafficSim.js";
import { TrafficFleet, TYPE_NAMES } from "./trafficFleet.js";
import { TYPE_MIX, SIZES, PAINTS, FADE_TO } from "../carFleet.js";

// per type: wheelbase and wheel radius (the faceted GLB's Wheel_* nodes: z = +-wb/2, y = r)
const WHEELS = { hatch_s: [2.5, 0.3], hatch_c: [2.64, 0.32], estate: [2.7, 0.32], saloon: [2.8, 0.33], suv: [2.64, 0.34], van_c: [2.72, 0.32], van_p: [3.26, 0.34], taxi: [2.7, 0.32] };

export function createTraffic({ scene, renderer, camera, ground, night, cap = 768, seed = 7 }) {
  const world = new TrafficWorld();
  const mix = new Map(TYPE_MIX);
  const types = TYPE_NAMES.map((name) => ({ name, len: SIZES[name][2], w: SIZES[name][0], h: SIZES[name][1], wb: WHEELS[name][0], wheelR: WHEELS[name][1], weight: mix.get(name) }));
  const c = new THREE.Color();
  const paints = PAINTS.map((h) => { c.setHex(h); return [c.r, c.g, c.b]; });
  const sim = new TrafficSim(world, { cap, types, paints, ground, seed });
  const fleet = new TrafficFleet({ night, maxCars: cap });
  scene.add(fleet.group);
  fleet.load(renderer, scene, camera);
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 4);
  const camPos = new THREE.Vector3();
  // visible = in the camera's frustum and nearer than the fleet's fade end
  const visible = (x, y, z, r) => {
    const dx = x - camPos.x, dy = y - camPos.y, dz = z - camPos.z;
    if (dx * dx + dy * dy + dz * dz > (FADE_TO + 8) * (FADE_TO + 8)) return false;
    sphere.center.set(x, y + 0.9, z); sphere.radius = r + 2;
    return frustum.intersectsSphere(sphere);
  };
  const ctx = { visible, fx: 0, fz: 0 };
  let acc = 0, obstacleSource = null;
  const T = { world, sim, fleet, debug: null, enabled: true, cpu: { sim: 0, draw: 0, frame: 0, max: 0 }, steps: 0 };
  T.addTile = (name, graph) => world.add(name, graph);
  T.removeTile = (name) => {
    const s = world.remove(name);
    if (s < 0) return;
    for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && ((sim.path[i] >>> 16) === s || (sim.onPath[i] >= 0 && (sim.onPath[i] >>> 16) === s))) sim.kill(i);
    for (let i = 0; i < sim.cap; i++) if (sim.alive[i]) for (let k = 0; k < 4; k++) { const r = sim.route[i * 4 + k]; if (r >= 0 && (r >>> 16) === s) { for (let m = k; m < 4; m++) sim.route[i * 4 + m] = -1; break; } }
  };
  T.setObstacleSource = (fn) => { obstacleSource = fn; };
  /** dt: frame seconds; focus: { x, z } where the traffic lives (player / orbit target) */
  T.update = (dt, cam, focus) => {
    if (!T.enabled) return;
    const t0 = performance.now();
    cam.updateMatrixWorld();
    camPos.copy(cam.position);
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm, THREE.WebGPUCoordinateSystem, cam.reversedDepth);
    ctx.fx = focus.x; ctx.fz = focus.z;
    acc += Math.min(dt, 0.25);
    let n = 0;
    while (acc >= STEP && n < 3) {
      sim.clearObstacles();
      obstacleSource?.(sim);
      sim.step(ctx);
      acc -= STEP; n++; T.steps++;
    }
    if (acc > STEP) acc = STEP;          // a long hitch: drop the backlog, never fast-forward visibly
    const t1 = performance.now();
    T.alpha = Math.min(1, acc / STEP);            // (the draw's interpolation factor: the night lights follow the drawn cars)
    fleet.update(sim, T.alpha, cam.position, cam);
    T.debug?.update(sim, Math.min(1, acc / STEP));
    const t2 = performance.now();
    const k = 0.05;
    T.cpu.sim = T.cpu.sim * (1 - k) + (t1 - t0) * k; T.cpu.draw = T.cpu.draw * (1 - k) + (t2 - t1) * k; T.cpu.frame = T.cpu.sim + T.cpu.draw;
    T.cpu.max = Math.max(T.cpu.max * 0.995, t2 - t0);
  };
  /** Oriented boxes of the cars within r of (x, z): out = Float32Array chunks of 7 (x, z, yaw, hw, hl, y, h); -> count. */
  T.boxesNear = (x, z, r, out) => {
    let n = 0;
    const max = out.length / 7;
    for (let i = 0; i < sim.cap && n < max; i++) {
      if (!sim.alive[i]) continue;
      const dx = sim.x[i] - x, dz = sim.z[i] - z;
      if (dx * dx + dz * dz > r * r) continue;
      const ty = types[sim.type[i]], o = n * 7;
      out[o] = sim.x[i]; out[o + 1] = sim.z[i]; out[o + 2] = sim.yaw[i]; out[o + 3] = ty.w / 2; out[o + 4] = ty.len / 2; out[o + 5] = sim.y[i]; out[o + 6] = ty.h;
      n++;
    }
    return n;
  };
  T.types = types;
  return T;
}
