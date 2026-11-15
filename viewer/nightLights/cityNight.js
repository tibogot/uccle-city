// THE NIGHT LIGHTS IN THE CITY (?night=1, docs/NIGHT_HOOKUP.md): the lab's clustered light pool (nightLighting.js,
// lightSelect.js, nightSources.js, groundLight.js) fed by the city's own sources. main.js imports this module only
// under the flag (nightMode.js NIGHT, decided at boot, never toggled).
//
//   step 0  installNightLighting(renderer) BEFORE renderer.init(): renderer.lighting = NightLighting(pool). Every lit
//           material compiles the cluster loop once, at boot (the warm-up): no pipeline is created later for it.
//           ?nightpool=0 keeps the lighting model with an EMPTY pool (the loop's fixed cost, for A/B).
//   step 1  STREET LAMPS: a registry of every loaded tile's lamp heads (addTile / removeTile from main.js loadTile and
//           its dispose); stable ids in fixed arrays (no allocation per frame), a 32 m grid per tile; each tile's
//           lamps fade in over FADE_IN s after it loads (a streamed tile never pops its lights in). The 16 (fix3; was 24) nearest
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
import { nightGround, DYN, nightMap } from "./nightMode.js";
import { MAP } from "./nightMap.js";
import { NIGHT_WIN_STRIDE } from "./litHash.js";
import { createCones, coneLook } from "./lightCones.js";
import { nightLook, nightSpotsOn } from "./nightLighting.js";
import { env } from "../lighting.js";
import { carFleet } from "../carFleet.js";
import { wx } from "../weather/weatherState.js";
import { cityWeather } from "../weather/cityWeather.js";
import { cityStops } from "../stops/cityStops.js";

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
// fix3 (docs/FIX3.md): 16 real pool lamps (was 24; ?nightlamps=24 = before): every lamp is in the ground light map
// anyway, the pool ones only add the walls / crowns / specular near the camera (faded 40-60 m)
const REAL_LAMPS = Math.max(4, Math.min(48, +(new URLSearchParams(location.search).get("nightlamps") || 16)));
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
const SHADOW_MODE = qp.get("nightshadow") || "alt";    // "alt" (round 3 default: on a busy street both maps had movers every frame, +0.8-1.8 ms; alt renders at most one of them a frame then) | "smart" (re-render on change, round 2) | "full" (every frame, round 1)
const BUILDING = /^(buildings-|kit |facade|roof|terrain|ground|bridge|tunnel)/i;
// fix4 item 3 (docs/FIX4.md): THE LAMP MAPS' STATIC CACHE. A passing car re-rendered the whole lamp map (~37 draws at
// Place Saint-Job: parked cars, sign poles, garden walls, benches, pumps, shop fronts, tree proxies...) every frame it
// was within reach: +0.8 ms CPU, GPU in the noise on a busy street. Now the MOVERS (traffic, two-wheelers, trams,
// trains, the player's vehicle, skinned meshes, userData.nightMover / lampMover) cast on a layer of their own; a lamp
// map's STATIC casters are drawn only when the lamp changes or the camera moved (as before), and copied aside (a
// depth32float copy, 1 MB); a frame where only movers changed copies the static depth back and draws the movers on top
// (1-3 draws). ?lampcache=0: off (every re-render draws everything, the round 3 schedule).
const LAMP_CACHE = qp.get("lampcache") !== "0";
const MOVER_LAYER = 11;
const MOVER_NAME = /^(traffic-|twowheel-traffic|tram\d+-|train-)/;   // (tram\d+: not "tram-poles")
function isLampMover(o) {
  if (o.isSkinnedMesh || o.userData.nightMover || o.userData.lampMover) return true;
  for (let q = o; q; q = q.parent) if (MOVER_NAME.test(q.name || "") || q.userData.lampMover) return true;
  return false;
}
const moverTops = new Set();                               // the scene's top-level objects holding a mover-layer mesh (sweep)
class LampShadowNode extends THREE.ShadowNode {
  constructor(light, shadow) { super(light, shadow); this.on = true; this.hid = []; this.plan = "full"; this.cache = null; this.cacheOk = false; this.counts = { full: 0, movers: 0, plain: 0 }; }
  setupRenderTarget(shadow, builder) {
    const r = super.setupRenderTarget(shadow, builder);
    r.depthTexture.type = THREE.FloatType;                 // depth32float: copyable (depth24plus is not)
    this.cache = new THREE.DepthTexture(shadow.mapSize.width, shadow.mapSize.height, THREE.FloatType);
    this.cache.name = "LampShadowStaticCache";
    return r;
  }
  renderShadow(frame) {
    const cam = this.shadow.camera, mask = cam.layers.mask, M = 1 << MOVER_LAYER;
    // (the by-day warm-up draws WARM_LAYER from 350 m up: three's own path, and the cache is stale after it)
    if (!this.on || !this.cache || !(mask & M)) { this.cacheOk = false; this.counts.plain++; return super.renderShadow(frame); }
    const { renderer, scene } = frame, map = this.shadowMap;
    this.shadow.updateMatrices(this.light);
    map.setSize(this.shadow.mapSize.width, this.shadow.mapSize.height, map.depth);
    const name = scene.name;
    scene.name = `Shadow Map [ ${this.light.name} ]`;
    if (this.plan === "full" || !this.cacheOk) {
      cam.layers.mask = mask & ~M;
      renderer.render(scene, cam);
      renderer.copyTextureToTexture(map.depthTexture, this.cache);
      this.cacheOk = true; this.counts.full++;
    } else {
      renderer.copyTextureToTexture(this.cache, map.depthTexture);
      this.counts.movers++;
    }
    cam.layers.mask = M;
    const ac = renderer.autoClear;
    renderer.autoClear = false;                              // (on the static depth just drawn / copied back)
    // (the movers' pass walks only the scene's top-level groups that hold a mover: the rest hidden for the call)
    const tops = moverTops, hid = this.hid; hid.length = 0;
    if (tops.size) for (const c of scene.children) if (c.visible && !tops.has(c) && !c.isLight) { c.visible = false; hid.push(c); }
    renderer.render(scene, cam);
    for (const c of hid) c.visible = true;
    renderer.autoClear = ac;
    cam.layers.mask = mask;
    scene.name = name;
  }
}
function tagCasters(root, warm, tileCasters = null) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.userData.__nightTag) return;
    o.userData.__nightTag = true;
    if (BUILDING.test(o.name || "") || BUILDING.test(o.parent?.name || "")) return;
    let small = o.isInstancedMesh || o.isSkinnedMesh;
    if (!small) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); small = (g.boundingSphere?.radius ?? 1e9) * o.matrixWorld.getMaxScaleOnAxis() < 12; }
    if (small) {
      if (LAMP_CACHE && isLampMover(o)) o.layers.enable(MOVER_LAYER); else o.layers.enable(LAMP_SHADOW_LAYER);
      warm.push(o, performance.now()); n++;
      // a TILE's instanced set (its trees, lamps, bollards...: one mesh for the whole 500 m tile, a bounding sphere the
      // lamp's 24 m frustum always meets): remembered with its tile, gated by reach below (TILE_REACH)
      if (tileCasters && o.isInstancedMesh) { let t = o; while (t && !/^[A-Z]\d+-/.test(t.name || "")) t = t.parent; if (t) tileCasters.push({ o, tile: t.name.split("-")[0] }); }
    }
  });
  return n;
}
// perf audit 2026-11-14 (docs/perf/AUDIT.md step 11): a lamp map drew every loaded tile's instanced sets (9 tiles x 6
// tree meshes + lamps + bollards ...: ~135 draws, ~0.5 M triangles a map). A tile's sets now stay in the lamp layer
// only while a shadowed lamp is within REACH of that tile's square (the lamp's 26 m range + a crown). ?lampreach=0: off.
const TILE_REACH = qp.get("lampreach") !== "0", REACH = 26 + 12;
// round 3: a tile's instanced set (trees, bollards, chairs, parked cars...) is no longer drawn whole into a lamp map: a
// PROXY per (set, lamp) holds only its instances within REACH of that lamp (refilled each time the map renders; the
// set's own geometry + material: the same shadow pipeline, its per-instance attributes copied), on that lamp's own layer
// (PROXY_LAYER + k: the main camera never sees it). Round 2 drew 72 tree draws / 318 k triangles per 2 maps at Place
// Saint-Job. ?lampproxy=0: the tile gate above (whole sets).
const EMPTY_WARM = /^(traffic-car-batch|parked-car-batch|train-)/;      // (round 3) empty by day, filled at night: warmed with one zero-size instance
const PROXY = TILE_REACH && qp.get("lampproxy") !== "0", PROXY_LAYER = 12, PROXY_CAP = 128;   // (fix4: was 8, so lamp 1 drew on 9 = the pond reflection's POND_LAYER)

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
  constructor(cap = 16384, recStride = 0) {
    this.cap = cap;
    // round 3: a kind with many sources (lit windows: ~5-10k a tile) keeps its records in one typed array (recStride
    // floats per id: nx nz hw hh r g b) instead of an object per source; inMap[id] = 1 once its tile's ground map has
    // it (nightMap.js): the ground then skips it in the loop (flag "baked"), never before (no light lost meanwhile)
    this.recStride = recStride;
    this.rec = recStride ? new Float32Array(cap * recStride) : null;
    this.inMap = new Uint8Array(cap);
    this.x = new Float32Array(cap).fill(1e9); this.y = new Float32Array(cap); this.z = new Float32Array(cap).fill(1e9);
    this.fade = new Float32Array(cap);
    this.free = new Int32Array(cap); this.nFree = cap;
    for (let i = 0; i < cap; i++) this.free[i] = cap - 1 - i;
    this.tiles = new Map(); this.tileList = [];
    this.list = new Array(cap).fill(null);       // per id: the source's record (shops / signs: normal, size, colour)
    this.onRelease = null;
    this.count = 0;
  }
  /** heads: [{ x, y, z }], or (flat) a Float32Array of records `stride` floats each, x y z first, the rest -> rec */
  addTile(name, heads, now, items = null, stride = 0) {
    const N = stride ? Math.floor((heads?.length ?? 0) / stride) : heads?.length ?? 0;
    if (this.tiles.has(name) || !N) return;
    const n = Math.min(N, this.nFree);
    if (n < N) console.warn(`[night] registry full: ${N - n} sources of ${name} left out`);
    const ids = new Int32Array(n), lx = new Float32Array(n), ly = new Float32Array(n), lz = new Float32Array(n);
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    const RS = this.recStride;
    for (let k = 0; k < n; k++) {
      const id = this.free[--this.nFree];
      let x, y, z;
      if (stride) { const o = k * stride; x = heads[o]; y = heads[o + 1]; z = heads[o + 2]; for (let j = 0; j < RS; j++) this.rec[id * RS + j] = heads[o + 3 + j]; }
      else { const h = heads[k]; x = h.x; y = h.y; z = h.z; }
      if (items) this.list[id] = items[k];
      ids[k] = id; this.x[id] = lx[k] = x; this.y[id] = ly[k] = y; this.z[id] = lz[k] = z; this.fade[id] = 0; this.inMap[id] = 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
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
      this.x[id] = this.z[id] = 1e9; this.fade[id] = 0; this.list[id] = null; this.inMap[id] = 0;
      this.onRelease?.(id);
      this.free[this.nFree++] = id;
    }
    this.count -= rec.ids.length;
  }
  /** (round 3) the tile's sources are in the ground map now (or no longer) */
  setInMap(name, on) { const r = this.tiles.get(name); if (r) for (const id of r.ids) this.inMap[id] = on ? 1 : 0; }
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
    const L = new THREE.SpotLight(0xffffff, 0, 24, 1.35, 0.3, 2);
    // (round 3) the pool lamp's own colour, LINEAR (0xffc785 as hex is sRGB: (1, 0.57, 0.24) linear, redder than the
    // pool's (1, 0.78, 0.52); the ground's subtract slot below takes exactly this light back out of the map)
    L.color.setRGB(1.0, 0.78, 0.52);
    L.name = `night-shadow-lamp-${k}`; L.userData.nightShadowLamp = true;
    L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.03; L.shadow.radius = 3;
    L.shadow.camera.near = 0.3; L.shadow.camera.far = 26;
    L.shadow.camera.layers.set(LAMP_SHADOW_LAYER);                 // only the street-scale casters (tagCasters below)
    L.shadow.camera.layers.enable(PROXY_LAYER + k);                 // (round 3) + its own proxies of the tile-wide sets
    if (LAMP_CACHE) { L.shadow.camera.layers.enable(MOVER_LAYER); L.shadow.shadowNode = new LampShadowNode(L, L.shadow); }   // (fix4) the movers' layer + the static cache
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
  // round 3, step 6: the LIT WINDOWS of every loaded tile (the tile worker's records, litHash.js: the facade shader's
  // own hash, so the windows that glow are the ones that light): the 16 nearest are real APERTURE pool lights (the
  // patch on the pavement, the front garden, the opposite wall), faded out at 40-60 m; all of them light the ground
  // through the tile's ground map (step 7)
  const winReg = new LampRegistry(1 << 17, NIGHT_WIN_STRIDE - 3);
  const street = { sources: { lamps, windows: winReg, shops: shopReg, signs: signReg } };
  nightParams.shadowShare = 0.65;
  nightParams.shopI = 32;              // (the lab's tuned shop value; its default 24 left the sidewalk spill barely visible)
  // step 8: the light cones in damp air (lightCones.js): only when the street is wet or the air is foggy
  const cones = createCones(48);
  cones.mesh.visible = false;
  scene.add(cones.mesh);
  // (the ground skips a static light in the loop only once its tile's map has it: registry inMap, per source)
  const night = new NightSources(pool, street, { cars: CAR_CAP, shadowLights, cones, sizes: { lamps: REAL_LAMPS, windows: 16, shops: 8, signs: 8, heads: 6, rear: 6 }, ground });   // (round 3: 6 + 6 real car lights, was 12 + 12: the low beams were most of the night GPU at street level, +0.5-1.1 ms; the others light the road through the dynamic layer)
  // round 3: the ground's SUBTRACT slots, one per shadowed lamp (nightLighting.js groundOnly): the ground map has every
  // lamp in full, the shadowed lamp's SpotLight adds its share again WITH its shadow: minus the same spot unshadowed,
  // plus the spot shadowed = the map where nothing shades it (rounds 1-2 lit the ground under the 2 nearest lamps twice)
  const antiBase = pool.reserve(2);
  lamps.onRelease = (id) => night.shadow.release(id);
  // ---- round 3, step 7: the GROUND LIGHT MAP per tile (nightMap.js), baked in nightBakeWorker.js once the tile's
  // static lights are all known (its lamps + lit windows at addTile, its shops / signs / stop posters at addShops, or
  // 20 s later without them); the layer fades in with the tile
  const bake = { worker: null, jobs: new Map(), tiles: new Map(), free: [], ms: 0, n: 0, uploads: 0, fading: false };
  for (let i = nightMap.slots - 1; i >= 0; i--) bake.free.push(i);
  let bakeId = 0;
  const bakeWorker = () => bake.worker ??= (() => {
    const w = new Worker(new URL("./nightBakeWorker.js", import.meta.url), { type: "module" });
    w.onmessage = (ev) => bakeDone(ev.data);
    w.onerror = (e) => console.warn("[night] bake worker:", e.message);
    return w;
  })();
  const cellOf = (b) => ({ i: Math.round((b.x0 - MAP.X0) / MAP.TILE), j: Math.round((b.z0 - MAP.Z0) / MAP.TILE) });
  const groundGrid = (b, groundAt) => {
    const step = 8, g0x = b.x0 - MAP.MARGIN - step, g0z = b.z0 - MAP.MARGIN - step, n = Math.ceil((MAP.SPAN + 2 * step) / step) + 1;
    const y = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = groundAt(g0x + i * step, g0z + j * step); y[j * n + i] = Number.isFinite(v) ? v : 0; }
    return { g0x, g0z, step, n, y };
  };
  const bakeTile = (name) => {
    const T = bake.tiles.get(name);
    if (!T || T.sent) return;
    clearTimeout(T.timer);
    T.sent = true;
    const id = ++bakeId;
    bake.jobs.set(id, name);
    const p = nightParams;
    bakeWorker().postMessage({ id, x0: T.b.x0, z0: T.b.z0, res: MAP.RES, span: MAP.SPAN, margin: MAP.MARGIN, emax: MAP.EMAX, ground: T.ground,
      lamps: T.lamps, windows: T.windows, shops: T.shops ?? new Float32Array(0),
      p: { lampI: p.lampI, lampRange: p.lampRange, lampUp: p.lampUp, lampBatwing: p.lampBatwing, windowI: p.windowI, windowRange: p.windowRange, shopI: p.shopI, shopRange: p.shopRange, signI: p.signI, signRange: p.signRange } });
  };
  const bakeDone = ({ id, data, ms }) => {
    const name = bake.jobs.get(id);
    bake.jobs.delete(id);
    const T = name && bake.tiles.get(name);
    if (!T) return;                                           // (the tile left meanwhile)
    if (T.slot < 0) {
      if (!bake.free.length) { console.warn(`[night] ground map: no free layer for ${name} (its static lights light the ground through the pool)`); return; }
      T.slot = bake.free.pop();
    }
    const A = nightMap.arr, L = MAP.RES * MAP.RES * 4;
    A.image.data.set(data, T.slot * L);
    A.addLayerUpdate(T.slot); A.needsUpdate = true;
    bake.ms += ms; bake.n++; bake.uploads += data.byteLength;
    const c = T.cell, o = (c.j * MAP.NX + c.i) * 4;
    if (c.i >= 0 && c.i < MAP.NX && c.j >= 0 && c.j < MAP.NZ) { nightMap.table[o] = T.slot; nightMap.table[o + 1] = 0; nightMap.slotTex.needsUpdate = true; }
    T.t = 0; T.ready = true; bake.fading = true;
    // its static lights are in the map now: the ground skips them in the loop
    lamps.setInMap(name, true); winReg.setInMap(name, true); shopReg.setInMap(name, true); signReg.setInMap(name, true); signReg.setInMap(name + "#stops", true);
  };
  /** the map layers' fade-in (the slot table's g), by frame time capped like the lamps' */
  const stepBake = (dt) => {
    if (!bake.fading) return;
    bake.fading = false;
    const k = Math.min(dt, 1 / 30) / FADE_IN;
    for (const T of bake.tiles.values()) {
      if (!T.ready || T.t >= 1) continue;
      T.t = Math.min(1, T.t + k); bake.fading = true;
      const c = T.cell, o = (c.j * MAP.NX + c.i) * 4;
      if (c.i >= 0 && c.i < MAP.NX && c.j >= 0 && c.j < MAP.NZ) nightMap.table[o + 1] = Math.round(smooth01(T.t) * 255);
    }
    nightMap.slotTex.needsUpdate = true;
  };
  const dropBake = (name) => {
    const T = bake.tiles.get(name);
    if (!T) return;
    clearTimeout(T.timer);
    bake.tiles.delete(name);
    if (T.slot >= 0) {
      const c = T.cell, o = (c.j * MAP.NX + c.i) * 4;
      if (c.i >= 0 && c.i < MAP.NX && c.j >= 0 && c.j < MAP.NZ && nightMap.table[o] === T.slot) { nightMap.table[o] = 255; nightMap.table[o + 1] = 0; nightMap.slotTex.needsUpdate = true; }
      bake.free.push(T.slot);
    }
  };
  // the STIB stop posters (backlit cases of the shelters, free-standing ad panels: viewer/stops/): sign lights, one
  // per lit poster face, from the kit's poster geometry (its faces grouped by their outward normal, in the piece's frame)
  let posterFaces = null;
  const posterFacesOf = () => {
    if (posterFaces) return posterFaces;
    const kit = cityStops.kit;
    if (!kit) return null;
    posterFaces = {};
    for (const k of ["shelter", "adpanel"]) {
      const g = kit.pieces[k]?.poster, P = g?.attributes.position, Nn = g?.attributes.normal;
      if (!P || !Nn) continue;
      const groups = [];
      for (let i = 0; i < P.count; i++) {
        const nx = Nn.getX(i), nz = Nn.getZ(i), l = Math.hypot(nx, nz);
        if (l < 0.7) continue;
        let G = groups.find((q) => q.nx * nx / l + q.nz * nz / l > 0.9);
        if (!G) groups.push(G = { nx: nx / l, nz: nz / l, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity });
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        G.x0 = Math.min(G.x0, x); G.x1 = Math.max(G.x1, x); G.y0 = Math.min(G.y0, y); G.y1 = Math.max(G.y1, y); G.z0 = Math.min(G.z0, z); G.z1 = Math.max(G.z1, z);
      }
      // (a face's centre, outward normal, half width along it, half height)
      posterFaces[k] = groups.map((G) => ({ x: (G.x0 + G.x1) / 2, y: (G.y0 + G.y1) / 2, z: (G.z0 + G.z1) / 2, nx: G.nx, nz: G.nz,
        hw: Math.max(Math.abs(G.nx) < 0.5 ? G.x1 - G.x0 : G.z1 - G.z0, 0.2) / 2, hh: (G.y1 - G.y0) / 2 }));
    }
    return posterFaces;
  };
  const POSTER_RGB = [0.92, 0.96, 1.0];               // cool white LED light boxes
  const stopSigns = (name) => {
    const t = cityStops.tiles?.get(name), PF = posterFacesOf();
    if (!t || !PF) return null;
    const heads = [], items = [], flat = [];
    for (const k of ["shelter", "adpanel"]) {
      const a = t.inst[k], F = PF[k];
      if (!a || !F?.length) continue;
      for (let o = 0; o < a.length; o += 8) {
        const yaw = a[o + 3], c = Math.cos(yaw), sn = Math.sin(yaw);
        for (const f of F) {
          // (rotation Y by yaw: local (x, z) -> (c x + s z, -s x + c z))
          const nx = c * f.nx + sn * f.nz, nz = -sn * f.nx + c * f.nz, out = 0.35;
          const x = a[o] + c * f.x + sn * f.z + nx * out, z = a[o + 2] - sn * f.x + c * f.z + nz * out, y = a[o + 1] + f.y;
          heads.push({ x, y, z }); items.push({ nx, nz, hw: f.hw, hh: f.hh, col: POSTER_RGB, b: 1 });
          flat.push(1, x, y, z, nx, nz, f.hw, f.hh, POSTER_RGB[0], POSTER_RGB[1], POSTER_RGB[2]);
        }
      }
    }
    return { heads, items, flat };
  };
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
  const stats = { lamps: 0, tiles: 0, cars: 0, real: 0, dyn: 0, ms: 0, msAvg: 0, shadowRenders: 0, shadowFull: 0, shadowSkips: 0, warmed: 0, ghostSteal: 0, dynFade: 1 };
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
      shadowLights.forEach((L, k) => { L.shadow.camera.layers.set(LAMP_SHADOW_LAYER); L.shadow.camera.layers.enable(PROXY_LAYER + k); if (LAMP_CACHE) L.shadow.camera.layers.enable(MOVER_LAYER); L.shadow.camera.far = 26; L.shadow.camera.updateProjectionMatrix(); L.distance = nightParams.lampRange; L.shadow.needsUpdate = false; });
      for (let i = 0; i < warmNow.length; i++) {
        const o = warmNow[i]; o.layers.disable(WARM_LAYER);
        if (o.userData.proxyOf) { o.count = 0; o.visible = false; }
        if (o.userData.__warmHid0) { o.layers.enable(0); delete o.userData.__warmHid0; }
        if (o.userData.__warmEmpty) { const M = o.instanceMatrix.array; if (o.count === 1 && M[0] === 0 && M[5] === 0 && M[10] === 0) { o.count = 0; if (o.userData.__warmEmpty === 2) o.visible = false; } delete o.userData.__warmEmpty; }
      }
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
      // (a lamp-shadow proxy: drawn with one zero-size instance - only its render object is wanted - when its set is
      // shown and not fading; it is never on a layer the main camera draws)
      const src = o.userData.proxyOf;
      if (src) {
        let ok = !src.userData.fadeOrig;
        for (let q = src; ok && q; q = q.parent) if (!q.visible && q !== src) ok = false;
        if (ok && src.parent) { o.material = src.material; o.instanceMatrix.array.fill(0, 0, 16); o.count = 1; o.visible = true; o.layers.enable(WARM_LAYER); warmNow.push(o); }
        else if (src.parent && (o.userData.__nightWarmTries = (o.userData.__nightWarmTries || 0) + 1) < 8) retry.push(o);
        continue;
      }
      // (round 3) an EMPTY instanced batch whose cars only come at night (traffic-car-batch: round 2's 8 render objects
      // at the switch): drawn once with one zero-size instance (its instance 0 is unused while its count is 0)
      if (o.isInstancedMesh && o.count === 0 && EMPTY_WARM.test(o.name || "") && !o.userData.fadeOrig && (o.userData.__nightWarmTries || 0) >= 2) {
        let ok = true;
        for (let q = o.parent; ok && q; q = q.parent) if (!q.visible) ok = false;
        if (ok) {
          o.instanceMatrix.array.fill(0, 0, 16); o.instanceMatrix.clearUpdateRanges(); o.instanceMatrix.addUpdateRange(0, 16); o.instanceMatrix.needsUpdate = true;
          o.userData.__warmEmpty = o.visible ? 1 : 2; o.count = 1; o.visible = true; o.layers.enable(WARM_LAYER); warmNow.push(o);
          // (fix4 item 5) off the MAIN camera's layer for this warm frame: shown with count 1 it was drawn by the main pass
          // too, and the traffic's 64 batches built their main node graphs in that ONE frame (a 0.8-0.9 s long task
          // ~10 s after the reveal); their main pass is precompiled one batch at a time (trafficFleet.js)
          if (o.layers.isEnabled(0)) { o.layers.disable(0); o.userData.__warmHid0 = true; }
          continue;
        }
      }
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
    lamps.step(dt); shopReg.step(dt); signReg.step(dt); winReg.step(dt); stepBake(dt);
    // round 3: the ground map's light follows the night (0 by day: the ground materials read nothing); step 8: the
    // weather's wet film drives the loop's wet path (a baked light's SPECULAR on the wet ground: the lamps' and
    // windows' streaks), the cones show in damp / foggy air only
    nightMap.uScale.value = scale;
    const wet = wx.uWet.value, vis = cityWeather.weather?.input?.vis ?? 30000;
    nightLook.uWet.value = scale > 0 ? wet : 0;
    const fog = 1 - smooth01((vis - 800) / 2200);                     // 1 under 800 m of visibility, 0 over 3 km
    const wetNow = scale > 0 && (wet > 0.2 || fog > 0.05);
    coneLook.uDensity.value = nightParams.coneDensity * (1 + 1.5 * Math.min(1, wet / 0.6) + 3 * fog);
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
      const root = c ? (driver.lampRoot ?? driver.car?.root) : null;      // (the car, or the motorbike's leaning frame)
      if (c && root) {
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
      // (round 3) the other movers: SNCB trains (points along each train near the camera, refreshed every 12 frames:
      // +8 m for the motion in between), skinned meshes (the falcons, characters) and anything tagged
      // userData.nightMover (the flags), each at its world position when shown
      if ((frames % 12) === 0) trainPoints(camPos);
      for (let k = 0; k < trainPts.n; k++) { const x = trainPts.xz[k * 2], z = trainPts.xz[k * 2 + 1]; if (near2(x, z, S0, MOVER_R + 8)) mover[0] = 1; if (near2(x, z, S1, MOVER_R + 8)) mover[1] = 1; }
      for (let k = 0; k < moverObjs.length; k++) {
        const o = moverObjs[k];
        if (!o.visible || !o.parent?.visible) continue;
        const e = o.matrixWorld.elements, r = MOVER_R + (o.userData.nightMover > 1 ? o.userData.nightMover : 2);
        if (near2(e[12], e[14], S0, r)) mover[0] = 1;
        if (near2(e[12], e[14], S1, r)) mover[1] = 1;
      }
    }
    lastCam.copy(camPos);
    night.carCount = nc;
    // ---- the pool (lamps, cars), the shadowed lamps, the far cars' ground pools (by day: once at 0, then nothing)
    // step 8: the nearest drawn tram's lights (lead cab low beam, rear, saloon: nightSources' 5 tram slots)
    const TD = tram?.drawn, TT = night.tram;
    TT.on = false;
    if (scale > 0 && TD?.n && TD.rear) {
      let best = -1, bd = 250 * 250;
      for (let k = 0; k < TD.n; k++) { const dx = TD.xz[k * 2] - camPos.x, dz = TD.xz[k * 2 + 1] - camPos.z, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; best = k; } }
      if (best >= 0) {
        const hx = TD.xz[best * 2], hz = TD.xz[best * 2 + 1], rx = TD.rear[best * 3], rz = TD.rear[best * 3 + 1], l = Math.hypot(hx - rx, hz - rz) || 1;
        TT.on = true; TT.hx = hx; TT.hz = hz; TT.rx = rx; TT.rz = rz; TT.fx = (hx - rx) / l; TT.fz = (hz - rz) / l; TT.gy = TD.rear[best * 3 + 2];
      }
    }
    if (scale > 0 || lastScale > 0 || frames < 4) night.update(camPos, dt, scale, wetNow);
    // the ground's subtract slots: each shadowed lamp's spot, unshadowed, ground only (see antiBase)
    for (let k = 0; k < 2; k++) {
      const L = shadowLights[k], id = night.shadow.lamp[k];
      if (scale > 0 && L.intensity > 0 && id >= 0 && lamps.inMap[id] === 1) {
        const I = L.intensity / scale;
        pool.set(antiBase + k, L.position.x, L.position.y, L.position.z, L.distance, L.color.r * I, L.color.g * I, L.color.b * I, 1, 0);
        pool.spot(antiBase + k, 0, -1, 0, L.angle, L.angle * (1 - L.penumbra));
        pool.profile(antiBase + k, 0); pool.diffuseOnly(antiBase + k, true); pool.groundOnly(antiBase + k, true);
      } else pool.weight(antiBase + k, 0);
    }
    // (night default) the spots' branch in every lit material: open only while one of them gives light
    nightSpotsOn.value = shadowLights[0].intensity > 0 || shadowLights[1].intensity > 0 ? 1 : 0;
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
      if (TILE_REACH && !PROXY) gateTiles();
      for (let k = 0; k < 2; k++) {
        const L = shadowLights[k], id = night.shadow.lamp[k];
        L.shadow.autoUpdate = false;
        if (!(L.intensity > 0)) { sLamp[k] = -2; continue; }
        let full = api.shadowMode === "full" || id !== sLamp[k];
        let go = full || (mover[k] === 1 && api.shadowMode !== "calm");   // ("calm": movers ignored, a measurement mode)
        const cached = api.lampCache && !!L.shadow.shadowNode?.cacheOk;
        // ("alt", perf audit 2026-11-14: at most ONE lamp map a frame while things move, the two lamps alternating: a
        // moving car's lamp shadow at 30 Hz; a lamp change still renders at once). (fix4) With the static cache a
        // movers-only update is a copy + 1-3 draws: both maps every frame (60 Hz car shadows); a FULL one stays one a frame
        if (go && !full && !cached && api.shadowMode === "alt" && (refreshed || (refreshTurn & 1) !== k) && mover[1 - k] === 1) go = false;
        // (the camera-moved refresh: one map per frame, alternating; a FULL render: the static casters re-bucket)
        if (!full && !refreshed && (refreshTurn & 1) === k && camPos.distanceToSquared(sCam[k]) > MOVE_REFRESH * MOVE_REFRESH) { go = true; full = true; refreshed = true; }
        if (go) {
          L.shadow.needsUpdate = true; sLamp[k] = id; stats.shadowRenders++;
          if (full || !cached) { sCam[k].copy(camPos); if (api.shadowMode === "alt") refreshed = true; if (PROXY) fillProxies(k, L.position); stats.shadowFull++; }
          if (L.shadow.shadowNode) { L.shadow.shadowNode.on = api.lampCache; L.shadow.shadowNode.plan = api.lampCache && !full ? "movers" : "full"; }
        } else stats.shadowSkips++;
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
    if (dynReady && (q > 0 || dynLast !== 0) && (frames % 3 === 0 || jump || q === 0)) {   // (nothing to draw twice in a row: skip; round 3: 20 Hz, the far pools step < 1 m)
      ground.recentre(camPos.x - half, camPos.z - half);
      dynMesh.visible = q > 0;
      ground.renderDynamic(renderer, q);
      dynLast = q;
    }
    stats.windows = winReg.count; stats.mapLayers = nightMap.slots - bake.free.length; stats.bakeMs = +(bake.n ? bake.ms / bake.n : 0).toFixed(1); stats.cones = cones.mesh.count;
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
    const m = driver.lampModel ?? driver.model;
    if (pLamps && pModel === m) return pLamps;
    pModel = m;
    const [w, h, l] = m?.size ?? [1.8, 1.45, 4.1];
    pLamps = { head: [0, Math.min(0.75, h * 0.48), l / 2 - 0.15], tail: [0, Math.min(0.9, h * 0.55), -l / 2 + 0.1] };
    if (m?.lamps) { pLamps = { head: m.lamps.head, tail: m.lamps.tail }; return pLamps; }   // (the motorbike: its lamps from moto.json)
    const g = m?.lods?.[0]?.body?.[0]?.geo, K = g?.attributes?._kind, P = g?.attributes?.position;
    if (K && P) {
      const acc = { 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
      for (let i = 0; i < K.count; i++) { const k = Math.round(K.getX(i)); const a = acc[k]; if (a) { a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i); a[3]++; } }
      if (acc[2][3] && acc[3][3]) { pLamps.head = [0, acc[2][1] / acc[2][3], acc[2][2] / acc[2][3]]; pLamps.tail = [0, acc[3][1] / acc[3][3], acc[3][2] / acc[3][3]]; }
    }
    return pLamps;
  };
  // (round 3) the trains' points for the movers' check (positions() allocates: every 12 frames only)
  const trainPts = { n: 0, xz: new Float32Array(512) };
  const trainPoints = (camPos) => {
    trainPts.n = 0;
    const T = window.__trains;
    if (!T?.positions || !T.routes) return;
    for (const t of T.positions()) {
      if (Math.hypot(t.x - camPos.x, t.z - camPos.z) > 600) continue;
      const R = T.routes[t.route], len = 80 * (t.units || 1);
      for (let q = -len; q <= len && trainPts.n < 256; q += 20)   // (either way along the route: its direction of travel is not kept here)
        { const a = R.at(t.d - q); trainPts.xz[trainPts.n * 2] = a[0]; trainPts.xz[trainPts.n * 2 + 1] = a[2]; trainPts.n++; }
    }
  };
  const moverObjs = [];
  updaters.push(update);
  // tag the lamp-shadow casters as things arrive (tiles, fleets, landmarks): a sweep every 2 s, each mesh once
  let tagged = 0;
  const tileCasters = [];
  // ---- (round 3) the lamp-shadow proxies of the tile-wide instanced sets (see PROXY)
  const proxyGroup = new THREE.Group();
  proxyGroup.name = "night-lamp-shadow-proxies";
  scene.add(proxyGroup);
  const proxies = new Map();                    // source InstancedMesh -> { p: [proxy lamp 0, proxy lamp 1], tile, attrs }
  const proxyStats = { sets: 0, inst: 0, ms: 0 };
  const makeProxy = (src, k) => {
    const G = src.geometry, g = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(G.attributes)) g.setAttribute(n, a.isInstancedBufferAttribute ? new THREE.InstancedBufferAttribute(new a.array.constructor(PROXY_CAP * a.itemSize), a.itemSize, a.normalized) : a);
    g.setIndex(G.index); g.boundingSphere = G.boundingSphere; g.groups = G.groups; g.drawRange = G.drawRange;
    g.userData.shared = true;
    const p = new THREE.InstancedMesh(g, src.userData.fadeOrig || src.material, PROXY_CAP);
    p.count = 0; p.visible = false; p.frustumCulled = false; p.castShadow = true; p.receiveShadow = false;
    p.layers.set(PROXY_LAYER + k); p.matrixAutoUpdate = false; p.matrixWorldAutoUpdate = false;
    p.name = `night-lamp-proxy-${k}`; p.userData.proxyOf = src;
    proxyGroup.add(p);
    warmList.push(p, performance.now());
    return p;
  };
  const addProxy = (src, tile) => {
    if (proxies.has(src)) return;
    src.layers.disable(LAMP_SHADOW_LAYER);
    const attrs = Object.entries(src.geometry.attributes).filter(([, a]) => a.isInstancedBufferAttribute).map(([n, a]) => [n, a.itemSize]);
    proxies.set(src, { p: [makeProxy(src, 0), makeProxy(src, 1)], tile, attrs });
  };
  const dropProxy = (src) => {
    const e = proxies.get(src);
    if (!e) return;
    for (const p of e.p) proxyGroup.remove(p);
    proxies.delete(src);
  };
  const proxyNear = new Set();
  /** lamp k's proxies: the instances of every set (of a tile within reach) within REACH of the lamp */
  const fillProxies = (k, P) => {
    const t0 = performance.now(), R2 = REACH * REACH, tiles = window.viewer?.world?.tiles;
    proxyNear.clear();
    if (tiles) for (const t of tiles) {
      const b = t.bounds, dx = Math.max(b.x0 - P.x, 0, P.x - b.x1), dz = Math.max(b.z0 - P.z, 0, P.z - b.z1);
      if (dx * dx + dz * dz < R2) proxyNear.add(t.name);
    }
    let sets = 0, inst = 0;
    for (const [src, e] of proxies) {
      const p = e.p[k];
      let n = 0;
      if ((e.tile === null || proxyNear.has(e.tile)) && src.parent && src.count > 0 && !src.userData.fadeOrig) {
        let shown = true;
        for (let q = src.parent; shown && q; q = q.parent) if (!q.visible) shown = false;
        if (shown) {
          src.updateMatrixWorld();
          const W = src.matrixWorld.elements, M = src.instanceMatrix.array, D = p.instanceMatrix.array;
          for (let i = 0, c = src.count; i < c && n < PROXY_CAP; i++) {
            const o = i * 16, x = M[o + 12] + W[12], z = M[o + 14] + W[14], dx = x - P.x, dz = z - P.z;
            if (dx * dx + dz * dz > R2) continue;
            for (let j = 0; j < 16; j++) D[n * 16 + j] = M[o + j];
            for (const [name, sz] of e.attrs) { const A = src.geometry.attributes[name].array, B = p.geometry.attributes[name].array; for (let j = 0; j < sz; j++) B[n * sz + j] = A[i * sz + j]; }
            n++;
          }
          if (n) { p.material = src.material; p.matrix.copy(src.matrixWorld); p.matrixWorld.copy(src.matrixWorld); }
        }
      }
      if (n > 0) {
        p.instanceMatrix.clearUpdateRanges(); p.instanceMatrix.addUpdateRange(0, n * 16); p.instanceMatrix.needsUpdate = true;
        for (const [name, sz] of e.attrs) { const a = p.geometry.attributes[name]; a.clearUpdateRanges(); a.addUpdateRange(0, n * sz); a.needsUpdate = true; }
        sets++; inst += n;
      }
      p.count = n; p.visible = n > 0;
    }
    proxyStats.sets = sets; proxyStats.inst = inst; proxyStats.ms = performance.now() - t0;
  };
  const sweep = () => {
    // (fix4) the player's vehicles (car, motorbike, scooter, Villo) are movers: their root marked, meshes already on the
    // static layer moved over
    if (LAMP_CACHE && driver) {
      const roots = [driver.car?.root, driver.lampRoot, ...Object.values(driver.twos || {}).map((t) => t.rig?.root)];
      for (const r of roots) if (r && !r.userData.lampMover) {
        r.userData.lampMover = true;
        r.traverse((o) => { if (o.isMesh && o.layers.isEnabled(LAMP_SHADOW_LAYER)) { o.layers.disable(LAMP_SHADOW_LAYER); o.layers.enable(MOVER_LAYER); } });
      }
    }
    tagged += tagCasters(scene, warmList, TILE_REACH ? tileCasters : null);
    if (PROXY) {
      for (const { o, tile } of tileCasters) addProxy(o, tile);
      // (the city-wide pools - parked cars, street life, gardens, furniture - were tried as proxies too: their instances
      // near the camera are within the lamps' reach anyway: 517 -> 502 k triangles for 2 maps, more draws and fill CPU)
      for (const src of proxies.keys()) if (!src.parent) dropProxy(src);
    }
    moverObjs.length = 0;
    if (LAMP_CACHE) moverTops.clear();
    scene.traverse((o) => {
      if (o.isSkinnedMesh || o.userData.nightMover) moverObjs.push(o);
      if (LAMP_CACHE && o.isMesh && o.layers.isEnabled(MOVER_LAYER)) { let t = o; while (t.parent && t.parent !== scene) t = t.parent; if (t.parent === scene) moverTops.add(t); }
    });
    for (let i = tileCasters.length - 1; i >= 0; i--) if (!tileCasters[i].o.parent) { tileCasters[i] = tileCasters[tileCasters.length - 1]; tileCasters.pop(); }   // (tile gone)
  };
  /** keep a tile's instanced sets in the lamp layer only near a shadowed lamp (both lamps: their union) */
  const gateTiles = () => {
    const tiles = window.viewer?.world?.tiles;
    if (!tiles || !tileCasters.length) return;
    const near = gateNear; near.clear();
    for (const t of tiles) {
      const b = t.bounds;
      for (const L of shadowLights) {
        if (!(L.intensity > 0)) continue;
        const p = L.position, dx = Math.max(b.x0 - p.x, 0, p.x - b.x1), dz = Math.max(b.z0 - p.z, 0, p.z - b.z1);
        if (dx * dx + dz * dz < REACH * REACH) { near.add(t.name); break; }
      }
    }
    for (const { o, tile } of tileCasters) { if (near.has(tile)) o.layers.enable(LAMP_SHADOW_LAYER); else o.layers.disable(LAMP_SHADOW_LAYER); }
  };
  const gateNear = new Set();
  setInterval(sweep, 2000);
  const api = {
    master: 1,                          // (A/B in one page: 0 = every night light off, the lighting model kept)
    shadowMode: SHADOW_MODE,            // (A/B in one page: "smart" / "full")
    lampCache: LAMP_CACHE,              // (fix4, A/B in one page: false = every lamp-map render draws everything)
    pool, night, lamps, ground, shadowLights, stats, nightParams, glare, proxyStats, proxies,
    /** a tile's lamp heads; (round 3) extra = { windows: its lit windows (litHash.js records, the tile worker),
     *  bounds: { x0, z0, ... }, ground(x, z): the surface height } for its ground map */
    addTile: (name, heads, extra = null) => {
      const now = performance.now();
      lamps.addTile(name, heads, now);
      if (extra?.windows?.length) winReg.addTile(name, extra.windows, now, null, NIGHT_WIN_STRIDE);
      if (extra?.bounds && extra.ground && !bake.tiles.has(name)) {
        const L = new Float32Array((heads?.length ?? 0) * 3);
        heads?.forEach((h, k) => { L[k * 3] = h.x; L[k * 3 + 1] = h.y; L[k * 3 + 2] = h.z; });
        const T = { name, b: extra.bounds, cell: cellOf(extra.bounds), ground: groundGrid(extra.bounds, extra.ground), lamps: L, windows: extra.windows ?? new Float32Array(0), shops: null, slot: -1, t: 0, ready: false, sent: false };
        T.timer = setTimeout(() => bakeTile(name), 20000);       // (no addShops: street life off or slow)
        bake.tiles.set(name, T);
      }
    },
    removeTile: (name) => { lamps.removeTile(name); winReg.removeTile(name); shopReg.removeTile(name); signReg.removeTile(name); signReg.removeTile(name + "#stops"); dropBake(name); },
    /** step 5: a tile's shop / sign lights (Float32Array records of NIGHT_LIGHT_STRIDE, shopLayout.js); round 3: the
     *  stop posters as signs, then the tile's ground map is baked (called once per tile, records or not) */
    addShops: (name, rec) => {
      const now = performance.now();
      const shops = [], shopItems = [], signs = [], signItems = [];
      if (rec?.length) for (let o = 0; o + NIGHT_LIGHT_STRIDE <= rec.length; o += NIGHT_LIGHT_STRIDE) {
        const at = { x: rec[o + 1], y: rec[o + 2], z: rec[o + 3] }, it = { nx: rec[o + 4], nz: rec[o + 5], hw: rec[o + 6], hh: rec[o + 7], col: [rec[o + 8], rec[o + 9], rec[o + 10]], b: 1 };
        if (rec[o] === 0) { shops.push(at); shopItems.push(it); } else { signs.push(at); signItems.push(it); }
      }
      shopReg.addTile(name, shops, now, shopItems); signReg.addTile(name, signs, now, signItems);
      const st = stopSigns(name);
      if (st?.heads.length) signReg.addTile(name + "#stops", st.heads, now, st.items);
      const T = bake.tiles.get(name);
      if (T && !T.sent) {
        const a = rec?.length ? rec : new Float32Array(0), b = st?.flat.length ? new Float32Array(st.flat) : new Float32Array(0);
        T.shops = new Float32Array(a.length + b.length); T.shops.set(a, 0); T.shops.set(b, a.length);
        bakeTile(name);
      }
    },
    windows: winReg, bake,
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
