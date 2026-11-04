// The car's world for stepCar (carPhysics.js): the ground, and collisions against the collider sets (colliders.js)
// near the car. Candidates are gathered ONCE per frame from the 48 m cells round the car (radius = car + the distance
// it can travel this frame + a margin); the 120 Hz substeps then only test those.
import { gather, itemContact } from "./colliders.js";
import { BODY, hit } from "./carPhysics.js";

/**
 * sets(x, z, r) -> array of collider sets (one per tile) that may hold items within r of (x, z)
 * ground(x, z) -> drivable height
 */
export function createCarEnv({ sets, ground, handling }) {
  const near = [];
  const contact = { nx: 0, nz: 0, depth: 0, kind: 0 };
  const body = { hx: BODY.hx, hz: BODY.hz, cos: 1, sin: 0 };
  const env = {
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
    collide(c) {
      body.cos = Math.cos(c.heading); body.sin = Math.sin(c.heading);
      for (let pass = 0; pass < 2; pass++) {      // a second pass settles a push from one wall into another
        let any = false;
        for (let k = 0; k < near.length; k += 2) {
          if (!itemContact(near[k], near[k + 1], c.x, c.z, body, contact)) continue;
          c.x += contact.nx * contact.depth; c.z += contact.nz * contact.depth;
          hit(c, contact.nx, contact.nz, contact.kind, handling);
          env.contacts++; any = true;
        }
        if (!any) break;
      }
    },
  };
  return env;
}
