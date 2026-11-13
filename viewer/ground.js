// Ground material for the terrain mesh.
//
// Land cover per tile is painted at load from the real OSM areas and paths of features.json into a
// 1 m/px RGBA mask (linear filtered, so edges blend over a metre or two):
//   R = woodland (wood, forest, scrub): leaf litter, moss, dark soil
//   G = paths (footway, path, cycleway, steps, pedestrian): gravel / stabilised sand, 1.6 m wide
//   B = sand (playground)                       A = water
// Everything else (gardens, verges, lawns, pitches and parks) is grass: three scales of value noise
// for patches of greener and drier grass, worn earth near the low end of slopes, clover-dark spots,
// and a fine bump. Steep ground turns to bare earth.
//
// TEXTURED GROUND (2026-11-13, docs/materials/GROUND.md; ?groundtex=0 = the procedural ground): one CC0 scan per
// cover (lawn, rough grass, dry / worn grass, beech leaf litter, pale dolomite gravel, bare soil, sand) in two texture
// arrays (viewer/materials/groundTex.js). Per pixel the cover weights (mask + slope + macro noise for the grass
// flavours) pick the TWO strongest layers (the third's weight subtracted, so a swap is continuous), blended by height
// (each scan's luminance over its mean: gravel shows through thin grass first). Anti-tiling: Mikkelsen hex-tiling (as
// the library's antitile.js) with free offsets, rotation and a +-6 % tone per hex, one grid shared by both layers;
// macro tone noise at 8 / 40 m. Far: blends to the tile's ORTHOPHOTO (the far-LOD tiles' look) over 220-480 m, so the
// full -> far hand-over has no colour jump. 3 hex taps x 2 layers x 2 maps = 12 texture reads (explicit gradients).
import * as THREE from "three/webgpu";
import { Fn, float, int, vec2, vec3, vec4, color, mix, smoothstep, positionWorld, normalWorld, normalView, texture, uv, clamp, max, uniform, uniformArray,
  cameraPosition, cameraViewMatrix, length, floor, fract, dot, pow, cos, sin, select, normalize } from "three/tsl";
import { hash22 } from "./materials/antitile.js";
import { addLampLight } from "./lampLight.js";
import { noise2D, bumpNormal } from "./tslkit.js";

import { landCoverData } from "./landcover.js";
import { houseCut, cutOpacity } from "./interior/cut.js";

/** The mask as a texture; `pre` = landCoverData() already computed (e.g. by the tile worker). */
export function landCoverTexture(feats, bounds, pre) {
  const { data, W, H, areas, paths } = pre || landCoverData(feats, bounds);
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, areas, paths };
}

/** The terrain material: grass by default, the mask's covers where OSM has them. Textured (CC0 scans per cover,
 *  groundTex.js) once setGroundTextures() has the arrays; ?groundtex=0 (or no textures) = the procedural ground. */
export function groundMaterial(cover, bounds, contour) {
  return GT ? texturedGround(cover, bounds, contour) : proceduralGround(cover, bounds, contour);
}

