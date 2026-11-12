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
  fract, mix, step, smoothstep, clamp, abs, sin, dot, max, min, mod, pow, normalize, uniform, mrt, roughness, round, select, fwidth,
  sqrt, length, dFdx, dFdy, transformNormalByViewMatrix, normalViewGeometry,
} from "three/tsl";
import { env } from "../lighting.js";
import { pieceKeep } from "./kitFade.js";
import { paintedGlass } from "../facades.js";

export const KIT_SLOTS = ["stone_white", "stone_blue", "brick_red_brussels", "brick_yellow", "wood_frame_white", "wood_frame_dark",
  "glass_window", "cast_iron_green", "painted_metal_white", "zinc_roof",
  // round 3 (new pieces): library names where the library has one (slate, brick_dark, render_white, copper_patina), two
  // kit looks it has not (glass_stained: leaded coloured lights, opaque; metal_anodised: 1960s aluminium; enamel_blue: the
  // house-number plates)
  "slate", "brick_dark", "render_white", "copper_patina", "glass_stained", "metal_anodised", "enamel_blue"];
/** THE ADAPTER TABLE: kit slot -> look name (a KIT_SLOTS / library name) */
export const SLOT_TABLE = Object.fromEntries(KIT_SLOTS.map((s) => [s, s]));
// THE ONE LINE: "temp" | "../materials/library.js"
const SOURCE = "temp";

/** live look controls (uniforms: no recompile) */
export const kitLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.45), aoGamma: uniform(0.7), weather: uniform(1.0), roomGlass: uniform(1.0),
  // (round 3) ANTI-ALIASING, all live (0 = off, for A/B):
  //   specAA: the geometric specular AA kernel (Tokuyoshi & Kaplanyan 2019/2021 "Improved geometric specular
  //   antialiasing", as Filament's normalFiltering / Unreal's): sigma^2 = specAAVar x (|dn/dx|^2 + |dn/dy|^2) of the
  //   shading normal, alpha^2 += min(2 sigma^2, specAAMax). It widens the highlight where the normal turns within a
  //   pixel (bevels, round mouldings, beads, bars seen from afar), so a sub-pixel highlight stops blinking.
  //   thinFar: the town hall's region-width filter (models/townhall/NOTES.md polish 2b): a part narrower than ~1 pixel
  //   shades like the wall it sits on (normal bent to the wall's) and its albedo / roughness tend to the coverage-weighted
  //   mean, so a glazing bar or a 6 mm bevel does not sparkle; patterns: box-filtered (Mr.doob's filteredPulse).
  specAA: uniform(1.0), specAAVar: uniform(0.25), specAAMax: uniform(0.18), thinFar: uniform(1.0) };

let lib = null;
export async function loadKitMaterialSource() {
  if (SOURCE === "temp" || lib) return lib;
  lib = await import(SOURCE).catch((e) => { console.warn("[facadeKit] material library not loaded:", e.message); return null; });
  return lib;
}

/** the 9-slice stretch: local delta of a vertex (piece frame) for the instance's aKitI = (sx, hsx, sy, dH); runs: their end
 *  rings take the mitres (aKitI.z / .w, see kitField.js); arched heads bend onto the true arch of the stretched width */
