// THE BMX SPOT'S LOOK (bike lab 2; viewer/bike/bikeSpot.js + bikeSpotMeshes.js): the city's lighting / sky / shadows /
// post chain (viewer/lighting.js owns the fixed light set: nothing here adds a light), and the spot's materials:
//   ground   ONE material for the fine + far grids: CC0 scans (the city's ground arrays: lawn / dry / soil / gravel;
//            the library's asphalt + paving concrete) blended by the vertex paint weights, the edges broken by noise and
//            by the textures' own height (no saw-tooth, no straight seam), worn grass round the dirt
//   wood     the ramps: planks across the run (seams, screws, grain, a plank's own tint), plywood sides, weathered
//   concrete cast skatepark concrete (3D noise: no stretch on the quarter pipe), saw-cut joints, dirt at the foot
//   graffiti the wall's concrete with invented tags painted in (a canvas on its faces: no decal planes, no z-fight)
//   houses   Brussels terraces: brick / render by seed, blue-stone plinths, windows + doors in the facade's material
// Plus the city's grass blades on the grass and its stylised trees round the spot.
import * as THREE from "three/webgpu";
import { positionWorld, mx_noise_float, vec2, vec3, vec4, float, mix, smoothstep, fract, floor, abs, min, max, hash, color, normalWorld, attribute, texture, step, clamp, select, transformNormalToView, cameraPosition, length } from "three/tsl";
import { Lighting } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { loadGroundTextures } from "../viewer/materials/groundTex.js";
import { loadScans, SCANS } from "../viewer/materials/scans.js";
import { noiseTex } from "../viewer/ground.js";
import { Grass } from "../viewer/grass/grass.js";
import { STREET, setTreeRenderer, setTreeLighting } from "../viewer/treesStylized.js";
import { lodEye } from "../viewer/lodFade.js";
import { wind } from "../viewer/foliage/wind.js";
import { SPOT, terrainH, spotPaint, solidAt, spotHeight } from "../viewer/bike/bikeSpot.js";
import { buildSpotMeshes } from "../viewer/bike/bikeSpotMeshes.js";

const P = positionWorld;
const n3 = (k, o = 0) => mx_noise_float(P.mul(k).add(o)).mul(0.5).add(0.5);          // 0..1
const aux = attribute("aux", "vec4");
const one = float(1);

/** the world normal bent by a tangent-space normal map (x, y in 0..1) on a near-horizontal surface: the texture frame
 *  is (x, -z) */
const bentNormal = (nrg, k = 1) => {
  const nx = nrg.x.mul(2).sub(1).mul(k), ny = nrg.y.mul(2).sub(1).mul(k);
  return transformNormalToView(normalWorld.add(vec3(nx, 0, ny.negate())).normalize());
};

