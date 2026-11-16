// THE LIT-WINDOW HASH, exact on the CPU and the GPU (night round 3, step 6; docs/NIGHT_HOOKUP.md).
//
// The façade shader (viewer/facades.js interiorRoom) decides which rooms are lit at night, which windows share a room
// and the room light's colour from hashes of (room, storey, building). Those were sin x 43758 hashes: on the GPU,
// float32 sin of a large argument differs from a CPU's double in the last bits, and x 43758 turns that into a
// different number, so no CPU copy could say which window is lit. Now: an integer hash (u32 multiply / xor / shift,
// wrapping), bit-exact in WGSL and in JS (Math.imul, >>>), on integer inputs only (the storey index, the room index,
// the building hash quantised to 1/4096 as the shader already does). ?litwin=old: the sin hashes (no CPU copy: the
// worker's window lights then follow the new hash, not what is drawn).
//
// Pure JS (no three.js): imported by the tile worker (viewer/facadeGeom.js, the window records) and by facades.js
// (the TSL twin, litHashNode in facades.js, KEEP IN SYNC).
import { faceOpenings } from "../interior/facadeWindows.js";

export const LIT_PROB = Math.fround(0.55 * 0.62);           // the shader's litProb (float32)
/** u32 hash of three integers -> [0, 1) with 24 bits (exact in float32) */
export function h3(a, b, c) {
  let h = (Math.imul(a | 0, 0x8da6b343) ^ Math.imul(b | 0, 0xd8163841) ^ Math.imul(c | 0, 0xcb1ab31f)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h >>> 8) / 16777216;
}
/** the building hash as the shader quantises it (aBld.w = float32 rnd, x 4096, rounded) */
export const seedOf = (rnd) => Math.floor(Math.fround(rnd) * 4096 + 0.5);

/** the room of window bay k on storey fl: { lit, s1, s2 } (as interiorRoom: rooms of 1-2 bays per storey) */
export function roomOf(k, fl, seed) {
  const fh1 = h3(fl, seed, 11), fh2 = h3(fl, seed, 12);
  const bays = fh1 >= 0.5 ? 2 : 1;
  const rx = Math.floor((k + 0.5 + Math.floor(fh2 * bays)) / bays);
  const s1 = h3(rx, fl, seed * 4 + 1), s2 = h3(rx, fl, seed * 4 + 2), s3 = h3(rx, fl, seed * 4 + 3);
  return { lit: s3 >= 1 - LIT_PROB, s1, s2 };
}

// the room light's colour (linear; color(hex) in TSL is sRGB -> linear): cool (TV / fluorescent) when s2 < 0.3, else
// warm tungsten / LED from amber to pale yellow
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hex = (h) => [lin(((h >> 16) & 255) / 255), lin(((h >> 8) & 255) / 255), lin((h & 255) / 255)];
const COOL0 = hex(0xdfe8ff), COOL1 = hex(0x9fb6ff), WARM0 = hex(0xffb845), WARM1 = hex(0xffe49c);
const mix3 = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
const col = [0, 0, 0];

export const NIGHT_WIN_STRIDE = 10;      // x y z (the opening's centre on the wall), nx nz (outward), half width, half height, r g b
/**
 * The LIT windows of one wall face, appended to `out` (a plain array, NIGHT_WIN_STRIDE floats each).
 * f: faceOpenings' face { width, eaves, partyH, street, rnd, landmark, shop, shopU, fit } + the face's frame in the
 * world: u0 (the u of its left end along the tangent), tx tz (tangent), nx nz (outward normal), dd (the wall plane's
 * offset along the normal), base (the ground-floor line, m).
 */
export function litWindows(f, out) {
  const ops = faceOpenings(f);
  if (!ops.length) return 0;
  const seed = seedOf(f.rnd);
  let n = 0;
  for (const o of ops) {
    if (o.kind !== "window") continue;
    const r = roomOf(o.bay, o.floor, seed);
    if (!r.lit) continue;
    const c = r.s2 >= 0.3 ? mix3(WARM0, WARM1, r.s1, col) : mix3(COOL0, COOL1, r.s2, col);
    // (f.us: the face's bay scale, facadeGeom.js look bayScale: the openings are in u x us)
    const us = f.us || 1, u = (o.u0 + o.u1) / 2 / us + f.u0, h = (o.h0 + o.h1) / 2;
    out.push(f.tx * u + f.nx * f.dd, f.base + h, f.tz * u + f.nz * f.dd, f.nx, f.nz, ((o.u1 - o.u0) / 2 - o.frame) / us, (o.h1 - o.h0) / 2 - o.frame, c[0], c[1], c[2]);
    n++;
  }
  return n;
}
