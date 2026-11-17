// node tools/carctlTest.mjs: the car control round's handling checks without a browser (docs/CARCTL.md).
// OLD = round 2 (viewer/drive/carFeel.js stepFeel + chaseCamera.js updateCar), NEW = round 3 (carCtl.js stepCtl +
// carCtlCam.js). Synthetic grounds; inputs are a keyboard's (0 / ±1, shaped by the model) unless noted.
// Prints a table per check. Exit code 1 if a NEW check fails its bar.
import { register } from "node:module";

// three/webgpu stub (chaseCamera.js only needs Vector3 + a camera's lookAt / rotateZ for the old camera)
const STUB = `
export class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this;} multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;} lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);} }`;
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(s, c, n) { if (s === "three/webgpu") return { url: "data:text/javascript," + encodeURIComponent(${JSON.stringify(STUB)}), shortCircuit: true }; return n(s, c); }`));
globalThis.addEventListener = () => {};

const { createFeelState, stepFeel } = await import("../viewer/drive/carFeel.js");
const { createCtlState, stepCtl } = await import("../viewer/drive/carCtl.js");
const { ChaseCamera, CAMERA } = await import("../viewer/drive/chaseCamera.js");
const { createCarEnv } = await import("../viewer/drive/carEnv.js");
const { createRailMovers, railMoverSource } = await import("../viewer/drive/movers.js");
const { HANDLING } = await import("../viewer/drive/carPhysics.js");

const MODELS = {
  old: { make: createFeelState, step: stepFeel },
  new: { make: createCtlState, step: stepCtl },
};
const DT = 1 / 60, KMH = 1 / 3.6, DEG = 180 / Math.PI;
const flat = () => 0;
const envOf = (ground) => ({ ground, prepare() { this.contacts = 0; }, collide() {}, contacts: 0 });
function car(model, ground = flat, x = 0, z = 0, heading = 0) {
  const M = MODELS[model], c = M.make(x, z, heading), env = envOf(ground);
  c.y = ground(x, z);
  M.step(c, { throttle: 0, steer: 0 }, DT, env);
  return { c, env, step: (inp, dt = DT) => M.step(c, inp, dt, env) };
}
/** drive straight to a speed (m/s), then hold it */
function cruise(k, v, t = 12) {
  for (let i = 0; i < t / DT && k.c.speed < v - 0.1; i++) k.step({ throttle: 1, steer: 0 });
  for (let i = 0; i < 60; i++) k.step({ throttle: k.c.speed < v ? 0.3 : 0, steer: 0 });
}
const hold = (k, v) => (k.c.speed < v - 0.2 ? 1 : k.c.speed > v + 0.2 ? 0 : 0.35);
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
const rows = [];
let fails = 0;
function check(name, ok, msg) { if (!ok) { fails++; console.log(`  FAIL ${name}: ${msg}`); } }
function table(title, head, data) {
  console.log(`\n## ${title}`);
  console.log("| " + head.join(" | ") + " |");
  console.log("|" + head.map(() => "---").join("|") + "|");
  for (const r of data) console.log("| " + r.join(" | ") + " |");
}

