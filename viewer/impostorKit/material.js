// impostorKit / material.js: the impostor's two materials (depth pre-pass + lit colour pass), TSL, built from an
// ImpostorAtlas (bake.js) and per-type options. One shader for every instance of the type.
//
// VERTEX (per instance, all values constant over the card):
//  - the card: 8 corners of the variant's cut-out octagon (bakeWorker fitOctagon) or a quad, facing the camera
//    from the bounding sphere's centre; collapsed (zero area) outside the type's distance range or a hidden band;
//  - the 3 views: the octahedral triangle of the direction centre -> camera, with barycentric weights (octa.js);
//  - per view, the virtual-plane ray hit (Brucks) as a HOMOGENEOUS pair: numerator (Ar, Au), slope numerator
//    (Br, Bu), shared denominator D = ray . n, all affine in the vertex position, so the rasteriser interpolates
//    them exactly and the fragment divides (Arycama, "Imposters"): uv = A / D, d(uv)/d(depth) = B / D;
//  - the mip level from the instance's distance (texels per pixel, analytic: no fwidth noise, one level per
//    instance, continuous with distance), clamped to the per-cell chain.
// FRAGMENT:
//  - per view: one depth tap at the plane hit, a single-step parallax along that view's ray (Godot plugin /
//    Unreal "single sample parallax"), then albedo + aux at the corrected uv (9 taps for 3 views);
//  - ONE coherent alpha: the weighted sum of the 3 views' coverage (no union, no mip boost); colour, normal, depth
//    weighted by weight x coverage (no dark rim);
//  - the edge: alpha-to-coverage on that alpha with a FIXED-gain ramp around 0.5 by default ("a2c-ramp": the mip
//    level already puts ~1 texel on a pixel, so the alpha's own gradient is ~1 per pixel; a constant gain is
//    stable where Golus' fwidth ramp ("a2c-sharp") is noisy inside 2x2 quads); "cutout" = plain alpha test;
//  - depth out (pixel depth offset): the blended baked depth, along the pixel's ray, projected;
//  - hand-over: object-anchored dither (fade.js) complementary with the mesh LOD; far end: the shading fades into
//    the ground under the tree (no pixels dropped), instances culled past `end`;
//  - lighting: the type's own (`shade`), from albedo, world normal, the aux scalar.
import * as THREE from "three/webgpu";
import {
  Fn, Discard, attribute, uniform, uniformArray, texture, vec2, vec3, vec4, float, int, floor, clamp, abs, normalize,
  cross, dot, max, step, smoothstep, saturate, sqrt, select, log2, pow, mod, cameraPosition, positionWorld,
  cameraProjectionMatrix, cameraViewMatrix, vertexStage, fwidth,
} from "three/tsl";
import { lodEye, ditherNoise } from "../lodFade.js";
import { triangleTSL, decodeTSL, basisTSL } from "./octa.js";
import { octDecode } from "./bake.js";
import { fadeNoise, impostorKeep, farT, anchorOf, footSeed } from "./fade.js";

/** Per field / per camera uniforms (field.update sets them). */
export function makeView({ lodBias = -1, gain = 1 } = {}) {
  // lodBias -1 (measured, docs/IMPOSTOR_KIT.md): the crowns' leafy breakup as crisp as the mesh LODs' (mean
  // |Laplacian| over the crowns 308 vs 319 on the row of 50, 320 vs 314 over the forest; 230 at bias 0) at about half
  // the mesh's jitter. gain 1 (coverage = alpha around the cut): the crowns as bright as the mesh's against the sky
  // (94.3 vs 93.7 mean; gain 4 was 8 % darker: the mesh's far leaves let the sky through), jitter unchanged.
  // farBias (fixes1, the owner's "grainy far forest" from the orbit view at 1-2 km): -1 keeps the crowns' breakup crisp
  // at the hand-over (400 m) but past ~700 m, where a crown is a few pixels, it reads as per-pixel grain (light / dark
  // leaf texels, a2c coverage); the bias ramps by +farBias from farFrom to farTo m (eye distance). City orbit view, 1.2
  // km band, jitter meter (labs/cityJitter.js) strafe: blinking 1.17 % -> 0.59 %, d2 24.0 -> 19.6 with +1.
  return { p11: uniform(1.9), viewH: uniform(800), lodBias: uniform(lodBias), farBias: uniform(1), farFrom: uniform(700), farTo: uniform(1100),
    hideMask: uniform(0), gain: uniform(gain), cutoff: uniform(0.5),
    /** near ring (PDO, parallax) < ringSplit <= far ring (no depth out: early-z kept) */ ringSplit: uniform(600) };
}

