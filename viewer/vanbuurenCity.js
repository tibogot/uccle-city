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

export async function addVanBuuren({ scene, updaters, hide, world, manifest, log, compiler }) {
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
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    let n = 0, home = false;
    const state = { d: 0, shown: [] };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || !!scene.getObjectByName(`${h}-lite`));
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
    log(`Villa van Buuren: scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background)`);
    window.vanbuuren = { model: m, root, levels, tLoad, tComp, state };
  }).catch((e) => log(`Villa van Buuren model failed (${e.message}): its UrbIS solid is hidden, reload without ?vanbuuren=1`));
}
