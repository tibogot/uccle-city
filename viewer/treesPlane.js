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
  // 6 twigs from near the centre outwards (a shoot seen through the cluster), leaves alternate along them
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd() * 0.7, L = N * (0.28 + rnd() * 0.14);
    const sx = N / 2 + Math.cos(a + 2) * N * 0.04, sy = N / 2 + Math.sin(a + 2) * N * 0.04;
    const ex = N / 2 + Math.cos(a) * L, ey = N / 2 + Math.sin(a) * L;
    const mx = (sx + ex) / 2 + Math.cos(a + 1.57) * L * 0.12, my = (sy + ey) / 2 + Math.sin(a + 1.57) * L * 0.12;
    twigs.push({ sx, sy, mx, my, ex, ey, a });
  }
  const leaves = [];
  for (const t of twigs) {
    const n = 7 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const u = 0.18 + (k / n) * 0.9, w = 1 - u;
      const x = w * w * t.sx + 2 * w * u * t.mx + u * u * t.ex, y = w * w * t.sy + 2 * w * u * t.my + u * u * t.ey;
      const side = k % 2 ? 1 : -1;
      leaves.push({ x, y, ang: t.a + side * (0.7 + rnd() * 0.6), len: N * (0.085 + rnd() * 0.04), squash: 0.55 + rnd() * 0.45, tone: 0.32 + rnd() * 0.4, wob: rnd() * 6 });
    }
  }
  for (let i = 0; i < 16; i++) {          // loose leaves filling the cluster (other shoots behind)
    const r = Math.sqrt(rnd()) * N * 0.3, a = rnd() * Math.PI * 2;
    leaves.push({ x: N / 2 + Math.cos(a) * r, y: N / 2 + Math.sin(a) * r, ang: rnd() * Math.PI * 2, len: N * (0.07 + rnd() * 0.035), squash: 0.5 + rnd() * 0.5, tone: 0.25 + rnd() * 0.3, wob: rnd() * 6 });
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

function naturalPlane(r, v) {
  const branches = [], pads = [];
  const rr = (a, b) => a + (b - a) * r();
  const square = v % 2 === 1;                  // the squares' planes: lower fork, broader; avenues: a taller bole
  const bole = square ? rr(2.8, 3.6) : rr(4.2, 5.6);
  const lean = V(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.12);
  const leaderLen = rr(15, 17.5);
  const trunk = grow(r, V(0, -0.5, 0), V(lean.x, 1, lean.z), leaderLen, 14, { pull: V(0, 1, 0), pullK: 0.12, wiggle: 0.1 });
  const R0 = 0.46;
  const trunkR = taper(R0, 0.09);
  branches.push({ pts: trunk, rad: trunkR, level: 0, flare: true });
  // scaffolds: golden-angle round the trunk, from the bole up, lower ones longer and flatter
  const nS = 5 + Math.floor(r() * 3);
  let az = r() * Math.PI * 2;
  const tips = [];
  for (let i = 0; i < nS; i++) {
    az += 2.4 + (r() - 0.5) * 0.5;
    const h01 = i / (nS - 1);                                       // 0 = lowest
    const tOn = THREE.MathUtils.clamp((bole + 0.5 + h01 * (square ? 4.5 : 5.5) + 0.5) / leaderLen, 0, 0.75);
    const from = at(trunk, tOn);
    const elev = THREE.MathUtils.degToRad(rr(28, 42) + h01 * 22 + (square ? -6 : 0));
    const out = V(Math.cos(az), 0, Math.sin(az));
    const d0 = out.clone().multiplyScalar(Math.cos(elev)).add(V(0, Math.sin(elev), 0));
    const len = (square ? rr(10, 12) : rr(9, 11)) * (1 - h01 * 0.3);
    const pts = grow(r, from, d0, len, 8, { pull: out.clone().multiplyScalar(0.8).add(V(0, 0.6, 0)).normalize(), pullK: 0.15, wiggle: 0.32, droop: 0.12 });
    const rB = trunkR(tOn) * rr(0.6, 0.72);
    branches.push({ pts, rad: taper(rB, 0.05), level: 1 });
    tips.push({ pts, rB, len, out });
  }
  // the leader's own crown top
  tips.push({ pts: trunk.slice(Math.floor(trunk.length * 0.55)), rB: trunkR(0.55), len: leaderLen * 0.45, out: outward(dirAt(trunk, 0.9)), leader: true });
  // secondaries along each limb's outer part, twigs on those; pads at their tips
  for (const L of tips) {
    const nSec = L.leader ? 7 : 6 + Math.floor(r() * 2);
    for (let k = 0; k < nSec; k++) {
      const t = 0.28 + (k / nSec) * 0.66 + r() * 0.05;
      const from = at(L.pts, t), d = dirAt(L.pts, t);
      const sa = r() * Math.PI * 2;
      const side = V(Math.cos(sa), 0, Math.sin(sa));
      const sd = d.clone().multiplyScalar(0.55).add(side.multiplyScalar(0.75)).add(V(0, L.leader ? 0.5 : 0.15, 0)).normalize();
      const sl = rr(2.6, 4.0) * (1 - t * 0.35) * (L.leader ? 0.9 : 1);
      const sp = grow(r, from, sd, sl, 4, { pull: outward(sd).add(V(0, 0.4, 0)).normalize(), pullK: 0.2, wiggle: 0.35, droop: 0.25 });
      const rS = taper(L.rB, 0.05)(t) * 0.5;
      branches.push({ pts: sp, rad: taper(Math.max(0.03, rS), 0.018), level: 2 });
      const pr = rr(1.7, 2.2);
      const tip = sp[sp.length - 1];
      pads.push({ c: tip.clone().add(V(0, pr * 0.25, 0)), r: pr });
      // one twig with its own pad (level 3: dropped with the level 2 at LOD 1)
      for (let j = 0; j < 2; j++) {
        if (r() > 0.85) continue;
        const tw = grow(r, at(sp, 0.35 + j * 0.3), sd.clone().add(V(r() - 0.5, 0.45, r() - 0.5)).normalize(), rr(1.3, 2.0), 2, { wiggle: 0.3 });
        branches.push({ pts: tw, rad: taper(0.028, 0.012), level: 3 });
        const pr2 = rr(1.4, 1.8);
        pads.push({ c: tw[tw.length - 1].clone().add(V(0, pr2 * 0.2, 0)), r: pr2 });
      }
    }
    // a pad hugging the limb itself, mid-way (fills the crown's inside, seen from below)
    if (!L.leader) { const c = at(L.pts, 0.6); pads.push({ c: c.add(V(0, 0.6, 0)), r: rr(1.3, 1.6) }); }
  }
  return { branches, pads, fork: at(trunk, (bole + 1) / leaderLen) };
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
function barkMesh(branches, sidesOf) {
  const pos = [], nrm = [], idx = [], bark = [];
  for (const b of branches) {
    const { pts } = b, n = pts.length, sides = sidesOf(b.level);
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
const SIDES = [[14, 9, 5, 4], [14, 9], [8, 5]];

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
      cards: pollard ? [12, 5, 2] : [9, 4, 2], cardScale: pollard ? 0.62 : 0.72,
      trunk: (l) => barkMesh(branches.filter((b) => b.level <= [3, 1, 1][l]), (lv) => SIDES[l][Math.min(lv, SIDES[l].length - 1)]),
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
  const q0 = vec3(p.x, p.y.mul(0.62), p.z).mul(4.2);
  const warp = vec3(mx_noise_float(q0.mul(0.45)), mx_noise_float(q0.mul(0.45).add(17.3)), mx_noise_float(q0.mul(0.45).add(41.1)));
  const q = q0.add(warp.mul(0.9));
  const fw = max(fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)), 1e-4);       // footprint in pattern units
  const far = smoothstep(0.25, 1.4, fw);
  const n1 = mx_noise_float(q), n2 = mx_noise_float(q.mul(1.9).add(5.7)), n3 = mx_noise_float(q.mul(0.7).add(11.0));
  const step = (n, t) => smoothstep(t.sub(fw.mul(0.35)), t.add(fw.mul(0.35)), n);
  // colours (linear): old outer bark olive-grey, freshly exposed cream / pale yellow, grey-green, a warm tan
  const olive = vec3(0.105, 0.105, 0.068), greyGreen = vec3(0.2, 0.205, 0.15), cream = vec3(0.42, 0.39, 0.27);
  const paleYel = vec3(0.34, 0.33, 0.17), tan = vec3(0.24, 0.19, 0.13);
  const a = step(n1, float(0.08)), b = step(n2, float(0.18)), c = step(n3, float(0.25));
  let col = olive;
  col = mix(col, greyGreen, a);
  col = mix(col, mix(cream, paleYel, smoothstep(-0.3, 0.3, n3)), b.mul(a.oneMinus().mul(0.6).add(0.4)));
  col = mix(col, tan, c.mul(0.65));
  // the flake edges: a dark lip just outside a plate, a pale rim just inside (where n crosses its threshold)
  const lipW = fw.mul(0.6).add(0.025);
  const edge = (n, t) => float(1).sub(smoothstep(float(0), lipW, abs(n.sub(t))));
  const e1 = edge(n1, float(0.08)), e2 = edge(n2, float(0.18));
  const lip = max(e1, e2).mul(float(1).sub(far));
  col = mix(col, vec3(0.05, 0.045, 0.035), lip.mul(0.75));
  // fine grain / lichen speckle
  const fine = mx_noise_float(q.mul(6.0)).mul(0.5).add(0.5);
  col = col.mul(fine.mul(0.25).mul(float(1).sub(far)).add(0.87));
  // the foot: older bark, brown-grey, vertical fissures, damp and darker toward the ground
  const foot = smoothstep(1.9, 0.3, p.y).mul(smoothstep(0.5, -0.5, level));
  const fiss = smoothstep(0.55, 0.85, abs(mx_noise_float(vec3(p.x.mul(9.0), p.y.mul(1.4), p.z.mul(9.0)))).oneMinus());
  const footCol = mix(vec3(0.13, 0.11, 0.085), vec3(0.03, 0.026, 0.02), fiss.mul(float(1).sub(far)));
  col = mix(col, footCol, foot.mul(0.85));
  col = col.mul(smoothstep(-0.5, 0.6, p.y).mul(0.35).add(0.65));             // earth-darkened at the very bottom
  // the limbs: paler, smaller plates, more cream (the young bark)
  const limb = smoothstep(0.5, 1.5, level);
  col = mix(col, mix(col, cream.mul(0.9), 0.35), limb);
  // the far mean (what the pattern averages to)
  col = mix(col, mix(vec3(0.17, 0.165, 0.11), vec3(0.24, 0.22, 0.16), limb), far.mul(0.8));
  m.colorNode = col;
  // relief: each plate a hair proud of the one under it, the lip a groove; the foot's fissures deeper
  const h = a.mul(0.004).add(b.mul(0.003)).sub(lip.mul(0.003)).sub(fiss.mul(foot).mul(0.012)).mul(float(1).sub(far));
  m.normalNode = bumpNormal(h);
  m.roughnessNode = mix(float(0.78), float(0.95), max(foot, a.oneMinus().mul(0.5)));
  m.needsUpdate = true;
}

/** The species definition for makeSpecies (viewer/treesStylized.js). seedBase: the lab's seed (default 1000). */
export function planeDef(seedBase = 1000) {
  return {
    id: "plane", variants: 6, shape: planeShape(seedBase), leafMask: planeLeafMask, bark: planeBark,
    params: {
      seed: seedBase,
      // a fresh, slightly yellow mid green, lighter than the street trees' olive; a cool shade side
      topColor: "#93b24c", bottomColor: "#2a4a1d", translucencyColor: "#cddc78", tintVar: 0.2,
      crownLift: 0, fill: 0.32, fillColor: "#8fae7c", aoColor: 0.4, trunkColor: [0.2, 0.19, 0.13],
      leafTone: 0.55,
      // hooks (lab, stubbed): season (0 summer .. 1 autumn) and wind are uniforms of the shared chain
    },
  };
}