/**
 * @param {object} atlas  bakeAtlas() result
 * @param {object} o
 *   fade      makeFade() (shared with the mesh LOD's hand-over mask)
 *   view      makeView()
 *   shade     ({ m, albedo, nW, aux, far, inst }) => void : the type's lighting (sets colorNode / normalNode / ...)
 *   blend     "bary3" | "dominant"
 *   parallax  0 | 1 | 2 (steps)
 *   pdo       write the reconstructed depth (pixel depth offset)
 *   alpha     "a2c-ramp" | "a2c-sharp" | "cutout"
 *   card      "octagon" | "quad"
 *   nearFade  hand over from a mesh LOD over [start - band, start] (false: drawn from 0 m)
 *   far       "ground" | "none"
 *   colourDepth "equal" | "lequal"  (the colour pass's depth test against the pre-pass)
 *   ring      "all" | "near" | "far": draw only the instances nearer / farther than view.ringSplit (field.js:
 *             a near-ring material with depth out + parallax and a cheap far-ring one, research 3.2.9)
 *   solo      (the city) instances whose ikData.w (band) is >= 32 have no mesh to hand over from (a far-LOD tile
 *             whose full tile is not loaded): drawn from 0 m, no hand-over dither
 *   appear    (the city) { now: uniform (s), seconds }: ikTint.x holds the instance's appear time (s; types whose
 *             shade ignores inst.tint); a streamed-in instance dithers in over `seconds` (lodFade.js's screen IGN)
 */
