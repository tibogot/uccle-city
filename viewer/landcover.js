// Land-cover raster from OSM areas and paths (see ground.js for what each channel means).
const KIND = {
  wood: [255, 0, 0, 0], forest: [255, 0, 0, 0], scrub: [170, 0, 0, 0],
  playground: [0, 0, 255, 0], water: [0, 0, 0, 255],
};
const PATHS = new Set(["footway", "path", "cycleway", "steps", "pedestrian"]);

/** RGBA land-cover mask for one tile (1 px per metre): { data, W, H, areas, paths }. Pure (OffscreenCanvas). */
export function landCoverData(feats, bounds) {
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
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = img[i * 4 + 3] / 255 || 1;
    data[i * 4] = Math.min(255, img[i * 4] / a); data[i * 4 + 1] = Math.min(255, img[i * 4 + 1] / a);
    data[i * 4 + 2] = Math.min(255, img[i * 4 + 2] / a); data[i * 4 + 3] = wimg[i * 4];
    if (!img[i * 4 + 3]) data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0;
  }
  return { data, W, H, areas, paths };
}

