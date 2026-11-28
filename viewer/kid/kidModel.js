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
import { attribute, uniformArray, int, float, vec3, vec4, mix, normalView, positionViewDirection, positionView, positionGeometry, normalGeometry,
  cameraViewMatrix, faceDirection, diffuseColor, Fn, uniform, atan, sin, cos, exp, smoothstep, dot, max, pow, clamp, texture, uv, select } from "three/tsl";

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

/** THE KID LOOK (docs/KIDCHAR.md phase 6, owner 2026-11-28: "looks too much like plastic"; rule kid-not-plastic). The
 *  plastic came from the material, not the mesh: one flat roughness per slot over a base colour with no relief (the
 *  normal maps were dropped at the pack, the scripted garments are flat colour cells), the full specular F0 on cloth,
 *  the environment's reflection not occluded in the creases (the AO only multiplied the colour), an additive rim that
 *  lit every silhouette alike and a skin "glow" emissive that shone the same in the shade. Now:
 *   - kidA_detail.ktx2 (tools/blender/kidLookBake.py, the atlas layout): relief (seams, welts, the zip, the elastic,
 *     folds, the soles' grooves, the paint's own folds), a roughness offset (T-zone, lips, sole rubber), cavity, and the
 *     skin's warmth / the hair colour on the scalp (a soft hairline);
 *   - kid_fabric.ktx2: TILING micro relief (knit, ripstop, twill, skin pores) triplanar in the BIND pose (it rides the
 *     skin, no swimming), per slot its own weave and tile size;
 *   - the garments with a 1-D colour cell (sleeves, socks, cap) get their folds / ribs / panel seams from the bind
 *     position here (no 2-D texels to bake into yet);
 *   - one bump from the summed height (screen-space derivatives: no tangents in the GLB, none needed);
 *   - a physical material: sheen on the cottons, a lower specular on cloth, the vertex AO as aoNode (it occludes the
 *     sky's light AND its reflection in the creases), a wrapped, reddened diffuse on the skin (cheap subsurface), a
 *     Kajiya-Kay highlight ring on the hair, a fixed catchlight in the eyes (emissive, view space: they read alive).
 *  Same mesh, same one draw per LOD, 2 more textures (456 KB). ?kidlook=old: kidAtlasMaterial (before). */
export const KIDLOOK = {
  heightMM: 1.6,
  bump: 2.5,                   // the relief's gain in the bump (tuned in the bike lab's close-ups, 2026-11-28: x1 read flat, x8 rough)               // tools/blender/kidLookBake.py HEIGHT_MM (the detail map's R at 0 / 1)
  rough: { skin: 0.56, eyes: 0.06, hair: 0.5, brows: 0.8, lashes: 0.8, tee: 0.93, shorts: 0.9, shoes: 0.62, jacket: 0.6,
    socks: 0.97, cap: 0.88, brim_f: 0.82, brim_b: 0.82 },
  spec: { skin: 0.55, eyes: 1, hair: 0.25, brows: 0.2, lashes: 0.2, tee: 0.35, shorts: 0.35, shoes: 0.55, jacket: 0.6,
    socks: 0.3, cap: 0.35, brim_f: 0.4, brim_b: 0.4 },
  sheen: { tee: 0.7, shorts: 0.45, socks: 0.8, cap: 0.5, brim_f: 0.4, brim_b: 0.4, jacket: 0.18, shoes: 0.1 },
  // micro relief per slot: [fabric channel 0 knit | 1 ripstop | 2 twill | 3 skin | -1 none, tile size (m), depth (mm), albedo variation]
  micro: { skin: [3, 0.03, 0.02, 0.03], tee: [0, 0.016, 0.22, 0.06], socks: [0, 0.02, 0.3, 0.06], jacket: [1, 0.02, 0.2, 0.05],
    shorts: [2, 0.012, 0.22, 0.08], cap: [2, 0.014, 0.18, 0.06], brim_f: [2, 0.014, 0.18, 0.05], brim_b: [2, 0.014, 0.18, 0.05],
    shoes: [1, 0.03, 0.08, 0.03], hair: [-1, 1, 0, 0], eyes: [-1, 1, 0, 0], brows: [-1, 1, 0, 0], lashes: [-1, 1, 0, 0] },
  hair: 0x63432a,              // the hair cell's mean (sRGB): the scalp tint under the cards
};
/** ROUND 2 (docs/KIDCHAR.md phase 7, rule kid-not-plastic): the mesh carries the clothes' shapes (hem bands, cuffs,
 *  the shorts' cuff / pockets, the socks' rib, the laces / tongue, a hair shell, a smoother brim) and its sleeves /
 *  socks / cap / brims have 2-D cells, so their folds are BAKED in kidA_detail (the procedural folds below are off);
 *  and a brighter AO: round 1 read darker than the old look overall (the colour AO floor 0.82 and the full vertex AO on
 *  the sky light). r2 (tuned in the bike lab against old: body luma 73 / 74 vs old 74 / 75, r1 70 / 71): the colour floor 0.97, the sky light
 *  occluded down to 0.8 at most (0.95 on the skin); the creases still shade through the baked cavity and the relief. */
