// COLLISION TEST of one loaded tile (docs/collisions/README.md; the owner: "anything that needs collision works as it
// should"): what the city DRAWS against what the car / the walker / the third-person body COLLIDE with.
//
//   const r = await viewer.collisionTest("E4", { drive: true, walk: true })
//
// 1. TRUTH: every solid thing drawn in the tile, rasterised on a 0.25 m plan grid in two height bands over the ground
//    (car: 0.30-1.30 m over the drive surface, road walls from 0.55 m; person: 0.28-1.80 m over the walking surface: the body steps 0.25 m): building walls / details /
//    the facade kit, every landmark's and bridge's LOD0 (yards, fences, walls, steps, parapets), street furniture
//    (signals, stop poles, benches, bike racks, shelters), tram poles and shelters, rail masts and platforms; the drawn
//    trees (trunks), lamps and bollards (their placed points) and the parked cars (their boxes). Leaves, wires, lights,
//    ground meshes and anything above the band are not solid.
// 2. STATIC (the whole tile, every cell): the car colliders (the tile's drive set + the hero statics) rasterised the
//    same way, compared both ways with a distance transform:
//      invisible  a collider's edge with nothing drawn within 0.5 m (hits on things with no visible object)
//      missing    a drawn solid cell with no collider within 0.4 m (the car passes through a visible object)
// 3. ROUTES (dynamic, the real physics):
//      drive  the car (carPhysics stepCar + carEnv, as in drive mode) along every road of the tile on its right lane,
//             pure pursuit at <= 9 m/s: contacts with no drawn solid near the contact point (invisible hit), the car box
//             over drawn solid cells (passed through), the car's height vs the DRAWN surface under it (a ray down onto
//             the terrain / road / deck / landmark meshes: fell through or floats), stuck (no progress for 4 s)
//      walk   the walker / third-person capsule (viewer/character CharacterController in the given CollisionWorld) along
//             both sidewalks of every road: contacts with nothing drawn near (invisible), body over drawn solid
//             (passed through), feet vs the drawn surface (fell through), stuck
// Cells, items and routes are in city metres. Pure main-thread JS; a tile takes a few seconds.
import * as THREE from "three/webgpu";
import { createCarState, stepCar, HANDLING, BODY } from "./carPhysics.js";
import { gather, itemContact, KIND } from "./colliders.js";
import { ledgeContact } from "./carEnv.js";

const CELL = 0.25;
// walk from 0.28 m: the body steps up 0.25 m (controller stepHeight), anything taller stops it
const BAND = { car: [0.30, 1.30], walk: [0.28, 1.80] };
const KIND_NAME = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k]));
export const SRC = { building: 1, hero: 2, bridge: 3, furniture: 4, tree: 5, lamp: 6, bollard: 7, car: 8, rail: 9, tram: 10, kit: 11, road: 12 };
const SRC_NAME = Object.fromEntries(Object.entries(SRC).map(([k, v]) => [v, k]));
export const HEROES = ["stjob", "townhall", "stalle", "vanbuuren", "wolvendael", "police", "calevoet", "stpierre", "observatory",
  "bridge-verrewinkel", "bridge-stjob", "bridge-calevoet"];

/** A plan grid over the tile bounds. */
function makeGrid(b) {
  const nx = Math.ceil((b.x1 - b.x0) / CELL), nz = Math.ceil((b.z1 - b.z0) / CELL);
  return { b, nx, nz, x0: b.x0, z0: b.z0,
    idx(x, z) { const i = Math.floor((x - b.x0) / CELL), k = Math.floor((z - b.z0) / CELL); return i < 0 || k < 0 || i >= nx || k >= nz ? -1 : k * nx + i; },
    cx(i) { return b.x0 + (i % nx + 0.5) * CELL; }, cz(i) { return b.z0 + (Math.floor(i / nx) + 0.5) * CELL; } };
}

/** Ground heights on a 1 m lattice (fast band tests). */
function groundLattice(b, fn, lowest = false) {
  const nx = Math.ceil(b.x1 - b.x0) + 2, nz = Math.ceil(b.z1 - b.z0) + 2;
  let a = new Float32Array(nx * nz);
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) a[k * nx + i] = fn(b.x0 + i, b.z0 + k);
  if (lowest) {                       // the lowest ground within 1 m: a wall rising from its lower side (a platform's edge)
    const m = new Float32Array(nx * nz);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      let v = Infinity;
      for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) { const ii = i + di, kk = k + dk; if (ii >= 0 && kk >= 0 && ii < nx && kk < nz) v = Math.min(v, a[kk * nx + ii]); }
      m[k * nx + i] = v;
    }
    a = m;
  }
  return (x, z) => { const i = Math.min(nx - 1, Math.max(0, Math.round(x - b.x0))), k = Math.min(nz - 1, Math.max(0, Math.round(z - b.z0))); return a[k * nx + i]; };
}

/** Is a mesh solid (drawn, not foliage / wire / light / glass-only decoration)? */
function solidMesh(o) {
  const m = [].concat(o.material || [])[0], n = `${o.name} ${o.parent?.name || ""} ${m?.name || ""}`;
  if (/leaves|leaf|crown|foliage|wire|light|glow|beam|shadow|impostor|flag_fabric|flag-cloth/i.test(n)) return false;
  if (m?.isMeshBasicNodeMaterial || m?.isMeshBasicMaterial) return false;          // collider boxes, light cones
  return true;
}

/**
 * The truth: drawn solid cells per band. Returns { car: Uint8Array (source code per cell, 0 = none), walk: same }.
 * scene, tile (world.tiles entry), carGround(x, z), walkGround(x, z).
 */
