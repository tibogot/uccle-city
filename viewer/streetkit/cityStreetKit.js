// THE STREET KIT IN THE CITY (docs/assets/STREETKIT.md): Belgian road signs from the OSM data (give way, stop, one-way
// / no entry, speed limits, zone 30, living streets, crossings, parking, priority), the posts of the bilingual
// street-name plates, the Villo stations (totem, docks, bikes). On by default; ?streetkit=old = the city as before (no
// road signs, the street life's own Villo boxes and plain plate posts).
//
//   - data: data/streetkit/<T>.json (tools/streetkit/build_streetkit.py)
//   - drawing: the kit (viewer/streetkit/streetKit.js) as ONE pool per piece for the whole city (LOD0-2), streamed by
//     viewer/instanceStream.js (a gather every 2 m of travel, time-sliced; the tile fade is a uniform per tile slot)
//   - the street life layer (viewer/streetlife/) keeps the plates' enamel and text; with the kit on it draws no Villo
//     station and no plate post of its own (option noStreetKit)
//   - collisions: per tile, invisible InstancedMeshes named like the furniture the collision code reads:
//     furniture-sign (sign poles: posts), furniture-platepost (posts), furniture-villo (totem, docks, bikes: boxes)
//   - parked cars keep off the Villo stations in the parking lane (keepCarsClear); lamps keep off the sign poles and
//     stations (keepLampsClear)
import * as THREE from "three/webgpu";
import { loadStreetKit, StreetKitPool, PIECES, PLATE_SIZE, AXIS, streetKitSource, streetKitFades } from "./streetKit.js";
import { Streamer, MARGIN } from "../instanceStream.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/streetkit/", import.meta.url);
const STANDIN_NAME = { sign_pole: "furniture-sign", sign_pole_tall: "furniture-sign", plate_post: "furniture-platepost", villo_totem: "furniture-villo", villo_dock: "furniture-villo", villo_bike: "furniture-villo" };

function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h / 4294967296;
}

/** a tile's instance arrays per piece (x y z yaw v0 v1 v2 v3) from its data/streetkit doc */
export function streetKitInstances(doc) {
  const L = Object.fromEntries(PIECES.map((p) => [p, []]));
  for (const s of doc?.signs || []) {
    L[s.tall ? "sign_pole_tall" : "sign_pole"].push(s.x, s.y, s.z, s.yaw, 0, 0, 0, 0);
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    for (const p of s.plates) {
      const [w, h] = PLATE_SIZE[p.shape];
      L["plate_" + p.shape].push(s.x + fx * AXIS, s.y + p.h, s.z + fz * AXIS, s.yaw, p.face, 1 / w, 1 / h, 0);
    }
  }
  for (const p of doc?.posts || []) L.plate_post.push(p.x, p.y, p.z, p.yaw, 0, 0, 0, 0);
  for (const v of doc?.villo || []) {
    const t = v.totem;
    if (t) L.villo_totem.push(t.x, t.y, t.z, t.yaw, t.strip ?? -1, 0, 0, 0);
    for (const d of v.docks) L.villo_dock.push(d.x, d.y, d.z, d.yaw, 0, 0, 0, 0);
    for (const b of v.bikes) L.villo_bike.push(b.x, b.y, b.z, b.yaw, hash01(`${v.id}${b.x}`), 0, 0, 0);
  }
  const out = {};
  for (const k of PIECES) if (L[k].length) out[k] = new Float32Array(L[k]);
  return out;
}

