// THE STREET-LIFE LAYER (main thread): real shop names on the fronts, fuel stations, pharmacy crosses, café terraces,
// STIB stops, Villo stations, bpost boxes, glass bubbles, bilingual street plates and house numbers, from
// data/streetlife/<T>.json (tools/streetlife/build_streetlife.py), laid out per tile in viewer/streetlife/streetlifeWorker.js.
//
// Draws per tile: ONE instanced textured box for every boxy thing and ALL the text (fascias, frames, projecting signs,
// awnings, plates, numbers, the fuel canopy + pylon, stop flags, shelters, the Villo terminal), one for the shop windows
// (parallax interior, vendor/slop-street), one for shelter glass; none of them casts a shadow. The prop kits are NOT per
// tile: one pool per kind and LOD for the whole layer (PropPool), filled with the loaded tiles' instances near the
// camera (dithered LOD cross-fade, viewer/lodFade.js). Small boxes shrink away past ~350 x their size (no pop, nothing
// drawn beyond). Text: ONE shared signed-distance atlas (sdfText.js), crisp when magnified, faded by distance
// (textNear .. textFar) and by footprint before the letters turn sub-pixel (no sparkle). Night: every glow is
// x streetUniforms.night (the hook for the night lights lab: nightSources() gives the shop and sign light positions).
// City hookup: docs/streetlife/CITY.md.
import * as THREE from "three/webgpu";
import {
  attribute, uniform, uniformArray, texture, vec2, vec3, vec4, float, uv, positionWorld, normalWorld, smoothstep, mix, fwidth,
  max, min, clamp, step, select, length, abs, positionLocal,
} from "three/tsl";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { FadeSlots, StreamPool, Streamer, sourceFromYaw, MARGIN } from "../instanceStream.js";

/** the props' tile fades (viewer/instanceStream.js): iBand.z = the instance's tile slot */
export const propFades = new FadeSlots();
import { SLOTS, KITS } from "./kits.js";
import { simplifyKit } from "./kitLod.js";
import { shopInterior } from "../../vendor/slop-street/shopInterior.js";
import { loadShopKit, ShopPool, stretchCheck } from "../shops/shopKit.js";
import { loadInteriors, shopWindowMaterial } from "../shops/shopWindow.js";

export const streetUniforms = {
  night: uniform(0),            // 0 day .. 1 night (signs, lightboxes, shop windows, screens)
  textNear: uniform(62),        // m: text fully drawn closer than this
  textFar: uniform(84),         // m: no text beyond this
  footNear: uniform(4.5),       // atlas texels per screen pixel where the ink starts to fade ...
  footFar: uniform(9),          // ... and is gone (the letters would be sub-pixel)
  glow: uniform(1),
  showText: uniform(1),
};

// ------------------------------------------------------------------------------------------------ the shared atlas
/** ONE text atlas for every tile, as PAGES: a DataArrayTexture of `pages` layers of W x H (R8 signed distance, mipmapped).
 *  The worker packs a tile's labels into pages of its own; addTile copies them into free layers and uploads ONLY those
 *  (texture.addLayerUpdate: a W x H sub-upload, 2 MB at 2048 x 1024, instead of the whole atlas); removeTile frees them.
 *  City: 2048 x 1024 x 16 (32 MB + mips): a tile uses 1-2 layers; only the tiles near the camera keep theirs (StreetLife._place). */
