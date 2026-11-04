// Octahedral impostors for the stylized street trees: the far LOD (one camera-facing quad per tree
// beyond IMPOSTOR_START metres), lit LIVE like the near trees.
//
// Why our own (not game-engine-v1's octahedralCore.js): its stylized-foliage bake captures the final
// LIT colour with flat normals, so far trees would keep the bake's light while Uccle's sun moves
// (time-of-day presets, a real sun later). Here the bake stores the INPUTS of the tree shader per view
// - albedo (before the per-tree tint) + coverage, and the pad-dome shading normal + occlusion + a
// leaf/bark flag - and the impostor material runs the same lighting as the leaves (sun, sky, shadows,
// light through the leaves, fill, per-tree tint). The bake is GPU-only (every view rendered straight
// into its cell of one atlas, no read-back), all variants share one atlas, so a tile's impostors are
// ONE instanced mesh and ONE shader.
//
// Borrowed from game-engine-v1 v3/render/foliage/octahedralCore.js (the owner's engine): the
// hemi-octahedral grid <-> direction maps (hemiOctaGridToDir, hemiOctaEncodeCPU) and the bake
// camera's blended up-vector near the pole; cell padding against bleeding.
import * as THREE from "three/webgpu";
import {
  Fn, Discard, attribute, uniform, uniformArray, texture, vec2, vec3, vec4, float, int, mix, floor, clamp,
  abs, normalize, cross, dot, max, min, step, smoothstep, pow, saturate, positionLocal, positionWorld,
  cameraPosition, uv, transformNormalToView, normalGeometry, positionGeometry,
} from "three/tsl";
import { applyAlphaCutout } from "../vendor/stylized-trees/alphaCutout.js";
import { treeTint } from "../vendor/stylized-trees/stylizedTrees.js";

export const IMPOSTOR_START = +(new URLSearchParams(location.search).get("impstart") ?? 90);   // metres: nearer trees are the real LODs (?impstart= to tune)
export const IMPOSTOR_END = 1600;
const GRID = 8, CELL = 128, PAD = 4, BLOCK = GRID * CELL;   // views per side, px per view, px per variant

const gridToDirCPU = (gx, gy, out) => {   // octahedralCore.js hemiOctaGridToDir
  out.set(gx - gy, 0, -1 + gx + gy);
  out.y = 1 - Math.abs(out.x) - Math.abs(out.z);
  return out.normalize();
};

/**
 * Bake every variant of the shared stylized trees (shared.geoms "<v>:0", shared.leafMat / trunkMat).
 * @returns { albedo, normal, cols, size: [w, h], spheres: Vector4[] (tree-space centre xyz, radius) }
 */
