// STYLIZED TREES — broadleaf trees in the "cauliflower" style of stylized Unreal scenes, as a lab
// prototype (it draws its own instanced meshes; nothing in the engine's tree stack is touched).
//
// Why the arborist trees look flat next to that style: their whole canopy is ONE sphere of leaf
// cards shaded with ONE sphere normal, so the crown reads as a single soft ball with no light and
// dark side of its own. Their LEAF is right (the branch mask on big camera-facing cards gives the
// soft, full silhouette) and is kept. What changes is the crown, 9-12 CLUMPS:
//  - each card's shading normal is its clump's sphere normal (blended a little toward the
//    crown's), curving across the card, so each clump is a lit dome with a dark underside;
//  - a baked occlusion per card: deep inside a clump, low in the crown, under another clump;
//  - the scene's sun shadows land on the cards, so clumps shadow the clumps below them (the
//    cards face the LIGHT in the shadow pass, so the shadows do not move as the camera orbits);
//  - light through the leaves toward the sun (thin outer leaves glow, the core stays dark);
//  - per-tree tint.
// Three LODs (fewer, larger cards with distance; the far one casts no shadow), picked per tree by
// distance when the camera moves.
//
// Use: const trees = createStylizedTrees({ scene, trees: [[x, z, y, rotY, scale], ...] });
//      per frame: trees.update(camera, { sunDir, sunColor })

import * as THREE from "three/webgpu";
import {
  Fn, attribute, uniform, texture, vec2, vec3, float, mix, pow, saturate, dot, normalize, smoothstep,
  positionWorld, cameraPosition, instanceIndex, hash, transformNormalToView,
  positionLocal, positionGeometry, cameraViewMatrix, cross, select,
  time, sin, cos, fract, vertexStage, max,
} from "three/tsl";
import { applyAlphaCutout } from "./alphaCutout.js";   // [uccle-city CHANGES.md #1]

export const STYLIZED_TREE_DEFAULTS = {
  topColor: "#7cc63c",
  bottomColor: "#1f5418",
  /** how much the baked occlusion darkens the albedo (not only the ambient) */
  aoColor: 0.5,
  /** metres the sun-shadow lookup moves toward the sun: ~ a clump's radius (see the material) */
  shadowLift: 1.4,
  /** light through the leaves when looking toward the sun */
  translucency: 0.35,
  translucencyColor: "#b8e05a",
  /** per-tree brightness spread */
  tintVar: 0.18,
  /** metres the crown (and the branches) sit higher than built: a longer bare trunk */
  crownLift: 1.5,
  /** 1 = every card faces the camera (soft, full crown from any side; the leaves turn as you
   *  orbit), 0 = cards fixed on their clump like real foliage (still, but edge-on at grazing
   *  angles); between = a blend */
  faceCamera: 1,
  /** smooth leaf edges with MSAA (see render/materials/alphaCutout.js); pass renderer.samples > 1 */
  alphaToCoverage: true,
  lodDist: 150,
  /** past this the trees are the far LOD and cast no shadow (the sun's cascades end near here) */
  farDist: 450,
  maxDist: 1600,
  /** FILL (a game's choice; 0 = off, the fog lab's look): a share of the leaf's own colour, tinted, added as light —
   *  the shaded side stays a soft mid green instead of going black (the flat Genshin foliage light) */
  fill: 0,
  fillColor: "#7fb7a0",
  /** WIND (0 = still, the fog lab's): the crown sways, more toward its top, each card a little out of phase */
  windAmp: 0,
  windSpeed: 1.1,
  /** the bark (linear RGB) */
  trunkColor: [0.16, 0.1, 0.06],
  /** [uccle-city CHANGES.md #12] per-leaf tone from the leaf mask's .g (0.5 = neutral): albedo x (1 + (g - 0.5) x 2 x leafTone) */
  leafTone: 0,
  /** [uccle-city CHANGES.md #14] the wind's direction (x, z in the world; the slow sway leans along it) */
  windDir: [1, 0],
};