export class TextAtlas {
  constructor(W = 2048, H = 1024, pages = 16) {
    this.W = W; this.H = H; this.pages = pages;
    this.data = new Uint8Array(W * H * pages);
    this.tex = new THREE.DataArrayTexture(this.data, W, H, pages);
    Object.assign(this.tex, { format: THREE.RedFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, anisotropy: 8, flipY: false });
    this.tex.colorSpace = THREE.NoColorSpace;
    this.free = Array.from({ length: pages }, (_, i) => i);
    this.full = 0;
    this.uploads = [];          // { tile, layers, bytes }
  }
  get used() { return 1 - this.free.length / this.pages; }
  /** copy a tile's n packed pages (Uint8Array n x W x H) into free layers; returns the layer of each local page (-1:
   *  no room: that page's labels show blank boards) */
  addTile(tile, n, pagesData) {
    const map = [];
    const S = this.W * this.H;
    for (let k = 0; k < n; k++) {
      if (!this.free.length) { this.full++; map.push(-1); continue; }
      const pg = this.free.shift();
      this.data.set(pagesData.subarray(k * S, (k + 1) * S), pg * S);
      this.tex.addLayerUpdate(pg);
      map.push(pg);
    }
    if (map.some((p) => p >= 0)) this.tex.needsUpdate = true;
    this.uploads.push({ tile, layers: map.filter((p) => p >= 0), bytes: map.filter((p) => p >= 0).length * S });
    return map;
  }
  removeTile(pages) { for (const pg of pages) if (pg >= 0 && !this.free.includes(pg)) this.free.push(pg); }
}

/** 1 near, 0 past the range c.w (from 75 % of it), by the VIEW camera's distance to the instance centre c.xyz */
const shrinkAt = (c) => smoothstep(c.w, c.w.mul(0.75), length(c.xyz.sub(lodEye)));
/** the vertex shrunk toward the instance centre c.xyz. three r187 applies the instance matrix BEFORE positionNode
 *  (positionLocal there is the INSTANCED position, the tile meshes sit at the origin: world space), so the shrink is
 *  about the centre, not positionLocal.mul(s) (that slid a far box toward the world origin; found 2026-11-14 with the
 *  shops' stretch, docs/assets/SHOPS.md) */
export const shrinkToward = (c) => c.xyz.add(positionLocal.sub(c.xyz).mul(shrinkAt(c)));

