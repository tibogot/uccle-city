// ONE GROUND FOR EVERY MOVER (claude/ground 2026-11-19, rule mover-ground, provisional, docs/MOVERGROUND.md). Main-thread / node
// only: not in the tile worker bundle.
//
// The player's car drives the DRAWN drive surface: the road bridges' decks (world.decks: the OSM decks + the hero road
// bridges) and the tile's drive grid (colliders.js driveGround: the drawn road / sidewalk / square / island / tram
// platform triangles rasterised on the 1 m grid, two layers). Until 2026-11-19 the traffic, the trams and the parked
// cars stood on worldRef.surface + CARVE (the carved terrain + 12 cm) with only the decks over it: wherever the street
// is drawn elsewhere (the levelled carriageways and squares of the sidewalk / roads jobs, rules 31 and 38; the drawn
// street on a deck over its fitted top) they sank into it or floated (owner playtest 2026-11-19, shots 111 / 112: 20-40 cm
// on the Carsoel deck, Place de Saint-Job, at Pasta Commedia). Now every mover calls the same function the player's car
// does (driveMode.js Driver.ground = moverGroundY):
//
//   moverGroundY(decks, tile, x, z, near)   tile = { hm, drive } (a world tile), near = the mover's current height
//                                          (NaN / null: none = the top layer); where two layers stack (a street under a
//                                          deck, the grid's second layer) the one nearest `near`
//   createMoverGround(world)               (x, z, near) -> y over the loaded tiles (world.at)
//   tileMoverGround(decks, hm, drive)      (x, z, near) -> y over one tile (a tile still being built: parked cars)
//   moverLayered(ground, x, z)             true where two layers stack (> 1.5 m apart): where a spawn without a height
//                                          would not know its layer
//
// No allocation, no raycast: one bilinear read of the grid, the decks' own tests (each has a box test first).
export const MOVER_CARVE = 0.12;          // main.js CARVE: the terrain is carved this far under a road with no drive grid

/** The drive grid's height at (x, z): colliders.js driveHeight without its per-call closure (the same numbers: the
 *  census and tools/audit/moverGroundTest.mjs check it). D = { delta, delta2 } (cm over hm.y, 65535 = none). */
export function gridLayerY(hm, D, x, z, near) {
  const h = hm.h, Y = hm.y, d1 = D.delta ?? D, d2 = D.delta2;
  const c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1), r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1);
  const c0 = Math.min(Math.floor(c), h.cols - 2), r0 = Math.min(Math.floor(r), h.rows - 2);
  const fc = c - c0, fr = r - r0, i = r0 * h.cols + c0, j = i + h.cols;
  const nr = near == null || near !== near ? null : near;
  return (cell(Y, d1, d2, i, nr) * (1 - fc) + cell(Y, d1, d2, i + 1, nr) * fc) * (1 - fr)
    + (cell(Y, d1, d2, j, nr) * (1 - fc) + cell(Y, d1, d2, j + 1, nr) * fc) * fr;
}
function cell(Y, d1, d2, k, near) {
  const a = Y[k] + d1[k] * 0.01;
  if (!d2 || near === null || d2[k] === 65535) return a;
  const b = Y[k] + d2[k] * 0.01;
  return Math.abs(b - near) < Math.abs(a - near) ? b : a;
}

/** THE mover ground (the player's car's: driveMode.js Driver.ground). decks = world.decks (fn(x, z) -> y | null, .osm),
 *  t = the world tile at (x, z) ({ hm, drive }), near = the mover's height (null / NaN: the top layer). */
export function moverGroundY(decks, t, x, z, near) {
  let dk = null, osm = false;                                                      // a road bridge's deck (hero or OSM)
  if (decks) for (let k = 0; k < decks.length; k++) { const y = decks[k](x, z); if (y != null) { dk = y; osm = !!decks[k].osm; break; } }
  const nr = near == null || near !== near ? null : near;
  const g = t.drive ? gridLayerY(t.hm, t.drive.ground, x, z, nr) : t.hm.surface(x, z) + MOVER_CARVE;
  // an OSM deck and the road drawn with it (the OSM decks' road runs on or just through the slab, e.g. 0.3 m under it
  // on the Chaussée de Waterloo, 0.4 m over it on Avenue des Hospices): the higher of the two is the surface; a
  // surface far under the deck (a street passing under the bridge) when the mover is on it: the layer nearest the
  // mover, as the grid's two layers (before 2026-11-13 the deck always won)
  if (dk == null) return g;
  if (osm && Math.abs(g - dk) < 1.5) return Math.max(g, dk);                      // (a hero deck: its own surface)
  return nr !== null && Math.abs(g - nr) + 1 < Math.abs(dk - nr) ? g : dk;
}

/** (x, z, near) -> the mover ground over the world's loaded tiles (world.at, world.decks) */
export function createMoverGround(world) {
  return (x, z, near) => moverGroundY(world.decks, world.at(x, z), x, z, near);
}

/** (x, z, near) -> the mover ground over one tile (its own grid; decks: the decks known now, e.g. main.js deckY's list) */
export function tileMoverGround(decks, hm, drive) {
  const t = { hm, drive };
  return (x, z, near) => moverGroundY(decks, t, x, z, near);
}

/** true where the mover ground has two layers at (x, z) more than 1.5 m apart (a street under a deck) */
export function moverLayered(ground, x, z) {
  const top = ground(x, z, null), low = ground(x, z, -1e9);
  return top - low > 1.5;
}
