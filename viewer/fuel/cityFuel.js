// THE PETROL STATIONS IN THE CITY (docs/assets/FUEL.md). On by default; ?fuel=old = the street-life layer's box canopy,
// pump props and price pylon of before (viewer/streetlife/layout.js).
//
//   - data: data/fuel/<T>.json (tools/fuel/build_fuel.py): every station of the tile on its real footprint (the canopy
//     from the UrbIS DSM / OSM, the islands under it, the shop front on the real wall, the totem at the road), its
//     forecourt slab (a height grid on the walking surface) and the colliders of what is drawn
//   - drawing: the kit (viewer/fuel/fuelKit.js) as ONE pool per piece for the whole city (LOD0-2 + signs + glass),
//     streamed by viewer/instanceStream.js (the shared frame budget, a fade slot per tile); the forecourt slab is one
//     small mesh per station in the tile's features group (the textured concrete pavers of viewer/streets/paving.js)
//   - collisions: per station an InstancedMesh "furniture-fuel" (count 1, never drawn) holding the drawn pieces'
//     prisms (columns, islands, dispensers, totem, shop front, air stand, pay terminal, wash box; the canopy deck high
//     up): the car (viewer/drive featureColliders, "box"), the walker (viewer/character/cityHook, "mesh") and the
//     collision test read it. The forecourt stays drivable (the slab is 3 cm over the walking surface).
import * as THREE from "three/webgpu";
import { float, vec2, vec3, positionWorld, mix, attribute, smoothstep } from "three/tsl";
import { loadFuelKit, FuelPool, fuelSource, fuelFades, PIECES } from "./fuelKit.js";
import { Streamer, MARGIN } from "../instanceStream.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER, loadPavingTextures } from "../streets/paving.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/fuel/", import.meta.url);

/** a tile doc's instance arrays per piece (x y z yaw sx sy sz scheme) */
export function fuelInstances(doc) {
  const L = {};
  for (const s of doc?.stations || []) {
    for (const [k, a] of Object.entries(s.inst || {})) {
      const out = (L[k] ||= []);
      for (let o = 0; o < a.length; o += 8) out.push(a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5], a[o + 6], s.scheme);
    }
  }
  const out = {};
  for (const k of PIECES) if (L[k]?.length) out[k] = new Float32Array(L[k]);
  return out;
}

/** the forecourt slab of a station: the height grid as a mesh with a 0.25 m skirt round it (JOINS: no floating rim) */
export function slabGeometry(S) {
  const { nx, nz, ys } = S, cs = Math.cos(S.yaw), sn = Math.sin(S.yaw);
  const [X0, X1] = S.x, [Z0, Z1] = S.z;
  const P = [], UV = [], I = [];
  const w = (lx, lz) => [S.cx + cs * lx + sn * lz, S.cz - sn * lx + cs * lz];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const lx = X0 + (X1 - X0) * i / (nx - 1), lz = Z0 + (Z1 - Z0) * j / (nz - 1), [x, z] = w(lx, lz);
    P.push(x, ys[j * nx + i], z); UV.push(lx, lz);
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    I.push(a, c, b, b, c, d);
  }
  // the skirt: the rim's vertices again, 0.25 m lower, faced outward
  const rim = [];
  for (let i = 0; i < nx; i++) rim.push(i);
  for (let j = 1; j < nz; j++) rim.push(j * nx + nx - 1);
  for (let i = nx - 2; i >= 0; i--) rim.push((nz - 1) * nx + i);
  for (let j = nz - 2; j >= 1; j--) rim.push(j * nx);
  const base = P.length / 3;
  for (const r of rim) { P.push(P[3 * r], P[3 * r + 1], P[3 * r + 2]); UV.push(UV[2 * r], UV[2 * r + 1]); }
  for (const r of rim) { P.push(P[3 * r], P[3 * r + 1] - 0.25, P[3 * r + 2]); UV.push(UV[2 * r], UV[2 * r + 1]); }
  const n = rim.length;
  for (let k = 0; k < n; k++) {
    const a = base + k, b = base + (k + 1) % n, c = base + n + k, d = base + n + (k + 1) % n;
    I.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  // the skirt's own flat normals would be smoothed into the top: recompute the top normals alone (the grid)
  const N = g.attributes.normal.array;
  for (let k = 0; k < 2 * n; k++) {
    const a = base + k, r0 = rim[k % n], r1 = rim[(k + 1) % n];
    const ex = P[3 * r1] - P[3 * r0], ez = P[3 * r1 + 2] - P[3 * r0 + 2], l = Math.hypot(ex, ez) || 1;
    N[3 * a] = ez / l; N[3 * a + 1] = 0; N[3 * a + 2] = -ex / l;
  }
  g.computeBoundingSphere();
  return g;
}

