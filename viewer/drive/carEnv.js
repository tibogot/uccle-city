// The car's world for stepCar (carPhysics.js): the ground, and collisions against the collider sets (colliders.js)
// near the car. Candidates are gathered ONCE per frame from the 48 m cells round the car (radius = car + the distance
// it can travel this frame + a margin); the 120 Hz substeps then only test those.
import { gather, itemContact, heightClear, KIND } from "./colliders.js";
import { BODY, hit } from "./carPhysics.js";
import { obbObb } from "./obb.js";
import { HIT } from "./carHit.js";

/** The highest step a car climbs (m): a kerb (15-25 cm) is ridden up, a road wall, a retaining wall or a raised
 *  platform's edge over this is a wall (docs/collisions/README.md: until 2026-11-13 the car climbed any height the
 *  drive surface stepped by, e.g. the 0.6-1 m walls of the road engine's raised roads). */
export const MAX_STEP = 0.5;
/** Ledge contact: the drive surface under the car's perimeter more than MAX_STEP over the surface under its centre.
 *  contact <- the push away from the ledge (the mean direction from the high points to the centre). */
export function ledgeContact(c, body, ground, contact) {
  let sx = 0, sz = 0, n = 0;
  for (const [u, w] of LEDGE_PTS) {
    const x = c.x + u * body.hx * body.cos + w * body.hz * body.sin, z = c.z - u * body.hx * body.sin + w * body.hz * body.cos;
    if (ground(x, z) - c.y > MAX_STEP) { sx += c.x - x; sz += c.z - z; n++; }
  }
  if (!n) return false;
  const L = Math.hypot(sx, sz) || 1;
  contact.nx = sx / L; contact.nz = sz / L; contact.depth = 0.06; contact.kind = KIND.wall;
  return true;
}
const LEDGE_PTS = [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]];

// ---------------------------------------------------------------- police feel (docs/POLICE_FEEL.md; ?carfeel=old = off)
/** A STEP, not a slope: the drive surface under a perimeter point rises more than STEP_RISE over the STEP_RUN metres
 *  before it (toward the car's centre), or more than BANK over the car's own height. The old rule (anything MAX_STEP
 *  over the car's centre) turned a 15 cm kerb on a 15 % street into a wall (the front corner is already ~0.36 m up
 *  the hill), and every lawn bank steeper than ~20 %. The drive grid is bilinear over 1 m: a kerb of H rises ~0.7 H
 *  over 0.7 m, so kerbs and garden edges up to ~0.4 m are ridden up, a wall / retaining wall is not. */
export const STEP_RUN = 0.7, STEP_RISE = 0.3, BANK = 1.3;
export function stepContact(c, body, ground, contact) {
  let sx = 0, sz = 0, n = 0;
  for (const [u, w] of LEDGE_PTS) {
    const ox = u * body.hx * body.cos + w * body.hz * body.sin, oz = -u * body.hx * body.sin + w * body.hz * body.cos;
    const x = c.x + ox, z = c.z + oz, L = Math.sqrt(ox * ox + oz * oz) || 1;     // (not Math.hypot: it allocates in some tiers; carhit's bodies call this per substep)
    const g = ground(x, z);
    if (g - ground(x - ox / L * STEP_RUN, z - oz / L * STEP_RUN) > STEP_RISE || g - c.y > BANK) { sx -= ox; sz -= oz; n++; }
  }
  if (!n) return false;
  const L = Math.hypot(sx, sz) || 1;
  contact.nx = sx / L; contact.nz = sz / L; contact.depth = 0.04; contact.kind = KIND.wall;
  return true;
}
/** hedges: the car goes through, slowed: speed x exp(-HEDGE_DRAG dt) while its box overlaps one (a tall one: more) */
const HEDGE_DRAG = 1.2;   // (browser check 2: 1.6 held a car on full throttle to ~14 km/h inside a hedge; 1.2: ~19)
/** thin posts (signs, stop poles, bollards: radius <= POST_R, or a polygon <= POST_BOX both ways): a hit off the car's centre line slides the car round
 *  the post (the push turned sideways) instead of stopping it dead; dead centre it still stops */
