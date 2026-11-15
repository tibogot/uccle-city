// IVY CLIMBING A WALL (Hedera helix), grown in code on a planar wall (docs/FOLIAGE.md §8).
// Growth (Thomas Luft's IvyGenerator rules, simplified to a plane, + a density grid): roots at the wall's foot; every
// 4 cm a branch steps along 0.55 x its previous direction + an upward pull + a random wander + a push away from the
// already-covered side; it branches off (5-7.5 % per step, at most 320), DEFLECTS round windows (the `avoid`
// rectangles: ivy is cut back round the frames) and the colony's envelope (a ragged mound over each root), and dies
// when it is long enough or the wall there is full. Trailing stems hang from the top edge and over window heads.
// Deterministic: seeded by the wall.
// Drawn as:
//   STEMS   flat ribbons on the wall (2 tris per step), 6-12 mm wide, woody grey-brown        - near only (< 12 m)
//   LEAVES  ivy leaf-spray cards (cards.js, coverage-preserving mips, alpha to coverage), facing out of the wall with
//           a tilt, shrinking into the mantle between 12 and 22 m
//   MANTLE  a quad just in front of the wall whose alpha is the ivy's coverage (painted from the leaf positions,
//           blurred, coverage-preserving mips): what the ivy looks like from afar, always drawn; near, the cards sit
//           on it and give it relief. So far away the ivy is a stable green mass, never sub-pixel cards.
// Wind: the cards flutter a little. Seasons: evergreen (darker in winter, black berries not modelled).
import * as THREE from "three/webgpu";
import {
  float, vec2, vec3, vec4, uniform, uv, attribute, mix, smoothstep, max, normalize, cross, length, cameraPosition, texture,
  sin, cos, fwidth, saturate, varying, cameraViewMatrix,
} from "three/tsl";
import { season } from "./seasons.js";
import { wind, windAt, windPrev } from "./wind.js";
import { setMotionDelta } from "../upscale.js";   // --- instmotion (the wind at last frame's time)
import { leafCard } from "./cards.js";
import { noiseAt } from "./noise.js";
import { growIvyData } from "./ivyGrow.js";

export const ivyU = { cardNear: uniform(12), cardFar: uniform(22) };


/**
 * Grow ivy on a wall. wall = { origin: Vector3 (bottom-left), right: Vector3 (unit, along the wall), up: Vector3 (unit),
 * normal: Vector3 (unit, out of the wall), width, height }, opts = { roots: [u...] (metres along the wall),
 * maxHeight, avoid: [[u0, v0, u1, v1]...] (windows / door), seed }.
 * Returns { group, stats }.
 */
