// Building façades and roofs: per-face analysis at load + procedural TSL materials.
//
// UrbIS gives real LoD2 geometry (CONTRACT 5.2) but no surfaces. This module adds plausible ones:
//
//   analysis (JS, once per tile)
//     - wall triangles are grouped into planar faces per building; each vertex gets wall-local
//       coordinates: aWall = (u along the face from its left end, face width, height above the
//       building's base, eaves height above base)
//     - each face is classified: PARTY wall (a point 0.35 m outside it lies in another footprint:
//       the shared walls of Brussels terraces: blank; parts of one building or a landmark: blank only
//       up to the neighbour's top) and STREET-facing (it looks at a road
//       centreline within 30 m: gets the front door). aBld = (style, party, street, random)
//     - roof triangles get slope-aligned coordinates aRoof = (u along the eaves, v down the slope,
//       flat 0/1, style)
//   materials (TSL)
//     - wall styles: 0 red brick, 1 brown brick, 2 yellow brick, 3 white render, 4 cream render,
//       5 grey render/concrete; blue-stone plinth, cornice band under the eaves
//     - storeys: ground floor 3.4 m, then 3.0 m; window bays sized to each face; white frames with
//       glazing bars, stone sills, glass with a sky gradient; one painted door per street face
//     - roofs: clay tiles, dark glazed tiles or slate in courses down the slope, moss and weathering;
//       flat roofs bitumen/gravel
//
// Style choice is a stable hash of the UrbIS building id (BU_ID, so all solids of one building
// match). The orthophoto can replace the roof guess later (PLAN, realism step 4).
import * as THREE from "three/webgpu";
import {
  Fn, If, attribute, positionWorld, normalWorld, cameraPosition, color, float, vec2, vec3, vec4, mix, step, smoothstep, floor, fract,
  abs, min, max, clamp, fwidth, sin, sign, dot, normalize, length, pow,
} from "three/tsl";
import { hash2D, noise2D, bumpNormal, filteredPulse } from "./tslkit.js";
import { env } from "./lighting.js";
import { n3, band, courses } from "./roadPaint.js";

const PARTY_PROBE = 0.35, STREET_REACH = 30;

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000003) / 1000003;
}

/** Wall style from a hash; tall blocks (flats) lean to render / concrete. */
function wallStyle(r, height) {
  const tall = height > 14;
  const table = tall ? [[0, 0.15], [1, 0.25], [2, 0.3], [3, 0.55], [4, 0.7], [5, 1]] : [[0, 0.3], [1, 0.48], [2, 0.56], [3, 0.8], [4, 0.93], [5, 1]];
  for (const [s, c] of table) if (r < c) return s;
  return 0;
}

// ---------------------------------------------------------------- 2D helpers

function pip(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

class Grid {
  constructor(cell) { this.cell = cell; this.m = new Map(); }
  key(i, j) { return i * 100003 + j; }
  add(x0, z0, x1, z1, item) {
    const c = this.cell;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
      for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
        const k = this.key(i, j);
        if (!this.m.has(k)) this.m.set(k, []);
        this.m.get(k).push(item);
      }
  }
  near(x, z, r = 0) {
    const c = this.cell, out = new Set();
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++)
      for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) for (const it of this.m.get(this.key(i, j)) || []) out.add(it);
    return out;
  }
}

// ---------------------------------------------------------------- smooth shading

const CREASE = Math.cos((32 * Math.PI) / 180);

/** Per-building corner normals: average of the adjacent faces within CREASE of the corner's own face
 *  (area-weighted). Curved UrbIS surfaces (domes, spires, round towers) shade round; real edges stay sharp. */
function smoother(tris) {
  const key = (q) => `${Math.round(q[0] * 50)}|${Math.round(q[1] * 50)}|${Math.round(q[2] * 50)}`;
  const adj = new Map();
  for (const t of tris) for (const q of t.p) { const k = key(q); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(t); }
  return (t, q) => {
    let x = 0, y = 0, z = 0;
    for (const o of adj.get(key(q))) {
      if (o.n[0] * t.n[0] + o.n[1] * t.n[1] + o.n[2] * t.n[2] < CREASE) continue;
      x += o.n[0] * o.area; y += o.n[1] * o.area; z += o.n[2] * o.area;
    }
    const L = Math.hypot(x, y, z) || 1;
    return [x / L, y / L, z / L];
  };
}

function triOf(P, I, t) {
  const p = [0, 1, 2].map((q) => { const i = I[t * 3 + q]; return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; });
  const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
  const wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
  const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
  const L = Math.hypot(nx, ny, nz);
  return L < 1e-9 ? null : { p, n: [nx / L, ny / L, nz / L], area: L / 2 };
}

// ---------------------------------------------------------------- analysis

/**
 * @param doc   buildings.json
 * @param buf   buildings.bin
 * @param roads roads.json (for street-facing walls)
 * @returns { walls: {position, normal, aWall, aBld}, roofs: {position, normal, aRoof}, stats }
 */
