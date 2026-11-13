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
      this.pushFrame(dt);
      g.update(cam, dt);
    });
    window.grass = g;            // console tuning (grassU via import), read-outs: grass.readCounts()
    log(`grass: on (preset ${g.presetName})`);
  },
  /** a full tile's surfaces (loadTile, after its terrain / roads / buildings exist) */
  /** types: the tile worker's grassTypeData() result (tileData.js, entry.grass); without it (no worker) built here */
  async addTile(entry, base, { terrain, roads = [], buildings = [], feats, bounds, cover, types = null }) {
    if (!this.grass) return;
    const t0 = performance.now();
    const surfaces = !types && entry.files.surfaces ? await fetch(new URL(entry.files.surfaces, base)).then((r) => r.json()).catch(() => null) : null;
    const t1 = performance.now();
    types ||= grassTypeData(feats, bounds, { kinds: this.kinds, surfaces });
    this.grass.field.addTile(entry.name, {
      terrain, cover, types, bounds,
      grass: roads.filter((m) => m.name === "roads-grass"),
      solids: [...roads.filter((m) => m.name !== "roads-grass"), ...buildings],
      trunks: trunkDiscs(feats, bounds),
    });
    return { typesMs: +(performance.now() - t1).toFixed(1), fetchMs: +(t1 - t0).toFixed(1) };
  },
  removeTile(name) { this.grass?.field.removeTile(name); },
  /** who lays the grass down (main.js sets it once they exist): { driver, walker } */
  pushers: null,
  _walk: null,
  /** a few uniform writes a frame: the car's 4 wheels (pushers 0-3), the walker's feet (4); off = cleared once */
  pushFrame(dt) {
    const g = this.grass, P = this.pushers;
    if (!g || !P) return;
    const ground = (x, z) => g.groundAt(x, z);
    const c = P.driver?.on ? P.driver.state : null;
    if (c) {
      const s = Math.sin(c.heading), co = Math.cos(c.heading);       // forward (sin h, cos h), right (cos h, -sin h)
      let i = 0;
      for (const f of [1.3, -1.25]) for (const r of [0.78, -0.78]) {
        const x = c.x + s * f + co * r, z = c.z + co * f - s * r, gy = ground(x, z);
        g.push.set(i++, { x, y: gy, z, radius: 0.4, strength: 1, vx: c.vx, vz: c.vz, ground: gy });
      }
      this._car = true;
    } else if (this._car) { for (let i = 0; i < 4; i++) g.push.clear(i); this._car = false; }
    const w = P.walker?.on ? P.walker : null;
    if (w) {
      const gy = ground(w.x, w.z), p = this._walk || { x: w.x, z: w.z };
      const k = dt > 0 ? 1 / dt : 0;
      g.push.set(4, { x: w.x, y: gy, z: w.z, radius: 0.32, strength: 0.8, vx: (w.x - p.x) * k, vz: (w.z - p.z) * k, ground: gy });
      this._walk = { x: w.x, z: w.z };
    } else if (this._walk) { g.push.clear(4); this._walk = null; }
  },
};
