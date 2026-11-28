// A POSE SHEET of a kid model (docs/KIDCHAR.md phase 2): clones of the character side by side, each frozen in an extreme
// pose of a UAL clip (the stride, the crouch, the jump's take-off, the roll, sitting, the fall), to look for skin tearing
// or garments poking through at the elbows / knees / shoulders / hips. The numbers live in tools/kid/kidTest.mjs (the
// per-joint tear rows); this is the eye check.
//   const PS = await loadPoseSheet(renderer, scene, "kidA")      { group, place(x, z, heading, heightAt), setVisible(on) }
import * as THREE from "three/webgpu";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { loadCharacter } from "../character/characterModel.js";

export const POSES = [["Walk", 0.33], ["Sprint", 0.25], ["JumpStart", 0.6], ["CrouchIdle", 0.5], ["CrouchWalk", 0.4], ["Roll", 0.35], ["Sit", 0.5], ["Push", 0.5], ["FallDown", 0.55]];

export async function loadPoseSheet(renderer, scene, name = "kidA") {
  const ch = await loadCharacter(name, { renderer });
  const src = ch.gltf.scene, anims = ch.gltf.animations;
  const group = new THREE.Group(); group.name = `pose sheet ${name}`; group.visible = false; scene.add(group);
  const items = POSES.map(([clip, f]) => {
    const root = cloneSkinned(src);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.visible = /LOD0$/.test(o.name); } });
    const a = anims.find((x) => x.name === clip);
    if (a) { const mx = new THREE.AnimationMixer(root); const act = mx.clipAction(a); act.play(); mx.setTime(a.duration * f); }
    group.add(root);
    return { clip, f, root };
  });
  return {
    group, items,
    place(x, z, h, heightAt, spacing = 1.2) {
      const rx = Math.cos(h), rz = -Math.sin(h);
      items.forEach((it, i) => {
        const o = (i - (items.length - 1) / 2) * spacing, px = x + rx * o, pz = z + rz * o;
        it.root.position.set(px, heightAt(px, pz), pz); it.root.rotation.set(0, h, 0);
      });
    },
    setVisible(on) { group.visible = on; },
  };
}
