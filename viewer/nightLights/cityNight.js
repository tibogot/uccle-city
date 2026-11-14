// THE NIGHT LIGHTS IN THE CITY (?night=1, docs/NIGHT_HOOKUP.md): the lab's clustered light pool (nightLighting.js,
// lightSelect.js, nightSources.js, groundLight.js) fed by the city's own sources. main.js imports this module only
// under the flag (nightMode.js NIGHT, decided at boot, never toggled).
//
//   step 0  installNightLighting(renderer) BEFORE renderer.init(): renderer.lighting = NightLighting(pool). Every lit
//           material compiles the cluster loop once, at boot (the warm-up): no pipeline is created later for it.
//           ?nightpool=0 keeps the lighting model with an EMPTY pool (the loop's fixed cost, for A/B).
//   step 1  STREET LAMPS: a registry of every loaded tile's lamp heads (addTile / removeTile from main.js loadTile and
//           its dispose); stable ids in fixed arrays (no allocation per frame), a 32 m grid per tile; each tile's
//           lamps fade in over FADE_IN s after it loads (a streamed tile never pops its lights in). The 24 nearest
//           lamps are real pool lights (LANTERN profile), faded out between 40 and 60 m from the camera; beyond, and on
//           the ground everywhere, the city's lamp light map (lampLight.js) lights: ground materials skip the pool's
//           lamps (flag "baked"), walls take the map only beyond the same 40-60 m band (nightMode.js farBand). The
//           city's own 6 PointLights (lamps.js lampLightPool) are not created under the flag (main.js).
//   step 2  K = 2 SHADOWED LAMPS (lightSelect.js ShadowLamps): two THREE.SpotLights with 512 px shadows, in the scene
//           from boot to the end (the light count never changes), cross-faded with the 2 nearest lamps' pool lights;
//           their shadow maps render only while they give light (by day: none). A lamp whose tile unloads is released
//           (ShadowLamps.release) before its id can be reused.
//   step 3  CARS: the moving traffic (cityTraffic.sim, the drawn = interpolated poses) and the PLAYER's car (drive
//           mode) - one low beam and one rear light each; the 12 nearest are real pool lights, every other car within
//           the dynamic ground layer's 320 m square draws its road pool there (groundLight.js createDynamic, read by
//           the ground materials through nightMode.js dynIrradiance) with the complementary weight. A car's lights fade
//           in over its first 0.6 s and fade out over 0.4 s at its last pose when it leaves the sim (parked in,
//           removed out of sight): no light pops.
import * as THREE from "three/webgpu";
import { LightPool, NightLighting } from "./nightLighting.js";
import { NearestN, StaticSources, smooth01 } from "./lightSelect.js";
import { NightSources, CAR, nightParams } from "./nightSources.js";
import { GroundLight } from "./groundLight.js";
import { createGlare } from "./glare.js";
import { nightGround, DYN } from "./nightMode.js";
import { env } from "../lighting.js";
import { carFleet } from "../carFleet.js";

const qp = new URLSearchParams(location.search);
export const pool = new LightPool(256);
const POOL_ON = qp.get("nightpool") !== "0";
const FADE_IN = 4;                    // s: a streamed tile's lamps fade in (slow: the offered distance shrinks FADE_FAR / FADE_IN m/s)
const FADE_FAR = 75;                  // m: a lamp at fade 0 is offered this much farther (beyond the 70 m selection)
const CAR_IN = 1.5, CAR_OUT = 1.2;    // s: a car's lights fade in / out (slow: a fading car is also offered farther, nightSources.js)
const CAR_CAP = 256;                  // cars offered per frame (nearest first within CAR_R)
const CAR_R = 250;                    // m
// step 4, FAR GLARE CARDS (glare.js, GTA V's distant lights): one additive billboard per far lamp head / car front / car
// rear, 256 at most: the GLARE_LAMPS nearest lamp heads within GLARE_R (NearestN: the cut-off fades, no pop) and the
// GLARE_CARS nearest cars (front + rear: 2 cards each). Near the camera (< 30-90 m) the emissive glass + bloom carry
// the glow (the card's own fade). ?nightglare=0: none.
const GLARE_ON = qp.get("nightglare") !== "0";
const GLARE_LAMPS = 192, GLARE_CARS = 32, GLARE_R = 600;
// the lamp shadows' casters: a layer of their own. A shadowed lamp's frustum (155 deg, 24 m) otherwise takes in whole
// building chunks (detail / wall / kit meshes: ~1.1 M triangles, ~96 draws per lamp, measured on Place Saint-Job) that
// never throw a shadow a lamp could show (the lamp stands in front of the facade). Tagged: every shadow caster that is
// street-scale - posts, cars, trees, furniture, people, kiosks (radius < 12 m, or instanced) - not building parts.
const LAMP_SHADOW_LAYER = 6;
// round 2: a newly tagged caster also joins WARM_LAYER until it has been drawn once into both lamp shadow maps BY DAY
// (warmShadows below): its shadow render objects / node builds exist before the first night frame, so the day -> night
// switch creates none (it made 66-182 ms long tasks: 377 render objects, the first two lamp passes ~45 ms)
const WARM_LAYER = 7;
const DEBUG = qp.get("nightdebug") === "1";       // the pop metrics (per lamp / per car weight jumps): off by default (CPU)
const SHADOW_MODE = qp.get("nightshadow") || "smart";   // "smart" (re-render on change, round 2) | "full" (every frame, round 1)
const BUILDING = /^(buildings-|kit |facade|roof|terrain|ground|bridge|tunnel)/i;
function tagCasters(root, warm) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.userData.__nightTag) return;
    o.userData.__nightTag = true;
    if (BUILDING.test(o.name || "") || BUILDING.test(o.parent?.name || "")) return;
    let small = o.isInstancedMesh || o.isSkinnedMesh;
    if (!small) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); small = (g.boundingSphere?.radius ?? 1e9) * o.matrixWorld.getMaxScaleOnAxis() < 12; }
    if (small) { o.layers.enable(LAMP_SHADOW_LAYER); warm.push(o, performance.now()); n++; }
  });
  return n;
}

