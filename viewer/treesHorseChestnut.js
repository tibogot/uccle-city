// THE HORSE CHESTNUT (Aesculus hippocastanum, "marronnier"): Uccle's big green avenue tree. 276 of the 1,597 live trees
// of the regional roads (Bruxelles Mobilité inventory, CC0; docs/trees/SPECIES_DATA.md): 233 in the double rows of the
// Avenue Winston Churchill, 41 on the Avenue de Fré, 2 on the Chaussée d'Alsemberg (semi-free crowns, heights 9-25 m,
// median 15 m, crowns 6-14 m across, the old trees' trunks 2-2.4 m round). A species of the city's stylized-tree
// chain (viewer/treesStylized.js makeSpecies), as the plane, beech and copper beech, LAB ONLY for now
// (labs/tree-lab.js); docs/trees/HORSE_CHESTNUT.md. The copper beech (viewer/treesCopperBeech.js) is the template.
//
//  - TEXTURES FROM THE TEXTURE FACTORY (CC0 by construction): leaf sprays per season (materials/leaves.py
//    "horsechestnut" + tf/chestnut.py: rosettes of 7-leaflet palmate leaves at the shoot tips, no star of twigs;
//    fresh green spring WITH the white flower candles; early, patchy rust-brown autumn with leaf-miner blotches; a bare
//    winter of stout twigs with upturned tips and sticky buds) and the old trees' bark (materials/bark.py
//    chestnut_plates: grey-brown thin plates, curling edges, orange-brown under-bark).
//  - THE SPRAY BRINGS ITS COLOURS: the palette is the spray's own mean (top lighter, bottom darker), so the candles stay
//    white and the autumn leaves keep their mix of yellow, rust and green (a palette multiplies every texel).
//  - UPRIGHT CARDS (def.maxCardSpin): the cards turn by +-26 deg only, so the candles stand up and the winter twigs curve up.
//  - TWO FORMS: the AVENUE tree (variants 0-3, built ~20 m: a THICK short trunk, ~0.95 m across above the flare, an
//    early main fork at 3-5 m into 3-5 big ascending limbs, the low limbs sweeping out and down and turning up at
//    their tips, a broad heavy dome ~14 m across) and the open-grown PARK tree (variants 4-5, ~21 m tall, ~27 m
//    across, a 1.3 m trunk, a huge rounded dome skirting down to ~3 m).
//  - The trunk's SPIRAL: old horse chestnuts twist; the bark mesh carries slow spiral ridges up the bole (and the
//    elliptic section turns with them).
import * as THREE from "three/webgpu";
import { planeLeafMask, grow, taper, at } from "./treesPlane.js";
import { loadBarkScan, loadLeafAtlas, scanBark } from "./treeTextures.js";
import { fadingLeafAtlas, softenRim, crownGaps } from "./treeLeafLook.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ seasons
/** Per season: the factory spray (viewer/trees/textures/tree_textures.json), how much of its own colour spread is
 *  kept (1 = all: the palette is the spray's mean), the crown's light (top / bottom x the mean) and the light through. */
export const CHESTNUT_SEASONS = {
  summer: { leaves: "leaf_horsechestnut", variation: 0.85, top: 1.12, bottom: 0.62, translucencyColor: "#9cc048", translucency: 0.3, fillColor: "#a4b0a0" },
  spring: { leaves: "leaf_horsechestnut_spring", variation: 1, top: 1.1, bottom: 0.66, translucencyColor: "#c4e060", translucency: 0.38, fillColor: "#b0bca8" },
  autumn: { leaves: "leaf_horsechestnut_autumn", variation: 0.95, top: 1.1, bottom: 0.64, translucencyColor: "#e0b050", translucency: 0.34, fillColor: "#b0a898" },
  winter: { leaves: "leaf_horsechestnut_winter", variation: 1, top: 1.6, bottom: 1.15, translucencyColor: "#806050", translucency: 0.04, fillColor: "#a4a09c" },
};
const BARK_ID = "tf_horsechestnut";
// the bark's mean colour (linear): grey-brown, a little darker and browner than the beech's silver-grey
const BARK_TARGET = [0.095, 0.085, 0.075];

/** The factory textures for one season (cached by treeTextures.js): { season, leaves, bark, gpuBytes, fileBytes }. */
export async function loadHorseChestnutTextures(renderer, season = "summer") {
  const [leaves, bark] = await Promise.all([loadLeafAtlas(renderer, CHESTNUT_SEASONS[season].leaves), loadBarkScan(renderer, BARK_ID)]);
  return { season, leaves, bark, gpuBytes: leaves.gpuBytes + bark.gpuBytes, fileBytes: leaves.fileBytes + bark.fileBytes };
}

