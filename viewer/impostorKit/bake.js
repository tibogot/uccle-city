// impostorKit / bake.js: the GPU baker. Any source (a tree species, a car model, a prop) -> an ImpostorAtlas: two
// RGBA8 texture ARRAYS (one layer per variant), each layer N x N views of C px (a gutter of g px each side).
//
//  1. CAPTURE, supersampled: the views of one grid row are rendered into a strip `ss` times the cell size (ss = 4:
//     16 sub-samples per atlas texel; Unreal's ImpostorBaker asks for a capture of >= 2x the final frame), MRT:
//       output = albedo.rgb, 1          (cleared to 0: alpha 1 = "something is here")
//       aux    = the type's aux: view-space normal xy, depth over the bounding sphere, a type scalar (trees: leaf
//                flag + AO as viewer/impostors.js stores it)
//     One render per view (the source's materials may face the camera, as the stylized leaves do).
//  2. RESOLVE (a GPU pass per row): ss x ss sub-samples -> one texel. COVERAGE = the share of covered sub-samples
//     (a real fractional alpha, not a 0/1 staircase: cause 2 of docs/IMPOSTORS_RESEARCH.md), colour and aux averaged
//     over the covered sub-samples only (no dark fringe, no averaging with "nothing").
//  3. READ BACK the layer (async, no stall) and hand it to bakeWorker.js (off the main thread): dilation into the
//     gutters and empty texels, per-cell coverage-preserving mips (Castano), the cut-out card.
//  4. UPLOAD into the arrays: level 0 through three, levels 1.. written straight to the GPU texture (three r187
//     uploads only level 0 of a DataArrayTexture: WebGPUTextureUtils updateTexture).
// The bake yields to the browser between rows (no long task on the main thread); it reports its time.
// Depth convention: the bake camera sits 2R from the sphere centre; depth = (view-axis distance from the centre
// plane) / R in [-1, 1], stored 0.5 + 0.5 d (8 bits: 2R / 255 = 6 cm for a 16 m tree).
import * as THREE from "three/webgpu";
import {
  Fn, Discard, mrt, vec4, vec3, vec2, float, int, ivec2, uniform, positionView, cameraViewMatrix, normalize, saturate,
  screenCoordinate, textureLoad, max, floor, abs, select,
} from "three/tsl";
import { gridToDir, upRef } from "./octa.js";

/** Shared by every bake material: the bounding radius of the variant being baked (object units). */
export const BAKE = { R: uniform(1) };

/**
 * A bake material (the kit's G-buffer contract). Every input is a TSL node in OBJECT space (the bake draws the
 * source at the identity).
 * @param {object} o
 * @param {Node} o.albedo  vec3, linear, before any per-instance tint
 * @param {Node} o.normal  vec3, object space (need not be normalised)
 * @param {Node} [o.aux]   float, the type's scalar in B.a (trees: leaf flag / AO)
 * @param {Node} [o.discard] bool: drop this fragment (a cut-out)
 * @param {Node} [o.positionNode]  the source material's own positionNode (camera-facing cards, morphs)
 */
export function bakeMaterial({ albedo, normal, aux = float(1), discard = null, positionNode = null, side = THREE.DoubleSide }) {
  const m = new THREE.MeshBasicNodeMaterial({ side });
  if (positionNode) m.positionNode = positionNode;
  const nV = normalize(cameraViewMatrix.mul(vec4(normal, 0)).xyz);
  const depth = saturate(BAKE.R.mul(2).add(positionView.z).div(BAKE.R).mul(0.5).add(0.5));
  const out = Fn(() => {
    if (discard) Discard(discard);
    return vec4(albedo, 1);
  })();
  m.mrtNode = mrt({ output: out, aux: vec4(octEncode(nV).mul(0.5).add(0.5), depth, aux) });
  m.toneMapped = false;
  m.fog = false;
  m.lights = false;
  return m;
}

/** Full octahedral encoding of a unit vector -> [-1, 1]^2 (keeps normals facing away from the view: the crown's
 *  dark back clumps seen through gaps; a "z toward the viewer" reconstruction lit them like the front). */
export function octEncode(n) {
  const p = n.xy.div(abs(n.x).add(abs(n.y)).add(abs(n.z)));
  const s = vec2(select(p.x.greaterThanEqual(0), float(1), float(-1)), select(p.y.greaterThanEqual(0), float(1), float(-1)));
  return select(n.z.lessThan(0), vec2(float(1).sub(abs(p.y)), float(1).sub(abs(p.x))).mul(s), p);
}
export function octDecode(e) {
  const z = float(1).sub(abs(e.x)).sub(abs(e.y));
  const s = vec2(select(e.x.greaterThanEqual(0), float(1), float(-1)), select(e.y.greaterThanEqual(0), float(1), float(-1)));
  const xy = select(z.lessThan(0), vec2(float(1).sub(abs(e.y)), float(1).sub(abs(e.x))).mul(s), e);
  return normalize(vec3(xy, z));
}

