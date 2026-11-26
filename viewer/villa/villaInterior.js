// THE VILLA'S INTERIOR CELL (tools/blender/villa.py -> models/villa/interior.glb + interior.json), streamed in by
// viewer/villa/villaCity.js within ~30 m. Built like viewer/stalleInterior.js, with no lightmap at all:
//   - every surface is in a NAMED slot (plaster_white, oak_plank, walnut, marble_white, stone_floor, fabric_white,
//     fabric_grey, leather, brass, metal_black, glow, plant, glass_window); its colour / pattern is TSL here, its light
//     the Cycles bakes PER CORNER (_lsky / _lsun / _lnight, RGBM uint8): sky, sun and the night lamps mixed by the city's
//     light (lighting.js env). Unlit materials (the baked light is the light): no runtime light, no shadow map (rule
//     fixed-light-count); one draw per slot per node (Cell, Soft) + the glass;
//   - the glass (curtain walls, balustrades) is a transparent double-sided material that FADES IN from the exterior's
//     opaque far glass over ~1.2 s after the cell shows (no pop: the far glass is hidden only once the cell's glass is
//     as opaque as it); the walls' outsides, the mullions and the roofs stay the exterior model's;
//   - colliders (Collider node: floors, the stair's treads, partitions, furniture, the pool's floor and steps) for the
//     third-person walker; inside(p) for the house; the ambient-cube probes light the walker inside (no GPU bake).
import * as THREE from "three/webgpu";
import {
  attribute, uv, vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min, uniform, Fn, select,
  normalWorld, positionWorld, cameraPosition, reflect, pow, time, fwidth, texture, dFdx, dFdy, cross, inverseSqrt, int, normalize, length, atan, acos,
} from "three/tsl";
import { ktxLoader } from "../materials/scans.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "../lighting.js";
import { GLASS_V3, glassLook, nearGlassMaterial, VILLA_DIR } from "./villaGlass.js";

export const VILLA_IN_SLOTS = ["plaster_white", "oak_plank", "walnut", "marble_white", "stone_floor", "fabric_white", "fabric_grey", "leather", "brass",
  "metal_black", "glow", "plant", "ceramic_white", "books", "art", "glass_window"];
const CODES = ["plain", "reveal", "plinth", "coping", "step", "slat", "frame", "door", "soffit", "roof", "garage", "led", "fire", "screen", "channel", "rug"];
const C = Object.fromEntries(CODES.map((n, i) => [n, i]));

/** live look: the bakes' gains, the eye adaptation inside, the glass fade-in, debug views (0 final, 1 light, 2 albedo) */
export const villaInLook = {
  dayGain: uniform(0.9), sunGain: uniform(0.8), nightGain: uniform(0.85), adapt: uniform(1), adaptInside: 3.2, adaptNight: 1.6,
  glassIn: uniform(1), dayOverride: uniform(-1), view: uniform(0), warm: uniform(new THREE.Color(1.04, 0.99, 0.93)),
};

const rgbm = (c) => { const v = c.rgb.mul(c.a).mul(4.0); return v.mul(v); };
const codeF = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (k) => float(1).sub(clamp(abs(codeF().sub(k)), 0, 1));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u2 = f.mul(f).mul(float(3).sub(f.mul(2)));
  return mix(mix(hash2(i), hash2(i.add(vec2(1, 0))), u2.x), mix(hash2(i.add(vec2(0, 1))), hash2(i.add(vec2(1, 1))), u2.x), u2.y);
};
const nightK = () => select(villaInLook.dayOverride.greaterThanEqual(0), float(1).sub(villaInLook.dayOverride), env.uNight);
function bakedLight() {
  const n = nightK(), day = float(1).sub(n);
  const sunUp = smoothstep(0.02, 0.15, env.uSunDir.y);
  const sky = rgbm(attribute("_lsky", "vec4")), sun = rgbm(attribute("_lsun", "vec4")), night = rgbm(attribute("_lnight", "vec4"));
  return sky.mul(villaInLook.dayGain.mul(day)).add(sun.mul(villaInLook.sunGain.mul(day).mul(sunUp)).mul(vec3(env.uSunColor)))
    .add(night.mul(villaInLook.nightGain.mul(n))).mul(villaInLook.adapt).mul(vec3(villaInLook.warm));
}