// ------------------------------------------------------------------------------------------------ skeleton
/** A limb that sweeps out (and down) and turns UP at its tip: a cubic Bezier from `from` to `tip`, its second control
 *  point below and inside the tip (the upturn), with a wobble. */
function sweep(r, from, tip, n, { rise = 0.3, sag = 0.35, wiggle = 0.25 } = {}) {
  const d = tip.clone().sub(from), L = d.length(), out = V(d.x, 0, d.z).normalize();
  const p1 = from.clone().addScaledVector(out, L * 0.38).add(V(0, L * rise, 0));
  const p2 = tip.clone().addScaledVector(out, -L * 0.22).add(V(0, -L * sag, 0));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const p = from.clone().multiplyScalar(u * u * u).addScaledVector(p1, 3 * u * u * t).addScaledVector(p2, 3 * u * t * t).addScaledVector(tip, t * t * t);
    if (i > 0 && i < n) p.add(V(r() - 0.5, (r() - 0.5) * 0.5, r() - 0.5).multiplyScalar(wiggle * L / n));
    pts.push(p);
  }
  return pts;
}

/** The dome: (az, el in degrees) -> a point of the envelope round (0, cy, 0). A broad, heavy, rounded top, the
 *  widest a little below cy, the hem curling under; billows (2nd-5th harmonics, a few bumps in elevation) for the
 *  horse chestnut's lumpy, cumulus-like crown. */
function envelope(r, { W, cy, top, yb }) {
  const p = Array.from({ length: 5 }, () => r() * 6.28), k1 = 0.05 + r() * 0.05, k2 = 0.035 + r() * 0.035;
  return (az, el) => {
    const e = THREE.MathUtils.degToRad(el);
    const wob = 1 + k1 * Math.sin(2 * az + p[0]) + k2 * Math.sin(3 * az + p[1]) + 0.025 * Math.sin(5 * az + p[2])
      + 0.05 * Math.sin(4 * az + 3 * e + p[3]) * Math.cos(e) + 0.045 * Math.sin(7 * az + p[4]) * Math.sin(4 * e + p[3]);
    let ce, y;
    if (e >= 0) { ce = Math.pow(Math.cos(e), 1.05); y = cy + Math.sin(e) * (top - cy) * (1 + 0.03 * Math.sin(3 * az + p[4])); }
    else { ce = Math.pow(Math.cos(e), 0.5); y = cy - Math.pow(Math.sin(-e), 0.8) * (cy - yb); }   // a broad skirt: the hem low and wide
    return V(Math.cos(az) * ce * W * wob, y, Math.sin(az) * ce * W * wob);
  };
}

/** The crown grown into its envelope (the copper beech's crownInto: goals on a Fibonacci spiral, each a secondary from
 *  the nearest limb, its pad just inside the envelope; overlapping pads + an inner layer: a dense, heavy crown). The
 *  secondaries of the horse chestnut rise then level out: big rosette-bearing shoots. No twig layer (cost: the
 *  winter spray carries the fine twigs). */
