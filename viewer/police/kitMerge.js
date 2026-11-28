// THE POLICE CAR KIT IN FEW DRAWS (docs/PERF_GAME.md, perfgame round 2; ?carmerge=old = the kit as built, 16 draws).
// The player's car carries the lab's kit (viewer/policeCar/beaconModel.js): beacon foot, housing, dome, drum, socket,
// bulb, mirror, cable, two grille flashers (housing + lens), the visor bar (housing, lens, 2 brackets): 16 meshes, 16
// draws in the scene pass and 4 in the sun's shadow pass, every frame, always on screen. Here the STATIC parts become:
//   - ONE "plain" mesh (rubber / ABS / plate / cable: dark dielectrics) with its colour and roughness per vertex,
//   - ONE "lens" mesh (both grille lenses + the visor lens) whose emission picks gL / gR / visor per vertex,
// and the dome, the bulb and the rotating mirror stay as they are (their own shaders, the mirror turns): 5 draws.
// Same geometry, same uniforms (beaconU), same look; the originals stay in the graph, hidden (the kit's API keeps them).
import * as THREE from "three/webgpu";
import { attribute, color, float, uv, abs, fract, smoothstep, select } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { beaconMaterials, beaconU, BLUE, kitGain } from "../policeCar/beaconModel.js";

export const CAR_MERGE = new URLSearchParams(location.search).get("carmerge") !== "old";

let plainMat = null, lensMat = null;
function materials() {
  if (plainMat) return;
  plainMat = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  plainMat.colorNode = attribute("kitColor", "vec3");
  plainMat.roughnessNode = attribute("kitRough", "float");
  plainMat.name = "police kit (plain, merged)";
  // the lenses (beaconModel.js lens()): clear when off, LED segments by UV (3 on a grille head, 12 on the visor)
  lensMat = new THREE.MeshStandardNodeMaterial({ color: 0x1a1f2a, roughness: 0.08, metalness: 0.2 });
  const id = attribute("kitLens", "float");
  const which = select(id.lessThan(0.5), beaconU.gL, select(id.lessThan(1.5), beaconU.gR, beaconU.visor));
  const n = select(id.lessThan(1.5), float(3), float(12));
  const seg = smoothstep(0.42, 0.25, abs(fract(uv().x.mul(n)).sub(0.5)));
  lensMat.emissiveNode = color(BLUE).mul(seg.mul(0.75).add(0.25).mul(which).mul(kitGain).mul(16));
  lensMat.name = "police kit (lenses, merged)";
}

/** a mesh's geometry in `root`'s frame, non-indexed, position / normal / uv only (+ the extra attributes) */
function inFrame(mesh, inv, extra) {
  const g0 = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const g = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = g0.getAttribute(k);
    if (a) g.setAttribute(k, a.clone());
    else if (k === "uv") g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g0.getAttribute("position").count * 2), 2));
  }
  g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
  const n = g.getAttribute("position").count;
  for (const [k, size, val] of extra) {
    const arr = new Float32Array(n * size);
    for (let i = 0; i < n; i++) for (let c = 0; c < size; c++) arr[i * size + c] = val[c];
    g.setAttribute(k, new THREE.BufferAttribute(arr, size));
  }
  return g;
}

/** merge the static parts of the kit groups under `root` (the car's chassis); returns the merged group or null */
export function mergeKit(root, groups) {
  if (!CAR_MERGE) return null;
  materials();
  const M = beaconMaterials();
  const plainOf = new Map([[M.rubber, 0.92], [M.abs, 0.48], [M.plate, 0.6], [M.cable, 0.55]]);
  const lensOf = new Map([[M.lensL, 0], [M.lensR, 1], [M.lensV, 2]]);
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const plain = [], lenses = [], merged = [];
  let shadow = false;
  for (const grp of groups) grp.traverse((o) => {
    if (!o.isMesh) return;
    // (only what shows: a hidden branch, e.g. the LED tower in rotating mode, stays out)
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return;
    if (plainOf.has(o.material)) {
      const c = o.material.color;
      plain.push(inFrame(o, inv, [["kitColor", 3, [c.r, c.g, c.b]], ["kitRough", 1, [plainOf.get(o.material)]]]));
      shadow ||= o.castShadow; merged.push(o);
    } else if (lensOf.has(o.material)) {
      lenses.push(inFrame(o, inv, [["kitLens", 1, [lensOf.get(o.material)]]]));
      merged.push(o);
    }
  });
  if (!plain.length && !lenses.length) return null;
  const out = new THREE.Group(); out.name = "police-kit-merged";
  const add = (geos, mat, cast) => {
    if (!geos.length) return true;
    const g = mergeGeometries(geos, false);
    if (!g) return false;
    const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.name = mat.name;
    out.add(m);
    return true;
  };
  if (!add(plain, plainMat, shadow) || !add(lenses, lensMat, false)) return null;   // (a layout mismatch: keep the kit as built)
  for (const o of merged) o.visible = false;
  root.add(out);
  out.userData.originals = merged;
  return out;
}
/** undo (the kit is detached) */
export function unmergeKit(out) {
  if (!out) return;
  for (const o of out.userData.originals || []) o.visible = true;
  out.removeFromParent();
  for (const m of out.children) m.geometry.dispose();
}
