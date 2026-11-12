// THE INTERIOR CELL in the viewer: models/interior/<house>/ (tools/blender/interior.py + tools/interior/packGlb.mjs):
//   interior.glb   meshes in the house frame: Interior (flat architecture, lightmap UV1), Props (furniture, frames,
//                  stair, mouldings: per-corner baked light _lmsky/_lmsun/_lmnight), FrontDoor (origin on the hinge),
//                  Glass, Colliders (not drawn)
//   lm_sky / lm_sun / lm_night.png   RGBM gamma-2 lightmaps (lin = (rgb * a * 4)^2), 1024²
//   refl_sky / refl_sun / refl_night.png   the mirrors' reflection cubes (RGBM gamma 2; 6 faces across, a row per mirror)
//   house.json, interior.json        the spec (frame, footprint, openings) and the build notes
// Lighting is all baked: final = albedo * (sky * uSky + sun * uSun + night * uNightL) (+ lamp-shade glow at night),
// albedo procedural from COLOR_0 (rgb, the pattern code in a) and UV0 (metres). The city's sun / sky / lamps do not
// light the interior (its materials are unlit: lights = false), so there are no shadow-map leaks at wall seams.
//
//   const cell = await loadInterior(dir)      cell.root (placed in the city), cell.update(dt, playerPos), cell.dispose()
//   cell.colliders: Float32Array (world triangles)   cell.look: live uniforms (gains, debug view)
//   interiorWarmup()                          dummy meshes with the cell's materials, for the boot warm-up (see below)
//
// The materials are module singletons (one per material name and lighting kind) whose textures are TextureNodes
// re-pointed at the cell's maps when it loads: the city's boot warm-up compiles them (interiorWarmup(): one tiny mesh
// per material with the GLB's exact attribute layout, so the node-builder cache key matches) under the loading cover,
// and the cell streaming in later builds no shader at all (it cost a 50-115 ms main-thread task: the largest
// material's node build).
import * as THREE from "three/webgpu";
import {
  Fn, attribute, uv, texture, vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, abs, min, max, sin, cos, dot, clamp, length,
  positionWorld, positionLocal, normalLocal, cameraPosition, normalWorld, normalView, cameraViewMatrix, modelWorldMatrixInverse,
  uniform, fwidth, pow, select, reflect,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "../lighting.js";
import { hash2D, noise2D, bumpNormal } from "../tslkit.js";

/** Live look controls (uniforms: no recompiles). */
export const interiorLook = {
  dayGain: uniform(0.9), sunGain: uniform(1.2), nightGain: uniform(0.3), glow: uniform(2.0),
  // eye adaptation inside: the cell's light is multiplied by `adapt`, eased toward `adaptInside` while the camera is in
  // the house and back to 1 outside (the city behind the windows keeps its exposure: it reads bright, as it should)
  adapt: uniform(1), adaptInside: 12.0, adaptNight: 2.5,
  lightmaps: uniform(1),            // 0 = albedo only (debug)
  view: uniform(0),                 // debug: 0 final, 1 lighting only, 2 albedo only
  dayOverride: uniform(-1),         // >= 0: forces the day/night mix (the lab's toggle); < 0 follows env.uNight
  sheen: uniform(1),                // fabrics: the grazing-angle sheen (0 = off, A/B)
  weave: uniform(1),                // fabrics: the weave relief (0 = off, A/B)
  mirrors: uniform(1),              // the mirrors' baked reflections (0 = the old flat grey, A/B)
};

let decoderReady = null;
function loader() {
  if (!decoderReady) { MeshoptDecoder.useWorkers?.(2); decoderReady = MeshoptDecoder.ready; }
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

const rgbm = (c) => { const v = c.rgb.mul(c.a).mul(4.0); return v.mul(v); };

/** The night factor: the lab can force it, else the city's env.uNight. */
const nightK = () => select(interiorLook.dayOverride.greaterThanEqual(0), float(1).sub(interiorLook.dayOverride), env.uNight);

/** The baked light mix of the three bakes (sky, sun, night radiance or irradiance), with the cell's eye adaptation. */
function bakedMix(sky, sun, night) {
  const n = nightK(), day = float(1).sub(n);
  const sunUp = smoothstep(0.02, 0.15, env.uSunDir.y);
  return sky.mul(interiorLook.dayGain.mul(day)).mul(mix(vec3(1), vec3(env.uSkyTop).normalize().mul(1.4).add(0.2), 0.15))
    .add(sun.mul(interiorLook.sunGain.mul(day).mul(sunUp)).mul(vec3(env.uSunColor)))
    .add(night.mul(interiorLook.nightGain.mul(n)));
}

// ------------------------------------------------------------------------------------------------ shared texture slots
// 1x1 stand-ins until a cell is loaded; every TextureNode made for a slot is re-pointed by bindMaps().
const SLOTS = ["sky", "sun", "night", "rsky", "rsun", "rnight"];
const placeholder = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
})();
const slotNodes = Object.fromEntries(SLOTS.map((s) => [s, []]));
let bound = {};
const slot = (name, uvNode) => { const n = texture(bound[name] || placeholder, uvNode); slotNodes[name].push(n); return n; };
function bindMaps(maps) { bound = maps; for (const s of SLOTS) for (const n of slotNodes[s]) n.value = maps[s] || placeholder; }

