// VOLUMETRIC SNOW: a layer with real thickness on the ground, roofs, kerbs and car roofs (docs/WEATHER_RESEARCH.md §4:
// a "virtual heightfield mesh", UE5's VHM idea, since WebGPU has no tessellation).
//
// A grid mesh with one vertex per overhead-map cell (512^2 over 64 m = 12.5 cm in the lab). Its vertex shader reads
//   the map:    base height (the topmost solid surface), shape (slope shedding, rounded taper at drop edges, drifts
//               at wall feet), shelter under a crown (x the season's leaf density: bare trees shelter less), cliff
//   the TRACK field (a storage buffer, one float per cell, 0 fresh .. 1 packed): footprints and tyre tracks, stamped
//               by a compute pass from up to 6 capsule "stampers" (feet, wheels), refilled by falling snow
// and puts the vertex at  base + depth x shape x shelter x noise x (1 - 0.72 track) + a rim round the tracks.
// Vertices on a cliff (a step > 8 cm: eaves, kerbs, car sides) or with < 4 mm of snow hide their triangles (discard),
// so the layer stops at roof edges with its rounded lip instead of draping down the walls; every material's own snow
// cover (surfaceWeather.js) sits underneath and fills the cut. Normals from the neighbours' heights (smooth, no
// facets), plus a footprint-faded micro bump and the same anti-aliased sparkle as the materials.
import * as THREE from "three/webgpu";
import { attribute, Fn, If, Discard, float, int, vec2, vec3, vec4, uniform, instancedArray, instanceIndex, varying, positionGeometry, positionWorld,
  mix, smoothstep, clamp, max, min, normalize, length, select, fwidth, cameraViewMatrix, uint, abs, fract } from "three/tsl";
import { wx } from "./weatherState.js";
import { season } from "../seasons/season.js";
import { SHAPE } from "./overheadMap.js";
import { noise2D, bumpNormal } from "../tslkit.js";
import { glint, SNOW_ALBEDO, wxLook, snowMask, snowMaskFast, STEEP } from "./surfaceWeather.js";
import { snowNoise, SNOW_FAST } from "./snowNoise.js";
import { polishOld } from "../polish.js";

// polish1 (docs/POLISH.md item 1, ?snowedge=old = before): the cut used to drop every triangle that touched one hidden
// vertex, so the layer's edge along kerbs / road edges followed the 12.5 cm cells as a staircase. Now the hide flag is
// softened over the 4 neighbours, the layer's thickness tapers to 0 toward it (no vertical lip at the cut), and the
// fragment cuts at the 0.5 iso-line of the interpolated flag (a straight, chamfered line through the triangles);
// a face steeper than ~55 deg (a sliver across a kerb face) is cut too.
const SOFT_EDGE = !polishOld("snowedge");

const NSTAMP = 6;
// perf pass 2 (docs/perf/AUDIT.md step 12, ?snowlod=old = every chunk at full resolution): the layer is 8 x 8 chunks of
// 64^2 cells (262 k vertices, each reading 5 map texels + 5 track cells); the outer 48 chunks (past ~16 m of the
// window's centre, which follows the camera) take every OTHER grid node (25 cm in the city: -56 % vertices). The
// shader is the same (it finds a vertex's cell from its position). Seams: a full chunk's border vertex at an odd
// node next to a coarse chunk is put on its two even neighbours' mean (snowStitch 1: along x, 2: along z), the line
// the coarse edge draws, so no crack opens.
const SNOW_LOD = !/[?&]snowlod=old(&|$)/.test(location.search);

/** The track field (footprints / tyre tracks), one float per overhead cell. Create it BEFORE the materials when they
 *  should show tracks in thin snow too (weatherize({ track: trackSampler(field, map) })). */
export function createTrackField(map) { return instancedArray(map.res * map.res, "float"); }
/** fragment sampler of the track field at a world xz (0 fresh .. 1 packed); 0 outside the map */
export function trackSampler(field, map) {
  return (xz) => {
    const c = clamp(xz.sub(map.uOrigin).div(map.uSize).mul(map.res).floor(), 0, map.res - 1);
    return select(map.inside(xz), field.element(int(c.y).mul(map.res).add(int(c.x))), float(0));
  };
}

