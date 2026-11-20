// PHYSICS PROPS IN THE CITY (docs/PROPS.md, rule physics-props; ?props=old = the street furniture as static colliders, as before).
// The physics is viewer/props/propWorld.js (one world on the Driver: the car and the two-wheelers hit through carEnv.js).
// This file is the main-thread glue:
//   registry  each layer makes its hittable pieces props when a tile lands (make(): class, tile, foot, MEMBERS = the
//             instances that draw it) and puts each prop's ref on its collision stand-in (userData.refs: driveMode.js
//             featureColliders carries it into the drive colliders, colliders.js skips the collider while ref.hidden):
//               furniture2   bins (bin_round, bin_column)              cityFurniture.js
//               street kit   sign posts + their plates, Villo bikes  cityStreetKit.js
//               two-wheelers the parked motorbikes / scooters        moto/cityTwoWheelers.js
//               street life  café terrace tables + their chairs     streetlife/streetlife.js
//               streets      the UrbIS bollards                      main.js (drawn.bollards refs) + streetFit.js
//               police       the accident job's cones                police/props.js (a collider of their own)
//   members   a member is a pool instance (a layer's Streamer: tile, pool key, instance index; viewer/instanceStream.js)
//             or a plain instanced mesh's instance (the tile's bollards, the cones). On its first wake a prop takes its
//             members' drawn matrices as its rest frame (the first member's) and its shape (their boxes, from the drawn
//             geometry: the kits' feet run into the ground, so a torn-out bin shows its foot)
//   hide      a woken prop's members leave their pools: their matrix patched to a zero scale where the pool holds them
//             (StreamPool.patch: one update range, the source too, so a later gather keeps it hidden); restored on reset
//   proxies   the displaced props are drawn by small instanced meshes per piece and LOD (the pool's own geometry,
//             material and per-instance columns: the same LOD dither, tile fade, paint), FIXED capacity, static buffers
//             + needsUpdate + update ranges (never DynamicDrawUsage), written only while something moves or the camera
//             moved; per-instance motion vectors (instMotion.js InstancePrev: the layers' materials are hooked once at
//             start, before their first compile; a static pool mesh has no rows: no motion). Draws: one per piece / LOD
//             that has a displaced prop in its band, never one per prop; shadows as the pool's
//   walker    the third person kicks the light props (bins, cones, chairs, tables, Villo bikes): the rest ones from a
//             grid per tile; their stand-ins are not walker posts (userData.kick)
//   traffic   the displaced props are box obstacles of the traffic (cityTraffic.js -> obstacles())
//   events    "propHit" (on()): { kind, impulse, point, speed }, for the sound job (no audio here)
import * as THREE from "three/webgpu";
import { InstancePrev } from "../instMotion.js";
import { PropWorld, CLASSES, PROPS_OLD, PROP, poseMatrix } from "./propWorld.js";

export const PROPS_ON = !PROPS_OLD;
const CAP = 64;                                 // proxy instances per piece and LOD
const prev = PROPS_ON ? new InstancePrev(6144, "propPrev") : null;
const CELL = 16;
const hidden16 = new Float32Array(16), M16 = new Float64Array(16), P16 = new Float64Array(16);