// the mirrors (interior.json "mirrors"): up to two reflection cubes, each box-projected onto its room
const MIR = { rows: uniform(1), list: [0, 1].map(() => ({ min: uniform(new THREE.Vector3()), max: uniform(new THREE.Vector3(1, 1, 1)), eye: uniform(new THREE.Vector3(0.5, 0.5, 0.5)) })) };
function bindMirrors(info) {
  const L = info.mirrors?.list || [];
  MIR.rows.value = Math.max(1, L.length);
  L.slice(0, 2).forEach((m, i) => { MIR.list[i].min.value.fromArray(m.box[0]); MIR.list[i].max.value.fromArray(m.box[1]); MIR.list[i].eye.value.fromArray(m.eye); });
}

/** Albedo + roughness per material from COLOR_0 (rgb, a = code / 8) and UV0 in metres. `spec` (optional): a colour
 *  added in proportion to the baked light (gilt highlights, fabric sheen): out = (col + spec) * light. */
function surface(name) {
  const c = attribute("color", "vec4");
  const base = c.rgb.toVar(), code = floor(c.a.mul(8.0)).toVar();
  const p = uv().toVar();
  const P = positionWorld;
  const fw = fwidth(p).toVar();
  const fine = noise2D(p.mul(37.0)).toVar();
  let col = base, rough = float(0.8), metal = float(0), spec = null;
  const is = (k) => step(abs(code.sub(k)), 0.5);
  const ndv = () => abs(dot(normalWorld, P.sub(cameraPosition).normalize()));
  if (name === "Plaster") {
    // paint: a soft mottle; brick (the outer reveals): courses as the city façade (6.75 cm, 23 cm)
    const mott = noise2D(p.mul(1.7)).mul(0.04).add(fine.mul(0.02)).add(0.97);
    const row = floor(p.y.div(0.0675)), bx = fract(p.x.div(0.23).add(row.mul(0.5))), by = fract(p.y.div(0.0675));
    const joint = max(smoothstep(0.08, 0.0, min(bx, float(1).sub(bx))), smoothstep(0.14, 0.0, min(by, float(1).sub(by))));
    const brick = mix(base.mul(hash2D(vec2(floor(p.x.div(0.23).add(row.mul(0.5))), row)).mul(0.35).add(0.8)), vec3(0.3, 0.28, 0.25), joint);
    col = mix(base.mul(mott), brick, is(1));
    rough = float(0.92);
  } else if (name === "Wood") {
    // grain along u: stretched noise rings; oak (1), walnut (2), pine (5); herringbone parquet (3); boards (4); gilt (6)
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
    // gilt (water gilding on a moulded frame): a darker body (the diffuse part of a metal is small) and a warm specular
    // that follows the moulding's curvature (grazing angles + the reflection of the bright upper room), a little wear
    // to the red bole on the high points
    const gIs = is(6);
    const wear = smoothstep(0.62, 0.8, noise2D(p.mul(14.0))).mul(0.35);
    const gold = mix(base, vec3(0.42, 0.13, 0.06), wear);
    const R = reflect(P.sub(cameraPosition).normalize(), normalWorld);
    const giltSpec = mix(gold, vec3(1.0, 0.82, 0.45), 0.3).mul(pow(float(1).sub(ndv()), 2.0).mul(1.9).add(smoothstep(-0.1, 0.7, R.y).mul(0.7)).add(0.18)).mul(fine.mul(0.2).add(0.9));
    col = mix(mix(mix(mix(painted, solid, max(max(is(1), is(2)), is(5))), parquet, is(3)), boards, is(4)), gold.mul(0.55), gIs);
    spec = giltSpec.mul(gIs);
    rough = mix(mix(float(0.55), float(0.45), max(is(3), is(4))), float(0.3), gIs);
    metal = mix(mix(float(0), float(0.12), max(is(3), is(4))), float(0.8), gIs);       // varnished floors: SSR picks the windows
  } else if (name === "Fabric") {
    // weave (0) / velvet (1) / rug (2, 6) / canvas painting + book spines (3) / linen (4) / knit (5)
    // the cloth's relief: the threads as a height field turned into a real (bumped) normal, lit by a soft key from
    // above the window side (the bake has no direction, so the relief gets a fixed one): a plain weave (0.9 mm
    // threads) on the upholstery, a slubbed linen, ribs on the knit; faded out before it aliases
    const weaveK = float(1).sub(smoothstep(0.0004, 0.0016, max(fw.x, fw.y))).mul(interiorLook.weave);
    const tA = p.mul(2.0 * Math.PI / 0.0018);
    const plain = sin(tA.x).mul(0.5).add(0.5).mul(cos(tA.y).mul(0.5).add(0.5)).add(sin(tA.x.add(Math.PI)).mul(0.5).add(0.5).mul(cos(tA.y.add(Math.PI)).mul(0.5).add(0.5)));
    const slub = noise2D(vec2(p.x.mul(30.0), p.y.mul(600.0))).mul(0.6).add(noise2D(vec2(p.x.mul(500.0), p.y.mul(25.0))).mul(0.4));
    const linenH = sin(tA.x.mul(0.7)).mul(0.5).add(0.5).mul(0.6).add(slub.mul(0.6));
    const knitH = abs(sin(p.x.mul(160.0)));
    const relief = mix(mix(plain, linenH, is(4)), knitH, is(5)).mul(mix(float(0.00045), float(0.0012), is(5))).mul(weaveK).mul(float(1).sub(max(max(is(1), is(3)), max(is(2), is(6)))));
    const nb = bumpNormal(relief);
    const key = cameraViewMatrix.mul(vec4(vec3(0.35, 0.85, -0.4).normalize(), 0)).xyz;
    const lam = (n) => dot(n, key).mul(0.5).add(0.5);
    const shade = lam(nb).div(max(lam(normalView), 0.15)).clamp(0.6, 1.4);
    // macro form: a gentle top light on cushions and folds (the per-corner bake is soft)
    const form = normalWorld.y.mul(0.07).add(0.97);
    const wv = sin(p.x.mul(1400.0)).mul(sin(p.y.mul(1400.0))).mul(0.5).add(0.5);
    const weave = base.mul(wv.mul(0.06).mul(weaveK).add(0.97)).mul(fine.mul(0.05).add(0.97));
    const velvet = base.mul(fine.mul(0.06).add(0.97));
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
    const linen = base.mul(noise2D(p.mul(vec2(2.0, 40.0))).mul(0.06).add(0.97)).mul(slub.mul(0.06).mul(weaveK).add(0.97));
    const knit = base.mul(smoothstep(0.2, 0.8, abs(sin(p.x.mul(160.0)))).mul(0.15).add(0.88));
    col = mix(mix(mix(mix(mix(weave, velvet, is(1)), rug, is(2)), paint, is(3)), linen, is(4)), knit, is(5));
    col = mix(col, rug2, is(6)).mul(shade).mul(form);
    // sheen: cloth brightens at grazing angles (the fibres catch the light along their length): strong on velvet
    // (its nap), present on woven upholstery, linen and knit, little on rugs, none on the paintings
    const sheenK = mix(mix(mix(mix(float(0.38), float(0.95), is(1)), float(0.12), max(is(2), is(6))), float(0.0), is(3)), float(0.3), max(is(4), is(5)));
    const g = float(1).sub(ndv());
    // (velvet: the pile is crushed in soft patches, which catch the sheen unevenly)
    const crush = mix(float(1), noise2D(p.mul(4.0)).mul(0.7).add(0.65), is(1));
    spec = mix(base, vec3(1), 0.25).mul(pow(g, mix(float(3.0), float(2.4), is(1))).mul(sheenK).mul(crush)).mul(interiorLook.sheen);
    // velvet's pile darkening face-on (looking into the nap)
    col = col.mul(mix(float(1), mix(float(1), mix(float(0.7), float(1.0), g), interiorLook.sheen), is(1)));
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
  return { col, rough, metal, code, spec };
}

/** The material for one glTF material name. lit: "lightmap" (UV1, three textures) or "vertex" (_lm* attributes). */
function makeMaterial(name, lit) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.8 });
  m.lights = false;                                         // all lighting is baked (no city sun / lamps / IBL inside)
  const s = surface(name);
  const n = nightK();
  let sky, sun, night;
  if (lit === "lightmap") {
    const u1 = uv(1);
    sky = rgbm(slot("sky", u1)); sun = rgbm(slot("sun", u1)); night = rgbm(slot("night", u1));
  } else {
    sky = rgbm(attribute("_lmsky", "vec4")); sun = rgbm(attribute("_lmsun", "vec4")); night = rgbm(attribute("_lmnight", "vec4"));
  }
  const light = mix(vec3(1), bakedMix(sky, sun, night).mul(interiorLook.adapt), interiorLook.lightmaps).toVar();
  let out = (s.spec ? s.col.add(s.spec) : s.col).mul(light);
  if (name === "Glow") out = out.add(s.col.mul(interiorLook.glow).mul(n).mul(step(s.code, 0.5).mul(0.6).add(step(0.5, s.code).mul(3.0))));
  out = select(interiorLook.view.equal(1), light.mul(0.5), select(interiorLook.view.equal(2), s.col, out));
  m.colorNode = out;
  m.roughnessNode = s.rough;
  m.metalnessNode = s.metal;
  return m;
}

