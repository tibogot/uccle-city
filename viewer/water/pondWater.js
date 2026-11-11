// CALM PARK WATER (the park-water system; first user: the Wolvendael pond, next: the Parc de la Sauvagère).
//
//   const pond = createPond({ pond, bed, renderer });   // pond = { id, ring, level, ... }, bed = pondBedGrid(...)
//   scene.add(pond.group); pond.addReflected(obj);      // what the planar reflection draws (layer POND_LAYER)
//   per frame: pond.update(camera, scene)                // before the frame's render
//
// The surface: one grid mesh at the measured level over the pond's water cells (+2 cells: the terrain hides what lies
// under the banks), transparent without depth writes, so the shoreline is where the carved terrain (pondBed.js) rises
// through it, and the water fades out there by its DEPTH (a texture from the same bed grid): a soft edge, no z-fight.
// The look (after Mr.doob's calm park-lake variant of slop-newyork's water, MIT; the wave texture is his, vendor/
// slop-water/): very gentle ripples (three layers of the LEAN wind-wave texture, small tiles, low slope, drifting slowly,
// the slope variance below a pixel turned into blur of the reflection instead of shimmer), a Fresnel term (2 % head-on,
// near-total at grazing angles), a murky olive body lit by the scene (the château's shadow falls on it), and the
// REFLECTION:
//   - near (< ~200 m) and on screen: a planar reflection, our own pass (PlanarReflection below: the mirrored camera of
//     three's ReflectorNode with its oblique clip plane), at half resolution, drawing ONLY the objects put on
//     POND_LAYER (the château, the terrain round the pond, the trees, the reeds, the sky dome): never the whole city;
//     sampled through the ripples' normal (a little distortion);
//   - farther or off screen: the sky alone (the env's horizon / zenith colours along the reflected ray), cross-faded by
//     distance (no pop), and the reflection pass is not rendered at all.
// Reeds and water lilies: instanced, near only (they shrink to nothing between 85 and 110 m: no pop), placed from the
// bed grid (reeds in the shallow fringe and on the wet bank in patches, lilies in shallow water near the edges).
import * as THREE from "three/webgpu";
import {
  uniform, texture, uv, vec2, vec3, vec4, float, Fn, positionWorld, positionLocal, normalWorld, cameraPosition, normalize, dot, clamp, pow,
  mix, smoothstep, length, max, min, abs, fract, floor, sin, time, mrt, screenUV, reflect, cameraViewMatrix, attribute, instanceIndex, step,
} from "three/tsl";
import { getWaterWaveTexture } from "../../vendor/slop-water/waveTexture.js";
import { env } from "../lighting.js";

export const POND_LAYER = 9;

const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Look controls (uniforms: no recompiles). */
export const waterLook = {
  ripple: uniform(1.0), distort: uniform(1.0), reflection: uniform(1.0), murk: uniform(1.0), glint: uniform(1.0),
};

// ------------------------------------------------------------------------------------------------ planar reflection
const _q = new THREE.Vector4(), _clip = new THREE.Vector4(), _plane = new THREE.Plane(), _n = new THREE.Vector3(0, 1, 0);
const _view = new THREE.Vector3(), _target = new THREE.Vector3(), _look = new THREE.Vector3(), _rot = new THREE.Matrix4(), _p = new THREE.Vector3();
const _size = new THREE.Vector2(), _col = new THREE.Color();

/** A horizontal mirror at y = level: the virtual camera of three's ReflectorNode (r187, MIT: the same mirrored view,
 *  the oblique near plane at the water), rendering only POND_LAYER into a half-float target at `scale` of the
 *  drawing buffer. The shadow map is not re-rendered for it (suspend()). */
