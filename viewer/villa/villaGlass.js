// THE VILLA'S WINDOW GLASS v3 (claude/villa3, docs/VILLA_V3_PLAN.md item 0; ?villa3=0 = the round-2 glass).
// The owner: "last time I saw them they looked very fake, not like real windows at all". Why they looked fake (audit
// shots i0x / e0x): the near glass (the interior cell's) was a fixed sky-gradient tint at a constant 10-85 % opacity:
// no Fresnel balance (it grew milky head-on), no garden or tree line in the reflection, no sun glint, and the same from
// inside; the far glass (> 30 m) was a flat dark Standard pane whose only reflection was the PMREM sky.
// Now ONE glass model for every villa pane (the cell's curtain walls + balustrades, the exterior's far glass, the open
// bay's pane), built here:
//   - what glass reflects (villaReflection): the sky gradient (lighting.js env: horizon / zenith) above a TREE LINE (the
//     plot is ringed by tall trees: a dark band with a ragged top along the azimuth), the lawn / hedges below it, and
//     the SUN's glint (a tight lobe on the sun direction), all analytic (no SSR, no planar pass, no new light: rule
//     fixed-light-count; as the city's facade glass does, viewer/vanbuurenModel.js glassReflection); from INSIDE the
//     house the reflection is the lit room instead (strong at night: the windows turn to dark mirrors);
//   - Fresnel (Schlick, F0 0.05: two faces of a double glazed unit): see-through head-on, a mirror at grazing angles;
//   - the NEAR glass blends PREMULTIPLIED (src one, dst one-minus-src-alpha): out = reflection x F + behind x T (1 - F),
//     T = 0.86 (the unit's slight darkening): the room behind keeps its own baked light and depth, the reflection is
//     never dimmed by the alpha;
//   - the FAR glass (opaque, the interior not drawn) = the same reflection over a dim room tone that glows warm at night:
//     the cell's glass starts as exactly that (glassIn = 1) and fades to clear, so the swap at 30 m does not pop;
//   - a glass EDGE (the balustrades' top faces: horizontal faces of the glass slot) reads as thick green-tinted glass.
import * as THREE from "three/webgpu";
import {
  vec2, vec3, float, mix, smoothstep, clamp, abs, dot, max, pow, normalize, reflect, uniform, positionWorld, cameraPosition, normalWorld,
  floor, fract, atan,
} from "three/tsl";
import { env } from "../lighting.js";

export const GLASS_V3 = new URLSearchParams(location.search).get("villa3") !== "0";
/** the model files: ?villa3=0 loads the round-2 build kept in models/villa/v2/ (the before / after A/B) */
export const VILLA_DIR = GLASS_V3 ? "../../models/villa/" : "../../models/villa/v2/";
/** live look (uniforms: no recompile) */
export const glassLook = {
  refl: uniform(1.0), transmit: uniform(0.86), f0: uniform(0.05), sun: uniform(1.0), inside: uniform(0.0),
  room: uniform(new THREE.Color(0.42, 0.36, 0.3)), roomNight: uniform(new THREE.Color(1.0, 0.78, 0.55)), farNight: uniform(0.55),
};

const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash1 = (x) => { const p = fract(x.mul(0.1031)); const q = p.mul(p.add(33.33)); return fract(q.mul(q.add(q))); };   // (hash11, sin-free)
const noise1 = (x) => { const i = floor(x), f = fract(x), u = f.mul(f).mul(float(3).sub(f.mul(2))); return mix(hash1(i), hash1(i.add(1)), u); };