/** a: column-major 4x4 (offset ao) times b (offset bo) into out (offset oo) */
function mul4(a, ao, b, bo, out, oo) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[bo + c * 4], b1 = b[bo + c * 4 + 1], b2 = b[bo + c * 4 + 2], b3 = b[bo + c * 4 + 3];
    for (let r = 0; r < 4; r++) out[oo + c * 4 + r] = a[ao + r] * b0 + a[ao + 4 + r] * b1 + a[ao + 8 + r] * b2 + a[ao + 12 + r] * b3;
  }
}
/** the inverse of a rigid column-major 4x4 (rotation + translation; any scale divided out) */
function invRigid(m, out) {
  const sx = Math.hypot(m[0], m[1], m[2]) || 1, sy = Math.hypot(m[4], m[5], m[6]) || 1, sz = Math.hypot(m[8], m[9], m[10]) || 1;
  const r00 = m[0] / sx, r10 = m[1] / sx, r20 = m[2] / sx, r01 = m[4] / sy, r11 = m[5] / sy, r21 = m[6] / sy, r02 = m[8] / sz, r12 = m[9] / sz, r22 = m[10] / sz;
  out[0] = r00; out[1] = r01; out[2] = r02; out[3] = 0;
  out[4] = r10; out[5] = r11; out[6] = r12; out[7] = 0;
  out[8] = r20; out[9] = r21; out[10] = r22; out[11] = 0;
  const tx = m[12], ty = m[13], tz = m[14];
  out[12] = -(r00 * tx + r10 * ty + r20 * tz); out[13] = -(r01 * tx + r11 * ty + r21 * tz); out[14] = -(r02 * tx + r12 * ty + r22 * tz); out[15] = 1;
  return out;
}
/** the rest matrix with a zero scale (the instance collapses onto its foot: drawn as nothing) */
function hiddenOf(rest) { hidden16.fill(0); hidden16[12] = rest[12]; hidden16[13] = rest[13]; hidden16[14] = rest[14]; hidden16[15] = 1; return hidden16; }

/** one piece's proxies: a mesh per LOD (the pool's geometry + material), fixed capacity, its per-instance columns */
class ProxyKind {
  /** lods: [{ geometry, material, castShadow, receiveShadow, l0, l1 }], attrs: [[attribute, column, width]] */
  constructor(key, lods, attrs, group) {
    this.key = key; this.attrs = attrs;
    const g0 = lods[0].geometry;
    if (!g0.boundingBox) g0.computeBoundingBox();
    this.bbox = g0.boundingBox.clone();
    this.r = this.bbox.min.distanceTo(this.bbox.max) / 2;
    this.lods = lods.map((L, k) => {
      const g = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(L.geometry.attributes)) if (!a.isInstancedBufferAttribute && !a.data?.isInstancedInterleavedBuffer) g.setAttribute(name, a);
      g.setIndex(L.geometry.index);
      g.userData.shared = true;
      for (const [name, , w] of attrs) g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(CAP * w), w));
      const mesh = new THREE.InstancedMesh(g, L.material, CAP);
      mesh.count = 0; mesh.visible = false; mesh.frustumCulled = true; mesh.boundingSphere = new THREE.Sphere();
      mesh.castShadow = !!L.castShadow; mesh.receiveShadow = L.receiveShadow !== false;
      mesh.name = `props-${key}-lod${k}`;
      prev?.register(mesh, CAP);
      group.add(mesh);
      return { mesh, l0: L.l0, l1: L.l1, n: 0, box: new Float64Array(6) };
    });
  }
}

