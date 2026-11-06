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

export const GAUGE = 1.435, RAIL_C = GAUGE / 2 + 0.036;      // rail centre lines (head 72 mm)
export const CREST = -0.19, BED = -0.55;                      // ballast crest / shoulder foot below the rail top (m)
const CREST_HW = 1.65, FOOT_HW = 2.25, CORRIDOR = 2.5;
const SLEEPER_STEP = 0.6, SLEEPER_FAR = 140;
const WIRE_H = 5.5, MESSENGER_H = 6.9, MAST_STEP = 60, MAST_OFF = 2.6;

let docP = null;
/** rail.json, fetched once; tracks get Float32 arrays and their arc length. */
export function loadRail(url = new URL("../../data/rail/rail.json", import.meta.url)) {
  return (docP ??= fetch(url).then((r) => { if (!r.ok) throw new Error(`rail.json: HTTP ${r.status}`); return r.json(); }).then((doc) => {
    for (const t of doc.tracks) {
      const n = t.pts.length, P = new Float32Array(n * 3), S = new Float32Array(n);
      t.pts.forEach((p, i) => { P.set(p, i * 3); if (i) S[i] = S[i - 1] + Math.hypot(p[0] - t.pts[i - 1][0], p[2] - t.pts[i - 1][2]); });
      t.P = P; t.S = S; t.len = S[n - 1];
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of t.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
      t.box = { x0, x1, z0, z1 };
      t.hash = (parseInt(t.id.slice(1), 10) % 7) * 0.0012;      // ribbons of tracks meeting at a switch: a few mm apart, no z-fight
    }
    // decks over the line: UrbIS road / foot bridges crossing a track
    doc.decks = doc.bridges.filter((b) => b.type !== "RAB" && b.lines.length);
    return doc;
  }));
}

