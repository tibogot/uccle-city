// SQUARE DES HEROS: THE WAR MEMORIAL + THE STEPS (tools/blender/heros.py -> tools/hero_pack.mjs -> models/heros/), for the
// city (?heros=old = the city as before). The contract of the scripted heroes (viewer/russianModel.js, Saint-Pierre):
//
// The GLB carries geometry only: one primitive per NAMED material slot (HE_SLOTS) per level of detail, a per-face code in
// COLOR_0.r (HE_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and the
// baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - "stone_blue" is the shared library's (the shipped blue-stone scan) when it loads, else a temporary TSL one; the
//     LETTERED faces (code "letters": TEXCOORD_0.x = 1000 (cell + 1) + s) read the lettering mask
//     (textures/heros/heros_letters.png, tools/heros_letters.py) on top: carved letters, darker and duller;
//   - the other slots are new names with temporary TSL materials here (bronze_gilt, cast_iron_black, soil_bed,
//     plant_grass; cast_iron_green: the library name, not shipped: temporary too); the steps' treads and risers are
//     stone_blue (the photos: grey blue stone / rubble), no longer the streets' dark setts;
//   - every slot material is wrapped with the model's baked AO (lighting only); the dithered LOD cross-fade comes from
//     lodFade.js through setLodFades (shared with Saint-Pierre).
// LODs: both SCRIPTED in Blender (packed with hero_pack.mjs --nolod: a meshopt LOD1 of this model failed the mesh audit,
// 1545 streaks on the bronze, as on Saint-Augustin): LOD0 (43 k triangles) to 90 m, the far variant (2.2 k: no railing
// bars, rings, roses, animals, blades; the bronze at ~900 triangles) beyond, a 15 m dithered band between.
import * as THREE from "three/webgpu";
import { attribute, uv, texture, normalWorld, normalView, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min,
  mod, mrt, uniform, Fn, vec4 } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { bumpNormal } from "../tslkit.js";
import { loadAO, setLodFades } from "../stpierreModel.js";
import { libSource } from "../materials/libSwitch.js";
import { env } from "../lighting.js";
import { loadStatueSlot } from "./herosStatue.js";

export { setLodFades };
export const HE_SLOTS = ["stone_blue", "bronze_gilt", "cast_iron_black", "cast_iron_green", "soil_bed", "plant_grass"];
export const NEW_NAMES = ["bronze_gilt", "cast_iron_black", "cast_iron_green", "soil_bed", "plant_grass"];
export const HE_CODES = ["plain", "panel", "letters", "nosing", "riser", "tread", "kerb", "relief", "bouquet", "animal", "rail", "post",
  "finial", "cap", "plinth", "seat"];
/** LOD switch distances (m, camera to the model's box) and each cross-fade band's half-width */
export const HE_LODS = [{ until: 90, band: 15 }, { until: Infinity }];
const GROUND = 50.55;

const SOURCE = libSource("heros", "../materials/shipped.js");
export const heLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), letters: uniform(1.0), gilt: uniform(0.55), weathered: uniform(3.8), moss: uniform(1.0) };