const nextFrame = () => new Promise((r) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));
let worker = null, jobId = 0;
const pending = new Map();
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./bakeWorker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); p?.(e.data); };
  return worker;
}
const runWorker = (msg, transfer) => new Promise((resolve) => { const id = ++jobId; pending.set(id, resolve); getWorker().postMessage({ ...msg, id }, transfer); });

/**
 * @param {THREE.WebGPURenderer} renderer
 * @param {object} source  { count, sphere(v) -> THREE.Sphere (object space), object(v) -> Object3D drawn with
 *                          bakeMaterial()s at the identity, done?(v) }
 * @param {object} spec    { grid = 16, cell = 64, gutter = 4, ss = 4, full = false, minCell = 8, label,
 *                          auxHalf = false: the aux array (normal, depth, the type's scalar) kept from mip 1 down: half
 *                          the size each way, a quarter of its memory (smooth data: the stylized trees' clump-dome
 *                          normals and occlusion); the material samples it one level down (the Tree Lab's species) }
 * @returns {Promise<ImpostorAtlas>}
 */
export async function bakeAtlas(renderer, source, spec = {}) {
  const N = spec.grid ?? 16, C = spec.cell ?? 64, g = spec.gutter ?? 4, ss = spec.ss ?? 4, full = !!spec.full;
  const inner = C - 2 * g, W = N * C, L = source.count, auxHalf = !!spec.auxHalf;
  const t0 = performance.now();
  let gpuMs = 0, workerMs = 0;
  const mk = (w, h) => {
    const rt = new THREE.RenderTarget(w, h, { count: 2, type: THREE.UnsignedByteType, depthBuffer: true, samples: 1 });
    rt.textures[0].name = "output"; rt.textures[1].name = "aux";
    for (const t of rt.textures) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; }
    rt.scissorTest = true;
    return rt;
  };
  const strip = mk(W * ss, C * ss), layer = mk(W, W);

  // the resolve pass: ss x ss sub-samples of the strip -> one texel of the layer's row
  const uRow = uniform(0);
  const tA = strip.textures[0], tB = strip.textures[1];
  const resolve = new THREE.MeshBasicNodeMaterial();
  {
    const X = int(floor(screenCoordinate.x)), Y = int(floor(screenCoordinate.y)).sub(int(uRow).mul(C));
    let sa = float(0), sc = vec3(0), sb = vec4(0);
    for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
      const p = ivec2(X.mul(ss).add(i), Y.mul(ss).add(j));
      const a = textureLoad(tA, p), b = textureLoad(tB, p);
      sa = sa.add(a.a); sc = sc.add(a.rgb.mul(a.a)); sb = sb.add(b.mul(a.a));
    }
    const inv = float(1).div(max(sa, 1e-4));
    resolve.mrtNode = mrt({ output: vec4(sc.mul(inv), sa.div(ss * ss)), aux: sb.mul(inv) });
    resolve.depthTest = resolve.depthWrite = false;
  }
  const fsScene = new THREE.Scene();
  fsScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), resolve));
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  fsCam.position.z = 0.5; fsCam.updateMatrixWorld();

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 4);
  const scene = new THREE.Scene();
  const dir = new THREE.Vector3(), up = new THREE.Vector3();
  const saved = { rt: renderer.getRenderTarget(), clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), auto: renderer.autoClear };
  const layersA = [], layersB = [], spheres = [], hulls = [], stats = [];
  let levelCount = 0;

  for (let v = 0; v < L; v++) {
    const sph = source.sphere(v), R = sph.radius;
    const obj = source.object(v);
    scene.add(obj);
    BAKE.R.value = R;
    cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = 0.01 * R; cam.far = 4 * R;
    cam.updateProjectionMatrix();
    spheres.push(new THREE.Vector4(sph.center.x, sph.center.y, sph.center.z, R));
    const restore = () => { renderer.setRenderTarget(saved.rt); renderer.setClearColor(saved.clear, saved.alpha); renderer.autoClear = saved.auto; };
    // clear the layer once
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    layer.scissor.set(0, 0, W, W); layer.viewport.set(0, 0, W, W);
    renderer.setRenderTarget(layer); renderer.clear(true, true, false);
    restore();
    for (let gy = 0; gy < N; gy++) {
      const tr = performance.now();
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 0);
      strip.scissor.set(0, 0, W * ss, C * ss); strip.viewport.set(0, 0, W * ss, C * ss);
      renderer.setRenderTarget(strip); renderer.clear(true, true, false);
      source.beforeRender?.(v);
      for (let gx = 0; gx < N; gx++) {
        gridToDir(gx / (N - 1), gy / (N - 1), dir, full);
        cam.up.copy(upRef(dir, up));
        cam.position.copy(sph.center).addScaledVector(dir, R * 2);
        cam.lookAt(sph.center);
        cam.updateMatrixWorld(true);
        const x = (gx * C + g) * ss, y = g * ss, s = inner * ss;
        strip.viewport.set(x, y, s, s); strip.scissor.set(x, y, s, s);
        renderer.setRenderTarget(strip);
        renderer.render(scene, cam);
      }
      source.afterRender?.(v);
      uRow.value = gy;
      layer.viewport.set(0, gy * C, W, C); layer.scissor.set(0, gy * C, W, C);
      renderer.setRenderTarget(layer);
      renderer.render(fsScene, fsCam);
      restore();
      gpuMs += performance.now() - tr;
      await nextFrame();                 // a row per frame: no long task
    }
    scene.remove(obj);
    source.done?.(v);
    const rA = await renderer.readRenderTargetPixelsAsync(layer, 0, 0, W, W, 0);
    const rB = await renderer.readRenderTargetPixelsAsync(layer, 0, 0, W, W, 1);
    const A = tight(rA, W), B = tight(rB, W);
    const res = await runWorker({ A: A.buffer, B: B.buffer, size: W, N, C, g, minCell: spec.minCell ?? 8 }, [A.buffer, B.buffer]);
    workerMs += res.ms;
    layersA.push(res.levels.map((l) => l.a)); layersB.push(res.levels.slice(auxHalf ? 1 : 0).map((l) => l.b));
    levelCount = res.levels.length;
    hulls.push(res.hull); stats.push(res.stats);
  }
  strip.dispose(); layer.dispose(); resolve.dispose();

  if (auxHalf && levelCount < 2) throw new Error("impostorKit: auxHalf needs at least 2 mip levels (cell / minCell)");
  const levelsB = auxHalf ? levelCount - 1 : levelCount, WB = auxHalf ? W >> 1 : W;
  const texA = arrayTexture(renderer, layersA, W, levelCount), texB = arrayTexture(renderer, layersB, WB, levelsB);
  const lvlBytes = (w, n) => [...Array(n)].reduce((s, _, i) => s + (w >> i) ** 2 * 4, 0);
  const bytes = L * (lvlBytes(W, levelCount) + lvlBytes(WB, levelsB));
  const atlas = {
    texA, texB, layers: L, grid: N, cell: C, gutter: g, inner, size: W, full, levels: levelCount, maxLevel: levelCount - 1, auxHalf,
    spheres, hulls, stats, bytes, ss,
    bakeMs: performance.now() - t0, renderMs: gpuMs, workerMs,
    /** the level-0 pixels of a layer (for the lab's atlas viewer) */
    pixels: (layerIdx, ch = "A") => (ch === "A" ? layersA : layersB)[layerIdx][0],
    dispose() { texA.dispose(); texB.dispose(); },
  };
  return atlas;
}

