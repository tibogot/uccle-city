// CENSUS class B (claude/census 2026-11-18, owner playtest image 84: apartment-block balconies open at the sides,
// Chaussée d'Alsemberg). Report only (no fix, no gate row yet).
//
// Every balcony slab drawn in a tile's building detail mesh (viewer/tileData.js buildTileData -> d.buildings.details,
// the generator: viewer/facadeGeom.js typeDetails, the BLOCK type's "BALCONIES on every upper storey": a slab + a front
// parapet), found from the geometry, not from the generator's own stats:
//   slab     an up-facing face group 1.0-1.4 m deep (across) and >= 1.2 m long, standing out of a wall, with a parapet
//            (an up-facing strip <= 0.15 m deep) 0.8-1.3 m above it over its front edge
//   open     a slab end where a horizontal ray along the slab, 0.5 m over it and half-way out, meets NOTHING (detail,
//            wall, kit wall, roof) between 0.8 m beyond the end and 0.2 m inside it: no side panel, no neighbouring wall
// The façade kit's own balconies (viewer/facadeKit/placement.js "balcony" / "balconnet" pieces, Blender) are counted
// as info: they are separate instanced GLB pieces, not in this mesh.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/balconies.mjs [--all | T ...] [--out FILE] [--jobs N]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runTiles, cli, at, ROOT } from "./lib_street.mjs";
import { buildTile, Bvh, concatSoups, footprintIndex, streetAt, allBuiltTiles } from "./lib_mesh.mjs";

const c = cli();
const { CHILD, OUT, JOBS, WORST } = c;
const TILES = c.ALL ? allBuiltTiles() : c.TILES;

if (!CHILD) {
  if (!TILES.length) { console.error("usage: balconies.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS ?? 3 });
  const sum = { tiles: 0, slabs: 0, openSlabs: 0, openEnds: 0, buildings: 0, openBuildings: 0, kitBalconies: 0 }, worst = [];
  for (const r of res) {
    if (r.error) continue;
    sum.tiles++; for (const k of Object.keys(sum)) if (k !== "tiles") sum[k] += r.sum[k] || 0;
    for (const b of r.buildings) worst.push({ tile: r.tile, ...b });
  }
  worst.sort((a, b) => b.openEnds - a.openEnds);
  console.log(`class B: ${JSON.stringify(sum)}`);
  console.log(`worst ${WORST}:`);
  for (const w of worst.slice(0, WORST)) console.log(`  ${JSON.stringify(w)}`);
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), sum, buildings: worst }, null, 1));
  process.exit(0);
}

