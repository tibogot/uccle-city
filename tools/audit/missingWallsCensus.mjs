// MISSING WALLS CENSUS (claude/walls1, 2026-11-24; TODO "Buildings with missing walls", docs/MISSING_WALLS_CENSUS.md).
// Since claude/walls2 also the gate row `walls` (tools/audit/gate.d/walls.mjs, rule walls-closed-from-street): --gate CEIL
// (ceilings per tile and city-wide, tools/audit/missingWalls.ceil.json), --ratchet (write them down to this run), --selftest
// (?feet=old on I3 and ?wallempty=old on F7 must fail), --quiet. FEET: the strict false feet (wall under the edge or under a
// corner) the drawn walls moved down (viewer/groundFit.js sinkFeet; must be 0).
//
// For every building of every tile, AS THE TILE WORKER DRAWS IT (viewer/tileData.js buildTileData through the gate tile
// cache: wall repair, coplanar clean, ground fit, feet, the facade kit's walls; heroes' solids hidden; FrontSide walls):
//   EDGE   every outer footprint edge, a sample every 0.5 m along it and every 1 m of height from the drawn ground + 0.6 m
//          to 0.4 m under the building's OWN roof over a point 0.6 m inside the edge (no own roof there = nothing to
//          close at that height: a lower wing, a courtyard). A horizontal ray from the open air in front of the edge
//          (the first point 0.3-6 m out with nothing drawn over the ray's height) runs in to 1.2 m inside the edge
//          against the drawn shell (walls + kit walls + roofs of the whole tile; the detail mesh is not a wall):
//            ok       first hit is a front face
//            inward   first hit is a face seen from behind (culled by the FrontSide wall material: a hole from the street)
//            missing  nothing met: the street sees into / through the building
//          A neighbour's solid standing in front over the ray's height is a party stretch (skipped). Each failed sample
//          is re-run against the SOURCE (UrbIS walls + roofs of buildings.bin, as the data gives them) for the cause:
//            data     the source has no face there either (UrbIS gap: the solid itself is open)
//            srcIn    the source face there is wound inward
//            lost     the source closes it and the pipeline lost it (wall repair / coplanar clean / kit cut / feet);
//                     lostFeet: of those, the source triangle hit has a FALSE FOOT corner (an edge viewer/groundFit.js
//                     sinkFeet takes for a foot while its own wall lies under it or goes on lower beside it: the feet
//                     pull it down and tear the wall above, docs/MISSING_WALLS_CENSUS.md E1)
//          A missing sample is also split RECESS (a front face deeper in, <= 40 m: an arcade, an undercroft) / THROUGH.
//          Per column (one 0.5 m stretch of edge): SHORT = covered low, missing higher up (the wall stops under the roof),
//          NOWALL = missing at every height, LOW = missing low but covered above (an arcade / pilotis: often real).
//   BALC   every up-facing detail face (balcony slab top, canopy, step) standing out of a building's edge: a ray in from
//          0.5 m over it to the edge + 1 m must meet the shell's front face. None = an ORPHAN balcony (no wall behind).
//   ROOF   a 1 m grid inside each footprint (>= 0.5 m from its edges): a ray down from over the top must meet an
//          up-facing shell face first; none = roof hole, a back face = roof wound inward.
//   EYES   (--eyes, no tile build) every tour / shot view eye of tools/tour + uccle-jobs views files standing inside a
//          building footprint under its roof: an eye in a building sees no walls (they are culled from inside).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/missingWallsCensus.mjs [--all | T ...] [--jobs 1]
//        [--out FILE] [--solid ID (explain one solid, edge by edge)] [--eyes FILE...] [--gate CEIL [--ratchet] [--selftest]] [--quiet]
// Light load: one child process a tile, sequential by default (--jobs 1), 2 GB heap each.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, Bvh, dsmOf, buildTile, allBuiltTiles, footprintIndex, concatSoups, streetAt } from "./census/lib_mesh.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const CHILD = opt("--child", null), OUT = opt("--out", null), JOBS = +opt("--jobs", 1), SOLID = opt("--solid", null);
const EYES = flag("--eyes"), ALL = flag("--all");
// (defects3) --outeronly: the outer footprint ring only, as before (the courtyard / light-well walls untested)
const INNER = !flag("--outeronly"), FAR = flag("--far");
// (claude/walls2, gate row `walls`, rule walls-closed-from-street) --gate CEIL.json: exit 1 when a count is over its ceiling
// (per tile and city-wide), a false foot is moved, > 2 orphan balconies, an eye inside a building; --selftest: the old
// behaviours (?feet=old, ?wallempty=old) on their tiles must FAIL the same ceilings; --ratchet: write the ceilings down to
// this run (+ slack), never up; --quiet: the summary only
const GATE = opt("--gate", null), QUIET = flag("--quiet"), SELFTEST = flag("--selftest"), RATCHET = flag("--ratchet");
const TILES = ALL ? allBuiltTiles() : argv.filter((a) => /^[A-Z]\d+$/i.test(a)).map((t) => t.toUpperCase());
const EYE_FILES = EYES ? argv.filter((a) => !/^[A-Z]\d+$/i.test(a) && !a.startsWith("--")) : [];

const SP = 0.5, DH = 1.0;          // m along the edge / of height between samples
const CELL_A = SP * DH;            // m2 a failed sample stands for

const triArea = (P, p) => { const ax = P[p + 3] - P[p], ay = P[p + 4] - P[p + 1], az = P[p + 5] - P[p + 2], bx = P[p + 6] - P[p], by = P[p + 7] - P[p + 1], bz = P[p + 8] - P[p + 2]; return Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2; };
const triNy = (P, p) => { const ax = P[p + 3] - P[p], ay = P[p + 4] - P[p + 1], az = P[p + 5] - P[p + 2], bx = P[p + 6] - P[p], by = P[p + 7] - P[p + 1], bz = P[p + 8] - P[p + 2]; const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; return ny / (Math.hypot(nx, ny, nz) || 1); };

