// Building façades and roofs: per-face analysis at load + procedural TSL materials.
//
// UrbIS gives real LoD2 geometry (CONTRACT 5.2) but no surfaces. This module adds plausible ones:
//
//   analysis (JS, once per tile)
//     - wall triangles are grouped into planar faces per building; each vertex gets wall-local
//       coordinates: aWall = (u along the face from its left end, face width, height above the
//       building's base, eaves height above base)
//     - each face is classified: PARTY wall (a point 0.35 m outside it lies in another footprint:
//       the shared walls of Brussels terraces: blank; parts of one building or a landmark: blank only
//       up to the neighbour's top) and STREET-facing (it looks at a road
//       centreline within 30 m: gets the front door). aBld = (style, party, street, random)
//     - roof triangles get slope-aligned coordinates aRoof = (u along the eaves, v down the slope,
//       flat 0/1, style)
//   materials (TSL)
//     - wall styles: 0 red brick, 1 brown brick, 2 yellow brick, 3 white render, 4 cream render,
//       5 grey render/concrete; blue-stone plinth, cornice band under the eaves
//     - storeys: ground floor 3.4 m, then 3.0 m; window bays sized to each face; white frames with
//       glazing bars, stone sills, glass with a sky gradient; one painted door per street face
//     - roofs: clay tiles, dark glazed tiles or slate in courses down the slope, moss and weathering;
//       flat roofs bitumen/gravel
//
// Style choice is a stable hash of the UrbIS building id (BU_ID, so all solids of one building
// match). The orthophoto can replace the roof guess later (PLAN, realism step 4).
import * as THREE from "three/webgpu";
import {
  Fn, If, attribute, positionWorld, normalWorld, cameraPosition, color, float, vec2, vec3, vec4, mix, step, smoothstep, floor, fract,
  abs, min, max, clamp, fwidth, sin, sign, dot, normalize, length, pow, atan, normalView, mrt, roughness, mod, select,
} from "three/tsl";
import { lampLight } from "./lampLight.js";
import { hash2D, noise2D, bumpNormal, filteredPulse } from "./tslkit.js";
import { env } from "./lighting.js";
import { n3, band, courses } from "./roadPaint.js";

import { analyseBuildings } from "./facadeGeom.js";
import { houseCut, cutOpacity } from "./interior/cut.js";
import { kitShows, wallKitFade } from "./facadeKit/kitFade.js";
import { FRENCH_SILL } from "./facadeKit/placement.js";
import { facadeLibOn, facadeWallLook, facadeRoofLook } from "./facadeLib.js";
export { analyseBuildings };

const C = (r, g, b) => vec3(r, g, b);

/**
 * Room behind a window, raycast in metres (interior mapping). Adapted from evaluateApartmentInterior in
 * mrdoob/slop-newyork js/tsl-materials.js (MIT, © 2026 Mr.doob); the frame comes from our face normal.
 * gx: bay coordinate along the wall (bays), gy: storey coordinate (storeys), winUV: 0..1 inside the
 * window, bayW / storeyH in metres. Returns vec4(colour, emission 0..1).
 */
const interiorRoom = Fn(([gx, gy, winUV, cellId, bayW, storeyH, seed, litProb, fw, drapeFw]) => {
  const floorIdx = floor(gy).toVar();
  const fh1 = fract(sin(floorIdx.mul(41.3).add(seed)).mul(43758.5453));
  const fh2 = fract(sin(floorIdx.mul(73.7).add(seed.mul(1.7))).mul(43758.5453));
  const roomBays = mix(float(1.0), float(2.0), step(0.5, fh1)).toVar();          // Uccle houses: 1-2 bay rooms
  const roomU = gx.add(floor(fh2.mul(roomBays))).div(roomBays).toVar();
  const roomId = vec2(floor(roomU), floorIdx).toVar();
  const roomW = bayW.mul(roomBays).toVar();
  const roomH = storeyH.mul(0.92).toVar();
  const setback = float(0.18);                                                   // thick brick walls
  const depth = roomH.mul(1.5).toVar();
  const ox = fract(roomU).sub(0.5).mul(roomW).toVar();
  const oy = winUV.y.sub(0.46).mul(roomH.mul(0.62)).toVar();
  const n = normalize(vec3(normalWorld.x, 0.0, normalWorld.z)).toVar();
  const ray = normalize(positionWorld.sub(cameraPosition)).toVar();
  const dirX = dot(ray, vec3(n.z.negate(), 0.0, n.x)).toVar();
  const dirY = ray.y.toVar();
  const dirZ = max(abs(dot(ray, n)), 0.05).toVar();
  const hw = roomW.mul(0.5), hh = roomH.mul(0.5);
  const tX = hw.sub(ox.mul(sign(dirX))).div(max(abs(dirX), 0.0001)).toVar();
  const tY = hh.sub(oy.mul(sign(dirY))).div(max(abs(dirY), 0.0001)).toVar();
  const tZ = setback.add(depth).div(dirZ).toVar();
  const t = min(min(tX, tY), tZ).toVar();
  const hit = vec3(ox.add(dirX.mul(t)), oy.add(dirY.mul(t)), dirZ.mul(t));
  const q = clamp(vec3(hit.x.div(roomW).add(0.5), hit.y.div(roomH).add(0.5), hit.z.sub(setback).div(depth)), vec3(0), vec3(1)).toVar();
  const onBack = step(tZ, tX).mul(step(tZ, tY)).toVar();
  const isY = step(tY, tX).mul(step(tY, tZ)).toVar();
  const onCeil = isY.mul(step(0.0, dirY)), onFloor = isY.mul(float(1).sub(step(0.0, dirY)));
  const s1 = hash2D(roomId.add(vec2(seed, 19.4))).toVar(), s2 = hash2D(roomId.add(vec2(seed.mul(1.9), 83.1))).toVar();
  const s3 = hash2D(roomId.add(vec2(63.2, seed.mul(0.7))));
  const lod = smoothstep(0.3, 0.8, max(fw.x, fw.y)).toVar();
  const litRoom = step(float(1).sub(litProb), s3).toVar();
  const lit = mix(litRoom, 1.0, lod);
  const lightCol = mix(mix(color(0xdfe8ff), color(0x9fb6ff), s2), mix(color(0xffb845), color(0xffe49c), s1), step(0.3, s2)).toVar();
  const wallBase = mix(mix(color(0x9a8b73), color(0x7d8580), s1), color(0xc9bda5), s2.mul(0.6)).toVar();
  const wallCol = mix(wallBase, wallBase.mul(0.5), smoothstep(0.06, 0.04, q.y));
  const boards = mix(color(0x4a3320), color(0x6a4c30), s1).mul(float(1).sub(step(0.92, fract(q.x.mul(7.0))).mul(0.3)));
  const rug = mix(color(0x7a3b32), color(0x3a5760), s2);
  const floorCol = mix(boards, rug, step(abs(q.x.sub(0.5)), 0.28).mul(step(abs(q.z.sub(0.58)), 0.25)).mul(0.88));
  const lamp = smoothstep(0.18, 0.11, length(vec2(q.x.sub(0.5), q.z.sub(0.5)))).mul(float(1).sub(lod));
  const ceilCol = mix(mix(wallBase, color(0xe8e2d5), 0.28), lightCol.mul(mix(float(0.85), float(3.8), lit)), lamp);
  const doorX = mix(float(0.24), float(0.76), s1);
  const inDoor = step(abs(q.x.sub(doorX)), 0.09).mul(step(abs(q.y.sub(0.34)), 0.34));
  const picX = mix(float(0.72), float(0.28), step(0.5, s1));
  const inFrame = step(abs(q.x.sub(picX)), 0.085).mul(step(abs(q.y.sub(0.56)), 0.095));
  const inCanvas = step(abs(q.x.sub(picX)), 0.065).mul(step(abs(q.y.sub(0.56)), 0.075));
  const backCol = mix(mix(mix(wallCol, mix(color(0x5a4631), color(0x39383c), step(0.5, s2)), inDoor), color(0x141210), inFrame),
    mix(color(0x2c3a4a), color(0x7a5a3a), fract(s1.add(s2))), inCanvas);
  const shell = mix(mix(mix(wallCol, floorCol, onFloor), ceilCol, onCeil), backCol, onBack);
  const ao = (v) => smoothstep(0.0, 0.16, v).mul(smoothstep(0.0, 0.16, float(1).sub(v)));
  const edgeAO = mix(mix(ao(q.y).mul(ao(q.z)), ao(q.x).mul(ao(q.z)), isY), ao(q.x).mul(ao(q.y)), onBack);
  const room = shell.mul(mix(float(0.66), float(1), edgeAO)).mul(mix(float(1), float(0.42), q.z)).toVar();
  // curtains just behind the glass (lace or drapes), parallax-shifted
  const cU = clamp(winUV.x.add(dirX.div(dirZ).mul(0.06)), 0.0, 1.0).toVar();
  const w1 = hash2D(cellId.add(vec2(seed.mul(0.8), 41.2))), w2 = hash2D(cellId.add(vec2(17.9, seed.mul(1.3))));
  const sL = smoothstep(0.18, 1.0, w1), sR = smoothstep(0.18, 1.0, w2);
  const lw = sL.mul(sL).mul(0.48), rw = sR.mul(sR).mul(0.48);
  const aa = drapeFw.add(0.015);
  const inL = smoothstep(lw.add(aa), lw.sub(aa), cU).mul(step(0.03, lw));
  const inR = smoothstep(float(1).sub(rw).sub(aa), float(1).sub(rw).add(aa), cU).mul(step(0.03, rw));
  // Belgian lace half-curtains (vitrage) over the lower part of many windows
  const lace = step(0.55, fract(s1.mul(3.1).add(w1))).mul(smoothstep(0.52, 0.48, winUV.y));
  const inDrape = mix(clamp(max(max(inL, inR), lace.mul(0.85)), 0.0, 1.0), 0.29, lod).toVar();
  const pick = fract(s1.mul(5.7)).mul(4.0);
  const fabric = mix(mix(mix(mix(color(0xd8cdb8), color(0xe8e4da), lace), color(0x8a7a64), step(1.0, pick).mul(float(1).sub(lace))),
    color(0x6f818b), step(2.0, pick).mul(float(1).sub(lace))), color(0x8c5a44), step(3.0, pick).mul(float(1).sub(lace)));
  const pleat = sin(cU.mul(48.0).add(w1.mul(6.28))).mul(float(1).sub(smoothstep(0.6, 1.6, drapeFw.mul(48.0)))).mul(0.2).add(0.95);
  const col = mix(room, fabric.mul(pleat).mul(0.92), inDrape);
  const emit = mix(float(1), float(0.25), inDrape);
  const warm = mix(vec3(1), lightCol, lit.mul(0.85));
  return vec4(col.mul(warm).mul(mix(float(0.85), float(1.35), lit)), litRoom.mul(emit));
});

