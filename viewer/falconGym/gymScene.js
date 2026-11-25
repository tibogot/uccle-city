// THE FALCON GYM'S MESHES (labs/falcon-gym.html): the greybox of gymLayout.js drawn as a handful of merged meshes (one
// per material: ~8 draws), the capsule lab's prototype material (a faint 1 m / 25 cm world grid, labs/capsule-lab.js)
// so speeds and heights read, flat faces (boxes: one normal per face, no smoothing across edges), tree crowns as
// low icosahedra. Built once, static buffers (no DynamicDrawUsage), no lights (the city's Lighting does the light).
import * as THREE from "three/webgpu";
import { color, float, mix, positionWorld, normalWorld, fract, fwidth, smoothstep, abs, max, min } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BOXES, TREE_CROWNS, SIZE, Y0 } from "./gymLayout.js";

function protoMat(hex, { rough = 0.85, grid = 0.22, lineHex = 0x1b1e22 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: rough, metalness: 0 });
  const p = positionWorld, n = abs(normalWorld);
  const line = (v) => { const f = fract(v); const d = min(f, f.oneMinus()); return float(1).sub(smoothstep(float(0), fwidth(v).mul(1.2), d)); };
  const minor = (v) => { const f = fract(v.mul(4)); const d = min(f, f.oneMinus()); return float(1).sub(smoothstep(float(0), fwidth(v.mul(4)), d)).mul(0.35); };
  const g = max(max(line(p.x).mul(n.x.oneMinus()), line(p.y).mul(n.y.oneMinus())), line(p.z).mul(n.z.oneMinus()));
  const g2 = max(max(minor(p.x).mul(n.x.oneMinus()), minor(p.y).mul(n.y.oneMinus())), minor(p.z).mul(n.z.oneMinus()));
  m.colorNode = mix(color(hex), color(lineHex), max(g, g2).mul(grid));
  return m;
}
const GROUP = {
  blockA: "plaster", blockB: "concrete", blockC: "brick", passageRoof: "brick", courtyard: "stone", tower: "stone", spire: "slate",
  balcony: "trim", sill: "trim", parapet: "trim", wall: "trim", bench: "wood", trunk: "bark",
};

export function buildGymScene(scene) {
  const M = {
    ground: protoMat(0x7d8a6a, { grid: 0.2 }),
    plaster: protoMat(0xd9d2c4, { grid: 0.16, rough: 0.9 }), concrete: protoMat(0x9a9894, { grid: 0.25 }),
    brick: protoMat(0x9a5a44, { grid: 0.22 }), stone: protoMat(0xb3ad9f, { grid: 0.25 }), slate: protoMat(0x5d6670, { grid: 0.2, rough: 0.6 }),
    trim: protoMat(0xece8df, { grid: 0.12, rough: 0.7 }), wood: protoMat(0x8a6342, { grid: 0.1, rough: 0.6 }), bark: protoMat(0x4a3a2c, { grid: 0 }),
    leaves: protoMat(0x4f6b38, { grid: 0, rough: 0.95 }),
  };
  const group = new THREE.Group(); group.name = "falcon-gym"; scene.add(group);
  // the ground: a plane (its edge in the haze), its own grid
  const gg = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1).rotateX(-Math.PI / 2).translate(0, Y0, 0);
  const gm = new THREE.Mesh(gg, M.ground); gm.receiveShadow = true; gm.name = "ground"; group.add(gm);
  // the boxes, merged per material
  const per = {};
  for (const b of BOXES) {
    const g = new THREE.BoxGeometry(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0).translate((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
    (per[GROUP[b.kind] || "concrete"] ??= []).push(g);
  }
  const meshes = [];
  for (const [k, list] of Object.entries(per)) {
    const g = mergeGeometries(list, false); for (const x of list) x.dispose();
    const m = new THREE.Mesh(g, M[k]); m.castShadow = m.receiveShadow = true; m.name = `gym-${k}`; group.add(m); meshes.push(m);
  }
  // the tree crowns (two icosahedra each, a little irregular)
  const crowns = [];
  TREE_CROWNS.forEach((t, i) => {
    const a = new THREE.IcosahedronGeometry(t.r, 1).translate(t.x, t.y, t.z);
    const b = new THREE.IcosahedronGeometry(t.r * 0.7, 1).rotateY(i).translate(t.x + t.r * 0.35, t.y + t.r * 0.35, t.z - t.r * 0.2);
    crowns.push(a, b);
  });
  const cg = mergeGeometries(crowns, false); cg.computeVertexNormals();
  const cm = new THREE.Mesh(cg, M.leaves); cm.castShadow = cm.receiveShadow = true; cm.name = "gym-crowns"; group.add(cm);
  return { group, meshes: [...meshes, cm, gm], materials: M };
}
