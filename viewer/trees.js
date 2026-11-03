// Trees: instanced leaf-card crowns + trunks, placed from features.json trees (LiDAR canopy peaks + OSM).
//
// Approach after mrdoob/slop-newyork js/trees.js (MIT, © 2026 Mr.doob), simplified: crowns are clouds
// of alpha-tested leaf-cluster cards whose normals follow the crown shell (so a crown shades as one
// volume), a per-vertex crown AO darkens the inside, back-lit translucency when looking toward the
// sun, and wind sway growing with height. The leaf texture is drawn once on a canvas at load.
import * as THREE from "three/webgpu";
import {
  attribute, texture, uv, positionLocal, positionWorld, cameraPosition, time, float, vec3, mix, max, pow, dot, normalize, sin, smoothstep,
} from "three/tsl";
import { env } from "./lighting.js";

function leafTexture() {
  const S = 512, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.clearRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // a dense cluster in the middle, sparser to the edges: the card reads as a leafy twig, not a square
  // dense cluster (~80 % coverage) with a ragged edge, so a crown reads full, not see-through
  for (let i = 0; i < 1500; i++) {
    const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.55) * S * 0.47;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const len = 20 + rnd() * 26, wid = len * (0.45 + rnd() * 0.15), rot = rnd() * Math.PI * 2;
    const v = Math.round(110 + rnd() * 145);
    g.save();
    g.translate(x, y); g.rotate(rot);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.moveTo(-len / 2, 0);
    g.quadraticCurveTo(0, -wid, len / 2, 0);
    g.quadraticCurveTo(0, wid, -len / 2, 0);
    g.fill();
    g.restore();
  }
  // Mip chain with alpha coverage preserved (as slop-newyork's coverageMips): plain box-filtered mips
  // average alpha below the 0.5 cut-off and alpha-tested crowns thin out with distance.
  const mips = [];
  let src = g.getImageData(0, 0, S, S);
  const cover = (img) => { let n = 0; for (let k = 3; k < img.data.length; k += 4) n += img.data[k] >= 128; return n / (img.data.length / 4); };
  const target = cover(src);
  mips.push(src);
  for (let size = S / 2; size >= 1; size /= 2) {
    const prev = mips[mips.length - 1], out = new ImageData(size, size), ps = size * 2;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        let sum = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) sum += prev.data[((y * 2 + dy) * ps + x * 2 + dx) * 4 + ch];
        out.data[o + ch] = sum / 4;
      }
    }
    // scale alpha so the share of texels >= 0.5 matches the full-size texture
    let lo = 0.5, hi = 4;
    for (let it = 0; it < 12; it++) {
      const mid = (lo + hi) / 2;
      let n = 0;
      for (let k = 3; k < out.data.length; k += 4) n += Math.min(255, out.data[k] * mid) >= 128;
      if (n / (size * size) < target) lo = mid; else hi = mid;
    }
    for (let k = 3; k < out.data.length; k += 4) out.data[k] = Math.min(255, out.data[k] * hi);
    mips.push(out);
  }
  const t = new THREE.DataTexture(mips[0].data, S, S, THREE.RGBAFormat);
  t.mipmaps = mips.map((m) => ({ data: m.data, width: m.width, height: m.height }));
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Crown of `cards` quads on a unit ellipsoid (radius 1, centre 0). shape: 0 round, 1 cone (conifer). */
function crownGeometry(cards, shape, seed0) {
  let seed = seed0;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pos = [], nrm = [], uvs = [], ao = [], idx = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < cards; i++) {
    const yy = 1 - (i + 0.5) / cards * 2;                    // Fibonacci sphere
    const rr = Math.sqrt(1 - yy * yy), th = golden * i;
    let px = Math.cos(th) * rr, py = yy, pz = Math.sin(th) * rr;
    if (shape === 1) { const k = (1 - py) / 2; px *= k * 1.1; pz *= k * 1.1; }   // cone: wide at the bottom
    const depth = 0.55 + rnd() * 0.45;
    px *= depth; py *= depth; pz *= depth;
    const size = (shape === 1 ? 0.42 : 0.55) + rnd() * 0.25;
    // card orientation: random, then the shell normal for shading
    const a = rnd() * Math.PI * 2, b = (rnd() - 0.5) * Math.PI;
    const ux = Math.cos(a), uz = Math.sin(a);
    const t1 = [ux * size, 0, uz * size], t2 = [-uz * Math.sin(b) * size, Math.cos(b) * size, ux * Math.sin(b) * size];
    const nl = Math.hypot(px, py, pz) || 1;
    const sn = [px / nl, py / nl + 0.22, pz / nl];
    const cn = [t1[1] * t2[2] - t1[2] * t2[1], t1[2] * t2[0] - t1[0] * t2[2], t1[0] * t2[1] - t1[1] * t2[0]];
    const cl = Math.hypot(...cn) || 1;
    const sgn = cn[0] * px + cn[1] * py + cn[2] * pz < 0 ? -1 : 1;
    const nn = sn.map((v, k) => v * 0.72 + (cn[k] / cl) * sgn * 0.28);
    const nnl = Math.hypot(...nn);
    const base = pos.length / 3;
    for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pos.push(px + t1[0] * s + t2[0] * t, py + t1[1] * s + t2[1] * t, pz + t1[2] * s + t2[2] * t);
      nrm.push(nn[0] / nnl, nn[1] / nnl, nn[2] / nnl);
      uvs.push((s + 1) / 2, (t + 1) / 2);
      ao.push(0.45 + 0.55 * depth * (0.75 + 0.25 * (py + 1) / 2));
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("aAO", new THREE.Float32BufferAttribute(ao, 1));
  // crown-local height -1..1 (positionLocal is already instanced in the material, so it can't serve)
  g.setAttribute("aCrownY", new THREE.Float32BufferAttribute(pos.filter((_, k) => k % 3 === 1), 1));
  g.setIndex(idx);
  return g;
}

