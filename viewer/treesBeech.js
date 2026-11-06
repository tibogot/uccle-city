// THE BEECH (Fagus sylvatica): the Sonian Forest's "beech cathedral" and the beeches (green and copper) of the Uccle
// avenues and gardens, the most common street tree of Uccle's regional roads (Bruxelles Mobilité inventory). A species
// of the city's stylized-tree chain (viewer/treesStylized.js makeSpecies), as the plane (viewer/treesPlane.js, whose
// skeleton helpers it uses): the same nested LODs + morph, depth pre-pass, shadow fade, impostors from its own LOD 0.
// Lab only for now (labs/tree-lab.js).
//
// References (data/raw/refs/trees/, Wikimedia Commons, SOURCES.md):
//  - FOREST form (variants 0-3), built CHEAP for forests: a tall, straight, smooth bole clear of branches for ~60 % of
//    the height, a few steep limbs forking high ("V" forks), a narrow, high crown in horizontal tiers (the layered
//    sprays). The bare bole costs a dozen-sided tube; the crown is ~half the plane's pads, all high up.
//  - OPEN-GROWN form (variants 4-5): avenues, squares and gardens: a short bole, long limbs spreading low, a wide dome
//    reaching down to ~3 m.
//  - BARK: smooth silver-grey, the "eyes" (dark almond branch scars with a paler rim, under a dark chevron), pale lichen
//    spots, faint horizontal wrinkles, green algae toward the foot and on one side, buttress roots ("elephant feet").
//  - LEAVES: oval, pointed, wavy-edged, 7-9 straight parallel vein pairs, glossy (lower roughness), two-ranked along
//    zigzag twigs: flat fans (the sprays) drawn on the cards.
import * as THREE from "three/webgpu";
import { positionGeometry, normalGeometry, attribute, vec3, float, mix, smoothstep, mx_noise_float, mx_worley_noise_float, abs, max, fwidth, floor, fract, sin, dot, length, atan } from "three/tsl";
import { bumpNormal } from "./tslkit.js";
import { coverageMips } from "./treesStylized.js";
import { grow, taper, at, dirAt, barkMesh } from "./treesPlane.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ leaf mask
let maskTex = null;
/** 512 px RG: .r coverage (flat sprays of oval leaves on zigzag twigs, rounded off), .g each leaf's tone + veins. */
export function beechLeafMask() {
  if (maskTex) return maskTex;
  const N = 512;
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, N, N); return g; };
  const cov = mk(), tone = mk();
  tone.fillStyle = "rgb(128,128,128)"; tone.fillRect(0, 0, N, N);
  let s = 778899;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  // a beech leaf in its frame: x along the midrib (0 = base .. len = tip), ovate, the tip pointed, the margin wavy
  const outline = (len, wav) => {
    const pts = [];
    const half = (t) => len * 0.31 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.94 + 0.03)), 0.75) * (1 - 0.3 * t) * (1 + 0.045 * Math.sin(t * Math.PI * 9 + wav));
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([t * len, -half(t)]); }
    for (let i = 40; i >= 0; i--) { const t = i / 40; pts.push([t * len, half(t)]); }
    return pts;
  };
  // sprays: zigzag twigs from the centre out, leaves alternate left / right, all flat (a fan seen from above),
  // smaller toward the tip
  const leaves = [], twigs = [];
  const NS = 10;
  for (let k = 0; k < NS; k++) {
    const a = (k / NS) * Math.PI * 2 + rnd() * 0.5;
    const L = N * (0.3 + rnd() * 0.12);
    let x = N / 2 + Math.cos(a) * N * 0.05, y = N / 2 + Math.sin(a) * N * 0.05;
    const nL = 7 + Math.floor(rnd() * 3), seg = L / nL;
    const path = [[x, y]];
    for (let i = 0; i < nL; i++) {
      const zig = (i % 2 ? 1 : -1) * 0.22, d = a + zig + (rnd() - 0.5) * 0.1;
      x += Math.cos(d) * seg; y += Math.sin(d) * seg; path.push([x, y]);
      const side = i % 2 ? 1 : -1, size = 1 - 0.45 * (i / nL);
      leaves.push({ x, y, ang: a + side * (0.95 + rnd() * 0.35), len: N * (0.125 + rnd() * 0.025) * size, squash: 0.8 + rnd() * 0.2, tone: 0.4 + rnd() * 0.32, wav: rnd() * 6 });
    }
    leaves.push({ x, y, ang: a + (rnd() - 0.5) * 0.3, len: N * 0.075, squash: 0.9, tone: 0.55 + rnd() * 0.2, wav: rnd() * 6 });   // the terminal leaf
    twigs.push(path);
  }
  for (let i = 0; i < 34; i++) {             // leaves of sprays behind (fill)
    const r = Math.sqrt(rnd()) * N * 0.3, a = rnd() * Math.PI * 2;
    leaves.push({ x: N / 2 + Math.cos(a) * r, y: N / 2 + Math.sin(a) * r, ang: rnd() * Math.PI * 2, len: N * (0.1 + rnd() * 0.03), squash: 0.6 + rnd() * 0.4, tone: 0.28 + rnd() * 0.22, wav: rnd() * 6 });
  }
  leaves.sort((p, q) => Math.hypot(p.x - N / 2, p.y - N / 2) - Math.hypot(q.x - N / 2, q.y - N / 2));
  for (const path of twigs) for (const [g, col] of [[cov, "#fff"], [tone, "rgb(35,35,35)"]]) {
    g.strokeStyle = col; g.lineWidth = 2.2; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  for (const L of leaves) {
    const pts = outline(L.len, L.wav);
    const path = (g) => {
      g.save(); g.translate(L.x, L.y); g.rotate(L.ang); g.scale(1, L.squash); g.translate(L.len * 0.06, 0);
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    };
    tone.save(); tone.globalAlpha = 0.28; tone.translate(5, 7); path(tone); tone.fillStyle = "#000"; tone.fill(); tone.restore(); tone.restore();
    path(cov); cov.fillStyle = "#fff"; cov.fill(); cov.restore();
    path(tone);
    const v = Math.round(L.tone * 255);
    const gr = tone.createLinearGradient(0, -L.len * 0.3, 0, L.len * 0.3);       // glossy: one half of the blade lighter
    gr.addColorStop(0, `rgb(${v + 22},${v + 22},${v + 22})`); gr.addColorStop(1, `rgb(${v - 18},${v - 18},${v - 18})`);
    tone.fillStyle = gr; tone.fill();
    tone.strokeStyle = "rgba(255,255,255,0.22)"; tone.lineWidth = 1.2;
    tone.beginPath(); tone.moveTo(0, 0); tone.lineTo(L.len * 0.95, 0); tone.stroke();                 // midrib
    tone.lineWidth = 0.9;
    for (let k = 1; k <= 7; k++) {                                                                   // parallel veins
      const t = k / 8.5, x0 = t * L.len, w = L.len * 0.28 * Math.sin(Math.PI * t);
      for (const sg of [-1, 1]) { tone.beginPath(); tone.moveTo(x0, 0); tone.lineTo(x0 + w * 0.75, sg * w); tone.stroke(); }
    }
    tone.restore();
  }
  const dc = cov.getImageData(0, 0, N, N).data, dt = tone.getImageData(0, 0, N, N).data;
  const R = new Uint8Array(N * N), G = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const rr = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2), k = Math.max(0, Math.min(1, (1 - rr) / 0.1)), i = y * N + x;
    R[i] = dc[i * 4] * k; G[i] = dt[i * 4];
  }
  const mipsR = coverageMips(R, N), mips = [];
  let g = G, w = N;
  for (let l = 0; l < mipsR.length; l++) {
    const rg = new Uint8Array(w * w * 2);
    for (let i = 0; i < w * w; i++) { rg[i * 2] = mipsR[l].data[i]; rg[i * 2 + 1] = g[i]; }
    mips.push({ data: rg, width: w, height: w });
    if (w === 1) break;
    const h = w >> 1, ng = new Uint8Array(h * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) { const i = 2 * y * w + 2 * x; ng[y * h + x] = (g[i] + g[i + 1] + g[i + w] + g[i + w + 1]) >> 2; }
    g = ng; w = h;
  }
  maskTex = new THREE.DataTexture(mips[0].data, N, N, THREE.RGFormat, THREE.UnsignedByteType);
  maskTex.mipmaps = mips; maskTex.generateMipmaps = false; maskTex.colorSpace = THREE.NoColorSpace;
  maskTex.magFilter = THREE.LinearFilter; maskTex.minFilter = THREE.LinearMipmapLinearFilter; maskTex.anisotropy = 4; maskTex.flipY = false;
  maskTex.needsUpdate = true;
  maskTex.userData.preview = () => { const c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d"), im = x.createImageData(N, N); for (let i = 0; i < N * N; i++) { const v = G[i] * R[i] / 255; im.data[i * 4] = v * 0.75; im.data[i * 4 + 1] = v * 1.15; im.data[i * 4 + 2] = v * 0.45; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); return c; };
  return maskTex;
}