const REF_HW = 0.6;                                             // facadeKit.py REF window width / 2 (the arched pieces)
function sliceDelta() {
  const P = positionGeometry;
  const k = attribute("aKitV", "vec4");                         // unorm: (cx + 1) / 2, (cy + 1) / 2, ao, (flags + 4 slot) / 255
  const W = attribute("aKitW", "vec4");                         // unorm: sqrt(region width / 4), run end flag, arch rise / 0.5, 0
  const I = attribute("aKitI", "vec4");
  const cx = round(k.x.mul(2)).sub(1), cy = round(k.y.mul(2)).sub(1);
  const run = W.y.greaterThan(0.5);
  // a run's end ring: x moves with the end and SHEARS with depth (x += z tan(turn / 2)): two runs meeting at a corner
  // share the mitre plane exactly (no end cap lying in the next wall's plane: docs/CITY_MESH_AUDIT.md)
  const mitre = select(run, cx.mul(P.z).mul(select(cx.lessThan(0), I.z, I.w)), float(0));
  const dx = mix(P.x.mul(I.x.sub(1)), cx.mul(I.y), abs(cx)).add(mitre);
  const SB = 0.3;                                               // tools/blender/facadeKit.py SLICE_B
  const dyMid = P.y.sub(SB).mul(I.z.sub(1));
  const dy0 = select(cy.lessThan(-0.5), float(0), select(cy.greaterThan(0.5), I.w, dyMid));
  // the arched head (aKitW.z = rise): from the reference arch to the true one of the stretched width (the wall's cut)
  const rise = W.z.mul(0.5).max(1e-4);
  const arch = (hw, x) => { const R = hw.mul(hw).add(rise.mul(rise)).div(rise.mul(2)); return sqrt(R.mul(R).sub(min(abs(x), hw).pow(2)).max(0)).sub(R.sub(rise)); };
  const bend = select(W.z.greaterThan(0.002), arch(float(REF_HW).add(I.y), P.x.add(dx)).sub(arch(float(REF_HW), P.x)), float(0));
  const dy = select(run, float(0), dy0.add(bend));
  return { dx, dy, k, W };
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

/** the Box-Filtered Periodic Pulse (Mr.doob, slop-newyork js/tsl-materials.js filteredPulse, MIT): the share of a
 *  footprint w wide around x where fract() lies in [a, b]; settles to (b - a) once a period is below a pixel */
export const filteredPulse = Fn(([x, a, b, w]) => {
  const p = float(x).toVar(), lo = float(a).toVar(), hi = float(b).toVar();
  const hw = max(float(w), 0.0001).mul(0.5).toVar();
  const integral = (t) => floor(t).mul(hi.sub(lo)).add(clamp(fract(t), lo, hi).sub(lo));
  return integral(p.add(hw)).sub(integral(p.sub(hw))).div(hw.mul(2.0));
});

/** the thin-part filter (region width): k = how far below a pixel the part is (0 close up .. 1 sub-pixel), cover = the
 *  share of the pixel it really covers */
function thinPart(W) {
  const width = W.x.mul(W.x).mul(4.0).max(0.002);
  const foot = length(fwidth(positionWorld));                   // ~ metres per pixel (x 1.4-2)
  const k = smoothstep(0.6, 1.6, foot.div(width)).mul(kitLook.thinFar);
  const cover = mix(float(1), clamp(width.mul(2.0).div(foot), 0.35, 1.0), k);
  return { k, cover };
}

/** the specular AA kernel on a perceptual roughness r (Filament normalFiltering): r' = (r^4 + min(2 var, max))^(1/4) */
export function specularAA(r, n = normalViewGeometry) {
  // the derivatives taken on a materialised normal (a local var, in uniform control flow), the roughness materialised too
  const nn = vec3(n).toVar(), rr = float(r).toVar();
  const du = dFdx(nn).toVar(), dv = dFdy(nn).toVar();
  const variance = kitLook.specAAVar.mul(dot(du, du).add(dot(dv, dv)));
  const kernel = min(variance.mul(2.0), kitLook.specAAMax).mul(kitLook.specAA);
  const a2 = rr.mul(rr).mul(rr).mul(rr);
  return clamp(a2.add(kernel), 0, 1).sqrt().sqrt();
}

/** what every kit material shares: stretch, AO, fades, anti-aliasing */
function finish(m, lod, opts, { glass = false } = {}) {
  const { dx, dy, k, W } = sliceDelta();
  const J = attribute("aKitJ", "vec4");                         // (nx, nz, variant + seed, tile fade)
  // the stretch, rotated to the world by the wall's normal (local x = (nz, 0, -nx)) and added after the instancing
  m.positionNode = positionLocal.add(vec3(J.y.mul(dx), dy, J.x.negate().mul(dx)));
  if (!glass) {
    const ao = pow(k.z, kitLook.aoGamma);
    const aoK = mix(float(1), ao, kitLook.aoStrength);
    m.aoNode = m.aoNode ? m.aoNode.mul(aoK) : aoK;
    // sub-pixel parts: shade like the wall (the piece's +z) and fade to their coverage (the town hall's anti-sparkle)
    const th = thinPart(W);
    const wallN = transformNormalByViewMatrix(vec3(J.x, 0, J.y));
    const nBent = mix(normalViewGeometry, wallN, th.k).normalize();
    m.normalNode = nBent;
    m.colorNode = m.colorNode.mul(mix(float(1), aoK, kitLook.aoDirect)).mul(th.cover);
    // the geometric specular AA on the bent normal (its screen-space variance)
    // WIP: specularAA() fails to build in the lab's MRT / scene pass (TSL 'getNodeType of undefined', even on a plain
    // render of the scene) though it compiles in isolation: OFF until fixed (?saa=1 to try; docs/FACADE_KIT_RESUME.md)
    if (/[?&]saa=1/.test(globalThis.location?.search || "")) m.roughnessNode = specularAA(m.roughnessNode, nBent);
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
    If(eff.equal(7), () => mt.assign(0.35)).ElseIf(eff.equal(8), () => mt.assign(0.1)).ElseIf(eff.equal(9), () => mt.assign(0.4)).ElseIf(eff.equal(6), () => mt.assign(0.0))
      .ElseIf(eff.equal(13), () => mt.assign(0.15)).ElseIf(eff.equal(15), () => mt.assign(0.8));
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
  // (round 3) the joints BOX-FILTERED (filteredPulse: exact coverage of the pixel's footprint, the mean once a course is
  // below a pixel): no moire / shimmer on the stone and brick of the pieces at distance; the per-unit colour jitter
  // fades to its mean as the units go sub-pixel (fw)
  const cv = st.y.div(h), row = floor(cv);
  const cu = st.x.div(w).add(mod(row, 2).mul(0.5)), cell = floor(cu);
  const fv = fwidth(cv), fu = fwidth(cu);
  const mask = filteredPulse(cv, joint / h, 1.0, fv).mul(filteredPulse(cu, joint / w, 1.0, fu));
  return { row, cell, mask, fw: max(fv, fu) };
}
/** a per-cell hash that settles to 0.5 once the cells are below a pixel (fw = cells per pixel) */
const hashFade = (h, fw) => mix(h, float(0.5), smoothstep(0.35, 1.0, fw));
const grime = () => mix(float(1), float(0.8), clamp(normalWorld.y, 0, 1).mul(kitLook.weather));
const brick = (c1, c2, burnt, mortar) => (st) => {
  const { row, cell, mask, fw } = courses(st, 0.215, 0.065, 0.01);
  const h = hashFade(hash2(vec2(cell, row).add(seed().mul(91.0))), fw), h2 = hashFade(hash2(vec2(cell.add(17.0), row.mul(3.0))), fw);
  const b = mix(lin(c1), lin(c2), h).mul(mix(float(0.85), float(1.1), h2));
  return { col: mix(mix(b, lin(burnt), step(0.93, h2).mul(0.6)), lin(mortar), float(1).sub(mask)), rough: float(0.9) };
};
export const LOOKS = {
  stone_white(st) {
    const { row, cell, mask, fw } = courses(st, 0.62, 0.32, 0.005);
    const h = hashFade(hash2(vec2(cell, row).add(seed().mul(37.0))), fw);
    return { col: mix(lin(0xd2cbb8), lin(0xc4bba5), h).mul(mix(float(0.9), float(1), mask)).mul(grime()), rough: float(0.82) };
  },
  stone_blue(st) {
    // petit granit: bush-hammered dark grey, paler where the rain washes the tops, fine speckle
    const g = hashFade(hash2(floor(st.mul(180.0))), max(fwidth(st.x), fwidth(st.y)).mul(180.0)), g2 = hash2(floor(st.mul(9.0)).add(7.0));
    const up = clamp(normalWorld.y, 0, 1);
    return { col: mix(lin(0x55595f), lin(0x484c52), g.mul(0.6).add(g2.mul(0.4))).mul(mix(float(1), float(1.25), up.mul(kitLook.weather))), rough: float(0.74) };
  },
  brick_red_brussels: brick(0x93503d, 0x7a3d2c, 0x3e2219, 0x8a8278),
  brick_yellow: brick(0xaa8c62, 0x977a52, 0x6e5a3c, 0x9a9488),
  wood_frame_white(st) {
    const g = hashFade(hash2(vec2(floor(st.y.mul(40.0)), seed())), fwidth(st.y).mul(40.0)).mul(0.04).add(0.96);
    return { col: lin(0xe6e3da).mul(g), rough: float(0.42) };
  },
  wood_frame_dark(st) {
    // the grain (35 lines / m) fades to its mean once a line is below a pixel
    const grain = mix(sin(st.x.mul(220.0).add(sin(st.y.mul(13.0)).mul(3.0))).mul(0.5).add(0.5), float(0.5), smoothstep(0.3, 1.0, fwidth(st.x).mul(35.0)));
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
  // ---- round 3 slots
  slate(st) {
    // fish-scale-less rectangular slates, 30 x 20 cm exposed, box-filtered courses
    const { row, cell, mask, fw } = courses(st, 0.3, 0.2, 0.008);
    const h = hashFade(hash2(vec2(cell, row).add(5.0)), fw);
    return { col: mix(lin(0x2f3338), lin(0x3b4046), h).mul(mix(float(0.75), float(1), mask)), rough: float(0.55) };
  },
  brick_dark: brick(0x4a3026, 0x3a251d, 0x231612, 0x5c5850),
  render_white(st) {
    const g = hashFade(hash2(floor(st.mul(60.0))), max(fwidth(st.x), fwidth(st.y)).mul(60.0));
    return { col: lin(0xd8d3c6).mul(mix(float(0.97), float(1.02), g)).mul(grime()), rough: float(0.9) };
  },
  copper_patina() { return { col: lin(0x5f9a86), rough: float(0.6), metal: float(0.15) }; },
  glass_stained(st) {
    // leaded lights: coloured panes in a lead came grid (box-filtered), opaque (no room behind a transom light)
    const cu = st.x.div(0.11), cv = st.y.div(0.11);
    const lead = float(1).sub(filteredPulse(cu, 0.07, 1.0, fwidth(cu)).mul(filteredPulse(cv, 0.07, 1.0, fwidth(cv))));
    const h = hashFade(hash2(floor(vec2(cu, cv)).add(seed().mul(13.0))), max(fwidth(cu), fwidth(cv)));
    const pane = mix(mix(lin(0x7a5a1c), lin(0x2c4d3a), step(0.55, h)), lin(0x6b2420), step(0.85, h));
    return { col: mix(pane, lin(0x1c1d1e), lead), rough: mix(float(0.12), float(0.5), lead), emissive: vec3(0) };
  },
  metal_anodised() { return { col: lin(0x8f8a80), rough: float(0.35), metal: float(0.8) }; },
  enamel_blue(st) {
    // Brussels number plate: blue enamel with a white border 8 mm in (box-filtered); the figures come later (streetlife)
    const u = st.x.add(0.08).div(0.16), v = st.y.div(0.12);
    const inner = filteredPulse(u, 0.05, 0.95, fwidth(u)).mul(filteredPulse(v, 0.067, 0.933, fwidth(v)));
    const ring = filteredPulse(u, 0.075, 0.925, fwidth(u)).mul(filteredPulse(v, 0.1, 0.9, fwidth(v)));
    return { col: mix(lin(0x123a8a), lin(0xe8e6df), clamp(inner.sub(ring), 0, 1)), rough: float(0.2) };
  },
};
