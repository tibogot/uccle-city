// THE SHOP WINDOW (docs/assets/SHOPS.md): the glass of every shopfront, with the shop's INTERIOR behind it by interior
// mapping, no geometry. The interiors are Blender renders (tools/blender/shopInteriors.py -> textures/shops/
// interiors.ktx2): eight shop types (bakery, pharmacy, cafe, boutique, grocery, office, salon, shop), each a ROOM image
// (floor, ceiling, side and back walls in one perspective render: the "single texture" interior mapping) and a CARD
// image (the free-standing counter / tables / rails, alpha) drawn on a plane CARD_D in, in front of the room, so the
// counter slides against the shelves as you walk past. Per window: the room box is the render's 6 m room in METRES
// across the glass (at a per-shop offset; wide fronts get two rooms and a partition: viewer/shops/shopScale.js, rule
// shop-room-metric; ?shopscale=old = stretched to the glass's width) x 3 m (from the shop floor, iWinT.y below the
// glass's bottom edge) x the type's depth (3.5-6 m); the hit point is projected back with the render's own
// pinhole (F = 3 m in front of a 6 x 3 x 5 m room) -> the atlas cell of the shop's type (iWinT.x), mirrored per shop
// (iWinT.z). Mip level from the footprint ON THE GLASS (continuous across the room's wall seams: no seam lines).
// Glass: near-black, glossy (the street mirrored by the environment / SSR), the interior as emission x the shop light
// (day: dim behind the reflection; night: lit when open, from the opening hours), a fresnel hand-over at grazing angles.
// One draw per tile (the street-life window mesh), no light added (fixed light count).
// (shops3, rule shop-room-layers) V2 for the café / restaurant type: a KTX2 2D array (textures/shops/interiors_v2.ktx2,
// 16 layers: café / brasserie x day / night x L0 room, L1 mid card, L2 near card, L3 window display + the composite);
// the layers composited front to back within 40 m (4 fetches), the composite alone beyond (1 fetch), a cross-fade over
// 35-45 m; day / night bakes, closed = 10 % of the night bake + a security light. ?shopsv2=old = v1 everywhere.
import * as THREE from "three/webgpu";
import {
  attribute, uniform, texture, vec2, vec3, float, uv, positionWorld, positionLocal, cameraPosition, normalWorld, dot, max, min, abs,
  step, mix, clamp, select, fwidth, log2, pow, normalize, smoothstep, length, reflect, Fn, If, vec4, sin,
} from "three/tsl";
import { ktxLoader } from "../materials/scans.js";
import { RW, RD, RH, F, CARD_Y, DEPTH_BY_INDEX, OLD_DEPTH, STRETCH_MAX, V2, STICKERS, STICKER_PPM, V2_GAIN, V2_GAIN_OLD } from "./shopScale.js";

/** the viewer's room: ceiling height above the shop floor (= the render's room height: metric up) */
const CEIL = RH;
/** (shops1, rule shop-room-metric) ?shopscale=old: the room stretched over the glass (nx = hx / w), 4 m deep for every
 *  type, the old fresnel; default: the glass's x in metres on the 6 m room (shopScale.js) */
const SCALE_OLD = typeof location !== "undefined" && /[?&]shopscale=old(&|$)/.test(location.search);
/** (shops6) ?shopgain=old: every v2 room at the café's day / night gain (0.2 / 0.7); default: shopScale.js V2_GAIN */
const GAIN_OLD = typeof location !== "undefined" && /[?&]shopgain=old(&|$)/.test(location.search);
export const INTERIOR_TYPES = ["bakery", "pharmacy", "cafe", "boutique", "grocery", "office", "salon", "shop"];
/** (shops3, rule shop-room-layers) ?shopsv2=old: every window on the v1 atlas (the café's single room + one card) */
const V2_OFF = typeof location !== "undefined" && /[?&]shopsv2=old(&|$)/.test(location.search);

