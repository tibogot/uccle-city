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
// the lamp shadows' casters: a layer of their own. A shadowed lamp's frustum (155 deg, 24 m) otherwise takes in whole
// building chunks (detail / wall / kit meshes: ~1.1 M triangles, ~96 draws per lamp, measured on Place Saint-Job) that
// never throw a shadow a lamp could show (the lamp stands in front of the facade). Tagged: every shadow caster that is
// street-scale - posts, cars, trees, furniture, people, kiosks (radius < 12 m, or instanced) - not building parts.
const LAMP_SHADOW_LAYER = 6;
const BUILDING = /^(buildings-|kit |facade|roof|terrain|ground|bridge|tunnel)/i;
function tagCasters(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.userData.__nightTag) return;
    o.userData.__nightTag = true;
    if (BUILDING.test(o.name || "") || BUILDING.test(o.parent?.name || "")) return;
    let small = o.isInstancedMesh || o.isSkinnedMesh;
    if (!small) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); small = (g.boundingSphere?.radius ?? 1e9) * o.matrixWorld.getMaxScaleOnAxis() < 12; }
    if (small) { o.layers.enable(LAMP_SHADOW_LAYER); n++; }
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
    this.tiles = new Map(); this.list = [];
    this.onRelease = null;
    this.count = 0;
  }
  addTile(name, heads, now) {
    if (this.tiles.has(name) || !heads?.length) return;
    const n = Math.min(heads.length, this.nFree);
    if (n < heads.length) console.warn(`[night] lamp registry full: ${heads.length - n} lamps of ${name} left out`);
    const ids = new Int32Array(n), lx = new Float32Array(n), ly = new Float32Array(n), lz = new Float32Array(n);
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const h = heads[k], id = this.free[--this.nFree];
      ids[k] = id; this.x[id] = lx[k] = h.x; this.y[id] = ly[k] = h.y; this.z[id] = lz[k] = h.z; this.fade[id] = 0;
      x0 = Math.min(x0, h.x); x1 = Math.max(x1, h.x); z0 = Math.min(z0, h.z); z1 = Math.max(z1, h.z);
    }
    // the tile's grid offers its LOCAL index: the adapter turns it into the registry id (made once, no per-frame closure)
    // a lamp fading in is offered FARTHER by (1 - fade) x FADE_FAR: it enters the nearest set through the cut-off's own
    // fade instead of taking a slot at weight 0 (which moved the cut-off - every other lamp's weight - at a stroke)
    const fade = this.fade;
    const adapter = { sel: null, ids, offer(s, d2) { const id = this.ids[s], f = fade[id]; if (f >= 1) this.sel.offer(id, d2); else { const d = Math.sqrt(d2) + (1 - f) * FADE_FAR; this.sel.offer(id, d * d); } } };
    const rec = { name, ids, t0: now, f: 0, grid: new StaticSources(lx, ly, lz, 32), x0, x1, z0, z1, adapter };
    this.tiles.set(name, rec); this.list.push(rec);
    this.count += n;
  }
  removeTile(name) {
    const rec = this.tiles.get(name);
    if (!rec) return;
    this.tiles.delete(name); this.list.splice(this.list.indexOf(rec), 1);
    for (const id of rec.ids) {
      this.x[id] = this.z[id] = 1e9; this.fade[id] = 0;
      this.onRelease?.(id);
      this.free[this.nFree++] = id;
    }
    this.count -= rec.ids.length;
  }
  /** the tiles' fade-in, by frame time capped at 1/30 s (a long task while a tile streams in must not jump it) */
  step(dt) {
    const k = Math.min(dt, 1 / 30) / FADE_IN;
    for (let t = 0; t < this.list.length; t++) {
      const r = this.list[t];
      if (r.f >= 1) continue;
      r.t = Math.min(1, (r.t ?? 0) + k);
      r.f = smooth01(r.t);
      for (let k = 0; k < r.ids.length; k++) this.fade[r.ids[k]] = r.f;
    }
  }
  /** StaticSources' query, over every tile whose box is within r */
  query(cx, cy, cz, r, sel) {
    for (let t = 0; t < this.list.length; t++) {
      const R = this.list[t];
      if (cx < R.x0 - r || cx > R.x1 + r || cz < R.z0 - r || cz > R.z1 + r) continue;
      R.adapter.sel = sel;
      R.grid.query(cx, cy, cz, r, R.adapter);
    }
  }
}

