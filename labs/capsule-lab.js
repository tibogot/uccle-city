// THE CAPSULE LAB: the third-person character (viewer/character/: kinematic capsule controller, spring-arm camera
// with collision, the character slot) on a test course, under the city's own lighting (viewer/lighting.js) and post
// chain (viewer/post.js), with a reversed depth buffer and a 0.1 m near plane like the city.
//
// The course feeds the controller the three kinds of collider the city and the interiors will:
//   triangle meshes (TriBVH)   kerbs, stairs, ramps, walls, a corridor and a 0.9 m door, gaps, low ceilings, blocks,
//                              a thin wall, a small two-room house with a threshold, stairs and an upper floor
//   footprint prisms           an L-shaped "UrbIS" building with a courtyard, a low wall, tree trunks
//   a heightfield              the ground: flat round the course, a gentle hill and a too-steep mound
// Every surface is real geometry (no coplanar overlaps: pieces abut, nothing rests exactly on the ground; things that
// stand on it go 2 cm into it). A 1 m world grid on every material makes the motion easy to judge.
//
// URL: ?time=golden|midday|overcast|twilight|night  ?hz=120  ?debug=1  ?st=<station>  ?char=hoodie|casual|capsule
// (the character in the slot, models/characters/, with foot IK; ?ik=0 off)  ?model=<glb url> (any other animated
// character in the slot; ?clips=idle:Idle,walk:Walk,run:Run,jump:Jump  ?mwalk=1.6&mrun=5 authored speeds)
import * as THREE from "three/webgpu";
import { color, float, mix, positionWorld, normalWorld, fract, fwidth, smoothstep, abs, max, min, vec3 } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { ThirdPerson, CollisionWorld, Heightfield, TriBVH, PrismSet, CHARACTERS } from "../viewer/character/index.js";
import { FOOT_IK } from "../viewer/character/footIK.js";
import { MODELS as FURNITURE } from "../viewer/furniture.js";
import { CONTROLLER_DEFAULTS } from "../viewer/character/controller.js";
import { CAMERA_DEFAULTS } from "../viewer/character/camera.js";
import { FootProbe } from "./footProbe.js";
import { stripSession, FootTraces, poseRun } from "./frameStrip.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $notes = document.getElementById("notes");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
renderer.domElement.tabIndex = 0;
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ materials
const Y0 = 70;                          // the course sits at Place de Saint-Job's height (m TAW) so the haze matches
/** A plain PBR material with a faint 1 m world grid (lines on the two axes along each face). */
function protoMat(hex, { rough = 0.85, metal = 0, grid = 0.22, lineHex = 0x1b1e22 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: rough, metalness: metal });
  const p = positionWorld, n = abs(normalWorld);
  const line = (v) => { const f = fract(v); const d = min(f, f.oneMinus()); return float(1).sub(smoothstep(float(0), fwidth(v).mul(1.2), d)); };
  const minor = (v) => { const f = fract(v.mul(4)); const d = min(f, f.oneMinus()); return float(1).sub(smoothstep(float(0), fwidth(v.mul(4)).mul(1.0), d)).mul(0.35); };
  const g = max(max(line(p.x).mul(n.x.oneMinus()), line(p.y).mul(n.y.oneMinus())), line(p.z).mul(n.z.oneMinus()));
  const g2 = max(max(minor(p.x).mul(n.x.oneMinus()), minor(p.y).mul(n.y.oneMinus())), minor(p.z).mul(n.z.oneMinus()));
  m.colorNode = mix(color(hex), color(lineHex), max(g, g2).mul(grid));
  return m;
}
const M = {
  ground: protoMat(0x7d8a6a, { grid: 0.25 }),
  asphalt: protoMat(0x3f4246, { grid: 0.18, lineHex: 0x6a6e73 }),
  stone: protoMat(0xa9a59b, { grid: 0.3 }),
  concrete: protoMat(0x9a9894, { grid: 0.3 }),
  brick: protoMat(0x9a5a44, { grid: 0.25 }),
  plaster: protoMat(0xe4ddcf, { grid: 0.18, rough: 0.9 }),
  wood: protoMat(0x8a6342, { grid: 0.2, rough: 0.6 }),
  accent: protoMat(0x5d7fa3, { grid: 0.3, rough: 0.5 }),
  warn: protoMat(0xc9a13b, { grid: 0.3, rough: 0.6 }),
  bark: protoMat(0x4a3a2c, { grid: 0.0 }),
};

// ------------------------------------------------------------------------------------------------ ground (heightfield)
// flat round the course; a gentle hill (max ~17°) and a steep mound (max ~55°, above the 50° slope limit)
const bump = (x, z, cx, cz, h, s) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
const groundH = (x, z) => Y0 + bump(x, z, -55, -30, 5, 10) + bump(x, z, -52, 22, 7, 3);
{
  const S = 180, N = 360, g = new THREE.PlaneGeometry(S, S, N, N).rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) P.setY(i, groundH(P.getX(i), P.getZ(i)));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.ground); m.receiveShadow = true; m.name = "ground"; scene.add(m);
}

// ------------------------------------------------------------------------------------------------ the course (meshes)
const course = new THREE.Group(); course.name = "course"; scene.add(course);
const colliders = [];                    // meshes that go into the BVH
function add(geo, mat, x, y, z, rotY = 0, collide = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.y = rotY;
  m.castShadow = m.receiveShadow = true;
  course.add(m);
  if (collide) colliders.push(m);
  return m;
}
/** An axis-aligned box from (x0, y0, z0) to (x1, y1, z1), heights relative to Y0. */
function box(x0, y0, z0, x1, y1, z1, mat) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  return add(g, mat, (x0 + x1) / 2, Y0 + (y0 + y1) / 2, (z0 + z1) / 2);
}
/** Stairs as one clean solid (an extruded stair profile): n steps of rise x tread, `width` wide, climbing along +u. */
function stairsGeo(n, rise, tread, width, base = -0.02) {
  const s = new THREE.Shape();
  s.moveTo(0, base);
  for (let i = 0; i < n; i++) { s.lineTo(i * tread, (i + 1) * rise); s.lineTo((i + 1) * tread, (i + 1) * rise); }
  s.lineTo(n * tread, base); s.lineTo(0, base);
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -width / 2);
  return g;                              // u = +x, up = +y, centred on z
}
/** A ramp solid: rises `deg` over `len` along +x, `width` wide, then a flat top of `top` m. */
function rampGeo(deg, len, width, top = 2) {
  const h = Math.tan(deg * Math.PI / 180) * len, s = new THREE.Shape();
  s.moveTo(0, -0.02); s.lineTo(0, 0.0); s.lineTo(len, h); s.lineTo(len + top, h); s.lineTo(len + top, -0.02); s.lineTo(0, -0.02);
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
  g.translate(0, 0, -width / 2);
  return g;
}
const labels = [];
const label = (text, x, y, z) => { const el = document.createElement("div"); el.className = "tag"; el.textContent = text; document.body.append(el); labels.push({ el, p: new THREE.Vector3(x, Y0 + y, z) }); };