KIDLOOK.r2 = { aoColour: 0.97, aoSky: 0.8, aoSkin: 0.95 };
KIDLOOK.r1 = { aoColour: 0.82, aoSky: 0, aoSkin: 0 };
/** ?kidlook=old: the look before 2026-11-28 (kidAtlasMaterial, round 1's mesh); ?kidlook=r1: round 1 (kidLookMaterial on
 *  round 1's mesh, kidA_r1.*); default "r2": round 2 */
const LOOK_Q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("kidlook") : null;
export const KID_LOOK = LOOK_Q === "old" ? "old" : LOOK_Q === "r1" ? "r1" : "r2";
export const KID_LOOK_OLD = KID_LOOK === "old";

class KidLookLighting extends THREE.PhysicalLightingModel {
  constructor(k) { super(false, true, false, false, false, false); this.k = k; }
  direct({ lightDirection, lightColor, reflectedLight }, builder) {
    const k = this.k ?? builder.material.kidLook;
    const NL = normalView.dot(lightDirection);
    // the skin: wrapped diffuse past the terminator, reddened (light scattered under the skin comes out red)
    const wrap = NL.add(0.5).div(1.5).clamp().sub(NL.clamp()).max(0);
    reflectedLight.directDiffuse.addAssign(wrap.mul(lightColor).mul(diffuseColor.rgb).mul(vec3(0.95, 0.42, 0.3)).mul(k.skin).mul(0.55 / Math.PI));
    // the hair: a Kajiya-Kay ring (strands run down the head: the tangent = the view's up, off the normal), a sharp
    // white lobe and a broad, shifted lobe in the hair's colour
    const up = cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz;
    const T = up.sub(normalView.mul(normalView.dot(up))).normalize();
    const Hh = lightDirection.add(positionViewDirection).normalize();
    const kk = (t, p) => { const th = t.dot(Hh); return float(1).sub(th.mul(th)).max(0).sqrt().pow(p); };
    const T2 = T.add(normalView.mul(0.18)).normalize();
    const spec = kk(T, 120).mul(0.22).add(kk(T2, 28).mul(diffuseColor.rgb).mul(0.5));
    reflectedLight.directSpecular.addAssign(spec.mul(lightColor).mul(NL.clamp().sqrt()).mul(k.hair));
    super.direct({ lightDirection, lightColor, reflectedLight }, builder);
  }
}
class KidLookNodeMaterial extends THREE.MeshPhysicalNodeMaterial {
  setupLightingModel() { return new KidLookLighting(this.kidLook); }
  customProgramCacheKey() { return "kidlook:" + super.customProgramCacheKey(); }
  copy(src) { super.copy(src); this.kidLook = src.kidLook; return this; }      // (the camera fade clones it)
}

function dataTex(rgba) {
  const t = new THREE.DataTexture(new Uint8Array(rgba), 1, 1); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
}
/** derivative bump: the view normal tilted by the screen-space slope of a height (metres) */
const bumpFromHeight = Fn(([hgt]) => {
  const dpx = positionView.dFdx(), dpy = positionView.dFdy();
  const r1 = dpy.cross(normalView), r2 = normalView.cross(dpx);
  const det = dpx.dot(r1).mul(faceDirection);
  const grad = det.sign().mul(hgt.dFdx().mul(r1).add(hgt.dFdy().mul(r2)));
  return det.abs().mul(normalView).sub(grad).normalize();
});