export class PlanarReflection {
  constructor(renderer, { scale = 0.5, layer = POND_LAYER } = {}) {
    this.renderer = renderer; this.scale = scale;
    this.rt = new THREE.RenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: true });
    this.rt.texture.name = "pond-reflection";
    this.camera = new THREE.PerspectiveCamera();
    this.camera.layers.set(layer);
    this.renders = 0; this.lastMs = 0;
  }
  render(scene, camera, level, suspend) {
    const r = this.renderer, vc = this.camera;
    r.getDrawingBufferSize(_size);
    const w = Math.max(2, Math.round(_size.x * this.scale)), h = Math.max(2, Math.round(_size.y * this.scale));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    const camPos = _p.setFromMatrixPosition(camera.matrixWorld);
    const mirror = new THREE.Vector3(camPos.x, level, camPos.z);
    _view.subVectors(mirror, camPos).reflect(_n).negate().add(mirror);
    _rot.extractRotation(camera.matrixWorld);
    _look.set(0, 0, -1).applyMatrix4(_rot).add(camPos);
    _target.subVectors(mirror, _look).reflect(_n).negate().add(mirror);
    vc.coordinateSystem = camera.coordinateSystem;
    vc.position.copy(_view);
    vc.up.set(0, 1, 0).applyMatrix4(_rot).reflect(_n);
    vc.lookAt(_target);
    vc.near = camera.near; vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    // (a reversed-depth projection: its z row = w - z; turned back to standard depth for the oblique plane, and after)
    const rev = camera.reversedDepth, E = vc.projectionMatrix.elements;
    vc._reversedDepth = rev;                               // (else the renderer would rebuild the projection on its first render)
    if (rev) for (const i of [2, 6, 10, 14]) E[i] = E[i + 1] - E[i];
    vc.projectionMatrix.elements[8] *= -1; vc.projectionMatrix.elements[12] *= -1;
    _plane.setFromNormalAndCoplanarPoint(_n, mirror).applyMatrix4(vc.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const pm = vc.projectionMatrix;
    _q.x = (Math.sign(_clip.x) + pm.elements[8]) / pm.elements[0];
    _q.y = (Math.sign(_clip.y) + pm.elements[9]) / pm.elements[5];
    _q.z = -1.0;
    _q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    _clip.multiplyScalar(1.0 / _clip.dot(_q));
    pm.elements[2] = _clip.x; pm.elements[6] = _clip.y;
    pm.elements[10] = r.coordinateSystem === THREE.WebGPUCoordinateSystem ? _clip.z : _clip.z + 1.0;
    pm.elements[14] = _clip.w;
    if (rev) for (const i of [2, 6, 10, 14]) E[i] = E[i + 1] - E[i];
    vc.projectionMatrixInverse.copy(pm).invert();
    const restore = suspend?.();
    const prevRT = r.getRenderTarget(), prevMRT = r.getMRT(), prevAuto = r.autoClear;
    const t0 = performance.now();
    const prevAlpha = r.getClearAlpha(); r.getClearColor(_col);
    r.setMRT(null); r.setRenderTarget(this.rt); r.autoClear = true; r.setClearColor(0x000000, 0);
    r.render(scene, vc);
    r.setMRT(prevMRT); r.setRenderTarget(prevRT); r.autoClear = prevAuto; r.setClearColor(_col, prevAlpha);
    this.lastMs = performance.now() - t0;
    restore?.();
    this.renders++;
  }
  dispose() { this.rt.dispose(); }
}

