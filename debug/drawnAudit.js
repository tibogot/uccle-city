// DRAWN vs COLLIDER AUDIT (collisions round 2, docs/COLLISIONS.md): an INDEPENDENT check of the car colliders against
// what the city really draws. collisionTest.js takes the kits' never-drawn stand-in meshes as its truth (the same
// meshes the colliders are made from), so a kit whose stand-ins and drawn pools disagree is invisible to it. Here the
// truth is what the DRAW side holds:
//   - every streamed kit (viewer/instanceStream.js Streamer: furniture2, stops, street kit, gardens, street life + shops;
//     the city-wide tree pool): each tile's SOURCE instances (the pools draw these when the camera is near) with the
//     piece's LOD0 geometry box; the roof kit is skipped (over the band)
//   - the features group's drawn instanced meshes (tram poles, rail masts, signals...: visible ones only)
//   - the parked cars the fleet draws (carFleet: not hidden), the placed lamps / bollards (tile.drawn)
//   - the moving traffic: the sim's boxes (T.boxesNear) against the cars the traffic fleet drew this frame
// For each piece: is it solid for the car (its box crosses 0.30-1.30 m over the drive surface)? Then:
//   missing  a solid drawn piece with no car collider overlapping it (the car passes through)
//   ghost    a car collider (furniture / tree / lamp / post / car kinds) with no drawn piece within 0.5 m
//   const A = await import("/debug/drawnAudit.js"); const r = A.audit(["I6", "H5"]);   // r.tables, r.items
import * as THREE from "three/webgpu";
import { KIND, gather } from "../viewer/drive/colliders.js";
import { carFleet } from "../viewer/carFleet.js";

const KIND_NAME = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k]));
const BAND = [0.30, 1.30];
const M = new THREE.Matrix4(), W = new THREE.Matrix4(), v = new THREE.Vector3();
const box = new THREE.Box3();

function boxOf(geo) { if (!geo) return null; if (!geo.boundingBox) geo.computeBoundingBox(); return geo.boundingBox; }

/** the instance's world AABB (x0 z0 x1 z1 y0 y1) from a column-major matrix array at offset o, geometry box gb */
function instBox(e, o, gb) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < 8; k++) {
    const lx = k & 1 ? gb.max.x : gb.min.x, ly = k & 2 ? gb.max.y : gb.min.y, lz = k & 4 ? gb.max.z : gb.min.z;
    const x = e[o] * lx + e[o + 4] * ly + e[o + 8] * lz + e[o + 12];
    const y = e[o + 1] * lx + e[o + 5] * ly + e[o + 9] * lz + e[o + 13];
    const z = e[o + 2] * lx + e[o + 6] * ly + e[o + 10] * lz + e[o + 14];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, z0, x1, z1, y0, y1];
}

