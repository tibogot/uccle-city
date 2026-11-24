// THE PARKED-CAR FLEET of the city: every loaded tile's parked cars (viewer/cars.js registers them) drawn as the
// cars2 family (tools/blender/cars2.py -> models/cars/cars2.glb, authored LODs; docs/CARS2.md) or, ?cars=old, the
// faceted family (tools/blender/carFaceted.py -> models/cars/faceted.glb, LODs made at load by viewer/drive/carPacks.js).
//   - one InstancedMesh per (type, LOD), shared by all tiles: ~one draw per type and LOD whatever the tile count
//   - per-instance paint from a Brussels palette (lots of black, grey, silver, white, dark blue; some red, green)
//   - materials by cost: LOD0-1 "near" (clear coat on the paint, see-through glass by alpha to coverage, light glass
//     shadow); LOD2-3 "far" (standard, opaque dark glass, no clear coat)
//   - fades, all dithered (complementary screen-space masks, the shadow fades with the car), drawn by a SEPARATE set of
//     instanced batches with the masked materials, so only the few cars actually mid-fade pay for the discard:
//       LOD switches   +-10 / 8 / 5 % around 22 / 55 / 130 m (the model's lodDist)
//       distance       out between FADE_FROM and FADE_TO (no car pops off at the end of the range)
//       streaming      a tile's cars fade in over 1.2 s when it loads
//   - shadows: LOD0-2 cast, LOD3 (>= 130 m) does not; the LOD2 -> 3 fade fades the shadow out with it
//   - per-instance frustum culling; rebuilt every frame while something fades, else when the camera moves
//   - NO MAIN-THREAD HITCH: the GLB parse, the meshoptimizer LODs and the merges run in viewer/carLodWorker.js; the main
//     thread only wraps the arrays (one car type per frame) and precompiles the four materials with compileAsync
//     (setRenderer) before the first car is drawn, so no pipeline is built in a frame either
import * as THREE from "three/webgpu";
import { PACK_SOURCES, packMaterial, FLEET_SOURCE, CARS_OLD, GLASS_PASS, glassGeometry } from "./drive/carPacks.js";
import { MultiDrawSet, multiDrawOK } from "./multiDraw.js";
import { dentFrame } from "./drive/carDent.js";
import { HEAVY_TYPES, HEAVY_URL } from "./traffic/trafMix.js";   // TRAFMIX: the traffic's service vehicles (not parked)
import { CARLOOK_OLD } from "./carProbe.js";                      // claude/cars1: ?carlook=old = the r0 family (no 4x4)

/** ?carmerge=old: one InstancedMesh per (type, LOD, plain / fade): 26 scene + 11 shadow render objects in a street,
 *  instead of one multi-draw mesh per (material, shadow) (6 + 4; viewer/multiDraw.js, docs/perf/AUDIT.md step 13) */
const CAR_MERGE = typeof location === "undefined" || new URLSearchParams(location.search).get("carmerge") !== "old";
const _carBox = new Float64Array(6);
// (allocrate, ?fleetflat=old: a [batch, car, fade] array per drawn car, the batch list and the registrations re-made on
// every frame the camera moves) the jobs in three reused parallel lists, the batch list kept until the types change, the
// registrations filtered in place: the parked cars' update makes no garbage a frame (docs/rules/alloc-rate.md)
const FLEET_FLAT = typeof location === "undefined" || new URLSearchParams(location.search).get("fleetflat") !== "old";
const _jB = [], _jC = [], _jF = [];
// (claude/allocrate2, rule alloc-rate) the car loop in its own small function (placeCars); ?fleetopt=old = inline
const FLEET_OPT = typeof location === "undefined" || new URLSearchParams(location.search).get("fleetopt") !== "old";
const _setCols = { instanceMatrix: null, paint: null, lodFade: null };