function crownInto(r, { limbs, branches, env, cy, NG, elMin, padR, inner = 0.18, gaps = null }) {
  const rr = (a, b) => a + (b - a) * r();
  const pads = [];
  const s0 = Math.sin(THREE.MathUtils.degToRad(elMin));
  const angDist = (x, y) => Math.abs(((x - y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const total = Math.round(NG * (1 + inner));
  for (let k = 0; k < total; k++) {
    const isInner = k >= NG, kk = isInner ? (k - NG) * (NG / (total - NG)) : k;
    const el = THREE.MathUtils.radToDeg(Math.asin(s0 + (1 - s0) * ((kk + 0.5) / NG))) + rr(-4, 4);
    const a = kk * 2.39996 + (isInner ? 1.2 : 0) + rr(-0.12, 0.12);
    const pr = rr(...padR) * (isInner ? 1.15 : 1);
    const e0 = env(a, el), out = e0.clone().sub(V(0, cy, 0)).normalize();
    const goal = isInner ? V(0, cy, 0).lerp(e0, rr(0.5, 0.65)) : e0.clone().addScaledVector(out, -pr * rr(0.45, 0.62));
    let L = limbs[0], best = Infinity;
    for (const l of limbs) {
      const d = (l.leader ? 0.9 : angDist(l.az, a)) + Math.abs(l.yMid - goal.y) * 0.06;
      if (d < best) { best = d; L = l; }
    }
    let t = 0.3, bt = Infinity;
    for (let u = 0.15; u <= 0.98; u += 0.083) { const d = Math.abs(at(L.pts, u).y - (goal.y - 1.2)); if (d < bt) { bt = d; t = u; } }
    const from = at(L.pts, t), sd = goal.clone().sub(from), sl = sd.length();
    if (sl > 0.8 && !isInner) {
      const sp = grow(r, from, sd.clone().normalize().lerp(V(0, 1, 0), 0.2), sl, 3, { pull: sd, pullK: 0.3, wiggle: 0.22, droop: 0.06 });
      branches.push({ pts: sp, rad: taper(Math.max(0.035, L.rB * (0.32 + 0.25 * (1 - t))), 0.02), level: 2 });
    }
    // (the look: a gap in the crown, the secondary bare in it: limbs show, light comes through)
    if (gaps && !isInner && gaps(a, el)) continue;
    pads.push({ c: goal, r: pr });
  }
  return pads;
}

/** Per-branch irregularity: an elliptic section turning up the branch (the trunk: WITH its spiral ridges), swellings,
 *  buttresses of random size at random angles. */
function irregular(r, strength, spiral = 0) {
  const butt = [];
  const nb = 4 + Math.floor(r() * 4);
  for (let i = 0; i < nb; i++) butt.push([r() * Math.PI * 2, (0.3 + r() * 0.7) * strength]);
  return { ell: 1 + (0.05 + r() * 0.06) * strength, rot0: r() * Math.PI, rotK: spiral ? spiral : (r() - 0.5) * 2.4, sw: [r() * 6.28, r() * 6.28, (0.035 + r() * 0.035) * strength], butt, spiral };
}

/** The avenue horse chestnut (variants 0-3) of the Avenue Winston Churchill: built ~20 m. */
function avenueTree(r, look) {
  const branches = [];
  const rr = (a, b) => a + (b - a) * r();
  const top = rr(18.5, 20.5), yf = rr(3.0, 4.2), yb = rr(2.6, 3.6), W = rr(7.4, 8.4);
  const cy = yb + (top - yb) * 0.36;
  const env = envelope(r, { W, cy, top, yb });
  const trunk = grow(r, V(0, -0.5, 0), V((r() - 0.5) * 0.08, 1, (r() - 0.5) * 0.08), yf + 0.5, 6, { pull: V(0, 1, 0), pullK: 0.1, wiggle: 0.08 });
  // thick and short: ~0.95 m across above the flare (the inventory's old trees: 2-2.4 m round)
  const trunkR = (t) => 0.48 * (1 - 0.18 * t) * (1 - 0.45 * Math.max(0, (t - 0.8) / 0.2) ** 1.5);   // narrowing into the fork
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true, flareH: 1.4, flareAmp: 0.38, irr: irregular(r, 1, rr(0.9, 1.4) * (r() < 0.5 ? 1 : -1)) });
  const limbs = [], fork = at(trunk, 0.86);
  // the main fork: 3-5 big limbs, ascending (30-55 deg off vertical), the heaviest toward the top of the dome
  const nS = 3 + Math.floor(r() * 3);
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nS; i++) {
    az += (Math.PI * 2) / nS + rr(-0.35, 0.35);
    const goal = env(az, rr(35, 65)).multiply(V(0.62, 1, 0.62)).add(V(0, -rr(1, 2.5), 0));
    const pts = grow(r, fork, goal.clone().sub(fork).normalize().lerp(V(0, 1, 0), 0.25), goal.distanceTo(fork), 7, { pull: goal.clone().sub(fork).normalize(), pullK: 0.2, wiggle: 0.14 });
    const rB = trunkR(0.86) * rr(0.52, 0.62);
    branches.push({ pts, rad: taper(rB, 0.05), level: 1, irr: irregular(r, 0.6) });
    limbs.push({ pts, rB, az, yMid: at(pts, 0.6).y });
  }
  // the low limbs: out from the fork, sweeping down to the hem and turning up at their tips
  const nL = 3 + Math.floor(r() * 2);
  for (let i = 0; i < nL; i++) {
    az += 2.39996 + rr(-0.3, 0.3);
    const from = at(trunk, rr(0.8, 1.0)), tip = env(az, rr(-35, -15)).multiply(V(0.9, 1, 0.9)).add(V(0, 0.6, 0));
    const pts = sweep(r, from, tip, 7, { rise: rr(0.12, 0.25), sag: rr(0.18, 0.3) });
    const rB = trunkR(0.9) * rr(0.36, 0.46);
    branches.push({ pts, rad: taper(rB, 0.04), level: 1, irr: irregular(r, 0.45) });
    limbs.push({ pts, rB, az, yMid: at(pts, 0.6).y });
  }
  const area = 2 * Math.PI * W * (W + (top - yb) / 2);
  const NG = Math.round(area / (2.55 * 1.25) ** 2);
  const pads = crownInto(r, { limbs, branches, env, cy, NG, elMin: -58, padR: [2.2, 2.7], ...(look ? LOOK_CROWN(limbs) : {}) });
  return { branches, pads, fork };
}