const tracksIn = (doc, b, m = 0) => doc.tracks.filter((t) => t.box.x1 >= b.x0 - m && t.box.x0 <= b.x1 + m && t.box.z1 >= b.z0 - m && t.box.z0 <= b.z1 + m);
const inside = (b, x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;

/** frames along a track: per point the position, the horizontal tangent and left normal */
function frames(t) {
  const n = t.pts.length, F = [];
  for (let i = 0; i < n; i++) {
    const a = t.pts[Math.max(0, i - 1)], b = t.pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[2] - a[2]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    F.push({ x: t.pts[i][0], y: t.pts[i][1], z: t.pts[i][2], tx, tz, nx: -tz, nz: tx, s: t.S[i] });
  }
  return F;
}

// ------------------------------------------------------------------------------------------------ terrain carving
/** Lower the tile's terrain under the ballast (positions of the 1 m grid, in place). Returns the number of vertices
 *  moved. The terrain mesh shares this array: call before its first upload (or set needsUpdate). */
export function carveTerrain(doc, geo, hdr, bounds) {
  const pos = geo.attributes.position.array;
  const { x0, z0, cols, rows, step } = hdr;
  let moved = 0;
  const mask = new Uint8Array(cols * rows), dirtyList = [];
  const dirty = { add(k) { if (!mask[k]) { mask[k] = 1; dirtyList.push(k); } }, get size() { return dirtyList.length; } };
  const bx0 = x0 - CORRIDOR, bx1 = x0 + (cols - 1) * step + CORRIDOR, bz0 = z0 - CORRIDOR, bz1 = z0 + (rows - 1) * step + CORRIDOR;
  for (const t of tracksIn(doc, bounds, CORRIDOR + 1)) {
    const P = t.pts;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if ((a[0] < bx0 && b[0] < bx0) || (a[0] > bx1 && b[0] > bx1) || (a[2] < bz0 && b[2] < bz0) || (a[2] > bz1 && b[2] > bz1)) continue;
      const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - CORRIDOR - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(a[0], b[0]) + CORRIDOR - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - CORRIDOR - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(a[2], b[2]) + CORRIDOR - z0) / step));
      const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1e-9;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        const u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[2]) * dz) / L2));
        const ex = px - a[0] - dx * u, ez = pz - a[2] - dz * u, d2 = ex * ex + ez * ez;
        if (d2 > CORRIDOR * CORRIDOR) continue;
        const d = Math.sqrt(d2);
        const rt = a[1] + (b[1] - a[1]) * u;
        // the ballast surface at d, minus 6 cm (and a 30 cm cess beyond the foot)
        const surf = d < CREST_HW ? rt + CREST : d < FOOT_HW ? rt + CREST + (BED - CREST) * (d - CREST_HW) / (FOOT_HW - CREST_HW) : rt + BED;
        const k = (r * cols + c) * 3 + 1;
        const lim = surf - 0.06;
        if (pos[k] > lim) { pos[k] = lim; moved++; dirty.add(r * cols + c); }
      }
    }
  }
  // platforms: the ground inside them under their top (a cutting's bank, the 1 m DTM's slope, stays out)
  for (const pf of doc.platforms) {
    const xs = pf.ring.map((q) => q[0]), zs = pf.ring.map((q) => q[1]);
    if (Math.max(...xs) < x0 || Math.min(...xs) > x0 + (cols - 1) * step || Math.max(...zs) < z0 || Math.min(...zs) > z0 + (rows - 1) * step) continue;
    const c0 = Math.max(0, Math.floor((Math.min(...xs) - 1 - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(...xs) + 1 - x0) / step));
    const r0 = Math.max(0, Math.floor((Math.min(...zs) - 1 - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(...zs) + 1 - z0) / step));
    const r = pf.ring;
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      const px = x0 + c * step, pz = z0 + rr * step;
      let inside = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside; }
      if (!inside) continue;
      const k = (rr * cols + c) * 3 + 1;
      if (pos[k] > pf.top - 0.1) { pos[k] = pf.top - 0.1; moved++; dirty.add(rr * cols + c); }
    }
  }

  // embankment fill: where the track runs above the ground off a bridge (the 1 m DTM's slope at the end of a viaduct,
  // under the masonry it cannot see), the ground is raised to a 1:1.5 fill from the ballast foot, at most FILL_MAX out
  const FILL_MAX = 18;
  const rabs = doc.bridges.filter((b) => b.type === "RAB").map((b) => {
    const xs = b.ring.map((q) => q[0]), zs = b.ring.map((q) => q[1]);
    return { ring: b.ring, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  }).filter((b) => b.x1 > x0 - FILL_MAX && b.x0 < x0 + cols * step + FILL_MAX && b.z1 > z0 - FILL_MAX && b.z0 < z0 + rows * step + FILL_MAX);
  const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  let near = rabs;
  const onBridge = (x, z) => { for (const b of near) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z)) return true; return false; };
  const gridY = (x, z) => { const c = Math.round((x - x0) / step), r = Math.round((z - z0) / step); return c >= 0 && r >= 0 && c < cols && r < rows ? pos[(r * cols + c) * 3 + 1] : null; };
  let filled = 0;
  for (const t of tracksIn(doc, bounds, FILL_MAX + 1)) {
    const P = t.pts;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2, g = gridY(mx, mz);
      if (g == null) continue;
      near = rabs;
      if (g == null || a[1] + BED - g < 0.4 || onBridge(mx, mz)) continue;     // on its bed, or on a bridge
      const W = Math.min(FILL_MAX, FOOT_HW + 1.5 * (a[1] + BED - g) + 1);
      near = rabs.filter((b) => b.x1 > mx - W - 2 && b.x0 < mx + W + 2 && b.z1 > mz - W - 2 && b.z0 < mz + W + 2);
      const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - W - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(a[0], b[0]) + W - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - W - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(a[2], b[2]) + W - z0) / step));
      const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1e-9;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        const u = (((px - a[0]) * dx + (pz - a[2]) * dz) / L2);
        if (u < -0.01 || u > 1.01) continue;                 // across this segment only (no fans at its ends)
        const d = Math.hypot(px - a[0] - dx * u, pz - a[2] - dz * u);
        if (d > W || onBridge(px, pz)) continue;
        const rt = a[1] + (b[1] - a[1]) * u;
        const target = rt + BED - 0.07 - Math.max(0, d - FOOT_HW) / 1.5;
        const k = (r * cols + c) * 3 + 1;
        if (pos[k] < target) { pos[k] = target; filled++; dirty.add(r * cols + c); }
      }
    }
  }
  moved += filled;
  // normals of the moved vertices and their neighbours (central differences on the grid, as the tile worker does)
  const nrm = geo.attributes.normal?.array;
  if (nrm && dirty.size) {
    const Y = (r, c) => pos[(Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))) * 3 + 1];
    const todo = [];
    for (const k of dirtyList) { const r = Math.floor(k / cols), c = k % cols; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && mask[rr * cols + cc] !== 2) { if (!mask[rr * cols + cc]) todo.push(rr * cols + cc); mask[rr * cols + cc] = mask[rr * cols + cc] || 3; } } }
    for (const k of dirtyList.concat(todo)) {
      const r = Math.floor(k / cols), c = k % cols;
      const hx = (Y(r, c + 1) - Y(r, c - 1)) / (2 * step), hz = (Y(r + 1, c) - Y(r - 1, c)) / (2 * step), L = Math.hypot(hx, 1, hz);
      nrm[k * 3] = -hx / L; nrm[k * 3 + 1] = 1 / L; nrm[k * 3 + 2] = -hz / L;
    }
    geo.attributes.normal.needsUpdate = true;
  }
  if (moved) geo.attributes.position.needsUpdate = true;      // (the bounding sphere hardly changes: not recomputed, 250k points)
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
  const concrete = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
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

