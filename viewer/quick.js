// QUICK TEST MODE for the coding agents (docs/QUICKTEST.md, HANDOFF.md "Quick test mode for agents"): ?quick=1 boots a
// small piece of the city round one spot instead of the whole city: the tiles within &radius= m (default 250) of the
// camera and of the point it looks at, in full, no far ring (&far=2: a far ring after all); the landmarks / hero
// bridges / tunnels within the radius (+100 m) only (the others: their UrbIS solids, or nothing); the optional systems
// off unless asked for (&with=traffic,birds,weather,night,trams,trains,falcons,map,panel,game); no start menu, no play
// loader; the camera put exactly at the spot. When the view is built: window.__quickReady = { ms, tiles, heapMB, ... }.
//
//   ?quick=1&place=<viewer/places.js id>                 the camera at the place's p, looking at its t (and its fov)
//   ?quick=1&at=<x>,<z>[,<h>]&look=<x>,<z>[,<h>]          camera at x, z, h m over the drawn ground (default 1.7), looking
//                                                       at look (h default: 1.5 at street level, else 0); look absent:
//                                                       30 m north of the camera
//   &radius=<m>  &with=a,b  &view=walk|third|drive|fly (a mode started at the spot instead of the orbit camera)
//   &fov=<deg>   &ready=<ms> (the ready check's time limit, default 90000)
//
// HOW: this module is main.js's FIRST import (no imports of its own but the places table), so its body runs before any
// other module of the viewer reads location.search: it rewrites the URL's switches (history.replaceState) into the
// existing ones (tile, at, cam, view, ring, far, game=0, boothold=old, traffic=0, <landmark>=0, ...). A switch already in
// the URL is never overwritten (an explicit &traffic=1 wins). main.js then only adds the radius filter to the
// streaming, the exact camera and the ready check (all behind `QUICK`). Without ?quick=1 this module does nothing.
import { PLACES } from "./places.js";

const P = new URLSearchParams(location.search);
const ON = P.get("quick") === "1";

// where each optional model stands (city metres x, z): the URL switch that leaves it out and its value. The positions
// are viewer/bootGate.js GATED's (models/<name>/<name>.json placement); the public art's: models/publicart/site.json.
const LANDMARKS = {
  stjob: [1216, 561], townhall: [-1148, -506], vanbuuren: [303, -1230], wolvendael: [-469, -366], police: [-514, -340],
  calevoet: [-1225, 790], papenkasteel: [-637, 1154], stpierre: [-709, -493], russian: [-354, -468], heros: [-533, -484],
  rosaire: [1279, -1254], observatory: [654, 60], augustin: [-896, -1961], sacrecoeur: [-264, -1631], saintmarc: [454, -620],
  latourdefrein: [112, 2310], stalle: [-1150, 57],
};
const OFF_VALUE = { heros: "old" };                 // ?heros=old = the setts plaza; the others: ?<name>=0 = the UrbIS solid
const ART = [[-2240, 376], [-651, -280], [-503, -440], [1376, -1320], [1824, -90], [865, 663], [2577, 1167], [65, 1154]];
const MARGIN = 100;                                 // a model straddling the radius counts as inside (its half-size: Heros ~100 m)
// the optional systems: the switch that turns each off in quick mode and its value
const SYSTEMS = { traffic: ["traffic", "0"], birds: ["birds", "0"], weather: ["weather", "old"], night: ["night", "0"],
  trams: ["trams", "0"], falcons: ["falcons", "0"], map: ["map", "0"], panel: ["panel", "0"], game: ["game", "0"] };
// (trains: the SNCB trains' vehicles, main.js QUICK.with("trains"); the rail bridges stay, by the radius)
const TILE = 500, COLS = "ABCDEFGHIJKLMNO";
const tileName = (x, z) => `${COLS[Math.floor(x / TILE) + 6] ?? "?"}${Math.floor(z / TILE) + 5}`;   // data/tiles/manifest.json grid

