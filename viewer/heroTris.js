// THE LANDMARKS' LOD0 TRIANGLE SOUP (viewer/heroColliders.js: the car blockers, the walker's / orbit camera's BVH).
// falcon2 (docs/perf/FALCON_STUTTER.md round 2, rule 22): a generator (a yield every 4096 vertices), drained at once by
// heroTriangles(), run in <= 3 ms slices by the hero collider poll (viewer/slices.js sliced).
import * as THREE from "three/webgpu";
import { drain } from "./slices.js";

/** Not a collider: cloth, foliage cards, glow / light cones, decals. */
export const soft = (o) => /flag|fabric|leaves|leaf|foliage|light|glow|beam|decal/i.test(`${o.name} ${[].concat(o.material || [])[0]?.name || ""}`);

/** LOD0 of a root: its "<name>_lod0" / "-lod0" child (else the root). */
export const lod0 = (root) => root.children.find((c) => /[-_]lod0$/.test(c.name)) || root;

/** World-space triangle soup (9 floats each) of the root's LOD0 solid meshes. */
export const heroTriangles = (root) => drain(heroTrianglesGen(root));
/** the same as a generator: a yield every 4096 vertices (sliced() while playing) */
export function* heroTrianglesGen(root) {
  const l0 = lod0(root);
  root.updateMatrixWorld(true);
  let n = 0;
  const meshes = [];
  l0.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry?.attributes?.position && !soft(o)) { meshes.push(o); n += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; } });
  const out = new Float32Array(n * 3), v = new THREE.Vector3();
  let k = 0;
  for (const o of meshes) {
    const P = o.geometry.attributes.position, I = o.geometry.index, c = I ? I.count : P.count;
    const M = o.matrixWorld.clone();                 // (taken now: the slices that follow read the same pose)
    for (let q = 0; q < c; q++) {
      if ((q & 4095) === 4095) yield;
      v.fromBufferAttribute(P, I ? I.getX(q) : q).applyMatrix4(M); out[k++] = v.x; out[k++] = v.y; out[k++] = v.z;
    }
  }
  return k === out.length ? out : out.slice(0, k - (k % 9));
}

