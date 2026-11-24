// THE CALEVOET PEDESTRIAN UNDERPASS U1 IN THE CITY (?underpass=0: none; docs/CALEVOET_UNDERPASS_PLAN.md, rule
// underpass-wells). main.js calls addUnderpass() with the landmarks, before the first tile:
//  - the two UrbIS kiosk solids it replaces (models/underpass/calevoet.json placement: 525169 east, 519275 west, full
//    URIs: rule hide-ids-full-uri) join the hide list;
//  - THE SURFACE (models/underpass/calevoet.glb, tools/blender/underpass.py): the kiosks at three scripted LODs, cross-
//    faded (dithered: the bridges' setLodFades / settleRamp), the "throat" (the kiosks' inside as the street sees it)
//    drawn with LOD0 until the inside shows, the low COLLISION mesh in LOD0 (never drawn: the walker's floors, stair
//    ramps, walls and soffits come with the tile, viewer/heroColliders.js reads LOD0); named slots, UV0 metres, the
//    baked AO in UV1; the shaders + fading copies + shadow pass warmed before it shows (warmBridge);
//  - THE INSIDE (models/underpass/calevoet_in.glb): fetched within 80 m, its materials compiled ONE at a time a few frames
//    apart while hidden, shown within 50 m (a mesh a frame), hidden beyond 70 m, dropped after 20 s hidden (rule
//    interior-stream-paced). Unlit: the light is Cycles' per-corner bake (_LSKY by day, _LNIGHT by night, blended by the
//    city's night factor); the lamps' lenses are emissive. No light is ever added (rule fixed-light-count);
//  - THE WALKER: its Heightfield gets the json's voids (viewer/character/world.js) once the kiosks' colliders are in: off in
//    the wells, off under the corridor's soffit + 0.45 m (a body on the ground over it is still carried).
import * as THREE from "three/webgpu";
import { attribute, uv, texture, vec2, vec3, float, floor, fract, mix, smoothstep, clamp, abs, max, min, step, uniform, select, Fn, positionWorld, fwidth } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { setLodFades, warmBridge } from "../rail/bridgeModel.js";
import { SMOOTH, settleRamp } from "../lodFade.js";
import { decodeAO } from "../aoDecode.js";
import { liteShown } from "../liteShown.js";
import { env } from "../lighting.js";
import { hash2D, noise2D, filteredPulse } from "../tslkit.js";
import { UNDERPASS_ROOT, underpassVoids } from "./underpass.js";
import { Heightfield } from "../character/world.js";

const BASE = new URL("../../models/underpass/", import.meta.url);
/** LOD switch distances (m, camera to the kiosks' box) and the bands' half widths (share of the distance) */
export const UP_LODS = [{ until: 60 }, { until: 220 }, { until: Infinity }];
const BANDS = [0.15, 0.12];
const STREAM = { fetch: 80, show: 50, hide: 70, unloadS: 20 };

/** live look: the bakes' gains, the eye adaptation inside, a debug view (0 final, 1 light, 2 albedo) */
export const upLook = { dayGain: uniform(1.6), nightGain: uniform(1.4), adapt: uniform(1), adaptInside: 1.8, view: uniform(0), dayOverride: uniform(-1) };

const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
// the face code: COLOR_0.r = code / 16 + 1/32, the same at a face's three corners: floor(r * 16) is exact (rule no-coplanar:
// a code is decoded robustly, never hashed from an interpolated value)
const codeF = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (k) => float(1).sub(clamp(abs(codeF().sub(k)), 0, 1));
const nightK = () => select(upLook.dayOverride.greaterThanEqual(0), float(1).sub(upLook.dayOverride), env.uNight);

