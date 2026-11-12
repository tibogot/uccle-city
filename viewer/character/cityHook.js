// THIRD PERSON IN THE CITY (the "Third person" button, ?view=third): the Capsule Lab's character on the loaded
// tiles. Colliders per tile, built from what the viewer already has (no change to the shared tile worker):
//   terrain     a Heightfield over the loaded tiles' carved surface (hm.surface)
//   roads       one TriBVH per tile: the tile's road meshes (`<tile>-roads`: carriageway, raised sidewalks with their
//               kerb faces, verges, plazas) + the tram platforms (25 cm islands): the kerbs are real steps
//   buildings   UrbIS footprints (buildings.json, courtyards as holes), base to top
//   shelters    bus / tram shelters as their own triangles (back glass, side panel, posts, roof, bench) in the BVH:
//               the front is open, you walk in under the roof
//   props       one oriented box per instance, ALSO for the camera: parked cars
//   posts       blocking the body only (the camera's rays pass): LiDAR tree trunks, lamp posts, tram poles, stop
//               poles, signals, benches, bike racks, and bollards (any InstancedMesh named *bollard*, e.g. the roads
//               branch's UrbIS bollards, is picked up when it exists)
// The BVH build, the buildings.json parse and the prism hashing run in viewer/character/colliderWorker.js (a module
// worker of its own); the main thread only gathers the triangle positions and the instance boxes (a few ms), so
// streaming a tile in does not hitch. Tiles streamed in / out are picked up once a second.
// Keys: Esc back to the orbit view, G debug draw. ?char=hoodie|casual|capsule (default hoodie), ?chardebug=1.
import * as THREE from "three/webgpu";
import { ThirdPerson, CollisionWorld, Heightfield, TriBVH, PrismSet } from "./index.js";
import { lampSites } from "../lamps.js";

const DATA = new URL("../../data/tiles/", import.meta.url);
// instanced props by mesh name: "mesh" = its real triangles into the BVH (open shapes), "prop" = a box for body +
// camera, "post" = body only (circle if thin), "pole" = a circle at the instance origin (its geometry has an arm over
// the street)
const KIND = (m) => {
  const n = m.name || "", parent = m.parent?.name || "";
  if (/bollard/i.test(n)) return "post";
  if (n === "furniture-shelter" || (parent === "tram" && !n)) return "mesh";
  if (n === "parked-cars") return "prop";
  if (n === "tram-poles" || n === "rail-masts") return "pole";
  if (/^furniture-(bench|stopPole|signal|bikes)$/.test(n)) return "post";
  return null;
};

let shared = null;
/**
 * THE CITY'S COLLISION WORLD for the body on foot: one per page, shared by walk mode (first person) and third person
 * (docs/collisions/README.md: until 2026-11-13 walk mode had no collision at all). Tiles streamed in / out are picked up
 * once a second; every landmark / bridge adds its LOD0 triangles (viewer/heroColliders.js), and the UrbIS solids they
 * replace (world.hide) are left out of the footprint prisms.
 */
export function cityCollision({ scene, world, log = console.log }) {
  return (shared ??= buildCityCollision({ scene, world, log }));
}