export function impostorMaterials(atlas, o) {
  const F = o.fade, V = o.view;
  const N = atlas.grid, C = atlas.cell, G = atlas.gutter, IN = atlas.inner, W = atlas.size;
  const full = atlas.full, parallax = o.parallax ?? 1, pdo = o.pdo !== false, blend = o.blend ?? "bary3";
  const alphaMode = o.alpha ?? "a2c-ramp", nearFade = o.nearFade !== false;

  // ---------------------------------------------------------------------------------------- per instance (vertex)
  const ipos = attribute("ikPos", "vec3"), idata = attribute("ikData", "vec4"), icorner = attribute("ikCorner", "vec3");
  const yaw = idata.x, scl = idata.y, variant = idata.z, band = idata.w;
  const sph = uniformArray(atlas.spheres, "vec4").element(int(variant));
  const cy = yaw.cos(), sy = yaw.sin();
  const turn = (p) => vec3(cy.mul(p.x).add(sy.mul(p.z)), p.y, cy.mul(p.z).sub(sy.mul(p.x)));     // object -> world (makeRotationY)
  const unturn = (p) => vec3(cy.mul(p.x).sub(sy.mul(p.z)), p.y, sy.mul(p.x).add(cy.mul(p.z)));   // world -> object
  const centreW = ipos.add(turn(sph.xyz).mul(scl));
  const Rw = sph.w.mul(scl);
  const dEye = centreW.sub(lodEye).length();
  const solo = o.solo ? band.greaterThanEqual(31.5) : null;
  let lo = nearFade ? F.start.sub(F.band) : float(-1);
  if (solo && nearFade) lo = select(solo, float(-1), lo);
  const hidden = o.solo ? mod(floor(V.hideMask.div(pow(2, band.min(30)))), 2).greaterThan(0.5).and(solo.not()) : mod(floor(V.hideMask.div(pow(2, band))), 2).greaterThan(0.5);
  let visible = dEye.greaterThanEqual(lo).and(dEye.lessThanEqual(F.end)).and(hidden.not());
  // rings: the same instances drawn by two materials, split at V.ringSplit (an instance is in exactly one)
  if (o.ring === "near") visible = visible.and(dEye.lessThan(V.ringSplit));
  else if (o.ring === "far") visible = visible.and(dEye.greaterThanEqual(V.ringSplit));
  const toCam = normalize(cameraPosition.sub(centreW));
  const poleT = smoothstep(0.9, 1.0, abs(toCam.y));
  const right = normalize(cross(vec3(0, float(1).sub(poleT), poleT), toCam));
  const up = cross(toCam, right);
  let corner;
  if (o.card === "quad") corner = icorner.xy;
  else {
    const flat = [];
    for (const h of atlas.hulls) for (const [x, y] of h.length === 8 ? h : [...h, ...h]) flat.push(new THREE.Vector2(x, y));
    corner = uniformArray(flat, "vec2").element(int(variant).mul(8).add(int(icorner.z)));
  }
  const P = centreW.add(right.mul(corner.x).add(up.mul(corner.y)).mul(Rw));
  const positionNode = select(visible, P, centreW);

  // the views, in object space (unscaled, relative to the sphere centre)
  const camO = unturn(cameraPosition.sub(centreW)).div(scl);
  const pO = unturn(P.sub(centreW)).div(scl);
  const ray = pO.sub(camO);
  const dO = normalize(camO);
  const tri = triangleTSL(vec3(dO.x, full ? dO.y : max(dO.y, 0), dO.z), N, full);
  let cells = tri.c, weights = tri.w;
  if (blend === "dominant") {
    const w = tri.w, i0 = w.x.greaterThanEqual(w.y).and(w.x.greaterThanEqual(w.z)), i1 = w.y.greaterThanEqual(w.z);
    cells = [select(i0, tri.c[0], select(i1, tri.c[1], tri.c[2]))];
    weights = vec3(1, 0, 0);
  }
  const NF = cells.length;
  const frameVary = cells.map((c) => {
    const n = decodeTSL(c, N, full), { r, u } = basisTSL(n);
    const D = dot(ray, n), cn = dot(camO, n);
    return { AB: vertexStage(vec4(dot(camO, r).mul(D).sub(dot(ray, r).mul(cn)), dot(camO, u).mul(D).sub(dot(ray, u).mul(cn)), dot(ray, r), dot(ray, u))), D };
  });
  const vD = vertexStage(vec3(frameVary[0].D, frameVary[1]?.D ?? float(1), frameVary[2]?.D ?? float(1)));
  const vW = vertexStage(weights);
  const vC01 = vertexStage(vec4(cells[0], cells[1] ?? vec2(0)));
  // texels per pixel at this distance -> the mip level
  const lod = clamp(log2(max(float(IN).mul(dEye).div(Rw.mul(V.p11).mul(V.viewH)), 1e-4)).add(V.lodBias).add(V.farBias.mul(smoothstep(V.farFrom, V.farTo, dEye))), 0, atlas.maxLevel);
  const vC2 = vertexStage(vec4(cells[2] ?? vec2(0), variant.add(0.5), sph.w));
  const vMisc = vertexStage(vec4(lod, dEye, scl, 0));
  const vCentre = vertexStage(centreW);
  const seed = footSeed(ipos);
  const tintV = vertexStage(attribute("ikTint", "vec3"));
  const anchor = anchorOf(F, ipos, scl);

  // ---------------------------------------------------------------------------------------- fragment
  const layer = int(floor(vC2.z)), R = vC2.w, lodF = vMisc.x;
  const cellF = [floor(vC01.xy.add(0.5)), floor(vC01.zw.add(0.5)), floor(vC2.xy.add(0.5))];
  const texA = texture(atlas.texA), texB = texture(atlas.texB);
  const at = (cell, uvT) => {
    const q = clamp(uvT.div(R.mul(2)).add(0.5), 0, 1);
    return vec2(cell.x.mul(C).add(G).add(q.x.mul(IN)), cell.y.mul(C).add(G).add(float(1).sub(q.y).mul(IN))).div(W);
  };
  // (atlas.auxHalf: the aux array starts at the colour's mip 1: the same uv, one level down)
  const lodB = atlas.auxHalf ? max(lodF.sub(1), 0) : lodF;
  const tap = (t, uvA) => t.sample(uvA).depth(layer).level(t === texB ? lodB : lodF);
  const D3 = [vD.x, vD.y, vD.z];
  const frames = [];
  for (let i = 0; i < NF; i++) {
    const AB = frameVary[i].AB, D = D3[i];
    const uv0 = AB.xy.div(D), slope = AB.zw.div(D);
    let uvP = uv0, b = null;
    for (let k = 0; k < parallax; k++) {
      const bk = tap(texB, at(cellF[i], uvP));
      uvP = uv0.add(slope.mul(bk.z.mul(2).sub(1).mul(R)));
    }
    const atP = at(cellF[i], uvP);
    const a = tap(texA, atP);
    b = tap(texB, atP);
    const q = uvP.div(R.mul(2)).add(0.5);
    const inside = step(0, q.x).mul(step(q.x, 1)).mul(step(0, q.y)).mul(step(q.y, 1));
    frames.push({ a, b, al: a.a.mul(inside) });
  }
  const Wt = [vW.x, vW.y, vW.z];
  let alpha = float(0), col = vec3(0), aux = vec4(0);
  for (let i = 0; i < NF; i++) {
    const k = Wt[i].mul(frames[i].al);
    alpha = alpha.add(k); col = col.add(frames[i].a.rgb.mul(k)); aux = aux.add(frames[i].b.mul(k));
  }
  const inv = float(1).div(max(alpha, 1e-4));
  const albedo = col.mul(inv), auxN = aux.mul(inv);
  // normal: the bake's view-space normal (octahedral-encoded, back-facing kept) in the card's frame (the 3 views
  // are within one grid step, ~6 degrees at 16 x 16, of the card's)
  const toCamF = normalize(cameraPosition.sub(vCentre));
  const pT = smoothstep(0.9, 1.0, abs(toCamF.y));
  const rightF = normalize(cross(vec3(0, float(1).sub(pT), pT), toCamF)), upF = cross(toCamF, rightF);
  const nV = octDecode(auxN.xy.mul(2).sub(1));
  const nW = normalize(rightF.mul(nV.x).add(upF.mul(nV.y)).add(toCamF.mul(nV.z)));
  // reconstructed surface point (world): the pixel's ray at the blended depth from the card's plane
  const hW = auxN.z.mul(2).sub(1).mul(R).mul(vMisc.z);
  const rayW = positionWorld.sub(cameraPosition);
  const dist0 = dot(cameraPosition.sub(vCentre), toCamF);
  const Xw = cameraPosition.add(rayW.mul(hW.sub(dist0).div(min1(dot(rayW, toCamF)))));
  const clip = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(Xw, 1)));
  const depthNode = pdo ? clip.z.div(clip.w) : null;

  // coverage
  let coverage;
  if (alphaMode === "a2c-sharp") coverage = saturate(alpha.sub(V.cutoff).div(max(fwidth(alpha), 1e-4)).add(0.5));
  else coverage = saturate(alpha.sub(V.cutoff).mul(V.gain).add(0.5));
  const opacity = alphaMode === "cutout" ? alpha : Fn(() => { Discard(coverage.lessThanEqual(0)); return coverage; })();

  // fades
  let keepNear = nearFade ? impostorKeep(F, vMisc.y, fadeNoise(F, anchor, seed)) : null;
  if (keepNear && solo) keepNear = vertexStage(select(solo, float(1), float(0))).greaterThan(0.5).or(keepNear);
  if (o.appear) {
    const t = saturate(o.appear.now.sub(tintV.x).div(o.appear.seconds));
    const keepIn = ditherNoise().lessThan(t.mul(t).mul(float(3).sub(t.mul(2))));
    keepNear = keepNear ? keepNear.and(keepIn) : keepIn;
  }
  const farK = o.far === "none" ? float(0) : farT(F, vMisc.y);

  // ---------------------------------------------------------------------------------------- the two materials
  const colour = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0, side: THREE.FrontSide });
  colour.positionNode = positionNode;
  o.shade({ m: colour, albedo, nW, aux: auxN.w, far: farK, inst: { cy, sy, scl, seed, tint: tintV }, alpha });
  if (depthNode) colour.depthNode = depthNode;
  colour.receivedShadowPositionNode = pdo ? Xw : positionWorld;
  colour.depthWrite = false;
  colour.depthFunc = o.colourDepth === "lequal" ? THREE.LessEqualDepth : THREE.EqualDepth;
  colour.name = `${o.name ?? "impostor"}:colour`;

  const depth = new THREE.MeshBasicNodeMaterial({ side: THREE.FrontSide });
  depth.positionNode = positionNode;
  if (depthNode) depth.depthNode = depthNode;
  depth.opacityNode = opacity;
  if (alphaMode === "cutout") { depth.alphaTest = 0.5; depth.alphaToCoverage = false; }
  else { depth.alphaTest = 0; depth.alphaToCoverage = true; }
  if (keepNear) depth.maskNode = keepNear;
  depth.colorWrite = false;
  depth.name = `${o.name ?? "impostor"}:depth`;
  for (const m of [colour, depth]) { m.userData.shared = true; m.userData.objectFade = true; }
  return { colour, depth, nodes: { alpha, albedo, nW, auxN, Xw, lod } };
}

const min1 = (x) => x.min(-1e-6);
