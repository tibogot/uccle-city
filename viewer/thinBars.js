// THIN BARS, PRE-FILTERED (claude/jitter, rule 35 provisional; docs/JITTER.md). Pure JS (no three): shared by the
// viewer (viewer/gardens/gardenKit.js, viewer/facadeKit/kitField.js) and the census / gate
// (tools/audit/census/thinBars.mjs, tools/audit/jitterCheck.mjs).
//
// WHY: garden gates and railings, balcony railings and door / cellar grilles are bars 8-20 mm wide. Under the TAAU
// (1080 x 0.6 internal rows at Auto's floor, fov 55: PXM = 622 px per metre at 1 m) a 16 mm bar is 1 px at 10 m and
// 0.36 px at 28 m (the kit's LOD0 end). A bar under ~1 px is hit or missed by each jitter phase; the history's
// neighbourhood clamp throws the misses away: the bars crawl / shimmer as the camera moves (owner 2026-11-18, the same
// mechanism as rule 23 / the Lycée railing, docs/LYCEE.md).
// FIX: the bars' COVERAGE drawn instead of the bars once they get thin: a card in the bars' plane whose texture is the
// bars' exact coverage (rasterised here from the modelled LOD0 at load: 16 x supersampled, box mips = the true mean
// share of each texel footprint, no alpha test) BLENDED (the Lycée A/B: blended beat alpha-to-coverage under the TAAU);
// the modelled bars kept close up (they hide the card, which lies inside them) and dithered out between NEAR and
// NEAR + BAND m (viewer/lodFade.js dither: no pop); the card fades in under them first (no halo of its magnified edge).
// The sun's shadow keeps the modelled bars over their old range (no shadow change).

/** ?jitter=old: the modelled bars over every LOD's range, no cards (viewer/features.js) */
export const JITTER_OLD = typeof location !== "undefined" && /[?&]jitter=old(&|$)/.test(location.search || "");
/** px per metre at 1 m: 1080 x 0.6 internal rows (Auto's floor), vertical fov 55 */
export const PXM = (1080 * 0.6) / (2 * Math.tan((55 * Math.PI) / 360));
/** the modelled bars draw to NEAR m, dithered out by NEAR + BAND; the card fades in over CARD_IN */
export const NEAR = 4, BAND = 2, CARD_IN = [2.5, 3.5];
/** the garden ironwork's old LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end] (gardenKit.js BANDS) */
export const IRON_BANDS = { rail: [22, 60, 150], gate: [22, 60, 150], cargate: [25, 70, 160] };
/** the façade kit's carded strokes stay geometry while they are >= STROKE_PX wide: to strokeEnd(w) m (at least
 *  CARD_IN[1] + 1, at most KIT_END_MAX), dithered out over strokeBand(end) before it; aKitW.w = end x 20 */
export const STROKE_PX = 1.3, KIT_END_MAX = 12;
export const strokeEnd = (w) => Math.min(KIT_END_MAX, Math.max(CARD_IN[1] + 1, (w * PXM) / STROKE_PX));
/** the dither band before a stroke's end (it never reaches into the card's fade-in) */
export const strokeBand = (end) => Math.min(BAND, Math.max(1, end - CARD_IN[1]));
export const endByte = (w) => Math.min(255, Math.max(1, Math.round(strokeEnd(w) * 20)));
/** a thin stroke: 4V / A (the side of a square bar, the diameter of a round one) under this (m) */
export const THIN_W = 0.03;
/** card texture density (texels per metre) */
export const TEX_PER_M = 200;

