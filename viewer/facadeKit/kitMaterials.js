// THE KIT'S MATERIALS. The pieces (models/facadekit/kit.bin) carry geometry only: per NAMED slot of the shared
// library (viewer/materials/, branch claude/materials), world-metre UVs, a per-vertex baked AO and the 9-slice classes.
// Colour and pattern come at run time from the material of that slot.
//
// DRAW CALLS (round 2): a piece draws in TWO meshes per LOD, whatever its slots: OPAQUE (every slot but the window
// glass; the slot index travels per vertex in aKitV.w, the building's variant per instance in aKitJ.z) and GLASS (the
// painted window's room: facades.js paintedGlass). kitOpaqueMaterial() evaluates the slot look of each pixel's own
// slot (a branch on a per-triangle constant: coherent, cheap), with the variants applied per instance (stone_white ->
// stone_blue, wood_frame_white -> wood_frame_dark, brick_red_brussels -> brick_yellow).
//   - SLOT_TABLE: slot -> look NAME (identity; point a slot at another look without a rebuild);
//   - SOURCE: THE ONE LINE that picks where the named looks come from: "temp" = the stand-ins below, or the library
//     module once it lands ("../materials/library.js": createMaterial(name, { mapping: "uv", varAttr: "aVar" })); with
//     the library the per-slot node graphs are switched the same way (each pixel runs its slot's graph only);
//   - every kit material gets the 9-slice stretch (positionNode), the uv following the stretch, the baked AO and the
//     LOD / distance / tile fades (kitFade.js; the shadow pass uses them too).
import * as THREE from "three/webgpu";
import {
  Fn, If, attribute, uv, positionWorld, positionLocal, positionGeometry, normalWorld, cameraPosition, vec2, vec3, vec4, float, floor,
  fract, mix, step, smoothstep, clamp, abs, sin, dot, max, mod, pow, normalize, uniform, mrt, roughness, round, select, fwidth,
} from "three/tsl";
import { env } from "../lighting.js";
import { pieceKeep } from "./kitFade.js";
import { paintedGlass } from "../facades.js";

export const KIT_SLOTS = ["stone_white", "stone_blue", "brick_red_brussels", "brick_yellow", "wood_frame_white", "wood_frame_dark",
  "glass_window", "cast_iron_green", "painted_metal_white", "zinc_roof"];
/** THE ADAPTER TABLE: kit slot -> look name (a KIT_SLOTS / library name) */
export const SLOT_TABLE = Object.fromEntries(KIT_SLOTS.map((s) => [s, s]));
// THE ONE LINE: "temp" | "../materials/library.js"
const SOURCE = "temp";

/** live look controls (uniforms: no recompile) */
export const kitLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.45), aoGamma: uniform(0.7), weather: uniform(1.0), roomGlass: uniform(1.0) };

let lib = null;
export async function loadKitMaterialSource() {
  if (SOURCE === "temp" || lib) return lib;
  lib = await import(SOURCE).catch((e) => { console.warn("[facadeKit] material library not loaded:", e.message); return null; });
  return lib;
}

/** the 9-slice stretch: local delta of a vertex (piece frame) for the instance's aKitI = (sx, hsx, sy, dH) */
function sliceDelta() {
  const P = positionGeometry;
  const k = attribute("aKitV", "vec4");                         // unorm: (cx + 1) / 2, (cy + 1) / 2, ao, (flags + 4 slot) / 255
  const I = attribute("aKitI", "vec4");
  const cx = round(k.x.mul(2)).sub(1), cy = round(k.y.mul(2)).sub(1);
  const dx = mix(P.x.mul(I.x.sub(1)), cx.mul(I.y), abs(cx));
  const SB = 0.3;                                               // tools/blender/facadeKit.py SLICE_B
  const dyMid = P.y.sub(SB).mul(I.z.sub(1));
  const dy = select(cy.lessThan(-0.5), float(0), select(cy.greaterThan(0.5), I.w, dyMid));
  return { dx, dy, k };
}
const kw = () => round(attribute("aKitV", "vec4").w.mul(255));
/** the uv in metres, moved with the stretched vertex (the uv flags say which of u / v come from x / y) */
export function kitUV() {
  const { dx, dy } = sliceDelta();
  const f = mod(kw(), 4);
  const fx = mod(f, 2), fy = floor(f.div(2));
  return uv().add(vec2(dx.mul(fx), dy.mul(fy)));
}
/** the building's variant bits (aKitJ.z = variant + seed) and seed */
const variantBits = () => floor(attribute("aKitJ", "vec4").z);
const seed = () => fract(attribute("aKitJ", "vec4").z);

