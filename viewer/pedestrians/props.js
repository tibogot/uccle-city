// Props that walk with people (P4): prams pushed by the "pram" family (their baked hands hold the handle 0.5 m ahead)
// and dogs on leads. Code-built, instanced (one draw each), placed on the CPU from the person's DRAWN position (the
// plant-pinned one, crowd.js place()), dithered with the person's own pixel share and faded out over 100-120 m.
// The dog is a small scripted quadruped: lofted body, head, ears, tail, four legs; a trot in the vertex shader (legs
// swing on diagonal pairs from a per-dog phase that advances with the distance it covers: no sliding), tail wag.
import * as THREE from "three/webgpu";
import { Fn, attribute, instanceIndex, vec3, vec4, float, sin, cos, mix, positionLocal, storage, attributeArray, vertexStage, color, step, abs } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { keepBand } from "../lodFade.js";

const END = 120, ENDW = 20;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function tagged(g, id) { const n = g.attributes.position.count; g.setAttribute("pid", new THREE.BufferAttribute(new Float32Array(n).fill(id), 1)); return g.index ? g.toNonIndexed() : g; }

/** Pram: chassis, bassinet with a hood, four wheels, the handle bar (origin: between the rear wheels, +Z forward). */
function pramGeometry() {
  const parts = [];
  const wheel = (x, z, r) => tagged(new THREE.CylinderGeometry(r, r, 0.035, 14).rotateZ(Math.PI / 2).translate(x, r, z), 1);
  for (const x of [-0.25, 0.25]) parts.push(wheel(x, 0, 0.13), wheel(x, 0.62, 0.1));
  parts.push(tagged(new THREE.BoxGeometry(0.46, 0.03, 0.66).translate(0, 0.2, 0.31), 1));                        // chassis
  parts.push(tagged(new THREE.CapsuleGeometry(0.2, 0.36, 4, 12).rotateX(Math.PI / 2).scale(1.05, 0.85, 1).translate(0, 0.55, 0.32), 0));   // bassinet
  const hood = new THREE.SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1.1).translate(0, 0.62, 0.12);
  parts.push(tagged(hood, 0));
  for (const x of [-0.21, 0.21]) parts.push(tagged(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6).rotateX(-0.65).translate(x, 0.62, -0.12), 1));
  parts.push(tagged(new THREE.CylinderGeometry(0.016, 0.016, 0.46, 8).rotateZ(Math.PI / 2).translate(0, 0.9, -0.3), 1));   // handle
  return mergeGeometries(parts.map((g) => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "pid"].includes(k)) g.deleteAttribute(k); return g; }));
}

/** Dog (a medium dog ~0.45 m at the shoulder, +Z forward, origin on the ground under its middle). Part ids: 0 body,
 *  1 head, 2 tail, 3-6 legs (front left, front right, back left, back right), with the pivot height in `pivot`. */
function dogGeometry() {
  const parts = [];
  const body = new THREE.CapsuleGeometry(0.11, 0.36, 4, 12).rotateX(Math.PI / 2).scale(1, 1.1, 1).translate(0, 0.42, 0);
  parts.push(tagged(body, 0));
  const head = mergeGeometries([
    new THREE.SphereGeometry(0.085, 12, 8).translate(0, 0.56, 0.3),
    new THREE.CapsuleGeometry(0.04, 0.07, 3, 8).rotateX(Math.PI / 2).translate(0, 0.53, 0.39),
    new THREE.ConeGeometry(0.035, 0.08, 6).rotateZ(0.5).translate(-0.05, 0.64, 0.28),
    new THREE.ConeGeometry(0.035, 0.08, 6).rotateZ(-0.5).translate(0.05, 0.64, 0.28),
  ].map((g) => g.toNonIndexed()));
  parts.push(tagged(head, 1));
  parts.push(tagged(new THREE.ConeGeometry(0.025, 0.24, 6).rotateX(-0.9).translate(0, 0.52, -0.3), 2));
  const leg = (x, z, id) => tagged(new THREE.CylinderGeometry(0.028, 0.022, 0.36, 7).translate(x, 0.18, z), id);
  parts.push(leg(0.07, 0.17, 3), leg(-0.07, 0.17, 4), leg(0.07, -0.17, 5), leg(-0.07, -0.17, 6));
  return mergeGeometries(parts.map((g) => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "pid"].includes(k)) g.deleteAttribute(k); return g; }));
}

