// A small control-panel UI, our own (no dependency, never lil-gui: the owner's rule): collapsible sections of sliders
// (+ number field), toggles, dropdowns, buttons and live read-outs, docked top right, scrollable. Used by the dev panel
// (viewer/devPanel.js, docs/DEVPANEL.md) and the labs. API (chainable controllers, lil-gui-like so the labs keep working):
//   const ui = new Panel({ title });  const s = ui.addFolder("Sky");  s.close();
//   s.add(obj, "prop", min, max, step)   slider       s.add(obj, "prop", ["a", "b"])   dropdown
//   s.add(obj, "flag")                   toggle       s.add({ go: fn }, "go")          button
//   s.add(obj, "text")                   read-out (a string / number with no range)
//   ctrl.name("label").onChange(fn).listen().disable();  ctrl.setValue(v);  ui.controllersRecursive()
// More (the dev panel):
//   new Panel({ title, persist: "devpanel", search: true })   sections' open state + theme remembered (localStorage)
//   ui.addFolder(title, { id, open: false })                  initial state (a remembered one wins)
//   f.heading("Landmarks")  f.buttons([["label", fn, "tooltip"], ...], 2)  f.custom(el, "search words")
//   ctrl.hint("tooltip").tag("reload", "warn").keywords("night lights")   f.onToggle((open) => ...)
//   ui.setVisible(bool)  ui.visible  ui.onVisible(fn)  ui.footer (an element under the scroll area)
// Cost: listened controllers are read by ONE 10 Hz timer, only while the panel is shown and their section open, and
// the DOM is written only when a value changed (no per-frame DOM work; nothing at all while hidden).
const CSS = `
.upanel { --bg: #171b21; --bg2: #1e232b; --fg: #e3e7ec; --muted: #9aa5b1; --dim: #6c7783; --line: rgba(255,255,255,.075);
  --accent: #78aefc; --accent2: #2b4c78; --field: #262c35; --fline: #353d48; --btn: #29303a; --btnh: #333c48; --warn: #f0b45c;
  --warnbg: rgba(240,180,92,.13); --ok: #7fd18b; --bad: #ff7b72; --chip: #2a313b; --shadow: 0 6px 24px rgba(0,0,0,.4);
  position: fixed; top: 8px; right: 8px; width: 340px; max-height: calc(100vh - 16px); z-index: 3; display: flex; flex-direction: column;
  background: var(--bg); color: var(--fg); border-radius: 10px; font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
  box-shadow: var(--shadow); border: 1px solid var(--line); user-select: none; overflow: hidden; }
:root[data-ui-theme=light] .upanel { --bg: #f7f6f3; --bg2: #efede8; --fg: #1d2228; --muted: #4d5661; --dim: #848c96; --line: rgba(0,0,0,.08);
  --accent: #1f62c4; --accent2: #cfe0fa; --field: #fff; --fline: #d5d1c9; --btn: #ebe9e4; --btnh: #e0ddd6; --warn: #a2620a;
  --warnbg: rgba(214,140,30,.13); --ok: #23863a; --bad: #c4312a; --chip: #e6e3dc; --shadow: 0 6px 22px rgba(0,0,0,.16); }
@media (prefers-color-scheme: light) { :root:not([data-ui-theme=dark]) .upanel { --bg: #f7f6f3; --bg2: #efede8; --fg: #1d2228;
  --muted: #4d5661; --dim: #848c96; --line: rgba(0,0,0,.08); --accent: #1f62c4; --accent2: #cfe0fa; --field: #fff; --fline: #d5d1c9;
  --btn: #ebe9e4; --btnh: #e0ddd6; --warn: #a2620a; --warnbg: rgba(214,140,30,.13); --ok: #23863a; --bad: #c4312a; --chip: #e6e3dc;
  --shadow: 0 6px 22px rgba(0,0,0,.16); } }
.upanel.hidden { display: none; }
.upanel .uhead { display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px; border-bottom: 1px solid var(--line); flex: none; }
.upanel .uhead .utitle { font-weight: 650; font-size: 13px; cursor: pointer; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upanel .uhead .ubadge { font: 11px/1 ui-monospace, Consolas, monospace; color: var(--muted); background: var(--chip); padding: 4px 6px; border-radius: 5px; white-space: nowrap; }
.upanel .uicon { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 6px; cursor: pointer; color: var(--muted);
  background: transparent; border: 0; padding: 0; margin: 0; font: 13px/1 system-ui, sans-serif; }
.upanel .uicon:hover { background: var(--btnh); color: var(--fg); }
.upanel .usearch { padding: 8px 10px 6px; flex: none; position: relative; }
.upanel .usearch input { width: 100%; box-sizing: border-box; background: var(--field); color: var(--fg); border: 1px solid var(--fline);
  border-radius: 7px; padding: 6px 26px 6px 9px; font: inherit; outline: none; }
.upanel .usearch input:focus { border-color: var(--accent); }
.upanel .usearch .uclear { position: absolute; right: 14px; top: 11px; width: 20px; height: 20px; }
.upanel .uscroll { overflow-y: auto; overflow-x: hidden; flex: 1 1 auto; min-height: 0; padding-bottom: 4px; scrollbar-width: thin; }
.upanel .ufoot:empty { display: none; }
.upanel .ufoot { flex: none; border-top: 1px solid var(--line); background: var(--bg2); }
.upanel.closed > .usearch, .upanel.closed > .uscroll, .upanel.closed > .ufoot, .upanel.closed > .utop { display: none; }
.upanel.closed .uhead { border-bottom: 0; }
.upanel .usec > .ustitle { padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 7px; font-weight: 600;
  border-top: 1px solid var(--line); color: var(--fg); }
.upanel .usec:first-child > .ustitle { border-top: 0; }
.upanel .usec > .ustitle:hover { background: var(--btnh); }
.upanel .usec > .ustitle .uchev { color: var(--dim); font-size: 10px; width: 10px; transition: transform .12s; display: inline-block; }
.upanel .usec:not(.closed) > .ustitle .uchev { transform: rotate(90deg); }
.upanel .usec > .ustitle .uname { flex: 1; }
.upanel .usec > .ustitle .ucount { font-weight: 500; font-size: 11px; color: var(--warn); background: var(--warnbg); border-radius: 9px; padding: 0 7px; }
.upanel .usec > .ustitle .ucount:empty { display: none; }
.upanel .ubody { padding: 2px 12px 9px 12px; }
.upanel .usec.closed > .ubody { display: none; }
.upanel .uhd { font-size: 10.5px; font-weight: 650; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); margin: 9px 0 3px; }
.upanel .uhd small { text-transform: none; letter-spacing: 0; font-weight: 500; }
.upanel .urow { display: grid; grid-template-columns: 136px 1fr; align-items: center; gap: 8px; min-height: 25px; border-radius: 5px; }
.upanel .urow.ubool { grid-template-columns: minmax(0, 1fr) auto; }
.upanel .urow.uwide { grid-template-columns: minmax(0, 1fr) 150px; }
.upanel .urow > label { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upanel .urow .ukey { font: 10.5px ui-monospace, Consolas, monospace; color: var(--dim); margin-left: 4px; }
.upanel .urow.off { opacity: .5; }
.upanel .urow.changed > label { color: var(--warn); }
.upanel .urow.changed { background: var(--warnbg); margin: 0 -6px; padding: 0 6px; }
.upanel .ucell { display: flex; align-items: center; gap: 6px; min-width: 0; }
.upanel .ucell > :first-child { flex: 1; min-width: 0; }
.upanel .utag { font-size: 9.5px; font-weight: 600; letter-spacing: .03em; padding: 1px 5px; border-radius: 4px; color: var(--dim); background: var(--chip); flex: none !important; text-transform: uppercase; }
.upanel .utag.warn { color: var(--warn); background: var(--warnbg); }
.upanel .uslide { display: grid; grid-template-columns: 1fr 54px; gap: 6px; align-items: center; }
.upanel input[type=range] { width: 100%; accent-color: var(--accent); margin: 0; height: 16px; }
.upanel input[type=number], .upanel input[type=text], .upanel select { width: 100%; box-sizing: border-box; background: var(--field); color: var(--fg);
  border: 1px solid var(--fline); border-radius: 5px; padding: 2px 5px; font: inherit; height: 22px; }
.upanel input[type=number]:focus, .upanel input[type=text]:focus, .upanel select:focus { border-color: var(--accent); outline: none; }
.upanel input[type=checkbox] { appearance: none; -webkit-appearance: none; width: 28px; height: 16px; border-radius: 9px; background: var(--fline);
  position: relative; cursor: pointer; margin: 0; flex: none !important; transition: background .12s; }
.upanel input[type=checkbox]::after { content: ""; position: absolute; left: 2px; top: 2px; width: 12px; height: 12px; border-radius: 50%;
  background: #fff; transition: left .12s; box-shadow: 0 1px 2px rgba(0,0,0,.3); }
.upanel input[type=checkbox]:checked { background: var(--accent); }
.upanel input[type=checkbox]:checked::after { left: 14px; }
.upanel input[type=checkbox]:disabled { cursor: default; }
.upanel button.ubtn { width: 100%; margin: 3px 0; padding: 5px 9px; background: var(--btn); color: var(--fg); border: 1px solid var(--fline);
  border-radius: 6px; font: inherit; cursor: pointer; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upanel button.ubtn:hover { background: var(--btnh); }
.upanel button.ubtn:disabled { opacity: .5; cursor: default; }
.upanel button.ubtn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.upanel .ubtns { display: grid; gap: 4px; margin: 4px 0; }
.upanel .ubtns > button.ubtn { margin: 0; text-align: center; padding: 5px 6px; }
.upanel .uread { font: 11px/1.35 ui-monospace, Consolas, monospace; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upanel .unote { color: var(--dim); font-size: 11px; margin: 3px 0; line-height: 1.35; }
.upanel.searching .usec:not(.match), .upanel.searching .uhd, .upanel.searching .unote { display: none; }
.upanel.searching .usec.match > .ubody { display: block; }
.upanel.searching .nomatch { display: none !important; }
.upanel .uempty { padding: 10px 12px; color: var(--dim); display: none; }
.upanel.searching.none .uempty { display: block; }
`;
let styled = false;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private window / blocked */ } },
};
/** the UI theme ("auto" | "light" | "dark") on <html data-ui-theme>, shared by every panel and the HUD (index.html) */
export function applyTheme(t = store.get("upanel:theme") || "auto") {
  if (t === "auto") delete document.documentElement.dataset.uiTheme; else document.documentElement.dataset.uiTheme = t;
  return t;
}
/** lower case, no accents (the search finds "Héros" by "heros") */
const fold = (t) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

