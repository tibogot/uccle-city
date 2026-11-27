// ?roads=surface, main thread: things that stand on the street, put on the MEASURED street (viewer/surfaces.js data
// from the tile worker: the class raster, the kerb lines, the surveyed bollards).
//   lift(x, z)      how high the measured surface is above the road level here (sidewalk / square kerb height)
//   placeLamp(s)    a lamp site of viewer/lamps.js moved onto the sidewalk, 0.5 m behind the nearest kerb, arm to the road
//   placeCar(...)   a parked car of viewer/cars.js moved against the nearest kerb, in the roadway, along the kerb
//   bollards(...)   the low green Uccle bollards at their UrbIS Topo positions (CR5702P / CR57L), one draw per tile
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { positionGeometry, step, mix, color, float } from "three/tsl";
import { cityProps } from "./props/cityProps.js";

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

/** The surveyed bollards: xyz Float32Array (base positions on the measured surface); timber (optional, a flag per
 *  bollard: claude/reality2, rule kerb-furniture, class C8): a brown timber post with a red retroreflective band
 *  instead of the green cast iron (park / station / green edges, viewer/streets/kerbFurniture.js bollardKinds).
 *  -> an InstancedMesh per kind in use (`bollards` iron, `bollards-timber`; shared geometry + material each), with
 *  .slot[i] = [mesh, its instance] for the i-th bollard (props, colliders) */
export function buildBollards(xyz, timber = null) {
  const n = xyz.length / 3;
  if (!n) return null;
  BOLLARD_GEO ??= bollardGeometry();
  BOLLARD_MAT ??= cityProps.hook(Object.assign(new THREE.MeshStandardNodeMaterial({ color: 0x1f3a26, roughness: 0.55, metalness: 0.35 }), { userData: { shared: true } }));   // (props: a snapped bollard's motion vectors)
  const kinds = [[], []];
  for (let i = 0; i < n; i++) kinds[timber?.[i] ? 1 : 0].push(i);
  const group = new THREE.Group(); group.name = "bollard-set";
  const slot = new Array(n), M = new THREE.Matrix4();
  kinds.forEach((list, k) => {
    if (!list.length) return;
    const mat = k ? timberMat() : BOLLARD_MAT;
    const m = new THREE.InstancedMesh(BOLLARD_GEO, mat, list.length);
    list.forEach((i, j) => { m.setMatrixAt(j, M.makeTranslation(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2])); slot[i] = [m, j]; });
    m.geometry.userData.shared = true;
    m.castShadow = true; m.receiveShadow = true;
    m.computeBoundingSphere();
    m.name = k ? "bollards-timber" : "bollards";
    group.add(m);
  });
  group.count = n; group.slot = slot;
  return group;
}
let TIMBER_MAT = null;
/** the timber bollard: weathered brown wood, the red retroreflective band at the collar (0.59-0.65 m) */
function timberMat() {
  if (TIMBER_MAT) return TIMBER_MAT;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
  const y = positionGeometry.y, band = step(0.585, y).mul(step(y, 0.655));
  m.colorNode = mix(color(0x4a3322), color(0xa00d0a), band);
  m.roughnessNode = mix(float(0.85), float(0.35), band);
  m.userData.shared = true;
  return (TIMBER_MAT = cityProps.hook(m));
}
