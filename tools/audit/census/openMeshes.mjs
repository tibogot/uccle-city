// CENSUS CLASS A: BUILDINGS / LANDMARKS WITH MISSING WALLS (claude/census 2026-11-18; owner playtest: Saint-Pierre church
// with whole wall pieces missing, screenshot 88). Report only: no gate row yet.
//
// One test for everything that is a building, as it is DRAWN (back faces culled):
//   PROBE  horizontal rays from outside at every 0.5 m of height and 0.4 m across, from 16 directions (landmarks) or
//          straight in through every outer footprint edge (tile buildings, 3 heights). A ray FAILS when
//            back     its first hit is a face seen from behind: the street sees the inside of a wall / roof through a hole
//            through  it runs >= THRU m under the building's own roof (the drawn top-down height raster, DSM) without
//                     meeting any face, and comes out from under it (heroshell 2026-11-18: before that, a ray grazing
//                     under a cornice into a re-entrant corner counted): the street sees through the building
//          A fail stands for 0.4 x 0.5 m (landmarks) / its sample cell (tiles): summed per building = the hole m2.
//   LOOPS  (landmarks, info) open boundary-edge loops of the welded LOD mesh with a perimeter > 2 m.
// Landmarks: every hero GLB (models/<hero>/<hero>.glb + .json placement), each LOD level apart (what is drawn together).
// Tiles: the tile worker's own build (viewer/tileData.js buildTileData: wall repair, feet, façade kit cut, heroes' solids
// hidden) -> walls + walls.kit + details + roofs; the outer edges of every footprint of data/tiles/<T>/buildings.json
// (party stretches skipped: a point 0.4 m out inside another footprint).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/openMeshes.mjs [--heroes] [--tiles T... | --all] [--jobs 4] [--out FILE]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, Bvh, dsmOf, soupFromParts, loopsOf, buildTile, allBuiltTiles, footprintIndex, concatSoups, streetAt, tileOf } from "./lib_mesh.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const CHILD = opt("--child", null), OUT = opt("--out", null), JOBS = +opt("--jobs", 4);
const HEROES = flag("--heroes"), ALL = flag("--all"), TILES_F = flag("--tiles");
const ONLY_HERO = opt("--hero", null);
const GLB_OVERRIDE = opt("--glb", null);   // with --hero: probe this GLB instead of models/<hero>.glb (a candidate build)
const TILES = ALL ? allBuiltTiles() : argv.filter((a) => !a.startsWith("--")).map((t) => t.toUpperCase());
const THRU = 1.5;         // m under the own roof without a face = see-through
const MIN_CLUSTER = 1.0;  // m2: a hole cluster smaller than this is not listed

export const HERO_LIST = ["augustin/augustin", "calevoet_station/calevoet", "latourdefrein/latourdefrein", "observatory/observatory", "papenkasteel/papenkasteel",
  "police_rouge/police", "rosaire/rosaire", "russian/russian", "sacrecoeur/sacrecoeur", "saintmarc/saintmarc", "stalle/stalle", "stjob/stjob",
  "stpierre/stpierre", "townhall/townhall", "vanbuuren/vanbuuren", "wolvendael_chateau/wolvendael",
  "heros/heros", "villa/villa", "underpass/calevoet"];          // heroshell 2026-11-18: the Square des Heros monument (it hides solid 534309) was never probed; underpass/calevoet: the U1 kiosks (claude/underpass1)
