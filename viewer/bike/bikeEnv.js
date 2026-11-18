// The bike's world for stepBike (bikePhysics.js): the ground query and the city's collider sets (viewer/drive/colliders.js,
// the very sets the police car uses) at bike scale. The bike is an oriented box (BIKE_BODY: 0.64 m across the bars,
// 1.48 m long) tested with the colliders' own exact box-vs-polygon / box-vs-circle contact (smallest push out);
// candidates are gathered round the bike when it has moved a metre (stepBike calls prepare).
//   - kerb islands (KIND.island) are in the drive surface: ridden (a step face in the ground stops the front wheel)
//   - height-banded pieces (walls with a top, garden walls, benches, hedges: colliders.js heightClear) are cleared when
//     the wheels are over their top: a hop over a log / a low wall works
//   - hedges are soft (drag), everything else is hard: bikeHit slides along it or crashes over crashSpeed
// Pure JS (no three).
import { gather, itemContact, heightClear, KIND } from "../drive/colliders.js";
import { BIKE_BODY, bikeHit } from "./bikePhysics.js";

/**
 * sets(x, z, r) -> collider sets that may hold items within r of (x, z) (one per tile; the lab: one)
 * ground(x, z, out) -> fills { h, nx, ny, nz, surf } (bikePhysics groundQuery makes one from a height function)
 */
export function createBikeEnv({ sets = () => [], ground, dims = BIKE_BODY, onHit = bikeHit }) {
  const near = [];
  const contact = { nx: 0, nz: 0, depth: 0, kind: 0 };
  const body = { hx: dims.hx, hz: dims.hz, cos: 1, sin: 0 };
  const wheel = { hx: 0.1, hz: 0.15, cos: 1, sin: 0 };   // the low part of one wheel (for the low pieces)
  const env = {
    ground,
    near,
    tested: 0,
    prepare(s, reach) {
      near.length = 0;
      const r = Math.hypot(dims.hx, dims.hz) + reach;
      for (const col of sets(s.x, s.z, r)) gather(col, s.x, s.z, r, near);
      env.tested = near.length / 2;
    },
    collide(s, B) {
      body.cos = Math.cos(s.heading); body.sin = Math.sin(s.heading);
      for (let pass = 0; pass < 2; pass++) {
        let any = false;
        for (let k = 0; k < near.length; k += 2) {
          const col = near[k], id = near[k + 1];
          if (id < col.P && col.pkind[id] === KIND.island) continue;
          // a low piece with a top (a log, a low wall, a bench): each WHEEL against it, at its own height (the front
          // clears it first, then the rear); anything else: the whole bike's box
          if (id < col.P && col.ptop[id] < 50) {
            let hitW = false;
            for (let w = 0; w < 2 && !hitW; w++) {
              if (heightClear(col, id, s.wheelBot[w])) continue;
              wheel.cos = body.cos; wheel.sin = body.sin;
              hitW = itemContact(col, id, s.wheelPos[w * 2], s.wheelPos[w * 2 + 1], wheel, contact);
            }
            if (!hitW) continue;
          } else {
            if (heightClear(col, id, s.yLow)) continue;
            if (!itemContact(col, id, s.x, s.z, body, contact)) continue;
          }
          if (contact.kind === KIND.hedge) {
            if (pass === 0) { const k2 = Math.exp(-2.2 * 1 / 120); s.vx *= k2; s.vz *= k2; }
            continue;
          }
          const d = Math.min(contact.depth, 0.5);
          s.x += contact.nx * d; s.z += contact.nz * d;
          onHit(s, contact.nx, contact.nz, contact.kind, B);
          s.envContacts++; any = true;
        }
        if (!any) break;
      }
    },
    /** is the bike's box inside a hard collider now (the get-up spot)? */
    insideSolid(s) {
      env.prepare(s, 1);
      body.cos = Math.cos(s.heading); body.sin = Math.sin(s.heading);
      for (let k = 0; k < near.length; k += 2) {
        const col = near[k], id = near[k + 1];
        if (id < col.P && (col.pkind[id] === KIND.island || col.pkind[id] === KIND.hedge)) continue;
        if (heightClear(col, id, s.yLow)) continue;
        if (itemContact(col, id, s.x, s.z, body, contact) && contact.depth > 0.05) return true;
      }
      return false;
    },
  };
  return env;
}