function groundMat(G) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const xz = vec2(P.x, P.z);
  const nA = texture(noiseTex, xz.div(23)), nB = texture(noiseTex, xz.div(5.3).add(0.37)), nC = texture(noiseTex, xz.div(97).add(0.71));
  const w = aux;
  // the paint's edges broken: the vertex weights (soft over ~0.5 m) + two octaves of noise, then sharpened
  const brk = nB.r.sub(0.5).mul(0.55).add(nA.g.sub(0.5).mul(0.35));
  const sharp = (x) => smoothstep(0.38, 0.62, x.add(brk));
  const wA = sharp(w.x), wC = smoothstep(0.45, 0.55, w.y), wD = sharp(w.z), wG = sharp(w.w);
  const L = Object.fromEntries(G.layers.map((l) => [l.cover, l]));
  const arr = (cover, scale = 1) => {
    const l = L[cover], uv = vec2(P.x, P.z.negate()).div(l.size_m * scale);
    return { a: texture(G.albedo, uv).depth(l.layer), n: texture(G.nra, uv).depth(l.layer) };
  };
  const scan = (name, scale = 1, rot = 0) => {
    const S = SCANS[name], sz = (S.meta?.size_m || 2) * scale;
    let uv = vec2(P.x, P.z.negate()).div(sz);
    if (rot) uv = vec2(uv.x.mul(Math.cos(rot)).sub(uv.y.mul(Math.sin(rot))), uv.x.mul(Math.sin(rot)).add(uv.y.mul(Math.cos(rot)))).add(0.37);
    return { a: texture(S.albedo, uv), n: texture(S.nra, uv) };
  };
  const lawn = arr("lawn"), dry = arr("dry"), soil = arr("soil"), grav = arr("gravel"), lawn2 = arr("lawn", 2.7);
  const asph = scan("asphalt"), asph2 = scan("asphalt", 3.1, 0.9), conc = scan("paving_concrete");
  // grass: lawn (two scales against tiling) <-> dry patches, worn near the dirt / the plaza (where feet and wheels go)
  const near = max(w.x, max(w.z, w.w));
  const dryW = smoothstep(0.55, 0.8, nC.r.mul(0.6).add(nA.b.mul(0.4))).add(smoothstep(0.05, 0.6, near).mul(0.55)).min(1);
  const lawnA = mix(lawn.a, lawn2.a, nA.r.mul(0.6).add(0.2));
  let gA = mix(lawnA.rgb, dry.a.rgb.mul(vec3(1.0, 0.97, 0.9)), dryW);
  let gN = mix(lawn.n, dry.n, dryW);
  const bare = smoothstep(0.62, 0.9, nB.g.mul(0.5).add(near.mul(0.7))).mul(0.85);
  gA = mix(gA, soil.a.rgb, bare); gN = mix(gN, soil.n, bare);
  gA = gA.mul(mix(float(0.86), float(1.1), nC.g));                                   // macro tone (~40 m)
  // asphalt: two scales, worn lighter where it is ridden, darker oil / damp patches
  let aA = mix(asph.a.rgb, asph2.a.rgb, nA.b.mul(0.7).add(0.15));
  aA = aA.mul(mix(float(0.82), float(1.12), nC.b)).mul(mix(float(1.0), float(0.7), smoothstep(0.72, 0.9, nA.a)));
  const aN = mix(asph.n, asph2.n, 0.5);
  // the dirt: packed soil, gravel scattered over it; the gravel pad: gravel over soil
  // (packed BMX dirt: the soil scan lifted to a dry mid brown and flattened toward it - ridden smooth; a few pebbles)
  const dA = mix(soil.a.rgb.mul(vec3(1.5, 1.25, 1.0)), color(0x8a6c4c), 0.45).mul(mix(float(0.88), float(1.08), nB.b)).mul(mix(float(1), float(0.85), smoothstep(0.7, 0.95, nA.a)));
  const dN = mix(soil.n, vec4(0.5, 0.5, 0.85, 1), 0.5);
  // the layers by weight (grass under everything; the texture's luminance lets grass blades / pebbles poke through)
  let col = gA, nrm = gN;
  const lum = (c) => c.r.mul(0.3).add(c.g.mul(0.59)).add(c.b.mul(0.11));
  const hb = (wt, a) => clamp(wt.add(lum(a).sub(0.15).mul(wt.mul(one.sub(wt)).mul(3))), 0, 1);
  const kD = hb(wD, dA), kG = hb(wG, grav.a.rgb), kA = hb(wA, aA);
  col = mix(col, dA, kD); nrm = mix(nrm, dN, kD);
  col = mix(col, grav.a.rgb.mul(vec3(0.72, 0.68, 0.62)), kG); nrm = mix(nrm, grav.n, kG);
  col = mix(col, aA, kA); nrm = mix(nrm, aN, kA);
  col = mix(col, conc.a.rgb.mul(1.05), wC); nrm = mix(nrm, conc.n, wC);
  // a dark line of dirt along the asphalt's edge (where the grass meets it) - soft, no stripe
  col = col.mul(one.sub(kA.mul(one.sub(kA)).mul(0.6)));
  m.colorNode = col;
  m.normalNode = bentNormal(nrm, 0.9);
  m.roughnessNode = nrm.b.mul(0.35).add(0.62);
  m.aoNode = nrm.a.mul(0.6).add(0.4);
  return m;
}

