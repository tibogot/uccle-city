// A small control-panel UI, our own (no dependency): collapsible sections of sliders (+ number field), toggles,
// dropdowns, buttons and live read-outs, docked top right, scrollable. Used by the dev panel (viewer/devPanel.js)
// and the labs. API (chainable controllers):
//   const ui = new Panel({ title });  const s = ui.addFolder("Sky");  s.close();
//   s.add(obj, "prop", min, max, step)   slider       s.add(obj, "prop", ["a", "b"])   dropdown
//   s.add(obj, "flag")                   toggle       s.add({ go: fn }, "go")          button
//   ctrl.name("label").onChange(fn).listen().disable();  ctrl.setValue(v);  ui.controllersRecursive()
const CSS = `
.upanel { position: fixed; top: 8px; right: 8px; width: 320px; max-height: calc(100vh - 16px); overflow-y: auto; z-index: 3;
  background: rgba(20, 24, 30, .9); color: #e6e9ee; border-radius: 8px; font: 12px/1.3 system-ui, sans-serif;
  box-shadow: 0 4px 18px rgba(0,0,0,.35); user-select: none; }
.upanel .uhead { padding: 9px 12px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; justify-content: space-between; }
.upanel .usec > .ustitle { padding: 7px 12px; cursor: pointer; border-top: 1px solid rgba(255,255,255,.08); color: #9cc4ff;
  font-weight: 600; display: flex; justify-content: space-between; }
.upanel .usec > .ustitle:hover { background: rgba(255,255,255,.04); }
.upanel .ubody { padding: 2px 12px 8px; }
.upanel .usec.closed > .ubody, .upanel.closed > .usec, .upanel.closed > .ubody { display: none; }
.upanel .urow { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 8px; min-height: 24px; }
.upanel .urow label { color: #b8c2cc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upanel .urow.off { opacity: .55; }
.upanel .uslide { display: grid; grid-template-columns: 1fr 52px; gap: 6px; align-items: center; }
.upanel input[type=range] { width: 100%; accent-color: #6fa8ff; }
.upanel input[type=number], .upanel select { width: 100%; box-sizing: border-box; background: #2a3039; color: #e6e9ee;
  border: 1px solid #3a424d; border-radius: 4px; padding: 2px 4px; font: inherit; }
.upanel input[type=checkbox] { accent-color: #6fa8ff; width: 15px; height: 15px; justify-self: start; }
.upanel button { width: 100%; margin: 3px 0; padding: 5px 8px; background: #2f3743; color: #e6e9ee; border: 1px solid #3f4855;
  border-radius: 5px; font: inherit; cursor: pointer; text-align: left; }
.upanel button:hover { background: #3a4452; }
.upanel .uread { font: 11px/1.3 ui-monospace, monospace; color: #d7dde4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (prefers-color-scheme: light) { .upanel { background: rgba(248, 247, 244, .95); color: #1d2228; }
  .upanel .urow label { color: #4b545e; } .upanel .usec > .ustitle { color: #1f5fbf; border-top-color: rgba(0,0,0,.08); }
  .upanel input[type=number], .upanel select { background: #fff; color: #1d2228; border-color: #d4d0c8; }
  .upanel button { background: #eceae5; color: #1d2228; border-color: #d4d0c8; } .upanel button:hover { background: #e2dfd8; }
  .upanel .uread { color: #2a3038; } }
`;
let styled = false;

