// PLACE LINKS AND THE BOOT TILE (claude/villamark, rule enterable-places-findable; docs/VILLA.md "Showing it").
//
//   ?place=<id>[&view=third]   a shareable link per place: an ENTERABLE place (data/places/enterable.json) boots at its
//                              entry spot, facing its door, in third person unless ?view= says otherwise; a viewer/places.js
//                              place boots its camera (orbit: at t from p; ?view=third / walk: at p facing t).
//                              (?quick=1 has its own ?place: viewer/quick.js, untouched here.)
//   ?at=x,z&view=third[&heading=deg | &look=x,z]   the character starts AT x, z (not on the nearest road), facing the
//                              heading (degrees clockwise from north, -z) or the look point; neither: along the nearest road.
//
// THE ?at BUG (2026-11-24, the owner's link ?at=912,2036&view=third spawned the character at Saint-Job): with no ?tile the
// boot tile was always I6 (Saint-Job), the start point was the nearest road of THE BOOT TILE (main.js roadStart clips to
// its bounds), and third person started at that point: a spot 1.5 km away from ?at, on I6's edge. Now the boot tile is the
// one under ?at (bootTile below; ?attile=old: I6 as before) and third person starts at ?at itself (?atthird=old: the road
// start as before); an ?at whose tile is not in yet streams it in first (main.js thirdPerson -> teleport).
import { PLACES } from "./places.js";

export const ENTERABLE_URL = new URL("../data/places/enterable.json", import.meta.url);
let cache = null;
/** the enterable places (data/places/enterable.json "places"); [] when the file is missing */
export const loadEnterable = () => (cache ||= fetch(ENTERABLE_URL).then((r) => (r.ok ? r.json() : { places: [] })).then((j) => j.places || []).catch(() => []));

const COLS = "ABCDEFGHIJKLMNO";
/** the manifest tile name under city (x, z): 500 m tiles, G1 = x 0..500, z -2000..-1500 (data/tiles/manifest.json grid) */
export const tileNameAt = (x, z) => `${COLS[Math.floor(x / 500) + 6] ?? "?"}${Math.floor(z / 500) + 5}`;

export const parseAt = (params) => { const a = params.get("at")?.split(",").map(Number); return a?.length >= 2 && a.slice(0, 2).every(Number.isFinite) ? a.slice(0, 2) : null; };

/** the boot tile: ?tile, else the tile under ?at (?attile=old: I6), else I6 (Saint-Job). { name, derived } */
export function bootTile(params) {
  const t = params.get("tile");
  if (t) return { name: t.toUpperCase(), derived: false };
  const at = params.get("attile") !== "old" ? parseAt(params) : null;
  return at ? { name: tileNameAt(at[0], at[1]), derived: true } : { name: "I6", derived: false };
}

/** ?place=<id>: writes the place's ?at / ?heading / ?cam / ?view into params (a switch already there wins). */
export async function placeLink(params) {
  const id = params.get("place");
  if (!id || params.get("quick") === "1") return null;
  const ent = await loadEnterable();
  const pl = PLACES.find((p) => p.id === id);
  const e = ent.find((q) => q.id === id) || (pl?.enter && ent.find((q) => q.id === pl.enter));
  const put = (k, v) => { if (!params.get(k)) params.set(k, v); };
  if (e) {
    put("at", `${e.entry[0]},${e.entry[1]}`);
    if (!params.get("look")) put("heading", String(e.heading));
    put("view", "third");
    return { kind: "enter", ...e };
  }
  if (!pl) { console.warn(`[place] unknown place "${id}" (data/places/enterable.json, viewer/places.js)`); return null; }
  const v = params.get("view");
  if (v === "third" || v === "walk") { put("at", `${pl.p[0]},${pl.p[2]}`); put("look", `${pl.t[0]},${pl.t[2]}`); }
  else { put("at", `${pl.t[0]},${pl.t[2]}`); put("cam", `${pl.p[0]},${pl.p[2]},${pl.p[1]}`); put("view", "stjob"); }
  return { kind: "place", ...pl };
}

/** the facing asked at (x, z): ?look=x,z (the point), else ?heading=deg; radians clockwise from north, or null */
export function atBearing(params, x, z) {
  const l = params.get("look")?.split(",").map(Number);
  if (l?.length >= 2 && l.slice(0, 2).every(Number.isFinite) && Math.hypot(l[0] - x, l[1] - z) > 0.01) return Math.atan2(l[0] - x, -(l[1] - z));
  const h = Number(params.get("heading"));
  return params.get("heading") != null && Number.isFinite(h) ? h * Math.PI / 180 : null;
}