// ------------------------------------------------------------------------------------------------ the textured box
/** unit box centred at 0, uv per face; attribute face: 1 = front (+z), 2 = back (-z, uv mirrored so text reads), 0 = sides */
function boxGeometry() {
  const P = [], N = [], U = [], F = [], I = [];
  const quad = (a, b, c, d, n, f) => {
    const k = P.length / 3;
    for (const [p, u] of [[a, [0, 0]], [b, [1, 0]], [c, [1, 1]], [d, [0, 1]]]) { P.push(...p); N.push(...n); U.push(...u); F.push(f); }
    I.push(k, k + 1, k + 2, k, k + 2, k + 3);
  };
  const h = 0.5;
  quad([-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h], [0, 0, 1], 1);
  quad([h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h], [0, 0, -1], 2);
  quad([h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h], [1, 0, 0], 0);
  quad([-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h], [-1, 0, 0], 0);
  quad([-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h], [0, 1, 0], 0);
  quad([-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h], [0, -1, 0], 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute("face", new THREE.Float32BufferAttribute(F, 1));
  g.setIndex(I);
  return g;
}

function boxMaterial(atlas) {
  const U = streetUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const iRect = attribute("iRect", "vec4"), iBox = attribute("iBox", "vec4"), iBoard = attribute("iBoard", "vec4"), iInk = attribute("iInk", "vec4");
  const iSize = attribute("iSize", "vec4"), iMisc = attribute("iMisc", "vec4"), iCen = attribute("iCen", "vec4");
  // distance LOD without a pop: past 75 % of its range (iCen.w, ~350 x its middle size) a box shrinks to its centre,
  // sub-pixel by then (no discard: early-z stays on; nothing is drawn of it beyond the range)
  m.positionNode = shrinkToward(iCen);
  const face = attribute("face", "float"), fu = uv();
  const front = step(0.5, face).mul(step(face, 1.5)), back = step(1.5, face);
  const textFace = max(front, back.mul(step(0.5, iMisc.x))).mul(step(0, iRect.x));
  const tuv = fu.sub(vec2(0.5, iBox.y).sub(iBox.zw)).div(iBox.zw.mul(2).max(1e-4));     // iBox.x = the atlas page
  const inside = step(0, tuv.x).mul(step(tuv.x, 1)).mul(step(0, tuv.y)).mul(step(tuv.y, 1));
  const tc = clamp(tuv, 0, 1);
  const auv = vec2(mix(iRect.x, iRect.z, tc.x), mix(iRect.w, iRect.y, tc.y));
  // sampled unconditionally (derivatives need uniform control flow); masked afterwards
  const d = texture(atlas.tex, auv).depth(iBox.x.add(0.5).toInt()).r;
  const fp = fwidth(auv.mul(vec2(atlas.W, atlas.H)));
  const tp = max(fp.x, fp.y);                                         // atlas texels per screen pixel
  const aa = clamp(fwidth(d).mul(0.8), 0.004, 0.35);
  const ink = smoothstep(float(0.5).sub(aa), float(0.5).add(aa), d);
  const dist = length(positionWorld.sub(lodEye));
  const near = smoothstep(U.textFar, U.textNear, dist);
  const foot = float(1).sub(smoothstep(U.footNear, U.footFar, tp));
  // as the letters fade they hand over to their average coverage, so the board's brightness does not jump
  const inkA = mix(float(0.22), ink, foot).mul(near).mul(inside).mul(textFace).mul(U.showText);
  // edges: a fake 8 mm chamfer (darker rim) and the enamel border line of plates (iSize.w m wide, inset by half of it)
  const ex = min(fu.x, float(1).sub(fu.x)).mul(iSize.x), ey = min(fu.y, float(1).sub(fu.y)).mul(iSize.y);
  const e = min(ex, ey), fe = fwidth(e).max(1e-5);
  const decal = step(7.5, iMisc.w).mul(step(iMisc.w, 8.5));            // kind 8: the small words on a plate (no rim of their own)
  const faceTB = max(front, back).mul(float(1).sub(decal));
  const rim = mix(float(0.78), float(1), smoothstep(0, float(0.008).max(fe), e)).mul(faceTB).add(float(1).sub(faceTB));
  const bw = iSize.w;
  const border = smoothstep(bw.mul(0.5).sub(fe), bw.mul(0.5).add(fe), e).mul(float(1).sub(smoothstep(bw.mul(1.5).sub(fe), bw.mul(1.5).add(fe), e)))
    .mul(step(0.0001, bw)).mul(max(front, back.mul(step(0.5, iMisc.x))));
  const inkMix = max(inkA, border);
  m.colorNode = mix(iBoard.rgb, iInk.rgb, inkMix).mul(rim);
  m.roughnessNode = iMisc.y;
  m.metalnessNode = iMisc.z;
  const glowBoard = iBoard.rgb.mul(iBoard.a).mul(float(1).sub(inkMix));
  const glowInk = iInk.rgb.mul(iInk.a).mul(inkA);
  // lit signs glow a little by day too (backlit letters and lightboxes read brighter than paint in daylight)
  m.emissiveNode = glowBoard.mul(max(U.night, step(0.5, iBoard.a).mul(0.14))).add(glowInk.mul(max(U.night, step(0.5, iInk.a).mul(0.22)))).mul(U.glow);
  m.name = "streetlife-box";
  m.userData.shared = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ props
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[1][0], s[1][1], s[1][2], s[2])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");
function propMaterial(lod) {
  const U = streetUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const idx = attribute("slot", "float").add(0.5).toInt();
  const A = slotA.element(idx), B = slotB.element(idx), tint = attribute("iTint", "vec4"), band = attribute("iBand", "vec4");
  const base = mix(A.xyz, tint.xyz, tint.w.mul(B.z));
  m.colorNode = base;
  m.roughnessNode = A.w;
  m.metalnessNode = B.x;
  m.emissiveNode = base.mul(B.y).mul(max(U.night, float(0.08))).mul(U.glow);
  // LOD band (iBand.x = switch, .y = range end, per instance: ONE material per LOD for every kind): LOD0 keeps n >= t
  // (t: 0 -> 1 across the switch), LOD1 keeps e <= n < t (e: 0 -> 1 across the range end); iBand.z = its tile's fade slot
  // (lodFade.js objectFade: 0..1 fading in keeps n < f, 2..3 fading out keeps n >= f - 2, 1 = whole)
  const dist = length(positionWorld.sub(lodEye));
  const t = smoothstep(band.x.mul(0.9), band.x.mul(1.1), dist), e = smoothstep(band.y.mul(0.9), band.y, dist);
  const n = ditherNoise(), f = propFades.fade(band.z);
  const tileKeep = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  m.maskNode = (lod === 0 ? keepBand(t, float(1.01), n) : keepBand(e, t, n)).and(tileKeep);
  m.maskShadowNode = m.maskNode;
  m.name = `streetlife-prop-lod${lod}`;
  m.userData.shared = true; m.userData.noFade = true;     // (its per-instance iBand.z carries the tile's fade slot)
  return m;
}

function windowMaterial() {
  const U = streetUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const iWin = attribute("iWin", "vec4"), fu = uv();
  const r4 = shopInterior(fu.x.mul(iWin.x), fu.y.mul(iWin.y), iWin.x, iWin.y, normalWorld, iWin.z, iWin.w.mul(mix(0.55, 1, U.night)));
  const r = { color: r4.xyz, glow: r4.w };
  m.colorNode = vec3(0.004, 0.0045, 0.005);            // the glass itself: almost black, so what shows is the
  m.roughnessNode = float(0.02);                        // interior (emissive) + the street mirrored (IBL + SSR)
  m.specularIntensityNode = float(1);
  m.metalnessNode = float(0);
  m.emissiveNode = r.color.mul(mix(float(0.5), float(0.6), U.night)).mul(r.glow.mul(0.3).add(0.75)).mul(U.glow);
  m.positionNode = shrinkToward(attribute("iWinC", "vec4"));
  m.name = "streetlife-window";
  m.userData.shared = true;
  return m;
}

function glassMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, color: 0xcfd8dc, roughness: 0.05, metalness: 0, opacity: 0.16 });
  m.positionNode = shrinkToward(attribute("iCen", "vec4"));
  m.name = "streetlife-glass";
  m.userData.shared = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ the layer