/** the outdoor reflection (radiance, linear) along the reflected direction R (world, normalised) */
function outdoor(R) {
  const n = env.uNight;
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(0.0, 0.65, R.y)).mul(float(1).sub(n.mul(0.9)));
  // the tree line: a ragged top (two octaves along the azimuth, 6-24 degrees up), dark green lit from above by the sky
  // (crowns: ~2-4 degree bumps over a slow swell, not a mountain range)
  const az = atan(R.z, R.x).mul(9.0);
  const top = noise1(az).mul(0.1).add(noise1(az.mul(4.3)).mul(0.06)).add(noise1(az.mul(13.0)).mul(0.03)).add(0.1);
  const trees = mix(lin(0x1d2a1a), lin(0x3c5232), smoothstep(-0.05, 0.25, R.y)).mul(mix(vec3(1.0), vec3(env.uSkyHorizon), 0.35)).mul(float(1).sub(n.mul(0.92)));
  const lawn = mix(lin(0x36452b), lin(0x262b22), smoothstep(-0.02, -0.5, R.y)).mul(float(1).sub(n.mul(0.95)));
  const below = mix(trees, lawn, smoothstep(0.0, -0.06, R.y));
  const scene = mix(below, sky, smoothstep(top.sub(0.012), top.add(0.012), R.y));
  // the sun's glint (a tight lobe; the sun's colour, bright: the TAAU and the bloom soften it)
  const sd = normalize(vec3(env.uSunDir));
  const glint = pow(max(dot(R, sd), 0.0), 900.0).mul(18.0).add(pow(max(dot(R, sd), 0.0), 60.0).mul(0.25));
  return scene.add(vec3(env.uSunColor).mul(glint).mul(smoothstep(0.0, 0.08, sd.y)).mul(float(1).sub(n)).mul(glassLook.sun));
}

/** { F, refl, edge }: Fresnel, the reflected radiance (outdoor or, from inside, the room), the edge mask */
export function villaReflection(roomLight = null, inside = glassLook.inside) {
  const V = normalize(positionWorld.sub(cameraPosition)).toVar();
  const N = normalWorld.toVar();
  const ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  const F = glassLook.f0.add(float(1).sub(glassLook.f0).mul(pow(float(1).sub(ndv), 5.0))).toVar();
  const R = reflect(V, N).toVar();
  const room = roomLight ?? mix(vec3(glassLook.room), vec3(glassLook.roomNight).mul(0.55), env.uNight);
  // (the room seen in the pane: brighter toward the lit ceiling, darker toward the floor; a flat colour read as fog)
  const roomR = vec3(room).mul(mix(float(0.45), float(1.4), smoothstep(-0.4, 0.6, R.y)));
  const refl = mix(outdoor(R), roomR, inside).mul(glassLook.refl);
  const edge = smoothstep(0.85, 0.95, abs(N.y));               // a horizontal face of the glass slot = a pane's edge
  return { F, refl, edge, ndv };
}

/** the room behind an opaque pane (the far glass): a dim warm tone by day, lit at night (a tone per 3 m bay) */
function farRoom() {
  const p = positionWorld;
  const bay = noise1(p.x.add(p.z).mul(0.33)).mul(0.6).add(0.4);
  const day = vec3(0.035, 0.032, 0.03).mul(mix(vec3(1.0), vec3(env.uSkyHorizon), 0.3));
  return mix(day, lin(0xffc58a).mul(bay).mul(glassLook.farNight), env.uNight);
}

/** the far glass's look (radiance): its reflection over the room tone; the cell's glass fades from this */
export function farGlassColor() {
  const { F, refl } = villaReflection(vec3(0, 0, 0), float(0));     // (the far glass is only ever seen from outside)
  return refl.mul(F).add(farRoom().mul(float(1).sub(F)).mul(glassLook.transmit));
}

/** the exterior's far glass (opaque Standard, so the LOD fades and AO wrapping still work): all its look emissive */
export function farGlassMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 1.0, metalness: 0.0 });
  m.colorNode = vec3(0, 0, 0);
  m.emissiveNode = farGlassColor();
  m.userData.glassV3 = "far";
  return m;
}

/** the interior cell's glass (transparent, premultiplied): glassIn 1 = the far glass's look (opaque), 0 = clear */
export function nearGlassMaterial(glassIn, roomLight) {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false });
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendEquationAlpha = THREE.AddEquation; m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  m.name = "villa interior glass_window (v3)";
  const r = villaReflection(roomLight);
  // the edge: thick glass seen edge-on (green, little transmission)
  const edgeCol = lin(0x5f8a7c).mul(0.35).mul(float(1).sub(env.uNight.mul(0.8)));
  const clear = { rgb: mix(r.refl.mul(r.F), edgeCol, r.edge), a: mix(float(1).sub(glassLook.transmit.mul(float(1).sub(r.F))), float(0.9), r.edge) };
  const far = farGlassColor();
  // (the colour is premultiplied: at glassIn = 1 rgb = the far glass's radiance and alpha = 1)
  m.colorNode = mix(clear.rgb, far, glassIn);
  m.opacityNode = mix(clear.a, float(1.0), glassIn);
  m.userData.glassV3 = "near";
  return m;
}