/** Window glass (clear: a sky-tinted Fresnel sheen) and the mirrors (codes 1, 2): the baked reflection cube of the
 *  mirror's room, box-projected (the reflected ray is intersected with the room's box and the cube is read toward the
 *  hit point from where it was rendered: correct parallax on a planar mirror), a slightly warm, aged silvering. */
function glassMaterial() {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const view = abs(dot(normalWorld, positionWorld.sub(cameraPosition).normalize()));
  const fres = pow(float(1).sub(view), 3.0).mul(0.7).add(0.06);
  const c = attribute("color", "vec4");
  const code = floor(c.a.mul(8.0));
  const mirror = step(0.5, code).mul(step(code, 2.5));
  const opal = step(2.5, code);
  const n = nightK();
  // env.uSkyHorizon is HDR under the Firmament sky: only its tint is used here
  const hz = vec3(env.uSkyHorizon), skyTint = hz.div(max(max(hz.x, hz.y), max(hz.z, 0.001)));
  const sky = mix(skyTint.mul(0.02), vec3(0.0006, 0.0008, 0.0012), n);        // the scene's exposure: 0.02 reads mid-grey
  const flat = mix(skyTint.mul(0.0012).add(0.0009).add(fres.mul(0.003)).mul(interiorLook.adapt), vec3(0.0004, 0.00035, 0.0003), n);
  // --- the reflection (house-local: the Props / Glass meshes are in the house frame)
  const mi = code.sub(1).clamp(0, 1);
  const pick = (k) => select(mi.lessThan(0.5), MIR.list[0][k], MIR.list[1][k]);
  const bmin = pick("min"), bmax = pick("max"), eye = pick("eye");
  const Pl = positionLocal;
  const camL = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
  const Rr = reflect(Pl.sub(camL).normalize(), normalLocal.normalize()).toVar();
  const Rs = Rr.add(vec3(1e-5)).toVar();
  const far = vec3(select(Rs.x.greaterThan(0), bmax.x, bmin.x), select(Rs.y.greaterThan(0), bmax.y, bmin.y), select(Rs.z.greaterThan(0), bmax.z, bmin.z));
  const tb = far.sub(Pl).div(Rs);
  const t = max(min(min(tb.x, tb.y), tb.z), 0.0);
  const D = Pl.add(Rr.mul(t)).sub(eye).toVar();
  const a = abs(D).toVar();
  const isX = a.x.greaterThanEqual(a.y).and(a.x.greaterThanEqual(a.z)), isY = a.y.greaterThanEqual(a.z);
  const face = select(isX, select(D.x.greaterThan(0), float(0), float(1)), select(isY, select(D.y.greaterThan(0), float(2), float(3)), select(D.z.greaterThan(0), float(4), float(5))));
  const ma = select(isX, a.x, select(isY, a.y, a.z));
  // right = forward x up per face (tools/blender/interior.py FACES): +x: +z, -x: -z, +y / -y: +x, +z: -x, -z: +x
  const uc = select(isX, D.z.mul(select(D.x.greaterThan(0), float(1), float(-1))), select(isY, D.x, D.x.mul(select(D.z.greaterThan(0), float(-1), float(1))))).div(ma);
  // up: +y for the side faces, +z for +y, -z for -y
  const vc = select(isX, D.y, select(isY, D.z.mul(select(D.y.greaterThan(0), float(1), float(-1))), D.y)).div(ma);
  const h = float(0.5 / 256);
  const fu = uc.mul(0.5).add(0.5).clamp(h, float(1).sub(h)), fv = float(0.5).sub(vc.mul(0.5)).clamp(h, float(1).sub(h));
  const auv = vec2(face.add(fu).div(6.0), mi.add(fv).div(MIR.rows));
  // (highlights soft-compressed: an old plate is a little hazy, and a sunlit window in it should not bloom like a lamp)
  const refl0 = bakedMix(rgbm(slot("rsky", auv)), rgbm(slot("rsun", auv)), rgbm(slot("rnight", auv))).mul(interiorLook.adapt);
  const refl = refl0.div(refl0.mul(0.12).add(1.0));
  // aged silvering: ~85 % reflectance, a faint warm cast, soft cloudy patches and a few specks
  const age = noise2D(uv().mul(3.0)).mul(0.12).add(noise2D(uv().mul(40.0)).mul(0.05)).add(0.84);
  const speck = smoothstep(0.972, 0.995, noise2D(uv().mul(70.0))).mul(0.3);
  const mirrorCol = mix(refl.mul(vec3(1.0, 0.97, 0.92)).mul(age).mul(float(1).sub(speck)), flat, float(1).sub(interiorLook.mirrors));
  // the stairwell laylight (code 3): frosted glass, lit from above through the light well (transmittance x the well's
  // irradiance, in the bake's units: the sky / sun / night radiance a diffuser of albedo ~0.7 would show), with a faint
  // cloudy texture and the leading of its panes; at night it catches the stairwell lantern's light from below
  const opalCol = bakedMix(vec3(0.11, 0.115, 0.12), vec3(0.06), vec3(0.35, 0.3, 0.24)).mul(interiorLook.adapt)
    .mul(noise2D(uv().mul(6.0)).mul(0.1).add(noise2D(uv().mul(55.0)).mul(0.06)).add(0.88)).mul(c.rgb.mul(1.1));
  m.colorNode = mix(mix(sky, mirrorCol, mirror), opalCol, opal);
  m.opacityNode = mix(mix(fres, float(1.0), mirror), float(1.0), opal);
  return m;
}

