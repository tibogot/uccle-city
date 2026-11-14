// THE CHATEAU DE WOLVENDAEL + ITS POND IN THE CITY (?wolvendael=1): main.js calls addWolvendael() once, before the
// first tile (built like viewer/vanbuurenCity.js, claude/vanbuuren).
//  - the UrbIS solids it replaces (models/wolvendael_chateau/wolvendael.json placement: 537523 has no BU_ID in the
//    tile, so its solid id; 538880 = BU 1587095) join the hide list (tileData.js hideBuildings matches BU_ID or id);
//  - THE POND (OSM 31664019 at the measured level 46.72, models/wolvendael_chateau/site.json "pond") joins the pond list:
//    the tiles carve its bed under the terrain (viewer/water/pondBed.js) and the water surface (viewer/water/
//    pondWater.js) lies on it, with its planar reflection of the château, the terrain round it, the trees and the sky
//    only while it is on screen and near;
//  - the model (viewer/wolvendaelModel.js) loads in the background; its shaders, the LOD bands' fading copies, the
//    pond's materials AND the shadow pass and the reflection pass's pipelines are built BEFORE anything shows (the
//    villa's fix: the shadow pass is not in compileAsync; the first hand-over built it on the frame);
//  - the levels cross-fade by distance (dithered, lodFade.js objectFade, the shadow follows) through the FADING COPIES
//    of the slot materials, drawn only inside the hand-over bands (setLodFades). ?smooth=0: hard switches.
import * as THREE from "three/webgpu";
import { loadWolvendael, WV_LODS, setLodFades, wvLodState } from "./wolvendaelModel.js";
import { SMOOTH, fadeProxies } from "./lodFade.js";
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";
import { precompile } from "./warmup.js";
import { Heightmap } from "./heightmap.js";
import { pondBedGrid } from "./water/pondBed.js";
import { createPond, POND_LAYER, REFL_MRT, buildReflectionTrees } from "./water/pondWater.js";
import { liteShown } from "./liteShown.js";

/** the pond's measured description (site.json "pond"): the same object goes to the tiles (the carve) and the water */
export function wolvendaelPond(site) {
  const p = site.pond;
  return { id: "wolvendael", osm: p.osm, ring: p.ring_city, level: p.water_level, maxDepth: 0.9, ramp: 3.0, wet: 0.14, grow: 1.0 };
}

/** The SHADOW pass is not in compileAsync: the first frame a level casts a shadow built its shadow pipelines on the
 *  frame (the villa's 117 ms first hand-over). Warm them before the model shows: every mesh of every level and every
 *  fading copy drawn one frame (a few per frame) far under the city, pipelines created async. */
async function warmShadowPass(renderer, scene, meshes, perFrame = 3) {
  const g = new THREE.Group(); g.name = "wolvendael-warm"; g.position.set(0, -4000, 0);
  scene.add(g);
  const win = renderer?.backend?.isWebGPUBackend ? openParallelPipelines(renderer, scene) : null;
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const batch = (list) => {
    g.clear();
    for (const o of list) {
      const p = new THREE.Mesh(o.geometry, o.material);
      p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.frustumCulled = false;
      p.userData = { ...o.userData, fade: 0.5 };
      if (o.isInstancedMesh) { const q = new THREE.InstancedMesh(o.geometry, o.material, o.count); q.instanceMatrix = o.instanceMatrix; q.frustumCulled = false; g.add(q); }
      else g.add(p);
    }
  };
  for (let i = 0; i < meshes.length; i += perFrame) { batch(meshes.slice(i, i + perFrame)); await frame(); }
  const res = win ? await win.end() : null;
  for (let i = 0; i < meshes.length; i += 12) { batch(meshes.slice(i, i + 12)); await frame(); }
  g.clear(); scene.remove(g);
  return res;
}

