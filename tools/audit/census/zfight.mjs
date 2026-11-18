// CENSUS CLASS G: COPLANAR OVERLAPPING FACES = Z-FIGHTING (claude/census 2026-11-18; owner playtest: shaking windows,
// Maison Dandoy's right window (87), a brick front on the Chaussée d'Alsemberg (93)). Report only: no gate row yet.
//
//   pairs   two faces facing the SAME way (normals within 3 deg), in one plane (separation over their overlap <= EPS 2 mm)
//           and overlapping > MIN 0.01 m2 (convex clip on the plane): they fight at any distance. Tile buildings as the
//           worker builds them (viewer/tileData.js buildTileData): walls, walls.kit (the kit-cut walls), details (cornices,
//           bands, sills, gutters, shop fascias, chimneys ...), roofs; attributed to the building whose footprint holds the
//           overlap (2 m slack). Landmarks: every hero GLB level (drawn together).
//   kitwall a façade-kit opening piece (windows, French windows, doors, garage, bay; viewer/facadeKit/placement.js) standing
//           on a wall drawn UNCUT (the painted walls mesh, not walls.kit): the painted wall plane runs through the kit's
//           frame / glass recess (the wall shader cuts only kit faces, aKit.x = 1): a painted window + the kit window in
//           one place, shimmering. Test: a ray from 0.5 m in front of the opening's middle meets the painted walls mesh
//           within 3 cm of the opening's wall plane.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/zfight.mjs [--heroes] [T... | --all] [--jobs 4] [--out FILE]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, Bvh, buildTile, allBuiltTiles, footprintIndex, concatSoups, coplanarPairs, soupFromParts, streetAt } from "./lib_mesh.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const CHILD = opt("--child", null), OUT = opt("--out", null), JOBS = +opt("--jobs", 4);
const HEROES = flag("--heroes"), ALL = flag("--all");
const TILES = ALL ? allBuiltTiles() : argv.filter((a) => !a.startsWith("--")).map((t) => t.toUpperCase());
const EPS = 0.002, MIN = 0.01;
const OPENING = ["winA", "winB", "winC", "frenchWin", "doorA", "doorB", "doorDeco", "doorNouveau", "doorModern", "garage", "bay"];
const HERO_LIST = ["augustin/augustin", "calevoet_station/calevoet", "latourdefrein/latourdefrein", "observatory/observatory", "papenkasteel/papenkasteel",
  "police_rouge/police", "rosaire/rosaire", "russian/russian", "sacrecoeur/sacrecoeur", "saintmarc/saintmarc", "stalle/stalle", "stjob/stjob",
  "stpierre/stpierre", "townhall/townhall", "vanbuuren/vanbuuren", "wolvendael_chateau/wolvendael"];

