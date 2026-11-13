// THE GRASS FIELD: what the grass compute reads (docs/GRASS.md "Field"). A top-down orthographic render, around the
// camera, of the SAME geometries the city draws (proxy meshes sharing their buffers, our own tiny materials):
//   pass 1  the terrain of each tile and the street's grass islands (road part "grass"), depth tested:
//           R = world height of the drawn surface, G = pack(density, flowers), B = pack(length, dry), A = 1
//   pass 2  every solid that grass must not grow through or under (carriageways, sidewalks, kerbs, squares, buildings,
//           tree trunks), drawn over pass 1 without a depth test: A = 0
// So blades stand exactly on the drawn triangles (no floating, no sinking: the JOINS rule), and stop at the kerb's
// and the wall's real outline, whatever the land-cover raster says.
//
// 128 m window, 1024^2 RGBA32F (12.5 cm texels, 16 MB). The window is centred on the texel grid (the same world
// point always lands on the same texel centre, so a re-bake changes nothing under a blade) and re-baked when the camera
// is RECENTER m off its centre or a tile comes / goes (one render of a few dozen draws, every few seconds on foot).
// Values are packed as integers (a*255 rounded, x 256 + b*255), so the compute does its own bilinear filter
// (sample() below: 4 textureLoads, unpacked, the height weighted by A so a blade by a kerb never takes its height).
import * as THREE from "three/webgpu";
import { Fn, vec2, vec3, vec4, float, int, ivec2, uniform, texture, textureLoad, positionWorld, normalWorld, smoothstep, clamp, floor, max, min, mix } from "three/tsl";
import { noiseTex, groundLook } from "../ground.js";

export const FIELD = { size: 128, res: 1024, recenter: 12 };

const pack2 = (a, b) => floor(clamp(a, 0, 1).mul(255).add(0.5)).mul(256).add(floor(clamp(b, 0, 1).mul(255).add(0.5)));

/** the solid pass's material: shared by every solid */
let solidMat = null;
function solidMaterial() {
  if (solidMat) return solidMat;
  solidMat = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, side: THREE.DoubleSide, fog: false });
  solidMat.fragmentNode = vec4(positionWorld.y, 0, 0, 0);
  solidMat.name = "grass-bake:solid";
  return solidMat;
}
/** grass islands / medians inside the road meshes: mown verge grass [density, length, dry, flowers] (Grass Field Lab:
 *  the "traffic island" type) */
export const ISLAND_VERGE = [0.95, 0.22, 0.35, 0.02];
let vergeMat = null;
/** grass islands / medians inside the road meshes: mown verge grass */
function vergeMaterial() {
  if (vergeMat) return vergeMat;
  vergeMat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, fog: false });
  vergeMat.fragmentNode = vec4(positionWorld.y, pack2(float(ISLAND_VERGE[0]), float(ISLAND_VERGE[3])), pack2(float(ISLAND_VERGE[1]), float(ISLAND_VERGE[2])), 1);
  vergeMat.name = "grass-bake:verge";
  return vergeMat;
}

