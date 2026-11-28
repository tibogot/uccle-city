// THE PLAYGROUND KITS IN THE CITY (claude/places2, rule curated-place-placed; ?places2=old = the city without them).
// The park kit's playground pieces (viewer/parkKit.js, models/parkkit/playgroundkit: tools/blender/playgroundKit.py) were
// only in the lab; the owner's playtest: "the children's garden in front of Le Pigeon Noir" (the public garden across
// Avenue de la Chênaie: a sand playground with timber play frames, a lawn, benches, boules pitches; OSM playground
// way 1123841132). Data-driven: data/overrides.json playgrounds.<id> = { set, why, source, ring (the sand), kit (the
// park kit, default playgroundkit), pieces: [[piece, x, z, yaw deg], ...] } from a look-only Street View check, each
// piece inside its ring.
//   - every piece of every playground INSTANCED in one KitField per kit (one draw per piece and level, per-instance LOD
//     bands, dithered hand-over: parkKit.js); set on the walking surface (world.walkY) once its tiles are in, then
//     compiled (async) and shown;
//   - (claude/places3, rule park-pieces-real) the Chênaie garden's real equipment: natural robinia log frames with rope
//     nets, a small log tower, balance logs (models/parkkit/timberkit: tools/blender/timberPlayKit.py), kit "timberkit"
//     in its entry; ?parkpieces=old = the playground kit's plastic stand-ins as before (the entry's piecesOld);
//   - COLLIDERS (claude/places3): a kit's json carries each piece's oriented boxes (posts, deck, rails, logs, the nets'
//     planes); one invisible triangle soup per playground, a hero root "playground-<id>" (viewer/heroColliders.js: the
//     walker's triangles and the car's 0.3-1.3 m band from it, only while shown). The plastic stand-ins have none.
import * as THREE from "three/webgpu";
import { loadParkKit, KitField } from "./parkKit.js";

import { playgroundsOn, pieceColliderTris } from "./playgroundLayout.js";
export { playgroundsOn, playgroundRootNames, pieceColliderTris, PARKPIECES_OLD } from "./playgroundLayout.js";

export async function addPlaygrounds({ scene, updaters, world, manifest, log, compiler, overrides, params }) {
  const list = playgroundsOn(overrides, params);
  if (!list.length) return;
  const t0 = performance.now();
  const kits = {}, fields = {};
  for (const name of new Set(list.map((g) => g.kit))) {
    kits[name] = await loadParkKit(name);
    const f = fields[name] = new KitField(kits[name], { castShadow: true, receiveShadow: true });
    f.group.name = `playgrounds ${name}`;
    scene.add(f.group);
  }
  const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;
  const tileIn = (name) => world.tiles.some((t) => t.name === name);
  const inst = [];
  for (const pg of list) for (const [piece, x, z, deg] of pg.pieces) {
    if (!kits[pg.kit].pieces[piece]) { log(`playgrounds: ${pg.id}: no piece ${piece} in ${pg.kit}`); continue; }
    inst.push({ pg: pg.id, kit: pg.kit, piece, x, z, yaw: (deg * Math.PI) / 180, y: null });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  // the collider roots (one per playground; its triangles once the pieces stand on the walking surface)
  const roots = new Map(), colMat = new THREE.MeshBasicMaterial({ visible: false });
  const colliders = () => {
    for (const pg of list) {
      const tris = [];
      for (const s of inst) if (s.pg === pg.id) { const boxes = kits[s.kit].info.colliders?.[s.piece]; if (boxes) tris.push(...pieceColliderTris(boxes, s.x, s.y, s.z, s.yaw)); }
      if (!tris.length) continue;
      const root = new THREE.Group(); root.name = `playground-${pg.id}`;
      const l0 = new THREE.Group(); l0.name = `${root.name}-lod0`; root.add(l0);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tris), 3)); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, colMat); mesh.visible = false; mesh.name = `${root.name}-boxes`; mesh.userData.collider = true;
      l0.add(mesh); scene.add(root); roots.set(root.name, root);
      root.userData.tiles = [...new Set(inst.filter((s) => s.pg === pg.id).map((s) => tileOf(s.x, s.z)))];
    }
  };
  // built ONCE, when every piece's tile is in (its height from the drawn walking surface), its shaders compiled
  // asynchronously before it shows (one KitField commit per kit: no material copies made again later, no compile on the
  // frame)
  let state = "wait", n = 0;
  const build = async () => {
    state = "compile";
    for (const s of inst) fields[s.kit].add(s.piece, m4.compose(p.set(s.x, s.y, s.z), q.setFromAxisAngle(Y, s.yaw), one));
    for (const f of Object.values(fields)) f.commit();
    colliders();
    const c = compiler();
    const meshes = Object.values(fields).flatMap((f) => f.meshes);
    if (c) {
      for (const im of meshes) { im.count = 1; im.visible = true; }
      await c(Object.values(fields).map((f) => f.group));
      for (const im of meshes) { im.count = 0; im.visible = false; }
    }
    state = "on";
  };
  updaters.push((camPos) => {
    if (state === "wait" && n++ % 30 === 0 && inst.every((s) => { const T = tileOf(s.x, s.z); return T && tileIn(T); })) {
      // (the timber kit's posts and logs are modelled into the ground: set on the surface; the plastic kit's feet 2 cm in)
      for (const s of inst) s.y = world.walkY(s.x, s.z) - (s.kit === "playgroundkit" ? 0.02 : 0);
      build().catch((e) => { state = "off"; log(`playgrounds failed (${e.message}): reload with ?places2=old`); });
    }
    if (state === "on") {
      for (const f of Object.values(fields)) f.update(camPos);
      if (n++ % 30 === 0) for (const r of roots.values()) r.visible = r.userData.tiles.every(tileIn);     // (colliders only while the tiles are in)
    }
  });
  log(`playgrounds: ${list.length} (${list.map((g) => `${g.id} ${g.kit}`).join(", ")}), ${inst.length} pieces, ${(performance.now() - t0).toFixed(0)} ms (?places2=old: none; ?parkpieces=old: the plastic stand-ins)`);
  window.playgrounds = { list, inst, fields, kits, roots, field: Object.values(fields)[0], kit: Object.values(kits)[0] };
}