async function tileChild(T) {
  const t0 = Date.now();
  const { d, bDoc } = await buildTile(T);
  const B = d.buildings;
  const soup = concatSoups([{ name: "walls", pos: B.walls?.position }, { name: "kitWalls", pos: B.walls?.kit?.position }, { name: "details", pos: B.details?.position }, { name: "roofs", pos: B.roofs?.position }]);
  const fp = footprintIndex(bDoc.buildings);
  const pairs = coplanarPairs(soup.pos, { eps: EPS, minArea: MIN });
  const byB = new Map(), bySrc = {};
  let m2 = 0;
  for (const p of pairs) {
    const sk = [soup.names[soup.src[p.a]], soup.names[soup.src[p.b]]].sort().join("+");
    bySrc[sk] = (bySrc[sk] || 0) + 1; m2 += p.area;
    const bi = fp.at(p.x, p.z, 2);
    const key = bi >= 0 ? bi : -1;
    let e = byB.get(key); if (!e) byB.set(key, (e = { pairs: 0, m2: 0, x: p.x, y: p.y, z: p.z, top: 0, src: {} }));
    e.pairs++; e.m2 += p.area; e.src[sk] = (e.src[sk] || 0) + 1;
    if (p.area > e.top) { e.top = p.area; e.x = p.x; e.y = p.y; e.z = p.z; }
  }
  // kit opening pieces on an uncut (painted) wall
  const painted = B.walls?.position?.length ? new Bvh(B.walls.position) : null;
  const S = B.kit?.stride || 14, kitBad = [];
  let kitN = 0;
  for (const piece of OPENING) {
    const a = B.kit?.pieces?.[piece]; if (!a || !painted) continue;
    for (let i = 0; i < a.length; i += S) {
      const [x, y, z, nx, nz, w, h] = a.subarray(i, i + 7); kitN++;
      const cy = y + h / 2;
      const hit = painted.hit(x + nx * 0.5, cy, z + nz * 0.5, -nx, 0, -nz, 0.6);
      if (hit && Math.abs(hit.t - 0.5) < 0.03) {
        const bi = fp.at(x, z, 2);
        kitBad.push({ piece, x: +x.toFixed(2), y: +cy.toFixed(2), z: +z.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2), bu: bi >= 0 ? (bDoc.buildings[bi].attrs?.BU_ID || "").split("/").pop() : "" });
      }
    }
  }
  const list = [...byB.entries()].map(([bi, e]) => ({ bu: bi >= 0 ? (bDoc.buildings[bi].attrs?.BU_ID || bDoc.buildings[bi].id).split("/").pop() : "(none)", pairs: e.pairs, m2: +e.m2.toFixed(2), x: +e.x.toFixed(1), y: +e.y.toFixed(1), z: +e.z.toFixed(1), src: e.src }))
    .sort((p, q) => q.m2 - p.m2);
  for (const l of list.slice(0, 12)) l.street = streetAt(T, l.x, l.z);
  for (const k of kitBad.slice(0, 12)) k.street = streetAt(T, k.x, k.z);
  const kitBld = new Set(kitBad.map((k) => k.bu)).size;
  // kit opening pieces overlapping each other on one wall plane (two faces' openings drawn twice: the same frame / glass
  // twice in one place): same normal (3 deg), planes within 1 cm, opening rectangles overlapping > 0.05 m2
  const ops = [];
  for (const piece of OPENING) { const a = B.kit?.pieces?.[piece]; if (!a) continue; for (let i = 0; i < a.length; i += S) ops.push({ piece, x: a[i], y: a[i + 1], z: a[i + 2], nx: a[i + 3], nz: a[i + 4], w: a[i + 5], h: a[i + 6] }); }
  const kitDup = [];
  for (let i = 0; i < ops.length; i++) for (let j = i + 1; j < ops.length; j++) {
    const A = ops[i], C = ops[j];
    if (Math.abs(A.x - C.x) > 6 || Math.abs(A.z - C.z) > 6) continue;
    if (A.nx * C.nx + A.nz * C.nz < Math.cos(3 * Math.PI / 180)) continue;
    const dA = A.nx * A.x + A.nz * A.z, dC = A.nx * C.x + A.nz * C.z; if (Math.abs(dA - dC) > 0.01) continue;
    const uA = A.nz * A.x - A.nx * A.z, uC = A.nz * C.x - A.nx * C.z;
    const ow = Math.min(uA + A.w / 2, uC + C.w / 2) - Math.max(uA - A.w / 2, uC - C.w / 2), oh = Math.min(A.y + A.h, C.y + C.h) - Math.max(A.y, C.y);
    if (ow > 0 && oh > 0 && ow * oh > 0.05) kitDup.push({ pieces: A.piece + "+" + C.piece, m2: +(ow * oh).toFixed(2), x: +A.x.toFixed(2), y: +A.y.toFixed(2), z: +A.z.toFixed(2) });
  }
  // shop fronts (viewer/shops/shopLayout.js layoutShop: the front on the face point f, the interior-mapped glass 0.075 m
  // out, the frame pieces from 0 out): the DRAWN wall (all building meshes) measured across the glass at 3 heights.
  //   coplanar  a drawn wall face within 1 cm of the glass plane: z-fight
  //   buried    the drawn wall more than 1 cm in FRONT of the glass: the wall cuts through / hides the front
  const all = new Bvh(soup.pos), shopBad = [];
  let shopN = 0;
  {
    const f = join(ROOT, "data/streetlife", `${T}.json`);
    const doc = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { pois: [] };
    for (const p of doc.pois || []) {
      const fa = p.face; if (!fa) continue;
      shopN++;
      const W = Math.max(2.0, Math.min(fa.w, 9.9)), Xx = fa.nz, Xz = -fa.nx;
      let cop = 0, bur = 0, n = 0, worst = 0;
      for (let u = -W / 2 + 0.4; u <= W / 2 - 0.4; u += 0.5) for (const hy of [0.9, 1.5, 2.1]) {
        const ox = fa.x + Xx * u + fa.nx * 1.0, oz = fa.z + Xz * u + fa.nz * 1.0;
        const hit = all.hit(ox, fa.y + hy, oz, -fa.nx, 0, -fa.nz, 1.6);
        n++;
        if (!hit || hit.back) continue;
        const out = 1.0 - hit.t;                 // the drawn wall's offset from the face plane (+ = toward the street)
        if (Math.abs(out - 0.075) < 0.01) cop++; else if (out > 0.085) { bur++; worst = Math.max(worst, out); }
      }
      if (cop >= 2 || bur >= 2) shopBad.push({ name: p.name || p.cat, x: +fa.x.toFixed(2), z: +fa.z.toFixed(2), coplanar: cop, buried: bur, of: n, wallOut: +worst.toFixed(3), street: (fa.street || "").split(" - ")[0] });
    }
  }
  // CENSUS_NEAR=x,z,r: every pair / kit hit within r m (validating a screenshot spot)
  const near = process.env.CENSUS_NEAR ? (() => { const [nx, nz, nr] = process.env.CENSUS_NEAR.split(",").map(Number);
    return { pairs: pairs.filter((p) => Math.hypot(p.x - nx, p.z - nz) < nr).map((p) => ({ src: soup.names[soup.src[p.a]] + "+" + soup.names[soup.src[p.b]], m2: +p.area.toFixed(3), sep: +(p.sep * 1000).toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) })),
      kit: kitBad.filter((k) => Math.hypot(k.x - nx, k.z - nz) < nr), shops: shopBad.filter((k) => Math.hypot(k.x - nx, k.z - nz) < nr) }; })() : undefined;
  return { tile: T, buildings: bDoc.buildings.length, tris: soup.pos.length / 9, pairs: pairs.length, m2: +m2.toFixed(1), affected: list.filter((l) => l.bu !== "(none)").length, affected1: list.filter((l) => l.bu !== "(none)" && l.m2 >= 1).length, bySrc, kitPieces: kitN, kitOnPainted: kitBad.length, kitBuildings: kitBld, worst: list.slice(0, 12), kitWorst: kitBad.slice(0, 12), kitDup: kitDup.length, kitDupList: kitDup.slice(0, 12), shops: shopN, shopCoplanar: shopBad.filter((q) => q.coplanar >= 2).length, shopBuried: shopBad.filter((q) => q.buried >= 2).length, shopBad, near, ms: Date.now() - t0 };
}