export const cityStreetKit = {
  on: qs.get("streetkit") !== "old",
  kit: null, pools: [], tiles: new Map(), group: null,
  streamer: null, stats: { carsDropped: 0, lampsMoved: 0, lampsDropped: 0 },
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadStreetKit(); } catch (e) { log(`streetkit: kit failed (${e.message}), ?streetkit=old`); this.on = false; return null; }
    this.group = new THREE.Group(); this.group.name = "streetkit";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new StreetKitPool(this.kit.pieces[p], this.kit.mats, this.group, MARGIN));
    this.streamer = new Streamer({ name: "streetkit", pools: this.pools.map((p) => p.stream), fades: streetKitFades, budget: 0.15 });
    updaters.push((eye, cam) => this.update(cam));
    window.__streetkit = this;
    log(`streetkit: on (?streetkit=old off), ${PIECES.length} pieces, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a cars.js `place` (x, z, yaw) -> { x, z, yaw } | null that leaves the Villo stations' parking-lane space free */
  keepCarsClear(place, doc) {
    const areas = (doc?.villo || []).filter((v) => v.mode === "lane" && v.area).map((v) => v.area);
    if (!this.on || !areas.length || !place) return place;
    return (x, z, yaw) => {
      const p = place(x, z, yaw);
      if (!p) return p;
      for (const a of areas) {
        const dx = p.x - a.x, dz = p.z - a.z, cs = Math.cos(a.yaw), sn = Math.sin(a.yaw);
        // area frame: local z along (sin yaw, cos yaw) = the row; x across
        const along = dx * sn + dz * cs, across = dx * cs - dz * sn;
        if (Math.abs(along) < a.hx + 2.3 && Math.abs(across) < a.hz + 0.9) { this.stats.carsDropped++; return null; }
      }
      return p;
    };
  },
  /** a lamps.js `place` that keeps the lamps 0.6 m off the sign poles and off the Villo stations (slid 2 / 4 m, else dropped) */
  keepLampsClear(place, doc) {
    if (!this.on || !doc) return place;
    const pts = [...(doc.signs || []).map((s) => [s.x, s.z, 0.6]), ...(doc.posts || []).map((s) => [s.x, s.z, 0.6]),
      ...(doc.villo || []).flatMap((v) => [...v.docks.map((d) => [d.x, d.z, 1.2]), ...(v.totem ? [[v.totem.x, v.totem.z, 0.9]] : [])])];
    if (!pts.length) return place;
    const P = place || ((s) => s);
    const hit = (x, z) => pts.some(([a, b, r]) => (x - a) ** 2 + (z - b) ** 2 < r * r);
    return (s) => {
      const p = P(s);
      if (!p || !hit(p.x, p.z)) return p;
      const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw);
      for (const d of [2, -2, 4, -4]) {
        const q = P({ ...s, x: s.x + ax * d, z: s.z + az * d });
        if (q && !hit(q.x, q.z)) { this.stats.lampsMoved++; return q; }
      }
      this.stats.lampsDropped++;
      return null;
    };
  },
  addTile(name, doc, parent) {
    if (!this.on || !this.kit || !doc) return null;
    const inst = streetKitInstances(doc);
    const g = new THREE.Group(); g.name = `streetkit-${name}`;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const counts = {};
    for (const k of PIECES) {
      const a = inst[k]; counts[k] = a ? a.length / 8 : 0;
      const sg = this.kit.pieces[k].standin;
      if (!a || !sg) continue;
      const m = new THREE.InstancedMesh(sg, this.kit.mats.standin, a.length / 8);
      for (let i = 0; i < a.length / 8; i++) { q.setFromAxisAngle(up, a[i * 8 + 3]); M.compose(v.set(a[i * 8], a[i * 8 + 1], a[i * 8 + 2]), q, one); m.setMatrixAt(i, M); }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = STANDIN_NAME[k];
      m.visible = false;
      m.castShadow = m.receiveShadow = false;
      m.userData.collisionStandin = true;
      g.add(m);
    }
    parent.add(g);
    this.tiles.set(name, { name, inst, group: g, counts });
    this.streamer.addTile(name, g, (slot) => Object.fromEntries(PIECES.filter((k) => inst[k]).map((k) => [k, streetKitSource(this.kit.pieces[k], inst[k], slot)])));
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
    return { tiles: this.tiles.size, instances: n, tris: Object.fromEntries(PIECES.map((p) => [p, this.kit?.pieces[p].tris])), drawn: this.pools.reduce((s, p) => s + p.drawn, 0), stream: { ...this.streamer.stats }, ...this.stats };
  },
};
