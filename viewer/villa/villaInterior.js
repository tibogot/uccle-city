// THE VILLA'S INTERIOR CELL (tools/blender/villa.py -> models/villa/interior.glb + interior.json), streamed in by
// viewer/villa/villaCity.js within ~30 m. Built like viewer/stalleInterior.js, with no lightmap at all:
//   - every surface is in a NAMED slot (plaster_white, oak_plank, walnut, marble_white, stone_floor, fabric_white,
//     fabric_grey, leather, brass, metal_black, glow, plant, glass_window); its colour / pattern is TSL here, its light
//     the Cycles bakes PER CORNER (_lsky / _lsun / _lnight, RGBM uint8): sky, sun and the night lamps mixed by the city's
//     light (lighting.js env). Unlit materials (the baked light is the light): no runtime light, no shadow map (rule
//     fixed-light-count); one draw per slot per node (Cell, Soft) + the glass;
//   - the glass (curtain walls, balustrades) is a transparent double-sided material that FADES IN from the exterior's
//     opaque far glass over ~1.2 s after the cell shows (no pop: the far glass is hidden only once the cell's glass is
//     as opaque as it); the walls' outsides, the mullions and the roofs stay the exterior model's;
//   - colliders (Collider node: floors, the stair's treads, partitions, furniture, the pool's floor and steps) for the
//     third-person walker; inside(p) for the house; the ambient-cube probes light the walker inside (no GPU bake).
import * as THREE from "three/webgpu";
import {
  attribute, uv, vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min, uniform, Fn, select,
  normalWorld, positionWorld, cameraPosition, reflect, pow, time, fwidth,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "../lighting.js";

export const VILLA_IN_SLOTS = ["plaster_white", "oak_plank", "walnut", "marble_white", "stone_floor", "fabric_white", "fabric_grey", "leather", "brass",
  "metal_black", "glow", "plant", "glass_window"];
const CODES = ["plain", "reveal", "plinth", "coping", "step", "slat", "frame", "door", "soffit", "roof", "garage", "led", "fire", "screen", "channel", "rug"];
const C = Object.fromEntries(CODES.map((n, i) => [n, i]));

/** live look: the bakes' gains, the eye adaptation inside, the glass fade-in, debug views (0 final, 1 light, 2 albedo) */
export const villaInLook = {
  dayGain: uniform(0.9), sunGain: uniform(0.8), nightGain: uniform(0.85), adapt: uniform(1), adaptInside: 3.2, adaptNight: 1.6,
  glassIn: uniform(1), dayOverride: uniform(-1), view: uniform(0), warm: uniform(new THREE.Color(1.04, 0.99, 0.93)),
};

const rgbm = (c) => { const v = c.rgb.mul(c.a).mul(4.0); return v.mul(v); };
const codeF = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (k) => float(1).sub(clamp(abs(codeF().sub(k)), 0, 1));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u2 = f.mul(f).mul(float(3).sub(f.mul(2)));
  return mix(mix(hash2(i), hash2(i.add(vec2(1, 0))), u2.x), mix(hash2(i.add(vec2(0, 1))), hash2(i.add(vec2(1, 1))), u2.x), u2.y);
};
const nightK = () => select(villaInLook.dayOverride.greaterThanEqual(0), float(1).sub(villaInLook.dayOverride), env.uNight);
function bakedLight() {
  const n = nightK(), day = float(1).sub(n);
  const sunUp = smoothstep(0.02, 0.15, env.uSunDir.y);
  const sky = rgbm(attribute("_lsky", "vec4")), sun = rgbm(attribute("_lsun", "vec4")), night = rgbm(attribute("_lnight", "vec4"));
  return sky.mul(villaInLook.dayGain.mul(day)).add(sun.mul(villaInLook.sunGain.mul(day).mul(sunUp)).mul(vec3(env.uSunColor)))
    .add(night.mul(villaInLook.nightGain.mul(n))).mul(villaInLook.adapt).mul(vec3(villaInLook.warm));
}

