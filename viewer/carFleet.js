// THE PARKED-CAR FLEET of the city: every loaded tile's parked cars (viewer/cars.js registers them) drawn as the
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
import { PACK_SOURCES, packMaterial } from "./drive/carPacks.js";

// the mix (a residential Brussels street): mostly hatchbacks, estates and saloons, some SUVs and compact vans, a few
// panel vans, an occasional taxi
export const TYPE_MIX = [["hatch_s", 0.20], ["hatch_c", 0.22], ["estate", 0.16], ["saloon", 0.13], ["suv", 0.13], ["van_c", 0.09], ["van_p", 0.035], ["taxi", 0.015]];
// body sizes [w, h, l] (m), as tools/blender/carFaceted.py prints them (the colliders need them before the pack loads)
const SIZES = { hatch_s: [1.74, 1.50, 4.01], hatch_c: [1.80, 1.50, 4.31], estate: [1.80, 1.51, 4.63], saloon: [1.82, 1.49, 4.73],
  suv: [1.82, 1.64, 4.41], van_c: [1.84, 1.82, 4.50], van_p: [2.02, 2.28, 5.05], taxi: [1.80, 1.61, 4.67] };
// paints (sRGB): Brussels car parks are mostly black, greys, silver and white
const PAINTS = [0x0d0e10, 0x0d0e10, 0x0d0e10, 0x1a1c1f, 0x34383d, 0x34383d, 0x4a4e53, 0x5a5e63, 0x8f959c, 0x9ea4ab, 0x9ea4ab, 0xb8bcc0,
  0xe8e8e4, 0xe8e8e4, 0xdcdcd6, 0x1d3f6e, 0x1d2c4a, 0x2e5a8a, 0x8a1414, 0x5a1010, 0x24483a, 0x6b5a48, 0x3a3226];