// A. the street: south sidewalk 15 cm, the road, north sidewalk 14 cm (the city's kerbs), a dropped kerb (ramp)
box(-30, -0.05, -6, 30, 0.15, -3, M.stone);           // south sidewalk (z -6..-3)
box(-30, -0.05, -12, 30, 0.01, -6, M.asphalt);        // carriageway: 1 cm proud of the ground (never coplanar with it)
box(-30, -0.05, -16, 6, 0.14, -12, M.stone);          // north sidewalk
box(9, -0.05, -16, 30, 0.14, -12, M.stone);
add(rampGeo(Math.atan(0.14 / 1.2) * 180 / Math.PI, 1.2, 3, 2.8).rotateY(Math.PI / 2), M.concrete, 7.5, Y0, -12 + 0.0);   // dropped kerb x 6..9
label("A · kerbs 15 / 14 cm, dropped kerb", 0, 0.6, -9);
// the city's bus shelter (viewer/furniture.js) on the north sidewalk, open side to the road: walk in under its roof
{
  const g = FURNITURE.shelter();
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.2 });
  if (g.attributes.aCol) { const { attribute } = await import("three/tsl"); mat.colorNode = attribute("aCol", "vec3"); }
  add(g, mat, 20, Y0 + 0.14, -14.0, Math.PI);
  label("A · bus shelter (open front)", 20, 2.9, -14);
}

// B. stairs: up 10 x 17 cm (tread 29 cm), a 1.7 m landing, down 8 x 21.25 cm (tread 27 cm)
add(stairsGeo(10, 0.17, 0.29, 2), M.concrete, 8, Y0, 3);
box(10.9, -0.02, 2, 14.9, 1.7, 4, M.concrete);
add(stairsGeo(8, 0.2125, 0.27, 2), M.concrete, 14.9 + 8 * 0.27, Y0, 3, Math.PI);
label("B · stairs 17 / 21 cm", 12.9, 2.4, 3);

// C. ramps: 15°, 30°, 45° (walkable, limit 50°), 55° (not)
[15, 30, 45, 55].forEach((deg, i) => {
  const z = 8 + i * 3;
  add(rampGeo(deg, deg > 40 ? 2 : 4, 2, 2), deg > 50 ? M.warn : M.accent, 8, Y0, z);
  label(`C · ramp ${deg}°`, 9, 0.5, z);
});

// I. stair flights of three riser heights, each UP then a 2 m landing then DOWN (the same flight): 12 cm (tread 32),
// 15 cm (tread 30), 19 cm (tread 27); 6 steps each way, 1.6 m wide, along +x from x = 22
const FLIGHTS = [[0.12, 0.32, 4], [0.15, 0.30, 8], [0.19, 0.27, 12]];
for (const [r, t, z] of FLIGHTS) {
  const n = 6, X0 = 22, top = n * r;
  add(stairsGeo(n, r, t, 1.6), M.concrete, X0, Y0, z);
  box(X0 + n * t, -0.02, z - 0.8, X0 + n * t + 2, top, z + 0.8, M.stone);
  add(stairsGeo(n, r, t, 1.6), M.concrete, X0 + 2 * n * t + 2, Y0, z, Math.PI);
  label(`I · stairs ${Math.round(r * 100)} cm / ${Math.round(t * 100)} cm, up + down`, X0 + n * t + 1, top + 0.7, z);
}

// D. walls: a 1.2 m corridor with a 0.9 m door in a cross wall; a wall with a 0.5 m (blocked) and a 0.65 m gap; an acute corner
box(-14.8, -0.02, 4, -14.6, 2.5, 16, M.plaster);       // corridor west wall
box(-13.4, -0.02, 4, -13.2, 2.5, 16, M.plaster);       // corridor east wall (1.2 m between)
box(-14.6, -0.02, 9.9, -14.45, 2.5, 10.1, M.wood);     // door frame in the corridor: 0.9 m opening, 2.05 m high
box(-13.55, -0.02, 9.9, -13.4, 2.5, 10.1, M.wood);
box(-14.45, 2.05, 9.9, -13.55, 2.5, 10.1, M.wood);
label("D · corridor 1.2 m, door 0.9 m", -14, 2.8, 10);
box(-19.1, -0.02, 2, -18.9, 2.2, 7.75, M.brick);       // gap wall at x = -19: 0.5 m gap at z 7.75..8.25
box(-19.1, -0.02, 8.25, -18.9, 2.2, 13.675, M.brick);  // 0.65 m gap at z 13.675..14.325
box(-19.1, -0.02, 14.325, -18.9, 2.2, 20, M.brick);
label("D · gap 0.5 m (blocked)", -19, 2.5, 8); label("D · gap 0.65 m", -19, 2.5, 14);
{ // an acute corner (30°): two thin walls meeting
  const a = add(new THREE.BoxGeometry(0.2, 2.2, 6), M.brick, -8, Y0 + 1.08, 17); a.rotation.y = 0;
  const b = add(new THREE.BoxGeometry(0.2, 2.2, 6), M.brick, -8 + Math.sin(Math.PI / 6) * 3 + 0.05, Y0 + 1.08, 14 + Math.cos(Math.PI / 6) * 3); b.rotation.y = Math.PI / 6;
  label("D · 30° corner", -7, 2.5, 15);
}

// E. low ceilings: tunnels 1.4 m wide, 1.60 m (blocked: the capsule is 1.75), 1.90 m and 2.20 m high
[1.6, 1.9, 2.2].forEach((h, i) => {
  const x0 = -31 - i * 3;
  box(x0 - 0.2, -0.02, 4, x0, h + 0.25, 10, M.concrete);
  box(x0 + 1.4, -0.02, 4, x0 + 1.6, h + 0.25, 10, M.concrete);
  box(x0, h, 4, x0 + 1.4, h + 0.25, 10, h < 1.75 ? M.warn : M.concrete);
  label(`E · ceiling ${h.toFixed(2)} m`, x0 + 0.7, h + 0.6, 4);
});

// F. blocks: 0.35 m (too high to step, jump), 0.6 m (jump), 1.2 m (too high to jump: the 0.9 m jump + the rounded
// bottom rolling over an edge up to the step height reaches ~1.15 m), a 5 cm thin wall (run at it)
box(-4, -0.02, 22, -2.5, 0.35, 23.5, M.wood); label("F · 35 cm", -3.25, 0.7, 22.75);
box(-1, -0.02, 22, 0.5, 0.6, 23.5, M.wood); label("F · 60 cm", -0.25, 0.95, 22.75);
box(2, -0.02, 22, 3.5, 1.2, 23.5, M.wood); label("F · 1.2 m", 2.75, 1.55, 22.75);
box(-3, -0.02, 27, 3, 2.4, 27.05, M.accent); label("F · 5 cm wall", 0, 2.7, 27);
box(5, -0.02, 22, 6.5, 1.0, 23.5, M.wood); label("F · 1.0 m (jump fails)", 5.75, 1.35, 22.75);

