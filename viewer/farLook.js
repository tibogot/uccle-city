// THE FAR CITY'S LOOK (docs/FARCITY.md; ?farlook=old = the flat-coloured solids of before). One material for every far
// tile's buildings (walls and roofs in one mesh: one draw a tile, as before), the near façade's look reduced to what
// still reads from 150 m and more:
//   walls: the building's wall colour (the same style / type draw as the full tile, the brick means of the material
//     library's sets the near walls show, the art deco renders' light tints), its TYPE's window grid (buildingTypes.js
//     TYPE_GRID: bays, window width, sill / head, the fitted storeys of facades.js storeyK: the same formulas, so the
//     grid lands where the near one does at the hand-over), frames, glass with the sky's sheen, the blue-stone plinth,
//     blind party walls, the near walls' height AO (darker at the foot) plus a soft ground-contact band;
//   roofs: the real (orthophoto) colour, tile / slate courses down the slope as zero-mean stripes (they average out to
//     the same colour), flat roofs plain;
//   no per-pixel noise, no texture: every pattern is a box-filtered pulse (tslkit.js filteredPulse), so it melts into
//   its average colour as it shrinks under a pixel (mip-friendly, no shimmer under TAAU).
// Data: viewer/farLookData.js (worker): aFA / aFB per vertex.
import * as THREE from "three/webgpu";
import { uniform, attribute, positionWorld, normalWorld, cameraPosition, float, vec2, vec3, mix, step, smoothstep, floor, fract, abs, min, max, clamp, fwidth, dot, normalize, pow, length, select } from "three/tsl";
import { filteredPulse, hash2D } from "./tslkit.js";
import { env } from "./lighting.js";
import { band } from "./roadPaint.js";
import { storeyK } from "./facades.js";
import { G as G0, S as S0 } from "./interior/facadeWindows.js";
import { TYPE_GRID } from "./buildingTypes.js";
import { SCANS } from "./materials/scans.js";
import { facadeLibOn } from "./facadeLib.js";

const C = (r, g, b) => vec3(r, g, b);
/** column i of TYPE_GRID for the type t (as facades.js tsel) */
const tsel = (t, i) => {
  let v = float(TYPE_GRID[0][i]);
  for (let k = 1; k < TYPE_GRID.length; k++) if (TYPE_GRID[k][i] !== TYPE_GRID[0][i]) v = select(t.equal(float(k)), float(TYPE_GRID[k][i]), v);
  return v;
};
// the wall colours per style (facades.js wallMaterial; 0 red brick, 1 brown / klinker, 2 yellow brick, 3 white render,
// 4 cream render, 5 grey render / concrete); with the material library on, the bricks are the sets' own colour: their mean
const STYLE_COL = [[0.29, 0.085, 0.05], [0.17, 0.075, 0.045], [0.4, 0.27, 0.14], [0.62, 0.6, 0.55], [0.56, 0.47, 0.32], [0.3, 0.29, 0.27]];
const LIB_BRICK = ["brick_red_brussels", "brick_dark", "brick_yellow"];