/** The procedural ground (before 2026-11-13; ?groundtex=0): value noise + flat colours. */
export function proceduralGround(cover, bounds, contour) {
  const P = positionWorld;
  // tile bounds as uniforms, not constants: constants end up in the WGSL text, so each tile would compile
  // its own copy of this shader (a ~450 ms freeze per streamed tile on Windows/DXC)
  const uOrigin = uniform(new THREE.Vector2(bounds.x0, bounds.z0));
  const uInvSize = uniform(new THREE.Vector2(1 / (bounds.x1 - bounds.x0), 1 / (bounds.z1 - bounds.z0)));
  const muv = vec2(P.x, P.z).sub(uOrigin).mul(uInvSize);
  const mk = texture(cover.tex, muv);
  const xz = vec2(P.x, P.z);
  const n1 = noise2D(xz.mul(0.035)), n2 = noise2D(xz.mul(0.21).add(17.3)), n3 = noise2D(xz.mul(1.7).add(5.1));
  const fine = noise2D(xz.mul(9.0));
  // grass: lush to dry, darker clover patches, a little earth showing where worn
  let grass = mix(color(0x4a6a2a), color(0x6f8236), n1);
  grass = mix(grass, color(0x8c8a4a), smoothstep(0.62, 0.85, n2).mul(0.55));        // dry patches
  grass = mix(grass, color(0x3a5524), smoothstep(0.55, 0.8, n3).mul(0.35));         // clover / lush
  grass = grass.mul(fine.mul(0.22).add(0.89));
  const worn = smoothstep(0.78, 0.92, noise2D(xz.mul(0.09).add(3.3))).mul(0.6);
  grass = mix(grass, color(0x6b5a40), worn.mul(smoothstep(0.5, 0.75, n3)));
  // woodland floor: leaf litter, moss
  let wood = mix(color(0x3b3020), color(0x5a4a2c), n2);
  wood = mix(wood, color(0x3c5426), smoothstep(0.6, 0.85, n3).mul(0.6)).mul(fine.mul(0.3).add(0.85));
  // gravel paths, sand, water
  const gravel = mix(color(0x9a8c74), color(0xb8ab92), n3).mul(fine.mul(0.35).add(0.82));
  const sand = mix(color(0xc4ad84), color(0xd8c49c), n2).mul(fine.mul(0.2).add(0.9));
  const water = color(0x1c2a2c);
  let col = grass;
  col = mix(col, wood, mk.r);
  col = mix(col, sand, mk.b);
  col = mix(col, gravel, mk.g);
  // steep banks: bare earth
  const slope = smoothstep(float(0.9), float(0.72), normalWorld.y);
  col = mix(col, mix(color(0x6d5a40), color(0x7d6a4f), n2), slope.mul(float(1).sub(mk.g)).mul(float(1).sub(mk.r.mul(0.95))));   // (wooded banks stay green-brown)
  col = mix(col, water, mk.a);
  col = contour ? contour(col) : col;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  m.colorNode = col;
  // grass blades / gravel grain as bump; water flat and glossy
  const relief = fine.mul(0.012).add(n3.mul(0.02)).mul(float(1).sub(mk.a));
  m.normalNode = bumpNormal(relief);
  m.roughnessNode = mix(mix(float(0.92), float(0.85), mk.g), float(0.08), mk.a);
  m.metalnessNode = mk.a.mul(0.5);
  // an interior cell is loaded (?interior=1): no terrain inside its house (viewer/interior/cut.js)
  if (houseCut.enabled) m.maskNode = cutOpacity(float(1), -0.08).greaterThan(0.5);
  return addLampLight(m);
}

// ------------------------------------------------------------------------------------------------ textured ground
let GT = null;                    // groundTex.js result: { albedo, nra, layers }
let shared = null;                // nodes shared by every tile's material (same values: one shader)
/** hand the loaded cover textures to the ground (before the first tile; null = procedural) */
export function setGroundTextures(G) {
  GT = G;
  if (!G) { shared = null; return; }
  const L = G.layers;
  const lumOf = (l) => 0.2126 * l.mean_albedo_linear[0] + 0.7152 * l.mean_albedo_linear[1] + 0.0722 * l.mean_albedo_linear[2];
  shared = {
    invSize: uniformArray(L.map((l) => 1 / l.size_m)),
    invLum: uniformArray(L.map((l) => 0.5 / Math.max(0.02, lumOf(l)))),
    idx: Object.fromEntries(L.map((l) => [l.cover, l.layer])),
    // per-cover tone over the scan (set on screen against Brussels: the sunlit beech litter read orange, 2026-11-13)
    tone: uniformArray(L.map((l) => new THREE.Vector3(...(TONE[l.cover] || [1, 1, 1]))), "vec3"),
    // live tuning (viewer.groundLook()): ortho blend band (m), normal strength, macro tone, grass flavour shares
    uOrthoNear: uniform(220), uOrthoFar: uniform(480), uNormal: uniform(1.0), uMacro: uniform(1.0), uRough: uniform(0.5), uDry: uniform(0.3),
  };
}
export const groundLook = () => shared;

const TONE = { forest: [0.52, 0.6, 0.62], dry: [0.92, 0.95, 0.95], gravel: [0.92, 0.92, 0.92] };
const SQ3x2 = 2 * Math.sqrt(3);
const HEX = 1.3;                  // m: hex tile size of the anti-tiling grid (about one lawn repeat)
const placeholder = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
placeholder.needsUpdate = true;