export function drawnSolids(scene, tile, carGround, walkGround, tiles = [tile]) {
  const b = tile.bounds, G = makeGrid(b);
  const car = new Uint8Array(G.nx * G.nz), walk = new Uint8Array(G.nx * G.nz);
  const gC = groundLattice(b, carGround, true), gW = groundLattice(b, walkGround, true);
  let gmin = Infinity, gmax = -Infinity;
  for (let x = b.x0; x <= b.x1; x += 8) for (let z = b.z0; z <= b.z1; z += 8) { const g = gC(x, z); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
  gmin -= 3; gmax += 4;
  const mark = (x, y, z, src) => {
    const i = G.idx(x, z); if (i < 0) return;
    // a road wall under 0.55 m is a kerb the car rides up (the drive surface steps): solid for the car only above
    const c = y - gC(x, z); if (c >= (wallsOnly ? 0.55 : BAND.car[0]) && c <= BAND.car[1] && car[i] < 255) car[i] = src;
    const w = y - gW(x, z); if (w >= BAND.walk[0] && w <= BAND.walk[1]) walk[i] = src;
  };
  const S = 0.12;
  let wallsOnly = false;
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz, src) => {
    if (Math.max(ay, by, cy) < gmin || Math.min(ay, by, cy) > gmax) return;
    if (wallsOnly) {
      const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
      const ny = uz * wx - ux * wz, L = Math.hypot(uy * wz - uz * wy, ny, ux * wy - uy * wx);
      if (!(L > 0) || Math.abs(ny) / L > 0.5) return;
    }
    if (Math.max(ax, bx, cx) < b.x0 || Math.min(ax, bx, cx) > b.x1 || Math.max(az, bz, cz) < b.z0 || Math.min(az, bz, cz) > b.z1) return;
    const l1 = Math.hypot(bx - ax, by - ay, bz - az), l2 = Math.hypot(cx - ax, cy - ay, cz - az);
    const n1 = Math.max(1, Math.ceil(l1 / S)), n2 = Math.max(1, Math.ceil(l2 / S));
    for (let i = 0; i <= n1; i++) for (let j = 0; j <= n2; j++) {
      let u = i / n1, v = j / n2;
      if (u + v > 1) { if (u + v > 1 + 1 / Math.max(n1, n2)) continue; const s = u + v; u /= s; v /= s; }
      mark(ax + (bx - ax) * u + (cx - ax) * v, ay + (by - ay) * u + (cy - ay) * v, az + (bz - az) * u + (cz - az) * v, src);
    }
  };
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), v = new THREE.Vector3();
  const mesh = (o, src) => {
    if (!o.isMesh || !o.geometry?.attributes?.position || !solidMesh(o)) return;
    const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count;
    const mats = [];
    if (o.isInstancedMesh) for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, M); mats.push(W.multiplyMatrices(o.matrixWorld, M).clone()); }
    else mats.push(o.matrixWorld);
    const pa = new Float32Array(n * 3);
    for (const mw of mats) {
      for (let q = 0; q < n; q++) { v.fromBufferAttribute(P, I ? I.getX(q) : q).applyMatrix4(mw); pa[q * 3] = v.x; pa[q * 3 + 1] = v.y; pa[q * 3 + 2] = v.z; }
      for (let q = 0; q < n; q += 3) tri(pa[q * 3], pa[q * 3 + 1], pa[q * 3 + 2], pa[q * 3 + 3], pa[q * 3 + 4], pa[q * 3 + 5], pa[q * 3 + 6], pa[q * 3 + 7], pa[q * 3 + 8], src);
    }
  };
  const disc = (x, z, r, src) => {
    for (let px = x - r; px <= x + r + 1e-6; px += CELL / 2) for (let pz = z - r; pz <= z + r + 1e-6; pz += CELL / 2) {
      if ((px - x) ** 2 + (pz - z) ** 2 > r * r) continue;
      const i = G.idx(px, pz); if (i < 0) continue;
      car[i] = src; walk[i] = src;
    }
  };
  scene.updateMatrixWorld(true);
  // buildings (walls, details) and the facade kit
  // every loaded tile's (a neighbour's walls, trees and cars cross the edge; what lies outside the grid is skipped)
  for (const T of tiles) scene.getObjectByName(`${T.name}-buildings`)?.traverse((o) => { if (o.isMesh && !/roof/.test(o.name)) mesh(o, /kit/.test(o.name) ? SRC.kit : SRC.building); });
  // the road meshes' WALLS (a raised road's side, a tall kerb or island wall: their faces over the band; kerbs of
  // 15-25 cm are under it), not their surfaces
  wallsOnly = true;
  for (const T of tiles) scene.getObjectByName(`${T.name}-roads`)?.traverse((o) => mesh(o, SRC.road));
  wallsOnly = false;
  // landmarks and bridges: their LOD0
  for (const h of HEROES) {
    const r = scene.getObjectByName(h); if (!r) continue;
    const l0 = r.children.find((c) => /[-_]lod0$/.test(c.name)) || r;
    const bb = new THREE.Box3().setFromObject(l0);
    if (bb.max.x < b.x0 || bb.min.x > b.x1 || bb.max.z < b.z0 || bb.min.z > b.z1) continue;
    l0.traverse((o) => mesh(o, h.startsWith("bridge") ? SRC.bridge : SRC.hero));
  }
  // features: furniture, tram poles / shelters, rail masts / platforms; parked cars as boxes
  for (const T of tiles) scene.getObjectByName(`${T.name}-features`)?.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || "", p = o.parent?.name || "";
    if (/^furniture-/.test(n)) mesh(o, SRC.furniture);
    else if (n === "tram-poles" || (p === "tram" && !n)) mesh(o, SRC.tram);
    else if (/^rail-(masts|platform)/.test(n)) mesh(o, SRC.rail);
    else if (n === "parked-cars") {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, M); W.multiplyMatrices(o.matrixWorld, M);
        // the box: unit x / z in -0.5..0.5, y 0..1: sample its plan
        for (let u = -0.5; u <= 0.5; u += 0.04) for (let w = -0.5; w <= 0.5; w += 0.04) {
          v.set(u, 0.5, w).applyMatrix4(W);
          const i = G.idx(v.x, v.z); if (i >= 0) { car[i] = SRC.car; walk[i] = SRC.car; }
        }
      }
    }
  });
  for (const T of tiles) {
    for (const t of T.drawn?.trees || []) disc(t.x, t.z, 0.22, SRC.tree);
    for (const l of T.drawn?.lamps || []) disc(l.x, l.z, 0.12, SRC.lamp);
    for (const q of T.drawn?.bollards || []) disc(q.x, q.z, 0.09, SRC.bollard);
  }
  return { G, car, walk };
}

