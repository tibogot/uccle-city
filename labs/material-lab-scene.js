// Test geometry for the Material Lab (labs/material-lab.js): every face is a real rectangle / grid with normals,
// uv IN METRES (u along the face, v up the face / up the slope / across the floor), aMatVar (per-object variation:
// seed, brightness, warm/cool, age) and aDrip (x0, x1, yTop, on: rain runs off the sill above, in uv metres).
// No coplanar overlapping faces anywhere: things that touch meet at edges or cross through each other.
import * as THREE from "three/webgpu";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const NO_DRIP = [0, 0, -10, 0];

export class GeoBuilder {
  constructor(matVar = [0.5, 0.5, 0.5, 0.5]) { this.p = []; this.n = []; this.uv = []; this.d = []; this.mv = matVar; }
  /** rectangle: origin o, unit axes U, Vv (normal = U x Vv), size w x h, uv origin uv0, drip */
  rect(o, U, Vv, w, h, uv0 = [0, 0], drip = NO_DRIP) {
    const N = new THREE.Vector3().crossVectors(U, Vv).normalize();
    const c = [o.clone(), o.clone().addScaledVector(U, w), o.clone().addScaledVector(U, w).addScaledVector(Vv, h), o.clone().addScaledVector(Vv, h)];
    const t = [[0, 0], [w, 0], [w, h], [0, h]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.p.push(c[i].x, c[i].y, c[i].z); this.n.push(N.x, N.y, N.z);
      this.uv.push(uv0[0] + t[i][0], uv0[1] + t[i][1]); this.d.push(...drip);
    }
    return this;
  }
  /** triangle with explicit uvs (gables) */
  tri(a, b, c, ua, ub, uc) {
    const N = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(p.x, p.y, p.z); this.n.push(N.x, N.y, N.z); this.uv.push(...u); this.d.push(...NO_DRIP); }
    return this;
  }
  /** a vertex with its own normal (curved grids) */
  vtx(p, n, u) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(...u); this.d.push(...NO_DRIP); }
  /** axis-aligned box: 4 sides with u running continuously around the corners (bricks wrap), top, optional bottom */
  box(x0, y0, z0, x1, y1, z1, { top = true, bottom = false, skip = [] } = {}) {
    const w = x1 - x0, d = z1 - z0, h = y1 - y0;
    const sides = [
      ["front", V(x0, y0, z1), V(1, 0, 0), w],
      ["right", V(x1, y0, z1), V(0, 0, -1), d],
      ["back", V(x1, y0, z0), V(-1, 0, 0), w],
      ["left", V(x0, y0, z0), V(0, 0, 1), d],
    ];
    let u = 0;
    for (const [name, o, U, len] of sides) { if (!skip.includes(name)) this.rect(o, U, V(0, 1, 0), len, h, [u, y0]); u += len; }
    if (top) this.rect(V(x0, y1, z1), V(1, 0, 0), V(0, 0, -1), w, d, [x0, -z1]);
    if (bottom) this.rect(V(x0, y0, z0), V(1, 0, 0), V(0, 0, 1), w, d, [x0, z0]);
    return this;
  }
  /** cylinder (tower), u = arc length, v = height; optional top cap */
  cylinder(cx, cz, r, y0, y1, seg = 48, cap = true) {
    const C = 2 * Math.PI * r;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * 2 * Math.PI, a1 = ((i + 1) / seg) * 2 * Math.PI;
      const p = (a, y) => V(cx + Math.sin(a) * r, y, cz + Math.cos(a) * r), n = (a) => V(Math.sin(a), 0, Math.cos(a));
      const u0 = (i / seg) * C, u1 = ((i + 1) / seg) * C;
      for (const [a, y, u] of [[a0, y0, u0], [a1, y0, u1], [a1, y1, u1], [a0, y0, u0], [a1, y1, u1], [a0, y1, u0]]) this.vtx(p(a, y), n(a), [u, y]);
      if (cap) for (const [a, c] of [[null, 1], [a0, 0], [a1, 0]]) {
        const q = a === null ? V(cx, y1, cz) : p(a, y1);
        this.vtx(q, V(0, 1, 0), [q.x, -q.z]);
      }
    }
    return this;
  }
  /** dome (hemisphere) on y0: u = arc length at the base circle, v = meridian length */
  dome(cx, cz, r, y0, seg = 48, rings = 16) {
    const P = (a, t) => V(cx + Math.sin(a) * Math.cos(t) * r, y0 + Math.sin(t) * r, cz + Math.cos(a) * Math.cos(t) * r);
    const Nn = (a, t) => V(Math.sin(a) * Math.cos(t), Math.sin(t), Math.cos(a) * Math.cos(t));
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * 2 * Math.PI, a1 = ((i + 1) / seg) * 2 * Math.PI, t0 = (j / rings) * Math.PI / 2, t1 = ((j + 1) / rings) * Math.PI / 2;
      const q = (a, t) => [P(a, t), Nn(a, t), [a * r, t * r]];
      for (const [p, n, u] of [q(a0, t0), q(a1, t0), q(a1, t1), q(a0, t0), q(a1, t1), q(a0, t1)]) this.vtx(p, n, u);
    }
    return this;
  }
  /** gable roof prism, ridge along x, eaves at y0, depth z0..z1, pitch deg */
  roof(x0, x1, z0, z1, y0, pitch = 40, { gables = true } = {}) {
    const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, rh = half * Math.tan(pitch * Math.PI / 180), sl = Math.hypot(half, rh);
    const up = V(0, rh, -half).normalize(), upB = V(0, rh, half).normalize();
    this.rect(V(x0, y0, z1), V(1, 0, 0), up, x1 - x0, sl, [x0, 0]);                       // front slope (v up the slope)
    this.rect(V(x1, y0, z0), V(-1, 0, 0), upB, x1 - x0, sl, [-x1, 0]);                    // back slope
    if (gables) {
      this.tri(V(x0, y0, z0), V(x0, y0, z1), V(x0, y0 + rh, zc), [z0, y0], [z1, y0], [zc, y0 + rh]);
      this.tri(V(x1, y0, z1), V(x1, y0, z0), V(x1, y0 + rh, zc), [-z1, y0], [-z0, y0], [-zc, y0 + rh]);
    }
    return { ridge: y0 + rh };
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("aDrip", new THREE.Float32BufferAttribute(this.d, 4));
    const n = this.p.length / 3, mv = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) mv.set(this.mv, i * 4);
    g.setAttribute("aMatVar", new THREE.BufferAttribute(mv, 4));
    g.computeBoundingSphere();
    return g;
  }
}