function texturedGround(cover, bounds, contour) {
  const S = shared, I = S.idx;
  const P = positionWorld;
  const uOrigin = uniform(new THREE.Vector2(bounds.x0, bounds.z0));
  const uInvSize = uniform(new THREE.Vector2(1 / (bounds.x1 - bounds.x0), 1 / (bounds.z1 - bounds.z0)));
  const uOrtho = uniform(cover.ortho ? 1 : 0);
  const muv = vec2(P.x, P.z).sub(uOrigin).mul(uInvSize);
  const mk = texture(cover.tex, muv);
  const xz = vec2(P.x, P.z);
  const dist = length(cameraPosition.sub(P));

  // ---- cover weights (the procedural ground's mixing order: grass < wood < sand < path; steep -> soil; water last)
  const n1 = noise2D(xz.mul(0.025)), n2 = noise2D(xz.mul(0.09).add(17.3)), n3 = noise2D(xz.mul(0.31).add(5.1));
  const wood = mk.r, path = mk.g, sand = mk.b;
  const one = float(1);
  const grassW = one.sub(wood).mul(one.sub(sand)).mul(one.sub(path));
  const slope = smoothstep(float(0.9), float(0.72), normalWorld.y).mul(one.sub(path)).mul(one.sub(wood.mul(0.95)));
  // grass flavours: rough (darker, denser: unmown park corners, long verges) in ~40 m patches; dry / worn (thin grass
  // over soil) in ~10 m patches; a few bare worn spots
  const rough = smoothstep(0.45, 0.8, n1).mul(S.uRough.mul(2).min(1));
  const dry = smoothstep(0.6, 0.95, n2.mul(0.7).add(n3.mul(0.3))).mul(S.uDry.mul(2).min(1));
  const worn = smoothstep(0.8, 0.95, noise2D(xz.mul(0.07).add(3.3))).mul(smoothstep(0.55, 0.8, n3)).mul(0.5);
  const flat = one.sub(slope);
  // the mask's partial woodland (scrub 0.67, the railway's verges 0.88, the soft edge of a wood) is rough grass under
  // the litter: brambles and long grass at wood edges and on the cuttings, full litter only inside a real wood
  const litter = smoothstep(0.9, 0.99, wood);
  const woodW = wood.mul(one.sub(sand)).mul(one.sub(path)).mul(flat);
  const w = [];
  w[I.lawn] = grassW.mul(one.sub(rough)).mul(one.sub(dry)).mul(one.sub(worn)).mul(flat);
  w[I.rough] = grassW.mul(rough).mul(one.sub(dry)).mul(one.sub(worn)).mul(flat).add(woodW.mul(one.sub(litter)));
  w[I.dry] = grassW.mul(dry).mul(one.sub(worn)).mul(flat);
  w[I.forest] = woodW.mul(litter);
  w[I.sand] = sand.mul(one.sub(path)).mul(flat);
  w[I.gravel] = path;
  w[I.soil] = grassW.mul(worn).mul(flat).add(slope);
  // ---- the two strongest layers (the third's weight subtracted: no jump where the 2nd and 3rd swap)
  const N = w.length;
  let b1 = w[0], i1 = float(0);
  for (let j = 1; j < N; j++) { i1 = select(w[j].greaterThan(b1), float(j), i1); b1 = max(b1, w[j]); }
  i1 = i1.toVar(); b1 = b1.toVar();
  const not1 = w.map((x, j) => select(i1.equal(float(j)), float(-1), x));
  let b2 = not1[0], i2 = float(0);
  for (let j = 1; j < N; j++) { i2 = select(not1[j].greaterThan(b2), float(j), i2); b2 = max(b2, not1[j]); }
  i2 = i2.toVar(); b2 = b2.toVar();
  let b3 = float(0);
  for (let j = 0; j < N; j++) b3 = max(b3, select(i1.equal(float(j)).or(i2.equal(float(j))), float(0), w[j]));
  const kMix = b2.sub(b3).max(0).div(b1.sub(b3).add(b2.sub(b3)).max(1e-4)).toVar();
  const L1 = int(i1), L2 = int(i2);
  const inv1 = S.invSize.element(L1), inv2 = S.invSize.element(L2);
  const il1 = S.invLum.element(L1), il2 = S.invLum.element(L2);

  // ---- hex tiling (Mikkelsen 2022, as antitile.js): texture frame (x, -z), so the OpenGL normal's +y = north
  const st = vec2(P.x, P.z.negate());
  const dx = st.dFdx(), dy = st.dFdy();
  const g = st.mul(SQ3x2 / HEX);
  const sk = vec2(g.x.sub(g.y.mul(0.57735027)), g.y.mul(1.15470054));
  const base = floor(sk), f = fract(sk);
  const tz = one.sub(f.x).sub(f.y);
  const s = max(float(0), tz.negate()).ceil().min(1);
  const s2 = s.mul(2).sub(1);
  const wt = [tz.negate().mul(s2), s.sub(f.y.mul(s2)), s.sub(f.x.mul(s2))];
  const verts = [base.add(vec2(s, s)), base.add(vec2(s, one.sub(s))), base.add(vec2(one.sub(s), s))];
  const lw = vec3(0.299, 0.587, 0.114);
  const taps = verts.map((v) => {
    const cen = vec2(v.x.add(v.y.mul(0.5)), v.y.mul(1 / 1.15470054)).mul(HEX / SQ3x2);
    const h = hash22(v), h2 = hash22(v.add(vec2(71, 113)));
    const a = h2.x.sub(0.5).mul(2 * Math.PI), cs = cos(a), sn = sin(a);
    const rot = (u) => vec2(u.x.mul(cs).sub(u.y.mul(sn)), u.x.mul(sn).add(u.y.mul(cs)));
    const pr = rot(st.sub(cen)).add(cen), gx = rot(dx), gy = rot(dy);
    const samp = (L, inv) => {
      const q = pr.mul(inv).add(h), ga = gx.mul(inv), gb = gy.mul(inv);
      return [texture(GT.albedo, q).depth(L).grad(ga, gb), texture(GT.nra, q).depth(L).grad(ga, gb)];
    };
    const [A1, R1] = samp(L1, inv1), [A2, R2] = samp(L2, inv2);
    // height blend of the two layers: the brighter (relative to its own mean) shows through first
    const hgt1 = dot(A1.rgb, lw).mul(il1), hgt2 = dot(A2.rgb, lw).mul(il2);
    const k = clamp(kMix.add(hgt2.sub(hgt1).mul(kMix.mul(one.sub(kMix)).mul(2.4))), 0, 1);
    const A = mix(A1, A2, k), R = mix(R1, R2, k);
    // the normal was sampled in the rotated frame: rotate x,y back
    const nx = R.r.mul(2).sub(1), ny = R.g.mul(2).sub(1);
    const n = vec2(nx.mul(cs).add(ny.mul(sn)), ny.mul(cs).sub(nx.mul(sn)));
    const t = h2.y.sub(0.5).mul(0.12).add(1);
    return { A, R, n, t };
  });
  const W = taps.map((tp, i) => mix(one, dot(tp.A.rgb, lw), 0.6).mul(pow(clamp(wt[i], 0, 1), float(7))));
  const sum = W[0].add(W[1]).add(W[2]).max(1e-6);
  const kk = W.map((x) => x.div(sum));
  const blend = (fn) => fn(taps[0]).mul(kk[0]).add(fn(taps[1]).mul(kk[1])).add(fn(taps[2]).mul(kk[2]));
  let col = blend((tp) => tp.A.rgb.mul(tp.t)).mul(mix(S.tone.element(L1), S.tone.element(L2), kMix));
  const nrm = blend((tp) => tp.n);
  const ra = blend((tp) => vec2(tp.R.b, tp.R.a));

  // ---- macro tone (what the mips can't carry: garden-scale variation, read from a car and from the air)
  const m1 = noise2D(xz.mul(0.12).add(9.1)), m2 = noise2D(xz.mul(0.023).add(41.7));
  const macro = m1.sub(0.5).mul(0.16).add(m2.sub(0.5).mul(0.22)).mul(S.uMacro);
  col = col.mul(macro.add(1));
  col = mix(col, color(0x1c2a2c), mk.a);                    // water (the ponds' own surface draws over it)

  // ---- far: the tile's orthophoto (the far-LOD tiles' colour), no relief
  const orthoTex = texture(cover.ortho || placeholder, vec2(muv.x, one.sub(muv.y)));
  const far = smoothstep(S.uOrthoNear, S.uOrthoFar, dist).mul(uOrtho).mul(one.sub(mk.a));
  col = mix(col, orthoTex.rgb, far);
  col = contour ? contour(col) : col;

  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  m.colorNode = col;
  // scan roughness maps are photo-derived, not physical for grass (Grass004 reads 0.26): kept as variation over a matte floor
  const rgh = mix(ra.x.mul(0.35).add(0.62), float(0.95), far);
  m.roughnessNode = mix(rgh, float(0.08), mk.a);
  m.metalnessNode = mk.a.mul(0.5);
  m.aoNode = mix(ra.y, one, far);
  const toView = (v) => cameraViewMatrix.mul(vec4(v, 0)).xyz;
  const nAmt = S.uNormal.mul(one.sub(far)).mul(one.sub(mk.a));
  m.normalNode = normalize(normalView.add(toView(vec3(nrm.x, 0, nrm.y.negate()).mul(nAmt))));
  if (houseCut.enabled) m.maskNode = cutOpacity(float(1), -0.08).greaterThan(0.5);
  m.name = "ground:textured";
  m.userData.orthoOn = uOrtho;
  return addLampLight(m);
}
