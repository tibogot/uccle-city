// THE STREET-LIFE LAYER (main thread): real shop names on the fronts, fuel stations, pharmacy crosses, café terraces,
// STIB stops, Villo stations, bpost boxes, glass bubbles, bilingual street plates and house numbers, from
// data/streetlife/<T>.json (tools/streetlife/build_streetlife.py), laid out per tile in viewer/streetlife/streetlifeWorker.js.
//
// Draws per tile: ONE instanced textured box for every boxy thing and ALL the text (fascias, frames, projecting signs,
// awnings, plates, numbers, the fuel canopy + pylon, stop flags, shelters, the Villo terminal), one for the shop windows
// (parallax interior, vendor/slop-street), one for shelter glass, and 2 per prop kind present (LOD0 / LOD1, dithered
// cross-fade, viewer/lodFade.js). Text: ONE shared signed-distance atlas (sdfText.js), crisp when magnified, faded by
// distance (textNear .. textFar) and by footprint before the letters turn sub-pixel (no sparkle). Night: every glow is
// x streetUniforms.night (the hook for the night lights lab: nightSources() gives the shop and sign light positions).
import * as THREE from "three/webgpu";
import {
  attribute, uniform, uniformArray, texture, vec2, vec3, vec4, float, uv, positionWorld, normalWorld, smoothstep, mix, fwidth,
  max, min, clamp, step, select, length, abs,
} from "three/tsl";
import { lodEye, keepBand } from "../lodFade.js";
import { SLOTS, KITS } from "./kits.js";
import { simplifyKit } from "./kitLod.js";
import { ShelfPacker } from "./sdfText.js";
import { shopInterior } from "../../vendor/slop-street/shopInterior.js";

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
export class TextAtlas {
  constructor(W = 4096, H = 4096) {
    this.W = W; this.H = H;
    this.data = new Uint8Array(W * H);
    this.tex = new THREE.DataTexture(this.data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    Object.assign(this.tex, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, anisotropy: 8, flipY: false });
    this.tex.colorSpace = THREE.NoColorSpace;
    this.pack = new ShelfPacker(W, H);
    this.rects = new Map();       // key -> [u0, v0, u1, v1]
    this.full = 0;
  }
  /** add a worker's labels (w, h, off into data); returns their rects in the order given */
  add(labels, data) {
    const out = [];
    for (const l of labels) {
      let r = this.rects.get(l.key);
      if (!r) {
        const at = this.pack.add(l.w, l.h);
        if (!at) { this.full++; out.push(null); continue; }
        for (let y = 0; y < l.h; y++) this.data.set(data.subarray(l.off + y * l.w, l.off + (y + 1) * l.w), (at.y + y) * this.W + at.x);
        r = [(at.x + 0.5) / this.W, (at.y + 0.5) / this.H, (at.x + l.w - 0.5) / this.W, (at.y + l.h - 0.5) / this.H];
        this.rects.set(l.key, r);
      }
      out.push(r);
    }
    this.tex.needsUpdate = true;
    return out;
  }
}

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
  const iSize = attribute("iSize", "vec4"), iMisc = attribute("iMisc", "vec4");
  const face = attribute("face", "float"), fu = uv();
  const front = step(0.5, face).mul(step(face, 1.5)), back = step(1.5, face);
  const textFace = max(front, back.mul(step(0.5, iMisc.x))).mul(step(0, iRect.x));
  const tuv = fu.sub(iBox.xy.sub(iBox.zw)).div(iBox.zw.mul(2).max(1e-4));
  const inside = step(0, tuv.x).mul(step(tuv.x, 1)).mul(step(0, tuv.y)).mul(step(tuv.y, 1));
  const tc = clamp(tuv, 0, 1);
  const auv = vec2(mix(iRect.x, iRect.z, tc.x), mix(iRect.w, iRect.y, tc.y));
  // sampled unconditionally (derivatives need uniform control flow); masked afterwards
  const d = texture(atlas.tex, auv).r;
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
  const rim = mix(float(0.78), float(1), smoothstep(0, float(0.008).max(fe), e)).mul(max(front, back)).add(float(1).sub(max(front, back)));
  const bw = iSize.w;
  const border = smoothstep(bw.mul(0.5).sub(fe), bw.mul(0.5).add(fe), e).mul(float(1).sub(smoothstep(bw.mul(1.5).sub(fe), bw.mul(1.5).add(fe), e)))
    .mul(step(0.0001, bw)).mul(max(front, back.mul(step(0.5, iMisc.x))));
  const inkMix = max(inkA, border);
  m.colorNode = mix(iBoard.rgb, iInk.rgb, inkMix).mul(rim);
  m.roughnessNode = iMisc.y;
  m.metalnessNode = iMisc.z;
  const glowBoard = iBoard.rgb.mul(iBoard.a).mul(float(1).sub(inkMix));
  const glowInk = iInk.rgb.mul(iInk.a).mul(inkA);
  m.emissiveNode = glowBoard.add(glowInk).mul(max(U.night, step(0.5, iBoard.a).mul(0.12))).mul(U.glow);
  m.name = "streetlife-box";
  return m;
}