/** LOD level of a GLB node: 0 the model (+ its _door / _slates / _courses), 1 _lod1 (else _far), 2 _lod2 / _xfar */
export function levelsOf(nodes) {
  const has = (re) => nodes.some((n) => re.test(n));
  const L = { 0: (n) => !/_(far|xfar|lod[1-9])$/.test(n) && !/_collision$/.test(n) };   // (a scripted "_lod0" node is level 0; a never-drawn "_collision" mesh is no level: claude/underpass1)
  if (has(/_lod1$/)) L[1] = (n) => /_lod1$/.test(n); else if (has(/_far$/)) L[1] = (n) => /_far$/.test(n);
  if (has(/_lod2$/)) L[2] = (n) => /_lod2$/.test(n); else if (has(/_xfar$/)) L[2] = (n) => /_xfar$/.test(n);
  return L;
}
export function heroPlacement(name) {
  const pl = JSON.parse(readFileSync(join(ROOT, "models", name + ".json"), "utf8")).placement;
  const [px, py, pz] = pl.city_local_position, r = pl.rotation_y_rad, c = Math.cos(r), s = Math.sin(r);
  return { toCity: (x, y, z) => [px + c * x + s * z, py + y, pz - s * x + c * z], pl };
}
export function placeSoup(pos, toCity) {
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) { const q = toCity(pos[i], pos[i + 1], pos[i + 2]); out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2]; }
  return out;
}

/** the 16-direction probe of one soup (city frame): fails clustered on a 3 m grid at the ray's entry under the roof */
function probeAround(pos, ground) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < pos.length; i += 3) { x0 = Math.min(x0, pos[i]); x1 = Math.max(x1, pos[i]); y0 = Math.min(y0, pos[i + 1]); y1 = Math.max(y1, pos[i + 1]); z0 = Math.min(z0, pos[i + 2]); z1 = Math.max(z1, pos[i + 2]); }
  const bvh = new Bvh(pos), dsm = dsmOf(pos, x0 - 1, z0 - 1, x1 + 1, z1 + 1, 0.5);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.hypot(x1 - x0, z1 - z0) / 2 + 2;
  const DS = 0.4, DH = 0.5, cellA = DS * DH;
  // the ground under the model: the lowest drawn height near each column is unknown, so heights from y0 + 0.3
  const clusters = new Map(); let back = 0, thru = 0, rays = 0;
  const perDir = [];
  for (let a = 0; a < 16; a++) {
    const th = (a / 16) * Math.PI * 2, dx = Math.cos(th), dz = Math.sin(th), px = -dz, pz = dx;
    let fails = 0; const F = new Map();   // (column, row) -> fail: kept only when a vertical neighbour fails too (>= 1 m tall: no seam lines)
    for (let si = 0, s = -R; s <= R; si++, s += DS) for (let hi = 0, h = y0 + 0.3; h < y1 - 0.3; hi++, h += DH) {
      const ox = cx - dx * R + px * s, oz = cz - dz * R + pz * s;
      // the ray's run under the roof: entry = first cell with DSM > h + 0.5
      let entry = -1, tEntry = 0;
      const step = 0.25, tEnd = 2 * R;
      for (let t = 0; t < tEnd; t += step) { const H = dsm.at(ox + dx * t, oz + dz * t); if (H > h + 0.5) { entry = t; break; } }
      if (entry < 0) continue;                       // passes beside / over the building
      if (ground && !(h > ground(ox + dx * entry, oz + dz * entry) + 0.3)) continue;   // under the ground there
      rays++; tEntry = entry;
      const hit = bvh.hit(ox, h, oz, dx, 0, dz, tEnd);
      let bad = null;
      if (hit && hit.back) bad = "back";
      else {
        // under-roof run before the hit (or to the end)
        // (heroshell: and then comes OUT from under the roof before its hit: a ray grazing along a wall under the
        // cornice into a re-entrant corner ends on that corner's front face, still under the roof: not a hole)
        const tStop = hit ? hit.t : tEnd;
        let deepAt = -1;
        for (let t = tEntry + 2.0; t < tStop; t += step) if (dsm.deep(ox + dx * t, oz + dz * t, h, 1.5)) { deepAt = t; break; }
        if (deepAt >= 0) for (let t = deepAt; t < tStop; t += step) if (!(dsm.at(ox + dx * t, oz + dz * t) > h + 0.5)) { bad = "through"; break; }
      }
      if (!bad) continue;
      F.set(si * 100000 + hi, { bad, ex: ox + dx * tEntry, ez: oz + dz * tEntry, h });
    }
    for (const [key, f] of F) {
      if (!F.has(key - 1) && !F.has(key + 1)) continue;
      const { bad, ex, ez, h } = f;
      fails++; if (bad === "back") back++; else thru++;
      const k = `${Math.floor(ex / 3)},${Math.floor(ez / 3)}`;
      let c = clusters.get(k); if (!c) clusters.set(k, (c = { n: 0, back: 0, x: 0, y: 0, z: 0, dirs: new Set() }));
      c.n++; if (bad === "back") c.back++; c.x += ex; c.y += h; c.z += ez; c.dirs.add(a);
    }
    perDir.push(+(fails * cellA).toFixed(1));
  }
  const list = [...clusters.values()].map((c) => ({ m2: +((c.n / c.dirs.size) * cellA).toFixed(1), back: c.back, x: +(c.x / c.n).toFixed(1), y: +(c.y / c.n).toFixed(1), z: +(c.z / c.n).toFixed(1), dirs: c.dirs.size }))
    .filter((c) => c.m2 >= MIN_CLUSTER).sort((p, q) => q.m2 - p.m2);
  return { rays, holeM2: Math.max(...perDir), perDir, backSamples: back, throughSamples: thru, clusters: list };
}