export function analyseBuildings(doc, buf, roads) {
  const dv = new DataView(buf);
  const V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3);
  const I = new Uint32Array(buf, 8 + V * 12, T * 3);

  // footprints for party-wall probes
  const fp = new Grid(25);
  doc.buildings.forEach((b, bi) => {
    const ring = b.footprint[0];
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    fp.add(x0, z0, x1, z1, { bi, ring, x0, z0, x1, z1 });
  });
  /** Roof height of building bi above (x, z): highest roof triangle covering the point, else its eaves. */
  const roofAt = (bi, x, z) => {
    const b = doc.buildings[bi];
    let best = -Infinity;
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const a = I[t * 3] * 3, c = I[t * 3 + 1] * 3, d = I[t * 3 + 2] * 3;
      const ax = P[a], az = P[a + 2], bx = P[c], bz = P[c + 2], cx = P[d], cz = P[d + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      best = Math.max(best, l1 * P[a + 1] + l2 * P[c + 1] + l3 * P[d + 1]);
    }
    return best > -Infinity ? best : (b.eaves ?? b.top);
  };
  /** Neighbour at (x, z): its building index or -1 (largest top if several). */
  const otherAt = (x, z, bi) => {
    let best = -1;
    for (const f of fp.near(x, z)) if (f.bi !== bi && x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && pip(x, z, f.ring))
      if (best < 0 || doc.buildings[f.bi].top > doc.buildings[best].top) best = f.bi;
    return best;
  };

  // road centreline segments (end nodes + PIs) for street-facing walls
  const segs = new Grid(40);
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  for (const r of roads.roads) {
    if (r.meta?.highway === "service") continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      segs.add(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z), [a.x, a.z, b.x, b.z]);
    }
  }
  const facesStreet = (cx, cz, nx, nz) => {
    let best = Infinity;
    for (const [ax, az, bx, bz] of segs.near(cx, cz, STREET_REACH)) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L2));
      const qx = ax + dx * t - cx, qz = az + dz * t - cz, d = Math.hypot(qx, qz);
      if (d < best && d > 0.5 && (qx * nx + qz * nz) / d > 0.55) best = d;
    }
    return best < STREET_REACH;
  };

  const W = { position: [], normal: [], aWall: [], aBld: [] };
  const R = { position: [], normal: [], aRoof: [], aRoofCol: [] };
  const stats = { faces: 0, party: 0, street: 0 };
  doc.buildings.forEach((b, bi) => {
    const base = b.base, eaves = (b.eaves ?? b.top) - base;
    const key = String(b.attrs?.BU_ID ?? b.id);
    const landmark = b.attrs?._landmark;
    const rnd = hash01(key), style = landmark ? 6 : wallStyle(hash01(key + "s"), b.height);
    const roofStyle = hash01(key + "r");
    // real roof colour from the orthophoto (build_roofcolors.py), else a guess from the hash
    const rc = b.roofColor || (roofStyle < 0.4 ? [0.27, 0.085, 0.05] : [0.06, 0.065, 0.075]);
    const all = [];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) { const o = triOf(P, I, t); if (o) all.push(o); }
    const wallTris = all.length;
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) { const o = triOf(P, I, t); if (o) all.push(o); }
    const smooth = smoother(all);
    // --- walls: group triangles into planar faces
    const faces = new Map();
    for (let k0 = 0; k0 < wallTris; k0++) {
      const tri = all[k0], p = tri.p, [nx, ny, nz] = tri.n;
      const h = Math.hypot(nx, nz) || 1;
      const d = (p[0][0] * nx + p[0][2] * nz) / h;
      const k = `${Math.round(Math.atan2(nz, nx) * 20)}|${Math.round(d * 4)}`;   // ~3°, 25 cm
      if (!faces.has(k)) faces.set(k, { tris: [], nx: nx / h, nz: nz / h });
      faces.get(k).tris.push({ p, n: tri.n, src: tri });
    }
    for (const f of faces.values()) {
      const tx = -f.nz, tz = f.nx;                       // along the face, left to right seen from outside
      let u0 = Infinity, u1 = -Infinity, cx = 0, cz = 0, n = 0, top = -Infinity;
      for (const { p } of f.tris) for (const q of p) {
        const u = q[0] * tx + q[2] * tz;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); cx += q[0]; cz += q[2]; n++; top = Math.max(top, q[1]);
      }
      // landmarks: windows sized to each wall's own top (a church's LoD2 walls stop low; drums and towers are separate faces)
      const faceEaves = landmark ? top - base : eaves;
      cx /= n; cz /= n;
      const width = u1 - u0;
      // party wall: blank below this height above base. Separate houses: the whole wall (property line);
      // parts of the same building or a landmark: only up to the neighbour's top, windows above it.
      const ob = width > 0.3 ? otherAt(cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE, bi) : -1;
      const sameBld = ob >= 0 && b.attrs?.BU_ID && doc.buildings[ob].attrs?.BU_ID === b.attrs.BU_ID;
      const partyH = ob < 0 ? 0 : (sameBld || landmark) ? Math.max(0.01, roofAt(ob, cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE) - base) : 999;
      const party = partyH > 0 ? 1 : 0;
      const street = partyH < 999 && facesStreet(cx, cz, f.nx, f.nz) ? 1 : 0;
      stats.faces++; stats.party += party; stats.street += street;
      for (const { p, n: nn, src } of f.tris) for (const q of p) {
        W.position.push(q[0], q[1], q[2]);
        const sn = src ? smooth(src, q) : nn;
        W.normal.push(sn[0], sn[1], sn[2]);
        W.aWall.push(q[0] * tx + q[2] * tz - u0, width, q[1] - base, faceEaves);
        W.aBld.push(style, partyH, street, rnd);
      }
    }
    // --- roofs: slope-aligned coordinates, smoothed shading normals, real colour
    for (let k = wallTris; k < all.length; k++) {
      const tri = all[k], p = tri.p;
      const [nx, ny, nz] = tri.n;
      const flat = ny > 0.97 ? 1 : 0;
      const h = Math.hypot(nx, nz) || 1, dx = nx / h, dz = nz / h;   // downhill, horizontal
      for (const q of p) {
        R.position.push(q[0], q[1], q[2]);
        const sn = smooth(tri, q);
        R.normal.push(sn[0], sn[1], sn[2]);
        R.aRoofCol.push(rc[0], rc[1], rc[2]);
        if (flat) R.aRoof.push(q[0], q[2], 1, roofStyle);
        else R.aRoof.push(q[0] * -dz + q[2] * dx, (q[0] * dx + q[2] * dz) / Math.max(ny, 0.2), 0, roofStyle);
      }
    }
  });
  const f32 = (a) => new Float32Array(a);
  return {
    walls: { position: f32(W.position), normal: f32(W.normal), aWall: f32(W.aWall), aBld: f32(W.aBld) },
    roofs: { position: f32(R.position), normal: f32(R.normal), aRoof: f32(R.aRoof), aRoofCol: f32(R.aRoofCol) },
    stats: { ...stats, triangles: T, vertices: V },
  };
}