// ------------------------------------------------------------------ seeded random
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// ------------------------------------------------------------------ leaf mask
// The arborist preset's own branch mask (tree110: Leaf-Billboard-Texture-1, the shape is in .r).
const LEAF_MASK_URL = "/textures/leaves/Leaf-Billboard-Texture-1.png";
function loadLeafMask() {
  const tex = new THREE.TextureLoader().load(LEAF_MASK_URL);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

// ------------------------------------------------------------------ one tree's geometry
/**
 * The default crown: one clump on top, a ring round the crown, one filling the core; a trunk and a thin branch to
 * each ring clump. A game passes its own `shape(r, lod)` (params.shape) returning the same
 * { crown, rad, clumps (the last = the core), limbs?: [[from, to, r0, r1]...] } — limbs replace the default trunk;
 * optional: cards [near, mid, far] per clump, cardScale, trunk(lod) → its own bark BufferGeometry.
 */
export function roundCrown(r) {
  const crown = new THREE.Vector3(0, 5.2 + r() * 0.7, 0);
  const rad = new THREE.Vector3(3.1 + r() * 0.5, 2.9 + r() * 0.5, 3.1 + r() * 0.5);
  const clumps = [{ c: crown.clone().add(new THREE.Vector3(0, rad.y * 0.62, 0)), r: 1.9 + r() * 0.3 }];
  const ring = 8 + Math.floor(r() * 4);
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + r() * 0.5;
    const el = -0.25 + r() * 0.85;
    const d = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    clumps.push({ c: crown.clone().add(d.multiply(rad).multiplyScalar(0.68)), r: 1.45 + r() * 0.55 });
  }
  clumps.push({ c: crown.clone(), r: 2.3 });
  return { crown, rad, clumps, limbs: null };
}