export const cityProps = {
  on: PROPS_ON,
  world: null, driver: null, group: null, kinds: new Map(), tiles: new Map(), listeners: [],
  stats: { props: 0, byClass: {}, byTile: {}, drawn: 0, renderMs: 0, rebuilds: 0, hooked: 0 },
  cam: new THREE.Vector3(1e9, 0, 0),
  /** a material the props' proxies draw with: per-instance motion vectors (once, before its first compile) */
  hook(mat) {
    if (!PROPS_ON || !prev || !mat || mat.userData?.propsHooked) return mat;
    prev.hook(mat);
    (mat.userData ||= {}).propsHooked = true; mat.needsUpdate = true;
    this.stats.hooked++;
    return mat;
  },
  /** main.js, once the Driver exists */
  start({ scene, updaters, driver, log = console.log }) {
    if (!PROPS_ON || !driver?.props) { this.on = false; return null; }
    this.driver = driver; this.world = driver.props;
    if (!this.group) { this.group = new THREE.Group(); this.group.name = "props"; }
    // night (cityNight.js): the proxies cast on the lamp maps' MOVER layer (redrawn while they move, over the static
    // cache), a marker at the awake bodies tells the lamps something moves there; a prop leaving / rejoining its pool
    // re-renders the maps' static casters (refreshStatic: the cache would keep its old shadow)
    this.group.userData.lampMover = true;
    this.marker = new THREE.Object3D(); this.marker.name = "props-night-marker"; this.marker.position.set(1e6, -1e4, 1e6);
    this.marker.userData.nightMover = 3;
    this.group.add(this.marker);
    scene.add(this.group);
    const W = this.world;
    W.onResolve = (p) => this.resolve(p);
    W.onWake = (p) => this.show(p, false);
    W.onReset = (p) => this.show(p, true);
    W.on("propHit", (e) => { for (const f of this.listeners) try { f(e); } catch (err) { console.warn("[props] listener:", err); } });
    let last = performance.now(), framed = -1;
    updaters.push((eye, cam) => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      // the walker (third person) kicks; nobody drives: the bodies settle on their own
      const th = window.__third;
      if (th?.on && th.tp) { const P = th.tp.ctl.pos, V = th.tp.ctl.vel; W.walk(P[0], P[1], P[2], V[0], V[2], this.restNear(P[0], P[2])); }
      if (W.framed === framed) W.frame(dt, cam.position.x, cam.position.z);
      framed = W.framed;
      this.render(cam);
    });
    window.__props = this;
    log(`props: on (?props=old off): ${Object.keys(CLASSES).join(", ")}; ${PROP.N} awake bodies at most, proxies ${CAP} per piece / LOD`);
    return this;
  },
  /** subscribe to "propHit" { kind, impulse (N s), point { x, y, z }, speed (m/s) } */
  on(ev, f) { if (ev !== "propHit") return () => {}; this.listeners.push(f); return () => { const k = this.listeners.indexOf(f); if (k >= 0) this.listeners.splice(k, 1); }; },

  // ---------------------------------------------------------------- the registry
  /** a prop of class `cls` (CLASSES key) in `tile`, its foot (x, y, z, yaw), drawn by `members` ([{ streamer, tile, key,
   *  i } | { mesh, i }]); -> the prop, its collider ref in p.ref (put it on the stand-in's userData.refs) */
  make(cls, tile, x, y, z, yaw, members, ref = null) {
    const C = CLASSES[cls];
    if (!PROPS_ON || !C) return null;
    const p = PropWorld.make(C, x, y, z, yaw, tile);
    p.members = members;
    for (const h of members) if (h.mesh) this.kindOf(h);                     // (a plain mesh's proxies: made, and warmed, now)
    p.ref = ref || { hidden: false };
    p.ref.prop = p;
    let T = this.tiles.get(tile);
    if (!T) this.tiles.set(tile, (T = { props: [], grid: new Map() }));
    T.props.push(p);
    if (C.walk) {
      const k = Math.floor(x / CELL) * 65536 + Math.floor(z / CELL);
      let L = T.grid.get(k); if (!L) T.grid.set(k, (L = [])); L.push(p);
    }
    this.stats.props++; this.stats.byClass[cls] = (this.stats.byClass[cls] || 0) + 1;
    (this.stats.byTile[tile] ||= {})[cls] = (this.stats.byTile[tile][cls] || 0) + 1;
    return p;
  },
  /** a tile's props back to rest and forgotten (its layers unload it; they rebuild their pieces at rest) */
  removeTile(tile) {
    const T = this.tiles.get(tile);
    if (!T) return;
    this.world?.removeTile(tile);
    for (const p of T.props) { this.stats.props--; this.stats.byClass[p.cls.name]--; }
    delete this.stats.byTile[tile];
    this.tiles.delete(tile);
  },
  /** the rest props within 2 m of (x, z) that a walker can kick (reused array) */
  restNear(x, z) {
    const out = (this._near ||= []);
    out.length = 0;
    const i0 = Math.floor((x - 2) / CELL), i1 = Math.floor((x + 2) / CELL), j0 = Math.floor((z - 2) / CELL), j1 = Math.floor((z + 2) / CELL);
    for (const T of this.tiles.values()) for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const L = T.grid.get(i * 65536 + j);
      if (L) for (let q = 0; q < L.length; q++) { const p = L[q]; if (p.state === 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < 4) out.push(p); }
    }
    return out;
  },
  /** the traffic's obstacle hook (cityTraffic.js): the displaced props as boxes the cars brake for */
  obstacles(sim) {
    if (!this.world) return 0;
    const d = this.driver, x = d?.on && d.state ? d.state.x : this.cam.x, z = d?.on && d.state ? d.state.z : this.cam.z;
    return this.world.addObstacles(sim, x, z);
  },

  /** a layer's pools that hold props (keys): their proxies made now (at the layer's start: warmed with the boot) */
  prepare(streamer, keys) {
    if (!PROPS_ON || !streamer) return;
    for (const key of keys) if (streamer.pools.some((p) => p.key === key)) this.kindOf({ streamer, key });
  },
  // ---------------------------------------------------------------- members
  kindOf(h) {
    if (h.kind) return h.kind;
    let key, make;
    if (!h.mesh) {
      if (!h.streamer) return null;                                          // (its layer not loaded yet: the two-wheelers' models)
      key = `${h.streamer.name}:${h.key}`;
      make = () => {
        const pool = h.streamer.pools.find((p) => p.key === h.key);
        if (!pool) return null;
        const attrs = pool.meshes[0].attrs.filter((a) => a[0] !== "instanceMatrix");
        return new ProxyKind(key, pool.meshes.map((m) => ({ geometry: m.mesh.geometry, material: m.mesh.material, castShadow: m.mesh.castShadow, receiveShadow: m.mesh.receiveShadow, l0: m.l0, l1: m.l1 })), attrs, this.group);
      };
    } else {
      key = `mesh:${h.mesh.name}:${h.mesh.geometry.uuid}`;
      make = () => new ProxyKind(key, [{ geometry: h.mesh.geometry, material: h.mesh.material, castShadow: h.mesh.castShadow, receiveShadow: h.mesh.receiveShadow, l0: 0, l1: 400 }], [], this.group);
    }
    let K = this.kinds.get(key);
    if (!K) {
      if (!this.group) { this.group = new THREE.Group(); this.group.name = "props"; }
      K = make(); if (!K) return null; this.kinds.set(key, K);
      for (const L of K.lods) (this.warmQ ||= []).push(L.mesh);
    }
    return (h.kind = K);
  },
  /** a prop's first wake: its members' drawn matrices (rest), columns, local frames; its shape from their boxes */
  resolve(p) {
    const mem = [];
    for (const h of p.members || []) {
      const K = this.kindOf(h);
      if (!K) continue;
      const rest = new Float64Array(16), cols = {};
      if (!h.mesh) {
        const s = h.streamer.source(h.tile, h.key, h.i);
        if (!s) continue;
        const M = s.src.cols.instanceMatrix;
        for (let k = 0; k < 16; k++) rest[k] = M[s.j * 16 + k];
        for (const [, col, w] of K.attrs) cols[col] = s.src.cols[col].slice(s.j * w, s.j * w + w);
      } else {
        const A = h.mesh.instanceMatrix.array;
        for (let k = 0; k < 16; k++) rest[k] = A[h.i * 16 + k];
      }
      if (rest[0] === 0 && rest[5] === 0 && rest[10] === 0) continue;        // (already hidden: a Villo bike the player took)
      mem.push({ h, K, rest, cols, local: new Float64Array(16) });
    }
    p.mem = mem;
    if (!mem.length) return;
    p.rest = Float64Array.from(mem[0].rest);
    const inv = invRigid(p.rest, new Float64Array(16));
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    const v = new THREE.Vector3(), L4 = new THREE.Matrix4();
    for (const m of mem) {
      mul4(inv, 0, m.rest, 0, m.local, 0);
      L4.fromArray(m.local);
      const b = m.K.bbox;
      for (let c = 0; c < 8; c++) {
        v.set(c & 1 ? b.max.x : b.min.x, c & 2 ? b.max.y : b.min.y, c & 4 ? b.max.z : b.min.z).applyMatrix4(L4);
        x0 = Math.min(x0, v.x); y0 = Math.min(y0, v.y); z0 = Math.min(z0, v.z); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); z1 = Math.max(z1, v.z);
      }
    }
    const S = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, hx: Math.max(0.04, (x1 - x0) / 2), hy: Math.max(0.05, (y1 - y0) / 2), hz: Math.max(0.04, (z1 - z0) / 2) };
    if (p.cls.shape === "moto") S.stand = p.cls.name === "moto" ? this.standSide(mem[0].K) : 0;
    p.shape = S;
    p.extraMass = (mem.length - 1) * 2.5;                                      // (a sign's plates)
  },
  /** a parked motorbike's side stand: the side its model leans to (the mean x of its top vertices) */
  standSide(K) {
    if (K.stand !== undefined) return K.stand;
    const P = K.lods[0].mesh.geometry.attributes.position, top = K.bbox.max.y * 0.6;
    let s = 0;
    for (let i = 0; i < P.count; i++) if (P.getY(i) > top) s += P.getX(i);
    return (K.stand = s >= 0 ? 1 : -1);
  },
  /** a prop's members out of / back into their layers (hide: zero scale where the pools hold them) */
  show(p, back) {
    for (const m of p.mem || []) {
      const h = m.h, vals = back ? Float32Array.from(m.rest) : hiddenOf(m.rest);
      if (!h.mesh) h.streamer?.patch(h.tile, h.key, h.i, "instanceMatrix", vals);
      else {
        const A = h.mesh.instanceMatrix;
        A.array.set(vals, h.i * 16);
        A.addUpdateRange(h.i * 16, 16); A.needsUpdate = true;
      }
    }
    this.dirty = true;
    window.__night?.refreshStatic?.();
  },

  // ---------------------------------------------------------------- the proxies
  /** new proxies drawn for a few real frames 1 km under the camera (police/warm.js's way): their pipelines are built in
   *  the passes they will be used in, before any prop is knocked (most share the pools' anyway: same material + layout) */
  warm(cp) {
    const Q = this.warmQ;
    if (!Q?.length && !this.warming?.length) return;
    if (this.warming?.length) {
      if (++this.warmF < 4) { for (const m of this.warming) { const e = m.instanceMatrix.array; e[12] = cp.x; e[13] = cp.y - 1000; e[14] = cp.z; m.instanceMatrix.addUpdateRange(0, 16); m.instanceMatrix.needsUpdate = true; } return; }
      for (const m of this.warming) { m.count = 0; m.visible = false; m.frustumCulled = true; }
      this.warming = null;
      this.dirty = true;
      return;
    }
    this.warming = Q.splice(0, Q.length); this.warmF = 0;
    for (const m of this.warming) {
      const e = m.instanceMatrix.array; e.fill(0, 0, 16); e[0] = e[5] = e[10] = e[15] = 1; e[12] = cp.x; e[13] = cp.y - 1000; e[14] = cp.z;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, 16); m.instanceMatrix.needsUpdate = true;
      m.count = 1; m.visible = true; m.frustumCulled = false;
    }
  },
  render(cam) {
    const W = this.world;
    if (!W) return;
    const t0 = performance.now();
    if (this.warmQ?.length || this.warming) { this.warm(cam.position); if (this.warming) return; }
    const cp = cam.position, camMoved = cp.distanceToSquared(this.cam) > 1;
    let any = W.moved > 0 || this.dirty;
    for (let q = 0; q < W.dN && !any; q++) if (W.dmoved[q]) any = true;
    if (!any && !camMoved) return;
    if (!W.dN && !this.drawnLast) return;
    this.dirty = false; this.cam.copy(cp);
    for (const K of this.kinds.values()) for (const L of K.lods) { L.n = 0; L.box.fill(Infinity, 0, 3); L.box.fill(-Infinity, 3, 6); }
    prev?.begin(cp);
    let drawn = 0;
    for (let q = 0; q < W.dN; q++) {
      const p = W.dprop[q];
      if (W.dmoved[q]) W.dmoved[q]--;
      if (!p.mem) continue;
      poseMatrix(W.dpos[q * 3], W.dpos[q * 3 + 1], W.dpos[q * 3 + 2], W.dq[q * 4], W.dq[q * 4 + 1], W.dq[q * 4 + 2], W.dq[q * 4 + 3], P16, 0);
      for (let mi = 0; mi < p.mem.length; mi++) {
        const m = p.mem[mi], K = m.K;
        mul4(P16, 0, m.local, 0, M16, 0);
        const x = M16[12], y = M16[13], z = M16[14], d = Math.sqrt((x - cp.x) ** 2 + (y - cp.y) ** 2 + (z - cp.z) ** 2);
        for (let li = 0; li < K.lods.length; li++) {
          const L = K.lods[li];
          if (d < L.l0 - 2 || d > L.l1 + 2 || L.n >= CAP) continue;
          const n = L.n++, e = L.mesh.instanceMatrix.array;
          for (let k = 0; k < 16; k++) e[n * 16 + k] = M16[k];
          for (let a = 0; a < K.attrs.length; a++) {
            const at = K.attrs[a], w = at[2], A = L.mesh.geometry.attributes[at[0]].array, c = m.cols[at[1]];
            for (let k = 0; k < w; k++) A[n * w + k] = c[k];
          }
          const B = L.box, r = K.r;
          if (x - r < B[0]) B[0] = x - r; if (y - r < B[1]) B[1] = y - r; if (z - r < B[2]) B[2] = z - r;
          if (x + r > B[3]) B[3] = x + r; if (y + r > B[4]) B[4] = y + r; if (z + r > B[5]) B[5] = z + r;
          prev?.put(L.mesh, n, q * 8 + Math.min(7, mi), W.dgen[q], x, y, z, Math.atan2(M16[8], M16[10]));
          drawn++;
        }
      }
    }
    for (const K of this.kinds.values()) for (const L of K.lods) {
      const mesh = L.mesh, n = L.n;
      mesh.count = n; mesh.visible = n > 0;
      if (!n) continue;
      mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, n * 16); mesh.instanceMatrix.needsUpdate = true;
      for (const [name, , w] of K.attrs) { const a = mesh.geometry.attributes[name]; a.clearUpdateRanges(); a.addUpdateRange(0, n * w); a.needsUpdate = true; }
      const B = L.box;
      mesh.boundingSphere.center.set((B[0] + B[3]) / 2, (B[1] + B[4]) / 2, (B[2] + B[5]) / 2);
      mesh.boundingSphere.radius = Math.hypot(B[3] - B[0], B[4] - B[1], B[5] - B[2]) / 2;
    }
    prev?.end();
    // the night marker: over the awake bodies (their middle, a radius over them), else far away
    if (this.marker) {
      let n = 0, x = 0, z = 0, r = 0;
      for (let k = 0; k < W.act.length; k++) if (W.act[k]) { x += W.px[k]; z += W.pz[k]; n++; }
      if (n) { x /= n; z /= n; for (let k = 0; k < W.act.length; k++) if (W.act[k]) r = Math.max(r, Math.hypot(W.px[k] - x, W.pz[k] - z)); this.marker.position.set(x, 0, z); this.marker.userData.nightMover = Math.max(3, r + 3); }
      else this.marker.position.set(1e6, -1e4, 1e6);
      this.marker.updateMatrixWorld();
    }
    this.drawnLast = drawn;
    this.stats.drawn = drawn; this.stats.rebuilds++;
    this.stats.renderMs = this.stats.renderMs * 0.95 + (performance.now() - t0) * 0.05;
  },
  report() {
    const W = this.world;
    return { on: this.on, props: this.stats.props, byClass: { ...this.stats.byClass }, tiles: this.tiles.size, kinds: this.kinds.size, drawn: this.stats.drawn,
      renderMs: +this.stats.renderMs.toFixed(3), hooked: this.stats.hooked, world: W ? { ...W.stats } : null,
      draws: [...this.kinds.values()].reduce((s, K) => s + K.lods.filter((L) => L.mesh.visible).length, 0) };
  },
};
