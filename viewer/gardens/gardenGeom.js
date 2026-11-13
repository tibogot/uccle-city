// THE BOXY FRONT-GARDEN PIECES, procedural (the owner's rule: boxy items in JS, the ironwork in Blender:
// tools/blender/gardenKit.py). Every piece in three LODs, flat normals on flat faces (no shared vertex across a hard
// edge), chamfers as their own facets, quads split along their short diagonal. Attributes: position, normal, slot
// (= slot index + 0.99 x per-vertex AO: the contact darkening at the ground line and under a coping's overhang).
// Local frame: x along the run, y up, z toward the street; origin on the base line.
//   wall    unit box x 0..1 (stretched to the segment, sheared to its slope), y -0.6..1 (scaled to the body height: the
//           0.6 x h below the base line is the footing, JOINS), z +-0.125 (a 25 cm wall: one and a half bricks)
//   cap     the coping, x 0..1 (stretched + sheared like the wall), not scaled in height: slab (blue stone / concrete,
//           32 cm, 8 cm, chamfered top edges, a drip line) or saddle (concrete, pitched); y 0 = the wall's top
//   pillar  0.36 x 0.36 brick pier, y -0.4..1 scaled to its height (the footing again)
//   pcap    the pier's cap: a 46 cm slab with a low pyramid (blue stone / concrete), y 0 = the pier's top
import * as THREE from "three/webgpu";

export const SLOT = { brick: 0, stone: 1, iron_paint: 2, iron_tip: 3, steel_dark: 4 };
export const WALL_T = 0.25, CAP_W = 0.32, CAP_T = 0.08, PILLAR_W = 0.36, PCAP_W = 0.46;

