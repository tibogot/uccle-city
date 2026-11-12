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
import { MapView, TextWidths, overlaps, addLine } from '../../vendor/slop-map/mapCore.js';
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
    else if (m.type === 'spritesReset') { sent.clear(); spriteMeta.clear(); }
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

// ------------------------------------------------------------------ minimap: street names along the streets (a separate pass)
// Curved labels: each glyph sits on the street's polyline at its own arc length (advances from the text-width cache, so
// kerning is kept), turned with the street. The label reads left to right on screen (the reading direction is chosen
// for the current heading). A label is drawn ONCE into a north-up sprite (world orientation, at a zoom bucket of 8 %);
// the main thread turns the sprite with the map, so curved text costs one drawImage per label, like straight text.
// Candidate places are fixed arc lengths along each street (per zoom bucket), so the same sprite is reused from pass
// to pass. The abbreviation (Av., Ch., Bd, Pl., Sq.) competes with a lower score: it wins where the full name does not fit.
const FONT_PX = 10.5;
const ABBR = [[/^Avenue /, 'Av. '], [/^Chaussée /, 'Ch. '], [/^Boulevard /, 'Bd '], [/^Place /, 'Pl. '], [/^Square /, 'Sq. ']];
const abbrev = (t) => { for (const [re, a] of ABBR) if (re.test(t)) return t.replace(re, a); return null; };
const prefixes = new Map();      // text -> cumulative advance widths (px at FONT_PX), kerning included
function advances(ctx, text) {
  const pk = ctx.font + '|' + text;
  let a = prefixes.get(pk);
  if (!a) {
    a = [0];
    for (let i = 1; i <= text.length; i++) a.push(tw.textWidth(ctx, text.slice(0, i)));
    prefixes.set(pk, a);
  }
  return a;
}
/** Text along screen direction (dx, dy) reads upright: left to right, and upwards when (nearly) vertical. */
const readsForward = (dx, dy) => { const a = Math.atan2(dy, dx); return a > -Math.PI / 2 - 0.15 && a <= Math.PI / 2 - 0.15; };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const spriteMeta = new Map();    // sprite key -> its centre in the world

/** Glyph centres (world) and angles for `text` centred at arc length c of chain l, reading with dir = ±1. */
function layoutCurved(l, text, c, adv, s0, dir) {
  const W = adv[adv.length - 1] / s0;           // metres
  const g = [];
  let maxTurn = 0, prev = null;
  for (let i = 0; i < adv.length - 1; i++) {
    const mid = (adv[i] + adv[i + 1]) / 2 / s0;
    const d = c + dir * (mid - W / 2);
    const p = M.pointAt(l, d), ang = M.dirAt(l, d) + (dir < 0 ? Math.PI : 0);
    if (prev != null) maxTurn = Math.max(maxTurn, Math.abs(wrapA(ang - prev)));
    prev = ang;
    g.push({ x: p.x, z: p.z, ang, ch: text[i] });
  }
  return { g, maxTurn };
}

