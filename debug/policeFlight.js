// City flight over the police station's LOD hand-overs (?police=1, after window.police is set; after
// debug/wolvendaelFlight.js):
//   const f = await import("/debug/policeFlight.js"); await f.run({ seconds: 24 }); await f.bench()
// The camera flies from 900 m out (north-east, over Rue Rouge and the Wolvendael park) to 40 m, orbits the street
// fronts and flies back out, at a steady pace; every frame records the frame time, the LOD state (window.police.levels'
// visibility + userData.fade, the patrol cars' levels too) and the material each level draws with (its own opaque one,
// or lodFade's fading copy). Checks:
//   - coverage: the pixel share drawn by the shown levels (fade f in 0..1 = f, in 2..3 = 3 - f, 1 or 2 = 1); 1.00 in
//     every frame = no hole and no double layer = no pop (the cars: <= 1, they fade out for good past 300 m);
//   - copies: a level draws its fading copies ONLY while its fade is strictly inside a band;
//   - frame times (median, p99, > 25 / > 34 ms) and long tasks during the flight (a shader built on a hand-over shows).
export async function run({ seconds = 24, near = 40, far = 900, height = 14 } = {}) {
  const th = window.police, v = window.viewer;
  if (!th) throw new Error("no window.police (?police=1, wait for the model)");
  const c = th.model.boundsWorld.getCenter(new (v.camera.position.constructor)());
  const R = -0.586032, ux = Math.cos(R), uz = Math.sin(R);             // the street side (building frame u+) in city x, z
  const long = [];
  let obs = null;
  try { obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push([Math.round(e.startTime), Math.round(e.duration)]); }); obs.observe({ type: "longtask" }); } catch { /* none */ }
  const frames = [], at = [], states = [];
  const share = (f) => (f <= 1 ? f : 3 - f);
  const t0 = performance.now();
  let last = t0, bad = 0, badCopies = 0, worstCov = 1, carBad = 0;
  const pose = (t) => {             // t 0..1: 0-0.4 approach, 0.4-0.6 orbit, 0.6-1 leave
    let d, a = -0.5;
    if (t < 0.4) d = far * Math.pow(near / far, t / 0.4);
    else if (t < 0.6) { d = near; a = -0.5 + ((t - 0.4) / 0.2) * Math.PI * 0.8; }
    else { d = near * Math.pow(far / near, (t - 0.6) / 0.4); a = -0.5 + Math.PI * 0.8; }
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
      const shown = th.levels.map((g) => g.visible);
      const fades = th.levels.map((g) => g.children[0]?.userData.fade ?? 1);
      const cov = shown.reduce((s, on, k) => s + (on ? share(fades[k]) : 0), 0);
      if (th.root.visible && Math.abs(cov - 1) > 1e-3) { bad++; worstCov = Math.abs(cov - 1) > Math.abs(worstCov - 1) ? cov : worstCov; }
      th.levels.forEach((g, k) => {
        if (!g.visible) return;
        const whole = fades[k] === 1 || fades[k] === 2;
        for (const o of g.children) if ((o.material !== o.userData.base) === whole) badCopies++;
      });
      if (th.cars?.group.visible) {
        const cs = th.cars.state, cc = cs.shown.reduce((s, on, k) => s + (on ? share(cs.fades[k]) : 0), 0);
        if (cc > 1 + 1e-3 || (cs.d < 250 && Math.abs(cc - 1) > 1e-3)) carBad++;
      }
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
    coverageBadFrames: bad, worstCoverage: +worstCov.toFixed(3), wrongMaterialFrames: badCopies, carCoverageBadFrames: carBad,
    slowFrames: frames.map((ms, i) => [at[i], +ms.toFixed(1)]).slice(5).filter(([, ms]) => ms > 25),
    states, longTasks: long.filter(([tt]) => tt >= t0),
  };
}

/** GPU ms (median of the whole frame, viewer.gpuStats) at the current view, interleaved windows: the station (+ yard +
 *  cars) off / on. + = its cost. NOISY when another WebGPU tab runs on the same GPU. */
export async function bench({ cycles = 4, win = 1500 } = {}) {
  const th = window.police, v = window.viewer, st = th.state;
  const modes = [false, true];
  const acc = modes.map(() => []);
  for (let c = 0; c < cycles; c++) for (let i = 0; i < modes.length; i++) {
    st.on = modes[i]; st.yardOn = modes[i]; st.carsOn = modes[i];
    await new Promise((r) => setTimeout(r, 400));
    v.resetGpu();
    await new Promise((r) => setTimeout(r, win));
    acc[i].push(v.gpuStats().p50);
  }
  st.on = st.yardOn = st.carsOn = true;
  const med = acc.map((a) => { a = [...a].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; });
  return { none: +med[0].toFixed(2), police: +(med[1] - med[0]).toFixed(2), d: Math.round(th.state.d) };
}