/** the source solids (buildings.bin walls + roofs, as UrbIS gives them) of the buildings kept: one soup + per-building roof triangles */
function sourceOf(T, buildings) {
  const buf = readFileSync(join(ROOT, "data/tiles", T, "buildings.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const dv = new DataView(ab), V = dv.getUint32(0, true), N = dv.getUint32(4, true);
  const P = new Float32Array(ab, 8, V * 3), I = new Uint32Array(ab, 8 + V * 12, N * 3);
  let n = 0; for (const b of buildings) n += b.walls.count + b.roof.count;
  const pos = new Float32Array(n * 9); let o = 0;
  const roofs = buildings.map(() => []);
  const put = (t) => { for (let k = 0; k < 3; k++) { const i = I[t * 3 + k] * 3; pos[o++] = P[i]; pos[o++] = P[i + 1]; pos[o++] = P[i + 2]; } };
  // FALSE FEET: viewer/groundFit.js sinkFeet's foot test (an edge whose two corners are the lowest wall points at their
  // x|z, sloping under 0.6) passed by an edge that has wall BELOW it (a triangle using it whose third corner lies under
  // the edge's line): the top of a plinth under a recessed porch, a step in the solid's bottom outline. sinkFeet pulls
  // such a vertex down to the ground and every triangle on it with it: the wall above / beside it tears open.
  const falseFoot = new Map(); let footEdges = 0, falseEdges = 0;   // (vertex x|z|y cm -> the building index)
  /** the lowest point of building b's own wall triangles on the vertical line at (x, z) (within 0.3 m of their plane) */
  const minWallY = (b, x, z) => {
    let lo = Infinity;
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) {
      const v = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
      // the triangle's plan line: its two farthest corners in plan
      let A = v[0], B = v[1], best = -1;
      for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) { const d = Math.hypot(P[v[i] * 3] - P[v[j] * 3], P[v[i] * 3 + 2] - P[v[j] * 3 + 2]); if (d > best) { best = d; A = v[i]; B = v[j]; } }
      if (best < 0.05) continue;
      const tx = (P[B * 3] - P[A * 3]) / best, tz = (P[B * 3 + 2] - P[A * 3 + 2]) / best;
      const ru = (x - P[A * 3]) * tx + (z - P[A * 3 + 2]) * tz, rd = Math.abs(-(x - P[A * 3]) * tz + (z - P[A * 3 + 2]) * tx);
      if (rd > 0.3 || ru < -0.05 || ru > best + 0.05) continue;
      for (let e = 0; e < 3; e++) {
        const p = v[e], q = v[(e + 1) % 3];
        const up = (P[p * 3] - P[A * 3]) * tx + (P[p * 3 + 2] - P[A * 3 + 2]) * tz, uq = (P[q * 3] - P[A * 3]) * tx + (P[q * 3 + 2] - P[A * 3 + 2]) * tz;
        if ((up - ru) * (uq - ru) > 0) continue;
        const y = Math.abs(uq - up) < 1e-6 ? Math.min(P[p * 3 + 1], P[q * 3 + 1]) : P[p * 3 + 1] + (P[q * 3 + 1] - P[p * 3 + 1]) * (ru - up) / (uq - up);
        if (y < lo) lo = y;
      }
    }
    return lo;
  };
  const vkey = (v) => `${Math.round(P[v * 3] * 100)}|${Math.round(P[v * 3 + 2] * 100)}|${Math.round(P[v * 3 + 1] * 100)}`;
  const strictFoot = new Map();
  /** does a wall triangle of building b hold the point 5 cm under vertex v (in its plane within 5 cm, inside it)? */
  const underWall = (b, v) => {
    const x = P[v * 3], y = P[v * 3 + 1] - 0.05, z = P[v * 3 + 2];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) {
      const w = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]].map((q) => [P[q * 3], P[q * 3 + 1], P[q * 3 + 2]]);
      const nx = (w[1][1] - w[0][1]) * (w[2][2] - w[0][2]) - (w[1][2] - w[0][2]) * (w[2][1] - w[0][1]);
      const ny = (w[1][2] - w[0][2]) * (w[2][0] - w[0][0]) - (w[1][0] - w[0][0]) * (w[2][2] - w[0][2]);
      const nz = (w[1][0] - w[0][0]) * (w[2][1] - w[0][1]) - (w[1][1] - w[0][1]) * (w[2][0] - w[0][0]);
      const L = Math.hypot(nx, ny, nz); if (L < 1e-9) continue;
      if (Math.abs(((x - w[0][0]) * nx + (y - w[0][1]) * ny + (z - w[0][2]) * nz) / L) > 0.05) continue;
      // barycentric in the plane (projected along the largest normal axis)
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      const [i, j] = ax >= ay && ax >= az ? [1, 2] : ay >= az ? [0, 2] : [0, 1];
      const p = [x, y, z], d = (w[1][j] - w[2][j]) * (w[0][i] - w[2][i]) + (w[2][i] - w[1][i]) * (w[0][j] - w[2][j]);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((w[1][j] - w[2][j]) * (p[i] - w[2][i]) + (w[2][i] - w[1][i]) * (p[j] - w[2][j])) / d, l2 = ((w[2][j] - w[0][j]) * (p[i] - w[2][i]) + (w[0][i] - w[2][i]) * (p[j] - w[2][j])) / d;
      if (l1 >= -1e-3 && l2 >= -1e-3 && 1 - l1 - l2 >= -1e-3) return true;
    }
    return false;
  };
  for (const [bi, b] of buildings.entries()) {
    if (b.attrs?._landmark || !b.walls?.count) continue;
    const low = new Map(), below = new Set(), xz = (v) => `${Math.round(P[v * 3] * 100)}|${Math.round(P[v * 3 + 2] * 100)}`;
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let k = 0; k < 3; k++) { const v = I[t * 3 + k], q = xz(v), y = P[v * 3 + 1]; if (!(low.get(q) <= y)) low.set(q, y); }
    const ek = (va, vb) => { const a = vkey(va), c = vkey(vb); return a < c ? a + "#" + c : c + "#" + a; };
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let e = 0; e < 3; e++) {
      const va = I[t * 3 + e], vb = I[t * 3 + (e + 1) % 3], vc = I[t * 3 + (e + 2) % 3];
      const ex = P[vb * 3] - P[va * 3], ez = P[vb * 3 + 2] - P[va * 3 + 2], L2 = ex * ex + ez * ez || 1e-9;
      const u = ((P[vc * 3] - P[va * 3]) * ex + (P[vc * 3 + 2] - P[va * 3 + 2]) * ez) / L2;
      if (P[vc * 3 + 1] < P[va * 3 + 1] + (P[vb * 3 + 1] - P[va * 3 + 1]) * u - 0.05) below.add(ek(va, vb));
    }
    const seen = new Set();
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let e = 0; e < 3; e++) {
      const va = I[t * 3 + e], vb = I[t * 3 + (e + 1) % 3], ya = P[va * 3 + 1], yb = P[vb * 3 + 1];
      if (ya > low.get(xz(va)) + 0.01 || yb > low.get(xz(vb)) + 0.01) continue;
      const L = Math.hypot(P[vb * 3] - P[va * 3], P[vb * 3 + 2] - P[va * 3 + 2]);
      if (L < 0.05 || Math.abs(yb - ya) > 0.6 * L) continue;
      const k = ek(va, vb); if (seen.has(k)) continue; seen.add(k);
      footEdges++;
      // (or the building's own wall goes on DOWN beside it: a vertex within 1.5 m in plan >= 0.5 m under the edge's line
      // = the edge hangs: a porch lintel, a passage soffit, the floor of an upper wing; never a foot)
      let hang = below.has(k);
      if (!hang) for (const f of [0.1, 0.5, 0.9]) {
        const qx = P[va * 3] + (P[vb * 3] - P[va * 3]) * f, qz = P[va * 3 + 2] + (P[vb * 3 + 2] - P[va * 3 + 2]) * f, qy = ya + (yb - ya) * f;
        if (minWallY(b, qx, qz) < qy - 0.5) { hang = true; break; }
      }
      if (!hang) {                                          // (or a corner of its own wall within 1.5 m in plan that much lower)
        const ax = P[va * 3], az = P[va * 3 + 2], dx = P[vb * 3] - ax, dz = P[vb * 3 + 2] - az, L2 = dx * dx + dz * dz || 1e-9;
        for (let t2 = b.walls.first; t2 < b.walls.first + b.walls.count && !hang; t2++) for (let k2 = 0; k2 < 3 && !hang; k2++) {
          const v = I[t2 * 3 + k2], px = P[v * 3], pz = P[v * 3 + 2], u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
          if (Math.hypot(px - ax - dx * u, pz - az - dz * u) < 1.5 && P[v * 3 + 1] < ya + (yb - ya) * u - 0.5) hang = true;
        }
      }
      if (hang) { falseEdges++; falseFoot.set(vkey(va), bi); falseFoot.set(vkey(vb), bi); }
      // STRICT false feet (claude/walls2, the gate's feetMoved): wall UNDER the edge itself: a triangle on it reaching below its
      // line, or a wall triangle of the building holding the point 5 cm under a corner. Such a corner moved down = a fold / tear.
      if (below.has(k) || underWall(b, va) || underWall(b, vb)) { strictFoot.set(vkey(va), bi); strictFoot.set(vkey(vb), bi); }
    }
  }
  buildings.forEach((b, bi) => {
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) put(t);
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const v = [0, 1, 2].map((k) => { const i = I[t * 3 + k] * 3; return [P[i], P[i + 1], P[i + 2]]; });
      roofs[bi].push(v); put(t);
    }
  });
  /** does source soup triangle t touch a false-foot vertex? */
  const touchesFalseFoot = (t) => { for (let k = 0; k < 3; k++) { const o = t * 9 + k * 3; if (falseFoot.has(`${Math.round(pos[o] * 100)}|${Math.round(pos[o + 2] * 100)}|${Math.round(pos[o + 1] * 100)}`)) return true; } return false; };
  // (claude/walls2) the source's wall vertex heights per x|z (cm), for "a false foot the drawn walls moved" (feetMoved)
  const srcY = new Map();
  for (const b of buildings) for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) for (let k = 0; k < 3; k++) {
    const v = I[t * 3 + k], q = `${Math.round(P[v * 3] * 100)}|${Math.round(P[v * 3 + 2] * 100)}`;
    let s = srcY.get(q); if (!s) srcY.set(q, (s = new Set())); s.add(Math.round(P[v * 3 + 1] * 100));
  }
  return { pos, roofs, touchesFalseFoot, footEdges, falseEdges, falseFoot, strictFoot, srcY };
}
/** highest roof triangle of a list over (x, z), -Infinity none */
function roofOver(tris, x, z) {
  let best = -Infinity;
  for (const [a, b, c] of tris) {
    const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(det) < 1e-9) continue;
    const l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det, l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det, l3 = 1 - l1 - l2;
    if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
    best = Math.max(best, l1 * a[1] + l2 * b[1] + l3 * c[1]);
  }
  return best;
}
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), t }; };

