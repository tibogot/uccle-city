// FRONT-GARDEN LOD FLIGHT (gardens round 2, docs/assets/GARDENS.md): moves the camera along a street at walking or
// driving speed and checks, EVERY frame, that each garden instance a LOD's shader band may draw is in that LOD's pool
// (viewer/gardens/gardenKit.js GardenPool: re-gathered every 2 m of travel with a 4 m margin; the hand-over itself is
// the per-pixel dither of viewer/lodFade.js, both LODs drawn across the band, so a pop = an instance whose band is live
// but whose LOD pool does not hold it: it would vanish or appear in one frame).
//   const f = await import("/debug/gardensLodFlight.js"); await f.fly({ path: [[x0, z0], [x1, z1]], speed: 14, height: 1.7 })
// Returns frames, frame times, pools re-gathered, required instance-LODs checked and missing (pops).
export async function fly({ path, speed = 14, height = 1.7, look = 25 } = {}) {
  const v = window.viewer, G = window.__gardens;
  if (!G) throw new Error("no window.__gardens (load with gardens on)");
  const seg = []; let total = 0;
  for (let i = 1; i < path.length; i++) { const L = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push([path[i - 1], path[i], total, L]); total += L; }
  const at = (s) => { for (const [a, b, s0, L] of seg) if (s <= s0 + L) { const f = (s - s0) / L; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } return path[path.length - 1]; };
  const secs = total / speed;
  const frames = []; let checked = 0, missing = 0, gathers = 0, lastGather = G.last.clone(); const worst = [];
  const lims = (band, li, margin = 4) => [[0, band[0] * 1.1 + margin], [band[0] * 0.9 - margin, band[1] * 1.1 + margin], [band[1] * 0.9 - margin, band[2] + margin]][li];
  // what the shader may draw per LOD at distance d (the smoothstep windows of gardenKit.js lodKeep / gardenHedge.js keep)
  const live = (band, li, one) => (one ? [0, band[2]] : [[0, band[0] * 1.1], [band[0] * 0.9, band[1] * 1.1], [band[1] * 0.9, band[2]]][li]);
  return new Promise((done) => {
    const t0 = performance.now(); let tPrev = t0;
    const step = () => {
      const now = performance.now(), t = (now - t0) / 1000;
      frames.push(now - tPrev); tPrev = now;
      // the frame just drawn: camera c (set last step), pools gathered at G.last
      const c = v.camera.position, g = G.last;
      if (g.distanceToSquared(lastGather) > 1e-6) { gathers++; lastGather = g.clone(); }
      for (const p of G.pools) {
        const band = p.piece.band, kind = p.piece.name, one = p.lod.length === 1;
        for (const tile of G.tiles.values()) {
          const a = tile.inst[kind]; if (!a) continue;
          const S = a.length / 24;
          for (let i = 0; i < S; i++) {
            const o = i * 24, hx = a[o] * 0.5, hy = a[o + 1] * 0.5, hz = a[o + 2] * 0.5;
            const x = a[o + 12] + hx, y = a[o + 13] + hy, z = a[o + 14] + hz, half = Math.hypot(hx, hz);
            const dNow = Math.hypot(x - c.x, y - c.y, z - c.z), dG = Math.hypot(x - g.x, y - g.y, z - g.z);
            if (dNow - half > band[2] + 1) continue;
            for (let li = 0; li < p.lod.length; li++) {
              const [l0, l1] = live(band, li, one);
              if (dNow + half < l0 || dNow - half > l1) continue;            // the shader cannot draw it at this LOD now
              checked++;
              const [d0, d1] = lims(band, li);
              const held = !(dG + half < Math.max(0, d0) || dG - half > d1);  // the pool holds it (gathered at g)
              if (!held) { missing++; if (worst.length < 10) worst.push([kind, li, +x.toFixed(1), +z.toFixed(1), +dNow.toFixed(1), +dG.toFixed(1)]); }
            }
          }
        }
      }
      if (t >= secs) {
        const f = frames.slice(1).sort((p, q) => p - q), q = (k) => +f[Math.floor(k * (f.length - 1))].toFixed(1);
        done({ metres: +total.toFixed(0), secs: +secs.toFixed(1), frames: frames.length, median: q(0.5), p99: q(0.99), gathers, checked, missing, worst });
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
