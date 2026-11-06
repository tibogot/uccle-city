// THE CHAPELLE DE STALLE'S INTERIOR CELL (tools/blender/stalle_interior.py -> models/stalle/interior.glb + lm_*.png +
// interior.json), shared by the Stalle Lab and the city (?stalle=1, viewer/stalleCity.js).
//
//   - every surface is in a NAMED material slot; its colour / pattern comes from that slot's material (the same adapter
//     as the exterior: viewer/stalleModel.js sourceMaterial, i.e. the shared library once SOURCE points at it), its light
//     from the Cycles bakes: architecture through a lightmap (TEXCOORD_1, RGBM), the furniture per corner (_lsky /
//     _lsun / _lnight). Three bakes (sky, sun, night lamps) mixed by the city's light (lighting.js env): no colour baked;
//   - the materials are unlit (the baked light is the light): the city's sun shadow map never touches them;
//   - the west door's two leaves swing open as the player comes near (they replace the exterior model's closed leaves);
//   - colliders (walls, piers, floors, steps, chair rows) for the third-person character, `contains()` for the room;
//   - ambient-cube probes for the character's light inside (probes(): the blend of the baked cubes near it);
//   - the portal (Portal below): inside, with no opening of the chapel in view, the camera draws the interior layer only.
//   const cell = await loadStalleInterior({ placement, lib });  scene.add(cell.root);  cell.update(dt, player, eye)
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, clamp, abs, min, max, fwidth, uniform,
  select, normalWorld, positionWorld, cameraPosition, dot, reflect, pow, sin,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { sourceMaterial, SLOT_TABLE as EXT_TABLE } from "./stalleModel.js";

export const INTERIOR_LAYER = 3;          // = viewer/interior/portal.js
const EMPTY_LAYER = 31;
export const IN_SLOTS = ["brick_red_brussels", "stone_white", "render_white", "marble_chequer", "wood_frame_white", "wood_frame_dark",
  "painted_wood_red", "glass_window", "cast_iron_green", "polychrome"];
/** the interior's adapter table: GLB slot -> library name (marble_chequer, polychrome: new names, temporary TSL below) */
export const IN_SLOT_TABLE = Object.fromEntries(IN_SLOTS.map((s) => [s, EXT_TABLE[s] ?? s]));
const CODES = ["plain", "arch", "capital", "base", "cove", "step", "gilt", "oak", "rush", "skin", "robe", "mantle", "hatch", "candle", "lead", "joint"];
const C = Object.fromEntries(CODES.map((n, i) => [n, i]));

/** Live look (uniforms): gains of the three bakes, the eye adaptation inside, A/B switches */
export const stalleInLook = {
  dayGain: uniform(1.0), sunGain: uniform(0.9), nightGain: uniform(0.55), adapt: uniform(1), adaptInside: 5.0, adaptNight: 2.2,
  dayOverride: uniform(-1), lightmaps: uniform(1), view: uniform(0),     // view: 0 final, 1 light only, 2 albedo only
};

const rgbm = (c) => { const v = c.rgb.mul(c.a).mul(4.0); return v.mul(v); };
const code = () => floor(attribute("color", "vec4").r.mul(16));
const isCode = (k) => float(1).sub(clamp(abs(code().sub(k)), 0, 1));
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const nightK = () => select(stalleInLook.dayOverride.greaterThanEqual(0), float(1).sub(stalleInLook.dayOverride), env.uNight);
function bakedMix(sky, sun, night) {
  const n = nightK(), day = float(1).sub(n);
  const sunUp = smoothstep(0.02, 0.15, env.uSunDir.y);
  return sky.mul(stalleInLook.dayGain.mul(day))
    .add(sun.mul(stalleInLook.sunGain.mul(day).mul(sunUp)).mul(vec3(env.uSunColor)))
    .add(night.mul(stalleInLook.nightGain.mul(n)));
}

