// THE ROAD TUNNELS' MODELS in the city (docs/trains/TUNNELS.md): tools/blender/railTunnel.py -> models/rail/tunnel_<name>.glb
// (+ _ao.png, .json), loaded and drawn by the hero bridges' path (viewer/rail/bridgeModel.js: named slots from the material
// library, UV0 metres, baked AO, LODs by meshoptimizer with the dithered hand-over, the warm-up before showing). Here:
//   - the lamps' slot "lamp_glow" is an EMISSIVE material (no light is added: the city's light count never changes);
//   - the root is named "tunnel-<name>" (viewer/heroColliders.js, contactAudit.js and drive/collisionTest.js list them:
//     the car and the walker collide with what is drawn);
//   - shown while its home tile (full or far) is loaded; registered for the falcon's proxies (window.__bridges).
// The ground through the bores is the tile worker's (viewer/rail/tunnels.js). ?tunnels=0: neither.
import * as THREE from "three/webgpu";
import { color, float } from "three/tsl";
import { loadBridge, placeBridge, warmBridge } from "./bridgeModel.js";
import { TUNNELS } from "./tunnels.js";
import { liteShown } from "../liteShown.js";

/** the lamps' lens: a warm (sodium, Kleindalstraat) or white (LED, Brasserie) glow, constant day and night */
function lampMaterial(rgb) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0 });
  m.colorNode = color(0.08, 0.08, 0.08);
  m.emissiveNode = color(rgb[0], rgb[1], rgb[2]).mul(float(6.0));
  m.name = "lamp_glow"; m.userData.shared = true; m.userData.noShadow = true;
  return m;
}
const LAMP_RGB = { kleindal: [1.0, 0.62, 0.25], brasserie: [1.0, 0.95, 0.86] };

/** Load, warm and place both tunnels. ctx = { scene, world, manifest, updaters, compile: () => fn, renderer, log, smooth,
 *  openParallel } */
export function addTunnels(ctx) {
  const { scene, world, manifest, updaters, renderer, log = () => {}, smooth = true, openParallel = null } = ctx;
  return Promise.all(TUNNELS.map(async (name) => {
    try {
      const b = await loadBridge(`tunnel_${name}`);
      if (b.materials.lamp_glow && !b.materials.lamp_glow.userData.tunnelLamp) {
        b.materials.lamp_glow = lampMaterial(LAMP_RGB[name] || [1, 0.8, 0.5]);
        b.materials.lamp_glow.userData.tunnelLamp = true;
      }
      // the bore is modelled from inside (the earth is outside): its faces look inward, so the sun's shadow pass (front
      // faces) saw none of them and lit the bore. Both sides cast (these material instances are this tunnel's own)
      for (const m of Object.values(b.materials)) if (m.name !== "lamp_glow") m.shadowSide = THREE.DoubleSide;
      // the guard rails and lamp housings: dark grey paint (Street View 2024: near black), not the bridges' mid grey
      if (b.materials.painted_metal_grey && !b.materials.painted_metal_grey.userData.tunnelPaint) {
        const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.3 });
        m.colorNode = color(0.075, 0.08, 0.085); m.aoNode = b.materials.painted_metal_grey.aoNode;
        m.name = "painted_metal_grey"; m.userData.shared = true; m.userData.tunnelPaint = true; m.shadowSide = THREE.DoubleSide;
        b.materials.painted_metal_grey = m;
      }
      const pb = placeBridge(b, { smooth });
      pb.group.name = `tunnel-${name}`;
      for (const l of pb.levels) l.traverse((o) => { if (o.isMesh && o.material?.name === "lamp_glow") o.castShadow = false; });
      for (let i = 0; i < 200 && !ctx.compile(); i++) await new Promise((r) => setTimeout(r, 100));
      const warm = await warmBridge(pb, { compile: ctx.compile(), renderer, scene, openParallel }).catch((e) => ({ ms: 0, err: e.message }));
      scene.add(pb.group);
      window.__bridges ??= {}; window.__bridges[`tunnel_${name}`] = { b, pb, warm };
      const p = b.placement.position;
      const home = manifest.tiles.find((t) => p.x >= t.bounds.x[0] && p.x < t.bounds.x[1] && p.z >= t.bounds.z[0] && p.z < t.bounds.z[1])?.name;
      let n = 0;
      updaters.push((camPos) => {
        pb.update(camPos);
        if (n++ % 30) return;
        pb.group.visible = world.tiles.some((t) => t.name === home) || liteShown(scene, home);
      });
      log(`road tunnel ${name} (${b.info.road} under the ${b.info.line}): LODs ${b.lods.map((l) => Math.round(l.tris)).join(" / ")} triangles; warmed in ${Math.round(warm.ms)} ms${warm.err ? ` (${warm.err})` : ""}`);
      return pb;
    } catch (e) { log(`tunnel ${name}: ${e.message}`); return null; }
  }));
}