/** the terrain pass's material for one tile (one shader for every tile: bounds and textures are bindings) */
function terrainMaterial(cover, types, bounds) {
  const uOrigin = uniform(new THREE.Vector2(bounds.x0, bounds.z0));
  const uInvSize = uniform(new THREE.Vector2(1 / (bounds.x1 - bounds.x0), 1 / (bounds.z1 - bounds.z0)));
  const P = positionWorld, xz = vec2(P.x, P.z);
  const muv = xz.sub(uOrigin).mul(uInvSize);
  const one = float(1);
  const GL = groundLook();
  const uRough = GL?.uRough ?? float(0.5), uDry = GL?.uDry ?? float(0.3);
  const m = new THREE.MeshBasicNodeMaterial({ fog: false });
  m.fragmentNode = Fn(() => {
    const mk = texture(cover, muv).level(0), ty = texture(types, muv).level(0);
    // the textured ground's own noise taps and formulas (ground.js): the blades follow its rough / dry / worn patches
    const nzA = texture(noiseTex, xz.div(640)), nzB = texture(noiseTex, xz.div(176).add(0.37)), nzC = texture(noiseTex, xz.div(51).add(0.71));
    const rough = smoothstep(0.45, 0.8, nzA.r).mul(uRough.mul(2).min(1));
    const dryP = smoothstep(0.6, 0.95, nzB.r.mul(0.7).add(nzC.r.mul(0.3))).mul(uDry.mul(2).min(1));
    const worn = smoothstep(0.8, 0.95, nzB.g).mul(smoothstep(0.55, 0.8, nzC.r)).mul(0.5);
    const slope = smoothstep(float(0.9), float(0.72), normalWorld.y);
    // land cover: woods keep their litter (grass only at the soft edge), no grass on paths, sand, water
    const woodEdge = smoothstep(0.15, 0.6, mk.r).mul(one.sub(smoothstep(0.88, 0.97, mk.r)));
    const dens = ty.r
      .mul(one.sub(smoothstep(0.6, 0.95, mk.r).mul(0.97)))
      .mul(one.sub(smoothstep(0.15, 0.45, mk.g)))
      .mul(one.sub(smoothstep(0.2, 0.5, mk.b)))
      .mul(one.sub(smoothstep(0.08, 0.35, mk.a)))
      .mul(one.sub(slope))
      .mul(one.sub(dryP.mul(0.45)))
      .mul(one.sub(worn.mul(1.7)).max(0));
    const len = clamp(ty.g.add(rough.mul(0.2).mul(one.sub(ty.g))).add(woodEdge.mul(0.55)), 0, 1);
    const dry = max(ty.b, dryP.mul(0.85));
    const flowers = ty.a.mul(one.sub(woodEdge));
    return vec4(P.y, pack2(dens, flowers), pack2(len, dry), 1);
  })();
  m.name = "grass-bake:terrain";
  m.userData.u = { uOrigin, uInvSize };
  return m;
}

const disc = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);

export class GrassField {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.size = opts.size ?? FIELD.size; this.res = opts.res ?? FIELD.res; this.recenter = opts.recenter ?? FIELD.recenter;
    this.texel = this.size / this.res;
    this.rt = new THREE.RenderTarget(this.res, this.res, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: true, generateMipmaps: false,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rt.texture.name = "grass-field";
    this.scene = new THREE.Scene();
    this.scene.matrixWorldAutoUpdate = false;
    const h = this.size / 2;
    this.camera = new THREE.OrthographicCamera(-h, h, h, -h, 1, 3000);
    this.camera.up.set(0, 0, -1);
    this.tiles = new Map();
    this.dirty = true;
    this.centre = new THREE.Vector2(1e9, 1e9);
    this.bakes = 0; this.lastBakeMs = 0;
    // texel (0,0)'s centre in world xz; the inverse texel size
    this.u = { origin: uniform(new THREE.Vector2()), invTexel: uniform(1 / this.texel), res: uniform(this.res, "int") };
    this.tex = this.rt.texture;
  }

