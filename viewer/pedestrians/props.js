// Props that walk with people (P4): prams pushed by the "pram" family (their baked hands hold the handlebar) and dogs on
// leads. Code-built, instanced (one draw each), placed on the CPU from the person's DRAWN position (crowd.js place()),
// dithered with the person's own pixel share and faded out over 100-120 m.
//   pram  a modern pushchair: an aluminium frame (handlebar, folding side stays, rear legs, front forks), two big rear
//         wheels and two front wheel pairs that ROLL (angle = distance / radius, in the vertex shader), a carrycot
//         (lofted, padded rim) with a folding hood (ribbed shell), a shopping basket, a baby under a blanket; the
//         front castors SWIVEL into turns (angle from the turn rate);
//   dog   three breeds in one geometry (Labrador, small terrier, spaniel; the others collapsed per instance): lofted
//         body, neck, head, muzzle, ears (floppy / upright), tail, two-segment legs with paws; a trot in the vertex
//         shader (diagonal pairs, legs swing about the shoulder / hip with a knee lift, the spine bobs twice a stride and
//         bends sideways, the head bobs), sniffing stops (head down), tail wag; coats by breed with patches.
import * as THREE from "three/webgpu";
import { Fn, attribute, instanceIndex, vec3, float, sin, cos, mix, storage, attributeArray, vertexStage, color, step, abs, max, min, clamp, fract, floor, smoothstep, normalize, cross } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { keepBand } from "../lodFade.js";

const END = 120, ENDW = 20;
const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Set per-vertex attributes (constant over a part) and strip the rest. */
function tag(g, attrs) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
  const n = g.attributes.position.count;
  for (const [k, v] of Object.entries(attrs)) {
    const size = Array.isArray(v) ? v.length : 1, a = new Float32Array(n * size);
    for (let i = 0; i < n; i++) for (let j = 0; j < size; j++) a[i * size + j] = Array.isArray(v) ? v[j] : v;
    g.setAttribute(k, new THREE.BufferAttribute(a, size));
  }
  return g;
}
/** A tube from a to b (radius r, n sides). */
function tube(a, b, r, n = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate((A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2);
}
/** A loft through rings (arrays of THREE.Vector3), optional end caps; smooth normals. */
function loftG(rings, { capStart = true, capEnd = true } = {}) {
  const rows = rings.length, cols = rings[0].length, per = cols + 1, pos = [], idx = [];
  for (const r of rings) for (let j = 0; j < per; j++) { const p = r[j % cols]; pos.push(p.x, p.y, p.z); }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols; j++) { const a = i * per + j; idx.push(a, a + 1, a + per, a + 1, a + per + 1, a + per); }
  const cap = (row, flip) => {
    const s = pos.length / 3, c = new THREE.Vector3();
    rings[row].forEach((p) => { pos.push(p.x, p.y, p.z); c.add(p); }); c.divideScalar(cols); pos.push(c.x, c.y, c.z);
    for (let j = 0; j < cols; j++) { const a = s + j, b = s + ((j + 1) % cols); flip ? idx.push(s + cols, b, a) : idx.push(s + cols, a, b); }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(rows - 1, false);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** A superellipse ring in the x-y plane at z (cross-section of a body along z), centre (cx, cy). */
const ringXY = (z, cx, cy, rx, ry, n, e = 2.4, ryBelow = ry) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a), k = 2 / e;
  return new THREE.Vector3(cx + Math.sign(c) * Math.abs(c) ** k * rx, cy + Math.sign(s) * Math.abs(s) ** k * (s >= 0 ? ry : ryBelow), z);
});
/** A ring around the vertical (x-z) at height y. */
const ringXZ = (y, cx, cz, rx, rz, n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return new THREE.Vector3(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz); });
const doubleSided = (g) => { const f = g.clone(); const I = f.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } f.computeVertexNormals(); return [g, f]; };

