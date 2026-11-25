// THE KID CANDIDATES (docs/KIDCHAR.md, phase 1): the three MakeHuman / MPFB boys (models/kid/candidates/kid_a|b|c.glb,
// tools/blender/kidMakeHuman.py + tools/kid/kidCandPack.mjs) and the current kid (models/characters/kid.glb) side by
// side on the ground for the owner to compare, with a name label each and an orbit camera (drag = orbit, wheel = zoom).
// The candidates stand in their rest pose (MakeHuman's A-pose: no clips on the MPFB rig yet: phase 2 retargets them);
// the current kid in its bind pose (T) or playing its Idle.
//
//   const KC = await loadKidCandidates(renderer, scene)     { items, place(x, z, heading, heightAt), setActive(on),
//                                                             update(dt, camera) (overrides the camera while active) }
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { prepareKid } from "./kidModel.js";

const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";
const CAND_BASE = new URL("../../models/kid/candidates/", import.meta.url).href;
const KID_URL = new URL("../../models/characters/kid.glb", import.meta.url).href;
export const KID_CANDS = ["a", "b", "c"];
export const KC = { shift: 0.45, spacing: 1.1, idle: true, labels: true, yaw: 0.0, pitch: 0.12, dist: 4.2, height: 0.85 };

export async function loadKidCandidates(renderer, scene) {
  const ktx = new KTX2Loader().setTranscoderPath(TRANSCODER);
  if (renderer) ktx.detectSupport(renderer);
  MeshoptDecoder.useWorkers?.(1);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx);
  const group = new THREE.Group(); group.name = "kid candidates"; group.visible = false;
  scene.add(group);
  const items = [];
  const cands = await Promise.all(KID_CANDS.map(async (c) => {
    const [gltf, info] = await Promise.all([loader.loadAsync(CAND_BASE + `kid_${c}${new URLSearchParams(location.search).get("candraw") === "1" ? ".raw" : ""}.glb`), fetch(CAND_BASE + `kid_${c}.json`).then((r) => r.json())]);
    return { c, gltf, info };
  }));
  for (const { c, gltf, info } of cands) {
    const root = gltf.scene;
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    items.push({ id: c, label: info.label, sub: `${info.height.toFixed(2)} m · head 1/${info.headRatio} · ${info.tris} tris`, root, info, mixer: null });
  }
  // the current kid (its own palette material, LOD0, the Idle clip)
  const kg = await loader.loadAsync(KID_URL);
  const kid = prepareKid(kg);
  kg.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const mixer = new THREE.AnimationMixer(kg.scene);
  const idle = kg.animations.find((a) => a.name === "Idle");
  const action = idle ? mixer.clipAction(idle) : null;
  items.push({ id: "now", label: "current kid", sub: `1.46 m · ${kid.tris[0]} tris (LOD0)`, root: kg.scene, mixer, action, kid });
  for (const it of items) group.add(it.root);
  // labels (DOM, projected each frame)
  const labels = items.map((it) => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;transform:translate(-50%,-100%);padding:3px 7px;border-radius:5px;background:rgba(20,24,30,.8);color:#e6e9ee;font:12px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;text-align:center;display:none";
    d.innerHTML = `<b style="color:#f2c12e">${it.label}</b><br><small style="color:#aab4bf">${it.sub}</small>`;
    document.body.append(d); return d;
  });

  const center = new THREE.Vector3();
  let active = false, heading = 0;
  // orbit (only while active): drag on the canvas, wheel to zoom
  const dom = renderer.domElement;
  let drag = null;
  dom.addEventListener("pointerdown", (e) => { if (active) drag = { x: e.clientX, y: e.clientY }; });
  addEventListener("pointerup", () => { drag = null; });
  addEventListener("pointermove", (e) => {
    if (!active || !drag) return;
    KC.yaw -= (e.clientX - drag.x) * 0.006; KC.pitch = Math.min(1.2, Math.max(-0.2, KC.pitch + (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
  });
  dom.addEventListener("wheel", (e) => { if (!active) return; KC.dist = Math.min(12, Math.max(0.6, KC.dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: true });

  const api = {
    items, group,
    get active() { return active; },
    /** line them up across `heading` (rad, the way they face) centred on (x, z), each foot on heightAt(x, z) */
    place(x, z, h, heightAt) {
      heading = h; center.set(x, heightAt(x, z), z);
      const rx = Math.cos(h), rz = -Math.sin(h);                 // the line's direction (right of the facing)
      items.forEach((it, i) => {
        const o = (i - (items.length - 1) / 2) * KC.spacing;
        const px = x + rx * o, pz = z + rz * o;
        it.root.position.set(px, heightAt(px, pz), pz);
        it.root.rotation.set(0, h, 0);
      });
    },
    setActive(on) { active = on; group.visible = on; labels.forEach((d) => { d.style.display = on && KC.labels ? "" : "none"; }); },
    /** focus the orbit on one of them (index) or the middle (-1) */
    focus(i = -1, dist = null) {
      if (i < 0) { KC.height = 0.85; KC.dist = dist ?? 4.2; api._focus = null; }
      else { api._focus = items[i]; KC.height = 1.32; KC.dist = dist ?? 0.9; }
    },
    _focus: null,
    update(dt, camera) {
      if (!active) return;
      for (const it of items) if (it.mixer) {
        if (KC.idle && it.action && !it.action.isRunning()) it.action.reset().play();
        if (!KC.idle && it.action?.isRunning()) { it.action.stop(); it.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); }); }
        if (KC.idle) it.mixer.update(dt);
      }
      const tgt = api._focus ? api._focus.root.position.clone() : center.clone();
      if (!api._focus) { tgt.x += Math.cos(heading) * KC.shift; tgt.z -= Math.sin(heading) * KC.shift; }   // (the panel covers the right)
      tgt.y += KC.height;
      const yaw = heading + KC.yaw;                                // 0 = in front of them
      camera.position.set(tgt.x + Math.sin(yaw) * Math.cos(KC.pitch) * KC.dist, tgt.y + Math.sin(KC.pitch) * KC.dist, tgt.z + Math.cos(yaw) * Math.cos(KC.pitch) * KC.dist);
      camera.lookAt(tgt);
      camera.updateMatrixWorld();
      const v = new THREE.Vector3();
      items.forEach((it, i) => {
        const d = labels[i];
        if (!KC.labels) { d.style.display = "none"; return; }
        v.copy(it.root.position); v.y += (it.id === "now" ? 1.5 : (it.info?.height ?? 1.45)) + 0.12; v.project(camera);
        if (v.z > 1) { d.style.display = "none"; return; }
        d.style.display = ""; d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
      });
    },
  };
  return api;
}