export function bakeTreeImpostors(renderer, shared, variants, leafMask) {
  const cols = 2, rows = Math.ceil(variants / cols), W = cols * BLOCK, H = rows * BLOCK;
  const mk = () => {
    const rt = new THREE.RenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: true, samples: 1 });
    rt.texture.generateMipmaps = true;
    rt.texture.mipmapsAutoUpdate = false;      // once, at the end
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    rt.texture.magFilter = THREE.LinearFilter;
    rt.texture.colorSpace = THREE.NoColorSpace;
    rt.scissorTest = true;
    return rt;
  };
  const rtA = mk(), rtN = mk();

  // bake materials: the leaves keep the shared positionNode (cards face the BAKE camera), the outputs
  // are the shading inputs, not the lit colour
  const U = shared.U;
  const card = attribute("card", "vec4"), spin = attribute("cardSpin", "vec3");
  const mask = texture(leafMask, card.xy.mul(0.5).add(0.5)).r;
  const hA = card.w, aoA = card.z;
  const leafAlbedo = mix(U.bottom, U.top, smoothstep(0.0, 1.0, hA)).mul(mix(float(1), aoA, U.aoColor));
  // the pad-dome normal (the leaves' normalNode, in tree space): the card's centre normal leaned out by
  // the corner (corner = world position - card centre, the bake instance being the identity)
  const leafN = normalize(normalGeometry.add(positionWorld.sub(positionGeometry).mul(spin.z).mul(0.7)));
  const basic = (outputNode, positionNode) => {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
    m.positionNode = positionNode;
    m.outputNode = outputNode;
    m.toneMapped = false;
    return m;
  };
  const leafA = basic(Fn(() => { Discard(mask.lessThan(0.5)); return vec4(leafAlbedo, 1); })(), shared.leafMat.positionNode);
  // leaves: alpha 0.5 + 0.5 x occlusion (>= 0.5 = leaf); bark: 0.25 (no light through it)
  const leafN4 = basic(Fn(() => { Discard(mask.lessThan(0.5)); return vec4(leafN.mul(0.5).add(0.5), aoA.mul(0.5).add(0.5)); })(), shared.leafMat.positionNode);
  const barkA = basic(vec4(shared.trunkMat.colorNode, 1), shared.trunkMat.positionNode);
  const barkN4 = basic(vec4(normalize(normalGeometry).mul(0.5).add(0.5), 0.25), shared.trunkMat.positionNode);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const spheres = [], dir = new THREE.Vector3();
  const savedRT = renderer.getRenderTarget(), savedClear = renderer.getClearColor(new THREE.Color()), savedAlpha = renderer.getClearAlpha(), savedAuto = renderer.autoClear;
  renderer.autoClear = false;
  const clearRT = (rt, rgb, a) => {
    rt.scissor.set(0, 0, W, H); rt.viewport.set(0, 0, W, H);
    renderer.setRenderTarget(rt); renderer.setClearColor(new THREE.Color(...rgb), a); renderer.clear(true, true, false);
  };
  clearRT(rtA, [0.18, 0.24, 0.1], 0);          // a leaf-ish colour under alpha 0: no dark fringes when filtered
  clearRT(rtN, [0.5, 1.0, 0.5], 0.25);         // "up" normal, bark flag

  for (let v = 0; v < variants; v++) {
    const g = shared.geoms.get(`${v}:0`);
    if (!g) continue;
    // one leaf instance at the identity (treeXf = no turn, scale 1), the bark as a plain mesh
    const leaves = new THREE.BufferGeometry();
    for (const a of Object.keys(g.leaves.attributes)) leaves.setAttribute(a, g.leaves.attributes[a]);
    leaves.setIndex(g.leaves.index);
    leaves.setAttribute("treeXf", new THREE.InstancedBufferAttribute(new Float32Array([1, 0, 1]), 3));
    const leafMesh = new THREE.InstancedMesh(leaves, leafA, 1);
    leafMesh.setMatrixAt(0, new THREE.Matrix4());
    leafMesh.frustumCulled = false;
    const barkMesh = new THREE.Mesh(g.trunk, barkA);
    barkMesh.frustumCulled = false;
    scene.add(leafMesh, barkMesh);
    // bounding sphere: bark + card centres grown by the biggest card
    const box = new THREE.Box3();
    g.leaves.computeBoundingBox(); g.trunk.computeBoundingBox();
    box.copy(g.leaves.boundingBox).expandByScalar(1.6).union(g.trunk.boundingBox);
    // the box's centre, but the radius from the vertices (the box's own sphere reaches into its empty
    // corners: ~11 m against ~8 m, a third of every cell wasted)
    const sph = new THREE.Sphere(box.getCenter(new THREE.Vector3()), 0);
    const P = new THREE.Vector3(), lp = g.leaves.attributes.position, tp = g.trunk.attributes.position;
    for (let i = 0; i < lp.count; i++) sph.radius = Math.max(sph.radius, P.fromBufferAttribute(lp, i).distanceTo(sph.center) + 1.4);
    for (let i = 0; i < tp.count; i++) sph.radius = Math.max(sph.radius, P.fromBufferAttribute(tp, i).distanceTo(sph.center));
    const R = sph.radius;
    spheres.push(new THREE.Vector4(sph.center.x, sph.center.y, sph.center.z, R));
    cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = 0.01; cam.far = R * 4;
    cam.updateProjectionMatrix();
    const bx = (v % cols) * BLOCK, by = Math.floor(v / cols) * BLOCK;
    for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
      gridToDirCPU(gx / (GRID - 1), gy / (GRID - 1), dir);
      const poleT = THREE.MathUtils.smoothstep(Math.abs(dir.y), 0.9, 1.0);
      cam.up.set(0, 1 - poleT, poleT);
      cam.position.copy(sph.center).addScaledVector(dir, R * 2);
      cam.lookAt(sph.center);
      cam.updateMatrixWorld(true);
      const x = bx + gx * CELL + PAD, y = by + gy * CELL + PAD, s = CELL - 2 * PAD;
      for (const [rt, lm, bm] of [[rtA, leafA, barkA], [rtN, leafN4, barkN4]]) {
        rt.viewport.set(x, y, s, s); rt.scissor.set(x, y, s, s);
        leafMesh.material = lm; barkMesh.material = bm;
        renderer.setRenderTarget(rt);
        renderer.clear(false, true, false);          // depth only, this cell
        renderer.render(scene, cam);
      }
    }
    scene.remove(leafMesh, barkMesh);
  }
  for (const rt of [rtA, rtN]) { rt.texture.mipmapsAutoUpdate = true; renderer.backend.generateMipmaps(rt.texture); }
  renderer.setRenderTarget(savedRT);
  renderer.setClearColor(savedClear, savedAlpha);
  renderer.autoClear = savedAuto;
  for (const m of [leafA, leafN4, barkA, barkN4]) m.dispose();
  return { albedo: rtA.texture, normal: rtN.texture, rtA, rtN, cols, size: [W, H], spheres };
}