async function tileChild(T) {
  const t0 = Date.now();
  const { d, bDoc, entry } = await buildTile(T);
  const B = d.buildings, bs = bDoc.buildings;
  const { Heightmap } = await import(pathToFileURL(join(ROOT, "viewer/heightmap.js")).href);
  const hm = Heightmap.from(d.hdr, d.y, d.orig);
  const shell = concatSoups([{ name: "walls", pos: B.walls?.position }, { name: "kitWalls", pos: B.walls?.kit?.position }, { name: "roofs", pos: B.roofs?.position }]);
  const det = B.details?.position || new Float32Array(0);
  const all = concatSoups([{ name: "shell", pos: shell.pos }, { name: "details", pos: det }]);
  // (defects3) --far: judge the FAR tile's shell instead (tileData.js buildLiteData draws the UrbIS solids as they are:
  // no wall repair, no feet, no kit)
  const src0 = FAR ? sourceOf(T, bs) : null;
  const bvh = new Bvh(FAR ? src0.pos : shell.pos);
  const [bx0, bx1, bz0, bz1] = [d.bounds.x0 - 40, d.bounds.x1 + 40, d.bounds.z0 - 40, d.bounds.z1 + 40];
  const dsm = dsmOf(all.pos, bx0, bz0, bx1, bz1, 0.5);
  const src = sourceOf(T, bs), sbvh = new Bvh(src.pos);
  const fp = footprintIndex(bs);
  // masses the tile's own soup does not hold: the solids a hero model replaces (hidden here, the hero stands there) and
  // the buildings of the neighbouring tiles (a building is in ONE tile's data, by its centre): a party stretch against
  // them is not a hole. Their top (UrbIS) stands for their height.
  const hidden = new Set(entry.hide || []), others = [];
  const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  for (const t of manifest.tiles) {
    if (!(t.bounds.x[0] < d.bounds.x1 + 40 && t.bounds.x[1] > d.bounds.x0 - 40 && t.bounds.z[0] < d.bounds.z1 + 40 && t.bounds.z[1] > d.bounds.z0 - 40)) continue;
    const f = join(ROOT, "data/tiles", t.name, "buildings.json"); if (!existsSync(f)) continue;
    const doc = t.name === T ? null : JSON.parse(readFileSync(f, "utf8"));
    const list = t.name === T ? JSON.parse(readFileSync(f, "utf8")).buildings.filter((b) => hidden.has(b.attrs?.BU_ID) || hidden.has(b.id)) : doc.buildings;
    for (const b of list) { const r = b.footprint[0]; if (r.some(([x, z]) => x > d.bounds.x0 - 40 && x < d.bounds.x1 + 40 && z > d.bounds.z0 - 40 && z < d.bounds.z1 + 40)) others.push({ footprint: b.footprint, top: b.top ?? b.base + b.height }); }
  }
  const ofp = footprintIndex(others);
  const otherTop = (x, z) => { const k = ofp.at(x, z); return k >= 0 ? others[k].top : -Infinity; };
  const per = [];
  const tally = { byShape: {}, lostFeet: 0, feetMoved: 0, recess: 0, through: 0, footEdges: src.footEdges, falseFootEdges: src.falseEdges, samples: 0, ok: 0, inward: 0, missing: 0, data: 0, srcIn: 0, lost: 0, colShort: 0, colNoWall: 0, colLow: 0, balcSlabs: 0, balcOrphan: 0, balcOrphanM2: 0, roofPts: 0, roofHole: 0, roofIn: 0, roofLost: 0 };
  const explain = [];
  const recOf = new Map();
  // (defects3) the courtyard / light-well rings' samples (footprint[1..]): their own tally (tally.court), not under the
  // outer ring's ceilings (a new view of the city: reported, ratcheted on its own)
  const court = { byShape: {}, lostFeet: 0, recess: 0, through: 0, samples: 0, ok: 0, inward: 0, missing: 0, data: 0, srcIn: 0, lost: 0, colShort: 0, colNoWall: 0, colLow: 0 };
  tally.court = court;
  const rec = (bi) => {
    let r = recOf.get(bi);
    if (!r) {
      const b = bs[bi];
      r = { solid: b.id.split("/").pop(), bu: b.attrs?.BU_ID?.split("/").pop() || "", landmark: !!b.attrs?._landmark, top: +(b.top ?? b.base + b.height).toFixed(1),
        missM2: 0, inwardM2: 0, data: 0, srcIn: 0, lost: 0, lostFeet: 0, feetMoved: 0, recess: 0, through: 0, short: 0, nowall: 0, low: 0, orphanSlabs: 0, orphanM2: 0, roofHoleM2: 0, sx: 0, sy: 0, sz: 0, sn: 0 };
      recOf.set(bi, r);
    }
    return r;
  };

  // ------------------------------------------------------------------ FEET (claude/walls2): false feet the drawn walls MOVED
  // A STRICT false-foot vertex (wall under it: a plinth top, an outline step, a fan apex over a porch; sourceOf above) that the drawn walls no
  // longer hold at its place, while they hold a vertex at its x|z lower down that the source does not have there: the
  // wall feet pulled it down (viewer/groundFit.js sinkFeet, ?feet=old: thousands; the fix: 0). Wall repair / coplanar
  // clean drop or clip triangles but never move a vertex down its own vertical.
  {
    const W = B.walls?.position || new Float32Array(0), keys = new Set(), xzY = new Map();
    for (let o = 0; o < W.length; o += 3) {
      const q = `${Math.round(W[o] * 100)}|${Math.round(W[o + 2] * 100)}`, y = Math.round(W[o + 1] * 100);
      keys.add(q + "|" + y); let s = xzY.get(q); if (!s) xzY.set(q, (s = new Set())); s.add(y);
    }
    for (const [k, bi] of src.strictFoot) {
      if (SOLID && !bs[bi].id.endsWith("/" + SOLID)) continue;
      if (keys.has(k)) continue;
      const [x, z, y] = k.split("|"), q = `${x}|${z}`, ys = xzY.get(q), sy = src.srcY.get(q);
      if (!ys) continue;
      // (a wall viewer/wallRepair.js rebuilt stands from the building's base: its corners there are not a moved foot)
      const by = Math.round(bs[bi].base * 100);
      let moved = false; for (const yy of ys) if (yy < +y - 5 && !sy?.has(yy) && Math.abs(yy - by) > 1) { moved = true; break; }
      if (moved) { tally.feetMoved++; rec(bi).feetMoved++; }
    }
  }
  bs.forEach((b, bi) => {
    const want = !SOLID || b.id.endsWith("/" + SOLID);
    if (!want) return;
    const own = src.roofs[bi];
    // ------------------------------------------------------------------ EDGE
    // (defects3) EVERY ring: the outer one and the courtyards / light wells (footprint[1..]: their walls face into the
    // hole and the street / the sky sees them; before, only footprint[0] was tested). A hole's "outward" is into the hole.
    for (let ri = 0; ri < (INNER ? b.footprint.length : 1); ri++) {
    const ring = b.footprint[ri], TL = ri ? court : tally;   // (a courtyard's samples counted apart: TL.court)
    const n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
    let A = 0; for (let i = 0; i < n; i++) { const [ax, az] = ring[i], [cx, cz] = ring[(i + 1) % n]; A += ax * cz - cx * az; }
    const sgn = (A > 0 ? 1 : -1) * (ri ? -1 : 1);
    for (let i = 0; i < n; i++) {
      const [ax, az] = ring[i], [cx, cz] = ring[(i + 1) % n], L = Math.hypot(cx - ax, cz - az);
      if (L < 1) continue;
      const tx = (cx - ax) / L, tz = (cz - az) / L, ox = tz * sgn, oz = -tx * sgn;   // outward
      const eRow = { edge: i, L: +L.toFixed(1), cols: [] };
      for (let u = SP / 2; u < L; u += SP) {
        const ex = ax + tx * u, ez = az + tz * u;
        if (ri ? !fp.pip(ex + ox * 0.3, ez + oz * 0.3, ring) : fp.pip(ex + ox * 0.3, ez + oz * 0.3, ring)) continue;   // a concave sliver: the outward guess is wrong here
        const ix = ex - ox * 0.6, iz = ez - oz * 0.6;
        const roofH = roofOver(own, ix, iz);
        if (!(roofH > -Infinity)) continue;                                   // no own roof over this point (open to the sky)
        const g = Math.max(hm.surface(ex + ox * 1.0, ez + oz * 1.0), hm.surface(ix, iz));
        const nb = fp.at(ex + ox * 0.4, ez + oz * 0.4);                       // a neighbour against this stretch
        const nbTop = Math.max(nb >= 0 && nb !== bi ? roofOver(src.roofs[nb], ex + ox * 0.4, ez + oz * 0.4) : -Infinity, otherTop(ex + ox * 0.4, ez + oz * 0.4));
        const col = [], colCause = [];
        for (let h = g + 0.6; h < roofH - 0.4; h += DH) {
          if (h < nbTop - 0.2) { col.push("p"); continue; }                    // party: the neighbour's mass stands there
          let off = -1; for (let t = 0.3; t <= 6; t += 0.25) { const H = dsm.at(ex + ox * t, ez + oz * t); if (!(H > h - 0.2)) { off = t; break; } }
          if (off < 0) { col.push("c"); continue; }                           // something drawn in front all the way out (covered)
          const sx0 = ex + ox * off, sz0 = ez + oz * off, tmax = off + 1.2;
          TL.samples++;
          const hit = bvh.hit(sx0, h, sz0, -ox, 0, -oz, tmax);
          if (hit && !hit.back) { TL.ok++; col.push("o"); continue; }
          const r = rec(bi);
          const sh = sbvh.hit(sx0, h, sz0, -ox, 0, -oz, tmax);
          const cause = !sh ? "data" : sh.back ? "srcIn" : "lost";
          TL[cause]++; r[cause]++;
          if (cause === "lost") { if (src.touchesFalseFoot(sh.tri)) { TL.lostFeet++; r.lostFeet++; } }
          colCause.push(cause);
          if (hit) { TL.inward++; r.inwardM2 += CELL_A; col.push("i"); }
          else {
            TL.missing++; r.missM2 += CELL_A; col.push("m");
            // deeper: a front face further in (<= 40 m) = a RECESS (an arcade, an undercroft on pilotis, a deep loggia:
            // often real, the street sees a wall behind it); none = THROUGH (the street sees through / into the void)
            const deep = bvh.hit(sx0, h, sz0, -ox, 0, -oz, off + 40);
            if (deep && !deep.back) { TL.recess++; r.recess++; } else { TL.through++; r.through++; }
          }
          r.sx += ex; r.sy += h; r.sz += ez; r.sn++;
        }
        // the column's shape
        const k = col.filter((c) => c === "o" || c === "m" || c === "i");
        if (k.some((c) => c !== "o")) {
          const r = rec(bi);
          const bad = (c) => c === "m" || c === "i";
          const firstOk = k.indexOf("o"), lastOk = k.lastIndexOf("o");
          let shape = "mixed";
          if (firstOk < 0) { TL.colNoWall++; r.nowall++; shape = "nowall"; }
          else if (k.slice(lastOk + 1).some(bad) && !k.slice(0, firstOk).some(bad)) { TL.colShort++; r.short++; shape = "short"; }
          else if (k.slice(0, firstOk).some(bad)) { TL.colLow++; r.low++; shape = "low"; }
          for (const c of colCause) { const kk = `${shape}.${c}`; TL.byShape[kk] = (TL.byShape[kk] || 0) + 1; }
        }
        if (SOLID) eRow.cols.push(`${u.toFixed(1)}:${col.join("")}`);
      }
      if (SOLID) explain.push({ ...eRow, ...(ri ? { ring: ri } : {}) });
    }
    }
    const ring = b.footprint[0];
    const n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
    // ------------------------------------------------------------------ ROOF
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    const top = (b.top ?? b.base + b.height) + 3;
    for (let x = Math.floor(x0) + 0.5; x < x1; x += 1) for (let z = Math.floor(z0) + 0.5; z < z1; z += 1) {
      if (!fp.pip(x, z, ring)) continue;
      let near = false; for (let k = 0; k < n && !near; k++) { const [ax, az] = ring[k], [cx, cz] = ring[(k + 1) % n]; if (segDist(x, z, ax, az, cx, cz).d < 0.5) near = true; }
      if (near || !(roofOver(own, x, z) > -Infinity)) continue;
      tally.roofPts++;
      const hit = bvh.hit(x, top, z, 0, -1, 0, top - b.base + 5);
      if (hit && !hit.back) continue;
      const r = rec(bi);
      const sh = sbvh.hit(x, top, z, 0, -1, 0, top - b.base + 5);
      if (hit) tally.roofIn++; else tally.roofHole++;
      if (sh && !sh.back) tally.roofLost++;
      r.roofHoleM2 += 1;
    }
  });
  // ------------------------------------------------------------------ BALC (orphan detail slabs)
  const slabs = new Map();
  for (let p = 0; p < det.length; p += 9) {
    if (triNy(det, p) < 0.95) continue;
    const a = triArea(det, p); if (a < 0.05) continue;
    const cx = (det[p] + det[p + 3] + det[p + 6]) / 3, cy = (det[p + 1] + det[p + 4] + det[p + 7]) / 3, cz = (det[p + 2] + det[p + 5] + det[p + 8]) / 3;
    if (fp.at(cx, cz) >= 0) continue;                                       // on a roof / inside a footprint
    const bi = fp.at(cx, cz, 1.6); if (bi < 0) continue;
    if (SOLID && !bs[bi].id.endsWith("/" + SOLID)) continue;
    if (cy < bs[bi].base + 2) continue;                                     // ground-level steps / canopies low down
    // a slab standing OUT of the wall (a balcony 1.25 m deep, a canopy 0.7-1.1 m): its far corner 0.6-1.6 m out of the
    // footprint (a cornice / string course / sill is shallower)
    const r0 = bs[bi].footprint[0]; let far = 0;
    for (let k = 0; k < 3; k++) { const vx = det[p + k * 3], vz = det[p + k * 3 + 2]; let m = Infinity; for (let i = 0; i < r0.length; i++) { const [ax, az] = r0[i], [cx2, cz2] = r0[(i + 1) % r0.length]; m = Math.min(m, segDist(vx, vz, ax, az, cx2, cz2).d); } if (!fp.pip(vx, vz, r0)) far = Math.max(far, m); }
    if (far < 0.6 || far > 1.6) continue;
    const k = `${bi}|${Math.round(cx)}|${Math.round(cy * 2)}|${Math.round(cz)}`;
    const s = slabs.get(k); if (s) s.a += a; else slabs.set(k, { bi, x: cx, y: cy, z: cz, a });
  }
  for (const s of slabs.values()) {
    const ring = bs[s.bi].footprint[0];
    let best = { d: Infinity }, bx = 0, bz = 0;
    for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i], [cx, cz] = ring[(i + 1) % ring.length]; const q = segDist(s.x, s.z, ax, az, cx, cz); if (q.d < best.d) { best = q; bx = ax + (cx - ax) * q.t; bz = az + (cz - az) * q.t; } }
    const dx = bx - s.x, dz = bz - s.z, L = Math.hypot(dx, dz) || 1;
    // the building's own mass over the slab (its roof 0.6 m inside the edge >= 1.5 m over it): else the slab is on top
    // of the wall (a roof terrace's edge, an eaves board), not hung on a wall
    if (!(roofOver(src.roofs[s.bi], bx + dx / L * 0.6, bz + dz / L * 0.6) > s.y + 1.5)) continue;
    tally.balcSlabs++;
    const hit = bvh.hit(s.x, s.y + 0.5, s.z, dx / L, 0, dz / L, L + 1.0);
    if (hit && !hit.back) continue;
    tally.balcOrphan++; tally.balcOrphanM2 += s.a;
    const r = rec(s.bi); r.orphanSlabs++; r.orphanM2 += s.a;
  }
  const list = [...recOf.values()].map((r) => {
    const o = { ...r, missM2: +r.missM2.toFixed(1), inwardM2: +r.inwardM2.toFixed(1), orphanM2: +r.orphanM2.toFixed(1), x: r.sn ? +(r.sx / r.sn).toFixed(1) : null, y: r.sn ? +(r.sy / r.sn).toFixed(1) : null, z: r.sn ? +(r.sz / r.sn).toFixed(1) : null };
    delete o.sx; delete o.sy; delete o.sz; delete o.sn;
    o.cause = o.lost >= Math.max(o.data, o.srcIn) && o.lost > 0 ? "lost" : o.data >= o.srcIn && o.data > 0 ? "data" : o.srcIn > 0 ? "srcIn" : o.orphanSlabs ? "orphan" : "roof";
    return o;
  }).filter((r) => r.missM2 + r.inwardM2 >= 1 || r.orphanSlabs || r.roofHoleM2 >= 2 || r.feetMoved)
    .sort((p, q) => (q.missM2 + q.inwardM2) - (p.missM2 + p.inwardM2));
  for (const r of list.slice(0, 25)) if (r.x != null) r.street = streetAt(T, r.x, r.z);
  tally.balcOrphanM2 = +tally.balcOrphanM2.toFixed(1);
  return { tile: T, buildings: bs.length, tally, affected: list.length, list, explain: SOLID ? explain : undefined, ms: Date.now() - t0 };
}

