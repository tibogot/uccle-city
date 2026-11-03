// Building façades and roofs: per-face analysis at load + procedural TSL materials.
//
// UrbIS gives real LoD2 geometry (CONTRACT 5.2) but no surfaces. This module adds plausible ones:
//
//   analysis (JS, once per tile)
//     - wall triangles are grouped into planar faces per building; each vertex gets wall-local
//       coordinates: aWall = (u along the face from its left end, face width, height above the
//       building's base, eaves height above base)
//     - each face is classified: PARTY wall (a point 0.35 m outside it lies in another footprint:
//       the shared walls of Brussels terraces, no windows) and STREET-facing (it looks at a road
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
import { attribute, positionWorld, float, vec3, mix, step, smoothstep, floor, fract, abs, min, max, fwidth } from "three/tsl";
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
  const inOther = (x, z, bi) => {
    for (const f of fp.near(x, z)) if (f.bi !== bi && x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && pip(x, z, f.ring)) return true;
    return false;
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
  const R = { position: [], normal: [], aRoof: [] };
  const stats = { faces: 0, party: 0, street: 0 };
  doc.buildings.forEach((b, bi) => {
    const base = b.base, eaves = (b.eaves ?? b.top) - base;
    const key = String(b.attrs?.BU_ID ?? b.id);
    const rnd = hash01(key), style = wallStyle(hash01(key + "s"), b.height);
    const roofStyle = hash01(key + "r");
    // --- walls: group triangles into planar faces
    const faces = new Map();
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) {
      const v = [0, 1, 2].map((q) => I[t * 3 + q]);
      const p = v.map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
      const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
      const wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const L = Math.hypot(nx, ny, nz);
      if (L < 1e-9) continue;
      nx /= L; ny /= L; nz /= L;
      const h = Math.hypot(nx, nz) || 1;
      const d = (p[0][0] * nx + p[0][2] * nz) / h;
      const k = `${Math.round(Math.atan2(nz, nx) * 20)}|${Math.round(d * 4)}`;   // ~3°, 25 cm
      if (!faces.has(k)) faces.set(k, { tris: [], nx: nx / h, nz: nz / h });
      faces.get(k).tris.push({ p, n: [nx, ny, nz] });
    }
    for (const f of faces.values()) {
      const tx = -f.nz, tz = f.nx;                       // along the face, left to right seen from outside
      let u0 = Infinity, u1 = -Infinity, cx = 0, cz = 0, n = 0;
      for (const { p } of f.tris) for (const q of p) {
        const u = q[0] * tx + q[2] * tz;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); cx += q[0]; cz += q[2]; n++;
      }
      cx /= n; cz /= n;
      const width = u1 - u0;
      const party = width > 0.3 && inOther(cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE, bi) ? 1 : 0;
      const street = !party && facesStreet(cx, cz, f.nx, f.nz) ? 1 : 0;
      stats.faces++; stats.party += party; stats.street += street;
      for (const { p, n: nn } of f.tris) for (const q of p) {
        W.position.push(q[0], q[1], q[2]);
        W.normal.push(nn[0], nn[1], nn[2]);
        W.aWall.push(q[0] * tx + q[2] * tz - u0, width, q[1] - base, eaves);
        W.aBld.push(style, party, street, rnd);
      }
    }
    // --- roofs: slope-aligned coordinates
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const p = [0, 1, 2].map((q) => { const i = I[t * 3 + q]; return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; });
      const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
      const wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const L = Math.hypot(nx, ny, nz);
      if (L < 1e-9) continue;
      nx /= L; ny /= L; nz /= L;
      const flat = ny > 0.97 ? 1 : 0;
      const h = Math.hypot(nx, nz) || 1, dx = nx / h, dz = nz / h;   // downhill, horizontal
      for (const q of p) {
        R.position.push(q[0], q[1], q[2]);
        R.normal.push(nx, ny, nz);
        if (flat) R.aRoof.push(q[0], q[2], 1, roofStyle);
        else R.aRoof.push(q[0] * -dz + q[2] * dx, (q[0] * dx + q[2] * dz) / Math.max(ny, 0.2), 0, roofStyle);
      }
    }
  });
  const f32 = (a) => new Float32Array(a);
  return {
    walls: { position: f32(W.position), normal: f32(W.normal), aWall: f32(W.aWall), aBld: f32(W.aBld) },
    roofs: { position: f32(R.position), normal: f32(R.normal), aRoof: f32(R.aRoof) },
    stats: { ...stats, triangles: T, vertices: V },
  };
}

// ---------------------------------------------------------------- materials

const C = (r, g, b) => vec3(r, g, b);