async function heroes() {
  const { readGlb } = await import(pathToFileURL(join(ROOT, "tools/mesh_audit/glb.mjs")).href);
  const res = [];
  for (const name of HERO_LIST) {
    const g = await readGlb(join(ROOT, "models", name + ".glb"));
    const nodes = [...new Set(g.parts.map((p) => p.node))];
    const L = { 0: (n) => !/_(far|xfar|lod\d)$/.test(n) };
    if (nodes.some((n) => /_lod1$/.test(n))) L[1] = (n) => /_lod1$/.test(n); else if (nodes.some((n) => /_far$/.test(n))) L[1] = (n) => /_far$/.test(n);
    if (nodes.some((n) => /_lod2$/.test(n))) L[2] = (n) => /_lod2$/.test(n); else if (nodes.some((n) => /_xfar$/.test(n))) L[2] = (n) => /_xfar$/.test(n);
    const pl = JSON.parse(readFileSync(join(ROOT, "models", name + ".json"), "utf8")).placement;
    const [px, , pz] = pl.city_local_position, r = pl.rotation_y_rad, c = Math.cos(r), s = Math.sin(r);
    for (const [lv, keep] of Object.entries(L)) {
      const pos = soupFromParts(g.parts, keep);
      const pairs = coplanarPairs(pos, { eps: EPS, minArea: MIN });
      const m2 = pairs.reduce((a, p) => a + p.area, 0);
      const worst = pairs.sort((a, b) => b.area - a.area).slice(0, 5).map((p) => ({ m2: +p.area.toFixed(2), x: +(px + c * p.x + s * p.z).toFixed(1), y: +p.y.toFixed(1), z: +(pz - s * p.x + c * p.z).toFixed(1) }));
      res.push({ hero: name.split("/")[0], level: +lv, tris: pos.length / 9, pairs: pairs.length, m2: +m2.toFixed(1), worst });
      console.log(`${name.split("/")[0].padEnd(20)} L${lv} ${String(pos.length / 9).padStart(7)} tris  coplanar pairs ${String(pairs.length).padStart(6)}  ${m2.toFixed(1)} m2`);
    }
  }
  return res;
}