/** the slots' albedo (linear) from UV0 (metres) and the face code */
const ALBEDO = {
  plaster_white: () => lin(0xeeebe5).mul(vnoise(uv().mul(4.0)).mul(0.03).add(0.985)),
  // wide-plank oak (22 cm x 2.2 m, staggered), a grain along the plank, soft seams
  oak_plank: () => Fn(() => {
    const w = uv().toVar();
    const row = floor(w.y.div(0.22)).toVar();
    const off = hash2(vec2(row, 7.0)).mul(2.2);
    const col = floor(w.x.add(off).div(2.2));
    const h = hash2(vec2(row, col)).toVar();
    const grain = vnoise(vec2(w.x.mul(3.0), w.y.mul(90.0).add(h.mul(13.0)))).mul(0.5).add(vnoise(vec2(w.x.mul(18.0), w.y.mul(260.0))).mul(0.2));
    // (round 1 look: warm mid oak, low plank-to-plank contrast: the first pass read orange and stripy)
    const base = mix(lin(0x5e5246), lin(0x74624f), h.mul(0.35).add(grain.mul(0.4)));
    const fy = fract(w.y.div(0.22)), fx = fract(w.x.add(off).div(2.2));
    const fw = max(fwidth(w.y.div(0.22)), 0.002);
    const seam = smoothstep(0.0, fw.mul(1.5).max(0.012), min(fy, float(1).sub(fy))).mul(smoothstep(0.0, 0.002, min(fx, float(1).sub(fx)))).mul(0.3).add(0.7);
    return base.mul(seam);
  })(),
  walnut: () => Fn(() => {
    const w = uv().toVar();
    const grain = vnoise(vec2(w.x.mul(45.0), w.y.mul(1.4))).mul(0.35).add(vnoise(vec2(w.x.mul(160.0), w.y.mul(4.0))).mul(0.15));
    const base = mix(lin(0x2f2018), lin(0x5a3c2b), grain);
    const panel = fract(w.x.div(0.6)), fwp = max(fwidth(w.x.div(0.6)), 0.002);
    const groove = smoothstep(0.0, fwp.mul(2.0).max(0.006), min(panel, float(1).sub(panel))).mul(0.45).add(0.55);
    return mix(base, base.mul(groove), isC(C.door));
  })(),
  // calacatta: warm white with drifting grey veins and a little gold
  marble_white: () => Fn(() => {
    const w = uv().toVar();
    const warp = vec2(vnoise(w.mul(0.45)), vnoise(w.mul(0.45).add(5.2))).mul(1.1);
    const q = w.mul(0.5).add(warp);
    // (job 2, rule uv-written: with the real metre UVs the veins drew as 3 cm marker lines: thinner, softer, fewer)
    const v1 = float(1).sub(smoothstep(0.0, 0.007, abs(vnoise(q).sub(0.5)))).mul(vnoise(w.mul(0.8)).mul(0.8).add(0.2)).mul(0.5);
    const v2 = float(1).sub(smoothstep(0.0, 0.0035, abs(vnoise(q.mul(2.7).add(3.1)).sub(0.5)))).mul(0.6);
    const base = lin(0xece8e1).mul(vnoise(w.mul(6.0)).mul(0.04).add(0.97));
    return mix(mix(base, lin(0x8e8b86), v1.mul(0.55)), lin(0xb39a6a), v2.mul(0.35));
  })(),
  stone_floor: () => Fn(() => {
    const w = uv().toVar();
    const g = vec2(w.x.div(1.2), w.y.div(0.6)), cell = floor(g), f = fract(g);
    const h = hash2(cell);
    const fw = max(fwidth(g.x), 0.002);
    const joint = float(1).sub(smoothstep(0.0, fw.mul(1.2).max(0.004), min(min(f.x, float(1).sub(f.x)), min(f.y.mul(0.5), float(1).sub(f.y).mul(0.5)))));
    const base = mix(lin(0xb3afa7), lin(0xc4c0b8), h).mul(vnoise(w.mul(3.0)).mul(0.06).add(0.97));
    return mix(mix(base, lin(0x6f6c67), joint.mul(0.6)), base.mul(0.85), isC(C.step).mul(0.3));
  })(),
  fabric_white: () => lin(0xe6e1d6).mul(vnoise(uv().mul(120.0)).mul(0.08).add(0.95)).mul(mix(float(1), float(0.93), isC(C.channel))),
  fabric_grey: () => mix(lin(0x74716b), lin(0x8d8982), vnoise(uv().mul(40.0))).mul(mix(float(1), float(1.15), isC(C.rug))),
  leather: () => mix(lin(0x6a3d22), lin(0x8a5532), vnoise(uv().mul(9.0))),
  brass: () => lin(0xb08746),
  metal_black: () => mix(lin(0x1b1b1d), lin(0x060708), isC(C.screen)),
  glow: () => lin(0xf3efe6),
  plant: () => mix(mix(lin(0x2c5a26), lin(0x4f7a33), vnoise(uv().mul(14.0))), lin(0x8a8580), isC(1)),
  // round 2: glazed ceramic / honed stone (the tub, the basins, vases, planters)
  ceramic_white: () => lin(0xe9e6e0).mul(vnoise(uv().mul(5.0)).mul(0.04).add(0.97)),
  // book spines and bottles: a muted palette by code (0-5 cloth / paper spines, 6-7 dark glass), a band near the top
  books: () => Fn(() => {
    const cd = codeF();
    const pal = [0x7b3b2e, 0x2f4a5c, 0xc9b99a, 0x3e5a43, 0x8c6c3c, 0x2b2b2e, 0x1e3a22, 0x4a2a10];
    let col = lin(pal[0]);
    for (let k = 1; k < 8; k++) col = mix(col, lin(pal[k]), isC(k));
    const band = smoothstep(0.004, 0.0, abs(fract(uv().y.mul(4.2)).sub(0.85))).mul(0.25);
    return col.mul(vnoise(uv().mul(30.0)).mul(0.1).add(0.92)).add(lin(0xb08746).mul(band).mul(float(1).sub(isC(6)).mul(float(1).sub(isC(7)))));
  })(),
  // abstract canvases (invented, by code): soft colour fields and a few gestural strokes, low noise
  art: () => Fn(() => {
    const w = uv().toVar(), cd = codeF();
    const f1 = vnoise(w.mul(1.1).add(cd.mul(3.7))), f2 = vnoise(w.mul(2.3).add(cd.mul(1.3)).add(9.0));
    const a = mix(lin(0xd9cbb0), lin(0x1f2a38), isC(1)), b = mix(lin(0xb4562f), lin(0xc8a56a), isC(2)), c = mix(lin(0x2f4f5a), lin(0xe5ddd0), isC(3));
    const fields = mix(mix(a, b, smoothstep(0.35, 0.65, f1)), c, smoothstep(0.55, 0.8, f2));
    const stroke = float(1).sub(smoothstep(0.0, 0.025, abs(vnoise(w.mul(0.8).add(cd)).sub(0.5)))).mul(0.6);
    return mix(fields, lin(0x15151a), stroke);
  })(),
};

