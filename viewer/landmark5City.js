// LANDMARK CHURCHES ROUND 5 IN THE CITY (on by default): the Eglise du Sacre-Coeur (?sacrecoeur=0 = the UrbIS solid) and
// the Eglise Saint-Marc (?saintmarc=0). main.js calls addLandmark5(key, ...) once per church, before the first tile.
// As the Rosaire (viewer/rosaireCity.js): the UrbIS solid each replaces (by BU_ID: placement.hides_bu_ids) joins the hide
// list, so the tiles draw it neither in the facades nor in the far LOD. The model loads in the background (meshopt decode
// and the AO map in workers), its shaders are built through the page's precompile queue BEFORE it shows, three SCRIPTED
// levels cross-fade by distance (dithered, lodFade.js through the materials' fading copies, used only inside the bands;
// the timed settle ramp of perf3: ?lodsettle=0 = the band as before). Shown while one of its tiles is loaded, full or far.
import * as THREE from "three/webgpu";
import { loadChurch, CHURCHES, setLodFades } from "./landmark5Model.js";
import { SMOOTH, fadeProxies, settleRamp } from "./lodFade.js";
import { liteShown } from "./liteShown.js";
import { whenNeeded } from "./bootGate.js";
import { FAR_MERGE_LM, mergeFarLevel } from "./farMerge.js";

export async function addLandmark5(key, { scene, updaters, hide, world, manifest, log, compiler }) {
  const C = CHURCHES[key];
  const t0 = performance.now();
  const notes = await fetch(new URL(`../models/${key}/${key}.json`, import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!notes) { log(`${C.label}: models/${key}/${key}.json missing, the UrbIS solid stays`); return; }
  hide.push(...notes.placement.hides_bu_ids);
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  const longTasks = [];
  let loading = true;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (loading) longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }
  whenNeeded(key).then(() => loadChurch(key)).then(async (m) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = key;
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = C.names.map((_, k) => m.make(k));
    root.add(...levels);
    if (FAR_MERGE_LM) await mergeFarLevel(levels[levels.length - 1], { landmark: true, name: key }).then((r) => r && log?.(`${key}: far LOD ${r.before} -> ${r.after} draws`)).catch((e) => log?.(`far merge: ${e.message}`));   // perfgame round 7 (?farlodlm=1)
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    const fp = fadeProxies(root);                      // the fading copies (drawn only inside the LOD bands) too
    await (await waitCompiler())(fp ? [root, fp] : [root]);
    const tComp = performance.now() - tc;
    loading = false;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const L = C.lods;
    const settle = [settleRamp(), settleRamp()], rampD = (d, k) => THREE.MathUtils.smoothstep(d, L[k].until - L[k].band, L[k].until + L[k].band);
    const ramp = (d, k) => settle[k](rampD(d, k));
    let n = 0, home = false;
    const state = { shown: [false, false, false], fades: [1, 1, 1], d: 0, home: false };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
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
        const k = L.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
        state.shown = levels.map((g) => g.visible);
      }
      state.d = d;
    });
    log(`${C.label}: scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background); long tasks while streaming: ${longTasks.length ? longTasks.join(", ") + " ms" : "none"}`);
    window[key] = { model: m, root, levels, tLoad, tComp, longTasks, state };
  }).catch((e) => log(`${C.label} model failed (${e.message}): its UrbIS solid is hidden, reload with ?${key}=0`));
}
