// THE EGLISE SAINT-AUGUSTIN IN THE CITY (on by default; ?augustin=0 = without it): main.js calls addAugustin() once,
// before the first tile. The church stands in Forest, ~180 m north of Uccle's border, in the middle of the Place de
// l'Altitude Cent (a roundabout the road engine draws in tile E1). The city tiles keep only Uccle's buildings, so its
// UrbIS solid was never drawn: nothing is hidden. Its 54 m tower is the landmark on the skyline from the north of
// Uccle, so the model shows whenever its tile E1 is loaded, full or far (the far ring reaches it from ~1.5 km), and
// also beyond that when the horizon ring (?horizon=1) gives it ground to stand on.
// The model loads in the background (meshopt decode and the AO map in workers), its shaders are built through the
// page's precompile queue BEFORE it shows, three levels cross-fade by distance (dithered, lodFade.js through the
// materials' fading copies, used only inside the bands; the shadow pass follows).
import * as THREE from "three/webgpu";
import { loadAugustin, AU_LODS, setLodFades } from "./augustinModel.js";
import { SMOOTH, fadeProxies } from "./lodFade.js";

export async function addAugustin({ scene, updaters, world, manifest, log, compiler }) {
  const t0 = performance.now();
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  const longTasks = [];
  let loading = true;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (loading) longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }
  loadAugustin().then(async (m) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "augustin";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = AU_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    const fp = fadeProxies(root);
    await (await waitCompiler())(fp ? [root, fp] : [root]);
    const tComp = performance.now() - tc;
    loading = false;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const ramp = (d, k) => { const s = AU_LODS[k].until, w = AU_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
    let n = 0, home = false;
    const state = { shown: [false, false, false], fades: [1, 1, 1], d: 0, home: false };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = !!window.__horizon || homes.some((h) => world.tiles.some((t) => t.name === h) || !!scene.getObjectByName(`${h}-lite`));
      root.visible = home; state.home = home;
      if (!home) return;
      const d = m.distance(camPos);
      if (SMOOTH) {
        const t1 = ramp(d, 0), t2 = ramp(d, 1);
        const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
        const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = AU_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
        state.shown = levels.map((g) => g.visible);
      }
      state.d = d;
    });
    log(`Saint-Augustin church (Altitude Cent): scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background); long tasks while streaming: ${longTasks.length ? longTasks.join(", ") + " ms" : "none"}`);
    window.augustin = { model: m, root, levels, tLoad, tComp, longTasks, state };
  }).catch((e) => log(`Saint-Augustin model failed (${e.message})`));
}