/** The open-grown park horse chestnut (variants 4-5): a huge rounded dome, ~21 m tall and ~27 m across, on a 1.3 m
 *  trunk; 6-8 big limbs, the low ones sweeping far out and down to ~3 m and curving up at their tips. */
function parkTree(r, look) {
  const branches = [];
  const rr = (a, b) => a + (b - a) * r();
  const top = rr(20, 22), yb = rr(3.4, 4.2), W = rr(12.5, 13.5), yf = rr(2.6, 3.4);
  const cy = yb + (top - yb) * 0.32;
  const env = envelope(r, { W, cy, top, yb });
  const trunk = grow(r, V(0, -0.5, 0), V((r() - 0.5) * 0.1, 1, (r() - 0.5) * 0.1), top - 6, 10, { pull: V(0, 1, 0), pullK: 0.1, wiggle: 0.1 });
  const trunkR = taper(0.66, 0.14);
  const tF = yf / (top - 6);
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true, flareH: 1.6, flareAmp: 0.5, irr: irregular(r, 1.3, rr(1.0, 1.5) * (r() < 0.5 ? 1 : -1)) });
  const nL = 6 + Math.floor(r() * 3), limbs = [];
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nL; i++) {
    az += (Math.PI * 2) / nL + rr(-0.35, 0.35);
    const h01 = i / (nL - 1), from = at(trunk, THREE.MathUtils.clamp(tF + h01 * 0.35, 0, 0.7));
    let pts;
    if (h01 < 0.5) {
      // the low limbs: far out, down to the skirt, the tips turning up
      const tip = env(az, rr(-40, -20)).multiply(V(0.9, 1, 0.9)).add(V(0, 0.8, 0));
      pts = sweep(r, from, tip, 9, { rise: rr(0.12, 0.22), sag: rr(0.2, 0.32) });
    } else {
      const goal = env(az, rr(5, 45)).multiply(V(0.7, 1, 0.7));
      pts = grow(r, from, goal.clone().sub(from).normalize().lerp(V(0, 1, 0), 0.3), goal.distanceTo(from), 8, { pull: goal.clone().sub(from).normalize(), pullK: 0.22, wiggle: 0.2 });
    }
    const rB = trunkR(0.2) * rr(0.42, 0.55);
    branches.push({ pts, rad: taper(rB, 0.05), level: 1, irr: irregular(r, 0.7) });
    limbs.push({ pts, rB, az, yMid: at(pts, 0.6).y });
  }
  limbs.push({ pts: trunk.slice(Math.floor(trunk.length * 0.5)), rB: trunkR(0.5), az: 0, leader: true, yMid: top * 0.75 });
  const area = 2 * Math.PI * W * (W + (top - yb) / 2);
  const NG = Math.round(area / (2.9 * 1.25) ** 2);
  const pads = crownInto(r, { limbs, branches, env, cy, NG, elMin: -60, padR: [2.5, 3.0], inner: 0.15, ...(look ? LOOK_CROWN(limbs) : {}) });
  return { branches, pads, fork: at(trunk, tF) };
}

/** The look (docs/TREES.md §8): an airier crown: a thinner inner layer and gaps in clusters (viewer/treeLeafLook.js). */
const LOOK_CROWN = (limbs) => ({ inner: 0.08, gaps: crownGaps(limbs[0].az + limbs.length * 0.37, { share: 0.17 }) });