function setup() {
  // (a reload of the rewritten URL: the quick inputs were kept as quickat / quicklook, `at` is the viewer's own by then)
  if (!P.has("quickat") && P.has("at")) P.set("quickat", P.get("at"));
  if (!P.has("quicklook") && P.has("look")) P.set("quicklook", P.get("look"));
  const nums = (k) => { const v = P.get(k)?.split(",").map(Number); return v && v.length >= 2 && v.every(Number.isFinite) ? v : null; };
  const place = P.get("place") ? PLACES.find((p) => p.id === P.get("place")) : null;
  if (P.get("place") && !place) console.error(`[quick] unknown place "${P.get("place")}" (viewer/places.js ids: ${PLACES.map((p) => p.id).join(", ")})`);
  let cam, look, fov = +P.get("fov") || null;
  if (place) { cam = place.p.slice(); look = place.t.slice(); fov ??= place.fov ?? null; }
  else {
    const a = nums("quickat") ?? [1102, 542, 1.7];                     // (nothing given: Place Saint-Job's street view)
    const h = a[2] ?? 1.7;
    cam = [a[0], h, a[1]];
    const l = nums("quicklook") ?? [a[0], a[1] - 30];
    look = [l[0], l[2] ?? (h <= 3 ? 1.5 : 0), l[1]];
  }
  const radius = Math.max(50, +(P.get("radius") ?? 250) || 250);
  const withSet = new Set((P.get("with") || "").split(",").map((s) => s.trim()).filter(Boolean));
  if (P.get("wx")) withSet.add("weather");                                 // a weather asked for brings its system
  if (["night", "twilight"].includes(P.get("time")) || P.get("hour")) withSet.add("night");   // night lights at night
  const pts = [[cam[0], cam[2]], [look[0], look[2]]];
  const near = (x, z, m = 0) => pts.some(([px, pz]) => Math.hypot(x - px, z - pz) <= radius + m);
  // the URL the rest of the viewer reads (only switches the URL does not set already)
  const view = P.get("view");
  const mode = view && view !== "stjob" && view !== "overview" ? view : null;     // a mode started at the spot
  const spot = mode ? pts[0] : pts[1];                                    // walk / drive start at the camera, the orbit looks at `look`
  const set = (k, v) => { if (!P.has(k)) P.set(k, v); };
  P.delete("at"); P.delete("look");
  P.set("at", `${spot[0]},${spot[1]}`);
  set("tile", tileName(spot[0], spot[1]));
  if (!mode) { set("view", "stjob"); set("cam", `${cam[0]},${cam[2]},${cam[1]}`); }
  const farRing = P.has("far") ? Math.max(0, +P.get("far") || 0) : 0;   // (&far=2: a far ring round the quick tiles after all)
  set("ring", "1"); set("far", "0");
  set("boothold", "old");                                                 // no play loader after the cover
  set("gamemenu", "0");
  for (const [sys, [k, v]] of Object.entries(SYSTEMS)) if (!withSet.has(sys)) set(k, v);
  const lmIn = [];
  for (const [k, [x, z]] of Object.entries(LANDMARKS)) { if (near(x, z, MARGIN)) lmIn.push(k); else set(k, OFF_VALUE[k] ?? "0"); }
  if (!lmIn.includes("townhall")) set("flags", "0");                      // the balcony flags ride on the town hall
  const artIn = ART.some(([x, z]) => near(x, z, MARGIN));
  if (!artIn) set("art", "old");
  history.replaceState(history.state, "", `${location.pathname}?${P.toString()}${location.hash}`);
  // console errors from here on (debug/quick.js heartbeat)
  const errors = [];
  const push = (kind, a) => { errors.push({ t: Math.round(performance.now()), kind, msg: a.map((x) => (x instanceof Error ? `${x.message}` : typeof x === "string" ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })())).join(" ").slice(0, 500) }); if (errors.length > 200) errors.shift(); };
  const ce = console.error.bind(console);
  console.error = (...a) => { push("error", a); ce(...a); };
  addEventListener("error", (e) => push("exception", [e.message || String(e.error)]));
  addEventListener("unhandledrejection", (e) => push("rejection", [e.reason?.message ?? String(e.reason)]));
  window.__quickErrors = errors;
  return {
    radius, farRing, cam, look, fov, place: place?.id ?? null, mode, with: (s) => withSet.has(s), withList: [...withSet], landmarks: lmIn, art: artIn,
    near,
    /** a manifest tile (bounds.x / .z arrays) within the radius (+ extra m) of one of the points (the boot's, or [[x, z], ...]) */
    wants(t, points = pts, extra = 0) {
      const b = t.bounds;
      return points.some(([x, z]) => Math.hypot(Math.max(b.x[0] - x, 0, x - b.x[1]), Math.max(b.z[0] - z, 0, z - b.z[1])) <= radius + extra);
    },
    /** bootGate.js: a gated model (bridge, tunnel) loads only within the radius (+ margin) */
    gate(p, id) { const ok = near(p[0], p[1], MARGIN); if (ok) this.gated.add(id); return ok; },
    gated: new Set(),                               // the gated ids let through (quickReady waits for their models)
  };
}