// ------------------------------------------------------------------ EYES: view eyes standing inside a building
async function eyes(files) {
  const { readdirSync } = await import("node:fs");
  const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  const docs = new Map();
  const views = [];
  const walk = (o, file) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { for (const q of o) walk(q, file); return; }
    const at = o.q?.at ?? o.at;
    const hit = typeof at === "string" && /^-?[\d.]+,-?[\d.]+/.test(at);
    if (hit) views.push({ file, id: o.id || o.name || "", at });
    for (const [k, v] of Object.entries(o)) if (v && typeof v === "object" && !(hit && k === "q")) walk(v, file);
  };
  for (const f of files) { try { walk(JSON.parse(readFileSync(f, "utf8")), f); } catch (e) { console.error(`${f}: ${e.message}`); } }
  const { groundAt } = await import("./census/lib_mesh.mjs"), ground = await groundAt();
  const out = [];
  for (const v of views) {
    const [x, z, hh] = v.at.split(",").map(Number);
    const ey = ground(x, z) + (Number.isFinite(hh) ? hh : 1.7);         // at = x, z[, h over the drawn ground] (docs/TOUR.md)
    // (a building belongs to ONE tile's data, by its own centre: the eye's tile and every tile within 150 m are read)
    for (const t of manifest.tiles.filter((q) => x > q.bounds.x[0] - 150 && x < q.bounds.x[1] + 150 && z > q.bounds.z[0] - 150 && z < q.bounds.z[1] + 150)) {
      const T = t.name, f = join(ROOT, "data/tiles", T, "buildings.json"); if (!existsSync(f)) continue;
      if (!docs.has(T)) { const doc = JSON.parse(readFileSync(f, "utf8")); docs.set(T, { doc, fp: footprintIndex(doc.buildings) }); }
      const { doc, fp } = docs.get(T), bi = fp.at(x, z);
      if (bi >= 0 && ey < doc.buildings[bi].top) out.push({ ...v, tile: T, solid: doc.buildings[bi].id.split("/").pop(), eyeY: +ey.toFixed(1), top: doc.buildings[bi].top });
    }
  }
  return { views: views.length, inside: out };
}

