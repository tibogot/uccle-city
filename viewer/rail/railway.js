// THE RAILWAY OF UCCLE: tracks, ballast, sleepers, catenary, platforms, road decks over the line, per tile.
//
// Data: data/rail/rail.json (pipeline/build_rail.py): every OSM track touching a built tile, densified to 2 m, its rail
// top fitted to the LiDAR DTM (bridges / tunnels interpolated); the platforms (OSM areas, 0.76 m); the UrbIS bridges.
// Everything here is procedural (simple, repeated, data-driven: the owner's rule) and cheap:
//   ballast   one ribbon per track (7 points across: crest 3.3 m, 1:1.5 shoulders), merged per tile; its shader draws the
//             sleepers and rails too (box-filtered stripes), which is what you see beyond the geometry's range
//   rails     a 8-point head/web/foot profile swept along each rail, merged per tile (steel head, rusty sides)
//   sleepers  concrete monoblocks every 0.60 m, one InstancedMesh per tile, drawn up to SLEEPER_FAR (dithered fade)
//   catenary  H-masts with a cantilever every ~60 m on the outer side, contact wire 5.5 m + catenary wire with droppers;
//             wires are "AA wires": expanded to at least ~1 px in the vertex shader, their coverage as alpha-to-coverage,
//             so a 1.2 cm wire at 200 m is a faint steady line instead of a crawling dotted one
//   platforms the OSM areas extruded to their height, a coping edge (white) and a yellow safety line, shelters
//   decks     the UrbIS ROB / PB polygons over the line (roads and footbridges OVER the railway): a slab + parapets,
//             at the DTM height (which carries the deck), because carveTerrain() opens the corridor under them
// carveTerrain(): pushes the tile's terrain under the ballast (and opens the cutting under road decks) - the DTM's bed
// would otherwise poke through the ballast or roof the line over at road bridges.
import * as THREE from "three/webgpu";
import {
  attribute, positionWorld, positionLocal, cameraPosition, normalWorld, float, vec2, vec3, mix, smoothstep, clamp, fract, floor,
  abs, max, min, step, fwidth, uniform, color, sin, length, normalize, cross, select, Fn,
} from "three/tsl";
import { hash2D, noise2D, filteredPulse } from "../tslkit.js";
import { SMOOTH, ditherNoise, lodEye } from "../lodFade.js";

import { prepRail, carveGrid, railTileData, SLEEPER_STEP, SLEEPER_FAR, RAIL_C, WIRE_H, MESSENGER_H, MAST_OFF } from "./railData.js";
export { GAUGE, RAIL_C, CREST, BED } from "./railData.js";

