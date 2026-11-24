// tools/falconGymTest.mjs: the Falcon Gym's checks (gate row `falcongym`, docs/rules/falcon-gym.md, docs/FALCON_GYM.md).
// Headless: the gym's own controller (viewer/falconGym/gymFlight.js) in the gym's greybox (gymLayout.js), simple
// scripted players at 60 Hz. Plus the files the lab loads (models, the lab page / module) and the v2 model's triangle
// count and clips when it exists.
//   node tools/falconGymTest.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GymFlight, GymControls, GYM } from "../viewer/falconGym/gymFlight.js";
import { makeGymWorld, Y0, LEDGES } from "../viewer/falconGym/gymLayout.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.argv.includes("--quiet");
const out = [], fails = [];
const check = (ok, what, val) => { out.push(`${ok ? "ok  " : "FAIL"} ${what}${val != null ? `: ${val}` : ""}`); if (!ok) fails.push(what); };
const kmh = (v) => (v * 3.6).toFixed(0) + " km/h";
const world = makeGymWorld();
const DT = 1 / 60;
function run(f, C, sec, each) { for (let i = 0; i < sec * 60; i++) { each?.(f, C, i * DT); f.step(DT, C); } }

// 1. level cruise, hands off (open air east of the blocks): 65-90 km/h, holds its height
{
  const f = new GymFlight(world), C = new GymControls();
  f.launchAt(200, Y0 + 80, 150, Math.PI / 2, 14, 0);
  let s = 0, n = 0, y0 = 0;
  run(f, C, 60, (f, C, t) => { if (t > 40) { s += f.V; n++; } if (Math.abs(t - 40) < DT / 2) y0 = f.pos.y; });
  const v = s / n;
  check(v >= 18 && v <= 25, "level cruise hands-off 65-90 km/h", kmh(v));
  check(Math.abs(f.pos.y - y0) < 15, "cruise holds its height (20 s)", `${(f.pos.y - y0).toFixed(1)} m`);
}
// 2. the chase: Space held level: ~110 km/h (100-120)
{
  const f = new GymFlight(world), C = new GymControls(); C.power = 1;
  f.launchAt(200, Y0 + 80, 150, Math.PI / 2, 20, 0);
  run(f, C, 15);
  check(f.V * 3.6 >= 100 && f.V * 3.6 <= 125, "chase speed (Space held, level) ~110 km/h", kmh(f.V));
}
// 3. stoops: from 300 m >= 300 km/h, pulled out with no ground contact; from 1000 m <= 389 km/h (the record)
for (const [h, min, max] of [[300, 300, 389.5], [1000, 330, 389.5]]) {
  const f = new GymFlight(world), C = new GymControls();
  f.launchAt(250, Y0 + h, 250, Math.PI / 4, 15, -0.2);
  C.aimYaw = Math.PI / 4; C.aimPitch = -1.35; C.stoop = 1;
  let minAgl = Infinity, released = false;
  run(f, C, 40, (f, C) => { minAgl = Math.min(minAgl, f.pos.y - Y0); if (!released && f.guarding) { released = true; } if (released) { C.stoop = 0; C.aimPitch = 0; } });
  const top = f.stats.maxV * 3.6;
  check(top >= min && top <= max, `stoop from ${h} m: top speed ${min}-${max} km/h`, top.toFixed(0) + " km/h");
  check(minAgl > 1.5 && f.mode === "fly" && f.stats.stuns === 0 && f.stats.landings === 0, `stoop from ${h} m: pulls out, no ground contact`, `lowest ${minAgl.toFixed(1)} m`);
}
// 4. ground take-off in the 4 m alley (x 60..64, walls 14 / 22 m): the jump + wingbeats, nearly vertical, out over the roofs
{
  const f = new GymFlight(world), C = new GymControls();
  f.placeOnGround(62, Y0, -9, -Math.PI / 2);                 // facing block B's wall, 2 m away
  C.jump = true;
  let maxH = 0, t = 0, vertical = 0;
  run(f, C, 20, (f, C, tt) => { if (f.pos.y - Y0 > maxH) { maxH = f.pos.y - Y0; t = tt; } if (f.mode === "launch" && f.pos.y - Y0 < 14) vertical = Math.max(vertical, Math.hypot(f.vel.x, f.vel.z)); });
  check(maxH > 24 && f.stats.stuns === 0 && f.mode === "fly", "alley (4 m): ground take-off clears the 22 m roofs", `${maxH.toFixed(1)} m in ${t.toFixed(1)} s, ${f.stats.launches} launch`);
  check(vertical <= 2.5, "alley take-off is nearly vertical (horizontal <= 2.5 m/s below the roofs)", `${vertical.toFixed(2)} m/s`);
}
// 5. under the covered passage (3.2 m roof): no room above -> walks / hops out, then launches
{
  const f = new GymFlight(world), C = new GymControls();
  f.placeOnGround(-8, Y0, 38, 0);
  C.jump = true;
  let maxH = 0;
  run(f, C, 25, (f) => { maxH = Math.max(maxH, f.pos.y - Y0); });
  check(f.stats.hops >= 1 && maxH > 5 && f.mode === "fly" && f.stats.stuns === 0, "covered passage: hops / walks out, then takes off", `${f.stats.hops} hop(s), ${maxH.toFixed(1)} m`);
}
// 6. a 15 deg graze along block A's west wall at 30 m/s: slides, no tumble (look-ahead off so it really touches; on: no tumble either)
for (const avoid of [false, true]) {
  const f = new GymFlight(world), C = new GymControls();
  if (!avoid) f.lookAhead = () => { f.avoid.yaw = 0; f.avoid.pitch = 0; };
  const a = 15 * Math.PI / 180, hd = Math.atan2(-Math.sin(a), Math.cos(a));   // toward +x and -z
  f.launchAt(26, Y0 + 6, 15, hd, 30, 0); C.aimYaw = hd; C.aimPitch = 0; C.power = 1;
  run(f, C, 3);
  check(f.stats.stuns === 0 && (avoid || f.stats.wallTouches > 0), `15 deg wall graze at 30 m/s (look-ahead ${avoid ? "on" : "off"}): no tumble`, `${f.stats.wallTouches} touches, ${f.stats.stuns} tumbles, ${kmh(f.V)} after`);
}
// 7. landing with the flare on the tower's balcony (E), then a launch off the edge
{
  const f = new GymFlight(world), C = new GymControls();
  f.launchAt(-2, Y0 + 66, -40, 0, 14, -0.08);
  let asked = false;
  run(f, C, 12, (f, C) => { if (!asked && f.pos.z < -60) { C.land = true; asked = true; } if (f.mode === "fly") { C.aimYaw = Math.atan2(-(-2 - f.pos.x), -(-82 - f.pos.z)); C.aimPitch = -0.1; C.brake = f.pos.z < -55 ? 0.6 : 0; } });
  const on = f.mode === "ground" && f.feetY > Y0 + 60;
  check(on, "lands on the tower (E, the flare)", `${f.mode} at ${(f.feetY - Y0).toFixed(1)} m`);
  const C2 = new GymControls(); C2.jump = true;
  run(f, C2, 6);
  check(f.mode === "fly" && f.stats.stuns === 0, "launches off the tower ledge", `${f.mode}, ${kmh(f.V)}`);
}
// 8. the ceiling: Space held climbing from 200 m stays under ~1200 m; and the gym has ledges to perch on
{
  const f = new GymFlight(world), C = new GymControls(); C.power = 1; C.aimYaw = 0; C.aimPitch = 0.5;
  f.launchAt(250, Y0 + 200, 250, 0, 15, 0); f.P.stamina = { ...GYM.stamina, power: 0 };
  run(f, C, 240, (f, C) => { C.aimYaw = f.heading + 0.3; });
  check(f.pos.y - Y0 > 600 && f.pos.y - Y0 < 1250, "climbs to several hundred metres, ceiling ~1200 m", `${(f.pos.y - Y0).toFixed(0)} m after 4 min of Space`);
  check(LEDGES.length > 60, "the greybox has ledges / sills / railings to perch on", LEDGES.length);
}
// 9. the files the lab needs
for (const p of ["labs/falcon-gym.html", "labs/falcon-gym.js", "models/bird/peregrine.glb", "models/bird/juvenile.jpg"]) check(fs.existsSync(path.join(ROOT, p)), `file ${p}`);
const html = fs.existsSync(path.join(ROOT, "labs/falcon-gym.html")) ? fs.readFileSync(path.join(ROOT, "labs/falcon-gym.html"), "utf8") : "";
const js = fs.existsSync(path.join(ROOT, "labs/falcon-gym.js")) ? fs.readFileSync(path.join(ROOT, "labs/falcon-gym.js"), "utf8") : "";
check(js.includes("panelUI.js") && !/lil-gui/i.test(html + js), "own UI only (viewer/panelUI.js, no lil-gui)");
// the v2 model (when built): triangles and clips from the glb's JSON
const v2 = path.join(ROOT, "models/bird/v2/falcon_v2.glb");
if (fs.existsSync(v2)) {
  const b = fs.readFileSync(v2), len = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + len).toString());
  const tris = (j.meshes || []).reduce((s, m) => s + m.primitives.reduce((q, p) => q + (p.indices != null ? j.accessors[p.indices].count / 3 : 0), 0), 0);
  const clips = (j.animations || []).map((a) => a.name);
  check(tris >= 8000 && tris <= 30000, "v2 falcon: triangles 8k-30k", tris);
  for (const c of ["Flap", "Glide", "Idle", "Walk", "Hop", "TakeOff", "Land", "Stoop", "Talons", "Perch"]) check(clips.includes(c), `v2 falcon clip ${c}`);
} else out.push("note models/bird/v2/falcon_v2.glb not built yet (the owner's Sketchfab files): v2 checks skipped");

if (!quiet || fails.length) console.log(out.join("\n"));
console.log(fails.length ? `falcongym: ${fails.length} FAIL` : `falcongym: all ${out.filter((s) => s.startsWith("ok")).length} checks ok`);
process.exit(fails.length ? 1 : 0);
