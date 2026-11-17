// MOVING OBSTACLES on rails (car control round, docs/CARCTL.md): the STIB trams (tramline.js bodies) and the SNCB trains
// (rail/trains.js bodies) as oriented boxes, solid for the player's car / two-wheelers (carEnv.js movers) and the
// third-person walker (a collider source like cityTraffic.js's). Owner playtest 2026-11-17: "the car drives THROUGH the
// trams": the rail vehicles were only obstacles for the traffic sim (cityTraffic.js TR), never colliders.
// A rail vehicle is kinematic: it is never pushed; the car is pushed out and slides / bounces (carPhysics.js hitSlide).
// Pure JS, no allocation per frame (the boxes go into the caller's Float32Array).

/** sources: [() => { bodies(x, z, r, out, offset) -> n } | null] */
export function createRailMovers(sources) {
  return {
    /** the boxes within r of (x, z) into out (7 floats each: x, z, heading, half width, half length, y0, height; a
     *  NEGATIVE half length = an inner box of a body (seams: never pushed out along the body there) */
    bodies(x, z, r, out) {
      let n = 0;
      for (const get of sources) {
        const s = get();
        if (s?.bodies) n += s.bodies(x, z, r, out, n * 7);
      }
      return n;
    },
  };
}

/** the walker's collider source (character/ world.add): capsule vs the rail boxes; rays pass */
export function railMoverSource(movers) {
  const boxes = new Float32Array(48 * 7);
  return {
    enabled: true,
    capsule(q, contacts) {
      const ax = q[0], ay = q[1], az = q[2], by = q[4], r = q[6];
      const n = movers.bodies(ax, az, 6, boxes);
      for (let k = 0; k < n; k++) {
        const o = k * 7, bx = boxes[o], bz = boxes[o + 1], yaw = boxes[o + 2], hw = boxes[o + 3], inner = boxes[o + 4] < 0, hl = Math.abs(boxes[o + 4]), y0 = boxes[o + 5], h = boxes[o + 6];
        if (ay - r > y0 + h || by + r < y0) continue;
        const cs = Math.cos(yaw), sn = Math.sin(yaw), dx = ax - bx, dz = az - bz;
        const u = dx * cs - dz * sn, w = dx * sn + dz * cs;
        const cu = Math.max(-hw, Math.min(hw, u)), cw = Math.max(-hl, Math.min(hl, w));
        let nu = u - cu, nw = w - cw, d = Math.hypot(nu, nw), depth;
        if (d > 1e-6) { if (d >= r) continue; nu /= d; nw /= d; depth = r - d; }
        else if (inner || hw - Math.abs(u) < hl - Math.abs(w)) { nu = Math.sign(u) || 1; nw = 0; depth = hw - Math.abs(u) + r; }
        else { nu = 0; nw = Math.sign(w) || 1; depth = hl - Math.abs(w) + r; }
        const nx = nu * cs + nw * sn, nz = -nu * sn + nw * cs;
        const so = contacts.slot();
        if (so < 0) return;
        const D = contacts.d;
        D[so] = nx; D[so + 1] = 0; D[so + 2] = nz; D[so + 3] = depth; D[so + 4] = bx + (cu * cs + cw * sn); D[so + 5] = ay; D[so + 6] = bz + (-cu * sn + cw * cs); D[so + 7] = 0; D[so + 8] = 5;
      }
    },
    raycast() {},
  };
}
