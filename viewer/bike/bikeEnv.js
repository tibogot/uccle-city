// The bike's world for stepBike (bikePhysics.js): the ground query and the city's collider sets (viewer/drive/colliders.js,
// the very sets the police car uses) at bike scale. The bike is an oriented box (BIKE_BODY: 0.64 m across the bars,
// 1.48 m long) tested with the colliders' own exact box-vs-polygon / box-vs-circle contact (smallest push out);
// candidates are gathered round the bike when it has moved a metre (stepBike calls prepare).
//   - kerb islands (KIND.island) are in the drive surface: ridden (a step face in the ground stops the front wheel)
//   - height-banded pieces (walls with a top, garden walls, benches, hedges: colliders.js heightClear) are cleared when
//     the wheels are over their top: a hop over a log / a low wall works
//   - hedges are soft (drag), everything else is hard: bikeHit slides along it or crashes over crashSpeed
// Pure JS (no three).
import { gather, itemContact, heightClear, itemContactB, heightClearP, HC, KIND } from "../drive/colliders.js";
import { BIKE_BODY, bikeHit, bikeHitC } from "./bikePhysics.js";

/**
 * sets(x, z, r) -> collider sets that may hold items within r of (x, z) (one per tile; the lab: one)
 * ground(x, z, out) -> fills { h, nx, ny, nz, surf } (bikePhysics groundQuery makes one from a height function)
 */
/** sqrt(a^2 + b^2): not Math.hypot, which V8 does not inline: it boxes its result, an allocation a call (feel round 3) */
const hyp = (a, b) => Math.sqrt(a * a + b * b);
export function createBikeEnv({ sets = () => [], ground, dims = BIKE_BODY, onHit = bikeHit, edges = null, wallrides = null }) {
  const near = [];
  const contact = { nx: 0, nz: 0, depth: 0, kind: 0 };
  const body = { hx: dims.hx, hz: dims.hz, cos: 0.5, sin: 0.5, x: 0.5, z: 0.5 };
  const wheel = { hx: 0.1, hz: 0.15, cos: 0.5, sin: 0.5, x: 0.5, z: 0.5 };   // the low part of one wheel (for the low pieces)
  const camNear = [], camBox = { hx: 0.12, hz: 0.12, cos: 1, sin: 0 }, camHit = { nx: 0, nz: 0, depth: 0, kind: 0 };   // (solidAt)
  const env = {
    ground,
    groundP: ground.P || null,
    heightP: ground.hP || null,  // (the height alone, object form: the face scans)   // (the object form of the ground query: groundQuery's g.P - no doubles across calls)
    edges,             // the edge layer (bikeEdges.js: grinds, stalls; feel round 2) or null
    wallrides,         // wall-ride walls (the lab's park: bikePark.js PARK_WALLRIDES) or null
    near,
    tested: 0,
    prepare(s, reach = 3 + Math.sqrt(s.vx * s.vx + s.vz * s.vz) / 120) {
      near.length = 0;
      const r = hyp(dims.hx, dims.hz) + reach;
      for (const col of sets(s.x, s.z, r)) gather(col, s.x, s.z, r, near);
      env.tested = near.length / 2;
    },
    collide(s, B) {
      body.cos = Math.cos(s.heading); body.sin = Math.sin(s.heading); body.x = s.x; body.z = s.z;
      const rb = Math.sqrt(dims.hx * dims.hx + dims.hz * dims.hz) + 0.05;
      for (let pass = 0; pass < 2; pass++) {
        let any = false;
        for (let k = 0; k < near.length; k += 2) {
          const col = near[k], id = near[k + 1];
          if (id < col.P && col.pkind[id] === KIND.island) continue;
          // (feel round 4: a box / circle reject inline first - the shared item tests take doubles, which V8 boxes
          // when it cannot inline them: only the items the bike's circle touches are tested, no garbage riding past)
          if (id < col.P) { const o = id * 4, pb = col.pbox; if (s.x + rb < pb[o] || s.x - rb > pb[o + 2] || s.z + rb < pb[o + 1] || s.z - rb > pb[o + 3]) continue; }
          else { const c = (id - col.P) * 3, ci = col.circ, dx = s.x - ci[c], dz = s.z - ci[c + 1], rr = rb + ci[c + 2]; if (dx * dx + dz * dz > rr * rr) continue; }
          // a low piece with a top (a log, a low wall, a bench): each WHEEL against it, at its own height (the front
          // clears it first, then the rear); anything else: the whole bike's box
          if (id < col.P && col.ptop[id] < 50) {
            // (just off a grind, feel round 2: the wheels hung either side of the edge under its top; the edge's own
            // low piece is not a wall to them while they leave it)
            if (s.grindCD > 0) continue;
            let hitW = false;
            const ow = col.oneWay;
            for (let w = 0; w < 2 && !hitW; w++) {
              HC.y = s.wheelBot[w];
              if (heightClearP(col, id)) continue;
              wheel.cos = body.cos; wheel.sin = body.sin; wheel.x = s.wheelPos[w * 2]; wheel.z = s.wheelPos[w * 2 + 1];
              hitW = itemContactB(col, id, wheel, contact);
              // (round 3, the drop-off) a ONE-WAY piece (a ground solid's side panel: col.oneWay = its outward normal
              // per polygon) stops only a wheel coming from outside; a wheel leaving the solid's top falls past it.
              // Root cause: the panels caught a wheel rolling off a box's side and pushed it back in (stuck at the
              // edge, or "hit a wall" over 4.8 m/s). Only a push OUT (within 60 deg of the normal) counts: a panel is cut in
              // 25-50 cm pieces, and a wheel falling off diagonally was pushed out of a piece's END (along the side)
              if (hitW && ow && (ow[id * 2] !== 0 || ow[id * 2 + 1] !== 0) && contact.nx * ow[id * 2] + contact.nz * ow[id * 2 + 1] < 0.5) hitW = false;
            }
            if (!hitW) continue;
          } else {
            HC.y = s.yLow;
            if (heightClearP(col, id)) continue;
            body.x = s.x; body.z = s.z;
            if (!itemContactB(col, id, body, contact)) continue;
          }
          if (contact.kind === KIND.hedge) {
            if (pass === 0) { const k2 = Math.exp(-2.2 * 1 / 120); s.vx *= k2; s.vz *= k2; }
            continue;
          }
          const d = Math.min(contact.depth, 0.5);
          s.x += contact.nx * d; s.z += contact.nz * d;
          if (onHit === bikeHit) bikeHitC(s, contact, B); else onHit(s, contact.nx, contact.nz, contact.kind, B);
          s.envContacts++; any = true;
        }
        if (!any) break;
      }
    },
    /** (feel round 4, the camera) is the point (x, y, z) inside a collider: a building, a wall, a bench, a garden wall,
     *  a hedge, a tree, a post (kerb islands are ground: the camera's ground test has them)? */
    solidAt(x, y, z) {
      camNear.length = 0;
      for (const col of sets(x, z, 0.5)) gather(col, x, z, 0.3, camNear);
      for (let k = 0; k < camNear.length; k += 2) {
        const col = camNear[k], id = camNear[k + 1];
        if (id < col.P) {
          if (col.pkind[id] === KIND.island) continue;
          if (y > col.ptop[id] + 0.05 || y < col.pbase[id] - 0.05) continue;
        }
        if (itemContact(col, id, x, z, camBox, camHit)) return true;
      }
      return false;
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