function leafMaterial(tex) {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, alphaTest: 0.5, alphaToCoverage: true, roughness: 0.85, metalness: 0 });
  const tint = attribute("aTint", "vec3"), seed = attribute("aSeed", "float"), ao = attribute("aAO", "float");
  const t = texture(tex, uv());
  const leaf = tint.mul(t.r.mul(1.25).add(0.15)).mul(ao);
  m.colorNode = leaf;
  m.opacityNode = t.a;
  // wind: whole-crown sway (grows with height in the crown) + leaf flutter
  // offsets in metres; crownY is the card's height in the crown (-1 bottom .. 1 top)
  const crownY = attribute("aCrownY", "float").clamp(-1, 1);
  const gust = sin(time.mul(0.9).add(seed.mul(6.28)).add(positionWorld.x.mul(0.05))).mul(0.5).add(0.5);
  const sway = crownY.add(1.0).mul(0.5).pow(2.0).mul(gust.mul(0.18).add(0.04));
  const flutter = sin(time.mul(8.0).add(positionWorld.x.mul(13.0)).add(seed.mul(31.0))).mul(0.02);
  m.positionNode = positionLocal.add(vec3(sway.add(flutter), flutter, sway.mul(0.6)));
  // back-lit translucency when looking toward the sun through the crown
  const toFrag = normalize(positionWorld.sub(cameraPosition));
  const back = pow(max(dot(toFrag, normalize(vec3(env.uSunDir))), 0.0), 4.0);
  m.emissiveNode = leaf.mul(vec3(env.uSunColor)).mul(back).mul(0.55);
  m.aoNode = mix(float(0.55), float(1.0), ao);
  return m;
}

/**
 * @param trees  features.json trees ({x, z, y?, height?, crown?})
 * @param ground (x, z) => surface y
 */
export function buildTrees(trees, ground, inTile) {
  const group = new THREE.Group();
  group.name = "trees";
  const list = trees.filter((t) => inTile(t.x, t.z));
  if (!list.length) return { group, count: 0 };
  const tex = leafTexture();
  const mat = leafMaterial(tex);
  const variants = [
    { shape: 0, geo: crownGeometry(110, 0, 11), share: 0.62 },    // broad deciduous
    { shape: 0, geo: crownGeometry(96, 0, 29), share: 0.24 },     // second deciduous set
    { shape: 1, geo: crownGeometry(80, 1, 47), share: 0.14 },     // conifer
  ];
  const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
  const buckets = variants.map(() => []);
  for (const t of list) {
    const r = hash(t.x, t.z);
    let k = 0, acc = 0;
    for (; k < variants.length - 1; k++) { acc += variants[k].share; if (r < acc) break; }
    if (t.leafType === "needleleaved") k = 2;
    if (t.leafType === "broadleaved" && k === 2) k = 0;
    buckets[k].push(t);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1.0, 1, 7).translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x564a3e, roughness: 0.95 }), list.length);
  trunks.castShadow = true; trunks.receiveShadow = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let ti = 0;
  const palette = [[0.06, 0.13, 0.03], [0.09, 0.16, 0.035], [0.07, 0.12, 0.05], [0.11, 0.15, 0.04], [0.05, 0.1, 0.045]];
  variants.forEach((v, k) => {
    const items = buckets[k];
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(v.geo, mat, items.length);
    const tint = new Float32Array(items.length * 3), seed = new Float32Array(items.length);
    items.forEach((t, i) => {
      const h = Math.max(3, t.height ?? 8), cr = Math.max(1.0, t.crown ?? Math.min(6, 0.2 * h + 0.8));
      const g0 = t.y ?? ground(t.x, t.z);
      const gy = Math.min(g0, ground(t.x, t.z) + 0.5);
      const ry = v.shape === 1 ? Math.max(1.5, h * 0.42) : Math.min(Math.max(1.2, h * 0.36), Math.max(1.2, cr * 1.3));
      const cy = gy + h - ry;
      const r = hash(t.z, t.x);
      Q.setFromAxisAngle(up, r * Math.PI * 2);
      M.compose(Pv.set(t.x, cy, t.z), Q, S.set(cr, ry, cr));
      mesh.setMatrixAt(i, M);
      const p = palette[Math.floor(r * palette.length) % palette.length], j = 0.85 + hash(t.x + 3, t.z) * 0.3;
      const conif = v.shape === 1 ? 0.75 : 1;
      tint.set([p[0] * j * conif, p[1] * j * conif, p[2] * j], i * 3);
      seed[i] = r;
      const tr = 0.05 + 0.008 * h;
      M.compose(Pv.set(t.x, gy - 0.2, t.z), Q, S.set(tr, Math.max(1, cy - gy + ry * 0.2), tr));
      trunks.setMatrixAt(ti++, M);
    });
    mesh.geometry = v.geo.clone();
    mesh.geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    mesh.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.computeBoundingSphere();                     // from the instances, or the mesh is culled at the origin
    mesh.name = `tree-crowns-${k}`;
    group.add(mesh);
  });
  trunks.count = ti;
  trunks.computeBoundingSphere();
  group.add(trunks);
  return { group, count: list.length };
}
