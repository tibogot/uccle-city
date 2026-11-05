// LIGHT PROBES FOR DYNAMIC OBJECTS inside an interior cell (the third-person character): AMBIENT CUBES baked in Cycles
// with the rest of the cell (tools/blender/interior.py: small 6-face cubes in every room at two heights; each face's
// baked light is the irradiance from that axis direction), for the three lightings (sky, sun, night), stored in
// interior.json. Per frame the CPU blends the probes near the character (inverse distance, its own storey first) into
// six colours; its indoor material (body.setVariant) evaluates the ambient cube with the world normal turned into the
// house frame: no GPU bake, no hitch, six uniforms.
// (The first version baked two three.js LightProbeGrids in the browser: ~38 ms of main thread per bake call whatever
// the slice size, 14 s of hitching in the city. Replaced.)
import * as THREE from "three/webgpu";
import { vec3, vec4, normalWorld, uniform, float } from "three/tsl";
import { interiorLook } from "./interiorModel.js";
import { env } from "../lighting.js";

export const probeLook = { gain: uniform(1.0) };

export function makeProbes(cell) {
  const P = cell.info.ambientCubes?.probes || [];
  const U = Array.from({ length: 6 }, () => uniform(new THREE.Color(0, 0, 0)));
  const uRot = uniform(new THREE.Matrix4().copy(cell.root.matrixWorld).invert());
  const tmp = new THREE.Vector3(), acc = Array.from({ length: 6 }, () => new THREE.Color());
  const probes = {
    count: P.length, U,
    /** Blend the probes at a world position (feet + 1 m) for the current day / night / sun. */
    update(worldPos) {
      if (!P.length) return;
      cell.toLocal(worldPos, tmp);
      const n = interiorLook.dayOverride.value >= 0 ? 1 - interiorLook.dayOverride.value : env.uNight.value;
      const sunUp = THREE.MathUtils.smoothstep(env.uSunDir.value.y, 0.02, 0.15);
      const kSky = interiorLook.dayGain.value * (1 - n), kSun = interiorLook.sunGain.value * (1 - n) * sunUp, kNight = interiorLook.nightGain.value * n;
      const sc = env.uSunColor.value;
      for (const a of acc) a.setRGB(0, 0, 0);
      let wsum = 0;
      for (const p of P) {
        const dy = Math.abs(p.pos[1] - tmp.y), d2 = (p.pos[0] - tmp.x) ** 2 + (p.pos[2] - tmp.z) ** 2 + (dy > 1.6 ? 400 : dy * dy);
        const w = 1 / (d2 + 0.05) ** 2;
        wsum += w;
        for (let k = 0; k < 6; k++) {
          const s = p.sky[k], u = p.sun[k], t = p.night[k];
          acc[k].r += w * (s[0] * kSky + u[0] * kSun * sc.r + t[0] * kNight);
          acc[k].g += w * (s[1] * kSky + u[1] * kSun * sc.g + t[1] * kNight);
          acc[k].b += w * (s[2] * kSky + u[2] * kSun * sc.b + t[2] * kNight);
        }
      }
      const g = interiorLook.adapt.value / Math.max(wsum, 1e-9);
      for (let k = 0; k < 6; k++) U[k].value.copy(acc[k]).multiplyScalar(g);
    },
  };
  // the character's indoor material maker (body.setVariant): unlit, albedo x the ambient cube
  const nl = uRot.mul(vec4(normalWorld, 0.0)).xyz.normalize();
  const n2 = nl.mul(nl);
  const cube = nl.x.greaterThan(0).select(vec3(U[0]), vec3(U[1])).mul(n2.x)
    .add(nl.y.greaterThan(0).select(vec3(U[2]), vec3(U[3])).mul(n2.y))
    .add(nl.z.greaterThan(0).select(vec3(U[4]), vec3(U[5])).mul(n2.z));
  probes.variant = (body) => (src, fade) => {
    const m = new THREE.MeshBasicNodeMaterial({ vertexColors: !!src.vertexColors });
    if (src.color) m.color.copy(src.color);
    m.colorNode = cube.mul(probeLook.gain).add(float(0.0002));
    if (fade) { m.transparent = true; m.depthWrite = false; m.opacityNode = body.uOpacity; }
    return m;
  };
  return probes;
}
