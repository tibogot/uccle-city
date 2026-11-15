// SNOW TRAILS (docs/WEATHER.md "Snow round 2"; ?snowtracks=0 = none): footprints, tyre and motorbike tracks in the
// city's snow. A camera-centred deformation texture, after the shipped games that do this:
//   Batman: Arkham Origins (GDC 2014, Barre-Brisebois): a heightmap the movers write into, refilled over time while it
//     snows; the deformed snow drawn with a displaced mesh
//   Rise of the Tomb Raider (GPU Pro 7, Michels + Sikachev, "Deferred snow deformation"): cheap writes (only the
//     depressions), the raised rim (elevation) RECONSTRUCTED when the snow is drawn, not stored
//   God of War Ragnarok (GDC 2023, Surricchio): capsules carve the snow every frame; a normal map in the displaced
//     area + a finer detail normal from a top-down mask in the shading
//   the toroidal "sliding window" (snowflow demo, Bruno Simon's folio-2025 Tracks.js for the three.js / TSL side): the
//     window follows the camera WITHOUT copying the texture: a texel's uv is fract(world xz / size), only the strips
//     that newly enter the window are cleared
//
// The texture: RGBA16F, `res`^2 over `size` m (default 1024^2 over 64 m = 6.25 cm), linear filtered, repeat-wrapped:
//   A = packed (0 fresh .. 1 trodden flat), written with a MAX blend (a track never undoes another)
//   RG = the direction of travel (0.5 + 0.5 dir), B = the kind (0 boot, 1 tyre): blended "last brush wins" by its weight;
//        the shading orients the tread with them
// Per frame (only while there is snow): ONE small render into it: a few clear / refill rects (instanced quads, a
// multiply blend on A) and the brushes (one instanced quad per capsule: a wheel's segment from its last position, a
// planted boot). No ping-pong and no full-screen pass per frame: the cost is the brushes' few thousand pixels; the
// refill (snowfall fills the grooves back) runs every 8th frame as one rect.
// Readers: texture() of `tex` at world xz / size (sampleAt()); outside the window -> 0 (soft edge).
import * as THREE from "three/webgpu";
import { Fn, float, vec2, vec3, vec4, attribute, positionGeometry, varying, clamp, smoothstep, max, min, length, normalize, select,
  texture, uniform, mix, fract, abs } from "three/tsl";

const qp = new URLSearchParams(location.search);
export const TRAILS_ON = qp.get("snowtracks") !== "0" && !/[?&]weather=old(&|$)/.test(location.search);

const MAXB = 192;          // brush instances per frame (each brush may take up to 4 wrapped copies)
const MAXR = 24;           // clear / refill rects per frame (wrapped copies included)