const T = TILES[0];
const { d, bDoc } = await buildTile(T);
const B = d.buildings;
const D = B.details?.position;
const sum = { slabs: 0, openSlabs: 0, openEnds: 0, buildings: 0, openBuildings: 0, kitBalconies: 0 };
const per = new Map();
if (D?.length) {
  const soup = concatSoups([{ name: "walls", pos: B.walls?.position }, { name: "kitWalls", pos: B.walls?.kit?.position }, { name: "details", pos: D }, { name: "roofs", pos: B.roofs?.position }]);
  const bvh = new Bvh(soup.pos);
  // up-facing triangles of the detail mesh, grouped by shared vertices (mm)
  const N = D.length / 9, parent = new Int32Array(N).fill(-1);
  const find = (i) => { while (parent[i] >= 0 && parent[parent[i]] >= 0) { parent[i] = parent[parent[i]]; i = parent[i]; } return parent[i] >= 0 ? parent[i] : i; };
  const vmap = new Map(), up = [];
  for (let t = 0; t < N; t++) {
    const p = t * 9;
    const e1x = D[p + 3] - D[p], e1y = D[p + 4] - D[p + 1], e1z = D[p + 5] - D[p + 2], e2x = D[p + 6] - D[p], e2y = D[p + 7] - D[p + 1], e2z = D[p + 8] - D[p + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x, L = Math.hypot(nx, ny, nz);
    if (L < 1e-9 || ny / L < 0.99) continue;
    up.push(t);
    for (let k = 0; k < 3; k++) {
      const key = `${Math.round(D[p + k * 3] * 1000)},${Math.round(D[p + k * 3 + 1] * 1000)},${Math.round(D[p + k * 3 + 2] * 1000)}`;
      const o = vmap.get(key);
      if (o === undefined) vmap.set(key, t); else { const a = find(o), b = find(t); if (a !== b) parent[b] = a; }
    }
  }
  const comps = new Map();
  for (const t of up) { const r = find(t); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(t); }
  // each group: its oriented rectangle (axis = its longest triangle edge)
  const rects = [];
  for (const tris of comps.values()) {
    const V = []; for (const t of tris) for (let k = 0; k < 3; k++) V.push([D[t * 9 + k * 3], D[t * 9 + k * 3 + 1], D[t * 9 + k * 3 + 2]]);
    // the oriented rectangle: of the triangle edges' directions, the one with the smallest bounding area (a diagonal
    // gives a larger box than a side); u along the longer side
    let bestA = Infinity, R = null;
    for (let i = 0; i + 2 < V.length && i < 60; i += 3) for (const [p, q] of [[0, 1], [1, 2], [2, 0]]) {
      const dx = V[i + q][0] - V[i + p][0], dz = V[i + q][2] - V[i + p][2], L = Math.hypot(dx, dz); if (L < 0.05) continue;
      let ux = dx / L, uz = dz / L, u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [x, , z] of V) { const u = x * ux + z * uz, v = -x * uz + z * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      const A = (u1 - u0) * (v1 - v0);
      if (A < bestA - 1e-6) { bestA = A; if (v1 - v0 > u1 - u0) { const t = ux; ux = -uz; uz = t; const a0 = u0, a1 = u1; u0 = v0; u1 = v1; v0 = -a1; v1 = -a0; } R = { ux, uz, u0, u1, v0, v1 }; }   // (rotated: u' = v, v' = -u)
    }
    if (!R) continue;
    let y = 0; for (const v of V) y += v[1]; y /= V.length;
    rects.push({ ...R, y, L: R.u1 - R.u0, W: R.v1 - R.v0 });
  }
  const slabs = rects.filter((r) => r.W >= 1.0 && r.W <= 1.4 && r.L >= 1.2 && r.L / r.W > 0.9);
  const strips = rects.filter((r) => r.W <= 0.15 && r.L >= 1.0);
  const fp = footprintIndex(bDoc.buildings);
  const bounds = d.bounds;
  for (const s of slabs) {
    const cu = (s.u0 + s.u1) / 2, cv = (s.v0 + s.v1) / 2;
    const cx = cu * s.ux - cv * s.uz, cz = cu * s.uz + cv * s.ux;
    if (!(cx >= bounds.x0 && cx < bounds.x1 && cz >= bounds.z0 && cz < bounds.z1)) continue;
    // a parapet over it: a thin strip 0.8-1.3 m above, its centre inside the slab's rectangle (+0.15 m)
    const par = strips.some((q) => { if (q.y < s.y + 0.8 || q.y > s.y + 1.3) return false; const qu = (q.u0 + q.u1) / 2, qv = (q.v0 + q.v1) / 2, qx = qu * q.ux - qv * q.uz, qz = qu * q.uz + qv * q.ux; const u = qx * s.ux + qz * s.uz, v = -qx * s.uz + qz * s.ux; return u > s.u0 - 0.15 && u < s.u1 + 0.15 && v > s.v0 - 0.15 && v < s.v1 + 0.15; });
    if (!par) continue;
    sum.slabs++;
    let open = 0;
    for (const sg of [-1, 1]) {
      const ue = sg > 0 ? s.u1 : s.u0, ou = ue + sg * 0.8, y = s.y + 0.5;
      const ox = ou * s.ux - cv * s.uz, oz = ou * s.uz + cv * s.ux;
      const h = bvh.hit(ox, y, oz, -sg * s.ux, 0, -sg * s.uz, 1.0);
      if (!h) open++;
    }
    const bi = fp.at(cx, cz, 2);
    let e = per.get(bi); if (!e) per.set(bi, (e = { slabs: 0, openSlabs: 0, openEnds: 0, x: cx, z: cz, len: 0 }));
    e.slabs++; e.len += s.L;
    if (open) { sum.openSlabs++; sum.openEnds += open; e.openSlabs++; e.openEnds += open; }
  }
}
const KP = B.kit?.pieces || {}, KS = B.kit?.stride || 14;
for (const k of Object.keys(KP)) if (/^balc/.test(k)) sum.kitBalconies += KP[k].length / KS;
const buildings = [];
for (const [bi, e] of per) {
  sum.buildings++; if (e.openEnds) sum.openBuildings++;
  if (e.openEnds) buildings.push({ openEnds: e.openEnds, slabs: e.slabs, openSlabs: e.openSlabs, at: at(e.x, e.z), street: streetAt(T, e.x, e.z), id: bi >= 0 ? bDoc.buildings[bi].id : null });
}
buildings.sort((a, b) => b.openEnds - a.openEnds);
console.log(JSON.stringify({ tile: T, sum, buildings: buildings.slice(0, 40) }));
