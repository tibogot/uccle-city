// THE COPPER BEECH (Fagus sylvatica 'Atropunicea' / f. purpurea): Uccle's street tree. 520 of the 1,597 live trees of
// the regional roads (Bruxelles Mobilité inventory, CC0; docs/trees/SPECIES_DATA.md), all of them along the Drève de
// Lorraine (multiple alignments, semi-free crowns: heights 25-35 m, crowns 12-15 m across, trunks 1.5-2 m round; a
// tenth are young replacements of 10 m with 6 m crowns). A species of the city's stylized-tree chain
// (viewer/treesStylized.js makeSpecies), as the beech (viewer/treesBeech.js) and the plane, LAB ONLY for now
// (labs/tree-lab.js); docs/trees/COPPER_BEECH.md.
//
// What it does that the green beech does not:
//  - TEXTURES FROM THE TEXTURE FACTORY (tools/texturefactory, CC0 by construction): a leaf-spray atlas per season
//    (materials/leaves.py "copperbeech": ruby spring, maroon / purple-brown summer with bronze shade leaves and paler,
//    greener undersides, copper autumn, a sparse marcescent winter spray of tan leaves on bare twigs) and a mature
//    beech bark (materials/bark.py beech_skin: elephant skin, stemflow streaks, horizontal creases, crustose and script
//    lichen, algae), mapped triplanar (viewer/treeTextures.js scanBark) with the branch-collar "eyes" drawn live on the
//    trunk's own cylinder on top (so they never repeat with the 1 m tile).
//  - TWO FORMS: the AVENUE tree of the Drève (variants 0-3: a tall clear bole, a dense, tall oval crown on steep
//    ascending limbs, a high V fork) and the open-grown PARK tree (variants 4-5: a short bole, a wide dome skirting
//    down to ~2 m).
//  - The beech's weak points addressed: a SMOOTHER CROWN (more, overlapping pads on a gently lobed envelope, an inner
//    layer filling the gaps, more of the crown's dome in the shading: no "broccoli" lumps) and LESS REGULAR TRUNKS (an
//    elliptic, slowly turning section, swellings along the bole, buttresses of random size at random angles, a little
//    lean and sweep).
import * as THREE from "three/webgpu";
import { positionGeometry, attribute, vec3, float, mix, smoothstep, mx_noise_float, abs, max, fwidth, floor, fract, sin, dot, length, atan } from "three/tsl";
import { beechLeafMask } from "./treesBeech.js";
import { grow, taper, at } from "./treesPlane.js";
import { loadBarkScan, loadLeafAtlas, scanBark } from "./treeTextures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ seasons
/** Per season: the factory spray (viewer/trees/textures/tree_textures.json) and the species palette it multiplies
 *  (the spray brings each leaf's colour around its mean; the palette sets the crown's mean, top to bottom). */
export const COPPER_SEASONS = {
  summer: { leaves: "leaf_copperbeech", topColor: "#4e2a30", bottomColor: "#3a2026", translucencyColor: "#d04a3c", translucency: 0.35, fillColor: "#a8949c" },
  spring: { leaves: "leaf_copperbeech_spring", topColor: "#8a3644", bottomColor: "#5a2632", translucencyColor: "#e85a4a", translucency: 0.45, fillColor: "#b09aa0" },
  autumn: { leaves: "leaf_copperbeech_autumn", topColor: "#a05a2c", bottomColor: "#6c3820", translucencyColor: "#ff9a40", translucency: 0.5, fillColor: "#a8988c" },
  winter: { leaves: "leaf_copperbeech_winter", topColor: "#9a7048", bottomColor: "#6a4a2e", translucencyColor: "#e8a868", translucency: 0.35, fillColor: "#a09a94" },
};
const BARK_ID = "tf_copperbeech";
// the bark's mean colour (linear) the factory set is graded to: the photos' silver-grey (a touch lighter and warmer
// than the green beech's procedural bark, which the owner found cool)
const BARK_TARGET = [0.19, 0.19, 0.182];

/** The factory textures for one season (cached by treeTextures.js): { leaves, bark, gpuBytes, fileBytes }. */
export async function loadCopperBeechTextures(renderer, season = "summer") {
  const [leaves, bark] = await Promise.all([loadLeafAtlas(renderer, COPPER_SEASONS[season].leaves), loadBarkScan(renderer, BARK_ID)]);
  return { season, leaves, bark, gpuBytes: leaves.gpuBytes + bark.gpuBytes, fileBytes: leaves.fileBytes + bark.fileBytes };
}