export function createSnowLayer({ renderer, map, track: sharedTrack = null, edgeFade = false, trail = null }) {
  const N = map.res, cell = map.cell;
  // the grid is built in the map's LOCAL frame (0 .. size) and the group follows the map's origin: the city's map
  // slides with the camera (overheadMap.bake(scene, at)), the lab's stays put
  const x0 = 0, z0 = 0;
  const geo = new THREE.PlaneGeometry(map.size - cell, map.size - cell, N - 1, N - 1).rotateX(-Math.PI / 2)
    .translate(x0 + map.size / 2, 0, z0 + map.size / 2);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(x0 + map.size / 2, 0, z0 + map.size / 2), map.size);
  const track = sharedTrack ?? instancedArray(N * N, "float");
  const uDt = uniform(0);
  const uRefill = uniform(0);                          // track units per second (snowfall fills tracks back)
  const stampA = Array.from({ length: NSTAMP }, () => uniform(new THREE.Vector4(0, 0, 0, 0)));    // x, z, prev x, prev z
  const stampB = Array.from({ length: NSTAMP }, () => uniform(new THREE.Vector4(0, 0, 0, 0)));    // radius, strength, on
  const uOrigin = map.uOrigin, uCell = float(cell);

  // ---- compute (GPU-driven, ~0 CPU): stamps write only a 4 x 4 m window round each stamper (6 x 32^2 threads); the
  // refill by falling snow sweeps 1/16 of the field per frame (x16 dt), so the full 512^2 field is never touched per frame
  const W = 32, SLICES = 16;
  const uSlice = uniform(0);
  const stampCell = stampA.map((a) => uniform(new THREE.Vector2()));   // the window's first cell (i, j) per stamper
  const stampPass = Fn(() => {
    const k = instanceIndex.div(uint(W * W)), l = instanceIndex.mod(uint(W * W));
    const v = float(0).toVar();
    const ci = int(0).toVar(), cj = int(0).toVar();
    for (let s = 0; s < NSTAMP; s++) {
      If(k.equal(uint(s)), () => {
        const a = stampA[s], b = stampB[s];
        ci.assign(int(stampCell[s].x).add(int(l.mod(uint(W)))));
        cj.assign(int(stampCell[s].y).add(int(l.div(uint(W)))));
        const xz = vec2(float(ci).add(0.5), float(cj).add(0.5)).mul(uCell).add(uOrigin);
        const p = a.xy, q = a.zw, pq = q.sub(p);
        const h = clamp(xz.sub(p).dot(pq).div(max(pq.dot(pq), 1e-6)), 0, 1);
        const d = length(xz.sub(p).sub(pq.mul(h)));
        v.assign(smoothstep(b.x, b.x.mul(0.55), d).mul(b.y).mul(b.z));
      });
    }
    If(v.greaterThan(0.001).and(ci.greaterThanEqual(0)).and(cj.greaterThanEqual(0)).and(ci.lessThan(N)).and(cj.lessThan(N)), () => {
      const t = track.element(cj.mul(N).add(ci));
      t.assign(max(t, v));
    });
  })().compute(NSTAMP * W * W);
  const refillPass = Fn(() => {
    const idx = instanceIndex.add(uint(uSlice).mul(uint(N * N / SLICES)));
    const t = track.element(idx);
    t.assign(t.sub(uRefill.mul(uDt).mul(SLICES)).max(0));
  })().compute(N * N / SLICES);
  const clearPass = Fn(() => { track.element(instanceIndex).assign(0); })().compute(N * N);
  let hadSnow = false, slice = 0;

  // ---- the layer
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.75, metalness: 0 });
  const gi = positionGeometry.x.div(uCell).sub(0.5).round(), gj = positionGeometry.z.div(uCell).sub(0.5).round();
  // the city: the layer thins out toward the window's (round) edge and meets the materials' flat cover there
  const rim = edgeFade ? float(1).sub(smoothstep(map.size * 0.34, map.size * 0.47, positionGeometry.xz.sub(map.size / 2).length())) : float(1);
  const ii = int(gi), jj = int(gj);
  const shelterK = float(SHAPE.shelter).mul(season.uLeafDensity.mul(0.75).add(0.25));
  const depthAt = (i, j) => {
    const s = map.load(i.clamp(0, N - 1), j.clamp(0, N - 1));
    const idx = j.clamp(0, N - 1).mul(N).add(i.clamp(0, N - 1));
    let tr = track.element(idx);
    // ---- snowtracks (claude/snowtracks, docs/WEATHER.md "Snow round 2"): the city's camera-centred trail texture
    // (snowTrails.js) replaces the lab's storage-buffer track: one bilinear tap at the cell centre = the 2 x 2 texels
    // of a 6.25 cm trail under the 12.5 cm cell (a box prefilter: no aliasing of the boot prints in the geometry)
    if (trail) tr = select(trail.uOn.greaterThan(0.5), trail.sampleAt(vec2(float(i).add(0.5), float(j).add(0.5)).mul(uCell).add(uOrigin)), float(0));
    // ---- /snowtracks
    // A = cliff + 2 x road: a salted carriageway keeps only a little (it is slush on the material below)
    const road = s.w.greaterThan(1.5).select(float(1), float(0));
    const d = wx.uSnowDepth.mul(rim).mul(s.z).mul(float(1).sub(shelterK.mul(s.y))).mul(float(1).sub(road.mul(wx.uSalt)));     // (unevenness is baked in the shape)
    return { s, tr, d };
  };
  const C = depthAt(ii, jj), L = depthAt(ii.sub(1), jj), R = depthAt(ii.add(1), jj), U = depthAt(ii, jj.sub(1)), D = depthAt(ii, jj.add(1));
  const rimOf = (X) => max(float(0), L.tr.add(R.tr).add(U.tr).add(D.tr).mul(0.25).sub(X.tr)).mul(trail ? 0.9 : 0.5);   // (snowtracks: a fuller berm)
  const hOf = (X, rim) => X.s.x.add(X.d.mul(float(1).sub(X.tr.mul(0.72))).mul(float(1).add(rim)));
  const hC = hOf(C, rimOf(C));
  // a neighbour across a cliff is replaced by the centre (no normal bent toward the street below)
  const isCliff = (X) => X.s.w.mod(2.0).greaterThan(0.5);
  const nb = (X) => select(isCliff(X).or(X.s.x.sub(C.s.x).abs().greaterThan(0.3)), hC, hOf(X, float(0)));
  const hL = nb(L), hR = nb(R), hU = nb(U), hD = nb(D);
  const nW = normalize(vec3(hL.sub(hR), uCell.mul(2), hU.sub(hD)));
  const hideOf = (X) => select(isCliff(X).or(X.d.lessThan(0.004)).or(X.s.x.lessThan(-1000)), float(1), float(0));
  const hide = hideOf(C);
  // the seam stitch (SNOW_LOD): the mean of the two neighbours along the coarse chunk's edge, as their own vertices put them
  const st = attribute("snowStitch", "float");
  const yOf = (X) => (SOFT_EDGE ? X.s.x.add(hOf(X, float(0)).sub(X.s.x).mul(float(1).sub(hideOf(X)))) : hOf(X, float(0)));
  const stitchY = (y) => (SNOW_LOD ? select(st.greaterThan(1.5), yOf(U).add(yOf(D)).mul(0.5), select(st.greaterThan(0.5), yOf(L).add(yOf(R)).mul(0.5), y)) : y);
  let vHide, cutAt;
  if (SOFT_EDGE) {
    // soft flag: 1 on a hidden vertex, (its hidden 4-neighbours) / 6 next to one; thickness x (1 - flag)^2 so the
    // surface meets the materials' own cover at the cut instead of ending in a 1-cell step
    const soft = max(hide, hide.mul(2).add(hideOf(L)).add(hideOf(R)).add(hideOf(U)).add(hideOf(D)).div(6));
    const keepT = float(1).sub(soft).pow(2);
    mat.positionNode = vec3(positionGeometry.x, stitchY(C.s.x.add(hC.sub(C.s.x).mul(keepT))).add(0.003), positionGeometry.z);
    vHide = varying(soft); cutAt = 0.42;
  } else {
    mat.positionNode = vec3(positionGeometry.x, stitchY(hC).add(0.003), positionGeometry.z);
    vHide = varying(hide); cutAt = 0.001;
  }
  const vN = varying(nW), vTrack = varying(C.tr), vDepth = varying(C.d);
  const P = positionWorld;
  const fw = fwidth(P.x).add(fwidth(P.z)).mul(0.5).add(0.0002);
  // (snowfast: the sparkle only where its facets are over ~1.6 px: a per-pixel branch, as the materials')
  let gl = glint(P, fw);
  if (SNOW_FAST) gl = Fn(() => { const g = vec4(0, 1, 0, 0).toVar(); If(fw.lessThan(0.0115), () => { g.assign(glint(P, fw)); }); return g; })();
  let packed = smoothstep(0.15, 0.7, vTrack);
  // ---- snowtracks: the shading reads the trail per pixel (6.25 cm, finer than the 12.5 cm groove of the geometry): the
  // packed colour follows the boot / tyre outline, a detail normal from its slope (central differences over 2 texels:
  // smooth, no texel facets), and the tread (tyre bars across the travel direction, boot lugs) as a bump
  let trailN = null, tread = float(0), trailAO = null;
  if (trail) {
    const T = trail.texelAt(P.xz), e = trail.texel;
    const on = trail.uOn.greaterThan(0.5);
    const fine = select(on, trail.sampleAt(P.xz, false), float(0));
    packed = smoothstep(0.12, 0.6, fine);
    // the groove is (0.72 x depth) deep: its wall slope; the vertex normal already has the 25 cm-blurred part of it
    const fw2 = fwidth(P.x).add(fwidth(P.z));
    const amp = vDepth.mul(0.72).mul(0.9).mul(float(1).sub(smoothstep(0.03, 0.09, fw2)));
    if (SNOW_FAST) {
      // snowfast: the 4 taps only where they show (trails on, near: the slope fades out by 9 cm / px), explicit level
      trailN = Fn(() => {
        const tN = vec3(0).toVar(), ampV = amp.toVar(), fineV = float(fine).toVar();
        If(on.and(fw2.lessThan(0.09)).and(fineV.greaterThan(0.001)), () => {
          const tap = (dx, dz) => trail.sampleAt(P.xz.add(vec2(dx, dz)), true);
          const g = vec2(tap(e, 0).sub(tap(-e, 0)), tap(0, e).sub(tap(0, -e))).div(2 * e);
          tN.assign(vec3(g.x.mul(ampV), 0, g.y.mul(ampV)));
        });
        return tN;
      })();
    } else {
      const tap = (dx, dz) => trail.sampleAt(P.xz.add(vec2(dx, dz)), false);
      const g = vec2(tap(e, 0).sub(tap(-e, 0)), tap(0, e).sub(tap(0, -e))).div(2 * e);
      trailN = select(on, vec3(g.x.mul(amp), 0, g.y.mul(amp)), vec3(0));
    }
    const dir = T.xy.mul(2).sub(1), along = P.xz.dot(normalize(dir.add(vec2(1e-4, 0))));
    const fwT = fwidth(P.x).add(fwidth(P.z)).mul(0.5);
    const bars = abs(fract(along.div(0.034)).sub(0.5)).mul(2).smoothstep(0.35, 0.65).mul(0.0035);
    // boot sole: lug bars across the sole (2 cm pitch), broken up along their length
    const lugs = abs(fract(along.div(0.022)).sub(0.5)).mul(2).smoothstep(0.3, 0.7).mul((SNOW_FAST ? snowNoise.bump(P.xz, fw, 18.0).v : noise2D(P.xz.mul(18.0))).mul(0.5).add(0.5)).mul(0.002);
    // the sky a groove's floor sees is narrower: ambient occlusion by its depth (reads in shade, where normals do not)
    trailAO = float(1).sub(smoothstep(0.1, 0.85, fine).mul(min(vDepth.div(0.12), 1)).mul(0.42));
    tread = select(on, mix(lugs, bars, T.z.smoothstep(0.3, 0.7)).mul(smoothstep(0.2, 0.6, fine)).mul(float(1).sub(smoothstep(0.0015, 0.005, fwT))), float(0));
  }
  // ---- /snowtracks
  mat.colorNode = Fn(() => {
    If(vHide.greaterThan(cutAt), () => { Discard(); });
    if (SOFT_EDGE) {
      // the triangle's own (flat) normal from the screen derivatives: a sliver standing across a kerb / eave is dropped
      const fn = normalize(P.dFdx().cross(P.dFdy()));
      // (claude/snow2 item 2, ?snowsteep=old = the 0.57 flat-normal cut alone: on a 54 deg slate roof the 12.5 cm
      // heightfield's triangles straddle that 55 deg limit at random, and the kept / dropped ones made a blocky
      // 0.5-1 m patchwork; now a true sliver (flat normal past ~66 deg) is cut, and the slope itself is judged on the
      // smooth field normal (past 60 deg: the shed rule leaves under a third of the depth there anyway))
      if (STEEP) If(fn.y.abs().lessThan(0.4).or(normalize(vN).y.lessThan(0.5)), () => { Discard(); });
      else If(fn.y.abs().lessThan(0.57), () => { Discard(); });
    }
    // thin snow is patchy: the layer keeps the materials' own cover pattern (same noise) and, while it is thin, opens
    // where wheels and feet packed it down to the ground (the Bosveldweg photo: dark tyre lines in 1 cm of snow)
    const thin = float(1).sub(smoothstep(0.02, 0.06, wx.uSnowDepth));
    const keep = SNOW_FAST ? snowMaskFast(P, float(1), float(1), wx.uSnowCover, 0.42, 0.78, null, fw) : snowMask(P, float(1), float(1), wx.uSnowCover);
    // polish: while the cover is thin (< ~2.5 cm) the layer dissolves (its keep threshold rises to 1) except the packed tracks: the
    // materials' own cover (weatherize o.ground: snow in the sett joints / between grass tufts) shows the pattern, not
    // the layer's blobby noise edge
    const thinC = float(1).sub(smoothstep(0.75, 1.0, wx.uSnowCover));
    If(keep.lessThan(mix(float(0.3), float(1.01), thinC)).and(packed.lessThan(0.15)), () => { Discard(); });
    If(keep.lessThan(0.3), () => { Discard(); });
    const v = (SNOW_FAST ? snowNoise.t1(P.xz, fw, 0.8 / 0.6).z : noise2D(P.xz.mul(0.8))).mul(0.04).add(0.98);
    const slushC = vec3(0.4, 0.41, 0.42);
    let c = SNOW_ALBEDO.mul(v);
    c = mix(c, c.mul(0.78).mul(vec3(0.97, 0.97, 0.96)), packed);              // packed snow: greyer, a little dirty
    c = mix(c, slushC, wx.uSlush.mul(mix(float(0.5), float(1), packed)));      // thaw: tracks go to slush first
    // thin snow: the tracks are pressed through to the wet ground (dark lines, the Bosveldweg photo)
    const thinT = float(1).sub(smoothstep(0.02, 0.06, wx.uSnowDepth));
    c = mix(c, vec3(0.07, 0.068, 0.065), packed.mul(thinT).mul(0.9));
    return c;
  })();
  if (trailAO) mat.aoNode = trailAO;        // (snowtracks)
  mat.roughnessNode = mix(mix(mix(float(0.74), float(0.12), gl.w), float(0.5), packed), float(0.22), wx.uSlush);
  const bump = (SNOW_FAST ? snowNoise.bump(P.xz, fw, 7.0).v.mul(0.008).add(snowNoise.bump(P.xz.add(vec2(17.3, 5.1)), fw, 23.0).v.mul(0.002)) : noise2D(P.xz.mul(7.0)).mul(0.008).add(noise2D(P.xz.mul(23.0)).mul(0.002))).mul(float(1).sub(smoothstep(0.004, 0.02, fw))).mul(float(1).sub(packed.mul(0.7))).add(tread);
  const toView = (n) => normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);
  const base = toView(trailN ? normalize(normalize(vN).add(trailN)) : normalize(vN));      // (snowtracks: + the trail's detail slope)
  // the macro normal from the field; micro bump as a small tilt of it; the glint facet on top
  mat.normalNode = normalize(mix(normalize(base.add(bumpNormal(bump).sub(toView(vec3(0, 1, 0))))), toView(gl.xyz), gl.w.mul(float(1).sub(packed))));
  // 8 x 8 chunks of 64^2 cells, each its own draw with a bounding box: the frustum culls what is off screen
  const mesh = new THREE.Group(); mesh.name = "snow-layer";
  const CH = 8, M = N / CH;
  let hMin = Infinity, hMax = -Infinity;
  for (let k = 0; k < N * N; k++) { const h = map.H[k]; if (h > -1000) { hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); } }
  if (!(hMin < hMax)) { hMin = -100; hMax = 400; }
  const coarse = (ci, cj) => SNOW_LOD && ci >= 0 && cj >= 0 && ci < CH && cj < CH && !(ci >= 2 && ci <= 5 && cj >= 2 && cj <= 5);
  let verts = 0;
  for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
    const n = Math.min(M + 1, N - ci * M), m = Math.min(M + 1, N - cj * M);
    const st = coarse(ci, cj) ? 2 : 1;                       // node stride (the last chunk's odd last cell: under the rim's 0)
    const sx = Math.floor((n - 1) / st), sz = Math.floor((m - 1) / st);
    const g = new THREE.PlaneGeometry(sx * st * cell, sz * st * cell, sx, sz).rotateX(-Math.PI / 2)
      .translate(x0 + (ci * M + 0.5) * cell + sx * st * cell / 2, 0, z0 + (cj * M + 0.5) * cell + sz * st * cell / 2);
    g.deleteAttribute("uv");
    // the stitch flags of a full chunk's borders that meet a coarse chunk (odd global nodes only)
    const S = new Float32Array(g.attributes.position.count);
    if (st === 1) {
      const pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const i = Math.round((pos.getX(k) - x0) / cell - 0.5), j = Math.round((pos.getZ(k) - z0) / cell - 0.5), li = i - ci * M, lj = j - cj * M;
        if ((li === 0 && coarse(ci - 1, cj)) || (li === n - 1 && coarse(ci + 1, cj))) { if (j % 2) S[k] = 2; }
        else if ((lj === 0 && coarse(ci, cj - 1)) || (lj === m - 1 && coarse(ci, cj + 1))) { if (i % 2) S[k] = 1; }
      }
    }
    g.setAttribute("snowStitch", new THREE.BufferAttribute(S, 1));
    verts += g.attributes.position.count;
    g.boundingBox = new THREE.Box3(new THREE.Vector3(x0 + ci * M * cell, hMin, z0 + cj * M * cell), new THREE.Vector3(x0 + (ci * M + n) * cell, hMax + 1.0, z0 + (cj * M + m) * cell));
    g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
    const c = new THREE.Mesh(g, mat);
    c.receiveShadow = true; c.castShadow = false;
    mesh.add(c);
  }
  geo.dispose();
  mesh.userData.vertices = verts;
  mesh.position.set(map.uOrigin.value.x, 0, map.uOrigin.value.y);
  /** after a re-bake (the city): the boxes' height range per chunk from the new heights (frustum culling) */
  function refit() {
    for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
      let lo = Infinity, hi = -Infinity;
      for (let j = cj * M; j < Math.min(N, (cj + 1) * M + 1); j += 2) for (let i = ci * M; i < Math.min(N, (ci + 1) * M + 1); i += 2) {
        const h = map.H[j * N + i]; if (h > -1000) { if (h < lo) lo = h; if (h > hi) hi = h; }
      }
      if (!(lo <= hi)) { lo = 0; hi = 0; }
      const g = mesh.children[cj * CH + ci].geometry;
      g.boundingBox.min.y = lo - 0.5; g.boundingBox.max.y = hi + 1.0;
      g.boundingBox.getBoundingSphere(g.boundingSphere);
    }
  }

  return {
    mesh, track, stampA, stampB, uRefill, refit,
    /** compile the three compute passes now (boot) */
    warm() { uDt.value = 0; for (const b of stampB) b.value.z = 0; renderer.compute(stampPass); renderer.compute(refillPass); renderer.compute(clearPass); },
    /** follow the map's origin (the city's sliding window): call when a bake has landed */
    follow() { mesh.position.set(map.uOrigin.value.x, 0, map.uOrigin.value.y); refit(); if (hadSnow) renderer.compute(clearPass); },
    /** stamps: [{ x, z, px, pz, r, strength }] (feet, wheels); dt: s (0 = frozen) */
    update(dt, stamps = []) {
      for (let k = 0; k < NSTAMP; k++) {
        const s = stamps[k];
        if (s) { stampA[k].value.set(s.x, s.z, s.px ?? s.x, s.pz ?? s.z); stampB[k].value.set(s.r, s.strength ?? 1, 1, 0); }
        else stampB[k].value.z = 0;
      }
      uDt.value = Math.min(0.05, dt);
      // fresh snow fills the tracks: ~5 cm of fresh snow buries a footprint
      uRefill.value = (wx.uSnowFall.value * 2.5) / 3600 * 60;   // per real second at the lab's x60
      const snow = wx.uSnowDepth.value > 0.003;
      mesh.visible = snow;
      if (!snow) { if (hadSnow) renderer.compute(clearPass); hadSnow = false; return; }
      hadSnow = true;
      let any = false;
      for (let k = 0; k < NSTAMP; k++) {
        const s = stamps[k];
        if (!s) continue;
        any = true;
        stampCell[k].value.set(Math.floor(((s.x + (s.px ?? s.x)) / 2 - map.uOrigin.value.x) / cell) - W / 2, Math.floor(((s.z + (s.pz ?? s.z)) / 2 - map.uOrigin.value.y) / cell) - W / 2);
      }
      if (any && dt > 0) renderer.compute(stampPass);
      if (uRefill.value > 0 && dt > 0) { uSlice.value = slice; slice = (slice + 1) % SLICES; renderer.compute(refillPass); }
    },
  };
}