class Ctrl {
  constructor(folder, obj, prop, row, read, write) {
    Object.assign(this, { folder, object: obj, property: prop, row, _read: read, _write: write, _cb: null });
  }
  name(t) { this.row.querySelector("label").textContent = t; this.row.title = t; return this; }
  onChange(f) { this._cb = f; return this; }
  setValue(v) { this.object[this.property] = v; this._read(); this._cb?.(v); return this; }
  updateDisplay() { this._read(); return this; }
  listen() { const tick = () => { if (document.activeElement?.closest?.(".urow") !== this.row) this._read(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); return this; }
  disable() { this.row.classList.add("off"); this.row.querySelectorAll("input,select,button").forEach((e) => { e.disabled = true; }); return this; }
}

class Folder {
  constructor(parent, title, root) {
    this.root = root; this.ctrls = [];
    this.el = document.createElement("div"); this.el.className = "usec";
    const t = document.createElement("div"); t.className = "ustitle";
    t.innerHTML = `<span></span><span>▾</span>`; t.firstChild.textContent = title;
    t.onclick = () => { this.el.classList.toggle("closed"); t.lastChild.textContent = this.el.classList.contains("closed") ? "▸" : "▾"; };
    this.body = document.createElement("div"); this.body.className = "ubody";
    this.el.append(t, this.body); parent.append(this.el);
    this._title = t;
  }
  close() { this.el.classList.add("closed"); this._title.lastChild.textContent = "▸"; return this; }
  open() { this.el.classList.remove("closed"); this._title.lastChild.textContent = "▾"; return this; }
  row(label) {
    const r = document.createElement("div"); r.className = "urow";
    const l = document.createElement("label"); l.textContent = label; r.title = label;
    r.append(l); this.body.append(r); return r;
  }
  add(obj, prop, a, b, c) {
    const v = obj[prop];
    let ctrl;
    if (typeof v === "function") {                                     // button
      const btn = document.createElement("button"); btn.textContent = prop;
      this.body.append(btn);
      const wrap = { querySelector: () => btn, classList: btn.classList, querySelectorAll: () => [btn], title: "" };
      ctrl = new Ctrl(this, obj, prop, wrap, () => {}, () => {});
      ctrl.name = (t) => { btn.textContent = t; return ctrl; };
      btn.onclick = () => obj[prop].call(obj);
    } else if (Array.isArray(a)) {                                     // dropdown
      const r = this.row(prop), sel = document.createElement("select");
      for (const o of a) sel.add(new Option(o, o));
      r.append(sel);
      ctrl = new Ctrl(this, obj, prop, r, () => { sel.value = obj[prop]; }, null);
      sel.onchange = () => { obj[prop] = sel.value; ctrl._cb?.(sel.value); };
    } else if (typeof v === "boolean") {                               // toggle
      const r = this.row(prop), cb = document.createElement("input"); cb.type = "checkbox";
      r.append(cb);
      ctrl = new Ctrl(this, obj, prop, r, () => { cb.checked = !!obj[prop]; }, null);
      cb.onchange = () => { obj[prop] = cb.checked; ctrl._cb?.(cb.checked); };
    } else if (typeof v === "number" && a !== undefined) {             // slider + number
      const r = this.row(prop), box = document.createElement("div"); box.className = "uslide";
      const rg = document.createElement("input"); rg.type = "range"; rg.min = a; rg.max = b; rg.step = c ?? (b - a) / 100;
      const nb = document.createElement("input"); nb.type = "number"; nb.min = a; nb.max = b; nb.step = rg.step;
      box.append(rg, nb); r.append(box);
      const dec = String(rg.step).includes(".") ? String(rg.step).split(".")[1].length : 0;
      ctrl = new Ctrl(this, obj, prop, r, () => { rg.value = obj[prop]; nb.value = (+obj[prop]).toFixed(Math.min(dec, 4)); }, null);
      const set = (x) => { const n = Math.min(b, Math.max(a, +x)); if (Number.isNaN(n)) return; obj[prop] = n; ctrl._read(); ctrl._cb?.(n); };
      rg.oninput = () => set(rg.value); nb.onchange = () => set(nb.value);
    } else {                                                           // read-out (text / number)
      const r = this.row(prop), out = document.createElement("div"); out.className = "uread";
      r.append(out);
      ctrl = new Ctrl(this, obj, prop, r, () => { out.textContent = String(obj[prop]); }, null);
    }
    ctrl._read();
    this.ctrls.push(ctrl); this.root.all.push(ctrl);
    return ctrl;
  }
}

export class Panel {
  constructor({ title = "Panel" } = {}) {
    if (!styled) { const st = document.createElement("style"); st.textContent = CSS; document.head.append(st); styled = true; }
    this.all = [];
    this.domElement = document.createElement("div"); this.domElement.className = "upanel";
    const h = document.createElement("div"); h.className = "uhead"; h.innerHTML = "<span></span><span>▾</span>";
    h.firstChild.textContent = title;
    h.onclick = () => { this.domElement.classList.toggle("closed"); h.lastChild.textContent = this.domElement.classList.contains("closed") ? "▸" : "▾"; };
    this.domElement.append(h);
    document.body.append(this.domElement);
    this.main = new Folder(this.domElement, "", this);
    this.main._title.remove(); this.main.el.className = "ubody";
  }
  addFolder(title) { return new Folder(this.domElement, title, this); }
  add(...a) { return this.main.add(...a); }
  controllersRecursive() { return this.all; }
}
