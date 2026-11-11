// CHEAP VOLUMETRIC CONES: the visible beam of a headlight or a lamp in damp air, as one additive instanced mesh (no
// ray marching, no depth texture). Per pixel: brightest near the source, fading along the beam ((1 - v)^2), soft at
// the cone's silhouette (|N.V|^1.5: a solid of light thickest through its middle), fading to nothing at the ground
// (no hard line where the cone meets the road) and near the camera (no wall of light when you stand in a beam).
// The instances mirror pool slots: write(k, pos, dir, length, radius, r, g, b) each frame, count = the slots used.
import * as THREE from "three/webgpu";
import { uniform, uv, float, vec3, abs, dot, normalize, normalView, positionView, positionWorld, smoothstep, instancedBufferAttribute } from "three/tsl";

export const coneLook = { uDensity: uniform(0.06), uGround: uniform(0) };

export function createCones(max) {
  // an open cone: apex at the origin, along +y to y = 1, radius 1 at the base; uv.y = 0 at the apex
  const geo = new THREE.CylinderGeometry(1, 0.0, 1, 20, 6, true).translate(0, 0.5, 0);
  const col = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const v = uv().y;
  const edge = abs(dot(normalize(normalView), normalize(positionView).negate())).pow(1.5);
  const ground = smoothstep(coneLook.uGround, coneLook.uGround.add(0.9), positionWorld.y);
  const nearCam = smoothstep(0.8, 4.0, positionView.z.negate());
  const c = instancedBufferAttribute(col);
  // double-sided: the back faces add the far side of the beam (x0.5 each: the same total as one solid)
  mat.colorNode = vec3(c).mul(float(1).sub(v).pow(2)).mul(edge).mul(ground).mul(nearCam).mul(coneLook.uDensity).mul(0.5);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.name = "light-cones";
  const M = mesh.instanceMatrix.array, C = col.array;
  return {
    mesh,
    /** cone k: apex (x, y, z), unit axis (dx, dy, dz), length L, end radius R, colour (premultiplied by weight) */
    write(k, x, y, z, dx, dy, dz, L, R, r, g, b) {
      // basis: Y = axis x L, X / Z = perpendicular x R (any perpendicular: the cone is round)
      let ax = 0, ay = 1, az = 0;
      if (Math.abs(dy) > 0.9) { ax = 1; ay = 0; }
      let px = ay * dz - az * dy, py = az * dx - ax * dz, pz = ax * dy - ay * dx;
      const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
      const qx = dy * pz - dz * py, qy = dz * px - dx * pz, qz = dx * py - dy * px;
      const o = k * 16;
      M[o] = px * R; M[o + 1] = py * R; M[o + 2] = pz * R; M[o + 3] = 0;
      M[o + 4] = dx * L; M[o + 5] = dy * L; M[o + 6] = dz * L; M[o + 7] = 0;
      M[o + 8] = qx * R; M[o + 9] = qy * R; M[o + 10] = qz * R; M[o + 11] = 0;
      M[o + 12] = x; M[o + 13] = y; M[o + 14] = z; M[o + 15] = 1;
      C[k * 3] = r; C[k * 3 + 1] = g; C[k * 3 + 2] = b;
    },
    commit(n) {
      mesh.count = n;
      mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, Math.max(1, n) * 16); mesh.instanceMatrix.needsUpdate = true;
      col.clearUpdateRanges(); col.addUpdateRange(0, Math.max(1, n) * 3); col.needsUpdate = true;
    },
  };
}
