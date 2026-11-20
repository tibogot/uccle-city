// MOTO FEEL, browser turn (docs/MOTO_FEEL.md, rule 40): ride the city's two-wheeler with the KEYBOARD (the very keys:
// driver.keys.down gets KeyW / KeyS / KeyA / KeyD / Space / Shift held and released, nothing else is touched) along the
// traffic lane graph (debug/motoPilot.js lanePath), and log what happened: crashes (+ trigger), top speed, air, landing
// bands, slips, contacts, frame time.
//   const f = await import("/debug/motoFeel.js");
//   await f.ride({ x, z, h, kind: "moto", tile: "F3", meters: 500, kmh: 90, late: false, turn: "straight" })
//   f.hold(["KeyW"], 2000)  // hold keys for ms (then released), returns the log
import { lanePath } from "./motoPilot.js";

const D = () => window.__driver;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = ["KeyW", "KeyS", "KeyA", "KeyD", "Space", "ShiftLeft"];

function logger() {
  const c = D().state, L = { crashes: [], top: 0, airMax: 0, land0: { ...(c.landings || {}) }, slips0: c.slips || 0, hits0: c.hits, frames: 0, ms: 0, worst: 0, crashed: c.crashed };
  let t0 = performance.now(), air = 0;
  L.tick = () => {
    const c = D().state, now = performance.now(), dt = now - t0; t0 = now;
    L.frames++; L.ms += dt; L.worst = Math.max(L.worst, dt);
    L.top = Math.max(L.top, Math.abs(c.speed) * 3.6);
    if (c.air) { air += dt / 1000; L.airMax = Math.max(L.airMax, air); } else air = 0;
    if (c.crashed && !L.crashed) L.crashes.push({ why: c.crashWhy, kmh: Math.round(Math.abs(L.v0 ?? c.speed) * 3.6), x: +c.x.toFixed(1), z: +c.z.toFixed(1) });
    L.crashed = c.crashed; L.v0 = c.speed;
  };
  L.done = () => {
    const c = D().state, l = c.landings || {};
    return { crashes: L.crashes, top: Math.round(L.top), airMax: +L.airMax.toFixed(2), landings: { clean: (l.clean || 0) - (L.land0.clean || 0), sketchy: (l.sketchy || 0) - (L.land0.sketchy || 0), bail: (l.bail || 0) - (L.land0.bail || 0) },
      slips: (c.slips || 0) - L.slips0, contacts: c.hits - L.hits0, fps: Math.round(1000 * L.frames / L.ms), worstMs: Math.round(L.worst), physMs: +D().ms.toFixed(3), at: [+c.x.toFixed(1), +c.z.toFixed(1)] };
  };
  return L;
}
const set = (keys) => { const k = D().keys.down; for (const q of KEYS) k.delete(q); for (const q of keys) k.add(q); };

/** hold keys for ms; returns the log */
export async function hold(keys, ms) {
  const L = logger(), t1 = performance.now() + ms;
  set(keys);
  while (performance.now() < t1) { await new Promise(requestAnimationFrame); L.tick(); }
  set([]);
  return L.done();
}

/** start the vehicle at (x, z, h), moved onto the nearest lane point of `tile` running within 45 deg of h */
export async function start(x, z, h, kind = "moto", tile = null) {
  const G = tile && window.__trafficTiles?.get(tile);
  if (G) {
    let bd = 1e9, b = null;
    for (let p = 0; p < G.paths; p++) for (let k = G.off[p]; k < G.off[p + 1] - 1; k++) {
      const ax = G.xy[2 * k], az = G.xy[2 * k + 1], dx = G.xy[2 * k + 2] - ax, dz = G.xy[2 * k + 3] - az;
      if ((dx * Math.sin(h) + dz * Math.cos(h)) / (Math.hypot(dx, dz) || 1) < 0.7) continue;
      const dd = Math.hypot(ax - x, az - z); if (dd < bd) { bd = dd; b = [ax, az, Math.atan2(dx, dz)]; }
    }
    if (b) [x, z, h] = b;
  }
  D().start(x, z, h, kind); await sleep(1500);
}

/** ride the lane graph from (x, z, h) with the keys: steer = A / D tapped by a sigma-delta at 10 Hz on the lean a pure
 *  pursuit asks; gas / brake held by the target speed (late: braking only in the bend, 30 % faster) */
