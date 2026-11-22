// THE VILLA'S PAVED GROUNDS (procedural JS, the owner's rule for flat parts): the drive through the gate, the forecourt
// along the front, the garage's floor (polished concrete) and the path round the south side, ON the city's own ground:
// each polygon (villa.json grounds, frame u / w) is triangulated, split to <= 0.5 m and draped on groundAt(x, z) (the
// tile's terrain surface, the same 1 m DTM the tile draws) LIFT above it, with a skirt SKIRT down round every edge
// (rule model-meets-ground: no floating rim, no gap). One mesh, one draw; the pattern by zone (attribute _zone):
//   0 drive + forecourt: 60 x 60 cm light concrete pavers, joints, a faint tyre wear on the drive
//   1 garage floor: polished grey concrete, troweled patches
//   const g = buildVillaGrounds({ notes, rootM, groundAt });  scene.add(g.mesh);  g.rings (city rings: plants / grass clear)
import * as THREE from "three/webgpu";
import { attribute, vec2, vec3, float, floor, fract, mix, smoothstep, min, max, fwidth, dot, Fn, positionWorld, abs } from "three/tsl";


const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u2 = f.mul(f).mul(float(3).sub(f.mul(2)));
  return mix(mix(hash2(i), hash2(i.add(vec2(1, 0))), u2.x), mix(hash2(i.add(vec2(0, 1))), hash2(i.add(vec2(1, 1))), u2.x), u2.y);
};

export function groundsMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.75 });
  m.name = "villa grounds";
  const zone = attribute("_zone", "float").add(0.5).floor();
  const fu = attribute("_uw", "vec2");
  m.colorNode = Fn(() => {
    const p = fu.toVar();
    const g = p.div(0.6), f = fract(g), c = floor(g);
    const fw = max(fwidth(g.x), 0.002);
    const joint = float(1).sub(smoothstep(0.0, fw.mul(1.5).max(0.03), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)))));
    const h = hash2(c);
    const paver = mix(lin(0x8f8b83), lin(0x9e9a91), h).mul(vnoise(p.mul(7.0)).mul(0.08).add(0.95));
    const pav = mix(paver, lin(0x6d6a64), joint.mul(0.7));
    const conc = mix(lin(0x3a3a39), lin(0x4b4a48), vnoise(p.mul(0.7))).mul(vnoise(p.mul(11.0)).mul(0.05).add(0.97));
    return mix(pav, conc, zone);
  })();
  m.roughnessNode = mix(float(0.72), float(0.55), zone);
  return m;
}

export { smoothGround } from "./villaGroundsGeom.js";
import { groundsGeometry } from "./villaGroundsGeom.js";
/** grounds: villa.json grounds ({ name: [[u, w], ...] }), rootM: the villa's local -> world matrix, groundAt(x, z) */
export function buildVillaGrounds({ notes, rootM, groundAt }) {
  const v = new THREE.Vector3();
  const { P, N, Z, UW, I, rings } = groundsGeometry({ notes, toWorld: (u, w) => { v.set(u, 0, w).applyMatrix4(rootM); return [v.x, v.z]; }, groundAt });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("_zone", new THREE.Float32BufferAttribute(Z, 1));
  g.setAttribute("_uw", new THREE.Float32BufferAttribute(UW, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, groundsMaterial());
  mesh.name = "villa-grounds"; mesh.receiveShadow = true; mesh.castShadow = false;
  return { mesh, rings, tris: I.length / 3 };
}
