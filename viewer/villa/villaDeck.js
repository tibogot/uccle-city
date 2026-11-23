// THE VILLA'S DRIVE DECK WITHOUT GARBAGE (claude/allocrate2, rule alloc-rate; ?villadeck=old = the old closure).
// villaCity.js pushes driveDeck(x, z) into world.decks, and every deck is asked at EVERY ground query of the city
// (moverGround.js, the drive surface layers, the walker, the parked cars, the heap drops: thousands of calls a frame,
// anywhere in Uccle). The old deck had no box test: each call transformed the point into the villa's frame, then
// `dRings.some((r) => inRingUW(r, u, w))` destructured every vertex (`const [ui, wi] = r[i]`), an array iterator and
// its result objects per vertex. The allocation sampler (tools/perf/allocSample.mjs) charged 2.9 MB a frame of the
// falcon flight to it (66 % of all sampled JS: `driveDeck > next` 2005 KB + driveDeck 863 KB), on 2026-11-23.
// Here: a world-space box of the drive rings first (a point elsewhere in the city costs four compares), then the
// point in the villa's frame by the matrix's own elements and ringTest.js's index-loop rings with a box each.
import { ringSet } from "../ringTest.js";
import { drivePlane, LIFT } from "./villaGroundsGeom.js";

export const VILLA_DECK = new URLSearchParams(globalThis.location?.search || "").get("villadeck") !== "old";

/** (x, z) -> the drive's deck height (drivePlane + LIFT) | null. dp = villa.json drive_plane, rings = its zones' rings
 *  (frame u / w), rootM / inv = the villa's frame matrix and its inverse (THREE.Matrix4: only .elements is read).
 *  The same answers as the old closure: q = (x, 0, z) * inv as Vector3.applyMatrix4 computes it, in any ring. */
export function makeDriveDeck(dp, rings, rootM, inv) {
  const set = ringSet(rings), m = rootM.elements, e = inv.elements, PAD = 0.5;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let k = 0; k < rings.length; k++) {
    const r = rings[k];
    for (let i = 0; i < r.length; i++) {
      const u = r[i][0], w = r[i][1], s = 1 / (m[3] * u + m[11] * w + m[15]);
      const x = (m[0] * u + m[8] * w + m[12]) * s, z = (m[2] * u + m[10] * w + m[14]) * s;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
  }
  x0 -= PAD; z0 -= PAD; x1 += PAD; z1 += PAD;
  /** (x, z) -> u (the villa frame's) on the drive rings | null: villaCity.js onDrive */
  const onDrive = (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return null;
    // (Vector3.applyMatrix4 of (x, 0, z): the y terms are 0 * e[4|5|6|7])
    const s = 1 / (e[3] * x + e[7] * 0 + e[11] * z + e[15]);
    const u = (e[0] * x + e[4] * 0 + e[8] * z + e[12]) * s, w = (e[2] * x + e[6] * 0 + e[10] * z + e[14]) * s;
    return set.has(u, w) ? u : null;
  };
  const deck = (x, z) => { const u = onDrive(x, z); return u == null ? null : drivePlane(dp, u) + LIFT; };
  deck.onDrive = onDrive;
  deck.box = [x0, z0, x1, z1];
  return deck;
}
