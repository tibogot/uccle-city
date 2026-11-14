// THE UCCLE POLICE STATION (Rue Rouge 17) IN THE CITY (?police=1): main.js calls addPolice() once, before the first tile
// (built like viewer/wolvendaelCity.js without the pond).
//  - the UrbIS solids it replaces (models/police_rouge/police.json placement: 528055 + 528772 = BU building/1674458)
//    join the hide list (tileData.js hideBuildings matches BU_ID or id); 531654 (the school's stair block) and 528056
//    (the neighbour's garage) stay;
//  - the model (viewer/policeModel.js) and its yard (viewer/policeYard.js: on tile E4's own ground, the same 1 m DTM the
//    tile's terrain is built from) load in the background; their shaders, the LOD bands' fading copies AND the shadow
//    pass's pipelines are built BEFORE anything shows (the villa's fix);
//  - the levels cross-fade by distance (dithered, lodFade.js objectFade, the shadow follows) through the FADING COPIES of
//    the slot materials, drawn only inside the hand-over bands (setLodFades). ?smooth=0: hard switches. The yard is one
//    mesh, shown with LOD0 / LOD1 (it fades out with LOD1: past 400 m the terrain's own paint is enough).
import * as THREE from "three/webgpu";
import { loadPolice, PO_LODS, setLodFades, poLodState } from "./policeModel.js";
import { buildPoliceYard } from "./policeYard.js";
import { buildPoliceCars } from "./policeCars.js";
import { SMOOTH, fadeProxies } from "./lodFade.js";
import { openParallelPipelines } from "../vendor/engine/parallelPipelines.js";
import { Heightmap } from "./heightmap.js";
import { liteShown } from "./liteShown.js";

/** The SHADOW pass is not in compileAsync: warm its pipelines (every mesh of every level and every fading copy drawn a
 *  frame far under the city, pipelines created async) before the model shows (the villa's / Wolvendael's) */
async function warmShadowPass(renderer, scene, meshes, perFrame = 3) {
  const g = new THREE.Group(); g.name = "police-warm"; g.position.set(0, -4000, 0);
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

export async function addPolice({ scene, updaters, hide, world, manifest, log, compiler, renderer }) {
  const t0 = performance.now();
  const base = new URL("../models/police_rouge/", import.meta.url);
  const [notes, site] = await Promise.all([
    fetch(new URL("police.json", base)).then((r) => r.json()).catch(() => null),
    fetch(new URL("site.json", base)).then((r) => r.json()).catch(() => null),
  ]);
  if (!notes || !site) { log("Police: models/police_rouge/ missing, the UrbIS solids stay"); return; }
  hide.push(...notes.placement.hides_bu_ids, ...notes.placement.hides_solids);
  // the yard straddles tiles E4 / F4 (x = -500 runs through it): its ground from every tile it touches, the same 1 m DTM
  // grids the tiles' terrains are built from
  const DATA = new URL("../data/tiles/", import.meta.url);
  const yb = notes.bounds_city;
  const tilesOf = manifest.tiles.filter((t) => t.bounds.x[0] < yb.x[1] + 5 && t.bounds.x[1] > yb.x[0] - 5 && t.bounds.z[0] < yb.z[1] + 5 && t.bounds.z[1] > yb.z[0] - 5);
  const yardReady = (async () => {
    const hms = await Promise.all(tilesOf.map(async (t) => {
      const [hdr, buf] = await Promise.all([fetch(new URL(t.files.terrainHeader, DATA)).then((r) => r.json()), fetch(new URL(t.files.terrain, DATA)).then((r) => r.arrayBuffer())]);
      return { b: t.bounds, hm: new Heightmap(hdr, buf) };
    }));
    const groundAt = (x, z) => (hms.find(({ b }) => x >= b.x[0] && x <= b.x[1] && z >= b.z[0] && z <= b.z[1]) ?? hms[0]).hm.surface(x, z);
    const yard = buildPoliceYard({ site, groundAt });
    yard.cars = await buildPoliceCars({ site, groundAt }).catch((e) => { log(`Police cars: ${e.message}`); return null; });
    return yard;
  })();

  Promise.all([loadPolice(), yardReady]).then(async ([m, yard]) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "police";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = PO_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false; yard.mesh.visible = false;
    scene.add(root, yard.mesh);
    const cars = yard.cars;
    if (cars) { cars.group.visible = false; scene.add(cars.group); cars.group.updateMatrixWorld(true); }
    root.updateMatrixWorld(true);
    const tc = performance.now();
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    const fp = fadeProxies(root);
    const fpc = cars ? fadeProxies(cars.group) : null;
    await compile([root, fp, yard.mesh, cars?.group, fpc].filter(Boolean));
    const tComp = performance.now() - tc;
    const tw = performance.now();
    const meshes = [yard.mesh];
    for (const lv of levels) lv.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (fp) fp.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (cars) cars.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (fpc) fpc.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const warm = await warmShadowPass(renderer, scene, meshes);
    const tWarm = performance.now() - tw;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    let n = 0, home = false;
    const state = { d: 0, shown: [], fades: [], on: true, yardOn: true, carsOn: true };
    const tmpC = new THREE.Vector3();
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
      root.visible = home && state.on;
      if (!home) { yard.mesh.visible = false; if (cars) cars.group.visible = false; return; }
      const d = m.distance(camPos);
      state.d = d;
      if (SMOOTH) {
        const { shown, fades } = poLodState(d);
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = PO_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
      // (the yard stays with the station at every distance: 1 draw, 6k triangles; hiding it would pop)
      yard.mesh.visible = root.visible && state.yardOn;
      if (cars) { cars.group.visible = yard.mesh.visible && state.carsOn; cars.update(camPos, m.boundsWorld.getCenter(tmpC)); }
    });
    log(`Police station (Rue Rouge 17): scripted, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; yard ${yard.tris} tris; ${cars ? `${cars.places.length} patrol cars (${cars.tris.join(" / ")} tris)` : "no cars"}; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms + shadow pass ${tWarm.toFixed(0)} ms (in the background)`);
    window.police = { model: m, root, levels, yard, cars, tLoad, tComp, tWarm, warm, state };
  }).catch((e) => log(`Police model failed (${e.message}): its UrbIS solids are hidden, reload without ?police=1`));
}