// ---------------------------------------------------------------- materials

const C = (r, g, b) => vec3(r, g, b);

/**
 * Room behind a window, raycast in metres (interior mapping). Adapted from evaluateApartmentInterior in
 * mrdoob/slop-newyork js/tsl-materials.js (MIT, © 2026 Mr.doob); the frame comes from our face normal.
 * gx: bay coordinate along the wall (bays), gy: storey coordinate (storeys), winUV: 0..1 inside the
 * window, bayW / storeyH in metres. Returns vec4(colour, emission 0..1).
 */
const interiorRoom = Fn(([gx, gy, winUV, cellId, bayW, storeyH, seed, litProb, fw, drapeFw]) => {
  const floorIdx = floor(gy).toVar();
  const fh1 = fract(sin(floorIdx.mul(41.3).add(seed)).mul(43758.5453));
  const fh2 = fract(sin(floorIdx.mul(73.7).add(seed.mul(1.7))).mul(43758.5453));
  const roomBays = mix(float(1.0), float(2.0), step(0.5, fh1)).toVar();          // Uccle houses: 1-2 bay rooms
  const roomU = gx.add(floor(fh2.mul(roomBays))).div(roomBays).toVar();
  const roomId = vec2(floor(roomU), floorIdx).toVar();
  const roomW = bayW.mul(roomBays).toVar();
  const roomH = storeyH.mul(0.92).toVar();
  const setback = float(0.18);                                                   // thick brick walls
  const depth = roomH.mul(1.5).toVar();
  const ox = fract(roomU).sub(0.5).mul(roomW).toVar();
  const oy = winUV.y.sub(0.46).mul(roomH.mul(0.62)).toVar();
  const n = normalize(vec3(normalWorld.x, 0.0, normalWorld.z)).toVar();
  const ray = normalize(positionWorld.sub(cameraPosition)).toVar();
  const dirX = dot(ray, vec3(n.z.negate(), 0.0, n.x)).toVar();
  const dirY = ray.y.toVar();
  const dirZ = max(abs(dot(ray, n)), 0.05).toVar();
  const hw = roomW.mul(0.5), hh = roomH.mul(0.5);
  const tX = hw.sub(ox.mul(sign(dirX))).div(max(abs(dirX), 0.0001)).toVar();
  const tY = hh.sub(oy.mul(sign(dirY))).div(max(abs(dirY), 0.0001)).toVar();
  const tZ = setback.add(depth).div(dirZ).toVar();
  const t = min(min(tX, tY), tZ).toVar();
  const hit = vec3(ox.add(dirX.mul(t)), oy.add(dirY.mul(t)), dirZ.mul(t));
  const q = clamp(vec3(hit.x.div(roomW).add(0.5), hit.y.div(roomH).add(0.5), hit.z.sub(setback).div(depth)), vec3(0), vec3(1)).toVar();
  const onBack = step(tZ, tX).mul(step(tZ, tY)).toVar();
  const isY = step(tY, tX).mul(step(tY, tZ)).toVar();
  const onCeil = isY.mul(step(0.0, dirY)), onFloor = isY.mul(float(1).sub(step(0.0, dirY)));
  const s1 = hash2D(roomId.add(vec2(seed, 19.4))).toVar(), s2 = hash2D(roomId.add(vec2(seed.mul(1.9), 83.1))).toVar();
  const s3 = hash2D(roomId.add(vec2(63.2, seed.mul(0.7))));
  const lod = smoothstep(0.3, 0.8, max(fw.x, fw.y)).toVar();
  const litRoom = step(float(1).sub(litProb), s3).toVar();
  const lit = mix(litRoom, 1.0, lod);
  const lightCol = mix(mix(color(0xdfe8ff), color(0x9fb6ff), s2), mix(color(0xffb845), color(0xffe49c), s1), step(0.3, s2)).toVar();
  const wallBase = mix(mix(color(0x9a8b73), color(0x7d8580), s1), color(0xc9bda5), s2.mul(0.6)).toVar();
  const wallCol = mix(wallBase, wallBase.mul(0.5), smoothstep(0.06, 0.04, q.y));
  const boards = mix(color(0x4a3320), color(0x6a4c30), s1).mul(float(1).sub(step(0.92, fract(q.x.mul(7.0))).mul(0.3)));
  const rug = mix(color(0x7a3b32), color(0x3a5760), s2);
  const floorCol = mix(boards, rug, step(abs(q.x.sub(0.5)), 0.28).mul(step(abs(q.z.sub(0.58)), 0.25)).mul(0.88));
  const lamp = smoothstep(0.18, 0.11, length(vec2(q.x.sub(0.5), q.z.sub(0.5)))).mul(float(1).sub(lod));
  const ceilCol = mix(mix(wallBase, color(0xe8e2d5), 0.28), lightCol.mul(mix(float(0.85), float(3.8), lit)), lamp);
  const doorX = mix(float(0.24), float(0.76), s1);
  const inDoor = step(abs(q.x.sub(doorX)), 0.09).mul(step(abs(q.y.sub(0.34)), 0.34));
  const picX = mix(float(0.72), float(0.28), step(0.5, s1));
  const inFrame = step(abs(q.x.sub(picX)), 0.085).mul(step(abs(q.y.sub(0.56)), 0.095));
  const inCanvas = step(abs(q.x.sub(picX)), 0.065).mul(step(abs(q.y.sub(0.56)), 0.075));
  const backCol = mix(mix(mix(wallCol, mix(color(0x5a4631), color(0x39383c), step(0.5, s2)), inDoor), color(0x141210), inFrame),
    mix(color(0x2c3a4a), color(0x7a5a3a), fract(s1.add(s2))), inCanvas);
  const shell = mix(mix(mix(wallCol, floorCol, onFloor), ceilCol, onCeil), backCol, onBack);
  const ao = (v) => smoothstep(0.0, 0.16, v).mul(smoothstep(0.0, 0.16, float(1).sub(v)));
  const edgeAO = mix(mix(ao(q.y).mul(ao(q.z)), ao(q.x).mul(ao(q.z)), isY), ao(q.x).mul(ao(q.y)), onBack);
  const room = shell.mul(mix(float(0.66), float(1), edgeAO)).mul(mix(float(1), float(0.42), q.z)).toVar();
  // curtains just behind the glass (lace or drapes), parallax-shifted
  const cU = clamp(winUV.x.add(dirX.div(dirZ).mul(0.06)), 0.0, 1.0).toVar();
  const w1 = hash2D(cellId.add(vec2(seed.mul(0.8), 41.2))), w2 = hash2D(cellId.add(vec2(17.9, seed.mul(1.3))));
  const sL = smoothstep(0.18, 1.0, w1), sR = smoothstep(0.18, 1.0, w2);
  const lw = sL.mul(sL).mul(0.48), rw = sR.mul(sR).mul(0.48);
  const aa = drapeFw.add(0.015);
  const inL = smoothstep(lw.add(aa), lw.sub(aa), cU).mul(step(0.03, lw));
  const inR = smoothstep(float(1).sub(rw).sub(aa), float(1).sub(rw).add(aa), cU).mul(step(0.03, rw));
  // Belgian lace half-curtains (vitrage) over the lower part of many windows
  const lace = step(0.55, fract(s1.mul(3.1).add(w1))).mul(smoothstep(0.52, 0.48, winUV.y));
  const inDrape = mix(clamp(max(max(inL, inR), lace.mul(0.85)), 0.0, 1.0), 0.29, lod).toVar();
  const pick = fract(s1.mul(5.7)).mul(4.0);
  const fabric = mix(mix(mix(mix(color(0xd8cdb8), color(0xe8e4da), lace), color(0x8a7a64), step(1.0, pick).mul(float(1).sub(lace))),
    color(0x6f818b), step(2.0, pick).mul(float(1).sub(lace))), color(0x8c5a44), step(3.0, pick).mul(float(1).sub(lace)));
  const pleat = sin(cU.mul(48.0).add(w1.mul(6.28))).mul(float(1).sub(smoothstep(0.6, 1.6, drapeFw.mul(48.0)))).mul(0.2).add(0.95);
  const col = mix(room, fabric.mul(pleat).mul(0.92), inDrape);
  const emit = mix(float(1), float(0.25), inDrape);
  const warm = mix(vec3(1), lightCol, lit.mul(0.85));
  return vec4(col.mul(warm).mul(mix(float(0.85), float(1.35), lit)), litRoom.mul(emit));
});

