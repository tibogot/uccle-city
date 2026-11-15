// The falcon against a façade and a roof, old vs new contact response (collisions round 2, docs/COLLISIONS.md):
//   node tools/collide/falconWallTest.mjs          (new)      node tools/collide/falconWallTest.mjs old
// World: a 20 m block for x < 0 (its roof at 20 m), ground at 0. The bird flies level at 10 m (into the façade at an
// angle) or skims the roof at 21 m; hands-off controls. Reported: speed before / after 1 s, stunned, perched (land),
// contacts.
if (process.argv[2] === "old") globalThis.location = { search: "?falconhit=old" };
const { FalconFlight, FlightControls } = await import("../../viewer/falconFlight/flightModel.js");
const air = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };
const world = { floor: (x, z) => (x < 0 ? 20 : 0), ground: () => 0 };
function fly(angleDeg, speed, y, T = 1, x0 = null, gamma = 0) {
  const f = new FalconFlight(), C = new FlightControls();
  // heading: 0 = toward -z, positive = turning left (toward -x); the façade is at x = 0, the bird at x = 4
  const h = angleDeg * Math.PI / 180;
  f.launch(x0 ?? (angleDeg >= 90 ? 6 : 4), y, 0, h, speed, gamma, air);
  let contacts = 0, stunned = false, landed = false;
  for (let i = 0; i < T * 120; i++) {
    f.step(1 / 120, C, air, world);
    if (f.contact) { contacts++; if (f.contact.hard) stunned = true; if (f.contact.land) landed = true; f.contact = null; }
  }
  return { angle: angleDeg, v0: speed, v1: +Math.hypot(f.vel.x, f.vel.y, f.vel.z).toFixed(1), x: +f.pos.x.toFixed(1), y: +f.pos.y.toFixed(1), contacts, stunned, landed };
}
console.log(`--- ${process.argv[2] === "old" ? "old" : "new"}: into the facade at 10 m`);
for (const a of [10, 20, 35, 60, 90]) console.log(JSON.stringify(fly(a, 18, 10)));
console.log("--- skimming the roof (over a 20 m roof, gliding down onto it at -4 deg)");
for (const v of [7, 9, 12, 16]) { const r = fly(0, v, 21, 1.5, -10, -0.07); console.log(JSON.stringify({ ...r, angle: undefined, over: "roof" })); }
