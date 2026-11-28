// THE FEATHER PUFF of a catch (falcon fun round 3, docs/rules/falcon-catch-fun.md "round 3"): a burst of pale grey
// feathers where the talons hit the pigeon, drifting down and tumbling for ~1.6 s (the owner: "we don't see well the
// pigeon getting caught"). One instanced draw of N small curved feather cards, a FIXED POOL (no allocation at a catch
// or per frame): burst() wakes the oldest cards, update() writes their matrices (static usage, needsUpdate + one update
// range, never DynamicDrawUsage) and their motion vectors (instMotion.js InstancePrev, translation only); hidden
// (mesh.visible = false) when none flies. No light added. ?falconfun=old: not built (cityFlyer.js).
import * as THREE from "three/webgpu";
import { attribute } from "three/tsl";
import { InstancePrev } from "../instMotion.js";   // --- instmotion

export const PUFF = { N: 48, life: 1.6, speed: 5.5, drag: 2.2, fall: 1.1, size: 0.17 };

/** a feather card: a vane curved along its length, the shaft darker; metres, along +z, ~1 x 0.35 (scaled by size) */
function featherGeometry() {
  const P = [], C = [];
  const segs = 4, W = 0.18;
  const pt = (t, s) => [s * W * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.35 * t), 0.08 * Math.sin(t * Math.PI) - 0.05 * Math.abs(s), t - 0.5];
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    for (const s of [-1, 1]) {
      const a = pt(t0, 0), b = pt(t1, 0), c = pt(t1, s), d = pt(t0, s);
      const shaft = [0.72, 0.7, 0.68], vane = s < 0 ? [0.86, 0.87, 0.9] : [0.78, 0.8, 0.84];
      P.push(...a, ...b, ...c, ...a, ...c, ...d);
      C.push(...shaft, ...shaft, ...vane, ...shaft, ...vane, ...vane);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  g.computeVertexNormals();
  return g;
}

export class FeatherPuff {
  constructor(scene) {
    const N = PUFF.N;
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    m.colorNode = attribute("color", "vec3");
    this.mesh = new THREE.InstancedMesh(featherGeometry(), m, N);
    this.mesh.name = "falcon-feather-puff"; this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.visible = false;
    this.p = new Float32Array(N * 3); this.v = new Float32Array(N * 3); this.age = new Float32Array(N).fill(1e9);
    this.spin = new Float32Array(N * 3); this.ang = new Float32Array(N * 3); this.sz = new Float32Array(N); this.gen = new Float64Array(N);
    this.next = 0; this.alive = 0; this.bursts = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._t = new THREE.Vector3();
    const Z = this._m.makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) this.mesh.setMatrixAt(i, Z);
    this.prev = new InstancePrev(N, "featherPrev");                // --- instmotion: the feathers' motion vectors (TAAU)
    this.prev.register(this.mesh, N); this.prev.hook(m);
    scene.add(this.mesh);
  }
  /** n feathers out of (x, y, z), carried along (vx, vy, vz) x 0.35 (the pigeon's speed, mostly lost at the hit); s = the
   *  drawn size factor (the flight's readable 1.4 x) */
  burst(x, y, z, vx = 0, vy = 0, vz = 0, n = 22, s = 1.4) {
    const N = PUFF.N;
    for (let k = 0; k < Math.min(n, N); k++) {
      const i = this.next; this.next = (this.next + 1) % N;
      const o = i * 3;
      // a direction on the sphere, more sideways and up than down
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = PUFF.speed * (0.35 + 0.65 * Math.random());
      this.p[o] = x + (Math.random() - 0.5) * 0.3; this.p[o + 1] = y + (Math.random() - 0.5) * 0.3; this.p[o + 2] = z + (Math.random() - 0.5) * 0.3;
      this.v[o] = vx * 0.35 + r * Math.cos(a) * sp; this.v[o + 1] = vy * 0.35 + (Math.abs(u) * 0.8 + 0.2) * sp * 0.7; this.v[o + 2] = vz * 0.35 + r * Math.sin(a) * sp;
      for (let j = 0; j < 3; j++) { this.ang[o + j] = Math.random() * 6.28; this.spin[o + j] = (Math.random() - 0.5) * 14; }
      this.sz[i] = PUFF.size * s * (0.6 + 0.6 * Math.random());
      this.age[i] = 0; this.gen[i] = this.bursts * N + k + 1;      // (a new generation: no motion from its last place)
    }
    this.bursts++;
    this.mesh.visible = true;
  }
  /** per frame: dt the game's (slowed in the strike's slow motion), camPos for the motion vectors' origin */
  update(dt, camPos) {
    if (!this.mesh.visible) return;
    const N = PUFF.N, L = PUFF.life, M = this._m;
    const kd = Math.exp(-PUFF.drag * dt);
    let alive = 0;
    this.prev.begin(camPos);                                       // --- instmotion
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      if (this.age[i] >= L) {
        if (this.age[i] < 1e8) { this.age[i] = 1e9; this.mesh.setMatrixAt(i, M.makeScale(0, 0, 0)); }
        this.prev.put(this.mesh, i, i, this.gen[i], this.p[o], this.p[o + 1], this.p[o + 2], 0);
        continue;
      }
      alive++;
      this.age[i] += dt;
      // drag toward a slow flutter down (feathers reach their fall speed at once), a sideways sway
      this.v[o] *= kd; this.v[o + 2] *= kd;
      this.v[o + 1] = this.v[o + 1] * kd - PUFF.fall * (1 - kd);
      const sway = Math.sin(this.age[i] * 6 + i) * 0.6 * dt;
      this.p[o] += this.v[o] * dt + sway; this.p[o + 1] += this.v[o + 1] * dt; this.p[o + 2] += this.v[o + 2] * dt - sway;
      for (let j = 0; j < 3; j++) { this.ang[o + j] += this.spin[o + j] * dt; this.spin[o + j] *= Math.exp(-0.8 * dt); }
      // grow in fast, shrink away over the last 30 % of the life
      const t = this.age[i] / L, k = Math.min(1, t * 12) * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1), sc = this.sz[i] * k;
      this._q.setFromEuler(this._e.set(this.ang[o], this.ang[o + 1], this.ang[o + 2]));
      M.compose(this._t.set(this.p[o], this.p[o + 1], this.p[o + 2]), this._q, this._s.set(sc, sc, sc));
      this.mesh.setMatrixAt(i, M);
      this.prev.put(this.mesh, i, i, this.gen[i], this.p[o], this.p[o + 1], this.p[o + 2], 0);   // --- instmotion (translation only)
    }
    this.prev.end();
    const im = this.mesh.instanceMatrix;
    im.clearUpdateRanges(); im.addUpdateRange(0, N * 16); im.needsUpdate = true;
    this.alive = alive;
    if (!alive) this.mesh.visible = false;
  }
}
