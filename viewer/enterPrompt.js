// THE "WALK IN" PROMPT (claude/villamark, rule enterable-places-findable; docs/VILLA.md "Showing it"). Near the door of an
// enterable place (data/places/enterable.json: within its radius, default 40 m) and NOT in third person, a small pill
// shows "Walk in · <place>"; its key (or a click) puts the character at the place's entry spot facing the door.
//   key: E on foot and in a vehicle (E is "use" there, like the game kit's prompts); Enter in the orbit camera and the
//   falcon, where E is a movement key (rule common-game-keys: E = up / land must keep working).
// Distance: the walker / car / falcon from getPlayer(); the orbit camera by the CAMERA (3D: a high view over the place
// is not "at the door"). Checked 4 times a second (no per-frame work); hidden under the play loader, the full map, a
// game's menu or prompt. ?enterprompt=0: none. Style: the dev panel's palette (viewer/panelUI.js), our own element.
import { loadEnterable } from "./placeLink.js";

const CSS = `
.uenter { position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%); z-index: 3; display: none; align-items: center; gap: 10px;
  padding: 7px 8px 7px 14px; border-radius: 10px; background: #171b21; color: #e3e7ec; border: 1px solid rgba(255,255,255,.075);
  box-shadow: 0 6px 24px rgba(0,0,0,.4); font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; user-select: none; }
.uenter.on { display: flex; }
.uenter .uplace { color: #9aa5b1; white-space: nowrap; }
.uenter button { background: #2b4c78; color: #e3e7ec; border: 1px solid #78aefc; border-radius: 7px; padding: 5px 10px; font: 600 12px/1 system-ui, sans-serif; cursor: pointer; }
.uenter button:hover { background: #335a8e; }
.uenter kbd { font: 11px/1 ui-monospace, Consolas, monospace; background: #262c35; border: 1px solid #353d48; border-radius: 4px; padding: 2px 5px; margin-left: 6px; }
@media (prefers-color-scheme: light) { :root:not([data-ui-theme=dark]) .uenter { background: #f7f6f3; color: #1d2228; border-color: rgba(0,0,0,.08); box-shadow: 0 6px 22px rgba(0,0,0,.16); }
  :root:not([data-ui-theme=dark]) .uenter .uplace { color: #4d5661; } :root:not([data-ui-theme=dark]) .uenter button { background: #cfe0fa; color: #1d2228; border-color: #1f62c4; }
  :root:not([data-ui-theme=dark]) .uenter kbd { background: #fff; border-color: #d5d1c9; } }
:root[data-ui-theme=light] .uenter { background: #f7f6f3; color: #1d2228; border-color: rgba(0,0,0,.08); }
:root[data-ui-theme=light] .uenter .uplace { color: #4d5661; } :root[data-ui-theme=light] .uenter button { background: #cfe0fa; color: #1d2228; border-color: #1f62c4; }
`;
const isTyping = (e) => { const t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable); };

/** host: { getPlayer() -> { x, z, mode, alt }, camera, world, params, enter(place) -> Promise, blocked() -> bool, log } */
export async function startEnterPrompt({ getPlayer, camera, world, params, enter, blocked = () => false, log = console.log }) {
  const all = await loadEnterable();
  // a place whose model is switched off (?villa=0, ?stalle=0) has no interior to walk into
  const places = all.filter((p) => !(p.switch && params.get(p.switch) === "0"));
  if (!places.length) return null;
  const style = document.createElement("style"); style.textContent = CSS; document.head.append(style);
  const el = document.createElement("div");
  el.className = "uenter";
  el.innerHTML = `<span class="uplace"></span><button type="button">Walk in<kbd>E</kbd></button>`;
  document.body.append(el);
  const label = el.querySelector(".uplace"), btn = el.querySelector("button"), kbd = el.querySelector("kbd");
  const api = { near: null, key: "KeyE", places, entered: [], busy: false };
  const go = async () => {
    const p = api.near;
    if (!p || api.busy) return;
    api.busy = true; el.classList.remove("on");
    log(`walk in: ${p.fr} (entry ${p.entry.join(", ")}, heading ${p.heading} deg)`);
    try { api.entered.push({ id: p.id, r: await enter(p) }); } catch (e) { log(`walk in: ${e.message}`); } finally { api.busy = false; api.near = null; }
  };
  btn.onclick = go;
  addEventListener("keydown", (e) => {
    if (!api.near || api.busy || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
    if (e.code !== api.key && !(api.key === "Enter" && e.code === "NumpadEnter")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    go();
  }, true);
  const check = () => {
    let near = null;
    try {
      const P = getPlayer();
      if (P.mode !== "third" && !blocked()) {
        const orbit = P.mode === "orbit", c = camera.position;
        for (const p of places) {
          const [dx, dz] = p.door, r = p.radius ?? 40;
          const d = orbit ? Math.hypot(c.x - dx, c.y - world.surface(dx, dz), c.z - dz) : Math.hypot(P.x - dx, P.z - dz);
          if (d <= r && (!near || d < near.d)) near = { p, d };
        }
        api.key = orbit || P.mode === "fly" ? "Enter" : "KeyE";
      }
    } catch { near = null; }
    api.near = near?.p ?? null;
    api.d = near?.d ?? null;
    if (api.near) { label.textContent = api.near.fr; kbd.textContent = api.key === "Enter" ? "Enter" : "E"; }
    el.classList.toggle("on", !!api.near);
  };
  setInterval(check, 250);
  api.check = check; api.go = go; api.el = el;
  window.__enterPrompt = api;
  return api;
}