async function buildCityCollision({ scene, world, log }) {
  const manifest = await (await fetch(new URL("manifest.json", DATA))).json();
  const cw = new CollisionWorld();
  const tiles = world.tiles;
  const heroes = new Map();                          // landmark / bridge name -> its TriBVH (in cw)
  const heightAt = (x, z) => {                       // allocation-free tile lookup
    // the road bridge's deck until its own triangles are in (then the terrain under it is the cutting, as drawn)
    if (world.decks?.length && !heroes.has("bridge-verrewinkel")) { const d = world.deckY(x, z); if (d != null) return d; }
    for (let i = 0; i < tiles.length; i++) { const b = tiles[i].bounds; if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return tiles[i].hm.surface(x, z); }
    return tiles[0].hm.surface(x, z);
  };
  cw.add(new Heightfield(heightAt));
  const built = new Map();                           // tile name -> { sets: [...], tile } (or "pending")
  const worker = new Worker(new URL("./colliderWorker.js", import.meta.url), { type: "module" });
  const pending = new Map();
  let reqId = 0;
  worker.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data); };

  /** Main thread: triangle positions of the tile's walkable meshes + the instance boxes, in slices of <= 4 ms. */
  async function gather(t) {
    let slice = performance.now(), busy = 0;
    const breathe = async () => { const now = performance.now(); if (now - slice > 4) { busy += now - slice; await new Promise((r) => requestAnimationFrame(r)); slice = performance.now(); } };
    const meshes = [];
    let n = 0;
    const take = (o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry?.attributes?.position) { meshes.push(o); n += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; } };
    const roads = scene.getObjectByName(`${t.name}-roads`), feats = scene.getObjectByName(`${t.name}-features`);
    roads?.updateMatrixWorld(true); feats?.updateMatrixWorld(true);
    roads?.traverse(take);
    feats?.traverse((o) => { if (/^tram-platform/.test(o.name)) take(o); });
    // instanced open shapes (shelters): every instance's triangles
    const meshInst = [];
    feats?.traverse((o) => { if (o.isInstancedMesh && KIND(o) === "mesh") { meshInst.push(o); n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) * o.count; } });
    const positions = new Float32Array(n * 3);
    let k = 0;
    for (const m of meshes) {
      await breathe();
      const P = m.geometry.attributes.position.array, I = m.geometry.index?.array, e = m.matrixWorld.elements, cnt = I ? I.length : P.length / 3;
      for (let i = 0; i < cnt; i++) {
        const v = (I ? I[i] : i) * 3, x = P[v], y = P[v + 1], z = P[v + 2];
        positions[k++] = e[0] * x + e[4] * y + e[8] * z + e[12]; positions[k++] = e[1] * x + e[5] * y + e[9] * z + e[13]; positions[k++] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
    }
    {
      const IM = new THREE.Matrix4(), IW = new THREE.Matrix4();
      for (const m of meshInst) {
        await breathe();
        const P = m.geometry.attributes.position.array, I = m.geometry.index?.array, cnt = I ? I.length : P.length / 3;
        for (let j = 0; j < m.count; j++) {
          m.getMatrixAt(j, IM); IW.multiplyMatrices(m.matrixWorld, IM);
          const e = IW.elements;
          for (let i = 0; i < cnt; i++) {
            const v = (I ? I[i] : i) * 3, x = P[v], y = P[v + 1], z = P[v + 2];
            positions[k++] = e[0] * x + e[4] * y + e[8] * z + e[12]; positions[k++] = e[1] * x + e[5] * y + e[9] * z + e[13]; positions[k++] = e[2] * x + e[6] * y + e[10] * z + e[14];
          }
        }
      }
    }
    // instances -> oriented boxes (the 4 bottom corners of the geometry's box, transformed) or circles
    const props = { polys: [], circles: [] }, posts = { polys: [], circles: [] };
    const M = new THREE.Matrix4(), W = new THREE.Matrix4(), v = new THREE.Vector3(), o = new THREE.Vector3();
    const inTile = (x, z) => x >= t.bounds.x0 && x <= t.bounds.x1 && z >= t.bounds.z0 && z <= t.bounds.z1;
    const inst = [];
    feats?.traverse((m) => { const kd = m.isInstancedMesh && KIND(m); if (kd && kd !== "mesh") inst.push(m); });
    for (const m of inst) {
      await breathe();
      const kind = KIND(m);
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      for (let i = 0; i < m.count; i++) {
        m.getMatrixAt(i, M); W.multiplyMatrices(m.matrixWorld, M);
        o.set(0, 0, 0).applyMatrix4(W);
        if (!inTile(o.x, o.z)) continue;
        if (kind === "pole") { posts.circles.push({ x: o.x, z: o.z, r: 0.14, base: o.y - 2, top: o.y + 6 }); continue; }
        const ring = [];
        let y0 = Infinity, y1 = -Infinity;
        for (const [cx, cz] of [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.max.x, bb.max.z], [bb.min.x, bb.max.z]]) {
          v.set(cx, bb.min.y, cz).applyMatrix4(W); ring.push([v.x, v.z]); y0 = Math.min(y0, v.y);
          v.set(cx, bb.max.y, cz).applyMatrix4(W); y1 = Math.max(y1, v.y);
        }
        const sx = Math.hypot(ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]), sz = Math.hypot(ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]);
        const into = kind === "prop" ? props : posts;
        if (Math.max(sx, sz) < 0.3) into.circles.push({ x: o.x, z: o.z, r: Math.max(0.06, Math.max(sx, sz) / 2), base: y0 - 0.5, top: y1 });
        else into.polys.push({ rings: [ring], base: y0 - 0.5, top: y1, id: `${m.name || "tram-shelter"}#${i}` });
      }
    }
    await breathe();
    for (const tr of t.feats?.trees || []) {
      const x = tr.x ?? tr[0], z = tr.z ?? tr[1];
      if (!inTile(x, z)) continue;
      const g = t.hm.surface(x, z);
      posts.circles.push({ x, z, r: Math.min(0.4, Math.max(0.18, 0.12 + 0.01 * (tr.height || 10))), base: g - 2, top: g + 6 });
    }
    // the lamps where the city DRAWS them (moved onto the measured sidewalk: main.js tile.drawn), not where lampSites
    // first puts them (invisible posts, docs/CITY_TREES.md §3)
    for (const l of t.drawn?.lamps ?? lampSites(t.roads, t.bounds)) { const g = t.hm.surface(l.x, l.z); posts.circles.push({ x: l.x, z: l.z, r: 0.12, base: g - 2, top: g + 6 }); }
    busy += performance.now() - slice;
    return { positions, props, posts, busy };
  }

  async function buildTile(t) {
    built.set(t.name, "pending");
    const g = await gather(t);
    const mainMs = g.busy;
    const entry = manifest.tiles.find((m) => m.name === t.name);
    const id = ++reqId;
    const r = await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, positions: g.positions, buildingsUrl: new URL(entry.files.buildings, DATA).href, props: g.props, posts: g.posts, hide: world.hide || [] }, [g.positions.buffer]);
    }).catch((e) => { log(`third person: tile ${t.name} colliders failed: ${e.message}`); return null; });
    if (!r || !tiles.includes(t)) { built.delete(t.name); return; }        // failed / unloaded meanwhile
    const bvh = TriBVH.fromData(r.bvh); bvh.tag = 3;
    const buildings = PrismSet.fromData(r.buildings);
    const props = PrismSet.fromData(r.props); props.tag = 4;
    const posts = PrismSet.fromData(r.posts); posts.tag = 5; posts.ray = false;
    const sets = [bvh, buildings, props, posts];
    for (const s of sets) cw.add(s);
    built.set(t.name, { sets, tile: t });
    log(`third person: tile ${t.name} colliders: ${r.counts.tris} road + platform + shelter triangles, ${r.counts.buildings} footprints, ${r.counts.props} parked cars, ${r.counts.posts} posts; main thread ${mainMs.toFixed(1)} ms in slices of <= 4 ms, worker BVH ${r.ms.bvh} ms + prisms ${r.ms.prisms} ms`);
  }
  async function sync() {
    for (const t of tiles) if (!built.has(t.name)) await buildTile(t);
    for (const [name, s] of built) if (s !== "pending" && !tiles.includes(s.tile)) { for (const x of s.sets) cw.remove(x); built.delete(name); }
  }
  await sync();
  setInterval(sync, 1000);
  // the landmarks' and bridges' own triangles (built in the collider worker, no hitch)
  const addHero = async (name, tris) => {
    if (heroes.has(name)) return;
    heroes.set(name, null);
    const id = ++reqId;
    const r = await new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ id, positions: tris.slice(), only: "bvh" }); })
      .catch((e) => { log(`collisions: ${name} triangles failed: ${e.message}`); return null; });
    if (!r) { heroes.delete(name); return; }
    const bvh = TriBVH.fromData(r.bvh); bvh.tag = 6;
    cw.add(bvh); heroes.set(name, bvh);
    log(`collisions on foot: ${name} by its LOD0, ${r.bvh.count} triangles (worker BVH ${r.ms.bvh} ms)`);
  };
  for (let i = 0; i < 100 && !window.__heroCols; i++) await new Promise((r) => setTimeout(r, 100));
  window.__heroCols?.onTriangles((name, tris) => addHero(name, tris));
  /** Are the tile's colliders in, and every landmark / bridge whose car colliders are built (heroColliders.js) in too? */
  const ready = (name) => { const b = built.get(name); if (!b || b === "pending") return false; for (const n of window.__heroCols?.done.keys() ?? []) if (!heroes.get(n)) return false; return true; };
  return { cw, sync, heroes, heightAt, ready };
}