/** The car colliders (sets = [{ pts, ... } colliders.js sets]) rasterised: kind + 1 per cell (0 = none). */
export function colliderCells(G, sets) {
  const out = new Uint8Array(G.nx * G.nz), b = G.b;
  for (const col of sets) {
    for (let p = 0; p < col.P; p++) {
      const q = p * 4;
      if (col.pbox[q + 2] < b.x0 || col.pbox[q] > b.x1 || col.pbox[q + 3] < b.z0 || col.pbox[q + 1] > b.z1) continue;
      const k0 = Math.max(0, Math.floor((col.pbox[q + 1] - b.z0) / CELL)), k1 = Math.min(G.nz - 1, Math.floor((col.pbox[q + 3] - b.z0) / CELL));
      for (let k = k0; k <= k1; k++) {
        const z = b.z0 + (k + 0.5) * CELL, xs = [];
        for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) {
          const s = col.ringStart[r], e = col.ringStart[r + 1];
          for (let i = s, j = e - 1; i < e; j = i++) {
            const ax = col.pts[i * 2], az = col.pts[i * 2 + 1], bx = col.pts[j * 2], bz = col.pts[j * 2 + 1];
            if ((az > z) !== (bz > z)) xs.push(ax + (bx - ax) * (z - az) / (bz - az));
          }
        }
        xs.sort((a, c) => a - c);
        for (let m = 0; m + 1 < xs.length; m += 2) {
          const i0 = Math.max(0, Math.ceil((xs[m] - b.x0) / CELL - 0.5)), i1 = Math.min(G.nx - 1, Math.floor((xs[m + 1] - b.x0) / CELL - 0.5));
          for (let i = i0; i <= i1; i++) out[k * G.nx + i] = col.pkind[p] + 1;
        }
      }
    }
    for (let c = 0; c < col.C; c++) {
      const x = col.circ[c * 3], z = col.circ[c * 3 + 1], r = col.circ[c * 3 + 2];
      if (x < b.x0 - r || x > b.x1 + r || z < b.z0 - r || z > b.z1 + r) continue;
      for (let px = x - r; px <= x + r; px += CELL / 2) for (let pz = z - r; pz <= z + r; pz += CELL / 2) {
        if ((px - x) ** 2 + (pz - z) ** 2 > r * r) continue;
        const i = G.idx(px, pz); if (i >= 0) out[i] = col.ckind[c] + 1;
      }
      const i = G.idx(x, z); if (i >= 0) out[i] = col.ckind[c] + 1;
    }
  }
  return out;
}

/** Chamfer distance transform (metres) to the nearest non-zero cell. */
export function distanceTo(G, mask) {
  const { nx, nz } = G, D = new Float32Array(nx * nz), INF = 1e9, a = CELL, d = CELL * Math.SQRT2;
  for (let i = 0; i < D.length; i++) D[i] = mask[i] ? 0 : INF;
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const q = k * nx + i; let v = D[q];
    if (i > 0) v = Math.min(v, D[q - 1] + a);
    if (k > 0) { v = Math.min(v, D[q - nx] + a); if (i > 0) v = Math.min(v, D[q - nx - 1] + d); if (i < nx - 1) v = Math.min(v, D[q - nx + 1] + d); }
    D[q] = v;
  }
  for (let k = nz - 1; k >= 0; k--) for (let i = nx - 1; i >= 0; i--) {
    const q = k * nx + i; let v = D[q];
    if (i < nx - 1) v = Math.min(v, D[q + 1] + a);
    if (k < nz - 1) { v = Math.min(v, D[q + nx] + a); if (i < nx - 1) v = Math.min(v, D[q + nx + 1] + d); if (i > 0) v = Math.min(v, D[q + nx - 1] + d); }
    D[q] = v;
  }
  return D;
}

/** Connected clusters (8-neighbours) of the cells where keep(i) holds: [{ n, x, z, code }] (code = most frequent). */
function clusters(G, keep, codeOf, minCells = 2) {
  const seen = new Uint8Array(G.nx * G.nz), out = [], stack = [];
  for (let s = 0; s < seen.length; s++) {
    if (seen[s] || !keep(s)) continue;
    let n = 0, sx = 0, sz = 0; const codes = new Map();
    stack.push(s); seen[s] = 1;
    while (stack.length) {
      const q = stack.pop(); n++; sx += G.cx(q); sz += G.cz(q);
      const c = codeOf(q); codes.set(c, (codes.get(c) || 0) + 1);
      const i = q % G.nx, k = Math.floor(q / G.nx);
      for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= G.nx || kk >= G.nz) continue;
        const r = kk * G.nx + ii; if (!seen[r] && keep(r)) { seen[r] = 1; stack.push(r); }
      }
    }
    if (n < minCells) continue;
    out.push({ n, m2: +(n * CELL * CELL).toFixed(2), x: +(sx / n).toFixed(1), z: +(sz / n).toFixed(1), code: [...codes.entries()].sort((a, b) => b[1] - a[1])[0][0] });
  }
  return out;
}

