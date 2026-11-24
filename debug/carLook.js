// CARS LOOK round 1 (claude/cars1, rule car-look, docs/rules/car-look.md): shots of parked cars at fixed distances and the
// SMOOTH-OR-NOTHING strip (SSR on the paint vs the probe alone, a moving camera, frame-to-frame flicker).
//   ?quick=1&place=stjob-street (&carlook=old | &carssr=1 | &carprobe=1)
//   const L = await import("/debug/carLook.js");
//   await L.go(15)                 the camera 15 m from the parked car nearest the densest street, 3/4 front, 1.5 m up
//   await L.strip({ kind: "dolly" | "pan" | "still", frames: 90 }) -> { flicker, hot, sharp } medians over the frames: the main
//        loop paused and stepped at 1/60 s (the same frames whatever the GPU), the camera moved on a fixed path past the
//        parked row; the metrics on the cars' screen boxes only (their LOD0 / LOD1 bodies projected):
//          flicker  mean |Y(t+1) - 2 Y(t) + Y(t-1)| (x / 255): the temporal second difference; smooth motion cancels
//                   to first order, a reflection that blinks / crawls does not
//          hot      % of car pixels whose second difference is > 12 / 255 (localised popping)
//   L.probe()                      the probe's counters (faces, cycles, tiles, CPU ms)
import { at } from "/debug/featureAB.js";
import { densest, hideUI } from "/debug/cars2AB.js";
import { luma } from "/debug/sharpCheck.js";
export { hideUI };
const V = () => window.viewer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let CAR = null;
/** the parked car nearest the densest street's view (kept for the session: every variant shoots the same car) */
function car() {
  if (CAR) return CAR;
  const v = densest(); const cars = window.__carFleet.regs.flatMap((r) => r.cars).filter((c) => !c.hidden);
  const [px, , pz] = v.p; let best = null, bd = 1e9;
  for (const c of cars) { const d = (c.x - px) ** 2 + (c.z - pz) ** 2; if (d < bd) { bd = d; best = c; } }
  CAR = best; return best;
}
/** the camera `dist` m from the car's front corner, on the street side, 1.5 m up (3/4 view) */
export async function go(dist = 15, { front = true, settle = 3, fov = 50 } = {}) {
  const c = car(), h = c.heading, fx = Math.sin(h), fz = Math.cos(h), sx = Math.cos(h), sz = -Math.sin(h), k = front ? 1 : -1;
  const v0 = densest(), side = Math.sign((v0.p[0] - c.x) * sx + (v0.p[2] - c.z) * sz) || 1;
  const a = Math.atan2(1, 1.3), cx = c.x + k * fx * (dist * Math.cos(a)) + side * sx * dist * Math.sin(a), cz = c.z + k * fz * dist * Math.cos(a) + side * sz * dist * Math.sin(a);
  await at({ id: `car${dist}`, p: [cx, 1.5, cz], t: [c.x + k * fx * 0.5, 0.7, c.z + k * fz * 0.5], fov }, { settle });
  return { type: c.type, x: c.x, z: c.z, dist };
}
export const probe = () => { const p = window.__carProbe; return p ? { ...p.stats, ms: +p.stats.ms.toFixed(3), msMax: +p.stats.msMax.toFixed(2) } : null; };

/** screen boxes of the parked cars within 40 m of the camera, in front of it */
function carBoxes(W, H) {
  const v = V(), cam = v.camera, out = [];
  const P = new cam.position.constructor();
  for (const r of window.__carFleet.regs) for (const c of r.cars) {
    if (c.hidden || (c.x - cam.position.x) ** 2 + (c.z - cam.position.z) ** 2 > 1600) continue;
    let x0 = 1, y0 = 1, x1 = -1, y1 = -1, behind = false;
    for (const [dx, dy, dz] of [[-1, 0, -2.3], [1, 0, -2.3], [-1, 0, 2.3], [1, 0, 2.3], [-1, 1.5, -2.3], [1, 1.5, -2.3], [-1, 1.5, 2.3], [1, 1.5, 2.3]]) {
      const s = Math.sin(c.heading), co = Math.cos(c.heading);
      P.set(c.x + dx * co + dz * s, c.y + dy, c.z - dx * s + dz * co).project(cam);
      if (P.z > 1 || P.z < -1) { behind = true; break; }
      x0 = Math.min(x0, P.x); x1 = Math.max(x1, P.x); y0 = Math.min(y0, P.y); y1 = Math.max(y1, P.y);
    }
    if (behind || x1 < -1 || x0 > 1 || y1 < -1 || y0 > 1) continue;
    const X0 = Math.max(0, Math.round((x0 * 0.5 + 0.5) * W)), X1 = Math.min(W, Math.round((x1 * 0.5 + 0.5) * W));
    const Y0 = Math.max(0, Math.round((-y1 * 0.5 + 0.5) * H)), Y1 = Math.min(H, Math.round((-y0 * 0.5 + 0.5) * H));
    if (X1 - X0 > 8 && Y1 - Y0 > 8) out.push([X0, Y0, X1 - X0, Y1 - Y0]);
  }
  return out;
}

/**
 * The moving-camera strip. kind "dolly": the camera 3.2 m off the parked row at 1.6 m, moving along it at `speed` m/s,
 * looking 30 deg toward the cars; "pan": standing 6 m off the car, turning at `turn` deg/s across the row.
 * Every frame stepped (1/60 s); the car mask is taken per frame from the cars' projected boxes (the union).
 */