/**
 * THE PAINTED WINDOW'S GLASS at this pixel, for the façade kit's glass panes (viewer/facadeKit/kitMaterials.js): the
 * same window grid, room (interior mapping), curtains / lace, lit rooms at night, dirt and sky reflection as
 * wallMaterial() paints, from the face the pane sits on, so the kit's windows hand over to the painted ones invisibly.
 * u, h: the pixel's façade coordinates (m along the face from its left end, m above the base); fw: the face width;
 * street: 1 if the face has the door; rnd: the building hash (aBld.w); frCode: the kit's French window (aKit.w).
 * -> { col, emissive, rough }  (KEEP IN SYNC with wallMaterial below)
 */
export function paintedGlass({ u, h, fw, street, rnd: rndIn, frCode }) {
  const P = positionWorld;
  const rnd = floor(rndIn.mul(4096.0).add(0.5)).div(4096.0).toVar();
  const pier = float(0.55);
  const usable = max(fw.sub(pier.mul(2)), float(0.001));
  const nb = max(floor(usable.div(2.6).add(0.5)), float(1)).toVar();
  const bw = usable.div(nb).toVar();
  const gx = u.sub(pier).div(bw).toVar();
  const G = float(3.4), S = float(3.0);
  const up = step(G, h);
  const gy = mix(h.div(G), h.sub(G).div(S).add(1.0), up).toVar();
  const storeyH = mix(G, S, up);
  const fwx = fwidth(gx).toVar(), fwy = fwidth(gy).toVar();
  const ww = min(float(1.2), bw.mul(0.52));
  const xa = float(0.5).sub(ww.div(bw).mul(0.5)).toVar(), xb = float(1).sub(xa).toVar();
  const ya = mix(float(0.27), float(0.29), up).toVar(), yb = mix(float(0.77), float(0.79), up).toVar();
  const fl = floor(gy);
  const doorBay = floor(rnd.mul(nb));
  const isDoor = street.mul(step(abs(floor(gx).sub(doorBay)), 0.5)).mul(float(1).sub(up)).toVar();
  const isFr = step(0.5, frCode).mul(step(abs(floor(gx).sub(mod(frCode.sub(1), 16.0))), 0.5)).mul(step(abs(fl.sub(floor(frCode.sub(1).div(16.0)))), 0.5));
  const dxa = float(0.5).sub(float(0.55).div(bw)), dxb = float(1).sub(dxa);
  const wxa = mix(xa, dxa, isDoor), wxb = mix(xb, dxb, isDoor);
  const wya = mix(mix(ya, float(FRENCH_SILL).div(storeyH), isFr), float(0.0), isDoor), wyb = mix(yb, float(0.72), isDoor);
  const fX = float(0.07).div(bw), fY = float(0.07).div(storeyH);
  const gxa = wxa.add(fX), gxb = wxb.sub(fX), gya = wya.add(fY), gyb = wyb.sub(fY);
  const wu = clamp(fract(gx).sub(gxa).div(gxb.sub(gxa)), 0.0, 1.0).toVar();
  const wv = clamp(fract(gy).sub(gya).div(gyb.sub(gya)), 0.0, 1.0).toVar();
  const view = normalize(cameraPosition.sub(P));
  const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.52).add(0.08).toVar();
  const cellId = vec2(floor(gx), floor(gy));
  const litProb = float(0.55).mul(0.62);
  const drapeFootprint = fwidth(wu);
  const room = interiorRoom(gx, gy, vec2(wu, wv), cellId, bw, storeyH, rnd.mul(100.0), litProb, vec2(fwx, fwy), drapeFootprint).toVar();
  const dirt = float(0.4).add(smoothstep(0.25, 0.0, wv).mul(0.2));
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
  let col = mix(room.rgb.mul(C(0.71, 0.78, 0.75)), C(0.05, 0.06, 0.065), dirt.mul(0.3));
  col = mix(col, sky.mul(0.7), fres);
  const emissive = room.rgb.mul(room.a).mul(float(1).sub(fres.mul(0.82))).mul(env.uInteriorGlow).mul(0.76);
  return { col, emissive, rough: mix(float(0.2), float(0.4), dirt.sub(0.4).mul(2.5)) };
}

/** opts.kit: the material of the FAÇADE KIT's faces (viewer/facadeKit/): the same painted façade, with the openings the
 *  kit's pieces fill (aKit = (on, arch rise): window B's segmental head reaches `rise` m over the painted head) cut
 *  where the kit draws (kitFade.js: the same dithered split as the pieces, so a pixel shows one or the other). */
/** Walls and roofs: front faces only. Every UrbIS triangle is wound outward since 2026-11-13 (tools/orient_buildings.mjs;
 *  85k walls + 4k roofs were inward). The shadow pass casts the FRONT faces too: r187 would cast a FrontSide material's
 *  BACK faces, and the solids have no floor (pipeline/build_buildings.py keeps it as the footprint only), so the
 *  sun-facing roof would be culled and the shadow would get a hole; the front faces close the silhouette, and they are
 *  the faces the DoubleSide pass already resolved to, at half the cost. ?bldside=double = before. */
const BLD_SIDE = /[?&]bldside=double/.test(location.search) ? THREE.DoubleSide : THREE.FrontSide;
function bldMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, side: BLD_SIDE });
  m.shadowSide = BLD_SIDE;
  return m;
}

