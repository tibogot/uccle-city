// FLAGS ON POLES: live cloth near the camera, a recorded loop (vertex animation texture) everywhere else.
//   - LiveFlag: one FlagCloth (flagCloth.js) + a dynamic mesh; ~0.08 ms CPU per flag and frame, so only the few
//     nearest flags run it;
//   - BakedFlags: one draw for many flags of one pole set-up; the cloth is simulated ONCE at load (bakeLoop, ~50 ms
//     per loop, in a worker) into float textures (position + normal per vertex and frame); the vertex shader reads
//     two frames and blends them; per flag: place, yaw, loop phase, scale (0 = hidden); zero CPU per frame. Two loop
//     SLOTS: the loop of the current wind, and when the wind (speed, or direction for a fixed angled pole) changes,
//     the new loop is recorded into the other slot and cross-faded in over 1.5 s (mixing two unrelated loops for
//     good would average their folds away: a measured 35 % less motion);
//   - hand-over without popping: baked -> live copies the baked state (this frame and one sim step before) into the
//     cloth, so it carries on with the same motion; live -> baked blends the live vertices onto the baked pose over
//     0.6 s, then swaps.
// Vertical masts: the loop is baked with the wind along +x and each flag is turned to the wind (yaw). Fixed angled
// poles (a balcony's) are baked in world space with the real wind (cloth.windDir, yaw 0): re-recorded on a change.
import * as THREE from "three/webgpu";
import { Fn, attribute, uniform, texture, textureLoad, ivec2, int, float, vec3, vec4, mix, floor, fract, mod, cos, sin,
  normalLocal, time } from "three/tsl";
import { FlagCloth, bakeLoop } from "./flagCloth.js";


let worker = null, nextId = 0;
const pending = new Map();
/** run bakeLoop for several wind levels in a module worker (falls back to the main thread) */
export function bakeInWorker(job) {
  try {
    worker ??= new Worker(new URL("./bakeWorker.js", import.meta.url), { type: "module" });
    worker.onmessage ??= null;
    if (!worker._wired) { worker.onmessage = (e) => { pending.get(e.data.id)?.(e.data.bakes); pending.delete(e.data.id); }; worker._wired = true; }
  } catch { return Promise.resolve(job.levels.map((l) => bakeLoop(job.cloth, { speed: l.speed, seed: l.seed, frames: job.frames, fps: job.fps }))); }
  const id = nextId++;
  return new Promise((res) => { pending.set(id, res); worker.postMessage({ id, ...job }); });
}

/** the cloth material (double sided: a printed flag shows its mirror image from the back) */
export function clothMaterial(map) {
  const m = new THREE.MeshStandardNodeMaterial({ map, side: THREE.DoubleSide, roughness: 0.82, metalness: 0 });
  m.name = "flag_cloth";
  return m;
}

/** turn a vector by `yaw` about +y */
function yawVec(out, x, y, z, c, s) { out[0] = c * x + s * z; out[1] = y; out[2] = -s * x + c * z; return out; }

export class BakedFlags {
  /**
   * @param {object} o
   * @param {object} o.cloth   FlagCloth options (width, height, nx, ny, axis, fabric)
   * @param {THREE.Texture} o.map
   * @param {number} o.capacity  max flags
   * @param {number} [o.speed=5] the wind now (m/s); o.cloth.windDir = the wind for a fixed angled pole (world)
   */
  /** bake in a worker (no long task on the main thread), then build; `speed` = the wind now */
  static async create(o) {
    const speed = o.speed ?? 5, frames = o.frames ?? 72, fps = o.fps ?? 24, t0 = performance.now();
    const [b] = await bakeInWorker({ cloth: o.cloth, levels: [{ speed, seed: 1.3 }], frames, fps });
    const f = new BakedFlags({ ...o, bakes: [b, b], levels: [speed, speed] });
    f.bakeMs = performance.now() - t0;
    return f;
  }

