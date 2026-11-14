// THE SHOP WINDOW (docs/assets/SHOPS.md): the glass of every shopfront, with the shop's INTERIOR behind it by interior
// mapping, no geometry. The interiors are Blender renders (tools/blender/shopInteriors.py -> textures/shops/
// interiors.ktx2): eight shop types (bakery, pharmacy, cafe, boutique, grocery, office, salon, shop), each a ROOM image
// (floor, ceiling, side and back walls in one perspective render: the "single texture" interior mapping) and a CARD
// image (the free-standing counter / tables / rails, alpha) drawn on a plane CARD_D in, in front of the room, so the
// counter slides against the shelves as you walk past. Per window: the room box is the glass's width x 3 m (from the
// shop floor, iWinT.y below the glass's bottom edge) x 4 m deep; the hit point is projected back with the render's own
// pinhole (F = 3 m in front of a 6 x 3 x 5 m room) -> the atlas cell of the shop's type (iWinT.x), mirrored per shop
// (iWinT.z). Mip level from the footprint ON THE GLASS (continuous across the room's wall seams: no seam lines).
// Glass: near-black, glossy (the street mirrored by the environment / SSR), the interior as emission x the shop light
// (day: dim behind the reflection; night: lit when open, from the opening hours), a fresnel hand-over at grazing angles.
// One draw per tile (the street-life window mesh), no light added (fixed light count).
import * as THREE from "three/webgpu";
import {
  attribute, uniform, texture, vec2, vec3, float, uv, positionWorld, positionLocal, cameraPosition, normalWorld, dot, max, min, abs,
  step, mix, clamp, select, fwidth, log2, pow, normalize, smoothstep, length, reflect,
} from "three/tsl";
import { ktxLoader } from "../materials/scans.js";

/** render geometry (shopInteriors.py): room 6 x 3 x 5 m, camera F in front, the card plane CARD_Y in */
const RW = 6, RD = 5, F = 3, CARD_Y = 1.4;
/** the viewer's room: depth (m) into the shop, ceiling height above the shop floor */
const D = 4.0, CEIL = 3.0;
export const INTERIOR_TYPES = ["bakery", "pharmacy", "cafe", "boutique", "grocery", "office", "salon", "shop"];

export const windowUniforms = {
  day: uniform(0.24),          // the interior's emission by day (the shop lit, seen behind the glass's reflection)
  nightOpen: uniform(1.0),     // at night when open
  reflect: uniform(1),         // glass specular
  card: uniform(1),            // the furniture card on / off (lab)
  mirror: uniform(1),          // the street-side reflection (sky / street) over the room
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
    return { tex, flipV, format, W, H, bytesGPU: format === "ktx2" ? Math.round(W * H * 4 / 3) : Math.round(W * H * 4 * 4 / 3), ms: performance.now() - t0 };
  })());
}

/**
 * the material of the street-life window mesh (viewer/streetlife/streetlife.js) when the shops are on; per instance:
 * iWin = (w, h, seed, lit), iWinC = (centre xyz, range), iWinT = (type 0..7, floor below the glass (m), mirror 0/1, 0)
 * night: the city's night value (streetUniforms.night), glow: its glow multiplier, shrink(c): the street life's
 * distance shrink (the quad collapses past its range: no pop, nothing drawn beyond)
 */
