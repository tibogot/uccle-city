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
import { cityProps } from "../props/cityProps.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/streetkit/", import.meta.url);
const PROPS_OLD = qs.get("streetprops") === "old";

/** (streetprops, rule 30) ?streetprops=old: the doc as before the class D fixes: the signs of the old rules (signsOld,
 *  kept where they differ), the plate posts and Villo stations at their `was` (tools/streetkit/snapProps.mjs) */
export function streetKitOld(doc) {
  if (!doc) return doc;
  if (doc.signsOld) doc.signs = doc.signsOld;
  for (const p of doc.posts || []) if (p.was) [p.x, p.y, p.z] = p.was;
  for (const v of doc.villo || []) if (v.was) Object.assign(v, v.was);
  return doc;
}
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

/** (props, docs/PROPS.md) each sign's pole and plates as instance indices of their pieces, in streetKitInstances'
 *  order: [{ pole: [piece, i], plates: [[piece, i], ...] }] */
export function signLinks(doc) {
  const n = {}, at = (k) => { const i = n[k] || 0; n[k] = i + 1; return i; };
  return (doc?.signs || []).map((s) => {
    const pk = s.tall ? "sign_pole_tall" : "sign_pole";
    return { pole: [pk, at(pk)], plates: s.plates.map((p) => { const k = "plate_" + p.shape; return [k, at(k)]; }) };
  });
}

// joins2 (docs/JOINS2.md; ?artsigns=old = as placed): the street kit's rule signs are placed from the road graph and two
// speed-limit signs (C43) landed INSIDE the Dix Monolithes' round island, among the stones. A sign inside a public-art
// island (models/publicart/site.json island.r) moves out along its radius to the island's rim (0.6 m in from the kerb),
// its foot height carried along the island's centre -> rim ground fall.
const ARTSIGNS = qs.get("artsigns") !== "old";
let islandsP = null;
const artIslands = () => (islandsP ||= fetch(new URL("../../models/publicart/site.json", import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  .then((site) => (site?.pieces || []).filter((p) => p.island?.r).map((p) => {
    const g = p.ground_samples || {}, edge = ["edge_n", "edge_s", "edge_e", "edge_w"].map((k) => g[k]).filter((v) => v != null);
    const c = g.centre ?? p.y, e = edge.length ? edge.reduce((a, b) => a + b, 0) / edge.length : c;
    return { x: p.x, z: p.z, r: p.island.r, ground: (rr) => c + (e - c) * Math.min(1, rr / p.island.r) };
  })));
export const signStats = { movedOffIslands: 0 };
function signsOffIslands(doc, islands) {
  for (const s of doc.signs || []) for (const I of islands) {
    const dx = s.x - I.x, dz = s.z - I.z, rr = Math.hypot(dx, dz), to = I.r - 0.6;
    if (rr >= to) continue;
    const ux = rr > 0.01 ? dx / rr : 1, uz = rr > 0.01 ? dz / rr : 0;
    s.y += I.ground(to) - I.ground(rr);
    s.x = I.x + ux * to; s.z = I.z + uz * to;
    signStats.movedOffIslands++;
  }
  return doc;
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
    for (const m of this.kit.mats.opaque) cityProps.hook(m);          // (props: the snapped / bent signs' and knocked Villo bikes' motion vectors)
    this.streamer = new Streamer({ name: "streetkit", pools: this.pools.map((p) => p.stream), fades: streetKitFades, budget: 0.15 });
    cityProps.prepare(this.streamer, PIECES.filter((p) => p.startsWith("sign_pole") || (p.startsWith("plate_") && p !== "plate_post") || p === "villo_bike"));
    updaters.push((eye, cam) => this.update(cam));
    window.__streetkit = this;
    log(`streetkit: on (?streetkit=old off), ${PIECES.length} pieces, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    const doc = fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).then((d) => (PROPS_OLD ? streetKitOld(d) : d)).catch(() => null);
    return ARTSIGNS ? Promise.all([doc, artIslands()]).then(([d, isl]) => (d && isl.length ? signsOffIslands(d, isl) : d)) : doc;
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
    let bikeRefs = null, links = null;
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
      // (motorbike round 2: each station bike's collider knows its ref: off once the player takes that bike,
      // viewer/moto/villoDocks.js; driveMode.js featureColliders carries it)
      if (k === "villo_bike") m.userData.refs = bikeRefs = Array.from({ length: a.length / 8 }, (_, i) => ({ hidden: false, villo: i }));
      if (cityProps.on) {
        // (props, docs/PROPS.md) the Villo bikes knocked out of their docks; the sign posts bend / snap with their plates
        if (k === "villo_bike") { m.userData.kick = true; for (let i = 0; i < a.length / 8; i++) cityProps.make("villo", name, a[i * 8], a[i * 8 + 1], a[i * 8 + 2], a[i * 8 + 3], [{ streamer: this.streamer, tile: name, key: k, i }], bikeRefs[i]); }
        if (k === "sign_pole" || k === "sign_pole_tall") {
          links ||= signLinks(doc);
          const refs = m.userData.refs = new Array(a.length / 8).fill(null);
          for (const L of links) {
            if (L.pole[0] !== k) continue;
            const i = L.pole[1], mem = [L.pole, ...L.plates].map(([key, j]) => ({ streamer: this.streamer, tile: name, key, i: j }));
            refs[i] = cityProps.make("sign", name, a[i * 8], a[i * 8 + 1], a[i * 8 + 2], a[i * 8 + 3], mem)?.ref || null;
          }
        }
      }
      g.add(m);
    }
    parent.add(g);
    this.tiles.set(name, { name, inst, group: g, counts, bikeRefs });
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
