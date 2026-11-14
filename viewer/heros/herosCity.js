// SQUARE DES HEROS IN THE CITY (on by default, ?heros=old = the city as before; docs/landmarks/HEROS.md). main.js calls
// addHeros() once, before the first tile:
//   - the tiles: the UrbIS square surface minus the park as sidewalk paving (data/overrides.json "parkSquares", applied in
//     the tile worker: herosSurface.js), the terrain carved under the memorial's two flights of steps and the park's path
//     lines left out of the land cover (both through `tile`, the tile entry's `heros`); the UrbIS solid of the memorial's
//     enclosure (buildingsolid 534309, a 1.35 m octagonal block) joins the hide list;
//   - the war memorial + the steps (tools/blender/heros.py -> models/heros/heros.glb): loaded in the background (meshopt
//     decode and the AO map in workers), shaders built through the page's precompile queue BEFORE it shows, three levels
//     cross-faded by distance (dithered, lodFade.js through the materials' fading copies inside the bands only; the shadow
//     pass follows); its colliders come from its LOD0 (viewer/heroColliders.js: "heros" in HERO_ROOTS);
//   - the dolomite (herosGround.js): built once the park's three tiles (E3, E4, F4) are in, on their drawn terrain.
// Shown while one of its tiles is loaded (full or far).
import * as THREE from "three/webgpu";
import { loadHeros, HE_LODS, setLodFades } from "./herosModel.js";
import { dolomiteGeometry, dolomiteMaterial } from "./herosGround.js";
import { SMOOTH, fadeProxies } from "../lodFade.js";
import { liteShown } from "../liteShown.js";

export async function addHeros({ scene, updaters, hide, tile, world, manifest, log, compiler, renderer }) {
  const t0 = performance.now();
  const base = new URL("../../models/heros/", import.meta.url);
  const [notes, site] = await Promise.all([
    fetch(new URL("heros.json", base)).then((r) => r.json()).catch(() => null),
    fetch(new URL("site.json", base)).then((r) => r.json()).catch(() => null),
  ]);
  if (!notes || !site) { log("Square des Heros: models/heros/heros.json or site.json missing, the square stays as before"); return; }
  hide.push(...notes.placement.hides_solids);
  // the tile worker's part (read when each tile is built): carves under the steps, the park's path lines
  tile.carves.push(...notes.flights.map((f) => f.carve));
  tile.paths.push(...Object.keys(site.paths).map((k) => `osm:${k}`));
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  const longTasks = [];
  let loading = true;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (loading) longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }

  // the dolomite: once the park's tiles are all in (their drawn terrain), never rebuilt
  const groundRoot = new THREE.Group(); groundRoot.name = "heros-ground"; groundRoot.visible = false;
  scene.add(groundRoot);
  const parkBox = (() => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of site.park) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x0, x1, z0, z1 }; })();
  const parkTiles = manifest.tiles.filter((t) => t.bounds.x[0] < parkBox.x1 && t.bounds.x[1] > parkBox.x0 && t.bounds.z[0] < parkBox.z1 && t.bounds.z[1] > parkBox.z0).map((t) => t.name);
  let groundBuilt = null;
  const buildGround = async () => {
    const g = dolomiteGeometry(site, (x, z) => world.ground(x, z));
    const mesh = new THREE.Mesh(g.geometry, dolomiteMaterial());
    mesh.name = "heros-dolomite"; mesh.receiveShadow = true;
    groundRoot.add(mesh);
    await (await waitCompiler())([groundRoot]);
    groundBuilt = { tris: g.tris, mesh };
    log(`Square des Heros: dolomite ground ${g.tris} triangles on the tiles ${parkTiles.join(", ")}`);
  };

  loadHeros().then(async (m) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "heros";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = HE_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    const fp = fadeProxies(root);
    await (await waitCompiler())(fp ? [root, fp] : [root]);
    const tComp = performance.now() - tc;
    loading = false;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const ramp = (d, k) => { const s = HE_LODS[k].until, w = HE_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
    let n = 0, home = false, groundBusy = false;
    const state = { shown: [false, false], fades: [1, 1], d: 0 };
    updaters.push((camPos) => {
      if (n++ % 30 === 0) {
        home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
        if (!groundBuilt && !groundBusy && parkTiles.every((h) => world.tiles.some((t) => t.name === h))) { groundBusy = true; buildGround().catch((e) => log(`Square des Heros: dolomite failed (${e.message})`)); }
      }
      root.visible = home;
      // the dolomite only with its full tiles (a far tile has no carved terrain to lie on)
      groundRoot.visible = !!groundBuilt && parkTiles.every((h) => world.tiles.some((t) => t.name === h));
      if (!home) return;
      const d = m.distance(camPos);
      if (SMOOTH) {
        const t1 = ramp(d, 0);
        const fades = [2 + t1, t1];
        const shown = [t1 < 1, t1 > 0];
        setLodFades(levels, shown, fades);
        state.shown = shown; state.fades = fades;
      } else {
        const k = HE_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
        state.shown = levels.map((g) => g.visible);
      }
      state.d = d;
    });
    log(`Square des Heros: war memorial + steps, scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background); long tasks while streaming: ${longTasks.length ? longTasks.join(", ") + " ms" : "none"} (?heros=old: the square as before)`);
    window.heros = { model: m, root, levels, groundRoot, ground: () => groundBuilt, tLoad, tComp, longTasks, state, site };
  }).catch((e) => log(`Square des Heros model failed (${e.message}): reload with ?heros=old`));
}