export function kidLookMaterial(slots, urls = {}, renderer = null, round = 2) {
  const L = KIDLOOK, per = (o, d) => slots.map((n) => o[n] ?? d);
  const R = round === 1 ? L.r1 : L.r2;
  const ph = new THREE.DataTexture(new Uint8Array([214, 170, 140, 255]), 1, 1); ph.colorSpace = THREE.SRGBColorSpace; ph.needsUpdate = true;
  const tex = texture(ph, uv());
  const det = texture(dataTex([128, 128, 255, 128]), uv());
  const fabT = dataTex([128, 128, 128, 128]);
  const uRough = uniformArray(per(L.rough, 0.85), "float"), uSpec = uniformArray(per(L.spec, 0.4), "float"), uSheen = uniformArray(per(L.sheen, 0), "float");
  const uHide = uniformArray(slots.map((n) => (n === "brim_b" ? 1 : 0)), "float");
  const mic = slots.map((n) => L.micro[n] ?? [-1, 1, 0, 0]);
  const uChan = uniformArray(mic.map(([c]) => new THREE.Vector4(c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0, c === 3 ? 1 : 0)), "vec4");
  const uMic = uniformArray(mic.map(([, s, d, a]) => new THREE.Vector4(1 / s, d * 0.001, a, 0)), "vec4");
  const slot = int(attribute("_slot", "float").add(0.5));
  const S = (n) => float(slots.indexOf(n) >= 0 ? select(slot.equal(int(slots.indexOf(n))), float(1), float(0)) : float(0));
  const ao = attribute("color", "vec4").x;
  const m = new KidLookNodeMaterial({ metalness: 0, side: THREE.DoubleSide });
  m.alphaTest = 0.5;
  const isSkin = S("skin"), isHair = S("hair"), isEyes = S("eyes"), isJacket = S("jacket"), isSocks = S("socks"), isCap = S("cap");
  m.kidLook = { skin: isSkin, hair: isHair };
  const D = det.rgba;
  // the micro relief: the fabric sheet triplanar in the bind pose (rides the skin), its channel and tile per slot
  const pB = positionGeometry, nB = normalGeometry.abs().pow(4);
  const wsum = nB.x.add(nB.y).add(nB.z).add(1e-4);
  const mv = uMic.element(slot), sc = mv.x;
  const fab = (p) => texture(fabT, p);
  const fx = fab(pB.zy.mul(sc)), fy = fab(pB.xz.mul(sc)), fz = fab(pB.xy.mul(sc));
  const F = fx.mul(nB.x).add(fy.mul(nB.y)).add(fz.mul(nB.z)).div(wsum);
  const micro = F.dot(uChan.element(slot)).sub(0.5);                // -0.5 .. 0.5 (0 where the slot has none)
  // the 1-D-cell garments' folds from the bind position (metres; T-pose: arms along x, +z forward, y up)
  const ax = pB.x.abs();
  const U = uv();
  const inSleeve = isJacket.mul(select(U.x.greaterThan(1280 / 2048).and(U.x.lessThan(1344 / 2048)).and(U.y.greaterThan(0.8)), float(1), float(0)));
  const s = ax.sub(0.149).div(0.4).clamp();                         // shoulder 0 -> wrist 1
  const aArm = atan(pB.z.sub(0.034), pB.y.sub(1.117));
  const sq = (x) => x.mul(x);   // (WGSL pow() of a negative base is undefined)
  const gauss = (x, c, w) => exp(sq(x.sub(c).div(w)).negate());
  const mm = 0.001;
  const sleeveH = sin(ax.mul(2 * Math.PI / 0.011).add(sin(aArm.mul(2)).mul(2))).mul(gauss(s, 0.5, 0.09)).mul(0.9)
    .add(sin(ax.mul(2 * Math.PI / 0.009).add(sin(aArm.mul(3)).mul(1.5))).mul(gauss(s, 0.85, 0.05)).mul(0.7))
    .add(cos(aArm.mul(36)).mul(0.5).mul(smoothstep(0.93, 0.95, s)))
    .add(sin(aArm.mul(2).add(ax.mul(40))).mul(gauss(s, 0.1, 0.08)).mul(0.6));
  const aLeg = atan(pB.z.add(0.003), ax.sub(0.088));
  const sockH = cos(aLeg.mul(40)).mul(0.45).add(sin(pB.y.mul(2 * Math.PI / 0.009).add(sin(aLeg.mul(2)).mul(2))).mul(gauss(pB.y, 0.12, 0.035)).mul(0.6));
  // the cap: the white front panel's two seams (|x| 2.4 cm) and the back panels' seams (every 90 deg round the crown)
  const aCap = atan(pB.x, pB.z.sub(0.04));
  const seamF = ax.sub(0.024).abs().mul(1000).mul(select(pB.z.greaterThan(0.06), float(1), float(0)));
  const seamB = sin(aCap.mul(2)).abs().mul(80).add(select(pB.z.greaterThan(0.06), float(99), float(0)));
  const groove = (d) => exp(sq(d.div(0.7)).negate()).mul(-0.8).add(exp(sq(d.sub(1.8).div(0.6)).negate()).mul(0.3));
  const capH = groove(seamF.add(select(pB.z.greaterThan(0.06), float(0), float(99)))).add(groove(seamB));
  const procH = sleeveH.mul(inSleeve).add(sockH.mul(isSocks)).add(capH.mul(isCap)).mul(mm);
  // (round 2: those folds are baked into the 2-D cells: off here)
  const hgt = round === 1 ? D.r.sub(0.5).mul(2 * L.heightMM * mm).add(micro.mul(mv.y)).add(procH) : D.r.sub(0.5).mul(2 * L.heightMM * mm).add(micro.mul(mv.y));
  const uBump = uniform(L.bump);                                    // (a tuning knob: kid.material.userData.uBump.value)
  m.normalNode = bumpFromHeight(hgt.mul(uBump));
  // colour: the atlas x cavity x a little fibre mottle; the skin warmed / the scalp toward the hair colour
  let base = tex.rgb.mul(D.b).mul(float(1).add(micro.mul(mv.z).mul(2)));
  const warm = D.a.sub(0.5).mul(2).max(0), hairT = float(0.5).sub(D.a).mul(2).max(0);
  base = mix(base, base.mul(vec3(1.07, 0.86, 0.8)), warm.mul(0.7).mul(isSkin));
  const hc = new THREE.Color(L.hair);
  base = mix(base, vec3(hc.r, hc.g, hc.b).mul(0.75), hairT.mul(0.85).mul(isSkin));
  base = base.mul(mix(float(R.aoColour), float(1), ao));            // a gentle contact darkening (the AO's job is below)
  m.colorNode = base;
  // (round 2: the skin's sky AO floor higher still: the face sits under the brim, and without round 0's glow it read
  // ~20 % darker than the old look in the bike lab's face close-up)
  m.aoNode = R.aoSky > 0 ? mix(mix(float(R.aoSky), float(R.aoSkin), isSkin), float(1), ao) : ao;  // the sky's light AND its reflection occluded in the creases
  m.roughnessNode = uRough.element(slot).add(D.g.sub(0.5).mul(0.8)).add(micro.mul(0.12)).clamp(0.04, 1);
  m.specularIntensityNode = uSpec.element(slot);
  m.sheenNode = base.mul(uSheen.element(slot));
  m.sheenRoughnessNode = float(0.55);
  // the eyes: a fixed catchlight (upper left, view space): a soft dot that always reads
  const Hc = vec3(-0.35, 0.45, 1).normalize().add(positionViewDirection).normalize();
  m.emissiveNode = vec3(1, 1, 1).mul(normalView.dot(Hc).clamp().pow(500).mul(0.7)).mul(isEyes);
  m.opacityNode = tex.a.mul(float(1).sub(uHide.element(slot)));
  m.userData.slots = slots; m.userData.uHide = uHide; m.userData.tex = tex; m.userData.look = round === 1 ? "r1" : "r2"; m.userData.uBump = uBump;
  if (urls.atlas && urls.atlas !== "none" && typeof window !== "undefined") {
    import("three/addons/loaders/KTX2Loader.js").then(({ KTX2Loader }) => {
      const ktx = new KTX2Loader().setTranscoderPath(TRANSCODER);
      if (renderer) ktx.detectSupport(renderer);
      let left = 3;
      const done = () => { if (--left === 0) ktx.dispose(); };
      const load = (url, node, srgb, wrap) => {
        if (!url) { done(); return; }
        ktx.load(url, (t) => {
          t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4;
          if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
          if (node) node.value = t; else { fx.value = t; fy.value = t; fz.value = t; }
          m.needsUpdate = true; done();
        }, undefined, (e) => { console.warn("[kid] look texture failed", url, e); done(); });
      };
      load(urls.atlas, tex, true, false);
      load(urls.detail, det, false, false);
      load(urls.fabric, null, false, true);
    });
  }
  return m;
}

/** after GLTFLoader: the LOD meshes found, one shared palette material, LOD1/2 hidden. atlas: the MPFB kid's KTX2 (URL);
 *  detail / fabric: the kid look's maps (KTX2 URLs); look: "old" = the atlas material before the look round */
export function prepareKid(gltf, { palette = KID_PALETTE, atlas = null, detail = null, fabric = null, renderer = null, look = KID_LOOK } = {}) {
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh && /kid_LOD\d/.test(o.name)) meshes.push(o); });
  meshes.sort((a, b) => a.name.localeCompare(b.name));
  if (!meshes.length) throw new Error("kid.glb: no kid_LOD meshes");
  const slots = meshes[0].geometry.userData?.slots || gltf.parser?.json?.meshes?.[0]?.extras?.slots || Object.keys(palette);
  const material = !atlas ? kidMaterial(slots, palette)
    : look === "old" ? kidAtlasMaterial(slots, atlas, renderer)
    : kidLookMaterial(slots, { atlas, detail: detail ?? atlas.replace(/_atlas\.ktx2$/, "_detail.ktx2"), fabric: fabric ?? atlas.replace(/[^/]*_atlas\.ktx2$/, "kid_fabric.ktx2") }, renderer, look === "r1" ? 1 : 2);
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
