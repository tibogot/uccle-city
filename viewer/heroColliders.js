// COLLIDERS FROM WHAT THE LANDMARKS DRAW (docs/collisions/README.md; the owner: "anything that needs collision works
// as it should, nothing invisible blocks"). Every scripted model (the landmarks, the three hero bridges) collides by its
// own LOD0 geometry, not by the UrbIS footprint it replaced:
//   car        (drive mode)  the LOD0 triangles sampled every 12 cm, kept where they stand 0.30-1.30 m over the drive
//              surface under them (walls, piers, parapets, fences, steps, a yard's gate posts, the pond's coping), on a
//              0.25 m plan grid merged into rectangles: { rings, kind: wall } polygons for driver.addStatic. A deck, a
//              stair tread or a footbridge over the street is not in the band: the car drives on / under it.
//   character  (walk + third person, viewer/character)  the LOD0 triangles themselves in a TriBVH: steps are climbed,
//              railings and parapets stop you, decks and yards carry you, arches let you through.
// Built once per model, when every tile under it is loaded (the band needs the drive surface), in slices on the main
// thread (<= 6 ms each). The UrbIS solids a model replaces are left out of the tiles' colliders (tileData.js /
// colliderWorker.js), so nothing is doubled and no footprint corner blocks where the model has a recess or a porch.
import * as THREE from "three/webgpu";
import { KIND } from "./drive/colliders.js";
import { TUNNEL_ROOTS } from "./rail/tunnels.js";

export const HERO_ROOTS = ["stjob", "townhall", "stalle", "vanbuuren", "wolvendael", "police", "calevoet", "stpierre", "observatory", "augustin", "russian", "rosaire", "heros",
  "bridge-verrewinkel", "bridge-stjob", "bridge-calevoet",
  "bridge-ruestalle", "bridge-engeland", "bridge-engeland_chord", "bridge-bigarreaux", "bridge-kauwberg", "bridge-linkebeek",
  ...TUNNEL_ROOTS];                                   // the road tunnels (viewer/rail/tunnels.js)
const CELL = 0.25, STEP = 0.12, BAND = [0.30, 1.30];

/** Not a collider: cloth, foliage cards, glow / light cones, decals. */
const soft = (o) => /flag|fabric|leaves|leaf|foliage|light|glow|beam|decal/i.test(`${o.name} ${[].concat(o.material || [])[0]?.name || ""}`);

/** LOD0 of a root: its "<name>_lod0" / "-lod0" child (else the root). */
export const lod0 = (root) => root.children.find((c) => /[-_]lod0$/.test(c.name)) || root;

/** World-space triangle soup (9 floats each) of the root's LOD0 solid meshes. */
export function heroTriangles(root) {
  const l0 = lod0(root);
  root.updateMatrixWorld(true);
  let n = 0;
  const meshes = [];
  l0.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry?.attributes?.position && !soft(o)) { meshes.push(o); n += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; } });
  const out = new Float32Array(n * 3), v = new THREE.Vector3();
  let k = 0;
  for (const o of meshes) {
    const P = o.geometry.attributes.position, I = o.geometry.index, c = I ? I.count : P.count;
    for (let q = 0; q < c; q++) { v.fromBufferAttribute(P, I ? I.getX(q) : q).applyMatrix4(o.matrixWorld); out[k++] = v.x; out[k++] = v.y; out[k++] = v.z; }
  }
  return out;
}

