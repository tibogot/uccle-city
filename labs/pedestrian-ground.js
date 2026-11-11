// The Pedestrian Lab's test ground (docs/PEDESTRIANS_RESEARCH.md section 4): one small neighbourhood holding the lab
// spec's scenes, all scripted (no assets):
//   sidewalk   street A (east-west, 7 m carriageway): a 3.5 m north sidewalk with tree pits (two walking lines), a 2 m
//              south sidewalk (one line, a detour round a street cabinet), bollards at the kerb, a 6 % slope east of
//              x = 80 m, 13 cm kerbs;
//   crossing   the 4-arm junction with street B (north-south, 2.5 m sidewalks) and its signals (a local signal clock:
//              street A green 24 s, street B green 24 s, pedestrian WALK for the crossings over the red street);
//   zebra      an unsignalled zebra on street A at x = 60 m with dropped kerbs (pedestrian priority);
//   square     40 x 60 m north of street A (x 15..55): benches, a café terrace, free walking between nodes;
//   tram stop  a 50 m platform (25 cm) on a tram reservation west of the junction, a scripted tram every 120 s;
//   park path  a winding 2.5 m path through a park south of street A, with a bench.
// Exports: ground(x, z) (the one height function for meshes, rigs and meters), buildGround(scene), buildGraph(),
// Traffic (test cars, the signal clock, the zebra), Tram.
import * as THREE from "three/webgpu";
import { color, positionWorld, floor, mod, mix, float, fract, smoothstep, min, abs, step, uniform, select } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Graph } from "../viewer/pedestrians/sim.js";

export const L = 150;                       // half length of the streets (m)
export const A = { half: 3.5, north: -7, south: 5.5 };       // street A: carriageway |z| < 3.5, sidewalks to z -7 / 5.5
export const B = { half: 3.5, west: -6, east: 6 };           // street B: |x| < 3.5, sidewalks to x -6 / 6
export const KERB = 0.13;
export const ZEBRA = { x: 60, half: 2.5 };
export const SQUARE = { x0: 15, x1: 55, z0: -67, z1: -7 };
export const PARK = { x0: 18, x1: 130, z0: 5.5, z1: 130 };
export const TRAM = { x: -40.2, z0: 12, z1: 150, plat: { x0: -38.5, x1: -35.5, z0: 30, z1: 80 }, h: 0.25 };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const slope = (x) => (x > 80 ? 0.06 * (x - 80) : 0);
export const inRoad = (x, z) => (Math.abs(z) < A.half && Math.abs(x) <= L) || (Math.abs(x) < B.half && Math.abs(z) <= L);
const inTrack = (x, z) => x > -42.6 && x < TRAM.plat.x0 && z > TRAM.z0 && z < TRAM.z1;
/** The walking surface height (m). */
export function ground(x, z) {
  const base = slope(x);
  if (inRoad(x, z) || inTrack(x, z)) return base;
  let h = KERB;
  // dropped kerbs at the zebra: 13 cm -> 2 cm over the 1 m next to the kerb
  if (Math.abs(x - ZEBRA.x) < ZEBRA.half + 0.5) {
    const k = 1 - smooth(ZEBRA.half - 0.5, ZEBRA.half + 0.5, Math.abs(x - ZEBRA.x));
    const dz = Math.abs(z) - A.half;
    if (dz < 1) h = KERB - (KERB - 0.02) * k * (1 - Math.max(0, dz));
  }
  // the tram platform (25 cm) and its ramp from the sidewalk
  const P = TRAM.plat;
  if (x >= P.x0 && x <= P.x1 && z >= P.z0 && z <= P.z1) h = TRAM.h;
  else if (x >= P.x0 && x <= P.x1 && z > 22 && z < P.z0) h = KERB + (TRAM.h - KERB) * smooth(22, P.z0, z);
  return base + h;
}

