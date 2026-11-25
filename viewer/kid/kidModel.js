// THE KID's look (docs/KID.md): models/characters/kid.glb carries, per LOD, ONE skinned primitive with a _SLOT attribute
// (the named material slot of each vertex: skin, shirt, shorts, ... as made by tools/characters/kid.py) and its AO
// (COLOR_0, baked per vertex). Here the slots get their colours from a PALETTE (uniforms: an outfit change is a uniform
// write, no rebuild, no new material), the AO multiplies in, and a soft "painted" response: a warm wrap of the light
// into the shadow side and a gentle rim, all in the material's colour (no extra light: rule 7). One material, one draw
// per LOD (+ its shadow).
//
//   const kid = prepareKid(gltf)       after GLTFLoader; { meshes: [LOD0, LOD1, LOD2], material, setLod(i), setColor(slot, hex) }
//   kid.autoLod(distance)               LOD by camera distance with hysteresis (LOD0 < 14 m < LOD1 < 40 m < LOD2)
import * as THREE from "three/webgpu";
import { attribute, uniformArray, int, float, vec3, mix, normalView, positionViewDirection, dot, max, pow, clamp, texture, uv, select } from "three/tsl";

/** the default outfit (sRGB hex): a yellow ringer tee with a teal trim, denim-blue shorts, white tube socks with red
 *  stripes, white sneakers with a red stripe, a red cap, brown hair, green eyes (docs/KID.md: change them here or live) */
export const KID_PALETTE = {
  skin: 0xe8b796, shirt: 0xf2c230, shirt_trim: 0x1f8a8a, shorts: 0x3d5a8a, socks: 0xf2f0ea, sock_stripe: 0xc83030,
  shoe: 0xf4f4f2, shoe_accent: 0xc83030, sole: 0xe9e4d8, lace: 0xfafafa, hair: 0x5a3a22, brow: 0x3e2716,
  eye_white: 0xf4f1ec, iris: 0x4a7a3c, pupil: 0x121212, mouth: 0xa4504a, cap: 0xc8302c, cap_brim: 0xc8302c,
};
/** roughness per slot (eyes glossy, cloth matte) */
export const KID_ROUGH = { eye_white: 0.25, iris: 0.2, pupil: 0.15, shoe: 0.6, shoe_accent: 0.6, sole: 0.75, skin: 0.6, hair: 0.62 };
export const KID_LOD = { near: 14, far: 40, hyst: 1.5 };

export function kidMaterial(slots, palette = KID_PALETTE) {
  const cols = slots.map((n) => new THREE.Color(palette[n] ?? 0xff00ff));
  const rough = slots.map((n) => KID_ROUGH[n] ?? 0.85);
  const uCol = uniformArray(cols, "color"), uRough = uniformArray(rough, "float");
  // (rounded: the slot is interpolated across the triangle like any varying; 10.9999 truncated to 10 speckled the cap)
  const slot = int(attribute("_slot", "float").add(0.5));
  const ao = attribute("color", "vec4").x;
  const base = uCol.element(slot);
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  // painted: the AO softened toward a warm tint (no grey dirt), a faint rim of the base colour
  const aoTint = mix(vec3(0.42, 0.30, 0.26), vec3(1, 1, 1), ao);
  const rim = pow(float(1).sub(clamp(dot(normalView, positionViewDirection), 0, 1)), float(3)).mul(0.10);
  m.colorNode = base.mul(aoTint).add(base.mul(rim));
  m.roughnessNode = uRough.element(slot);
  m.userData.slots = slots; m.userData.uCol = uCol;
  return m;
}

/** THE MPFB KID (docs/KIDCHAR.md phase 2: models/characters/kidA.glb): one atlas (kidA_atlas.ktx2) for the colour, the
 *  slots for the roughness, the skin's warmth and the cap's brim (both brims are in the mesh: the hidden one's slot is
 *  alpha-tested away: a uniform write, no rebuild). Alpha-tested (hair cards, brows, lashes) and double sided (the cards). */
export const KIDA_ROUGH = { skin: 0.62, eyes: 0.28, hair: 0.78, brows: 0.85, lashes: 0.85, tee: 0.92, shorts: 0.9, shoes: 0.55,
  jacket: 0.5, socks: 0.95, cap: 0.85, brim_f: 0.75, brim_b: 0.75 };
