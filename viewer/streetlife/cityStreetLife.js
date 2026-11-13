// THE STREET-LIFE LAYER IN THE CITY (docs/streetlife/CITY.md): real shop names on the fronts, pharmacies, fuel stations,
// bpost boxes, STIB stops, Villo, glass bubbles, street plates and house numbers (viewer/streetlife/, Street Life Lab),
// streamed with the full tiles. On by default; ?streetlife=0 off (the city as before: the façade analysis's own OSM
// shopfront boxes, the OSM bus-stop poles of furniture.js).
//
//   - start(): before the first tile (the prop pools and the shared materials are in the scene, empty, so the boot
//     warm-up compiles them; one worker of its own, viewer/streetlife/streetlifeWorker.js, lays a tile out and draws its
//     labels in parallel with the tile worker)
//   - tile(name, parent): when a tile starts loading; its meshes land in `parent` (the tile's features group), so they
//     are compiled by the tile's preCompile, fade in and out with it and are disposed with it
//   - removeTile(name): from the tile's dispose (frees its atlas pages, takes its props out of the pools)
//   - the tile worker reads the same data/streetlife/<T>.json (tileData.js entry.streetlife): the façade's shop openings
//     (wall shader, façade kit) are put where this layer's shopfronts are, and the façade draws no fascia of its own
import { StreetLife, streetUniforms } from "./streetlife.js";
import { env } from "../lighting.js";

const qs = new URLSearchParams(location.search);

export const cityStreetLife = {
  on: qs.get("streetlife") !== "0",
  layer: null,
  stats: new Map(),            // tile -> its stats (worker ms, main-thread ms, counts)
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try {
      // (the STIB stops kit, viewer/stops/, on unless ?stops=old: this layer then draws the stops' text only)
      this.layer = await StreetLife.create(scene, { stopsBase: qs.get("stops") !== "old" ? new URL("../../data/stops/", import.meta.url) : null });
    } catch (e) { log(`street life: start failed (${e.message})`); this.on = false; return null; }
    updaters.push((eye, cam) => { streetUniforms.night.value = env.uNight.value; this.layer.update(cam); });
    log(`street life: on (?streetlife=0 off), ${this.layer.pools.length} prop pools, atlas ${this.layer.atlas.pages} pages of ${this.layer.atlas.W}x${this.layer.atlas.H}, ${Math.round(performance.now() - t0)} ms`);
    window.__streetlife = this;
    return this.layer;
  },
  /** build a tile's layer into `parent`; resolves to its stats, or null (no data for the tile, or off) */
  tile(name, parent) {
    if (!this.layer) return Promise.resolve(null);
    return this.layer.addTile(name, parent).then((s) => { this.stats.set(name, s); return s; }).catch(() => null);
  },
  removeTile(name) { this.layer?.removeTile(name, true); this.stats.delete(name); },
};
