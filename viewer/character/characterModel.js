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

export const CHARACTERS = {
  hoodie: { file: "hoodie.glb", label: "Hoodie (Quaternius, CC0)" },
  casual: { file: "casual.glb", label: "Casual (Quaternius, CC0)" },
};
// the clips: no jump / fall clip in this pack, so the run cycle is held at a stride (a leap) for both
const CLIPS = { idle: "Idle_Neutral", walk: "Walk", run: "Run", jump: { clip: "Run", at: 0.18 }, fall: { clip: "Run", at: 0.62 } };
// (node names as GLTFLoader leaves them: PropertyBinding.sanitizeNodeName drops the dots, "UpperLeg.L" -> "UpperLegL")
const LEG = (s) => ({ upper: `UpperLeg${s}`, lower: `LowerLeg${s}`, end: `LowerLeg${s}_end`, foot: `Foot${s}` });

export async function loadCharacter(name = "hoodie", { height = 1.76 } = {}) {
  const def = CHARACTERS[name] || CHARACTERS.hoodie;
  const gltf = await new GLTFLoader().loadAsync(new URL(`../../models/characters/${def.file}`, import.meta.url).href);
  const t0 = performance.now();
  const tris = mergeSkinned(gltf.scene);
  const speeds = {
    walk: strideSpeed(gltf, "Walk"), run: strideSpeed(gltf, "Run"),
  };
  return {
    gltf,
    opts: { clips: CLIPS, height, forward: "+z", walkSpeed: speeds.walk, runSpeed: speeds.run, speedUnits: "model", rig: { left: LEG("L"), right: LEG("R"), pelvis: "Body" } },
    info: { name, label: def.label, tris, speeds, mergeMs: +(performance.now() - t0).toFixed(1) },
  };
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