function curvedSprite(glyphs, s0, dpr, color, fpx) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const q of glyphs) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
  const pad = fpx + 4;
  const w = Math.ceil((x1 - x0) * s0 + 2 * pad), h = Math.ceil((z1 - z0) * s0 + 2 * pad);
  if (!spriteCanvas) spriteCanvas = new OffscreenCanvas(8, 8);
  spriteCanvas.width = Math.ceil(w * dpr); spriteCanvas.height = Math.ceil(h * dpr);
  const ctx = spriteCanvas.getContext('2d');
  ctx.font = `600 ${fpx}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    for (const q of glyphs) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate((q.x - x0) * s0 + pad, (q.z - z0) * s0 + pad);
      ctx.rotate(q.ang);
      if (pass === 0) { ctx.lineWidth = 3.2; ctx.strokeStyle = PAL.label.halo; ctx.strokeText(q.ch, 0, 0.5); }
      else { ctx.fillStyle = color; ctx.fillText(q.ch, 0, 0.5); }
    }
  }
  return { bitmap: spriteCanvas.transferToImageBitmap(), w, h, cx: x0 + (w / 2 - pad) / s0, cz: z0 + (h / 2 - pad) / s0 };
}

function miniLabels(m) {
  const t0 = performance.now();
  const { px, pz, bear, s, r, dpr } = m;
  // zoom bucket with hysteresis: keep the last one while within 10 % (speed changes the zoom all the time when
  // driving; a new bucket re-renders every sprite and the main thread uploads each new one)
  let bucket = Math.round(Math.log(s) / Math.log(1.08));
  if (miniLabels.bucket != null && Math.abs(s / Math.pow(1.08, miniLabels.bucket) - 1) < 0.1) bucket = miniLabels.bucket;
  miniLabels.bucket = bucket;
  const s0 = Math.pow(1.08, bucket);
  const labels = M.labels(m.lang);
  const reach = r / s;
  const cb = Math.cos(-bear), sb = Math.sin(-bear);
  const toS = (x, z) => { const dx = (x - px) * s, dz = (z - pz) * s; return [dx * cb - dz * sb, dx * sb + dz * cb]; };
  const meas = spriteCanvas?.getContext('2d') || (spriteCanvas = new OffscreenCanvas(8, 8)).getContext('2d');
  meas.font = `600 ${FONT_PX}px ${FONT}`;
  const cands = [];
  for (const l of labels) {
    if (l.maxX < px - reach || l.minX > px + reach || l.maxZ < pz - reach || l.minZ > pz + reach) continue;
    const fpx = l.major ? FONT_PX : FONT_PX - 1;                   // side streets a point smaller: more of them fit
    meas.font = `600 ${fpx}px ${FONT}`;
    for (const [variant, text] of [[0, l.text], [1, abbrev(l.text)]]) {
      if (!text) continue;
      const adv = advances(meas, text), need = (adv[adv.length - 1] + 6) / s0;
      if (l.len < need) continue;
      const step = Math.max(need * 0.3, 12 / s0);
      for (let c = need / 2; c <= l.len - need / 2 + 0.01; c += step) {
        const p = M.pointAt(l, c);
        const [X, Y] = toS(p.x, p.z);
        const d = Math.hypot(X, Y);
        if (d > r - 10) continue;
        cands.push({ l, text, variant, c, adv, fpx, X, Y, score: (l.key === m.cur ? 2500 : 0) + (l.major ? 1500 : 0) - d * 1.2 - variant * 400 });
      }
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const placed = [[-8, -10, 8, 8]];       // the player's arrow
  const byName = new Map(), list = [], sprites = {}, transfer = [];
  const lim2 = (r - 3) * (r - 3);
  let tried = 0;
  for (const c of cands) {
    if (list.length >= 16 || tried > 400) break;
    const same = byName.get(c.l.key);
    if (same && same.some(([x, y]) => Math.hypot(x - c.X, y - c.Y) < 120)) continue;
    tried++;
    // reading direction: left to right on screen for the current heading
    const e0 = M.pointAt(c.l, c.c - 5), e1 = M.pointAt(c.l, c.c + 5), s0p = toS(e0.x, e0.z), s1p = toS(e1.x, e1.z);
    const dir = readsForward(s1p[0] - s0p[0], s1p[1] - s0p[1]) ? 1 : -1;
    const { g, maxTurn } = layoutCurved(c.l, c.text, c.c, c.adv, s0, dir);
    if (maxTurn > 0.55) continue;                                   // too sharp a bend for text
    const boxes = [], hh = c.fpx * 0.5 + 1.5;
    let ok = true;
    for (const q of g) {
      const [X, Y] = toS(q.x, q.z);
      if (X * X + Y * Y > lim2) { ok = false; break; }
      boxes.push([X - hh, Y - hh, X + hh, Y + hh]);
    }
    if (!ok || boxes.some((b) => overlaps(placed, b))) continue;
    placed.push(...boxes);
    if (same) same.push([c.X, c.Y]); else byName.set(c.l.key, [[c.X, c.Y]]);
    const color = c.l.major ? PAL.label.major : PAL.label.minor;
    const key = `${c.text}|${c.l.id}|${c.c.toFixed(1)}|${dir}|${bucket}|${dpr}`;
    let sp = spriteMeta.get(key);
    if (!sent.has(key) || !sp) {
      const made = curvedSprite(g, s0, dpr, color, c.fpx);
      sp = { cx: made.cx, cz: made.cz };
      spriteMeta.set(key, sp);
      sprites[key] = { bitmap: made.bitmap, w: made.w, h: made.h };
      transfer.push(made.bitmap); sent.add(key);
    }
    list.push({ key, x: sp.cx, z: sp.cz, world: true, s0 });
  }
  if (spriteMeta.size > 3000) spriteMeta.clear();
  post({ type: 'labels', id: m.id, list, sprites, cands: cands.length, ms: +(performance.now() - t0).toFixed(2) }, transfer);
}

/**
 * Full map street names: the same curved layout, north up, drawn straight into the frame (after the vendor
 * drawRoadLabels' rules: the best place of each street, one per street per sameNameGap px, no overlaps, search hits
 * first, main roads only when zoomed out). Curved text along the merged chains names long streets at every zoom.
 */
/** Placed label boxes in a 32 px grid (the full map places thousands of glyph boxes: a flat list made it O(n²)). */
class BoxGrid {
  constructor(boxes = []) { this.cells = new Map(); for (const b of boxes) this.add(b); }
  *keys(b) { for (let i = Math.floor(b[0] / 32); i <= Math.floor(b[2] / 32); i++) for (let j = Math.floor(b[1] / 32); j <= Math.floor(b[3] / 32); j++) yield i * 65536 + j; }
  add(b) { for (const k of this.keys(b)) { let c = this.cells.get(k); if (!c) this.cells.set(k, (c = [])); c.push(b); } }
  hits(b) { for (const k of this.keys(b)) { const c = this.cells.get(k); if (c && overlaps(c, b)) return true; } return false; }
}

function fullCurvedLabels(ctx, v, labels, placedList, { fontPx, maxLabels, sameNameGap, majorOnly, q }) {
  const s = v.s, cands = [];
  const placed = new BoxGrid(placedList);
  const T0 = performance.now(); let tLayout = 0, tDraw = 0, nCand = 0;
  const inset = (fontPx * 2) / s;
  for (const l of labels) {
    if (l.maxX < v.minX + inset || l.minX > v.maxX - inset || l.maxZ < v.minZ + inset || l.minZ > v.maxZ - inset) continue;
    const hit = !!q && l.raw === q;
    if (majorOnly && !l.major && !hit) continue;
    ctx.font = `600 ${fontPx}px ${FONT}`;
    const adv = advances(ctx, l.text), need = (adv[adv.length - 1] + 10) / s;
    if (l.len < need) continue;
    const step = Math.max(need * 0.75, 30 / s);
    for (let c = need / 2; c <= l.len - need / 2 + 0.01; c += step) {
      const p = M.pointAt(l, c);
      if (p.x < v.minX + inset || p.x > v.maxX - inset || p.z < v.minZ + inset || p.z > v.maxZ - inset) continue;
      const d = Math.hypot(p.x - v.cx, p.z - v.cz) * s;
      cands.push({ l, c, adv, X: v.toX(p.x), Y: v.toY(p.z), hit, score: (hit ? 1e6 : 0) + (l.highway ? 3000 : 0) + (l.major ? 2000 : 0) + Math.min(l.len * s, 400) - d * 0.5 });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const T1 = performance.now(); nCand = cands.length;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const byName = new Map(), fails = new Map(), hh = fontPx * 0.5 + 1.5;
  let n = 0;
  for (const c of cands) {
    if (n >= maxLabels) break;
    const same = byName.get(c.l.key);
    if (same && same.some(([x, y]) => Math.hypot(x - c.X, y - c.Y) < sameNameGap)) continue;
    if ((fails.get(c.l.id) || 0) >= 3) continue;                       // a street that fits nowhere: stop trying
    if (placed.hits([c.X - hh, c.Y - hh, c.X + hh, c.Y + hh])) { fails.set(c.l.id, (fails.get(c.l.id) || 0) + 1); continue; }
    // the two ends first (cheap), then the whole layout
    const half = c.adv[c.adv.length - 1] / 2 / s;
    const e0 = M.pointAt(c.l, c.c - half), e1 = M.pointAt(c.l, c.c + half);
    if (placed.hits([v.toX(e0.x) - hh, v.toY(e0.z) - hh, v.toX(e0.x) + hh, v.toY(e0.z) + hh]) || placed.hits([v.toX(e1.x) - hh, v.toY(e1.z) - hh, v.toX(e1.x) + hh, v.toY(e1.z) + hh])) { fails.set(c.l.id, (fails.get(c.l.id) || 0) + 1); continue; }
    const dir = readsForward(e1.x - e0.x, e1.z - e0.z) ? 1 : -1;
    const { g, maxTurn } = layoutCurved(c.l, c.l.text, c.c, c.adv, s, dir);
    if (maxTurn > 0.55) { fails.set(c.l.id, (fails.get(c.l.id) || 0) + 1); continue; }
    const boxes = g.map((q2) => { const X = v.toX(q2.x), Y = v.toY(q2.z); return [X - hh, Y - hh, X + hh, Y + hh]; });
    const hw = v.w / 2 - 3, hhv = v.h / 2 - 3;
    if (boxes.some((b) => b[0] < -hw || b[2] > hw || b[1] < -hhv || b[3] > hhv)) continue;     // whole label in view
    if (boxes.some((b) => placed.hits(b))) { fails.set(c.l.id, (fails.get(c.l.id) || 0) + 1); continue; }
    for (const b of boxes) placed.add(b);
    if (same) same.push([c.X, c.Y]); else byName.set(c.l.key, [[c.X, c.Y]]);
    const color = c.hit ? PAL.label.search : c.l.highway ? PAL.label.highway : c.l.major ? PAL.label.major : PAL.label.minor;
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.label.halo; ctx.fillStyle = color;
    for (const pass of [0, 1]) for (const q2 of g) {
      const cs = Math.cos(q2.ang) * v.dpr, sn = Math.sin(q2.ang) * v.dpr;
      ctx.setTransform(cs, sn, -sn, cs, v.dpr * (v.w / 2 + v.toX(q2.x)), v.dpr * (v.h / 2 + v.toY(q2.z)));
      if (pass === 0) ctx.strokeText(q2.ch, 0, 0.5); else ctx.fillText(q2.ch, 0, 0.5);
    }
    n++;
  }
  v.screen(ctx);
  fullCurvedLabels.last = { cands: nCand, candMs: +(T1 - T0).toFixed(1), placeMs: +(performance.now() - T1).toFixed(1) };
  return n;
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
  const streetNames = fullCurvedLabels(ctx, v, M.labels(lang), placed, { fontPx, maxLabels: 420, sameNameGap: 280, majorOnly: s < 0.32, q: m.hl || '' });
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
  post({ type: 'full', id: m.id, bitmap, streetNames, labelTiming: fullCurvedLabels.last, view: { cx: m.cx, cz: m.cz, s: m.s, w: m.w, h: m.h, dpr: m.dpr }, ms: +(performance.now() - t0).toFixed(1) }, [bitmap]);
}