// ------------------------------------------------------------------------------------------------ skeleton
/** A crown grown into a dome envelope (as the plane's): goals spread over it on a Fibonacci spiral, each grown from
 *  the nearest limb; `tiers` > 0 snaps the goals' heights toward that many horizontal layers (the beech's layered
 *  sprays, seen as tiers of foliage in a forest). Returns the pads; pushes the branches. */
function crownInto(r, { limbs, branches, env, cy, NG, elMin, tiers = 0, padR, twigP, twigR }) {
  const rr = (a, b) => a + (b - a) * r();
  const pads = [];
  const s0 = Math.sin(THREE.MathUtils.degToRad(elMin));
  const angDist = (x, y) => Math.abs(((x - y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  for (let k = 0; k < NG; k++) {
    let el = THREE.MathUtils.radToDeg(Math.asin(s0 + (1 - s0) * ((k + 0.5) / NG))) + rr(-5, 5);
    if (tiers) { const step = (90 - elMin) / tiers, q = elMin + Math.round((el - elMin) / step) * step; el = THREE.MathUtils.lerp(el, q, 0.6); }
    const a = k * 2.39996 + rr(-0.15, 0.15);
    const L = el > 60 ? limbs[limbs.length - 1] : limbs.slice(0, -1).reduce((b, l) => (angDist(l.az, a) < angDist(b.az, a) ? l : b));
    const t = L.leader ? rr(0.35, 0.95) : THREE.MathUtils.clamp(0.25 + (el - elMin) / (90 - elMin) * 0.7 + rr(-0.05, 0.05), 0.2, 0.98);
    const from = at(L.pts, t);
    const pr = rr(...padR);
    const e0 = env(a, el);
    const goal = e0.clone().addScaledVector(e0.clone().sub(V(0, cy, 0)).normalize(), -pr * 0.55);
    const sd = goal.clone().sub(from), sl = sd.length();
    if (sl < 0.8) continue;
    // beech branches end in flat, near-level sprays: the secondaries level out (droop) toward their tips
    const sp = grow(r, from, sd.normalize().lerp(V(0, 1, 0), 0.1), sl, 4, { pull: sd, pullK: 0.3, wiggle: 0.22, droop: 0.18 });
    branches.push({ pts: sp, rad: taper(Math.max(0.025, taper(L.rB, 0.05)(t) * 0.45), 0.014), level: 2 });
    pads.push({ c: sp[sp.length - 1].clone(), r: pr });
    if (r() < twigP) {
      const pr2 = rr(...twigR), a2 = a + rr(-0.3, 0.3), el2 = el + rr(-12, 12) * (tiers ? 0.4 : 1);
      const e2 = env(a2, el2), g2 = e2.clone().addScaledVector(e2.clone().sub(V(0, cy, 0)).normalize(), -pr2 * 0.6), f2 = at(sp, 0.5);
      if (g2.distanceTo(f2) > 0.6) {
        const tw = grow(r, f2, g2.clone().sub(f2).normalize(), g2.distanceTo(f2), 2, { wiggle: 0.2 });
        branches.push({ pts: tw, rad: taper(0.022, 0.01), level: 3 });
        pads.push({ c: tw[tw.length - 1].clone(), r: pr2 });
      }
    }
  }
  return pads;
}

/** The forest beech: a tall straight bole, a few steep limbs forking high, a narrow high crown in tiers. */
function forestBeech(r, v) {
  const branches = [];
  const rr = (a, b) => a + (b - a) * r();
  const top = rr(28, 31), yb = top * rr(0.5, 0.56), W = top * rr(0.24, 0.28);
  const cy = yb + (top - yb) * 0.42;
  const env = (az, el) => {
    const e = THREE.MathUtils.degToRad(el), up = e > 0 ? top - cy : cy - yb;
    const wob = 1 + 0.1 * Math.sin(az * 3 + v * 1.7) + 0.06 * Math.sin(az * 5 + v);
    return V(Math.cos(az) * Math.cos(e) * W * wob, cy + Math.sin(e) * up, Math.sin(az) * Math.cos(e) * W * wob);
  };
  const lean = V(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.05);
  const trunk = grow(r, V(0, -0.5, 0), V(lean.x, 1, lean.z), top - 1.5, 14, { pull: V(0, 1, 0), pullK: 0.15, wiggle: 0.04 });
  const trunkR = (t) => 0.4 * (1 - 0.55 * Math.pow(t, 1.3)) + 0.02;
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true, flareH: 2.2, flareAmp: 0.6, flareLobe: 0.45, flareN: 6 });
  // 3-4 steep limbs from the fork (a beech forks high into a "V", the leader carries on)
  const nL = 3 + Math.floor(r() * 2), limbs = [];
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nL; i++) {
    az += (Math.PI * 2) / nL + (r() - 0.5) * 0.5;
    const tOn = THREE.MathUtils.clamp((yb - 0.5 + i * 1.2) / (top - 1.5), 0, 0.85), from = at(trunk, tOn);
    const goal = env(az, rr(30, 60)).multiply(V(0.72, 1, 0.72)).add(V(0, 0, 0));
    const pts = grow(r, from, goal.clone().sub(from).normalize().lerp(V(0, 1, 0), 0.35), goal.distanceTo(from), 6, { pull: goal.clone().sub(from).normalize(), pullK: 0.25, wiggle: 0.12 });
    const rB = trunkR(tOn) * rr(0.55, 0.68);
    branches.push({ pts, rad: taper(rB, 0.05), level: 1 });
    limbs.push({ pts, rB, az });
  }
  limbs.push({ pts: trunk.slice(Math.floor(trunk.length * 0.6)), rB: trunkR(0.6), az: 0, leader: true });
  const NG = Math.round(20 * (W / 7.8) ** 2);
  const pads = crownInto(r, { limbs, branches, env, cy, NG, elMin: -25, tiers: 4, padR: [2.0, 2.5], twigP: 0.55, twigR: [1.6, 2.0] });
  return { branches, pads, fork: at(trunk, yb / (top - 1.5)) };
}

