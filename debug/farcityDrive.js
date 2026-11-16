// FAR CITY drive (docs/FARCITY.md): the orbit target (it drives the tile streaming) moved along a line at `speed` m/s,
// the camera `back` m behind and `up` m over it, so far tiles turn full ahead of it (far -> full hand-overs while
// moving). Not awaited: d = (await import("/debug/farcityDrive.js")).drive({...}); d.log = the tile swaps (time, what);
// d.done when it ends; d.stop().
export function drive({ from = [1102, 542], to = [1100, 2300], speed = 20, up = 40, back = 70, look = 0 } = {}) {
  const c = viewer.controls, cam = viewer.camera, W = viewer.world;
  const dx = to[0] - from[0], dz = to[1] - from[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const st = () => ({ full: new Set(W.tiles.map((t) => t.name)), far: new Set(viewer.lite.keys()) });
  let last = st(), stop = false;
  const t0 = performance.now(), d = { log: [], done: false, pos: null, frames: 0, slow: [], stop: () => { stop = true; } };
  let prev = t0;
  const step = (now) => {
    const t = (now - t0) / 1000, s = Math.min(L, t * speed);
    const x = from[0] + ux * s, z = from[1] + uz * s;
    const g = W.surface(x, z), gy = Number.isFinite(g) ? g : 80;
    // look > 0: the camera at (x, z) looking `look` m ahead (the target, which leads the streaming, ahead too)
    if (look) { const tg = W.surface(x + ux * look, z + uz * look); c.target.set(x + ux * look, Number.isFinite(tg) ? tg : gy, z + uz * look); cam.position.set(x, gy + up, z); }
    else { c.target.set(x, gy, z); cam.position.set(x - ux * back, gy + up, z - uz * back); }
    c.update?.();
    d.pos = [Math.round(x), Math.round(z)]; d.frames++;
    if (now - prev > 50) d.slow.push([+t.toFixed(1), Math.round(now - prev)]);
    prev = now;
    const n = st();
    for (const k of n.full) if (!last.full.has(k)) d.log.push([+t.toFixed(1), "full+", k, n.far.has(k) ? "far still there" : "far gone"]);
    for (const k of last.full) if (!n.full.has(k)) d.log.push([+t.toFixed(1), "full-", k]);
    for (const k of last.far) if (!n.far.has(k)) d.log.push([+t.toFixed(1), "far-", k, n.full.has(k) ? "full there" : "no full"]);
    for (const k of n.far) if (!last.far.has(k)) d.log.push([+t.toFixed(1), "far+", k]);
    last = n;
    if (stop || s >= L) { d.done = true; return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return d;
}