/** step 0: before renderer.init() */
export async function installNightLighting(renderer) {
  // the cluster loop's two data textures and the 2 shadowed lamps' maps add 4 sampled textures to every lit material:
  // the richest ones (the facade kit: 16 + 4) pass WebGPU's default per-stage limit of 16. Ask the device for what the
  // adapter has (desktop GPUs: 48+); a device without it keeps 16 (those materials would fail: logged)
  try {
    const ad = await navigator.gpu?.requestAdapter({ powerPreference: "high-performance", featureLevel: "compatibility" });
    const want = ad?.limits?.maxSampledTexturesPerShaderStage ?? 16, smp = ad?.limits?.maxSamplersPerShaderStage ?? 16;
    const L = renderer.backend?.parameters?.requiredLimits;
    if (L && want > 16) { L.maxSampledTexturesPerShaderStage = Math.min(want, 32); L.maxSamplersPerShaderStage = Math.min(smp, 32); }
    if (want < 24) console.warn(`[night] the adapter allows ${want} sampled textures per stage: the richest materials may fail`);
  } catch (e) { console.warn("[night] adapter limits:", e); }
  const dpr = Math.min(devicePixelRatio, 1.5);
  // the cluster storage for the whole screen at once (a resize / full screen never grows it: no rebuild)
  const maxPixels = [Math.max(innerWidth, screen.width) * dpr, Math.max(innerHeight, screen.height) * dpr];
  renderer.lighting = new NightLighting(pool, { maxPixels });
  // the facade kit's opaque shader is built to WebGPU's 16 samplers (kitMaterials.js): +2 lamp shadows would not link
  renderer.lighting.skipShadow = (m) => m?.userData?.lampShadow === false || /^kit opaque/.test(m?.name || "");
}

// ------------------------------------------------------------------------------------------------ lamp registry
class LampRegistry {
  constructor(cap = 16384) {
    this.cap = cap;
    this.x = new Float32Array(cap).fill(1e9); this.y = new Float32Array(cap); this.z = new Float32Array(cap).fill(1e9);
    this.fade = new Float32Array(cap);
    this.free = new Int32Array(cap); this.nFree = cap;
    for (let i = 0; i < cap; i++) this.free[i] = cap - 1 - i;
    this.tiles = new Map(); this.tileList = [];
    this.list = new Array(cap).fill(null);       // per id: the source's record (shops / signs: normal, size, colour)
    this.onRelease = null;
    this.count = 0;
  }
  addTile(name, heads, now, items = null) {
    if (this.tiles.has(name) || !heads?.length) return;
    const n = Math.min(heads.length, this.nFree);
    if (n < heads.length) console.warn(`[night] lamp registry full: ${heads.length - n} lamps of ${name} left out`);
    const ids = new Int32Array(n), lx = new Float32Array(n), ly = new Float32Array(n), lz = new Float32Array(n);
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const h = heads[k], id = this.free[--this.nFree];
      if (items) this.list[id] = items[k];
      ids[k] = id; this.x[id] = lx[k] = h.x; this.y[id] = ly[k] = h.y; this.z[id] = lz[k] = h.z; this.fade[id] = 0;
      x0 = Math.min(x0, h.x); x1 = Math.max(x1, h.x); z0 = Math.min(z0, h.z); z1 = Math.max(z1, h.z);
    }
    // the tile's grid offers its LOCAL index: the adapter turns it into the registry id (made once, no per-frame closure)
    // a lamp fading in is offered FARTHER by (1 - fade) x FADE_FAR: it enters the nearest set through the cut-off's own
    // fade instead of taking a slot at weight 0 (which moved the cut-off - every other lamp's weight - at a stroke)
    const fade = this.fade;
    const adapter = { sel: null, ids, offer(s, d2) { const id = this.ids[s], f = fade[id]; if (f >= 1) this.sel.offer(id, d2); else { const d = Math.sqrt(d2) + (1 - f) * FADE_FAR; this.sel.offer(id, d * d); } } };
    const rec = { name, ids, t0: now, f: 0, grid: new StaticSources(lx, ly, lz, 32), x0, x1, z0, z1, adapter };
    this.tiles.set(name, rec); this.tileList.push(rec);
    this.count += n;
  }
  removeTile(name) {
    const rec = this.tiles.get(name);
    if (!rec) return;
    this.tiles.delete(name); this.tileList.splice(this.tileList.indexOf(rec), 1);
    for (const id of rec.ids) {
      this.x[id] = this.z[id] = 1e9; this.fade[id] = 0; this.list[id] = null;
      this.onRelease?.(id);
      this.free[this.nFree++] = id;
    }
    this.count -= rec.ids.length;
  }
  /** the tiles' fade-in, by frame time capped at 1/30 s (a long task while a tile streams in must not jump it) */
  step(dt) {
    const k = Math.min(dt, 1 / 30) / FADE_IN;
    for (let t = 0; t < this.tileList.length; t++) {
      const r = this.tileList[t];
      if (r.f >= 1) continue;
      r.t = Math.min(1, (r.t ?? 0) + k);
      r.f = smooth01(r.t);
      for (let k = 0; k < r.ids.length; k++) this.fade[r.ids[k]] = r.f;
    }
  }
  /** StaticSources' query, over every tile whose box is within r */
  query(cx, cy, cz, r, sel) {
    for (let t = 0; t < this.tileList.length; t++) {
      const R = this.tileList[t];
      if (cx < R.x0 - r || cx > R.x1 + r || cz < R.z0 - r || cz > R.z1 + r) continue;
      R.adapter.sel = sel;
      R.grid.query(cx, cy, cz, r, R.adapter);
    }
  }
}