let docP = null;
/** rail.json, fetched once (arc lengths, boxes, decks: railData.js prepRail). */
export function loadRail(url = new URL("../../data/rail/rail.json", import.meta.url)) {
  return (docP ??= fetch(url).then((r) => { if (!r.ok) throw new Error(`rail.json: HTTP ${r.status}`); return r.json(); }).then(prepRail));
}
let heroP = null;
/** the hero bridges' notes (models/rail/<name>.json): footprints and openings for the carve and the trees */
export function loadHeroes(names = ["stjob", "calevoet"]) {
  return (heroP ??= Promise.all(names.map((n) => fetch(new URL(`../../models/rail/${n}.json`, import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((a) => a.filter(Boolean)));
}

/** Main-thread carve for the Train Lab (the city does it in the tile worker): on a position attribute laid out as the
 *  tile grid (x, y, z per cell, row-major). */
export function carveTerrain(doc, geo, hdr, bounds, heroes = []) {
  const pos = geo.attributes.position.array, n = hdr.cols * hdr.rows, Y = new Float32Array(n);
  for (let k = 0; k < n; k++) Y[k] = pos[k * 3 + 1];
  const { moved, dirty } = carveGrid(doc, Y, hdr, bounds, heroes);
  for (const k of dirty) pos[k * 3 + 1] = Y[k];
  if (moved) geo.attributes.position.needsUpdate = true;
  return moved;
}

// ------------------------------------------------------------------------------------------------ materials (shared)
let mats = null;
/** world-space distance fade for near-only geometry (sleepers): dithered, 0..1 kept below `far` */
const nearKeep = (far, band) => {
  const d = positionWorld.sub(lodEye).length();
  const keep = float(1).sub(smoothstep(far - band, far, d));
  return ditherNoise().lessThan(keep);
};
export function railMaterials() {
  if (mats) return mats;
  const u = attribute("aU", "float"), sAlong = attribute("aS", "float");
  // ballast: crushed porphyry / limestone, grey with rusty brown, a darker oily band between the rails; beyond the
  // sleeper geometry the sleepers and rails are drawn here as box-filtered stripes (same colours), so they never pop
  const ballast = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  {
    const p = positionWorld.xz;
    // stones: two hashed grids at odd angles and scales (no visible grid), averaged away with the pixel footprint
    const r1 = vec2(p.x.mul(0.799).sub(p.y.mul(0.602)), p.x.mul(0.602).add(p.y.mul(0.799))).mul(26.0);
    const r2 = vec2(p.x.mul(0.276).add(p.y.mul(0.961)), p.y.mul(0.276).sub(p.x.mul(0.961))).mul(33.0);
    const fwp = fwidth(p.x).max(0.0005);
    const stones = hash2D(floor(r1)).add(hash2D(floor(r2))).mul(0.5).add(noise2D(p.mul(9.0)).sub(0.5).mul(0.5));
    const g1 = mix(stones, float(0.5), smoothstep(0.015, 0.05, fwp)), g2 = noise2D(p.mul(1.7)), g3 = noise2D(p.mul(0.23));
    const base = mix(color(0x5d5a55), color(0x948d82), g1).mul(mix(0.85, 1.08, g2)).mul(mix(0.9, 1.06, g3));
    const rust = color(0x5a4334);
    const between = smoothstep(0.9, 0.4, abs(u));
    let col = mix(base, rust, between.mul(0.35).add(smoothstep(1.4, 2.2, abs(u)).mul(0.15)));
    // sleepers (0.6 m, 0.26 wide, |u| < 1.3) and rails (|u| = RAIL_C, 7 cm), filtered by the pixel footprint
    const fw = fwidth(sAlong).max(0.002), fu = fwidth(u).max(0.002);
    const sl = filteredPulse(sAlong.div(SLEEPER_STEP), float(0.5 - 0.26 / 1.2), float(0.5 + 0.26 / 1.2), fw.div(SLEEPER_STEP)).mul(step(abs(u), 1.3));
    const d = positionWorld.sub(lodEye).length();
    const farSl = smoothstep(SLEEPER_FAR - 40, SLEEPER_FAR - 5, d);      // where the instanced sleepers fade out
    col = mix(col, color(0x8d8a84), sl.mul(farSl).mul(0.85));
    const railCov = clamp(float(0.072).div(fu.mul(1.0)).min(1), 0, 1).mul(smoothstep(0.036 + 0.0, 0.0, abs(abs(u).sub(RAIL_C)).sub(fu.mul(0.5))).max(0));
    ballast.colorNode = mix(col, color(0x6f6a66), railCov.mul(smoothstep(60, 120, d)).mul(0.8));
    ballast.roughnessNode = float(0.95);
  }
  // rails: polished head (top), rusty brown web / foot / sides
  const rails = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.85 });
  {
    const top = smoothstep(0.6, 0.9, normalWorld.y);
    rails.colorNode = mix(color(0x55463c), color(0xb9b9bc), top);
    rails.roughnessNode = mix(float(0.85), float(0.28), top);
    rails.metalnessNode = mix(float(0.15), float(0.95), top);
  }
  const sleepers = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
  {
    const n = noise2D(positionWorld.xz.mul(3.0));
    sleepers.colorNode = mix(color(0x7f7c76), color(0x9a958c), n);
    if (SMOOTH) sleepers.maskNode = nearKeep(SLEEPER_FAR, 30);
  }
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0x8b9194, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide });   // (masts are mirrored per side)
  // AA wires: see the header
  const wire = new THREE.MeshStandardNodeMaterial({ color: 0x2a2c2e, roughness: 0.5, metalness: 0.6 });
  {
    const tan = attribute("aTan", "vec3"), side = attribute("aSide", "float"), r = attribute("aR", "float");
    const toCam = cameraPosition.sub(positionLocal);
    const dist = length(toCam);
    const px = dist.mul(0.0011);                                   // ~1 px at 1080p, 60 deg fov
    const w = max(r, px);
    const off = normalize(cross(tan, toCam)).mul(side).mul(w);
    wire.positionNode = positionLocal.add(off);
    wire.opacityNode = clamp(r.div(w), 0.08, 1).mul(float(1).sub(smoothstep(500, 900, dist)));
    wire.alphaToCoverage = true;
    wire.transparent = false;
  }
  const concrete = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  {
    const p = positionWorld;
    const n = noise2D(p.xz.mul(0.8).add(p.y)), n2 = hash2D(floor(p.xz.mul(3.33)));
    concrete.colorNode = mix(color(0x8b8780), color(0x9d988f), n).mul(mix(0.96, 1.03, n2));
  }
  // platform top: 30 cm concrete pavers, the white coping (aU < 0.3 m from the edge) and the yellow line (1.5 m in)
  const platform = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
  {
    const e = attribute("aEdge", "float");                          // metres from the platform edge (track side)
    const p = positionWorld.xz;
    const fw = fwidth(p.x).max(0.001);
    const joints = filteredPulse(p.x.div(0.3), float(0), float(0.03), fw.div(0.3)).max(filteredPulse(p.y.div(0.3), float(0), float(0.03), fw.div(0.3)));
    let col = mix(color(0x8e8a84), color(0x6c6964), joints.mul(0.6)).mul(mix(0.95, 1.05, hash2D(floor(p.mul(3.333)))));
    col = mix(col, color(0xd8d6cf), step(e, 0.32));
    col = mix(col, color(0xd9b21c), step(1.45, e).mul(step(e, 1.55)));
    platform.colorNode = col;
  }
  mats = { ballast, rails, sleepers, steel, wire, concrete, platform };
  for (const m of Object.values(mats)) m.userData.shared = true;
  return mats;
}

