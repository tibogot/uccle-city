// The map's worker: every expensive map draw happens here, in OffscreenCanvas, so a cache rebuild never costs the
// main thread a frame. Messages (all answered with the same `id`):
//   init { base }                                  -> ready { landmarks, stops, extent, counts, ms }
//   mini { cx, cz, s, side, dpr }                  -> mini { bitmap, cx, cz, s, side, dpr, ms }      (heading-free ground)
//   labels { px, pz, bear, s, r, dpr, lang, cur }  -> labels { list: [{ text, x, z, ang, w, h }], sprites: { text: bitmap }, ms }
//   where { x, z, bear, prevKey, ahead, lang }     -> where { cur, curKey, next, nextDist, ms }
//   full { cx, cz, s, w, h, dpr, lang, hl }        -> full { bitmap, view, ms }
//   search { q, lang }                             -> search { results }
//   snap { x, z, lang }                            -> snap { x, z, yaw, name, cross, d }
import { loadMap } from './mapData.js';
import { MapView, TextWidths, drawRoadLabels, overlaps, addLine } from '../../vendor/slop-map/mapCore.js';
import { PAL, FONT, drawGround, drawGlyph } from './mapStyle.js';

let M = null;
const tw = new TextWidths();
let miniCanvas = null, fullCanvas = null, spriteCanvas = null;
const sent = new Set();          // label sprites the main thread already holds
let hlKey = null, hlPath = null;

const post = (msg, transfer = []) => self.postMessage(msg, transfer);

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      M = await loadMap(m.base);
      post({ type: 'ready', id: m.id, landmarks: M.landmarks, stops: M.stops, extent: M.extent, boundary: M.boundary, counts: M.counts,
        roads: M.roads.length, names: M.names.length, ms: M.ms });
    } else if (!M) {
      post({ type: m.type, id: m.id, error: 'not ready' });
    } else if (m.type === 'mini') miniCache(m);
    else if (m.type === 'labels') miniLabels(m);
    else if (m.type === 'where') where(m);
    else if (m.type === 'full') full(m);
    else if (m.type === 'search') post({ type: 'search', id: m.id, results: M.search(m.q).map((it) => ({ ...it, roads: undefined, label: m.lang === 'nl' ? it.nl : it.fr, sub: m.lang === 'nl' ? it.fr : it.nl })) });
    else if (m.type === 'snap') snap(m);
    else if (m.type === 'spritesReset') sent.clear();
  } catch (err) {
    post({ type: m.type, id: m.id, error: String(err?.stack || err) });
  }
};

// ------------------------------------------------------------------ minimap: the ground, north up, square
function miniCache(m) {
  const t0 = performance.now();
  const px = Math.ceil(m.side * m.dpr);
  if (!miniCanvas) miniCanvas = new OffscreenCanvas(px, px);
  if (miniCanvas.width !== px) { miniCanvas.width = px; miniCanvas.height = px; }
  const ctx = miniCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAL.ground;
  ctx.fillRect(0, 0, px, px);
  const v = new MapView(m.cx, m.cz, m.s, m.side, m.side, m.dpr);
  drawGround(ctx, v, M, { mini: true });
  const bitmap = miniCanvas.transferToImageBitmap();
  post({ type: 'mini', id: m.id, bitmap, cx: m.cx, cz: m.cz, s: m.s, side: m.side, dpr: m.dpr, ms: +(performance.now() - t0).toFixed(2) }, [bitmap]);
}

// ------------------------------------------------------------------ minimap: upright street names (a separate pass)
const upright = (a) => { a = Math.atan2(Math.sin(a), Math.cos(a)); if (a > Math.PI / 2 + 0.01) a -= Math.PI; else if (a < -Math.PI / 2 - 0.01) a += Math.PI; return a; };

