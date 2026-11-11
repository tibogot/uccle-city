// The minimap (bottom left, round, heading-up). Per frame on the main thread: one rotated copy of the worker's ground
// cache, the street-name sprites (upright, placed by the worker in a separate pass), landmark glyphs, the view cone,
// the player arrow and the north marker. Everything else (the ground cache, the label placement, "which street am I
// on" and the next junction) is asked of viewer/map/mapWorker.js a few times per second and never waited for.
import { drawPlayerArrow } from '../../vendor/slop-map/mapCore.js';
import { PAL, FONT, drawGlyph } from './mapStyle.js';
import { injectMapCSS } from './mapCSS.js';

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Metres from the centre to the rim by mode and speed (walking ~110 m, a car ~250-400 m, flying out to ~1.1 km). */
export function radiusMetres(p) {
  const v = Math.max(0, p.speed || 0);
  if (p.mode === 'fly') return Math.min(1100, 260 + v * 8 + Math.max(0, (p.alt || 0) - 15) * 2.2);
  if (p.mode === 'drive') return Math.min(520, 150 + v * 14);
  if (p.mode === 'orbit') return Math.min(1100, 160 + Math.max(0, (p.alt || 0) - 20) * 1.4);
  return 110 + Math.max(0, v - 1.5) * 12;       // walk / third person (running: a bit wider)
}

export class Minimap {
  /** worker: a MapClient; opts: { size, onOpen(), lang } */
  constructor(client, opts = {}) {
    injectMapCSS();
    this.client = client;
    this.lang = opts.lang || 'fr';
    this.onOpen = opts.onOpen;
    this.el = document.createElement('div');
    this.el.className = 'umap-mini';
    this.el.innerHTML = `<div class="umap-disc" title="Map (M)"><canvas></canvas></div><div class="umap-street"><div class="umap-cur">…</div><div class="umap-next"></div></div>`;
    this.toggle = document.createElement('button');
    this.toggle.className = 'umap-toggle';
    this.toggle.title = 'Minimap';
    this.toggle.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 2.2 6 2v11.6l-6-2V6.2z" fill="currentColor"/></svg>`;
    this.toggle.onclick = () => this.el.classList.toggle('umap-open');
    (opts.parent || document.body).append(this.el, this.toggle);
    this.canvas = this.el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.elCur = this.el.querySelector('.umap-cur');
    this.elNext = this.el.querySelector('.umap-next');
    this.el.querySelector('.umap-disc').addEventListener('click', () => this.onOpen?.());
    this.cache = null;          // { bitmap, cx, cz, s, side }
    this.want = null;           // the cache request in flight
    this.labels = { list: [], at: 0, inflight: false, px: 0, pz: 0, bear: 0, s: 0 };
    this.sprites = new Map();
    this.whereState = { at: 0, inflight: false, key: null, text: '', next: '' };
    this.scale = 0;             // CSS px per metre (smoothed)
    this.paused = false;
    this.profile = new URLSearchParams(location.search).get('mapprof') === '1';
    this.stats = { frames: 0, total: 0, max: 0, recent: [], rebuilds: 0, rebuildMs: [], labelMs: [], whereMs: [], skipped: 0 };
    this.last = null;
    this.landmarks = client.landmarks || [];
    this.cone = null;
    this.trams = { prev: new Map(), cur: [], now: [], drawn: new Map(), t0: 0, t1: 0 };
    this.north = this.makeNorth();
    // the disc's CSS size, read on resize only (reading layout every frame would force a style / layout pass)
    this.css = 220;
    new ResizeObserver(() => { this.css = this.canvas.clientWidth || this.css; this.last = null; }).observe(this.canvas);
    this.small = matchMedia('(max-width: 640px), (max-height: 480px)');
  }

