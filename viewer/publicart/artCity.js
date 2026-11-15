// THE PUBLIC ART KIT IN THE CITY (docs/publicart/PUBLIC_ART_KIT.md; on by default, ?art=old = the city without it).
// Data-driven: models/publicart/site.json (tools/publicart/build_site.py, from data/publicart/inventory.json + UrbIS + OSM +
// the DTM) says where each piece stands and which way it faces; the kit (artKit.js) holds the models and materials.
//   - the Dix Monolithes, La Victoire (the V), the Monument Rene Gobert: one landmark each, three levels of detail
//     cross-faded by distance with the landmarks' TIMED settle (lodFade.js settleRamp: standing still = one level, whole;
//     crossing a switch = a 0.6 s dissolve; the shadow pass follows), nothing drawn beyond the last band;
//   - the milestones (5 km, 0, 1) and the Charles V boundary stones: INSTANCED (viewer/parkKit.js KitField: one draw per
//     slot and level for all of them, per-instance bands, dithered hand-over), their numerals per instance (MEDALLIONS);
//     set on the walking surface (world.walkY: the sidewalk) once their tile is in;
//   - the UrbIS boxes of the ten monoliths join the hide list (before the first tile);
//   - colliders: each piece's root "art-<id>" has a "_lod0" child (its LOD0, drawn or not): viewer/heroColliders.js builds
//     the car blocks and the walker's triangles from it (ART_ROOTS), the contact audit reads it.
import * as THREE from "three/webgpu";
import { loadArtKit, MEDALLIONS } from "./artKit.js";
import { setLodFades } from "../stpierreModel.js";
import { SMOOTH, fadeProxies, settleRamp } from "../lodFade.js";
import { KitField } from "../parkKit.js";
import { liteShown } from "../liteShown.js";

const MODEL = { monolithes: "monolithes", evades: "evades", gobert: "gobert", km5: "milestone", milestone0: "milestone", milestone1: "milestone", charlesquint1: "boundary", charlesquint2: "boundary" };
const CELL = { 5: 5, 0: 6, 1: 7 };          // the numerals' cells in publicart_letters.json

