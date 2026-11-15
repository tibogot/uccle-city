// IVY AND CLIMBERS IN THE CITY (docs/FOLIAGE.md "City"): ON with the plants, ?ivy=0 off.
//   - data: data/plants/<T>.ivy.json (tools/plants/build_ivy.mjs): the WALLS that carry ivy (blind walls, side walls, a
//     few old fronts with their windows cut out, the front-garden kit's brick walls, climbers on railings); grown in a
//     worker (ivyWorker.js -> viewer/foliage/ivyGrow.js, the Foliage Lab's rules: mounds over a few roots, sideways
//     spread, deflection round the windows: no columns)
//   - drawing: two pools for the whole city (viewer/instanceStream.js): LEAF CARDS (the lab's ivy spray texture with
//     coverage-preserving mips, alpha to coverage) and STEM ribbons (near only, < 16 m). Far LOD = density by distance
//     (the GoT / Unreal trick): past 14 m a card is kept when its random < p(d) and grows 1 / sqrt(p) so the wall keeps
//     its green; p falls to 0.3 at 45 m; the whole ivy dithers out 60-75 m (no sub-pixel cards: they would crawl)
//   - weather: wet (wxMat), snow on the up-facing sprays; season: evergreen, darker in winter; wind: a small flutter
import * as THREE from "three/webgpu";
import {
  uniform,
  attribute, float, vec3, vec4, mix, smoothstep, max, normalize, cross, length, texture, sin, cos, fwidth, saturate,
  varying, cameraViewMatrix, positionLocal, normalLocal, positionWorld, select, uv, sqrt, clamp, abs, fract, vec2,
} from "three/tsl";
import { season } from "../foliage/seasons.js";
import { wind, windAt } from "../foliage/wind.js";
import { leafCard } from "../foliage/cards.js";
import { StreamPool, Streamer, buildSource, MARGIN } from "../instanceStream.js";
import { lodEye, ditherNoise, keepBand } from "../lodFade.js";
import { FadeSlots } from "../instanceStream.js";
import { wxMat } from "../weather/cityWeatherize.js";
import { vertexLit, foliageLights } from "../foliage/vertexLight.js";
import { addLampLight } from "../lampLight.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/plants/", import.meta.url);
export const ivyFades = new FadeSlots();
export const IVY_END = 75, STEM_END = 12, THIN0 = 14, THIN1 = 45, KEEP_FAR = 0.3;
// FAR LOD (perf pass 3, docs/perf/AUDIT.md step 13; ?ivyfar=0 = the cards to 75 m as before): past FAR0 m a wall's ivy
// is ONE quad on the wall with the coverage of its leaves baked by the worker (an R8 atlas: 16 tile regions of 512 x
// 512, up to 10 px a metre); the cards dither out over 17.6-22 m and the quad in. A tile that finds no free region
// keeps its cards to 75 m.
const FAR = qs.get("ivyfar") !== "0";
export const FAR0 = 22;
const ATLAS = 2048, REG = 512, NREG = (ATLAS / REG) ** 2;
/** live A/B and tuning: cardEnd x the cards' end (75 / 22 = as before, with far hidden), the mask's gain / grain */
export const ivyFarU = { cardEnd: uniform(1), gain: uniform(1.4), grain: uniform(0.45), up: uniform(0.3), vary: uniform(0.75) };

function tileKeep(slot, n) {
  const f = ivyFades.fade(slot);
  return select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
}

/** perf pass 3 (?ivycrop=old = the whole square): the card is cropped to the spray's opaque box in the 128 px texture
 *  (texels 20-104 x 21-117, + 2 px for the mips): 54 % of the square, the same pixels drawn, -46 % fragments */
