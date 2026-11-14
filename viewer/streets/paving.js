// STREET SURFACES FROM BAKED TEXTURES (docs/STREET_SURFACES.md): the asphalt, the old setts (pavés / kasseien), the
// concrete pavers and the 30 cm sidewalk slabs as ONE pair of texture arrays (albedo sRGB + nra = normal x,y +
// roughness + AO, the library's scan format, KTX2 UASTC -> BC7 / ASTC), shared by every street material:
//   roadPaint.js asphaltMaterial (carriageways: aSurf picks the layer per pixel), concreteMaterial (sidewalks),
//   cobbles.js cobbleMaterial (measured squares), plazas.js (squares from overrides.json).
// ?paving=old: the live procedural surfaces of before (no texture is loaded).
//
// Layers (textures/streets/streets.json): all 1024 px, same format, so they pack into one array per map:
//   0 asphalt   texture factory tf_asphalt_a (aged AC-10 with porphyry chips), 2 m, isotropic
//   1 setts     Poly Haven cobblestone_floor_08 (CC0 scan of old worn rounded setts in rows), 2 m, 10 rows
//   2 pavers    texture factory tf_pavers_a (grey concrete pavers 22 x 11 cm, stretcher bond), 1.8 m, [8, 16]
//   3 slabs     texture factory tf_paving_concrete_a (Brussels 30 x 30 cm concrete tiles), 1.8 m, [6, 6]
//
// Sampling: hex-tiled (Mikkelsen 2022, as materials/antitile.js and the textured ground): every hex tile takes its own
// offset (structured layers: snapped to pairs of courses and whole units, so joints stay on the same lines; asphalt:
// free offset + rotation) and a small tone. Like ground.js, ONE tap per map where one hex tile owns the pixel (most
// pixels), three only in the blend zones. Explicit gradients (textureGrad): mipmapped + anisotropic 8, so nothing
// shimmers far away (the mips carry the average; no procedural edge left to alias).
import * as THREE from "three/webgpu";
import { Fn, If, float, int, vec2, vec3, vec4, mix, max, clamp, smoothstep, pow, dot, floor, fract, cos, sin, select, normalize, cross,
  texture, uniformArray, positionWorld, normalWorld, normalView, cameraViewMatrix } from "three/tsl";
import { hash22 } from "../materials/antitile.js";
import { ktxLoader } from "../materials/scans.js";

export const pavingOn = !/[?&]paving=old/.test(location.search);
export const LAYER = { asphalt: 0, setts: 1, pavers: 2, slabs: 3 };

const BASE = new URL("../materials/textures/", import.meta.url).href;
let PT = null, ready = null;

/** the street textures once (null: ?paving=old, or the files / transcoder failed: the procedural look stays) */
export function loadPavingTextures(renderer) {
  if (!pavingOn) return Promise.resolve(null);
  return (ready ??= build(renderer).catch((e) => { console.warn(`[paving] textures failed (${e.message}): procedural streets`); return null; }));
}
/** the loaded set (after loadPavingTextures resolved), else null */
export const pavingTextures = () => PT;

async function build(renderer) {
  const t0 = performance.now();
  const man = await fetch(BASE + "streets/streets.json").then((r) => { if (!r.ok) throw new Error(`streets.json HTTP ${r.status}`); return r.json(); });
  const layers = man.layers.slice().sort((a, b) => a.layer - b.layer);
  const ktx = ktxLoader(renderer);
  const load = (role) => Promise.all(layers.map((l) => ktx.loadAsync(`${BASE}${l.files}_${role}.ktx2`)));
  const [alb, nra] = await Promise.all([load("albedo"), load("nra")]);
  const pack = (list, srgb) => {
    const t = list[0], n = list.length;
    for (const q of list) if (q.format !== t.format || q.image.width !== t.image.width || q.mipmaps.length !== t.mipmaps.length) throw new Error("street layers differ in size / format");
    const mipmaps = t.mipmaps.map((m, i) => {
      const per = m.data.byteLength, data = new m.data.constructor(per * n / m.data.BYTES_PER_ELEMENT);
      list.forEach((q, k) => data.set(q.mipmaps[i].data, k * per / m.data.BYTES_PER_ELEMENT));
      return { data, width: m.width, height: m.height };
    });
    const arr = new THREE.CompressedArrayTexture(mipmaps, t.image.width, t.image.height, n, t.format, t.type);
    arr.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    arr.wrapS = arr.wrapT = THREE.RepeatWrapping;
    arr.minFilter = THREE.LinearMipmapLinearFilter; arr.magFilter = THREE.LinearFilter;
    arr.anisotropy = 8;
    arr.generateMipmaps = false;
    arr.needsUpdate = true;
    for (const q of list) q.dispose();
    return { arr, bytes: mipmaps.reduce((s, m) => s + m.data.byteLength, 0) };
  };
  const A = pack(alb, true), R = pack(nra, false);
  const lat = layers.map((l) => l.lattice ?? [0, 0]);
  PT = {
    albedo: A.arr, nra: R.arr, layers, bytesGPU: A.bytes + R.bytes, bytesFile: layers.reduce((s, l) => s + (l.bytes ?? 0), 0),
    mean: Object.fromEntries(layers.map((l) => [l.name, l.mean_albedo_linear])),
    latX: uniformArray(lat.map((l) => (l[0] > 1 ? l[0] : 0))),
    latY: uniformArray(lat.map((l) => (l[1] > 1 ? Math.max(1, Math.round(l[1] / 2)) : 0))),
    rot: uniformArray(layers.map((l) => (l.lattice ? 0 : 1))),
    ms: Math.round(performance.now() - t0),
  };
  console.log(`[paving] ${layers.length} street layers (${layers.map((l) => l.name).join(", ")}): ${(PT.bytesGPU / 1048576).toFixed(1)} MB on the GPU, ${PT.ms} ms`);
  return PT;
}