// ------------------------------------------------------------------------------------------------ per-tile geometry
const PROFILE = [[-FOOT_HW, BED], [-CREST_HW, CREST], [-0.8, CREST + 0.01], [0, CREST + 0.012], [0.8, CREST + 0.01], [CREST_HW, CREST], [FOOT_HW, BED]];
const RAILP = [[-0.075, -0.165], [-0.036, -0.05], [-0.036, -0.008], [-0.03, 0], [0.03, 0], [0.036, -0.008], [0.036, -0.05], [0.075, -0.165]];

/** Build the railway of one tile: returns { group, stats, dispose }. */
export function railTile(doc, bounds) {
  const M = railMaterials();
  const group = new THREE.Group(); group.name = "railway";
  const ts = tracksIn(doc, bounds, 1);
  const bal = { p: [], n: [], u: [], s: [], i: [] }, rl = { p: [], i: [] };
  const sleepers = [], masts = [], wires = { p: [], t: [], side: [], r: [], i: [] };
  let km = 0;
  const pRings = doc.platforms.filter((p) => p.ring.some(([x, z]) => x > bounds.x0 - 20 && x < bounds.x1 + 20 && z > bounds.z0 - 20 && z < bounds.z1 + 20)).map((p) => p.ring);
  const onPlatform = (x, z) => pRings.some((r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; });
  for (const t of ts) {
    const F = frames(t);
    // the tile's run of this track: points whose segment midpoint is in the tile (+ the neighbours)
    let i0 = -1, i1 = -1;
    for (let i = 0; i < F.length - 1; i++) {
      if (inside(bounds, (F[i].x + F[i + 1].x) / 2, (F[i].z + F[i + 1].z) / 2)) { if (i0 < 0) i0 = i; i1 = i + 1; }
      else if (i0 >= 0) { addRun(t, F.slice(i0, i1 + 1)); i0 = -1; }
    }
    if (i0 >= 0) addRun(t, F.slice(i0, i1 + 1));
  }
  function addRun(t, F) {
    if (F.length < 2) return;
    km += F[F.length - 1].s - F[0].s;
    const lift = t.hash;
    // ballast ribbon
    let v0 = bal.p.length / 3;
    for (const f of F) {
      for (const [d, h] of PROFILE) {
        bal.p.push(f.x + f.nx * d, f.y + h + lift, f.z + f.nz * d);
        bal.u.push(d); bal.s.push(f.s);
      }
    }
    const K = PROFILE.length;
    for (let i = 0; i < F.length - 1; i++) for (let k = 0; k < K - 1; k++) {
      const a = v0 + i * K + k, b = a + 1, c = a + K, d = c + 1;
      bal.i.push(a, b, c, b, d, c);
    }
    // rails
    for (const side of [-1, 1]) {
      v0 = rl.p.length / 3;
      for (const f of F) for (const [d, h] of RAILP) {
        const o = side * RAIL_C + d;
        rl.p.push(f.x + f.nx * o, f.y + h, f.z + f.nz * o);
      }
      const R = RAILP.length;
      for (let i = 0; i < F.length - 1; i++) for (let k = 0; k < R - 1; k++) {
        const a = v0 + i * R + k, b = a + 1, c = a + R, d = c + 1;
        rl.i.push(a, b, c, b, d, c);
      }
    }
    // sleepers on the run's arc length grid (global: the same sleepers whichever tile draws them)
    const sA = F[0].s, sB = F[F.length - 1].s;
    for (let s = Math.ceil(sA / SLEEPER_STEP) * SLEEPER_STEP; s < sB; s += SLEEPER_STEP) {
      const f = sample(F, s);
      sleepers.push(f);
    }
    // masts every MAST_STEP of the track's own arc length, on the side away from the nearest parallel track
    if (t.electrified) {
      for (let s = Math.ceil(sA / MAST_STEP) * MAST_STEP; s < sB; s += MAST_STEP) {
        const f = sample(F, s);
        const side = outerSide(doc, t, f);
        // not on a platform: step out until the foot is off it (the cantilever stretches back to the wire)
        let off = MAST_OFF;
        while (off < 9 && onPlatform(f.x + f.nx * off * side, f.z + f.nz * off * side)) off += 0.5;
        if (off > MAST_OFF) off += 0.4;
        masts.push({ ...f, side, off });
      }
      // wires: contact (zigzag +-0.2 m between masts) and catenary (sagging between masts) + droppers every 6 m
      const contact = [], mess = [];
      for (let s = sA; s <= sB + 0.01; s += 3) {
        const f = sample(F, Math.min(s, sB));
        const ph = (f.s / MAST_STEP) % 2, zig = (ph < 1 ? ph : 2 - ph) * 0.4 - 0.2;
        const m = (f.s / MAST_STEP) % 1, sag = 4 * m * (1 - m) * 0.75;
        contact.push([f.x + f.nx * zig, f.y + WIRE_H, f.z + f.nz * zig]);
        mess.push([f.x, f.y + MESSENGER_H - sag, f.z]);
        if (Math.round(f.s) % 6 === 0) addWire(wires, [[f.x + f.nx * zig, f.y + WIRE_H, f.z + f.nz * zig], [f.x, f.y + MESSENGER_H - sag, f.z]], 0.004);
      }
      addWire(wires, contact, 0.0065);
      addWire(wires, mess, 0.0055);
    }
  }
  const mk = (p, i, extra = {}) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(p), 3));
    for (const [k, [a, n]] of Object.entries(extra)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(a), n));
    g.setIndex(i.length > 65535 ? new THREE.Uint32BufferAttribute(i, 1) : new THREE.Uint16BufferAttribute(i, 1));
    g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  };
  const stats = { km: +(km / 1000).toFixed(2), sleepers: sleepers.length, masts: masts.length, tris: 0 };
  if (bal.p.length) {
    const m = new THREE.Mesh(mk(bal.p, bal.i, { aU: [bal.u, 1], aS: [bal.s, 1] }), M.ballast);
    m.receiveShadow = true; m.name = "rail-ballast"; group.add(m);
    const r = new THREE.Mesh(mk(rl.p, rl.i), M.rails);
    r.receiveShadow = true; r.castShadow = false; r.name = "rail-rails"; group.add(r);
    stats.tris += (bal.i.length + rl.i.length) / 3;
  }
  if (sleepers.length) {
    const g = sleeperGeometry();
    const im = new THREE.InstancedMesh(g, M.sleepers, sleepers.length);
    const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    sleepers.forEach((f, k) => { q.setFromAxisAngle(up, Math.atan2(-f.tz, f.tx)); Mx.compose(v.set(f.x, f.y, f.z), q, one); im.setMatrixAt(k, Mx); });
    im.receiveShadow = true; im.castShadow = false; im.name = "rail-sleepers";
    im.computeBoundingSphere(); group.add(im);
    stats.tris += sleepers.length * g.index.count / 3;
  }
  if (masts.length) {
    const g = mastGeometry();
    const im = new THREE.InstancedMesh(g, M.steel, masts.length);
    const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
    masts.forEach((f, k) => {
      q.setFromAxisAngle(up, Math.atan2(-f.tz, f.tx));
      Mx.compose(v.set(f.x + f.nx * f.off * f.side, f.y - 0.6, f.z + f.nz * f.off * f.side), q, sc.set(1, 1, f.side * f.off / MAST_OFF));
      im.setMatrixAt(k, Mx);
    });
    im.castShadow = true; im.receiveShadow = true; im.name = "rail-masts"; im.computeBoundingSphere(); group.add(im);
    stats.tris += masts.length * g.index.count / 3;
  }
  if (wires.p.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(wires.p), 3));
    g.setAttribute("aTan", new THREE.BufferAttribute(new Float32Array(wires.t), 3));
    g.setAttribute("aSide", new THREE.BufferAttribute(new Float32Array(wires.side), 1));
    g.setAttribute("aR", new THREE.BufferAttribute(new Float32Array(wires.r), 1));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(wires.p.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(new THREE.Uint32BufferAttribute(wires.i, 1));
    g.computeBoundingSphere();
    const w = new THREE.Mesh(g, M.wire); w.name = "rail-wires"; w.castShadow = false; w.receiveShadow = false;
    w.frustumCulled = false;            // the expansion moves vertices outside the bounding sphere's notion
    group.add(w);
    stats.tris += wires.i.length / 3;
  }
  // platforms + shelters
  const plat = platformsIn(doc, bounds);
  if (plat) { group.add(plat.mesh); if (plat.shelters) group.add(plat.shelters); stats.platforms = plat.count; stats.tris += plat.tris; }
  // decks over the line (roads, footbridges)
  const decks = decksIn(doc, bounds);
  if (decks) { group.add(decks.mesh); stats.decks = decks.count; stats.tris += decks.tris; }
  stats.tris = Math.round(stats.tris);
  return {
    group, stats,
    dispose() { group.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); group.removeFromParent(); },
  };
}