/** The static comparison of a tile: { invisible: [...], missing: [...] } (see the header). */
export function staticCompare(G, truth, colCells) {
  const Dt = distanceTo(G, truth), Dc = distanceTo(G, colCells);
  const edge = (i) => {
    if (!colCells[i]) return false;
    const x = i % G.nx, k = Math.floor(i / G.nx);
    return (x > 0 && !colCells[i - 1]) || (x < G.nx - 1 && !colCells[i + 1]) || (k > 0 && !colCells[i - G.nx]) || (k < G.nz - 1 && !colCells[i + G.nx]);
  };
  // islands are kerbs (15-25 cm, under the car band): colliderAudit.js checks them against the drawn raised surface
  const invisible = clusters(G, (i) => edge(i) && Dt[i] > 0.5 && colCells[i] - 1 !== KIND.island, (i) => KIND_NAME[colCells[i] - 1], 3);
  // road walls are not polygons: the ledge rule (carEnv.js MAX_STEP) stops the car at them; the routes check that
  const missing = clusters(G, (i) => truth[i] && truth[i] !== SRC.road && Dc[i] > 0.4, (i) => SRC_NAME[truth[i]], 2);
  return { invisible, missing, Dt, Dc };
}

/** Road polylines of a tile (roads.json) with their right driving lane / sidewalk offsets. */
function roadLines(tile) {
  const R = tile.roads, nodes = new Map(R.nodes.map((n) => [n.id, n])), b = tile.bounds, out = [];
  for (const r of R.roads) {
    const pts = [nodes.get(r.a), ...(r.pts || []), nodes.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]);
    if (pts.length < 2) continue;
    const inside = pts.filter(([x, z]) => x > b.x0 + 2 && x < b.x1 - 2 && z > b.z0 + 2 && z < b.z1 - 2).length;
    if (inside < 1) continue;
    const lanes = r.lanes || {}, right = lanes.right || [], left = lanes.left || [];
    const cw = (lanes.center?.width || 0) / 2;
    let lane = null, side = { right: null, left: null };
    for (const [nm, L] of [["right", right], ["left", left]]) {
      let o = cw;
      for (const l of L) {
        if (nm === "right" && l.type === "driving" && lane == null) lane = o + l.width / 2;
        if (l.type === "sidewalk" && side[nm] == null) side[nm] = o + l.width / 2;
        o += l.width;
      }
      if (side[nm] == null) side[nm] = o + 1.0;                                   // no sidewalk: the verge
    }
    out.push({ id: r.id, type: r.type, pts, lane: lane ?? 1.6, walk: [side.right, -side.left] });
  }
  return out;
}

/** A polyline offset sideways by d (+ = the right of the direction of travel, as drive mode's "keep right":
 *  forward (fx, fz) = (sin h, cos h) -> right = (-fz, fx)). */
function offsetLine(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz) || 1;
    out.push([pts[i][0] - (dz / L) * d, pts[i][1] + (dx / L) * d]);
  }
  return out;
}

/** Resample a polyline every `step` m. */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = step - carry;
    while (t <= L) { out.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); t += step; }
    carry = L - (t - step);
  }
  if (out.length < 2) out.push(pts[pts.length - 1]);
  return out;
}

/** The DRAWN walking / driving surfaces of the tile (terrain, roads, rail ballast, tram platforms, landmark and bridge
 *  LOD0, ponds) rasterised on a 0.5 m grid, two layers per cell (the top one and the highest one more than 1.5 m under
 *  it: a bridge deck over its cutting). Returns (x, z, y) -> the drawn surface y nearest to y (or null). */
