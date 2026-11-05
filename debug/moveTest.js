// Moving-camera smoothness test (with debug/bootProbe.js injected): walk / fly / a scripted orbit glide for N seconds,
// then the frames over 17.5 ms, the long tasks and what three did in the worst frames (debug/renderProbe.js).
//   const m = await import("/debug/moveTest.js"); await m.run({ mode: "walk", seconds: 40 })
// mode: "walk" (W + Shift: 12 m/s at eye height), "fly" (the falcon, flapping now and then), "glide" (the orbit target
// and camera slide `speed` m/s toward `dir` at their height: streaming at any altitude).
export async function run({ mode = "walk", seconds = 40, speed = 40, dir = [1, 0] } = {}) {
  const R = window.__rprobe || (await import("/debug/renderProbe.js")).install(viewer.renderer);
  const P = window.__probe;
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code }));
  const t0 = performance.now();
  let stop = false, flap = null;
  if (mode === "walk") { key("KeyW", true); key("ShiftLeft", true); }
  if (mode === "fly") { let on = false; flap = setInterval(() => { on = !on; key("Space", on); }, 700); }
  if (mode === "glide") {
    const c = viewer.controls, cam = viewer.camera, L = Math.hypot(dir[0], dir[1]);
    let last = performance.now();
    const step = (t) => { if (stop) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; const dx = dir[0] / L * speed * dt, dz = dir[1] / L * speed * dt; c.target.x += dx; c.target.z += dz; cam.position.x += dx; cam.position.z += dz; requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  viewer.resetGpu();
  const gpuMax = [];
  const gi = setInterval(() => { const s = viewer.gpuStats(); if (s.n) gpuMax.push(s.max); viewer.resetGpu(); }, 1000);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  stop = true; clearInterval(gi); if (flap) clearInterval(flap);
  if (mode === "walk") { key("KeyW", false); key("ShiftLeft", false); }
  if (mode === "fly") key("Space", false);
  const from = Math.round(t0);
  const fr = P.allFrames.filter((f) => f[0] >= from);
  const over = fr.filter((f) => f[1] > 17.5), sorted = [...fr].sort((a, b) => b[1] - a[1]);
  const tiles = P.logs.filter((l) => l[0] >= from && /^[+-] tile|main-thread/.test(l[1])).map((l) => `${l[0] - from} ${l[1].slice(0, 110)}`);
  return {
    mode, seconds, frames: fr.length, over17: over.length, over25: fr.filter((f) => f[1] > 25).length, over34: fr.filter((f) => f[1] > 34).length,
    worst: sorted.slice(0, 6).map((f) => [f[0] - from, f[1]]), long: P.long.filter((x) => x[0] >= from).map((x) => [x[0] - from, x[1]]),
    gpuMaxPerSec: gpuMax.map((x) => +x.toFixed(1)), top: R.top(6, from).map((s) => s.slice(0, 260)), tiles,
    cam: viewer.camera.position.toArray().map((v) => Math.round(v)),
  };
}