/** everything drawn in bounds b: [{ src, x0, z0, x1, z1, y0, y1, cx, cz }] */
export function drawnItems(b, tile) {
  const out = [];
  const inB = (x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  const push = (src, bb) => { const cx = (bb[0] + bb[2]) / 2, cz = (bb[1] + bb[3]) / 2; if (inB(cx, cz)) out.push({ src, x0: bb[0], z0: bb[1], x1: bb[2], z1: bb[3], y0: bb[4], y1: bb[5], cx, cz }); };
  for (const S of globalThis.__streamers || []) {
    if (S.name === "roofs") continue;
    for (const p of S.pools) {
      const m0 = p.meshes[0];
      let gb = boxOf(m0?.mesh?.geometry);
      const trees = S.name === "trees";
      if (trees) gb = new THREE.Box3(new THREE.Vector3(-0.22, 0, -0.22), new THREE.Vector3(0.22, 4, 0.22));   // the trunk
      if (!gb) continue;
      for (const t of S.tiles.values()) {
        if (!trees && t.name !== tile) continue;
        const src = t.srcs[p.key];
        if (!src?.n) continue;
        const e = src.cols.instanceMatrix ?? src.cols[0];
        if (!e) continue;
        for (let i = 0; i < src.n; i++) {
          if (trees) {           // (a tree's matrix scales the crown: only its foot)
            const x = e[i * 16 + 12], y = e[i * 16 + 13], z = e[i * 16 + 14];
            push(`tree`, [x - 0.22, z - 0.22, x + 0.22, z + 0.22, y, y + 4]);
          } else push(`${S.name}:${p.key}`, instBox(e, i * 16, gb));
        }
      }
    }
  }
  // single merged meshes (a petrol station's LOD0 is ONE mesh: viewer/fuel/cityFuel.js): their triangles in 0.5 m cells
  const cells = (o, src) => {
    o.updateWorldMatrix(true, false);
    const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count, e = o.matrixWorld.elements, seen = new Set();
    const a = new Float64Array(9);
    for (let q = 0; q < n; q += 3) {
      for (let k = 0; k < 3; k++) { const i = I ? I.getX(q + k) : q + k, x = P.getX(i), y = P.getY(i), z = P.getZ(i); a[k * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; a[k * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; a[k * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
      for (let u = 0; u <= 1; u += 0.125) for (let w = 0; w + u <= 1; w += 0.125) {
        const x = a[0] + (a[3] - a[0]) * u + (a[6] - a[0]) * w, y = a[1] + (a[4] - a[1]) * u + (a[7] - a[1]) * w, z = a[2] + (a[5] - a[2]) * u + (a[8] - a[2]) * w;
        const key = `${Math.floor(x * 2)},${Math.floor(z * 2)},${Math.floor(y)}`;
        if (seen.has(key)) continue; seen.add(key);
        const cx = Math.floor(x * 2) / 2, cz = Math.floor(z * 2) / 2;
        push(src, [cx, cz, cx + 0.5, cz + 0.5, y, y]);
      }
    }
  };
  viewer.scene.getObjectByName(`fuel-${tile}`)?.traverse((o) => { if (o.isMesh && /^fuel-lod0-/.test(o.name)) cells(o, "fuel:lod0"); });
  const feats = viewer.scene.getObjectByName(`${tile}-features`);
  feats?.updateMatrixWorld(true);
  feats?.traverse((o) => {
    if (!o.isInstancedMesh || o.visible === false || !o.count || o.name === "parked-cars" || o.name === "rail-sleepers") return;   // (sleepers: under the rail top, ridden over)
    let hidden = false; for (let q = o.parent; q; q = q.parent) if (q.visible === false) hidden = true;
    if (hidden) return;
    const gb = boxOf(o.geometry); if (!gb) return;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); W.multiplyMatrices(o.matrixWorld, M); push(`features:${o.name || o.parent?.name || "?"}`, instBox(W.elements, 0, gb)); }
  });
  for (const r of carFleet.regs || []) if (r.live) for (const c of r.cars) {
    if (c.hidden) continue;
    const [w, h, l] = carFleet.sizeOf(c.type), s = Math.abs(Math.sin(c.heading)), k = Math.abs(Math.cos(c.heading));
    const hx = (w * k + l * s) / 2, hz = (w * s + l * k) / 2;
    push("parked-car", [c.x - hx, c.z - hz, c.x + hx, c.z + hz, c.y, c.y + h]);
  }
  const T = viewer.world.tiles.find((q) => q.name === tile);
  for (const l of T?.drawn?.lamps || []) push("lamp", [l.x - 0.12, l.z - 0.12, l.x + 0.12, l.z + 0.12, -1e4, 1e4]);
  for (const q of T?.drawn?.bollards || []) push("bollard", [q.x - 0.09, q.z - 0.09, q.x + 0.09, q.z + 0.09, -1e4, 1e4]);
  return out;
}

function hashItems(items, cell = 4) {
  const H = new Map(), key = (i, j) => i * 100003 + j;
  items.forEach((it, n) => {
    for (let i = Math.floor(it.x0 / cell); i <= Math.floor(it.x1 / cell); i++) for (let j = Math.floor(it.z0 / cell); j <= Math.floor(it.z1 / cell); j++) {
      const k = key(i, j); let a = H.get(k); if (!a) H.set(k, (a = [])); a.push(n);
    }
  });
  return { near(x0, z0, x1, z1, f) {
    const seen = new Set();
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) {
      for (const n of H.get(key(i, j)) || []) { if (seen.has(n)) continue; seen.add(n); if (f(items[n], n)) return true; }
    }
    return false;
  } };
}

/** audit one or more loaded tiles. Returns { tables: { missing: {src: n}, ghost: {kind: n}, solid: {src: n} }, items } */
export function audit(tiles = viewer.world.tiles.filter((t) => t.drive).map((t) => t.name), { maxItems = 60 } = {}) {
  const D = window.__driver, res = { tiles: [], missing: {}, ghost: {}, solid: {}, drawn: {}, items: [] };
  for (const name of tiles) {
    const T = viewer.world.tiles.find((q) => q.name === name);
    if (!T?.drive) { res.tiles.push({ tile: name, error: "not loaded" }); continue; }
    const b = T.bounds, col = T.drive.col, items = drawnItems(b, name), H = hashItems(items);
    const rec = { tile: name, drawn: items.length, solid: 0, missing: 0, ghost: 0 };
    const near = [];
    // drawn -> collider
    for (const it of items) {
      res.drawn[it.src] = (res.drawn[it.src] || 0) + 1;
      if (it.src === "lamp" || it.src === "bollard") continue;             // the same lists make their posts
      if (it.x1 - it.x0 < 0.03 && it.z1 - it.z0 < 0.03) continue;
      const g = D.ground(it.cx, it.cz);
      if (!(it.y1 > g + BAND[0] && it.y0 < g + BAND[1])) continue;        // over / under the car band
      rec.solid++; res.solid[it.src] = (res.solid[it.src] || 0) + 1;
      near.length = 0;
      const sets = D.sets(it.cx, it.cz, 6);
      for (const c of sets) gather(c, it.cx, it.cz, Math.max(it.x1 - it.x0, it.z1 - it.z0) / 2 + 0.3, near);
      let ok = false;
      for (let k = 0; k < near.length && !ok; k += 2) {
        const c = near[k], id = near[k + 1];
        if (id < c.P) { const q = id * 4; ok = c.pbox[q] <= it.x1 + 0.15 && c.pbox[q + 2] >= it.x0 - 0.15 && c.pbox[q + 1] <= it.z1 + 0.15 && c.pbox[q + 3] >= it.z0 - 0.15; }
        else { const q = (id - c.P) * 3, x = c.circ[q], z = c.circ[q + 1], r = c.circ[q + 2] + 0.15; ok = x + r >= it.x0 && x - r <= it.x1 && z + r >= it.z0 && z - r <= it.z1; }
      }
      if (!ok) { rec.missing++; res.missing[it.src] = (res.missing[it.src] || 0) + 1; if (res.items.length < maxItems) res.items.push({ k: "missing", tile: name, src: it.src, x: +it.cx.toFixed(1), z: +it.cz.toFixed(1), h: +(it.y1 - g).toFixed(2) }); }
    }
    // collider -> drawn (the kinds that stand for one drawn object)
    const check = (kind, x0, z0, x1, z1) => {
      if (kind === KIND.building || kind === KIND.island || kind === KIND.wall) return;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (cx < b.x0 || cx > b.x1 || cz < b.z0 || cz > b.z1) return;
      const ok = H.near(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, (it) => it.x0 <= x1 + 0.5 && it.x1 >= x0 - 0.5 && it.z0 <= z1 + 0.5 && it.z1 >= z0 - 0.5);
      if (!ok) { rec.ghost++; const kn = KIND_NAME[kind]; res.ghost[kn] = (res.ghost[kn] || 0) + 1; if (res.items.length < maxItems) res.items.push({ k: "ghost", tile: name, kind: kn, x: +cx.toFixed(1), z: +cz.toFixed(1), w: +Math.max(x1 - x0, z1 - z0).toFixed(2) }); }
    };
    for (let p = 0; p < col.P; p++) { if (col.pref?.[p]?.hidden) continue; const q = p * 4; check(col.pkind[p], col.pbox[q], col.pbox[q + 1], col.pbox[q + 2], col.pbox[q + 3]); }
    for (let c = 0; c < col.C; c++) { const x = col.circ[c * 3], z = col.circ[c * 3 + 1], r = col.circ[c * 3 + 2]; check(col.ckind[c], x - r, z - r, x + r, z + r); }
    res.tiles.push(rec);
  }
  return res;
}

/** the moving traffic: each box (T.boxesNear) within r of (x, z) against the cars the fleet
 *  drew: its distance to the nearest drawn car; `old` = the same at the sim's newest step (sim.x / sim.z, the boxes
 *  before collisions round 2). -> { boxes, drawn, maxNew, maxOld, over30cmNew, over30cmOld } */
export function trafficGhosts(x, z, r = 40) {
  const T = window.__traffic?.T || window.__traffic; if (!T?.sim) return null;
  const sim = T.sim, fleet = T.fleet, out = new Float32Array(64 * 7), n = T.boxesNear(x, z, r, out);
  const drawn = [];
  for (const b of fleet.all || []) { const m = b.mesh; if (!m.visible) continue; const e = m.instanceMatrix.array; for (let i = 0; i < m.count; i++) drawn.push([e[i * 16 + 12], e[i * 16 + 14]]); }
  const near = (bx, bz) => { let d = Infinity; for (const [qx, qz] of drawn) d = Math.min(d, Math.hypot(qx - bx, qz - bz)); return d; };
  let maxNew = 0, maxOld = 0, oN = 0, oO = 0, seen = 0;
  for (let k = 0; k < n; k++) {
    const bx = out[k * 7], bz = out[k * 7 + 1];
    let i = -1, bd = Infinity;
    for (let q = 0; q < sim.cap; q++) if (sim.alive[q]) { const d = Math.hypot(sim.px[q] - bx, sim.pz[q] - bz) + Math.hypot(sim.x[q] - bx, sim.z[q] - bz); if (d < bd) { bd = d; i = q; } }
    const dn = near(bx, bz), dO = i >= 0 ? near(sim.x[i], sim.z[i]) : dn;
    if (dn > 3) continue;                                                       // culled (off screen): not a ghost
    seen++; maxNew = Math.max(maxNew, dn); maxOld = Math.max(maxOld, dO); if (dn > 0.3) oN++; if (dO > 0.3) oO++;
  }
  return { boxes: n, seen, drawn: drawn.length, maxNew: +maxNew.toFixed(2), maxOld: +maxOld.toFixed(2), over30cmNew: oN, over30cmOld: oO };
}