// ----------------------------------------------------------------------------------------------- materials
function mats() {
  const p = positionWorld.xz;
  const asphalt = new THREE.MeshStandardNodeMaterial({ roughness: 0.93 });
  {
    const n = fract(p.x.mul(12.9898).add(p.y.mul(78.233)).sin().mul(43758.5453));
    asphalt.colorNode = mix(color(0x34363a), color(0x3e4045), n.mul(0.6));
    // zebra stripes (0.5 m on, 0.5 m off across the road) and stop lines
    const zx = abs(p.x.sub(ZEBRA.x)), stripes = step(zx, ZEBRA.half).mul(step(0.5, fract(p.y.mul(1.0).add(0.25)))).mul(step(abs(p.y), A.half - 0.3));
    asphalt.colorNode = mix(asphalt.colorNode, color(0xd8d8d2), stripes);
  }
  const paver = new THREE.MeshStandardNodeMaterial({ roughness: 0.86 });
  {
    const g = fract(p.mul(vec2s(1 / 0.3, 1 / 0.3)));
    const joint = smoothstep(0.0, 0.06, min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))));
    const cell = fract(floor(p.x.div(0.3)).mul(0.37).add(floor(p.y.div(0.3)).mul(0.71))).mul(0.12);
    paver.colorNode = mix(color(0x6f6a62), color(0x9b958b).add(cell), joint);
  }
  const square = new THREE.MeshStandardNodeMaterial({ roughness: 0.82 });
  {
    const g = fract(p.mul(vec2s(1 / 0.6, 1 / 0.6)));
    const joint = smoothstep(0.0, 0.03, min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))));
    square.colorNode = mix(color(0x7d776d), color(0xb3aa9a), joint);
  }
  const grass = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  {
    const n = fract(p.x.mul(3.1).sin().mul(p.y.mul(2.7).cos()).mul(43758.5));
    grass.colorNode = mix(color(0x3f5a2c), color(0x51703a), n);
  }
  const gravel = new THREE.MeshStandardNodeMaterial({ color: 0xa69a82, roughness: 0.97 });
  const kerb = new THREE.MeshStandardNodeMaterial({ color: 0xa9a59c, roughness: 0.8 });
  const wall = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
  wall.colorNode = mix(color(0xa58c74), color(0xc8bba4), step(0.5, fract(positionWorld.x.div(11).add(positionWorld.z.div(11)))));
  const door = new THREE.MeshStandardNodeMaterial({ color: 0x3b2a20, roughness: 0.6 });
  const metal = new THREE.MeshStandardNodeMaterial({ color: 0x2c3036, roughness: 0.5, metalness: 0.6 });
  const wood = new THREE.MeshStandardNodeMaterial({ color: 0x7a5a3a, roughness: 0.75 });
  const bark = new THREE.MeshStandardNodeMaterial({ color: 0x4b3b2c, roughness: 0.9 });
  const leaves = new THREE.MeshStandardNodeMaterial({ color: 0x4d6b35, roughness: 0.9 });
  const platform = new THREE.MeshStandardNodeMaterial({ color: 0x9d9a94, roughness: 0.85 });
  const rail = new THREE.MeshStandardNodeMaterial({ color: 0x6d6a66, roughness: 0.4, metalness: 0.8 });
  return { asphalt, paver, square, grass, gravel, kerb, wall, door, metal, wood, bark, leaves, platform, rail };
}
function vec2s(a, b) { return new THREE.Vector2(a, b); }

