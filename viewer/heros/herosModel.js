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
//     plant_grass; cast_iron_green and cobbles: the library names, not shipped: temporary too);
//   - every slot material is wrapped with the model's baked AO (lighting only); the dithered LOD cross-fade comes from
//     lodFade.js through setLodFades (shared with Saint-Pierre).
// LODs: both SCRIPTED in Blender (packed with hero_pack.mjs --nolod: a meshopt LOD1 of this model failed the mesh audit,
// 1545 streaks on the bronze, as on Saint-Augustin): LOD0 (43 k triangles) to 90 m, the far variant (2.2 k: no railing
// bars, rings, roses, animals, blades; the bronze at ~900 triangles) beyond, a 15 m dithered band between.
import * as THREE from "three/webgpu";
import { attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min,
  mod, mrt, uniform, Fn, vec4 } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { bumpNormal } from "../tslkit.js";
import { loadAO, setLodFades } from "../stpierreModel.js";
import { libSource } from "../materials/libSwitch.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER } from "../streets/paving.js";

export { setLodFades };
export const HE_SLOTS = ["stone_blue", "bronze_gilt", "cast_iron_black", "cast_iron_green", "soil_bed", "plant_grass", "cobbles"];
export const NEW_NAMES = ["bronze_gilt", "cast_iron_black", "soil_bed", "plant_grass"];
export const HE_CODES = ["plain", "panel", "letters", "nosing", "riser", "tread", "kerb", "relief", "bouquet", "animal", "rail", "post",
  "finial", "cap", "plinth", "seat"];
/** LOD switch distances (m, camera to the model's box) and each cross-fade band's half-width */
export const HE_LODS = [{ until: 90, band: 15 }, { until: Infinity }];
const GROUND = 50.55;

const SOURCE = libSource("heros", "../materials/shipped.js");
export const heLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), letters: uniform(1.0), gilt: uniform(0.55), weathered: uniform(3.8) };