let MAT = null;
// night: the share of lit windows and their glow, matched to the full tiles' (facades.js interiorRoom: rooms lit 0.55 x
// 0.62, a lit room's colour behind drapes / lace) on the same buildings seen full and far (docs/FARCITY.md round 2)
export const FAR_NIGHT = { share: uniform(0.26), gain: uniform(0.26) };   // (round 1: 0.38 / 0.9: 2.1x the full tiles' light, 3.8x the bright pixels)
/** the far buildings' material (one, shared by every far tile) */
export function farBuildingMaterial() {
  if (MAT) return MAT;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  m.name = "far buildings";
  const A = attribute("aFA", "vec4"), B = attribute("aFB", "vec4");
  const P = positionWorld;
  const isRoof = step(B.y, -0.5).toVar();
  // ---------------------------------------------------------------- walls
  const u = A.x, fw = A.y, h = A.z, eh = A.w;
  const style = B.x, partyH = B.y, rnd = floor(B.w.mul(4096.0).add(0.5)).div(4096.0).toVar();
  const tq = floor(B.z.add(0.5));
  const bt = floor(mod8(tq)).toVar();                                       // the type (0-5)
  const gable = step(7.5, tq);                                                 // + 8: the face rises over its eaves (a gable)
  const isM = band(bt, 1), isD = band(bt, 2), isBE = band(bt, 3), isK = band(bt, 4);
  const isLM = step(5.5, style).toVar();
  const th1 = fract(rnd.mul(113.0)), th2 = fract(rnd.mul(271.0));
  // colour
  const lib = facadeLibOn();
  const sc = STYLE_COL.map((c, k) => {
    const mean = lib && k < 3 ? SCANS[LIB_BRICK[k]]?.meta?.mean_albedo_linear : null;
    return mean ? [mean[0], mean[1], mean[2]] : c;
  });
  let col = C(...sc[0]);
  for (let k = 1; k < 6; k++) col = mix(col, C(...sc[k]), band(style, k));
  // the art deco renders' light tints (facades.js: cream, off-white, pale ochre, pale grey over the style's render)
  const pal = mix(mix(C(0.74, 0.7, 0.6), C(0.79, 0.78, 0.74), step(0.3, th1)), mix(C(0.7, 0.61, 0.46), C(0.67, 0.68, 0.67), step(0.85, th1)), step(0.6, th1));
  const baseR = mix(C(0.62, 0.6, 0.55), C(0.56, 0.47, 0.32), band(style, 4));
  col = mix(col, col.mul(pal.div(baseR)), isD.mul(step(2.5, style)));
  // (cortenbosch2) the 1990s house's face brick (facades.js tone6: the style's code) and the curtain wall's dark glass
  const isN = band(bt, 6), isCW = band(bt, 7);
  const tcode = floor(style.sub(floor(style.add(1e-4))).mul(200.0).add(0.5)), nTone = floor(tcode.div(12.0));
  const tone6 = mix(mix(mix(mix(mix(C(0.55, 0.43, 0.26), C(0.56, 0.28, 0.16), band(nTone, 1)), mix(C(0.6, 0.55, 0.43), C(0.4, 0.13, 0.06), band(nTone, 3)), step(1.5, nTone)), C(0.33, 0.19, 0.1), band(nTone, 4)), C(0.55, 0.4, 0.19), band(nTone, 5)), C(0.68, 0.68, 0.65), band(nTone, 6));
  col = mix(col, tone6.mul(0.92), isN);
  const cwGrid = tcode.sub(floor(tcode.div(4.0)).mul(4.0));
  const grid7 = mix(mix(C(0.26, 0.035, 0.05), C(0.07, 0.072, 0.078), band(cwGrid, 1)), mix(C(0.5, 0.51, 0.52), C(0.04, 0.09, 0.06), band(cwGrid, 3)), step(1.5, cwGrid));
  col = mix(col, mix(C(0.03, 0.033, 0.038), grid7, 0.3), isCW);
  // a building's own tone (+-6 %): a row of one style is never one flat colour
  col = col.mul(th2.sub(0.5).mul(0.12).add(1.0));
  col = mix(col, C(0.42, 0.4, 0.36), isLM);                                   // landmarks: ashlar stone
  // the window grid (facades.js: corner piers 0.55, bays ~2.6 m, the type's window, the fitted storeys)
  const pier = float(0.55);
  const usable = max(fw.sub(pier.mul(2)), float(0.001));
  const nb = max(floor(usable.div(2.6).add(0.5)), float(1));
  const bw = usable.div(nb).toVar();
  const gx = u.sub(pier).div(bw).toVar();
  const sk = storeyK(eh, vec3(tsel(bt, 7), tsel(bt, 8), tsel(bt, 9)));
  const G = sk.mul(G0).toVar(), S = sk.mul(S0).toVar();
  const up = step(G, h);
  const gy = mix(h.div(G), h.sub(G).div(S).add(1.0), up).toVar();
  const storeyH = mix(G, S, up);
  const fwx = fwidth(gx).toVar(), fwy = fwidth(gy).toVar();
  const ww = min(tsel(bt, 0), bw.mul(tsel(bt, 1)));
  const xa = float(0.5).sub(ww.div(bw).mul(0.5)), xb = float(1).sub(xa);
  const ya = mix(tsel(bt, 2), tsel(bt, 4), up), yb = mix(tsel(bt, 3), tsel(bt, 5), up);
  const fl = floor(gy);
  const winTopAbs = mix(yb.mul(G), G.add(fl.sub(1).add(yb).mul(S)), up);
  const party = step(h, partyH.add(0.3)).mul(step(0.001, partyH));
  const ok = float(1).sub(party).mul(float(1).sub(isLM)).mul(step(1.6, fw)).mul(step(2.8, eh))
    .mul(step(winTopAbs.add(0.35), eh)).mul(step(0.0, gx)).mul(step(gx, nb)).mul(step(0.0, h)).toVar();
  const opening = filteredPulse(gx, xa, xb, fwx).mul(filteredPulse(gy, ya, yb, fwy)).mul(ok).toVar();
  const fX = float(0.08).div(bw), fY = float(0.08).div(storeyH);
  const glassBox = filteredPulse(gx, xa.add(fX), xb.sub(fX), fwx).mul(filteredPulse(gy, ya.add(fY), yb.sub(fY), fwy)).mul(ok).toVar();
  const frame = opening.sub(glassBox).max(0);
  // frames (facades.js: white / dark per building; art deco steel dark 70 %; post-war white / brown / aluminium)
  let frameCol = mix(C(0.6, 0.6, 0.58), C(0.07, 0.065, 0.06), step(0.8, fract(rnd.mul(7.0))));
  const decoF = mix(C(0.04, 0.05, 0.045), C(0.6, 0.6, 0.58), step(0.7, th2));
  const modF = mix(mix(C(0.6, 0.6, 0.58), C(0.09, 0.055, 0.035), step(0.4, th2)), C(0.36, 0.37, 0.38), step(0.75, th2));
  frameCol = mix(mix(frameCol, decoF, isD), modF, isBE.add(isK).add(isN).min(1));
  frameCol = mix(frameCol, grid7, isCW);
  // glass: a dark room with the sky's sheen (fresnel as the near glass); per window a little lighter / darker (curtains,
  // lit rooms), the variation fading to its mean once a window is under a few pixels (no sparkle)
  const view = normalize(cameraPosition.sub(P));
  const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.52).add(0.08);
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
  const cellK = hash2D(vec2(floor(gx), floor(gy)).add(rnd.mul(37.0)));
  const small = smoothstep(0.15, 0.5, max(fwx, fwy));
  const roomT = mix(cellK.mul(0.8).add(0.6), float(1.0), small);
  const glassCol = mix(C(0.05, 0.048, 0.045).mul(roomT), sky.mul(0.7), fres);
  // blue-stone plinth (maison de maître 0.9 m) and the near walls' height AO; a soft contact band at the foot
  const plinthTop = mix(float(0.5), float(0.9), isM);
  const aaH = fwidth(h).add(0.01);
  const plinth = float(1).sub(smoothstep(plinthTop.sub(aaH), plinthTop.add(aaH), h)).mul(float(1).sub(isLM)).mul(step(2.0, eh));
  let wall = mix(col, C(0.125, 0.13, 0.137), plinth);
  // a light coping / cornice line under the eaves (the near detail strips: 16-34 cm) on the faces that rise to the eaves
  const corBand = clamp(min(h.add(aaH.mul(0.5)), eh).sub(max(h.sub(aaH.mul(0.5)), eh.sub(0.28))), 0.0, 1e3).div(aaH);
  const cor = corBand.mul(float(1).sub(party)).mul(step(3.0, eh)).mul(float(1).sub(isLM)).mul(float(1).sub(gable));
  // the eaves' shadow: the roof overhang / cornice shades the top ~0.6 m of an eaves face (a soft band, sun-independent)
  const eavesSh = smoothstep(eh.sub(0.9), eh.sub(0.25), h).mul(float(1).sub(gable)).mul(float(1).sub(party)).mul(step(3.0, eh)).mul(float(1).sub(isLM));
  wall = mix(wall, mix(C(0.52, 0.5, 0.46), C(0.6, 0.58, 0.54), step(2.5, style)), cor.mul(0.8));
  wall = wall.mul(float(1).sub(eavesSh.mul(0.3)));
  wall = mix(wall, frameCol, frame);
  wall = mix(wall, glassCol, glassBox);
  const wallAO = mix(float(0.62), float(1.0), smoothstep(0.0, 9.0, h)).mul(smoothstep(0.0, 1.2, h).mul(0.2).add(0.8));
  // ---------------------------------------------------------------- roofs
  const rc = A.xyz, flat = A.w;
  const clayK = smoothstep(1.25, 1.6, rc.x.div(max(rc.y, 0.001)));
  // courses down the slope: v = height / sin(slope); zero-mean stripes (joint darker, the course's lower lip lighter)
  const sinS = max(length(normalWorld.xz), 0.2);
  const v = P.y.div(sinS);
  const per = mix(float(0.25), float(0.32), clayK);
  const cv = v.div(per), fwv = fwidth(cv);
  const joint = filteredPulse(cv, float(0.0), float(0.12), fwv);
  const lip = filteredPulse(cv, float(0.12), float(0.3), fwv);
  const stripes = lip.sub(0.18).mul(0.18).sub(joint.sub(0.12).mul(0.45)).mul(float(1).sub(flat));
  // a roof's own tone (+-5 %) per building, the flat roofs a little mottled by the building hash only
  const roof = rc.mul(float(1).add(stripes)).mul(fract(rnd.mul(59.0)).sub(0.5).mul(0.1).add(1.0));
  // ---------------------------------------------------------------- out
  m.colorNode = mix(wall, roof, isRoof);
  m.roughnessNode = mix(mix(float(0.88), float(0.25), glassBox), mix(mix(float(0.7), float(0.8), clayK), float(0.9), flat), isRoof);
  m.aoNode = mix(wallAO, float(1.0), isRoof);
  // night: some rooms lit (the near windows' interior glow, uInteriorGlow x uNight); the per-window draw melts into the
  // mean share once a window is under a few pixels (FAR_NIGHT above)
  const lit = mix(step(float(1).sub(FAR_NIGHT.share), cellK), FAR_NIGHT.share, small);
  m.emissiveNode = C(1.0, 0.68, 0.36).mul(glassBox).mul(lit).mul(float(1).sub(isRoof)).mul(env.uInteriorGlow).mul(env.uNight).mul(FAR_NIGHT.gain);
  m.userData.shared = true;
  MAT = m;
  return m;
}
const mod8 = (t) => t.sub(floor(t.div(8.0)).mul(8.0));
