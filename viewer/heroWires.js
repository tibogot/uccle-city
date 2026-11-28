// HERO IRONWORK AND GLAZING BARS, PRE-FILTERED (claude/defects3, rule 35 round 2: docs/JITTER.md section 6).
//
// WHY: the heroes' thin strokes (the police station's 3-5 mm cast-iron grille, the 18-29 mm white glazing bars of La Tour
// de Frein, Papenkasteel, Wolvendael) are modelled bars; past ~10-30 m they are under one internal pixel of the TAAU, hit
// or missed by each jitter phase, and the history's clamp throws the misses away: they crawl while the camera moves
// (owner 2026-11-18). The heroes' COLOR_0.b "cover" darkening (wrapAO) only evens the colour of what is drawn; the
// raster lottery stays. The cards of the gardens / the façade kit do not fit a hero (one merged mesh per slot, strokes in
// every façade plane, four loaders: docs/JITTER.md section 2).
// HOW (Persson's "phone-wire AA", as the tram catenary of viewer/tram.js): every STRAIGHT thin stroke (thinBars.js
// strokes(): 4V / A under 3 cm, elongated, not a plate) is widened in the vertex stage about its own axis to at least
// wireHalfPx (0.6 internal px half-width under the TAAU: it is never missed by a jitter phase), and keeps 1 / widening of
// its pixels by a screen dither (maskNode, every pass): its coverage stays the true one, the TAAU history resolves the
// dither into a steady thin line. Close up (the stroke wider than the minimum) nothing changes. Per vertex: aWire =
// (offset from the stroke's axis xyz, half-width), computed once per geometry at load (zeros off the strokes).
// ?herowire=1 on (opt-in, see HERO_WIRE); native (?upscale=0) never (no TAAU to resolve the dither).
import * as THREE from "three/webgpu";
import { attribute, float, max, length, varying, modelWorldMatrix, positionLocal, vec4, select } from "three/tsl";
import { wireData } from "./heroWireData.js";
export { wireData };
import { lodEye, ditherNoise } from "./lodFade.js";
import { UPSCALE, wireHalfPx } from "./upscale.js";

const qs = typeof location === "undefined" ? new URLSearchParams("") : new URLSearchParams(location.search);
// OPT-IN (?herowire=1): the browser A/B (docs/JITTER.md 6) measured no shimmer gain over the old look (La Tour de Frein
// 20 / 40 / 70 m, the police yard, 1.5 and 8 m/s: within +-3 %); kept for the next round, off by default
export const HERO_WIRE = UPSCALE && qs.get("herowire") === "1";
/** only the joinery / ironwork slots (a far level's thin brick / stone bands would put a discard on whole walls) */
export const THIN_SLOTS = new Set(["wood_frame_white", "wood_frame_dark", "cast_iron_green", "galvanised_steel", "alu_anthracite", "painted_metal_white"]);
function posOf(geometry) {
  const p = geometry.attributes.position;
  return p.isInterleavedBufferAttribute || p.normalized || !(p.array instanceof Float32Array)
    ? Float32Array.from({ length: p.count * 3 }, (_, k) => p.getComponent(Math.floor(k / 3), k % 3)) : p.array;
}
/** attach aWire to a three geometry, here (the gate / labs; the city uses wireGeometries: off the main thread) */
export function wireGeometry(geometry) {
  if (geometry.userData.wire) return geometry.userData.wire;
  const r = wireData(posOf(geometry), geometry.index ? geometry.index.array : null);
  geometry.setAttribute("aWire", new THREE.BufferAttribute(r.data, 4));
  return (geometry.userData.wire = { strokes: r.strokes, wired: r.wired, bent: r.bent });
}
let worker = null, seq = 0;
const waiting = new Map();
/** every geometry's aWire computed in a worker (viewer/heroWireWorker.js: ~150-210 ms a hero, never on the main
 *  thread) -> [stats per geometry]; off (?herowire=old / native): nothing, [] */
export async function wireGeometries(geometries) {
  if (!HERO_WIRE || typeof Worker === "undefined") return [];
  const todo = geometries.filter((g) => !g.userData.wire);
  if (todo.length) {
    worker ??= (() => {
      const w = new Worker(new URL("./heroWireWorker.js", import.meta.url), { type: "module" });
      w.onmessage = (e) => { const f = waiting.get(e.data.id); waiting.delete(e.data.id); f?.(e.data); };
      // (a worker that fails to start: every waiting hero gets its data here, never a hero that does not load)
      w.onerror = (e) => { e.preventDefault?.(); for (const [k, f] of waiting) { waiting.delete(k); f(null); } };
      return w;
    })();
    const id = ++seq;
    const jobs = todo.map((g) => ({ pos: posOf(g).slice(), index: g.index ? g.index.array.slice() : null }));
    const res = await new Promise((ok) => { waiting.set(id, ok); worker.postMessage({ id, jobs }, jobs.flatMap((j) => [j.pos.buffer, ...(j.index ? [j.index.buffer] : [])])); });
    if (!res) { todo.forEach((g) => wireGeometry(g)); return geometries.map((g) => g.userData.wire); }
    todo.forEach((g, k) => {
      const r = res.out[k];
      g.setAttribute("aWire", new THREE.BufferAttribute(r.data, 4));
      g.userData.wire = { strokes: r.strokes, wired: r.wired, bent: r.bent };
    });
  }
  return geometries.map((g) => g.userData.wire);
}

/** 1 off the wired strokes, 0 on them (the heroes' wrapAO "cover" darkening: the wire keeps the true coverage itself) */
export function wireOff() {
  return HERO_WIRE ? select(attribute("aWire", "vec4").w.greaterThan(0), float(0), float(1)) : float(1);
}

/** the material with its strokes widened to >= wireHalfPx and dithered to their true coverage (the material itself
 *  changed: call it on the hero's own clone) */
export function withWire(m) {
  if (!HERO_WIRE || m.userData.wire) return m;
  const a = attribute("aWire", "vec4"), hw = a.w;
  const wp = modelWorldMatrix.mul(vec4(positionLocal, 1)).xyz;
  const minHalf = length(lodEye.sub(wp)).mul(wireHalfPx);
  const s = select(hw.greaterThan(0), max(float(1), minHalf.div(max(hw, 1e-4))), float(1));
  m.positionNode = (m.positionNode ?? positionLocal).add(a.xyz.mul(s.sub(1)));
  const keep = ditherNoise().lessThan(varying(float(1).div(s)));
  m.maskNode = m.maskNode ? m.maskNode.and(keep) : keep;
  m.userData.wire = true;
  m.needsUpdate = true;
  return m;
}