// ---- villa3 (docs/VILLA_V3_PLAN.md): the `props` slot (the round-2 fabric_white / fabric_grey / leather merged: 16 -> 14
// draws) + the floors' contact shadow. CTX is filled by loadVillaInterior before any material is built.
const CTX = { inv: uniform(new THREE.Matrix4()), rects: [], fabrics: null, tiles: [0.271, 0.268, 0.266, 0.3], reflect: null, refl: null };
/** villa3 job 2: the reflection probes' mapping knobs (the Cycles equirect frame) and gains (uniforms: no recompile) */
export const reflLook = { gain: uniform(1.0), flipV: uniform(0), uOff: uniform(0), tv: uniform(3.0), mirror: uniform(0.9), picture: uniform(0.22) };
/** props codes 3.. (tools/blender/villa_bed.py): [tint, the scan layer (models/villa/fabrics.json order), the tile scale] */
const PROPS = {
  3: [0xeeebe5, 0, 1.0],     // fitted sheet: white linen
  4: [0xe4ddd0, 0, 1.0],     // duvet + its turn-down: warm white linen
  6: [0x977656, 1, 1.7],     // throw: camel chunky knit (the knit scan at 1.7x)
  7: [0xb3a897, 2, 1.0],     // headboard: greige boucle
  8: [0xf0ede7, 0, 1.0],     // sleeping pillows: white linen
  9: [0x8c8478, 0, 1.0],     // Euro pillows: stone linen
  10: [0xd2c8b6, 2, 0.8],    // cushion: cream boucle
  11: [0x6b3f25, 3, 1.0],    // bench: cognac leather
  12: [0xaea392, 2, 1.0],    // platform + the armchairs: greige weave
  13: [0xcdc5b6, 2, 1.0],    // job 2: the sofas' frame, arms, deck: warm oatmeal weave (the pit's white sofas read over-bright)
  5: [0xd6cebf, 2, 1.0],     // job 2: the sofas' seat + back cushions: the same weave, a touch lighter
  15: [0x847e73, 1, 2.2],    // job 2: the rugs (the blotchy noise): a wool knit / loop pile at rug scale
};
/** { col (albedo x relief), textured mask } of the props slot (needs the light for the leather's sheen: done by the caller) */
function propsAlbedo() {
  // the round-2 looks, unchanged, for the items not yet re-made (codes 0 / 1 / 2, channel 14, rug 15)
  const fw = lin(0xe6e1d6).mul(vnoise(uv().mul(120.0)).mul(0.08).add(0.95));
  const fg = mix(lin(0x74716b), lin(0x8d8982), vnoise(uv().mul(40.0)));
  const le = mix(lin(0x6a3d22), lin(0x8a5532), vnoise(uv().mul(9.0)));
  let old = fw;
  old = mix(old, fg, isC(1)); old = mix(old, le, isC(2)); old = mix(old, fw.mul(0.93), isC(C.channel)); old = mix(old, fg.mul(1.15), isC(C.rug));
  if (!CTX.fabrics) return { col: old, tex: float(0) };
  let tint = vec3(0), layer = float(0), scale = float(1), tex = float(0);
  for (const [k, [hex, l, s]] of Object.entries(PROPS)) {
    const on = isC(+k);
    tint = tint.add(lin(hex).mul(on)); layer = layer.add(on.mul(l)); scale = scale.add(on.mul(s - 1)); tex = tex.add(on);
  }
  const tile = select(layer.lessThan(0.5), float(CTX.tiles[0]), select(layer.lessThan(1.5), float(CTX.tiles[1]), select(layer.lessThan(2.5), float(CTX.tiles[2]), float(CTX.tiles[3]))));
  const uvT = uv().div(tile.mul(scale)).toVar();
  const s = texture(CTX.fabrics, uvT).depth(int(layer.add(0.5))).toVar();
  // (job 2: the knit throw and the rugs read flat: their scan's detail and relief at full strength)
  const strong = isC(6).add(isC(C.rug)).min(1);
  const detail = mix(float(1), s.r.mul(2.0), mix(0.75, 1.0, strong)).mul(mix(float(1), s.g, mix(0.85, 1.0, strong)));
  // the scan's normal, without tangents (screen-space cotangent frame): a relief term against a soft key light from
  // above / the windows, so the weave and the knit read under the baked (diffuse) light
  const N = normalWorld.toVar();
  const nx = s.b.mul(2).sub(1), ny = s.a.mul(2).sub(1), nz = float(1).sub(nx.mul(nx)).sub(ny.mul(ny)).max(0).sqrt();
  const dp1 = dFdx(positionWorld), dp2 = dFdy(positionWorld), duv1 = dFdx(uvT), duv2 = dFdy(uvT);
  const p2 = cross(dp2, N), p1 = cross(N, dp1);
  const T = p2.mul(duv1.x).add(p1.mul(duv2.x)), B = p2.mul(duv1.y).add(p1.mul(duv2.y));
  const im = inverseSqrt(max(dot(T, T), dot(B, B)).max(1e-14));
  const Np = normalize(T.mul(im).mul(nx).add(B.mul(im).mul(ny)).add(N.mul(nz)));
  const Lk = normalize(vec3(0.25, 1.0, 0.18));
  const relief = clamp(float(1).add(dot(Np, Lk).sub(dot(N, Lk)).mul(mix(1.7, 3.2, strong))), 0.35, 1.6);
  // the throw (code 6): a CHUNKY KNIT drawn over the scan: columns of V stitches (2.4 x 2 cm), each stitch's two
  // loops shaded round, the grooves between columns dark (the fleece scan alone read as a plain slab at 2 m)
  const kq = uv().mul(vec2(1 / 0.024, 1 / 0.02)).toVar();
  const ks = fract(kq.x).sub(0.5).toVar(), kt = fract(kq.y.add(abs(ks).mul(1.1))).toVar();
  const loop = smoothstep(0.0, 0.35, kt).mul(smoothstep(1.0, 0.6, kt)).mul(smoothstep(0.5, 0.36, abs(ks)));
  const knit = mix(float(0.62), float(1.12), loop).mul(mix(float(0.8), float(1.0), smoothstep(0.02, 0.12, float(0.5).sub(abs(ks)))));
  const fwk = fwidth(kq.x).max(fwidth(kq.y));
  const knitAA = mix(knit, float(0.9), smoothstep(0.35, 0.9, fwk));          // (fades to its mean when a stitch is under ~2 px)
  return { col: mix(old, tint.mul(detail).mul(relief).mul(mix(float(1), knitAA, isC(6))), tex), tex };
}
/** the contact shadow round the re-made pieces' footprints (interior.json contact): the floor darkens under and right
 *  next to them (a 7 cm falloff), so they sit ON the floor; the per-corner bake (0.42 m grid) cannot hold that crease */