// ------------------------------------------------------------------------------------------------ the surface's slots
function surfaceMaterial(slot, aoTex, codes) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
  const p = uv(), C = codes[slot] || {};
  const fw = max(fwidth(p.x), fwidth(p.y)).max(0.0005);
  const n1 = noise2D(p.mul(0.9)), grit = hash2D(floor(p.mul(60)));
  if (slot === "brick_painted_white") {
    // [Street View 2024] rendered piers white-grey, the lower wall a painted mural (OUR OWN pattern: a white tile grid
    // crossed by pastel pipes, big leaves at the ends), a dark plinth, the mouth's end pier red
    const white = mix(lin(0xd9d8d2), lin(0xc9c7bf), n1.mul(0.6)).mul(mix(0.96, 1.03, grit));
    const tx = fract(p.x.div(0.15)), ty = fract(p.y.div(0.15));
    const jt = max(filteredPulse(p.x.div(0.15), float(0), float(0.08), fw.div(0.15)), filteredPulse(p.y.div(0.15), float(0), float(0.08), fw.div(0.15)));
    const pipe = smoothstep(0.03, 0.0, abs(fract(p.y.mul(1.7).add(noise2D(vec2(p.x.mul(0.3), 3.1)).mul(0.6))).sub(0.5)).sub(0.1));
    const leaf = smoothstep(0.45, 0.6, noise2D(p.mul(vec2(1.3, 2.2)).add(7.0)));
    let mural = mix(lin(0xe8e6df), lin(0x9aa3a6), jt.mul(0.7));
    mural = mix(mural, mix(lin(0xc98fb6), lin(0x86c6c9), step(0.5, fract(p.x.mul(0.21)))), pipe.mul(0.85));
    mural = mix(mural, mix(lin(0x3e8a4a), lin(0x6fae4f), noise2D(p.mul(6.0))), leaf.mul(0.9));
    let col = white;
    col = mix(col, mural, isC(C.lower ?? 1));
    col = mix(col, lin(0x4b4d4e).mul(mix(0.9, 1.05, grit)), isC(C.plinth ?? 2));
    col = mix(col, lin(0xa83a2c), isC(C.end ?? 4));
    m.colorNode = col; m.roughnessNode = float(0.88);
    void tx; void ty;
  } else if (slot === "paint_fascia") {
    m.colorNode = mix(mix(lin(0xe3e2dd), lin(0xd3d1ca), n1.mul(0.5)), lin(0x5a5b5c).mul(mix(0.9, 1.1, n1)), isC(C.roof ?? 1));
    m.roughnessNode = float(0.75);
  } else if (slot === "painted_metal_grey") {
    let col = lin(0x2d5a9a).mul(mix(0.9, 1.05, n1));                     // [Street View] blue frames
    col = mix(col, lin(0x5b3d2b).mul(mix(0.85, 1.05, grit)), isC(C.bollard ?? 1));   // brown bollards
    col = mix(col, lin(0x8b8f93), isC(C.rail ?? 2));
    m.colorNode = col; m.roughnessNode = float(0.5); m.metalnessNode = float(0.25);
  } else if (slot === "glass_frosted") {
    // wired frosted glass: a pale green-grey, the 12.5 mm wire grid (box-filtered: no sub-pixel wire), a little grime low
    const g = max(filteredPulse(p.x.div(0.0125), float(0), float(0.08), fw.div(0.0125)), filteredPulse(p.y.div(0.0125), float(0), float(0.08), fw.div(0.0125)));
    m.colorNode = mix(mix(lin(0xa9b6b1), lin(0x8f9b97), n1), lin(0x6e7471), g.mul(0.35));
    m.roughnessNode = float(0.3); m.metalnessNode = float(0.0);
  } else {   // concrete: the landing slab, its yellow nosing, the throat's steps and its dark card
    let col = mix(lin(0x8e8b84), lin(0x9d9992), n1).mul(mix(0.93, 1.05, grit));
    col = mix(col, lin(0xd9b21e), isC(C.nosing ?? 1));
    col = mix(col, lin(0x17191b), isC(C.throat ?? 2));
    m.colorNode = col; m.roughnessNode = float(0.9);
  }
  const ao = texture(aoTex, uv(1)).r;
  m.aoNode = mix(float(1), ao, 0.95);
  m.colorNode = m.colorNode.mul(mix(float(1), ao, 0.45));
  m.name = `underpass ${slot}`; m.userData.shared = true; m.userData.slot = slot;
  if (slot === "glass_frosted") m.userData.noShadow = false;
  return m;
}

