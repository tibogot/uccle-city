// THE CITY'S MOVING TRAFFIC (?traffic=1): viewer/traffic/traffic.js on the streamed tiles, wired to the rest:
//   tiles      each full tile's lane graph (tile worker, trafficGraph.js) is added when the tile loads, removed when
//              it unloads (its cars go with it: they are >= 500 m away by then, beyond the fleet's 420 m fade)
//   focus      the traffic lives within 470 m of the player (drive / walk / third person / fly) or the orbit target
//   obstacles  the drive-mode car (two points along its body) and the third-person walker: cars brake for them;
//              trams (tram 92): sample points along each body + the track just ahead of the nose where it crosses
//              other lanes (so cars wait at a tram crossing instead of driving through the tram)
//   colliders  drive mode: the traffic cars are oriented boxes (SAT box-box against the player's box, through the
//              drive env's `dynamic` hook); the walker: a collider source on the character's collision world
//   parking    the parked fleet's cars (viewer/carFleet.js) can pull out / be parked into
import { createTraffic } from "./traffic.js";
import { carFleet } from "../carFleet.js";

const CAR_KIND = 6;   // drive colliders: a car (hit() treats any kind the same)

export function createCityTraffic({ scene, renderer, camera, ground, night, focus, driver, getThird, getTram, log = console.log }) {
  const T = createTraffic({ scene, renderer, camera, ground, night });
  const sim = T.sim;
  sim.setParking(function* () { for (const r of carFleet.regs) yield* r.cars; }, (name) => T.types.findIndex((t) => t.name === name));
  sim.onPark = () => carFleet.touch();
  if (/[?&]trafficdebug=1/.test(location.search)) import("./trafficDebug.js").then(({ TrafficDebug }) => { T.debug = new TrafficDebug(scene, ground, sim.cap); });

  // ---- trams: body points + look-ahead, refreshed at 5 Hz (tramline's positions() / trackAt() allocate a little)
  const TR = { n: 0, x: new Float32Array(256), z: new Float32Array(256), vx: new Float32Array(256), vz: new Float32Array(256), cross: new Uint8Array(256) };
  const lastD = new Map();
  let tramT = 0;
  const refreshTrams = (now) => {
    const tl = getTram?.();
    TR.n = 0;
    if (!tl) return;
    const f = focus();
    const dtT = Math.max(0.05, (now - tramT) / 1000); tramT = now;
    for (const p of tl.positions()) {
      if ((p.x - f.x) ** 2 + (p.z - f.z) ** 2 > 520 * 520) continue;
      const prev = lastD.get(p.trip);
      const v = prev != null ? Math.max(-20, Math.min(20, (p.d - prev) / dtT)) : 0;
      lastD.set(p.trip, p.d);
      const dir = v >= 0 ? 1 : -1;
      for (let k = -2; k <= 9 && TR.n < 256; k++) {               // body: nose back over 32 m; ahead: 4 / 8 m (crossings)
        const dd = k < 0 ? p.d - k * 4 * dir : p.d - k * 4 * dir;
        const q = tl.trackAt(p.trip, k < 0 ? p.d + (-k) * 4 * dir : dd);
        if (!q) continue;
        const [x, z, yaw] = q, tx = Math.cos(yaw), tz = -Math.sin(yaw);
        const i = TR.n++;
        TR.x[i] = x; TR.z[i] = z; TR.vx[i] = tx * v; TR.vz[i] = tz * v; TR.cross[i] = k < 0 ? 1 : 0;
      }
    }
  };

  // ---- obstacles each step
  T.setObstacleSource((s) => {
    if (driver?.on && driver.state) {
      const c = driver.state, fx = Math.sin(c.heading), fz = Math.cos(c.heading), vx = fx * c.speed + (c.vx || 0), vz = fz * c.speed + (c.vz || 0);
      s.addObstacle(c.x + fx * 1.2, c.z + fz * 1.2, 1.15, vx, vz);
      s.addObstacle(c.x - fx * 1.2, c.z - fz * 1.2, 1.15, vx, vz);
    }
    const th = getThird?.();
    if (th?.on && th.tp) { const p = th.tp.ctl.pos, v = th.tp.ctl.vel; s.addObstacle(p[0], p[2], 0.9, v[0], v[2]); }
    for (let i = 0; i < TR.n; i++) s.addObstacle(TR.x[i], TR.z[i], 1.5, TR.vx[i], TR.vz[i], TR.cross[i]);
  });

  // ---- drive mode: the traffic cars as oriented boxes
  const boxes = new Float32Array(32 * 7), out = { nx: 0, nz: 0, depth: 0 };
  if (driver?.env) {
    driver.env.dynamic = (c, body, push) => {
      const n = T.boxesNear(c.x, c.z, 12, boxes);
      for (let k = 0; k < n; k++) {
        const o = k * 7;
        if (obbObb(c.x, c.z, c.heading, body.hx, body.hz, boxes[o], boxes[o + 1], boxes[o + 2], boxes[o + 3], boxes[o + 4], out)) push(c, out.nx, out.nz, out.depth, CAR_KIND);
      }
    };
  }
  // ---- the walker: a collider source (capsule vs the car boxes; rays pass)
  const charBoxes = new Float32Array(32 * 7);
  const source = {
    enabled: true,
    capsule(q, contacts) {
      const ax = q[0], ay = q[1], az = q[2], by = q[4], r = q[6];
      const n = T.boxesNear(ax, az, 8, charBoxes);
      for (let k = 0; k < n; k++) {
        const o = k * 7, bx = charBoxes[o], bz = charBoxes[o + 1], yaw = charBoxes[o + 2], hw = charBoxes[o + 3], hl = charBoxes[o + 4], y0 = charBoxes[o + 5], h = charBoxes[o + 6];
        if (ay - r > y0 + h || by + r < y0) continue;
        const cs = Math.cos(yaw), sn = Math.sin(yaw), dx = ax - bx, dz = az - bz;
        const u = dx * cs - dz * sn, w = dx * sn + dz * cs;               // box frame: u across (left axis), w along
        const cu = Math.max(-hw, Math.min(hw, u)), cw = Math.max(-hl, Math.min(hl, w));
        let nu = u - cu, nw = w - cw, d = Math.hypot(nu, nw), depth;
        if (d > 1e-6) { if (d >= r) continue; nu /= d; nw /= d; depth = r - d; }
        else if (hw - Math.abs(u) < hl - Math.abs(w)) { nu = Math.sign(u) || 1; nw = 0; depth = hw - Math.abs(u) + r; }
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
  let hooked = null;

  let last = performance.now(), lastTram = 0;
  const update = (camPos, cam) => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (now - lastTram > 200) {
      refreshTrams(now); lastTram = now;
      const tl = getTram?.();
      if (tl && !T.hourLocked) sim.params.hour = tl.clockSecs / 3600;     // density follows the city clock (tram 92's)
    }
    const th = getThird?.();
    if (th?.world && hooked !== th.world) { th.world.add(source); hooked = th.world; }
    T.update(dt, cam || camera, focus());
  };
  return { ...T, T, update, addTile: T.addTile, removeTile: T.removeTile };
}

/** Separating axes for two oriented boxes in xz (heading: forward = (sin h, cos h); hx across, hz along). On overlap,
 *  out = the push of box A out of box B (unit normal + depth). */
const A = new Float64Array(4), B = new Float64Array(4);
function obbObb(ax, az, ah, ahx, ahz, bx, bz, bh, bhx, bhz, out) {
  A[0] = Math.cos(ah); A[1] = -Math.sin(ah); A[2] = -A[1]; A[3] = A[0];   // A's across axis, along axis
  B[0] = Math.cos(bh); B[1] = -Math.sin(bh); B[2] = -B[1]; B[3] = B[0];
  const dx = ax - bx, dz = az - bz;
  let best = Infinity, nx = 0, nz = 0;
  for (let k = 0; k < 4; k++) {
    const L = k < 2 ? A : B, i = (k % 2) * 2, ux = L[i], uz = L[i + 1];
    const ra = ahx * Math.abs(A[0] * ux + A[1] * uz) + ahz * Math.abs(A[2] * ux + A[3] * uz);
    const rb = bhx * Math.abs(B[0] * ux + B[1] * uz) + bhz * Math.abs(B[2] * ux + B[3] * uz);
    const dist = dx * ux + dz * uz, ov = ra + rb - Math.abs(dist);
    if (ov <= 0) return false;
    if (ov < best) { best = ov; const s = dist >= 0 ? 1 : -1; nx = ux * s; nz = uz * s; }
  }
  out.nx = nx; out.nz = nz; out.depth = best + 1e-4;
  return true;
}