/** The open-grown beech (avenues, gardens): a short bole, long limbs spreading low, a wide dome reaching ~3 m. */
function openBeech(r, v) {
  const branches = [];
  const rr = (a, b) => a + (b - a) * r();
  const top = rr(21, 24), yb = rr(2.6, 3.4), W = rr(9.0, 10.5);
  const cy = yb + (top - yb) * 0.33;
  const env = (az, el) => {
    const e = THREE.MathUtils.degToRad(el), up = e > 0 ? top - cy : cy - yb;
    const wob = 1 + 0.08 * Math.sin(az * 3 + v) + 0.05 * Math.sin(az * 5 + 2 * v);
    return V(Math.cos(az) * Math.cos(e) * W * wob, cy + Math.sin(e) * up, Math.sin(az) * Math.cos(e) * W * wob);
  };
  const trunk = grow(r, V(0, -0.5, 0), V((r() - 0.5) * 0.1, 1, (r() - 0.5) * 0.1), top - 3, 12, { pull: V(0, 1, 0), pullK: 0.12, wiggle: 0.08 });
  const trunkR = taper(0.55, 0.08);
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true, flareH: 1.8, flareAmp: 0.65, flareLobe: 0.45, flareN: 6 });
  const nL = 6 + Math.floor(r() * 2), limbs = [];
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nL; i++) {
    az += (Math.PI * 2) / nL + (r() - 0.5) * 0.35;
    const h01 = i / (nL - 1);
    const tOn = THREE.MathUtils.clamp((yb + 0.2 + h01 * 4.5) / (top - 3), 0, 0.6), from = at(trunk, tOn);
    const goal = env(az, 12 + h01 * 35 + rr(-6, 6)).multiplyScalar(0.7).add(V(0, cy * 0.3, 0));
    const pts = grow(r, from, goal.clone().sub(from).normalize().lerp(V(0, 1, 0), 0.25), goal.distanceTo(from), 8, { pull: goal.clone().sub(from).normalize(), pullK: 0.22, wiggle: 0.22, droop: 0.05 });
    const rB = trunkR(tOn) * rr(0.55, 0.66);
    branches.push({ pts, rad: taper(rB, 0.06), level: 1 });
    limbs.push({ pts, rB, az });
  }
  limbs.push({ pts: trunk.slice(Math.floor(trunk.length * 0.5)), rB: trunkR(0.5), az: 0, leader: true });
  const NG = Math.round(40 * (W / 8.4) ** 2);
  const pads = crownInto(r, { limbs, branches, env, cy, NG, elMin: -55, tiers: 0, padR: [2.1, 2.6], twigP: 0.85, twigR: [1.7, 2.1] });
  return { branches, pads, fork: at(trunk, (yb + 1) / (top - 3)) };
}

