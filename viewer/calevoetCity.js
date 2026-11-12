// THE GARE D'UCCLE-CALEVOET IN THE CITY (?calevoet=1): main.js calls addCalevoet() once, before the first tile (built
// like viewer/wolvendaelCity.js without the pond).
//  - the UrbIS solid it replaces (models/calevoet_station/calevoet.json placement: solid 534568 = BU 1585341) joins the
//    hide list (tileData.js hideBuildings matches BU_ID or id);
//  - the model (viewer/calevoetModel.js) loads in the background; its shaders, the LOD bands' fading copies AND the
//    shadow pass's pipelines are built BEFORE anything shows (the villa's fix: the shadow pass is not in compileAsync;
//    the first hand-over built it on the frame);
//  - the levels cross-fade by distance (dithered, lodFade.js objectFade, the shadow follows) through the FADING COPIES
//    of the slot materials, drawn only inside the hand-over bands (setLodFades). ?smooth=0: hard switches.
import * as THREE from "three/webgpu";
import { loadCalevoet, CV_LODS, setLodFades, cvLodState } from "./calevoetModel.js";
import { SMOOTH, fadeProxies } from "./lodFade.js";
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";

/** The SHADOW pass is not in compileAsync: the first frame a level casts a shadow built its shadow pipelines on the
 *  frame (the villa's 117 ms first hand-over). Warm them before the model shows: every mesh of every level and every
 *  fading copy drawn one frame (a few per frame) far under the city, pipelines created async. */
async function warmShadowPass(renderer, scene, meshes, perFrame = 3) {
  const g = new THREE.Group(); g.name = "calevoet-warm"; g.position.set(0, -4000, 0);
  scene.add(g);
  const win = renderer?.backend?.isWebGPUBackend ? openParallelPipelines(renderer, scene) : null;
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const batch = (list) => {
    g.clear();
    for (const o of list) {
      const p = new THREE.Mesh(o.geometry, o.material);
      p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.frustumCulled = false;
      p.userData = { ...o.userData, fade: 0.5 };
      g.add(p);
    }
  };
  for (let i = 0; i < meshes.length; i += perFrame) { batch(meshes.slice(i, i + perFrame)); await frame(); }
  const res = win ? await win.end() : null;
  for (let i = 0; i < meshes.length; i += 12) { batch(meshes.slice(i, i + 12)); await frame(); }
  g.clear(); scene.remove(g);
  return res;
}

export async function addCalevoet({ scene, updaters, hide, world, manifest, log, compiler, renderer }) {
  const t0 = performance.now();
  const base = new URL("../models/calevoet_station/", import.meta.url);
  const notes = await fetch(new URL("calevoet.json", base)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Calevoet: models/calevoet_station/ missing, the UrbIS solid stays"); return; }
  hide.push(...notes.placement.hides_bu_ids, ...notes.placement.hides_solids);

  loadCalevoet().then(async (m) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "calevoet";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = CV_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    // compile: the model and its fading copies (async, in the background)
    const tc = performance.now();
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    const fp = fadeProxies(root);
    await compile(fp ? [root, fp] : [root]);
    const tComp = performance.now() - tc;
    // the shadow pass's pipelines
    const tw = performance.now();
    const meshes = [];
    for (const lv of levels) lv.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (fp) fp.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const warm = await warmShadowPass(renderer, scene, meshes);
    const tWarm = performance.now() - tw;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    let n = 0, home = false;
    const state = { d: 0, shown: [], fades: [], on: true };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || !!scene.getObjectByName(`${h}-lite`));
      root.visible = home && state.on;
      if (!home) return;
      const d = m.distance(camPos);
      state.d = d;
      if (SMOOTH) {
        const { shown, fades } = cvLodState(d);
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = CV_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
    });
    log(`Calevoet: scripted station building, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms + shadow pass ${tWarm.toFixed(0)} ms (in the background)`);
    window.calevoet = { model: m, root, levels, tLoad, tComp, tWarm, warm, state };
  }).catch((e) => log(`Calevoet model failed (${e.message}): its UrbIS solid is hidden, reload without ?calevoet=1`));
}
