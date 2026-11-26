// the OSM diplomatic places in the commune, with their tile, their UrbIS building and its street (door) face
// (tools/gardens/faces.mjs: the faces the city's façade code draws). Shared by tools/embassy/places.mjs (the placed
// poles) and tools/audit/embassyFlagsCheck.mjs (the gate row).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** pipeline/common.py wgs_to_local as the quadratic of tools/audit/census/gates.mjs (max error 0.7 mm over the city) */
export const toLocal = (lon, lat) => { const u = lon - 4.36, v = lat - 50.795;
  return [739.99186 + 70503.28252 * u + 12.080496 * v + 0.0552472 * u * u - 1498.13872 * u * v - 0.0076268 * v * v,
    445.514106 + 7.6565977 * u - 111239.18349 * v - 474.759393 * u * u - 0.174368 * u * v - 14.558541 * v * v]; };
/** the inverse (Newton on the quadratic) -> [lon, lat] */
export const toWgs = (x, z) => {
  let lon = 4.36 + (x - 740) / 70503.3, lat = 50.795 - (z - 445.5) / 111239.2;
  for (let k = 0; k < 6; k++) { const [px, pz] = toLocal(lon, lat); lon -= (px - x) / 70503.3; lat += (pz - z) / 111239.2; }
  return [lon, lat];
};
export const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [a, b] = r[i], [e, f] = r[j]; if ((b > z) !== (f > z) && x < ((e - a) * (z - b)) / (f - b) + a) c = !c; } return c; };
const COLS = "ABCDEFGHIJKLMNO";
export const tileOf = (x, z) => COLS[Math.floor(x / 500) + 6] + (Math.floor(z / 500) + 5);

/** the OSM places (data/raw/osm/diplomatic.json, pipeline/fetch_diplomatic.py) inside the commune */
export function communePlaces() {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/raw/osm/diplomatic.json"), "utf8"));
  const g = JSON.parse(fs.readFileSync(path.join(ROOT, "pipeline/uccle_boundary.geojson"), "utf8"));
  const ring = g.features[0].geometry.coordinates[0].map(([lo, la]) => toLocal(lo, la));
  const out = [];
  for (const el of d.elements) {
    const c = el.center ?? { lat: el.lat, lon: el.lon }, [x, z] = toLocal(c.lon, c.lat);
    if (!pip(x, z, ring)) continue;
    out.push({ osm: `${el.type}/${el.id}`, country: el.tags.country ?? null, kind: el.tags.diplomatic ?? el.tags.amenity, name: el.tags["name:en"] ?? el.tags.name, x, z, tile: tileOf(x, z) });
  }
  return { places: out, osmBase: d.osm3s?.timestamp_osm_base ?? null };
}

/** the buildings of a tile: [{ i, ring, base, eaves, top, bu }] */
export function tileBuildings(tile) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/tiles", tile, "buildings.json"), "utf8"));
  return d.buildings.map((b, i) => ({ i, ring: b.footprint[0], base: b.base, eaves: b.eaves, top: b.top, bu: String(b.attrs?.BU_ID || b.id) }));
}
