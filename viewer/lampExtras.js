// LAMP EXTRAS (claude/reality2, rule lamp-extras, class C7): the green swan-neck wall lanterns of the shop streets, the
// lantern on a decorated tram pole, the red-flower baskets hung on the lamp posts (sites: viewer/streets/lampExtrasPlace.js).
// Procedural (boxy items in JS): one merged static mesh per material per tile (iron, glass, flowers: <= 3 draws), the
// iron + glass are the Brussels lamp's own shared materials (viewer/lampModel.js lampMaterials: no new pipeline, the
// glass glows at night with the lamps), the flowers one shared vertex-coloured material. NO light is added: the
// lanterns' heads join the lamp light map (main.js addLamps) and the fixed lamp-light pool follows the posts as before.
// ?lampextras=0: none.
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { lampMaterials } from "./lampModel.js";
import { wxMat } from "./weather/cityWeatherize.js";
import { lampExtraSites } from "./streets/lampExtrasPlace.js";

export const LAMP_EXTRAS = typeof location === "undefined" || new URLSearchParams(location.search).get("lampextras") !== "0";

const clean = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k); return n; };
const cyl = (rt, rb, h, seg, x, y, z) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
/** a bar from a to b ([x, y, z]) of radius r */
function bar(a, b, r, seg = 6) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}

// the lantern head, local frame: its foot at the origin, standing on the bracket's end (a Brussels hexagonal lantern)
function lanternParts() {
  return {
    iron: [
      cyl(0.075, 0.05, 0.07, 6, 0, 0.035, 0),                // the cup it stands in
      cyl(0.11, 0.08, 0.04, 6, 0, 0.09, 0),                  // the bottom frame
      cyl(0.19, 0.155, 0.05, 6, 0, 0.47, 0),                 // the top frame
      cyl(0.02, 0.2, 0.17, 6, 0, 0.58, 0),                   // the roof
      new THREE.SphereGeometry(0.035, 8, 6).translate(0, 0.69, 0),   // the finial
      ...[0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; return bar([Math.cos(a) * 0.105, 0.1, Math.sin(a) * 0.105], [Math.cos(a) * 0.15, 0.45, Math.sin(a) * 0.15], 0.009, 4); }),   // the corner bars
    ],
    glass: [cyl(0.145, 0.1, 0.35, 6, 0, 0.275, 0)],
  };
}
// a swan-neck bracket from a mount at local z = -z0 out to the lantern's foot at (0, 0.12, -reach): bar, stay, scroll
function bracketParts(z0, reach, plate) {
  const out = [
    bar([0, 0.12, -z0], [0, 0.12, -reach + 0.04], 0.02),
    bar([0, -0.2, -z0], [0, 0.1, -reach * 0.62], 0.014),
    new THREE.TorusGeometry(0.06, 0.009, 5, 14).rotateY(Math.PI / 2).translate(0, 0.0, -z0 - reach * 0.3),
    cyl(0.03, 0.03, 0.05, 6, 0, 0.12, -reach),
  ];
  if (plate === "wall") out.push(new THREE.BoxGeometry(0.12, 0.42, 0.03).translate(0, -0.04, -0.015));
  else out.push(cyl(0.155, 0.155, 0.12, 10, 0, 0.12, 0), cyl(0.155, 0.155, 0.08, 10, 0, -0.2, 0));   // the collars round a pole
  return out;
}
const WALL_REACH = 0.62, POLE_REACH = 0.85, POLE_R = 0.13;
let PROTO = null;
function protos() {
  if (PROTO) return PROTO;
  const lant = lanternParts();
  const head = (z0, reach, plate) => ({
    iron: mergeGeometries([...bracketParts(z0, reach, plate), ...lant.iron.map((g) => g.clone().translate(0, 0.14, -reach))].map(clean)),
    glass: mergeGeometries(lant.glass.map((g) => clean(g.clone().translate(0, 0.14, -reach)))),
    head: [0, 0.14 + 0.275, -reach],
  });
  // the basket: a short arm off the post (local +x), three chains, an iron bowl, the flowers (a squashed dome of
  // trailing geraniums / petunias: red, pink, a few white, the leaves)
  const bowl = new THREE.SphereGeometry(0.27, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0.55, -0.62, 0);
  const basketIron = mergeGeometries([
    cyl(0.1, 0.1, 0.09, 10, 0, 0, 0), bar([0.08, 0, 0], [0.6, 0, 0], 0.018), bar([0.08, -0.22, 0], [0.4, 0, 0], 0.012),
    ...[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return bar([0.55, -0.02, 0], [0.55 + Math.cos(a) * 0.25, -0.6, Math.sin(a) * 0.25], 0.005, 3); }),
    bowl, new THREE.TorusGeometry(0.26, 0.012, 4, 16).rotateX(Math.PI / 2).translate(0.55, -0.6, 0),
  ].map(clean));
  const fl = new THREE.IcosahedronGeometry(0.36, 2).toNonIndexed();
  const P = fl.attributes.position, col = new Float32Array(P.count * 3), tri = P.count / 3;
  const rnd = (i) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
  for (let t = 0; t < tri; t++) {
    // each face pushed in / out a little (the clumps) and coloured as a flower or a leaf
    const r = rnd(t), k = 0.82 + rnd(t + 0.5) * 0.3;
    const c = r < 0.4 ? [0.62, 0.04, 0.05] : r < 0.58 ? [0.78, 0.2, 0.42] : r < 0.64 ? [0.86, 0.84, 0.8] : [0.13, 0.27, 0.08];
    for (let v = 0; v < 3; v++) {
      const i = t * 3 + v, y = P.getY(i);
      P.setXYZ(i, P.getX(i) * k, (y > 0 ? y * 0.55 : y * 0.85) * k, P.getZ(i) * k);
      col.set(c, i * 3);
    }
  }
  fl.deleteAttribute("uv"); fl.computeVertexNormals(); fl.setAttribute("color", new THREE.BufferAttribute(col, 3));
  fl.translate(0.55, -0.5, 0);
  return (PROTO = { wall: head(0, WALL_REACH, "wall"), pole: head(POLE_R, POLE_R + POLE_REACH, "pole"), basketIron, flowers: fl });
}
let FLOWER_MAT = null;
function flowerMat() {
  if (FLOWER_MAT) return FLOWER_MAT;
  const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8 });
  m.userData.shared = true;
  wxMat(m, { porosity: 0.3, frost: true });
  return (FLOWER_MAT = m);
}