/** what every kit material shares: stretch, AO, fades */
function finish(m, lod, opts, { glass = false } = {}) {
  const { dx, dy, k } = sliceDelta();
  const J = attribute("aKitJ", "vec4");                         // (nx, nz, variant + seed, tile fade)
  // the stretch, rotated to the world by the wall's normal (local x = (nz, 0, -nx)) and added after the instancing
  m.positionNode = positionLocal.add(vec3(J.y.mul(dx), dy, J.x.negate().mul(dx)));
  if (!glass) {
    const ao = pow(k.z, kitLook.aoGamma);
    const aoK = mix(float(1), ao, kitLook.aoStrength);
    m.aoNode = m.aoNode ? m.aoNode.mul(aoK) : aoK;
    m.colorNode = m.colorNode.mul(mix(float(1), aoK, kitLook.aoDirect));
  }
  if (!opts.raw) m.maskNode = opts.lab ? null : pieceKeep(lod, J.w);
  m.userData.shared = true;
  m.userData.lod = lod;
  return m;
}

/**
 * THE OPAQUE KIT MATERIAL for LOD `lod`: every slot of every piece in one draw. opts.raw: no fades; opts.lab: no
 * distance fades. opts.only: show one slot's look on everything (the lab's slot check).
 */
export function kitOpaqueMaterial(lod, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  m.name = `kit opaque lod${lod}`;
  const slot = floor(kw().div(4));
  const v = variantBits();
  const b1 = mod(v, 2), b2 = mod(floor(v.div(2)), 2), b4 = floor(v.div(4));
  // the building's variants: the same named slots, swapped per instance
  const eff = select(slot.equal(0).and(b1.greaterThan(0.5)), float(1),
    select(slot.equal(4).and(b2.greaterThan(0.5)), float(5), select(slot.equal(2).and(b4.greaterThan(0.5)), float(3), slot))).toVar();
  const looks = KIT_SLOTS.map((s) => LOOKS[SLOT_TABLE[s]] ?? LOOKS.stone_white);
  const st = kitUV().toVar();
  const out = Fn(() => {
    const col = vec3(0).toVar(), r = float(0.8).toVar(), mt = float(0).toVar();
    const pick = opts.only != null ? float(KIT_SLOTS.indexOf(opts.only)) : eff;
    let chain = null;
    looks.forEach((look, i) => {
      const body = () => { const L = look(st); col.assign(L.col); r.assign(L.rough); mt.assign(L.metal ?? float(0)); };
      chain = chain ? chain.ElseIf(pick.equal(i), body) : If(pick.equal(i), body);
    });
    return vec4(col, r);
  })();
  const metal = Fn(() => {
    const mt = float(0).toVar();
    If(eff.equal(7), () => mt.assign(0.35)).ElseIf(eff.equal(8), () => mt.assign(0.1)).ElseIf(eff.equal(9), () => mt.assign(0.4)).ElseIf(eff.equal(6), () => mt.assign(0.0));
    return mt;
  })();
  m.colorNode = out.rgb;
  m.roughnessNode = out.a;
  m.metalnessNode = metal;
  return finish(m, lod, opts);
}

/** THE KIT GLASS for LOD `lod`: the painted window's room, curtains, night lights and sky (facades.js paintedGlass)
 *  from the face the pane sits on (aKitF = u0, width, base, rnd + 2 x door street + 4 x French code). */
export function kitGlassMaterial(lod, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  m.name = `kit glass lod${lod}`;
  const F = attribute("aKitF", "vec4"), J = attribute("aKitJ", "vec4");
  const P = positionWorld;
  const u = P.x.mul(J.y.negate()).add(P.z.mul(J.x)).sub(F.x);   // t = (-nz, nx): facadeGeom.js
  const h = P.y.sub(F.z);
  const fr = floor(F.w.div(4)), rest = F.w.sub(fr.mul(4)), street = floor(rest.div(2)), rnd = rest.sub(street.mul(2));
  const g = paintedGlass({ u, h, fw: F.y, street, rnd, frCode: fr });
  // (roomGlass 0: the plain dark glass of round 1, for A/B)
  const dark = LOOKS.glass_window(uv());
  m.colorNode = mix(dark.col, g.col, kitLook.roomGlass);
  m.emissiveNode = g.emissive.mul(kitLook.roomGlass).add(dark.emissive.mul(float(1).sub(kitLook.roomGlass)));
  m.roughnessNode = mix(dark.rough, g.rough, kitLook.roomGlass);
  m.metalnessNode = float(0);
  m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });   // no GTAO on glass (facades.js)
  return finish(m, lod, opts, { glass: true });
}