const NIGHT_LIGHT_STRIDE = 11;          // kind (0 shop window, 1 sign), x y z, nx nz, half width, half height, r g b
const EMPTY = () => ({ x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), list: [] });

// ------------------------------------------------------------------------------------------------ the city hookup
/**
 * Steps 1-3. scene: the city scene; updaters: main.js' per-frame list (the night update runs after the traffic's);
 * returns { addTile, removeTile, setTraffic, setDriver, stats, ... }.
 */
export function startCityNight({ scene, renderer, updaters, groundAt = null, log = console.log }) {
  const lamps = new LampRegistry();
  // step 2: the K shadowed lamps - created now, before the warm-up, never removed
  const shadowLights = [];
  for (let k = 0; k < 2; k++) {
    // (wider than the lab's 1.22 / 0.65: three's spot profile is flat to ~54 deg from the nadir, so the near walls keep
    // their light; the shadowed share is 0.65 - the lantern's up light and the rest stay pool light, nightParams.shadowShare)
    const L = new THREE.SpotLight(0xffc785, 0, 24, 1.35, 0.3, 2);
    L.name = `night-shadow-lamp-${k}`; L.userData.nightShadowLamp = true;
    L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.03; L.shadow.radius = 3;
    L.shadow.camera.near = 0.3; L.shadow.camera.far = 26;
    L.shadow.camera.layers.set(LAMP_SHADOW_LAYER);                 // only the street-scale casters (tagCasters below)
    L.position.set(0, -500, 0); L.target.position.set(0, -510, 0);
    scene.add(L, L.target); shadowLights.push(L);
  }
  // step 3: the dynamic ground layer (the far cars' pools), its texture shared with the ground materials
  const half = DYN.size / 2;
  const ground = new GroundLight({ x0: -half, x1: half, z0: -half, z1: half, dynTexel: DYN.texel, staticLayers: false, rt: nightGround.rt });
  ground.uOrigin = nightGround.uOrigin; ground.uInv = nightGround.uInv; ground.uDyn = nightGround.uDyn;
  ground.uOrigin.value.set(-half, -half);
  ground.createDynamic(CAR_CAP);
  const dynMesh = ground.dyn.mesh;
  dynMesh.visible = false;
  // step 4: the glare cards (compiled off the frame on the first update: their pipeline never builds mid-frame)
  const glare = createGlare(GLARE_LAMPS + GLARE_CARS * 2);
  glare.mesh.visible = false;
  scene.add(glare.mesh);
  const glareSel = new NearestN(GLARE_LAMPS, GLARE_R);
  let glareReady = false, glareCompiling = false, gcx = 0, gcz = 0, glareLampsN = -1, glareScale = 0;
  const dOf = (i) => { const D = night.carData, o = i * CAR.STRIDE; return Math.hypot(D[o] - gcx, D[o + 2] - gcz); };
  const compileGlare = (cam) => {
    glareCompiling = true;
    glare.mesh.count = 1; glare.mesh.visible = true;
    renderer.compileAsync(glare.mesh, cam, scene).catch((e) => console.warn("[night] glare compile:", e))
      .finally(() => { glare.mesh.count = 0; glare.mesh.visible = false; glareReady = true; });
  };
  let dynReady = false, dynLast = -1;
  (async () => {                       // its pipeline compiled for ITS target (half float), off the frame
    dynMesh.count = 1; dynMesh.visible = true;
    const prev = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(nightGround.rt); await renderer.compileAsync(ground.dynScene, ground.cam);
      renderer.setRenderTarget(prev);
      // and drawn once (one black quad): its render object, bindings and instance buffers exist before the first night
      // frame (the first real draw at the day -> night switch took ~14 ms)
      ground.writeDyn(0, 0, 0, 1, 0, 0, -1, 1, 1, 0, 0, 0);
      ground.renderDynamic(renderer, 1);
    }
    catch (e) { console.warn("[night] dyn ground compile:", e); }
    finally { renderer.setRenderTarget(prev); dynMesh.count = 0; dynMesh.visible = false; dynReady = true; }
  })();

  // step 5: the shop windows (APERTURE lights through the real opening, in the facade's own frame) and the lit signs
  // (fascia, blade, pharmacy cross) of every loaded tile, from the street life's layout (shopLayout.js night.lights):
  // registries like the lamps' (a tile's lights fade in, ids stable); none of them is in the ground map (the city's map
  // holds the lamps only): they light the ground through the loop
  const shopReg = new LampRegistry(4096), signReg = new LampRegistry(4096);
  const street = { sources: { lamps, windows: EMPTY(), shops: shopReg, signs: signReg } };
  nightParams.shadowShare = 0.65;
  nightParams.shopI = 32;              // (the lab's tuned shop value; its default 24 left the sidewalk spill barely visible)
  const night = new NightSources(pool, street, { cars: CAR_CAP, shadowLights, sizes: { windows: 0, shops: 8, signs: 6 }, ground, baked: { shops: false, signs: false } });
  lamps.onRelease = (id) => night.shadow.release(id);
  if (!DEBUG) for (const t of Object.values(night.track)) t.on = false;     // (the pop metric: ?nightdebug=1)
  night.tram.on = false;

  // ---- cars
  let traffic = null, driver = null, tram = null;
  const SIM_CAP = 1024;
  // per sim slot, then GHOSTS slots (G0..G1) for cars that left the sim while lit (their lights fade out there)
  // (round 2: 128 ghosts, and only a car that was within CAR_R gets one: a tile unloading removes many cars at once,
  // and with the 64 all busy the oldest ghost was overwritten - its light jumped)
  const GHOSTS = 128, G0 = SIM_CAP + 1, G1 = G0 + GHOSTS, NS = G1;
  const lf = new Float32Array(NS), gen = new Uint32Array(SIM_CAP), wasAlive = new Uint8Array(SIM_CAP), inR = new Uint8Array(SIM_CAP);
  let ghostSteal = 0;
  const last = new Float32Array(NS * CAR.STRIDE);                    // each slot's last light data
  let gNext = G0;
  const toGhost = (i) => {
    let g = -1, lo = 2, gl = G0;
    for (let k = 0; k < GHOSTS; k++) { const c = G0 + ((gNext - G0 + k) % GHOSTS); if (lf[c] <= 0) { g = c; break; } if (lf[c] < lo) { lo = lf[c]; gl = c; } }
    if (g < 0) { g = gl; ghostSteal++; }                               // (all busy: the faintest one)
    gNext = G0 + ((g - G0 + 1) % GHOSTS);
    for (let j = 0; j < CAR.STRIDE; j++) last[g * CAR.STRIDE + j] = last[i * CAR.STRIDE + j];
    lf[g] = lf[i];
  };
  const lampsOf = new Map();                                         // type index -> { head: [x, y, z], tail: [x, y, z] } (car frame)
  const tmp = new Float32Array(CAR.STRIDE);
  const pick = new NearestN(CAR_CAP, CAR_R);
  const carId = new Int32Array(CAR_CAP);
  /** head / tail lamp centroids of a faceted type, from the parked fleet's vertex kinds (2 head, 3 tail) */
  const typeLamps = (ti, types) => {
    let L = lampsOf.get(ti);
    if (L) return L;
    const T = types[ti];
    const len = T.len, h = T.h;
    L = { head: [0, Math.min(0.75, h * 0.48), len / 2 - 0.15], tail: [0, Math.min(0.9, h * 0.55), -len / 2 + 0.1], fromKinds: false };
    const src = carFleet.types?.[T.name];
    const g = src?.lods?.[1]?.geo ?? src?.lods?.[0]?.geo;
    const K = g?.attributes?._kind, P = g?.attributes?.position;
    if (K && P) {
      const acc = { 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
      for (let i = 0; i < K.count; i++) { const k = Math.round(K.getX(i)); const a = acc[k]; if (a) { a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i); a[3]++; } }
      if (acc[2][3] && acc[3][3]) {
        L.head = acc[2].slice(0, 3).map((v) => v / acc[2][3]); L.tail = acc[3].slice(0, 3).map((v) => v / acc[3][3]);
        L.head[0] = 0; L.tail[0] = 0; L.fromKinds = true;          // (both lamps of a pair merged: one light per car end)
      }
    }
    if (src || carFleet.ready) lampsOf.set(ti, L);           // (the parked fleet still loading: ask again next frame)
    return L;
  };
  /** one car end's light data into o (CAR layout), from a pose: position, yaw (forward = sin, cos), pitch */
  const writeCar = (o, x, y, z, yaw, pitch, L, head, tail, fade, gy) => {
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    // (trafficFleet's frame: left = (cy, 0, -sy), up = (-sy sp, cp, -cy sp), forward = (sy cp, sp, cy cp))
    const at = (v, ahead, out, k) => {
      const lx = v[0], ly = v[1], lz = v[2] + ahead;
      out[k] = x + cy * lx - sy * sp * ly + sy * cp * lz;
      out[k + 1] = y + cp * ly + sp * lz;
      out[k + 2] = z - sy * lx - cy * sp * ly + cy * cp * lz;
    };
    at(L.head, 0.12, tmp, CAR.HX);
    const bp = pitch - 0.035;                                         // the beam aimed a little down
    tmp[CAR.FX] = sy * Math.cos(bp); tmp[CAR.FY] = Math.sin(bp); tmp[CAR.FZ] = cy * Math.cos(bp);
    at(L.tail, -0.6, tmp, CAR.TX);                                    // 60 cm behind: lights the road, not its bumper
    tmp[CAR.TY] = Math.max(tmp[CAR.TY], y + 0.35);
    tmp[CAR.HEAD] = head; tmp[CAR.TAIL] = tail; tmp[CAR.FADE] = fade; tmp[CAR.GY] = gy;
    last.set(tmp, o);
  };

  let tLast = performance.now(), frames = 0, lastScale = 0;
  const stats = { lamps: 0, tiles: 0, cars: 0, real: 0, dyn: 0, ms: 0, msAvg: 0, shadowRenders: 0, shadowSkips: 0, warmed: 0, ghostSteal: 0, dynFade: 1 };
  // ---- the lamp shadows' schedule (round 2): a shadowed lamp stands still, so its map only changes when something in
  // it moves. Re-rendered (a) the frame its lamp changes, (b) every frame a MOVER is within its reach (a traffic car,
  // the player's car, a tram, the camera itself - the walker / third-person character - moving near it), (c) when the
  // camera has moved MOVE_REFRESH m since its last render (the trees' cards morph with the view distance; the parked
  // cars / trees re-bucket their LODs), one of the two maps per frame for that. Otherwise the map is kept as it is.
  // ?nightshadow=full: every frame (round 1).
  const MOVER_R = 24 + 7, TRAM_R = 24 + 36, MOVE_REFRESH = 2;
  const sLamp = new Int32Array(2).fill(-2), sCam = [new THREE.Vector3(1e9, 0, 0), new THREE.Vector3(1e9, 0, 0)];
  const mover = new Uint8Array(2), lastCam = new THREE.Vector3(1e9, 0, 0);
  let refreshTurn = 0;
  // ---- the by-day warm-up of the lamp shadow maps (see WARM_LAYER)
  // queued casters, each with the time it was tagged: warmed WARM_DELAY ms later (a streamed tile fades in with fading
  // COPIES of its materials for ~0.9 s, lodFade.js: a render object made then would not be the one the night uses)
  const WARM_DELAY = 4000;
  const warmList = [], warmNow = [];
  let warming = 0;
  const warmShadows = (camPos) => {
    if (warming === 1) {                                              // (the warm render happened last frame: restore)
      for (const L of shadowLights) { L.shadow.camera.layers.set(LAMP_SHADOW_LAYER); L.shadow.camera.far = 26; L.shadow.camera.updateProjectionMatrix(); L.distance = nightParams.lampRange; L.shadow.needsUpdate = false; }
      for (let i = 0; i < warmNow.length; i++) warmNow[i].layers.disable(WARM_LAYER);
      stats.warmed += warmNow.length; warmNow.length = 0; warming = 0;
      return;
    }
    if (!warmList.length || frames < 4) return;
    // the due ones (tagged WARM_DELAY ago) join WARM_LAYER; the list is in tag order (objects and times interleaved)
    const due = performance.now() - WARM_DELAY;
    let k = 0;
    const retry = [];
    while (k < warmList.length && warmList[k + 1] <= due) {
      const o = warmList[k];
      k += 2;
      if (!o.parent) continue;                                         // (its tile is gone)
      // drawn as the night will draw it: shown (a streamed tile stays hidden while its shaders compile), not fading
      // (lodFade's material copies), not an empty instanced bucket; else again later (8 tries, then left out)
      let shown = !o.userData.fadeOrig && !(o.isInstancedMesh && o.count === 0);
      for (let q = o; shown && q; q = q.parent) if (!q.visible) shown = false;
      if (shown) { o.layers.enable(WARM_LAYER); warmNow.push(o); }
      else if ((o.userData.__nightWarmTries = (o.userData.__nightWarmTries || 0) + 1) < 8) retry.push(o);
    }
    if (!k) return;
    warmList.splice(0, k);
    for (const o of retry) warmList.push(o, performance.now());
    if (!warmNow.length) return;
    // both lamp maps (each light has its own shadow material: its own render objects), from 350 m up looking down, a
    // 2.5 km deep cone (155 deg): every caster tagged since the last warm-up, nothing else (WARM_LAYER); light 0 W
    for (const L of shadowLights) {
      L.position.set(camPos.x, camPos.y + 350, camPos.z); L.target.position.set(camPos.x, camPos.y - 10, camPos.z);
      L.updateMatrixWorld(); L.target.updateMatrixWorld();
      // (three's SpotLightShadow re-projects only when ITS far (light.distance || camera.far) differs from the camera's:
      // set here directly, so the projection is updated here, and again on the way back)
      L.distance = 0; L.shadow.camera.far = 2500; L.shadow.camera.updateProjectionMatrix(); L.shadow.camera.layers.set(WARM_LAYER);
      L.shadow.autoUpdate = false; L.shadow.needsUpdate = true;
    }
    warming = 1;
  };
  // ---- the pop metric per CAR (?nightdebug=1; nightSources' Track is per list position, the city's list is re-sorted
  // every frame): the largest frame-to-frame change of a car's real head / rear weight, and the worst event's details
  const dbg = DEBUG ? { carJump: 0, carJumpMax: 0, events: [], prev: new Float32Array(NS * 2), cur: new Float32Array(NS * 2), pos: new Float32Array(NS * 3), ppos: new Float32Array(NS * 3) } : null;
  const update = (camPos, cam) => {
    const t0 = performance.now(), dt = Math.min(0.1, (t0 - tLast) / 1000);
    tLast = t0; frames++;
    const n = env.uNight.value, scale = POOL_ON ? smooth01((n - 0.15) / 0.5) * api.master : 0;
    lamps.step(dt); shopReg.step(dt); signReg.step(dt);
    // the dynamic layer fades out with the height above the ground (120 -> 200 m: its 320 m square's edge would show)
    const hAbove = groundAt ? camPos.y - groundAt(camPos.x, camPos.z) : 0;
    const dynFade = 1 - smooth01((hAbove - 120) / 80);
    // the movers near the two shadowed lamps (their positions of last frame: a lamp change re-renders anyway)
    const S0 = shadowLights[0].position, S1 = shadowLights[1].position;
    mover[0] = mover[1] = 0;
    const near2 = (x, z, P, r) => { const dx = x - P.x, dz = z - P.z; return dx * dx + dz * dz < r * r; };
    // ---- the cars' light data: every live traffic car (drawn pose) within CAR_R + the player's car, nearest first
    let nc = 0;
    const D = night.carData;
    if (scale > 0) {
      pick.begin();
      const T = traffic?.T, sim = T?.sim;
      const R2 = (CAR_R + 20) * (CAR_R + 20), fstep = Math.min(dt, 1 / 30);
      if (sim) {
        const a = T.alpha ?? 1, b1 = 1 - a, types = T.types, m = Math.min(sim.cap, SIM_CAP);
        for (let i = 0; i < m; i++) {
          const o = i * CAR.STRIDE;
          if (sim.alive[i]) {
            if (!wasAlive[i] || gen[i] !== sim.gen[i]) {                  // a new car in this slot (the old one, if any, fades as a ghost)
              if (wasAlive[i] && inR[i] && lf[i] > 0) toGhost(i);
              lf[i] = 0; gen[i] = sim.gen[i]; wasAlive[i] = 1; inR[i] = 0;
            }
            lf[i] = Math.min(1, lf[i] + fstep / CAR_IN);
            const x = sim.px[i] * b1 + sim.x[i] * a, z = sim.pz[i] * b1 + sim.z[i] * a;
            const cx = x - camPos.x, cz = z - camPos.z;
            if (cx * cx + cz * cz > R2) { inR[i] = 0; continue; }          // (far: no light data, no ghost; its fade goes on)
            if (near2(x, z, S0, MOVER_R)) mover[0] = 1;
            if (near2(x, z, S1, MOVER_R)) mover[1] = 1;
            let yaw = sim.yaw[i]; const py = sim.pyaw[i]; let dyw = yaw - py;
            if (dyw > Math.PI) dyw -= 2 * Math.PI; else if (dyw < -Math.PI) dyw += 2 * Math.PI;
            yaw = py + dyw * a;
            const y = sim.py[i] * b1 + sim.y[i] * a;
            const brake = sim.bits[i] & 1;
            writeCar(o, x, y, z, yaw, sim.ppitch[i] * b1 + sim.pitch[i] * a, typeLamps(sim.type[i], types), 1, brake ? 1.6 : 1, smooth01(lf[i]), y);
            inR[i] = 1;
          } else if (wasAlive[i]) {                                          // gone (parked in, removed out of sight): a ghost
            wasAlive[i] = 0;
            if (inR[i] && lf[i] > 0) toGhost(i);
            lf[i] = 0; inR[i] = 0;
            continue;
          } else continue;
          if (last[o + CAR.FADE] <= 0) continue;
          const dx = last[o] - camPos.x, dz = last[o + 2] - camPos.z;
          pick.offer(i, dx * dx + dz * dz);
        }
      }
      // the ghosts: a car that left the sim, its lights fading at its last pose
      for (let g = G0; g < G1; g++) {
        if (lf[g] <= 0) continue;
        lf[g] = Math.max(0, lf[g] - fstep / CAR_OUT);
        const o = g * CAR.STRIDE;
        last[o + CAR.FADE] = smooth01(lf[g]);
        if (lf[g] <= 0) continue;
        const dx = last[o] - camPos.x, dz = last[o + 2] - camPos.z;
        pick.offer(g, dx * dx + dz * dz);
      }
      pick.end();
      // the player's car first (always offered), then the nearest traffic
      const c = driver?.on ? driver.state : null;
      if (c && driver.car) {
        const root = driver.car.root;
        root.updateMatrixWorld();
        const e = root.matrixWorld.elements, L = playerLamps();
        const put = (v, ahead, k) => {
          const lx = v[0], ly = v[1], lz = v[2] + ahead;
          D[k] = e[0] * lx + e[4] * ly + e[8] * lz + e[12]; D[k + 1] = e[1] * lx + e[5] * ly + e[9] * lz + e[13]; D[k + 2] = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
        };
        put(L.head, 0.12, CAR.HX); put(L.tail, -0.6, CAR.TX);
        const fl = Math.hypot(e[8], e[9], e[10]) || 1, fx = e[8] / fl, fy = e[9] / fl, fz = e[10] / fl, hl = Math.hypot(fx, fz) || 1;
        const s = Math.sin(0.035);
        D[CAR.FX] = fx; D[CAR.FY] = fy - s * hl; D[CAR.FZ] = fz;
        const bl = Math.hypot(D[CAR.FX], D[CAR.FY], D[CAR.FZ]); D[CAR.FX] /= bl; D[CAR.FY] /= bl; D[CAR.FZ] /= bl;
        D[CAR.TY] = Math.max(D[CAR.TY], c.y + 0.35);
        D[CAR.HEAD] = 1; D[CAR.TAIL] = c.braking ? 1.6 : 1; D[CAR.FADE] = 1; D[CAR.GY] = c.y;
        nc = 1; carId[0] = SIM_CAP;
        if (near2(e[12], e[14], S0, MOVER_R)) mover[0] = 1;
        if (near2(e[12], e[14], S1, MOVER_R)) mover[1] = 1;
      }
      for (let k = 0; k < pick.count && nc < CAR_CAP; k++) {
        carId[nc] = pick.i[k];
        const src = pick.i[k] * CAR.STRIDE, dst = nc * CAR.STRIDE;
        for (let j = 0; j < CAR.STRIDE; j++) D[dst + j] = last[src + j];
        nc++;
      }
      // the trams (their drawn fronts) and the camera itself moving near a shadowed lamp (the walker / character)
      const TD = tram?.drawn;
      if (TD) for (let k = 0; k < TD.n; k++) { const x = TD.xz[k * 2], z = TD.xz[k * 2 + 1]; if (near2(x, z, S0, TRAM_R)) mover[0] = 1; if (near2(x, z, S1, TRAM_R)) mover[1] = 1; }
      if (camPos.distanceToSquared(lastCam) > 1e-4) { if (near2(camPos.x, camPos.z, S0, MOVER_R)) mover[0] = 1; if (near2(camPos.x, camPos.z, S1, MOVER_R)) mover[1] = 1; }
    }
    lastCam.copy(camPos);
    night.carCount = nc;
    // ---- the pool (lamps, cars), the shadowed lamps, the far cars' ground pools (by day: once at 0, then nothing)
    if (scale > 0 || lastScale > 0 || frames < 4) night.update(camPos, dt, scale, false);
    lastScale = scale;
    if (dbg && scale > 0) popMetric(nc, D, dt, camPos);
    // ---- step 4: the far glare cards
    if (!glareReady && !glareCompiling && cam && GLARE_ON) compileGlare(cam);
    if (glareReady) {
      let g = 0;
      if (scale > 0) {
        // the lamps' cards (static lights, slowly changing weights) every other frame: kept in place in between (their
        // 600 m query is most of the glare's CPU); the cars' cards every frame, after them
        if ((frames & 1) || glareLampsN < 0 || Math.abs(scale - glareScale) > 0.01) {
          glareSel.begin(); lamps.query(camPos.x, camPos.y, camPos.z, GLARE_R, glareSel); glareSel.end();
          const LX = lamps.x, LY = lamps.y, LZ = lamps.z, F = lamps.fade;
          for (let k = 0; k < glareSel.count; k++) {
            const id = glareSel.i[k], w = scale * glareSel.weight(k) * F[id];
            if (w > 0.002) glare.write(g++, LX[id], LY[id], LZ[id], 0.45, 1.6 * w, 1.25 * w, 0.8 * w);
          }
          glareLampsN = g; glareScale = scale;
        } else g = glareLampsN;
      } else glareLampsN = -1;
      if (scale > 0) {
        // (the list is nearest first: the (GLARE_CARS + 1)-th car's distance is the cut-off, faded as NearestN does)
        gcx = camPos.x; gcz = camPos.z;
        const cut = nc > GLARE_CARS ? Math.min(CAR_R, dOf(GLARE_CARS)) : CAR_R;
        for (let i = 0; i < Math.min(nc, GLARE_CARS); i++) {
          const o = i * CAR.STRIDE, f = D[o + CAR.FADE] * scale * smooth01((cut - dOf(i)) / (cut * 0.38));
          if (f <= 0) continue;
          glare.write(g++, D[o], D[o + 1], D[o + 2], 0.35, 1.6 * f, 1.55 * f, 1.45 * f, D[o + 3], D[o + 4], D[o + 5]);
          const t = D[o + CAR.TAIL];
          glare.write(g++, D[o + 6] + D[o + 3] * 0.55, D[o + 7] + 0.15, D[o + 8] + D[o + 5] * 0.55, 0.22, 1.2 * f * t, 0.05 * f * t, 0.03 * f * t);
        }
      }
      if (g > 0 || glare.mesh.count > 0) glare.commit(g, cam, renderer.domElement.height);
    }
    // ---- the lamp shadow maps: rendered only when needed (no light: never)
    if (scale > 0 && warming) warmShadows(camPos);                    // (night fell during a warm-up frame: restore first)
    if (scale > 0) {
      let refreshed = false;
      for (let k = 0; k < 2; k++) {
        const L = shadowLights[k], id = night.shadow.lamp[k];
        L.shadow.autoUpdate = false;
        if (!(L.intensity > 0)) { sLamp[k] = -2; continue; }
        let go = api.shadowMode === "full" || id !== sLamp[k] || mover[k] === 1;
        // (the camera-moved refresh: one map per frame, alternating)
        if (!go && !refreshed && (refreshTurn & 1) === k && camPos.distanceToSquared(sCam[k]) > MOVE_REFRESH * MOVE_REFRESH) { go = true; refreshed = true; }
        if (go) { L.shadow.needsUpdate = true; sLamp[k] = id; sCam[k].copy(camPos); stats.shadowRenders++; } else stats.shadowSkips++;
      }
      refreshTurn++;
    } else if (lastScale <= 0 && frames >= 4) {
      for (const L of shadowLights) if (!warming) L.shadow.autoUpdate = false;
      sLamp[0] = sLamp[1] = -2;
      warmShadows(camPos);                                             // by day: warm the casters that arrived
    } else for (const L of shadowLights) L.shadow.autoUpdate = frames < 4;
    nightGround.uDyn.value = scale > 0 ? dynFade : 0;
    const q = scale > 0 && dynReady && dynFade > 0 ? night.dynCount : 0;
    // the far cars' pools at 30 Hz (the pass's CPU was ~0.2 ms: a whole renderer.render), at once when the camera has
    // moved far (a jump); the layer's origin follows the camera only when it is drawn, so the texture and the origin the
    // ground materials read always match
    const jump = Math.abs(camPos.x - (ground.x0 + half)) > 40 || Math.abs(camPos.z - (ground.z0 + half)) > 40;
    if (dynReady && (q > 0 || dynLast !== 0) && ((frames & 1) === 0 || jump || q === 0)) {   // (nothing to draw twice in a row: skip)
      ground.recentre(camPos.x - half, camPos.z - half);
      dynMesh.visible = q > 0;
      ground.renderDynamic(renderer, q);
      dynLast = q;
    }
    stats.casters = tagged; stats.lamps = lamps.count; stats.tiles = lamps.tileList.length; stats.cars = nc; stats.real = pool.active; stats.dyn = q; stats.dynFade = +dynFade.toFixed(2); stats.ghostSteal = ghostSteal;
    stats.ms = performance.now() - t0; stats.msAvg = stats.msAvg * 0.95 + stats.ms * 0.05;
  };
  const popMetric = (nc, D, dt, camPos) => {
    // (a frame after a hitch (> 50 ms) or a camera jump (> 2 m) is not a pop: counted apart, as `hitchJumpMax`)
    const step = dbg.cx === undefined ? 0 : Math.hypot(camPos.x - dbg.cx, camPos.z - dbg.cz);
    dbg.cx = camPos.x; dbg.cz = camPos.z;
    const clean = dt < 0.05 && step < 2;
    const sw = dbg.prev; dbg.prev = dbg.cur; dbg.cur = sw; dbg.cur.fill(0);
    const pw = dbg.ppos; dbg.ppos = dbg.pos; dbg.pos = pw;
    const TH = night.track.heads.cur, TR = night.track.rear.cur;
    for (let k = 0; k < nc; k++) {
      const id = carId[k], o = id * 2, q = k * CAR.STRIDE;
      dbg.cur[o] = TH[k]; dbg.cur[o + 1] = TR[k] / Math.max(1, D[q + CAR.TAIL]);
      dbg.pos[id * 3] = D[q]; dbg.pos[id * 3 + 1] = D[q + 2]; dbg.pos[id * 3 + 2] = D[q + CAR.FADE];
    }
    let m = 0, at = -1;
    for (let i = 0; i < dbg.cur.length; i++) { const d = Math.abs(dbg.cur[i] - dbg.prev[i]); if (d > m) { m = d; at = i; } }
    dbg.carJump = m;
    dbg.frames = (dbg.frames || 0) + 1;
    if (!clean) { dbg.hitchFrames = (dbg.hitchFrames || 0) + 1; if (m > (dbg.hitchJumpMax || 0)) dbg.hitchJumpMax = m; return; }
    dbg.cleanFrames = (dbg.cleanFrames || 0) + 1;
    if (m > 0.1) dbg.over01 = (dbg.over01 || 0) + 1;
    if (m > dbg.carJumpMax) dbg.carJumpMax = m;
    if (m > 0.3 && dbg.events.length < 50) {
      const id = at >> 1, sim = traffic?.T?.sim;
      dbg.events.push({ t: Math.round(performance.now()), id, end: at & 1 ? "rear" : "head", kind: id === SIM_CAP ? "player" : id > SIM_CAP ? "ghost" : "sim",
        w: [+dbg.prev[at].toFixed(3), +dbg.cur[at].toFixed(3)], pos: [dbg.ppos[id * 3], dbg.ppos[id * 3 + 1], dbg.pos[id * 3], dbg.pos[id * 3 + 1]].map((v) => +v.toFixed(1)),
        fade: [+dbg.ppos[id * 3 + 2].toFixed(3), +dbg.pos[id * 3 + 2].toFixed(3)], alive: id < SIM_CAP ? sim?.alive[id] : null, gen: id < SIM_CAP ? sim?.gen[id] : null,
        cutoff: +night.sel.heads.cutoff.toFixed(1), rcut: +night.sel.rear.cutoff.toFixed(1), dt: +dt.toFixed(3), step: +step.toFixed(2), ghostSteal, cam: [+lastCam.x.toFixed(1), +lastCam.z.toFixed(1)] });
    }
  };
  // the player's lamps: from its model's vertex kinds when it has them (a faceted pack car), else its size
  let pLamps = null, pModel = null;
  const playerLamps = () => {
    const m = driver.model;
    if (pLamps && pModel === m) return pLamps;
    pModel = m;
    const [w, h, l] = m?.size ?? [1.8, 1.45, 4.1];
    pLamps = { head: [0, Math.min(0.75, h * 0.48), l / 2 - 0.15], tail: [0, Math.min(0.9, h * 0.55), -l / 2 + 0.1] };
    const g = m?.lods?.[0]?.body?.[0]?.geo, K = g?.attributes?._kind, P = g?.attributes?.position;
    if (K && P) {
      const acc = { 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
      for (let i = 0; i < K.count; i++) { const k = Math.round(K.getX(i)); const a = acc[k]; if (a) { a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i); a[3]++; } }
      if (acc[2][3] && acc[3][3]) { pLamps.head = [0, acc[2][1] / acc[2][3], acc[2][2] / acc[2][3]]; pLamps.tail = [0, acc[3][1] / acc[3][3], acc[3][2] / acc[3][3]]; }
    }
    return pLamps;
  };
  updaters.push(update);
  // tag the lamp-shadow casters as things arrive (tiles, fleets, landmarks): a sweep every 2 s, each mesh once
  let tagged = 0;
  const sweep = () => { tagged += tagCasters(scene, warmList); };
  setInterval(sweep, 2000);
  const api = {
    master: 1,                          // (A/B in one page: 0 = every night light off, the lighting model kept)
    shadowMode: SHADOW_MODE,            // (A/B in one page: "smart" / "full")
    pool, night, lamps, ground, shadowLights, stats, nightParams, glare,
    addTile: (name, heads) => lamps.addTile(name, heads, performance.now()),
    removeTile: (name) => { lamps.removeTile(name); shopReg.removeTile(name); signReg.removeTile(name); },
    /** step 5: a tile's shop / sign lights (Float32Array records of NIGHT_LIGHT_STRIDE, shopLayout.js) */
    addShops: (name, rec) => {
      if (!rec?.length) return;
      const shops = [], shopItems = [], signs = [], signItems = [];
      for (let o = 0; o + NIGHT_LIGHT_STRIDE <= rec.length; o += NIGHT_LIGHT_STRIDE) {
        const at = { x: rec[o + 1], y: rec[o + 2], z: rec[o + 3] }, it = { nx: rec[o + 4], nz: rec[o + 5], hw: rec[o + 6], hh: rec[o + 7], col: [rec[o + 8], rec[o + 9], rec[o + 10]], b: 1 };
        if (rec[o] === 0) { shops.push(at); shopItems.push(it); } else { signs.push(at); signItems.push(it); }
      }
      const now = performance.now();
      shopReg.addTile(name, shops, now, shopItems); signReg.addTile(name, signs, now, signItems);
    },
    shops: shopReg, signs: signReg,
    setTraffic: (t) => { traffic = t; },
    setDriver: (d) => { driver = d; },
    setTram: (t) => { tram = t; },
    debug: dbg,                        // (?nightdebug=1: the pop metric, its worst events)
    /** (checks) queue every lamp-shadow caster for the next by-day warm-up */
    rewarm: () => { const t = performance.now() - WARM_DELAY; scene.traverse((o) => { if (o.isMesh && o.layers.isEnabled(LAMP_SHADOW_LAYER)) warmList.push(o, t); }); return warmList.length / 2; },
    /** the car-lamp offsets in use (check: forward z > 0 for the head, < 0 for the tail) */
    lampOffsets: () => [...lampsOf.entries()].map(([k, v]) => ({ type: traffic?.T?.types?.[k]?.name, ...v })),
  };
  window.__night = api;
  log(`night lights: on (?night=1)${POOL_ON ? "" : ", EMPTY pool (?nightpool=0)"} - clustered pool of ${pool.max}, 2 shadowed lamps, dynamic ground layer ${DYN.size} m`);
  return api;
}
