// THERMAL HINTS (Falcon Flight Lab): what a falcon (and a glider pilot) reads a thermal from, kept subtle:
//   gulls circling   black-headed gulls (Brussels' commonest soarers) wheeling in the active columns, climbing with
//                    them (the pigeon mesh and its vertex-shader wings, white, a slow V glide, the odd flap)
//   dust and leaves  small flakes spiralling up the core of the column nearest the falcon, near the ground
// Both drawn as one instanced draw each; positions from air.js thermalCentre (the columns lean downwind).
import * as THREE from "three/webgpu";
import { pigeonGeometry, pigeonMaterial } from "./pigeons.js";

const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class ThermalHints {
  constructor(air, { perThermal = 3, dust = 220, scale = 1.4 } = {}) {
    this.air = air; this.scale = scale;
    const T = air.thermals.length, n = T * perThermal;
    this.n = n; this.per = perThermal;
    const base = pigeonGeometry();
    const g = new THREE.InstancedBufferGeometry();
    for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
    g.instanceCount = n;
    const mk = (s) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * s), s); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = mk(4); this.aDir = mk(4); this.aAnim = mk(4);
    const tint = new Float32Array(n * 3); for (let i = 0; i < n; i++) tint.set(i % 4 === 3 ? [0.55, 0.55, 0.58] : [2.0, 2.0, 2.0], i * 3);   // gulls white, the odd crow-grey
    g.setAttribute("iPos", this.aPos); g.setAttribute("iDir", this.aDir); g.setAttribute("iAnim", this.aAnim);
    g.setAttribute("iTint", new THREE.InstancedBufferAttribute(tint, 3));
    this.birds = new THREE.Mesh(g, pigeonMaterial()); this.birds.frustumCulled = false; this.birds.name = "thermal-gulls";
    this.state = Array.from({ length: n }, (_, i) => ({ a: Math.random() * 6.28, h: 40 + Math.random() * 140, dir: i % 2 ? 1 : -1, r: 0.45 + Math.random() * 0.35, flapT: Math.random() * 8, ph: Math.random() * 6 }));
    // dust / leaves
    this.dustN = dust;
    const leaf = new THREE.PlaneGeometry(0.07, 0.05);
    const lm = new THREE.MeshStandardNodeMaterial({ color: 0x8a7550, roughness: 0.9, side: THREE.DoubleSide });
    this.dust = new THREE.InstancedMesh(leaf, lm, dust); this.dust.frustumCulled = false; this.dust.name = "thermal-dust";
    this.dustS = Array.from({ length: dust }, () => ({ a: Math.random() * 6.28, h: Math.random() * 60, r: Math.random(), spin: Math.random() * 6, rate: 0.6 + Math.random() }));
    this.group = new THREE.Group(); this.group.add(this.birds, this.dust);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this.cpuMs = 0;
  }

  update(dt, t, falconPos) {
    const t0 = performance.now(), air = this.air, A = this.aPos.array, D = this.aDir.array, M = this.aAnim.array;
    const C = { x: 0, z: 0, R: 0 };
    for (let i = 0; i < this.n; i++) {
      const th = air.thermals[(i / this.per) | 0], s = this.state[i], q = i * 4;
      const on = th.w > 0.6;
      if (!on) { A[q + 3] = 0; continue; }
      s.h += dt * Math.max(0.4, th.w * 0.7);
      if (s.h > th.top * 0.7) s.h = 40 + Math.random() * 40;
      air.thermalCentre(th, th.ground + s.h, C);
      const R = C.R * s.r, w = s.dir * 10 / Math.max(R, 6);           // ~10 m/s round the circle
      s.a += w * dt;
      A[q] = C.x + Math.cos(s.a) * R; A[q + 1] = th.ground + s.h; A[q + 2] = C.z + Math.sin(s.a) * R; A[q + 3] = this.scale * 1.45 * smooth(th.w, 0.6, 1.2);
      // tangent; bank in
      const tx = -Math.sin(s.a) * s.dir, tz = Math.cos(s.a) * s.dir;
      D[q] = tx; D[q + 1] = 0.02; D[q + 2] = tz; D[q + 3] = -0.45 * s.dir;
      s.flapT -= dt; if (s.flapT < -1.2) s.flapT = 5 + Math.random() * 8;
      const flapping = s.flapT < 0;
      s.ph += dt * (flapping ? 26 : 2);
      M[q] = s.ph % 62.83; M[q + 1] = flapping ? 0.6 : 0.04; M[q + 2] = 0; M[q + 3] = flapping ? 0 : 0.12;
    }
    this.aPos.needsUpdate = this.aDir.needsUpdate = this.aAnim.needsUpdate = true;
    // dust: the active column nearest the falcon, within 350 m, the first 60 m above its ground
    let best = null, bd = 350;
    for (const th of air.thermals) {
      if (th.w < 0.8) continue;
      const d = Math.hypot(th.x - falconPos.x, th.z - falconPos.z);
      if (d < bd) { bd = d; best = th; }
    }
    this.dust.visible = !!best;
    if (best) {
      for (let i = 0; i < this.dustN; i++) {
        const s = this.dustS[i];
        s.h += dt * best.w * 0.8 * s.rate; s.a += dt * (0.8 + 0.6 * s.rate); s.spin += dt * 5 * s.rate;
        if (s.h > 60) { s.h = 0; s.r = Math.random(); }
        air.thermalCentre(best, best.ground + s.h, C);
        const r = C.R * 0.5 * Math.sqrt(s.r) * (0.4 + s.h / 60);
        this._p.set(C.x + Math.cos(s.a) * r, best.ground + 0.3 + s.h, C.z + Math.sin(s.a) * r);
        this._q.setFromEuler(this._e.set(s.spin, s.spin * 0.7, s.spin * 0.3));
        const k = this.scale * smooth(s.h, 0, 4) * (1 - smooth(s.h, 45, 60)) * smooth(best.w, 0.8, 1.6);
        this._s.setScalar(Math.max(k, 1e-4));
        this.dust.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
      }
      this.dust.instanceMatrix.needsUpdate = true;
    }
    this.cpuMs = this.cpuMs * 0.95 + (performance.now() - t0) * 0.05;
  }
}
