// THE TRAFFIC LIGHTS IN THE CITY (claude/tlights, docs/TLIGHTS.md): the Blender signal posts (viewer/tlights/tlightKit.js)
// at the signal sites of viewer/streets/signalPlace.js (unchanged: one post per OSM approach on its right kerb, the heads
// facing the coming cars). On by default; ?tlights=old = the procedural posts of viewer/furniture.js as before.
//   - drawing: ONE pool per piece for the whole city (LOD0-2), streamed by viewer/instanceStream.js like the furniture kit
//   - seat: viewer/tlights/tlightPlace.js (the drawn pavement: ground + the measured raise; foot 0.30 m into it)
//   - collisions: per tile an InstancedMesh "furniture-signal" (the name the car / walker code reads as a post), LOD2's
//     triangles at the posts' matrices, never drawn
//   - the lit aspects: viewer/furniture.js updateSignals (SIGNAL_STATE / WALK_STATE uniforms), no light added
import * as THREE from "three/webgpu";
import { loadTLightKit, TLightPool, tlightSource, tlightFades } from "./tlightKit.js";
import { tlightInstances, TL_PIECES, TL_STRIDE } from "./tlightPlace.js";
import { Streamer, MARGIN } from "../instanceStream.js";

const qs = new URLSearchParams(location.search);

export const cityTLights = {
  on: qs.get("tlights") !== "old",
  kit: null, pools: [], tiles: new Map(), group: null, streamer: null,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadTLightKit(); } catch (e) { log(`traffic lights: kit failed (${e.message}), the old posts`); this.on = false; return null; }
    this.group = new THREE.Group(); this.group.name = "tlights";
    scene.add(this.group);
    for (const p of TL_PIECES) this.pools.push(new TLightPool(this.kit.pieces[p], this.kit.mats, this.group, MARGIN));
    this.streamer = new Streamer({ name: "tlights", pools: this.pools.map((p) => p.stream), fades: tlightFades, budget: 0.1 });
    updaters.push((eye, cam) => this.update(cam));
    window.__tlights = this;
    log(`traffic lights: on (?tlights=old for the old posts), kit ${TL_PIECES.map((p) => `${p} ${this.kit.pieces[p].tris.join("/")}`).join(", ")} tris, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  /** true when the kit draws the posts (furniture.js then leaves its own out) */
  get drawing() { return this.on && !!this.kit; },
  /** a tile: its posts join the pools; their collision stand-ins go into `parent` (the tile's features group) */
  addTile(name, sites, ground, lift, bounds, parent) {
    if (!this.drawing) return null;
    const inst = tlightInstances(sites, ground, lift, bounds);
    const g = new THREE.Group(); g.name = `tlights-${name}`;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const counts = {};
    for (const k of TL_PIECES) {
      const a = inst[k]; counts[k] = a ? a.length / TL_STRIDE : 0;
      if (!a) continue;
      const m = new THREE.InstancedMesh(this.kit.pieces[k].standin, this.kit.mats.standin, a.length / TL_STRIDE);
      for (let i = 0; i < a.length / TL_STRIDE; i++) { const o = i * TL_STRIDE; q.setFromAxisAngle(up, a[o + 3]); M.compose(v.set(a[o], a[o + 1], a[o + 2]), q, one); m.setMatrixAt(i, M); }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = "furniture-signal";
      m.visible = false;                         // never drawn: the pools draw; the collision code reads it
      m.castShadow = m.receiveShadow = false;
      m.userData.collisionStandin = true;
      g.add(m);
    }
    parent.add(g);
    this.tiles.set(name, { name, inst, group: g, counts });
    this.streamer.addTile(name, g, (slot) => Object.fromEntries(TL_PIECES.filter((k) => inst[k]).map((k) => [k, tlightSource(this.kit.pieces[k], inst[k], slot)])));
    return counts;
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    for (const m of t.group.children) m.dispose?.();
    this.tiles.delete(name);
    this.streamer.removeTile(name);
  },
  update(camera) {
    if (!this.drawing) return;
    this.streamer.update(camera);
  },
  report() {
    const n = Object.fromEntries(TL_PIECES.map((p) => [p, 0]));
    for (const t of this.tiles.values()) for (const k of TL_PIECES) n[k] += t.counts[k] || 0;
    return { tiles: this.tiles.size, instances: n, drawn: this.pools.reduce((s, p) => s + p.drawn, 0), stream: { ...this.streamer.stats } };
  },
};
