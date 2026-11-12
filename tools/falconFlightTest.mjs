// node tools/falconFlightTest.mjs: the falcon flight model's numbers in still air over flat ground (no browser).
// Prints: the glide polar (speed, sink, L/D), the stall speed, the stoop (speed vs drop, terminal), a level turn at
// each bank, the flapping climb, collisions (a landing, a façade, a hard hit). docs/FALCON_FLIGHT.md quotes these.
import { FalconFlight, FlightControls, FALCON, wingAt, polar, G, RHO } from "../viewer/falconFlight/flightModel.js";

const still = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };
const flat = { floor: () => 0 };
const f1 = (x, d = 1) => x.toFixed(d);

// 1. glide polar: equilibrium glide per configuration (CL from the linear part, sink = V * D / L)
console.log("== glide polar (still air, 1.0 kg) ==");
for (const [name, fold] of [["spread", 0], ["half", 0.5], ["tuck", 1]]) {
  const w = wingAt(fold), k = 1 / (Math.PI * 0.85 * w.AR), rows = [];
  let best = null, minSink = null;
  for (let V = 6; V <= 110; V += 1) {
    const q = 0.5 * RHO * V * V, cl = G * FALCON.mass / (q * w.S);
    if (cl > w.clMax) continue;
    const D = q * (FALCON.bodyCDA + (w.cd0 + k * cl * cl) * w.S), LD = G * FALCON.mass / D, sink = V / LD;
    if (!best || LD > best.LD) best = { V, LD, sink };
    if (!minSink || sink < minSink.sink) minSink = { V, LD, sink };
    if ([8, 10, 12, 15, 20, 25, 30, 40, 60].includes(V)) rows.push(`${V}:${f1(sink, 2)}`);
  }
  const vs = Math.sqrt(2 * G * FALCON.mass / (RHO * w.S * w.clMax));
  const vt = Math.sqrt(2 * G * FALCON.mass / (RHO * (FALCON.bodyCDA + w.cd0 * w.S)));
  console.log(`${name.padEnd(6)} S ${w.S} AR ${w.AR}: stall ${f1(vs)} m/s (flare ${f1(Math.sqrt(2 * G / (RHO * w.S * (w.clMax + FALCON.flare.clMax))))}), best glide ${best.V} m/s L/D ${f1(best.LD)}, min sink ${f1(minSink.sink, 2)} m/s at ${minSink.V}, vertical terminal ${f1(vt)} m/s; sink by speed ${rows.join(" ")}`);
}

// 2. hands-off glide: what speed does neutral settle at?
const sim = (setup, ctl, T, every = 1, world = flat) => {
  const b = new FalconFlight(), C = Object.assign(new FlightControls(), ctl);
  setup(b);
  const out = [];
  for (let t = 0, k = 0; t < T; t += 1 / 60, k++) {
    b.step(1 / 60, C, still, world);
    if (k % Math.round(every * 60) === 0) out.push({ t, V: b.V, y: b.pos.y, g: b.gamma * 180 / Math.PI, n: b.n, st: b.stamina, stall: b.stall, c: b.contact });
  }
  return { b, out };
};
console.log("\n== hands off, spread, from 14 m/s level at 300 m ==");
{ const { out } = sim((b) => b.launch(0, 300, 0, 0, 14, 0), {}, 40, 5); console.log(out.map((o) => `t${f1(o.t, 0)} V${f1(o.V)} y${f1(o.y)} g${f1(o.g)}`).join(" | ")); }
console.log("\n== pull hard and hold (the stall), spread, 14 m/s ==");
{ const { out } = sim((b) => b.launch(0, 300, 0, 0, 14, 0), { pitch: 1 }, 12, 0.5); console.log(out.map((o) => `V${f1(o.V)} g${f1(o.g, 0)} n${f1(o.n)} st${f1(o.stall)}`).join(" | ")); }