function sprite(text, fontPx, color, dpr) {
  const font = `600 ${fontPx}px ${FONT}`;
  if (!spriteCanvas) spriteCanvas = new OffscreenCanvas(8, 8);
  let ctx = spriteCanvas.getContext('2d');
  ctx.font = font;
  const w = Math.ceil(tw.textWidth(ctx, text) + 8), h = Math.ceil(fontPx + 8);
  spriteCanvas.width = Math.ceil(w * dpr); spriteCanvas.height = Math.ceil(h * dpr);
  ctx = spriteCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2; ctx.strokeStyle = PAL.label.halo; ctx.strokeText(text, w / 2, h / 2 + 0.5);
  ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2 + 0.5);
  return { bitmap: spriteCanvas.transferToImageBitmap(), w, h };
}

function miniLabels(m) {
  const t0 = performance.now();
  const { px, pz, bear, s, r, dpr } = m;
  const fontPx = 10.5;
  const labels = M.labels(m.lang);
  const reach = r / s;
  const cb = Math.cos(-bear), sb = Math.sin(-bear);
  const meas = spriteCanvas?.getContext('2d') || (spriteCanvas = new OffscreenCanvas(8, 8)).getContext('2d');
  meas.font = `600 ${fontPx}px ${FONT}`;
  const cands = [];
  for (const l of labels) {
    if (l.maxX < px - reach || l.minX > px + reach || l.maxZ < pz - reach || l.minZ > pz + reach) continue;
    const width = tw.textWidth(meas, l.text);
    const need = (width + 12) / s;
    for (const a0 of l.anchors) {
      if (a0.len < need * 0.45) continue;
      // slide the label along its straight run towards the player (the run spans a0 ± len/2 along ang)
      const ux = Math.cos(a0.ang), uz = Math.sin(a0.ang), lim = Math.max(0, a0.len / 2 - need * 0.3);
      const t0 = Math.max(-lim, Math.min(lim, (px - a0.x) * ux + (pz - a0.z) * uz));
      for (const dt of [0, need * 0.5 + 16 / s, -need * 0.5 - 16 / s, need + 24 / s, -need - 24 / s]) {
        const t = Math.max(-lim, Math.min(lim, t0 + dt));
        const a = { x: a0.x + ux * t, z: a0.z + uz * t, ang: a0.ang };
        const dx = (a.x - px) * s, dz = (a.z - pz) * s;
        const X = dx * cb - dz * sb, Y = dx * sb + dz * cb;
        const d = Math.hypot(X, Y);
        if (d > r - 12) continue;
        cands.push({ l, a, X, Y, width, score: (l.key === m.cur ? 2500 : 0) + (l.major ? 1500 : 0) + Math.min(a0.len * s, 300) - d * 1.2 - (dt ? 40 : 0) });
      }
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const placed = [[-10, -11, 10, 9]];       // the player's arrow
  const byName = new Map(), list = [], sprites = {}, transfer = [];
  for (const c of cands) {
    if (list.length >= 14) break;
    const same = byName.get(c.l.text);
    if (same && same.some(([x, y]) => Math.hypot(x - c.X, y - c.Y) < 150)) continue;
    const ang = upright(c.a.ang - bear);
    const hw = c.width * 0.5 + 3, hh = fontPx * 0.5 + 2;
    const ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
    const bx = hw * ca + hh * sa, by = hw * sa + hh * ca;
    const box = [c.X - bx, c.Y - by, c.X + bx, c.Y + by];
    // the label's four corners inside the disc
    const ux = Math.cos(ang) * hw, uy = Math.sin(ang) * hw, vx = -Math.sin(ang) * hh, vy = Math.cos(ang) * hh, lim2 = (r - 3) * (r - 3);
    if ([[1, 1], [1, -1], [-1, 1], [-1, -1]].some(([i, j]) => (c.X + i * ux + j * vx) ** 2 + (c.Y + i * uy + j * vy) ** 2 > lim2)) continue;
    if (overlaps(placed, box)) continue;
    placed.push(box);
    if (same) same.push([c.X, c.Y]); else byName.set(c.l.text, [[c.X, c.Y]]);
    const color = c.l.major ? PAL.label.major : PAL.label.minor;
    const key = `${c.l.text}|${color}|${dpr}`;
    if (!sent.has(key)) {
      const sp = sprite(c.l.text, fontPx, color, dpr);
      sprites[key] = sp; transfer.push(sp.bitmap); sent.add(key);
    }
    list.push({ key, x: c.a.x, z: c.a.z, ang: c.a.ang });
  }
  post({ type: 'labels', id: m.id, list, sprites, cands: cands.length, ms: +(performance.now() - t0).toFixed(2) }, transfer);
}

// ------------------------------------------------------------------ where am I
function where(m) {
  const t0 = performance.now();
  const w = M.where(m.x, m.z, m.bear, m.prevKey, m.ahead || 600);
  const nm = (nid) => (nid == null || nid < 0 ? null : { fr: M.names[nid][0], nl: M.names[nid][1] });
  post({ type: 'where', id: m.id, cur: w.cur ? nm(w.cur.nid) : null, curKey: w.cur?.key ?? null, curD: w.cur?.d ?? null,
    next: w.next ? w.next.nids.map(nm) : null, nextDist: w.next ? Math.round(w.next.dist) : null, ms: +(performance.now() - t0).toFixed(3) });
}

/** Nearest street point (teleport target, hover text): the road there, its direction, the nearest cross street. */
function snap(m) {
  const c = M.near(m.x, m.z, m.maxD || 120);
  const named = c.filter((h) => h.r.nid >= 0 && h.r.cls < 5);
  const h = named[0] || c[0];
  if (!h) { post({ type: 'snap', id: m.id, none: true }); return; }
  const lang = m.lang;
  const name = M.nameOf(h.r.nid, lang);
  let cross = null;
  for (const o of named) if (o.r.nid !== h.r.nid && M.keyOf(o.r.nid) !== M.keyOf(h.r.nid) && o.d < h.d + 60) { cross = M.nameOf(o.r.nid, lang); break; }
  post({ type: 'snap', id: m.id, x: h.px, z: h.pz, yaw: h.dir, name, cross, d: h.d, cls: h.r.cls });
}

// ------------------------------------------------------------------ full map frame
function full(m) {
  const t0 = performance.now();
  const W = Math.max(1, Math.round(m.w * m.dpr)), H = Math.max(1, Math.round(m.h * m.dpr));
  if (!fullCanvas) fullCanvas = new OffscreenCanvas(W, H);
  if (fullCanvas.width !== W || fullCanvas.height !== H) { fullCanvas.width = W; fullCanvas.height = H; }
  const ctx = fullCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAL.ground;
  ctx.fillRect(0, 0, W, H);
  const v = new MapView(m.cx, m.cz, m.s, m.w, m.h, m.dpr);
  if (m.hl !== hlKey) {          // the search highlight: every stretch of the matching street
    hlKey = m.hl; hlPath = null;
    if (m.hl) {
      hlPath = new Path2D();
      for (const r of M.roads) if (r.nid >= 0 && M.keyOf(r.nid) === m.hl) addLine(hlPath, r.pts);
    }
  }
  drawGround(ctx, v, M, { mini: false, highlight: hlPath });
  v.screen(ctx);
  const s = v.s, lang = m.lang;
  const placed = [];
  // landmarks first (their boxes keep the street names clear); heroes always, the rest when zoomed in
  ctx.font = `700 11px ${FONT}`;
  const pins = [];
  const rank = { hero: 0, station: 1, church: 2, castle: 3 };
  const lms = [...M.landmarks].sort((a, b) => rank[a.kind] - rank[b.kind]);
  for (const lm of lms) {
    if (lm.kind !== 'hero' && s < (lm.kind === 'station' ? 0.12 : 0.35)) continue;
    const lx = v.toX(lm.x), ly = v.toY(lm.z);
    if (Math.abs(lx) > m.w * 0.49 || Math.abs(ly) > m.h * 0.49) continue;
    const r = lm.kind === 'hero' ? 7.5 : 6;
    pins.push({ lm, lx, ly, r, text: lang === 'nl' ? lm.nl : lm.fr, side: 0 });
  }
  for (const p of pins) placed.push([p.lx - p.r - 2, p.ly - p.r - 2, p.lx + p.r + 2, p.ly + p.r + 2]);   // every pin first
  for (const p of pins) {        // then its name, right of the pin, else left
    if (!(p.lm.kind === 'hero' || p.lm.kind === 'station' || s > 0.5)) continue;
    const lw = tw.textWidth(ctx, p.text) + 6;
    for (const side of [1, -1]) {
      const box = side > 0 ? [p.lx + p.r + 2, p.ly - 8, p.lx + p.r + 4 + lw, p.ly + 7] : [p.lx - p.r - 4 - lw, p.ly - 8, p.lx - p.r - 2, p.ly + 7];
      if (overlaps(placed, box)) continue;
      placed.push(box); p.side = side; break;
    }
  }
  // area names (parks, woods, cemeteries, ponds), italic, where they fit
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const a of M.areas) {
    const minS = a.area > 400000 ? 0.06 : a.area > 60000 ? 0.18 : 0.45;
    if (s < minS) continue;
    const ax = v.toX(a.x), ay = v.toY(a.z);
    if (Math.abs(ax) > m.w * 0.47 || Math.abs(ay) > m.h * 0.47) continue;
    const text = lang === 'nl' ? a.nl : a.fr;
    ctx.font = `italic 600 ${a.area > 400000 ? 12.5 : 11}px ${FONT}`;
    const half = tw.textWidth(ctx, text) * 0.5 + 4;
    const box = [ax - half, ay - 8, ax + half, ay + 8];
    if (overlaps(placed, box)) continue;
    placed.push(box);
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.label.halo; ctx.strokeText(text, ax, ay);
    ctx.fillStyle = a.kind === 'water' ? PAL.waterLabel : PAL.areaLabel; ctx.fillText(text, ax, ay);
  }
  // tram stop names when close
  if (s >= 0.6) {
    ctx.font = `600 10px ${FONT}`; ctx.textAlign = 'left';
    for (const st of M.stops) {
      const sx = v.toX(st.x), sy = v.toY(st.z);
      if (Math.abs(sx) > m.w * 0.48 || Math.abs(sy) > m.h * 0.48) continue;
      const text = `${st.name}`, w2 = tw.textWidth(ctx, text);
      const box = [sx + 6, sy - 6, sx + 10 + w2, sy + 6];
      if (overlaps(placed, box)) continue;
      placed.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = PAL.label.halo; ctx.strokeText(text, sx + 7, sy);
      ctx.fillStyle = '#ff8f86'; ctx.fillText(text, sx + 7, sy);
    }
  }
  // street names (vendor placement, north up)
  const fontPx = Math.max(9.5, Math.min(12.5, Math.round(10 * Math.sqrt(Math.max(s, 0.4)) * 2) / 2));
  drawRoadLabels(ctx, v, M.labels(lang), tw, PAL.label, FONT, { fontPx, maxLabels: 420, sameNameGap: 280, placed, majorOnly: s < 0.32, q: m.hl || '' });
  // pins on top
  ctx.font = `700 11px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const p of pins) {
    ctx.save(); ctx.translate(p.lx, p.ly); drawGlyph(ctx, p.lm.kind, p.r); ctx.restore();
    if (p.side) {
      ctx.textAlign = p.side > 0 ? 'left' : 'right';
      const tx = p.lx + p.side * (p.r + 4);
      ctx.lineWidth = 3; ctx.strokeStyle = PAL.label.halo; ctx.strokeText(p.text, tx, p.ly);
      ctx.fillStyle = p.lm.kind === 'hero' ? PAL.hero : '#ffffff'; ctx.fillText(p.text, tx, p.ly);
    }
  }
  const bitmap = fullCanvas.transferToImageBitmap();
  post({ type: 'full', id: m.id, bitmap, view: { cx: m.cx, cz: m.cz, s: m.s, w: m.w, h: m.h, dpr: m.dpr }, ms: +(performance.now() - t0).toFixed(1) }, [bitmap]);
}