// sides per level per LOD (LOD 0 and 1 the same on what they share: no outline change at 40 m); LOD 2 coarser
const SIDES = [[12, 8, 5, 4], [12, 8], [6, 4]];

export function beechShape(seedBase) {
  return (r, lod, seed) => {
    const v = Math.round((seed - seedBase) / 97), open = v >= 4;
    const { branches, pads, fork } = open ? openBeech(r, v) : forestBeech(r, v);
    const bb = new THREE.Box3();
    for (const p of pads) bb.expandByPoint(p.c.clone().addScalar(p.r)).expandByPoint(p.c.clone().addScalar(-p.r));
    const crown = bb.getCenter(new THREE.Vector3()), rad = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    pads.push({ c: crown.clone().lerp(fork, 0.3), r: open ? 2.2 : 1.8 });
    return {
      crown, rad, clumps: pads,
      // the forest form is built for 4,500-tree tiles: ~30 pads of 9 / 4 / 2 cards, LOD 2 ~70 cards
      cards: open ? [10, 4, 2] : [8, 3, 2], cardScale: open ? 0.6 : 0.68,
      // more of the crown's dome in the shading than the plane (0.2): a beech crown reads as one smooth mass, and with
      // glossy leaves each pad's own dome made "broccoli" balls
      aoOverhead: 0.95, aoFloor: 0.45, crownNormal: 0.5,
      trunk: (l) => barkMesh(branches.filter((b) => b.level <= [3, 1, 1][l]), (lv) => SIDES[l][Math.min(lv, SIDES[l].length - 1)], l === 2 ? 2 : 1),
    };
  };
}

