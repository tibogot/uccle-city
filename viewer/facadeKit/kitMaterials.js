// THE KIT'S MATERIALS. The pieces (models/facadekit/kit.bin) carry geometry only: per NAMED slot of the shared
// library (viewer/materials/, branch claude/materials), world-metre UVs, a per-vertex baked AO and the 9-slice classes.
// Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE: slot -> library material NAME (identity; the owner can point a slot elsewhere without a rebuild);
//   - SOURCE: THE ONE LINE that picks where the named materials come from: "temp" = the stand-ins below, or the
//     library module once it lands on this branch ("../materials/library.js": createMaterial(name, { mapping: "uv",
//     varAttr: "aVar" })), the same switch as the town hall / observatory loaders (branches claude/townhall,
//     claude/observatory);
//   - kitMaterial(slot, lod) wraps a fresh copy with what every kit material needs: the 9-slice stretch (positionNode),
//     the uv following the stretch (a 6 m cornice keeps 1 m = 1 m), the baked AO (indirect light, and a share of the
//     direct), the LOD / distance / tile fades (kitFade.js; the shadow pass uses them too).
import * as THREE from "three/webgpu";
import {
  attribute, uv, positionWorld, positionLocal, positionGeometry, normalWorld, cameraPosition, vec2, vec3, vec4, float, floor, fract, mix, step,
  smoothstep, clamp, abs, sin, dot, max, min, mod, pow, normalize, length, uniform, mrt, roughness, round, select, fwidth,
} from "three/tsl";
import { env } from "../lighting.js";
import { pieceKeep } from "./kitFade.js";

export const KIT_SLOTS = ["stone_white", "stone_blue", "brick_red_brussels", "brick_yellow", "wood_frame_white", "wood_frame_dark",
  "glass_window", "cast_iron_green", "painted_metal_white", "zinc_roof"];
/** THE ADAPTER TABLE: kit slot -> library material name */
export const SLOT_TABLE = Object.fromEntries(KIT_SLOTS.map((s) => [s, s]));
// THE ONE LINE: "temp" | "../materials/library.js"
const SOURCE = "temp";

/** live look controls (uniforms: no recompile) */
export const kitLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.45), aoGamma: uniform(0.7), weather: uniform(1.0) };

let lib = null;
export async function loadKitMaterialSource() {
  if (SOURCE === "temp" || lib) return lib;
  lib = await import(SOURCE).catch((e) => { console.warn("[facadeKit] material library not loaded:", e.message); return null; });
  return lib;
}

/** the 9-slice stretch: local delta of a vertex (piece frame) for the instance's aKitI = (sx, hsx, sy, dH) */
function sliceDelta() {
  const P = positionGeometry;
  const k = attribute("aKitV", "vec4");                         // unorm: (cx + 1) / 2, (cy + 1) / 2, ao, flags / 255 * 85
  const I = attribute("aKitI", "vec4");
  const cx = round(k.x.mul(2)).sub(1), cy = round(k.y.mul(2)).sub(1);
  const dx = mix(P.x.mul(I.x.sub(1)), cx.mul(I.y), abs(cx));
  const SB = 0.3;                                               // tools/blender/facadeKit.py SLICE_B
  const dyMid = P.y.sub(SB).mul(I.z.sub(1));
  const dy = select(cy.lessThan(-0.5), float(0), select(cy.greaterThan(0.5), I.w, dyMid));
  return { dx, dy, k };
}

/** a slot material from the source, or the stand-in */
function sourceMaterial(name) {
  if (lib) {
    try {
      const m = lib.createMaterial?.(name, { mapping: "uv", varAttr: "aVar" }) ?? lib.getMaterial?.(name) ?? null;
      if (m) return m;
    } catch (e) { console.warn(`[facadeKit] library failed on "${name}":`, e.message); }
  }
  return (TEMP[name] ?? TEMP.stone_white)();
}

/**
 * The material of one slot for one LOD (0 / 1), wrapped for the kit. Shared by every piece and tile.
 * opts.lab: { forceLod } (the lab shows every LOD whole, no distance fades), opts.raw: no fades at all.
 */
export function kitMaterial(slot, lod, opts = {}) {
  const m = sourceMaterial(SLOT_TABLE[slot] ?? slot);
  m.name = `kit ${slot} lod${lod}`;
  const { dx, dy, k } = sliceDelta();
  const J = attribute("aKitJ", "vec4");                         // (nx, nz, seed, tile fade)
  // the stretch, rotated to the world by the wall's normal (local x = (nz, 0, -nx)) and added after the instancing
  m.positionNode = positionLocal.add(vec3(J.y.mul(dx), dy, J.x.negate().mul(dx)));
  // AO: indirect light fully, a share of the direct (the reveals, under the hoods, behind the bars)
  const ao = pow(k.z, kitLook.aoGamma);
  const aoK = mix(float(1), ao, kitLook.aoStrength);
  m.aoNode = m.aoNode ? m.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = m.colorNode ?? vec3(m.color?.r ?? 1, m.color?.g ?? 1, m.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, kitLook.aoDirect));
  }
  if (!opts.raw) m.maskNode = opts.lab ? null : pieceKeep(lod, J.w);
  m.userData.shared = true;
  m.userData.slot = slot;
  m.userData.lod = lod;
  return m;
}

/** the uv in metres, moved with the stretched vertex (the uv flags say which of u / v come from x / y) */
export function kitUV() {
  const { dx, dy, k } = sliceDelta();
  const f = round(k.w.mul(255).div(85));
  const fx = mod(f, 2), fy = floor(f.div(2));
  return uv().add(vec2(dx.mul(fx), dy.mul(fy)));
}