function contactShade() {
  if (!CTX.rects.length) return float(1);
  const pL = CTX.inv.mul(vec4(positionWorld, 1.0)).xyz.toVar();
  let k = float(0);
  for (const r of CTX.rects) {
    const c = vec2((r.u[0] + r.u[1]) / 2, (r.w[0] + r.w[1]) / 2), h = vec2((r.u[1] - r.u[0]) / 2, (r.w[1] - r.w[0]) / 2);
    const q = abs(pL.xz.sub(c)).sub(h);
    const d = length(max(q, vec2(0))).add(min(max(q.x, q.y), 0.0));
    const near = float(1).sub(smoothstep(0.03, 0.12, abs(pL.y.sub(r.y))));
    k = max(k, d.max(0).div(0.07).negate().exp().mul(near));
  }
  return float(1).sub(k.mul(0.55));
}

/** villa3 job 2: the TV's glass (code screen) and the bathroom mirror (code roof = MIRROR in villa.py): what they
 *  reflect is the room, read from a Cycles panorama baked at each (models/villa/reflect.ktx2: tv day / night, mirror
 *  day / night): the TV a dark glossy pane (Fresnel, F0 0.04) with a faint picture at night only, the mirror silvered
 *  glass (88 %). No render target, no light (rule fixed-light-count): one texture lookup. */