class Ctrl {
  constructor(folder, obj, prop, row, read) {
    Object.assign(this, { folder, object: obj, property: prop, row, _read: read, _cb: null, _search: "" });
  }
  name(t) { this.row.querySelector("label").textContent = t; if (!this.row.title) this.row.title = t; this._label = t; return this; }
  onChange(f) { this._cb = f; return this; }
  setValue(v) { this.object[this.property] = v; this._read(true); this._cb?.(v); return this; }
  updateDisplay() { this._read(true); return this; }
  listen() { this.folder.root._listen.add(this); return this; }
  disable() { this.row.classList.add("off"); this.row.querySelectorAll("input,select,button").forEach((e) => { e.disabled = true; }); return this; }
  /** tooltip (also searched) */
  hint(t) { this.row.title = t; this._hint = t; return this; }
  /** extra words the search box finds this control by */
  keywords(t) { this._kw = t; return this; }
  /** a small tag after the control ("reload", "live"...) */
  tag(t, kind = "") { const c = this.row.querySelector(".ucell") || this.row; const s = el("span", `utag ${kind}`, t); c.append(s); return this; }
  searchText() { return `${this._label ?? this.row.querySelector?.("label")?.textContent ?? ""} ${this._hint ?? ""} ${this._kw ?? ""} ${this.property}`.toLowerCase(); }
}

