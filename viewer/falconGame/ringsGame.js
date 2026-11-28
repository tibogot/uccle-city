// THE RING COURSES in the falcon game (rule falcon-rings; owner, docs/TODO.md 4b3: "go through rings: not realistic but
// it's about controlling the falcon well; the goal: the game not boring"). The game menu's three ring modes
// (falconGameDef.js): the course's rings from data/falcon/rings.json (baked in free air over the real tiles by
// tools/falconRingsTest.mjs --bake), the run (ringCourses.js RingRun: in order, timed from the first ring, the medals),
// the best run's ghost (kept in this browser: localStorage, try/catch), R = restart at the course's start.
// Only the active course is loaded; the flight is the city's own (either controller, either model); no pigeons.
import { COURSES, RingRun, ghostAt, medalOf, ringClear, startGamma } from "./ringCourses.js";
import { RingsView } from "./ringsView.js";

const DATA = new URL("../../data/falcon/rings.json", import.meta.url);
const NO_PREY = { none: true };
const R = { view: null, run: null, course: null, id: "", best: null, out: { on: false }, lastGt: 0, saved: null, frameFn: null, hudT: 0, kit: null, active: false };
let bakedP = null;
export const loadCourses = () => (bakedP ??= fetch(DATA).then((r) => { if (!r.ok) throw new Error(`rings.json ${r.status}`); return r.json(); }).catch((e) => { bakedP = null; throw e; }));
const KEY = (id) => `uccle-falcon-rings-${id}`;
function loadBest(id) {
  try { const s = globalThis.localStorage?.getItem(KEY(id)); if (!s) return null; const o = JSON.parse(s); return o && o.data?.length ? { t: o.t, data: new Float32Array(o.data) } : null; } catch { return null; }
}
function saveBest(id, G) {
  try { globalThis.localStorage?.setItem(KEY(id), JSON.stringify({ t: +G.t.toFixed(2), data: Array.from(G.data, (v) => Math.round(v * 100) / 100) })); } catch { /* private window: the best is kept for this session only */ }
}
export const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const MEDAL = { gold: "#ffcf4a", silver: "#d8dee6", bronze: "#d69a5c" };

export const ringsActive = () => R.active;
export const RINGS_STATE = R;

