// FLY MODE: a bird over Uccle. Arcade flight with energy: diving builds speed, climbing spends it, flapping
// adds it back; banking turns; it never flies into the ground or a roof. A smoothed chase camera behind and
// above the bird that leans into the turns.
//
//   W / S (or ↑ ↓)   pitch down / up         A / D (or ← →)   bank left / right (turn)
//   Space            flap (lift + speed)      Shift            tuck the wings: a fast dive
//   drag             look around the bird     Esc              back to orbit
//
// The bird: a placeholder (body + two flapping wings) until a model is given with setModel(gltf): its
// animation clips play through an AnimationMixer, a "flap" clip while flapping or climbing, a "glide" clip
// otherwise (names matched loosely: flap / fly / wing ... glide / soar / idle).
import * as THREE from "three/webgpu";
import { BirdRig } from "./birdRig.js";

const MIN_SPEED = 7, CRUISE = 14, MAX_SPEED = 38;   // m/s
const CLEAR = 3.0;                                   // metres kept above the ground / roofs

export class Flyer {
  /** world: { surface(x, z), ground(x, z) }; heightAt(x, z) optional: roofs too (else surface) */
  constructor(camera, dom, scene, world) {
    Object.assign(this, { camera, dom, scene, world, on: false, keys: new Set() });
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.bank = 0; this.speed = CRUISE;
    this.flap = 0;                      // 0..1 how hard it is flapping (drives the wings / clip blend)
    this.wingPhase = 0;
    this.look = { yaw: 0, pitch: 0 };   // mouse look offset around the bird
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.camUp = new THREE.Vector3(0, 1, 0);
    this.bird = this.placeholder();
    this.bird.visible = false;
    scene.add(this.bird);
    addEventListener("keydown", (e) => { if (!this.on) return; this.keys.add(e.code); if (e.code === "Escape") this.onExit?.(); if (e.code === "Space") e.preventDefault(); });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    let drag = null;
    dom.addEventListener("pointerdown", (e) => { if (this.on) drag = [e.clientX, e.clientY]; });
    addEventListener("pointerup", () => { drag = null; });
    addEventListener("pointermove", (e) => {
      if (!this.on || !drag) return;
      this.look.yaw -= (e.clientX - drag[0]) * 0.005;
      this.look.pitch = Math.max(-0.9, Math.min(0.6, this.look.pitch - (e.clientY - drag[1]) * 0.004));
      drag = [e.clientX, e.clientY];
    });
  }