export function wallMaterial(opts = {}) {
  const m = bldMaterial();
  const P = positionWorld;
  const wall = attribute("aWall", "vec4"), bld = attribute("aBld", "vec4");
  // aWall.w < 0: a PARAPET of the roof kit (viewer/roofs/roofPlace.js; facadeGeom.js draws its outer face as wall): the
  // wall surface continues up it, but no windows, no blind-wall marks, no cornice band
  const u = wall.x, fw = wall.y, h = wall.z, eh = abs(wall.w), par = step(wall.w, 0.0);
  // rnd quantised: it is a per-building constant, but as an interpolated vertex attribute it arrives with
  // last-bit differences per pixel, and the room / curtain hashes (sin x 43758) turned those into random
  // white dots in every window (2026-11-04; same bug as the trees' tint)
  const style = bld.x, street = bld.z, rnd = floor(bld.w.mul(4096.0).add(0.5)).div(4096.0).toVar();
  const party = step(h, bld.y.add(0.3)).mul(step(0.001, bld.y)).toVar();      // below the neighbour's top (aBld.y, m above base)
  const camDist = length(P.sub(cameraPosition)).toVar();
  const near = float(1).sub(smoothstep(16.0, 150.0, camDist)).toVar();       // relief and fine detail fade with distance
  const grain = n3(P.x.mul(5.0), P.y.mul(5.0), P.z.mul(5.0));

  // ---- window grid: corner piers, whole bays, storeys (ground floor 3.4 m, then 3.0 m)
  const pier = float(0.55);
  const usable = max(fw.sub(pier.mul(2)), float(0.001));
  const nb = max(floor(usable.div(2.6).add(0.5)), float(1)).toVar();
  const bw = usable.div(nb).toVar();
  const gx = u.sub(pier).div(bw).toVar();                                       // bay coordinate
  const G = float(3.4), S = float(3.0);
  const up = step(G, h);
  const gy = mix(h.div(G), h.sub(G).div(S).add(1.0), up).toVar();              // storey coordinate
  const storeyH = mix(G, S, up);
  const fwx = fwidth(gx).toVar(), fwy = fwidth(gy).toVar();
  const ww = min(float(1.2), bw.mul(0.52));
  const xa = float(0.5).sub(ww.div(bw).mul(0.5)).toVar(), xb = float(1).sub(xa).toVar();
  const ya = mix(float(0.27), float(0.29), up).toVar(), yb = mix(float(0.77), float(0.79), up).toVar();
  const fl = floor(gy);
  // THE STOREY'S OWN openings, box-filtered over the pixel: filteredPulse is PERIODIC, and a door (its pulse starts at
  // the storey floor, 0) leaked the NEXT storey's door into the top pixel rows of this one: a 1-3 px row at every
  // storey line over each door bay, lit / dark per 2x2 pixel quad by the bump: the "aliased dashed black lines" across
  // blank walls (owner playtest 2026-11-14, item 4; only the window grid's y, x bays are legitimately periodic)
  const yl = gy.sub(fl).toVar();
  const pulseY = (a, b, w) => clamp(min(yl.add(w.mul(0.5)), b).sub(max(yl.sub(w.mul(0.5)), a)), 0.0, 1e3).div(max(w, 0.0001));
  const winTopAbs = mix(yb.mul(G), G.add(fl.sub(1).add(yb).mul(S)), up);
  const isLM = band(style, 6).toVar();                                          // landmark (church, chapel...)
  const ok = float(1).sub(party).mul(float(1).sub(isLM)).mul(float(1).sub(par)).mul(step(float(1.6), fw)).mul(step(float(2.8), eh))
    .mul(step(winTopAbs.add(0.35), eh))                                          // the whole window fits under the eaves
    .mul(step(0.0, gx)).mul(step(gx, nb)).toVar();
  // the front door replaces one ground-floor window on a street face
  const doorBay = floor(rnd.mul(nb));
  // the kit's faces (aKit): z = 1 no door on this face (the house's door is on its widest street face: a window here),
  // w = the French window's bay + 1 + 16 x storey (its opening runs down to the storey's floor + FRENCH_SILL)
  const kitA = opts.kit ? attribute("aKit", "vec4") : null;
  const isDoor = street.mul(step(abs(floor(gx).sub(doorBay)), 0.5)).mul(float(1).sub(up)).mul(ok).mul(kitA ? float(1).sub(kitA.z) : float(1)).toVar();
  const isFr = kitA ? step(0.5, kitA.w).mul(step(abs(floor(gx).sub(mod(kitA.w.sub(1), 16.0))), 0.5)).mul(step(abs(fl.sub(floor(kitA.w.sub(1).div(16.0)))), 0.5)).mul(ok).toVar() : float(0);
  const dxa = float(0.5).sub(float(0.55).div(bw)), dxb = float(1).sub(dxa);
  const wxa = mix(xa, dxa, isDoor), wxb = mix(xb, dxb, isDoor);
  const wya = mix(mix(ya, float(FRENCH_SILL).div(storeyH), isFr), float(0.0), isDoor), wyb = mix(yb, float(0.72), isDoor);
  const cx = filteredPulse(gx, wxa, wxb, fwx), cy = pulseY(wya, wyb, fwy);
  const opening = cx.mul(cy).mul(ok).toVar();                                    // whole opening (frame + glass)
  // frame 7 cm, glass inside; a mullion and a transom
  const fX = float(0.07).div(bw), fY = float(0.07).div(storeyH);
  const gxa = wxa.add(fX), gxb = wxb.sub(fX), gya = wya.add(fY), gyb = wyb.sub(fY);
  const glassBox = filteredPulse(gx, gxa, gxb, fwx).mul(pulseY(gya, gyb, fwy)).mul(ok).toVar();
  const wu = clamp(fract(gx).sub(gxa).div(gxb.sub(gxa)), 0.0, 1.0).toVar();      // 0..1 inside the glass
  const wv = clamp(fract(gy).sub(gya).div(gyb.sub(gya)), 0.0, 1.0).toVar();
  const barX = smoothstep(float(0.035).div(ww), float(0.0), abs(wu.sub(0.5))).mul(step(float(0.95), ww));
  const barY = smoothstep(float(0.035).div(storeyH.mul(0.5)), float(0.0), abs(wv.sub(0.7)));
  const bars = max(barX, barY).mul(float(1).sub(isDoor)).mul(near.mul(0.7).add(0.3));
  const glass = glassBox.mul(float(1).sub(bars)).toVar();
  const frame = opening.sub(glassBox).add(glassBox.mul(bars)).max(0).toVar();
  // RELIEF OVER A WIDER FOOTPRINT (owner 2026-11-13: stair-stepped bright outlines round the painted windows at grazing
  // angles). The wall's normal comes from screen-space derivatives of its height (bumpNormal); a 12 cm reveal / 4 cm
  // sill / 3 cm frame step inside ONE pixel tilted it almost into the wall plane along every edge, lit or dark per 2x2
  // pixel quad: an aliased line MSAA cannot smooth (a shading edge, not a geometry edge). The colours keep their exact
  // 1-pixel edges; the HEIGHTS of the same shapes are box-filtered over RELIEF_PX pixels, so the tilt spreads (and
  // weakens) over a few pixels. (The roofs below solved the same thing with a ramp: "a step tilts the bump normal".)
  const RELIEF_PX = /[?&]relief=1px/.test(location.search) ? 1.0 : 3.0;          // ?relief=1px: before (A/B)
  const fwxR = fwx.mul(RELIEF_PX), fwyR = fwy.mul(RELIEF_PX);
  const openingR = filteredPulse(gx, wxa, wxb, fwxR).mul(pulseY(wya, wyb, fwyR)).mul(ok).toVar();
  const glassBoxR = filteredPulse(gx, gxa, gxb, fwxR).mul(pulseY(gya, gyb, fwyR)).mul(ok);
  const frameR = openingR.sub(glassBoxR).add(glassBoxR.mul(bars)).max(0).toVar();

  // ---- wall surface by style, with relief heights
  const brick = courses(h, u, 0.0675, 0.23, float(0.01), rnd.mul(97.0));
  const brickTone = brick.tone.sub(0.5).mul(0.35).add(1.0);
  const mortar = C(0.3, 0.28, 0.25);
  const brickOf = (c) => mix(c.mul(brickTone).add(grain.mul(0.01)), mortar, brick.joint);
  const stain = noise2D(vec2(u.mul(1.4), h.mul(0.05).add(rnd.mul(13.0))));      // soot streaks run down the wall
  const renderOf = (c) => c.add(grain.mul(0.012)).mul(float(1).sub(stain.mul(0.12))).sub(smoothstep(float(1.4), float(0.0), h).mul(0.05));
  let col = brickOf(C(0.29, 0.085, 0.05));
  col = mix(col, brickOf(C(0.17, 0.075, 0.045)), band(style, 1));
  col = mix(col, brickOf(C(0.4, 0.27, 0.14)), band(style, 2));
  col = mix(col, renderOf(C(0.62, 0.6, 0.55)), band(style, 3));
  col = mix(col, renderOf(C(0.56, 0.47, 0.32)), band(style, 4));
  col = mix(col, renderOf(C(0.3, 0.29, 0.27)), band(style, 5));
  const isBrick = float(1).sub(step(float(2.5), style)).toVar();
  // (2026-11-13) the wall surface from the material library's shipped sets (viewer/facadeLib.js; ?libmat=-facades: off)
  const wl = facadeLibOn() ? facadeWallLook(u, h, style, [[0.29, 0.085, 0.05], [0.17, 0.075, 0.045], [0.4, 0.27, 0.14],
    [0.62, 0.6, 0.55], [0.56, 0.47, 0.32], [0.3, 0.29, 0.27]]) : null;
  if (wl) col = wl.col;
  // ---- BLIND PARTY WALLS (owner playtest 2026-11-14: "they look empty"). A Brussels gable left bare above a lower
  // neighbour is never a clean sheet: it keeps the GHOST of an older, taller neighbour (the pitched outline of its roof
  // with the black bitumen flashing along it, the old room plaster inside it, half fallen off, a soot-dark flue strip),
  // grey cement repair patches, and rain streaks under the coping. Separate buildings only (aBld.y = 999: the whole
  // face is blind) and the wall above the eaves line of a face 4 m+ wide (the windowless upper walls the painted grid
  // leaves blank: Place Saint-Job's side walls); every edge is box-filtered over the pixel (no new aliased line),
  // low-frequency noise only.
  const aaE = fwidth(h).add(0.002);
  const aboveEaves = smoothstep(eh.add(0.25).sub(aaE), eh.add(0.25).add(aaE), h).mul(step(4.0, fw));
  const blind = max(party.mul(step(998.0, bld.y)), aboveEaves).mul(float(1).sub(isLM)).mul(float(1).sub(par)).toVar();
  const boxBand = (x, a, b, w) => clamp(min(x.add(w.mul(0.5)), b).sub(max(x.sub(w.mul(0.5)), a)), 0.0, 1e3).div(w);
  {
    const k1 = hash2D(vec2(rnd.mul(53.0), 7.1)), k2 = hash2D(vec2(rnd.mul(71.0), 3.3)), k3 = hash2D(vec2(rnd.mul(29.0), 1.7));
    // the ghost: 70 % of blind walls 4 m+ wide; eaves 5.2-7.6 m, a 35-45 degree pitch, the ridge mid-depth (<= 4.5 m up)
    const ghostOn = step(0.3, k1).mul(step(4.0, fw));
    const e1 = mix(float(5.2), float(7.6), k2), uc = fw.mul(0.5);
    const pitch = mix(float(0.7), float(1.0), k3);
    // one in three was a flat-roofed block (a level flashing line instead of the pitched one)
    const yProf = mix(min(e1.add(uc.sub(abs(u.sub(uc))).mul(pitch)), e1.add(4.5)), e1.add(k2.mul(2.0)), step(0.67, k3)).toVar();
    const d = h.sub(yProf).toVar();                                               // m above the outline (vertical)
    const aaD = fwidth(d).add(0.002);
    const inside = smoothstep(aaD, aaD.negate(), d).mul(ghostOn).toVar();
    const flashing = boxBand(d, float(-0.02), float(0.07), aaD.mul(1.5)).mul(ghostOn);       // 9 cm of bitumen
    // old room plaster (whitewash / faded distemper), fallen off in patches that show the brick; a flue strip
    const plasterCol = mix(C(0.58, 0.55, 0.49), C(0.56, 0.47, 0.42), step(0.5, k3)).mul(n3(P.x.mul(0.9), P.y.mul(0.9), P.z.mul(0.9)).mul(0.16).add(0.92));
    const loss = smoothstep(0.45, 0.55, noise2D(vec2(u.mul(0.9).add(rnd.mul(40.0)), h.mul(1.1))));
    const flueU = uc.add(mix(float(-1.6), float(1.6), k1));
    const flue = boxBand(u.sub(flueU), float(-0.25), float(0.25), fwidth(u).add(0.002)).mul(step(h, yProf.add(0.9)));
    // brick walls: the plaster, half fallen off; rendered walls: only a weathered tint (the render went over it all)
    let gcol = mix(mix(plasterCol, col, loss), col.mul(n3(P.x.mul(0.7), P.y.mul(0.7), P.z.mul(0.7)).mul(0.05).add(0.93)), float(1).sub(isBrick));
    gcol = gcol.mul(float(1).sub(flue.mul(mix(float(0.1), float(0.28), isBrick))));
    col = mix(col, gcol, inside.mul(blind));
    col = mix(col, C(0.03, 0.03, 0.032), flashing.mul(blind).mul(0.9));
    // cement repair patches (brick walls), rain streaks under the coping (all blind walls)
    const patch = smoothstep(0.66, 0.7, noise2D(vec2(u.mul(0.3).add(rnd.mul(17.0)), h.mul(0.38)))).mul(isBrick).mul(float(1).sub(inside));
    col = mix(col, C(0.36, 0.35, 0.33).mul(grain.mul(0.08).add(0.96)), patch.mul(blind).mul(0.85));
    const streak = noise2D(vec2(u.mul(2.6).add(rnd.mul(9.0)), h.mul(0.06))).mul(smoothstep(eh.sub(5.0), eh.sub(0.3), h));
    col = col.mul(float(1).sub(streak.mul(0.22).mul(blind)));
  }
  // relief: domed bricks, recessed openings, protruding sills / plinth / cornice (metres)
  let height = wl ? float(0) : isBrick.mul(float(1).sub(brick.joint)).mul(0.0045);
  height = height.sub(openingR.mul(0.12));                                       // reveal: the opening sits 12 cm back
  const aaH = fwidth(h).add(0.002), aaHR = fwidth(h).mul(RELIEF_PX).add(0.002);
  const plinth = float(1).sub(smoothstep(float(0.5).sub(aaH), float(0.5).add(aaH), h)).toVar();
  col = mix(col, C(0.075, 0.08, 0.09).add(grain.mul(0.01)), plinth);
  height = height.add(float(1).sub(smoothstep(float(0.5).sub(aaHR), float(0.5).add(aaHR), h)).mul(0.03));
  const band2 = (lo, hi, a) => smoothstep(lo.sub(a), lo.add(a), h).mul(float(1).sub(smoothstep(hi.sub(a), hi.add(a), h)));
  const cornOn = step(float(4.5), eh).mul(float(1).sub(party)).mul(float(1).sub(par));
  const corn = band2(eh.sub(0.42), eh.sub(0.12), aaH).mul(cornOn).toVar();
  col = mix(col, C(0.55, 0.53, 0.49), corn.mul(0.85));
  height = height.add(band2(eh.sub(0.42), eh.sub(0.12), aaHR).mul(cornOn).mul(0.05));
  // sills (blue stone) under every window, a shadow beneath them, lit top
  const sillX = filteredPulse(gx, wxa.sub(float(0.06).div(bw)), wxb.add(float(0.06).div(bw)), fwx);
  const sillY = pulseY(wya.sub(float(0.08).div(storeyH)), wya, fwy);
  const sill = sillX.mul(sillY).mul(ok).mul(float(1).sub(isDoor)).mul(float(1).sub(isFr)).toVar();
  const underSill = sillX.mul(pulseY(wya.sub(float(0.3).div(storeyH)), wya.sub(float(0.08).div(storeyH)), fwy)).mul(ok).mul(float(1).sub(isDoor)).mul(float(1).sub(isFr));
  col = mix(col, C(0.16, 0.165, 0.17).add(env.uSunColor.mul(0.04)), sill);
  col = col.mul(float(1).sub(underSill.mul(0.25)));
  const sillR = filteredPulse(gx, wxa.sub(float(0.06).div(bw)), wxb.add(float(0.06).div(bw)), fwxR)
    .mul(pulseY(wya.sub(float(0.08).div(storeyH)), wya, fwyR)).mul(ok).mul(float(1).sub(isDoor)).mul(float(1).sub(isFr));
  height = height.add(sillR.mul(0.04));
  // reveal shadows on the wall just inside the opening: lintel (top) and jambs
  const revealTop = smoothstep(gyb.sub(float(0.12).div(storeyH)), gyb, fract(gy)).mul(glassBox);
  const revealSide = max(smoothstep(gxa.add(float(0.1).div(bw)), gxa, fract(gx)), smoothstep(gxb.sub(float(0.1).div(bw)), gxb, fract(gx))).mul(glassBox);

  // ---- glass with the room behind it
  const n = normalize(vec3(normalWorld.x, 0.0, normalWorld.z));
  const view = normalize(cameraPosition.sub(P));
  const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.52).add(0.08).toVar();
  const cellId = vec2(floor(gx), floor(gy));
  const litProb = float(0.55).mul(0.62);
  const drapeFootprint = fwidth(wu);                                            // derivatives before the branch
  const room = Fn(() => {
    const fwv = vec2(fwx, fwy).toVar(), drapeFw = float(drapeFootprint).toVar();
    const r = vec4(0).toVar();
    If(glass.greaterThan(0.0), () => {                                           // rooms only where there is glass
      r.assign(interiorRoom(gx, gy, vec2(wu, wv), cellId, bw, storeyH, rnd.mul(100.0), litProb, fwv, drapeFw));
    });
    return r;
  })();
  const dirt = float(0.4).add(smoothstep(0.25, 0.0, wv).mul(0.2));
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
  let glassCol = mix(room.rgb.mul(C(0.71, 0.78, 0.75)), C(0.05, 0.06, 0.065), dirt.mul(0.3));
  glassCol = mix(glassCol, sky.mul(0.7), fres);
  glassCol = glassCol.mul(float(1).sub(revealTop.mul(0.42))).mul(float(1).sub(revealSide.mul(0.3)));
  // door: painted, panelled, glazed fanlight above
  const di = floor(fract(rnd.mul(31.0)).mul(4.0));
  let doorCol = C(0.05, 0.12, 0.07);
  doorCol = mix(doorCol, C(0.16, 0.03, 0.03), band(di, 1));
  doorCol = mix(doorCol, C(0.03, 0.05, 0.11), band(di, 2));
  doorCol = mix(doorCol, C(0.12, 0.06, 0.025), band(di, 3));
  const fan = step(0.78, wv);
  const panel = step(abs(wu.sub(0.5)), 0.36).mul(max(step(abs(wv.sub(0.25)), 0.17), step(abs(wv.sub(0.58)), 0.14)));
  doorCol = mix(doorCol.mul(0.7), doorCol, panel);
  const doorGlass = isDoor.mul(fan);
  const frameCol = mix(C(0.6, 0.6, 0.58), C(0.07, 0.065, 0.06), step(float(0.8), fract(rnd.mul(7.0))));

  // ---- shopfront (OSM shop on this face): painted timber frame, stall riser, big display glass, a glazed door
  const fnA = attribute("aFN", "vec4");
  const shopPaint = floor(fnA.w.div(10.0)), shopW = fnA.w.sub(shopPaint.mul(10.0));
  const su = u.sub(fnA.z).toVar();
  const isShop = step(0.5, shopW).mul(float(1).sub(isLM)).mul(step(abs(su), shopW.mul(0.5))).mul(step(h, 3.0)).toVar();
  const fwU = fwidth(u).add(0.002), fwH = fwidth(h).add(0.002);
  const inGlass = smoothstep(0.45, 0.45 + 0.02, h).mul(smoothstep(2.72, 2.7, h)).mul(smoothstep(shopW.mul(0.5).sub(0.1), shopW.mul(0.5).sub(0.12), abs(su)));
  const sDoor = step(abs(su), 0.55);
  const doorGl = sDoor.mul(step(h, 2.55)).mul(step(abs(su), 0.47)).mul(step(0.12, h));
  const shopMull = smoothstep(fwU.add(0.035), fwU.sub(0.0).add(0.03), abs(fract(su.div(1.55).add(0.5)).sub(0.5)).mul(1.55)).mul(float(1).sub(sDoor));
  const shopGlass = max(inGlass.mul(float(1).sub(shopMull)).mul(float(1).sub(sDoor)), doorGl).mul(isShop).toVar();
  let paint = C(0.03, 0.09, 0.06);
  paint = mix(paint, C(0.2, 0.035, 0.045), band(shopPaint, 1));
  paint = mix(paint, C(0.03, 0.05, 0.13), band(shopPaint, 2));
  paint = mix(paint, C(0.025, 0.025, 0.025), band(shopPaint, 3));
  const shelf = step(0.82, fract(h.div(0.42))).mul(step(0.9, h)).mul(step(h, 2.3));
  const goods = hash2D(vec2(floor(su.div(0.22)), floor(h.div(0.42)))).mul(step(0.9, h)).mul(step(h, 2.3));
  const shopInside = mix(mix(C(0.025, 0.022, 0.02), C(0.09, 0.07, 0.05).mul(goods.add(0.4)), step(0.35, goods)), C(0.012, 0.012, 0.012), shelf);
  const shopGlassCol = mix(shopInside, vec3(env.uSkyHorizon).mul(0.5), fres);
  const shopCol = mix(paint.mul(mix(float(1), float(0.7), step(h, 0.45))), shopGlassCol, shopGlass);
  const notShop = float(1).sub(isShop);

  col = mix(col, frameCol, frame.mul(notShop));
  const glassPart = glass.mul(mix(float(1), doorGlass, isDoor)).mul(notShop).toVar();
  const doorPart = glass.mul(isDoor).mul(float(1).sub(fan)).mul(notShop);
  col = mix(col, glassCol, glassPart);
  col = mix(col, doorCol, doorPart);
  col = mix(col, shopCol, isShop);
  height = height.add(frameR.mul(0.03).mul(notShop)).sub(shopGlass.mul(0.08).mul(near));

  // ---- landmarks: ashlar stone, tall round-arched stained-glass windows, a portal
  const ash = courses(h, u, 0.32, 0.62, float(0.012), rnd.mul(31.0));
  let lmCol = C(0.34, 0.315, 0.28).mul(ash.tone.sub(0.5).mul(0.22).add(1.0)).mul(float(1).sub(stain.mul(0.18))).add(grain.mul(0.01));
  lmCol = mix(lmCol, C(0.2, 0.19, 0.17), ash.joint);
  let lmH = float(1).sub(ash.joint).mul(0.006);
  const lmPlinth = float(1).sub(smoothstep(float(0.8).sub(aaH), float(0.8).add(aaH), h));
  lmCol = mix(lmCol, C(0.11, 0.115, 0.12), lmPlinth);
  lmH = lmH.add(lmPlinth.mul(0.05));
  const sc = max(smoothstep(float(0.14).add(aaH), float(0.14).sub(aaH), abs(h.sub(3.0))),
    smoothstep(float(0.14).add(aaH), float(0.14).sub(aaH), abs(fract(h.sub(3.0).div(7.0)).sub(0.5).mul(7.0).abs().sub(3.5)))).mul(step(float(3.5), eh));
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), sc);
  lmH = lmH.add(sc.mul(0.05));
  // windows: bays of ~3.6 m, window 1.4 m wide, from 3.4 m to the eaves - 1.5 m (max 10 m), round arch on top.
  // Towers (tall narrow faces) get a louvred belfry opening near the top instead.
  const tower = step(float(6.1), style).mul(step(float(12.0), eh)).toVar();
  const nbL = mix(max(floor(fw.div(3.6).add(0.5)), float(1)), float(1), tower);
  const bwL = fw.div(nbL);
  const lxC = u.sub(fw.mul(0.5)).toVar();                                       // from the middle of the face
  const roseFace = street.mul(step(float(10.0), eh)).mul(float(1).sub(step(float(6.1), style))).mul(step(float(4.5), fw)).toVar();
  const R = min(min(float(2.1), fw.mul(0.21)), min(eh.sub(1.5), float(13.4)).sub(4.6).sub(0.9).mul(0.5)).toVar();
  const roseBay = roseFace.mul(step(float(0.6), R)).mul(step(abs(lxC), R.add(0.45))).toVar();   // lancets give way to the rose
  const lx = fract(u.div(bwL)).sub(0.5).mul(bwL).toVar();
  const hwL = mix(min(float(0.7), bwL.mul(0.21)), min(float(0.8), fw.mul(0.17)), tower).toVar();
  const y0 = mix(mix(float(2.4), float(3.4), step(float(8.0), eh)), eh.sub(7.2), tower).toVar();
  const yTop = mix(min(eh.sub(mix(float(0.9), float(1.5), step(float(8.0), eh))), float(13.4)), eh.sub(2.0), tower).toVar();
  const ySpring = yTop.sub(hwL).toVar();
  const winSD = (x, y) => y.lessThan(ySpring).select(max(abs(x).sub(hwL), y0.sub(y)), length(vec2(x, y.sub(ySpring))).sub(hwL));
  const dWin = winSD(lx, h).toVar();
  const lmOk = isLM.mul(float(1).sub(party)).mul(step(float(2.2), fw)).mul(step(float(5.2), eh)).toVar();
  const aaW = fwidth(dWin).add(0.003);
  const lmWin = smoothstep(aaW, aaW.negate(), dWin).mul(lmOk).mul(float(1).sub(roseBay)).toVar();
  const surround = smoothstep(aaW, aaW.negate(), dWin.sub(0.16)).mul(float(1).sub(lmWin)).mul(lmOk);
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), surround);
  lmH = lmH.add(surround.mul(0.04)).sub(lmWin.mul(0.2));
  // deep reveal by parallax: the glass sits REVEAL m behind the wall face. Trace the view ray to that plane;
  // where it lands outside the opening we see the stone jamb / soffit / sill instead of glass.
  const fn = fnA;
  const nO = vec3(fn.x, 0.0, fn.y), tA = vec3(fn.y.negate(), 0.0, fn.x);   // outward normal, along-face (+u)
  const ray = normalize(P.sub(cameraPosition));
  const rz = max(dot(ray, nO).negate(), 0.08);
  const REVEAL = mix(float(0.38), float(0.5), tower);
  const lxs = lx.add(dot(ray, tA).div(rz).mul(REVEAL)).toVar(), hs = h.add(ray.y.div(rz).mul(REVEAL)).toVar();
  const dIn = winSD(lxs, hs);
  const glassVis = smoothstep(aaW, aaW.negate(), dIn).mul(lmWin).toVar();
  const revealK = lmWin.sub(glassVis).max(0).toVar();                           // the visible side of the opening
  // stained glass: leaded diamond lattice, a colour per pane (at the glass plane)
  const ga = lxs.add(hs).div(0.26), gb = lxs.sub(hs).div(0.26);
  const lead = max(smoothstep(0.08, 0.0, min(fract(ga), float(1).sub(fract(ga)))), smoothstep(0.08, 0.0, min(fract(gb), float(1).sub(fract(gb)))));
  const pane = hash2D(vec2(floor(ga), floor(gb)).add(rnd.mul(17.0)));
  let sg = C(0.02, 0.035, 0.12);
  sg = mix(sg, C(0.13, 0.012, 0.015), step(0.35, pane));
  sg = mix(sg, C(0.15, 0.085, 0.012), step(0.62, pane));
  sg = mix(sg, C(0.02, 0.07, 0.03), step(0.84, pane));
  const leadK = lead.mul(near.mul(0.6).add(0.4)).mul(float(1).sub(tower));
  // from outside by day stained glass reads dark, a hint of colour and the sky's sheen
  const sgDay = mix(sg.mul(0.28).add(C(0.012, 0.012, 0.015)), vec3(env.uSkyHorizon).mul(0.22), fres.mul(0.7));
  // belfry louvres: slanted boards, lit on top, dark gaps between
  const slat = fract(hs.sub(y0).div(0.24));
  const louvre = mix(C(0.015, 0.014, 0.013), C(0.16, 0.15, 0.135), smoothstep(0.45, 0.85, slat)).mul(mix(float(1), float(0.6), smoothstep(0.85, 1.0, slat)));
  // stone tracery: a central mullion splitting the lancet in two, an oculus ring in the arch head, iron saddle bars
  const aaT = fwidth(lx).add(0.004);
  const ocY = ySpring.add(hwL.mul(0.32)), ocR = hwL.mul(0.42);
  const mullion = smoothstep(float(0.055).add(aaT), float(0.055).sub(aaT), abs(lx)).mul(step(h, ocY.sub(ocR)));
  const oculus = smoothstep(float(0.045).add(aaT), float(0.045).sub(aaT), abs(length(vec2(lx, h.sub(ocY))).sub(ocR)));
  const tracery = max(mullion, oculus).mul(lmWin).mul(float(1).sub(tower)).toVar();
  const saddle = smoothstep(float(0.03).add(aaT), float(0.03).sub(aaT), abs(fract(hs.sub(y0).div(0.9)).sub(0.5).mul(0.9))).mul(step(hs, ySpring)).mul(float(1).sub(tower));
  const fill = mix(mix(sgDay, C(0.02, 0.02, 0.022), max(leadK, saddle)), louvre, tower);
  // reveal stone: in shade, darker toward the glass (soffit darkest)
  const revCol = C(0.27, 0.255, 0.23).mul(ash.tone.sub(0.5).mul(0.15).add(1.0)).mul(mix(float(0.75), float(0.45), step(ySpring, hs)));
  lmCol = mix(lmCol, mix(fill, revCol, revealK), lmWin);
  lmCol = mix(lmCol, C(0.48, 0.46, 0.42).mul(ash.tone.sub(0.5).mul(0.15).add(1.0)), tracery);
  lmH = lmH.add(tracery.mul(0.17));
  // portal: on a street face, the bay nearest the middle of the wall
  const isPortal = street.mul(lmOk);
  const pw = float(1.15), pTop = float(4.6);
  const dPortal = h.lessThan(pTop.sub(pw)).select(max(abs(lxC).sub(pw), h.negate()), length(vec2(lxC, h.sub(pTop.sub(pw)))).sub(pw));
  const portal = smoothstep(aaW, aaW.negate(), dPortal).mul(isPortal).toVar();
  const wood = C(0.09, 0.05, 0.025).mul(step(0.5, fract(lxC.div(0.28))).mul(0.25).add(0.8));
  lmCol = mix(lmCol, wood, portal);
  lmH = lmH.sub(portal.mul(0.3));
  // rose window above the portal: 12 spokes, an inner ring, a hub, a moulded surround; glass set back by parallax
  const cyR = max(pTop.add(0.7).add(R), min(eh.sub(1.5), float(13.4)).sub(R).sub(0.6)).toVar();   // high in the gable, clear of the portal
  const roseOk = roseFace.mul(lmOk).mul(step(float(0.6), R)).toVar();
  const rr = length(vec2(lxC, h.sub(cyR))).toVar();
  const aaR = fwidth(rr).add(0.003);
  const roseIn = smoothstep(R.add(aaR), R.sub(aaR), rr).mul(roseOk).toVar();
  const roseMould = smoothstep(R.add(0.24).add(aaR), R.add(0.24).sub(aaR), rr).mul(roseOk).sub(roseIn).max(0);
  const rrs = length(vec2(lxs.sub(lx).add(lxC), hs.sub(cyR)));
  const ang = atan(h.sub(cyR), lxC);
  const spokeD = abs(fract(ang.mul(12.0 / 6.2831853).add(0.5)).sub(0.5)).mul(6.2831853 / 12.0).mul(rr);
  const roseStone = max(max(smoothstep(float(0.06).add(aaR), float(0.06).sub(aaR), spokeD).mul(step(R.mul(0.14), rr)),
    smoothstep(float(0.05).add(aaR), float(0.05).sub(aaR), abs(rr.sub(R.mul(0.42))))),
    smoothstep(R.mul(0.16).add(aaR), R.mul(0.16).sub(aaR), rr)).mul(roseIn).toVar();
  const roseGlass = roseIn.sub(roseStone).max(0).mul(smoothstep(R.add(aaR), R.sub(aaR), rrs)).toVar();
  const roseRev = roseIn.sub(roseStone).max(0).sub(roseGlass).max(0);
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), roseMould);
  lmCol = mix(lmCol, mix(mix(sgDay, C(0.02, 0.02, 0.022), leadK), revCol, roseRev), roseIn.sub(roseStone).max(0));
  lmCol = mix(lmCol, C(0.48, 0.46, 0.42).mul(ash.tone.sub(0.5).mul(0.15).add(1.0)), roseStone);
  lmH = lmH.add(roseMould.mul(0.06)).add(roseStone.mul(0.15)).sub(roseIn.mul(0.15));
  const lmGlass = roseGlass.mul(float(1).sub(leadK)).add(glassVis.mul(float(1).sub(portal)).mul(float(1).sub(leadK)).mul(float(1).sub(tracery)).mul(float(1).sub(tower))).toVar();
  col = mix(col, lmCol, isLM);
  height = mix(height, lmH, isLM);

  // ---- lighting terms
  // glass is FLAT: the wall's bump on low-roughness glass made the sun's highlight sparkle pixel by pixel
  // (white speckle on every window, 2026-11-04)
  let relief = mix(bumpNormal(height.mul(near)), normalView, clamp(glassPart.add(lmGlass).add(shopGlass), 0.0, 1.0));
  // the library set's normal map on the plain wall only (not openings, frames, sills, plinth, cornice, shops, landmarks)
  const wallOnly = wl ? float(1).sub(opening).mul(float(1).sub(plinth)).mul(float(1).sub(corn)).mul(float(1).sub(sill)).mul(notShop).mul(float(1).sub(isLM)).toVar() : null;
  if (wl) relief = normalize(relief.add(wl.nView.mul(wallOnly)));
  m.normalNode = relief;
  m.colorNode = col;
  m.roughnessNode = mix(mix(mix(wl ? mix(mix(float(0.85), float(0.93), isBrick), wl.rough, wallOnly) : mix(float(0.85), float(0.93), isBrick), float(0.5), frame), mix(float(0.2), float(0.4), dirt.sub(0.4).mul(2.5)), glassPart),   // glass >= 0.18 (game-engine-v1 facade rule: no aliasing over the room)
    mix(float(0.8), float(0.15), lmGlass), isLM);
  // no metalness on glass: it made SSR reflect the WALL the glass sits in (the glass is coplanar with it): a
  // brick pattern in every window, like z-fighting (owner, 2026-11-04). The glass's reflection is the
  // analytic sky term above (fres), as slop-newyork and game-engine-v1's facade do; SSR stays for cars,
  // trams and wet ground.
  m.metalnessNode = float(0);
  // the post chain's AO weight (post.js metalRough.b): none on glass. GTAO saw the glass as part of the wall
  // plane and drew the wall's occlusion pattern into every window: bricks / lattice "z-fighting" (owner)
  m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1).sub(clamp(glassPart.add(lmGlass).add(shopGlass), 0.0, 1.0))) });
  m.emissiveNode = C(1.0, 0.8, 0.55).mul(shopInside.mul(3.5).add(0.1)).mul(shopGlass).mul(env.uInteriorGlow).mul(mix(float(0.25), float(1.1), env.uNight))   // lit shop interiors
    .add(room.rgb.mul(room.a).mul(float(1).sub(fres.mul(0.82))).mul(glassPart).mul(env.uInteriorGlow).mul(0.76)
    .add(sg.mul(lmGlass).mul(env.uInteriorGlow).mul(env.uNight).mul(2.2)));                    // stained glass lit from inside at night
  // height AO: wall feet and narrow gaps between houses get less sky
  // street lamps light the foot of the wall (fading up to ~7 m)
  m.emissiveNode = m.emissiveNode.add(col.mul(lampLight(h)));
  m.aoNode = mix(float(0.62), float(1.0), smoothstep(0.0, 9.0, h)).mul(smoothstep(0.0, 1.2, h).mul(0.2).add(0.8));
  // an interior cell is loaded (?interior=1): its house's openings are holes, its real windows and door show
  // (viewer/interior/cut.js; compiled in only then)
  if (houseCut.enabled) m.maskNode = cutOpacity(opening.mul(notShop)).greaterThan(0.5);
  if (opts.kit && opts.cut !== false) {
    // window B's segmental head over the painted opening: R = (hw^2 + rise^2) / (2 rise), y(x) = sqrt(R^2 - x^2) - (R - rise)
    const rise = kitA.y, hwW = ww.mul(0.5);
    const xm = fract(gx).sub(0.5).mul(bw);
    const Rr = hwW.mul(hwW).add(rise.mul(rise)).div(rise.mul(2).max(1e-4));
    const yArch = Rr.mul(Rr).sub(xm.mul(xm)).max(0).sqrt().sub(Rr.sub(rise));
    const above = h.sub(winTopAbs);
    const arch = step(0.0001, rise).mul(step(abs(xm), hwW)).mul(step(0.0, above)).mul(step(above, yArch)).mul(ok).mul(float(1).sub(isDoor)).mul(float(1).sub(isFr));
    const cut = max(step(0.5, opening.mul(notShop)), arch).mul(kitA.x);
    const kitHole = cut.greaterThan(0.5).and(kitShows(wallKitFade));
    m.maskNode = m.maskNode ? m.maskNode.and(kitHole.not()) : kitHole.not();
  }
  return m;
}