function drawnGround(scene, tile) {
  const b = tile.bounds, C = 0.5, nx = Math.ceil((b.x1 - b.x0) / C) + 1, nz = Math.ceil((b.z1 - b.z0) / C) + 1;
  const top = new Float32Array(nx * nz).fill(-1e9), low = new Float32Array(nx * nz).fill(-1e9);
  const objs = [];
  for (const n of [`${tile.name}-terrain`, `${tile.name}-roads`]) { const o = scene.getObjectByName(n); if (o) objs.push(o); }
  scene.getObjectByName(`${tile.name}-features`)?.traverse((o) => { if (o.isMesh && /^(rail-ballast|rail-platform|tram-platform)/.test(o.name)) objs.push(o); });
  for (const h of HEROES) { const r = scene.getObjectByName(h); if (r) objs.push(r.children.find((c) => /[-_]lod0$/.test(c.name)) || r); }
  scene.traverse((o) => { if (o.isMesh && /pond|water/i.test(o.name)) objs.push(o); });
  const v = new THREE.Vector3(), A = [0, 0, 0], B = [0, 0, 0], Cc = [0, 0, 0];
  const put = (q, y) => {
    const t = top[q];
    if (y > t + 1.5) { low[q] = t; top[q] = y; }
    else if (y > t) top[q] = y;
    else if (y < t - 1.5 && y > low[q]) low[q] = y;
  };
  for (const root of objs) root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry?.attributes?.position) return;
    const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count, mw = o.matrixWorld;
    for (let q = 0; q < n; q += 3) {
      for (const [k, T] of [[0, A], [1, B], [2, Cc]]) { v.fromBufferAttribute(P, I ? I.getX(q + k) : q + k).applyMatrix4(mw); T[0] = v.x; T[1] = v.y; T[2] = v.z; }
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], wx = Cc[0] - A[0], wy = Cc[1] - A[1], wz = Cc[2] - A[2];
      const ny = uz * wx - ux * wz, L = Math.hypot(uy * wz - uz * wy, ny, ux * wy - uy * wx);
      if (!(L > 0) || ny / L < 0.3) continue;                              // walls, kerb faces, soffits (down faces)
      const x0 = Math.min(A[0], B[0], Cc[0]), x1 = Math.max(A[0], B[0], Cc[0]), z0 = Math.min(A[2], B[2], Cc[2]), z1 = Math.max(A[2], B[2], Cc[2]);
      if (x1 < b.x0 || x0 > b.x1 || z1 < b.z0 || z0 > b.z1) continue;
      const det = (B[2] - Cc[2]) * (A[0] - Cc[0]) + (Cc[0] - B[0]) * (A[2] - Cc[2]);
      if (Math.abs(det) < 1e-9) continue;
      const i0 = Math.max(0, Math.ceil((x0 - b.x0) / C)), i1 = Math.min(nx - 1, Math.floor((x1 - b.x0) / C));
      const k0 = Math.max(0, Math.ceil((z0 - b.z0) / C)), k1 = Math.min(nz - 1, Math.floor((z1 - b.z0) / C));
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
        const px = b.x0 + i * C, pz = b.z0 + k * C;
        const l1 = ((B[2] - Cc[2]) * (px - Cc[0]) + (Cc[0] - B[0]) * (pz - Cc[2])) / det, l2 = ((Cc[2] - A[2]) * (px - Cc[0]) + (A[0] - Cc[0]) * (pz - Cc[2])) / det, l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        put(k * nx + i, l1 * A[1] + l2 * B[1] + l3 * Cc[1]);
      }
    }
  });
  return (x, z, y) => {
    const i = Math.round((x - b.x0) / C), k = Math.round((z - b.z0) / C);
    if (i < 0 || k < 0 || i >= nx || k >= nz) return null;
    const q = k * nx + i, t = top[q], l = low[q];
    if (t < -1e8) return null;
    return l > -1e8 && Math.abs(l - y) < Math.abs(t - y) ? l : t;
  };
}