class Folder {
  constructor(parent, title, root, { id = title, open = true } = {}) {
    this.root = root; this.ctrls = []; this.id = id; this.title = title; this._toggles = []; this.items = [];
    this.el = el("div", "usec");
    const t = el("div", "ustitle");
    t.append(el("span", "uchev", "▶"));
    const name = el("span", "uname", title); t.append(name);
    this.countEl = el("span", "ucount"); t.append(this.countEl);
    t.onclick = () => this.setOpen(this.el.classList.contains("closed"), true);
    this.body = el("div", "ubody");
    this.el.append(t, this.body); parent.append(this.el);
    this._title = t;
    const saved = root.persist ? store.get(`${root.persist}:sec:${id}`) : null;
    if (!(saved != null ? saved === "1" : open)) this.el.classList.add("closed");
  }
  get isOpen() { return !this.el.classList.contains("closed"); }
  setOpen(on, user = false) {
    if (on === this.isOpen) return this;
    this.el.classList.toggle("closed", !on);
    if (user && this.root.persist) store.set(`${this.root.persist}:sec:${this.id}`, on ? "1" : "0");
    for (const f of this._toggles) f(on);
    if (on) for (const c of this.ctrls) c._read(true);
    return this;
  }
  close() { return this.setOpen(false); }
  open() { return this.setOpen(true); }
  onToggle(f) { this._toggles.push(f); return this; }
  /** a counter badge on the section title (empty = none) */
  count(t) { this.countEl.textContent = t ? String(t) : ""; return this; }
  row(label) {
    const r = el("div", "urow");
    const l = el("label", null, label); r.title = label;
    r.append(l); this.body.append(r); return r;
  }
  heading(text, small = "") {
    const h = el("div", "uhd", text);
    if (small) { h.append(" "); h.append(el("small", null, small)); }
    this.body.append(h); return h;
  }
  note(text) { const n = el("div", "unote", text); this.body.append(n); return n; }
  /** a grid of buttons: [[label, fn, tooltip?], ...] */
  buttons(list, cols = 2) {
    const g = el("div", "ubtns"); g.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    const out = [];
    for (const [label, fn, tip] of list) {
      const b = el("button", "ubtn", label); b.title = tip || label; b.onclick = fn; g.append(b);
      const wrap = { querySelector: () => b, classList: b.classList, querySelectorAll: () => [b], title: tip || label };
      const c = new Ctrl(this, { [label]: fn }, label, wrap, () => {});
      c.searchText = () => `${label} ${tip || ""}`.toLowerCase();
      c._el = b; this.ctrls.push(c); this.root.all.push(c); out.push(c);
    }
    this.body.append(g); return out;
  }
  /** any element, found by the search through `words` */
  custom(node, words = "") {
    this.body.append(node);
    const c = new Ctrl(this, {}, "custom", node, () => {});
    c.searchText = () => words.toLowerCase(); c._el = node; this.ctrls.push(c);
    return c;
  }
  /** a text field (applied on change / Enter) */
  text(obj, prop, placeholder = "") {
    const r = this.row(prop), cell = el("div", "ucell"), inp = el("input"); inp.type = "text"; inp.placeholder = placeholder; inp.spellcheck = false; r.classList.add("uwide");
    cell.append(inp); r.append(cell);
    let last;
    const ctrl = new Ctrl(this, obj, prop, r, (f) => { const x = obj[prop] ?? ""; if (!f && x === last) return; last = x; inp.value = x; });
    inp.onchange = () => { obj[prop] = inp.value; last = inp.value; ctrl._cb?.(inp.value); };
    ctrl._read(true); this.ctrls.push(ctrl); this.root.all.push(ctrl);
    return ctrl;
  }
  add(obj, prop, a, b, c) {
    const v = obj[prop];
    let ctrl;
    if (typeof v === "function") {                                     // button
      const btn = el("button", "ubtn", prop);
      this.body.append(btn);
      const wrap = { querySelector: () => btn, classList: btn.classList, querySelectorAll: () => [btn], title: "" };
      ctrl = new Ctrl(this, obj, prop, wrap, () => {});
      ctrl.name = (t) => { btn.textContent = t; ctrl._label = t; return ctrl; };
      ctrl.hint = (t) => { btn.title = t; ctrl._hint = t; return ctrl; };
      ctrl._el = btn;
      btn.onclick = () => obj[prop].call(obj);
    } else if (Array.isArray(a)) {                                     // dropdown
      const r = this.row(prop), cell = el("div", "ucell"), sel = el("select"); r.classList.add("uwide");
      for (const o of a) sel.add(new Option(o, o));
      cell.append(sel); r.append(cell);
      let last;
      ctrl = new Ctrl(this, obj, prop, r, (f) => { const x = obj[prop]; if (!f && x === last) return; last = x; sel.value = x; });
      sel.onchange = () => { obj[prop] = sel.value; last = sel.value; ctrl._cb?.(sel.value); };
    } else if (typeof v === "boolean") {                               // toggle
      const r = this.row(prop), cell = el("div", "ucell"), cb = el("input"); cb.type = "checkbox"; r.classList.add("ubool");
      cell.append(cb); r.append(cell);
      let last;
      ctrl = new Ctrl(this, obj, prop, r, (f) => { const x = !!obj[prop]; if (!f && x === last) return; last = x; cb.checked = x; });
      cb.onchange = () => { obj[prop] = cb.checked; last = cb.checked; ctrl._cb?.(cb.checked); };
    } else if (typeof v === "number" && a !== undefined) {             // slider + number
      const r = this.row(prop), box = el("div", "uslide");
      const rg = el("input"); rg.type = "range"; rg.min = a; rg.max = b; rg.step = c ?? (b - a) / 100;
      const nb = el("input"); nb.type = "number"; nb.min = a; nb.max = b; nb.step = rg.step;
      box.append(rg, nb); r.append(box);
      const dec = String(rg.step).includes(".") ? String(rg.step).split(".")[1].length : 0;
      let last;
      ctrl = new Ctrl(this, obj, prop, r, (f) => { const x = obj[prop]; if (!f && x === last) return; last = x; rg.value = x; nb.value = (+x).toFixed(Math.min(dec, 4)); });
      const set = (x) => { const n = Math.min(b, Math.max(a, +x)); if (Number.isNaN(n)) return; obj[prop] = n; ctrl._read(true); ctrl._cb?.(n); };
      rg.oninput = () => set(rg.value); nb.onchange = () => set(nb.value);
    } else {                                                           // read-out (text / number)
      const r = this.row(prop), out = el("div", "uread");
      r.append(out);
      let last;
      ctrl = new Ctrl(this, obj, prop, r, (f) => { const x = String(obj[prop]); if (!f && x === last) return; last = x; out.textContent = x; out.title = x; });
    }
    ctrl._read(true);
    this.ctrls.push(ctrl); this.root.all.push(ctrl);
    return ctrl;
  }
}

