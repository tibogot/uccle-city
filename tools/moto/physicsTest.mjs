// Headless checks of the motorbike physics (viewer/moto/motoPhysics.js) on flat ground and a 10 % hill:
//   node tools/moto/physicsTest.mjs
import { createMotoState, stepMoto, MOTO } from "../../viewer/moto/motoPhysics.js";
const flat = (g = 0) => ({ ground: (x, z) => -z * g, prepare() {}, collide() {}, contacts: 0 });
const run = (c, inp, secs, env = flat(), each) => { for (let t = 0; t < secs; t += 1 / 60) { stepMoto(c, inp, 1 / 60, env); each?.(c, t); } };
const kmh = (c) => +(c.speed * 3.6).toFixed(1);
// 0-100, 0-200, top speed
{ const c = createMotoState(0, 0, 0); let t100 = null, t200 = null, maxW = 0;
  run(c, { throttle: 1 }, 40, flat(), (c, t) => { if (t100 == null && c.speed > 27.78) t100 = t; if (t200 == null && c.speed > 55.56) t200 = t; maxW = Math.max(maxW, c.wheelie); });
  console.log(`0-100 ${t100?.toFixed(2)} s, 0-200 ${t200?.toFixed(2)} s, after 40 s ${kmh(c)} km/h gear ${c.gear} rpm ${c.rpm.toFixed(0)} (max wheelie without Shift ${(maxW * 57.3).toFixed(1)} deg)`); }
// wheelie with Shift
{ const c = createMotoState(0, 0, 0); let maxW = 0, tUp = 0;
  run(c, { throttle: 1, boost: true }, 4, flat(), (c) => { maxW = Math.max(maxW, c.wheelie); if (c.wheelie > 0.05) tUp += 1 / 60; });
  console.log(`Shift+W: max wheelie ${(maxW * 57.3).toFixed(1)} deg, ${tUp.toFixed(2)} s up, ${kmh(c)} km/h`); }
// stoppie from 100 km/h on full front brake
{ const c = createMotoState(0, 0, 0); c.speed = 27.78; let minW = 0, d = 0, z0 = c.z, tStop = 0;
  run(c, { brake: 1 }, 5, flat(), (c, t) => { minW = Math.min(minW, c.wheelie); if (c.speed > 0.1) tStop = t; });
  console.log(`100-0 front: ${(c.z - z0).toFixed(1)} m in ${tStop.toFixed(2)} s, max stoppie ${(-minW * 57.3).toFixed(1)} deg`); }
// a steady corner at 60 km/h: lean, radius
{ const c = createMotoState(0, 0, 0); c.speed = 16.7;
  run(c, { throttle: 0.35, steer: 1 }, 4);
  console.log(`60 km/h full left: lean ${(c.lean * 57.3).toFixed(1)} deg, yaw ${c.angularVel.toFixed(2)} rad/s, radius ${(c.speed / c.angularVel).toFixed(1)} m, speed ${kmh(c)}, crashed ${c.crashed}`); }
// lean-in time at 100 km/h
{ const c = createMotoState(0, 0, 0); c.speed = 27.8; let t30 = null, minSteer = 0;
  run(c, { throttle: 0.4, steer: 1 }, 2, flat(), (c, t) => { if (t30 == null && c.lean > 0.52) t30 = t; minSteer = Math.min(minSteer, c.steerAngle); });
  console.log(`100 km/h: 30 deg lean after ${t30?.toFixed(2)} s, counter-steer ${(minSteer * 57.3).toFixed(1)} deg`); }
// hard brake at full lean -> low-side
{ const c = createMotoState(0, 0, 0); c.speed = 22; run(c, { throttle: 0.3, steer: 1 }, 2); run(c, { brake: 1, steer: 1 }, 1.5);
  console.log(`full lean + full brake: crashed ${c.crashed}, crashes ${c.crashes}`); run(c, {}, 3); console.log(`  after 3 s: crashed ${c.crashed}, respawned ${c.respawned}`); }
// 10 % hill: climb from a standstill, hold on the hill
{ const c = createMotoState(0, 0, Math.PI); run(c, { throttle: 1 }, 5, flat(0.10)); console.log(`10 % climb 5 s: ${kmh(c)} km/h`);
  const d = createMotoState(0, 0, 0); run(d, {}, 3, flat(0.10)); console.log(`parked on a 10 % slope (no input) 3 s: ${kmh(d)} km/h, moved ${d.z.toFixed(2)} m`); }
// walking pace U-turn
{ const c = createMotoState(0, 0, 0); c.speed = 2; run(c, { throttle: 0.15, steer: 1 }, 3); console.log(`walking pace full lock: yaw ${c.angularVel.toFixed(2)} rad/s, radius ${(c.speed / c.angularVel).toFixed(1)} m, lean ${(c.lean * 57.3).toFixed(1)}`); }
// rear brake slide
{ const c = createMotoState(0, 0, 0); c.speed = 15; run(c, { rear: true, steer: 1 }, 1.2); console.log(`rear brake slide 54 km/h: speed ${kmh(c)}, slip ${Math.hypot(c.vx, c.vz).toFixed(2)} m/s, crashed ${c.crashed}`); }
