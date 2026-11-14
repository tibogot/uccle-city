// THE HUD top left (index.html #hud): title + tile, the stats lines, the dev log. Foldable to its title row (remembered),
// the log closed by default (?log=1 opens it), searchable (filter box), scrollable, with a line count.
// Cost: log() appends to ONE text node (no re-join of every line); main.js writes the stats only while hud.statsOn.
// #log keeps every line as plain text with "\n" (debug/libAB.js, tools/facadekit/bench.js read its textContent).
const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* blocked */ } },
};
export const hud = { statsOn: true, lines: [] };
let text = null, count = null, view = null, filter = "", box = null, wrap = null, hidden = false;

function matches(s) { return !filter || s.toLowerCase().includes(filter); }
function renderFilter() {
  if (!view) return;
  if (!filter) { view.hidden = true; $("log").hidden = false; return; }
  const out = hud.lines.filter(matches);
  view.textContent = out.length ? out.join("\n") : "(no line matches)";
  view.hidden = false; $("log").hidden = true;
  count.textContent = `${out.length} / ${hud.lines.length}`;
}
const atBottom = () => !wrap || wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 24;
/** one log line (main.js log()) */
export function hudLog(s) {
  hud.lines.push(s);
  const el = $("log");
  if (!el) return;
  const stick = atBottom();
  if (!text) { text = document.createTextNode(""); el.append(text); }
  text.appendData((hud.lines.length > 1 ? "\n" : "") + s);
  if (count) count.textContent = filter ? `${hud.lines.filter(matches).length} / ${hud.lines.length}` : String(hud.lines.length);
  if (filter && matches(s)) view.textContent = hud.lines.filter(matches).join("\n");
  if (stick && box?.open && wrap) wrap.scrollTop = wrap.scrollHeight;
}
const syncStats = () => { hud.statsOn = !hidden && !$("hud")?.classList.contains("folded"); };

export function setupHud(params) {
  const h = $("hud");
  box = $("logBox"); wrap = $("logWrap"); count = $("logCount"); view = $("logView");
  if (!h || !box) return;
  // the log: closed by default (it covered the view), ?log=1 opens it, ?log=0 keeps it closed (as before)
  if (params.get("log") === "1") box.open = true; else box.removeAttribute("open");
  box.addEventListener("toggle", () => { if (box.open && wrap) wrap.scrollTop = wrap.scrollHeight; });
  const inp = $("logFilter");
  if (inp) {
    inp.addEventListener("input", () => { filter = inp.value.trim().toLowerCase(); renderFilter(); if (!filter) count.textContent = String(hud.lines.length); });
    for (const ev of ["keydown", "keyup"]) inp.addEventListener(ev, (e) => { if (e.key === "Escape") { inp.value = ""; filter = ""; renderFilter(); count.textContent = String(hud.lines.length); inp.blur(); } e.stopPropagation(); });
    inp.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });   // (a click in a <summary> toggles the <details>)
  }
  $("logCopy")?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    navigator.clipboard?.writeText((filter ? hud.lines.filter(matches) : hud.lines).join("\n")).catch(() => {});
  });
  // fold: only the title row stays (remembered)
  const fold = $("hudFold");
  const setFold = (on, remember = true) => {
    h.classList.toggle("folded", on); if (fold) { fold.textContent = on ? "▸" : "▾"; fold.title = on ? "unfold the HUD" : "fold the HUD (stats + log)"; }
    if (remember) store.set("hud:folded", on ? "1" : null);
    syncStats();
  };
  fold?.addEventListener("click", () => setFold(!h.classList.contains("folded")));
  setFold(store.get("hud:folded") === "1", false);
}
/** photo mode / the old "HUD" toggle: hidden = no stats written */
export function setHudHidden(on) { hidden = on; const h = $("hud"); if (h) h.style.display = on ? "none" : ""; syncStats(); }