/** albedo of the new names + the interior codes on top of the slot's own colour */
const NEW = {
  marble_chequer() {
    // black / white marble squares (0.3 m) laid on the diagonal, veined, worn; joint lines
    const w = uv(0);
    const q = vec2(w.x.add(w.y), w.y.sub(w.x)).mul(0.7071).div(0.3);
    const cell = floor(q), f = fract(q);
    const black = fract(cell.x.add(cell.y).mul(0.5)).mul(2.0);
    const h = hash2(cell);
    const vein = smoothstep(0.82, 1.0, sin(w.x.mul(7.0).add(w.y.mul(3.0)).add(h.mul(20.0)).add(sin(w.y.mul(11.0)).mul(1.5))).mul(0.5).add(0.5));
    const white = mix(lin(0xd9d4c8), lin(0xc9c2b2), h).sub(vein.mul(0.1));
    const dark = mix(lin(0x262524), lin(0x3a3835), h).add(vein.mul(0.08));
    const fw = fwidth(q.x).max(0.0001);
    const joint = float(1).sub(smoothstep(0.0, max(fw, 0.015), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)))));
    return { colorNode: mix(mix(white, dark, step(0.5, black)), lin(0x8f8a80), joint.mul(0.6)) };
  },
  polychrome() {
    const col = lin(0xd9cdb6).mul(isCode(C.robe)).add(lin(0x7a2f22).mul(isCode(C.mantle))).add(lin(0xd8b49c).mul(isCode(C.skin)))
      .add(lin(0x121212).mul(isCode(C.hatch))).add(lin(0xb08a3a).mul(isCode(C.joint)))
      .add(lin(0x8a8378).mul(isCode(C.plain)));
    return { colorNode: col };
  },
};
function albedoOf(slot, lib) {
  const name = IN_SLOT_TABLE[slot];
  const src = NEW[name] ? NEW[name]() : sourceMaterial(name, lib, { indoor: true });
  let col = src.colorNode ?? vec3(src.color?.r ?? 0.7, src.color?.g ?? 0.7, src.color?.b ?? 0.7);
  if (slot === "wood_frame_white") col = mix(col, lin(0xb8913a), isCode(C.gilt));                    // the retable's gilding
  if (slot === "wood_frame_dark") col = mix(mix(col, lin(0x8a6238), isCode(C.oak)), lin(0xa58d55), isCode(C.rush));   // oak chairs, rush seats
  if (slot === "wood_frame_white") col = mix(col, lin(0xf3e9cf), isCode(C.candle));
  if (slot === "brick_red_brussels") col = col.mul(0.85);                                            // inner brick: older, sooted
  return col;
}

/** an unlit baked material: albedo x the baked light (lightmap or per-corner) */
function bakedMaterial(slot, kind, maps, lib) {
  const m = new THREE.MeshBasicNodeMaterial();
  m.name = `stalle interior ${slot} (${kind})`;
  let light;
  if (kind === "arch") light = bakedMix(rgbm(texture(maps.sky, uv(1))), rgbm(texture(maps.sun, uv(1))), rgbm(texture(maps.night, uv(1))));
  else light = bakedMix(rgbm(attribute("_lsky", "vec4")), rgbm(attribute("_lsun", "vec4")), rgbm(attribute("_lnight", "vec4")));
  light = mix(vec3(0.5), light.mul(stalleInLook.adapt), stalleInLook.lightmaps);
  const alb = albedoOf(slot, lib);
  let col = alb.mul(light);
  // gilding catches the light: a view-dependent highlight on the gilt code
  if (slot === "wood_frame_white") {
    const V = positionWorld.sub(cameraPosition).normalize(), R = reflect(V, normalWorld);
    const ndv = abs(dot(normalWorld, V));
    col = col.add(lin(0xffd27a).mul(light).mul(isCode(C.gilt)).mul(pow(float(1).sub(ndv), 2.0).mul(0.9).add(smoothstep(-0.1, 0.7, R.y).mul(0.35))));
    col = col.add(lin(0xffb860).mul(isCode(C.candle)).mul(nightK()).mul(3.0));     // candle bulbs glow at night
  }
  const view = stalleInLook.view;
  m.colorNode = select(view.equal(1), light, select(view.equal(2), alb, col));
  m.userData.slot = slot;
  return m;
}
/** the glass seen from inside: the daylight (or night) through leaded quarries */
function glassMaterial() {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.FrontSide });
  const w = uv(0);
  const q = vec2(w.x.add(w.y), w.y.sub(w.x)).div(0.16);
  const f = fract(q), fw = fwidth(q.x).max(0.0001);
  const lead = float(1).sub(smoothstep(0.0, max(fw.mul(1.5), 0.06), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y))))).mul(isCode(C.lead));
  const pane = hash2(floor(q));
  const n = nightK();
  const day = vec3(env.uSkyTop ?? vec3(0.6, 0.7, 0.9)).mul(0.35).add(vec3(0.75, 0.78, 0.72)).mul(float(1).sub(n)).mul(stalleInLook.adapt).mul(0.55);
  const glass = mix(day, vec3(0.012, 0.015, 0.03), n).mul(pane.mul(0.25).add(0.8)).mul(vec3(0.92, 1.0, 0.94));
  m.colorNode = mix(glass, vec3(0.02, 0.02, 0.02), lead);
  return m;
}

function loadRGBM(url) {
  return new THREE.TextureLoader().loadAsync(url).then((t) => {
    t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.generateMipmaps = true; t.premultiplyAlpha = false;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  });
}

