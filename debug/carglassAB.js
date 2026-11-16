// carglass2 vs ?carglass2=old (docs/CARGLASS.md): one page load per variant, the same views: GPU / CPU / draws +
// the car layers' render objects (scene pass) from debug/drawBreakdown.js. Alternate the loads and repeat.
//   const G = await import("/debug/carglassAB.js"); await G.run()
import { ready, at, measure } from "/debug/featureAB.js";
import { run as breakdown } from "/debug/drawBreakdown.js";

// a dense parked street (Uccle centre, the cars2 close-up spot) at 2.5 m and 10 m, and Chaussee d'Alsemberg (traffic)
export const VIEWS = [
  { id: "parked-2.5m", p: [1346.19, 1.5, 436.84], t: [1347.48, 1.1, 434.58], fov: 50 },
  { id: "parked-10m", p: [1342.53, 1.6, 443.28], t: [1347.48, 0.9, 434.58], fov: 40 },
  "alsemberg",
];

export async function run({ views = VIEWS, seconds = 5, settle = 5 } = {}) {
  await ready(8);
  const out = { variant: /[?&]carglass2=old/.test(location.search) ? "old" : "new", views: {} };
  for (const v of views) {
    const id = await at(v, { settle });
    const m = await measure({ seconds });
    const b = await breakdown({ frames: 20, deep: null });
    const cars = b.rows.filter((r) => /car|traffic/.test(r.layer));
    out.views[id] = { gpuP50: m.gpuP50, gpuP95: m.gpuP95, cpuP50: m.cpuP50, scene: b.passes.scene, shadow: b.passes.shadow, cars,
      parked: { ...window.__carFleet?.stats, perLod: undefined }, traffic: window.__traffic?.fleet?.stats?.draws };
  }
  return out;
}