// ------------------------------------------------------------------------------------------------ bark mesh
/** The copper beech's barkMesh (irregular sections, all a function of (t, angle): LOD 0 / 1 keep the same outline) +
 *  the trunk's SPIRAL: ridges winding up the bole (b.irr.spiral rad per metre), the ellipse turning with them. */
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
      const t = (stride > 1 ? b.pts.indexOf(pts[i]) : i) / (b.pts.length - 1);
      const rad0 = b.rad(t);
      const swell = irr ? 1 + irr.sw[2] * Math.sin(t * len / 1.9 + irr.sw[0]) + irr.sw[2] * 0.6 * Math.sin(t * len / 0.7 + irr.sw[1]) : 1;
      const y = pts[i].y;
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        let rad = rad0 * swell;
        if (irr) {
          const ph = a - irr.rot0 - (irr.spiral ? irr.spiral * y : irr.rotK * t);
          rad *= 1 + (irr.ell - 1) * Math.cos(2 * ph);
          // the spiral ridges: 5 of them winding up at ~25-35 deg (spiral ~1-1.5 rad per metre on a 0.43 m trunk)
          if (irr.spiral) rad *= 1 + 0.07 * Math.cos(5 * ph + 0.7) * Math.min(1, Math.max(0, (y + 0.5) / 1.2));
        }
        if (b.flare) {
          const f = Math.max(0, 1 - (y + 0.5) / (b.flareH ?? 1.6));
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

// sides per level per LOD (LOD 0 and 1 the same on what they share; the secondaries 3-sided: cost); LOD 2 coarser,
// every other ring. The trunk gets 16 sides (the spiral ridges and the flare need them).
const SIDES = [[16, 8, 3], [16, 8], [8, 4]];

export function horseChestnutShape(seedBase, look = true) {
  return (r, lod, seed) => {
    const v = Math.round((seed - seedBase) / 97), park = v >= 4;
    const { branches, pads, fork } = park ? parkTree(r, look) : avenueTree(r, look);
    const bb = new THREE.Box3();
    for (const p of pads) bb.expandByPoint(p.c.clone().addScalar(p.r)).expandByPoint(p.c.clone().addScalar(-p.r));
    const crown = bb.getCenter(new THREE.Vector3()), rad = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    pads.push({ c: crown.clone().lerp(fork, 0.3), r: park ? 2.8 : 2.2 });       // the core (last)
    return {
      crown, rad, clumps: pads,
      cards: park ? [8, 4, 2] : [7, 4, 2], cardScale: park ? 0.64 : 0.66,
      // a heavy, dense dome, but its billows still read (less of the crown's dome in the shading than the copper beech)
      aoOverhead: 0.88, aoFloor: look ? 0.56 : 0.45, crownNormal: 0.5,
      trunk: (l) => barkMesh(branches.filter((b) => b.level <= [2, 1, 1][l]), (lv) => SIDES[l][Math.min(lv, SIDES[l].length - 1)], l === 2 ? 2 : 1),
    };
  };
}

// ------------------------------------------------------------------------------------------------ the species
const lin = (c) => `#${new THREE.Color().setRGB(...c, THREE.LinearSRGBColorSpace).getHexString()}`;

/** The species definition for makeSpecies. tex = loadHorseChestnutTextures(...). o.look (default true): the leaf look
 *  of docs/TREES.md §8 (detail fading with the footprint, soft rim, airier crown, no old impostor bake); false = the
 *  species as first merged (the lab's "before" for A/B). */
export function horseChestnutDef(seedBase = 1000, tex, { look = true } = {}) {
  const S = CHESTNUT_SEASONS[tex.season], mean = tex.leaves.meta.mean_albedo_linear;
  // the palette IS the spray's mean (lighter on top, darker below): the spray's colours come through as drawn
  // (the look: a lighter underside: the crown's inside less of a dark hole)
  const top = mean.map((x) => Math.min(1, x * S.top)), bottom = mean.map((x) => x * S.bottom * (look ? S.lookBottom ?? 1.15 : 1));
  const atlas = look ? fadingLeafAtlas(tex.leaves.atlas, { variation: S.variation, normalK: 0.75, transK: 1 })
    : { ...tex.leaves.atlas, variation: S.variation, normalK: 0.75, transK: 1 };
  return {
    id: "horsechestnut", variants: 6, shape: horseChestnutShape(seedBase, look), leafMask: planeLeafMask, perVariantHeight: true,
    leafLook: look ? (shared, P) => softenRim(shared, P) : null,
    noImpostorBake: look,                       // (the far trees: the impostor kit; the lab turns it back on for farkit=0)
    bark: scanBark({ scans: [tex.bark], target: BARK_TARGET, species: "beech", hueK: 0.85 }),
    seasonal: tex.season,
    maxCardSpin: 0.45,                          // upright sprays (+-26 deg): candles up, twig tips up
    impostorAlphaBoost: 0,
    leafRoughness: 0.78,
    params: {
      seed: seedBase,
      topColor: lin(top), bottomColor: lin(bottom), translucencyColor: S.translucencyColor, translucency: S.translucency,
      tintVar: 0.14, crownLift: 0, fill: look ? 1.6 : 0.5,   // (the look: the shade side lifted, the inside no dark hole)
      fillColor: S.fillColor, aoColor: 0.25, trunkColor: [0.2, 0.18, 0.16],
      leafTone: 0, shadowLift: 2.2,
      leafAtlas: atlas,
    },
  };
}
