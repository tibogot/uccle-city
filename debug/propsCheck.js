// PROPS BROWSER CHECK (docs/PROPS.md 7): drive the player's car into a prop of a class, scripted.
//   const P = await import("/debug/propsCheck.js"); await P.ram("bin", 50)  -> { class, kmh, before, after, prop: {...} }
// The car is put on a clear 9 m run-up (8 directions tried: no collider but the prop's own on the line), at the speed,
// steering straight (driver.autoInput), then left to coast; returns what happened. P.nearest(cls) lists candidates.
const { gather, itemContact } = await import("../viewer/drive/colliders.js");

export function props(cls, x, z, r = 200) {
  const out = [];
  for (const T of window.__props.tiles.values()) for (const p of T.props) if (p.cls.name === cls && p.state === 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < r * r) out.push(p);
  return out.sort((a, b) => ((a.x - x) ** 2 + (a.z - z) ** 2) - ((b.x - x) ** 2 + (b.z - z) ** 2));
}
/** a clear run-up to p: heading h and start (x, z) `run` m away, the line free of every collider but p's */
export function runUp(p, run = 9) {
  const d = window.__driver, L = [], ct = { nx: 0, nz: 0, depth: 0, kind: 0 };
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, sx = p.x + Math.sin(a) * run, sz = p.z + Math.cos(a) * run, h = a + Math.PI;
    let ok = true;
    for (let s = 0; s <= run - 1.2 && ok; s += 0.5) {
      const x = sx + Math.sin(h) * s, z = sz + Math.cos(h) * s, box = { hx: 0.95, hz: 2.2, cos: Math.cos(h), sin: Math.sin(h) };
      L.length = 0;
      for (const col of d.sets(x, z, 4)) gather(col, x, z, 4, L);
      for (let q = 0; q < L.length && ok; q += 2) {
        const col = L[q], id = L[q + 1], ref = id < col.P ? col.pref?.[id] : col.cref?.[id - col.P];
        if (ref === p.ref || ref?.prop?.cls.type === "light" || col.pkind?.[id] === 1 || col.pkind?.[id] === 8) continue;
        if (itemContact(col, id, x, z, box, ct)) ok = false;
      }
      const g = d.ground(x, z);
      if (!Number.isFinite(g) || Math.abs(g - d.ground(p.x, p.z)) > 0.6) ok = false;
      if (s < run - 3 && d.surface && d.surface(x, z) !== 0) ok = false;                 // (on paving: a street, not a lawn)
    }
    if (ok) return { x: sx, z: sz, h };
  }
  return null;
}
const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
/** ram prop p (or the nearest of class cls) at kmh; brake after `brakeAfter` s */
export async function ram(cls, kmh, { p = null, at = null, from = null, brakeAfter = 1.2, wait = 3.5, after = null, shot = null } = {}) {
  const d = window.__driver, c = d.state;
  p ||= props(cls, at?.[0] ?? c.x, at?.[1] ?? c.z).find((q) => runUp(q));
  if (!p) return { cls, error: "no prop with a clear run-up" };
  const R = from || runUp(p);
  c.x = R.x; c.z = R.z; c.heading = R.h; c.y = d.ground(R.x, R.z); c.speed = kmh / 3.6; c.vx = c.vz = 0; c.angularVel = 0;
  const v0 = c.speed;
  let hitV = null, minV = v0, t0 = performance.now(), maxUp = 0, tHit = null;
  d.autoInput = { throttle: 0.25, steer: 0, handbrake: false };
  const W = d.props;
  while ((performance.now() - t0) / 1000 < wait) {
    await frames(1);
    const t = (performance.now() - t0) / 1000;
    if (p.state && hitV === null) { hitV = c.speed; tHit = t; }
    if (p.slot >= 0) maxUp = Math.max(maxUp, W.py[p.slot] - p.shape.cy - p.y);
    if (tHit !== null && t > tHit + 0.25 && shot && !shot.done) { shot.done = true; await shot.fn(); }
    if (tHit !== null && t > tHit + brakeAfter) d.autoInput = { throttle: -1, steer: 0, handbrake: false };
    minV = Math.min(minV, c.speed);
    if (after !== null && tHit !== null && t > tHit + after) break;          // (mid-flight: a shot)
  }
  if (after !== null) return { cls, kmh, mid: true, carAtHit: hitV && +(hitV * 3.6).toFixed(1), carNow: +(c.speed * 3.6).toFixed(1), p };
  d.autoInput = { throttle: 0, steer: 0, handbrake: false };
  return report(p, cls, kmh, v0, hitV, minV, maxUp);
}
/** what became of prop p */
export function report(p, cls = p.cls.name, kmh = null, v0 = null, hitV = null, minV = null, maxUp = null) {
  const W = window.__driver.props;
  const q = p.d, pos = q >= 0 ? [W.dpos[q * 3], W.dpos[q * 3 + 1], W.dpos[q * 3 + 2]] : [p.x, p.y, p.z];
  const up = q >= 0 ? 1 - 2 * (W.dq[q * 4] ** 2 + W.dq[q * 4 + 2] ** 2) : 1;
  return { cls, kmh, state: p.state, moved: +Math.hypot(pos[0] - p.x, pos[2] - p.z).toFixed(2), tiltDeg: +(Math.acos(Math.max(-1, Math.min(1, up))) * 57.3).toFixed(0), up: maxUp && +maxUp.toFixed(2),
    carBefore: v0 && +(v0 * 3.6).toFixed(1), carAtHit: hitV === null ? null : +(hitV * 3.6).toFixed(1), carMin: minV && +(minV * 3.6).toFixed(1), colliderOff: !!p.ref.hidden,
    walk: p.ref.walk?.map((w) => w[0].off[w[1]]), at: [+p.x.toFixed(1), +p.z.toFixed(1)], stats: { ...W.stats } };
}