/** A wall W wide, H high, D deep, front at z = 0 facing +z, centred on x = cx, with a window opening (ow x oh at
 *  sill height sy, reveal through the wall) and a projecting sill; the sill drips onto the wall below it. */
export function wallWithWindow(b, { cx = 0, W = 4, H = 6, D = 0.4, ow = 1.2, oh = 1.6, sy = 1.0, base = -0.1 } = {}) {
  const x0 = cx - W / 2, ox0 = cx - ow / 2, ox1 = cx + ow / 2, top = sy + oh;
  const drip = [ox0 - x0 - 0.1, ox1 - x0 + 0.1, sy - 0.06, 1];
  const X = V(1, 0, 0), Y = V(0, 1, 0);
  b.rect(V(x0, base, 0), X, Y, ox0 - x0, H - base, [0, base], drip);
  b.rect(V(ox1, base, 0), X, Y, x0 + W - ox1, H - base, [ox1 - x0, base], drip);
  b.rect(V(ox0, base, 0), X, Y, ow, sy - base, [ox0 - x0, base], drip);
  b.rect(V(ox0, top, 0), X, Y, ow, H - top, [ox0 - x0, top], drip);
  // reveals
  b.rect(V(ox0, sy, 0), V(0, 0, -1), Y, D, oh, [0, sy]);                                  // left jamb, faces +x
  b.rect(V(ox1, sy, -D), V(0, 0, 1), Y, D, oh, [0, sy]);                                  // right jamb, faces -x
  b.rect(V(ox0, top, -D), X, V(0, 0, 1), ow, D, [ox0 - x0, 0]);                            // soffit, faces -y
  b.rect(V(ox0, sy, 0), X, V(0, 0, -1), ow, D, [ox0 - x0, 0]);                             // reveal floor, faces +y
  // back, ends, top
  b.rect(V(x0 + W, base, -D), V(-1, 0, 0), Y, W, H - base, [0, base]);
  b.rect(V(x0, base, -D), V(0, 0, 1), Y, D, H - base, [0, base]);
  b.rect(V(x0 + W, base, 0), V(0, 0, -1), Y, D, H - base, [0, base]);
  b.rect(V(x0, H, 0), X, V(0, 0, -1), W, D, [x0, 0]);
  return { ox0, ox1, sy, top, D };
}

/** a sill: projecting box under an opening (no back face: it sits against the wall) */
export function sill(b, x0, x1, y0, y1, z1) {
  b.box(x0, y0, 0, x1, y1, z1, { bottom: true, skip: ["back"] });
}
