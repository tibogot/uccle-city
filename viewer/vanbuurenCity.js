// THE VILLA VAN BUUREN IN THE CITY (?vanbuuren=1): main.js calls addVanBuuren() once, before the first tile (built like
// viewer/townhallCity.js).
//  - its UrbIS solid's BU_ID (models/vanbuuren/vanbuuren.json placement.hides_bu_ids: solid 550409 = BU 1776799 ONLY;
//    509389, the tall grey building against its north side, stays) joins the hide list: the tiles do not draw it in the
//    facades nor the far LOD; it stays in the roof grid and the drive colliders (tileData.js);
//  - the model (viewer/vanbuurenModel.js) loads in the background: GLB decoded in MeshoptDecoder's workers, AO map in a
//    worker; its shaders (and the LOD bands' fading copies) are built through the page's precompile queue (warmup.js)
//    BEFORE it is shown: no shader build on a frame;
//  - the levels cross-fade by distance to the building's box (dithered, lodFade.js objectFade; the shadow pass follows)
//    through the FADING COPIES of the slot materials, drawn only while a level is inside its hand-over band
//    (setLodFades): outside the bands every material is opaque without a discard. ?smooth=0: hard switches.
import * as THREE from "three/webgpu";
import { loadVanBuuren, VB_LODS, setLodFades, vbLodState } from "./vanbuurenModel.js";
import { SMOOTH, fadeProxies } from "./lodFade.js";
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";
import { liteShown } from "./liteShown.js";

/** The SHADOW pass is not in compileAsync: the first frame a level casts a shadow (its first hand-over: the flight's
 *  117 ms frame at 64 m) built its shadow shaders and pipelines on the frame. Warm them before the model shows: every
 *  mesh of every level and every fading copy drawn for one frame, a few per frame, far under the city (both passes see
 *  a draw, nothing reaches the screen or the shadow map), with the pipelines created async (three skips the draw until
 *  ready) and the geometry uploaded on the way. Resolves when all are drawn and their pipelines are ready. */
async function warmShadowPass(renderer, scene, meshes, perFrame = 3) {
  const g = new THREE.Group(); g.name = "vanbuuren-warm"; g.position.set(0, -4000, 0);
  scene.add(g);
  const win = renderer?.backend?.isWebGPUBackend ? openParallelPipelines(renderer, scene) : null;
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  let skipped = 0;
  for (let i = 0; i < meshes.length; i += perFrame) {
    g.clear();
    for (const o of meshes.slice(i, i + perFrame)) {
      const p = new THREE.Mesh(o.geometry, o.material);
      p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.frustumCulled = false;
      p.userData = { ...o.userData, fade: 0.5 };
      g.add(p);
    }
    await frame();
  }
  // keep the last batch until every async pipeline is in, then draw each once more (the skipped draws' pipelines)
  const res = win ? await win.end() : null;
  for (let i = 0; i < meshes.length; i += 12) {
    g.clear();
    for (const o of meshes.slice(i, i + 12)) {
      const p = new THREE.Mesh(o.geometry, o.material);
      p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.frustumCulled = false; p.userData = { ...o.userData, fade: 0.5 };
      g.add(p);
    }
    await frame();
  }
  g.clear(); scene.remove(g);
  return res;
}

export async function addVanBuuren({ scene, updaters, hide, world, manifest, log, compiler, renderer }) {
  const t0 = performance.now();
  const notes = await fetch(new URL("../models/vanbuuren/vanbuuren.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Villa van Buuren: models/vanbuuren/vanbuuren.json missing, the UrbIS solid stays"); return; }
  hide.push(...notes.placement.hides_bu_ids);
  loadVanBuuren().then(async (m) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "vanbuuren";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = VB_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    const fp = fadeProxies(root);
    await compile(fp ? [root, fp] : [root]);
    const tComp = performance.now() - tc;
    const tw = performance.now();
    const meshes = [];
    for (const lv of levels) lv.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (fp) fp.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const warm = await warmShadowPass(renderer, scene, meshes);
    const tWarm = performance.now() - tw;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    let n = 0, home = false;
    const state = { d: 0, shown: [] };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
      root.visible = home;
      if (!home) return;
      const d = m.distance(camPos);
      state.d = d;
      if (SMOOTH) {
        const { shown, fades } = vbLodState(d);
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = VB_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
    });
    log(`Villa van Buuren: scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms + shadow pass ${tWarm.toFixed(0)} ms (in the background)`);
    window.vanbuuren = { model: m, root, levels, tLoad, tComp, tWarm, warm, state };
  }).catch((e) => log(`Villa van Buuren model failed (${e.message}): its UrbIS solid is hidden, reload without ?vanbuuren=1`));
}