  constructor({ cloth, map, capacity = 64, levels = [5, 5], frames = 72, fps = 24, bakes = null }) {
    this.clothOpts = cloth; this.levels = levels.slice(0, 2);
    this.slot = 0; this.fade = null; this.busy = false; this.target = null;
    this.slotOpts = [cloth, cloth];
    const t0 = performance.now();
    this.bakes = bakes ?? this.levels.map((speed) => bakeLoop(cloth, { speed, frames, fps, seed: 1.3 }));
    this.bakeMs = performance.now() - t0;
    const grid = new FlagCloth(cloth);                 // the grid's uv and index (cheap)
    const b0 = this.bakes[0], n = b0.count, F = b0.frames, L = 2;
    this.frames = F; this.fps = b0.fps; this.count = n;
    // textures: x = vertex, y = level * F + frame
    const P = new Float32Array(n * F * L * 4), N = new Float32Array(n * F * L * 4);
    this.bakes.forEach((b, l) => {
      for (let f = 0; f < F; f++) for (let v = 0; v < n; v++) {
        const src = (f * n + v) * 3, dst = ((l * F + f) * n + v) * 4;
        P[dst] = b.pos[src]; P[dst + 1] = b.pos[src + 1]; P[dst + 2] = b.pos[src + 2]; P[dst + 3] = 1;
        N[dst] = b.nrm[src]; N[dst + 1] = b.nrm[src + 1]; N[dst + 2] = b.nrm[src + 2]; N[dst + 3] = 0;
      }
    });
    const tex = (a) => { const t = new THREE.DataTexture(a, n, F * L, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true; return t; };
    this.posTex = tex(P); this.nrmTex = tex(N);
    // geometry: the cloth grid, instanced
    const g = new THREE.InstancedBufferGeometry();
    const idx = new Float32Array(n); for (let v = 0; v < n; v++) idx[v] = v;
    const rest = new Float32Array(n * 3); for (let v = 0; v < n * 3; v++) rest[v] = b0.pos[v];
    g.setAttribute("position", new THREE.BufferAttribute(rest, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(b0.nrm.subarray(0, n * 3)), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(grid.uv, 2));
    g.setAttribute("aIdx", new THREE.BufferAttribute(idx, 1));
    g.setIndex(new THREE.BufferAttribute(grid.index, 1));
    this.pose = new Float32Array(capacity * 4);       // x, y, z, yaw
    this.extra = new Float32Array(capacity * 4);      // phase (0..1), scale, -, -
    this.poseAttr = new THREE.InstancedBufferAttribute(this.pose, 4); this.poseAttr.setUsage(THREE.DynamicDrawUsage);
    this.extraAttr = new THREE.InstancedBufferAttribute(this.extra, 4); this.extraAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aPose", this.poseAttr); g.setAttribute("aExtra", this.extraAttr);
    g.instanceCount = 0;
    this.geometry = g; this.capacity = capacity;
    // the wind level: two levels mixed (lo, hi, w)
    this.uLevel = uniform(new THREE.Vector3(0, 0, 0));
    this.uTime = uniform(0);
    const mat = clothMaterial(map);
    const posT = texture(this.posTex), nrmT = texture(this.nrmTex), Fc = float(F), fpsU = float(this.fps);
    const self = this;
    mat.positionNode = Fn(() => {
      const v = int(attribute("aIdx", "float"));
      const pose = attribute("aPose", "vec4"), ex = attribute("aExtra", "vec4");
      const tf = fract(self.uTime.mul(fpsU).div(Fc).add(ex.x)).mul(Fc).toVar();
      const f0 = floor(tf), w = tf.sub(f0), f1 = mod(f0.add(1), Fc);
      const sample = (tex, lvl) => {
        const r0 = int(lvl.mul(Fc).add(f0)), r1 = int(lvl.mul(Fc).add(f1));
        return mix(textureLoad(tex, ivec2(v, r0)).xyz, textureLoad(tex, ivec2(v, r1)).xyz, w);
      };
      const lv = self.uLevel;
      const p = mix(sample(posT, lv.x), sample(posT, lv.y), lv.z).mul(ex.y).toVar();
      const nn = mix(sample(nrmT, lv.x), sample(nrmT, lv.y), lv.z).normalize().toVar();
      const c = cos(pose.w), s = sin(pose.w);
      const turn = (q) => vec3(c.mul(q.x).add(s.mul(q.z)), q.y, s.negate().mul(q.x).add(c.mul(q.z)));
      normalLocal.assign(turn(nn));
      return turn(p).add(pose.xyz);
    })();
    this.material = mat;
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.name = "flags_baked";
  }

  /** ask for the loop of a new wind (speed) and / or new cloth options (an angled pole after the wind turned):
   *  recorded in the worker into the idle slot, then cross-faded in (setWind / update drive it) */
  retarget(speed, cloth = this.slotOpts[this.slot]) {
    const cur = this.levels[this.slot], same = cloth === this.slotOpts[this.slot];
    if (same && Math.abs(speed - cur) < 0.75 && !this.target) return;
    this.target = { speed, cloth };
    this._pump();
  }
  async _pump() {
    if (this.busy || this.fade || !this.target) return;
    const { speed, cloth } = this.target; this.target = null;
    this.busy = true;
    const t0 = performance.now(), idle = 1 - this.slot;
    const [b] = await bakeInWorker({ cloth, levels: [{ speed, seed: 1.3 }], frames: this.frames, fps: this.fps });  // cloth.windDir rides along
    const n = this.count, F = this.frames, P = this.posTex.image.data, N = this.nrmTex.image.data;
    for (let f = 0; f < F; f++) for (let v = 0; v < n; v++) {
      const src = (f * n + v) * 3, dst = ((idle * F + f) * n + v) * 4;
      P[dst] = b.pos[src]; P[dst + 1] = b.pos[src + 1]; P[dst + 2] = b.pos[src + 2];
      N[dst] = b.nrm[src]; N[dst + 1] = b.nrm[src + 1]; N[dst + 2] = b.nrm[src + 2];
    }
    this.bakes[idle] = b; this.levels[idle] = speed; this.slotOpts[idle] = cloth;
    this.posTex.needsUpdate = true; this.nrmTex.needsUpdate = true;
    this.bakeMs = performance.now() - t0;
    this.busy = false;
    this.fade = { to: idle, t: 0, dur: 1.5 };
  }

  /** add a flag at the top of its hoist (world), returns its index */
  add(x, y, z, { yaw = 0, phase = Math.random(), scale = 1 } = {}) {
    const i = this.geometry.instanceCount++;
    this.pose.set([x, y, z, yaw], i * 4); this.extra.set([phase, scale, 0, 0], i * 4);
    this.poseAttr.needsUpdate = true; this.extraAttr.needsUpdate = true;
    return i;
  }
  setYaw(i, yaw) { this.pose[i * 4 + 3] = yaw; this.poseAttr.needsUpdate = true; }
  setVisible(i, on) { this.extra[i * 4 + 1] = on ? 1 : 0; this.extraAttr.needsUpdate = true; }

  /** the wind speed: re-record when it moved by more than 0.75 m/s from the loop on screen */
  setWind(speed) { this.retarget(speed); }
  /** t = the loop clock (s); dt = real time step (drives the cross-fade between the two slots) */
  update(t, dt = 0) {
    this.uTime.value = t;
    if (this.fade) {
      const f = this.fade; f.t += dt;
      const w = Math.min(1, f.t / f.dur), s = w * w * (3 - 2 * w);
      this.uLevel.value.set(1 - f.to, f.to, s);               // from the old slot to the new one
      if (w >= 1) { this.slot = f.to; this.fade = null; this.uLevel.value.set(this.slot, this.slot, 0); this.clothOpts = this.slotOpts[this.slot]; this._pump(); }
    } else this.uLevel.value.set(this.slot, this.slot, 0);
  }

  /** the baked state of flag i at time t (sim frame, before yaw / translation), interpolated like the shader:
   *  { pos, prev } of the nearest recorded frame of the dominant level (for a hand-over to a live cloth) */
  stateAt(i, t) {
    const F = this.frames, ph = this.extra[i * 4], sz = this.count * 3;
    const tf = (((((t * this.fps) / F + ph) % 1) + 1) % 1) * F, f0 = Math.floor(tf) % F, f1 = (f0 + 1) % F, w = tf - Math.floor(tf);
    const lv = this.uLevel.value, A = this.bakes[lv.x | 0], B = this.bakes[lv.y | 0];
    this._sp ??= new Float64Array(sz); this._sq ??= new Float64Array(sz);
    const mixF = (out, key) => {
      const a = A[key], b = B[key];
      for (let k = 0; k < sz; k++) {
        const pa = a[f0 * sz + k] + (a[f1 * sz + k] - a[f0 * sz + k]) * w, pb = b[f0 * sz + k] + (b[f1 * sz + k] - b[f0 * sz + k]) * w;
        out[k] = pa + (pb - pa) * lv.z;
      }
      return out;
    };
    return { pos: mixF(this._sp, "pos"), prev: mixF(this._sq, "prevOfFirst") };
  }
}

export class LiveFlag {
  constructor({ cloth, map }) {
    this.cloth = new FlagCloth(cloth);
    const c = this.cloth, n = c.count;
    const g = new THREE.BufferGeometry();
    this.posArr = new Float32Array(n * 3); this.nrmArr = new Float32Array(n * 3); this._n64 = new Float64Array(n * 3);
    g.setAttribute("position", new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nrmArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(c.uv, 2));
    g.setIndex(new THREE.BufferAttribute(c.index, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(c.width, c.height) * 1.2);
    this.mesh = new THREE.Mesh(g, clothMaterial(map));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.name = "flag_live";
    this.blend = null;           // { target: Float32Array, t, dur } while handing back to the baked loop
    this.simMs = 0;
    this.sync();
  }
  /** start from a baked state (sim frame), turned by yaw */
  startFrom(state, yaw) {
    const c = this.cloth, cy = Math.cos(yaw), sy = Math.sin(yaw), v = [0, 0, 0];
    for (let k = 0; k < c.count * 3; k += 3) {
      yawVec(v, state.pos[k], state.pos[k + 1], state.pos[k + 2], cy, sy); c.pos[k] = v[0]; c.pos[k + 1] = v[1]; c.pos[k + 2] = v[2];
      yawVec(v, state.prev[k], state.prev[k + 1], state.prev[k + 2], cy, sy); c.prev[k] = v[0]; c.prev[k + 1] = v[1]; c.prev[k + 2] = v[2];
    }
    c._acc = 0; this.blend = null; this.sync();
  }
  setWind(speed, dir) { Object.assign(this.cloth.wind, { speed, dir }); }
  update(dt) {
    const t0 = performance.now();
    this.cloth.update(dt);
    this.sync();
    if (this.blend) {                         // hand-back: ease the vertices onto the (moving) baked pose
      const b = this.blend; b.t += dt;
      const w = Math.min(1, b.t / b.dur), s = w * w * (3 - 2 * w), P = this.posArr, st = b.get();
      const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), v = [0, 0, 0];
      for (let k = 0; k < P.length; k += 3) {
        yawVec(v, st.pos[k], st.pos[k + 1], st.pos[k + 2], cy, sy);
        P[k] += (v[0] - P[k]) * s; P[k + 1] += (v[1] - P[k + 1]) * s; P[k + 2] += (v[2] - P[k + 2]) * s;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate = true;
    this.simMs = performance.now() - t0;
    return !this.blend || this.blend.t < this.blend.dur;
  }
  sync() {
    const c = this.cloth;
    for (let k = 0; k < this.posArr.length; k++) this.posArr[k] = c.pos[k];
    c.normals(this._n64); for (let k = 0; k < this.nrmArr.length; k++) this.nrmArr[k] = this._n64[k];
  }
  /** begin easing onto the baked pose: `get()` returns its current state (sim frame), turned by yaw; call
   *  update() until it returns false, then show the baked flag and drop this one */
  handBack(get, yaw, dur = 0.6) { this.blend = { get, yaw, t: 0, dur }; }
}

/** the wall nearest to a hoist top: 16 horizontal rays against `object` (e.g. a building model), the nearest hit on
 *  a face that faces the ray; returns [[nx, ny, nz, d]] in the sim frame (relative to `top`) keeping the cloth
 *  `gap` m in front of it, or [] */
const _ray = new THREE.Raycaster();
export function wallPlanesFrom(object, top, { reach = 6, gap = 0.04 } = {}) {
  if (!object) return [];
  let best = null;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    _ray.set(top, dir); _ray.far = reach;
    for (const hit of _ray.intersectObject(object, true)) {
      if (!hit.face) continue;
      const nrm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (nrm.dot(dir) > -0.5) continue;
      if (!best || hit.distance < best.distance) best = { distance: hit.distance, point: hit.point.clone(), nrm };
      break;
    }
  }
  if (!best) return [];
  const n = best.nrm.setY(0).normalize();
  return [[n.x, n.y, n.z, n.dot(best.point.clone().sub(top)) + gap]];
}
