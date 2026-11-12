// Our map style (palette + what is drawn at which zoom), shared by the minimap cache and the full map, both drawn in
// viewer/map/mapWorker.js. s = CSS pixels per metre. Layers come from viewer/map/mapData.js.
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// "Slate atlas": a blue-grey ground, real greens, buildings a step lighter than the ground, streets lighter still and
// warm on the main roads; STIB red for tram 92. Readable on any sky: the minimap is an opaque disc with a light rim.
export const PAL = {
  ground: '#1d232b',
  outside: 'rgba(10, 13, 17, 0.42)',       // veil over everything outside Uccle (full map)
  boundary: 'rgba(214, 222, 232, 0.55)',
  park: '#25402e', garden: '#233a2b', grass: '#28432f', wood: '#1d3a28', scrub: '#26402c', cemetery: '#29372f',
  pitch: '#2b4a35', playground: '#2b4a35', water: '#1f4766', waterEdge: '#2e5d82',
  bld: ['#323a45', '#39424e', '#434d5b'], bldEdge: '#262c35',
  casing: '#12161b',
  road: ['#cf9d58', '#b98f5a', '#8b95a2', '#6c7683', '#5f6975', '#4d5661'],   // primary .. service
  path: 'rgba(170, 186, 160, 0.55)', steps: 'rgba(190, 200, 170, 0.7)',
  rail: '#8e949c', railTie: '#1d232b', tramTrack: '#6d4a4a',
  tram: '#e43c2e', tramStop: '#ffffff',
  label: { halo: 'rgba(12, 15, 19, 0.92)', search: '#5fd0ff', highway: '#f1c27d', major: '#eef1f5', minor: '#c1c9d3' },
  search: '#5fd0ff',
  areaLabel: 'rgba(150, 205, 160, 0.78)', waterLabel: 'rgba(130, 180, 225, 0.8)',
  hero: '#ffc94a', church: '#e9e4d8', station: '#6fb6ff', castle: '#d9b8ff',
};

// minimum on-screen widths (px) per road class, and the zoom below which a class is not drawn
const MIN_W = [2.6, 2.2, 1.7, 1.1, 1.0, 0.7];
const HIDE_BELOW = [0, 0, 0, 0.06, 0.12, 0.3];