const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";
export function kidAtlasMaterial(slots, url, renderer) {
  const ph = new THREE.DataTexture(new Uint8Array([214, 170, 140, 255]), 1, 1); ph.colorSpace = THREE.SRGBColorSpace; ph.needsUpdate = true;
  const tex = texture(ph, uv());
  const uRough = uniformArray(slots.map((n) => KIDA_ROUGH[n] ?? 0.8), "float");
  const uHide = uniformArray(slots.map((n) => (n === "brim_b" ? 1 : 0)), "float");
  const slot = int(attribute("_slot", "float").add(0.5));
  const ao = attribute("color", "vec4").x;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, side: THREE.DoubleSide });
  m.alphaTest = 0.5;
  const base = tex.rgb;
  // painted: the AO softened toward a warm tint, a faint rim; the skin a touch of warm "subsurface" glow (no shine)
  // (a lighter AO than the old kid's: his textures already carry their shading, the full tint made the face muddy
  // under the cap in the lab's light)
  const aoTint = mix(vec3(0.70, 0.60, 0.56), vec3(1, 1, 1), ao);
  const rim = pow(float(1).sub(clamp(dot(normalView, positionViewDirection), 0, 1)), float(3)).mul(0.10);
  const isSkin = select(slot.equal(int(Math.max(0, slots.indexOf("skin")))), float(1), float(0));
  m.colorNode = base.mul(aoTint).add(base.mul(rim));
  m.emissiveNode = base.mul(vec3(0.07, 0.025, 0.015)).mul(isSkin).mul(ao);
  m.opacityNode = tex.a.mul(float(1).sub(uHide.element(slot)));
  m.roughnessNode = uRough.element(slot);
  m.userData.slots = slots; m.userData.uHide = uHide; m.userData.tex = tex;
  if (url && url !== "none" && typeof window !== "undefined") {
    import("three/addons/loaders/KTX2Loader.js").then(({ KTX2Loader }) => {
      const ktx = new KTX2Loader().setTranscoderPath(TRANSCODER);
      if (renderer) ktx.detectSupport(renderer);
      ktx.load(url, (t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tex.value = t; m.needsUpdate = true; ktx.dispose(); },
        undefined, (e) => console.warn("[kid] atlas failed", url, e));
    });
  }
  return m;
}

/** after GLTFLoader: the LOD meshes found, one shared palette material, LOD1/2 hidden. atlas: the MPFB kid's KTX2 (URL). */
export function prepareKid(gltf, { palette = KID_PALETTE, atlas = null, renderer = null } = {}) {
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh && /kid_LOD\d/.test(o.name)) meshes.push(o); });
  meshes.sort((a, b) => a.name.localeCompare(b.name));
  if (!meshes.length) throw new Error("kid.glb: no kid_LOD meshes");
  const slots = meshes[0].geometry.userData?.slots || gltf.parser?.json?.meshes?.[0]?.extras?.slots || Object.keys(palette);
  const material = atlas ? kidAtlasMaterial(slots, atlas, renderer) : kidMaterial(slots, palette);
  for (const m of meshes) { m.material = material; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
  let lod = 0;
  const kid = {
    meshes, material, slots, gltf,
    get lod() { return lod; },
    setLod(i) { lod = Math.max(0, Math.min(meshes.length - 1, i)); meshes.forEach((m, k) => { m.visible = k === lod; }); },
    /** LOD from the camera distance (m), with hysteresis so it never flickers at a threshold */
    autoLod(d) {
      const H = KID_LOD.hyst;
      let want = lod;
      if (lod === 0 && d > KID_LOD.near + H) want = 1;
      else if (lod === 1 && d < KID_LOD.near - H) want = 0;
      else if (lod === 1 && d > KID_LOD.far + H) want = 2;
      else if (lod === 2 && d < KID_LOD.far - H) want = 1;
      if (want !== lod) kid.setLod(want);
      return lod;
    },
    setColor(slotName, hex) { const i = slots.indexOf(slotName); if (i >= 0 && material.userData.uCol) material.userData.uCol.array[i].set(hex); },
    /** the MPFB kid's cap: "fwd" | "back" (the other brim's slot hidden) */
    setCap(mode) {
      const H = material.userData.uHide; if (!H) return;
      slots.forEach((n, i) => { if (n === "brim_f") H.array[i] = mode === "back" ? 1 : 0; if (n === "brim_b") H.array[i] = mode === "back" ? 0 : 1; });
    },
    tris: meshes.map((m) => (m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3)),
  };
  kid.setLod(0);
  return kid;
}
