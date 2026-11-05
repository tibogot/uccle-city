// THE FAÇADE OPENINGS OF ONE WALL FACE, in metres, exactly as viewer/facades.js wallMaterial() draws them (the window
// grid, the storeys, the front door, the frames, the sills). Pure JS, no three.js: used by
//   tools/interior/houseSpec.mjs    -> models/interior/<house>/house.json (the Blender build cuts the same openings)
//   viewer/interior/*               the lab's debug view and the city hook's portals
// KEEP IN SYNC with wallMaterial(): pier 0.55, bays ~2.6 m, ground storey 3.4 m then 3.0 m, window width
// min(1.2, 0.52 bay), sill / head at 0.27 / 0.77 of the ground storey and 0.29 / 0.79 above, the door 1.1 m wide and
// 0.72 of the ground storey tall in bay floor(rnd_q * bays) of a street face, a whole opening must fit 0.35 m under
// the eaves, nothing below a party wall's neighbour top + 0.3 m.
//
// face = { width, eaves (face eaves above base), partyH (0 none, 999 whole wall, else m above base), street (0/1),
//          rnd (the building hash, aBld.w: hash01(BU_ID) as float32), landmark (bool), shop: shopW (aFN.w, 0 none) }
// -> [{ kind: "window" | "door", bay, floor, u0, u1, h0, h1 (the whole opening: frame outer edge),
//       frame: 0.07, mullion (bool), transom (h of the glazing bar, windows; the door's fanlight bottom),
//       sill: { u0, u1, h0, h1 } (the blue-stone sill under a window) }]
export const G = 3.4, S = 3.0, PIER = 0.55, FRAME = 0.07;

export function faceOpenings(f) {
  const out = [];
  if (f.landmark || f.partyH >= 999 || f.width < 1.6 || f.eaves < 2.8) return out;
  const usable = Math.max(f.width - PIER * 2, 0.001);
  const nb = Math.max(Math.floor(usable / 2.6 + 0.5), 1);
  const bw = usable / nb;
  const ww = Math.min(1.2, bw * 0.52);
  const rq = Math.floor(f.rnd * 4096 + 0.5) / 4096;        // the shader quantises rnd (facades.js)
  const doorBay = Math.floor(rq * nb);
  for (let fl = 0; ; fl++) {
    const up = fl > 0, sh = up ? S : G;
    const y0 = up ? G + (fl - 1) * S : 0;                  // storey bottom above base
    const ya = up ? 0.29 : 0.27, yb = up ? 0.79 : 0.77;
    const winTop = y0 + yb * sh;
    if (y0 > f.eaves) break;
    if (f.eaves < winTop + 0.35) break;                    // the whole window fits under the eaves
    for (let k = 0; k < nb; k++) {
      const door = !!f.street && !up && k === doorBay;
      const half = door ? 0.55 : ww / 2;
      const uc = PIER + bw * (k + 0.5);
      const h0 = door ? 0 : y0 + ya * sh, h1 = door ? 0.72 * G : winTop;
      // a party wall below the neighbour's top (+ 0.3 m) is blank: the opening shows only where it is above
      if (f.partyH > 0 && h0 < f.partyH + 0.3) continue;
      // a shopfront (OSM shop) replaces the ground floor where it is (3 m high)
      if (f.shop > 0.5 && !up) {
        const shopW = f.shop - 10 * Math.floor(f.shop / 10), su = f.shopU ?? 0;
        if (Math.abs(uc - su) < shopW / 2 + half) continue;
      }
      const o = { kind: door ? "door" : "window", bay: k, floor: fl, u0: uc - half, u1: uc + half, h0, h1, frame: FRAME,
        mullion: !door && ww >= 0.95, transom: door ? FRAME + 0.78 * (0.72 * G - 2 * FRAME) : y0 + (ya + FRAME / sh + 0.7 * (yb - ya - 2 * FRAME / sh)) * sh };
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