/** The ground layers in world metres (v = vendor MapView). L = mapData layers. opt: { mini, highlight: Path2D } */
export function drawGround(ctx, v, L, opt = {}) {
  const s = v.s, px = (n) => n / s;
  v.world(ctx);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fill = (layer, color) => { ctx.fillStyle = color; L.geo[layer].each(v, (p) => ctx.fill(p)); };

  // 1. land cover, then water
  for (const k of ['grass', 'park', 'garden', 'cemetery', 'scrub', 'wood', 'pitch', 'playground']) fill(k, PAL[k]);
  fill('water', PAL.water);
  if (s > 0.4) { ctx.strokeStyle = PAL.waterEdge; ctx.lineWidth = px(1); L.geo.water.each(v, (p) => ctx.stroke(p)); }

  // 2. buildings (three height tones), outlined when big enough to read
  if (s >= 0.1) {
    for (let i = 0; i < 3; i++) fill(`bld${i}`, PAL.bld[i]);
    if (s >= 0.9) {
      ctx.strokeStyle = PAL.bldEdge; ctx.lineWidth = px(0.8);
      for (let i = 0; i < 3; i++) L.geo[`bld${i}`].each(v, (p) => ctx.stroke(p));
    }
  }

  // 3. rail: grey line with dark ties; tram tracks (all lines) thin
  if (s >= 0.05) {
    ctx.strokeStyle = PAL.rail; ctx.lineWidth = Math.max(px(2.2), 3.5);
    L.geo.rail.each(v, (p) => ctx.stroke(p));
    if (s >= 0.25) {
      ctx.setLineDash([px(2), px(5)]); ctx.strokeStyle = PAL.railTie; ctx.lineWidth = Math.max(px(1.2), 1.6);
      L.geo.rail.each(v, (p) => ctx.stroke(p)); ctx.setLineDash([]);
    }
  }

  // 4. roads: casings (when wide enough), then fills, minor first
  const buckets = L.roadBuckets;
  const wOf = (b) => Math.max(px(MIN_W[b.cls]), b.w * 0.8);     // a touch narrower than kerb to kerb: the map stays legible
  if (s >= 0.35) {
    ctx.strokeStyle = PAL.casing;
    for (const b of buckets) { if (s < HIDE_BELOW[b.cls]) continue; ctx.lineWidth = wOf(b) + px(s > 1.2 ? 2 : 1.4); b.layer.each(v, (p) => ctx.stroke(p)); }
  }
  for (const b of buckets) {
    if (s < HIDE_BELOW[b.cls]) continue;
    ctx.strokeStyle = PAL.road[b.cls]; ctx.lineWidth = wOf(b);
    b.layer.each(v, (p) => ctx.stroke(p));
  }

  // 5. footpaths and steps (walkers' scale)
  if (s >= 0.7) {
    ctx.setLineDash([px(3), px(2.5)]);
    ctx.strokeStyle = PAL.path; ctx.lineWidth = px(1.1);
    L.geo.paths.each(v, (p) => ctx.stroke(p));
    ctx.strokeStyle = PAL.steps; ctx.lineWidth = px(1.6); ctx.setLineDash([px(1), px(1)]);
    L.geo.steps.each(v, (p) => ctx.stroke(p));
    ctx.setLineDash([]);
  }

  // 6. other tram tracks, then tram 92 (STIB red) and its stops
  if (s >= 0.12) { ctx.strokeStyle = PAL.tramTrack; ctx.lineWidth = px(1.2); L.geo.tram.each(v, (p) => ctx.stroke(p)); }
  ctx.strokeStyle = PAL.tram; ctx.lineWidth = px(opt.mini ? 2 : 2.2);
  ctx.stroke(L.tramPath);
  const r = opt.mini ? 3.2 : s > 0.5 ? 4 : 2.8;
  for (const st of L.stops) {
    if (st.x < v.minX - 50 || st.x > v.maxX + 50 || st.z < v.minZ - 50 || st.z > v.maxZ + 50) continue;
    ctx.beginPath(); ctx.arc(st.x, st.z, px(r), 0, Math.PI * 2);
    ctx.fillStyle = PAL.tram; ctx.fill();
    ctx.lineWidth = px(1.3); ctx.strokeStyle = PAL.tramStop; ctx.stroke();
  }

  // 7. the commune line (and, on the full map, a veil outside it)
  if (!opt.mini) {
    ctx.fillStyle = PAL.outside;
    ctx.fill(L.outsidePath, 'evenodd');
  }
  ctx.setLineDash([px(8), px(5)]);
  ctx.strokeStyle = PAL.boundary; ctx.lineWidth = px(opt.mini ? 1.6 : 1.4);
  ctx.stroke(L.boundaryPath);
  ctx.setLineDash([]);

  // 8. search highlight
  if (opt.highlight) { ctx.strokeStyle = PAL.search; ctx.lineWidth = Math.max(px(3.5), 8); ctx.globalAlpha = 0.85; ctx.stroke(opt.highlight); ctx.globalAlpha = 1; }
}

/** A landmark glyph centred at (0, 0) in CSS px (any context, main thread or worker). */
export function drawGlyph(ctx, kind, r = 6) {
  const col = PAL[kind] || PAL.church;
  ctx.beginPath(); ctx.arc(0, 0, r + 1.6, 0, Math.PI * 2); ctx.fillStyle = PAL.label.halo; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
  ctx.fillStyle = PAL.label.halo; ctx.strokeStyle = PAL.label.halo; ctx.lineWidth = Math.max(1.2, r * 0.26); ctx.lineCap = 'butt';
  const k = r / 6;
  if (kind === 'hero') {             // a star
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 1.9 : 4.4) * k; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  } else if (kind === 'church') {    // a cross
    ctx.beginPath(); ctx.moveTo(0, -3.8 * k); ctx.lineTo(0, 3.8 * k); ctx.moveTo(-2.6 * k, -1.2 * k); ctx.lineTo(2.6 * k, -1.2 * k); ctx.stroke();
  } else if (kind === 'station') {   // rails
    ctx.beginPath(); ctx.moveTo(-1.6 * k, -3.6 * k); ctx.lineTo(-1.6 * k, 3.6 * k); ctx.moveTo(1.6 * k, -3.6 * k); ctx.lineTo(1.6 * k, 3.6 * k);
    for (const y of [-2.2, 0, 2.2]) { ctx.moveTo(-3 * k, y * k); ctx.lineTo(3 * k, y * k); }
    ctx.lineWidth = Math.max(1, r * 0.18); ctx.stroke();
  } else if (kind === 'castle') {    // a tower
    ctx.fillRect(-3 * k, -1.5 * k, 6 * k, 4.5 * k);
    for (const x of [-3, -0.9, 1.2]) ctx.fillRect(x * k, -3.6 * k, 1.8 * k, 2.4 * k);
  }
}
