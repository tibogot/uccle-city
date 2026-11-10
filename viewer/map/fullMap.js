// The full map (key M, or a click on the minimap): pan (mouse / one finger), wheel zoom about the cursor, pinch zoom,
// bilingual search of streets / landmarks / tram stops / parks, collision-free labels, scale bar, compass, credits,
// click to teleport. The map itself is drawn by viewer/map/mapWorker.js; while a new frame is on its way the last one
// is shown moved and scaled to the current view, so panning never waits for the worker.
import { MapView, attachPanZoom, drawScaleBar, drawPlayerArrow } from '../../vendor/slop-map/mapCore.js';
import { PAL, FONT } from './mapStyle.js';
import { injectMapCSS } from './mapCSS.js';

const MIN_ZOOM = 0.05, MAX_ZOOM = 5;
const isTyping = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };

export class FullMap {
  /** opts: { getPlayer() -> { x, z, heading }, onTeleport({ x, z, yaw, name }), lang, onLang(l), onToggle(open) } */
  constructor(client, opts) {
    injectMapCSS();
    Object.assign(this, { client, opts, lang: opts.lang || 'fr', open: false });
    const el = (this.el = document.createElement('div'));
    el.className = 'umap-full';
    el.innerHTML = `<canvas></canvas>
      <div class="umap-bar">
        <div class="umap-search"><input type="search" placeholder="Search streets, places, tram stops… (FR / NL)" autocomplete="off" spellcheck="false"><div class="umap-results"></div></div>
        <div class="umap-btns"><button data-a="out" title="Zoom out">−</button><button data-a="in" title="Zoom in">+</button><button data-a="me" title="Centre on me">◎</button>
          <button data-a="all" title="All of Uccle">Uccle</button><button data-a="lang" title="Street names in French / Dutch">FR</button><button data-a="close" title="Close (Esc)">✕</button></div>
      </div>
      <div class="umap-me"></div>
      <div class="umap-info">Drag to pan · wheel or pinch to zoom · click a street to go there</div>
      <svg class="umap-compass" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="rgba(20,24,30,.88)" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>
        <path d="M22 6 27 22H17z" fill="#e43c2e"/><path d="M22 38 17 22h10z" fill="#c9d1db"/><text x="22" y="16.5" font-size="8" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui">N</text></svg>
      <div class="umap-credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · UrbIS © CIRB/BRIC CC0 · STIB-MIVB GTFS CC BY 4.0</div>`;
    document.body.append(el);
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.input = el.querySelector('input');
    this.results = el.querySelector('.umap-results');
    this.info = el.querySelector('.umap-info');
    this.me = el.querySelector('.umap-me');
    this.langBtn = el.querySelector('[data-a=lang]');
    this.langBtn.textContent = this.lang.toUpperCase();
    this.st = { viewCenterX: 0, viewCenterZ: 0, viewZoom: 0.6 };
    this.frame = null;          // { bitmap, view }
    this.inflight = false;
    this.hl = null;             // highlighted street key (search)
    this.pin = null;            // { x, z, name }: the searched place / the teleport target
    this.stats = { frames: [], requests: 0 };
    this.pz = attachPanZoom(this.canvas, this.st, {
      isOpen: () => this.open, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, wrap: this.el, render: () => this.render(),
      onHover: (x, z) => this.hover(x, z), onClick: (x, z) => this.click(x, z),
    });
    this.pinch();
    el.querySelector('.umap-btns').addEventListener('click', (e) => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a) return;
      const c = this.centre();
      if (a === 'in' || a === 'out') this.zoomAbout(a === 'in' ? 1.45 : 1 / 1.45, c.w / 2, c.h / 2);
      else if (a === 'me') { const p = opts.getPlayer(); Object.assign(this.st, { viewCenterX: p.x, viewCenterZ: p.z, viewZoom: 1.4 }); this.render(); }
      else if (a === 'all') this.fitAll();
      else if (a === 'lang') this.setLang(this.lang === 'fr' ? 'nl' : 'fr', true);
      else if (a === 'close') this.toggle(false);
    });
    let tSearch = 0;
    this.input.addEventListener('input', () => { clearTimeout(tSearch); tSearch = setTimeout(() => this.search(this.input.value), 70); });
    this.input.addEventListener('keydown', (e) => {
      const items = [...this.results.children];
      let i = items.findIndex((d) => d.classList.contains('sel'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[i]?.classList.remove('sel'); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length); items[i]?.classList.add('sel'); }
      else if (e.key === 'Enter') { (items[i] || items[0])?.click(); }
      else if (e.key === 'Escape') { if (this.input.value) { this.input.value = ''; this.search(''); } else this.toggle(false); }
    });
    // keys: M toggles (not while typing), Esc closes; while open no key reaches the 3D modes (capture phase, first)
    addEventListener('keydown', (e) => {
      if (this.open) {
        if (e.code === 'Escape' && !isTyping(e)) { this.toggle(false); e.preventDefault(); }
        else if (e.code === 'KeyM' && !isTyping(e)) this.toggle(false);
        if (!isTyping(e)) e.stopImmediatePropagation();
      } else if (e.code === 'KeyM' && !isTyping(e) && !e.ctrlKey && !e.metaKey && !e.altKey) this.toggle(true);
    }, true);
    // keys typed in the search box stop here, before the 3D modes' window listeners see them
    el.addEventListener('keydown', (e) => e.stopPropagation());
    el.addEventListener('keyup', (e) => e.stopPropagation());
    addEventListener('resize', () => { if (this.open) { this.resize(); this.render(); } });
  }

  centre() { return { w: this.canvas.clientWidth || innerWidth, h: this.canvas.clientHeight || innerHeight }; }
  setLang(l, notify) { this.lang = l; this.langBtn.textContent = l.toUpperCase(); this.frame = null; this.render(); if (this.input.value) this.search(this.input.value); if (notify) this.opts.onLang?.(l); }

  toggle(open) {
    if (open === this.open) return;
    this.open = open;
    this.el.classList.toggle('on', open);
    this.opts.onToggle?.(open);
    if (open) {
      const p = this.opts.getPlayer();
      Object.assign(this.st, { viewCenterX: p.x, viewCenterZ: p.z, viewZoom: Math.max(this.st.viewZoom, 0.5) });
      this.resize();
      this.render();
      this.loop();
    } else {
      this.pz.cancelPan();
      this.input.blur();
    }
  }

  resize() {
    const { w, h } = this.centre();
    const dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(6e6 / Math.max(1, w * h)));
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.frame = null;
  }

  fitAll() {
    const [x0, z0, x1, z1] = this.client.extent, { w, h } = this.centre();
    Object.assign(this.st, { viewCenterX: (x0 + x1) / 2, viewCenterZ: (z0 + z1) / 2, viewZoom: Math.max(MIN_ZOOM, Math.min(w / ((x1 - x0) * 1.04), h / ((z1 - z0) * 1.04))) });
    this.render();
  }

  zoomAbout(f, mx, my) {
    const { w, h } = this.centre(), st = this.st;
    const bx = st.viewCenterX + (mx - w / 2) / st.viewZoom, bz = st.viewCenterZ + (my - h / 2) / st.viewZoom;
    st.viewZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, st.viewZoom * f));
    st.viewCenterX = bx - (mx - w / 2) / st.viewZoom; st.viewCenterZ = bz - (my - h / 2) / st.viewZoom;
    this.render();
  }

  /** Two fingers: zoom about their midpoint (the vendor pan handles one finger). */
  pinch() {
    const pts = new Map();
    let base = null;
    const mid = () => { const a = [...pts.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const r = this.canvas.getBoundingClientRect();
      pts.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
      if (pts.size === 2) { this.pz.cancelPan(); this.st.dragMoved = true; base = { ...mid(), zoom: this.st.viewZoom, cx: this.st.viewCenterX, cz: this.st.viewCenterZ }; }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const r = this.canvas.getBoundingClientRect();
      pts.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
      if (pts.size !== 2 || !base) return;
      const m = mid(), { w, h } = this.centre(), st = this.st;
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, base.zoom * m.d / Math.max(1, base.d)));
      const wx = base.cx + (base.x - w / 2) / base.zoom, wz = base.cz + (base.y - h / 2) / base.zoom;     // world under the first midpoint
      st.viewZoom = z; st.viewCenterX = wx - (m.x - w / 2) / z; st.viewCenterZ = wz - (m.y - h / 2) / z;
      this.render();
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) base = null; };
    for (const t of ['pointerup', 'pointercancel']) this.canvas.addEventListener(t, up);
  }

  // ---------------------------------------------------------------- drawing
  render() { this.dirty = true; }

  loop() {
    if (!this.open) return;
    requestAnimationFrame(() => this.loop());
    const t0 = performance.now();
    this.requestFrame();
    this.draw();
    this.stats.frames.push(performance.now() - t0); if (this.stats.frames.length > 300) this.stats.frames.shift();
  }

  view() { const { w, h } = this.centre(); return { cx: this.st.viewCenterX, cz: this.st.viewCenterZ, s: this.st.viewZoom, w, h, dpr: this.dpr }; }

  requestFrame() {
    const v = this.view(), f = this.frame?.view;
    const same = f && f.cx === v.cx && f.cz === v.cz && f.s === v.s && f.w === v.w && f.h === v.h && this.frame.lang === this.lang && this.frame.hl === this.hl;
    if (same || this.inflight) return;
    this.inflight = true;
    const ask = { lang: this.lang, hl: this.hl };
    this.stats.requests++;
    this.client.request({ type: 'full', ...v, ...ask }).then((r) => {
      this.inflight = false;
      if (r.error) { console.warn(r.error); return; }
      this.frame?.bitmap.close?.();
      this.frame = { bitmap: r.bitmap, view: r.view, ms: r.ms, ...ask };
      this.lastMs = r.ms;
      this.dirty = true;
    });
  }

  draw() {
    const ctx = this.ctx, dpr = this.dpr, { w, h } = this.centre();
    const v = new MapView(this.st.viewCenterX, this.st.viewCenterZ, this.st.viewZoom, w, h, dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const f = this.frame;
    if (f) {   // the last frame, moved / scaled to this view
      const k = v.s / f.view.s;
      const ox = (f.view.cx - f.view.w / 2 / f.view.s - v.cx) * v.s + w / 2, oz = (f.view.cz - f.view.h / 2 / f.view.s - v.cz) * v.s + h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(f.bitmap, ox, oz, f.view.w * k, f.view.h * k);
    }
    v.screen(ctx);
    // the pin (search result / teleport target)
    if (this.pin) {
      const X = v.toX(this.pin.x), Y = v.toY(this.pin.z);
      ctx.beginPath(); ctx.arc(X, Y - 14, 7, Math.PI * 0.85, Math.PI * 0.15); ctx.lineTo(X, Y); ctx.closePath();
      ctx.fillStyle = '#5fd0ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = PAL.label.halo; ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y - 14, 2.6, 0, Math.PI * 2); ctx.fillStyle = PAL.label.halo; ctx.fill();
    }
    // the player, with a slow pulse to find it at a glance
    const p = this.opts.getPlayer();
    const px = v.toX(p.x), py = v.toY(p.z);
    ctx.save(); ctx.translate(px, py);
    const pulse = (performance.now() % 1800) / 1800;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.26 * (1 - pulse)})`; ctx.beginPath(); ctx.arc(0, 0, 10 + pulse * 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(p.heading);
    drawPlayerArrow(ctx, -11, 7.5, 8, PAL.label.halo, '#ffffff');
    ctx.restore();
    drawScaleBar(ctx, v, FONT, PAL.label.halo);
    if (this.whereText !== p.whereText) { this.whereText = p.whereText; this.me.textContent = p.whereText ? `You are on ${p.whereText}` : ''; this.me.style.display = p.whereText ? '' : 'none'; }
  }

  // ---------------------------------------------------------------- hover, click, search
  hover(x, z) {
    if (this.hoverBusy) { this.hoverNext = [x, z]; return; }
    this.hoverBusy = true;
    this.client.request({ type: 'snap', x, z, lang: this.lang, maxD: 60 }).then((r) => {
      this.hoverBusy = false;
      if (this.open) this.info.textContent = r.none || r.d > 60 ? 'No street here · click a street to go there' : `${r.name || 'unnamed road'}${r.cross ? ` & ${r.cross}` : ''} · click to go there`;
      if (this.hoverNext) { const [a, b] = this.hoverNext; this.hoverNext = null; this.hover(a, b); }
    });
  }

  async click(x, z) {
    const [x0, z0, x1, z1] = this.client.extent;
    if (x < x0 || x > x1 || z < z0 || z > z1) { this.info.textContent = 'Outside the map of Uccle'; return; }
    const r = await this.client.request({ type: 'snap', x, z, lang: this.lang, maxD: 80 });
    if (r.none || r.d > 80) { this.info.textContent = 'No street within 80 m: click closer to a street'; return; }
    this.pin = { x: r.x, z: r.z, name: r.name };
    this.dirty = true;
    this.opts.onTeleport?.({ x: r.x, z: r.z, yaw: r.yaw, name: r.name, cross: r.cross });
  }

  async search(text) {
    const res = await this.client.request({ type: 'search', q: text, lang: this.lang });
    this.results.innerHTML = '';
    if (!text.trim()) { this.hl = null; this.dirty = true; return; }
    const kinds = { street: 'street', landmark: 'place', stop: 'tram 92', area: 'park' };
    for (const it of res.results) {
      const d = document.createElement('div');
      d.innerHTML = `<i></i><b></b><small></small>`;
      d.children[0].textContent = it.type === 'area' && it.kind !== 'park' ? it.kind : it.type === 'landmark' ? (it.kind === 'hero' ? 'landmark' : it.kind) : kinds[it.type];
      d.children[1].textContent = it.label;
      d.children[2].textContent = it.sub !== it.label ? it.sub : '';
      d.onclick = () => this.pick(it);
      this.results.append(d);
    }
    if (!res.results.length) { const d = document.createElement('div'); d.innerHTML = '<small>no match</small>'; this.results.append(d); }
  }

  pick(it) {
    this.results.innerHTML = '';
    this.input.value = it.label;
    const { w, h } = this.centre();
    if (it.type === 'street') {
      this.hl = it.key;
      const fit = Math.min(w / ((it.maxX - it.minX) * 1.3 + 60), h / ((it.maxZ - it.minZ) * 1.3 + 60));
      Object.assign(this.st, { viewCenterX: (it.minX + it.maxX) / 2, viewCenterZ: (it.minZ + it.maxZ) / 2, viewZoom: Math.max(0.08, Math.min(2.2, fit)) });
      this.pin = null;
    } else {
      this.hl = null;
      Object.assign(this.st, { viewCenterX: it.x, viewCenterZ: it.z, viewZoom: Math.max(this.st.viewZoom, 1.6) });
      this.pin = { x: it.x, z: it.z, name: it.label };
    }
    this.render();
  }
}