const BOX_IB = 28, WIN_IB = 12;                         // = streetlifeWorker.js BOX_IB / WIN_IB
const BOX_ATTRS = ["iRect", "iBox", "iBoard", "iInk", "iSize", "iMisc", "iCen"];
/** past this (m, the camera to the nearest point of a tile mesh's box) every instance in it has shrunk away: not drawn */
const MESH_RANGE = { boxes: 600, windows: 600, glass: 250 };
/** a tile's text pages stay in the atlas while the camera is this close to its boxes (m) */
const TEXT_KEEP = 400;

/** PROPS (kits): ONE pool per kind and LOD for the whole city, not one mesh per tile (draws: the kinds near the camera,
 *  not tiles x kinds), streamed by viewer/instanceStream.js: a gather every 2 m of travel, time-sliced, 6 m margin round
 *  the LOD bands; the tile fade is a uniform per tile slot (a fading tile never re-gathers); static buffers with update
 *  ranges (never DynamicDrawUsage: r187 re-uploads those whole in every pass); a pool with nothing to draw is not
 *  visible (an instanced mesh with count 0 still costs a draw per pass). */
class PropPool {
  constructor(kind, K, group, shadows, mats, margin = MARGIN) {
    this.kind = kind; this.K = K; this.meshes = [];
    const s = K.lod[0], e = K.lod[1], live = [[0, s * 1.1], [s * 0.9, e]];     // propMaterial's smoothstep windows
    const spec = [];
    for (let lod = 0; lod < 2; lod++) {
      const geo = K.lods[lod].clone();
      const mesh = new THREE.InstancedMesh(geo, mats[lod], 1);
      mesh.castShadow = shadows && K.shadow; mesh.receiveShadow = true;
      mesh.name = `streetlife-${kind}-lod${lod}`;
      mesh.boundingSphere = new THREE.Sphere();
      group.add(mesh); this.meshes.push(mesh);
      spec.push({ mesh, l0: live[lod][0], l1: live[lod][1], attrs: [["instanceMatrix", "instanceMatrix", 16], ["iTint", "iTint", 4], ["iBand", "iBand", 4]] });
    }
    this.stream = new StreamPool(kind, spec, K.lods[0].boundingSphere.radius, margin);
  }
  /** a tile's props of this kind (x y z yaw r g b amt) as a streaming source */
  source(a, slot) {
    const s = this.K.lod[0], e = this.K.lod[1];
    return sourceFromYaw(a, 8, this.K.lods[0].boundingSphere.radius, {
      iTint: (o, v) => { v[0] = a[o + 4]; v[1] = a[o + 5]; v[2] = a[o + 6]; v[3] = a[o + 7]; },
      iBand: (o, v) => { v[0] = s; v[1] = e; v[2] = slot; },
    });
  }
}