export function shopWindowMaterial(I, { night, glow, shrink }) {
  const U = windowUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const iWin = attribute("iWin", "vec4"), iWinT = attribute("iWinT", "vec4");
  const w = iWin.x, h = iWin.y, lit = iWin.w;
  const x0 = uv().x.mul(w), y0 = uv().y.mul(h);
  // the view ray in the window's frame: across (+x), up, per metre INTO the shop
  const n = normalize(normalWorld);
  const ray = positionWorld.sub(cameraPosition);
  const inward = max(dot(ray, n).negate(), 0.02);
  const tx = vec3(n.z, 0, n.x.negate());
  const dx = dot(ray, tx).div(inward), dy = ray.y.div(inward);
  const gb = iWinT.y, yTop = float(CEIL).sub(gb), yBot = gb.negate();
  const txh = select(dx.greaterThan(0), w.sub(x0), x0).div(max(abs(dx), 1e-4));
  const tyh = select(dy.greaterThan(0), yTop.sub(y0), y0.sub(yBot)).div(max(abs(dy), 1e-4));
  const t = min(min(txh, tyh), float(D));
  // the hit -> the render's normalized room coords -> its pinhole projection
  const K = float(RD / F);
  const proj = (tt) => {
    const hx = x0.add(dx.mul(tt)), hy = y0.add(dy.mul(tt));
    let nx = hx.div(w).mul(2).sub(1);
    nx = select(iWinT.z.greaterThan(0.5), nx.negate(), nx);
    const ny = hy.add(gb).div(CEIL).mul(2).sub(1);
    const s = float(1).div(float(1).add(tt.div(D).mul(K)));
    return vec2(nx.mul(s).mul(0.5).add(0.5), ny.mul(s).mul(0.5).add(0.5));
  };
  const ruv = clamp(proj(t), 0.001, 0.999);
  // the card: a plane CARD_D in (the render's CARD_Y scaled to the viewer's depth)
  const CARD_D = float(CARD_Y / RD * D);
  const cuvRaw = proj(CARD_D);
  const cIn = step(0, cuvRaw.x).mul(step(cuvRaw.x, 1)).mul(step(0, cuvRaw.y)).mul(step(cuvRaw.y, 1)).mul(step(CARD_D, t));
  const cuv = clamp(cuvRaw, 0.001, 0.999);
  // the atlas cell (rows from the bottom: rooms 0-1, cards 2-3), v flipped for KTX2
  const type = iWinT.x.add(0.5).floor();
  const col = type.mod(4), row = type.div(4).floor();
  const cell = (q, r0) => {
    const v = r0.add(row).add(q.y).div(4);
    return vec2(col.add(q.x).div(4), select(float(I.flipV).greaterThan(0.5), float(1).sub(v), v));
  };
  // mip level: the footprint on the GLASS (metres per pixel) x texels per metre at the front of the room (a cell is a
  // quarter of the atlas across the window's width), a little sharper for the deeper (smaller) surfaces
  const fw = max(fwidth(x0), fwidth(y0)).max(1e-5);
  const texPerPx = fw.mul(float(I.W / 4)).div(w);
  const lod = clamp(log2(texPerPx.mul(0.8).max(1)), 0, 11);
  const room = texture(I.tex, cell(ruv, float(0))).level(lod).rgb;
  const card = texture(I.tex, cell(cuv, float(2))).level(lod);
  const ca = card.a.mul(cIn).mul(U.card);
  const inside = mix(room, card.rgb, ca);
  // the glass: a street-side mirror (sky above the horizon, the street's grey below, mostly at grazing views) over the
  // room; by day the reflection carries the glass, at night the lit room does (Schlick-like, with a floor: shop glass
  // reflects ~10 % even head-on)
  const view = normalize(cameraPosition.sub(positionWorld));
  const fres = float(0.1).add(float(0.9).mul(pow(clamp(float(1).sub(abs(dot(view, n))), 0, 1), 4)));
  const rv = reflect(view.negate(), n);
  const sky = mix(vec3(0.07, 0.07, 0.072), vec3(0.42, 0.5, 0.6), smoothstep(-0.05, 0.4, rv.y));
  const light = mix(U.day, U.nightOpen.mul(mix(0.3, 1, lit)), night);
  m.colorNode = vec3(0.004, 0.0045, 0.005);
  m.roughnessNode = float(0.03);
  m.metalnessNode = float(0);
  m.specularIntensityNode = U.reflect;
  const mirror = sky.mul(fres).mul(U.mirror).mul(float(1).sub(night.mul(0.85)));
  m.emissiveNode = inside.mul(light).mul(float(1).sub(fres)).add(mirror).mul(glow);
  m.positionNode = positionLocal.mul(shrink(attribute("iWinC", "vec4")));
  m.name = "shops-window";
  m.userData.shared = true;
  return m;
}