// ----------------------------------------------------------------------------------------------- the pram
// origin on the ground under the handlebar's middle, +Z forward (away from the pusher); pid 0 fabric, 1 frame,
// 2 tyres, 3 hubs, 4 basket; axle (y, z, r) on the wheels
function pramGeometry() {
  // every part carries `castor` = (pivot x, pivot z, 1) on the front wheels and their forks (they swivel about a
  // vertical axis there), (0, 0, 0) elsewhere
  const P = [], T = (g, a) => tag(g, { castor: [0, 0, 0], ...a }), frame = (g) => P.push(T(g, { pid: 1, axle: [0, 0, 0] }));
  const R = { y: 0.14, z: 0.26, x: 0.27, r: 0.14 }, F = { y: 0.085, z: 0.86, x: 0.22, r: 0.085 };
  // frame: handlebar, side stays to the fold joint, rear legs, front legs, axles
  frame(tube([-0.25, 0.93, 0], [0.25, 0.93, 0], 0.016, 10));
  for (const s of [-1, 1]) {
    const J = [s * 0.26, 0.5, 0.2];
    frame(tube([s * 0.25, 0.93, 0], J, 0.013));
    frame(tube(J, [s * R.x, R.y, R.z], 0.013));
    // the front leg ends in a castor pivot 3 cm AHEAD of the wheel's axle (the wheel trails it, so it swivels into
    // the direction of travel); the fork below the pivot swivels with the wheels
    frame(tube(J, [s * F.x, F.y + 0.12, F.z + 0.03], 0.013));
    P.push(T(tube([s * F.x, F.y + 0.12, F.z + 0.03], [s * F.x, F.y, F.z], 0.011), { pid: 1, axle: [0, 0, 0], castor: [s * F.x, F.z + 0.03, 1] }));
    frame(tube([s * 0.24, 0.52, 0.32], [s * 0.21, 0.52, 0.9], 0.011));          // carrycot rails
  }
  frame(tube([-R.x, R.y, R.z], [R.x, R.y, R.z], 0.009));
  // wheels: tyre (torus), hub, 5 spokes; rear big, front pairs small
  const wheel = (x, W, isFront, cx = 0) => {
    const castor = isFront ? [cx, F.z + 0.03, 1] : [0, 0, 0];
    const tyre = new THREE.TorusGeometry(W.r - 0.018, 0.018, 8, 22).rotateY(Math.PI / 2).translate(x, W.y, W.z);
    P.push(T(tyre, { pid: 2, axle: [W.y, W.z, W.r], castor }));
    const hub = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10).rotateZ(Math.PI / 2).translate(x, W.y, W.z);
    P.push(T(hub, { pid: 3, axle: [W.y, W.z, W.r], castor }));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU, rr = W.r - 0.03;
      P.push(T(tube([x, W.y, W.z], [x, W.y + Math.sin(a) * rr, W.z + Math.cos(a) * rr], isFront ? 0.004 : 0.005, 4), { pid: 3, axle: [W.y, W.z, W.r], castor }));
    }
  };
  for (const s of [-1, 1]) { wheel(s * R.x, R, false); wheel(s * (F.x - 0.025), F, true, s * F.x); wheel(s * (F.x + 0.025), F, true, s * F.x); }
  // carrycot: a padded boat, open at the top (a rim + a dark inner mattress)
  {
    const zs = [0.27, 0.3, 0.38, 0.5, 0.65, 0.8, 0.92, 0.98, 1.0];
    const prof = (z) => { const t = (z - 0.27) / 0.73; const end = Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 1.6); return 0.35 + 0.65 * Math.min(1, end); };
    const rings = zs.map((z) => ringXY(z, 0, 0.62, 0.19 * prof(z), 0.06, 16, 2.6, 0.12 * prof(z)));
    P.push(T(loftG(rings), { pid: 0, axle: [0, 0, 0] }));
    // padded rim
    const rim = zs.slice(1, -1).map((z) => ringXY(z, 0, 0.685, 0.185 * prof(z), 0.022, 10, 2, 0.022));
    P.push(T(loftG(rim), { pid: 4, axle: [0, 0, 0] }));
  }
  // hood: a ribbed half-shell over the head end (the pusher's side), both faces
  {
    const arcs = [0.27, 0.34, 0.42, 0.5, 0.58].map((z, i) => {
      const r = 0.2 + 0.012 * Math.sin(i * 1.7) ** 2;
      return Array.from({ length: 13 }, (_, k) => { const a = (k / 12) * Math.PI; return new THREE.Vector3(Math.cos(a) * r, 0.68 + Math.sin(a) * r * 0.95, z - 0.02 * Math.sin(a)); });
    });
    const pos = [], idx = [], per = 13;
    arcs.forEach((r) => r.forEach((p) => pos.push(p.x, p.y, p.z)));
    for (let i = 0; i < arcs.length - 1; i++) for (let j = 0; j < 12; j++) { const a = i * per + j; idx.push(a, a + 1, a + per, a + 1, a + per + 1, a + per); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    for (const h of doubleSided(g)) P.push(T(h, { pid: 0, axle: [0, 0, 0] }));
  }
  // basket under the cot
  P.push(T(new THREE.BoxGeometry(0.34, 0.07, 0.42).translate(0, 0.22, 0.55), { pid: 4, axle: [0, 0, 0] }));
  // the baby (polish 2026-11-11): lying in the carrycot, head under the hood (the pusher's end) facing up and out,
  // a knitted bonnet, a blanket over the body up to the chin; pid 5 skin, 6 blanket / bonnet
  {
    const head = new THREE.SphereGeometry(0.056, 16, 12).scale(1, 0.92, 1.05).translate(0, 0.708, 0.37);
    P.push(T(head, { pid: 5, axle: [0, 0, 0] }));
    const bonnet = new THREE.SphereGeometry(0.06, 16, 8, 0, TAU, 0, Math.PI * 0.55).rotateX(-Math.PI * 0.42).translate(0, 0.709, 0.362);
    P.push(T(bonnet, { pid: 6, axle: [0, 0, 0] }));
    // blanket: a soft mound from the chin to the feet (the body and legs under it), its edge tucked into the cot
    const zs = [0.405, 0.415, 0.44, 0.48, 0.53, 0.59, 0.65, 0.71, 0.76, 0.79, 0.8];
    const bump = (z) => { const t = (z - 0.405) / 0.395; return Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.6; };
    const rings = zs.map((z) => ringXY(z, 0, 0.672, 0.035 + 0.1 * bump(z), 0.014 + 0.065 * bump(z) * (1.15 - 0.45 * (z - 0.405) / 0.395), 20, 2.0, 0.004));
    P.push(T(loftG(rings), { pid: 6, axle: [0, 0, 0] }));
  }
  return mergeGeometries(P);
}

