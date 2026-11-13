// FRONT GARDENS IN THE CITY (docs/assets/GARDENS.md): low brick walls with copings, railings, pillars with caps, gates,
// hedges behind the railings, between each house and the measured sidewalk. On by default; ?gardens=0 = none (the city as
// before); ?gardenhedges=0 = the walls / railings without the hedges.
//
//   - data: data/gardens/<T>.json (tools/gardens/build_gardens.py): runs along the property line (the measured sidewalk's
//     back edge) in front of every street face with a gap >= 1 m, openings at the real doors and driveways
//   - drawing: the kit (viewer/gardens/gardenKit.js) as ONE pool per piece for the whole city (LOD0-2), re-filled every
//     2 m of camera travel (or every frame while a tile fades); the hedges are the foliage system's own
//     (viewer/foliage/hedges.js buildHedges), one group per tile, hidden beyond HEDGE_FAR of the camera
//   - collisions: per tile, InstancedMeshes of unit boxes named furniture-gardenwall / -gardenpillar / -gardengate (wall +
//     coping + railing as one sheared box, the pillars, the closed driveway gates), never drawn (visible = false): the car
//     (viewer/drive featureColliders), the walker / third person (viewer/character/cityHook) and the collision test read
//     them like the furniture kits' stand-ins. The pedestrian gates are drawn OPEN: the walker gets in at the door
import * as THREE from "three/webgpu";
import { loadGardenKit, GardenPool, PIECES, gardenInstances, standinGeometries } from "./gardenKit.js";
import { buildHedges } from "../foliage/hedges.js";
import { wind } from "../foliage/wind.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/gardens/", import.meta.url);
const HEDGE_FAR = 260;                     // a tile's hedges hide when the camera is this far from all of them

export const cityGardens = {
  on: qs.get("gardens") !== "0",
  hedges: qs.get("gardenhedges") !== "0",
  kit: null, pools: [], tiles: new Map(), group: null, stand: null,
  last: new THREE.Vector3(1e9, 0, 0), dirty: true, gatherMs: 0, tWind: 0,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadGardenKit(); } catch (e) { log(`gardens: kit failed (${e.message}), ?gardens=0`); this.on = false; return null; }
    this.stand = standinGeometries();
    this.group = new THREE.Group(); this.group.name = "gardens";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new GardenPool(this.kit.pieces[p], this.kit.mats, this.group));
    updaters.push((eye, cam) => this.update(cam));
    window.__gardens = this;
    log(`gardens: on (?gardens=0 off, ?gardenhedges=0 no hedges), kit ${PIECES.length} pieces x 3 LODs, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile: its instances join the pools; stand-ins (and hedges) go into `parent` (the tile's features group);
   *  groundAt(x, z) = the drawn ground the hedges stand on */
  addTile(name, doc, parent, groundAt) {
    if (!this.on || !this.kit || !doc) return null;
    const t0 = performance.now();
    const g = gardenInstances(doc);
    const grp = new THREE.Group(); grp.name = `gardens-${name}`;
    const M = new THREE.Matrix4();
    for (const [k, nm] of [["wall", "furniture-gardenwall"], ["pillar", "furniture-gardenpillar"], ["gate", "furniture-gardengate"]]) {
      const a = g.stand[k]; if (!a.length) continue;
      const m = new THREE.InstancedMesh(this.stand[k], this.kit.mats.standin, a.length / 16);
      for (let i = 0; i < a.length / 16; i++) { M.fromArray(a, i * 16); m.setMatrixAt(i, M); }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = nm; m.visible = false; m.castShadow = m.receiveShadow = false;
      m.userData.collisionStandin = true;
      grp.add(m);
    }
    let hedge = null, hedgeStats = null;
    if (this.hedges && doc.hedges?.length && groundAt) {
      const h = buildHedges(doc.hedges, groundAt);
      hedge = h.group; hedge.name = `gardens-hedges-${name}`; hedgeStats = h.stats;
      // (the hedges' bounds, for the distance cut)
      const b = new THREE.Box3(); for (const r of doc.hedges) for (const [x, z] of r.points) b.expandByPoint(new THREE.Vector3(x, 0, z));
      hedge.userData.box = b;
      grp.add(hedge);
    }
    parent.add(grp);
    this.tiles.set(name, { name, inst: g.inst, cells: g.cells, group: grp, hedge, fade: 1, counts: g.counts, hedgeStats, doc: { segs: doc.segs.length, pillars: doc.pillars.length, gates: doc.gates.length, hedges: doc.hedges.length } });
    this.dirty = true;
    return { ...g.counts, hedgeTris: hedgeStats?.tris || 0, ms: Math.round(performance.now() - t0) };
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    t.group.traverse((o) => { if (o.isInstancedMesh) o.dispose?.(); });
    this.tiles.delete(name);
    this.dirty = true;
  },
  update(camera) {
    if (!this.on || !this.kit) return;
    const c = camera.position;
    let fading = false;
    for (const t of this.tiles.values()) {
      const f = t.group.userData.fade ?? t.group.parent?.userData.fade ?? 1;
      if (f !== t.fade) { t.fade = f; fading = true; }
    }
    if (this.hedges && qs.get("grass") !== "1") {          // (?grass=1: the grass field steps the shared wind)
      const now = performance.now(); wind.update(Math.min(0.1, (now - (this.tWind || now)) / 1000)); this.tWind = now;
    }
    if (!this.dirty && !fading && c.distanceToSquared(this.last) < 4) return;
    const t0 = performance.now();
    const tiles = [];
    for (const t of this.tiles.values()) {
      if (t.group.parent && t.group.parent.visible !== false) tiles.push(t);
      if (t.hedge) t.hedge.visible = t.hedge.userData.box.distanceToPoint(new THREE.Vector3(c.x, 0, c.z)) < HEDGE_FAR;
    }
    for (const p of this.pools) p.gather(tiles, c);
    this.last.copy(c); this.dirty = false;
    this.gatherMs = performance.now() - t0;
  },
  report() {
    const n = Object.fromEntries(PIECES.map((p) => [p, 0]));
    let hedgeTris = 0, hedgeCards = 0, hedgesShown = 0;
    for (const t of this.tiles.values()) {
      for (const k of PIECES) n[k] += t.counts[k] || 0;
      if (t.hedgeStats) { hedgeTris += t.hedgeStats.tris; hedgeCards += t.hedgeStats.cards; if (t.hedge.visible) hedgesShown++; }
    }
    return { tiles: this.tiles.size, instances: n, drawn: this.pools.reduce((s, p) => s + p.drawn, 0),
      live: Object.fromEntries(this.pools.map((p) => [p.piece.name, p.instances])), gatherMs: +(this.gatherMs || 0).toFixed(2), hedgeTris, hedgeCards, hedgesShown };
  },
};
