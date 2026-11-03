// Parked cars along the parking lanes of the road engine's cross-sections (ROAD_TYPES: a lane of
// type "parking"). PLACED PROCEDURALLY (no data source for parked cars): slots of 5.6 m, about
// 65 % occupied (deterministic hash), none within 12 m of a road end, 8 m of a crossing or 15 m of
// a bus stop. One InstancedMesh, per-car paint colour from a Brussels-ish palette (lots of grey,
// black, white, some blue / red). Visible within ~400 m only (the mesh is cheap, but it's clutter).
import * as THREE from "three/webgpu";
import { attribute, instancedBufferAttribute, mix, vec3, float } from "three/tsl";
import { ROAD_TYPES, resolveStack, layoutAt } from "../vendor/roads/roadCrossSection.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const PALETTE = [
  [0.02, 0.02, 0.022], [0.02, 0.02, 0.022], [0.18, 0.185, 0.19], [0.18, 0.185, 0.19], [0.32, 0.33, 0.34],
  [0.62, 0.62, 0.6], [0.62, 0.62, 0.6], [0.05, 0.08, 0.2], [0.3, 0.03, 0.02], [0.12, 0.1, 0.08], [0.05, 0.12, 0.08],
];
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function part(g, col, body, x, y, z) {
  g.translate(x, y, z);
  g = g.toNonIndexed(); g.deleteAttribute("uv");
  const n = g.attributes.position.count, c = new Float32Array(n * 3), bb = new Float32Array(n);
  for (let i = 0; i < n; i++) { c.set(col, i * 3); bb[i] = body; }
  g.setAttribute("aCol", new THREE.BufferAttribute(c, 3));
  g.setAttribute("aBody", new THREE.BufferAttribute(bb, 1));
  return g;
}
/** Box whose top face is pulled in (front / back along x, sides along z): a tapered car volume. */
function tapered(L, H, W, inF, inB, inS) {
  const g = new THREE.BoxGeometry(L, H, W, 1, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      p.setX(i, p.getX(i) > 0 ? p.getX(i) - inF : p.getX(i) + inB);
      p.setZ(i, p.getZ(i) > 0 ? p.getZ(i) - inS : p.getZ(i) + inS);
    }
  }
  g.computeVertexNormals();
  return g;
}
function carGeometry() {
  const glass = [0.03, 0.035, 0.04], tyre = [0.02, 0.02, 0.02], rim = [0.35, 0.35, 0.36];
  const parts = [
    part(tapered(4.25, 0.62, 1.78, 0.18, 0.1, 0.04), [1, 1, 1], 1, 0, 0.62, 0),          // lower body (+x = front)
    part(tapered(2.35, 0.5, 1.6, 0.55, 0.3, 0.12), glass, 0, -0.25, 1.18, 0),             // glasshouse
    part(tapered(1.55, 0.05, 1.32, 0.05, 0.05, 0.03), [1, 1, 1], 1, -0.33, 1.455, 0),     // roof
    part(new THREE.BoxGeometry(0.05, 0.12, 0.32), [0.9, 0.88, 0.8], 0, 2.12, 0.78, 0.55),   // head lights
    part(new THREE.BoxGeometry(0.05, 0.12, 0.32), [0.9, 0.88, 0.8], 0, 2.12, 0.78, -0.55),
    part(new THREE.BoxGeometry(0.05, 0.1, 0.3), [0.45, 0.02, 0.02], 0, -2.12, 0.82, 0.6),   // tail lights
    part(new THREE.BoxGeometry(0.05, 0.1, 0.3), [0.45, 0.02, 0.02], 0, -2.12, 0.82, -0.6),
    part(new THREE.BoxGeometry(0.12, 0.16, 1.6), [0.03, 0.03, 0.03], 0, 2.13, 0.45, 0),      // bumpers
    part(new THREE.BoxGeometry(0.12, 0.16, 1.6), [0.03, 0.03, 0.03], 0, -2.13, 0.45, 0),
  ];
  for (const [x, z] of [[1.35, 0.78], [1.35, -0.78], [-1.3, 0.78], [-1.3, -0.78]]) {
    parts.push(part(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14).rotateX(Math.PI / 2), tyre, 0, x, 0.32, z));
    parts.push(part(new THREE.CylinderGeometry(0.19, 0.19, 0.23, 10).rotateX(Math.PI / 2), rim, 0, x, 0.32, z));
  }
  return mergeGeometries(parts);
}

