// trafpark (docs/TRAFPARK.md): watch the running traffic for a while and count every sample where a traffic car's body
// stands into a parked car's box (> 5 cm), as tools/trafParkSimTest.mjs does in node. Page console / devtools:
//   const W = await import("/debug/trafparkWatch.js"); await W.watch(45)   // seconds
// -> { secs, samples, cars (max alive), into, parkedHit, maxDepth, worst: [{ x, z, depth, state }], stats, stepMs }
export async function watch(secs = 45, every = 250) {
  const T = window.__traffic, sim = T?.sim;
  if (!sim) return { error: "no traffic (?with=traffic)" };
  const W = (c) => sim.parkWL ? sim.parkWL(c) : [1.85, 4.73];
  let samples = 0, into = 0, maxD = 0, maxCars = 0;
  const hit = new Map(), worst = [];
  const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    // grid of the parked cars drawn now
    const grid = new Map(), gk = (x, z) => (Math.floor(x / 8) + 4096) * 8192 + Math.floor(z / 8) + 4096;
    for (const c of sim.parked ? sim.parked() : []) { if (c.hidden) continue; const k = gk(c.x, c.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c); }
    let alive = 0;
    for (let i = 0; i < sim.cap; i++) {
      if (!sim.alive[i]) continue;
      alive++; samples++;
      const ty = sim.types[sim.type[i]], hw = (ty.w ?? 1.8) / 2, hl = ty.len / 2, yw = sim.yaw[i], fx = Math.sin(yw), fz = Math.cos(yw);
      if (ty.two) continue;
      let worstD = 0, who = null;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const c of grid.get(gk(sim.x[i] + di * 8, sim.z[i] + dj * 8)) || []) {
        if (c === sim.slot[i]) continue;
        const [w, l] = W(c), ax = Math.sin(c.heading), az = Math.cos(c.heading), span = Math.max(0, hl - hw), n = Math.ceil(2 * span / 0.25) || 1;
        for (let m = 0; m <= n; m++) {
          const t = -span + 2 * span * m / n, px = sim.x[i] + fx * t - c.x, pz = sim.z[i] + fz * t - c.z;
          const u = Math.abs(px * ax + pz * az) - l / 2, v = Math.abs(px * az - pz * ax) - w / 2;
          const d = -(Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0) - hw);
          if (d > worstD) { worstD = d; who = c; }
        }
      }
      if (worstD > 0.05) {
        into++; maxD = Math.max(maxD, worstD);
        if (!hit.has(who)) { hit.set(who, 1); if (worst.length < 12) worst.push({ x: +who.x.toFixed(1), z: +who.z.toFixed(1), depth: +worstD.toFixed(2), state: sim.state[i], room: +sim.room[i].toFixed(2), v: +sim.v[i].toFixed(1), off: +Math.hypot(sim.offX[i], sim.offZ[i]).toFixed(2), tile: sim.W.slots[sim.path[i] >>> 16]?.name, path: sim.path[i] & 0xffff, core: sim.W.slots[sim.path[i] >>> 16]?.core[sim.path[i] & 0xffff], d: +sim.d[i].toFixed(1), blend: sim.bL?.[i] > 0 ? { gap: +Math.hypot(sim.bdx[i], sim.bdz[i]).toFixed(2), at: +(sim.odo[i] - sim.bS[i]).toFixed(1), over: +sim.bL[i].toFixed(1) } : null }); }
      }
    }
    maxCars = Math.max(maxCars, alive);
    await new Promise((r) => setTimeout(r, every));
  }
  const st = sim.stats;
  return { secs, samples, cars: maxCars, into, parkedHit: hit.size, maxDepth: +maxD.toFixed(2), worst,
    stats: { pullOuts: st.pullOuts, parkIns: st.parkIns, pullOutsSkipped: st.pullOutsSkipped || 0, parkWaits: st.parkWaits || 0, parkPasses: st.parkPasses || 0, narrowWaits: st.narrowWaits || 0, moved: sim.pk?.moved?.size ?? null },
    stepMs: +st.stepMs.toFixed(3), stepMsMax: +st.stepMsMax.toFixed(2) };
}
