// IVY AND CLIMBERS, grown per tile: data/plants/<T>.ivy.bin (+ ivy_summary.json). Deterministic.
//   node tools/plants/build_ivy.mjs [--all | <tile>...]
// WHERE (docs/FOLIAGE.md "City"; the city's own walls, so the ivy is on what is drawn):
//   house walls  the façade analysis of the tile (viewer/facadeGeom.js analyseBuildings, as tools/gardens/faces.mjs):
//                every wall face that is not a party wall, not a landmark, >= 2.5 m wide; the window grid the city
//                paints / the façade kit fills (viewer/interior/facadeWindows.js faceOpenings) is cut out (the ivy
//                deflects round the frames, never on the glass). Odds per face: a BLIND wall (no opening) 35 %, a side /
//                back wall 10 %, a street front 3.5 % (6 % for the maisons de maître and villas: old houses); up to 9 m
//   garden walls the front-garden kit's brick walls >= 0.7 m (data/gardens): 25 % of the runs, on the street side,
//                over the coping and hanging down a little
//   fences       the kit's railings: 10 % of the runs get a climber grown through the bars from the garden side
// HOW: viewer/foliage/ivyGrow.js (the Foliage Lab's ivy rules: mounds over a few roots, sideways spread on a density
// grid, deflection round windows, patchy leaves, ragged edge, trailing stems: no columns), seeded by the wall.
// OUTPUT: data/plants/<T>.ivy.json { contract, tile, walls: [{ o: [x, y, z] (bottom-left, world), t: [tx, tz] (along),
//   n: [nx, nz] (out of the wall), out (m off the plane), w, h (m), f (flags: 1 garden wall, 2 fence), g: growIvyData's
//   options (roots, maxHeight, avoid, seed, reach, maxBranches) }] }: the WALLS only; the city grows them in a worker
//   (viewer/plants/ivyWorker.js, the same deterministic growth: a few KB per tile instead of MB of leaves)
import fs from "fs";
import { analyseBuildings, hash01 } from "../../viewer/facadeGeom.js";
import { faceOpenings } from "../../viewer/interior/facadeWindows.js";
import { growIvyData } from "../../viewer/foliage/ivyGrow.js";
import { TYPE } from "../../viewer/buildingTypes.js";

const ROOT = new URL("../../", import.meta.url);
const OUT = new URL("data/plants/", ROOT);
const h01 = (s) => hash01(String(s));

function tileFaces(tile) {
  const dir = new URL(`data/tiles/${tile}/`, ROOT);
  const rd = (f) => fs.readFileSync(new URL(f, dir));
  const doc = JSON.parse(rd("buildings.json"));
  const bin = rd("buildings.bin"), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const roads = JSON.parse(rd("roads.json")), feats = JSON.parse(rd("features.json"));
  const faces = [];
  const kit = {
    finish() { return null; },
    face(f) {
      if (f.width < 2.5 || f.landmark || f.partyH > 0.01) return { on: false };
      let cx = 0, cz = 0, n = 0;
      for (const { p } of f.tris) for (const q of p) { cx += q[0]; cz += q[2]; n++; }
      cx /= n; cz /= n;
      const off = cx * f.nx + cz * f.nz;
      const at = (u) => { const uu = f.u0 + u; return [f.tx * uu + f.nx * off, f.tz * uu + f.nz * off]; };
      const b = f.building, BU = b.attrs?.BU_ID || b.id;
      const rnd = Math.fround(hash01(BU));
      const ops = faceOpenings({ width: Math.fround(f.width), eaves: Math.fround(f.eaves), partyH: Math.fround(f.partyH), street: f.street ? 1 : 0, rnd, landmark: false, shop: f.shopW, shopU: f.shopU, type: f.type, garage: f.garage });
      faces.push({ key: f.key, bu: String(BU), street: !!f.street, type: f.type, width: f.width, base: f.base, eaves: f.eaves, a: at(0), tx: f.tx, tz: f.tz, nx: f.nx, nz: f.nz,
        ops: ops.map((o) => [o.u0, o.h0, o.u1, o.h1 + 0.15]) });
      return { on: false };
    },
  };
  analyseBuildings(doc, buf, roads, feats, { kit });
  return faces;
}

