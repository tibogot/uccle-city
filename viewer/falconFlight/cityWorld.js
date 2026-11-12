// THE LAB'S CITY (Falcon Flight Lab): Saint-Job and its eight neighbour tiles from the city's own data and loaders,
// read-only: the tile worker's far-LOD data (viewer/tileData.js buildLiteData: the orthophoto-draped DTM, the UrbIS
// solids coloured per building), the tile's façades for I6 (the worker's full build + viewer/facades.js, the same
// meshes the city draws), the trees as the far tiles' impostors (viewer/treesStylized.js), the Saint-Job church
// (viewer/stjobModel.js, LODs) in place of its UrbIS solid. No roads, lamps, cars: the falcon sees the town from the
// air (the orthophoto has the streets).
//
// For the flight: floor(x, z) = max(the DTM, the roofs (viewer/tileData.js roofGrid, 2 m, the church's solid left out),
// a proxy of the church (the tower, spire, dome and wings from stjob.json's measurements, as viewer/falcons.js)); the
// lift grid (the obstacle field smoothed for the updrafts, air.js); the thermal sources (the Place de Saint-Job and the
// OSM parks / pitches / grass); the pigeons' roosts (roof ridges around the Place from buildings.bin, the church's
// wing ridges and drum cornice, the Place's setts for feeding).
import * as THREE from "three/webgpu";
import { texture, vec2, float, positionWorld } from "three/tsl";
import { Heightmap } from "../heightmap.js";
import { roofGrid } from "../tileData.js";
import { buildingMeshes as facadeMeshes } from "../facades.js";
import { buildFarTreeField, setTreeLighting, setTreeRenderer } from "../treesStylized.js";
import { loadStJob, STJOB_LODS, STJOB_BU_ID } from "../stjobModel.js";

const DATA = new URL("../../data/tiles/", import.meta.url);
export const PLACE = { x: 1153.1, z: 540.1 };           // Place de Saint-Job (viewer/main.js walk start on I6)
const RING = ["H5", "I5", "J5", "H6", "I6", "J6", "H7", "I7", "J7"];

let worker = null, reqId = 0;
const pending = new Map();
function tileData(entry, lite) {
  worker ??= (() => {
    const w = new Worker(new URL("../tileWorker.bundle.js", import.meta.url), { type: "module" });
    w.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.r); };
    return w;
  })();
  return new Promise((resolve, reject) => {
    const id = ++reqId; pending.set(id, { resolve, reject });
    worker.postMessage({ id, entry: { ...entry, hide: [STJOB_BU_ID], surface: false, pits: false }, base: DATA.href, lite });
  });
}
const getJSON = (p) => fetch(new URL(p, DATA)).then((r) => r.json());
const getBin = (p) => fetch(new URL(p, DATA)).then((r) => r.arrayBuffer());

/** Saint-Job's height (m above its floor) in the church frame: a copy of viewer/falcons.js churchTop (private there;
 *  copied read-only, keep the two in step): the tower and spire, the dome and lantern, the eight wings. */
const TOWER = [-13.456, -13.456], DOME = [[10.05, 23.2], [9.0, 25.9], [7.0, 30.1], [5.0, 32.2], [3.0, 33.3], [2.2, 33.6]];
export function churchTop(x, z) {
  let h = -100;
  const tx = x - TOWER[0], tz = z - TOWER[1];
  const tr = Math.max(Math.abs(tx + tz), Math.abs(tx - tz)) / Math.SQRT2;
  if (tr < 4.9) h = 29.4;
  const rs = Math.hypot(tx, tz);
  if (rs < 4.7) h = Math.max(h, 29.4 + 4 + (54.85 - 33.4) * (1 - rs / 4.7) + 4.6 * (rs < 0.6 ? 1 : 0));
  const r = Math.hypot(x, z);
  if (r < 10.3) {
    let d = 23.2;
    for (let i = 0; i < DOME.length - 1; i++) if (r <= DOME[i][0] && r >= DOME[i + 1][0]) d = DOME[i + 1][1] + (DOME[i][1] - DOME[i + 1][1]) * (r - DOME[i + 1][0]) / (DOME[i][0] - DOME[i + 1][0]);
    if (r < 2.2) d = 43.1;
    h = Math.max(h, d);
  }
  if (r < 25.6) {
    const a = Math.atan2(x, -z), k = Math.round(a / (Math.PI / 4)), off = Math.abs(Math.sin(a - k * Math.PI / 4)) * r;
    if (off < 4.6) h = Math.max(h, 14.7);
  }
  return h;
}

