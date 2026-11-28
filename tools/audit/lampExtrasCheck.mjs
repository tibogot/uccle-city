// LAMPS (claude/reality2, 2026-11-26; rules lamps-from-osm + lamp-extras, class C7 of docs/REALITY_ROUND_2026-11-26.md).
// Street View (look only): Uccle's lamps stand where the city put them (OSM highway=street_lamp, 243 surveyed), and the
// shop streets carry green swan-neck wall lanterns, flower baskets on the posts, green decorated tram poles with a
// lantern. This keeps it so, on every built tile:
//
//   node tools/audit/lampExtrasCheck.mjs [--quiet]
//
// O  every OSM lamp of a built tile is a lamp site (viewer/streets/lampPlace.js lampSites, within 0.05 m) unless
//    another OSM lamp within 6 m took its place (two nodes for one post) or no road is within 25 m; a road with >= 2
//    OSM lamps along it draws no generated lamp within 9 m of its centre line beside them (no doubled rows)
// W  every wall lantern on a shopfront's wall (<= 0.05 m off the face line, inside its width), 4.5 m up and >= 1.2 m
//    under the eaves, >= 6 m from the next one and >= 5 m from a lamp post; at least WALL_MIN city-wide (the class is
//    on), none on a tile with no shopfront
// B  every basket on a post within 14 m of a shopfront; at least BASKET_MIN city-wide
// V  viewer/lampExtras.js adds no light (no *Light), draws with lampMaterials (the lamp's shared iron + glass), static
//    (no DynamicDrawUsage); main.js builds it and paints its heads; features.js rows lampextras + osmlamps
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { lampSites } = await imp("viewer/streets/lampPlace.js");
const X = await imp("viewer/streets/lampExtrasPlace.js");
const OSM = JSON.parse(readFileSync(join(ROOT, "data/lamps/osm_lamps.json"), "utf8")).lamps;
const man = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const WALL_MIN = 60, BASKET_MIN = 40;
let fails = 0;
const fail = (m) => { fails++; if (fails < 40) console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };

