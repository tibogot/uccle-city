// KERB BARRIERS (claude/reality2, rule kerb-furniture, class C8): the black steel hairpin barriers along the kerb in
// front of the schools (sites: viewer/streets/kerbFurniture.js schoolBarriers). Procedural (a bent tube, boxy item in
// JS): one shared geometry + material, ONE instanced draw per tile, static; the walker's posts come from the instance
// boxes (character/cityHook.js), the car's from main.js drawn.bollards (each hairpin's two legs). ?kerbbarriers=0 none.
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { wxMat } from "./weather/cityWeatherize.js";

export const KERB_BARRIERS = typeof location === "undefined" || new URLSearchParams(location.search).get("kerbbarriers") !== "0";
import { LEG } from "./streets/kerbFurniture.js";

let GEO = null, MAT = null;
function hairpin() {
  const r = 0.03, H = 0.95, parts = [];
  const tube = (ax, ay, bx, by, rr = r) => { const L = Math.hypot(bx - ax, by - ay), g = new THREE.CylinderGeometry(rr, rr, L, 8); g.rotateZ(-Math.atan2(bx - ax, by - ay)); g.translate((ax + bx) / 2, (ay + by) / 2, 0); return g; };
  parts.push(tube(-LEG, 0, -LEG, H - 0.12), tube(LEG, 0, LEG, H - 0.12));                 // the legs
  const arc = new THREE.TorusGeometry(0.12, r, 6, 8, Math.PI / 2);                          // the two bends
  parts.push(arc.clone().translate(LEG - 0.12, H - 0.12, 0), arc.clone().rotateZ(Math.PI / 2).translate(-LEG + 0.12, H - 0.12, 0));
  parts.push(tube(-LEG + 0.12, H, LEG - 0.12, H));                                          // the top rail
  parts.push(tube(-LEG, 0.45, LEG, 0.45, 0.022));                                           // the knee rail
  parts.push(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8).translate(-LEG, 0.015, 0), new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8).translate(LEG, 0.015, 0));   // the foot plates
  const g = mergeGeometries(parts.map((p) => { const n = p.index ? p.toNonIndexed() : p; n.deleteAttribute("uv"); return n; }));
  g.userData.shared = true;
  return g;
}
/** sites [{ x, z, yaw }], ground(x, z) -> the tile's InstancedMesh (or null) */
export function buildKerbBarriers(sites, ground) {
  if (!sites.length) return null;
  GEO ??= hairpin();
  if (!MAT) { MAT = new THREE.MeshStandardNodeMaterial({ color: 0x15171a, roughness: 0.45, metalness: 0.55 }); MAT.userData.shared = true; wxMat(MAT, { porosity: 0.02, beads: true, frost: true }); }
  const m = new THREE.InstancedMesh(GEO, MAT, sites.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  sites.forEach((s, i) => m.setMatrixAt(i, M.compose(v.set(s.x, ground(s.x, s.z), s.z), q.setFromAxisAngle(up, s.yaw), one)));
  m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); m.name = "kerb-barriers";
  return m;
}
/** the car's posts: each hairpin's two legs [{ x, z }] */
export const barrierLegs = (sites) => sites.flatMap((s) => [-1, 1].map((k) => ({ x: s.x + Math.cos(s.yaw) * LEG * k, z: s.z - Math.sin(s.yaw) * LEG * k, ref: null })));