/** A rectangle sampled every `step` m with y = ground() (inset so it never reads the neighbour's height), top up. */
function rect(x0, x1, z0, z1, stepM = 2, yfn = ground) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / stepM)), nz = Math.max(1, Math.ceil((z1 - z0) / stepM));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position, e = 0.01;
  for (let i = 0; i < p.count; i++) {
    const x = Math.min(x1 - e, Math.max(x0 + e, p.getX(i))), z = Math.min(z1 - e, Math.max(z0 + e, p.getZ(i)));
    p.setY(i, yfn(x, z));
  }
  g.computeVertexNormals();
  return g;
}
/** A vertical kerb face along x (z fixed) or z (x fixed), from the road (low) up to the sidewalk (high). */
function kerbFace(axis, c, a0, a1, facing, stepM = 2) {
  const n = Math.max(1, Math.ceil((a1 - a0) / stepM)), pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const [x, z] = axis === "x" ? [a, c] : [c, a];
    const out = axis === "x" ? [x, z + facing * 0.02] : [x + facing * 0.02, z];
    const inn = axis === "x" ? [x, z - facing * 0.02] : [x - facing * 0.02, z];
    pos.push(x, ground(out[0], out[1]) - 0.02, z, x, ground(inn[0], inn[1]), z);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  // face the road: flip the winding when needed
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const want = axis === "x" ? [0, 0, facing] : [facing, 0, 0];
  if (nrm.getX(0) * want[0] + nrm.getZ(0) * want[2] < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}

export function buildGround(scene) {
  const M = mats();
  const parts = { asphalt: [], paver: [], square: [], grass: [], gravel: [], kerb: [], wall: [], door: [], metal: [], wood: [], bark: [], leaves: [], platform: [], rail: [] };
  const fine = (x0, x1) => (x1 > 78 ? 1 : 2);
  // carriageways (split at the junction box; the slope east of 80 m)
  parts.asphalt.push(rect(-L, -B.half, -A.half, A.half, 2), rect(B.half, L, -A.half, A.half, 1));
  parts.asphalt.push(rect(-B.half, B.half, -L, L, 2));
  // sidewalks of street A (x pieces round the junction and the square / park gaps)
  for (const [x0, x1] of [[-L, -B.half], [B.half, L]]) {
    parts.paver.push(rect(x0, x1, A.north, -A.half, x0 > 0 ? 0.5 : 1.0), rect(x0, x1, A.half, A.south, x0 > 0 ? 0.5 : 1.0));
  }
  // sidewalks of street B (outside the A sidewalks)
  for (const [z0, z1] of [[-L, A.north], [A.south, L]]) parts.paver.push(rect(B.west, -B.half, z0, z1, 2), rect(B.half, B.east, z0, z1, 2));
  // the square, the park (grass) with its path, the tram reservation, the platform
  parts.square.push(rect(SQUARE.x0, SQUARE.x1, SQUARE.z0, SQUARE.z1, 2));
  parts.grass.push(rect(PARK.x0, PARK.x1, PARK.z0, PARK.z1, 1));
  parts.gravel.push(rect(-42.6, TRAM.plat.x0, TRAM.z0, TRAM.z1, 2));
  parts.platform.push(rect(TRAM.plat.x0, TRAM.plat.x1, TRAM.plat.z0, TRAM.plat.z1, 2), rect(TRAM.plat.x0, TRAM.plat.x1, 22, TRAM.plat.z0, 0.5));
  parts.paver.push(rect(TRAM.plat.x0, TRAM.plat.x1, A.south, 22, 1));
  parts.grass.push(rect(-42.6, TRAM.plat.x0, A.south, TRAM.z0, 2));
  // block ground behind the façades (so the world is not a void): grass
  parts.grass.push(rect(-L, -B.half - 2.5, -L, A.north, 4), rect(B.east, SQUARE.x0, -L, A.north, 4), rect(SQUARE.x1, L, -L, A.north, 3), rect(SQUARE.x0, SQUARE.x1, -L, SQUARE.z0, 4));
  parts.grass.push(rect(-L, -42.6, A.south, L, 4), rect(TRAM.plat.x1, B.west, A.south, L, 4), rect(B.east, PARK.x0, A.south, L, 4), rect(PARK.x1, L, A.south, L, 3));
  // kerb faces along the carriageways
  for (const [x0, x1] of [[-L, -B.half], [B.half, L]]) {
    parts.kerb.push(kerbFace("x", -A.half, x0, x1, 1, x0 > 0 ? 0.5 : 2), kerbFace("x", A.half, x0, x1, -1, x0 > 0 ? 0.5 : 2));
  }
  for (const [z0, z1] of [[-L, -A.half], [A.half, L]]) parts.kerb.push(kerbFace("z", -B.half, z0, z1, 1), kerbFace("z", B.half, z0, z1, -1));
  parts.kerb.push(kerbFace("z", TRAM.plat.x0, TRAM.z0, TRAM.plat.z1, -1, 0.5));
  // the park path: a winding strip of gravel just above the grass
  const path = parkPath();
  {
    const pos = [], idx = [];
    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i], [ax, az] = path[Math.max(0, i - 1)], [bx, bz] = path[Math.min(path.length - 1, i + 1)];
      let tx = bx - ax, tz = bz - az; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const nx = -tz * 1.25, nz = tx * 1.25;
      pos.push(x + nx, ground(x + nx, z + nz) + 0.012, z + nz, x - nx, ground(x - nx, z - nz) + 0.012, z - nz);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.computeVertexNormals(); }
    parts.gravel.push(g);
  }
  // façades: rows of houses 6-9 m wide, 9-15 m high, doors every house; gaps for the square, the park, the tram
  const hsh = (a) => { const s = Math.sin(a * 127.1) * 43758.5453; return s - Math.floor(s); };
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const doors = [];
  const row = (x0, x1, line, side, axis) => {
    for (let a = x0, k = 0; a < x1 - 3; k++) {
      const w = Math.min(x1 - a, 6 + hsh(a + line) * 3), h = 9 + hsh(a * 1.3 + line) * 6, depth = 9;
      const cx = a + w / 2;
      const [px, pz] = axis === "x" ? [cx, line + side * depth / 2] : [line + side * depth / 2, cx];
      const g0 = axis === "x" ? ground(cx, line - side * 0.5) : ground(line - side * 0.5, cx);
      parts.wall.push(axis === "x" ? box(w - 0.08, h + 1, depth, px, g0 + h / 2 - 0.5, pz) : box(depth, h + 1, w - 0.08, px, g0 + h / 2 - 0.5, pz));
      const dpos = cx - w * 0.25;
      const [dx, dz] = axis === "x" ? [dpos, line - side * 0.03] : [line - side * 0.03, dpos];
      parts.door.push(axis === "x" ? box(1.0, 2.2, 0.06, dx, g0 + 1.1, dz) : box(0.06, 2.2, 1.0, dx, g0 + 1.1, dz));
      doors.push({ x: axis === "x" ? dpos : line - side * 0.45, z: axis === "x" ? line - side * 0.45 : dpos, axis, side });
      a += w;
    }
  };
  // street A north (façade at z = -7, houses to -16), except the square
  row(-L, -B.west - 12, A.north, -1, "x"); row(B.east + 0.5, SQUARE.x0, A.north, -1, "x"); row(SQUARE.x1, L, A.north, -1, "x");
  // street A south (z = 5.5), except the tram access and the park
  row(-L, -44, A.south, 1, "x"); row(-34, B.west - 0.5, A.south, 1, "x"); row(B.east + 0.5, PARK.x0, A.south, 1, "x"); row(PARK.x1, L, A.south, 1, "x");
  // street B west / east (x = -6 / 6)
  row(-L, A.north - 0.5, B.west, -1, "z"); row(A.south + 0.5, L, B.west, -1, "z"); row(-L, A.north - 0.5, B.east, 1, "z"); row(A.south + 0.5, 95, B.east, 1, "z"); row(105, L, B.east, 1, "z");
  // tree pits + trees on the north sidewalk of street A (every 12 m, west part), bollards on the south kerb, a cabinet
  const trees = [];
  for (let x = -140; x < -12; x += 12) trees.push([x, -4.15]);
  for (let x = 66; x < 140; x += 12) trees.push([x, -4.15]);
  for (const [x, z] of trees) {
    parts.gravel.push(box(1.1, 0.04, 1.1, x, ground(x, z) - 0.01, z));
    parts.bark.push(new THREE.CylinderGeometry(0.11, 0.16, 4.2, 9).translate(x, ground(x, z) + 2.1, z));
    parts.leaves.push(new THREE.IcosahedronGeometry(2.0, 2).scale(1, 1.15, 1).translate(x, ground(x, z) + 5.6, z));
  }
  for (let x = -140; x < -10; x += 4.5) if (Math.abs(x + 80) > 4) parts.metal.push(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 10).translate(x, ground(x, 3.8) + 0.45, 3.8));
  parts.metal.push(box(0.7, 1.3, 0.45, -80, ground(-80, 5.1) + 0.65, 5.15));               // the street cabinet (the detour)
  // the square: benches along its west edge, a café terrace (tables), a few trees
  for (const z of [-20, -30, -40, -50]) parts.wood.push(box(0.5, 0.06, 1.9, SQUARE.x0 + 1.6, ground(17, z) + 0.45, z), box(0.08, 0.45, 1.9, SQUARE.x0 + 1.35, ground(17, z) + 0.68, z),
    box(0.4, 0.42, 0.08, SQUARE.x0 + 1.6, ground(17, z) + 0.21, z - 0.85), box(0.4, 0.42, 0.08, SQUARE.x0 + 1.6, ground(17, z) + 0.21, z + 0.85));
  // café chairs (two per table, facing it), seat 45 cm
  for (const [x, z] of [[44, -15], [49, -15], [44, -21], [49, -21]]) for (const sz of [-1, 1]) {
    const cz = z + sz * 0.85, y0 = ground(x, cz);
    parts.wood.push(box(0.42, 0.04, 0.42, x, y0 + 0.45, cz), box(0.42, 0.42, 0.04, x, y0 + 0.68, cz + sz * 0.21));
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) parts.metal.push(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5).translate(x + lx, y0 + 0.225, cz + lz));
  }
  for (const [x, z] of [[44, -15], [49, -15], [44, -21], [49, -21]]) parts.metal.push(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 16).translate(x, ground(x, z) + 0.74, z), new THREE.CylinderGeometry(0.03, 0.03, 0.74, 8).translate(x, ground(x, z) + 0.37, z));
  for (const [x, z] of [[30, -45], [40, -55], [25, -60]]) {
    parts.bark.push(new THREE.CylinderGeometry(0.13, 0.18, 4.4, 9).translate(x, ground(x, z) + 2.2, z));
    parts.leaves.push(new THREE.IcosahedronGeometry(2.4, 2).scale(1, 1.1, 1).translate(x, ground(x, z) + 6, z));
  }
  // the park bench (beside the path) and park trees
  parts.wood.push(box(1.9, 0.06, 0.5, 52.5, ground(52.5, 56) + 0.45, 55.2), box(1.9, 0.45, 0.08, 52.5, ground(52.5, 56) + 0.68, 54.95));
  for (let i = 0; i < 26; i++) {
    const x = PARK.x0 + 6 + hsh(i * 3.1) * (PARK.x1 - PARK.x0 - 12), z = PARK.z0 + 8 + hsh(i * 7.7) * (PARK.z1 - PARK.z0 - 12);
    if (path.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4)) continue;
    parts.bark.push(new THREE.CylinderGeometry(0.15, 0.22, 5, 9).translate(x, ground(x, z) + 2.5, z));
    parts.leaves.push(new THREE.IcosahedronGeometry(3, 2).scale(1, 1.1, 1).translate(x, ground(x, z) + 7, z));
  }
  // tram rails
  for (const dx of [-0.72, 0.72]) parts.rail.push(box(0.07, 0.12, TRAM.z1 - TRAM.z0, TRAM.x + dx, 0.06, (TRAM.z0 + TRAM.z1) / 2));
  // build
  const group = new THREE.Group(); group.name = "testGround";
  for (const [k, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const ok = list.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { for (const n of Object.keys(g.attributes)) if (n !== "position" && n !== "normal") g.deleteAttribute(n); return g; });
    const m = new THREE.Mesh(mergeGeometries(ok), M[k]);
    m.receiveShadow = true; m.castShadow = !["asphalt", "paver", "square", "grass", "gravel", "platform"].includes(k);
    group.add(m);
  }
  scene.add(group);
  return { group, doors, path, mats: M };
}

