// The map's own CSS (minimap, full map), in the style of viewer/panelUI.js. Injected once.
const CSS = `
body.umap-on #hud { max-height: calc(100vh - 340px); }   /* the city's HUD stops above the minimap */
.umap-mini { position: fixed; left: 14px; bottom: 14px; z-index: 3; width: 240px; display: flex; flex-direction: column; align-items: center;
  gap: 6px; font: 12px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; user-select: none; pointer-events: none; }
.umap-disc { width: 220px; height: 220px; flex: none; border-radius: 50%; overflow: hidden; cursor: pointer; pointer-events: auto;
  box-shadow: 0 0 0 1px rgba(0,0,0,.45), 0 4px 18px rgba(0,0,0,.45); background: #1d232b; }
.umap-disc canvas { width: 100%; height: 100%; display: block; }
.umap-street { max-width: 240px; box-sizing: border-box; text-align: center; background: rgba(16, 20, 26, .84); color: #f2f4f7; border-radius: 9px; padding: 5px 11px 6px;
  box-shadow: 0 2px 10px rgba(0,0,0,.35); pointer-events: none; }
.umap-cur { font-weight: 650; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.umap-next { color: #b9c3cf; font-size: 11.5px; margin-top: 1px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.umap-toggle { display: none; position: fixed; left: 12px; bottom: 12px; z-index: 3; width: 44px; height: 44px; border-radius: 50%; border: 0;
  background: rgba(16, 20, 26, .86); color: #f2f4f7; box-shadow: 0 2px 10px rgba(0,0,0,.4); cursor: pointer; }
.umap-veil { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); z-index: 6; padding: 8px 14px; border-radius: 9px;
  background: rgba(16, 20, 26, .88); color: #f2f4f7; font: 600 13px/1.3 system-ui, sans-serif; box-shadow: 0 2px 12px rgba(0,0,0,.4); display: none; }
.umap-veil.on { display: block; }
.umap-veil .spin { display: inline-block; width: 11px; height: 11px; margin-right: 8px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  border-radius: 50%; animation: umapspin .8s linear infinite; vertical-align: -1px; }
@keyframes umapspin { to { transform: rotate(360deg); } }

.umap-full { position: fixed; inset: 0; z-index: 5; background: #1d232b; display: none; font: 12.5px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #e9edf2; }
.umap-full.on { display: block; }
.umap-full canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; }
.umap-full.is-panning canvas { cursor: grabbing; }
.umap-bar { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; gap: 8px; align-items: flex-start; pointer-events: none; flex-wrap: wrap; }
.umap-bar > * { pointer-events: auto; }
.umap-search { position: relative; width: min(380px, calc(100vw - 24px)); }
.umap-search input { width: 100%; box-sizing: border-box; padding: 9px 12px; border-radius: 9px; border: 1px solid #3a424d; background: rgba(20, 24, 30, .94);
  color: #f2f4f7; font: inherit; font-size: 14px; outline: none; box-shadow: 0 2px 12px rgba(0,0,0,.4); }
.umap-search input:focus { border-color: #6fa8ff; }
.umap-results { margin-top: 4px; background: rgba(20, 24, 30, .96); border-radius: 9px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,.45); }
.umap-results div { padding: 7px 12px; cursor: pointer; display: flex; gap: 8px; align-items: baseline; }
.umap-results div:hover, .umap-results div.sel { background: #2f3743; }
.umap-results b { font-weight: 600; } .umap-results small { color: #95a0ad; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.umap-results i { font-style: normal; color: #6fa8ff; font-size: 11px; min-width: 52px; }
.umap-btns { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.umap-btns button { height: 36px; min-width: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid #3a424d; background: rgba(20, 24, 30, .94); color: #e9edf2;
  font: inherit; font-weight: 600; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.35); }
.umap-btns button:hover { background: #2f3743; }
.umap-btns button.on { border-color: #6fa8ff; color: #9cc4ff; }
.umap-info { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 6px 12px; border-radius: 9px; background: rgba(20, 24, 30, .9);
  white-space: nowrap; max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis; pointer-events: none; box-shadow: 0 2px 10px rgba(0,0,0,.35); }
.umap-credit { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: rgba(225, 231, 238, .8); text-shadow: 0 1px 2px #000; pointer-events: auto; }
.umap-credit a { color: inherit; }
.umap-compass { position: absolute; right: 14px; bottom: 34px; width: 44px; height: 44px; pointer-events: none; }
.umap-me { position: absolute; left: 12px; top: 64px; font-size: 12px; color: #c9d1db; background: rgba(20,24,30,.8); padding: 4px 9px; border-radius: 7px; pointer-events: none; }

@media (max-width: 640px), (max-height: 480px) {
  .umap-mini { left: 10px; bottom: 64px; width: 160px; display: none; }
  .umap-mini.umap-open { display: flex; }
  .umap-disc { width: 150px; height: 150px; }
  .umap-street { max-width: 170px; padding: 4px 8px; } .umap-cur { font-size: 12px; } .umap-next { font-size: 11px; }
  .umap-toggle { display: block; }
  .umap-btns button { height: 34px; min-width: 34px; padding: 0 8px; }
  .umap-me { top: auto; bottom: 46px; left: 10px; }
  .umap-info { bottom: 72px; white-space: normal; text-align: center; font-size: 11.5px; }
  .umap-credit { bottom: auto; top: 112px; right: 8px; left: 8px; text-align: right; font-size: 9.5px; }
  .umap-compass { bottom: 40px; }
}
`;
let done = false;
export function injectMapCSS() {
  if (done) return;
  done = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  document.body.classList.add('umap-on');
}
