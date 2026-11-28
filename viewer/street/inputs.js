// The street model's inputs (claude/street2, rule street-model): data/roads/network.json, data/overrides.json and the
// measured inputs (surfaces.json AS FETCHED + markings.json) of every tile the model of a tile reads
// (viewer/street/model.js neededTiles). Cached per worker / process: the network once, a bounded LRU of tile inputs,
// and the element store (an element is built once per process and shared by every tile that holds it).
import { networkIndex, neededTiles, tileInputs } from "./model.js";

const LRU_TILES = 24, STORE_MAX = 8000;
const tiles = new Map();          // name -> tileInputs | null (LRU: re-inserted on use)
let store = new Map();
const touch = (name) => { const v = tiles.get(name); tiles.delete(name); tiles.set(name, v); return v; };
const trim = (keep) => { for (const k of tiles.keys()) { if (tiles.size <= LRU_TILES) break; if (!keep.has(k)) tiles.delete(k); } if (store.size > STORE_MAX) store = new Map(); };

/** the tile worker: { network, overrides, tile, inputsOf, store } for buildStreetModel (fetches what is missing). base =
 *  the URL of data/tiles/; ver = the tiles' "?v=" query (from the entry's own files) */
let netP = null;
export async function streetModelInputs({ base, name, bounds, overrides, ver = "" }) {
  netP ??= fetch(new URL("../roads/network.json", base)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const network = await netP;
  if (!network) return null;
  const N = networkIndex(network, overrides);
  const need = neededTiles(N, bounds);
  const q = ver ? `?${ver}` : "";
  const get = (p) => fetch(new URL(p, base)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  // (held in a snapshot for this tile: another tile's fetch may trim the LRU before this one's road stage runs)
  const snap = new Map();
  await Promise.all(need.map(async (t) => {
    if (tiles.has(t)) { snap.set(t, touch(t)); return; }
    const [surf, mk] = await Promise.all([get(`${t}/surfaces.json${q}`), get(`${t}/markings.json${q}`)]);
    const v = surf ? tileInputs(t, surf, mk) : null;
    tiles.set(t, v); snap.set(t, v);
  }));
  trim(new Set(need));
  return { network, overrides, tile: name, inputsOf: (t) => snap.get(t) ?? null, store, need };
}

/** node (tools/road_audit/tile.mjs): the same from the files, readJson(path relative to the repo) -> object | null */
let netDoc = null;
export function streetModelInputsSync({ readJson, name, bounds, overrides }) {
  netDoc ??= readJson("data/roads/network.json");
  if (!netDoc) return null;
  const N = networkIndex(netDoc, overrides);
  const need = neededTiles(N, bounds);
  for (const t of need) if (!tiles.has(t)) { const surf = readJson(`data/tiles/${t}/surfaces.json`); tiles.set(t, surf ? tileInputs(t, surf, readJson(`data/tiles/${t}/markings.json`)) : null); }
  const snap = new Map(need.map((t) => [t, touch(t) ?? null])); trim(new Set(need));
  return { network: netDoc, overrides, tile: name, inputsOf: (t) => snap.get(t) ?? null, store, need };
}