function sample(F, s) {
  let lo = 0, hi = F.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F[m].s <= s) lo = m; else hi = m; }
  const a = F[lo], b = F[hi], f = Math.max(0, Math.min(1, (s - a.s) / ((b.s - a.s) || 1)));
  const tx = a.tx + (b.tx - a.tx) * f, tz = a.tz + (b.tz - a.tz) * f, L = Math.hypot(tx, tz) || 1;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, tx: tx / L, tz: tz / L, nx: -tz / L, nz: tx / L, s };
}

/** +1 (left) or -1: the side of the track with no other track within 6 m (the masts stand outside the pair) */
function outerSide(doc, t, f) {
  const near = (side) => {
    const px = f.x + f.nx * side * 4, pz = f.z + f.nz * side * 4;
    let dmin = Infinity;
    for (const o of doc.tracks) {
      if (o === t || px < o.box.x0 - 8 || px > o.box.x1 + 8 || pz < o.box.z0 - 8 || pz > o.box.z1 + 8) continue;
      for (let i = 0; i < o.pts.length; i += 2) { const p = o.pts[i]; const d = (p[0] - px) ** 2 + (p[2] - pz) ** 2; if (d < dmin) dmin = d; }
    }
    return dmin;
  };
  return near(1) >= near(-1) ? 1 : -1;
}