const FADE_FROM = 380, FADE_TO = 420;                  // m: the distance fade-out
const BANDS = [0.1, 0.08, 0.05];                       // LOD cross-fade per switch: +-10 % at 22 m, 8 % at 55, 5 % at 130
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
    this.ready = false; this.failed = null;
    this.stats = { cars: 0, drawn: 0, perLod: [0, 0, 0, 0], fading: 0, culled: 0, far: 0, draws: 0, tris: 0, pops: 0, appears: 0 };   // pops: cumulative, see update
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sphere = new THREE.Sphere(new THREE.Vector3(), 3.2);
    this.lastCam = new THREE.Matrix4(); this.dirty = true; this.n = 0;
    this.update = this.update.bind(this);
  }
  sizeOf(type) { return SIZES[type] || SIZES.hatch_c; }
  /** A tile's cars: [{ x, y, z, heading, type, pv }]; `group` = the tile's car group (dropped when it leaves the scene). */
  add(group, cars) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    for (const c of cars) {
      c.m = new THREE.Matrix4().compose(v.set(c.x, c.y, c.z), q.setFromAxisAngle(up, c.heading), one);
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
      const S = PACK_SOURCES.faceted;
      const worker = new Worker(new URL("./carLodWorker.js", import.meta.url), { type: "module" });
      const data = await new Promise((resolve, reject) => {
        worker.onmessage = (e) => (e.data.error ? reject(new Error(e.data.error)) : resolve(e.data));
        worker.onerror = (e) => reject(new Error(e.message || "car LOD worker failed"));
        worker.postMessage({ id: 1, url: S.url, S: { welded: S.welded, prune: S.prune, lods: S.lods } });
      });
      worker.terminate();
      this.lodDist = S.lods.map((l) => l.until);
      const near = packMaterial({ paint: "instance", rich: true });
      const far = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false });
      const nearFade = packMaterial({ paint: "instance", rich: true, crossFade: true });
      const farFade = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false, crossFade: true });
      const types = {};
      let slice = 0;
      for (const c of data.cars) {            // a few hundred microseconds per type: one type per frame anyway
        await frame();
        const s0 = performance.now();
        const lods = c.lods.map((m, k) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(m.P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(m.N, 3));
          geo.setAttribute("color", new THREE.BufferAttribute(m.C, 3)); geo.setAttribute("_kind", new THREE.BufferAttribute(m.K, 1));
          geo.setIndex(new THREE.BufferAttribute(m.I, 1));
          geo.computeBoundingSphere();
          const isNear = k <= 1;
          return { tris: m.I.length / 3, plain: this.batch(geo, isNear ? near : far, k < 3, false), fade: this.batch(geo, isNear ? nearFade : farFade, k < 3, true) };
        });
        const x = c.extras || {};
        types[c.id] = { lods, keepPaint: !!x.keepPaint, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])) };
        slice = Math.max(slice, performance.now() - s0);
      }
      this.types = types;
      // pipelines: compile the four materials (and their shadow variants) off the frame, one batch of each
      for (let i = 0; i < 300 && !(this.renderer && this.camera); i++) await frame();   // the camera comes with the first update
      if (this.renderer?.compileAsync) {
        const probes = [];
        const T = Object.values(types)[0];
        for (const b of [T.lods[0].plain, T.lods[0].fade, T.lods[2].plain, T.lods[2].fade]) { b.mesh.count = 1; b.mesh.visible = true; probes.push(b.mesh); }
        const keep = this.group.children.filter((o) => !probes.includes(o) && o.visible);
        for (const o of keep) o.visible = false;
        try { await this.renderer.compileAsync(this.group, this.camera, this.scene); } catch (e) { console.warn("[cars] compileAsync:", e); }
        for (const m of probes) { m.count = 0; m.visible = false; }
      }
      const now = performance.now();
      // the types go live one per frame (their geometry uploads spread over frames), each fading its cars in
      this.pendingTypes = Object.keys(types);
      for (const T of Object.values(types)) T.t0 = Infinity;
      this.ready = true; this.dirty = true;
      console.log(`[cars] faceted fleet ready in ${(now - t).toFixed(0)} ms (LODs in a worker: ${data.ms.toFixed(0)} ms; main thread: longest slice ${slice.toFixed(1)} ms; materials compiled async): ${data.cars.length} types x ${this.lodDist.length} LODs`);
    } catch (e) { this.failed = e; console.warn("[cars] faceted fleet failed:", e); }
  }
  batch(geo, mat, cast, fade, cap = 64) {
    const g = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(geo.attributes)) g.setAttribute(n, a);
    g.setIndex(geo.index); g.userData.shared = true;
    const b = { geo: g, mat, cast, fade, mesh: null, cap: 0 };
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
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.name = "parked-car-batch";
    this.group.add(m);
    b.mesh = m;
  }
  update(camPos, camera) {
    if (camera) this.camera ||= camera;
    if (!this.ready || !camera) return;
    if (this.pendingTypes?.length) { this.types[this.pendingTypes.shift()].t0 = performance.now(); this.dirty = true; }
    // tiles that left the scene
    const attached = (g) => { let o = g; while (o.parent) o = o.parent; return o.isScene; };
    const before = this.regs.length;
    this.regs = this.regs.filter((r) => attached(r.group));
    if (this.regs.length !== before) this.dirty = true;
    const now = performance.now();
    const fadingIn = this.regs.some((r) => now - r.t0 < FADE_IN_MS) || Object.values(this.types).some((T) => !(now - T.t0 >= FADE_IN_MS));
    camera.updateMatrixWorld();
    const moved = !this.lastCam.equals(camera.matrixWorld);
    if (!moved && !fadingIn && !this.dirty) return;     // a still camera: nothing to redo
    this.lastCam.copy(camera.matrixWorld); this.dirty = false;
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm, THREE.WebGPUCoordinateSystem, camera.reversedDepth);
    // pass 1: what goes where (counts first, so the batches can grow before filling)
    const L = this.lodDist, last = L.length - 1, st = this.stats;
    st.cars = 0; st.drawn = 0; st.perLod = L.map(() => 0); st.fading = 0; st.culled = 0; st.far = 0; st.tris = 0;
    const jobs = [];
    this.frameNo = (this.frameNo || 0) + 1;
    // a camera jump (teleport, view switch) is not motion: the pop / appear counters skip that update
    const jumped = this.lastPos ? camPos.distanceTo(this.lastPos) > 5 : true;
    (this.lastPos ||= new THREE.Vector3()).copy(camPos);
    for (const r of this.regs) {
      const alpha = Math.min(1, (now - r.t0) / FADE_IN_MS);
      for (const c of r.cars) {
        st.cars++;
        const T = this.types[c.type]; if (!T || T.t0 > now) continue;
        this.sphere.center.set(c.x, c.y + 0.9, c.z);
        if (!this.frustum.intersectsSphere(this.sphere)) { st.culled++; continue; }
        const d = camPos.distanceTo(this.sphere.center);
        if (d >= FADE_TO) { st.far++; c.farAt = this.frameNo; continue; }
        let k = L.findIndex((u) => d < u); if (k < 0) k = last;
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
        if (far >= 0 && keep >= 1) { jobs.push([T.lods[near].fade, c, t], [T.lods[far].fade, c, 1 + t]); st.fading++; }
        else if (keep < 1) { jobs.push([T.lods[k].fade, c, 1 - keep]); st.fading++; }    // outgoing: keeps hash >= 1 - keep
        else jobs.push([T.lods[k].plain, c, 0]);
        st.drawn++; st.perLod[k]++;
        st.tris += T.lods[k].tris;
      }
    }
    const all = [];
    for (const T of Object.values(this.types)) for (const l of T.lods) all.push(l.plain, l.fade);
    for (const b of all) b.n = 0;
    for (const [b] of jobs) b.n++;
    for (const b of all) if (b.n > b.cap) this.grow(b, Math.ceil(b.n * 1.5 / 64) * 64);
    for (const b of all) { b.mesh.count = 0; }
    for (const [b, c, f] of jobs) {
      const m = b.mesh, i = m.count++;
      m.setMatrixAt(i, c.m);
      const T = this.types[c.type], col = T.keepPaint ? T.paint : c.col;
      b.geo.attributes.paint.setXYZ(i, col.r, col.g, col.b);
      if (b.fade) b.geo.attributes.lodFade.setX(i, f);
    }
    st.draws = 0;
    for (const b of all) {
      const m = b.mesh;
      m.visible = m.count > 0;
      if (!m.visible) continue;
      st.draws++;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, m.count * 16); m.instanceMatrix.needsUpdate = true;
      const p = b.geo.attributes.paint; p.clearUpdateRanges(); p.addUpdateRange(0, m.count * 3); p.needsUpdate = true;
      if (b.fade) { const a = b.geo.attributes.lodFade; a.clearUpdateRanges(); a.addUpdateRange(0, m.count); a.needsUpdate = true; }
    }
  }
}

export const carFleet = new CarFleet();