let promise = null;
export function loadStalleInterior({ placement, lib = null }) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const base = new URL("../models/stalle/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, info, sky, sun, night] = await Promise.all([
      loader.loadAsync(base + "interior.glb"), fetch(base + "interior.json").then((r) => r.json()),
      loadRGBM(base + "lm_sky.png"), loadRGBM(base + "lm_sun.png"), loadRGBM(base + "lm_night.png"),
    ]);
    const maps = { sky, sun, night };
    const root = new THREE.Group(); root.name = "stalle-interior";
    root.position.copy(placement.position); root.rotation.y = placement.rotationY;
    root.updateMatrixWorld(true);
    const mats = {};
    const matFor = (slot, kind) => (mats[`${slot}|${kind}`] ??= slot === "glass_window" ? glassMaterial() : bakedMaterial(slot, kind, maps, lib));
    let tris = 0, draws = 0, colliders = null;
    const doors = {};
    for (const node of [...gltf.scene.children]) {
      const nm = node.name;
      if (nm === "Collider") {
        const g = node.geometry ?? node.children[0]?.geometry;
        node.updateMatrixWorld(true);
        const p = g.attributes.position, idx = g.index;
        const M = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, node.matrixWorld);
        const n = idx ? idx.count : p.count, out = new Float32Array(n * 3), v = new THREE.Vector3();
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(M); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
        colliders = out;
        continue;
      }
      const kind = nm === "Arch" ? "arch" : "props";
      node.traverse((o) => {
        if (!o.isMesh) return;
        const slot = o.material.name;
        o.material = matFor(slot, kind);
        o.userData.slot = slot;
        o.castShadow = false; o.receiveShadow = false;
        o.geometry.computeBoundingSphere();
        tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; draws++;
      });
      root.add(node);
      if (nm === "DoorL" || nm === "DoorR") doors[nm] = node;
    }
    for (const n of Object.values(doors)) n.userData.closedY = n.rotation.y;
    root.traverse((o) => o.layers.enable(INTERIOR_LAYER));
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const room = info.room.plan_local_uw;
    const tmp = new THREE.Vector3();
    const toLocal = (p, out = new THREE.Vector3()) => out.copy(p).applyMatrix4(inv);
    function contains(p, pad = 0) {
      toLocal(p, tmp);
      if (tmp.y < info.room.y[0] || tmp.y > info.room.y[1]) return false;
      let c = false;
      for (let i = 0, j = room.length - 1; i < room.length; j = i++) {
        const [xi, zi] = room[i], [xj, zj] = room[j];
        if ((zi > tmp.z) !== (zj > tmp.z) && tmp.x < xi + ((tmp.z - zi) * (xj - xi)) / (zj - zi)) c = !c;
      }
      if (!c || pad <= 0) return c;
      for (let i = 0, j = room.length - 1; i < room.length; j = i++) {     // distance to the outline
        const [ax, az] = room[j], [bx, bz] = room[i]; const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
        const t = THREE.MathUtils.clamp(((tmp.x - ax) * dx + (tmp.z - az) * dz) / L2, 0, 1);
        if (Math.hypot(tmp.x - ax - dx * t, tmp.z - az - dz * t) < pad) return false;
      }
      return true;
    }
    // openings as world boxes (portal), the door's box only counts while it is open
    const openings = info.openings.map((o) => {
      const b = new THREE.Box3();
      for (const x of [o.box[0][0], o.box[1][0]]) for (const y of [o.box[0][1], o.box[1][1]]) for (const z of [o.box[0][2], o.box[1][2]]) b.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(root.matrixWorld));
      return { name: o.name, box: b };
    });
    const doorPos = new THREE.Vector3(0.3, info.levels_taw.floor - 30 + 1, (info.room.plan_local_uw[0][1] + info.room.plan_local_uw.at(-1)[1]) / 2).applyMatrix4(root.matrixWorld);
    const cell = {
      root, info, maps, colliders, contains, toLocal, openings, doors, doorOpen: 0, doorPos,
      stats: { triangles: Math.round(tris), draws, loadMs: Math.round(performance.now() - t0), lightmapBytes: 3 * 1024 * 1024 * 4 * 4 / 3 },
      materials: Object.values(mats),
      /** per frame: the door (opens within 3.5 m of the player), the eye adaptation inside */
      update(dt, player, eye) {
        const want = player && player.distanceTo(doorPos) < 3.5 ? 1 : 0;
        this.doorOpen += (want - this.doorOpen) * Math.min(1, dt * 2.2);
        const a = THREE.MathUtils.degToRad(info.door_open_angle_deg) * THREE.MathUtils.smoothstep(this.doorOpen, 0, 1);
        if (doors.DoorL) doors.DoorL.rotation.y = doors.DoorL.userData.closedY + a;
        if (doors.DoorR) doors.DoorR.rotation.y = doors.DoorR.userData.closedY - a;
        // seen from outside, a closed door is the exterior model's (lit by the city); open, or from inside, the cell's
        const closed = this.doorOpen < 0.02 && !(eye && contains(eye, 0.02));
        if (closed !== this._closed) { this._closed = closed; for (const d of Object.values(doors)) d.visible = !closed; this.onDoorClosed?.(closed); }
        const n = stalleInLook.dayOverride.value >= 0 ? 1 - stalleInLook.dayOverride.value : env.uNight.value;
        const target = eye && contains(eye, -0.05) ? stalleInLook.adaptInside * (1 - n) + stalleInLook.adaptNight * n : 1;
        stalleInLook.adapt.value += (target - stalleInLook.adapt.value) * Math.min(1, dt * 1.5);
      },
      dispose() {
        root.removeFromParent();
        root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        for (const m of Object.values(mats)) m.dispose();
        for (const t of Object.values(maps)) t.dispose();
        promise = null;
      },
    };
    cell.probes = makeProbes(cell);
    return cell;
  })());
}

