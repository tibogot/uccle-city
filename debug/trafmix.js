// TRAFMIX (docs/TRAFMIX.md, rule traffic-mix) in the page: what drives now, the buses on their lines, an ambulance run on demand.
//   const M = await import("/debug/trafmix.js");
//   M.report()          -> { hour, weekday, cars, byType, byRole, buses: [{ line, op, next stop, dist, dwell }], runs, stepMs, draws, tris }
//   M.ambulance()       -> replaces a car 40-120 m ahead of the camera (in view) by an ambulance on a run (beacons +
//                          siren; the speaker button for the sound); the cars ahead of it yield. { i, x, z } or { error }
//   M.nearest("bus")    -> the nearest bus / police_t / ambulance / fire / bin: { i, x, z, dist } (then ?at=x,z or fly there)
//   M.watch(30)         -> the counts every second for 30 s (the mix over time, the yield count)
import { ROLE_NAMES } from "../viewer/traffic/trafMix.js";

const T = () => window.__traffic;
export function report() {
  const t = T(), sim = t?.sim;
  if (!sim) return { error: "no traffic (?with=traffic)" };
  const byType = {}, byRole = {}, buses = [];
  let cars = 0, runs = 0;
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i]) continue;
    cars++;
    const nm = sim.types[sim.type[i]].name, rl = ROLE_NAMES[sim.role[i]] || "car";
    byType[nm] = (byType[nm] || 0) + 1; byRole[rl] = (byRole[rl] || 0) + 1;
    if (sim.ctl[i] === 4) runs++;
    if (rl === "bus" && sim.mix?.routes) {
      const r = sim.bv[i] >= 0 ? sim.mix.routes[sim.bv[i]] : null, s = r?.stops[sim.ns[i]];
      buses.push({ i, line: r?.ref ?? "(off its line)", op: r?.op, to: r?.to, x: +sim.x[i].toFixed(1), z: +sim.z[i].toFixed(1), next: s?.name, toStop: s ? +(s.at - 4.7 - sim.rp[i]).toFixed(1) : null, dwell: sim.rst[i] === 2 ? +sim.rT[i].toFixed(1) : 0 });
    }
  }
  const f = t.fleet?.stats || {};
  return { hour: +sim.params.hour.toFixed(2), weekday: sim.mix?.weekday, cars, byType, byRole, buses, runs, yielding: sim.stats.yielding,
    stepMs: +sim.stats.stepMs.toFixed(3), stepMsMax: +sim.stats.stepMsMax.toFixed(2), draws: f.draws, tris: f.tris, mix: !!sim.mix };
}
export function nearest(name = "bus") {
  const sim = T()?.sim, cam = window.viewer?.camera;
  if (!sim) return { error: "no traffic" };
  const p = cam?.position || { x: 0, z: 0 };
  let best = null;
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i] || sim.types[sim.type[i]].name !== name) continue;
    const d = Math.hypot(sim.x[i] - p.x, sim.z[i] - p.z);
    if (!best || d < best.dist) best = { i, x: +sim.x[i].toFixed(1), z: +sim.z[i].toFixed(1), dist: +d.toFixed(0) };
  }
  return best || { error: `no ${name} alive now` };
}
export function ambulance() {
  const t = T(), sim = t?.sim, cam = window.viewer?.camera;
  if (!sim?.setRole) return { error: "no traffic / no trafmix sim" };
  const ai = sim.types.findIndex((q) => q.name === "ambulance");
  if (ai < 0) return { error: "?trafmix=old: no ambulance type" };
  const p = cam.position, fx = -cam.matrixWorld.elements[8], fz = -cam.matrixWorld.elements[10];
  let best = -1, bs = -1;
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i] || sim.state[i] !== 0 || sim.role[i] || sim.types[sim.type[i]].two) continue;
    const dx = sim.x[i] - p.x, dz = sim.z[i] - p.z, al = dx * fx + dz * fz;
    if (al < 40 || al > 120) continue;
    let n = 0;                                   // (the cars ahead of it on its way: who will yield)
    for (let j = 0; j < sim.cap; j++) if (sim.alive[j] && j !== i) { const ex = sim.x[j] - sim.x[i], ez = sim.z[j] - sim.z[i], a2 = ex * Math.sin(sim.yaw[i]) + ez * Math.cos(sim.yaw[i]); if (a2 > 8 && a2 < 70 && Math.abs(ex * Math.cos(sim.yaw[i]) - ez * Math.sin(sim.yaw[i])) < 3) n++; }
    if (n > bs) { bs = n; best = i; }
  }
  if (best < 0) return { error: "no car 40-120 m ahead of the camera" };
  const gid = sim.path[best], d = sim.d[best], v = sim.v[best];
  sim.kill(best);
  const a = sim.spawnAt(gid, d, v, ai);
  if (a < 0) return { error: "spawn failed" };
  sim.insertInList(a); sim.setRole(a, 2); sim.ctl[a] = 4;
  return { i: a, x: +sim.x[a].toFixed(1), z: +sim.z[a].toFixed(1), carsAhead: bs };
}
export async function watch(secs = 30) {
  const rows = [];
  for (let s = 0; s < secs; s++) { const r = report(); rows.push({ t: s, cars: r.cars, ...r.byRole, runs: r.runs, yielding: r.yielding, stepMs: r.stepMs }); await new Promise((res) => setTimeout(res, 1000)); }
  console.table(rows);
  return rows;
}