let GROUND = null;
async function heroes() {
  const { groundAt } = await import("./lib_mesh.mjs"); GROUND = await groundAt();
  const { readGlb } = await import(pathToFileURL(join(ROOT, "tools/mesh_audit/glb.mjs")).href);
  const res = [];
  for (const name of HERO_LIST.filter((n) => !ONLY_HERO || n.includes(ONLY_HERO))) {
    const g = await readGlb(GLB_OVERRIDE && ONLY_HERO ? GLB_OVERRIDE : join(ROOT, "models", name + ".glb"));
    const nodes = [...new Set(g.parts.map((p) => p.node))];
    const L = levelsOf(nodes), { toCity } = heroPlacement(name);
    for (const [lv, keep] of Object.entries(L)) {
      const t0 = Date.now();
      const local = soupFromParts(g.parts, keep), pos = placeSoup(local, toCity);
      const pr = probeAround(pos, GROUND);
      const loops = loopsOf(pos, 0.002).filter((l) => l.perim > 2);
      const r = { hero: name.split("/")[0], level: +lv, nodes: nodes.filter(keep), tris: pos.length / 9, ...pr, openLoops2m: loops.length,
        openLoopM: +loops.reduce((s, l) => s + l.perim, 0).toFixed(0), worstLoops: loops.sort((a, b) => b.perim - a.perim).slice(0, 5).map((l) => ({ perim: +l.perim.toFixed(1), area: +l.area.toFixed(1), x: +l.x.toFixed(1), y: +l.y.toFixed(1), z: +l.z.toFixed(1) })), ms: Date.now() - t0 };
      res.push(r);
      console.log(`${r.hero.padEnd(20)} L${lv} ${String(r.tris).padStart(7)} tris  hole ${String(r.holeM2).padStart(6)} m2 (worst direction)  back ${r.backSamples} through ${r.throughSamples}  clusters ${r.clusters.length}  open loops > 2 m ${r.openLoops2m} (${r.openLoopM} m)  ${r.ms} ms`);
    }
  }
  return res;
}