const EMPTY = () => ({ x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), list: [] });

// ------------------------------------------------------------------------------------------------ the city hookup
/**
 * Steps 1-3. scene: the city scene; updaters: main.js' per-frame list (the night update runs after the traffic's);
 * returns { addTile, removeTile, setTraffic, setDriver, stats, ... }.
 */
export function startCityNight({ scene, renderer, updaters, log = console.log }) {
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
  let dynReady = false, dynLast = -1;
  (async () => {                       // its pipeline compiled for ITS target (half float), off the frame
    dynMesh.count = 1; dynMesh.visible = true;
    const prev = renderer.getRenderTarget();
    try { renderer.setRenderTarget(nightGround.rt); await renderer.compileAsync(ground.dynScene, ground.cam); }
    catch (e) { console.warn("[night] dyn ground compile:", e); }
    finally { renderer.setRenderTarget(prev); dynMesh.count = 0; dynMesh.visible = false; dynReady = true; }
  })();

  const street = { sources: { lamps, windows: EMPTY(), shops: EMPTY(), signs: EMPTY() } };
  nightParams.shadowShare = 0.65;
  const night = new NightSources(pool, street, { cars: CAR_CAP, shadowLights, sizes: { windows: 0, shops: 0, signs: 0 }, ground });
  lamps.onRelease = (id) => night.shadow.release(id);
  night.tram.on = false;

  // ---- cars
  let traffic = null, driver = null;
  const SIM_CAP = 1024;
  // per sim slot, then GHOSTS slots (G0..G1) for cars that left the sim while lit (their lights fade out there)
  const GHOSTS = 64, G0 = SIM_CAP + 1, G1 = G0 + GHOSTS, NS = G1;
  const lf = new Float32Array(NS), gen = new Uint32Array(SIM_CAP), wasAlive = new Uint8Array(SIM_CAP);
  const last = new Float32Array(NS * CAR.STRIDE);                    // each slot's last light data
  let gNext = G0;
  const toGhost = (i) => {
    let g = -1;
    for (let k = 0; k < GHOSTS; k++) { const c = G0 + ((gNext - G0 + k) % GHOSTS); if (lf[c] <= 0) { g = c; break; } }
    if (g < 0) g = gNext;                                              // (all busy: the oldest)
    gNext = G0 + ((g - G0 + 1) % GHOSTS);
    for (let j = 0; j < CAR.STRIDE; j++) last[g * CAR.STRIDE + j] = last[i * CAR.STRIDE + j];
    lf[g] = lf[i];
  };
  const lampsOf = new Map();                                         // type index -> { head: [x, y, z], tail: [x, y, z] } (car frame)
  const tmp = new Float32Array(CAR.STRIDE);
  const pick = new NearestN(CAR_CAP, CAR_R);
  const carId = new Int32Array(CAR_CAP);
  let carPrev = new Float32Array(NS * 2), carCur = new Float32Array(NS * 2);
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
  const stats = { carJump: 0, carJumpMax: 0, lamps: 0, tiles: 0, cars: 0, real: 0, dyn: 0, ms: 0, msAvg: 0 };
  const update = (camPos, cam) => {
    const t0 = performance.now(), dt = Math.min(0.1, (t0 - tLast) / 1000);
    tLast = t0; frames++;
    const n = env.uNight.value, scale = POOL_ON ? smooth01((n - 0.15) / 0.5) * api.master : 0;
    lamps.step(dt);
    // ---- the cars' light data: every live traffic car (drawn pose) + the player's car, nearest first
    let nc = 0;
    const D = night.carData;
    if (scale > 0) {
      pick.begin();
      const T = traffic?.T, sim = T?.sim;
      if (sim) {
        const a = T.alpha ?? 1, b1 = 1 - a, types = T.types, m = Math.min(sim.cap, SIM_CAP);
        for (let i = 0; i < m; i++) {
          const o = i * CAR.STRIDE;
          if (sim.alive[i]) {
            if (!wasAlive[i] || gen[i] !== sim.gen[i]) {                  // a new car in this slot (the old one, if any, fades as a ghost)
              if (wasAlive[i] && lf[i] > 0) toGhost(i);
              lf[i] = 0; gen[i] = sim.gen[i]; wasAlive[i] = 1;
            }
            lf[i] = Math.min(1, lf[i] + Math.min(dt, 1 / 30) / CAR_IN);
            let yaw = sim.yaw[i]; const py = sim.pyaw[i]; let dyw = yaw - py;
            if (dyw > Math.PI) dyw -= 2 * Math.PI; else if (dyw < -Math.PI) dyw += 2 * Math.PI;
            yaw = py + dyw * a;
            const x = sim.px[i] * b1 + sim.x[i] * a, y = sim.py[i] * b1 + sim.y[i] * a, z = sim.pz[i] * b1 + sim.z[i] * a;
            const brake = sim.bits[i] & 1;
            writeCar(o, x, y, z, yaw, sim.ppitch[i] * b1 + sim.pitch[i] * a, typeLamps(sim.type[i], types), 1, brake ? 1.6 : 1, smooth01(lf[i]), y);
          } else if (wasAlive[i]) {                                          // gone (parked in, removed out of sight): a ghost
            wasAlive[i] = 0;
            if (lf[i] > 0) toGhost(i);
            lf[i] = 0;
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
        lf[g] = Math.max(0, lf[g] - Math.min(dt, 1 / 30) / CAR_OUT);
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
      }
      for (let k = 0; k < pick.count && nc < CAR_CAP; k++) {
        carId[nc] = pick.i[k];
        const src = pick.i[k] * CAR.STRIDE, dst = nc * CAR.STRIDE;
        for (let j = 0; j < CAR.STRIDE; j++) D[dst + j] = last[src + j];
        nc++;
      }
    }
    night.carCount = nc;
    // ---- the pool (lamps, cars), the shadowed lamps, the far cars' ground pools (by day: once at 0, then nothing)
    ground.recentre(camPos.x - half, camPos.z - half);
    if (scale > 0 || lastScale > 0 || frames < 4) night.update(camPos, dt, scale, false);
    lastScale = scale;
    // the pop detector per CAR (nightSources' Track is per list position; the city's list is re-sorted every frame):
    // the largest frame-to-frame change of a car's real head / rear weight (brake: the weight / TAIL)
    if (scale > 0) {
      const sw = carPrev; carPrev = carCur; carCur = sw; carCur.fill(0);
      const TH = night.track.heads.cur, TR = night.track.rear.cur;
      for (let k = 0; k < nc; k++) { const o = carId[k] * 2; carCur[o] = TH[k]; carCur[o + 1] = TR[k] / Math.max(1, D[k * CAR.STRIDE + CAR.TAIL]); }
      let m = 0;
      for (let i = 0; i < carCur.length; i++) { const d = Math.abs(carCur[i] - carPrev[i]); if (d > m) m = d; }
      stats.carJump = m; if (m > stats.carJumpMax) stats.carJumpMax = m;
    }
    for (const L of night.shadow.lights) L.shadow.autoUpdate = L.intensity > 0 || frames < 4;   // (no shadow map render without light)
    nightGround.uDyn.value = scale > 0 ? 1 : 0;
    const q = scale > 0 && dynReady ? night.dynCount : 0;
    if (dynReady && (q > 0 || dynLast !== 0)) {                       // (nothing to draw twice in a row: skip the pass)
      dynMesh.visible = q > 0;
      ground.renderDynamic(renderer, q);
      dynLast = q;
    }
    stats.casters = tagged; stats.lamps = lamps.count; stats.tiles = lamps.list.length; stats.cars = nc; stats.real = pool.active; stats.dyn = q;
    stats.ms = performance.now() - t0; stats.msAvg = stats.msAvg * 0.95 + stats.ms * 0.05;
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
  const sweep = () => { tagged += tagCasters(scene); };
  setInterval(sweep, 2000);
  const api = {
    master: 1,                          // (A/B in one page: 0 = every night light off, the lighting model kept)
    pool, night, lamps, ground, shadowLights, stats, nightParams,
    addTile: (name, heads) => lamps.addTile(name, heads, performance.now()),
    removeTile: (name) => lamps.removeTile(name),
    setTraffic: (t) => { traffic = t; },
    setDriver: (d) => { driver = d; },
    /** the car-lamp offsets in use (check: forward z > 0 for the head, < 0 for the tail) */
    lampOffsets: () => [...lampsOf.entries()].map(([k, v]) => ({ type: traffic?.T?.types?.[k]?.name, ...v })),
  };
  window.__night = api;
  log(`night lights: on (?night=1)${POOL_ON ? "" : ", EMPTY pool (?nightpool=0)"} - clustered pool of ${pool.max}, 2 shadowed lamps, dynamic ground layer ${DYN.size} m`);
  return api;
}
