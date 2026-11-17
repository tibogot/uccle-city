// QUICK TEST MODE, page side (docs/QUICKTEST.md): helpers for the agents that check their work in the city on a small
// piece of it (viewer/quick.js, ?quick=1). Use in a city tab (chrome-devtools evaluate_script):
//   const Q = await import("/debug/quick.js");
//   Q.url("stjob-street", { with: "traffic" })   -> "/viewer/index.html?quick=1&place=stjob-street&with=traffic"
//   Q.go("observatory")                          -> navigates there (a fresh small boot: the clean way, memory freed)
//   await Q.beat()                               -> one heartbeat: { ready, frames, dFrames, fps, newErrors, heapMB, ... }
//   await Q.waitReady()                          -> polls every 5 s until window.__quickReady; stops early on an error /
//                                                   a frozen page / the hard limit (never a fixed wait)
//   await Q.shot("observatory-front")            -> HUD hidden, a few settled frames; { name, file } (then take_screenshot
//                                                   with that file), or { ..., data } with { data: true }
//   Q.view({ at: [x, h, z], look: [x, h, z], fov })   -> move the orbit camera inside the loaded spot (heights over the ground)
// The agent's own loop (between evaluate_script calls) should poll Q.beat() every 5-10 s the same way: stop at once when
// `newErrors` is not empty or `frozen` is true.
import { PLACES } from "/viewer/places.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** the quick URL of a place id (viewer/places.js) or of { at: [x, z, h?], look: [x, z, h?] }; extra = more switches */
export function url(where, extra = {}) {
  const q = new URLSearchParams({ quick: "1" });
  if (typeof where === "string") { if (!PLACES.some((p) => p.id === where)) throw new Error(`unknown place ${where}: ${PLACES.map((p) => p.id).join(", ")}`); q.set("place", where); }
  else if (where?.at) { q.set("at", where.at.join(",")); if (where.look) q.set("look", where.look.join(",")); }
  for (const [k, v] of Object.entries(extra)) if (v != null) q.set(k, Array.isArray(v) ? v.join(",") : String(v));
  return `/viewer/index.html?${q}`;
}
export const places = () => PLACES.map((p) => `${p.id}: ${p.name} (${p.tile})`);

/** go to a place: by default a NEW quick boot there (navigates; call waitReady() after the page has loaded). With
 *  { reload: false }: the camera moves in this session (the place must be inside the loaded spot; tiles stream in by
 *  the radius, but landmarks outside the boot's radius stay out: reload for those) */
export async function go(where, extra = {}, { reload = true } = {}) {
  if (reload || !window.viewer) { location.href = url(where, extra); return { navigating: true, url: url(where, extra) }; }
  const p = PLACES.find((q) => q.id === where);
  if (!p) throw new Error(`unknown place ${where}`);
  view({ at: p.p, look: p.t, fov: p.fov });
  return { moved: p.id };
}

/** the orbit camera at `at` looking at `look`, each [x, h over the drawn ground, z] (the dev panel's Go to rule) */
export function view({ at, look, fov = null }) {
  const { camera, controls, world } = window.viewer;
  const g = (x, z) => world.ground?.(x, z) ?? world.surface(x, z);
  camera.position.set(at[0], g(at[0], at[2]) + at[1], at[2]);
  controls.target.set(look[0], Math.min(g(look[0], look[2]) + look[1], camera.position.y - 0.05), look[2]);
  if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  controls.update?.();
  if (window.viewer.lighting) window.viewer.lighting.snapNext = true;
}

let last = null, seenErrors = 0;
/** one heartbeat (call every 5-10 s): frames advancing since the last beat, the console errors since then, ready yet */
export async function beat() {
  const now = performance.now(), frames = window.viewer?.frames?.() ?? 0;
  const errs = window.__quickErrors ?? [];
  const newErrors = errs.slice(seenErrors).map((e) => `${e.kind} @${e.t} ms: ${e.msg}`);
  seenErrors = errs.length;
  const dFrames = last ? frames - last.frames : null, dt = last ? (now - last.t) / 1000 : null;
  last = { t: now, frames };
  const mem = performance.memory;
  return {
    t: Math.round(now), ready: window.__quickReady ?? null, cover: document.getElementById("cover")?.classList.contains("gone") ?? null,
    frames, dFrames, fps: dt ? +(dFrames / dt).toFixed(1) : null,
    frozen: dt != null && dt > 2 && dFrames === 0 && document.visibilityState === "visible",
    newErrors, errors: errs.length, heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    tiles: window.viewer?.world?.tiles?.map((t) => t.name) ?? [],
  };
}

/** poll beat() every `step` ms until __quickReady (or an error / a frozen page / `limit` ms): returns the last beat
 *  plus why it stopped. (Before main.js has set window.viewer the frames read 0: that is the boot, not a freeze.) */
export async function waitReady({ step = 5000, limit = 120000, stopOnError = true } = {}) {
  const t0 = performance.now();
  const errors = [];
  let b = await beat();
  while (performance.now() - t0 < limit) {
    if (b.ready) return { why: "ready", ...b, errors: errors.concat(b.newErrors) };
    errors.push(...b.newErrors);
    if (stopOnError && errors.length) return { why: "error", ...b, newErrors: errors };
    if (b.frozen && window.viewer) return { why: "frozen", ...b };
    await sleep(step);
    b = await beat();
  }
  return { why: "limit", ...b, newErrors: errors.concat(b.newErrors) };
}

/** a shot of the current view (or `view` first): HUD / panels hidden, `frames` frames to settle (shadows, LOD fades).
 *  Naming convention: <topic>-<place>-<what>[-before|-after], e.g. "snow2-stjob-street-after"; the suggested file is
 *  docs/<topic>/shots/<name>.png (pass it to take_screenshot's filePath). { data: true } also returns the PNG data URL. */
export async function shot(name, { view: v = null, frames = 30, data = false, topic = name.split("-")[0] } = {}) {
  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(name)) throw new Error("shot name: lower case, digits, - _ . only");
  for (const d of document.querySelectorAll("body > div")) if (!d.querySelector("canvas")) d.style.visibility = "hidden";
  if (v) view(v);
  for (let i = 0; i < frames; i++) await new Promise((r) => requestAnimationFrame(() => r()));
  const out = { name, file: `docs/${topic}/shots/${name}.png`, cam: window.viewer?.camera.position.toArray().map((x) => +x.toFixed(1)) };
  if (data) {
    window.viewer.renderFrame();
    const c = window.viewer.renderer.domElement, c2 = new OffscreenCanvas(c.width, c.height);
    c2.getContext("2d").drawImage(c, 0, 0);
    const blob = await c2.convertToBlob({ type: "image/png" });
    out.data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  }
  return out;
}
/** the HUD / panels back after shots */
export function hud(on = true) { for (const d of document.querySelectorAll("body > div")) if (!d.querySelector("canvas")) d.style.visibility = on ? "" : "hidden"; }
