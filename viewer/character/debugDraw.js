// Debug view of the character: the capsule's wire outline (green on the ground, orange in the air), the last
// step's contacts (point + normal: green ground, red wall, blue ceiling), the camera's collision rays (yellow free,
// red blocked) and the ground normal. Buffers are allocated once; per frame only their numbers change.
import * as THREE from "three/webgpu";

const KIND_RGB = [[0.2, 1, 0.3], [1, 0.25, 0.2], [0.3, 0.55, 1]];

export class CharacterDebug {
  constructor(scene, radius, height) {
    this.group = new THREE.Group(); this.group.name = "character-debug";
    scene.add(this.group);
    this.matWire = new THREE.LineBasicNodeMaterial({ color: 0x5cff7a, depthTest: false, transparent: true });
    this.capsule = new THREE.LineSegments(capsuleWire(radius, height), this.matWire);
    this.capsule.renderOrder = 10; this.capsule.frustumCulled = false;
    this.group.add(this.capsule);
    // contacts + camera rays + ground normal in one dynamic buffer
    this.maxSeg = 32 + 6 + 1;
    const pos = new Float32Array(this.maxSeg * 6), col = new Float32Array(this.maxSeg * 6);
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", this.posAttr); g.setAttribute("color", this.colAttr);
    g.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ vertexColors: true, depthTest: false, transparent: true }));
    this.lines.renderOrder = 11; this.lines.frustumCulled = false;
    this.group.add(this.lines);
    this.show = { capsule: true, contacts: true, rays: true };
    this.visible = false;
  }
  get visible() { return this.group.visible; }
  set visible(v) { this.group.visible = v; }
  setSize(radius, height) { this.capsule.geometry.dispose(); this.capsule.geometry = capsuleWire(radius, height); }

  update(ctl, cam, x, y, z) {
    if (!this.group.visible) return;
    this.capsule.visible = this.show.capsule;
    this.capsule.position.set(x, y, z);
    this.matWire.color.setHex(ctl.grounded ? 0x5cff7a : 0xffa040);
    const P = this.posAttr.array, C = this.colAttr.array;
    let n = 0;
    const seg = (ax, ay, az, bx, by, bz, r, g, b) => {
      const o = n * 6;
      P[o] = ax; P[o + 1] = ay; P[o + 2] = az; P[o + 3] = bx; P[o + 4] = by; P[o + 5] = bz;
      C[o] = C[o + 3] = r; C[o + 1] = C[o + 4] = g; C[o + 2] = C[o + 5] = b; n++;
    };
    if (this.show.contacts) {
      const D = ctl.dbg;
      for (let i = 0; i < ctl.dbgN; i++) {
        const o = i * 7, c = KIND_RGB[D[o + 6]];
        seg(D[o], D[o + 1], D[o + 2], D[o] + D[o + 3] * 0.35, D[o + 1] + D[o + 4] * 0.35, D[o + 2] + D[o + 5] * 0.35, c[0], c[1], c[2]);
      }
      if (ctl.grounded) { const N = ctl.groundN; seg(x, y + 0.01, z, x + N[0] * 0.6, y + 0.01 + N[1] * 0.6, z + N[2] * 0.6, 1, 1, 1); }
    }
    if (this.show.rays && cam) {
      const R = cam.rays;
      for (let i = 0; i < 6; i++) {
        const o = i * 6, hit = cam.rayHit[i];
        // to 85 % of the way (the last bit runs into the eye and would fill the screen)
        const f = i === 0 ? 1 : 0.85;
        seg(R[o], R[o + 1], R[o + 2], R[o] + (R[o + 3] - R[o]) * f, R[o + 1] + (R[o + 4] - R[o + 1]) * f, R[o + 2] + (R[o + 5] - R[o + 2]) * f, 1, hit ? 0.2 : 0.9, 0.2);
      }
    }
    this.lines.geometry.setDrawRange(0, n * 2);
    this.posAttr.needsUpdate = true; this.colAttr.needsUpdate = true;
  }
}

/** The capsule's outline: rings at the sphere centres and the feet / head, four sides, the cap arcs. */
function capsuleWire(r, h) {
  const v = [], N = 24;
  const ring = (y, rr) => { for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2; v.push(Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(b) * rr, y, Math.sin(b) * rr); } };
  ring(r, r); ring(h - r, r); ring(h * 0.5, r);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r; v.push(c, r, s, c, h - r, s); }
  for (let k = 0; k < 2; k++) {
    const ax = k ? 0 : 1, az = k ? 1 : 0;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI, b = (i + 1) / N * Math.PI;
      v.push(Math.cos(a) * r * ax, h - r + Math.sin(a) * r, Math.cos(a) * r * az, Math.cos(b) * r * ax, h - r + Math.sin(b) * r, Math.cos(b) * r * az);
      v.push(Math.cos(a) * r * ax, r - Math.sin(a) * r, Math.cos(a) * r * az, Math.cos(b) * r * ax, r - Math.sin(b) * r, Math.cos(b) * r * az);
    }
  }
  // the facing (+z)
  v.push(0, h - r, 0, 0, h - r, r + 0.25);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  return g;
}
