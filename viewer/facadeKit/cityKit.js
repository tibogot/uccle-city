// THE FAÇADE KIT IN THE CITY, behind ?kit=1 until the owner approves. main.js:
//   - tileData(): entry.kit / entry.kitExclude -> the tile worker places the pieces (placement.js inside the façade
//     analysis) and splits the kit's faces into their own wall mesh (facades.js wallMaterial({ kit: true }));
//   - before the first tile: cityKit.start() loads models/facadekit/kit.{json,bin} (one fetch each, ~1.5 MB) and puts
//     the kit's (empty) meshes in the scene, so the boot warm-up compiles every kit material (no shader build when a
//     tile streams in); one per-frame updater re-buckets the instances;
//   - loadTile(): cityKit.addTile(name, kit, kitWalls) as the tile fades in (its kit fades with it), dispose ->
//     removeTile.
// EXCLUDED (no kit where a model replaces the building): the interior pilot (BU 1786120, with ?interior=1), the hero
// buildings' BU_IDs (Saint-Job is hidden from the tiles already; the Royal Observatory and the town hall, from their
// branches' models/*/<name>.json placement.hides_bu_ids, listed here so the kit never lands on them, merged or not).
import { loadKitField } from "./kitField.js";

const qs = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const BU = (n) => `https://databrussels.be/id/building/${n}`;
const HEROES = [
  // Royal Observatory (branch claude/observatory, models/observatory/observatory.json)
  1582397, 1583217, 1588268, 1591539, 1591599, 1595474, 1711955, 1713062, 1713064, 1713072, 1713075, 1713077, 1714175, 1714191,
  1718724, 1718832, 1719884, 1722084, 1725520, 1725529, 1725530, 1725546, 1726827,
  // Uccle town hall (branch claude/townhall, models/townhall/townhall.json)
  1596445,
].map(BU);
const INTERIOR = BU(1786120);

export const cityKit = {
  on: qs.get("kit") === "1",
  exclude: [...HEROES, ...(qs.get("interior") === "1" ? [INTERIOR] : [])],
  field: null,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try {
      this.field = await loadKitField();
    } catch (e) { log(`façade kit: load failed (${e.message})`); this.on = false; return null; }
    scene.add(this.field.group);
    updaters.push((eye) => this.field.update(eye));
    const k = this.field.json;
    log(`façade kit: ${Object.keys(k.pieces).length} pieces, ${(k.bytes / 1024).toFixed(0)} KB, ${this.field.meshes.size} instanced meshes (empty until a street is near), ${Math.round(performance.now() - t0)} ms`);
    window.__kit = this.field;
    return this.field;
  },
  addTile(name, kit, kitWalls, instant) {
    if (!this.field || !kit) return;
    this.field.addTile(name, kit, kitWalls, { instant });
  },
  removeTile(name) { this.field?.removeTile(name); },
};
