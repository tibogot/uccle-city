// THE VILLA (Avenue du Prince d'Orange, claude/villa1): the exterior model (tools/blender/villa.py -> tools/villa/pack.mjs
// -> models/villa/villa.glb). A fictional modern villa on a real plot (UrbIS solid 543176 replaced).
//
// The GLB carries geometry only: one primitive per NAMED material slot per node, a face code in COLOR_0.r (/16, decoded
// with a 0.5 margin: rule no-coplanar-faces' "integer code in a float attribute"), the per-vertex baked AO in COLOR_0.g,
// UV0 in metres. Colour and pattern come from the slot's material at run time:
//   render_white, stone_blue  the shared library's shipped scans (viewer/materials/shipped.js), else the stand-ins below;
//   wood_cladding, metal_dark, glass_window, concrete_soffit, glow, hedge  stand-ins here (TSL, sin-free hashes);
//   pool_water  ONE cheap opaque TSL material: the basin (tiles, depth, caustics) ray-marched in the fragment against the
//               pool's box (a fake interior: no refraction pass, no render target, the terrain under it never shows).
// Levels: LOD0 (Villa) < 70 m, LOD1 (Villa_lod1: scripted in villa.py, villa2) < 240 m, LOD2 (Villa_lod2: the far masses); dithered
// cross-fades through FADING COPIES drawn only inside the bands (lodFade.js), as the other heroes.
//   const m = await loadVilla();  m.make(k) -> Group;  m.parts.gateL / gateR / door / water (Object3D);  m.distance(p)
import * as THREE from "three/webgpu";
import {
  attribute, uv, vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min, mrt, roughness,
  uniform, Fn, positionWorld, cameraPosition, normalize, normalWorld, pow, sin, time, length, fwidth, select, texture, int, dFdx, dFdy, cross, inverseSqrt, transformNormalToView,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "../lighting.js";
import { fadeVariant, SMOOTH } from "../lodFade.js";
import { libSource } from "../materials/libSwitch.js";
import { GLASS_V3, farGlassMaterial, VILLA_DIR } from "./villaGlass.js";
import { poolMaterialV3 } from "./villaPool.js";

export const VILLA_SLOTS = ["render_white", "stone_blue", "wood_cladding", "metal_dark", "glass_window", "concrete_soffit", "glow", "hedge", "pool_water", "leaves", "sculpture"];
export const VILLA_CODES = ["plain", "reveal", "plinth", "coping", "step", "slat", "frame", "door", "soffit", "roof", "garage", "led", "fire", "screen", "channel", "rug"];
const C = Object.fromEntries(VILLA_CODES.map((n, i) => [n, i]));
/** LOD switch distances (m, camera to the villa's box) and the half-width of each cross-fade band */
export const VILLA_LODS = [{ until: 70, band: 10 }, { until: 240, band: 30 }, { until: Infinity }];
const SOURCE = libSource("villa", "../materials/shipped.js");
/** live look (uniforms: no recompile) */
export const villaLook = { ao: uniform(1.0), aoDirect: uniform(0.5), glowNight: uniform(3.2), glowDay: uniform(0.35), windowsNight: uniform(1.0), glassShown: uniform(1.0) };

const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeF = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (k) => float(1).sub(clamp(abs(codeF().sub(k)), 0, 1));
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {           // value noise (smooth), sin-free
  const i = floor(p), f = fract(p), u2 = f.mul(f).mul(float(3).sub(f.mul(2)));
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u2.x), mix(c, d, u2.x), u2.y);
};
/** villa2: the share of a pixel covered by the screens' battens (4 cm every 11 cm along the facade, metres in x):
 *  a smoothed box pulse widened by the pixel footprint, the mean (0.36) once a period is under ~2 pixels: no moire */
const slatCover = (x) => {
  const s = x.div(0.11), f = fract(s), e = fwidth(s).mul(0.75).max(1e-3);
  const bar = smoothstep(float(0.32).sub(e), float(0.32).add(e), f).sub(smoothstep(float(0.68).sub(e), float(0.68).add(e), f));
  return mix(bar, float(0.36), smoothstep(0.3, 0.6, fwidth(s)));
};
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
/** villa3 job 4: the sculptures' maps + their uplights (world), set by loadVilla before the materials are built */
const ART = { col: null, dat: null, lights: [] };
/** the sculptures: one lit Standard material for all three (the scan's diffuse / AO / normal / roughness / metal from a
 *  KTX2 array layer = the face code), the scan's normal map on a screen-space cotangent frame (no tangents shipped);
 *  at night each is washed from below by its ground uplight: emissive only (rule fixed-light-count), warm, falling
 *  off with distance and facing */
function sculptureMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const k = int(codeF().add(0.5).min(2));
  const c = texture(ART.col, uv()).depth(k), d = texture(ART.dat, uv()).depth(k);
  // (the first look read as chrome: the scans' glossy roughness under the sky env; garden stone and bronze weather to satin)
  m.colorNode = c.rgb; m.aoNode = c.a; m.roughnessNode = d.b.max(0.48); m.metalnessNode = d.a.mul(0.85);
  const N = normalWorld.toVar();
  const nx = d.r.mul(2).sub(1), ny = d.g.mul(2).sub(1).mul(ARTLOOK.flipY), nz = float(1).sub(nx.mul(nx)).sub(ny.mul(ny)).max(0).sqrt();
  const dp1 = dFdx(positionWorld), dp2 = dFdy(positionWorld), duv1 = dFdx(uv()), duv2 = dFdy(uv());
  const p2 = cross(dp2, N), p1 = cross(N, dp1);
  const T = p2.mul(duv1.x).add(p1.mul(duv2.x)), B = p2.mul(duv1.y).add(p1.mul(duv2.y));
  const im = inverseSqrt(max(dot(T, T), dot(B, B)).max(1e-14));
  const Np = normalize(T.mul(im).mul(nx).add(B.mul(im).mul(ny)).add(N.mul(nz)));
  m.normalNode = transformNormalToView(Np);
  let up = float(0);
  ART.lights.forEach((L, i) => {
    const toL = vec3(L.x, L.y, L.z).sub(positionWorld), dist = length(toL);
    const f = max(dot(Np, toL.div(dist)), 0.0).div(dist.mul(dist).mul(0.45).add(1.0));
    up = up.add(f.mul(float(1).sub(min(abs(codeF().sub(i)), 1.0))));
  });
  m.emissiveNode = c.rgb.mul(lin(0xffd2a0)).mul(up).mul(env.uNight).mul(ARTLOOK.uplight);
  m.userData.sculpture = true;
  return m;
}
export const ARTLOOK = { uplight: uniform(1.4), flipY: uniform(-1.0) };
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1)) }); return m; };

