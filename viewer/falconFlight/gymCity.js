// THE GYM CONTROLLER IN THE CITY GAME (rule falcon-gym "the gym in the city"; the DEFAULT since the owner's OK 2026-11-27,
// ?falconctl=current = the city's own controller, ?falconctl=old = its raw round-1 controls).
// viewer/falconGym/gymFlight.js (the Falcon Gym's controller: mouse direction steering, auto-level, flap-glide cruise,
// Space power, the stoop, soft walls, the ground take-off / hop out, the flare) flies the city falcon against
// cityGymWorld.js (the city's own heights, crowns, sills, railings, lamps, roof edges). falconGame.js keeps everything
// else: the lock-on, the auto-dive (its aim handed to the gym's steering), the catch, the slow motion, the score, the
// eyrie. CityGymFlight is the gym's flight with the few fields the city game reads off its flight (falconFlight.js's
// names), the eyrie preferred for a landing with prey, and a landing target that allocates nothing.
// ?falconmodel=v2|current (default v2 since the owner's OK 2026-11-27): the v2 falcon (viewer/falconGym/gymBird.js,
// models/bird/v2/) as the player's bird (cityFlyer.js). LOADED AT BOOT only on a falcon page (?game=falcon, or an explicit
// ?falconmodel=v2): there it loads + warms under the play loader. Any other page (the plain city, ?game=police) boots
// the current bird as before (no extra load) and swaps the v2 in, loaded + warmed, when the falcon flight first starts
// (cityFlyer.js ensureModel(): main.js fly(), the falcon game's start).
import { GymFlight, GYM } from "../falconGym/gymFlight.js";

const Q = typeof location !== "undefined" ? location.search : "";
/** the controller: "gym" (default) | "current" (?falconctl=current; ?falconctl=old = the current one's raw controls:
 *  falconInput.js) */
export const FALCON_CTL = /[?&]falconctl=(current|old)(&|$)/.test(Q) ? "current" : "gym";
/** the player's model: "v2" (default) | "current" (?falconmodel=current) */
export const FALCON_MODEL = /[?&]falconmodel=current(&|$)/.test(Q) ? "current" : "v2";
/** the v2 loads at boot (cityFlyer.js init) only on a falcon page: ?game=falcon or an explicit ?falconmodel=v2; else
 *  the current bird boots and the v2 comes in when the falcon flight first starts (ensureModel) */
