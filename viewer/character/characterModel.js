// THE CHARACTERS for the third-person slot: Quaternius' modular men (CC0, see CREDITS.md), converted by
// tools/characters/convertCharacters.mjs into models/characters/<name>.glb.
//
//   const ch = await loadCharacter("hoodie");     // { gltf, opts, info }:  tp.body.setModel(ch.gltf, ch.opts)
//
// At load: the four skinned parts (feet, legs, body, head) become ONE skinned mesh, the material colours baked to
// vertex colours: one material, one draw call (shadows: one more). The walk / run clips' authored ground speed is
// measured from the foot bones (how fast a planted foot slides back), so playback can be matched to the real speed.
// The rig: Root -> Body -> Hips / UpperLeg -> LowerLeg -> LowerLeg_end (ankle), and Foot.L / Foot.R straight under
// Root (IK-style controls): viewer/character/footIK.js moves the feet and bends the legs to them.
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// stride: the clips' ground speed in the model's own units, calibrated in the Capsule Lab (the authored speed that
// makes the planted foot slide least, foot IK off: walk 1.44, run 3.29 -> 1.38 / 3.15 m/s at 1.76 m); the stance
// measurement below (strideSpeed) reads ~7 % low on the run (its touch-down / lift-off frames), it is the fallback
const MODULAR_MEN_STRIDE = { walk: 1.44, run: 3.29 };
export const CHARACTERS = {
  // Quaternius Universal Animation Library 1 + 2 (CC0): the mannequin (placeholder body) on the universal rig with the
  // UAL clips + metadata (tools/characters/ualBuild.mjs -> models/characters/ual.glb + ual.json), the locomotion graph
  // (locomotion.js). The default third-person character; a nicer body goes on the same rig later.
  ual: { file: "ual.glb", meta: "ual.json", label: "UAL mannequin (Quaternius, CC0)", system: "loco",
    // the controller's gait speeds (m/s): walk 1.35 = the UAL walk (0.98 m/s authored) at 1.38x, a realistic cadence;
    // run / sprint a little under the clips' authored 5.36 / 8.25 (played at ~0.93 / 0.85); crouch 0.9 (0.75 authored)
    move: { walk: 1.35, run: 5.0, sprint: 7.0, crouch: 0.9, accel: 12, decel: 14 } },
  // THE KID (docs/KID.md): tools/characters/kid.py (a 90s kid of ~11, 1.44 m, scripted on the UAL rig) + the UAL clips
  // on its joints (tools/characters/ualBuild.mjs --kid). Named slots coloured by viewer/kid/kidModel.js (one draw / LOD).
  // Gaits: the clips' authored speeds on the kid's legs (walk 0.78, jog 4.28, sprint 6.59, crouch 0.60 m/s) played
  // with the same ratios as the UAL mannequin's.
  kid: { file: "kid.glb", meta: "kid.json", label: "The kid (scripted, UAL rig + clips, CC0)", system: "loco", kid: true,
    move: { walk: 1.1, run: 4.0, sprint: 5.6, crouch: 0.72, accel: 12, decel: 14 } },
  // THE MPFB KID (docs/KIDCHAR.md phase 2: the owner's candidate A, tools/blender/kidMakeHuman.py --game +
  // tools/characters/kidABuild.mjs): the same UAL rig + 33 clips, real proportions, one atlas (KTX2), 3 LODs.
  // Gaits: the old kid's x his leg-length ratio (1.07).
  // (round 2 of the kid look, 2026-11-28: the clothes / hair / face as shapes; ?kidlook=r1 / old load round 1's mesh:
  // the r1 files)
  kidA: { file: "kidA.glb", meta: "kidA.json", label: "The kid A (MakeHuman MPFB, UAL rig + clips, CC0)", system: "loco", kid: true, atlas: "kidA_atlas.ktx2", detail: "kidA_detail.ktx2", fabric: "kid_fabric.ktx2",
    r1: { file: "kidA_r1.glb", meta: "kidA_r1.json", atlas: "kidA_r1_atlas.ktx2", detail: "kidA_r1_detail.ktx2" },
    move: { walk: 1.18, run: 4.25, sprint: 6.0, crouch: 0.77, accel: 12, decel: 14 } },
  hoodie: { file: "hoodie.glb", label: "Hoodie (Quaternius, CC0)", stride: MODULAR_MEN_STRIDE },
  casual: { file: "casual.glb", label: "Casual (Quaternius, CC0)", stride: MODULAR_MEN_STRIDE },
};
// the clips: no jump / fall clip in this pack, so the run cycle is held at a stride (a leap) for both
const CLIPS = { idle: "Idle_Neutral", walk: "Walk", run: "Run", jump: { clip: "Run", at: 0.18 }, fall: { clip: "Run", at: 0.62 } };
// (node names as GLTFLoader leaves them: PropertyBinding.sanitizeNodeName drops the dots, "UpperLeg.L" -> "UpperLegL")
const LEG = (s) => ({ upper: `UpperLeg${s}`, lower: `LowerLeg${s}`, end: `LowerLeg${s}_end`, foot: `Foot${s}` });