export async function loadCityWorld({ renderer, scene, lighting, log = () => {}, facades = true, trees = true } = {}) {
  const t0 = performance.now();
  setTreeRenderer(renderer); setTreeLighting(lighting);
  const manifest = await getJSON("manifest.json");
  const entries = RING.map((n) => manifest.tiles.find((t) => t.name === n)).filter((e) => e && e.status === "built");
  const group = new THREE.Group(); group.name = "falcon-city"; scene.add(group);
  const texLoader = new THREE.TextureLoader();
  const liteMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85 });
  const updaters = [];
  const tiles = [];
  // the church first (its model is the hero of the place)
  const church = await loadStJob();
  const churchRoot = new THREE.Group(); churchRoot.name = "stjob";
  churchRoot.position.copy(church.placement.position); churchRoot.rotation.y = church.placement.rotationY;
  const churchLevels = STJOB_LODS.map((_, k) => { const g = church.make(k); g.visible = k === 0; churchRoot.add(g); return g; });
  group.add(churchRoot); churchRoot.updateMatrixWorld(true);
  const churchInv = churchRoot.matrixWorld.clone().invert();
  updaters.push((cam) => {
    const d = cam.position.distanceTo(church.placement.position);
    const k = Math.max(0, STJOB_LODS.findIndex((l) => d < l.until));
    churchLevels.forEach((g, i) => { g.visible = i === (k < 0 ? STJOB_LODS.length - 1 : k); });
  });
  await Promise.all(entries.map(async (entry) => {
    const b = { x0: entry.bounds.x[0], x1: entry.bounds.x[1], z0: entry.bounds.z[0], z1: entry.bounds.z[1] };
    const full = facades && entry.name === "I6";
    const [lite, hdr, tbuf, bDoc, fullData, feats] = await Promise.all([
      tileData(entry, true), getJSON(entry.files.terrainHeader), getBin(entry.files.terrain), getJSON(entry.files.buildings),
      full ? tileData(entry, false) : null, getJSON(entry.files.features),
    ]);
    const hm = new Heightmap(hdr, tbuf);
    const g = new THREE.Group(); g.name = `${entry.name}-falcon`;
    // terrain with the orthophoto
    // (I6: the full build's 1 m grid (5 cm error), the photo mapped by world position; elsewhere the far LOD's 4 m grid)
    const T = fullData ? fullData.terrain : lite.terrain;
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(T.pos, 3));
    tg.setAttribute("normal", new THREE.BufferAttribute(T.nrm, 3));
    if (!fullData) tg.setAttribute("uv", new THREE.BufferAttribute(lite.terrain.uv, 2));
    tg.setIndex(new THREE.BufferAttribute(T.idx, 1));
    const tm = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, color: 0x5d6e45 });
    const tex = await texLoader.loadAsync(new URL(entry.files.ortho, DATA).href).catch(() => null);
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tm.color.set(0xffffff);
      if (fullData) {
        const W = (hdr.cols - 1) * hdr.step, H = (hdr.rows - 1) * hdr.step;
        tm.colorNode = texture(tex, vec2(positionWorld.x.sub(hdr.x0).div(W), float(1).sub(positionWorld.z.sub(hdr.z0).div(H)))).rgb;
      } else tm.map = tex;
    }
    const terr = new THREE.Mesh(tg, tm); terr.receiveShadow = true; terr.name = "terrain"; g.add(terr);
    // buildings: the city's façades on I6, the far-LOD solids elsewhere
    if (fullData) {
      const B = facadeMeshes(null, null, null, null, fullData.buildings);
      g.add(...B.meshes);
      log(`I6 façades: ${B.stats.faces} wall faces, ${B.triangles} triangles`);
    } else {
      const bg = new THREE.BufferGeometry();
      bg.setAttribute("position", new THREE.BufferAttribute(lite.buildings.position, 3));
      bg.setAttribute("normal", new THREE.BufferAttribute(lite.buildings.normal, 3));
      bg.setAttribute("color", new THREE.BufferAttribute(lite.buildings.color, 3));
      const bm = new THREE.Mesh(bg, liteMat); bm.castShadow = bm.receiveShadow = true; g.add(bm);
    }
    // trees: the impostor field of the far tiles (the same placements as the city's)
    if (trees && feats.trees?.length) {
      const ys = new Map(feats.trees.map((t) => [`${t.x},${t.z}`, t.y]));
      const ground = ys.values().next().value != null ? (x, z) => ys.get(`${x},${z}`) : (x, z) => hm.ground(x, z);
      const tf = buildFarTreeField(feats.trees, ground, (x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
      if (tf) { g.add(tf.mesh); updaters.push((cam) => tf.update(cam.position)); }
    }
    group.add(g);
    // the roof grid without the church's solid (its own proxy is exact enough, the UrbIS top would be the spire's
    // height over the whole footprint)
    bDoc.buildings = bDoc.buildings.filter((x) => x.attrs?.BU_ID !== STJOB_BU_ID);
    const roofs = roofGrid(bDoc, b);
    const bbuf = entry.name === "I6" || entry.name === "I5" ? await getBin(entry.files.buildingsBin) : null;
    tiles.push({ name: entry.name, b, hm, roofs, bDoc, bbuf, feats });
  }));
  tiles.sort((a, c) => RING.indexOf(a.name) - RING.indexOf(c.name));
  const at = (x, z) => tiles.find((t) => x >= t.b.x0 && x < t.b.x1 && z >= t.b.z0 && z < t.b.z1) || tiles[4] || tiles[0];
  const roofAt = (t, x, z) => {
    const rf = t.roofs, i = Math.floor((x - rf.x0) / rf.step), j = Math.floor((z - rf.z0) / rf.step);
    return i >= 0 && j >= 0 && i < rf.nx && j < rf.nz ? rf.data[j * rf.nx + i] : 0;
  };
  const _v = new THREE.Vector3();
  const churchY0 = church.placement.position.y;
  const churchAt = (x, z) => {
    const dx = x - church.placement.position.x, dz = z - church.placement.position.z;
    if (dx * dx + dz * dz > 40 * 40) return -1e9;
    _v.set(x, 0, z).applyMatrix4(churchInv);
    return churchY0 + churchTop(_v.x, _v.z);
  };
  const world = {
    tiles, church, churchRoot, group, PLACE,
    ground: (x, z) => at(x, z).hm.ground(x, z),
    roof: (x, z) => roofAt(at(x, z), x, z),
    churchFloor: churchAt,
    /** the highest solid: ground, a roof or the church */
    floor(x, z) { const t = at(x, z); return Math.max(t.hm.ground(x, z), roofAt(t, x, z), churchAt(x, z)); },
    bounds: { x0: Math.min(...tiles.map((t) => t.b.x0)), x1: Math.max(...tiles.map((t) => t.b.x1)), z0: Math.min(...tiles.map((t) => t.b.z0)), z1: Math.max(...tiles.map((t) => t.b.z1)) },
    update(cam) { for (const u of updaters) u(cam); },
  };
  world.liftGrid = liftGrid(world);
  world.thermalSources = thermalSources(world);
  world.roosts = roosts(world);
  log(`city: ${tiles.length} tiles (${tiles.map((t) => t.name).join(" ")}), lift grid ${world.liftGrid.nx}x${world.liftGrid.nz} @ ${world.liftGrid.step} m, ${world.thermalSources.length} thermal sources, ${world.roosts.length} roost points; ${(performance.now() - t0).toFixed(0)} ms`);
  return world;
}

