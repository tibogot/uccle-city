// SAINT-AUGUSTIN LOD FLIGHT (paste into the city's console, or evaluate with chrome-devtools): flies the camera from
// `far` m to `near` m from the church's box and back along a straight line at tower height, `secs` seconds each way,
// records every frame's time and the three levels' LOD state (shown flags), and reports the state sequence, the
// visibility switches and whether any hand-over skipped the overlap (a level hidden in the same frame its successor
// appears without both being drawn together = a pop).
//   await augustinFlight({ far: 1200, near: 30, secs: 15 })
window.augustinFlight = async ({ far = 1200, near = 30, secs = 15, azimuth = 2.6 } = {}) => {
  const A = window.augustin, v = window.viewer;
  if (!A) throw new Error("no window.augustin");
  const c = A.model.boundsWorld.getCenter(new (A.root.position.constructor)());
  const half = A.model.boundsWorld.max.x - c.x;
  const dir = { x: Math.cos(azimuth), z: Math.sin(azimuth) };
  const at = (d) => ({ x: c.x + dir.x * (d + half), z: c.z + dir.z * (d + half) });
  const frames = [], states = [];
  let pops = 0, switches = 0, prev = null;
  const run = (d0, d1) => new Promise((done) => {
    const t0 = performance.now(); let last = t0;
    const step = () => {
      const now = performance.now(), t = Math.min(1, (now - t0) / (secs * 1000));
      const d = d0 * Math.pow(d1 / d0, t);              // geometric: as much time near as far
      const p = at(d);
      v.camera.position.set(p.x, 125, p.z); v.controls.target.set(c.x, 125, c.z); v.controls.update();
      frames.push(now - last); last = now;
      const s = A.state.shown.map((x) => (x ? 1 : 0)).join("");
      if (s !== prev) {
        if (prev) {
          switches++;
          // a pop: a level that was shown is gone and no level shown before is still shown (no overlap frame)
          const kept = [...s].some((ch, i) => ch === "1" && prev[i] === "1");
          if (!kept) pops++;
        }
        states.push(`${s}@${Math.round(A.state.d)}`); prev = s;
      }
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  await run(far, near); await run(near, far);
  const f = frames.slice(1).sort((a, b) => a - b), q = (p) => +f[Math.floor(p * (f.length - 1))].toFixed(1);
  return { frames: f.length, median: q(0.5), p99: q(0.99), over34: f.filter((x) => x > 34).length, switches, pops, states: states.join(" ") };
};