/** Plan box of a triangle soup. */
function boxOf(T) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < T.length; i += 3) { const x = T[i], z = T[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  return { x0, z0, x1, z1 };
}

/**
 * Car blockers of a triangle soup: [{ rings: [[4 corners]], kind: KIND.wall }] (rectangles of 0.25 m cells merged
 * along rows, then rows of the same span merged). ground(x, z) = the drive surface. Async: yields every ~6 ms.
 */
export async function carBlockers(T, ground, opts = {}) {
  const it = blockerSteps(T, ground, opts);
  let r = it.next();
  while (!r.done) { await new Promise((ok) => setTimeout(ok, 0)); r = it.next(); }
  return r.value;
}
/** The same, at once (small soups: a bench, a shelter). */
export function carBlockersSync(T, ground, opts = {}) {
  const it = blockerSteps(T, ground, opts);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
function* blockerSteps(T, ground, { band = BAND, kind = KIND.wall } = {}) {
  const b = boxOf(T), x0 = b.x0 - 0.5, z0 = b.z0 - 0.5;
  const nx = Math.ceil((b.x1 + 0.5 - x0) / CELL), nz = Math.ceil((b.z1 + 0.5 - z0) / CELL);
  const grid = new Uint8Array(nx * nz);
  // the drive surface on a 0.5 m lattice over the box
  const gx = Math.ceil(nx / 2) + 1, gz = Math.ceil(nz / 2) + 1, G = new Float32Array(gx * gz);
  for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) G[k * gx + i] = ground(x0 + i * 0.5, z0 + k * 0.5);
  {                                    // the LOWEST surface within 1 m: a wall stops a car from its lower side
    const L = G.slice();
    for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
      let v = Infinity;
      for (let dk = -2; dk <= 2; dk++) for (let di = -2; di <= 2; di++) { const ii = i + di, kk = k + dk; if (ii >= 0 && kk >= 0 && ii < gx && kk < gz) v = Math.min(v, L[kk * gx + ii]); }
      G[k * gx + i] = v;
    }
  }
  const gAt = (x, z) => G[Math.min(gz - 1, Math.max(0, Math.round((z - z0) / 0.5))) * gx + Math.min(gx - 1, Math.max(0, Math.round((x - x0) / 0.5)))];
  let slice = performance.now();
  for (let t = 0; t < T.length; t += 9) {
    if ((t & 0x3fff) === 0 && performance.now() - slice > 6) { yield; slice = performance.now(); }
    const ax = T[t], ay = T[t + 1], az = T[t + 2], bx = T[t + 3], by = T[t + 4], bz = T[t + 5], cx = T[t + 6], cy = T[t + 7], cz = T[t + 8];
    const g = gAt((ax + bx + cx) / 3, (az + bz + cz) / 3);
    if (Math.min(ay, by, cy) > g + band[1] + 1 || Math.max(ay, by, cy) < g + band[0] - 1) continue;
    const n1 = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / STEP)), n2 = Math.max(1, Math.ceil(Math.hypot(cx - ax, cy - ay, cz - az) / STEP));
    for (let i = 0; i <= n1; i++) for (let j = 0; j <= n2; j++) {
      let u = i / n1, w = j / n2;
      if (u + w > 1) { if (u + w > 1 + 1 / Math.max(n1, n2)) continue; const s = u + w; u /= s; w /= s; }
      const x = ax + (bx - ax) * u + (cx - ax) * w, y = ay + (by - ay) * u + (cy - ay) * w, z = az + (bz - az) * u + (cz - az) * w;
      const h = y - gAt(x, z);
      if (h < band[0] || h > band[1]) continue;
      const ci = Math.floor((x - x0) / CELL), ck = Math.floor((z - z0) / CELL);
      if (ci >= 0 && ck >= 0 && ci < nx && ck < nz) grid[ck * nx + ci] = 1;
    }
  }
  // rectangles: runs along x per row, then equal runs of consecutive rows merged
  const runs = new Map();          // "i0,i1" -> open rect { i0, i1, k0, k1 }
  const rects = [];
  for (let k = 0; k <= nz; k++) {
    const row = new Set();
    if (k < nz) for (let i = 0; i < nx; i++) {
      if (!grid[k * nx + i]) continue;
      let j = i; while (j + 1 < nx && grid[k * nx + j + 1]) j++;
      row.add(`${i},${j}`); i = j;
    }
    for (const [key, r] of runs) if (!row.has(key)) { rects.push(r); runs.delete(key); }
    for (const key of row) {
      const r = runs.get(key);
      if (r) r.k1 = k; else { const [i0, i1] = key.split(",").map(Number); runs.set(key, { i0, i1, k0: k, k1: k }); }
    }
  }
  return rects.map(({ i0, i1, k0, k1 }) => {
    const ax = x0 + i0 * CELL, bx = x0 + (i1 + 1) * CELL, az = z0 + k0 * CELL, bz = z0 + (k1 + 1) * CELL;
    return { rings: [[[ax, az], [bx, az], [bx, bz], [ax, bz]]], kind };
  });
}

/**
 * The manager: watches the scene for the landmark / bridge roots and builds their colliders once every tile under
 * them is loaded. ctx = { scene, world, manifest, driver, log }. hero.bvh (TriBVH triangle positions) is handed to
 * the character world through onTriangles(name, positions) listeners (viewer/character/cityHook.js).
 */
export function createHeroColliders({ scene, world, manifest, driver, log = () => {} }) {
  const done = new Map();          // name -> { tris, polys, tiles }
  const listeners = [];
  let busy = false;
  const tilesUnder = (root) => {
    const bb = new THREE.Box3().setFromObject(lod0(root));
    if (bb.isEmpty()) return null;
    return manifest.tiles.filter((t) => bb.max.x >= t.bounds.x[0] && bb.min.x < t.bounds.x[1] && bb.max.z >= t.bounds.z[0] && bb.min.z < t.bounds.z[1]).map((t) => t.name);
  };
  const api = {
    done,
    /** fn(name, positions Float32Array) for every built model, now and later */
    onTriangles(fn) { listeners.push(fn); for (const [n, d] of done) fn(n, d.tris); },
    async poll() {
      if (busy) return;
      busy = true;
      try {
        for (const name of HERO_ROOTS) {
          const prev = done.get(name);
          if (prev?.complete) continue;
          const root = scene.getObjectByName(name);
          if (!root) continue;
          let meshes = 0; lod0(root).traverse((o) => { if (o.isMesh) meshes++; });
          if (!meshes) continue;
          const tiles = tilesUnder(root);
          // built as soon as one tile under it is in (the drive surface of the others falls back to that tile), built
          // again once all of them are
          const inN = tiles?.filter((n) => world.tiles.some((t) => t.name === n)).length || 0;
          if (!inN || (prev && inN < tiles.length)) continue;
          const t0 = performance.now();
          const tris = prev?.tris ?? heroTriangles(root);
          const polys = await carBlockers(tris, driver.ground);
          if (prev?.set) driver.removeStatic(prev.set);
          const set = driver.addStatic(polys);
          done.set(name, { tris, polys, tiles, set, complete: inN === tiles.length });
          if (!prev) for (const fn of listeners) fn(name, tris);
          log(`colliders from ${name}'s LOD0: ${tris.length / 9} triangles (walk / third person), ${polys.length} car blocks${inN < tiles.length ? ` (${inN}/${tiles.length} tiles in)` : ""}; ${(performance.now() - t0).toFixed(0)} ms in slices`);
        }
      } finally { busy = false; }
    },
  };
  setInterval(() => api.poll(), 2000);
  return api;
}