/** the roof kit (docs/assets/ROOFS.md): flat roofs drawn as what they are (?roofs=old: the colour with a speckle) */
const ROOFS_NEW = !/[?&]roofs=old/.test(location.search);
/**
 * A FLAT ROOF's surface from its real (orthophoto) colour `base` and the building's (u, v) along its longest side:
 *  - dark: torched bitumen felt in 1 m rolls (a 9 cm lap at each roll edge, a little glossier, its edge line), rolls of
 *    slightly different tones, end laps every 5-8 m, mineral granules, fresh repair patches, ponding stains
 *  - light grey: gravel ballast (60 % of them) or light PVC sheets 2 m wide with welded seams
 *  - green: a sedum roof (mottled green / red-brown)
 * Lines fade out under a pixel. Returns { col, rough, height (m, for the bump) }.
 */
function flatRoofLook(u, v, base, P, seed, near) {
  const lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  const green = smoothstep(0.012, 0.035, base.y.sub(max(base.x, base.z)));
  const light = smoothstep(0.13, 0.22, lum).mul(float(1).sub(green));
  const gravel = step(fract(seed.mul(13.7)), 0.6);
  // bitumen rolls
  const rv = v.div(1.0), roll = floor(rv), fv = fract(rv), w = fwidth(rv).add(1e-4);
  const sharp = float(1).sub(smoothstep(0.08, 0.3, w));                          // lines exist while a roll is > ~4 px
  const lap = float(1).sub(smoothstep(float(0.09).sub(w), float(0.09).add(w), fv)).mul(sharp);
  const edge = float(1).sub(smoothstep(float(0.0), w.mul(1.5).add(0.012), fv)).mul(sharp);
  const rollTone = hash2D(vec2(roll, seed.mul(91.0)));
  const eu = u.div(mix(float(5.0), float(8.0), rollTone)).add(rollTone.mul(3.0)), fe = fract(eu), we = fwidth(eu).add(1e-4);
  const endLap = float(1).sub(smoothstep(float(0.012).sub(we), float(0.012).add(we), fe)).mul(sharp);
  const cell = vec2(floor(u.div(2.6)), floor(v.div(2.6)));
  const patchOn = step(0.88, hash2D(cell.add(seed.mul(17.0))));
  const pc = vec2(fract(u.div(2.6)), fract(v.div(2.6)));
  const patch = patchOn.mul(smoothstep(0.18, 0.2, pc.x)).mul(smoothstep(0.82, 0.8, pc.x)).mul(smoothstep(0.25, 0.27, pc.y)).mul(smoothstep(0.75, 0.73, pc.y));
  const pond = smoothstep(0.25, 0.65, n3(P.x.mul(0.18), seed.mul(7.0), P.z.mul(0.18)));
  const gran = n3(P.x.mul(35.0), P.y.mul(35.0), P.z.mul(35.0)).mul(near);
  // weathering at the roof's scale: sun-bleached and dirty areas (+-12 %), then the rolls' own tones (+-9 %)
  const blot = n3(P.x.mul(0.06), seed.mul(5.0), P.z.mul(0.06)).add(n3(P.x.mul(0.21), 1.7, P.z.mul(0.21)).mul(0.5));
  let bit = base.mul(blot.mul(0.12).add(1.0)).mul(rollTone.sub(0.5).mul(0.18).add(1.0)).mul(gran.mul(0.08).add(1.0));
  bit = bit.mul(float(1).add(lap.mul(0.09))).mul(float(1).sub(edge.mul(0.35))).mul(float(1).sub(endLap.mul(0.25)));
  bit = mix(bit, base.mul(mix(float(0.55), float(1.25), hash2D(cell.add(3.3)))), patch.mul(0.85));   // repairs: fresh (dark) or silvered (light)
  bit = bit.mul(float(1).sub(pond.mul(0.22)));
  const bitH = lap.mul(0.003).add(patch.mul(0.002));
  // gravel ballast: pebbles (two scales), a little greyer in the hollows
  const g1 = n3(P.x.mul(28.0), 0.0, P.z.mul(28.0)), g2 = n3(P.x.mul(9.0), 3.0, P.z.mul(9.0));
  const grav = base.mul(g1.mul(0.22).mul(near.mul(0.7).add(0.3)).add(g2.mul(0.08)).add(1.0));
  // PVC: 2 m sheets, welded seams a little lighter, dirt in streaks along them
  const pv = v.div(2.0), fp = fract(pv), wp = fwidth(pv).add(1e-4);
  const seam = float(1).sub(smoothstep(float(0.02).sub(wp), float(0.02).add(wp), fp)).mul(float(1).sub(smoothstep(0.06, 0.25, wp)));
  const pvc = base.mul(float(1).add(seam.mul(0.12))).mul(float(1).sub(pond.mul(0.15))).mul(n3(P.x.mul(0.6), 1.0, P.z.mul(0.6)).mul(0.04).add(1.0));
  // sedum
  const sd = n3(P.x.mul(1.8), 2.0, P.z.mul(1.8)), sd2 = n3(P.x.mul(7.0), 5.0, P.z.mul(7.0));
  const sedum = mix(base.mul(0.8), mix(vec3(0.07, 0.1, 0.03), vec3(0.16, 0.08, 0.04), smoothstep(-0.2, 0.5, sd)), 0.45).mul(sd2.mul(0.18).add(1.0));
  const lightCol = mix(pvc, grav, gravel);
  const col = mix(mix(bit, lightCol, light), sedum, green);
  const rough = mix(mix(mix(float(0.86), float(0.55), pond.mul(0.6)), mix(float(0.62), float(0.95), gravel), light), float(0.9), green);
  const height = mix(mix(bitH, g1.mul(0.004).mul(gravel), light), sd2.mul(0.01), green).mul(near);
  return { col, rough, height };
}