// ------------------------------------------------------------------------------------------------ props
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[1][0], s[1][1], s[1][2], s[2])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");
function propMaterial(band, lod) {
  const U = streetUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const idx = attribute("slot", "float").add(0.5).toInt();
  const A = slotA.element(idx), B = slotB.element(idx), tint = attribute("iTint", "vec4");
  const base = mix(A.xyz, tint.xyz, tint.w.mul(B.z));
  m.colorNode = base;
  m.roughnessNode = A.w;
  m.metalnessNode = B.x;
  m.emissiveNode = base.mul(B.y).mul(max(U.night, float(0.08))).mul(U.glow);
  // LOD band: LOD0 keeps n >= t (t: 0 -> 1 across the switch), LOD1 keeps e <= n < t (e: 0 -> 1 across the range end)
  const dist = length(positionWorld.sub(lodEye));
  const t = smoothstep(band.s.mul(0.9), band.s.mul(1.1), dist), e = smoothstep(band.e.mul(0.9), band.e, dist);
  m.maskNode = lod === 0 ? keepBand(t, float(1.01)) : keepBand(e, t);
  m.maskShadowNode = m.maskNode;
  m.name = `streetlife-prop-lod${lod}`;
  return m;
}

function windowMaterial() {
  const U = streetUniforms;
  const m = new THREE.MeshStandardNodeMaterial();
  const iWin = attribute("iWin", "vec4"), fu = uv();
  const r4 = shopInterior(fu.x.mul(iWin.x), fu.y.mul(iWin.y), iWin.x, iWin.y, normalWorld, iWin.z, iWin.w.mul(mix(0.55, 1, U.night)));
  const r = { color: r4.xyz, glow: r4.w };
  m.colorNode = vec3(0.015, 0.016, 0.018);
  m.roughnessNode = float(0.06);
  m.metalnessNode = float(0);
  m.emissiveNode = r.color.mul(mix(float(0.42), float(1.1), U.night)).mul(r.glow.mul(0.3).add(0.75)).mul(U.glow);
  m.name = "streetlife-window";
  return m;
}

function glassMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, color: 0xcfd8dc, roughness: 0.05, metalness: 0, opacity: 0.16 });
  m.name = "streetlife-glass";
  return m;
}

