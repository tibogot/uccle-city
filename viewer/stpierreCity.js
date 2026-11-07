// THE EGLISE SAINT-PIERRE IN THE CITY (?stpierre=1): main.js calls addStPierre() once, before the first tile.
// The UrbIS solid it replaces (by BU_ID: placement.hides_bu_ids) joins the hide list: the tiles draw it neither in the
// facades nor in the far LOD; it stays in the roof grid and the drive colliders (as the Saint-Job church and Stalle).
// The model loads in the background (meshopt decode and the AO map in workers), its shaders are built through the page's
// precompile queue (warmup.js) BEFORE it shows, three levels cross-fade by distance (dithered, lodFade.js objectFade; the
// shadow pass follows). Shown while one of its tiles (E3 / E4) is loaded, full or far.
import * as THREE from "three/webgpu";
import { loadStPierre, SP_LODS, SP_SLOTS } from "./stpierreModel.js";
import { withObjectFade, SMOOTH } from "./lodFade.js";

export async function addStPierre({ scene, updaters, hide, world, manifest, log, compiler }) {
  const t0 = performance.now();
  const notes = await fetch(new URL("../models/stpierre/stpierre.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Saint-Pierre: models/stpierre/stpierre.json missing, the UrbIS solid stays"); return; }
  hide.push(...notes.placement.hides_bu_ids);
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  const longTasks = [];
  let loading = true;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (loading) longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }
  loadStPierre().then(async (m) => {
    const tLoad = performance.now() - t0;
    for (const s of SP_SLOTS) if (SMOOTH) withObjectFade(m.materials[s]);
    const root = new THREE.Group(); root.name = "stpierre";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = SP_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    await (await waitCompiler())([root]);
    const tComp = performance.now() - tc;
    loading = false;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const ramp = (d, k) => { const s = SP_LODS[k].until, w = SP_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
    let n = 0, home = false;
    const state = { shown: [false, false, false], fades: [1, 1, 1], d: 0 };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || !!scene.getObjectByName(`${h}-lite`));
      root.visible = home;
      if (!home) return;
      const d = m.distance(camPos);
      if (SMOOTH) {
        const t1 = ramp(d, 0), t2 = ramp(d, 1);
        const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
        const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
        levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) for (const o of g.children) o.userData.fade = fades[k]; });
        state.shown = shown; state.fades = fades;
      } else {
        const k = SP_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
        state.shown = levels.map((g) => g.visible);
      }
      state.d = d;
    });
    log(`Saint-Pierre church: scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background); long tasks while streaming: ${longTasks.length ? longTasks.join(", ") + " ms" : "none"}`);
    window.stpierre = { model: m, root, levels, tLoad, tComp, longTasks, state };
  }).catch((e) => log(`Saint-Pierre model failed (${e.message}): its UrbIS solid is hidden, reload without ?stpierre=1`));
}