if (CHILD) { console.log(JSON.stringify(await tileChild(CHILD))); process.exit(0); }
const out = { when: new Date().toISOString(), eps: EPS, min: MIN };
if (HEROES) out.heroes = await heroes();
if (TILES.length) {
  const queue = TILES.slice(), results = [];
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--max-old-space-size=3072", "--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let so = "", se = ""; p.stdout.on("data", (b) => { so += b; }); p.stderr.on("data", (b) => { se += b; });
    p.on("close", (code) => {
      const line = so.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: child exit ${code}: ${se.trim().split("\n").slice(-3).join(" / ")}`); results.push({ tile: T, error: true }); }
      else { const r = JSON.parse(line); results.push(r); console.log(`${T}: ${r.pairs} coplanar pairs (${r.m2} m2) in ${r.affected} buildings (${r.affected1} >= 1 m2); kit openings on a painted wall ${r.kitOnPainted}/${r.kitPieces} in ${r.kitBuildings} buildings; ${JSON.stringify(r.bySrc)} (${r.ms} ms)`); }
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  const ok = results.filter((r) => !r.error);
  const sum = (k) => ok.reduce((s, r) => s + (r[k] || 0), 0);
  const bySrc = {}; for (const r of ok) for (const [k, v] of Object.entries(r.bySrc)) bySrc[k] = (bySrc[k] || 0) + v;
  const worst = ok.flatMap((r) => r.worst.filter((w) => w.bu !== "(none)").map((w) => ({ tile: r.tile, ...w }))).sort((a, b) => b.m2 - a.m2);
  const kitWorst = ok.flatMap((r) => r.kitWorst.map((w) => ({ tile: r.tile, ...w })));
  out.tiles = { n: ok.length, errors: results.length - ok.length, pairs: sum("pairs"), m2: +sum("m2").toFixed(0), affected: sum("affected"), affected1: sum("affected1"), bySrc, kitPieces: sum("kitPieces"), kitOnPainted: sum("kitOnPainted"), kitBuildings: sum("kitBuildings"), worst: worst.slice(0, 30), kitWorst: kitWorst.slice(0, 30), perTile: results };
  console.log(`tiles ${ok.length}: ${out.tiles.pairs} coplanar pairs, ${out.tiles.m2} m2, ${out.tiles.affected} buildings (${out.tiles.affected1} >= 1 m2); by meshes ${JSON.stringify(bySrc)}; kit openings on a painted wall ${out.tiles.kitOnPainted}/${out.tiles.kitPieces} in ${out.tiles.kitBuildings} buildings`);
  for (const w of worst.slice(0, 10)) console.log(`  ${w.tile} ${String(w.m2).padStart(7)} m2 ${String(w.pairs).padStart(5)} pairs  ?at=${w.x},${w.z}  bu ${w.bu}  ${JSON.stringify(w.src)}  ${w.street || ""}`);
}
if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify(out, null, 1));
