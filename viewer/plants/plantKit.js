// THE PLANTS' BOXY PIECES (procedural JS, docs/FOLIAGE.md "City"): planting beds (mulch) and window boxes.
//   bed         a unit SUPERELLIPSE (|x|^4 + |z|^4 = 1, x / z -0.5..0.5) mulch mound, 48 outline points: scaled to any
//               length / width it stays a smooth rounded strip (no saw-tooth edge, no squashed caps); a skirt 0.18 m
//               down (JOINS: the bed never shows a floating edge on sloping ground); the city keeps the grass out of
//               the same outline (viewer/grass/grassField.js solid pass)
//   windowbox   a planter on the sill: unit length along x (-0.5..0.5), 0.2 m deep (z 0..0.2, out of the wall), 0.18 m
//               high, a top lip, the soil 2 cm under the rim, two iron brackets; LOD1 the plain box + soil
// Per instance iKit = (variant, rnd, -, -) and iBand = (LOD 0->1, LOD 1->2, end, the tile's fade slot), the kit's
// per-pixel dithered LOD hand-over and tile fade (plantMaterial.js lodKeep). Weather: wxMat (wet, snow on top).
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, vec3, float, mix, smoothstep, length, select, positionWorld, fwidth, max, normalWorld,
} from "three/tsl";
import { season } from "../foliage/seasons.js";
import { noiseAt } from "../foliage/noise.js";
import { lodEye, ditherNoise, keepBand } from "../lodFade.js";
import { plantFades } from "./plantMaterial.js";
import { wxMat } from "../weather/cityWeatherize.js";

// ------------------------------------------------------------------------------------------------ geometry
/** the bed's unit mound: centre 6.5 cm, rim 3.5 cm, skirt to -18 cm; attribute "edge" 0 centre .. 1 rim, 2 skirt */
export function bedGeometry(n = 48) {
  const P = [0, 0.065, 0], N = [0, 1, 0], E = [0], I = [];
  const ring = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const r = 1 / Math.pow(Math.abs(c) ** 4 + Math.abs(s) ** 4, 0.25);
    ring.push([c * r * 0.5, s * r * 0.5]);
  }
  // two rings on the top (mid, rim) for the dome, then the skirt (its own vertices: flat outward normals)
  for (const [f, y] of [[0.6, 0.058], [1, 0.035]]) for (const [x, z] of ring) { P.push(x * f, y, z * f); N.push(0, 1, 0); E.push(f); }
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    I.push(0, 1 + k1, 1 + k);
    I.push(1 + k, 1 + k1, 1 + n + k, 1 + k1, 1 + n + k1, 1 + n + k);
  }
  const sb = P.length / 3;
  for (let k = 0; k < n; k++) {
    const [x, z] = ring[k], l = Math.hypot(x, z) || 1;
    P.push(x, 0.035, z, x * 1.04, -0.18, z * 1.04);
    N.push(x / l, 0.3, z / l, x / l, 0.3, z / l); E.push(2, 2);
  }
  for (let k = 0; k < n; k++) { const a = sb + k * 2, b = sb + ((k + 1) % n) * 2; I.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("edge", new THREE.Float32BufferAttribute(E, 1));
  g.setIndex(I);
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true;
  return g;
}