// ------------------------------------------------------------------------------------------------ the shared materials
const MATS = new Map();
function materialFor(name, lit) {
  const k = name === "Glass" ? "Glass" : name + "|" + lit;
  if (!MATS.has(k)) MATS.set(k, name === "Glass" ? glassMaterial() : makeMaterial(name, lit));
  return MATS.get(k);
}

// The GLB's meshes and their attribute layouts (tools/interior/packGlb.mjs: COLOR_0 and _LM* uint8 normalized vec4).
// interiorWarmup() builds one dummy per (material, layout) with the same attribute names, sizes and normalized flags:
// three's node-builder cache key is the material + these (RenderObject.getGeometryCacheKey), so the real cell then
// reuses the shaders. loadInterior() warns when the real layout differs (the warm-up would then miss).
const LAYOUT = {
  lightmap: [["position", 3], ["normal", 3], ["uv", 2], ["uv1", 2], ["color", 4, true]],
  vertex: [["position", 3], ["normal", 3], ["uv", 2], ["color", 4, true], ["_lmsky", 4, true], ["_lmsun", 4, true], ["_lmnight", 4, true]],
  glass: [["position", 3], ["normal", 3], ["uv", 2], ["color", 4, true]],
};
const WARM = [
  ...["Plaster", "Wood", "Hard"].map((n) => [n, "lightmap", "lightmap"]),
  ...["Plaster", "Wood", "Fabric", "Hard", "Glow", "Glass"].map((n) => [n, "vertex", "vertex"]),
  ["Glass", "vertex", "glass"],
];
const layoutKey = (g) => Object.keys(g.attributes).sort().map((k) => `${k},${g.attributes[k].itemSize},${g.attributes[k].normalized ? "n" : ""}`).join(";");

