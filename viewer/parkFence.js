// PARK FENCES AND GATES (claude/parkfence; docs/PARKFENCE.md, rule park-fence): the Parc de Wolvendael and the Parc de
// la Sauvagère, all round, with their gates (?parkfence=0: none, as before).
//
//   the line    data/parkfence/parkfence.json (tools/parkfence/build.mjs: the OSM park polygons, their gates and every
//               path through them, what Street View shows per stretch, kept off the carriageway and the buildings);
//               placed per tile on the drawn ground (viewer/parkFenceLayout.js: sheared panels, split where the ground
//               leaves their chord, piers on the low side, skirts into the ground);
//   the kit     models/parkfence/parkfence.glb (tools/blender/parkFenceKit.py): the ironwork (spear railing, bar fence,
//               welded mesh, posts, the double and the pedestrian gate leaves) ONE modelled level, the stone (piers,
//               plinths) three; named slots, AO baked per vertex;
//   draws       one InstancedMesh per piece and stage, every instance of the city in it: the ironwork's modelled level
//               (colour to NEAR + BAND m, dithered out; its sun shadow to SHADOW_END m) + its COVERAGE CARD (one quad, the
//               LOD0 rasterised into an atlas with box mips, viewer/thinBars.js ironCards, rule 35: far bars and the mesh
//               become their true coverage, nothing to shimmer or moiré) blended from CARD_IN to the end; the stone's
//               three levels in dithered distance bands (lodFade.js: no pop, the shadow follows). ~16 draws for both
//               parks, whatever the length; the instances re-bucketed on the CPU when the eye moves > 1 m;
//   colliders   one invisible box soup per park and tile, a hero root (viewer/heroColliders.js: the car's blocks and the
//               walker's triangles from it, only while shown): the fence, the piers, the leaves as drawn; the open
//               entrances stay open;
//   night       nothing glows, no light (fixed light count).
import * as THREE from "three/webgpu";
import { attribute, vec3, float, mix, smoothstep, length, positionWorld, select, fract, floor, sin, dot, texture, uv, uniformArray, cameraPosition, normalWorld, normalize, abs, pow } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { lodEye, keepBand, ditherNoise, rampTo, SMOOTH } from "./lodFade.js";
import { ironCards, NEAR, BAND, CARD_IN, CARD_DEPTH_CUT } from "./thinBars.js";
import { atlasTexture } from "./thinCards.js";
import { tileItems, boxSoup, docTiles, IRON, STONE, PIECES, entranceZones, inZone, treesOutOfEntrances } from "./parkFenceLayout.js";
import { wxMat } from "./weather/cityWeatherize.js";

const qs = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
/** ?parkfence=0: no park fences (as before) */
export const PARKFENCE = qs.get("parkfence") !== "0";
/** the stone's LOD bands (m: switch 0 -> 1, switch 1 -> 2, end), the ironwork's card end, its shadow's end */
export const STONE_BANDS = [30, 90, 420];
export const CARD_END = 240, SHADOW_END = 25;
/** the card's grazing floor (cos of the view angle): at most 1 / GRAZE_MIN x the coverage's optical depth */
export const GRAZE_MIN = 0.2;
const SLOT = { iron_paint: 0, iron_tip: 1, steel_dark: 2, stone: 3, stone_cap: 4 };
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
// paints (linear rgb, roughness): black wrought iron, the parks' dark green
const PAINTS = [[...lin(0.035, 0.036, 0.038).toArray(), 0.5], [...lin(0.085, 0.2, 0.12).toArray(), 0.55]];
// stones: Wolvendael's pale dressed limestone / sandstone, the Sauvagère's grey rubble
const STONES = [[...lin(0.66, 0.64, 0.58).toArray(), 0.85], [...lin(0.57, 0.55, 0.5).toArray(), 0.92]];
const uPaint = uniformArray(PAINTS.map((c) => new THREE.Vector4(...c)), "vec4");
const uStone = uniformArray(STONES.map((c) => new THREE.Vector4(...c)), "vec4");

