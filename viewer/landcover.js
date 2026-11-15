// Land-cover raster from OSM areas and paths (see ground.js for what each channel means).
const KIND = {
  wood: [255, 0, 0, 0], forest: [255, 0, 0, 0], scrub: [170, 0, 0, 0],
  playground: [0, 0, 255, 0], water: [0, 0, 0, 255],
};
const PATHS = new Set(["footway", "path", "cycleway", "steps", "pedestrian"]);

/** RGBA land-cover mask for one tile (1 px per metre): { data, W, H, areas, paths, sdf }. Pure (OffscreenCanvas).
 *  opts.sdf !== false (the default since joins2, ?groundsdf=old = the coverage mask): the channels are SIGNED
 *  DISTANCES to the covers' edges (coverSDF below), not 1 m coverage: the edges the shader draws are smooth curves. */
export function landCoverData(feats, bounds, opts = {}) {
  const cov = coverageData(feats, bounds);
  if (opts.sdf === false) return cov;
  const t0 = performance.now();
  const sdf = coverSDF(feats, bounds, cov);
  return { data: sdf.data, W: cov.W, H: cov.H, areas: cov.areas, paths: cov.paths, sdf: { range: SDF_R, ms: Math.round(performance.now() - t0), ...sdf.stats } };
}

function coverageData(feats, bounds) {
  const W = Math.round(bounds.x1 - bounds.x0), H = Math.round(bounds.z1 - bounds.z0);
  const cv = new OffscreenCanvas(W, H), g = cv.getContext("2d");
  g.clearRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";                     // channels add up independently
  const px = (x) => x - bounds.x0, pz = (z) => z - bounds.z0;
  let areas = 0, paths = 0;
  for (const a of feats.areas || []) {
    const c = KIND[a.kind];
    if (!c) continue;
    g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},1)`;
    g.beginPath();
    for (const ring of a.rings || []) {
      ring.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
      g.closePath();
    }
    g.fill("evenodd");
    areas++;
  }
  // the railway's verges (?trains=1): cuttings and embankments are scrub / young woodland in Uccle, not lawn
  if (feats.railVerges?.length) {
    g.strokeStyle = "rgba(225,0,0,1)";
    g.lineCap = g.lineJoin = "round";
    g.lineWidth = 30;
    for (const l of feats.railVerges) {
      g.beginPath();
      l.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
      g.stroke();
    }
  }
  g.strokeStyle = "rgba(0,255,0,1)";
  g.lineCap = g.lineJoin = "round";
  for (const l of feats.lines || []) {
    if (!PATHS.has(l.kind)) continue;
    g.lineWidth = l.kind === "pedestrian" ? 4 : 1.6;
    g.beginPath();
    l.line.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
    g.stroke();
    paths++;
  }
  // canvas alpha would premultiply our water channel away: read RGB from the canvas, water separately
  const img = g.getImageData(0, 0, W, H).data;
  const wc = new OffscreenCanvas(W, H), wg = wc.getContext("2d");
  wg.fillStyle = "#fff";
  for (const a of feats.areas || []) {
    if (a.kind !== "water") continue;
    wg.beginPath();
    for (const ring of a.rings || []) { ring.forEach(([x, z], i) => (i ? wg.lineTo(px(x), pz(z)) : wg.moveTo(px(x), pz(z)))); wg.closePath(); }
    wg.fill("evenodd");
  }
  const wimg = wg.getImageData(0, 0, W, H).data;
  // CLEARINGS: OSM maps a meadow / grass area inside a wood as its own polygon drawn over the wood's (Kauwberg: one
  // landuse=forest polygon round the whole reserve, its 4 meadows inside it). The more specific area wins, as on the
  // OSM map: no wood (R) under a grass area (features kind "grass" = landuse grass / meadow / village_green).
  const cc = new OffscreenCanvas(W, H), cg = cc.getContext("2d");
  cg.fillStyle = "#fff";
  let clear = 0;
  for (const a of feats.areas || []) {
    if (a.kind !== "grass") continue;
    cg.beginPath();
    for (const ring of a.rings || []) { ring.forEach(([x, z], i) => (i ? cg.lineTo(px(x), pz(z)) : cg.moveTo(px(x), pz(z)))); cg.closePath(); }
    cg.fill("evenodd");
    clear++;
  }
  const cimg = clear ? cg.getImageData(0, 0, W, H).data : null;
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = img[i * 4 + 3] / 255 || 1;
    data[i * 4] = Math.min(255, img[i * 4] / a) * (cimg ? 1 - cimg[i * 4] / 255 : 1); data[i * 4 + 1] = Math.min(255, img[i * 4 + 1] / a);
    data[i * 4 + 2] = Math.min(255, img[i * 4 + 2] / a); data[i * 4 + 3] = wimg[i * 4];
    if (!img[i * 4 + 3]) data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0;
  }
  return { data, W, H, areas, paths };
}


// ------------------------------------------------------------------------------------------------ distance-field mask
// TERRAIN TEXTURE EDGES (joins2, docs/JOINS2.md): the coverage mask above is a 1 m raster; bilinear filtering of a
// coverage edge draws a staircase / diamond pattern along every diagonal edge (forest paths 1.6 m wide on a 1 m grid
// read as saw-teeth). Instead each channel stores the SIGNED DISTANCE (m, + inside) to its cover's edge, clamped to
// +-SDF_R and packed 0..1 (0.5 = the edge). Distances are linear across a texel, so the bilinear sample is exact to a
// few cm along straight edges and smooth along curves (Valve's alpha-tested magnification, Green 2007; Mapbox
// TinySDF's sub-pixel EDT). The shader turns it back into a weight with a soft, noise-broken, height-blended edge
// (viewer/ground.js coverWeights): one sample, as before.
//   R wood (wood / forest / scrub areas + rail verges, minus the clearings): inside capped at SCRUB_CAP for scrub and
//     verges (the coverage mask's partial woodland: rough grass, no full litter)
//   G paths: ANALYTIC distance to each footway / path / cycleway / steps polyline minus its half width (exact)
//   B sand (playgrounds)    A water: from the canvas coverage through a sub-pixel EDT (Felzenszwalb, TinySDF's edges)
export const SDF_R = 4;                 // m: distance range each way (8-bit: 3 cm steps)
const SCRUB_CAP = 0.75;                 // m: scrub / verges read as 0.75 m inside (wood weight 1, no full litter)
const PAD = 6;                          // px: the raster extended past the tile edge (the border replicated): no edge at the seam
const INF = 1e20;

/** 1D squared-distance transform (Felzenszwalb & Huttenlocher 2012) in place over f[off + k*stride], k < n */
function edt1(f, off, stride, n, d, v, z) {
  for (let q = 0; q < n; q++) d[q] = f[off + q * stride];
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1, k = 0; q < n; q++) {
    let s;
    do { const r = v[k]; s = (d[q] - d[r] + q * q - r * r) / (2 * (q - r)); } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], dq = q - r;
    f[off + q * stride] = d[r] + dq * dq;
  }
}
function edt2(f, w, h, tmp) {
  for (let x = 0; x < w; x++) edt1(f, x, w, h, tmp.d, tmp.v, tmp.z);
  for (let y = 0; y < h; y++) edt1(f, y * w, 1, w, tmp.d, tmp.v, tmp.z);
}
/** signed distance (px, + inside) from an anti-aliased coverage raster a (0..1, w x h), TinySDF's sub-pixel edges */
function sdfFromCoverage(a, w, h, tmp) {
  const n = w * h, outer = new Float64Array(n), inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const c = a[i];
    if (c >= 0.999) { outer[i] = 0; inner[i] = INF; }
    else if (c <= 0.001) { outer[i] = INF; inner[i] = 0; }
    else { const e = 0.5 - c; outer[i] = e > 0 ? e * e : 0; inner[i] = e < 0 ? e * e : 0; }
  }
  edt2(outer, w, h, tmp); edt2(inner, w, h, tmp);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sqrt(inner[i]) - Math.sqrt(outer[i]);
  return out;
}

function coverSDF(feats, bounds, cov) {
  const { W, H } = cov, PW = W + 2 * PAD, PH = H + 2 * PAD;
  const px = (x) => x - bounds.x0 + PAD, pz = (z) => z - bounds.z0 + PAD;
  const cv = new OffscreenCanvas(PW, PH), g = cv.getContext("2d", { willReadFrequently: true });
  const ring = (r) => r.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
  const fillKinds = (test) => {
    let n = 0;
    g.beginPath();
    for (const a of feats.areas || []) { if (!test(a.kind)) continue; for (const r of a.rings || []) { ring(r); g.closePath(); } n++; }
    if (n) g.fill("evenodd");
    return n;
  };
  const M = Math.max(PW, PH);
  const tmp = { d: new Float64Array(M), v: new Int32Array(M), z: new Float64Array(M + 1) };
  // one channel's coverage (alpha) on the padded canvas -> signed distance in metres on the tile grid
  const channel = (draw) => {
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, PW, PH);
    g.fillStyle = g.strokeStyle = "#fff";
    if (!draw()) return null;
    const img = g.getImageData(0, 0, PW, PH).data, a = new Float32Array(PW * PH);
    for (let i = 0; i < PW * PH; i++) a[i] = img[i * 4 + 3] / 255;
    // the pad: the tile's border rows / columns replicated (features are clipped at the tile edge: no false edge there)
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      if (x >= PAD && x < PAD + W && y >= PAD && y < PAD + H) continue;
      const sx = Math.min(PAD + W - 1, Math.max(PAD, x)), sy = Math.min(PAD + H - 1, Math.max(PAD, y));
      a[y * PW + x] = a[sy * PW + sx];
    }
    const d = sdfFromCoverage(a, PW, PH, tmp), out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = d[(y + PAD) * PW + x + PAD];
    return out;
  };
  const wood = channel(() => {
    let n = fillKinds((k) => KIND[k] && KIND[k][0] > 0);
    if (feats.railVerges?.length) {
      g.lineCap = g.lineJoin = "round"; g.lineWidth = 30;
      for (const l of feats.railVerges) { g.beginPath(); ring(l); g.stroke(); n++; }
    }
    if (n) { g.globalCompositeOperation = "destination-out"; fillKinds((k) => k === "grass"); }   // the clearings (see above)
    return n;
  });
  const sand = channel(() => fillKinds((k) => k === "playground"));
  const water = channel(() => fillKinds((k) => k === "water"));
  // paths: exact distance to the polylines (the tile-edge ends extended: a path crossing the seam runs on)
  const path = new Float32Array(W * H).fill(-SDF_R);
  let segs = 0;
  const onEdge = (x, z) => Math.abs(x - bounds.x0) < 0.05 || Math.abs(x - bounds.x1) < 0.05 || Math.abs(z - bounds.z0) < 0.05 || Math.abs(z - bounds.z1) < 0.05;
  for (const l of feats.lines || []) {
    if (!PATHS.has(l.kind) || !l.line || l.line.length < 2) continue;
    const hw = l.kind === "pedestrian" ? 2 : 0.8, pts = l.line.map((p) => [p[0], p[1]]);
    for (const [e, f] of [[0, 1], [pts.length - 1, pts.length - 2]]) {
      if (!onEdge(pts[e][0], pts[e][1])) continue;
      const dx = pts[e][0] - pts[f][0], dz = pts[e][1] - pts[f][1], L = Math.hypot(dx, dz) || 1;
      pts[e] = [pts[e][0] + (dx / L) * PAD, pts[e][1] + (dz / L) * PAD];
    }
    for (let s = 0; s + 1 < pts.length; s++) {
      const ax = pts[s][0] - bounds.x0, az = pts[s][1] - bounds.z0, bx = pts[s + 1][0] - bounds.x0, bz = pts[s + 1][1] - bounds.z0;
      const ex = bx - ax, ez = bz - az, LL = ex * ex + ez * ez || 1e-9, m = hw + SDF_R;
      const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - m)), i1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + m));
      const j0 = Math.max(0, Math.floor(Math.min(az, bz) - m)), j1 = Math.min(H - 1, Math.ceil(Math.max(az, bz) + m));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const cx = i + 0.5 - ax, cz = j + 0.5 - az, t = Math.min(1, Math.max(0, (cx * ex + cz * ez) / LL));
        const d = hw - Math.hypot(cx - t * ex, cz - t * ez), k = j * W + i;
        if (d > path[k]) path[k] = d;
      }
      segs++;
    }
  }
  // pack: 0.5 + d / 2R; wood capped inside scrub / verges (the coverage mask's partial wood: R < 250)
  const data = new Uint8Array(W * H * 4), q = (d) => Math.round(Math.min(1, Math.max(0, 0.5 + d / (2 * SDF_R))) * 255);
  let scrub = 0;
  for (let i = 0; i < W * H; i++) {
    let dw = wood ? wood[i] : -SDF_R;
    if (dw > SCRUB_CAP && cov.data[i * 4] < 250) { dw = SCRUB_CAP; scrub++; }
    data[i * 4] = q(dw); data[i * 4 + 1] = q(path[i]); data[i * 4 + 2] = q(sand ? sand[i] : -SDF_R); data[i * 4 + 3] = q(water ? water[i] : -SDF_R);
  }
  return { data, stats: { pathSegments: segs, scrubPx: scrub } };
}