// ------------------------------------------------------------------------------------------------ tiles
async function tileChild(T) {
  const t0 = Date.now();
  const { d, bDoc } = await buildTile(T);
  const B = d.buildings;
  const soup = concatSoups([{ name: "walls", pos: B.walls?.position }, { name: "kitWalls", pos: B.walls?.kit?.position }, { name: "details", pos: B.details?.position }, { name: "roofs", pos: B.roofs?.position }]);
  const pos = soup.pos, bvh = new Bvh(pos);
  const [bx0, bx1] = [d.bounds.x0 - 30, d.bounds.x1 + 30], [bz0, bz1] = [d.bounds.z0 - 30, d.bounds.z1 + 30];
  const dsm = dsmOf(pos, bx0, bz0, bx1, bz1, 0.5);
  const fp = footprintIndex(bDoc.buildings);
  const { Heightmap } = await import(pathToFileURL(join(ROOT, "viewer/heightmap.js")).href);
  const hm = Heightmap.from(d.hdr, d.y, d.orig);
  const SP = 0.5;                               // m along each edge
  const per = [];
  let rays = 0, fails = 0;
  bDoc.buildings.forEach((b, bi) => {
    const ring = b.footprint[0], n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
    // winding: outward normal from the signed area
    let A = 0; for (let i = 0; i < n; i++) { const [ax, az] = ring[i], [cx, cz] = ring[(i + 1) % n]; A += ax * cz - cx * az; }
    const sgn = A > 0 ? 1 : -1;
    const top = b.top ?? b.base + b.height;
    const hs = [b.base + 1.2, (b.base + top) / 2, top - 1.0].filter((h, i, a) => h > b.base + 0.8 && h < top - 0.5 && (i === 0 || h - a[i - 1] > 1));
    let bad = 0, back = 0, thru = 0, sx = 0, sy = 0, sz = 0, tot = 0;
    for (let i = 0; i < n; i++) {
      const [ax, az] = ring[i], [cx, cz] = ring[(i + 1) % n], L = Math.hypot(cx - ax, cz - az);
      if (L < 1) continue;
      const tx = (cx - ax) / L, tz = (cz - az) / L, ox = tz * sgn, oz = -tx * sgn;   // outward
      // (check: the outward point is outside this footprint)
      for (let u = SP / 2; u < L; u += SP) {
        const ex = ax + tx * u, ez = az + tz * u;
        if (fp.pip(ex + ox * 0.3, ez + oz * 0.3, ring)) continue;            // winding guess wrong here (concave sliver)
        if (fp.at(ex + ox * 0.4, ez + oz * 0.4) >= 0) continue;               // party stretch
        for (const h of hs) {
          const ix = ex - ox * 0.6, iz = ez - oz * 0.6;
          if (!(dsm.at(ix, iz) > h + 0.5)) continue;                          // no own roof over this height here (a lower part)
          if (!(h > Math.max(hm.surface(ex + ox * 1.0, ez + oz * 1.0), hm.surface(ix, iz)) + 0.6)) continue;   // under the drawn ground there (a slope)
          tot++; rays++;
          // start in the open: the first point out from the edge (0.3 .. 6 m) with nothing drawn over the ray's height
          // (walls of upper floors can stand out of the ground footprint: the probe must start outside the DRAWN mass)
          let off = -1; for (let t = 0.3; t <= 6; t += 0.25) { const H = dsm.at(ex + ox * t, ez + oz * t); if (!(H > h - 0.2)) { off = t; break; } }
          if (off < 0) continue;
          const sx0 = ex + ox * off, sz0 = ez + oz * off;
          const hit = bvh.hit(sx0, h, sz0, -ox, 0, -oz, off + 60);
          let why = null;
          if (hit && hit.back) why = "back";               // (a back face nearer than the edge - 0.5 m: a neighbour's piece)
          else {
            // see-through: the ray crosses the building's own footprint (>= 2 m under its own roof) and comes out on the
            // other side with no face met (recessed loggias / set-back fronts end on a wall: not counted)
            let inside = 0, out = false;
            for (let t = off + 0.25; t < (hit ? hit.t : off + 60); t += 0.25) {
              const qx = sx0 - ox * t, qz = sz0 - oz * t;
              if (fp.pip(qx, qz, ring)) { if (dsm.at(qx, qz) > h + 0.5) inside += 0.25; }
              else if (inside > 0) { out = true; break; }
            }
            if (out && inside >= 2) why = "through";
          }
          if (!why) continue;
          bad++; fails++; if (why === "back") back++; else thru++;
          sx += ex; sy += h; sz += ez;
        }
      }
    }
    if (bad >= 2) {                       // (one sample alone: noise)
      const cellA = SP * ((top - b.base) / Math.max(1, hs.length));
      per.push({ id: b.attrs?.BU_ID?.split("/").pop() || b.id.split("/").pop(), solid: b.id.split("/").pop(), m2: +(bad * cellA).toFixed(1), samples: bad, of: tot, back, through: thru, x: +(sx / bad).toFixed(1), y: +(sy / bad).toFixed(1), z: +(sz / bad).toFixed(1) });
    }
  });
  per.sort((a, b) => b.m2 - a.m2);
  for (const p of per.slice(0, 15)) p.street = streetAt(T, p.x, p.z);
  return { tile: T, buildings: bDoc.buildings.length, rays, fails, affected: per.length, affected1: per.filter((p) => p.m2 >= 1).length, m2: +per.reduce((s, p) => s + p.m2, 0).toFixed(0), worst: per.slice(0, 15), ms: Date.now() - t0 };
}