// ------------------------------------------------------------------------------------------------ the pond
export function createPond({ pond, bed, renderer, reflectionScale = 0.5, nearReflect = [170, 220], nearProps = [85, 110] }) {
  const level = pond.level;
  const group = new THREE.Group(); group.name = `pond-${pond.id}`;
  // ---- the depth texture (R8: 0..1.5 m), the bed grid's cells
  const { x0, z0, cols, rows, step } = bed;
  const dd = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c;
    dd[k] = Math.round(Math.min(1, Math.max(0, (level - bed.bed[k]) / 1.5)) * 255);
  }
  const depthTex = new THREE.DataTexture(dd, cols, rows, THREE.RedFormat, THREE.UnsignedByteType);
  depthTex.magFilter = THREE.LinearFilter; depthTex.minFilter = THREE.LinearFilter; depthTex.generateMipmaps = false;
  depthTex.wrapS = depthTex.wrapT = THREE.ClampToEdgeWrapping; depthTex.colorSpace = THREE.NoColorSpace; depthTex.needsUpdate = true;
  // ---- the surface grid: 1 m cells wherever water is within 2 m
  const S = 1.0, near = (x, z) => { for (let dz = -2; dz <= 2; dz += 1) for (let dx = -2; dx <= 2; dx += 1) if (bed.depthAt(x + dx, z + dz) > 0.0) return true; return false; };
  const W = (cols - 1) * step, H = (rows - 1) * step, nx = Math.ceil(W / S), nz = Math.ceil(H / S);
  const vid = new Int32Array((nx + 1) * (nz + 1)).fill(-1), pos = [], idx = [];
  const vert = (i, j) => { const k = j * (nx + 1) + i; if (vid[k] < 0) { vid[k] = pos.length / 3; pos.push(x0 + i * S, level, z0 + j * S); } return vid[k]; };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!near(x0 + (i + 0.5) * S, z0 + (j + 0.5) * S)) continue;
    const a = vert(i, j), b = vert(i + 1, j), c = vert(i + 1, j + 1), d = vert(i, j + 1);
    idx.push(a, d, b, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(idx); geo.computeBoundingBox(); geo.computeBoundingSphere();

  // ---- the reflection pass and the surface material
  const refl = new PlanarReflection(renderer, { scale: reflectionScale });
  const uRefl = uniform(0), uFar = uniform(1);
  const waveTex = getWaterWaveTexture();
  const reflTex = texture(refl.rt.texture);
  const mat = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 1, metalness: 0 });
  mat.name = "pond-water";
  // [tile (m), rotation, weight]: small incommensurate tiles (a sheltered pond), drifting with a light breeze
  const LAYERS = [[3.7, 0.0, 1.0], [1.43, 1.93, 0.8], [0.61, 4.07, 0.6]];
  const waves = Fn(() => {
    const p = positionWorld.xz.toVar();
    const gust = smoothstep(0.25, 0.85, fract(sin(p.x.mul(0.031).add(p.y.mul(0.047)).add(time.mul(0.05))).mul(0.5).add(0.5)));
    const energy = mix(float(0.55), float(1.0), gust).mul(waterLook.ripple).mul(0.011).toVar();
    const slope = vec2(0, 0).toVar(), variance = float(0).toVar();
    for (const [L, rot, wt] of LAYERS) {
      const c = Math.cos(rot), s = Math.sin(rot), sp = (0.35 * Math.sqrt(L / 9)) / L;
      const q = vec2(p.x.mul(c).sub(p.y.mul(s)), p.x.mul(s).add(p.y.mul(c))).div(L).add(vec2(Math.cos(0.3) * sp, Math.sin(0.3) * sp).mul(time));
      const smp = texture(waveTex, q);
      const amp = energy.mul(wt);
      slope.addAssign(vec2(smp.x.mul(c).add(smp.y.mul(s)), smp.y.mul(c).sub(smp.x.mul(s))).mul(amp));
      variance.addAssign(max(smp.z.sub(dot(smp.xy, smp.xy)), 0.0).mul(amp.mul(amp)));
    }
    return vec4(slope, variance, float(0));
  })();
  const depth = Fn(() => {
    const t = vec2(positionWorld.x.sub(x0).div(W), positionWorld.z.sub(z0).div(H));
    return texture(depthTex, t).r.mul(1.5);
  })();
  const nW = normalize(vec3(waves.x.negate(), 1.0, waves.y.negate()));
  const view = normalize(cameraPosition.sub(positionWorld));
  const ndv = clamp(dot(nW, view), 0.0, 1.0);
  const F = pow(float(1).sub(ndv), 5.0).mul(0.98).add(0.02).toVar();
  const dist = length(cameraPosition.sub(positionWorld));
  const reflColor = Fn(() => {
    const r = reflect(view.negate(), nW).toVar();
    const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(0.0, 0.6, r.y)).mul(float(1).sub(env.uNight.mul(0.9)));
    // the planar reflection through the ripples (the offset shrinks with distance: ~same in pixels), blurred by the
    // unresolved slope variance (a lower mip is not available on the half-float target: the offset jitter does it)
    const off = nW.xz.mul(waterLook.distort).mul(0.22).div(max(dist.mul(0.08), 1.0));
    const sUV = vec2(float(1).sub(screenUV.x), screenUV.y).add(off);
    const planar = reflTex.sample(clamp(sUV, 0.001, 0.999)).toVar();
    // (the pass clears to alpha 0: where it drew nothing, the analytic sky)
    return mix(sky, planar.rgb, uRefl.mul(planar.a)).mul(waterLook.reflection);
  })();
  const sunGlint = Fn(() => {
    const r = reflect(view.negate(), nW);
    const s = max(dot(r, normalize(vec3(env.uSunDir))), 0.0);
    return vec3(env.uSunColor).mul(pow(s, 900.0).mul(6.0)).mul(waterLook.glint).mul(float(1).sub(env.uNight));
  })();
  mat.colorNode = Fn(() => {
    // the murky body (olive, a little browner where shallow: the bed shows through); its transmitted share = 1 - F
    const d = depth.toVar();
    const body = mix(lin(0x3a3727), lin(0x10140d), smoothstep(0.05, 0.6, d)).mul(waterLook.murk);
    return body.mul(float(1).sub(F));
  })();
  mat.emissiveNode = reflColor.mul(F).add(sunGlint);
  mat.opacityNode = Fn(() => {
    const d = depth;
    // the soft shoreline: transparent at the edge, the body opaque from ~30 cm, the reflection from ~10 cm
    return clamp(max(smoothstep(0.0, 0.32, d), smoothstep(0.0, 0.1, d).mul(F.mul(3.0))), 0.0, 1.0);
  })();
  mat.mrtNode = mrt({ metalRough: vec3(0, 1, float(0)) });    // no SSR on the pond: it has its own reflection
  const water = new THREE.Mesh(geo, mat);
  water.name = "pond-water"; water.receiveShadow = true; water.renderOrder = 2;
  group.add(water);

  // ---- reeds and lilies (near only)
  const uProps = uniform(1);
  const reeds = buildReeds(bed, level, uProps);
  const lilies = buildLilies(bed, level, uProps);
  if (reeds) group.add(reeds);
  if (lilies) group.add(lilies);

  // ---- per frame
  const box = geo.boundingBox.clone().expandByScalar(2);
  box.max.y = level + 25;                               // (the reflection shows what stands above it)
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), cp = new THREE.Vector3();
  const reflected = new Set();
  const stats = { refl: 0, reflMs: 0, onScreen: false, d: 0, props: 1 };
  let suspend = null;
  return {
    group, water, reeds, lilies, refl, bed, level, stats, uRefl, depthTex,
    setSuspend(fn) { suspend = fn; },
    /** draw this object (and its children) in the pond's reflection */
    addReflected(obj) { obj.traverse((o) => o.layers.enable(POND_LAYER)); reflected.add(obj); },
    update(camera, scene) {
      camera.updateMatrixWorld();
      pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv, camera.coordinateSystem, camera.reversedDepth);
      cp.setFromMatrixPosition(camera.matrixWorld);
      const d = box.distanceToPoint(cp), on = frustum.intersectsBox(box);
      stats.d = d; stats.onScreen = on;
      const k = on && cp.y > level + 0.05 ? 1 - THREE.MathUtils.smoothstep(d, nearReflect[0], nearReflect[1]) : 0;
      uRefl.value = k; stats.refl = k;
      if (k > 0) { refl.render(scene, camera, level, suspend); stats.reflMs = refl.lastMs; } else stats.reflMs = 0;
      const pk = 1 - THREE.MathUtils.smoothstep(d, nearProps[0], nearProps[1]);
      uProps.value = pk; stats.props = pk;
      if (reeds) reeds.visible = pk > 0;
      if (lilies) lilies.visible = pk > 0;
      water.visible = on || d < 50;
    },
    dispose() { refl.dispose(); geo.dispose(); mat.dispose(); depthTex.dispose(); reeds?.geometry.dispose(); lilies?.geometry.dispose(); },
  };
}

