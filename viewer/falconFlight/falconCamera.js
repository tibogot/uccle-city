// THE FALCON'S CAMERA (Falcon Flight Lab): a chase camera behind the falcon's path (or behind the mouse aim), stiffer
// the faster it goes (the classic failure is a camera that lags more with speed), the field of view widening with
// airspeed (58 -> 82 deg at 90 m/s), a shake that starts above ~45 m/s and in rough air, a roll that follows a third
// of the bank; air streaks round the camera in the stoop and a speed vignette (a CSS overlay, no extra pass).
// Head cam: from the falcon's head along its path, rolling with the full bank.
import * as THREE from "three/webgpu";
import { attribute, vec3, uniform } from "three/tsl";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const _c = new THREE.Vector3(), _e = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3(), _t = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);

export class FalconCamera {
  constructor(camera, scene) {
    this.camera = camera;
    this.mode = "chase";                              // "chase" | "head"
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.dir = new THREE.Vector3(0, 0, -1);           // the smoothed view direction
    this.roll = 0; this.shakeT = 0; this.fov = 58; this.inited = false;
    this.fix = new THREE.Vector3();                   // the clearance offset on the eased chase position (keepClear)
    this.ceil = Infinity;
    this.params = { fov0: 58, fov1: 82, dist: 1.0, shake: 1, streaks: true, vignette: true };
    // air streaks: 140 segments in a box round the camera, stretched along the air velocity
    const N = 140;
    this.N = N; this.sp = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) this.sp[i] = (Math.random() - 0.5) * 50;
    const g = new THREE.BufferGeometry();
    this.sPos = new THREE.BufferAttribute(new Float32Array(N * 6), 3);
    const a = new Float32Array(N * 2); for (let i = 0; i < N; i++) { a[i * 2] = 0; a[i * 2 + 1] = 1; }
    g.setAttribute("position", this.sPos); g.setAttribute("aEnd", new THREE.BufferAttribute(a, 1));
    this.streakOpacity = uniform(0);
    const m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    m.colorNode = vec3(0.85, 0.9, 1.0);
    m.opacityNode = this.streakOpacity.mul(attribute("aEnd", "float").mul(0.8).add(0.2));
    this.streaks = new THREE.LineSegments(g, m); this.streaks.frustumCulled = false; this.streaks.name = "air-streaks";
    scene.add(this.streaks);
    const v = document.createElement("div");
    v.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(10,14,22,.55) 100%)";
    document.body.append(v); this.vignette = v;
  }

  /** the camera's floor (+0.8 m) at two points, and this.ceil (-0.6 m, Infinity: none) */
  solid(o, x1, z1, x2, z2) {
    this.ceil = Infinity;
    if (o.col) {
      let f = -1e9;
      for (let k = 0; k < 2; k++) {
        const c = o.col(k ? x2 : x1, k ? z2 : z1);
        if (c.floor > f) f = c.floor;
        if (c.ceil - 0.6 < this.ceil) this.ceil = c.ceil - 0.6;
      }
      return f + 0.8;
    }
    return o.floor ? Math.max(o.floor(x1, z1), o.floor(x2, z2)) + 0.8 : -1e9;
  }
  /** P (a copy of the eased position) moved clear of the bird; returns P */
  keepClear(b, o, span, P) {
    const B = b.pos, minD = 0.62 * span + 0.45;
    let dx = P.x - B.x, dy = P.y - B.y, dz = P.z - B.z, d = Math.hypot(dx, dy, dz);
    const CL = (this.clear ??= { d: 0, pulled: 0, lifted: 0, over: false }); CL.d = d; CL.pulled = 0; CL.lifted = 0; CL.over = false;
    if (d < minD) {
      if (d < 1e-3) { dx = -this.dir.x; dy = -this.dir.y; dz = -this.dir.z; d = 1; }
      const k = minD / d; P.set(B.x + dx * k, B.y + dy * k, B.z + dz * k); this.clear.lifted = minD - d;
      dx = P.x - B.x; dy = P.y - B.y; dz = P.z - B.z; d = minD;
    }
    // (the solids that hide the bird: the crowns' dense cores, not their leaves, else a bird brushing a crown is hidden)
    const sample = o.sight || o.floor;
    if (!sample || o.perched) return P;
    // the line of sight to the bird's centre and its two wingtips (half the span to each side, level): the first
    // point under the solid (+0.25 m) along camera -> bird
    const rx = -Math.cos(b.heading) * span * 0.5, rz = Math.sin(b.heading) * span * 0.5;
    let worst = 1;                                    // the fraction of the way from the bird to the camera that is clear
    for (let w = -1; w <= 1; w++) {
      const tx = B.x + rx * w, tz = B.z + rz * w;
      const lx = P.x - tx, ly = P.y - B.y, lz = P.z - tz;
      for (let s = 0.15; s <= 1.001; s += 0.12) {
        if (s >= worst) break;
        const x = tx + lx * s, y = B.y + ly * s, z = tz + lz * s;
        if (y < sample(x, z) + 0.25) { worst = s; break; }
      }
    }
    if (worst >= 1) return P;
    // pull in along the line to the clear part; when that is closer than minD, go over the bird instead
    const keep = Math.max(worst - 0.08, 0), want = d * keep;
    if (want >= minD) { P.set(B.x + dx * keep, B.y + dy * keep, B.z + dz * keep); this.clear.pulled = d - want; }
    else {
      // straight over the bird (minD above it, leaning back along the view): the bird is in the free air, so is this
      // (when that spot is not free: a ceiling, a crown: in along the line to minD, the best there is)
      const ux = -this.dir.x * 0.35, uz = -this.dir.z * 0.35, ul = Math.hypot(ux, 1, uz);
      const ox = B.x + ux / ul * minD, oy = B.y + minD / ul, oz = B.z + uz / ul * minD;
      const c = o.col ? o.col(ox, oz) : null;
      if (!c || (oy > c.floor + 0.3 && oy < c.ceil - 0.3)) { P.set(ox, oy, oz); this.clear.over = true; }
      else P.set(B.x + dx / d * minD, B.y + dy / d * minD, B.z + dz / d * minD);
      this.clear.lifted += minD;
    }
    return P;
  }

  /**
   * b: { pos (Vector3), va {x,y,z} (air velocity), V, phi, heading, gamma, lift, span, stun }; o: { aim (Vector3 dir) |
   * null, look {yaw, pitch}, zoom, perched, perchYaw }
   */
  update(dt, b, o = {}) {
    const P = this.params, cam = this.camera, V = b.V;
    // the direction to look along: the path (or the mouse aim), smoothed; perched: the way the bird faces
    if (o.perched) _e.set(-Math.sin(o.perchYaw), -0.25, -Math.cos(o.perchYaw)).normalize();
    else if (o.aim) _e.copy(o.aim);
    else _e.set(b.va.x, b.va.y, b.va.z).normalize();
    if (o.look && (o.look.yaw || o.look.pitch)) {
      _e.applyAxisAngle(_Y, o.look.yaw);
      _w.crossVectors(_e, _Y).normalize(); _e.applyAxisAngle(_w, o.look.pitch);
    }
    const stiff = 3.5 + V * 0.09;                    // faster = stiffer
    if (!this.inited) { this.dir.copy(_e); }
    this.dir.lerp(_e, 1 - Math.exp(-stiff * dt)).normalize();
    const D = this.dir;
    // up: world up made perpendicular to the view (a straight-down view takes the heading as up)
    _u.copy(_Y).addScaledVector(D, -D.y);
    if (_u.lengthSq() < 0.02) _u.set(-Math.sin(b.heading), 0, -Math.cos(b.heading));
    _u.normalize();
    const span = b.span;
    if (this.mode === "head") {
      _t.copy(b.pos).addScaledVector(D, 0.3 * span).addScaledVector(_u, 0.07 * span);
      this.pos.copy(_t);
      this.look.copy(_t).addScaledVector(D, 10);
      this.roll += ((o.perched ? 0 : b.phi) - this.roll) * (1 - Math.exp(-8 * dt));
    } else {
      // chase: behind along the view and above; closer in the stoop (the ground rushes up), farther when slow
      const dist = (1.55 + 0.9 * smooth(V, 4, 18) - 0.35 * smooth(V, 40, 90)) * span * P.dist * (o.zoom ?? 1);
      const up = (0.3 + 0.1 * smooth(V, 30, 90)) * span * (o.zoom ?? 1);
      _t.copy(b.pos).addScaledVector(D, -dist).addScaledVector(_u, up);
      // never inside a roof: lifted over it (and then the view tips down, so the bird stays in the frame); o.col (the
      // city: the solid at the bird's height, crowns whole) also holds it under a ceiling (a bridge's arch)
      const floor = this.solid(o, _t.x, _t.z, (_t.x + b.pos.x) / 2, (_t.z + b.pos.z) / 2);
      const raised = Math.max(0, floor - _t.y);
      if (raised > 0) _t.y = floor;
      if (_t.y > this.ceil) _t.y = Math.max(this.ceil, Math.min(_t.y, b.pos.y + 0.3));
      if (!this.inited) this.pos.copy(_t);
      this.pos.lerp(_t, 1 - Math.exp(-(6 + V * 0.12) * dt));
      // the bird is never cut: the lens stays out of its wings (a lifted camera beside the bird closed in on them as it
      // eased), and the line of sight to the bird and its wingtips stays over the solid (else the camera comes in
      // along that line, or over the bird when that would be too close)
      // (the fix is an offset on the eased position: taken at once when it grows, eased off when it shrinks: no pop)
      const want = this.keepClear(b, o, span, _c.copy(this.pos)).sub(this.pos);
      if (!this.inited || want.lengthSq() >= this.fix.lengthSq()) this.fix.copy(want); else this.fix.lerp(want, 1 - Math.exp(-5 * dt));
      this.raised = (this.raised ?? 0) + (raised - (this.raised ?? 0)) * (1 - Math.exp(-6 * dt));
      this.look.copy(b.pos).addScaledVector(D, 4 * span / (1 + this.raised * 0.5)).addScaledVector(_u, 0.12 * span);
      this.look.y -= this.raised * 0.6;
      this.roll += ((o.perched ? 0 : b.phi * 0.33) - this.roll) * (1 - Math.exp(-4 * dt));
    }
    this.inited = true;
    // FOV with airspeed
    const fovT = P.fov0 + (P.fov1 - P.fov0) * smooth(V, 18, 90) + (this.mode === "head" ? 8 : 0);
    this.fov += (fovT - this.fov) * (1 - Math.exp(-3 * dt));
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    // shake: speed + rough air + a hit
    this.shakeT += dt;
    const amp = P.shake * (0.004 * smooth(V, 45, 100) + 0.0025 * clamp(Math.abs(b.liftRate ?? 0) / 3, 0, 1) + (b.stun > 0 ? 0.02 * b.stun : 0));
    const s = this.shakeT;
    const sx = amp * (Math.sin(s * 37.1) * 0.6 + Math.sin(s * 23.3 + 1.2) * 0.4), sy = amp * (Math.sin(s * 31.7 + 0.5) * 0.6 + Math.sin(s * 19.9 + 2.1) * 0.4);
    cam.position.copy(this.pos);
    if (this.mode !== "head") {
      // the eased fix may lag the bird: the lens never closer than minD to it (hard, radial)
      cam.position.add(this.fix);
      const B = b.pos, minD = 0.62 * span + 0.45;
      _c.subVectors(cam.position, B);
      const d = _c.length();
      if (d < minD) cam.position.copy(B).addScaledVector(d > 1e-3 ? _c.divideScalar(d) : _c.copy(this.dir).negate(), minD);
    }
    cam.up.copy(_u);
    cam.lookAt(this.look);
    // roll (positive phi = right wing down: the horizon tilts the other way) + shake
    cam.rotateZ(-this.roll + sx * 0.5);
    cam.rotateX(sy); cam.rotateY(sx);
    // streaks: segments in a 50 m box round the camera, along the air velocity; only fast
    const so = P.streaks ? smooth(V, 32, 85) : 0;
    this.streakOpacity.value = so * 0.55;
    this.streaks.visible = so > 0.01;
    if (this.streaks.visible) {
      const A = this.sPos.array, L = clamp(V * 0.05, 0.5, 5);
      const ex = b.va.x / V, ey = b.va.y / V, ez = b.va.z / V;
      const c = cam.position, E3 = this._e3 ??= [0, 0, 0];
      E3[0] = ex; E3[1] = ey; E3[2] = ez;
      for (let i = 0; i < this.N; i++) {
        const o3 = i * 3;
        // move against the air (the bird flies through still streaks), wrap round the camera
        for (let k = 0; k < 3; k++) {
          let q = this.sp[o3 + k] - E3[k] * V * dt;
          if (q < -25) q += 50; else if (q > 25) q -= 50;
          this.sp[o3 + k] = q;
        }
        const x = c.x + this.sp[o3], y = c.y + this.sp[o3 + 1], z = c.z + this.sp[o3 + 2];
        // none right in front of the lens or in the bird
        const near = this.sp[o3] ** 2 + this.sp[o3 + 1] ** 2 + this.sp[o3 + 2] ** 2 < 9;
        A[i * 6] = x; A[i * 6 + 1] = y; A[i * 6 + 2] = z;
        A[i * 6 + 3] = near ? x : x - ex * L; A[i * 6 + 4] = near ? y : y - ey * L; A[i * 6 + 5] = near ? z : z - ez * L;
      }
      this.sPos.needsUpdate = true;
    }
    this.vignette.style.opacity = P.vignette ? (0.9 * smooth(V, 35, 95)).toFixed(3) : "0";
  }
}
