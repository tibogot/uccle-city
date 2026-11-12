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
import { wind, windAt } from "./wind.js";
import { leafCard } from "./cards.js";
import { noiseAt } from "./noise.js";

export const ivyU = { cardNear: uniform(12), cardFar: uniform(22) };

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; }; }

/**
 * Grow ivy on a wall. wall = { origin: Vector3 (bottom-left), right: Vector3 (unit, along the wall), up: Vector3 (unit),
 * normal: Vector3 (unit, out of the wall), width, height }, opts = { roots: [u...] (metres along the wall),
 * maxHeight, avoid: [[u0, v0, u1, v1]...] (windows / door), seed }.
 * Returns { group, stats }.
 */
export function growIvy(wall, { roots = [0.5], maxHeight = wall.height * 0.8, avoid = [], seed = 1, reach = 2.6 } = {}) {
  const R = rng(seed * 7919 + 13);
  const STEP = 0.04;
  // ---- polish 2026-11-11: grown like real ivy, not in columns. A few roots; the colony is a MOUND over each root
  // (envelope: highest above the root, lower to the sides, ragged top); stems climb, branch often and spread sideways
  // away from what is already covered (a density grid), DEFLECT round window frames (hug the frame, go over the
  // lintel / under the sill) instead of dying there; leaves thin out towards the envelope's edge; a few stems trail
  // down from the top edge and over the window heads.
  const inAvoid = (u, v, m = 0.02) => avoid.some(([a, b, c, d]) => u > a - m && u < c + m && v > b - m && v < d + m);
  const CELL = 0.06, GW = Math.ceil(wall.width / CELL) + 1, GH = Math.ceil(wall.height / CELL) + 1;
  const dens = new Float32Array(GW * GH);
  const dAt = (u, v) => { const i = Math.floor(u / CELL), j = Math.floor(v / CELL); return i < 0 || j < 0 || i >= GW || j >= GH ? 9 : dens[j * GW + i]; };
  const mark = (u, v) => { const i0 = Math.floor(u / CELL), j0 = Math.floor(v / CELL); for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) if (i >= 0 && j >= 0 && i < GW && j < GH) dens[j * GW + i] += i === i0 && j === j0 ? 1 : 0.35; };
  // envelope: a mound per root (height, lateral spread), a ragged top (two sines of random phase)
  const mounds = roots.map((r) => ({ r, h: maxHeight * (0.72 + 0.28 * R()), s: reach * (0.42 + 0.22 * R()) }));
  const ph1 = R() * 6.28, ph2 = R() * 6.28;
  const env = (u) => {
    let h = 0; for (const m of mounds) h = Math.max(h, m.h * Math.exp(-(((u - m.r) / m.s) ** 2)));
    return Math.min(maxHeight, h + 0.22 * Math.sin(u * 3.1 + ph1) + 0.14 * Math.sin(u * 7.3 + ph2));
  };
  const branches = [];
  const alive = roots.map((u) => ({ u, v: 0.02, du: (R() - 0.5) * 0.4, dv: 1, len: 0, max: maxHeight * 1.6, pts: [[u, 0.02]], w: 0.014, main: true }));
  const blocked = (u, v) => u < 0.04 || u > wall.width - 0.04 || v < 0.01 || v > env(u) || inAvoid(u, v);
  let guard = 0, nb = alive.length;
  while (alive.length && guard++ < 60000) {
    const b = alive[alive.length - 1];
    // keep going + pull up (stronger on the main stems) + wander + spread away from the covered side
    const side = dAt(b.u - 0.18, b.v) - dAt(b.u + 0.18, b.v);
    let du = b.du * 0.55 + (R() - 0.5) * 0.9 + Math.max(-0.6, Math.min(0.6, side * 0.12));
    let dv = b.dv * 0.5 + (b.main ? 0.3 : 0.12) + (R() - 0.5) * 0.5;
    const l = Math.hypot(du, dv) || 1; du /= l; dv /= l;
    let nu = b.u + du * STEP, nv = b.v + dv * STEP;
    if (blocked(nu, nv)) {
      // deflect: turn by 40 / 75 / 110 degrees, the emptier side first (round a frame, along the envelope)
      const order = dAt(b.u - 0.12, b.v) < dAt(b.u + 0.12, b.v) ? [1, -1] : [-1, 1];
      let ok = false;
      for (const a of [0.7, 1.3, 1.9]) for (const sg of order) {
        if (ok) break;
        const c = Math.cos(a * sg), s2 = Math.sin(a * sg), tu = du * c - dv * s2, tv = du * s2 + dv * c;
        if (!blocked(b.u + tu * STEP, b.v + tv * STEP)) { du = tu; dv = tv; nu = b.u + tu * STEP; nv = b.v + tv * STEP; ok = true; }
      }
      if (!ok) { branches.push(alive.pop()); continue; }
    }
    // long enough, or the wall here is full: stop
    if (b.len > b.max || (b.len > 0.4 && dAt(nu, nv) > 6.5)) { branches.push(alive.pop()); continue; }
    b.u = nu; b.v = nv; b.du = du; b.dv = dv; b.len += STEP; b.pts.push([nu, nv]); mark(nu, nv);
    if (R() < (b.main ? 0.075 : 0.05) && nb < 320 && b.len > 0.12) {
      const sd = R() < 0.5 ? -1 : 1;
      alive.unshift({ u: nu, v: nv, du: sd * (0.75 + 0.4 * R()), dv: 0.05 + 0.45 * R(), len: 0, max: reach * (0.25 + 0.55 * R()), pts: [[nu, nv]], w: Math.max(0.005, b.w * 0.72), main: R() < 0.18 });
      nb++;
    }
  }
  // trailing stems: hang from the colony's top edge and from the ivy above a window head, a little off the wall
  const trailing = [];
  const heads = avoid.map(([a, , c, d]) => [a, c, d]);
  for (const b of branches) for (let k = 4; k < b.pts.length; k += 6) {
    const [u, v] = b.pts[k];
    const top = env(u) - v < 0.25;
    const head = heads.find(([a, c, d]) => u > a + 0.05 && u < c - 0.05 && v > d + 0.02 && v < d + 0.3);
    if (!(top && R() < 0.22) && !(head && R() < 0.3)) continue;
    const L = head ? 0.08 + 0.14 * R() : 0.3 + 0.7 * R();
    const pts = [[u, v]]; let cu = u, cv = v, cd = (R() - 0.5) * 0.3;
    for (let t = 0; t < L; t += STEP) { cd = cd * 0.7 + (R() - 0.5) * 0.25; cu += cd * STEP; cv -= STEP; if (cv < 0.3) break; pts.push([cu, cv]); }
    if (pts.length > 3 && trailing.length < 40) trailing.push({ pts, w: 0.005, trail: true });
  }
  branches.push(...trailing);
  const edgeAt = (u, v) => Math.min(1, Math.max(0, (env(u) - v) / 0.9));      // 0 at the envelope's top / sides, 1 inside
  // patchy density: a smooth value noise (~0.8 m cells, two octaves) so the mass has thin places where brick shows
  const lat = new Float32Array(64 * 64).map(() => R());
  const vn = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => lat[((j & 63) << 6) | (i & 63)];
    return (g(ix, iy) * (1 - sx) + g(ix + 1, iy) * sx) * (1 - sy) + (g(ix, iy + 1) * (1 - sx) + g(ix + 1, iy + 1) * sx) * sy;
  };
  const patch = (u, v) => Math.min(1, Math.max(0, (vn(u / 0.8, v / 0.8) * 0.7 + vn(u / 0.3 + 17, v / 0.3) * 0.3 - 0.22) * 1.9));
  const onGlass = (u, v) => inAvoid(u, v, -0.06);                               // > 6 cm inside an opening
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
  // ---- leaves: a spray every ~7 cm along each branch (except the bare lowest 15 cm of the roots)
  const cp = [], cn = [], cr = [];
  const PX = 48, cw = Math.ceil(wall.width * PX), ch = Math.ceil(wall.height * PX);
  const cov = new OffscreenCanvas(cw, ch), g = cov.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, cw, ch);
  g.fillStyle = "#fff";
  const perCell = new Uint8Array(GW * GH);
  for (const b of branches) for (let k = 1; k < b.pts.length; k += 1) {
    const [u, v] = b.pts[k];
    // fewer leaves near the envelope's edge (a thin, ragged margin), none on the bare lowest stems, at most two sprays
    // per 6 cm cell (no clumped double layers); trailing stems carry a leaf every other step or so
    const e = b.trail ? 0.55 : edgeAt(u, v) * patch(u, v);
    if (v < 0.12 || R() > 0.08 + 0.62 * e || (!b.trail && onGlass(u, v))) continue;
    const ci = Math.min(GW - 1, Math.max(0, Math.floor(u / CELL))) + Math.min(GH - 1, Math.max(0, Math.floor(v / CELL))) * GW;
    if (perCell[ci] >= 2) continue;
    perCell[ci]++;
    const p = W(u + (R() - 0.5) * 0.06, v + (R() - 0.5) * 0.06, (b.trail ? 0.03 + 0.05 * k / b.pts.length : 0.04) + R() * 0.05);
    cp.push(p.x, p.y, p.z); cn.push(wall.normal.x, wall.normal.y, wall.normal.z); cr.push(R(), R(), R(), R());
    if (b.trail) continue;                                                      // hanging sprays: cards only
    g.globalAlpha = 0.85; g.beginPath(); g.arc(u * PX, (wall.height - v) * PX, 0.08 * PX * (0.8 + 0.4 * R()), 0, Math.PI * 2); g.fill();
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
  const w = windAt(cpos.xz);
  const flick = sin(wind.uTime.mul(5.5).add(crr.w.mul(40))).mul(w.z.mul(0.015).add(0.003));
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