// ------------------------------------------------------------------------------------------------ the layer
export class StreetLife {
  static async create(scene, opts = {}) {
    const s = new StreetLife(scene, opts);
    await s._kits();
    return s;
  }
  constructor(scene, { base = new URL("../../data/streetlife/", import.meta.url), atlasSize = 4096, shadows = true } = {}) {
    this.scene = scene; this.base = base; this.shadows = shadows;
    this.group = new THREE.Group(); this.group.name = "streetlife";
    scene.add(this.group);
    this.atlas = new TextAtlas(atlasSize, atlasSize);
    this.boxGeo = boxGeometry();
    this.boxMat = boxMaterial(this.atlas);
    this.winMat = windowMaterial();
    this.glassMat = glassMaterial();
    this.planeGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0, 0);
    this.tiles = new Map();
    this.worker = new Worker(new URL("./streetlifeWorker.js", import.meta.url), { type: "module" });
    this.req = new Map(); this.reqId = 0;
    this.worker.onmessage = (e) => { const p = this.req.get(e.data.id); this.req.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data); };
    this.meshes = [];
  }
  async _kits() {
    const t0 = performance.now();
    this.kit = {};
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
      const band = { s: uniform(k.lod[0]), e: uniform(k.lod[1]) };
      this.kit[kind] = { lods: [geo(a0), geo(a1)], tris: [a0.index.length / 3, a1.index.length / 3], band, mats: [propMaterial(band, 0), propMaterial(band, 1)], shadow: k.shadow, end: k.lod[1] };
    }
    this.kitMs = performance.now() - t0;
  }
  _work(tile) {
    return new Promise((resolve, reject) => {
      const id = ++this.reqId;
      this.req.set(id, { resolve, reject });
      this.worker.postMessage({ id, tile, url: new URL(`${tile}.json`, this.base).href });
    });
  }
  /** build one tile's layer; resolves to its stats (worker times, counts, draws) */
  async addTile(tile) {
    if (this.tiles.has(tile)) return this.tiles.get(tile).stats;
    const t0 = performance.now();
    const r = await this._work(tile);
    const tm = performance.now();
    const rects = this.atlas.add(r.labels, r.labelData);
    const g = new THREE.Group(); g.name = `streetlife-${tile}`;
    const meshes = [];
    // ---- boxes
    const nb = r.boxes.length / r.strides.box;
    if (nb) {
      const geo = this.boxGeo.clone();
      const S = r.strides.box, A = (n) => new Float32Array(nb * n);
      const iRect = A(4), iBox = A(4), iBoard = A(4), iInk = A(4), iSize = A(4), iMisc = A(4);
      const mesh = new THREE.InstancedMesh(geo, this.boxMat, nb);
      for (let i = 0; i < nb; i++) {
        const o = i * S;
        mesh.instanceMatrix.array.set(r.boxes.subarray(o, o + 16), i * 16);
        const li = r.boxes[o + 16], rc = li >= 0 ? rects[li] : null;
        iRect.set(rc || [-1, -1, -1, -1], i * 4);
        iBox.set(r.boxes.subarray(o + 17, o + 21), i * 4);
        iBoard.set(r.boxes.subarray(o + 21, o + 25), i * 4);
        iInk.set(r.boxes.subarray(o + 25, o + 29), i * 4);
        iSize.set(r.boxes.subarray(o + 29, o + 33), i * 4);
        iMisc.set(r.boxes.subarray(o + 33, o + 37), i * 4);
      }
      // one interleaved instance buffer (WebGPU allows 8 vertex buffers per pipeline)
      const IB = new Float32Array(nb * 24);
      [iRect, iBox, iBoard, iInk, iSize, iMisc].forEach((v, k) => { for (let i = 0; i < nb; i++) IB.set(v.subarray(i * 4, i * 4 + 4), i * 24 + k * 4); });
      const ib = new THREE.InstancedInterleavedBuffer(IB, 24);
      ["iRect", "iBox", "iBoard", "iInk", "iSize", "iMisc"].forEach((k, j) => geo.setAttribute(k, new THREE.InterleavedBufferAttribute(ib, 4, j * 4)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = this.shadows; mesh.receiveShadow = true;
      mesh.name = `streetlife-boxes-${tile}`;
      mesh.userData.end = 420;
      g.add(mesh); meshes.push(mesh);
    }
    // ---- shop windows
    const nw = r.windows.length / r.strides.win;
    if (nw) {
      const geo = this.planeGeo.clone(), iWin = new Float32Array(nw * 4);
      const mesh = new THREE.InstancedMesh(geo, this.winMat, nw);
      for (let i = 0; i < nw; i++) { mesh.instanceMatrix.array.set(r.windows.subarray(i * 20, i * 20 + 16), i * 16); iWin.set(r.windows.subarray(i * 20 + 16, i * 20 + 20), i * 4); }
      geo.setAttribute("iWin", new THREE.InstancedBufferAttribute(iWin, 4));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      mesh.receiveShadow = true; mesh.name = `streetlife-windows-${tile}`; mesh.userData.end = 600;
      g.add(mesh); meshes.push(mesh);
    }
    // ---- shelter glass
    const ng = r.glass.length / r.strides.glass;
    if (ng) {
      const mesh = new THREE.InstancedMesh(this.boxGeo, this.glassMat, ng);
      for (let i = 0; i < ng; i++) mesh.instanceMatrix.array.set(r.glass.subarray(i * 16, i * 16 + 16), i * 16);
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      mesh.name = `streetlife-glass-${tile}`; mesh.userData.end = 250; mesh.renderOrder = 2;
      g.add(mesh); meshes.push(mesh);
    }
    // ---- props: LOD0 + LOD1 per kind, the same instances
    const propCounts = {};
    for (const [kind, arr] of Object.entries(r.props)) {
      const K = this.kit[kind], n = arr.length / r.strides.prop;
      propCounts[kind] = n;
      const mtx = new Float32Array(n * 16), tint = new Float32Array(n * 4), M = new THREE.Matrix4(), q = new THREE.Quaternion(), Yax = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < n; i++) {
        const o = i * 8;
        q.setFromAxisAngle(Yax, arr[o + 3]);
        M.compose(new THREE.Vector3(arr[o], arr[o + 1], arr[o + 2]), q, new THREE.Vector3(1, 1, 1));
        mtx.set(M.elements, i * 16);
        tint.set(arr.subarray(o + 4, o + 8), i * 4);
      }
      const im = new THREE.InstancedBufferAttribute(mtx, 16), it = new THREE.InstancedBufferAttribute(tint, 4);
      for (let lod = 0; lod < 2; lod++) {
        const geo = K.lods[lod].clone();
        geo.setAttribute("iTint", it);
        const mesh = new THREE.InstancedMesh(geo, K.mats[lod], n);
        mesh.instanceMatrix = im;
        mesh.computeBoundingSphere();
        mesh.castShadow = this.shadows && K.shadow; mesh.receiveShadow = true;
        mesh.name = `streetlife-${kind}-lod${lod}-${tile}`;
        mesh.userData.end = K.end * 1.05; mesh.userData.near = lod === 1 ? K.band.s.value * 0.85 : 0;
        g.add(mesh); meshes.push(mesh);
      }
    }
    this.group.add(g);
    this.meshes.push(...meshes);
    const stats = {
      tile, worker: Object.fromEntries(Object.entries(r.times).map(([k, v]) => [k, +v.toFixed(1)])), mainMs: +(performance.now() - tm).toFixed(1), totalMs: +(performance.now() - t0).toFixed(1),
      boxes: nb, windows: nw, glass: ng, props: propCounts, labels: r.labels.length, labelBytes: r.labelData.length, atlasUsed: +this.atlas.pack.used.toFixed(3), atlasFull: this.atlas.full,
      counts: r.counts, skipped: r.skipped, used: r.used, sources: r.sources, draws: meshes.length,
    };
    this.tiles.set(tile, { group: g, meshes, night: r.night, stats });
    return stats;
  }
  /** per frame: hide the meshes whose whole extent is past their range (cheap: a sphere test per mesh) */
  update(camera) {
    const c = camera.position;
    let visible = 0;
    for (const m of this.meshes) {
      const s = m.boundingSphere;
      if (!s) continue;
      const d = c.distanceTo(s.center);
      m.visible = d - s.radius < m.userData.end && d + s.radius > (m.userData.near || 0);
      if (m.visible) visible++;
    }
    this.visibleMeshes = visible;
  }
  /** the night-lights hook: shop-window and sign light positions of every loaded tile (flat x, y, z arrays) */
  nightSources() {
    const out = { shops: { x: [], y: [], z: [] }, signs: { x: [], y: [], z: [] } };
    for (const t of this.tiles.values()) for (const k of ["shops", "signs"]) {
      const a = t.night[k];
      for (let i = 0; i < a.length; i += 3) { out[k].x.push(a[i]); out[k].y.push(a[i + 1]); out[k].z.push(a[i + 2]); }
    }
    return out;
  }
  removeTile(tile) {
    const t = this.tiles.get(tile);
    if (!t) return;
    for (const m of t.meshes) { m.geometry.dispose(); const i = this.meshes.indexOf(m); if (i >= 0) this.meshes.splice(i, 1); }
    t.group.removeFromParent();
    this.tiles.delete(tile);
  }
  get triangles() {
    let n = 0;
    for (const m of this.meshes) if (m.visible) n += (m.geometry.index ? m.geometry.index.count / 3 : 0) * m.count;
    return n;
  }
}