/**
 * A locomotion character (system "loco"): one GLB with the skinned body (one primitive, vertex colours) and its
 * in-place clips, and the clips' metadata (contacts, touch-downs, speeds, stairs). Bone names as GLTFLoader keeps them.
 */
async function loadLoco(name, def, renderer = null) {
  const base = new URL("../../models/characters/", import.meta.url).href;
  let look = null;
  if (def.kid) {
    const { KID_LOOK } = await import("../kid/kidModel.js");
    look = KID_LOOK;
    if (def.r1 && look !== "r2") def = { ...def, ...def.r1 };       // (?kidlook=r1 / old: round 1's mesh + maps)
  }
  const [gltf, meta] = await Promise.all([new GLTFLoader().loadAsync(base + def.file), fetch(base + def.meta).then((r) => { if (!r.ok) throw new Error(`${def.meta} ${r.status}`); return r.json(); })]);
  let tris = 0, mesh = null, kid = null;
  if (def.kid) {
    const { prepareKid } = await import("../kid/kidModel.js");
    kid = prepareKid(gltf, def.atlas ? { atlas: base + def.atlas, detail: def.detail && base + def.detail, fabric: def.fabric && base + def.fabric, renderer, look } : {}); tris = kid.tris[0];
  }
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (mesh && !kid) {
    const g = mesh.geometry;
    tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    // (a node material: the body's camera fade sets opacityNode on its clone)
    mesh.material = new THREE.MeshStandardNodeMaterial({ vertexColors: !!g.attributes.color, roughness: mesh.material.roughness ?? 0.6, metalness: 0 });
    mesh.name = "character";
  }
  const leg = (s) => ({ upper: `thigh_${s}`, lower: `calf_${s}`, foot: `foot_${s}`, toe: `ball_${s}`, tip: `ball_leaf_${s}` });
  return {
    gltf,
    opts: { system: "loco", meta, forward: "+z", move: def.move, rig: { left: leg("l"), right: leg("r"), hips: "pelvis", spine: ["spine_01", "spine_02", "spine_03"] } },
    info: { name, label: def.label, tris, clips: Object.keys(meta.clips).length, ...(kid ? { kid, lods: kid.tris } : {}) },
  };
}

export async function loadCharacter(name = "hoodie", { height = 1.76, renderer = null } = {}) {
  const def = CHARACTERS[name] || CHARACTERS.hoodie;
  if (def.system === "loco") return loadLoco(name, def, renderer);
  const gltf = await new GLTFLoader().loadAsync(new URL(`../../models/characters/${def.file}`, import.meta.url).href);
  const t0 = performance.now();
  const tris = mergeSkinned(gltf.scene);
  const measured = { walk: strideSpeed(gltf, "Walk"), run: strideSpeed(gltf, "Run") };
  const speeds = def.stride ? { ...def.stride } : measured;
  poseRest(gltf);                 // setModel sizes the model from its skinned box: in a real pose, not the FBX bind pose
  return {
    gltf,
    opts: { clips: CLIPS, height, forward: "+z", walkSpeed: speeds.walk, runSpeed: speeds.run, speedUnits: "model", rig: { left: LEG("L"), right: LEG("R"), pelvis: "Body" } },
    info: { name, label: def.label, tris, speeds, measured, mergeMs: +(performance.now() - t0).toFixed(1) },
  };
}

