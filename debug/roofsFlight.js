// roofs (docs/assets/ROOFS.md): the LOD hand-over check from the AIR. The camera flies a fixed path at falcon height
// (default 45 m over the ground, 20 m/s, rAF-timed: slow frames make bigger steps), looking ahead and down; every frame
// debug/driveStutter.js popCheck tests that every roof-kit instance a LOD's shader band may draw is in that LOD's pool
// (missing = a pop). Also reports the roofs streamer's per-frame cost.
//   const F = await import("/debug/roofsFlight.js"); await F.run()            (Saint-Job, I6)
//   await F.run({ pts: [[x, z], ...], height: 60, speed: 25 })
import { popCheck } from "./driveStutter.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const PATHS = {
  stjob: [[900, 700], [1150, 540], [1300, 650], [1150, 820], [960, 600]],
};

export async function run({ pts = PATHS.stjob, height = 45, speed = 20, only = "roofs", settle = 4 } = {}) {
  const V = window.viewer, c = V.controls, cam = V.camera, w = V.world;
  V.setView("overview");
  const upd = c.update; c.update = () => false;
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([L, d, i]); L += d; }
  const at = (d) => { for (const [s0, d0, i] of seg) if (d <= s0 + d0) { const f = (d - s0) / d0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; } return pts[pts.length - 1]; };
  const place = (d) => {
    const [x, z] = at(d), [lx, lz] = at(Math.min(L, d + 40));
    const y = w.surface(x, z) + height;
    cam.position.set(x, y, z); c.target.set(lx, w.surface(lx, lz) + 2, lz); cam.lookAt(c.target);
  };
  const acc = {}, st = (globalThis.__streamers || []).find((s) => s.name === only);
  const s0 = st ? { ...st.stats } : null;
  const frames = [];
  try {
    const t0 = performance.now();
    while (performance.now() - t0 < settle * 1000) { place(0); await sleep(100); }
    await new Promise((res) => {
      const start = performance.now(); let last = start;
      const step = (now) => {
        frames.push(now - last); last = now;
        const d = Math.min(L, (now - start) / 1000 * speed);
        place(d);
        popCheck(cam.position, acc, only);
        if (d >= L) return res();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  } finally { c.update = upd; }
  const s = frames.slice(1).sort((a, b) => a - b), q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
  return { metres: Math.round(L), height, speed, frames: s.length, ms: { p50: q(0.5), p95: q(0.95), max: q(1) }, pops: acc[only],
    stream: st ? { gathers: st.stats.gathers - s0.gathers, forced: st.stats.forced - s0.forced, maxSliceMs: +st.stats.maxSliceMs.toFixed(2) } : null };
}
