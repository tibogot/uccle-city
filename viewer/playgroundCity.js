// THE PLAYGROUND KIT IN THE CITY (claude/places2, rule curated-place-placed; ?places2=old = the city without them).
// The park kit's playground pieces (viewer/parkKit.js, models/parkkit/playgroundkit: tools/blender/playgroundKit.py) were
// only in the lab; the owner's playtest: "the children's garden in front of Le Pigeon Noir" (the public garden across
// Avenue de la Chênaie: a sand playground with timber play frames, a lawn, benches, boules pitches; OSM playground
// way 1123841132). Data-driven: data/overrides.json playgrounds.<id> = { set, why, source, ring (the sand), pieces:
// [[piece, x, z, yaw deg], ...] } from a look-only Street View check, each piece inside its ring.
//   - every piece of every playground INSTANCED in one KitField (one draw per slot and level, per-instance LOD bands,
//     dithered hand-over: parkKit.js); set on the walking surface (world.walkY) once its tiles are in, then compiled
//     (async) and shown;
//   - no collider yet (the pieces stand in a public garden behind a hedge and a parking row, off the drive).
import * as THREE from "three/webgpu";
import { loadParkKit, KitField } from "./parkKit.js";

/** the playgrounds this build draws (a set's entries only with its switch on) */
export function playgroundsOn(ov, params) {
  const all = ov?.playgrounds || {};
  return Object.entries(all).filter(([k, v]) => !k.startsWith("_") && v?.pieces?.length && (v.set !== "places2" || params.get("places2") !== "old")).map(([id, v]) => ({ id, ...v }));
}

export async function addPlaygrounds({ scene, updaters, world, manifest, log, compiler, overrides, params }) {
  const list = playgroundsOn(overrides, params);
  if (!list.length) return;
  const t0 = performance.now();
  const kit = await loadParkKit("playgroundkit");
  const field = new KitField(kit, { castShadow: true, receiveShadow: true });
  field.group.name = "playgrounds";
  scene.add(field.group);
  const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;
  const tileIn = (name) => world.tiles.some((t) => t.name === name);
  const inst = [];
  for (const pg of list) for (const [piece, x, z, deg] of pg.pieces) {
    if (!kit.pieces[piece]) { log(`playgrounds: ${pg.id}: no piece ${piece} in the kit`); continue; }
    inst.push({ pg: pg.id, piece, x, z, yaw: (deg * Math.PI) / 180, y: null });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  // built ONCE, when every piece's tile is in (its height from the drawn walking surface), its shaders compiled
  // asynchronously before it shows (one KitField commit: no material copies made again later, no compile on the frame)
  let state = "wait", n = 0;
  const build = async () => {
    state = "compile";
    for (const s of inst) field.add(s.piece, m4.compose(p.set(s.x, s.y, s.z), q.setFromAxisAngle(Y, s.yaw), one));
    field.commit();
    const c = compiler();
    if (c) {
      for (const im of field.meshes) { im.count = 1; im.visible = true; }
      await c([field.group]);
      for (const im of field.meshes) { im.count = 0; im.visible = false; }
    }
    state = "on";
  };
  updaters.push((camPos) => {
    if (state === "wait" && n++ % 30 === 0 && inst.every((s) => { const T = tileOf(s.x, s.z); return T && tileIn(T); })) {
      for (const s of inst) s.y = world.walkY(s.x, s.z) - 0.02;          // (the kit's feet are modelled a few cm into the ground)
      build().catch((e) => { state = "off"; log(`playgrounds failed (${e.message}): reload with ?places2=old`); });
    }
    if (state === "on") field.update(camPos);
  });
  log(`playgrounds: ${list.length} (${list.map((g) => g.id).join(", ")}), ${inst.length} pieces, ${(performance.now() - t0).toFixed(0)} ms (?places2=old: none)`);
  window.playgrounds = { list, inst, field, kit };
}