/** The impostor material (one for every tile): view-blended octahedral frames, relit live. */
export function impostorMaterial(bake, U) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0, side: THREE.FrontSide });
  const data = attribute("impData", "vec4");                  // per instance: yaw, scale, variant, -
  const origin = attribute("impPos", "vec3");                  // per instance: the tree's foot (world)
  const yaw = data.x, scl = data.y, variant = data.z;
  const sph = uniformArray(bake.spheres, "vec4").element(int(variant));
  const cy = yaw.cos(), sy = yaw.sin();
  const turn = (p) => vec3(cy.mul(p.x).add(sy.mul(p.z)), p.y, cy.mul(p.z).sub(sy.mul(p.x)));     // tree -> world (three's makeRotationY)
  const unturn = (p) => vec3(cy.mul(p.x).sub(sy.mul(p.z)), p.y, sy.mul(p.x).add(cy.mul(p.z)));   // world -> tree
  // vertex: the quad's 4 vertices sit at the origin and the instance matrices are the identity; every
  // per-tree value comes from attributes (TSL carries them to the fragment stage as varyings)
  const centreW = origin.add(turn(sph.xyz).mul(scl));
  const toCam = normalize(cameraPosition.sub(centreW));
  const poleT = smoothstep(0.9, 1.0, abs(toCam.y));
  const right = normalize(cross(vec3(0, float(1).sub(poleT), poleT), toCam));
  const up = cross(toCam, right);
  const c = uv().mul(2).sub(1);
  m.positionNode = positionLocal.add(centreW).add(right.mul(c.x).add(up.mul(c.y)).mul(sph.w.mul(scl)));

  // fragment: the view direction and this point, in the tree's own space
  const ATL = vec2(bake.size[0], bake.size[1]);
  const block = vec2(variant.mod(bake.cols), floor(variant.div(bake.cols))).mul(BLOCK);
  const centreF = centreW;
  const pT = unturn(positionWorld.sub(centreF)).div(scl);
  const dT = unturn(normalize(cameraPosition.sub(centreF)));
  const d = vec3(dT.x, max(dT.y, 0.0), dT.z);
  const L1 = abs(d.x).add(abs(d.y)).add(abs(d.z));
  const enc = vec2(d.x.div(L1).add(d.z.div(L1)).add(1).mul(0.5), d.z.div(L1).sub(d.x.div(L1)).add(1).mul(0.5));
  const g = enc.mul(GRID - 1);
  const g0 = clamp(floor(g), 0, GRID - 2), f = g.sub(g0);
  const albT = texture(bake.albedo), nrmT = texture(bake.normal);
  const frame = (ox, oy) => {
    const cell = g0.add(vec2(ox, oy));
    const q = cell.div(GRID - 1);
    const dirF = normalize(vec3(q.x.sub(q.y), float(1).sub(abs(q.x.sub(q.y))).sub(abs(q.x.add(q.y).sub(1))), q.x.add(q.y).sub(1)));
    const pt = smoothstep(0.9, 1.0, abs(dirF.y));
    const r = normalize(cross(vec3(0, float(1).sub(pt), pt), dirF));
    const u2 = cross(dirF, r);
    const fuv = vec2(dot(pT, r), dot(pT, u2)).div(sph.w.mul(2)).add(0.5);
    const inside = step(0.0, fuv.x).mul(step(fuv.x, 1.0)).mul(step(0.0, fuv.y)).mul(step(fuv.y, 1.0));
    // the bake's viewport counts rows from the TOP (WebGPU) and three samples render targets with v up:
    // a cell rendered at top-row y spans v in [1 - (y + s)/H, 1 - y/H], its image upright
    const s = CELL - 2 * PAD, px = block.add(cell.mul(CELL)).add(PAD);
    const at = vec2(px.x.add(fuv.x.mul(s)).div(ATL.x), px.y.add(float(1).sub(fuv.y).mul(s)).div(ATL.y));
    const a = albT.sample(at), n = nrmT.sample(at);
    return { a, n, inside };
  };
  const F = [frame(0, 0), frame(1, 0), frame(0, 1), frame(1, 1)];
  const w = [float(1).sub(f.x).mul(float(1).sub(f.y)), f.x.mul(float(1).sub(f.y)), float(1).sub(f.x).mul(f.y), f.x.mul(f.y)];
  let alpha = float(0), col = vec3(0), nrm = vec3(0), flag = float(0);
  for (let i = 0; i < 4; i++) {
    const k = w[i].mul(F[i].inside).mul(F[i].a.a);
    alpha = alpha.add(k);
    col = col.add(F[i].a.rgb.mul(k));
    nrm = nrm.add(F[i].n.rgb.mul(k));
    flag = flag.add(F[i].n.a.mul(k));
  }
  const inv = float(1).div(max(alpha, 1e-4));
  const albedo = col.mul(inv), nTree = normalize(nrm.mul(inv).mul(2).sub(1)), flg = flag.mul(inv);
  const leaf = step(0.4, flg), ao = mix(float(1), saturate(flg.sub(0.5).mul(2)), leaf);
  // the leaves' colour terms (vendor makeLeafMaterial): per-tree tint (from the tree's turn and scale,
  // as the leaves do since vendor CHANGES #7, so it doesn't jump at the switch), light through the
  // leaves, fill
  const tint = treeTint(vec3(cy, sy, scl), U.tintVar);
  m.colorNode = albedo.mul(mix(float(1), tint, leaf));
  m.aoNode = ao;
  m.normalNode = transformNormalToView(turn(nTree)).normalize();
  m.emissiveNode = Fn(() => {
    const V = normalize(positionWorld.sub(cameraPosition));
    const back = pow(saturate(dot(V, U.sunDir)), 4.0);
    const glow = U.transColor.mul(U.sunColor).mul(back).mul(ao.mul(ao)).mul(U.translucency);
    return glow.add(albedo.mul(U.fillColor).mul(U.fill).mul(ao.mul(0.5).add(0.5))).mul(leaf);
  })();
  applyAlphaCutout(m, alpha, { threshold: 0.5, coverage: true, shadow: false });
  return m;
}