// G. a small two-room house: 8 x 6 m outside, 20 cm walls, a 12 cm floor (a threshold step), a 0.9 m door, an inner
// wall with a door, a window, stairs (15 x 18 cm) up to the upper floor (a slab with the stair hole), a parapet
const HX0 = -22, HZ0 = 24, HX1 = -14, HZ1 = 30, T = 0.2, FL = 0.12, CEIL = 2.7, SLAB = 0.2;
const top = CEIL + SLAB;
// outer walls (north wall in three pieces round the door at x -19.4..-18.5; east wall with a window)
box(HX0, -0.02, HZ0, -19.4, top, HZ0 + T, M.plaster); box(-18.5, -0.02, HZ0, HX1, top, HZ0 + T, M.plaster); box(-19.4, 2.1, HZ0, -18.5, top, HZ0 + T, M.plaster);
box(HX0, -0.02, HZ1 - T, HX1, top, HZ1, M.plaster);
box(HX0, -0.02, HZ0 + T, HX0 + T, top, HZ1 - T, M.plaster);
box(HX1 - T, -0.02, HZ0 + T, HX1, top, 26, M.plaster); box(HX1 - T, -0.02, 27.4, HX1, top, HZ1 - T, M.plaster);
box(HX1 - T, -0.02, 26, HX1, 0.9, 27.4, M.plaster); box(HX1 - T, 2.1, 26, HX1, top, 27.4, M.plaster);    // window 0.9..2.1
box(HX0 + T, -0.02, HZ0 + T, HX1 - T, FL, HZ1 - T, M.wood);                                                // the floor
// inner wall at x = -16.8 with a door z 27.6..28.5 (two rooms)
box(-16.9, FL, HZ0 + T, -16.7, CEIL, 27.6, M.plaster); box(-16.9, FL, 28.5, -16.7, CEIL, HZ1 - T, M.plaster); box(-16.9, 2.1, 27.6, -16.7, CEIL, 28.5, M.plaster);
// stairs along the south wall of the west room: x -21.0 -> -17.36 (15 risers of 18.5 cm, 26 cm treads), 0.9 m wide
const SR = 15, RISE = (top - FL) / SR, TR = 0.26, STX = -21.0;
add(stairsGeo(SR - 1, RISE, TR, 0.9), M.wood, STX, Y0 + FL, HZ1 - T - 0.45);
// ceiling / upper floor slab with the stair hole (x STX .. STX + 14 * TR, z 28.9..29.8)
const HOLE0 = STX, HOLE1 = STX + (SR - 1) * TR;
box(HX0 + T, CEIL, HZ0 + T, HX1 - T, top, 28.9, M.concrete);
box(HOLE1, CEIL, 28.9, HX1 - T, top, HZ1 - T, M.concrete);
box(HX0 + T, CEIL, 28.9, HOLE0, top, HZ1 - T, M.concrete);
// the roof terrace's parapet (1 m) on top of the walls
box(HX0, top, HZ0, HX1, top + 1, HZ0 + T, M.plaster); box(HX0, top, HZ1 - T, HX1, top + 1, HZ1, M.plaster);
box(HX0, top, HZ0 + T, HX0 + T, top + 1, HZ1 - T, M.plaster); box(HX1 - T, top, HZ0 + T, HX1, top + 1, HZ1 - T, M.plaster);
label("G · house: threshold 12 cm, door 0.9 m, stairs 18 cm, ceiling 2.7 m", -18, top + 1.5, HZ0);
// a warm light inside so it reads as a room
{ const l = new THREE.PointLight(0xffd2a0, 6, 9, 2); l.position.set(-19.5, Y0 + 2.3, 27); scene.add(l); }

// H. footprint prisms (the city's UrbIS buildings): an L-shaped block with a courtyard, a 0.8 m low wall, trunks
const PX = 14, PZ = 26;
const lshape = [[PX, PZ], [PX + 20, PZ], [PX + 20, PZ + 8], [PX + 8, PZ + 8], [PX + 8, PZ + 20], [PX, PZ + 20]];
const court = [[PX + 2, PZ + 2], [PX + 6, PZ + 2], [PX + 6, PZ + 6], [PX + 2, PZ + 6]].reverse();
const prismPolys = [
  { rings: [lshape, court], base: Y0 - 1, top: Y0 + 9, id: "L-block" },
  { rings: [[[PX + 10, PZ + 12], [PX + 22, PZ + 12], [PX + 22, PZ + 12.3], [PX + 10, PZ + 12.3]]], base: Y0 - 1, top: Y0 + 0.8, id: "low wall" },
];
const prismCircles = [{ x: PX + 14, z: PZ + 17, r: 0.25, base: Y0 - 1, top: Y0 + 8 }, { x: PX + 18, z: PZ + 19, r: 0.3, base: Y0 - 1, top: Y0 + 8 }];
for (const p of prismPolys) {
  const sh = new THREE.Shape(p.rings[0].map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of p.rings.slice(1)) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: p.top - p.base, bevelEnabled: false }).rotateX(-Math.PI / 2);
  add(g, p.id === "L-block" ? M.brick : M.stone, 0, p.base, 0, 0, false);      // drawn only: it collides as a prism
}
for (const c of prismCircles) add(new THREE.CylinderGeometry(c.r, c.r * 1.15, c.top - c.base, 16).translate(0, (c.top - c.base) / 2, 0), M.bark, c.x, c.base, c.z, 0, false);
label("H · footprint prisms: building, courtyard, 0.8 m wall, trunks", PX + 10, 10, PZ);
label("hill (heightfield, ~17°)", -55, 6, -30); label("mound (~55°: too steep)", -52, 8, 22);

// ------------------------------------------------------------------------------------------------ the collision world
const world = new CollisionWorld();
const tBuild = performance.now();
course.updateMatrixWorld(true);
const triBVH = new TriBVH(meshPositions(colliders));
const prisms = new PrismSet(prismPolys, prismCircles);
const terrain = new Heightfield(groundH);
world.add(triBVH); world.add(prisms); world.add(terrain);
const buildMs = performance.now() - tBuild;
/** World-space triangle positions of the given meshes, in one Float32Array. */
function meshPositions(meshes) {
  let n = 0;
  for (const m of meshes) n += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
  const out = new Float32Array(n * 3), v = new THREE.Vector3();
  let o = 0;
  for (const m of meshes) {
    const P = m.geometry.attributes.position, I = m.geometry.index;
    const cnt = I ? I.count : P.count;
    for (let k = 0; k < cnt; k++) { v.fromBufferAttribute(P, I ? I.getX(k) : k).applyMatrix4(m.matrixWorld); out[o++] = v.x; out[o++] = v.y; out[o++] = v.z; }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the character
const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world, hz: +(qp.get("hz") || 120) });
// [x, z, facing (0 = +z, south), ray start above Y0 (default 1.6 m)]: the spawn height is found with a ray down
const STATIONS = {
  "0 start": [0, 1, Math.PI], "1 kerbs": [0, -1, Math.PI], "bus shelter": [21.2, -11.5, Math.PI], "2 stairs": [5, 3, Math.PI / 2], "3 ramps": [5, 12.5, Math.PI / 2],
  "4 corridor + door": [-14, 1, 0], "5 gaps": [-21.5, 11, Math.PI / 2], "6 low ceilings": [-33.3, 1, 0],
  "7 blocks + thin wall": [0, 19, 0], "8 house": [-18.95, 21.5, 0], "9 prisms": [10, 30, Math.PI / 2],
  "house stairs": [-21.4, 29.35, Math.PI / 2], "upstairs": [-17, 25.5, Math.PI / 2, 4.6], "hill": [-45, -30, -Math.PI / 2], "mound": [-44, 22, -Math.PI / 2],
};
function goStation(name) {
  const [x, z, yaw = 0, from = 1.6] = STATIONS[name] || STATIONS["0 start"];
  const t = world.ray(x, Y0 + from, z, 0, -1, 0, from + 20);
  tp.start(x, Math.max(t < Infinity ? Y0 + from - t : -Infinity, groundH(x, z)) + 0.05, z, yaw);
}
tp.debug.visible = qp.get("debug") === "1";

