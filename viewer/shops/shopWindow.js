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
  step, mix, clamp, select, fwidth, log2, pow, normalize, smoothstep, length, reflect, Fn, If,
} from "three/tsl";
import { ktxLoader } from "../materials/scans.js";
import { RW, RD, RH, F, CARD_Y, DEPTH_BY_INDEX, OLD_DEPTH, STRETCH_MAX, V2 } from "./shopScale.js";

/** the viewer's room: ceiling height above the shop floor (= the render's room height: metric up) */
const CEIL = RH;
/** (shops1, rule shop-room-metric) ?shopscale=old: the room stretched over the glass (nx = hx / w), 4 m deep for every
 *  type, the old fresnel; default: the glass's x in metres on the 6 m room (shopScale.js) */
const SCALE_OLD = typeof location !== "undefined" && /[?&]shopscale=old(&|$)/.test(location.search);
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
  // v2 (café / restaurant): the baked day / night images' gains (the day bake has its own sun and sky: brighter than
  // the v1 room x 0.24), the closed shop's share of the night bake and its security light, the layers on / off (lab)
  dayV2: uniform(0.2),
  nightV2: uniform(0.7),
  closedV2: uniform(0.1),
  securityV2: uniform(1),
  layersV2: uniform(1),
  farV2: uniform(V2.FAR),      // the near / far hand-over distance (m; the lab moves it to look at the composite)
};

