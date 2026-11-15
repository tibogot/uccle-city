// THE GAME'S PLACES (docs/GAMEKIT.md "Places"): every real, named spot a mission can send the player to, in one catalogue.
// Sources (all real data, nothing invented):
//   place   viewer/places.js PLACES (the dev panel's Go to: the landmarks, Place Saint-Job, the police station...), at `t`
//   lm      the map's 67 landmarks (data/map/map.json: heroes, churches, stations, castles), id "lm:<id>"
//   area    the map's named parks / woods / cemeteries / ponds, id "area:<n>"
//   stop    the 15 tram 92 stops (STIB GTFS), id "stop:<name>"
//   shop    463 named shops / cafes / restaurants (OSM, data/game/places.json by tools/game/build_places.py), id "shop:<osm id>"
// Only places inside the built tiles are kept (a mission never sends the player off the map).
// API: get(id) · resolve(spec) · pick({ kinds, near, min, max, exclude, filter, rng }) · all
//   spec: "stjob" | "shop:osm:n123" | [x, z] | { x, z, name } | (kit) => spec
import { PLACES } from "../places.js";

const KIND_WORDS = {
  restaurant: "restaurant", fast_food: "snack bar", cafe: "café", bar: "bar", pub: "pub", pharmacy: "pharmacy", bank: "bank",
  bakery: "bakery", supermarket: "supermarket", convenience: "convenience store", clothes: "clothes shop", hairdresser: "hairdresser",
  butcher: "butcher", florist: "florist", chocolate: "chocolatier", books: "bookshop", bicycle: "bike shop", optician: "optician",
  deli: "delicatessen", pastry: "pâtisserie", jewelry: "jeweller", wine: "wine shop", ice_cream: "ice-cream parlour",
};
export const kindWord = (k) => KIND_WORDS[k] || String(k).replace(/_/g, " ");

export class GamePlaces {
  /** manifest: the tile manifest (built tiles); mapInfo: the map client's ready info { landmarks, stops, areas } */
  constructor(manifest) {
    this.tiles = manifest.tiles.filter((t) => t.status !== "missing").map((t) => t.bounds);
    this.byId = new Map();
    this.all = [];
    for (const p of PLACES) this.add({ id: p.id, name: p.name, kind: "place", group: p.group, x: p.t[0], z: p.t[2] });
  }
  inBuilt(x, z) { return this.tiles.some((b) => x >= b.x[0] && x < b.x[1] && z >= b.z[0] && z < b.z[1]); }
  add(p) {
    if (this.byId.has(p.id) || !this.inBuilt(p.x, p.z)) return;
    this.byId.set(p.id, p); this.all.push(p);
  }
  /** the map's landmarks / areas / tram stops (once the map worker is ready) */
  addMap(info) {
    for (const l of info.landmarks || []) this.add({ id: `lm:${l.id}`, name: l.fr, nl: l.nl, kind: l.kind, group: "landmark", x: l.x, z: l.z });
    (info.areas || []).forEach((a, i) => { if (a.fr) this.add({ id: `area:${i}`, name: a.fr, nl: a.nl, kind: a.kind, group: "area", x: a.x, z: a.z, area: a.area }); });
    for (const s of info.stops || []) this.add({ id: `stop:${s.name}`, name: `${s.name} (tram 92)`, kind: "tram_stop", group: "stop", x: s.x, z: s.z });
  }
  /** the baked shops (data/game/places.json) */
  async loadShops(base = new URL("../../data/game/", import.meta.url)) {
    const doc = await fetch(new URL("places.json", base)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    for (const [id, name, kind, x, z] of doc?.shops || []) this.add({ id: `shop:${id}`, name, kind, group: "shop", x, z, what: kindWord(kind) });
    return this.all.length;
  }
  get(id) { return this.byId.get(id) || null; }
  /** a spec -> { id?, name, x, z, ... } or null */
  resolve(spec, kit) {
    if (spec == null) return null;
    if (typeof spec === "function") return this.resolve(spec(kit), kit);
    if (typeof spec === "string") return this.get(spec);
    if (Array.isArray(spec)) return { name: spec[2] || "the marker", x: spec[0], z: spec[1] };
    if (typeof spec.x === "number") return { name: "the marker", ...spec };
    if (spec.place) return this.get(spec.place);
    return null;
  }
  /** a random place: kinds / groups (a list of kind or group names, or "*"), at min..max m from near, not in exclude */
  pick({ kinds = ["*"], near = null, min = 0, max = Infinity, exclude = [], filter = null, rng = Math.random } = {}) {
    const ok = this.all.filter((p) => (kinds.includes("*") || kinds.includes(p.kind) || kinds.includes(p.group)) && !exclude.includes(p.id) && (!filter || filter(p))
      && (!near || ((d) => d >= min && d <= max)(Math.hypot(p.x - near.x, p.z - near.z))));
    return ok.length ? ok[Math.floor(rng() * ok.length)] : null;
  }
}