function screenAndMirror(light) {
  const V = positionWorld.sub(cameraPosition).normalize(), N = normalWorld, R = reflect(V, N);
  const Rl = CTX.inv.mul(vec4(R, 0.0)).xyz.normalize();
  const d = vec3(Rl.x, Rl.z.negate(), Rl.y);               // three local (u, h, w) -> Blender (u, -w, h)
  const u = float(0.5).sub(atan(d.y, d.x).div(2 * Math.PI)).add(reflLook.uOff);
  const v0 = acos(clamp(d.z, -1, 1)).div(Math.PI);
  const uvp = vec2(fract(u), mix(v0, float(1).sub(v0), reflLook.flipV));
  const n = nightK();
  const lay = (k) => texture(CTX.reflect, uvp).depth(int(k)).rgb;
  const mirrorOn = isC(C.roof);
  const base = mirrorOn.mul(2);                               // tv: layers 0 / 1, mirror: 2 / 3
  const day = mix(lay(0), lay(2), mirrorOn), night = mix(lay(1), lay(3), mirrorOn);
  const room = mix(day.mul(villaInLook.dayGain), night.mul(villaInLook.nightGain), n).mul(villaInLook.adapt).mul(reflLook.gain);
  const ndv = abs(dot(N, V)), F = float(0.04).add(float(0.96).mul(pow(float(1).sub(ndv), 5.0)));
  // a faint picture at night: slow soft colour fields over the screen (its UV in metres)
  const pq = uv().mul(1.3).add(vec2(time.mul(0.05), time.mul(0.031)));
  const pic = mix(lin(0x1d3550), lin(0x8a5a3a), vnoise(pq)).mul(vnoise(pq.mul(2.3).add(4.0)).mul(0.6).add(0.4));
  const tv = lin(0x020203).mul(light).add(room.mul(F.mul(reflLook.tv))).add(pic.mul(n).mul(reflLook.picture));
  const mirror = room.mul(reflLook.mirror).mul(vec3(0.95, 0.97, 0.96));
  return mix(tv, mirror, mirrorOn);
}