function build(tile) {
  const t0 = Date.now();
  const walls = [];
  const stats = { walls: 0, blind: 0, side: 0, front: 0, gardenWalls: 0, fences: 0, leaves: 0 };
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const add = (o, wall, g, flags = 0) => {
    walls.push({ o: [r3(o.x), r3(o.y), r3(o.z)], t: [r3(o.tx), r3(o.tz)], n: [r3(o.nx), r3(o.nz)], out: r3(o.out || 0), w: r3(wall.width), h: r3(wall.height), f: flags,
      g: { roots: g.roots.map(r3), maxHeight: r3(g.maxHeight), avoid: (g.avoid || []).map((a) => a.map(r3)), seed: g.seed, reach: r3(g.reach), maxBranches: g.maxBranches } });
    if (COUNT) stats.leaves += growIvyData(wall, g).leaves.length;
  };
  // ---- house walls
  for (const f of tileFaces(tile)) {
    const blind = f.ops.length === 0, old = f.type === TYPE.MAITRE || f.type === TYPE.VILLA;
    const p = blind ? 0.15 : !f.street ? 0.045 : old ? 0.05 : 0.025;
    if (h01(f.key + "|ivy") >= p) continue;
    const r = h01(f.key + "|ivy2"), W = f.width, Hmax = Math.min(9, f.eaves - 0.35);
    if (Hmax < 2.2) continue;
    const nr = Math.max(1, Math.min(5, Math.round(W / (1.8 + 1.2 * r))));
    const roots = Array.from({ length: nr }, (_, i) => (i + 0.3 + 0.4 * h01(f.key + "|r" + i)) * W / nr);
    const sink = 0.3;                                    // roots start under the ground-floor line (the drawn ground meets them)
    add({ x: f.a[0], y: f.base - sink, z: f.a[1], tx: f.tx, tz: f.tz, nx: f.nx, nz: f.nz },
      { width: W, height: Hmax + sink },
      { roots, maxHeight: Math.min(Hmax + sink, (blind ? 3.5 + 6 * r : 2.5 + 5 * r) + sink), avoid: f.ops.map(([a, b, c, d]) => [a - 0.08, b + sink - 0.06, c + 0.08, d + sink]), seed: Math.floor(h01(f.key) * 1e6), reach: 2.8 + 1.4 * r, maxBranches: Math.min(420, Math.round(70 * W)) });
    stats.walls++; if (blind) stats.blind++; else if (!f.street) stats.side++; else stats.front++;
  }
  // ---- garden walls and fences (data/gardens: segments [x0, y0, z0, x1, y1, z1, style, wallH])
  const gp = new URL(`data/gardens/${tile}.json`, ROOT);
  if (fs.existsSync(gp)) {
    const gd = JSON.parse(fs.readFileSync(gp));
    let run = null;
    const runs = [];
    for (const s of gd.segs) {
      if (run && run.style === s[6] && Math.hypot(run.last[3] - s[0], run.last[5] - s[2]) < 0.05) { run.segs.push(s); run.last = s; }
      else { run = { style: s[6], segs: [s], last: s }; runs.push(run); }
    }
    for (const r of runs) {
      const st = gd.styles[r.style] || {}, s0 = r.segs[0], key = `${s0[0].toFixed(2)},${s0[2].toFixed(2)}`;
      const wall = st.kind === "wall" && !(st.rail >= 0) && s0[7] >= 0.7, fence = st.rail >= 0 && st.railH > 0;
      if (wall ? h01(key + "|gw") >= 0.25 : fence ? h01(key + "|fn") >= 0.1 : true) continue;
      for (const s of r.segs) {
        const dx = s[3] - s[0], dz = s[5] - s[2], L = Math.hypot(dx, dz); if (L < 0.6) continue;
        const tx = dx / L, tz = dz / L, nx = -tz, nz = tx;              // +z of the kit's frame = the street side
        const yb = Math.min(s[1], s[4]), h = s[7], seed = Math.floor(h01(key + s[0]) * 1e6);
        const nRt = Math.max(1, Math.round(L / 1.6)), roots = Array.from({ length: nRt }, (_, i) => (i + 0.5) * L / nRt);
        if (wall) {
          // on the street face (12.5 cm out of the centre line), up over the 8 cm coping
          add({ x: s[0], y: yb - 0.2, z: s[2], tx, tz, nx, nz, out: 0.125 }, { width: L, height: h + 0.45 }, { roots, maxHeight: h + 0.35, seed, reach: 2.0, maxBranches: Math.round(60 * L) }, 1);
          stats.gardenWalls++;
        } else {
          // a climber through the bars, from the garden side (4 cm behind the bars' plane: its normal faces the garden)
          const top = (st.wallH || 0) + 0.08 + st.railH;
          add({ x: s[0] + tx * L, y: yb - 0.2, z: s[2] + tz * L, tx: -tx, tz: -tz, nx: -nx, nz: -nz, out: 0.04 }, { width: L, height: top + 0.3 }, { roots, maxHeight: top + 0.15, seed, reach: 1.8, maxBranches: Math.round(45 * L) }, 2);
          stats.fences++;
        }
      }
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  const txt = JSON.stringify({ contract: "ivy-0.1", tile, walls });
  fs.writeFileSync(new URL(`${tile}.ivy.json`, OUT), txt);
  stats.kb = Math.round(txt.length / 1024); stats.ms = Date.now() - t0;
  return stats;
}
const COUNT = process.argv.includes("--count");

const args = process.argv.slice(2);
const tiles = args.filter((a) => !a.startsWith("--")).length ? args.filter((a) => !a.startsWith("--")) : args.includes("--all") ? fs.readdirSync(new URL("data/tiles/", ROOT)).filter((t) => fs.existsSync(new URL(`data/tiles/${t}/buildings.json`, ROOT))) : ["D8"];
const sum = { tiles: {}, total: {} };
for (const t of tiles) {
  const s = build(t);
  sum.tiles[t] = s;
  for (const [k, v] of Object.entries(s)) if (k !== "ms") sum.total[k] = (sum.total[k] || 0) + v;
  console.log(t, JSON.stringify(s));
}
if (args.includes("--all")) fs.writeFileSync(new URL("ivy_summary.json", OUT), JSON.stringify(sum, null, 1));
console.log(JSON.stringify(sum.total));