const IS_MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (IS_MAIN && CHILD) { const r = await tileChild(CHILD); console.log(JSON.stringify(r)); process.exit(0); }
const out = { when: new Date().toISOString() };
const log = (...a) => { if (!QUIET) console.log(...a); };
if (IS_MAIN && EYES) {
  out.eyes = await eyes(EYE_FILES);
  console.log(`eyes: ${out.eyes.views} views read, ${out.eyes.inside.length} inside a building footprint`);
  for (const e of out.eyes.inside) console.log(`  ${e.file.split(/[\\/]/).pop()} ${e.id} at ${e.at}  ${e.tile} solid ${e.solid} eye ${e.eyeY} under top ${e.top}`);
}
/** the census over a list of tiles (one child a tile, JOBS at a time); env: extra environment (BUILD_OVER) */
async function census(tiles, env = {}) {
  const queue = tiles.slice(), results = [];
  const run = (T) => new Promise((ok) => {
    const args = ["--max-old-space-size=2048", "--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T, ...(SOLID ? ["--solid", SOLID] : []), ...(INNER ? [] : ["--outeronly"]), ...(FAR ? ["--far"] : [])];
    const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } });
    let so = "", se = ""; p.stdout.on("data", (b) => { so += b; }); p.stderr.on("data", (b) => { se += b; });
    p.on("close", (code) => {
      const line = so.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: child exit ${code}: ${se.trim().split("\n").slice(-3).join(" / ")}`); results.push({ tile: T, error: true }); }
      else {
        const r = JSON.parse(line); results.push(r); const t = r.tally;
        log(`${T}: ${r.buildings} bld, ${t.samples} edge rays: missing ${t.missing} inward ${t.inward} (data ${t.data} srcIn ${t.srcIn} lost ${t.lost}, of it at a false foot ${t.lostFeet}), false feet moved ${t.feetMoved}, false foot edges ${t.falseFootEdges}/${t.footEdges}, cols short ${t.colShort} nowall ${t.colNoWall} low ${t.colLow}; slabs ${t.balcSlabs} orphan ${t.balcOrphan}; roof holes ${t.roofHole} in ${t.roofIn}; ${r.affected} buildings (${r.ms} ms)`);
        if (r.explain) for (const e of r.explain) console.log(`  edge ${e.edge} L ${e.L}: ${e.cols.join(" ")}`);
      }
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  return results;
}
function summary(results) {
  const ok = results.filter((r) => !r.error);
  const sum = { byShape: {} }; for (const r of ok) for (const [k, v] of Object.entries(r.tally)) {
    if (k === "byShape") { for (const [k2, v2] of Object.entries(v)) sum.byShape[k2] = (sum.byShape[k2] || 0) + v2; }
    else if (k === "court") { const c = sum.court ||= {}; for (const [k2, v2] of Object.entries(v)) if (typeof v2 === "number") c[k2] = (c[k2] || 0) + v2; }
    else sum[k] = +((sum[k] || 0) + v).toFixed(1);
  }
  const worst = ok.flatMap((r) => r.list.map((w) => ({ tile: r.tile, ...w }))).sort((a, b) => (b.missM2 + b.inwardM2) - (a.missM2 + a.inwardM2));
  const byCause = {}; for (const w of worst) if (w.missM2 + w.inwardM2 >= 1) { const c = byCause[w.cause] ||= { buildings: 0, m2: 0 }; c.buildings++; c.m2 = +(c.m2 + w.missM2 + w.inwardM2).toFixed(1); }
  return { n: ok.length, errors: results.length - ok.length, buildings: ok.reduce((s, r) => s + r.buildings, 0), sum, byCause,
    open1: worst.filter((w) => w.missM2 + w.inwardM2 >= 1).length, open10: worst.filter((w) => w.missM2 + w.inwardM2 >= 10).length,
    orphanBuildings: worst.filter((w) => w.orphanSlabs).length, roofBuildings: worst.filter((w) => w.roofHoleM2 >= 2).length,
    feetBuildings: worst.filter((w) => w.feetMoved).length,
    worst: worst.slice(0, 60), orphanWorst: worst.filter((w) => w.orphanSlabs).sort((a, b) => b.orphanSlabs - a.orphanSlabs).slice(0, 20),
    all: worst, perTile: results.map((r) => ({ tile: r.tile, error: r.error, tally: r.tally, affected: r.affected, ms: r.ms, explain: r.explain })) };
}
// ------------------------------------------------------------------ the gate's counts and ceilings
// per tile and city-wide, samples per cause and column shape: lost = the pipeline lost a wall the source has; data = the
// source is open too (nowall: E2 empty edges; low: E3 open low, gaps under the walls included; short: E4 short walls);
// srcIn = E5 UrbIS faces wound inward; inward = drawn faces seen from behind; feetMoved = false feet the wall feet moved
// (always 0: a moved false foot is a torn wall); balcOrphan = balcony slabs with no wall behind (city <= 2)
const COUNTS = { lost: (t) => t.lost, data: (t) => t.data, srcIn: (t) => t.srcIn, "low.data": (t) => t.byShape["low.data"] || 0, "nowall.data": (t) => t.byShape["nowall.data"] || 0,
  "short.data": (t) => t.byShape["short.data"] || 0, inward: (t) => t.inward, feetMoved: (t) => t.feetMoved || 0, balcOrphan: (t) => t.balcOrphan };
const FIXED = { feetMoved: 0 };
const slack = (n) => n + Math.max(3, Math.ceil(n * 0.03));
function gateCheck(results, ceil, { all = false, eyesInside = null } = {}) {
  const fails = [];
  for (const r of results) {
    if (r.error) { fails.push(`${r.tile}: the tile build failed`); continue; }
    const c = ceil.tiles?.[r.tile];
    for (const [k, f] of Object.entries(COUNTS)) {
      const v = f(r.tally), lim = k in FIXED ? FIXED[k] : c?.[k];
      if (lim != null && v > lim) fails.push(`${r.tile} ${k} ${v} > ${lim}`);
    }
  }
  if (all) {
    const s = summary(results), t = s.sum;
    for (const [k, f] of Object.entries(COUNTS)) { const v = f(t), lim = k in FIXED ? FIXED[k] : ceil.city?.[k]; if (lim != null && v > lim) fails.push(`city ${k} ${v} > ${lim}`); }
    if (ceil.city?.open1 != null && s.open1 > ceil.city.open1) fails.push(`city buildings open >= 1 m2 ${s.open1} > ${ceil.city.open1}`);
    if (t.balcOrphan > (ceil.city?.balcOrphanMax ?? 2)) fails.push(`city orphan balconies ${t.balcOrphan} > ${ceil.city?.balcOrphanMax ?? 2}`);
  }
  if (eyesInside) for (const e of eyesInside) fails.push(`eye inside a building: ${e.file.split(/[\\/]/).pop()} ${e.id} at ${e.at} (${e.tile} solid ${e.solid})`);
  return fails;
}
// the self-test: the tiles where each old behaviour shows (I3: the feet's false feet; F7: the empty UrbIS edges)
const SELF = [{ what: "?feet=old (every lowest vertex a foot)", tiles: ["I3"], over: { feetFix: false } }, { what: "?wallempty=old (empty UrbIS edges skipped)", tiles: ["F7"], over: { wallEmpty: false } }];
let exit = 0;
if (IS_MAIN && TILES.length) {
  const results = await census(TILES);
  out.tiles = summary(results);
  const st = out.tiles;
  console.log(`\n${st.n} tiles, ${st.buildings} buildings: ${st.open1} open >= 1 m2 (${st.open10} >= 10 m2), by cause ${JSON.stringify(st.byCause)}; false feet moved ${st.sum.feetMoved} (${st.feetBuildings} buildings)`);
  console.log(`sum ${JSON.stringify(st.sum)}`);
  if (!QUIET) for (const w of st.worst.slice(0, 15)) console.log(`  ${w.tile} ${String((w.missM2 + w.inwardM2).toFixed(1)).padStart(6)} m2 solid ${w.solid} bu ${w.bu} ${w.cause} (data ${w.data} srcIn ${w.srcIn} lost ${w.lost} [feet ${w.lostFeet}, moved ${w.feetMoved}]; recess ${w.recess} through ${w.through}; short ${w.short} nowall ${w.nowall} low ${w.low}) at ${w.x},${w.y},${w.z}`);
  if (GATE) {
    const file = join(ROOT, GATE), ceil = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { tiles: {}, city: {} };
    if (RATCHET) {
      // down only: each ceiling to this run's count + slack where that is lower (a new tile / key: this run + slack)
      const down = (old, v) => (old == null ? slack(v) : Math.min(old, slack(v)));
      for (const r of results) { if (r.error) continue; const c = ceil.tiles[r.tile] ||= {}; for (const [k, f] of Object.entries(COUNTS)) if (!(k in FIXED)) c[k] = down(c[k], f(r.tally)); }
      if (ALL) { const t = st.sum; for (const [k, f] of Object.entries(COUNTS)) if (!(k in FIXED)) ceil.city[k] = down(ceil.city[k], f(t)); ceil.city.open1 = down(ceil.city.open1, st.open1); ceil.city.balcOrphanMax = 2; }
      ceil.note = "tools/audit/missingWallsCensus.mjs --ratchet (claude/walls2, rule walls-closed-from-street): per tile and city-wide ceilings, each this run's count + max(3, 3 %), only ever lowered; feetMoved is always 0; balcOrphanMax 2";
      ceil.when = out.when;
      writeFileSync(file, JSON.stringify(ceil, null, 1) + "\n");
      console.log(`ceilings written down to this run: ${GATE}`);
    }
    const fails = gateCheck(results, ceil, { all: ALL, eyesInside: out.eyes?.inside || [] });
    out.gate = { fails };
    for (const f of fails) console.log(`FAIL ${f}`);
    if (fails.length) exit = 1;
    if (SELFTEST) {
      // the row's own test: each old behaviour must FAIL the same ceilings (else the row would not see the class come back)
      for (const t of SELF) {
        const r = await census(t.tiles, { BUILD_OVER: JSON.stringify({ ...JSON.parse(process.env.BUILD_OVER || "{}"), ...t.over }) });
        const f = gateCheck(r, ceil);
        console.log(`selftest ${t.what} on ${t.tiles.join(" ")}: ${f.length ? `fails as it must (${f.slice(0, 3).join("; ")})` : "PASSES: the row does not see this class (FAIL)"}`);
        if (!f.length) exit = 1;
      }
    }
    console.log(exit ? "walls: FAIL" : `walls: pass (${results.length} tiles, ${st.open1} buildings open >= 1 m2, false feet moved ${st.sum.feetMoved}, orphan balconies ${st.sum.balcOrphan}, eyes inside ${out.eyes?.inside.length ?? "not read"})`);
  }
} else if (IS_MAIN && GATE && out.eyes?.inside.length) { for (const e of out.eyes.inside) console.log(`FAIL eye inside a building: ${e.id} at ${e.at}`); exit = 1; }
if (IS_MAIN && OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
if (IS_MAIN) process.exit(exit);