export function wallMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const P = positionWorld;
  const wall = attribute("aWall", "vec4"), bld = attribute("aBld", "vec4");
  const u = wall.x, fw = wall.y, h = wall.z, eh = wall.w;
  const style = bld.x, street = bld.z, rnd = bld.w;
  const party = step(h, bld.y.add(0.3)).mul(step(0.001, bld.y)).toVar();      // below the neighbour's top (aBld.y, m above base)
  const camDist = length(P.sub(cameraPosition)).toVar();
  const near = float(1).sub(smoothstep(16.0, 150.0, camDist)).toVar();       // relief and fine detail fade with distance
  const grain = n3(P.x.mul(5.0), P.y.mul(5.0), P.z.mul(5.0));

  // ---- window grid: corner piers, whole bays, storeys (ground floor 3.4 m, then 3.0 m)
  const pier = float(0.55);
  const usable = max(fw.sub(pier.mul(2)), float(0.001));
  const nb = max(floor(usable.div(2.6).add(0.5)), float(1)).toVar();
  const bw = usable.div(nb).toVar();
  const gx = u.sub(pier).div(bw).toVar();                                       // bay coordinate
  const G = float(3.4), S = float(3.0);
  const up = step(G, h);
  const gy = mix(h.div(G), h.sub(G).div(S).add(1.0), up).toVar();              // storey coordinate
  const storeyH = mix(G, S, up);
  const fwx = fwidth(gx).toVar(), fwy = fwidth(gy).toVar();
  const ww = min(float(1.2), bw.mul(0.52));
  const xa = float(0.5).sub(ww.div(bw).mul(0.5)).toVar(), xb = float(1).sub(xa).toVar();
  const ya = mix(float(0.27), float(0.29), up).toVar(), yb = mix(float(0.77), float(0.79), up).toVar();
  const fl = floor(gy);
  const winTopAbs = mix(yb.mul(G), G.add(fl.sub(1).add(yb).mul(S)), up);
  const isLM = band(style, 6).toVar();                                          // landmark (church, chapel...)
  const ok = float(1).sub(party).mul(float(1).sub(isLM)).mul(step(float(1.6), fw)).mul(step(float(2.8), eh))
    .mul(step(winTopAbs.add(0.35), eh))                                          // the whole window fits under the eaves
    .mul(step(0.0, gx)).mul(step(gx, nb)).toVar();
  // the front door replaces one ground-floor window on a street face
  const doorBay = floor(rnd.mul(nb));
  const isDoor = street.mul(step(abs(floor(gx).sub(doorBay)), 0.5)).mul(float(1).sub(up)).mul(ok).toVar();
  const dxa = float(0.5).sub(float(0.55).div(bw)), dxb = float(1).sub(dxa);
  const wxa = mix(xa, dxa, isDoor), wxb = mix(xb, dxb, isDoor);
  const wya = mix(ya, float(0.0), isDoor), wyb = mix(yb, float(0.72), isDoor);
  const cx = filteredPulse(gx, wxa, wxb, fwx), cy = filteredPulse(gy, wya, wyb, fwy);
  const opening = cx.mul(cy).mul(ok).toVar();                                    // whole opening (frame + glass)
  // frame 7 cm, glass inside; a mullion and a transom
  const fX = float(0.07).div(bw), fY = float(0.07).div(storeyH);
  const gxa = wxa.add(fX), gxb = wxb.sub(fX), gya = wya.add(fY), gyb = wyb.sub(fY);
  const glassBox = filteredPulse(gx, gxa, gxb, fwx).mul(filteredPulse(gy, gya, gyb, fwy)).mul(ok).toVar();
  const wu = clamp(fract(gx).sub(gxa).div(gxb.sub(gxa)), 0.0, 1.0).toVar();      // 0..1 inside the glass
  const wv = clamp(fract(gy).sub(gya).div(gyb.sub(gya)), 0.0, 1.0).toVar();
  const barX = smoothstep(float(0.035).div(ww), float(0.0), abs(wu.sub(0.5))).mul(step(float(0.95), ww));
  const barY = smoothstep(float(0.035).div(storeyH.mul(0.5)), float(0.0), abs(wv.sub(0.7)));
  const bars = max(barX, barY).mul(float(1).sub(isDoor)).mul(near.mul(0.7).add(0.3));
  const glass = glassBox.mul(float(1).sub(bars)).toVar();
  const frame = opening.sub(glassBox).add(glassBox.mul(bars)).max(0).toVar();

  // ---- wall surface by style, with relief heights
  const brick = courses(h, u, 0.0675, 0.23, float(0.01), rnd.mul(97.0));
  const brickTone = brick.tone.sub(0.5).mul(0.35).add(1.0);
  const mortar = C(0.3, 0.28, 0.25);
  const brickOf = (c) => mix(c.mul(brickTone).add(grain.mul(0.01)), mortar, brick.joint);
  const stain = noise2D(vec2(u.mul(1.4), h.mul(0.05).add(rnd.mul(13.0))));      // soot streaks run down the wall
  const renderOf = (c) => c.add(grain.mul(0.012)).mul(float(1).sub(stain.mul(0.12))).sub(smoothstep(float(1.4), float(0.0), h).mul(0.05));
  let col = brickOf(C(0.29, 0.085, 0.05));
  col = mix(col, brickOf(C(0.17, 0.075, 0.045)), band(style, 1));
  col = mix(col, brickOf(C(0.4, 0.27, 0.14)), band(style, 2));
  col = mix(col, renderOf(C(0.62, 0.6, 0.55)), band(style, 3));
  col = mix(col, renderOf(C(0.56, 0.47, 0.32)), band(style, 4));
  col = mix(col, renderOf(C(0.3, 0.29, 0.27)), band(style, 5));
  const isBrick = float(1).sub(step(float(2.5), style)).toVar();
  // relief: domed bricks, recessed openings, protruding sills / plinth / cornice (metres)
  let height = isBrick.mul(float(1).sub(brick.joint)).mul(0.0045);
  height = height.sub(opening.mul(0.12));                                        // reveal: the opening sits 12 cm back
  const aaH = fwidth(h).add(0.002);
  const plinth = float(1).sub(smoothstep(float(0.5).sub(aaH), float(0.5).add(aaH), h)).toVar();
  col = mix(col, C(0.075, 0.08, 0.09).add(grain.mul(0.01)), plinth);
  height = height.add(plinth.mul(0.03));
  const corn = smoothstep(eh.sub(0.42).sub(aaH), eh.sub(0.42).add(aaH), h).mul(float(1).sub(smoothstep(eh.sub(0.12).sub(aaH), eh.sub(0.12).add(aaH), h)))
    .mul(step(float(4.5), eh)).mul(float(1).sub(party)).toVar();
  col = mix(col, C(0.55, 0.53, 0.49), corn.mul(0.85));
  height = height.add(corn.mul(0.05));
  // sills (blue stone) under every window, a shadow beneath them, lit top
  const sillX = filteredPulse(gx, wxa.sub(float(0.06).div(bw)), wxb.add(float(0.06).div(bw)), fwx);
  const sillY = filteredPulse(gy, wya.sub(float(0.08).div(storeyH)), wya, fwy);
  const sill = sillX.mul(sillY).mul(ok).mul(float(1).sub(isDoor)).toVar();
  const underSill = sillX.mul(filteredPulse(gy, wya.sub(float(0.3).div(storeyH)), wya.sub(float(0.08).div(storeyH)), fwy)).mul(ok).mul(float(1).sub(isDoor));
  col = mix(col, C(0.16, 0.165, 0.17).add(env.uSunColor.mul(0.04)), sill);
  col = col.mul(float(1).sub(underSill.mul(0.25)));
  height = height.add(sill.mul(0.04));
  // reveal shadows on the wall just inside the opening: lintel (top) and jambs
  const revealTop = smoothstep(gyb.sub(float(0.12).div(storeyH)), gyb, fract(gy)).mul(glassBox);
  const revealSide = max(smoothstep(gxa.add(float(0.1).div(bw)), gxa, fract(gx)), smoothstep(gxb.sub(float(0.1).div(bw)), gxb, fract(gx))).mul(glassBox);

  // ---- glass with the room behind it
  const n = normalize(vec3(normalWorld.x, 0.0, normalWorld.z));
  const view = normalize(cameraPosition.sub(P));
  const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.52).add(0.08).toVar();
  const cellId = vec2(floor(gx), floor(gy));
  const litProb = float(0.55).mul(0.62);
  const drapeFootprint = fwidth(wu);                                            // derivatives before the branch
  const room = Fn(() => {
    const fwv = vec2(fwx, fwy).toVar(), drapeFw = float(drapeFootprint).toVar();
    const r = vec4(0).toVar();
    If(glass.greaterThan(0.0), () => {                                           // rooms only where there is glass
      r.assign(interiorRoom(gx, gy, vec2(wu, wv), cellId, bw, storeyH, rnd.mul(100.0), litProb, fwv, drapeFw));
    });
    return r;
  })();
  const dirt = float(0.4).add(smoothstep(0.25, 0.0, wv).mul(0.2));
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
  let glassCol = mix(room.rgb.mul(C(0.71, 0.78, 0.75)), C(0.05, 0.06, 0.065), dirt.mul(0.3));
  glassCol = mix(glassCol, sky.mul(0.7), fres);
  glassCol = glassCol.mul(float(1).sub(revealTop.mul(0.42))).mul(float(1).sub(revealSide.mul(0.3)));
  // door: painted, panelled, glazed fanlight above
  const di = floor(fract(rnd.mul(31.0)).mul(4.0));
  let doorCol = C(0.05, 0.12, 0.07);
  doorCol = mix(doorCol, C(0.16, 0.03, 0.03), band(di, 1));
  doorCol = mix(doorCol, C(0.03, 0.05, 0.11), band(di, 2));
  doorCol = mix(doorCol, C(0.12, 0.06, 0.025), band(di, 3));
  const fan = step(0.78, wv);
  const panel = step(abs(wu.sub(0.5)), 0.36).mul(max(step(abs(wv.sub(0.25)), 0.17), step(abs(wv.sub(0.58)), 0.14)));
  doorCol = mix(doorCol.mul(0.7), doorCol, panel);
  const doorGlass = isDoor.mul(fan);
  const frameCol = mix(C(0.6, 0.6, 0.58), C(0.07, 0.065, 0.06), step(float(0.8), fract(rnd.mul(7.0))));

  col = mix(col, frameCol, frame);
  const glassPart = glass.mul(mix(float(1), doorGlass, isDoor)).toVar();
  const doorPart = glass.mul(isDoor).mul(float(1).sub(fan));
  col = mix(col, glassCol, glassPart);
  col = mix(col, doorCol, doorPart);
  height = height.add(frame.mul(0.03));

  // ---- landmarks: ashlar stone, tall round-arched stained-glass windows, a portal
  const ash = courses(h, u, 0.32, 0.62, float(0.012), rnd.mul(31.0));
  let lmCol = C(0.34, 0.315, 0.28).mul(ash.tone.sub(0.5).mul(0.22).add(1.0)).mul(float(1).sub(stain.mul(0.18))).add(grain.mul(0.01));
  lmCol = mix(lmCol, C(0.2, 0.19, 0.17), ash.joint);
  let lmH = float(1).sub(ash.joint).mul(0.006);
  const lmPlinth = float(1).sub(smoothstep(float(0.8).sub(aaH), float(0.8).add(aaH), h));
  lmCol = mix(lmCol, C(0.11, 0.115, 0.12), lmPlinth);
  lmH = lmH.add(lmPlinth.mul(0.05));
  const sc = max(smoothstep(float(0.14).add(aaH), float(0.14).sub(aaH), abs(h.sub(3.0))),
    smoothstep(float(0.14).add(aaH), float(0.14).sub(aaH), abs(fract(h.sub(3.0).div(7.0)).sub(0.5).mul(7.0).abs().sub(3.5)))).mul(step(float(3.5), eh));
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), sc);
  lmH = lmH.add(sc.mul(0.05));
  // windows: bays of ~3.6 m, window 1.4 m wide, from 3.4 m to the eaves - 1.5 m (max 10 m), round arch on top
  const nbL = max(floor(fw.div(3.6).add(0.5)), float(1));
  const bwL = fw.div(nbL);
  const lx = fract(u.div(bwL)).sub(0.5).mul(bwL).toVar();
  const hwL = min(float(0.7), bwL.mul(0.21)).toVar();
  const y0 = mix(float(2.4), float(3.4), step(float(8.0), eh)), yTop = min(eh.sub(mix(float(0.9), float(1.5), step(float(8.0), eh))), float(13.4)).toVar();
  const ySpring = yTop.sub(hwL).toVar();
  const dRect = max(abs(lx).sub(hwL), y0.sub(h));
  const dArch = length(vec2(lx, h.sub(ySpring))).sub(hwL);
  const dWin = h.lessThan(ySpring).select(dRect, dArch).toVar();
  const lmOk = isLM.mul(float(1).sub(party)).mul(step(float(2.2), fw)).mul(step(float(5.2), eh)).toVar();
  const aaW = fwidth(dWin).add(0.003);
  const lmWin = smoothstep(aaW, aaW.negate(), dWin).mul(lmOk).toVar();
  const surround = smoothstep(aaW, aaW.negate(), dWin.sub(0.16)).mul(float(1).sub(lmWin)).mul(lmOk);
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), surround);
  lmH = lmH.add(surround.mul(0.04)).sub(lmWin.mul(0.2));
  // stained glass: leaded diamond lattice, a colour per pane
  const ga = lx.add(h).div(0.26), gb = lx.sub(h).div(0.26);
  const lead = max(smoothstep(0.08, 0.0, min(fract(ga), float(1).sub(fract(ga)))), smoothstep(0.08, 0.0, min(fract(gb), float(1).sub(fract(gb)))));
  const pane = hash2D(vec2(floor(ga), floor(gb)).add(rnd.mul(17.0)));
  let sg = C(0.02, 0.035, 0.12);
  sg = mix(sg, C(0.13, 0.012, 0.015), step(0.35, pane));
  sg = mix(sg, C(0.15, 0.085, 0.012), step(0.62, pane));
  sg = mix(sg, C(0.02, 0.07, 0.03), step(0.84, pane));
  const leadK = lead.mul(near.mul(0.6).add(0.4));
  // from outside by day stained glass reads dark, a hint of colour and the sky's sheen
  const sgDay = mix(sg.mul(0.28).add(C(0.012, 0.012, 0.015)), vec3(env.uSkyHorizon).mul(0.22), fres.mul(0.7));
  lmCol = mix(lmCol, mix(sgDay, C(0.02, 0.02, 0.022), leadK), lmWin);
  // portal: on a street face, the bay nearest the middle of the wall
  const midBay = floor(fw.div(bwL).mul(0.5));
  const isPortal = street.mul(lmOk).mul(step(abs(floor(u.div(bwL)).sub(midBay)), 0.5));
  const pw = float(1.15), pTop = float(4.6);
  const dPortal = h.lessThan(pTop.sub(pw)).select(max(abs(lx).sub(pw), h.negate()), length(vec2(lx, h.sub(pTop.sub(pw)))).sub(pw));
  const portal = smoothstep(aaW, aaW.negate(), dPortal).mul(isPortal).toVar();
  const wood = C(0.09, 0.05, 0.025).mul(step(0.5, fract(lx.div(0.28))).mul(0.25).add(0.8));
  lmCol = mix(lmCol, wood, portal);
  lmH = lmH.sub(portal.mul(0.3));
  const lmGlass = lmWin.mul(float(1).sub(portal)).mul(float(1).sub(leadK)).toVar();
  col = mix(col, lmCol, isLM);
  height = mix(height, lmH, isLM);

  // ---- lighting terms
  const relief = bumpNormal(height.mul(near));
  m.normalNode = relief;
  m.colorNode = col;
  m.roughnessNode = mix(mix(mix(mix(float(0.85), float(0.93), isBrick), float(0.5), frame), mix(float(0.12), float(0.4), dirt.sub(0.4).mul(2.5)), glassPart),
    mix(float(0.8), float(0.15), lmGlass), isLM);
  m.metalnessNode = glassPart.add(lmGlass).mul(fres).mul(0.6);                               // lets SSR reflect the street in the glass
  m.emissiveNode = room.rgb.mul(room.a).mul(float(1).sub(fres.mul(0.82))).mul(glassPart).mul(env.uInteriorGlow).mul(0.76)
    .add(sg.mul(lmGlass).mul(env.uInteriorGlow).mul(2.2));                     // stained glass lit from inside at night
  // height AO: wall feet and narrow gaps between houses get less sky
  m.aoNode = mix(float(0.62), float(1.0), smoothstep(0.0, 9.0, h)).mul(smoothstep(0.0, 1.2, h).mul(0.2).add(0.8));
  return m;
}