/** Dummy meshes carrying every interior material with the GLB's attribute layouts: add them to the scene for the
 *  boot warm-up (viewer/warmup.js warmBoot compiles every drawable, forced visible, never culled), then remove. */
let warmedUp = false;
export function interiorWarmup() {
  warmedUp = true;
  const g = new THREE.Group(); g.name = "interior warm-up";
  for (const [name, lit, layout] of WARM) {
    const geo = new THREE.BufferGeometry();
    for (const [a, n, norm] of LAYOUT[layout]) {
      geo.setAttribute(a, norm ? new THREE.BufferAttribute(new Uint8Array(3 * n), n, true) : new THREE.BufferAttribute(new Float32Array(3 * n), n));
    }
    const mesh = new THREE.Mesh(geo, materialFor(name, lit));
    mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    g.add(mesh);
  }
  return g;
}

/** Load the cell. Resolves when everything is decoded and compiled (renderer.compileAsync), so showing it is free. */
export async function loadInterior(dir, { renderer = null, scene = null, camera = null } = {}) {
  const t0 = performance.now();
  const base = new URL(dir.endsWith("/") ? dir : dir + "/", location.href).href;
  // ImageBitmaps: the PNGs decode off the main thread (an <img> decodes on first upload, on the main thread); no
  // premultiply / colour conversion: the alpha is the RGBM scale
  const bmpLoader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "none", premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const tex = (f, mips = true) => bmpLoader.loadAsync(base + f).then((bmp) => {
    const t = new THREE.Texture(bmp);
    t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = mips;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.anisotropy = mips ? 4 : 1;
    t.needsUpdate = true;
    return t;
  });
  const [gltf, spec, info] = await Promise.all([
    loader().loadAsync(base + "interior.glb"), fetch(base + "house.json").then((r) => r.json()), fetch(base + "interior.json").then((r) => r.json()),
  ]);
  const rf = info.mirrors?.files;
  const [sky, sun, night, rsky, rsun, rnight] = await Promise.all([
    tex("lm_sky.png"), tex("lm_sun.png"), tex("lm_night.png"),
    ...(rf ? [tex(rf.sky, false), tex(rf.sun, false), tex(rf.night, false)] : [null, null, null]),
  ]);
  const tLoad = performance.now();
  const maps = { sky, sun, night, rsky, rsun, rnight };
  bindMaps(maps); bindMirrors(info);
  if (!rf) interiorLook.mirrors.value = 0;
  const root = new THREE.Group(); root.name = "interior";
  const [ox, oz] = spec.frame.origin, [ex, ez] = spec.frame.ex;
  root.position.set(ox, spec.base, oz);
  root.rotation.y = Math.atan2(-ez, ex);
  let colliders = null, door = null, tris = 0, draws = 0;
  const drawn = [], layouts = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const owner = /Colliders/.test(o.name) || /Colliders/.test(o.parent?.name) ? "col" : /FrontDoor/.test(o.name) || /FrontDoor/.test(o.parent?.name) ? "door" : /Glass/.test(o.name) || /Glass/.test(o.parent?.name) ? "glass" : /Interior/.test(o.name) || /Interior/.test(o.parent?.name) ? "lm" : "vertex";
    if (owner === "col") { colliders = o; return; }
    const lit = owner === "lm" ? "lightmap" : "vertex";
    o.material = materialFor(o.material.name || "Plaster", lit);
    o.castShadow = false; o.receiveShadow = false;
    layouts.push(layoutKey(o.geometry));
    // no renderOrder: three sorts opaque objects front to back, so the (near) interior is drawn before the city and its
    // walls reject the city's fragments early; a negative renderOrder would draw it before the Firmament sky, which
    // paints without a depth test
    tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; draws++;
    drawn.push(o);
  });
  {   // the warm-up's dummies must have these layouts, or the boot warm-up compiled other shaders than the cell's
    const known = new Set(Object.values(LAYOUT).map((L) => L.map(([a, n, norm]) => `${a},${n},${norm ? "n" : ""}`).sort().join(";")));
    const miss = [...new Set(layouts)].filter((k) => !known.has(k));
    if (miss.length) console.warn("[interior] GLB attribute layout not covered by interiorWarmup():", miss);
  }
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
    /** The materials are shared singletons (compiled once, by the boot warm-up or the first load): kept; the slots go
     *  back to the stand-ins, the geometry and the maps are freed. */
    dispose() {
      root.removeFromParent();
      for (const o of drawn) o.geometry.dispose();
      bindMaps({});
      for (const t of Object.values(maps)) t?.dispose();
    },
  };
  if (renderer && scene && camera && !warmedUp) {
    // one material per frame: building a node material's shader is main-thread work (the GPU pipeline is async).
    // Skipped when the boot warm-up compiled the materials: compileAsync builds for the canvas target (no MRT), a
    // different variant from the scene pass's, so it would build every shader again (the 50-115 ms long task)
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
