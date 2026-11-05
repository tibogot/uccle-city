// THE UCCLE TOWN HALL IN THE CITY (?townhall=1): main.js calls addTownHall() once, before the first tile.
//  - its UrbIS solid's BU_ID (models/townhall/townhall.json placement.hides_bu_ids) joins the hide list: the tiles do
//    not draw it in the facades nor the far LOD; it stays in the roof grid and the drive colliders (tileData.js);
//  - the model (viewer/townhallModel.js) loads in the background: GLB decoded in MeshoptDecoder's workers, AO map
//    decoded in a worker, LODs precomputed offline; its shaders are built through the page's precompile queue
//    (warmup.js) BEFORE it is shown: no shader build on a frame;
//  - three levels cross-fade by distance to the building's box (dithered, lodFade.js objectFade; the shadow pass uses
//    the same fade). ?smooth=0: hard switches.
import * as THREE from "three/webgpu";
import { loadTownHall, TH_LODS, TH_SLOTS } from "./townhallModel.js";
import { withObjectFade, SMOOTH } from "./lodFade.js";

export async function addTownHall({ scene, updaters, hide, world, manifest, log, compiler }) {
  const t0 = performance.now();
  const notes = await fetch(new URL("../models/townhall/townhall.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Town hall: models/townhall/townhall.json missing, the UrbIS solid stays"); return; }
  hide.push(...notes.placement.hides_bu_ids);
  loadTownHall().then(async (m) => {
    const tLoad = performance.now() - t0;
    for (const s of TH_SLOTS) if (SMOOTH) withObjectFade(m.materials[s]);
    const root = new THREE.Group(); root.name = "townhall";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = TH_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    await compile([root]);
    const tComp = performance.now() - tc;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const ramp = (d, k) => { const s = TH_LODS[k].until, w = TH_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
    let n = 0, home = false;
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || !!scene.getObjectByName(`${h}-lite`));
      root.visible = home;
      if (!home) return;
      const d = m.distance(camPos);
      if (SMOOTH) {
        const t1 = ramp(d, 0), t2 = ramp(d, 1);
        const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];        // outgoing keeps n >= t (2 + t), incoming n < t
        const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
        levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) for (const o of g.children) o.userData.fade = fades[k]; });
      } else {
        const k = TH_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
    });
    log(`Uccle town hall: scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background)`);
    window.townhall = { model: m, root, levels, tLoad, tComp };
  }).catch((e) => log(`Town hall model failed (${e.message}): its UrbIS solid is hidden, reload without ?townhall=1`));
}