export async function startThirdPerson({ scene, camera, renderer, controls, world, start, setView, log = console.log }) {
  const qp = new URLSearchParams(location.search);
  const { cw } = await cityCollision({ scene, world, log });
  const heightAt = (x, z) => world.walkY(x, z);

  const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world: cw });
  const near0 = camera.near;
  const hud = document.createElement("div");
  Object.assign(hud.style, { position: "fixed", left: "50%", bottom: "14px", transform: "translateX(-50%)", padding: "6px 12px", borderRadius: "8px",
    background: "rgba(20,24,30,.72)", color: "#e6e9ee", font: "12px/1.35 ui-monospace, monospace", zIndex: 2, pointerEvents: "none", whiteSpace: "pre", display: "none" });
  document.body.append(hud);
  const place = (x, z, yaw) => {
    const top = heightAt(x, z) + 40, t = cw.ray(x, top, z, 0, -1, 0, 80);
    tp.start(x, (t < Infinity ? top - t : heightAt(x, z)) + 0.05, z, yaw);
  };
  const api = {
    tp, world: cw, on: false, character: "capsule",
    /** (Re)start: at the last place the character stood, else at the start point. */
    resume() {
      if (api.on) return;
      api.on = true;
      camera.near = 0.1; camera.updateProjectionMatrix();           // the camera may come within 30 cm of a wall
      controls.enabled = false;
      if (api.last) tp.start(api.last[0], api.last[1] + 0.05, api.last[2], api.last[3]);
      else place(start?.x ?? controls.target.x, start?.z ?? controls.target.z, start?.yaw != null ? start.yaw + Math.PI : 0);
      hud.style.display = "";
    },
    update(dt) {
      if (!api.on) return;
      tp.update(dt);
      controls.target.set(tp.x, tp.y + 1, tp.z);               // the viewer streams tiles and aims the shadows round it
      if ((api._n = (api._n || 0) + 1) % 10 === 0) {
        const c = tp.ctl, P = tp.perf;
        hud.textContent = `WASD move · Shift run · Space jump · drag orbit · wheel zoom · G debug · Esc exit\n` +
          `${c.grounded ? "ground" : "air"} ${Math.hypot(c.vel[0], c.vel[2]).toFixed(1)} m/s · character CPU ${P.ms.toFixed(3)} ms (anim + foot IK ${P.animMs.toFixed(3)}) · ${cw.sources.length} collider sets`;
      }
    },
    stop() {
      if (!api.on) return;
      api.on = false;
      api.last = [tp.ctl.pos[0], tp.ctl.pos[1], tp.ctl.pos[2], tp.ctl.yaw];
      tp.stop(); hud.style.display = "none";
      camera.near = near0; camera.updateProjectionMatrix();
      controls.enabled = true;
    },
  };
  tp.input.onKey = (code) => {
    if (code === "Escape") { api.stop(); setView?.("stjob"); }
    else if (code === "KeyG") tp.debug.visible = !tp.debug.visible;
  };
  tp.debug.visible = qp.get("chardebug") === "1";
  api.resume();
  // the character (compiled before it replaces the capsule)
  const want = qp.get("char") || "hoodie";
  if (want !== "capsule") tp.useCharacter(want, renderer).then((info) => { api.character = want; log(`third person: ${info.label}, ${info.tris} triangles, one material; clips ${JSON.stringify(info.clips)}; authored walk ${info.walk} / run ${info.run} m/s; foot IK on`); })
    .catch((e) => log(`third person: character ${want} failed (${e.message}), the capsule stays`));
  window.__third = api;
  return api;
}
