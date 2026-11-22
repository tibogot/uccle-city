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
// (allocrate, ?blockflat=old: a new sample() closure per triangle, the triangle's corners in a fresh scope each) one sample
// function for the whole walk, the corners in its outer variables: a landmark's tens of thousands of triangles made
// ~60 KB of garbage a frame of the falcon flight while their colliders were built (tools/perf/allocSample.mjs)
const BLOCK_FLAT = new URLSearchParams(location.search).get("blockflat") !== "old";
/** drivecheck (docs/DRIVECHECK.md, rule 27 provisional; ?heroground=old: as before): the car band (0.30-1.30 m over the
 *  drive surface) was measured from driveMode.ground, which answers with the surface layer NEAREST THE CAR (state.y): built
 *  in a poll while the car drove elsewhere, a car lower than ~73 m made the Verrewinkel bridge's band start on the
 *  railway cutting 7.5 m under its deck: the abutments' and piers' feet became car walls with no height (1e4 / -1e4),
 *  standing across Rue de Verrewinkel at both deck ends; and whatever the car's height, "the lowest surface within 1 m"
 *  near the deck's edges was that cutting: spandrels, slab and road surface in the band, walls on the deck (136 / 99 m of
 *  lanes blocked, tools/audit/driveCheck.mjs). Now the band is measured from the place's own layers
 *  (viewer/drive/surfaceLayers.js): one pass over the top surface (blocks carry base = their lowest sample: a car on a
 *  layer under them passes), one over the lower layer where there is one (top = their highest sample: a car on the deck
 *  over them passes); on a deck only the deck (blockerSteps deckAt). */
export const HERO_GROUND_OLD = new URLSearchParams(location.search).get("heroground") === "old";
/** falcon2 (docs/perf/FALCON_STUTTER.md round 2, rule 22; ?heropoll=old: as before): the 2 s poll was one 37-66 ms task
 *  when a landmark's tiles came in: a scene.getObjectByName walk of the WHOLE scene per root name (~40 a poll, every
 *  2 s), a Box3 of the LOD0 per root per poll, the LOD0's world triangles in one go (heroTriangles: every vertex through
 *  its matrix) and the car blockers' 6 ms slices. Now: one scene walk a poll for the roots not found yet (found roots,
 *  their meshes and tiles cached), the triangles in <= POLL_MS slices, the blockers yield after POLL_MS. */
export const HERO_POLL = new URLSearchParams(location.search).get("heropoll") !== "old";
export const POLL_MS = 3;
/** CLASS T (rule 39 + rule 25, docs/RAIL_T.md; ?rail=old: as before): a hero's car blockers exist exactly while the hero
 *  is DRAWN. They were built as soon as ONE tile under the model was in and kept for the session, while the model itself
 *  is hidden until its HOME tile is loaded (main.js: a bridge's group.visible follows its home tile; a landmark's root
 *  leaves the scene with its tile): the Stalle viaduct (home D5) collided from C5 with nothing drawn. Now the poll
 *  takes a built set out of the driver while its root is hidden / detached and puts it back when it shows again. */
export const HERO_SHOWN = new URLSearchParams(location.search).get("rail") !== "old";
/** the root and every parent visible, up to the scene */
export const shownIn = (o, scene) => { for (let k = 0; o && k < 64; k++, o = o.parent) { if (!o.visible) return false; if (o === scene) return true; } return false; };

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
/**
 * drivecheck: the blockers of a soup from the place's surface layers (no car in it). layers(x, z) -> { top, low }
 * (viewer/drive/surfaceLayers.js; low NaN where there is one layer). Async (yields like carBlockers).
 */
