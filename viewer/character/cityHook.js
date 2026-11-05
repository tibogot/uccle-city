// THIRD-PERSON IN THE CITY (?view=third, a test hook): the Capsule Lab's character on the loaded tiles. Everything
// is built here, on the main thread, from what the viewer already has (no change to the tile worker):
//   terrain     Heightfield over the loaded tiles' carved surface (hm.surface)
//   roads       one TriBVH per tile from the tile's road meshes in the scene (`<tile>-roads`: carriageway, raised
//               sidewalks with their kerb faces, verges, plazas): the 15 cm kerbs are real steps for the controller
//   buildings   one PrismSet per tile: UrbIS footprints (buildings.json, courtyards as holes) from base to top, the
//               LiDAR trees' trunks and the lamp posts (viewer/lamps.js lampSites) as cylinders
// Tiles streamed in / out are picked up once a second. Esc: back to the orbit view. G: debug draw.
import { ThirdPerson, CollisionWorld, Heightfield, TriBVH, PrismSet } from "./index.js";
import { lampSites } from "../lamps.js";

const DATA = new URL("../../data/tiles/", import.meta.url);

export async function startThirdPerson({ scene, camera, renderer, controls, world, start, setView, log = console.log }) {
  const manifest = await (await fetch(new URL("manifest.json", DATA))).json();
  const cw = new CollisionWorld();
  const tiles = world.tiles;
  const heightAt = (x, z) => {                       // allocation-free tile lookup
    for (let i = 0; i < tiles.length; i++) { const b = tiles[i].bounds; if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return tiles[i].hm.surface(x, z); }
    return tiles[0].hm.surface(x, z);
  };
  cw.add(new Heightfield(heightAt));
  const built = new Map();                           // tile name -> { bvh, prisms } (or "pending")

  async function buildTile(t) {
    built.set(t.name, "pending");
    const t0 = performance.now();
    // roads: the tile's meshes, in world space
    const group = scene.getObjectByName(`${t.name}-roads`);
    const parts = [];
    let n = 0;
    group?.updateMatrixWorld(true);
    group?.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry?.attributes?.position) { parts.push(o); n += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; } });
    const pos = new Float32Array(n * 3);
    let k = 0;
    for (const m of parts) {
      const P = m.geometry.attributes.position.array, I = m.geometry.index?.array, e = m.matrixWorld.elements, cnt = I ? I.length : P.length / 3;
      for (let i = 0; i < cnt; i++) {
        const v = (I ? I[i] : i) * 3, x = P[v], y = P[v + 1], z = P[v + 2];
        pos[k++] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[k++] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[k++] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
    }
    const bvh = new TriBVH(pos); bvh.tag = 3;
    const t1 = performance.now();
    // buildings, trunks, lamp posts
    const entry = manifest.tiles.find((m) => m.name === t.name);
    const bDoc = await (await fetch(new URL(entry.files.buildings, DATA))).json();
    const polys = [];
    for (const b of bDoc.buildings) {
      const rings = (b.footprint || []).filter((r) => r.length >= 3);
      if (rings.length) polys.push({ rings, base: (+b.base || 0) - 3, top: +b.top || 1e4, id: b.attrs?.BU_ID || b.id });
    }
    const circles = [];
    for (const tr of t.feats?.trees || []) {
      const x = tr.x ?? tr[0], z = tr.z ?? tr[1];
      if (!(x >= t.bounds.x0 && x <= t.bounds.x1 && z >= t.bounds.z0 && z <= t.bounds.z1)) continue;
      const g = t.hm.surface(x, z);
      circles.push({ x, z, r: Math.min(0.4, Math.max(0.18, 0.12 + 0.01 * (tr.height || 10))), base: g - 2, top: g + 6 });
    }
    for (const l of lampSites(t.roads, t.bounds)) { const g = t.hm.surface(l.x, l.z); circles.push({ x: l.x, z: l.z, r: 0.12, base: g - 2, top: g + 6 }); }
    const prisms = new PrismSet(polys, circles);
    if (!tiles.includes(t)) { built.delete(t.name); return; }        // unloaded meanwhile
    cw.add(bvh); cw.add(prisms);
    built.set(t.name, { bvh, prisms, tile: t });
    log(`third person: tile ${t.name} colliders: ${bvh.count} road triangles (BVH ${(t1 - t0).toFixed(0)} ms), ${polys.length} footprints, ${circles.length} trunks / posts`);
  }
  async function sync() {
    for (const t of tiles) if (!built.has(t.name)) await buildTile(t);
    for (const [name, s] of built) if (s !== "pending" && !tiles.includes(s.tile)) { cw.remove(s.bvh); cw.remove(s.prisms); built.delete(name); }
  }
  await sync();
  const timer = setInterval(sync, 1000);

  const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world: cw });
  const near0 = camera.near;
  camera.near = 0.1; camera.updateProjectionMatrix();           // the camera may come within 30 cm of a wall
  const sx = start?.x ?? controls.target.x, sz = start?.z ?? controls.target.z;
  const top = heightAt(sx, sz) + 40, t = cw.ray(sx, top, sz, 0, -1, 0, 80);
  controls.enabled = false;
  tp.start(sx, (t < Infinity ? top - t : heightAt(sx, sz)) + 0.05, sz, start?.yaw != null ? start.yaw + Math.PI : 0);
  tp.debug.visible = /[?&]chardebug=1/.test(location.search);

  const hud = document.createElement("div");
  Object.assign(hud.style, { position: "fixed", left: "50%", bottom: "14px", transform: "translateX(-50%)", padding: "6px 12px", borderRadius: "8px",
    background: "rgba(20,24,30,.72)", color: "#e6e9ee", font: "12px/1.35 ui-monospace, monospace", zIndex: 2, pointerEvents: "none", whiteSpace: "pre" });
  document.body.append(hud);
  const api = {
    tp, world: cw, on: true,
    update(dt) {
      if (!api.on) return;
      tp.update(dt);
      controls.target.set(tp.x, tp.y + 1, tp.z);               // the viewer streams tiles and aims the shadows round it
      if ((api._n = (api._n || 0) + 1) % 10 === 0) {
        const c = tp.ctl, P = tp.perf;
        hud.textContent = `WASD move · Shift run · Space jump · drag orbit · wheel zoom · G debug · Esc exit\n` +
          `${c.grounded ? "ground" : "air"} ${Math.hypot(c.vel[0], c.vel[2]).toFixed(1)} m/s · character CPU ${P.ms.toFixed(3)} ms (max ${P.maxMs.toFixed(2)}) · ${cw.sources.length} collider sets`;
      }
    },
    stop() {
      api.on = false; tp.stop(); clearInterval(timer); hud.remove();
      camera.near = near0; camera.updateProjectionMatrix();
      controls.enabled = true;
    },
  };
  tp.input.onKey = (code) => {
    if (code === "Escape") { api.stop(); setView?.("stjob"); }
    else if (code === "KeyG") tp.debug.visible = !tp.debug.visible;
  };
  window.__third = api;
  return api;
}