/** wooden ramps: aux = (s along the run, across, 0, 1) */
function woodMat() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
  const W = 0.145, u = aux.x.div(W), v = aux.y;
  const plank = floor(u), f = fract(u);
  const seam = smoothstep(0.0, 0.05, f).mul(smoothstep(1.0, 0.95, f));
  const tint = hash(plank.add(17.3)).mul(0.2).add(0.88);
  const grain = mx_noise_float(vec3(v.mul(0.9), plank.mul(3.1), f.mul(7))).mul(0.5).add(0.5);
  const fine = mx_noise_float(vec3(v.mul(14), plank.mul(5.3), f.mul(30))).mul(0.5).add(0.5);
  const sv = fract(v.div(0.6)), screw = smoothstep(0.012, 0.004, abs(sv.sub(0.5)).mul(0.6)).mul(smoothstep(0.03, 0.01, abs(f.sub(0.2)).min(abs(f.sub(0.8))).mul(W)));
  // weathered: sun-greyed planks, a darker wheel track down the middle, damp + dirt at the foot
  const weather = n3(0.6, 4);
  let base = mix(color(0xb08a5e), color(0x8a6a48), grain.mul(0.55).add(fine.mul(0.2))).mul(tint);
  base = mix(base, color(0x9a948a), weather.mul(0.35));
  const track = smoothstep(0.55, 0.0, abs(v.sub(0.8)).min(abs(v.sub(1.2)))).mul(0.12);
  let top = mix(base.mul(0.5), base, seam).mul(one.sub(screw.mul(0.6))).add(color(0x8a9096).mul(screw.mul(0.5))).mul(one.sub(track));
  // the plywood sides (faces across the width): pale layers along the height
  const side = smoothstep(0.6, 0.8, one.sub(abs(normalWorld.y)));        // (the sides and the back: plywood)
  const ply = mix(color(0xc4a57a), color(0x9a7a52), smoothstep(0.4, 0.6, fract(P.y.mul(55)))).mul(mix(float(0.88), float(1.05), n3(3, 9)));
  let c = mix(top, mix(base, ply, 0.45), side);
  c = c.mul(mix(float(0.7), one, smoothstep(0.02, 0.18, P.y)));                     // damp at the foot
  m.colorNode = c;
  m.metalnessNode = screw.mul(0.6).mul(one.sub(side));
  m.roughnessNode = mix(float(0.82), float(0.7), track.mul(5));
  return m;
}
/** skatepark concrete (3D noise: the quarter pipe's face unstretched), saw-cut joints every 2 m, wear, dirt at the foot */
function concreteMat({ joints = true, tint = 0xc2beb5 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  const jx = abs(fract(P.x.div(2)).sub(0.5)), jz = abs(fract(P.z.div(2)).sub(0.5));
  const joint = joints ? smoothstep(0.4965, 0.4995, max(jx, jz)).mul(smoothstep(0.5, 0.9, normalWorld.y)) : float(0);
  const mott = n3(0.9), fine = n3(9, 3), grit = smoothstep(0.7, 0.9, n3(40, 5)), wear = smoothstep(0.55, 0.85, n3(0.35, 7));
  let c = mix(color(tint), color(0x99958b), mott.mul(0.5).add(fine.mul(0.25))).mul(one.sub(wear.mul(0.14))).mul(one.sub(joint.mul(0.5))).mul(one.sub(grit.mul(0.08)));
  // rain streaks down the vertical faces, dirt splash at the foot
  const vert = one.sub(abs(normalWorld.y));
  const streak = smoothstep(0.55, 0.85, mx_noise_float(vec3(P.x.mul(3), P.y.mul(0.25), P.z.mul(3))).mul(0.5).add(0.5)).mul(vert).mul(0.18);
  c = c.mul(one.sub(streak)).mul(mix(float(0.72), one, smoothstep(0.0, 0.25, P.y)));
  m.colorNode = c;
  m.roughnessNode = mix(float(0.9), float(0.6), wear.mul(normalWorld.y.max(0)));
  return m;
}
/** the graffiti wall: concrete + the tags (a canvas: the +z face the top half, the -z face the bottom half) */
function graffitiMat(x0, x1, h) {
  const m = concreteMat({ joints: false, tint: 0xb9b5ab });
  const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 1024;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, cv.width, cv.height);
  const R = (k) => { const x = Math.sin(k * 91.7 + 3.1) * 43758.5; return x - Math.floor(x); };
  const tags = [["ZOOT", "#e8452c", "#1d1d1d"], ["KRAZ", "#2e7dd6", "#f2f2f2"], ["UCL 92", "#f2c12e", "#2a2a2a"], ["SKRT", "#3aa65a", "#111"], ["RAD", "#d63ad0", "#fff"], ["BONK", "#ff8a1e", "#222"], ["DIEWEG", "#f4f1ea", "#c8302c"], ["MOLO", "#21b3b3", "#111"]];
  const paint = (yBase, seed) => {
    let x = 30;
    for (let i = 0; i < 5; i++) {
      const [t, fill, line] = tags[(i * 3 + seed) % tags.length];
      const size = 130 + R(i + seed) * 90, rot = (R(i * 7 + seed) - 0.5) * 0.18;
      // (the canvas maps 2048 px to the wall's 18 m and 512 px to its 2.3 m: letters squeezed 0.5 across to read true)
      g.save(); g.translate(x + size * 0.2, yBase + 300 + (R(i + 11 + seed) - 0.5) * 80); g.rotate(rot); g.scale(0.5, 1);
      g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; g.lineJoin = "round";
      g.lineWidth = size * 0.16; g.strokeStyle = line; g.strokeText(t, 0, 0);
      g.fillStyle = fill; g.fillText(t, 0, 0);
      g.lineWidth = size * 0.03; g.strokeStyle = "rgba(255,255,255,.65)"; g.strokeText(t, size * 0.02, -size * 0.03);
      g.restore();
      x += size * t.length * 0.62 * 0.5 + 90 + R(i + 5 + seed) * 120;
      if (x > 1900) break;
    }
    // drips and a few marker tags
    g.fillStyle = "rgba(20,20,20,.85)"; g.font = `italic 700 48px "Comic Sans MS", cursive`;
    g.save(); g.scale(0.5, 1); g.fillText("jo + mel", (1700 - seed * 90) * 2, yBase + 470); g.fillText("BXL", (180 + seed * 260) * 2, yBase + 110); g.restore();
  };
  paint(0, 0); paint(512, 3);
  const tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.needsUpdate = true;
  const u = P.x.sub(x0).div(x1 - x0), v = P.y.div(h).clamp(0, 1);
  // (checked on screen: each face reads its tags left to right, upright)
  const front = step(0.5, normalWorld.z), backF = step(0.5, normalWorld.z.negate());
  const tf = texture(tex, vec2(u, one.sub(v).mul(0.5))), tb = texture(tex, vec2(one.sub(u), one.sub(v).mul(0.5).add(0.5)));
  const a = tf.a.mul(front).add(tb.a.mul(backF)).mul(smoothstep(0.02, 0.12, v)).mul(0.92).mul(mix(float(0.75), one, n3(2.2, 13)));     // worn paint
  const rgb = tf.rgb.mul(front).add(tb.rgb.mul(backF));
  m.colorNode = mix(m.colorNode, rgb, a);
  return m;
}
function houseMat() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
  const u = aux.x, v = aux.y, seed = aux.z, kind = aux.w, H = kind.sub(1).max(0);
  const fac = step(0.5, kind);
  const sz = (n) => SCANS[n]?.meta?.size_m || 1.6;
  const uvW = vec2(u, v);
  const brick = texture(SCANS.brick_red_brussels.albedo, uvW.div(sz("brick_red_brussels"))).rgb;
  const render = texture(SCANS.render_white.albedo, uvW.div(sz("render_white"))).rgb;
  const yellow = brick.mul(vec3(1.5, 1.25, 0.85)).add(0.04);
  const tintR = mix(vec3(1, 1, 1), vec3(0.93, 0.88, 0.78), step(0.85, seed));
  let wall = select(seed.lessThan(0.45), brick, select(seed.lessThan(0.62), yellow, render.mul(tintR)));
  // the party walls / the back: plainer brick
  wall = mix(brick.mul(0.85), wall, fac);
  // the blue-stone plinth
  wall = mix(color(0x4d5257).mul(n3(3, 2).mul(0.25).add(0.85)), wall, smoothstep(0.42, 0.46, v));
  // windows: a column every 1.7 m, a floor every 3 m from 0.6 m; frames white, glass dark with a sky sheen; a door
  const cu = fract(u.div(1.7)), fl = v.sub(0.6).div(3), cv = fract(fl);
  const inWin = smoothstep(0.18, 0.2, cu).mul(smoothstep(0.82, 0.8, cu)).mul(smoothstep(0.22, 0.24, cv)).mul(smoothstep(0.78, 0.76, cv)).mul(step(0.0, fl)).mul(step(v, H.sub(0.6))).mul(fac);
  const inGlass = smoothstep(0.215, 0.225, cu).mul(smoothstep(0.785, 0.775, cu)).mul(smoothstep(0.245, 0.255, cv)).mul(smoothstep(0.755, 0.745, cv));
  const bar = smoothstep(0.012, 0.004, abs(cu.sub(0.5))).max(smoothstep(0.012, 0.004, abs(cv.sub(0.58))));
  const glass = mix(color(0x1a222c), color(0x6d7f92), smoothstep(0.2, 0.9, fract(cv.mul(1.3).add(cu.mul(0.4))))).mul(0.9);
  const lintel = smoothstep(0.76, 0.77, cv).mul(smoothstep(0.82, 0.81, cv)).mul(smoothstep(0.16, 0.18, cu)).mul(smoothstep(0.84, 0.82, cu)).mul(step(0.0, fl)).mul(step(v, H.sub(0.6))).mul(fac);
  const door = step(u, 1.5).mul(step(0.35, u)).mul(step(v, 2.6)).mul(step(0.45, v)).mul(fac).mul(step(0.5, hash(floor(seed.mul(97))).add(0.3)));
  const winC = mix(color(0xe9e5dc), glass, inGlass.mul(one.sub(bar)));
  // (round 2, a bit of detail) a stone cornice under the roof, a sill under each window, a stone band at each floor
  const cornice = smoothstep(H.sub(0.5), H.sub(0.45), v).mul(fac);
  const sill = smoothstep(0.17, 0.18, cu).mul(smoothstep(0.83, 0.82, cu)).mul(smoothstep(0.19, 0.2, cv)).mul(smoothstep(0.235, 0.225, cv)).mul(step(0.0, fl)).mul(step(v, H.sub(0.6))).mul(fac);
  const band = smoothstep(0.955, 0.96, cv).mul(smoothstep(0.995, 0.99, cv)).mul(step(1.0, fl)).mul(fac).mul(step(0.45, seed));
  wall = mix(wall, color(0xd8d2c4).mul(n3(4, 8).mul(0.15).add(0.85)), max(cornice, band.mul(0.8)));
  let c = mix(wall, winC, inWin.mul(one.sub(door)));
  c = mix(c, color(0xcfc8b8), sill);
  c = mix(c, color(0x50565c), lintel.mul(one.sub(inWin)));
  c = mix(c, mix(color(0x3a2a1e), color(0x5a4030), n3(6, 1)), door);
  m.colorNode = c;
  m.roughnessNode = mix(float(0.9), float(0.15), inWin.mul(inGlass).mul(one.sub(bar)).mul(one.sub(door)));
  return m;
}
function roofMat() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.75 });
  const seed = aux.y, uv = vec2(P.x.add(P.z), P.y.mul(1.4));
  const red = texture(SCANS.roof_tiles_red.albedo, uv.div(SCANS.roof_tiles_red.meta?.size_m || 2.9)).rgb;
  const slate = texture(SCANS.slate.albedo, uv.div(SCANS.slate.meta?.size_m || 2.1)).rgb;
  m.colorNode = select(seed.lessThan(0.55), slate.mul(1.25), red).mul(mix(float(0.85), float(1.05), n3(0.5, 3)));
  return m;
}
function fenceMat() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
  const t = P.x.add(P.z), b = floor(t.div(0.125)), f = fract(t.div(0.125));
  const groove = smoothstep(0.0, 0.08, f).mul(smoothstep(1.0, 0.92, f));
  const grain = mx_noise_float(vec3(b.mul(3.7), P.y.mul(1.3), f.mul(5))).mul(0.5).add(0.5);
  const base = mix(color(0x6e5a44), color(0x8b7860), grain.mul(0.6)).mul(hash(b).mul(0.22).add(0.86));
  m.colorNode = mix(base.mul(0.45), base, groove).mul(mix(float(0.65), one, smoothstep(0.0, 0.5, P.y.sub(terrainLo))));
  return m;
}
const terrainLo = float(0);

