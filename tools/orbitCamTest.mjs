// node tools/orbitCamTest.mjs: the inspection camera's checks without a browser (viewer/orbitCam.js, docs/ORBITCAM.md).
// A small test town: ground at 50 m TAW sloping 5 % along +x, a 20 m block (x 0..20, z -60..-40), a 60 m tower
// (x 100..110, z -60..-50). Mouse events are fed to the controller's handlers; each line prints PASS / FAIL + numbers.
import { InspectControls } from "../viewer/orbitCam.js";

const W = 1000, H = 600;
const ground = (x, z) => 50 + 0.05 * Math.max(0, x - 200);
const roof = (x, z) => (x >= 0 && x <= 20 && z >= -60 && z <= -40 ? 70 : x >= 100 && x <= 110 && z >= -60 && z <= -50 ? 110 : 0);
const field = { ready: () => true, terrain: ground, roof };
const v3 = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
function rig(pos, look) {
  const camera = { fov: 55, aspect: W / H, zoom: 1, position: v3().set(...pos), rotation: { set(x, y, z) { this.x = x; this.y = y; } } };
  const dom = { clientWidth: W, clientHeight: H, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }), addEventListener() {} };
  const target = v3().set(...look);
  const c = new InspectControls(camera, dom, { field, target, keys: { addEventListener() {} } });
  c.update(1 / 60);
  return { c, camera, target };
}
const settle = (c, n = 120) => { for (let i = 0; i < n; i++) c.update(1 / 60); };
/** the NDC of a world point seen by the controller's camera */
function project(c, p) {
  let x = p.x - c.pos.x, y = p.y - c.pos.y, z = p.z - c.pos.z;
  const cy = Math.cos(-c.yaw), sy = Math.sin(-c.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const cb = Math.cos(-c.pitch), sb = Math.sin(-c.pitch);
  [y, z] = [y * cb - z * sb, y * sb + z * cb];
  const ty = Math.tan((55 * Math.PI) / 360), tx = ty * (W / H);
  return [x / -z / tx, y / -z / ty];
}
const toPx = ([nx, ny]) => [((nx + 1) / 2) * W, ((1 - ny) / 2) * H];
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${info}`); };
const f = (n, d = 2) => (+n).toFixed(d);
const ev = (o) => ({ pointerId: 1, pointerType: "mouse", button: 0, preventDefault() {}, ...o });

// 1. picking: the roof of the block under the centre, the ground beside it, the sky = none
{
  const { c } = rig([10, 150, 20], [10, 70, -50]);
  const h = c.pick(W / 2, H / 2);
  check("pick: block roof under the centre", h && Math.abs(h.y - 70) < 0.05 && h.x > -0.1 && h.x < 20.1, h ? `hit ${f(h.x)},${f(h.y)},${f(h.z)} in ${f(c.stats.lastPickMs, 3)} ms` : "no hit");
  const g = c.pick(W / 2, H - 5);
  check("pick: ground near the bottom edge", g && Math.abs(g.y - ground(g.x, g.z)) < 0.05, g ? `y ${f(g.y)}` : "no hit");
  const { c: c2 } = rig([10, 55, 200], [10, 80, 0]);
  check("pick: sky = no hit", !c2.pick(W / 2, 5), "");
  // a long grazing ray (street level, 2 km): timing
  const { c: c3 } = rig([-1000, 52, -50], [1000, 51.5, -50]);
  const t0 = performance.now(); let n = 0; for (let i = 0; i < 100; i++) if (c3.pick(W / 2, H / 2 + 2)) n++;
  check("pick: grazing ray cost", (performance.now() - t0) / 100 < 2, `${f((performance.now() - t0) / 100, 3)} ms a pick, ${n}/100 hits`);
}
// 2. orbit round the point under the cursor: it stays under the cursor; never past the pitch limits
{
  const { c } = rig([60, 120, 80], [10, 70, -50]);
  const at = [700, 380];
  const p = c.pick(...at);
  c._down(ev({ clientX: at[0], clientY: at[1] }));
  for (let i = 1; i <= 20; i++) c._move(ev({ clientX: at[0] + i * 12, clientY: at[1] - i * 3 }));
  c._up(ev({})); settle(c);
  const [px, py] = toPx(project(c, p));
  check("orbit: the pivot stays where it was on screen", Math.hypot(px - at[0], py - at[1]) < 1.5, `pivot at ${f(px, 1)},${f(py, 1)} px (pressed at ${at}); yaw ${f(c.yaw * 57.3, 1)} pitch ${f(c.pitch * 57.3, 1)}`);
  c._down(ev({ clientX: 500, clientY: 300 }));
  for (let i = 1; i <= 60; i++) c._move(ev({ clientX: 500, clientY: 300 + i * 20 }));
  c._up(ev({})); settle(c);
  check("orbit: pitch never past -89 deg (no flip)", c.pitch >= -89.01 * Math.PI / 180, `pitch ${f(c.pitch * 57.3, 2)}`);
  c._down(ev({ clientX: 500, clientY: 300 }));
  for (let i = 1; i <= 60; i++) c._move(ev({ clientX: 500, clientY: 300 - i * 20 }));
  c._up(ev({})); settle(c);
  const gy = c.pos.y - ground(c.pos.x, c.pos.z);
  check("orbit: dragging the other way stays over the ground, pitch <= 30", gy >= 1.19 && c.pitch <= 30.01 * Math.PI / 180, `height over ground ${f(gy)}, pitch ${f(c.pitch * 57.3, 1)}`);
}
// 3. zoom to the cursor: the point stays under the cursor, fine near, fast far, stops at 1 m
{
  const { c } = rig([300, 400, 300], [10, 60, -50]);
  const at = [420, 330], p = c.pick(...at), d0 = Math.hypot(p.x - c.pos.x, p.y - c.pos.y, p.z - c.pos.z);
  c._wheel(ev({ deltaY: -100, deltaMode: 0, clientX: at[0], clientY: at[1] })); settle(c, 90);
  const d1 = Math.hypot(p.x - c.pos.x, p.y - c.pos.y, p.z - c.pos.z), [px, py] = toPx(project(c, p));
  check("zoom: one notch in = a share of the distance, point under the cursor", Math.abs(d1 / d0 - Math.exp(-0.25)) < 0.01 && Math.hypot(px - at[0], py - at[1]) < 1, `${f(d0, 1)} -> ${f(d1, 1)} m (x${f(d1 / d0, 3)}); point at ${f(px, 1)},${f(py, 1)} px`);
  for (let i = 0; i < 60; i++) { c._wheel(ev({ deltaY: -100, deltaMode: 0, clientX: at[0], clientY: at[1] })); c.update(1 / 60); }
  settle(c);
  const d2 = Math.hypot(p.x - c.pos.x, p.y - c.pos.y, p.z - c.pos.z);
  check("zoom: stops before the surface", d2 >= 0.99 && d2 < 2.5 && c.pos.y >= ground(c.pos.x, c.pos.z) + 1.19, `closest ${f(d2)} m, height ${f(c.pos.y - ground(c.pos.x, c.pos.z))} m`);
  for (let i = 0; i < 40; i++) { c._wheel(ev({ deltaY: 100, deltaMode: 0, clientX: 500, clientY: 300 })); c.update(1 / 60); }
  settle(c);
  const d3 = Math.hypot(p.x - c.pos.x, p.y - c.pos.y, p.z - c.pos.z);
  check("zoom: back out to the whole city in 40 notches", d3 > 1000, `${f(d3, 0)} m away, ${c.stats.picks} picks for ${60 + 40 + 1} wheel steps`);
}
// 4. pan along the ground: the grabbed point follows the cursor; streets, not walls
{
  const { c } = rig([-40, 80, 40], [-40, 50, -20]);
  const a = [500, 400], b = [380, 300], p = c.pick(...a);
  c._down(ev({ button: 2, clientX: a[0], clientY: a[1] }));
  for (let i = 1; i <= 10; i++) c._move(ev({ button: 2, clientX: a[0] + ((b[0] - a[0]) * i) / 10, clientY: a[1] + ((b[1] - a[1]) * i) / 10 }));
  c._up(ev({ button: 2 })); settle(c);
  const [px, py] = toPx(project(c, p));
  check("pan: the grabbed ground point ends under the cursor", Math.hypot(px - b[0], py - b[1]) < 1.5, `at ${f(px, 1)},${f(py, 1)} px (cursor ${b})`);
  // street level, walking the camera into the block's wall with a pan: blocked outside it
  const { c: s } = rig([10, 53, -20], [10, 53, -100]);
  for (let i = 0; i < 200; i++) { s._pan.z -= 0.5; s.update(1 / 60); }
  check("pan: a street-level camera stops at the wall", s.pos.z > -40 + 0.5 && s.pos.y < 60, `z ${f(s.pos.z)} (wall at -40), y ${f(s.pos.y)}`);
}
// 5. frame (double-click / F) + an outside jump with glide + RMB fly
{
  const { c } = rig([300, 300, 300], [100, 100, -50]);
  const [tx, ty] = toPx(project(c, { x: 105, y: 110, z: -55 }));
  c.frame(tx, ty); settle(c, 200);
  const d = Math.hypot(105 - c.pos.x, 110 - c.pos.y, -55 - c.pos.z);
  check("frame: flies close to the tower top, looking at it", !c._anim && d < 160 && Math.hypot(...project(c, { x: c.target.x, y: c.target.y, z: c.target.z })) < 0.02, `${f(d, 1)} m from the roof point, target ${f(c.target.x, 1)},${f(c.target.y, 1)},${f(c.target.z, 1)}`);
  c.object.position.set(-500, 200, 0); c.target.set(-500, 50, -100); c.glide = true; c.update(1 / 60); c.glide = false;
  const mid = c.pos.x;
  c.object.position.set(-500, 200, 0); c.target.set(-500, 50, -100); c.update(1 / 60);   // the same placement again: keeps flying
  settle(c, 200);
  check("glide: an outside jump is flown, then lands exactly", mid > -400 && Math.abs(c.pos.x + 500) < 0.01 && Math.abs(c.pos.y - 200) < 0.01, `first frame x ${f(mid, 1)}, end ${c.info().pos}`);
  c.object.position.set(0, 300, 300); c.target.set(0, 50, 0); c.update(1 / 60);
  check("jump: without glide it cuts", Math.abs(c.pos.z - 300) < 0.01, `${c.info().pos}`);
  c._down(ev({ button: 2, clientX: 500, clientY: 300 }));
  c._keys.add("KeyW"); c._fly = true; c._drag.kind = "look";
  const y0 = c.pos.y; settle(c, 120);
  check("fly: RMB + W moves along the view", c.pos.z < 200 && c.pos.y < y0, `pos ${c.info().pos}`);
  c._up(ev({ button: 2 }));
  check("fly: released with the button", !c._fly && c._keys.size === 0, "");
}
// 6. orbitcam2: WASD / QE without the right button (keys fed to the held set as the keydown handler does)
{
  const run = (pos, look, keys, frames = 120, dtf = 1 / 60) => {
    const { c } = rig(pos, look);
    for (const k of keys) c._mkeys.add(k);
    let nan = false, minAgl = Infinity, last = { ...c.pos }, sp = 0;
    for (let i = 0; i < frames; i++) {
      c.update(dtf);
      if (![c.pos.x, c.pos.y, c.pos.z, c.yaw, c.pitch, c.target.x, c.target.y, c.target.z].every(Number.isFinite)) nan = true;
      minAgl = Math.min(minAgl, c.pos.y - ground(c.pos.x, c.pos.z));
      if (i === frames - 1) sp = Math.hypot(c.pos.x - last.x, c.pos.z - last.z) / dtf;
      last = { ...c.pos };
    }
    c._mkeys.clear(); for (let i = 0; i < 90; i++) c.update(1 / 60);
    return { c, nan, minAgl, sp };
  };
  const low = run([-300, 52, 300], [-300, 52, 200], ["KeyW"]), high = run([-300, 250, 300], [-300, 200, 200], ["KeyW"]);
  check("keys: W moves forward on the ground plane, no NaN", !low.nan && !high.nan && low.c.pos.z < 300 - 5 && Math.abs(high.c.pos.y - 250) < 0.01,
    `low z ${f(low.c.pos.z, 1)}, high y ${f(high.c.pos.y)} (looking down 26 deg, no dive)`);
  check("keys: speed scales with the height", high.sp > low.sp * 4 && low.sp >= 7.9, `${f(low.sp, 1)} m/s at 2 m, ${f(high.sp, 1)} m/s at 200 m`);
  const down = run([-300, 80, 300], [-300, 60, 200], ["KeyQ"], 600);
  check("keys: Q / PageDown sinks, never under the ground", !down.nan && down.minAgl >= 1.19 && down.c.pos.y < 52, `lowest ${f(down.minAgl)} m over the ground, end y ${f(down.c.pos.y)}`);
  const up = run([-300, 60, 300], [-300, 60, 200], ["PageUp", "ShiftLeft"], 120);
  check("keys: PageUp + Shift rises fast", up.c.pos.y > 100, `y 60 -> ${f(up.c.pos.y, 1)} in 2 s`);
  const wall = run([10, 53, -20], [10, 53, -100], ["KeyW"], 300);
  check("keys: a street-level walk into the block stops at the wall", !wall.nan && wall.c.pos.z > -40 + 0.5, `z ${f(wall.c.pos.z)} (wall at -40)`);
  const slope = run([150, 52, 0], [400, 60, 0], ["KeyW", "ShiftLeft"], 600);
  check("keys: up the 5 % slope stays over the ground, no NaN", !slope.nan && slope.minAgl >= 1.19, `x ${f(slope.c.pos.x, 0)}, lowest ${f(slope.minAgl)} m`);
  const stop = run([-300, 52, 300], [-300, 52, 200], ["KeyW"], 60);
  const z0 = stop.c.pos.z; for (let i = 0; i < 60; i++) stop.c.update(1 / 60);
  check("keys: released = stops (damped)", Math.abs(stop.c.pos.z - z0) < 0.01, `drift ${f(stop.c.pos.z - z0, 3)} m`);
  const jitter = run([-300, 52, 300], [-300, 52, 200], ["KeyW"], 120, 0.1);
  check("keys: a 10 fps frame rate, no NaN", !jitter.nan && jitter.minAgl >= 1.19, `z ${f(jitter.c.pos.z, 1)}`);
}
console.log(fails ? `${fails} FAILED` : "all passed");
process.exitCode = fails ? 1 : 0;