/** null without ?quick=1 (everything in main.js behind it is skipped) */
export const QUICK = ON ? setup() : null;
if (QUICK) window.__quick = QUICK;

/** main.js, once the camera exists and the boot tile is in: the camera exactly at the spot (the dev panel's Go to rule:
 *  heights over the drawn ground, the orbit target no higher than the eye) */
export function quickCamera({ camera, controls, world }) {
  if (!QUICK || QUICK.mode) return;
  const g = (x, z) => world.ground?.(x, z) ?? world.surface(x, z);
  const [px, ph, pz] = QUICK.cam, [tx, th, tz] = QUICK.look;
  camera.position.set(px, g(px, pz) + ph, pz);
  controls.target.set(tx, Math.min(g(tx, tz) + th, camera.position.y - 0.05), tz);
  if (QUICK.fov) { camera.fov = QUICK.fov; camera.updateProjectionMatrix(); }
  controls.update?.();
}

/** main.js, after the cover: wait until the spot is built, then window.__quickReady. host = { world, manifest, scene,
 *  camera, controls, fader, loading, jobsLeft, frames, log, lighting } */
export async function quickReady(host) {
  const { world, manifest, scene, fader, jobsLeft, log } = host;
  const t0 = performance.now(), maxMs = +(P.get("ready") ?? 90000) || 90000;
  const built = manifest.tiles.filter((t) => t.status !== "missing");
  const expect = () => {
    const want = built.filter((t) => QUICK.wants(t)).map((t) => t.name);
    const roots = [...QUICK.landmarks.filter((k) => P.get(k) !== (OFF_VALUE[k] ?? "0"))];
    if (QUICK.art && P.get("art") !== "old") roots.push("publicart");
    const bridges = [];
    for (const id of QUICK.gated) {
      if (LANDMARKS[id]) continue;
      bridges.push(id.replace(/^rail:/, ""));       // (bridges and tunnels: window.__bridges[name], set once placed)
    }
    return { want, roots, bridges };
  };
  await host.loading?.catch?.(() => {});
  let q = 0, placed = false, st = {};
  const found = new Set();
  while (performance.now() - t0 < maxMs) {
    await new Promise((r) => requestAnimationFrame(() => r()));
    const { want, roots, bridges: wantBridges } = expect();
    const tilesIn = want.filter((n) => world.tiles.some((t) => t.name === n));
    if (!placed && tilesIn.length === want.length) { quickCamera(host); host.lighting && (host.lighting.snapNext = true); placed = true; }
    for (const n of roots) if (!found.has(n) && scene.children.some((o) => o.name === n)) found.add(n);   // (the landmarks' roots are scene children)
    const bridges = window.__bridges ? Object.keys(window.__bridges) : [];
    const missing = roots.filter((n) => !found.has(n)).concat(wantBridges.filter((n) => !bridges.includes(n)).map((n) => `bridge ${n}`));
    st = { tiles: tilesIn.length, want: want.length, fading: fader.list.length, jobs: jobsLeft(), pipes: window.__asyncPipes?.pending ?? 0, missing, bridges };
    const ok = tilesIn.length === want.length && !st.fading && !st.jobs && !st.pipes && !missing.length;
    q = ok ? q + 1 : 0;
    if (q >= 10) break;
  }
  const mem = performance.memory;
  const r = {
    ms: Math.round(performance.now()), ok: q >= 10, coverMs: Math.round(window.__coverAt ?? 0), waitMs: Math.round(performance.now() - t0),
    tiles: world.tiles.map((t) => t.name), heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    landmarks: QUICK.landmarks, bridges: st.bridges, with: QUICK.withList, place: QUICK.place, radius: QUICK.radius,
    frames: host.frames(), errors: window.__quickErrors?.length ?? 0, ...(q >= 10 ? {} : { stuck: st }),
  };
  window.__quickReady = r;
  log(`quick ready: ${r.ms} ms after navigation (cover ${r.coverMs} ms), tiles ${r.tiles.join(" ")}, heap ${r.heapMB} MB${r.ok ? "" : ` (TIME LIMIT: ${JSON.stringify(st)})`}`);
  return r;
}