/** Drive the car along every road of the tile; returns { routes, km, hits, invisibleHits, passThrough, fell, floated, stuck, items } */
export function driveRoutes({ scene, tile, driver, truth, G, maxRoads = Infinity, speed = 9, top: ctxTop = null }) {
  const lines = roadLines(tile).slice(0, maxRoads);
  const ground = driver.ground, sets = driver.sets;
  const Dt = distanceTo(G, truth);
  const top = ctxTop ?? drawnGround(scene, tile);
  const R = { routes: 0, km: 0, contacts: 0, invisibleHits: 0, passThrough: 0, fell: 0, floated: 0, stuck: 0, items: [] };
  const colIds = new Map();
  let hitStep = false;               // a collider held the car this frame (then an overlap with a drawn solid is contact, not a pass)
  const near = [], contact = { nx: 0, nz: 0, depth: 0, kind: 0 }, body = { hx: BODY.hx, hz: BODY.hz, cos: 1, sin: 0 };
  const item = (kind, x, z, extra = {}) => { if (R.items.length < 400 && !R.items.some((q) => q.kind === kind && Math.hypot(q.x - x, q.z - z) < 3)) R.items.push({ kind, x: +x.toFixed(1), z: +z.toFixed(1), ...extra }); };
  const b = tile.bounds, inT = (x, z) => x > b.x0 + 1 && x < b.x1 - 1 && z > b.z0 + 1 && z < b.z1 - 1;
  for (const L of lines) for (const dir of [1, -1]) {
    const center = dir > 0 ? L.pts : L.pts.slice().reverse();
    const path = resample(offsetLine(center, L.lane), 2).filter(([x, z]) => inT(x, z));
    if (path.length < 4) continue;
    R.routes++;
    const touched = new Set(), passed = new Set();
    const h0 = Math.atan2(path[1][0] - path[0][0], path[1][1] - path[0][1]);
    const c = createCarState(path[0][0], path[0][1], h0);
    c.y = ground(c.x, c.z);
    const env = {
      ground,
      prepare(st, travel) { near.length = 0; const r = Math.hypot(BODY.hx, BODY.hz) + travel; for (const col of sets(st.x, st.z, r)) gather(col, st.x, st.z, r, near); },
      collide(st) {
        body.cos = Math.cos(st.heading); body.sin = Math.sin(st.heading);
        for (let pass = 0; pass < 2; pass++) {
          let any = false;
          for (let k = 0; k < near.length; k += 2) {
            if (!itemContact(near[k], near[k + 1], st.x, st.z, body, contact)) continue;
            // the touching point: the car's support point against the normal
            const nx = -contact.nx, nz = -contact.nz;
            const su = Math.abs(nx * body.cos - nz * body.sin) * body.hx + Math.abs(nx * body.sin + nz * body.cos) * body.hz;
            // the touching point: a post / trunk / lamp: its centre; a polygon: the contact plane at the car's centre line
            const it = near[k + 1], cl = near[k], isC = it >= cl.P;
            let px = isC ? cl.circ[(it - cl.P) * 3] : st.x + nx * su, pz = isC ? cl.circ[(it - cl.P) * 3 + 1] : st.z + nz * su;
            if (!isC) {                             // a polygon: its outline's point nearest to the car's centre
              let bd = Infinity;
              for (let r = cl.polyRing[it]; r < cl.polyRing[it + 1]; r++) for (let i = cl.ringStart[r], j = cl.ringStart[r + 1] - 1; i < cl.ringStart[r + 1]; j = i++) {
                const ax = cl.pts[j * 2], az = cl.pts[j * 2 + 1], ex = cl.pts[i * 2] - ax, ez = cl.pts[i * 2 + 1] - az, L2 = ex * ex + ez * ez || 1e-9;
                const t = Math.max(0, Math.min(1, ((st.x - ax) * ex + (st.z - az) * ez) / L2)), qx = ax + ex * t, qz = az + ez * t, d = (qx - st.x) ** 2 + (qz - st.z) ** 2;
                if (d < bd) { bd = d; px = qx; pz = qz; }
              }
            }
            hitStep = true;
            st.x += contact.nx * contact.depth; st.z += contact.nz * contact.depth;
            if (!colIds.has(near[k])) colIds.set(near[k], colIds.size);
            const key = colIds.get(near[k]) + ":" + near[k + 1];
            if (!touched.has(key)) {                                   // one event per collider item and route
              touched.add(key); R.contacts++;
              const i = G.idx(px, pz);
              // a polygon: the nearest drawn solid to the car's touching side (its perimeter samples facing -n)
              let dmin = i >= 0 ? Dt[i] : 0;
              if (!isC) {
                for (let u = -body.hx; u <= body.hx + 1e-6; u += 0.3) for (let w = -body.hz; w <= body.hz + 1e-6; w += 0.3) {
                  if (Math.abs(u) < body.hx - 0.01 && Math.abs(w) < body.hz - 0.01) continue;           // the perimeter only
                  const qx = st.x + u * body.cos + w * body.sin, qz = st.z - u * body.sin + w * body.cos;
                  if ((qx - st.x) * nx + (qz - st.z) * nz < su - 0.35) continue;                         // the touching side
                  const j = G.idx(qx, qz); if (j >= 0) dmin = Math.min(dmin, Dt[j]);
                }
              }
              if (contact.kind === KIND.island) R.kerbIslands = (R.kerbIslands || 0) + 1;      // a raised kerb island: stopped as designed
              else if (i >= 0 && dmin > 0.6) { R.invisibleHits++; item("invisible hit", px, pz, { collider: KIND_NAME[contact.kind] }); }
            }
            // the hit response (carPhysics.hit), simplified: lose the speed into the obstacle
            const vn = -(Math.sin(st.heading) * st.speed * contact.nx + Math.cos(st.heading) * st.speed * contact.nz);
            if (vn > 0) st.speed *= 0.5;
            any = true;
          }
          if (!any) break;
        }
        // a ledge over MAX_STEP (carEnv.js): a road wall the car does not climb
        const inner = st.x > b.x0 + 4 && st.x < b.x1 - 4 && st.z > b.z0 + 4 && st.z < b.z1 - 4;     // (the drive surface of an unloaded neighbour is a clamp)
        if (driver.ledges !== false && inner && Number.isFinite(st.y) && ledgeContact(st, body, ground, contact)) {
          st.x += contact.nx * contact.depth; st.z += contact.nz * contact.depth; hitStep = true;
          const vn = -(Math.sin(st.heading) * st.speed * contact.nx + Math.cos(st.heading) * st.speed * contact.nz);
          if (vn > 0) st.speed *= 0.5;
          const key = `ledge:${Math.round(st.x / 3)},${Math.round(st.z / 3)}`;
          if (!touched.has(key)) {
            touched.add(key); R.contacts++; R.ledges = (R.ledges || 0) + 1;
            // a STEP (the surface jumps: a road wall, an open road edge over the terrain) or a SLOPE (a steep bank: the
            // terrain is drawn, the car just cannot climb it): half way out the surface has risen less than a third
            let dmin = Infinity, step = false;
            for (const [u, w] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const qx = st.x + u * body.hx * body.cos + w * body.hz * body.sin, qz = st.z - u * body.hx * body.sin + w * body.hz * body.cos;
              const j = G.idx(qx, qz); if (j >= 0) dmin = Math.min(dmin, Dt[j]);
              const rise = ground(qx, qz) - st.y;
              if (rise > 0.5 && ground((qx + st.x) / 2, (qz + st.z) / 2) - st.y < rise / 3) step = true;
            }
            if (!step) R.slopes = (R.slopes || 0) + 1;
            else if (dmin > 0.6) { R.invisibleHits++; item("invisible hit", st.x, st.z, { collider: "ledge" }); }
          }
        }
      },
    };
    let wp = 1, still = 0, lastProg = 0, t = 0;
    const dt = 1 / 30;
    for (let step = 0; step < 6000; step++) {
      t += dt;
      // pure pursuit: the first path point >= 6 m ahead
      while (wp < path.length - 1 && Math.hypot(path[wp][0] - c.x, path[wp][1] - c.z) < 6) wp++;
      const [tx, tz] = path[wp];
      const want = Math.atan2(tx - c.x, tz - c.z);
      let err = want - c.heading; while (err > Math.PI) err -= 2 * Math.PI; while (err < -Math.PI) err += 2 * Math.PI;
      const steer = Math.max(-1, Math.min(1, err * 2.2));
      const throttle = c.speed < speed * (1 - Math.min(0.6, Math.abs(err))) ? 0.7 : 0;
      hitStep = false;
      driver.groundHint = c.y;                     // the drive surface's layer nearest the car (a street under a deck)
      const y0 = c.y;
      stepCar(c, { throttle, steer, handbrake: false }, dt, env, HANDLING);
      const climbed = c.y - y0 > 0.45;              // up a road wall (the drive surface stepped): a pass only then
      // passed through a drawn solid: the car box (shrunk 0.35 m: the truth cells are 0.25 m) over car-band truth cells
      const cs = Math.cos(c.heading), sn = Math.sin(c.heading);
      let hitSrc = 0;
      for (let u = -BODY.hx + 0.35; u <= BODY.hx - 0.35 + 1e-6 && !hitSrc; u += 0.3) for (let w = -BODY.hz + 0.35; w <= BODY.hz - 0.35 + 1e-6; w += 0.3) {
        const x = c.x + u * cs + w * sn, z = c.z - u * sn + w * cs, i = G.idx(x, z);
        if (i >= 0 && truth[i] && (truth[i] !== SRC.road || climbed)) { hitSrc = truth[i]; break; }
      }
      if (hitSrc && !hitStep) { const key = `${Math.round(c.x / 3)},${Math.round(c.z / 3)}`; if (!passed.has(key)) { passed.add(key); R.passThrough++; item("passed through", c.x, c.z, { drawn: SRC_NAME[hitSrc] }); } }
      if (step % 15 === 0) {
        const y = top(c.x, c.z, c.y);
        if (y != null && y - c.y > 0.3) { R.fell++; item("under the drawn surface", c.x, c.z, { by: +(y - c.y).toFixed(2) }); }
        else if (y != null && c.y - y > 0.3) { R.floated++; item("over the drawn surface", c.x, c.z, { by: +(c.y - y).toFixed(2) }); }
      }
      const prog = wp + (1 - Math.min(1, Math.hypot(path[wp][0] - c.x, path[wp][1] - c.z) / 6));
      if (prog > lastProg + 0.05) { lastProg = prog; still = 0; } else still += dt;
      if (still > 4) {
        // against a drawn solid (the autopilot's line ran into a lamp / a parked car: the route, not a defect) or on nothing
        let dmin = Infinity;
        for (let u = -BODY.hx - 0.3; u <= BODY.hx + 0.3; u += 0.3) for (let w = -BODY.hz - 0.3; w <= BODY.hz + 0.3; w += 0.3) { const i = G.idx(c.x + u * cs + w * sn, c.z - u * sn + w * cs); if (i >= 0) dmin = Math.min(dmin, Dt[i]); }
        const isl = [];
        for (const col of sets(c.x, c.z, 4)) gather(col, c.x, c.z, 4, isl);
        let byIsland = false;
        for (let k = 0; k < isl.length; k += 2) if (isl[k + 1] < isl[k].P && isl[k].pkind[isl[k + 1]] === KIND.island) byIsland = true;
        if (dmin > 0.6 && !byIsland) { R.stuck++; item("stuck on nothing drawn", c.x, c.z); } else R.blocked = (R.blocked || 0) + 1;
        break;
      }
      if (wp >= path.length - 1 && Math.hypot(path[wp][0] - c.x, path[wp][1] - c.z) < 3) break;
      if (!inT(c.x, c.z)) break;
    }
    R.km += t * speed / 1000;
  }
  driver.groundHint = null;
  R.km = +R.km.toFixed(2);
  return R;
}

