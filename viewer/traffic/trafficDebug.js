// DEBUG VIEWS of the traffic: the lane graph (lane pieces blue, their 150 m buffer copies grey, junction connectors
// cyan; arrows every 12 m show the direction), hold points as bars across the lane (signal: its live colour; stop
// sign: magenta; give way: orange; priorité de droite: white; dark = none), and each car's target: a line from its
// nose over the gap IDM uses (green: following a car, orange: an obstacle, red: waiting at a hold point; none =
// free road). Lines are rebuilt only when the graph changes; the hold bars and targets every frame (preallocated).
import * as THREE from "three/webgpu";
import { signalState, signalClock, GREEN, AMBER } from "./signals.js";
import { CTRL } from "./trafficGraph.js";

const LIFT = 0.25;
export class TrafficDebug {
  constructor(scene, ground, cap) {
    this.ground = ground;
    this.group = new THREE.Group(); this.group.name = "traffic-debug";
    scene.add(this.group);
    const mat = new THREE.LineBasicNodeMaterial({ vertexColors: true, depthTest: true, transparent: true, opacity: 0.9 });
    this.mat = mat;
    this.lanes = null; this.version = -1;
    // hold bars: up to 2048 bars (2 vertices each)
    this.holdN = 0;
    this.holdGeo = new THREE.BufferGeometry();
    this.holdPos = new Float32Array(2048 * 6); this.holdCol = new Float32Array(2048 * 6);
    this.holdGeo.setAttribute("position", new THREE.BufferAttribute(this.holdPos, 3));
    this.holdGeo.setAttribute("color", new THREE.BufferAttribute(this.holdCol, 3));
    this.holds = new THREE.LineSegments(this.holdGeo, new THREE.LineBasicNodeMaterial({ vertexColors: true, linewidth: 3 }));
    this.holds.frustumCulled = false;
    this.group.add(this.holds);
    this.holdRef = new Int32Array(2048);    // gid per bar
    // targets
    this.tgtGeo = new THREE.BufferGeometry();
    this.tgtPos = new Float32Array(cap * 6); this.tgtCol = new Float32Array(cap * 6);
    this.tgtGeo.setAttribute("position", new THREE.BufferAttribute(this.tgtPos, 3));
    this.tgtGeo.setAttribute("color", new THREE.BufferAttribute(this.tgtCol, 3));
    this.targets = new THREE.LineSegments(this.tgtGeo, new THREE.LineBasicNodeMaterial({ vertexColors: true }));
    this.targets.frustumCulled = false;
    this.group.add(this.targets);
    this.show = { lanes: true, holds: true, targets: true };
  }
  rebuild(W) {
    if (this.lanes) { this.group.remove(this.lanes); this.lanes.geometry.dispose(); }
    const pos = [], col = [];
    const tmp = new Float64Array(4);
    this.holdN = 0;
    for (const g of W.tiles) {
      for (let i = 0; i < g.paths; i++) {
        const c = g.kind[i] ? [0.2, 0.85, 0.95] : g.core[i] ? [0.25, 0.45, 1.0] : [0.45, 0.45, 0.5];
        for (let k = g.off[i]; k < g.off[i + 1] - 1; k++) {
          const ax = g.xy[k * 2], az = g.xy[k * 2 + 1], bx = g.xy[k * 2 + 2], bz = g.xy[k * 2 + 3];
          pos.push(ax, this.ground(ax, az) + LIFT, az, bx, this.ground(bx, bz) + LIFT, bz);
          col.push(...c, ...c);
        }
        // direction arrows
        const gid = (g.slot << 16) | i;
        for (let s = 6; s < g.len[i] - 2; s += 12) {
          W.point(gid, s, tmp);
          const x = tmp[0], z = tmp[1], tx = tmp[2], tz = tmp[3], y = this.ground(x, z) + LIFT;
          for (const sd of [1, -1]) { pos.push(x, y, z, x - tx * 0.9 + tz * 0.5 * sd, y, z - tz * 0.9 - tx * 0.5 * sd); col.push(...c, ...c); }
        }
        if (g.holdAt[i] >= 0 && this.holdN < 2048) {
          W.point(gid, g.holdAt[i], tmp);
          const x = tmp[0], z = tmp[1], nx = -tmp[3] * 1.5, nz = tmp[2] * 1.5, y = this.ground(x, z) + LIFT + 0.05, o = this.holdN * 6;
          this.holdPos.set([x - nx, y, z - nz, x + nx, y, z + nz], o);
          this.holdRef[this.holdN++] = gid;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.lanes = new THREE.LineSegments(geo, this.mat);
    this.lanes.frustumCulled = false;
    this.group.add(this.lanes);
    this.holdGeo.attributes.position.needsUpdate = true;
    this.holdGeo.setDrawRange(0, this.holdN * 2);
  }
  update(sim, alpha) {
    const W = sim.W;
    if (W.version !== this.version) { this.version = W.version; this.rebuild(W); }
    this.lanes.visible = this.show.lanes; this.holds.visible = this.show.holds; this.targets.visible = this.show.targets;
    if (this.show.holds) {
      const t = signalClock.now();
      for (let n = 0; n < this.holdN; n++) {
        const gid = this.holdRef[n], g = W.slots[gid >>> 16];
        if (!g) continue;
        const i = gid & 0xffff, c = g.ctrl[i];
        let r = 0.2, gg = 0.2, b = 0.2;
        if (c === CTRL.signal) { const s = signalState(g.phase[i], t); if (s === GREEN) { r = 0.1; gg = 1; b = 0.3; } else if (s === AMBER) { r = 1; gg = 0.6; b = 0; } else { r = 1; gg = 0.05; b = 0.05; } }
        else if (c === CTRL.stop) { r = 1; gg = 0; b = 1; }
        else if (c === CTRL.yield) { r = 1; gg = 0.55; b = 0.1; }
        else if (c === CTRL.priority) { r = 0.9; gg = 0.9; b = 0.9; }
        const o = n * 6;
        this.holdCol[o] = this.holdCol[o + 3] = r; this.holdCol[o + 1] = this.holdCol[o + 4] = gg; this.holdCol[o + 2] = this.holdCol[o + 5] = b;
      }
      this.holdGeo.attributes.color.needsUpdate = true;
    }
    if (this.show.targets) {
      let n = 0;
      const a = alpha, b1 = 1 - alpha;
      for (let i = 0; i < sim.cap; i++) {
        if (!sim.alive[i] || !sim.lead[i]) continue;
        const x = sim.px[i] * b1 + sim.x[i] * a, z = sim.pz[i] * b1 + sim.z[i] * a, y = sim.py[i] * b1 + sim.y[i] * a + 1.6;
        const yaw = sim.yaw[i], fx = Math.sin(yaw), fz = Math.cos(yaw), h = sim.half[i], L = Math.min(60, Math.max(0.2, sim.gap[i]));
        const o = n * 6;
        this.tgtPos[o] = x + fx * h; this.tgtPos[o + 1] = y; this.tgtPos[o + 2] = z + fz * h;
        this.tgtPos[o + 3] = x + fx * (h + L); this.tgtPos[o + 4] = y; this.tgtPos[o + 5] = z + fz * (h + L);
        const k = sim.lead[i], cr = k === 3 ? 1 : k === 2 ? 1 : 0.2, cg = k === 3 ? 0.1 : k === 2 ? 0.6 : 1, cb = k === 1 ? 0.3 : 0.05;
        this.tgtCol[o] = this.tgtCol[o + 3] = cr; this.tgtCol[o + 1] = this.tgtCol[o + 4] = cg; this.tgtCol[o + 2] = this.tgtCol[o + 5] = cb;
        n++;
      }
      this.tgtGeo.setDrawRange(0, n * 2);
      this.tgtGeo.attributes.position.needsUpdate = true; this.tgtGeo.attributes.color.needsUpdate = true;
    }
  }
}