/** the obstacle field for the updrafts: max(ground, roofs, church) on a 4 m grid, box-blurred twice over +-12 m */
function liftGrid(world, step = 4, rad = 3) {
  const { x0, x1, z0, z1 } = world.bounds;
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  let a = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, z = z0 + j * step;
    // the max of a 2 x 2 m neighbourhood (the roof grid's cells), so narrow buildings count
    a[j * nx + i] = Math.max(world.floor(x, z), world.floor(x + 1.5, z), world.floor(x, z + 1.5), world.floor(x + 1.5, z + 1.5));
  }
  const blur = (src, horiz) => {
    const out = new Float32Array(src.length);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      let s = 0, n = 0;
      for (let k = -rad; k <= rad; k++) {
        const ii = horiz ? i + k : i, jj = horiz ? j : j + k;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        s += src[jj * nx + ii]; n++;
      }
      out[j * nx + i] = s / n;
    }
    return out;
  };
  for (let p = 0; p < 2; p++) a = blur(blur(a, true), false);
  return { data: a, nx, nz, x0, z0, step };
}

/** where thermals rise: the Place de Saint-Job (setts in the sun: the strongest), OSM open areas near Saint-Job */
function thermalSources(world) {
  const out = [{ x: PLACE.x - 6, z: PLACE.z + 4, heat: 1.0, radius: 24, name: "Place de Saint-Job" }];
  const HEAT = { pitch: 0.85, playground: 0.8, grass: 0.7, park: 0.65, meadow: 0.7, garden: 0.55, recreation_ground: 0.75, wood: 0.35, scrub: 0.5, farmland: 0.7 };
  for (const t of world.tiles) for (const a of t.feats.areas || []) {
    const heat = HEAT[a.kind]; if (!heat || !a.rings?.[0]) continue;
    const r = a.rings[0];
    let A = 0, cx = 0, cz = 0;
    for (let i = 0; i < r.length; i++) { const [x1, z1] = r[i], [x2, z2] = r[(i + 1) % r.length], c = x1 * z2 - x2 * z1; A += c; cx += (x1 + x2) * c; cz += (z1 + z2) * c; }
    A /= 2; if (Math.abs(A) < 2500) continue;
    cx /= 6 * A; cz /= 6 * A;
    if (Math.hypot(cx - PLACE.x, cz - PLACE.z) > 900) continue;
    out.push({ x: cx, z: cz, heat: heat * Math.min(1, 0.6 + Math.abs(A) / 40000), radius: Math.min(35, 14 + Math.sqrt(Math.abs(A)) * 0.08), name: `${a.kind}${a.name ? " " + a.name : ""}` });
  }
  for (const s of out) s.ground = world.ground(s.x, s.z);
  return out.slice(0, 12);
}