export function buildCars(roads, feats, ground, bounds) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const avoid = (feats.points || []).filter((p) => p.kind === "crossing" || p.kind === "bus_stop" || p.kind === "traffic_signals")
    .map((p) => [p.x, p.z, p.kind === "bus_stop" ? 15 : 10]);
  // never on a tram reservation: drop slots within 3 m of an OSM tram track or platform
  const rails = [];
  for (const l of feats.lines || []) if (l.kind === "tram" || l.kind === "platform") for (let i = 1; i < l.line.length; i++) rails.push([...l.line[i - 1], ...l.line[i]]);
  const onRails = (x, z) => rails.some(([ax, az, bx, bz]) => {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 < 9;
  });
  const sites = [];
  for (const r of roads.roads) {
    if (!ROAD_TYPES[r.type] || r.meta?.highway === "service") continue;
    let stack;
    try { stack = resolveStack(r); } catch { continue; }
    if (![...stack.sides.left, ...stack.sides.right].some((l) => l.type === "parking")) continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
    let total = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    let s = 12, seg = 0, acc = 0, k = 0;
    while (s < total - 12) {
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], L = segL[seg] || 1, tt = (s - acc) / L;
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L, lx = dz, lz = -dx;      // the road engine's left normal
      const lay = layoutAt(stack, s, total);
      for (const side of ["left", "right"]) {
        const lane = lay[side].find((l) => l.type === "parking" && l.w > 1.6);
        if (!lane) continue;
        const off = (lane.tIn + lane.tOut) / 2;                                     // signed, left positive
        const x = a.x + (b.x - a.x) * tt + lx * off, z = a.z + (b.z - a.z) * tt + lz * off;
        const hv = hash(x * 0.37, z * 0.53 + k);
        const ok = hv < 0.65 && x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1
          && !avoid.some(([ax, az, rr]) => (ax - x) ** 2 + (az - z) ** 2 < rr * rr) && !onRails(x, z);
        // right-hand traffic: cars face the direction of their side's traffic
        const fwd = side === "right" ? Math.atan2(-dz, dx) : Math.atan2(dz, -dx);
        if (ok) sites.push({ x: x + dx * (hv - 0.3) * 0.6, z: z + dz * (hv - 0.3) * 0.6, yaw: fwd + (hv - 0.3) * 0.04, c: Math.floor(hash(z, x) * PALETTE.length) });
        k++;
      }
      s += 5.6;
    }
  }
  const group = new THREE.Group();
  group.name = "parked-cars";
  if (!sites.length) return { group, count: 0 };
  const geo = carGeometry();
  const paint = new Float32Array(sites.length * 3);
  sites.forEach((s, i) => paint.set(PALETTE[s.c], i * 3));
  const iPaint = new THREE.InstancedBufferAttribute(paint, 3);
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.35, metalness: 0.4 });
  const body = attribute("aBody", "float");
  mat.colorNode = mix(attribute("aCol", "vec3"), instancedBufferAttribute(iPaint), body);
  mat.roughnessNode = mix(float(0.15), float(0.3), body);
  mat.metalnessNode = mix(float(0.1), float(0.55), body);
  const m = new THREE.InstancedMesh(geo, mat, sites.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  sites.forEach((s, i) => {
    q.setFromAxisAngle(up, s.yaw);                        // local +x (the bonnet) along the traffic direction
    M.compose(new THREE.Vector3(s.x, ground(s.x, s.z) + 0.005, s.z), q, one);
    m.setMatrixAt(i, M);
  });
  m.castShadow = m.receiveShadow = true;
  m.computeBoundingSphere();
  m.name = "parked-cars";
  group.add(m);
  return { group, count: sites.length };
}
