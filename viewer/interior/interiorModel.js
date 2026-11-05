// THE INTERIOR CELL in the viewer: models/interior/<house>/ (tools/blender/interior.py + tools/interior/packGlb.mjs):
//   interior.glb   meshes in the house frame: Interior (flat architecture, lightmap UV1), Props (furniture, frames,
//                  stair, mouldings: per-corner baked light _lmsky/_lmsun/_lmnight), FrontDoor (origin on the hinge),
//                  Glass, Colliders (not drawn)
//   lm_sky / lm_sun / lm_night.png   RGBM gamma-2 lightmaps (lin = (rgb * a * 4)^2), 1024²
//   house.json, interior.json        the spec (frame, footprint, openings) and the build notes
// Lighting is all baked: final = albedo * (sky * uSky + sun * uSun + night * uNightL) (+ lamp-shade glow at night),
// albedo procedural from COLOR_0 (rgb, the pattern code in a) and UV0 (metres). The city's sun / sky / lamps do not
// light the interior (its materials are unlit: lights = false), so there are no shadow-map leaks at wall seams.
//
//   const cell = await loadInterior(dir)      cell.root (placed in the city), cell.update(dt, playerPos), cell.dispose()
//   cell.colliders: Float32Array (world triangles)   cell.look: live uniforms (gains, debug view)
import * as THREE from "three/webgpu";
import {
  Fn, attribute, uv, texture, vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, abs, min, max, sin, dot, clamp, length,
  positionWorld, cameraPosition, normalWorld, uniform, fwidth, pow, mrt, roughness, select,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "../lighting.js";
import { hash2D, noise2D } from "../tslkit.js";

/** Live look controls (uniforms: no recompiles). */
export const interiorLook = {
  dayGain: uniform(0.9), sunGain: uniform(1.2), nightGain: uniform(0.3), glow: uniform(2.0),
  // eye adaptation inside: the cell's light is multiplied by `adapt`, eased toward `adaptInside` while the camera is in
  // the house and back to 1 outside (the city behind the windows keeps its exposure: it reads bright, as it should)
  adapt: uniform(1), adaptInside: 12.0, adaptNight: 2.5,
  lightmaps: uniform(1),            // 0 = albedo only (debug)
  view: uniform(0),                 // debug: 0 final, 1 lighting only, 2 albedo only
  dayOverride: uniform(-1),         // >= 0: forces the day/night mix (the lab's toggle); < 0 follows env.uNight
};

let decoderReady = null;
function loader() {
  if (!decoderReady) { MeshoptDecoder.useWorkers?.(2); decoderReady = MeshoptDecoder.ready; }
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

const rgbm = (c) => { const v = c.rgb.mul(c.a).mul(4.0); return v.mul(v); };

/** The night factor: the lab can force it, else the city's env.uNight. */
const nightK = () => select(interiorLook.dayOverride.greaterThanEqual(0), float(1).sub(interiorLook.dayOverride), env.uNight);

/** Albedo + roughness per material from COLOR_0 (rgb, a = code / 8) and UV0 in metres. */
function surface(name) {
  const c = attribute("color", "vec4");
  const base = c.rgb.toVar(), code = floor(c.a.mul(8.0)).toVar();
  const p = uv().toVar();
  const P = positionWorld;
  const fw = fwidth(p).toVar();
  const fine = noise2D(p.mul(37.0)).toVar();
  let col = base, rough = float(0.8), metal = float(0);
  const is = (k) => step(abs(code.sub(k)), 0.5);
  if (name === "Plaster") {
    // paint: a soft mottle; brick (the outer reveals): courses as the city façade (6.75 cm, 23 cm)
    const mott = noise2D(p.mul(1.7)).mul(0.04).add(fine.mul(0.02)).add(0.97);
    const row = floor(p.y.div(0.0675)), bx = fract(p.x.div(0.23).add(row.mul(0.5))), by = fract(p.y.div(0.0675));
    const joint = max(smoothstep(0.08, 0.0, min(bx, float(1).sub(bx))), smoothstep(0.14, 0.0, min(by, float(1).sub(by))));
    const brick = mix(base.mul(hash2D(vec2(floor(p.x.div(0.23).add(row.mul(0.5))), row)).mul(0.35).add(0.8)), vec3(0.3, 0.28, 0.25), joint);
    col = mix(base.mul(mott), brick, is(1));
    rough = float(0.92);
  } else if (name === "Wood") {
    // grain along u: stretched noise rings; oak (1), walnut (2), pine (5); herringbone parquet (3); boards (4)
    const grainAt = (q, seed) => {
      const w = noise2D(vec2(q.x.mul(1.6), q.y.mul(22.0)).add(seed)).mul(2.0).add(noise2D(vec2(q.x.mul(0.4), q.y.mul(5.0)).add(seed)).mul(3.0));
      const rings = fract(q.y.mul(38.0).add(w));
      return smoothstep(0.0, 0.5, rings).mul(smoothstep(1.0, 0.6, rings)).mul(float(1).sub(smoothstep(0.02, 0.08, fw.y.mul(38.0))));
    };
    // herringbone: blocks 7 x 35 cm at 45 degrees
    const hb = vec2(p.x.add(p.y), p.x.sub(p.y)).mul(0.7071).toVar();
    const bw = float(0.07), bl = float(0.35);
    const colI = floor(hb.x.div(bw)), side = fract(colI.mul(0.5)).mul(2.0);
    const along = mix(hb.y, hb.y.negate(), side).add(colI.mul(bw));
    const blk = vec2(colI, floor(along.div(bl)));
    const inB = vec2(fract(hb.x.div(bw)), fract(along.div(bl)));
    const seam = max(smoothstep(0.06, 0.0, min(inB.x, float(1).sub(inB.x))), smoothstep(0.012, 0.0, min(inB.y, float(1).sub(inB.y))));
    const tone = hash2D(blk).mul(0.35).add(0.82);
    const hbGrain = grainAt(vec2(along, inB.x.mul(bw)), hash2D(blk).mul(9.0));
    const parquet = base.mul(tone).mul(hbGrain.mul(0.18).add(0.9)).mul(float(1).sub(seam.mul(0.55)));
    // boards 14 cm, random lengths
    const bi = floor(p.y.div(0.14)), bo = hash2D(vec2(bi, 3.1)).mul(2.0), bj = floor(p.x.add(bo).div(1.4));
    const bIn = vec2(fract(p.x.add(bo).div(1.4)), fract(p.y.div(0.14)));
    const bseam = max(smoothstep(0.004, 0.0, min(bIn.x, float(1).sub(bIn.x))), smoothstep(0.03, 0.0, min(bIn.y, float(1).sub(bIn.y))));
    const boards = base.mul(hash2D(vec2(bi, bj)).mul(0.28).add(0.86)).mul(grainAt(p.add(vec2(bo, 0)), bi).mul(0.2).add(0.88)).mul(float(1).sub(bseam.mul(0.5)));
    const solid = base.mul(grainAt(p, 0.0).mul(mix(float(0.22), float(0.3), is(2))).add(0.86)).mul(noise2D(p.mul(vec2(0.6, 6.0))).mul(0.1).add(0.95));
    const painted = base.mul(fine.mul(0.015).add(0.99));
    col = mix(mix(mix(mix(painted, solid, max(max(is(1), is(2)), is(5))), parquet, is(3)), boards, is(4)), painted, float(0));
    rough = mix(float(0.55), float(0.45), max(is(3), is(4)));
    metal = mix(float(0), float(0.12), max(is(3), is(4)));       // varnished floors: SSR picks the windows
  } else if (name === "Fabric") {
    // weave (0) / velvet (1) / rug (2, 6) / canvas painting + book spines (3) / linen (4) / knit (5)
    const wv = sin(p.x.mul(1400.0)).mul(sin(p.y.mul(1400.0))).mul(0.5).add(0.5);
    const weaveK = float(1).sub(smoothstep(0.0003, 0.0012, max(fw.x, fw.y)));
    const weave = base.mul(wv.mul(0.12).mul(weaveK).add(0.94)).mul(fine.mul(0.05).add(0.97));
    const view = abs(dot(normalWorld, P.sub(cameraPosition).normalize()));
    const velvet = base.mul(mix(float(1.25), float(0.85), view)).mul(fine.mul(0.06).add(0.97));
    // rug: a border band and a lattice of medallions, two tones from the base
    const rq = p.mul(vec2(1, 1)).toVar();
    const lat = abs(fract(rq.mul(3.2)).sub(0.5)).toVar();
    const diamond = smoothstep(0.32, 0.28, lat.x.add(lat.y));
    const ring = smoothstep(0.03, 0.0, abs(lat.x.add(lat.y).sub(0.36)));
    const rug = mix(mix(base, base.mul(vec3(1.6, 1.35, 1.0)).add(0.03), diamond.mul(0.6)), vec3(0.75, 0.62, 0.42), ring.mul(0.7)).mul(fine.mul(0.08).add(0.95));
    const rug2 = mix(base, base.mul(1.5), smoothstep(0.45, 0.5, fract(p.y.mul(6.0))).mul(0.4)).mul(fine.mul(0.08).add(0.95));
    // canvas: an abstract oil painting from layered noise (book spines: their own base colour, a gilt band)
    const pa = noise2D(p.mul(3.0).add(base.rg.mul(10.0))), pb = noise2D(p.mul(7.0).add(4.2)), pc = noise2D(p.mul(1.3).add(9.1));
    const paint = mix(mix(base, vec3(0.75, 0.6, 0.35), smoothstep(0.5, 0.75, pa).mul(0.6)), vec3(0.12, 0.15, 0.2), smoothstep(0.55, 0.8, pc).mul(0.5))
      .mul(pb.mul(0.2).add(0.9));
    const linen = base.mul(sin(p.x.mul(900.0)).mul(0.04).mul(weaveK).add(0.97)).mul(noise2D(p.mul(vec2(2.0, 40.0))).mul(0.06).add(0.97));
    const knit = base.mul(smoothstep(0.2, 0.8, abs(sin(p.x.mul(160.0)))).mul(0.15).add(0.88));
    col = mix(mix(mix(mix(mix(weave, velvet, is(1)), rug, is(2)), paint, is(3)), linen, is(4)), knit, is(5));
    col = mix(col, rug2, is(6));
    rough = float(0.95);
  } else if (name === "Hard") {
    // enamel (0) / steel (1) / marble (2) / wall tiles (3) / cement tiles (4) / ceramic (5) / blue stone (6) / leaf (7) / paper (8)
    const veins = smoothstep(0.92, 0.99, float(1).sub(abs(noise2D(p.mul(2.2).add(noise2D(p.mul(5.0)).mul(0.6))).mul(2.0).sub(1.0))));
    const marble = mix(base, mix(base.mul(2.4).add(0.08), base.mul(0.4), step(0.3, base.r)), veins.mul(0.7)).mul(noise2D(p.mul(0.8)).mul(0.08).add(0.96));
    const tg = abs(fract(p.mul(vec2(1 / 0.15, 1 / 0.1))).sub(0.5));
    const grout = max(smoothstep(0.46, 0.49, tg.x), smoothstep(0.44, 0.48, tg.y));
    const tiles = mix(base.mul(hash2D(floor(p.mul(vec2(1 / 0.15, 1 / 0.1)))).mul(0.06).add(0.96)), vec3(0.55, 0.53, 0.5), grout);
    // Brussels cement tiles (carreaux de ciment), 20 cm: a four-petal motif, a border, two tones of the base
    const ct = fract(p.div(0.2)).sub(0.5).toVar();
    const r = length(ct), ang = abs(abs(ct.x).sub(abs(ct.y)));
    const petal = smoothstep(0.03, 0.0, abs(r.sub(0.22).add(ang.mul(0.35)))).max(smoothstep(0.09, 0.07, r));
    const corner = smoothstep(0.1, 0.08, length(abs(ct).sub(0.5)));
    const cgrout = max(smoothstep(0.485, 0.495, abs(ct.x)), smoothstep(0.485, 0.495, abs(ct.y)));
    const cement = mix(mix(mix(base, vec3(0.13, 0.15, 0.17), petal), vec3(0.45, 0.16, 0.1), corner), vec3(0.4, 0.38, 0.35), cgrout).mul(fine.mul(0.05).add(0.97));
    const steel = base.mul(noise2D(vec2(p.x.mul(3.0), p.y.mul(300.0))).mul(0.08).add(0.95));
    const stone = base.mul(fine.mul(0.15).add(noise2D(p.mul(4.0)).mul(0.1)).add(0.9));
    const leaf = base.mul(noise2D(p.mul(30.0)).mul(0.25).add(0.9));
    col = mix(mix(mix(mix(mix(mix(base, steel, is(1)), marble, is(2)), tiles, is(3)), cement, is(4)), stone, is(6)), leaf, is(7));
    rough = mix(mix(mix(float(0.35), float(0.25), is(1)), float(0.2), max(is(2), is(5))), float(0.7), max(max(is(4), is(6)), is(7)));
    metal = mix(float(0.05), float(0.6), is(1)).add(max(is(2), is(5)).mul(0.15));
  } else if (name === "Glow") {
    col = base.mul(fine.mul(0.03).add(0.98)); rough = float(0.9);
  }
  return { col, rough, metal, code };
}

/** The material for one glTF material name. lit: "lightmap" (UV1, three textures) or "vertex" (_lm* attributes). */
function makeMaterial(name, lit, maps) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.8 });
  m.lights = false;                                         // all lighting is baked (no city sun / lamps / IBL inside)
  const s = surface(name);
  const n = nightK();
  const day = float(1).sub(n);
  const sunUp = smoothstep(0.02, 0.15, env.uSunDir.y);
  let sky, sun, night;
  if (lit === "lightmap") {
    const u1 = uv(1);
    sky = rgbm(texture(maps.sky, u1)); sun = rgbm(texture(maps.sun, u1)); night = rgbm(texture(maps.night, u1));
  } else {
    sky = rgbm(attribute("_lmsky", "vec4")); sun = rgbm(attribute("_lmsun", "vec4")); night = rgbm(attribute("_lmnight", "vec4"));
  }
  const L = sky.mul(interiorLook.dayGain.mul(day)).mul(mix(vec3(1), vec3(env.uSkyTop).normalize().mul(1.4).add(0.2), 0.15))
    .add(sun.mul(interiorLook.sunGain.mul(day).mul(sunUp)).mul(vec3(env.uSunColor)))
    .add(night.mul(interiorLook.nightGain.mul(n)));
  const light = mix(vec3(1), L.mul(interiorLook.adapt), interiorLook.lightmaps).toVar();
  let out = s.col.mul(light);
  if (name === "Glow") out = out.add(s.col.mul(interiorLook.glow).mul(n).mul(step(s.code, 0.5).mul(0.6).add(step(0.5, s.code).mul(3.0))));
  out = select(interiorLook.view.equal(1), light.mul(0.5), select(interiorLook.view.equal(2), s.col, out));
  m.colorNode = out;
  m.roughnessNode = s.rough;
  m.metalnessNode = s.metal;
  return m;
}

