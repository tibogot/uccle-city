// THE BIRD IN THE TALONS (falcon fun round 3 part B, rule docs/rules/falcon-catch-fun.md): the caught bird as the
// player saw it fly. Round 3 held the nest's prey_carry mesh (a plain dark-grey blob) for every catch, a gull or a
// jackdaw too. Now the held bird is THE bird that was caught: the same mesh as its flock (a square pigeon:
// pigeons.js pigeonGeometry; a sky bird: viewer/birds/birdMesh.js nearBirdGeometry shaped by its species' row), the
// same plumage (the square bird's own tint, its morph / a jackdaw / a racer; the species' palette) and the same size
// (the flock's draw scale), posed LIMP and baked once on the CPU: the wings folded (the left one hanging a little open),
// the head forward and drooping, the feet tucked away. Nose -z, belly -y (falconBird.js rolls it belly-up against the
// toes: holdPrey). One mesh, pooled: a child of the falcon, its geometry swapped at a catch (the shapes are built once,
// all with the same attributes: position + color, so one pipeline, warmed with the falcon: cityFlyer.js warm()).
// No light, no per-frame allocation, nothing moves in its vertices (the falcon's transform carries it).
import * as THREE from "three/webgpu";
import { attribute, uniform } from "three/tsl";
import { pigeonGeometry } from "./pigeons.js";
import { nearBirdGeometry, SPECIES, PART } from "../birds/birdMesh.js";

/** the limp pose: fold per side (0 open .. 1 folded), the hanging angle (rad, toward the back: under the falcon once
 *  rolled belly-up), the head's droop (rad) */
export const LIMP = { foldR: 1, foldL: 0.75, hangR: 0.12, hangL: 0.9, head: 0.35 };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** the square pigeon (pigeons.js), its shader's fold / flap done on the CPU with the limp pose, nose turned to -z */
function pigeonLimp() {
  const g = pigeonGeometry(), P = g.attributes.position.array, C = g.attributes.color.array, W = g.attributes.wing.array;
  const pos = [], col = [];
  const n = P.length / 3;
  for (let t = 0; t < n; t += 3) {
    // (the tucked feet: the two little triangles under the body, hidden in the talons)
    if (P[t * 3 + 1] < -0.054 && P[t * 3 + 4] < -0.054 && P[t * 3 + 7] < -0.054) continue;
    for (let v = t; v < t + 3; v++) {
      let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      const w = W[v], s = Math.abs(w);
      if (s > 0) {
        // (pigeonMaterial: the fold lays the wing back along the body; th lifts the tip about the shoulder)
        const side = Math.sign(x) || 1, fold = side > 0 ? LIMP.foldR : LIMP.foldL, th = (side > 0 ? LIMP.hangR : LIMP.hangL) * Math.min(s, 1);
        const fx = Math.max(Math.abs(x) - 0.03, 0) * (1 - fold * 0.86), fz = z - fold * s * 0.2, fy = y + fold * s * 0.012;
        const wx = 0.03 + fx * Math.cos(th) - (fy - 0.035) * Math.sin(th), wy = 0.035 + fx * Math.sin(th) + (fy - 0.035) * Math.cos(th);
        const k = sstep(0, 0.02, s);
        x = x + (side * wx - x) * k; y = y + (wy - y) * k; z = z + (fz - z) * k;
      } else if (z > 0.11) {
        // the head and the neck's tip: drooped about the neck (toward the back: the bird is held belly-up)
        const a = -LIMP.head * sstep(0.11, 0.15, z), py = 0.03, pz = 0.11, yy = y - py, zz = z - pz;
        y = py + yy * Math.cos(a) - zz * Math.sin(a); z = pz + yy * Math.sin(a) + zz * Math.cos(a);
      }
      pos.push(-x, y, -z);                       // (nose -z: a half turn about y)
      col.push(C[v * 3], C[v * 3 + 1], C[v * 3 + 2]);
    }
  }
  return finish(pos, col);
}