const CROP = qs.get("ivycrop") === "old" ? [0, 0, 1, 1] : [18 / 128, 19 / 128, 107 / 128, 120 / 128];
function cardGeometry() {
  const g = new THREE.BufferGeometry();
  const [u0, v0, u1, v1] = CROP;
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
  g.setAttribute("corner", new THREE.Float32BufferAttribute([u0 - 0.5, v0 - 0.5, u1 - 0.5, v0 - 0.5, u1 - 0.5, v1 - 0.5, u0 - 0.5, v1 - 0.5], 2));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.5); g.userData.shared = true;
  return g;
}
function ribbonGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeBoundingSphere(); g.userData.shared = true;
  return g;
}

let cardM = null, stemM = null;
function cardMaterial() {
  if (cardM) return cardM;
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, metalness: 0 });
  m.alphaToCoverage = true;
  const K = attribute("iIvy", "vec4"), B = attribute("iBand", "vec4"), corner = attribute("corner", "vec2");
  const fence = K.w.greaterThanEqual(2).and(K.w.lessThan(4).or(K.w.greaterThanEqual(6)));
  const anchor = positionLocal, cn = normalize(normalLocal);
  const d = length(anchor.sub(lodEye));
  // density by distance: kept while r1 < p(d), survivors grown 1 / sqrt(p) (the wall keeps its green), dithered out far
  const p = mix(float(1), float(KEEP_FAR), smoothstep(THIN0, THIN1, d));
  const keepK = K.y.lessThan(p);
  const grow = float(1).div(sqrt(p)).min(1.9);
  const up = vec3(0, 1, 0);
  const t1 = normalize(cross(up, cn)), t2 = cross(cn, t1);
  const ang = K.x.mul(6.2832), ca = cos(ang), sa = sin(ang);
  const ax = t1.mul(ca).add(t2.mul(sa)), ay = t2.mul(ca).sub(t1.mul(sa));
  const tilt = K.z.mul(0.6).add(0.25);
  const cardN = normalize(cn.mul(cos(tilt)).add(ay.mul(sin(tilt))));
  const cardY = normalize(cross(cardN, ax));
  const size = float(0.4).mul(K.z.mul(0.5).add(0.75)).mul(grow).mul(select(fence, float(0.85), float(1)));
  const w = windAt(anchor.xz);
  const flick = sin(wind.uTime.mul(5.5).add(K.w.mul(40))).mul(w.z.mul(0.015).add(0.003));
  // (a dropped card collapses to its anchor: no fragment at all)
  const B0 = attribute("iBand", "vec4");
  m.positionNode = select(keepK.and(d.lessThan(B0.z.mul(ivyFarU.cardEnd))), anchor.add(ax.mul(corner.x.mul(size))).add(cardY.mul(corner.y.mul(size))).add(cn.mul(flick)), anchor);
  const a = texture(leafCard("ivy"), uv());
  m.opacityNode = saturate(a.a.sub(0.5).div(max(fwidth(a.a), 1e-4)).add(0.5));
  const winterDark = mix(float(1), float(0.8), float(1).sub(season.u.leaf).mul(0.6));
  // Virginia creeper-like reds on some fence climbers in autumn would be nice; the ivy is evergreen
  const base = select(fence, vec3(0.085, 0.15, 0.04), vec3(0.07, 0.13, 0.035));
  const shade = varying(fract(K.w).mul(0.35).add(0.8), "v_ivS");
  const snow = season.uSnow.mul(smoothstep(0.2, 0.7, cardN.y)).mul(0.8);
  m.colorNode = mix(base.mul(a.r).mul(shade).mul(winterDark), vec3(0.88, 0.9, 0.94), varying(snow, "v_ivSn"));
  const nW = normalize(cn.mul(0.6).add(cardN.mul(0.4)));
  m.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_ivN"), 0)).xyz);
  m.roughnessNode = float(0.45);
  // perf pass 3: the sun per vertex, sun + sky only (no pooled lamp point lights: the lamp light map at night)
  vertexLit(m, { normal: nW, roughness: 0.45 });
  if (foliageLights()) addLampLight(m);
  const n = ditherNoise(), dp = length(positionWorld.sub(lodEye));
  const endC = B.z.mul(ivyFarU.cardEnd);
  m.maskNode = keepBand(smoothstep(endC.mul(0.8), endC, dp), float(1.01), n).and(tileKeep(B.w, n));
  m.name = "plants-ivy-cards";
  wxMat(m, { porosity: 0.1, snow: false });
  m.userData.shared = true; m.userData.noFade = true;
  void clamp; void abs;
  return (cardM = m);
}
function stemMaterial() {
  if (stemM) return stemM;
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, color: 0x4a3d2c, roughness: 0.9, metalness: 0 });
  const B = attribute("iBand", "vec4");
  const n = ditherNoise(), dp = length(positionWorld.sub(lodEye));
  m.maskNode = keepBand(smoothstep(B.z.mul(0.75), B.z, dp), float(1.01), n).and(tileKeep(B.w, n));
  m.name = "plants-ivy-stems";
  vertexLit(m, { lightsOnly: true });
  if (foliageLights()) addLampLight(m);
  wxMat(m, { porosity: 0.4, snow: false });
  m.userData.shared = true; m.userData.noFade = true;
  return (stemM = m);
}