function bakedMaterial(slot) {
  const m = new THREE.MeshBasicNodeMaterial();
  m.name = `villa interior ${slot}`;
  const light = bakedLight();
  const pr = slot === "props" ? propsAlbedo() : null;
  let alb = pr ? pr.col : ALBEDO[slot]();
  if (slot === "oak_plank" || slot === "stone_floor") alb = alb.mul(contactShade());
  if (slot === "props") alb = alb.mul(mix(float(1), contactShade(), isC(C.rug)));
  let col = alb.mul(light);
  if (pr) {     // the leather's sheen, the linen / boucle's soft rim (grazing light on fabric)
    const V0 = positionWorld.sub(cameraPosition).normalize(), f0 = pow(float(1).sub(abs(dot(normalWorld, V0))), 3.0);
    col = col.add(light.mul(f0).mul(mix(0.06, 0.22, isC(11))).mul(pr.tex));
  }
  const V = positionWorld.sub(cameraPosition).normalize(), R = reflect(V, normalWorld), ndv = abs(dot(normalWorld, V));
  const fres = pow(float(1).sub(ndv), 4.0);
  if (slot === "metal_black" && CTX.reflect) col = mix(col, screenAndMirror(light), isC(C.screen).add(isC(C.roof)).min(1));
  if (slot === "brass" || slot === "metal_black") col = col.add(lin(0xffe2b0).mul(light).mul(fres.mul(0.6).add(smoothstep(0.2, 0.9, R.y).mul(slot === "brass" ? 0.35 : 0.08))));
  if (slot === "stone_floor" || slot === "marble_white") col = col.add(vec3(0.85, 0.88, 0.95).mul(light).mul(fres.mul(0.35)));        // polished: a sheen at grazing angles
  if (slot === "glow") {
    const fire = isC(C.fire), flick = vnoise(vec2(positionWorld.x.mul(3.0).add(time.mul(2.3)), time.mul(1.7))).mul(0.6).add(0.6);
    const hot = mix(lin(0xffd2a0).mul(mix(0.8, 4.5, nightK())), lin(0xff7a2a).mul(flick).mul(mix(1.5, 3.5, nightK())), fire);
    col = alb.mul(light).mul(0.3).add(hot);
  }
  m.colorNode = select(villaInLook.view.equal(1), light, select(villaInLook.view.equal(2), alb, col));
  m.userData.slot = slot;
  return m;
}
/** the cell's glass: double-sided, a fresnel reflection of the sky over a faint tint; opaque at glassIn = 1 */
function glassMaterial() {
  // villa3: the shared glass model (villaGlass.js): Fresnel, the garden / tree line / sun reflected, premultiplied over
  // the room; from inside, the lit room reflected (the adapted room light: dark mirrors at night)
  if (GLASS_V3) return nearGlassMaterial(villaInLook.glassIn, mix(vec3(glassLook.room).mul(0.16), vec3(glassLook.roomNight).mul(0.2), nightK()).mul(villaInLook.adapt.min(1.6)));
  const m =new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false });
  m.name = "villa interior glass_window";
  const V = positionWorld.sub(cameraPosition).normalize(), ndv = abs(dot(normalWorld, V));
  const fres = pow(float(1).sub(ndv), 5.0).mul(0.85).add(0.06);
  const n = nightK();
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(-0.1, 0.6, reflect(V, normalWorld).y)).mul(float(1).sub(n.mul(0.9)));
  const dark = lin(0x0b1114);
  m.colorNode = mix(mix(dark, sky, fres), mix(dark, sky, fres.mul(0.6).add(0.1)), villaInLook.glassIn);
  m.opacityNode = mix(fres.mul(0.75).add(0.1), float(0.97), villaInLook.glassIn);
  return m;
}

