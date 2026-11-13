// Street furniture from real OSM points (features.json `points`, CONTRACT 0.7):
//   bus_stop (platform)  -> STIB stop pole with sign; a glass shelter when OSM says shelter=yes
//   traffic_signals      -> a signal post on each kerb of the road through the node
//   bicycle_parking      -> a row of Brussels U hoops ("arceaux"), parallel to the street
//   bench                -> a wooden bench facing the street
// Points with no reliable placement (tram stop_positions on the rails, crossings: their markings
// are already drawn by the road engine) are skipped. Orientation and kerb offset come from the
// nearest road of roads.json and the road engine's ROAD_TYPES cross-section.
// One InstancedMesh per kind, one shared material (per-vertex colour + emissive mask). The signal heads run the
// Belgian cycle of viewer/traffic/signals.js (phase A / B per post, two uniforms): the moving traffic stops on the
// same red (?traffic=1).
import * as THREE from "three/webgpu";
import { attribute, vec3, mix, float, select, uniform } from "three/tsl";
import { nearestRoad, phaseOfDir, signalClock, signalState } from "./traffic/signals.js";
import { ROAD_TYPES } from "../vendor/roads/roadCrossSection.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { env } from "./lighting.js";

const C = {
  iron: [0.03, 0.035, 0.035], steel: [0.32, 0.33, 0.34], red: [0.5, 0.03, 0.02], white: [0.8, 0.8, 0.78],
  stib: [0.75, 0.05, 0.08], glass: [0.4, 0.45, 0.47], wood: [0.25, 0.14, 0.07], yellow: [0.6, 0.45, 0.05],
};

/** part(geometry, colour, emissive 0..1, x, y, z, rotX, rotY) -> non-indexed geometry with aCol/aEm. */
function part(g, col, em, x, y, z, rx = 0, ry = 0) {
  g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z);
  g = g.toNonIndexed(); g.deleteAttribute("uv");
  const n = g.attributes.position.count, c = new Float32Array(n * 3), e = new Float32Array(n);
  for (let i = 0; i < n; i++) { c.set(col, i * 3); e[i] = em; }
  g.setAttribute("aCol", new THREE.BufferAttribute(c, 3));
  g.setAttribute("aEm", new THREE.BufferAttribute(e, 1));
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, h, s = 8) => new THREE.CylinderGeometry(r, r, h, s);

// local frame: +x along the street, -z toward the road, origin on the sidewalk at ground level.
// stopPole / shelter: the PLACEHOLDERS, drawn only with ?stops=old (and ?streetlife=0); the STIB stops kit
// (viewer/stops/, tools/blender/stibStops.py) replaces them by default (main.js filters the bus stops out of here)
export const MODELS = {
  stopPole: () => mergeGeometries([
    part(cyl(0.045, 3.0), C.steel, 0, 0, 1.5, 0),
    part(box(0.5, 0.5, 0.04), C.stib, 0.15, 0, 2.75, 0),                         // red STIB sign
    part(box(0.36, 0.08, 0.045), C.white, 0.3, 0, 2.75, 0),
    part(box(0.42, 0.6, 0.05), C.white, 0.05, 0, 1.95, 0),                       // timetable
  ]),
  shelter: () => mergeGeometries([
    part(box(4.0, 0.08, 1.6), C.iron, 0, 0, 2.45, 0.2),                           // roof
    ...[-1.95, 1.95].flatMap((x) => [part(box(0.07, 2.4, 0.07), C.iron, 0, x, 1.2, 0.95), part(box(0.07, 2.4, 0.07), C.iron, 0, x, 1.2, -0.5)]),
    part(box(3.9, 2.0, 0.02), C.glass, 0, 0, 1.25, 0.95),                         // back glass
    part(box(0.02, 2.0, 1.4), C.glass, 0, -1.95, 1.25, 0.22),                     // side glass
    part(box(1.6, 0.06, 0.38), C.wood, 0, 0.6, 0.48, 0.72),                       // bench
    part(box(1.1, 1.7, 0.12), C.white, 0.5, 1.4, 1.1, 0.95),                      // lit ad panel
  ]),
  signal: () => mergeGeometries([
    part(cyl(0.06, 3.2), C.iron, 0, 0, 1.6, 0),
    part(box(0.3, 0.85, 0.22), C.iron, 0, 0, 2.85, -0.12),                       // head facing the road
    // lenses: aEm < 0 = lens id (-1 red, -2 amber, -3 green), lit by the cycle (SIGNAL_MAT)
    part(cyl(0.085, 0.04, 12), [0.08, 0.01, 0.01], -1, 0, 3.12, -0.24, Math.PI / 2),
    part(cyl(0.085, 0.04, 12), [0.06, 0.04, 0.0], -2, 0, 2.86, -0.24, Math.PI / 2),
    part(cyl(0.085, 0.04, 12), [0.0, 0.05, 0.02], -3, 0, 2.6, -0.24, Math.PI / 2),
    part(box(0.5, 0.12, 0.12), C.white, 0, 0, 0.9, 0),                           // white band (Belgian posts)
  ]),
  bikes: () => mergeGeometries([-2, -1, 0, 1, 2].flatMap((k) => [
    part(cyl(0.024, 0.8), C.steel, 0, k * 0.9 - 0.3, 0.4, 0), part(cyl(0.024, 0.8), C.steel, 0, k * 0.9 + 0.3, 0.4, 0),
    part(new THREE.TorusGeometry(0.3, 0.024, 6, 12, Math.PI), C.steel, 0, k * 0.9, 0.8, 0),
  ])),
  bench: () => mergeGeometries([
    part(box(1.8, 0.05, 0.45), C.wood, 0, 0, 0.45, 0), part(box(1.8, 0.4, 0.05), C.wood, 0, 0, 0.8, 0.22),
    ...[-0.75, 0.75].map((x) => part(box(0.06, 0.45, 0.45), C.iron, 0, x, 0.22, 0)),
  ]),
};

