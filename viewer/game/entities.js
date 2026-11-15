// GAME ENTITIES (docs/GAMEKIT.md "Entities"): things a mission tracks or controls. Each has the same small interface:
//   alive   false once it is gone (despawned, parked away, lost)
//   x, z, y (m), speed (m/s), heading (rad), travelled (m since it was taken)
//   update()          refresh the numbers (the kit calls it at its logic rate, 10 Hz)
//   release()         hand it back to the city (the kit calls it when the mission ends)
//   arrived           true when it reached its own destination (a traffic car that parked)
//   label, color      for the HUD / map
//
// trafficCar: a car of the moving traffic (viewer/traffic/, ?traffic on by default) taken as a target: marked `keep` in
// the simulation (populate() never removes it, trafficSim.js), followed at the render's interpolated pose. Traffic cars
// roam the lane graph (random turns at each junction); now and then one parks into a free slot of the parked fleet:
// that is its "destination" (arrived). Later: pedestrians (viewer/pedestrians), items (a parcel, a stolen bike).
const COLOURS = [[0.85, 0.85, 0.85, "white"], [0.05, 0.05, 0.06, "black"], [0.45, 0.47, 0.5, "grey"], [0.6, 0.62, 0.66, "silver"], [0.55, 0.05, 0.05, "red"],
  [0.08, 0.15, 0.45, "blue"], [0.06, 0.25, 0.1, "green"], [0.75, 0.6, 0.1, "yellow"], [0.35, 0.22, 0.12, "brown"], [0.9, 0.85, 0.7, "beige"]];
/** the nearest colour word for an RGB paint (0..1 linear-ish) */
export function colourName(r, g, b) {
  let best = "dark", bd = Infinity;
  for (const [cr, cg, cb, n] of COLOURS) { const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}

export class TrafficCarTarget {
  constructor(traffic, i) {
    this.T = traffic; this.sim = traffic.sim; this.i = i; this.gen = this.sim.gen[i];
    this.sim.keep[i] = 1;
    this.alive = true; this.arrived = false;
    this.x = 0; this.z = 0; this.y = 0; this.speed = 0; this.heading = 0; this.travelled = 0;
    const s = this.sim, ty = s.types[s.type[i]];
    this.colour = colourName(s.paint[i * 3], s.paint[i * 3 + 1], s.paint[i * 3 + 2]);
    this.model = (ty?.name || "car").replace(/^faceted:/, "").replace(/_[a-z]$/, "").replace(/_/g, " ");
    this.label = `${this.colour} ${this.model}`;
    this.color = "#ff5a4f";
    this.update();
  }
  update() {
    if (!this.alive) return;
    const s = this.sim, i = this.i;
    if (!s.alive[i] || s.gen[i] !== this.gen) {
      this.alive = false;
      this.arrived = s.gen[i] === this.gen && s.handoff[i] === 1;        // parked into a slot = its destination
      return;
    }
    const a = this.T.T?.alpha ?? 1, b = 1 - a;                           // the drawn pose (render interpolation)
    const x = s.px[i] * b + s.x[i] * a, z = s.pz[i] * b + s.z[i] * a;
    if (this.x || this.z) this.travelled += Math.hypot(x - this.x, z - this.z);
    this.x = x; this.z = z; this.y = s.py[i] * b + s.y[i] * a;
    this.speed = Math.abs(s.v[i]); this.heading = s.yaw[i];
  }
  /** its pose right now (per frame, for the 3D marker), no allocation */
  pose(out) {
    const s = this.sim, i = this.i, a = this.T.T?.alpha ?? 1, b = 1 - a;
    out.x = s.px[i] * b + s.x[i] * a; out.z = s.pz[i] * b + s.z[i] * a; out.y = s.py[i] * b + s.y[i] * a;
    return out;
  }
  release() { if (this.sim.gen[this.i] === this.gen) this.sim.keep[this.i] = 0; this.alive = false; }
}

/**
 * Take a traffic car: the nearest driving one between min and max metres from (x, z), preferring cars ahead of the
 * player's heading (bearing, radians clockwise from north) and moving. Returns a TrafficCarTarget or null.
 */
export function takeTrafficCar(traffic, { x, z, heading = null, min = 25, max = 180 } = {}) {
  const sim = traffic?.sim;
  if (!sim) return null;
  let best = -1, bs = Infinity;
  const fx = heading == null ? 0 : Math.sin(heading), fz = heading == null ? 0 : -Math.cos(heading);
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i] || sim.state[i] !== 0 || sim.keep[i]) continue;
    const dx = sim.x[i] - x, dz = sim.z[i] - z, d = Math.hypot(dx, dz);
    if (d < min || d > max) continue;
    const ahead = heading == null ? 0 : (dx * fx + dz * fz) / d;      // 1 = straight ahead
    const score = d * (1.6 - ahead * 0.6) + (sim.v[i] < 1 ? 60 : 0);
    if (score < bs) { bs = score; best = i; }
  }
  return best >= 0 ? new TrafficCarTarget(traffic, best) : null;
}