class Builder {
  constructor() { this.P = []; this.N = []; this.S = []; this.I = []; }
  /** a planar polygon (CCW seen from outside), its own vertices (flat normal), slot + ao per vertex */
  poly(pts, slot, ao) {
    const a = new THREE.Vector3(...pts[0]), b = new THREE.Vector3(...pts[1]), c = new THREE.Vector3(...pts[2]);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (pts.length > 3 && n.lengthSq() < 1e-12) n.subVectors(c, a).cross(new THREE.Vector3(...pts[3]).sub(a));
    n.normalize();
    const base = this.P.length / 3;
    pts.forEach((p, k) => { this.P.push(p[0], p[1], p[2]); this.N.push(n.x, n.y, n.z); this.S.push(slot + 0.99 * Math.min(1, Math.max(0, typeof ao === "function" ? ao(p) : ao)) * 0.999); });
    if (pts.length === 4) {
      // split along the shorter diagonal (no long slivers)
      const d02 = Math.hypot(pts[0][0] - pts[2][0], pts[0][1] - pts[2][1], pts[0][2] - pts[2][2]);
      const d13 = Math.hypot(pts[1][0] - pts[3][0], pts[1][1] - pts[3][1], pts[1][2] - pts[3][2]);
      if (d02 <= d13) this.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else this.I.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
    } else for (let k = 1; k < pts.length - 1; k++) this.I.push(base, base + k, base + k + 1);
  }
  /** a prism: a closed CCW profile in the (z, y) plane (seen from +x) extruded along x from x0 to x1; caps optional */
  extrudeX(profile, x0, x1, slot, ao, caps = true) {
    const n = profile.length;
    for (let k = 0; k < n; k++) {
      const [z0, y0] = profile[k], [z1, y1] = profile[(k + 1) % n];
      this.poly([[x0, y0, z0], [x0, y1, z1], [x1, y1, z1], [x1, y0, z0]], slot, ao);
    }
    if (caps) {
      this.poly(profile.map(([z, y]) => [x1, y, z]), slot, ao);
      this.poly(profile.slice().reverse().map(([z, y]) => [x0, y, z]), slot, ao);
    }
  }
  /** an axis box split by horizontal rings at `ys` (the AO lives on the ring vertices); no bottom face */
  box(x0, x1, y0, y1, z0, z1, slot, ao, ys = [], top = true) {
    const Y = [y0, ...ys.filter((y) => y > y0 && y < y1), y1];
    for (let k = 0; k < Y.length - 1; k++) {
      const a = Y[k], b = Y[k + 1];
      this.poly([[x0, a, z1], [x1, a, z1], [x1, b, z1], [x0, b, z1]], slot, ao);       // +z
      this.poly([[x1, a, z0], [x0, a, z0], [x0, b, z0], [x1, b, z0]], slot, ao);       // -z
      this.poly([[x1, a, z1], [x1, a, z0], [x1, b, z0], [x1, b, z1]], slot, ao);       // +x
      this.poly([[x0, a, z0], [x0, a, z1], [x0, b, z1], [x0, b, z0]], slot, ao);       // -x
    }
    if (top) this.poly([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], slot, ao);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute("slot", new THREE.Float32BufferAttribute(this.S, 1));
    g.setIndex(this.P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingBox(); g.computeBoundingSphere();
    g.userData.shared = true;
    return g;
  }
}

// contact AO: dark at the ground line, open 25 cm up (in the unit y of a scaled piece: the ring at 0 and 0.25)
const groundAO = (p) => (p[1] <= 0.001 ? 0.55 : p[1] < 0.3 ? 0.82 : 1.0);

function wall(lod) {
  const B = new Builder(), t = WALL_T / 2;
  // the body; LOD0 / 1: rings at the ground line and 0.25 (AO); the top is under the coping (no top face)
  B.box(0, 1, -0.6, 1, -t, t, SLOT.brick, groundAO, lod < 2 ? [0, 0.25] : [], false);
  return B.geometry();
}

function cap(kind, lod) {
  const B = new Builder(), w = CAP_W / 2, T = CAP_T;
  let prof;
  if (kind === "slab") {
    const c = lod === 0 ? 0.012 : 0, d = lod === 0 ? 0.004 : 0;
    // CCW in (z, y) seen from +x: bottom (with the drip edge) .. top chamfers
    prof = lod === 0
      ? [[-w + d, 0], [w - d, 0], [w, d], [w, T - c], [w - c, T], [-w + c, T], [-w, T - c], [-w, d]]
      : [[-w, 0], [w, 0], [w, T], [-w, T]];
    // the underside between the overhangs sits on the wall: no face needed there, but the overhang soffits are seen
  } else {
    const r = lod === 0 ? 0.006 : 0;
    prof = lod === 0
      ? [[-w + r, 0], [w - r, 0], [w, r], [w, 0.05], [0, 0.11], [-w, 0.05], [-w, r]]
      : [[-w, 0], [w, 0], [w, 0.05], [0, 0.11], [-w, 0.05]];
  }
  // AO: the soffit under the overhang darker; the top open
  const ao = (p) => (p[1] < 0.01 ? 0.6 : 1.0);
  B.extrudeX(prof, 0, 1, SLOT.stone, ao, true);
  return B.geometry();
}

function pillar(lod) {
  const B = new Builder(), w = PILLAR_W / 2;
  B.box(-w, w, -0.4, 1, -w, w, SLOT.brick, groundAO, lod < 2 ? [0, 0.25] : [], false);
  return B.geometry();
}

function pcap(lod) {
  const B = new Builder(), w = PCAP_W / 2, T = 0.065, p = 0.2, top = 0.15;
  const ao = (q) => (q[1] < 0.005 ? 0.6 : 1.0);
  if (lod < 2) {
    const c = lod === 0 ? 0.01 : 0;
    // the slab: a chamfered square plate (the 4 sides as bands, chamfers as their own facets)
    const ring = (y, s) => [[s, y, s], [-s, y, s], [-s, y, -s], [s, y, -s]];
    const R0 = ring(0, w), R1 = ring(T - c, w), R2 = ring(T, w - c);
    const band = (A, Bq) => { for (let k = 0; k < 4; k++) B.poly([A[k], A[(k + 1) % 4], Bq[(k + 1) % 4], Bq[k]].map((q) => q).reverse(), SLOT.stone, ao); };
    band(R0, R1); if (c) band(R1, R2);
    B.poly(R0.slice(), SLOT.stone, ao);                          // the soffit (seen from below the overhang)
    // the pyramid on the slab: from a 0.4 square at T to the apex
    const RP = ring(T, p), apex = [0, top, 0];
    // the plate's top margin outside the pyramid (a flat ring: 4 trapezoids)
    for (let k = 0; k < 4; k++) B.poly([R2[k], RP[k], RP[(k + 1) % 4], R2[(k + 1) % 4]].reverse(), SLOT.stone, 1);
    for (let k = 0; k < 4; k++) B.poly([RP[k], apex, RP[(k + 1) % 4]].reverse(), SLOT.stone, 1);
  } else {
    B.box(-w, w, 0, T, -w, w, SLOT.stone, 1, [], true);
    const RP = [[p, T, p], [-p, T, p], [-p, T, -p], [p, T, -p]], apex = [0, top, 0];
    for (let k = 0; k < 4; k++) B.poly([RP[k], apex, RP[(k + 1) % 4]].reverse(), SLOT.stone, 1);
  }
  return B.geometry();
}

/** { wall, cap_slab, cap_saddle, pillar, pcap }: each [lod0, lod1, lod2] */
export function boxyPieces() {
  const L = (f) => [0, 1, 2].map(f);
  return { wall: L(wall), cap_slab: L((l) => cap("slab", l)), cap_saddle: L((l) => cap("saddle", l)), pillar: L(pillar), pcap: L(pcap) };
}