export async function ride({ x, z, h, kind = "moto", tile, meters = 500, kmh = 80, late = false, turn = "straight", startIt = true, maxS = 90 } = {}) {
  if (startIt) await start(x, z, h, kind, tile);
  const d = D(), c0 = d.state;
  const path = lanePath(c0.x, c0.z, c0.heading, { tile, meters, turn });
  const L = logger();
  let i = 0, acc = 0, key = 0, tick = 0;
  const t1 = performance.now() + maxS * 1000;
  while (performance.now() < t1) {
    await new Promise(requestAnimationFrame); L.tick();
    const c = d.state, v = Math.abs(c.speed);
    if (c.crashed) { set([]); continue; }
    while (i < path.length - 2 && Math.hypot(path[i + 1][0] - c.x, path[i + 1][1] - c.z) < Math.hypot(path[i][0] - c.x, path[i][1] - c.z) + 0.01) i++;
    if (i >= path.length - 3) break;
    const look = 5 + v * 0.5, j = Math.min(path.length - 1, i + Math.round(look / 2));
    let e = Math.atan2(path[j][0] - c.x, path[j][1] - c.z) - c.heading; e = Math.atan2(Math.sin(e), Math.cos(e));
    const Ld = Math.hypot(path[j][0] - c.x, path[j][1] - c.z) || 1, kap = 2 * Math.sin(e) / Ld;
    const lw = Math.atan(v * v * kap / 9.81), s = Math.max(-1, Math.min(1, (lw + 0.8 * (lw - c.lean)) / 0.8 + (v < 5 ? Math.atan(kap * 1.45) / 0.55 : 0)));
    if (late) key = Math.abs(s) > 0.3 ? Math.sign(s) : 0;
    else if ((tick = (tick + 1) % 6) === 0) { acc += s; key = acc > 0.5 ? 1 : acc < -0.5 ? -1 : 0; acc -= key; }
    let turnK = 0;
    for (let k = i; k < Math.min(path.length - 2, i + (late ? Math.ceil((v * v / 16 + 6) / 2) : 25)); k++) {
      const a = Math.atan2(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]), b = Math.atan2(path[k + 2][0] - path[k + 1][0], path[k + 2][1] - path[k + 1][1]);
      turnK = Math.max(turnK, Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) / 2);
    }
    const vt = Math.min(kmh / 3.6 * (late ? 1.3 : 1), Math.sqrt(9.81 * (late ? 0.95 : 0.8) / Math.max(turnK, 1e-3)));
    const k = [];
    if (v < vt - 0.3) k.push("KeyW"); else if (v > vt + 2.5) k.push("KeyS");
    if (key > 0) k.push("KeyA"); else if (key < 0) k.push("KeyD");
    set(k);
  }
  set([]);
  return { points: path.length, ...L.done() };
}

/** a list of rides / holds run one after another in the background: window.__mf = { busy, done: [...] }
 *  item: { name, ride: {...} } or { name, start: [x, z, h, kind, tile], holds: [[keys, ms], ...] } */
export function battery(items) {
  const st = window.__mf = { busy: true, done: [] };
  (async () => {
    for (const it of items) {
      try {
        if (it.ride) st.done.push({ name: it.name, ...(await ride(it.ride)) });
        else {
          await start(...it.start);
          const L = []; for (const [k, ms] of it.holds) L.push(await hold(k, ms));
          const c = D().state;
          st.done.push({ name: it.name, crashes: L.flatMap((l) => l.crashes), top: Math.max(...L.map((l) => l.top)), airMax: Math.max(...L.map((l) => l.airMax)),
            landings: L.reduce((a, l) => ({ clean: a.clean + l.landings.clean, sketchy: a.sketchy + l.landings.sketchy, bail: a.bail + l.landings.bail }), { clean: 0, sketchy: 0, bail: 0 }),
            slips: L.reduce((a, l) => a + l.slips, 0), contacts: L.reduce((a, l) => a + l.contacts, 0), at: [+c.x.toFixed(1), +c.z.toFixed(1)], y: +c.y.toFixed(2) });
        }
      } catch (e) { st.done.push({ name: it.name, err: String(e) }); }
    }
    st.busy = false;
  })();
  return st;
}