const TEMP = {
  render_white: () => std({ colorNode: lin(0xe9e6df).mul(vnoise(uv().mul(3.0)).mul(0.06).add(0.95)), roughness: 0.88 }),
  stone_blue: () => std({ colorNode: lin(0x4a5056).mul(vnoise(uv().mul(2.0)).mul(0.12).add(0.92)), roughness: 0.6 }),
  // thermo-treated ash, charcoal brown: vertical boards (10.5 cm) with a grain along them, the slats a little warmer
  wood_cladding: () => std({
    colorNode: Fn(() => {
      const w = uv().toVar();
      const board = floor(w.x.div(0.105)).toVar();
      const h = hash2(vec2(board, 3.0));
      const grain = vnoise(vec2(w.x.mul(60.0), w.y.mul(1.6).add(h.mul(9.0)))).mul(0.25).add(vnoise(vec2(w.x.mul(220.0), w.y.mul(5.0))).mul(0.12));
      const base = mix(lin(0x2e221b), lin(0x46342a), h.mul(0.6).add(grain));
      const seam = smoothstep(0.0, max(fwidth(w.x.div(0.105)).mul(1.5), 0.03), fract(w.x.div(0.105))).mul(0.35).add(0.65);
      const slat = isC(C.slat), door = isC(C.door);
      const wood = mix(mix(base.mul(seam), base.mul(1.12), slat), mix(lin(0x3a271c), lin(0x5a3d2a), grain.mul(1.6)), door);
      // villa2: the SLAT SCREEN of LOD1 / LOD2 (one plane): the battens' stripes, box-filtered (their pixel coverage), the
      // gaps = the cladding in their shadow (screen) or the ribbon window's dark glass (channel)
      const cov = slatCover(w.x), glassGap = isC(C.channel);
      const gap = mix(base.mul(seam).mul(0.55), lin(0x0c1215), glassGap);
      return mix(wood, mix(gap, base.mul(1.12), cov), isC(C.screen).add(glassGap));
    })(),
    // (the ribbon window seen between the battens: lit at night like the far glass)
    emissiveNode: lin(0xffc58a).mul(0.45).mul(env.uNight.mul(villaLook.windowsNight).mul(0.55)).mul(isC(C.channel)).mul(float(1).sub(slatCover(uv().x))),
    roughness: 0.62,
  }),
  // (villa3 job 2: the glazing gaskets / spacers, code plinth: a lighter grey line inside every frame, the edge of the unit)
  metal_dark: () => std({ colorNode: mix(mix(lin(0x2a2c2f), lin(0x8a8d90), isC(C.plinth)), lin(0xc4c8cb), isC(C.door)), roughnessNode: mix(float(0.34), float(0.22), isC(C.door)), metalnessNode: mix(float(0.55), float(0.95), isC(C.door)), emissiveNode: lin(0xffd6a0).mul(isC(C.led)).mul(mix(float(0.0), float(3.0), env.uNight)) }),   // (job 3: code door = the ladder's brushed stainless)
  // the far glass (the interior cell's own glass replaces it within 30 m): dark, reflective; lit windows at night
  glass_window: () => {
    if (GLASS_V3) return farGlassMaterial();          // villa3: the shared glass model (villaGlass.js); ?villa3=0 below
    const m = std({ color: new THREE.Color(0x0b1114), roughness: 0.04, metalness: 0.15 });
    const p = positionWorld;
    const warm = lin(0xffc58a).mul(vnoise(vec2(p.x.add(p.z).mul(0.35), p.y.mul(0.5))).mul(0.6).add(0.4));
    m.emissiveNode = warm.mul(env.uNight.mul(villaLook.windowsNight).mul(0.55));
    return m;
  },
  concrete_soffit: () => std({ colorNode: mix(lin(0xd9d5cd), lin(0x8d8a84), isC(C.roof)).mul(vnoise(uv().mul(1.5)).mul(0.07).add(0.94)), roughness: 0.85 }),
  glow: () => {
    const m = std({ color: new THREE.Color(0xf2efe6), roughness: 0.5 });
    m.emissiveNode = lin(0xffd6a0).mul(mix(villaLook.glowDay, villaLook.glowNight, env.uNight));
    return noSSR(m);
  },
  // clipped hedge (hornbeam / yew): two-scale leaf clumps, a bumped surface, darker in the clefts
  // round 3: the climbers' LEAF CARDS: the leaf's outline cut in the fragment (maskNode, a smooth pointed-oval SDF
  // on the card's own UV), alpha-hash free: the edge is a polygon-smooth curve the TAAU resolves, no raster step
  leaves: () => {
    const m = std({ roughness: 0.7 });
    const p = uv().mul(2).sub(1).toVar();
    const half = float(1).sub(p.y.mul(p.y)).max(0).pow(0.75).mul(0.62);
    const inside = abs(p.x).lessThan(half).and(p.y.abs().lessThan(0.98));
    m.maskNode = inside; m.maskShadowNode = inside;
    const q = positionWorld;
    m.colorNode = mix(lin(0x22401a), lin(0x4f7a2c), vnoise(vec2(q.x.add(q.z), q.y).mul(2.3))).mul(float(0.8).add(abs(p.x).mul(-0.3).add(0.3)));
    m.side = THREE.FrontSide;
    return m;
  },
  sculpture: () => sculptureMaterial(),
  hedge: () => {
    const m = std({ roughness: 0.82 });
    m.colorNode = Fn(() => {
      const p = positionWorld.toVar();
      const q = vec2(p.x.add(p.y.mul(0.7)), p.z.sub(p.y.mul(0.4))).toVar();
      const big = vnoise(q.mul(1.6)), small = vnoise(q.mul(9.0)), fine = hash2(floor(q.mul(38.0)));
      const k = big.mul(0.45).add(small.mul(0.4)).add(fine.mul(0.15));
      return mix(lin(0x1d3315), lin(0x46682c), k).mul(smoothstep(0.15, 0.6, small).mul(0.35).add(0.7));
    })();
    return m;
  },
};