export function wallMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const P = positionWorld;
  const wall = attribute("aWall", "vec4"), bld = attribute("aBld", "vec4");
  const u = wall.x, fw = wall.y, h = wall.z, eh = wall.w;
  const style = bld.x, party = bld.y, street = bld.z, rnd = bld.w;
  const grain = n3(P.x.mul(5.0), P.y.mul(5.0), P.z.mul(5.0));
  const stain = n3(P.x.mul(0.4), P.y.mul(0.9), P.z.mul(0.4));

  // --- wall surface by style
  const brick = courses(h, u, 0.0675, 0.23, float(0.01), rnd.mul(97.0));
  const brickTone = brick.tone.sub(0.5).mul(0.35).add(1.0);
  const mortar = C(0.32, 0.3, 0.27);
  const brickOf = (col) => mix(col.mul(brickTone).add(grain.mul(0.01)), mortar, brick.joint);
  const red = brickOf(C(0.29, 0.085, 0.05)), brown = brickOf(C(0.17, 0.075, 0.045)), yellow = brickOf(C(0.4, 0.27, 0.14));
  const renderOf = (col) => col.add(grain.mul(0.012)).sub(stain.mul(0.025)).sub(smoothstep(float(1.5), float(0.0), h).mul(0.05));
  const white = renderOf(C(0.62, 0.6, 0.55)), cream = renderOf(C(0.56, 0.47, 0.32)), grey = renderOf(C(0.3, 0.29, 0.27));
  let col = red;
  col = mix(col, brown, band(style, 1));
  col = mix(col, yellow, band(style, 2));
  col = mix(col, white, band(style, 3));
  col = mix(col, cream, band(style, 4));
  col = mix(col, grey, band(style, 5));
  const isBrick = float(1).sub(step(float(2.5), style));
  let rough = mix(float(0.85), float(0.92), isBrick);

  // --- plinth (Belgian blue stone) and cornice band under the eaves
  const aaH = fwidth(h).add(0.002);
  const plinth = float(1).sub(smoothstep(float(0.5).sub(aaH), float(0.5).add(aaH), h));
  col = mix(col, C(0.075, 0.08, 0.09).add(grain.mul(0.01)), plinth);
  const corn = smoothstep(eh.sub(0.42).sub(aaH), eh.sub(0.42).add(aaH), h).mul(float(1).sub(smoothstep(eh.sub(0.12).sub(aaH), eh.sub(0.12).add(aaH), h)))
    .mul(step(float(4.5), eh)).mul(float(1).sub(party));
  col = mix(col, C(0.55, 0.53, 0.49), corn.mul(0.85));

  // --- storeys and window bays
  const nb = max(floor(fw.div(2.7)), float(1));
  const bw = fw.div(nb);
  const bay = floor(u.div(bw));
  const ub = fract(u.div(bw)).sub(0.5).mul(bw);                 // metres from the bay centre
  const ww = min(float(1.25), bw.mul(0.5));
  const G = float(3.4), S = float(3.0);
  const up = step(G, h);
  const fl = floor(h.sub(G).div(S)).add(1).mul(up);             // 0 = ground floor
  const hz = mix(h, h.sub(G).sub(fl.sub(1).mul(S)), up);        // height inside the storey
  const lo = mix(float(0.95), float(0.85), up), hi = mix(float(2.6), float(2.35), up);
  const floorTop = h.sub(hz).add(hi);                           // absolute height of this storey's window top
  const allowed = float(1).sub(party).mul(step(float(1.8), fw)).mul(step(float(3.0), eh))
    .mul(step(floorTop.add(0.3), eh));                         // the whole window fits under the eaves
  const aaU = fwidth(u).add(0.002);
  const box = (cx, hw, y0, y1, a) =>
    smoothstep(hw.add(a), hw.sub(a), abs(ub.sub(cx))).mul(smoothstep(y0.sub(a), y0.add(a), hz)).mul(smoothstep(y1.add(a), y1.sub(a), hz));
  let win = box(float(0), ww.mul(0.5), lo, hi, aaU).mul(allowed);
  // the front door: ground floor of a street face, one bay chosen per building
  const doorBay = floor(rnd.mul(nb));
  const isDoor = street.mul(band(bay.sub(doorBay), 0)).mul(float(1).sub(up)).mul(step(float(1.8), fw)).mul(step(float(2.8), eh));
  const door = box(float(0), float(0.55), float(0.0), float(2.45), aaU).mul(isDoor);
  win = win.mul(float(1).sub(isDoor));
  // frame: the outer 7 cm of the window; glazing bars: a centre mullion and a transom at 70 %
  const inner = box(float(0), ww.mul(0.5).sub(0.07), lo.add(0.07), hi.sub(0.07), aaU);
  const mull = smoothstep(float(0.03).add(aaU), float(0.03).sub(aaU), abs(ub)).mul(step(float(0.9), ww));
  const tr = lo.add(hi.sub(lo).mul(0.7));
  const trans = smoothstep(float(0.03).add(aaU), float(0.03).sub(aaU), abs(hz.sub(tr)));
  const glass = inner.mul(float(1).sub(max(mull, trans)));
  const frame = win.mul(float(1).sub(glass));
  // sill under each window
  const sill = box(float(0), ww.mul(0.5).add(0.06), lo.sub(0.09), lo, aaU).mul(allowed).mul(float(1).sub(isDoor));
  col = mix(col, C(0.5, 0.49, 0.46), sill);
  // glass: dark, a sky gradient toward the top, some windows with lighter curtains
  const curtain = step(float(0.65), fract(rnd.mul(13.0).add(bay.mul(0.37)).add(fl.mul(0.61))));
  const glassCol = mix(C(0.025, 0.03, 0.04), C(0.13, 0.16, 0.2), smoothstep(lo, hi, hz).mul(0.8)).add(curtain.mul(C(0.06, 0.055, 0.045)));
  const frameCol = mix(C(0.6, 0.6, 0.58), C(0.07, 0.065, 0.06), step(float(0.8), fract(rnd.mul(7.0))));   // white, some dark frames
  col = mix(col, frameCol, frame);
  col = mix(col, glassCol, glass.mul(win));
  rough = mix(rough, float(0.5), frame);
  rough = mix(rough, float(0.08), glass.mul(win));
  // door: painted (Brussels green, oxblood, navy, natural wood), panelled
  const di = floor(fract(rnd.mul(31.0)).mul(4.0));
  let doorCol = C(0.05, 0.12, 0.07);
  doorCol = mix(doorCol, C(0.16, 0.03, 0.03), band(di, 1));
  doorCol = mix(doorCol, C(0.03, 0.05, 0.11), band(di, 2));
  doorCol = mix(doorCol, C(0.12, 0.06, 0.025), band(di, 3));
  const panel = box(float(0), float(0.4), float(0.25), float(1.15), aaU).add(box(float(0), float(0.4), float(1.35), float(2.25), aaU));
  doorCol = mix(doorCol.mul(0.75), doorCol, min(panel, float(1)));
  col = mix(col, doorCol, door);
  rough = mix(rough, float(0.45), door);
  m.colorNode = col;
  m.roughnessNode = rough;
  return m;
}

