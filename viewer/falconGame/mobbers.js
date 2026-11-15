// MOBBERS AND THIEVES at the eyrie (docs/FALCON_GAME.md "Defend the eyrie"): carrion crows / jackdaws that come to
// harass the Saint-Job eyrie (corvids mob peregrines and raid ledges for eggs and chicks), and a gull that chases a
// falcon carrying prey to make it drop it (kleptoparasitism: gulls rob raptors and each other of food).
//   crows   arrive from 250-350 m, circle the tower close to the eyrie ledge (swooping in, out), and when the falcon is
//           near they turn on it (diving at it from above and behind, as mobbing crows do). Chased off = the falcon
//           passes within 7 m faster than 14 m/s heading at it: the crow bolts (climbing, 17 m/s) and leaves for good.
//   gull    follows a falcon that carries prey (up to 15 m/s: a falcon in a fast glide or a dive gets away); within
//           2.5 m for 1 s it robs the prey. Flown at (as above): it veers off for 15 s, then comes back.
// Drawn with the pigeons' own instanced mesh and material (viewer/falconFlight/pigeons.js: the wings flap / glide /
// fold in the vertex shader), tinted (crow black, gull pale grey), scaled to their size x the flight's readable 1.4.
// Cost: 8 birds on the CPU (a few microseconds), one instanced draw only while a mission has them; nothing otherwise.
import * as THREE from "three/webgpu";
import { pigeonGeometry, pigeonMaterial } from "../falconFlight/pigeons.js";

