// ?roads=surface, main thread: things that stand on the street, put on the MEASURED street (viewer/surfaces.js data
// from the tile worker: the class raster, the kerb lines, the surveyed bollards).
//   lift(x, z)      how high the measured surface is above the road level here (sidewalk / square kerb height)
//   placeLamp(s)    a lamp site of viewer/lamps.js moved onto the sidewalk, 0.5 m behind the nearest kerb, arm to the road
//   placeCar(...)   a parked car of viewer/cars.js moved against the nearest kerb, in the roadway, along the kerb
//   bollards(...)   the low green Uccle bollards at their UrbIS Topo positions (CR5702P / CR57L), one draw per tile
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RAISE, SURF_CLASS } from "./surfaces.js";

const CARRIAGE = new Set([SURF_CLASS.roadway, SURF_CLASS.tramRoad, SURF_CLASS.parking]);

export function streetFit(data) {
  const g = data.grid;
  const classAt = (x, z) => {
    const i = Math.floor((x - g.x0) / g.step), j = Math.floor((z - g.z0) / g.step);
    return i >= 0 && j >= 0 && i < g.nx && j < g.nz ? g.data[j * g.nx + i] - 1 : -1;
  };
  const lift = (x, z) => { const c = classAt(x, z); return c >= 0 ? RAISE[c] : 0; };
  // kerb segments in an 8 m grid
  const segs = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  for (const l of data.kerbs || []) for (let k = 1; k < l.length; k++) {
    const [ax, az] = l[k - 1], [bx, bz] = l[k];
    for (let i = Math.floor(Math.min(ax, bx) / 8); i <= Math.floor(Math.max(ax, bx) / 8); i++)
      for (let j = Math.floor(Math.min(az, bz) / 8); j <= Math.floor(Math.max(az, bz) / 8); j++) {
        const kk = key(i, j);
        if (!segs.has(kk)) segs.set(kk, []);
        segs.get(kk).push([ax, az, bx, bz]);
      }
  }
  /** nearest kerb point within r: { x, z, tx, tz (tangent), lx, lz (normal to the raised side), d } */
  const nearKerb = (x, z, r = 8) => {
    let best = null, bd = r * r;
    const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8), n = Math.ceil(r / 8);
    for (let di = -n; di <= n; di++) for (let dj = -n; dj <= n; dj++) for (const [ax, az, bx, bz] of segs.get(key(i0 + di, j0 + dj)) || []) {
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const px = ax + dx * t, pz = az + dz * t, d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < bd) { bd = d2; const L = Math.sqrt(l2); best = { x: px, z: pz, tx: dx / L, tz: dz / L, lx: -dz / L, lz: dx / L, d: Math.sqrt(d2) }; }
    }
    return best;
  };

  /** lamps.js site {x, z, yaw}: onto the sidewalk 0.5 m behind the nearest kerb, the arm (local -z) toward the
   *  road; null if there is no raised surface there */
  const placeLamp = (s) => {
    const k = nearKerb(s.x, s.z, 10);
    if (!k) return null;
    for (const back of [0.5, 0.35, 0.7]) {
      const x = k.x + k.lx * back, z = k.z + k.lz * back;
      if (RAISE[classAt(x, z)] > 0) return { ...s, x, z, yaw: Math.atan2(k.lx, k.lz) };     // lamps.js: yaw = atan2(n) with n from the road to the lamp
    }
    return null;
  };

  /** cars.js candidate: against the nearest kerb (1.05 m out into the roadway, along the kerb, the way it was
   *  facing); null unless the whole car stands on carriageway */
  const placeCar = (x0, z0, yaw0) => {
    const k = nearKerb(x0, z0, 6);
    if (!k) return null;
    const x = k.x - k.lx * 1.05, z = k.z - k.lz * 1.05;
    // cars.js yaw: local +x along (cos yaw, -sin yaw)
    let fx = k.tx, fz = k.tz;
    if (fx * Math.cos(yaw0) + fz * -Math.sin(yaw0) < 0) { fx = -fx; fz = -fz; }
    for (const [a, b] of [[2.1, 0.85], [2.1, -0.85], [-2.1, 0.85], [-2.1, -0.85], [0, 0]]) {
      const px = x + fx * a + -fz * b, pz = z + fz * a + fx * b;
      if (!CARRIAGE.has(classAt(px, pz))) return null;
    }
    return { x, z, yaw: Math.atan2(-fz, fx) };
  };
  return { classAt, lift, nearKerb, placeLamp, placeCar };
}

/** One low green cast-iron Uccle bollard (0.9 m, collar, domed cap), as one geometry. */
function bollardGeometry() {
  const parts = [
    new THREE.CylinderGeometry(0.07, 0.085, 0.78, 10).translate(0, 0.39, 0),
    new THREE.CylinderGeometry(0.095, 0.095, 0.05, 10).translate(0, 0.62, 0),            // collar
    new THREE.SphereGeometry(0.072, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.78, 0),   // dome
  ].map((g) => { g.deleteAttribute("uv"); return g.toNonIndexed(); });
  return mergeGeometries(parts);
}
let BOLLARD_GEO = null, BOLLARD_MAT = null;

/** InstancedMesh of the surveyed bollards: xyz Float32Array (base positions on the measured surface). */
export function buildBollards(xyz) {
  const n = xyz.length / 3;
  if (!n) return null;
  BOLLARD_GEO ??= bollardGeometry();
  BOLLARD_MAT ??= Object.assign(new THREE.MeshStandardNodeMaterial({ color: 0x1f3a26, roughness: 0.55, metalness: 0.35 }), { userData: { shared: true } });
  const m = new THREE.InstancedMesh(BOLLARD_GEO, BOLLARD_MAT, n);
  const M = new THREE.Matrix4();
  for (let i = 0; i < n; i++) m.setMatrixAt(i, M.makeTranslation(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]));
  m.geometry.userData.shared = true;
  m.castShadow = true; m.receiveShadow = true;
  m.computeBoundingSphere();
  m.name = "bollards";
  return m;
}
