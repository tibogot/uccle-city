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
import { ART_ROOTS } from "./publicart/artRoots.js";
import { sliced } from "./slices.js";

export const HERO_ROOTS = ["stjob", "townhall", "stalle", "vanbuuren", "wolvendael", "police", "calevoet", "papenkasteel", "stpierre", "observatory", "augustin", "russian", "rosaire", "sacrecoeur", "saintmarc", "latourdefrein", "heros",
  "bridge-verrewinkel", "bridge-stjob", "bridge-calevoet",
  "bridge-ruestalle", "bridge-engeland", "bridge-engeland_chord", "bridge-bigarreaux", "bridge-kauwberg", "bridge-linkebeek",
  ...TUNNEL_ROOTS, ...ART_ROOTS];                                   // the road tunnels (viewer/rail/tunnels.js), the public art (viewer/publicart/)
const CELL = 0.25, STEP = 0.12, BAND = [0.30, 1.30];
const SLICE_OLD = new URLSearchParams(location.search).get("heroslice") === "old";
const BAND_OLD = new URLSearchParams(location.search).get("colband") === "old";
/** falcon2 (docs/perf/FALCON_STUTTER.md round 2, rule 22; ?heropoll=old: as before): the 2 s poll was one 37-66 ms task
 *  when a landmark's tiles came in: a scene.getObjectByName walk of the WHOLE scene per root name (~40 a poll, every
 *  2 s), a Box3 of the LOD0 per root per poll, the LOD0's world triangles in one go (heroTriangles: every vertex through
 *  its matrix) and the car blockers' 6 ms slices. Now: one scene walk a poll for the roots not found yet (found roots,
 *  their meshes and tiles cached), the triangles in <= POLL_MS slices, the blockers yield after POLL_MS. */
export const HERO_POLL = new URLSearchParams(location.search).get("heropoll") !== "old";
export const POLL_MS = 3;