/** The park path's centre line (Catmull-Rom through control points, ~2.5 m apart). */
export function parkPath() {
  const P = [[40, 4.4], [40, 9], [46, 20], [36, 38], [50, 58], [72, 68], [84, 92], [64, 110], [30, 106], [12, 100], [4.8, 100]];
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2.5));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}

// ----------------------------------------------------------------------------------------------- the walk graph
export function buildGraph(doors) {
  const g = new Graph();
  const xs = (a, b, stepM, extra = []) => {
    const out = new Set(); for (let x = a; x < b; x += stepM) out.add(+x.toFixed(2)); out.add(b); for (const e of extra) if (e >= a && e <= b) out.add(e);
    return [...out].sort((p, q) => p - q);
  };
  const lineX = (z, x0, x1, extra, width, zAt = () => z) => g.chain(xs(x0, x1, 7.5, extra).map((x) => [x, zAt(x)]), "walk", { width });
  const lineZ = (x, z0, z1, extra, width) => g.chain(xs(z0, z1, 7.5, extra).map((z) => [x, z]), "walk", { width });
  const at = (ns, x, z) => ns.reduce((a, n) => (Math.hypot(n.x - x, n.z - z) < Math.hypot(a.x - x, a.z - z) ? n : a));
  const special = [-7.5, 7.5, ZEBRA.x, 20, 35, 50, 40, -37, -80, -82.5, -77.5];
  // street A north: two lines (kerb side z -5.0 west of the square, outer -6.2), street A south: one line (z 4.6) with
  // the detour round the cabinet at x = -80 (the line moves to z = 4.0 over x -83..-77)
  const An = [lineX(-5.0, -L, -6, special, 1.2), lineX(-5.0, 6, L, special, 1.2)];
  const Ao = [lineX(-6.2, -L, -6, special, 1.0), lineX(-6.2, 6, L, special, 1.0)];
  const detour = (x) => (Math.abs(x + 80) < 2.6 ? 4.05 : Math.abs(x + 80) < 4.2 ? 4.3 : 4.6);
  const As = [lineX(4.6, -L, -6, special, 1.0, detour), lineX(4.6, 6, L, special, 1.0)];
  const Bw = [lineZ(-4.8, -L, -8, [-7.5, 7.5], 1.2), lineZ(-4.8, 8, L, [7.5, 100], 1.2)];
  const Be = [lineZ(4.8, -L, -8, [-7.5, 7.5], 1.2), lineZ(4.8, 8, L, [7.5, 100], 1.2)];
  // ends of the world: "end" leaves (street ends)
  for (const ns of [...An, ...Ao, ...As]) for (const n of [ns[0], ns[ns.length - 1]]) if (Math.abs(n.x) > L - 1) n.kind = "end";
  for (const ns of [...Bw, ...Be]) for (const n of [ns[0], ns[ns.length - 1]]) if (Math.abs(n.z) > L - 1) n.kind = "end";
  // link the two north lines every 15 m (people change line)
  for (let k = 0; k < 2; k++) for (const n of An[k]) if (Math.round(n.x) % 15 === 0) { const o = at(Ao[k], n.x, -6.2); if (Math.abs(o.x - n.x) < 0.1) g.join(n, o, "walk", { width: 1 }); }
  // corners: A lines <-> B lines through a corner node
  const corner = (cx, cz, aEnds, bEnd) => { const c = g.node(cx, cz, "walk"); for (const e of aEnds) g.join(e, c, "walk", { width: 1.5 }); g.join(c, bEnd, "walk", { width: 1.5 }); return c; };
  const last = (ns) => ns[ns.length - 1], first = (ns) => ns[0];
  const cNW = corner(-4.9, -5.6, [last(An[0]), last(Ao[0])], last(Bw[0]));
  const cNE = corner(4.9, -5.6, [first(An[1]), first(Ao[1])], last(Be[0]));
  const cSW = corner(-4.9, 4.7, [last(As[0])], first(Bw[1]));
  const cSE = corner(4.9, 4.7, [first(As[1])], first(Be[1]));
  // signalled crossings (4 m wide): over street A at x = -7.5 / 7.5 (signal "A": WALK while street A is red), over
  // street B at z = -7.5 / 7.5 (signal "B")
  const kerbNode = (x, z) => g.node(x, z, "kerb");
  const cross = (k1, k2, signal, road, coord) => g.join(k1, k2, "cross", { width: 3.6, signal, road, coord });
  for (const sx of [-1, 1]) {
    const nK = kerbNode(sx * 7.5, -3.75), sK = kerbNode(sx * 7.5, 3.75);
    g.join(at(An[sx < 0 ? 0 : 1], sx * 7.5, -5), nK, "walk", { width: 2 }); g.join(at(As[sx < 0 ? 0 : 1], sx * 7.5, 4.6), sK, "walk", { width: 2 });
    cross(nK, sK, "A", "A", sx * 7.5);
  }
  for (const sz of [-1, 1]) {
    const wK = kerbNode(-3.75, sz * 7.5), eK = kerbNode(3.75, sz * 7.5);
    g.join(at(Bw[sz < 0 ? 0 : 1], -4.8, sz * 7.5), wK, "walk", { width: 2 }); g.join(at(Be[sz < 0 ? 0 : 1], 4.8, sz * 7.5), eK, "walk", { width: 2 });
    cross(wK, eK, "B", "B", sz * 7.5);
  }
  // the zebra (x = 60): dropped kerbs, pedestrian priority
  {
    const nK = kerbNode(ZEBRA.x, -3.75), sK = kerbNode(ZEBRA.x, 3.75);
    g.join(at(An[1], ZEBRA.x, -5), nK, "walk", { width: 2 }); g.join(at(As[1], ZEBRA.x, 4.6), sK, "walk", { width: 2 });
    g.join(nK, sK, "zebra", { width: 4.4, road: "A", coord: ZEBRA.x });
  }
  // doors: a leaf off the nearest line node
  for (const d of doors) {
    let lines;
    if (d.axis === "x") lines = d.z < 0 ? Ao : As; else lines = d.x < 0 ? (d.z < 0 ? [Bw[0]] : [Bw[1]]) : (d.z < 0 ? [Be[0]] : [Be[1]]);
    let best = null, bd = Infinity;
    for (const ns of lines) for (const n of ns) { const dd = Math.hypot(n.x - d.x, n.z - d.z); if (dd < bd) { bd = dd; best = n; } }
    if (!best || bd > 6) continue;
    const dn = g.node(d.x, d.z, "door");
    g.join(best, dn, "door", { width: 1 });
  }
  // the square: entries from the north sidewalk's outer line, a 4 x 5 node field, benches, the café terrace
  const field = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const x = SQUARE.x0 + 6 + i * 9.3 + (((i * 7 + j * 3) % 5) - 2) * 0.6, z = SQUARE.z0 + 7 + j * 11 + (((i * 3 + j * 5) % 5) - 2) * 0.7;
    field.push(g.node(x, z, "pause", { pause: 0.3, minT: 3, maxT: 18, spread: 1.5 }));
  }
  for (const a of field) for (const b of field) if (a.id < b.id && Math.hypot(a.x - b.x, a.z - b.z) < 15) g.join(a, b, "square", { width: 3 });
  for (const x of [20, 35, 50]) { const o = at(Ao[1], x, -6.2); const n = g.node(x, -8.5, "walk"); g.join(o, n, "walk", { width: 2 }); g.join(n, at(field, x, -10), "square", { width: 3 }); }
  // benches: two seats each (the sitter's root = the seat, hips over it; UAL1 Sitting_Idle_Loop), facing the square
  for (const z of [-20, -30, -40, -50]) for (const dz of [-0.45, 0.45]) {
    const b = g.node(SQUARE.x0 + 1.68, z + dz, "pause", { pause: 0.7, minT: 15, maxT: 60, face: Math.PI / 2, sit: "sit" });
    g.join(b, at(field, SQUARE.x0 + 6, z), "square", { width: 2 });
  }
  // café chairs: sit and talk (UAL1 Sitting_Talking_Loop), facing the table
  for (const [x, z] of [[44, -15], [49, -15], [44, -21], [49, -21]]) for (const sz of [-1, 1]) {
    const t = g.node(x, z + sz * 0.93, "pause", { pause: 0.8, minT: 20, maxT: 70, face: sz < 0 ? 0 : Math.PI, sit: "sitTalk" });
    g.join(t, at(field, x, z), "square", { width: 2 });
  }
  // the park path (from street A south at x = 40 to street B east at z = 100) and its bench
  const pp = parkPath();
  const pn = g.chain(pp.slice(1, -1), "path", { width: 2.4, weight: 0.8 });
  g.join(at(As[1], 40, 4.6), pn[0], "path", { width: 2.4 }); g.join(last(pn), at(Be[1], 4.8, 100), "path", { width: 2.4 });
  { const near = at(pn, 52, 57); for (const dx of [-0.45, 0.45]) { const b = g.node(52.5 + dx, 55.28, "pause", { pause: 0.6, minT: 15, maxT: 60, face: 0, sit: "sit" }); g.join(near, b, "path", { width: 1.5 }); } }
  // the tram platform: from the south sidewalk at x = -37 down the ramp, a line along the platform, the boarding spot
  const access = g.chain([[-37, 6.5], [-37, 14], [-37, 22], [-37, 30]], "walk", { width: 2 });
  g.join(at(As[0], -37, 4.6), access[0], "walk", { width: 2 });
  const plat = g.chain([[-36.6, 30], [-36.6, 40], [-36.6, 50], [-36.6, 60], [-36.6, 70], [-36.6, 79]], "platform", { width: 1.6 });
  g.join(last(access), plat[0], "platform", { width: 2 });
  const board = g.node(-37.4, 55, "board", { spreadX: 1.3, spreadZ: 40, face: -Math.PI / 2 });
  g.join(at(plat, -36.6, 50), board, "platform", { width: 1.5, weight: 0.6 });
  const doorsT = [41, 47, 53, 59, 65].map((z) => ({ x: -38.3, z, face: Math.PI / 2 }));
  return { graph: g, platformLine: plat, tramDoors: doorsT };
}

