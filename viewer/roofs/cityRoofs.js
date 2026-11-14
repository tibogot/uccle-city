// THE ROOF TOPS IN THE CITY (docs/assets/ROOFS.md). On by default; ?roofs=old = the roofs as before (box chimneys on the
// party walls only, bare flat roofs, no parapets).
//
//   - data: none of its own: the tile worker places everything from the UrbIS roofs it already reads
//     (viewer/roofs/roofPlace.js inside viewer/facadeGeom.js analyseBuildings): chimney stacks on party walls / gables /
//     ridges, parapets + copings round flat roofs (drawn with the façades), roof windows, solar arrays, flat-roof
//     furniture; deterministic per building (BU_ID hash)
//   - drawing: the kit (viewer/roofs/roofKit.js) as ONE pool per piece for the whole city (LOD0-2), streamed by
//     viewer/instanceStream.js (a gather every 4 m of travel, 14 m of margin, time-sliced inside the city's streaming budget; the tile fade
//     is a uniform per tile slot)
//   - collisions: the pieces' boxes are stamped into the falcon's drawn-roof grid in the worker (roofPlace.js
//     stampRoofCols -> viewer/tileData.js roofSurface): the bird hits the stacks, parapets and roof furniture it sees (the
//     G key draws that grid). Nothing on a roof can be reached on foot or by car.
import * as THREE from "three/webgpu";
import { loadRoofKit, RoofPool, PIECES, roofSources, roofFades } from "./roofKit.js";
import { Streamer } from "../instanceStream.js";

const ROOF_MARGIN = 14, ROOF_TRIGGER = 4;

const qs = new URLSearchParams(location.search);

export const cityRoofs = {
  on: qs.get("roofs") !== "old",
  kit: null, pools: [], tiles: new Map(), group: null, streamer: null,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadRoofKit(); } catch (e) { log(`roofs: kit failed (${e.message})`); this.kit = null; return null; }
    this.group = new THREE.Group(); this.group.name = "roofs";
    scene.add(this.group);
    // a wider margin and trigger than the street-level pools (6 / 2 m): the roof kit's bands reach 480 m, so a gather
    // copies many instances (~10 frames a gather on a 9-tile ring); with 6 m the camera outran it at car speed
    // (432 forced gathers on the Saint-Job drive); 14 m / 4 m: half the gathers, none forced (docs/assets/ROOFS.md)
    for (const p of PIECES) this.pools.push(new RoofPool(this.kit.pieces[p], this.kit.mats, this.group, ROOF_MARGIN));
    this.streamer = new Streamer({ name: "roofs", pools: this.pools.map((p) => p.stream), fades: roofFades, budget: 0.3, margin: ROOF_MARGIN, trigger: ROOF_TRIGGER });
    updaters.push((eye, cam) => this.update(cam));
    for (const [name, t] of this.pending || []) this.addTile(name, t.kit, t.parent);
    this.pending = null;
    window.__roofs = this;
    log(`roofs: on (?roofs=old = before), kit ${PIECES.length} pieces, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  /** a tile's roof kit (the worker's analyseBuildings().roofKit); its fade follows `parent` (the tile's buildings group) */
  addTile(name, roofKit, parent) {
    if (!this.on || !roofKit) return null;
    if (!this.kit) { (this.pending ||= new Map()).set(name, { kit: roofKit, parent }); return roofKit.stats; }
    const grp = new THREE.Group(); grp.name = `roofs-${name}`;
    parent.add(grp);
    this.streamer.addTile(name, grp, (slot) => roofSources(roofKit.pieces, slot));
    this.tiles.set(name, { name, group: grp, stats: roofKit.stats, counts: Object.fromEntries(Object.entries(roofKit.pieces).map(([k, a]) => [k, a.length / 24])) });
    return roofKit.stats;
  },
  removeTile(name) {
    this.pending?.delete(name);
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    this.tiles.delete(name);
    this.streamer.removeTile(name);
  },
  update(camera) {
    if (!this.on || !this.kit) return;
    this.streamer.update(camera);
  },
  report() {
    const n = Object.fromEntries(PIECES.map((p) => [p, 0]));
    for (const t of this.tiles.values()) for (const k of PIECES) n[k] += t.counts[k] || 0;
    let tris = 0;
    for (const p of this.pools) p.meshes.forEach((m, k) => { if (m.visible) tris += m.count * p.piece.tris[k]; });
    return { tiles: this.tiles.size, instances: n, drawn: this.pools.reduce((s, p) => s + p.drawn, 0), tris,
      live: Object.fromEntries(this.pools.map((p) => [p.piece.name, p.instances])), stream: { ...this.streamer.stats } };
  },
};