// ------------------------------------------------------------------------------------------------ the inside's slots
const rgbm = (c) => { const v = c.rgb.mul(c.a).mul(4.0); return v.mul(v); };
function bakedLight() {
  const n = nightK(), day = float(1).sub(n);
  return rgbm(attribute("_lsky", "vec4")).mul(upLook.dayGain.mul(day)).add(rgbm(attribute("_lnight", "vec4")).mul(upLook.nightGain.mul(n))).mul(upLook.adapt);
}
function insideMaterial(slot, mural, codes) {
  const m = new THREE.MeshBasicNodeMaterial();
  // (the glTF export stores v' = 1 - v: UV0's metres come back with y = 1 - (height over the floor / the stair line))
  const p = vec2(uv().x, float(1).sub(uv().y)), C = codes[slot] || {};
  const fw = max(fwidth(p.x), fwidth(p.y)).max(0.0005);
  const n1 = noise2D(p.mul(1.1)), grit = hash2D(floor(p.mul(70)));
  let alb;
  if (slot === "concrete_step") {
    alb = mix(lin(0x8c8983), lin(0x9b978f), n1).mul(mix(0.92, 1.05, grit));
    alb = mix(alb, lin(0xe0b51c).mul(mix(0.85, 1.0, n1)), isC(C.nosing ?? 1));
    alb = mix(alb, alb.mul(0.9), isC(C.riser ?? 2));
  } else if (slot === "floor_tile_grey") {
    // 30 cm grey ceramic tiles, dark joints; the drain strip a steel grate (slots 2 cm)
    const j = max(filteredPulse(p.x.div(0.3), float(0), float(0.012), fw.div(0.3)), filteredPulse(p.y.div(0.3), float(0), float(0.012), fw.div(0.3)));
    const tile = mix(lin(0x7b7a76), lin(0x8a8985), hash2D(floor(p.div(0.3)))).mul(mix(0.95, 1.04, n1));
    const grate = filteredPulse(p.x.div(0.02), float(0), float(0.5), fw.div(0.02));
    alb = mix(mix(tile, lin(0x4a4947), j.mul(0.8)), mix(lin(0x5c5e60), lin(0x111214), grate), isC(C.drain ?? 1));
  } else if (slot === "wall_mural") {
    // OUR OWN mural (models/underpass/mural.png / .ktx2: 3 strips of 10 m x 2.5 m + the lettering / signs row), UV0.x the
    // position along it, UV0.y the height over the floor / the stair line; over 2.5 m the sea's top colour, a dark
    // skirting under 12 cm; code paint: a plain sea-blue
    const strip = clamp(floor(p.x.div(10)), 0, 2);
    const sx = fract(p.x.div(10)), sy = strip.mul(2.5).add(clamp(p.y, 0.01, 2.49));
    // (texture v = 1 - atlas y / 10: the image's top row is atlas y = 10; the PNG fallback is loaded with flipY false.
    // The direction signs (atlas x 37..40) are mapped mirrored by underpass.py: mirrored back here)
    const muralC = texture(mural, vec2(sx, float(1).sub(sy.div(10)))).rgb;
    const lx = select(p.x.greaterThan(37.0), float(77.0).sub(p.x), p.x);
    const letters = texture(mural, vec2(lx.sub(30).div(10), float(1).sub(p.y.add(7.5).div(10)))).rgb;
    const top = mix(lin(0x5bb2c2), lin(0x3d8fb0), smoothstep(2.5, 6.0, p.y)).mul(mix(0.94, 1.04, n1));
    let col = select(p.y.greaterThan(2.5), top, muralC);
    col = mix(col, lin(0x3a3d40), step(p.y, 0.12));
    col = mix(col, letters, isC(C.letters ?? 1));
    col = mix(col, lin(0x2f6f94).mul(mix(0.94, 1.04, n1)), isC(C.paint ?? 2));
    alb = col;
  } else if (slot === "ceiling_paint") {
    alb = mix(lin(0xd6d3cb), lin(0xc8c4bb), n1.mul(0.7));
  } else if (slot === "painted_metal_grey") {
    let col = lin(0x8c9095).mul(mix(0.92, 1.05, n1));                    // galvanised rails / gutters
    col = mix(col, lin(0xd9d8d2), isC(C.housing ?? 4));
    col = mix(col, lin(0xe7e6e1), isC(C.sign ?? 6));
    alb = col;
  } else if (slot === "glass_frosted") {
    alb = lin(0xdfe6e3);
  } else alb = lin(0xfff8ec);
  const light = bakedLight();
  let col = alb.mul(light);
  if (slot === "lamp_glow") col = lin(0xfff6e6).mul(mix(2.2, 3.4, nightK()));
  m.colorNode = select(upLook.view.equal(1), light, select(upLook.view.equal(2), alb, col));
  m.name = `underpass inside ${slot}`; m.userData.slot = slot;
  return m;
}

