// WINDOW BOXES (procedural JS: a boxy thing): a planter under a window sill, painted timber or terracotta, with its
// soil and geraniums (the Blender `geranium`, instanced by viewer/foliage/plants.js like any plant).
//   const wb = windowBoxes([{ centre: Vector3 (the sill's front middle), right: Vector3, out: Vector3, width }], seed)
//   wb.group (the planters, one merged mesh + soil), wb.plants ([{ x, y, z, type: "geranium", yaw, scale }])
import * as THREE from "three/webgpu";
import { mix, vec3, float, positionWorld } from "three/tsl";
import { noiseAt } from "./noise.js";

const PAINTS = [0x2f4a3a, 0xe8e2d4, 0x7a3b2a, 0x2a3440];          // Brussels green, cream, terracotta, slate

function boxGeometry(w, d, h, t) {
  // a lidless box with walls t thick (outer box minus inner), rounded by a 1 cm chamfer on the top edges
  const g = [];
  const outer = new THREE.BoxGeometry(w, h, d); outer.translate(0, h / 2, 0);
  const lip = new THREE.BoxGeometry(w + 0.02, 0.02, d + 0.02); lip.translate(0, h - 0.01, 0);
  g.push(outer, lip);
  return g;
}

export function windowBoxes(list, seed = 1) {
  const group = new THREE.Group(); group.name = "window_boxes";
  const plants = [];
  let s = seed >>> 0;
  const R = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; };
  const matCache = {};
  const soilM = new THREE.MeshStandardNodeMaterial({ roughness: 1 });
  soilM.colorNode = mix(vec3(0.05, 0.035, 0.025), vec3(0.09, 0.065, 0.045), noiseAt(positionWorld.xz, 1 / 0.25).a);
  for (const b of list) {
    const paint = PAINTS[Math.floor(R() * PAINTS.length)];
    const m = (matCache[paint] ??= new THREE.MeshStandardNodeMaterial({ color: paint, roughness: paint === 0x7a3b2a ? 0.85 : 0.5 }));
    const W = b.width, D = 0.2, H = 0.18;
    const holder = new THREE.Group();
    holder.position.copy(b.centre).addScaledVector(b.out, D / 2 + 0.02);
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b.right, new THREE.Vector3(0, 1, 0), b.out));
    for (const g of boxGeometry(W, D, H)) { const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; holder.add(mesh); }
    const soil = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.03, D - 0.03).rotateX(-Math.PI / 2), soilM);
    soil.position.y = H + 0.001; holder.add(soil);
    // brackets
    for (const sx of [-W / 2 + 0.08, W / 2 - 0.08]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, D * 0.9), matCache[0x2a3440] ??= new THREE.MeshStandardNodeMaterial({ color: 0x2a3440, roughness: 0.4, metalness: 0.5 })); br.position.set(sx, -0.05, -0.01); holder.add(br); }
    group.add(holder);
    // geraniums: 3-4 per box along its length
    const n = Math.max(2, Math.round(W / 0.25));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n - 0.5;
      const p = b.centre.clone().addScaledVector(b.out, D / 2 + 0.02 + (R() - 0.5) * 0.04).addScaledVector(b.right, t * (W - 0.12));
      plants.push({ x: p.x, y: p.y + H - 0.03, z: p.z, type: "geranium", yaw: R() * 6.283, scale: 0.85 + R() * 0.3 });
    }
  }
  return { group, plants };
}
