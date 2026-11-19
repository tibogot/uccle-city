// THE VILLO STATIONS as a vehicle source (motorbike round 2, docs/MOTO.md): walk up to a docked bike (viewer/streetkit:
// the street kit's station bikes, data/streetkit), E takes it (that instance leaves the street kit's pool and its
// collider; the rideable bike, viewer/moto/motoModel.js createVillo, rolls out of the dock); riding, E at any station's
// free dock docks it back (the ridden bike stays there, riderless, until another one is taken).
//   the street kit's instances: cityStreetKit.tiles.get(name).inst.villo_bike / villo_dock (x y z yaw v0..v3, stride 8);
//   a bike's origin is its FRONT tyre contact and it runs toward its local +z (rear: toward the road); a dock's bike
//   stands 0.42 m out from the dock post (tools/streetkit/build_streetkit.py)
// No per-frame allocation in near() / freeDock(): plain loops over the loaded tiles' arrays (a few hundred docks).
import { cityStreetKit } from "../streetkit/cityStreetKit.js";

const FRONT_OUT = 0.42;           // dock post -> the docked bike's front tyre contact (m)
const taken = new Set();          // "tile:i" of the kit bikes the player took (hidden for good)
const hit = { x: 0, y: 0, z: 0, yaw: 0, tile: null, i: -1, d: Infinity };

/** the nearest docked (visible) kit bike within r of (x, z) -> hit (reused) or null */
export function nearBike(x, z, r = 2.2) {
  hit.d = Infinity; hit.tile = null;
  for (const [name, t] of cityStreetKit.tiles) {
    const a = t.inst?.villo_bike;
    if (!a) continue;
    for (let i = 0; i < a.length; i += 8) {
      // (the bike's middle: 0.56 m from its front contact toward its rear)
      const yaw = a[i + 3], mx = a[i] + Math.sin(yaw) * 0.56, mz = a[i + 2] + Math.cos(yaw) * 0.56;
      const d = Math.hypot(mx - x, mz - z);
      // (props: a bike knocked out of its dock is not there)
      if (d < r && d < hit.d && !taken.has(`${name}:${i / 8}`) && !t.bikeRefs?.[i / 8]?.hidden) { hit.d = d; hit.x = a[i]; hit.y = a[i + 1]; hit.z = a[i + 2]; hit.yaw = yaw; hit.tile = name; hit.i = i / 8; }
    }
  }
  return hit.tile ? hit : null;
}

const dock = { x: 0, y: 0, z: 0, yaw: 0, d: Infinity, ok: false };
/** the nearest FREE dock (no kit bike, no parked player bike in it) within r of (x, z) -> dock (reused) or null.
 *  dock.x / z / y / yaw = where the docked bike's FRONT contact goes and its yaw (rear toward +z local) */
export function freeDock(x, z, r = 3.5, parked = null) {
  dock.d = Infinity; dock.ok = false;
  for (const [name, t] of cityStreetKit.tiles) {
    const D = t.inst?.villo_dock, B = t.inst?.villo_bike;
    if (!D) continue;
    for (let i = 0; i < D.length; i += 8) {
      const yaw = D[i + 3], fx = D[i] + Math.sin(yaw) * FRONT_OUT, fz = D[i + 2] + Math.cos(yaw) * FRONT_OUT;
      const mx = fx + Math.sin(yaw) * 0.56, mz = fz + Math.cos(yaw) * 0.56;
      const d = Math.hypot(mx - x, mz - z);
      if (d >= r || d >= dock.d) continue;
      let busy = false;
      if (B) for (let j = 0; j < B.length && !busy; j += 8) busy = (B[j] - fx) ** 2 + (B[j + 2] - fz) ** 2 < 0.25 && !taken.has(`${name}:${j / 8}`) && !t.bikeRefs?.[j / 8]?.prop?.state;
      if (!busy && parked) busy = (parked.x - fx) ** 2 + (parked.z - fz) ** 2 < 0.25;
      if (busy) continue;
      dock.d = d; dock.ok = true; dock.x = fx; dock.z = fz; dock.y = D[i + 1] + 0.01; dock.yaw = yaw;
    }
  }
  return dock.ok ? dock : null;
}

/** take a kit bike out of the street kit: its drawn instance (the stream source's matrix zeroed, the pools re-gathered)
 *  and its collider (the stand-in's ref, see cityStreetKit.addTile / driveMode.js featureColliders) */
export function takeBike(h) {
  const key = `${h.tile}:${h.i}`;
  if (taken.has(key)) return false;
  taken.add(key);
  const t = cityStreetKit.tiles.get(h.tile);
  const ref = t?.bikeRefs?.[h.i];
  if (ref) ref.hidden = true;
  const st = cityStreetKit.streamer?.tiles.get(h.tile)?.srcs?.villo_bike;
  if (st) {
    const C = st.cen, M = st.cols.instanceMatrix;
    for (let j = 0; j < st.n; j++) if (Math.abs(C[j * 4] - h.x) < 0.02 && Math.abs(C[j * 4 + 2] - h.z) < 0.02) { M.fill(0, j * 16, j * 16 + 16); break; }
    cityStreetKit.streamer.dirty = true;
  }
  return true;
}

/** the rideable bike's pose for a kit bike's front contact (x, z) and yaw: its middle, its heading (toward the dock) */
export function poseOf(x, z, yaw, out = {}) {
  out.x = x + Math.sin(yaw) * 0.56; out.z = z + Math.cos(yaw) * 0.56;
  out.heading = yaw + Math.PI;                 // (the ridden bike's forward = the kit bike's -z: its front, into the dock)
  return out;
}
export const villoStats = () => ({ taken: taken.size });
