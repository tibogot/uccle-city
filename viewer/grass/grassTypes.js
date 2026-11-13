// GRASS TYPES of one tile (docs/GRASS.md "Types"): a 1 m/px RGBA8 raster painted from the tile's real data, read by
// the grass field bake (grassField.js) under the terrain. Pure (OffscreenCanvas): main thread or a worker.
//   R  density   0..1  how much grass grows here (before the land-cover mask: wood, paths, sand, water, slope)
//   G  length    0..1  0 mown lawn (5-8 cm) .. 0.3 park grass (10-16 cm, clumpy) .. 0.65 roadside verge (25-35 cm)
//                      .. 1 meadow (40-60 cm)
//   B  dry       0..1  straw-coloured share (verges, heath, rough corners)
//   A  flowers   0..1  wildflowers (meadows, heath, village greens)
//
// Data (no rules where data exists):
//   - OSM areas of the tile (features.json): park, garden, grass (landuse), pitch, cemetery, scrub, playground;
//     data/grass/osm_grass.json (tools/grass/build_osm_grass.mjs) adds what features.json folds away: meadow /
//     grassland / heath / village_green, a pitch's surface + sport (tennis clay and hockey turf grow no grass);
//   - UrbIS measured street surfaces (surfaces.json): the terrain within VERGE_W of a carriageway with no sidewalk in
//     between is a roadside verge (a garden lies behind a sidewalk); traffic islands are their own grass surfaces
//     (the road mesh's "grass" part, baked as verges by grassField.js);
//   - the LiDAR / OSM trees (features.json trees, crown radius): thin, shaded grass under crowns.
// Everything else (private gardens, the unmapped green) is a mown lawn; the textured ground's rough / dry noise patches
// (ground.js) vary it in the bake, so the blades follow the ground's own patches.

const VERGE_W = 1.7;            // m beyond a carriageway's edge
// [density, length, dry, flowers] per OSM kind (the painting order below decides who wins where areas overlap)
const KIND = {
  garden: [1, 0.04, 0, 0],
  park: [1, 0.28, 0.05, 0.04],
  grass: [1, 0.42, 0.25, 0.08],               // landuse=grass in Uccle: public greens, roundabouts, embankments
  village_green: [1, 0.3, 0.05, 0.15],
  cemetery: [0.85, 0.14, 0.1, 0],
  scrub: [0.6, 0.8, 0.4, 0.05],
  dog_park: [0.8, 0.2, 0.3, 0],
  orchard: [1, 0.7, 0.2, 0.5],
  meadow: [1, 1, 0.15, 1],
  grassland: [1, 0.95, 0.25, 0.8],
  heath: [0.8, 0.75, 0.55, 0.3],
  pitchGrass: [1, 0.0, 0, 0],
  none: [0, 0, 0, 0],
};
const ORDER = ["cemetery", "garden", "park", "village_green", "grass", "dog_park", "scrub", "orchard", "heath", "grassland", "meadow", "pitchGrass", "none"];
const GRASS_SPORTS = /^(soccer|football|rugby|rugby_union|gaelic_games|cricket|)$/;

/** the kind used for one feature area: its OSM kind refined by osm_grass.json */
function kindOf(a, kinds) {
  const k = kinds?.[a.id];
  if (k) {
    if (k.startsWith("pitch:")) {
      const [, surf, sport] = k.split(":");
      if (surf === "grass") return "pitchGrass";
      if (surf === "unknown" && GRASS_SPORTS.test(sport)) return "pitchGrass";
      return "none";                       // clay, turf, asphalt, sand ...: no grass
    }
    if (KIND[k]) return k;
  }
  if (a.kind === "pitch") return "none";
  if (a.kind === "playground") return null; // the land-cover mask's sand does it
  return KIND[a.kind] ? a.kind : null;
}

// two canvases: RGB = density, length, dry (alpha stays 1, so nothing is premultiplied away); R of the second = flowers
const rgb = (v) => `rgb(${Math.round(v[0] * 255)},${Math.round(v[1] * 255)},${Math.round(v[2] * 255)})`;
const fl = (v) => `rgb(${Math.round(v[3] * 255)},0,0)`;

/**
 * @param feats    features.json of the tile (areas, trees)
 * @param bounds   {x0, x1, z0, z1}
 * @param opts.kinds    osm_grass.json `kinds` (optional)
 * @param opts.surfaces surfaces.json (optional: verges)
 * @returns {{ data: Uint8Array, W, H, stats }}
 */