/** Ambient-cube probes (baked in Cycles with the cell): the blend near a world position -> six colours (uniforms) */
export const probeGain = uniform(1.0);
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
      const n = stalleInLook.dayOverride.value >= 0 ? 1 - stalleInLook.dayOverride.value : env.uNight.value;
      const sunUp = THREE.MathUtils.smoothstep(env.uSunDir.value.y, 0.02, 0.15);
      const kSky = stalleInLook.dayGain.value * (1 - n), kSun = stalleInLook.sunGain.value * (1 - n) * sunUp, kNight = stalleInLook.nightGain.value * n;
      const sc = env.uSunColor.value;
      for (const a of acc) a.setRGB(0, 0, 0);
      let wsum = 0;
      for (const p of P) {
        const d2 = (p.pos[0] - tmp.x) ** 2 + (p.pos[1] - tmp.y) ** 2 * 0.5 + (p.pos[2] - tmp.z) ** 2;
        const w = 1 / (d2 + 0.05) ** 2; wsum += w;
        for (let k = 0; k < 6; k++) {
          const s = p.sky[k], u = p.sun[k], t = p.night[k];
          acc[k].r += w * (s[0] * kSky + u[0] * kSun * sc.r + t[0] * kNight);
          acc[k].g += w * (s[1] * kSky + u[1] * kSun * sc.g + t[1] * kNight);
          acc[k].b += w * (s[2] * kSky + u[2] * kSun * sc.b + t[2] * kNight);
        }
      }
      const g = stalleInLook.adapt.value / Math.max(wsum, 1e-9);
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
    m.colorNode = cube.mul(probeGain).add(float(0.0002));
    if (fade) { m.transparent = true; m.depthWrite = false; m.opacityNode = body.uOpacity; }
    return m;
  };
  return probes;
}

/** THE PORTAL: inside the chapel with no opening (door, windows, oculi) in view, the camera draws the interior layer
 *  only and the sun's shadow camera an empty layer: the city costs nothing. Switching layers changes no shader; the
 *  scene's lights stay visible on the interior layer (three keys render objects on the lights a camera sees). */
export class StallePortal {
  constructor(cell, { camera, sun = null, extra = [] }) {
    this.cell = cell; this.camera = camera; this.sun = sun;
    this.frustum = new THREE.Frustum(); this.m = new THREE.Matrix4();
    this.inside = false; this.sealed = false; this.visible = 0;
    for (const o of extra) o.traverse((q) => q.layers.enable(INTERIOR_LAYER));
    this.lightsOn = () => cell.root.parent?.traverse((o) => { if (o.isLight) o.layers.enable(INTERIOR_LAYER); });
    this.lightsOn();
  }
  update() {
    const cam = this.camera;
    this.inside = this.cell.contains(cam.position, 0.05);
    let sealed = false;
    if (this.inside) {
      cam.updateMatrixWorld();
      this.m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.m, cam.coordinateSystem, cam.reversedDepth);
      let n = 0;
      for (const o of this.cell.openings) {
        if (o.name === "west door" && this.cell.doorOpen < 0.03) continue;
        if (this.frustum.intersectsBox(o.box)) n++;
      }
      this.visible = n;
      sealed = n === 0;
    } else this.visible = -1;
    if (sealed !== this.sealed) {
      this.sealed = sealed;
      if (sealed) { this.lightsOn(); cam.layers.set(INTERIOR_LAYER); this.sun?.shadow.camera.layers.set(EMPTY_LAYER); }
      else { cam.layers.set(0); cam.layers.enable(INTERIOR_LAYER); this.sun?.shadow.camera.layers.set(0); }
    }
    return sealed;
  }
  dispose() { if (this.sealed) { this.camera.layers.set(0); this.camera.layers.enable(INTERIOR_LAYER); this.sun?.shadow.camera.layers.set(0); } this.sealed = false; }
}
