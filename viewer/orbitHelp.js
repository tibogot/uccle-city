// THE ORBIT VIEW'S CONTROLS CARD (orbitcam2, docs/ORBITCAM.md; owner: "how to move up, move down..."): a "?" button in
// the bottom-left corner (beside the minimap; the dev panel takes the right side) and the ? key toggle a small card listing the inspection camera's controls. Shown once by
// itself on the first visit (remembered in localStorage), only in the orbit view, never over the game menu. Own UI,
// the dev panel's palette (viewer/panelUI.js), light / dark like it; hidden in photo mode (body.photo).
const CSS = `
.uorbit-help-btn { position: fixed; left: 10px; bottom: 10px; z-index: 5; width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.12); background: #171b21; color: #e3e7ec; font: 600 15px/28px system-ui, sans-serif;
  text-align: center; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.35); padding: 0; opacity: .85; }
.uorbit-help-btn:hover { opacity: 1; background: #29303a; }
.uorbit-help { position: fixed; left: 10px; bottom: 48px; z-index: 6; width: 300px; max-width: calc(100vw - 24px);
  background: #171b21; color: #e3e7ec; border-radius: 10px; border: 1px solid rgba(255,255,255,.075);
  box-shadow: 0 6px 24px rgba(0,0,0,.4); font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; padding: 10px 12px 10px; }
.uorbit-help h2 { font-size: 13px; margin: 0 0 6px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.uorbit-help h2 button { background: none; border: 0; color: #9aa5b1; font-size: 16px; cursor: pointer; padding: 0 2px; }
.uorbit-help h3 { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: #9aa5b1; margin: 8px 0 3px; font-weight: 600; }
.uorbit-help table { border-collapse: collapse; width: 100%; }
.uorbit-help td { padding: 2px 0; vertical-align: top; }
.uorbit-help td:first-child { white-space: nowrap; padding-right: 10px; color: #e3e7ec; }
.uorbit-help td:last-child { color: #c3cbd4; }
.uorbit-help kbd { display: inline-block; min-width: 14px; padding: 0 4px; border-radius: 4px; background: #262c35; border: 1px solid #353d48;
  font: 11px/16px ui-monospace, monospace; text-align: center; }
.uorbit-help .tip { margin-top: 8px; color: #9aa5b1; font-size: 11px; }
:root[data-ui-theme=light] .uorbit-help, :root[data-ui-theme=light] .uorbit-help-btn { background: #f7f6f3; color: #1d2228; border-color: rgba(0,0,0,.1); }
:root[data-ui-theme=light] .uorbit-help td:first-child { color: #1d2228; } :root[data-ui-theme=light] .uorbit-help td:last-child { color: #4d5661; }
:root[data-ui-theme=light] .uorbit-help kbd { background: #fff; border-color: #d5d1c9; }
@media (prefers-color-scheme: light) { :root:not([data-ui-theme=dark]) .uorbit-help, :root:not([data-ui-theme=dark]) .uorbit-help-btn { background: #f7f6f3; color: #1d2228; border-color: rgba(0,0,0,.1); }
  :root:not([data-ui-theme=dark]) .uorbit-help td:first-child { color: #1d2228; } :root:not([data-ui-theme=dark]) .uorbit-help td:last-child { color: #4d5661; }
  :root:not([data-ui-theme=dark]) .uorbit-help kbd { background: #fff; border-color: #d5d1c9; } }
body.photo .uorbit-help-btn, body.photo .uorbit-help { display: none; }
`;

const k = (s) => s.split(" ").map((x) => (x === "/" || x === "+" ? ` ${x} ` : `<kbd>${x}</kbd>`)).join("");
const ROWS = [
  ["Look around", [["Left-drag", "orbit round the point under the mouse"], ["Right-drag", "slide along the ground"], ["Double-click " + k("F"), "fly to the point under the mouse"]]],
  ["Move", [[k("W A S D") + " / arrows", "move (along the view)"], [k("E") + " / " + k("PgUp"), "go up"], [k("Q") + " / " + k("PgDn"), "go down"],
    [k("Shift"), "faster"], ["Wheel", "zoom to the mouse; zoom out = higher, a view from above"], ["Hold right + " + k("W A S D"), "fly where you look"]]],
  ["Touch", [["1 finger", "orbit"], ["2 fingers", "slide, pinch to zoom, twist to turn"], ["Double tap", "fly to the point"]]],
];

const KEY = "uccle.orbithelp.seen";
const store = { get() { try { return localStorage.getItem(KEY); } catch { return "1"; } }, set() { try { localStorage.setItem(KEY, "1"); } catch {} } };

/** isOrbit(): the orbit view is on (no other mode); blocked(): a menu / the full map is open. Returns { toggle, el }. */
export function createOrbitHelp({ isOrbit, blocked = () => false, auto = true }) {
  const style = document.createElement("style"); style.textContent = CSS; document.head.append(style);
  const btn = document.createElement("button");
  btn.className = "uorbit-help-btn"; btn.textContent = "?"; btn.title = "Camera controls (?)";
  const card = document.createElement("div");
  card.className = "uorbit-help";
  card.innerHTML = `<h2>Camera controls<button title="close (?)">×</button></h2>`
    + ROWS.map(([h, list]) => `<h3>${h}</h3><table>${list.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`).join("")
    + `<div class="tip">${k("?")} shows / hides this card. Esc closes it.</div>`;
  card.style.display = "none";
  document.body.append(btn, card);
  let open = false;
  const toggle = (on = !open) => { open = !!on && isOrbit(); card.style.display = open ? "" : "none"; if (open) store.set(); };
  btn.onclick = () => toggle();
  card.querySelector("h2 button").onclick = () => toggle(false);
  addEventListener("keydown", (e) => { if (open && e.key === "Escape") toggle(false); });
  // the button only in the orbit view; the card goes with it (4 Hz, no per-frame work)
  let shown = null, autoDone = !auto || store.get() === "1";
  setInterval(() => {
    const on = isOrbit() && !blocked() && (document.getElementById("cover")?.classList.contains("gone") ?? true);
    if (on !== shown) { shown = on; btn.style.display = on ? "" : "none"; if (!on && open) { open = false; card.style.display = "none"; } }
    if (on && !autoDone) { autoDone = true; toggle(true); }      // the first visit: once, by itself
  }, 250);
  return { toggle, el: card, button: btn, get open() { return open; } };
}
