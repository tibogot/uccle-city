// impostorKit source: the city's stylized street trees (vendor/stylized-trees, as viewer/treesStylized.js builds
// them; read-only use of the vendor's shared materials and built trees).
// It bakes the shading INPUTS like viewer/impostors.js (albedo before the per-tree tint, the pad-dome normal, the
// leaf flag + occlusion), so the impostor is relit live by the same leaf lighting (types.js treeShade).
// Bake state = the mesh at the hand-over (docs/IMPOSTORS_RESEARCH.md 3.2.5, cause 6): `lod: 2` bakes LOD 2 with its
// morph complete (the cards it keeps grown 1.7x, U.eye set at the hand-over distance), which is exactly what the mesh
// draws there, so the 50/50 split of the hand-over shows the same crown. `lod: 0` = LOD 0 as built (today's bake).
import * as THREE from "three/webgpu";
import { attribute, texture, mix, float, smoothstep, normalize, normalGeometry, positionWorld, positionGeometry } from "three/tsl";
import { bakeMaterial } from "../bake.js";
import { lodEye } from "../../lodFade.js";

/**
 * @param {object} shared  the vendor's shared { U, geoms: Map("<variant>:<lod>" -> { leaves, trunk }), leafMat, trunkMat }
 * @param {THREE.Texture} leafMask
 * @param {object} o { variants, lod = 2, handover = 400 }
 */
export function stylizedTreeSource(shared, leafMask, { variants = 6, lod = 2, handover = 400 } = {}) {
  const U = shared.U;
  const card = attribute("card", "vec4"), spin = attribute("cardSpin", "vec4");
  const mask = texture(leafMask, card.xy.mul(0.5).add(0.5)).r;
  const hA = card.w, aoA = card.z;
  const leafAlbedo = mix(U.bottom, U.top, smoothstep(0.0, 1.0, hA)).mul(mix(float(1), aoA, U.aoColor));
  const leafN = normalGeometry.add(positionWorld.sub(positionGeometry).mul(spin.z).mul(0.7));
  const leafM = bakeMaterial({ albedo: leafAlbedo, normal: leafN, aux: aoA.mul(0.5).add(0.5), discard: mask.lessThan(0.5), positionNode: shared.leafMat.positionNode });
  const barkM = bakeMaterial({ albedo: shared.trunkMat.colorNode, normal: normalGeometry, aux: float(0.25), positionNode: shared.trunkMat.positionNode, side: THREE.FrontSide });
  const grow = lod === 2 ? 1.7 : lod === 1 ? 1.35 : 1;
  const spheres = [], objects = [];
  for (let v = 0; v < variants; v++) {
    const g = shared.geoms.get(`${v}:${lod}`);
    const wrap = (src) => {
      const w = new THREE.BufferGeometry();
      for (const a of Object.keys(src.attributes)) w.setAttribute(a, src.attributes[a]);
      w.setIndex(src.index);
      w.setAttribute("treeXf", new THREE.InstancedBufferAttribute(new Float32Array([1, 0, 1]), 3));
      w.setAttribute("treePos", new THREE.InstancedBufferAttribute(new Float32Array(3), 3));
      return w;
    };
    const leaves = new THREE.InstancedMesh(wrap(g.leaves), leafM, 1), bark = new THREE.InstancedMesh(wrap(g.trunk), barkM, 1);
    for (const m of [leaves, bark]) { m.setMatrixAt(0, new THREE.Matrix4()); m.frustumCulled = false; }
    const o = new THREE.Group(); o.add(leaves, bark);
    objects.push(o);
    // the bounding sphere: the box centre; the radius from the card centres + their grown half size (the leaf mask
    // is a disc inside the card) and the bark's vertices
    const box = new THREE.Box3(), lp = g.leaves.attributes.position, sp = g.leaves.attributes.cardSpin, tp = g.trunk.attributes.position;
    const P = new THREE.Vector3();
    for (let i = 0; i < lp.count; i++) { const s = Math.hypot(sp.getX(i), sp.getY(i)) * grow; P.fromBufferAttribute(lp, i); box.expandByPoint(P.clone().addScalar(s)); box.expandByPoint(P.clone().addScalar(-s)); }
    for (let i = 0; i < tp.count; i++) box.expandByPoint(P.fromBufferAttribute(tp, i));
    const c = box.getCenter(new THREE.Vector3());
    let R = 0;
    for (let i = 0; i < lp.count; i++) R = Math.max(R, P.fromBufferAttribute(lp, i).distanceTo(c) + Math.hypot(sp.getX(i), sp.getY(i)) * grow);
    for (let i = 0; i < tp.count; i++) R = Math.max(R, P.fromBufferAttribute(tp, i).distanceTo(c));
    spheres.push(new THREE.Sphere(c, R * 1.01));
  }
  const saved = new THREE.Vector3();
  let savedScale = 1;
  return {
    count: variants, lod,
    sphere: (v) => spheres[v],
    object: (v) => objects[v],
    beforeRender() {
      saved.copy(lodEye.value); savedScale = U.lodScale.value;
      if (lod === 0) U.lodScale.value = 0;
      else { U.lodScale.value = 1; lodEye.value.set(0, 0, lod === 2 ? Math.max(handover, U.lod2.value + 1) : (U.lod1.value + U.lod2.value - U.morph2.value) / 2); }
    },
    afterRender() { lodEye.value.copy(saved); U.lodScale.value = savedScale; },
    dispose() { leafM.dispose(); barkM.dispose(); },
  };
}