// ----------------------------------------------------------------------------------------------- signals + cars
/** The local signal clock (58 s): street A green 0-24, amber 24-27, all red 27-29, street B green 29-53, amber,
 *  all red. Pedestrian crossings over street A ("A") show WALK while B is green (29-43), flashing 43-49; over B
 *  ("B"): WALK 0-14, flashing 14-20. */
export const SIGNAL = {
  period: 58,
  car(road, t) {
    const u = ((t % 58) + 58) % 58, o = road === "A" ? u : (u + 29) % 58;
    return o < 24 ? "green" : o < 27 ? "amber" : "red";
  },
  walk(id, t) {
    const u = ((t % 58) + 58) % 58, o = id === "B" ? u : (u + 29) % 58;
    return o < 14 ? "walk" : o < 20 ? "flash" : "red";
  },
};

export class Traffic {
  constructor(scene, sim, { perLane = 4 } = {}) {
    this.sim = sim; this.cars = [];
    const lanes = [
      { road: "A", axis: "x", dir: 1, off: 1.75 }, { road: "A", axis: "x", dir: -1, off: -1.75 },
      { road: "B", axis: "z", dir: 1, off: -1.75 }, { road: "B", axis: "z", dir: -1, off: 1.75 },
    ];
    this.lanes = lanes;
    const body = new THREE.BoxGeometry(1.8, 0.8, 4.2).translate(0, 0.65, 0);
    const cabin = new THREE.BoxGeometry(1.6, 0.6, 2.2).translate(0, 1.33, -0.2);
    const geo = mergeGeometries([body, cabin]);
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geo, mat, lanes.length * perLane);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    const paints = [0x0d0e10, 0x34383d, 0x9ea4ab, 0xe8e8e4, 0x1d3f6e, 0x8a1414, 0x5a5e63];
    let k = 0;
    for (const lane of lanes) for (let i = 0; i < perLane; i++, k++) {
      this.cars.push({ lane, s: -L + (i + 0.3 * (lanes.indexOf(lane) % 2)) * (2 * L / perLane), v: 8, vMax: 8.3 + (k % 3) * 0.6 });
      this.mesh.setColorAt(k, new THREE.Color(paints[k % paints.length]));
    }
    scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler();
  }
  /** Approaching cars for a crossing (road, coord): { canGo (a zebra: every car near can stop or has), clear (no car
   *  within 45 m or 8 m past: a red runner's check) } */
  near(e) {
    let canGo = true, clear = true;
    for (const c of this.cars) {
      if (c.lane.road !== e.road) continue;
      const d = (e.coord - c.s) * c.lane.dir;        // distance to the crossing ahead of the car (m)
      if (d > -8 && d < 45) clear = false;
      if (d > -2.5 && d < 4.5) canGo = false;                                     // on / at the crossing
      else if (d > 0 && d < 40 && c.v > 1.5 && d < (c.v * c.v) / (2 * 3.5) + 5) canGo = false;   // too close to stop
    }
    return { canGo, clear };
  }
  /** The lab's test: the nearest car on street B's southbound lane speeds (54 km/h) through the junction for 12 s. */
  speeder(t) {
    const lane = this.lanes[2];
    const c = this.cars.filter((x) => x.lane === lane).sort((a, b) => Math.abs(a.s + 60) - Math.abs(b.s + 60))[0];
    c.vMax0 = c.vMax; c.vMax = 15; c.reckless = t + 12; c.s = -60; c.v = 14;
    return c;
  }
  /** Calm step back (the owner's default): people waiting at a kerb step 0.5 m back while a car passes within 2 m of
   *  the kerb line, then return. */
  stepBack(t) {
    for (const p of this.sim.people) {
      if (!p.alive || !p.kerb || !p.spot) continue;
      const e = p.kerb.e, L = e.road === "A" ? (x, z) => [x, z] : (x, z) => [z, x];
      const [pa, pl] = L(p.x, p.z);                        // along the road, across it
      let close = false;
      for (const c of this.cars) {
        if (c.lane.road !== e.road) continue;
        const d = (pa - c.s) * c.lane.dir;
        if (d > -4 && d < 10 + c.v && Math.abs(pl - c.lane.off) < 3.6) { close = true; break; }
      }
      const back = close && Math.abs(pl) < 4.4;              // standing within ~0.9 m of the kerb edge (3.5 m)
      if (back && !p.backed) { p.backed = 1; p.spot = { x: p.spot.x - e.ux * p.kerb.into * 0.5, z: p.spot.z - e.uz * p.kerb.into * 0.5 }; }
      else if (!close && p.backed) { p.backed = 0; p.spot = { x: p.spot.x + e.ux * p.kerb.into * 0.5, z: p.spot.z + e.uz * p.kerb.into * 0.5 }; }
    }
  }
  step(dt, t) {
    this.stepBack(t);
    const sim = this.sim;
    // who is on / waiting at each crossing (cars must not enter an occupied one)
    for (const c of this.cars) {
      const L2 = c.lane;
      let limit = Infinity;
      // signal stop line (10.5 m from the junction centre, approach side)
      const stopAt = -10.5 * L2.dir;
      const dStop = (stopAt - c.s) * L2.dir;
      const sig = SIGNAL.car(L2.road, t);
      if (dStop > 0 && (sig === "red" || (sig === "amber" && dStop > (c.v * c.v) / (2 * 3.5) + 1))) limit = Math.min(limit, dStop - 1);
      // pedestrians on a crossing of this road ahead, or waiting at a zebra
      for (const p of sim.people) {
        if (!p.alive) continue;
        const e = p.onCrossing || (p.kerb && p.kerb.e.kind === "zebra" ? p.kerb.e : null);
        if (!e || e.road !== L2.road) continue;
        // stop with the front bumper 1.5 m before the crossing's near edge (car half length 2.1 m)
        const d = (e.coord - c.s) * L2.dir - (e.width / 2 + 2.1 + 1.5);
        if (d > -3 && d < 50) limit = Math.min(limit, Math.max(0, d));
      }
      // a reckless car (the lab's "speeding car" test): runs the red at its speed; people in its way dive (at speed
      // only: the owner's default), the rest of the time drivers stop
      if (c.reckless && t < c.reckless) {
        limit = Infinity;
        for (const p of sim.people) {
          if (!p.alive || !p.onCrossing || p.onCrossing.road !== L2.road || p.dive) continue;
          const along = (L2.axis === "x" ? p.x : p.z) - c.s, lat = (L2.axis === "x" ? p.z : p.x) - L2.off;
          const ahead = along * L2.dir;
          if (ahead > 0 && ahead < c.v * 1.2 + 3 && Math.abs(lat) < 1.6 && c.v > 5.5) {
            const away = Math.sign(lat || 1);
            sim.startDive(p, L2.axis === "x" ? 0 : away, L2.axis === "x" ? away : 0);
          }
        }
      } else if (c.reckless) { c.reckless = 0; c.vMax = c.vMax0; }
      // the car ahead
      for (const o of this.cars) if (o !== c && o.lane === L2) { const d = (o.s - c.s) * L2.dir; if (d > 0 && d < 60) limit = Math.min(limit, d - 6.5); }
      if (c.reckless) for (const o of this.cars) if (o !== c && o.lane === L2) { const d = (o.s - c.s) * L2.dir; if (d > 0 && d < 60) limit = Math.min(limit, d - 6.5); }
      const vWant = limit < Infinity ? Math.max(0, Math.min(c.vMax, Math.sqrt(Math.max(0, 2 * 3 * limit)))) : c.vMax;
      c.v += Math.max(-6 * dt, Math.min(2 * dt, vWant - c.v));
      c.s += c.v * dt * L2.dir;
      if (c.s * L2.dir > L + 5) c.s = -(L + 5) * L2.dir;          // round again (at the world's ends, 150 m out)
    }
    let k = 0;
    for (const c of this.cars) {
      const L2 = c.lane;
      const x = L2.axis === "x" ? c.s : L2.off, z = L2.axis === "x" ? L2.off : c.s;
      const yaw = L2.axis === "x" ? (L2.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (L2.dir > 0 ? 0 : Math.PI);
      this.q.setFromEuler(this.e.set(0, yaw, 0));
      this.m.compose(new THREE.Vector3(x, slope(x), z), this.q, new THREE.Vector3(1, 1, 1));
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Signal posts at the junction: car heads (red / amber / green) and pedestrian heads (red / green), lit by the clock. */
export class SignalPosts {
  constructor(scene) {
    this.u = { aR: uniform(0), aA: uniform(0), aG: uniform(0), bR: uniform(0), bA: uniform(0), bG: uniform(0), pAR: uniform(0), pAG: uniform(0), pBR: uniform(0), pBG: uniform(0) };
    const g = new THREE.Group();
    const pole = new THREE.MeshStandardNodeMaterial({ color: 0x2f3338, roughness: 0.5, metalness: 0.5 });
    const lamp = (u, c) => { const m = new THREE.MeshStandardNodeMaterial({ color: 0x111111, roughness: 0.3 }); m.emissiveNode = color(c).mul(u.mul(4)); return m; };
    const head = (x, z, yaw, road, ped) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.2, 10), pole); p.position.set(x, ground(x, z) + 1.6, z); g.add(p);
      const lights = ped ? [["R", 0xff2a1a], ["G", 0x29ff6a]] : [["R", 0xff2a1a], ["A", 0xffa21a], ["G", 0x29ff6a]];
      lights.forEach(([k, c], i) => {
        const u = ped ? this.u[`p${road}${k}`] : this.u[`${road.toLowerCase()}${k}`];
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), lamp(u, c));
        const h = ped ? 2.2 - i * 0.24 : 3.0 - i * 0.24;
        s.position.set(x + Math.sin(yaw) * 0.12, ground(x, z) + h, z + Math.cos(yaw) * 0.12); g.add(s);
      });
    };
    // car heads face the approaching cars; ped heads face across the crossing
    head(-10.5, -3.9, -Math.PI / 2, "A", false); head(10.5, 3.9, Math.PI / 2, "A", false);
    head(3.9, -10.5, Math.PI, "B", false); head(-3.9, 10.5, 0, "B", false);
    for (const sx of [-1, 1]) { head(sx * 9.4, -3.9, 0, "A", true); head(sx * 9.4, 3.9, Math.PI, "A", true); }
    for (const sz of [-1, 1]) { head(-3.9, sz * 9.4, Math.PI / 2, "B", true); head(3.9, sz * 9.4, -Math.PI / 2, "B", true); }
    scene.add(g);
  }
  update(t) {
    const u = this.u, blink = Math.floor(t * 2) % 2;
    for (const r of ["A", "B"]) { const s = SIGNAL.car(r, t), k = r.toLowerCase(); u[`${k}R`].value = +(s === "red"); u[`${k}A`].value = +(s === "amber"); u[`${k}G`].value = +(s === "green"); }
    for (const r of ["A", "B"]) { const s = SIGNAL.walk(r, t); u[`p${r}G`].value = s === "walk" ? 1 : s === "flash" ? blink : 0; u[`p${r}R`].value = +(s === "red"); }
  }
}