export function createSnowTrails({ renderer = null, size = 64, res = +(qp.get("snowtrailres") ?? 1024) } = {}) {
  const texel = size / res;
  const rt = new THREE.RenderTarget(res, res, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, generateMipmaps: false, depthBuffer: false,
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  rt.texture.name = "snow-trails";
  const uCentre = uniform(new THREE.Vector2(0, 0));     // the window's centre (world xz)
  const uOn = uniform(0);                                 // 1 while any trail may be in the window (readers skip it at 0)
  const uSize = float(size), uTexel = float(texel);

  // ---- the writers (clip space straight from uv: x = 2u - 1, y = 2v - 1; three flips v when it samples a render target)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  // brushes: a capsule p -> q (uv units, already wrapped by the CPU), radius r (m), strength, kind, waist
  const bGeo = new THREE.InstancedBufferGeometry();
  bGeo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  bGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const bSeg = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 4), 4);
  const bPar = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 4), 4);
  const bDir = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 2), 2);
  bGeo.setAttribute("aSeg", bSeg); bGeo.setAttribute("aPar", bPar); bGeo.setAttribute("aDir", bDir);
  bGeo.instanceCount = 0;
  const bMat = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  Object.assign(bMat, { transparent: true, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquationAlpha: THREE.MaxEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
  {
    const seg = attribute("aSeg", "vec4"), par = attribute("aPar", "vec4"), dirA = attribute("aDir", "vec2");
    const p = seg.xy, q = seg.zw, r = par.x.div(uSize);                 // (uv units)
    const pq = q.sub(p), L = length(pq);
    const ax = select(L.greaterThan(1e-7), pq.div(max(L, 1e-7)), vec2(1, 0)), ay = vec2(ax.y.negate(), ax.x);
    const m = p.add(q).mul(0.5), g = positionGeometry;
    const pad = float(texel * 1.5).div(uSize);
    const at = m.add(ax.mul(g.x.mul(L.mul(0.5).add(r).add(pad)))).add(ay.mul(g.y.mul(r.add(pad))));
    const vAt = varying(at), vP = varying(p), vQ = varying(q), vPar = varying(par), vDir = varying(dirA);
    bMat.vertexNode = vec4(at.mul(2).sub(1), 0, 1);
    bMat.fragmentNode = Fn(() => {
      const pp = vP, qq = vQ, d0 = qq.sub(pp);
      const h = clamp(vAt.sub(pp).dot(d0).div(max(d0.dot(d0), 1e-12)), 0, 1);
      const d = length(vAt.sub(pp).sub(d0.mul(h))).mul(uSize);           // metres to the capsule's axis
      // a boot (kind 0): a sole with a waist and a wider toe; a tyre (kind 1): straight
      const waist = vPar.w.mul(float(1).sub(abs(h.mul(2).sub(1))).mul(0.22)).negate().add(1).mul(mix(float(0.92), float(1.06), h));
      const rr = vPar.x.mul(select(vPar.z.greaterThan(0.5), float(1), waist));
      // the profile: a flat floor with soft walls (the walls read as the groove's rim in the shading)
      const w = smoothstep(rr, rr.mul(select(vPar.z.greaterThan(0.5), float(0.55), float(0.62))), d).mul(vPar.y);
      return vec4(vDir.mul(0.5).add(0.5), vPar.z, w);
    })();
  }
  const brushes = new THREE.Mesh(bGeo, bMat);
  brushes.frustumCulled = false; brushes.renderOrder = 1;
  // clear / refill rects: (u0, v0, u1, v1) + k: A <- A x (1 - k), the colour kept
  const rGeo = new THREE.InstancedBufferGeometry();
  rGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
  rGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const rRect = new THREE.InstancedBufferAttribute(new Float32Array(MAXR * 4), 4);
  const rK = new THREE.InstancedBufferAttribute(new Float32Array(MAXR), 1);
  rGeo.setAttribute("aRect", rRect); rGeo.setAttribute("aK", rK);
  rGeo.instanceCount = 0;
  const rMat = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  Object.assign(rMat, { transparent: true, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  {
    const R = attribute("aRect", "vec4"), g = positionGeometry;
    rMat.vertexNode = vec4(mix(R.xy, R.zw, g.xy).mul(2).sub(1), 0, 1);
    rMat.fragmentNode = vec4(0, 0, 0, varying(attribute("aK", "float")));
  }
  const rects = new THREE.Mesh(rGeo, rMat);
  rects.frustumCulled = false; rects.renderOrder = 0;
  scene.add(rects, brushes);

  // ---- CPU side
  let nb = 0, nr = 0;
  const wrap = (u) => u - Math.floor(u);
  /** a brush (world metres): capsule p -> q, radius r, strength 0..1, kind 0 boot / 1 tyre, travel direction (dx, dz) */
  function brush(px, pz, qx, qz, r, s, kind, dx, dz) {
    const u0 = wrap(px / size), v0 = wrap(pz / size), u1 = u0 + (qx - px) / size, v1 = v0 + (qz - pz) / size;
    const e = (r + 2 * texel) / size;
    const lo = [Math.min(u0, u1) - e, Math.min(v0, v1) - e], hi = [Math.max(u0, u1) + e, Math.max(v0, v1) + e];
    const dl = Math.hypot(dx, dz) || 1;
    for (const ou of [0, -1, 1]) {
      if ((ou === -1 && hi[0] <= 1) || (ou === 1 && lo[0] >= 0)) continue;
      for (const ov of [0, -1, 1]) {
        if ((ov === -1 && hi[1] <= 1) || (ov === 1 && lo[1] >= 0)) continue;
        if (nb >= MAXB) return;
        bSeg.array.set([u0 + ou, v0 + ov, u1 + ou, v1 + ov], nb * 4);
        bPar.array.set([r, s, kind, kind > 0.5 ? 0 : 1], nb * 4);
        bDir.array.set([dx / dl, dz / dl], nb * 2);
        nb++;
      }
    }
  }
  /** a world rect [x0, x1) x [z0, z1) (at most one window wide) -> up to 4 uv rects */
  function rect(x0, z0, x1, z1, k) {
    const w = Math.min(1, (x1 - x0) / size), h = Math.min(1, (z1 - z0) / size);
    if (w <= 0 || h <= 0) return;
    const u0 = wrap(x0 / size), v0 = wrap(z0 / size);
    const us = u0 + w > 1 ? [[u0, 1], [0, u0 + w - 1]] : [[u0, u0 + w]];
    const vs = v0 + h > 1 ? [[v0, 1], [0, v0 + h - 1]] : [[v0, v0 + h]];
    for (const [a, b] of us) for (const [c, d] of vs) {
      if (nr >= MAXR) return;
      rRect.array.set([a, c, b, d], nr * 4); rK.array[nr] = k; nr++;
    }
  }
  const O = { x: NaN, z: NaN };            // the window's origin (texel-snapped world xz of its corner)
  let refillAcc = 0, frame = 0, live = false, dirty = false;
  const stats = { brushes: 0, rects: 0, renders: 0, ms: 0 };

  const api = {
    on: TRAILS_ON, rt, tex: rt.texture, size, res, texel, uCentre, uOn, stats, scene,
    setRenderer(r) { renderer = r; },
    /** the packed amount (0..1) at a world xz node, 0 outside the window (any stage: explicit level) */
    sampleAt(xz, lod = true) {
      const t = texture(rt.texture, xz.div(uSize));
      const s = lod ? t.level(0) : t;
      const edge = max(abs(xz.x.sub(uCentre.x)), abs(xz.y.sub(uCentre.y)));
      return clamp(s.w, 0, 1).mul(smoothstep(size * 0.5 - texel, size * 0.5 - 3, edge));
    },
    /** the whole texel (rg dir, b kind, a packed) at a world xz node, no window mask */
    texelAt(xz, lod = false) { const t = texture(rt.texture, xz.div(uSize)); return lod ? t.level(0) : t; },
    /** compile the two writers now (boot): one render of an empty frame */
    warm() {
      nb = 0; nr = 0;
      brush(0, 0, 0.01, 0, 0.1, 0, 1, 1, 0); rect(0, 0, size, size, 1);
      flush(true);
    },
    /**
     * Per frame. camPos: the window's centre; dt: real s; snow: is there snow on the ground (else nothing runs and the
     * texture is cleared once); refill: per real second (the packed amount's decay while it snows); stamps: the
     * brushes, [{ px, pz, x, z, r, s, kind, dx, dz }] (world; p = last position, a boot: p heel -> x toe).
     */
    update(camPos, dt, { snow, refill = 0, stamps = [] }) {
      frame++;
      if (!snow) { if (live) { nb = 0; nr = 0; rect(O.x, O.z, O.x + size, O.z + size, 1); flush(); live = false; uOn.value = 0; } return; }
      nb = 0; nr = 0;
      // the window: centred on the camera, snapped to whole texels; the strips that enter are cleared (toroidal)
      const nx = Math.round((camPos.x - size / 2) / texel) * texel, nz = Math.round((camPos.z - size / 2) / texel) * texel;
      if (!(Math.abs(nx - O.x) < size && Math.abs(nz - O.z) < size)) {         // first frame / a jump: clear it all
        rect(nx, nz, nx + size, nz + size, 1);
      } else {
        if (nx > O.x) rect(O.x + size, nz, nx + size, nz + size, 1); else if (nx < O.x) rect(nx, nz, O.x, nz + size, 1);
        if (nz > O.z) rect(nx, O.z + size, nx + size, nz + size, 1); else if (nz < O.z) rect(nx, nz, nx + size, O.z, 1);
      }
      O.x = nx; O.z = nz;
      uCentre.value.set(nx + size / 2, nz + size / 2);
      // the refill: every 8th frame, the accumulated decay in one rect
      refillAcc += refill * dt;
      if (live && (frame & 7) === 0 && refillAcc > 1e-5) { rect(nx, nz, nx + size, nz + size, Math.min(1, refillAcc)); refillAcc = 0; }
      for (const b of stamps) {
        brush(b.px ?? b.x, b.pz ?? b.z, b.x, b.z, b.r, b.s ?? 1, b.kind ?? 1, b.dx ?? (b.x - (b.px ?? b.x)), b.dz ?? (b.z - (b.pz ?? b.z)));
      }
      if (nb) { live = true; uOn.value = 1; }
      if (nb || nr) flush();
    },
    /** debug: the raw texture's packed channel round a world point, read back (async) */
    async probe(x, z, n = 9) {
      const i = Math.floor(wrap(x / size) * res), j = Math.floor(wrap(z / size) * res);
      const px = await renderer.readRenderTargetPixelsAsync(rt, Math.max(0, i - (n >> 1)), Math.max(0, j - (n >> 1)), n, n);
      let mx = 0; for (let k = 3; k < px.length; k += 4) mx = Math.max(mx, px[k] instanceof Object ? 0 : +px[k]);
      return { i, j, max: mx, raw: px };
    },
  };

  function flush(force = false) {
    const t0 = performance.now();
    bGeo.instanceCount = nb; rGeo.instanceCount = nr;
    brushes.visible = nb > 0 || force; rects.visible = nr > 0 || force;
    if (nb) { for (const a of [bSeg, bPar]) { a.clearUpdateRanges(); a.addUpdateRange(0, nb * 4); a.needsUpdate = true; } bDir.clearUpdateRanges(); bDir.addUpdateRange(0, nb * 2); bDir.needsUpdate = true; }
    if (nr) { rRect.clearUpdateRanges(); rRect.addUpdateRange(0, nr * 4); rRect.needsUpdate = true; rK.clearUpdateRanges(); rK.addUpdateRange(0, nr); rK.needsUpdate = true; }
    const prevRT = renderer.getRenderTarget(), prevMRT = renderer.getMRT?.() ?? null, prevAuto = renderer.autoClear, prevShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setMRT?.(null);
    renderer.autoClear = false;
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevRT); renderer.setMRT?.(prevMRT);
    renderer.autoClear = prevAuto; renderer.shadowMap.autoUpdate = prevShadow;
    stats.brushes = nb; stats.rects = nr; stats.renders++;
    stats.ms = stats.ms * 0.9 + (performance.now() - t0) * 0.1;
  }
  return api;
}