/** components of an indexed (or not) triangle mesh, vertices welded by position (eps m): -> { comp (per vertex), n } */
export function components(pos, index = null, eps = 1e-4) {
  const nv = pos.length / 3, parent = new Int32Array(nv);
  for (let i = 0; i < nv; i++) parent[i] = i;
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a < b ? b : a] = a < b ? a : b; };
  const key = new Map(), q = 1 / eps;
  let big = false; for (let i = 0; i < pos.length; i++) if (Math.abs(pos[i] * q) > 32000) { big = true; break; }
  for (let i = 0; i < nv; i++) {
    const x = Math.round(pos[i * 3] * q), y = Math.round(pos[i * 3 + 1] * q), z = Math.round(pos[i * 3 + 2] * q);
    const k = big ? `${x},${y},${z}` : ((x + 32768) * 65536 + (y + 32768)) * 65536 + (z + 32768);
    const o = key.get(k); if (o === undefined) key.set(k, i); else join(i, o);
  }
  const nt = index ? index.length / 3 : nv / 3;
  for (let t = 0; t < nt; t++) {
    const a = index ? index[t * 3] : t * 3, b = index ? index[t * 3 + 1] : t * 3 + 1, c = index ? index[t * 3 + 2] : t * 3 + 2;
    join(a, b); join(a, c);
  }
  const ids = new Map(), comp = new Int32Array(nv);
  for (let i = 0; i < nv; i++) { const r = find(i); let id = ids.get(r); if (id === undefined) ids.set(r, (id = ids.size)); comp[i] = id; }
  return { comp, n: ids.size };
}