export const windowUniforms = {
  day: uniform(0.24),          // the interior's emission by day (the shop lit, seen behind the glass's reflection)
  nightOpen: uniform(1.0),     // at night when open
  reflect: uniform(1),         // glass specular
  card: uniform(1),            // the furniture card on / off (lab)
  mirror: uniform(1),          // the street-side reflection (sky / street) over the room
  // (fix4 item 3, ?shopnight=old = 0) at night a WHITE room (the boutique / office renders: Celio, Chaussee d'Alsemberg)
  // read as a blown-out white box next to the dark street (median 185 / 168 / 158 over the whole window): its bright
  // texels are toned down (x (1 - 0.8) above a luminance of ~0.75: median 186 -> 146) and the room takes the warm cast of shop
  // lamps (3000-3500 K), so the shelves and the floor read again; colourful rooms (pharmacy, grocery) barely change
  nightWhite: uniform(/[?&]shopnight=old(&|$)/.test(location.search) ? 0 : 0.8),
  nightWarm: uniform(/[?&]shopnight=old(&|$)/.test(location.search) ? 0 : 1),
  // v2: master scales on the baked day / night images' per-variant gains (shopScale.js V2_GAIN, shops6: each room
  // tuned to the same mean by day), the closed shop's share of the night bake and its security light, the layers on /
  // off (lab)
  dayV2: uniform(1),
  nightV2: uniform(1),
  closedV2: uniform(0.1),
  securityV2: uniform(1),
  layersV2: uniform(1),
  // (shops5) L4 glass dressing on / off (lab): the stickers + lace + blinds, the half-down shutter, the dirt
  dressV2: uniform(1),
  shutterV2: uniform(1),
  dirtV2: uniform(1),
  farV2: uniform(V2.FAR),      // the near / far hand-over distance (m; the lab moves it to look at the composite)
};

let texP = null;
/** the interiors. (shops5) v2 first: every type has its layered room, so when the two v2 arrays load the v1 atlas is
 *  not loaded at all (-10.7 MB GPU, -3.4 MB download); v1 (KTX2, or the WebP with ?shopsktx=0) only for ?shopsv2=old or
 *  when the arrays fail. flipV = 1 when v = 0 is the image's top. */