let promise = null;
export function loadVillaInterior({ placement, renderer = null }) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const base = new URL(VILLA_DIR, import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    // villa3: the fabric scans' KTX2 array (CC0, models/villa/LICENCES.md) streams WITH the cell (< 60 m), never at boot;
    // KTX2Loader transcodes in its workers. A failure keeps the round-2 flat fabrics (no texture sampled).
    const fab = GLASS_V3 && renderer ? ktxLoader(renderer).loadAsync(base + "fabrics.ktx2").catch((e) => { console.warn("[villa] fabrics.ktx2:", e.message); return null; }) : null;
    const refl = GLASS_V3 && renderer ? ktxLoader(renderer).loadAsync(base + "reflect.ktx2").catch((e) => { console.warn("[villa] reflect.ktx2:", e.message); return null; }) : null;
    const [gltf, info, fabrics, reflTex] = await Promise.all([loader.loadAsync(base + "interior.glb"), fetch(base + "interior.json").then((r) => r.json()), fab, refl]);
    const root = new THREE.Group(); root.name = "villa-interior";
    root.position.copy(placement.position); root.rotation.y = placement.rotationY;
    root.updateMatrixWorld(true);
    if (fabrics) { fabrics.wrapS = fabrics.wrapT = THREE.RepeatWrapping; fabrics.colorSpace = THREE.NoColorSpace; fabrics.anisotropy = 4; fabrics.needsUpdate = true; }
    if (reflTex) { reflTex.wrapS = THREE.RepeatWrapping; reflTex.colorSpace = THREE.SRGBColorSpace; reflTex.needsUpdate = true; }
    CTX.reflect = reflTex && info.reflect ? reflTex : null;
    CTX.fabrics = fabrics; CTX.rects = GLASS_V3 ? (info.contact || []) : []; CTX.inv.value.copy(root.matrixWorld).invert();
    const mats = {};
    const matFor = (slot) => (mats[slot] ??= slot === "glass_window" ? glassMaterial() : bakedMaterial(slot));
    let tris = 0, draws = 0, colliders = null;
    // (round 2, the stream-in hitch: the cell's set-up runs in slices, a frame between nodes and every few materials)
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    await frame();
    for (const node of [...gltf.scene.children]) {
      await frame();
      if (node.name === "Collider") {
        const g = node.geometry ?? node.children[0]?.geometry;
        node.updateMatrixWorld(true);
        const p = g.attributes.position, idx = g.index;
        const M = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, node.matrixWorld);
        const n = idx ? idx.count : p.count, out = new Float32Array(n * 3), v = new THREE.Vector3();
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(M); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
        colliders = out;
        continue;
      }
      const meshes = []; node.traverse((o) => { if (o.isMesh) meshes.push(o); });
      for (const [k, o] of meshes.entries()) {
        if (k % 3 === 2) await frame();
        const slot = o.material.name;
        o.material = matFor(slot);
        o.userData.slot = slot; o.castShadow = false; o.receiveShadow = false;
        o.geometry.computeBoundingSphere();
        if (slot === "glass_window") o.renderOrder = 2;
        tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; draws++;
      }
      root.add(node);
    }
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const tmp = new THREE.Vector3();
    const inBoxes = (boxes, p, pad = 0) => {
      tmp.copy(p).applyMatrix4(inv);
      const u = tmp.x, w = tmp.z, h = tmp.y + 100;
      return boxes.some((b) => u > b.u[0] + pad && u < b.u[1] - pad && w > b.w[0] + pad && w < b.w[1] - pad && (!b.h || (h > b.h[0] && h < b.h[1])));
    };
    const cell = {
      root, info, colliders, materials: Object.values(mats),
      stats: { triangles: Math.round(tris), draws, loadMs: Math.round(performance.now() - t0) },
      contains: (p, pad = 0) => inBoxes(info.inside, p, pad),
      noTerrain: (x, z) => inBoxes(info.no_terrain, tmp.set(x, 0, z), 0),
      toLocal: (p, out = new THREE.Vector3()) => out.copy(p).applyMatrix4(inv),
      /** per frame: the eye adaptation inside, the glass fade-in */
      update(dt, eye) {
        const n = villaInLook.dayOverride.value >= 0 ? 1 - villaInLook.dayOverride.value : env.uNight.value;
        const target = eye && cell.contains(eye, -0.05) ? villaInLook.adaptInside * (1 - n) + villaInLook.adaptNight * n : 1.0;
        villaInLook.adapt.value += (target - villaInLook.adapt.value) * Math.min(1, dt * 1.5);
        // (villa3 glass: the eye inside sees the room reflected, outside the garden; eased over ~0.3 s)
        const inK = eye && cell.contains(eye, -0.05) ? 1 : 0;
        glassLook.inside.value += (inK - glassLook.inside.value) * Math.min(1, dt * 4);
        const g = villaInLook.glassIn;
        if (g.value > 0) g.value = Math.max(0, g.value - dt / 1.2);
      },
      dispose() {
        root.removeFromParent();
        root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        for (const m of Object.values(mats)) m.dispose();
        promise = null;
      },
    };
    cell.probes = makeProbes(cell);
    return cell;
  })());
}