// the mix (a residential Brussels street in a wealthy commune): mostly hatchbacks, estates and saloons, SUVs, the boxy
// 4x4 (claude/cars1 round 2: Uccle's leafy streets, 6 %), compact vans, a few panel vans, an occasional taxi
export const TYPE_MIX = [["hatch_s", 0.18], ["hatch_c", 0.195], ["estate", 0.16], ["saloon", 0.13], ["suv", 0.15], ["x4", 0.06], ["van_c", 0.085], ["van_p", 0.035], ["taxi", 0.015]];
// ?carlook=old: the mix before round 2 (the r0 GLB has no 4x4)
if (CARLOOK_OLD) TYPE_MIX.splice(0, TYPE_MIX.length, ["hatch_s", 0.20], ["hatch_c", 0.22], ["estate", 0.16], ["saloon", 0.13], ["suv", 0.13], ["van_c", 0.09], ["van_p", 0.035], ["taxi", 0.015]);
// body sizes [w, h, l] (m), as tools/blender/carFaceted.py prints them (the colliders need them before the pack loads)
// (cars2: as tools/blender/cars2.py prints them; ?cars=old: the faceted family's)
export const SIZES = CARS_OLD ? { hatch_s: [1.74, 1.50, 4.01], hatch_c: [1.80, 1.50, 4.31], estate: [1.80, 1.51, 4.63], saloon: [1.82, 1.49, 4.73],
  suv: [1.82, 1.64, 4.41], van_c: [1.84, 1.82, 4.50], van_p: [2.02, 2.28, 5.05], taxi: [1.80, 1.61, 4.67] }
  : { hatch_s: [1.77, 1.44, 4.09], hatch_c: [1.81, 1.45, 4.31], estate: [1.85, 1.47, 4.70], saloon: [1.85, 1.44, 4.73],
    suv: [1.84, 1.56, 4.33], van_c: [1.88, 1.84, 4.53], van_p: [1.95, 1.98, 5.03], taxi: [1.85, 1.59, 4.73], police: [1.85, 1.47, 4.70], x4: [1.86, 1.88, 4.52] };
// paints (sRGB): Brussels car parks are mostly black, greys, silver and white
export const PAINTS = [0x0d0e10, 0x0d0e10, 0x0d0e10, 0x1a1c1f, 0x34383d, 0x34383d, 0x4a4e53, 0x5a5e63, 0x8f959c, 0x9ea4ab, 0x9ea4ab, 0xb8bcc0,
  0xe8e8e4, 0xe8e8e4, 0xdcdcd6, 0x1d3f6e, 0x1d2c4a, 0x2e5a8a, 0x8a1414, 0x5a1010, 0x24483a, 0x6b5a48, 0x3a3226];
export const FADE_FROM = 380, FADE_TO = 420;           // m: the distance fade-out
export const BANDS = [0.1, 0.08, 0.05];                // LOD cross-fade per switch: +-10 % at 22 m, 8 % at 55, 5 % at 130
const FADE_IN_MS = 1200;

/** The slot length a type needs (m): its length + 0.5 m of gaps; a panel van needs a 6 m slot. */
export const slotNeed = (t) => (t === "van_p" ? 6.0 : SIZES[t][2] + 0.5);
/**
 * Types for one tile's slots, fitted to the room each slot has: room[i] = the slot length (m), i.e. the distance to
 * the nearest parked neighbour on the same kerb (9 when none). Long types go first to the roomiest slots that take
 * them, each up to its share of the mix; the rest are filled with the types that fit, by the mix. order[i]: a hash
 * per slot (a deterministic shuffle). -> [type] per slot.
 */
export function assignTypes(room, order) {
  const n = room.length, out = new Array(n).fill(null);
  const total = TYPE_MIX.reduce((a, [, w]) => a + w, 0);
  const byLen = [...TYPE_MIX].sort((a, b) => slotNeed(b[0]) - slotNeed(a[0]));
  const idx = [...Array(n).keys()].sort((a, b) => order[a] - order[b]);
  for (const [t, w] of byLen) {
    let want = Math.round(n * w / total);
    for (const i of idx) { if (!want) break; if (out[i] == null && room[i] >= slotNeed(t)) { out[i] = t; want--; } }
  }
  for (const i of idx) if (out[i] == null) {
    const fit = TYPE_MIX.filter(([t]) => slotNeed(t) <= room[i]);
    out[i] = fit.length ? pickFrom(fit, order[i]) : "hatch_s";
  }
  return out;
}
function pickFrom(list, h) {
  let r = ((h * 7.31) % 1) * list.reduce((a, [, w]) => a + w, 0);
  for (const [t, w] of list) { if (r < w) return t; r -= w; }
  return list[0][0];
}
export function pickType(h) {
  let r = h * TYPE_MIX.reduce((a, [, w]) => a + w, 0);
  for (const [t, w] of TYPE_MIX) { if (r < w) return t; r -= w; }
  return TYPE_MIX[0][0];
}