/** one hero's probe at every LOD level (the gate, tools/audit/heroShell.mjs): [{ level, tris, holeM2, clusters, ... }] */
export async function probeHero(name, glbPath = null) {
  const { groundAt } = await import("./lib_mesh.mjs"); GROUND ??= await groundAt();
  const { readGlb } = await import(pathToFileURL(join(ROOT, "tools/mesh_audit/glb.mjs")).href);
  const g = await readGlb(glbPath || join(ROOT, "models", name + ".glb"));
  const nodes = [...new Set(g.parts.map((p) => p.node))];
  const L = levelsOf(nodes), { toCity } = heroPlacement(name);
  const out = [];
  for (const [lv, keep] of Object.entries(L)) {
    const pos = placeSoup(soupFromParts(g.parts, keep), toCity);
    out.push({ hero: name.split("/")[0], level: +lv, tris: pos.length / 9, ...probeAround(pos, GROUND) });
  }
  return out;
}

const IS_MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (IS_MAIN && CHILD) {
  const r = await tileChild(CHILD);
  console.log(JSON.stringify(r));
  process.exit(0);
}
const out = { when: new Date().toISOString() };
if (IS_MAIN && (HEROES || (!TILES.length && !TILES_F))) out.heroes = await heroes();
if (IS_MAIN && TILES.length) {
  const queue = TILES.slice(), results = [];
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--max-old-space-size=3072", "--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let so = "", se = ""; p.stdout.on("data", (b) => { so += b; }); p.stderr.on("data", (b) => { se += b; });
    p.on("close", (code) => {
      const line = so.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: child exit ${code}: ${se.trim().split("\n").slice(-3).join(" / ")}`); results.push({ tile: T, error: true }); }
      else { const r = JSON.parse(line); results.push(r); console.log(`${T}: ${r.buildings} buildings, ${r.rays} rays, ${r.fails} fails, ${r.affected} buildings open (${r.affected1} >= 1 m2), ${r.m2} m2 (${r.ms} ms)`); }
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  const ok = results.filter((r) => !r.error);
  const worst = ok.flatMap((r) => r.worst.map((w) => ({ tile: r.tile, ...w }))).sort((a, b) => b.m2 - a.m2);
  out.tiles = { n: ok.length, errors: results.length - ok.length, buildings: ok.reduce((s, r) => s + r.buildings, 0), affected: ok.reduce((s, r) => s + r.affected, 0), affected1: ok.reduce((s, r) => s + r.affected1, 0), m2: ok.reduce((s, r) => s + r.m2, 0), worst: worst.slice(0, 30), perTile: results };
  console.log(`tiles ${ok.length}: ${out.tiles.affected} buildings with a probe fail (${out.tiles.affected1} >= 1 m2), ${out.tiles.m2} m2`);
  for (const w of worst.slice(0, 10)) console.log(`  ${w.tile} ${String(w.m2).padStart(6)} m2  ?at=${w.x},${w.z}  bu ${w.id}  back ${w.back} through ${w.through}  ${w.street || ""}`);
}
if (IS_MAIN && OUT) writeFileSync(join(ROOT, OUT), JSON.stringify(out, null, 1));