// THE POOL WATER (one opaque draw): the view ray refracted at the surface (n 1.33) is traced in the pool's local box
// (u0..u1, w0..w1, depth D below the water) to the floor or a wall; there: white / aqua mosaic tiles (2.5 cm, joints
// faded by distance), a darker lane band, animated caustics (two scrolling value-noise layers), Beer-Lambert absorption
// over the in-water path, and the sky's fresnel reflection on top. Small surface ripples bend the normal. At night the
// basin glows from its underwater LEDs. Uniforms: the box in the villa's local frame + the root's inverse matrix.
export function poolMaterial(pool, rootInv) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.05, metalness: 0.0 });
  const uInv = uniform(rootInv.clone());
  const W = pool.water - 100, D = pool.water - pool.floor;
  const b0 = vec3(pool.u0, W - D, pool.w0), b1 = vec3(pool.u1, W, pool.w1);
  const col = (which) => Fn(() => {
    const pW = positionWorld, eW = cameraPosition;
    const p = uInv.mul(vec4(pW, 1.0)).xyz.toVar(), e = uInv.mul(vec4(eW, 1.0)).xyz.toVar();
    const t = time.mul(0.6);
    const rip = vec2(vnoise(p.xz.mul(1.7).add(vec2(t, t.mul(0.7)))), vnoise(p.xz.mul(2.3).sub(vec2(t.mul(0.8), t)))).sub(0.5).mul(0.06);
    const v = normalize(p.sub(e)).toVar();
    const n = normalize(vec3(rip.x, 1.0, rip.y));
    // refraction (Snell), the ray goes down
    const eta = float(1.0 / 1.33), cosi = dot(v, n).negate();
    const k = float(1).sub(eta.mul(eta).mul(float(1).sub(cosi.mul(cosi))));
    const r = normalize(v.mul(eta).add(n.mul(eta.mul(cosi).sub(k.max(0).sqrt())))).toVar();
    // exit of the box from inside: the smallest positive t over the 5 inner planes
    const tx = select(r.x.greaterThan(0), b1.x.sub(p.x).div(r.x), b0.x.sub(p.x).div(r.x.min(-1e-4)));
    const tz = select(r.z.greaterThan(0), b1.z.sub(p.z).div(r.z.max(1e-4)), b0.z.sub(p.z).div(r.z.min(-1e-4)));
    const ty = b0.y.sub(p.y).div(r.y.min(-1e-4));
    const tt = min(min(tx, tz), ty).max(0.0).toVar();
    const h = p.add(r.mul(tt)).toVar();
    const onFloor = step(ty, min(tx, tz).add(1e-3));
    const tc = select(onFloor.greaterThan(0.5), h.xz, select(abs(tx.sub(tt)).lessThan(1e-3), vec2(h.z, h.y), vec2(h.x, h.y))).toVar();
    // mosaic: 2.5 cm tiles, joints faded with distance
    const g = tc.div(0.025), f = fract(g), fw = fwidth(g.x).max(1e-4);
    const joint = float(1).sub(smoothstep(0.0, fw.mul(1.5).max(0.08), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y))))).mul(float(1).sub(smoothstep(0.3, 1.0, fw)));
    const th = hash2(floor(g));
    let tile = mix(lin(0xcfe8ea), lin(0x9fd3da), th.mul(0.6)).mul(float(1).sub(joint.mul(0.25)));
    const lane = onFloor.mul(step(abs(h.z.sub((pool.w0 + pool.w1) / 2)), 0.12)).mul(step(pool.u0 + 1.2, h.x)).mul(step(h.x, pool.u1 - 1.2));
    tile = mix(tile, lin(0x1f3f63), lane);
    // caustics on the floor and the walls' lower part
    const cq = h.xz.mul(1.3);
    const c1 = vnoise(cq.add(vec2(t.mul(0.35), t.mul(0.2)))), c2 = vnoise(cq.mul(1.7).sub(vec2(t.mul(0.25), t.mul(0.4))));
    const caust = pow(float(1).sub(abs(c1.sub(c2))), 6.0).mul(1.6);
    const sunK = smoothstep(0.02, 0.2, env.uSunDir.y).mul(float(1).sub(env.uNight));
    const day = vec3(env.uSkyTop).mul(0.35).add(vec3(0.55, 0.58, 0.6)).mul(float(1).sub(env.uNight)).add(vec3(0.02, 0.03, 0.05));
    // (lit by the scene like any surface: the albedo here is the basin seen through the water; the night LEDs emissive)
    const lightC = vec3(1.0).add(vec3(env.uSunColor).mul(caust.mul(sunK).mul(0.8)));
    const ledNight = lin(0x7fd8ff).mul(env.uNight.mul(0.09));
    const lit = tile.mul(lightC);
    // absorption over the in-water path
    const path = tt.add(e.y.greaterThan(W).select(float(0), float(0)));
    const absorb = vec3(0.28, 0.07, 0.045);
    const trans = vec3(absorb.x.mul(path).negate().exp(), absorb.y.mul(path).negate().exp(), absorb.z.mul(path).negate().exp());
    const deep = lin(0x0b3c4c);
    const under = mix(deep, lit, trans).mul(0.55);
    return which === "under" ? under : mix(deep, tile, trans).mul(ledNight);
  })();
  const r = { under: col("under"), glow: col("glow") };
  m.colorNode = r.under;                        // lit by the scene; the sky's fresnel reflection is the env map's (roughness 0.05)
  m.emissiveNode = r.glow;                      // the underwater LEDs at night
  m.userData.uInv = uInv;
  m.name = "villa pool_water";
  return m;
}