  makeNorth() {
    const c = document.createElement('canvas'), d = Math.min(devicePixelRatio || 1, 2);
    c.width = c.height = Math.ceil(18 * d);
    const x = c.getContext('2d');
    x.scale(d, d);
    x.beginPath(); x.arc(9, 9, 8, 0, TAU); x.fillStyle = '#e43c2e'; x.fill();
    x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,255,255,.95)'; x.stroke();
    x.font = `800 10px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('N', 9, 9.6);
    return c;
  }

  /** Live tram positions [{ trip, x, z }] (the host's own simulation, viewer/tramline.js positions()). */
  setTrams(list, now = performance.now()) {
    const T = this.trams;
    T.prev = new Map(T.cur.map((c) => [c.trip, c]));
    T.cur = list; T.t0 = T.t1 || now; T.t1 = now;
  }
  /** Tram positions now: [x0, z0, x1, z1, ...] (one sample late, interpolated; the full map uses it too). */
  interpTrams(now = performance.now()) {
    const T = this.trams, k = Math.min(1, (now - T.t1) / Math.max(1, T.t1 - T.t0));
    T.now.length = 0;
    for (const c of T.cur) { const q = T.prev.get(c.trip) || c; T.now.push(q.x + (c.x - q.x) * k, q.z + (c.z - q.z) * k); }
    return T.now;
  }

  setLang(l) { if (l !== this.lang) { this.lang = l; this.labels.at = 0; this.labels.list = []; this.whereState.text = '#'; } }

  // hidden on small screens until the map button opens it (mapCSS.js); no layout query per frame
  get visible() { return !this.paused && (!this.small.matches || this.el.classList.contains('umap-open')); }

  /**
   * p = { x, z, bear (camera, radians clockwise from north), heading (the player's), speed (m/s), alt (m above ground),
   *       mode: 'walk' | 'third' | 'drive' | 'fly' | 'orbit', fov (horizontal, radians), travel (bearing of motion or null) }
   */
  update(p, dt = 1 / 60) {
    if (this.profile) performance.mark('map:start');
    const t0 = performance.now();
    if (!this.visible) { this.stats.skipped++; return; }
    const css = this.css;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const bw = Math.round(css * dpr);
    if (this.canvas.width !== bw) { this.canvas.width = this.canvas.height = bw; this.last = null; }
    const R = css / 2;
    const target = R / radiusMetres(p);
    this.scale = this.scale ? this.scale + (target - this.scale) * (1 - Math.exp(-dt * 1.6)) : target;
    const s = this.scale;
    const now = t0;

    // 1. ground cache: a square covering the disc + a margin, north up; re-asked before the player reaches its edge
    //    or when the zoom drifts by > 10 %, centred a little ahead of the motion. The old one is used until it arrives.
    const c = this.cache;
    const side = Math.ceil(css * 2.2);
    if (!this.want) {
      const k = c ? s / c.s : 1;
      const covered = c && (c.side / 2) * k - Math.hypot(p.x - c.cx, p.z - c.cz) * s;     // px of cache left past the centre
      if (!c || k > 1.12 || k < 0.86 || covered < R * 1.33) {
        const lead = Math.min(R * 0.5, (p.speed || 0) * 4 * s) / s;
        const tb = p.travel ?? p.bear;
        const sReq = Math.max(s / 1.1, Math.min(s * 1.1, target));     // zooming: draw it part of the way to the coming scale
        this.want = { cx: p.x + Math.sin(tb) * lead, cz: p.z - Math.cos(tb) * lead, s: sReq, side: Math.ceil(side * Math.max(1, s / sReq)), dpr, t: now };
        this.client.request({ type: 'mini', ...this.want }).then((r) => {
          if (r.error) { this.want = null; return; }
          if (this.profile) performance.mark('map:recv-start');
          this.cache?.bitmap.close?.();
          this.cache = { bitmap: r.bitmap, cx: r.cx, cz: r.cz, s: r.s, side: r.side };
          this.stats.rebuilds++; this.stats.rebuildMs.push(r.ms); if (this.stats.rebuildMs.length > 200) this.stats.rebuildMs.shift();
          this.want = null; this.last = null;
          if (this.profile) performance.mark('map:recv-end');
        });
      }
    }

    // 2. street names: the worker places them for this position / heading / zoom, ~6 times a second at most
    const L = this.labels;
    if (!L.inflight && now - L.at > 160 && (Math.hypot(p.x - L.px, p.z - L.pz) * s > 6 || Math.abs(wrap(p.bear - L.bear)) > 0.07 || Math.abs(s / (L.s || 1) - 1) > 0.05 || !L.at)) {
      L.inflight = true; L.at = now;
      const ask = { px: p.x, pz: p.z, bear: p.bear, s, r: R, dpr, lang: this.lang, cur: this.whereState.key };
      this.client.request({ type: 'labels', ...ask }).then((r) => {
        L.inflight = false;
        if (r.error) return;
        for (const [k, sp] of Object.entries(r.sprites)) this.sprites.set(k, sp);
        if (this.sprites.size > 500) { for (const sp of this.sprites.values()) sp.bitmap.close?.(); this.sprites.clear(); this.client.post({ type: 'spritesReset' }); L.list = []; L.at = 0; return; }
        L.list = r.list; Object.assign(L, { px: ask.px, pz: ask.pz, bear: ask.bear, s: ask.s }); this.last = null;
        this.stats.labelMs.push(r.ms); if (this.stats.labelMs.length > 200) this.stats.labelMs.shift();
      });
    }

    // 3. where am I (4 Hz)
    const W = this.whereState;
    if (!W.inflight && now - W.at > 250) {
      W.inflight = true; W.at = now;
      const ahead = p.mode === 'drive' ? 450 : p.mode === 'fly' ? 0 : 220;
      this.client.request({ type: 'where', x: p.x, z: p.z, bear: p.mode === 'fly' || p.mode === 'orbit' ? null : (p.travel ?? p.heading), prevKey: W.key, ahead }).then((r) => {
        W.inflight = false;
        if (r.error) return;
        this.stats.whereMs.push(r.ms); if (this.stats.whereMs.length > 200) this.stats.whereMs.shift();
        W.key = r.curKey;
        const nm = (n) => (n ? (this.lang === 'nl' ? n.nl : n.fr) : '');
        const cur = r.cur ? nm(r.cur) : p.mode === 'fly' ? 'Uccle' : '';
        const showNext = r.next && r.nextDist != null && r.nextDist <= ahead;
        const next = showNext ? `${r.nextDist < 15 ? 'now' : `in ${Math.max(10, Math.round(r.nextDist / 10) * 10)} m`}: ${r.next.map(nm).join(' / ')}` : '';
        if (cur !== W.text) { W.text = cur; this.elCur.textContent = cur || '—'; }
        if (next !== W.next) { W.next = next; this.elNext.textContent = next; this.elNext.style.display = next ? '' : 'none'; }
        W.result = r;
      });
    }

    // 4. draw, skipped while the change stays under 0.35 px / 0.2° (round 2; was 0.25 px / 0.15°) (a canvas touched at all costs ~0.07 ms,
    //    measured; walking or driving straight moves the map < 0.1 px a frame, so it redraws ~15 times a second)
    // live trams (sampled a few times a second by the host, drawn one sample late, interpolated between the two)
    const T = this.trams;
    if (T.cur.length) {
      this.interpTrams(t0);
      let moved = false;
      for (let i = 0; i < T.cur.length; i++) {
        const c = T.cur[i], x = T.now[2 * i], z = T.now[2 * i + 1];
        const o = T.drawn.get(c.trip);
        if (!o || Math.hypot(o[0] - x, o[1] - z) * s > 0.4) moved = moved || Math.hypot(x - p.x, z - p.z) * s < R + 8;
      }
      if (moved && t0 - (this.drawT || 0) > 100) this.last = null;      // trams alone redraw it 10 times a second at most
    }
    const key = this.last;
    if (key && Math.hypot(key.x - p.x, key.z - p.z) * s < 0.35 && Math.abs(wrap(key.bear - p.bear)) < 0.0035 && Math.abs(wrap(key.heading - p.heading)) < 0.005 && Math.abs(key.s - s) / s < 0.003) {
      this.account(performance.now() - t0, false);
      return;
    }
    this.last = { x: p.x, z: p.z, bear: p.bear, heading: p.heading, s };
    this.draw(p, s, R, dpr);
    this.drawT = t0;
    this.account(performance.now() - t0, true);
  }

  account(ms, drawn) {
    const S = this.stats;
    if (this.profile) performance.mark(drawn ? 'map:end-draw' : 'map:end-skip');   // ?mapprof=1: marks for a trace (their trace timestamps are exact)
    S.frames++; S.total += ms; if (ms > S.max) S.max = ms;
    S.recent.push(ms); if (S.recent.length > 600) S.recent.shift();
    if (drawn) S.drawn = (S.drawn || 0) + 1;
  }

  draw(p, s, R, dpr) {
    const ctx = this.ctx, c = this.cache;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, R * 2, R * 2);
    ctx.save();
    ctx.beginPath(); ctx.arc(R, R, R - 1, 0, TAU); ctx.clip();
    ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, R * 2, R * 2);
    ctx.translate(R, R);
    if (c) {   // the ground, rotated so the camera looks up
      ctx.save();
      ctx.rotate(-p.bear);
      const k = s / c.s;
      ctx.scale(k, k);
      ctx.translate((c.cx - p.x) * c.s, (c.cz - p.z) * c.s);
      ctx.drawImage(c.bitmap, -c.side / 2, -c.side / 2, c.side, c.side);
      ctx.restore();
    }
    const cb = Math.cos(-p.bear), sb = Math.sin(-p.bear);
    const toScreen = (x, z) => { const dx = (x - p.x) * s, dz = (z - p.z) * s; return [dx * cb - dz * sb, dx * sb + dz * cb]; };
    // street names: curved sprites drawn north-up in the worker, turned with the map (one drawImage each)
    const ca = Math.cos(-p.bear), sa = Math.sin(-p.bear);
    for (const l of this.labels.list) {
      const sp = this.sprites.get(l.key);
      if (!sp) continue;
      const [X, Y] = toScreen(l.x, l.z);
      if (X * X + Y * Y > R * R) continue;
      const k = dpr * s / l.s0;
      ctx.setTransform(k * ca, k * sa, -k * sa, k * ca, dpr * (R + X), dpr * (R + Y));
      ctx.drawImage(sp.bitmap, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    }
    ctx.setTransform(dpr, 0, 0, dpr, dpr * R, dpr * R);
    // live trams 92 (STIB red dots)
    const T = this.trams;
    if (T.now.length) {
      T.drawn.clear();
      for (let i = 0; i < T.now.length; i += 2) {
        const [X, Y] = toScreen(T.now[i], T.now[i + 1]);
        if (X * X + Y * Y > (R - 4) * (R - 4)) continue;
        // a tram: a white disc with a red heart and a dark rim (a stop is a small red dot with a white ring)
        ctx.beginPath(); ctx.arc(X, Y, 6.2, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.label.halo; ctx.stroke();
        ctx.beginPath(); ctx.arc(X, Y, 3.6, 0, TAU); ctx.fillStyle = PAL.tram; ctx.fill();
      }
      T.cur.forEach((c, i) => T.drawn.set(c.trip, [T.now[2 * i], T.now[2 * i + 1]]));
    }
    // landmarks
    const reach2 = (R - 9) * (R - 9);
    for (const lm of this.landmarks) {
      if (lm.kind !== 'hero' && lm.kind !== 'station' && s < 0.25) continue;
      const [X, Y] = toScreen(lm.x, lm.z);
      if (X * X + Y * Y > reach2) continue;
      ctx.save(); ctx.translate(X, Y); drawGlyph(ctx, lm.kind, lm.kind === 'hero' ? 6 : 5); ctx.restore();
    }
    // view cone (the camera looks up) and the player's arrow (its own heading relative to the camera)
    if (!this.cone || this.cone.R !== R) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.62);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.32)'); g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.cone = { R, g };
    }
    const half = Math.min(1.2, Math.max(0.25, (p.fov || 1.4) / 2));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R * 0.62, -Math.PI / 2 - half, -Math.PI / 2 + half); ctx.closePath();
    ctx.fillStyle = this.cone.g; ctx.fill();
    ctx.save(); ctx.rotate(wrap(p.heading - p.bear));
    drawPlayerArrow(ctx, -9, 6.5, 7, PAL.label.halo, p.mode === 'drive' ? '#ffd84a' : '#ffffff');
    ctx.restore();
    ctx.restore();
    // rim and north marker
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath(); ctx.arc(R, R, R - 1.5, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(240, 244, 248, 0.9)'; ctx.stroke();
    const na = -p.bear - Math.PI / 2, nr = R - 10;
    ctx.drawImage(this.north, R + Math.cos(na) * nr - 9, R + Math.sin(na) * nr - 9, 18, 18);
  }

  /** Frame-time summary of update() (ms): avg, p50, p95, p99, max over the last ≤600 frames; cache rebuild times (worker). */
  summary() {
    const S = this.stats, r = [...S.recent].sort((a, b) => a - b), q = (f) => (r.length ? +r[Math.min(r.length - 1, Math.floor(f * r.length))].toFixed(4) : null);
    const avg = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null), mx = (a) => (a.length ? +Math.max(...a).toFixed(2) : null);
    return { frames: S.frames, drawn: S.drawn || 0, avgMs: r.length ? +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(4) : null, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1),
      rebuilds: S.rebuilds, workerRebuildMs: { avg: avg(S.rebuildMs), max: mx(S.rebuildMs) }, workerLabelMs: { avg: avg(S.labelMs), max: mx(S.labelMs) }, workerWhereMs: { avg: avg(S.whereMs), max: mx(S.whereMs) } };
  }
  resetStats() { Object.assign(this.stats, { frames: 0, total: 0, max: 0, recent: [], drawn: 0 }); this.stats.rebuildMs = []; this.stats.labelMs = []; this.stats.whereMs = []; this.stats.rebuilds = 0; }
}