// ------------------------------------------------------------------------------------------------ skeleton
/** The crown grown into its envelope: goals on a Fibonacci spiral over the envelope (elevations elMin..90), pulled
 *  `tiers` toward horizontal layers (the beech's layered sprays), each grown as a secondary from the nearest limb (in
 *  azimuth and height), a twig off it, the pad at its tip just inside the envelope. Pads OVERLAP (radius ~0.85 of
 *  their spacing) and a second, inner layer fills the gaps: a dense, even crown, not a shell of separate balls. */
function crownInto(r, { limbs, branches, env, cy, NG, elMin, tiers, padR, inner = 0.18 }) {
  const rr = (a, b) => a + (b - a) * r();
  const pads = [];
  const s0 = Math.sin(THREE.MathUtils.degToRad(elMin));
  const angDist = (x, y) => Math.abs(((x - y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const total = Math.round(NG * (1 + inner));
  for (let k = 0; k < total; k++) {
    const isInner = k >= NG, kk = isInner ? (k - NG) * (NG / (total - NG)) : k;
    let el = THREE.MathUtils.radToDeg(Math.asin(s0 + (1 - s0) * ((kk + 0.5) / NG))) + rr(-4, 4);
    if (tiers) { const step = (90 - elMin) / tiers, q = elMin + Math.round((el - elMin) / step) * step; el = THREE.MathUtils.lerp(el, q, 0.35); }
    const a = kk * 2.39996 + (isInner ? 1.2 : 0) + rr(-0.12, 0.12);
    const pr = rr(...padR) * (isInner ? 1.15 : 1);
    const e0 = env(a, el), out = e0.clone().sub(V(0, cy, 0)).normalize();
    // the pad's centre: just inside the envelope (outer layer), or ~40 % in (inner layer)
    const goal = isInner ? V(0, cy, 0).lerp(e0, rr(0.5, 0.65)) : e0.clone().addScaledVector(out, -pr * rr(0.45, 0.65));
    // the limb it grows from: the nearest in azimuth, its point at about the goal's height
    let L = limbs[0], best = Infinity;
    for (const l of limbs) {
      const d = (l.leader ? 0.9 : angDist(l.az, a)) + Math.abs(l.yMid - goal.y) * 0.06;
      if (d < best) { best = d; L = l; }
    }
    let t = 0.3, bt = Infinity;
    for (let u = 0.15; u <= 0.98; u += 0.083) { const d = Math.abs(at(L.pts, u).y - (goal.y - 1.5)); if (d < bt) { bt = d; t = u; } }
    const from = at(L.pts, t), sd = goal.clone().sub(from), sl = sd.length();
    if (sl > 0.8) {
      // secondaries rise, then level out toward their tips (the flat sprays)
      const sp = grow(r, from, sd.clone().normalize().lerp(V(0, 1, 0), 0.15), sl, 3, { pull: sd, pullK: 0.32, wiggle: 0.2, droop: 0.12 });
      // (the inner layer's secondaries are hidden in the crown: no bark for them)
      if (!isInner) branches.push({ pts: sp, rad: taper(Math.max(0.03, L.rB * (0.32 + 0.25 * (1 - t))), 0.016), level: 2 });
      // a twig toward the pad's rim (the winter tree's fine branching; LOD 0 only)
      if (!isInner && r() < 0.5) {
        const f2 = at(sp, rr(0.45, 0.7)), g2 = goal.clone().add(V(rr(-1, 1), rr(-0.4, 0.6), rr(-1, 1)).multiplyScalar(pr * 0.8));
        if (g2.distanceTo(f2) > 0.6) branches.push({ pts: grow(r, f2, g2.clone().sub(f2).normalize(), g2.distanceTo(f2), 2, { wiggle: 0.25 }), rad: taper(0.018, 0.008), level: 3 });
      }
    }
    pads.push({ c: goal, r: pr });
  }
  return pads;
}

/** A lobed oval envelope round (0, cy, 0): half width W, up / down to `top` / `yb`; broad lobes only (no scallops). */
function envelope(r, { W, cy, top, yb, flatTop = 0.15 }) {
  const p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28, k1 = 0.05 + r() * 0.05, k2 = 0.03 + r() * 0.04;
  return (az, el) => {
    const e = THREE.MathUtils.degToRad(el), up = e > 0 ? top - cy : cy - yb;
    const wob = 1 + k1 * Math.sin(2 * az + p1) + k2 * Math.sin(3 * az + p2) + 0.02 * Math.sin(5 * az + p3);
    // a rounded, slightly flattened top (superellipse in elevation)
    // (below the widest point the crown stays broad down to its flat underside: the low limbs spread out level)
    const ce = Math.pow(Math.abs(Math.cos(e)), e > 0 ? 0.85 - flatTop * Math.sin(e) : 0.5);
    return V(Math.cos(az) * ce * W * wob, cy + Math.sin(e) * up, Math.sin(az) * ce * W * wob);
  };
}

/** Per-branch irregularity for the bark mesh (an elliptic, turning section; swellings; buttresses). */
function irregular(r, strength) {
  const butt = [];
  const nb = 4 + Math.floor(r() * 4);
  for (let i = 0; i < nb; i++) butt.push([r() * Math.PI * 2, (0.35 + r() * 0.75) * strength]);
  return { ell: 1 + (0.05 + r() * 0.07) * strength, rot0: r() * Math.PI, rotK: (r() - 0.5) * 2.4, sw: [r() * 6.28, r() * 6.28, (0.04 + r() * 0.04) * strength], butt };
}

/** The avenue tree of the Drève de Lorraine (variants 0-3): a straight, clear bole (pruned up to 8-11 m: the old branch
 *  scars are the bark's eyes), 5-7 steep ascending limbs, a V fork high up carrying on as two or three stems, a dense,
 *  tall oval crown ~13 m across. Built ~30 m tall (the inventory's median class). */
function avenueTree(r, v) {
  const branches = [];
  const rr = (a, b) => a + (b - a) * r();
  const top = rr(29, 32), yb = rr(7.5, 10.0), W = rr(6.3, 7.5), yf = yb + rr(4, 7);
  const cy = yb + (top - yb) * 0.4;
  const env = envelope(r, { W, cy, top, yb, flatTop: 0.3 });
  const lean = V(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.06);
  const trunk = grow(r, V(0, -0.5, 0), V(lean.x, 1, lean.z), yf + 0.5, 12, { pull: V(0, 1, 0), pullK: 0.12, wiggle: 0.05 });
  const trunkR = (t) => 0.34 * (1 - 0.3 * Math.pow(t, 1.2)) + 0.02;
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true, flareH: 1.9, flareAmp: 0.42, irr: irregular(r, 1) });
  const limbs = [];
  // the fork: 2-3 steep stems to the top (the beech's V)
  const nS = 2 + (r() < 0.45 ? 1 : 0), fork = trunk[trunk.length - 1];
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nS; i++) {
    az += (Math.PI * 2) / nS + rr(-0.4, 0.4);
    const goal = V(Math.cos(az) * W * 0.3, top - rr(1.2, 2.5), Math.sin(az) * W * 0.3);
    const pts = grow(r, fork, goal.clone().sub(fork).normalize().lerp(V(0, 1, 0), 0.4), goal.distanceTo(fork), 7, { pull: goal.clone().sub(fork).normalize(), pullK: 0.25, wiggle: 0.08 });
    const rB = trunkR(1) * rr(0.62, 0.78);
    branches.push({ pts, rad: taper(rB, 0.05), level: 1, irr: irregular(r, 0.6) });
    limbs.push({ pts, rB, az, yMid: at(pts, 0.6).y });
  }
  // laterals from the bole below the fork: steep, ascending (40-65 deg), longer low down
  const nL = 5 + Math.floor(r() * 3);
  for (let i = 0; i < nL; i++) {
    az += 2.39996 + rr(-0.3, 0.3);
    const h01 = i / (nL - 1), tOn = THREE.MathUtils.clamp((yb + h01 * (yf - yb - 0.5)) / (yf + 0.5), 0, 0.97), from = at(trunk, tOn);
    const goal = env(az, rr(-5, 20) + h01 * 25).multiply(V(0.78, 1, 0.78));
    const pts = grow(r, from, goal.clone().sub(from).normalize().lerp(V(0, 1, 0), 0.35), goal.distanceTo(from), 6, { pull: goal.clone().sub(from).normalize(), pullK: 0.22, wiggle: 0.14 });
    const rB = trunkR(tOn) * rr(0.36, 0.5);
    branches.push({ pts, rad: taper(rB, 0.045), level: 1, irr: irregular(r, 0.5) });
    limbs.push({ pts, rB, az, yMid: at(pts, 0.6).y });
  }
  const area = 2 * Math.PI * W * (W + (top - yb) / 2);
  const padR = [2.2, 2.65];
  const NG = Math.round(area / (2.5 * 1.25) ** 2);
  const pads = crownInto(r, { limbs, branches, env, cy, NG, elMin: -60, tiers: 5, padR });
  return { branches, pads, fork };
}