function addWire(W, pts, r) {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2], L = Math.hypot(tx, ty, tz) || 1;
    const v0 = W.p.length / 3;
    for (const p of [a, b]) for (const sd of [-1, 1]) { W.p.push(p[0], p[1], p[2]); W.t.push(tx / L, ty / L, tz / L); W.side.push(sd); W.r.push(r); }
    W.i.push(v0, v0 + 2, v0 + 1, v0 + 1, v0 + 2, v0 + 3);
  }
}

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

// ------------------------------------------------------------------------------------------------ platforms, decks
function ringArea(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }

function platformsIn(doc, bounds) {
  const list = doc.platforms.filter((p) => { const c = p.ring.reduce((s, q) => [s[0] + q[0] / p.ring.length, s[1] + q[1] / p.ring.length], [0, 0]); return inside(bounds, c[0], c[1]); });
  if (!list.length) return null;
  const P = [], E = [], I = [];
  const shelters = [];
  for (const pf of list) {
    let ring = pf.ring.slice(0, pf.ring[0][0] === pf.ring.at(-1)[0] && pf.ring[0][1] === pf.ring.at(-1)[1] ? -1 : undefined);
    if (ringArea(ring) < 0) ring = ring.reverse();          // counter-clockwise in (x, z)
    // distance of each vertex to the nearest track (the edge side gets the coping / yellow line)
    const edgeD = (x, z) => {
      let best = Infinity;
      for (const t of doc.tracks) {
        if (x < t.box.x0 - 6 || x > t.box.x1 + 6 || z < t.box.z0 - 6 || z > t.box.z1 + 6) continue;
        for (const p of t.pts) { const d = Math.hypot(p[0] - x, p[2] - z); if (d < best) best = d; }
      }
      return Math.max(0, best - 1.65);                        // the edge stands 1.65 m from the track centre
    };
    const top = pf.top;
    const v0 = P.length / 3;
    const pts2 = ring.map(([x, z]) => new THREE.Vector2(x, z));
    const tri = THREE.ShapeUtils.triangulateShape(pts2, []);
    for (const [x, z] of ring) { P.push(x, top, z); E.push(edgeD(x, z)); }
    for (const [a, b, c] of tri) I.push(v0 + a, v0 + c, v0 + b);
    // sides down to 1.2 m below the top (the ballast hides the rest)
    const v1 = P.length / 3;
    for (const [x, z] of ring) { P.push(x, top, z, x, top - 1.3, z); E.push(9, 9); }
    for (let k = 0; k < ring.length; k++) {
      const a = v1 + k * 2, b = v1 + ((k + 1) % ring.length) * 2;
      I.push(a, b, a + 1, b, b + 1, a + 1);
    }
    if (pf.shelter) {
      // a shelter at the platform's middle, along its long axis
      let cx = 0, cz = 0; for (const [x, z] of ring) { cx += x / ring.length; cz += z / ring.length; }
      let best = 0, ang = 0;
      for (let k = 0; k < ring.length; k++) { const a = ring[k], b = ring[(k + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
      shelters.push({ x: cx, y: top, z: cz, yaw: -ang });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("aEdge", new THREE.Float32BufferAttribute(E, 1));
  g.setIndex(I);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); ng.computeBoundingSphere();
  const mesh = new THREE.Mesh(ng, railMaterials().platform);
  mesh.receiveShadow = true; mesh.castShadow = true; mesh.name = "rail-platforms";
  let sh = null;
  if (shelters.length) {
    const geo = shelterGeometry();
    sh = new THREE.InstancedMesh(geo, railMaterials().steel, shelters.length);
    const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    shelters.forEach((s, k) => { q.setFromAxisAngle(up, s.yaw); Mx.compose(v.set(s.x, s.y, s.z), q, one); sh.setMatrixAt(k, Mx); });
    sh.castShadow = sh.receiveShadow = true; sh.name = "rail-shelters"; sh.computeBoundingSphere();
  }
  return { mesh, shelters: sh, count: list.length, tris: I.length / 3 + (sh ? shelters.length * shelterGeometry().index.count / 3 : 0) };
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

function decksIn(doc, bounds) {
  const list = doc.decks.filter((b) => inside(bounds, b.centre[0], b.centre[1]));
  if (!list.length) return null;
  const parts = [];
  for (const b of list) {
    let ring = b.ring.slice(0, -1);
    if (ringArea(ring) < 0) ring = ring.reverse();
    const top = b.ground, th = 0.9;
    const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false });
    g.rotateX(-Math.PI / 2).translate(0, top - th - 0.02, 0);   // shape (x, -z) extruded up: top at the DTM (the road on it)
    parts.push(g);
  }
  const g = mergeAll(parts);
  const mesh = new THREE.Mesh(g, railMaterials().concrete);
  mesh.castShadow = mesh.receiveShadow = true; mesh.name = "rail-decks";
  return { mesh, count: list.length, tris: g.index.count / 3 };
}