async function loadMural(renderer) {
  try {
    const { ktxLoader } = await import("../materials/scans.js");
    const t = await ktxLoader(renderer).loadAsync(new URL("mural.ktx2", BASE).href);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  } catch {
    const t = await new THREE.TextureLoader().loadAsync(new URL("mural.png", BASE).href);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
    return t;
  }
}

async function aoTexture() {
  const { w, h, r } = await decodeAO(new URL("calevoet_ao.png", BASE).href);
  const t = new THREE.DataTexture(r, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

const loader = () => { MeshoptDecoder.useWorkers?.(2); return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); };

export async function addUnderpass({ scene, updaters, hide, world, manifest, log = () => {}, compiler, renderer, getThird }) {
  const notes = await fetch(new URL("calevoet.json", BASE)).then((r) => r.json()).catch(() => null);
  if (!notes) { log("underpass: models/underpass/calevoet.json missing, the UrbIS kiosks stay"); return; }
  hide.push(...notes.placement.hides_solids, ...notes.placement.hides_bu_ids);
  const t0 = performance.now();
  (async () => {
    const [gltf, aoTex] = await Promise.all([loader().loadAsync(new URL("calevoet.glb", BASE).href), aoTexture()]);
    const mats = {};
    const matFor = (slot) => (mats[slot] ??= surfaceMaterial(slot, aoTex, notes.codes));
    const root = new THREE.Group(); root.name = UNDERPASS_ROOT;
    const pl = notes.placement;
    root.position.set(...pl.city_local_position); root.rotation.y = pl.rotation_y_rad;
    const levels = [0, 1, 2].map((k) => { const g = new THREE.Group(); g.name = `${UNDERPASS_ROOT}-lod${k}`; return g; });
    const throat = new THREE.Group(); throat.name = `${UNDERPASS_ROOT}-throat`;
    const tris = [0, 0, 0, 0];
    let colMesh = null;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let node = o; while (node.parent && node.parent !== gltf.scene) node = node.parent;
      const name = node.name || o.name;
      const g = o.geometry; g.computeBoundingSphere(); g.userData.shared = true;
      const t = (g.index ? g.index.count : g.attributes.position.count) / 3;
      if (/collision/i.test(name)) {
        colMesh = new THREE.Mesh(g, new THREE.MeshBasicNodeMaterial());
        colMesh.name = `${UNDERPASS_ROOT}-collision`; colMesh.visible = false; colMesh.castShadow = false; colMesh.userData.collider = true;
        return;
      }
      const slot = o.material.name;
      const m = new THREE.Mesh(g, matFor(slot));
      m.name = slot; m.userData.slot = slot; m.userData.base = m.material;
      m.castShadow = true; m.receiveShadow = true;
      const k = /throat/i.test(name) ? 3 : +(/lod(\d)/.exec(name)?.[1] ?? 0);
      tris[k] += t;
      (k === 3 ? throat : levels[k]).add(m);
    });
    if (colMesh) levels[0].add(colMesh);        // (heroColliders.js reads LOD0: the walker's collision comes with the kiosks)
    root.add(...levels, throat);
    root.visible = false;
    scene.add(root); root.updateMatrixWorld(true);
    let comp = compiler(); while (!comp) { await new Promise((r) => setTimeout(r, 250)); comp = compiler(); }
    const { openParallelPipelines } = await import("../../vendor/engine/parallelPipelines.js");
    const warm = await warmBridge({ group: root }, { compile: comp, renderer, scene, openParallel: renderer?.backend?.isWebGPUBackend ? openParallelPipelines : null }).catch((e) => ({ ms: 0, err: e.message }));
    // the kiosks' box (LOD distance) and the home tile
    const box = new THREE.Box3();
    for (const k of Object.values(notes.kiosks)) for (const [x, z] of k.ring) { box.expandByPoint(new THREE.Vector3(x, k.eaves - 4, z)); box.expandByPoint(new THREE.Vector3(x, k.eaves + 0.2, z)); }
    const c = box.getCenter(new THREE.Vector3());
    const home = manifest.tiles.find((t) => c.x >= t.bounds.x[0] && c.x < t.bounds.x[1] && c.z >= t.bounds.z[0] && c.z < t.bounds.z[1])?.name;
    const settle = [settleRamp(), settleRamp()];
    const ramp = (d, k) => settle[k](THREE.MathUtils.smoothstep(d, UP_LODS[k].until * (1 - BANDS[k]), UP_LODS[k].until * (1 + BANDS[k])));
    const state = { d: 0, shown: [true, false, false], fades: [1, 1, 1], inside: null, home: false };
    const inside = streamInside({ scene, notes, compiler, renderer, log, root, throat, state });
    const voids = underpassVoids(notes);
    let n = 0, hooked = null;
    updaters.push((camPos) => {
      if (n++ % 30 === 0) state.home = world.tiles.some((t) => t.name === home) || liteShown(scene, home);
      root.visible = state.home;
      if (!state.home) return;
      const d = box.distanceToPoint(camPos); state.d = d;
      const t1 = ramp(d, 0), t2 = ramp(d, 1);
      if (!SMOOTH) { levels.forEach((g, k) => { g.visible = k === (t1 < 0.5 ? 0 : t2 < 0.5 ? 1 : 2); }); }
      else {
        const fades = [t1 > 0 ? 2 + t1 : 1, t1 < 1 ? t1 : (t2 > 0 ? 2 + t2 : 1), t2 < 1 ? t2 : 1];
        const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
        state.shown = shown; state.fades = fades;
        setLodFades(levels, shown, fades);
      }
      // the throat: with LOD0 (its fade), until the inside shows
      const showThroat = levels[0].visible && !inside.state.shown;
      setLodFades([throat], [showThroat], [state.fades[0]]);
      if (colMesh) colMesh.visible = false;
      inside.update(camPos, getThird?.());
      // the walker: the field's voids, once the kiosks' triangles are in its world (heroColliders -> cityHook)
      const third = getThird?.();
      if (third?.world && hooked !== third && window.__heroCols?.done?.has(UNDERPASS_ROOT)) {
        const hf = third.world.sources.find((s) => s instanceof Heightfield);
        if (hf) { hf.voids = voids; hooked = third; log(`underpass: the walker's field has ${voids.length} voids (wells + corridor)`); }
      }
    });
    log(`underpass U1 (Calevoet): kiosks LODs ${tris.slice(0, 3).map(Math.round).join(" / ")} triangles, ${levels.map((l) => l.children.filter((o) => o.visible !== false).length).join("/")} draws, throat ${Math.round(tris[3])}; collision ${colMesh ? colMesh.geometry.index ? colMesh.geometry.index.count / 3 : colMesh.geometry.attributes.position.count / 3 : 0} triangles; loaded ${Math.round(performance.now() - t0)} ms, warmed ${Math.round(warm.ms)} ms${warm.err ? ` (${warm.err})` : ""}`);
    window.__underpass = { root, levels, throat, notes, state, inside, look: upLook, tris, warm };
  })().catch((e) => log(`underpass model failed (${e.message}): the kiosks are hidden, reload with ?underpass=0`));
}