// optional: an animated character in the slot (?model=url), to check setModel (not shipped)
if (qp.get("model")) {
  (async () => {
    try {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader().loadAsync(qp.get("model"));
      const clips = Object.fromEntries((qp.get("clips") || "").split(",").filter(Boolean).map((kv) => kv.split(":")));
      const found = tp.body.setModel(gltf, { clips, height: 1.75, walkSpeed: +(qp.get("mwalk") || 1.6), runSpeed: +(qp.get("mrun") || 5), forward: qp.get("mfwd") || "+z" });
      console.log("[capsule lab] model clips:", found, "all:", gltf.animations.map((a) => a.name));
      S.model = Object.keys(found).length ? Object.entries(found).map(([k, v]) => `${k}=${v}`).join(" ") : "no clips matched";
    } catch (e) { console.warn("model:", e); S.model = "failed: " + e.message; }
  })();
}

// ------------------------------------------------------------------------------------------------ the foot audit
// scripted walks over each surface (labs/footProbe.js): [x, z, yaw] start (height found with a ray), direction,
// seconds, run. Measured at simulated 30 / 60 / 144 fps, or played live with the foot cameras.
const probe = new FootProbe(tp, world);
const traces = new FootTraces(scene);
const at = (x, z, yaw = 0, from = 3) => { const t = world.ray(x, Y0 + from, z, 0, -1, 0, from + 20); return [x, Math.max(t < Infinity ? Y0 + from - t : -Infinity, groundH(x, z)) + 0.02, z, yaw]; };
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI;      // facing +x, -x, -z
const SCEN = {
  "stand": { start: at(-3, 1), dir: [0, 0], secs: 6 },
  "flat walk": { start: at(-3, 1), dir: [0, 1], secs: 5 },
  "flat run": { start: at(-3, 1), dir: [0, 1], secs: 4, run: true },
  "kerb up 15 cm": { start: at(0, -1, N), dir: [0, -1], secs: 2.5 },
  "kerb down 15 + up 14": { start: at(0, -4.2, N), dir: [0, -1], secs: 6 },
  "kerbs at run": { start: at(0, -1, N), dir: [0, -1], secs: 3.5, run: true },
  "dropped kerb": { start: at(7.5, -4, N), dir: [0, -1], secs: 6 },
  "stairs up 17 walk": { start: at(6.5, 3, E), dir: [1, 0], secs: 4 },
  "stairs up 17 run": { start: at(6.5, 3, E), dir: [1, 0], secs: 2.2, run: true },
  "stairs down 21 walk": { start: at(12.5, 3, E), dir: [1, 0], secs: 4.5 },
  "stairs down 21 run": { start: at(12.5, 3, E), dir: [1, 0], secs: 2.4, run: true },
  ...Object.fromEntries(FLIGHTS.flatMap(([r, t, z]) => {
    const cm = Math.round(r * 100), n = 6, X0 = 22, len = 2 * n * t + 2;
    return [[`stairs ${cm} up+down walk`, { start: at(X0 - 1.6, z, E), dir: [1, 0], secs: 11, riser: r }],
      [`stairs ${cm} up+down run`, { start: at(X0 - 2.5, z, E), dir: [1, 0], secs: 4.2, run: true, riser: r }],
      [`stairs ${cm} down walk`, { start: at(X0 + n * t + 1.2, z, E, 2), dir: [1, 0], secs: 6.5, riser: r }]];
  })),
  "ramp 15 up": { start: at(6, 8, E), dir: [1, 0], secs: 4.5 },
  "ramp 15 down": { start: at(13.5, 8, W), dir: [-1, 0], secs: 4.5 },
  "ramp 30 up": { start: at(6, 11, E), dir: [1, 0], secs: 4.5 },
  "ramp 30 down": { start: at(13.5, 11, W), dir: [-1, 0], secs: 4.5 },
  "ramp 45 up": { start: at(6, 14, E), dir: [1, 0], secs: 3.5 },
  "ramp 45 down": { start: at(11.5, 14, W), dir: [-1, 0], secs: 3.5 },
  "slope 55 (blocked)": { start: at(6, 17, E), dir: [1, 0], secs: 3 },
  "house stairs up": { start: at(-21.4, 29.35, E, 0.6), dir: [1, 0], secs: 6 },      // (the ray from below the upper floor)
  "house stairs down": { start: at(-16.5, 29.35, W, 4.6), dir: [-1, 0], secs: 6 },
  "turn on the spot": { start: at(-3, 1), dir: (t) => (t < 1.2 ? [0, -1] : [0, 0]), secs: 2 },
  "turn 90 walking": { start: at(-3, 1), dir: (t) => (t < 1.5 ? [0, 1] : [1, 0]), secs: 3 },
  "start / stop walk": { start: at(-3, 1), dir: (t) => (t < 1.5 ? [0, 1] : [0, 0]), secs: 3 },
  "start / stop run": { start: at(-3, 1), dir: (t) => (t < 1.5 ? [0, 1, true] : [0, 0]), secs: 3 },
  "jump in place": { start: at(-3, 1), dir: [0, 0], secs: 2, jumpAt: 0.2 },
  "running jump": { start: at(-3, 1), dir: [0, 1], secs: 3, run: true, jumpAt: 1 },
  "fall 1.5 m": { start: (() => { const s = at(-3, 1); s[1] += 1.5; return s; })(), dir: [0, 0], secs: 2, pre: 0 },
  "walk into wall": { start: at(-17, 8, E), dir: [1, 0], secs: 3 },
  "slide along wall": { start: at(-17, 8, E), dir: [0.9, 0.45], secs: 3 },
  "past a trunk": { start: at(PX + 14.2, PZ + 14), dir: [0, 1], secs: 3 },
};
const METRICS = [["slideMean", "slide m/s", 2], ["slideP95", "slide p95", 2], ["gapMeanCm", "|gap| cm", 1], ["gapP95Cm", "gap p95", 1], ["badPct", "gap>3cm %", 0], ["sinkCm", "sink cm", 1], ["floatCm", "float cm", 1], ["penCm", "pen cm", 1],
  ["kneeMin", "knee min°", 0], ["foldMax", "fold>clip°", 0], ["extMax", "ext max", 3], ["extOverPct", "ext>.97 %", 0], ["pitchDev", "pitch dev°", 0], ["extraLiftCm", "swing+lift", 1], ["heelToHipCm", "heel>hip cm", 1], ["offYCm", "off y cm", 1], ["kneeLockedPct", "knee straight %", 0], ["pelvisStdCm", "pelvis σ cm", 1], ["dipCm", "hip dip cm", 1], ["hipVmax", "hip v m/s", 2], ["ikJump", "IK jump m/s", 2]];
/** Measure every scenario (or the named ones) at each simulated fps; returns rows, prints a table. */
function audit(names = Object.keys(SCEN), fpsList = [30, 60, 144]) {
  if (!probe.feet) {                       // the sole points from the idle pose on flat ground
    goStation("0 start"); for (let i = 0; i < 40; i++) tp.update(1 / 60);
    if (!probe.setup()) return "no character with foot IK in the slot";
  }
  const rows = [];
  for (const name of names) for (const fps of fpsList) rows.push({ name, fps, ...probe.simulate(SCEN[name], fps) });
  goStation(S.station);
  const head = "surface".padEnd(22) + "fps " + METRICS.map((m) => m[1].padStart(10)).join("");
  const lines = rows.map((r) => r.name.padEnd(22) + String(r.fps).padStart(3) + " " + METRICS.map(([k, , d]) => r[k].toFixed(d).padStart(10)).join(""));
  $notes.style.display = "block"; $notes.textContent = "FOOT AUDIT\n" + head + "\n" + lines.join("\n");
  return { head, lines, rows };
}