export async function strip({ kind = "dolly", frames = 90, speed = 6, turn = 25, warm = 40 } = {}) {
  const v = V(), cam = v.camera, canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  const c = car(), h = c.heading, fx = Math.sin(h), fz = Math.cos(h), sx = Math.cos(h), sz = -Math.sin(h);
  const v0 = densest(), side = Math.sign((v0.p[0] - c.x) * sx + (v0.p[2] - c.z) * sz) || 1;
  const gy = (x, z) => v.world.surface(x, z);
  const pose = (f) => {
    const t = kind === "still" ? 1 : f / 60;            // still: the dolly's pose at 1 s, held (the probe refreshing alone)
    if (kind === "dolly" || kind === "still") {
      const along = -12 + speed * t, px = c.x + side * sx * 3.2 + fx * along, pz = c.z + side * sz * 3.2 + fz * along;
      cam.position.set(px, gy(px, pz) + 1.6, pz);
      const tx = px + fx * 10 - side * sx * 5.8, tz = pz + fz * 10 - side * sz * 5.8;
      cam.lookAt(tx, gy(tx, tz) + 0.8, tz);
    } else {
      const px = c.x + side * sx * 6, pz = c.z + side * sz * 6, a = Math.atan2(-side * sx, -side * sz) + ((turn * t - turn * frames / 120) * Math.PI) / 180;
      cam.position.set(px, gy(px, pz) + 1.6, pz);
      cam.lookAt(px + Math.sin(a) * 10, gy(px, pz) + 1.0, pz + Math.cos(a) * 10);
    }
    cam.updateMatrixWorld();
  };
  const held = v.controls.update; v.controls.update = () => false;
  v.pause(true);
  const Ys = [], masks = [];
  try {
    for (let f = -warm; f < frames; f++) {
      pose(Math.max(0, f)); v.step(1 / 60);
      if (f < 0) { if (f % 8 === 0) await sleep(0); continue; }
      g.drawImage(canvas, 0, 0);
      const Y = luma(g.getImageData(0, 0, W, H));
      const m = new Uint8Array(W * H);
      for (const [x, y, w, hh] of carBoxes(W, H)) for (let yy = y; yy < y + hh; yy++) m.fill(1, yy * W + x, yy * W + x + w);
      Ys.push(Y); masks.push(m);
      if (Ys.length > 3) { Ys.shift(); masks.shift(); }
      if (Ys.length === 3) {
        const [A, B, C] = Ys, M = masks[1];
        let s = 0, n = 0, hot = 0;
        for (let i = 0; i < M.length; i++) if (M[i]) { const d = Math.abs(C[i] - 2 * B[i] + A[i]); s += d; n++; if (d > 12) hot++; }
        if (n > 500) (strip.acc ||= []).push([s / n / 255, (100 * hot) / n, n]);
      }
      if (f % 4 === 0) await sleep(0);
    }
  } finally { v.pause(false); v.controls.update = held; }
  const acc = strip.acc || []; strip.acc = null;
  const med = (k) => { const a = acc.map((r) => r[k]).sort((p, q) => p - q); return a.length ? a[a.length >> 1] : NaN; };
  const mean = (k) => acc.reduce((p, r) => p + r[k], 0) / (acc.length || 1);
  return { kind, frames: acc.length, flicker: +(med(0) * 1000).toFixed(3), flickerMean: +(mean(0) * 1000).toFixed(3), hot: +med(1).toFixed(3), hotMean: +mean(1).toFixed(3), px: Math.round(med(2)), variant: location.search.match(/car(look|ssr|probe)=[^&]+/g)?.join(",") || "new" };
}

/** (round 2) a TRAFFIC car shot (?quick=1&with=traffic): the moving car nearest the camera, the camera `dist` m off its
 *  front 3/4, the main loop paused and stepped 40 frames re-aiming at it (the TAAU settles; the car keeps driving). */
export async function goTraffic(dist = 15, { fov = 50, steps = 40 } = {}) {
  const T = window.__traffic, sim = T?.sim || T?.traffic?.sim || T?.T?.sim;
  if (!sim) throw new Error("no traffic sim (open with &with=traffic)");
  const v = V(), cam = v.camera, p = cam.position;
  let best = -1, bd = 1e12;
  for (let i = 0; i < sim.alive.length; i++) if (sim.alive[i]) { const d = (sim.x[i] - p.x) ** 2 + (sim.z[i] - p.z) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best < 0) throw new Error("no traffic car");
  const held = v.controls.update; v.controls.update = () => false;
  v.pause(true);
  try {
    for (let f = 0; f < steps; f++) {
      const x = sim.x[best], z = sim.z[best], yw = sim.yaw[best];
      const fx = Math.cos(yw), fz = -Math.sin(yw), sx = Math.sin(yw), sz = Math.cos(yw);   // (trafficSim: forward = cos, -sin)
      const cx = x + fx * dist * 0.77 + sx * dist * 0.64, cz = z + fz * dist * 0.77 + sz * dist * 0.64;
      cam.position.set(cx, v.world.surface(cx, cz) + 1.5, cz); cam.fov = fov; cam.updateProjectionMatrix();
      cam.lookAt(x, v.world.surface(x, z) + 0.7, z); cam.updateMatrixWorld();
      v.step(1 / 60);
      if (f % 4 === 0) await sleep(0);
    }
  } finally { v.controls.update = held; }
  return { type: sim.type ? sim.type[best] : "?", d: Math.sqrt(bd) };
}
/** the main loop back on after goTraffic (the shot is taken while paused) */
export const resume = () => V().pause(false);
