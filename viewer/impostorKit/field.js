// impostorKit / field.js: the instances of one impostor type, ONE instanced draw per pass (depth pre-pass, colour)
// for every instance loaded, whatever the tiles: the shader culls by distance (a collapsed card costs 8 vertices),
// so the CPU never re-buckets while the camera moves (today's impostors re-bucket every 5 m, viewer/impostors.js:336).
// The card is the variant's 8-vertex cut-out octagon (6 triangles) or a quad.
// Instance data: ikPos (foot, world), ikData (yaw, scale, variant, band: a small integer the lab uses to hide groups
// for the jitter meter's masks; 0 in the city).
// Depth pre-pass (cut-out + coverage + hand-over dither + depth out) then the lit pass on EQUAL depth: each covered
// sample shaded once (the leaves' scheme, viewer/treesStylized.js:173-206). Both drawn after the opaque city
// (renderOrder 1 / 2): far trees are mostly hidden behind houses at street level and the depth test rejects them.
import * as THREE from "three/webgpu";

export function impostorField(mats, placements, { card = "octagon", name = "impostor-kit", farMats = null } = {}) {
  const n = placements.length, cap = Math.max(n, 1025);   // >= 1025: one shader whatever the count (vendor CHANGES #4)
  const geo = new THREE.BufferGeometry();
  if (card === "quad") {
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute("ikCorner", new THREE.Float32BufferAttribute([-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
  } else {
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(24), 3));
    const c = [];
    for (let k = 0; k < 8; k++) c.push(0, 0, k);
    geo.setAttribute("ikCorner", new THREE.Float32BufferAttribute(c, 3));
    const idx = [];
    for (let k = 1; k < 7; k++) idx.push(0, k, k + 1);
    geo.setIndex(idx);
  }
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  const data = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
  for (let i = 0; i < n; i++) {
    const p = placements[i];
    pos.array.set([p.x, p.y, p.z], i * 3);
    data.array.set([p.yaw, p.scale, p.variant, p.band ?? 0], i * 4);
  }
  pos.setUsage(THREE.StaticDrawUsage); data.setUsage(THREE.StaticDrawUsage);
  geo.setAttribute("ikPos", pos); geo.setAttribute("ikData", data);
  const colour = new THREE.InstancedMesh(geo, mats.colour, cap);
  const depth = new THREE.InstancedMesh(geo, mats.depth, cap);
  depth.instanceMatrix = colour.instanceMatrix;
  colour.count = depth.count = n;
  colour.frustumCulled = depth.frustumCulled = false;
  colour.castShadow = depth.castShadow = false;
  colour.receiveShadow = true; depth.receiveShadow = false;
  depth.renderOrder = 1; colour.renderOrder = 2;
  depth.userData.depthPrepass = true;
  colour.name = name; depth.name = `${name}:depth`;
  const group = new THREE.Group();
  group.name = name;
  group.add(depth, colour);
  // the far ring (optional): the same instances and card, a cheaper material pair (2 more draws per pass)
  let far = null;
  const mkFar = (m) => {
    const c = new THREE.InstancedMesh(geo, m.colour, cap), d = new THREE.InstancedMesh(geo, m.depth, cap);
    d.instanceMatrix = c.instanceMatrix = colour.instanceMatrix;
    c.count = d.count = n; c.frustumCulled = d.frustumCulled = false; c.castShadow = d.castShadow = false;
    c.receiveShadow = true; d.receiveShadow = false; d.renderOrder = 1; c.renderOrder = 2; d.userData.depthPrepass = true;
    c.name = `${name}:far`; d.name = `${name}:far:depth`;
    group.add(d, c);
    return { colour: c, depth: d };
  };
  if (farMats) far = mkFar(farMats);
  // front-to-back order (by distance to a point): the pre-pass discards (coverage), so the GPU tests depth early but
  // writes it late; cards drawn nearest first let the hidden ones behind fail the early test before shading.
  // Measured in the lab's far forest (83k trees): see docs/IMPOSTOR_KIT.md. Call again when the camera moved far.
  const order = new Uint32Array(n), keyD = new Float32Array(n), src = { pos: pos.array.slice(0, n * 3), data: data.array.slice(0, n * 4) };
  const sort = (eye) => {
    for (let i = 0; i < n; i++) { order[i] = i; keyD[i] = (src.pos[i * 3] - eye.x) ** 2 + (src.pos[i * 3 + 1] - eye.y) ** 2 + (src.pos[i * 3 + 2] - eye.z) ** 2; }
    order.sort((a, b) => keyD[a] - keyD[b]);
    for (let k = 0; k < n; k++) { const i = order[k]; pos.array.set(src.pos.subarray(i * 3, i * 3 + 3), k * 3); data.array.set(src.data.subarray(i * 4, i * 4 + 4), k * 4); }
    pos.needsUpdate = data.needsUpdate = true;
  };
  return {
    group, colour, depth, count: n, sort,
    setMaterials(m, fm = null) {
      colour.material = m.colour; depth.material = m.depth;
      if (fm && !far) far = mkFar(fm);
      else if (fm) { far.colour.material = fm.colour; far.depth.material = fm.depth; }
      else if (far) { group.remove(far.colour, far.depth); far = null; }
    },
    dispose() { geo.dispose(); },
  };
}

/** Per frame: the view uniforms (mip level per instance, hand-over cell) from the camera and the drawing buffer. */
export function updateView(view, camera, renderer) {
  const s = renderer.getDrawingBufferSize(_v2);
  view.p11.value = camera.projectionMatrix.elements[5];
  view.viewH.value = s.y;
}
const _v2 = new THREE.Vector2();