// ------------------------------------------------------------------------------------------------ per-tile meshes
/** The railway of one tile from railTileData() arrays (made in the tile worker): returns { group, stats, dispose }. */
export function railTileMeshes(data) {
  const M = railMaterials();
  const group = new THREE.Group(); group.name = "railway";
  const geo = (attrs, index) => {
    const g = new THREE.BufferGeometry();
    for (const [k, [a, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(a, n));
    if (index) g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingSphere();
    return g;
  };
  const inst = (g, mat, matrices, name, cast) => {
    const n = matrices.length / 16, im = new THREE.InstancedMesh(g, mat, n);
    im.instanceMatrix.array.set(matrices); im.instanceMatrix.needsUpdate = true;
    im.castShadow = cast; im.receiveShadow = true; im.name = name; im.computeBoundingSphere(); group.add(im);
  };
  if (data.ballast) {
    const b = data.ballast, r = data.rails;
    const m = new THREE.Mesh(geo({ position: [b.position, 3], normal: [b.normal, 3], aU: [b.aU, 1], aS: [b.aS, 1] }, b.index), M.ballast);
    m.receiveShadow = true; m.name = "rail-ballast"; group.add(m);
    const rr = new THREE.Mesh(geo({ position: [r.position, 3], normal: [r.normal, 3] }, r.index), M.rails);
    rr.receiveShadow = true; rr.name = "rail-rails"; group.add(rr);
  }
  if (data.sleepers) inst(sleeperGeometry(), M.sleepers, data.sleepers, "rail-sleepers", false);
  if (data.masts) inst(mastGeometry(), M.steel, data.masts, "rail-masts", true);
  if (data.wires) {
    const w = data.wires;
    const nrm = new Float32Array(w.position.length); for (let k = 1; k < nrm.length; k += 3) nrm[k] = 1;
    const mesh = new THREE.Mesh(geo({ position: [w.position, 3], normal: [nrm, 3], aTan: [w.aTan, 3], aSide: [w.aSide, 1], aR: [w.aR, 1] }, w.index), M.wire);
    mesh.name = "rail-wires"; mesh.frustumCulled = false;     // the expansion moves vertices outside the bounding sphere
    group.add(mesh);
  }
  if (data.platforms) {
    const p = data.platforms;
    const m = new THREE.Mesh(geo({ position: [p.position, 3], normal: [p.normal, 3], aEdge: [p.aEdge, 1] }), M.platform);
    m.castShadow = m.receiveShadow = true; m.name = "rail-platforms"; group.add(m);
  }
  if (data.shelters) inst(shelterGeometry(), M.steel, data.shelters, "rail-shelters", true);
  if (data.decks) {
    const d = data.decks;
    const m = new THREE.Mesh(geo({ position: [d.position, 3], normal: [d.normal, 3] }), M.concrete);
    m.castShadow = m.receiveShadow = true; m.name = "rail-decks"; group.add(m);
  }
  const stats = { ...data.stats };
  return {
    group, stats,
    dispose() { group.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); group.removeFromParent(); },
  };
}
/** Data + meshes on the main thread (the Train Lab). */
export function railTile(doc, bounds) { return railTileMeshes(railTileData(doc, bounds)); }

let sleeperGeo = null, mastGeo = null;
/** B70-type concrete monoblock: 2.6 m, 0.30 m at the foot, 0.17 at the top, 0.21 high; origin = track centre at the
 *  rail top (its top at the rail foot: -0.172) */
function sleeperGeometry() {
  if (sleeperGeo) return sleeperGeo;
  const top = -0.172, bot = top - 0.21, hl = 1.3;
  const P = [], I = [];
  const ring = (y, w, l) => [[-w / 2, y, -l], [w / 2, y, -l], [w / 2, y, l], [-w / 2, y, l]];
  const A = ring(bot + 0.12, 0.30, hl), B = ring(top, 0.20, hl - 0.04);
  for (const p of [...A, ...B]) P.push(...p);
  const quad = (a, b, c, d) => I.push(a, b, c, a, c, d);
  quad(4, 7, 6, 5);                     // top (+y)
  quad(0, 1, 5, 4); quad(1, 2, 6, 5); quad(2, 3, 7, 6); quad(3, 0, 4, 7);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  sleeperGeo = g.toNonIndexed(); sleeperGeo.computeVertexNormals();
  sleeperGeo.setIndex(Array.from({ length: sleeperGeo.attributes.position.count }, (_, i) => i));
  sleeperGeo.userData.shared = true;
  return sleeperGeo;
}
/** Infrabel-style catenary mast: an H-section steel column (0.24 m), a tubular cantilever + stay to the track, origin at
 *  the mast foot, the track at local -z (scale z = -1 flips it to the other side) */
function mastGeometry() {
  if (mastGeo) return mastGeo;
  const parts = [];
  const box = (w, h, d, x, y, z) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const H = 8.1;
  box(0.18, H, 0.02, 0, H / 2, 0);                         // web (HEB 180-ish)
  box(0.02, H, 0.18, -0.09, H / 2, 0); box(0.02, H, 0.18, 0.09, H / 2, 0);   // flanges
  box(0.5, 0.6, 0.5, 0, 0.3, 0);                           // concrete foundation block (above ground)
  const tube = (a, b, r) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, 6, 1).translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).translate(A.x, A.y, A.z);
    parts.push(g);
  };
  // cantilever toward -z (the track), heights local (the mast foot is 0.6 m under the rail top): the top tube carries
  // the catenary wire, the strut under it, the registration arm holds the contact wire, a dropper links them
  const yM = MESSENGER_H + 0.6, yC = WIRE_H + 0.6;
  tube([0, yM + 0.25, -0.12], [0, yM + 0.02, -MAST_OFF - 0.25], 0.028);
  tube([0, yC + 0.2, -0.12], [0, yM - 0.05, -MAST_OFF + 0.25], 0.026);
  tube([0, yC + 0.42, -MAST_OFF + 0.7], [0, yC + 0.02, -MAST_OFF], 0.016);
  tube([0, yM - 0.05, -MAST_OFF + 0.7], [0, yC + 0.42, -MAST_OFF + 0.7], 0.012);
  box(0.05, 0.12, 0.05, 0, yM - 0.02, -MAST_OFF);                    // catenary clamp
  for (let k = 0; k < 3; k++) box(0.09, 0.035, 0.09, 0, yC + 0.2, -0.32 - k * 0.07);   // insulator discs (hint)
  let g = mergeAll(parts);
  g.userData.shared = true;
  mastGeo = g;
  return g;
}
function mergeAll(list) {
  const geos = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute("uv"); return n; });
  let count = 0; for (const g of geos) count += g.attributes.position.count;
  const P = new Float32Array(count * 3), N = new Float32Array(count * 3);
  let o = 0;
  for (const g of geos) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  out.setIndex(Array.from({ length: count }, (_, i) => i));
  out.computeBoundingSphere();
  return out;
}

let shelterGeo = null;
/** SNCB standard platform shelter: steel posts, a sloping roof, a glass back (drawn as steel-grey here; Blender later) */
function shelterGeometry() {
  if (shelterGeo) return shelterGeo;
  const parts = [];
  const box = (w, h, d, x, y, z) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  for (const x of [-3.6, -1.2, 1.2, 3.6]) box(0.1, 2.6, 0.1, x, 1.3, 0.55);
  box(7.8, 0.08, 1.9, 0, 2.62, 0); box(7.8, 0.18, 0.08, 0, 2.55, -0.95);
  box(7.4, 1.9, 0.03, 0, 1.25, 0.6);
  box(3.0, 0.08, 0.4, 0, 0.45, 0.35);                         // bench
  shelterGeo = mergeAll(parts); shelterGeo.userData.shared = true;
  return shelterGeo;
}
