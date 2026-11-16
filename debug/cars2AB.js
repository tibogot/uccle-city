// cars2 vs ?cars=old (docs/CARS2.md): one page load per variant, the same fixed views, GPU / CPU / draws / tris +
// the car fleets' own counters (parked: carFleet.stats, traffic: TrafficFleet.stats). Alternate the loads and repeat.
//   const C = await import("/debug/cars2AB.js"); await C.run()            -> { variant, views: { id: {...} } }
import { ready, at, measure } from "/debug/featureAB.js";

export const VIEWS = ["stjob-street", "alsemberg", "stjob", "sacrecoeur-street"];
const pick = (s) => s && { drawn: s.drawn, perLod: s.perLod && [...s.perLod], fading: s.fading, tris: s.tris, draws: s.draws, ms: s.ms != null ? +s.ms.toFixed(3) : undefined };

export async function run({ views = VIEWS, seconds = 5, settle = 6 } = {}) {
  await ready(10);
  const out = { variant: /[?&]cars=old/.test(location.search) ? "old" : "cars2", views: {} };
  for (const id of views) {
    await at(id, { settle });
    const m = await measure({ seconds });
    const tf = window.__traffic?.fleet || window.__traffic?.trafficFleet;
    out.views[id] = { ...m, parked: pick(window.__carFleet?.stats), traffic: pick(tf?.stats) };
  }
  return out;
}

/** A dense parked street near a place: the parked car with the most neighbours within 25 m (loaded tiles), the
 *  camera 2.5 m off its side at 1.7 m looking along its heading. -> { p: [x, 1.7, z], t: [x, 1, z] } for at() */
export function densest(cx = 1153, cz = 540, R = 260) {
  const cars = window.__carFleet.regs.flatMap((r) => r.cars).filter((c) => !c.hidden && (c.x - cx) ** 2 + (c.z - cz) ** 2 < R * R);
  let best = null, bn = -1;
  for (let i = 0; i < cars.length; i += 3) {
    const a = cars[i]; let n = 0;
    for (const b of cars) if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 < 625) n++;
    if (n > bn) { bn = n; best = a; }
  }
  const h = best.heading, fx = Math.sin(h), fz = Math.cos(h), sx = Math.cos(h), sz = -Math.sin(h);
  const px = best.x + sx * 2.6 - fx * 6, pz = best.z + sz * 2.6 - fz * 6;
  return { id: `dense(${bn})`, p: [px, 1.7, pz], t: [px + fx * 30, 1.0, pz + fz * 30], fov: 60 };
}
export async function runDense({ seconds = 5, settle = 6, rounds = 2 } = {}) {
  await ready(10);
  const v = densest(); const out = { variant: /[?&]cars=old/.test(location.search) ? "old" : "cars2", view: v, runs: [] };
  for (let i = 0; i < rounds; i++) {
    await at(v, { settle });
    for (let k = 0; k < 120 && !document.getElementById("cover")?.classList.contains("gone"); k++) await new Promise((r) => setTimeout(r, 500));
    await new Promise((r) => setTimeout(r, 4000));
    const m = await measure({ seconds });
    const tf = window.__traffic?.fleet;
    out.runs.push({ ...m, passes: undefined, parked: pick(window.__carFleet?.stats), traffic: pick(tf?.stats) });
  }
  return out;
}

/** Screenshot helpers: hide every overlay (HUD, dev panel, minimap), keep the canvas. */
export function hideUI() {
  const cv = window.viewer.renderer.domElement;
  for (const el of document.body.querySelectorAll("body > *")) if (!el.contains(cv)) el.style.visibility = "hidden";
  let p = cv.parentElement; while (p && p !== document.body) { for (const c of p.children) if (!c.contains(cv)) c.style.visibility = "hidden"; p = p.parentElement; }
}
/** A close 3/4 view of the parked car nearest the dense spot (LOD0): -> view for at() */
export function closeCar(front = true) {
  const v = densest(); const cars = window.__carFleet.regs.flatMap((r) => r.cars).filter((c) => !c.hidden);
  const [px, , pz] = v.p; let best = null, bd = 1e9;
  for (const c of cars) { const d = (c.x - px) ** 2 + (c.z - pz) ** 2; if (d < bd) { bd = d; best = c; } }
  const h = best.heading, fx = Math.sin(h), fz = Math.cos(h), sx = Math.cos(h), sz = -Math.sin(h), k = front ? 1 : -1;
  // from the street side (the side away from the kerb is unknown: take the side nearer the dense view's camera)
  const side = Math.sign((px - best.x) * sx + (pz - best.z) * sz) || 1;
  const cx = best.x + k * fx * 4.2 + side * sx * 3.2, cz = best.z + k * fz * 4.2 + side * sz * 3.2;
  return { id: `car(${best.type})`, p: [cx, 1.45, cz], t: [best.x + k * fx * 0.6, 0.65, best.z + k * fz * 0.6], fov: 50, type: best.type };
}