/** the slots' albedo (linear) from UV0 (metres) and the face code */
const ALBEDO = {
  plaster_white: () => lin(0xeeebe5).mul(vnoise(uv().mul(4.0)).mul(0.03).add(0.985)),
  // wide-plank oak (22 cm x 2.2 m, staggered), a grain along the plank, soft seams
  oak_plank: () => Fn(() => {
    const w = uv().toVar();
    const row = floor(w.y.div(0.22)).toVar();
    const off = hash2(vec2(row, 7.0)).mul(2.2);
    const col = floor(w.x.add(off).div(2.2));
    const h = hash2(vec2(row, col)).toVar();
    const grain = vnoise(vec2(w.x.mul(3.0), w.y.mul(90.0).add(h.mul(13.0)))).mul(0.5).add(vnoise(vec2(w.x.mul(18.0), w.y.mul(260.0))).mul(0.2));
    // (round 1 look: warm mid oak, low plank-to-plank contrast: the first pass read orange and stripy)
    const base = mix(lin(0x5e5246), lin(0x74624f), h.mul(0.35).add(grain.mul(0.4)));
    const fy = fract(w.y.div(0.22)), fx = fract(w.x.add(off).div(2.2));
    const fw = max(fwidth(w.y.div(0.22)), 0.002);
    const seam = smoothstep(0.0, fw.mul(1.5).max(0.012), min(fy, float(1).sub(fy))).mul(smoothstep(0.0, 0.002, min(fx, float(1).sub(fx)))).mul(0.3).add(0.7);
    return base.mul(seam);
  })(),
  walnut: () => Fn(() => {
    const w = uv().toVar();
    const grain = vnoise(vec2(w.x.mul(45.0), w.y.mul(1.4))).mul(0.35).add(vnoise(vec2(w.x.mul(160.0), w.y.mul(4.0))).mul(0.15));
    const base = mix(lin(0x2f2018), lin(0x5a3c2b), grain);
    const panel = fract(w.x.div(0.6)), fwp = max(fwidth(w.x.div(0.6)), 0.002);
    const groove = smoothstep(0.0, fwp.mul(2.0).max(0.006), min(panel, float(1).sub(panel))).mul(0.45).add(0.55);
    return mix(base, base.mul(groove), isC(C.door));
  })(),
  // calacatta: warm white with drifting grey veins and a little gold
  marble_white: () => Fn(() => {
    const w = uv().toVar();
    const warp = vec2(vnoise(w.mul(0.45)), vnoise(w.mul(0.45).add(5.2))).mul(1.1);
    const q = w.mul(0.5).add(warp);
    const v1 = float(1).sub(smoothstep(0.0, 0.014, abs(vnoise(q).sub(0.5)))).mul(vnoise(w.mul(0.8)).mul(0.8).add(0.2));
    const v2 = float(1).sub(smoothstep(0.0, 0.007, abs(vnoise(q.mul(2.7).add(3.1)).sub(0.5))));
    const base = lin(0xece8e1).mul(vnoise(w.mul(6.0)).mul(0.04).add(0.97));
    return mix(mix(base, lin(0x8e8b86), v1.mul(0.55)), lin(0xb39a6a), v2.mul(0.35));
  })(),
  stone_floor: () => Fn(() => {
    const w = uv().toVar();
    const g = vec2(w.x.div(1.2), w.y.div(0.6)), cell = floor(g), f = fract(g);
    const h = hash2(cell);
    const fw = max(fwidth(g.x), 0.002);
    const joint = float(1).sub(smoothstep(0.0, fw.mul(1.2).max(0.004), min(min(f.x, float(1).sub(f.x)), min(f.y.mul(0.5), float(1).sub(f.y).mul(0.5)))));
    const base = mix(lin(0xb3afa7), lin(0xc4c0b8), h).mul(vnoise(w.mul(3.0)).mul(0.06).add(0.97));
    return mix(mix(base, lin(0x6f6c67), joint.mul(0.6)), base.mul(0.85), isC(C.step).mul(0.3));
  })(),
  fabric_white: () => lin(0xe6e1d6).mul(vnoise(uv().mul(120.0)).mul(0.08).add(0.95)).mul(mix(float(1), float(0.93), isC(C.channel))),
  fabric_grey: () => mix(lin(0x74716b), lin(0x8d8982), vnoise(uv().mul(40.0))).mul(mix(float(1), float(1.15), isC(C.rug))),
  leather: () => mix(lin(0x6a3d22), lin(0x8a5532), vnoise(uv().mul(9.0))),
  brass: () => lin(0xb08746),
  metal_black: () => mix(lin(0x1b1b1d), lin(0x060708), isC(C.screen)),
  glow: () => lin(0xf3efe6),
  plant: () => mix(mix(lin(0x2c5a26), lin(0x4f7a33), vnoise(uv().mul(14.0))), lin(0x8a8580), isC(1)),
};

