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
import { Fn, If, Discard, float, int, vec2, vec3, vec4, uniform, instancedArray, instanceIndex, varying, positionGeometry, positionWorld,
  mix, smoothstep, clamp, max, min, normalize, length, select, fwidth, cameraViewMatrix, uint } from "three/tsl";
import { wx } from "./weatherState.js";
import { season } from "../seasons/season.js";
import { SHAPE } from "./overheadMap.js";
import { noise2D, bumpNormal } from "../tslkit.js";
import { glint, SNOW_ALBEDO, wxLook } from "./surfaceWeather.js";

const NSTAMP = 6;

export function createSnowLayer({ renderer, map }) {
  const N = map.res, cell = map.cell;
  const x0 = map.uOrigin.value.x, z0 = map.uOrigin.value.y;
  const geo = new THREE.PlaneGeometry(map.size - cell, map.size - cell, N - 1, N - 1).rotateX(-Math.PI / 2)
    .translate(x0 + map.size / 2, 0, z0 + map.size / 2);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(x0 + map.size / 2, 0, z0 + map.size / 2), map.size);
  const track = instancedArray(N * N, "float");
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
  const gi = positionGeometry.x.sub(uOrigin.x).div(uCell).sub(0.5).round(), gj = positionGeometry.z.sub(uOrigin.y).div(uCell).sub(0.5).round();
  const ii = int(gi), jj = int(gj);
  const shelterK = float(SHAPE.shelter).mul(season.uLeafDensity.mul(0.75).add(0.25));
  const depthAt = (i, j) => {
    const s = map.load(i.clamp(0, N - 1), j.clamp(0, N - 1));
    const idx = j.clamp(0, N - 1).mul(N).add(i.clamp(0, N - 1));
    const tr = track.element(idx);
    const d = wx.uSnowDepth.mul(s.z).mul(float(1).sub(shelterK.mul(s.y)));     // (unevenness is baked in the shape)
    return { s, tr, d };
  };
  const C = depthAt(ii, jj), L = depthAt(ii.sub(1), jj), R = depthAt(ii.add(1), jj), U = depthAt(ii, jj.sub(1)), D = depthAt(ii, jj.add(1));
  const rimOf = (X) => max(float(0), L.tr.add(R.tr).add(U.tr).add(D.tr).mul(0.25).sub(X.tr)).mul(0.5);
  const hOf = (X, rim) => X.s.x.add(X.d.mul(float(1).sub(X.tr.mul(0.72))).mul(float(1).add(rim)));
  const hC = hOf(C, rimOf(C));
  // a neighbour across a cliff is replaced by the centre (no normal bent toward the street below)
  const nb = (X) => select(X.s.w.greaterThan(0.5).or(X.s.x.sub(C.s.x).abs().greaterThan(0.3)), hC, hOf(X, float(0)));
  const hL = nb(L), hR = nb(R), hU = nb(U), hD = nb(D);
  const nW = normalize(vec3(hL.sub(hR), uCell.mul(2), hU.sub(hD)));
  const hide = select(C.s.w.greaterThan(0.5).or(C.d.lessThan(0.004)).or(C.s.x.lessThan(-1000)), float(1), float(0));
  mat.positionNode = vec3(positionGeometry.x, hC.add(0.003), positionGeometry.z);
  const vHide = varying(hide), vN = varying(nW), vTrack = varying(C.tr), vDepth = varying(C.d);
  const P = positionWorld;
  const fw = fwidth(P.x).add(fwidth(P.z)).mul(0.5).add(0.0002);
  const gl = glint(P, fw);
  const packed = smoothstep(0.15, 0.7, vTrack);
  mat.colorNode = Fn(() => {
    If(vHide.greaterThan(0.001), () => { Discard(); });
    const v = noise2D(P.xz.mul(0.8)).mul(0.04).add(0.98);
    const slushC = vec3(0.4, 0.41, 0.42);
    let c = SNOW_ALBEDO.mul(v);
    c = mix(c, c.mul(0.78).mul(vec3(0.97, 0.97, 0.96)), packed);              // packed snow: greyer, a little dirty
    c = mix(c, slushC, wx.uSlush.mul(mix(float(0.5), float(1), packed)));      // thaw: tracks go to slush first
    return c;
  })();
  mat.roughnessNode = mix(mix(mix(float(0.74), float(0.12), gl.w), float(0.5), packed), float(0.22), wx.uSlush);
  const bump = noise2D(P.xz.mul(7.0)).mul(0.008).add(noise2D(P.xz.mul(23.0)).mul(0.002)).mul(float(1).sub(smoothstep(0.004, 0.02, fw)));
  const toView = (n) => normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);
  const base = toView(normalize(vN));
  // the macro normal from the field; micro bump as a small tilt of it; the glint facet on top
  mat.normalNode = normalize(mix(normalize(base.add(bumpNormal(bump).sub(toView(vec3(0, 1, 0))))), toView(gl.xyz), gl.w.mul(float(1).sub(packed))));
  // 8 x 8 chunks of 64^2 cells, each its own draw with a bounding box: the frustum culls what is off screen
  const mesh = new THREE.Group(); mesh.name = "snow-layer";
  const CH = 8, M = N / CH;
  let hMin = Infinity, hMax = -Infinity;
  for (let k = 0; k < N * N; k++) { const h = map.H[k]; if (h > -1000) { hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); } }
  for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
    const n = Math.min(M + 1, N - ci * M), m = Math.min(M + 1, N - cj * M);
    const g = new THREE.PlaneGeometry((n - 1) * cell, (m - 1) * cell, n - 1, m - 1).rotateX(-Math.PI / 2)
      .translate(x0 + (ci * M + 0.5) * cell + (n - 1) * cell / 2, 0, z0 + (cj * M + 0.5) * cell + (m - 1) * cell / 2);
    g.deleteAttribute("uv");
    g.boundingBox = new THREE.Box3(new THREE.Vector3(x0 + ci * M * cell, hMin, z0 + cj * M * cell), new THREE.Vector3(x0 + (ci * M + n) * cell, hMax + 1.0, z0 + (cj * M + m) * cell));
    g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
    const c = new THREE.Mesh(g, mat);
    c.receiveShadow = true; c.castShadow = false;
    mesh.add(c);
  }
  geo.dispose();

  return {
    mesh, track, stampA, stampB, uRefill,
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
