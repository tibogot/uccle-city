// THE VILLA IN THE CITY (?villa=0 turns it off): main.js calls addVilla() once, before the first tile.
//  EXTERIOR (viewer/villa/villaModel.js): the UrbIS solid it replaces (543176 = BU 1588559, models/villa/villa.json)
//    joins the hide list; the model loads in the background (meshopt in workers), its shaders, the LOD bands' fading
//    copies AND the shadow pass's pipelines are built before it shows (the heroes' fix: no shader build on a frame);
//    three levels cross-fade by distance. The paved grounds (villaGrounds.js) drape on tile H9's own terrain; the
//    garage's cars (villaCars.js) are static merged meshes.
//  GATE + DOOR: the swing gate's two leaves open (eased, ~2 s) when the player's car, the walker or the camera comes
//    within 13 m of it, and close after; the car's collider is the closed gate's ring, or the open leaves' rings, never
//    a leaf in motion (rule colliders-match-drawn); the walker's is a small TriBVH of the leaves in the same states. The
//    pivot front door opens within 3.5 m while the interior is shown.
//  INTERIOR (villaInterior.js): fetched within 60 m (GLB decoded in workers), its materials compiled through the same
//    precompile queue while hidden, shown within 30 m (out beyond 45 m); its glass fades in over the exterior's (no pop).
//    In third person: the cell's colliders (TriBVH), the terrain ignored inside the house and the pool, the walker lit
//    by the baked probes inside. No light is added anywhere (rule fixed-light-count).
import * as THREE from "three/webgpu";
import { loadVilla, VILLA_LODS, setLodFades, villaLodState, villaLook } from "./villaModel.js";
import { buildVillaGrounds } from "./villaGrounds.js";
import { drivePlane, LIFT } from "./villaGroundsGeom.js";
import { VILLA_DECK, makeDriveDeck } from "./villaDeck.js";
import { buildVillaCars } from "./villaCars.js";
import { villaInLook } from "./villaInterior.js";
import { VILLA_DIR } from "./villaGlass.js";
import { SMOOTH, fadeProxies } from "../lodFade.js";
import { openParallelPipelines } from "../../vendor/engine/parallelPipelines.js";
import { Heightmap } from "../heightmap.js";
import { liteShown } from "../liteShown.js";
import { whenNeeded } from "../bootGate.js";

const FETCH_AT = 60, SHOW_AT = 30, HIDE_AT = 45, GATE_AT = 13, DOOR_AT = 3.5, CARS_UNTIL = 140;

async function warmShadowPass(renderer, scene, meshes, perFrame = 3) {
  const g = new THREE.Group(); g.name = "villa-warm"; g.position.set(0, -4000, 0);
  scene.add(g);
  const win = renderer?.backend?.isWebGPUBackend ? openParallelPipelines(renderer, scene) : null;
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const batch = (list) => {
    g.clear();
    for (const o of list) {
      const p = new THREE.Mesh(o.geometry, o.material);
      p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.frustumCulled = false; p.userData = { ...o.userData, fade: 0.5 };
      g.add(p);
    }
  };
  for (let i = 0; i < meshes.length; i += perFrame) { batch(meshes.slice(i, i + perFrame)); await frame(); }
  const res = win ? await win.end() : null;
  for (let i = 0; i < meshes.length; i += 12) { batch(meshes.slice(i, i + 12)); await frame(); }
  g.clear(); scene.remove(g);
  return res;
}

