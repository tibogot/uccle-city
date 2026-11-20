// TWO-WHEELERS IN THE CITY (motorbike round 2, docs/MOTO.md; ?twowheelers=0 = none):
//   PARKED   motorbikes (on their side stand, leaning, the bar turned) and scooters (on their centre stand) in groups of
//            2-3 across a parking-lane slot, rear or front to the kerb as people leave them: about one slot in six within
//            30 m of a shop / café / restaurant (data/streetlife pois), one in forty elsewhere (cars.js hands those slots
//            over: buildCars twoWheel). Drawn like the street kit: ONE pool per kind and LOD for the whole city
//            (viewer/instanceStream.js: static buffers + update ranges, never DynamicDrawUsage; viewer/multiDraw.js merges
//            the two kinds of one LOD into one render object), LOD bands 25 / 80 / 220 m with the dithered cross-fade
//            and the tile fade (viewer/lodFade.js: the same noise in the shadow pass), paint per instance, shadows from
//            the first two LODs. Colliders: invisible boxes per tile named furniture-twowheel (driveMode.js, cityHook.js).
//   TRAFFIC  motorbikes and scooters as traffic types (viewer/traffic/traffic.js: narrower, quicker off the line; they
//            never park into car slots): drawn here from the sim's interpolated poses, leaning into the bends (lean =
//            atan(v * yaw rate / g)), the wheels rolled in the vertex shader; one instanced mesh per kind and LOD
//            (capacity >= 1100: r187 binds the matrices as a vertex buffer, one shader whatever the count), rebuilt
//            each frame without allocation.
// The geometries come from models/<kind>/<kind>_city.glb (tools/moto/pack.mjs parked_lod1..3 / ridden_lod1..3), loaded a
// few seconds after the boot (not on the startup's critical path).
import * as THREE from "three/webgpu";
import { FadeSlots, StreamPool, Streamer, buildSource, MARGIN } from "../instanceStream.js";
import { cityMaterial } from "./twoWheelMats.js";
import { InstancePrev } from "../instMotion.js";   // --- instmotion: per-bike motion vectors for the TAAU (docs/UPSCALE.md)
import { CITY_PAINTS } from "./twoWheelSlots.js";
import { loadCityTwoWheeler } from "./motoModel.js";
import { cityProps } from "../props/cityProps.js";

const qs = new URLSearchParams(location.search);
export const TW_KINDS = ["moto", "scooter"];
const BAND = [25, 80, 220];                     // LOD switches and the end (m)
const RADIUS = 1.3;                             // a bike's bounding radius (m)
const STRIDE = 8;                               // per parked bike: kind, x, y, z, yaw, pitch, paint index, 0
const DATA = new URL("../../data/streetlife/", import.meta.url);
const POI_KINDS = new Set(["shop", "restaurant", "fastfood", "supermarket", "cafe", "bar", "pub"]);
const LEN = { moto: 2.12, scooter: 1.95 }, WIDTH = { moto: 0.8, scooter: 0.76 }, HEIGHT = { moto: 1.2, scooter: 1.3 };
const WB = { moto: 1.45, scooter: 1.37 };