// ------------------------------------------------------------------------------------------------ the kit
let kitP = null;
export function loadParkFenceKit(base = new URL("../", import.meta.url)) {
  return (kitP ??= (async () => {
    const t0 = performance.now();
    const gltf = await new GLTFLoader().loadAsync(new URL("models/parkfence/parkfence.glb", base).href);
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (/_lod[012]$/.test(q.name)) name = q.name;
      if (name) (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    for (const p of PIECES) {
      const lods = [];
      for (let k = 0; k < 3 && raw[`${p}_lod${k}`]; k++) lods.push(mergePrims(raw[`${p}_lod${k}`]));
      if (!lods.length) throw new Error(`park fence kit: ${p} missing`);
      pieces[p] = { name: p, lods, tris: lods.map((g) => g.index.count / 3) };
    }
    return { pieces, loadMs: performance.now() - t0 };
  })());
}
/** a piece's primitives merged: position, normal, slot (+ 0.99 x the baked vertex AO) */
function mergePrims(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`park fence kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    const C = g.attributes.color;
    for (let k = 0; k < n; k++) S[v + k] = s + 0.99 * Math.min(1, C ? C.getX(k) : 1) * 0.999;
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(nv > 65535 ? I : Uint16Array.from(I), 1));
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
const hash3 = (p) => fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
/** the slot look: iron (paint per instance, tips, dark steel), stone (tone per instance, block-to-block variation) */
function slotLook(far) {
  const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor();
  const ao = fract(sl.add(0.0005)).div(0.99).min(1);
  const V = attribute("iVar", "vec4");
  const Pn = uPaint.element(V.x.add(0.5).floor().toInt()), St = uStone.element(V.y.add(0.5).floor().toInt());
  const isStone = idx.greaterThan(2.5), isCap = idx.greaterThan(3.5), isSteel = idx.equal(2);
  // stone: each course a little lighter / darker per instance (near only; a world-xz cell split the blocks in two
  // tones), the copings a touch darker
  const blk = far ? float(0.5) : hash3(vec3(floor(positionWorld.y.mul(3.1)), V.z.mul(7.31), V.z.mul(3.7)));
  const stoneCol = St.xyz.mul(float(0.93).add(blk.mul(0.1))).mul(select(isCap, float(0.92), float(1)));
  const col = select(isStone, stoneCol, select(isSteel, vec3(0.04, 0.04, 0.042), Pn.xyz));
  return {
    col: col.mul(mix(float(1), ao, 0.75)), ao,
    rough: select(isStone, St.w, select(isSteel, float(0.42), Pn.w)),
    metal: select(isStone, float(0), select(isSteel, float(0.6), float(0.2))),
  };
}
/** keep a pixel of the stone's LOD k (bands STONE_BANDS, dithered over +-10 %; the end over its last 15 %) */
function stoneKeep(k, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye)), [s1, s2, end] = STONE_BANDS;
  const t1 = smoothstep(s1 * 0.9, s1 * 1.1, d), t2 = smoothstep(s2 * 0.9, s2 * 1.1, d), e = smoothstep(end * 0.85, end, d);
  if (!SMOOTH) return k === 0 ? d.lessThan(s1) : k === 1 ? d.greaterThanEqual(s1).and(d.lessThan(s2)) : d.greaterThanEqual(s2).and(d.lessThan(end));
  return k === 0 ? keepBand(t1, float(1.01), n) : k === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
}
function solidMaterial(kind, k = 0) {
  const m = new THREE.MeshStandardNodeMaterial();
  const L = slotLook(kind === "stone" && k === 2);
  m.colorNode = L.col; m.aoNode = L.ao; m.roughnessNode = L.rough; m.metalnessNode = L.metal;
  if (kind === "stone") { m.maskNode = stoneKeep(k); m.maskShadowNode = m.maskNode; }
  else {
    // the ironwork's modelled level: colour to NEAR, dithered out by NEAR + BAND (the card carries on); its sun shadow
    // to SHADOW_END (dithered over its last 20 %)
    const n = ditherNoise(), d = length(positionWorld.sub(lodEye));
    m.maskNode = n.greaterThanEqual(rampTo(d, float(NEAR + BAND), float(BAND)));
    m.maskShadowNode = n.greaterThanEqual(rampTo(d, float(SHADOW_END), float(SHADOW_END * 0.2)));
  }
  m.name = kind === "stone" ? `parkfence-stone-lod${k}` : "parkfence-iron-near";
  wxMat(m, { porosity: kind === "stone" ? 0.6 : 0.2, streaks: kind === "stone", frost: true });
  return m;
}
/** the card: blended at the bars' coverage (the atlas: r = tip share, g = steel share, b = AO x coverage, a = coverage),
 *  faded in under the modelled bars over CARD_IN, dithered out over the end; its own depth where it covers >= 4 % */
function cardMaterial(tex) {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: true, alphaTest: CARD_DEPTH_CUT });
  const T = texture(tex, uv()), a = T.a.max(1e-4);
  const V = attribute("iVar", "vec4"), Pn = uPaint.element(V.x.add(0.5).floor().toInt());
  const steel = T.g.div(a).min(1), ao = T.b.div(a).min(1);
  m.colorNode = mix(Pn.xyz, vec3(0.04, 0.04, 0.042), steel).mul(mix(float(1), ao, 0.75));
  m.aoNode = ao; m.roughnessNode = mix(Pn.w, float(0.42), steel); m.metalnessNode = float(0.2);
  const d = length(positionWorld.sub(lodEye));
  // (round 2) the coverage at the view angle: T.a is the bars' / wires' share of the card seen square on (box mips:
  // the true mean over the pixel); seen at a grazing angle the gaps close (a wire grid's open share foreshortens, its
  // wires' depth fills them): 1 - (1 - a)^(1 / cos), cos floored at GRAZE_MIN. A far mesh reads as a dark veil, not
  // as nothing (the 30 m mesh run showed only its posts).
  const cosV = abs(dot(normalize(normalWorld), normalize(cameraPosition.sub(positionWorld)))).max(GRAZE_MIN);
  m.opacityNode = float(1).sub(pow(float(1).sub(T.a.min(0.999)), float(1).div(cosV))).mul(smoothstep(CARD_IN[0], CARD_IN[1], d));
  m.maskNode = keepBand(smoothstep(CARD_END * 0.85, CARD_END, d), float(1.01), ditherNoise());
  m.name = "parkfence-iron-card";
  return m;
}

// ------------------------------------------------------------------------------------------------ the field
/** one piece's stage: an InstancedMesh over every instance of the city, filled with those whose sphere meets [lo, hi] */
class Stage {
  constructor(name, geo, mat, cap, lo, hi, castShadow, group) {
    const g = new THREE.BufferGeometry();
    for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
    g.setIndex(geo.index);
    this.var = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    g.setAttribute("iVar", this.var);
    this.mesh = new THREE.InstancedMesh(g, mat, cap);            // static usage: uploaded on needsUpdate (ranges) only
    this.mesh.count = 0; this.mesh.visible = false; this.mesh.frustumCulled = false;
    this.mesh.castShadow = castShadow; this.mesh.receiveShadow = true; this.mesh.name = name;
    this.lo = lo; this.hi = hi; this.cap = cap; this.tris = geo.index.count / 3;
    group.add(this.mesh);
  }
  fill(list, eye) {
    const M = this.mesh.instanceMatrix.array, Vv = this.var.array;
    let n = 0;
    for (const it of list) {
      const d = Math.hypot(it.c[0] - eye.x, it.c[1] - eye.y, it.c[2] - eye.z);
      if (d - it.r > this.hi || d + it.r < this.lo || n >= this.cap) continue;
      M.set(it.m, n * 16); Vv.set(it.v, n * 4); n++;
    }
    this.mesh.count = n; this.mesh.visible = n > 0;
    if (n) {
      const im = this.mesh.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(0, n * 16); im.needsUpdate = true;
      this.var.clearUpdateRanges(); this.var.addUpdateRange(0, n * 4); this.var.needsUpdate = true;
    }
    return n;
  }
}

export const parkFence = {
  doc: null, docP: null, clearIdx: null, keepIdx: null, tiles: new Map(), group: null, stages: null, roots: new Map(), stats: { instances: 0, draws: 0, tris: 0, tiles: 0 },
  /** the line's plan (once) */
  loadDoc(base = new URL("../", import.meta.url)) {
    return (this.docP ??= fetch(new URL("data/parkfence/parkfence.json", base)).then((r) => (r.ok ? r.json() : null)).then((d) => (this.doc = d)).catch(() => null));
  },
  /** (x, z) -> true within CLEAR_R m of a park's fence line, pier, post or gate leaf (main.js inClear: the generated
   *  garden pieces and plants step off it: a garden pier stood inside a Sauvagère gate pier) */
  async clearTest(r = 0.9) {
    const doc = await this.loadDoc(); if (!doc) return null;
    if (this.clearIdx) return this.clearIdx;
    const C = 8, grid = new Map(), key = (i, j) => i * 100003 + j, segs = [];
    const add = (a, b, rad) => {
      const s = { a, b, r: rad }; segs.push(s);
      for (let i = Math.floor((Math.min(a[0], b[0]) - rad) / C); i <= Math.floor((Math.max(a[0], b[0]) + rad) / C); i++)
        for (let j = Math.floor((Math.min(a[1], b[1]) - rad) / C); j <= Math.floor((Math.max(a[1], b[1]) + rad) / C); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); }
    };
    for (const park of Object.values(doc.parks)) {
      for (const q of [...park.panels, ...park.plinths]) add(q.a, q.b, r);
      for (const q of [...park.piers, ...park.posts]) add(q.at, q.at, r + (q.w || 0) / 2);
      for (const q of park.leaves) add(q.hinge, [q.hinge[0] + q.dir[0] * q.w, q.hinge[1] + q.dir[1] * q.w], r);
    }
    return (this.clearIdx = (x, z) => {
      for (const s of grid.get(key(Math.floor(x / C), Math.floor(z / C))) || []) {
        const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
        if (Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t) < s.r) return true;
      }
      return false;
    });
  },
  /** (x, z) -> true in an open entrance's approach: the opening (between the piers, + 0.3 m each side) from 1.5 m inside
   *  the park to APPROACH m out (tram poles keep out of it: viewer/streets/tramPoles.js opts.keepOut; the gate row
   *  checks every prop and tree against the opening) */
  async keepOutTest() {
    const doc = await this.loadDoc(); if (!doc) return null;
    if (this.keepIdx) return this.keepIdx;
    const zones = entranceZones(doc);
    return (this.keepIdx = (x, z) => zones.some((q) => inZone(q, x, z)));
  },
  /** main.js, a tile's tree list before the tree field and its colliders: no trunk in an open entrance's opening */
  async treesClear(trees) {
    const doc = await this.loadDoc(); if (!doc) return trees;
    this.zones ??= entranceZones(doc);
    return treesOutOfEntrances(trees, this.zones).trees;
  },
  /** the collider roots' names (viewer/heroColliders.js HERO_ROOTS), one per park and tile */
  async rootNames() {
    const doc = await this.loadDoc(); if (!doc) return [];
    return Object.entries(docTiles(doc)).flatMap(([p, ts]) => ts.map((t) => `parkfence-${p}-${t}`));
  },
  /** main.js, when tile T is built: its share of both parks on the drawn ground g(x, z) */
  async tile(T, g) {
    if (!PARKFENCE) return null;
    const doc = await this.loadDoc(); if (!doc) return null;
    const per = {};
    let any = false;
    for (const [name, park] of Object.entries(doc.parks)) {
      const r = tileItems(park, T, g);
      if (Object.values(r.counts).some((v) => v) || r.boxes.length) { per[name] = r; any = true; }
    }
    if (!any) return null;
    this.tiles.set(T, per);
    this.dirty = true;
    this.colliderRoots(T, per);
    return Object.fromEntries(Object.entries(per).map(([k, r]) => [k, r.counts]));
  },
  /** the invisible box soups the hero colliders read (kept in the scene; shown only while the tile is in) */
  colliderRoots(T, per) {
    if (!this.scene) { (this.pendingRoots ??= []).push([T, per]); return; }
    for (const [park, r] of Object.entries(per)) {
      const name = `parkfence-${park}-${T}`;
      let root = this.roots.get(name);
      if (root) { this.scene.remove(root); root.traverse((o) => o.geometry?.dispose?.()); }
      root = new THREE.Group(); root.name = name; root.userData.tile = T;
      const l0 = new THREE.Group(); l0.name = `${name}-lod0`; root.add(l0);
      const soup = boxSoup(r.boxes), g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(soup, 3)); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.colMat ??= new THREE.MeshBasicMaterial({ visible: false }));
      mesh.visible = false; mesh.name = `${name}-boxes`; mesh.userData.collider = true;
      l0.add(mesh);
      this.scene.add(root); this.roots.set(name, root);
    }
  },
  /** after boot: the kit, the meshes, their shaders compiled before anything shows, the per-frame update */
  async start({ scene, updaters, world, compiler, log = () => {} }) {
    if (!PARKFENCE) return;
    this.scene = scene; this.world = world;
    for (const [T, per] of this.pendingRoots || []) this.colliderRoots(T, per);
    this.pendingRoots = null;
    const [doc, kit] = await Promise.all([this.loadDoc(), loadParkFenceKit()]);
    if (!doc) { log("park fences: data/parkfence/parkfence.json missing"); return; }
    const t0 = performance.now();
    // capacities: the plan's count per piece, x 2^MAX_SPLIT for the split panels (a bound; the arrays are small)
    const cap = Object.fromEntries(PIECES.map((p) => [p, 8]));
    for (const park of Object.values(doc.parks)) {
      for (const q of park.panels) cap[q.type === "grand" ? "pf_rail" : q.type === "bars" ? "pf_bars" : "pf_mesh"] += 8;
      cap.pf_plinth += 8 * park.plinths.length; cap.pf_post += park.posts.length; cap.pf_pier += park.piers.length;
      for (const q of park.leaves) cap[q.piece] += 1;
    }
    // the cards: every iron piece's LOD0 rasterised (thinBars.js ironCards; ~0.1-0.3 s once)
    const src = {};
    for (const p of IRON) { const g = kit.pieces[p].lods[0]; src[p] = { pos: g.attributes.position.array, index: g.index.array, slot: g.attributes.slot.array }; }
    const C = ironCards(src, { tipSlot: SLOT.iron_tip, steelSlot: SLOT.steel_dark, tex: 160, width: 2048 });
    const atlas = atlasTexture(C.atlas, "park fence cards");
    const group = this.group = new THREE.Group(); group.name = "parkfence";
    const near = solidMaterial("iron"), card = cardMaterial(atlas), stone = [0, 1, 2].map((k) => solidMaterial("stone", k));
    const stages = this.stages = {};
    for (const p of IRON) {
      const c = C.cards[p], g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(c.pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(c.nrm, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(c.uv, 2)); g.setIndex(c.idx);
      stages[p] = [
        new Stage(`parkfence-${p}`, kit.pieces[p].lods[0], near, cap[p], 0, Math.max(NEAR + BAND, SHADOW_END), true, group),
        new Stage(`parkfence-${p}-card`, g, card, cap[p], CARD_IN[0], CARD_END, false, group),
      ];
    }
    const [s1, s2, end] = STONE_BANDS;
    for (const p of STONE) stages[p] = kit.pieces[p].lods.map((geo, k) => new Stage(`parkfence-${p}-lod${k}`, geo, stone[k], cap[p], k === 0 ? 0 : k === 1 ? s1 * 0.9 : s2 * 0.9, k === 0 ? s1 * 1.1 : k === 1 ? s2 * 1.1 : end, k < 2, group));
    scene.add(group);
    // compile every stage's pipelines (colour + shadow) before the first instance shows: one instance each, far under
    // the city, through the hero compiler
    let compile = compiler?.();
    for (let w = 0; !compile && compiler && w < 40; w++) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    const all = Object.values(stages).flat();
    const I = new THREE.Matrix4().makeTranslation(0, -3000, 0).toArray();
    for (const s of all) { s.mesh.instanceMatrix.array.set(I, 0); s.mesh.count = 1; s.mesh.visible = true; s.mesh.instanceMatrix.needsUpdate = true; }
    if (compile) await compile([group]).catch(() => {});
    for (const s of all) { s.mesh.count = 0; s.mesh.visible = false; }
    this.dirty = true;
    const last = new THREE.Vector3(1e9, 0, 0);
    let frame = 0, shownKey = "";
    updaters.push((camPos) => {
      if (frame++ % 20 === 0) {
        const key = [...this.tiles.keys()].filter((t) => world.tiles.some((q) => q.name === t)).join(",");
        if (key !== shownKey) { shownKey = key; this.dirty = true; }
        for (const [, root] of this.roots) root.visible = world.tiles.some((q) => q.name === root.userData.tile);
      }
      if (!this.dirty && camPos.distanceToSquared(last) < 1) return;
      this.dirty = false; last.copy(camPos);
      const lists = Object.fromEntries(PIECES.map((p) => [p, []]));
      const shown = new Set(shownKey.split(","));
      for (const [T, per] of this.tiles) if (shown.has(T)) for (const r of Object.values(per)) for (const p of PIECES) lists[p].push(...r.inst[p]);
      const st = this.stats; st.instances = 0; st.draws = 0; st.tris = 0; st.tiles = shown.size;
      for (const p of PIECES) for (const s of stages[p]) { const n = s.fill(lists[p], camPos); if (n) { st.draws++; st.tris += n * s.tris; } }
      for (const p of PIECES) st.instances += lists[p].length;
    });
    log(`park fences: ${Object.keys(doc.parks).join(" + ")}, ${all.length} stages, cards ${C.stats.texels} texels in ${C.stats.ms} ms, ready in ${(performance.now() - t0).toFixed(0)} ms (viewer/parkFence.js)`);
    if (typeof window !== "undefined") window.__parkFence = this;
  },
};
