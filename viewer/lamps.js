// Street lamps. OSM has (almost) no highway=street_lamp nodes in Uccle, so lamps are PLACED
// procedurally, like the windows: along each road of roads.json, at the kerb (half the carriageway
// + parking from the road engine's ROAD_TYPES cross-section, + 0.5 m into the sidewalk), every
// ROAD_TYPES[type].lampSpacing metres, alternating sides, none within 10 m of a road end (junctions).
// Positions are deterministic. Real lamp positions can replace this when a source is found.
//
// Drawing: two InstancedMeshes (painted cast-iron post + lantern frame, and the lantern glass) and an
// additive light pool on the ground, so N lamps cost 3 draw calls. At night a small pool of
// PointLights follows the lamps nearest the camera (?lamplights=0 to disable).
import * as THREE from "three/webgpu";
import { float, vec3, uv, length, smoothstep, mix, color, uniform } from "three/tsl";
import { ROAD_TYPES } from "../vendor/roads/roadCrossSection.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { env } from "./lighting.js";

const POOL = 6;

function kerbOffset(type) {
  const t = ROAD_TYPES[type] || ROAD_TYPES.local;
  const side = (lanes) => {
    let w = 0;
    for (const l of lanes) { if (l.type === "sidewalk") return w + 0.5; w += l.width; }
    return w + 0.5;
  };
  return { left: (t.center?.width || 0) / 2 + side(t.left), right: (t.center?.width || 0) / 2 + side(t.right), spacing: t.lampSpacing || 0 };
}

/** Lamp sites {x, z, yaw (arm points to the road)} from roads.json. */
export function lampSites(roads, bounds) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const out = [];
  for (const r of roads.roads) {
    if (r.meta?.highway === "service" || r.meta?.highway === "footway") continue;
    const k = kerbOffset(r.type);
    if (!k.spacing) continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
    let total = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    if (total < 24) continue;
    let s = 10 + (k.spacing * 0.5) % 7, side = 1, seg = 0, acc = 0;
    while (s < total - 10) {
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], t = (s - acc) / (segL[seg] || 1);
      const dx = (b.x - a.x) / (segL[seg] || 1), dz = (b.z - a.z) / (segL[seg] || 1);
      const nx = -dz * side, nz = dx * side, off = side > 0 ? k.left : k.right;
      const x = a.x + (b.x - a.x) * t + nx * off, z = a.z + (b.z - a.z) * t + nz * off;
      if (x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1) out.push({ x, z, yaw: Math.atan2(nx, nz) });   // local -z (the arm) -> toward the road
      s += k.spacing; side = -side;
    }
  }
  // two roads sharing a kerb: drop lamps closer than 6 m to one already kept
  const kept = [];
  for (const p of out) if (!kept.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 36)) kept.push(p);
  return kept;
}

function postGeometry() {
  const parts = [];
  const add = (g, x, y, z, rx = 0) => { g.rotateX(rx); g.translate(x, y, z); parts.push(g.toNonIndexed()); };
  add(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), 0, 0.35, 0);              // fluted base
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10), 0, 0.76, 0);
  add(new THREE.CylinderGeometry(0.055, 0.075, 4.3, 8), 0, 2.85, 0);             // shaft
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), 0, 5.0, -0.35, Math.PI / 2);   // arm toward the road (-z)
  add(new THREE.SphereGeometry(0.07, 8, 6), 0, 5.02, 0);
  add(new THREE.CylinderGeometry(0.02, 0.24, 0.22, 8), 0, 4.95, -0.72);           // lantern roof
  add(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 8), 0, 4.48, -0.72);            // lantern bottom
  for (const g of parts) g.deleteAttribute("uv");
  return mergeGeometries(parts);
}

export function buildLamps(roads, ground, bounds) {
  const sites = lampSites(roads, bounds);
  const group = new THREE.Group();
  group.name = "street-lamps";
  if (!sites.length) return { group, count: 0, update() {} };

  const postMat = new THREE.MeshStandardNodeMaterial({ color: 0x1d2420, roughness: 0.45, metalness: 0.6 });
  const glassMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.15 });
  const warm = color(0xffc27a);
  glassMat.colorNode = vec3(0.55, 0.53, 0.48);
  glassMat.emissiveNode = warm.mul(mix(float(0.0), float(9.0), env.uNight));
  const glassGeo = new THREE.CylinderGeometry(0.2, 0.12, 0.34, 8).translate(0, 4.68, -0.72);

  const poolMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const r = length(uv().sub(0.5)).mul(2.0);
  poolMat.colorNode = warm.mul(smoothstep(1.0, 0.0, r).pow(2.0).mul(0.55).mul(env.uNight));
  poolMat.opacityNode = float(1);
  const poolGeo = new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2).translate(0, 0.06, -1.2);

  const mk = (geo, mat, shadow) => {
    const m = new THREE.InstancedMesh(geo, mat, sites.length);
    m.castShadow = shadow; m.receiveShadow = shadow;
    return m;
  };
  const post = mk(postGeometry(), postMat, true), glass = mk(glassGeo, glassMat, false), pool = mk(poolGeo, poolMat, false);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  sites.forEach((s, i) => {
    s.y = ground(s.x, s.z) + 0.12;                                               // on the sidewalk, above the kerb line
    q.setFromAxisAngle(up, s.yaw);
    M.compose(new THREE.Vector3(s.x, s.y, s.z), q, one);
    post.setMatrixAt(i, M); glass.setMatrixAt(i, M); pool.setMatrixAt(i, M);
  });
  for (const m of [post, glass, pool]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); group.add(m); }
  pool.renderOrder = 2;

  // a few real lights on the nearest lamps at night
  const lights = [];
  const usePool = !/[?&]lamplights=0/.test(location.search);
  if (usePool) for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xffc27a, 0, 18, 2);
    lights.push(l); group.add(l);
  }
  const lamp = sites.map((s) => new THREE.Vector3(s.x - Math.sin(s.yaw) * 0.72, s.y + 4.55, s.z - Math.cos(s.yaw) * 0.72));
  const update = (camPos) => {
    if (!lights.length) return;
    const night = env.uNight.value;
    if (night < 0.05) { for (const l of lights) l.intensity = 0; return; }
    const order = lamp.map((p, i) => [p.distanceToSquared(camPos), i]).sort((a, b) => a[0] - b[0]);
    lights.forEach((l, k) => { const p = lamp[order[k]?.[1] ?? 0]; l.position.copy(p); l.intensity = 120 * night; });
  };
  return { group, count: sites.length, update };
}