function buildTree(seed, lod, shape = roundCrown) {
  const r = rng(seed);
  const { crown, rad, clumps, limbs, cards: cardsByLod, cardScale = 1, trunk: trunkOf, cardCorners } = shape(r, lod, seed);   // [uccle-city CHANGES.md #13] + the seed (a species picks its form per variant)
  // [uccle-city CHANGES.md #6] a shape may give the card's outline (unit corners, convex, fan-triangulated)
  const CORNERS = cardCorners ?? [[-1, -1], [1, -1], [1, 1], [-1, 1]];

  // Camera-facing cards (the arborist look: the branch mask on big billboards gives the soft,
  // full silhouette). Every vertex of a card sits at the card's CENTRE; the material pushes it
  // out to its corner along the camera's axes. `cardO` = that corner (metres, in-plane spin
  // baked in), `clumpInvR` lets the shading normal curve across the card over its clump.
  const pos = [], nrm = [], uvs = [], ao = [], hgt = [], corner = [], idx = [];
  const tmp = new THREE.Vector3();
  // near: many cards; mid: a few large ones; far: two per clump (no shadow at that range)
  // (a shape may ask for more, smaller cards: smaller leaves on screen)
  // [uccle-city CHANGES.md #8] NESTED LODs: every LOD draws from the SAME card set (LOD 0's, from the same
  // random stream whatever the LOD); LOD 1 keeps the first n1 cards of each clump, LOD 2 the first n2. A card's
  // `rank` (0 = in every LOD, 1 = LOD 0 and 1, 2 = LOD 0 only) lets the material shrink it to nothing before
  // the switch that drops it and grow the kept ones to the old LOD sizes (1.35x, 1.7x): at the switch both
  // LODs draw the same pixels, and the tree keeps its shape (Uccle docs/SMOOTH_LOD.md).
  const perLod = cardsByLod ?? [11, 4, 2];
  const sizeK = cardScale;
  const yLo = crown.y - rad.y, yHi = crown.y + rad.y * 1.25;

  for (let ci = 0; ci < clumps.length; ci++) {
    const { c, r: cr } = clumps[ci];
    const core = ci === clumps.length - 1;
    const cnt = (l) => (core ? Math.ceil(perLod[l] * 0.5) : perLod[l]);
    const n = cnt(0), n1 = cnt(1), n2 = cnt(2);
    const outward = c.clone().sub(crown).normalize();
    for (let k = 0; k < n; k++) {
      const rank = k < n2 ? 0 : k < n1 ? 1 : 2;
      // a point in the clump, leaning out of the crown (the inside is never seen)
      tmp.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      if (!core) tmp.addScaledVector(outward, 0.6).normalize();
      const p = c.clone().addScaledVector(tmp, cr * (0.3 + r() * 0.45));
      // shading normal at the centre: the clump's sphere, a little of the crown's ellipsoid
      const nc = p.clone().sub(c).normalize();
      const ne = p.clone().sub(crown).divide(rad).normalize();
      const nn = nc.multiplyScalar(0.7).addScaledVector(ne, 0.3).normalize();
      // occlusion: depth in the clump x height in the crown x clumps overhead
      const depth = Math.min(1, p.distanceTo(c) / cr);
      let a = (0.4 + 0.6 * smooth01((depth - 0.2) / 0.8)) * (0.5 + 0.5 * smooth01((p.y - yLo) / (yHi - yLo)));
      for (let j = 0; j < clumps.length - 1; j++) {
        if (j === ci) continue;
        const o = clumps[j];
        if (o.c.y > p.y + 0.4 && Math.hypot(o.c.x - p.x, o.c.z - p.z) < o.r) a *= 0.8;
      }
      if (core) a *= 0.6;
      a *= 0.92 + r() * 0.12; // a little value spread per card
      const s = cr * (0.8 + r() * 0.3) * sizeK; // half size
      const spin = r() * Math.PI * 2, cs = Math.cos(spin), sn = Math.sin(spin);
      if (rank > 2 - lod) continue;   // [#8] not in this LOD (its random draws were taken all the same)
      const base = pos.length / 3;
      for (const [ox, oy] of CORNERS) {
        pos.push(p.x, p.y, p.z);
        nrm.push(nn.x, nn.y, nn.z);
        corner.push(ox, oy);
        uvs.push(cs * s, sn * s, 1 / cr, rank); // spin x half size, clump radius, [#8] rank
        ao.push(a);
        hgt.push(Math.min(1, Math.max(0, (p.y - yLo) / (yHi - yLo))));
      }
      for (let q = 1; q < CORNERS.length - 1; q++) idx.push(base, base + q, base + q + 1);   // [#6] fan
    }
  }
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  leaves.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  // packed: WebGPU allows 8 vertex buffers and the instancing takes several of them (no uv: the
  // unit corner is the uv)
  const card = new Float32Array(ao.length * 4);
  for (let i = 0; i < ao.length; i++) card.set([corner[i * 2], corner[i * 2 + 1], ao[i], hgt[i]], i * 4);
  leaves.setAttribute("card", new THREE.Float32BufferAttribute(card, 4)); // (unit corner xy, occlusion, height in crown)
  leaves.setAttribute("cardSpin", new THREE.Float32BufferAttribute(uvs, 4)); // (cos, sin) x half size, 1 / clump radius, [#8] rank
  leaves.setIndex(idx);
  // the cards reach past their centres: a generous bound (frustum culling is off anyway)
  leaves.boundingSphere = new THREE.Sphere(crown.clone(), Math.max(rad.x, rad.y, rad.z) + 4);

  // trunk + a branch to each ring clump (thin tubes; the crown hides most of them)
  const segs = limbs ? limbs.filter((l, i) => lod === 0 || l[2] > (lod === 1 ? 0.09 : 0.16) || i === 0) : [];
  const trunkTop = crown.clone().add(new THREE.Vector3(0, -0.6, 0));
  if (!limbs) segs.push([new THREE.Vector3(0, -0.4, 0), trunkTop, 0.34, 0.2]);
  for (let ci = 1; ci < clumps.length - 1; ci++) {
    if (limbs) break;
    if (lod === 2 || (lod === 1 && ci % 2)) continue;
    const from = new THREE.Vector3(0, 2.6 + r() * 1.6, 0);
    const to = from.clone().lerp(clumps[ci].c, 0.75);
    segs.push([from, to, 0.13, 0.05]);
  }
  // (a shape may bring its own bark mesh: a curved, continuous trunk and limbs)
  const trunk = trunkOf ? trunkOf(lod) : tubeGeometry(segs, [7, 5, 4][lod]);
  return { leaves, trunk, height: yHi, radius: Math.max(rad.x, rad.z) + 2 };
}