function hash(a, b) { let h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
const linear = (hex) => { const c = new THREE.Color().setHex(hex); return [c.r, c.g, c.b]; };
const PAINTS = Object.fromEntries(TW_KINDS.map((k) => [k, CITY_PAINTS[k].map(linear)]));

export const twoWheelFades = new FadeSlots();

export const cityTwoWheelers = {
  on: qs.get("twowheelers") !== "0",
  ready: false, geo: null, pools: [], tiles: new Map(), pending: [], group: null, streamer: null,
  stats: { tiles: 0, parked: 0, moto: 0, scooter: 0, slots: 0 },

  /** main.js, once: the pools (their geometries load `delay` ms later, off the boot) */
  start({ scene, updaters, log = console.log, delay = 6000 }) {
    if (!this.on) return null;
    this.group = new THREE.Group(); this.group.name = "twowheelers";
    scene.add(this.group);
    updaters.push((eye, cam) => this.update(cam));
    this.traffic = new TwoWheelTraffic(this.group);
    window.__twowheelers = this;
    setTimeout(() => this.load(log).catch((e) => { log(`two-wheelers: ${e.message}`); this.on = false; }), delay);
    return this;
  },
  async load(log) {
    const t0 = performance.now();
    const geos = await Promise.all(TW_KINDS.map((k) => loadCityTwoWheeler(k)));
    this.geo = Object.fromEntries(TW_KINDS.map((k, i) => [k, geos[i]]));
    this.mats = [0, 1, 2].map((lod) => cityProps.hook(cityMaterial(lod, { fades: twoWheelFades, name: "parked" })));   // (props: knocked-over bikes' motion vectors)
    for (const k of TW_KINDS) this.pools.push(this.pool(k));
    this.streamer = new Streamer({ name: "twowheelers", pools: this.pools.map((p) => p.stream), fades: twoWheelFades, budget: 0.1 });
    cityProps.prepare(this.streamer, TW_KINDS);
    this.ready = true;
    for (const [name, g] of this.pending) this.stream(name, g);
    this.pending.length = 0;
    this.traffic?.build(this.geo);
    log(`two-wheelers: parked + traffic models ${Math.round(performance.now() - t0)} ms (?twowheelers=0 off)`);
  },
  /** one kind's pool: three LOD meshes (StreetKitPool's layout) */
  pool(kind) {
    const live = [[0, BAND[0] * 1.1], [BAND[0] * 0.9, BAND[1] * 1.1], [BAND[1] * 0.9, BAND[2]]];
    const spec = this.geo[kind].parked.map((geo, k) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, this.mats[k], 1);
      m.castShadow = k < 2; m.receiveShadow = true; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `twowheel-${kind}-lod${k}`;
      this.group.add(m);
      return { mesh: m, l0: live[k][0], l1: live[k][1], attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", "iBand", 4], ["iPaint", "iPaint", 4]] };
    });
    return { kind, stream: new StreamPool(kind, spec, RADIUS, MARGIN) };
  },

  /** the shops / cafés of a tile (data/streetlife/<T>.json pois): Float32Array x, z pairs, or null */
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      const P = (d?.pois || []).filter((p) => POI_KINDS.has(p.kind) || POI_KINDS.has(p.cat));
      return Float32Array.from(P.flatMap((p) => [p.face?.x ?? p.x, p.face?.z ?? p.z]));
    });
  },
  /** cars.js buildCars twoWheel: the parked-car sites (x, z, yaw) that go to two-wheelers */
  picker(pois) {
    if (!this.on) return null;
    return (sites) => {
      const take = new Set();
      sites.forEach((s, i) => {
        let near = false;
        if (pois) for (let k = 0; k < pois.length && !near; k += 2) near = (pois[k] - s.x) ** 2 + (pois[k + 1] - s.z) ** 2 < 900;
        const h = hash(s.x * 0.37, s.z * 0.53);
        if (h < (near ? 0.17 : 0.025)) take.add(i);
      });
      return take;
    };
  },
  /** a tile's two-wheeler slots (cars.js twoSites) -> bikes + their colliders (in parent: the tile's features) */
  addTile(name, sites, parent, ground) {
    if (!this.on || !sites?.length) return null;
    const rec = [];
    for (const s of sites) {
      const hc = s.yaw + Math.PI / 2, ax = Math.sin(hc), az = Math.cos(hc);
      const h0 = hash(s.z * 0.21, s.x * 0.17), n = h0 < 0.55 ? 3 : 2;
      const offs = n === 3 ? [-1.35, 0, 1.35] : [-0.75, 0.75];
      const face = hash(s.x * 0.71, s.z * 0.29) < 0.5 ? 1 : -1;          // rear or front to the kerb (the whole group)
      offs.forEach((u, j) => {
        const hk = hash(s.x + j * 3.1, s.z - j * 1.7);
        const kind = hk < 0.45 ? "moto" : "scooter";
        const yaw = hc + face * Math.PI / 2 + (hash(s.z + j, s.x) - 0.5) * 0.4;
        const x = s.x + ax * u, z = s.z + az * u;
        const fx = Math.sin(yaw) * WB[kind] / 2, fz = Math.cos(yaw) * WB[kind] / 2;
        const yF = ground(x + fx, z + fz), yR = ground(x - fx, z - fz);
        const pitch = Math.atan2(yF - yR, WB[kind]);
        rec.push(TW_KINDS.indexOf(kind), x, (yF + yR) / 2, z, yaw, pitch, Math.floor(hash(x * 1.3, z * 0.7) * PAINTS[kind].length), 0);
        this.stats[kind]++;
      });
    }
    const a = new Float32Array(rec), n = a.length / STRIDE;
    // colliders: an invisible box per bike (the drive / walk collision code reads them by name)
    const g = new THREE.Group(); g.name = `twowheel-${name}`;
    const col = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicNodeMaterial(), n);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE, kind = TW_KINDS[a[o]];
      M.compose(v.set(a[o + 1], a[o + 2], a[o + 3]), q.setFromAxisAngle(up, a[o + 4]), sc.set(WIDTH[kind], HEIGHT[kind], LEN[kind]));
      col.setMatrixAt(i, M);
    }
    col.computeBoundingSphere();
    col.name = "furniture-twowheel"; col.visible = false; col.castShadow = col.receiveShadow = false; col.userData.collisionStandin = true;
    // (props, docs/PROPS.md) each parked bike a prop: tipped over and slid when hit; drawn by its kind's pool instance
    // (the index among its kind's records: stream() builds each kind's source in record order)
    if (cityProps.on) {
      const seen = [0, 0], self = this;
      col.userData.refs = Array.from({ length: n }, (_, i) => {
        const o = i * STRIDE, ki = a[o], kind = TW_KINDS[ki];
        return cityProps.make(kind, name, a[o + 1], a[o + 2], a[o + 3], a[o + 4], [{ get streamer() { return self.streamer; }, tile: name, key: kind, i: seen[ki]++ }])?.ref || null;
      });
    }
    g.add(col);
    parent.add(g);
    this.stats.tiles++; this.stats.parked += n; this.stats.slots += sites.length;
    this.tiles.set(name, { a, group: g, n });
    if (this.ready) this.stream(name, g); else this.pending.push([name, g]);
    return { bikes: n, slots: sites.length };
  },
  /** the tile's bikes into the city pools (sources per kind) */
  stream(name, g) {
    const t = this.tiles.get(name);
    if (!t) return;
    this.streamer.addTile(name, g, (slot) => {
      const out = {};
      for (let ki = 0; ki < TW_KINDS.length; ki++) {
        const idx = [];
        for (let i = 0; i < t.n; i++) if (t.a[i * STRIDE] === ki) idx.push(i);
        if (!idx.length) continue;
        const m = idx.length, Mx = new Float32Array(m * 16), B = new Float32Array(m * 4), Pn = new Float32Array(m * 4), cen = new Float32Array(m * 4);
        idx.forEach((i, j) => {
          const o = i * STRIDE, x = t.a[o + 1], y = t.a[o + 2], z = t.a[o + 3], h = t.a[o + 4], a2 = -t.a[o + 5];
          const ch = Math.cos(h), sh = Math.sin(h), ca = Math.cos(a2), sa = Math.sin(a2), k = j * 16;
          // R = Ry(h) Rx(-pitch) (column-major): col0 (ch, 0, -sh), col1 (sh sa, ca, ch sa), col2 (sh ca, -sa, ch ca)
          Mx[k] = ch; Mx[k + 2] = -sh; Mx[k + 4] = sh * sa; Mx[k + 5] = ca; Mx[k + 6] = ch * sa; Mx[k + 8] = sh * ca; Mx[k + 9] = -sa; Mx[k + 10] = ch * ca;
          Mx[k + 12] = x; Mx[k + 13] = y; Mx[k + 14] = z; Mx[k + 15] = 1;
          B.set([BAND[0], BAND[1], BAND[2], slot], j * 4);
          const p = PAINTS[TW_KINDS[ki]][t.a[o + 6]]; Pn.set([p[0], p[1], p[2], 0], j * 4);
          cen.set([x, y + 0.6, z, RADIUS], j * 4);
        });
        out[TW_KINDS[ki]] = buildSource(m, { instanceMatrix: [Mx, 16], iBand: [B, 4], iPaint: [Pn, 4] }, cen);
      }
      return out;
    });
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    for (const m of t.group.children) { m.geometry?.dispose(); m.dispose?.(); }
    this.tiles.delete(name);
    this.pending = this.pending.filter(([n]) => n !== name);
    this.streamer?.removeTile(name);
  },
  update(camera) {
    if (!this.ready) return;
    this.streamer.update(camera);
  },
  report() {
    return { ...this.stats, ready: this.ready, drawn: this.pools.reduce((s, p) => s + p.stream.meshes.filter((m) => m.mesh.visible).length, 0),
      instances: this.pools.map((p) => [p.kind, p.stream.meshes.map((m) => m.n)]), stream: this.streamer ? { ...this.streamer.stats } : null,
      tris: this.geo ? Object.fromEntries(TW_KINDS.map((k) => [k, this.geo[k].parked.map((g) => g.index.count / 3)])) : null, traffic: this.traffic?.stats };
  },
};