// ------------------------------------------------------------------------------------------------ reeds
/** reed clumps on the shallow fringe and the wet bank, in patches (a slow noise on the position), each clump ~14 blades
 *  (4-segment tapered strips, curved), swaying in the breeze; straw-coloured tips (March), green-brown at the foot */
function buildReeds(bed, level, uProps) {
  const sites = [];
  const { x0, z0, cols, rows, step } = bed;
  const patch = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.1) * Math.cos(z * 0.13 - x * 0.05);
  for (let r = 1; r < rows - 1; r += 2) for (let c = 1; c < cols - 1; c += 2) {
    const x = x0 + c * step, z = z0 + r * step, d = bed.depthAt(x, z);
    if (d > 0.22 || d < -0.25) continue;
    const i = r * cols + c;
    if (patch(x, z) < 0.62 || hash(i) > 0.55) continue;
    sites.push([x + (hash(i + 1) - 0.5) * step * 1.6, z + (hash(i + 2) - 0.5) * step * 1.6, 0.8 + hash(i + 3) * 0.7, hash(i + 4) * 6.283]);
  }
  if (!sites.length) return null;
  // one clump: 14 blades
  const pos = [], nrm = [], hgt = [], idx = [];
  for (let b = 0; b < 14; b++) {
    const a = hash(b * 7.1) * 6.283, rr = 0.05 + hash(b * 3.3) * 0.22, lean = 0.08 + hash(b * 5.7) * 0.25, h = 0.7 + hash(b * 2.9) * 0.5;
    const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr, dx = Math.cos(a) * lean, dz = Math.sin(a) * lean;
    const tx = -Math.sin(a) * 0.012, tz = Math.cos(a) * 0.012;
    const base = pos.length / 3;
    for (let s = 0; s <= 4; s++) {
      const t = s / 4, w = 1 - t * 0.85, y = h * t, px = bx + dx * t * t, pz = bz + dz * t * t;
      pos.push(px - tx * w, y, pz - tz * w, px + tx * w, y, pz + tz * w);
      for (let q = 0; q < 2; q++) { nrm.push(Math.cos(a), 0.3, Math.sin(a)); hgt.push(t); }
    }
    for (let s = 0; s < 4; s++) { const k = base + s * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(hgt, 1));
  g.setIndex(idx);
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
  m.name = "pond-reeds";
  const t = attribute("aT", "float");
  m.colorNode = mix(lin(0x5d5f33), lin(0xc4ab78), smoothstep(0.15, 0.85, t));
  // sway (grows with the height squared) and the near-only shrink (uProps 1 -> 0 between 85 and 110 m)
  m.positionNode = Fn(() => {
    const p = positionLocal.toVar();
    const ph = float(instanceIndex).mul(1.37);
    const sw = sin(time.mul(1.3).add(ph)).mul(0.05).add(sin(time.mul(2.9).add(ph.mul(2.0))).mul(0.015)).mul(t.mul(t));
    return vec3(p.x.add(sw), p.y, p.z.add(sw.mul(0.6))).mul(uProps);
  })();
  const mesh = new THREE.InstancedMesh(g, m, sites.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3(), Pv = new THREE.Vector3();
  sites.forEach(([x, z, s, a], i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); Sv.set(s, s * (0.85 + hash(i * 9.1) * 0.5), s);
    Pv.set(x, Math.max(level - 0.02, bed.bedAt(x, z)) - 0.05, z);
    mesh.setMatrixAt(i, M.compose(Pv, Q, Sv));
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
  mesh.name = "pond-reeds"; mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

// ------------------------------------------------------------------------------------------------ water lilies
/** lily pads in shallow water near the edges (0.15-0.7 m deep, 0.6-3.5 m from the bank), in patches; flat discs with a
 *  notch, 0.6 cm above the surface (the water is transparent without depth writes: no z-fight), near only */
function buildLilies(bed, level, uProps) {
  const sites = [];
  const { x0, z0, cols, rows, step } = bed;
  const patch = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.33 + 1.7) * Math.sin(z * 0.29 - 0.4);
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const x = x0 + c * step, z = z0 + r * step, d = bed.depthAt(x, z);
    if (d < 0.15 || d > 0.7) continue;
    const i = r * cols + c + 77;
    if (patch(x, z) < 0.72 || hash(i) > 0.35) continue;
    sites.push([x + (hash(i + 1) - 0.5) * step, z + (hash(i + 2) - 0.5) * step, 0.12 + hash(i + 3) * 0.1, hash(i + 4) * 6.283]);
  }
  if (!sites.length) return null;
  const pos = [0, 0, 0], idx = [], N = 18, notch = 0.35;
  for (let k = 0; k <= N; k++) {
    const a = notch / 2 + (6.283 - notch) * k / N;
    pos.push(Math.cos(a), 0, Math.sin(a));
    if (k > 0) idx.push(0, k + 1, k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0 });
  m.name = "pond-lilies";
  // (a per-instance tone through instanceColor; a TSL colour node with the vein pattern glowed under the post chain)
  m.color.set(0xffffff);
  m.positionNode = positionLocal.mul(vec3(uProps, 1, uProps));
  const mesh = new THREE.InstancedMesh(g, m, sites.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3(), Pv = new THREE.Vector3();
  sites.forEach(([x, z, s, a], i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); Sv.set(s, 1, s);
    mesh.setMatrixAt(i, M.compose(Pv.set(x, level + 0.006, z), Q, Sv));
    mesh.setColorAt(i, new THREE.Color().setHSL(0.26 + hash(i * 3.1) * 0.05, 0.38, 0.2 + hash(i * 5.3) * 0.08));
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
  mesh.name = "pond-lilies"; mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

// ------------------------------------------------------------------------------------------------ reflection proxies
/** The park's trees as the POND SEES THEM: low-poly crowns (an icosahedron per tree, sized from the LiDAR height and
 *  crown) and trunks, drawn ONLY in the reflection pass (layer POND_LAYER alone: the main camera never draws them). The
 *  city's own tree field costs ~1.8 ms of GPU in a second pass (measured, docs in NOTES); the reflection is rippled
 *  and dimmed by the Fresnel term, the proxies cost ~0.1 ms. trees = [{ x, z, y (ground), height, crown }] */
export function buildReflectionTrees(trees, center, radius = 90) {
  const near = trees.filter((t) => Math.hypot(t.x - center.x, t.z - center.z) < radius && t.height > 3);
  if (!near.length) return null;
  const crownG = new THREE.IcosahedronGeometry(1, 1), trunkG = new THREE.CylinderGeometry(0.6, 1, 1, 6, 1, true).translate(0, 0.5, 0);
  const cm = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
  cm.name = "pond-reflection-crowns";
  cm.colorNode = Fn(() => {
    const p = positionWorld;
    const n = fract(sin(floor(p.x.mul(0.9)).mul(12.9898).add(floor(p.y.mul(0.9)).mul(4.1)).add(floor(p.z.mul(0.9)).mul(78.233))).mul(43758.5453));
    const up = clamp(normalWorld.y.mul(0.5).add(0.5), 0, 1);
    return mix(lin(0x3a4a26), lin(0x84995a), up.mul(0.7).add(n.mul(0.3)));
  })();
  const tm = new THREE.MeshStandardNodeMaterial({ color: 0x4a3d30, roughness: 0.95, metalness: 0 });
  tm.name = "pond-reflection-trunks";
  const crowns = new THREE.InstancedMesh(crownG, cm, near.length), trunks = new THREE.InstancedMesh(trunkG, tm, near.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  near.forEach((t, i) => {
    const r = Math.max(1.5, t.crown * 0.85), ry = Math.max(r, t.height * 0.33);
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i) * 6.28);
    crowns.setMatrixAt(i, M.compose(P.set(t.x, t.y + t.height - ry, t.z), Q, S.set(r, ry, r * (0.85 + hash(i + 3) * 0.3))));
    trunks.setMatrixAt(i, M.compose(P.set(t.x, t.y - 0.3, t.z), Q, S.set(0.25 + t.height * 0.008, t.height - ry + 0.5, 0.25 + t.height * 0.008)));
  });
  const g = new THREE.Group(); g.name = "pond-reflection-trees";
  for (const m of [crowns, trunks]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.layers.set(POND_LAYER); m.castShadow = false; g.add(m); }
  g.layers.set(POND_LAYER);
  g.userData.count = near.length;
  return g;
}