  /** add a tile's surfaces. terrain: Mesh; grass: road meshes that ARE grass (islands); solids: meshes grass must
   *  not cross; trunks: [[x, z, r]]; cover: land-cover DataTexture; types: grassTypeData() result; bounds */
  addTile(name, { terrain, grass = [], solids = [], trunks = [], cover, types, bounds }) {
    this.removeTile(name);
    const group = new THREE.Group(); group.name = `grass-field-${name}`;
    const proxy = (src, mat, order) => {
      src.updateWorldMatrix(true, false);
      const p = src.isInstancedMesh ? new THREE.InstancedMesh(src.geometry, mat, src.count) : new THREE.Mesh(src.geometry, mat);
      if (src.isInstancedMesh) { p.instanceMatrix = src.instanceMatrix; p.count = src.count; }
      p.matrixAutoUpdate = false; p.matrix.copy(src.matrixWorld); p.matrixWorld.copy(src.matrixWorld);
      p.frustumCulled = true; p.renderOrder = order;
      group.add(p);
      return p;
    };
    const textures = [];
    if (terrain) {
      const tt = new THREE.DataTexture(types.data, types.W, types.H, THREE.RGBAFormat);
      tt.magFilter = tt.minFilter = THREE.LinearFilter; tt.generateMipmaps = false; tt.needsUpdate = true;
      textures.push(tt);
      const tm = terrainMaterial(cover, tt, bounds);
      proxy(terrain, tm, 0);
    }
    for (const m of grass) proxy(m, vergeMaterial(), 1);
    for (const m of solids) proxy(m, solidMaterial(), 10);
    if (trunks.length) {
      const im = new THREE.InstancedMesh(disc, solidMaterial(), trunks.length);
      const M = new THREE.Matrix4();
      trunks.forEach(([x, z, r], i) => { M.makeScale(r, 1, r).setPosition(x, (terrain ? 0 : 0) + this._groundGuess(x, z, terrain), z); im.setMatrixAt(i, M); });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.matrixAutoUpdate = false; im.renderOrder = 11;
      group.add(im);
    }
    group.updateMatrixWorld(true);
    this.scene.add(group);
    this.tiles.set(name, { group, textures });
    this.dirty = true;
  }
  _groundGuess() { return 0; }   // the solid pass has no depth test: the disc's height does not matter

  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    t.group.traverse((o) => { if (o.material?.name === "grass-bake:terrain") o.material.dispose(); if (o.isInstancedMesh && o.geometry === disc) o.dispose(); });
    for (const x of t.textures) x.dispose();
    this.tiles.delete(name);
    this.dirty = true;
  }

  /** re-bake if the camera left the window's middle or the tiles changed. Returns true when it baked. */
  update(camPos) {
    const off = Math.max(Math.abs(camPos.x - this.centre.x), Math.abs(camPos.z - this.centre.y));
    if (!this.dirty && off < this.recenter) return false;
    this.bake(camPos);
    return true;
  }

  bake(camPos) {
    const t0 = performance.now();
    const T = this.texel, h = this.size / 2;
    // centre on a texel CORNER grid: texel centres stay at the same world points from bake to bake
    const cx = Math.round(camPos.x / T) * T, cz = Math.round(camPos.z / T) * T;
    this.centre.set(cx, cz);
    this.camera.position.set(cx, 2000, cz);
    this.camera.lookAt(cx, 0, cz);
    this.camera.updateMatrixWorld(true);
    this.u.origin.value.set(cx - h + T / 2, cz - h + T / 2);
    const r = this.renderer, prevRT = r.getRenderTarget(), prevClear = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha();
    const prevAuto = r.autoClear, prevShadow = r.shadowMap.enabled;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.autoClear = true;
    r.render(this.scene, this.camera);
    r.setRenderTarget(prevRT);
    r.setClearColor(prevClear, prevAlpha);
    r.autoClear = prevAuto; r.shadowMap.enabled = prevShadow;
    this.dirty = false; this.bakes++;
    this.lastBakeMs = performance.now() - t0;
  }

  /** TSL (compute): the field at world xz, bilinear over the 4 texels around it:
   *  { y, dens, flowers, len, dry, free } (free: 1 = grass may grow, 0 = a solid / outside) */
  sample(xz) {
    const g = xz.sub(this.u.origin).mul(this.u.invTexel);
    const i0 = floor(g), f = g.sub(i0);
    const lim = this.res - 1;
    const at = (dx, dz) => textureLoad(this.tex, ivec2(clamp(int(i0.x).add(dx), 0, lim), clamp(int(i0.y).add(dz), 0, lim))).toVar();
    const a = at(0, 0), b = at(1, 0), c = at(0, 1), d = at(1, 1);
    const w = [float(1).sub(f.x).mul(float(1).sub(f.y)), f.x.mul(float(1).sub(f.y)), float(1).sub(f.x).mul(f.y), f.x.mul(f.y)];
    const T = [a, b, c, d];
    const un = (v) => { const hi = floor(v.div(256)); return vec2(hi.div(255), v.sub(hi.mul(256)).div(255)); };
    let free = float(0), hw = float(0), hy = float(0), G = vec2(0), B = vec2(0);
    for (let k = 0; k < 4; k++) {
      free = free.add(T[k].w.mul(w[k]));
      const wf = T[k].w.mul(w[k]);
      hw = hw.add(wf); hy = hy.add(T[k].x.mul(wf));
      G = G.add(un(T[k].y).mul(w[k])); B = B.add(un(T[k].z).mul(w[k]));
    }
    const y = hy.div(max(hw, 1e-5));
    return { y, free, dens: G.x, flowers: G.y, len: B.x, dry: B.y };
  }

  /** JS read-back helper for checks (async): the raw RGBA32F texels */
  async readback() { return this.renderer.readRenderTargetPixelsAsync(this.rt, 0, 0, this.res, this.res); }

  dispose() { for (const n of [...this.tiles.keys()]) this.removeTile(n); this.rt.dispose(); }
}