// ------------------------------------------------------------------------------------------------ bark
/** Smooth silver-grey beech bark (TSL, tree space): a soft tonal mottle, faint horizontal wrinkles, the "eyes" (branch
 *  scars: a dark almond with a paler rim under a dark chevron), pale lichen spots, green algae toward the foot and on
 *  one side, darker damp roots. Filtered with the pixel footprint; fades to its mean colour with distance. */
export function beechBark(m) {
  const p = positionGeometry, level = attribute("bark", "vec4").w;
  const q = vec3(p.x, p.y, p.z).mul(3.0);
  const fw = max(fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)), 1e-4);
  const far = smoothstep(0.3, 1.6, fw), near = float(1).sub(far);
  // base: silver-grey, cool to warm in big soft zones
  const zone = mx_noise_float(q.mul(0.35).add(3.0));
  let col = mix(vec3(0.19, 0.195, 0.19), vec3(0.25, 0.24, 0.215), smoothstep(-0.4, 0.4, zone));   // (photos: mid-grey, warmer in places)
  const mott = mx_noise_float(q.mul(1.4).add(11.0)).mul(0.45).add(mx_noise_float(q.mul(4.0).add(5.0)).mul(0.3)).add(mx_noise_float(q.mul(11.0).add(2.0)).mul(0.25));
  col = col.mul(mott.mul(0.3).mul(near).add(1));
  col = mix(col, col.mul(vec3(0.95, 1.0, 0.86)), smoothstep(0.1, 0.6, mx_noise_float(q.mul(0.6).add(33.0))).mul(0.6));   // greenish-brown zones
  // faint horizontal wrinkles (the bark stretching as the trunk grows)
  const wr = mx_noise_float(vec3(p.x.mul(6.0), p.y.mul(38.0), p.z.mul(6.0)));
  const wrinkle = smoothstep(0.45, 0.85, wr).mul(0.6).mul(near).mul(smoothstep(0.0, 0.5, mx_noise_float(q.mul(0.8).add(21.0))));
  col = col.mul(float(1).sub(wrinkle.mul(0.12)));
  // the eyes: one per cell of a stretched grid (some cells only), a flat horizontal almond, its upper rim a chevron
  // (on the trunk's own cylinder: the angle round the ring centre (bark.xyz) x the height; 7 cells round, a whole number so
  // the atan2 seam falls on a cell edge)
  const ax = attribute("bark", "vec4").xyz, th = atan(p.z.sub(ax.z), p.x.sub(ax.x));
  const eg = vec3(th.div(Math.PI * 2).mul(7.0), p.y.mul(1.3), 0), ec = floor(eg), ef0 = fract(eg).sub(0.5);
  const eh = fract(sin(dot(ec, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  // each eye its own size and a wobbly, almond outline (pointed ends: |x|^1.4), its edge soft (healed bark)
  const esz = eh.mul(0.6).add(0.7);
  const wob = mx_noise_float(vec3(eg.x.mul(6.0), eg.y.mul(6.0), ec.x.add(ec.y.mul(7.0)))).mul(0.05);
  const ef = vec3(ef0.x.sub(eh.sub(0.5).mul(0.3)).div(esz), ef0.y.sub(fract(eh.mul(7.0)).sub(0.5).mul(0.35)).div(esz), 0);   // jittered in its cell
  const taperY = float(1).sub(smoothstep(0.0, 0.2, abs(ef.x)).mul(0.65));                 // the almond: thinner toward the ends
  const ed = length(vec3(ef.x, ef.y.add(wob).mul(4.2).div(taperY), 0));
  const eyeOn = smoothstep(0.62, 0.68, eh).mul(smoothstep(0.5, 1.5, level).oneMinus());   // (a third of the cells: no visible grid)
  const eyeW = fw.mul(0.4).add(0.05);
  const eye = float(1).sub(smoothstep(float(0.2).sub(eyeW), float(0.2).add(eyeW), ed)).mul(eyeOn);
  const rim = float(1).sub(smoothstep(float(0), eyeW.mul(1.5), abs(ed.sub(0.28)))).mul(eyeOn);
  // the "moustache" over it: a wide, soft chevron, broken by noise
  const chevY = ef.y.sub(0.12).sub(abs(ef.x).mul(0.34)).add(wob);
  const chev = float(1).sub(smoothstep(float(0), eyeW.mul(2.2), abs(chevY))).mul(smoothstep(0.46, 0.15, abs(ef.x)))
    .mul(smoothstep(-0.2, 0.3, mx_noise_float(vec3(eg.x.mul(9.0), eg.y.mul(3.0), 1.0)))).mul(eyeOn);
  col = mix(col, vec3(0.1, 0.095, 0.085), eye.mul(0.65).mul(near));
  col = mix(col, vec3(0.38, 0.37, 0.35), rim.mul(0.06).mul(near));
  col = mix(col, vec3(0.12, 0.115, 0.1), chev.mul(0.5).mul(near));
  // lichen: pale spots (warped Worley, ragged edges), clustered
  const lw = mx_worley_noise_float(q.mul(3.2).add(vec3(mx_noise_float(q.mul(2.0)), 0, mx_noise_float(q.mul(2.0).add(5.0))).mul(0.35)).add(7.0));
  const lichen = smoothstep(0.3, 0.18, lw.add(mx_noise_float(q.mul(9.0)).mul(0.08))).mul(smoothstep(0.1, 0.5, mx_noise_float(q.mul(0.9).add(41.0)))).mul(near);
  col = mix(col, vec3(0.5, 0.52, 0.47), lichen.mul(0.7));
  // green algae: toward the foot and on one side of the trunk (the damp side), patchy
  const side = smoothstep(-0.2, 0.8, normalGeometry.x.mul(0.6).add(normalGeometry.z.mul(-0.8)));
  const algae = smoothstep(4.0, 0.3, p.y).max(side.mul(0.55)).mul(smoothstep(-0.2, 0.4, mx_noise_float(q.mul(0.7).add(9.0))));
  col = mix(col, vec3(0.11, 0.15, 0.07), algae.mul(0.6));
  // the roots: darker, damp, earth
  col = col.mul(smoothstep(-0.5, 0.6, p.y).mul(0.4).add(0.6));
  // limbs a little lighter and cleaner
  col = mix(col, col.mul(1.08), smoothstep(0.5, 1.5, level));
  col = mix(col, vec3(0.2, 0.2, 0.185), far.mul(0.7));
  m.colorNode = col;
  const h = wrinkle.mul(0.0015).negate().sub(eye.mul(0.0004)).add(lichen.mul(0.0006)).mul(near);
  m.normalNode = bumpNormal(h);
  m.roughnessNode = mix(float(0.78), float(0.95), max(lichen, algae.mul(0.8)));   // smooth bark has a soft sheen
  m.needsUpdate = true;
}

/** The species definition for makeSpecies. */
export function beechDef(seedBase = 1000) {
  return {
    id: "beech", variants: 6, shape: beechShape(seedBase), leafMask: beechLeafMask, bark: beechBark, perVariantHeight: true,
    impostorAlphaBoost: 0,                      // (as the plane: dense crowns, the 0.3 boost made far quads opaque)
    leafRoughness: 0.55,                        // glossy leaves (the street trees and the plane: 0.9)
    params: {
      seed: seedBase,
      // summer beech: a clean mid green with a cool cast, lime where the light comes through
      topColor: "#6f9c3c", bottomColor: "#5c8b35", translucencyColor: "#bce064", tintVar: 0.18,
      crownLift: 0, fill: 0.4, fillColor: "#8fae7c", aoColor: 0.22, trunkColor: [0.27, 0.27, 0.26],
      leafTone: 0.5, shadowLift: 2.2,
    },
  };
}