/** The idle clip's first frame on the skeleton (the bind pose of these FBX conversions is 100x scaled). */
function poseRest(gltf) {
  const clip = gltf.animations.find((a) => a.name === "Idle_Neutral") || gltf.animations[0];
  if (!clip) return;
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(clip).play(); mixer.setTime(0);
  gltf.scene.updateMatrixWorld(true);
  mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
}

/** The skinned parts of `root` merged into one SkinnedMesh with vertex colours (they share one skeleton). */
function mergeSkinned(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => { if (o.isSkinnedMesh) parts.push(o); });
  if (parts.length < 1) return 0;
  const first = parts[0], M0inv = first.bindMatrix.clone().invert(), m = new THREE.Matrix4(), c = new THREE.Color();
  const geos = [];
  for (const p of parts) {
    const mats = Array.isArray(p.material) ? p.material : [p.material];
    let g = p.geometry.clone();
    // into the first part's bind space
    m.multiplyMatrices(M0inv, p.bindMatrix);
    g.applyMatrix4(m);
    // colour per vertex from the (group's) material
    const n = g.attributes.position.count, col = new Float32Array(n * 3), had = g.attributes.color;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : n, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex ?? 0] || mats[0];
      c.copy(mat.color || c.set(1, 1, 1));
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        const v = g.index ? g.index.getX(k) : k;
        col[v * 3] = c.r * (had ? had.getX(v) : 1); col[v * 3 + 1] = c.g * (had ? had.getY(v) : 1); col[v * 3 + 2] = c.b * (had ? had.getZ(v) : 1);
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "skinIndex", "skinWeight", "color"].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  const mat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const mesh = new THREE.SkinnedMesh(merged, mat);
  mesh.name = "character";
  first.parent.add(mesh);
  mesh.position.copy(first.position); mesh.quaternion.copy(first.quaternion); mesh.scale.copy(first.scale);
  mesh.updateMatrixWorld(true);
  mesh.bind(first.skeleton, first.bindMatrix);
  for (const p of parts) { p.removeFromParent(); p.geometry.dispose(); }
  return merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3;
}

/**
 * The ground speed a clip was authored at (m/s in the model's units, before any rescale: the caller scales it with
 * the model): while a foot is planted it slides back at the walking speed. Sampled over the cycle, per foot, the
 * fastest steady backward speed of the lower foot.
 */
function strideSpeed(gltf, clipName) {
  const clip = gltf.animations.find((a) => a.name === clipName);
  if (!clip) return 0;
  const scene = gltf.scene, mixer = new THREE.AnimationMixer(scene), act = mixer.clipAction(clip);
  act.play();
  const feet = ["FootL", "FootR"].map((n) => scene.getObjectByName(n)).filter(Boolean);
  const N = 60, dur = clip.duration, p = new THREE.Vector3();
  const xs = feet.map(() => []), zs = feet.map(() => []), ys = feet.map(() => []);
  for (let i = 0; i <= N; i++) {
    mixer.setTime((i / N) * dur);
    scene.updateMatrixWorld(true);
    feet.forEach((f, k) => { f.getWorldPosition(p); xs[k].push(p.x); zs[k].push(p.z); ys[k].push(p.y); });
  }
  mixer.stopAllAction(); mixer.uncacheRoot(scene);
  // per foot: the travel while it is in its lower half (planted), over the time it takes
  let best = 0;
  feet.forEach((_, k) => {
    const y = ys[k], x = xs[k], z = zs[k], lo = Math.min(...y), hi = Math.max(...y), lim = lo + (hi - lo) * 0.2;
    let dist = 0, time = 0;
    for (let i = 1; i <= N; i++) if (y[i] <= lim && y[i - 1] <= lim) { dist += Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]); time += dur / N; }
    if (time > 0) best = Math.max(best, dist / time);
  });
  return best;
}