function kerb(type, side) {
  const t = ROAD_TYPES[type] || ROAD_TYPES.local;
  let w = (t.center?.width || 0) / 2;
  for (const l of side > 0 ? t.left : t.right) { if (l.type === "sidewalk") break; w += l.width; }
  return w;
}

export function buildFurniture(feats, roads, ground, bounds) {
  const group = new THREE.Group();
  group.name = "street-furniture";
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const inst = { stopPole: [], shelter: [], signal: [], bikes: [], bench: [] };
  // place at the kerb on side s of the road nearest p: arm/face toward the road
  const atKerb = (nr, s, along = 0, extra = 0.6) => {
    const nx = -nr.uz * s, nz = nr.ux * s, off = kerb(nr.road.type, s) + extra;
    return { x: nr.px + nx * off + nr.ux * along, z: nr.pz + nz * off + nr.uz * along, yaw: Math.atan2(nx, nz) };
  };
  for (const p of feats.points || []) {
    const t = p.tags || {};
    if (+(t.layer || 0) > 0) continue;                 // on a bridge deck (layer 1): the ground here is under it; a hero bridge carries its own
    const nr = nearestRoad(roads, N, p.x, p.z);
    if (!nr || nr.d > 30) continue;
    if (p.kind === "bus_stop") {
      const s = atKerb(nr, nr.side, 0, 0.5);
      inst.stopPole.push(s);
      if (t.shelter === "yes") inst.shelter.push(atKerb(nr, nr.side, 3.0, 1.6));
    } else if (p.kind === "traffic_signals") {
      // one post each side, before the stop line; phase B on roads running more north-south (signals.js phaseOfDir)
      const phase = phaseOfDir(nr.ux, nr.uz);
      for (const sd of [1, -1]) inst.signal.push({ ...atKerb(nr, sd, sd * 4, 0.4), phase });
    } else if (p.kind === "bicycle_parking") {
      inst.bikes.push(atKerb(nr, nr.side, 0, 0.9));
    } else if (p.kind === "bench") {
      inst.bench.push({ x: p.x, z: p.z, yaw: atKerb(nr, nr.side).yaw });
    }
  }
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.2 });
  const col = attribute("aCol", "vec3"), em = attribute("aEm", "float");
  mat.colorNode = col;
  mat.emissiveNode = col.mul(em).mul(mix(float(0.6), float(4.0), env.uNight));
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const counts = {};
  for (const [kind, list] of Object.entries(inst)) {
    const inB = list.filter((s) => s.x >= bounds.x0 && s.x <= bounds.x1 && s.z >= bounds.z0 && s.z <= bounds.z1);
    counts[kind] = inB.length;
    if (!inB.length) continue;
    const geo = MODELS[kind]();
    if (kind === "signal") geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(Float32Array.from(inB, (s) => s.phase), 1));
    const m = new THREE.InstancedMesh(geo, kind === "signal" ? signalMaterial() : mat, inB.length);
    inB.forEach((s, i) => {
      q.setFromAxisAngle(up, s.yaw);                                              // local -z faces the road
      M.compose(new THREE.Vector3(s.x, ground(s.x, s.z) + 0.12, s.z), q, one);
      m.setMatrixAt(i, M);
    });
    m.castShadow = m.receiveShadow = true;
    m.computeBoundingSphere();
    m.name = `furniture-${kind}`;
    group.add(m);
  }
  return { group, counts };
}

// ---------------------------------------------------------------- the signal heads' cycle (uniforms, no lights)
/** Phase A / B states (GREEN 0, AMBER 1, RED 2), set once per frame by updateSignals(). */
export const SIGNAL_STATE = { A: uniform(2), B: uniform(2) };
/** Main loop: the lens uniforms from the shared clock (viewer/traffic/signals.js). */
export function updateSignals() {
  const t = signalClock.now();
  SIGNAL_STATE.A.value = signalState(0, t); SIGNAL_STATE.B.value = signalState(1, t);
}
let SIGNAL_MAT = null;
function signalMaterial() {
  if (SIGNAL_MAT) return SIGNAL_MAT;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.2 });
  const col = attribute("aCol", "vec3"), em = attribute("aEm", "float"), ph = attribute("aPhase", "float");
  const st = mix(SIGNAL_STATE.A, SIGNAL_STATE.B, ph), lens = em.negate().add(0.5).floor();     // 1 red, 2 amber, 3 green
  const on = lens.equal(1).and(st.equal(2)).or(lens.equal(2).and(st.equal(1))).or(lens.equal(3).and(st.equal(0)));
  const lit = select(lens.equal(1), vec3(1, 0.06, 0.02), select(lens.equal(2), vec3(1, 0.5, 0.04), vec3(0.08, 1, 0.42)));
  m.colorNode = select(on, lit.mul(0.5), col);
  m.emissiveNode = select(on, lit.mul(mix(float(1.6), float(5.0), env.uNight)), col.mul(em.max(0)).mul(mix(float(0.6), float(4.0), env.uNight)));
  m.userData.shared = true;
  SIGNAL_MAT = m;
  return m;
}
