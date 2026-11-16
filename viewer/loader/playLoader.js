// THE PLAY LOADER (docs/PERF_GAME.md, perfgame 2026-11-16; owner: "the player must never see the scene filling in").
// A game start (police station, falcon nest, a mission start that moves the player), a "Go to" or a map teleport holds
// this screen until the area round the player is BUILT: the full tiles near the spawn, the far ring, the landmarks'
// and tiles' shader compiles, the pipelines the first frames ask for (async: the city renders behind the screen the
// whole time, so those frames ARE the warm-up), then it fades out (0.6 s). Same look and rules as the boot's loading
// screen (viewer/loader/loader.js, index.html #loaderUi): a still of the city with a slow zoom, one bar; only
// transform / opacity move (CSS: the compositor runs them while the main thread and the GPU are busy); opacity .99,
// never 1 (a fully opaque layer over the WebGPU canvas lets Chrome stop compositing it: a long frame when it goes).
// The bar only moves FORWARD. ?playloader=old: no screen, no wait (the game starts as before).
//   const PL = playLoader();  PL.open({ title, sub })  PL.progress(f, line)  await PL.close()  PL.active
export const PLAY_LOADER = new URLSearchParams(location.search).get("playloader") !== "old";

const STILLS = ["stjob", "townhall", "observatory"];
const CSS = `
#playLoader{position:fixed;inset:0;z-index:60;opacity:.99;transition:opacity .6s ease-in-out;overflow:hidden;background:#6f7d72 linear-gradient(#e9d3b4 0%,#c9c4b0 34%,#6c7a52 64%,#3d4934 100%);pointer-events:auto}
#playLoader.gone{opacity:0;pointer-events:none}
#playLoader .pl-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform;animation:plZoom 24s linear infinite alternate;transform-origin:55% 48%}
@keyframes plZoom{from{transform:scale(1)}to{transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){#playLoader .pl-img{animation:none}}
#playLoader .pl-shade{position:absolute;inset:auto 0 0 0;height:50%;background:linear-gradient(transparent,rgba(12,16,22,.62));pointer-events:none}
#playLoader .pl-box{position:absolute;left:32px;bottom:36px;width:min(400px,calc(100vw - 64px));color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.55);font-family:system-ui,sans-serif}
#playLoader .pl-kicker{font:600 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:8px}
#playLoader .pl-title{font:300 34px/1.1 system-ui,sans-serif;letter-spacing:.03em;margin-bottom:6px}
#playLoader .pl-line{font-size:14px;min-height:1.4em}
#playLoader .pl-bar{height:3px;margin:8px 0 6px;background:rgba(255,255,255,.28);border-radius:2px;overflow:hidden}
#playLoader .pl-bar i{display:block;height:100%;background:currentColor;transform-origin:0 50%;transform:scaleX(0);will-change:transform;transition:transform .5s ease-out}
#playLoader .pl-sub{font:12px/1.3 ui-monospace,monospace;opacity:.8;min-height:1.3em}
#playLoader .pl-tip{position:absolute;right:28px;bottom:36px;max-width:min(360px,40vw);color:#fff;font:13px/1.45 system-ui,sans-serif;opacity:.85;text-align:right;text-shadow:0 1px 3px rgba(0,0,0,.7)}
@media (max-width:700px){#playLoader .pl-tip{display:none}}`;

let el = null, $bar, $title, $kick, $line, $sub, $tip, shown = 0, openAt = 0, closing = null, owners = 0, imgK = 0;

function build() {
  if (el) return;
  const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
  el = document.createElement("div"); el.id = "playLoader"; el.className = "gone"; el.setAttribute("aria-live", "polite");
  el.innerHTML = `<picture><source type="image/avif"><img class="pl-img" alt="" decoding="async"></picture><div class="pl-shade"></div>
    <div class="pl-box"><div class="pl-kicker"></div><div class="pl-title"></div><div class="pl-line"></div><div class="pl-bar"><i></i></div><div class="pl-sub"></div></div><div class="pl-tip"></div>`;
  document.body.append(el);
  $bar = el.querySelector(".pl-bar i"); $title = el.querySelector(".pl-title"); $kick = el.querySelector(".pl-kicker");
  $line = el.querySelector(".pl-line"); $sub = el.querySelector(".pl-sub"); $tip = el.querySelector(".pl-tip");
}

export function playLoader() {
  return {
    /** show the screen (at once: it must cover the first frame after the call); nested opens share one screen */
    open({ title, kicker, sub, tip, still = null } = {}) {
      build();
      owners++;
      if (closing) { closing = null; }
      if (owners === 1 || el.classList.contains("gone")) {
        const name = still || STILLS[imgK++ % STILLS.length];
        const base = new URL(`./stills/${name}`, import.meta.url).href;
        el.querySelector("source").srcset = `${base}.avif`;
        el.querySelector("img").src = `${base}.jpg`;
        shown = 0; $bar.style.transition = "none"; $bar.style.transform = "scaleX(0)"; void $bar.offsetWidth; $bar.style.transition = "";
        openAt = performance.now();
      }
      const fresh = el.classList.contains("gone");
      if (title != null || fresh) $title.textContent = title ?? "";
      if (kicker != null || fresh) $kick.textContent = kicker ?? "";
      if (sub != null || fresh) $sub.textContent = sub ?? "";
      if (tip != null || fresh) $tip.textContent = tip ?? "";
      $line.textContent = "Getting ready…";
      el.classList.remove("gone");
      document.body.classList.add("play-loading");
      return this;
    },
    /** f 0..1 (forward only), the stage line, an optional sub line */
    progress(f, line = null, sub = null) {
      if (!el) return;
      if (f > shown) { shown = Math.min(1, f); $bar.style.transform = `scaleX(${shown.toFixed(3)})`; }
      if (line != null) $line.textContent = line;
      if (sub != null) $sub.textContent = sub;
    },
    /** one owner done; the last one fades the screen out (resolves when it is gone) */
    async close({ force = false } = {}) {
      if (!el) return;
      owners = force ? 0 : Math.max(0, owners - 1);
      if (owners > 0) return;
      this.progress(1, "Ready");
      const me = (closing = {});
      await new Promise((r) => setTimeout(r, 180));
      if (closing !== me || owners > 0) return;
      el.classList.add("gone"); globalThis.__playAt = performance.now();   // (time to play, for debug/gamePerf + the perf docs)
      document.body.classList.remove("play-loading");
      await new Promise((r) => setTimeout(r, 650));
      if (closing === me) closing = null;
    },
    /** the right-hand line (the game's tagline) */
    tip(text) { if (el) $tip.textContent = text; },
    get active() { return !!el && !el.classList.contains("gone"); },
    get openMs() { return el && !el.classList.contains("gone") ? performance.now() - openAt : 0; },
  };
}
export const PL = playLoader();
if (typeof window !== "undefined") window.__playLoader = PL;