/** Strip any row padding from a read-back (WebGPU rows are 256-byte aligned). */
function tight(buf, W) {
  const src = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const row = W * 4;
  if (src.length === row * W) return new Uint8Array(src);
  const stride = src.length / W, out = new Uint8Array(row * W);
  for (let y = 0; y < W; y++) out.set(src.subarray(y * stride, y * stride + row), y * row);
  return out;
}

/** A DataArrayTexture with our own mip chain (levels[layer][level] = Uint8Array RGBA8). */
function arrayTexture(renderer, levels, W, count) {
  const L = levels.length;
  const join = (lvl) => { const w = W >> lvl, out = new Uint8Array(w * w * 4 * L); for (let i = 0; i < L; i++) out.set(levels[i][lvl], i * w * w * 4); return out; };
  const data0 = join(0);
  const tex = new THREE.DataArrayTexture(data0, W, W, L);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = false;
  tex.mipmaps = [...Array(count)].map((_, i) => ({ data: i === 0 ? data0 : null, width: W >> i, height: W >> i, depth: L }));
  tex.needsUpdate = true;
  renderer.initTexture(tex);
  const gpu = renderer.backend.get(tex).texture, device = renderer.backend.device;
  if (gpu && device) {
    for (let lvl = 1; lvl < count; lvl++) {
      const w = W >> lvl, d = join(lvl);
      device.queue.writeTexture({ texture: gpu, mipLevel: lvl, origin: { x: 0, y: 0, z: 0 } }, d, { offset: 0, bytesPerRow: w * 4, rowsPerImage: w }, { width: w, height: w, depthOrArrayLayers: L });
    }
  }
  return tex;
}