export async function addVilla({ scene, updaters, hide, world, manifest, log, compiler, renderer, getView, getThird }) {
  const t0 = performance.now();
  const base = new URL(VILLA_DIR, import.meta.url);
  const notes = await fetch(new URL("villa.json", base)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("Villa: models/villa/villa.json missing, the UrbIS solid stays"); return; }
  hide.push(...notes.placement.hides_bu_ids, ...notes.placement.hides_solids);
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  const DATA = new URL("../../data/tiles/", import.meta.url);
  const tile = manifest.tiles.find((t) => t.name === "H9");
  const groundP = (async () => {
    const [hdr, buf] = await Promise.all([fetch(new URL(tile.files.terrainHeader, DATA)).then((r) => r.json()), fetch(new URL(tile.files.terrain, DATA)).then((r) => r.arrayBuffer())]);
    const hm = new Heightmap(hdr, buf);
    return (x, z) => hm.surface(x, z);
  })();
  Promise.all([whenNeeded("villa").then(() => loadVilla()), groundP]).then(async ([m, groundAt]) => {
    const tLoad = performance.now() - t0;
    const root = new THREE.Group(); root.name = "villa";
    root.position.copy(m.placement.position); root.rotation.y = m.placement.rotationY;
    const levels = VILLA_LODS.map((_, k) => m.make(k));
    root.add(...levels);
    if (m.water) root.add(m.water);
    // the animated parts live OUTSIDE the root (the hero colliders read the root's LOD0 as static walls)
    const parts = new THREE.Group(); parts.name = "villa-parts";
    parts.position.copy(root.position); parts.rotation.copy(root.rotation);
    const gateL = m.part("Villa_gateL"), gateR = m.part("Villa_gateR"), door = m.part("Villa_door");
    for (const p of [gateL, gateR, door]) if (p) { p.userData.closedY = p.rotation.y; parts.add(p); }
    // villa2 (heroshell): the open bay's pane: the far glass of the hall's open back bay, outside the root (the walker's
    // colliders read the root's LOD0: it never blocks the bay), drawn while LOD0 is, hidden with the far glass when the
    // interior shows (before: the street saw through the bay to the front wall's inside from 30 to 70 m)
    const bay = m.part("Villa_bay");
    if (bay) { bay.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.userData.slot = "glass_window"; } }); parts.add(bay); }
    const grounds = buildVillaGrounds({ notes, rootM: m.rootM, groundAt });
    // THE DRIVE + GARAGE SURFACE (round 2, rule villa-drive-plane): the designed plane (a single slope, then flat), not
    // the DTM: the car drives on it (a deck in world.decks: moverGround.js), the walker stands on it (a TriBVH + the
    // terrain off there), the parked cars stand on it
    const inv = m.inv, q = new THREE.Vector3();
    const dp = notes.drive_plane, dRings = dp.zones.map((z) => notes.grounds[z]);
    const inRingUW = (r, u, w) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ui, wi] = r[i], [uj, wj] = r[j]; if ((wi > w) !== (wj > w) && u < ((uj - ui) * (w - wi)) / (wj - wi) + ui) c = !c; } return c; };
    // (claude/allocrate2: one box + index-loop rings, villaDeck.js; ?villadeck=old = the closures, 2.9 MB a frame flying)
    const fastDeck = VILLA_DECK ? makeDriveDeck(dp, dRings, m.rootM, inv) : null;
    const onDrive = fastDeck ? fastDeck.onDrive : (x, z) => { q.set(x, 0, z).applyMatrix4(inv); return dRings.some((r) => inRingUW(r, q.x, q.z)) ? q.x : null; };
    const driveDeck = fastDeck || ((x, z) => { const u = onDrive(x, z); return u == null ? null : drivePlane(dp, u) + LIFT; });
    const standAt = (x, z) => driveDeck(x, z) ?? groundAt(x, z);
    if (world.decks) world.decks.push(driveDeck);
    const cars = await buildVillaCars({ notes, rootM: m.rootM, rotationY: m.placement.rotationY, groundAt: (x, z) => { const d = driveDeck(x, z); return d == null ? groundAt(x, z) : d - LIFT; } }).catch((e) => { log(`villa cars: ${e.message}`); return null; });
    for (const o of [root, parts, grounds.mesh, cars?.group]) if (o) { o.visible = false; scene.add(o); o.updateMatrixWorld(true); }
    const tc = performance.now();
    const compile = await waitCompiler();
    const fp = fadeProxies(root);
    await compile([root, parts, grounds.mesh, cars?.group, fp].filter(Boolean));
    const tComp = performance.now() - tc;
    const tw = performance.now();
    const meshes = [];
    for (const o of [root, parts, grounds.mesh, cars?.group, fp]) o?.traverse((q) => { if (q.isMesh) meshes.push(q); });
    const warm = await warmShadowPass(renderer, scene, meshes);
    const tWarm = performance.now() - tw;
    const homes = manifest.tiles.filter((t) => t.bounds.x[0] < m.boundsWorld.max.x && t.bounds.x[1] > m.boundsWorld.min.x &&
      t.bounds.z[0] < m.boundsWorld.max.z && t.bounds.z[1] > m.boundsWorld.min.z).map((t) => t.name);
    const extGlass = levels[0].children.filter((o) => o.userData.slot === "glass_window");
    bay?.traverse((o) => { if (o.isMesh) extGlass.push(o); });
    const state = { d: 0, shown: [], fades: [], gate: 0, gateWant: 0, door: 0, inner: null };
    // ---- the gate's colliders: the car's rings (driver.addStatic) and the walker's leaves (TriBVH), per state
    const local = (u, w) => new THREE.Vector3(u, 0, w).applyMatrix4(m.rootM);
    const g = notes.gate, gL = notes.parts.gateL, gR = notes.parts.gateR;
    const gateCentre = local(g.u + 0.15, (g.w[0] + g.w[1]) / 2);
    const leafRing = (P, open) => {
      // a leaf's plan rectangle (0.1 m thick) from its hinge, closed along w, open along +u
      const [hu, hw] = P.hinge_uw, L = P.length, s = P.side < 0 ? 1 : -1;
      const pts = open ? [[hu - 0.05, hw], [hu + L, hw], [hu + L, hw + s * 0.12], [hu - 0.05, hw + s * 0.12]]
        : [[hu - 0.06, hw], [hu + 0.06, hw], [hu + 0.06, hw + s * L], [hu - 0.06, hw + s * L]];
      return pts.map(([u, w]) => { const p = local(u, w); return [p.x, p.z]; });
    };
    const gateSets = { closed: [{ rings: [leafRing(gL, false)] }, { rings: [leafRing(gR, false)] }], open: [{ rings: [leafRing(gL, true)] }, { rings: [leafRing(gR, true)] }] };
    let carSet = null, carSetKey = null, walkSrc = null, walkKey = null, carsSet = null, chr = null;
    const setGateColliders = (key) => {
      const driver = window.__driver;
      if (driver && carSetKey !== key) {
        if (carSet) driver.removeStatic(carSet);
        carSet = key ? driver.addStatic(gateSets[key]) : null; carSetKey = key;
      }
      const third = getThird?.();
      if (third?.world && chr && walkKey !== key) {
        if (walkSrc) third.world.remove(walkSrc);
        walkSrc = null;
        if (key) {
          const T = [];
          for (const leaf of [gateL, gateR]) {
            if (!leaf) continue;
            leaf.updateMatrixWorld(true);
            leaf.traverse((o) => {
              if (!o.isMesh) return;
              const P = o.geometry.attributes.position, I = o.geometry.index, v = new THREE.Vector3();
              for (let i = 0; i < I.count; i++) { v.fromBufferAttribute(P, I.getX(i)).applyMatrix4(o.matrixWorld); T.push(v.x, v.y, v.z); }
            });
          }
          walkSrc = third.world.add(new chr.TriBVH(new Float32Array(T)));
        }
        walkKey = key;
      }
    };
    import("../character/index.js").then((c) => { chr = c; }).catch(() => {});
    // the walker on the paved drive / garage: the grounds' triangles + the terrain ignored over the drive's rings
    let groundsHooked = null;
    const hookGrounds = (third) => {
      if (!chr || !third?.world || groundsHooked === third) return;
      const g = grounds.mesh.geometry, P = g.attributes.position, I = g.index, T = new Float32Array(I.count * 3);
      for (let i = 0; i < I.count; i++) { const k = I.getX(i); T[i * 3] = P.getX(k); T[i * 3 + 1] = P.getY(k); T[i * 3 + 2] = P.getZ(k); }
      third.world.add(new chr.TriBVH(T));
      const hf = third.world.sources.find((s) => s instanceof chr.Heightfield);
      if (hf) { const orig = hf.height; hf.height = (x, z) => (onDrive(x, z) != null ? -1e4 : orig(x, z)); }
      groundsHooked = third;
    };
    const inner = interior(m, root, extGlass, door, state);
    let n = 0, home = false, last = performance.now();
    const player = new THREE.Vector3(), tmp = new THREE.Vector3();
    updaters.push((camPos) => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (n++ % 30 === 0) home = homes.some((h) => world.tiles.some((t) => t.name === h) || liteShown(scene, h));
      root.visible = parts.visible = grounds.mesh.visible = home;
      if (cars) cars.group.visible = home && m.distance(camPos) < CARS_UNTIL;
      if (!home) return;
      if (cars && !carsSet && window.__driver) carsSet = window.__driver.addStatic(cars.rings.map((r) => ({ rings: [r] })));
      const d = m.distance(camPos);
      state.d = d;
      if (SMOOTH) { const s = villaLodState(d); setLodFades(levels, s.shown, s.fades); state.shown = s.shown; state.fades = s.fades; }
      else { const k = VILLA_LODS.findIndex((l) => d < l.until); levels.forEach((lv, i) => { lv.visible = i === k; }); }
      if (bay) bay.visible = levels[0].visible;
      // who is near: the car, the third-person walker, else the camera (walk / fly)
      const driver = window.__driver, third = getThird?.();
      if (driver?.on && driver.state) player.set(driver.state.x, 0, driver.state.z);
      else if (third?.on) player.set(third.tp.x, third.tp.y, third.tp.z);
      else player.copy(camPos);
      const dGate = Math.hypot(player.x - gateCentre.x, player.z - gateCentre.z);
      state.gateWant = state.forceGate ?? (dGate < GATE_AT ? 1 : 0);
      const step = dt / 2.0;
      state.gate = state.gate < state.gateWant ? Math.min(state.gateWant, state.gate + step) : Math.max(state.gateWant, state.gate - step);
      const a = THREE.MathUtils.degToRad(gL.open ?? 90) * THREE.MathUtils.smootherstep(state.gate, 0, 1);
      if (gateL) gateL.rotation.y = gateL.userData.closedY + a;
      if (gateR) gateR.rotation.y = gateR.userData.closedY - a;
      setGateColliders(state.gate <= 0.001 ? "closed" : state.gate >= 0.999 ? "open" : null);
      if (third?.on) hookGrounds(third);
      inner.update(dt, camPos, player, third);
    });
    log(`Villa (Av. du Prince d'Orange): scripted, LODs ${m.tris.map(Math.round).join(" / ")} triangles, ${m.drawCalls.join("/")} draws; grounds ${grounds.tris} tris; cars ${cars ? cars.tris : 0} tris; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms + shadow pass ${tWarm.toFixed(0)} ms (background)`);
    window.villa = { model: m, root, parts, levels, grounds, cars, state, inner, tLoad, tComp, tWarm, warm, gateCentre, look: villaLook, inLook: villaInLook };
  }).catch((e) => log(`Villa model failed (${e.message}): its UrbIS solid is hidden, reload with ?villa=0`));

  /** the interior cell's streaming + hooks */
  function interior(m, root, extGlass, door, vstate) {
    const st = { cell: null, loading: false, shown: false, hooked: null, bvh: null, hf: null, hfOrig: null, longTasks: [], frames: [], t: {} };
    let mod = null, chr = null, k = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (st.loading || st.watch > performance.now()) st.longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }
    async function load() {
      st.loading = true; st.t.start = performance.now();
      try {
        mod = await import("./villaInterior.js");
        chr = await import("../character/index.js");
        const cell = await mod.loadVillaInterior({ placement: m.placement, renderer });
        st.t.loaded = performance.now();
        cell.root.visible = false;
        scene.add(cell.root);
        // (round 3, the stream-in hitch: the cell's pipelines compiled ONE material at a time, 4 frames apart: all of
        // them at once (16 async pipelines + shader modules) stalled the GPU process: 50 ms frames with no main-thread
        // long task, measured with ?dynres=0; rule interior-stream-paced)
        const comp = await waitCompiler(), frame = () => new Promise((r) => requestAnimationFrame(() => r()));
        const seen = new Set();
        const meshes = []; cell.root.traverse((o) => { if (o.isMesh && !seen.has(o.material)) { seen.add(o.material); meshes.push(o); } });
        for (const o of meshes) { await comp([o]); for (let k = 0; k < 4; k++) await frame(); }
        st.t.compiled = performance.now();
        st.cell = cell;
        log(`Villa interior: fetched + decoded ${Math.round(st.t.loaded - st.t.start)} ms, shaders ${Math.round(st.t.compiled - st.t.loaded)} ms (background), ${cell.stats.triangles} tris, ${cell.stats.draws} draws, ${cell.info.ambientCubes.probes.length} probes; long tasks while streaming: ${st.longTasks.length ? st.longTasks.join(", ") + " ms" : "none"}`);
      } catch (e) { log(`Villa interior failed: ${e.message}`); }
      st.loading = false;
    }
    function show(v) {
      if (!st.cell || st.shown === v) return;
      st.shown = v;
      st.watch = performance.now() + 2000;          // (the stream-in hitch check: long tasks in the 2 s after a swap)
      if (v) {
        // (round 2, the stream-in hitch: the first draw of a mesh uploads its buffers: the cell's meshes come in one a
        // frame behind its glass, which starts opaque, so nothing pops and no frame uploads 4 MB at once)
        villaInLook.glassIn.value = 1; st.cell.root.visible = true; for (const o of extGlass) o.visible = false;
        const ms = []; st.cell.root.traverse((o) => { if (o.isMesh && o.userData.slot !== "glass_window") { o.visible = false; ms.push(o); } });
        let i = 0; const next = () => { if (!st.shown) return; if (i < ms.length) { ms[i++].visible = true; requestAnimationFrame(next); } };
        requestAnimationFrame(next);
      }
      else { for (const o of extGlass) o.visible = true; st.cell.root.visible = false; unhook(); }
    }
    function hook(third) {
      if (st.hooked === third || !st.cell) return;
      unhook();
      const w = third.world;
      const bvh = new chr.TriBVH(st.cell.colliders); bvh.tag = 3;
      w.add(bvh);
      const hf = w.sources.find((s) => s instanceof chr.Heightfield);
      const orig = hf?.height;
      if (hf) hf.height = (x, z) => (st.cell && st.shown && st.cell.noTerrain(x, z) ? -1e4 : orig(x, z));
      third.tp.body.setVariant?.(st.cell.probes.variant(third.tp.body));
      st.hooked = third; st.bvh = bvh; st.hf = hf; st.hfOrig = orig;
    }
    function unhook() {
      const t = st.hooked; if (!t) return;
      t.world.remove(st.bvh);
      if (st.hf) st.hf.height = st.hfOrig;
      t.tp.body.useVariant?.(false);
      st.hooked = null;
    }
    const pos = new THREE.Vector3(), doorC = new THREE.Vector3();
    return {
      state: st,
      update(dt, camPos, player, third) {
        const d = Math.min(m.distance(player), m.distance(camPos));
        if (!st.cell && !st.loading && d < FETCH_AT) load();
        if (st.cell) { if (d < SHOW_AT) show(true); else if (d > HIDE_AT) show(false); }
        // the pivot door: open while the interior shows and someone is at it
        const dp = notes.parts.door;
        doorC.set(dp.pivot_uw[0], dp.h[0] - 100 + 1.2, (dp.w[0] + dp.w[1]) / 2).applyMatrix4(m.rootM);
        const want = vstate.forceDoor ?? (st.shown && (player.distanceTo(doorC) < DOOR_AT + 1.0 || camPos.distanceTo(doorC) < DOOR_AT) ? 1 : 0);
        vstate.door += (want - vstate.door) * Math.min(1, dt * 2.0);
        if (door) door.rotation.y = door.userData.closedY + THREE.MathUtils.degToRad(85) * THREE.MathUtils.smoothstep(vstate.door, 0, 1);
        if (!st.cell || !st.shown) return;
        st.cell.update(dt, camPos);
        if (third?.on) {
          hook(third);
          pos.set(third.tp.x, third.tp.y + 1, third.tp.z);
          const inside = st.cell.contains(pos, 0.05);
          third.tp.body.useVariant?.(inside); if (inside) st.cell.probes.update(pos);
          k++;
        } else if (st.hooked) unhook();
      },
    };
  }
}
