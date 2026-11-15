// PER-INSTANCE MOTION VECTORS for the instanced movers (the traffic fleet, the two-wheelers, the trams, the trains):
// docs/UPSCALE.md "Moving objects". The TAAU resolve (viewer/upscale.js) reprojects the history with the camera's motion
// and each object's rigid motion; an instanced fleet re-writes its instance matrices every frame, so without this its
// movers kept only the camera's motion and their trailing edges speckled / ghosted.
//
// One STORAGE buffer of vec4 per drawn instance (no vertex buffer: the fleets' geometries are near WebGPU's 8 vertex
// buffers, past which three makes object-specific builds), read in the vertex stage at (the mesh's base + instanceIndex):
//   xyz = c, w = dyaw, with  last frame's position = rotY(p - O, dyaw) + c + O
// for a vertex at p this frame (positionLocal, the instance transform applied), O a per-frame origin near the camera
// (precision: p - O is small where it matters). That is R_prev R_cur^-1 about the instance's origin + its translation,
// exact for movers whose pitch / lean did not change between the two frames (yaw-only delta: cars, bikes, trams,
// trains; the pitch change in one frame is far under a pixel). The CPU keeps each mover's last pose by a key (the
// sim's index + generation, a trip object + piece index) and writes c / dyaw where it writes the instance matrix:
// 16 bytes per drawn instance per frame, uploaded once as update ranges (static usage + needsUpdate, never
// DynamicDrawUsage). A mover not drawn last frame (just spawned, entering the view) writes 0: no motion.
//
// ?instmotion=0: off (no buffer, no shader change).
import * as THREE from "three/webgpu";
import { storage, uniform, instanceIndex, positionLocal, vec3, cos, sin, int, select } from "three/tsl";
import { INST_MOTION, setMotionDelta, uInstMotion } from "./upscale.js";

/** per-object base of the mesh's rows in its InstancePrev buffer (-1: not registered = no motion) */
const uBase = uniform(-1, "int").onObjectUpdate(({ object }) => object.userData.ipBase ?? -1);
const rotY = (v, c, s) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];

export const instMotionStats = { bytes: 0, frames: 0, sets: [] };

export class InstancePrev {
  /** cap: rows in the buffer (the sum of the registered meshes' capacities, or the per-frame maximum) */
  constructor(cap, name = "instPrev") {
    this.on = INST_MOTION;
    this.cap = cap; this.name = name;
    this.frame = 0; this.used = 0; this.fixedUsed = 0; this.bytes = 0;
    this.touched = [];                                   // meshes written this frame (one update range each)
    this.uOrigin = uniform(new THREE.Vector3());
    this.O = [0, 0, 0];
    // per key: cur (x, y, z, yaw) at index 4k, prev the same, frame stamp, generation, prev valid
    this.kcap = 0; this.cur = null; this.prv = null; this.kf = null; this.kg = null; this.kv = null;
    this.ids = new WeakMap(); this.nextId = 0;
    if (!this.on) return;
    this.arr = new Float32Array(cap * 4);
    this.attr = new THREE.StorageInstancedBufferAttribute(this.arr, 4);
    this.buf = storage(this.attr, "vec4", cap).toReadOnly().setName(name);
    this.growKeys(256);
    instMotionStats.sets.push(this);
  }
  growKeys(n) {
    const k = Math.max(n, this.kcap * 2);
    const grow = (a, T, w) => { const b = new T(k * w); if (a) b.set(a); return b; };
    this.cur = grow(this.cur, Float64Array, 4); this.prv = grow(this.prv, Float64Array, 4);
    this.kf = grow(this.kf, Int32Array, 1); this.kg = grow(this.kg, Float64Array, 1); this.kv = grow(this.kv, Uint8Array, 1);
    this.kcap = k;
  }
  /** a stable small integer for an object key (a trip) */
  id(obj) { let i = this.ids.get(obj); if (i === undefined) { i = this.nextId++; this.ids.set(obj, i); } return i; }

  /** the material's motion: last frame's vertex - this frame's, from this buffer (setMotionDelta, viewer/upscale.js) */
  hook(material) {
    if (!this.on) return material;
    const P = this.buf.element(uBase.add(int(instanceIndex))).toVar();
    const q = positionLocal.sub(this.uOrigin).toVar();
    const c = cos(P.w), s = sin(P.w);
    const r = vec3(q.x.mul(c).add(q.z.mul(s)), q.y, q.z.mul(c).sub(q.x.mul(s)));
    return setMotionDelta(material, select(uBase.lessThan(0), vec3(0), r.sub(q).add(P.xyz)));
  }

