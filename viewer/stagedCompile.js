// STAGED LANDMARK COMPILES (perfgame round 5, docs/PERF_GAME.md; ?stagedlod=old = every level + fading copy at once).
// Each landmark loader hands the precompile queue its whole model in one job: every LOD level and every level's fading
// copies (lodFade.fadeProxies). For a landmark far from the player only the LAST level (the far one, "until: Infinity")
// can be on screen: the near levels show inside 55-670 m (their LOD tables) and the fading copies only inside the bands.
// After a boot the play loader waited for all of it (~25-37 s of serial compile queue, 15 landmarks + 9 bridges).
// Here a landmark farther than NEAR from the player compiles its far level at once (the job the loader waits for);
// the rest (near levels, fading copies, anything else in the same call) is kept and queued in the background when the
// player comes within NEAR of it, or will within LEAD seconds at the current speed: compiled minutes or at least
// LEAD s before the first near level is drawn (NEAR 1000 m vs <= 670 m for the farthest hand-over). The landmark's own
// code is unchanged: it awaits the far part and shows; its LOD updater draws the near levels once the player is close,
// by which time they are built. A teleport near a deferred landmark queues it at once (the play loader then waits for
// it: its job carries the landmark's name, main.js areaReady nearModel).
import * as THREE from "three/webgpu";
import { GATED } from "./bootGate.js";

export const STAGED = typeof location === "undefined" || new URLSearchParams(location.search).get("stagedlod") !== "old";
const NEAR = 1000, LEAD = 25;
const deferred = [];            // { name, x, z, roots, compile, done }
let focus = null, last = null, lastT = 0, vx = 0, vz = 0, timer = null;

const keyOf = (n) => String(n || "").replace(/^bridge-/, "").replace(/-lod\d+$/, "");
const LEVEL = /[_-]lod(\d+)$/;
const levelsOf = (r) => r.children.filter((c) => LEVEL.test(c.name || "")).sort((a, b) => +LEVEL.exec(a.name)[1] - +LEVEL.exec(b.name)[1]);
const isLandmark = (r) => r?.isObject3D && !!(GATED[keyOf(r.name)] || GATED[`rail:${keyOf(r.name)}`]) && levelsOf(r).length >= 2;

/** main.js: where the player is (x, z), for the distance tests */
export function setStagedFocus(fn) {
  focus = fn;
  if (!timer) timer = setInterval(tick, 500);
}

function tick() {
  if (!focus || !deferred.length) return;
  const p = focus(); if (!p) return;
  const now = performance.now();
  if (last) { const dt = Math.max(0.05, (now - lastT) / 1000); vx = vx * 0.6 + ((p[0] - last[0]) / dt) * 0.4; vz = vz * 0.6 + ((p[1] - last[1]) / dt) * 0.4; }
  last = p; lastT = now;
  // a jump (teleport): no velocity
  if (Math.hypot(vx, vz) > 120) vx = vz = 0;
  for (const d of deferred) {
    if (d.done) continue;
    const dNow = Math.hypot(d.x - p[0], d.z - p[1]);
    const dSoon = Math.hypot(d.x - (p[0] + vx * LEAD), d.z - (p[1] + vz * LEAD));
    if (dNow < NEAR || dSoon < NEAR) release(d);
  }
  for (let i = deferred.length - 1; i >= 0; i--) if (deferred[i].done) deferred.splice(i, 1);
}
function release(d) {
  d.done = true;
  d.compile(d.roots, { names: [d.name] }).then(() => { d.resolve?.(); }, () => { d.resolve?.(); });
}

/** wrap a compileFor(roots, o): staged for far landmarks. Returns the same promise shape (the far part). */
export function stagedCompiler(compile) {
  if (!STAGED) return compile;
  return (roots, o) => {
    const list = [].concat(roots).filter(Boolean);
    const lm = list.filter(isLandmark);
    const p = focus?.();
    if (!lm.length || !p) return compile(roots, o);
    const now = [], later = [];
    for (const r of lm) {
      r.updateMatrixWorld(true);
      const w = r.getWorldPosition(new THREE.Vector3());
      if (Math.hypot(w.x - p[0], w.z - p[1]) < NEAR) return compile(roots, o);          // (one near: the whole call as before)
    }
    for (const r of list) {
      if (lm.includes(r)) {
        const levels = levelsOf(r);
        now.push(levels[levels.length - 1]);                                         // the far level
        later.push(...levels.slice(0, -1));
        for (const c of r.children) if (!levels.includes(c)) now.push(c);           // (other parts: a statue group... now)
      } else if (!r.name) later.push(r);                                             // (unnamed: fading-copy stand-ins)
      else now.push(r);                                                              // (a yard, a car group...: small, now)
    }
    const w = lm[0].getWorldPosition(new THREE.Vector3());
    const d = { name: lm[0].name, x: w.x, z: w.z, roots: later, compile, done: false };
    deferred.push(d);
    return compile(now, { ...o, names: [lm[0].name] });
  };
}
/** (debug) the deferred landmark parts */
export const stagedState = () => deferred.map((d) => ({ name: d.name, parts: d.roots.length, done: d.done }));
