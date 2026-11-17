// THE CALM CAR CAMERA (car control round, docs/CARCTL.md; ?carctl=old = the police-feel camera, chaseCamera.js
// updateCar). Pure JS (no three: node tests run it, tools/carctlTest.mjs), no allocation per frame.
// Owner, 2026-11-17: "why is the camera moving so much with the car". Round 2 hung the boom on the BODY: c.y and the
// plate's pitch (every spring bounce, kerb, dive and squat went into the picture), eased its azimuth after the
// velocity (a slide swung the view), led the aim into turns by the yaw rate, leaned the horizon, stretched with the
// pedals and widened the fov by 7 deg. Now (Forza Horizon / GTA V chase cams, the critically damped "smooth damp" of
// Game Programming Gems 4 / Unity SmoothDamp):
//   - the boom's origin is the car's x / z (rigid: the car never drifts in the frame) and the ROAD's height under the
//     wheels (c.roadY, not the body), critically damped: no suspension in the picture;
//   - its azimuth is a critically damped spring on the car's HEADING (a short lag: the car turns a little in the frame,
//     then the view follows; no overshoot); reversing: the same, the view stays behind;
//   - its pitch follows the road's slope gently (a climb tilts the view up the street), never the body's;
//   - no lean, no aim lead, no pedal stretch; fov +2 deg and the boom +0.4 m at most, slowly with speed;
//   - walls / trunks: the boom snaps in at once, eases back out (no flicker in and out).

export const CTL_CAM = {
  chase: { dist: 5.8, height: 1.9, aimAhead: 5.5, aimHeight: 1.1 },
  far: { dist: 8.4, height: 2.8, aimAhead: 6.5, aimHeight: 1.25 },
  yawW: 6,            // rad/s: the azimuth spring (critically damped; ~0.33 s to settle a step, lag 2 r / w in a steady turn)
  yW: 4.5,            // the road height under the car (+ a slope feed-forward: no lag on a climb)
  pitchW: 2.2, pitchShare: 0.7,   // the road's slope into the boom (share)
  speedW: 1.2, pullBack: 0.012, pullBackMax: 0.4, fovPerMs: 0.08, fovFrom: 10, fovMax: 2,
  wallOut: 3,         // 1/s: the boom easing back out after a wall pulled it in
  fov: 60,
};

/** critically damped step of s[k] toward target (s[k + 1] = its velocity); Game Programming Gems 4 ch. 1.10 */
function damp(s, k, target, w, dt) {
  const x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const ch = s[k] - target, tmp = (s[k + 1] + w * ch) * dt;
  s[k + 1] = (s[k + 1] - w * tmp) * e;
  s[k] = target + (ch + tmp) * e;
}

export function createCtlCam() {
  // [yaw, yawV, y, yV, pitch, pitchV, speed, speedV]
  return { s: new Float64Array(8), wall: 1, first: true, pos: { x: 0, y: 0, z: 0 }, look: { x: 0, y: 0, z: 0 }, fov: CTL_CAM.fov };
}

/**
 * One frame. c: the car state (x, z, heading, speed, vx, vz, roadY / y, roadPitch / slopePitch); mode "chase" | "far" |
 * "bonnet" | "bumper"; drag { yaw, pitch }; zoom; ground(x, z); insideWall(x, z) optional. Writes st.pos, st.look, st.fov.
 */
export function stepCtlCam(st, c, dt, mode, ground, insideWall = null, drag = null, zoom = 1, K = CTL_CAM) {
  const s = st.s;
  const roadY = Number.isFinite(c.roadY) ? c.roadY : c.y, roadP = c.roadPitch ?? c.slopePitch ?? 0;
  const v = Math.hypot(c.speed, c.vx, c.vz);
  if (st.first || !(dt > 0)) {
    s.fill(0); s[0] = c.heading; s[2] = roadY; s[4] = roadP; s[6] = v; st.wall = 1; st.first = false;
  }
  if (dt > 0) {
    let tY = c.heading;
    tY = s[0] + Math.atan2(Math.sin(tY - s[0]), Math.cos(tY - s[0]));   // (the near way round)
    damp(s, 0, tY, K.yawW, dt);
    if (Math.abs(s[0]) > 1e4) s[0] = Math.atan2(Math.sin(s[0]), Math.cos(s[0]));
    // (a teleport / reset: re-seat)
    if (Math.abs(roadY - s[2]) > 6) { s[2] = roadY; s[3] = 0; }
    // (feed-forward: on a steady slope the road climbs at speed x sin(slope): no lag behind a climbing car)
    damp(s, 2, roadY + Math.max(-3, Math.min(3, c.speed * Math.sin(s[4]))) * 2 / K.yW, K.yW, dt);
    damp(s, 4, roadP, K.pitchW, dt);
    damp(s, 6, v, K.speedW, dt);
  }
  const yaw = s[0] + (drag ? drag.yaw : 0), y0 = s[2], pitch = s[4] * K.pitchShare, sv = Math.max(0, s[6]);
  const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
  st.fov = K.fov + Math.min(K.fovMax, Math.max(0, sv - K.fovFrom) * K.fovPerMs);
  const P = st.pos, A = st.look;
  if (mode === "bumper" || mode === "bonnet") {
    const bon = mode === "bonnet", ahead = bon ? 0.9 : 2.3, hy = bon ? 1.32 : 0.55;
    const sh = Math.sin(c.heading), ch = Math.cos(c.heading), sp = Math.sin(s[4]);
    P.x = c.x + sh * ahead; P.z = c.z + ch * ahead; P.y = y0 + hy + sp * ahead;
    const L = 25, s2 = Math.sin(c.heading + (drag ? drag.yaw : 0)), c2 = Math.cos(c.heading + (drag ? drag.yaw : 0));
    A.x = P.x + s2 * L; A.z = P.z + c2 * L; A.y = P.y - (bon ? 1.1 : 0.4) + sp * L;
    return st;
  }
  const V = mode === "far" ? K.far : K.chase;
  const dist = (V.dist + Math.min(K.pullBackMax, sv * K.pullBack)) * zoom;
  // walls: in at once, out eased
  let f = 1;
  if (insideWall) for (let k = 0; k < 8 && insideWall(c.x - sinY * dist * f, c.z - cosY * dist * f); k++) f *= 0.8;
  st.wall = f < st.wall ? f : st.wall + (f - st.wall) * (1 - Math.exp(-K.wallOut * Math.max(0, dt)));
  const d = dist * st.wall;
  P.x = c.x - sinY * d; P.z = c.z - cosY * d;
  const hgt = V.height * Math.sqrt(zoom) + (drag ? drag.pitch * d * 0.8 : 0);
  P.y = y0 + hgt - Math.sin(pitch) * d;
  const gy = ground(P.x, P.z) + 0.6;
  if (P.y < gy) P.y = gy;
  const ah = V.aimAhead * zoom;
  A.x = c.x + sinY * ah; A.z = c.z + cosY * ah; A.y = y0 + V.aimHeight + Math.sin(pitch) * ah;
  return st;
}