// ------------------------------------------------------------------------------------------------ panel
const C = tp.ctl.p, K = tp.cam.p;
const S = {
  station: qp.get("st") && STATIONS[qp.get("st")] ? qp.get("st") : "0 start",
  hz: +(qp.get("hz") || 120), slowmo: +(qp.get("slow") || 1), pointerLock: false,
  radius: C.radius, height: C.height,
  debug: tp.debug.visible, dContacts: true, dRays: true, dCapsule: true,
  time: preset, hour: lighting.hour, post: qp.get("fx") !== "0",
  perf: "", ctlms: "", bench: "—", tests: "—", state: "", model: "capsule",
  char: CHARACTERS[qp.get("char")] || qp.get("char") === "capsule" ? qp.get("char") : "ybot", footIK: qp.get("ik") !== "0", ik: "",
};
async function setCharacter(name) {
  S.model = "loading…";
  try {
    const info = await tp.useCharacter(name, renderer);
    S.model = name === "capsule" ? "capsule" : `${info.label} · ${info.tris} tris · walk ${info.walk} / run ${info.run} m/s authored`;
    console.log("[capsule lab] character", info);
  } catch (e) { console.warn(e); S.model = "failed: " + e.message; }
}
const ui = new Panel({ title: "Character Lab" });
const fs = ui.addFolder("Stations");
fs.add(S, "station", Object.keys(STATIONS)).name("go to").onChange(goStation);
fs.add({ go: () => goStation(S.station) }, "go").name("reset here (R)");
fs.add(S, "state").name("state").listen();
const fch = ui.addFolder("Character");
fch.add(S, "char", ["capsule", ...Object.keys(CHARACTERS)]).name("in the slot").onChange(setCharacter);
fch.add(S, "model").name("model").listen();
fch.add(S, "footIK").name("foot IK").onChange((v) => { tp.body.ikOn = v; });
const ikp = (k) => () => { if (tp.body.footIK) tp.body.footIK.p[k] = FOOT_IK[k]; };
fch.add(FOOT_IK, "lock").name("foot lock (planted feet)").onChange(ikp("lock"));
fch.add(FOOT_IK, "reach", 0, 0.6, 0.01).name("IK reach (m)").onChange(ikp("reach"));
fch.add(FOOT_IK, "swingSmooth", 2, 60, 1).name("swing foot easing").onChange(ikp("swingSmooth"));
fch.add(FOOT_IK, "pelvisOmega", 4, 40, 1).name("pelvis spring").onChange(ikp("pelvisOmega"));
fch.add(FOOT_IK, "absorb", 0, 0.8, 0.01).name("landing absorb").onChange(ikp("absorb"));
fch.add(FOOT_IK, "maxTilt", 0, 45, 1).name("foot tilt max (°)").onChange(ikp("maxTilt"));
fch.add(S, "ik").name("IK").listen();
const fa = ui.addFolder("Foot audit");
S.cam = qp.get("cam") && ["follow", "feet side", "feet front", "feet top", "feet 3/4", "body side", "body 3/4"].includes(qp.get("cam")) ? qp.get("cam") : "follow";
S.scen = SCEN[qp.get("play")] ? qp.get("play") : "stairs up 17 walk"; S.loop = true;
probe.camMode = S.cam;
fa.add(S, "cam", ["follow", "feet side", "feet front", "feet top", "feet 3/4", "body side", "body 3/4"]).name("camera").onChange((v) => { probe.camMode = v; if (v === "follow") { camera.fov = 0; } });
fa.add(S, "scen", Object.keys(SCEN)).name("scripted walk");
fa.add(S, "loop").name("loop it");
fa.add({ go: () => { if (!probe.feet) probe.setup(); probe.play(SCEN[S.scen], S.loop); } }, "go").name("play (autopilot)");
fa.add({ go: () => { probe.stop(); goStation(S.station); } }, "go").name("stop");
fa.add({ go: () => audit() }, "go").name("measure all (30/60/144 fps)");
S.traces = qp.get("traces") === "1"; traces.visible = S.traces;
fa.add(S, "traces").name("foot traces (heel, toe)").onChange((v) => { if (!probe.feet) probe.setup(); traces.visible = v; });
const fst = ui.addFolder("Frame strip");
S.stripFps = "60"; S.stripFrames = 36; S.stripFrom = 1; S.stripCams = "feet side + body side";
fst.add(S, "stripFps", ["60", "120", "240"]).name("simulated fps (240 = 4x slow)");
fst.add(S, "stripFrom", 0, 8, 0.05).name("from (s)");
fst.add(S, "stripFrames", 8, 96, 1).name("frames");
fst.add(S, "stripCams", ["feet side", "feet 3/4", "body side", "feet side + body side", "feet 3/4 + body 3/4"]).name("cameras");
fst.add({ go: async () => {
  // (in the page the presented canvas is copied: best effort; the screenshot driver tools/characters/strip.mjs is exact)
  const s = lab.stripSession({ scen: S.scen, fps: +S.stripFps, from: S.stripFrom, frames: S.stripFrames, cams: S.stripCams.split(" + ") });
  while (s.next()) for (let ci = 0; ci < s.cams.length; ci++) {
    s.view(ci);
    const R = s.region(), dpr = renderer.domElement.width / renderer.domElement.getBoundingClientRect().width, c = document.createElement("canvas");
    c.width = s.W; c.height = s.H;
    c.getContext("2d").drawImage(renderer.domElement, R.x * dpr, R.y * dpr, R.width * dpr, R.height * dpr, 0, 0, s.W, s.H);
    await s.add(ci, c.toDataURL());
  }
  const r = s.finish(); goStation(S.station);
  let el = document.getElementById("strip");
  if (!el) { el = document.createElement("div"); el.id = "strip"; el.style.cssText = "position:fixed;inset:20px;z-index:5;overflow:auto;background:#111;border-radius:8px"; el.onclick = () => el.remove(); document.body.append(el); }
  el.innerHTML = `<img src="${r.url}" style="max-width:none"><pre style="color:#ddd;padding:8px">${r.flagged.length} flagged frames\n${r.flagged.join("\n")}</pre>`;
} }, "go").name("record (scripted walk above)");
const fm = ui.addFolder("Movement");
fm.add(C, "walkSpeed", 0.5, 4, 0.05).name("walk (m/s)");
fm.add(C, "runSpeed", 2, 10, 0.1).name("run (m/s)");
fm.add(C, "groundAccel", 4, 80, 1).name("ground accel");
fm.add(C, "groundDecel", 4, 80, 1).name("ground decel");
fm.add(C, "airAccel", 0, 20, 0.5).name("air accel");
fm.add(C, "jumpHeight", 0, 2, 0.05).name("jump height (m)");
fm.add(C, "gravity", 5, 40, 0.5).name("gravity");
fm.add(C, "turnRate", 2, 30, 0.5).name("turn rate");
const fc = ui.addFolder("Collision");
fc.add(C, "stepHeight", 0, 0.45, 0.01).name("step height (m)");
fc.add(C, "snapDistance", 0, 0.6, 0.01).name("ground snap (m)");
fc.add(C, "maxSlope", 10, 80, 1).name("slope limit (°)");
fc.add(C, "stepSmooth", 2, 60, 1).name("step smoothing");
fc.add(C, "iterations", 1, 8, 1).name("iterations");
fc.add(S, "radius", 0.15, 0.5, 0.01).name("capsule radius").onChange((v) => tp.setSize(v, S.height));
fc.add(S, "height", 0.8, 2.2, 0.01).name("capsule height").onChange((v) => tp.setSize(S.radius, v));
fc.add(S, "hz", [30, 60, 120, 240].map(String)).name("physics Hz").onChange((v) => tp.setHz(+v));
fc.add(S, "slowmo", 0.05, 1, 0.05).name("time scale");
const fk = ui.addFolder("Camera");
fk.add(K, "distance", 0.9, 9, 0.1).name("distance").onChange((v) => { tp.cam.zoom = v; });
fk.add(K, "shoulder", 0, 1, 0.01).name("shoulder offset");
fk.add(K, "pivotHeight", 0.8, 1.8, 0.01).name("pivot height");
fk.add(K, "followRate", 2, 80, 1).name("follow damping");
fk.add(K, "heightRate", 2, 60, 1).name("height damping");
fk.add(K, "zoomRate", 1, 30, 0.5).name("zoom damping");
fk.add(K, "releaseRate", 0.5, 20, 0.5).name("arm release");
fk.add(K, "probe", 0.02, 0.4, 0.01).name("probe size");
fk.add(K, "fov", 35, 90, 1).name("fov");
fk.add(K, "collide").name("camera collision");
fk.add(S, "pointerLock").name("pointer lock").onChange((v) => { tp.input.pointerLock = v; if (!v && document.pointerLockElement) document.exitPointerLock(); });
const fd = ui.addFolder("Debug");
fd.add(S, "debug").name("debug draw (G)").onChange((v) => { tp.debug.visible = v; }).listen();
fd.add(S, "dCapsule").name("capsule").onChange((v) => { tp.debug.show.capsule = v; });
fd.add(S, "dContacts").name("contacts + ground normal").onChange((v) => { tp.debug.show.contacts = v; });
fd.add(S, "dRays").name("camera rays").onChange((v) => { tp.debug.show.rays = v; });
fd.add({ go: () => runTests() }, "go").name("run the test suite (T)");
fd.add(S, "tests").name("tests").listen();
fd.add(S, "model").name("character").listen();
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.close();
const fp = ui.addFolder("Performance");
fp.add(S, "ctlms").name("character CPU").listen();
fp.add(S, "perf").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("benchmark: 20k steps (µs / step)");
fp.add(S, "bench").name("result").listen();