/**
 * Build the look. -> { lighting, pipe, ground, render(), update(dt, focus, s), grass, trees, setTime(id), meshes }
 */
export async function buildSpotLook({ renderer, scene, camera, quality = "high", time = "golden" }) {
  const t0 = performance.now();
  camera.far = Math.max(camera.far, 6000); camera.updateProjectionMatrix();
  const lighting = new Lighting(scene, renderer, time);
  await lighting.attach(camera);
  const pipe = createPipeline(renderer, scene, camera);
  pipe.setExposureScale(lighting.exposureScale); pipe.look(time);
  const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);

  const need = ["asphalt", "paving_concrete", "brick_red_brussels", "render_white", "roof_tiles_red", "slate"];
  const man = await fetch("../viewer/materials/textures/scans.json").then((r) => r.json());
  await loadScans(renderer, undefined, { skip: Object.keys(man).filter((k) => !need.includes(k)) });
  for (const k of need) if (SCANS[k] && !SCANS[k].meta) SCANS[k].meta = man[k];
  const G = await loadGroundTextures(renderer);
  if (!G) throw new Error("the ground textures failed");

  const M = buildSpotMeshes({ keepPieces: false });
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0x9aa1a8, roughness: 0.34, metalness: 0.55 });
  const mats = {
    wood: woodMat(), concrete: concreteMat(), steel, graffiti: graffitiMat(SPOT.wall.x0, SPOT.wall.x1, SPOT.wall.h),
    benchwood: (() => { const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 }); m.colorNode = mix(color(0x7a4a2a), color(0x9a6238), n3(4, 2)).mul(mix(float(0.85), one, mx_noise_float(vec3(P.x.mul(20), P.y.mul(2), P.z.mul(20))).mul(0.5).add(0.5))); return m; })(),
    darksteel: new THREE.MeshStandardNodeMaterial({ color: 0x24382e, roughness: 0.5, metalness: 0.35 }),
    bin: (() => { const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.2 }); m.colorNode = mix(color(0x2b4a38), color(0x3c6b4e), smoothstep(0.84, 0.86, aux.x)).mul(mix(float(0.8), one, n3(5, 1))); return m; })(),
    cone: (() => { const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 }); const band = smoothstep(0.21, 0.215, aux.x).mul(smoothstep(0.33, 0.325, aux.x)); m.colorNode = mix(mix(color(0xe0531c), color(0x2a2a2a), step(aux.x, 0.035)), color(0xf0f0ea), band).mul(mix(float(0.78), one, n3(6, 4))); return m; })(),
    fence: fenceMat(),
    fencepost: new THREE.MeshStandardNodeMaterial({ color: 0x4e3e2e, roughness: 0.9 }),
    house: houseMat(), roof: roofMat(),
  };
  const gm = groundMat(G);
  const fine = new THREE.Mesh(M.ground.fine.geo, gm), far = new THREE.Mesh(M.ground.far.geo, gm);
  fine.receiveShadow = far.receiveShadow = true; fine.castShadow = true; fine.name = "spot-ground"; far.name = "spot-far";
  scene.add(fine, far);
  const meshes = [];
  for (const p of M.parts) {
    const mesh = new THREE.Mesh(p.geo, mats[p.mat] || mats.concrete);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = `spot-${p.mat}`;
    scene.add(mesh); meshes.push(mesh);
  }

  // ---- grass blades on the grass (1 m raster over the fine area: R density, G length, B dry, A flowers)
  let grass = null;
  try {
    if (Grass.supported?.(renderer) !== false) {
      grass = new Grass(renderer, { preset: quality, lights: [lighting.sun, lighting.hemi].filter(Boolean) });
      grass.groundAt = (x, z) => terrainH(x, z);
      const F = SPOT.fine, GW = F.x1 - F.x0, GH = F.z1 - F.z0, data = new Uint8Array(GW * GH * 4), w = [0, 0, 0, 0];
      const clear = (x, z) => { for (const [dx, dz] of [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) if (solidAt(x + dx, z + dz)) return false; return true; };
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = F.x0 + i + 0.5, z = F.z0 + j + 0.5;
        spotPaint(x, z, w);
        const paint = w[0] + w[1] + w[2] + w[3];
        if (paint > 0.25 || !clear(x, z) || spotHeight(x, z) - terrainH(x, z) > 0.01) continue;
        const k = (j * GW + i) * 4, v = 0.5 + 0.5 * Math.sin(x * 0.13 + Math.sin(z * 0.07) * 2), worn = Math.min(1, paint * 3);
        // (the blades thin out over the raster's last 10 m: no straight edge where the field ends)
        const edge = Math.min(x - F.x0, F.x1 - x, z - F.z0, F.z1 - z), fade = Math.max(0, Math.min(1, (edge - 1) / 9)) ** 1.5;
        data[k] = Math.round(200 * (1 - worn * 0.7) * fade); data[k + 1] = Math.round((70 + 90 * v) * (1 - worn * 0.5)); data[k + 2] = Math.round(30 + 60 * (1 - v) + 80 * worn); data[k + 3] = v > 0.8 ? 40 : 0;
      }
      const coverTex = new THREE.DataTexture(new Uint8Array(16), 2, 2, THREE.RGBAFormat); coverTex.needsUpdate = true;
      scene.add(grass.group);
      grass.field.addTile("spot", { terrain: fine, solids: [], trunks: [], cover: coverTex, types: { data, W: GW, H: GH }, bounds: { x0: F.x0, x1: F.x1, z0: F.z0, z1: F.z1 } });
    }
  } catch (e) { console.warn("[bike spot] grass failed:", e); grass = null; }
  // ---- trees (the city's stylised ones, one instanced field)
  let trees = null;
  try {
    setTreeRenderer(renderer); setTreeLighting(lighting);
    trees = STREET.buildField(M.trees, (x, z) => terrainH(x, z), () => true, { variantOf: (i) => i % 6 });
    scene.add(trees.group);
  } catch (e) { console.warn("[bike spot] trees failed:", e); trees = null; }

  console.log(`[bike spot look] ${(performance.now() - t0).toFixed(0)} ms: ground ${M.ground.fine.count} + ${M.ground.far.count} verts, ${M.parts.length} merged parts, ${M.houses.length} houses, ${M.trees.length} trees, grass ${!!grass}`);
  return {
    lighting, pipe, ground: fine, far, meshes, grass, trees, M,
    setTime(id) { lighting.apply(id); pipe.look(id); },
    update(dt, focus, s) {
      lighting.update(camera.position.y, terrainH(camera.position.x, camera.position.z), focus, 60, dt);
      lodEye.value.copy(camera.position);
      trees?.update?.(camera.position);
      if (grass) {
        wind.update?.(dt);
        if (s && s.wheelPos) for (let i = 0; i < 2; i++) { const x = s.wheelPos[i * 2], z = s.wheelPos[i * 2 + 1]; grass.push.set(i, { x, y: s.wheelBot[i], z, radius: 0.25, strength: 1, vx: s.vx, vz: s.vz, ground: terrainH(x, z) }); }
        grass.update(camera, dt);
      }
    },
    render() { pipe.render(hazeHook); pipe.setExposureFactor(lighting.adapt(1 / 60)); },
  };
}
void vec4; void min; void cameraPosition; void length;