/** The open-grown park copper beech (variants 4-5): a short bole, 5-6 big limbs fanning up and out, the lower ones
 *  long and sweeping down at their tips, a broad dome skirting down to ~2 m. Built ~23 m tall, ~22 m across. */
function parkTree(r, v) {
  const branches = [];
  const rr = (a, b) => a + (b - a) * r();
  const top = rr(22, 25), yb = rr(1.6, 2.6), W = rr(10, 11.5), bole = rr(2.4, 3.4);
  const cy = yb + (top - yb) * 0.4;
  const env = envelope(r, { W, cy, top, yb, flatTop: 0.25 });
  const trunk = grow(r, V(0, -0.5, 0), V((r() - 0.5) * 0.12, 1, (r() - 0.5) * 0.12), top - 5, 11, { pull: V(0, 1, 0), pullK: 0.1, wiggle: 0.09 });
  const trunkR = taper(0.62, 0.1);
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true, flareH: 1.7, flareAmp: 0.55, irr: irregular(r, 1.3) });
  const nL = 6 + Math.floor(r() * 2), limbs = [];
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nL; i++) {
    az += (Math.PI * 2) / nL + rr(-0.35, 0.35);
    const h01 = i / (nL - 1);
    const tOn = THREE.MathUtils.clamp((bole + h01 * 5.5) / (top - 5), 0, 0.6), from = at(trunk, tOn);
    const goal = env(az, -10 + h01 * 45 + rr(-6, 6)).multiplyScalar(0.72).add(V(0, cy * 0.25, 0));
    const pts = grow(r, from, goal.clone().sub(from).normalize().lerp(V(0, 1, 0), 0.3), goal.distanceTo(from), 8, { pull: goal.clone().sub(from).normalize(), pullK: 0.22, wiggle: 0.2, droop: h01 < 0.4 ? 0.07 : 0.02 });
    const rB = trunkR(tOn) * rr(0.5, 0.62);
    branches.push({ pts, rad: taper(rB, 0.05), level: 1, irr: irregular(r, 0.7) });
    limbs.push({ pts, rB, az, yMid: at(pts, 0.6).y });
  }
  limbs.push({ pts: trunk.slice(Math.floor(trunk.length * 0.5)), rB: trunkR(0.5), az: 0, leader: true, yMid: top * 0.75 });
  const area = 2 * Math.PI * W * (W + (top - yb) / 2);
  const NG = Math.round(area / (2.85 * 1.25) ** 2);
  const pads = crownInto(r, { limbs, branches, env, cy, NG, elMin: -62, tiers: 0, padR: [2.5, 3.0], inner: 0.15 });
  return { branches, pads, fork: at(trunk, bole / (top - 5)) };
}