  /** once per frame before any put: origin near the camera (snapped, the same f32 on the CPU and the GPU) */
  begin(camPos) {
    if (!this.on) return;
    this.frame++; this.used = this.fixedUsed; this.touched.length = 0;
    const f = Math.fround;
    this.O[0] = f(Math.round(camPos.x)); this.O[1] = f(Math.round(camPos.y)); this.O[2] = f(Math.round(camPos.z));
    this.uOrigin.value.set(this.O[0], this.O[1], this.O[2]);
  }
  /** a fixed region for a mesh (its whole instance capacity) */
  register(mesh, n) {
    if (!this.on) return;
    if (this.fixedUsed + n > this.cap) { console.warn(`[instMotion] ${this.name}: no room for ${mesh.name}`); return; }
    mesh.userData.ipBase = this.fixedUsed; mesh.userData.ipCap = n; this.fixedUsed += n; this.used = this.fixedUsed;
  }
  /** per-frame layout (the fleet: counts known before filling): base for a mesh drawing n instances this frame */
  alloc(mesh, n) {
    if (!this.on) return;
    if (this.used + n > this.cap) { mesh.userData.ipBase = -1; return; }
    mesh.userData.ipBase = this.used; mesh.userData.ipCap = n; this.used += n;
  }
  /**
   * Instance `n` of `mesh` shows mover `key` (an integer; gen: its generation, a re-spawn = no motion) at position
   * (x, y, z) heading yaw (rotation about +y, three's convention) this frame.
   */
  put(mesh, n, key, gen, x, y, z, yaw) {
    if (!this.on) return;
    const base = mesh.userData.ipBase;
    if (base === undefined || base < 0 || n >= mesh.userData.ipCap) return;
    if (key >= this.kcap) this.growKeys(key + 1);
    const C = this.cur, Pv = this.prv, k4 = key * 4;
    if (this.kf[key] !== this.frame) {
      // first sighting this frame: last frame's pose becomes prev (only if it was drawn last frame, same generation)
      const ok = this.kf[key] === this.frame - 1 && this.kg[key] === gen;
      if (ok) { Pv[k4] = C[k4]; Pv[k4 + 1] = C[k4 + 1]; Pv[k4 + 2] = C[k4 + 2]; Pv[k4 + 3] = C[k4 + 3]; }
      this.kv[key] = ok ? 1 : 0;
      C[k4] = x; C[k4 + 1] = y; C[k4 + 2] = z; C[k4 + 3] = yaw;
      this.kf[key] = this.frame; this.kg[key] = gen;
    }
    const o = (base + n) * 4, A = this.arr, O = this.O;
    if (!this.kv[key]) { A[o] = 0; A[o + 1] = 0; A[o + 2] = 0; A[o + 3] = 0; }
    else {
      let dy = Pv[k4 + 3] - C[k4 + 3];
      if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
      // c = (t_prev - O) - rotY(t_cur - O, dyaw)
      const r = rotY([C[k4] - O[0], C[k4 + 1] - O[1], C[k4 + 2] - O[2]], Math.cos(dy), Math.sin(dy));
      A[o] = Pv[k4] - O[0] - r[0]; A[o + 1] = Pv[k4 + 1] - O[1] - r[1]; A[o + 2] = Pv[k4 + 2] - O[2] - r[2]; A[o + 3] = dy;
    }
    const u = mesh.userData;
    if (u.ipF !== this.frame) { u.ipF = this.frame; u.ipHi = n; this.touched.push(mesh); }
    else if (n > u.ipHi) u.ipHi = n;
  }
  /** a pose from a column-major matrix (yaw from its forward column, atan2(m8, m10)) */
  putMatrix(mesh, n, key, gen, e, eo = 0) {
    this.put(mesh, n, key, gen, e[eo + 12], e[eo + 13], e[eo + 14], Math.atan2(e[eo + 8], e[eo + 10]));
  }
  /** once per frame after the puts: an update range per mesh written (adjacent ones merged) */
  end() {
    this.bytes = 0;
    if (!this.on || !this.touched.length) return;
    const a = this.attr, T = this.touched;
    T.sort((p, q) => p.userData.ipBase - q.userData.ipBase);
    a.clearUpdateRanges();
    let s0 = -1, s1 = -1;
    for (const m of T) {
      const b = m.userData.ipBase, e = b + m.userData.ipHi + 1;
      if (s0 >= 0 && b <= s1) { s1 = Math.max(s1, e); continue; }
      if (s0 >= 0) { a.addUpdateRange(s0 * 4, (s1 - s0) * 4); this.bytes += (s1 - s0) * 16; }
      s0 = b; s1 = e;
    }
    a.addUpdateRange(s0 * 4, (s1 - s0) * 4); this.bytes += (s1 - s0) * 16;
    a.needsUpdate = true;
  }
}

/** the bytes uploaded last frame by all the sets (debug: window.instMotion.bytes()) */
export function instMotionBytes() { return instMotionStats.sets.reduce((s, p) => s + p.bytes, 0); }
if (typeof window !== "undefined") window.instMotion = { on: INST_MOTION, bytes: instMotionBytes, sets: instMotionStats.sets, set: (on) => { uInstMotion.value = on ? 1 : 0; } };
