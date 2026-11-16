// ?roads=surface, main thread: things that stand on the street, put on the MEASURED street (viewer/surfaces.js data
// from the tile worker: the class raster, the kerb lines, the surveyed bollards).
//   lift(x, z)      how high the measured surface is above the road level here (sidewalk / square kerb height)
//   placeLamp(s)    a lamp site of viewer/lamps.js moved onto the sidewalk, 0.5 m behind the nearest kerb, arm to the road
//   placeCar(...)   a parked car of viewer/cars.js moved against the nearest kerb, in the roadway, along the kerb
//   bollards(...)   the low green Uccle bollards at their UrbIS Topo positions (CR5702P / CR57L), one draw per tile
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export { streetFit } from "./streets/fitCore.js";

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