// ------------------------------------------------------------------------------------------------ render setup
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goStation(S.station);
tp.body.ikOn = S.footIK;
if (S.char !== "capsule" && !qp.get("model")) await setCharacter(S.char);
// a retargeted clip alone, in place, foot IK off (tools/characters/retarget.mjs output): ?preview=Jump_Land
if (tp.body._allClips) {
  S.preview = qp.get("preview") || "(state machine)";
  const fpv = ui.addFolder("Clip preview");
  fpv.add(S, "preview", ["(state machine)", ...tp.body._allClips.map((a) => a.name)]).name("play alone").onChange((v) => {
    const on = !v.startsWith("("); tp.body.setPreview(on ? v : null); tp.body.ikOn = on ? false : S.footIK;
  });
  if (S.preview !== "(state machine)") { tp.body.setPreview(S.preview); tp.body.ikOn = false; }
}
// compile both capsule variants (solid / fading) now, not at the first fade
for (const [mesh, ...mats] of tp.body.warmVariants()) for (const m of mats) { mesh.material = m; await renderer.compileAsync(scene, camera); }

tp.input.onKey = (code) => {
  if (code === "KeyG") { S.debug = !S.debug; tp.debug.visible = S.debug; }
  else if (code === "KeyR") goStation(S.station);
  else if (code === "KeyT") runTests();
  else if (/^Digit[0-9]$/.test(code)) { const k = Object.keys(STATIONS).find((n) => n.startsWith(code.slice(5) + " ")); if (k) { S.station = k; goStation(k); } }
};