// ---------------------------------------------------------------------------------------------- the far LOD
let atlasTex = null, farM = null, leafRep = null;
function farAtlas() {
  if (atlasTex) return atlasTex;
  const t = new THREE.DataTexture(new Uint8Array(ATLAS * ATLAS), ATLAS, ATLAS, THREE.RedFormat, THREE.UnsignedByteType);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4; t.needsUpdate = true;
  return (atlasTex = t);
}
function farLeaf() {
  if (leafRep) return leafRep;
  leafRep = leafCard("ivy").clone();
  leafRep.wrapS = leafRep.wrapT = THREE.RepeatWrapping; leafRep.needsUpdate = true;
  return leafRep;
}
function farGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeBoundingSphere(); g.userData.shared = true;
  return g;
}
/** one quad per wall: iFar = its rect in the atlas (uv), iFarN = (normal x, z, width, height in m) */
function farMaterial() {
  if (farM) return farM;
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, metalness: 0 });
  m.alphaToCoverage = true;
  const F = attribute("iFar", "vec4"), N = attribute("iFarN", "vec4"), B = attribute("iBand", "vec4"), c = uv();
  const cov = texture(farAtlas(), mix(F.xy, F.zw, c)).r;
  // a leaf grain: the spray texture tiled along the wall (0.3 m, turned 37 deg), its alpha cutting the mask's soft edge
  const wm = c.mul(N.zw);
  const g1 = texture(farLeaf(), vec2(wm.x.mul(0.8).add(wm.y.mul(0.6)), wm.y.mul(0.8).sub(wm.x.mul(0.6))).div(0.3));
  const a = cov.mul(ivyFarU.gain).add(g1.a.sub(0.3).mul(ivyFarU.grain));
  m.opacityNode = saturate(a.sub(0.5).div(max(fwidth(a), 1e-4)).add(0.5));
  const winterDark = mix(float(1), float(0.8), float(1).sub(season.u.leaf).mul(0.6));
  const base = vec3(0.07, 0.13, 0.035).mul(0.975);
  // (the cards tilt every which way: some catch the sun; a flat wall normal reads cooler, so a little up)
  const nW = normalize(vec3(N.x, ivyFarU.up, N.y));
  // leaf-scale light / dark: two octaves of the spray texture (mean ~0.25), mean-matched to the cards' a.r x shade (~0.85)
  const g2 = texture(farLeaf(), wm.div(0.47).add(0.31));
  const vary = g1.r.mul(g1.a).add(g2.r.mul(g2.a)).mul(0.5);
  const snow = season.uSnow.mul(0.3).mul(g1.r);
  m.colorNode = mix(base.mul(vary.mul(ivyFarU.vary).add(0.66)).mul(winterDark), vec3(0.88, 0.9, 0.94), snow);
  m.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_ivfN"), 0)).xyz);
  m.roughnessNode = float(0.45);
  vertexLit(m, { normal: nW, roughness: 0.45 });
  if (foliageLights()) addLampLight(m);
  const n = ditherNoise(), dp = length(positionWorld.sub(lodEye));
  // in as the cards go out (the complement of their dither), out at the end
  m.maskNode = keepBand(smoothstep(B.y.mul(0.8), B.y, dp), smoothstep(B.x.mul(0.8), B.x, dp), n).and(tileKeep(B.w, n));
  m.name = "plants-ivy-far";
  wxMat(m, { porosity: 0.1, snow: false });
  m.userData.shared = true; m.userData.noFade = true;
  return (farM = m);
}

