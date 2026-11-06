// THE MOVING TRAFFIC'S FLEET: the faceted family drawn exactly like the parked cars (viewer/carFleet.js: the same LOD
// geometries, shared with the parked fleet, instanced per type per LOD, the same dithered LOD cross-fades, the shadow
// fading with the car, the 380-420 m far fade, LOD3 casting no shadow), with its own four materials that also
//   - roll the wheels and steer the front ones (vertex shader, per-instance spin / steer, per-vertex wheel centre)
//   - light brake lamps, indicators (blinking, the outer half of the lamp clusters), reversing lamps, headlights and
//     tail lamps at night (per-instance light bits + the city's night uniform: no scene lights)
// Rebuilt every frame (the cars move) WITHOUT allocation: preallocated job arrays, matrices written straight into the
// instance buffers from the sim's interpolated poses.
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import { carFleet, TYPE_MIX, FADE_FROM, FADE_TO, BANDS } from "../carFleet.js";
import { packMaterial } from "../drive/carPacks.js";

export const TYPE_NAMES = TYPE_MIX.map(([t]) => t);
export const trafficTime = uniform(0);

export class TrafficFleet {
  /** night: the city's night uniform (lighting.js env.uNight) or the lab's own */
  constructor({ night, source = carFleet, maxCars = 1024 } = {}) {
    this.night = night || uniform(0);
    this.source = source;
    this.group = new THREE.Group(); this.group.name = "traffic-fleet";
    this.ready = false; this.failed = null;
    this.stats = { drawn: 0, perLod: [0, 0, 0, 0], fading: 0, culled: 0, far: 0, draws: 0, tris: 0, pops: 0, ms: 0 };
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sphere = new THREE.Sphere(new THREE.Vector3(), 3.2);
    const J = maxCars * 2;
    this.jb = new Int32Array(J); this.jc = new Int32Array(J); this.jf = new Float32Array(J);
    this.shown = new Int8Array(maxCars).fill(-1); this.seenF = new Int32Array(maxCars); this.frameNo = 0;
    this.lastPos = new THREE.Vector3(); this.hasLast = false;
    this.all = [];
  }
  /** Wait for the parked fleet's geometries, build the batches + materials, compile them off the frame. */
  async load(renderer, scene, camera) {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    try {
      const S = this.source;
      if (!S.loading) S.load();
      while (!S.ready && !S.failed) await frame();
      if (S.failed) throw S.failed;
      this.lodDist = S.lodDist;
      const motion = { night: this.night, time: trafficTime };
      const near = packMaterial({ paint: "instance", rich: true, motion });
      const far = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false, motion });
      const nearFade = packMaterial({ paint: "instance", rich: true, crossFade: true, motion });
      const farFade = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false, crossFade: true, motion });
      this.types = [];
      for (const name of TYPE_NAMES) {
        await frame();
        const src = S.types[name];
        const lods = src.lods.map((l, k) => {
          const g = new THREE.BufferGeometry();
          for (const [n, a] of Object.entries(l.geo.attributes)) g.setAttribute(n, a);
          g.setAttribute("wheel", new THREE.BufferAttribute(l.W, 4));
          g.setIndex(l.geo.index);
          g.boundingSphere = l.geo.boundingSphere;
          const isNear = k <= 1;
          return { tris: l.tris, plain: this.batch(g, isNear ? near : far, k < 3, false), fade: this.batch(g, isNear ? nearFade : farFade, k < 3, true) };
        });
        this.types.push({ name, lods, keepPaint: src.keepPaint, paint: src.paint });
      }
      for (const T of this.types) for (const l of T.lods) this.all.push(l.plain, l.fade);
      if (renderer?.compileAsync && camera) {
        const T = this.types[0], probes = [T.lods[0].plain, T.lods[0].fade, T.lods[2].plain, T.lods[2].fade];
        for (const b of probes) { b.mesh.count = 1; b.mesh.visible = true; }
        try { await renderer.compileAsync(this.group, camera, scene); } catch (e) { console.warn("[traffic] compileAsync:", e); }
        for (const b of probes) { b.mesh.count = 0; b.mesh.visible = false; }
      }
      this.ready = true;
    } catch (e) { this.failed = e; console.warn("[traffic] fleet failed:", e); }
  }
  batch(geo, mat, cast, fade, cap = 32) {
    const g = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(geo.attributes)) g.setAttribute(n, a);
    g.setIndex(geo.index); g.userData.shared = true; g.boundingSphere = geo.boundingSphere;
    const b = { geo: g, mat, cast, fade, mesh: null, cap: 0, n: 0 };
    this.grow(b, cap);
    return b;
  }
  grow(b, cap) {
    if (b.mesh) { this.group.remove(b.mesh); b.mesh.dispose(); }
    b.cap = cap;
    b.geo.setAttribute("paint", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    b.geo.setAttribute("motion", new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    if (b.fade) b.geo.setAttribute("lodFade", new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
    const m = new THREE.InstancedMesh(b.geo, b.mat, cap);
    m.count = 0; m.frustumCulled = false; m.castShadow = b.cast; m.receiveShadow = true; m.visible = false;
    m.name = "traffic-car-batch";
    this.group.add(m);
    b.mesh = m;
  }

  /** Draw the sim's cars at interpolation factor alpha (0 = last step's pose, 1 = this step's). */
  update(sim, alpha, camPos, camera) {
    if (!this.ready || !camera) return;
    const t0 = performance.now();
    trafficTime.value = performance.now() / 1000;
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm, THREE.WebGPUCoordinateSystem, camera.reversedDepth);
    const L = this.lodDist, last = L.length - 1, st = this.stats;
    st.drawn = 0; st.fading = 0; st.culled = 0; st.far = 0; st.tris = 0;
    for (let k = 0; k < 4; k++) st.perLod[k] = 0;
    this.frameNo++;
    const jumped = !this.hasLast || camPos.distanceTo(this.lastPos) > 5;
    this.lastPos.copy(camPos); this.hasLast = true;
    let nj = 0;
    const a = alpha, b1 = 1 - alpha;
    const P = sim;
    for (let i = 0; i < sim.cap; i++) {
      if (!P.alive[i]) { this.shown[i] = -1; continue; }
      const x = P.px[i] * b1 + P.x[i] * a, y = P.py[i] * b1 + P.y[i] * a, z = P.pz[i] * b1 + P.z[i] * a;
      this.sphere.center.set(x, y + 0.9, z);
      if (!this.frustum.intersectsSphere(this.sphere)) { st.culled++; this.shown[i] = -1; continue; }
      const dx = x - camPos.x, dy = y + 0.9 - camPos.y, dz = z - camPos.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= FADE_TO) { st.far++; this.shown[i] = -1; continue; }
      let k = 0; while (k < last && d >= L[k]) k++;
      const keep = d > FADE_FROM ? 1 - (d - FADE_FROM) / (FADE_TO - FADE_FROM) : 1;
      let near = k, far = -1, t = 0;
      const bl = k > 0 ? BANDS[k - 1] ?? 0 : 0, bk = BANDS[k] ?? 0;
      if (k > 0 && d - L[k - 1] < bl * L[k - 1]) { near = k - 1; far = k; t = (d - (1 - bl) * L[k - 1]) / (2 * bl * L[k - 1]); }
      else if (k < last && L[k] - d < bk * L[k]) { near = k; far = k + 1; t = (d - (1 - bk) * L[k]) / (2 * bk * L[k]); }
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const shown = far >= 0 ? -1 : k;
      if (!jumped && shown >= 0 && this.shown[i] >= 0 && this.shown[i] !== shown && this.seenF[i] === this.frameNo - 1) st.pops++;
      this.shown[i] = shown; this.seenF[i] = this.frameNo;
      const base = P.type[i] * (last + 1) * 2;     // batch index of (type, LOD 0, plain)
      if (far >= 0 && keep >= 1) { this.jb[nj] = base + near * 2 + 1; this.jc[nj] = i; this.jf[nj++] = t; this.jb[nj] = base + far * 2 + 1; this.jc[nj] = i; this.jf[nj++] = 1 + t; st.fading++; }
      else if (keep < 1) { this.jb[nj] = base + k * 2 + 1; this.jc[nj] = i; this.jf[nj++] = 1 - keep; st.fading++; }
      else { this.jb[nj] = base + k * 2; this.jc[nj] = i; this.jf[nj++] = 0; }
      st.drawn++; st.perLod[k]++; st.tris += this.types[P.type[i]].lods[k].tris;
    }
    const all = this.all;
    for (let q = 0; q < all.length; q++) all[q].n = 0;
    for (let q = 0; q < nj; q++) all[this.jb[q]].n++;
    for (let q = 0; q < all.length; q++) if (all[q].n > all[q].cap) this.grow(all[q], Math.ceil(all[q].n * 1.5 / 32) * 32);
    for (let q = 0; q < all.length; q++) all[q].mesh.count = 0;
    for (let q = 0; q < nj; q++) {
      const bt = all[this.jb[q]], m = bt.mesh, n = m.count++, i = this.jc[q];
      // interpolated pose -> matrix (column-major): x = model left, y = up, z = the bonnet (heading + pitch)
      let yaw = P.yaw[i], py = P.pyaw[i], dyw = yaw - py;
      if (dyw > Math.PI) dyw -= 2 * Math.PI; else if (dyw < -Math.PI) dyw += 2 * Math.PI;
      yaw = py + dyw * a;
      const pitch = P.ppitch[i] * b1 + P.pitch[i] * a;
      const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      const e = m.instanceMatrix.array, o = n * 16;
      e[o] = cy; e[o + 1] = 0; e[o + 2] = -sy; e[o + 3] = 0;                       // left axis
      e[o + 4] = -sy * sp; e[o + 5] = cp; e[o + 6] = -cy * sp; e[o + 7] = 0;        // up = forward x left
      e[o + 8] = sy * cp; e[o + 9] = sp; e[o + 10] = cy * cp; e[o + 11] = 0;        // forward
      e[o + 12] = P.px[i] * b1 + P.x[i] * a; e[o + 13] = P.py[i] * b1 + P.y[i] * a + 0.005; e[o + 14] = P.pz[i] * b1 + P.z[i] * a; e[o + 15] = 1;
      const T = this.types[P.type[i]], pa = bt.geo.attributes.paint.array, mo = bt.geo.attributes.motion.array;
      if (T.keepPaint) { pa[n * 3] = T.paint.r; pa[n * 3 + 1] = T.paint.g; pa[n * 3 + 2] = T.paint.b; }
      else { pa[n * 3] = P.paint[i * 3]; pa[n * 3 + 1] = P.paint[i * 3 + 1]; pa[n * 3 + 2] = P.paint[i * 3 + 2]; }
      mo[n * 4] = P.pspin[i] * b1 + P.spin[i] * a; mo[n * 4 + 1] = P.steer[i]; mo[n * 4 + 2] = P.bits[i]; mo[n * 4 + 3] = yaw;
      if (bt.fade) bt.geo.attributes.lodFade.array[n] = this.jf[q];
    }
    st.draws = 0;
    for (let q = 0; q < all.length; q++) {
      const bt = all[q], m = bt.mesh;
      m.visible = m.count > 0;
      if (!m.visible) continue;
      st.draws++;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, m.count * 16); m.instanceMatrix.needsUpdate = true;
      for (const [nm, sz] of ATTRS) { const at = bt.geo.attributes[nm]; if (!at) continue; at.clearUpdateRanges(); at.addUpdateRange(0, m.count * sz); at.needsUpdate = true; }
    }
    st.ms = st.ms * 0.95 + (performance.now() - t0) * 0.05;
  }
}
const ATTRS = [["paint", 3], ["motion", 4], ["lodFade", 1]];