/**
 * Walk both sidewalks of every road with a CharacterController in `cw` (a CollisionWorld). Returns the same kind of
 * report. makeController(x, y, z) -> a controller (viewer/character/controller.js) placed there.
 */
export function walkRoutes({ scene, tile, truth, G, makeController, walkY, maxRoads = Infinity, top: ctxTop = null }) {
  const lines = roadLines(tile).slice(0, maxRoads);
  const Dt = distanceTo(G, truth);
  const top = ctxTop ?? drawnGround(scene, tile);
  const R = { routes: 0, km: 0, contacts: 0, invisibleHits: 0, passThrough: 0, fell: 0, floated: 0, stuck: 0, items: [] };
  const item = (kind, x, z, extra = {}) => { if (R.items.length < 400 && !R.items.some((q) => q.kind === kind && Math.hypot(q.x - x, q.z - z) < 3)) R.items.push({ kind, x: +x.toFixed(1), z: +z.toFixed(1), ...extra }); };
  const b = tile.bounds, inT = (x, z) => x > b.x0 + 1 && x < b.x1 - 1 && z > b.z0 + 1 && z < b.z1 - 1;
  for (const L of lines) for (const off of L.walk) {
    const path = resample(offsetLine(L.pts, off), 1.5).filter(([x, z]) => inT(x, z));
    if (path.length < 4) continue;
    R.routes++;
    const touched = new Set(), passed = new Set();
    const ctl = makeController(path[0][0], walkY(path[0][0], path[0][1]) + 0.05, path[0][1]);
    let wp = 1, still = 0, best = Infinity, t = 0;
    const dt = 1 / 60;
    for (let step = 0; step < 20000; step++) {
      t += dt;
      const x = ctl.pos[0], z = ctl.pos[2];
      while (wp < path.length - 1 && Math.hypot(path[wp][0] - x, path[wp][1] - z) < 1.2) wp++;
      const dx = path[wp][0] - x, dz = path[wp][1] - z, l = Math.hypot(dx, dz) || 1;
      ctl.input.x = dx / l; ctl.input.z = dz / l; ctl.input.run = true;
      ctl.step(dt);
      // contacts this step (controller debug list: x, y, z, nx, ny, nz, kind 0 ground 1 wall 2 ceiling)
      for (let k = 0; k < ctl.dbgN; k++) {
        const o = k * 7;
        if (ctl.dbg[o + 6] !== 1 || ctl.dbg[o + 1] - ctl.pos[1] < 0.35) continue;      // walls above the step height (not kerbs / treads)
        const key = `${Math.round(ctl.dbg[o] * 2)},${Math.round(ctl.dbg[o + 2] * 2)}`;
        if (touched.has(key)) continue;
        touched.add(key); R.contacts++;
        const i = G.idx(ctl.dbg[o], ctl.dbg[o + 2]);
        if (i >= 0 && Dt[i] > 0.6) { R.invisibleHits++; item("invisible hit", ctl.dbg[o], ctl.dbg[o + 2]); }
      }
      // passed through: the body's centre on a drawn solid while nothing holds it (no wall contact this step; a body
      // sliding along a facade has its centre within a cell of the wall: not a pass)
      let held = false;
      for (let k = 0; k < ctl.dbgN; k++) if (ctl.dbg[k * 7 + 6] === 1) held = true;
      if (!held) for (const [ox, oz] of [[0, 0]]) {
        const i = G.idx(ctl.pos[0] + ox, ctl.pos[2] + oz);
        if (i >= 0 && truth[i] && truth[i] !== SRC.road) { const key = `${Math.round(ctl.pos[0] / 2)},${Math.round(ctl.pos[2] / 2)}`; if (!passed.has(key)) { passed.add(key); R.passThrough++; item("passed through", ctl.pos[0], ctl.pos[2], { drawn: SRC_NAME[truth[i]] }); } break; }
      }
      if (step % 30 === 0) {
        const y = top(ctl.pos[0], ctl.pos[2], ctl.pos[1]);
        // 0.4 m: a kerb (<= 25 cm) in the 0.5 m raster cell of the drawn surface is not a fall / float
        if (y != null && y - ctl.pos[1] > 0.4) { R.fell++; item("under the drawn surface", ctl.pos[0], ctl.pos[2], { by: +(y - ctl.pos[1]).toFixed(2) }); }
        else if (y != null && ctl.pos[1] - y > 0.4 && ctl.grounded) { R.floated++; item("over the drawn surface", ctl.pos[0], ctl.pos[2], { by: +(ctl.pos[1] - y).toFixed(2) }); }
        if (ctl.pos[1] < walkY(ctl.pos[0], ctl.pos[2]) - 3) { R.fell++; item("fell", ctl.pos[0], ctl.pos[2]); break; }
      }
      const d = Math.hypot(path[path.length - 1][0] - ctl.pos[0], path[path.length - 1][1] - ctl.pos[2]) + (path.length - wp) * 1.5;
      if (d < best - 0.2) { best = d; still = 0; } else still += dt;
      if (still > 4) {
        let dmin = Infinity;
        for (let u = -0.6; u <= 0.6; u += 0.15) for (let w = -0.6; w <= 0.6; w += 0.15) { const i = G.idx(ctl.pos[0] + u, ctl.pos[2] + w); if (i >= 0) dmin = Math.min(dmin, Dt[i]); }
        if (dmin > 0.6) { R.stuck++; item("stuck on nothing drawn", ctl.pos[0], ctl.pos[2]); } else R.blocked = (R.blocked || 0) + 1;
        break;
      }
      if (wp >= path.length - 1 && l < 1) break;
      if (!inT(ctl.pos[0], ctl.pos[2])) break;
    }
    R.km += t * 5.5 / 1000;
  }
  R.km = +R.km.toFixed(2);
  return R;
}

