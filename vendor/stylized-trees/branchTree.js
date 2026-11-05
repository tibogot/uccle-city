// BRANCH-FIRST TREES for the off-road world (2026-11-01, your references: Genshin-style broadleaves — "different
// trees and different trunk shapes"). What they share, and what the first crown-shell tree missed:
//   - the tree is BUILT FROM ITS BRANCHES: a thick, CURVED, tapering trunk with a root flare, limbs bending out and
//     up (or out and level), sub-branches
//   - the leaves are separate PADS AT THE BRANCH TIPS, with sky and branches visible between them
//   - one continuous bark mesh (the limbs grow out of the trunk, no stuck-on cylinders)
// This file grows the skeleton, sweeps the bark, and hands the pads to the engine's stylized trees
// (v3/fog-lab/stylizedTrees.js: leaf cards per pad, each pad a lit dome, LODs) as a `shape`.
//
// STYLES  broad    low fork, limbs spreading wide — the meadow oak
//         tall     a long trunk, a high fork, a narrower crown
//         leaning  a trunk bent to one side, long near-level limbs, flat pads — the bonsai-like one
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const TREE_STYLES = {
  broad: { trunkH: [2.6, 3.6], trunkR: 0.5, lean: 0.35, bend: 0.6, limbs: [3, 4], limbLen: [3.6, 5.0], limbUp: [0.45, 0.85],
    subs: [2, 3], subLen: [1.8, 2.8], padR: [1.9, 2.5], pads: "tips", flatPad: 1.0 },
  tall: { trunkH: [4.5, 5.8], trunkR: 0.42, lean: 0.25, bend: 0.5, limbs: [3, 4], limbLen: [2.6, 3.6], limbUp: [0.75, 1.15],
    subs: [2, 3], subLen: [1.5, 2.3], padR: [1.7, 2.2], pads: "tips", flatPad: 1.0 },
  leaning: { trunkH: [3.0, 3.8], trunkR: 0.55, lean: 1.4, bend: 1.2, limbs: [3, 4], limbLen: [4.0, 5.6], limbUp: [0.12, 0.4],
    subs: [2, 3], subLen: [1.8, 2.8], padR: [1.6, 2.1], pads: "tips", flatPad: 0.6 },
};

/** a curved branch: points of a quadratic Bezier, start → end, bowed by `bow` */
function curve(a, b, bow, n) {
  const pts = [];
  const mid = a.clone().lerp(b, 0.5).add(bow);
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push(a.clone().multiplyScalar(u * u).add(mid.clone().multiplyScalar(2 * u * t)).add(b.clone().multiplyScalar(t * t)));
  }
  return pts;
}

/**
 * Grow one tree. Returns the `shape` the stylized trees want: { crown, rad, clumps (pads; the last = the core),
 * cards, cardScale, trunk(lod) }.
 */
