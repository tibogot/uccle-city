// THE PROCEDURAL CITY FAÇADES ON THE MATERIAL LIBRARY (2026-11-13; docs/TEXTURE_FACTORY.md "City switch"): the wall
// surface of facades.js wallMaterial (styles 0-5: red / dark / yellow brick, white / cream / grey render) and the roof
// courses of roofMaterial take the library's SHIPPED sets (textures/scans.json) instead of the procedural courses; the
// façade keeps everything else (window grid, rooms, doors, shops, sills, plinth, cornice, landmarks, lamps).
//   - one branch per building style (a per-building constant: coherent), derivatives taken before it (WGSL);
//   - bricks: the set's own colour (the owner's / the factory's pick); renders: the set's detail scaled to the style's
//     colour (white / cream / grey from one render set); roofs: the set's detail on the ORTHOPHOTO colour of each roof
//     (clay -> roof_tiles_red, else slate), so every roof keeps its real colour;
//   - the set's normal map on the face's cotangent frame (u along the wall / eaves, v up the wall / slope).
// ?libmat=-facades (or 0): the procedural walls and roofs as before.
import { Fn, If, float, vec2, vec3, vec4, mix, fwidth, normalWorld, positionWorld, cameraViewMatrix, dot, max } from "three/tsl";
import { SCANS } from "./materials/scans.js";
import { scanLook, cotangentFrame } from "./materials/library.js";
import { libOn } from "./materials/libSwitch.js";

const WALL = ["brick_red_brussels", "brick_dark", "brick_yellow", "render_white", "render_white", "render_white"];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

let forced = null;
/** A/B (debug/libAB.js): force the next wallMaterial() / roofMaterial() on / off (null: the URL / default) */
export function setFacadeLib(on) { forced = on; }
export function facadeLibOn() {
  return (forced ?? libOn("facades")) && WALL.every((n) => SCANS[n]);
}

/** the wall surface for (u, h) metres and the building style; styleCol[k] = facades.js' colour of style k (linear,
 *  [r,g,b]) for the renders. Returns { col, rough, nView } (nView: the normal-map offset in view space) */
export function facadeWallLook(u, h, style, styleCol) {
  const looks = WALL.map((n) => scanLook(n));
  const st = vec2(u, h).toVar();
  const d = vec4(st.dFdx(), st.dFdy()).toVar();
  const fw = fwidth(u).add(fwidth(h)).mul(0.6).add(0.00005).toVar();
  const { T, B } = cotangentFrame(normalWorld, positionWorld, st);
  const n = vec2(0).toVar();
  const out = Fn(() => {
    const col = vec3(0).toVar(), r = float(0.85).toVar();
    let chain = null;
    looks.forEach((look, k) => {
      const body = () => {
        const L = look(st, { dx: d.xy, dy: d.zw, fw });
        let c = L.col.mul(L.ao);
        if (k >= 3) {                                    // renders: the set's detail around the style's own colour
          const m = SCANS[WALL[k]].meta.mean_albedo_linear, sc = styleCol[k];
          c = c.mul(vec3(sc[0] / m[0], sc[1] / m[1], sc[2] / m[2]));
        }
        // (renders: half the relief: the city's renders are mostly smooth painted ones; the set's trowel / sand relief
        // read as rough stucco under a low sun at street level)
        col.assign(c); r.assign(L.rough); n.assign(k >= 3 ? L.n.mul(0.5) : L.n);
      };
      chain = chain ? chain.ElseIf(style.lessThan(k + 0.5), body) : If(style.lessThan(k + 0.5), body);
    });
    return vec4(col, r);
  })();
  const off = cameraViewMatrix.mul(vec4(T.mul(n.x).add(B.mul(n.y)), 0)).xyz;
  return { col: out.rgb, rough: out.a, nView: off };
}

/** the roof surface: the set's detail (normalised by its mean) on the roof's real colour `base`; clayK 0..1 */
export function facadeRoofLook(u, v, base, clayK) {
  const tiles = scanLook("roof_tiles_red"), slate = scanLook("slate");
  if (!tiles || !slate) return null;
  const mT = SCANS.roof_tiles_red.meta.mean_albedo_linear, mS = SCANS.slate.meta.mean_albedo_linear;
  const st = vec2(u, v).toVar();
  const d = vec4(st.dFdx(), st.dFdy()).toVar();
  const fw = fwidth(u).add(fwidth(v)).mul(0.6).add(0.00005).toVar();
  const { T, B } = cotangentFrame(normalWorld, positionWorld, st);
  const n = vec2(0).toVar();
  const out = Fn(() => {
    const det = vec3(1).toVar(), r = float(0.7).toVar();
    If(clayK.greaterThan(0.5), () => {
      const L = tiles(st, { dx: d.xy, dy: d.zw, fw });
      det.assign(L.col.mul(L.ao).div(float(lum(mT)))); r.assign(L.rough); n.assign(L.n);
    }).Else(() => {
      const L = slate(st, { dx: d.xy, dy: d.zw, fw });
      det.assign(L.col.mul(L.ao).div(float(lum(mS)))); r.assign(L.rough); n.assign(L.n);
    });
    return vec4(det, r);
  })();
  // luminance detail only (the hue stays the roof's real colour), kept within a sane range
  const dl = dot(out.rgb, vec3(0.2126, 0.7152, 0.0722)).clamp(0.2, 2.5);
  const off = cameraViewMatrix.mul(vec4(T.mul(n.x).add(B.mul(n.y)), 0)).xyz;
  return { col: base.mul(dl), rough: out.a, nView: off };
}