export async function addWolvendael({ scene, updaters, hide, ponds, world, manifest, log, compiler, renderer, lighting }) {
  const t0 = performance.now();
  const base = new URL("../models/wolvendael_chateau/", import.meta.url);
  const [notes, site] = await Promise.all([
    fetch(new URL("wolvendael.json", base)).then((r) => r.json()).catch(() => null),
    fetch(new URL("site.json", base)).then((r) => r.json()).catch(() => null),
  ]);
  if (!notes || !site) { log("Wolvendael: models/wolvendael_chateau/ missing, the UrbIS solids stay"); return; }
  hide.push(...notes.placement.hides_bu_ids, ...notes.placement.hides_solids);
  const pondDesc = wolvendaelPond(site);
  ponds.push(pondDesc);
  // the pond's bed from the SAME ground the tile worker carves (tile F4's 1 m DTM grid)
  const tileOf = manifest.tiles.find((t) => pondDesc.ring.every(([x, z]) => x >= t.bounds.x[0] && x <= t.bounds.x[1] && z >= t.bounds.z[0] && z <= t.bounds.z[1]));
  const DATA = new URL("../data/tiles/", import.meta.url);
  const pondReady = (async () => {
    const [hdr, buf] = await Promise.all([fetch(new URL(tileOf.files.terrainHeader, DATA)).then((r) => r.json()), fetch(new URL(tileOf.files.terrain, DATA)).then((r) => r.arrayBuffer())]);
    const hm = new Heightmap(hdr, buf);
    const bed = pondBedGrid(pondDesc, hm.ground);
    // the water's depth for drive mode (viewer/drive/carEnv.js: the car wades in and bogs down, no wall at the shore)
    (world.waters ??= []).push({ x0: bed.x0, z0: bed.z0, x1: bed.x0 + (bed.cols - 1) * bed.step, z1: bed.z0 + (bed.rows - 1) * bed.step, depthAt: bed.depthAt });
    return createPond({ pond: pondDesc, bed, renderer });
  })();

  Promise.all([loadWolvendael(), pondReady]).then(async ([m, pond]) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "wolvendael";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = WV_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false; pond.group.visible = false;
    const pc0 = pond.water.geometry.boundingSphere.center.clone();
    scene.add(root, pond.group);
    root.updateMatrixWorld(true);
    // what the pond reflects: the château (every level and its fading copies), the sky dome, the terrain and trees of
    // the pond's tile and its neighbours (rescanned: tiles stream), the reeds
    if (pond.reeds) pond.addReflected(pond.reeds);
    const sky = scene.getObjectByName("FirmamentSkyDome") || lighting?.sky?.mesh || lighting?.sky;
    if (sky?.isObject3D) pond.addReflected(sky);
    pond.setSuspend(() => {
      const s = lighting?.sun?.shadow; if (!s) return null;
      const a = s.autoUpdate, n = s.needsUpdate; s.autoUpdate = false; s.needsUpdate = false;
      return () => { s.autoUpdate = a; s.needsUpdate = n; };
    });
    const near = new Set([tileOf.name]);
    for (const t of manifest.tiles) {
      const dx = Math.max(t.bounds.x[0] - tileOf.bounds.x[1], tileOf.bounds.x[0] - t.bounds.x[1], 0), dz = Math.max(t.bounds.z[0] - tileOf.bounds.z[1], tileOf.bounds.z[0] - t.bounds.z[1], 0);
      const px = (pondDesc.ring[0][0]), pz = pondDesc.ring[0][1];
      if (dx === 0 && dz === 0 && Math.max(t.bounds.x[0] - px, px - t.bounds.x[1], t.bounds.z[0] - pz, pz - t.bounds.z[1]) < 150) near.add(t.name);
    }
    // (the city's tree field in the reflection pass costs ~1.8 ms GPU: by default the reflection draws the trees round the
    // pond as cheap proxies instead; reflTrees = the real field, for A/B)
    const state = { reflTerrain: true, reflTrees: false, reflProxies: true };
    const ptiles = manifest.tiles.filter((t) => t.bounds.x[0] < pc0.x + 100 && t.bounds.x[1] > pc0.x - 100 && t.bounds.z[0] < pc0.z + 100 && t.bounds.z[1] > pc0.z - 100);
    const feats = await Promise.all(ptiles.map((t) => fetch(new URL(t.files.features, DATA)).then((r) => r.json()).catch(() => null)));
    const proxies = buildReflectionTrees(feats.flatMap((f) => f?.trees || []), pc0, 95);
    if (proxies) scene.add(proxies);
    // An object joins the reflection only once its shaders are built for the reflection pass (its target format, no
    // MRT: other pipelines than the scene pass's): precompiled in the background first. Run 1 of the city flight before
    // this: 0.4-1.9 s frames near the pond (the sky dome and the neighbour tiles' terrain built on the frame).
    const camC = new THREE.PerspectiveCamera(50, 1.5, 0.5, 5000); camC.layers.enableAll();
    const pending = new WeakSet();
    const toReflection = (o) => {
      if (o.layers.isEnabled(POND_LAYER) || pending.has(o)) return;
      pending.add(o);
      precompile(renderer, [o], camC, scene, { target: pond.refl.rt, mrt: REFL_MRT }).then(() => pond.addReflected(o), () => pond.addReflected(o));
    };
    const scanTiles = () => {
      // (the sky dome is added by the lighting after this module starts: looked up here)
      const dome = scene.getObjectByName("FirmamentSkyDome");
      if (dome) toReflection(dome);
      for (const t of world.tiles) {
        if (!near.has(t.name)) continue;
        for (const g of t.groups || []) g.traverse((o) => {
          const on = o.name === "terrain" ? state.reflTerrain : o.name === "StylizedTreesTile" ? state.reflTrees : null;
          if (on === true) toReflection(o);
          else if (on === false && o.layers.isEnabled(POND_LAYER)) { o.traverse((q) => q.layers.disable(POND_LAYER)); pending.delete(o); }
        });
      }
    };
    // compile: the model, its fading copies, the pond's materials (async, in the background)
    const tc = performance.now();
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    const fp = fadeProxies(root);
    await compile(fp ? [root, fp, pond.group] : [root, pond.group]);
    // the same for the reflection pass (its target, no MRT): the levels with their opaque materials AND with their fading
    // copies on the real geometry (the copies' proxies did not give the same pipelines: the first hand-over near the pond
    // built 9 of them on the frame, 450 ms), the tree proxies, the reeds
    const allOn = levels.map(() => true);
    for (const f of [1, 0.5]) {
      setLodFades(levels, allOn, levels.map(() => f));
      await precompile(renderer, [root, proxies, pond.reeds].filter(Boolean), camC, scene, { target: pond.refl.rt, mrt: REFL_MRT });
    }
    pond.addReflected(root);
    const tComp = performance.now() - tc;
    // the shadow pass's pipelines (and the reflection pass's: one reflection render inside the async window)
    const tw = performance.now();
    const meshes = [];
    for (const lv of levels) lv.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (fp) fp.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const warm = await warmShadowPass(renderer, scene, meshes);
    // the reflection pass: its target has another format and no MRT (other pipelines): one render from a camera over
    // the pond, every level shown, pipelines created async, then once more
    const winR = renderer?.backend?.isWebGPUBackend ? openParallelPipelines(renderer, scene) : null;
    const wc = new THREE.PerspectiveCamera(50, 1.5, 0.5, 4000);
    const pc = pond.water.geometry.boundingSphere.center;
    wc.position.set(pc.x + 20, pondDesc.level + 2, pc.z + 25); wc.lookAt(m.boundsWorld.getCenter(new THREE.Vector3())); wc.updateMatrixWorld(true);
    root.visible = true; levels.forEach((g) => { g.visible = true; });
    scanTiles();
    // every level with its opaque materials, then with its FADING COPIES (a hand-over near the pond draws them in the
    // reflection pass too: run 1 of the flight built them on the frame, 617 ms)
    // (two cameras: low over the water, and higher and farther: the chimney pots were outside the first's view)
    const wc2 = new THREE.PerspectiveCamera(60, 1.5, 0.5, 4000);
    wc2.position.set(pc.x + 10, pondDesc.level + 12, pc.z + 5); wc2.lookAt(m.boundsWorld.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, 6, 0))); wc2.updateMatrixWorld(true);
    const both = (fade) => { setLodFades(levels, levels.map(() => true), levels.map(() => fade)); for (const c of [wc, wc2]) pond.refl.render(scene, c, pondDesc.level, null); };
    both(1); both(0.5);
    if (winR) await winR.end();
    both(1); both(0.5);
    root.visible = false;
    const tWarm = performance.now() - tw;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    let n = 0, home = false;
    // (pondOn / chateauOn: A/B timing; reflTerrain / reflTrees: what the reflection draws besides the château and the sky)
    Object.assign(state, { d: 0, shown: [], pond: pond.stats, pondOn: true, chateauOn: true });
    updaters.push((camPos, cam) => {
      if (n++ % 30 === 0) {
        home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
        scanTiles();
      }
      root.visible = home && state.chateauOn; pond.group.visible = state.pondOn && home && world.tiles.some((t) => t.name === tileOf.name);
      if (!home) return;
      const d = m.distance(camPos);
      state.d = d;
      if (SMOOTH) {
        const { shown, fades } = wvLodState(d);
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = WV_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
      if (proxies) proxies.visible = state.reflProxies && pond.group.visible;
      if (pond.group.visible && cam) pond.update(cam, scene);
    });
    log(`Wolvendael: scripted château, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; pond ${pond.bed.waterArea.toFixed(0)} m² of water at ${pondDesc.level} m; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms + shadow / reflection passes ${tWarm.toFixed(0)} ms (in the background)`);
    window.wolvendael = { model: m, root, levels, pond, tLoad, tComp, tWarm, warm, state, scanTiles };
  }).catch((e) => log(`Wolvendael model failed (${e.message}): its UrbIS solids are hidden, reload without ?wolvendael=1`));
}