function bakedMaterial(slot) {
  const m = new THREE.MeshBasicNodeMaterial();
  m.name = `villa interior ${slot}`;
  const light = bakedLight();
  const alb = ALBEDO[slot]();
  let col = alb.mul(light);
  const V = positionWorld.sub(cameraPosition).normalize(), R = reflect(V, normalWorld), ndv = abs(dot(normalWorld, V));
  const fres = pow(float(1).sub(ndv), 4.0);
  if (slot === "brass" || slot === "metal_black") col = col.add(lin(0xffe2b0).mul(light).mul(fres.mul(0.6).add(smoothstep(0.2, 0.9, R.y).mul(slot === "brass" ? 0.35 : 0.08))));
  if (slot === "stone_floor" || slot === "marble_white") col = col.add(vec3(0.85, 0.88, 0.95).mul(light).mul(fres.mul(0.35)));        // polished: a sheen at grazing angles
  if (slot === "glow") {
    const fire = isC(C.fire), flick = vnoise(vec2(positionWorld.x.mul(3.0).add(time.mul(2.3)), time.mul(1.7))).mul(0.6).add(0.6);
    const hot = mix(lin(0xffd2a0).mul(mix(0.8, 4.5, nightK())), lin(0xff7a2a).mul(flick).mul(mix(1.5, 3.5, nightK())), fire);
    col = alb.mul(light).mul(0.3).add(hot);
  }
  m.colorNode = select(villaInLook.view.equal(1), light, select(villaInLook.view.equal(2), alb, col));
  m.userData.slot = slot;
  return m;
}
/** the cell's glass: double-sided, a fresnel reflection of the sky over a faint tint; opaque at glassIn = 1 */
function glassMaterial() {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false });
  m.name = "villa interior glass_window";
  const V = positionWorld.sub(cameraPosition).normalize(), ndv = abs(dot(normalWorld, V));
  const fres = pow(float(1).sub(ndv), 5.0).mul(0.85).add(0.06);
  const n = nightK();
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(-0.1, 0.6, reflect(V, normalWorld).y)).mul(float(1).sub(n.mul(0.9)));
  const dark = lin(0x0b1114);
  m.colorNode = mix(mix(dark, sky, fres), mix(dark, sky, fres.mul(0.6).add(0.1)), villaInLook.glassIn);
  m.opacityNode = mix(fres.mul(0.75).add(0.1), float(0.97), villaInLook.glassIn);
  return m;
}

let promise = null;
export function loadVillaInterior({ placement }) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const base = new URL("../../models/villa/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, info] = await Promise.all([loader.loadAsync(base + "interior.glb"), fetch(base + "interior.json").then((r) => r.json())]);
    const root = new THREE.Group(); root.name = "villa-interior";
    root.position.copy(placement.position); root.rotation.y = placement.rotationY;
    root.updateMatrixWorld(true);
    const mats = {};
    const matFor = (slot) => (mats[slot] ??= slot === "glass_window" ? glassMaterial() : bakedMaterial(slot));
    let tris = 0, draws = 0, colliders = null;
    for (const node of [...gltf.scene.children]) {
      if (node.name === "Collider") {
        const g = node.geometry ?? node.children[0]?.geometry;
        node.updateMatrixWorld(true);
        const p = g.attributes.position, idx = g.index;
        const M = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, node.matrixWorld);
        const n = idx ? idx.count : p.count, out = new Float32Array(n * 3), v = new THREE.Vector3();
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(M); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
        colliders = out;
        continue;
      }
      node.traverse((o) => {
        if (!o.isMesh) return;
        const slot = o.material.name;
        o.material = matFor(slot);
        o.userData.slot = slot; o.castShadow = false; o.receiveShadow = false;
        o.geometry.computeBoundingSphere();
        if (slot === "glass_window") o.renderOrder = 2;
        tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; draws++;
      });
      root.add(node);
    }
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const tmp = new THREE.Vector3();
    const inBoxes = (boxes, p, pad = 0) => {
      tmp.copy(p).applyMatrix4(inv);
      const u = tmp.x, w = tmp.z, h = tmp.y + 100;
      return boxes.some((b) => u > b.u[0] + pad && u < b.u[1] - pad && w > b.w[0] + pad && w < b.w[1] - pad && (!b.h || (h > b.h[0] && h < b.h[1])));
    };
    const cell = {
      root, info, colliders, materials: Object.values(mats),
      stats: { triangles: Math.round(tris), draws, loadMs: Math.round(performance.now() - t0) },
      contains: (p, pad = 0) => inBoxes(info.inside, p, pad),
      noTerrain: (x, z) => inBoxes(info.no_terrain, tmp.set(x, 0, z), 0),
      toLocal: (p, out = new THREE.Vector3()) => out.copy(p).applyMatrix4(inv),
      /** per frame: the eye adaptation inside, the glass fade-in */
      update(dt, eye) {
        const n = villaInLook.dayOverride.value >= 0 ? 1 - villaInLook.dayOverride.value : env.uNight.value;
        const target = eye && cell.contains(eye, -0.05) ? villaInLook.adaptInside * (1 - n) + villaInLook.adaptNight * n : 1.0;
        villaInLook.adapt.value += (target - villaInLook.adapt.value) * Math.min(1, dt * 1.5);
        const g = villaInLook.glassIn;
        if (g.value > 0) g.value = Math.max(0, g.value - dt / 1.2);
      },
      dispose() {
        root.removeFromParent();
        root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        for (const m of Object.values(mats)) m.dispose();
        promise = null;
      },
    };
    cell.probes = makeProbes(cell);
    return cell;
  })());
}