/** ambient cubes (baked in Cycles with the cell): the blend near a world position -> six colours (uniforms) */
function makeProbes(cell) {
  const P = cell.info.ambientCubes?.probes || [];
  const U = Array.from({ length: 6 }, () => uniform(new THREE.Color(0, 0, 0)));
  const uRot = uniform(new THREE.Matrix4().copy(cell.root.matrixWorld).invert());
  const tmp = new THREE.Vector3(), acc = Array.from({ length: 6 }, () => new THREE.Color());
  const probes = {
    count: P.length, U,
    update(worldPos) {
      if (!P.length) return;
      cell.toLocal(worldPos, tmp);
      const n = villaInLook.dayOverride.value >= 0 ? 1 - villaInLook.dayOverride.value : env.uNight.value;
      const sunUp = THREE.MathUtils.smoothstep(env.uSunDir.value.y, 0.02, 0.15);
      const kSky = villaInLook.dayGain.value * (1 - n), kSun = villaInLook.sunGain.value * (1 - n) * sunUp, kNight = villaInLook.nightGain.value * n;
      const sc = env.uSunColor.value;
      for (const a of acc) a.setRGB(0, 0, 0);
      let wsum = 0;
      for (const p of P) {
        const d2 = (p.pos[0] - tmp.x) ** 2 + (p.pos[1] - tmp.y) ** 2 * 2 + (p.pos[2] - tmp.z) ** 2;
        const w = 1 / (d2 + 0.05) ** 2; wsum += w;
        for (let k = 0; k < 6; k++) {
          const s = p.sky[k], u = p.sun[k], t = p.night[k];
          acc[k].r += w * (s[0] * kSky + u[0] * kSun * sc.r + t[0] * kNight);
          acc[k].g += w * (s[1] * kSky + u[1] * kSun * sc.g + t[1] * kNight);
          acc[k].b += w * (s[2] * kSky + u[2] * kSun * sc.b + t[2] * kNight);
        }
      }
      const g = villaInLook.adapt.value / Math.max(wsum, 1e-9);
      for (let k = 0; k < 6; k++) U[k].value.copy(acc[k]).multiplyScalar(g);
    },
  };
  const nl = uRot.mul(vec4(normalWorld, 0.0)).xyz.normalize();
  const n2 = nl.mul(nl);
  const cube = nl.x.greaterThan(0).select(vec3(U[0]), vec3(U[1])).mul(n2.x)
    .add(nl.y.greaterThan(0).select(vec3(U[2]), vec3(U[3])).mul(n2.y))
    .add(nl.z.greaterThan(0).select(vec3(U[4]), vec3(U[5])).mul(n2.z));
  /** the character's indoor material maker (body.setVariant): unlit, albedo x the ambient cube */
  probes.variant = (body) => (src, fade) => {
    const m = new THREE.MeshBasicNodeMaterial({ vertexColors: !!src.vertexColors });
    if (src.color) m.color.copy(src.color);
    m.colorNode = cube.add(float(0.0002));
    if (fade) { m.transparent = true; m.depthWrite = false; m.opacityNode = body.uOpacity; }
    return m;
  };
  return probes;
}
