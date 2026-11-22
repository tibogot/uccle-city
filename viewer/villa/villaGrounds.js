// THE VILLA'S PAVED GROUNDS (procedural JS, the owner's rule for flat parts): the drive through the gate, the forecourt
// along the front, the garage's floor (polished concrete) and the path round the south side, ON the city's own ground:
// each polygon (villa.json grounds, frame u / w) is triangulated, split to <= 0.5 m and draped on groundAt(x, z) (the
// tile's terrain surface, the same 1 m DTM the tile draws) LIFT above it, with a skirt SKIRT down round every edge
// (rule model-meets-ground: no floating rim, no gap). One mesh, one draw; the pattern by zone (attribute _zone):
//   0 drive + forecourt: 60 x 60 cm light concrete pavers, joints, a faint tyre wear on the drive
//   1 garage floor: polished grey concrete, troweled patches
//   const g = buildVillaGrounds({ notes, rootM, groundAt });  scene.add(g.mesh);  g.rings (city rings: plants / grass clear)
import * as THREE from "three/webgpu";
import { attribute, vec2, vec3, float, floor, fract, mix, smoothstep, min, max, fwidth, dot, Fn, positionWorld, abs } from "three/tsl";

export const LIFT = 0.035, SKIRT = 0.2, MAX_EDGE = 0.5;
const ZONES = { drive: 0, forecourt: 0, garage_floor: 1, path_back: 0 };

function subdivide(tris, maxLen) {
  const out = [], stack = [...tris];
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  while (stack.length) {
    const [a, b, c] = stack.pop();
    const ab = d(a, b), bc = d(b, c), ca = d(c, a), m = Math.max(ab, bc, ca);
    if (m <= maxLen) { out.push([a, b, c]); continue; }
    if (m === ab) { const k = mid(a, b); stack.push([a, k, c], [k, b, c]); }
    else if (m === bc) { const k = mid(b, c); stack.push([a, b, k], [a, k, c]); }
    else { const k = mid(c, a); stack.push([a, b, k], [k, b, c]); }
  }
  return out;
}

const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u2 = f.mul(f).mul(float(3).sub(f.mul(2)));
  return mix(mix(hash2(i), hash2(i.add(vec2(1, 0))), u2.x), mix(hash2(i.add(vec2(0, 1))), hash2(i.add(vec2(1, 1))), u2.x), u2.y);
};

export function groundsMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.75 });
  m.name = "villa grounds";
  const zone = attribute("_zone", "float").add(0.5).floor();
  const fu = attribute("_uw", "vec2");
  m.colorNode = Fn(() => {
    const p = fu.toVar();
    const g = p.div(0.6), f = fract(g), c = floor(g);
    const fw = max(fwidth(g.x), 0.002);
    const joint = float(1).sub(smoothstep(0.0, fw.mul(1.5).max(0.03), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)))));
    const h = hash2(c);
    const paver = mix(lin(0xb9b4aa), lin(0xcac5bb), h).mul(vnoise(p.mul(7.0)).mul(0.08).add(0.95));
    const pav = mix(paver, lin(0x6d6a64), joint.mul(0.7));
    const conc = mix(lin(0x8d8c88), lin(0xa3a29d), vnoise(p.mul(0.7))).mul(vnoise(p.mul(11.0)).mul(0.05).add(0.97));
    return mix(pav, conc, zone);
  })();
  m.roughnessNode = mix(float(0.72), float(0.32), zone);
  return m;
}

