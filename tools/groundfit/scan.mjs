// GROUND FIT SCAN (docs/GROUND_FIT.md, owner asks #13 / #14): every building of every tile against the ground AS DRAWN
// (the tile worker's terrain after carve / weld, and the measured street surfaces on top), in node.
//   node --import ./tools/road_audit/register.mjs tools/groundfit/scan.mjs [TILES...] [--out file.json] [--old]
// Per building, on its wall faces (viewer/facadeGeom.js analyseBuildings, the same faces the city paints / kits):
//   door   the drawn ground in front of the front door (the widest street face's door bay, faceOpenings) minus the
//          door's threshold (the face's ground-floor line): > 0 = the ground cuts across the door
//   front  the highest drawn ground along the street faces' foot minus the ground-floor line (plinth 0.5 m, sill 0.92 m)
//   float  the highest gap between a wall's lowest edge and the drawn ground just outside it (JOINS: an open edge)
//   lift   the ground-floor line over the ground in front of the door (a door in the air, no steps)
// --old: the entry flag groundFit:false (the bases / terrain as before this round)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildTile, tiles, ROOT } from "../roadfix/tile.mjs";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { faceOpenings } from "../../viewer/interior/facadeWindows.js";
import { drawnGround } from "../../viewer/groundFit.js";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const out = oi >= 0 ? args[oi + 1] : null;
const old = args.includes("--old");
const names = args.filter((a, i) => !a.startsWith("--") && i !== oi + 1);
const todo = names.length ? names : tiles.map((t) => t.name);
const OUT = 0.35;                           // m outside the wall where the ground is read

/** the highest drawn street surface at (x, z): a 2 m bucket grid of the road parts' near-flat triangles */
function surfaceIndex(parts) {
  const B = 2, cells = new Map(), tris = [];
  for (const [name, p] of Object.entries(parts)) {
    if (!p?.index || name === "paint") continue;
    const P = p.position, I = p.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;
      const k = tris.length;
      tris.push([P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], P[c], P[c + 1], P[c + 2]]);
      const i0 = Math.floor(Math.min(P[a], P[b], P[c]) / B), i1 = Math.floor(Math.max(P[a], P[b], P[c]) / B);
      const j0 = Math.floor(Math.min(P[a + 2], P[b + 2], P[c + 2]) / B), j1 = Math.floor(Math.max(P[a + 2], P[b + 2], P[c + 2]) / B);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = i * 100003 + j; let l = cells.get(key); if (!l) cells.set(key, (l = [])); l.push(k); }
    }
  }
  const f = (x, z, all = null) => {
    const l = cells.get(Math.floor(x / B) * 100003 + Math.floor(z / B));
    let best = -Infinity;
    if (l) for (const k of l) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris[k];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * ay + l2 * by + l3 * cy;
      if (all) all.push(y);
      if (y > best) best = y;
    }
    return best;
  };
  return f;
}

/** the lowest wall edge at u on a face: its triangles in (u, y) */
function footAt(T, u) {
  let lo = Infinity;
  for (const [a, b, c] of T) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    if ((p[0] - u) * (q[0] - u) > 0 || Math.abs(q[0] - p[0]) < 1e-6) continue;
    const y = p[1] + (q[1] - p[1]) * (u - p[0]) / (q[0] - p[0]);
    if (y < lo) lo = y;
  }
  return lo;
}