export function roofMaterial() {
  const m = bldMaterial();
  const P = positionWorld;
  const r = attribute("aRoof", "vec4"), base = attribute("aRoofCol", "vec3");
  const u = r.x, v = r.y, flat = r.z, style = r.w;
  const near = float(1).sub(smoothstep(16.0, 160.0, length(P.sub(cameraPosition))));
  const grain = n3(P.x.mul(6.0), P.y.mul(6.0), P.z.mul(6.0));
  const weather = n3(P.x.mul(0.25), P.y.mul(0.25), P.z.mul(0.25));
  // tile type from the real colour: red-orange -> clay tiles, otherwise slate (Brussels' two roofs)
  const clayK = smoothstep(1.25, 1.6, base.x.div(max(base.y, 0.001))).toVar();
  const clay = courses(v, u, 0.32, 0.21, float(0.02), style.mul(53.0));
  const slate = courses(v, u, 0.25, 0.3, float(0.012), style.mul(71.0));
  const tone = mix(slate.tone, clay.tone, clayK), joint = mix(slate.joint, clay.joint, clayK);
  let col = base.mul(tone.sub(0.5).mul(mix(float(0.3), float(0.45), clayK)).add(1.0)).mul(float(1).sub(joint.mul(0.45)));
  col = col.mul(weather.mul(0.12).add(1.0)).add(grain.mul(0.006));
  const moss = smoothstep(float(0.35), float(0.8), n3(P.x.mul(0.9), P.y.mul(0.9), P.z.mul(0.9))).mul(clayK);
  col = mix(col, vec3(0.06, 0.075, 0.03), moss.mul(0.3));
  // relief: each course overlaps the one below (sawtooth), joints recessed
  const period = mix(float(0.25), float(0.32), clayK);
  // smooth ramp instead of a hard sawtooth step (a step tilts the bump normal to black); fades out once a
  // course is only a few pixels tall
  const fv = fract(v.div(period));
  const lap = smoothstep(0.0, 0.85, fv).mul(float(1).sub(smoothstep(0.9, 1.0, fv))).mul(mix(float(0.008), float(0.016), clayK));
  const fine = float(1).sub(smoothstep(period.mul(0.15), period.mul(0.5), fwidth(v)));
  const relief = lap.sub(joint.mul(0.006)).mul(near).mul(fine).mul(float(1).sub(flat));
  // flat roofs: the real colour with gravel speckle
  const flatCol = base.mul(n3(P.x.mul(30.0), 0.0, P.z.mul(30.0)).mul(0.18).add(1.0)).add(weather.mul(0.01));
  // (2026-11-13) pitched roofs: the library's shipped slate / pantile sets on the roof's real colour (viewer/facadeLib.js)
  const rl = facadeLibOn() ? facadeRoofLook(u, v, base, clayK) : null;
  if (ROOFS_NEW) {
    const fr = flatRoofLook(u, v, base, P, style, near);
    m.colorNode = mix(rl ? rl.col : col, fr.col, flat);
    const nPitch = rl ? normalize(normalView.add(rl.nView)) : bumpNormal(relief);
    m.normalNode = select(flat.greaterThan(0.5), bumpNormal(fr.height), nPitch);
    m.roughnessNode = mix(rl ? rl.rough : mix(float(0.62), float(0.78), clayK), fr.rough, flat);
    return m;
  }
  m.colorNode = mix(rl ? rl.col : col, flatCol, flat);
  m.normalNode = rl ? normalize(normalView.add(rl.nView.mul(float(1).sub(flat)))) : bumpNormal(relief);
  m.roughnessNode = mix(rl ? rl.rough : mix(float(0.62), float(0.78), clayK), float(0.95), flat);
  return m;
}