// 3. the stoop: from rest-ish at altitude, nose straight down, tucked
console.log("\n== stoop: tuck, push to the vertical, from 1500 m at 15 m/s ==");
{
  const { out } = sim((b) => b.launch(0, 1500, 0, 0, 15, -0.3), { pitch: -1, fold: 1 }, 40, 1);
  let marks = [40, 60, 70, 80, 90, 100], s = [];
  for (const o of out) if (marks.length && o.V >= marks[0]) { s.push(`${marks[0]} m/s after ${f1(1500 - o.y, 0)} m drop (${f1(o.t)} s)`); marks.shift(); }
  console.log(s.join("; "), `| after 40 s: ${f1(out.at(-1).V)} m/s`);
}
console.log("== stoop at 45 deg, tuck ==");
{
  const { out } = sim((b) => b.launch(0, 1500, 0, 0, 15, -0.785), { fold: 1 }, 30, 1);
  let marks = [40, 60, 70, 80], s = [];
  for (const o of out) if (marks.length && o.V >= marks[0]) { s.push(`${marks[0]} after ${f1(1500 - o.y, 0)} m`); marks.shift(); }
  console.log(s.join("; "), `| 30 s: ${f1(out.at(-1).V)} m/s, path ${f1(out.at(-1).g)} deg`);
}
console.log("== pull-out from 85 m/s vertical: open to half and pull ==");
{
  const { b, out } = sim((b) => b.launch(0, 1000, 0, 0, 85, -1.5), { pitch: 1, fold: 0.5 }, 6, 0.25);
  console.log(out.map((o) => `t${f1(o.t, 2)} V${f1(o.V)} g${f1(o.g, 0)} n${f1(o.n)} y${f1(o.y, 0)}`).join(" | "));
  void b;
}

// 4. turns: hold a bank, neutral pitch (the path hold asks for 1/cos(bank) g)
console.log("\n== sustained turns at 16 m/s, spread, a few flaps to hold speed ==");
for (const deg of [30, 45, 60, 70, 80]) {
  const { b, out } = sim((b) => b.launch(0, 300, 0, 0, 16, 0), { roll: deg / 80 }, 8, 8);
  const o = out.at(-1);
  const R = b.V * b.V / (G * Math.tan(Math.abs(b.phi)));
  console.log(`bank ${deg}: after 8 s V ${f1(b.V)} n ${f1(b.n, 2)} lost ${f1(300 - b.pos.y)} m, radius ~${f1(R, 0)} m, stall ${f1(b.stall, 2)}`);
  void o;
}
// 5. flapping climb + stamina
console.log("\n== flapping, pull a little: climb and stamina ==");
{ const { out } = sim((b) => b.launch(0, 50, 0, 0, 12, 0), { flap: 1, pitch: 0.25 }, 20, 2); console.log(out.map((o) => `t${f1(o.t, 0)} V${f1(o.V)} y${f1(o.y)} sta${f1(o.st, 2)}`).join(" | ")); }

// 6. collisions
console.log("\n== collisions ==");
{
  const { b, out } = sim((b) => b.launch(0, 3, 0, 0, 10, -0.15), { brake: 1, pitch: 0.4 }, 3, 0.25);
  const c = out.find((o) => o.c)?.c; console.log("soft touch-down:", c ? `vn ${f1(c.vn)} speed ${f1(c.speed)} land ${c.land} hard ${c.hard}` : "none", "end y", f1(b.pos.y));
}
{
  const wallWorld = { floor: (x, z) => (z < -20 ? 15 : 0) };       // a 15 m façade 20 m ahead
  const { b, out } = sim((b) => b.launch(0, 8, 0, 0, 20, 0), {}, 3, 0.1, wallWorld);
  const c = out.find((o) => o.c)?.c; console.log("façade head-on at 20 m/s:", c ? `wall ${c.wall} vn ${f1(c.vn)} hard ${c.hard}` : "none", `then z ${f1(b.pos.z)} y ${f1(b.pos.y)} V ${f1(b.V)} stun ${f1(b.stun, 2)}`);
}
{
  const { b, out } = sim((b) => b.launch(0, 30, 0, 0, 40, -0.6), { fold: 1, pitch: -0.5 }, 3, 0.1);
  const c = out.find((o) => o.c)?.c; console.log("ground at 40 m/s, 35 deg:", c ? `vn ${f1(c.vn)} hard ${c.hard}` : "none", `then y ${f1(b.pos.y)} V ${f1(b.V)} vy ${f1(b.vel.y)}`);
}
console.log("\npolar check alpha 0.1/0.3/0.5 spread:", [0.1, 0.3, 0.5].map((a) => f1(polar(a, wingAt(0)).cl, 2)).join(" "));
