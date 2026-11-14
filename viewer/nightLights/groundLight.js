// THE GROUND LIGHT MAP: the diffuse light of the many lights that do not move, baked into a world-space texture over
// the street, plus a small dynamic layer for the far headlights - so the clustered loop handles only near and moving
// lights. (three r187 checked first: material.lightMap needs a UV2 layout per mesh and has no RGB-per-kind scaling;
// light probes are ambient only. The city's viewer/lampLight.js already does this for lamps in R8: this is its RGB,
// window- and shop-aware sibling.)
//
//   STATIC (bakeStatic, once per tile / when an intensity changes): irradiance on the ground (normal up, at the road
//   or sidewalk height) from every lamp (lantern profile), every lit window and shop front (aperture profile through
//   the opening), every sign: the SAME formulas as the cluster loop (nightLighting.js), evaluated in JS. Two RGBA16F
//   layers: A = lamps + signs, B = windows + shop fronts (separate scales: the panel toggles), 0.25 m texels.
//   DYNAMIC (each frame, a 0.5 m render target): the low-beam pools and red rear-light pools of the cars that are NOT
//   in the near pool, drawn as additive ground quads evaluating the same low-beam function: a car leaving the pool
//   hands its pool over to this layer with the complementary weight (w real + (1 - w) here: no pop, no double light).
//   GROUND MATERIALS (userData.groundLight = true) add  albedo / pi x (A + B + dynamic)  and skip the baked lights in
//   the cluster loop (when the street is wet they still loop them for the SPECULAR only: the streaks).
//   WALLS / HEDGES (groundSpill): the map read at their foot, fading up the wall, only far from the camera (the near
//   static lights are real pool lights there, faded out over the same distance band).
import * as THREE from "three/webgpu";
import {
  texture, uniform, vec2, vec3, vec4, float, positionWorld, normalWorld, smoothstep, cameraPosition, length, max, normalize, dot,
  instancedBufferAttribute, uv, select, exp,
} from "three/tsl";
import { lowBeamK } from "./nightLighting.js";

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class GroundLight {
  /** area: x0, x1, z0, z1 (m); groundY(x, z): the surface height the map is baked at */
  /** staticLayers = false (the city, cityNight.js): only the dynamic layer, into `rt` (shared with the ground
   *  materials, nightMode.js), its area following the camera (recentre) */
  constructor({ x0 = -280, x1 = 280, z0 = -22, z1 = 14, texel = 0.25, dynTexel = 0.5, groundY = () => 0, staticLayers = true, rt = null } = {}) {
    Object.assign(this, { x0, x1, z0, z1, texel, groundY, dynTexel });
    if (staticLayers) {
      this.nx = Math.round((x1 - x0) / texel); this.nz = Math.round((z1 - z0) / texel);
      const n = this.nx * this.nz;
      this.accA = new Float32Array(n * 3); this.accB = new Float32Array(n * 3);
      const mk = () => { const t = new THREE.DataTexture(new Uint16Array(n * 4), this.nx, this.nz, THREE.RGBAFormat, THREE.HalfFloatType); t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
      this.texA = mk(); this.texB = mk();
    }
    // the dynamic layer: an ortho camera looking down at the same area
    this.dnx = Math.round((x1 - x0) / dynTexel); this.dnz = Math.round((z1 - z0) / dynTexel);
    this.rt = rt ?? new THREE.RenderTarget(this.dnx, this.dnz, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rt.texture.magFilter = this.rt.texture.minFilter = THREE.LinearFilter;
    this.cam = new THREE.OrthographicCamera(x0, x1, -z0, -z1, -50, 50);    // looking down -y: screen x = world x, screen up = world -z
    this.cam.position.set(0, 10, 0); this.cam.up.set(0, 0, -1); this.cam.lookAt(0, 0, 0);
    this.cam.updateMatrixWorld(); this.cam.updateProjectionMatrix();
    this.dynScene = new THREE.Scene();
    this.uA = uniform(1); this.uB = uniform(1); this.uDyn = uniform(1);
    this.uOrigin = uniform(new THREE.Vector2(x0, z0)); this.uInv = uniform(new THREE.Vector2(1 / (x1 - x0), 1 / (z1 - z0)));
    this.uNear0 = uniform(40); this.uNear1 = uniform(60);
    this.ms = 0;
  }

  /** move the (dynamic layer's) area to start at (x0, z0), same size, snapped to its texels (no crawl) */
  recentre(x0, z0) {
    const T = this.dynTexel, w = this.x1 - this.x0, h = this.z1 - this.z0;
    x0 = Math.floor(x0 / T) * T; z0 = Math.floor(z0 / T) * T;
    if (x0 === this.x0 && z0 === this.z0) return;
    this.x0 = x0; this.z0 = z0; this.x1 = x0 + w; this.z1 = z0 + h;
    this.uOrigin.value.set(x0, z0);
    const c = this.cam;
    c.left = this.x0; c.right = this.x1; c.top = -this.z0; c.bottom = -this.z1;
    c.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------------------------------------ bake (JS)
  /** sources: nightStreet's { lamps, windows, shops, signs } + intensities p (nightParams) */
  bakeStatic(src, p) {
    const t0 = performance.now();
    this.accA.fill(0); this.accB.fill(0);
    const L = src.lamps.list, LAMP = [1.0, 0.78, 0.52];
    for (const l of L) this.splat(this.accA, l.hx, l.hy, l.hz, 22, 0.22, LAMP[0] * p.lampI, LAMP[1] * p.lampI, LAMP[2] * p.lampI, (fx, fy, fz) => {
      const c = -fy, base = p.lampUp + (1 - p.lampUp) * sstep(-0.35, 0.45, c);
      return base * (1 + p.lampBatwing * Math.exp(-(((c - 0.42) / 0.2) ** 2)));
    });
    for (const s of src.signs.list) { const out = s.side < 0 ? 1 : -1; this.splat(this.accA, s.x, s.y - 0.1, s.z + out * 0.7, 6, 0.4, s.col[0] * p.signI, s.col[1] * p.signI, s.col[2] * p.signI, null); }
    const ap = (list, I, depth, range, mullion) => {
      for (const w of list) {
        const out = w.side < 0 ? 1 : -1, g = I * (w.b ?? 1), hw = w.hw, hh = w.hh, soft = Math.min(hw, hh) * 0.22;
        const cone = Math.cos(1.25), pen = Math.cos(0.95);
        this.splat(this.accB, w.x, w.y, w.z - out * depth, range + depth, 0.35, w.col[0] * g, w.col[1] * g, w.col[2] * g, (fx, fy, fz) => {
          const cosA = fz * out;
          const spot = sstep(cone, pen, cosA);
          if (spot <= 0) return 0;
          const t = depth / Math.max(cosA, 0.05);
          const px = Math.abs(fx * -out * t), sy = fy * t, py = Math.abs(sy);       // right = (-out, 0, 0), up = +y
          const box = (1 - sstep(hw - soft, hw + soft, px)) * (1 - sstep(hh - soft, hh + soft, py));
          const bar = Math.max(1 - sstep(0.02, 0.05, px), 1 - sstep(0.02, 0.05, Math.abs(sy - hh * 0.35)));
          return spot * box * (1 - bar * mullion);
        });
      }
    };
    ap(src.windows.list, p.windowI, 1.2, 12, 0.8);
    ap(src.shops.list, p.shopI, 2.0, 15, 0);
    this.upload(this.accA, this.texA); this.upload(this.accB, this.texB);
    this.ms = performance.now() - t0;
  }
  /** add one light's ground irradiance; prof(fx, fy, fz) of the unit light -> ground direction (null = omni) */
  splat(acc, lx, ly, lz, R, r, cr, cg, cb, prof) {
    const T = this.texel, i0 = Math.max(0, Math.floor((lx - R - this.x0) / T)), i1 = Math.min(this.nx - 1, Math.ceil((lx + R - this.x0) / T));
    const j0 = Math.max(0, Math.floor((lz - R - this.z0) / T)), j1 = Math.min(this.nz - 1, Math.ceil((lz + R - this.z0) / T));
    const R2 = R * R, r2 = r * r;
    for (let j = j0; j <= j1; j++) {
      const z = this.z0 + (j + 0.5) * T;
      for (let i = i0; i <= i1; i++) {
        const x = this.x0 + (i + 0.5) * T, y = this.groundY(x, z);
        const dx = lx - x, dy = ly - y, dz = lz - z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= R2 || dy <= 0) continue;
        const d = Math.sqrt(d2), cosN = dy / d;                                  // Lambert on a floor (normal up)
        const k = prof ? prof(-dx / d, -dy / d, -dz / d) : 1;
        if (k <= 0) continue;
        const win = Math.max(0, 1 - (d2 / R2) ** 2) ** 2;
        const e = k * cosN * win / (d2 + r2), o = (j * this.nx + i) * 3;
        acc[o] += cr * e; acc[o + 1] += cg * e; acc[o + 2] += cb * e;
      }
    }
  }
  upload(acc, tex) {
    const d = tex.image.data, h = THREE.DataUtils.toHalfFloat;
    for (let i = 0, n = this.nx * this.nz; i < n; i++) { d[i * 4] = h(Math.min(60000, acc[i * 3])); d[i * 4 + 1] = h(Math.min(60000, acc[i * 3 + 1])); d[i * 4 + 2] = h(Math.min(60000, acc[i * 3 + 2])); d[i * 4 + 3] = 0; }
    tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------------------------------------ TSL
  uvAt(xz) { return xz.sub(this.uOrigin).mul(this.uInv); }
  /** irradiance (RGB) of the map at world xz: static layers (scaled) + the dynamic layer */
  irradiance(xz = positionWorld.xz) {
    const u = this.uvAt(xz);
    const inside = u.x.greaterThan(0).and(u.x.lessThan(1)).and(u.y.greaterThan(0)).and(u.y.lessThan(1));
    const st = texture(this.texA, u).rgb.mul(this.uA).add(texture(this.texB, u).rgb.mul(this.uB));
    const dy = texture(this.rt.texture, vec2(u.x, float(1).sub(u.y))).rgb.mul(this.uDyn);     // (a render target: v = 0 at the bottom = world z1)
    return select(inside, st.add(dy), vec3(0));
  }
  /** a ground material: emissive += albedo (x (1 - metalness)) / pi x the map; the cluster loop skips baked lights */
  addToGround(m) {
    const albedo = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
    const metal = m.metalnessNode ?? float(m.metalness ?? 0);
    const add = albedo.mul(float(1).sub(metal)).mul(1 / Math.PI).mul(this.irradiance());
    m.emissiveNode = m.emissiveNode ? m.emissiveNode.add(add) : add;
    m.userData.groundLight = true;
    return m;
  }
  /** walls, hedges: the map at their foot (0.3 m out along the normal), fading up to `height` m, only beyond the near band */
  addSpill(m, height = 5.5) {
    const albedo = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
    const n = normalWorld, xz = positionWorld.xz.add(normalize(vec2(n.x, n.z).add(1e-4)).mul(0.3));
    const up = smoothstep(float(height), float(0.5), positionWorld.y);
    const far = smoothstep(this.uNear0, this.uNear1, length(positionWorld.sub(cameraPosition)));
    const add = albedo.mul(1 / Math.PI).mul(this.irradiance(xz)).mul(up).mul(far).mul(0.6);
    m.emissiveNode = m.emissiveNode ? m.emissiveNode.add(add) : add;
    return m;
  }

  // ------------------------------------------------------------------------------------------------ dynamic layer
  /** the far cars' pools: max quads; call writeHead / writeRear then renderDynamic(renderer, n) each frame */
  createDynamic(cap = 128) {
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const aLamp = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);       // lamp xyz, kind (0 head, 1 rear)
    const aDir = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);        // beam axis xyz, range
    const aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);        // colour x intensity x weight
    geo.setAttribute("aLamp", aLamp); geo.setAttribute("aDir", aDir); geo.setAttribute("aCol", aCol);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const lamp = instancedBufferAttribute(aLamp), dir = instancedBufferAttribute(aDir), col = instancedBufferAttribute(aCol);
    const P = vec3(positionWorld.x, float(0), positionWorld.z);
    const Lv = lamp.xyz.sub(P), d2 = Lv.dot(Lv), d = d2.sqrt(), Ln = Lv.div(d), f = Ln.negate();
    const range = dir.w, win = float(1).sub(d2.div(range.mul(range)).pow2()).clamp().pow2();
    const up = vec3(0, 1, 0), cosA = dot(f, dir.xyz);
    const isRear = lamp.w.greaterThan(0.5);
    const head = lowBeamK(f, dir.xyz, up, cosA, float(-0.012), float(0.268)).mul(smoothstep(Math.cos(0.55), Math.cos(0.55 * 0.3), cosA));
    const k = select(isRear, float(1), head);
    const r2 = select(isRear, float(0.35 * 0.35), float(0.15 * 0.15));
    mat.colorNode = vec4(col.mul(k).mul(win).mul(max(Ln.y, 0)).div(d2.add(r2)), 1);
    const mesh = new THREE.InstancedMesh(geo, mat, cap);
    mesh.count = 0; mesh.frustumCulled = false;
    this.dynScene.add(mesh);
    this.dyn = { mesh, aLamp, aDir, aCol, max: cap, n: 0 };
    return this.dyn;
  }
  /** quad k: a far car's light. kind 0 = low beam (axis dx, dz), 1 = rear omni; colour already x intensity x weight */
  writeDyn(k, kind, lx, ly, lz, dx, dy, dz, range, r, g, b) {
    const D = this.dyn, e = D.mesh.instanceMatrix.array, o = k * 16;
    // the quad covering the light's ground footprint: a low beam reaches forward, a rear light all round
    let cx = lx, cz = lz, sx = range * 2, sz = range * 2, c = 1, s = 0;
    if (kind === 0) { const l = Math.hypot(dx, dz) || 1; c = dx / l; s = -dz / l; cx = lx + dx / l * range * 0.5; cz = lz + dz / l * range * 0.5; sx = range * 1.05; sz = range * 1.3; }
    e[o] = c * sx; e[o + 1] = 0; e[o + 2] = -s * sx; e[o + 3] = 0;
    e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0;
    e[o + 8] = s * sz; e[o + 9] = 0; e[o + 10] = c * sz; e[o + 11] = 0;
    e[o + 12] = cx; e[o + 13] = 0; e[o + 14] = cz; e[o + 15] = 1;
    const A = D.aLamp.array, B = D.aDir.array, C = D.aCol.array;
    A[k * 4] = lx; A[k * 4 + 1] = ly; A[k * 4 + 2] = lz; A[k * 4 + 3] = kind;
    B[k * 4] = dx; B[k * 4 + 1] = dy; B[k * 4 + 2] = dz; B[k * 4 + 3] = range;
    C[k * 3] = r; C[k * 3 + 1] = g; C[k * 3 + 2] = b;
  }
  renderDynamic(renderer, n) {
    const D = this.dyn;
    D.mesh.count = n;
    D.mesh.instanceMatrix.needsUpdate = D.aLamp.needsUpdate = D.aDir.needsUpdate = D.aCol.needsUpdate = true;
    const prev = renderer.getRenderTarget(), ac = renderer.autoClear, cc = renderer.getClearColor(this._cc ??= new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.render(this.dynScene, this.cam);
    renderer.setRenderTarget(prev);
    renderer.setClearColor(cc, ca);
    renderer.autoClear = ac;
  }
}