export class StreetLife {
  static async create(scene, opts = {}) {
    const s = new StreetLife(scene, opts);
    await s._kits();
    return s;
  }
  /** opts: base (data/streetlife/), the atlas (pageW x pageH x atlasPages), propShadows (the kits' own shadow flags;
   *  the signs, plates, numbers, frames and windows never cast one) */
  constructor(scene, { base = new URL("../../data/streetlife/", import.meta.url), pageW = 2048, pageH = 1024, atlasPages = 16, propShadows = true, stopsBase = null, noBubbles = false, shops = true, renderer = null } = {}) {
    this.scene = scene; this.base = base; this.propShadows = propShadows;
    this.shops = shops; this.renderer = renderer;      // the shopfront kit + interiors (viewer/shops/); false = the old flat fronts (?shops=old)
    this.noBubbles = noBubbles;          // furniture kit 2 on (viewer/furniture2/): its glass banks replace the bubbles
    this.stopsBase = stopsBase;          // data/stops/ when the STIB stops kit is on (viewer/stops/): the stops' text only
    this.group = new THREE.Group(); this.group.name = "streetlife";
    scene.add(this.group);
    this.atlas = new TextAtlas(pageW, pageH, atlasPages);
    this.boxGeo = boxGeometry();
    this.boxMat = boxMaterial(this.atlas);
    this.winMat = windowMaterial();               // (replaced by the interior-mapped glass in _kits when the shops are on)
    this.glassMat = glassMaterial();
    this.planeGeo = new THREE.PlaneGeometry(1, 1);
    this.tiles = new Map();
    this.worker = new Worker(new URL("./streetlifeWorker.js", import.meta.url), { type: "module" });
    this.req = new Map(); this.reqId = 0;
    this.worker.onmessage = (e) => { const p = this.req.get(e.data.id); this.req.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data); };
    this.tileMeshes = [];
    this.pools = [];
    this.streamer = new Streamer({ name: "streetlife", pools: [], fades: propFades, budget: 0.15 });
  }
  /** every mesh of the layer: the tiles' (boxes, windows, glass) and the prop pools' */
  get meshes() { return [...this.tileMeshes, ...this.pools.flatMap((p) => p.meshes), ...(this.shopPools || []).flatMap((p) => p.meshes)]; }
  async _kits() {
    const t0 = performance.now();
    this.kit = {};
    this.propMats = [propMaterial(0), propMaterial(1)];
    for (const [kind, k] of Object.entries(KITS)) {
      const a0 = k.build(0).arrays(), a1 = await simplifyKit(k.build(1).arrays(), kind);
      const geo = (a) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(a.position, 3));
        g.setAttribute("normal", new THREE.BufferAttribute(a.normal, 3));
        g.setAttribute("slot", new THREE.BufferAttribute(a.slot, 1));
        g.setIndex(new THREE.BufferAttribute(a.index, 1));
        g.computeBoundingSphere();
        return g;
      };
      this.kit[kind] = { lods: [geo(a0), geo(a1)], tris: [a0.index.length / 3, a1.index.length / 3], lod: k.lod, shadow: k.shadow };
      this.pools.push(new PropPool(kind, this.kit[kind], this.group, this.propShadows, this.propMats));
    }
    // the shopfront kit: one pool per piece, riding the same streamer (the tile fades are its slots)
    this.shopPools = [];
    if (this.shops) {
      const [kit, I] = await Promise.all([loadShopKit(propFades), loadInteriors(this.renderer)]);
      this.shopKit = kit; this.interiors = I;
      for (const piece of Object.values(kit.pieces)) this.shopPools.push(new ShopPool(piece, kit.mats, this.group));
      this.winMat = shopWindowMaterial(I, { night: streetUniforms.night, glow: streetUniforms.glow, shrink: shrinkToward });
      this.shopStretch = stretchCheck(kit);
      const g = (sx, sy, sz) => { const b = new THREE.BoxGeometry(sx, sy, sz); b.translate(0, sy / 2, 0); b.userData.shared = true; return b; };
      this.colliderGeo = { table: g(1.75, 0.9, 0.75), parasol: g(0.3, 2.4, 0.3), planter: g(1.06, 0.95, 0.48) };
      this.colliderMat = new THREE.MeshBasicNodeMaterial(); this.colliderMat.userData.shared = true;
    }
    this.streamer.pools = [...this.pools, ...this.shopPools].map((p) => p.stream);
    this.kitMs = performance.now() - t0;
  }
  _work(tile) {
    return new Promise((resolve, reject) => {
      const id = ++this.reqId;
      this.req.set(id, { resolve, reject });
      this.worker.postMessage({ id, tile, url: new URL(`${tile}.json`, this.base).href, pageW: this.atlas.W, pageH: this.atlas.H, stopsUrl: this.stopsBase ? new URL(`${tile}.json`, this.stopsBase).href : null, noBubbles: this.noBubbles,
        shops: this.shops, terracesUrl: new URL("../shops/terraces.json", this.base).href });
    });
  }
  /** build one tile's layer into `parent` (the city: the tile's own features group, so it fades and is disposed with
   *  the tile; then call removeTile too, for the atlas pages and the pools); resolves to its stats */
  async addTile(tile, parent = this.group) {
    if (this.tiles.has(tile)) return this.tiles.get(tile).stats;
    const t0 = performance.now();
    const r = await this._work(tile);
    const tm = performance.now();
    const g = new THREE.Group(); g.name = `streetlife-${tile}`;
    const meshes = [];
    const finish = (mesh, kind) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      mesh.castShadow = false; mesh.receiveShadow = true;
      mesh.name = `streetlife-${kind}-${tile}`; mesh.userData.range = MESH_RANGE[kind];
      g.add(mesh); meshes.push(mesh);
    };
    // ---- boxes: every sign, plate, number, frame, canopy, shelter (no shadows: signs and plates cast none)
    let ib = null, text = null;
    if (r.nb) {
      const IB = r.boxIB;
      // the labelled boxes' rect + LOCAL page (kept: the tile's text pages can leave the atlas and come back)
      const idx = [];
      for (let i = 0; i < r.nb; i++) if (IB[i * BOX_IB] >= 0) idx.push(i);
      text = { idx: Uint32Array.from(idx), rect: new Float32Array(idx.length * 5) };
      idx.forEach((i, k) => { text.rect.set(IB.subarray(i * BOX_IB, i * BOX_IB + 5), k * 5); IB.fill(-1, i * BOX_IB, i * BOX_IB + 4); IB[i * BOX_IB + 4] = 0; });
      const geo = this.boxGeo.clone();
      ib = new THREE.InstancedInterleavedBuffer(IB, BOX_IB);
      BOX_ATTRS.forEach((k, j) => geo.setAttribute(k, new THREE.InterleavedBufferAttribute(ib, 4, j * 4)));
      const mesh = new THREE.InstancedMesh(geo, this.boxMat, r.nb);
      mesh.instanceMatrix = new THREE.InstancedBufferAttribute(r.boxMtx, 16);
      finish(mesh, "boxes");
    }
    // ---- shop windows
    if (r.nw) {
      const geo = this.planeGeo.clone();
      const ib = new THREE.InstancedInterleavedBuffer(r.winIB, WIN_IB);
      geo.setAttribute("iWin", new THREE.InterleavedBufferAttribute(ib, 4, 0));
      geo.setAttribute("iWinC", new THREE.InterleavedBufferAttribute(ib, 4, 4));
      geo.setAttribute("iWinT", new THREE.InterleavedBufferAttribute(ib, 4, 8));
      const mesh = new THREE.InstancedMesh(geo, this.winMat, r.nw);
      mesh.instanceMatrix = new THREE.InstancedBufferAttribute(r.winMtx, 16);
      finish(mesh, "windows");
    }
    // ---- shelter glass
    if (r.ng) {
      const geo = this.boxGeo.clone();
      geo.setAttribute("iCen", new THREE.InstancedBufferAttribute(r.glassCen, 4));
      const mesh = new THREE.InstancedMesh(geo, this.glassMat, r.ng);
      mesh.instanceMatrix = new THREE.InstancedBufferAttribute(r.glassMtx, 16);
      mesh.renderOrder = 2;
      finish(mesh, "glass");
    }
    // ---- terrace colliders (never drawn): the car (viewer/drive featureColliders) and the walker (viewer/character/
    // cityHook) read instanced meshes named furniture-terrace
    if (this.shops) for (const [k, a] of Object.entries(r.colliders || {})) {
      const n = a.length / 4, mesh = new THREE.InstancedMesh(this.colliderGeo[k], this.colliderMat, n), M = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { M.makeRotationY(a[i * 4 + 3]).setPosition(a[i * 4], a[i * 4 + 1], a[i * 4 + 2]); mesh.setMatrixAt(i, M); }
      mesh.name = "furniture-terrace"; mesh.visible = false; mesh.userData.collider = k;
      g.add(mesh);
    }
    parent.add(g);
    this.tileMeshes.push(...meshes);
    const propCounts = Object.fromEntries(Object.entries(r.props).map(([k, a]) => [k, a.length / 8]));
    const shopCounts = Object.fromEntries(Object.entries(r.shops || {}).map(([k, a]) => [k, a.length / 12]));
    const stats = {
      tile, worker: Object.fromEntries(Object.entries(r.times).map(([k, v]) => [k, +v.toFixed(1)])), mainMs: +(performance.now() - tm).toFixed(2), totalMs: +(performance.now() - t0).toFixed(1),
      boxes: r.nb, windows: r.nw, glass: r.ng, props: propCounts, shops: shopCounts, labels: r.labels, labelBytes: r.labelBytes, atlasPages: [], labelPages: r.nPages, atlasUsed: +this.atlas.used.toFixed(3), atlasFull: this.atlas.full, dropped: r.dropped,
      counts: r.counts, skipped: r.skipped, used: r.used, sources: r.sources, draws: meshes.length,
    };
    const rec = { name: tile, group: g, meshes, night: r.night, stats, pages: null, nPages: r.nPages, pagesData: r.pages, ib, text, box: meshes[0]?.boundingBox ?? null, props: r.props, fade: 1 };
    this.tiles.set(tile, rec);
    this.streamer.addTile(tile, g, (slot) => Object.fromEntries([
      ...this.pools.filter((p) => r.props[p.kind]?.length).map((p) => [p.kind, p.source(r.props[p.kind], slot)]),
      ...this.shopPools.filter((p) => r.shops?.[p.kind]?.length).map((p) => [p.stream.key, p.source(r.shops[p.kind], slot)]),
    ]));
    // its text pages go into the atlas from update() (a slice of its own: ~1 ms for the copy), once it is near
    stats.mainMs = +(performance.now() - tm).toFixed(2);
    return stats;
  }
  /** TEXT PAGES: a tile's labels are in the atlas while it is within TEXT_KEEP m of the camera (its text shows from
   *  84 m in); when the atlas is full, the pages of the farthest tile beyond that go (its text is long faded out there;
   *  its boards would show blank, never another tile's words: their rects are cleared) and come back from the CPU copy
   *  when it is near again (a 2 MB layer upload + the box buffer, 64 KB) */
  _place(t, c) {
    if (t.pages || !t.nPages || !t.text) return false;
    const dist = (q) => (q.box ? q.box.distanceToPoint(c) : 0);
    if (dist(t) > TEXT_KEEP) return false;
    while (this.atlas.free.length < t.nPages) {
      let far = null;
      for (const q of this.tiles.values()) if (q !== t && q.pages && dist(q) > TEXT_KEEP && (!far || dist(q) > dist(far))) far = q;
      if (!far) break;
      this._evict(far);
    }
    if (this.atlas.free.length < t.nPages) return false;     // no room: blank boards until there is (its rects stay -1)
    const map = this.atlas.addTile(t.name, t.nPages, t.pagesData);
    t.pages = map;
    const IB = t.ib.array, { idx, rect } = t.text;
    for (let k = 0; k < idx.length; k++) {
      const o = idx[k] * BOX_IB;
      IB.set(rect.subarray(k * 5, k * 5 + 4), o);
      IB[o + 4] = map[rect[k * 5 + 4]];
    }
    t.ib.needsUpdate = true;
    t.stats.atlasPages = map;
    return true;
  }
  _evict(t) {
    if (!t.pages) return;
    this.atlas.removeTile(t.pages);
    t.pages = null;
    const IB = t.ib.array;
    for (const i of t.text.idx) { IB.fill(-1, i * BOX_IB, i * BOX_IB + 4); IB[i * BOX_IB + 4] = 0; }
    t.ib.needsUpdate = true;
    this.evictions = (this.evictions || 0) + 1;
  }
  /** per frame: tile meshes past their range are not drawn (every instance in them has shrunk away); the prop pools are
   *  streamed (viewer/instanceStream.js: time-sliced gathers, the tile fades as uniform slots) */
  update(camera) {
    const c = camera.position;
    let visible = 0;
    for (const m of this.tileMeshes) {
      m.visible = m.boundingBox.distanceToPoint(c) < m.userData.range;
      if (m.visible) visible++;
    }
    this.streamer.update(camera);
    for (const t of this.tiles.values()) if (!t.pages && t.nPages && this._place(t, c)) break;   // one tile's text pages per frame
    for (const p of this.pools) for (const m of p.meshes) if (m.visible) visible++;
    for (const p of this.shopPools) for (const m of p.meshes) if (m.visible) visible++;
    this.visibleMeshes = visible;
  }
  /** the night-lights hook: shop-window and sign light positions of every loaded tile (flat x, y, z arrays) */
  nightSources() {
    const out = { shops: { x: [], y: [], z: [] }, signs: { x: [], y: [], z: [] }, spots: { x: [], y: [], z: [] } };
    for (const t of this.tiles.values()) for (const k of ["shops", "signs", "spots"]) {
      const a = t.night[k];
      for (let i = 0; i < a.length; i += 3) { out[k].x.push(a[i]); out[k].y.push(a[i + 1]); out[k].z.push(a[i + 2]); }
    }
    return out;
  }
  /** free a tile's atlas pages and take its props out of the pools; its meshes are disposed here unless `disposed`
   *  (the city disposes them with the tile's groups) */
  removeTile(tile, disposed = false) {
    const t = this.tiles.get(tile);
    if (!t) return;
    for (const m of t.meshes) {
      if (!disposed) m.geometry.dispose();
      const i = this.tileMeshes.indexOf(m); if (i >= 0) this.tileMeshes.splice(i, 1);
    }
    t.group.removeFromParent();
    if (t.pages) this.atlas.removeTile(t.pages);
    this.tiles.delete(tile);
    this.streamer.removeTile(tile);
  }
  get triangles() {
    let n = 0;
    for (const m of this.meshes) if (m.visible) n += (m.geometry.index ? m.geometry.index.count / 3 : 0) * m.count;
    return n;
  }
}