export async function addPublicArt({ scene, updaters, hide, world, manifest, log, compiler }) {
  const t0 = performance.now();
  const site = await fetch(new URL("../../models/publicart/site.json", import.meta.url)).then((r) => r.json()).catch(() => null);
  if (!site) { log("public art: models/publicart/site.json missing, the city stays without it"); return; }
  for (const p of site.pieces) if (p.hide_solids) hide.push(...p.hide_solids);
  const waitCompiler = async () => { let c = compiler(); while (!c) { await new Promise((r) => setTimeout(r, 250)); c = compiler(); } return c; };
  const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;
  const tileIn = (name) => world.tiles.some((t) => t.name === name);

  loadArtKit().then(async (kit) => {
    const tLoad = performance.now() - t0;
    const group = new THREE.Group(); group.name = "publicart";
    scene.add(group);
    const big = [], small = [];
    for (const p of site.pieces) (MODEL[p.id] === p.id ? big : small).push(p);
    // ---------------------------------------------------------------- the landmarks: Mesh per slot per level
    const L = big.map((p) => {
      const piece = kit.pieces[MODEL[p.id]];
      const root = new THREE.Group(); root.name = `art-${p.id}`;
      root.position.set(p.x, p.y, p.z); root.rotation.y = p.yaw;
      const levels = piece.lods.map((prims, k) => {
        const g = new THREE.Group(); g.name = `art-${p.id}_lod${k}`;
        for (const { slot, geometry } of prims) {
          const m = new THREE.Mesh(geometry, kit.slotMaterial(slot, k > 0));
          // (the hedges: no foliage cards, solid clipped bodies: they collide; nothing here is "soft")
          m.name = `${p.id} ${slot}`; m.userData.slot = slot; m.userData.base = m.material;
          m.castShadow = true; m.receiveShadow = true;
          g.add(m);
        }
        return g;
      });
      root.add(...levels);
      root.visible = false;
      group.add(root);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(levels[0]);
      const homes = manifest.tiles.filter((t) => t.bounds.x[0] < box.max.x && t.bounds.x[1] > box.min.x && t.bounds.z[0] < box.max.z && t.bounds.z[1] > box.min.z).map((t) => t.name);
      // the V and the Gobert memorial stand on the surface the city draws (a lawn / a square: world.walkY), set once their
      // tile is in; the monoliths' island is fitted to it already (its levels are relative to the DTM: site.json y)
      return { p, piece, root, levels, box, homes, settle: [settleRamp(), settleRamp(), settleRamp()], home: false, state: { k: -1, d: 0 }, refine: p.id !== "monolithes" };
    });
    // ---------------------------------------------------------------- the small stones: instanced
    const field = new KitField(kit, { castShadow: true, receiveShadow: true });
    field.group.name = "publicart-instanced";
    group.add(field.group);
    const inst = small.map((p) => ({ p, piece: MODEL[p.id], y: p.y, refined: false, root: null }));
    const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    const rebuild = () => {
      field.clear();
      for (const s of inst) {
        mat4.compose(new THREE.Vector3(s.p.x, s.y, s.p.z), q.setFromAxisAngle(Y, s.p.yaw), one);
        field.add(s.piece, mat4);
        if (s.root) { s.root.position.set(s.p.x, s.y, s.p.z); s.root.updateMatrixWorld(true); }
      }
      field.commit();
    };
    // the numerals: each milestone's (x, z, cell)
    inst.filter((s) => s.p.numeral != null).slice(0, 4).forEach((s, i) => MEDALLIONS.array[i].set(s.p.x, s.p.z, CELL[s.p.numeral] ?? 5, 0));
    // collider roots for the instanced ones (their LOD0, invisible)
    for (const s of inst) {
      const root = new THREE.Group(); root.name = `art-${s.p.id}`;
      root.position.set(s.p.x, s.y, s.p.z); root.rotation.y = s.p.yaw;
      const l0 = new THREE.Group(); l0.name = `art-${s.p.id}_lod0`; l0.visible = false;
      for (const { geometry, slot } of kit.pieces[s.piece].lods[0]) { const m = new THREE.Mesh(geometry, kit.slotMaterial(slot, false)); m.name = `${s.p.id} ${slot}`; l0.add(m); }
      root.add(l0); group.add(root); root.updateMatrixWorld(true);
      s.root = root;
    }
    rebuild();
    // shaders before anything shows (the landmarks' levels, their fading copies, the instanced field)
    const tc = performance.now();
    const roots = L.map((l) => l.root), fp = fadeProxies(group);
    for (const l of L) l.root.visible = true;
    for (const im of field.meshes) { im.count = 1; im.visible = true; }        // (every level, solid and fading copies)
    await (await waitCompiler())(fp ? [group, fp] : [group]);
    for (const im of field.meshes) { im.count = 0; im.visible = false; }
    for (const l of L) l.root.visible = false;
    const tComp = performance.now() - tc;
    // (the V and the Gobert memorial join the scene once set on the drawn surface: the collider builder reads them then)
    for (const l of L) if (l.refine) group.remove(l.root);
    let n = 0;
    updaters.push((camPos) => {
      const tick = n++ % 30 === 0;
      for (const l of L) {
        if (tick) l.home = l.homes.some((h) => tileIn(h) || liteShown(scene, h));
        if (tick && l.refine && tileIn(tileOf(l.p.x, l.p.z))) {
          l.refine = false;
          const y = world.walkY(l.p.x, l.p.z);
          l.root.position.y = y; l.root.updateMatrixWorld(true); l.box.setFromObject(l.levels[0]);
          l.p.yDrawn = y;
          // the gravel circle follows the drawn lawn (JOINS: it is a 3 cm layer, the lawn is not level): each vertex
          // moved by the drawn surface's height there minus the piece's (a copy of the geometry, this piece only)
          const v = new THREE.Vector3();
          for (const g of l.levels) for (const m of g.children) {
            if (m.userData.slot !== "gravel") continue;
            const geo = m.geometry.clone(), P = geo.attributes.position;
            m.updateMatrixWorld(true);
            for (let i = 0; i < P.count; i++) {
              v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
              P.setY(i, P.getY(i) + world.walkY(v.x, v.z) - y);
            }
            geo.computeBoundingSphere(); geo.computeBoundingBox();
            m.geometry = geo;
          }
          group.add(l.root);
        }
        if (l.refine) continue;
        const d = l.box.distanceToPoint(camPos), R = l.piece.range;
        l.state.d = d;
        if (!l.home || d > R[2] * 1.1 + 20) { l.root.visible = false; l.state.k = -1; l.state.shown = [false, false, false]; continue; }
        l.root.visible = true;
        if (SMOOTH) {
          const band = (r) => THREE.MathUtils.smoothstep(d, r * 0.92, r * 1.08);
          const t1 = l.settle[0](band(R[0])), t2 = l.settle[1](band(R[1])), t3 = l.settle[2](band(R[2]));
          const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0 && t3 < 1];
          const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2 < 1 ? t2 : 2 + t3];
          setLodFades(l.levels, shown, fades);
          l.state.k = shown.indexOf(true); l.state.shown = shown;
        } else {
          const k = R.findIndex((r) => d < r);
          l.levels.forEach((g, i) => { g.visible = i === k; });
          l.state.k = k;
        }
      }
      if (tick) {
        // the small stones onto the walking surface (the sidewalk) once their tile is loaded
        let moved = false;
        for (const s of inst) {
          if (s.refined) continue;
          const T = tileOf(s.p.x, s.p.z);
          if (!T || !tileIn(T)) continue;
          const y = world.walkY(s.p.x, s.p.z) - 0.01;
          s.refined = true;
          if (Math.abs(y - s.y) > 0.005) { s.y = y; moved = true; }
        }
        if (moved) rebuild();
      }
      field.update(camPos);
    });
    const tris = Object.fromEntries(Object.values(kit.pieces).map((p) => [p.name, p.tris]));
    log(`public art: ${L.length} landmarks (${L.map((l) => l.p.id).join(", ")}) + ${inst.length} instanced stones; LODs ${Object.entries(tris).map(([k, v]) => `${k} ${v.join("/")}`).join(", ")} triangles; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (?art=old: without)`);
    window.publicArt = { kit, site, landmarks: L, instanced: inst, field, group, tLoad, tComp };
  }).catch((e) => log(`public art failed (${e.message}): reload with ?art=old`));
}
