// THE CHAPELLE DE STALLE IN THE CITY (?stalle=1): main.js calls addStalle() once, before the first tile.
//  EXTERIOR (viewer/stalleModel.js): the UrbIS solids it replaces (the chapel + the sacristan's house, by BU_ID: placement
//    .hides_bu_ids) join the hide list: the tiles draw them neither in the facades nor in the far LOD; they stay in the
//    roof grid and the drive colliders. The model loads in the background (meshopt decode and the AO map in workers),
//    its shaders are built through the page's precompile queue (warmup.js) BEFORE it shows, three levels cross-fade by
//    distance (dithered, lodFade.js objectFade; the shadow pass follows).
//  INTERIOR (viewer/stalleInterior.js): the cell is fetched within 120 m (GLB + lightmaps decoded off the main thread),
//    its materials compiled through the same queue while hidden, and shown within 40 m (out beyond 60 m). Then: the
//    exterior's closed west door is swapped for the cell's leaves (they open as the player comes near), the portal skips
//    the city when no opening is in view from inside, and in third person the chapel's UrbIS prism stops blocking, the
//    cell's colliders take over, the terrain is ignored inside and the character is lit by the baked probes.
import * as THREE from "three/webgpu";
import { loadStalle, ST_LODS, ST_SLOTS } from "./stalleModel.js";
import { withObjectFade, SMOOTH } from "./lodFade.js";

const FETCH_AT = 120, SHOW_AT = 40, HIDE_AT = 60;

export async function addStalle({ scene, updaters, hide, world, manifest, log, compiler, getView, getThird }) {
  const t0 = performance.now();
  const notes = await fetch(new URL("../models/stalle/stalle.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Stalle: models/stalle/stalle.json missing, the UrbIS solids stay"); return; }
  hide.push(...notes.placement.hides_bu_ids);
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  loadStalle().then(async (m) => {
    const tLoad = performance.now() - t0;
    for (const s of ST_SLOTS) if (SMOOTH) withObjectFade(m.materials[s]);
    const root = new THREE.Group(); root.name = "stalle";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = ST_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    root.visible = false;
    scene.add(root);
    root.updateMatrixWorld(true);
    const tc = performance.now();
    await (await waitCompiler())([root]);
    const tComp = performance.now() - tc;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const ramp = (d, k) => { const s = ST_LODS[k].until, w = ST_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
    let n = 0, home = false;
    const inner = interior(m);
    updaters.push((camPos) => {
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || !!scene.getObjectByName(`${h}-lite`));
      root.visible = home;
      if (!home) return;
      const d = m.distance(camPos);
      if (SMOOTH) {
        const t1 = ramp(d, 0), t2 = ramp(d, 1);
        const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
        const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
        levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) for (const o of g.children) o.userData.fade = fades[k]; });
      } else {
        const k = ST_LODS.findIndex((l) => d < l.until);
        levels.forEach((g, i) => { g.visible = i === k; });
      }
      inner.update(camPos);
    });
    log(`Chapelle de Stalle: scripted model, LODs ${m.tris.join(" / ")} triangles, ${m.drawCalls.join("/")} draws; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (in the background); interior cell within ${SHOW_AT} m`);
    window.stalle = { model: m, root, levels, tLoad, tComp, inner };
  }).catch((e) => log(`Stalle model failed (${e.message}): its UrbIS solids are hidden, reload without ?stalle=1`));

  /** the interior cell's streaming + hooks */
  function interior(m) {
    const st = { cell: null, loading: false, shown: false, portal: null, hooked: null, bvh: null, hf: null, hfOrig: null, longTasks: [], t: {} };
    let mod = null, chr = null, last = performance.now(), k = 0;
    const centre = m.boundsWorld.getCenter(new THREE.Vector3());
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (st.loading) st.longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }
    async function load() {
      st.loading = true; st.t.start = performance.now();
      try {
        mod = await import("./stalleInterior.js");
        chr = await import("./character/index.js");
        const cell = await mod.loadStalleInterior({ placement: m.placement, lib: m.lib });
        st.t.loaded = performance.now();
        cell.root.visible = false;                              // hidden until its shaders are built (as the exterior)
        scene.add(cell.root);
        await (await waitCompiler())([cell.root]);
        st.t.compiled = performance.now();
        st.cell = cell;
        const { camera, lighting } = getView();
        st.portal = new mod.StallePortal(cell, { camera, sun: lighting.sun });
        log(`Stalle interior: fetched + decoded ${Math.round(st.t.loaded - st.t.start)} ms, shaders ${Math.round(st.t.compiled - st.t.loaded)} ms (background), ${cell.stats.triangles} tris, ${cell.stats.draws} draws, ${cell.probes.count} probes; long tasks while streaming: ${st.longTasks.length ? st.longTasks.join(", ") + " ms" : "none"}`);
      } catch (e) { log(`Stalle interior failed: ${e.message}`); }
      st.loading = false;
    }
    function show(v) {
      if (!st.cell || st.shown === v) return;
      st.shown = v; st.cell.root.visible = v;
      st.cell.onDoorClosed = (closed) => m.setDoor(closed || !st.shown);
      if (!v) m.setDoor(true);
      if (!v) { st.portal?.dispose(); unhook(); }
    }
    function hook(third) {
      if (st.hooked === third || !st.cell) return;
      unhook();
      const w = third.world;
      const bvh = new chr.TriBVH(st.cell.colliders); bvh.tag = 3;
      w.add(bvh);
      const hf = w.sources.find((s) => s instanceof chr.Heightfield);
      const orig = hf?.height;
      const p = new THREE.Vector3(), floorY = st.cell.info.levels_taw.floor + 1;
      if (hf) hf.height = (x, z) => (st.cell && st.shown && st.cell.contains(p.set(x, floorY, z), -0.3) ? -1e4 : orig(x, z));
      third.tp.body.setVariant(st.cell.probes.variant(third.tp.body));
      third.tp.body.root.traverse((o) => o.layers.enable(mod.INTERIOR_LAYER));      // drawn when the portal seals the city
      st.hooked = third; st.bvh = bvh; st.hf = hf; st.hfOrig = orig;
    }
    function unhook() {
      const t = st.hooked; if (!t) return;
      t.world.remove(st.bvh);
      if (st.hf) st.hf.height = st.hfOrig;
      t.tp.body.useVariant(false);
      for (const s of t.world.sources) if (s.exclude) s.exclude(m.notes.placement.chapel_bu_id, false);
      st.hooked = null;
    }
    const pos = new THREE.Vector3();
    return {
      state: st,
      update(camPos) {
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        const third = getThird?.();
        const player = third?.on ? pos.set(third.tp.x, third.tp.y + 1, third.tp.z) : camPos;
        const d = Math.min(player.distanceTo(centre), camPos.distanceTo(centre));
        if (!st.cell && !st.loading && d < FETCH_AT) load();
        if (st.cell) {
          if (d < SHOW_AT) show(true); else if (d > HIDE_AT) show(false);
        }
        if (!st.cell || !st.shown) return;
        st.cell.update(dt, player, camPos);
        st.portal.update();
        if (third?.on) {
          hook(third);
          if (k++ % 60 === 0) for (const s of third.world.sources) if (s.exclude) s.exclude(m.notes.placement.chapel_bu_id, true);
          const inside = st.cell.contains(pos, 0.05);
          third.tp.body.useVariant(inside); if (inside) st.cell.probes.update(pos);
        } else if (st.hooked) unhook();
      },
    };
  }
}
