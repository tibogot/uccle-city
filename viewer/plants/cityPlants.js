// PLANTS AND BUSHES IN THE CITY (docs/FOLIAGE.md "City"): the Foliage Lab's 8 scripted Blender plants (box ball, cherry
// laurel, rhododendron, hydrangea, rose, lavender, spring bulbs, geranium), mulch beds and window boxes; ivy and
// climbers in viewer/plants/cityIvy.js. ON by default: ?plants=0 off (all of it), ?windowboxes=0 no window boxes.
//   - data: data/plants/<T>.json (tools/plants/build_plants.py): plants [x, z, type, yaw, scale, zone] and beds from the
//     orthophoto's green, the LiDAR's low vegetation (real shrub positions and sizes), UrbIS streets / squares / medians
//     / buildings, OSM parks and scrub, the front-garden kit; window boxes from the façade kit's own sills (the tile's
//     B.kit: the windows the city draws), on the maisons de maître (30 %) and the other kit fronts (9 %)
//   - drawing: ONE pool per plant type x 3 LODs for the whole city (viewer/instanceStream.js: streamed round the camera,
//     time-sliced, 6 m of margin round every band, never DynamicDrawUsage, a mesh with nothing to draw hidden), one
//     material per LOD shared by every type (plantMaterial.js) so the pools merge into one multi-draw object per LOD
//     (viewer/multiDraw.js); LOD0 the Blender model to ~6 m, LOD1 leaf thinning to ~13 m, LOD2 the scripted far shell to
//     45-90 m (by the plant's size), nothing beyond; the hand-overs and the tile fade dithered per pixel (no pop)
//   - JOINS: every plant / bed / box stands on the DRAWN ground (hm.surface) at its lowest point (a plant sinks 4 cm,
//     a bed's skirt runs 18 cm down), never floating
//   - no shadows cast (small plants; the hedges carry the gardens' shadow), no light (fixed light count)
//   - season: the city's day (viewer/seasons/season.js, the lighting's date) drives the foliage season (month) that
//     the plants AND the gardens' hedges read (beech hedges brown in winter, hydrangea heads, bulbs in spring...)
import * as THREE from "three/webgpu";
import { loadPlants, thinLeaves } from "../foliage/plants.js";
import { season as foliageSeason } from "../foliage/seasons.js";
import { season as citySeason } from "../seasons/season.js";
import { wind } from "../foliage/wind.js";
import { StreamPool, Streamer, buildSource, MARGIN } from "../instanceStream.js";
import { PLANT_TYPES, plantFades, plantMaterial, setTypeHeights, applyPlantSeason } from "./plantMaterial.js";
import { bedGeometry, bedMaterial, windowBoxGeometry, windowBoxMaterial, BOX_VARIANTS } from "./plantKit.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/plants/", import.meta.url);
/** LOD bands (m): [LOD0 -> 1, LOD1 -> 2, end]; the shrubs' end grows with their size (per instance) */
const BANDS = {
  box_ball: [4.5, 13, 55], laurel: [4.5, 15, 75], rhododendron: [4.5, 15, 75], hydrangea: [4.5, 14, 60], rose: [4.5, 13, 55],
  lavender: [4.5, 10, 45], bulbs: [4.5, 9, 24], geranium: [4.5, 10, 42],
};
const END_MAX = 95;
const BOX_BAND = [22, 22, 130];
const BED_END = 90;
const STRIDE_SILL = 14;