function glassMaterial() {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const view = abs(dot(normalWorld, positionWorld.sub(cameraPosition).normalize()));
  const fres = pow(float(1).sub(view), 3.0).mul(0.7).add(0.06);
  const c = attribute("color", "vec4");
  const mirror = step(0.5, floor(c.a.mul(8.0)));
  const n = nightK();
  // env.uSkyHorizon is HDR under the Firmament sky: only its tint is used here
  const hz = vec3(env.uSkyHorizon), skyTint = hz.div(max(max(hz.x, hz.y), max(hz.z, 0.001)));
  const sky = mix(skyTint.mul(0.02), vec3(0.0006, 0.0008, 0.0012), n);        // the scene's exposure: 0.02 reads mid-grey
  m.colorNode = mix(sky, mix(skyTint.mul(0.0012).add(0.0009).add(fres.mul(0.003)).mul(interiorLook.adapt), vec3(0.0004, 0.00035, 0.0003), n), mirror);
  m.opacityNode = mix(fres, float(0.92), mirror);
  return m;
}

/** Load the cell. Resolves when everything is decoded and compiled (renderer.compileAsync), so showing it is free. */
export async function loadInterior(dir, { renderer = null, scene = null, camera = null } = {}) {
  const t0 = performance.now();
  const base = new URL(dir.endsWith("/") ? dir : dir + "/", location.href).href;
  const texLoader = new THREE.TextureLoader();
  const tex = (f) => texLoader.loadAsync(base + f).then((t) => {
    t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
    return t;
  });
  const [gltf, spec, info, sky, sun, night] = await Promise.all([
    loader().loadAsync(base + "interior.glb"), fetch(base + "house.json").then((r) => r.json()), fetch(base + "interior.json").then((r) => r.json()),
    tex("lm_sky.png"), tex("lm_sun.png"), tex("lm_night.png"),
  ]);
  const tLoad = performance.now();
  const maps = { sky, sun, night };
  const root = new THREE.Group(); root.name = "interior";
  const [ox, oz] = spec.frame.origin, [ex, ez] = spec.frame.ex;
  root.position.set(ox, spec.base, oz);
  root.rotation.y = Math.atan2(-ez, ex);
  const mats = new Map();
  const matFor = (name, lit) => {
    const k = name + "|" + lit;
    if (!mats.has(k)) mats.set(k, name === "Glass" ? glassMaterial() : makeMaterial(name, lit, maps));
    return mats.get(k);
  };
  let colliders = null, door = null, tris = 0, draws = 0;
  const drawn = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const node = o.parent?.isMesh ? o.parent : o;
    const owner = /Colliders/.test(o.name) || /Colliders/.test(o.parent?.name) ? "col" : /FrontDoor/.test(o.name) || /FrontDoor/.test(o.parent?.name) ? "door" : /Glass/.test(o.name) || /Glass/.test(o.parent?.name) ? "glass" : /Interior/.test(o.name) || /Interior/.test(o.parent?.name) ? "lm" : "vertex";
    if (owner === "col") { colliders = o; return; }
    const lit = owner === "lm" ? "lightmap" : "vertex";
    o.material = matFor(o.material.name || "Plaster", lit);
    o.castShadow = false; o.receiveShadow = false;
    // no renderOrder: three sorts opaque objects front to back, so the (near) interior is drawn before the city and its
    // walls reject the city's fragments early; a negative renderOrder would draw it before the Firmament sky, which
    // paints without a depth test
    tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; draws++;
    drawn.push(o);
  });
  // the front door: its glTF node sits on the hinge
  gltf.scene.traverse((o) => { if (!door && /FrontDoor/.test(o.name) && !o.isMesh) door = o; });
  if (!door) gltf.scene.traverse((o) => { if (!door && /FrontDoor/.test(o.name)) door = o; });
  root.add(gltf.scene);
  if (colliders) colliders.parent.remove(colliders);
  root.updateMatrixWorld(true);
  // collider triangles in world space (for the character's TriBVH)
  let colPos = new Float32Array(0);
  if (colliders) {
    colliders.updateMatrixWorld(true);
    const M = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, colliders.matrixWorld);
    const g = colliders.geometry.clone().applyMatrix4(M).toNonIndexed();
    colPos = g.attributes.position.array;
  }
  // the door's 'outside' trigger point and the hinge
  const doorInfo = info.frontDoor;
  const cell = {
    root, spec, info, maps, door, colliders: colPos, meshes: drawn, look: interiorLook,
    stats: { triangles: Math.round(tris), draws, loadMs: Math.round(tLoad - t0), lightmapBytes: 3 * 1024 * 1024 * 4 * 1.33 },
    doorOpen: 0,
    /** World -> house local (x along the street face, y above base, z into the house). */
    toLocal(p, out = new THREE.Vector3()) { const dx = p.x - ox, dz = p.z - oz; return out.set(dx * ex + dz * ez, p.y - spec.base, -dx * ez + dz * ex); },
    /** Inside the house's walls (footprint box, between the ground floor and the first-floor ceiling)? */
    contains(p, pad = 0) {
      const l = cell.toLocal(p, _v);
      return l.x > cell.info.inner.zf * 0 - pad + 0.0 && l.x < cell.info.inner.width + 0.3 + pad && l.z > 0.05 - pad && l.z < cell.info.inner.zb + 0.25 + pad && l.y > -0.5 && l.y < 6.6;
    },
    /** Per frame: the front door swings open when someone is within 2.6 m of it (ease), closes when they are gone. */
    update(dt, player, cam = null) {
      if (cam) {
        const n = interiorLook.dayOverride.value >= 0 ? 1 - interiorLook.dayOverride.value : env.uNight.value;
        const want = cell.contains(cam, -0.05) ? interiorLook.adaptInside * (1 - n) + interiorLook.adaptNight * n : 1;
        interiorLook.adapt.value += (want - interiorLook.adapt.value) * Math.min(1, dt * 1.5);
      }
      if (door) {
        let want = 0;
        if (player) { const l = cell.toLocal(player, _v); const h = doorInfo.hinge; if (Math.hypot(l.x - (h[0] + doorInfo.width / 2), l.z - h[2]) < 2.6) want = 1; }
        cell.doorOpen += (want - cell.doorOpen) * Math.min(1, dt * 2.2);
        door.rotation.y = -cell.doorOpen * 1.75;             // ~100 degrees, into the hall
      }
    },
    dispose() {
      root.removeFromParent();
      for (const o of drawn) o.geometry.dispose();
      for (const m of mats.values()) m.dispose();
      for (const t of Object.values(maps)) t.dispose();
    },
  };
  if (renderer && scene && camera) {
    // one material per frame: building a node material's shader is main-thread work (the GPU pipeline is async)
    const was = root.parent; scene.add(root); root.visible = true;
    const done = new Set();
    for (const o of drawn) {
      if (done.has(o.material)) continue;
      done.add(o.material);
      await renderer.compileAsync(o, camera, scene);
      await new Promise((r) => requestAnimationFrame(r));
    }
    if (!was) scene.remove(root);
  }
  cell.stats.readyMs = Math.round(performance.now() - t0);
  return cell;
}
const _v = new THREE.Vector3();
