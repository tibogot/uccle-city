// THE STIB STOPS, SHELTERS AND STREET AD PANELS IN THE CITY (docs/assets/STOPS.md). On by default; ?stops=old = the
// city as before (the street life's box shelters and flag poles, furniture.js's placeholder poles / shelters, tram.js's
// placeholder platform shelters).
//
//   - data: data/stops/<T>.json (tools/stops/build_stops.py): every STIB stop's pole (on the measured sidewalk, or on the
//     tram island), its shelter where OSM says there is one (open to the road, or its back to the road on a narrow
//     pavement), the free-standing double-sided ad panels placed by rule; + the tram platforms' shelters from tram.js
//   - drawing: the kit (viewer/stops/stopKit.js) as ONE pool per piece for the whole city (LOD0-2 + posters + glass),
//     streamed by viewer/instanceStream.js (a gather every 2 m of travel, time-sliced, 6 m margin round the bands; the
//     tile fade is a uniform per tile slot: a fading tile never re-gathers)
//   - collisions: per tile, an InstancedMesh per piece named like the furniture the collision code already reads
//     (furniture-shelter / furniture-stopPole / furniture-adpanel), with LOD1's triangles + the glass at the same
//     matrices, never drawn (visible = false): the car (viewer/drive featureColliders), the walker / third person
//     (viewer/character/cityHook) and the collision test (viewer/drive/collisionTest) take the shelters as drawn
//   - lamps: the procedural lamps (viewer/lamps.js) keep clear of the stop furniture (keepLampsClear: slid along the kerb
//     or dropped)
//   - text: the stop name and the line numbers (STIB colours from the GTFS) on the pole flag and the shelter's roof
//     board are the street-life layer's SDF boxes (viewer/streetlife/layout.js reads the same data/stops/<T>.json)
import * as THREE from "three/webgpu";
import { loadStopKit, StopPool, stopSource, stopFades } from "./stopKit.js";
import { Streamer, MARGIN } from "../instanceStream.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/stops/", import.meta.url);
const PIECES = ["shelter", "pole", "adpanel"];
const STANDIN_NAME = { shelter: "furniture-shelter", pole: "furniture-stopPole", adpanel: "furniture-adpanel" };

/** a tile's instance arrays (x y z yaw posterA posterB 0 0) from its data/stops doc + extra shelters (tram platforms) */
export function stopInstances(doc, extra = {}) {
  const L = { shelter: [], pole: [], adpanel: [] };
  for (const s of doc?.stops || []) {
    L.pole.push(s.pole.x, s.pole.y, s.pole.z, s.pole.yaw, 0, 0, 0, 0);
    if (s.shelter) L.shelter.push(s.shelter.x, s.shelter.y, s.shelter.z, s.shelter.yaw, s.shelter.posters[0], s.shelter.posters[1], 0, 0);
  }
  for (const p of doc?.panels || []) L.adpanel.push(p.x, p.y, p.z, p.yaw, p.posters[0], p.posters[1], 0, 0);
  for (const s of extra.shelters || []) L.shelter.push(s.x, s.y, s.z, s.yaw, s.posters?.[0] ?? 3, s.posters?.[1] ?? 6, 0, 0);
  const out = {};
  for (const k of PIECES) if (L[k].length) out[k] = new Float32Array(L[k]);
  return out;
}

/** footprints the lamps keep clear of (local x / z half-ranges + margin), for keepLampsClear */
const KEEP = { shelter: { x: [-2.0, 2.0], z: [-0.75, 0.8] }, pole: { x: [-0.3, 0.3], z: [-0.3, 0.3] }, adpanel: { x: [-0.1, 0.1], z: [-0.72, 0.72] } };
function blocked(inst, x, z, margin = 0.7) {
  for (const k of PIECES) {
    const a = inst[k]; if (!a) continue;
    const F = KEEP[k];
    for (let o = 0; o < a.length; o += 8) {
      const dx = x - a[o], dz = z - a[o + 2];
      if (dx * dx + dz * dz > 25) continue;
      const cs = Math.cos(a[o + 3]), sn = Math.sin(a[o + 3]);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;          // world -> local (inverse of rotation Y by yaw)
      if (lx > F.x[0] - margin && lx < F.x[1] + margin && lz > F.z[0] - margin && lz < F.z[1] + margin) return true;
    }
  }
  return false;
}

export const cityStops = {
  on: qs.get("stops") !== "old",
  kit: null, pools: [], tiles: new Map(), group: null,
  streamer: null, stats: { lampsMoved: 0, lampsDropped: 0 },
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadStopKit(); } catch (e) { log(`stops: kit failed (${e.message}), ?stops=old`); this.on = false; return null; }
    this.group = new THREE.Group(); this.group.name = "stops";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new StopPool(this.kit.pieces[p], this.kit.mats, this.group, MARGIN));
    this.streamer = new Streamer({ name: "stops", pools: this.pools.map((p) => p.stream), fades: stopFades, budget: 0.15 });
    updaters.push((eye, cam) => this.update(cam));
    window.__stops = this;
    log(`stops: on (?stops=old for the placeholders), kit ${PIECES.map((p) => `${p} ${this.kit.pieces[p].tris.join("/")}`).join(", ")} tris, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  /** the tile's data/stops doc (null: none / off) */
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a lamps.js `place` that keeps the lamps off the stop furniture: a lamp in the way slides 3 / 5 m along the kerb,
   *  else it is dropped (the stop's pole and shelter are real; the lamps are procedural) */
  keepLampsClear(place, doc) {
    if (!this.on || !doc) return place;
    const inst = stopInstances(doc);
    const P = place || ((s) => s);
    return (s) => {
      const p = P(s);
      if (!p || !blocked(inst, p.x, p.z)) return p;
      const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw);             // along the kerb (the lamp's local x)
      for (const d of [3, -3, 5, -5]) {
        const q = P({ ...s, x: s.x + ax * d, z: s.z + az * d });
        if (q && !blocked(inst, q.x, q.z)) { this.stats.lampsMoved++; return q; }
      }
      this.stats.lampsDropped++;
      return null;
    };
  },
  /** a tile: its instances join the pools; its collision stand-ins go into `parent` (the tile's features group: they
   *  are disposed with it); the pools take the tile's fade from that group */
  addTile(name, doc, parent, extra = {}) {
    if (!this.on || !this.kit) return null;
    const inst = stopInstances(doc, extra);
    const g = new THREE.Group(); g.name = `stops-${name}`;
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
    this.streamer.addTile(name, g, (slot) => Object.fromEntries(PIECES.filter((k) => inst[k]).map((k) => [k, stopSource(this.kit.pieces[k], inst[k], slot)])));
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
  /** counts for the HUD / docs: instances loaded per piece, meshes drawn now */
  report() {
    const n = { shelter: 0, pole: 0, adpanel: 0 };
    for (const t of this.tiles.values()) for (const k of PIECES) n[k] += t.counts[k] || 0;
    return { tiles: this.tiles.size, instances: n, drawn: this.pools.reduce((s, p) => s + p.drawn, 0), stream: { ...this.streamer.stats }, lamps: { ...this.stats } };
  },
};