let promise = null;
export function loadHeros() {
  return (promise ??= (async () => {
    const base = new URL("../../models/heros/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const lettersP = new THREE.TextureLoader().loadAsync(new URL("../../textures/heros/heros_letters.png", import.meta.url).href);
    const [gltf, notes, lodsJson, aoTex, lib, letters, cells] = await Promise.all([
      loader.loadAsync(base + "heros.glb"),
      fetch(base + "heros.json").then((r) => r.json()),
      fetch(base + "heros.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "heros_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[heros] material library not loaded:", e.message); return null; }),
      lettersP,
      fetch(new URL("../../textures/heros/heros_letters.json", import.meta.url).href).then((r) => r.json()),
    ]);
    letters.colorSpace = THREE.NoColorSpace; letters.anisotropy = 8;
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
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        // (the grass blades are no collider: heroColliders.js skips "foliage")
        m.name = slot === "plant_grass" ? "heros foliage" : slot; m.userData.slot = slot; m.userData.base = m.material;
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
      aoBytes: aoTex.userData.bytes, drawCalls: lods.map((l) => l.length) };
  })());
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
  L.cells.forEach((c, k) => {
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
    // lighter than the freshly sawn scan of the library; lifted here for this model only
    base = base.mul(heLook.weathered).min(vec3(0.5));
    const mk = lettersMask(L).mul(heLook.letters);
    base = mix(base, base.mul(0.38), mk);
    m.roughnessNode = mix(src.roughnessNode ?? float(src.roughness ?? 0.8), float(0.95), mk);
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
  bronze_gilt: () => {
    const out = Fn(() => {
      const P = positionWorld;
      const occ = attribute("color", "vec4").g;
      const n = vnoise(vec2(P.x.add(P.z).mul(3.0), P.y.mul(2.2))).toVar();
      const up = clamp(normalWorld.y.mul(0.5).add(0.5), 0, 1);
      const gold = mix(lin(0xb3832e), lin(0xe0b452), n);
      const dark = mix(lin(0x2a1d10), lin(0x45311a), n);
      const verd = lin(0x3d5a48);
      const g = smoothstep(0.45, 0.85, occ.mul(0.7).add(up.mul(0.25)).add(n.mul(0.25))).mul(heLook.gilt.mul(1.6).min(1)).toVar();
      const c = mix(mix(dark, verd, smoothstep(0.5, 0.2, occ).mul(0.25)), gold, g);
      return vec4(c, g);
    })();
    return noSSR(std({ colorNode: out.xyz, roughnessNode: mix(float(0.55), float(0.28), out.w), metalnessNode: mix(float(0.75), float(1.0), out.w) }));
  },
  /** the enclosure's railing: black paint over wrought iron, satin, a little rust bloom low down */
  cast_iron_black: () => {
    const P = positionWorld;
    const n = vnoise(vec2(P.x.add(P.z).mul(9.0), P.y.mul(9.0)));
    const c = mix(lin(0x101112), lin(0x1c1a18), n).add(lin(0x2a1508).mul(smoothstep(0.75, 1.0, n).mul(0.6)));
    return noSSR(std({ colorNode: c, roughnessNode: float(0.5), metalnessNode: float(0.3) }));
  },
  /** the handrails of the 12 steps: green paint on steel tube (Commons "Square Heros Bxl 01") */
  cast_iron_green: () => {
    const P = positionWorld;
    const n = vnoise(vec2(P.x.add(P.z).mul(6.0), P.y.mul(6.0)));
    return noSSR(std({ colorNode: mix(lin(0x1b3326), lin(0x24402f), n), roughnessNode: float(0.45), metalnessNode: float(0.35) }));
  },
  /** the bed's soil: dark brown, crumbly, a little bark mulch */
  soil_bed: () => {
    const w = uv(0);
    const n = vnoise(w.mul(9.0)), f = vnoise(w.mul(55.0));
    const c = mix(lin(0x2a1f16), lin(0x3d2e20), n).mul(float(0.85).add(f.mul(0.3)));
    return std({ colorNode: c, roughnessNode: float(0.95), metalnessNode: float(0), normalNode: bumpNormal(f.mul(0.004)) });
  },
  /** ornamental grass (the photos 2025: pale straw-green Pennisetum / Calamagrostis clumps), darker at the base */
  plant_grass: () => {
    const P = positionWorld;
    const n = vnoise(vec2(P.x.mul(4.0), P.z.mul(4.0)));
    const tip = smoothstep(GROUND + 1.2, GROUND + 1.8, P.y);
    const c = mix(mix(lin(0x5d6a33), lin(0x7c7a45), n), mix(lin(0xb9ad7a), lin(0xcdbf8c), n), tip);
    const m = std({ colorNode: c, roughnessNode: float(0.8), metalnessNode: float(0) });
    m.side = THREE.DoubleSide;
    return m;
  },
  /** the steps' treads: the streets' setts (viewer/streets/paving.js, the same scan as Place de Saint-Job) when the
   *  street textures are loaded, else a procedural grey setts pattern */
  cobbles: () => {
    if (pavingTextures()) {
      const w = uv(0);
      const S = pavingSample(w.x, w.y, float(LAYER.setts), float(1.3));
      return std({ colorNode: regrade(S.col, "setts", [0.085, 0.082, 0.078], 0.8).mul(mix(float(1), S.ao, 0.5)), roughnessNode: S.rough.mul(1.05).min(0.97),
        metalnessNode: float(0), aoNode: S.ao, normalNode: pavingNormal(S.n, w.x, w.y, float(1)) });
    }
    const col = Fn(() => {
      const w = uv(0).toVar();
      const cu = w.x.div(0.14), cv = w.y.div(0.12);
      const row = floor(cv), cc = floor(cu.add(mod(row, 2).mul(0.5)));
      const fu = fract(cu.add(mod(row, 2).mul(0.5))), fv = fract(cv);
      const j = smoothstep(0.0, 0.08, min(min(fu, float(1).sub(fu)), min(fv, float(1).sub(fv))));
      const t = hash2(vec2(cc, row));
      return mix(lin(0x2a2826), mix(lin(0x55524c), lin(0x6e6a62), t), j);
    })();
    return std({ colorNode: col, roughnessNode: float(0.85), metalnessNode: float(0) });
  },
};
export const HE_TEMP_MATERIALS = TEMP;