export function loadInteriors(renderer, base = new URL("../../", import.meta.url)) {
  return (texP ??= (async () => {
    const t0 = performance.now();
    const ktxOff = new URLSearchParams(location.search).get("shopsktx") === "0";
    // v2: (shops7) four arrays (shopScale.js V2_ARRAYS / V2_SLOT): A day L0 + the L4 sticker sheet, C day L3 +
    // composite (1024 px); N day L1 + L2, M night L0-L3 (512 px)
    let v2 = null;
    if (!V2_OFF && !ktxOff && renderer) {
      try {
        const arr = async (name, n, px) => {
          const t = await ktxLoader(renderer).loadAsync(new URL(`textures/shops/${name}`, base).href);
          const d = t.image?.depth ?? 1;
          if (!t.isCompressedArrayTexture || d !== n) throw new Error(`${name}: not a ${n}-layer array (${d})`);
          if (t.image.width !== px[0] || t.image.height !== px[1]) throw new Error(`${name}: ${t.image.width} x ${t.image.height}, want ${px.join(" x ")}`);
          t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; t.needsUpdate = true;
          return t;
        };
        const [tA, tC, tN, tM] = await Promise.all([arr("interiors_v2.ktx2", V2.LAYERS, V2.PX), arr("interiors_v2c.ktx2", V2.LAYERS_C, V2.PX),
          arr("interiors_v2n.ktx2", V2.LAYERS_N, V2.PXN), arr("interiors_v2m.ktx2", V2.LAYERS_M, V2.PXN)]);
        const bytes = (px, n) => Math.round(px[0] * px[1] * n * 4 / 3);
        v2 = { tex: tA, texC: tC, texN: tN, texM: tM, W: V2.PX[0], H: V2.PX[1], WN: V2.PXN[0], bytesGPU: bytes(V2.PX, V2.LAYERS + V2.LAYERS_C) + bytes(V2.PXN, V2.LAYERS_N + V2.LAYERS_M) };
      } catch (e) { console.warn(`[shops] interiors v2: ${e.message}; every window v1`); v2 = null; }
    }
    if (v2) return { tex: null, flipV: 1, format: "ktx2", W: 0, H: 0, v2, bytesGPU: v2.bytesGPU, ms: performance.now() - t0 };
    let tex = null, flipV = 0, format = "png";
    if (!ktxOff && renderer) {
      try {
        tex = await ktxLoader(renderer).loadAsync(new URL("textures/shops/interiors.ktx2", base).href);
        flipV = 1; format = "ktx2";
      } catch (e) { console.warn(`[shops] interiors.ktx2: ${e.message}; WebP instead`); tex = null; }
    }
    if (!tex) {
      tex = await new THREE.TextureLoader().loadAsync(new URL("textures/shops/interiors.webp", base).href);
      tex.flipY = true; flipV = 0;
      tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    const W = tex.image?.width ?? 4096, H = tex.image?.height ?? 2048;
    return { tex, flipV, format, W, H, v2: null, bytesGPU: format === "ktx2" ? Math.round(W * H * 4 / 3) : Math.round(W * H * 4 * 4 / 3), ms: performance.now() - t0 };
  })());
}

/**
 * the material of the street-life window mesh (viewer/streetlife/streetlife.js) when the shops are on; per instance:
 * iWin = (w, h, seed, lit), iWinC = (centre xyz, range), iWinT = (type 0..7, floor below the glass (m), mirror 0/1, 0)
 * night: the city's night value (streetUniforms.night), glow: its glow multiplier, shrink(c): the street life's
 * distance shrink, the shrunk vertex position (the quad collapses to its centre past its range: no pop)
 */
export function shopWindowMaterial(I, { night, glow, shrink }) {
  const U = windowUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const iWin = attribute("iWin", "vec4"), iWinT = attribute("iWinT", "vec4");
  const w = iWin.x, h = iWin.y, lit = iWin.w;
  const J = I.v2;                                                         // the v2 layers (null: every window v1)
  // the emission behind the glass, as one Fn: the v1 / v2 split and the v2 day / night / near / far choices are
  // branches (If), so a window pixel only fetches what it shows. The shared values are vars made BEFORE the branches
  // (a node first built inside one branch would be out of scope in the other), and so is fwidth (derivatives are only
  // legal in uniform control flow); every fetch in a branch has an explicit level.
  const insideNode = Fn(() => {
    const x0 = uv().x.mul(w).toVar(), y0 = uv().y.mul(h).toVar();
    // the view ray in the window's frame: across (+x), up, per metre INTO the shop
    const n = normalize(normalWorld);
    const ray = positionWorld.sub(cameraPosition);
    const inward = max(dot(ray, n).negate(), 0.02);
    const tx = vec3(n.z, 0, n.x.negate());
    const dx = dot(ray, tx).div(inward).toVar(), dy = ray.y.div(inward).toVar();
    const gb = iWinT.y.toVar(), yTop = float(CEIL).sub(gb), yBot = gb.negate();
    const type = iWinT.x.add(0.5).floor().toVar();
    // the room box across the glass (m, glass x): old = the glass itself (0 .. w, the render stretched over it); new =
    // 6 m rooms laid on the glass in metres (shopScale.js roomLayout): one at a per-shop offset o when the glass is
    // narrower than the room, else rooms side by side centred on the glass, partition walls where they meet, the odd
    // ones mirrored. k = the room the pixel's glass point opens into (the ray stays in it up to its hit, the card too).
    let xL, xR, roomW, D, flip;
    if (SCALE_OLD) {
      xL = float(0); xR = w; roomW = w; D = float(OLD_DEPTH); flip = iWinT.z.greaterThan(0.5);
    } else {
      // (= shopScale.js roomLayout: one room up to STRETCH_MAX x RW, stretched to the glass past RW; else 6 m rooms)
      const nR = max(w.div(RW * STRETCH_MAX).sub(1e-4).ceil(), 1), one = nR.lessThan(1.5);
      const hsh = iWin.z.mul(13.713).add(0.37).fract();                       // = shopScale.js offsetHash
      roomW = select(one, max(w, RW), float(RW));
      const o = select(one, hsh.mul(max(float(RW).sub(w), 0)), nR.mul(RW).sub(w).mul(0.5));
      const k = clamp(x0.add(o).div(roomW).floor(), 0, nR.sub(1));
      xL = k.mul(roomW).sub(o); xR = xL.add(roomW);
      // the room depth by type (shopScale.js DEPTH, 3.5-6 m): a select chain over the 8 types
      D = float(DEPTH_BY_INDEX[7]);
      for (let i = 6; i >= 0; i--) D = select(type.lessThan(i + 0.5), float(DEPTH_BY_INDEX[i]), D);
      flip = abs(iWinT.z.sub(k.mod(2))).greaterThan(0.5);                   // the shop's mirror flag XOR the odd room
    }
    xL = xL.toVar(); xR = xR.toVar(); roomW = roomW.toVar(); D = D.toVar();
    const flipF = select(flip, float(1), float(0)).toVar();
    const txh = select(dx.greaterThan(0), xR.sub(x0), x0.sub(xL)).div(max(abs(dx), 1e-4));
    const tyh = select(dy.greaterThan(0), yTop.sub(y0), y0.sub(yBot)).div(max(abs(dy), 1e-4));
    const t = min(min(txh, tyh), D).toVar();
    // the hit -> the render's normalized room coords -> its pinhole projection (the render's depth rd scaled to D)
    const proj = (tt, rd) => {
      const hx = x0.add(dx.mul(tt)), hy = y0.add(dy.mul(tt));
      let nx = hx.sub(xL).div(roomW).mul(2).sub(1);
      nx = select(flipF.greaterThan(0.5), nx.negate(), nx);
      const ny = hy.add(gb).div(CEIL).mul(2).sub(1);
      const s = float(1).div(float(1).add(tt.div(D).mul(typeof rd === "number" ? float(rd / F) : rd.div(F))));
      return vec2(nx.mul(s).mul(0.5).add(0.5), ny.mul(s).mul(0.5).add(0.5));
    };
    // mip level: the footprint on the GLASS (metres per pixel) x texels per metre at the front of the room (a cell is a
    // quarter of the atlas across the window's width), a little sharper for the deeper (smaller) surfaces
    const fw = max(fwidth(x0), fwidth(y0)).max(1e-5).toVar();
    const lod = clamp(log2(fw.mul(float(I.W / 4)).div(roomW).mul(0.8).max(1)), 0, 11).toVar();
    const out = vec3(0).toVar();
    const v1 = () => {
      const ruv = clamp(proj(t, RD), 0.001, 0.999);
      // the card: a plane CARD_D in (the render's CARD_Y scaled to the viewer's depth)
      const CARD_D = float(CARD_Y / RD).mul(D);
      const cuvRaw = proj(CARD_D, RD);
      const cIn = step(0, cuvRaw.x).mul(step(cuvRaw.x, 1)).mul(step(0, cuvRaw.y)).mul(step(cuvRaw.y, 1)).mul(step(CARD_D, t));
      const cuv = clamp(cuvRaw, 0.001, 0.999);
      // the atlas cell (rows from the bottom: rooms 0-1, cards 2-3), v flipped for KTX2
      const col = type.mod(4), row = type.div(4).floor();
      const cell = (q, r0) => {
        const v = r0.add(row).add(q.y).div(4);
        return vec2(col.add(q.x).div(4), select(float(I.flipV).greaterThan(0.5), float(1).sub(v), v));
      };
      const room = texture(I.tex, cell(ruv, float(0))).level(lod).rgb;
      const card = texture(I.tex, cell(cuv, float(2))).level(lod);
      const ca = card.a.mul(cIn).mul(U.card);
      const inside0 = mix(room, card.rgb, ca);
      const yIn = dot(inside0, vec3(0.2126, 0.7152, 0.0722));
      const inside = inside0.mul(float(1).sub(U.nightWhite.mul(night).mul(smoothstep(0.3, 0.75, yIn))))
        .mul(mix(vec3(1, 1, 1), vec3(1.0, 0.9, 0.76), U.nightWarm.mul(night).mul(0.6)));
      const light = mix(U.day, U.nightOpen.mul(mix(0.3, 1, lit)), night);
      out.assign(inside.mul(light));
    };
    if (!J) { v1(); return out; }
    // ---- v2 (rule shop-room-layers): the room (L0) and three cards (L1 2.6 m, L2 1.2 m, L3 the window display 0.3 m)
    // composited front to back, premultiplied: c = L3 + (1 - a3) (L2 + (1 - a2) (L1 + (1 - a1) L0)); a card is drawn
    // only where its plane is in front of the room's hit (step(d, t)). Beyond V2.FAR + V2.BAND one fetch: the
    // composite (the upper half of the L3 layer, half height). The arrays' rows are top first: t = 1 - v.
    // (shops5) every type: each variant's render is as deep as its type's room (rd = DEPTH by type: metric), the card
    // planes are absolute metres; the layers come from (shops7) four arrays (slot(): shopScale.js V2_SLOT), the 512 px
    // ones (the day mid and near cards, all the night layers) one mip less (lodN).
    const ALL_V2 = INTERIOR_TYPES.every((n) => V2.TYPES.includes(n)) || !I.tex;
    const isV2 = V2.TYPES.map((name) => type.equal(INTERIOR_TYPES.indexOf(name))).reduce((a, b) => a.or(b));
    let rd = float(DEPTH_BY_INDEX[7]);
    for (let i = 6; i >= 0; i--) rd = select(type.lessThan(i + 0.5), float(DEPTH_BY_INDEX[i]), rd);
    rd = rd.toVar();
    const ruv2 = clamp(proj(t, rd), 0.001, 0.999).toVar();
    const lod2 = clamp(log2(fw.mul(float(J.W)).div(roomW).mul(0.8).max(1)), 0, 10).toVar();
    const lodN = max(lod2.sub(1), 0).toVar();
    const vI = clamp(iWinT.w.add(0.5).floor(), 0, V2.VARIANTS.length - 1).toVar();
    const dist = length(cameraPosition.sub(positionWorld)).toVar();
    const fetchV2 = (T, q, layer, lv) => texture(T, q).depth(layer).level(lv);
    // [array, layer, level] of card k (0 L0 .. 3 L3 + composite) by day (light 0) / night (1) = shopScale.js V2_SLOT
    const slot = (light, k) => light ? [J.texM, vI.mul(4).add(k), lodN]
      : [[J.tex, vI, lod2], [J.texN, vI.mul(2), lodN], [J.texN, vI.mul(2).add(1), lodN], [J.texC, vI, lod2]][k];
    const cardAt = (light, k) => {                              // card k (1..3) at its plane, masked, premultiplied
      const d = float(V2.PLANES[k - 1]).div(rd).mul(D);
      const q = proj(d, rd);
      const vMax = k === 3 ? 0.499 : 1;                         // L3 lives in the lower half only
      const inside = step(0, q.x).mul(step(q.x, 1)).mul(step(0, q.y)).mul(step(q.y, vMax)).mul(step(d, t)).mul(U.layersV2);
      const qq = vec2(clamp(q.x, 0.001, 0.999), float(1).sub(clamp(q.y, 0.001, vMax)));
      const [T, layer, lv] = slot(light, k);
      return fetchV2(T, qq, layer, lv).mul(inside);
    };
    const nearV2 = (light) => {
      const [T0, l0, v0] = slot(light, 0);
      const c0 = fetchV2(T0, vec2(ruv2.x, float(1).sub(ruv2.y)), l0, v0).rgb;
      const c1 = cardAt(light, 1), c2 = cardAt(light, 2), c3 = cardAt(light, 3);
      return c3.rgb.add(float(1).sub(c3.a).mul(c2.rgb.add(float(1).sub(c2.a).mul(c1.rgb.add(float(1).sub(c1.a).mul(c0))))));
    };
    const farV2 = (light) => { const [T, layer, lv] = slot(light, 3); return fetchV2(T, vec2(ruv2.x, clamp(float(0.5).sub(ruv2.y.mul(0.5)), 0.004, 0.496)), layer, lv).rgb; };
    const wFar = smoothstep(U.farV2.sub(V2.BAND), U.farV2.add(V2.BAND), dist).toVar();
    const look = (light) => {                                   // near / far / the band between (a cross-fade: no pop)
      const c = vec3(0).toVar();
      If(wFar.lessThanEqual(0), () => { c.assign(nearV2(light)); })
        .ElseIf(wFar.greaterThanEqual(1), () => { c.assign(farV2(light)); })
        .Else(() => { c.assign(mix(nearV2(light), farV2(light), wFar)); });
      return c;
    };
    // the light: day = the day bake (sun patch + sky + the shop lights); night open = the night bake (lamps only);
    // night closed (iWin.w < 0.5: the opening hours end before 19:00) = the night bake at 10 % + a security light (a
    // cool glow and a green exit sign on the back wall). No light added: it is all emission.
    const open = step(0.5, lit).toVar();
    // (shops6) the variant's own day / night gain (shopScale.js V2_GAIN: a select chain on vI, like rd above)
    const gainOf = (tab, old) => {
      if (GAIN_OLD) return float(old);
      let g = float(tab[V2.VARIANTS[V2.VARIANTS.length - 1]]);
      for (let i = V2.VARIANTS.length - 2; i >= 0; i--) g = select(vI.lessThan(i + 0.5), float(tab[V2.VARIANTS[i]]), g);
      return g;
    };
    const gDay = gainOf(V2_GAIN.day, V2_GAIN_OLD.day).mul(U.dayV2).toVar(), gNight = gainOf(V2_GAIN.night, V2_GAIN_OLD.night).mul(U.nightV2).toVar();
    const dayC = () => look(0).mul(gDay);
    const nightC = () => {
      const c = look(1);
      const glowSec = vec3(0.35, 0.55, 0.75).mul(0.05).mul(smoothstep(0.32, 0.0, length(ruv2.sub(vec2(0.5, 0.62)).mul(vec2(1, 1.6)))));
      const exitSign = vec3(0.05, 0.9, 0.3).mul(0.6).mul(step(abs(ruv2.x.sub(0.628)), 0.009)).mul(step(abs(ruv2.y.sub(0.6)), 0.007)).mul(step(D.mul(0.95), t));
      return mix(c.mul(U.closedV2).add(glowSec.add(exitSign).mul(U.securityV2)), c.mul(gNight), open);
    };
    const room = () => {
      If(night.lessThanEqual(0.001), () => { out.assign(dayC()); })
        .ElseIf(night.greaterThanEqual(0.999), () => { out.assign(nightC()); })
        .Else(() => { out.assign(mix(dayC(), nightC(), night)); });
    };
    if (ALL_V2) room();
    else If(isV2.not(), () => { v1(); }).Else(room);
    // ---- L4, the glass dressing (shops5, rule shop-room-layers): stickers on the glass's inner face from the sticker
    // sheet (array A's last layer, tools/shops/stickers.py), ONE fetch a pixel, within V2.FAR + V2.BAND only
    // (faded over the band). Per shop by hashes of the window seed: the opening-hours vinyl (75 %) and the payment marks
    // (60 %) at one end at eye height, a promo sign at the other end (OUVERT / GEOPEND / SOLDES / SOLDEN / NOUVEAU /
    // WELKOM by type; taken in on a closed shop at night), a lace café curtain along the bottom (cafés, bakeries: 45 %).
    // The zones never overlap, so the pixel's cell is a select chain, not several fetches. The blinds, the half-down
    // shutter and the dirt are procedural (glassDress below: no fetch).
    If(U.dressV2.greaterThan(0).and(wFar.lessThan(1)), () => {
      const S = STICKERS, PPM = STICKER_PPM;
      const hsh = (k, c) => iWin.z.mul(k).add(c).fract();
      const cell = (n) => vec4(...S[n]);
      const end = hsh(17.13, 0.11).greaterThan(0.5);
      const pick2 = hsh(31.1, 0.7).lessThan(0.5);
      const tIs = (...names) => names.map((nm) => type.equal(INTERIOR_TYPES.indexOf(nm))).reduce((a2, b2) => a2.or(b2));
      // the hours + payment column at one end, the promo slot at the other
      const hW = S.hoursFR[2] / PPM, hH = S.hoursFR[3] / PPM, pW = S.pay[2] / PPM, pH = S.pay[3] / PPM;
      const colX = select(end, w.sub(0.12 + hW), float(0.12));
      const hY = float(1.22).sub(gb), pY = float(1.08).sub(gb);
      const hoursOn = hsh(23.7, 0.31).lessThan(0.75), payOn = hsh(41.3, 0.17).lessThan(0.6);
      const k3 = hsh(53.9, 0.43).mul(3).floor();
      const shopG = tIs("boutique", "shop"), foodG = tIs("cafe", "bakery");
      const pc = (a3, b3, c3) => select(k3.lessThan(0.5), cell(a3), select(k3.lessThan(1.5), cell(b3), cell(c3)));
      const promoC = select(shopG, pc("sale", "saleNL", "newFR"), select(foodG, pc("open", "openBI", "welcome"), pc("openBI", "welcome", "newFR"))).toVar();
      const prW = promoC.z.div(PPM), prH = promoC.w.div(PPM);
      const prP = select(tIs("boutique"), float(0.6), select(tIs("shop"), float(0.35), float(0.4)));
      const promoOn = hsh(61.7, 0.29).lessThan(prP).and(w.greaterThan(prW.add(hW).add(0.5)));
      const prX = select(end, float(0.15), w.sub(prW).sub(0.15)), prY = float(1.62).sub(gb);
      const laceTop = float(1.0).sub(gb);
      const laceOn = foodG.and(hsh(71.3, 0.53).lessThan(0.45)).and(laceTop.greaterThan(0.25));
      const inR = (X, Y, RWm, RHm) => x0.greaterThanEqual(X).and(x0.lessThanEqual(X.add(RWm))).and(y0.greaterThanEqual(Y)).and(y0.lessThanEqual(Y.add(RHm)));
      const zH = hoursOn.and(inR(colX, hY, float(hW), float(hH)));
      const zP = payOn.and(inR(colX, pY, float(pW), float(pH)));
      const zR = promoOn.and(inR(prX, prY, prW, prH));
      const zL = laceOn.and(y0.lessThanEqual(laceTop));
      If(zH.or(zP).or(zR).or(zL), () => {
        // the pixel's cell (px rect) and its local (u, v from the top)
        const px = select(zH, select(pick2, cell("hoursFR"), cell("hoursBI")), select(zP, select(pick2, cell("pay"), cell("pay2")), select(zR, promoC, cell("lace"))));
        const X = select(zH.or(zP), colX, select(zR, prX, float(0))), Y = select(zH, hY, select(zP, pY, select(zR, prY, float(0))));
        const Wm = px.z.div(PPM), Hm = select(zL, laceTop, px.w.div(PPM));
        const u = select(zL, x0.mul(PPM / S.lace[2]).fract(), x0.sub(X).div(Wm));
        const v = float(1).sub(y0.sub(Y).div(Hm));
        const q = vec2(px.x.add(clamp(u, 0.004, 0.996).mul(px.z)).div(V2.PX[0]), px.y.add(clamp(v, 0.004, 0.996).mul(px.w)).div(V2.PX[1]));
        const lodS = clamp(log2(fw.mul(PPM).max(1)), 0, 9);
        const st = fetchV2(J.tex, q, float(V2.STICKER_LAYER), lodS);
        // faded beyond FAR; a promo sign taken in on a closed shop at night; the lace lets 45 % of the room through
        const fade = float(1).sub(wFar).mul(select(zR, mix(float(1), open, night), float(1)));
        const kOp = select(zL, float(0.55), float(1));
        const lumIn = dot(out, vec3(0.2126, 0.7152, 0.0722));
        const litS = mix(float(0.16), lumIn.mul(0.7).add(0.004), night);          // the vinyl: daylight / backlit by the room
        out.assign(out.mul(float(1).sub(st.a.mul(fade).mul(kOp).mul(U.dressV2))).add(st.rgb.mul(fade).mul(litS).mul(U.dressV2)));
      });
    });
    return out;
  })();
  // the glass: a street-side mirror (sky above the horizon, the street's grey below, mostly at grazing views) over the
  // room; by day the reflection carries the glass, at night the lit room does (Schlick-like, with a floor: shop glass
  // reflects ~10 % even head-on)
  const n = normalize(normalWorld);
  const view = normalize(cameraPosition.sub(positionWorld));
  // (shops1) the grazing part raised a little (Forza Horizon 4's shop glass: the street takes over sooner as you walk
  // along a front): exponent 4 -> 3 (at 70 deg from the normal 0.27 -> 0.36, at 80 deg 0.52 -> 0.61); old = 4.
  // (shops3) v2 windows a little more (exponent 2.5: 70 deg 0.42, 80 deg 0.66): the layered room reads as being
  // BEHIND the glass when the reflection takes over sooner at grazing views
  const cosV = clamp(float(1).sub(abs(dot(view, n))), 0, 1);
  const isV2w = J ? V2.TYPES.map((name) => iWinT.x.add(0.5).floor().equal(INTERIOR_TYPES.indexOf(name))).reduce((a, b) => a.or(b)) : null;
  const expo = SCALE_OLD ? float(4) : (J ? select(isV2w, float(2.5), float(3)) : float(3));
  const fres = float(0.1).add(float(0.9).mul(pow(cosV, expo)));
  const rv = reflect(view.negate(), n);
  const sky = mix(vec3(0.07, 0.07, 0.072), vec3(0.42, 0.5, 0.6), smoothstep(-0.05, 0.4, rv.y));
  const glassCol = vec3(0.004, 0.0045, 0.005);
  m.specularIntensityNode = U.reflect;
  const mirror = sky.mul(fres).mul(U.mirror).mul(float(1).sub(night.mul(0.85)));
  if (!J) {
    m.colorNode = glassCol;
    m.roughnessNode = float(0.03);
    m.metalnessNode = float(0);
    m.emissiveNode = insideNode.mul(float(1).sub(fres)).add(mirror).mul(glow);
  } else {
    // ---- L4, the procedural glass dressing (shops5, no fetch): a roller shutter half down on a shop closed at night
    // (it rolls down with the dusk: 42-62 % of the glass, galvanised slats, a bottom bar; lit by the street lights as a
    // surface, the glass's mirror gone where it is), venetian blinds let down at the top of some offices / pharmacies /
    // salons (35 %: 0.25-0.7 m, never below 1.95 m), light dirt (a grime band along the sill and the jambs, streaked).
    // The slats fade to their mean where they are finer than ~2 pixels (no moiré far away).
    const gx = uv().x.mul(w), gy = uv().y.mul(h), gbw = iWinT.y, gtype = iWinT.x.add(0.5).floor();
    const hs = (k, c) => iWin.z.mul(k).add(c).fract();
    const fwg = max(fwidth(gx), fwidth(gy)).max(1e-5);
    const slats = (pitch, edge) => {
      const f = gy.div(pitch).fract();
      const ln = smoothstep(0, edge, f).mul(smoothstep(1, 1 - edge, f));
      return mix(ln, float(1 - edge), clamp(fwg.div(pitch).mul(2).sub(0.5), 0, 1));
    };
    const shutDrop = h.mul(hs(83.1, 0.2).mul(0.2).add(0.42)).mul(smoothstep(0.35, 0.75, night)).mul(float(1).sub(step(0.5, lit))).mul(U.shutterV2);
    const shut = step(h.sub(shutDrop), gy).mul(step(0.001, shutDrop)).toVar();
    const bar = step(gy, h.sub(shutDrop).add(0.05));
    const shAlb = mix(vec3(0.34, 0.35, 0.36).mul(mix(float(0.55), float(1), slats(0.075, 0.18))), vec3(0.06, 0.06, 0.065), bar);
    const tB = (...names) => names.map((nm) => gtype.equal(INTERIOR_TYPES.indexOf(nm))).reduce((a, b) => a.or(b));
    const blindDrop = clamp(hs(97.3, 0.61).mul(0.45).add(0.25), 0, max(h.sub(float(1.95).sub(gbw)), 0));
    const blind = select(tB("office", "pharmacy", "salon").and(hs(91.7, 0.37).lessThan(0.35)), step(h.sub(blindDrop), gy), float(0)).mul(U.dressV2).toVar();
    const blAlb = vec3(0.8, 0.8, 0.78).mul(mix(float(0.7), float(1), slats(0.025, 0.12)));
    const edge = min(gx, w.sub(gx));
    const dirt = smoothstep(0.3, 0, gy).mul(0.7).add(smoothstep(0.12, 0, edge).mul(0.4))
      .mul(sin(gx.mul(7.3).add(iWin.z.mul(40))).mul(sin(gx.mul(2.1).add(gy.mul(3.7)))).mul(0.25).add(0.75))
      .mul(hs(101.1, 0.77).mul(0.5).add(0.25)).mul(U.dirtV2).toVar();
    const cover = max(shut, blind.mul(0.88)).toVar();
    const alb = select(shut.greaterThan(0.5), shAlb, blAlb);
    m.colorNode = mix(mix(glassCol, vec3(0.16, 0.15, 0.13), dirt.mul(0.35)), alb, cover);
    m.roughnessNode = mix(mix(float(0.03), float(0.22), dirt), select(shut.greaterThan(0.5), float(0.55), float(0.7)), cover);
    m.metalnessNode = shut.mul(0.35);
    const ins = insideNode.toVar();
    const lumIn = dot(ins, vec3(0.2126, 0.7152, 0.0722));
    const leak = blAlb.mul(lumIn.mul(0.35)).mul(blind).mul(float(1).sub(shut));      // the blinds glow from the room behind
    m.emissiveNode = ins.mul(float(1).sub(fres)).mul(float(1).sub(cover)).mul(float(1).sub(dirt.mul(0.25))).add(leak)
      .add(mirror.mul(float(1).sub(shut))).mul(glow);
  }
  m.positionNode = shrink(attribute("iWinC", "vec4"));
  m.name = "shops-window";
  m.userData.shared = true;
  return m;
}