/** The scripted tram: from the south every 120 s, stops at the platform 20 s (doors), leaves south again. */
export class Tram {
  constructor(scene, doors) {
    this.doors = doors; this.docked = false;
    const geo = mergeGeometries([new THREE.BoxGeometry(2.65, 3.1, 32).translate(0, 1.85, 0), new THREE.BoxGeometry(2.4, 0.3, 30).translate(0, 3.55, 0)]);
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.4 });
    m.colorNode = mix(color(0xe8e4dc), color(0x2a2f36), step(1.4, positionWorld.y).mul(step(positionWorld.y, 2.6)));
    this.mesh = new THREE.Mesh(geo, m); this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.position.set(TRAM.x, 0.05, 400);
    scene.add(this.mesh);
    this.lastDock = -1;
  }
  /** t: the lab clock. onArrive(): alighting. Returns the state. */
  step(t, onArrive) {
    const u = ((t % 120) + 120) % 120, stopZ = 53;
    let z;
    if (u < 14) { const k = u / 14; z = stopZ + 160 * (1 - k) * (1 - k); }      // decelerating in
    else if (u < 34) z = stopZ;
    else if (u < 50) { const k = (u - 34) / 16; z = stopZ + 160 * k * k; }
    else z = 400;
    this.mesh.position.z = z;
    this.mesh.visible = z < 300;
    const docked = u >= 15 && u < 33;
    if (docked && !this.docked) onArrive?.();
    this.docked = docked;
    return { z, docked };
  }
}