export function grassTypeData(feats, bounds, { kinds = null, surfaces = null } = {}) {
  const W = Math.round(bounds.x1 - bounds.x0), H = Math.round(bounds.z1 - bounds.z0);
  const cv = new OffscreenCanvas(W, H), g1 = cv.getContext("2d", { willReadFrequently: true });
  const cv2 = new OffscreenCanvas(W, H), g2 = cv2.getContext("2d", { willReadFrequently: true });
  const px = (x) => x - bounds.x0, pz = (z) => z - bounds.z0;
  // both canvases take every operation (g.fillStyle = v sets the pair from one [d, l, dry, flowers] value)
  const g = {
    set fillStyle(v) { g1.fillStyle = rgb(v); g2.fillStyle = fl(v); }, set strokeStyle(v) { g1.strokeStyle = rgb(v); g2.strokeStyle = fl(v); },
    set lineWidth(v) { g1.lineWidth = g2.lineWidth = v; }, set lineJoin(v) { g1.lineJoin = g2.lineJoin = v; },
    fillRect: (...a) => { g1.fillRect(...a); g2.fillRect(...a); }, fill: (r) => { g1.fill(r); g2.fill(r); }, stroke: () => { g1.stroke(); g2.stroke(); },
  };
  const path = (rings) => { for (const c of [g1, g2]) { c.beginPath(); for (const ring of rings) { ring.forEach(([x, z], i) => (i ? c.lineTo(px(x), pz(z)) : c.moveTo(px(x), pz(z)))); c.closePath(); } } };
  const stats = { areas: {}, verges: 0, crowns: 0 };
  // default: a mown garden lawn
  g.fillStyle = [1, 0.06, 0, 0];
  g.fillRect(0, 0, W, H);
  // roadside verges: the terrain beside a carriageway (stroked first: any mapped area painted after wins)
  if (surfaces?.surfaces?.length) {
    g.strokeStyle = [0.9, 0.62, 0.55, 0.12];
    g.lineWidth = VERGE_W * 2; g.lineJoin = "round";
    for (const s of surfaces.surfaces) {
      if (s.c !== 0 && s.c !== 1 && s.c !== 3) continue;      // roadway, tram roadway, parking
      path(s.rings); g.stroke(); stats.verges++;
    }
    // ... but not across a sidewalk: a sidewalk + 0.6 m behind it is a garden's edge again
    g.strokeStyle = [1, 0.06, 0, 0]; g.fillStyle = [1, 0.06, 0, 0];
    g.lineWidth = 1.2;
    for (const s of surfaces.surfaces) {
      if (s.c !== 5) continue;
      path(s.rings); g.fill(); g.stroke();
    }
  }
  // OSM areas, weakest first
  const byKind = new Map();
  for (const a of feats.areas || []) {
    const k = kindOf(a, kinds);
    if (!k) continue;
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push(a);
  }
  for (const k of ORDER) {
    const list = byKind.get(k);
    if (!list) continue;
    g.fillStyle = KIND[k];
    for (const a of list) { path(a.rings || []); g.fill("evenodd"); }
    stats.areas[k] = list.length;
  }
  const img = g1.getImageData(0, 0, W, H).data, img2 = g2.getImageData(0, 0, W, H).data;
  // tree crowns: thinner grass, fewer flowers, a little longer (unmown round the trunk) in parks and meadows
  const shade = new Float32Array(W * H);
  for (const t of feats.trees || []) {
    const r = Math.min(9, Math.max(1.5, (t.crown || 4) * 0.85)), cx = px(t.x), cz = pz(t.z);
    if (cx < -r || cz < -r || cx > W + r || cz > H + r) continue;
    stats.crowns++;
    for (let j = Math.max(0, Math.floor(cz - r)); j <= Math.min(H - 1, Math.ceil(cz + r)); j++)
      for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(W - 1, Math.ceil(cx + r)); i++) {
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz) / r;
        if (d >= 1) continue;
        const s = 1 - d * d;
        const k = j * W + i;
        shade[k] = Math.max(shade[k], s);
      }
  }
  const data = new Uint8Array(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    const s = shade[k];
    data[k * 4] = Math.round(img[k * 4] * (1 - 0.55 * s));
    data[k * 4 + 1] = img[k * 4 + 1];
    data[k * 4 + 2] = img[k * 4 + 2];
    data[k * 4 + 3] = Math.round(img2[k * 4] * (1 - 0.7 * s));
  }
  return { data, W, H, stats };
}

/** trunks of the tile's trees: [x, z, radius] (the bake keeps grass out of them) */
export function trunkDiscs(feats, bounds) {
  const out = [];
  for (const t of feats.trees || []) {
    if (t.x < bounds.x0 || t.x > bounds.x1 || t.z < bounds.z0 || t.z > bounds.z1) continue;
    out.push([t.x, t.z, Math.min(0.75, 0.14 + 0.012 * (t.height || 12))]);
  }
  return out;
}
