// THE BRUSSELS LAMP MODEL (tools/blender/brusselsLamp.py -> models/lamp/brussels_lamp.glb), shared by the city
// (viewer/lamps.js) and the Lamp Lab. Loaded once: the glTF's two parts (painted cast iron, opal glass) as
// geometries in the lamp's own frame (foot at the origin, arm toward -z = toward the road, as the viewer's lamps),
// and two more levels of detail made here by meshoptimizer (error budgets in metres: invisible at their switch
// distance). The materials are the city's: dark-green satin iron, glass that glows at night.
import * as THREE from "three/webgpu";
import { vec3, color, mix, float } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { env } from "./lighting.js";

export const LAMP_LODS = [
  { error: 0, until: 35 },         // LOD0: the full model, up to 35 m
  { error: 0.012, until: 110 },    // LOD1: 1.2 cm error
  { error: 0.022, until: 450 },    // LOD2: 2.2 cm error (5 cm deleted the thin swan-neck arm: a floating globe); none beyond 450 m
];

let promise = null;
/** { lods: [{ iron, glass, tris }], iron, glass (materials) } or null if the model is missing. */
export function loadLampModel() {
  return (promise ??= (async () => {
    try {
      const url = new URL("../models/lamp/brussels_lamp.glb", import.meta.url).href;
      const gltf = await new GLTFLoader().loadAsync(url);
      await MeshoptSimplifier.ready;
      const parts = { iron: [], glass: [] };
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        g.rotateY(Math.PI);                                      // glTF export: the arm along +z -> -z
        for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
        (/glass/i.test(o.material.name) ? parts.glass : parts.iron).push(g);
      });
      const merge = (gs) => gs.length === 1 ? gs[0] : (gs.reduce((a, b) => mergeTwo(a, b)));
      const base = { iron: merge(parts.iron), glass: merge(parts.glass) };
      const lods = LAMP_LODS.map(({ error }) => {
        const out = {};
        for (const k of ["iron", "glass"]) {
          const g = base[k];
          if (!error) { out[k] = g; continue; }
          const [idx] = MeshoptSimplifier.simplify(new Uint32Array(g.index.array), g.attributes.position.array, 3, 0, error, ["ErrorAbsolute"]);
          const s = new THREE.BufferGeometry();
          s.setAttribute("position", g.attributes.position); s.setAttribute("normal", g.attributes.normal);
          s.setIndex(new THREE.BufferAttribute(idx, 1));
          out[k] = s;
        }
        out.tris = (out.iron.index.count + out.glass.index.count) / 3;
        return out;
      });
      for (const l of lods) for (const k of ["iron", "glass"]) { l[k].computeBoundingSphere(); l[k].userData.shared = true; }
      return { lods, ...materials() };
    } catch (e) {
      console.warn("lamp model:", e.message);
      return null;
    }
  })());
}

function mergeTwo(a, b) {
  const na = a.attributes.position.count, pos = new Float32Array((na + b.attributes.position.count) * 3), nrm = new Float32Array(pos.length);
  pos.set(a.attributes.position.array); pos.set(b.attributes.position.array, na * 3);
  nrm.set(a.attributes.normal.array); nrm.set(b.attributes.normal.array, na * 3);
  const ia = a.index.array, ib = b.index.array, idx = new Uint32Array(ia.length + ib.length);
  idx.set(ia); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + na;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

let MATS = null;
function materials() {
  if (MATS) return MATS;
  const iron = new THREE.MeshStandardNodeMaterial({ roughness: 0.42, metalness: 0.35 });
  iron.colorNode = color(0x1d3a2c);                               // Brussels lamp green, satin
  const glass = new THREE.MeshStandardNodeMaterial({ roughness: 0.25 });
  glass.colorNode = vec3(0.86, 0.85, 0.8);
  glass.emissiveNode = color(0xffd9a0).mul(mix(float(0.0), float(9.0), env.uNight));   // lit at night
  iron.userData.shared = glass.userData.shared = true;
  return (MATS = { iron, glass });
}