const SQ3x2 = 2 * Math.sqrt(3);

/**
 * Hex-tiled sample of street layer `layer` (float node, 0..3) at plane coordinates (a, b) in metres, `size` metres
 * per texture repeat (node). Texture u runs along a, v along b (a structured layer's courses stack along b).
 * Returns toVar nodes { col: vec3 albedo (linear, x per-tile tone), n: vec2 tangent normal x,y, rough, ao }.
 * Call at the top level of a material's node graph (it opens its own Fn; the derivatives are taken first, in
 * uniform control flow).
 */
export function pavingSample(a, b, layer, size) {
  const S = PT;
  const colV = vec3(0.1).toVar(), nV = vec2(0).toVar(), raV = vec2(0.9, 1).toVar(), tpp = float(1).toVar();
  const run = Fn(() => {
    const st = vec2(a, b).div(size).toVar(), dx = vec2(0).toVar(), dy = vec2(0).toVar();
    dx.assign(st.dFdx()); dy.assign(st.dFdy());
    tpp.assign(max(dx.length(), dy.length()).mul(1024));                 // texels per pixel (the larger axis)
    const L = int(layer.add(0.5)).toVar();
    const nx = S.latX.element(L).toVar(), ny = S.latY.element(L).toVar(), rk = S.rot.element(L).toVar();
    colV.assign(vec3(0.1)); nV.assign(vec2(0)); raV.assign(vec2(0.9, 1));
    const one = float(1);
    const g = st.mul(SQ3x2);
    const sk = vec2(g.x.sub(g.y.mul(0.57735027)), g.y.mul(1.15470054));
    const base = floor(sk), f = fract(sk);
    const tz = one.sub(f.x).sub(f.y);
    const s = max(float(0), tz.negate()).ceil().min(1);
    const s2 = s.mul(2).sub(1);
    const wt = [tz.negate().mul(s2), s.sub(f.y.mul(s2)), s.sub(f.x.mul(s2))];
    const verts = [vec2(0).toVar(), vec2(0).toVar(), vec2(0).toVar()];
    verts[0].assign(base.add(vec2(s, s))); verts[1].assign(base.add(vec2(s, one.sub(s)))); verts[2].assign(base.add(vec2(one.sub(s), s)));
    const tapAt = (v) => {
      const cen = vec2(v.x.add(v.y.mul(0.5)), v.y.mul(1 / 1.15470054)).div(SQ3x2);
      const h = hash22(v), h2 = hash22(v.add(vec2(71, 113)));
      // structured: offsets in whole units across / pairs of courses along (joints stay on their lines); else free
      const ox = select(nx.greaterThan(0.5), floor(h.x.mul(nx)).div(nx.max(1)), h.x);
      const oy = select(ny.greaterThan(0.5), floor(h.y.mul(ny)).div(ny.max(1)), h.y);
      const ang = h2.x.sub(0.5).mul(2 * Math.PI).mul(rk), cs = cos(ang), sn = sin(ang);
      const rot = (u) => vec2(u.x.mul(cs).sub(u.y.mul(sn)), u.x.mul(sn).add(u.y.mul(cs)));
      const q = rot(st.sub(cen)).add(cen).add(vec2(ox, oy)), gx = rot(dx), gy = rot(dy);
      const A = texture(S.albedo, q).depth(L).grad(gx, gy), R = texture(S.nra, q).depth(L).grad(gx, gy);
      const nx2 = R.r.mul(2).sub(1), ny2 = R.g.mul(2).sub(1);
      const n = vec2(nx2.mul(cs).add(ny2.mul(sn)), ny2.mul(cs).sub(nx2.mul(sn)));    // back into the surface frame
      const t = h2.y.sub(0.5).mul(0.1).add(1);                                          // per-tile tone +-5 %
      return { A, R, n, t };
    };
    const gw = [float(0).toVar(), float(0).toVar(), float(0).toVar()];
    wt.forEach((x, i) => gw[i].assign(pow(clamp(x, 0, 1), float(7))));
    const gs = gw[0].add(gw[1]).add(gw[2]).max(1e-6);
    const g0 = gw[0].div(gs), g1 = gw[1].div(gs), g2 = gw[2].div(gs);
    const gmax = max(g0, max(g1, g2));
    If(gmax.greaterThan(0.96), () => {
      const vSel = select(g0.greaterThanEqual(gmax), verts[0], select(g1.greaterThanEqual(gmax), verts[1], verts[2]));
      const tp = tapAt(vSel);
      colV.assign(tp.A.rgb.mul(tp.t)); nV.assign(tp.n); raV.assign(vec2(tp.R.b, tp.R.a));
    }).Else(() => {
      const lw = vec3(0.299, 0.587, 0.114);
      const taps = verts.map(tapAt);
      const W = taps.map((tp, i) => mix(one, dot(tp.A.rgb, lw), 0.6).mul(gw[i]));
      const sum = W[0].add(W[1]).add(W[2]).max(1e-6);
      const kk = W.map((x) => x.div(sum));
      const blend = (fn) => taps.map((tp, i) => fn(tp).mul(kk[i])).reduce((p, q) => p.add(q));
      colV.assign(blend((tp) => tp.A.rgb.mul(tp.t))); nV.assign(blend((tp) => tp.n)); raV.assign(blend((tp) => vec2(tp.R.b, tp.R.a)));
    });
    return colV;
  });
  // the Fn's RESULT must be in the graph (an uncalled / unused Fn emits nothing): col is it; n / rough / ao are the vars it
  // assigned (as viewer/ground.js: used after it in the same fragment function)
  const col = run();
  // SPECULAR ANTI-ALIASING: once a pixel covers more than ~a texel, the stone arrises' sharp normals sit below the
  // pixel; their highlights blink from frame to frame (the flicker test). The mips average the normal (a shorter, flatter
  // normal that the BRDF does not see as rougher), so the roughness goes up with the normal's own variation across the
  // pixel (Toksvig-like, from its screen derivatives) and with the texel density, and the normal is faded as the
  // density grows (by then the AO / albedo carry the relief)
  const nVar = clamp(nV.x.fwidth().add(nV.y.fwidth()), 0, 1);
  const dens = smoothstep(0.6, 4.0, tpp);
  const rough = clamp(raV.x.add(nVar.mul(0.9)), 0, 1).max(mix(raV.x, float(0.9), dens));
  const nFade = float(1).sub(smoothstep(1.0, 8.0, tpp).mul(0.75));
  return { col, n: nV.mul(nFade), rough, ao: raV.y, tpp };
}

