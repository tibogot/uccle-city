// Headless numbers of the round-2 two-wheelers (viewer/moto/motoPhysics.js SCOOTER, VILLO) beside the motorbike's:
//   node tools/moto/physicsTest2.mjs
// The ground is a plane rising toward +z by `g` (the bike rides toward +z: g > 0 = uphill).
import { createMotoState, stepMoto, TWO_WHEELERS, TWO_WHEELERS_OLD } from "../../viewer/moto/motoPhysics.js";
// (the feel round: the default sets; --old = ?moto=old)
const { moto: MOTO, scooter: SCOOTER, villo: VILLO } = process.argv.includes("--old") ? TWO_WHEELERS_OLD : TWO_WHEELERS;
const plane = (g = 0) => ({ ground: (x, z) => z * g, prepare() {}, collide() {}, contacts: 0 });
const run = (c, inp, secs, H, env = plane(), each) => { for (let t = 0; t < secs; t += 1 / 60) { stepMoto(c, inp, 1 / 60, env, H); each?.(c, t); } };
const kmh = (v) => +(v * 3.6).toFixed(1);
for (const [name, H] of [["moto", MOTO], ["scooter", SCOOTER], ["villo", VILLO]]) {
  const out = [];
  { // acceleration, top speed
    const c = createMotoState(0, 0, 0); let t50 = null, t30 = null;
    run(c, { throttle: 1 }, 40, H, plane(), (c, t) => { if (t30 === null && c.speed >= 30 / 3.6) t30 = t; if (t50 === null && c.speed >= 50 / 3.6) t50 = t; });
    out.push(`0-30 ${t30?.toFixed(1)} s, 0-50 ${t50?.toFixed(1) ?? "-"} s, top ${kmh(c.speed)} km/h, rpm ${c.rpm.toFixed(0)}, gear ${c.gear}`);
  }
  if (H.boost > 1) { const c = createMotoState(0, 0, 0); run(c, { throttle: 1, boost: true }, 6, H); out.push(`Shift 6 s: ${kmh(c.speed)} km/h, wheelie ${(c.wheelie * 57.3).toFixed(0)} deg`); }
  { // braking from 40 / 25 km/h
    const v = name === "villo" ? 25 / 3.6 : 50 / 3.6, c = createMotoState(0, 0, 0); c.speed = v; let t = 0, z = 0, st = 0;
    run(c, { brake: 1 }, 6, H, plane(), (c, tt) => { if (c.speed > 0.05 && !t) { z = c.z; st = Math.min(st, c.wheelie); } else if (!t) t = tt; });
    out.push(`front brake from ${kmh(v)}: ${z.toFixed(1)} m, ${t.toFixed(1)} s, stoppie ${(st * 57.3).toFixed(0)} deg`);
  }
  { // full lean at 30 km/h: radius
    const c = createMotoState(0, 0, 0); c.speed = 30 / 3.6; run(c, { throttle: 0.35, steer: 1 }, 3, H);
    out.push(`full lean at ${kmh(c.speed)} km/h: lean ${(c.lean * 57.3).toFixed(0)} deg, radius ${(c.speed / c.angularVel).toFixed(1)} m`);
  }
  { // climbs
    for (const g of [0.05, 0.08, 0.12]) {
      const c = createMotoState(0, 0, 0); c.speed = 3; let pushedAt = null;
      run(c, { throttle: 1 }, 25, H, plane(g), (c, t) => { if (pushedAt === null && c.pushing) pushedAt = t; });
      out.push(`${g * 100} % climb, 25 s: ${kmh(c.speed)} km/h${H.push ? `, pushing ${c.pushing ? `yes (from ${pushedAt.toFixed(1)} s)` : "no"}, cadence ${c.rpm.toFixed(0)} rpm, gear ${c.gear}` : ""}`);
    }
  }
  if (H.push) {
    const c = createMotoState(0, 0, 0); c.speed = 1.2; c.pushing = 1;
    run(c, { throttle: 1 }, 3, H, plane(0.02)); out.push(`pushing onto a 2 % grade: back on the saddle ${c.pushing ? "no" : "yes"}, ${kmh(c.speed)} km/h`);
    const d = createMotoState(0, 0, 0); run(d, {}, 1, H); out.push(`stopped: foot down ${d.footDown.toFixed(2)}`);
    const e = createMotoState(0, 0, 0); run(e, { throttle: 1 }, 4, H); out.push(`cranks after 4 s from a stop: ${(e.crank).toFixed(2)} rad (turning), cadence ${e.rpm.toFixed(0)} rpm, gear ${e.gear}`);
  }
  { // downhill coast 8 %
    const c = createMotoState(0, 0, 0); c.speed = 2; run(c, {}, 20, H, plane(-0.08)); out.push(`coast down 8 % 20 s: ${kmh(c.speed)} km/h`);
  }
  console.log(`--- ${name}\n  ${out.join("\n  ")}`);
}