/** per component: area, |volume|, bbox, triangles; w = 4V / A (stroke width), thin = a stroke (not a plate) under THIN_W */
export function strokes(pos, index = null, cc = components(pos, index), keep = null) {
  const S = Array.from({ length: cc.n }, () => ({ A: 0, V: 0, tris: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
  const nt = index ? index.length / 3 : pos.length / 9;
  for (let t = 0; t < nt; t++) {
    const ia = index ? index[t * 3] : t * 3, ib = index ? index[t * 3 + 1] : t * 3 + 1, ic = index ? index[t * 3 + 2] : t * 3 + 2;
    if (keep && !keep(ia)) continue;
    const s = S[cc.comp[ia]];
    const ax = pos[ia * 3], ay = pos[ia * 3 + 1], az = pos[ia * 3 + 2];
    const bx = pos[ib * 3] - ax, by = pos[ib * 3 + 1] - ay, bz = pos[ib * 3 + 2] - az;
    const cx = pos[ic * 3] - ax, cy = pos[ic * 3 + 1] - ay, cz = pos[ic * 3 + 2] - az;
    const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
    s.A += Math.hypot(nx, ny, nz) / 2;
    s.V += (ax * nx + ay * ny + az * nz) / 6;                 // divergence theorem (closed parts; open ones approximate)
    s.tris++;
    for (const i of [ia, ib, ic]) for (let k = 0; k < 3; k++) { const v = pos[i * 3 + k]; if (v < s.min[k]) s.min[k] = v; if (v > s.max[k]) s.max[k] = v; }
  }
  for (const s of S) {
    if (!s.tris) { s.thin = false; s.w = 0; continue; }
    const e = [0, 1, 2].map((k) => s.max[k] - s.min[k]).sort((a, b) => b - a);
    s.len = e[0];
    // stroke width: 4V / A, bounded by the bbox's middle extent (a flat ribbon / open part has ~0 volume)
    const w4 = s.A > 0 ? (4 * Math.abs(s.V)) / s.A : 0;
    s.w = w4 > 0.001 ? Math.min(w4, e[1]) : e[1];
    const plate = s.A > 0.9 * e[0] * e[1] && e[1] > 0.04;       // covers its bbox's big face (once): a plate / panel, not a stroke
    s.thin = !plate && s.w < THIN_W && s.len > 4 * s.w && s.A > 20 * s.w * s.w;
  }
  return S;
}

/** projected width (internal px) of a stroke w m wide at d m */
export const px = (w, d) => (w * PXM) / Math.max(d, 1e-3);

/**
 * COVERAGE RASTER: triangles projected on a card plane -> per texel coverage and per-triangle attributes averaged
 * over the covered samples, supersampled ss x ss. tris: Float32Array (u, v per vertex: 6 floats a triangle); rect
 * [u0, v0, u1, v1] (metres) over W x H texels. Union: a sample is covered once (the last triangle drawn over it wins).
 * attrs: (tri, out) => fills out[0..nch-1] (e.g. slot shares, AO) for a triangle. -> { cov, ch: [Float32Array] }
 * (ch[c] coverage-weighted: ch[c][texel] = sum over its covered samples of attr c / samples)
 */
export function rasterCoverage(tris, rect, W, H, ss = 4, nch = 0, attrs = null) {
  const SW = W * ss, SH = H * ss, S = new Int32Array(SW * SH);          // 0 = empty, 1 + triangle
  const [u0, v0, u1, v1] = rect, ku = SW / (u1 - u0), kv = SH / (v1 - v0);
  const nt = tris.length / 6;
  for (let t = 0; t < nt; t++) {
    const ax = (tris[t * 6] - u0) * ku, ay = (tris[t * 6 + 1] - v0) * kv, bx = (tris[t * 6 + 2] - u0) * ku, by = (tris[t * 6 + 3] - v0) * kv, cx = (tris[t * 6 + 4] - u0) * ku, cy = (tris[t * 6 + 5] - v0) * kv;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const sg = area > 0 ? 1 : -1;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(SW - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(SH - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const qx = x + 0.5;
        if (((bx - ax) * (py - ay) - (by - ay) * (qx - ax)) * sg >= 0 && ((cx - bx) * (py - by) - (cy - by) * (qx - bx)) * sg >= 0 && ((ax - cx) * (py - cy) - (ay - cy) * (qx - cx)) * sg >= 0) S[y * SW + x] = t + 1;
      }
    }
  }
  const cov = new Float32Array(W * H), ch = Array.from({ length: nch }, () => new Float32Array(W * H)), inv = 1 / (ss * ss);
  const TA = new Float32Array(Math.max(1, nt * nch)), A = new Float32Array(Math.max(1, nch));
  if (nch) for (let t = 0; t < nt; t++) { attrs(t, A); for (let c = 0; c < nch; c++) TA[t * nch + c] = A[c] * inv; }
  for (let y = 0; y < SH; y++) {
    const row = ((y / ss) | 0) * W, sr = y * SW;
    for (let x = 0; x < SW; x++) {
      const s = S[sr + x]; if (!s) continue;
      const o = row + ((x / ss) | 0);
      cov[o] += inv;
      for (let c = 0, q = (s - 1) * nch; c < nch; c++) ch[c][o] += TA[q + c];
    }
  }
  return { cov, ch };
}

/**
 * A shelf-packed atlas of coverage cells -> RGBA8 levels with box mips (each level the exact mean of the one above:
 * the share of the footprint covered, for BLENDING; no alpha test, so no coverage-preserving rescale is needed).
 * cells: [{ W, H, rgba: Float32Array W*H*4 (r, g, b premultiplied by a; a = coverage) }], width: the atlas width.
 * -> { width, height, levels: [{ data: Uint8Array, width, height }], place: [[x, y]] per cell (texels) }
 * encode(v, c): the 8-bit encoding of channel c (0..3) of a level texel (default linear)
 */
export function packAtlas(cells, width = 1024, gutter = 4, encode = null) {
  let x = gutter, y = gutter, row = 0;
  const place = [];
  const order = cells.map((c, i) => i).sort((a, b) => cells[b].H - cells[a].H);
  for (const i of order) {
    const c = cells[i];
    if (x + c.W + gutter > width) { x = gutter; y += row + gutter; row = 0; }
    place[i] = [x, y];
    x += c.W + gutter; row = Math.max(row, c.H);
  }
  let height = 1; while (height < y + row + gutter) height *= 2;
  let w = width, h = height, lv = new Float32Array(w * h * 4);
  cells.forEach((c, i) => {
    const [px0, py0] = place[i];
    for (let yy = 0; yy < c.H; yy++) lv.set(c.rgba.subarray(yy * c.W * 4, (yy + 1) * c.W * 4), ((py0 + yy) * w + px0) * 4);
  });
  const levels = [];
  const pack = (a, w, h) => {
    const d = new Uint8Array(w * h * 4);
    if (encode) for (let i = 0; i < d.length; i++) d[i] = Math.round(Math.min(1, Math.max(0, encode(a[i], i & 3))) * 255);
    else for (let i = 0; i < d.length; i++) { const v = a[i]; d[i] = v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0; }
    return { data: d, width: w, height: h };
  };
  levels.push(pack(lv, w, h));
  while (w > 1 || h > 1) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), next = new Float32Array(nw * nh * 4);
    for (let yy = 0; yy < nh; yy++) {
      const r0 = Math.min(h - 1, yy * 2) * w, r1 = Math.min(h - 1, yy * 2 + 1) * w;
      for (let xx = 0; xx < nw; xx++) {
        const c0 = Math.min(w - 1, xx * 2), c1 = Math.min(w - 1, xx * 2 + 1);
        const i00 = (r0 + c0) * 4, i01 = (r0 + c1) * 4, i10 = (r1 + c0) * 4, i11 = (r1 + c1) * 4, o = (yy * nw + xx) * 4;
        for (let c = 0; c < 4; c++) next[o + c] = (lv[i00 + c] + lv[i01 + c] + lv[i10 + c] + lv[i11 + c]) * 0.25;
      }
    }
    lv = next; w = nw; h = nh;
    levels.push(pack(lv, w, h));
  }
  return { width, height, levels, place };
}

/** mean coverage of a level (the census: every mip keeps level 0's mean, within the 8-bit rounding) */
export function meanAlpha(level) { let s = 0; for (let i = 3; i < level.data.length; i += 4) s += level.data[i]; return s / (level.data.length / 4) / 255; }

/** the garden ironwork's draw plan for `piece` (rail | gate | cargate): what is drawn as geometry over which colour /
 *  shadow range, and the card's range. old (?jitter=old): the three modelled LODs over their bands, no card. */
export function ironPlan(piece, old = false) {
  const [s1, s2, end] = IRON_BANDS[piece];
  if (old) return { geometry: [{ lod: 0, colour: [0, s1 * 1.1], shadow: [0, s1 * 1.1] }, { lod: 1, colour: [s1 * 0.9, s2 * 1.1], shadow: null }, { lod: 2, colour: [s2 * 0.9, end], shadow: null }], card: null };
  return { geometry: [{ lod: 0, colour: [0, NEAR + BAND], shadow: [0, s1 * 1.1] }], card: { colour: [CARD_IN[0], end] } };
}

/** the façade kit's draw plan: per LOD the colour range of its geometry and of its CARDED strokes (the thin parts a card
 *  replaces), the card's range. R = kitRanges() (kitFade.js). old: the strokes as geometry over the LOD's range. */
export function kitPlan(R, old = false) {
  const l0 = [0, R.lod1], l1 = [R.lod1 - R.lodBand, R.far];
  if (old) return { lods: [{ colour: l0, carded: l0 }, { colour: l1, carded: l1 }], card: null };
  return { lods: [{ colour: l0, carded: "strokeEnd" }, { colour: l1, carded: [0, 0] }], card: [CARD_IN[0], R.far] };
}

/** the kit slots a card carries (kit.json slots: 4 wood_frame_white, 5 wood_frame_dark, 7 cast_iron_green, 8
 *  painted_metal_white, 13 copper_patina, 15 metal_anodised, 17 garage_steel, 18 rubber_black); stone / brick / glass
 *  strokes stay geometry (their look is the façade's) */
export const KIT_CARD_SLOTS = [4, 5, 7, 8, 13, 15, 17, 18];
/** a kit slot index -> card channel: 0 wood_frame_white (the variant's dark wood), 1 cast_iron_green, 2 the light
 *  metals (painted white, anodised, garage steel), 3 = the dark rest (dark wood, copper, rubber); the card's a = all */
export const KIT_CHANNEL = (slot) => (slot === 4 ? 0 : slot === 7 ? 1 : slot === 8 || slot === 15 || slot === 17 ? 2 : 3);
const STRETCHY = { window: "window", door: "door", french: "french", frenchX: "french", garage: "garage" };
/** a kit piece's 9-slice cuts in its own frame (kitField.js stretch): x: +-bx (null: no x stretch), y: [by0, by1] (null: none) */
export function kitCuts(mode, json) {
  const r = STRETCHY[mode] ? json.ref[STRETCHY[mode]] : null;
  if (!r) return { bx: null, by: null };
  return { bx: r[0] / 2 - json.slice.x, by: mode === "frenchX" ? null : [json.slice.bottom, r[1] - json.slice.top] };
}
/** a vertex's displacement under a test stretch (hsx = 0.3, dH = 0.3) for its 9-slice class (cx, cy) */
function kitMove(x, y, cx, cy, cuts) {
  const hsx = 0.3, dH = 0.3;
  let dx = 0, dy = 0;
  if (cuts.bx !== null) dx = cx === 0 ? (x * hsx) / cuts.bx : cx * hsx;
  if (cuts.by !== null) dy = cy < 0 ? 0 : cy > 0 ? dH : ((y - cuts.by[0]) * dH) / (cuts.by[1] - cuts.by[0]);
  return [dx, dy];
}
const posClass = (v, lo, hi) => (v < lo - 1e-4 ? -1 : v > hi + 1e-4 ? 1 : 0);
/** the class a card point at (x, y) takes (by position; on a cut both classes put it in the same place) */
const cardClass = (x, y, cuts) => [cuts.bx === null ? 0 : posClass(x, -cuts.bx, cuts.bx), cuts.by === null ? 0 : posClass(y, cuts.by[0], cuts.by[1])];
/** the card's misfit allowance (m) at the test stretch (0.6 m wider and taller than the reference): beyond it a
 *  stroke stays geometry */
export const KIT_MISFIT = 0.012;

/**
 * THE FAÇADE KIT'S CARDS. pieces: { name: { mode, lods: [{ pos, index, kv (aKitV bytes), kw (aKitW bytes) }] } }, json
 * (kit.json: slice, ref). Per piece: its LOD0 thin strokes that a card can follow (the 9-slice stretch moves them as
 * a card point at the same place within KIT_MISFIT, no arched bend) clustered by plane (front: by z, side returns: by
 * x), one card per plane (quads cut at the 9-slice lines, each quad one class: it stretches like the strokes),
 * rasterised into one atlas (tex texels a metre, channels KIT_CHANNEL); the strokes it carries flagged per LOD
 * (LOD1: its thin strokes whose middle is within 2 cm of a carded LOD0 stroke's). flags: 0 = geometry as before, else
 * the stroke's end x 20 (endByte; LOD1: 1 = never, the card carries it).
 * -> { atlas, cards: { name: { pos, nrm, uv, kv, kw, idx } }, flags: { name: [Uint8Array per LOD] }, stats }
 */
export function kitCards(pieces, json, { tex = 128, width = 2048, ss = 3 } = {}) {
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const t0 = now();
  const cells = [], plan = [], flags = {}, stats = { pieces: 0, cards: 0, carded: 0, kept: [], ms: 0 };
  for (const [name, P] of Object.entries(pieces)) {
    flags[name] = P.lods.map((l) => (l ? new Uint8Array(l.pos.length / 3) : null));
    const g = P.lods[0]; if (!g) continue;
    const cuts = kitCuts(P.mode, json);
    const cc = components(g.pos, g.index), S = strokes(g.pos, g.index, cc);
    const nv = g.pos.length / 3;
    const misfit = new Float32Array(cc.n), bent = new Uint8Array(cc.n), slotOf = new Int16Array(cc.n).fill(-1);
    for (let i = 0; i < nv; i++) {
      const c = cc.comp[i]; if (!S[c].thin) continue;
      if (slotOf[c] < 0) slotOf[c] = g.kv[i * 4 + 3] >> 2;
      const x = g.pos[i * 3], y = g.pos[i * 3 + 1];
      const a = kitMove(x, y, Math.round((g.kv[i * 4] / 255) * 2) - 1, Math.round((g.kv[i * 4 + 1] / 255) * 2) - 1, cuts);
      const [px_, py_] = cardClass(x, y, cuts), b = kitMove(x, y, px_, py_, cuts);
      misfit[c] = Math.max(misfit[c], Math.hypot(a[0] - b[0], a[1] - b[1]));
      if (g.kw[i * 4 + 2] > 0) bent[c] = 1;
    }
    const take = [];
    S.forEach((s, c) => {
      if (!s.thin) return;
      const why = !KIT_CARD_SLOTS.includes(slotOf[c]) ? `slot ${json.slots?.[slotOf[c]] ?? slotOf[c]}` : bent[c] ? "arched" : misfit[c] > KIT_MISFIT ? `misfit ${(misfit[c] * 1000).toFixed(0)} mm` : null;
      if (why) { stats.kept.push({ piece: name, w: +s.w.toFixed(4), at: [0, 1, 2].map((k) => +((s.min[k] + s.max[k]) / 2).toFixed(2)), why }); return; }
      take.push(c);
    });
    if (!take.length) continue;
    stats.pieces++; stats.carded += take.length;
    const carded = new Set(take);
    for (let i = 0; i < nv; i++) if (carded.has(cc.comp[i])) flags[name][0][i] = endByte(S[cc.comp[i]].w);
    const mids = take.map((c) => [0, 1, 2].map((k) => (S[c].min[k] + S[c].max[k]) / 2));
    P.lods.forEach((l, li) => {
      if (!l || li === 0) return;
      const c1 = components(l.pos, l.index), S1 = strokes(l.pos, l.index, c1);
      const ok = S1.map((s) => s.thin && mids.some((m) => Math.hypot(m[0] - (s.min[0] + s.max[0]) / 2, m[1] - (s.min[1] + s.max[1]) / 2, m[2] - (s.min[2] + s.max[2]) / 2) < 0.02));
      for (let i = 0; i < l.pos.length / 3; i++) if (ok[c1.comp[i]]) flags[name][li][i] = 1;
    });
    // planes: front (z extent <= x extent) by z, side returns by x
    const groups = [];
    for (const c of take) {
      const s = S[c], side = s.max[2] - s.min[2] > s.max[0] - s.min[0];
      const k = side ? (s.min[0] + s.max[0]) / 2 : (s.min[2] + s.max[2]) / 2;
      let gr = groups.find((q) => q.side === side && Math.abs(q.k - k) < 0.03);
      if (!gr) groups.push((gr = { side, k, sum: 0, n: 0, comps: new Set() }));
      gr.comps.add(c); gr.sum += k; gr.n++; gr.k = gr.sum / gr.n;
    }
    for (const gr of groups) {
      const tris = [], ch = [];
      let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
      for (let t = 0; t < g.index.length / 3; t++) {
        const a = g.index[t * 3]; if (!gr.comps.has(cc.comp[a])) continue;
        for (let k = 0; k < 3; k++) {
          const i = g.index[t * 3 + k], u = gr.side ? g.pos[i * 3 + 2] : g.pos[i * 3], v = g.pos[i * 3 + 1];
          tris.push(u, v); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
        }
        ch.push(KIT_CHANNEL(g.kv[a * 4 + 3] >> 2));
      }
      const m = 1.5 / tex; u0 -= m; v0 -= m;
      const W = Math.max(2, Math.ceil((u1 + m - u0) * tex)), H = Math.max(2, Math.ceil((v1 + m - v0) * tex));
      u1 = u0 + W / tex; v1 = v0 + H / tex;
      const R = rasterCoverage(new Float32Array(tris), [u0, v0, u1, v1], W, H, ss, 3, (t, o) => { o[0] = ch[t] === 0 ? 1 : 0; o[1] = ch[t] === 1 ? 1 : 0; o[2] = ch[t] === 2 ? 1 : 0; });
      const rgba = new Float32Array(W * H * 4);
      for (let i = 0; i < W * H; i++) { rgba[i * 4] = R.ch[0][i]; rgba[i * 4 + 1] = R.ch[1][i]; rgba[i * 4 + 2] = R.ch[2][i]; rgba[i * 4 + 3] = R.cov[i]; }
      plan.push({ name, gr, rect: [u0, v0, u1, v1], cell: cells.length, cuts });
      cells.push({ W, H, rgba });
      stats.cards++;
    }
  }
  const atlas = packAtlas(cells, width);
  // the card geometry: per plane quads between the 9-slice cuts, each quad's 4 vertices in its middle's class
  const cards = {};
  for (const p of plan) {
    const o = (cards[p.name] ??= { pos: [], nrm: [], uv: [], kv: [], kw: [], idx: [] });
    const [u0, v0, u1, v1] = p.rect, [ax, ay] = atlas.place[p.cell], cell = cells[p.cell];
    const along = p.gr.side ? [u0, u1] : [u0, ...(p.cuts.bx !== null ? [-p.cuts.bx, p.cuts.bx].filter((x) => x > u0 && x < u1) : []), u1];
    const up = [v0, ...(p.cuts.by ? p.cuts.by.filter((y) => y > v0 && y < v1) : []), v1];
    const nrm = p.gr.side ? [Math.sign(p.gr.k) || 1, 0, 0] : [0, 0, 1];
    for (let j = 0; j < up.length - 1; j++) for (let i = 0; i < along.length - 1; i++) {
      const mu = (along[i] + along[i + 1]) / 2, mv = (up[j] + up[j + 1]) / 2;
      const [cx, cy] = cardClass(p.gr.side ? p.gr.k : mu, mv, p.cuts);
      const base = o.pos.length / 3;
      for (const [u, v] of [[along[i], up[j]], [along[i + 1], up[j]], [along[i + 1], up[j + 1]], [along[i], up[j + 1]]]) {
        o.pos.push(p.gr.side ? p.gr.k : u, v, p.gr.side ? u : p.gr.k); o.nrm.push(...nrm);
        o.uv.push((ax + ((u - u0) / (u1 - u0)) * cell.W) / atlas.width, (ay + ((v - v0) / (v1 - v0)) * cell.H) / atlas.height);
        o.kv.push(cx === -1 ? 0 : cx === 1 ? 255 : 128, cy === -1 ? 0 : cy === 1 ? 255 : 128, 255, 0);
        o.kw.push(0, 0, 0, 0);
      }
      o.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  stats.ms = +(now() - t0).toFixed(0);
  return { atlas, cards, flags, stats };
}

/** the garden ironwork channels: r = the gilded tips' share, g = the dark steel's share, b = the AO-weighted
 *  coverage, a = coverage */
/**
 * THE GARDEN IRONWORK'S CARDS. pieces: { name: { pos, index, slot (Float32Array per vertex: slot + 0.99 x AO) } } (the
 * LOD0 as gardenKit.js merges it), tipSlot / steelSlot: the slot ids. One card a piece in its bars' mid plane (z = 0,
 * the module's frame), over its LOD0's x / y extent; rasterised into one atlas.
 * -> { atlas, cards: { name: { pos, nrm, uv, idx } }, stats }
 */
export function ironCards(pieces, { tipSlot, steelSlot, tex = TEX_PER_M, width = 1024, ss = 3 }) {
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const t0 = now();
  const cells = [], plan = [];
  for (const [name, g] of Object.entries(pieces)) {
    const tris = [], at = [];
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    const nt = g.index.length / 3;
    for (let t = 0; t < nt; t++) {
      let ao = 0, sl = 0;
      for (let k = 0; k < 3; k++) {
        const i = g.index[t * 3 + k], u = g.pos[i * 3], v = g.pos[i * 3 + 1];
        tris.push(u, v); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
        const s = g.slot[i]; ao += Math.min(1, (s - Math.floor(s + 0.0005)) / 0.99) / 3; if (k === 0) sl = Math.floor(s + 0.0005);
      }
      at.push(sl, ao);
    }
    const m = 1.5 / tex; u0 -= m; v0 -= m;
    const W = Math.max(2, Math.ceil((u1 + m - u0) * tex)), H = Math.max(2, Math.ceil((v1 + m - v0) * tex));
    u1 = u0 + W / tex; v1 = v0 + H / tex;
    const R = rasterCoverage(new Float32Array(tris), [u0, v0, u1, v1], W, H, ss, 3, (t, o) => { o[0] = at[t * 2] === tipSlot ? 1 : 0; o[1] = at[t * 2] === steelSlot ? 1 : 0; o[2] = at[t * 2 + 1]; });
    const rgba = new Float32Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { rgba[i * 4] = R.ch[0][i]; rgba[i * 4 + 1] = R.ch[1][i]; rgba[i * 4 + 2] = R.ch[2][i]; rgba[i * 4 + 3] = R.cov[i]; }
    plan.push({ name, rect: [u0, v0, u1, v1], cell: cells.length });
    cells.push({ W, H, rgba });
  }
  const atlas = packAtlas(cells, width);
  const cards = {};
  for (const p of plan) {
    const [u0, v0, u1, v1] = p.rect, [ax, ay] = atlas.place[p.cell], c = cells[p.cell];
    const U0 = ax / atlas.width, U1 = (ax + c.W) / atlas.width, V0 = ay / atlas.height, V1 = (ay + c.H) / atlas.height;
    cards[p.name] = { pos: [u0, v0, 0, u1, v0, 0, u1, v1, 0, u0, v1, 0], nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], uv: [U0, V0, U1, V0, U1, V1, U0, V1], idx: [0, 1, 2, 0, 2, 3] };
  }
  return { atlas, cards, stats: { cards: plan.length, ms: +(now() - t0).toFixed(0), texels: atlas.width * atlas.height } };
}