/** the inside's streaming (fetch < 80 m, compile while hidden, show < 50 m, hide > 70 m, drop after 20 s hidden) */
function streamInside({ scene, notes, compiler, renderer, log, root, throat, state }) {
  const st = { cell: null, loading: false, shown: false, hiddenAt: 0, t: {}, longTasks: [], stats: null };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (st.loading || st.watch > performance.now()) st.longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask" }); } catch { /* no longtask API */ }
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  let mural = null;
  async function load() {
    st.loading = true; st.t.start = performance.now();
    try {
      const [gltf, tex] = await Promise.all([loader().loadAsync(new URL("calevoet_in.glb", BASE).href), mural ?? loadMural(renderer)]);
      mural = tex;
      st.t.loaded = performance.now();
      const cell = new THREE.Group(); cell.name = `${UNDERPASS_ROOT}-inside`;
      cell.position.copy(root.position); cell.rotation.copy(root.rotation);
      const mats = {};
      let tris = 0, draws = 0;
      const meshes = [];
      gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
      for (const o of meshes) {
        const slot = o.material.name;
        o.material = (mats[slot] ??= insideMaterial(slot, mural, notes.codes));
        o.userData.slot = slot; o.castShadow = false; o.receiveShadow = false;
        o.geometry.computeBoundingSphere();
        tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; draws++;
        o.removeFromParent(); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
        cell.add(o);
      }
      cell.visible = false; scene.add(cell); cell.updateMatrixWorld(true);
      // ONE material at a time, 4 frames apart, while hidden (rule interior-stream-paced)
      let comp = compiler(); while (!comp) { await new Promise((r) => setTimeout(r, 250)); comp = compiler(); }
      for (const o of meshes) { await comp([o]); for (let k = 0; k < 4; k++) await frame(); }
      st.t.compiled = performance.now();
      st.cell = cell; st.mats = mats;
      st.stats = { triangles: Math.round(tris), draws, fetchMs: Math.round(st.t.loaded - st.t.start), compileMs: Math.round(st.t.compiled - st.t.loaded) };
      log(`underpass inside: ${st.stats.triangles} tris, ${draws} draws; fetched + decoded ${st.stats.fetchMs} ms, shaders ${st.stats.compileMs} ms (background); long tasks while streaming: ${st.longTasks.length ? st.longTasks.join(", ") + " ms" : "none"}`);
    } catch (e) { log(`underpass inside failed: ${e.message}`); }
    st.loading = false;
  }
  function show(v) {
    if (!st.cell || st.shown === v) return;
    st.shown = v; st.watch = performance.now() + 2000;
    if (v) {
      st.cell.visible = true;
      const ms = st.cell.children.filter((o) => o.isMesh);
      for (const o of ms) o.visible = false;
      let i = 0; const next = () => { if (!st.shown) return; if (i < ms.length) { ms[i++].visible = true; requestAnimationFrame(next); } };
      requestAnimationFrame(next);
    } else { st.cell.visible = false; st.hiddenAt = performance.now(); }
  }
  function unload() {
    if (!st.cell) return;
    st.cell.removeFromParent();
    st.cell.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    for (const m of Object.values(st.mats || {})) m.dispose();
    st.cell = null; st.mats = null;
  }
  const tmp = new THREE.Vector3();
  return {
    state: st,
    /** force: true / false (a tour view) or null (by distance) */
    force: null,
    update(camPos, third) {
      const p = third?.on ? tmp.set(third.tp.x, third.tp.y, third.tp.z) : camPos;
      const d = Math.min(state.d, third?.on ? p.distanceTo(root.position) : Infinity);
      if (!st.cell && !st.loading && (d < STREAM.fetch || this.force)) load();
      if (st.cell) {
        if (this.force === true || (this.force == null && d < STREAM.show)) show(true);
        else if (this.force === false || d > STREAM.hide) show(false);
        if (!st.shown && st.hiddenAt && performance.now() - st.hiddenAt > STREAM.unloadS * 1000 && d > STREAM.fetch) { unload(); st.hiddenAt = 0; }
      }
      // the eye adapts a little inside (the corridor is darker than the street)
      const inside = st.shown && camPos.y < notes.levels.soffit + 0.3;
      const target = inside ? upLook.adaptInside : 1;
      upLook.adapt.value += (target - upLook.adapt.value) * 0.05;
      void throat;
    },
  };
}
