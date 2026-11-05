// THE LONDON PLANE (Platanus x acerifolia): the big trees of Place de Saint-Job and the Uccle avenues (Av. Churchill,
// Av. Brugmann, Av. de Fré: Bruxelles Mobilité's street-tree inventory), as a species of the city's stylized-tree
// chain (viewer/treesStylized.js makeSpecies): the same nested LODs + morph, shape-keeping, depth pre-pass, shadow
// fade, impostors baked from its own LOD 0. Lab only for now (labs/tree-lab.js); not in the city.
//
// What makes it a plane and not "a tree" (references: data/raw/refs/trees/, Wikimedia Commons, SOURCES.md):
//  - FORM: a straight clear bole (pruned for traffic), a leader that goes on to ~2/3 of the height, 5-7 big
//    scaffold limbs rising at 30-60 degrees and spreading, sinuous ("elbowed"), secondaries drooping a little at their
//    ends; the crown a broad, clumpy dome with sky and dark interior between the clumps. Variants 0-3.
//  - POLLARD (squares, the "tête de chat" planes): a short thick bole, 3-5 short limbs ending in knuckled heads, a
//    brush of straight one-year shoots rising from each head; a compact crown. Variants 4-5.
//  - BARK: the camouflage of flaking plates (olive, grey-green, cream, pale yellow, brown), darker and scalier at the
//    foot of old trees, paler and smoother on the limbs. Procedural (TSL), in the tree's own space.
//  - LEAVES: large palmate 3-5 lobed leaves on the cards (a 512 px mask drawn here, with each leaf's own tone,
//    lighter veins and the shade of the leaves above in .g: vendor CHANGES #12).
import * as THREE from "three/webgpu";
import {
  positionGeometry, normalGeometry, attribute, vec3, float, mix, smoothstep, mx_noise_float, abs, max, min, fwidth, clamp,
} from "three/tsl";
import { bumpNormal } from "./tslkit.js";
import { coverageMips } from "./treesStylized.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ leaf mask
let maskTex = null;
/** 512 px, RG: .r coverage (a cluster of palmate leaves on a few twigs, rounded off), .g the leaf's tone. */
export function planeLeafMask() {
  if (maskTex) return maskTex;
  const N = 512;
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, N, N); return [c, g]; };
  const [, cov] = mk(), [, tone] = mk();
  tone.fillStyle = "rgb(128,128,128)"; tone.fillRect(0, 0, N, N);
  let s = 424242;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  // a plane leaf in its own frame: x along the midrib (base at 0, tip at 1), 5 pointed lobes (central the longest),
  // a few big teeth, a truncate base; returns the outline (len = midrib length in px)
  const lobes = [[0, 1], [0.78, 0.8], [-0.78, 0.8], [1.55, 0.45], [-1.55, 0.45]];
  const outline = (len, wobble) => {
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const th = -Math.PI + (i / 120) * Math.PI * 2;
      let r = 0.2;
      for (const [a, L] of lobes) {
        const x = th - a * (1 + wobble * 0.1);
        const c = Math.max(0, Math.cos(x * 1.9));
        r = Math.max(r, L * Math.pow(c, 2.2));
      }
      // teeth on the lobe sides, a notch at the base (the petiole)
      r *= 1 + 0.07 * Math.pow(Math.max(0, Math.sin(th * 13 + wobble)), 6);
      if (Math.abs(Math.abs(th) - Math.PI) < 0.35) r *= 0.55 + 0.45 * (Math.abs(Math.abs(th) - Math.PI) / 0.35);
      pts.push([Math.cos(th) * r * len * 0.62, Math.sin(th) * r * len * 0.62]);
    }
    return pts;
  };
  const twigs = [];
  // 7 twigs from near the centre outwards (a shoot seen through the cluster), leaves alternate along them
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.7, L = N * (0.28 + rnd() * 0.14);
    const sx = N / 2 + Math.cos(a + 2) * N * 0.04, sy = N / 2 + Math.sin(a + 2) * N * 0.04;
    const ex = N / 2 + Math.cos(a) * L, ey = N / 2 + Math.sin(a) * L;
    const mx = (sx + ex) / 2 + Math.cos(a + 1.57) * L * 0.12, my = (sy + ey) / 2 + Math.sin(a + 1.57) * L * 0.12;
    twigs.push({ sx, sy, mx, my, ex, ey, a });
  }
  const leaves = [];
  for (const t of twigs) {
    const n = 9 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const u = 0.18 + (k / n) * 0.9, w = 1 - u;
      const x = w * w * t.sx + 2 * w * u * t.mx + u * u * t.ex, y = w * w * t.sy + 2 * w * u * t.my + u * u * t.ey;
      const side = k % 2 ? 1 : -1;
      leaves.push({ x, y, ang: t.a + side * (0.7 + rnd() * 0.6), len: N * (0.1 + rnd() * 0.045), squash: 0.55 + rnd() * 0.45, tone: 0.32 + rnd() * 0.4, wob: rnd() * 6 });
    }
  }
  for (let i = 0; i < 34; i++) {          // loose leaves filling the cluster (other shoots behind)
    const r = Math.sqrt(rnd()) * N * 0.3, a = rnd() * Math.PI * 2;
    leaves.push({ x: N / 2 + Math.cos(a) * r, y: N / 2 + Math.sin(a) * r, ang: rnd() * Math.PI * 2, len: N * (0.085 + rnd() * 0.04), squash: 0.5 + rnd() * 0.5, tone: 0.25 + rnd() * 0.3, wob: rnd() * 6 });
  }
  // back to front: the outer leaves (drawn last) over the inner ones
  leaves.sort((p, q) => Math.hypot(p.x - N / 2, p.y - N / 2) - Math.hypot(q.x - N / 2, q.y - N / 2));
  // twigs first (tone dark)
  for (const t of twigs) for (const [g, col] of [[cov, "#fff"], [tone, "rgb(40,40,40)"]]) {
    g.strokeStyle = col; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(t.sx, t.sy); g.quadraticCurveTo(t.mx, t.my, t.ex, t.ey); g.stroke();
  }
  for (const L of leaves) {
    const pts = outline(L.len, L.wob);
    const path = (g) => {
      g.save(); g.translate(L.x, L.y); g.rotate(L.ang); g.scale(1, L.squash);   // squash: the leaf seen at a slant
      g.translate(L.len * 0.18, 0);                                             // (the petiole)
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + L.len * 0.42, y) : g.moveTo(x + L.len * 0.42, y))); g.closePath();
    };
    // the shade this leaf casts on the leaves under it (tone only, soft, offset down-right)
    tone.save(); tone.globalAlpha = 0.3; tone.translate(6, 8); path(tone); tone.fillStyle = "#000"; tone.fill(); tone.restore(); tone.restore();
    path(cov); cov.fillStyle = "#fff"; cov.fill(); cov.restore();
    path(tone);
    const v = Math.round(L.tone * 255);
    // darker toward the petiole (the leaf cups), lighter at the lobes
    const gr = tone.createRadialGradient(L.len * 0.42, 0, 0, L.len * 0.42, 0, L.len * 0.7);
    gr.addColorStop(0, `rgb(${v - 35},${v - 35},${v - 35})`); gr.addColorStop(1, `rgb(${v + 15},${v + 15},${v + 15})`);
    tone.fillStyle = gr; tone.fill();
    // the veins: midrib + the lobes' ribs from the petiole, lighter
    tone.strokeStyle = `rgba(255,255,255,0.28)`; tone.lineWidth = 1.4;
    for (const [a, l] of lobes) { tone.beginPath(); tone.moveTo(L.len * 0.42 - L.len * 0.08, 0); tone.lineTo(L.len * 0.42 + Math.cos(a) * l * L.len * 0.55, Math.sin(a) * l * L.len * 0.55); tone.stroke(); }
    tone.restore();
  }
  const dc = cov.getImageData(0, 0, N, N).data, dt = tone.getImageData(0, 0, N, N).data;
  // round the cluster off so the card's square never shows
  const R = new Uint8Array(N * N), G = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const rr = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2);
    const k = Math.max(0, Math.min(1, (1 - rr) / 0.1));
    const i = y * N + x;
    R[i] = dc[i * 4] * k; G[i] = dt[i * 4];
  }
  // coverage-preserving mips for .r (treesStylized.js coverageMips), plain box mips for .g, interleaved RG
  const mipsR = coverageMips(R, N);
  const mips = [];
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
  maskTex.mipmaps = mips;
  maskTex.generateMipmaps = false;
  maskTex.colorSpace = THREE.NoColorSpace;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.minFilter = THREE.LinearMipmapLinearFilter;
  maskTex.anisotropy = 4;
  maskTex.flipY = false;
  maskTex.needsUpdate = true;
  maskTex.userData.preview = () => { const c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d"), im = x.createImageData(N, N); for (let i = 0; i < N * N; i++) { im.data[i * 4] = G[i] * R[i] / 255; im.data[i * 4 + 1] = G[i] * R[i] / 255 * 1.2; im.data[i * 4 + 2] = G[i] * R[i] / 255 * 0.5; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); return c; };
  return maskTex;
}

