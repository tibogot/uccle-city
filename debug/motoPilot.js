// MOTO AUTOPILOT (debug, for screenshots / screencasts of the motorbike, docs/MOTO.md): follows a chain of OSM road
// segments by id on the loaded tiles with a pure-pursuit steer, a target speed per curvature, an optional wheelie.
// Or along the traffic LANE GRAPH (the drawn lanes, window.__trafficTiles): m.pilot({ lanes: { tile: "I6", meters: 700,
// turn: "straight" | "left" | "right" | "random" }, speed: 70 }) from where the bike is.
// In the page (Chrome DevTools evaluate or the console):
//   const m = await import("/debug/motoPilot.js");
//   m.pilot({ roads: ["r14387669_0", "r166221276_0", "r166221276_1"], keep: 1.2, speed: 60 });   // km/h on straights
//   m.stop();
// It replaces driver.keys.readMoto while it runs (the keyboard is back after stop()).
let run = null;
export function pathOf(ids, keep = 0) {
  const w = window.viewer.world, pts = [];
  for (const id of ids) {
    for (const t of w.tiles) {
      const R = t.roads, roads = Array.isArray(R.roads) ? R.roads : Object.values(R.roads);
      const r = roads.find((q) => q.id === id);
      if (!r) continue;
      const nodes = Array.isArray(R.nodes) ? R.nodes : Object.values(R.nodes), nd = (k) => nodes.find((n) => n.id === k);
      const seq = [nd(r.a), ...r.pts, nd(r.b)];
      for (const p of seq) if (!pts.length || Math.hypot(p.x - pts[pts.length - 1][0], p.z - pts[pts.length - 1][1]) > 0.5) pts.push([p.x, p.z]);
      break;
    }
  }
  // densify (2 m) and offset to the right (keep right)
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2));
    const rx = -(bz - az) / L, rz = (bx - ax) / L;      // right of the travel direction (x east, z south: forward (dx, dz) -> right (-dz, dx))
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n + rx * keep, az + (bz - az) * k / n + rz * keep]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** a polyline along the lane graph from the lane nearest (x, z) heading h, choosing successors by `turn` */
export function lanePath(x, z, h, { tile = "I6", meters = 700, turn = "straight", seed = 7, left = 0 } = {}) {
  const G = window.__trafficTiles.get(tile), XY = G.xy;
  let best = null, bd = 1e9;
  for (let p = 0; p < G.paths; p++) for (let k = G.off[p]; k < G.off[p + 1] - 1; k++) {
    const ax = XY[2 * k], az = XY[2 * k + 1], dx = XY[2 * k + 2] - ax, dz = XY[2 * k + 3] - az;
    const d = Math.hypot(ax - x, az - z), al = (dx * Math.sin(h) + dz * Math.cos(h)) / (Math.hypot(dx, dz) || 1);
    if (al > 0.7 && d < bd) { bd = d; best = [p, k]; }
  }
  if (!best) throw new Error("motoPilot: no lane near");
  let [p, k] = best, rnd = seed;
  const out = [];
  let L = 0;
  for (let guard = 0; guard < 400 && L < meters; guard++) {
    for (; k < G.off[p + 1]; k++) { const q = [XY[2 * k], XY[2 * k + 1]]; if (out.length) L += Math.hypot(q[0] - out[out.length - 1][0], q[1] - out[out.length - 1][1]); out.push(q); }
    const n0 = G.nextOff[p], n1 = G.nextOff[p + 1];
    if (n1 <= n0) break;
    // the successor: straightest / leftmost / rightmost by the turn between the end direction and its start direction
    const e = G.off[p + 1] - 1, ex = XY[2 * e] - XY[2 * e - 2], ez = XY[2 * e + 1] - XY[2 * e - 1];
    let pick = G.nextIdx[n0], score = -1e9;
    rnd = (rnd * 16807) % 2147483647;
    for (let j = n0; j < n1; j++) {
      const q = G.nextIdx[j], s0 = G.off[q], qx = XY[2 * s0 + 2] - XY[2 * s0], qz = XY[2 * s0 + 3] - XY[2 * s0 + 1];
      const cross = ex * qz - ez * qx, dot = ex * qx + ez * qz, ang = Math.atan2(cross, dot);       // > 0: turning right (x east, z south)
      const sc = turn === "left" ? -ang : turn === "right" ? ang : turn === "random" ? ((rnd >> (j % 8)) & 7) : -Math.abs(ang);
      if (sc > score) { score = sc; pick = q; }
    }
    p = pick; k = G.off[p];
  }
  // resample to 2 m (the pursuit and the curvature look-ahead count points)
  const rs = [out[0]];
  let acc = 0;
  for (let i = 1; i < out.length; i++) {
    acc += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
    if (acc >= 2) { rs.push(out[i]); acc = 0; }
  }
  if (left) {                                    // shift sideways (m, + = left of the travel direction: past the parked cars)
    const sh = rs.map((q, i) => { const a = rs[Math.max(0, i - 1)], b = rs[Math.min(rs.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [q[0] + (b[1] - a[1]) / L * left, q[1] - (b[0] - a[0]) / L * left]; });
    return sh;
  }
  return rs;
}

export function pilot({ roads, lanes, keep = 1.2, speed = 60, wheelie = null, start = true } = {}) {
  const d = window.__driver;
  const path = lanes ? lanePath(d.state.x, d.state.z, d.state.heading, lanes) : pathOf(roads, keep);
  if (lanes) start = false;
  if (path.length < 3) throw new Error("motoPilot: path not found on the loaded tiles");
  const read0 = d.keys.readMoto.bind(d.keys);
  const inp = { throttle: 0, brake: 0, rear: false, steer: 0, boost: false };
  let i = 0;
  if (start) {
    const [x0, z0] = path[0], [x1, z1] = path[2];
    d.start(x0, z0, Math.atan2(x1 - x0, z1 - z0), "moto");
  }
  d.keys.readMoto = () => {
    const c = d.state, v = Math.abs(c.speed);
    while (i < path.length - 2 && Math.hypot(path[i + 1][0] - c.x, path[i + 1][1] - c.z) < Math.hypot(path[i][0] - c.x, path[i][1] - c.z)) i++;
    const look = 6 + v * 0.55, j = Math.min(path.length - 1, i + Math.round(look / 2));
    const [tx, tz] = path[j];
    const want = Math.atan2(tx - c.x, tz - c.z);
    let e = want - c.heading; e = Math.atan2(Math.sin(e), Math.cos(e));
    inp.steer = Math.max(-1, Math.min(1, e * 4.5));
    // the curvature ahead sets the speed (lean ~ v² / r)
    let turn = 0;
    for (let k = i; k < Math.min(path.length - 2, i + 20); k++) {
      const a = Math.atan2(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]), b = Math.atan2(path[k + 2][0] - path[k + 1][0], path[k + 2][1] - path[k + 1][1]);
      turn = Math.max(turn, Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) / 2);
    }
    const r = 1 / Math.max(turn, 1e-3), vt = Math.min(speed / 3.6, Math.sqrt(r * 9.81 * 0.85));
    inp.throttle = v < vt ? 1 : 0; inp.brake = v > vt + 2 ? Math.min(1, (v - vt) / 6) : 0;
    inp.boost = wheelie != null && i >= wheelie[0] && i <= wheelie[1];
    if (i >= path.length - 3) { inp.throttle = 0; inp.brake = v > 0.5 ? 1 : 0; }
    return inp;
  };
  run = { stop: () => { d.keys.readMoto = read0; run = null; }, path, get i() { return i; } };
  return { points: path.length, length: path.length * 2 };
}
export function stop() { run?.stop(); }
export const state = () => run && { i: run.i, n: run.path.length };