/** Meshes for one tile. */
let MATS = null;
export function buildingMeshes(doc, buf, roads, feats, pre) {
  const a = pre || analyseBuildings(doc, buf, roads, feats);
  const mk = (part, attrs, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    for (const [k, n] of attrs) g.setAttribute(k, new THREE.BufferAttribute(part[k], n));
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = name;
    return mesh;
  };
  // one set of materials for every tile (same shaders, no recompiles, never disposed with a tile)
  if (!MATS) {
    // front faces only (fixes1: every detail quad is wound by its normal now, facadeGeom.js pushQuad; DoubleSide hid 68k
    // wrongly wound triangles and doubled the fill); the shadow pass keeps both sides (the strips are open boxes on the wall)
    const detailMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.82, side: THREE.FrontSide });
    detailMat.shadowSide = THREE.DoubleSide;
    detailMat.colorNode = attribute("aCol", "vec3");
    MATS = { wall: wallMaterial(), roof: roofMaterial(), detail: detailMat };
    for (const m of Object.values(MATS)) m.userData.shared = true;
  }
  const detailMat = MATS.detail;
  const meshes = [mk(a.walls, [["aWall", 4], ["aBld", 4], ["aFN", 4]], MATS.wall, "buildings-walls"),
    mk(a.roofs, [["aRoof", 4], ["aRoofCol", 3]], MATS.roof, "buildings-roofs")];
  if (a.details.position.length) meshes.push(mk(a.details, [["aCol", 3]], detailMat, "buildings-details"));
  // the façade kit's faces (?kit=1): their own mesh, so only they pay for the cut (a discard costs early-z)
  let kitWalls = null;
  if (a.walls.kit?.position.length) {
    MATS.wallKit ??= Object.assign(wallMaterial({ kit: true }), { name: "walls (kit)" });
    MATS.wallKit.userData.shared = true;
    kitWalls = mk(a.walls.kit, [["aWall", 4], ["aBld", 4], ["aFN", 4], ["aKit", 4]], MATS.wallKit, "buildings-walls-kit");
    // out of the kit's reach the plain wall material draws them (no discard, early-z back): kitField.js swaps
    // (the far one: same painted façade, no discard)
    MATS.wallKitFar ??= Object.assign(wallMaterial({ kit: true, cut: false }), { name: "walls (kit, far)" });
    MATS.wallKitFar.userData.shared = true;
    kitWalls.userData.cutMat = MATS.wallKit; kitWalls.userData.plainMat = MATS.wallKitFar;
    meshes.push(kitWalls);
  }
  return {
    meshes, kitWalls, kit: a.kit, roofKit: a.roofKit,
    stats: a.stats, triangles: a.stats.triangles, vertices: a.stats.vertices,
  };
}