let texP = null;
/** the atlas: KTX2 (UASTC -> BC7 / ASTC, 1 byte a texel) or the WebP (?shopsktx=0); flipV = 1 when v = 0 is the image's top */
export function loadInteriors(renderer, base = new URL("../../", import.meta.url)) {
  return (texP ??= (async () => {
    const t0 = performance.now();
    const ktxOff = new URLSearchParams(location.search).get("shopsktx") === "0";
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
    // v2: the café / restaurant layers, a KTX2 2D ARRAY (CompressedArrayTexture; no WebP twin: without it, or with
    // ?shopsktx=0 / ?shopsv2=old, the cafés stay on the v1 atlas)
    let v2 = null;
    if (!V2_OFF && !ktxOff && renderer && format === "ktx2") {
      try {
        const t2 = await ktxLoader(renderer).loadAsync(new URL("textures/shops/interiors_v2.ktx2", base).href);
        const n = t2.image?.depth ?? 1;
        if (!t2.isCompressedArrayTexture || n !== V2.LAYERS) throw new Error(`not a ${V2.LAYERS}-layer array (${n})`);
        t2.colorSpace = THREE.SRGBColorSpace; t2.wrapS = t2.wrapT = THREE.ClampToEdgeWrapping; t2.anisotropy = 8; t2.needsUpdate = true;
        const w2 = t2.image.width, h2 = t2.image.height;
        v2 = { tex: t2, W: w2, H: h2, layers: n, bytesGPU: Math.round(w2 * h2 * n * 4 / 3) };
      } catch (e) { console.warn(`[shops] interiors_v2.ktx2: ${e.message}; the cafes stay v1`); v2 = null; }
    }
    return { tex, flipV, format, W, H, v2, bytesGPU: (format === "ktx2" ? Math.round(W * H * 4 / 3) : Math.round(W * H * 4 * 4 / 3)) + (v2?.bytesGPU ?? 0), ms: performance.now() - t0 };
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
      const s = float(1).div(float(1).add(tt.div(D).mul(rd / F)));
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
    // composite (the upper half of the L3 layer, half height). The array's rows are top first: t = 1 - v.
    const isV2 = V2.TYPES.map((name) => type.equal(INTERIOR_TYPES.indexOf(name))).reduce((a, b) => a.or(b));
    const ruv2 = clamp(proj(t, V2.RD), 0.001, 0.999).toVar();
    const lod2 = clamp(log2(fw.mul(float(J.W)).div(roomW).mul(0.8).max(1)), 0, 10).toVar();
    const base = clamp(iWinT.w.add(0.5).floor(), 0, V2.VARIANTS.length - 1).mul(8).toVar();
    const dist = length(cameraPosition.sub(positionWorld)).toVar();
    const fetchV2 = (q, layer) => texture(J.tex, q).depth(layer).level(lod2);
    const cardAt = (k, lo) => {                                 // card k (1..3) at its plane, masked, premultiplied
      const d = float(V2.PLANES[k - 1] / V2.RD).mul(D);
      const q = proj(d, V2.RD);
      const vMax = k === 3 ? 0.499 : 1;                         // L3 lives in the lower half only
      const inside = step(0, q.x).mul(step(q.x, 1)).mul(step(0, q.y)).mul(step(q.y, vMax)).mul(step(d, t)).mul(U.layersV2);
      const qq = vec2(clamp(q.x, 0.001, 0.999), float(1).sub(clamp(q.y, 0.001, vMax)));
      return fetchV2(qq, base.add(lo + k)).mul(inside);
    };
    const nearV2 = (lo) => {
      const c0 = fetchV2(vec2(ruv2.x, float(1).sub(ruv2.y)), base.add(lo)).rgb;
      const c1 = cardAt(1, lo), c2 = cardAt(2, lo), c3 = cardAt(3, lo);
      return c3.rgb.add(float(1).sub(c3.a).mul(c2.rgb.add(float(1).sub(c2.a).mul(c1.rgb.add(float(1).sub(c1.a).mul(c0))))));
    };
    const farV2 = (lo) => fetchV2(vec2(ruv2.x, clamp(float(0.5).sub(ruv2.y.mul(0.5)), 0.004, 0.496)), base.add(lo + 3)).rgb;
    const wFar = smoothstep(U.farV2.sub(V2.BAND), U.farV2.add(V2.BAND), dist).toVar();
    const look = (lo) => {                                      // near / far / the band between (a cross-fade: no pop)
      const c = vec3(0).toVar();
      If(wFar.lessThanEqual(0), () => { c.assign(nearV2(lo)); })
        .ElseIf(wFar.greaterThanEqual(1), () => { c.assign(farV2(lo)); })
        .Else(() => { c.assign(mix(nearV2(lo), farV2(lo), wFar)); });
      return c;
    };
    // the light: day = the day bake (sun patch + sky + the shop lights); night open = the night bake (lamps only);
    // night closed (iWin.w < 0.5: the opening hours end before 19:00) = the night bake at 10 % + a security light (a
    // cool glow and a green exit sign on the back wall). No light added: it is all emission.
    const open = step(0.5, lit).toVar();
    const dayC = () => look(0).mul(U.dayV2);
    const nightC = () => {
      const c = look(4);
      const glowSec = vec3(0.35, 0.55, 0.75).mul(0.05).mul(smoothstep(0.32, 0.0, length(ruv2.sub(vec2(0.5, 0.62)).mul(vec2(1, 1.6)))));
      const exitSign = vec3(0.05, 0.9, 0.3).mul(0.6).mul(step(abs(ruv2.x.sub(0.628)), 0.009)).mul(step(abs(ruv2.y.sub(0.6)), 0.007)).mul(step(D.mul(0.95), t));
      return mix(c.mul(U.closedV2).add(glowSec.add(exitSign).mul(U.securityV2)), c.mul(U.nightV2), open);
    };
    If(isV2.not(), () => { v1(); })
      .ElseIf(night.lessThanEqual(0.001), () => { out.assign(dayC()); })
      .ElseIf(night.greaterThanEqual(0.999), () => { out.assign(nightC()); })
      .Else(() => { out.assign(mix(dayC(), nightC(), night)); });
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
  m.colorNode = vec3(0.004, 0.0045, 0.005);
  m.roughnessNode = float(0.03);
  m.metalnessNode = float(0);
  m.specularIntensityNode = U.reflect;
  const mirror = sky.mul(fres).mul(U.mirror).mul(float(1).sub(night.mul(0.85)));
  m.emissiveNode = insideNode.mul(float(1).sub(fres)).add(mirror).mul(glow);
  m.positionNode = shrink(attribute("iWinC", "vec4"));
  m.name = "shops-window";
  m.userData.shared = true;
  return m;
}
