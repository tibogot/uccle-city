// THE FAÇADE OPENINGS OF ONE WALL FACE, in metres, exactly as viewer/facades.js wallMaterial() draws them (the window
// grid, the storeys, the front door, the frames, the sills). Pure JS, no three.js: used by
//   tools/interior/houseSpec.mjs    -> models/interior/<house>/house.json (the Blender build cuts the same openings)
//   viewer/interior/*               the lab's debug view and the city hook's portals
// KEEP IN SYNC with wallMaterial(): pier 0.55, bays ~2.6 m, ground storey 3.4 m then 3.0 m (x k: storeyFit), window width
// min(1.2, 0.52 bay), sill / head at 0.27 / 0.77 of the ground storey and 0.29 / 0.79 above, the door 1.1 m wide and
// 0.72 of the ground storey tall in bay floor(rnd_q * bays) of a street face, a whole opening must fit 0.35 m under
// the eaves, nothing below a party wall's neighbour top + 0.3 m.
//
// face = { width, eaves (face eaves above base), partyH (0 none, 999 whole wall, else m above base), street (0/1),
//          rnd (the building hash, aBld.w: hash01(BU_ID) as float32), landmark (bool), shop: shopW (aFN.w, 0 none),
//          fit (false: ?storeys=old, the fixed storeys) }
// -> [{ kind: "window" | "door", bay, floor, u0, u1, h0, h1 (the whole opening: frame outer edge),
//       frame: 0.07, mullion (bool), transom (h of the glazing bar, windows; the door's fanlight bottom),
//       sill: { u0, u1, h0, h1 } (the blue-stone sill under a window) }]
export const G = 3.4, S = 3.0, PIER = 0.55, FRAME = 0.07;
// BUILDING TYPES (docs/STYLES.md): f.type picks the window grid's row in TYPE_GRID (buildingTypes.js; 0 = the generic
// grid of before), f.garage a garage door in the street front's ground floor (kind "garage"). KEEP IN SYNC with
// facades.js typeParams.
import { TYPE_GRID, garageBay, GARAGE_H } from "../buildingTypes.js";

// FITTED STOREYS (docs/STOREYS.md; ?storeys=old = the fixed 3.4 / 3.0 m storeys, a storey dropped when its window
// missed the eaves by a few cm). The storeys fill the face's height: span = eaves - STOREY_TOP (the top storey's
// ceiling under the eaves line), n = round(span / STOREY_STEP) storeys, all scaled by one k so the ground storey stays
// 3.4 / 3.0 = 1.13 x the upper ones; k clamped to [K_MIN, K_MAX] (upper storeys 2.6-3.6 m). k is quantised to 1/128
// (exact in float32: the shader, this file and the kit's glass, which gets k packed in aKitF.y, agree to the bit).
// KEEP IN SYNC with facades.js storeyFit().
export const STOREY_TOP = 0.3, STOREY_STEP = 3.25, K_MIN = 0.87, K_MAX = 1.2;
/** eaves (m above the ground-floor line) -> { n, k, G, S } (fit === false: the fixed storeys, k = 1) */
export function storeyFit(eaves, fit = true, type = 0) {
  if (!fit) return { n: Infinity, k: 1, G, S };
  const T = TYPE_GRID[type] || TYPE_GRID[0], step = Math.fround(T[7]), kMin = Math.fround(T[8]), kMax = Math.fround(T[9]);
  const span = Math.fround(eaves - STOREY_TOP);
  let n = Math.max(1, Math.floor(span / step + 0.5));
  if (n > 1 && span / (G + S * (n - 1)) < kMin) n--;
  let k = Math.min(Math.max(span / (G + S * (n - 1)), kMin), kMax);
  k = Math.floor(k * 128 + 0.5) / 128;
  return { n, k, G: G * k, S: S * k };
}

export function faceOpenings(f) {
  const out = [];
  const type = f.type | 0, TG = TYPE_GRID[type] || TYPE_GRID[0], fr = Math.fround;
  const { G, S } = storeyFit(f.eaves, f.fit !== false, type);
  if (f.landmark || f.partyH >= 999 || f.width < 1.6 || f.eaves < 2.8) return out;
  const usable = Math.max(f.width - PIER * 2, 0.001);
  const nb = Math.max(Math.floor(usable / 2.6 + 0.5), 1);
  const bw = usable / nb;
  const ww = Math.min(fr(TG[0]), bw * fr(TG[1]));
  const rq = Math.floor(f.rnd * 4096 + 0.5) / 4096;        // the shader quantises rnd (facades.js)
  const doorBay = Math.floor(rq * nb);
  const raise = fr(TG[6]);
  const garBay = f.garage && f.street ? garageBay(nb, doorBay) : -1;
  for (let fl = 0; ; fl++) {
    const up = fl > 0, sh = up ? S : G;
    const y0 = up ? G + (fl - 1) * S : 0;                  // storey bottom above base
    const ya = fr(up ? TG[4] : TG[2]), yb = fr(up ? TG[5] : TG[3]);
    const winTop = y0 + yb * sh;
    if (y0 > f.eaves) break;
    if (f.eaves < winTop + 0.35) break;                    // the whole window fits under the eaves
    for (let k = 0; k < nb; k++) {
      const door = !!f.street && !up && k === doorBay;
      const uc = PIER + bw * (k + 0.5);
      if (!up && k === garBay) {
        // the garage door: min(2.5, bay - 0.25) wide, GARAGE_H tall from the ground-floor line (facades.js isGar)
        const gh = Math.min(2.5, bw - 0.25) / 2;
        if (!(f.partyH > 0 && 0 < f.partyH + 0.3)) out.push({ kind: "garage", bay: k, floor: 0, u0: uc - gh, u1: uc + gh, h0: 0, h1: GARAGE_H, frame: FRAME });
        continue;
      }
      const half = door ? (type === 4 || type === 7 ? Math.min(1.0, bw * 0.4) : 0.55) : ww / 2;   // (styles) the blocks' (and the curtain walls') wide glazed entrance
      const h0 = door ? raise : y0 + ya * sh, h1 = door ? 0.72 * G + 0.5 * raise : winTop;
      // a party wall below the neighbour's top (+ 0.3 m) is blank: the opening shows only where it is above
      if (f.partyH > 0 && h0 < f.partyH + 0.3) continue;
      // a shopfront (OSM shop) replaces the ground floor where it is (3 m high)
      if (f.shop > 0.5 && !up) {
        const shopW = f.shop - 10 * Math.floor(f.shop / 10), su = f.shopU ?? 0;
        if (Math.abs(uc - su) < shopW / 2 + half) continue;
      }
      const o = { kind: door ? "door" : "window", bay: k, floor: fl, u0: uc - half, u1: uc + half, h0, h1, frame: FRAME,
        mullion: !door && ww >= 0.95, transom: door ? h0 + FRAME + 0.78 * (h1 - h0 - 2 * FRAME) : y0 + (ya + FRAME / sh + 0.7 * (yb - ya - 2 * FRAME / sh)) * sh };
      if (!door) o.sill = { u0: o.u0 - 0.06, u1: o.u1 + 0.06, h0: h0 - 0.08, h1: h0 };
      out.push(o);
    }
  }
  return out;
}

/** Bays of a face (for the layout): count, width, and the door bay. */
export function faceBays(f) {
  const usable = Math.max(f.width - PIER * 2, 0.001);
  const nb = Math.max(Math.floor(usable / 2.6 + 0.5), 1);
  return { nb, bw: usable / nb, doorBay: Math.floor((Math.floor(f.rnd * 4096 + 0.5) / 4096) * nb) };
}
