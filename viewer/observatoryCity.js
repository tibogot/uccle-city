// THE ROYAL OBSERVATORY IN THE CITY (?observatory=1): main.js calls addObservatory() once, before the first tile.
//  - its UrbIS solids (models/observatory/observatory.json placement.hides_solids) join the hide list: the tiles do
//    not draw them in the façades nor the far LOD; they stay in the roof grid and the drive colliders (tileData.js);
//  - the model (viewer/observatoryModel.js) loads in the background: GLB decoded in MeshoptDecoder's workers, AO map
//    decoded in a worker, LODs precomputed offline (no simplification here); its shaders are built through the
//    page's precompile queue (warmup.js) BEFORE it is shown: no shader build on a frame;
//  - three levels cross-fade by distance to the campus' bounding box (dithered, lodFade.js objectFade; the shadow
//    pass uses the same fade, so the shadows follow the LOD the eye sees). ?smooth=0: hard switches.
import * as THREE from "three/webgpu";
import { loadObservatory, OBS_LODS, OBS_SLOTS } from "./observatoryModel.js";
import { withObjectFade, SMOOTH } from "./lodFade.js";
import { liteShown } from "./liteShown.js";

export async function addObservatory({ scene, updaters, hide, world, manifest, log, compiler }) {
  const t0 = performance.now();
  const notes = await fetch(new URL("../models/observatory/observatory.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Observatory: models/observatory/observatory.json missing, the UrbIS solids stay"); return; }
  hide.push(...notes.placement.hides_solids);
  loadObservatory().then(async (m) => {
    const tLoad = performance.now() - t0;
    for (const s of OBS_SLOTS) if (SMOOTH) withObjectFade(m.materials[s]);
    const root = new THREE.Group(); root.name = "observatory";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = OBS_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    // shaders before the first frame it shows: wait for the page's precompile queue (set once the pipeline exists)
    const tc = performance.now();
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    await compile([root]);
    const tComp = performance.now() - tc;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const ramp = (d, k) => { const s = OBS_LODS[k].until, w = OBS_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
    let n = 0, home = false;
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
      root.visible = home;
      if (!home) return;
      const d = m.distance(camPos);
      if (SMOOTH) {
        const t1 = ramp(d, 0), t2 = ramp(d, 1);
        const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];        // outgoing keeps n >= t (2 + t), incoming n < t
        const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
        levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) for (const o of g.children) o.userData.fade = fades[k]; });
      } else {
        const k = OBS_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
    });
    log(`Royal Observatory: scripted campus, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background)`);
    window.observatory = { model: m, root, levels, tLoad, tComp };
  }).catch((e) => log(`Royal Observatory model failed (${e.message}): its UrbIS solids are hidden, reload without ?observatory=1`));
}
