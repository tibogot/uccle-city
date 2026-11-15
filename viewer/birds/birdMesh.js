// THE SKY BIRDS' MESHES (viewer/birds/skyFlocks.js): ONE low-poly bird for every species, shaped in the vertex shader
// from a per-species table (span, body length, tail, wing planform, palette), and ONE far "chevron" for the birds a few
// pixels big. Both are drawn through indirect draws from the compute pass's visible lists.
//
// The near bird (~70 triangles): a lofted body (5 rings x 6 sides), a head + beak, a tail fan, two wings of 3 x 2 panels.
// Wing vertices carry their planform coordinates (s = span fraction 0..1, q = chord fraction 0 leading .. 1 trailing) and
// the shader lays them out per species (root / tip chord, sweep) and flaps them about the shoulder as pigeons.js does
// (the idea of three.js r187 examples/webgpu_compute_birds.html: the flap in the vertex stage from a phase).
//
// Sizes and colours (linear RGB, albedo): field-guide figures (Svensson et al., Collins Bird Guide 2nd ed.; RSPB /
// Natagora species pages): starling 20 cm / span 37-42 cm, jackdaw 33 cm / 67-74, feral pigeon 32 cm / 63-70,
// black-headed gull 37 cm / 94-105, ring-necked parakeet 40 cm (tail ~22) / 42-48.
import * as THREE from "three/webgpu";

/** species ids (the shader's index) */
export const SP = { starling: 0, jackdaw: 1, pigeon: 2, gull: 3, parakeet: 4 };
export const SPECIES_N = 5;

const lin = (r, g, b) => [r, g, b];
// per species: shape + flight style + palette. Colours are albedo (linear), slightly lifted so a bird against a bright
// sky reads as a dark silhouette but not a hole.
export const SPECIES = [
  { name: "starling", span: 0.40, len: 0.21, tail: 0.25, tailW: 0.55, root: 0.36, tip: 0.06, sweep: 0.22, flapHz: 12, glide: 0.35, amp: 0.95,
    back: lin(0.030, 0.032, 0.035), belly: lin(0.045, 0.043, 0.042), wing: lin(0.035, 0.035, 0.036), under: lin(0.11, 0.10, 0.095), tipC: lin(0.03, 0.03, 0.03), head: lin(0.028, 0.03, 0.03), beak: lin(0.45, 0.33, 0.06) },
  { name: "jackdaw", span: 0.70, len: 0.34, tail: 0.32, tailW: 0.55, root: 0.34, tip: 0.22, sweep: 0.06, flapHz: 5.5, glide: 0.35, amp: 0.8,
    back: lin(0.028, 0.028, 0.03), belly: lin(0.04, 0.04, 0.045), wing: lin(0.022, 0.022, 0.025), under: lin(0.045, 0.045, 0.05), tipC: lin(0.018, 0.018, 0.02), head: lin(0.16, 0.16, 0.17), beak: lin(0.02, 0.02, 0.02) },
  { name: "pigeon", span: 0.66, len: 0.32, tail: 0.32, tailW: 0.6, root: 0.32, tip: 0.12, sweep: 0.14, flapHz: 7, glide: 0.25, amp: 0.85,
    back: lin(0.17, 0.19, 0.23), belly: lin(0.28, 0.30, 0.33), wing: lin(0.2, 0.21, 0.25), under: lin(0.42, 0.44, 0.47), tipC: lin(0.06, 0.06, 0.07), head: lin(0.11, 0.15, 0.13), beak: lin(0.05, 0.04, 0.04) },
  { name: "gull", span: 1.0, len: 0.37, tail: 0.28, tailW: 0.5, root: 0.24, tip: 0.07, sweep: 0.12, flapHz: 3.0, glide: 0.75, amp: 0.55,
    back: lin(0.42, 0.45, 0.49), belly: lin(0.8, 0.8, 0.8), wing: lin(0.45, 0.48, 0.52), under: lin(0.72, 0.72, 0.73), tipC: lin(0.025, 0.025, 0.028), head: lin(0.78, 0.78, 0.78), beak: lin(0.5, 0.1, 0.06) },
  { name: "parakeet", span: 0.45, len: 0.40, tail: 0.62, tailW: 0.22, root: 0.3, tip: 0.05, sweep: 0.3, flapHz: 10, glide: 0.1, amp: 0.8,
    back: lin(0.10, 0.30, 0.035), belly: lin(0.22, 0.42, 0.06), wing: lin(0.08, 0.26, 0.03), under: lin(0.25, 0.38, 0.08), tipC: lin(0.04, 0.09, 0.05), head: lin(0.14, 0.36, 0.05), beak: lin(0.6, 0.03, 0.03) },
];

// parts (the shader's palette index): 0 back, 1 belly, 2 head, 3 beak, 4 tail, 5 wing (top / under by face, tip by s)
export const PART = { back: 0, belly: 1, head: 2, beak: 3, tail: 4, wing: 5 };

/** the near bird: a bird of body length 1 (z -0.5 tail end of the body .. +0.5 the beak tip), up +y, nose +z.
 *  Body / head / beak vertices are in those units (scaled by the species' length); tail vertices carry (t, side) in
 *  position.xz (t 0..1 along the tail); wing vertices carry (s, q) in position.xz. Attribute `part`. */