/** the tile's extras: fronts (street-life faces), lamps (placed sites with .y, the post's foot), poles (tram pole sites
 *  with .y), ground(x, z) the sidewalk top, inB(x, z) the tile's bounds. -> { group, heads: [{x, y, z}], sites } */
export function buildLampExtras(fronts, lamps, poles, ground, inB, postH = 3.3) {
  const group = new THREE.Group(); group.name = "lamp-extras";
  const sites = lampExtraSites(fronts, lamps, poles, inB);
  const P = protos(), iron = [], glass = [], flowers = [], heads = [];
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const put = (proto, x, y, z, yaw) => {
    M.compose(v.set(x, y, z), q.setFromAxisAngle(up, yaw), one);
    iron.push(proto.iron.clone().applyMatrix4(M)); glass.push(proto.glass.clone().applyMatrix4(M));
    heads.push(new THREE.Vector3(...proto.head).applyMatrix4(M));
  };
  for (const w of sites.wall) put(P.wall, w.x, ground(w.x, w.z) + w.h, w.z, w.yaw);
  for (const i of sites.poles) { const p = poles[i]; put(P.pole, p.x, (p.y ?? ground(p.x, p.z)) + 4.6, p.z, p.yaw + Math.PI); }   // toward the sidewalk
  for (const b of sites.baskets) {
    const l = lamps[b.lamp];
    M.compose(v.set(l.x, (l.y ?? ground(l.x, l.z)) + postH, l.z), q.setFromAxisAngle(up, l.yaw + (b.side < 0 ? Math.PI : 0)), one);
    iron.push(P.basketIron.clone().applyMatrix4(M)); flowers.push(P.flowers.clone().applyMatrix4(M));
  }
  const mats = lampMaterials();
  const add = (list, mat, name, shadow) => {
    if (!list.length) return;
    const m = new THREE.Mesh(mergeGeometries(list), mat); m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix(); group.add(m);
  };
  add(iron, mats.iron, "lamp-extras-iron", true);
  add(glass, mats.glass, "lamp-extras-glass", false);
  add(flowers, flowerMat(), "lamp-extras-flowers", true);
  return { group, heads: heads.map((h) => ({ x: h.x, y: h.y, z: h.z })), sites };
}