// ------------------------------------------------------------------------------------------------ skeleton
/** A limb grown in steps: from `start` along `dir`, bending toward `pull` (a direction it turns to, e.g. outward
 *  and up), with a wobble ("elbows"), and drooping at its end. Returns the points. */
function grow(r, start, dir, len, n, { pull = null, pullK = 0.25, wiggle = 0.18, droop = 0 } = {}) {
  const pts = [start.clone()];
  const d = dir.clone().normalize(), step = len / n, p = start.clone();
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (pull) d.lerp(pull, pullK).normalize();
    d.add(V((r() - 0.5) * wiggle, (r() - 0.5) * wiggle * 0.5, (r() - 0.5) * wiggle)).normalize();
    if (droop) d.y -= droop * t * t, d.normalize();
    p.addScaledVector(d, step);
    pts.push(p.clone());
  }
  return pts;
}
/** radius along a branch (t 0..1) */
const taper = (r0, r1) => (t) => r0 + (r1 - r0) * Math.pow(t, 0.8);
const at = (pts, t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i; return pts[i].clone().lerp(pts[i + 1], u); };
const dirAt = (pts, t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)); return pts[i + 1].clone().sub(pts[i]).normalize(); };
const outward = (d, k = 1) => { const h = V(d.x, 0, d.z); return h.lengthSq() < 1e-6 ? V(1, 0, 0) : h.normalize().multiplyScalar(k); };

