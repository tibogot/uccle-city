// STREET FURNITURE KIT 2 IN THE CITY (docs/assets/FURNITURE2.md): benches, bike hoops, bike boxes, bins, glass banks.
// On by default; ?furniture=old = the city as before (furniture.js's placeholder benches and bike racks from the OSM
// points, the street life's glass bubbles, no bins, no bike boxes).
//
//   - data: data/furniture/<T>.json (tools/furniture/build_furniture.py): the OSM benches and bike parkings on the
//     measured sidewalk (hoop rows, parking.brussels boxes), the bins by rule, the glass banks at the street life's sites
//   - drawing: the kit (viewer/furniture2/furnitureKit.js) as ONE pool per piece for the whole city (LOD0-2), streamed
//     by viewer/instanceStream.js (a gather every 2 m of travel, time-sliced, 6 m margin round the bands; the tile fade
//     is a uniform per tile slot: a fading tile never re-gathers)
//   - collisions: per tile, an InstancedMesh per piece named like the furniture the collision code reads
//     (furniture-bench / furniture-bikes / furniture-bikebox / furniture-bin / furniture-glassbank), with LOD1's
//     triangles at the same matrices, never drawn (visible = false): the car (viewer/drive featureColliders), the walker
//     / third person (viewer/character/cityHook) and the collision test (viewer/drive/collisionTest) take them as drawn
//   - lamps: the procedural lamps (viewer/lamps.js) keep clear of the furniture (keepLampsClear: slid along the kerb or
//     dropped); parked cars (viewer/cars.js) leave the bike boxes' parking spaces (keepCarsClear)
import * as THREE from "three/webgpu";
import { loadFurnitureKit, FurniturePool, PIECES, furnitureSource, furnitureFades } from "./furnitureKit.js";
import { Streamer, MARGIN } from "../instanceStream.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/furniture/", import.meta.url);
const STANDIN_NAME = {
  bench_street: "furniture-bench", bench_park: "furniture-bench", bench_backless: "furniture-bench", hoop: "furniture-bikes",
  bikebox: "furniture-bikebox", bin_round: "furniture-bin", bin_column: "furniture-bin", glassbank: "furniture-glassbank",
};
/** footprints (local x / z half-ranges) the lamps keep clear of; a hoop with its bikes */
const KEEP = {
  bench_street: [0.9, 0.3], bench_park: [0.95, 0.36], bench_backless: [0.9, 0.23], hoop: [0.9, 0.3], bikebox: [1.0, 1.09],
  bin_round: [0.26, 0.26], bin_column: [0.2, 0.23], glassbank: [0.83, 0.48],
};

/** a tile's instance arrays per piece (x y z yaw varMix tone 0 0) from its data/furniture doc */
export function furnitureInstances(doc) {
  const L = Object.fromEntries(PIECES.map((p) => [p, []]));
  for (const b of doc?.benches || []) L[b.piece].push(b.x, b.y, b.z, b.yaw, b.var || 0, b.tone ?? 0.5, 0, 0);
  for (const h of doc?.hoops || []) L.hoop.push(h.x, h.y, h.z, h.yaw, 0, 0.5, 0, 0);
  for (const b of doc?.boxes || []) L.bikebox.push(b.x, b.y, b.z, b.yaw, 0, 0.5, 0, 0);
  for (const b of doc?.bins || []) L[b.piece].push(b.x, b.y, b.z, b.yaw, 0, 0.5, 0, 0);
  for (const b of doc?.banks || []) L.glassbank.push(b.x, b.y, b.z, b.yaw, b.var || 0, 0.5, 0, 0);
  const out = {};
  for (const k of PIECES) if (L[k].length) out[k] = new Float32Array(L[k]);
  return out;
}

function blockedBy(inst, x, z, pad) {
  for (const k of PIECES) {
    const a = inst[k]; if (!a) continue;
    const [hx, hz] = KEEP[k];
    for (let o = 0; o < a.length; o += 8) {
      const dx = x - a[o], dz = z - a[o + 2];
      if (dx * dx + dz * dz > 36) continue;
      const cs = Math.cos(a[o + 3]), sn = Math.sin(a[o + 3]);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) < hx + pad[0] && Math.abs(lz) < hz + pad[1]) return true;
    }
  }
  return false;
}