export const V2_AT_BOOT = FALCON_MODEL === "v2" && /[?&](game=falcon|falconmodel=v2)(&|$)/.test(Q);

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class CityGymFlight extends GymFlight {
  constructor(world, P = GYM) {
    super(world, { ...P, stamina: { ...P.stamina, perchRegen: P.stamina.rest } });
    // (falconFlight.js names the city game / HUD / camera read; the gym has its own events instead of contacts)
    this.stall = 0; this.sprint = 0; this.noLand = 0; this.contact = null; this.assisted = true; this.brush = 0; this.chaseA = 0;
    this.prefer = null;                    // () => a ledge to land on first (the eyrie with prey), or null
    this._lt = { x: 0, y: 0, z: 0, yaw: 0, name: "" };
  }
  /** falconFlight.js launch(x, y, z, heading, V, gamma, air): free flight from a point, the last launch beats */
  launch(x, y, z, heading, V = 14, gamma = 0, air = null) {
    if (air) this.air = air;
    this.launchAt(x, y, z, heading, V, gamma);
    this.burst = 1.2; this.burstOn = true;
  }
  /** the gym's landing target (gymFlight.js landingTarget: a ledge 2-35 m ahead with a clear line, else a level top
   *  surface 10-25 m on), into one reused object; the eyrie first when `prefer` gives it */
  landingTarget() {
    const w = this.world, p = this.pos, hx = -Math.sin(this.heading), hz = -Math.cos(this.heading), o = this._lt;
    const pq = this.prefer?.();
    if (pq) { o.x = pq.pos.x; o.y = pq.pos.y; o.z = pq.pos.z; o.yaw = pq.yaw; o.name = "eyrie's ledge"; return o; }
    if (this.V > 26) return null;
    let bd = 35, best = null;
    for (const l of w.ledges) {
      const dx = l.x - p.x, dy = l.y - p.y, dz = l.z - p.z;
      if (Math.abs(dx) > bd || Math.abs(dz) > bd) continue;
      const d = Math.hypot(dx, dy, dz);
      if (d > bd || d < 2) continue;
      if ((dx * hx + dz * hz) / Math.max(Math.hypot(dx, dz), 0.1) < 0.45 || dy > 6 || dy < -30) continue;
      if (!this.clearLine(p, l)) continue;
      bd = d; best = l;
    }
    if (best) { o.x = best.x; o.y = best.y; o.z = best.z; o.yaw = best.yaw; o.name = best.kind; return o; }
    for (let d = 10; d <= 25; d += 3) {
      const x = p.x + hx * d, z = p.z + hz * d, f = w.column(x, z, p.y).floor;
      if (p.y - f < 1 || p.y - f > 30) continue;
      if (Math.abs(w.column(x + 0.8, z, p.y).floor - f) > 0.3 || Math.abs(w.column(x - 0.8, z, p.y).floor - f) > 0.3 || Math.abs(w.column(x, z + 0.8, p.y).floor - f) > 0.3 || Math.abs(w.column(x, z - 0.8, p.y).floor - f) > 0.3) continue;
      o.x = x; o.y = f; o.z = z; o.yaw = this.heading;
      if (!this.clearLine(p, o)) continue;
      o.name = f > w.ground(x, z) + 1 ? "roof" : "ground";
      return o;
    }
    return null;
  }
  /** off an edge (gymFlight.js edgeLaunch), the way out the freest: a window sill faces the street, and the house
   *  opposite is 10-15 m off: the launch turns along the street (five directions within 63 deg of the facing, 25 m
   *  rays, the facing preferred). Node check: straight out it met the opposite wall at 4 m/s and slid to the street */
  edgeLaunch(x, z) {
    const w = this.world, y = this.feetY + 0.5, h0 = this.heading;
    let best = h0, bd = -1;
    for (let k = 0; k < 5; k++) {
      const a = h0 + (k === 0 ? 0 : k === 1 ? 0.6 : k === 2 ? -0.6 : k === 3 ? 1.1 : -1.1);
      const d = Math.min(w.ray(x, y, z, -Math.sin(a), -0.2, -Math.cos(a), 25), 25) - (k ? 3 : 0);
      if (d > bd + 0.5) { bd = d; best = a; }
    }
    this.heading = best;
    super.edgeLaunch(x, z);
  }
  /** (gymFlight.js tryLand, the target copied: the landing keeps it while the pool moves on) */
  tryLand() {
    const q = this.landingTarget();
    if (!q) { this.say("noland", "nowhere to land ahead (a ledge, a sill or a roof < 35 m, under 26 m/s)"); return; }
    const L = (this._land ??= { q: { x: 0, y: 0, z: 0, yaw: 0, name: "" }, p0: { x: 0, y: 0, z: 0 }, v0: { x: 0, y: 0, z: 0 }, v1: { x: 0, y: 0, z: 0 }, p1: { x: 0, y: 0, z: 0 }, T: 1, t: 0 });
    Object.assign(L.q, q); Object.assign(L.p0, this.pos); Object.assign(L.v0, this.va);
    const d = Math.hypot(q.x - this.pos.x, q.y - this.pos.y, q.z - this.pos.z);
    L.T = clamp(d / Math.max(this.V * 0.6, 4), 0.9, 2.8); L.t = 0;
    L.v1.x = -Math.sin(q.yaw) * 0.8; L.v1.y = -0.6; L.v1.z = -Math.cos(q.yaw) * 0.8;
    L.p1.x = q.x; L.p1.y = q.y + this.P.radius; L.p1.z = q.z;
    this.landT = L; this.mode = "land"; this.stun = 0;
    this.say("land", `landing on the ${q.name}: the flare`);
  }
}
