// City flight over the Château de Wolvendael's LOD hand-overs and its pond (?wolvendael=1, after window.wolvendael is set;
// after debug/townhallFlight.js):
//   const f = await import("/debug/wolvendaelFlight.js"); await f.run({ seconds: 24 }); await f.bench()
// The camera flies from 900 m out (north-north-west, over the park and the pond) to 45 m, orbits the pond front and
// flies back out, at a steady pace; every frame records the frame time, the LOD state (window.townhall.levels' visibility + userData.fade) and the
// material each level draws with (its own opaque one, or lodFade's fading copy). Checks:
//   - coverage: the pixel share drawn by the shown levels (fade f in 0..1 = f, in 2..3 = 3 - f, 1 or 2 = 1); 1.00 in
//     every frame = no hole and no double layer = no pop;
//   - copies: a level draws its fading copies ONLY while its fade is strictly inside a band;
//   - frame times (median, p99, > 25 / > 34 ms) and long tasks during the flight (a shader built on a hand-over shows).
export async function run({ seconds = 24, near = 45, far = 900, height = 18 } = {}) {
  const th = window.wolvendael, v = window.viewer;
  if (!th) throw new Error("no window.wolvendael (?wolvendael=1, wait for the model)");
  const c = th.model.boundsWorld.getCenter(new (v.camera.position.constructor)());
  const R = -0.585885, ux = -Math.sin(R) * -1, uz = Math.cos(R) * -1;      // the pond side (building frame w-) in city x, z
  const long = [];
  let obs = null;
  try { obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push([Math.round(e.startTime), Math.round(e.duration)]); }); obs.observe({ type: "longtask" }); } catch { /* none */ }
  const frames = [], at = [], states = [], pond = [];
  const share = (f) => (f <= 1 ? f : 3 - f);
  const t0 = performance.now();
  let last = t0, bad = 0, badCopies = 0, worstCov = 1;
  const pose = (t) => {             // t 0..1: 0-0.4 approach, 0.4-0.6 orbit, 0.6-1 leave
    let d, a = 0;
    if (t < 0.4) d = far * Math.pow(near / far, t / 0.4);
    else if (t < 0.6) { d = near; a = ((t - 0.4) / 0.2) * Math.PI * 0.9; }
    else { d = near * Math.pow(far / near, (t - 0.6) / 0.4); a = Math.PI * 0.9; }
    const dirx = ux * Math.cos(a) - uz * Math.sin(a), dirz = uz * Math.cos(a) + ux * Math.sin(a);
    return [c.x + dirx * d, c.y + height + d * 0.12, c.z + dirz * d];
  };
  await new Promise((resolve) => {
    const step = (now) => {
      const t = (now - t0) / (seconds * 1000);
      if (t >= 1) return resolve();
      frames.push(now - last); at.push(Math.round(now - t0)); last = now;
      const p = pose(t);
      v.camera.position.set(p[0], p[1], p[2]); v.controls.target.copy(c); v.camera.lookAt(c);
      // the state the PREVIOUS frame rendered with (the updaters ran before it)
      const shown = th.levels.map((g) => g.visible);
      const fades = th.levels.map((g) => g.children[0]?.userData.fade ?? 1);
      const cov = shown.reduce((s, on, k) => s + (on ? share(fades[k]) : 0), 0);
      if (th.root.visible && Math.abs(cov - 1) > 1e-3) { bad++; worstCov = Math.abs(cov - 1) > Math.abs(worstCov - 1) ? cov : worstCov; }
      th.levels.forEach((g, k) => {
        if (!g.visible) return;
        const whole = fades[k] === 1 || fades[k] === 2;
        for (const o of g.children) if ((o.material !== o.userData.base) === whole) badCopies++;
      });
      pond.push([th.pond.stats.refl, th.pond.stats.reflMs]);
      const key = shown.map((s) => (s ? 1 : 0)).join("");
      if (!states.length || states[states.length - 1][1] !== key) states.push([Math.round(now - t0), key, Math.round(th.model.distance(v.camera.position))]);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  obs?.disconnect();
  const s = frames.slice(5).sort((a, b) => a - b), q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
  return {
    seconds, frames: frames.length, median: q(0.5), p99: q(0.99), worst: +s[s.length - 1].toFixed(1),
    over25: s.filter((x) => x > 25).length, over34: s.filter((x) => x > 34).length,
    coverageBadFrames: bad, worstCoverage: +worstCov.toFixed(3), wrongMaterialFrames: badCopies,
    slowFrames: frames.map((ms, i) => [at[i], +ms.toFixed(1)]).slice(5).filter(([, ms]) => ms > 25),
    states, longTasks: long.filter(([t]) => t >= t0),
    pondReflectionFrames: pond.filter(([k]) => k > 0).length, pondReflectionCpuMs: +(pond.filter(([k]) => k > 0).reduce((a, [, ms]) => a + ms, 0) / Math.max(1, pond.filter(([k]) => k > 0).length)).toFixed(2),
  };
}

/** GPU ms (median of the whole frame, viewer.gpuStats) at the current view, interleaved windows: château on / off with
 *  the pond off, then pond on / off with the château on. + = the part's cost. */
export async function bench({ cycles = 4, win = 1500 } = {}) {
  const th = window.wolvendael, v = window.viewer, st = th.state;
  const modes = [[false, false], [true, false], [true, true]];      // [château, pond]
  const acc = modes.map(() => []);
  for (let c = 0; c < cycles; c++) for (let i = 0; i < modes.length; i++) {
    st.chateauOn = modes[i][0]; st.pondOn = modes[i][1];
    await new Promise((r) => setTimeout(r, 400));
    v.resetGpu();
    await new Promise((r) => setTimeout(r, win));
    acc[i].push(v.gpuStats().p50);
  }
  st.chateauOn = true; st.pondOn = true;
  const med = acc.map((a) => { a = [...a].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; });
  return { none: +med[0].toFixed(2), chateau: +(med[1] - med[0]).toFixed(2), pond: +(med[2] - med[1]).toFixed(2), reflCpuMs: +th.pond.stats.reflMs.toFixed(2), d: Math.round(th.state.d) };
}
