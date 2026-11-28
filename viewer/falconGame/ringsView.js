// THE RING COURSES' VIEW (rule falcon-rings): the rings, the next ring's cue, the arrow to it, the run's HUD, the ghost.
// Budget (node check tools/falconRingsTest.mjs): the rings are ONE InstancedMesh + ONE material, their matrices written
// once per course (a static buffer, rule no-dynamic-draw-usage); the cue is the material's own uniforms (the next
// ring's index, the time: passed rings dim, the next one gold and pulsing, the rest pale); no light (rule
// fixed-light-count); the ghost is ONE static mesh baked once from the v2 falcon's far LOD in its Glide pose
// (models/bird/v2/falcon_v2_far.glb), translucent, moved per frame (no skinning, no per-frame allocation).
import * as THREE from "three/webgpu";
import { uniform, instanceIndex, float, vec3, sin, mix, step, abs } from "three/tsl";

const MAX = 48;
const FAR = new URL("../../models/bird/v2/falcon_v2_far.glb", import.meta.url);

export class RingsView {
  constructor(scene, { doc = globalThis.document } = {}) {
    this.scene = scene;
    this.uNext = uniform(0); this.uTime = uniform(0);
    const i = float(instanceIndex);
    const isNext = step(abs(i.sub(this.uNext)), float(0.5)), passed = step(i.add(0.5), this.uNext);
    const future = vec3(0.78, 0.92, 1.0), next = vec3(1.0, 0.62, 0.12).mul(sin(this.uTime.mul(6)).mul(0.45).add(1.75)), past = vec3(0.16, 0.2, 0.25);
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.colorNode = mix(mix(future, next, isNext), past, passed);
    mat.name = "falcon-rings"; mat.fog = true;
    // (a torus of radius 1 in its x-y plane, the way through it +z: scaled by the ring's r, turned to its way)
    const geo = new THREE.TorusGeometry(1, 0.075, 8, 48);
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.mesh.name = "falcon-rings"; this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.ghost = null; this.ghostOn = false;
    this.rings = [];
    this._v = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._z = new THREE.Vector3(0, 0, 1);
    // the DOM: the arrow to the next ring (off screen: on the edge, pointing), the HUD line
    this.doc = doc;
    if (doc?.createElement) {
      const a = (this.arrow = doc.createElement("div"));
      a.className = "falcon-rings-arrow";
      Object.assign(a.style ?? {}, { position: "fixed", left: "0", top: "0", width: "0", height: "0", borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderBottom: "30px solid #ffc54a", filter: "drop-shadow(0 0 4px rgba(0,0,0,.6))", pointerEvents: "none", zIndex: "30", display: "none" });
      const h = (this.hud = doc.createElement("div"));
      h.className = "falcon-rings-hud";
      Object.assign(h.style ?? {}, { position: "fixed", left: "50%", top: "64px", transform: "translateX(-50%)", padding: "6px 14px", borderRadius: "8px", background: "rgba(12,16,22,.62)", color: "#f3f6fa", font: "600 15px/1.35 system-ui, sans-serif", letterSpacing: ".02em", pointerEvents: "none", zIndex: "30", display: "none", whiteSpace: "nowrap", textAlign: "center" });
      doc.body?.append?.(a, h);
    }
    this.hudText = "";
  }
  /** the course's rings: the matrices written once */
  setCourse(course) {
    const R = (this.rings = course.rings.slice(0, MAX));
    const M = this._m, Q = this._q, S = this._s, P = this._v;
    for (let k = 0; k < R.length; k++) {
      const q = R[k];
      Q.setFromUnitVectors(this._z, P.set(q.nx, q.ny, q.nz).normalize());
      M.compose(P.set(q.x, q.y, q.z), Q, S.setScalar(q.r));
      this.mesh.setMatrixAt(k, M);
    }
    this.mesh.count = R.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = R.length > 0;
    this.uNext.value = 0;
  }
  /** a frame: the next ring's index (its cue), the arrow toward it from the camera's view */
  update(dt, next, camera = null) {
    this.uTime.value = (this.uTime.value + dt) % 1000;
    this.uNext.value = next;
    const a = this.arrow, q = this.rings[next];
    if (!a?.style) return;
    if (!camera || !q || !this.mesh.visible) { if (a.style.display !== "none") a.style.display = "none"; return; }
    // (on screen: no arrow, the gold ring is the cue; behind or off: an arrow on the edge pointing its way)
    const v = this._v.set(q.x, q.y, q.z).applyMatrix4(camera.matrixWorldInverse);
    const behind = v.z > 0;
    v.applyMatrix4(camera.projectionMatrix);
    let x = v.x, y = v.y;
    if (behind) { x = -x; y = -y; }
    const on = !behind && Math.abs(x) < 0.92 && Math.abs(y) < 0.88;
    if (on) { if (a.style.display !== "none") a.style.display = "none"; return; }
    const m = Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.8, 1e-3);
    if (behind && m < 1) { x /= m; y /= m; }
    const ex = Math.max(-0.86, Math.min(0.86, x / Math.max(m, 1))), ey = Math.max(-0.3, Math.min(0.8, y / Math.max(m, 1)));   // (not under the flight HUD at the bottom)
    const W = globalThis.innerWidth || 1280, H = globalThis.innerHeight || 720;
    const px = (ex * 0.5 + 0.5) * W, py = (0.5 - ey * 0.5) * H, ang = Math.atan2(x, y);
    a.style.display = "block";
    a.style.transform = `translate(${(px - 13).toFixed(0)}px, ${(py - 15).toFixed(0)}px) rotate(${ang.toFixed(3)}rad)`;
  }
  /** the HUD line (set only when it changes) */
  text(s) {
    if (!this.hud?.style) return;
    if (s === this.hudText) return;
    this.hudText = s; this.hud.innerHTML = s; this.hud.style.display = s ? "block" : "none";
  }
  /** the ghost mesh: baked once (the v2 far LOD in its Glide pose), or a given geometry (node checks) */
  async loadGhost(geometry = null) {
    if (this.ghost) return this.ghost;
    let geo = geometry;
    if (!geo) {
      try {
        const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js")]);
        const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(FAR.href);
        geo = bakeGlide(g);
      } catch { geo = null; }
      if (!geo) { geo = new THREE.ConeGeometry(0.12, 0.45, 6); geo.rotateX(-Math.PI / 2); }
    }
    const mat = new THREE.MeshBasicNodeMaterial({ color: 0x9ed8ff, transparent: true, opacity: 0.5, depthWrite: false });
    mat.name = "falcon-ghost";
    const m = (this.ghost = new THREE.Mesh(geo, mat));
    m.name = "falcon-ghost"; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.visible = false;
    m.rotation.order = "YXZ";
    this.scene.add(m);
    return m;
  }
  /** the ghost's pose (ghostAt's out), or hidden */
  showGhost(p) {
    const m = this.ghost; if (!m) return;
    const on = !!p?.on;
    if (m.visible !== on) m.visible = on;
    if (!on) return;
    m.position.set(p.x, p.y, p.z);
    m.rotation.set(p.gamma, p.heading, -p.phi, "YXZ");
  }
  hide() {
    this.mesh.visible = false; if (this.ghost) this.ghost.visible = false;
    if (this.arrow?.style) this.arrow.style.display = "none";
    this.text("");
  }
  dispose() {
    this.hide();
    this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh.dispose?.();
    if (this.ghost) { this.scene.remove(this.ghost); this.ghost.geometry.dispose(); this.ghost.material.dispose(); this.ghost = null; }
    this.arrow?.remove?.(); this.hud?.remove?.();
  }
}

