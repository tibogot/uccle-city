// THE FALCON'S CAMERA (Falcon Flight Lab): a chase camera behind the falcon's path (or behind the mouse aim), stiffer
// the faster it goes (the classic failure is a camera that lags more with speed), the field of view widening with
// airspeed (58 -> 82 deg at 90 m/s), a shake that starts above ~45 m/s and in rough air, a roll that follows a third
// of the bank; air streaks round the camera in the stoop and a speed vignette (a CSS overlay, no extra pass).
// Head cam: from the falcon's head along its path, rolling with the full bank.
import * as THREE from "three/webgpu";
import { attribute, vec3, uniform } from "three/tsl";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const _e = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3(), _t = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);

export class FalconCamera {
  constructor(camera, scene) {
    this.camera = camera;
    this.mode = "chase";                              // "chase" | "head"
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.dir = new THREE.Vector3(0, 0, -1);           // the smoothed view direction
    this.roll = 0; this.shakeT = 0; this.fov = 58; this.inited = false;
    this.params = { fov0: 58, fov1: 82, dist: 1.0, shake: 1, streaks: true, vignette: true };
    // air streaks: 140 segments in a box round the camera, stretched along the air velocity
    const N = 140;
    this.N = N; this.sp = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) this.sp[i] = (Math.random() - 0.5) * 50;
    const g = new THREE.BufferGeometry();
    this.sPos = new THREE.BufferAttribute(new Float32Array(N * 6), 3); this.sPos.setUsage(THREE.DynamicDrawUsage);
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
      const floor = o.floor ? o.floor(_t.x, _t.z) + 0.6 : -1e9;
      if (_t.y < floor) _t.y = floor;
      if (!this.inited) this.pos.copy(_t);
      this.pos.lerp(_t, 1 - Math.exp(-(6 + V * 0.12) * dt));
      this.look.copy(b.pos).addScaledVector(D, 4 * span).addScaledVector(_u, 0.12 * span);
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