export function growIvy(wall, { roots = [0.5], maxHeight = wall.height * 0.8, avoid = [], seed = 1, reach = 2.6 } = {}) {
  // the growth (pure JS, shared with the city's ivy build): viewer/foliage/ivyGrow.js
  const { branches, leaves } = growIvyData(wall, { roots, maxHeight, avoid, seed, reach });
  const W = (u, v, out = 0) => wall.origin.clone().addScaledVector(wall.right, u).addScaledVector(wall.up, v).addScaledVector(wall.normal, out);
  // ---- stems: ribbons
  const sp = [], si = [];
  for (const b of branches) {
    for (let k = 0; k < b.pts.length; k++) {
      const [u, v] = b.pts[k], [u2, v2] = b.pts[Math.min(k + 1, b.pts.length - 1)], [u1, v1] = b.pts[Math.max(k - 1, 0)];
      let tu = u2 - u1, tv = v2 - v1; const tl = Math.hypot(tu, tv) || 1; tu /= tl; tv /= tl;
      const w = b.w * (1 - 0.5 * k / b.pts.length);
      const off = b.trail ? 0.012 + 0.05 * k / b.pts.length : 0.008;
      const a = W(u - tv * w, v + tu * w, off), c = W(u + tv * w, v - tu * w, off);
      sp.push(a.x, a.y, a.z, c.x, c.y, c.z);
      if (k) { const i = sp.length / 3 - 4; si.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
    }
  }
  const stemG = new THREE.BufferGeometry();
  stemG.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  stemG.setIndex(si); stemG.computeVertexNormals();
  const stemM = new THREE.MeshStandardNodeMaterial({ color: 0x4a3d2c, roughness: 0.9, side: THREE.DoubleSide });
  const stemN = vec3(wall.normal.x, wall.normal.y, wall.normal.z);
  stemM.normalNode = normalize(cameraViewMatrix.mul(vec4(stemN, 0)).xyz);
  const stems = new THREE.Mesh(stemG, stemM);
  // ---- leaves (placed by growIvyData): cards + the mantle's coverage
  const cp = [], cn = [], cr = [];
  const PX = 48, cw = Math.ceil(wall.width * PX), ch = Math.ceil(wall.height * PX);
  const cov = new OffscreenCanvas(cw, ch), g = cov.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, cw, ch);
  g.fillStyle = "#fff";
  for (const L of leaves) {
    const p = W(L.u, L.v, L.out);
    cp.push(p.x, p.y, p.z); cn.push(wall.normal.x, wall.normal.y, wall.normal.z); cr.push(...L.r);
    if (L.trail) continue;
    g.globalAlpha = 0.85; g.beginPath(); g.arc(L.u * PX, (wall.height - L.v) * PX, 0.08 * PX * L.disc, 0, Math.PI * 2); g.fill();
  }
  // the mantle never covers the glass: the openings (3 cm in from their edge) are cleared from the coverage
  g.globalAlpha = 1; g.fillStyle = "#000";
  for (const [a0, b0, c0, d0] of avoid) g.fillRect((a0 + 0.03) * PX, (wall.height - d0 + 0.03) * PX, (c0 - a0 - 0.06) * PX, (d0 - b0 - 0.06) * PX);
  // mantle texture: blurred coverage, coverage-preserving mips
  const blur = new OffscreenCanvas(cw, ch), bg = blur.getContext("2d");
  bg.filter = "blur(2px)"; bg.drawImage(cov, 0, 0);
  const mantleTex = coverageMask(bg.getImageData(0, 0, cw, ch), 0.5);
  const quad = new THREE.PlaneGeometry(1, 1);
  const ig = new THREE.InstancedBufferGeometry();
  ig.index = quad.index; ig.setAttribute("position", quad.attributes.position); ig.setAttribute("uv", quad.attributes.uv);
  ig.setAttribute("cpos", new THREE.InstancedBufferAttribute(new Float32Array(cp), 3));
  ig.setAttribute("cnrm", new THREE.InstancedBufferAttribute(new Float32Array(cn), 3));
  ig.setAttribute("crnd", new THREE.InstancedBufferAttribute(new Float32Array(cr), 4));
  ig.instanceCount = cp.length / 3;
  const cardM = new THREE.MeshStandardNodeMaterial({ roughness: 0.45, side: THREE.DoubleSide });
  cardM.alphaToCoverage = true;
  const cpos = attribute("cpos", "vec3"), cnn = normalize(attribute("cnrm", "vec3")), crr = attribute("crnd", "vec4");
  const dist = length(cpos.sub(cameraPosition));
  const grow = float(1).sub(smoothstep(ivyU.cardNear, ivyU.cardFar, dist));
  const up = vec3(wall.up.x, wall.up.y, wall.up.z);
  const t1 = normalize(cross(up, cnn)), t2 = cross(cnn, t1);
  const ang = crr.x.mul(6.2832), ca = cos(ang), sa = sin(ang);
  const ax = t1.mul(ca).add(t2.mul(sa)), ay = t2.mul(ca).sub(t1.mul(sa));
  const tilt = crr.y.mul(0.6).add(0.25);
  const cardN = normalize(cnn.mul(cos(tilt)).add(ay.mul(sin(tilt))));
  const cardY = normalize(cross(cardN, ax));
  const size = float(0.24).mul(crr.z.mul(0.5).add(0.75)).mul(grow);
  const p = attribute("position", "vec3");
  const [flick, flickP] = windPrev(() => sin(wind.uTime.mul(5.5).add(crr.w.mul(40))).mul(windAt(cpos.xz).z.mul(0.015).add(0.003)));
  setMotionDelta(cardM, cnn.mul(flickP.sub(flick)));               // --- instmotion
  cardM.positionNode = cpos.add(ax.mul(p.x.mul(size))).add(cardY.mul(p.y.mul(size))).add(cnn.mul(flick));
  const tex = leafCard("ivy");
  const a = texture(tex, uv());
  cardM.opacityNode = saturate(a.a.sub(0.5).div(max(fwidth(a.a), 1e-4)).add(0.5));
  const winterDark = mix(float(1), float(0.8), float(1).sub(season.u.leaf).mul(0.6));
  cardM.colorNode = vec3(0.07, 0.13, 0.035).mul(a.r).mul(varying(crr.w.mul(0.35).add(0.8), "v_iS")).mul(winterDark);
  cardM.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(normalize(cnn.mul(0.6).add(cardN.mul(0.4))), "v_iN"), 0)).xyz);
  const cards = new THREE.Mesh(ig, cardM); cards.frustumCulled = false; cards.receiveShadow = true;
  // ---- mantle
  const mG = new THREE.PlaneGeometry(wall.width, wall.height);
  const centre = W(wall.width / 2, wall.height / 2, 0.025);
  const mantle = new THREE.Mesh(mG, new THREE.MeshStandardNodeMaterial({ roughness: 0.6 }));
  mantle.position.copy(centre);
  mantle.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(wall.right, wall.up, wall.normal));
  const mm = mantle.material;
  mm.alphaToCoverage = true;
  const ma = texture(mantleTex, uv()).r;
  mm.opacityNode = saturate(ma.sub(0.5).div(max(fwidth(ma), 1e-4)).add(0.5));
  const leafN = noiseAt(uv().mul(vec2(wall.width, wall.height)), 1 / 0.18).a;
  mm.colorNode = vec3(0.055, 0.105, 0.03).mul(leafN.mul(0.7).add(0.45)).mul(winterDark);
  mm.roughnessNode = float(0.5);
  mantle.receiveShadow = true;
  const group = new THREE.Group(); group.name = "ivy";
  group.add(mantle, stems, cards);
  return { group, stats: { branches: branches.length, leafCards: ig.instanceCount, stemTris: si.length / 3 } };
}