export const cityFurniture = {
  on: qs.get("furniture") !== "old",
  kit: null, pools: [], tiles: new Map(), group: null,
  streamer: null, stats: { lampsMoved: 0, lampsDropped: 0, carsDropped: 0 },
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadFurnitureKit(); } catch (e) { log(`furniture2: kit failed (${e.message}), ?furniture=old`); this.on = false; return null; }
    this.group = new THREE.Group(); this.group.name = "furniture2";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new FurniturePool(this.kit.pieces[p], this.kit.mats, this.group, MARGIN));
    this.streamer = new Streamer({ name: "furniture2", pools: this.pools.map((p) => p.stream), fades: furnitureFades, budget: 0.15 });
    updaters.push((eye, cam) => this.update(cam));
    window.__furniture2 = this;
    log(`furniture2: on (?furniture=old for the placeholders), kit ${PIECES.map((p) => `${p} ${this.kit.pieces[p].tris.join("/")}`).join(", ")} tris, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  /** the tile's data/furniture doc (null: none / off) */
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a lamps.js `place` that keeps the lamps off the furniture: slid 3 / 5 m along the kerb, else dropped */
  keepLampsClear(place, doc) {
    if (!this.on || !doc) return place;
    const inst = furnitureInstances(doc);
    const P = place || ((s) => s);
    return (s) => {
      const p = P(s);
      if (!p || !blockedBy(inst, p.x, p.z, [0.5, 0.5])) return p;
      const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw);
      for (const d of [3, -3, 5, -5]) {
        const q = P({ ...s, x: s.x + ax * d, z: s.z + az * d });
        if (q && !blockedBy(inst, q.x, q.z, [0.5, 0.5])) { this.stats.lampsMoved++; return q; }
      }
      this.stats.lampsDropped++;
      return null;
    };
  },
  /** a cars.js `place` (x, z, yaw) -> { x, z, yaw } | null that leaves the bike boxes' parking spaces free */
  keepCarsClear(place, doc) {
    if (!this.on || !doc?.boxes?.length || !place) return place;
    const inst = { bikebox: furnitureInstances(doc).bikebox };
    return (x, z, yaw) => {
      const p = place(x, z, yaw);
      if (p && blockedBy(inst, p.x, p.z, [2.45, 0.9])) { this.stats.carsDropped++; return null; }
      return p;
    };
  },
  /** a tile: its instances join the pools; its collision stand-ins go into `parent` (the tile's features group) */
  addTile(name, doc, parent) {
    if (!this.on || !this.kit || !doc) return null;
    const inst = furnitureInstances(doc);
    const g = new THREE.Group(); g.name = `furniture2-${name}`;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const counts = {};
    for (const k of PIECES) {
      const a = inst[k]; counts[k] = a ? a.length / 8 : 0;
      if (!a) continue;
      const m = new THREE.InstancedMesh(this.kit.pieces[k].standin, this.kit.mats.standin, a.length / 8);
      for (let i = 0; i < a.length / 8; i++) { q.setFromAxisAngle(up, a[i * 8 + 3]); M.compose(v.set(a[i * 8], a[i * 8 + 1], a[i * 8 + 2]), q, one); m.setMatrixAt(i, M); }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = STANDIN_NAME[k];
      m.visible = false;                         // never drawn: the pools draw; the collision code reads it
      m.castShadow = m.receiveShadow = false;
      m.userData.collisionStandin = true;
      g.add(m);
    }
    parent.add(g);
    this.tiles.set(name, { name, inst, group: g, counts });
    this.streamer.addTile(name, g, (slot) => Object.fromEntries(PIECES.filter((k) => inst[k]).map((k) => [k, furnitureSource(this.kit.pieces[k], inst[k], slot)])));
    return counts;
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    for (const m of t.group.children) m.dispose?.();
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
    return { tiles: this.tiles.size, instances: n, drawn: this.pools.reduce((s, p) => s + p.drawn, 0), stream: { ...this.streamer.stats }, ...this.stats };
  },
};
