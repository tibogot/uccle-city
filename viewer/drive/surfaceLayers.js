// THE DRIVABLE SURFACE LAYERS of a place, with no car in it (claude/drivecheck). Main-thread / node only: not in the
// tile worker bundle.
import { driveHeight } from "./colliders.js";

/**
 * drivecheck (docs/DRIVECHECK.md, rule 27 provisional): the drivable surface LAYERS at (x, z), whatever the car does:
 * { top, low }. top = what a car there drives on with no hint (driveMode.ground with no car: a road deck, else the
 * drive grid's top layer; an OSM deck within 1.5 m of the street drawn with it: the higher one), low = the highest other
 * surface more than 1.5 m under top (the cutting under a hero deck, the street under an OSM deck: the grid's second
 * layer), else NaN; deck = a road deck is the top here. decks = world.decks (fn(x, z) -> y | null, .osm), hm = the tile's Heightmap, ground = its
 * drive.ground ({ delta, delta2 }; null: the terrain + 0.12). The hero colliders measure their car band from these,
 * never from driveMode.ground, which picks the layer nearest the CAR (viewer/heroColliders.js).
 */
export function surfaceLayers(decks, hm, ground, x, z) {
  let dk = null, osm = false;
  if (decks) for (const f of decks) { const y = f(x, z); if (y != null) { dk = y; osm = !!f.osm; break; } }
  let g1, g2 = NaN;
  if (ground) {
    g1 = driveHeight(hm, ground, x, z, null);
    if (ground.delta2) { const b = driveHeight(hm, ground, x, z, -1e9); if (b < g1 - 1e-3) g2 = b; }
  } else g1 = hm.surface(x, z) + 0.12;
  const top = dk == null ? g1 : osm && Math.abs(g1 - dk) < 1.5 ? Math.max(g1, dk) : dk;
  let low = NaN;
  for (const v of [g1, g2, dk]) if (v != null && Number.isFinite(v) && v < top - 1.5 && !(v <= low)) low = v;
  return { top, low, deck: dk != null };
}