// ------------------------------------------------------------------------------------------------ bark mesh
/** treesPlane.js barkMesh with IRREGULAR sections (b.irr): an ellipse turning slowly up the branch, swellings along it,
 *  buttress roots of random size at random angles. All a function of (t, angle), never of the side count: LOD 0 and 1
 *  (same sides) keep the same outline, LOD 2 a coarser one of the same shape. Same attributes (position, normal, bark
 *  = ring centre + level). */
function barkMesh(branches, sidesOf, stride = 1) {
  const pos = [], nrm = [], idx = [], bark = [];
  for (const b of branches) {
    const pts = stride > 1 ? b.pts.filter((_, i) => i % stride === 0 || i === b.pts.length - 1) : b.pts, n = pts.length, sides = sidesOf(b.level);
    let len = 0;
    for (let i = 1; i < b.pts.length; i++) len += b.pts[i].distanceTo(b.pts[i - 1]);
    let u = null;
    const base = pos.length / 3, irr = b.irr;
    for (let i = 0; i < n; i++) {
      const tn = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      if (!u) u = Math.abs(tn.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
      u.sub(tn.clone().multiplyScalar(u.dot(tn))).normalize();
      const w = tn.clone().cross(u);
      // t along the ORIGINAL points (stride keeps the ends), so LOD 2's rings sit on LOD 0's
      const t = (stride > 1 ? b.pts.indexOf(pts[i]) : i) / (b.pts.length - 1);
      const rad0 = b.rad(t);
      const swell = irr ? 1 + irr.sw[2] * Math.sin(t * len / 1.9 + irr.sw[0]) + irr.sw[2] * 0.6 * Math.sin(t * len / 0.7 + irr.sw[1]) : 1;
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        let rad = rad0 * swell;
        if (irr) { const ph = a - irr.rot0 - irr.rotK * t; rad *= 1 + (irr.ell - 1) * Math.cos(2 * ph); }
        if (b.flare) {
          const f = Math.max(0, 1 - (pts[i].y + 0.5) / (b.flareH ?? 1.6));
          let lobes = 0;
          for (const [ba, bs] of irr?.butt ?? []) { const c = Math.max(0, Math.cos(a - ba)); lobes += bs * Math.pow(c, 7); }
          rad *= 1 + f * f * ((b.flareAmp ?? 0.5) + lobes);
        }
        const lump = 1 + 0.025 * Math.sin(3 * a + i * 1.3) + 0.015 * Math.sin(7 * a + i * 2.1);
        const d = u.clone().multiplyScalar(Math.cos(a)).add(w.clone().multiplyScalar(Math.sin(a)));
        const p = pts[i].clone().addScaledVector(d, rad * lump);
        pos.push(p.x, p.y, p.z); nrm.push(d.x, d.y, d.z);
        bark.push(pts[i].x, pts[i].y, pts[i].z, b.level);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k, b2 = base + i * sides + ((k + 1) % sides), c = a + sides, d = b2 + sides;
      idx.push(a, b2, c, b2, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("bark", new THREE.Float32BufferAttribute(bark, 4));
  g.setIndex(idx);
  return g;
}

// sides per level per LOD (LOD 0 and 1 the same on what they share); LOD 2 coarser, every other ring
const SIDES = [[14, 8, 4, 3], [14, 8], [7, 4]];

export function copperBeechShape(seedBase) {
  return (r, lod, seed) => {
    const v = Math.round((seed - seedBase) / 97), park = v >= 4;
    const { branches, pads, fork } = park ? parkTree(r, v) : avenueTree(r, v);
    const bb = new THREE.Box3();
    for (const p of pads) bb.expandByPoint(p.c.clone().addScalar(p.r)).expandByPoint(p.c.clone().addScalar(-p.r));
    const crown = bb.getCenter(new THREE.Vector3()), rad = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    pads.push({ c: crown.clone().lerp(fork, 0.3), r: park ? 2.6 : 2.0 });       // the core (last)
    return {
      crown, rad, clumps: pads,
      // overlapping pads, fewer cards each (the crown's density comes from the pad count, not from piles per pad)
      cards: park ? [8, 3, 2] : [7, 3, 2], cardScale: park ? 0.6 : 0.62,
      // the crown reads as ONE dense mass (the copper beech's dark, solid oval): most of the crown's dome in the
      // shading normal (the beech 0.5, the plane 0.2), a gentle overhead occlusion with a floor
      aoOverhead: 0.94, aoFloor: 0.5, crownNormal: 0.58,
      trunk: (l) => barkMesh(branches.filter((b) => b.level <= [3, 1, 1][l]), (lv) => SIDES[l][Math.min(lv, SIDES[l].length - 1)], l === 2 ? 2 : 1),
    };
  };
}

// ------------------------------------------------------------------------------------------------ bark material
/** The branch-collar "eyes" on the trunk's own cylinder (from treesBeech.js beechBark): a dark almond scar with a pale
 *  rim under a wide dark chevron ("eyebrow"), one in some cells of a stretched grid round the ring centre x the height,
 *  sized and jittered per cell, more of them on the clear bole (the pruned branches of an avenue tree). */
function eyeNodes() {
  const p = positionGeometry, level = attribute("bark", "vec4").w, ax = attribute("bark", "vec4").xyz;
  const q = vec3(p.x, p.y, p.z).mul(3.0);
  const fw = max(fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)), 1e-4);
  const near = float(1).sub(smoothstep(0.3, 1.6, fw));
  const th = atan(p.z.sub(ax.z), p.x.sub(ax.x));
  const eg = vec3(th.div(Math.PI * 2).mul(6.0), p.y.mul(1.1), 0), ec = floor(eg), ef0 = fract(eg).sub(0.5);
  const eh = fract(sin(dot(ec, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  const esz = eh.mul(0.7).add(0.65);
  const wob = mx_noise_float(vec3(eg.x.mul(6.0), eg.y.mul(6.0), ec.x.add(ec.y.mul(7.0)))).mul(0.05);
  const ef = vec3(ef0.x.sub(eh.sub(0.5).mul(0.3)).div(esz), ef0.y.sub(fract(eh.mul(7.0)).sub(0.5).mul(0.35)).div(esz), 0);
  const taperY = float(1).sub(smoothstep(0.0, 0.2, abs(ef.x)).mul(0.65));
  const ed = length(vec3(ef.x, ef.y.add(wob).mul(4.2).div(taperY), 0));
  // trunk only; ~45 % of the cells below 12 m (the pruned bole), ~25 % above
  const dens = mix(float(0.55), float(0.75), smoothstep(10.0, 14.0, p.y));
  const eyeOn = smoothstep(dens, dens.add(0.05), eh).mul(smoothstep(0.5, 1.5, level).oneMinus()).mul(smoothstep(0.6, 1.4, p.y));
  const eyeW = fw.mul(0.4).add(0.05);
  const eye = float(1).sub(smoothstep(float(0.2).sub(eyeW), float(0.2).add(eyeW), ed)).mul(eyeOn);
  const rim = float(1).sub(smoothstep(float(0), eyeW.mul(1.5), abs(ed.sub(0.28)))).mul(eyeOn);
  const chevY = ef.y.sub(0.12).sub(abs(ef.x).mul(0.34)).add(wob);
  const chev = float(1).sub(smoothstep(float(0), eyeW.mul(2.4), abs(chevY))).mul(smoothstep(0.48, 0.15, abs(ef.x)))
    .mul(smoothstep(-0.2, 0.3, mx_noise_float(vec3(eg.x.mul(9.0), eg.y.mul(3.0), 1.0)))).mul(eyeOn);
  return { eye: eye.mul(near), rim: rim.mul(near), chev: chev.mul(near) };
}

/** def.bark: the factory bark (triplanar, graded to the beech's silver-grey, the species' macro variation: algae side,
 *  damp foot, paler limbs) + the eyes on top. */
export function copperBeechBark(scan) {
  const base = scanBark({ scans: [scan], target: BARK_TARGET, species: "beech", hueK: 0.9 });
  return (m) => {
    base(m);
    const { eye, rim, chev } = eyeNodes();
    let col = m.colorNode;
    col = mix(col, col.mul(0.4), eye.mul(0.7));
    col = mix(col, col.mul(1.25), rim.mul(0.25));
    col = mix(col, col.mul(0.55), chev.mul(0.55));
    m.colorNode = col;
    m.roughnessNode = mix(m.roughnessNode, float(0.95), eye.mul(0.6));
    m.needsUpdate = true;
  };
}

// ------------------------------------------------------------------------------------------------ the species
/** The species definition for makeSpecies. tex = loadCopperBeechTextures(...) (required: the copper beech is the
 *  factory-textured species). */
export function copperBeechDef(seedBase = 1000, tex) {
  const S = COPPER_SEASONS[tex.season];
  return {
    id: "copperbeech", variants: 6, shape: copperBeechShape(seedBase), leafMask: beechLeafMask, bark: copperBeechBark(tex.bark), perVariantHeight: true,
    seasonal: tex.season,                       // (the lab's season slider leaves it alone: its seasons are its sprays)
    impostorAlphaBoost: 0,
    leafRoughness: 0.7,                         // glossy, a little less than the beech (one big sheen blob on the smooth crown)
    params: {
      seed: seedBase,
      topColor: S.topColor, bottomColor: S.bottomColor, translucencyColor: S.translucencyColor, translucency: S.translucency,
      tintVar: 0.16, crownLift: 0, fill: 0.42, fillColor: S.fillColor, aoColor: 0.25, trunkColor: [0.27, 0.27, 0.26],
      leafTone: 0, shadowLift: 2.2,
      leafAtlas: { ...tex.leaves.atlas, normalK: 0.75, transK: 1 },
    },
  };
}