export async function layeredBlockers(T, layers, opts = {}) {
  const [top, low, deckAt] = layerFns(layers);
  const a = await carBlockers(T, top, { ...opts, heights: "top", deckAt });
  return a.concat(await carBlockers(T, low, { ...opts, heights: "low" }));
}
export function layeredBlockersSync(T, layers, opts = {}) {
  const [top, low, deckAt] = layerFns(layers);
  return carBlockersSync(T, top, { ...opts, heights: "top", deckAt }).concat(carBlockersSync(T, low, { ...opts, heights: "low" }));
}
/** top / low / deck of layers(x, z), the last point's answer kept (the lattice asks each point twice in a row) */
function layerFns(layers) {
  let lx = NaN, lz = NaN, l = null;
  const at = (x, z) => { if (x !== lx || z !== lz) { lx = x; lz = z; l = layers(x, z); } return l; };
  return [(x, z) => at(x, z).top, (x, z) => { const v = at(x, z).low; return Number.isFinite(v) ? v : Infinity; }, (x, z) => at(x, z).deck];
}
// heights: null = walls with no height (as before); "top" = base at the rect's lowest sample (a car on a layer under it
// passes, carEnv heightClear); "low" = top at the rect's highest sample (a car on a layer over it passes). A rect then
// merges only cells of one 0.5 m height step, so its span stays the wall's own.
// deckAt(x, z) -> true on a road deck: there the band is measured from the deck (and the street that joins it level),
// never from the cutting / ground beside or under it (drivecheck, rule 27).
function* blockerSteps(T, ground, { band = BAND, kind = KIND.wall, heights = null, deckAt = null } = {}) {
  const b = boxOf(T), x0 = b.x0 - 0.5, z0 = b.z0 - 0.5;
  const nx = Math.ceil((b.x1 + 0.5 - x0) / CELL), nz = Math.ceil((b.z1 + 0.5 - z0) / CELL);
  const grid = new Uint8Array(nx * nz);
  const lo = heights ? new Float32Array(nx * nz).fill(Infinity) : null, hi = heights ? new Float32Array(nx * nz).fill(-Infinity) : null;
  // the drive surface on a 0.5 m lattice over the box
  const gx = Math.ceil(nx / 2) + 1, gz = Math.ceil(nz / 2) + 1, G = new Float32Array(gx * gz);
  const DK = deckAt ? new Uint8Array(gx * gz) : null;
  const budget = HERO_POLL ? POLL_MS : 6;
  let slice = performance.now(), nTri = 0;
  for (let k = 0; k < gz; k++) {
    // (drivecheck: the lattice in slices too, a row at a time: a landmark's box is up to ~25k points, rule 22)
    if (heights && performance.now() - slice > budget) { yield; slice = performance.now(); }
    for (let i = 0; i < gx; i++) { const x = x0 + i * 0.5, z = z0 + k * 0.5; G[k * gx + i] = ground(x, z); if (DK) DK[k * gx + i] = deckAt(x, z) ? 1 : 0; }
  }
  if (DK) {                            // a lattice point at a deck's edge (a deck point 0.5 m away, > 1.5 m over it) takes
    const D0 = DK.slice(), G0 = G.slice();   // the deck: a sample of the edge (its parapet) rounds to it, not to the cutting
    for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
      const q0 = k * gx + i; if (D0[q0]) continue;
      let best = -Infinity;
      for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= gx || kk >= gz) continue;
        const q = kk * gx + ii; if (D0[q] && G0[q] > G0[q0] + 1.5 && G0[q] > best) best = G0[q];
      }
      if (best > -Infinity) { G[q0] = best; DK[q0] = 1; }
    }
  }
  {                                    // the LOWEST surface within 1 m: a wall stops a car from its lower side
    // (drivecheck: on a deck only surfaces within 0.1 m of it: the deck itself, the street that joins it level. The
    // lowest surface within 1 m of a deck's edge was the railway cutting 4-7 m under it (and the footbridge 0.3 m under
    // the road deck): the bridge's own brick spandrels, slab and road surface came into the band, car walls across Rue
    // de Verrewinkel on the Verrewinkel bridge)
    const L = G.slice();
    for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
      if (heights && i === 0 && performance.now() - slice > budget) { yield; slice = performance.now(); }
      let v = Infinity;
      const q0 = k * gx + i, on = DK && DK[q0], c0 = L[q0];
      for (let dk = -2; dk <= 2; dk++) for (let di = -2; di <= 2; di++) {
        const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= gx || kk >= gz) continue;
        const q = kk * gx + ii;
        if (on && L[q] < c0 - 0.1) continue;
        v = Math.min(v, L[q]);
      }
      G[q0] = v;
    }
  }
  const gAt = (x, z) => G[Math.min(gz - 1, Math.max(0, Math.round((z - z0) / 0.5))) * gx + Math.min(gx - 1, Math.max(0, Math.round((x - x0) / 0.5)))];
  let ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, cx = 0, cy = 0, cz = 0, n1 = 1, n2 = 1;
  const sampleT = (i, j) => {
      let u = i / n1, w = j / n2;
      if (u + w > 1) { if (u + w > 1 + 1 / Math.max(n1, n2)) return; const s = u + w; u /= s; w /= s; }
      const x = ax + (bx - ax) * u + (cx - ax) * w, y = ay + (by - ay) * u + (cy - ay) * w, z = az + (bz - az) * u + (cz - az) * w;
      const h = y - gAt(x, z);
      if (h < band[0] || h > band[1]) return;
      const ci = Math.floor((x - x0) / CELL), ck = Math.floor((z - z0) / CELL);
      if (ci >= 0 && ck >= 0 && ci < nx && ck < nz) { const q = ck * nx + ci; grid[q] = 1; if (lo) { if (y < lo[q]) lo[q] = y; if (y > hi[q]) hi[q] = y; } }
  };
  for (let t = 0; t < T.length; t += 9) {
    // (perf audit 2026-11-14: was `(t & 0x3fff) === 0` with t stepping by 9 = a time check every 16,384 triangles: one
    // landmark slice ran 90-120 ms. Now every 64 triangles; ?heroslice=old: as before)
    if ((SLICE_OLD ? (t & 0x3fff) === 0 : (++nTri & 63) === 0) && performance.now() - slice > (HERO_POLL ? POLL_MS : 6)) { yield; slice = performance.now(); }
    ax = T[t]; ay = T[t + 1]; az = T[t + 2]; bx = T[t + 3]; by = T[t + 4]; bz = T[t + 5]; cx = T[t + 6]; cy = T[t + 7]; cz = T[t + 8];
    const g = gAt((ax + bx + cx) / 3, (az + bz + cz) / 3);
    if (Math.min(ay, by, cy) > g + band[1] + 1 || Math.max(ay, by, cy) < g + band[0] - 1) continue;
    n1 = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / STEP)); n2 = Math.max(1, Math.ceil(Math.hypot(cx - ax, cy - ay, cz - az) / STEP));
    const sample = BLOCK_FLAT ? sampleT : (i, j) => {
      let u = i / n1, w = j / n2;
      if (u + w > 1) { if (u + w > 1 + 1 / Math.max(n1, n2)) return; const s = u + w; u /= s; w /= s; }
      const x = ax + (bx - ax) * u + (cx - ax) * w, y = ay + (by - ay) * u + (cy - ay) * w, z = az + (bz - az) * u + (cz - az) * w;
      const h = y - gAt(x, z);
      if (h < band[0] || h > band[1]) return;
      const ci = Math.floor((x - x0) / CELL), ck = Math.floor((z - z0) / CELL);
      if (ci >= 0 && ck >= 0 && ci < nx && ck < nz) { const q = ck * nx + ci; grid[q] = 1; if (lo) { if (y < lo[q]) lo[q] = y; if (y > hi[q]) hi[q] = y; } }
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
  const step = !heights ? null : heights === "low" ? (q) => Math.floor(hi[q] / 0.5) : (q) => Math.floor(lo[q] / 0.5);
  for (let k = 0; k <= nz; k++) {
    const row = new Set();
    if (k < nz) for (let i = 0; i < nx; i++) {
      if (!grid[k * nx + i]) continue;
      let j = i;
      if (step) { const s0 = step(k * nx + i); while (j + 1 < nx && grid[k * nx + j + 1] && step(k * nx + j + 1) === s0) j++; row.add(`${i},${j},${s0}`); }
      else { while (j + 1 < nx && grid[k * nx + j + 1]) j++; row.add(`${i},${j}`); }
      i = j;
    }
    for (const [key, r] of runs) if (!row.has(key)) { rects.push(r); runs.delete(key); }
    for (const key of row) {
      const r = runs.get(key);
      if (r) r.k1 = k; else { const [i0, i1] = key.split(",").map(Number); runs.set(key, { i0, i1, k0: k, k1: k }); }
    }
  }
  return rects.map(({ i0, i1, k0, k1 }) => {
    const ax = x0 + i0 * CELL, bx = x0 + (i1 + 1) * CELL, az = z0 + k0 * CELL, bz = z0 + (k1 + 1) * CELL;
    if (!heights) return { rings: [[[ax, az], [bx, az], [bx, bz], [ax, bz]]], kind };
    let l = Infinity, h = -Infinity;
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) { const q = k * nx + i; if (lo[q] < l) l = lo[q]; if (hi[q] > h) h = hi[q]; }
    return heights === "low" ? { rings: [[[ax, az], [bx, az], [bx, bz], [ax, bz]]], kind, top: h, base: -1e4 } : { rings: [[[ax, az], [bx, az], [bx, bz], [ax, bz]]], kind, top: 1e4, base: l };
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
        if (HERO_SHOWN) for (const [name, d] of done) {          // (rule 39) colliders only while drawn
          const root = HERO_POLL ? (roots.get(name) || d.root) : scene.getObjectByName(name);
          const shown = !!root && shownIn(root, scene);
          if (!shown && d.set) { driver.removeStatic(d.set); d.off = d.set; d.set = null; }      // (the built set kept: no rebuild)
          else if (shown && !d.set && d.polys) { if (d.off && driver.extra) { driver.extra.push(d.off); d.set = d.off; d.off = null; } else d.set = driver.addStatic(d.polys); }
        }
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
          const polys = !HERO_GROUND_OLD && driver.groundLayers ? await layeredBlockers(tris, driver.groundLayers) : await carBlockers(tris, driver.ground);
          if (prev?.set) driver.removeStatic(prev.set);
          const set = !HERO_SHOWN || shownIn(root, scene) ? driver.addStatic(polys) : null;
          done.set(name, { tris, polys, tiles, set, root, complete: inN === tiles.length });
          if (!prev) for (const fn of listeners) fn(name, tris);
          log(`colliders from ${name}'s LOD0: ${tris.length / 9} triangles (walk / third person), ${polys.length} car blocks${inN < tiles.length ? ` (${inN}/${tiles.length} tiles in)` : ""}; ${(performance.now() - t0).toFixed(0)} ms in slices`);
        }
      } finally { busy = false; }
    },
  };
  setInterval(() => api.poll(), 2000);
  return api;
}