/** the far LOD's skinned meshes posed in their Glide clip, baked into one static geometry: 1.05 m span (x), the head
 *  toward -z (heading 0), centred on the body */
function bakeGlide(g) {
  const sk = [];
  g.scene.traverse((o) => { if (o.isSkinnedMesh) sk.push(o); });
  if (!sk.length) return null;
  const clip = g.animations.find((c) => /glide/i.test(c.name));
  if (clip) { const mx = new THREE.AnimationMixer(g.scene); mx.clipAction(clip).play(); mx.update(0); }
  g.scene.updateMatrixWorld(true);
  let n = 0; for (const s of sk) n += s.geometry.attributes.position.count;
  const pos = new Float32Array(n * 3), idx = [];
  const v = new THREE.Vector3();
  let o = 0;
  for (const s of sk) {
    const P = s.geometry.attributes.position, I = s.geometry.index;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); s.applyBoneTransform(i, v); v.applyMatrix4(s.matrixWorld); pos.set([v.x, v.y, v.z], (o + i) * 3); }
    if (I) for (let k = 0; k < I.count; k++) idx.push(I.getX(k) + o); else for (let k = 0; k < P.count; k++) idx.push(k + o);
    o += P.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeBoundingBox();
  const b = geo.boundingBox, c = b.getCenter(new THREE.Vector3()), span = b.max.x - b.min.x;
  geo.translate(-c.x, -c.y, -c.z);
  const head = g.scene.getObjectByName("head");
  if (head) { head.getWorldPosition(v); if (v.z - c.z > 0) geo.rotateY(Math.PI); }
  if (span > 1e-3) geo.scale(1.05 / span, 1.05 / span, 1.05 / span);
  geo.computeVertexNormals();
  return geo;
}
