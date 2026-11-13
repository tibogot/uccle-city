// THE CITY'S GRASS (?grass=1, default OFF: the owner decides when it goes on). docs/GRASS.md "City".
// One Grass (viewer/grass/grass.js) for the session; every full tile hands its terrain, road meshes and buildings to the
// grass field (grassField.js) when it loads and takes them back when it unloads. One updater: the field re-bake when
// needed + the compute pass, before the frame renders. Needs the WebGPU backend (WebGL2: the textured ground alone).
import { Grass } from "./grass.js";
import { grassTypeData, trunkDiscs } from "./grassTypes.js";
import { wind } from "../foliage/wind.js";

const params = new URLSearchParams(location.search);

export const cityGrass = {
  on: params.get("grass") === "1",
  grass: null,
  kinds: null,
  /** before the first tile (so the first frames, under the boot cover, build its shaders) */
  async start({ scene, renderer, updaters, world, lighting = null, log = () => {} }) {
    if (!this.on) return;
    if (!Grass.supported(renderer)) { log("grass: needs WebGPU (the textured ground alone)"); this.on = false; return; }
    this.kinds = await fetch(new URL("../../data/grass/osm_grass.json", import.meta.url)).then((r) => r.json()).then((d) => d.kinds).catch(() => null);
    const g = new Grass(renderer, { preset: params.get("grasspreset") || "high", lights: lighting ? [lighting.sun, lighting.hemi].filter(Boolean) : null });
    g.groundAt = (x, z) => (world.tiles.length ? world.ground(x, z) : 0);
    scene.add(g.group);
    this.grass = g;
    let last = performance.now();
    updaters.push((pos, cam) => {
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
      wind.update(dt);
      g.update(cam, dt);
    });
    window.grass = g;            // console tuning (grassU via import), read-outs: grass.readCounts()
    log(`grass: on (preset ${g.presetName})`);
  },
  /** a full tile's surfaces (loadTile, after its terrain / roads / buildings exist) */
  async addTile(entry, base, { terrain, roads = [], buildings = [], feats, bounds, cover }) {
    if (!this.grass) return;
    const t0 = performance.now();
    const surfaces = entry.files.surfaces ? await fetch(new URL(entry.files.surfaces, base)).then((r) => r.json()).catch(() => null) : null;
    const t1 = performance.now();
    const types = grassTypeData(feats, bounds, { kinds: this.kinds, surfaces });
    this.grass.field.addTile(entry.name, {
      terrain, cover, types, bounds,
      grass: roads.filter((m) => m.name === "roads-grass"),
      solids: [...roads.filter((m) => m.name !== "roads-grass"), ...buildings],
      trunks: trunkDiscs(feats, bounds),
    });
    return { typesMs: +(performance.now() - t1).toFixed(1), fetchMs: +(t1 - t0).toFixed(1) };
  },
  removeTile(name) { this.grass?.field.removeTile(name); },
};
