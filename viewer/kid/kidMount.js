// ON FOOT <-> ON THE BIKE (docs/KID.md "Mount"): a small state machine, pure JS (no three: node-tested in
// tools/kid/kidTest.mjs), and the parked bike's motion while nobody rides it.
//
//   foot ──E near the bike──> mounting (0.45 s) ──> riding ──E slow──> dismounting (0.4 s) ──> foot
//                                                     │  (too fast: "tooFast", nothing happens)
//                                                     └─ the bike crashes ──> crashed (tumble, get-up) ──> mounting ──> riding
//   E near a LYING bike: the kid picks it up (the bike stands, then the mount).
// Getting off: stopped (< MOUNT.standStill m/s) the bike stays STANDING (a game's kickstand: it leans a little on its
// pedal); rolling (up to MOUNT.dismountMax) the kid steps off and the bike rolls on and LIES DOWN.
export const MOUNT = {
  near: 1.3,           // m: how close to the bike (its side) E mounts
  mountTime: 0.45, dismountTime: 0.40, pickUpTime: 0.5,
  dismountMax: 2.6,    // m/s: faster than this E does nothing (a banner says so)
  standStill: 0.45,    // m/s: slower = the bike is left standing
  side: 0.55,          // m: where the kid stands, left of the bike's centre line
  restLean: 0.12,      // rad: a parked standing bike's lean (on its pedal)
  rollDecel: 3.0,      // m/s^2: a rolling, riderless bike slowing down
  fallTime: 0.8,       // s: a riderless rolling bike falls over in this time
  tumble: 1.6,         // s: the crash tumble before the get-up (the bike physics gets up at BIKE.respawn)
};

export function createMount(state = "foot") {
  return { state, t: 0, park: { mode: "standing", lie: 1, t: 0 }, events: [], from: null };
}

const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
/** the spot where the kid stands to get on / after getting off: on the bike's left */
export function mountSpot(bike, out = { x: 0, z: 0, yaw: 0 }) {
  const lx = Math.cos(bike.heading), lz = -Math.sin(bike.heading);
  out.x = bike.x + lx * MOUNT.side; out.z = bike.z + lz * MOUNT.side; out.yaw = bike.heading;
  return out;
}

/**
 * One frame. inp: { e: E pressed this frame }, kid: { x, z } (feet, on foot), bike: { x, z, heading, speed (m/s), crashed,
 * air, lying }. Returns M (M.events: what happened this frame: "mount", "riding", "dismount", "foot", "tooFast", "pickUp",
 * "crash", "getUp", "far").
 */
export function stepMount(M, inp, kid, bike, dt) {
  const E = M.events; E.length = 0;
  M.t += dt;
  const go = (st, ev) => { M.state = st; M.t = 0; if (ev) E.push(ev); };
  switch (M.state) {
    case "foot": {
      if (!inp.e) break;
      const sp = mountSpot(bike);
      const near = Math.min(dist2(kid.x, kid.z, sp.x, sp.z), dist2(kid.x, kid.z, bike.x, bike.z)) < MOUNT.near * MOUNT.near;
      if (!near) { E.push("far"); break; }
      if (bike.lying || M.park.mode === "lying" || M.park.mode === "rolling") { go("pickUp", "pickUp"); break; }
      M.from = "foot"; go("mounting", "mount");
      break;
    }
    case "pickUp":
      if (M.t >= MOUNT.pickUpTime) { M.park.mode = "standing"; M.from = "foot"; go("mounting", "mount"); }
      break;
    case "mounting":
      if (M.t >= MOUNT.mountTime) go("riding", "riding");
      break;
    case "riding":
      if (bike.crashed) { go("crashed", "crash"); break; }
      if (inp.e) {
        if (bike.air || Math.abs(bike.speed) > MOUNT.dismountMax) { E.push("tooFast"); break; }
        M.park.mode = Math.abs(bike.speed) < MOUNT.standStill ? "standing" : "rolling";
        M.park.t = 0; M.park.lie = bike.lean >= 0 ? 1 : -1;
        go("dismounting", "dismount");
      }
      break;
    case "dismounting":
      if (M.t >= MOUNT.dismountTime) go("foot", "foot");
      break;
    case "crashed":
      if (!bike.crashed) { M.from = "crash"; go("mounting", "getUp"); }
      break;
  }
  return M;
}

/** is the bike driven by its physics this frame (somebody on it, or the crash slide) */
export const ridden = (M) => M.state === "riding" || M.state === "mounting" || M.state === "crashed";

/**
 * The riderless bike: standing still (a little lean), or rolling on, slowing, and falling over onto its side. Writes
 * the bike state's pose (x, z, lean, speed) and keeps its previous step equal (no interpolation jump). ground(x, z): y.
 */
export function parkStep(M, s, dt, groundY) {
  const P = M.park, p = s.prev;
  P.t += dt;
  if (P.mode === "rolling") {
    const v = Math.hypot(s.vx, s.vz);
    if (v > 1e-4) { const k = Math.max(0, v - MOUNT.rollDecel * dt) / v; s.vx *= k; s.vz *= k; }
    s.x += s.vx * dt; s.z += s.vz * dt;
    const u = Math.min(1, P.t / MOUNT.fallTime);
    s.lean = P.lie * 1.45 * u * u;
    if (u >= 1 && Math.hypot(s.vx, s.vz) < 0.05) { P.mode = "lying"; s.vx = s.vz = 0; }
  } else if (P.mode === "lying") {
    s.lean = P.lie * 1.45; s.vx = s.vz = 0;
  } else {
    s.vx = s.vz = 0; s.lean += (MOUNT.restLean * (P.lie || 1) - s.lean) * Math.min(1, dt * 6);
  }
  s.vy = 0; s.pitch *= Math.exp(-4 * dt); s.legs = 0; s.legVel = 0; s.preload = 0; s.sprint = 0; s.manual = 0; s.pushing = false;
  if (groundY !== undefined) {
    // (the CoM over the ground: upright = rest height, lying = on its side)
    const lieK = Math.min(1, Math.abs(s.lean) / 1.45);
    s.y = groundY + (0.92 * (1 - lieK) + 0.25 * lieK);
  }
  p.x = s.x; p.y = s.y; p.z = s.z; p.heading = s.heading; p.lean = s.lean; p.pitch = s.pitch;
  s.alpha = 1;
  return s;
}

/** the keys on foot (viewer/character/input.js) and the one new key: they share a MEANING with the bike's (bikeInput.js
 *  KEYS) where they overlap, and E is free in both (tools/kid/kidTest.mjs checks it) */
export const FOOT_KEYS = {
  move: ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],   // bike: pedal / brake / steer
  run: ["ShiftLeft", "ShiftRight"],    // bike: sprint (stand up)
  jump: ["Space"],                      // bike: crouch + hop
  crouch: ["KeyC"],                     // bike: pump (crouch / extend)
};
export const KID_KEYS = { mount: ["KeyE"] };