// ----------------------------------------------------------------------------------------------- the dogs
// origin on the ground under the middle of the body, +Z forward. Per vertex: breed (0 Labrador, 1 terrier, 2 spaniel),
// part (0 body, 1 neck / head, 2 tail, 3 FL leg, 4 FR, 5 BL, 6 BR, 7 nose / eyes), pivot (y, z) of the leg / tail / head
const BREEDS = [
  // shoulder height, body length, chest radius x / y, head size, muzzle length, ears ("flop" / "up"), leg radius, tail
  { h: 0.56, L: 0.62, rx: 0.13, ry: 0.15, head: 0.1, muzzle: 0.11, ears: "flop", earL: 0.09, leg: 0.032, tail: 0.32, tailUp: 0.1 },
  { h: 0.3, L: 0.38, rx: 0.08, ry: 0.09, head: 0.066, muzzle: 0.06, ears: "button", earL: 0.05, leg: 0.022, tail: 0.11, tailUp: 0.9 },
  { h: 0.42, L: 0.46, rx: 0.1, ry: 0.11, head: 0.08, muzzle: 0.075, ears: "long", earL: 0.14, leg: 0.026, tail: 0.18, tailUp: 0.35 },
];
function dogGeometry() {
  const P = [];
  BREEDS.forEach((b, bi) => {
    const put = (g, part, pivot = [0, 0]) => P.push(tag(g, { breed: bi, part, pivot }));
    const top = b.h + 0.02, cy = top - b.ry, L = b.L;
    // body: rump to chest, deeper chest, a tuck-up at the belly
    const zs = [-L / 2 - 0.02, -L / 2 + 0.04, -L * 0.2, 0, L * 0.22, L / 2 - 0.02, L / 2 + 0.03];
    const sc = [0.45, 0.85, 0.92, 0.88, 1.0, 0.95, 0.55];
    const below = [0.5, 0.75, 0.62, 0.55, 0.9, 1.0, 0.6];
    put(loftG(zs.map((z, i) => ringXY(z, 0, cy, b.rx * sc[i], b.ry * 0.85 * sc[i], 14, 2.2, b.ry * below[i]))), 0);
    // neck + head (pivot at the neck base) + muzzle + nose + eyes + ears
    const nz = L / 2, ny = cy + b.ry * 0.5, hz = nz + b.head * 1.1, hy = ny + b.head * 1.5;
    put(tube([0, ny, nz - 0.02], [0, hy - b.head * 0.3, hz - b.head * 0.4], b.rx * 0.55, 10), 1, [ny, nz]);
    put(new THREE.SphereGeometry(b.head, 14, 10).scale(0.95, 0.95, 1.1).translate(0, hy, hz), 1, [ny, nz]);
    put(loftG([0, 0.5, 1].map((t) => ringXY(hz + b.head * 0.6 + t * b.muzzle, 0, hy - b.head * 0.25 - t * 0.01, b.head * (0.55 - 0.15 * t), b.head * (0.45 - 0.12 * t), 10))), 1, [ny, nz]);
    put(new THREE.SphereGeometry(b.head * 0.17, 8, 6).translate(0, hy - b.head * 0.2, hz + b.head * 0.6 + b.muzzle + 0.005), 7, [ny, nz]);
    for (const s of [-1, 1]) put(new THREE.SphereGeometry(b.head * 0.1, 6, 5).translate(s * b.head * 0.42, hy + b.head * 0.25, hz + b.head * 0.75), 7, [ny, nz]);
    for (const s of [-1, 1]) {
      let ear;
      if (b.ears === "up") ear = new THREE.ConeGeometry(b.earL * 0.45, b.earL, 4).rotateZ(-s * 0.25).translate(s * b.head * 0.55, hy + b.head * 0.95, hz - b.head * 0.1);
      else if (b.ears === "button") ear = new THREE.BoxGeometry(b.earL * 0.9, 0.014, b.earL).translate(0, 0, b.earL * 0.35).rotateX(0.9).rotateZ(-s * 0.35).translate(s * b.head * 0.6, hy + b.head * 0.85, hz + b.head * 0.05);   // folded forward (a Jack Russell)
      else { const len = b.earL; ear = new THREE.BoxGeometry(0.018, len, b.head * 0.7).translate(0, -len / 2, 0).rotateZ(s * 0.18).translate(s * b.head * 0.9, hy + b.head * 0.55, hz - b.head * 0.05); }
      put(ear, 1, [ny, nz]);
    }
    // tail (pivot at the root), tapering, up by tailUp
    const tz = -L / 2 - 0.01, ty = cy + b.ry * 0.55;
    const tailRings = [0, 0.33, 0.66, 1].map((t) => {
      const z = tz - t * b.tail * Math.cos(b.tailUp + t * 0.4), y = ty + t * b.tail * Math.sin(b.tailUp + t * 0.4);
      return ringXZ(0, 0, 0, 1, 1, 6).map((p) => new THREE.Vector3(p.x * b.leg * (0.9 - 0.6 * t), y + p.z * b.leg * (0.9 - 0.6 * t), z));
    });
    put(loftG(tailRings), 2, [ty, tz]);
    // legs: upper (thigh / upper arm, thick) + lower + paw; pivots at the shoulder / hip
    const legs = [[1, L / 2 - 0.07, 3], [-1, L / 2 - 0.07, 4], [1, -L / 2 + 0.08, 5], [-1, -L / 2 + 0.08, 6]];
    for (const [s, z, part] of legs) {
      const x = s * b.rx * 0.62, py = cy - b.ry * 0.2, ky = b.h * 0.45, back = part >= 5;
      put(tube([x, py, z], [x, ky, z + (back ? -0.04 : 0.02)], b.leg * 1.35, 8), part, [py, z]);
      put(tube([x, ky, z + (back ? -0.04 : 0.02)], [x, 0.03, z + (back ? 0.0 : 0.01)], b.leg, 8), part, [py, z]);
      put(new THREE.SphereGeometry(b.leg * 1.25, 8, 6).scale(1, 0.6, 1.4).translate(x, 0.025, z + 0.02), part, [py, z]);
    }
  });
  return mergeGeometries(P);
}

