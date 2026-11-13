// The car's world for stepCar (carPhysics.js): the ground, and collisions against the collider sets (colliders.js)
// near the car. Candidates are gathered ONCE per frame from the 48 m cells round the car (radius = car + the distance
// it can travel this frame + a margin); the 120 Hz substeps then only test those.
import { gather, itemContact, heightClear, KIND } from "./colliders.js";
import { BODY, hit } from "./carPhysics.js";

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

/**
 * sets(x, z, r) -> array of collider sets (one per tile) that may hold items within r of (x, z)
 * ground(x, z) -> drivable height
 */
export function createCarEnv({ sets, ground, handling, waters = () => null, ledges = true }) {
  const near = [];
  const contact = { nx: 0, nz: 0, depth: 0, kind: 0 };
  const body = { hx: BODY.hx, hz: BODY.hz, cos: 1, sin: 0 };
  const push = (c, nx, nz, depth, kind) => {
    c.x += nx * depth; c.z += nz * depth;
    hit(c, nx, nz, kind, handling);
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
      const r = Math.hypot(BODY.hx, BODY.hz) + travel;
      for (const col of sets(c.x, c.z, r)) gather(col, c.x, c.z, r, near);
      env.tested = near.length / 2;
      env.contacts = 0;
    },
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
      body.hx = BODY.hx; body.hz = BODY.hz;                 // carModel.js fitBody may resize it to the model
      for (let pass = 0; pass < 2; pass++) {      // a second pass settles a push from one wall into another
        let any = false;
        for (let k = 0; k < near.length; k += 2) {
          if (heightClear(near[k], near[k + 1], c.y)) continue;                  // a platform / fence / parapet over or under the car
          if (!itemContact(near[k], near[k + 1], c.x, c.z, body, contact)) continue;
          c.x += contact.nx * contact.depth; c.z += contact.nz * contact.depth;
          hit(c, contact.nx, contact.nz, contact.kind, handling);
          env.contacts++; any = true;
        }
        if (!any) break;
      }
      if (ledges && Number.isFinite(c.y) && ledgeContact(c, body, ground, contact)) {
        c.x += contact.nx * contact.depth; c.z += contact.nz * contact.depth;
        hit(c, contact.nx, contact.nz, contact.kind, handling);
        env.contacts++;
      }
      // moving things (the traffic, viewer/traffic/cityTraffic.js): env.dynamic(c, body, push) calls push per contact
      env.dynamic?.(c, body, push);
    },
  };
  return env;
}