/** The whole test of one loaded tile. ctx = { scene, world, driver, walkWorld?: () => CollisionWorld, Controller? } */
export async function collisionTest(ctx, name, opts = {}) {
  const { scene, world, driver } = ctx;
  const tile = world.tiles.find((t) => t.name === name);
  if (!tile) throw new Error(`tile ${name} not loaded`);
  const t0 = performance.now();
  const T = drawnSolids(scene, tile, driver.ground, (x, z) => world.walkY(x, z), world.tiles);
  const sets = driver.sets((tile.bounds.x0 + tile.bounds.x1) / 2, (tile.bounds.z0 + tile.bounds.z1) / 2, 400);
  const C = colliderCells(T.G, sets);
  const S = staticCompare(T.G, T.car, C);
  const out = { tile: name, ms: 0,
    static: { invisible: S.invisible.length, invisibleM2: +S.invisible.reduce((s, q) => s + q.m2, 0).toFixed(1), missing: S.missing.length, missingM2: +S.missing.reduce((s, q) => s + q.m2, 0).toFixed(1),
      byKind: {}, items: [...S.invisible.map((q) => ({ kind: "invisible", collider: q.code, x: q.x, z: q.z, m2: q.m2 })), ...S.missing.map((q) => ({ kind: "missing", drawn: q.code, x: q.x, z: q.z, m2: q.m2 }))] } };
  for (const q of S.invisible) out.static.byKind[`invisible ${q.code}`] = (out.static.byKind[`invisible ${q.code}`] || 0) + 1;
  for (const q of S.missing) out.static.byKind[`missing ${q.code}`] = (out.static.byKind[`missing ${q.code}`] || 0) + 1;
  const top = (opts.drive !== false || opts.walk !== false) ? drawnGround(scene, tile) : null;
  out.msStatic = Math.round(performance.now() - t0);
  if (opts.drive !== false) out.drive = driveRoutes({ scene, tile, driver, truth: T.car, G: T.G, maxRoads: opts.maxRoads, top });
  out.msDrive = Math.round(performance.now() - t0);
  if (opts.walk !== false && ctx.makeController) out.walk = walkRoutes({ scene, tile, truth: T.walk, G: T.G, makeController: ctx.makeController, walkY: (x, z) => world.walkY(x, z), maxRoads: opts.maxRoads, top });
  out.ms = Math.round(performance.now() - t0);
  return out;
}