let promise = null;
export function loadHeros() {
  return (promise ??= (async () => {
    const base = new URL("../../models/heros/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const lettersP = new THREE.TextureLoader().loadAsync(new URL("../../textures/heros/heros_letters.png", import.meta.url).href);
    let [gltf, notes, lodsJson, aoTex, lib, letters, cells, slot] = await Promise.all([
      loader.loadAsync(base + "heros.glb"),
      fetch(base + "heros.json").then((r) => r.json()),
      fetch(base + "heros.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "heros_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[heros] material library not loaded:", e.message); return null; }),
      lettersP,
      fetch(new URL("../../textures/heros/heros_letters.json", import.meta.url).href).then((r) => r.json()),
      // the bronze group's slot: models/heros/statue.glb when there (herosStatue.js), else our scripted bronze below
      loadStatueSlot(base, bronzeMaterial, rockMaterial).catch((e) => { console.warn("[heros] statue slot failed, our bronze:", e.message); return null; }),
    ]);
    letters = toR8(letters);           // (one 8-bit channel on the GPU: a quarter of the RGBA upload, names included)
    const names = ["Heros", "Heros_far"];
    const lods = names.map(() => []);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1;
      for (let p = o; p && k < 0; p = p.parent) k = names.indexOf(p.name);
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      if (k >= 0) lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const materials = {};
    const lettering = { tex: letters, cells: cells.cells, size: cells.size };
    for (const s of HE_SLOTS) materials[s] = wrapAO(sourceMaterial(s, lib), aoTex, s, lettering);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `heros_lod${k}`;
      for (const { slot: sl, geometry } of lods[k]) {
        if (slot && sl === "bronze_gilt") continue;      // (a statue slot model replaces our bronze + its rock)
        const slot_ = sl;
        const m = new THREE.Mesh(geometry, materials[slot_]);
        // (the grass blades are no collider: heroColliders.js skips "foliage")
        m.name = slot_ === "plant_grass" ? "heros foliage" : slot_; m.userData.slot = slot_; m.userData.base = m.material;
        m.castShadow = true; m.receiveShadow = true;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
    const setSlotMaterial = (slot, mat) => {
      const w = wrapAO(mat, aoTex, slot, lettering);
      materials[slot] = w;
      for (const g of groups) g.traverse((o) => { if (o.isMesh && o.userData.slot === slot) { o.userData.base = w; o.material = w; } });
      return w;
    };
    const tmp = new THREE.Vector3();
    const distance = (p) => boundsWorld.distanceToPoint(tmp.copy(p));
    return { lods, tris, materials, notes, placement, boundsWorld, make, setSlotMaterial, distance, aoTex, glbBytes: lodsJson.glbBytes,
      aoBytes: aoTex.userData.bytes, drawCalls: lods.map((l) => l.length), slot };
  })());
}

/** the lettering mask as a single-channel (R8) texture with mipmaps (the PNG is grey: its red channel) */
function toR8(tex) {
  const img = tex.image, w = img.width, h = img.height;
  const cv = new OffscreenCanvas(w, h), cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const rgba = cx.getImageData(0, 0, w, h).data, r = new Uint8Array(w * h);
  // rows reversed by hand (a DataTexture is not flipped on upload): the image's top row at v = 1, as TextureLoader's PNG
  for (let y = 0; y < h; y++) { const o = (h - 1 - y) * w, q = y * w * 4; for (let x = 0; x < w; x++) r[o + x] = rgba[q + x * 4]; }
  const t = new THREE.DataTexture(r, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.flipY = false;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  tex.dispose();
  return t;
}

function sourceMaterial(name, lib) {
  let m = null;
  if (lib && !NEW_NAMES.includes(name)) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? lib.getMaterial?.(name) ?? null; }
    catch (e) { console.warn(`[heros] library failed on "${name}":`, e.message); }
  }
  return m ?? (TEMP[name] ?? TEMP.stone_blue)();
}

/** the lettering mask of a face coded "letters" (0 elsewhere): TEXCOORD_0.x = 1000 (cell + 1) + s, .y = v (metres) */
function lettersMask(L) {
  const w = uv(0);
  const cell = floor(w.x.div(1000)).sub(1);
  const s = w.x.sub(cell.add(1).mul(1000));
  let at = vec2(0, 0);
  L.cells.forEach((c) => {
    const k = c.index;
    const [x0, y0, x1, y1] = c.px, [W, H] = c.size_m;
    // (the texture is flipped on upload, three's default: the image's top row is v = 1)
    const row = float(y1).sub(w.y.div(H).clamp(0, 1).mul(y1 - y0));
    const a = vec2(float(x0).add(s.div(W).clamp(0, 1).mul(x1 - x0)).div(L.size[0]), float(1).sub(row.div(L.size[1])));
    at = mix(at, a, float(1).sub(clamp(abs(cell.sub(k)), 0, 1)));
  });
  const on = step(900.0, w.x).mul(isC(codeV(), C.letters));
  return texture(L.tex, at).r.mul(on);
}

/** the baked AO (lighting only) on a slot material: lightmap AO x the thin parts' vertex AO; part of it darkens the
 *  colour; the stone's lettered faces darken where the mask is set (carved letters in shade) */
function wrapAO(src, aoTex, slot, L) {
  const m = src.clone();
  m.name = `heros ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, heLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  let base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
  if (slot === "stone_blue" && L) {
    // a century outdoors: the memorial's blue stone has weathered to a light ash grey (all the photos, 2010s-2025), far
    // lighter than the freshly sawn scan of the library; lifted here for this model only. The STEPS (treads, risers,
    // nosings, cheek kerbs) are rougher, darker, brown-grey rubble with moss in the joints and on the risers (the owner's
    // photo from their foot): less lift, a coursed-rubble pattern on the risers and kerbs, moss by noise and shade
    const cd = codeV();
    const steps = isC(cd, C.tread).add(isC(cd, C.riser)).add(isC(cd, C.nosing)).add(isC(cd, C.kerb)).min(1);
    const vert = isC(cd, C.riser).add(isC(cd, C.kerb)).min(1);
    const W = uv(0), P = positionWorld;
    // coursed rubble (risers, kerbs): courses 6-9 cm, stones 12-38 cm long, dark mortar joints
    // (the bed joints wander: a slow noise bends the courses, so it reads as laid rubble, not brick)
    const yy = W.y.add(vnoise(vec2(W.x.mul(1.7), W.y.mul(0.5))).sub(0.5).mul(0.05));
    const fy = yy.div(0.085), row = floor(fy);
    const off = hash2(vec2(row, 3.1)).mul(0.4);
    const len = float(0.14).add(hash2(vec2(row, 7.7)).mul(0.3));
    const cx = W.x.add(off).div(len);
    const cellK = hash2(vec2(floor(cx), row));
    const jx = min(fract(cx), float(1).sub(fract(cx))).mul(len), jy = min(fract(fy), float(1).sub(fract(fy))).mul(0.085);
    const joint = float(1).sub(smoothstep(0.003, 0.012, min(jx, jy))).mul(vert).mul(0.7);
    const nMoss = vnoise(vec2(P.x.add(P.z).mul(2.3), P.y.mul(2.3).add(P.x.mul(0.7)))).toVar();
    const lift = mix(heLook.weathered, heLook.weathered.mul(0.72), steps);
    base = base.mul(lift).mul(mix(float(1), float(0.75).add(cellK.mul(0.5)), vert)).min(vec3(0.5));
    base = mix(base, base.mul(vec3(1.1, 0.98, 0.8)), steps);                                             // brown-grey
    const moss = steps.mul(smoothstep(0.38, 0.75, nMoss.add(joint.mul(0.6)).add(vert.mul(0.2)))).mul(heLook.moss);
    base = mix(base, lin(0x4a5a2a).mul(float(0.8).add(nMoss.mul(0.4))), moss.mul(0.6));
    base = mix(base, base.mul(0.45), joint);
    const mk = lettersMask(L).mul(heLook.letters);
    base = mix(base, base.mul(0.42), mk);
    m.roughnessNode = mix(mix(src.roughnessNode ?? float(src.roughness ?? 0.8), float(0.95), mk), float(0.97), moss);
    // the letters are INCISED: a V-cut read from the mask's slope (surface-gradient bump), only on the lettered faces
    const on = step(900.0, W.x).mul(isC(cd, C.letters));
    m.normalNode = mix(src.normalNode ?? normalView, bumpNormal(mk.mul(-0.0045)), on);
  }
  m.colorNode = base.mul(mix(float(1), aoK, heLook.aoDirect));
  m.userData.shared = true; m.userData.slot = slot;
  return m;
}

// ------------------------------------------------------------------------------------------------ temporary materials
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p).toVar(), f = fract(p).toVar(), u = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (cd, k) => float(1).sub(clamp(abs(cd.sub(k)), 0, 1));
const C = Object.fromEntries(HE_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, float(1), float(0)) }); return m; };

/** the grey stone of a dropped-in statue's rock (its faces split off by tools/blender/heros_statue_slot.py --rock) */
export function rockMaterial(occ, normalNode = null) {
  const P = positionWorld;
  const n = vnoise(vec2(P.x.add(P.z).mul(5.0), P.y.mul(5.0)));
  const m = std({ colorNode: mix(lin(0x8a8a84), lin(0xa3a29a), n).mul(float(occ).mul(0.45).add(0.55)), roughnessNode: float(0.85), metalnessNode: float(0) });
  if (normalNode) m.normalNode = normalNode;
  m.name = "heros statue rock"; m.userData.shared = true;
  return m;
}

/** GILDED BRONZE (the owner's photo of the front, 2026-11: gold-brown bronze, bright gold on the raised, sun-washed parts,
 *  dark brown in the folds and hollows; 2025: the gilding worn on the weather side), a faint verdigris in the deepest folds.
 *  occ = the occlusion (1 open .. 0 deep fold): our scripted bronze's vertex AO, or a dropped-in statue's baked AO map
 *  (viewer/heros/herosStatue.js). withRock: faces coded "cap" are the rock under the group, grey stone (our model). */
export function bronzeMaterial(occ, withRock = false, normalNode = null) {
  const out = Fn(() => {
    const P = positionWorld;
    const n = vnoise(vec2(P.x.add(P.z).mul(3.0), P.y.mul(2.2))).toVar();
    const up = clamp(normalWorld.y.mul(0.5).add(0.5), 0, 1);
    const gold = mix(lin(0xb3832e), lin(0xe0b452), n);
    const brown = mix(lin(0x6a4a1e), lin(0x8c6a32), n);
    const dark = mix(lin(0x22170c), lin(0x3a2914), n);
    const verd = lin(0x3d5a48);
    const o = float(occ).toVar();
    // (the owner's photo: a brown-gold bronze, the bright gilding only on the raised, sky-facing parts)
    const g = smoothstep(0.6, 0.95, o.mul(0.7).add(up.mul(0.25)).add(n.mul(0.25))).mul(heLook.gilt.mul(1.6).min(1)).toVar();
    // three tones: dark in the hollows -> the brown bronze body -> gold on the raised parts
    const body = mix(mix(dark, verd, smoothstep(0.45, 0.15, o).mul(0.25)), brown, smoothstep(0.25, 0.7, o));
    let c = mix(body, gold, g);
    let rock = float(0);
    if (withRock) {
      rock = isC(codeV(), C.cap);
      c = mix(c, mix(lin(0x8a8a84), lin(0xa3a29a), n).mul(o.mul(0.4).add(0.6)), rock);
    }
    return vec4(c, g.mul(float(1).sub(rock)));
  })();
  const m = noSSR(std({ colorNode: out.xyz, roughnessNode: mix(float(0.55), float(0.28), out.w), metalnessNode: mix(float(0.75), float(1.0), out.w) }));
  if (withRock) {
    const rk = isC(codeV(), C.cap);
    m.metalnessNode = mix(m.metalnessNode, float(0), rk); m.roughnessNode = mix(m.roughnessNode, float(0.85), rk);
  }
  if (normalNode) m.normalNode = normalNode;
  return m;
}

const TEMP = {
  /** BLUE STONE (petit granit), when the library's scan is not there: dark blue-grey, sawn faces with a lighter tooled
   *  grain, crinoid flecks; carved parts (relief, bouquets, animals) a touch lighter (the photos: weathered grey) */
  stone_blue: () => {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const n = vnoise(w.mul(3.0)).toVar(), f = vnoise(w.mul(41.0)).toVar();
      const cd = codeV();
      const carved = isC(cd, C.relief).add(isC(cd, C.bouquet)).add(isC(cd, C.animal)).min(1);
      const c = mix(lin(0x3e4247), lin(0x5b6066), n.mul(0.6).add(carved.mul(0.35))).mul(float(0.92).add(f.mul(0.12)));
      const fleck = step(0.93, hash2(floor(w.mul(160.0)))).mul(0.06);
      return c.add(fleck);
    })();
    const P = positionWorld;
    const low = smoothstep(GROUND + 0.6, GROUND, P.y);
    return std({ colorNode: col.mul(float(1).sub(low.mul(0.12))), roughnessNode: float(0.78), metalnessNode: float(0) });
  },
  /** GILDED BRONZE (the photos 2010s: bright gold; 2025: the gilding worn to dark bronze in the hollows and on the
   *  weather side): gold on the raised, sun-washed parts, dark brown-olive bronze in the hollows (the vertex AO), rain
   *  streaks of verdigris faintly in the deepest folds */
  bronze_gilt: () => bronzeMaterial(attribute("color", "vec4").g, true),
  /** the enclosure's railing: black paint over wrought iron, satin, a little rust bloom low down */
  cast_iron_black: () => {
    const P = positionWorld;
    const n = vnoise(vec2(P.x.add(P.z).mul(9.0), P.y.mul(9.0)));
    const c = mix(lin(0x101112), lin(0x1c1a18), n).add(lin(0x2a1508).mul(smoothstep(0.75, 1.0, n).mul(0.6)));
    return noSSR(std({ colorNode: c, roughnessNode: float(0.5), metalnessNode: float(0.3) }));
  },
  /** the dark green painted iron (the owner's photos, C2 2025): the enclosure's railing, the handrails, the bins, the lamp
   *  column; on this slot "panel" = lantern / floodlight glass (warm glow at night, emissive only: no light), "cap" = the
   *  floodlight's grey housing, "seat" = a bin's red band */
  cast_iron_green: () => {
    const P = positionWorld;
    const n = vnoise(vec2(P.x.add(P.z).mul(6.0), P.y.mul(6.0)));
    const cd = codeV();
    const glass = isC(cd, C.panel), grey = isC(cd, C.cap), band = isC(cd, C.seat);
    let c = mix(lin(0x16261c), lin(0x1f3326), n);
    c = mix(c, mix(lin(0x6b6e6c), lin(0x7c7f7c), n), grey);
    c = mix(c, lin(0x7a1610), band);
    c = mix(c, lin(0x9a968a), glass);
    const m = noSSR(std({ colorNode: c, roughnessNode: mix(mix(float(0.42), float(0.5), grey), float(0.12), glass), metalnessNode: mix(float(0.35), float(0.0), glass.add(band).min(1)) }));
    m.emissiveNode = lin(0xffc070).mul(env.uNight.mul(5.0)).mul(glass);
    return m;
  },
  /** the bed's soil: dark brown, crumbly, a little bark mulch */
  soil_bed: () => {
    const w = uv(0);
    const n = vnoise(w.mul(9.0)), f = vnoise(w.mul(55.0));
    const c = mix(lin(0x2a1f16), lin(0x3d2e20), n).mul(float(0.85).add(f.mul(0.3)));
    return std({ colorNode: c, roughnessNode: float(0.95), metalnessNode: float(0), normalNode: bumpNormal(f.mul(0.004)) });
  },
  /** the flower bed (the owner's photo: low bedding plants, orange and yellow marigolds, red begonias): leafy mounds
   *  dotted with flowers from above (cells of ~5 cm, a colour per cell), the heads ("finial" on this slot) in the same
   *  colours */
  plant_grass: () => {
    const out = Fn(() => {
      const P = positionWorld;
      const cd = codeV();
      const head = isC(cd, C.finial);
      const n = vnoise(vec2(P.x.mul(3.0), P.z.mul(3.0))).toVar();
      const fine = vnoise(vec2(P.x.mul(31.0), P.z.mul(31.0).add(P.y.mul(17.0))));
      const leaf = mix(lin(0x2a4a1c), lin(0x4d7030), n.mul(0.5).add(fine.mul(0.5))).mul(smoothstep(GROUND + 1.0, GROUND + 1.3, P.y).mul(0.5).add(0.5));
      // round flowers ~2 cm across on a 2.5 cm lattice (jittered), seen from above; the heads (3D) in the same colours
      const q = vec2(P.x, P.z).mul(40.0);
      const cell = floor(q);
      const hs = hash2(cell).toVar(), pick = hash2(cell.add(17.0)).toVar();
      const jit = vec2(hash2(cell.add(5.0)), hash2(cell.add(9.0))).sub(0.5).mul(0.3);
      const dist = fract(q).sub(0.5).sub(jit).length();
      const headPick = hash2(floor(vec2(P.x, P.z).mul(9.0)).add(31.0));
      const pk = mix(pick, headPick, head);
      const bloomC = mix(mix(lin(0xd8560e), lin(0xe8a314), smoothstep(0.38, 0.42, pk)), lin(0xa8141c), smoothstep(0.8, 0.83, pk));
      const dots = step(0.3, hs).mul(float(1).sub(smoothstep(0.26, 0.34, dist))).mul(smoothstep(0.35, 0.8, normalWorld.y)).mul(float(1).sub(head));
      const c = mix(leaf, bloomC, dots.add(head).min(1));
      return vec4(c, dots.add(head).min(1));
    })();
    const m = std({ colorNode: out.xyz, roughnessNode: mix(float(0.75), float(0.6), out.w), metalnessNode: float(0) });
    return m;
  },
};
export const HE_TEMP_MATERIALS = TEMP;