// ------------------------------------------------------------------------------------------------ tests + benchmark
/** Scripted runs through the real course at the fixed step, synchronously (no rendering). */
function runTests() {
  const c = tp.ctl, dt = 1 / 120;
  const results = [];
  // the scripted runs are timed for the capsule's speeds (a character in the slot sets its own, index.js)
  const keep = [c.p.walkSpeed, c.p.runSpeed];
  c.p.walkSpeed = CONTROLLER_DEFAULTS.walkSpeed; c.p.runSpeed = CONTROLLER_DEFAULTS.runSpeed;
  const run = (name, start, dir, secs, check, { run: running = false, jumpAt = -1 } = {}) => {
    c.teleport(start[0], start[1], start[2], 0);
    c.input.x = dir[0]; c.input.z = dir[1]; c.input.run = running;
    let maxY = -Infinity, minY = Infinity, ys = [];
    for (let i = 0; i < secs * 120; i++) {
      if (i === jumpAt) c.input.jump = true;
      c.step(dt);
      maxY = Math.max(maxY, c.pos[1]); minY = Math.min(minY, c.pos[1]); ys.push(c.pos[1]);
    }
    c.input.x = c.input.z = 0; c.input.run = false;
    const r = { x: c.pos[0], y: c.pos[1] - Y0, z: c.pos[2], g: c.grounded, maxY: maxY - Y0, minY: minY - Y0, ys };
    const ok = check(r);
    results.push(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(34)} x ${r.x.toFixed(2)} y ${r.y.toFixed(2)} z ${r.z.toFixed(2)}`);
    return ok;
  };
  const g0 = (x, z) => groundH(x, z);
  run("stand still 2 s: no drift", [0, g0(0, 0) + 0.3, 0], [0, 0], 2, (r) => Math.abs(r.y) < 1e-6 && r.ys.slice(60).every((y) => Math.abs(y - r.ys[60]) < 1e-9));
  run("kerb up 15 cm (south sidewalk)", [0, Y0, -1], [0, -1], 1.5, (r) => r.z < -3.4 && r.z > -6 && Math.abs(r.y - 0.15) < 0.005);
  run("kerb down + across + up 14 cm", [0, Y0 + 0.2, -4], [0, -1], 5, (r) => r.z < -12.5 && Math.abs(r.y - 0.14) < 0.005);
  run("bus shelter: walk in under the roof", [21.2, Y0 + 0.2, -12.4], [0, -1], 2.5, (r) => r.z < -14.3 && r.z > -14.7 && Math.abs(r.y - 0.14) < 0.005);
  run("dropped kerb (ramp)", [7.5, Y0 + 0.2, -4], [0, -1], 5, (r) => r.z < -12.5 && Math.abs(r.y - 0.14) < 0.01);
  run("stairs up 17 cm, walk", [7, Y0, 3], [1, 0], 3, (r) => r.x > 11 && Math.abs(r.y - 1.7) < 0.005);
  run("stairs up 17 cm, run", [7, Y0, 3], [1, 0], 1, (r) => r.x > 11 && Math.abs(r.y - 1.7) < 0.005, { run: true });
  run("stairs down 21 cm (snap)", [12, Y0 + 1.75, 3], [1, 0], 3, (r) => r.x > 17.5 && Math.abs(r.y) < 0.005 && r.g);
  run("ramp 30° up", [6, Y0, 11], [1, 0], 4, (r) => r.x > 12.1 && Math.abs(r.y - Math.tan(Math.PI / 6) * 4) < 0.01);
  run("ramp 45° up", [6, Y0, 14], [1, 0], 2.5, (r) => r.x > 10.1 && Math.abs(r.y - 2) < 0.01);
  run("ramp 55° blocked", [6, Y0, 17], [1, 0], 3, (r) => r.x < 8.6 && r.y < 0.9);
  run("corridor + 0.9 m door", [-14, Y0, 2], [0, 1], 8, (r) => r.z > 15 && Math.abs(r.x + 14) < 0.05);
  run("gap 0.5 m blocked", [-21, Y0, 8], [1, 0], 3, (r) => r.x < -19.1);       // the round body noses 17 cm into it
  run("gap 0.65 m passes", [-21, Y0, 14], [1, 0], 3, (r) => r.x > -18);
  run("ceiling 1.60 m blocked", [-30.3, Y0, 2], [0, 1], 3, (r) => r.z < 4);
  run("ceiling 1.90 m passes", [-33.3, Y0, 2], [0, 1], 6, (r) => r.z > 10);
  run("jump under 1.90 m: bonk", [-33.3, Y0, 6], [0, 0], 1.5, (r) => r.maxY < 1.9 - 1.75 + 0.01 && r.g, { jumpAt: 5 });
  run("35 cm block: no step", [-3.25, Y0, 20.5], [0, 1], 2, (r) => r.z < 22 && r.y < 0.01);
  run("60 cm block: jump on", [-0.25, Y0, 21.2], [0, 1], 0.8, (r) => r.z > 22.2 && Math.abs(r.y - 0.6) < 0.005, { jumpAt: 1 });
  run("1.2 m block: jump fails", [2.75, Y0, 21.2], [0, 1], 2, (r) => r.z < 22 && r.y < 0.01, { jumpAt: 1 });
  run("5 cm wall at run: no tunnel", [0, Y0, 24], [0, 1], 3, (r) => r.z < 27 - 0.29, { run: true });
  run("house: door 0.9 m + 12 cm threshold", [-18.95, Y0, 22], [0, 1], 3, (r) => r.z > 25 && Math.abs(r.y - FL) < 0.005);
  run("house stairs to the upper floor", [-21.4, Y0 + FL + 0.05, 29.35], [1, 0], 6, (r) => r.x > HOLE1 + 0.2 && Math.abs(r.y - top) < 0.01);
  run("prism wall blocks", [10, Y0, 30], [1, 0], 3, (r) => r.x < PX - 0.29 && r.x > PX - 0.31);
  run("prism courtyard is open (no hole)", [PX + 4, Y0 + 3, PZ + 4], [0, 0], 1, (r) => Math.abs(r.y) < 0.005 && r.g);
  run("prism 0.8 m wall blocks walking", [PX + 16, Y0, PZ + 10.5], [0, 1], 2, (r) => r.z < PZ + 12);
  run("prism 0.8 m wall: jump on top", [PX + 16, Y0, PZ + 11.5], [0, 1], 0.45, (r) => r.y > 0.78 && r.g, { jumpAt: 1 });
  run("trunk blocks", [PX + 14, Y0, PZ + 14], [0, 1], 3, (r) => r.z < PZ + 17 - 0.5);
  run("hill (17°) climbs", [-40, g0(-40, -30) + 0.3, -30], [-1, 0], 8, (r) => r.x < -54 && r.g);
  run("mound (55°) not climbed", [-44, g0(-44, 22) + 0.3, 22], [-1, 0], 6, (r) => r.y < 4.5);
  run("fall 20 m: lands", [0, Y0 + 20, 0], [0, 0], 3, (r) => Math.abs(r.y) < 1e-6 && r.g);
  // the rounded bottom must not roll up onto a ledge mid-jump (0.9 m jump: a 1.0 m block stays out of reach)
  run("1.0 m block: jump fails (no edge roll)", [5.75, Y0, 21.2], [0, 1], 2, (r) => r.z < 22 && r.y < 0.01, { jumpAt: 1 });
  run("1.0 m block: running jump fails", [5.75, Y0, 18], [0, 1], 2, (r) => r.z < 22 && r.y < 0.01, { run: true, jumpAt: 50 });
  c.p.walkSpeed = keep[0]; c.p.runSpeed = keep[1];
  // the feet (a character with foot IK in the slot): scripted walks measured at 60 fps (labs/footProbe.js)
  if ((tp.body.footIK || tp.body.legIK) && (probe.feet || (goStation("0 start"), (() => { for (let i = 0; i < 40; i++) tp.update(1 / 60); return probe.setup(); })()))) {
    const foot = (name, sc, check, fmt) => {
      const m = probe.simulate(SCEN[sc], 60), ok = check(m);
      results.push(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(34)} ${fmt(m)}`);
    };
    const sl = (m) => `slide ${m.slideMean.toFixed(3)} m/s, gap p95 ${m.gapP95Cm.toFixed(1)} cm`;
    // contact (a planted foot slides a little more since an over-stretched leg lets its foot go: <= 8 cm/s)
    foot("feet: flat walk, planted, no slide", "flat walk", (m) => m.slideMean < 0.08 && m.gapP95Cm < 4, sl);
    foot("feet: flat run, planted, no slide", "flat run", (m) => m.slideMean < 0.08 && m.gapP95Cm < 4, sl);
    foot("feet: kerb up, no toe in the kerb", "kerb up 15 cm", (m) => m.penCm < 6 && m.slideMean < 0.08, (m) => `pen ${m.penCm.toFixed(1)} cm, ${sl(m)}`);
    foot("feet: kerb down + up", "kerb down 15 + up 14", (m) => m.penCm < 6 && m.gapP95Cm < 4, (m) => `pen ${m.penCm.toFixed(1)} cm, ${sl(m)}`);
    foot("feet: stairs up at a run", "stairs up 17 run", (m) => m.gapP95Cm < 4 && m.slideMean < 0.3, sl);
    foot("feet: turn on the spot (steps)", "turn on the spot", (m) => m.slideMean < 0.3, sl);
    foot("feet: landing absorbs (hips dip)", "fall 1.5 m", (m) => m.dipCm > 4, (m) => `hip dip ${m.dipCm.toFixed(1)} cm`);
    // POSE PLAUSIBILITY against the clip's own pose (labs/footProbe.js): a swinging heel no higher above the ground under
    // it than the clip's + the riser + 5 cm, the heel no closer to the hip than the clip's by more than 25 cm (net of
    // the ground), the foot's pitch within 35 deg of the clip's, the knee never locked straight beyond the clip, a
    // planted leg rarely longer than both 0.97 and the clip's own, the knee not folded far beyond the clip on low steps
    const POSE = [["flat walk", 0], ["flat run", 0], ["kerb up 15 cm", 0.15], ["kerb down 15 + up 14", 0.15], ["dropped kerb", 0.14],
      ["stairs up 17 walk", 0.17], ["stairs up 17 run", 0.17], ["stairs down 21 walk", 0.2125], ["stairs down 21 run", 0.2125],
      ["ramp 15 up", 0.1], ["ramp 15 down", 0.1], ["ramp 30 up", 0.15], ["ramp 30 down", 0.15], ["house stairs up", 0.185], ["house stairs down", 0.185]];
    for (const [sc, riser] of POSE) {
      const m = probe.simulate(SCEN[sc], 60), bad = [];
      if (m.extraLiftCm > (riser + 0.05) * 100) bad.push(`swing lift ${m.extraLiftCm.toFixed(0)} > ${((riser + 0.05) * 100).toFixed(0)} cm`);
      if (m.heelToHipCm > 25) bad.push(`heel->hip ${m.heelToHipCm.toFixed(0)} > 25 cm`);
      if (m.pitchDev > 35) bad.push(`pitch ${m.pitchDev.toFixed(0)} > 35 deg`);
      if (m.kneeLockedPct > 1) bad.push(`knee straight ${m.kneeLockedPct.toFixed(0)} %`);
      if (m.extOverPct > (riser > 0.12 ? 15 : 5)) bad.push(`planted leg over-stretched ${m.extOverPct.toFixed(0)} %`);
      if (riser < 0.16 && m.foldMax > 50) bad.push(`knee folded ${m.foldMax.toFixed(0)} deg beyond the clip`);
      results.push(`${bad.length ? "FAIL" : "PASS"}  ${("pose: " + sc).padEnd(34)} ${bad.length ? bad.join(", ") : `lift ${m.extraLiftCm.toFixed(0)} cm, heel->hip ${m.heelToHipCm.toFixed(0)} cm, stretched ${m.extOverPct.toFixed(0)} %`}`);
    }
    goStation(S.station);
  }
  const pass = results.filter((l) => l.startsWith("PASS")).length;
  S.tests = `${pass} / ${results.length} pass`;
  $notes.style.display = "block";
  $notes.textContent = `TEST SUITE (120 Hz, synchronous)  ${S.tests}\n\n` + results.join("\n");
  console.log("[capsule lab] tests\n" + results.join("\n"));
  c.p.walkSpeed = keep[0]; c.p.runSpeed = keep[1];
  goStation(S.station);
  return { pass, total: results.length, results };
}
function bench() {
  const c = tp.ctl, N = 20000;
  const st = [[7, Y0, 3, 1, 0], [-14, Y0, 2, 0, 1], [-18.95, Y0, 22, 0, 1], [0, Y0, -1, 0, -1]];
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    if (i % 600 === 0) { const s = st[(i / 600) % st.length | 0]; c.teleport(s[0], s[1], s[2]); c.input.x = s[3]; c.input.z = s[4]; c.input.run = true; }
    c.step(1 / 120);
  }
  const us = (performance.now() - t0) / N * 1000;
  c.input.x = c.input.z = 0; c.input.run = false;
  S.bench = `${us.toFixed(2)} µs / step · ${(us * 120 / 1000).toFixed(3)} ms per second of play`;
  goStation(S.station);
  return us;
}