  /** A stand-in bird ~0.7 m wingspan x 2 for visibility: body, head, tail, two wings that flap. */
  placeholder() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardNodeMaterial({ color: 0x2a2a30, roughness: 0.7 });
    const belly = new THREE.MeshStandardNodeMaterial({ color: 0x8a8a90, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10).rotateX(Math.PI / 2), mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat); head.position.set(0, 0.04, -0.3);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0xd8a030 }));
    beak.position.set(0, 0.03, -0.41);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.2), mat); tail.position.set(0, 0, 0.32);
    const wingGeo = new THREE.BoxGeometry(0.62, 0.015, 0.2).translate(0.31, 0, 0);
    const wl = new THREE.Group(), wr = new THREE.Group();
    wl.add(new THREE.Mesh(wingGeo, mat)); wr.add(new THREE.Mesh(wingGeo, mat));
    wl.position.set(0.06, 0.03, -0.04); wr.position.set(-0.06, 0.03, -0.04); wr.scale.x = -1;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1, 0.8, 1.4), belly); chest.position.set(0, -0.03, -0.12);
    g.add(body, head, beak, tail, wl, wr, chest);
    for (const m of [body, head, beak, tail, chest, wl.children[0], wr.children[0]]) m.castShadow = true;
    g.scale.setScalar(2.0);
    g.userData.wings = [wl, wr];
    g.name = "bird-placeholder";
    return g;
  }

  /** Replace the placeholder with a glTF bird (gltf = GLTFLoader result). forward: the model's nose axis. */
  setModel(gltf, { scale = 1, forward = "-z", clips = null } = {}) {
    const root = new THREE.Group();
    const m = gltf.scene;
    if (forward === "+z") m.rotation.y = Math.PI;
    else if (forward === "+x") m.rotation.y = Math.PI / 2;
    else if (forward === "-x") m.rotation.y = -Math.PI / 2;
    m.scale.setScalar(scale);
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(m);
    root.name = "bird";
    this.scene.remove(this.bird);
    this.bird = root; this.bird.visible = this.on; this.scene.add(root);
    this.mixer = gltf.animations?.length ? new THREE.AnimationMixer(m) : null;
    this.layerRoot = root;
    if (this.mixer) {
      const find = (re) => gltf.animations.find((c) => re.test(c.name));
      const byName = (n) => n && gltf.animations.find((c) => c.name === n);
      const flap = byName(clips?.flap) || find(/flap|fly|wing/i) || gltf.animations[0];
      const glide = byName(clips?.glide) || find(/glide|soar|idle/i) || flap;
      this.actions = { flap: this.mixer.clipAction(flap), glide: this.mixer.clipAction(glide) };
      for (const a of Object.values(this.actions)) { a.play(); a.setEffectiveWeight(0); }
    }
    this.calibrate(root);
    return Object.fromEntries((gltf.animations || []).map((c) => [c.name, +c.duration.toFixed(2)]));
  }

  // procedural flight layers on the bones: viewer/birdRig.js (shared with the bird lab)
  calibrate(root) { this.rig = new BirdRig(root); this.layerState = { fold: 0, brake: 0 }; window.__birdLayers = this.rig.found; }

  applyLayers(dt, { tuck, flapping }) {
    if (!this.rig) return;
    const s = this.layerState, ease = (c, t, r) => c + (t - c) * (1 - Math.exp(-r * dt));
    s.fold = ease(s.fold, tuck ? 1 : Math.max(0, -this.pitch - 0.35) * 1.5, 5);             // dives
    s.brake = ease(s.brake, !flapping && this.pitch > 0.2 && this.speed < CRUISE ? 1 : 0, 4); // braking
    this.rig.apply({ fold: s.fold, bank: this.bank, legs: 1, brake: s.brake });
  }


  /** y: absolute height (m); default 35 m above the ground */
  start(x, z, yaw, y = null) {
    this.on = true;
    this.yaw = yaw; this.pitch = 0; this.bank = 0; this.speed = CRUISE;
    this.pos.set(x, y ?? this.floor(x, z) + 35, z);
    this.look.yaw = 0; this.look.pitch = 0;
    this.bird.visible = true;
    this.camPos.copy(this.pos).add(new THREE.Vector3(Math.sin(yaw) * 9, 3, Math.cos(yaw) * 9));
    this.camLook.copy(this.pos);
  }
  stop() { this.on = false; this.bird.visible = false; }
  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  floor(x, z) { return this.world.heightAt ? this.world.heightAt(x, z) : this.world.surface(x, z); }

  update(dt) {
    if (!this.on) return;
    const k = this.keys, has = (...c) => c.some((x) => k.has(x));
    // ---- input -> target attitude
    const pitchIn = (has("KeyW", "ArrowUp") ? -1 : 0) + (has("KeyS", "ArrowDown") ? 1 : 0);   // W = nose down
    const bankIn = (has("KeyA", "ArrowLeft") ? 1 : 0) + (has("KeyD", "ArrowRight") ? -1 : 0);
    const tuck = has("ShiftLeft", "ShiftRight"), flapping = has("Space");
    const tPitch = tuck ? -0.75 : pitchIn * 0.55;
    const tBank = bankIn * 0.75;
    const ease = (cur, tgt, rate) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
    this.pitch = ease(this.pitch, tPitch, 2.5);
    this.bank = ease(this.bank, tBank, 3.0);
    // ---- energy: gravity along the path (dive = faster, climb = slower), drag toward cruise, flapping thrust
    const g = 9.81;
    this.speed += -Math.sin(this.pitch) * g * dt * (tuck ? 1.4 : 1.0);
    this.speed += (CRUISE - this.speed) * (tuck ? 0.05 : 0.25) * dt;
    if (flapping) this.speed += 7 * dt;
    this.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, this.speed));
    // ---- turn from the bank (coordinated: tighter at low speed)
    this.yaw += Math.sin(this.bank) * g / Math.max(this.speed, 1) * dt * 1.6;
    // ---- move along the attitude; flapping also lifts
    const cp = Math.cos(this.pitch);
    const fwd = new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    this.pos.addScaledVector(fwd, this.speed * dt);
    if (flapping) this.pos.y += 2.2 * dt;
    // ---- never into the ground or a roof (look ahead too, so a hill pulls the nose up early)
    const ahead = this.pos.clone().addScaledVector(fwd, this.speed * 0.6);
    const floor = Math.max(this.floor(this.pos.x, this.pos.z), this.floor(ahead.x, ahead.z)) + CLEAR;
    if (this.pos.y < floor) { this.pos.y = ease(this.pos.y, floor, 12); if (this.pitch < 0) this.pitch *= 0.85; }
    this.pos.y = Math.min(this.pos.y, 900);
    // ---- the bird: attitude + wing / clip blend
    this.flap = ease(this.flap, flapping || this.pitch > 0.25 ? 1 : 0, 4);
    this.bird.position.copy(this.pos);
    this.bird.rotation.set(this.pitch, this.yaw, this.bank, "YXZ");
    const wings = this.bird.userData.wings;
    if (wings) {
      this.wingPhase += dt * (6 + 8 * this.flap);
      const fold = tuck ? 0.9 : 0;
      const a = Math.sin(this.wingPhase) * (0.12 + 0.75 * this.flap) * (1 - fold);
      wings[0].rotation.z = a - fold * 0.2; wings[1].rotation.z = a - fold * 0.2;
      wings[0].scale.x = wings[1].scale.x = 1 - fold * 0.55; wings[1].scale.x *= -1;
    }
    if (this.mixer) {
      this.actions.flap.setEffectiveWeight(this.flap);
      this.actions.glide.setEffectiveWeight(1 - this.flap);
      this.actions.flap.timeScale = 0.8 + 0.8 * this.flap;
      // undo last frame's layer offsets first: the mixer only rewrites the channels its clips animate, so on
      // the others the offsets ACCUMULATED frame after frame (the bird jittered, owner 2026-11-04)
      this.rig?.restore();
      this.mixer.update(dt);
      this.applyLayers(dt, { tuck, flapping });
    }
    // ---- chase camera: behind and above, leaning into the turn, plus the mouse-look offset
    // close behind and a little above (the bird big in the lower third), farther when fast
    const camYaw = this.yaw + this.look.yaw, dist = 1.9 + this.speed * 0.035;   // close: the bird fills the lower third
    const elev = 0.17 + this.look.pitch * -1;
    const want = this.pos.clone().add(new THREE.Vector3(Math.sin(camYaw) * Math.cos(elev) * dist, Math.sin(elev) * dist, Math.cos(camYaw) * Math.cos(elev) * dist));
    want.y = Math.max(want.y, this.floor(want.x, want.z) + 1.5);
    this.camPos.lerp(want, 1 - Math.exp(-6 * dt));
    this.camLook.lerp(this.pos.clone().addScaledVector(fwd, 6).add(new THREE.Vector3(0, 0.6, 0)), 1 - Math.exp(-10 * dt));
    this.camUp.lerp(new THREE.Vector3(-Math.sin(this.bank) * 0.25 * Math.cos(this.yaw), 1, Math.sin(this.bank) * 0.25 * Math.sin(this.yaw)).normalize(), 1 - Math.exp(-4 * dt));
    this.camera.position.copy(this.camPos);
    this.camera.up.copy(this.camUp);
    this.camera.lookAt(this.camLook);
    this.camera.up.set(0, 1, 0);
  }
}
