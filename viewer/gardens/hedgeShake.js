// HEDGES SOLID (owner 2026-11-20, rule hedge-wall, docs/CARHIT.md "Hedges"): a car / two-wheeler hitting a tall clipped
// hedge (KIND.hedgeWall, viewer/drive/colliders.js) shakes it where it touched: a short wobble of the hedge's vertices
// round the hit point, pushed away from the car, decaying over SHAKE_T. A FIXED pool of SHAKE_N uniform slots (no
// buffer writes, no DynamicDrawUsage, no material rebuild): carEnv.js hands each hit to shakeHedge (HEDGE_HITS.sink),
// cityGardens.update steps the pool once a frame, gardenHedge.js adds shakeAt to the body's and the cards' wind lean.
import * as THREE from "three/webgpu";
import { uniformArray, vec3, float, smoothstep, length } from "three/tsl";
import { HEDGE_HITS } from "../drive/carEnv.js";

export const SHAKE_N = 4, SHAKE_T = 0.6, SHAKE_R = 1.4, SHAKE_HZ = 5, SHAKE_MAX = 0.12;
const slots = Array.from({ length: SHAKE_N }, () => ({ x: 0, z: 0, nx: 0, nz: 0, a: 0, t: -1e9, live: false }));
/** per slot: (x, z) the hit point, (z, w) the displacement now (world metres, at the hedge's top) */
export const uShake = uniformArray(slots.map(() => new THREE.Vector4(0, 0, 0, 0)), "vec4");

const nowS = () => performance.now() / 1000;
/** a hit at (x, z), n = out of the hedge toward the car, vn = the approach speed (m/s) */
export function shakeHedge(x, z, nx, nz, vn, now = nowS()) {
  if (!(Number.isFinite(x) && Number.isFinite(z) && vn > 0)) return;
  const a = Math.min(SHAKE_MAX, 0.012 * vn);
  // one impact spans substeps / frames: a hit near a slot still young refreshes it (the larger push wins)
  let s = null;
  for (const q of slots) if (q.live && now - q.t < 0.15 && Math.hypot(q.x - x, q.z - z) < 0.8) { s = q; break; }
  if (s) { if (a > s.a) { s.a = a; s.nx = nx; s.nz = nz; } return; }
  s = slots[0];
  for (const q of slots) if (q.t < s.t) s = q;                 // the oldest slot
  Object.assign(s, { x, z, nx, nz, a, t: now, live: true });
}
/** once a frame: each live slot's wobble now; an expired slot is written zero once */
export function updateShake(now = nowS()) {
  for (let k = 0; k < SHAKE_N; k++) {
    const s = slots[k];
    if (!s.live) continue;
    const age = now - s.t, v = uShake.array[k];
    if (age > SHAKE_T || age < 0) { s.live = false; v.set(0, 0, 0, 0); continue; }
    const w = s.a * Math.exp(-age / 0.2) * Math.cos(2 * Math.PI * SHAKE_HZ * age) * (1 - age / SHAKE_T);
    v.set(s.x, s.z, -s.nx * w, -s.nz * w);
  }
}
export const shakeLive = () => slots.some((s) => s.live);
/** TSL: the shake offset (world) at world point p, f = its height fraction in the hedge (0 foot .. 1 top) */
export function shakeAt(p, f) {
  let d = vec3(0, 0, 0);
  for (let k = 0; k < SHAKE_N; k++) {
    const u = uShake.element(k);
    const fall = float(1).sub(smoothstep(0.0, SHAKE_R, length(p.xz.sub(u.xy))));
    d = d.add(vec3(u.z, 0, u.w).mul(fall));
  }
  const k = f.clamp(0, 1);
  return d.mul(k);
}

HEDGE_HITS.sink = shakeHedge;