const rows = [], perTile = [];
const t00 = Date.now();
for (const T of todo) {
  const t0 = Date.now();
  const d = await buildTile(T, { keepNet: true, ...(old ? { groundFit: false } : {}) });
  const ms = Date.now() - t0;
  const { hm, bounds } = d;
  const road = surfaceIndex(d.road.parts);
  const drawn = (x, z) => Math.max(hm.surface(x, z), road(x, z));
  const e = tiles.find((t) => t.name === T);
  const base = pathOf(e.files.buildings), bin = pathOf(e.files.buildingsBin);
  const bDoc = JSON.parse(readFileSync(base, "utf8")), bb = readFileSync(bin);
  const bBuf = bb.buffer.slice(bb.byteOffset, bb.byteOffset + bb.byteLength);
  // every drawn roof (a wall standing on a lower roof is not floating)
  const V = bb.readUInt32LE(0), Tn = bb.readUInt32LE(4);
  const BP = new Float32Array(bBuf, 8, V * 3), BI = new Uint32Array(bBuf, 8 + V * 12, Tn * 3);
  const ri = [];
  for (const b of bDoc.buildings) for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) ri.push(BI[t * 3], BI[t * 3 + 1], BI[t * 3 + 2]);
  const roofIdx = surfaceIndex({ roofs: { position: BP, index: ri } });
  const onRoofAt = (x, z, y) => { const a = []; roofIdx(x, z, a); return a.some((v) => v > y - 0.6 && v < y + 0.3); };
  const faces = new Map();
  const spy = { face(f) { if (!faces.has(f.building)) faces.set(f.building, []); faces.get(f.building).push(f); return { on: 0 }; }, finish: () => null };
  analyseBuildings(bDoc, bBuf, d.roads, d.feats, { kit: spy, ground: old ? null : drawnGround(hm, d.road.parts) });
  let nb = 0;
  for (const b of bDoc.buildings) {
    const key = String(b.attrs?.BU_ID ?? b.id);
    if (b.attrs?._landmark) continue;
    const fl = faces.get(b);
    if (!fl) continue;
    nb++;
    const c = b.footprint[0].reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]).map((v) => v / b.footprint[0].length);
    if (c[0] < bounds.x0 || c[0] >= bounds.x1 || c[1] < bounds.z0 || c[1] >= bounds.z1) continue;
    let door = null, front = -Infinity, frontAt = null, float = 0, floatAt = null, frontLen = 0, cutLen = 0;
    for (const f of fl) {
      if (f.partyH >= 999 || f.width < 1) continue;
      let dd = 0, k = 0;
      for (const { p } of f.tris) for (const q of p) { dd += q[0] * f.nx + q[2] * f.nz; k++; }
      dd /= k;
      const at = (u, o) => [f.tx * (f.u0 + u) + f.nx * (dd + o), f.tz * (f.u0 + u) + f.nz * (dd + o)];
      const Tu = f.tris.map(({ p }) => p.map((q) => [q[0] * f.tx + q[2] * f.tz - f.u0, q[1]]));
      const fb = f.base;
      for (let u = 0.25; u <= f.width - 0.25; u += 0.5) {
        const [x, z] = at(u, OUT), g = drawn(x, z), foot = footAt(Tu, u);
        if (roofIdx(x, z) > g + 1) continue;                    // inside another building: not seen
        if (foot !== Infinity && foot - g > float && foot - g < 1.5 && !onRoofAt(x, z, foot)) { float = foot - g; floatAt = [x, z]; }
        if (f.street) {
          frontLen += 0.5;
          if (g - fb > 0.15) cutLen += 0.5;
          if (g - fb > front) { front = g - fb; frontAt = [x, z]; }
        }
      }
      if (f.street && f.doorFace) {
        const ops = faceOpenings({ width: f.width, eaves: f.eaves, partyH: f.partyH, street: 1, rnd: Math.fround(f.rnd), landmark: false, shop: f.shopW, shopU: f.shopU });
        const o = ops.find((q) => q.kind === "door");
        if (o) {
          let g = -Infinity;
          for (const u of [o.u0 + 0.1, (o.u0 + o.u1) / 2, o.u1 - 0.1]) { const [x, z] = at(u, OUT); const gg = drawn(x, z); if (roofIdx(x, z) > gg + 1) { g = NaN; break; } g = Math.max(g, gg); }
          const [x, z] = at((o.u0 + o.u1) / 2, OUT);
          if (!Number.isNaN(g)) door = { rise: g - fb, at: [x, z], y: fb, n: [+f.nx.toFixed(3), +f.nz.toFixed(3)] };
        }
      }
    }
    rows.push({ tile: T, key, c: c.map((v) => +v.toFixed(1)), base: b.base, fitBase: fl[0].base, height: b.height,
      door: door ? +door.rise.toFixed(2) : null, doorAt: door?.at.map((v) => +v.toFixed(1)), doorN: door?.n, doorY: door ? +door.y.toFixed(2) : null,
      front: front === -Infinity ? null : +front.toFixed(2), frontAt: frontAt?.map((v) => +v.toFixed(1)), cutFrac: frontLen ? +(cutLen / frontLen).toFixed(2) : 0,
      float: +float.toFixed(2), floatAt: floatAt?.map((v) => +v.toFixed(1)) });
  }
  const R = rows.filter((r) => r.tile === T);
  const cnt = (f) => R.filter(f).length;
  const s = { tile: T, ms, worker: d.times, buildings: R.length,
    door05: cnt((r) => r.door > 0.05), door15: cnt((r) => r.door > 0.15), door50: cnt((r) => r.door > 0.5), door100: cnt((r) => r.door > 1),
    front50: cnt((r) => r.front > 0.5), front92: cnt((r) => r.front > 0.92),
    lift50: cnt((r) => r.door !== null && r.door < -0.5),
    float05: cnt((r) => r.float > 0.05), float30: cnt((r) => r.float > 0.3) };
  perTile.push(s);
  console.log(`${T} ${ms} ms: ${R.length} bld, door>5cm ${s.door05} >15cm ${s.door15} >0.5m ${s.door50} >1m ${s.door100}; front>0.5 ${s.front50} >0.92 ${s.front92}; door lifted>0.5 ${s.lift50}; float>5cm ${s.float05} >30cm ${s.float30}`);
}
function pathOf(f) { return join(ROOT, "data/tiles", f.split("?")[0]); }
const sum = (k) => perTile.reduce((a, s) => a + s[k], 0);
const total = Object.fromEntries(["buildings", "door05", "door15", "door50", "door100", "front50", "front92", "lift50", "float05", "float30"].map((k) => [k, sum(k)]));
console.log("TOTAL", JSON.stringify(total), `${((Date.now() - t00) / 1000).toFixed(0)} s`);
const worst = [...rows].filter((r) => r.door !== null).sort((a, b) => b.door - a.door).slice(0, 30);
for (const r of worst) console.log(`  door ${r.door} front ${r.front} ${r.tile} ${r.key} at ${r.doorAt}`);
if (out) writeFileSync(out, JSON.stringify({ old, total, perTile, rows }, null, 0));