// ------------------------------------------------------------------------------------------------ the looks
// Simple TSL stand-ins NAMED like the library's materials (replaced by name when viewer/materials/ lands). Each takes
// st = the stretched uv in metres and returns { col, rough, metal }. Tuned to sit with the façade shader's own colours
// (facades.js: red brick 0.29/0.085/0.05, yellow 0.4/0.27/0.14, cornice stone 0.55/0.53/0.49).
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
function courses(st, w, h, joint) {
  const cv = st.y.div(h), row = floor(cv);
  const cu = st.x.div(w).add(mod(row, 2).mul(0.5)), cell = floor(cu);
  const fw = max(fwidth(cv), fwidth(cu));
  const jv = smoothstep(0.0, joint / h, fract(cv)).mul(smoothstep(1.0, 1.0 - joint * 0.3 / h, fract(cv)));
  const ju = smoothstep(0.0, joint / w, fract(cu));
  return { row, cell, mask: mix(jv.mul(ju), float(0.85), smoothstep(0.2, 0.6, fw)) };
}
const grime = () => mix(float(1), float(0.8), clamp(normalWorld.y, 0, 1).mul(kitLook.weather));
const brick = (c1, c2, burnt, mortar) => (st) => {
  const { row, cell, mask } = courses(st, 0.215, 0.065, 0.01);
  const h = hash2(vec2(cell, row).add(seed().mul(91.0))), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0)));
  const b = mix(lin(c1), lin(c2), h).mul(mix(float(0.85), float(1.1), h2));
  return { col: mix(mix(b, lin(burnt), step(0.93, h2).mul(0.6)), lin(mortar), float(1).sub(mask)), rough: float(0.9) };
};
export const LOOKS = {
  stone_white(st) {
    const { row, cell, mask } = courses(st, 0.62, 0.32, 0.005);
    const h = hash2(vec2(cell, row).add(seed().mul(37.0)));
    return { col: mix(lin(0xd2cbb8), lin(0xc4bba5), h).mul(mix(float(0.9), float(1), mask)).mul(grime()), rough: float(0.82) };
  },
  stone_blue(st) {
    // petit granit: bush-hammered dark grey, paler where the rain washes the tops, fine speckle
    const g = hash2(floor(st.mul(180.0))), g2 = hash2(floor(st.mul(9.0)).add(7.0));
    const up = clamp(normalWorld.y, 0, 1);
    return { col: mix(lin(0x55595f), lin(0x484c52), g.mul(0.6).add(g2.mul(0.4))).mul(mix(float(1), float(1.25), up.mul(kitLook.weather))), rough: float(0.74) };
  },
  brick_red_brussels: brick(0x93503d, 0x7a3d2c, 0x3e2219, 0x8a8278),
  brick_yellow: brick(0xaa8c62, 0x977a52, 0x6e5a3c, 0x9a9488),
  wood_frame_white(st) {
    const g = hash2(vec2(floor(st.y.mul(40.0)), seed())).mul(0.04).add(0.96);
    return { col: lin(0xe6e3da).mul(g), rough: float(0.42) };
  },
  wood_frame_dark(st) {
    const grain = sin(st.x.mul(220.0).add(sin(st.y.mul(13.0)).mul(3.0))).mul(0.5).add(0.5);
    return { col: mix(lin(0x2a1a10), lin(0x3b2616), grain.mul(0.5).add(hash2(floor(st.mul(30.0))).mul(0.2))), rough: float(0.38) };
  },
  glass_window() {
    // plain dark glass with the analytic sky (the soupirail's pane; the kit glass's A/B fallback)
    const view = normalize(cameraPosition.sub(positionWorld));
    const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.55).add(0.08);
    const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
    const col = mix(lin(0x16181a), sky.mul(0.6), fres);
    return { col, rough: float(0.06), metal: float(0), emissive: vec3(0) };
  },
  cast_iron_green() { return { col: lin(0x1f3326), rough: float(0.45), metal: float(0.35) }; },
  painted_metal_white() { return { col: lin(0xd9d8d2), rough: float(0.4), metal: float(0.1) }; },
  zinc_roof() { return { col: lin(0x7e8589), rough: float(0.5), metal: float(0.4) }; },
};