function pool(key, geo, mat, l1, attrs, group) {
  const mesh = new THREE.InstancedMesh(geo, mat, 1);
  mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = true;
  mesh.boundingSphere = new THREE.Sphere(); mesh.name = `plants-${key}`;
  group.add(mesh);
  return new StreamPool(key, [{ mesh, l0: 0, l1, attrs }], 1, MARGIN);
}

export const cityIvy = {
  on: qs.get("ivy") !== "0" && qs.get("plants") !== "0",
  pools: [], tiles: new Map(), worker: null, jobs: new Map(), seq: 0, group: null, streamer: null,
  start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    this.group = new THREE.Group(); this.group.name = "ivy";
    scene.add(this.group);
    const attrs = [["instanceMatrix", "instanceMatrix", 16], ["iIvy", "iIvy", 4], ["iBand", "iBand", 4]];
    this.pools.push(pool("ivy", cardGeometry(), cardMaterial(), IVY_END, attrs, this.group));
    this.pools.push(pool("ivystem", ribbonGeometry(), stemMaterial(), STEM_END, [["instanceMatrix", "instanceMatrix", 16], ["iBand", "iBand", 4]], this.group));
    if (FAR) {
      const fp = pool("ivyfar", farGeometry(), farMaterial(), IVY_END, [["instanceMatrix", "instanceMatrix", 16], ["iFar", "iFar", 4], ["iFarN", "iFarN", 4], ["iBand", "iBand", 4]], this.group);
      fp.meshes[0].l0 = FAR0 * 0.8; fp.meshes[0].d0 = Math.max(0, FAR0 * 0.8 - MARGIN);
      this.pools.push(fp);
      this.atlas = farAtlas(); this.farU = ivyFarU;
      this.regions = Array.from({ length: NREG }, (_, i) => NREG - 1 - i);    // free atlas regions (a stack)
    }
    this.streamer = new Streamer({ name: "ivy", pools: this.pools, fades: ivyFades, budget: 0.25 });
    try {
      this.worker = new Worker(new URL("./ivyWorker.js", import.meta.url), { type: "module" });
      this.worker.onmessage = (e) => { const j = this.jobs.get(e.data.id); if (j) { this.jobs.delete(e.data.id); j(e.data); } };
    } catch (e) { log(`ivy: no worker (${e.message}), ?ivy=0`); this.on = false; return null; }
    updaters.push((eye, cam) => this.streamer.update(cam));
    window.__ivy = this;
    log("ivy: on (?ivy=0 off): walls from data/plants/<T>.ivy.json, grown in a worker");
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.ivy.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile's ivy: grown in the worker, then into the pools (fading with `parent`, the tile's features group) */
  async addTile(name, doc, parent) {
    if (!this.on || !doc?.walls?.length) return null;
    const grp = new THREE.Group(); grp.name = `ivy-${name}`;
    parent.add(grp);
    this.tiles.set(name, { group: grp, pending: true });
    const id = ++this.seq;
    const res = await new Promise((r) => { this.jobs.set(id, r); this.worker.postMessage({ id, walls: doc.walls, far: FAR ? { size: REG } : null }); });
    const t = this.tiles.get(name);
    if (!t || t.group !== grp) return null;                        // unloaded meanwhile
    const L = res.leaves, S = res.stems, nl = L.M.length / 16, ns = S.M.length / 16;
    // the far LOD: the tile's mask into a free atlas region (none free: its cards stay to 75 m)
    let region = -1, far = null;
    if (FAR && res.far?.n && this.regions.length) {
      region = this.regions.pop();
      far = this.farSource(res.far, region);
    }
    t.region = region; t.farPpm = res.far ? +res.far.ppm.toFixed(2) : 0; t.farWalls = res.far?.n || 0;
    const cardEnd = region >= 0 ? FAR0 : IVY_END;
    const src = (M, K, n, end, slot) => {
      const C = new Float32Array(n * 4), IB = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { C.set([M[i * 16 + 12], M[i * 16 + 13], M[i * 16 + 14], 0.6], i * 4); IB.set([end, end, end, slot], i * 4); }
      const cols = { instanceMatrix: [M, 16], iBand: [IB, 4] };
      if (K) cols.iIvy = [K, 4];
      return buildSource(n, cols, C);
    };
    this.streamer.addTile(name, grp, (slot) => ({ ivy: nl ? src(L.M, L.K, nl, cardEnd, slot) : null, ivystem: ns ? src(S.M, null, ns, STEM_END, slot) : null, ivyfar: far ? far(slot) : null }));
    Object.assign(t, { pending: false, n: res.n, ms: Math.round(res.ms) });
    return { ...res.n, workerMs: Math.round(res.ms) };
  },
  /** a tile's far quads (a source per slot) once its mask is in atlas region r */
  farSource(F, r) {
    const tex = farAtlas(), A = tex.image.data, rx = (r % (ATLAS / REG)) * REG, ry = Math.floor(r / (ATLAS / REG)) * REG;
    for (let y = 0; y < REG; y++) A.set(F.atlas.subarray(y * REG, (y + 1) * REG), (ry + y) * ATLAS + rx);
    tex.needsUpdate = true;
    const n = F.n, W = F.W;
    return (slot) => {
      const M = new Float32Array(n * 16), FR = new Float32Array(n * 4), FN = new Float32Array(n * 4), IB = new Float32Array(n * 4), C = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const o = i * 15, [ox, oy, oz, tx, tz, nx, nz, u0, v0, w, h, x0, y0, x1, y1] = W.subarray(o, o + 15);
        // x = along the wall (w m), y = up (h m), z = the wall's normal; origin = the mask's lower corner
        M.set([tx * w, 0, tz * w, 0, 0, h, 0, 0, nx, 0, nz, 0, ox + tx * u0, oy + v0, oz + tz * u0, 1], i * 16);
        FR.set([(rx + x0) / ATLAS, (ry + y0) / ATLAS, (rx + x1) / ATLAS, (ry + y1) / ATLAS], i * 4);
        FN.set([nx, nz, w, h], i * 4);
        IB.set([FAR0, IVY_END, IVY_END, slot], i * 4);
        C.set([ox + tx * (u0 + w / 2), oy + v0 + h / 2, oz + tz * (u0 + w / 2), Math.hypot(w, h) / 2], i * 4);
      }
      return buildSource(n, { instanceMatrix: [M, 16], iFar: [FR, 4], iFarN: [FN, 4], iBand: [IB, 4] }, C);
    };
  },
  removeTile(name) {
    const t = this.tiles.get(name); if (!t) return;
    if (t.region >= 0 && this.regions) this.regions.push(t.region);
    t.group.removeFromParent();
    this.tiles.delete(name);
    this.streamer.removeTile(name);
  },
  report() {
    const tot = { walls: 0, leaves: 0, stems: 0 };
    for (const t of this.tiles.values()) if (t.n) for (const k of Object.keys(tot)) tot[k] += t.n[k];
    return { tiles: this.tiles.size, total: tot, live: this.pools.map((p) => [p.key, p.meshes[0].mesh.visible ? p.meshes[0].mesh.count : 0]), stream: { ...this.streamer.stats } };
  },
};