/** grounds: villa.json grounds ({ name: [[u, w], ...] }), rootM: the villa's local -> world matrix, groundAt(x, z) */
export function buildVillaGrounds({ notes, rootM, groundAt }) {
  const P = [], N = [], Z = [], UW = [], I = [];
  const v = new THREE.Vector3();
  const toWorld = (u, w) => v.set(u, 0, w).applyMatrix4(rootM).clone();
  const rings = [];
  for (const [name, ring] of Object.entries(notes.grounds)) {
    const zone = ZONES[name] ?? 0;
    const contour = ring.map(([u, w]) => new THREE.Vector2(u, w));
    const idx = THREE.ShapeUtils.triangulateShape(contour, []);
    const tris = subdivide(idx.map((t) => t.map((k) => [ring[k][0], ring[k][1]])), MAX_EDGE);
    const key = new Map();
    const vert = (u, w, drop = 0) => {
      const k = `${u.toFixed(4)},${w.toFixed(4)},${drop}`;
      let i = key.get(k);
      if (i != null) return i;
      const p = toWorld(u, w);
      P.push(p.x, groundAt(p.x, p.z) + LIFT - drop, p.z); N.push(0, 1, 0); Z.push(zone); UW.push(u, w);
      i = P.length / 3 - 1; key.set(k, i);
      return i;
    };
    for (const [a, b, c] of tris) {
      // wind counter-clockwise seen from above in WORLD space (the frame (u, w) keeps the city's handedness)
      const ia = vert(a[0], a[1]), ib = vert(b[0], b[1]), ic = vert(c[0], c[1]);
      const ax = P[ia * 3], az = P[ia * 3 + 2], bx = P[ib * 3], bz = P[ib * 3 + 2], cx = P[ic * 3], cz = P[ic * 3 + 2];
      const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);       // y of (b - a) x (c - a)
      if (up >= 0) I.push(ia, ib, ic); else I.push(ia, ic, ib);
    }
    // the skirt: every edge of the ring, split like the surface, down SKIRT, facing out
    const cen = ring.reduce((s, [u, w]) => [s[0] + u / ring.length, s[1] + w / ring.length], [0, 0]);
    const cp = toWorld(cen[0], cen[1]), cx0 = cp.x, cz0 = cp.z;     // (the rings are convex or L-shaped: the centre is inside enough)
    for (let e = 0; e < ring.length; e++) {
      const A = ring[e], B = ring[(e + 1) % ring.length];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.ceil(L / MAX_EDGE));
      for (let k = 0; k < n; k++) {
        const s0 = k / n, s1 = (k + 1) / n;
        const p0 = [A[0] + (B[0] - A[0]) * s0, A[1] + (B[1] - A[1]) * s0], p1 = [A[0] + (B[0] - A[0]) * s1, A[1] + (B[1] - A[1]) * s1];
        const t0 = vert(p0[0], p0[1]), t1 = vert(p1[0], p1[1]), b0 = vert(p0[0], p0[1], SKIRT), b1 = vert(p1[0], p1[1], SKIRT);
        // facing out (rule faces-out): the triangle's normal against the ring centre -> the edge's middle, in world
        const q = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
        const [T0, B0, B1, T1] = [q(t0), q(b0), q(b1), q(t1)];
        const e1 = [B0[0] - T0[0], B0[1] - T0[1], B0[2] - T0[2]], e2 = [B1[0] - T0[0], B1[1] - T0[1], B1[2] - T0[2]];
        const nx = e1[1] * e2[2] - e1[2] * e2[1], nz = e1[0] * e2[1] - e1[1] * e2[0];
        const ox = (T0[0] + T1[0]) / 2 - cx0, oz = (T0[2] + T1[2]) / 2 - cz0;
        if (nx * ox + nz * oz >= 0) I.push(t0, b0, b1, t0, b1, t1); else I.push(t0, b1, b0, t0, t1, b1);
      }
    }
    rings.push(ring.map(([u, w]) => { const p = toWorld(u, w); return [p.x, p.z]; }));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("_zone", new THREE.Float32BufferAttribute(Z, 1));
  g.setAttribute("_uw", new THREE.Float32BufferAttribute(UW, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, groundsMaterial());
  mesh.name = "villa-grounds"; mesh.receiveShadow = true; mesh.castShadow = false;
  return { mesh, rings, tris: I.length / 3 };
}
