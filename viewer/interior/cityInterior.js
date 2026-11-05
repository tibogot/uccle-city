// THE INTERIOR CELL IN THE CITY (?interior=1, tile I6): the pilot house (models/interior/maison1) streams in when the
// camera or the character comes within 40 m of it and out beyond 60 m (hysteresis), with no frame hitch:
//   - the GLB's meshopt decode runs in MeshoptDecoder's workers, the lightmaps decode as images off the main thread,
//     the materials compile with renderer.compileAsync before the cell is shown; the probe grids bake in ranged slices
//   - the city's façade switches its painted windows for holes over 0.4 s (dithered, viewer/interior/cut.js), so the
//     real windows, frames and door of the cell show; the terrain inside the house is cut too
//   - the portal (viewer/interior/portal.js) skips the whole city while the camera is inside and no opening is in view
//   - third person: the house's footprint prism is excluded in every tile's PrismSet (PrismSet.exclude(BU_ID)), the
//     cell's collider triangles join the CollisionWorld as a TriBVH, the terrain heightfield is ignored inside the
//     house, the front door opens as the character comes near, and the character is lit by the cell's probes inside.
// The only main.js change is the import + one call (behind ?interior=1).
import * as THREE from "three/webgpu";
import { houseCut, setHouseCut } from "./cut.js";
import { loadInterior } from "./interiorModel.js";
import { Portal } from "./portal.js";
import { bakeProbes, probeVariant } from "./probes.js";
import { TriBVH, PrismSet, Heightfield } from "../character/index.js";

const DIR = new URL("../../models/interior/maison1/", import.meta.url).href;
const NEAR = 40, FAR = 60, FADE_S = 0.4;

export async function startCityInterior({ scene, renderer, camera, lighting, updaters, getThird, log = console.log }) {
  if (!houseCut.enabled) return null;
  const spec = await fetch(DIR + "house.json").then((r) => r.json());
  setHouseCut(spec);
  const centre = new THREE.Vector3();
  { const fp = spec.footprint[0]; for (const [x, z] of fp) centre.add(new THREE.Vector3(x, spec.base + 3, z)); centre.multiplyScalar(1 / fp.length); }
  const state = { cell: null, loading: false, portal: null, probes: null, bvh: null, fade: 0, want: false, hooked: null, stats: {} };
  const longTasks = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (state.loading) longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false }); } catch { /* not supported */ }

  async function load() {
    state.loading = true;
    const t0 = performance.now();
    try {
      const cell = await loadInterior(DIR, { renderer, scene, camera });
      scene.add(cell.root);
      state.cell = cell;
      state.portal = new Portal(cell, { camera, sun: lighting.sun });
      log(`interior: ${spec.BU_ID.split("/").pop()} loaded in ${Math.round(performance.now() - t0)} ms (GLB + lightmaps ${cell.stats.loadMs} ms, compiled ${cell.stats.readyMs} ms), ${cell.stats.triangles} triangles, ${cell.stats.draws} draws; long tasks while loading: ${longTasks.length ? longTasks.join(", ") + " ms" : "none"}`);
      state.probes = await bakeProbes(cell, renderer);
      log(`interior: ${state.probes.probes} probes baked in ${state.probes.ms} ms (${state.probes.slices} slices, worst ${state.probes.worstSliceMs} ms)`);
    } catch (e) { log(`interior: load failed: ${e.message}`); }
    state.loading = false;
  }
  function unload() {
    unhook();
    state.portal?.dispose(); state.portal = null;
    state.cell?.dispose(); state.cell = null; state.probes = null;
    log("interior: unloaded");
  }

  // third person: colliders + the body's indoor lighting
  function hook(third) {
    if (state.hooked === third || !state.cell) return;
    unhook();
    const w = third.world;
    const bvh = new TriBVH(state.cell.colliders); bvh.tag = 3;
    w.add(bvh);
    const hf = w.sources.find((s) => s instanceof Heightfield);
    const orig = hf?.height;
    if (hf) { const p = new THREE.Vector3(); hf.height = (x, z) => (state.cell && state.cell.contains(p.set(x, spec.base + 1, z), 0.15) ? -1e4 : orig(x, z)); }
    if (state.probes) {
      third.tp.body.setVariant(probeVariant(state.probes, third.tp.body));
      (async () => { for (const [mesh, ...mats] of third.tp.body.warmModel()) for (const m of mats) { mesh.material = m; await renderer.compileAsync(mesh, camera, scene); } })();
    }
    state.hooked = third; state.bvh = bvh; state.hf = hf; state.hfOrig = orig;
  }
  function unhook() {
    const t = state.hooked; if (!t) return;
    t.world.remove(state.bvh);
    if (state.hf) state.hf.height = state.hfOrig;
    t.tp.body.useVariant(false);
    for (const s of t.world.sources) if (s instanceof PrismSet) s.exclude(spec.BU_ID, false);
    state.hooked = null;
  }

  let last = performance.now(), n = 0;
  const pos = new THREE.Vector3();
  updaters.push((camPos) => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    const third = getThird?.();
    const player = third?.on ? pos.set(third.tp.x, third.tp.y + 1, third.tp.z) : camPos;
    const d = Math.min(player.distanceTo(centre), camPos.distanceTo(centre));
    if (!state.cell && !state.loading && d < NEAR) load();
    if (state.cell && d > FAR) state.want = false; else if (state.cell) state.want = true;
    // façade fade: in once the cell is shown, out before it is unloaded
    state.fade += ((state.cell && state.want ? 1 : 0) - state.fade) * Math.min(1, dt / FADE_S * 3);
    if (Math.abs(state.fade - (state.cell && state.want ? 1 : 0)) < 0.01) state.fade = state.cell && state.want ? 1 : 0;
    houseCut.uFade.value = state.fade;
    if (state.cell && !state.want && state.fade === 0) unload();
    if (!state.cell) return;
    state.cell.update(dt, third?.on ? pos : camPos);
    state.portal.update();
    if (third?.on) {
      hook(third);
      if (n++ % 60 === 0) for (const s of third.world.sources) if (s instanceof PrismSet) s.exclude(spec.BU_ID, true);   // streamed tiles too
      third.tp.body.useVariant(!!state.probes && state.cell.contains(pos, 0.1));
    } else if (state.hooked) unhook();
  });
  window.__interior = state;
  log(`interior: pilot house ${spec.BU_ID.split("/").pop()} on ${spec.tile} (streams in within ${NEAR} m)`);
  return state;
}