const POST_R = 0.12, POST_SIDE = 0.3, POST_BOX = 0.6;   // (POST_BOX: a polygon this small both ways counts too: the landmarks' bollard slices)

/**
 * sets(x, z, r) -> array of collider sets (one per tile) that may hold items within r of (x, z)
 * ground(x, z) -> drivable height
 */
export function createCarEnv({ sets, ground, handling, waters = () => null, ledges = true, dims = BODY, onHit = hit, feel = false, surface = null, nudge = null, movers = null, carHit = null, two = false }) {
  // carHit (docs/CARHIT.md, carHit.js; null = ?carpush=old): the cars two-way: a parked car hit wakes as a pushed body,
  // the traffic's cars take impulses (instead of env.dynamic's infinite-mass push); two: a two-wheeler (its own response)
  // movers (car control round, movers.js): the trams / trains as oriented boxes, gathered once per frame (prepare), tested
  // every substep; kinematic (never pushed): the car is pushed out (hitSlide: slide / bounce)
  const mbox = new Float32Array(48 * 7), mout = { nx: 0, nz: 0, depth: 0 };
  let mN = 0;
  // feel (police feel, the car only): the step rule above, kerb islands climbed (they are in the drive surface), hedges
  // soft, thin posts slide the car round, parked cars nudged (nudge(ref, dx, dz, dyaw)); surface(x, z): 0 paved / 1 terrain
  // dims: the vehicle's half width / half length (carPhysics BODY; the motorbike's narrow box, viewer/moto/motoPhysics.js);
  // onHit(c, nx, nz, kind, handling): the impact response (carPhysics hit, or the motorbike's: it may crash)
  const near = [];
  const contact = { nx: 0, nz: 0, depth: 0, kind: 0 };
  const body = { hx: dims.hx, hz: dims.hz, cos: 1, sin: 0 };
  const push = (c, nx, nz, depth, kind) => {
    c.x += nx * depth; c.z += nz * depth;
    onHit(c, nx, nz, kind, handling);
    env.contacts++;
  };
  const env = {
    dynamic: null,
    ground,
    near,
    contacts: 0,          // contacts resolved in the last frame
    tested: 0,            // candidate items in the last frame
    prepare(c, travel) {
      near.length = 0;
      const r = Math.hypot(dims.hx, dims.hz) + travel;
      for (const col of sets(c.x, c.z, r)) gather(col, c.x, c.z, r, near);
      env.tested = near.length / 2;
      env.contacts = 0; env.hedge = 0;
      mN = movers ? movers.bodies(c.x, c.z, r + 2, mbox) : 0;
      env.movers = mN;
    },
    surface,
    hedge: 0,             // (feel) a hedge overlapped in the last substep
    collide(c, step = 1 / 120) {
      // a pond (wolvendaelCity.js world.waters): no wall at the shore and no driving on the bed as on dry land: the
      // water drags the car in proportion to its depth (half a metre stops it; it can back out)
      const W = waters();
      if (W) for (const w of W) {
        if (c.x < w.x0 || c.x > w.x1 || c.z < w.z0 || c.z > w.z1) continue;
        const d = w.depthAt(c.x, c.z);
        if (d > 0.05) { const k = Math.exp(-step * 9 * Math.min(1, d / 0.5) ** 2); c.speed *= k; c.vx *= k; c.vz *= k; env.wading = d; }
      }
      body.cos = Math.cos(c.heading); body.sin = Math.sin(c.heading);
      body.hx = dims.hx; body.hz = dims.hz;                 // carModel.js fitBody may resize it to the model
      for (let pass = 0; pass < 2; pass++) {      // a second pass settles a push from one wall into another
        let any = false;
        for (let k = 0; k < near.length; k += 2) {
          const col = near[k], id = near[k + 1];
          if (feel && id < col.P && col.pkind[id] === KIND.island) continue;     // (feel: a kerb island is ridden up)
          if (heightClear(col, id, c.y)) continue;                               // a platform / fence / parapet over or under the car
          if (carHit && id < col.P && col.pref?.[id]?.hidden) continue;           // (carhit: a parked car woken this frame: a body now)
          if (!itemContact(col, id, c.x, c.z, body, contact)) continue;
          if (feel && contact.kind === KIND.hedge) {
            if (pass === 0) {
              const tall = col.ptop[id] - col.pbase[id] > 1.7 ? 2 : 1;
              const kk = Math.exp(-HEDGE_DRAG * tall * step);
              c.speed *= kk; c.vx *= kk; c.vz *= kk; env.hedge = 1;
            }
            continue;
          }
          // (carhit) a parked car hit (closing): a body of its own from now on, solved with the others below
          if (carHit && contact.kind === KIND.car && id < col.P && col.pref?.[id] && pass === 0) {
            const s = Math.sin(c.heading), k = Math.cos(c.heading);
            const vn = -((s * c.speed + (c.vx || 0)) * contact.nx + (k * c.speed + (c.vz || 0)) * contact.nz);
            if (vn > HIT.wakeParked && carHit.wakeParked(col.pref[id]) >= 0) continue;
          }
          let px = NaN, pz = 0;
          if (feel) {
            if (id >= col.P) { const q = (id - col.P) * 3; if (col.circ[q + 2] <= POST_R) { px = col.circ[q]; pz = col.circ[q + 1]; } }
            else { const q = id * 4, B = col.pbox; if (B[q + 2] - B[q] <= POST_BOX && B[q + 3] - B[q + 1] <= POST_BOX) { px = (B[q] + B[q + 2]) / 2; pz = (B[q + 1] + B[q + 3]) / 2; } }
          }
          if (px === px) {
            // where the post is across the car: off the centre line, push the car aside (round it)
            const lat = (px - c.x) * body.cos - (pz - c.z) * body.sin;
            if (Math.abs(lat) > POST_SIDE) {
              const s = lat > 0 ? -1 : 1, ex = s * body.cos, ez = -s * body.sin;     // away from the post, across the car
              const nx = contact.nx + ex * 0.9, nz = contact.nz + ez * 0.9, L = Math.hypot(nx, nz) || 1;
              contact.nx = nx / L; contact.nz = nz / L;
            }
          }
          c.x += contact.nx * contact.depth; c.z += contact.nz * contact.depth;
          const vn = onHit(c, contact.nx, contact.nz, contact.kind, handling);
          if (feel && nudge && !carHit?.S && contact.kind === KIND.car && vn > 0.02 && col.pref?.[id]) {
            // a parked car takes part of the hit: shoved along the push, turned by where it was hit
            const ref = col.pref[id], d = Math.min(0.25, vn * 0.03);
            const rx = c.x - ref.x, rz = c.z - ref.z, tq = (rx * -contact.nz - rz * -contact.nx);
            nudge(ref, -contact.nx * d, -contact.nz * d, Math.max(-0.06, Math.min(0.06, tq * 0.01 * vn)));
          }
          env.contacts++; any = true;
        }
        if (!any) break;
      }
      if (ledges && Number.isFinite(c.y) && (feel ? stepContact(c, body, ground, contact) : ledgeContact(c, body, ground, contact))) {
        c.x += contact.nx * contact.depth; c.z += contact.nz * contact.depth;
        onHit(c, contact.nx, contact.nz, contact.kind, handling);
        env.contacts++;
      }
      // moving things (the traffic, viewer/traffic/cityTraffic.js): env.dynamic(c, body, push) calls push per contact
      if (carHit) carHit.playerStep(c, body, step, env, push, two);
      else env.dynamic?.(c, body, push);
      for (let k = 0; k < mN; k++) {
        const o = k * 7;
        if (Number.isFinite(c.y) && (mbox[o + 5] > c.y + 1.6 || mbox[o + 5] + mbox[o + 6] < c.y + 0.2)) continue;   // (a bridge over / under)
        if (obbObb(c.x, c.z, c.heading, body.hx, body.hz, mbox[o], mbox[o + 1], mbox[o + 2], mbox[o + 3], Math.abs(mbox[o + 4]) + (mbox[o + 4] < 0 ? 1.5 : 0), mout)) push(c, mout.nx, mout.nz, Math.min(mout.depth, 0.5), KIND.wall);
      }
    },
  };
  return env;
}
