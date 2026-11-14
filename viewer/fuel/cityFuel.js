// THE PETROL STATIONS IN THE CITY (docs/assets/FUEL.md). On by default; ?fuel=old = the street-life layer's box canopy,
// pump props and price pylon of before (viewer/streetlife/layout.js).
//
//   - data: data/fuel/<T>.json (tools/fuel/build_fuel.py): every station of the tile on its real footprint (the canopy
//     from the UrbIS DSM / OSM, the islands under it, the shop front on the real wall, the totem at the road), its
//     forecourt slab (a height grid on the walking surface) and the colliders of what is drawn
//   - drawing: each station's kit pieces (viewer/fuel/fuelKit.js) MERGED into its own meshes (buildStation: LOD0 / 1 / 2,
//     the signs, the glass; built piece by piece in slices of <= 3 ms when its tile lands): a station near the camera is
//     3 draws (+ its shadow) instead of one per piece (per-piece pools cost ~22 draws a station and ~2 ms of CPU a
//     frame on the Chaussee de Waterloo); the LOD meshes are shown by camera distance (+ 8 m margin), the hand-over is
//     the per-pixel dither of viewer/lodFade.js; the tile fade is a slot of fuelFades (iBand.w). The forecourt slab is
//     one small mesh per station (the textured concrete pavers of viewer/streets/paving.js)
//   - collisions: per station an InstancedMesh "furniture-fuel" (count 1, never drawn) holding the drawn pieces'
//     prisms (columns, islands, dispensers, totem, shop front, air stand, pay terminal, wash box; the canopy deck high
//     up): the car (viewer/drive featureColliders, "box"), the walker (viewer/character/cityHook, "mesh") and the
//     collision test read it. The forecourt stays drivable (the slab is 3 cm over the walking surface).
import * as THREE from "three/webgpu";
import { float, vec2, vec3, positionWorld, mix, attribute, smoothstep } from "three/tsl";
import { loadFuelKit, fuelFades, PIECES, buildStation, STATION_BAND } from "./fuelKit.js";
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
  kit: null, tiles: new Map(), clear: [], treesDropped: 0, stats: { builds: 0, buildMs: 0 },
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
      this.stationTiles = new Set(sum.stations.map((s) => s.tile).filter(Boolean));   // only these tiles have a data/fuel/<T>.json
      if (renderer) await loadPavingTextures(renderer);
      this.kit = await loadFuelKit();
    } catch (e) { log(`fuel: kit failed (${e.message}), ?fuel=old`); this.on = false; return null; }
    this.renderer = renderer; this.scene = scene;
    updaters.push((eye, cam) => { this.camera = cam; this.update(cam); });
    window.__fuel = this;
    const tris = PIECES.reduce((s2, p) => s2 + this.kit.pieces[p].tris[0], 0);
    log(`fuel: on (?fuel=old for the street-life boxes), kit ${PIECES.length} pieces, ${tris} LOD0 tris, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    if (this.stationTiles && !this.stationTiles.has(name)) return Promise.resolve(null);   // no station on this tile: no request (no 404s)
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile's stations: their merged meshes (built in slices), slabs and collision stand-ins into `parent` (the tile's
   *  features group: disposed with it) */
  addTile(name, doc, parent) {
    if (!this.on || !this.kit || !doc?.stations?.length) return null;
    const g = new THREE.Group(); g.name = `fuel-${name}`;
    const slot = fuelFades.alloc();
    const stations = [];
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
      const rec = { id: s.id, meshes: null, c: new THREE.Vector3(), r: 0 };
      stations.push(rec);
      const inst = fuelInstances({ stations: [s] });
      const t0 = performance.now();
      buildStation(this.kit, inst, s.scheme, slot).then((geos) => {
        if (!this.tiles.has(name)) { for (const q of Object.values(geos)) q.dispose(); return; }
        const M = this.kit.mats, mk = (geo, mat, nm, shadow) => {
          const m = new THREE.Mesh(geo, mat); m.name = `fuel-${nm}-${s.id}`; m.castShadow = shadow; m.receiveShadow = true; m.visible = false;
          m.userData.noFade = true; g.add(m); return m;
        };
        rec.meshes = { lod0: mk(geos.lod0, M.opaque[0], "lod0", true), lod1: mk(geos.lod1, M.opaque[1], "lod1", true), lod2: mk(geos.lod2, M.opaque[2], "lod2", true),
          sign: geos.sign ? mk(geos.sign, M.sign, "sign", false) : null, glass: geos.glass ? mk(geos.glass, M.glass, "glass", false) : null };
        if (rec.meshes.glass) rec.meshes.glass.renderOrder = 2;
        rec.c.copy(geos.lod0.boundingSphere.center); rec.r = geos.lod0.boundingSphere.radius;
        // the shared materials' pipelines built asynchronously before the station is first shown (no compile freeze)
        if (this.renderer && this.camera && !this.compiled) {
          const tmp = Object.values(rec.meshes).filter(Boolean);
          for (const m of tmp) m.visible = true;
          const done = () => { this.compiled = true; rec.ready = true; };
          this.renderer.compileAsync(g, this.camera, this.scene).then(done, done);
        } else rec.ready = true;
        this.stats.builds++; this.stats.buildMs += performance.now() - t0;
      });
    }
    parent.add(g);
    this.tiles.set(name, { name, group: g, doc, slot, stations, fade: -1 });
    return { stations: doc.stations.length };
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    t.group.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    this.tiles.delete(name);
    fuelFades.set(t.slot, 0); fuelFades.release(t.slot);
  },
  /** per frame: the tiles' fades into their slots; each station's LOD meshes shown within their band (+ 8 m) */
  update(camera) {
    if (!this.on || !this.kit) return;
    const [s1, s2, end] = STATION_BAND, mg = 8, c = camera.position;
    for (const t of this.tiles.values()) {
      const gp = t.group.parent;
      const f = gp && gp.visible === false ? 0 : t.group.userData.fade ?? gp?.userData.fade ?? 1;
      if (f !== t.fade) { t.fade = f; fuelFades.set(t.slot, f); }
      for (const st of t.stations) {
        const m = st.meshes; if (!m || !st.ready) continue;
        const d = c.distanceTo(st.c), near = d - st.r, far = d + st.r;
        m.lod0.visible = near < s1 * 1.1 + mg;
        m.lod1.visible = far > s1 * 0.9 - mg && near < s2 * 1.1 + mg;
        m.lod2.visible = far > s2 * 0.9 - mg && near < end + mg;
        if (m.sign) m.sign.visible = near < end + mg;
        if (m.glass) m.glass.visible = near < 220 + mg;
      }
    }
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
    let drawn = 0; for (const t of this.tiles.values()) for (const q of t.stations) if (q.meshes) for (const m of Object.values(q.meshes)) if (m?.visible) drawn++;
    return { tiles: this.tiles.size, stations: st, drawn, builds: this.stats.builds, buildMs: +this.stats.buildMs.toFixed(1), treesDropped: this.treesDropped };
  },
};
