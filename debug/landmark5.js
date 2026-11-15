// LANDMARK CHURCHES ROUND 5: checks for the city's console (or chrome-devtools: await import("/debug/landmark5.js")).
//   l5view([x, y, z], [tx, ty, tz], fov)   freeze the orbit controls and put the camera there (y = m TAW); l5free() undoes it
//   await l5flight("sacrecoeur", { far: 420 * 1.6, near: 12, secs: 12 })   fly far -> near -> far along a straight line at
//      roof height, record every frame's time and the three levels' LOD state; a POP = a level hidden in the same frame its
//      successor appears without both drawn together (as debug/augustinFlight.js)
//   l5cost("sacrecoeur")   renderer.info (draws, triangles) with the model shown vs hidden at the current view
let saved = null;
window.l5view = (p, t, fov = null) => {
  const v = window.viewer;
  if (!saved) { saved = { update: v.controls.update, fov: v.camera.fov }; v.controls.enabled = false; v.controls.update = () => {}; }
  if (fov) { v.camera.fov = fov; v.camera.updateProjectionMatrix(); }
  v.camera.position.set(...p); v.camera.lookAt(...t);
};
window.l5free = () => {
  const v = window.viewer;
  if (!saved) return;
  v.controls.update = saved.update; v.controls.enabled = true; v.camera.fov = saved.fov; v.camera.updateProjectionMatrix(); saved = null;
};
window.l5flight = async (key, { far = 680, near = 12, secs = 12, azimuth = -1.75, height = null } = {}) => {
  const A = window[key], v = window.viewer;
  if (!A) throw new Error(`no window.${key}`);
  const B = A.model.boundsWorld, c = B.getCenter(new (A.root.position.constructor)());
  const half = Math.max(B.max.x - c.x, B.max.z - c.z);
  const y = height ?? B.max.y - 6;
  const dir = { x: Math.cos(azimuth), z: Math.sin(azimuth) };
  const at = (d) => ({ x: c.x + dir.x * (d + half), z: c.z + dir.z * (d + half) });
  const frames = [], states = [];
  let pops = 0, switches = 0, prev = null;
  const was = saved;
  window.l5view([at(far).x, y, at(far).z], [c.x, y - 4, c.z]);
  const run = (d0, d1) => new Promise((done) => {
    const t0 = performance.now(); let last = t0;
    const step = () => {
      const now = performance.now(), t = Math.min(1, (now - t0) / (secs * 1000));
      const d = d0 * Math.pow(d1 / d0, t);
      const p = at(d);
      v.camera.position.set(p.x, y, p.z); v.camera.lookAt(c.x, y - 4, c.z);
      frames.push(now - last); last = now;
      const s = A.state.shown.map((x) => (x ? 1 : 0)).join("");
      if (s !== prev) {
        if (prev) {
          switches++;
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
  if (!was) window.l5free();
  const f = frames.slice(1).sort((a, b) => a - b), q = (p) => +f[Math.floor(p * (f.length - 1))].toFixed(1);
  return { frames: f.length, median: q(0.5), p99: q(0.99), over34: f.filter((x) => x > 34).length, switches, pops, states: states.join(" ") };
};
window.l5cost = async (key) => {
  const A = window[key], r = window.viewer.renderer;
  const sample = async () => {
    await new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(d)));
    const i = r.info.render; return { draws: i.drawCalls ?? i.calls, triangles: i.triangles };
  };
  const on = await sample();
  A.root.visible = false;
  const keep = A.root.onBeforeRender;
  const upd = window.viewer.updaters, idx = upd.length;
  upd.push(() => { A.root.visible = false; });             // the church's own updater shows it every frame: hold it hidden
  const off = await sample();
  upd.splice(idx, 1);
  return { on, off, model: { draws: on.draws - off.draws, triangles: on.triangles - off.triangles }, shown: A.state.shown, d: Math.round(A.state.d) };
};
export {};