export function branchShape(styleName) {
  const S = TREE_STYLES[styleName];
  return (r) => {
    const rr = (a, b) => a + (b - a) * r();
    const branches = [];   // { pts, r0, r1, level }
    const pads = [];
    // the trunk: from below the ground, curved (lean + a bow), to the fork
    const ang = r() * Math.PI * 2;
    const dir = V(Math.cos(ang), 0, Math.sin(ang));
    const h = rr(...S.trunkH);
    const top = V(dir.x * S.lean * h * 0.35, h, dir.z * S.lean * h * 0.35);
    const bow = dir.clone().multiplyScalar(-S.bend * 0.4).add(V(0, 0, 0));
    const trunk = curve(V(0, -0.5, 0), top, bow, 8);
    branches.push({ pts: trunk, r0: S.trunkR, r1: S.trunkR * 0.72, level: 0, flare: true });
    // the limbs from the fork, spread round, bending out and up
    const nL = Math.round(rr(...S.limbs));
    const a0 = r() * Math.PI * 2;
    const tips = [];
    for (let i = 0; i < nL; i++) {
      const a = a0 + (i / nL) * Math.PI * 2 + (r() - 0.5) * 0.7;
      // a leaning tree's limbs go mostly the way it leans
      const out = V(Math.cos(a), 0, Math.sin(a));
      if (styleName === "leaning") out.lerp(dir, 0.45).normalize();
      const len = rr(...S.limbLen);
      const up = rr(...S.limbUp);
      const from = trunk[8 - (i % 2)].clone();   // (two fork heights: not every limb from one point)
      const to = from.clone().add(out.clone().multiplyScalar(len)).add(V(0, len * up, 0));
      const pts = curve(from, to, V(0, len * 0.18, 0).add(out.clone().multiplyScalar(-len * 0.12)), 6);
      branches.push({ pts, r0: S.trunkR * 0.62, r1: S.trunkR * 0.3, level: 1 });
      // sub-branches from the outer half of the limb
      const nS = Math.round(rr(...S.subs));
      for (let k = 0; k < nS; k++) {
        const at = pts[3 + Math.min(3, k + Math.floor(r() * 2))].clone();
        const sa = a + (r() - 0.5) * 2.0;
        const sOut = V(Math.cos(sa), 0, Math.sin(sa));
        const sl = rr(...S.subLen);
        const sto = at.clone().add(sOut.multiplyScalar(sl)).add(V(0, sl * (up * 0.8 + 0.25), 0));
        const sp = curve(at, sto, V(0, sl * 0.12, 0), 4);
        branches.push({ pts: sp, r0: S.trunkR * 0.26, r1: S.trunkR * 0.1, level: 2 });
        tips.push(sto);
      }
      tips.push(to);
    }
    // a PAD at each tip, lifted a little (the leaves sit on and above the twig ends)
    for (const t of tips) {
      const pr = rr(...S.padR);
      pads.push({ c: t.clone().add(V(0, pr * 0.35, 0)), r: pr });
    }
    // crown frame (for the shading's ellipsoid and the height ramp): the pads' bounds
    const bb = new THREE.Box3();
    for (const p of pads) bb.expandByPoint(p.c.clone().addScalar(p.r)).expandByPoint(p.c.clone().addScalar(-p.r));
    const crown = bb.getCenter(new THREE.Vector3());
    const rad = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    rad.y *= S.flatPad;
    // a small core pad at the fork's top (fills the hole seen from below the crown)
    pads.push({ c: crown.clone().lerp(top, 0.4), r: 1.6 });
    return {
      crown, rad, clumps: pads,
      cards: [20, 7, 3], cardScale: 0.62,
      // [uccle-city CHANGES.md #9] LOD 1 keeps 9 sides (6 changed the trunk's outline at 40 m, a pop) and drops
      // the sub-branches the material has shrunk onto their axis by then; LOD 2 (120 m+, a trunk of a few
      // pixels) 6 sides
      trunk: (lod) => barkMesh(branches.filter((b) => b.level <= [2, 1, 1][lod]), [9, 9, 6][lod]),
    };
  };
}

/** One bark mesh: each branch swept along its curve (parallel-transported rings, tapering radius, a root flare),
 *  its first ring tucked a little inside its parent (no visible joint). */
function barkMesh(branches, sides) {
  const pos = [], nrm = [], idx = [], bark = [];   // [uccle-city CHANGES.md #9] bark = (ring centre xyz, level)
  for (const b of branches) {
    const { pts } = b;
    const n = pts.length;
    let t = pts[1].clone().sub(pts[0]).normalize();
    let u = Math.abs(t.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    u = u.sub(t.clone().multiplyScalar(u.dot(t))).normalize();
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const tn = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      // parallel transport the frame
      u = u.sub(tn.clone().multiplyScalar(u.dot(tn))).normalize();
      const w = tn.clone().cross(u);
      t = tn;
      const f = i / (n - 1);
      let rad = b.r0 + (b.r1 - b.r0) * f;
      if (b.flare) rad *= 1 + 0.75 * Math.max(0, 1 - (pts[i].y + 0.5) / 1.3) ** 2;   // the root flare
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        // a slightly lumpy section (bark is not a pipe)
        const lump = 1 + 0.08 * Math.sin(3 * a + i * 0.9) + 0.05 * Math.sin(5 * a + i * 1.7);
        const d = u.clone().multiplyScalar(Math.cos(a)).add(w.clone().multiplyScalar(Math.sin(a)));
        const p = pts[i].clone().add(d.clone().multiplyScalar(rad * lump));
        pos.push(p.x, p.y, p.z);
        nrm.push(d.x, d.y, d.z);
        bark.push(pts[i].x, pts[i].y, pts[i].z, b.level);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const a = base + i * sides + k, b2 = base + i * sides + ((k + 1) % sides);
        const c = a + sides, d = b2 + sides;
        idx.push(a, b2, c, b2, d, c);   // (counter-clockwise from outside, as the engine's tubes)
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("bark", new THREE.Float32BufferAttribute(bark, 4));
  g.setIndex(idx);
  return g;
}