/** Per tile: one instanced quad mesh for every tree of the tile past IMPOSTOR_START. */
export function impostorField(placements, variantOf, material) {
  const n = placements.length, cap = Math.max(n, 1025);       // >= 1025: one shader for every tile
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(12), 3));   // all at the origin
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const data = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
  data.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("impData", data);
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("impPos", pos);
  const mesh = new THREE.InstancedMesh(geo, material, cap);
  mesh.count = 0;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.name = "tree-impostors";
  const last = new THREE.Vector3(Infinity, 0, 0);
  const start2 = IMPOSTOR_START * IMPOSTOR_START, end2 = IMPOSTOR_END * IMPOSTOR_END;
  const update = (cam) => {
    if (cam.distanceToSquared(last) < 25) return;
    last.copy(cam);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const [x, z, y, rot, s] = placements[i];
      const d2 = (x - cam.x) ** 2 + (y - cam.y) ** 2 + (z - cam.z) ** 2;
      if (d2 < start2 || d2 > end2) continue;
      pos.array.set([x, y - 0.25, z], k * 3);                 // the vendor's placement (y - 0.25)
      data.array.set([rot, s, variantOf[i], 0], k * 4);
      k++;
    }
    mesh.count = k;
    data.needsUpdate = true; pos.needsUpdate = true;
  };
  return { mesh, update };
}