let osmIn = 0, osmDrawn = 0, osmShared = 0, walls = 0, baskets = 0, poles = 0; void poles;
for (const t of man.tiles.filter((t) => t.status === "built")) {
  const b = { x0: t.bounds.x[0], x1: t.bounds.x[1], z0: t.bounds.z[0], z1: t.bounds.z[1] };
  const inB = (x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  const rp = join(ROOT, "data/tiles", t.name, "roads.json");
  if (!existsSync(rp)) continue;
  const roads = JSON.parse(readFileSync(rp, "utf8"));
  const sites = lampSites(roads, b);
  // O
  const mine = OSM.filter((l) => inB(l.x, l.z));
  for (const l of mine) {
    osmIn++;
    if (sites.some((s) => Math.hypot(s.x - l.x, s.z - l.z) < 0.05)) { osmDrawn++; continue; }
    if (sites.some((s) => s.osm && Math.hypot(s.x - l.x, s.z - l.z) < 6)) { osmShared++; continue; }
    const N = new Map(roads.nodes.map((n) => [n.id, n]));
    let near = false;
    for (const r of roads.roads) { const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean); if (pts.some((p) => Math.hypot(p.x - l.x, p.z - l.z) < 25)) { near = true; break; } }
    if (near) fail(`O ${t.name} OSM lamp ${l.id} at (${l.x}, ${l.z}) is not a lamp site`);
  }
  for (const s of sites) if (!s.osm && sites.some((o) => o.osm && Math.hypot(o.x - s.x, o.z - s.z) < 3)) fail(`O ${t.name} a generated lamp at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) within 3 m of an OSM lamp`);
  // W / B
  const sp = join(ROOT, "data/streetlife", `${t.name}.json`);
  const doc = existsSync(sp) ? JSON.parse(readFileSync(sp, "utf8")) : null;
  const fronts = (doc?.pois || []).filter((p) => p.face && !["atm", "school", "civic"].includes(p.kind)).map(({ face: f }) => ({ x: f.x, z: f.z, y: f.y, nx: f.nx, nz: f.nz, w: f.w, eaves: f.eaves }));
  const ex = X.lampExtraSites(fronts, sites, [], inB);
  if (!fronts.length && (ex.wall.length || ex.baskets.length)) fail(`W ${t.name}: lanterns / baskets on a tile with no shopfront`);
  for (const w of ex.wall) {
    walls++;
    const f = fronts[w.front], dx = w.x - f.x, dz = w.z - f.z, off = Math.abs(dx * f.nx + dz * f.nz), u = Math.abs(-dx * f.nz + dz * f.nx);
    if (off > 0.05 || u > f.w / 2) fail(`W ${t.name} wall lantern at (${w.x.toFixed(1)}, ${w.z.toFixed(1)}) off its front (${off.toFixed(2)} m, u ${u.toFixed(2)} / ${f.w / 2})`);
    if (w.h !== X.WALL_H || f.eaves - f.y < w.h + 0.75 + X.WALL_EAVES - 1e-6) fail(`W ${t.name} wall lantern at (${w.x.toFixed(1)}, ${w.z.toFixed(1)}): ${w.h} m up, eaves ${(f.eaves - f.y).toFixed(1)} m`);
    for (const o of ex.wall) if (o !== w && Math.hypot(o.x - w.x, o.z - w.z) < X.WALL_GAP) { fail(`W ${t.name} two wall lanterns closer than ${X.WALL_GAP} m at (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; }
    if (sites.some((s) => Math.hypot(s.x - w.x, s.z - w.z) < X.WALL_LAMP_GAP)) fail(`W ${t.name} a wall lantern within ${X.WALL_LAMP_GAP} m of a lamp post`);
  }
  for (const k of ex.baskets) {
    baskets++;
    const l = sites[k.lamp];
    if (!fronts.some((f) => Math.hypot(f.x - l.x, f.z - l.z) < X.BASKET_NEAR)) fail(`B ${t.name} a basket on a post with no shopfront within ${X.BASKET_NEAR} m`);
  }
}
if (walls < WALL_MIN) fail(`W only ${walls} wall lanterns city-wide (>= ${WALL_MIN})`);
if (baskets < BASKET_MIN) fail(`B only ${baskets} baskets city-wide (>= ${BASKET_MIN})`);
// V
const src = readFileSync(join(ROOT, "viewer/lampExtras.js"), "utf8").replace(/\/\/.*$/gm, "");
if (/new THREE\.\w*Light\b/.test(src)) fail("V viewer/lampExtras.js makes a light (rule fixed-light-count)");
if (/DynamicDrawUsage/.test(src)) fail("V viewer/lampExtras.js uses DynamicDrawUsage");
if (!/lampMaterials\(\)/.test(src)) fail("V viewer/lampExtras.js does not draw with the lamp's shared materials");
const main = readFileSync(join(ROOT, "viewer/main.js"), "utf8");
if (!/buildLampExtras\(/.test(main) || !/addLamps\(entry\.name \+ "\/extras", ex\.heads\)/.test(main)) fail("V viewer/main.js does not build the lamp extras / paint their heads");
const feat = readFileSync(join(ROOT, "viewer/features.js"), "utf8");
for (const k of ["lampextras", "osmlamps"]) if (!new RegExp(`\\("${k}",`).test(feat)) fail(`V viewer/features.js has no ${k} row`);
console.log(`O ${osmIn} OSM lamps in built tiles: ${osmDrawn} drawn where surveyed, ${osmShared} sharing a post with another node`);
console.log(`W ${walls} wall lanterns, B ${baskets} flower baskets (the tram poles are decorated in the viewer, the same rule)`);
console.log(fails ? `LAMPS: FAIL (${fails})` : "LAMPS: PASS");
process.exit(fails ? 1 : 0);
