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
import { wxMat } from "./weather/cityWeatherize.js";      // the weather (gated)
import { float, vec3, uv, length, smoothstep, mix, color, uniform, positionWorld } from "three/tsl";
import { SMOOTH, lodEye, keepBand, rampTo } from "./lodFade.js";
import { lampPoolsOn } from "./lampLight.js";
import { LAMP_LODS } from "./lampModel.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { env } from "./lighting.js";

const POOL = 6;
const LAMP_CULL = typeof location === "undefined" || new URLSearchParams(location.search).get("lampcull") !== "old";   // perfgame round 2

export { lampSites, placedLampSites } from "./streets/lampPlace.js";
import { placedLampSites } from "./streets/lampPlace.js";

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

export function buildLamps(roads, ground, bounds, { lights: withLights = true, place = null, lift = null } = {}) {
  const sites = placedLampSites(roads, bounds, place);
  const group = new THREE.Group();
  group.name = "street-lamps";
  if (!sites.length) return { group, count: 0, update() {}, heads: [], sites };

  const postMat = new THREE.MeshStandardNodeMaterial({ color: 0x1d2420, roughness: 0.45, metalness: 0.6 });
  wxMat(postMat, { porosity: 0.05, beads: true, frost: true });   // snow round 2: the weather
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
      // (perfgame round 2, ?lampcull=old: never culled) each LOD mesh gets the bounding sphere of the lamps it draws now
      // (set at every re-bucketing): a tile's lamps behind the camera / out of the shadow box cost no draw
      const mk2 = (geo, mat, shadow) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = LAMP_CULL; if (LAMP_CULL) m.boundingSphere = new THREE.Sphere(); group.add(m); return m; };
      const far = SMOOTH && k === lastK ? farLampMats() : MODEL;
      return { iron: mk2(l.iron, far.iron, SMOOTH || k === 0), glass: mk2(l.glass, far.glass, false) };
    });
    const last = new THREE.Vector3(Infinity, 0, 0);
    relod = (cam) => {
      if (cam.distanceToSquared(last) < 25) return;
      last.copy(cam);
      for (const m of lodMeshes) { m.iron.count = m.glass.count = 0; m.box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; }
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i], d = Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z);
        let k = LAMP_LODS.findIndex((l) => d < l.until);
        if (k < 0 && SMOOTH && d < LAMP_LODS[lastK].until + 6) k = lastK;    // (the dither ends the fade)
        if (k < 0) continue;
        const m = lodMeshes[k], n = m.iron.count++;
        m.glass.count++;
        m.iron.setMatrixAt(n, mats[i]); m.glass.setMatrixAt(n, mats[i]);
        const B = m.box; B[0] = Math.min(B[0], s.x); B[1] = Math.min(B[1], s.y); B[2] = Math.min(B[2], s.z); B[3] = Math.max(B[3], s.x); B[4] = Math.max(B[4], s.y); B[5] = Math.max(B[5], s.z);
      }
      if (LAMP_CULL) for (const m of lodMeshes) if (m.iron.count) {
        const B = m.box, cx = (B[0] + B[3]) / 2, cy = (B[1] + B[4]) / 2 + 3, cz = (B[2] + B[5]) / 2;
        const r = Math.hypot(B[3] - B[0], B[4] - B[1], B[5] - B[2]) / 2 + 7;     // (+ a lamp's own size: 6 m post, 1 m arm)
        m.iron.boundingSphere.center.set(cx, cy, cz); m.iron.boundingSphere.radius = r;
        m.glass.boundingSphere.center.set(cx, cy, cz); m.glass.boundingSphere.radius = r;
      }
      for (const m of lodMeshes) for (const im of [m.iron, m.glass]) {      // only the instances in use
        im.visible = im.count > 0;                                          // (an empty instanced mesh still costs a draw per pass)
        if (!im.count) continue;
        im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, im.count * 16); im.instanceMatrix.needsUpdate = true;
      }
    };
  }
  if (lampPoolsOn) pool.visible = false;   // the lamp light map lights the ground itself (lampLight.js)

  // the lamp heads join the city-wide registry; the few real lights (lampLightPool below) follow the nearest ones.
  // The lights themselves are NOT per tile any more: a tile adding / removing point lights changed the scene's light
  // count, which rebuilds EVERY lit material at once (70 render pipelines created synchronously: the multi-second
  // freeze when the first tile unloaded while driving / flying, measured 2026-11-13)
  // the lantern: the Blender lamp's globe hangs 1.05 m out at ~6 m, the old one 0.72 m at 4.55 m
  const REACH = MODEL ? 1.05 : 0.72, HEADY = MODEL ? 5.95 : 4.55;
  const lamp = sites.map((s) => new THREE.Vector3(s.x - Math.sin(s.yaw) * REACH, s.y + HEADY, s.z - Math.cos(s.yaw) * REACH));
  const key = {};
  if (withLights) HEADS.set(key, lamp);
  const update = (camPos) => { relod?.(camPos); };
  const release = () => HEADS.delete(key);
  return { group, count: sites.length, update, release, heads: lamp.map((p) => ({ x: p.x, y: p.y, z: p.z })), sites };   // heads: the lantern globes (y: their centre, m TAW)
}


// ---------------------------------------------------------------- the city's lamp lights (one pool, never changes)
// Every loaded tile's lamp heads (HEADS); POOL point lights created ONCE, in the scene for the whole session, moved to
// the nearest heads at night (intensity 0 by day). The light COUNT never changes at runtime: three rebuilds every lit
// material when it does. Same rule for any future light (night spots, police beacons): a fixed pool, never add/remove.
const HEADS = new Map();
let poolLights = null;
export function lampLightPool(scene) {
  if (poolLights || /[?&]lamplights=0/.test(location.search)) return () => {};
  poolLights = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffc27a, 0, 18, 2); l.name = `lamp-light-${i}`; poolLights.push(l); scene.add(l); }
  const nearD = new Float64Array(POOL), nearP = new Array(POOL).fill(null);
  return (camPos) => {
    const night = env.uNight.value;
    if (night < 0.05) { for (const l of poolLights) l.intensity = 0; return; }
    // the POOL nearest heads of all loaded tiles: a partial insertion selection (no per-frame allocation or sort)
    nearD.fill(Infinity); nearP.fill(null);
    for (const lamp of HEADS.values()) for (let i = 0; i < lamp.length; i++) {
      const d = lamp[i].distanceToSquared(camPos);
      if (d >= nearD[POOL - 1]) continue;
      let k = POOL - 1;
      while (k > 0 && nearD[k - 1] > d) { nearD[k] = nearD[k - 1]; nearP[k] = nearP[k - 1]; k--; }
      nearD[k] = d; nearP[k] = lamp[i];
    }
    // (the lamp light map lights the ground: these add shape to cars, trees, walls)
    for (let k = 0; k < POOL; k++) { const l = poolLights[k]; if (nearP[k]) { l.position.copy(nearP[k]); l.intensity = 55 * night; } else l.intensity = 0; }
  };
}