/** view-space normal for a material from a tangent-space normal x,y in the (a, b) frame (cotangent frame from the
 *  screen derivatives: no tangent attribute), `k` = strength node */
export function pavingNormal(n, a, b, k = float(1)) {
  const P = positionWorld, N = normalWorld;
  const dp1 = P.dFdx(), dp2 = P.dFdy(), da = vec2(a, b).dFdx(), db = vec2(a, b).dFdy();
  const p2 = cross(dp2, N), p1 = cross(N, dp1);
  const T = p2.mul(da.x).add(p1.mul(db.x)), B = p2.mul(da.y).add(p1.mul(db.y));
  const inv = max(dot(T, T), dot(B, B)).max(1e-12).inverseSqrt();
  const off = T.mul(n.x).add(B.mul(n.y)).mul(inv).mul(k);
  return normalize(normalView.add(cameraViewMatrix.mul(vec4(off, 0)).xyz));
}

/** albedo regrade: desaturate by `desat` (0..1), then scale so the layer's mean luminance becomes `target`'s, tinted
 *  toward `target` (linear rgb) */
export function regrade(col, layerName, target, desat = 0.5) {
  const m = PT.mean[layerName];
  const lm = 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  const lt = 0.2126 * target[0] + 0.7152 * target[1] + 0.0722 * target[2];
  const lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  const grey = mix(col, vec3(lum), desat);
  return grey.mul(vec3(target[0] / lt, target[1] / lt, target[2] / lt).mul(lt / lm));
}