// ------------------------------------------------------------------------------------------------ stand-ins
// Simple TSL materials NAMED like the library's (replaced by name when viewer/materials/ lands). They read what every
// slot gets: kitUV() in metres, the world normal, the instance seed (aVar.x). Tuned to sit with the façade shader's
// own colours (facades.js: red brick 0.29/0.085/0.05, yellow 0.4/0.27/0.14, cornice stone 0.55/0.53/0.49).
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const seed = () => attribute("aVar", "vec4").x;

/** running-bond courses on kitUV(): joint mask fading to its mean when a course is a few pixels */
function courses(w, h, joint) {
  const st = kitUV();
  const cv = st.y.div(h), row = floor(cv);
  const cu = st.x.div(w).add(mod(row, 2).mul(0.5)), cell = floor(cu);
  const fw = max(fwidth(cv), fwidth(cu));
  const jv = smoothstep(0.0, joint / h, fract(cv)).mul(smoothstep(1.0, 1.0 - joint * 0.3 / h, fract(cv)));
  const ju = smoothstep(0.0, joint / w, fract(cu));
  return { row, cell, mask: mix(jv.mul(ju), float(0.85), smoothstep(0.2, 0.6, fw)) };
}
const grime = () => {                                             // tops collect dirt, the undersides stay clean
  const up = clamp(normalWorld.y, 0, 1);
  return mix(float(1), float(0.8), up.mul(kitLook.weather));
};
const brick = (c1, c2, burnt, mortar) => () => {
  const { row, cell, mask } = courses(0.215, 0.065, 0.01);
  const h = hash2(vec2(cell, row).add(seed().mul(91.0))), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0)));
  const b = mix(lin(c1), lin(c2), h).mul(mix(float(0.85), float(1.1), h2));
  const col = mix(mix(b, lin(burnt), step(0.93, h2).mul(0.6)), lin(mortar), float(1).sub(mask));
  return std({ colorNode: col, roughnessNode: float(0.9), metalnessNode: float(0) });
};
const TEMP = {
  // the wall shader's brick (linear 0.29 / 0.085 / 0.05) as the arch's colour: the arch is the same brick, set on edge
  brick_red_brussels: brick(0x93503d, 0x7a3d2c, 0x3e2219, 0x8a8278),
  brick_yellow: brick(0xaa8c62, 0x977a52, 0x6e5a3c, 0x9a9488),
  stone_white() {
    const { row, cell, mask } = courses(0.62, 0.32, 0.005);
    const h = hash2(vec2(cell, row).add(seed().mul(37.0)));
    const col = mix(lin(0xd2cbb8), lin(0xc4bba5), h).mul(mix(float(0.9), float(1), mask)).mul(grime());
    return std({ colorNode: col, roughnessNode: float(0.82), metalnessNode: float(0) });
  },
  stone_blue() {
    // petit granit: bush-hammered dark grey, paler where the rain washes the tops, fine speckle
    const st = kitUV();
    const g = hash2(floor(st.mul(180.0))), g2 = hash2(floor(st.mul(9.0)).add(7.0));
    const up = clamp(normalWorld.y, 0, 1);
    const col = mix(lin(0x55595f), lin(0x484c52), g.mul(0.6).add(g2.mul(0.4))).mul(mix(float(1), float(1.25), up.mul(kitLook.weather)));
    return std({ colorNode: col, roughnessNode: float(0.74), metalnessNode: float(0) });
  },
  wood_frame_white() {
    const g = hash2(vec2(floor(kitUV().y.mul(40.0)), seed())).mul(0.04).add(0.96);
    return std({ colorNode: lin(0xe6e3da).mul(g), roughnessNode: float(0.42), metalnessNode: float(0) });
  },
  wood_frame_dark() {
    // varnished oak: grain along the member (u or v), dark
    const st = kitUV();
    const grain = sin(st.x.mul(220.0).add(sin(st.y.mul(13.0)).mul(3.0))).mul(0.5).add(0.5);
    const col = mix(lin(0x2a1a10), lin(0x3b2616), grain.mul(0.5).add(hash2(floor(st.mul(30.0))).mul(0.2)));
    return std({ colorNode: col, roughnessNode: float(0.38), metalnessNode: float(0) });
  },
  glass_window() {
    // the façade glass: dark room, the analytic sky reflection (no SSR on glass: facades.js), a few rooms lit at night
    const view = normalize(cameraPosition.sub(positionWorld));
    const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.55).add(0.08);
    const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
    const s = attribute("aVar", "vec4");
    const room = mix(lin(0x1a1c1c), lin(0x2b2620), hash2(vec2(s.x.mul(100.0), floor(positionWorld.y.div(3.0)))));
    const col = mix(room, sky.mul(0.7), fres);
    const lit = step(0.62, hash2(vec2(s.x.mul(57.0), floor(positionWorld.y.div(3.0)).add(floor(positionWorld.x.add(positionWorld.z)))))) ;
    const m = std({ colorNode: col, roughnessNode: float(0.06), metalnessNode: float(0) });
    m.emissiveNode = lin(0xffc27a).mul(lit).mul(env.uNight).mul(env.uInteriorGlow).mul(0.55);
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });   // no GTAO on glass (facades.js)
    return m;
  },
  cast_iron_green() { return std({ colorNode: lin(0x1f3326), roughnessNode: float(0.45), metalnessNode: float(0.35) }); },
  painted_metal_white() { return std({ colorNode: lin(0xd9d8d2), roughnessNode: float(0.4), metalnessNode: float(0.1) }); },
  zinc_roof() { return std({ colorNode: lin(0x7e8589), roughnessNode: float(0.5), metalnessNode: float(0.4) }); },
};
export const KIT_TEMP_MATERIALS = TEMP;