/** a single-channel coverage mask (from ImageData's red) as a texture with coverage-preserving mips */
function coverageMask(img, cut) {
  const W0 = img.width, H0 = img.height;
  let w = W0, h = H0, a = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = img.data[i * 4] / 255;
  // flip rows (canvas top = wall top = uv.y 1)
  const flip = (arr, w, h) => { const o = new Float32Array(arr.length); for (let y = 0; y < h; y++) o.set(arr.subarray((h - 1 - y) * w, (h - y) * w), y * w); return o; };
  a = flip(a, w, h);
  const cov = (arr, s = 1) => { let n = 0; for (const x of arr) if (x * s >= cut) n++; return n / arr.length; };
  const target = cov(a);
  const pack = (arr, w, h) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { const v = Math.round(Math.min(1, arr[i]) * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } return { data: d, width: w, height: h }; };
  const levels = [pack(a, w, h)];
  while (w > 1 || h > 1) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), n = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let s = 0, c = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const xx = Math.min(w - 1, x * 2 + dx), yy = Math.min(h - 1, y * 2 + dy); s += a[yy * w + xx]; c++; }
      n[y * nw + x] = s / c;
    }
    let lo = 0, hi = 8;
    for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; if (cov(n, m) < target) lo = m; else hi = m; }
    const k = (lo + hi) / 2; for (let i = 0; i < n.length; i++) n[i] = Math.min(1, n[i] * k);
    a = n; w = nw; h = nh; levels.push(pack(a, w, h));
  }
  const t = new THREE.DataTexture(levels[0].data, W0, H0, THREE.RGBAFormat);
  t.mipmaps = levels; t.generateMipmaps = false;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