const h01 = (x, z, salt = 0) => {
  let h = Math.imul(Math.floor(x * 100) | 0, 73856093) ^ Math.imul(Math.floor(z * 100) | 0, 19349663) ^ Math.imul(salt + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** a plant LOD repacked to 4 vertex buffers (WebGPU allows 8 with the instance columns): position, normal,
 *  pdat = (AO, random per leaf, slot), pbase = (the part's base x y z, kind) (from the GLB's uv1 / uv2 / uv3 / slot) */
const packed = new Map();
function packPlant(g, inner = null) {
  if (packed.has(g)) return packed.get(g);
  if (inner) g = withInnerShell(g, inner);
  const n = g.attributes.position.count, U1 = g.attributes.uv1, U2 = g.attributes.uv2, U3 = g.attributes.uv3, SL = g.attributes.slot;
  const D = new Float32Array(n * 3), B = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    D[i * 3] = U1.getX(i); D[i * 3 + 1] = U1.getY(i); D[i * 3 + 2] = SL.getX(i);
    B[i * 4] = U2.getX(i); B[i * 4 + 1] = U2.getY(i); B[i * 4 + 2] = U3.getX(i); B[i * 4 + 3] = U3.getY(i);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute("position", g.attributes.position); o.setAttribute("normal", g.attributes.normal);
  o.setAttribute("pdat", new THREE.BufferAttribute(D, 3)); o.setAttribute("pbase", new THREE.BufferAttribute(B, 4));
  o.setIndex(g.index);
  o.computeBoundingSphere(); o.userData.shared = true;
  packed.set(g, o);
  return o;
}

/** LOD1 + a dark inner crown (the far shell shrunk 18 % toward the crown's middle, AO 0.45): the thinned leaves show
 *  foliage, not the street behind, through their gaps (the lab's LOD1 read as a see-through dotted ghost at 10-13 m) */
function withInnerShell(g, shell) {
  const keys = ["position", "normal", "uv1", "uv2", "uv3", "slot"];
  shell.computeBoundingBox();
  const cy = (shell.boundingBox.min.y + shell.boundingBox.max.y) / 2, n0 = g.attributes.position.count, n1 = shell.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const k of keys) {
    const a = g.attributes[k], b = shell.attributes[k], w = a.itemSize, arr = new Float32Array((n0 + n1) * w);
    arr.set(a.array.subarray(0, n0 * w));
    for (let i = 0; i < n1; i++) for (let c = 0; c < w; c++) arr[(n0 + i) * w + c] = b.getComponent(i, c);
    out.setAttribute(k, new THREE.BufferAttribute(arr, w));
  }
  const P = out.attributes.position.array, U1 = out.attributes.uv1.array, S = out.attributes.slot.array, U3 = out.attributes.uv3.array;
  for (let i = n0; i < n0 + n1; i++) {
    P[i * 3] *= 0.76; P[i * 3 + 1] = cy + (P[i * 3 + 1] - cy) * 0.76; P[i * 3 + 2] *= 0.76;
    U1[i * 2] *= 0.5; S[i] = 1; U3[i * 2 + 1] = 4;                // (kind 4: the inner crown, no bloom patches)
  }
  const I0 = g.index.array, I1 = shell.index.array, I = new Uint32Array(I0.length + I1.length);
  I.set(I0); for (let k = 0; k < I1.length; k++) I[I0.length + k] = I1[k] + n0;
  out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}

/** one piece's LOD meshes as a stream pool (cf. viewer/gardens/gardenKit.js GardenPool) */
function makePool(key, geos, mats, live, attrs, group, r) {
  const spec = geos.map((geo, k) => {
    const g = new THREE.BufferGeometry();
    for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
    g.setIndex(geo.index);
    const m = new THREE.InstancedMesh(g, mats[k], 1);
    m.castShadow = false; m.receiveShadow = true; m.frustumCulled = true;
    m.boundingSphere = new THREE.Sphere(); m.name = `plants-${key}-lod${k}`;
    group.add(m);
    return { mesh: m, l0: live[k][0], l1: live[k][1], attrs };
  });
  return new StreamPool(key, spec, r, MARGIN);
}

export const cityPlants = {
  on: qs.get("plants") !== "0",
  boxes: qs.get("windowboxes") !== "0",
  lib: null, pools: [], group: null, streamer: null, tiles: new Map(), seasonDay: -1, tWind: 0,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.lib = await loadPlants(); } catch (e) { log(`plants: library failed (${e.message}), ?plants=0`); this.on = false; return null; }
    setTypeHeights(Object.fromEntries(PLANT_TYPES.map((t) => [t, this.lib.types[t]?.height || 1])));
    this.group = new THREE.Group(); this.group.name = "plants";
    scene.add(this.group);
    const plantAttrs = [["instanceMatrix", "instanceMatrix", 16], ["iPlant", "iPlant", 4], ["iBand", "iBand", 4]];
    const mats = [0, 1, 2].map(plantMaterial);
    for (const t of PLANT_TYPES) {
      const L = this.lib.types[t]; if (!L) continue;
      const [s1, s2] = BANDS[t];
      const live = [[0, s1 * 1.1], [s1 * 0.9, s2 * 1.1], [s2 * 0.9, END_MAX]];
      this.pools.push(makePool(t, [L.lods[0], L.lods[2] !== L.lods[1] ? (L.thin35 ||= thinLeaves(L.lods[0], 0.35)) : L.lods[1], L.lods[2]].map((g, k) => packPlant(g, k === 1 && L.lods[2] !== L.lods[1] ? L.lods[2] : null)), mats, live, plantAttrs, this.group, Math.max(1, L.height * 1.2)));
    }
    const kitAttrs = [["instanceMatrix", "instanceMatrix", 16], ["iKit", "iKit", 4], ["iBand", "iBand", 4]];
    this.pools.push(makePool("bed", [bedGeometry()], [bedMaterial()], [[0, BED_END]], kitAttrs, this.group, 2.5));
    if (this.boxes) this.pools.push(makePool("windowbox", [windowBoxGeometry(0), windowBoxGeometry(1)], [windowBoxMaterial(0), windowBoxMaterial(1)], [[0, BOX_BAND[0] * 1.1], [BOX_BAND[0] * 0.9, BOX_BAND[2]]], kitAttrs, this.group, 1));
    this.streamer = new Streamer({ name: "plants", pools: this.pools, fades: plantFades, budget: 0.3 });
    this.syncSeason(true);
    updaters.push((eye, cam) => this.update(cam));
    window.__plants = this;
    log(`plants: on (?plants=0 off; ?windowboxes=0 without the window boxes), ${PLANT_TYPES.length} types, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile's beds on the drawn ground: [matrix (column major), rnd, ...]; a plane through the ground at the ends /
   *  sides, raised so the ground never pokes through the mulch; cached on the doc (the grass bake and the pools share it) */
  bedList(doc, groundAt, cache = true) {
    if (!doc?.beds) return [];
    if (cache && doc.__beds) return doc.__beds;
    const B = doc.beds, beds = [];
    for (let o = 0; o < B.length; o += 6) {
      const cx = B[o], cz = B[o + 1], a = B[o + 2] / 1000, L = B[o + 3] / 100, W = B[o + 4] / 100, c = Math.cos(a), s = Math.sin(a);
      const at = (u, v) => groundAt(cx + c * u * L - s * v * W, cz + s * u * L + c * v * W);
      const y0 = at(0, 0), gu = (at(0.45, 0) - at(-0.45, 0)) / 0.9, gv = (at(0, 0.45) - at(0, -0.45)) / 0.9;
      let lift = 0, low = 0;
      for (const [u, v] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4], [0.25, 0], [-0.25, 0]]) { const r = at(u, v) - (y0 + gu * u + gv * v); lift = Math.max(lift, r); low = Math.min(low, r); }
      // JOINS: the skirt reaches 18 cm under the rim; a bed on ground that bends more than that (a bank, a step) is not
      // drawn (its plants stay, and the grass)
      if (lift - low > 0.14) continue;
      // columns: x = the bed's length axis (with its slope), y up, z = its width axis (with its slope)
      beds.push([c * L, gu, s * L, 0, 0, 1, 0, 0, -s * W, gv, c * W, 0, cx, y0 + lift - 0.012, cz, 1], h01(cx, cz, 3));
    }
    if (cache) doc.__beds = beds;
    return beds;
  },
  /** the beds' outlines as an instanced mesh for the grass field's solid pass (no grass in a bed: the same smooth
   *  outline the mulch draws). Not in the scene. */
  bedSolid(doc, groundAt) {
    if (!this.on) return null;
    const beds = this.bedList(doc, groundAt, false), n = beds.length / 2;     // (the solid pass ignores heights)
    if (!n) return null;
    const m = new THREE.InstancedMesh((this._bedGeo ||= bedGeometry(32)), new THREE.MeshBasicNodeMaterial(), n);
    const M = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { M.fromArray(beds[i * 2]); m.setMatrixAt(i, M); }
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
    m.name = "plants-bed-solid";
    return m;
  },
  /** a tile: its plants, beds and window boxes join the pools. groundAt = the drawn ground; kit = the façade kit's
   *  output for the tile (B.kit: its sills carry the window boxes); parent = the tile's features group (its fade) */
  addTile(name, doc, parent, groundAt, kit = null) {
    if (!this.on || !this.lib) return null;
    const t0 = performance.now();
    const grp = new THREE.Group(); grp.name = `plants-${name}`;
    parent.add(grp);
    const counts = { plants: 0, beds: 0, windowboxes: 0, geraniums: 0 };
    let srcs = null;
    const per = Object.fromEntries(PLANT_TYPES.map((t) => [t, []]));          // x y z yaw scale rnd end
    const ground = (x, z, r) => Math.min(groundAt(x, z), groundAt(x + r, z), groundAt(x - r, z), groundAt(x, z + r), groundAt(x, z - r));
    if (doc?.plants) {
      const P = doc.plants, types = doc.types || PLANT_TYPES;
      for (let o = 0; o < P.length; o += 6) {
        const t = types[P[o + 2]], L = this.lib.types[t]; if (!L) continue;
        const x = P[o], z = P[o + 1], sc = P[o + 4] / 100, yaw = (P[o + 3] / 255) * Math.PI * 2;
        const r = Math.min(0.5, 0.3 * L.height * sc);
        const end = Math.min(END_MAX - 2, BANDS[t][2] * (0.8 + 0.25 * Math.min(2, sc * L.height)));
        per[t].push(x, ground(x, z, r) - 0.04, z, yaw, sc, h01(x, z, 9), end);
      }
    }
    const beds = this.bedList(doc, groundAt);
    counts.beds = beds.length / 2;
    // window boxes on the façade kit's sills, geraniums in them
    const boxes = [];
    const S = kit?.pieces?.sill;
    if (this.boxes && S) {
      const seen = new Set();                                                       // (a window's sill can come more than once)
      for (let o = 0; o + STRIDE_SILL <= S.length; o += STRIDE_SILL) {
        const x = S[o], y = S[o + 1], z = S[o + 2], nx = S[o + 3], nz = S[o + 4], w = S[o + 5], seed = S[o + 8], base = S[o + 12], F3 = S[o + 13];
        const key = `${Math.round(x * 10)},${Math.round(y * 10)},${Math.round(z * 10)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const maitre = F3 >= 1023.5, floor = Math.round((y - base) / 3.1);
        const hb = h01(seed * 1000, 0.5, 61);
        if (hb > (maitre ? 0.3 : 0.09) || floor > 2) continue;
        if (h01(x, z, 62) > (floor === 0 ? 0.6 : 0.85)) continue;                 // not every window of the house
        const bw = Math.max(0.5, w - 0.06), tx = nz, tz = -nx;                      // along the wall (the box's +x: a right-handed frame, +z out of the wall)
        boxes.push([tx * bw, 0, tz * bw, 0, 0, 1, 0, 0, nx, 0, nz, 0, x + nx * 0.05, y + 0.002, z + nz * 0.05, 1], Math.floor(h01(seed * 1000, 1.5, 63) * BOX_VARIANTS) % BOX_VARIANTS);
        const n = Math.max(2, Math.round(bw / 0.3));
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n - 0.5, px = x + tx * f * (bw - 0.1) + nx * 0.15, pz = z + tz * f * (bw - 0.1) + nz * 0.15;
          per.geranium.push(px, y + 0.002 + 0.165, pz, h01(px, pz, 64) * 6.283, 1.05 + 0.35 * h01(px, pz, 65), h01(px, pz, 66), BANDS.geranium[2]);
          counts.geraniums++;
        }
      }
      counts.windowboxes = boxes.length / 2;
    }
    for (const t of PLANT_TYPES) counts.plants += per[t].length / 7;
    this.streamer.addTile(name, grp, (slot) => (srcs = this.sources(per, beds, boxes, slot)));
    this.tiles.set(name, { name, group: grp, counts, per, beds, boxes, srcs });
    return { ...counts, ms: Math.round(performance.now() - t0) };
  },
  /** the tile's streaming sources per pool */
  sources(per, beds, boxes, slot) {
    const out = {};
    for (const t of PLANT_TYPES) {
      const a = per[t], n = a.length / 7, L = this.lib.types[t]; if (!n || !L) continue;
      const M = new Float32Array(n * 16), IP = new Float32Array(n * 4), IB = new Float32Array(n * 4), C = new Float32Array(n * 4);
      const ti = PLANT_TYPES.indexOf(t), [s1, s2] = BANDS[t];
      for (let i = 0; i < n; i++) {
        const o = i * 7, x = a[o], y = a[o + 1], z = a[o + 2], yaw = a[o + 3], s = a[o + 4], c = Math.cos(yaw), sn = Math.sin(yaw);
        // x' = c x + sn z, z' = -sn x + c z (plantMaterial.js rot())
        M.set([c * s, 0, -sn * s, 0, 0, s, 0, 0, sn * s, 0, c * s, 0, x, y, z, 1], i * 16);
        IP.set([ti, yaw, s, a[o + 5]], i * 4);
        IB.set([s1, s2, a[o + 6], slot], i * 4);
        C.set([x, y + L.height * s * 0.5, z, L.height * s * 0.6 + 0.3], i * 4);
      }
      out[t] = buildSource(n, { instanceMatrix: [M, 16], iPlant: [IP, 4], iBand: [IB, 4] }, C);
    }
    const kitSrc = (list, band) => {
      const n = list.length / 2; if (!n) return null;
      const M = new Float32Array(n * 16), K = new Float32Array(n * 4), IB = new Float32Array(n * 4), C = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const m = list[i * 2]; M.set(m, i * 16);
        K.set([list[i * 2 + 1], h01(m[12], m[14], 7), 0, 0], i * 4);
        IB.set([band[0], band[1], band[2], slot], i * 4);
        C.set([m[12], m[13], m[14], Math.hypot(m[0], m[2], m[8], m[10]) * 0.5 + 0.2], i * 4);
      }
      return buildSource(n, { instanceMatrix: [M, 16], iKit: [K, 4], iBand: [IB, 4] }, C);
    };
    const flat = (arr) => { const o = []; for (let i = 0; i < arr.length; i += 2) o.push(arr[i], arr[i + 1]); return o; };
    const b = kitSrc(flat(beds), [BED_END, BED_END, BED_END]); if (b) out.bed = b;
    const w = kitSrc(flat(boxes), BOX_BAND); if (w) out.windowbox = w;
    return out;
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    this.tiles.delete(name);
    this.streamer.removeTile(name);
  },
  /** the foliage season (month 1-12.99: 1.0 = mid January) from the city's day of the year */
  syncSeason(force = false) {
    const day = citySeason.day;
    if (!force && day === this.seasonDay) return;
    this.seasonDay = day;
    const m = 1 + (day - 15) / 30.44;
    foliageSeason.month = ((m - 1) % 12 + 12) % 12 + 1;
    foliageSeason.apply();
    applyPlantSeason();
  },
  update(camera) {
    if (!this.on || !this.lib) return;
    if ((this._f = (this._f || 0) + 1) % 60 === 1) this.syncSeason();
    if (!globalThis.grass) {          // the leaves' flutter (with the grass on, viewer/grass/cityGrass.js steps the shared wind)
      const now = performance.now(); if (!window.__gardens?.hedges) wind.update(Math.min(0.1, (now - (this.tWind || now)) / 1000)); this.tWind = now;
    }
    this.streamer.update(camera);
  },
  report() {
    let tris = 0;
    const live = {};
    for (const p of this.pools) {
      live[p.key] = p.meshes.map((m) => (m.mesh.visible ? m.mesh.count : 0));
      p.meshes.forEach((m, k) => {
        if (!m.mesh.visible) return;
        const g = m.mesh.geometry; tris += m.mesh.count * (g.index ? g.index.count : g.attributes.position.count) / 3; void k;
      });
    }
    const tot = { plants: 0, beds: 0, windowboxes: 0, geraniums: 0 };
    for (const t of this.tiles.values()) for (const k of Object.keys(tot)) tot[k] += t.counts[k];
    return { tiles: this.tiles.size, total: tot, live, tris: Math.round(tris), stream: { ...this.streamer.stats } };
  },
  /** JOINS: every plant's foot and every bed's rim against the drawn ground of a tile (floating = above it) */
  contact(name, groundAt) {
    const t = this.tiles.get(name); if (!t) return null;
    const out = { plants: 0, floating: 0, beds: 0, bedFloating: 0, maxFloat: 0 };
    for (const tp of PLANT_TYPES) {
      const a = t.per[tp];
      for (let o = 0; o < a.length; o += 7) {
        if (tp === "geranium") continue;                                         // (the window boxes' geraniums)
        out.plants++;
        const f = a[o + 1] - groundAt(a[o], a[o + 2]);
        if (f > 0.005) { out.floating++; out.maxFloat = Math.max(out.maxFloat, f); }
      }
    }
    for (let i = 0; i < t.beds.length; i += 2) {
      const m = t.beds[i]; out.beds++;
      let worst = -1;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r = 0.5 / Math.pow(Math.abs(c) ** 4 + Math.abs(s) ** 4, 0.25);
        const u = c * r * 1.04, v = s * r * 1.04;
        const x = m[12] + m[0] * u + m[8] * v, z = m[14] + m[2] * u + m[10] * v, y = m[13] + m[1] * u + m[9] * v - 0.18;
        worst = Math.max(worst, y - groundAt(x, z));
      }
      if (worst > 0.005) { out.bedFloating++; out.maxFloat = Math.max(out.maxFloat, worst); }
    }
    out.maxFloat = +out.maxFloat.toFixed(3);
    return out;
  },
};