/** pigeon roosts: { x, y, z, yaw, kind: "ridge" | "church" | "ground" } around the Place */
function roosts(world, R = 170) {
  const out = [];
  const near = (x, z) => Math.hypot(x - PLACE.x, z - PLACE.z) < R;
  // roof ridges from buildings.bin (I6, I5): roof-part edges whose both ends are at the building's top
  for (const t of world.tiles) {
    if (!t.bbuf) continue;
    const dv = new DataView(t.bbuf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
    const P = new Float32Array(t.bbuf, 8, V * 3), I = new Uint32Array(t.bbuf, 8 + V * 12, T * 3);
    for (const bd of t.bDoc.buildings) {
      const f = bd.footprint?.[0]?.[0]; if (!f || !near(f[0], f[1])) continue;
      const top = +bd.top, seen = new Set();
      for (let tri = bd.roof.first; tri < bd.roof.first + bd.roof.count; tri++) for (let e = 0; e < 3; e++) {
        const a = I[tri * 3 + e], c = I[tri * 3 + (e + 1) % 3];
        const ya = P[a * 3 + 1], yc = P[c * 3 + 1];
        if (ya < top - 0.35 || yc < top - 0.35) continue;
        const key = a < c ? `${a},${c}` : `${c},${a}`; if (seen.has(key)) continue; seen.add(key);
        const ax = P[a * 3], az = P[a * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2], L = Math.hypot(cx - ax, cz - az);
        if (L < 1.2) continue;
        const yaw = Math.atan2(-(cz - az), (cx - ax)) ;            // facing across the ridge
        for (let s = 0.4; s < L - 0.3; s += 1.1) {
          const k = s / L; const x = ax + (cx - ax) * k, z = az + (cz - az) * k;
          if (!near(x, z)) continue;
          out.push({ x, y: ya + (yc - ya) * k + 0.02, z, yaw: yaw + (out.length % 2 ? Math.PI : 0), kind: "ridge" });
        }
      }
    }
  }
  // the church: the eight wings' ridges (14.7 m above the floor, from 11 m out to the wing's end) and the drum cornice
  const ch = world.church, P0 = ch.placement.position, rot = ch.placement.rotationY;
  const ends = [25.5, 19.0, 18.4, 19.1, 25.2, 15.6, 15.3, 14.5];   // stjob.json wing_ends_from_centre N NE E SE S SW W NW
  const toW = (x, y, z) => { const c = Math.cos(rot), s = Math.sin(rot); return { x: P0.x + x * c + z * s, y: P0.y + y, z: P0.z - x * s + z * c }; };
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;       // 0 = -z (north, the front), turning toward +x
    for (let r = 12; r < ends[k] - 1.2; r += 0.6) {
      const p = toW(Math.sin(a) * r, 14.72, -Math.cos(a) * r);
      out.push({ ...p, yaw: -a + rot + Math.PI / 2 + (out.length % 2 ? Math.PI : 0), kind: "church" });
    }
  }
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, p = toW(Math.sin(a) * 10.15, 98.3 - 75.4 + 0.02, -Math.cos(a) * 10.15);
    out.push({ ...p, yaw: -a + rot, kind: "church" });
  }
  // the Place's setts (pigeons feeding on the ground)
  for (let i = 0; i < 60; i++) {
    const a = (i * 2.399963) % (Math.PI * 2), r = 4 + Math.sqrt(i / 60) * 18;
    const x = PLACE.x + Math.cos(a) * r, z = PLACE.z + Math.sin(a) * r;
    if (world.roof(x, z) > 0) continue;
    out.push({ x, y: world.ground(x, z) - 0.06, z, yaw: a * 3.1, kind: "ground" });   // (the drawn I6 grid is carved ~12 cm under the streets)
  }
  return out;
}