/** start course `id` (spires | avenue | stoop) */
export async function startRings(kit, id) {
  const host = kit.host, fl = host.flyer, def = COURSES[id];
  R.kit = kit;
  await fl.ready;
  let doc;
  try { doc = await loadCourses(); } catch (e) { host.log(`falcon rings: ${e.message}`); kit.hud.toast({ kind: "bad", title: "No ring courses", text: "data/falcon/rings.json did not load." }, 6000); return; }
  const c = doc.courses?.[id];
  if (!c || !def) { kit.hud.toast({ kind: "bad", title: "No such course", text: id }, 6000); return; }
  const course = { def, rings: c.rings.map(([x, y, z, nx, ny, nz, r]) => ({ x, y, z, nx, ny, nz, r })), start: c.start };
  R.view ??= new RingsView(host.scene);
  R.view.setCourse(course);
  await R.view.loadGhost().catch((e) => host.log(`falcon rings ghost: ${e.message}`));
  R.course = course; R.id = id; R.run = new RingRun(course); R.best = loadBest(id); R.hudT = 1;
  await host.fly();
  const g = fl.game;
  R.saved = { pigeons: g.pigeons, reset: Object.prototype.hasOwnProperty.call(g, "reset") ? g.reset : undefined, P: g.f.P };
  g.pigeons = null; g.target = -1;
  // (no hunting on a course: the flyer hands the nearest flock to the game unless a prey source is set; browser check:
  // the falcon caught a pigeon on the avenue and flew on carrying it)
  R.saved.prey = fl.preySource; fl.preySource = NO_PREY;
  // (the tiercel: a fit adult's stamina, as the falcon game's)
  g.f.P = { ...g.f.P, stamina: { ...g.f.P.stamina, drain: 0.045, regen: 0.05 } };
  g.reset = () => restart(fl);
  restart(fl);
  R.lastGt = g.t;
  R.active = true;
  R.frameFn = () => frame(kit, fl);
  host.updaters.push(R.frameFn);
  // (the browser checks: the rings against the live world (its furniture and drawn crowns too), a jump before ring k)
  if (typeof window !== "undefined") window.__falconRings = {
    state: R,
    check: () => R.course.rings.map((q, k) => ({ k, clear: ringClear(fl.w, q) })).filter((r) => !r.clear),
    before(k, d = 30) { const q = R.course.rings[k], h = Math.hypot(q.nx, q.nz) > 0.2 ? Math.atan2(-q.nx, -q.nz) : fl.game.f.heading; fl.start(q.x - q.nx * d, q.z - q.nz * d, h, q.y - q.ny * d, 18, Math.asin(Math.max(-1, Math.min(1, q.ny))) * 0.6); },
  };
  const M = def.medals;
  kit.radio("Rings", `${def.name}: ${def.desc}. ${course.rings.length} rings, the gold one is next; the clock starts at the first. Gold ${fmt(M.gold)}, silver ${fmt(M.silver)}, bronze ${fmt(M.bronze)}. R: start again.`, { icon: "falcon" });
}
function restart(fl) {
  const s = R.course.start;
  fl.start(s.x, s.z, s.heading, s.y, s.V, startGamma(R.course));
  R.run.reset(); R.hudT = 1;
  R.view.update(0, 0, null); R.view.showGhost(null);
}
function frame(kit, fl) {
  if (kit.paused || !fl.on || !R.run) return;
  const g = fl.game, f = g.f, run = R.run;
  // (behind the play loader: held at the course's start, so the area built is the start's and the run starts when
  // the player sees it; browser check: it had flown 500 m past the first ring by the time the loader closed)
  if (window.__playLoader?.active) { R.held = true; restart(fl); R.lastGt = g.t; return; }
  if (R.held) { R.held = false; restart(fl); R.lastGt = g.t; return; }
  const dt = Math.max(0, Math.min(0.1, g.t - R.lastGt)); R.lastGt = g.t;
  const ev = run.update(dt, f.pos, f.heading, f.gamma, f.phi);
  if (ev === "finish") finish(kit);
  R.view.update(dt, run.next, kit.host.camera);
  R.view.showGhost(R.best && run.on && !run.done ? ghostAt(R.best, run.t, R.out) : null);
  if ((R.hudT += dt) >= 0.1) { R.hudT = 0; R.view.text(hudLine()); }
}
function hudLine() {
  const run = R.run, def = R.course.def, n = R.course.rings.length, best = R.best ? ` · best ${fmt(R.best.t)}` : "";
  if (run.done) {
    const m = medalOf(def, run.t);
    return `${def.name} · <b>${fmt(run.t)}</b>${m ? ` · <b style="color:${MEDAL[m]}">${m.toUpperCase()}</b>` : " · no medal"}${best} · <span style="opacity:.75">R: again</span>`;
  }
  const m = medalOf(def, run.t) || "none", goal = m === "none" ? "" : ` · <span style="color:${MEDAL[m]}">${m}</span>`;
  return `${def.name} · ring <b>${Math.min(run.next + 1, n)}</b> / ${n} · <b>${run.on ? fmt(run.t) : "0:00.0"}</b>${run.on ? goal : ""}${best}`;
}
function finish(kit) {
  const run = R.run, def = R.course.def, m = medalOf(def, run.t), was = R.best?.t;
  const better = was == null || run.t < was;
  if (better) { R.best = run.ghost(); saveBest(R.id, R.best); }
  kit.record.score += { gold: 300, silver: 200, bronze: 100 }[m] ?? 20; kit.save?.touch?.();
  kit.radio("Rings", `${def.name} in ${fmt(run.t)}${m ? `: ${m}!` : " (no medal yet)"}${better && was != null ? ` A new best (was ${fmt(was)}): your ghost flies it next time.` : better ? " Your ghost flies it next time." : ` Best ${fmt(was)}.`} R: again.`, { icon: "falcon" });
}
export function stopRings(kit) {
  if (!R.active) return;
  R.active = false;
  const host = kit.host, fl = host.flyer;
  const i = host.updaters.indexOf(R.frameFn); if (i >= 0) host.updaters.splice(i, 1); R.frameFn = null;
  R.view?.hide();
  const g = fl?.game;
  if (g && R.saved) {
    g.pigeons = fl.pigeons ?? R.saved.pigeons ?? null; g.target = -1;
    if (fl.preySource === NO_PREY) fl.preySource = R.saved.prey ?? null;
    if (R.saved.P) g.f.P = R.saved.P;
    if (R.saved.reset === undefined) delete g.reset; else g.reset = R.saved.reset;
  }
  R.saved = null; R.run = null;
}
