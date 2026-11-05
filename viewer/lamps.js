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
import { float, vec3, uv, length, smoothstep, mix, color, uniform, positionWorld } from "three/tsl";
import { SMOOTH, lodEye, keepBand, rampTo } from "./lodFade.js";
import { lampPoolsOn } from "./lampLight.js";
import { LAMP_LODS } from "./lampModel.js";
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

/** The Blender lamp (viewer/lampModel.js), when loaded: main.js sets it before the first tile. */
let MODEL = null, FAR = null;
export function setLampModel(m) { MODEL = m; FAR = null; }
const FAR_BAND = 60;
/** The last LOD's materials: the model's, cut by a dither that fades the lamp out over [until - FAR_BAND, until]
 *  (per pixel distance to the view camera, lodFade.js). Shared by every tile. */
function farLampMats() {
  if (FAR) return FAR;
  const end = LAMP_LODS[LAMP_LODS.length - 1].until;
  const fade = (m) => {
    const c = m.clone();
    c.maskNode = keepBand(float(0), float(1).sub(rampTo(positionWorld.sub(lodEye).length(), float(end), float(FAR_BAND))));
    c.userData.shared = true;
    return c;
  };
  return (FAR = { iron: fade(MODEL.iron), glass: fade(MODEL.glass) });
}

/** `place(site)` (?roads=surface, viewer/streetFit.js): moves a site onto the measured sidewalk or drops it (null);
 *  `lift(x, z)`: the measured surface height above the road there. */
export function buildLamps(roads, ground, bounds, { lights: withLights = true, place = null, lift = null } = {}) {
  let sites = lampSites(roads, bounds);
  if (place) {
    const kept = [];
    for (const s of sites.map(place)) if (s && !kept.some((q) => (q.x - s.x) ** 2 + (q.z - s.z) ** 2 < 36)) kept.push(s);
    sites = kept;
  }
  const group = new THREE.Group();
  group.name = "street-lamps";
  if (!sites.length) return { group, count: 0, update() {}, heads: [] };

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
    s.y = ground(s.x, s.z) + (lift ? lift(s.x, s.z) : 0.12);                     // on the sidewalk, above the kerb line
    q.setFromAxisAngle(up, s.yaw);
    M.compose(new THREE.Vector3(s.x, s.y, s.z), q, one);
    post.setMatrixAt(i, M); glass.setMatrixAt(i, M); pool.setMatrixAt(i, M);
  });
  for (const m of [post, glass, pool]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); group.add(m); }
  pool.renderOrder = 2;
  // the Blender lamp: replaces the cylinders, one instanced iron + glass mesh per LOD, each lamp in its LOD
  // by distance (re-bucketed when the camera has moved 5 m); capacity >= 1025 so every tile shares the shaders
  let relod = null;
  if (MODEL) {
    post.visible = glass.visible = false;
    const cap = Math.max(sites.length, 1025);
    const mats = sites.map((s) => { q.setFromAxisAngle(up, s.yaw); return new THREE.Matrix4().compose(new THREE.Vector3(s.x, s.y, s.z), q, one); });
    // smooth LOD (docs/SMOOTH_LOD.md): the meshopt LODs are within 1-2 cm of each other at their switch, but the
    // shadow came from LOD 0 only (a lamp's shadow switched on at 35 m): every LOD casts now, and the last one
    // dithers out over its last FAR_BAND metres instead of vanishing at 450 m
    const lastK = MODEL.lods.length - 1;
    const lodMeshes = MODEL.lods.map((l, k) => {
      const mk2 = (geo, mat, shadow) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; group.add(m); return m; };
      const far = SMOOTH && k === lastK ? farLampMats() : MODEL;
      return { iron: mk2(l.iron, far.iron, SMOOTH || k === 0), glass: mk2(l.glass, far.glass, false) };
    });
    const last = new THREE.Vector3(Infinity, 0, 0);
    relod = (cam) => {
      if (cam.distanceToSquared(last) < 25) return;
      last.copy(cam);
      for (const m of lodMeshes) m.iron.count = m.glass.count = 0;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i], d = Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z);
        let k = LAMP_LODS.findIndex((l) => d < l.until);
        if (k < 0 && SMOOTH && d < LAMP_LODS[lastK].until + 6) k = lastK;    // (the dither ends the fade)
        if (k < 0) continue;
        const m = lodMeshes[k], n = m.iron.count++;
        m.glass.count++;
        m.iron.setMatrixAt(n, mats[i]); m.glass.setMatrixAt(n, mats[i]);
      }
      for (const m of lodMeshes) for (const im of [m.iron, m.glass]) {      // only the instances in use
        if (!im.count) continue;
        im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, im.count * 16); im.instanceMatrix.needsUpdate = true;
      }
    };
  }
  if (lampPoolsOn) pool.visible = false;   // the lamp light map lights the ground itself (lampLight.js)

  // a few real lights on the nearest lamps at night
  const lights = [];
  const usePool = withLights && !/[?&]lamplights=0/.test(location.search);
  if (usePool) for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xffc27a, 0, 18, 2);
    lights.push(l); group.add(l);
  }
  // the lantern: the Blender lamp's globe hangs 1.05 m out at ~6 m, the old one 0.72 m at 4.55 m
  const REACH = MODEL ? 1.05 : 0.72, HEADY = MODEL ? 5.95 : 4.55;
  const lamp = sites.map((s) => new THREE.Vector3(s.x - Math.sin(s.yaw) * REACH, s.y + HEADY, s.z - Math.cos(s.yaw) * REACH));
  const update = (camPos) => {
    relod?.(camPos);
    if (!lights.length) return;
    const night = env.uNight.value;
    if (night < 0.05) { for (const l of lights) l.intensity = 0; return; }
    const order = lamp.map((p, i) => [p.distanceToSquared(camPos), i]).sort((a, b) => a[0] - b[0]);
    lights.forEach((l, k) => { const p = lamp[order[k]?.[1] ?? 0]; l.position.copy(p); l.intensity = 55 * night; });   // (the lamp light map lights the ground: these add shape to cars, trees, walls)
  };
  return { group, count: sites.length, update, heads: lamp.map((p) => ({ x: p.x, z: p.z })) };
}