export function nearBirdGeometry() {
  const P = [], A = [], I = [];
  const v = (x, y, z, part) => { P.push(x, y, z); A.push(part); return A.length - 1; };
  const tri = (a, b, c) => I.push(a, b, c);
  // body: rings along z: [z, half width, half height, y offset]
  const rings = [[-0.42, 0.035, 0.035, 0.01], [-0.28, 0.1, 0.1, 0.0], [-0.08, 0.13, 0.13, -0.01], [0.12, 0.12, 0.12, 0.0], [0.26, 0.07, 0.075, 0.03]];
  const N = 6, ring = [];
  for (const [z, w, h, y0] of rings) {
    const r = [];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2, s = Math.sin(a);
      r.push(v(Math.cos(a) * w, y0 + s * h, z, s < -0.3 ? PART.belly : PART.back));
    }
    ring.push(r);
  }
  for (let i = 0; i < ring.length - 1; i++) for (let k = 0; k < N; k++) {
    const a = ring[i][k], b = ring[i][(k + 1) % N], c = ring[i + 1][(k + 1) % N], d = ring[i + 1][k];
    tri(a, c, b); tri(a, d, c);
  }
  // tail end cap
  const tc = v(0, 0.01, -0.46, PART.back);
  for (let k = 0; k < N; k++) tri(tc, ring[0][k], ring[0][(k + 1) % N]);
  // head: a small octahedron ahead of the last ring
  const hc = [0, 0.07, 0.34], hr = 0.075;
  const H = [[hr, 0, 0], [-hr, 0, 0], [0, hr, 0], [0, -hr * 0.85, 0], [0, 0, hr * 1.1], [0, 0, -hr * 1.2]].map((q) => v(q[0] + hc[0], q[1] + hc[1], q[2] + hc[2], PART.head));
  for (const [a, b, c] of [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]) tri(H[a], H[b], H[c]);
  // beak
  const bt = v(0, 0.055, 0.52, PART.beak), bl = v(-0.022, 0.07, 0.42, PART.beak), br = v(0.022, 0.07, 0.42, PART.beak), bb = v(0, 0.04, 0.42, PART.beak);
  tri(bl, bt, br); tri(br, bt, bb); tri(bb, bt, bl);
  // tail: a fan (t, side) -> the shader: z = -0.38 - t * tail, x = side * (0.05 + t * tailW * tail)
  const T = [v(0, 0, -1, PART.tail), v(0, 0, 1, PART.tail), v(1, 0, 1, PART.tail), v(1, 0, -1, PART.tail)];
  tri(T[0], T[3], T[2]); tri(T[0], T[2], T[1]);
  // wings: s in [0, 0.42, 0.75, 1], q in [0, 0.5, 1]; per side, top faces up (the material is two-sided)
  const S = [0, 0.42, 0.75, 1], Q = [0, 0.5, 1];
  for (const side of [1, -1]) {
    const g = S.map((s) => Q.map((q) => v(side * s, 0, q, PART.wing)));
    for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < Q.length - 1; j++) {
      const a = g[i][j], b = g[i + 1][j], c = g[i + 1][j + 1], d = g[i][j + 1];
      if (side > 0) { tri(a, b, c); tri(a, c, d); } else { tri(a, c, b); tri(a, d, c); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute("part", new THREE.Float32BufferAttribute(A, 1));
  geo.setIndex(I);
  return geo;
}

/** the far bird: a flapping chevron (two thin arms from the body), attributes: position.x = side (-1 / 0 / 1 along the
 *  span), position.y = edge (-1 / 1 across the arm's thickness) */
export function farBirdGeometry() {
  const P = [], I = [];
  // left arm: body (0) -> tip (-1); right arm: body -> tip (1). 4 vertices per arm
  for (const s of [-1, 1]) {
    const o = P.length / 3;
    P.push(0, -1, 0, 0, 1, 0, s, 1, 0, s, -1, 0);
    if (s > 0) I.push(o, o + 2, o + 1, o, o + 3, o + 2); else I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  geo.setIndex(I);
  return geo;
}

/** the per-species table packed for a uniformArray of vec4: 6 vec4 per species
 *  [span, len, tail, tailW] [root, tip, sweep, flapHz] [glide, amp, -, -] [back.rgb, -] [belly.rgb] [wing.rgb] and the
 *  palette rows after: [under] [tipC] [head] [beak] -> 10 vec4 per species */
export const SP_STRIDE = 10;
export function speciesTable() {
  const out = [];
  for (const s of SPECIES) {
    out.push(new THREE.Vector4(s.span, s.len, s.tail, s.tailW), new THREE.Vector4(s.root, s.tip, s.sweep, s.flapHz), new THREE.Vector4(s.glide, s.amp, 0, 0));
    for (const c of [s.back, s.belly, s.wing, s.under, s.tipC, s.head, s.beak]) out.push(new THREE.Vector4(c[0], c[1], c[2], 0));
  }
  return out;
}