class CarFleet {
  constructor() {
    this.group = new THREE.Group(); this.group.name = "parked-cars-fleet";
    this.regs = [];
    this.listeners = new Set();
    this.ready = false; this.failed = null;
    this.stats = { cars: 0, drawn: 0, perLod: [0, 0, 0, 0], fading: 0, culled: 0, far: 0, draws: 0, tris: 0, pops: 0, appears: 0 };   // pops: cumulative, see update
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sphere = new THREE.Sphere(new THREE.Vector3(), 3.2);
    this.lastCam = new THREE.Matrix4(); this.dirty = true; this.n = 0;
    this.update = this.update.bind(this);
  }
  sizeOf(type) { return SIZES[type] || SIZES.hatch_c; }
  /** Something about a car changed (hidden, type, paint, matrix): redo the batches next update, and tell the collider
   *  sets (drive, on foot) that hold a box for that car, so a collider exists exactly while its car is drawn. */
  touch(car) { this.dirty = true; if (car) for (const f of this.listeners) f(car); }
  /** f(car) after a parked car was hidden / shown / changed type (viewer/drive/driveMode.js, viewer/character/cityHook.js). */
  onChange(f) { this.listeners.add(f); }
  /** Is this parked car drawn (in the fleet, not pulled out into the traffic)? The colliders' rule. */
  drawn(car) { return !car.hidden; }
  /** A tile's cars: [{ x, y, z, heading, type, pv }]; `group` = the tile's car group (dropped when it leaves the scene). */
  add(group, cars) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(), eu = new THREE.Euler();
    for (const c of cars) {
      // (pitch / roll: the parked car on its four wheels' ground, viewer/cars.js wheelFit; rotation order Y X Z)
      if (c.pitch || c.roll) q.setFromEuler(eu.set(c.pitch || 0, c.heading, c.roll || 0, "YXZ")); else q.setFromAxisAngle(up, c.heading);
      c.m = new THREE.Matrix4().compose(v.set(c.x, c.y, c.z), q, one);
      c.col = new THREE.Color().setHex(PAINTS[Math.floor(c.pv * PAINTS.length * 0.9999)]);
    }
    this.regs.push({ group, cars, t0: performance.now() });
    this.dirty = true;
    if (!this.loading) this.load();
  }
  /** The renderer and scene (main.js): the fleet's materials are compiled asynchronously before the first draw. */
  setRenderer(renderer, scene) { this.renderer = renderer; this.scene = scene; }
  async load() {
    this.loading = true;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    try {
      const t = performance.now();
      const S = PACK_SOURCES[FLEET_SOURCE];
      const worker = new Worker(new URL("./carLodWorker.js", import.meta.url), { type: "module" });
      const waits = new Map();
      const call = (id, url, P) => new Promise((resolve, reject) => {
        waits.set(id, [resolve, reject]);
        worker.postMessage({ id, url, S: { welded: P.welded, prune: P.prune, smooth: P.smooth, authored: P.authored, lods: P.lods } });
      });
      worker.onmessage = (e) => { const w = waits.get(e.data.id); waits.delete(e.data.id); if (w) (e.data.error ? w[1](new Error(e.data.error)) : w[0](e.data)); };
      worker.onerror = (e) => { for (const w of waits.values()) w[1](new Error(e.message || "car LOD worker failed")); waits.clear(); };
      // (TRAFMIX: the service vehicles, models/cars/heavy.glb, authored LODs like cars2; ?trafmix=old: not loaded)
      const heavyP = HEAVY_TYPES.length ? call(2, HEAVY_URL, PACK_SOURCES.cars2).catch((e) => { console.warn("[cars] heavy.glb:", e); return null; }) : Promise.resolve(null);
      const data = await call(1, S.url, S);
      const heavy = await heavyP;
      worker.terminate();
      this.lodDist = S.lods.map((l) => l.until);
      // (carglass2: the near material's glass is drawn by the blended glass pass; carPacks.js GLASS_PASS)
      const near = packMaterial({ paint: "instance", rich: true, glass: "split" });
      const far = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false });
      const nearFade = packMaterial({ paint: "instance", rich: true, crossFade: true, glass: "split" });
      this.glassMats = GLASS_PASS ? new Map([[near, packMaterial({ paint: "instance", rich: true, glass: "pass" })],
        [nearFade, packMaterial({ paint: "instance", rich: true, crossFade: true, glass: "pass" })]]) : null;
      const farFade = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false, crossFade: true });
      const types = {};
      let slice = 0;
      for (const c of data.cars) {            // a few hundred microseconds per type: one type per frame anyway
        if (!TYPE_MIX.some(([t]) => t === c.id)) continue;   // (cars2: the police estate is the yard / game's, not the street mix)
        await frame();
        const s0 = performance.now();
        const lods = c.lods.map((m, k) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(m.P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(m.N, 3));
          geo.setAttribute("color", new THREE.BufferAttribute(m.C, 3)); geo.setAttribute("_kind", new THREE.BufferAttribute(m.K, 1));
          geo.setIndex(new THREE.BufferAttribute(m.I, 1));
          geo.computeBoundingSphere();
          const isNear = k <= 1;
          if (isNear && GLASS_PASS) geo.userData.glass = glassGeometry(geo);   // (shared with the traffic's batches)
          // geo + W (wheel centres) kept for the moving traffic's own batches (viewer/traffic/trafficFleet.js)
          return { tris: m.I.length / 3, geo, W: m.W, plain: this.batch(geo, isNear ? near : far, k < 3, false), fade: this.batch(geo, isNear ? nearFade : farFade, k < 3, true) };
        });
        const x = c.extras || {};
        // (claude/dent) the dent frame of the body (LOD0, wheels left out): the traffic's crumple shader (carDent.js)
        const m0 = c.lods[0], W0 = m0.W;
        const dent = dentFrame(m0.P, m0.K, W0 ? (i) => W0[i * 4 + 3] > 0.5 : null);
        types[c.id] = { lods, dent, keepPaint: !!x.keepPaint, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])) };
        slice = Math.max(slice, performance.now() - s0);
      }
      this.types = types;
      // (TRAFMIX) the traffic-only types: geometry for the moving fleet's own batches (viewer/traffic/trafficFleet.js), no
      // parked batches
      this.extra = {};
      for (const c of heavy?.cars || []) {
        if (!HEAVY_TYPES.includes(c.id)) continue;
        await frame();
        const lods = c.lods.map((m) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(m.P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(m.N, 3));
          geo.setAttribute("color", new THREE.BufferAttribute(m.C, 3)); geo.setAttribute("_kind", new THREE.BufferAttribute(m.K, 1));
          geo.setIndex(new THREE.BufferAttribute(m.I, 1));
          geo.computeBoundingSphere();
          return { tris: m.I.length / 3, geo, W: m.W };
        });
        const x = c.extras || {}, m0 = c.lods[0], W0 = m0.W;
        this.extra[c.id] = { lods, dent: dentFrame(m0.P, m0.K, W0 ? (i) => W0[i * 4 + 3] > 0.5 : null), keepPaint: !!x.keepPaint, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])) };
      }
      // pipelines: compile the four materials (and their shadow variants) off the frame, one batch of each
      for (let i = 0; i < 300 && !(this.renderer && this.camera); i++) await frame();   // the camera comes with the first update
      const views = this.mergeBatches();
      if (this.renderer?.compileAsync) {
        const probes = [];
        const T = Object.values(types)[0];
        if (views.length) for (const v of views) { v.mesh.visible = true; probes.push(v.mesh); }
        else for (const b of [T.lods[0].plain, T.lods[0].fade, T.lods[2].plain, T.lods[2].fade]) { b.mesh.count = 1; b.mesh.visible = true; probes.push(b.mesh); if (b.glass) { b.glass.count = 1; b.glass.visible = true; probes.push(b.glass); } }
        const keep = this.group.children.filter((o) => !probes.includes(o) && o.visible);
        for (const o of keep) o.visible = false;
        try { await this.renderer.compileAsync(this.group, this.camera, this.scene); } catch (e) { console.warn("[cars] compileAsync:", e); }
        if (views.length) for (const v of views) v.mesh.visible = false;
        else for (const m of probes) { m.count = 0; m.visible = false; }
      }
      const now = performance.now();
      // the types go live one per frame (their geometry uploads spread over frames), each fading its cars in
      this.pendingTypes = Object.keys(types);
      for (const T of Object.values(types)) T.t0 = Infinity;
      this.ready = true; this.dirty = true;
      console.log(`[cars] ${FLEET_SOURCE} fleet ready in ${(now - t).toFixed(0)} ms (LODs in a worker: ${data.ms.toFixed(0)} ms; main thread: longest slice ${slice.toFixed(1)} ms; materials compiled async): ${data.cars.length} types x ${this.lodDist.length} LODs`);
    } catch (e) { this.failed = e; console.warn(`[cars] ${FLEET_SOURCE} fleet failed:`, e); }
  }
  /** perf pass 3: the batches of one (material, shadow) as the parts of ONE multi-draw set (viewer/multiDraw.js); the
   *  batch meshes stay as the per-part CPU buffers (not in the scene). The cars are culled per car on the CPU already, so
   *  a part is one chunk. Returns the views (none: ?carmerge=old, or no indirect-first-instance). */
  mergeBatches() {
    if (!CAR_MERGE || !multiDrawOK()) return [];
    const groups = new Map();
    for (const T of Object.values(this.types)) for (const l of T.lods) for (const b of [l.plain, l.fade]) {
      const key = `${b.mat.uuid}|${b.cast}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }
    const views = [];
    for (const list of groups.values()) {
      const b0 = list[0];
      try {
        const set = new MultiDrawSet({ name: "parked-cars", parts: list.length, attrs: [["instanceMatrix", 16], ["paint", 3], ...(b0.fade ? [["lodFade", 1]] : [])], cap0: 64 });
        set.pad = 3;
        const v = set.addView({ geoms: list.map((b) => b.geo), material: b0.mat, castShadow: b0.cast, receiveShadow: true, name: `parked-cars:merged(${list.length})` });
        // carglass2: the near parts' blended glass, one more view of the same set (same instances, glass-only geometry)
        const gm = this.glassMats?.get(b0.mat), gv = gm && list.some((b) => b.glassGeo) ? set.addView({ geoms: list.map((b) => b.glassGeo || null), material: gm, castShadow: false, receiveShadow: true, name: `parked-cars:glass(${list.length})` }) : null;
        list.forEach((b, k) => { b.set = set; b.part = k; this.group.remove(b.mesh); if (b.glass) this.group.remove(b.glass); });
        this.group.add(v.mesh);
        views.push(v);
        if (gv) { this.group.add(gv.mesh); views.push(gv); }
      } catch (e) { console.warn(`[cars] batches not merged (${e.message})`); }
    }
    this.merged = views.length > 0;
    return views;
  }
  batch(geo, mat, cast, fade, cap = 64) {
    const g = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(geo.attributes)) g.setAttribute(n, a);
    g.setIndex(geo.index); g.userData.shared = true;
    const b = { geo: g, mat, cast, fade, mesh: null, cap: 0, glass: null, glassGeo: null };
    // carglass2: the glass-only geometry, drawn by the glass material on the batch's own instance buffers
    const gg = this.glassMats?.get(mat) && geo.userData.glass;
    if (gg) { b.glassGeo = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(gg.attributes)) b.glassGeo.setAttribute(n, a); b.glassGeo.setIndex(gg.index); b.glassGeo.userData.shared = true; b.glassMat = this.glassMats.get(mat); }
    this.grow(b, cap);
    return b;
  }
  grow(b, cap) {
    if (b.mesh) { this.group.remove(b.mesh); b.mesh.dispose(); }
    b.cap = cap;
    b.geo.setAttribute("paint", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    if (b.fade) b.geo.setAttribute("lodFade", new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
    const m = new THREE.InstancedMesh(b.geo, b.mat, cap);
    m.count = 0; m.frustumCulled = false; m.castShadow = b.cast; m.receiveShadow = true; m.visible = false;
    // (static usage: written on change with needsUpdate + the used range; DynamicDrawUsage is re-uploaded whole in
    // every render pass of every frame by three r187)
    m.name = "parked-car-batch";
    if (!b.set) this.group.add(m);
    b.mesh = m;
    if (b.glassGeo) {
      if (b.glass) { this.group.remove(b.glass); b.glass.dispose(); }
      for (const n of ["paint", "lodFade"]) if (b.geo.attributes[n]) b.glassGeo.setAttribute(n, b.geo.attributes[n]);
      const gm = new THREE.InstancedMesh(b.glassGeo, b.glassMat, cap);
      gm.instanceMatrix = m.instanceMatrix; gm.count = 0; gm.frustumCulled = false; gm.castShadow = false; gm.receiveShadow = true; gm.visible = false;
      gm.name = "parked-car-glass";
      if (!b.set) this.group.add(gm);
      b.glass = gm;
    }
  }
  update(camPos, camera) {
    if (camera) this.camera ||= camera;
    if (!this.ready || !camera) return;
    if (this.pendingTypes?.length) { this.types[this.pendingTypes.shift()].t0 = performance.now(); this.dirty = true; }
    // tiles that left the scene. A tile registers its cars BEFORE its group is in the scene (viewer/main.js loadTile:
    // buildCars, then a frame, then own.features.add): until 2026-11-14 that frame dropped the registration, so every
    // tile streamed in after the boot drew NO parked car while its collider boxes stood (the owner's "invisible cars",
    // road fix round 3). A registration now waits for its group, and leaves only once the group has left the scene.
    const attached = (g) => { let o = g; while (o.parent) o = o.parent; return o.isScene; };
    const now = performance.now();
    const before = this.regs.length;
    const keepReg = (r) => {
      const on = attached(r.group);
      if (on && !r.live) { r.live = true; r.t0 = now; this.dirty = true; }        // in the scene: its fade-in starts now
      return on || (!r.live && now - r.t0 < 120000);    // (a tile dropped while being built: let go after 2 min)
    };
    if (FLEET_FLAT) { const R = this.regs; let w = 0; for (let i = 0; i < R.length; i++) if (keepReg(R[i])) R[w++] = R[i]; R.length = w; }
    else this.regs = this.regs.filter(keepReg);
    if (this.regs.length !== before) this.dirty = true;
    let fadingIn;
    if (FLEET_FLAT) {
      fadingIn = false;
      for (let i = 0; i < this.regs.length && !fadingIn; i++) if (now - this.regs[i].t0 < FADE_IN_MS) fadingIn = true;
      if (!fadingIn) for (const k in this.types) if (!(now - this.types[k].t0 >= FADE_IN_MS)) { fadingIn = true; break; }
    } else fadingIn = this.regs.some((r) => now - r.t0 < FADE_IN_MS) || Object.values(this.types).some((T) => !(now - T.t0 >= FADE_IN_MS));
    camera.updateMatrixWorld();
    const moved = !this.lastCam.equals(camera.matrixWorld);
    if (!moved && !fadingIn && !this.dirty) return;     // a still camera: nothing to redo
    this.lastCam.copy(camera.matrixWorld); this.dirty = false;
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm, THREE.WebGPUCoordinateSystem, camera.reversedDepth);
    // pass 1: what goes where (counts first, so the batches can grow before filling)
    const L = this.lodDist, last = L.length - 1, st = this.stats;
    st.cars = 0; st.drawn = 0; st.fading = 0; st.culled = 0; st.far = 0; st.tris = 0;
    if (FLEET_FLAT && st.perLod?.length === L.length) st.perLod.fill(0); else st.perLod = L.map(() => 0);
    const jobs = FLEET_FLAT ? null : [];
    let nj = 0;
    const job = (b, c, f) => { if (jobs) jobs.push([b, c, f]); else { _jB[nj] = b; _jC[nj] = c; _jF[nj] = f; } nj++; };
    this.frameNo = (this.frameNo || 0) + 1;
    // a camera jump (teleport, view switch) is not motion: the pop / appear counters skip that update
    const jumped = this.lastPos ? camPos.distanceTo(this.lastPos) > 5 : true;
    (this.lastPos ||= new THREE.Vector3()).copy(camPos);
    if (FLEET_OPT && !jobs) {
      // (claude/allocrate2, ?fleetopt=old: the loop inline) the car loop in a small function of its own: inline in this
      // long update() it ran unoptimised (TurboFan rarely took it), so every double (d, keep, t, alpha) was a new heap
      // number: 16-36 KB a frame. Small and called once per registration, it is optimised and boxes nothing
      for (let ri = 0; ri < this.regs.length; ri++) { const r = this.regs[ri]; if (r.live) nj = placeCars(this, r, camPos, now, L, last, st, jumped, nj); }
    } else
    for (const r of this.regs) {
      if (!r.live) continue;                             // its tile is still being built (not in the scene yet)
      const alpha = Math.min(1, (now - r.t0) / FADE_IN_MS);
      for (const c of r.cars) {
        st.cars++;
        if (c.hidden) continue;                          // pulled out into the traffic (viewer/traffic/): drawn there
        const T = this.types[c.type]; if (!T || T.t0 > now) continue;
        this.sphere.center.set(c.x, c.y + 0.9, c.z);
        if (!this.frustum.intersectsSphere(this.sphere)) { st.culled++; continue; }
        const d = camPos.distanceTo(this.sphere.center);
        if (d >= FADE_TO) { st.far++; c.farAt = this.frameNo; continue; }
        let k;
        if (FLEET_FLAT) { k = last; for (let u = 0; u < L.length; u++) if (d < L[u]) { k = u; break; } }   // (no closure a car)
        else { k = L.findIndex((u) => d < u); if (k < 0) k = last; }
        // fraction kept by the distance fade and the streaming fade-in
        const keep = (d > FADE_FROM ? 1 - (d - FADE_FROM) / (FADE_TO - FADE_FROM) : 1) * Math.min(alpha, (now - T.t0) / FADE_IN_MS, 1);
        let near = k, far = -1, t = 0;
        const bl = BANDS[k - 1] ?? 0, bk = BANDS[k] ?? 0;
        if (k > 0 && d - L[k - 1] < bl * L[k - 1]) { near = k - 1; far = k; t = (d - (1 - bl) * L[k - 1]) / (2 * bl * L[k - 1]); }
        else if (k < last && L[k] - d < bk * L[k]) { near = k; far = k + 1; t = (d - (1 - bk) * L[k]) / (2 * bk * L[k]); }
        t = Math.min(1, Math.max(0, t));
        // popping check: a car shown whole in LOD a, then whole in LOD b != a, without a fade update between, is a pop
        const shown = far >= 0 ? -1 : k;
        if (!jumped && shown >= 0 && c.shown >= 0 && c.shown !== shown && c.seen === this.frameNo - 1) st.pops++;
        if (!jumped && c.farAt === this.frameNo - 1 && keep >= 1 && far < 0) st.appears++;    // came in from beyond the range whole
        c.shown = shown; c.seen = this.frameNo;
        if (far >= 0 && keep >= 1) { job(T.lods[near].fade, c, t); job(T.lods[far].fade, c, 1 + t); st.fading++; }
        else if (keep < 1) { job(T.lods[k].fade, c, 1 - keep); st.fading++; }    // outgoing: keeps hash >= 1 - keep
        else job(T.lods[k].plain, c, 0);
        st.drawn++; st.perLod[k]++;
        st.tris += T.lods[k].tris;
      }
    }
    let all;
    if (FLEET_FLAT) {
      // the batch list: rebuilt only when a type or one of its LODs changed (a type loads late, a batch grows: same objects)
      const seen = (this._allLods ||= []);
      let same = !!this._all, n = 0;
      for (const k in this.types) { const ls = this.types[k].lods; if (seen[n] !== ls || ls.length !== seen[n].__n) same = false; n++; }
      if (n !== seen.length) same = false;
      if (!same) {
        this._all = []; seen.length = 0;
        for (const T of Object.values(this.types)) { T.lods.__n = T.lods.length; seen.push(T.lods); for (const l of T.lods) this._all.push(l.plain, l.fade); }
      }
      all = this._all;
    } else { all = []; for (const T of Object.values(this.types)) for (const l of T.lods) all.push(l.plain, l.fade); }
    for (let i = 0; i < all.length; i++) all[i].n = 0;
    for (let j = 0; j < nj; j++) (jobs ? jobs[j][0] : _jB[j]).n++;
    for (const b of all) if (b.n > b.cap) this.grow(b, Math.ceil(b.n * 1.5 / 64) * 64);
    for (let i = 0; i < all.length; i++) all[i].mesh.count = 0;
    for (let j = 0; j < nj; j++) {
      const b = jobs ? jobs[j][0] : _jB[j], c = jobs ? jobs[j][1] : _jC[j], f = jobs ? jobs[j][2] : _jF[j];
      const m = b.mesh, i = m.count++;
      m.setMatrixAt(i, c.m);
      const T = this.types[c.type], col = T.keepPaint ? T.paint : c.col;
      b.geo.attributes.paint.setXYZ(i, col.r, col.g, col.b);
      if (b.fade) b.geo.attributes.lodFade.setX(i, f);
    }
    if (!jobs) { _jB.fill(null, 0, nj); _jC.fill(null, 0, nj); }      // (no car or batch held past the frame)
    st.draws = 0;
    // (merged: every part into its set; the box = the drawn range round the camera, the cars being culled above)
    const B = _carBox; B[0] = camPos.x - FADE_TO; B[1] = -1000; B[2] = camPos.z - FADE_TO; B[3] = camPos.x + FADE_TO; B[4] = 5000; B[5] = camPos.z + FADE_TO;
    for (const b of all) {
      const m = b.mesh;
      if (b.set) {
        const n = m.count;
        if (FLEET_FLAT) { _setCols.instanceMatrix = m.instanceMatrix.array; _setCols.paint = b.geo.attributes.paint.array; _setCols.lodFade = b.geo.attributes.lodFade?.array; b.set.write(b.part, n, _setCols, B); }
        else b.set.write(b.part, n, { instanceMatrix: m.instanceMatrix.array, paint: b.geo.attributes.paint.array, lodFade: b.geo.attributes.lodFade?.array }, B);
        m.visible = n > 0;
        if (n) st.draws++;
        continue;
      }
      m.visible = m.count > 0;
      if (b.glass) { b.glass.count = m.count; b.glass.visible = m.visible; }
      if (!m.visible) continue;
      st.draws += b.glass ? 2 : 1;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, m.count * 16); m.instanceMatrix.needsUpdate = true;
      const p = b.geo.attributes.paint; p.clearUpdateRanges(); p.addUpdateRange(0, m.count * 3); p.needsUpdate = true;
      if (b.fade) { const a = b.geo.attributes.lodFade; a.clearUpdateRanges(); a.addUpdateRange(0, m.count); a.needsUpdate = true; }
    }
  }
}

/** (FLEET_OPT) one registration's cars into the job lists _jB / _jC / _jF from index nj; -> the new count. The same
 *  decisions, in the same order, as the inline loop of CarFleet.update (allocRateCheck.mjs compares them car by car). */
function placeCars(F, r, camPos, now, L, last, st, jumped, nj) {
  const alpha = Math.min(1, (now - r.t0) / FADE_IN_MS), cars = r.cars, frameNo = F.frameNo, sphere = F.sphere, frustum = F.frustum;
  for (let ci = 0; ci < cars.length; ci++) {
    const c = cars[ci];
    st.cars++;
    if (c.hidden) continue;
    const T = F.types[c.type]; if (!T || T.t0 > now) continue;
    sphere.center.set(c.x, c.y + 0.9, c.z);
    if (!frustum.intersectsSphere(sphere)) { st.culled++; continue; }
    const d = camPos.distanceTo(sphere.center);
    if (d >= FADE_TO) { st.far++; c.farAt = frameNo; continue; }
    let k = last; for (let u = 0; u < L.length; u++) if (d < L[u]) { k = u; break; }
    const keep = (d > FADE_FROM ? 1 - (d - FADE_FROM) / (FADE_TO - FADE_FROM) : 1) * Math.min(alpha, (now - T.t0) / FADE_IN_MS, 1);
    let near = k, far = -1, t = 0;
    const bl = BANDS[k - 1] ?? 0, bk = BANDS[k] ?? 0;
    if (k > 0 && d - L[k - 1] < bl * L[k - 1]) { near = k - 1; far = k; t = (d - (1 - bl) * L[k - 1]) / (2 * bl * L[k - 1]); }
    else if (k < last && L[k] - d < bk * L[k]) { near = k; far = k + 1; t = (d - (1 - bk) * L[k]) / (2 * bk * L[k]); }
    t = Math.min(1, Math.max(0, t));
    const shown = far >= 0 ? -1 : k;
    if (!jumped && shown >= 0 && c.shown >= 0 && c.shown !== shown && c.seen === frameNo - 1) st.pops++;
    if (!jumped && c.farAt === frameNo - 1 && keep >= 1 && far < 0) st.appears++;
    c.shown = shown; c.seen = frameNo;
    const lods = T.lods;
    if (far >= 0 && keep >= 1) { _jB[nj] = lods[near].fade; _jC[nj] = c; _jF[nj] = t; nj++; _jB[nj] = lods[far].fade; _jC[nj] = c; _jF[nj] = 1 + t; nj++; st.fading++; }
    else if (keep < 1) { _jB[nj] = lods[k].fade; _jC[nj] = c; _jF[nj] = 1 - keep; nj++; st.fading++; }
    else { _jB[nj] = lods[k].plain; _jC[nj] = c; _jF[nj] = 0; nj++; }
    st.drawn++; st.perLod[k]++;
    st.tris += lods[k].tris;
  }
  return nj;
}

export const carFleet = new CarFleet();