/** The natural (avenue / square) plane. The crown is grown INTO an envelope, a broad dome (the plane's crown is about
 *  as wide as it is tall above the bole): each scaffold limb owns a sector of it; every secondary grows from its limb
 *  toward a point of the envelope in that sector (lower on the limb = lower on the dome), its twigs toward points
 *  near it, and the leaf pads sit at their tips just inside the envelope. So the pads cover the dome's top AND its
 *  sides down to the bole, with gaps between them, instead of an umbrella of tips. */
function naturalPlane(r, v) {
  const branches = [], pads = [];
  const rr = (a, b) => a + (b - a) * r();
  const square = v % 2 === 1;                  // the squares' planes: lower fork, broader; avenues: a taller bole
  const bole = square ? rr(3.0, 3.8) : rr(4.4, 5.6);
  const top = rr(17, 19.5);                    // crown top (m above the foot)
  const W = (square ? rr(8.8, 10) : rr(7.8, 9.0));   // crown half width
  const yb = bole + 0.6, cy = yb + (top - yb) * 0.36;
  const env = (az, el, k = 1) => {             // a point of the envelope (el: -90..90 deg around cy), k = share of it
    const e = THREE.MathUtils.degToRad(el), up = e > 0 ? top - cy : cy - yb;
    const wob = 1 + 0.08 * Math.sin(az * 3 + v) + 0.06 * Math.sin(az * 5 + 2 * v);   // not a perfect dome: lobes
    return V(Math.cos(az) * Math.cos(e) * W * wob * k, cy + Math.sin(e) * up * k, Math.sin(az) * Math.cos(e) * W * wob * k);
  };
  const lean = V(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.1);
  const leaderLen = top - 2.5;
  const trunk = grow(r, V(0, -0.5, 0), V(lean.x, 1, lean.z), leaderLen + 0.5, 14, { pull: V(0, 1, 0), pullK: 0.12, wiggle: 0.1 });
  const trunkR = taper(0.46, 0.08);
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true });
  const nS = 5 + Math.floor(r() * 2);
  let az = r() * Math.PI * 2;
  const limbs = [];
  for (let i = 0; i < nS; i++) {
    az += (Math.PI * 2) / nS + (r() - 0.5) * 0.35;
    const h01 = i / (nS - 1);
    const tOn = THREE.MathUtils.clamp((bole + 0.3 + h01 * (square ? 3.5 : 4.5)) / (leaderLen + 0.5), 0, 0.7);
    const from = at(trunk, tOn);
    // the limb heads for ~65 % of the way to the envelope, rising (lower limbs flatter)
    const goal = env(az, 18 + h01 * 30 + rr(-6, 6), 0.68);
    const len = goal.distanceTo(from);
    const pts = grow(r, from, goal.clone().sub(from).normalize().lerp(V(0, 1, 0), 0.25), len, 8, { pull: goal.clone().sub(from).normalize(), pullK: 0.22, wiggle: 0.3, droop: 0.06 });
    const rB = trunkR(tOn) * rr(0.6, 0.7);
    branches.push({ pts, rad: taper(rB, 0.06), level: 1 });
    limbs.push({ pts, rB, az, sector: (Math.PI * 2) / nS });
  }
  limbs.push({ pts: trunk.slice(Math.floor(trunk.length * 0.5)), rB: trunkR(0.5), az: 0, sector: Math.PI * 2, leader: true });
  // the secondaries' goals: spread evenly over the dome (a Fibonacci spiral over its surface from 40 deg below the
  // crown's centre to the top, jittered), each grown from the limb nearest to it in azimuth (the leader takes the cap),
  // from lower on the limb for a lower goal: no bald patch whatever the side
  const NG = Math.round(34 * (W / 8.4) ** 2), goals = [];   // (as many as the dome's area asks: the broad squares' planes more)
  const s0 = Math.sin(THREE.MathUtils.degToRad(-32));
  for (let k = 0; k < NG; k++) {
    const sEl = s0 + (1 - s0) * ((k + 0.5) / NG);
    goals.push({ el: THREE.MathUtils.radToDeg(Math.asin(sEl)) + rr(-5, 5), a: k * 2.39996 + rr(-0.15, 0.15) });
  }
  const angDist = (x, y) => Math.abs(((x - y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  for (const G of goals) {
    const L = G.el > 58 ? limbs[limbs.length - 1] : limbs.slice(0, -1).reduce((b, l) => (angDist(l.az, G.a) < angDist(b.az, G.a) ? l : b));
    {
      const t = L.leader ? rr(0.4, 0.95) : THREE.MathUtils.clamp(0.25 + (G.el + 40) / 100 * 0.7 + rr(-0.05, 0.05), 0.2, 0.98);
      const from = at(L.pts, t);
      const a = G.a, el = G.el;
      const pr = rr(2.2, 2.7);
      const goal = env(a, el, 1).addScaledVector(env(a, el, 1).sub(V(0, cy, 0)).normalize(), -pr * 0.55);
      const sd = goal.clone().sub(from);
      const sl = sd.length();
      if (sl < 0.8) continue;
      const sp = grow(r, from, sd.normalize().lerp(V(0, 1, 0), 0.15), sl, 4, { pull: sd, pullK: 0.3, wiggle: 0.3, droop: 0.1 });
      const rS = taper(L.rB, 0.06)(t) * 0.5;
      branches.push({ pts: sp, rad: taper(Math.max(0.03, rS), 0.018), level: 2 });
      pads.push({ c: sp[sp.length - 1].clone(), r: pr });
      // twigs (level 3, dropped with the level 2 at LOD 1) to points of the envelope next to it
      for (let j = 0; j < 1; j++) {
        if (r() > 0.9) continue;
        const pr2 = rr(1.8, 2.2);
        const a2 = a + rr(-0.28, 0.28), el2 = el + rr(-16, 16);
        const g2 = env(a2, el2, 1).addScaledVector(env(a2, el2, 1).sub(V(0, cy, 0)).normalize(), -pr2 * 0.6);
        const f2 = at(sp, 0.45 + j * 0.25);
        if (g2.distanceTo(f2) < 0.6) continue;
        const tw = grow(r, f2, g2.clone().sub(f2).normalize(), g2.distanceTo(f2), 2, { wiggle: 0.25 });
        branches.push({ pts: tw, rad: taper(0.026, 0.012), level: 3 });
        pads.push({ c: tw[tw.length - 1].clone(), r: pr2 });
      }
    }
  }
  return { branches, pads, fork: at(trunk, yb / (leaderLen + 0.5)) };
}

function pollardPlane(r) {
  const branches = [], pads = [];
  const rr = (a, b) => a + (b - a) * r();
  const h = rr(3.2, 4.0);
  const trunk = grow(r, V(0, -0.5, 0), V((r() - 0.5) * 0.1, 1, (r() - 0.5) * 0.1), h + 0.5, 7, { pull: V(0, 1, 0), pullK: 0.2, wiggle: 0.08 });
  // the bole swells a little under the head (years of cuts)
  branches.push({ pts: trunk, rad: (t) => 0.5 - 0.12 * t + 0.1 * Math.max(0, (t - 0.8) / 0.2) ** 2, level: 0, flare: true });
  const top = trunk[trunk.length - 1];
  const nL = 3 + Math.floor(r() * 3);
  let az = r() * Math.PI * 2;
  for (let i = 0; i < nL; i++) {
    az += (Math.PI * 2) / nL + (r() - 0.5) * 0.6;
    const out = V(Math.cos(az), 0, Math.sin(az));
    const elev = THREE.MathUtils.degToRad(rr(38, 62));
    const len = rr(1.4, 2.6);
    const from = top.clone().addScaledVector(V(0, -1, 0), 0.4);
    const pts = grow(r, from, out.clone().multiplyScalar(Math.cos(elev)).add(V(0, Math.sin(elev), 0)), len, 4, { wiggle: 0.15 });
    // the knuckle: the limb ends in a head ~1.8x its girth, lumpy, closed above
    const end = pts[pts.length - 1], d = dirAt(pts, 1);
    pts.push(end.clone().addScaledVector(d, 0.22), end.clone().addScaledVector(d, 0.45), end.clone().addScaledVector(d, 0.6));
    const n = pts.length, rL = rr(0.2, 0.26);
    branches.push({ pts, rad: (t) => { const k = t * (n - 1); return k <= n - 4 ? rL * (1 - 0.15 * t) : k <= n - 3 + 0.01 ? rL * 1.55 : k <= n - 2 + 0.01 ? rL * 1.7 : rL * 0.7; }, level: 1, knuckle: true });
    // the brush of shoots from the head
    const head = end.clone().addScaledVector(d, 0.3);
    const nSh = 6 + Math.floor(r() * 4);
    for (let k = 0; k < nSh; k++) {
      const a = r() * Math.PI * 2, e = THREE.MathUtils.degToRad(rr(50, 82));
      const sd = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).lerp(out, 0.25).normalize();
      const from = head.clone().addScaledVector(sd, rL * 1.2);
      const sl = rr(2.0, 3.6);
      const sp = grow(r, from, sd, sl, 3, { wiggle: 0.06, droop: 0.08 });
      branches.push({ pts: sp, rad: taper(0.045, 0.012), level: 2 });
      const pr = rr(0.95, 1.3);
      pads.push({ c: at(sp, 0.8).add(V(0, pr * 0.2, 0)), r: pr });
    }
  }
  return { branches, pads, fork: top.clone() };
}

/** The bark mesh: each branch swept along its points (parallel-transported rings, its radius profile, lumps; a root
 *  flare with buttresses on the trunk; knuckles lumpier). bark = (ring centre, level) for the vendor's bark morph
 *  (CHANGES #9: level > 1.5 shrinks onto its axis before LOD 1). */
function barkMesh(branches, sidesOf, stride = 1) {
  const pos = [], nrm = [], idx = [], bark = [];
  for (const b of branches) {
    // (stride 2: every other ring, the ends kept: LOD 2, a trunk of a few pixels)
    const pts = stride > 1 ? b.pts.filter((_, i) => i % stride === 0 || i === b.pts.length - 1) : b.pts, n = pts.length, sides = sidesOf(b.level);
    let u = null;
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const tn = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      if (!u) { u = Math.abs(tn.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0); }
      u.sub(tn.clone().multiplyScalar(u.dot(tn))).normalize();
      const w = tn.clone().cross(u);
      const t = i / (n - 1);
      const rad0 = b.rad(t);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        let rad = rad0;
        if (b.flare) {
          const f = Math.max(0, 1 - (pts[i].y + 0.5) / 1.6);
          rad *= 1 + f * f * (0.55 + 0.35 * Math.cos(5 * a + 0.7));        // root flare with five buttresses
        }
        const lump = 1 + (b.knuckle ? 0.16 : 0.05) * Math.sin(3 * a + i * 1.3) + (b.knuckle ? 0.1 : 0.03) * Math.sin(7 * a + i * 2.1);
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

// sides per branch level, per LOD: LOD 0 and LOD 1 keep the same sides on what they share (trunk, limbs), so the
// 40 m switch changes no outline; LOD 1 drops levels 2-3 (shrunk away by the morph before it); LOD 2 (120 m+) fewer
const SIDES = [[14, 9, 5, 4], [14, 9], [6, 4]];

/** The vendor's shape contract (stylizedTrees.js buildTree): shape(r, lod, seed). Variants 0-3 natural, 4-5 pollard. */
export function planeShape(seedBase) {
  return (r, lod, seed) => {
    const v = Math.round((seed - seedBase) / 97);
    const pollard = v >= 4;
    const { branches, pads, fork } = pollard ? pollardPlane(r) : naturalPlane(r, v);
    const bb = new THREE.Box3();
    for (const p of pads) bb.expandByPoint(p.c.clone().addScalar(p.r)).expandByPoint(p.c.clone().addScalar(-p.r));
    const crown = bb.getCenter(new THREE.Vector3()), rad = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    pads.push({ c: crown.clone().lerp(fork, 0.45), r: pollard ? 1.4 : 2.2 });       // the core (last): seen from below
    return {
      crown, rad, clumps: pads,
      // many pads, fewer cards each than the street trees (20/7/3): a plane's crown is clumpier, with gaps
      cards: pollard ? [8, 4, 2] : [10, 4, 2], cardScale: pollard ? 0.62 : 0.58,
      // (vendor CHANGES #15) many small pads: a gentler occlusion per pad overhead and a floor (the shade side of a
      // plane is a deep green, not black), and more of the crown's dome in the shading normal (the crown reads as one
      // lit dome with lumps, as in the photos, not as 100 separate balls)
      aoOverhead: 0.95, aoFloor: 0.45, crownNormal: 0.2,
      trunk: (l) => barkMesh(branches.filter((b) => b.level <= [3, 1, 1][l]), (lv) => SIDES[l][Math.min(lv, SIDES[l].length - 1)], l === 2 ? 2 : 1),
    };
  };
}

// ------------------------------------------------------------------------------------------------ bark
/** The plane's camouflage bark (TSL, tree space): plates as stacked, warped noise thresholds, each layer a colour of
 *  the exposed under-bark; each plate edge a thin dark lip with a pale rim (the curled flake) and a small step in the
 *  bump; the foot of the trunk older, browner and fissured; the limbs paler and finer. Every edge is filtered with
 *  the pixel footprint (no shimmer far away), and the whole pattern fades to its mean colour with distance. */
export function planeBark(m) {
  const p = positionGeometry, level = attribute("bark", "vec4").w;
  // plates of ~5-20 cm (the reference photos), a little longer than wide
  const q0 = vec3(p.x, p.y.mul(0.6), p.z).mul(7.5);
  const warp = vec3(mx_noise_float(q0.mul(0.3)), mx_noise_float(q0.mul(0.3).add(17.3)), mx_noise_float(q0.mul(0.3).add(41.1)));
  const q = q0.add(warp.mul(1.4));
  const fw = max(fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)), 1e-4);       // footprint in pattern units
  const far = smoothstep(0.25, 1.4, fw), near = float(1).sub(far);
  // ragged plate outlines: each threshold field gets a finer noise on top (the flakes' torn edges)
  const rag = mx_noise_float(q.mul(3.2).add(3.1)).mul(0.14).mul(near);
  const n1 = mx_noise_float(q).add(rag), n2 = mx_noise_float(q.mul(1.7).add(5.7)).add(rag.mul(0.8)), n3 = mx_noise_float(q.mul(0.6).add(11.0));
  const step = (n, t) => smoothstep(t.sub(fw.mul(0.3)), t.add(fw.mul(0.3)), n);
  // colours (linear), from the reference photos: the old outer bark olive / grey-green with moss, the freshly
  // exposed under-bark cream to pale yellow-green, a warm tan, a pinkish grey
  // (the photos: mostly a pale buff-grey under-bark, the old olive-brown plates still on it, more of them low down)
  const olive = vec3(0.17, 0.165, 0.085), greyGreen = vec3(0.45, 0.42, 0.28), cream = vec3(0.58, 0.53, 0.33);
  const paleYel = vec3(0.45, 0.45, 0.26), tan = vec3(0.32, 0.26, 0.18), pinkGrey = vec3(0.33, 0.29, 0.26);
  // the pale share grows upward and onto the limbs, and varies in big zones (whole sides still in old bark)
  const zone = mx_noise_float(q0.mul(0.12).add(77.0));
  const tA = mix(float(0.15), float(-0.4), smoothstep(1.5, 10.0, p.y).max(smoothstep(0.5, 1.5, level))).add(zone.mul(0.28));
  const a = step(n1, tA), b = step(n2, float(0.3)), c = step(n3, float(0.28));
  let col = mix(olive, pinkGrey, smoothstep(-0.4, 0.2, n3).mul(0.35));
  col = mix(col, greyGreen, a);
  col = mix(col, mix(cream, paleYel, smoothstep(-0.25, 0.35, n3)), b);
  col = mix(col, tan, c.mul(0.5).mul(b.oneMinus()));
  // the flake edges, ONE-sided: a thin shadowed groove just outside a newer plate (the old bark's broken edge stands
  // over it) and a pale rim just inside it; thin, and gone with distance
  const lipW = fw.mul(0.5).add(0.018);
  const outside = (n, t) => smoothstep(t.sub(lipW.mul(2)), t.sub(lipW.mul(0.3)), n).mul(float(1).sub(step(n, t)));
  const inside = (n, t) => step(n, t).mul(float(1).sub(smoothstep(t, t.add(lipW.mul(1.5)), n)));
  const lip = max(outside(n1, tA), outside(n2, float(0.3))).mul(near);
  const rim = max(inside(n1, tA), inside(n2, float(0.3))).mul(near);
  col = mix(col, vec3(0.08, 0.072, 0.055), lip.mul(0.55));
  // the old plates crack in a fine network (dark hairlines), only in the old bark
  const crack = float(1).sub(smoothstep(float(0), fw.mul(0.5).add(0.03), abs(mx_noise_float(q.mul(2.3).add(51.0))))).mul(a.oneMinus()).mul(near)
    .mul(smoothstep(0.1, 0.45, mx_noise_float(q.mul(1.1).add(9.0))));   // broken: short cracks, not contour lines
  col = mix(col, vec3(0.05, 0.045, 0.035), crack.mul(0.4));
  col = mix(col, cream.mul(1.1), rim.mul(0.35));
  // fine grain, lichen speckle, moss in the old bark
  const fine = mx_noise_float(vec3(q.x.mul(9.0), q.y.mul(2.5), q.z.mul(9.0))).mul(0.5).add(0.5);   // fibrous, along the trunk
  col = col.mul(fine.mul(0.22).mul(near).add(0.89));
  const moss = smoothstep(0.25, 0.6, mx_noise_float(q.mul(1.3).add(31.0))).mul(a.oneMinus()).mul(b.oneMinus());
  col = mix(col, vec3(0.1, 0.14, 0.05), moss.mul(0.45));
  // the foot: older bark, brown-grey, vertical fissures, damp and darker toward the ground
  const foot = smoothstep(1.7, 0.2, p.y).mul(smoothstep(0.5, -0.5, level));
  const fiss = smoothstep(0.6, 0.9, abs(mx_noise_float(vec3(p.x.mul(9.0), p.y.mul(1.4), p.z.mul(9.0)))).oneMinus());
  const footCol = mix(vec3(0.19, 0.165, 0.13), vec3(0.05, 0.043, 0.034), fiss.mul(near));
  col = mix(col, footCol, foot.mul(0.75));
  col = col.mul(smoothstep(-0.5, 0.5, p.y).mul(0.3).add(0.7));             // earth-darkened at the very bottom
  // the limbs: paler, smaller plates, more cream (the young bark)
  const limb = smoothstep(0.5, 1.5, level);
  col = mix(col, mix(col, cream.mul(0.85), 0.4), limb);
  // the far mean (what the pattern averages to)
  col = mix(col, mix(vec3(0.3, 0.29, 0.21), vec3(0.4, 0.38, 0.28), limb), far.mul(0.8));
  m.colorNode = col;
  // relief: the new plates a hair under the old bark, the groove at their edge; the foot's fissures deeper
  const h = a.mul(0.0015).sub(b.mul(0.002)).sub(lip.mul(0.0015)).sub(crack.mul(0.001)).add(fine.mul(0.0006)).sub(fiss.mul(foot).mul(0.012)).mul(near);
  m.normalNode = bumpNormal(h);
  m.roughnessNode = mix(float(0.72), float(0.95), max(foot, b.oneMinus().mul(0.6)));
  m.needsUpdate = true;
}

/** The species definition for makeSpecies (viewer/treesStylized.js). seedBase: the lab's seed (default 1000). */
export function planeDef(seedBase = 1000) {
  return {
    id: "plane", variants: 6, shape: planeShape(seedBase), leafMask: planeLeafMask, bark: planeBark, perVariantHeight: true,
    // (viewer/impostors.js: the far mips' alpha boost; 0.3 (the street trees') turned whole quads opaque over a forest, 0.1 still did; its dense crowns do not thin far away without it)
    impostorAlphaBoost: 0,
    params: {
      seed: seedBase,
      // a fresh, slightly yellow mid green, lighter than the street trees' olive; a cool shade side
      // (a near-flat bottom -> top ramp and a light albedo occlusion: with the street trees' dark bottom colour the lower
      // half of this deep crown went black; the photos show lit clumps down to the crown's base)
      topColor: "#7aa942", bottomColor: "#558533", translucencyColor: "#c2dc6c", tintVar: 0.2,
      crownLift: 0, fill: 0.4, fillColor: "#8fae7c", aoColor: 0.22, trunkColor: [0.2, 0.19, 0.13],
      // the sun-shadow lookup moves 2.4 m toward the sun (street trees 1.4): a plane crown is ~3x as deep, and with 1.4 m
      // the lower dome sat in the shadow of its own upper pads, black where the photos show a lit, lumpy green
      shadowLift: 2.4,
      leafTone: 0.55,
      // hooks (lab, stubbed): season (0 summer .. 1 autumn) and wind are uniforms of the shared chain
    },
  };
}