function sourceMaterial(name, lib) {
  let m = null;
  if (lib && (name === "render_white" || name === "stone_blue")) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? null; } catch (e) { console.warn(`[villa] library failed on "${name}":`, e.message); }
  }
  return m ?? (TEMP[name] ?? TEMP.render_white)();
}

/** the baked AO (vertex, COLOR_0.g) on a slot material: aoNode (indirect) + a share of it in the colour (direct) */
function wrapAO(src, slot) {
  const m = src.clone();
  m.name = `villa ${slot}`;
  const ao = mix(float(1), attribute("color", "vec4").g, villaLook.ao);
  m.aoNode = src.aoNode ? src.aoNode.mul(ao) : ao;
  if (slot !== "glass_window" && slot !== "glow") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), ao, villaLook.aoDirect));
  }
  if (src.emissiveNode) m.emissiveNode = src.emissiveNode;
  if (src.maskNode) { m.maskNode = src.maskNode; m.maskShadowNode = src.maskShadowNode ?? src.maskNode; }
  m.userData.shared = true; m.userData.slot = slot;
  return m;
}

let promise = null;
export function loadVilla({ renderer = null } = {}) {
  return (promise ??= (async () => {
    // villa3 job 3b: the pool's baked caustics (162 KB) load WITH the model (the villa itself loads when needed, in the
    // background), before the water's material is built: the texture is bound from the start (a placeholder swapped
    // later did not rebind: the first try drew a flat brightening)
    // villa3 job 4: the sculptures' maps (two KTX2 arrays, a layer per statue: tools/villa/art_ktx2.py), loaded with the model too
    const art = GLASS_V3 && renderer ? import("../materials/scans.js").then(async (S) => {
      const k = S.ktxLoader(renderer), b = new URL(VILLA_DIR, import.meta.url);
      const [col, dat] = await Promise.all(["art_col.ktx2", "art_dat.ktx2"].map((f) => k.loadAsync(new URL(f, b).href)));
      col.colorSpace = THREE.SRGBColorSpace; dat.colorSpace = THREE.NoColorSpace;
      for (const x of [col, dat]) { x.wrapS = x.wrapT = THREE.ClampToEdgeWrapping; x.anisotropy = 4; x.needsUpdate = true; }
      ART.col = col; ART.dat = dat;
    }).catch((e) => { console.warn("[villa] sculptures' maps:", e.message); }) : null;
    const caust = GLASS_V3 && renderer ? Promise.all([import("../materials/scans.js"), import("./villaPool.js")])
      .then(([S, VP]) => VP.loadCaustics(S.ktxLoader(renderer), new URL("caustics.ktx2", new URL(VILLA_DIR, import.meta.url)).href)).catch((e) => { console.warn("[villa] caustics:", e.message); return null; }) : null;
    const base = new URL(VILLA_DIR, import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lib] = await Promise.all([
      loader.loadAsync(base + "villa.glb"),
      fetch(base + "villa.json").then((r) => r.json()),
      SOURCE === "temp" ? null : import("../materials/shipped.js").catch((e) => { console.warn("[villa] material library not loaded:", e.message); return null; }),
    ]);
    const names = [["Villa", "Villa_ivy", "Villa_kit", "Villa_art"], ["Villa_lod1", "Villa_art_lod1"], ["Villa_lod2", "Villa_art_lod2"]];     // (villa3 job 3: the pool kit, near only)
    const lods = names.map(() => []);
    const nodes = {};
    gltf.scene.traverse((o) => { if (o.name) nodes[o.name] = nodes[o.name] ?? o; });
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1;
      for (let p = o; p && k < 0; p = p.parent) k = names.findIndex((l) => l.includes(p.name));
      if (k < 0) return;
      o.geometry.computeBoundingSphere();
      lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + m.geometry.index.count / 3, 0));
    const materials = {};
    if (art) await art;
    if (ART.col) ART.lights = (notes.art?.lights || []).map((l) => new THREE.Vector3(...l.at).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...notes.placement.city_local_position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), notes.placement.rotation_y_rad), new THREE.Vector3(1, 1, 1))));
    for (const s of VILLA_SLOTS) if (s !== "pool_water" && (s !== "sculpture" || ART.col)) materials[s] = wrapAO(sourceMaterial(s, lib), s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const rootM = new THREE.Matrix4().compose(placement.position, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY), new THREE.Vector3(1, 1, 1));
    // the bounds (world): the plot box in the frame
    const bu = notes.bounds_uw, boundsWorld = new THREE.Box3();
    for (const u of bu.u) for (const w of bu.w) for (const h of bu.h) boundsWorld.expandByPoint(new THREE.Vector3(u, h - 100, w).applyMatrix4(rootM));
    // the house's own box (LOD distance): the ground floor + the upper box
    const houseBox = new THREE.Box3();
    for (const u of [12, 37.5]) for (const w of [-23, 23.5]) for (const h of [115, 126.3]) houseBox.expandByPoint(new THREE.Vector3(u, h - 100, w).applyMatrix4(rootM));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = k === 0 ? "villa_lod0" : `villa_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        if (!materials[slot]) continue;                 // (villa3: the sculptures when their maps failed to load)
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material;
        m.castShadow = slot !== "glass_window" && slot !== "glow"; m.receiveShadow = true;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
    /** an animated part (gate leaf, door): its node's meshes with the slot materials, at its origin (local) */
    const part = (nodeName) => {
      const n = nodes[nodeName]; if (!n) return null;
      const g = new THREE.Group(); g.name = nodeName;
      g.position.copy(n.position); g.quaternion.copy(n.quaternion);
      n.traverse((o) => {
        if (!o.isMesh) return;
        const m = new THREE.Mesh(o.geometry, materials[o.material.name] ?? materials.metal_dark);
        m.name = o.material.name; m.castShadow = true; m.receiveShadow = true; m.userData.base = m.material;
        if (o !== n) { m.position.copy(o.position); m.quaternion.copy(o.quaternion); }
        g.add(m);
      });
      return g;
    };
    const inv = rootM.clone().invert();
    if (caust) await caust;
    const waterMat = GLASS_V3 ? poolMaterialV3(notes.pool, inv, notes) : poolMaterial(notes.pool, inv);     // (villa3 job 3: villaPool.js)
    const waterNode = nodes.Villa_water;
    let water = null;
    waterNode?.traverse((o) => { if (o.isMesh && !water) { water = new THREE.Mesh(o.geometry, waterMat); water.name = "villa-water"; water.receiveShadow = false; } });
    const tmp = new THREE.Vector3();
    return {
      notes, placement, rootM, inv, boundsWorld, houseBox, lods, tris, materials, make, part, water, waterMat,
      drawCalls: lods.map((l) => l.length),
      distance: (p) => houseBox.distanceToPoint(tmp.copy(p)),
      glbBytes: null,
    };
  })());
}

/** the levels' LOD state (lodFade objectFade convention: 1 or 2 = whole, 0..1 fading in, 2..3 fading out) */
export function villaLodState(d) {
  const shown = [], fades = [];
  let prevT = null;
  for (let k = 0; k < VILLA_LODS.length; k++) {
    const L = VILLA_LODS[k];
    const t = Number.isFinite(L.until) ? THREE.MathUtils.smoothstep(d, L.until - L.band, L.until + L.band) : 1;
    const tin = prevT ?? 1;
    if (k === 0) { shown.push(t < 1); fades.push(2 + t); }
    else if (k === VILLA_LODS.length - 1) { shown.push(tin > 0); fades.push(tin); }
    else { shown.push(tin > 0 && t < 1); fades.push(tin < 1 ? tin : 2 + t); }
    prevT = t;
  }
  return { shown, fades };
}
export function setLodFades(levels, shown, fades) {
  for (let k = 0; k < levels.length; k++) {
    const g = levels[k]; g.visible = shown[k];
    if (!shown[k]) continue;
    const f = fades[k], whole = !SMOOTH || f === 1 || f === 2;
    for (const o of g.children) {
      o.userData.fade = f;
      const base = o.userData.base ?? o.material;
      const want = whole ? base : fadeVariant(base);
      if (o.material !== want) o.material = want;
    }
  }
}