export class Props {
  constructor(scene, { max = 64 } = {}) {
    // per instance: (x, y, z, yaw), (scale, phase, fadeHi, colour seed)
    const mk = (geo, name, matFn, castShadow) => {
      const data = attributeArray(max * 2, "vec4");
      const ro = storage(data.value, "vec4", data.value.count).toReadOnly();
      const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 });
      matFn(m, ro);
      const mesh = new THREE.Mesh(geo, m);
      mesh.name = name; mesh.frustumCulled = false; mesh.count = 0; mesh.castShadow = castShadow; mesh.receiveShadow = true;
      scene.add(mesh);
      return { mesh, data, max, n: 0 };
    };
    const place = (m, ro, animate) => {
      const P = vertexStage(ro.element(instanceIndex.mul(2)));
      const Q = ro.element(instanceIndex.mul(2).add(1));
      m.positionNode = Fn(() => {
        let p = attribute("position", "vec3").toVar();
        if (animate) p = animate(p, Q);
        p = p.mul(Q.x);
        const c = cos(P.w), s = sin(P.w);
        return vec3(p.x.mul(c).add(p.z.mul(s)), p.y, p.z.mul(c).sub(p.x.mul(s))).add(P.xyz);
      })();
      const f = vertexStage(ro.element(instanceIndex.mul(2).add(1)).z);
      m.maskNode = keepBand(float(0), f);
      m.maskShadowNode = keepBand(float(0), f);
    };
    this.prams = mk(pramGeometry(), "Prams", (m, ro) => {
      place(m, ro, null);
      const seed = vertexStage(ro.element(instanceIndex.mul(2).add(1)).w);
      const pid = attribute("pid", "float");
      const body = mix(mix(mix(color(0x2c3e5c), color(0x7a2a34), step(0.35, seed)), color(0x8a8a86), step(0.6, seed)), color(0xc8b89a), step(0.82, seed));
      m.colorNode = mix(body, color(0x1a1a1c), pid);
    }, true);
    this.dogs = mk(dogGeometry(), "Dogs", (m, ro) => {
      place(m, ro, (p, Q) => {
        // trot: diagonal pairs swing (front-left with back-right); swing about the hip / shoulder (y 0.36)
        const pid = attribute("pid", "float");
        const ph = Q.y.mul(Math.PI * 2);
        const legA = step(abs(pid.sub(3)), 0.1).add(step(abs(pid.sub(6)), 0.1));
        const legB = step(abs(pid.sub(4)), 0.1).add(step(abs(pid.sub(5)), 0.1));
        const ang = sin(ph).mul(legA.sub(legB)).mul(0.45);
        // a shear about the shoulder / hip line (y 0.36): small angles, the foot swings forward and back
        const swung = vec3(p.x, p.y, p.z.add(float(0.36).sub(p.y).mul(sin(ang))));
        const isLeg = legA.add(legB);
        // tail wag
        const tail = step(abs(pid.sub(2)), 0.1);
        const wag = sin(ph.mul(2.0)).mul(0.12).mul(tail);
        return mix(p, swung, isLeg).add(vec3(wag, 0, 0));
      });
      const seed = vertexStage(ro.element(instanceIndex.mul(2).add(1)).w);
      m.colorNode = mix(mix(mix(color(0x3a2a1c), color(0xc9a46a), step(0.35, seed)), color(0x1a1a1a), step(0.65, seed)), color(0xe8e2d6), step(0.85, seed));
    }, true);
    this.leashes = mk(new THREE.CylinderGeometry(0.006, 0.006, 1, 5).translate(0, 0.5, 0), "Leashes", (m, ro) => {
      // a leash: from P.xyz (the hand) to (P.xyz + dir * len): Q.y = len, P.w = yaw, Q.w = pitch
      const P = vertexStage(ro.element(instanceIndex.mul(2)));
      const Q = ro.element(instanceIndex.mul(2).add(1));
      m.positionNode = Fn(() => {
        const p = attribute("position", "vec3").toVar();
        const y = p.y.mul(Q.y);
        // tilt the vertical segment by pitch (from vertical) about x, then yaw
        const cp = cos(Q.w), sp = sin(Q.w);
        const v = vec3(p.x, y.mul(cp).sub(p.z.mul(sp)), y.mul(sp).add(p.z.mul(cp)));
        const c = cos(P.w), s = sin(P.w);
        return vec3(v.x.mul(c).add(v.z.mul(s)), v.y, v.z.mul(c).sub(v.x.mul(s))).add(P.xyz);
      })();
      const f = vertexStage(ro.element(instanceIndex.mul(2).add(1)).z);
      m.maskNode = keepBand(float(0), f);
      m.colorNode = color(0x7a1e1e);
    }, false);
    this.dogState = new Map();
  }

  /** people: the crowd's list (after crowd.update: p.anim drawn state, p.dist, p.lodMix). dt: seconds. */
  update(people, dt, ground) {
    const PR = this.prams, DG = this.dogs, LS = this.leashes;
    PR.n = DG.n = LS.n = 0;
    for (const p of people) {
      if (!p.alive || !p.anim || !(p.pram || p.dog)) { if (p.dog) this.dogState.delete(p.id); continue; }
      const a = p.anim, d = p.dist ?? 1e9;
      const vis = (p.lodMix ? p.lodMix[0] + p.lodMix[1] + p.lodMix[2] : 0) * (1 - smooth(END - ENDW, END, d));
      if (p.pram && PR.n < PR.max && vis > 0.001 && p.drawn) {
        const fx = Math.sin(a.dyaw), fz = Math.cos(a.dyaw), S = p.scale;
        const x = a.dx + fx * 0.42 * S, z = a.dz + fz * 0.42 * S;
        write(PR, x, ground(x, z), z, a.dyaw, 1, 0, vis, (p.seed * 3.7) % 1);
      }
      if (p.dog) {
        // the dog walks ahead-right of its owner on a 1.4 m lead, catches up, stops when the owner stops
        let g = this.dogState.get(p.id);
        const fx = Math.sin(a.dyaw), fz = Math.cos(a.dyaw), rx = -fz, rz = fx;
        const tx = a.dx + fx * 0.9 - rx * 0.55, tz = a.dz + fz * 0.9 - rz * 0.55;
        if (!g || g.gen !== p.gen) { g = { x: tx, z: tz, yaw: a.dyaw, phase: 0, gen: p.gen, size: 0.8 + ((p.seed * 5.3) % 1) * 0.45 }; this.dogState.set(p.id, g); }
        const ex = tx - g.x, ez = tz - g.z, dist = Math.hypot(ex, ez);
        const v = Math.min(2.6, dist * 2.2);
        const step = Math.min(dist, v * dt);
        if (dist > 1e-3) { g.x += (ex / dist) * step; g.z += (ez / dist) * step; }
        if (step > 1e-4) { const want = Math.atan2(ex, ez); let dy = want - g.yaw; dy -= Math.round(dy / (Math.PI * 2)) * Math.PI * 2; g.yaw += Math.max(-5 * dt, Math.min(5 * dt, dy)); }
        g.phase = (g.phase + step / (0.75 * g.size)) % 1;          // a trot stride of 0.75 m at size 1: no sliding
        if (DG.n < DG.max && vis > 0.001 && p.drawn) {
          const y = ground(g.x, g.z);
          write(DG, g.x, y, g.z, g.yaw, g.size, g.phase, vis, (p.seed * 9.1) % 1);
          // the lead: from the owner's left hand (approx.) to the collar
          const hx = a.dx + fx * 0.15 - rx * 0.28 * p.scale, hz = a.dz + fz * 0.15 - rz * 0.28 * p.scale, hy = a.dy + 0.82 * p.scale;
          const cx = g.x + Math.sin(g.yaw) * 0.3 * g.size, cz = g.z + Math.cos(g.yaw) * 0.3 * g.size, cy = y + 0.5 * g.size;
          const lx = cx - hx, ly = cy - hy, lz = cz - hz, len = Math.hypot(lx, ly, lz);
          if (LS.n < LS.max) write(LS, hx, hy, hz, Math.atan2(lx, lz), 1, len, vis, Math.acos(Math.max(-1, Math.min(1, ly / Math.max(len, 1e-4)))));
        }
      }
    }
    for (const B of [PR, DG, LS]) {
      B.mesh.count = B.n; B.mesh.visible = B.n > 0;
      const attr = B.data.value; attr.clearUpdateRanges(); attr.addUpdateRange(0, Math.max(1, B.n) * 8); attr.needsUpdate = true;
    }
  }
}
function write(B, x, y, z, yaw, s, ph, fade, seed) {
  const A = B.data.value.array, o = B.n * 8;
  A[o] = x; A[o + 1] = y; A[o + 2] = z; A[o + 3] = yaw; A[o + 4] = s; A[o + 5] = ph; A[o + 6] = fade; A[o + 7] = seed;
  B.n++;
}
