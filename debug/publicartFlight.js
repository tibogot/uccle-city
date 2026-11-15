// PUBLIC ART LOD FLIGHT (paste into the city's console, or evaluate with chrome-devtools; docs/publicart/PUBLIC_ART_KIT.md):
// flies the camera from `far` m to `near` m from a piece's box and back (geometric: as long near as far), `secs` each
// way, `height` m over its ground, recording every frame's time and the piece's three levels' shown flags; reports the
// state sequence, the switches and the pops (a level hidden in the same frame its successor appears, no overlap frame).
//   await publicartFlight("monolithes", { far: 1000, near: 15, secs: 14 })
window.publicartFlight = async (id = "monolithes", { far = 1000, near = 15, secs = 14, azimuth = 0.7, height = 6 } = {}) => {
  const L = window.publicArt?.landmarks.find((l) => l.p.id === id), v = window.viewer;
  if (!L) throw new Error(`no public art landmark ${id}`);
  const c = L.box.getCenter(L.root.position.clone()), half = (L.box.max.x - L.box.min.x) / 2;
  const at = (d) => ({ x: c.x + Math.cos(azimuth) * (d + half), z: c.z + Math.sin(azimuth) * (d + half) });
  const frames = [], states = [];
  let pops = 0, switches = 0, prev = null;
  const run = (d0, d1) => new Promise((done) => {
    const t0 = performance.now(); let last = t0;
    const step = () => {
      const now = performance.now(), t = Math.min(1, (now - t0) / (secs * 1000));
      const p = at(d0 * Math.pow(d1 / d0, t));
      v.camera.position.set(p.x, L.box.min.y + height, p.z); v.controls.target.set(c.x, L.box.min.y + 2, c.z); v.controls.update();
      frames.push(now - last); last = now;
      const s = (L.state.shown || [false, false, false]).map((x) => (x ? 1 : 0)).join("");
      if (s !== prev) {
        if (prev) { switches++; if (![...s].some((ch, i) => ch === "1" && prev[i] === "1") && s !== "000" && prev !== "000") pops++; }
        states.push(`${s}@${Math.round(L.state.d)}`); prev = s;
      }
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  await run(far, near); await run(near, far);
  const f = frames.slice(1).sort((a, b) => a - b), q = (p) => +f[Math.floor(p * (f.length - 1))].toFixed(1);
  return { frames: f.length, median: q(0.5), p99: q(0.99), switches, pops, states: states.join(" ") };
};
