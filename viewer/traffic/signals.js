// THE TRAFFIC-SIGNAL CYCLE, one source of truth for the drawn lights and the traffic (no three.js: the tile worker
// imports it too). The same cycle as the furniture kit (branch claude/furniture, viewer/furnitureModel.js SIGNAL):
// Belgian sequence green -> amber (3 s) -> red -> green (no red + amber), two phase groups A / B (the two directions
// of a junction): B is A shifted by half a cycle, with an all-red clearance of 2 s each way. Pedestrians (crossing the
// street whose cars have red) get green for the first 60 % of that red.
// Phase of a signal post: B for the roads running more north-south than east-west (|uz| > |ux| of the nearest road
// segment of the OSM traffic_signals point), A otherwise: furniture.js and furnitureModel.js use that rule, and the
// traffic graph (viewer/traffic/trafficGraph.js) gives every signalled approach the phase of the OSM post it passes,
// so a car stops exactly when the head it faces shows red.
// Clock: performance.now() / 1000 * speed + offset (the furniture kit's), so lights and cars agree in every page.

export const CYCLE = { green: 22, amber: 3, allRed: 2 };
export const CYCLE_T = (CYCLE.green + CYCLE.amber + CYCLE.allRed) * 2;     // 54 s
export const GREEN = 0, AMBER = 1, RED = 2;

/** The shared clock (the Traffic Lab's speed slider sets `speed`; both re-anchor so nothing jumps). */
export const signalClock = {
  speed: 1, offset: 0,
  now() { return (performance.now() / 1000) * this.speed + this.offset; },
  setSpeed(k) { const t = this.now(); this.speed = k; this.offset = t - (performance.now() / 1000) * k; },
};

/** Seconds into the cycle of phase 0 (A) / 1 (B) at clock time t. */
export const phaseTime = (phase, t) => { const tt = t + (phase ? CYCLE_T / 2 : 0); return ((tt % CYCLE_T) + CYCLE_T) % CYCLE_T; };
/** GREEN / AMBER / RED of phase 0 (A) / 1 (B) at clock time t. */
export function signalState(phase, t) {
  const s = phaseTime(phase, t);
  return s < CYCLE.green ? GREEN : s < CYCLE.green + CYCLE.amber ? AMBER : RED;
}
/** Seconds until this phase turns green (0 while green). */
export function untilGreen(phase, t) { const s = phaseTime(phase, t); return s < CYCLE.green ? 0 : CYCLE_T - s; }
/** Pedestrian green of phase 0 / 1 at t (furnitureModel.js rule). */
export function walkState(phase, t) {
  const s = phaseTime(phase, t), g = CYCLE.green, a = CYCLE.amber;
  if (s < g + a) return false;
  const redT = s - g - a, redLen = CYCLE_T - g - a;
  return redT > CYCLE.allRed && redT < CYCLE.allRed + (redLen - 2 * CYCLE.allRed) * 0.6;
}
/** The phase rule of the drawn posts: direction (ux, uz) of the road through the OSM point. */
export const phaseOfDir = (ux, uz) => (Math.abs(uz) > Math.abs(ux) ? 1 : 0);

/** Nearest road segment of roads.json to (x, z): point, unit direction, side (+1 left), road (furniture.js placement). */
export function nearestRoad(roads, N, x, z) {
  let best = null;
  for (const r of roads.roads) {
    if (r.meta?.highway === "footway" || r.meta?.highway === "service") continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
      if (L2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) {
        const L = Math.sqrt(L2), ux = dx / L, uz = dz / L;
        best = { d, px, pz, ux, uz, side: (-uz * (x - px) + ux * (z - pz)) >= 0 ? 1 : -1, road: r };
      }
    }
  }
  return best;
}