/** a window box LOD: flat-shaded quads, part per vertex (0 paint, 1 soil, 2 iron) */
export function windowBoxGeometry(lod) {
  const P = [], N = [], A = [], I = [];
  const quad = (a, b, c, d, n, part) => {
    const o = P.length / 3;
    for (const p of [a, b, c, d]) { P.push(...p); N.push(...n); A.push(part); }
    I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  const box = (x0, x1, y0, y1, z0, z1, part, faces = "all") => {
    const f = (k) => faces === "all" || faces.includes(k);
    if (f("+z")) quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], part);
    if (f("-z")) quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], part);
    if (f("+x")) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], part);
    if (f("-x")) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], part);
    if (f("+y")) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], part);
    if (f("-y")) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], part);
  };
  const W = 0.5, D = 0.2, H = 0.18, t = 0.018;
  if (lod === 0) {
    box(-W, W, 0.01, H - 0.02, 0.005, D, 0, ["+z", "+x", "-x", "-y"]);       // the body (its back against the wall)
    box(-W - 0.008, W + 0.008, H - 0.02, H, -0.003, D + 0.008, 0, ["+z", "+x", "-x", "-y"]);   // the lip, 8 mm proud
    // the rim's top: a frame round the soil (4 strips)
    quad([-W - 0.008, H, D + 0.008], [W + 0.008, H, D + 0.008], [W + 0.008, H, D - t], [-W - 0.008, H, D - t], [0, 1, 0], 0);
    quad([-W - 0.008, H, t], [W + 0.008, H, t], [W + 0.008, H, -0.003], [-W - 0.008, H, -0.003], [0, 1, 0], 0);
    quad([-W - 0.008, H, D - t], [-W + t, H, D - t], [-W + t, H, t], [-W - 0.008, H, t], [0, 1, 0], 0);
    quad([W - t, H, D - t], [W + 0.008, H, D - t], [W + 0.008, H, t], [W - t, H, t], [0, 1, 0], 0);
    // the soil, just under the rim (the rim's 8 mm lip hides the step)
    quad([-W + t, H - 0.006, D - t], [W - t, H - 0.006, D - t], [W - t, H - 0.006, t], [-W + t, H - 0.006, t], [0, 1, 0], 1);
    // brackets: L-shaped irons under the box
    for (const x of [-0.36, 0.36]) {
      box(x - 0.01, x + 0.01, -0.09, 0.01, 0.005, 0.03, 2, ["+z", "+x", "-x"]);
      box(x - 0.01, x + 0.01, 0.0, 0.012, 0.005, D * 0.85, 2, ["+x", "-x", "-y", "+z"]);
    }
  } else {
    box(-W, W, 0.01, H, 0.005, D, 0, ["+z", "+x", "-x", "-y"]);
    quad([-W + t, H - 0.01, D - t], [W - t, H - 0.01, D - t], [W - t, H - 0.01, t], [-W + t, H - 0.01, t], [0, 1, 0], 1);
    quad([-W, H, D], [W, H, D], [W, H, D - t], [-W, H, D - t], [0, 1, 0], 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("part", new THREE.Float32BufferAttribute(A, 1));
  g.setIndex(I);
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true;
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
function keep(lod, one = false) {
  const band = attribute("iBand", "vec4"), n = ditherNoise();
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = plantFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = one ? keepBand(e, float(1.01), n) : lod === 0 ? keepBand(t1, float(1.01), n) : keepBand(e, t1, n);
  return k.and(tile);
}

let bedM = null;
/** the mulch: dark bark chips (fine grain faded by its own footprint), wetter / darker at the rim, autumn leaves on it */
export function bedMaterial() {
  if (bedM) return bedM;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const e = attribute("edge", "float");
  const xz = positionWorld.xz;
  const chips = noiseAt(xz, 1 / 0.09).a, mid = noiseAt(xz, 1 / 0.6).b, lit = noiseAt(xz.add(7.3), 1 / 0.25).g;
  const fine = smoothstep(0.004, 0.02, length(fwidth(xz)));
  const grain = mix(chips, float(0.5), fine);
  let c = mix(vec3(0.03, 0.019, 0.012), vec3(0.085, 0.052, 0.03), grain.mul(0.7).add(mid.mul(0.3)));
  // a little soil / moss toward the rim; fallen leaves in autumn
  c = mix(c, vec3(0.05, 0.05, 0.025), smoothstep(0.7, 1.0, e).mul(0.4));
  c = mix(c, vec3(0.22, 0.1, 0.03), smoothstep(0.55, 0.8, lit).mul(season.u.litter).mul(0.8));
  // (the skirt: the mound's soil side, the mulch's own dark brown: a sliver of it shows where the ground dips)
  m.colorNode = select(e.greaterThan(1.5), mix(vec3(0.028, 0.02, 0.014), c, 0.5), c);
  m.roughnessNode = float(0.95);
  m.maskNode = keep(0, true);
  m.name = "plants-bed";
  wxMat(m, { porosity: 0.8, frost: true });
  m.userData.shared = true; m.userData.noFade = true;
  void max; void normalWorld;
  return (bedM = m);
}

// painted timber (Brussels green, cream, slate, white), terracotta, zinc (linear rgb, roughness)
const BOX = [[0.025, 0.06, 0.04, 0.55], [0.72, 0.68, 0.58, 0.6], [0.04, 0.045, 0.055, 0.5], [0.8, 0.8, 0.78, 0.5], [0.36, 0.12, 0.06, 0.88], [0.28, 0.29, 0.29, 0.4]];
const uBox = uniformArray(BOX.map((c) => new THREE.Vector4(...c)), "vec4");
const boxM = [];
export const BOX_VARIANTS = BOX.length;
export function windowBoxMaterial(lod) {
  if (boxM[lod]) return boxM[lod];
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const part = attribute("part", "float"), K = attribute("iKit", "vec4");
  const P = uBox.element(K.x.add(0.5).floor().toInt());
  const soil = mix(vec3(0.05, 0.035, 0.025), vec3(0.09, 0.065, 0.045), noiseAt(positionWorld.xz, 1 / 0.25).a);
  m.colorNode = select(part.lessThan(0.5), P.xyz.mul(K.y.mul(0.12).add(0.94)), select(part.lessThan(1.5), soil, vec3(0.03, 0.03, 0.032)));
  m.roughnessNode = select(part.lessThan(0.5), P.w, select(part.lessThan(1.5), float(1), float(0.45)));
  m.metalnessNode = select(part.greaterThan(1.5), float(0.5), float(0));
  m.maskNode = keep(lod);
  m.maskShadowNode = m.maskNode;
  m.name = `plants-windowbox-lod${lod}`;
  wxMat(m, { porosity: 0.3 });
  m.userData.shared = true; m.userData.noFade = true;
  return (boxM[lod] = m);
}