// ---------------------------------------------------------------- 1. turning radius vs speed (full keyboard lock, speed held)
{
  const data = [];
  for (const kmh of [5, 15, 30, 50, 80, 110]) {
    const row = [kmh];
    for (const m of ["old", "new"]) {
      const k = car(m); cruise(k, kmh * KMH);
      let r = 0, slip = 0;
      for (let i = 0; i < 4 / DT; i++) { k.step({ throttle: hold(k, kmh * KMH), steer: 1 }); if (i > 2.5 / DT) { r = Math.max(r, Math.abs(k.c.angularVel)); slip = Math.max(slip, Math.abs(k.c.slip)); } }
      const V = Math.hypot(k.c.speed, k.c.vx, k.c.vz);
      row.push(`${fmt(V / Math.max(1e-3, r), 1)} m / ${fmt(V * r / 9.81)} g / ${fmt(slip * DEG, 1)}°`);
      if (m === "new") { check(`radius ${kmh}`, slip * DEG < 3, "slip " + slip * DEG); if (kmh === 5) check("lock radius", V / r < 5.5, V / r); }
    }
    data.push(row);
  }
  table("1. Full lock, speed held: radius / lateral g / body slip", ["km/h", "OLD", "NEW"], data);
}
// ---------------------------------------------------------------- 1b. yaw rate vs stick (analog, 50 km/h): the mapping
{
  const data = [];
  for (const s of [0.25, 0.5, 0.75, 1]) {
    const row = [s];
    for (const m of ["old", "new"]) {
      const k = car(m); cruise(k, 50 * KMH);
      for (let i = 0; i < 3 / DT; i++) k.step({ throttle: hold(k, 50 * KMH), steer: s, analog: true });
      row.push(fmt(k.c.angularVel * DEG, 1) + " °/s");
    }
    data.push(row);
  }
  table("1b. Steady yaw rate vs stick at 50 km/h (gamepad)", ["stick", "OLD", "NEW"], data);
}
// ---------------------------------------------------------------- 2. response: key press -> 63 % / 90 % of the steady yaw rate
{
  const data = [];
  for (const kmh of [30, 50, 90]) {
    const row = [kmh];
    for (const m of ["old", "new"]) {
      const k = car(m); cruise(k, kmh * KMH);
      const trace = [];
      for (let i = 0; i < 3 / DT; i++) { k.step({ throttle: hold(k, kmh * KMH), steer: 1 }); trace.push(Math.abs(k.c.angularVel)); }
      const ss = trace[trace.length - 1];
      const t63 = trace.findIndex((r) => r >= 0.63 * ss) * DT, t90 = trace.findIndex((r) => r >= 0.9 * ss) * DT;
      const over = Math.max(...trace) / ss - 1;
      // release: time back under 5 % (and the yaw's overshoot the other way)
      let back = -1, neg = 0;
      for (let i = 0; i < 3 / DT; i++) { k.step({ throttle: hold(k, kmh * KMH), steer: 0 }); if (back < 0 && Math.abs(k.c.angularVel) < 0.05 * ss) back = i * DT; neg = Math.min(neg, k.c.angularVel); }
      row.push(`${fmt(t63)} / ${fmt(t90)} s, over ${fmt(over * 100, 0)} %, release ${fmt(back)} s (${fmt(-neg * DEG, 1)}°/s back)`);
      if (m === "new") check(`response ${kmh}`, t90 < 0.45 && over < 0.1 && back < 0.4, row[2]);
    }
    data.push(row);
  }
  table("2. Steer key held: time to 63 / 90 % of the steady yaw rate, overshoot; released: back to straight", ["km/h", "OLD", "NEW"], data);
}
// ---------------------------------------------------------------- 2b. lane change 3.5 m: (a) a smooth driver on a pad (the car's own response), (b) two equal keyboard taps
{
  const data = [], res2b = {};
  for (const kmh of [50, 90]) {
    const row = [kmh];
    for (const m of ["old", "new"]) {
      const k = car(m); cruise(k, kmh * KMH);
      const x0 = k.c.x, h0 = k.c.heading;
      let t = 0, done = -1, inT = 0, over = 0, slip = 0, t1 = -1;
      for (let i = 0; i < 8 / DT; i++) {
        const lat = k.c.x - x0, e = 3.5 - lat, hd = k.c.heading - h0;        // (+x is the car's left at heading 0)
        const want = Math.max(-0.15, Math.min(0.15, 0.1 * e - 0.25 * hd * 0));
        const st = Math.max(-1, Math.min(1, 5 * (want - hd) - 0.5 * k.c.angularVel - 0.04 * (k.c.speed * Math.sin(hd))));
        k.step({ throttle: hold(k, kmh * KMH), steer: st, analog: true }); t += DT;
        over = Math.max(over, lat - 3.5); slip = Math.max(slip, Math.abs(k.c.slip));
        if (t1 < 0 && lat > 1) t1 = t;
        if (Math.abs(e) < 0.15 && Math.abs(hd) < 0.02) { inT += DT; if (inT > 1 && done < 0) done = t - 1; } else inT = 0;
      }
      // (b) keyboard: left for tap s, right for tap s: the offset, and the heading left over (equal taps should end straight)
      const k2 = car(m); cruise(k2, kmh * KMH);
      const xb = k2.c.x, hb0 = k2.c.heading, tap = 0.3;
      for (const [s2, d] of [[1, tap], [-1, tap], [0, 2]]) for (let i = 0; i < d / DT; i++) k2.step({ throttle: hold(k2, kmh * KMH), steer: s2 });
      (res2b[kmh] ||= {})[m] = done; res2b[kmh][m + 'o'] = over;
      row.push(`pad: 1 m at ${fmt(t1)} s, in lane ${fmt(done)} s, over ${fmt(over * 100, 0)} cm | keys 2 x ${tap} s: ${fmt(k2.c.x - xb)} m, ${fmt((k2.c.heading - hb0) * DEG, 1)}° left over`);
      if (m === "new") check(`lane ${kmh}`, done > 0 && done <= res2b[kmh].old * 1.1 && over <= res2b[kmh].oldo + 0.1, row[2]);
    }
    data.push(row);
  }
  table("2b. Lane change 3.5 m: a smooth pad driver (1 m reached, settled ±0.15 m / ±1.1°, overshoot); two equal keyboard taps (offset, heading left over)", ["km/h", "OLD", "NEW"], data);
}
// ---------------------------------------------------------------- 3. 90 deg junction at 30 km/h (a driver: full lock, let go at 75 deg)
{
  const data = [];
  for (const m of ["old", "new"]) {
    const k = car(m); cruise(k, 30 * KMH);
    const h0 = k.c.heading, x0 = k.c.x, z0 = k.c.z;
    let t = 0, minR = 1e9, slip = 0, released = -1, maxH = 0;
    for (let i = 0; i < 5 / DT; i++) {
      const turned = (k.c.heading - h0) * DEG;
      const s = released < 0 && turned < 75 ? 1 : 0;
      if (!s && released < 0) released = t;
      k.step({ throttle: hold(k, 30 * KMH), steer: s }); t += DT;
      maxH = Math.max(maxH, (k.c.heading - h0) * DEG);
      if (s) minR = Math.min(minR, Math.hypot(k.c.speed, k.c.vx, k.c.vz) / Math.max(1e-3, Math.abs(k.c.angularVel)));
      slip = Math.max(slip, Math.abs(k.c.slip));
    }
    const fwd = (k.c.z - z0), side = (k.c.x - x0);
    data.push([m, fmt(released, 2) + " s", fmt(minR, 1) + " m", fmt(maxH, 1) + "°", fmt(slip * DEG, 1) + "°", `${fmt(fwd, 1)} / ${fmt(side, 1)} m`]);
    if (m === "new") check("junction", minR < 9 && maxH < 100 && slip * DEG < 4, data[data.length - 1].join(" "));
  }
  table("3. 90° junction at 30 km/h: full lock until 75°, then let go", ["", "lock held", "min radius", "final turn", "max slip", "corner (fwd / side)"], data);
}
// ---------------------------------------------------------------- 4. slalom (cones 18 m apart at 50 km/h): steer ±1 every 0.65 s, 8 s, then straight
{
  const data = [];
  for (const m of ["old", "new"]) {
    const k = car(m); cruise(k, 50 * KMH);
    const x0 = k.c.x;
    let slip = 0, latMin = 0, latMax = 0, settle = -1, t = 0, lost = 0;
    for (let i = 0; i < 8 / DT; i++) {
      const ph = Math.floor((t + 0.325) / 0.65) % 2 ? -1 : 1;
      k.step({ throttle: hold(k, 50 * KMH), steer: ph }); t += DT;
      slip = Math.max(slip, Math.abs(k.c.slip));
      if (t > 2) { latMin = Math.min(latMin, k.c.x - x0); latMax = Math.max(latMax, k.c.x - x0); }
    }
    const v0 = k.c.speed;
    for (let i = 0; i < 4 / DT; i++) { k.step({ throttle: hold(k, 50 * KMH), steer: 0 }); if (settle < 0 && Math.abs(k.c.angularVel) < 0.02 && Math.abs(k.c.slip) < 0.01) settle = i * DT; }
    lost = 50 - v0 * 3.6;
    data.push([m, fmt(latMax - latMin, 2) + " m", fmt(slip * DEG, 1) + "°", fmt(lost, 1) + " km/h", fmt(settle, 2) + " s"]);
    if (m === "new") check("slalom", slip * DEG < 4 && settle < 0.6, data[data.length - 1].join(" "));
  }
  table("4. Slalom at 50 km/h (keyboard, ±1 every 0.65 s): weave width, max slip, speed lost, straight again after", ["", "weave", "max slip", "speed lost", "settled"], data);
}
// ---------------------------------------------------------------- 5. hill start 15 %
{
  const data = [];
  for (const m of ["old", "new"]) {
    const g = (x, z) => 0.15 * z, k = car(m, g);
    for (let i = 0; i < 1 / DT; i++) k.step({ throttle: 0, steer: 0 });
    const z0 = k.c.z;
    let back = 0, t30 = -1;
    for (let i = 0; i < 8 / DT; i++) { k.step({ throttle: 1, steer: 0 }); back = Math.min(back, k.c.z - z0); if (t30 < 0 && k.c.speed > 30 * KMH) t30 = i * DT; }
    data.push([m, fmt(-back * 100, 1) + " cm", fmt(t30, 2) + " s"]);
    if (m === "new") check("hill", t30 > 0 && t30 < 3 && -back < 0.1, data[data.length - 1].join(" "));
  }
  table("5. Hill start on 15 %: roll-back, time to 30 km/h", ["", "roll-back", "0-30 km/h"], data);
}
// ---------------------------------------------------------------- 6. kerb 15 cm (the drive grid: a ramp over 1 m) at 20 / 50 km/h, square and at 30 deg
{
  const data = [];
  const kerb = (x, z) => 0.15 * Math.min(1, Math.max(0, z - 20));
  for (const kmh of [10, 20, 50]) for (const ang of [0, 30]) {
    const row = [`${kmh} km/h ${ang}°`];
    for (const m of ["old", "new"]) {
      const A = ang * Math.PI / 180, D = 45;
      const k = car(m, kerb, -Math.sin(A) * D, 20 - Math.cos(A) * D, A);
      let air = 0, vyMax = 0, pMax = 0, rMax = 0, v0 = 0, t = 0;
      const h0 = k.c.heading;
      while (k.c.z < 17 && t < 20) { k.step({ throttle: hold(k, kmh * KMH), steer: 0 }); t += DT; }
      v0 = k.c.speed;
      for (let i = 0; i < 2.5 / DT; i++) {
        k.step({ throttle: hold(k, kmh * KMH), steer: 0 });
        if (k.c.grounded === 0) air += DT;
        vyMax = Math.max(vyMax, k.c.vy); pMax = Math.max(pMax, Math.abs(k.c.pitchV)); rMax = Math.max(rMax, Math.abs(k.c.rollV));
      }
      const over = k.c.z > 21.5 && k.c.y > 0.1;
      row.push(`${over ? "over" : "STOPPED"}, air ${fmt(air, 2)} s, vy ${fmt(vyMax, 2)} m/s, pitch ${fmt(pMax, 2)} / roll ${fmt(rMax, 2)} rad/s, heading ${fmt((k.c.heading - h0) * DEG, 1)}°`);
      if (m === "new") check(`kerb ${kmh} ${ang}`, over && air < 0.15 && Math.abs(k.c.heading - h0) * DEG < 2, row[2]);
    }
    data.push(row);
  }
  table("6. Kerb 15 cm: over?, airtime, body speeds, heading change", ["case", "OLD", "NEW"], data);
}
// ---------------------------------------------------------------- 7. braking distance
{
  const data = [];
  for (const kmh of [50, 100]) {
    const row = [kmh];
    for (const m of ["old", "new"]) {
      const k = car(m); cruise(k, kmh * KMH, 20);
      const z0 = k.c.z; let t = 0;
      while (k.c.speed > 0.1 && t < 10) { k.step({ throttle: -1, steer: 0 }); t += DT; }
      row.push(`${fmt(k.c.z - z0, 1)} m (${fmt(t, 2)} s)`);
    }
    data.push(row);
  }
  table("7. Braking (S held) to a stop", ["from km/h", "OLD", "NEW"], data);
}
// ---------------------------------------------------------------- 7b. handbrake turn at 45 km/h: tail out, recovers?
{
  const data = [];
  for (const m of ["old", "new"]) {
    const k = car(m); cruise(k, 45 * KMH);
    const h0 = k.c.heading;
    let slip = 0;
    for (let i = 0; i < 0.7 / DT; i++) { k.step({ throttle: 0, steer: 1, handbrake: true }); slip = Math.max(slip, Math.abs(k.c.slip)); }
    const turned = (k.c.heading - h0) * DEG;
    let rec = -1;
    for (let i = 0; i < 4 / DT; i++) { k.step({ throttle: 1, steer: 0 }); if (rec < 0 && Math.abs(k.c.slip) < 0.05) rec = i * DT; }
    data.push([m, fmt(turned, 0) + "°", fmt(slip * DEG, 0) + "°", fmt(rec, 2) + " s", fmt(k.c.speed * 3.6, 0) + " km/h"]);
  }
  table("7b. Handbrake + full lock 0.7 s at 45 km/h, then throttle straight", ["", "turned", "max slide", "straight after", "speed 4 s on"], data);
}
// ---------------------------------------------------------------- 8. camera jitter, two routes; old car + old camera vs new + new
// A "bumpy": straight at 40 km/h over 2-3 cm ripples, a pavement crossing (12 cm up and down), two 6 cm speed-table
// edges, a pothole under the left wheels (the suspension's part; slopes: 8c). B "turns": smooth ground, a keyboard slalom, a junction turn
// each way, a hard brake (the steering / pedals' part).
{
  const bumps = (x, z) => 0.025 * Math.sin(x * 2.1) * Math.sin(z * 1.7) + 0.02 * Math.sin(z * 3.3 + x)
    + 0.12 * (Math.min(1, Math.max(0, z - 60)) - Math.min(1, Math.max(0, z - 66)))
    + 0.06 * (Math.min(1, Math.max(0, z - 90)) - Math.min(1, Math.max(0, z - 96)))
    - 0.05 * Math.max(0, 1 - Math.hypot(x - 0.8, z - 130) / 0.6);
  const ROUTES = {
    bumpy: { ground: bumps, T: 18, input: (t, k) => ({ throttle: hold(k, 40 * KMH), steer: 0 }) },
    turns: { ground: flat, T: 22, input: (t, k) => ({
      throttle: t < 15 ? hold(k, 45 * KMH) : t < 17 ? -1 : 1,
      steer: t < 3 ? 0 : t < 9 ? (Math.floor(t / 0.65) % 2 ? 1 : -1) : t < 10.4 ? 1 : t < 12 ? 0 : t < 13.4 ? -1 : 0 }) },
  };
  // (a centred 0.4 s window: what is left is > ~2.5 Hz; a steady swing, ramp or turn leaves nothing)
  const hf = (arr, stride, off) => {
    const N = Math.floor((arr.length - off) / stride), W = 12;
    let sum = 0, n = 0;
    for (let i = W + 30; i < N - W; i++) {
      let m = 0; for (let j = -W; j <= W; j++) m += arr[off + (i + j) * stride];
      sum += (arr[off + i * stride] - m / (2 * W + 1)) ** 2; n++;
    }
    return Math.sqrt(sum / n);
  };
  const res = {};
  for (const [rn, RT] of Object.entries(ROUTES)) {
    const data = [];
    for (const m of ["old", "new"]) {
      const k = car(m, RT.ground);
      const camera = { fov: 60, position: { x: 0, y: 0, z: 0, copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; } }, up: { set() {} }, roll: 0,
        look: { x: 0, y: 0, z: 0 }, lookAt(v) { this.look.x = v.x; this.look.y = v.y; this.look.z = v.z; this.roll = 0; }, rotateZ(a) { this.roll += a; }, updateProjectionMatrix() {} };
      const cam = new ChaseCamera(camera, { addEventListener() {} });
      cam.ctl = m === "new"; CAMERA.mode = "chase"; cam.reset();
      const P = [], Rl = [], Y = [], Pi = [], F = [], B = [];
      let t = 0;
      for (let i = 0; i < RT.T / DT; i++) {
        k.step(RT.input(t, k)); t += DT;
        cam.update(k.c, DT, RT.ground, null);
        // the camera relative to the car (what moves in the picture), the view's yaw / pitch
        P.push(camera.position.x - k.c.x, camera.position.y, camera.position.z - k.c.z);
        const fx = camera.look.x - camera.position.x, fy = camera.look.y - camera.position.y, fz = camera.look.z - camera.position.z;
        Y.push(Math.atan2(fx, fz)); Pi.push(Math.atan2(fy, Math.hypot(fx, fz)));
        Rl.push(camera.roll); F.push(camera.fov);
        const cx = k.c.x - camera.position.x, cz = k.c.z - camera.position.z;
        B.push(Math.atan2(fx * cz - fz * cx, fx * cx + fz * cz));
      }
      // (unwrap the yaw)
      for (let i = 1; i < Y.length; i++) Y[i] = Y[i - 1] + Math.atan2(Math.sin(Y[i] - Y[i - 1]), Math.cos(Y[i] - Y[i - 1]));
      const hfPos = Math.hypot(hf(P, 3, 0), hf(P, 3, 1), hf(P, 3, 2)) * 1000, hfY = hf(P, 3, 1) * 1000;
      const hfYaw = hf(Y, 1, 0) * DEG, hfPitch = hf(Pi, 1, 0) * DEG;
      const roll = Math.max(...Rl.map(Math.abs)) * DEG, fov = Math.max(...F) - Math.min(...F);
      const bs = B.map((b) => b * DEG), bm = bs.reduce((s2, x) => s2 + x, 0) / bs.length, bsd = Math.sqrt(bs.reduce((s2, x) => s2 + (x - bm) ** 2, 0) / bs.length);
      res[rn + m] = { hfPos, hfY, hfYaw, hfPitch };
      data.push([m, fmt(hfPos, 1) + " mm", fmt(hfY, 1) + " mm", fmt(hfYaw, 3) + "°", fmt(hfPitch, 3) + "°", fmt(roll, 2) + "°", fmt(fov, 1) + "°", fmt(bsd, 2) + "°"]);
    }
    table(`8${rn === "bumpy" ? "a" : "b"}. Camera, route "${rn}": high-frequency (> ~2.5 Hz) RMS of the camera's position relative to the car and of the view direction`, ["", "pos HF", "height HF", "view yaw HF", "view pitch HF", "max lean", "fov range", "car bearing sd"], data);
  }
  // 8c. a 12 % street at 40 km/h: the camera's height over the car (steady climb: lag), and on a crest
  {
    const data = [];
    const hill = (x, z) => 0.12 * Math.max(0, Math.min(60, z - 30));
    for (const m of ["old", "new"]) {
      const k = car(m, hill);
      const camera = { fov: 60, position: { x: 0, y: 0, z: 0, copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; } }, up: { set() {} }, look: { x: 0, y: 0, z: 0 }, lookAt(v) { this.look.x = v.x; this.look.y = v.y; this.look.z = v.z; }, rotateZ() {}, updateProjectionMatrix() {} };
      const cam = new ChaseCamera(camera, { addEventListener() {} });
      cam.ctl = m === "new"; cam.reset();
      let flat0 = 0, climb = 0, crestMin = 1e9, crestMax = -1e9, n = 0;
      for (let i = 0; i < 14 / DT; i++) {
        k.step({ throttle: hold(k, 40 * KMH), steer: 0 });
        cam.update(k.c, DT, hill, null);
        const rel = camera.position.y - k.c.y;
        if (k.c.z < 25 && k.c.z > 15) flat0 = rel;
        if (k.c.z > 55 && k.c.z < 80) { climb += rel; n++; }
        if (k.c.z > 88 && k.c.z < 110) { crestMin = Math.min(crestMin, rel); crestMax = Math.max(crestMax, rel); }
      }
      data.push([m, fmt(flat0, 2) + " m", fmt(climb / n, 2) + " m", `${fmt(crestMin, 2)} .. ${fmt(crestMax, 2)} m`]);
    }
    table("8c. Camera height over the car: flat, steady 12 % climb at 40 km/h, over the crest", ["", "flat", "climbing", "crest range"], data);
  }
  const energy = (r) => r.hfPos ** 2;
  check("camera bumpy", energy(res.bumpynew) < energy(res.bumpyold) * 0.25 && res.bumpynew.hfPitch < res.bumpyold.hfPitch * 0.8, JSON.stringify([res.bumpyold, res.bumpynew]));
  check("camera turns", energy(res.turnsnew) < energy(res.turnsold), JSON.stringify([res.turnsold, res.turnsnew]));
  console.log(`
  camera HF energy (pos², new / old): bumpy ${fmt(energy(res.bumpynew) / energy(res.bumpyold) * 100, 0)} %, turns ${fmt(energy(res.turnsnew) / energy(res.turnsold) * 100, 0)} %`);
}
// ---------------------------------------------------------------- 10. trams / trains solid (movers.js -> carEnv.js)
// A fake tram in the tramline.js bodies() format: 32 m along +x (front at fx, back toward -x), 4 m boxes, 2.4 m wide.
{
  const tram = { fx: 16, z: 30, y0: 0, v: 0,
    bodies(x, z, r, out, o = 0) {
      let n = 0;
      for (let k = 0; k < 8; k++) {
        const cx = this.fx - 2 - 4 * k;
        if ((cx - x) ** 2 + (this.z - z) ** 2 > (r + 3) ** 2) continue;
        const q = o + n * 7;
        out[q] = cx; out[q + 1] = this.z; out[q + 2] = Math.PI / 2; out[q + 3] = 1.2; out[q + 4] = (k === 0 || k === 7 ? 1 : -1) * 2.05; out[q + 5] = this.y0 - 0.1; out[q + 6] = 3.4;
        n++;
      }
      return n;
    } };
  const movers = createRailMovers([() => tram]);
  const mk = (x, z, h) => {
    const c = createCtlState(x, z, h), env = createCarEnv({ sets: () => [], ground: flat, handling: HANDLING, feel: true, movers });
    c.y = 0; return { c, env, step: (inp) => stepCtl(c, inp, DT, env) };
  };
  const inside = (c) => Math.abs(c.z - tram.z) < 1.2 + 0.9 && c.x < tram.fx && c.x > tram.fx - 32;
  const data = [];
  // a) 40 km/h head-on into its side
  { tram.fx = 16; tram.y0 = 0; const k = mk(0, 0, 0); let maxZ = -1e9, nan = false;
    for (let i = 0; i < 6 / DT; i++) { k.step({ throttle: 1, steer: 0 }); maxZ = Math.max(maxZ, k.c.z); if (!Number.isFinite(k.c.x + k.c.z + k.c.speed)) nan = true; }
    const gap = tram.z - 1.2 - maxZ;
    data.push(["40+ km/h into its side", `stopped ${fmt(gap, 2)} m from its centre-side (car half 2.15)`, nan ? "NaN" : `speed then ${fmt(k.c.speed * 3.6, 1)} km/h`]);
    check("tram head-on", !nan && gap > 1.9, data[data.length - 1].join(" ")); }
  // b) a car stopped across the track, the tram comes at 8 m/s: pushed out, no explosion
  { tram.fx = -2; const k = mk(3, 30, 0); let vmax = 0;
    for (let i = 0; i < 4 / DT; i++) { tram.fx += 8 * DT; k.step({ throttle: 0, steer: 0 }); vmax = Math.max(vmax, Math.hypot(k.c.speed, k.c.vx, k.c.vz)); }
    data.push(["tram at 29 km/h into a stopped car", inside(k.c) ? "INSIDE the tram" : `pushed to ${fmt(k.c.x, 1)}, ${fmt(k.c.z, 1)}`, `car speed max ${fmt(vmax * 3.6, 1)} km/h`]);
    check("tram push", !inside(k.c) && vmax < 12, data[data.length - 1].join(" ")); }
  // c) a 15 deg scrape along its side at 30 km/h: slides on
  { tram.fx = 40; const k = mk(-20, 25.5, Math.PI / 2 - 0.26); let inS = false;
    for (let i = 0; i < 3 / DT; i++) { k.step({ throttle: k.c.speed < 8.3 ? 1 : 0.3, steer: 0 }); if (inside(k.c)) inS = true; }
    data.push(["30 km/h, 15° scrape along its side", inS ? "went INSIDE" : `slid on, x ${fmt(k.c.x, 1)}`, `speed ${fmt(k.c.speed * 3.6, 1)} km/h`]);
    check("tram scrape", !inS && k.c.x > 0, data[data.length - 1].join(" ")); }
  // d) a train on a bridge 6 m over the road: the car passes under
  { tram.fx = 16; tram.y0 = 6; const k = mk(0, 0, 0);
    for (let i = 0; i < 5 / DT; i++) k.step({ throttle: 1, steer: 0 });
    data.push(["rail bridge 6 m over the road", k.c.z > 40 ? "passes under" : "BLOCKED", ""]);
    check("bridge", k.c.z > 40, ""); tram.y0 = 0; }
  // e) the walker's capsule source
  { tram.fx = 16; const src = railMoverSource(movers); const D = new Float32Array(90); let ns = 0;
    const contacts = { d: D, slot: () => (ns < 10 ? (ns++) * 9 : -1) };
    src.capsule([0, 0.4, 30.5, 0, 1.4, 30.5, 0.3], contacts);
    data.push(["walker capsule inside the tram", ns ? `pushed (${fmt(D[0], 2)}, ${fmt(D[2], 2)}) ${fmt(D[3], 2)} m` : "NO contact", ""]);
    check("walker", ns > 0 && D[2] > 0.9, ""); }
  // cost: the boxes per frame
  { const k = mk(0, 20, 0), t0 = performance.now(); for (let i = 0; i < 20000; i++) k.step({ throttle: 0, steer: 0 }); data.push(["cost: car step next to a tram", fmt((performance.now() - t0) / 20000 * 1000, 1) + " µs / frame", ""]); }
  table("10. Trams / trains solid (fake tram in the tramline.js bodies() format)", ["case", "result", ""], data);
}
// ---------------------------------------------------------------- 9. cost
{
  const data = [];
  for (const m of ["old", "new"]) {
    const k = car(m, (x, z) => 0.03 * Math.sin(x) * Math.sin(z));
    cruise(k, 40 * KMH);
    const N = 20000, t0 = performance.now();
    for (let i = 0; i < N; i++) k.step({ throttle: 0.5, steer: Math.sin(i * 0.01) > 0 ? 1 : -1 });
    data.push([m, fmt((performance.now() - t0) / N * 1000, 1) + " µs"]);
  }
  table("9. Cost per 60 Hz frame (2 substeps, node, synthetic ground)", ["", "step"], data);
}
console.log(fails ? `\n${fails} NEW check(s) failed` : "\nall NEW checks pass");
process.exitCode = fails ? 1 : 0;