export function roofMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const P = positionWorld;
  const r = attribute("aRoof", "vec4");
  const u = r.x, v = r.y, flat = r.z, style = r.w;
  const grain = n3(P.x.mul(6.0), P.y.mul(6.0), P.z.mul(6.0));
  const weather = n3(P.x.mul(0.25), P.y.mul(0.25), P.z.mul(0.25));
  const moss = smoothstep(float(0.35), float(0.8), n3(P.x.mul(0.9), P.y.mul(0.9), P.z.mul(0.9)));
  // clay tiles: 32 cm courses down the slope, 21 cm wide
  const clay = courses(v, u, 0.32, 0.21, float(0.02), style.mul(53.0));
  const clayCol = mix(C(0.24, 0.065, 0.035), C(0.33, 0.11, 0.05), clay.tone).mul(float(1).sub(clay.joint.mul(0.55)));
  // dark glazed tiles
  const glazed = mix(C(0.025, 0.025, 0.028), C(0.05, 0.05, 0.055), clay.tone).mul(float(1).sub(clay.joint.mul(0.5)));
  // slate: 25 cm courses, 30 cm wide
  const sl = courses(v, u, 0.25, 0.3, float(0.012), style.mul(71.0));
  const slateCol = mix(C(0.045, 0.05, 0.06), C(0.08, 0.085, 0.095), sl.tone).mul(float(1).sub(sl.joint.mul(0.6)));
  const kClay = step(style, float(0.58)), kGlazed = step(float(0.58), style).mul(step(style, float(0.72)));
  let col = mix(slateCol, clayCol, kClay);
  col = mix(col, glazed, kGlazed);
  col = col.add(weather.mul(0.015)).add(grain.mul(0.008));
  col = mix(col, C(0.07, 0.085, 0.03), moss.mul(0.35).mul(kClay));
  // flat roofs: bitumen with gravel speckle
  const flatCol = C(0.1, 0.1, 0.095).add(n3(P.x.mul(30.0), 0.0, P.z.mul(30.0)).mul(0.025)).add(weather.mul(0.02));
  m.colorNode = mix(col, flatCol, flat);
  m.roughnessNode = mix(mix(float(0.75), float(0.35), kGlazed), float(0.95), flat);
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
      mk(a.roofs, [["aRoof", 4]], roofMaterial(), "buildings-roofs")],
    stats: a.stats, triangles: a.stats.triangles, vertices: a.stats.vertices,
  };
}