/** a sky species (birdMesh.js near bird, skyFlocks.js buildNear's layout on the CPU), limp, nose -z */
function skyLimp(sp) {
  const S = SPECIES[sp], g = nearBirdGeometry(), P = g.attributes.position.array, A = g.attributes.part.array, I = g.index.array;
  const len = S.len, span = S.span, bodyHW = len * 0.11, half = span * 0.5;
  const pos = [], col = [];
  const colOf = (part, s) => (part === PART.back || part === PART.tail ? S.back : part === PART.belly ? S.belly : part === PART.head ? S.head : part === PART.beak ? S.beak : s > 0.72 ? S.tipC : S.wing);
  for (let t = 0; t < I.length; t += 3) {
    for (let c = 0; c < 3; c++) {
      const v = I[t + c], part = A[v], px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2];
      let x, y, z, s = 0;
      if (part === PART.wing) {
        s = Math.abs(px); const side = Math.sign(px) || 1, q = pz;
        const fold = side > 0 ? LIMP.foldR : LIMP.foldL, th = (side > 0 ? LIMP.hangR : LIMP.hangL) * s + s * 0.08;
        const rr = s * (half - bodyHW) * (1 - fold * 0.86);
        const chord = (S.root + (S.tip - S.root) * Math.pow(s, 1.3)) * span;
        // (folded: the hand slid back along the body until the wingtip lies at the tail's tip, as a resting bird's)
        const tipZ = len * 0.1 - S.sweep * span - S.tip * span * (1 - fold * 0.35), tailZ = -(0.38 + S.tail) * len;
        const zle = len * 0.1 - S.sweep * span * Math.pow(s, 1.5) - fold * s * Math.max(0, tipZ - tailZ - 0.03 * len);
        x = side * (bodyHW + rr * Math.cos(th)); y = rr * Math.sin(th) + len * 0.03; z = zle - q * chord * (1 - fold * 0.35);
      } else if (part === PART.tail) {
        const tt = px, q = pz;
        x = q * (len * 0.04 + tt * S.tailW * S.tail * len); y = len * 0.01; z = -len * 0.38 - tt * S.tail * len;
      } else {
        x = px * len; y = py * len; z = pz * len;
        if (part === PART.head || part === PART.beak) {
          const a = -LIMP.head, cy = 0.04 * len, cz = 0.26 * len, yy = y - cy, zz = z - cz;
          y = cy + yy * Math.cos(a) - zz * Math.sin(a); z = cz + yy * Math.sin(a) + zz * Math.cos(a);
        }
      }
      pos.push(-x, y, -z);
      const k = colOf(part, s); col.push(k[0], k[1], k[2]);
    }
  }
  return finish(pos, col);
}

function finish(pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/** the shapes, by name: "square" (a square flock's pigeon or jackdaw: pigeons.js) and every sky species (birdMesh.js
 *  SPECIES names: starling, jackdaw, pigeon, gull, parakeet) */
export const SHAPES = ["square", ...SPECIES.map((s) => s.name)];
let CACHE = null;
export function heldShapes() {
  if (CACHE) return CACHE;
  CACHE = { square: pigeonLimp() };
  SPECIES.forEach((s, i) => { CACHE[s.name] = skyLimp(i); });
  return CACHE;
}

/** the pooled held bird: one mesh (hidden until a catch), its shape and tint set by show() */
export class HeldPrey {
  constructor() {
    const G = heldShapes();
    this.tint = uniform(new THREE.Color(1, 1, 1));
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, metalness: 0, flatShading: true, side: THREE.DoubleSide });
    m.name = "falcon-held-prey";
    m.colorNode = attribute("color", "vec3").mul(this.tint);
    this.mesh = new THREE.Mesh(G.square, m);
    this.mesh.name = "falcon-held-prey"; this.mesh.visible = false;
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.look = { shape: "square", scale: 1, tint: [1, 1, 1] };
  }
  /** look: { shape (SHAPES), scale (the flock's draw scale), tint [r, g, b] }; returns the mesh, shown */
  show(look) {
    const G = heldShapes(), g = G[look.shape] || G.square;
    this.mesh.geometry = g;
    const t = look.tint || [1, 1, 1];
    this.tint.value.setRGB(t[0], t[1], t[2]);
    this.look.shape = G[look.shape] ? look.shape : "square"; this.look.scale = look.scale || 1; this.look.tint = [t[0], t[1], t[2]];
    this.mesh.visible = true;
    return this.mesh;
  }
  hide() { this.mesh.visible = false; }
}