/** ambient cubes (baked in Cycles with the cell): the blend near a world position -> six colours (uniforms) */
function makeProbes(cell) {
  const P = cell.info.ambientCubes?.probes || [];
  const U = Array.from({ length: 6 }, () => uniform(new THREE.Color(0, 0, 0)));
  const uRot = uniform(new THREE.Matrix4().copy(cell.root.matrixWorld).invert());
  const tmp = new THREE.Vector3(), acc = Array.from({ length: 6 }, () => new THREE.Color());
  const probes = {
    count: P.length, U,
    update(worldPos) {
      if (!P.length) return;
      cell.toLocal(worldPos, tmp);
      const n = villaInLook.dayOverride.value >= 0 ? 1 - villaInLook.dayOverride.value : env.uNight.value;
      const sunUp = THREE.MathUtils.smoothstep(env.uSunDir.value.y, 0.02, 0.15);
      const kSky = villaInLook.dayGain.value * (1 - n), kSun = villaInLook.sunGain.value * (1 - n) * sunUp, kNight = villaInLook.nightGain.value * n;
      const sc = env.uSunColor.value;
      for (const a of acc) a.setRGB(0, 0, 0);
      let wsum = 0;
      for (const p of P) {
        const d2 = (p.pos[0] - tmp.x) ** 2 + (p.pos[1] - tmp.y) ** 2 * 2 + (p.pos[2] - tmp.z) ** 2;
        const w = 1 / (d2 + 0.05) ** 2; wsum += w;
        for (let k = 0; k < 6; k++) {
          const s = p.sky[k], u = p.sun[k], t = p.night[k];
          acc[k].r += w * (s[0] * kSky + u[0] * kSun * sc.r + t[0] * kNight);
          acc[k].g += w * (s[1] * kSky + u[1] * kSun * sc.g + t[1] * kNight);
          acc[k].b += w * (s[2] * kSky + u[2] * kSun * sc.b + t[2] * kNight);
        }
      }
      const g = villaInLook.adapt.value / Math.max(wsum, 1e-9);
      for (let k = 0; k < 6; k++) U[k].value.copy(acc[k]).multiplyScalar(g);
    },
  };
  const nl = uRot.mul(vec4(normalWorld, 0.0)).xyz.normalize();
  const n2 = nl.mul(nl);
  const cube = nl.x.greaterThan(0).select(vec3(U[0]), vec3(U[1])).mul(n2.x)
    .add(nl.y.greaterThan(0).select(vec3(U[2]), vec3(U[3])).mul(n2.y))
    .add(nl.z.greaterThan(0).select(vec3(U[4]), vec3(U[5])).mul(n2.z));
  /** the character's indoor material maker (body.setVariant): unlit, albedo x the ambient cube */
  probes.variant = (body) => (src, fade) => {
    const m = new THREE.MeshBasicNodeMaterial({ vertexColors: !!src.vertexColors });
    if (src.color) m.color.copy(src.color);
    m.colorNode = cube.add(float(0.0002));
    if (fade) { m.transparent = true; m.depthWrite = false; m.opacityNode = body.uOpacity; }
    return m;
  };
  return probes;
}
