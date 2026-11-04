// Debug lines for the drive colliders: every collider near the car (buildings yellow, kerb islands cyan, trunks green,
// lamp posts / bollards magenta), the car's box (white, red while touching) and the last impact normal. One
// LineSegments, refilled a few times a second (only while it is shown).
import * as THREE from "three/webgpu";
import { gather, KIND } from "./colliders.js";
import { BODY } from "./carPhysics.js";

const COLORS = { [KIND.building]: [1, 0.85, 0.2], [KIND.island]: [0.2, 0.9, 1], [KIND.tree]: [0.3, 1, 0.3], [KIND.lamp]: [1, 0.3, 1], [KIND.post]: [1, 0.3, 1], [KIND.wall]: [1, 0.6, 0.2] };
const MAX = 60000;

export class ColliderDebug {
  constructor(scene) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 3);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ vertexColors: true, depthTest: false, transparent: true }));
    this.lines.frustumCulled = false; this.lines.renderOrder = 999; this.lines.visible = false;
    scene.add(this.lines);
    this.near = []; this.frame = 0;
  }
  set visible(v) { this.lines.visible = v; }
  get visible() { return this.lines.visible; }

  /** sets(x, z, r) -> collider sets; ground(x, z); c = car state; touching = contacts this frame */
  update(sets, ground, c, touching, radius = 40) {
    if (!this.lines.visible) return;
    if (this.frame++ % 4) return;
    let n = 0;
    const P = this.pos, C = this.col;
    const seg = (ax, ay, az, bx, by, bz, rgb) => {
      if (n + 2 > MAX) return;
      P.set([ax, ay, az, bx, by, bz], n * 3); C.set(rgb, n * 3); C.set(rgb, n * 3 + 3); n += 2;
    };
    this.near.length = 0;
    for (const col of sets(c.x, c.z, radius)) gather(col, c.x, c.z, radius, this.near);
    for (let k = 0; k < this.near.length; k += 2) {
      const col = this.near[k], id = this.near[k + 1];
      if (id < col.P) {
        const rgb = COLORS[col.pkind[id]] || [1, 1, 1], h = col.pkind[id] === KIND.island ? 0.5 : 2.5;
        for (let r = col.polyRing[id]; r < col.polyRing[id + 1]; r++) {
          const s = col.ringStart[r], e = col.ringStart[r + 1];
          for (let i = s, j = e - 1; i < e; j = i++) {
            const ax = col.pts[j * 2], az = col.pts[j * 2 + 1], bx = col.pts[i * 2], bz = col.pts[i * 2 + 1];
            const ya = ground(ax, az), yb = ground(bx, bz);
            seg(ax, ya + 0.05, az, bx, yb + 0.05, bz, rgb);
            seg(ax, ya + h, az, bx, yb + h, bz, rgb);
            seg(ax, ya + 0.05, az, ax, ya + h, az, rgb);
          }
        }
      } else {
        const q = (id - col.P) * 3, x = col.circ[q], z = col.circ[q + 1], r = col.circ[q + 2], rgb = COLORS[col.ckind[id - col.P]] || [1, 1, 1];
        const y = ground(x, z);
        for (let s = 0; s < 12; s++) {
          const a0 = s / 12 * Math.PI * 2, a1 = (s + 1) / 12 * Math.PI * 2;
          seg(x + Math.cos(a0) * r, y + 0.1, z + Math.sin(a0) * r, x + Math.cos(a1) * r, y + 0.1, z + Math.sin(a1) * r, rgb);
          seg(x + Math.cos(a0) * r, y + 1.2, z + Math.sin(a0) * r, x + Math.cos(a1) * r, y + 1.2, z + Math.sin(a1) * r, rgb);
        }
        seg(x, y, z, x, y + 1.6, z, rgb);
      }
    }
    // the car's box
    const sn = Math.sin(c.heading), cs = Math.cos(c.heading), rgb = touching ? [1, 0.2, 0.2] : [1, 1, 1];
    const corner = (u, v) => [c.x + cs * u + sn * v, c.z - sn * u + cs * v];
    const cs4 = [corner(-BODY.hx, -BODY.hz), corner(BODY.hx, -BODY.hz), corner(BODY.hx, BODY.hz), corner(-BODY.hx, BODY.hz)];
    for (let i = 0; i < 4; i++) {
      const a = cs4[i], b = cs4[(i + 1) % 4];
      seg(a[0], c.y + 0.3, a[1], b[0], c.y + 0.3, b[1], rgb);
      seg(a[0], c.y + 1.2, a[1], b[0], c.y + 1.2, b[1], rgb);
    }
    const h = c.lastHit;
    if (h && performance.now() - h.t < 1500) seg(h.x, c.y + 0.8, h.z, h.x + h.nx * 3, c.y + 0.8, h.z + h.nz * 3, [1, 0.2, 0.2]);
    this.lines.geometry.setDrawRange(0, n);
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.attributes.color.needsUpdate = true;
    this.count = this.near.length / 2;
  }
}