export function roofMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const P = positionWorld;
  const r = attribute("aRoof", "vec4"), base = attribute("aRoofCol", "vec3");
  const u = r.x, v = r.y, flat = r.z, style = r.w;
  const near = float(1).sub(smoothstep(16.0, 160.0, length(P.sub(cameraPosition))));
  const grain = n3(P.x.mul(6.0), P.y.mul(6.0), P.z.mul(6.0));
  const weather = n3(P.x.mul(0.25), P.y.mul(0.25), P.z.mul(0.25));
  // tile type from the real colour: red-orange -> clay tiles, otherwise slate (Brussels' two roofs)
  const clayK = smoothstep(1.25, 1.6, base.x.div(max(base.y, 0.001))).toVar();
  const clay = courses(v, u, 0.32, 0.21, float(0.02), style.mul(53.0));
  const slate = courses(v, u, 0.25, 0.3, float(0.012), style.mul(71.0));
  const tone = mix(slate.tone, clay.tone, clayK), joint = mix(slate.joint, clay.joint, clayK);
  let col = base.mul(tone.sub(0.5).mul(mix(float(0.3), float(0.45), clayK)).add(1.0)).mul(float(1).sub(joint.mul(0.45)));
  col = col.mul(weather.mul(0.12).add(1.0)).add(grain.mul(0.006));
  const moss = smoothstep(float(0.35), float(0.8), n3(P.x.mul(0.9), P.y.mul(0.9), P.z.mul(0.9))).mul(clayK);
  col = mix(col, vec3(0.06, 0.075, 0.03), moss.mul(0.3));
  // relief: each course overlaps the one below (sawtooth), joints recessed
  const period = mix(float(0.25), float(0.32), clayK);
  // smooth ramp instead of a hard sawtooth step (a step tilts the bump normal to black); fades out once a
  // course is only a few pixels tall
  const fv = fract(v.div(period));
  const lap = smoothstep(0.0, 0.85, fv).mul(float(1).sub(smoothstep(0.9, 1.0, fv))).mul(mix(float(0.008), float(0.016), clayK));
  const fine = float(1).sub(smoothstep(period.mul(0.15), period.mul(0.5), fwidth(v)));
  const relief = lap.sub(joint.mul(0.006)).mul(near).mul(fine).mul(float(1).sub(flat));
  // flat roofs: the real colour with gravel speckle
  const flatCol = base.mul(n3(P.x.mul(30.0), 0.0, P.z.mul(30.0)).mul(0.18).add(1.0)).add(weather.mul(0.01));
  m.colorNode = mix(col, flatCol, flat);
  m.normalNode = bumpNormal(relief);
  m.roughnessNode = mix(mix(float(0.62), float(0.78), clayK), float(0.95), flat);
  return m;
}

/** Meshes for one tile. */
export function buildingMeshes(doc, buf, roads) {
  const a = analyseBuildings(doc, buf, roads);
  const mk = (part, attrs, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    for (const [k, n] of attrs) g.setAttribute(k, new THREE.BufferAttribute(part[k], n));
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = name;
    return mesh;
  };
  return {
    meshes: [mk(a.walls, [["aWall", 4], ["aBld", 4]], wallMaterial(), "buildings-walls"),
      mk(a.roofs, [["aRoof", 4], ["aRoofCol", 3]], roofMaterial(), "buildings-roofs")],
    stats: a.stats, triangles: a.stats.triangles, vertices: a.stats.vertices,
  };
}
