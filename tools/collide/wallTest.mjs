// Car / motorbike contact feel, old vs new response (collisions round 2, docs/COLLISIONS.md):
//   node tools/collide/wallTest.mjs
// A straight wall along x = 0 (the car on the +x side), the car driven into it at several angles, full throttle,
// steering kept straight: speed kept after 3 s of scraping, contacts, the largest yaw rate kick, how far the car
// went along the wall, whether it ever got inside the wall (tunnelled), and the head-on bounce.
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";
import { createCarEnv } from "../../viewer/drive/carEnv.js";
import { createCarState, stepCar, HANDLING, BODY, hitLegacy, hitSlide } from "../../viewer/drive/carPhysics.js";

const wall = buildColliders([{ rings: [[[-2, -500], [0, -500], [0, 500], [-2, 500]]], kind: KIND.building }], [], { x0: -100, x1: 100, z0: -600, z1: 600 });
function run(onHit, angleDeg, speed, throttle = 1, T = 3) {
  const env = createCarEnv({ sets: () => [wall], ground: () => 0, handling: HANDLING, onHit, ledges: false });
  // heading: forward = (sin h, cos h); toward -x at angleDeg off the wall's line (+z)
  const h = -angleDeg * Math.PI / 180;
  const c = createCarState(3, 0, h);
  c.speed = speed;
  let contacts = 0, maxYaw = 0, inside = 0, firstHit = -1;
  const dt = 1 / 60;
  for (let i = 0; i < T * 60; i++) {
    stepCar(c, { throttle, steer: 0 }, dt, env);
    contacts += env.contacts;
    if (env.contacts && firstHit < 0) firstHit = i;
    maxYaw = Math.max(maxYaw, Math.abs(c.angularVel));
    if (c.x < BODY.hx - 0.05 && Math.abs(Math.sin(c.heading)) < 0.2) inside++;
  }
  const v = Math.hypot(Math.sin(c.heading) * c.speed + c.vx, Math.cos(c.heading) * c.speed + c.vz);
  return { angle: angleDeg, v0: speed, vEnd: +v.toFixed(1), along: +c.z.toFixed(1), x: +c.x.toFixed(2), contacts, maxYaw: +maxYaw.toFixed(2), heading: +(c.heading * 180 / Math.PI).toFixed(0), inside };
}
for (const [name, f] of [["old", hitLegacy], ["new", hitSlide]]) {
  console.log(`--- ${name}`);
  for (const a of [5, 15, 30, 60, 90]) console.log(JSON.stringify(run(f, a, 15)));
  console.log("head-on 10 m/s, no throttle:", JSON.stringify(run(f, 90, 10, 0, 1.5)));
  console.log("scrape at walking pace 3 m/s, 20 deg:", JSON.stringify(run(f, 20, 3, 0.4)));
}
