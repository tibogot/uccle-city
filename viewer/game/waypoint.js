// THE WORLD MARKER (docs/GAMEKIT.md "Waypoints"): one waypoint in 3D = 2 draws, no light, no shadow, no texture.
//   beam   an open cylinder 260 m tall, additive, depthTest OFF: seen through the buildings from across the city, fading
//          with height, pulsing; it fades out from 70 m to 20 m from the camera (the ring takes over)
//   ring   a flat ring on the ground at the target (depth-tested, additive) with the objective's radius, pulsing
// Both write zero into the post chain's normal / metal-rough targets (mrtNode): no AO / SSR artefacts behind them.
// Cost: hidden = nothing drawn (visible = false); shown = 2 small draws, one uniform write per frame, no allocation.
// Its 2 pipelines are compiled when the kit loads (compile()), so the first waypoint never stalls a frame.
import * as THREE from "three/webgpu";
import { uniform, uv, float, vec3, vec4, mrt, sin, time, pow, abs } from "three/tsl";

const BEAM_H = 260;

export class Waypoint {
  constructor(scene) {
    this.uColor = uniform(new THREE.Color(1, 0.78, 0.2));
    this.uBeam = uniform(0);                 // beam opacity
    this.uRing = uniform(0);                 // ring opacity
    const noMRT = mrt({ normal: vec3(0), metalRough: vec3(0) });
    const base = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, toneMapped: false };
    // beam: brighter at the foot, gone at the top, a slow pulse running up
    const bm = new THREE.MeshBasicNodeMaterial({ ...base, depthTest: false });
    const v = uv().y;                         // 1 at the top of a CylinderGeometry, 0 at the foot
    const pulse = float(0.75).add(sin(v.mul(40).sub(time.mul(3))).mul(0.25));
    bm.colorNode = vec4(this.uColor.mul(this.uBeam).mul(pow(float(1).sub(v), 1.6)).mul(pulse), 1);
    bm.mrtNode = noMRT;
    const bg = new THREE.CylinderGeometry(1.4, 1.4, BEAM_H, 12, 1, true).translate(0, BEAM_H / 2, 0);
    this.beam = new THREE.Mesh(bg, bm);
    // ring: a band, brighter at its inner and outer edges
    const rm = new THREE.MeshBasicNodeMaterial({ ...base, depthTest: true });
    const r = uv().x;                         // RingGeometry: computed below as the radial 0..1 in uv.x
    const edge = float(1).sub(abs(r.sub(0.5)).mul(2)).oneMinus().pow(2).mul(0.8).add(0.25);
    rm.colorNode = vec4(this.uColor.mul(this.uRing).mul(edge).mul(float(0.7).add(sin(time.mul(4)).mul(0.3))), 1);
    rm.mrtNode = noMRT;
    const rg = new THREE.RingGeometry(0.92, 1, 48, 1).rotateX(-Math.PI / 2);
    { const p = rg.attributes.position, u = rg.attributes.uv; for (let i = 0; i < p.count; i++) u.setX(i, (Math.hypot(p.getX(i), p.getZ(i)) - 0.92) / 0.08); }
    this.ring = new THREE.Mesh(rg, rm);
    this.ring.renderOrder = 10; this.beam.renderOrder = 11;
    this.group = new THREE.Group();
    this.group.name = "game-waypoint";
    this.group.add(this.beam, this.ring);
    for (const m of [this.beam, this.ring]) { m.castShadow = m.receiveShadow = false; m.frustumCulled = false; }
    this.group.visible = false;
    scene.add(this.group);
    this.target = null;      // { x, z, y?, radius, entity? }
  }
  /** compile the 2 pipelines now (under the start menu), never on the first waypoint's frame */
  async compile(camera) {
    // drawn for a few real frames out of sight (1 km under the camera; frustumCulled is off): its pipelines are built
    // inside the post chain's MRT pass, as they will be used (a compileAsync outside that pass builds a different,
    // invalid variant: its mrtNode would leave the colour struct empty)
    if (this.target) return;
    this.uBeam.value = 0; this.uRing.value = 0;         // (additive, black: nothing shows)
    this.group.visible = true;
    const t0 = performance.now();
    while (performance.now() - t0 < 400 && !this.target) {
      this.group.position.set(camera.position.x, camera.position.y - 1000, camera.position.z);
      await new Promise((r) => requestAnimationFrame(r));
    }
    if (!this.target) this.group.visible = false;
  }
  setColor(hex) { this.uColor.value.set(hex); }
  /** t = { x, z, y (ground, m TAW), radius } or null (hidden) */
  set(t) {
    this.target = t;
    this.group.visible = !!t;
    if (t) {
      this.ring.scale.setScalar(Math.max(2.5, Math.min(40, t.radius || 8)));
      this.group.position.set(t.x, (t.y ?? 0) + 0.15, t.z);
    }
  }
  /** each frame while shown: follow a moving target, fade by the camera's distance */
  update(camPos, x = null, y = null, z = null) {
    if (!this.target) return;
    if (x != null) this.group.position.set(x, y + 0.15, z);
    const p = this.group.position, d = Math.hypot(camPos.x - p.x, camPos.z - p.z);
    const k = Math.min(1, Math.max(0, (d - 20) / 50));     // gone within 20 m (a camera inside the beam would be washed yellow)
    this.uBeam.value = k;
    this.beam.visible = k > 0;
    this.uRing.value = d < 400 ? 0.6 : 0;
    this.ring.visible = d < 400;
  }
}
