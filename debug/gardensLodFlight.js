// FRONT-GARDEN LOD FLIGHT (gardens round 2, docs/assets/GARDENS.md): moves the camera along a street at walking or
// driving speed and checks, EVERY frame, that each garden instance a LOD's shader band may draw is in that LOD's pool
// (viewer/gardens/gardenKit.js GardenPool, streamed by viewer/instanceStream.js: band + 6 m margin round the pool's last
// gather centre, a gather every 2 m, time-sliced; the hand-over itself is the per-pixel dither of viewer/lodFade.js, so
// a pop = an instance whose band is live but whose LOD pool does not hold it: it would vanish or appear in one frame).
// The check itself is debug/driveStutter.js popCheck (any streamed layer).
//   const f = await import("/debug/gardensLodFlight.js"); await f.fly({ path: [[x0, z0], [x1, z1]], speed: 14, height: 1.7 })
// Returns frames, frame times, gathers, required instance-LODs checked and missing (pops), late (a tile landed after the
// pool's last gather: it fades in from 0).
import { popCheck } from "./driveStutter.js";

export async function fly({ path, speed = 14, height = 1.7, look = 25 } = {}) {
  const v = window.viewer, G = window.__gardens;
  if (!G?.streamer) throw new Error("no window.__gardens (load with gardens on)");
  const seg = []; let total = 0;
  for (let i = 1; i < path.length; i++) { const L = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push([path[i - 1], path[i], total, L]); total += L; }
  const at = (s) => { for (const [a, b, s0, L] of seg) if (s <= s0 + L) { const f = (s - s0) / L; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } return path[path.length - 1]; };
  const secs = total / speed, frames = [], acc = {}, g0 = G.streamer.stats.gathers;
  return new Promise((done) => {
    const t0 = performance.now(); let tPrev = t0;
    const step = () => {
      const now = performance.now(), t = (now - t0) / 1000;
      frames.push(now - tPrev); tPrev = now;
      popCheck(v.camera.position, acc, "gardens");
      if (t >= secs) {
        const f = frames.slice(1).sort((p, q) => p - q), q = (k) => +f[Math.floor(k * (f.length - 1))].toFixed(1), r = acc.gardens || {};
        done({ metres: +total.toFixed(0), secs: +secs.toFixed(1), frames: frames.length, median: q(0.5), p99: q(0.99), gathers: G.streamer.stats.gathers - g0, checked: r.checked, missing: r.missing, late: r.late, worst: r.worst });
        return;
      }
      const [x, z] = at(t * speed), [lx, lz] = at(Math.min(total, t * speed + look));
      v.camera.position.set(x, v.hm.surface(x, z) + height, z);
      v.controls.target.set(lx, v.hm.surface(lx, lz) + height * 0.8, lz); v.controls.update();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