// ------------------------------------------------------------------------------------------------ GPU timing
const gpu = { avg: 0, pending: false };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; })
    .catch(() => {}).finally(() => { gpu.pending = false; });
}
const lab = window.lab = { renderer, scene, camera, tp, world, triBVH, prisms, terrain, lighting, S, STATIONS, goStation, runTests, bench, groundH, Y0, gpu, probe, SCEN, audit, traces, pause: false };
/** A frame-strip session (labs/frameStrip.js), stepped by the screenshot driver tools/characters/strip.mjs. */
lab.stripSession = (o) => (lab._strip = stripSession(lab, o));
/** Pose checks over whole scripted walks (every frame): { name: { counts, worst, frames, flagged } }. */
lab.poseRun = (names = Object.keys(SCEN), fps = 60) => { const out = {}; for (const n of names) out[n] = poseRun(lab, n, fps); goStation(S.station); return out; };
if (qp.get("play") && SCEN[qp.get("play")]) { probe.setup(); probe.play(SCEN[qp.get("play")], true); }

// ------------------------------------------------------------------------------------------------ loop
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const focus = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), fwdV = new THREE.Vector3();
function renderFrame() {
  focus.set(tp.x, tp.y, tp.z);
  lighting.update(camera.position.y, Y0, focus, 40);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
}
lab.render = renderFrame;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (lab.pause) return;                   // (a frame strip is stepping the frames itself)
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  tp.update(dt * S.slowmo);
  probe.camera(camera, dt);
  traces.update(probe, tp.body.legIK || tp.body.footIK);
  focus.set(tp.x, tp.y, tp.z);
  lighting.update(camera.position.y, Y0, focus, 40);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  if (window.__afterRender) { const f = window.__afterRender; window.__afterRender = null; f(renderer.domElement); }   // (frame grabs for the foot audit)
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  // labels
  if (frames % 2 === 0) for (const l of labels) {
    v3.copy(l.p).project(camera);
    const d = camera.position.distanceTo(l.p);
    // in front of the camera (project()'s z can't tell with a reversed depth buffer)
    camera.getWorldDirection(fwdV);
    let vis = fwdV.dot(v4.copy(l.p).sub(camera.position)) > 0.2 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && d < 28;
    if (vis) {         // hidden behind walls (the same collision world as the body)
      const cp = camera.position, t = world.ray(cp.x, cp.y, cp.z, l.p.x - cp.x, l.p.y - cp.y, l.p.z - cp.z, 1);
      vis = !(t < 0.97);
    }
    l.el.style.display = vis ? "" : "none";
    if (vis) { l.el.style.left = `${(v3.x + 1) / 2 * innerWidth}px`; l.el.style.top = `${(1 - v3.y) / 2 * innerHeight}px`; l.el.style.opacity = String(Math.min(1, (28 - d) / 8)); }
  }
  if (++frames % 10 === 1) {
    const c = tp.ctl, P = tp.perf, r = renderer.info.render;
    S.ctlms = `${P.ms.toFixed(3)} ms (max ${P.maxMs.toFixed(3)}) · phys ${P.physMs.toFixed(3)} · cam ${P.camMs.toFixed(3)} · anim+IK ${P.animMs.toFixed(3)}`;
    const ik = tp.body.footIK || tp.body.legIK, lo = tp.body.loco;
    S.ik = lo ? `${lo.mode} · w ${ik.weight.toFixed(2)} · pelvis ${(ik.pelvis * 100).toFixed(1)} cm · L ${(ik.legs[0].off * 100).toFixed(1)}${ik.legs[0].planted ? "▼" : "△"} R ${(ik.legs[1].off * 100).toFixed(1)}${ik.legs[1].planted ? "▼" : "△"} cm · stairs ${tp._stairs.k.toFixed(2)} · ${lo.ms.toFixed(3)} ms (IK ${lo.ikMs.toFixed(3)})` : ik ? `w ${ik.weight.toFixed(2)} · pelvis ${(ik.pelvis * 100).toFixed(1)} cm · L ${(ik.legs[0].off * 100).toFixed(1)} R ${(ik.legs[1].off * 100).toFixed(1)} cm · ${(tp.body.ikMs || 0).toFixed(3)} ms` : "—";
    S.perf = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws`;
    const sp = Math.hypot(c.vel[0], c.vel[2]);
    S.state = `${c.grounded ? "ground" : "air"} · ${sp.toFixed(2)} m/s · y ${(c.pos[1] - Y0).toFixed(2)}`;
    $info.textContent = `${backend} · ${S.perf}\ncharacter CPU ${S.ctlms} (per frame, ${P.steps} steps @ ${S.hz} Hz)\n` +
      `${S.state} · contacts ${c.stats.contacts} · queries/step ${c.stats.queries} · substeps ${c.stats.substeps} · step-ups ${c.stats.steppedUp} · snaps ${c.stats.snapped}\n` +
      `camera arm ${tp.cam.arm.toFixed(2)} / ${tp.cam.dist.toFixed(2)} m · opacity ${tp.cam.opacity.toFixed(2)} · ${S.model}\nfoot IK: ${S.ik}\n` +
      `colliders: ${triBVH.count} triangles (BVH ${triBVH.nodes} nodes), ${prisms.P} footprints + ${prisms.C} trunks, heightfield; built in ${buildMs.toFixed(1)} ms`;
  }
});
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
