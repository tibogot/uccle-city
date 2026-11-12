// FAR LIGHTS AS GLARE CARDS (GTA V's distant lights: "every small light spot is a quad with a small texture"): one
// additive instanced billboard per lamp head, car front, car rear, tram front. Near the camera the light's own
// emissive geometry + bloom carry the glow; the card fades in with distance (smoothstep 14 -> 40 m: no pop) and keeps
// at least ~2.5 px so a light 300 m away still reads as a point of light, with its energy spread (the brightness falls
// as the card grows past its world size). Car fronts are directional: bright when the beam points at the camera.
// They light nothing: far lights' light on the ground is the ground light map (groundLight.js).
import * as THREE from "three/webgpu";
import {
  instancedBufferAttribute, uniform, vec2, vec3, vec4, float, cameraViewMatrix, cameraProjectionMatrix, cameraPosition, positionGeometry,
  smoothstep, length, max, dot, normalize, exp, select, uv,
} from "three/tsl";

export const glareLook = { uStrength: uniform(0.6), uPixel: uniform(0.002) };

export function createGlare(cap = 256) {
  const geo = new THREE.PlaneGeometry(2, 2);
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);     // xyz, world radius
  const aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);     // rgb, directional: 0 omni / 1 beam
  const aDir = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);     // beam axis (directional cards)
  geo.setAttribute("aPos", aPos); geo.setAttribute("aCol", aCol); geo.setAttribute("aDir", aDir);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const P = instancedBufferAttribute(aPos), C = instancedBufferAttribute(aCol), A = instancedBufferAttribute(aDir);
  const toCam = cameraPosition.sub(P.xyz), dist = length(toCam);
  const size = max(P.w, dist.mul(glareLook.uPixel).mul(2.5));                          // >= ~2.5 px
  const vc = cameraViewMatrix.mul(vec4(P.xyz, 1)).xyz;
  // a little toward the camera so the card is not cut by the lamp's own glass / the car's body
  const vp = vc.add(normalize(vc).negate().mul(0.35)).add(vec3(positionGeometry.xy.mul(size), 0));
  mat.vertexNode = cameraProjectionMatrix.mul(vec4(vp, 1));
  const r = length(uv().sub(0.5)).mul(2);
  const shape = exp(r.mul(r).mul(-5)).sub(exp(-5)).max(0);
  const fadeIn = smoothstep(30, 90, dist);          // nearer: the emissive glass + bloom
  const energy = P.w.div(size).pow2();                                                  // spread when the card is kept at a pixel size
  const beam = select(C.w.greaterThan(0.5), dot(normalize(A), normalize(toCam)).max(0).pow(6).mul(0.85).add(0.15), float(1));
  mat.colorNode = vec4(C.rgb.mul(shape).mul(fadeIn).mul(energy).mul(beam).mul(glareLook.uStrength), 1);
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.name = "glare-cards";
  const PA = aPos.array, CA = aCol.array, DA = aDir.array;
  return {
    mesh,
    write(k, x, y, z, radius, r, g, b, dx = 0, dy = 0, dz = 0) {
      PA[k * 4] = x; PA[k * 4 + 1] = y; PA[k * 4 + 2] = z; PA[k * 4 + 3] = radius;
      CA[k * 4] = r; CA[k * 4 + 1] = g; CA[k * 4 + 2] = b; CA[k * 4 + 3] = dx || dy || dz ? 1 : 0;
      DA[k * 3] = dx; DA[k * 3 + 1] = dy; DA[k * 3 + 2] = dz;
    },
    commit(n, camera, heightPx) {
      glareLook.uPixel.value = 2 * Math.tan((camera.fov * Math.PI) / 360) / heightPx;
      mesh.count = n;
      aPos.needsUpdate = aCol.needsUpdate = aDir.needsUpdate = true;
    },
  };
}