const N = 8, GULL = 7;
const OFF = 0, HARASS = 1, FLEE = 2, GONE = 3, FOLLOW = 4, VEER = 5;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class Mobbers {
  constructor(scene) {
    const base = pigeonGeometry(), g = new THREE.InstancedBufferGeometry();
    for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
    g.instanceCount = N;
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    this.aDir = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    this.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    const tint = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) tint.set(i === GULL ? [3.4, 3.4, 3.5] : [0.16, 0.16, 0.18], i * 3);
    g.setAttribute("iPos", this.aPos); g.setAttribute("iDir", this.aDir); g.setAttribute("iAnim", this.aAnim);
    g.setAttribute("iTint", new THREE.InstancedBufferAttribute(tint, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mesh = new THREE.Mesh(g, pigeonMaterial());
    this.mesh.name = "falcon-game-mobbers"; this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.p = new Float32Array(N * 3); this.v = new Float32Array(N * 3);
    this.state = new Uint8Array(N); this.t = new Float32Array(N); this.ph = new Float32Array(N); this.bank = new Float32Array(N);
    this.orbit = new Float32Array(N); this.yaw = new Float32Array(N);
    this.home = { x: 0, y: 0, z: 0 };
    this.stats = { chased: 0, harass: 0, stolen: 0, gullVeers: 0 };
    this.events = [];
    this.active = false;
  }

  /** crows: how many come (<= 7) to the eyrie at home {x, y, z} */
  startCrows(home, n = 5, out = null) {
    // they circle OUT in front of the ledge (the tower face's outward normal `out`), not through the tower
    this.home = out ? { x: home.x + out.x * 14, y: home.y, z: home.z + out.z * 14 } : { ...home };
    this.ledge = { ...home }; this.active = true; this.mesh.visible = true;
    for (let i = 0; i < GULL; i++) {
      if (i >= n) { this.state[i] = OFF; continue; }
      const a = rand(0, 6.283), R = rand(240, 340);
      this.p.set([home.x + Math.cos(a) * R, home.y + rand(10, 40), home.z + Math.sin(a) * R], i * 3);
      this.v.set([-Math.cos(a) * 12, 0, -Math.sin(a) * 12], i * 3);
      this.state[i] = HARASS; this.t[i] = rand(0, 3); this.orbit[i] = (Math.random() < 0.5 ? 1 : -1) * rand(0.25, 0.4); this.ph[i] = rand(0, 6);
    }
    this.stats.chased = 0; this.stats.harass = 0;
  }
  /** the gull: from far behind the falcon */
  startGull(f) {
    this.active = true; this.mesh.visible = true;
    const h = f.heading, x = f.pos.x + Math.sin(h) * 70, z = f.pos.z + Math.cos(h) * 70;
    this.p.set([x, f.pos.y + 15, z], GULL * 3); this.stats.stolen = 0; this.v.set([0, 0, 0], GULL * 3);
    this.state[GULL] = FOLLOW; this.t[GULL] = 0; this.near = 0;
  }
  stop() { this.active = false; this.mesh.visible = false; this.state.fill(OFF); }
  crowsLeft() { let n = 0; for (let i = 0; i < GULL; i++) if (this.state[i] === HARASS) n++; return n; }
  gullOn() { return this.state[GULL] === FOLLOW || this.state[GULL] === VEER; }

  /** steer v toward a target point at speed s (accel limited) */
  seek(i, tx, ty, tz, s, acc, dt) {
    const o = i * 3, P = this.p, V = this.v;
    let dx = tx - P[o], dy = ty - P[o + 1], dz = tz - P[o + 2];
    const d = Math.hypot(dx, dy, dz) || 1; dx = dx / d * s; dy = dy / d * s; dz = dz / d * s;
    const ax = dx - V[o], ay = dy - V[o + 1], az = dz - V[o + 2], a = Math.hypot(ax, ay, az) || 1, k = Math.min(1, acc * dt / a);
    V[o] += ax * k; V[o + 1] += ay * k; V[o + 2] += az * k;
    return d;
  }

  /** dt (s), f: the falcon flight state, carrying: the falcon has prey, floor(x, z) the city's floor */
  update(dt, f, carrying, floor) {
    if (!this.active) return;
    const P = this.p, V = this.v, H = this.home;
    let harass = 0;
    const fvx = f.vel.x, fvy = f.vel.y, fvz = f.vel.z, fV = Math.hypot(fvx, fvy, fvz) || 1;
    /** flown at: the falcon within 7 m, fast, heading at the bird */
    const flownAt = (o) => {
      const dx = P[o] - f.pos.x, dy = P[o + 1] - f.pos.y, dz = P[o + 2] - f.pos.z, d = Math.hypot(dx, dy, dz);
      return d < 7.5 && fV > 13 && (dx * fvx + dy * fvy + dz * fvz) / (d * fV) > 0.45;
    };
    for (let i = 0; i < N; i++) {
      const s = this.state[i], o = i * 3;
      if (s === OFF || s === GONE) continue;
      this.t[i] += dt;
      const dF = Math.hypot(P[o] - f.pos.x, P[o + 1] - f.pos.y, P[o + 2] - f.pos.z);
      if (s === HARASS) {
        // round the tower near the eyrie; when the falcon is near, at it (a dive from above and behind)
        const dH = Math.hypot(P[o] - H.x, P[o + 2] - H.z);
        if (dF < 35 && this.t[i] % 9 < 5) this.seek(i, f.pos.x + Math.sin(f.heading) * 4, f.pos.y + 3, f.pos.z + Math.cos(f.heading) * 4, 13.5, 9, dt);
        else {
          const a = Math.atan2(P[o + 2] - H.z, P[o] - H.x) + this.orbit[i];
          const R = 10 + 6 * Math.sin(this.t[i] * 0.4 + this.ph[i]);
          this.seek(i, H.x + Math.cos(a) * R, H.y + 4 + 7 * Math.sin(this.t[i] * 0.31 + this.ph[i] * 2), H.z + Math.sin(a) * R, dH > 60 ? 14 : 10.5, 7, dt);
        }
        if (Math.hypot(P[o] - this.ledge.x, P[o + 2] - this.ledge.z) < 24 && Math.abs(P[o + 1] - H.y) < 15) harass++;
        // a crow dodges a falcon coming straight at it (a sideways jink, once every ~2 s): fly at it fast and true
        const ex = P[o] - f.pos.x, ey = P[o + 1] - f.pos.y, ez = P[o + 2] - f.pos.z;
        if (dF < 11 && dF > 4 && this.t[i] > (this.jinkT ??= new Float32Array(N))[i] && (ex * fvx + ey * fvy + ez * fvz) / (dF * fV) > 0.8 && fV < 22) {
          this.jinkT[i] = this.t[i] + 2; const s2 = Math.random() < 0.5 ? 1 : -1;
          V[o] += -fvz / fV * 7 * s2; V[o + 2] += fvx / fV * 7 * s2; V[o + 1] += 2;
        }
        if (flownAt(o)) {
          this.state[i] = FLEE; this.t[i] = 0; this.stats.chased++;
          this.events.push({ kind: "chased", i });
          const dx = P[o] - f.pos.x, dz = P[o + 2] - f.pos.z, L = Math.hypot(dx, dz) || 1;
          this.fx = dx / L; this.fz = dz / L;
          V[o] = dx / L * 17; V[o + 1] = 4; V[o + 2] = dz / L * 17;
        }
      } else if (s === FLEE) {
        const dH = Math.hypot(P[o] - H.x, P[o + 2] - H.z);
        const sp = Math.hypot(V[o], V[o + 2]) || 1;
        this.seek(i, P[o] + V[o] / sp * 50, P[o + 1] + 12, P[o + 2] + V[o + 2] / sp * 50, 17, 6, dt);
        if (dH > 380 || this.t[i] > 30) this.state[i] = GONE;
      } else if (s === FOLLOW) {
        // the gull: after the falcon while it carries prey
        if (!carrying) { this.state[i] = VEER; this.t[i] = 0; }
        else {
          // aims a little ahead of the falcon (it cuts the corner)
          this.seek(i, f.pos.x + fvx * 0.6, f.pos.y + fvy * 0.6 + 1, f.pos.z + fvz * 0.6, 15, 8, dt);
          this.near = dF < 2.6 ? this.near + dt : Math.max(0, this.near - dt * 0.5);
          if (this.near > 1.0) { this.stats.stolen++; this.events.push({ kind: "stolen" }); this.state[i] = VEER; this.t[i] = -10; this.near = 0; }
          if (flownAt(o)) { this.state[i] = VEER; this.t[i] = 0; this.stats.gullVeers++; this.events.push({ kind: "veer" }); V[o + 1] += 5; }
        }
      } else if (s === VEER) {
        const sp = Math.hypot(V[o], V[o + 2]) || 1;
        this.seek(i, P[o] + V[o] / sp * 40, Math.max(P[o + 1], f.pos.y + 20), P[o + 2] + V[o + 2] / sp * 40, 11, 4, dt);
        if (this.t[i] > 15 && carrying) { this.state[i] = FOLLOW; this.near = 0; }
      }
      // the floor (roofs, the church): keep 4 m over it
      const fl = floor(P[o], P[o + 2]) + 4;
      if (P[o + 1] < fl) { P[o + 1] = fl; if (V[o + 1] < 0) V[o + 1] = 1; }
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
    }
    this.stats.harass = harass;
    this.write(dt);
  }

  write(dt) {
    const A = this.aPos.array, D = this.aDir.array, M = this.aAnim.array, P = this.p, V = this.v;
    for (let i = 0; i < N; i++) {
      const o = i * 3, q = i * 4, s = this.state[i];
      if (s === OFF || s === GONE) { A[q + 3] = 0; continue; }
      A[q] = P[o]; A[q + 1] = P[o + 1]; A[q + 2] = P[o + 2]; A[q + 3] = i === GULL ? 2.9 : 2.1;
      const sp = Math.hypot(V[o], V[o + 1], V[o + 2]) || 1;
      const yaw = Math.atan2(V[o], V[o + 2]), dy = Math.atan2(Math.sin(yaw - this.yaw[i]), Math.cos(yaw - this.yaw[i]));
      this.yaw[i] = yaw;
      this.bank[i] += (clamp(-dy / Math.max(dt, 1e-3) * sp / 9.81 * 0.5, -1, 1) - this.bank[i]) * (1 - Math.exp(-5 * dt));
      D[q] = V[o] / sp; D[q + 1] = V[o + 1] / sp; D[q + 2] = V[o + 2] / sp; D[q + 3] = this.bank[i];
      // crows: steady rowing beats (~4 Hz); the gull: slow beats and long glides
      const gull = i === GULL, glide = gull ? Math.sin(this.t[i] * 0.7 + i) > -0.2 : Math.sin(this.t[i] * 0.9 + i * 2) > 0.6;
      this.ph[i] += dt * Math.PI * 2 * (glide ? 0.6 : gull ? 2.6 : 4.2);
      M[q] = this.ph[i] % 62.83; M[q + 1] = glide ? 0.1 : 0.8; M[q + 2] = 0; M[q + 3] = glide ? 0.35 : 0;
    }
    this.aPos.needsUpdate = true; this.aDir.needsUpdate = true; this.aAnim.needsUpdate = true;
  }
}
export const MOB = { OFF, HARASS, FLEE, GONE, FOLLOW, VEER };