// (falcon2: the LOD0 triangle soup moved to viewer/heroTris.js, a generator: sliced while playing, node-testable)
export { soft, lod0, heroTriangles, heroTrianglesGen } from "./heroTris.js";
import { lod0, heroTriangles, heroTrianglesGen } from "./heroTris.js";

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
  let slice = performance.now(), nTri = 0;
  for (let t = 0; t < T.length; t += 9) {
    // (perf audit 2026-11-14: was `(t & 0x3fff) === 0` with t stepping by 9 = a time check every 16,384 triangles: one
    // landmark slice ran 90-120 ms. Now every 64 triangles; ?heroslice=old: as before)
    if ((SLICE_OLD ? (t & 0x3fff) === 0 : (++nTri & 63) === 0) && performance.now() - slice > (HERO_POLL ? POLL_MS : 6)) { yield; slice = performance.now(); }
    const ax = T[t], ay = T[t + 1], az = T[t + 2], bx = T[t + 3], by = T[t + 4], bz = T[t + 5], cx = T[t + 6], cy = T[t + 7], cz = T[t + 8];
    const g = gAt((ax + bx + cx) / 3, (az + bz + cz) / 3);
    if (Math.min(ay, by, cy) > g + band[1] + 1 || Math.max(ay, by, cy) < g + band[0] - 1) continue;
    const n1 = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / STEP)), n2 = Math.max(1, Math.ceil(Math.hypot(cx - ax, cy - ay, cz - az) / STEP));
    const sample = (i, j) => {
      let u = i / n1, w = j / n2;
      if (u + w > 1) { if (u + w > 1 + 1 / Math.max(n1, n2)) return; const s = u + w; u /= s; w /= s; }
      const x = ax + (bx - ax) * u + (cx - ax) * w, y = ay + (by - ay) * u + (cy - ay) * w, z = az + (bz - az) * u + (cz - az) * w;
      const h = y - gAt(x, z);
      if (h < band[0] || h > band[1]) return;
      const ci = Math.floor((x - x0) / CELL), ck = Math.floor((z - z0) / CELL);
      if (ci >= 0 && ck >= 0 && ci < nx && ck < nz) grid[ck * nx + ci] = 1;
    };
    if (BAND_OLD) { for (let i = 0; i <= n1; i++) for (let j = 0; j <= n2; j++) sample(i, j); continue; }
    // boot3 (docs/BOOT.md section 5; ?colband=old = every sample, as before): only the rows of j whose height can be in the
    // band over the surface's min / max under the triangle (the same samples kept: viewer/drive/colliders.js buildingBlocks)
    let gLo = Infinity, gHi = -Infinity;
    const li0 = Math.max(0, Math.round((Math.min(ax, bx, cx) - x0) / 0.5) - 1), li1 = Math.min(gx - 1, Math.round((Math.max(ax, bx, cx) - x0) / 0.5) + 1);
    const lk0 = Math.max(0, Math.round((Math.min(az, bz, cz) - z0) / 0.5) - 1), lk1 = Math.min(gz - 1, Math.round((Math.max(az, bz, cz) - z0) / 0.5) + 1);
    for (let k = lk0; k <= lk1; k++) for (let i = li0; i <= li1; i++) { const v = G[k * gx + i]; if (v < gLo) gLo = v; if (v > gHi) gHi = v; }
    const yLo = gLo + band[0] - 1e-4, yHi = gHi + band[1] + 1e-4, dY = cy - ay;
    for (let i = 0; i <= n1; i++) {
      const u = i / n1, yU = ay + (by - ay) * u;
      let ja = 0, jb = n2;
      if (Math.abs(dY) < 1e-9) { if (yU < yLo - 1e-3 || yU > yHi + 1e-3) { ja = 1; jb = 0; } }
      else { const p = (yLo - yU) * n2 / dY, q = (yHi - yU) * n2 / dY; ja = Math.max(0, Math.floor(Math.min(p, q)) - 1); jb = Math.min(n2, Math.ceil(Math.max(p, q)) + 1); }
      for (let j = ja; j <= jb; j++) sample(i, j);
      for (let j = Math.max(jb + 1, Math.floor((1 - u) * n2)); j <= n2; j++) if (u + j / n2 > 1) sample(i, j);
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
  // (HERO_POLL) the roots by name: one scene walk a poll, only while some are not found or have left the scene
  const roots = new Map(), info = new WeakMap();
  const attached = (o) => { for (let k = 0; o && k < 64; k++, o = o.parent) if (o === scene) return true; return false; };
  const findRoots = () => {
    for (const [n, r] of roots) if (!attached(r)) roots.delete(n);
    const want = new Set(HERO_ROOTS.filter((n) => !roots.has(n) && !done.get(n)?.complete));
    if (!want.size) return;
    scene.traverse((o) => { if (want.has(o.name) && !roots.has(o.name)) roots.set(o.name, o); });
  };
  // its LOD0's mesh count and the tiles under it, once it has meshes (a landmark's LOD0 does not move or change)
  const rootInfo = (root) => {
    let c = info.get(root);
    const l0 = lod0(root);
    if (c && c.l0 === l0 && c.kids === l0.children.length) return c;
    let meshes = 0; l0.traverse((o) => { if (o.isMesh) meshes++; });
    c = { l0, kids: l0.children.length, meshes, tiles: meshes ? tilesUnder(root) : null };
    if (meshes) info.set(root, c);
    return c;
  };
  const api = {
    done,
    /** fn(name, positions Float32Array) for every built model, now and later */
    onTriangles(fn) { listeners.push(fn); for (const [n, d] of done) fn(n, d.tris); },
    async poll() {
      if (busy) return;
      busy = true;
      try {
        if (HERO_POLL) findRoots();
        for (const name of HERO_ROOTS) {
          const prev = done.get(name);
          if (prev?.complete) continue;
          const root = HERO_POLL ? roots.get(name) : scene.getObjectByName(name);
          if (!root) continue;
          const c = HERO_POLL ? rootInfo(root) : null;
          let meshes = 0;
          if (c) meshes = c.meshes; else lod0(root).traverse((o) => { if (o.isMesh) meshes++; });
          if (!meshes) continue;
          const tiles = c ? c.tiles : tilesUnder(root);
          // built as soon as one tile under it is in (the drive surface of the others falls back to that tile), built
          // again once all of them are
          const inN = tiles?.filter((n) => world.tiles.some((t) => t.name === n)).length || 0;
          if (!inN || (prev && inN < tiles.length)) continue;
          const t0 = performance.now();
          const tris = prev?.tris ?? (HERO_POLL ? await sliced(heroTrianglesGen(root), POLL_MS) : heroTriangles(root));
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
