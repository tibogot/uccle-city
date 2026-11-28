// THE PAPENKASTEEL (Chateau de Stalle, the castle on the Geleytsbeek) IN THE CITY: main.js calls addPapenkasteel() once,
// before the first tile; ?papenkasteel=0 (alias ?geleytsbeek=0) = the UrbIS solids as before (a copy of
// viewer/calevoetCity.js, itself built
// like viewer/wolvendaelCity.js without the pond).
//  - the UrbIS solids it replaces (models/papenkasteel/papenkasteel.json placement: solids 528339 = BU 1726277, the house,
//    tower and annexes, and 528019, the outbuildings, BU_ID null: hidden by solid id) join the
//    hide list (tileData.js hideBuildings matches BU_ID or id);
//  - the model (viewer/papenkasteelModel.js) loads in the background; its shaders, the LOD bands' fading copies AND the
//    shadow pass's pipelines are built BEFORE anything shows (the villa's fix: the shadow pass is not in compileAsync;
//    the first hand-over built it on the frame);
//  - the levels cross-fade by distance (dithered, lodFade.js objectFade, the shadow follows) through the FADING COPIES
//    of the slot materials, drawn only inside the hand-over bands (setLodFades). ?smooth=0: hard switches.
import * as THREE from "three/webgpu";
import { loadPapenkasteel, PK_LODS, setLodFades, pkLodState } from "./papenkasteelModel.js";
import { SMOOTH, fadeProxies, fadeShadowProxies } from "./lodFade.js";
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";
import { liteShown } from "./liteShown.js";
import { whenNeeded } from "./bootGate.js";   // boot2: ?bootdefer=1: far models load after the cover (viewer/bootGate.js; off by default)
import { FAR_MERGE_LM, mergeFarLevel } from "./farMerge.js";

/** The SHADOW pass is not in compileAsync: the first frame a level casts a shadow built its shadow pipelines on the
 *  frame (the villa's 117 ms first hand-over). Warm them before the model shows: every mesh of every level and every
 *  fading copy drawn one frame (a few per frame) far under the city, pipelines created async. */
async function warmShadowPass(renderer, scene, meshes, perFrame = 3) {
  const g = new THREE.Group(); g.name = "papenkasteel-warm"; g.position.set(0, -4000, 0);
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

export async function addPapenkasteel({ scene, updaters, hide, world, manifest, log, compiler, renderer }) {
  const t0 = performance.now();
  const base = new URL("../models/papenkasteel/", import.meta.url);
  const notes = await fetch(new URL("papenkasteel.json", base)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Papenkasteel: models/papenkasteel/ missing, the UrbIS solids stay"); return; }
  hide.push(...notes.placement.hides_bu_ids, ...notes.placement.hides_solids);

  whenNeeded("papenkasteel").then(() => loadPapenkasteel()).then(async (m) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "papenkasteel";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = PK_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    if (FAR_MERGE_LM) await mergeFarLevel(levels[levels.length - 1], { landmark: true, name: "papenkasteel" }).then((r) => r && log?.(`papenkasteel: far LOD ${r.before} -> ${r.after} draws`)).catch((e) => log?.(`far merge: ${e.message}`));   // perfgame round 7 (?farlodlm=old: off)
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
    // (claude/perf7, rule fade-shadow-warm) every (fading copy, geometry layout) in the shadow pass: fp has one stand-in per
    // NEW copy, on its first mesh's geometry, so a level with another layout built its copy's shadow on screen at its first
    // LOD fade (the police station's levels: 9 builds, 90 ms in one frame, ~9 s into a police drive)
    for (const r of [root]) fadeShadowProxies(r)?.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const warm = await warmShadowPass(renderer, scene, meshes);
    const tWarm = performance.now() - tw;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    let n = 0, home = false;
    const state = { d: 0, shown: [], fades: [], on: true };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
      root.visible = home && state.on;
      if (!home) return;
      const d = m.distance(camPos);
      state.d = d;
      if (SMOOTH) {
        const { shown, fades } = pkLodState(d);
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = PK_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
    });
    log(`Papenkasteel: scripted castle (the Geleytsbeek), LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms + shadow pass ${tWarm.toFixed(0)} ms (in the background)`);
    window.papenkasteel = { model: m, root, levels, tLoad, tComp, tWarm, warm, state };
  }).catch((e) => log(`Papenkasteel model failed (${e.message}): its UrbIS solids are hidden, reload with ?papenkasteel=0`));
}