// ------------------------------------------------------------------------------------------------ the traffic's two-wheelers
const CAP = 1100;
/** the traffic types (viewer/traffic/traffic.js appends them to the cars'): sizes, axles, how they drive */
export const TRAFFIC_TYPES = [
  { name: "moto", len: 2.12, w: 0.8, h: 1.45, wb: 1.45, wheelR: 0.31, weight: 0.03, two: true, accel: 1.9, speed: 1.08 },
  { name: "scooter", len: 1.95, w: 0.76, h: 1.55, wb: 1.37, wheelR: 0.235, weight: 0.035, two: true, accel: 1.4, speed: 0.95 },
];

export class TwoWheelTraffic {
  constructor(group) {
    this.group = group; this.ready = false;
    this.stats = { drawn: 0, ms: 0 };
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sphere = new THREE.Sphere(new THREE.Vector3(), RADIUS);
    this.meshes = [];          // [kind][lod]
    this.firstType = -1;
  }
  build(geo) {
    const mats = [0, 1, 2].map((lod) => cityMaterial(lod, { roll: true, name: "traffic" }));
    this.prev = new InstancePrev(TW_KINDS.length * 3 * CAP, "twoWheelPrev");      // --- instmotion
    for (const m of mats) this.prev.hook(m);
    this.meshes = TW_KINDS.map((k) => geo[k].ridden.map((src, lod) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(src.attributes)) g.setAttribute(a, src.attributes[a]);
      g.setIndex(src.index);
      g.setAttribute("iBand", new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4));
      g.setAttribute("iPaint", new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4));
      g.setAttribute("iPose", new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4));
      const m = new THREE.InstancedMesh(g, mats[lod], CAP);
      m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = lod < 2; m.receiveShadow = true;
      m.name = `twowheel-traffic-${k}-lod${lod}`;
      this.prev.register(m, CAP);                                                  // --- instmotion
      this.group.add(m);
      return m;
    }));
    this.ready = true;
  }
  /** after the car fleet's update: the sim's two-wheelers at interpolation alpha */
  update(sim, types, alpha, camera) {
    if (!this.ready) return;
    const t0 = performance.now();
    if (this.firstType < 0) this.firstType = types.findIndex((t) => t.two);
    if (this.firstType < 0) return;
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm, THREE.WebGPUCoordinateSystem, camera.reversedDepth);
    const cp = camera.position, a = alpha, b1 = 1 - alpha;
    for (const L of this.meshes) for (const m of L) m.count = 0;
    this.prev.begin(cp);                                                           // --- instmotion
    let drawn = 0;
    for (let i = 0; i < sim.cap; i++) {
      if (!sim.alive[i]) continue;
      const ti = sim.type[i] - this.firstType;
      if (ti < 0 || ti >= TW_KINDS.length) continue;
      const x = sim.px[i] * b1 + sim.x[i] * a, y = sim.py[i] * b1 + sim.y[i] * a, z = sim.pz[i] * b1 + sim.z[i] * a;
      const dx = x - cp.x, dy = y - cp.y, dz = z - cp.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > BAND[2]) continue;
      this.sphere.center.set(x, y + 0.7, z);
      if (!this.frustum.intersectsSphere(this.sphere)) continue;
      let yaw = sim.yaw[i], py = sim.pyaw[i], dyw = yaw - py;
      if (dyw > Math.PI) dyw -= 2 * Math.PI; else if (dyw < -Math.PI) dyw += 2 * Math.PI;
      yaw = py + dyw * a;
      // the lean of a coordinated turn: atan(v * yaw rate / g), smoothed per bike
      const v = sim.v[i], rate = dyw * 20;               // (the sim steps at 20 Hz)
      const want = Math.max(-0.6, Math.min(0.6, Math.atan(v * rate / 9.81)));
      const lean = ((sim.lean ||= new Float32Array(sim.cap))[i] += (want - sim.lean[i]) * 0.15);
      const pitch = sim.ppitch[i] * b1 + sim.pitch[i] * a;
      const spin = sim.pspin[i] * b1 + sim.spin[i] * a;
      for (let lod = 0; lod < 3; lod++) {
        const lo = lod === 0 ? 0 : BAND[lod - 1] * 0.9, hi = lod === 2 ? BAND[2] : BAND[lod] * 1.1;
        if (d < lo || d > hi) continue;
        const m = this.meshes[ti][lod];
        if (m.count >= CAP) continue;
        const n = m.count++, e = m.instanceMatrix.array, o = n * 16;
        // R = Ry(yaw) Rx(-pitch) Rz(-lean) (column-major)
        const ch = Math.cos(yaw), sh = Math.sin(yaw), ca = Math.cos(-pitch), sa = Math.sin(-pitch), cl = Math.cos(-lean), sl = Math.sin(-lean);
        // A = Ry Rx: col0 (ch, 0, -sh), col1 (sh sa, ca, ch sa), col2 (sh ca, -sa, ch ca); R = A Rz: col0 = A0 cl + A1 sl, col1 = -A0 sl + A1 cl
        const a0x = ch, a0y = 0, a0z = -sh, a1x = sh * sa, a1y = ca, a1z = ch * sa;
        e[o] = a0x * cl + a1x * sl; e[o + 1] = a0y * cl + a1y * sl; e[o + 2] = a0z * cl + a1z * sl; e[o + 3] = 0;
        e[o + 4] = -a0x * sl + a1x * cl; e[o + 5] = -a0y * sl + a1y * cl; e[o + 6] = -a0z * sl + a1z * cl; e[o + 7] = 0;
        e[o + 8] = sh * ca; e[o + 9] = -sa; e[o + 10] = ch * ca; e[o + 11] = 0;
        e[o + 12] = x; e[o + 13] = y; e[o + 14] = z; e[o + 15] = 1;
        const G = m.geometry.attributes, k4 = n * 4;
        G.iBand.array[k4] = BAND[0]; G.iBand.array[k4 + 1] = BAND[1]; G.iBand.array[k4 + 2] = BAND[2]; G.iBand.array[k4 + 3] = 0;
        G.iPaint.array[k4] = sim.paint[i * 3]; G.iPaint.array[k4 + 1] = sim.paint[i * 3 + 1]; G.iPaint.array[k4 + 2] = sim.paint[i * 3 + 2]; G.iPaint.array[k4 + 3] = spin;
        G.iPose.array[k4] = yaw; G.iPose.array[k4 + 1] = -lean; G.iPose.array[k4 + 2] = sim.steer[i]; G.iPose.array[k4 + 3] = 0;
        this.prev.put(m, n, i, sim.gen[i], x, y, z, yaw);                          // --- instmotion
      }
      drawn++;
    }
    for (const L of this.meshes) for (const m of L) {
      m.visible = m.count > 0;
      if (!m.visible) continue;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, m.count * 16); m.instanceMatrix.needsUpdate = true;
      for (const nm of ["iBand", "iPaint", "iPose"]) { const at = m.geometry.attributes[nm]; at.clearUpdateRanges(); at.addUpdateRange(0, m.count * 4); at.needsUpdate = true; }
    }
    this.prev.end();                                                               // --- instmotion
    this.stats.drawn = drawn;
    this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
  }
}