let slabMat = null;
/** the forecourt: concrete pavers (the street texture array, layer "pavers"), a little lighter and cleaner than a
 *  sidewalk, oil-darkened lanes along the islands; the procedural grey when the textures are off */
export function forecourtMaterial() {
  if (slabMat) return slabMat;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
  const PT = pavingTextures();
  const a = attribute("uv", "vec2").x, b = attribute("uv", "vec2").y;
  if (PT) {
    const S = pavingSample(a, b, float(LAYER.pavers), float(1.8));
    const col = regrade(S.col, "pavers", [0.30, 0.295, 0.28], 0.6);
    m.colorNode = col;
    m.roughnessNode = S.rough;
    m.aoNode = S.ao;
    m.normalNode = pavingNormal(S.n, a, b, float(0.8));
  } else {
    m.colorNode = vec3(0.28, 0.275, 0.26);
  }
  m.name = "fuel-forecourt";
  m.userData.shared = true;
  slabMat = m;
  return m;
}

/** a station's collider prisms (rings + y0 / y1) as one triangle geometry (world space) */
function colliderGeometry(cols) {
  const P = [];
  for (const c of cols) {
    const r = c.ring, n = r.length, y0 = c.y0 - 0.05, y1 = c.y1;
    for (let k = 0; k < n; k++) {
      const [ax, az] = r[k], [bx, bz] = r[(k + 1) % n];
      P.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
    }
    for (let k = 1; k < n - 1; k++) {
      P.push(r[0][0], y1, r[0][1], r[k][0], y1, r[k][1], r[k + 1][0], y1, r[k + 1][1]);
      P.push(r[0][0], y0, r[0][1], r[k + 1][0], y0, r[k + 1][1], r[k][0], y0, r[k][1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

function inRing(r, x, z) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export const cityFuel = {
  on: qs.get("fuel") !== "old",
  kit: null, pools: [], tiles: new Map(), group: null, streamer: null, clear: [], treesDropped: 0,
  /** a tile's tree list without the LiDAR "trees" the canopies themselves made (urbis-chm peaks on a canopy roof + 1 m:
   *  data/fuel/summary.json "clear"); the full tile and its far impostors both call it (no pop at the swap) */
  treesClear(trees) {
    if (!this.on || !this.clear.length || !trees?.length) return trees;
    const out = trees.filter((t) => t.source !== "urbis-chm" || !this.clear.some((r) => inRing(r, t.x, t.z)));
    this.treesDropped += trees.length - out.length;
    return out;
  },
  async start({ scene, updaters, renderer = null, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try {
      const sum = await fetch(new URL("summary.json", DATA)).then((r) => r.json());
      this.clear = sum.stations.map((s) => s.clear).filter(Boolean);
      if (renderer) await loadPavingTextures(renderer);
      this.kit = await loadFuelKit();
    } catch (e) { log(`fuel: kit failed (${e.message}), ?fuel=old`); this.on = false; return null; }
    this.group = new THREE.Group(); this.group.name = "fuel";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new FuelPool(this.kit.pieces[p], this.kit.mats, this.group, MARGIN));
    this.streamer = new Streamer({ name: "fuel", pools: this.pools.map((p) => p.stream), fades: fuelFades, budget: 0.1 });
    updaters.push((eye, cam) => this.update(cam));
    window.__fuel = this;
    const tris = PIECES.reduce((s, p) => s + this.kit.pieces[p].tris[0], 0);
    log(`fuel: on (?fuel=old for the street-life boxes), kit ${PIECES.length} pieces, ${tris} LOD0 tris, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile's stations: instances into the pools, the slabs + collision stand-ins into `parent` (the tile's features group) */
  addTile(name, doc, parent) {
    if (!this.on || !this.kit || !doc?.stations?.length) return null;
    const inst = fuelInstances(doc);
    const g = new THREE.Group(); g.name = `fuel-${name}`;
    const mat = forecourtMaterial();
    for (const s of doc.stations) {
      if (s.slab) {
        const m = new THREE.Mesh(slabGeometry(s.slab), mat);
        m.name = `fuel-slab-${s.id}`; m.receiveShadow = true; m.castShadow = false;
        g.add(m);
      }
      if (s.colliders?.length) {
        const m = new THREE.InstancedMesh(colliderGeometry(s.colliders), this.kit.mats.standin, 1);
        m.setMatrixAt(0, new THREE.Matrix4()); m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
        m.name = "furniture-fuel"; m.visible = false; m.castShadow = m.receiveShadow = false;
        m.userData.collisionStandin = true; m.userData.station = s.id;
        g.add(m);
      }
    }
    parent.add(g);
    this.tiles.set(name, { name, inst, group: g, doc });
    this.streamer.addTile(name, g, (slot) => Object.fromEntries(PIECES.filter((k) => inst[k]).map((k) => [k, fuelSource(this.kit.pieces[k], inst[k], slot)])));
    return { stations: doc.stations.length };
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    t.group.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    this.tiles.delete(name);
    this.streamer.removeTile(name);
  },
  update(camera) {
    if (!this.on || !this.kit) return;
    this.streamer.update(camera);
  },
  /** the JOINS check of a station (tools/mesh_audit/contact.js): its pieces' LOD0 at their matrices + its slab against
   *  the loaded tiles' terrain / roads (viewer/contactAudit.js groundParts). Items below the slab (buried feet) are fine */
  async contactAudit(id, world, scene, options = {}) {
    const { partFromBufferGeometry } = await import("../../tools/mesh_audit/audit.js");
    const { auditContact } = await import("../../tools/mesh_audit/contact.js");
    const { groundParts } = await import("../contactAudit.js");
    let st = null, tile = null;
    for (const t of this.tiles.values()) { const s = t.doc.stations.find((q) => q.id === id); if (s) { st = s; tile = t; } }
    if (!st) throw new Error(`fuel: station ${id} not loaded`);
    const model = [], M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (const [k, a] of Object.entries(st.inst)) {
      const g = this.kit.pieces[k].lods[0];
      for (let o = 0; o < a.length; o += 8) {
        q.setFromAxisAngle(up, a[o + 3]);
        M.compose(new THREE.Vector3(a[o], a[o + 1], a[o + 2]), q, new THREE.Vector3(a[o + 4], a[o + 5], a[o + 6]));
        model.push(partFromBufferGeometry(g, { name: `${k}#${o / 8}`, slot: k, matrixWorld: M.elements }));
      }
    }
    const slab = tile.group.children.find((m) => m.name === `fuel-slab-${id}`);
    if (slab) { slab.updateMatrixWorld(true); model.push(partFromBufferGeometry(slab.geometry, { name: "slab", slot: "slab", matrixWorld: slab.matrixWorld.elements })); }
    return auditContact(model, groundParts(scene, world.tiles), options);
  },
  report() {
    let st = 0; for (const t of this.tiles.values()) st += t.doc.stations.length;
    return { tiles: this.tiles.size, stations: st, drawn: this.pools.reduce((s, p) => s + p.drawn, 0), stream: { ...this.streamer.stats } };
  },
};