function smooth01(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function tubeGeometry(segs, sides) {
  const pos = [], nrm = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), t = new THREE.Vector3(), b = new THREE.Vector3();
  for (const [a, c, r0, r1] of segs) {
    d.subVectors(c, a).normalize();
    t.crossVectors(Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up, d).normalize();
    b.crossVectors(d, t);
    const base = pos.length / 3;
    for (let ring = 0; ring < 2; ring++) {
      const center = ring ? c : a, rr = ring ? r1 : r0;
      for (let i = 0; i < sides; i++) {
        const ang = (i / sides) * Math.PI * 2;
        const n = t.clone().multiplyScalar(Math.cos(ang)).addScaledVector(b, Math.sin(ang));
        pos.push(center.x + n.x * rr, center.y + n.y * rr, center.z + n.z * rr);
        nrm.push(n.x, n.y, n.z);
      }
    }
    // counter-clockwise seen from OUTSIDE: the other order faced inward, so the near wall was
    // culled and the inside of the far wall drawn — the trunk looked hollow on one side
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      idx.push(base + i, base + j, base + sides + i, base + j, base + sides + j, base + sides + i);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------------ materials
/** [uccle-city CHANGES.md #7] per-tree brightness from treeXf (cos, sin of the turn, scale): stable per tree.
 *  Computed in the VERTEX stage: in the fragment stage the per-instance inputs arrive interpolated, and the
 *  hash (x 43758) turns their last-bit differences into a different value per pixel: stripes on the leaves. */
export function treeTint(xf, tintVar) {
  return vertexStage(fract(sin(xf.x.mul(127.1).add(xf.y.mul(311.7)).add(xf.z.mul(74.7))).mul(43758.5453))).sub(0.5).mul(tintVar).add(1);
}

/** [uccle-city CHANGES.md #8] The LOD morph of one tree: its distance to the VIEW camera (U.eye: the same in the
 *  shadow pass, whose cameraPosition is the light's) from its per-instance foot `treePos`, and the morph
 *  ramps t1 (0 -> 1 over [lodDist - morph1, lodDist]) and t2 (over [farDist - morph2, farDist]).
 *  U.lodScale = 0 turns the morph off (the impostor bake draws LOD 0 as built). */
export function lodMorph(U) {
  const d = attribute("treePos", "vec3").sub(U.eye).length().mul(U.lodScale);
  const ramp = (a, w) => saturate(d.sub(a.sub(w)).div(max(w, float(1e-3))));
  return { d, t1: ramp(U.lod1, U.morph1), t2: ramp(U.lod2, U.morph2) };
}

function makeLeafMaterial(P, U) {
  const leafTex = P.leafMask ?? loadLeafMask();   // [uccle-city CHANGES.md #2]
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
  const card = attribute("card", "vec4");
  const spin = attribute("cardSpin", "vec4");
  const unit = card.xy, aoA = card.z, hA = card.w, invR = spin.z;
  const tex = texture(leafTex, unit.mul(0.5).add(0.5));
  // [uccle-city CHANGES.md #8] the card's size along the LOD morph: kept cards grow toward the old LOD sizes,
  // cards the next LOD drops shrink to nothing before it (rank in cardSpin.w)
  const { t1, t2 } = lodMorph(U);
  const rank = spin.w;
  const grow = mix(float(1), float(1.35), t1).mul(mix(float(1), float(1.7 / 1.35), t2));
  const sizeF = grow.mul(select(rank.greaterThan(1.5), t1.oneMinus(), select(rank.greaterThan(0.5), t2.oneMinus(), float(1))));
  // the corner in the card's plane: the unit corner turned by the card's spin, x its half size
  const cardO = vec2(unit.x.mul(spin.x).sub(unit.y.mul(spin.y)), unit.x.mul(spin.y).add(unit.y.mul(spin.x))).mul(sizeF);
  const xf = attribute("treeXf", "vec3"); // per instance: cos, sin of the tree's Y turn, its scale
  // the card's corner along the VIEWING camera's axes (in the shadow pass: the light's), world
  // space and unscaled; the view matrix's rows are the camera's right and up
  const cornerWorld = Fn(() => {
    const V = cameraViewMatrix;
    const right = vec3(V.element(0).x, V.element(1).x, V.element(2).x);
    const up = vec3(V.element(0).y, V.element(1).y, V.element(2).y);
    return right.mul(cardO.x).add(up.mul(cardO.y));
  });
  // positionNode runs BEFORE the instance transform (in the tree's own space), which then turns
  // and scales it: turn the corner back by the tree's Y rotation so it ends up facing the camera
  // (the scale is wanted: a bigger tree, bigger cards)
  const toTree = (w) => vec3(xf.x.mul(w.x).sub(xf.y.mul(w.z)), w.y, xf.y.mul(w.x).add(xf.x.mul(w.z)));
  const toWorld = (l) => vec3(xf.x.mul(l.x).add(xf.y.mul(l.z)), l.y, xf.x.mul(l.z).sub(xf.y.mul(l.x)));
  // FIXED cards (faceCamera 0): the card lies across its shading normal (the clump's sphere,
  // pointing out), in the tree's own space — it turns with the tree, never with the camera
  const fixedCorner = Fn(() => {
    const n = normalize(attribute("normal", "vec3"));
    const axis = select(n.y.abs().greaterThan(0.9), vec3(1, 0, 0), vec3(0, 1, 0));
    const t = normalize(cross(axis, n));
    const b = cross(n, t);
    return t.mul(cardO.x).add(b.mul(cardO.y));
  });
  // the corner actually used, tree space: fixed, camera-facing, or a blend
  const cornerTree = mix(fixedCorner(), toTree(cornerWorld()), U.faceCamera);
  // the wind: a slow sway of the whole crown (per tree phase) + a quicker flutter per card, both growing toward
  // the top of the crown; in the tree's own space (the instance turns it)
  const sway = Fn(() => {
    const ph = hash(instanceIndex.add(5)).mul(6.283);
    const t = time.mul(U.windSpeed);
    // [uccle-city CHANGES.md #14] the slow sway leans along the wind (world x, z: since #5 the sway is added in the
    // world, after toWorld), with a smaller sideways swing
    const wd = vec3(U.windDir.x, 0, U.windDir.y);
    const big = wd.mul(sin(t.add(ph)).mul(0.5).add(0.6)).add(vec3(wd.z.negate(), 0, wd.x).mul(cos(t.mul(0.7).add(ph)).mul(0.35)));
    const cph = positionLocal.x.mul(0.9).add(positionLocal.z.mul(1.3)).add(positionLocal.y.mul(0.7));
    const small = vec3(sin(t.mul(3.1).add(cph)), sin(t.mul(2.3).add(cph.mul(1.7))).mul(0.5), cos(t.mul(2.7).add(cph)));
    return big.mul(0.7).add(small.mul(0.3)).mul(U.windAmp).mul(hA.mul(0.7).add(0.3));
  });
  // [uccle-city CHANGES.md #5] three r187 applies the instance transform BEFORE positionNode
  // (NodeMaterial.setupPosition: instancedMesh(object), then positionNode), so positionLocal is
  // already in the mesh's (world) space here: the tree-space corner is turned back to the world and
  // scaled by the tree, instead of being left for the instance matrix to turn (which turned it twice:
  // trees near ±90° showed their cards edge-on, as vertical streaks)
  m.positionNode = positionLocal.add(toWorld(cornerTree).add(vec3(0, U.crownLift, 0)).add(sway()).mul(xf.z));
  // one value per tree (instance), the same in the shadow pass and the colour pass
  // [uccle-city CHANGES.md #7] the tint from the tree's own turn and scale (treeXf), not instanceIndex:
  // the same tree keeps its tint in every LOD mesh and in Uccle's impostors
  const tint = treeTint(xf, U.tintVar);
  // [uccle-city CHANGES.md #12] the leaf's own tone (mask .g; a RedFormat mask reads 0 there: leafTone 0 = off)
  const tone = float(1).add(tex.g.sub(0.5).mul(2).mul(U.leafTone));
  const leafBase = Fn(() => {
    const base = mix(U.bottom, U.top, smoothstep(0.0, 1.0, hA));
    return base.mul(tint).mul(mix(float(1), aoA, U.aoColor)).mul(tone);
  });
  m.colorNode = leafBase();
  // the leaf shape: smooth edges with MSAA, the hard cut in the shadow map (without the shadow
  // mask each card cast its whole square: the crown's shadow was a hard-edged slab)
  applyAlphaCutout(m, tex.r, { threshold: 0.5, coverage: P.alphaToCoverage });
  // The cards face the camera here and the sun in the shadow pass, so a card's corners reach up to
  // its half size toward or away from the sun and it shadowed ITSELF in stripes. The shadow is
  // looked up at the card's CENTRE (a little toward the sun): one value per card, and clumps still
  // shadow each other card by card.
  // The lift toward the sun is about a clump's radius: a card is not shadowed by its own clump's
  // outer cards (the clump's lit side stays lit), only by OTHER clumps and trees.
  m.receivedShadowPositionNode = positionWorld.sub(toWorld(cornerTree).mul(xf.z)).add(U.sunDir.mul(U.shadowLift));
  m.aoNode = aoA;
  // the clump's sphere normal, curving across the card (the corner leans the normal out over the
  // clump); the same for both faces (DoubleSide would flip the back face's)
  // (from the raw attribute, in the tree's space, turned into the world here: normalNode is not
  // instanced for us)
  m.normalNode = Fn(() => {
    const nTree = normalize(attribute("normal", "vec3").add(cornerTree.mul(invR).mul(0.7)));
    return transformNormalToView(toWorld(nTree)).normalize();
  })();
  // light through the leaves: looking toward the sun, outer leaves glow, the core does not
  m.emissiveNode = Fn(() => {
    const V = normalize(positionWorld.sub(cameraPosition));
    const back = pow(saturate(dot(V, U.sunDir)), 4.0);
    const glow = U.transColor.mul(U.sunColor).mul(back).mul(aoA.mul(aoA)).mul(U.translucency);
    return glow.add(leafBase().mul(U.fillColor).mul(U.fill).mul(aoA.mul(0.5).add(0.5)));
  })();
  return m;
}

function makeTrunkMaterial(U, P) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  m.colorNode = vec3(...P.trunkColor);
  // crownLift: everything above the root ring rises with the crown — the trunk stretches, the
  // branches move up with their clumps
  // [uccle-city CHANGES.md #5] positionLocal is already instanced (world heights): test the raw vertex
  const lifted = positionLocal.add(vec3(0, select(positionGeometry.y.greaterThan(0), U.crownLift, float(0)), 0));
  // [uccle-city CHANGES.md #9] the sub-branches (level 2, which LOD 1 drops) shrink onto their axis over the
  // LOD 0 -> 1 band: (bark.xyz = the ring's centre in the tree's space, bark.w = the branch level)
  if (P.barkMorph) {
    const bark = attribute("bark", "vec4"), xf = attribute("treeXf", "vec3");
    const toWorld = (l) => vec3(xf.x.mul(l.x).add(xf.y.mul(l.z)), l.y, xf.x.mul(l.z).sub(xf.y.mul(l.x)));
    const axisW = attribute("treePos", "vec3").add(toWorld(bark.xyz).mul(xf.z));
    const k = select(bark.w.greaterThan(1.5), lodMorph(U).t1.oneMinus(), float(1));
    m.positionNode = mix(axisW, lifted, k);
  } else m.positionNode = lifted;
  return m;
}

// ------------------------------------------------------------------ the forest
export function createStylizedTrees({ scene, trees, variants = 3, params = {}, shared = null }) {
  const P = { ...STYLIZED_TREE_DEFAULTS, ...params };
  // [uccle-city CHANGES.md #3] `shared` (an object kept by the caller): the first call fills it with the
  // uniforms and materials, later calls (one per streamed tile) reuse them: one shader for every tile.
  if (shared?.U) return createWithShared();
  const U = {
    top: uniform(new THREE.Color(P.topColor)),
    bottom: uniform(new THREE.Color(P.bottomColor)),
    aoColor: uniform(P.aoColor),
    translucency: uniform(P.translucency),
    transColor: uniform(new THREE.Color(P.translucencyColor)),
    tintVar: uniform(P.tintVar),
    sunDir: uniform(new THREE.Vector3(0, 1, 0)),
    sunColor: uniform(new THREE.Vector3(1, 1, 1)),
    shadowLift: uniform(P.shadowLift),
    crownLift: uniform(P.crownLift),
    faceCamera: uniform(P.faceCamera),
    fill: uniform(P.fill),
    windAmp: uniform(P.windAmp),
    windSpeed: uniform(P.windSpeed),
    fillColor: uniform(new THREE.Color(P.fillColor)),
    // [uccle-city CHANGES.md #8] the LOD morph (lodMorph): the view camera, the switch distances and bands
    eye: P.lodEye ?? uniform(new THREE.Vector3()),
    lod1: uniform(P.lodDist), lod2: uniform(P.farDist),
    morph1: uniform(P.morph1 ?? 0), morph2: uniform(P.morph2 ?? 0),
    lodScale: uniform(1),
    leafTone: uniform(P.leafTone ?? 0),                              // [#12]
    windDir: uniform(new THREE.Vector2(...(P.windDir ?? [1, 0]))),   // [#14]
  };
  const leafMat = makeLeafMaterial(P, U);
  const trunkMat = makeTrunkMaterial(U, P);
  // [uccle-city CHANGES.md #10] the far LOD's own copies of both materials, cut by P.farMask(distance) (a
  // dithered fade-out / cross-fade toward the impostors): the nearer LODs keep shaders without a discard
  let leafFar = leafMat, trunkFar = trunkMat;
  if (P.farMask) {
    const { d } = lodMorph(U);
    leafFar = leafMat.clone(); leafFar.name = "stylized-leaves:far";
    leafFar.maskNode = P.farMask(d);
    leafFar.maskShadowNode = leafMat.maskShadowNode.and(leafFar.maskNode);
    trunkFar = trunkMat.clone(); trunkFar.name = "stylized-bark:far";
    trunkFar.maskNode = P.farMask(d);
  }
  if (shared) Object.assign(shared, { U, leafMat, trunkMat, leafFar, trunkFar, geoms: new Map() });
  return build(U, leafMat, trunkMat, leafFar, trunkFar);

  function createWithShared() {
    return build(shared.U, shared.leafMat, shared.trunkMat, shared.leafFar, shared.trunkFar);
  }

  function build(U, leafMat, trunkMat, leafFar = leafMat, trunkFar = trunkMat) {
  const group = new THREE.Group();
  group.name = "StylizedTrees";
  scene.add(group);

  // per variant x LOD: an instanced leaf mesh and an instanced trunk mesh
  const n = trees.length;
  // [uccle-city CHANGES.md #4] capacity >= 1025: below 1024 instances three r187 writes the count into
  // the WGSL (uniform-array path), so tiles with different tree counts compiled different shaders
  const cap = Math.max(n, 1025);
  const kinds = [];
  for (let v = 0; v < variants; v++) {
    for (let lod = 0; lod < 3; lod++) {
      // [uccle-city CHANGES.md #3] shared: one built tree per (variant, LOD) for all tiles; each tile
      // wraps it in its own BufferGeometry (same attribute buffers) for its own per-instance treeXf
      let g;
      if (shared) {
        const key = `${v}:${lod}`;
        if (!shared.geoms.has(key)) shared.geoms.set(key, buildTree((P.seed ?? 1000) + v * 97, lod, P.shape ?? roundCrown));
        const base = shared.geoms.get(key), wrap = (src) => {
          const w = new THREE.BufferGeometry();
          for (const a of Object.keys(src.attributes)) w.setAttribute(a, src.attributes[a]);
          w.setIndex(src.index);
          w.boundingSphere = src.boundingSphere;
          w.userData.shared = true;
          return w;
        };
        g = { leaves: wrap(base.leaves), trunk: wrap(base.trunk) };
      } else g = buildTree((P.seed ?? 1000) + v * 97, lod, P.shape ?? roundCrown);
      const mk = (geo, mat) => {
        const im = new THREE.InstancedMesh(geo, mat, cap);
        im.count = 0;
        im.castShadow = lod < 2;
        im.receiveShadow = true;
        im.frustumCulled = false;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        group.add(im);
        return im;
      };
      // the billboards undo the tree's turn on their corners (cos, sin, scale per instance)
      const xfAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      xfAttr.setUsage(THREE.DynamicDrawUsage);
      g.leaves.setAttribute("treeXf", xfAttr);
      // [uccle-city CHANGES.md #8] the tree's foot (the instance's translation) for the LOD morph, and both
      // per-instance attributes on the bark too (its morph; leaves and bark share the instance order)
      const posAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      g.leaves.setAttribute("treePos", posAttr);
      g.trunk.setAttribute("treeXf", xfAttr);
      g.trunk.setAttribute("treePos", posAttr);
      kinds.push({ v, lod, leaves: mk(g.leaves, lod === 2 ? leafFar : leafMat), trunk: mk(g.trunk, lod === 2 ? trunkFar : trunkMat), xfAttr, posAttr });
    }
  }
  // [uccle-city CHANGES.md #13] params.variantOf(i) may pick a tree's variant (default: the hash of its index)
  const variantOf = trees.map((_, i) => P.variantOf ? P.variantOf(i) : Math.floor(rng(i * 7919 + 13)() * variants));
  const mats = trees.map(([x, z, y, rot, s]) => {
    const m = new THREE.Matrix4().makeRotationY(rot);
    m.scale(new THREE.Vector3(s, s, s));
    m.setPosition(x, y - 0.25, z);
    return m;
  });

  const lastCam = new THREE.Vector3(Infinity, 0, 0);
  let lastKey = "";
  function relod(camPos) {
    for (const k of kinds) { k.leaves.count = 0; k.trunk.count = 0; }
    // [uccle-city CHANGES.md #8] with the morph, a tree changes mesh only once the material has finished the
    // morph toward the next LOD: `slack` covers the camera's move since this re-bucketing (5 m) and more; the
    // nearer LOD is drawn a little further than before, never the coarser one too near
    const slack = P.lodSlack ?? 0;
    const sq = (v) => v * v;
    const near2 = sq(P.lodDist + slack), far2 = sq(P.farDist + slack), max2 = sq(P.maxDist + slack);
    for (let i = 0; i < n; i++) {
      const [x, z, y] = trees[i];
      const dx = x - camPos.x, dy = y - camPos.y, dz = z - camPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > max2) continue;
      const k = kinds[variantOf[i] * 3 + (d2 < near2 ? 0 : d2 < far2 ? 1 : 2)];
      k.posAttr.array.set([x, y - 0.25, z], k.leaves.count * 3);
      k.xfAttr.array.set([Math.cos(trees[i][3]), Math.sin(trees[i][3]), trees[i][4]], k.leaves.count * 3);
      k.leaves.setMatrixAt(k.leaves.count++, mats[i]);
      k.trunk.setMatrixAt(k.trunk.count++, mats[i]);
    }
    // [uccle-city CHANGES.md #11] upload only the instances in use (the buffers hold >= 1025), and nothing for a
    // mesh that draws none: a re-bucket uploaded every buffer of every loaded tile whole (~30 MB in one frame,
    // 15-25 ms of writeBuffer, every 5 m of camera motion)
    for (const k of kinds) {
      const c = k.leaves.count;
      if (c === 0) continue;
      for (const [a, size] of [[k.leaves.instanceMatrix, 16], [k.trunk.instanceMatrix, 16], [k.xfAttr, 3], [k.posAttr, 3]]) {
        a.clearUpdateRanges(); a.addUpdateRange(0, c * size); a.needsUpdate = true;
      }
    }
  }

  function update(camera, light = {}) {
    if (light.sunDir) U.sunDir.value.copy(light.sunDir);
    if (light.sunColor) U.sunColor.value.set(light.sunColor[0], light.sunColor[1], light.sunColor[2]);
    U.top.value.set(P.topColor);
    U.bottom.value.set(P.bottomColor);
    U.transColor.value.set(P.translucencyColor);
    U.aoColor.value = P.aoColor;
    U.translucency.value = P.translucency;
    U.tintVar.value = P.tintVar;
    U.shadowLift.value = P.shadowLift;
    U.crownLift.value = P.crownLift;
    U.faceCamera.value = P.faceCamera;
    U.fill.value = P.fill;
    U.windAmp.value = P.windAmp;
    U.windSpeed.value = P.windSpeed;
    U.leafTone.value = P.leafTone ?? 0;                                // [#12]
    if (P.windDir) U.windDir.value.set(P.windDir[0], P.windDir[1]);   // [#14]
    U.fillColor.value.set(P.fillColor);
    U.lod1.value = P.lodDist; U.lod2.value = P.farDist;               // [#8]
    U.morph1.value = P.morph1 ?? 0; U.morph2.value = P.morph2 ?? 0;
    if (!P.lodEye) U.eye.value.copy(camera.position);
    // LOD re-bucketing only when the camera has moved a few metres (or the distances changed)
    const key = `${P.lodDist},${P.farDist},${P.maxDist},${P.lodSlack}`;
    if (camera.position.distanceToSquared(lastCam) > 25 || key !== lastKey) {
      lastCam.copy(camera.position);
      lastKey = key;
      relod(camera.position);
    }
  }

  return {
    params: P,
    group,
    /** the placements drawn, [x, z, y, rotY, scale] */
    placements: trees,
    update,
    setVisible(v) { group.visible = !!v; },
    stats() {
      let tris = 0;
      for (const k of kinds) {
        tris += k.leaves.count * k.leaves.geometry.index.count / 3 + k.trunk.count * k.trunk.geometry.index.count / 3;
      }
      return { trees: n, tris: Math.round(tris) };
    },
    dispose() {
      // [uccle-city CHANGES.md #3] shared materials and built trees stay for the other tiles; the
      // per-tile wrappers are NOT disposed: three r187 frees every attribute a disposed geometry
      // references, the shared ones too (the other tiles' trees would lose their buffers). Their own
      // treeXf (12 KB per mesh) is left to the garbage collector.
      if (!shared) {
        for (const k of kinds) { k.leaves.geometry.dispose(); k.trunk.geometry.dispose(); }
        leafMat.dispose(); trunkMat.dispose();
      }
      scene.remove(group);
    },
  };
  }
}
