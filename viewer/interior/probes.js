// LIGHT PROBES FOR DYNAMIC OBJECTS inside an interior cell (the third-person character): two L2 SH irradiance grids
// (three r187 examples/jsm/lighting/LightProbeGrid.js), DAY and NIGHT, baked in the browser from the cell itself (its
// materials already carry the Cycles lighting, so a cube capture of them IS the room's light) plus a sky shell behind
// the windows. Baked in slices over several frames (ranged bake: no frame waits on it). The grids are not added to the
// scene as lights (that would recompile every city material): the character gets an unlit material variant
// (body.setVariant) that evaluates them itself: albedo x mix(day, night) irradiance at its position, in the house frame.
import * as THREE from "three/webgpu";
import { float, vec3, vec4, mix, positionWorld, normalWorld, uniform, select } from "three/tsl";
import { LightProbeGrid } from "three/addons/lighting/LightProbeGrid.js";
import { lightProbeGridIrradiance } from "three/addons/tsl/lighting/LightProbeGridNode.js";
import { interiorLook } from "./interiorModel.js";
import { env } from "../lighting.js";

export const probeLook = { gain: uniform(0.32) };

export async function bakeProbes(cell, renderer, { spacing = 0.75, perFrame = 32, onProgress } = {}) {
  const t0 = performance.now();
  const inner = cell.info.inner, h = 6.4;
  const W = inner.width + 0.3, D = inner.zb - inner.zf + 0.3;
  const res = [Math.max(2, Math.round(W / spacing)), Math.max(2, Math.round(h / spacing)), Math.max(2, Math.round(D / spacing))];
  // bake in the house frame: the cell's meshes are borrowed into a scene where the house is not turned
  const scene = new THREE.Scene();
  const frame = new THREE.Group(); scene.add(frame);
  const kids = [...cell.root.children];
  for (const c of kids) frame.add(c);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 8), new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide }));
  const uSky = uniform(new THREE.Color(1, 1, 1));
  sky.material.colorNode = vec3(uSky);
  sky.position.set(inner.width / 2, 3, (inner.zf + inner.zb) / 2);
  scene.add(sky);
  const make = () => {
    const g = new LightProbeGrid(W, h, D, ...res);
    g.position.set(inner.width / 2, h / 2 + 0.05, (inner.zf + inner.zb) / 2);
    g.updateBoundingBox();
    return g;
  };
  const grids = { day: make(), night: make() };
  const total = res[0] * res[1] * res[2];
  const was = interiorLook.dayOverride.value;
  let slices = 0, worst = 0;
  try {
    for (const mode of ["day", "night"]) {
      const g = grids[mode];
      for (let start = 0; start < total; start += perFrame) {
        const ts = performance.now();
        interiorLook.dayOverride.value = mode === "day" ? 1 : 0;
        if (mode === "day") uSky.value.setRGB(0.85, 0.92, 1.05).multiplyScalar(interiorLook.dayGain.value * 0.25); else uSky.value.setRGB(0.004, 0.005, 0.009);
        g.bake(renderer, scene, { cubemapSize: 8, near: 0.05, far: 40, start, count: Math.min(perFrame, total - start) });
        worst = Math.max(worst, performance.now() - ts); slices++;
        interiorLook.dayOverride.value = was;
        onProgress?.(((start + perFrame) / total + (mode === "night" ? 1 : 0)) / 2);
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
  } finally {
    interiorLook.dayOverride.value = was;
    for (const c of kids) cell.root.add(c);
    sky.geometry.dispose(); sky.material.dispose();
  }
  const uInv = uniform(new THREE.Matrix4().copy(cell.root.matrixWorld).invert());
  return { grids, res, probes: total * 2, ms: Math.round(performance.now() - t0), slices, worstSliceMs: +worst.toFixed(1), uInv };
}

/** The character's indoor material maker for body.setVariant(make): unlit, vertex colour x the probes' irradiance. */
export function probeVariant(probes, body) {
  const { grids, uInv } = probes;
  const pl = uInv.mul(vec4(positionWorld, 1.0)).xyz;
  const nl = uInv.mul(vec4(normalWorld, 0.0)).xyz.normalize();
  const n = select(interiorLook.dayOverride.greaterThanEqual(0), float(1).sub(interiorLook.dayOverride), env.uNight);
  return (src, fade) => {
    const m = new THREE.MeshBasicNodeMaterial({ vertexColors: !!src.vertexColors });
    if (src.color) m.color.copy(src.color);
    const irr = mix(lightProbeGridIrradiance(grids.day, pl, nl), lightProbeGridIrradiance(grids.night, pl, nl), n);
    m.colorNode = irr.mul(probeLook.gain).add(0.003);
    if (fade) { m.transparent = true; m.depthWrite = false; m.opacityNode = body.uOpacity; }
    return m;
  };
}