export class Props {
  constructor(scene, { max: cap = 64 } = {}) {
    const mk = (geo, name, nvec, matFn, castShadow) => {
      const data = attributeArray(cap * nvec, "vec4");
      const ro = storage(data.value, "vec4", data.value.count).toReadOnly();
      const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 });
      matFn(m, ro);
      const mesh = new THREE.Mesh(geo, m);
      mesh.name = name; mesh.frustumCulled = false; mesh.count = 0; mesh.castShadow = castShadow; mesh.receiveShadow = true;
      scene.add(mesh);
      return { mesh, data, max: cap, n: 0, nvec };
    };
    const yawTo = (p, P) => { const c = cos(P.w), s = sin(P.w); return vec3(p.x.mul(c).add(p.z.mul(s)), p.y, p.z.mul(c).sub(p.x.mul(s))).add(P.xyz); };
    const rotX = (p, py, pz, a) => {           // rotate (y, z) about (py, pz) by a (positive: the bottom swings forward)
      const y = p.y.sub(py), z = p.z.sub(pz), c = cos(a), s = sin(a);
      return vec3(p.x, y.mul(c).sub(z.mul(s)).add(py), y.mul(s).add(z.mul(c)).add(pz));
    };
    // prams: (x, y, z, yaw), (scale, distance rolled, fade, colour seed), (front castor swivel, -, -, -)
    this.prams = mk(pramGeometry(), "Prams", 3, (m, ro) => {
      const P = vertexStage(ro.element(instanceIndex.mul(3))), Q = ro.element(instanceIndex.mul(3).add(1)), Rv = ro.element(instanceIndex.mul(3).add(2));
      m.positionNode = Fn(() => {
        let p = attribute("position", "vec3").toVar();
        const ax = attribute("axle", "vec3"), isWheel = step(0.001, ax.z);
        p = mix(p, rotX(p, ax.x, ax.y, Q.y.div(max(ax.z, 0.01))), isWheel);      // the wheels roll
        // the front castors swivel about their vertical pivot (after rolling): the angle comes from the turn rate
        const cs = attribute("castor", "vec3"), a = Rv.x.mul(cs.z), c = cos(a), sn = sin(a);
        const lx = p.x.sub(cs.x), lz = p.z.sub(cs.y);
        p = vec3(lx.mul(c).add(lz.mul(sn)).add(cs.x), p.y, lz.mul(c).sub(lx.mul(sn)).add(cs.y));
        return yawTo(p.mul(Q.x), P);
      })();
      const f = vertexStage(ro.element(instanceIndex.mul(3).add(1)).z);
      m.maskNode = keepBand(float(0), f); m.maskShadowNode = keepBand(float(0), f);
      const seed = vertexStage(ro.element(instanceIndex.mul(3).add(1)).w), pid = attribute("pid", "float");
      const fabric = mix(mix(mix(color(0x23324a), color(0x6b2a30), step(0.3, seed)), color(0x6e706c), step(0.55, seed)), mix(color(0xb9a98c), color(0x2c3b2e), step(0.9, seed)), step(0.78, seed));
      const frameCol = mix(color(0x1c1d1f), color(0x9ea2a6), step(0.6, fract(seed.mul(7.3))));
      const skin = mix(mix(color(0xe9c3a8), color(0xb07a58), step(0.62, fract(seed.mul(11.3)))), color(0x6e4630), step(0.85, fract(seed.mul(11.3))));
      const knit = mix(mix(color(0xe7dccb), color(0xb9cde0), step(0.35, fract(seed.mul(5.9)))), color(0xe6b9c1), step(0.7, fract(seed.mul(5.9))));
      m.colorNode = mix(mix(mix(mix(mix(mix(fabric, frameCol, step(0.5, pid)), color(0x111112), step(1.5, pid)), color(0x55585c), step(2.5, pid)), fabric.mul(0.45), step(3.5, pid)), skin, step(4.5, pid)), knit, step(5.5, pid));
      m.roughnessNode = mix(float(0.85), float(0.35), step(0.5, pid).mul(step(pid, 1.5)).add(step(2.5, pid).mul(step(pid, 3.5))));
      m.metalnessNode = mix(float(0), float(0.7), step(0.5, pid).mul(step(pid, 1.5)));
    }, true);
    // dogs: (x, y, z, yaw), (scale, phase, fade, breed), (colour seed, sniff 0..1, gait amplitude 0..1, wag)
    this.dogs = mk(dogGeometry(), "Dogs", 3, (m, ro) => {
      const P = vertexStage(ro.element(instanceIndex.mul(3))), Q = ro.element(instanceIndex.mul(3).add(1)), R = ro.element(instanceIndex.mul(3).add(2));
      m.positionNode = Fn(() => {
        let p = attribute("position", "vec3").toVar();
        const part = attribute("part", "float"), piv = attribute("pivot", "vec2"), breed = attribute("breed", "float");
        const ph = Q.y.mul(TAU), amp = R.z;
        const is = (k) => step(abs(part.sub(k)), 0.1);
        // legs: diagonal pairs (FL with BR, FR with BL) swing about the shoulder / hip; the lower leg lifts in the swing
        const legA = is(3).add(is(6)), legB = is(4).add(is(5)), isLeg = legA.add(legB);
        const s = sin(ph).mul(legA.sub(legB)), c = cos(ph).mul(legA.sub(legB));
        const swing = rotX(p, piv.x, piv.y, s.mul(0.42).mul(amp));
        const lift = max(float(0), c).mul(0.06).mul(amp).mul(clamp(piv.x.sub(p.y).div(max(piv.x, 0.05)), 0, 1));
        p = mix(p, swing.add(vec3(0, lift, 0)), isLeg);
        // spine: bob twice a stride, a slight sideways bend; the head / neck bobs and dips to sniff
        const bob = sin(ph.mul(2).add(0.5)).mul(0.012).mul(amp);
        const bend = sin(ph).mul(0.02).mul(amp).mul(p.z);
        const isHead = is(1).add(is(7));
        const sniff = R.y;
        const headP = rotX(p, piv.x, piv.y, sniff.mul(-0.75).add(sin(ph.mul(2)).mul(0.05).mul(amp)));
        p = mix(p, headP, isHead);
        // tail: wag about its root
        const isTail = is(2), wag = sin(R.w.mul(TAU)).mul(0.5).mul(isTail);
        const tx = p.x, tz = p.z.sub(piv.y);
        p = vec3(mix(tx, tx.mul(cos(wag)).add(tz.mul(sin(wag))), isTail), p.y, mix(p.z, tz.mul(cos(wag)).sub(tx.mul(sin(wag))).add(piv.y), isTail));
        p = vec3(p.x.add(bend.mul(float(1).sub(isLeg))), p.y.add(bob.mul(float(1).sub(isLeg).add(isLeg.mul(0.3)))), p.z);
        // only this dog's breed
        p = p.mul(step(abs(breed.sub(Q.w)), 0.1));
        return yawTo(p.mul(Q.x), P);
      })();
      const f = vertexStage(ro.element(instanceIndex.mul(3).add(1)).z);
      m.maskNode = keepBand(float(0), f); m.maskShadowNode = keepBand(float(0), f);
      // coats by breed: Labrador yellow / black / chocolate; terrier white with tan patches or grey; spaniel liver and
      // white, black and white, golden; patches from the vertex position
      const seed = vertexStage(R.x), breed = attribute("breed", "float"), q = attribute("position", "vec3"), part = attribute("part", "float");
      const lab = mix(mix(color(0xd6b47a), color(0x1c1a19), step(0.45, seed)), color(0x4c3122), step(0.78, seed));
      const terBase = mix(color(0xe9e4da), color(0x8d8a84), step(0.7, seed)), terPatch = mix(color(0xb6844e), color(0x2a2522), step(0.5, fract(seed.mul(5.1))));
      const spBase = color(0xece6dc), spPatch = mix(mix(color(0x6a3a24), color(0x1d1b1a), step(0.4, seed)), color(0xb27a3c), step(0.75, seed));
      const n = sin(q.x.mul(31).add(seed.mul(17))).mul(sin(q.z.mul(23).add(seed.mul(9)))).add(sin(q.y.mul(19).add(q.z.mul(11))).mul(0.5));
      const patch = step(0.15, n);
      const terCol = mix(terBase, terPatch, patch.mul(step(0.3, fract(seed.mul(3.7)))));
      const spCol = mix(spBase, spPatch, max(patch, step(0.8, fract(seed.mul(2.3)))));
      const coat = mix(mix(lab, terCol, step(0.5, breed)), spCol, step(1.5, breed));
      m.colorNode = mix(coat, color(0x0d0c0c), step(abs(part.sub(7)), 0.1));
      m.roughnessNode = mix(float(0.88), float(0.3), step(abs(part.sub(7)), 0.1));
    }, true);
    // leads (polish 2026-11-11): a SAGGING curve, not a straight rod. (hand x, y, z, sag), (collar x, y, z, fade).
    // The tube's height (0..1) is the parameter t along the lead; the centre line is the chord dropped by
    // sag * 4 t (1 - t) (a parabola: the catenary of a light lead with this little slack); its cross-section is built
    // round the curve's tangent.
    this.leashes = mk(new THREE.CylinderGeometry(0.005, 0.005, 1, 5, 14, true).translate(0, 0.5, 0), "Leashes", 2, (m, ro) => {
      const P = vertexStage(ro.element(instanceIndex.mul(2))), Q = vertexStage(ro.element(instanceIndex.mul(2).add(1)));
      m.positionNode = Fn(() => {
        const p = attribute("position", "vec3"), t = p.y;
        const H = P.xyz, C = Q.xyz, d = C.sub(H);
        const c = H.add(d.mul(t)).sub(vec3(0, P.w.mul(4).mul(t).mul(float(1).sub(t)), 0));
        const T = normalize(d.sub(vec3(0, P.w.mul(float(4).sub(t.mul(8))), 0)));
        const side = normalize(cross(T, vec3(0, 1, 0)).add(vec3(1e-4, 0, 0))), up2 = cross(side, T);
        return c.add(side.mul(p.x)).add(up2.mul(p.z));
      })();
      const f = Q.w;
      m.maskNode = keepBand(float(0), f);
      m.colorNode = color(0x7a1e1e);
    }, false);
    this.dogState = new Map();
  }

  /** people: the crowd's list (after crowd.update: p.anim drawn state, p.dist, p.lodMix). dt: seconds. */
  update(people, dt, ground, t = 0) {
    const PR = this.prams, DG = this.dogs, LS = this.leashes;
    PR.n = DG.n = LS.n = 0;
    for (const p of people) {
      if (!p.alive || !p.anim || !(p.pram || p.dog)) { if (p.dog) this.dogState.delete(p.id); continue; }
      const a = p.anim, d = p.dist ?? 1e9;
      const vis = (p.lodMix ? p.lodMix[0] + p.lodMix[1] + p.lodMix[2] : 0) * (1 - smooth(END - ENDW, END, d));
      const fx = Math.sin(a.dyaw), fz = Math.cos(a.dyaw);
      if (p.pram) {
        // the handlebar where the pram family's baked hands are (0.5 m ahead at 0.93 m, scaled with the pusher)
        const S = p.scale, x = a.dx + fx * 0.5 * S, z = a.dz + fz * 0.5 * S;
        const g = (p._pram ||= { roll: 0, x, z, yaw: a.dyaw, sw: 0 });
        const moved = Math.hypot(x - g.x, z - g.z);
        g.roll += moved; g.x = x; g.z = z;
        // castors: the front pivots (0.63 m ahead of the rear axle) move sideways at yawRate x 0.63 while the pram goes
        // forward at v: the wheels trail into that direction (atan2), eased; they keep their angle when stopped
        let dyw = a.dyaw - g.yaw; dyw -= Math.round(dyw / TAU) * TAU; g.yaw = a.dyaw;
        const v = moved / Math.max(dt, 1e-4);
        if (v > 0.05) { const target = Math.max(-1.3, Math.min(1.3, Math.atan2((dyw / Math.max(dt, 1e-4)) * 0.63 * S, v))); g.sw += (target - g.sw) * Math.min(1, dt * 8); }
        if (PR.n < PR.max && vis > 0.001 && p.drawn) write(PR, [x, ground(x, z), z, a.dyaw, S, g.roll / S, vis, (p.seed * 3.7) % 1, g.sw, 0, 0, 0]);
      }
      if (p.dog) {
        // the dog walks ahead-left of its owner on a ~1.5 m lead; it stops to sniff now and then (head down) until the
        // lead is taut, then trots to catch up
        let g = this.dogState.get(p.id);
        const rx = -fz, rz = fx;
        if (!g || g.gen !== p.gen) {
          const u = (p.seed * 5.3) % 1, breed = u < 0.45 ? 0 : u < 0.75 ? 1 : 2;
          g = { x: a.dx + fx * 0.9, z: a.dz + fz * 0.9, yaw: a.dyaw, phase: 0, gen: p.gen, breed, size: 0.9 + ((p.seed * 9.7) % 1) * 0.2, sniff: 0, sniffT: 0, next: t + 4 + ((p.seed * 13.1) % 1) * 8, amp: 0, wag: 0 };
          this.dogState.set(p.id, g);
        }
        const tx = a.dx + fx * 0.9 - rx * 0.5, tz = a.dz + fz * 0.9 - rz * 0.5;
        const lead = Math.hypot(g.x - a.dx, g.z - a.dz);
        if (t > g.next && p.speed > 0.4) { g.sniffT = 1.5 + ((g.next * 7.7) % 1) * 2; g.next = t + 6 + ((g.next * 3.3) % 1) * 10; }
        if (lead > 2.1) g.sniffT = 0;
        g.sniffT = Math.max(0, g.sniffT - dt);
        const sniffing = g.sniffT > 0;
        g.sniff += ((sniffing ? 1 : 0) - g.sniff) * Math.min(1, dt * 5);
        const ex = tx - g.x, ez = tz - g.z, dist = Math.hypot(ex, ez);
        const v = sniffing ? 0 : Math.min(3, dist * 2.4);
        const step = Math.min(dist, v * dt);
        if (dist > 1e-3 && step > 0) { g.x += (ex / dist) * step; g.z += (ez / dist) * step; }
        const want = step > 1e-4 ? Math.atan2(ex, ez) : g.yaw;
        let dy = want - g.yaw; dy -= Math.round(dy / TAU) * TAU; g.yaw += Math.max(-5 * dt, Math.min(5 * dt, dy));
        const B = BREEDS[g.breed], stride = B.h * 1.5 * g.size;              // a trot stride ~1.5 shoulder heights
        g.phase = (g.phase + step / stride) % 1;                             // by distance: the paws do not slide
        g.amp += (Math.min(1, (step / Math.max(dt, 1e-4)) / 0.8) - g.amp) * Math.min(1, dt * 6);
        g.wag = (g.wag + dt * (sniffing ? 1.2 : 2.2)) % 1;
        if (DG.n < DG.max && vis > 0.001 && p.drawn) {
          const y = ground(g.x, g.z);
          write(DG, [g.x, y, g.z, g.yaw, g.size, g.phase, vis, g.breed, (p.seed * 9.1) % 1, g.sniff, g.amp, g.wag]);
          // the lead: from the owner's left hand (approx.) to the collar
          const hx = a.dx + fx * 0.12 - rx * 0.27 * p.scale, hz = a.dz + fz * 0.12 - rz * 0.27 * p.scale, hy = a.dy + 0.8 * p.scale;
          const cl = B.L / 2 + 0.02, cx = g.x + Math.sin(g.yaw) * cl * g.size, cz = g.z + Math.cos(g.yaw) * cl * g.size, cy = y + (B.h + 0.03) * g.size - g.sniff * 0.12 * g.size;
          // sag from the slack: a 1.6 m lead (x the owner's size) over the chord d; a shallow parabola has length
          // d + 8 h^2 / (3 d) -> h = sqrt(3 d slack / 8); a short chord hangs in a V (h -> slack / 2); never below the
          // ground; eased so a lead that goes taut / slack does not snap
          const len = Math.hypot(cx - hx, cy - hy, cz - hz), rope = 1.6 * p.scale, slack = Math.max(0, rope - len);
          const want = Math.min(Math.max(Math.sqrt((3 * len * slack) / 8), slack * 0.5), (hy + cy) / 2 - y - 0.03);
          g.sag = (g.sag ?? want) + (Math.max(0, want) - (g.sag ?? want)) * Math.min(1, dt * 10);
          if (LS.n < LS.max) write(LS, [hx, hy, hz, g.sag, cx, cy, cz, vis]);
        }
      }
    }
    for (const B of [PR, DG, LS]) {
      B.mesh.count = B.n; B.mesh.visible = B.n > 0;
      const attr = B.data.value; attr.clearUpdateRanges(); attr.addUpdateRange(0, Math.max(1, B.n) * B.nvec * 4); attr.needsUpdate = true;
    }
  }
}
function write(B, vals) {
  const A = B.data.value.array, o = B.n * B.nvec * 4;
  for (let i = 0; i < vals.length; i++) A[o + i] = vals[i];
  B.n++;
}