export class Panel {
  constructor({ title = "Panel", persist = null, search = false, badge = false } = {}) {
    if (!styled) { const st = document.createElement("style"); st.textContent = CSS; document.head.append(st); styled = true; }
    applyTheme();
    this.all = []; this.folders = []; this.persist = persist; this._listen = new Set(); this._vis = [];
    this.domElement = el("div", "upanel");
    const h = el("div", "uhead");
    const tt = el("span", "utitle", title); h.append(tt);
    this.badge = el("span", "ubadge"); if (badge) h.append(this.badge);
    this.head = h;
    const themeBtn = this.iconButton("◐", "theme: auto / light / dark", () => {
      const order = ["auto", "light", "dark"], cur = store.get("upanel:theme") || "auto";
      const next = order[(order.indexOf(cur) + 1) % 3];
      store.set("upanel:theme", next); applyTheme(next); themeBtn.title = `theme: ${next} (click: next)`;
    });
    themeBtn.title = `theme: ${store.get("upanel:theme") || "auto"} (click: next)`;
    this.chev = this.iconButton("▾", "collapse the panel", () => this.setCollapsed(!this.domElement.classList.contains("closed")));
    tt.onclick = () => this.setCollapsed(!this.domElement.classList.contains("closed"));
    this.domElement.append(h);
    if (search) {
      const s = el("div", "usearch"), inp = el("input"); inp.type = "text"; inp.placeholder = "Search controls…  ( / )"; inp.spellcheck = false;
      const clr = this.iconButton("×", "clear the search", () => { inp.value = ""; this.filter(""); inp.focus(); }); clr.classList.add("uclear"); clr.style.display = "none";
      inp.oninput = () => { clr.style.display = inp.value ? "" : "none"; this.filter(inp.value); };
      inp.onkeydown = (e) => { if (e.key === "Escape") { inp.value = ""; clr.style.display = "none"; this.filter(""); inp.blur(); } e.stopPropagation(); };
      inp.onkeyup = (e) => e.stopPropagation();
      s.append(inp, clr); this.domElement.append(s); this.searchInput = inp;
    }
    this.top = el("div", "utop"); this.domElement.append(this.top);   // (the dev panel's active-switch chips)
    this.scroll = el("div", "uscroll"); this.domElement.append(this.scroll);
    this.empty = el("div", "uempty", "No control matches."); this.scroll.append(this.empty);
    this.footer = el("div", "ufoot"); this.domElement.append(this.footer);
    document.body.append(this.domElement);
    // typing in a field must not drive the city (WASD, H, M, G...): keys stop at the panel
    for (const ev of ["keydown", "keyup"]) this.domElement.addEventListener(ev, (e) => { if (e.target.matches?.("input[type=text], input[type=number]")) e.stopPropagation(); });
    this.main = new Folder(this.scroll, "", this);
    this.main._title.remove(); this.main.el.className = "ubody";
    if (persist && store.get(`${persist}:collapsed`) === "1") this.setCollapsed(true, false);
    // listened controllers: 10 Hz, only while shown, only open sections, DOM writes only on change
    setInterval(() => {
      if (!this._listen.size || !this.visible) return;
      const act = document.activeElement;
      for (const c of this._listen) if (c.folder.isOpen && act?.closest?.(".urow") !== c.row) c._read(false);
    }, 100);
  }
  /** a small button in the title bar (before the collapse arrow; `last`: after it) */
  iconButton(text, title, fn, last = false) {
    const b = el("button", "uicon", text); b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); };
    if (last || !this.chev) this.head.append(b); else this.head.insertBefore(b, this.chev);
    return b;
  }
  addFolder(title, opts = {}) { const f = new Folder(this.scroll, title, this, opts); this.folders.push(f); return f; }
  add(...a) { return this.main.add(...a); }
  controllersRecursive() { return this.all; }
  /** shown: not hidden (` / photo mode) and not collapsed to its title bar */
  get visible() { return !this.domElement.classList.contains("hidden") && !this.domElement.classList.contains("closed"); }
  onVisible(f) { this._vis.push(f); return this; }
  _visChanged() { const v = this.visible; for (const f of this._vis) f(v); if (v) for (const c of this.all) if (c.folder.isOpen) c._read(true); }
  /** hide / show (not remembered: a panel that stays hidden after a reload looks lost) */
  setVisible(on) {
    this.domElement.classList.toggle("hidden", !on);
    this._visChanged();
  }
  setCollapsed(on, remember = true) {
    this.domElement.classList.toggle("closed", on);
    this.chev.textContent = on ? "▸" : "▾";
    if (remember && this.persist) store.set(`${this.persist}:collapsed`, on ? "1" : null);
    this._visChanged();
  }
  /** close every section */
  collapseAll() { for (const f of this.folders) f.setOpen(false, true); }
  /** the search: every word must appear in a control's label / tooltip / keywords or its section's title */
  filter(q) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const root = this.domElement;
    root.classList.toggle("searching", words.length > 0);
    let any = false;
    for (const f of this.folders) {
      const title = fold(f.title);
      let hit = false;
      for (const c of f.ctrls) {
        const node = c._el || c.row;
        const txt = words.length ? fold(c.searchText()) : "";
        const ok = !words.length || words.every((w) => txt.includes(w) || title.includes(w));
        node.classList?.toggle("nomatch", !ok);
        if (ok) hit = true;
      }
      f.el.classList.toggle("match", hit);
      if (hit) { any = true; for (const c of f.ctrls) c._read(true); }
    }
    root.classList.toggle("none", words.length > 0 && !any);
  }
}
